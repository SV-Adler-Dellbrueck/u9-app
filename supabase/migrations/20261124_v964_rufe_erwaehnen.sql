-- v964 · Adler-Rufe neu (Charles 24.11.2026, Entwurf freigegeben): „Wäre es auch möglich, andere im Chat zu markieren bzw. über ein
-- @-Zeichen direkt anzusprechen, sodass die dann vielleicht auch eine gesonderte Information dazu bekommen?“ Dazu freigegeben:
-- Filter „Für mich“, Glocke „nur bei Erwähnung und Antwort“, Abstimmung „Ergebnis erst am Schluss“.
--
-- 1) rufe_nachricht.erwaehnt: Konten, die im Ruf mit @ angesprochen werden. Der Trigger behält nur Konten, die den Raum sehen
--    (keine Erwähnung über Raumgrenzen, im Raum „nur Eltern“ keine Trainer), höchstens 20.
-- 2) rufe_mitglieder(raum): wen man in diesem Raum erwähnen kann (Name wie in „Gesehen von“, ohne sich selbst).
-- 3) rufe_push_erwaehnung: Konten, die nur bei Erwähnung, Antwort auf eigene Rufe und @alle benachrichtigt werden wollen.
--    Erwähnungen und Antworten gehen sofort raus (nicht gebündelt). „Aus“ (rufe_push_aus) bleibt aus – auch für Erwähnungen.
-- 4) rufe_fuer_mich(): Rufe der letzten 30 Tage, in denen ich erwähnt wurde, die auf meine Rufe antworten oder @alle sind.
-- 5) rufe_umfrage.verdeckt: Ergebnis erst nach dem Schluss (oder „beenden“); bis dahin zeigt rufe_umfrage_stand nur die eigene Wahl
--    und die Zahl der Abstimmenden.

alter table public.rufe_nachricht add column if not exists erwaehnt uuid[] not null default '{}';
create index if not exists rufe_nachricht_erwaehnt on public.rufe_nachricht using gin (erwaehnt);

-- Konten, die einen Raum sehen (dieselbe Regel wie _rufe_empfaenger und rufe_raum_sichtbar, aber je Raum)
create or replace function public._rufe_raum_konten(p_raum bigint)
returns table(user_id uuid, name text, trainer boolean)
 language sql stable security definer set search_path to 'public' as $$
  with r as (select id, familie_kind, eltern_email, nur_eltern from rufe_raum where id = p_raum and not archiviert),
  konten as (
    select u.id, lower(u.email) mail, coalesce(p.role='trainer',false) trainer
      from auth.users u left join profiles p on p.id=u.id, r
     where (p.role='trainer' and not r.nur_eltern)
        or (coalesce(p.role,'')<>'trainer'
            and exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)
                        and (r.familie_kind is null or public.rufe_familie(e.spieler_id)=r.familie_kind))
            and (r.eltern_email is null or lower(u.email)=r.eltern_email)
            and not (r.nur_eltern and exists(select 1 from rufe_eltern_ausschluss x where x.user_id=u.id)))
  )
  select k.id,
         case when k.trainer then coalesce((select nullif(trim(p.anzeigename),'') from profiles p where p.id=k.id),'Trainer')
              else coalesce((select nullif(trim(a.vorname),'') from eltern_angaben a where a.user_id=k.id),
                            (select nullif(trim(p.anzeigename),'') from profiles p where p.id=k.id),'Elternteil')
                   || coalesce(' ('||(select string_agg(kd.name, ', ' order by kd.name) from eltern_kinder e join kader kd on kd.id=e.spieler_id
                                      where lower(e.email)=k.mail)||')','') end,
         k.trainer
    from konten k;
$$;
revoke all on function public._rufe_raum_konten(bigint) from public, anon, authenticated;

create or replace function public.rufe_mitglieder(p_raum bigint)
returns table(user_id uuid, name text, trainer boolean)
 language sql stable security definer set search_path to 'public' as $$
  select k.user_id, k.name, k.trainer from public._rufe_raum_konten(p_raum) k
   where public.rufe_raum_sichtbar(p_raum) and k.user_id <> auth.uid()
   order by k.trainer desc, k.name;
$$;
revoke all on function public.rufe_mitglieder(bigint) from public, anon;
grant execute on function public.rufe_mitglieder(bigint) to authenticated;

