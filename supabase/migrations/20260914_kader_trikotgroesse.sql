-- v543 · Trikotgroesse am Kind
--
-- Die Groessen werden beim Anprobieren auf Papier notiert und wandern dann in
-- eine Liste, die niemand wiederfindet. Sie gehoeren dorthin, wo das Kind steht:
-- in den Kader.
--
-- Bewusst `text` und keine Auswahlliste in der Datenbank: die Groessenschluessel
-- der Hersteller unterscheiden sich (128/134/140 gegen XS/S/M), und eine Zwangs-
-- liste in der Spalte muesste bei jedem neuen Ausruester per Migration geaendert
-- werden. Die Auswahl steht in der App und laesst freie Eingabe zu.
--
-- Kein Vorgabewert: „noch nicht gemessen" ist eine eigene Aussage und darf nicht
-- als Groesse aussehen.
alter table public.kader
  add column if not exists trikotgroesse text;

comment on column public.kader.trikotgroesse is
  'Trikotgroesse des Kindes, frei als Text (z. B. 128 oder XS). NULL = noch nicht erfasst.';
