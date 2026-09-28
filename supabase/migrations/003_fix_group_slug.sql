-- Supabase's bundled pgcrypto exposes gen_random_uuid(), not gen_random_bytes().
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
begin
  if current_user_id is null then
    raise exception 'You must be signed in to create a group';
  end if;

  insert into public.profiles (id, display_name)
  values (current_user_id, trim(p_display_name))
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.groups (name, slug, created_by)
  values (
    trim(p_group_name),
    lower(regexp_replace(trim(p_group_name), '[^a-zA-Z0-9]+', '-', 'g'))
      || '-' || substr(gen_random_uuid()::text, 1, 8),
    current_user_id
  )
  returning * into new_group;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, current_user_id, 'owner');

  insert into public.topics (group_id, name, color)
  values (new_group.id, 'Eten', 'coral'), (new_group.id, 'Bouwen', 'purple'), (new_group.id, 'Feest', 'yellow');

  return new_group;
end;
$$;
