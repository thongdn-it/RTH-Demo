-- =============================================================================
-- RTH Demo — grading history
--
-- Every effective grade/re-grade is recorded by a database trigger. The
-- history is append-only from the application's point of view: authenticated
-- users can only read their own entries for assignments in their classes.
-- =============================================================================

create table public.grading_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  teacher_id uuid not null references public.users (id) on delete cascade,

  previous_score numeric(4, 2),
  previous_feedback text,
  score numeric(4, 2) not null,
  feedback text,
  graded_at timestamptz not null default now(),

  constraint grading_history_score_range check (score >= 0 and score <= 10)
);

create index grading_history_teacher_graded_at_idx
  on public.grading_history (teacher_id, graded_at desc);

create index grading_history_assignment_graded_at_idx
  on public.grading_history (assignment_id, graded_at desc);

create trigger grading_history_teacher_must_be_teacher
  before insert or update of teacher_id on public.grading_history
  for each row execute function public.assert_user_role('teacher_id', 'teacher');

alter table public.grading_history enable row level security;

-- Both checks are intentional: a teacher sees only actions they performed,
-- and only while the assignment still belongs to one of their classes.
create policy "teachers read their own grading history"
  on public.grading_history for select to authenticated
  using (
    teacher_id = (select auth.uid())
    and public.teaches_assignment(assignment_id)
  );

-- The trigger below is SECURITY DEFINER, so there is deliberately no INSERT,
-- UPDATE or DELETE policy for authenticated users.

create or replace function public.log_submission_grading()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Re-submitting work or saving an unchanged form is not a grading event.
  if new.score is not distinct from old.score
     and new.feedback is not distinct from old.feedback then
    return new;
  end if;

  -- A valid grading update is stamped by guard_submission_update before this
  -- AFTER trigger runs. Keep this guard for safety if another server-side
  -- writer updates submissions in the future.
  if new.score is null or new.graded_by is null or new.graded_at is null then
    return new;
  end if;

  insert into public.grading_history (
    submission_id,
    assignment_id,
    student_id,
    teacher_id,
    previous_score,
    previous_feedback,
    score,
    feedback,
    graded_at
  ) values (
    new.id,
    new.assignment_id,
    new.student_id,
    new.graded_by,
    old.score,
    old.feedback,
    new.score,
    new.feedback,
    new.graded_at
  );

  return new;
end;
$$;

create trigger submissions_log_grading
  after update on public.submissions
  for each row execute function public.log_submission_grading();
