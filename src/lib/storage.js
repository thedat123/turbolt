// Thin wrapper around chrome.storage so the rest of the codebase never
// touches chrome.storage.* directly. Service workers are killed after ~30s
// idle, so *nothing* may live only in a JS variable — it must round-trip
// through here.

export const DEFAULT_SETTINGS = {
  maxThreads: 4,
  bandwidthLimitKBs: 0, // 0 = unlimited
  autoDetectDownloads: true,
  autoDetectStreams: true,
  multiThreadSizeThresholdMB: 5, // below this, single connection is not slower
  maxFileSizeForMultiThreadMB: 2048, // above this, fall back to native download to avoid RAM blowup
  saveDir: '', // '' = browser default download folder
};

export async function getQueue() {
  const { downloadQueue = [] } = await chrome.storage.local.get('downloadQueue');
  return downloadQueue;
}

export async function setQueue(queue) {
  await chrome.storage.local.set({ downloadQueue: queue });
}

export async function upsertItem(item) {
  const queue = await getQueue();
  const idx = queue.findIndex((q) => q.id === item.id);
  if (idx === -1) queue.unshift(item);
  else queue[idx] = { ...queue[idx], ...item };
  await setQueue(queue);
  return queue;
}

export async function patchItem(id, patch) {
  const queue = await getQueue();
  const idx = queue.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  queue[idx] = { ...queue[idx], ...patch, updatedAt: Date.now() };
  await setQueue(queue);
  return queue[idx];
}

export async function removeItem(id) {
  const queue = await getQueue();
  await setQueue(queue.filter((q) => q.id !== id));
}

export async function getItem(id) {
  const queue = await getQueue();
  return queue.find((q) => q.id === id) || null;
}

export async function getSettings() {
  const { settings } = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

export async function setSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ settings: next });
  return next;
}

export async function getDetectedStreams(tabId) {
  const { detectedStreams = {} } = await chrome.storage.local.get('detectedStreams');
  return tabId != null ? detectedStreams[tabId] || [] : detectedStreams;
}

export async function addDetectedStream(tabId, stream) {
  const { detectedStreams = {} } = await chrome.storage.local.get('detectedStreams');
  const list = detectedStreams[tabId] || [];
  if (list.find((s) => s.url === stream.url)) return list;
  list.push(stream);
  detectedStreams[tabId] = list;
  await chrome.storage.local.set({ detectedStreams });
  return list;
}

export async function clearDetectedStreams(tabId) {
  const { detectedStreams = {} } = await chrome.storage.local.get('detectedStreams');
  delete detectedStreams[tabId];
  await chrome.storage.local.set({ detectedStreams });
}
