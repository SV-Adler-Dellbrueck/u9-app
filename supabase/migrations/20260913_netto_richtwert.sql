-- Paket 3: Wochen-Richtwert für die Nettospielzeit (doku/auftrag-adler-luecken).
--
-- Die Trainingsphilosophie Deutschland nennt für U8 bis U16 mindestens 48 Minuten
-- Nettospielzeit pro Woche. Ab U17 sind es 32, und die Mannschaft wird älter –
-- deshalb gehört die Zahl in die Team-Konfiguration und nicht in den Code
-- (Abnahmekriterium 6: änderbar ohne Codeänderung).
--
-- Kein eigener Einstellungsbildschirm: der Wert wird dort gepflegt, wo er wirkt –
-- als Tipp auf die Zahl in der Wochenzeile des Trainingsplans.

alter table public.team_config
  add column if not exists netto_richtwert integer not null default 48;

comment on column public.team_config.netto_richtwert is
  'Richtwert Nettospielzeit je Woche in Minuten (Trainingsphilosophie Deutschland: 48 fuer U8-U16, 32 ab U17). Gepflegt im Trainingsplan.';
