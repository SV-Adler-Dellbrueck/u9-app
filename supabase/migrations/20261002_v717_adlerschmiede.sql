-- v717 (PO 02.10.): „Einmal in der Woche einen Push an die Eltern-App … Neues aus der Adlerschmiede,
-- wo neue Features, die im Laufe der letzten sieben Tage in die App integriert wurden, aufgelistet
-- sind … nicht Korrekturen von Fehlern … man muss abwägen, dass man die Leute nicht zuspammt.“
-- Entschieden: Name „Aus der Adlerschmiede“, Sonntag 18:00, nur wenn es Neues gibt, abschaltbar.

-- 1) Einträge: eine Zeile je Eltern-Neuerung, in Elternsprache. Eltern lesen, Trainer schreiben.
--    Form „Kurztitel: Erklärung“ – der Push zeigt nur den Kurztitel.
create table if not exists public.adlerschmiede (
  id bigint generated always as identity primary key,
  datum date not null default ((now() at time zone 'Europe/Berlin')::date),
  version text,
  emoji text not null default '🛠️',
  text text not null check (length(text) between 5 and 280),
  created_at timestamptz not null default now()
);
alter table public.adlerschmiede enable row level security;
create policy adlerschmiede_lesen on public.adlerschmiede for select to authenticated using (public.sitzung_gueltig());
create policy adlerschmiede_trainer on public.adlerschmiede for all to authenticated using (public.is_trainer()) with check (public.is_trainer());

-- 2) Abschalten je Konto (wie rufe_push_aus).
create table if not exists public.adlerschmiede_push_aus (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seit timestamptz not null default now()
);
alter table public.adlerschmiede_push_aus enable row level security;
create policy asa_eigen on public.adlerschmiede_push_aus for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Einmal je Woche: der Montag der Woche ist der Schlüssel.
create table if not exists public.adlerschmiede_push_log (
  woche date primary key,
  gesendet_am timestamptz not null default now(),
  eintraege int not null default 0,
  empfaenger int not null default 0
);
alter table public.adlerschmiede_push_log enable row level security;
create policy asl_trainer on public.adlerschmiede_push_log for select to authenticated using (public.is_trainer());

-- 4) Erste Einträge (Woche 28.09.–04.10.)
insert into public.adlerschmiede (datum, version, emoji, text) values
 ('2026-10-01','v705','🌙','Ruhezeit selbst wählen: Unter „Trainerteam kontaktieren“ → Benachrichtigungen legt ihr fest, wann euer Handy still bleibt. Was in der Zeit anfällt, kommt danach gesammelt.'),
 ('2026-10-01','v708','🚗','Auswärtsturniere: Ihr seht, welche Spielformen der Gastgeber anbietet, und tragt euch direkt für die Betreuung der Kinder ein.'),
 ('2026-10-02','v716','📖','Trainingsinhalt nach dem Training: „Heute im Training geübt“ erscheint jetzt erst, wenn das Training vorbei ist – so stimmt es auch, wenn das Trainerteam kurzfristig umplant.'),
 ('2026-10-02','v716','💰','Mannschaftskasse: Auf der Kachel seht ihr, ob euer Beitrag schon bezahlt ist – sobald die Kasse ihn dort angelegt hat.');

-- 5) Sonntag 18:00 Köln: Der Job läuft sonntags um 16 und 17 Uhr UTC; die Funktion sendet nur,
--    wenn es in Europe/Berlin 18 Uhr ist (Sommer- und Winterzeit), und nur einmal je Woche.
select cron.schedule('adler-adlerschmiede-sonntag', '0 16,17 * * 0', $$
  select net.http_post(
    url := 'https://wgbcibqcqidudoksfkcv.supabase.co/functions/v1/adlerschmiede-push',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_Gz7hGb1ecNWkLJZA-neK_w_El3huo41',
      'Authorization','Bearer sb_publishable_Gz7hGb1ecNWkLJZA-neK_w_El3huo41',
      'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'adler_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);
