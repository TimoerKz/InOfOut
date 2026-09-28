-- InOfOut: Group sharing and join flow
-- Allows invited users to preview a group and join with their chosen display name

-- 1. Preview group details without needing prior membership
create or replace function public.get_group_preview(
  p_slug_or_id text
)
returns table (id uuid, name text, slug text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return query select g.id, g.name, g.slug from public.groups g where g.id = p_slug_or_id::uuid;
  else
    return query select g.id, g.name, g.slug from public.groups g where g.slug = p_slug_or_id;
  end if;
end;
$$;

grant execute on function public.get_group_preview(text) to anon, authenticated;

-- 2. Join a group by slug or id with a display name
create or replace function public.join_group(
  p_slug_or_id text,
  p_display_name text
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_group public.groups;
begin
  if current_user_id is null then
    raise exception 'Je moet ingelogd zijn om lid te worden';
  end if;

  if char_length(trim(p_display_name)) not between 1 and 60 then
    raise exception 'Naam moet tussen 1 en 60 tekens bevatten';
  end if;

  if p_slug_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into target_group from public.groups where id = p_slug_or_id::uuid;
  else
    select * into target_group from public.groups where slug = p_slug_or_id;
  end if;

  if target_group.id is null then
    raise exception 'Groep niet gevonden';
  end if;

  insert into public.profiles (id, display_name)
  values (current_user_id, trim(p_display_name))
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.group_members (group_id, user_id, role)
  values (target_group.id, current_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return target_group;
end;
$$;

grant execute on function public.join_group(text, text) to authenticated;
