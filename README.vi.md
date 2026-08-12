<div align="center">

# ⏬ Turbolt — Free Open-Source Download Accelerator & Manager

**Cách nhanh nhất để tải bất cứ thứ gì trên trình duyệt — tải đa luồng, bắt video HLS/M3U8, pause/resume, không quảng cáo, không thu thập dữ liệu, miễn phí mãi mãi.**

*Giải pháp mã nguồn mở thay thế IDM (Internet Download Manager) cho Chrome, Edge & Brave.*

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/thedat123/turbolt/build.yml?branch=main)](../../actions)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-2563eb)](#)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red)](#đóng-góp)

Đọc bằng: [English](./README.md) · **Tiếng Việt**

<!-- Replace with the real demo gif before publishing — this is the single biggest factor in whether visitors star the repo -->
<!-- ![Turbolt demo](./docs/demo.gif) -->

</div>

---

## Vì sao Turbolt?

Trình duyệt tải file bằng **1 kết nối** — chậm, không resume được nếu mất mạng, và không "nhìn thấy" video HLS đang phát trên trang. Turbolt giải quyết cả ba:

| | Trình duyệt mặc định | Turbolt | IDM (đóng nguồn, có phí) |
|---|:---:|:---:|:---:|
| Tải đa luồng (nhanh hơn) | ❌ | ✅ | ✅ |
| Bắt & tải video HLS (.m3u8) | ❌ | ✅ | ✅ |
| Pause / Resume trong phiên | ❌ | ✅ | ✅ |
| Giới hạn băng thông | ❌ | ✅ | ✅ |
| Mã nguồn mở, kiểm chứng được | — | ✅ | ❌ |
| Giá | Free | **Free mãi mãi** | Trả phí sau bản dùng thử |
| Quảng cáo / thu thập dữ liệu | — | **Không bao giờ** | — |

## Tính năng

- 🚀 **Tải đa luồng thực sự** — chia file thành nhiều phần bằng HTTP Range request, tải song song 1–16 luồng, tự động ghép lại. Nhanh hơn rõ rệt so với tải đơn luồng trên các server hỗ trợ range.
- 🎬 **Bắt & tải video HLS/DASH** — tự phát hiện `.m3u8`/`.mpd` khi bạn xem video trên trang, chọn chất lượng, tải toàn bộ segment và ghép thành 1 file.
- ⏸ **Pause / Resume / Cancel** thật — không chỉ ẩn UI, dừng đúng kết nối mạng đang chạy.
- 🐢 **Giới hạn băng thông** tuỳ chỉnh — tải ngầm mà không nghẽn mạng khi đang họp/chơi game.
- 🖱 **Nút tải nhanh khi hover link** + **click phải → "Tải xuống bằng Turbolt"**.
- 🌗 **Giao diện gọn, hỗ trợ dark mode**, không phụ thuộc framework nặng.
- 🔒 **Không quảng cáo, không thu thập dữ liệu, không tài khoản** — mọi thứ chạy local trên máy bạn. Xem [PRIVACY.md](./PRIVACY.md).
- 🆓 **Giấy phép GPL-3.0** — mãi mãi miễn phí và mở, không thể bị đóng nguồn bởi bất kỳ ai fork lại.

## Cài đặt

### Từ store (khuyến nghị)
> Đang trong quá trình đăng ký Chrome Web Store / Firefox Add-ons — cập nhật link tại đây khi được duyệt.

### Từ source (dành cho dev / dùng ngay hôm nay)
```bash
git clone https://github.com/thedat123/turbolt.git
cd turbolt
npm install
npm run build
```
Sau đó:
1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Chọn **Load unpacked** → chọn thư mục `dist/`

## Cách dùng

1. Dán link vào ô ở popup, hoặc click phải vào 1 link bất kỳ → **"Tải xuống bằng Turbolt"**.
2. Rê chuột qua link tải trên trang bất kỳ → click biểu tượng mũi tên tải hiện lên cạnh link.
3. Xem video trên trang có HLS → mở popup → banner "🎬 N video phát hiện" → **Xem & tải**.
4. Vào **Cài đặt (⚙)** để chỉnh số luồng, giới hạn băng thông, bật/tắt tự động phát hiện.

## Cách hoạt động (How it works)

`chrome.downloads.download()` mặc định **không** hỗ trợ đa luồng. Turbolt tự implement bằng `fetch()` + HTTP `Range` header, với engine tách riêng thành 2 lớp:

- [`src/background/engine-core.js`](./src/background/engine-core.js) — engine thuần (không phụ thuộc `chrome.*`), dùng kỹ thuật **work-stealing**: thay vì chia file thành đúng N khối lớn cố định (1 khối/luồng — cách làm ở bản v0.1.0), file được chia thành **nhiều segment nhỏ hơn số luồng nhiều lần**, đưa vào 1 hàng đợi dùng chung; mỗi luồng lấy segment tiếp theo ngay khi rảnh. Đây là kỹ thuật lõi mà IDM/aria2/axel dùng — nó giải quyết đúng điểm yếu của cách chia N-khối-cố-định: 1 segment bị CDN giới hạn tốc độ hoặc mạng chập chờn sẽ không còn làm "nghẽn" cả download trong khi các luồng khác đã xong phải ngồi chờ. Mỗi segment tự động retry tối đa 3 lần (exponential backoff) khi rớt mạng giữa chừng, thay vì làm hỏng cả lượt tải.
- [`src/background/downloader.js`](./src/background/downloader.js) — lớp "glue" nối engine với `chrome.storage` (lưu tiến trình), `chrome.downloads` (lưu file), pause/resume/cancel.

Nếu server không trả `Accept-Ranges: bytes`, hoặc file vượt ngưỡng RAM cấu hình, Turbolt tự động fallback về tải qua API gốc của trình duyệt để đảm bảo luôn tải được.

## Benchmark (đo thật, không phải số ước lượng)

`tests/engine.test.mjs` là script kiểm chứng **chạy được ngay**, không cần trình duyệt (engine thuần chỉ dùng `fetch`/`Blob` nên chạy y hệt trong Node): tải cùng 1 URL bằng 1 kết nối và bằng N kết nối work-stealing, so sánh SHA-256 để đảm bảo file ghép lại **giống hệt byte-for-byte**, và đo tốc độ thật.

```bash
npm run test:engine -- <url> <threads>          # test với 1 URL bất kỳ hỗ trợ Range
npm run test:server -- 8177 20 300              # dựng server local mô phỏng CDN giới hạn 300 KB/s/kết nối
npm run test:engine -- http://127.0.0.1:8177/file.bin 8
```

Kết quả đo thật (2026-08-11):

| Kịch bản | 1 kết nối | 8 kết nối (work-stealing) | Speedup |
|---|---|---|---|
| Server công khai, không giới hạn theo kết nối (GitHub release asset, 39MB) | 2.52 MB/s | 2.33 MB/s | ~1× (băng thông đã là nút thắt — đa luồng không giúp thêm) |
| Server giới hạn 300 KB/s **mỗi kết nối** (mô phỏng CDN thật, 20MB) | 298 KB/s | 1.96 MB/s | **6.72×** |

Cả hai lần đo đều cho SHA-256 khớp tuyệt đối giữa file tải đơn luồng và đa luồng.

**Kết luận trung thực**: đa luồng **không** làm tăng tốc nếu bản thân đường truyền/máy chủ đã là nút thắt băng thông tổng. Nó giúp rõ rệt khi **máy chủ giới hạn tốc độ theo từng kết nối** — tình huống cực kỳ phổ biến trên các CDN/file host (kể cả các host cho tải miễn phí, host lưu trữ ảnh/video) để chống 1 người dùng chiếm hết băng thông. Đây chính xác là lý do IDM và các trình tăng tốc download tồn tại — Turbolt dùng cùng kỹ thuật, đo được, kiểm chứng được, không chỉ là lời quảng cáo.

## Giới hạn hiện tại (Roadmap)

Minh bạch về những gì **chưa** làm được — không giấu diếm để giữ uy tín cho dự án mã nguồn mở:

- [ ] Remux `.ts` → `.mp4` bằng `ffmpeg.wasm` (hiện tải video HLS ra file `.ts`, phát tốt bằng VLC/hầu hết player)
- [ ] Resume tải sau khi đóng hẳn trình duyệt / service worker bị Chrome kill giữa chừng (hiện tự phát hiện và yêu cầu tải lại thay vì tạo file lỗi — an toàn nhưng chưa tối ưu; nhờ chia segment nhỏ theo kiểu work-stealing, phần bị mất khi pause/resume trong cùng phiên đã giảm đáng kể so với cách chia N-khối-cố-định ban đầu)
- [ ] Ghi trực tiếp ra đĩa qua OPFS/File System Access cho file cực lớn (hiện đa luồng dùng RAM, tự chuyển sang đơn luồng nếu file vượt ngưỡng cấu hình để tránh crash)
- [ ] Hỗ trợ chính thức Firefox (đang tối ưu cho Chrome/Edge/Brave — Manifest V3)
- [ ] Đăng chính thức lên Chrome Web Store / Firefox AMO

Không hỗ trợ và sẽ không hỗ trợ: bypass DRM (Widevine/FairPlay) trên các nền tảng như Netflix, YouTube Premium — đây là giới hạn có chủ đích về mặt kỹ thuật lẫn pháp lý.

## Đóng góp

Xem [CONTRIBUTING.md](./CONTRIBUTING.md). Mọi PR, issue, ý kiến đều được hoan nghênh — đây là dự án cộng đồng.

## Bảo mật & quyền riêng tư

Turbolt yêu cầu quyền `<all_urls>` để có thể tải file từ bất kỳ site nào bạn chọn — extension **không** gửi dữ liệu duyệt web của bạn ra bất kỳ server nào ngoài chính site bạn đang tải file. Xem chi tiết ở [PRIVACY.md](./PRIVACY.md).

## Ủng hộ dự án

Turbolt miễn phí mãi mãi, không quảng cáo. Nếu thấy hữu ích, bạn có thể ủng hộ qua nút **Sponsor** ở đầu repo GitHub.

## License

[GPL-3.0](./LICENSE) — bạn được tự do dùng, sửa, phân phối lại, miễn là giữ cùng giấy phép mở.
