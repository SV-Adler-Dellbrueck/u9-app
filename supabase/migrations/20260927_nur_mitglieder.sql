-- Eingespielt am 27.09.2026 (vor dem Trainermeeting).
-- v636 · Datenschutz-Audit 27.09.: „angemeldet“ ist keine Hürde.
-- Anonyme Anmeldungen sind für die Kinder-Kopplung eingeschaltet; wer den öffentlichen Schlüssel
-- kennt, bekommt eine Sitzung mit der Rolle authenticated. Mehrere Funktionen und Richtlinien
-- prüften nur das (oder gar nichts). Jetzt gilt überall: Mitglied ist, wer Trainer ist, als
-- Elternteil mit hinterlegtem Kind eingetragen ist oder ein aktiv gekoppeltes Kindergerät nutzt.

create or replace function public.ist_mitglied() returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select public.is_trainer()
      or (not public.ist_anonym()
          and exists(select 1 from public.eltern_kinder e
                      where lower(e.email)=lower(coalesce((select auth.jwt())->>'email',''))))
      or exists(select 1 from public.kind_konto k where k.uid=(select auth.uid()) and k.aktiv);
$$;
revoke all on function public.ist_mitglied() from public, anon;
grant execute on function public.ist_mitglied() to authenticated;

-- sitzung_gueltig() ließ jedes nicht-anonyme Konto durch. Alle Richtlinien und Funktionen, die
-- es nutzen, gelten damit ab sofort nur noch für Mitglieder.
create or replace function public.sitzung_gueltig() returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select (select auth.uid()) is not null and public.ist_mitglied();
$$;

-- Funktionen ohne jede Prüfung: umbenennen (…_roh, für niemanden aufrufbar) und eine Hülle mit
-- derselben Signatur davor, die nur Mitglieder durchlässt. Die Logik bleibt unverändert.
do $do$
declare f record; nm text; argl text; res text; call text; body text;
begin
  for f in select p.oid, p.proname, pg_get_function_arguments(p.oid) args, pg_get_function_identity_arguments(p.oid) ida,
                  pg_get_function_result(p.oid) res, p.proargnames
             from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname in ('buedchen_plan','carpool_board','fundbuero_board','fundbuero_claim',
                  'get_season_wrapped','kader_namen','kasse_summary','team_meilensteine','termin_gallery','training_rueckblick',
                  'wahl_ergebnis','eltern_news','team_federn_total','adlerkasse_link','boerse_reservieren')
  loop
    nm := f.proname;
    execute format('alter function public.%I(%s) rename to %I', nm, f.ida, nm||'_roh');
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated', nm||'_roh', f.ida);
    call := coalesce((select string_agg(quote_ident(a), ', ') from unnest(f.proargnames) a), '');
    if f.res like 'TABLE(%' then
      body := format('begin if not public.sitzung_gueltig() then return; end if; return query select * from public.%I(%s); end', nm||'_roh', call);
    elsif f.res = 'void' then
      body := format('begin if not public.sitzung_gueltig() then return; end if; perform public.%I(%s); end', nm||'_roh', call);
    else
      body := format('begin if not public.sitzung_gueltig() then return null; end if; return public.%I(%s); end', nm||'_roh', call);
    end if;
    execute format('create function public.%I(%s) returns %s language plpgsql volatile security definer set search_path to ''public'' as %L',
                   nm, f.args, f.res, body);
    execute format('revoke all on function public.%I(%s) from public, anon', nm, f.ida);
    execute format('grant execute on function public.%I(%s) to authenticated', nm, f.ida);
  end loop;
end $do$;

-- Nur intern gebraucht (Hook, ist_eigener_quizname): nicht mehr von außen aufrufbar.
-- is_email_whitelisted verriet sonst jedem, ob eine Adresse zu Eltern dieses Teams gehört.
revoke execute on function public.is_email_whitelisted(text) from public, anon, authenticated;
revoke execute on function public.is_kader_name(text) from public, anon, authenticated;

-- Richtlinien mit USING(true) bzw. „angemeldet“ auf Tabellen mit Namen/Personenbezug.
alter policy "boerse read"       on public.boerse_listings  using (public.sitzung_gueltig());
alter policy "bd_read"           on public.buedchen         using (public.sitzung_gueltig());
alter policy "eh_read"           on public.event_helfer     using (public.sitzung_gueltig());
alter policy "em_read"           on public.event_mitbringen using (public.sitzung_gueltig());
alter policy "waesche read"      on public.waesche_log      using (public.sitzung_gueltig());
alter policy "tplan read auth"   on public.turnier_plan     using (public.sitzung_gueltig());
alter policy "topf read auth"    on public.kassen_topf      using (public.sitzung_gueltig());
alter policy "kind_pause_sel_gruesse" on public.kind_pause using (gruesse_ok = true and public.sitzung_gueltig());
alter policy "kc_sel"            on public.kabine_config    using (public.sitzung_gueltig());

-- Heimturnier: der Bearbeitungscode für Ergebnisse ist für Anonyme nicht mehr lesbar.
revoke select on public.heimturnier from anon;
do $do$ declare cols text; begin
  select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
   where table_schema='public' and table_name='heimturnier' and column_name<>'edit_code';
  execute format('grant select (%s) on public.heimturnier to anon', cols);
end $do$;
