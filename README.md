# Graduation Invitation — Kỷ Yếu & Thiệp Mời Tốt Nghiệp

Ứng dụng web thiệp mời tốt nghiệp cá nhân hóa theo từng khách mời, tích hợp hiệu ứng mở thiệp 3D, nhạc nền, sổ lưu bút, xác nhận tham dự (RSVP), và đồng bộ 2 chiều với Google Sheets.

---

## 1. Kiến trúc & 2 chế độ hoạt động

1. **Trang chủ (Home `/`) — Khu vực quản trị (Admin):**
   - Được bảo vệ bởi màn hình khóa mật khẩu (`BlurPasswordGate`).
   - Hiển thị thông tin buổi lễ, trình quản lý thiệp mời (`AdminInvitationManager`) để tạo/sửa/xóa thiệp, lấy link riêng tư cho từng khách, và xem sổ lưu bút.
2. **Trang thiệp mời riêng (`/<route_hash>` hoặc `/#/<route_hash>`):**
   - Mỗi khách mời hoặc nhóm khách (ví dụ `/bandaihoc`, `/giadinh`) có một đường dẫn riêng.
   - Khách bấm **Mở thiệp** -> chạy chuỗi chuyển cảnh 3D (`Universe3DTransition`: ảnh kỷ niệm & lời chúc bay lên -> xoay vòng -> thu vào thiệp) -> hiển thị nội dung thư mời (`CoverLetterView`), nút thêm vào lịch (`.ics`), bản đồ, form RSVP và Sổ lưu bút.

---

## 2. Cài đặt & Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Build production:

```bash
npm run build
```

---

## 3. Hướng dẫn tùy biến cho người khác muốn dùng lại

Nếu bạn clone/fork dự án này để làm thiệp tốt nghiệp cho riêng mình, hãy chỉnh sửa lần lượt các phần sau:

### 3.1. Thông tin buổi lễ & người tốt nghiệp (`src/config/ceremony.ts`)

Mở [`src/config/ceremony.ts`](src/config/ceremony.ts) và thay đổi đối tượng `CEREMONY_INFO`:

- **Thông tin cá nhân & trường:**
  - `graduateName`: Tên của bạn (hiển thị to trên trang chủ và thiệp).
  - `cohort`, `major`, `years`: Khóa, ngành học, niên khóa.
  - `degreeTitle`: Tiêu đề buổi lễ (ví dụ `"Lễ Tốt Nghiệp & Trao Bằng Cử Nhân"`).
  - `universityShort`, `universityVi`, `universityEn`, `university`: Tên viết tắt và tên đầy đủ của trường.
  - `quote`: Đoạn lời dẫn ngắn hiển thị dưới tên bạn trên Trang chủ.
- **Thời gian & địa điểm:**
  - `dateDisplay`, `ceremonyTime`, `photoTime`, `venue`, `mapUrl`.
  - `calendarEvent`: Chỉnh `title`, `description`, `location`, `startUtc`, `endUtc` (định dạng `YYYYMMDDTHHMMSSZ` theo giờ UTC; giờ Việt Nam UTC+7 nên trừ đi 7 tiếng).
- **Ảnh kỷ niệm 3D (`memoryPhotos`):**
  - Các đường dẫn bắt đầu bằng `/` trỏ tới thư mục `public/`.
  - Ví dụ `"/images/1.jpg"` tương ứng với file `public/images/1.jpg`. Hãy tạo thư mục `public/images/` và bỏ ảnh của bạn vào đó (hoặc sửa lại mảng `memoryPhotos` theo tên file thực tế).
- **Lời chúc bay mặc định (`defaultFlyingWishes`):**
  - Danh sách câu chúc hiển thị trong hiệu ứng 3D khi Google Sheets chưa có lời chúc.
- **Nhạc nền (`soundTracks`):**
  - Đặt file `.mp3` vào `public/sound/` (ví dụ `public/sound/1.mp3`, `public/sound/2.mp3`) và cập nhật tên bài hát trong `soundTracks`.

### 3.2. Tối ưu & nén ảnh để trang tải nhẹ hơn (`scripts/convert-images-to-jpeg.py`)

Ảnh chụp từ điện thoại thường nặng (2–8 MB/tấm) hoặc ở định dạng `.HEIC`/`.PNG`, làm trang mở thiệp 3D tải chậm. **Trang web chỉ nên load các file `.jpeg` đã nén nhẹ trong `public/personal_image_jpeg/`** (không load trực tiếp ảnh gốc từ `public/personal_image/`).

Quy trình 3 bước:

