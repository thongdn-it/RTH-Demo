# Tài liệu — RTH Lớp học

Tài liệu triển khai của ứng dụng trong `sources/`.

> **Phân biệt hai thư mục `docs/`:**
>
> - `../../docs/` (gốc repo) là **đặc tả**: `architecture.md`, `schema.ts`,
>   `demo-features.md`, `AI_AGENT_GUIDELINES.md`. Đó là đầu vào, không sửa khi
>   code thay đổi.
> - `sources/docs/` (thư mục này) mô tả **thứ đã được xây**. Khi code đổi thì
>   sửa ở đây.

| Tài liệu | Dùng khi |
| --- | --- |
| [setup.md](setup.md) | Dựng project lần đầu, cấu hình Supabase, gỡ lỗi đăng nhập |
| [architecture.md](architecture.md) | Hiểu các tầng, luồng request, quy ước code |
| [database.md](database.md) | Tra schema, RLS policy, trigger, storage |
| [testing.md](testing.md) | Chạy test tự động, kịch bản demo thủ công theo vai trò |
| [ai-rules.md](ai-rules.md) | Trước khi để AI agent sửa code trong repo này |
| [changelog.md](changelog.md) | Xem đã thay đổi những gì |

## Bắt đầu nhanh

```bash
npm install
cp .env.example .env.local   # điền URL + key của Supabase project
# chạy migrations + seed (xem setup.md)
npm run dev
```

Tài khoản demo dùng chung mật khẩu `Demo@1234` — danh sách đầy đủ ở
[testing.md](testing.md#2-dữ-liệu-demo).
