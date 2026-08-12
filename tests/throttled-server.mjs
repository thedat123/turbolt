// A tiny local HTTP server that simulates a common real-world condition:
// a CDN/file host that caps the speed of *each individual connection*
// (very common — it's how providers stop one download from hogging the
// link) while the server's total uplink is much larger. This is exactly
// the scenario multi-threaded/segmented downloading is designed for, and
// it's fully reproducible/controlled (unlike depending on a flaky public
// host's real-world throttling behavior).
//
// Usage: node tests/throttled-server.mjs [port] [sizeMB] [perConnKBs]

import http from 'node:http';
import { randomBytes } from 'node:crypto';

const port = Number(process.argv[2] || 8177);
const sizeMB = Number(process.argv[3] || 20);
const perConnKBs = Number(process.argv[4] || 300);

const FILE = randomBytes(sizeMB * 1024 * 1024);
const PER_CONN_BYTES_PER_SEC = perConnKBs * 1024;
const WRITE_CHUNK = 16 * 1024;

function parseRange(rangeHeader, totalSize) {
  if (!rangeHeader) return null;
  const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
  if (!match) return null;
  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
  return { start, end: Math.min(end, totalSize - 1) };
}

async function writeThrottled(res, buf) {
  let offset = 0;
  while (offset < buf.length) {
    const end = Math.min(offset + WRITE_CHUNK, buf.length);
    const ok = res.write(buf.subarray(offset, end));
    offset = end;
    const delayMs = (WRITE_CHUNK / PER_CONN_BYTES_PER_SEC) * 1000;
    await new Promise((r) => setTimeout(r, delayMs));
    if (!ok) await new Promise((r) => res.once('drain', r));
  }
  res.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Length': FILE.length,
      'Accept-Ranges': 'bytes',
      'Content-Type': 'application/octet-stream',
    });
    return res.end();
  }

  const range = parseRange(req.headers.range, FILE.length);
  if (range) {
    const chunk = FILE.subarray(range.start, range.end + 1);
    res.writeHead(206, {
      'Content-Range': `bytes ${range.start}-${range.end}/${FILE.length}`,
      'Content-Length': chunk.length,
      'Accept-Ranges': 'bytes',
      'Content-Type': 'application/octet-stream',
    });
    writeThrottled(res, chunk);
  } else {
    res.writeHead(200, {
      'Content-Length': FILE.length,
      'Accept-Ranges': 'bytes',
      'Content-Type': 'application/octet-stream',
    });
    writeThrottled(res, FILE);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Throttled test server: http://127.0.0.1:${port}/file.bin`);
  console.log(`File size: ${sizeMB} MB | Per-connection cap: ${perConnKBs} KB/s`);
  console.log(`(This simulates a CDN that rate-limits each connection — press Ctrl+C to stop)`);
});
