# Chrome Web Store — Permission justifications

Dán trực tiếp vào các ô "justification" tương ứng khi submit trong Developer Dashboard (Google chỉ hiển thị ô justification cho các permission "nhạy cảm" — thường là `host_permissions`, `webRequest`, `downloads`).

## Single purpose description
```
Turbolt accelerates file downloads in the browser: it splits downloads into multiple parallel HTTP connections and captures HLS/DASH video streams for download. All requested permissions serve this single download-related purpose.
```

## `host_permissions: <all_urls>`
```
Turbolt lets users download files and capture streaming video (HLS/M3U8, DASH/MPD) from any website they choose. Because downloadable content and video manifests can originate from any domain, the extension needs host access to all URLs to detect these on the current page and fetch file segments via HTTP Range requests when the user initiates a download. Turbolt does not run any background scraping — it only acts on user-initiated downloads or on the current tab when the popup is opened.
```

## `webRequest`
```
Used in read-only (non-blocking) mode to inspect outgoing request URLs and detect HLS (.m3u8) and DASH (.mpd) video manifest requests so Turbolt can offer to download the stream. Turbolt does not modify, block, or redirect any request, and does not read or store request/response bodies.
```

## `downloads`
```
Used to save completed downloads to the user's device via the browser's standard downloads API, and to provide pause/resume/cancel controls on native browser downloads as a fallback path.
```

## `storage` / `unlimitedStorage`
```
Used to persist the download queue, progress, and user settings (thread count, bandwidth limit) locally on the user's device between browser sessions. `unlimitedStorage` is needed because in-progress multi-threaded downloads can temporarily buffer large file segments before being written to disk.
```

## `notifications`
```
Used to show a native OS notification when a download completes or fails.
```

## `contextMenus`
```
Used to add a "Download with Turbolt" entry to the right-click menu on links, so users can start an accelerated download without opening the popup.
```

## Privacy policy URL
```
https://thedat123.github.io/turbolt/privacy.html
```
