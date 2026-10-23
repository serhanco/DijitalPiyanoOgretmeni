-- Dijital Piyano Öğretmeni: the cloud side of accounts and friends (phase 17).
-- Run once in the Supabase SQL editor (see docs/HESAP.md). Every table has row level security:
-- a learner reads and writes only their own rows and reads the public summary of their friends.

-- The whole learning progress of a learner (the app's backup format), merged on the device.
create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- What friends see of a learner: name, invite code, streak, this week's XP, Salon records and ghosts.
create table public.players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  costume text,
  streak int not null default 0,
  week text not null default '',
  week_xp int not null default 0,
  week_lessons int not null default 0,
  last_week text not null default '',
  last_week_xp int not null default 0,
  records jsonb not null default '{}' check (pg_column_size(records) < 20000),
  ghosts jsonb not null default '{}' check (pg_column_size(ghosts) < 200000),
  partner uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Friendship is kept in both directions; rows are added only by add_friend().
create table public.friends (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Small notes between friends: a cheer (👏) or "beat your record".
create table public.events (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('cheer', 'beat')),
  about text not null default '' check (char_length(about) <= 80),
  at timestamptz not null default now()
);
create index events_to on public.events (to_id, at desc);

alter table public.progress enable row level security;
alter table public.players enable row level security;
alter table public.friends enable row level security;
alter table public.events enable row level security;

create policy progress_own on public.progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy players_read on public.players for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id = players.user_id)
  );
create policy players_insert on public.players for insert to authenticated with check (user_id = auth.uid());
create policy players_update on public.players for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy friends_read on public.friends for select to authenticated using (user_id = auth.uid());

create policy events_read on public.events for select to authenticated
  using (to_id = auth.uid() or from_id = auth.uid());
create policy events_send on public.events for insert to authenticated
  with check (
    from_id = auth.uid()
    and exists (select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id = events.to_id)
  );
create policy events_clear on public.events for delete to authenticated using (to_id = auth.uid());

-- Add the learner whose invite code this is as a friend, both ways. Returns their id (null: no such code;
-- the caller's own id: their own code).
create function public.add_friend(friend_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  other uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select user_id into other from public.players where code = upper(trim(friend_code));
  if other is null or other = auth.uid() then
    return other;
  end if;
  insert into public.friends (user_id, friend_id) values (auth.uid(), other), (other, auth.uid())
    on conflict do nothing;
  return other;
end $$;

-- End a friendship, both ways.
create function public.remove_friend(friend uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.friends
  where (user_id = auth.uid() and friend_id = friend) or (user_id = friend and friend_id = auth.uid());
$$;

-- Delete the caller's account; every row above goes with it (on delete cascade).
create function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.add_friend(text) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.delete_account() to authenticated;
