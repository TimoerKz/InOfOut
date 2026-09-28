-- InOfOut: groups, activities, time options, and attendance votes.
create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'member');
create type public.vote_status as enum ('in', 'out');
create type public.activity_status as enum ('open', 'confirmed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  timezone text not null default 'Europe/Amsterdam',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null check (color in ('coral', 'purple', 'yellow', 'green', 'blue')),
  unique (group_id, name)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  location text,
  status public.activity_status not null default 'open',
  selected_option_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.activity_options (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

alter table public.activities
  add constraint activities_selected_option_fk
  foreign key (selected_option_id) references public.activity_options(id) on delete set null;

create table public.votes (
  option_id uuid not null references public.activity_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.vote_status not null,
  updated_at timestamptz not null default now(),
  primary key (option_id, user_id)
);

create index activity_options_starts_at_idx on public.activity_options (starts_at);
create index activities_group_id_idx on public.activities (group_id);
create index group_members_user_id_idx on public.group_members (user_id);

-- A member may access data only in their own groups.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = target_group_id and user_id = auth.uid());
$$;

create or replace function public.is_group_owner(target_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = target_group_id and user_id = auth.uid() and role = 'owner');
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.topics enable row level security;
alter table public.activities enable row level security;
alter table public.activity_options enable row level security;
alter table public.votes enable row level security;

create policy "users read their profile" on public.profiles for select using (id = auth.uid());
create policy "users create their profile" on public.profiles for insert with check (id = auth.uid());
create policy "users update their profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members read groups" on public.groups for select using (public.is_group_member(id));
create policy "members read group members" on public.group_members for select using (public.is_group_member(group_id));
create policy "members read topics" on public.topics for select using (public.is_group_member(group_id));
create policy "members read activities" on public.activities for select using (public.is_group_member(group_id));
create policy "members read options" on public.activity_options for select using (exists (select 1 from public.activities where id = activity_id and public.is_group_member(group_id)));
create policy "members read votes" on public.votes for select using (exists (select 1 from public.activity_options o join public.activities a on a.id = o.activity_id where o.id = option_id and public.is_group_member(a.group_id)));

create policy "owners manage topics" on public.topics for all using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));
create policy "members create activities" on public.activities for insert with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy "owners update activities" on public.activities for update using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));
create policy "owners delete activities" on public.activities for delete using (public.is_group_owner(group_id));
create policy "members create options" on public.activity_options for insert with check (exists (select 1 from public.activities where id = activity_id and public.is_group_member(group_id)));
create policy "owners update options" on public.activity_options for update using (exists (select 1 from public.activities where id = activity_id and public.is_group_owner(group_id))) with check (exists (select 1 from public.activities where id = activity_id and public.is_group_owner(group_id)));
create policy "owners delete options" on public.activity_options for delete using (exists (select 1 from public.activities where id = activity_id and public.is_group_owner(group_id)));
create policy "users create own vote" on public.votes for insert with check (user_id = auth.uid());
create policy "users update own vote" on public.votes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own vote" on public.votes for delete using (user_id = auth.uid());
