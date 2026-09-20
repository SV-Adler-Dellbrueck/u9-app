-- Kinder-App, Schritt 3a: der Riegel vor der anonymen Anmeldung
--
-- Die Kinder-App braucht anonyme Konten (ein Kindergeraet hat keine E-Mail). Supabase
-- gibt anonymen Sitzungen aber dieselbe Rolle wie jedem angemeldeten Elternteil:
-- `authenticated`. Mehrere Regeln pruefen nur, OB jemand angemeldet ist, nicht WER -
-- sie wuerden sich mit dem Haekchen fuer jeden oeffnen, der den oeffentlichen
-- App-Schluessel aus dem Quelltext liest.
--
-- Gemessen am Bestand vor dieser Migration:
--   team_gallery()   darf `authenticated` aufrufen und liefert Namen, Nummern,
--                    Fotopfade UND die Bewertungswerte aller Kinder.
--   quiz_progress    nimmt Eintraege fuer JEDEN Kadernamen an (is_kader_name).
--   kabine_config    ist fuer jeden Angemeldeten lesbar - dort steht der Hash des
--                    Ausgangscodes der Kabine.
--   album_fotos, album_tausch, kabinen_wahl, ansagen, ausstattung_artikel, team_config
--                    genuegt „irgendjemand ist angemeldet".
--
-- Diese Migration zieht die Grenze nicht zwischen „angemeldet" und „nicht angemeldet",
-- sondern zwischen einer ECHTEN Sitzung (Eltern, Trainer) oder einem GEKOPPELTEN
-- Kindergeraet auf der einen Seite und einer beliebigen anonymen Sitzung auf der
-- anderen. Erst danach darf das Haekchen gesetzt werden.

-- ── 1 · Zwei Helfer ───────────────────────────────────────────────────────────

-- Anonyme Sitzungen tragen die Marke im Ausweis. Fehlt sie (Eltern, Trainer, Dienst-
-- schluessel), ist die Sitzung nicht anonym.
create or replace function public.ist_anonym()
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
$fn$;

-- „Diese Sitzung gehoert zu jemandem, den wir kennen." Entweder eine echte Anmeldung
-- oder ein Kindergeraet, das die Eltern gekoppelt haben. Eine anonyme Sitzung ohne
-- Kopplung ist niemand - und bekommt ab hier nichts mehr.
create or replace function public.sitzung_gueltig()
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select (select auth.uid()) is not null
     and (not public.ist_anonym()
          or exists(select 1 from public.kind_konto where uid = (select auth.uid()) and aktiv));
$fn$;

-- ── 2 · „Irgendjemand ist angemeldet" wird „jemand, den wir kennen" ───────────

drop policy if exists album_fotos_sel on public.album_fotos;
create policy album_fotos_sel on public.album_fotos for select using (sitzung_gueltig());

drop policy if exists album_tausch_sel on public.album_tausch;
create policy album_tausch_sel on public.album_tausch for select using (sitzung_gueltig());

drop policy if exists kabinen_wahl_sel on public.kabinen_wahl;
create policy kabinen_wahl_sel on public.kabinen_wahl for select using (sitzung_gueltig());

drop policy if exists ansagen_sel on public.ansagen;
create policy ansagen_sel on public.ansagen for select using (sitzung_gueltig());

drop policy if exists aa_select on public.ausstattung_artikel;
create policy aa_select on public.ausstattung_artikel for select using (sitzung_gueltig());

drop policy if exists tc_read on public.team_config;
create policy tc_read on public.team_config for select to authenticated using (sitzung_gueltig());

-- Der Hash des Kabinen-Ausgangscodes geht anonyme Sitzungen nichts an: ein vierstelliger
-- Code ist gegen einen abgeschriebenen Hash in Sekunden geraten. Die Kinder-App kennt
-- diesen Code ohnehin nicht - dort gibt es keinen Ausgang zu bewachen.
drop policy if exists kc_sel on public.kabine_config;
create policy kc_sel on public.kabine_config for select
  using ((select auth.uid()) is not null and not ist_anonym());

