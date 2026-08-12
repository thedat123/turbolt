import {
  getSettings,
  getQueue,
  removeItem,
  clearDetectedStreams,
} from '../lib/storage.js';
import {
  startDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  restartDownload,
  reconcileOrphanedDownloads,
} from './downloader.js';
import { registerWebRequestListener, downloadHlsStream } from './hls.js';

registerWebRequestListener();

chrome.runtime.onInstalled.addListener(async () => {
  const queue = await getQueue();
  if (!queue.length) await chrome.storage.local.set({ downloadQueue: [] });
  chrome.contextMenus.create({
    id: 'turbolt-download-link',
    title: 'Tải xuống bằng Turbolt (đa luồng)',
    contexts: ['link'],
  });
});

chrome.runtime.onStartup.addListener(async () => {
  const queue = await getQueue();
  await reconcileOrphanedDownloads(queue);
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'turbolt-download-link' || !info.linkUrl) return;
  const settings = await getSettings();
  await startDownload(info.linkUrl, settings);
});

// Clear the "N streams detected" badge/state when a tab navigates away.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    await clearDetectedStreams(tabId);
    chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true; // keep the message channel open for the async response
});

async function handleMessage(message, sender) {
  const settings = await getSettings();

  switch (message.type) {
    case 'ENQUEUE_DOWNLOAD': {
      const item = await startDownload(message.url, settings, { filename: message.filename });
      return { ok: true, item };
    }
    case 'DOWNLOAD_ACTION': {
      const { action, id } = message;
      if (action === 'pause') await pauseDownload(id);
      else if (action === 'resume') await resumeDownload(id, settings);
      else if (action === 'cancel') await cancelDownload(id);
      else if (action === 'restart') await restartDownload(id, settings);
      else if (action === 'remove') await removeItem(id);
      return { ok: true };
    }
    case 'DOWNLOAD_HLS': {
      const id = await downloadHlsStream(message.masterUrl, settings, {
        variantUrl: message.variantUrl,
        filename: message.filename,
      });
      return { ok: true, id };
    }
    case 'GET_STATE': {
      const tabId = message.tabId ?? sender.tab?.id;
      const queue = await getQueue();
      return { ok: true, queue, tabId };
    }
    default:
      return { ok: false, error: `Unknown message type: ${message.type}` };
  }
}
