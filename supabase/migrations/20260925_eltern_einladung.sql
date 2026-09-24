-- v604 · Einladungskarten fuer den Elternabend
--
-- Je Kind eine gedruckte Karte mit QR-Code. Wer sie scannt, legt mit E-Mail und Passwort
-- ein Konto an und ist sofort dem Kind zugeordnet - ohne dass vorher jemand die Adresse
-- in eltern_kinder eintragen muss und ohne dass eine E-Mail verschickt wird.
--
-- Gespeichert wird nur der SHA-256 des Codes. Der Code selbst steht auf dem Papier und
-- nirgends sonst; wer die Tabelle liest, kann damit keine Karte nachbauen.
--
-- Einloesen darf nur die Edge Function eltern-einladung (Dienstschluessel). Die Tabelle
-- ist deshalb fuer Eltern und anonyme Aufrufer unsichtbar; Trainer legen Karten an,
-- sehen, wie oft sie benutzt wurden, und ziehen sie zurueck.

create table if not exists public.eltern_einladung (
  id             bigint generated always as identity primary key,
  spieler_id     bigint not null references public.kader(id) on delete cascade,
  code_hash      text   not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  max_nutzungen  int    not null default 2 check (max_nutzungen between 1 and 4),
  nutzungen      int    not null default 0 check (nutzungen >= 0),
  gueltig_bis    timestamptz not null,
  erstellt_von   uuid   default auth.uid(),
  erstellt_am    timestamptz not null default now(),
  zuletzt_am     timestamptz,
  check (nutzungen <= max_nutzungen)
);

comment on table public.eltern_einladung is
  'v604: Einladungskarten je Kind. Nur der SHA-256 des Codes; eingeloest wird ausschliesslich ueber die Edge Function eltern-einladung.';

create index if not exists eltern_einladung_spieler on public.eltern_einladung(spieler_id);

alter table public.eltern_einladung enable row level security;

drop policy if exists eltern_einladung_trainer on public.eltern_einladung;
create policy eltern_einladung_trainer on public.eltern_einladung
  for all to authenticated
  using (public.is_trainer()) with check (public.is_trainer());

revoke all on public.eltern_einladung from anon;
grant select, insert, update, delete on public.eltern_einladung to authenticated;

-- Eine Nutzung zaehlen, und zwar nur, wenn noch eine frei ist. In einer Anweisung, damit
-- zwei Eltern, die dieselbe Karte im selben Augenblick einloesen, nicht beide die letzte
-- bekommen. Liefert die Kind-ID oder null. Nur der Dienstschluessel darf sie aufrufen.
create or replace function public.eltern_einladung_nutzen(p_hash text)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.eltern_einladung
     set nutzungen = nutzungen + 1, zuletzt_am = now()
   where code_hash = p_hash
     and nutzungen < max_nutzungen
     and gueltig_bis > now()
  returning spieler_id;
$$;

-- Gegenstueck, falls das Anlegen des Kontos danach scheitert: die Nutzung zurueckgeben.
create or replace function public.eltern_einladung_zurueck(p_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.eltern_einladung
     set nutzungen = greatest(nutzungen - 1, 0)
   where code_hash = p_hash;
$$;

revoke execute on function public.eltern_einladung_nutzen(text)  from public, anon, authenticated;
revoke execute on function public.eltern_einladung_zurueck(text) from public, anon, authenticated;
grant  execute on function public.eltern_einladung_nutzen(text)  to service_role;
grant  execute on function public.eltern_einladung_zurueck(text) to service_role;
