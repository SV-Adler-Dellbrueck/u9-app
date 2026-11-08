-- v812 · Elternnamen (Reihenfolge: Attrappe, v804-export-vorher.sql, Migration v804, v807, v808, v812, dann diese Datei)
-- Nur erfundene Namen.
\set ON_ERROR_STOP 0
insert into kader(id,name,nr,aktiv,alias) values (1,'Testa',6,true,'A'), (2,'Bero',7,true,'B') on conflict do nothing;
insert into profiles(id, role, anzeigename) values
  ('00000000-0000-0000-0000-000000000011','parent','Gundula Wanderer'),
  ('00000000-0000-0000-0000-000000000012','trainer','Theobald Pfiff') on conflict (id) do update set anzeigename = excluded.anzeigename, role = excluded.role;
insert into eltern_angaben(user_id, vorname, nachname) values ('00000000-0000-0000-0000-000000000011','Gundula','Wanderer') on conflict do nothing;
insert into kind_kontakte(spieler_id, name, rolle) values (1, 'Opa Ruprecht', 'Opa'), (2, 'Bero Familie', 'Eltern');
\echo '=== erwachsene_namen: Gundula, Gundula Wanderer, Opa Ruprecht, Ruprecht, Wanderer – nicht Theobald (Trainer), nicht Testa (Kind), nicht „Opa“ allein'
select wort from export.erwachsene_namen() order by 1;
\echo '=== Voller Name, Teil und Genitiv → ein Elternteil; Kind → Kind A; Trainer bleibt'
select export.ohne_namen('Gundula Wanderer sprach mit Theobald. Wanderers Auto stand da. Testa lachte. Ruprecht winkte.') as t;
\echo '=== Unbekannter Name hinter Vater fällt weg; „dem Vater Bescheid“ und „Mama Kind“ bleiben'
select export.ohne_namen('Testas Vater Dagobert rief. Ich gab dem Vater Bescheid. Die Mama Testa kam.') as t;
\echo '=== Trainer sieht die Elternliste in namen_schreibweisen, Eltern nicht'
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000012","role":"authenticated"}';
select count(*) as trainer_eltern from public.namen_schreibweisen() where art = 'eltern';
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
select count(*) as eltern_sehen from public.namen_schreibweisen();
reset role;
\echo '=== Leserolle: Export-View liefert ersetzt'
insert into tagebuch_eintrag(autor,datum,beobachtung) values ('Charles','2026-11-08','Vater Dagobert und Gundula kamen.');
set role adler_export_lese; select beobachtung from export.tagebuch_eintrag where beobachtung like '%Vater%'; reset role;
\echo '=== Direkt aufrufen dürfen anon und authenticated nicht'
set role anon; select export.erwachsene_namen(); reset role;
\echo '=== „Opa“ allein bleibt'
select export.ohne_namen('Der Opa kam mit.') as t;
\echo '=== „Familie“ aus Anzeigenamen bleibt ein Wort'
select export.ohne_namen('Die Familie kam mit Bero.') as t;
