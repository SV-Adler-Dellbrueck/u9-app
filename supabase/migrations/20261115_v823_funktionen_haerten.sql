-- v823 · Datenbank härten (Durchsicht 09.11.2026, Supabase-Ratgeber)
--
-- Ausgangslage: 23 SECURITY-DEFINER-Funktionen waren für die anonyme Rolle ausführbar, eine
-- Funktion hatte keinen festen Suchpfad. 13 der 23 müssen anonym ausführbar bleiben:
--   · Helfer der Zugriffsregeln, die auch für anonyme Besucher gelten:
--     is_trainer, is_kind_selbst, kind_zeit_uebrig, sitzung_gueltig
--   · Zugänge der Seiten ohne Anmeldung (Token/Slug):
--     matchday_by_token, rsvp_by_token, kind_termine, ticker_clap, ticker_kader, ticker_post,
--     reporter_public, einsatzzeiten_public, heimturnier_ergebnis
-- Diese 13 fasst die Migration nicht an.
--
-- Geprüft vor der Ausführung:
--   · Trigger feuern auch dann, wenn der Aufrufer die Trigger-Funktion nicht ausführen darf
--     (Probe an einer Wegwerf-Tabelle in einer Transaktion, die sich zurückrollt: Trigger setzte
--     den Wert, has_function_privilege('anon', …) war falsch).
--   · ist_anonym, ist_eigener_quizname und spielerfoto_team_sichtbar stehen nur in Regeln für die
--     Rolle authenticated; mein_ticker_helfer wird nur mit Anmeldung aufgerufen (md-kasse.js).

-- 1) Fester Suchpfad. Die Funktion nutzt nur eingebaute Funktionen (chr).
alter function public.tb_alias_buchstabe(integer) set search_path = '';

-- 2) Trigger-Funktionen: niemand ruft sie direkt auf.
revoke execute on function
  public.betreuung_wer(), public.heft_ausgabe_nach(), public.kind_foto_vor_insert(),
  public.kind_training_vor_insert(), public.rufe_anhang_vor_insert(), public.termin_anhang_vor_insert()
  from public, anon, authenticated;

-- 3) Nur für Angemeldete.
revoke execute on function
  public.ist_anonym(), public.ist_eigener_quizname(text),
  public.spielerfoto_team_sichtbar(text), public.mein_ticker_helfer(date)
  from public, anon;
grant execute on function
  public.ist_anonym(), public.ist_eigener_quizname(text),
  public.spielerfoto_team_sichtbar(text), public.mein_ticker_helfer(date)
  to authenticated;
