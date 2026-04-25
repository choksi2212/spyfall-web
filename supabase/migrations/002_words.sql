-- Word bank for SPYFALL (8 categories × 3k targets). Run after 001_rooms.sql.

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

create unique index if not exists words_category_word_lower_unique
  on public.words (category, lower(word));

create index if not exists idx_words_category on public.words (category);

alter table public.words enable row level security;

drop policy if exists "deny_words_anon" on public.words;
create policy "deny_words_anon" on public.words
  for all using (false) with check (false);

-- Optional: fast count check — select category, count(*) from words group by 1;
