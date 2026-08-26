# Changelog

## [1.0.0] — 2026-08-26

Bản demo đầu tiên. Dựng theo `../../docs/architecture.md`, `../../docs/schema.ts`
và `../../docs/demo-features.md`.

### Thêm mới

**Nền tảng**

- Next.js 16.3.3 (App Router, React 19, Turbopack) + TypeScript strict.
- Tailwind CSS v4 cấu hình bằng CSS, shadcn/ui base `radix` preset `nova`.
- Font Be Vietnam Pro — có subset `vietnamese` đầy đủ.
- `src/proxy.ts` làm mới phiên Supabase và điều hướng sớm.

**Cơ sở dữ liệu** — 4 migration + seed

- 7 bảng, 3 enum, khớp `docs/schema.ts` (bốn khác biệt có chủ đích, xem
  [database.md](database.md#khác-biệt-so-với-docsschemats)).
- RLS bật trên toàn bộ bảng, 14 policy, 10 hàm helper `SECURITY DEFINER`.
- Trigger khóa theo cột: học sinh không tự chấm được, giáo viên không sửa được
  bài làm; `graded_at`/`graded_by`/`submitted_at` đóng dấu phía server.
- Trigger toàn vẹn vai trò: `classes.teacher_id` buộc phải là giáo viên, v.v.
- Thông báo do trigger sinh: `assignment_created`, `grade_created`,
  `grade_updated`. Không có policy INSERT cho người dùng.
- Bucket private `submissions`, key `{assignment_id}/{student_id}/{file}`;
  truy cập qua signed URL sống 10 phút.
- `seed.sql`: 10 tài khoản, 2 lớp, 4 bài tập, 4 bài nộp, 12 thông báo.

**Tính năng**

- Đăng nhập bằng email/password, điều hướng theo vai trò, giữ `?next=`.
- _Học sinh_: xem lớp và bài tập, lọc theo trạng thái, nộp bài bằng file hoặc
  đường dẫn, cập nhật bài trước khi được chấm, xem điểm và nhận xét.
- _Giáo viên_: xem lớp phụ trách, tạo bài tập, theo dõi ai đã/chưa nộp, chấm
  điểm và nhận xét, sửa điểm.
- _Phụ huynh_: xem con được liên kết, điểm và nhận xét, thông báo có đánh dấu
  đã đọc.
- Trang thông tin cá nhân dùng chung cho cả ba vai trò.

**Giao diện**

- Mobile-first từ 320px; BottomBar trên mobile, footer chỉ trên desktop.
- Vùng chạm tối thiểu 44px — `TabsList` của shadcn được nâng từ `h-8` lên `h-11`.
- Chỉ dùng design token, không Card lồng Card.
- Toàn bộ ngày giờ theo `Asia/Ho_Chi_Minh`; ô `datetime-local` hiểu là GMT+7.

**Kiểm thử**

- `npm run db:test` — 46 assertion trên PGlite (Postgres WASM), không cần
  Docker, không cần Supabase project, không cần mạng. Kiểm phân quyền, tính
  chạy-lại-được của seed, và FK hint của PostgREST.

### Chưa có trong bản demo

- Trang **Admin** để tạo tài khoản, lớp và liên kết phụ huynh — hiện làm bằng
  SQL trong `supabase/seed.sql`.
- Một lớp có nhiều giáo viên (`../../docs/demo-features.md` ghi rõ để sau).
- Gửi email/SMS/push — thông báo chỉ hiển thị trong hệ thống.
- Đổi mật khẩu, quên mật khẩu.
- Xóa bài nộp (chỉ cập nhật được).
- Phân trang cho danh sách bài tập và thông báo.
