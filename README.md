# RTH Lớp học — demo

Ứng dụng quản lý lớp học, bài tập và điểm số cho ba vai trò: **học sinh**,
**giáo viên**, **phụ huynh**.

Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Supabase (Auth + Postgres/RLS + Storage).

Xây theo đặc tả ở `../docs/`: `architecture.md`, `schema.ts`, `demo-features.md`,
`AI_AGENT_GUIDELINES.md`.

## Nguyên tắc chi phối

`demo-features.md` yêu cầu:

> Các quyền trên phải được kiểm tra ở server/database, không chỉ filter ở frontend.

Nên mọi quy tắc phân quyền nằm ở tầng thấp nhất có thể diễn đạt được nó — RLS
quyết định **hàng** nào được đọc/ghi, trigger quyết định **cột** nào mỗi bên được
ghi. Học sinh không thể tự chấm điểm, giáo viên không thể sửa bài làm của học
sinh, và cả hai điều đó đúng kể cả khi gọi thẳng API, không qua giao diện.

`npm run db:test` kiểm chứng lại toàn bộ: 46 assertion chạy trên Postgres biên
dịch sang WASM, không cần Docker.

## Bắt đầu

```bash
npm install
cp .env.example .env.local     # điền URL + key của Supabase project
# chạy migrations + seed — xem docs/setup.md
npm run dev
```

Mở http://localhost:3000. Đăng nhập bằng `teacher.lan@rth.demo` /
`student.an@rth.demo` / `parent.hoa@rth.demo`, mật khẩu chung `Demo@1234`.

Hướng dẫn đầy đủ: **[docs/setup.md](docs/setup.md)**.

## Tài liệu

| Tài liệu | Dùng khi |
| --- | --- |
| [docs/setup.md](docs/setup.md) | Dựng project, cấu hình Supabase, gỡ lỗi đăng nhập |
| [docs/architecture.md](docs/architecture.md) | Các tầng, luồng request, quy ước code |
| [docs/database.md](docs/database.md) | Schema, RLS policy, trigger, storage |
| [docs/testing.md](docs/testing.md) | Test tự động và kịch bản demo theo vai trò |
| [docs/ai-rules.md](docs/ai-rules.md) | Trước khi để AI agent sửa code |
| [docs/changelog.md](docs/changelog.md) | Đã thay đổi những gì |

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:test` | Kiểm chứng RLS, trigger, embed trên PGlite |

## Cấu trúc

```
src/
├── proxy.ts        Làm mới phiên, redirect sớm (KHÔNG phải lớp bảo mật)
├── app/            login/ và (app)/{student,teacher,parent,profile}
├── components/     ui/ (shadcn) · layout/ · assignments/ · teacher/ · parent/ · shared/
└── lib/            supabase/ · auth.ts · data/ · actions/ · database.types.ts

supabase/
├── migrations/     schema → rls → triggers → storage
├── seed.sql        Tài khoản và dữ liệu demo (chạy lại được)
└── tests/          Bộ test chạy trên PGlite

docs/               Tài liệu triển khai
```

Chi tiết ở [docs/architecture.md](docs/architecture.md#cấu-trúc-thư-mục).
