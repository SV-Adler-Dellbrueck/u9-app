-- v919 · Lesender Datenweg (v804): die ganze Übungsbeschreibung aus v917 (trainingsformen.ablauf_lang) geht mit
-- in den nächtlichen Export, damit der Projekt-Chat beim Schreiben von Aufträgen Ziele und Einzelheiten sieht.
-- Wie ablauf durch export.ohne_namen (Namen werden zu Buchstaben). Neue Spalte am Ende – create or replace
-- behält Eigentümer und Rechte (adler_export_lese: nur SELECT). Charles' Ja 20.11.
create or replace view export.trainingsformen as
select f.id, export.ohne_namen(f.name) as name, f.kat, export.ohne_namen(f.kurz) as kurz, export.ohne_namen(f.ablauf) as ablauf,
       export.ohne_namen(f.varianten) as varianten, export.ohne_namen(f.coaching) as coaching, f.spieler, f.feld, f.dauer, f.spass, f.diff,
       f.custom, f.focus, f.dims, f.tags, f.spieler_min, f.spieler_max, f.mit_torwart, f.created_at,
       export.ohne_namen(f.ablauf_lang) as ablauf_lang
  from public.trainingsformen f;
