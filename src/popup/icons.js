// Small hand-built outline icon set (no external icon font/library — keeps
// the extension lightweight). All icons share a 24x24 viewBox, currentColor
// stroke, so they inherit color from CSS automatically in both themes.

const wrap = (inner, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const icons = {
  bolt: (size) => wrap('<polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" fill="currentColor" stroke="none"/>', size),
  settings: (size) =>
    wrap(
      '<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2" fill="var(--bg)"/>' +
        '<line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="var(--bg)"/>' +
        '<line x1="4" y1="17" x2="20" y2="17"/><circle cx="11" cy="17" r="2" fill="var(--bg)"/>',
      size
    ),
  pause: (size) => wrap('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', size),
  play: (size) => wrap('<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>', size),
  close: (size) => wrap('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', size),
  retry: (size) => wrap('<path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>', size),
  trash: (size) =>
    wrap(
      '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
      size
    ),
  film: (size) =>
    wrap(
      '<rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
      size
    ),
  plus: (size) => wrap('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', size),
  check: (size) => wrap('<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>', size),
  alert: (size) => wrap('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', size),
  file: (size) => wrap('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', size),
  inbox: (size) =>
    wrap(
      '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
      size
    ),
  zap: (size) => wrap('<polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2"/>', size),
};

export function icon(name, size = 16) {
  return icons[name] ? icons[name](size) : '';
}