-- Trigger: Erwähnungen auf Konten des Raums begrenzen (ergänzt rufe_vor_insert, ändert ihn nicht)
create or replace function public.rufe_erwaehnt_pruefen() returns trigger
 language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(array_length(new.erwaehnt,1),0) = 0 then new.erwaehnt := '{}'; return new; end if;
  new.erwaehnt := coalesce((select array_agg(x) from (
      select distinct x from unnest(new.erwaehnt) x
       where x <> new.autor and x in (select k.user_id from public._rufe_raum_konten(new.raum_id) k)
       limit 20) s), '{}');
  return new;
end $$;
drop trigger if exists rufe_erwaehnt_vor on public.rufe_nachricht;
create trigger rufe_erwaehnt_vor before insert on public.rufe_nachricht for each row execute function public.rufe_erwaehnt_pruefen();

-- Glocke „nur bei Erwähnung und Antwort“
create table if not exists public.rufe_push_erwaehnung (
  user_id uuid primary key default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.rufe_push_erwaehnung enable row level security;
drop policy if exists rpe_eigen on public.rufe_push_erwaehnung;
create policy rpe_eigen on public.rufe_push_erwaehnung for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.darf_rufen());
revoke all on public.rufe_push_erwaehnung from anon;
grant select, insert, delete on public.rufe_push_erwaehnung to authenticated;

-- „Für mich“
create or replace function public.rufe_fuer_mich()
returns table(id bigint, raum_id bigint, autor uuid, autor_name text, autor_rolle text, text text, created_at timestamptz, grund text)
 language sql stable security definer set search_path to 'public' as $$
  select n.id, n.raum_id, n.autor, n.autor_name, n.autor_rolle, left(n.text, 300), n.created_at,
         case when auth.uid() = any(n.erwaehnt) then 'erwaehnt'
              when exists(select 1 from rufe_nachricht m where m.id=n.antwort_auf and m.autor=auth.uid()) then 'antwort'
              else 'alle' end
    from rufe_nachricht n
    join rufe_raum r on r.id=n.raum_id and not r.archiviert
   where public.darf_rufen() and public.rufe_raum_sichtbar(n.raum_id)
     and n.archiviert_am is null and n.autor <> auth.uid() and n.created_at > now() - interval '30 days'
     and (auth.uid() = any(n.erwaehnt) or n.an_alle
          or exists(select 1 from rufe_nachricht m where m.id=n.antwort_auf and m.autor=auth.uid()))
   order by n.created_at desc limit 60;
$$;
revoke all on function public.rufe_fuer_mich() from public, anon;
grant execute on function public.rufe_fuer_mich() to authenticated;

-- Abstimmung „Ergebnis erst am Schluss“
alter table public.rufe_umfrage add column if not exists verdeckt boolean not null default false;

create or replace function public.rufe_umfrage_erstellen(p_raum bigint, p_frage text, p_optionen text[], p_anonym boolean DEFAULT false,
                                                         p_mehrfach boolean DEFAULT false, p_stunden integer DEFAULT NULL::integer, p_verdeckt boolean DEFAULT false)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare v_opt text[]; v_n bigint;
begin
  if not public.rufe_raum_sichtbar(p_raum) then raise exception 'not authorized'; end if;
  if length(trim(coalesce(p_frage,''))) not between 1 and 300 then raise exception 'frage'; end if;
  select array_agg(o order by i) into v_opt from (
    select distinct on (lower(trim(x))) trim(x) o, i from unnest(p_optionen) with ordinality t(x,i)
     where length(trim(coalesce(x,''))) between 1 and 80 order by lower(trim(x)), i) s;
  if coalesce(array_length(v_opt,1),0) not between 2 and 6 then raise exception 'optionen'; end if;
  if p_stunden is not null and p_stunden not between 1 and 720 then raise exception 'schluss'; end if;
  insert into rufe_nachricht(raum_id, text) values (p_raum, trim(p_frage)) returning id into v_n;
  insert into rufe_umfrage(nachricht_id, optionen, anonym, mehrfach, schluss, von, verdeckt)
  values (v_n, v_opt, coalesce(p_anonym,false), coalesce(p_mehrfach,false),
          case when p_stunden is null then null else now() + make_interval(hours => p_stunden) end, auth.uid(), coalesce(p_verdeckt,false));
  return v_n;
end $function$;
-- die alte Fassung mit sechs Parametern weicht der neuen (sonst wäre der Aufruf ohne p_verdeckt mehrdeutig)
drop function if exists public.rufe_umfrage_erstellen(bigint, text, text[], boolean, boolean, integer);
revoke all on function public.rufe_umfrage_erstellen(bigint, text, text[], boolean, boolean, integer, boolean) from public, anon;
grant execute on function public.rufe_umfrage_erstellen(bigint, text, text[], boolean, boolean, integer, boolean) to authenticated;

