# Cài đặt

## Yêu cầu

- Node.js 20 trở lên (đã kiểm trên Node 26)
- Một Supabase project — bản free là đủ
- Docker **chỉ cần** nếu muốn dùng Supabase CLI chạy cục bộ (Cách B).
  `npm run db:test` thì không cần Docker.

## 1. Cài dependency và tạo file môi trường

```bash
npm install
cp .env.example .env.local
```

`.env.local` cần hai giá trị:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key hoặc publishable key>
```

Cả hai đều an toàn khi lộ ra trình duyệt — RLS mới là thứ bảo vệ dữ liệu.

App chấp nhận `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` thay cho
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, nên dùng khóa kiểu mới (`sb_publishable_…`) hay
khóa JWT cũ (`eyJ…`) đều được.

Biến môi trường được đọc **lúc gọi** chứ không phải lúc nạp module
(`src/lib/env.ts`), nên thiếu biến sẽ báo lỗi ngay tại request cần nó, kèm thông
điệp chỉ rõ phải làm gì.

## 2. Dựng cơ sở dữ liệu

### Cách A — Supabase Cloud

1. **Project Settings → API**: chép `Project URL` và khóa vào `.env.local`.
2. **SQL Editor**: chạy lần lượt, đúng thứ tự:

   ```
   supabase/migrations/20260826000100_schema.sql
   supabase/migrations/20260826000200_rls.sql
   supabase/migrations/20260826000300_triggers.sql
   supabase/migrations/20260826000400_storage.sql
   supabase/seed.sql
   ```

3. **Authentication → Providers → Email**: bật *Enable email provider*, tắt
   *Confirm email*. (Seed đã đặt sẵn `email_confirmed_at`, tắt cho chắc.)

Muốn tạo lại dữ liệu demo thì chỉ cần chạy lại `seed.sql` — nó tự dọn tài khoản
`@rth.demo` cũ rồi tạo lại, và giữ nguyên mọi chỉnh sửa bạn đã làm trong file.

### Cách B — Supabase CLI (cần Docker)

```bash
npx supabase init      # nếu chưa có supabase/config.toml
npx supabase start
npx supabase db reset  # chạy migrations + seed.sql
```

CLI in ra `API URL` và `anon key` — chép vào `.env.local`.

## 3. Chạy

```bash
npm run dev
```

Mở http://localhost:3000. Chưa đăng nhập sẽ được chuyển tới `/login`, và đường
dẫn đang muốn vào được giữ lại ở `?next=`.

## Các lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Chạy bản đã build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:test` | Kiểm chứng RLS, trigger, embed trên PGlite |

---

## Gỡ lỗi

### Đăng nhập báo lỗi

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `Máy chủ xác thực đang gặp sự cố`, log server có `status: 500` | Gọi thẳng `/auth/v1/token` sẽ thấy `Database error querying schema`. Một hàng `auth.users` còn `NULL` ở `confirmation_token` / `recovery_token` / `email_change` / `email_change_token_new`. GoTrue đọc các cột này vào `string` không nullable của Go nên hỏng | Chạy lại `supabase/seed.sql` — bản hiện tại đã điền `''` cho các cột đó |
| `Tài khoản chưa được cấp quyền` | Có hàng trong `auth.users` nhưng thiếu hàng tương ứng trong `public.users` | Chạy lại `seed.sql` |
| `Email hoặc mật khẩu không đúng` với tài khoản demo | `seed.sql` chưa chạy, hoặc chạy nhầm project khác với `.env.local` | Đối chiếu `<project-ref>` trong URL |
| `Không kết nối được tới máy chủ` | Lỗi mạng thật, hoặc `NEXT_PUBLIC_SUPABASE_URL` sai | Kiểm URL |

Hai thông điệp cuối cùng cố tình phân biệt nhau: `supabase-js` gộp cả socket
chết lẫn HTTP 5xx vào `AuthRetryableFetchError`, nên `signIn` tách chúng ra theo
`error.status` và ghi log chi tiết ra terminal.

### Chẩn đoán bỏ qua ứng dụng

Hỏi thẳng Supabase để biết lỗi nằm ở dữ liệu hay ở schema:

```bash
export SUPABASE_URL='https://<project-ref>.supabase.co'
export SUPABASE_KEY='<anon hoặc publishable key>'

curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_KEY" -H "Content-Type: application/json" \
  -d '{"email":"teacher.lan@rth.demo","password":"Demo@1234"}'
```

| Kết quả | Nghĩa là |
| --- | --- |
| `200` kèm `access_token` | Auth ổn — lỗi nằm ở chỗ khác |
| `400 invalid_credentials` | Không có tài khoản đó, hoặc sai mật khẩu → chạy `seed.sql` |
| `500 Database error querying schema` | Hàng `auth.users` bị hỏng → xem bảng trên |

Kiểm nhanh Auth có sống không:

```bash
curl -s "$SUPABASE_URL/auth/v1/health" -H "apikey: $SUPABASE_KEY"
```

### `PGRST201 — Could not embed because more than one relationship was found`

Thiếu FK hint trong một `.select()`. Thông điệp lỗi có sẵn gợi ý đúng tên cần
dùng. Chạy `npm run db:test` để tìm mọi chỗ còn thiếu — xem
[database.md](database.md#cặp-quan-hệ-mơ-hồ).

### Query trả về `[]` dù dữ liệu có thật

Gần như luôn là RLS làm đúng việc của nó. Policy chỉ cấp cho vai trò
`authenticated`; gọi REST bằng anon/publishable key mà không kèm JWT của người
dùng thì vai trò là `anon` và không thấy gì cả. Đăng nhập lấy `access_token` rồi
gửi kèm `Authorization: Bearer <token>`.
