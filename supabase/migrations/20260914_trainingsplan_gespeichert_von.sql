-- v542 · Wer hat den Trainingsplan zuletzt gespeichert?
--
-- Der Trainingsplan wird von mehreren Trainern bearbeitet und per Upsert auf das
-- Datum geschrieben. Wer zuletzt gespeichert hat, stand nirgends: die Tabelle
-- kannte nur datum, plan, slots, kopf und updated_at. Wer am Freitag den Plan
-- oeffnete, konnte nicht sehen, dass Peter ihn am Donnerstag gebaut hatte - und
-- ueberschrieb ihn, ohne es zu merken.
--
-- Die Spalte ist bewusst `text` und nicht auth.uid(): in TRAINER stehen Namen
-- (Dienst), nicht Konten. `trainerMe()` liefert genau diesen Namen, und die
-- Anzeige soll „Peter" sagen, nicht eine Kennung.
--
-- Nullable und ohne Vorgabewert: fuer alle Plaene, die vor v542 entstanden sind,
-- weiss niemand mehr, wer sie geschrieben hat. Ein erfundener Name waere
-- schlimmer als eine Luecke - die App sagt dann „zuletzt gespeichert" ohne Namen.
alter table public.trainingsplan
  add column if not exists gespeichert_von text;

comment on column public.trainingsplan.gespeichert_von is
  'Name aus TRAINER, der zuletzt gespeichert hat. NULL bei Plaenen aus der Zeit vor v542.';
