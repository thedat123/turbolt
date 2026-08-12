// Real-network correctness + speed benchmark for the multi-threaded
// engine (src/background/engine-core.js). No chrome.* stub needed since
// engine-core.js is pure fetch/AbortController/Blob — it runs unmodified
// under Node.
//
// Run: node tests/engine.test.mjs [url]
//
// What it proves:
// 1. Correctness — the work-stealing multi-threaded download produces a
//    byte-for-byte identical file to a plain single-connection download
//    (SHA-256 hash comparison), even though segments arrive out of order
//    and are merged back together.
// 2. Speed — wall-clock time for 1 connection vs N connections against
//    the same URL, so any speed claim is measured, not assumed.

import { createHash } from 'node:crypto';
import { probeResource, downloadMultiThread } from '../src/background/engine-core.js';

const TEST_URL = process.argv[2] || 'https://proof.ovh.net/files/10Mb.dat';
const THREADS = Number(process.argv[3] || 8);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function fmtBytes(n) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(2)} ${units[i]}`;
}

function fmtSpeed(bytesPerSec) {
  return `${fmtBytes(bytesPerSec)}/s`;
}

async function downloadSingleThread(url) {
  const t0 = performance.now();
  const res = await fetch(url);
  const buf = new Uint8Array(await res.arrayBuffer());
  const seconds = (performance.now() - t0) / 1000;
  return { buf, seconds };
}

async function main() {
  console.log(`\nTurbolt engine benchmark`);
  console.log(`URL:     ${TEST_URL}`);
  console.log(`Threads: ${THREADS}\n`);

  console.log('Probing resource...');
  const probe = await probeResource(TEST_URL);
  console.log(
    `  totalSize=${fmtBytes(probe.totalSize)}  supportsRange=${probe.supportsRange}  contentType=${probe.contentType}\n`
  );

  if (!probe.supportsRange) {
    console.log('Server does not support Range requests — multi-thread mode would fall back to native download. Aborting benchmark.');
    return;
  }

  console.log(`[1/2] Single-connection download (baseline)...`);
  const single = await downloadSingleThread(TEST_URL);
  console.log(`  done in ${single.seconds.toFixed(2)}s → ${fmtSpeed(single.buf.length / single.seconds)}`);

  console.log(`\n[2/2] Multi-threaded download (${THREADS} workers, work-stealing segments)...`);
  const t0 = performance.now();
  let lastLoggedPct = -10;
  const blob = await downloadMultiThread(TEST_URL, {
    totalSize: probe.totalSize,
    threads: THREADS,
    onProgress: (received, total) => {
      const pct = Math.floor((received / total) * 100);
      if (pct >= lastLoggedPct + 10) {
        lastLoggedPct = pct;
        process.stdout.write(`  ${pct}%\r`);
      }
    },
  });
  const multiSeconds = (performance.now() - t0) / 1000;
  const multiBuf = new Uint8Array(await blob.arrayBuffer());
  console.log(`  done in ${multiSeconds.toFixed(2)}s → ${fmtSpeed(multiBuf.length / multiSeconds)}                `);

  console.log(`\n--- Correctness ---`);
  const hashSingle = sha256(single.buf);
  const hashMulti = sha256(multiBuf);
  const bytesMatch = single.buf.length === multiBuf.length;
  const hashMatch = hashSingle === hashMulti;
  console.log(`  size:   single=${single.buf.length}  multi=${multiBuf.length}  ${bytesMatch ? 'MATCH' : 'MISMATCH ✗'}`);
  console.log(`  sha256: single=${hashSingle.slice(0, 16)}...  multi=${hashMulti.slice(0, 16)}...  ${hashMatch ? 'MATCH ✓' : 'MISMATCH ✗'}`);

  console.log(`\n--- Speed ---`);
  const speedup = single.seconds / multiSeconds;
  console.log(`  1 connection:        ${single.seconds.toFixed(2)}s (${fmtSpeed(single.buf.length / single.seconds)})`);
  console.log(`  ${THREADS} connections: ${multiSeconds.toFixed(2)}s (${fmtSpeed(multiBuf.length / multiSeconds)})`);
  console.log(`  speedup: ${speedup.toFixed(2)}x\n`);

  if (!hashMatch || !bytesMatch) {
    console.error('FAILED: multi-threaded output does not match single-connection baseline.');
    process.exitCode = 1;
  } else {
    console.log('PASSED: multi-threaded output is byte-for-byte identical to baseline.\n');
  }
}

main().catch((err) => {
  console.error('Benchmark crashed:', err);
  process.exitCode = 1;
});
