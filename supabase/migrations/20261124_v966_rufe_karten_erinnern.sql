-- v966 · Charles 24.11. (Adler-Rufe, Schritt 2 – Bild freigegeben): „Termin-Karte im Chat“, „Erinnere mich + Ruf planen/still“,
-- „Nicht-Abstimmende erinnern“, „Mitfahr-Karte“ (in der Termin-Karte). Entscheidungen: eine Karte für Zusage und Mitfahrt (Trainer
-- hängt sie an), planen/still für alle, an Fehlende erinnern darf, wer die Abstimmung erstellt hat, und das Trainerteam.
--
-- 1) rufe_nachricht: termin_id (Karte), geplant_fuer (später senden – bis dahin sieht nur der Absender den Ruf), still (kein Push).
--    Ein geplanter Ruf bekommt created_at = geplant_fuer; Lesen (RLS), Zähler, „Für mich“ und Push sehen ihn erst ab dann.
-- 2) rufe_geplant(p_id, p_aktion): eigenen geplanten Ruf jetzt senden oder löschen.
-- 3) rufe_erinnerung: „Erinnere mich“ je Konto und Ruf; push_warteschlange_faellig verschickt fällige Erinnerungen (Ruhezeit gilt).
-- 4) rufe_termin_stand: Zusagen, Absagen, Offene und Mitfahrt (Autos, freie Plätze) je Termin – Zahlen, keine Namen.
-- 5) Abstimmung: rufe_umfrage_fehlende (wie viele Kinder fehlen) und rufe_umfrage_erinnern (einmal, Push über die Warteschlange).

alter table public.rufe_nachricht add column if not exists termin_id bigint references public.termine(id) on delete set null;
alter table public.rufe_nachricht add column if not exists geplant_fuer timestamptz;
alter table public.rufe_nachricht add column if not exists still boolean not null default false;

create or replace function public.rufe_geplant_pruefen()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.termin_id is not null and not public.is_trainer() then raise exception 'termin_nur_trainer'; end if;
  if new.geplant_fuer is not null then
    if new.geplant_fuer < now() + interval '1 minute' then new.geplant_fuer := null;
    elsif new.geplant_fuer > now() + interval '14 days' then raise exception 'geplant_hoechstens_14_tage';
    else new.created_at := new.geplant_fuer; end if;
  end if;
  return new;
end $$;
-- Name mit „zz“: läuft nach rufe_nachricht_vor (der setzt created_at := now())
drop trigger if exists rufe_zz_geplant_vor on public.rufe_nachricht;
create trigger rufe_zz_geplant_vor before insert on public.rufe_nachricht for each row execute function public.rufe_geplant_pruefen();

drop policy if exists rn_lesen on public.rufe_nachricht;
create policy rn_lesen on public.rufe_nachricht for select
  using (public.rufe_raum_sichtbar(raum_id) and (archiviert_am is null or public.rufe_darf_archiv(raum_id))
         and (created_at <= now() or autor = auth.uid()));

