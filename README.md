<div align="center">

# ⏬ Turbolt — Free Open-Source Download Accelerator & Manager

**The fastest way to download anything in your browser — multi-threaded downloads, HLS/M3U8 video capture, pause/resume, zero ads, zero telemetry, 100% free forever.**

*A free, open-source alternative to IDM (Internet Download Manager) for Chrome, Edge & Brave.*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/thedat123/turbolt/build.yml?branch=main)](../../actions)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-2563eb)](#)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red)](#contributing)

Read this in: **English** · [Tiếng Việt](./README.vi.md)

<!-- Replace with the real demo gif before publishing — this is the single biggest factor in whether visitors star the repo -->
<!-- ![Turbolt demo](./docs/demo.gif) -->

</div>

---

## Why Turbolt?

Browsers download files over a **single connection** — slow, unable to resume after a network drop, and blind to HLS video streams playing on the page. Turbolt fixes all three:

| | Browser default | Turbolt | IDM (closed-source, paid) |
|---|:---:|:---:|:---:|
| Multi-threaded downloads (faster) | ❌ | ✅ | ✅ |
| Capture & download HLS video (.m3u8) | ❌ | ✅ | ✅ |
| Pause / resume mid-session | ❌ | ✅ | ✅ |
| Bandwidth limiting | ❌ | ✅ | ✅ |
| Open source, auditable | — | ✅ | ❌ |
| Price | Free | **Free forever** | Paid after trial |
| Ads / data collection | — | **Never** | — |

## Features

- 🚀 **True multi-threaded downloads** — splits a file into multiple parts using HTTP Range requests, downloads 1–16 threads in parallel, and reassembles automatically. Noticeably faster than single-threaded downloads on servers that support ranges.
- 🎬 **Capture & download HLS/DASH video** — auto-detects `.m3u8`/`.mpd` manifests while you're watching a video on a page, lets you pick a quality, downloads every segment, and merges them into one file.
- ⏸ **Real pause / resume / cancel** — not just a hidden UI state; it actually stops the underlying network connections.
- 🐢 **Custom bandwidth limiting** — download in the background without choking your network during a call or a game.
- 🖱 **Quick-download button on link hover** + **right-click → "Download with Turbolt"**.
- 🌗 **Clean UI with dark mode**, no heavy framework dependency.
- 🔒 **No ads, no data collection, no account** — everything runs locally on your machine. See [PRIVACY.md](./PRIVACY.md).
- 🆓 **GPL-3.0 licensed** — free and open forever; no fork can ever turn it closed-source.

## Installation

### From the store (recommended)
> Pending Chrome Web Store / Firefox Add-ons review — this section will be updated with the live link once approved.

### From source (for developers / try it today)
```bash
git clone https://github.com/thedat123/turbolt.git
cd turbolt
npm install
npm run build
```
Then:
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right corner)
3. Click **Load unpacked** → select the `dist/` folder

## Usage

1. Paste a link into the popup box, or right-click any link → **"Download with Turbolt"**.
2. Hover over a download link on any page → click the download-arrow icon that appears next to it.
3. On a page with HLS video → open the popup → banner "🎬 N videos detected" → **View & download**.
4. Open **Settings (⚙)** to adjust thread count, bandwidth limit, and toggle auto-detection.

## How it works

`chrome.downloads.download()` does **not** support multi-threading out of the box. Turbolt implements it itself using `fetch()` + the HTTP `Range` header, split into two layers:

- [`src/background/engine-core.js`](./src/background/engine-core.js) — the pure engine (no `chrome.*` dependency), using **work-stealing**: instead of splitting a file into exactly N fixed chunks (one per thread — the v0.1.0 approach), the file is split into **many more segments than there are threads**, pushed into a shared queue; each thread pulls the next segment as soon as it's free. This is the core technique IDM/aria2/axel use — it solves the exact weakness of fixed-N-chunk splitting: one segment throttled by the CDN or hit by a flaky connection no longer bottlenecks the whole download while other threads sit idle after finishing early. Each segment automatically retries up to 3 times (exponential backoff) on a mid-transfer network drop, instead of failing the whole download.
- [`src/background/downloader.js`](./src/background/downloader.js) — the "glue" layer connecting the engine to `chrome.storage` (progress persistence), `chrome.downloads` (saving files), and pause/resume/cancel.

