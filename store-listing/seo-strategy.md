# Chiến lược SEO & định vị thị trường — Turbolt

Mục tiêu: đưa Turbolt lên top kết quả tìm kiếm cho các cụm từ khóa "thay thế IDM miễn phí / download accelerator extension / m3u8 downloader chrome" trên cả Google lẫn Chrome Web Store search — hai kênh khám phá chính của người dùng.

## 1. Định vị (positioning)

**Câu định vị 1 dòng**: *"Turbolt là bản thay thế IDM miễn phí, mã nguồn mở, không quảng cáo — chạy ngay trong trình duyệt."*

Ba trục khác biệt hoá so với đối thủ:
1. **Miễn phí thật sự vs IDM** (IDM trả phí sau bản dùng thử) — đánh vào nhóm người dùng đang tìm "IDM free download" / "IDM alternative free" (khối lượng tìm kiếm rất lớn, đa số thất vọng vì IDM không thực sự free).
2. **Mã nguồn mở, kiểm chứng được vs các extension "tăng tốc download" khác trên Chrome Web Store** — nhiều extension cùng loại có quảng cáo/thu thập dữ liệu ẩn; "open source, no telemetry" là lợi thế lòng tin lớn, đặc biệt với người dùng kỹ thuật (early adopter, hay review, hay star GitHub).
3. **Chạy ngay trong trình duyệt, không cần cài phần mềm desktop riêng** — khác với IDM/FDM là ứng dụng desktop độc lập.

## 2. Từ khóa mục tiêu (target keywords)

Nhóm ưu tiên cao (buyer intent rõ, cạnh tranh vừa phải cho 1 dự án mới):
- `idm alternative free`
- `free download manager extension`
- `download accelerator chrome extension`
- `m3u8 downloader chrome`
- `hls video downloader extension`
- `multi-threaded download extension`
- `chrome extension download faster`
- `open source download manager`

Nhóm dài đuôi (long-tail, dễ rank hơn cho site mới):
- `how to download m3u8 video chrome extension`
- `free idm alternative no ads`
- `download manager extension without account`
- `tải video m3u8 bằng extension` / `extension tăng tốc download miễn phí`

## 3. Kênh & hành động cụ thể

### Chrome Web Store (kênh quan trọng nhất — traffic mua sẵn intent)
- Tối ưu title/description theo `chrome-web-store.md` — title chứa đúng cụm "Download Accelerator" vì đây là cụm search volume cao nhất trong nhóm mục tiêu.
- Xin ít nhất 10-20 review 5 sao trong tuần đầu từ người dùng thật (không mua review giả — vi phạm chính sách Store và bị gỡ) để vượt ngưỡng thuật toán ưu tiên extension "đã được kiểm chứng".
- Gắn đúng category `Productivity`.

### GitHub (uy tín kỹ thuật + backlink SEO chất lượng cao)
- Repo public, README chuẩn (đã có), gắn **topics**: `browser-extension`, `download-manager`, `download-accelerator`, `chrome-extension`, `hls`, `m3u8`, `open-source`, `manifest-v3` — đây là cách chính để được tìm thấy qua GitHub Topics/Explore, một nguồn traffic + backlink DA cao.
- GitHub được Google index rất tốt — README với đúng từ khóa tự nhiên (đã viết ở trên) tự nó là 1 trang SEO.

### Launch ban đầu (tạo backlink + traffic đợt đầu)
- **Product Hunt**: launch dạng "Turbolt — Free open-source IDM alternative" — cộng đồng Product Hunt phản ứng tốt với "free alternative to [tool nổi tiếng]".
- **Hacker News "Show HN"**: tiêu đề dạng `Show HN: Turbolt – open-source, multi-threaded download manager for Chrome`. Điểm mạnh: cộng đồng HN đánh giá cao "no telemetry, GPL-3.0, verify the code yourself".
- **Reddit**: r/opensource, r/chrome_extensions, r/software (đọc rule mỗi sub trước khi đăng — nhiều sub cấm self-promo trực tiếp, nên đăng dạng chia sẻ dự án + xin feedback thay vì quảng cáo).
- **AlternativeTo.net**: submit Turbolt vào trang so sánh của "Internet Download Manager" và "Free Download Manager" — đây là nguồn traffic có buyer-intent cực cao vì người dùng đang chủ động tìm "alternative to X".
- **Slant.co / trang so sánh phần mềm khác**: tương tự AlternativeTo.

### Landing page riêng (xem `landing-page/index.html`)
- Trang 1 màn hình, đủ SEO meta tags, JSON-LD Schema.org `SoftwareApplication` để Google hiện rich snippet (rating, giá $0) trong kết quả tìm kiếm.
- Nội dung FAQ ở cuối trang nhắm vào các câu hỏi long-tail phía trên (Google rất ưu tiên format FAQ cho featured snippet).

## 4. Vòng lặp giữ hạng (sau khi launch)

- Theo dõi rating/review trên Chrome Web Store hàng tuần, phản hồi review tiêu cực nhanh (ảnh hưởng trực tiếp thứ hạng).
- Release đều đặn (mỗi vài tuần) — Chrome Web Store và người dùng đều đánh giá cao extension "còn sống", giảm tỷ lệ gỡ cài đặt.
- Khuyến khích contributor gắn sao (star) repo khi PR được merge — star count là tín hiệu uy tín xã hội mạnh khi người dùng mới landing vào GitHub từ Google.
