-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)
-- Service role from your game server bypasses RLS for inserts.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_player_id text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists idx_rooms_code on public.rooms (code);

alter table public.rooms enable row level security;

-- Block anon/authenticated direct table access; game server uses service role.
create policy "deny_all_anon" on public.rooms
  for all
  using (false)
  with check (false);