create or replace function public.rufe_geplant(p_id bigint, p_aktion text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v int;
begin
  if p_aktion = 'jetzt' then
    update rufe_nachricht set created_at = now(), geplant_fuer = null where id = p_id and autor = auth.uid() and created_at > now();
  elsif p_aktion = 'loeschen' then
    delete from rufe_nachricht where id = p_id and autor = auth.uid() and created_at > now();
  else raise exception 'aktion'; end if;
  get diagnostics v = row_count; return v > 0;
end $$;
revoke all on function public.rufe_geplant(bigint, text) from public, anon;
grant execute on function public.rufe_geplant(bigint, text) to authenticated;

create or replace function public.rufe_ungelesen()
 RETURNS TABLE(raum_id bigint, anzahl integer, an_alle boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select n.raum_id, count(*)::int, bool_or(n.an_alle)
    from rufe_nachricht n
    join rufe_raum r on r.id=n.raum_id and not r.archiviert
         and public.rufe_raum_sichtbar(r.id)
    left join rufe_gelesen g on g.raum_id=n.raum_id and g.user_id=auth.uid()
   where public.darf_rufen() and n.archiviert_am is null and n.autor<>auth.uid()
     and n.created_at > coalesce(g.zuletzt, '-infinity'::timestamptz) and n.created_at <= now()
   group by n.raum_id;
$function$;

create or replace function public.rufe_fuer_mich()
 RETURNS TABLE(id bigint, raum_id bigint, autor uuid, autor_name text, autor_rolle text, text text, created_at timestamp with time zone, grund text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select n.id, n.raum_id, n.autor, n.autor_name, n.autor_rolle, left(n.text, 300), n.created_at,
         case when auth.uid() = any(n.erwaehnt) then 'erwaehnt'
              when exists(select 1 from rufe_nachricht m where m.id=n.antwort_auf and m.autor=auth.uid()) then 'antwort'
              else 'alle' end
    from rufe_nachricht n
    join rufe_raum r on r.id=n.raum_id and not r.archiviert
   where public.darf_rufen() and public.rufe_raum_sichtbar(n.raum_id)
     and n.archiviert_am is null and n.autor <> auth.uid() and n.created_at > now() - interval '30 days' and n.created_at <= now()
     and (auth.uid() = any(n.erwaehnt) or n.an_alle
          or exists(select 1 from rufe_nachricht m where m.id=n.antwort_auf and m.autor=auth.uid()))
   order by n.created_at desc limit 60;
$function$;

-- Push: stille Rufe lösen keinen Push aus (sonst unverändert v964)
create or replace function public.rufe_push_faellig(p_jetzt timestamp with time zone DEFAULT now())
 RETURNS TABLE(user_id uuid, trainer boolean, anzahl integer, titel text, text text, url text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  return query
  with empf as (
    select distinct s.user_id, coalesce(p.role='trainer',false) trainer, lower(u.email) mail,
           exists(select 1 from rufe_push_erwaehnung x where x.user_id=s.user_id) nur_erw
      from push_subscriptions s
      join auth.users u on u.id=s.user_id
      left join profiles p on p.id=s.user_id
     where (p.role='trainer' or exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)))
       and not public.push_ruht(s.user_id, p_jetzt)
       and not exists(select 1 from rufe_push_aus a where a.user_id=s.user_id)
  ), neu as (
    select e.user_id, e.trainer, n.id, n.raum_id, n.autor_name, n.autor_rolle, n.an_alle, n.text, n.created_at,
           r.familie_kind is not null privat,
           (e.user_id = any(n.erwaehnt) or exists(select 1 from rufe_nachricht m where m.id=n.antwort_auf and m.autor=e.user_id)) fuer_mich
      from empf e
      join rufe_nachricht n on n.archiviert_am is null and n.autor<>e.user_id and n.created_at <= p_jetzt and not n.still
      join rufe_raum r on r.id=n.raum_id and not r.archiviert
      left join rufe_gelesen g on g.user_id=e.user_id and g.raum_id=n.raum_id
      left join rufe_push_stand st on st.user_id=e.user_id
     where n.created_at > greatest(coalesce(g.zuletzt,'-infinity'::timestamptz), coalesce(st.bis,'-infinity'::timestamptz), p_jetzt - interval '2 days')
       and not (r.nur_eltern and (e.trainer or exists(select 1 from rufe_eltern_ausschluss x where x.user_id=e.user_id)))
       and (r.familie_kind is null or e.trainer
            or (exists(select 1 from eltern_kinder ek where lower(ek.email)=e.mail and ek.spieler_id=r.familie_kind)
                and (r.eltern_email is null or e.mail=r.eltern_email)))
  ), gefiltert as (
    select nu.* from neu nu join empf e on e.user_id=nu.user_id
     where not e.nur_erw or nu.fuer_mich or nu.an_alle
  ), je as (
    select nu.user_id, bool_or(nu.trainer) trainer, count(*)::int anzahl, max(nu.created_at) bis,
           bool_or(nu.autor_rolle='trainer' or nu.an_alle or nu.fuer_mich) sofort,
           (array_agg(case when nu.fuer_mich then '💬 ' when nu.privat then '🔒 ' else '' end||nu.autor_name||': '||left(nu.text,110)
                      order by nu.fuer_mich desc, (nu.autor_rolle='trainer' or nu.an_alle) desc, nu.created_at desc))[1] kopf,
           (array_agg(nu.raum_id order by nu.fuer_mich desc, (nu.autor_rolle='trainer' or nu.an_alle) desc, nu.created_at desc))[1] raum
      from gefiltert nu group by nu.user_id
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

-- 3) Erinnere mich
create table if not exists public.rufe_erinnerung (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nachricht_id bigint not null references public.rufe_nachricht(id) on delete cascade,
  faellig timestamptz not null,
  gesendet_am timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, nachricht_id)
);
alter table public.rufe_erinnerung enable row level security;
drop policy if exists re_eigen on public.rufe_erinnerung;
create policy re_eigen on public.rufe_erinnerung for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and faellig > now() and faellig <= now() + interval '30 days'
              and exists(select 1 from public.rufe_nachricht n where n.id = nachricht_id));
grant select, insert, update, delete on public.rufe_erinnerung to authenticated;

