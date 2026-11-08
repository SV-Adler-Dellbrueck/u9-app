-- v808 · Schreibvarianten ohne Handarbeit (Reihenfolge: Attrappe, v804-export-vorher.sql, Migration v804, v807, v808, dann diese Datei)
-- Nur erfundene Namen.
\set ON_ERROR_STOP 0
insert into kader(id,name,nr,aktiv,alias) values (1,'Testa',6,true,'A'), (2,'Mikaela',7,true,'B'), (3,'Bero',8,true,'C'), (4,'Pero',9,true,'D'), (5,'Beri',10,true,'E');
\echo '=== Kölner Phonetik: Müller-Lüdenscheidt 65752682, Wikipedia 3412, Breschnew 17863'
select export.koelner('Müller-Lüdenscheidt') as a, export.koelner('Wikipedia') as b, export.koelner('Breschnew') as c;
\echo '=== Variante nur als ganzes Wort in ihrer Schreibweise: „Mika lacht“ → Kind B, „mika“ und „Mikado“ bleiben'
insert into export.name_variante(variante, alias) values ('Mika','B');
select export.ohne_namen('Mika lacht, mika ist klein geschrieben, Mikado ist ein Spiel.') as t;
\echo '=== Ohne Buchstaben (Gastkind): „Gastino“ → ein Kind'
insert into export.name_variante(variante, alias) values ('Gastino', null);
select export.ohne_namen('Gastino hat ausgeholfen.') as t;
\echo '=== Automatisch (streng): „Mikaila“ (Code wie Mikaela, Abstand 1) → Kind B; „Mykaila“ (Abstand 2) bleibt, wird aber gemeldet; „Matte“ (erlaubt) und „Kenneth“ (Trainer) bleiben; „Team“ bleibt'
select export.ohne_namen('Mikaila stand auf der Matte, Mykaila auch, Kenneth pfiff, das Team jubelte.') as t;
\echo '=== Eindeutig am nächsten: „Pera“ (Abstand 1 zu Pero, 2 zu Bero und Beri, alle Code 17) → Kind D'
select export.koelner('Bero') b, export.koelner('Pero') p, export.koelner('Pera') pa, export.ohne_namen('Pera kam spät.') as t;
\echo '=== Gleich nah an zwei Kindern: „Bera“ (Abstand 1 zu Bero und zu Beri) → ein Kind'
select export.ohne_namen('Bera kam spät.') as t;
\echo '=== Großgeschriebenes gewöhnliches Wort am Satzanfang bleibt, wenn der Code nicht passt: „Mutter“'
select export.ohne_namen('Mutter und Testa kamen.') as t;
\echo '=== namen_auto zählt, ohne das Wort zu zeigen'
insert into tagebuch_eintrag(autor,datum,beobachtung) values ('Charles','2026-11-08','Mikaila lachte. Mika auch. Mykaila nicht.');
select * from export.namen_auto;
\echo '=== namen_verdacht meldet „Mykaila“ (Code gleich, Abstand 2) – erwartet 1'
select * from export.namen_verdacht;
select beobachtung from export.tagebuch_eintrag;
\echo '=== Rechte: Leserolle liest namen_auto; anon und Eltern dürfen nicht pflegen; Trainer darf'
set role adler_export_lese; select count(*) as lesbar from export.namen_auto; reset role;
set role anon; select public.namen_schreibweise_setzen('Testi','name','A'); reset role;
insert into profiles(id, role) values ('00000000-0000-0000-0000-000000000001','trainer'), ('00000000-0000-0000-0000-000000000002','parent') on conflict do nothing;
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select public.namen_schreibweise_setzen('Testi','name','A');
select count(*) as eltern_sehen from public.namen_schreibweisen();
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.namen_schreibweise_setzen('Testi','name','A');
select public.namen_schreibweise_setzen('Mikado','wort');
select public.namen_schreibweise_setzen('Bla bla; drop','name','A');
select public.namen_schreibweise_setzen('Testo','name','Z');
select art, wort, alias from public.namen_schreibweisen() order by 1,2;
reset role;
select export.ohne_namen('Testi kam, testi nicht.') as t;
