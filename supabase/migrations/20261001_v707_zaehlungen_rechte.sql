-- v707 · Prüfung 01.10.2026 („Such Fehler in der App und dem Aufbau und der Struktur“)
-- Teil A: Zählungen lesen die Nominierung „<datum>__nom“ statt aller Zeilen des Tages.
--   Seit es mehrere Teams gibt, liegen je Spieltag neben „__nom“ die Team-Zeilen „<datum>“, „__t2“, „__t3“
--   (jedes Kind dort „dabei“ oder „nicht“). Wer über alle Zeilen zählt, zählt jedes Kind doppelt
--   (Adler-Karte: 7–9 statt 4 Spiele) oder nur Team 1 (Ticker-Helfer: 4 statt 13 Kinder am 03.10.).
-- Die Funktionen werden gezielt an der einen Stelle ersetzt; passt der Text nicht, bricht die Migration ab.

create or replace function pg_temp.ersetze(p_fn regprocedure, p_alt text, p_neu text) returns void language plpgsql as $$
declare d text;
begin
  d := pg_get_functiondef(p_fn);
  if position(p_alt in d) = 0 then raise exception 'v707: Stelle in % nicht gefunden', p_fn; end if;
  execute replace(d, p_alt, p_neu);
end $$;

-- Adler-Karte (Eltern, Kabine): Spiele = Spieltage mit „dabei“ in der Nominierung, bis heute
select pg_temp.ersetze('public.my_child_card(bigint)'::regprocedure,
  $a$'spiele',     (select count(*) from public.nominierungen where coalesce(data->>v_id, data->>v_name) = 'dabei'),$a$,
  $b$'spiele',     (select count(*) from public.nominierungen where datum like '%\_\_nom' and left(datum,10) <= to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD') and coalesce(data->>v_id, data->>v_name) = 'dabei'),$b$);
select pg_temp.ersetze('public.my_child_card_kind(bigint)'::regprocedure,
  $a$'spiele',     (select count(*) from public.nominierungen where coalesce(data->>v_id, data->>v_name) = 'dabei'),$a$,
  $b$'spiele',     (select count(*) from public.nominierungen where datum like '%\_\_nom' and left(datum,10) <= to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD') and coalesce(data->>v_id, data->>v_name) = 'dabei'),$b$);

-- Ticker-Helfer: alle Kinder des Tages aus der Nominierung, nicht aus der Zeile von Team 1
select pg_temp.ersetze('public.ticker_kader(uuid)'::regprocedure,
  $a$select data into v_nom from nominierungen where datum = v_basis;$a$,
  $b$select data into v_nom from nominierungen where datum = v_basis || '__nom';
  if v_nom is null then select data into v_nom from nominierungen where datum = v_basis; end if;$b$);

-- Saison-Rückblick je Kind: Ballaktionen ohne Kapitänsbinde/Ballverlust, Spiele aus der Nominierung
select pg_temp.ersetze('public.get_child_wrapped(bigint)'::regprocedure,
  $a$'aktionen', (select count(*) from match_actions where spieler = v_name),
    'spiele', (select count(distinct datum) from match_actions where spieler = v_name),$a$,
  $b$'aktionen', (select count(*) from match_actions where spieler = v_name and aktion in ('pass','dribbling','gewinn','parade','aufbau','heraus','tor')),
    'spiele', (select count(*) from nominierungen n join kader k on k.name = v_name
                where n.datum like '%\_\_nom' and left(n.datum,10) <= to_char(now() at time zone 'Europe/Berlin','YYYY-MM-DD')
                  and coalesce(n.data->>(k.id::text), n.data->>v_name) = 'dabei'),$b$);

-- Faire Einsatzzeiten für Eltern: alle Teams des Tages, sobald der Spieltag veröffentlicht ist
-- (vorher nur der exakt gleiche Schlüssel – Team 2/3 ohne eigene matchday-Zeile blieben unsichtbar).
select pg_temp.ersetze('public.einsatzzeiten_public(text)'::regprocedure,
  $a$  where e.datum = p_datum
    and exists (select 1 from matchday m where m.datum = e.datum and m.published = true)$a$,
  $b$  where left(e.datum,10) = left(p_datum,10)
    and exists (select 1 from matchday m where left(m.datum,10) = left(e.datum,10) and m.published = true)$b$);

-- Teil B: Leserechte
-- Turnierplan für Eltern: Ergebnisse waren nur für Trainer lesbar – Eltern sahen immer „–“, obwohl
-- der Text verspricht „Ergebnisse erscheinen, sobald der Trainer sie einträgt“.
drop policy if exists turnier_spiele_mitglied_lesen on public.turnier_spiele;
create policy turnier_spiele_mitglied_lesen on public.turnier_spiele for select to authenticated
  using (public.sitzung_gueltig());

-- Heimturnier: den Schreib-Code (Helfer-Link für Ergebnisse) konnte jedes angemeldete Konto lesen.
-- Jetzt nur noch über heimturnier_code() für Trainer; die übrigen Spalten bleiben lesbar.
revoke select on public.heimturnier from authenticated;
grant select (id, slug, name, datum, ort, config, teams, plan, aktiv, created_at, updated_at) on public.heimturnier to authenticated;
create or replace function public.heimturnier_code(p_id bigint)
returns text language sql stable security definer set search_path = public as $$
  select edit_code from heimturnier where id = p_id and public.is_trainer();
$$;
revoke all on function public.heimturnier_code(bigint) from public, anon;
grant execute on function public.heimturnier_code(bigint) to authenticated;

-- Quiz: jedes Mitglied las die Ergebnisse aller Kinder (mit Vornamen) – angezeigt wurde nur das
-- eigene Kind und die Teamsumme. Jetzt: eigene Zeilen (bzw. alle für Trainer), die Summe per Funktion.
-- Eltern: Kinder aus eltern_kinder (is_parent_of); Kabine (anonym): das gekoppelte Kind (ist_eigener_quizname).
-- ist_eigener_quizname allein genügt nicht – für angemeldete Konten gilt dort jeder Kadername.
drop policy if exists "quiz select auth" on public.quiz_progress;
create policy "quiz select auth" on public.quiz_progress for select to authenticated
  using (public.is_trainer()
         or (public.ist_anonym() and public.ist_eigener_quizname(player))
         or exists (select 1 from public.kader k where k.name = player and public.is_parent_of(k.id)));
create or replace function public.quiz_team_summe()
returns integer language sql stable security definer set search_path = public as $$
  select case when public.sitzung_gueltig() then coalesce(sum(score),0)::int else null end from quiz_progress;
$$;
revoke all on function public.quiz_team_summe() from public, anon;
grant execute on function public.quiz_team_summe() to authenticated;
