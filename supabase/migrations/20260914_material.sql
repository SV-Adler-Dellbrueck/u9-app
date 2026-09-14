-- v545 · Was haben wir eigentlich? Material des Teams.
--
-- Die Kachel „Team-Ausruestung" versprach seit jeher „Baelle, Leibchen & Co. – wer
-- hat was?", zeigte aber eine Groessentabelle. Gefragt war immer das andere: wie
-- viele Baelle, wie viele Huetchen in welcher Farbe, ist das Erste-Hilfe-Set noch
-- vollstaendig. Das steht ab jetzt hier.
--
-- Eine Tabelle mit freier Variante statt Spalten je Eigenschaft: „rot" bei
-- Huetchen, „Groesse 3" bei Baellen, „Nr. 1–14" bei Trikotsaetzen sind dasselbe
-- Unterscheidungsmerkmal, nur mit anderem Inhalt.
--
-- soll und ist duerfen NULL sein, und das ist der Grundzustand. „Noch nie gezaehlt"
-- ist eine eigene Aussage; eine 0 waere die Behauptung, es sei keines da.

create table if not exists public.material_posten (
  id              bigserial primary key,
  name            text not null,
  kategorie       text,                  -- Baelle · Huetchen · Markierung · Kleidung · Medizin · Sonstiges
  variante        text,                  -- Farbe, Groesse, Nummernkreis
  soll            int,
  ist             int,
  zuletzt_gezaehlt date,
  ort             text,
  notiz           text,
  -- Verbindung zur Ausgabe: bei „Trikotsaetze" steht damit auch, wie viele davon
  -- gerade bei den Kindern sind. Ohne sie zaehlte man Kleidung zweimal.
  artikel_id      bigint references public.ausstattung_artikel(id) on delete set null,
  sort            int not null default 0,
  aktiv           boolean not null default true,
  created_at      timestamptz not null default now()
);

comment on table public.material_posten is
  'Bestand des Teams. ist/soll NULL = noch nicht gezaehlt, nicht null Stueck.';

alter table public.material_posten enable row level security;
drop policy if exists mp_rw on public.material_posten;
create policy mp_rw on public.material_posten for all using (is_trainer()) with check (is_trainer());

-- Startliste ------------------------------------------------------------------
-- Bewusst OHNE Zahlen: was wir haben, weiss nur die Zaehlung. Die Zeilen sind ein
-- Geruest, das beim ersten Durchgang gefuellt, ergaenzt und ausgeduennt wird.
insert into public.material_posten (name, kategorie, variante, sort, artikel_id)
select v.name, v.kategorie, v.variante, v.sort,
       (select a.id from public.ausstattung_artikel a where a.name = v.artikel)
  from (values
    ('Bälle',                'Bälle',      'Größe 3',        10, null),
    ('Bälle',                'Bälle',      'Größe 4',        20, null),
    ('Ballpumpe',            'Bälle',      null,             30, null),
    ('Hütchen',              'Hütchen',    'rot',            40, null),
    ('Hütchen',              'Hütchen',    'gelb',           50, null),
    ('Hütchen',              'Hütchen',    'blau',           60, null),
    ('Hütchen',              'Hütchen',    'grün',           70, null),
    ('Markierungsteller',    'Markierung', null,             80, null),
    ('Spielfeldmarkierung',  'Markierung', 'Stangen',        90, null),
    ('Leibchen',             'Kleidung',   null,            100, null),
    ('Trikotsätze',          'Kleidung',   null,            110, 'Trikotsatz'),
    ('Spieltagsjacken',      'Kleidung',   null,            120, 'Spieltagsjacke FRMD PASN'),
    ('Trinkflaschen',        'Sonstiges',  null,            130, null),
    ('Erste-Hilfe-Set',      'Medizin',    null,            140, null)
  ) as v(name, kategorie, variante, sort, artikel)
 where not exists (
   select 1 from public.material_posten m
    where m.name = v.name and coalesce(m.variante,'') = coalesce(v.variante,''));
