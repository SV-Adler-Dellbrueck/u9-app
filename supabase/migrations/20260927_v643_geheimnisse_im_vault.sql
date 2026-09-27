-- v643: Push- und Cron-Schlüssel liegen im Supabase Vault statt im Code der Edge Functions.
-- Lesen darf sie nur die service_role (Edge Functions), nie anon oder angemeldete Nutzer.
-- Die Werte selbst entstehen in der Datenbank (Cron) bzw. in der Funktion schluessel-erzeugen
-- (VAPID) und stehen nirgends im Klartext – auch nicht in dieser Datei.
create or replace function public.adler_geheimnis(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from vault.decrypted_secrets ds
  where ds.name = p_name
    and p_name in ('adler_vapid_public', 'adler_vapid_private', 'adler_cron_secret')
  limit 1
$$;
revoke all on function public.adler_geheimnis(text) from public, anon, authenticated;
grant execute on function public.adler_geheimnis(text) to service_role;

create or replace function public.adler_geheimnis_anlegen(p_name text, p_wert text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_name not in ('adler_vapid_public', 'adler_vapid_private') then return false; end if;
  if exists (select 1 from vault.secrets where name = p_name) then return false; end if;
  perform vault.create_secret(p_wert, p_name, 'v643 Web-Push');
  return true;
end
$$;
revoke all on function public.adler_geheimnis_anlegen(text, text) from public, anon, authenticated;
grant execute on function public.adler_geheimnis_anlegen(text, text) to service_role;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'adler_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'adler_cron_secret', 'v643 Cron-Aufrufe push-cron/backup-cron');
  end if;
end $$;

-- Cron-Jobs lesen den Schlüssel selbst aus dem Vault (am 27.09. per cron.alter_job gesetzt):
--   'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'adler_cron_secret')
