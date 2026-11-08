-- v808 · Schreibvarianten von Kindernamen ohne Handarbeit (Charles 08.11.2026, Namensleck im Tagebuch-Export)
-- 1) Kölner Phonetik als Funktion (export.koelner).
-- 2) Varianten aus export.name_variante greifen nur noch als ganzes Wort in IHRER Schreibweise. Vorher ohne Rücksicht auf
--    Groß-/Kleinschreibung: Die großgeschriebene Variante eines Vornamens traf auch das gewöhnliche Wort in Kleinschreibung
--    (Tagebuch Nr. 8, Übung vom 06.11.).
-- 3) Ein Name ohne Buchstaben (alias leer, z. B. ein Gastkind, das nicht im Kader steht) wird zu „ein Kind“.
-- 4) Automatische Ersetzung (streng): Ein großgeschriebenes Wort ab vier Buchstaben wird als Name eines Kindes behandelt, wenn sein
--    Kölner Code gleich dem eines Vornamens ist UND höchstens ein Buchstabe abweicht – außer es steht in export.wort_erlaubt.
--    Ist es zwei Kindern gleich nah, wird es zu „ein Kind“. Wie oft das geschah, zählt export.namen_auto (ohne das Wort selbst).
--    Am Bestand vom 08.11.2026 gemessen: kein gewöhnliches Wort getroffen. Die lockerere Regel (Code gleich, bis drei Buchstaben)
--    hätte 81 Wörter falsch ersetzt („Team“, „Lauf“, „Auch“ …) – sie MELDET nur noch (export.namen_verdacht), ersetzt aber nicht.
-- 4a) export.namen_verdacht meldet zusätzlich Wörter mit gleichem Kölner Code (bis drei Buchstaben Abstand) und prüft jetzt auch
--    die Übungsbewertungen (trainings_eval) und die Vorlagen.
-- 5) Trainer pflegen Varianten und erlaubte Wörter aus der App: public.namen_schreibweisen(), public.namen_schreibweise_setzen().
-- Keine Namen in dieser Datei. Die Leserolle bleibt nur lesend.

create or replace function export.koelner(w text) returns text
language plpgsql immutable set search_path = pg_catalog as $$
declare s text := lower(coalesce(w,'')); r text := ''; i int; ch text; pr text; nx text; c text; o text := ''; last text := null;
begin
  s := translate(s, 'äöüß', 'aous');
  s := regexp_replace(s, '[^a-z]', '', 'g');
  for i in 1..length(s) loop
    ch := substr(s,i,1); pr := case when i>1 then substr(s,i-1,1) else '' end; nx := substr(s,i+1,1);
    c := case
      when ch in ('a','e','i','j','o','u','y') then '0'
      when ch = 'h' then ''
      when ch = 'b' then '1'
      when ch = 'p' then case when nx='h' then '3' else '1' end
      when ch in ('d','t') then case when nx in ('c','s','z') then '8' else '2' end
      when ch in ('f','v','w') then '3'
      when ch in ('g','k','q') then '4'
      when ch = 'c' then case when i=1 then case when nx in ('a','h','k','l','o','q','r','u','x') then '4' else '8' end
                              when pr in ('s','z') then '8' when nx in ('a','h','k','o','q','u','x') then '4' else '8' end
      when ch = 'x' then case when pr in ('c','k','q') then '8' else '48' end
      when ch = 'l' then '5'
      when ch in ('m','n') then '6'
      when ch = 'r' then '7'
      when ch in ('s','z') then '8'
      else '' end;
    r := r || c;
  end loop;
  -- doppelte Ziffern zusammenfassen, dann Nullen außer am Anfang streichen
  for i in 1..length(r) loop
    ch := substr(r,i,1);
    if last is null or ch <> last then o := o || ch; end if;
    last := ch;
  end loop;
  if o = '' then return ''; end if;
  return substr(o,1,1) || replace(substr(o,2), '0', '');
end $$;

