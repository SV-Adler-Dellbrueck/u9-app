-- v704 · Ruhezeit der Benachrichtigungen: 21:30–7 Uhr, Trainer bei Adler-Rufen ohne Ruhezeit
-- PO 01.10.2026: „Ich erhalte keine Push-Nachrichten, wenn es eine neue Nachricht in der Eltern-App gibt.“
-- Befund: Versand läuft; die einzige Eltern-Nachricht seit Anmeldung des Trainergeräts kam um 22:56 Uhr
-- (Ruhezeit 21–7, v673) und war vor 7 Uhr gelesen. Beschluss (Kacheln): Trainer ohne Ruhezeit,
-- Ruhezeit im Chat sichtbar, Ruhezeit für alle anderen 21:30–7 Uhr.
-- Eltern bleiben in der Ruhezeit außen vor; was sie bis dahin nicht gelesen haben, kommt um 7 Uhr gebündelt
-- (rufe_push_stand wird für sie nachts nicht weitergeschoben).

create or replace function public.rufe_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, trainer boolean, anzahl integer, titel text, text text, url text)
language plpgsql security definer set search_path = public as $function$
#variable_conflict use_column
declare
  v_lokal time    := (p_jetzt at time zone 'Europe/Berlin')::time;
  v_ruhe  boolean := v_lokal >= time '21:30' or v_lokal < time '07:00';   -- v704: 21:30–7 Uhr, nur Eltern
begin
  return query
  with empf as (
    select distinct s.user_id, coalesce(p.role='trainer',false) trainer, lower(u.email) mail
      from push_subscriptions s
      join auth.users u on u.id=s.user_id
      left join profiles p on p.id=s.user_id
     where (p.role='trainer' or exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)))
       and (not v_ruhe or p.role='trainer')
       and not exists(select 1 from rufe_push_aus a where a.user_id=s.user_id)
  ), neu as (
    select e.user_id, e.trainer, n.id, n.raum_id, n.autor_name, n.autor_rolle, n.an_alle, n.text, n.created_at,
           r.familie_kind is not null privat
      from empf e
      join rufe_nachricht n on n.archiviert_am is null and n.autor<>e.user_id and n.created_at <= p_jetzt
      join rufe_raum r on r.id=n.raum_id and not r.archiviert
      left join rufe_gelesen g on g.user_id=e.user_id and g.raum_id=n.raum_id
      left join rufe_push_stand st on st.user_id=e.user_id
     where n.created_at > greatest(coalesce(g.zuletzt,'-infinity'::timestamptz), coalesce(st.bis,'-infinity'::timestamptz), p_jetzt - interval '2 days')
       and (r.familie_kind is null or e.trainer
            or exists(select 1 from eltern_kinder ek where lower(ek.email)=e.mail and ek.spieler_id=r.familie_kind))
  ), je as (
    select nu.user_id, bool_or(nu.trainer) trainer, count(*)::int anzahl, max(nu.created_at) bis,
           bool_or(nu.autor_rolle='trainer' or nu.an_alle) sofort,
           (array_agg(case when nu.privat then '🔒 ' else '' end||nu.autor_name||': '||left(nu.text,110)
                      order by (nu.autor_rolle='trainer' or nu.an_alle) desc, nu.created_at desc))[1] kopf,
           (array_agg(nu.raum_id order by (nu.autor_rolle='trainer' or nu.an_alle) desc, nu.created_at desc))[1] raum
      from neu nu group by nu.user_id
  ), faellig as (
    select j.* from je j left join rufe_push_stand st on st.user_id=j.user_id
     where j.sofort or st.zuletzt_gepusht is null or st.zuletzt_gepusht < p_jetzt - interval '30 minutes'
  ), gemerkt as (
    insert into rufe_push_stand(user_id, bis, zuletzt_gepusht)
    select f.user_id, f.bis, p_jetzt from faellig f
    on conflict (user_id) do update set bis=excluded.bis, zuletzt_gepusht=excluded.zuletzt_gepusht
    returning rufe_push_stand.user_id
  )
  select f.user_id, f.trainer, f.anzahl, '📣 Adler-Rufe'::text,
         case when f.anzahl=1 then f.kopf
              when f.sofort then f.kopf||' · +'||(f.anzahl-1)||' weitere'
              else f.anzahl||' neue Adler-Rufe' end,
         case when f.trainer then './trainer/?rufe=' else './eltern/?rufe=' end || f.raum
    from faellig f where f.user_id in (select g.user_id from gemerkt g);
end $function$;
revoke all on function public.rufe_push_faellig(timestamptz) from public, anon, authenticated;
grant execute on function public.rufe_push_faellig(timestamptz) to service_role;

-- „Wie war's?“ (v701): dieselbe Ruhezeit 21:30–7 Uhr. Unverändert bis auf diese Zeile.
create or replace function public.wiewars_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, termin_id bigint, art text, titel text, text text, url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_lokal timestamp := p_jetzt at time zone 'Europe/Berlin';
  v_std   int       := extract(hour from (p_jetzt at time zone 'Europe/Berlin'))::int;
  v_heute date      := (p_jetzt at time zone 'Europe/Berlin')::date;
begin
  if (p_jetzt at time zone 'Europe/Berlin')::time >= time '21:30' or v_std < 7 then return; end if;   -- v704: Ruhezeit 21:30–7 Uhr
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
