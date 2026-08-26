-- =============================================================================
-- RTH Demo — Seed data
--
-- Accounts are created by an admin, which for this demo means: here. Every
-- account below uses the password  Demo@1234 .
--
--   teacher.lan@rth.demo     Nguyễn Thị Lan     — lớp 6A1
--   teacher.minh@rth.demo    Trần Văn Minh      — lớp 6A2
--   student.an@rth.demo      Lê Hoàng An        — 6A1
--   student.long@rth.demo    Phạm Thanh Long    — 6A1
--   student.chi@rth.demo     Đỗ Ngọc Chi        — 6A1
--   student.dung@rth.demo    Vũ Tiến Dũng       — 6A2
--   student.ha@rth.demo      Ngô Thu Hà         — 6A2
--   parent.hoa@rth.demo      Lê Thị Hoa         — mẹ của An và Chi
--   parent.tuan@rth.demo     Phạm Anh Tuấn      — bố của Long
--   parent.mai@rth.demo      Vũ Thị Mai         — mẹ của Dũng
--
-- Re-runnable: it drops the demo accounts first and everything cascades.
-- =============================================================================

set search_path = public, extensions;

-- `classes.teacher_id` is ON DELETE RESTRICT, so the classes have to go before
-- the teachers who own them. Everything below a class (assignments,
-- submissions, notifications) cascades from here.
delete from public.classes
 where teacher_id in (select id from public.users where email like '%@rth.demo');

delete from auth.users where email like '%@rth.demo';

-- Creates the Supabase Auth user (which owns the encrypted password) plus the
-- matching application profile, and returns the shared id.
create or replace function public.__seed_user(
  p_id uuid,
  p_email text,
  p_username text,
  p_name text,
  p_role public.user_role,
  p_password text default 'Demo@1234'
)
returns uuid
language plpgsql
as $$
begin
  -- The token columns must be '' rather than NULL: GoTrue reads them into
  -- non-nullable Go strings, and a NULL there makes every sign-in fail with
  -- "Database error querying schema" — a 500, not a wrong-password 400.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token,
    reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name, 'role', p_role),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id::text, p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  insert into public.users (id, username, email, name, role)
  values (p_id, p_username, p_email, p_name, p_role);

  return p_id;
end;
$$;

do $$
declare
  t_lan   uuid := 'a0000000-0000-4000-8000-000000000001';
  t_minh  uuid := 'a0000000-0000-4000-8000-000000000002';

  s_an    uuid := 'b0000000-0000-4000-8000-000000000001';
  s_long  uuid := 'b0000000-0000-4000-8000-000000000002';
  s_chi   uuid := 'b0000000-0000-4000-8000-000000000003';
  s_dung  uuid := 'b0000000-0000-4000-8000-000000000004';
  s_ha    uuid := 'b0000000-0000-4000-8000-000000000005';

  p_hoa   uuid := 'c0000000-0000-4000-8000-000000000001';
  p_tuan  uuid := 'c0000000-0000-4000-8000-000000000002';
  p_mai   uuid := 'c0000000-0000-4000-8000-000000000003';

  c_6a1   uuid := 'd0000000-0000-4000-8000-000000000001';
  c_6a2   uuid := 'd0000000-0000-4000-8000-000000000002';

  a_toan  uuid := 'e0000000-0000-4000-8000-000000000001';
  a_van   uuid := 'e0000000-0000-4000-8000-000000000002';
  a_anh   uuid := 'e0000000-0000-4000-8000-000000000003';
  a_ly    uuid := 'e0000000-0000-4000-8000-000000000004';

  sub_an_anh   uuid := 'f0000000-0000-4000-8000-000000000001';
  sub_an_toan  uuid := 'f0000000-0000-4000-8000-000000000002';
  sub_long_anh uuid := 'f0000000-0000-4000-8000-000000000003';
  sub_chi_toan uuid := 'f0000000-0000-4000-8000-000000000004';