create or replace function public.push_warteschlange_faellig(p_jetzt timestamp with time zone DEFAULT now())
 RETURNS TABLE(user_id uuid, payload jsonb)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  delete from push_warteschlange w where w.erstellt_am < p_jetzt - interval '2 days';
  delete from rufe_erinnerung x where x.faellig < p_jetzt - interval '7 days';
  return query
  with d as (delete from push_warteschlange w where not public.push_ruht(w.user_id, p_jetzt)
             returning w.user_id, w.payload),
  e as (update rufe_erinnerung x set gesendet_am = p_jetzt
          from rufe_nachricht n
         where n.id = x.nachricht_id and n.archiviert_am is null
           and x.gesendet_am is null and x.faellig <= p_jetzt
           and not public.push_ruht(x.user_id, p_jetzt)
           and exists(select 1 from push_subscriptions s where s.user_id = x.user_id)
        returning x.user_id, jsonb_build_object(
          'title', '⏰ Erinnerung',
          'body', n.autor_name || ': ' || left(n.text, 110),
          'url', case when exists(select 1 from profiles p where p.id = x.user_id and p.role = 'trainer') then './trainer/?rufe=' else './eltern/?rufe=' end || n.raum_id,
          'tag', 'erin-' || x.id) p)
  select d.user_id, d.payload from d
  union all
  select e.user_id, e.p from e;
end $function$;

-- 4) Termin-Karte: Zahlen je Termin (keine Namen)
create or replace function public.rufe_termin_stand(p_ids bigint[])
returns table(termin_id bigint, dabei integer, abgesagt integer, offen integer, autos integer, frei integer)
 language sql stable security definer set search_path to 'public' as $$
  select t.id,
         (select count(*) from rueckmeldungen r where r.termin_id=t.id and r.status='zugesagt')::int,
         (select count(*) from rueckmeldungen r where r.termin_id=t.id and r.status in ('abgesagt','krank'))::int,
         (select count(*) from kader k where coalesce(k.aktiv,true)
             and not exists(select 1 from rueckmeldungen r where r.termin_id=t.id and r.spieler_id=k.id and r.status is not null))::int,
         (select count(*) from rueckmeldungen r where r.termin_id=t.id and r.carpool_status='driver')::int,
         greatest(0, coalesce((select sum(r.carpool_seats) from rueckmeldungen r where r.termin_id=t.id and r.carpool_status='driver'),0)
                     - (select count(*) from rueckmeldungen r where r.termin_id=t.id and r.carpool_status='passenger'))::int
    from termine t
   where t.id = any(p_ids) and auth.uid() is not null and public.darf_rufen()
     and (t.typ <> 'trainermeeting' or public.is_trainer());
$$;
revoke all on function public.rufe_termin_stand(bigint[]) from public, anon;
grant execute on function public.rufe_termin_stand(bigint[]) to authenticated;

-- 5) Abstimmung: Fehlende je Kind (Kinder der Familien, die den Raum sehen), einmal erinnern
alter table public.rufe_umfrage add column if not exists erinnert_am timestamptz;

create or replace function public._rufe_umfrage_kinder(p_umfrage bigint)
returns table(user_id uuid, spieler_id bigint, gestimmt boolean)
 language sql stable security definer set search_path to 'public' as $$
  with u as (select f.id, n.raum_id from rufe_umfrage f join rufe_nachricht n on n.id=f.nachricht_id where f.id=p_umfrage),
  kinder as (
    select k.user_id, e.spieler_id
      from u, public._rufe_raum_konten(u.raum_id) k
      join auth.users au on au.id=k.user_id
      join eltern_kinder e on lower(e.email)=lower(au.email)
     where not k.trainer),
  gestimmt as (
    select distinct e.spieler_id from rufe_stimme s join auth.users au on au.id=s.user_id
      join eltern_kinder e on lower(e.email)=lower(au.email) where s.umfrage_id=p_umfrage)
  select ki.user_id, ki.spieler_id, ki.spieler_id in (select g.spieler_id from gestimmt g) from kinder ki;
$$;
revoke all on function public._rufe_umfrage_kinder(bigint) from public, anon, authenticated;

create or replace function public._rufe_umfrage_darf_erinnern(p_umfrage bigint)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from rufe_umfrage f join rufe_nachricht n on n.id=f.nachricht_id
                 where f.id=p_umfrage and public.rufe_raum_sichtbar(n.raum_id)
                   and (f.von = auth.uid() or public.is_trainer()));
$$;
revoke all on function public._rufe_umfrage_darf_erinnern(bigint) from public, anon, authenticated;

