-- v636 · matchday war für anon komplett lesbar (USING true), einschließlich delegate_token.
-- Wer einen Helfer-Code las, konnte über ticker_post in den öffentlichen Ticker schreiben und über
-- ticker_kader die Namen der dabei-Kinder abrufen. Der Helfer-Link findet seinen Spieltag jetzt über
-- matchday_by_token(); die Spalte selbst ist für anon nicht mehr lesbar.
-- ERST MIT DEM MERGE VON v636 EINSPIELEN: ältere Clients lesen noch select=*.
create or replace function public.matchday_by_token(p_token uuid)
 returns setof public.matchday language sql stable security definer set search_path to 'public' as $$
  select * from public.matchday where delegate_token = p_token and p_token is not null limit 1;
$$;
revoke all on function public.matchday_by_token(uuid) from public;
grant execute on function public.matchday_by_token(uuid) to anon, authenticated;

revoke select on public.matchday from anon;
do $do$ declare cols text; begin
  select string_agg(quote_ident(column_name), ', ') into cols from information_schema.columns
   where table_schema='public' and table_name='matchday' and column_name<>'delegate_token';
  execute format('grant select (%s) on public.matchday to anon', cols);
end $do$;
