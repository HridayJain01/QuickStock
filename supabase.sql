-- Run once in Supabase → SQL Editor. One row per user; RLS means each user can only touch their own row.
create table if not exists saves (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  save jsonb not null,
  updated_at timestamptz not null default now()
);
alter table saves enable row level security;
create policy "own save" on saves for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Friends rooms: one row per player per room. Anyone can read and write (the game runs in the browser anyway),
-- but a finished score is locked so replaying a room can't overwrite it.
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
alter table room_scores enable row level security;
create policy "read scores" on room_scores for select to anon, authenticated using (true);
create policy "add score" on room_scores for insert to anon, authenticated with check (true);
create policy "update unfinished" on room_scores for update to anon, authenticated using (not done) with check (true);
