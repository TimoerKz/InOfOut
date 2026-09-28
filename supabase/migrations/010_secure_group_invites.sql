-- Private, revocable invitation links.
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.group_invites enable row level security;
create policy "owners manage invites" on public.group_invites for all using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));

create or replace function public.join_group_with_invite(p_token uuid, p_display_name text)
returns public.groups language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); i public.group_invites; g public.groups;
begin
 if u is null then raise exception 'Aanmelden is vereist'; end if;
 select * into i from public.group_invites where token=p_token and revoked_at is null and (expires_at is null or expires_at>now());
 if i.id is null then raise exception 'Deze uitnodiging is niet meer geldig'; end if;
 select * into g from public.groups where id=i.group_id;
 insert into public.profiles(id,display_name) values(u,trim(p_display_name)) on conflict(id) do update set display_name=excluded.display_name;
 insert into public.group_members(group_id,user_id,role) values(g.id,u,'member') on conflict(group_id,user_id) do nothing;
 return g;
end $$;
grant execute on function public.join_group_with_invite(uuid,text) to authenticated;
