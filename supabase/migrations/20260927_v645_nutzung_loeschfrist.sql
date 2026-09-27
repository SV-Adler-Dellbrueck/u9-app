-- v645: Das Nutzungsprotokoll (nutzung_log) hatte keine Löschfrist. Die nächtliche
-- Datenhygiene (pg_cron „adler-datenhygiene“) löscht jetzt Einträge, die älter als
-- 12 Monate sind – lang genug für die Auswertung über eine ganze Saison.
-- Idempotent: hängt die Zeile nur an, wenn sie noch fehlt.
select cron.alter_job(
  j.jobid,
  command := rtrim(j.command, E' \n;') || E';\n  delete from public.nutzung_log     where ts < now()-interval ''12 months'';\n'
)
from cron.job j
where j.jobname = 'adler-datenhygiene' and position('nutzung_log' in j.command) = 0;
