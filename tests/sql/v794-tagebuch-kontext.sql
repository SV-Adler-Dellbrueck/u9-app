-- v794 · Tagebuch: durchgefuehrt und anwesend (nach Attrappe, Tabelle tagebuch_eintrag und Migration 20261107_v794 einspielen)
\set ON_ERROR_STOP 0
\echo '=== Spalten und Vorgaben'
select column_name, data_type, column_default from information_schema.columns where table_name='tagebuch_eintrag' and column_name in ('durchgefuehrt','anwesend') order by 1;
insert into tagebuch_eintrag(autor,datum,quelle,baustein,ausloeser,aha,konsequenz) values ('T','2026-11-06','einheit','ich','x','y','z');
select durchgefuehrt, anwesend from tagebuch_eintrag;
update tagebuch_eintrag set durchgefuehrt='[{"name":"A","block":"Hauptteil"}]', anwesend='{1,2,3}';
select jsonb_array_length(durchgefuehrt) as n_uebungen, cardinality(anwesend) as n_kinder from tagebuch_eintrag;
\echo '--- kein Array (muss scheitern)'
update tagebuch_eintrag set durchgefuehrt='{"name":"A"}';
