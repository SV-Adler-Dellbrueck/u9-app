-- v978 · Unbekannte Kindernamen im Zusammenhang erkennen (Charles 26.11.2026: ein Vorname in einer Randnotiz – „Eltern von …“ –
-- ging im Export hinaus; namen_auto und namens_verdacht waren leer).
-- Ursache: Das Kind steht in keiner Namensliste (nicht im Kader, nicht bei Probe- oder Gastkindern, keine Schreibvariante). Die
-- Erkennung kennt nur Namen, die sie vergleichen kann – ein fremder Vorname hat weder gleichen Kölner Code noch kleinen Abstand.
-- Neu: export.namen_verdacht meldet zusätzlich großgeschriebene Wörter in typischen Zusammenhängen, in denen ein Kind genannt wird:
--   1. hinter „Eltern/Mutter/Vater/Mama/Papa/Oma/Opa/Familie/Bruder/Schwester/Freund/Freundin von“ („Eltern von X“)
--   2. als Genitiv davor („Xs Eltern“, „X’ Mutter“, „X’s Papa“)
-- Ausgenommen: „Kind“ (schon ersetzt), Wörter aus export.wort_erlaubt (auch Trainer) und eine kurze Liste gewöhnlicher Wörter
-- („Eltern von Kindern“, „von Anfang“). Gemeldet wird nur die Zahl – das Wort selbst verlässt die Datenbank nicht.
-- Ersetzt wird hier bewusst nichts: Hinter „von“ stehen auch gewöhnliche Hauptwörter. Wer den Namen kennt, trägt ihn in der App als
-- Schreibweise ein („ein Kind“, ohne Buchstaben) oder ergänzt das Kind im Kader – dann ersetzt der Export ihn selbst.
-- Keine Namen in dieser Datei. Die Leserolle bleibt nur lesend.

create or replace function export.kontext_verdacht(t text) returns int
language sql stable security definer set search_path = public, export as $$
  with s as (select export.ohne_namen(t) as s),
  roh as (
    select m[1] as tok from s, regexp_matches(s.s, '\m(?:Eltern|Mutter|Vater|Mama|Papa|Oma|Opa|Familie|Bruder|Schwester|Freund|Freundin)\s+von\s+([A-ZÄÖÜ][a-zäöüß]{2,})\M', 'g') as m
    union all
    select regexp_replace(m[1], 's$', '') from s, regexp_matches(s.s, '\m([A-ZÄÖÜ][a-zäöüß]{2,})(?:’s|''s|’|'')?\s+(?:Eltern|Mutter|Vater|Mama|Papa|Oma|Opa|Familie|Bruder|Schwester)\M', 'g') as m
     where m[1] ~ 's$' or s.s ~ ('\m' || m[1] || '(’s|''s|’|'')')
  )
  select count(*)::int from roh
   where tok is not null and tok !~ '^Kind'
     and tok not in ('Anfang','Kindern','Kinder','Spielern','Spieler','Jungs','Mädchen','Gastkindern','Gegner','Gegnern','Team','Trainer','Zeit','Seiten')
     and not exists (select 1 from export.wort_erlaubt w where lower(w.wort) in (lower(roh.tok), lower(roh.tok) || 's'))
$$;
revoke all on function export.kontext_verdacht(text) from public, anon, authenticated;
grant execute on function export.kontext_verdacht(text) to adler_export_lese;   -- wie v812: Funktionen in einer Ansicht prüft Postgres beim Leser

create or replace view export.namen_verdacht as
with q as (
  select 'tagebuch_eintrag'::text as tabelle, e.id::text as id, f.feld, f.t from public.tagebuch_eintrag e
    cross join lateral (values ('ausloeser', e.ausloeser), ('beobachtung', e.beobachtung), ('aha', e.aha), ('konsequenz', e.konsequenz), ('beleg', e.beleg), ('anschluss', e.anschluss)) f(feld, t)
  union all select 'tagebuch_punkt', p.id::text, 'text', p.text from public.tagebuch_punkt p
  union all select 'einheit_bewertung', b.datum::text || '/' || coalesce(b.autor, ''), 'notiz', b.notiz from public.einheit_bewertung b
  union all select 'event_bewertung', b.termin_id::text, f.feld, f.t from public.event_bewertung b
    cross join lateral (values ('getragen', b.getragen), ('arbeiten', b.arbeiten)) f(feld, t)
  union all select 'trainings_eval', e.datum::text, 'data', e.data::text from public.trainings_eval e
  union all select 'trainingsplan', p.datum::text, 'kopf', p.kopf::text from public.trainingsplan p
  union all select 'trainingsformen', f.id::text, 'beschreibung', concat_ws(' ', f.kurz, f.ablauf, f.varianten, f.coaching) from public.trainingsformen f
  union all select 'trainingsvorlagen', v.id::text, 'vorlage', concat_ws(' ', v.name, v.leitfrage, v.beobachtung, v.bloecke::text) from public.trainingsvorlagen v
), w as (
  select q.tabelle, q.id, q.feld, m.tok[1] as tok
    from q cross join lateral regexp_matches(export.ohne_namen(q.t), '\m[A-ZÄÖÜ][a-zäöüß]{2,}\M', 'g') as m(tok)
   where q.t is not null
), aehnlich as (   -- wie v808: ähnlich einem Kader-Vornamen
  select w.tabelle, w.id, w.feld, count(*)::int as anzahl
    from w
   where w.tok <> 'Kind'
     and exists (select 1 from public.kader k
                  where k.alias is not null and length(split_part(btrim(k.name),' ',1)) >= 3
                    and lower(w.tok) <> lower(split_part(btrim(k.name),' ',1))
                    and (   (length(w.tok) >= 4 and length(btrim(k.name)) >= 4
                             and extensions.levenshtein(lower(w.tok), lower(btrim(k.name))) <= case when length(btrim(k.name)) <= 5 then 1 else 2 end)
                         or (export.koelner(w.tok) = export.koelner(split_part(btrim(k.name),' ',1))
                             and extensions.levenshtein(lower(w.tok), lower(split_part(btrim(k.name),' ',1))) <= 3)))
     and not exists (select 1 from export.wort_erlaubt a where lower(a.wort) = lower(w.tok))
     and not exists (select 1 from export.name_variante v where v.variante = w.tok)
   group by w.tabelle, w.id, w.feld
), kontext as (   -- v978: unbekannter Name im Zusammenhang („Eltern von X“, „Xs Eltern“)
  select q.tabelle, q.id, q.feld, export.kontext_verdacht(q.t) as anzahl from q where q.t is not null and q.t ~ '(Eltern|Mutter|Vater|Mama|Papa|Oma|Opa|Familie|Bruder|Schwester|Freund)'
)
select tabelle, id, feld, sum(anzahl)::int as anzahl
  from (select * from aehnlich union all select * from kontext where anzahl > 0) x
 group by tabelle, id, feld;
