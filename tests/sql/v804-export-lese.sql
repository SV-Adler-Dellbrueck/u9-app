-- v804 · Export-Rolle und Whitelist-Views (Reihenfolge: Attrappe, v804-export-vorher.sql, Migration v804, dann diese Datei)
\set ON_ERROR_STOP 0
insert into kader(id,name,nr,aktiv,alias,geb,medical) values (1,'Testa',6,true,'A','2018-03-04','Allergie') ;
insert into kader(id,name,nr,aktiv,alias) values (2,'Mikaela',7,true,'B');
insert into termine(id,typ,datum,titel,gegner,ort) values (10,'spiel','2026-11-07','Spiel gegen Verein X','Verein X','Straße 5');
insert into tagebuch_eintrag(autor,datum,quelle,baustein,ausloeser,beobachtung,aha,konsequenz,schlagworte,status,anwesend,durchgefuehrt,diktat,ki_vorschlag)
  values ('Charles','2026-11-02','einheit','spiel_spieler','Training','Testa war ruhig, Testas Pass kam an. Mikaela half. Testi stand allein. Auf der Matte lief es.','Ich merke: Testa braucht Ruhe','Mit Mikaela sprechen','{Testa,Pass}','keim','{1,2}','[{"name":"Übung mit Testa","block":"Hauptteil"}]','Rohtext mit Testa',true);
insert into einheit_bewertung(datum,spass,umsetzung,erfolg,notiz,sprachnotiz,autor) values ('2026-11-02',4,5,4,'Testa hatte Spaß','Rohtext Testa','Charles');
insert into event_bewertung(termin_id,autor,teams,gaeste,getragen,arbeiten,sprachnotiz) values (10,'Charles','{"1":{"spass":2}}','{"Verein X":"passend"}','Testa trug','Mikaelas Pässe','Rohtext');
insert into anwesenheit(datum,data) values ('2026-11-02','{"Testa":{"da":true},"Mikaela":{"da":false}}');
\echo '=== Klarnamen in den Views: keiner (Erwartet: 0 und 0)'
select count(*) as namen_in_views from (
  select row_to_json(e)::text t from export.tagebuch_eintrag e union all select row_to_json(e)::text from export.einheit_bewertung e
  union all select row_to_json(e)::text from export.event_bewertung e union all select row_to_json(e)::text from export.anwesenheit e) x
 where t ~* '(Testa|Mikaela)';
\echo '=== Ersetzung und Ausschluss: Beobachtung, Anwesende als Alias, kein Diktat, kein Rohtext'
select beobachtung, anwesend_alias, durchgefuehrt, schlagworte from export.tagebuch_eintrag;
select count(*) filter (where column_name in ('diktat','sprachnotiz','rueckfragen')) as verbotene_spalten from information_schema.columns where table_schema='export';
\echo '=== Verdacht: „Testi“ (Schreibvariante) wird gezählt, „Matte“ nicht (Erlaubt)'
select tabelle, id, feld, anzahl from export.namen_verdacht order by 1,2,3;
\echo '=== Variante gepflegt: danach kein Verdacht mehr und „Testi“ wird zu Kind A'
insert into export.name_variante(variante, alias) values ('Testi','A');
select count(*) as verdacht_danach from export.namen_verdacht;
select beobachtung like '%Kind A stand allein%' as variante_ersetzt from export.tagebuch_eintrag;
\echo '=== Rolle: lesen darf sie die Views (braucht dafür EXECUTE auf den Maskier-Funktionen, v807); Tabellen in public und Pflege-Tabellen nicht; schreiben nie'
set role adler_export_lese;
select count(*) as view_lesbar from export.tagebuch_eintrag;
select * from public.kader;
select * from public.tagebuch_eintrag;
select export.ohne_namen('Testa');   -- seit v807 erlaubt (Funktionen in Views brauchen EXECUTE des Aufrufers)
select * from export.name_variante;
insert into export.tagebuch_eintrag(datum) values ('2026-01-01');
update export.einheit_bewertung set spass = 1;
reset role;
\echo '=== Rolle ohne Passwort kann sich nicht anmelden; Merkmale: kein Superuser, kein RLS-Bypass, nur lesen'
select r.rolname, r.rolcanlogin, r.rolsuper, r.rolbypassrls, a.rolpassword is null as ohne_passwort from pg_roles r left join pg_authid a on a.rolname = r.rolname where r.rolname = 'adler_export_lese';
