-- =============================================================================
-- RTH Demo — Storage for file submissions
--
-- Private bucket. Object keys are `{assignment_id}/{student_id}/{filename}`,
-- so the path itself carries the facts the policies need to authorize against.
-- Files are served through short-lived signed URLs.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('submissions', 'submissions', false, 10485760) -- 10 MB
on conflict (id) do nothing;

-- A path segment is user-controlled text; never let a malformed one raise.
create or replace function public.safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_value::uuid;
exception
  when others then return null;
end;
$$;

grant execute on function public.safe_uuid(text) to authenticated;

create or replace function public.can_mutate_submission_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with parts as (
    select
      public.safe_uuid((storage.foldername(p_name))[1]) as assignment_id,
      public.safe_uuid((storage.foldername(p_name))[2]) as student_id
  )
  select exists (
    select 1
    from parts p
    where p.student_id = (select auth.uid())
      and not exists (
        select 1
        from public.submissions s
        where s.storage_path = p_name
          and s.assignment_id = p.assignment_id
          and s.student_id = p.student_id
          and s.graded_at is not null
      )
  );
$$;

grant execute on function public.can_mutate_submission_object(text) to authenticated;

drop policy if exists "students upload into their own submission folder" on storage.objects;
create policy "students upload into their own submission folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and array_length(storage.foldername(name), 1) = 2
    and public.current_app_role() = 'student'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.can_view_assignment(public.safe_uuid((storage.foldername(name))[1]))
  );

drop policy if exists "students replace files in their own submission folder" on storage.objects;
create policy "students replace files in their own submission folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'submissions'
    and array_length(storage.foldername(name), 1) = 2
    and public.current_app_role() = 'student'
    and public.can_mutate_submission_object(name)
  )
  with check (
    bucket_id = 'submissions'
    and array_length(storage.foldername(name), 1) = 2
    and public.current_app_role() = 'student'
    and public.can_mutate_submission_object(name)
  );

drop policy if exists "students delete files in their own submission folder" on storage.objects;
create policy "students delete files in their own submission folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'submissions'
    and array_length(storage.foldername(name), 1) = 2
    and public.current_app_role() = 'student'
    and public.can_mutate_submission_object(name)
  );

drop policy if exists "submission files are readable by the student, teacher and parents" on storage.objects;
create policy "submission files are readable by the student, teacher and parents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or public.teaches_assignment(public.safe_uuid((storage.foldername(name))[1]))
      or public.is_parent_of(public.safe_uuid((storage.foldername(name))[2]))
    )
  );
