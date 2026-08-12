// Browser glue around engine-core.js: persists queue state to
// chrome.storage, manages pause/resume/cancel sessions, and hands
// finished downloads to chrome.downloads for saving to disk.
//
// Honesty note (see README "How it works" / "Limitations"): segment bytes
// are held in memory until the whole file finishes, then merged into one
// Blob. If the service worker is killed mid-download (Chrome may do this
// after long idle periods, not while actively fetching) the in-memory
// bytes are lost — we detect this on next startup and mark the item
// "interrupted" rather than silently producing a corrupt file. Durable
// on-disk segment storage (OPFS) is on the roadmap for very large files.

import { patchItem, getItem } from '../lib/storage.js';
import { probeResource, guessFilename, chooseThreadCount, createSession } from './engine-core.js';

const sessions = new Map(); // id -> { session, controller, speedTracker }
const PROGRESS_PERSIST_INTERVAL_MS = 400;

export { guessFilename, probeResource, chooseThreadCount };

export function generateId() {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeSpeedTracker() {
  return { lastT: Date.now(), lastBytes: 0, emaSpeed: 0 };
}

function updateSpeed(tracker, totalBytesNow) {
  const now = Date.now();
  const dt = (now - tracker.lastT) / 1000;
  if (dt <= 0) return tracker.emaSpeed;
  const instant = (totalBytesNow - tracker.lastBytes) / dt;
  tracker.emaSpeed = tracker.emaSpeed === 0 ? instant : tracker.emaSpeed * 0.7 + instant * 0.3;
  tracker.lastT = now;
  tracker.lastBytes = totalBytesNow;
  return tracker.emaSpeed;
}

const lastPersistAt = new Map();

async function persistProgress(id, patch, { force = false } = {}) {
  const now = Date.now();
  if (!force && lastPersistAt.has(id) && now - lastPersistAt.get(id) < PROGRESS_PERSIST_INTERVAL_MS) return;
  lastPersistAt.set(id, now);
  await patchItem(id, patch);
}

async function finalizeDownload(item, session) {
  const blob = session.session.toBlob();
  const blobUrl = URL.createObjectURL(blob);
  const downloadId = await chrome.downloads.download({
    url: blobUrl,
    filename: item.filename,
    saveAs: false,
  });
  // Revoke a bit later — chrome.downloads needs the blob URL to still be
  // valid while it streams the blob to disk.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  await patchItem(item.id, {
    state: 'completed',
    percent: 100,
    receivedBytes: item.totalSize,
    nativeDownloadId: downloadId,
    completedAt: Date.now(),
  });
  sessions.delete(item.id);
  lastPersistAt.delete(item.id);
  chrome.notifications.create(`turbolt-${item.id}`, {
    type: 'basic',
    iconUrl: 'public/icons/icon128.png',
    title: 'Tải xong — Turbolt',
    message: item.filename,
  });
}

async function runSession(item, entry, onDone, onError) {
  try {
    await entry.session.run({
      signal: entry.controller.signal,
      onProgress: async (received, total) => {
        const percent = total ? Math.min(100, Math.round((received / total) * 100)) : 0;
        const speed = updateSpeed(entry.speedTracker, received);
        const eta = speed > 0 && total ? Math.max(0, Math.round((total - received) / speed)) : -1;
        await persistProgress(item.id, {
          receivedBytes: received,
          percent,
          speedBytesPerSec: Math.round(speed),
          eta,
          state: 'in_progress',
        });
      },
    });
    onDone();
  } catch (err) {
    if (err?.name === 'AbortError') return; // paused/canceled — caller already updated state
    onError(err);
  }
}

async function runNativeFallback(item, reason) {
  const downloadId = await chrome.downloads.download({ url: item.url, filename: item.filename || undefined });
  await patchItem(item.id, { mode: 'native', state: 'in_progress', nativeDownloadId: downloadId, fallbackReason: reason });
}

