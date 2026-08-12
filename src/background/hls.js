// HLS (.m3u8) / DASH (.mpd) detection + capture.
//
// MV3's webRequest can only *observe* request URLs, not read response
// bodies — so detection just watches for manifest URLs flying by, then we
// separately fetch() those URLs ourselves to parse them.
//
// DRM-protected streams (Widevine/FairPlay — Netflix, YouTube Premium,
// etc.) are out of scope on purpose: bypassing DRM is both a legal and
// technical non-goal of this project.

import { addDetectedStream, getSettings, patchItem, upsertItem } from '../lib/storage.js';
import { generateId } from './downloader.js';

const MANIFEST_PATTERNS = [/\.m3u8(\?|$)/i, /\.mpd(\?|$)/i];

export function registerWebRequestListener() {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.tabId < 0) return; // ignore requests not tied to a tab
      if (!MANIFEST_PATTERNS.some((re) => re.test(details.url))) return;
      handleDetected(details).catch(() => {});
    },
    { urls: ['<all_urls>'] }
  );
}

async function handleDetected(details) {
  const settings = await getSettings();
  if (!settings.autoDetectStreams) return;
  return recordDetected(details);
}

async function recordDetected(details) {
  const kind = /\.mpd(\?|$)/i.test(details.url) ? 'dash' : 'hls';
  const list = await addDetectedStream(details.tabId, {
    url: details.url,
    kind,
    ts: Date.now(),
  });
  try {
    await chrome.action.setBadgeText({ text: String(list.length), tabId: details.tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId: details.tabId });
  } catch {
    /* tab may already be closed */
  }
}

export async function parseMasterPlaylist(masterUrl) {
  const text = await (await fetch(masterUrl)).text();
  const lines = text.split('\n');
  const variants = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
      const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
      const resolutionMatch = lines[i].match(/RESOLUTION=(\d+x\d+)/);
      const uri = lines[i + 1]?.trim();
      if (uri && !uri.startsWith('#')) {
        variants.push({
          bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0,
          resolution: resolutionMatch ? resolutionMatch[1] : 'unknown',
          url: new URL(uri, masterUrl).href,
        });
      }
    }
  }
  // Not a master playlist (no variants found) — treat the URL itself as the media playlist.
  if (variants.length === 0) return [{ bandwidth: 0, resolution: 'unknown', url: masterUrl }];
  return variants.sort((a, b) => b.bandwidth - a.bandwidth);
}

export async function parseMediaPlaylist(playlistUrl) {
  const text = await (await fetch(playlistUrl)).text();
  const lines = text.split('\n');
  const segments = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      segments.push(new URL(trimmed, playlistUrl).href);
    }
  }
  return segments;
}

async function fetchSegmentWithRetry(url, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw lastErr;
}

async function downloadSegmentsConcurrent(segmentUrls, concurrency, onProgress) {
  const results = new Array(segmentUrls.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < segmentUrls.length) {
      const i = nextIndex++;
      try {
        results[i] = await fetchSegmentWithRetry(segmentUrls[i]);
      } catch (err) {
        throw new Error(`Segment ${i} lỗi: ${err.message}`);
      }
      completed++;
      onProgress(completed, segmentUrls.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, segmentUrls.length) }, worker));
  return new Blob(results, { type: 'video/mp2t' });
}

/**
 * Download an HLS stream end-to-end: pick the best (or given) variant,
 * fetch all segments, concatenate to a single .ts file. Registers as a
 * regular queue item so it shows up in the popup like any other download.
 */
export async function downloadHlsStream(masterUrl, settings, { variantUrl, filename } = {}) {
  const id = generateId();
  const baseName = filename || `video_${Date.now()}.ts`;

  await upsertItem({
    id,
    url: masterUrl,
    filename: baseName,
    totalSize: 0,
    receivedBytes: 0,
    percent: 0,
    state: 'in_progress',
    mode: 'hls',
    threads: settings.maxThreads,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  try {
    const variants = await parseMasterPlaylist(masterUrl);
    const chosenUrl = variantUrl || variants[0].url;
    const segments = await parseMediaPlaylist(chosenUrl);
    if (segments.length === 0) throw new Error('Không tìm thấy segment nào trong playlist');

    const blob = await downloadSegmentsConcurrent(
      segments,
      Math.max(2, Math.min(settings.maxThreads || 4, 8)),
      async (done, total) => {
        await patchItem(id, {
          percent: Math.round((done / total) * 100),
          receivedBytes: done,
          totalSize: total,
        });
      }
    );

    const blobUrl = URL.createObjectURL(blob);
    const downloadId = await chrome.downloads.download({ url: blobUrl, filename: baseName });
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);

    await patchItem(id, { state: 'completed', percent: 100, nativeDownloadId: downloadId, completedAt: Date.now() });
    chrome.notifications.create(`turbolt-${id}`, {
      type: 'basic',
      iconUrl: 'public/icons/icon128.png',
      title: 'Video đã tải xong — Turbolt',
      message: baseName,
    });
  } catch (err) {
    await patchItem(id, { state: 'error', error: String(err?.message || err) });
  }

  return id;
}
