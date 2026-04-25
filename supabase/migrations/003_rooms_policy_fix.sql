-- Safe re-run if 001 failed on second apply
drop policy if exists "deny_all_anon" on public.rooms;
create policy "deny_all_anon" on public.rooms
  for all using (false) with check (false);
