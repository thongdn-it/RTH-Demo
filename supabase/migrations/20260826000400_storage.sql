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

create policy "students upload into their own submission folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and public.current_app_role() = 'student'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.can_view_assignment(public.safe_uuid((storage.foldername(name))[1]))
  );

create policy "students replace files in their own submission folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "students delete files in their own submission folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

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
