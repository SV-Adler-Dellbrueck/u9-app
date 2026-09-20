-- Kinder-App, Schritt 5 (v593): die eigene Adler-Karte auf dem Kindergeraet
--
-- Befund beim Bau von Schritt 5: my_child_card() prueft nur `is_trainer() or is_parent_of`.
-- Auf dem Kindergeraet gibt sie deshalb null zurueck - die Kachel „Meine Karte", eine der
-- zentralen der Kabine, antwortet dort mit einer Fehlermeldung. Das Auftragspaket listete
-- den RPC in Schritt 1 nicht auf (er wird aus md-eltern-portal.js gerufen, nicht aus
-- md-kabine.js), deshalb blieb er in Schritt 2 unveraendert.
--
-- my_child_card() einfach um `is_kind_selbst` zu erweitern waere der kurze Weg, schickte
-- dem Kind aber seine Bewertungsrohwerte (`radios`) ueber die Leitung. Gezeichnet werden
-- daraus nur die drei Staerke-Abzeichen - genau derselbe Fall wie bei team_gallery(), und
-- er bekommt dieselbe Antwort: eine Fassung, die die Merkmale serverseitig sortiert und
-- nur deren Schluessel schickt.
--
-- Die Sortierung stand dafuer bisher in team_gallery_kind(). Sie zieht hier in eine eigene
-- Funktion um, statt ein zweites Mal zu existieren; team_gallery_kind() ruft sie jetzt auf
-- und liefert Wort fuer Wort dasselbe wie vorher.

-- ── 1 · Die drei staerksten Merkmale eines Kindes, als Schluessel ────────────
-- Torwart-Merkmale (tw_*) und Nullwerte bleiben draussen; bei Gleichstand entscheidet der
-- Schluesselname, damit die Reihenfolge stabil ist.
create or replace function public.staerken_von(p_name text)
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select coalesce((
    select jsonb_agg(e.key order by e.wert desc, e.key)
      from (select kv.key, (kv.value)::int as wert
              from jsonb_each_text(coalesce(
                   (select sp.radios from public.spielerprofile sp
                     where sp.name = p_name order by sp.datum desc nulls last limit 1),
                   '{}'::jsonb)) kv
             where kv.key like 'f\_%' and kv.value ~ '^[0-9]+$' and (kv.value)::int > 0
             order by (kv.value)::int desc, kv.key limit 3) e), '[]'::jsonb);
$fn$;

-- ── 2 · team_gallery_kind() nutzt sie jetzt ─────────────────────────────────
create or replace function public.team_gallery_kind()
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select case when not public.sitzung_gueltig() then '[]'::jsonb
              else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
      'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
      'staerken', public.staerken_von(k.name),
      'foto_path', case when coalesce(f.gallery_optin,false) or coalesce(k.foto_stadionheft_ok,false)
                        then coalesce(f.foto_path, k.foto_path) else null end,
      'trainings', (select count(*) from public.anwesenheit a
                     where (coalesce(a.data->(k.id::text), a.data->k.name)->>'da')='true')
    ) as g
    from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id
    where k.aktiv) x;
$fn$;

-- ── 3 · Die eigene Karte, ohne Zahlen ───────────────────────────────────────
-- Feld fuer Feld my_child_card(), nur: `staerken` statt `radios`, und `is_kind_selbst`
-- steht in der Pruefung. Die Zaehler (Tore, Paraden, Aktionen, Spiele, Trainings, Quiz)
-- bleiben - das ist eine Statistik ueber das, was das Kind selbst getan hat, keine
-- Bewertung durch einen Erwachsenen. Sie stehen heute schon auf der Karte im Eltern-Bereich.
create or replace function public.my_child_card_kind(p_spieler bigint)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $fn$
declare v_k record; v_snap record; v_f record; v_name text; v_id text;
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler) or public.is_kind_selbst(p_spieler))
    then return null; end if;
  select id,name,nr,tw,geb,foto_path,starker_fuss,lieblingsposition into v_k
    from public.kader where id=p_spieler;
  if v_k.id is null then return null; end if;
  v_name := v_k.name; v_id := p_spieler::text;
  select position as snap_position, prim_rolle, strong_foot, age into v_snap
    from public.spielerprofile where name=v_name order by datum desc nulls last limit 1;
  select spitzname, lieblingsverein, lieblingsspieler, foto_path into v_f
    from public.kind_fanfacts where spieler_id=p_spieler;
  return jsonb_build_object(
    'name', v_k.name, 'nr', v_k.nr, 'tw', v_k.tw, 'geb', v_k.geb,
    'foto_path', coalesce(v_f.foto_path, v_k.foto_path),
    'starker_fuss', v_k.starker_fuss, 'lieblingsposition', v_k.lieblingsposition,
    'spitzname', v_f.spitzname, 'lieblingsverein', v_f.lieblingsverein, 'lieblingsspieler', v_f.lieblingsspieler,
    'staerken', public.staerken_von(v_name),
    'snap_position', v_snap.snap_position, 'prim_rolle', v_snap.prim_rolle,
    'strong_foot', v_snap.strong_foot, 'age', v_snap.age,
    'stats', jsonb_build_object(
      'tore',       (select count(*) from public.match_actions where spieler=v_name and aktion='tor'),
      'paraden',    (select count(*) from public.match_actions where spieler=v_name and aktion='parade'),
      'aktionen',   (select count(*) from public.match_actions where spieler=v_name and aktion in ('pass','dribbling','gewinn','parade','aufbau','heraus','tor')),
      'spiele',     (select count(*) from public.nominierungen where coalesce(data->>v_id, data->>v_name) = 'dabei'),
      'trainings',  (select count(*) from public.anwesenheit a where (coalesce(a.data->v_id, a.data->v_name)->>'da')='true'),
      'quizRichtig',coalesce((select sum(score) from public.quiz_progress where player=v_name),0),
      'quizBloecke',(select count(*) from public.quiz_progress where player=v_name)
    )
  );
end $fn$;

grant execute on function public.staerken_von(text)          to authenticated;
grant execute on function public.my_child_card_kind(bigint)  to authenticated;