export async function startDownload(url, settings, overrides = {}) {
  const id = overrides.id || generateId();
  let probe;
  try {
    probe = await probeResource(url);
  } catch {
    probe = { supportsRange: false, totalSize: 0, contentDisposition: null, contentType: '' };
  }

  const item = {
    id,
    url,
    filename: overrides.filename || guessFilename(url, probe.contentDisposition),
    totalSize: probe.totalSize,
    receivedBytes: 0,
    percent: 0,
    speedBytesPerSec: 0,
    eta: -1,
    state: 'queued',
    mode: 'multi-thread',
    threads: 0,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };

  const tooLargeForRam = probe.totalSize > settings.maxFileSizeForMultiThreadMB * 1024 * 1024;

  if (!probe.supportsRange || tooLargeForRam) {
    item.mode = 'native';
    await patchItem(item.id, item);
    await runNativeFallback(item, !probe.supportsRange ? 'no-range-support' : 'file-too-large');
    return item;
  }

  const threads = chooseThreadCount(probe.totalSize, settings);
  item.threads = threads;
  await patchItem(item.id, item);
  await beginMultiThreadSession(item, settings, threads);
  return item;
}

async function beginMultiThreadSession(item, settings, threads) {
  const entry = {
    session: createSession(item.url, {
      totalSize: item.totalSize,
      threads,
      bandwidthBytesPerSec: settings.bandwidthLimitKBs * 1024,
    }),
    controller: new AbortController(),
    speedTracker: makeSpeedTracker(),
  };
  sessions.set(item.id, entry);
  await patchItem(item.id, { state: 'in_progress' });

  runSession(
    item,
    entry,
    () => finalizeDownload(item, entry),
    async (err) => {
      sessions.delete(item.id);
      await patchItem(item.id, { state: 'error', error: String(err?.message || err) });
    }
  );
}

export async function pauseDownload(id) {
  const entry = sessions.get(id);
  if (!entry) return;
  entry.controller.abort();
  await persistProgress(id, { state: 'paused' }, { force: true });
}

export async function resumeDownload(id, settings) {
  const item = await getItem(id);
  if (!item) return;
  const entry = sessions.get(id);

  if (item.mode === 'native') {
    chrome.downloads.resume(item.nativeDownloadId);
    await patchItem(id, { state: 'in_progress' });
    return;
  }

  if (!entry) {
    // Session lost (worker restarted) — cannot safely resume partial bytes.
    await patchItem(id, { state: 'interrupted', error: 'Phiên tải bị gián đoạn, vui lòng tải lại từ đầu.' });
    return;
  }

  entry.session.setBandwidth(settings.bandwidthLimitKBs * 1024);
  entry.controller = new AbortController(); // previous controller was aborted by pause()
  await patchItem(id, { state: 'in_progress' });

  runSession(
    item,
    entry,
    () => finalizeDownload(item, entry),
    async (err) => {
      sessions.delete(id);
      await patchItem(id, { state: 'error', error: String(err?.message || err) });
    }
  );
}

export async function cancelDownload(id) {
  const entry = sessions.get(id);
  if (entry) {
    entry.controller.abort();
    sessions.delete(id);
    lastPersistAt.delete(id);
  }
  const item = await getItem(id);
  if (item?.mode === 'native' && item.nativeDownloadId != null) {
    chrome.downloads.cancel(item.nativeDownloadId).catch(() => {});
  }
  await persistProgress(id, { state: 'canceled' }, { force: true });
}

export async function restartDownload(id, settings) {
  const item = await getItem(id);
  if (!item) return;
  await startDownload(item.url, settings, { id: item.id, filename: item.filename });
}

/** Called on service-worker startup: any item still "in_progress" belonged
 * to a session that no longer exists in memory — never silently resume it. */
export async function reconcileOrphanedDownloads(queueItems) {
  const orphaned = queueItems.filter((i) => i.state === 'in_progress' && !sessions.has(i.id));
  for (const item of orphaned) {
    await patchItem(item.id, {
      state: 'interrupted',
      error: 'Turbolt đã khởi động lại — bấm Tải lại để tiếp tục.',
    });
  }
}