alter table export.name_variante alter column alias drop not null;
insert into export.wort_erlaubt(wort) values ('Kind'), ('Charles'), ('Finn'), ('Kenneth'), ('Peter'), ('Markus'),
  ('Mutter'), ('Meteo'), ('Tonhöhe'), ('Logout'),
  ('Team'), ('Lauf'), ('Laufe'), ('Auch'), ('Außen'), ('Uhr'), ('Zum'), ('Thema'), ('Sein'), ('Auge'), ('Sohn'), ('Mach'), ('Ihre'), ('Mitt')
  on conflict do nothing;   -- Trainer und gewöhnliche Wörter, deren Kölner Code dem eines Vornamens gleicht (Bestand 08.11.2026)

-- Buchstabe des Kindes, dem ein Wort sicher ähnelt (Code gleich, höchstens ein Buchstabe Abstand, ab vier Buchstaben);
-- '?' wenn zwei Kinder gleich nah sind; null wenn keines.
create or replace function export.aehnlich_alias(tok text) returns text
language sql stable security definer set search_path = public, export, extensions as $$
  with k as (select alias, split_part(btrim(name),' ',1) as n from public.kader where alias is not null and length(split_part(btrim(name),' ',1)) >= 3),
  c as (select k.alias, extensions.levenshtein(lower(tok), lower(k.n)) as d from k
         where tok ~ '^[A-ZÄÖÜ][a-zäöüß]{3,}$' and lower(tok) <> lower(k.n)
           and export.koelner(tok) = export.koelner(k.n) and extensions.levenshtein(lower(tok), lower(k.n)) <= 1
           and not exists (select 1 from export.wort_erlaubt w where lower(w.wort) = lower(tok))
           and not exists (select 1 from export.name_variante v where v.variante = tok))
  select case when not exists (select 1 from c) then null
              when (select count(distinct alias) from c where d = (select min(d) from c)) = 1 then (select alias from c order by d limit 1)
              else '?' end
$$;

-- Schritt 1 und 2: Kader-Namen (ganzes Wort, ohne Rücksicht auf Groß-/Kleinschreibung) und gepflegte Varianten (ganzes Wort, nur ihre Schreibweise)
create or replace function export.ohne_namen_fest(t text) returns text
language plpgsql stable security definer set search_path = public, export, extensions as $$
declare r record; s text := t;
begin
  if s is null then return null; end if;
  for r in select btrim(k.name) as w, k.alias from public.kader k where btrim(k.name) <> '' and k.alias is not null loop
    if r.w ~ '^[[:alpha:]][[:alpha:] -]*$' then
      s := regexp_replace(s, '\m' || r.w || '(s)?\M', 'Kind ' || r.alias, 'gi');
    end if;
  end loop;
  for r in select v.variante as w, v.alias from export.name_variante v order by length(v.variante) desc loop
    if r.w ~ '^[[:alpha:]][[:alpha:] -]*$' then
      s := regexp_replace(s, '\m' || r.w || '\M', coalesce('Kind ' || r.alias, 'ein Kind'), 'g');
    end if;
  end loop;
  return s;
end $$;

-- Schritt 3: ähnliche Wörter
create or replace function export.ohne_namen(t text) returns text
language plpgsql stable security definer set search_path = public, export, extensions as $$
declare s text := export.ohne_namen_fest(t); tok text; a text;
begin
  if s is null then return null; end if;
  for tok in select distinct m[1] from regexp_matches(s, '\m([A-ZÄÖÜ][a-zäöüß]{2,})\M', 'g') as m loop
    a := export.aehnlich_alias(tok);
    if a is not null then
      s := regexp_replace(s, '\m' || tok || '\M', case when a = '?' then 'ein Kind' else 'Kind ' || a end, 'g');
    end if;
  end loop;
  return s;
end $$;

-- Wie viele Wörter Schritt 3 ersetzt hat – nur die Zahl, nie das Wort
create or replace function export.auto_anzahl(t text) returns int
language sql stable security definer set search_path = public, export, extensions as $$
  select count(*)::int from regexp_matches(coalesce(export.ohne_namen_fest(t),''), '\m([A-ZÄÖÜ][a-zäöüß]{2,})\M', 'g') as m
   where export.aehnlich_alias(m[1]) is not null
$$;

