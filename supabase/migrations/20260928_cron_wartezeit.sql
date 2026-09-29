-- 28.09.2026 · Wartezeit der Cron-Aufrufe von 5 auf 30 Sekunden.
-- Die wöchentliche Sicherung braucht rund 6 Sekunden. pg_net hörte nach 5 Sekunden auf zu
-- warten und trug eine Zeitüberschreitung in net._http_response ein, obwohl die Edge Function
-- mit 200 fertig wurde (Protokoll 28.09., 02:00:06 UTC). Eine falsche Fehlermeldung verdeckt
-- irgendwann eine echte. Die Schlüssel kommen unverändert aus dem Vault (v643).
-- Idempotent: ändert nur Jobs, die noch keine Wartezeit tragen.
do $$
declare r record;
begin
  for r in select jobid, command from cron.job
           where jobname in ('push-reminders-daily','adler-backup-weekly')
             and command not like '%timeout_milliseconds%' loop
    perform cron.alter_job(r.jobid, command := replace(r.command, 'body := ''{}''::jsonb', 'body := ''{}''::jsonb,
    timeout_milliseconds := 30000'));
  end loop;
end $$;
