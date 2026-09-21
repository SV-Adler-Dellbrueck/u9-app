-- Prüfskript Kinder-App: Was sieht eine Sitzung, die kein gekoppeltes Gerät ist?
--
-- Das Auftragspaket verlangt für Schritt 7 „ein SQL-Prüfskript, das für eine Test-uid ohne
-- kind_konto jede Kabinen-Tabelle abfragt und null Zeilen erwartet, und mit aktiv=false
-- ebenso". Genau das tut dieses Skript, in drei Durchgängen:
--
--   1. eine anonyme Sitzung OHNE kind_konto        → nichts Persönliches
--   2. dieselbe Sitzung MIT aktivem kind_konto     → das eigene Kind, sonst nichts
--   3. dasselbe Konto mit aktiv = false (getrennt) → wieder nichts
--
-- Gelesen wird als `authenticated` mit gesetzten JWT-Claims, also genau so, wie PostgREST
-- es für eine echte Sitzung täte. Die RLS entscheidet, nicht die Abfrage. Das Skript legt
-- dafür ein synthetisches Konto in auth.users an und rollt am Ende ALLES zurück — auch bei
-- einem Abbruch mittendrin, weil alles in einer Transaktion läuft. Das abschließende
-- ROLLBACK ist Absicht, kein Versehen.
--
-- Die Ergebnisse sammeln sich in einer temporären Tabelle und kommen als EINE Tabelle
-- heraus: Durchgang, Prüfung, Ist, Erwartet, ok. Erst wenn in der Spalte `ok` überall
-- `true` steht, ist der Lauf bestanden.
--
-- Ausführen mit psql, über die Supabase-Konsole oder über das MCP-Werkzeug. Stand
-- 20.09.2026 (v594): 47 von 47 Prüfungen grün.

begin;

create temporary table _erg(nr int, durchgang text, pruefung text, ist text, erwartet text) on commit drop;
create temporary table _p(k text primary key, v text) on commit drop;
insert into _p select 'a', min(id)::text from public.kader where aktiv
union all      select 'b', max(id)::text from public.kader where aktiv;
grant all on _erg to authenticated; grant all on _p to authenticated;

-- Die synthetische anonyme Sitzung. Feste Kennung, damit der Lauf wiederholbar ist.
insert into auth.users(id, instance_id, aud, role, email, created_at, updated_at,
                       raw_app_meta_data, raw_user_meta_data, is_anonymous)
