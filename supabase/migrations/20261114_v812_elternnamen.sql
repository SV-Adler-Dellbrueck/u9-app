-- v812 · Elternnamen verlassen die App nicht (Charles 08.11.2026: „Mach das“).
-- Bisher ersetzte der Export nur Kindernamen. Jetzt auch:
--   1. Namen, die in der App zu Eltern hinterlegt sind (Elternangaben, Anzeigename der Eltern-Profile, Kontakte am
--      Kind, Helfer-Einträge): voller Name und jeder Teil (Vorname, Nachname) → „ein Elternteil“.
--      Ausgenommen: Trainer-Namen, Wörter aus export.wort_erlaubt und Kader-Vornamen.
--   2. Unbekannte Namen hinter „Vater“, „Mutter“, „Papa“, „Mama“, „Opa“, „Oma“, „Onkel“, „Tante“: das Wort danach fällt weg
--      („Vater Dave“ → „Vater“), außer es ist „Kind“ oder steht in export.wort_erlaubt („dem Vater Bescheid“ bleibt).
-- Dieselbe Regel gilt in der App (namenNachbessern in core.js); die Liste kommt über namen_schreibweisen() mit art = 'eltern'.

insert into export.wort_erlaubt(wort) values
  ('Bescheid'), ('Feedback'), ('Fragen'), ('Frage'), ('Rückmeldung'), ('Tipps'), ('Tipp'), ('Hinweise'), ('Hinweis'),
  ('Danke'), ('Kinder'), ('Sohn'), ('Tochter'), ('Training'), ('Trainer'), ('Recht'), ('Zeit'), ('Lust'), ('Angst'), ('Sorgen')
on conflict do nothing;

create or replace function export.erwachsene_namen() returns table(wort text)
language sql stable security definer set search_path = public, export as $$
  with roh as (
    select btrim(concat_ws(' ', ea.vorname, ea.nachname)) as n from public.eltern_angaben ea
    union all select btrim(p.anzeigename) from public.profiles p where p.role = 'parent'
    union all select btrim(k.name) from public.kind_kontakte k
    union all select btrim(h.name) from public.event_helfer h
  ), teile as (
    select n from roh where n is not null
    union select t from roh, regexp_split_to_table(coalesce(roh.n, ''), '\s+') t
  ), trainer as (
    select lower(t) as t from public.profiles p, regexp_split_to_table(btrim(coalesce(p.anzeigename, '')), '\s+') t
     where p.role is distinct from 'parent'
  )
  select distinct n from teile
   where n ~ '^[A-ZÄÖÜ][[:alpha:]]+([ -][A-ZÄÖÜ][[:alpha:]]+)*$' and length(n) >= 3
     and n !~ '^(Vater|Mutter|Papa|Mama|Opa|Oma|Onkel|Tante|Herr|Frau)$'
     and lower(n) not in (select t from trainer where t <> '')
     and not exists (select 1 from export.wort_erlaubt w where lower(w.wort) = lower(n))
     and not exists (select 1 from public.kader k where lower(split_part(btrim(k.name), ' ', 1)) = lower(n))
$$;

create or replace function export.ohne_erwachsene(t text) returns text
language plpgsql stable security definer set search_path = public, export as $$
declare s text := t; r record; m text[];
begin
  if s is null then return null; end if;
  for r in select e.wort from export.erwachsene_namen() e order by length(e.wort) desc loop
    s := regexp_replace(s, '\m' || r.wort || '(s)?\M', 'ein Elternteil', 'g');
  end loop;
  for m in select distinct x from regexp_matches(s, '\m(Vater|Mutter|Papa|Mama|Opa|Oma|Onkel|Tante)\s+([A-ZÄÖÜ][a-zäöüß]{2,})\M', 'g') as x loop
    if m[2] <> 'Kind' and not exists (select 1 from export.wort_erlaubt w where lower(w.wort) = lower(m[2])) then
      s := regexp_replace(s, '\m' || m[1] || '\s+' || m[2] || '\M', m[1], 'g');
    end if;
  end loop;
  return s;
end $$;

-- wie v808, dazu Schritt 2b (Erwachsene) vor den ähnlichen Wörtern
create or replace function export.ohne_namen(t text) returns text
language plpgsql stable security definer set search_path = public, export, extensions as $$
declare s text := export.ohne_erwachsene(export.ohne_namen_fest(t)); tok text; a text;
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

create or replace function public.namen_schreibweisen() returns table(art text, wort text, alias text)
language sql stable security definer set search_path = public, export as $$
  select 'name'::text, v.variante, v.alias from export.name_variante v where public.is_trainer()
  union all
  select 'wort'::text, w.wort, null::text from export.wort_erlaubt w where public.is_trainer()
  union all
  select 'eltern'::text, e.wort, null::text from export.erwachsene_namen() e where public.is_trainer()
$$;

revoke all on function export.erwachsene_namen(), export.ohne_erwachsene(text) from public, anon, authenticated;
grant execute on function export.erwachsene_namen(), export.ohne_erwachsene(text), export.ohne_namen(text) to adler_export_lese;
