-- v526 · Trainertagebuch (DFB-Basis-Coach)
--
-- Die Rohdaten entstehen ohnehin in der App: die Nachbereitung einer Einheit
-- (einheit_bewertung) und die eines Spiels oder Festivals (event_bewertung).
-- Diese Tabelle haelt daraus den fertigen Tagebucheintrag - vorausgefuellt, wo
-- die App etwas weiss, handgeschrieben dort, wo nur der Trainer es weiss.
--
-- Bewusst KEINE Vollautomatik: aha und konsequenz sind NOT NULL, weil ein
-- Eintrag ohne Erkenntnis und ohne Vorhaben keiner ist. konsequenz_bis bleibt
-- nullable - ein erzwungenes Datum laedt dazu ein, irgendeins einzutippen.
--
-- datum ist der Tag des ERLEBNISSES, nicht der des Schreibens. Nachtragen ist
-- der Normalfall; ein created_at, das den Tag verschoebe, machte die Sammlung
-- fuer die Abgabe unbrauchbar.
create table if not exists public.tagebuch_eintrag (
  id             bigint generated always as identity primary key,
  autor          text        not null,
  datum          date        not null,
  quelle         text        not null check (quelle in ('einheit','event','frei')),
  termin_id      bigint      null references public.termine(id) on delete set null,
  baustein       text        not null check (baustein in ('ich','spiel_spieler','organisation','system_fussball')),
  ausloeser      text        not null,
  beobachtung    text,
  aha            text        not null,
  konsequenz     text        not null,
  konsequenz_bis date,
  beleg          text,
  anschluss      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Die Eintraege enthalten Beobachtungen ueber Personen. Kein anonymer Zugriff,
-- weder lesend noch schreibend - dieselbe Regel wie bei einheit_bewertung.
alter table public.tagebuch_eintrag enable row level security;

drop policy if exists "tagebuch_trainer_all" on public.tagebuch_eintrag;
create policy "tagebuch_trainer_all" on public.tagebuch_eintrag
  for all using (is_trainer()) with check (is_trainer());

-- Die Ansicht gruppiert nach Baustein, neueste zuerst; der Export zieht einen Monat.
create index if not exists tagebuch_datum_idx    on public.tagebuch_eintrag (datum desc);
create index if not exists tagebuch_baustein_idx on public.tagebuch_eintrag (baustein, datum desc);
