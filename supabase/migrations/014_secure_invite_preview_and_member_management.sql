-- InOfOut: safe invite previews and owner member removal.
create or replace function public.get_group_invite_preview(p_token uuid)
returns table (id uuid, name text)
language sql security definer set search_path = public as $$
  select g.id, g.name
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  where i.token = p_token
    and i.revoked_at is null
    and (i.expires_at is null or i.expires_at > now());
$$;
grant execute on function public.get_group_invite_preview(uuid) to authenticated;

create policy "owners remove group members"
on public.group_members for delete
using (public.is_group_owner(group_id) and user_id <> auth.uid());
