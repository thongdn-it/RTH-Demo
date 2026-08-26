-- =============================================================================
-- RTH Demo — Authorization
--
-- Every rule from docs/demo-features.md is enforced here, in the database, so
-- it holds no matter which client (app, REST, SQL) issues the query. The app
-- layer re-checks the same rules, but this is the boundary that actually binds.
--
-- The helpers are SECURITY DEFINER so that a policy on `users` may consult
-- `class_students` (and vice versa) without RLS recursing into itself.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select u.role from public.users u where u.id = (select auth.uid());
$$;

-- Teacher of this class?
create or replace function public.teaches_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = (select auth.uid())
  );
$$;

-- Teacher of the class this assignment belongs to?
create or replace function public.teaches_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = p_assignment_id and c.teacher_id = (select auth.uid())
  );
$$;

-- Teacher of a class this student is enrolled in?
create or replace function public.teaches_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_students cs
    join public.classes c on c.id = cs.class_id
    where cs.student_id = p_student_id and c.teacher_id = (select auth.uid())
  );
$$;

-- Parent linked to this student?
create or replace function public.is_parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.parent_students ps
    where ps.student_id = p_student_id and ps.parent_id = (select auth.uid())
  );
$$;

-- Student enrolled in this class?
create or replace function public.studies_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_students cs
    where cs.class_id = p_class_id and cs.student_id = (select auth.uid())
  );
$$;

-- Parent of a student enrolled in this class?
create or replace function public.has_child_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_students cs
    join public.parent_students ps on ps.student_id = cs.student_id
    where cs.class_id = p_class_id and ps.parent_id = (select auth.uid())
  );
$$;

-- The union: teacher of / student in / parent of someone in this class.
create or replace function public.can_view_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.teaches_class(p_class_id)
      or public.studies_in_class(p_class_id)
      or public.has_child_in_class(p_class_id);
$$;

create or replace function public.can_view_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and public.can_view_class(a.class_id)
  );
$$;

-- Is this user the teacher of a class I attend, or that my child attends?
create or replace function public.is_teacher_of_my_class(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    where c.teacher_id = p_user_id
      and (public.studies_in_class(c.id) or public.has_child_in_class(c.id))
  );
$$;

grant execute on function
  public.current_app_role(),
  public.teaches_class(uuid),
  public.teaches_assignment(uuid),
  public.teaches_student(uuid),
  public.is_parent_of(uuid),
  public.studies_in_class(uuid),
  public.has_child_in_class(uuid),
  public.can_view_class(uuid),
  public.can_view_assignment(uuid),
  public.is_teacher_of_my_class(uuid)
to authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere. No policy => no access.
-- -----------------------------------------------------------------------------
alter table public.users            enable row level security;
alter table public.classes          enable row level security;
alter table public.class_students   enable row level security;
alter table public.parent_students  enable row level security;
alter table public.assignments      enable row level security;
alter table public.submissions      enable row level security;
alter table public.notifications    enable row level security;

-- -----------------------------------------------------------------------------
-- users — read-only. Accounts are provisioned by an admin, not by the app.
-- -----------------------------------------------------------------------------
create policy "users are visible to themselves and to their circle"
  on public.users for select to authenticated
  using (
    id = (select auth.uid())
    or public.teaches_student(id)       -- teacher -> their students
    or public.is_parent_of(id)          -- parent  -> their children
    or public.is_teacher_of_my_class(id) -- student/parent -> their teacher
  );

-- -----------------------------------------------------------------------------
-- classes — read-only for every role.
-- -----------------------------------------------------------------------------
create policy "classes are visible to their teacher, students and parents"
  on public.classes for select to authenticated
  using (public.can_view_class(id));

-- -----------------------------------------------------------------------------
-- class_students / parent_students — read-only links.
-- -----------------------------------------------------------------------------
create policy "roster is visible to the class teacher, the student and parents"
  on public.class_students for select to authenticated
  using (
    student_id = (select auth.uid())
    or public.teaches_class(class_id)
    or public.is_parent_of(student_id)
  );

create policy "parent links are visible to both sides and the teacher"
  on public.parent_students for select to authenticated
  using (
    parent_id = (select auth.uid())
    or student_id = (select auth.uid())
    or public.teaches_student(student_id)
  );

-- -----------------------------------------------------------------------------
-- assignments — teacher writes, class reads.
-- -----------------------------------------------------------------------------
create policy "assignments are visible to the class"
  on public.assignments for select to authenticated
  using (public.can_view_class(class_id));

create policy "teachers create assignments in their own classes"
  on public.assignments for insert to authenticated
  with check (public.teaches_class(class_id));

create policy "teachers edit assignments in their own classes"
  on public.assignments for update to authenticated
  using (public.teaches_class(class_id))
  with check (public.teaches_class(class_id));

create policy "teachers delete assignments in their own classes"
  on public.assignments for delete to authenticated
  using (public.teaches_class(class_id));

-- -----------------------------------------------------------------------------
-- submissions
--   student : own row only, and only while ungraded
--   teacher : rows of assignments in their own classes (grading)
--   parent  : read-only, own children
-- Which *columns* each side may touch is pinned by the trigger in
-- 20260826000300_triggers.sql — policies alone cannot express that.
-- -----------------------------------------------------------------------------
create policy "submissions are visible to the student, teacher and parents"
  on public.submissions for select to authenticated
  using (
    student_id = (select auth.uid())
    or public.teaches_assignment(assignment_id)
    or public.is_parent_of(student_id)
  );

create policy "students submit their own work"
  on public.submissions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and score is null
    and feedback is null
    and graded_at is null
    and graded_by is null
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.studies_in_class(a.class_id)
    )
  );

create policy "students update their own work before it is graded"
  on public.submissions for update to authenticated
  using (student_id = (select auth.uid()) and graded_at is null)
  with check (student_id = (select auth.uid()) and graded_at is null);

create policy "teachers grade submissions in their own classes"
  on public.submissions for update to authenticated
  using (public.teaches_assignment(assignment_id))
  with check (public.teaches_assignment(assignment_id));

-- -----------------------------------------------------------------------------
-- notifications — recipient reads and marks read. Rows are written by the
-- SECURITY DEFINER triggers only, so there is no insert policy.
-- -----------------------------------------------------------------------------
create policy "recipients read their own notifications"
  on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));

create policy "recipients mark their own notifications read"
  on public.notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));
