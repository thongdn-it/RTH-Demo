-- =============================================================================
-- RTH Demo — Column-level guards and in-app notifications
--
-- RLS decides which *rows* you may touch; these triggers decide which *columns*.
-- A student may re-submit but never grade themselves; a teacher may grade but
-- never rewrite the student's work. Both are pinned here rather than trusted to
-- the client.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- submissions: pin the columns each side owns, and stamp the timestamps.
-- -----------------------------------------------------------------------------
create or replace function public.guard_submission_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  -- Identity of a submission is immutable for everyone.
  new.id := old.id;
  new.assignment_id := old.assignment_id;
  new.student_id := old.student_id;
  new.submitted_at := old.submitted_at;

  if v_uid = old.student_id then
    -- Student re-submitting: the grade is not theirs to write.
    new.score := old.score;
    new.feedback := old.feedback;
    new.graded_at := old.graded_at;
    new.graded_by := old.graded_by;
    new.updated_at := now();
  else
    -- Teacher grading: the work itself is not theirs to rewrite.
    new.submission_type := old.submission_type;
    new.storage_path := old.storage_path;
    new.external_url := old.external_url;
    new.updated_at := old.updated_at;

    if new.score is null then
      raise exception 'Cần nhập điểm khi chấm bài.'
        using errcode = 'check_violation';
    end if;

    new.graded_at := now();
    new.graded_by := v_uid;
  end if;

  return new;
end;
$$;

create trigger submissions_guard_update
  before update on public.submissions
  for each row execute function public.guard_submission_update();

-- A student may only ever insert their own, ungraded work; stamp the clock
-- server-side so a forged `submitted_at` cannot beat a deadline.
create or replace function public.stamp_submission_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.submitted_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger submissions_stamp_insert
  before insert on public.submissions
  for each row execute function public.stamp_submission_insert();

-- -----------------------------------------------------------------------------
-- notifications: the recipient may flip `is_read` and nothing else.
-- -----------------------------------------------------------------------------
create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.id := old.id;
  new.recipient_user_id := old.recipient_user_id;
  new.student_id := old.student_id;
  new.assignment_id := old.assignment_id;
  new.submission_id := old.submission_id;
  new.type := old.type;
  new.title := old.title;
  new.message := old.message;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.guard_notification_update();

-- -----------------------------------------------------------------------------
-- Parents are notified when a new assignment lands in their child's class.
-- -----------------------------------------------------------------------------
create or replace function public.notify_assignment_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (
    recipient_user_id, student_id, assignment_id, type, title, message
  )
  select
    ps.parent_id,
    cs.student_id,
    new.id,
    'assignment_created',
    'Bài tập mới: ' || new.title,
    student.name || ' có bài tập mới ở lớp ' || c.name
      || '. Hạn nộp ' || to_char(new.due_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY') || '.'
  from public.class_students cs
  join public.parent_students ps on ps.student_id = cs.student_id
  join public.users student on student.id = cs.student_id
  join public.classes c on c.id = new.class_id
  where cs.class_id = new.class_id;

  return new;
end;
$$;

create trigger assignments_notify_parents
  after insert on public.assignments
  for each row execute function public.notify_assignment_created();

-- -----------------------------------------------------------------------------
-- Parents are notified when their child's work is graded, and again whenever
-- the teacher revises the score or the feedback.
-- -----------------------------------------------------------------------------
create or replace function public.notify_submission_graded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.notification_type;
  v_assignment public.assignments%rowtype;
  v_student public.users%rowtype;
begin
  if new.graded_at is null then
    return new;
  end if;

  -- Only announce a grade that actually moved.
  if old.graded_at is not null
     and new.score is not distinct from old.score
     and new.feedback is not distinct from old.feedback then
    return new;
  end if;

  v_type := case when old.graded_at is null then 'grade_created' else 'grade_updated' end;

  select * into v_assignment from public.assignments where id = new.assignment_id;
  select * into v_student from public.users where id = new.student_id;

  insert into public.notifications (
    recipient_user_id, student_id, submission_id, assignment_id, type, title, message
  )
  select
    ps.parent_id,
    new.student_id,
    new.id,
    new.assignment_id,
    v_type,
    case v_type
      when 'grade_created' then 'Đã có điểm: ' || v_assignment.title
      else 'Cập nhật điểm: ' || v_assignment.title
    end,
    v_student.name || ' được ' || trim(to_char(new.score, 'FM990.99')) || ' điểm'
      || coalesce('. Nhận xét: ' || nullif(btrim(new.feedback), ''), '.')
  from public.parent_students ps
  where ps.student_id = new.student_id;

  return new;
end;
$$;

create trigger submissions_notify_parents
  after update on public.submissions
  for each row execute function public.notify_submission_graded();
