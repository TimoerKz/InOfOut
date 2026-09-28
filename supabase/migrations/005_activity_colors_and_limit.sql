alter table public.activities
  add column if not exists color text not null default 'coral'
  check (color in ('coral', 'purple', 'yellow', 'green', 'blue', 'pink', 'orange'));

create or replace function public.limit_group_activities()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.activities where group_id = new.group_id) >= 7 then
    raise exception 'Een groep kan maximaal 7 activiteiten hebben';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_group_activity_limit on public.activities;
create trigger enforce_group_activity_limit
before insert on public.activities
for each row execute function public.limit_group_activities();
