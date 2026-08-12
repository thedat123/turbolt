import { icon } from './icons.js';

const listEl = document.getElementById('downloadList');
const emptyState = document.getElementById('emptyState');
const streamsBanner = document.getElementById('detectedStreams');
const streamsText = document.getElementById('streamsText');
const streamsPanel = document.getElementById('streamsPanel');
const aggregateSpeedEl = document.getElementById('aggregateSpeed');
const aggregateSpeedValue = document.getElementById('aggregateSpeedValue');
const tabsEl = document.getElementById('tabs');

let activeTabId = null;
let currentFilter = 'all';
let latestQueue = [];

// Static chrome icons that don't change at runtime.
document.getElementById('logoMark').innerHTML = icon('bolt', 14);
document.getElementById('openSettings').innerHTML = icon('settings', 16);
document.getElementById('streamsIcon').innerHTML = icon('film', 15);
document.getElementById('emptyIcon').innerHTML = icon('inbox', 22);
document.getElementById('inputIcon').innerHTML = icon('plus', 14);

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec) return '';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatEta(seconds) {
  if (seconds == null || seconds < 0) return '';
  if (seconds < 60) return `${seconds}s còn lại`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}p ${s}s còn lại`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const STATE_LABEL = {
  queued: 'Đang chờ',
  in_progress: 'Đang tải',
  paused: 'Tạm dừng',
  completed: 'Hoàn tất',
  error: 'Lỗi',
  canceled: 'Đã huỷ',
  interrupted: 'Gián đoạn',
};

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm|ts|flv)$/i;

function itemIcon(item) {
  if (item.state === 'completed') return icon('check', 15);
  if (item.state === 'error') return icon('alert', 15);
  if (item.mode === 'hls' || VIDEO_EXT.test(item.filename || '')) return icon('film', 15);
  return icon('file', 15);
}

function actionButtons(item) {
  switch (item.state) {
    case 'in_progress':
      return `<button data-action="pause" data-id="${item.id}" title="Tạm dừng">${icon('pause', 13)}</button>
              <button data-action="cancel" data-id="${item.id}" class="danger" title="Huỷ">${icon('close', 13)}</button>`;
    case 'paused':
      return `<button data-action="resume" data-id="${item.id}" title="Tiếp tục">${icon('play', 13)}</button>
              <button data-action="cancel" data-id="${item.id}" class="danger" title="Huỷ">${icon('close', 13)}</button>`;
    case 'error':
    case 'interrupted':
    case 'canceled':
      return `<button data-action="restart" data-id="${item.id}" title="Tải lại">${icon('retry', 13)}</button>
              <button data-action="remove" data-id="${item.id}" class="danger" title="Xoá">${icon('trash', 13)}</button>`;
    case 'completed':
      return `<button data-action="remove" data-id="${item.id}" title="Xoá khỏi danh sách">${icon('trash', 13)}</button>`;
    default:
      return `<button data-action="cancel" data-id="${item.id}" class="danger" title="Huỷ">${icon('close', 13)}</button>`;
  }
}

function renderDownload(item) {
  const li = document.createElement('li');
  li.className = 'download-item';
  const percent = item.percent || 0;
  const modeTag = item.mode === 'multi-thread' ? `${item.threads}× luồng` : item.mode === 'hls' ? 'HLS' : 'đơn luồng';
  const metaParts = [STATE_LABEL[item.state] || item.state, `${percent}%`, modeTag];
  if (item.state === 'in_progress') {
    if (item.speedBytesPerSec) metaParts.push(formatSpeed(item.speedBytesPerSec));
    if (item.eta >= 0) metaParts.push(formatEta(item.eta));
  }

  li.innerHTML = `
    <div class="item-top">
      <span class="item-icon state-${item.state}">${itemIcon(item)}</span>
      <div class="item-main">
        <div class="item-name" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</div>
        <div class="item-meta-row">
          <span class="state-pill ${item.state}">${STATE_LABEL[item.state] || item.state}</span>
          <span>${metaParts.slice(1).join(' · ')}</span>
        </div>
      </div>
      <div class="item-actions">${actionButtons(item)}</div>
    </div>
    <div class="progress-track">
      <div class="progress-fill ${item.state}" style="width:${percent}%"></div>
    </div>
    ${item.error ? `<div class="item-error">${icon('alert', 12)} ${escapeHtml(item.error)}</div>` : ''}
  `;
  return li;
}

function filterQueue(queue) {
  if (currentFilter === 'active') return queue.filter((i) => ['queued', 'in_progress', 'paused'].includes(i.state));
  if (currentFilter === 'done') return queue.filter((i) => i.state === 'completed');
  return queue;
}

function renderList() {
  const filtered = filterQueue(latestQueue).sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  listEl.innerHTML = '';
  emptyState.hidden = filtered.length > 0;
  listEl.hidden = filtered.length === 0;
  filtered.forEach((item) => listEl.appendChild(renderDownload(item)));

  const activeSpeed = latestQueue
    .filter((i) => i.state === 'in_progress')
    .reduce((sum, i) => sum + (i.speedBytesPerSec || 0), 0);
  aggregateSpeedEl.hidden = activeSpeed === 0;
  aggregateSpeedValue.textContent = formatSpeed(activeSpeed);
}

async function refreshList() {
  const { downloadQueue = [] } = await chrome.storage.local.get('downloadQueue');
  latestQueue = downloadQueue;
  renderList();
}

async function refreshStreams() {
  if (activeTabId == null) return;
  const { detectedStreams = {} } = await chrome.storage.local.get('detectedStreams');
  const streams = detectedStreams[activeTabId] || [];
  if (streams.length === 0) {
    streamsBanner.hidden = true;
    streamsPanel.hidden = true;
    return;
  }
  streamsBanner.hidden = false;
  streamsText.textContent = `${streams.length} video phát hiện trên trang`;
  streamsPanel.innerHTML = streams
    .map(
      (s, i) => `
      <div class="stream-row">
        <span class="stream-url" title="${escapeHtml(s.url)}"><span class="stream-kind">${s.kind.toUpperCase()}</span>#${i + 1} — ${escapeHtml(s.url)}</span>
        <button data-stream-url="${escapeHtml(s.url)}">Tải</button>
      </div>`
    )
    .join('');
}

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-filter]');
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  [...tabsEl.querySelectorAll('.tab')].forEach((t) => t.classList.toggle('is-active', t === btn));
  renderList();
});

document.getElementById('viewStreams').addEventListener('click', () => {
  streamsPanel.hidden = !streamsPanel.hidden;
});

streamsPanel.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-stream-url]');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '…';
  chrome.runtime.sendMessage({ type: 'DOWNLOAD_HLS', masterUrl: btn.dataset.streamUrl });
});

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  chrome.runtime.sendMessage({
    type: 'DOWNLOAD_ACTION',
    action: btn.dataset.action,
    id: btn.dataset.id,
  });
});

document.getElementById('addDownload').addEventListener('click', submitUrl);
document.getElementById('urlInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitUrl();
});

function submitUrl() {
  const input = document.getElementById('urlInput');
  const url = input.value.trim();
  if (!url) return;
  try {
    new URL(url);
  } catch {
    input.closest('.input-pill').style.borderColor = 'var(--danger)';
    return;
  }
  chrome.runtime.sendMessage({ type: 'ENQUEUE_DOWNLOAD', url });
  input.value = '';
}

document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.downloadQueue) refreshList();
  if (area === 'local' && changes.detectedStreams) refreshStreams();
});

(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  await refreshList();
  await refreshStreams();
})();
