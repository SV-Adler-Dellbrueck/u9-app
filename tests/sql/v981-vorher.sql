-- v981: was die Attrappe für die Tee-Kannen zusätzlich braucht (wie in Supabase)
alter table public.event_helfer add column if not exists aufgabe text, add column if not exists created_at timestamptz default now();
create table if not exists public.rueckmeldungen(id bigserial primary key, termin_id bigint, spieler_id bigint, status text);
grant select, insert, update, delete on public.rueckmeldungen to authenticated;
grant usage on all sequences in schema public to authenticated;
