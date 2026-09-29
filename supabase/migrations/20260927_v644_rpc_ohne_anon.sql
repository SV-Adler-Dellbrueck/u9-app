-- v644: Datenbankfunktionen, die niemand ohne Anmeldung braucht, sind für die Rolle anon
-- nicht mehr aufrufbar (Supabase-Sicherheitsprüfung „anon kann SECURITY DEFINER ausführen“).
--
-- Alle hier genannten Funktionen prüfen den Zugriff ohnehin selbst und gaben anonym nichts
-- heraus; der Entzug ist die zweite Tür. Kindergeräte melden sich anonym an, laufen aber als
-- authenticated und sind davon nicht berührt.
--
-- Bewusst weiter anonym aufrufbar, weil öffentliche Seiten sie ohne Anmeldung nutzen:
--   Liveticker/Spielkarte  einsatzzeiten_public, matchday_by_token, ticker_clap, ticker_kader, ticker_post
--   Turnierseite           heimturnier_ergebnis
--   Kind-Link, Zusage      kind_termine, rsvp_by_token
--   Stadionheft            reporter_public
-- Ebenso die Hilfsfunktionen aus den RLS-Regeln (is_trainer, is_kind_selbst, ist_anonym,
-- ist_eigener_quizname, kind_zeit_uebrig, sitzung_gueltig): Regeln laufen mit den Rechten
-- dessen, der fragt – ohne EXECUTE würde jede anonyme Leseabfrage scheitern.

do $$
declare
  f text;
  nur_angemeldet text[] := array[
    'album_tausch_annehmen(bigint,bigint)', 'ansagen_status()', 'buedchen_optout(bigint,bigint)',
    'eltern_kinder_spiel_stats(text)', 'kann_jetzt_public(bigint,integer)', 'kind_abgesagt(bigint)',
    'kind_geraete_stat()', 'kind_rolle_heute(bigint)', 'kind_spiel_stats(bigint,text)', 'kind_status()',
    'kind_team(bigint,text)', 'kind_tick()', 'meine_rollen(bigint)', 'meine_ziele(bigint)',
    'my_child_card_kind(bigint)', 'nutzung_auswertung(integer)', 'puls_aggregate(bigint)',
    'puls_season(date)', 'season_gallery(text)', 'team_gallery_kind()', 'wq_done(bigint)',
    'xp_award_event(bigint,text,text)', 'xp_award_teamquest(bigint,text)',
    'xp_grant_manual(bigint,integer,text)', 'xp_history(bigint)', 'xp_team_overview()', 'xp_total(bigint)'];
  -- Trigger-Funktionen ruft nur die Datenbank selbst auf
  nur_trigger text[] := array[
    'foto_consent_mirror()', 'foto_consent_stamp()', 'kader_foto_mirror()', 'kader_name_cascade()'];
begin
  foreach f in array nur_angemeldet loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  foreach f in array nur_trigger loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Fester Suchpfad für die updated_at-Hilfe (Sicherheitsprüfung „function_search_path_mutable“)
alter function public.set_updated_at() set search_path = public;
