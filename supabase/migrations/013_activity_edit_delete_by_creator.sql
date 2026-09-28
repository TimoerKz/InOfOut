-- InOfOut: activity creators may edit or delete their own activity and its date options.
drop policy if exists "owners delete activities" on public.activities;
create policy "creators and owners delete activities"
on public.activities for delete
using (public.is_group_owner(group_id) or created_by = auth.uid());

drop policy if exists "owners update options" on public.activity_options;
create policy "creators and owners update options"
on public.activity_options for update
using (exists (
  select 1 from public.activities
  where id = activity_id and (public.is_group_owner(group_id) or created_by = auth.uid())
))
with check (exists (
  select 1 from public.activities
  where id = activity_id and (public.is_group_owner(group_id) or created_by = auth.uid())
));

drop policy if exists "owners delete options" on public.activity_options;
create policy "creators and owners delete options"
on public.activity_options for delete
using (exists (
  select 1 from public.activities
  where id = activity_id and (public.is_group_owner(group_id) or created_by = auth.uid())
));
