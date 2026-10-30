-- Run in Supabase → SQL Editor (safe to re-run). One row per user; RLS means each user can only touch their own row.
create table if not exists saves (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  save jsonb not null,
  updated_at timestamptz not null default now()
);
alter table saves enable row level security;
drop policy if exists "own save" on saves;
create policy "own save" on saves for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friends rooms. Safe to run again: it only adds what's missing.
-- rooms: one row per room. The host's lobby flips it to 'live' with a start time; every player's market runs off that clock.
create table if not exists rooms (
  code text primary key check (length(code) <= 20),
  host uuid not null,
  status text not null default 'lobby' check (status in ('lobby', 'live', 'ended', 'cancelled')),
  speed int not null default 1 check (speed in (1, 2, 4)),
  start_at timestamptz,
  winner text check (length(winner) <= 16),
  next text check (length(next) <= 20),   -- the rematch room, so players on the results screen can follow
  created_at timestamptz not null default now()
);
alter table rooms enable row level security;
drop policy if exists "read rooms" on rooms;
drop policy if exists "add room" on rooms;
drop policy if exists "update room" on rooms;
create policy "read rooms" on rooms for select to anon, authenticated using (true);
create policy "add room" on rooms for insert to anon, authenticated with check (status = 'lobby');
create policy "update room" on rooms for update to anon, authenticated using (status in ('lobby', 'live', 'ended')) with check (true);

-- room_scores: one row per player per room. Anyone can read and write (the game runs in the browser anyway),
-- but a finished score is locked so replaying a room can't overwrite it. gone = left the room or was removed by the host.
create table if not exists room_scores (
  room text not null check (length(room) <= 20),
  pid uuid not null,
  name text not null check (length(name) between 1 and 16),
  nw double precision not null,
  day int not null,
  t int not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room, pid)
);
alter table room_scores add column if not exists gone boolean not null default false;
alter table room_scores enable row level security;
drop policy if exists "read scores" on room_scores;
drop policy if exists "add score" on room_scores;
drop policy if exists "update unfinished" on room_scores;
create policy "read scores" on room_scores for select to anon, authenticated using (true);
create policy "add score" on room_scores for insert to anon, authenticated with check (true);
create policy "update unfinished" on room_scores for update to anon, authenticated using (not done) with check (true);
