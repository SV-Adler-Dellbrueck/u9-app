-- v978 · Unbekannte Namen im Zusammenhang (Reihenfolge: Attrappe, v804-export-vorher.sql, Migration v804, v807, v808, v812, v978, dann diese Datei)
-- Nur erfundene Namen.
\set ON_ERROR_STOP 0
insert into kader(id,name,nr,aktiv,alias) values (1,'Testa',6,true,'A'), (2,'Bero',7,true,'B') on conflict do nothing;
\echo '=== Kontext zählt: „Eltern von Quirin“ (unbekannt) 1 · „Quirins Mama“ 1 · „Ottilie’ Papa“ – erwartet 3'
select export.kontext_verdacht('Randnotiz: Eltern von Quirin hatten Tee dabei. Quirins Mama winkte. Ottilie’ Papa auch.') as erwartet_3;
\echo '=== Bekanntes Kind wird ersetzt und nicht gemeldet: „Eltern von Testa“, „Testas Eltern“ – erwartet 0'
select export.kontext_verdacht('Eltern von Testa kamen. Testas Eltern auch.') as erwartet_0, export.ohne_namen('Eltern von Testa kamen.') as ersetzt;
\echo '=== Gewöhnliche Wörter und Trainer bleiben stumm: „Eltern von Kindern“, „von Anfang“, „Mutter von Charles“ – erwartet 0'
select export.kontext_verdacht('Die Eltern von Kindern helfen, Eltern von Anfang an dabei, Mutter von Charles.') as erwartet_0;
\echo '=== Ohne Zusammenhang kein Verdacht: „Quirin spielte“ – erwartet 0 (dafür braucht es Kader oder Schreibweise)'
select export.kontext_verdacht('Quirin spielte gut.') as erwartet_0;
\echo '=== namen_verdacht meldet den Eintrag (nur Zahl, kein Wort) – erwartet beobachtung 1'
insert into tagebuch_eintrag(autor,datum,beobachtung) values ('Charles','2026-11-23','Randnotiz: Eltern von Quirin hatten große Kanne Tee dabei.');
select tabelle, feld, anzahl from export.namen_verdacht where tabelle = 'tagebuch_eintrag';
\echo '=== Schreibweise ohne Buchstaben (wie in der App gepflegt) → ersetzt, Verdacht weg – erwartet „ein Kind“ und keine Zeile'
insert into export.name_variante(variante, alias) values ('Quirin', null);
select beobachtung from export.tagebuch_eintrag where datum = '2026-11-23';
select count(*) as erwartet_0 from export.namen_verdacht where tabelle = 'tagebuch_eintrag';
\echo '=== Rechte: Leserolle liest namen_verdacht (true); anon darf kontext_verdacht nicht (permission denied)'
set role adler_export_lese; select count(*) >= 0 as lesbar from export.namen_verdacht; reset role;
set role anon; select export.kontext_verdacht('x'); reset role;
