-- Creates a profile, group, owner membership, and default topics for the signed-in user.
-- This function is deliberately the only route that lets a new user create a group.
create or replace function public.create_group(
  p_group_name text,
  p_display_name text
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_group public.groups;
  new_slug text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to create a group';
  end if;

  if char_length(trim(p_group_name)) not between 1 and 80 then
    raise exception 'Group name must contain between 1 and 80 characters';
  end if;

  if char_length(trim(p_display_name)) not between 1 and 60 then
    raise exception 'Display name must contain between 1 and 60 characters';
  end if;

  insert into public.profiles (id, display_name)
  values (current_user_id, trim(p_display_name))
  on conflict (id) do update set display_name = excluded.display_name;

  new_slug := lower(regexp_replace(trim(p_group_name), '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || encode(gen_random_bytes(4), 'hex');

  insert into public.groups (name, slug, created_by)
  values (trim(p_group_name), new_slug, current_user_id)
  returning * into new_group;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, current_user_id, 'owner');

  insert into public.topics (group_id, name, color)
  values
    (new_group.id, 'Eten', 'coral'),
    (new_group.id, 'Bouwen', 'purple'),
    (new_group.id, 'Feest', 'yellow');

  return new_group;
end;
$$;

grant execute on function public.create_group(text, text) to authenticated;
