# Đa ngôn ngữ cho Chrome Web Store

Có 2 lớp bản dịch độc lập, đừng nhầm lẫn:

1. **Store listing (trang chi tiết trên Chrome Web Store)** — nội dung ở `chrome-web-store.md` (title, short description, detailed description). Google/Chrome Web Store Dashboard cho phép nộp bản dịch riêng cho từng ngôn ngữ trực tiếp trong Developer Dashboard (mục "Store listing" → chọn ngôn ngữ) — **không** cần file trong repo, chỉ cần copy/paste đúng bản EN hoặc VI vào Dashboard cho từng locale.

2. **Tên & mô tả hiển thị trong `chrome://extensions` / popup của chính extension** — muốn tự động đổi theo ngôn ngữ trình duyệt người dùng thì dùng cơ chế i18n chuẩn của Chrome:
   - Tạo `_locales/en/messages.json` và `_locales/vi/messages.json`
   - Trong `manifest.json`, thay `"name"` và `"description"` bằng `"__MSG_extName__"` / `"__MSG_extDescription__"`, thêm `"default_locale": "en"`
   - Ví dụ `_locales/en/messages.json`:
     ```json
     {
       "extName": { "message": "Turbolt - Download Accelerator" },
       "extDescription": { "message": "Free multi-threaded download accelerator & manager." }
     }
     ```

Hiện tại (v0.1.0) extension chỉ có UI tiếng Việt cứng (không qua i18n) — đây là điểm có thể cải thiện sau, ghi vào Roadmap nếu muốn hỗ trợ đa ngôn ngữ trong UI thực tế của popup/options, không chỉ ở trang store listing.
