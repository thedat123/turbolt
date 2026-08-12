# Đóng góp cho Turbolt

Cảm ơn bạn đã quan tâm! Turbolt là dự án cộng đồng, mọi đóng góp — code, báo bug, ý tưởng tính năng, dịch thuật, cải thiện docs — đều có giá trị.

## Quy trình

1. Fork repo, tạo branch từ `main`: `git checkout -b feat/ten-tinh-nang` hoặc `fix/mo-ta-bug`
2. Cài dependencies: `npm install`
3. Chạy dev build (tự rebuild khi sửa file): `npm run dev`, sau đó "Load unpacked" thư mục `dist/` ở `chrome://extensions`
4. Code xong, đảm bảo `npm run build` chạy sạch không lỗi
5. Commit theo phong cách rõ ràng, mô tả **why** không chỉ **what**
6. Mở Pull Request vào `main`, mô tả ngắn gọn thay đổi + cách bạn đã test

## Coding style

- Vanilla JS (ES modules), không thêm framework (React/Vue) trừ khi UI thực sự cần nhiều state phức tạp — bàn trước trong Issue nếu muốn đề xuất.
- Không thêm dependency mới nếu không thực sự cần thiết — giữ extension nhẹ.
- Comment chỉ khi giải thích **lý do** (constraint, workaround), không comment lại điều code đã tự nói rõ.
- Mọi state cần tồn tại giữa các lần service worker bị Chrome kill phải đi qua `src/lib/storage.js`, không giữ trong biến JS thường ở top-level của service worker.

## Báo bug

Dùng [Issue template Bug report](.github/ISSUE_TEMPLATE/bug_report.md). Thông tin cần thiết: trình duyệt + phiên bản, các bước tái hiện, URL test (nếu công khai được), log console (`chrome://extensions` → Turbolt → "service worker" → Inspect).

## Đề xuất tính năng

Dùng [Issue template Feature request](.github/ISSUE_TEMPLATE/feature_request.md). Kiểm tra mục "Roadmap" trong README trước — có thể tính năng đã được ghi nhận.

## Không nhận đóng góp cho

Bất kỳ code nào nhằm bypass DRM (Widevine/FairPlay) hoặc target riêng các platform có bảo vệ bản quyền (Netflix, YouTube Premium...). Đây là giới hạn có chủ đích của dự án.