create or replace view export.namen_auto as
with q as (
  select 'tagebuch_eintrag'::text as tabelle, e.id::text as id, f.feld, f.t
    from public.tagebuch_eintrag e
    cross join lateral (values ('ausloeser', e.ausloeser), ('beobachtung', e.beobachtung), ('aha', e.aha), ('konsequenz', e.konsequenz), ('beleg', e.beleg), ('anschluss', e.anschluss)) f(feld, t)
  union all select 'tagebuch_punkt', p.id::text, 'text', p.text from public.tagebuch_punkt p
  union all select 'einheit_bewertung', b.datum::text || '/' || coalesce(b.autor,''), 'notiz', b.notiz from public.einheit_bewertung b
  union all select 'event_bewertung', b.termin_id::text, f.feld, f.t from public.event_bewertung b cross join lateral (values ('getragen', b.getragen), ('arbeiten', b.arbeiten)) f(feld, t)
  union all select 'trainings_eval', e.datum::text, 'data', e.data::text from public.trainings_eval e
  union all select 'trainingsplan', p.datum::text, 'kopf', p.kopf::text from public.trainingsplan p
  union all select 'trainingsformen', f.id::text, 'beschreibung', concat_ws(' ', f.kurz, f.ablauf, f.varianten, f.coaching) from public.trainingsformen f
  union all select 'trainingsvorlagen', v.id::text, 'vorlage', concat_ws(' ', v.name, v.leitfrage, v.beobachtung, v.bloecke::text) from public.trainingsvorlagen v
)
select tabelle, id, feld, export.auto_anzahl(t) as anzahl from q where t is not null and export.auto_anzahl(t) > 0;

-- Verdacht: wie v804 (Buchstabenabstand) plus gleicher Kölner Code bis drei Buchstaben; jetzt auch Übungsbewertungen und Vorlagen
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
)
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
 group by w.tabelle, w.id, w.feld;

revoke all on function export.koelner(text), export.aehnlich_alias(text), export.ohne_namen_fest(text), export.auto_anzahl(text) from public, anon, authenticated;
grant execute on function export.koelner(text), export.aehnlich_alias(text), export.ohne_namen_fest(text), export.auto_anzahl(text), export.ohne_namen(text) to adler_export_lese;
revoke all on export.namen_auto, export.namen_verdacht from public, anon, authenticated;
grant select on export.namen_auto, export.namen_verdacht to adler_export_lese;

-- App: Trainer lesen und pflegen Varianten und erlaubte Wörter (die Tabellen selbst bleiben ohne Policy)
create or replace function public.namen_schreibweisen() returns table(art text, wort text, alias text)
language sql stable security definer set search_path = public, export as $$
  select 'name'::text, v.variante, v.alias from export.name_variante v where public.is_trainer()
  union all
  select 'wort'::text, w.wort, null::text from export.wort_erlaubt w where public.is_trainer()
$$;

create or replace function public.namen_schreibweise_setzen(p_wort text, p_art text, p_alias text default null) returns void
language plpgsql security definer set search_path = public, export as $$
begin
  if not public.is_trainer() then raise exception 'nur für das Trainerteam'; end if;
  p_wort := btrim(coalesce(p_wort,''));
  if p_wort !~ '^[[:alpha:]][[:alpha:] -]*$' or length(p_wort) > 40 then raise exception 'ungültiges Wort'; end if;
  if p_art = 'name' then
    if p_alias is not null and not exists (select 1 from public.kader where alias = p_alias) then raise exception 'unbekanntes Kind'; end if;
    delete from export.wort_erlaubt where lower(wort) = lower(p_wort);
    insert into export.name_variante(variante, alias, hinweis)
      values (p_wort, p_alias, 'App, ' || to_char(now() at time zone 'Europe/Berlin', 'DD.MM.YYYY'))
      on conflict (variante) do update set alias = excluded.alias, hinweis = excluded.hinweis;
  elsif p_art = 'wort' then
    delete from export.name_variante where variante = p_wort;
    insert into export.wort_erlaubt(wort) values (p_wort) on conflict do nothing;
  elsif p_art = 'loeschen' then
    delete from export.name_variante where variante = p_wort;
    delete from export.wort_erlaubt where wort = p_wort;
  else
    raise exception 'unbekannte Art';
  end if;
end $$;

revoke all on function public.namen_schreibweisen(), public.namen_schreibweise_setzen(text, text, text) from public, anon;
grant execute on function public.namen_schreibweisen(), public.namen_schreibweise_setzen(text, text, text) to authenticated;