create or replace function public.rufe_umfrage_fehlende(p_umfrage bigint)
returns table(fehlen integer, kinder integer, erinnert_am timestamptz)
 language sql stable security definer set search_path to 'public' as $$
  select (select count(distinct x.spieler_id) from public._rufe_umfrage_kinder(p_umfrage) x where not x.gestimmt)::int,
         (select count(distinct x.spieler_id) from public._rufe_umfrage_kinder(p_umfrage) x)::int,
         (select f.erinnert_am from rufe_umfrage f where f.id=p_umfrage)
   where public._rufe_umfrage_darf_erinnern(p_umfrage);
$$;
revoke all on function public.rufe_umfrage_fehlende(bigint) from public, anon;
grant execute on function public.rufe_umfrage_fehlende(bigint) to authenticated;

create or replace function public.rufe_umfrage_erinnern(p_umfrage bigint)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_frage text; v_raum bigint; v int;
begin
  if not public._rufe_umfrage_darf_erinnern(p_umfrage) then raise exception 'nicht_erlaubt'; end if;
  if exists(select 1 from rufe_umfrage f where f.id=p_umfrage and f.erinnert_am is not null) then raise exception 'schon_erinnert'; end if;
  if exists(select 1 from rufe_umfrage f where f.id=p_umfrage and (f.beendet_am is not null or f.schluss <= now())) then raise exception 'abgeschlossen'; end if;
  select n.text, n.raum_id into v_frage, v_raum from rufe_umfrage f join rufe_nachricht n on n.id=f.nachricht_id where f.id=p_umfrage;
  insert into push_warteschlange(user_id, tag, payload)
  select distinct x.user_id, 'umfrage-'||p_umfrage,
         jsonb_build_object('title','📊 Eure Stimme fehlt noch','body',left(v_frage,120),'url','./eltern/?rufe='||v_raum,'tag','umfrage-'||p_umfrage)
    from public._rufe_umfrage_kinder(p_umfrage) x where not x.gestimmt and x.user_id <> auth.uid()
  on conflict do nothing;
  get diagnostics v = row_count;
  update rufe_umfrage set erinnert_am = now() where id = p_umfrage;
  return v;
end $$;
revoke all on function public.rufe_umfrage_erinnern(bigint) from public, anon;
grant execute on function public.rufe_umfrage_erinnern(bigint) to authenticated;

-- rufe_senden (mit Anhängen) kennt Termin, Planung und „still“ – Prüfung im Trigger rufe_zz_geplant_vor
create or replace function public.rufe_senden(p_raum bigint, p_text text, p_antwort_auf bigint DEFAULT NULL::bigint, p_an_alle boolean DEFAULT false,
                                              p_anhaenge jsonb DEFAULT '[]'::jsonb, p_erwaehnt uuid[] DEFAULT '{}'::uuid[],
                                              p_termin bigint DEFAULT NULL::bigint, p_geplant timestamptz DEFAULT NULL, p_still boolean DEFAULT false)
 RETURNS bigint LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
declare v_id bigint; v_text text := trim(coalesce(p_text,'')); a jsonb;
begin
  if jsonb_typeof(coalesce(p_anhaenge,'[]'::jsonb)) <> 'array' then raise exception 'anhaenge'; end if;
  if jsonb_array_length(coalesce(p_anhaenge,'[]'::jsonb)) > 4 then raise exception 'hoechstens vier anhaenge'; end if;
  if v_text = '' and jsonb_array_length(coalesce(p_anhaenge,'[]'::jsonb)) > 0 then v_text := '📎 Anhang'; end if;
  insert into rufe_nachricht(raum_id, text, antwort_auf, an_alle, erwaehnt, termin_id, geplant_fuer, still)
    values (p_raum, v_text, p_antwort_auf, coalesce(p_an_alle,false), coalesce(p_erwaehnt,'{}'), p_termin, p_geplant, coalesce(p_still,false)) returning id into v_id;
  for a in select * from jsonb_array_elements(coalesce(p_anhaenge,'[]'::jsonb)) loop
    insert into rufe_anhang(nachricht_id, raum_id, pfad, name, mime, groesse)
      values (v_id, p_raum, a->>'pfad', left(coalesce(a->>'name',''),120), a->>'mime', (a->>'groesse')::bigint);
  end loop;
  return v_id;
end $function$;
drop function if exists public.rufe_senden(bigint, text, bigint, boolean, jsonb, uuid[]);
revoke all on function public.rufe_senden(bigint, text, bigint, boolean, jsonb, uuid[], bigint, timestamptz, boolean) from public, anon;
grant execute on function public.rufe_senden(bigint, text, bigint, boolean, jsonb, uuid[], bigint, timestamptz, boolean) to authenticated;