-- ── 3 · Quiz-Fortschritt gehoert dem eigenen Namen ───────────────────────────
-- Bisher genuegte, dass der Name im Kader steht: jede angemeldete Sitzung konnte fuer
-- jedes Kind schreiben. Fuer Eltern und Trainer bleibt das so (Geschwister, Nachtragen);
-- ein Kindergeraet darf nur noch unter dem eigenen Namen schreiben.
create or replace function public.ist_eigener_quizname(p_name text)
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select case
    when not public.ist_anonym() then public.is_kader_name(p_name)
    else exists(select 1 from public.kind_konto kk join public.kader k on k.id = kk.spieler_id
                 where kk.uid = (select auth.uid()) and kk.aktiv and k.name = p_name)
  end;
$fn$;

drop policy if exists "quiz insert auth" on public.quiz_progress;
create policy "quiz insert auth" on public.quiz_progress for insert to authenticated
  with check (ist_eigener_quizname(player));
drop policy if exists "quiz update auth" on public.quiz_progress;
create policy "quiz update auth" on public.quiz_progress for update to authenticated
  using (ist_eigener_quizname(player)) with check (ist_eigener_quizname(player));
drop policy if exists "quiz select auth" on public.quiz_progress;
create policy "quiz select auth" on public.quiz_progress for select to authenticated
  using (sitzung_gueltig());

-- ── 4 · Die Galerie ──────────────────────────────────────────────────────────
-- team_gallery() liefert die Bewertungsrohwerte und ist damit nichts fuer ein Geraet,
-- das jeder anlegen kann. Die Kabine nutzt ab Schritt 5 team_gallery_kind(); bis dahin
-- ruft die Eltern-App sie weiter auf - mit einer echten Anmeldung.
create or replace function public.team_gallery()
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select case when not public.sitzung_gueltig() or public.ist_anonym() then '[]'::jsonb
              else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
      'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
      'radios', coalesce((select radios from public.spielerprofile sp where sp.name=k.name order by datum desc nulls last limit 1), '{}'::jsonb),
      'foto_path', case when coalesce(f.gallery_optin,false) or coalesce(k.foto_stadionheft_ok,false)
                        then coalesce(f.foto_path, k.foto_path) else null end,
      'trainings', (select count(*) from public.anwesenheit a where (coalesce(a.data->(k.id::text), a.data->k.name)->>'da')='true')
    ) as g
    from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id
    where k.aktiv) x;
$fn$;

-- Und die Kinder-Fassung nur fuer Sitzungen, die wir kennen.
create or replace function public.team_gallery_kind()
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select case when not public.sitzung_gueltig() then '[]'::jsonb
              else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
      'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
      'staerken', coalesce((
         select jsonb_agg(e.key order by e.wert desc, e.key)
           from (select kv.key, (kv.value)::int as wert
                   from jsonb_each_text(coalesce(
                        (select sp.radios from public.spielerprofile sp
                          where sp.name = k.name order by sp.datum desc nulls last limit 1),
                        '{}'::jsonb)) kv
                  where kv.key like 'f\_%' and kv.value ~ '^[0-9]+$' and (kv.value)::int > 0
                  order by (kv.value)::int desc, kv.key limit 3) e), '[]'::jsonb),
      'foto_path', case when coalesce(f.gallery_optin,false) or coalesce(k.foto_stadionheft_ok,false)
                        then coalesce(f.foto_path, k.foto_path) else null end,
      'trainings', (select count(*) from public.anwesenheit a
                     where (coalesce(a.data->(k.id::text), a.data->k.name)->>'da')='true')
    ) as g
    from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id
    where k.aktiv) x;
$fn$;

-- ── 5 · Rechte ───────────────────────────────────────────────────────────────
-- ist_anonym() und sitzung_gueltig() stehen in Policies, deren Tabellen auch anonym
-- gelesen werden (Stadionheft). Wird die Ausfuehrung entzogen, laeuft dort ein Fehler
-- statt einer leeren Antwort - deshalb bleiben sie fuer alle aufrufbar.
grant execute on function public.ist_anonym()              to anon, authenticated;
grant execute on function public.sitzung_gueltig()         to anon, authenticated;
grant execute on function public.ist_eigener_quizname(text) to authenticated;
