-- v544 · Was hat welches Kind von uns bekommen?
--
-- Bisher stand nur eine einzige Zahl am Kind: kader.trikotgroesse (v543). Das
-- reicht nicht, sobald es mehr als ein Kleidungsstueck gibt — der Praesentations-
-- anzug hat eine andere Groesse als der Trikotsatz, und der zweite Anzug kommt
-- noch. Spalten je Artikel waeren der falsche Weg: jeder neue Gegenstand
-- (Trinkflasche, Rucksack) brauchte dann eine Migration.
--
-- Deshalb zwei Tabellen: ein Katalog, den der Trainer selbst erweitert, und je
-- Kind und Artikel eine Zeile mit Ausgabe, Groesse und Rueckgabe. Ein neuer
-- Gegenstand ist damit eine Zeile im Katalog, kein Eingriff ins Schema.
--
-- Die Rueckgabe steht bewusst mit dabei. Eine Ausgabeliste ohne sie ist nach
-- einer Saison wertlos — gebraucht wird sie an dem Tag, an dem ein Kind den
-- Verein wechselt.

create table if not exists public.ausstattung_artikel (
  id            bigserial primary key,
  name          text not null,
  beschreibung  text,                                   -- „Trikot, kurze Hose, Stutzen"
  mit_groesse   boolean not null default true,
  mit_nummer    boolean not null default false,         -- Satznummer (Trikotsatz)
  groessen      text,                                   -- Vorschlagsliste, kommagetrennt
  sort          int not null default 0,
  aktiv         boolean not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.ausstattung_artikel is
  'Katalog der Dinge, die das Team an Kinder ausgibt. Vom Trainerteam pflegbar.';
comment on column public.ausstattung_artikel.groessen is
  'Vorschlagsliste fuer das Groessenfeld, z. B. „128,140,152". Nur ein Vorschlag, freie Eingabe bleibt moeglich.';

create table if not exists public.ausstattung_ausgabe (
  id            bigserial primary key,
  spieler_id    bigint not null references public.kader(id) on delete cascade,
  artikel_id    bigint not null references public.ausstattung_artikel(id) on delete cascade,
  ausgegeben_am date,
  groesse       text,
  nummer        text,
  zurueck_am    date,
  notiz         text,
  updated_at    timestamptz not null default now(),
  unique (spieler_id, artikel_id)
);

comment on table public.ausstattung_ausgabe is
  'Je Kind und Artikel eine Zeile. ausgegeben_am gesetzt = ausgegeben; zurueck_am gesetzt = wieder da.';

create index if not exists ausstattung_ausgabe_spieler_idx on public.ausstattung_ausgabe (spieler_id);

-- Row-Level-Security ----------------------------------------------------------
-- Den Katalog darf jeder Angemeldete lesen (die Karte des Kindes nennt sonst nur
-- eine Zahl ohne Gegenstand), schreiben nur das Trainerteam. Die Ausgaben liest
-- ein Elternteil ausschliesslich zum eigenen Kind — dasselbe Muster wie
-- kind_fanfacts, nur ohne Schreibrecht: was ausgegeben wurde, entscheidet der
-- Verein, nicht die Familie.
alter table public.ausstattung_artikel enable row level security;
alter table public.ausstattung_ausgabe enable row level security;

drop policy if exists aa_select on public.ausstattung_artikel;
create policy aa_select on public.ausstattung_artikel for select using (auth.uid() is not null);
drop policy if exists aa_write on public.ausstattung_artikel;
create policy aa_write on public.ausstattung_artikel for all using (is_trainer()) with check (is_trainer());

drop policy if exists ag_select on public.ausstattung_ausgabe;
create policy ag_select on public.ausstattung_ausgabe for select using (is_trainer() or is_parent_of(spieler_id));
drop policy if exists ag_write on public.ausstattung_ausgabe;
create policy ag_write on public.ausstattung_ausgabe for all using (is_trainer()) with check (is_trainer());

-- Grundbestand ----------------------------------------------------------------
-- Die drei Dinge, die es heute gibt. Alles Weitere traegt das Trainerteam selbst
-- ein; „FRMD PASN" ist der Ausruester, nicht der Gegenstand, deshalb steht er im
-- Namen und nicht in einer eigenen Spalte.
insert into public.ausstattung_artikel (name, beschreibung, mit_groesse, mit_nummer, groessen, sort)
select v.name, v.beschreibung, v.mit_groesse, v.mit_nummer, v.groessen, v.sort
  from (values
    ('Trikotsatz',                    'Trikot, kurze Hose, Stutzen', true,  true,  '128,140,152', 10),
    ('Präsentationsanzug FRMD PASN',  'Jacke und Hose',              true,  false, '128,140,152', 20),
    ('Spieltagsjacke FRMD PASN',      null,                          true,  false, '128,140,152', 30)
  ) as v(name, beschreibung, mit_groesse, mit_nummer, groessen, sort)
 where not exists (select 1 from public.ausstattung_artikel a where a.name = v.name);

-- Umzug der zwei Groessen aus v543 -------------------------------------------
-- Sie gehoeren an den Trikotsatz. Der Umzug laeuft vor dem Loeschen der Spalte,
-- damit nichts verlorengeht; ausgegeben_am bleibt leer, weil wir das Datum nicht
-- kennen und ein erfundenes schlimmer waere als keines.
insert into public.ausstattung_ausgabe (spieler_id, artikel_id, groesse)
select k.id, a.id, k.trikotgroesse
  from public.kader k
  cross join public.ausstattung_artikel a
 where a.name = 'Trikotsatz'
   and k.trikotgroesse is not null and btrim(k.trikotgroesse) <> ''
on conflict (spieler_id, artikel_id) do nothing;

-- Und weg damit: zwei Stellen fuer dieselbe Groesse heisst, dass eine davon
-- falsch ist. Die Zahl steht ab jetzt ausschliesslich an der Ausgabe.
alter table public.kader drop column if exists trikotgroesse;

-- Die zweite Stelle, an der eine Trikotgroesse stand ---------------------------
-- kind_fanfacts.trikot_groesse wurde von den ELTERN gepflegt und von der Kachel
-- „Team-Ausruestung" angezeigt. Damit gab es die Groesse dreifach. Die ausgegebene
-- Groesse ist eine Tatsache des Vereins, keine Angabe der Familie — sie entsteht
-- beim Anprobieren am Platz. Der vorhandene Wert wandert deshalb als Startwert an
-- den Trikotsatz, aber nur dort, wo noch keiner steht.
insert into public.ausstattung_ausgabe (spieler_id, artikel_id, groesse)
select f.spieler_id, a.id, f.trikot_groesse
  from public.kind_fanfacts f
  cross join public.ausstattung_artikel a
 where a.name = 'Trikotsatz'
   and f.trikot_groesse is not null and btrim(f.trikot_groesse) <> ''
on conflict (spieler_id, artikel_id) do nothing;

alter table public.kind_fanfacts drop column if exists trikot_groesse;

-- Die Schuhgroesse bleibt bei den Eltern: sie ist keine Ausgabe des Vereins und
-- steht nirgends sonst. Der CSV-Export darauf faellt weg, weil die neue Ansicht
-- die Tabellen unter den Leseregeln direkt liest.
drop function if exists public.ausruestung_export();
