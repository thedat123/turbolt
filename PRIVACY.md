# Chính sách quyền riêng tư — Turbolt

Cập nhật lần cuối: 2026-08-11

Turbolt **không thu thập, không lưu trữ, không gửi đi** bất kỳ dữ liệu cá nhân hay dữ liệu duyệt web nào của bạn tới bất kỳ máy chủ nào do nhóm phát triển Turbolt vận hành — vì đơn giản là **không có máy chủ nào như vậy**. Toàn bộ extension chạy hoàn toàn cục bộ (local) trên trình duyệt của bạn.

## Quyền extension yêu cầu và lý do

| Quyền | Vì sao cần |
|---|---|
| `downloads` | Lưu file đã tải vào máy bạn qua API tải xuống chuẩn của trình duyệt |
| `storage` | Lưu hàng đợi tải & cài đặt cục bộ trên máy bạn (không đồng bộ ra ngoài, trừ cài đặt dùng `chrome.storage.sync` do chính Google/trình duyệt đồng bộ giữa các thiết bị đăng nhập cùng tài khoản của bạn) |
| `notifications` | Hiện thông báo khi tải xong |
| `webRequest` | Quan sát URL request để phát hiện link video `.m3u8`/`.mpd` — **không đọc nội dung** các request khác |
| `contextMenus` | Thêm mục "Tải xuống bằng Turbolt" vào menu chuột phải |
| `host_permissions: <all_urls>` | Cho phép tải file/video từ bất kỳ site nào bạn chủ động chọn tải |

## Những gì Turbolt KHÔNG làm

- Không có quảng cáo, không có SDK theo dõi (tracking SDK) bên thứ ba.
- Không gửi lịch sử duyệt web, danh sách tab, hay nội dung trang bạn xem tới bất kỳ đâu.
- Không bán hay chia sẻ dữ liệu cho bên thứ ba — vì không thu thập dữ liệu để bắt đầu.
- Không yêu cầu đăng nhập/tài khoản.

## Mã nguồn mở = kiểm chứng được

Vì Turbolt là mã nguồn mở (GPL-3.0), bất kỳ ai cũng có thể đọc toàn bộ source code để tự xác minh các cam kết trên, thay vì phải tin lời hứa suông.

## Liên hệ

Có câu hỏi về quyền riêng tư? Mở một [Issue](../../issues) trên GitHub.