1. **Bỏ toàn bộ ảnh gốc vào thư mục `public/personal_image/`**
   - Hỗ trợ: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`, `.tiff`, `.heic` / `.heif`.
   - Thư mục `public/personal_image/` đã được thêm vào `.gitignore` để không đẩy ảnh nặng lên Git.
2. **Chạy file tool [`scripts/convert-images-to-jpeg.py`](scripts/convert-images-to-jpeg.py) để chuyển sang `.jpeg` nhẹ:**
   ```bash
   npm run images:jpeg
   ```
   *(Tương đương chạy `python3 scripts/convert-images-to-jpeg.py`)*
   - Tool sẽ đọc tất cả ảnh trong `public/personal_image/`, tự xoay đúng chiều EXIF, resize cạnh dài tối đa `1600px`, nén JPEG `quality=82` (giảm ~90% dung lượng) và xuất ra thư mục **`public/personal_image_jpeg/`**.
   - Nếu có ảnh `.HEIC` (iPhone), cài thêm `pillow-heif` trước khi chạy:
     ```bash
     pip install pillow-heif && npm run images:jpeg
     ```
3. **Chỉ load các file `.jpeg` từ `public/personal_image_jpeg/` trong `memoryPhotos`:**
   - Mở [`src/config/ceremony.ts`](src/config/ceremony.ts) và khai báo các đường dẫn dạng `"/personal_image_jpeg/ten_anh.jpeg"` trong mảng `memoryPhotos`.
   - Mẹo liệt kê nhanh toàn bộ đường dẫn ảnh đã nén để copy vào `memoryPhotos`:
     ```bash
     ls -1 public/personal_image_jpeg | sed 's/^/    "\/personal_image_jpeg\//;s/$/",/'
     ```

### 3.3. Tài nguyên tĩnh trong `public/`

- `public/logo_hcmus.png`: Logo trường hiển thị trên thiệp. Thay bằng logo trường của bạn (hoặc giữ nguyên tên file để không cần sửa code).
- `public/personal_image_jpeg/*.jpeg`: Ảnh kỷ niệm đã nén nhẹ (được dùng trong `memoryPhotos`).
- `public/sound/*.mp3`: Nhạc nền phát khi khách mở thiệp.

### 3.4. Tiêu đề tab trình duyệt & Anti-DevTools (`index.html`)

Mở [`index.html`](index.html):
- Sửa thẻ `<title>` thành tên của bạn.
- Lưu ý: `index.html` có sẵn đoạn script **Anti-DevTools** (chặn chuột phải, F12, `Ctrl+Shift+I` trên desktop). Khi đang phát triển/chỉnh sửa giao diện trên trình duyệt, bạn có thể tạm comment đoạn `<script>` này lại và mở lại trước khi deploy.

### 3.5. Alias đường dẫn & mã hóa offline (`src/App.tsx` & `local-invitations.private.json`)

- Tạo file dữ liệu thiệp nội bộ từ file mẫu:
  ```bash
  cp local-invitations.example.json local-invitations.private.json
  ```
- Chỉnh sửa `local-invitations.private.json` theo danh sách khách mời của bạn, sau đó chạy:
  ```bash
  npm run encrypt
  ```
  Lệnh này sẽ mã hóa dữ liệu vào `src/data/encrypted-invitations.json` để làm dữ liệu fallback khi chưa kết nối Google Sheets.
- Trong [`src/App.tsx`](src/App.tsx), kiểm tra `DEFAULT_QR_KEYS` và `ROUTE_ALIASES` nếu bạn có đường dẫn rút gọn/alias riêng hoặc muốn xóa các mẫu mặc định cũ.

---

## 4. Hướng dẫn Trang chủ (Home `/`) & Mật khẩu Admin

### 4.1. Cơ chế bảo vệ Trang chủ

Trang chủ `/` chỉ dành cho chủ nhân buổi lễ quản lý danh sách thiệp. Khi truy cập `/`, bạn sẽ thấy màn hình nhập mật khẩu quản trị.

Mật khẩu không lưu dạng chữ thuần mà so sánh bằng **SHA-256 hash**. Bạn có thể tạo SHA-256 hash cho mật khẩu của mình bằng lệnh:

```bash
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('MAT_KHAU_CUA_BAN').digest('hex'))"
```

### 4.2. Hai cách lưu `admin_password_hash`

Hệ thống hỗ trợ kiểm tra mật khẩu Admin từ **cả 2 nguồn** (hợp nhất với nhau):

1. **Biến môi trường `.env.local` (hoặc Environment Variables khi deploy):**
   ```env
   VITE_ADMIN_PASSWORD_HASH=<sha256_hex_cua_mat_khau>
   ```
2. **Cột `admin_password_hash` trực tiếp trên Google Sheet:**
   - Trong tab `Invitations` trên Google Sheet có cột **`admin_password_hash`** (cột thứ 21).
   - Bạn có thể dán mã SHA-256 hash vào cột này (có thể điền ở một dòng hoặc lặp lại trên tất cả các dòng thiệp đều được).
   - Khi đăng nhập ở Trang chủ, nếu mật khẩu khớp với `VITE_ADMIN_PASSWORD_HASH` **hoặc** khớp với bất kỳ giá trị hợp lệ nào trong cột `admin_password_hash` trên Google Sheet, bạn đều đăng nhập thành công.
   - Khi chạy `npm run sync:sheets`, script sẽ tự động lấy `VITE_ADMIN_PASSWORD_HASH` trong `.env.local` (nếu bản ghi chưa có) để điền vào cột `admin_password_hash` trên Sheet.
   - Khi chỉnh sửa thiệp từ giao diện Web Admin mà không gửi kèm `admin_password_hash`, Apps Script sẽ tự động giữ nguyên giá trị `admin_password_hash` đang có trên dòng đó của Google Sheet (không ghi đè mất).

### 4.3. Các thao tác trong Trang chủ Admin

Sau khi đăng nhập:
- **Tạo / Chỉnh sửa thiệp (`AdminInvitationManager`):**
  - Điền tên người nhận (`recipient_label`), nhóm quan hệ (`relationship_tag`), đường dẫn riêng (`route_hash`, ví dụ `bandaihoc`), mật khẩu mở thiệp (`password`), lời chào, nội dung thư, thông tin giờ giấc, địa điểm, dress code, liên hệ khẩn cấp, và các lựa chọn RSVP (ngăn cách bởi dấu `|`).
  - Khi bấm lưu, hệ thống cập nhật dữ liệu local (khi chạy `npm run dev` sẽ lưu vào `local-invitations.private.json` và `src/data/encrypted-invitations.json`) và đồng bộ lên Google Sheets nếu đã cấu hình `VITE_APPS_SCRIPT_URL`.
- **Xem trước & Sao chép link:**
  - Copy link `/<route_hash>` để tạo mã QR gửi riêng cho từng khách mời.
  - Có thể mở xem trước trực tiếp nội dung thiệp ngay từ giao diện Admin.
- **Sổ lưu bút (`GuestbookSection`):** Xem toàn bộ lời chúc khách mời đã gửi.
- **Khóa trang chủ:** Bấm nút đăng xuất (`LogOut`) ở góc trên bên phải để khóa lại màn hình Admin.

---

## 5. Hướng dẫn kết nối Google Sheets & Apps Script

### Bước 1: Tạo Google Sheet & Apps Script

1. Tạo một Google Sheet mới.
2. Trên thanh menu chọn **Extensions (Tiện ích mở rộng) -> Apps Script**.
3. Xóa code mặc định và dán toàn bộ nội dung file [`google-apps-script/Code.gs`](google-apps-script/Code.gs) vào.
4. Lưu lại, chọn hàm **`authorizeAndTest`** trên thanh công cụ và bấm **Run (Chạy)** để cấp quyền truy cập Google Sheet cho script.

> Script sẽ tự động tạo/nhận diện các tab:
> - `Invitations` (21 cột): `id`, `recipient_label`, `relationship_tag`, `password_hint`, `salutation`, `opening_story`, `heartfelt_message`, `invitation_body`, `event_date`, `ceremony_time`, `photo_time_slot`, `venue_detail`, `parking_and_map`, `dress_code`, `emergency_contact`, `closing_signature`, `rsvp_status_options`, `post_ceremony_party`, `route_hash`, `password`, **`admin_password_hash`**.
> - `Wishes`: Lưu lời chúc từ khách mời.
> - `RSVP`: Lưu xác nhận tham dự.
> - `Invitations_Private` (tùy chọn): Dùng cho chế độ xác thực pepper phía server nếu bật.

### Bước 2: Deploy Apps Script thành Web App

1. Bấm **Deploy -> New deployment** -> chọn loại **Web app**.
2. Cấu hình bắt buộc:
   - **Execute as (Thực thi dưới dạng):** `Me` (tài khoản của bạn)
   - **Who has access (Ai có quyền truy cập):** `Anyone` (Bất kỳ ai)
3. Bấm **Deploy**, copy đường dẫn Web App có dạng `https://script.google.com/macros/s/.../exec`.
4. Dán vào file `.env.local`:
   ```env
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   VITE_ADMIN_PASSWORD_HASH=6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6
   ```

> **Lưu ý:** Mỗi lần bạn chỉnh sửa `Code.gs` trên Apps Script, hãy chọn **Deploy -> Manage deployments -> Edit (biểu tượng bút chì) -> Version: New version -> Deploy** để giữ nguyên URL `/exec` cũ mà vẫn áp dụng code mới.

### Bước 3: Đồng bộ dữ liệu từ local lên Google Sheets (tùy chọn)

```bash
npm run sync:sheets
```

---

## 6. Deploy lên Vercel / Netlify

Dự án đã cấu hình sẵn [`vercel.json`](vercel.json) và [`public/_redirects`](public/_redirects) để mọi đường dẫn con (như `/bandaihoc`) đều trỏ về `index.html`.

Khi deploy trên Vercel hoặc Netlify:
- Build command: `npm run build`
- Output directory: `dist`
- Environment Variables: thêm `VITE_APPS_SCRIPT_URL` và `VITE_ADMIN_PASSWORD_HASH` (nếu không dùng `VITE_ADMIN_PASSWORD_HASH` ở env thì đảm bảo đã điền `admin_password_hash` trên Google Sheet).