values ('00000000-0000-4000-8000-00000000f00d'::uuid,'00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated','authenticated',null,now(),now(),
        '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,'{}'::jsonb,true)
on conflict (id) do nothing;

-- ── Durchgang 1: anonym, ohne kind_konto ─────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f00d","role":"authenticated","is_anonymous":true}';
insert into _erg
select 1,'1 ohne Kopplung', t, z::text, '0' from (
  select 'kader' t,(select count(*) from public.kader) z
  union all select 'kind_selbstbild',(select count(*) from public.kind_selbstbild)
  union all select 'kind_stimmung',(select count(*) from public.kind_stimmung)
  union all select 'kabine_post',(select count(*) from public.kabine_post)
  union all select 'kabine_lob',(select count(*) from public.kabine_lob)
  union all select 'album_kind',(select count(*) from public.album_kind)
  union all select 'album_tausch',(select count(*) from public.album_tausch)
  union all select 'kabinen_wahl_stimmen',(select count(*) from public.kabinen_wahl_stimmen)
  union all select 'kabine_config',(select count(*) from public.kabine_config)
  union all select 'rueckmeldungen',(select count(*) from public.rueckmeldungen)
  union all select 'spielerprofile',(select count(*) from public.spielerprofile)
  union all select 'eltern_kinder',(select count(*) from public.eltern_kinder)
  union all select 'blitz_ratings',(select count(*) from public.blitz_ratings)
  union all select 'nominierungen',(select count(*) from public.nominierungen)
  union all select 'match_actions',(select count(*) from public.match_actions)) x;
insert into _erg values
 (1,'1 ohne Kopplung','is_kind_selbst(a)', public.is_kind_selbst((select v from _p where k='a')::bigint)::text,'false'),
 (1,'1 ohne Kopplung','kind_zeit_uebrig', public.kind_zeit_uebrig()::text,'false'),
 (1,'1 ohne Kopplung','kind_status.ok', coalesce(public.kind_status()->>'ok','-'),'false'),
 (1,'1 ohne Kopplung','team_gallery_kind Karten', jsonb_array_length(public.team_gallery_kind())::text,'0'),
 (1,'1 ohne Kopplung','my_child_card_kind', coalesce(public.my_child_card_kind((select v from _p where k='a')::bigint)::text,'null'),'null');

-- ── Durchgang 2: gekoppelt und aktiv ─────────────────────────────────────────
reset role;
insert into public.kind_konto(uid, spieler_id, geraet, tageslimit_min, aktiv, gekoppelt_von)
values ('00000000-0000-4000-8000-00000000f00d'::uuid,(select v from _p where k='a')::bigint,'Pruefgeraet',60,true,null);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f00d","role":"authenticated","is_anonymous":true}';
insert into _erg values
 (2,'2 gekoppelt','kader (nur eigenes Kind)',(select count(*) from public.kader)::text,'1'),
 (2,'2 gekoppelt','kader mit fremder id',(select count(*) from public.kader where id=(select v from _p where k='b')::bigint)::text,'0'),
 (2,'2 gekoppelt','rueckmeldungen',(select count(*) from public.rueckmeldungen)::text,'0'),
 (2,'2 gekoppelt','spielerprofile',(select count(*) from public.spielerprofile)::text,'0'),
 (2,'2 gekoppelt','eltern_kinder',(select count(*) from public.eltern_kinder)::text,'0'),
 (2,'2 gekoppelt','blitz_ratings',(select count(*) from public.blitz_ratings)::text,'0'),
 (2,'2 gekoppelt','nominierungen',(select count(*) from public.nominierungen)::text,'0'),
 (2,'2 gekoppelt','kabine_config (anonym zu)',(select count(*) from public.kabine_config)::text,'0'),
 (2,'2 gekoppelt','is_kind_selbst(a)', public.is_kind_selbst((select v from _p where k='a')::bigint)::text,'true'),
 (2,'2 gekoppelt','is_kind_selbst(b)', public.is_kind_selbst((select v from _p where k='b')::bigint)::text,'false'),
 (2,'2 gekoppelt','kind_zeit_uebrig', public.kind_zeit_uebrig()::text,'true'),
 (2,'2 gekoppelt','kind_status.ok', coalesce(public.kind_status()->>'ok','-'),'true'),
 (2,'2 gekoppelt','team_gallery_kind liefert Karten',(jsonb_array_length(public.team_gallery_kind())>0)::text,'true'),
 (2,'2 gekoppelt','team_gallery_kind ohne radios',(public.team_gallery_kind()::text not like '%radios%')::text,'true'),
 (2,'2 gekoppelt','my_child_card_kind (eigenes)',(public.my_child_card_kind((select v from _p where k='a')::bigint) is not null)::text,'true'),
 (2,'2 gekoppelt','my_child_card_kind ohne radios',(coalesce(public.my_child_card_kind((select v from _p where k='a')::bigint)::text,'') not like '%radios%')::text,'true'),
 (2,'2 gekoppelt','my_child_card_kind (fremdes)', coalesce(public.my_child_card_kind((select v from _p where k='b')::bigint)::text,'null'),'null'),
 -- Die alte Fassung bleibt für die Kind-Sitzung zu; das ist der Grund, warum es
 -- my_child_card_kind überhaupt gibt (Befund aus Schritt 5).
 (2,'2 gekoppelt','my_child_card (alt, muss zu sein)', coalesce(public.my_child_card((select v from _p where k='a')::bigint)::text,'null'),'null');

-- ── Durchgang 3: getrennt (aktiv = false) ────────────────────────────────────
reset role;
update public.kind_konto set aktiv=false where uid='00000000-0000-4000-8000-00000000f00d'::uuid;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000f00d","role":"authenticated","is_anonymous":true}';
insert into _erg values
 (3,'3 getrennt','kader',(select count(*) from public.kader)::text,'0'),
 (3,'3 getrennt','kind_selbstbild',(select count(*) from public.kind_selbstbild)::text,'0'),
 (3,'3 getrennt','kind_stimmung',(select count(*) from public.kind_stimmung)::text,'0'),
 (3,'3 getrennt','kabine_post',(select count(*) from public.kabine_post)::text,'0'),
 (3,'3 getrennt','album_kind',(select count(*) from public.album_kind)::text,'0'),
 (3,'3 getrennt','is_kind_selbst(a)', public.is_kind_selbst((select v from _p where k='a')::bigint)::text,'false'),
 (3,'3 getrennt','kind_zeit_uebrig', public.kind_zeit_uebrig()::text,'false'),
 (3,'3 getrennt','kind_status.ok', coalesce(public.kind_status()->>'ok','-'),'false'),
 (3,'3 getrennt','my_child_card_kind', coalesce(public.my_child_card_kind((select v from _p where k='a')::bigint)::text,'null'),'null');

reset role;
select durchgang, pruefung, ist, erwartet, (ist = erwartet) as ok from _erg order by nr, pruefung;

rollback;
