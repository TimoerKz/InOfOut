create table public.location_suggestions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  created_at timestamptz not null default now()
);

alter table public.location_suggestions enable row level security;
create policy "members read location suggestions" on public.location_suggestions for select using (
  exists (select 1 from public.activities where id = activity_id and public.is_group_member(group_id))
);
create policy "members suggest locations" on public.location_suggestions for insert with check (
  user_id = auth.uid() and exists (select 1 from public.activities where id = activity_id and public.is_group_member(group_id))
);
