-- v757 · Stärken manuell, tw_prio in den Karten-Funktionen (nach Attrappe und v757 einspielen; siehe README)
\set ON_ERROR_STOP 0
\echo '=== Stärken: Auswahl geht vor, ohne Auswahl die Berechnung, ungültige Auswahl scheitert (Fehler gewollt)'
insert into kader(id,name,nr,aktiv,tw,tw_prio) values (1,'Kind A',6,true,false,0),(2,'Kind B',7,true,true,2),(3,'Kind C',8,true,true,1),(4,'Kind D',9,true,true,0);
insert into spielerprofile(name,datum,radios) values ('Kind A','2026-09-01','{"f_pass":4,"f_tempo":2,"f_raum":3,"f_selbst":1}'),('Kind B','2026-09-01','{"f_pass":1}');
select name, public.staerken_von(name) from (values ('Kind A'),('Kind B')) t(name) order by 1;
update kader set staerken_manuell='["f_koord","f_sozial"]' where id=1;
select public.staerken_von('Kind A') as mit_auswahl;
update kader set staerken_manuell='[]' where id=1;
select public.staerken_von('Kind A') as leere_auswahl;
update kader set staerken_manuell='["f_a","f_b","f_c","f_d"]' where id=1;
update kader set staerken_manuell='["Hallo Welt"]' where id=1;
update kader set staerken_manuell='"f_pass"' where id=1;
update kader set staerken_manuell='["f_pass"]' where id=1;
select staerken_manuell from kader where id=1;
\echo '=== Karten-Funktionen liefern tw_prio (Kind B Rang 2, Kind C Rang 1, Kind D „kann ins Tor“)'
select (x->>'name') name, (x->>'tw') tw, (x->>'tw_prio') tw_prio from jsonb_array_elements(public.team_gallery_kind()) x order by 1;
select public.my_child_card(3)->>'tw_prio' as eigene_karte_c;
select proname, pg_get_functiondef(p.oid) ~ 'tw_prio' as hat_prio from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('team_gallery_kind','my_child_card','not_vorhanden') order by 1;