create or replace function public.rufe_umfrage_stand(p_ids bigint[])
returns table(umfrage_id bigint, option integer, anzahl integer, namen text[], ich boolean, teilnehmer integer)
 language sql stable security definer set search_path to 'public' as $$
  with f as (
    select u.id, u.anonym, (u.verdeckt and u.beendet_am is null and (u.schluss is null or u.schluss > now())) zu_frueh
      from rufe_umfrage u join rufe_nachricht n on n.id=u.nachricht_id
     where u.id = any(p_ids) and public.rufe_raum_sichtbar(n.raum_id)
       and (n.archiviert_am is null or public.rufe_darf_archiv(n.raum_id))
  ),
  -- Hotfix 24.11.: je Kind einmal zählen (beide Elternteile dürfen abstimmen); Konto ohne Kind zählt für sich
  einheit as (
    select s.umfrage_id, s.option, coalesce('k'||e.spieler_id, 'u'||s.user_id) einheit
      from rufe_stimme s join f on f.id=s.umfrage_id
      left join auth.users au on au.id=s.user_id
      left join eltern_kinder e on lower(e.email)=lower(au.email)
  )
  -- Solange ein verdecktes Ergebnis läuft, sieht jeder nur die eigene Wahl (ohne Zahl) und wie viele abgestimmt haben.
  select s.umfrage_id, s.option::int,
         case when f.zu_frueh then null else (select count(distinct x.einheit)::int from einheit x where x.umfrage_id=s.umfrage_id and x.option=s.option) end,
         case when f.anonym or f.zu_frueh then null else array_agg(coalesce(s.name,'?') order by s.created_at) end,
         bool_or(s.user_id=auth.uid()),
         (select count(distinct x.einheit)::int from einheit x where x.umfrage_id=s.umfrage_id)
    from rufe_stimme s join f on f.id=s.umfrage_id
   where not f.zu_frueh or s.user_id = auth.uid()
   group by s.umfrage_id, s.option, f.anonym, f.zu_frueh;
$$;

-- Push: Erwähnungen und Antworten auf eigene Rufe gehen sofort raus; wer „nur bei Erwähnung“ gewählt hat, bekommt nur diese und @alle.
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
      join rufe_nachricht n on n.archiviert_am is null and n.autor<>e.user_id and n.created_at <= p_jetzt
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

-- Senden mit Anhang: Erwähnungen mitgeben (der Trigger rufe_erwaehnt_vor prüft sie wie beim direkten Einfügen)
create or replace function public.rufe_senden(p_raum bigint, p_text text, p_antwort_auf bigint DEFAULT NULL::bigint, p_an_alle boolean DEFAULT false,
                                              p_anhaenge jsonb DEFAULT '[]'::jsonb, p_erwaehnt uuid[] DEFAULT '{}'::uuid[])
 RETURNS bigint LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
declare v_id bigint; v_text text := trim(coalesce(p_text,'')); a jsonb;
begin
  if jsonb_typeof(coalesce(p_anhaenge,'[]'::jsonb)) <> 'array' then raise exception 'anhaenge'; end if;
  if jsonb_array_length(coalesce(p_anhaenge,'[]'::jsonb)) > 4 then raise exception 'hoechstens vier anhaenge'; end if;
  if v_text = '' and jsonb_array_length(coalesce(p_anhaenge,'[]'::jsonb)) > 0 then v_text := '📎 Anhang'; end if;
  insert into rufe_nachricht(raum_id, text, antwort_auf, an_alle, erwaehnt)
    values (p_raum, v_text, p_antwort_auf, coalesce(p_an_alle,false), coalesce(p_erwaehnt,'{}')) returning id into v_id;
  for a in select * from jsonb_array_elements(coalesce(p_anhaenge,'[]'::jsonb)) loop
    insert into rufe_anhang(nachricht_id, raum_id, pfad, name, mime, groesse)
      values (v_id, p_raum, a->>'pfad', left(coalesce(a->>'name',''),120), a->>'mime', (a->>'groesse')::bigint);
  end loop;
  return v_id;
end $function$;
drop function if exists public.rufe_senden(bigint, text, bigint, boolean, jsonb);
revoke all on function public.rufe_senden(bigint, text, bigint, boolean, jsonb, uuid[]) from public, anon;
grant execute on function public.rufe_senden(bigint, text, bigint, boolean, jsonb, uuid[]) to authenticated;
