-- Run once in Supabase → SQL Editor. One row per user; RLS means each user can only touch their own row.
create table if not exists saves (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  save jsonb not null,
  updated_at timestamptz not null default now()
);
alter table saves enable row level security;
create policy "own save" on saves for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
