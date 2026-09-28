create policy "owners rename groups"
on public.groups for update
using (public.is_group_owner(id))
with check (public.is_group_owner(id));
