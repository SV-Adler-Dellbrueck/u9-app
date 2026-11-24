-- v960 · Charles 24.11.2026: Die Nachbereitung soll für alle Trainer einfach sein. Wer das Tagebuch führt, prüft den
-- Tagebuch-Entwurf aus seiner Erzählung; die Erzählungen der anderen Trainer gehen ohne Rückfragen als „Trainerbewertung“
-- direkt ins Tagebuch. Freigegeben: „Einstellung ‚Tagebuch führt‘“ (Kachel, mit kleiner Datenbank-Änderung).
-- Leer heißt: wie bisher – jeder führt sein eigenes Tagebuch.
alter table public.team_config add column if not exists tagebuch_fuehrt text;
comment on column public.team_config.tagebuch_fuehrt is 'v960: Trainername (wie tagebuch_eintrag.autor) dessen, der das Tagebuch führt; leer = jeder sein eigenes';
-- Vorbelegung: wer bisher die meisten Einträge hat (heute: der einzige Autor). Kein Name im Repo.
update public.team_config set tagebuch_fuehrt = (select autor from public.tagebuch_eintrag where autor is not null group by autor order by count(*) desc limit 1)
 where tagebuch_fuehrt is null;
