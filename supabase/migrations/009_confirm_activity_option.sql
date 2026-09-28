-- InOfOut: Allow activity creators and group owners to confirm a date option
drop policy if exists "owners update activities" on public.activities;

create policy "creators and owners update activities"
on public.activities for update
using (public.is_group_owner(group_id) or created_by = auth.uid())
with check (public.is_group_owner(group_id) or created_by = auth.uid());
