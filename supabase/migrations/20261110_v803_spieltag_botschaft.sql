-- v803 (Charles 07.11.): Nach einem Spieltag eine Nachricht (Text und/oder Sprache) an alle Kinder, die dabei waren.
-- Sie landet wie das Sprachlob in der Kabine des Kindes (Tabelle kabine_lob, Kachel „Lob vom Trainer“); die Eltern bekommen
-- einen Push (lob_push_faellig, gleicher 5-Minuten-Lauf rufe-push). Je Kind eine Zeile; `gruppe` verbindet die Zeilen einer
-- Nachricht (Zurückziehen, „wie viele haben es gehört“).
--   art        'lob' (wie bisher) oder 'spieltag'
--   nachricht  Text, höchstens 600 Zeichen; leer bei reiner Sprachnachricht
--   betreff    Zeile über der Nachricht, z. B. „Nach dem Turnier „Kinderfestival“ · 07.11.“
--   termin_id  Spiel oder Turnier, nur zur Zuordnung (kein Fremdschlüssel)
--   path       jetzt optional: eine reine Textnachricht hat keine Datei. Es muss aber Text oder Datei da sein.
-- Rechte unverändert (Trainer schreibt und löscht; Kind, Eltern, Trainer lesen; gehoert_am setzen wie v755).
alter table public.kabine_lob alter column path drop not null;
alter table public.kabine_lob add column if not exists art text not null default 'lob';
alter table public.kabine_lob add column if not exists nachricht text;
alter table public.kabine_lob add column if not exists betreff text;
alter table public.kabine_lob add column if not exists termin_id bigint;
alter table public.kabine_lob add column if not exists gruppe uuid;
alter table public.kabine_lob drop constraint if exists kabine_lob_art_check;
alter table public.kabine_lob add constraint kabine_lob_art_check check (art in ('lob','spieltag'));
alter table public.kabine_lob drop constraint if exists kabine_lob_nachricht_check;
alter table public.kabine_lob add constraint kabine_lob_nachricht_check check (nachricht is null or char_length(nachricht) <= 600);
alter table public.kabine_lob drop constraint if exists kabine_lob_betreff_check;
alter table public.kabine_lob add constraint kabine_lob_betreff_check check (betreff is null or char_length(betreff) <= 160);
alter table public.kabine_lob drop constraint if exists kabine_lob_inhalt_check;
alter table public.kabine_lob add constraint kabine_lob_inhalt_check check (path is not null or nullif(btrim(nachricht), '') is not null);
create index if not exists kabine_lob_gruppe_idx on public.kabine_lob (gruppe) where gruppe is not null;
create index if not exists kabine_lob_termin_idx on public.kabine_lob (termin_id) where termin_id is not null;
comment on column public.kabine_lob.art is 'v803: lob (Sprachlob je Kind) oder spieltag (Nachricht an alle Kinder eines Spieltags)';
comment on column public.kabine_lob.nachricht is 'v803: Text der Nachricht (höchstens 600 Zeichen)';
comment on column public.kabine_lob.gruppe is 'v803: verbindet die Zeilen einer Nachricht an mehrere Kinder';

-- Push an die Eltern: unterscheidet Sprachlob und Spieltag-Nachricht. Sonst unverändert gegenüber v760
-- (genau einmal je Zeile und Konto, Ruhezeit je Konto, nur die letzten zwei Tage, nur der Vorname des eigenen Kindes).
create or replace function public.lob_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, titel text, text text, url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  with kand as (
    select l.id lob_id, l.art, k.name kind, u.id uid
      from kabine_lob l
      join kader k on k.id = l.spieler_id
      join eltern_kinder ek on ek.spieler_id = l.spieler_id
      join auth.users u on lower(u.email) = lower(ek.email)
     where l.created_at >= p_jetzt - interval '2 days'
       and l.created_at <= p_jetzt
  ), bereit as (
    select distinct c.* from kand c
     where exists (select 1 from push_subscriptions ps where ps.user_id = c.uid)
       and not public.push_ruht(c.uid, p_jetzt)
       and not exists (select 1 from lob_push_log g where g.lob_id = c.lob_id and g.user_id = c.uid)
  ), gemerkt as (
    insert into lob_push_log(lob_id, user_id)
    select b.lob_id, b.uid from bereit b
    on conflict do nothing
    returning lob_push_log.lob_id, lob_push_log.user_id
  )
  select b.uid,
         case when b.art = 'spieltag' then '💬 Nachricht für ' || split_part(b.kind, ' ', 1)
              else '🎧 Neues Sprachlob für ' || split_part(b.kind, ' ', 1) end,
         case when b.art = 'spieltag'
              then 'Das Trainerteam hat ' || split_part(b.kind, ' ', 1) || ' nach dem Spieltag eine Nachricht geschickt – zu lesen oder zu hören in der Kabine oder hier im Eltern-Bereich.'
              else 'Der Trainer hat ' || split_part(b.kind, ' ', 1) || ' ein Sprachlob geschickt – zu hören in der Kabine oder hier im Eltern-Bereich.' end,
         './eltern/?portal'::text
    from bereit b
    join gemerkt g on g.lob_id = b.lob_id and g.user_id = b.uid;
end $$;
revoke all on function public.lob_push_faellig(timestamptz) from public, anon, authenticated;
grant execute on function public.lob_push_faellig(timestamptz) to service_role;
