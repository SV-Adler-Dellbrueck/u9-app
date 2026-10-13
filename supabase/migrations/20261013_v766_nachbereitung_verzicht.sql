-- v766 (Charles 13.10.): Eine Nachbereitung lässt sich ablehnen. Niemand wird gezwungen, etwas einzutragen –
-- der Trainer legt den Termin mit „Nichts eintragen“ ab, optional mit Grund („War nicht dabei“, „Keine Zeit“,
-- „Nichts Besonderes festgestellt“, „Anderer Grund“) und einer Anmerkung. Das gilt je Trainer: eine Zeile je
-- (autor, schluessel). Der Schlüssel ist derselbe wie überall bei „Wie war's?“: d<Datum> für ein Training,
-- t<Termin-Nr.> für Spiel oder Festival. Das Tagebuch zeigt die abgelegten Termine in einem eigenen Abschnitt.
-- Die Benachrichtigung „Wie war's?“ (wiewars_push_faellig) fragt bei einem abgelegten Termin nicht mehr nach.
-- Schreiben und Lesen dürfen nur Trainer (wie bei einheit_bewertung); Eltern und Kinder sehen die Tabelle nie.
create table if not exists public.nachbereitung_verzicht (
  id          bigint generated always as identity primary key,
  autor       text   not null,
  schluessel  text   not null check (schluessel ~ '^(d[0-9]{4}-[0-9]{2}-[0-9]{2}|t[0-9]+)$'),
  datum       date   not null,
  art         text   not null check (art in ('training','spiel','turnier')),
  grund       text   check (grund is null or grund in ('nicht_dabei','keine_zeit','nichts_besonderes','sonstiges')),
  notiz       text   check (notiz is null or char_length(notiz) <= 500),
  created_at  timestamptz not null default now(),
  unique (autor, schluessel)
);
comment on table public.nachbereitung_verzicht is 'v766: Trainer legt eine Nachbereitung ab, ohne etwas einzutragen (je Trainer und Termin). Grund und Anmerkung sind freiwillig.';
create index if not exists nachbereitung_verzicht_datum_idx on public.nachbereitung_verzicht (datum desc);
alter table public.nachbereitung_verzicht enable row level security;
drop policy if exists verzicht_trainer_all on public.nachbereitung_verzicht;
create policy verzicht_trainer_all on public.nachbereitung_verzicht for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
revoke all on public.nachbereitung_verzicht from anon;
grant select, insert, update, delete on public.nachbereitung_verzicht to authenticated;

-- Benachrichtigung „Wie war's?“: ein abgelegter Termin zählt wie ein nachbereiteter – weder die Erinnerung nach dem Termin
-- noch die am Folgetag und auch kein „Noch zu bestätigen“. Sonst unverändert gegenüber v701.
create or replace function public.wiewars_push_faellig(p_jetzt timestamp with time zone default now())
 returns table(user_id uuid, termin_id bigint, art text, titel text, text text, url text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_lokal timestamp := p_jetzt at time zone 'Europe/Berlin';
  v_std   int       := extract(hour from (p_jetzt at time zone 'Europe/Berlin'))::int;
  v_heute date      := (p_jetzt at time zone 'Europe/Berlin')::date;
begin
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
       and not public.push_ruht(p.id, p_jetzt)
  ), st as (
    select tr.*,
           (case when tr.typ = 'training'
                then exists (select 1 from einheit_bewertung b where b.datum = tr.d and b.autor = tr.trainer)
                else exists (select 1 from event_bewertung b where b.termin_id = tr.id and b.autor = tr.trainer) end
            or exists (select 1 from nachbereitung_verzicht v
                        where v.autor = tr.trainer
                          and v.schluessel = case when tr.typ = 'training' then 'd' || to_char(tr.d, 'YYYY-MM-DD') else 't' || tr.id end)) nachbereitet,
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
end $function$;
