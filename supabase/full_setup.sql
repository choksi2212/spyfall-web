-- Paste once into Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Creates rooms + words + RLS policies.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_player_id text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists idx_rooms_code on public.rooms (code);

alter table public.rooms enable row level security;

drop policy if exists "deny_all_anon" on public.rooms;
create policy "deny_all_anon" on public.rooms
  for all using (false) with check (false);

create table if not exists public.words (
  id bigint generated always as identity primary key,
  category text not null
    constraint words_category_chk check (
      category in (
        'sports',
        'countries',
        'objects',
        'places',
        'animals',
        'transport',
        'technology',
        'science'
      )
    ),
  word text not null,
  created_at timestamptz not null default now()
);

-- Expression uniqueness is not allowed inline; use a unique index:
create unique index if not exists words_category_word_lower_unique
  on public.words (category, lower(word));

create index if not exists idx_words_category on public.words (category);

alter table public.words enable row level security;

drop policy if exists "deny_words_anon" on public.words;
create policy "deny_words_anon" on public.words
  for all using (false) with check (false);
