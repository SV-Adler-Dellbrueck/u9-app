-- v701 · Tagebuch: Konsequenz „gilt dauerhaft“ und Benachrichtigung „Wie war's?“
-- Aufträge: doku/auftrag-tagebuch-ki-sortieren/nachtrag-2-2026-09-29.md (Punkt 3) und
-- prozess-nacherfassung.md (Einstieg per Benachrichtigung, höchstens eine Erinnerung am Folgetag).

-- 1) Eine Konsequenz hat eine Frist ODER gilt dauerhaft. Das Kennzeichen hängt am einzelnen Punkt,
--    weil auch die Frist dort hängt (v679). Ein dauerhafter Punkt hat kein Datum und steht nicht in
--    der Wiedervorlage.
alter table public.tagebuch_punkt add column if not exists dauerhaft boolean not null default false;
comment on column public.tagebuch_punkt.dauerhaft is
  'v701: Konsequenz gilt dauerhaft (Grundsatz, keine Frist). Dann bis = null; nicht in der Wiedervorlage.';

-- Eintrag vom 25.09.2026: Status fertig, Konsequenz ohne Datum – am 29.09. vom Projekt-Chat so gesetzt,
-- „beim Bau von Punkt 3 bitte mit dem neuen Kennzeichen versehen“ (Nachtrag 2). Nur der offene Punkt
-- ohne Frist wird gekennzeichnet; sonst nichts an diesem Eintrag.
update public.tagebuch_punkt p set dauerhaft = true
  from public.tagebuch_eintrag e
 where p.eintrag_id = e.id and e.datum = date '2026-09-25' and e.ki_vorschlag
   and p.art = 'konsequenz' and p.bis is null and p.erledigt_am is null;

-- 2) Benachrichtigung „Wie war's?“ – wer wann eine bekommt, entscheidet die Datenbank und merkt es
--    sich (einmal je Termin, Trainer und Art); die Edge Function rufe-push verschickt nur.
create table if not exists public.wiewars_push_log (
  termin_id   bigint      not null,
  user_id     uuid        not null,
  art         text        not null check (art in ('erst','folgetag')),
  gesendet_am timestamptz not null default now(),
  primary key (termin_id, user_id, art)
);
comment on table public.wiewars_push_log is
  'v701: gesendete Benachrichtigungen „Wie war''s?“ – je Termin und Trainer höchstens eine nach dem Termin und eine am Folgetag. Nur Server.';
alter table public.wiewars_push_log enable row level security;
revoke all on public.wiewars_push_log from anon, authenticated;

-- Fällig ist, wer
--   · für den Termin zugesagt hat (termine.trainer_status[Name] = 'ja', Name = profiles.anzeigename),
--   · ein Gerät mit Benachrichtigungen hat,
--   · und – „erst“: der Termin ist seit höchstens 6 Stunden vorbei und noch nicht nachbereitet;
--     „folgetag“: der Termin war gestern, ab 9 Uhr, und er ist nicht nachbereitet oder sein
--     Tagebuch-Vorschlag wartet noch auf „Passt so“.
-- Ende eines Termins: uhrzeit_ende, sonst Beginn + 75 Minuten (Training, wie tbTerminGelaufen) bzw. + 3 Stunden
-- (Spiel, Festival – ein Festival dauert länger), sonst 18 Uhr.
-- Ruhezeit 21–7 Uhr wie bei Adler-Rufe. Abgesagte Termine nie.
create or replace function public.wiewars_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, termin_id bigint, art text, titel text, text text, url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_lokal timestamp := p_jetzt at time zone 'Europe/Berlin';
  v_std   int       := extract(hour from (p_jetzt at time zone 'Europe/Berlin'))::int;
  v_heute date      := (p_jetzt at time zone 'Europe/Berlin')::date;
begin
  if v_std >= 21 or v_std < 7 then return; end if;
  return query
  with t as (
    select te.id, te.typ, te.datum::date d, coalesce(nullif(te.titel,''), te.gegner) name_termin, te.trainer_status,
           te.datum::date + coalesce(te.uhrzeit_ende,
             te.uhrzeit + case when te.typ = 'training' then interval '75 minutes' else interval '3 hours' end,
             time '18:00') ende
      from termine te
     where te.typ in ('training','spiel','turnier')
       and coalesce(te.platz_status,'') <> 'abgesagt'
       and te.datum ~ '^\d{4}-\d{2}-\d{2}$'
       and te.datum::date between v_heute - 1 and v_heute
  ), tr as (
    select t.*, p.id uid, p.anzeigename trainer
      from t
      cross join lateral jsonb_each_text(coalesce(t.trainer_status, '{}'::jsonb)) s(k, v)
      join profiles p on p.anzeigename = s.k and p.role = 'trainer'
     where s.v = 'ja'
       and exists (select 1 from push_subscriptions ps where ps.user_id = p.id)
  ), st as (
    select tr.*,
           case when tr.typ = 'training'
                then exists (select 1 from einheit_bewertung b where b.datum = tr.d and b.autor = tr.trainer)
                else exists (select 1 from event_bewertung b where b.termin_id = tr.id and b.autor = tr.trainer) end nachbereitet,
           (select e.id from tagebuch_eintrag e
             where e.autor = tr.trainer and e.ki_vorschlag and e.bestaetigt_am is null
               and (e.termin_id = tr.id or (tr.typ = 'training' and e.quelle = 'einheit' and e.datum = tr.d))
             order by e.id desc limit 1) offen_id
      from tr
  ), kand as (
    select st.*,
           case when v_lokal >= st.ende and v_lokal < st.ende + interval '6 hours' and not st.nachbereitet then 'erst'
                when st.d = v_heute - 1 and v_std >= 9 and (not st.nachbereitet or st.offen_id is not null) then 'folgetag'
           end art_neu
      from st
  ), gemerkt as (
    insert into wiewars_push_log(termin_id, user_id, art)
    select k.id, k.uid, k.art_neu from kand k where k.art_neu is not null
    on conflict do nothing
    returning wiewars_push_log.termin_id, wiewars_push_log.user_id, wiewars_push_log.art
  )
  select k.uid, k.id, k.art_neu,
         case when k.nachbereitet then '✨ Noch zu bestätigen' else '💬 Wie war''s?' end,
         case when k.nachbereitet then 'Dein Tagebuch-Vorschlag zu „' || k.name_termin || '“ wartet auf „Passt so“.'
              when k.art_neu = 'erst' then 'Einmal erzählen, wie „' || k.name_termin || '“ lief – die App ordnet den Rest.'
              else 'Gestern: „' || k.name_termin || '“. Noch ein, zwei Sätze dazu?' end,
         './trainer/?wiewars=' || case when k.nachbereitet then 'e' || k.offen_id
                                       when k.typ = 'training' then 'd' || to_char(k.d, 'YYYY-MM-DD')
                                       else 't' || k.id end
    from kand k
    join gemerkt g on g.termin_id = k.id and g.user_id = k.uid and g.art = k.art_neu;
end $$;
revoke all on function public.wiewars_push_faellig(timestamptz) from public, anon, authenticated;
grant execute on function public.wiewars_push_faellig(timestamptz) to service_role;
