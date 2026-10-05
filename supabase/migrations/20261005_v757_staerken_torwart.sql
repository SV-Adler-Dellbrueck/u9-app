-- v757 · Stärken auf den Karten als feste Kategorien, Torwart-Thema nur bei „Torwart 1. Wahl“
-- Charles 04.10.: „Dann die Stärken erstmal … Kategorien vorab festlegen, aus denen die Trainer wählen können.“ und
-- „Unsere Torhüter sind auch Feldspieler. Wir haben keinen festen Torwart.“
--
-- 1) kader.staerken_manuell: bis zu drei Schlüssel aus den Karten-Abzeichen (f_pass, f_tempo …), vom Trainerteam im Kinderprofil
--    gewählt. staerken_von() liefert sie zuerst; ohne Auswahl bleibt es bei der Berechnung aus der Einschätzung.
--    Kein Freitext, nur Schlüssel der Form f_<kleinbuchstaben>, höchstens drei.
-- 2) Karten-Funktionen liefern zusätzlich 'tw_prio' neben 'tw', damit nur „Torwart 1. Wahl“ das gelbe Torwart-Thema trägt.
--    Die Funktionen werden aus ihrer jetzigen Definition umgeschrieben (nur 'tw' → 'tw','tw_prio' und die Spaltenliste von
--    v_k); wiederholbar, weil schon umgeschriebene Funktionen übersprungen werden.

alter table public.kader add column if not exists staerken_manuell jsonb;
comment on column public.kader.staerken_manuell is 'v757: Stärken auf der Karte, vom Trainerteam gewählt (bis zu drei Schlüssel der Karten-Abzeichen, z. B. ["f_pass","f_tempo"]); leer/NULL = aus der Einschätzung berechnet';
alter table public.kader drop constraint if exists kader_staerken_manuell_ok;
alter table public.kader add constraint kader_staerken_manuell_ok check (
  staerken_manuell is null
  or (jsonb_typeof(staerken_manuell) = 'array' and jsonb_array_length(staerken_manuell) <= 3
      and staerken_manuell::text ~ '^\[("f_[a-z]+"(, ?"f_[a-z]+"){0,2})?\]$'));

create or replace function public.staerken_von(p_name text) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select k.staerken_manuell from public.kader k
      where k.name = p_name and jsonb_typeof(k.staerken_manuell) = 'array' and jsonb_array_length(k.staerken_manuell) > 0
      limit 1),
    coalesce((
      select jsonb_agg(e.key order by e.wert desc, e.key)
        from (select kv.key, (kv.value)::int as wert
                from jsonb_each_text(coalesce(
                     (select sp.radios from public.spielerprofile sp
                       where sp.name = p_name order by sp.datum desc nulls last limit 1),
                     '{}'::jsonb)) kv
               where kv.key like 'f\_%' and kv.value ~ '^[0-9]+$' and (kv.value)::int > 0
               order by (kv.value)::int desc, kv.key limit 3) e), '[]'::jsonb));
$$;

do $$
declare f text; d text; n text;
begin
  foreach f in array array['my_child_card','my_child_card_kind','team_gallery','team_gallery_kind','heft_ausgabe_lesen'] loop
    for d in select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace s on s.oid = p.pronamespace
              where s.nspname = 'public' and p.proname = f and p.prokind = 'f' loop
      continue when d ~ 'tw_prio';
      n := regexp_replace(d, '''tw'', *([a-z_]+)\.tw', '''tw'', \1.tw, ''tw_prio'', \1.tw_prio', 'g');
      n := regexp_replace(n, 'select id,name,nr,tw,', 'select id,name,nr,tw,tw_prio,', 'g');
      if n <> d then execute n; end if;
    end loop;
  end loop;
end $$;
