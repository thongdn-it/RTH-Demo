-- =============================================================================
-- RTH Demo — Core schema
-- Mirrors docs/schema.ts. Passwords live in `auth.users.encrypted_password`
-- (managed by Supabase Auth); `public.users` holds the application profile.
-- =============================================================================

create type public.user_role as enum ('student', 'teacher', 'parent');
create type public.submission_type as enum ('file', 'link');
create type public.notification_type as enum (
  'assignment_created',
  'grade_created',
  'grade_updated'
);

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  email text not null unique,
  name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

comment on table public.users is
  'Application profile for an auth.users row. Accounts are created by an admin.';

-- A single-column FK cannot say "and this user must be a teacher", and a CHECK
-- constraint may not read another table. This does, and runs on every write.
create or replace function public.assert_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_column   text := tg_argv[0];
  v_expected public.user_role := tg_argv[1]::public.user_role;
  v_id       uuid;
  v_actual   public.user_role;
begin
  execute format('select ($1).%I', v_column) into v_id using new;

  if v_id is null then
    return new;
  end if;

  select role into v_actual from public.users where id = v_id;

  if v_actual is distinct from v_expected then
    raise exception '%.% phải trỏ tới người dùng có vai trò "%"',
      tg_table_name, v_column, v_expected
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- classes — one teacher per class (multi-teacher is a later feature)
-- -----------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index classes_teacher_id_idx on public.classes (teacher_id);

create trigger classes_teacher_must_be_teacher
  before insert or update of teacher_id on public.classes
  for each row execute function public.assert_user_role('teacher_id', 'teacher');

-- -----------------------------------------------------------------------------
-- class_students — a class has many students, a student belongs to one class
-- -----------------------------------------------------------------------------
create table public.class_students (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  primary key (class_id, student_id)
);

-- "Một Student thuộc một Class."
create unique index class_students_one_class_per_student
  on public.class_students (student_id);

create trigger class_students_student_must_be_student
  before insert or update of student_id on public.class_students
  for each row execute function public.assert_user_role('student_id', 'student');

-- -----------------------------------------------------------------------------
-- parent_students
-- -----------------------------------------------------------------------------
create table public.parent_students (
  parent_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  primary key (parent_id, student_id)
);

create index parent_students_student_id_idx on public.parent_students (student_id);

create trigger parent_students_parent_must_be_parent
  before insert or update of parent_id on public.parent_students
  for each row execute function public.assert_user_role('parent_id', 'parent');

create trigger parent_students_student_must_be_student
  before insert or update of student_id on public.parent_students
  for each row execute function public.assert_user_role('student_id', 'student');

-- -----------------------------------------------------------------------------
-- assignments
-- -----------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint assignments_title_not_blank check (length(btrim(title)) > 0)
);

create index assignments_class_id_due_at_idx
  on public.assignments (class_id, due_at desc);

-- -----------------------------------------------------------------------------
-- submissions — at most one per (assignment, student)
-- -----------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,

  submission_type public.submission_type not null,
  storage_path text,
  external_url text,

  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  score numeric(4, 2),
  feedback text,
  graded_at timestamptz,
  graded_by uuid references public.users (id) on delete set null,

  unique (assignment_id, student_id),
  constraint submissions_payload_check check (
    (submission_type = 'file' and storage_path is not null and external_url is null)
    or
    (submission_type = 'link' and external_url is not null and storage_path is null)
  ),
  constraint submissions_score_range check (score is null or (score >= 0 and score <= 10)),
  constraint submissions_graded_consistency check (
    (graded_at is null and graded_by is null and score is null)
    or
    (graded_at is not null and graded_by is not null and score is not null)
  )
);

create index submissions_assignment_id_idx on public.submissions (assignment_id);
create index submissions_student_id_idx on public.submissions (student_id);

create trigger submissions_student_must_be_student
  before insert or update of student_id on public.submissions
  for each row execute function public.assert_user_role('student_id', 'student');

create trigger submissions_grader_must_be_teacher
  before insert or update of graded_by on public.submissions
  for each row execute function public.assert_user_role('graded_by', 'teacher');

-- -----------------------------------------------------------------------------
-- notifications — in-app only, no email/SMS/push in the demo
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  recipient_user_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete cascade,
  submission_id uuid references public.submissions (id) on delete cascade,

  type public.notification_type not null,
  title text not null,
  message text not null,

  is_read boolean not null default false,
  created_at timestamptz not null default now(),

  constraint notifications_target_check check (
    (type = 'assignment_created' and assignment_id is not null and submission_id is null)
    or
    (type in ('grade_created', 'grade_updated') and submission_id is not null)
  )
);

create index notifications_recipient_idx
  on public.notifications (recipient_user_id, is_read, created_at desc);
