-- InOfOut: Allow members of the same group to see each other's display names
create policy "members read fellow member profiles"
on public.profiles for select
using (
  id = auth.uid() or exists (
    select 1 from public.group_members me
    join public.group_members other on me.group_id = other.group_id
    where me.user_id = auth.uid() and other.user_id = profiles.id
  )
);