If a server doesn't return `Accept-Ranges: bytes`, or a file exceeds the configured RAM threshold, Turbolt automatically falls back to the browser's native download API so downloads always succeed.

## Benchmark (measured, not estimated)

`tests/engine.test.mjs` is a script you can run right now, no browser required (the pure engine only uses `fetch`/`Blob`, so it runs identically in Node): it downloads the same URL with 1 connection and with N work-stealing connections, compares SHA-256 hashes to confirm the reassembled file is **byte-for-byte identical**, and measures real throughput.

```bash
npm run test:engine -- <url> <threads>          # test against any URL that supports Range
npm run test:server -- 8177 20 300              # spin up a local server simulating a CDN capped at 300 KB/s per connection
npm run test:engine -- http://127.0.0.1:8177/file.bin 8
```

Real measured results (2026-08-11):

| Scenario | 1 connection | 8 connections (work-stealing) | Speedup |
|---|---|---|---|
| Public server, no per-connection cap (GitHub release asset, 39MB) | 2.52 MB/s | 2.33 MB/s | ~1× (bandwidth is already the bottleneck — multi-threading doesn't help further) |
| Server capped at 300 KB/s **per connection** (simulating a real CDN, 20MB) | 298 KB/s | 1.96 MB/s | **6.72×** |

Both runs produced identical SHA-256 hashes between the single-threaded and multi-threaded downloads.

**Honest takeaway**: multi-threading does **not** speed things up if the connection or server itself is already the overall bandwidth bottleneck. It helps significantly when **the server rate-limits per connection** — an extremely common setup on CDNs and file hosts (including free file/image/video hosts) to stop one user from hogging all the bandwidth. This is exactly why IDM and other download accelerators exist — Turbolt uses the same technique, and it's measured and verifiable, not just marketing copy.

## Current limitations (Roadmap)

Transparent about what's **not** done yet — no hiding it, to keep this open-source project trustworthy:

- [ ] Remux `.ts` → `.mp4` via `ffmpeg.wasm` (HLS video currently downloads as a `.ts` file, which plays fine in VLC and most players)
- [ ] Resume downloads after the browser is fully closed / the service worker is killed by Chrome mid-transfer (currently auto-detected and requires a re-download instead of producing a corrupt file — safe but not yet optimal; thanks to small work-stealing segments, the amount lost on pause/resume within the same session is already much smaller than with the original fixed-N-chunk approach)
- [ ] Write directly to disk via OPFS/File System Access for very large files (multi-threading currently uses RAM and automatically falls back to single-threaded if a file exceeds the configured threshold, to avoid crashes)
- [ ] Official Firefox support (currently optimized for Chrome/Edge/Brave — Manifest V3)
- [ ] Official listing on the Chrome Web Store / Firefox AMO

Not supported, and won't be: bypassing DRM (Widevine/FairPlay) on platforms like Netflix or YouTube Premium — this is an intentional technical and legal boundary.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All PRs, issues, and feedback are welcome — this is a community project.

## Security & privacy

Turbolt requests the `<all_urls>` permission so it can download files from any site you choose — the extension **never** sends your browsing data to any server other than the site you're downloading from. See [PRIVACY.md](./PRIVACY.md) for details.

## Support the project

Turbolt is free forever, with no ads. If you find it useful, you can support it via the **Sponsor** button at the top of the GitHub repo.

## License

[GPL-3.0](./LICENSE) — free to use, modify, and redistribute, as long as it stays under the same open license.
