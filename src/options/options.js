import { getSettings, setSettings } from '../lib/storage.js';
import { icon } from '../popup/icons.js';

document.getElementById('logoMark').innerHTML = icon('bolt', 20);
document.getElementById('iconPerf').innerHTML = icon('zap', 14);
document.getElementById('iconDetect').innerHTML = icon('film', 14);

const fields = {
  maxThreads: document.getElementById('maxThreads'),
  bandwidthLimitKBs: document.getElementById('bandwidthLimitKBs'),
  multiThreadSizeThresholdMB: document.getElementById('multiThreadSizeThresholdMB'),
  maxFileSizeForMultiThreadMB: document.getElementById('maxFileSizeForMultiThreadMB'),
  autoDetectDownloads: document.getElementById('autoDetectDownloads'),
  autoDetectStreams: document.getElementById('autoDetectStreams'),
};
const maxThreadsValue = document.getElementById('maxThreadsValue');
const savedMsg = document.getElementById('savedMsg');

async function load() {
  const settings = await getSettings();
  fields.maxThreads.value = settings.maxThreads;
  maxThreadsValue.textContent = settings.maxThreads;
  fields.bandwidthLimitKBs.value = settings.bandwidthLimitKBs;
  fields.multiThreadSizeThresholdMB.value = settings.multiThreadSizeThresholdMB;
  fields.maxFileSizeForMultiThreadMB.value = settings.maxFileSizeForMultiThreadMB;
  fields.autoDetectDownloads.checked = settings.autoDetectDownloads;
  fields.autoDetectStreams.checked = settings.autoDetectStreams;
}

fields.maxThreads.addEventListener('input', () => {
  maxThreadsValue.textContent = fields.maxThreads.value;
});

document.getElementById('save').addEventListener('click', async () => {
  const patch = {
    maxThreads: Number(fields.maxThreads.value),
    bandwidthLimitKBs: Number(fields.bandwidthLimitKBs.value),
    multiThreadSizeThresholdMB: Number(fields.multiThreadSizeThresholdMB.value),
    maxFileSizeForMultiThreadMB: Number(fields.maxFileSizeForMultiThreadMB.value),
    autoDetectDownloads: fields.autoDetectDownloads.checked,
    autoDetectStreams: fields.autoDetectStreams.checked,
  };
  await setSettings(patch);
  await chrome.storage.local.set({ detectorEnabled: patch.autoDetectDownloads });

  savedMsg.innerHTML = `${icon('check', 14)} Đã lưu`;
  savedMsg.hidden = false;
  setTimeout(() => (savedMsg.hidden = true), 1800);
});

load();
