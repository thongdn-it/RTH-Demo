# Quy tắc cho AI agent

Tài liệu này áp dụng `../../docs/AI_AGENT_GUIDELINES.md` vào codebase cụ thể
này. Khi hai bên mâu thuẫn, file gốc thắng.

---

## 0. Đọc trước khi sửa

| Sắp làm gì | Đọc trước |
| --- | --- |
| Bất cứ thứ gì | [architecture.md](architecture.md) |
| Đổi schema, policy, trigger | [database.md](database.md) |
| Đổi query trong `src/lib/data/` | [database.md — cặp quan hệ mơ hồ](database.md#cặp-quan-hệ-mơ-hồ) |
| Đổi giao diện | Mục [2](#2-giao-diện) và [3](#3-chống-ai-slop) bên dưới |

Next.js 16 có nhiều thay đổi phá vỡ tương thích so với dữ liệu huấn luyện. Tài
liệu chính thức nằm ngay trong `node_modules/next/dist/docs/` — đọc ở đó, đừng
viết theo trí nhớ. Ba điểm hay sai nhất:

- Middleware **đã đổi tên thành Proxy** — file là `src/proxy.ts`, export hàm `proxy`.
- `params` và `searchParams` là **Promise**, phải `await`.
- `cookies()` là **async**.

## 1. Tái sử dụng thành phần

> `Reuse > Extend > Compose > Create New`

- Primitive của shadcn/ui nằm ở `src/components/ui/`. **Không** tạo
  `CustomButton.tsx`, `MyCard.tsx`.
- Cần biến thể mới thì thêm variant vào chính file trong `ui/`, hoặc truyền
  `className` qua `cn()`.
- Sửa `ui/` khi cần áp một quyết định cho toàn ứng dụng. Đã làm một lần:
  `TabsList` từ `h-8` lên `h-11` để đạt vùng chạm 44px.
- Component dùng chung không phải primitive thì để ở `src/components/shared/`
  (`PageHeader`, `EmptyState`, `StatusBadge`).
- `npx shadcn@latest add <tên>` để thêm primitive mới. Primitive không dùng đến
  thì gỡ đi.

## 2. Giao diện

Mobile-first, bắt buộc chạy được từ **320px**.

| Quy tắc | Cụ thể ở repo này |
| --- | --- |
| Vùng chạm ≥ 44×44px | Dùng `h-11` / `min-h-11`. `size="sm"` của Button chỉ cao 32px — **không** dùng cho hành động chính |
| Không cuộn ngang | Không hardcode `w-[600px]`. Dùng `w-full max-w-md`. Chữ dài trong lưới chật thì bọc `<span className="truncate">` |
| Chừa chỗ cho BottomBar | Nội dung có `pb-24 md:pb-12` (đã đặt sẵn ở `AppShell`) |
| Footer chỉ trên desktop | `hidden md:block` |
| Dialog | `max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto sm:w-full` |

Sau khi sửa giao diện, tự soát ở 320px và 390px trước khi báo xong.

## 3. Chống "AI slop"

Không dùng: gradient tím-xanh neon, gradient text, glassmorphism phát sáng, Card
lồng Card, font lẫn lộn, mã màu hardcode (`text-[#123456]`), ngôn từ marketing
("supercharge", "empower").

Dùng design token: `text-foreground`, `text-muted-foreground`, `bg-background`,
`bg-card`, `border-border`, `bg-primary`.

Danh sách thì dùng `<section>` + heading + `<ul>` các Card ngang hàng, **không**
bọc thêm một Card bên ngoài.

## 4. Quy tắc riêng của codebase

### Phân quyền

- **Mọi Server Action mở đầu bằng `requireRole(...)` hoặc `requireUser()`.**
  Action gọi được bằng POST trực tiếp, không chỉ qua UI.
- **Mọi page mở đầu bằng `requireRole(...)`.** Layout không phải ranh giới bảo
  mật — điều hướng phía client vào route con sẽ không chạy lại layout.
- Thêm bảng mới thì phải: bật RLS, viết policy, **và** thêm assertion vào
  `supabase/tests/policies.test.mjs`. Không policy = không quyền, nên quên bật
  RLS là lỗ hổng im lặng.
- Không bao giờ dùng service-role key trong code ứng dụng.
- Không nới lỏng policy để "cho chạy được". Nếu query trả `[]`, gần như luôn là
  RLS đang làm đúng việc — sửa query, đừng sửa policy.

### Truy vấn dữ liệu

- Mọi file trong `src/lib/data/` mở đầu bằng `import "server-only"`.
- **Nhúng bảng mơ hồ thì phải ghi rõ FK hint**:
  `users!classes_teacher_id_fkey(...)`. Thiếu là lỗi `PGRST201` chỉ hiện lúc
  chạy — `tsc` và `eslint` không thấy. `npm run db:test` bắt được.
- Đổi schema thì phải cập nhật `src/lib/database.types.ts`, gồm cả mảng
  `Relationships` — supabase-js dựa vào đó để suy kiểu cho embed.

### Server Action

Giữ đúng khuôn: `requireRole` → Zod `safeParse` → thao tác DB → `revalidatePath`
→ `success()`. Thông điệp lỗi viết tiếng Việt, nói cho người dùng biết phải làm
gì, không lộ chi tiết nội bộ.

### React / Next

- **Không gọi `Date.now()` trong thân component** — quy tắc `react-hooks/purity`
  sẽ chặn. Dùng `await requestTime()` từ `src/lib/now.ts`.
- Mặc định là Server Component. Chỉ `"use client"` khi cần state, effect hay
  event handler.
- Ngày giờ luôn đi qua `src/lib/format.ts` để giữ đúng `Asia/Ho_Chi_Minh`.

### SQL

- Migration là **append-only**: thêm file mới, không sửa file đã chạy trên
  project thật.
- Hàm helper cho RLS phải `STABLE SECURITY DEFINER SET search_path = ''`, và tên
  phải ghi đầy đủ schema.
- Trong policy cũng ghi đầy đủ `public.` trước tên hàm.
- `seed.sql` phải giữ được tính chạy-lại-được. Có test kiểm điều này.

## 5. Quy trình

1. **Inspect** — đọc file liên quan trước khi sửa. Không đoán.
2. **Implement** — sửa đúng chỗ cần sửa.
3. **Verify** — chạy đủ bốn lệnh:

   ```bash
   npm run typecheck && npm run lint && npm run build && npm run db:test
   ```

4. **Self-review** — soát giao diện ở 320–390px; nếu đụng phân quyền thì chạy
   thêm kịch bản ở [testing.md](testing.md#4-thử-vượt-quyền).

### Điều bốn lệnh trên *không* bắt được

Biết giới hạn của mình quan trọng ngang việc chạy test:

| Không bắt được | Cách kiểm |
| --- | --- |
| Query PostgREST sai lúc chạy | Gọi thẳng REST bằng token thật — [testing.md §6](testing.md#6-kiểm-tra-query-trên-project-thật) |
| Hành vi của Supabase Auth | `curl` vào `/auth/v1/token` — [setup.md](setup.md#chẩn-đoán-bỏ-qua-ứng-dụng) |
| Bố cục vỡ trên di động | Mở DevTools và tự nhìn |
| Migration chạy trên Supabase thật | Chỉ có PGlite; khác biệt schema `auth`/`storage` vẫn có thể tồn tại |

Khi báo cáo, nói rõ thứ gì đã **chạy thật** và thứ gì mới chỉ **đọc qua**.

## 6. Checklist trước khi kết thúc

- [ ] `npm run typecheck` sạch
- [ ] `npm run lint` sạch
- [ ] `npm run build` thành công
- [ ] `npm run db:test` — 0 failed
- [ ] Đụng schema → đã cập nhật `database.types.ts` **và** thêm test
- [ ] Đụng giao diện → đã soát ở 320px
- [ ] Đụng phân quyền → đã thử cả chiều bị cấm, không chỉ chiều được phép
- [ ] Đụng hành vi → đã cập nhật [changelog.md](changelog.md) và doc liên quan
