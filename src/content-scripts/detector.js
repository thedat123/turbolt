// Lightweight in-page helper: hovering a link to a common downloadable
// file shows a small download-arrow button that queues it in Turbolt
// without having to open the popup and paste the URL manually.

const DOWNLOADABLE_EXT = /\.(zip|rar|7z|tar|gz|exe|msi|dmg|pkg|deb|apk|iso|pdf|mp4|mkv|avi|mp3|flac|wav)(\?|#|$)/i;

let currentLink = null;
let badge = null;

function ensureBadge() {
  if (badge) return badge;
  badge = document.createElement('button');
  badge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6 12l6 6 6-6"/></svg>';
  badge.title = 'Tải bằng Turbolt';
  Object.assign(badge.style, {
    position: 'fixed',
    zIndex: '2147483647',
    width: '22px',
    height: '22px',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    borderRadius: '50%',
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
  });
  badge.addEventListener('mousedown', (e) => e.preventDefault()); // don't steal focus
  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentLink) return;
    chrome.runtime.sendMessage({ type: 'ENQUEUE_DOWNLOAD', url: currentLink.href });
    badge.style.display = 'none';
  });
  document.documentElement.appendChild(badge);
  return badge;
}

function isEnabled() {
  return chrome.storage.local.get('detectorEnabled').then((r) => r.detectorEnabled !== false);
}

async function onMouseOver(e) {
  if (!(await isEnabled())) return;
  const link = e.target.closest?.('a[href]');
  if (!link || !DOWNLOADABLE_EXT.test(link.href)) return;
  currentLink = link;
  const rect = link.getBoundingClientRect();
  const el = ensureBadge();
  el.style.top = `${Math.max(0, rect.top - 4)}px`;
  el.style.left = `${rect.right + 6}px`;
  el.style.display = 'flex';
}

function onMouseOut(e) {
  if (badge && e.relatedTarget !== badge) badge.style.display = 'none';
}

document.addEventListener('mouseover', onMouseOver, { passive: true });
document.addEventListener('mouseout', onMouseOut, { passive: true });
