-- v803 · Vorbereitung: kabine_lob so, wie die Tabelle vor v755 in der Datenbank stand (sie hat keine eigene Migration im Repo)
create table public.kabine_lob (id bigint generated always as identity primary key, spieler_id bigint not null, path text not null, created_at timestamptz not null default now());
alter table public.kabine_lob enable row level security;
create policy kl_sel on public.kabine_lob for select to authenticated using (public.is_trainer() or public.is_parent_of(spieler_id) or public.is_kind_selbst(spieler_id));
create policy kl_ins on public.kabine_lob for insert to authenticated with check (public.is_trainer());
create policy kl_del on public.kabine_lob for delete to authenticated using (public.is_trainer());
grant select, insert, delete on public.kabine_lob to authenticated;