begin
  -- Accounts ------------------------------------------------------------------
  perform public.__seed_user(t_lan,  'teacher.lan@rth.demo',   'co.lan',      'Nguyễn Thị Lan',  'teacher');
  perform public.__seed_user(t_minh, 'teacher.minh@rth.demo',  'thay.minh',   'Trần Văn Minh',   'teacher');

  perform public.__seed_user(s_an,   'student.an@rth.demo',    'hoangan',     'Lê Hoàng An',     'student');
  perform public.__seed_user(s_long, 'student.long@rth.demo',  'thanhlong',   'Phạm Thanh Long', 'student');
  perform public.__seed_user(s_chi,  'student.chi@rth.demo',   'ngocchi',     'Đỗ Ngọc Chi',     'student');
  perform public.__seed_user(s_dung, 'student.dung@rth.demo',  'tiendung',    'Vũ Tiến Dũng',    'student');
  perform public.__seed_user(s_ha,   'student.ha@rth.demo',    'thuha',       'Ngô Thu Hà',      'student');

  perform public.__seed_user(p_hoa,  'parent.hoa@rth.demo',    'lethihoa',    'Lê Thị Hoa',      'parent');
  perform public.__seed_user(p_tuan, 'parent.tuan@rth.demo',   'anhtuan',     'Phạm Anh Tuấn',   'parent');
  perform public.__seed_user(p_mai,  'parent.mai@rth.demo',    'vuthimai',    'Vũ Thị Mai',      'parent');

  -- Classes and rosters -------------------------------------------------------
  insert into public.classes (id, name, teacher_id) values
    (c_6a1, 'Lớp 6A1', t_lan),
    (c_6a2, 'Lớp 6A2', t_minh);

  insert into public.class_students (class_id, student_id) values
    (c_6a1, s_an), (c_6a1, s_long), (c_6a1, s_chi),
    (c_6a2, s_dung), (c_6a2, s_ha);

  insert into public.parent_students (parent_id, student_id) values
    (p_hoa, s_an), (p_hoa, s_chi),
    (p_tuan, s_long),
    (p_mai, s_dung);

  -- Assignments (the insert trigger notifies each child's parents) ------------
  insert into public.assignments (id, class_id, title, description, due_at, created_at) values
    (a_anh, c_6a1, 'Tiếng Anh — Unit 4: Writing',
     E'Viết đoạn văn 120–150 từ về chủ đề "My hometown".\nNộp file .docx hoặc .pdf.',
     now() - interval '2 days', now() - interval '9 days'),
    (a_toan, c_6a1, 'Toán — Ôn tập chương II',
     E'Làm bài 1 đến bài 8, trang 47 SGK.\nTrình bày đầy đủ lời giải.',
     now() + interval '3 days', now() - interval '2 days'),
    (a_van, c_6a1, 'Ngữ văn — Cảm nhận về bài thơ',
     'Viết bài cảm nhận về một bài thơ em yêu thích trong chương trình học kỳ này.',
     now() + interval '8 days', now() - interval '1 day'),
    (a_ly, c_6a2, 'Vật lý — Báo cáo thí nghiệm',
     'Nộp báo cáo thí nghiệm đo nhiệt độ sôi của nước.',
     now() + interval '5 days', now() - interval '3 days');

  -- Submissions ---------------------------------------------------------------
  -- `stamp_submission_insert` exists so a client cannot forge `submitted_at`.
  -- Seeding is the one case that legitimately needs to, so it is switched off
  -- for exactly these four rows.
  alter table public.submissions disable trigger submissions_stamp_insert;

  insert into public.submissions
    (id, assignment_id, student_id, submission_type, external_url, submitted_at, updated_at)
  values
    (sub_an_anh,   a_anh,  s_an,   'link', 'https://docs.google.com/document/d/demo-an-unit4',
     now() - interval '3 days', now() - interval '3 days'),
    (sub_long_anh, a_anh,  s_long, 'link', 'https://docs.google.com/document/d/demo-long-unit4',
     now() - interval '3 days', now() - interval '3 days'),
    (sub_an_toan,  a_toan, s_an,   'link', 'https://drive.google.com/file/d/demo-an-toan',
     now() - interval '4 hours', now() - interval '4 hours'),
    (sub_chi_toan, a_toan, s_chi,  'link', 'https://drive.google.com/file/d/demo-chi-toan',
     now() - interval '1 hour', now() - interval '1 hour');

  alter table public.submissions enable trigger submissions_stamp_insert;

  -- Grade two of them *as the teacher*, so the grading trigger fires and the
  -- parents end up with real notifications rather than hand-written rows.
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', t_lan::text, 'role', 'authenticated')::text,
    true
  );

  update public.submissions
     set score = 8.5, feedback = 'Bài viết tốt, chú ý thì của động từ ở đoạn cuối.'
   where id = sub_an_anh;

  update public.submissions
     set score = 6.0, feedback = 'Nội dung còn sơ sài, cần bổ sung ví dụ cụ thể.'
   where id = sub_long_anh;

  perform set_config('request.jwt.claims', '', true);
end;
$$;

drop function public.__seed_user(uuid, text, text, text, public.user_role, text);
