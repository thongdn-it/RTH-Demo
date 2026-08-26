# Cách test demo

Ba mức, từ rẻ tới đắt: [test tự động](#1-test-tự-động) → [kịch bản thủ công](#3-kịch-bản-demo-theo-vai-trò)
→ [thử phá quyền](#4-thử-vượt-quyền).

## 1. Test tự động

```bash
npm run db:test
```

Chạy toàn bộ migrations + `seed.sql` trên [PGlite](https://pglite.dev) (Postgres
biên dịch sang WASM), rồi diễn lại từng quy tắc phân quyền **dưới đúng vai trò**
mà nó áp dụng. Không cần Docker, không cần Supabase project, không cần mạng.

```
PASS — 46 checks passed, 0 failed
```

Nó kiểm ba nhóm việc mà `build`, `lint` và `tsc` đều không nhìn thấy:

| Nhóm | Nội dung |
| --- | --- |
| **Phân quyền** | Mỗi quy tắc trong `demo-features.md`, thử cả chiều được phép lẫn chiều bị cấm. Gồm cả trigger khóa cột và policy trên `storage.objects` |
| **Seed** | Chạy `seed.sql` hai lần để chứng minh nó re-runnable; kiểm không hàng `auth.users` nào còn `NULL` ở cột token |
| **Embed PostgREST** | Suy ra từ `pg_constraint` những cặp bảng có nhiều hơn một đường quan hệ, rồi soát mọi `.select()` trong `src/lib/data/` xem đã ghi rõ FK hint chưa |

`supabase/tests/supabase-stub.sql` đóng vai những phần của Supabase mà migration
cần: schema `auth` và `storage`, hàm `auth.uid()`, ba vai trò
`anon`/`authenticated`/`service_role`.

Trước khi kết thúc một thay đổi, chạy đủ bốn lệnh:

```bash
npm run typecheck && npm run lint && npm run build && npm run db:test
```

## 2. Dữ liệu demo

Mật khẩu chung: **`Demo@1234`**

### Tài khoản

| Vai trò | Email | Ghi chú |
| --- | --- | --- |
| Giáo viên | `teacher.lan@rth.demo` | Phụ trách **6A1** |
| Giáo viên | `teacher.minh@rth.demo` | Phụ trách **6A2** |
| Học sinh | `student.an@rth.demo` | 6A1 — nộp 2, trong đó 1 đã có điểm |
| Học sinh | `student.long@rth.demo` | 6A1 — nộp 1, đã có điểm |
| Học sinh | `student.chi@rth.demo` | 6A1 — nộp 1, chưa chấm |
| Học sinh | `student.dung@rth.demo` | 6A2 — chưa nộp gì |
| Học sinh | `student.ha@rth.demo` | 6A2 — **không có phụ huynh liên kết** |
| Phụ huynh | `parent.hoa@rth.demo` | Mẹ của **An** và **Chi** |
| Phụ huynh | `parent.tuan@rth.demo` | Bố của **Long** |
| Phụ huynh | `parent.mai@rth.demo` | Mẹ của **Dũng** |

### Bài tập

| Lớp | Bài tập | Hạn nộp | Trạng thái |
| --- | --- | --- | --- |
| 6A1 | Tiếng Anh — Unit 4: Writing | **2 ngày trước** | Quá hạn; An 8.5đ, Long 6.0đ |
| 6A1 | Toán — Ôn tập chương II | 3 ngày nữa | An và Chi đã nộp, **chưa chấm** |
| 6A1 | Ngữ văn — Cảm nhận về bài thơ | 8 ngày nữa | Chưa ai nộp |
| 6A2 | Vật lý — Báo cáo thí nghiệm | 5 ngày nữa | Chưa ai nộp |

Dữ liệu được xếp sao cho mỗi trạng thái đều có mặt sẵn: quá hạn, chưa nộp, đã nộp
chưa chấm, đã chấm.

Seed sinh ra **12 thông báo**: 10 `assignment_created` (mỗi bài tập × số phụ
huynh có con trong lớp) và 2 `grade_created`. Riêng Hoa thấy 7 cái.

## 3. Kịch bản demo theo vai trò

### Học sinh — `student.an@rth.demo`

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Đăng nhập | Vào `/student`, tiêu đề "Chào Lê Hoàng An", phụ đề "Lớp 6A1 · Giáo viên Nguyễn Thị Lan" |
| 2 | Xem thẻ thống kê | Bài tập **3** · Đã nộp **2** · Điểm trung bình **8.5** |
| 3 | Mục "Bài tập cần nộp" | Chỉ còn **Ngữ văn** |
| 4 | Vào tab **Bài tập** | Bốn tab lọc; "Đã chấm" có 1, "Đã nộp" có 1, "Chưa nộp" có 1 |
| 5 | Mở **Tiếng Anh — Unit 4** | Badge "Đã chấm" + "Quá hạn"; hiện **8.5 / 10** và nhận xét; **không có** form nộp bài, thay bằng thông báo không sửa được |
| 6 | Mở **Toán — Ôn tập chương II** | Có bài đã nộp, kèm form "Cập nhật bài nộp" |
| 7 | Đổi sang **Tải file lên**, chọn một file | Toast "Đã cập nhật bài nộp"; link cũ được thay bằng tên file |
| 8 | Bấm vào tên file | Mở signed URL (sống 10 phút) |
| 9 | Mở **Ngữ văn**, nộp một đường dẫn | Toast "Đã nộp bài"; trạng thái đổi thành "Đã nộp" |

Ở bước 7, thử chọn file > 10 MB để thấy thông báo "File tối đa 10 MB."

### Giáo viên — `teacher.lan@rth.demo`

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Đăng nhập | Vào `/teacher`, thấy **đúng một** lớp: 6A1, "3 học sinh · 3 bài tập" |
| 2 | Mở **Lớp 6A1** → tab **Học sinh** | An, Long, Chi (sắp theo tiếng Việt). **Không** thấy học sinh 6A2 |
| 3 | Tab **Bài tập** | Toán hiện badge "2 chờ chấm" |
| 4 | Bấm **Tạo bài tập** | Hạn nộp mặc định là 23:59 của 7 ngày sau, ghi rõ "Theo giờ Việt Nam (GMT+7)" |
| 5 | Tạo một bài tập | Toast "Đã tạo bài tập", dialog đóng, danh sách tự cập nhật |
| 6 | Mở **Toán — Ôn tập chương II** | Ba tab: Đã nộp (2) · Chưa nộp (1) · Tất cả |
| 7 | Bấm **Chấm bài** ở bài của An | Nhập điểm `9` và nhận xét → toast "Đã lưu điểm" |
| 8 | Để trống ô điểm rồi lưu | Bị chặn — điểm là bắt buộc khi chấm |
| 9 | Nhập `11` | Bị chặn, "Điểm từ 0 đến 10." |
| 10 | Bấm **Sửa điểm**, đổi thành `9.5` | Lưu được; đây là thao tác sinh thông báo `grade_updated` |

### Phụ huynh — `parent.hoa@rth.demo`

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Đăng nhập | Vào `/parent`, thấy **đúng hai** con: An và Chi. **Không** thấy Long hay Dũng |
| 2 | Xem thẻ của An | Bài tập 3 · Đã nộp 2 · Điểm TB 8.5 (hoặc đã đổi nếu vừa chấm ở kịch bản trên) |
| 3 | Mở **Lê Hoàng An** | Danh sách bài tập kèm điểm và nhận xét ngay trong thẻ |
| 4 | Tab **Thông báo** | Huy hiệu đếm số chưa đọc; danh sách 7 thông báo |
| 5 | Bấm một thông báo | Tự đánh dấu đã đọc **và** chuyển tới trang của con |
| 6 | Bấm **Đánh dấu tất cả đã đọc** | Huy hiệu biến mất |

### Xâu chuỗi ba vai trò

Đây là kịch bản đáng demo nhất, cho thấy thông báo do **database** sinh ra chứ
không phải do frontend:

1. `teacher.lan@rth.demo` → tạo bài tập mới cho 6A1 → đăng xuất.
2. `parent.hoa@rth.demo` → tab Thông báo có **2** mục mới (một cho An, một cho
   Chi), loại "Bài tập mới" → đăng xuất.
3. `student.an@rth.demo` → thấy bài tập mới ở "Bài tập cần nộp", nộp một đường
   dẫn → đăng xuất.
4. `teacher.lan@rth.demo` → mở bài tập đó, chấm điểm → đăng xuất.
5. `parent.hoa@rth.demo` → có thêm thông báo "Đã có điểm", kèm điểm và nhận xét.

## 4. Thử vượt quyền

Phần này chứng minh yêu cầu *"kiểm tra ở server/database, không chỉ filter ở
frontend"*.

### Qua giao diện

| Đang đăng nhập | Mở URL | Kết quả mong đợi |
| --- | --- | --- |
| `student.an` | `/teacher` | Bị đẩy về `/student` |
| `student.an` | `/parent` | Bị đẩy về `/student` |
| `student.an` | `/student/assignments/e0000000-0000-4000-8000-000000000004` (bài của 6A2) | **404** |
| `teacher.minh` | `/teacher/assignments/e0000000-0000-4000-8000-000000000001` (bài của 6A1) | **404** |
| `teacher.minh` | `/teacher/classes/d0000000-0000-4000-8000-000000000001` (lớp 6A1) | **404** |
| `parent.hoa` | `/parent/children/b0000000-0000-4000-8000-000000000002` (Long) | **404** |
| (đăng xuất) | `/student` | Về `/login?next=%2Fstudent` |

404 chứ không phải 403 là cố ý: **id không tồn tại và id không được phép xem là
không phân biệt được**, nên không rò rỉ thông tin.

### Qua API, bỏ qua hẳn giao diện

Lấy token của một học sinh rồi thử đọc dữ liệu của người khác:

```bash
export SUPABASE_URL='https://<project-ref>.supabase.co'
export SUPABASE_KEY='<anon hoặc publishable key>'

LOGIN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_KEY" -H "Content-Type: application/json" \
  -d '{"email":"student.an@rth.demo","password":"Demo@1234"}')

TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
ME=$(echo "$LOGIN" | python3 -c 'import sys,json; print(json.load(sys.stdin)["user"]["id"])')

auth=(-H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN")
```

**Cố đọc tất cả bài nộp** — chỉ ra 2 bài của chính An, không có bài của Long
hay Chi:

```bash
curl -s "$SUPABASE_URL/rest/v1/submissions?select=id,student_id,score" "${auth[@]}"
```

**Cố tự chấm điểm cho mình** — trả về hàng với `score` **vẫn là `null`**. RLS cho
An sửa bài chưa chấm của mình, nhưng `guard_submission_update` ghi đè `score` về
giá trị cũ. Bài đã chấm thì RLS loại hẳn khỏi tập UPDATE:

```bash
curl -s -X PATCH "$SUPABASE_URL/rest/v1/submissions?student_id=eq.$ME" "${auth[@]}" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"score": 10}'
```

**Cố nộp bài hộ bạn cùng lớp** — trả về `42501` (vi phạm RLS):

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/submissions" "${auth[@]}" \
  -H "Content-Type: application/json" \
  -d '{"assignment_id":"e0000000-0000-4000-8000-000000000002",
       "student_id":"b0000000-0000-4000-8000-000000000002",
       "submission_type":"link","external_url":"https://x.test"}'
```

**Cố đọc toàn bộ danh sách người dùng** — chỉ ra 2 hàng: chính An và cô Lan.
Bạn cùng lớp cũng không thấy:

```bash
curl -s "$SUPABASE_URL/rest/v1/users?select=id,name,role" "${auth[@]}"
```

Đổi email ở lệnh đăng nhập thành `teacher.minh@rth.demo` rồi lặp lại: giáo viên
6A2 không đọc được một bài nộp nào của 6A1. Đổi thành `parent.tuan@rth.demo`:
chỉ thấy Long, không thấy An hay Chi.

## 5. Kiểm tra giao diện di động

`../../docs/AI_AGENT_GUIDELINES.md` yêu cầu chạy được từ 320px. Mở DevTools,
lần lượt đặt bề rộng **320 · 360 · 375 · 390 · 430 · 768 · 1024** px và soát:

- [ ] Không có thanh cuộn ngang ở bất kỳ trang nào
- [ ] BottomBar hiện trên mobile, biến mất từ `md`; footer thì ngược lại
- [ ] Nội dung cuối trang không bị BottomBar che
- [ ] Chữ trên tab không bị tràn (chỗ chật sẽ bị cắt bằng `truncate`, không đẩy trang)
- [ ] Mọi nút và mục điều hướng cao tối thiểu 44px
- [ ] Dialog "Tạo bài tập" và "Chấm bài" vừa màn hình, cuộn được bên trong
- [ ] Tên dài (`Phạm Thanh Long`, email) bị cắt gọn chứ không phá bố cục

Trang cần soát kỹ nhất: `/teacher/assignments/[id]` (mỗi dòng có avatar + tên +
nút + bài nộp) và `/student/assignments` (bốn tab trên một hàng).

## 6. Kiểm tra query trên project thật

`npm run db:test` kiểm SQL nhưng **không** kiểm PostgREST — đó chính là kẽ hở đã
để lọt một lỗi `PGRST201`. Sau khi sửa bất kỳ `.select()` nào, chạy lại query đó
trên project thật với token của đúng vai trò:

```bash
curl -s -G "$SUPABASE_URL/rest/v1/class_students" \
  --data-urlencode 'select=classes(id,name,teacher:users!classes_teacher_id_fkey(id,name,email))' \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN"
```

`200` kèm dữ liệu là đạt. `PGRST201` nghĩa là thiếu FK hint — xem
[database.md](database.md#cặp-quan-hệ-mơ-hồ).
