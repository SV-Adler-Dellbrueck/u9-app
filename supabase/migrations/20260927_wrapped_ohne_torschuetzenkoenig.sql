-- v637 · Saisonrückblick (Adler Wrapped) ohne Torschützenkönig: Ergebnisse zählen in der U9 nicht,
-- „Fairness vor Ergebnis“. Statt eines Namens liefert die Funktion eine Teamzahl: wie viele
-- verschiedene Kinder getroffen haben. Der Rest der Funktion bleibt unverändert.
do $do$
declare src text; neu text;
begin
  select p.prosrc into src from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='get_season_wrapped_roh';
  neu := regexp_replace(src,
    '''top_torschuetze'',\s*\(select jsonb_build_object\([^\n]*?limit 1\),',
    '''torschuetzen_anzahl'', (select count(distinct spieler) from ma where aktion=''tor'' and coalesce(spieler,'''')<>''''),');
  if neu = src then raise exception 'top_torschuetze nicht gefunden – Funktion unverändert'; end if;
  execute format('create or replace function public.get_season_wrapped_roh(p_saison text default null) returns jsonb
    language sql stable security definer set search_path to ''public'' as %L', neu);
end $do$;
