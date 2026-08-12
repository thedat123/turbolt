// Pure download engine — no chrome.* dependency, so it can run identically
// in the extension's service worker AND under plain Node for testing
// (see tests/engine.test.mjs). Only uses fetch / AbortController / Blob,
// which both environments provide natively.
//
// Why work-stealing beats fixed N-way chunking (what v0.1.0 did):
// splitting a file into exactly `threads` big contiguous chunks means one
// slow/throttled chunk (common on CDNs that rate-limit per-connection)
// stalls the whole download while the other threads sit idle after
// finishing early. Splitting into many more, smaller segments than there
// are threads — and having each worker pull the next segment off a shared
// queue the instant it's free — keeps every thread busy until the very
// last byte. This is the same core technique IDM/aria2/axel use.

const DEFAULT_SEGMENTS_PER_THREAD = 4;
const MIN_SEGMENT_BYTES = 1 * 1024 * 1024; // below this, splitting adds overhead without benefit
const MAX_RETRIES_PER_SEGMENT = 3;
const RETRY_BASE_DELAY_MS = 400;

export function guessFilename(url, contentDisposition) {
  if (contentDisposition) {
    const match = /filename\*?=(?:UTF-8'')?"?([^;"]+)"?/i.exec(contentDisposition);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  try {
    const { pathname } = new URL(url);
    const last = pathname.split('/').filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    /* fall through */
  }
  return `download_${Date.now()}`;
}

export async function probeResource(url) {
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok && res.status !== 405) {
    throw new Error(`HTTP ${res.status} khi kiểm tra file`);
  }
  const acceptRanges = res.headers.get('accept-ranges');
  const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
  return {
    supportsRange: acceptRanges === 'bytes' && contentLength > 0,
    totalSize: contentLength,
    contentDisposition: res.headers.get('content-disposition'),
    contentType: res.headers.get('content-type') || '',
  };
}

/** Build a work queue of many small segments (not one-per-thread). */
export function planSegments(totalSize, threads, segmentsPerThread = DEFAULT_SEGMENTS_PER_THREAD) {
  const targetCount = Math.max(1, threads * segmentsPerThread);
  const segmentSize = Math.max(MIN_SEGMENT_BYTES, Math.ceil(totalSize / targetCount));
  const segments = [];
  let start = 0;
  let index = 0;
  while (start < totalSize) {
    const end = Math.min(start + segmentSize - 1, totalSize - 1);
    segments.push({ index: index++, start, end, bytes: null });
    start = end + 1;
  }
  return segments;
}

class TokenBucket {
  constructor(bytesPerSec) {
    this.setRate(bytesPerSec);
  }
  setRate(bytesPerSec) {
    this.rate = bytesPerSec > 0 ? bytesPerSec : Infinity;
    this.tokens = this.rate;
    this.last = Date.now();
  }
  async consume(n) {
    if (this.rate === Infinity) return;
    const now = Date.now();
    const elapsed = (now - this.last) / 1000;
    this.last = now;
    this.tokens = Math.min(this.rate, this.tokens + elapsed * this.rate);
    if (n > this.tokens) {
      const waitMs = ((n - this.tokens) / this.rate) * 1000;
      await new Promise((r) => setTimeout(r, Math.max(0, waitMs)));
      this.tokens = 0;
    } else {
      this.tokens -= n;
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSegment(url, segment, { signal, bucket, onBytes }) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_SEGMENT; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(url, {
        headers: { Range: `bytes=${segment.start}-${segment.end}` },
        signal,
      });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status} ở segment ${segment.index}`);
      const reader = res.body.getReader();
      const parts = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (bucket) await bucket.consume(value.length);
        parts.push(value);
        onBytes?.(value.length);
      }
      return new Blob(parts);
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      lastErr = err;
      if (attempt < MAX_RETRIES_PER_SEGMENT) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }
  throw lastErr;
}

/**
 * A resumable work-stealing download session. Call `.run()` to start (or
 * continue) fetching remaining segments; if the passed AbortSignal fires,
 * `.run()` rejects with AbortError but every segment that already finished
 * stays cached on the session — a later `.run()` call (a fresh signal)
 * picks up only what's left. This is what makes pause/resume cheap: with
 * small work-stolen segments instead of a few big fixed chunks, at most
 * ~1 segment's worth of bytes is ever wasted on a pause.
 */
export function createSession(url, { totalSize, threads = 4, segmentsPerThread = DEFAULT_SEGMENTS_PER_THREAD, bandwidthBytesPerSec = 0 } = {}) {
  const segments = planSegments(totalSize, threads, segmentsPerThread);
  const bucket = new TokenBucket(bandwidthBytesPerSec);
  const workerCount = Math.max(1, Math.min(threads, segments.length));
  let cursor = 0;
  let receivedTotal = 0;

  return {
    segments,
    setBandwidth(bytesPerSec) {
      bucket.setRate(bytesPerSec);
    },
    isComplete() {
      return segments.every((s) => s.bytes != null);
    },
    toBlob() {
      return new Blob(segments.map((s) => s.bytes));
    },
    async run({ signal, onProgress } = {}) {
      async function worker() {
        while (true) {
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          const i = cursor;
          if (i >= segments.length) return;
          cursor = i + 1;
          const segment = segments[i];
          if (segment.bytes != null) continue; // already fetched in a previous run()
          segment.bytes = await fetchSegment(url, segment, {
            signal,
            bucket,
            onBytes: (n) => {
              receivedTotal += n;
              onProgress?.(receivedTotal, totalSize);
            },
          });
        }
      }
      await Promise.all(Array.from({ length: workerCount }, worker));
    },
  };
}

/** One-shot convenience wrapper around createSession for simple callers/tests. */
export async function downloadMultiThread(url, opts = {}) {
  const session = createSession(url, opts);
  await session.run({ signal: opts.signal, onProgress: opts.onProgress });
  return session.toBlob();
}

export function chooseThreadCount(totalSize, { maxThreads = 4, multiThreadSizeThresholdMB = 5 } = {}) {
  const thresholdBytes = multiThreadSizeThresholdMB * 1024 * 1024;
  if (totalSize <= thresholdBytes) return 1;
  return Math.max(2, Math.min(maxThreads, 16));
}
