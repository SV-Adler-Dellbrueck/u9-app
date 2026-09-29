-- v674 · Adler-Rufe, Stufe 2: private Nachrichten Familie ↔ Trainerteam und Abstimmungen.
-- Beschluss 29.09. (Kachelrunden): „private Eltern ↔ Trainerteam“; Abstimmungen „namentlich oder
-- anonym, der Ersteller wählt“, „alle Eltern dürfen starten“.
--
-- Privat: ein Raum je Familie (rufe_raum.familie_kind). Familie = die Kinder, die sich ein
-- Elternkonto teilen; Schlüssel ist das Kind mit der kleinsten Kennung, damit Geschwister und
-- beide Elternteile im selben Raum landen. Lesen: diese Familie und das Trainerteam – Moderatoren
-- aus der Elternschaft ausdrücklich nicht. Wer stummgeschaltet ist, kann dem Trainerteam
-- trotzdem schreiben.
--
-- Abstimmung: hängt an einem Ruf (Ruftext = Frage), 2–6 Antworten, eine oder mehrere wählbar,
-- optional mit Schluss. „Anonym“ heißt: niemand in der App sieht, wer was gewählt hat – auch das
-- Trainerteam nicht; gespeichert wird nur das Konto (eine Stimme je Konto), kein Name.
-- Abstimmen, Ergebnis und Beenden nur über RPC.

-- ── Private Räume ─────────────────────────────────────────────────────────────────
alter table public.rufe_raum add column if not exists familie_kind bigint references public.kader(id) on delete cascade;
comment on column public.rufe_raum.familie_kind is 'v674: gesetzt = privater Raum dieser Familie mit dem Trainerteam (Schlüssel: kleinste Kind-Kennung der Familie).';
create unique index if not exists rufe_raum_familie on public.rufe_raum(familie_kind) where familie_kind is not null;

-- Familienschlüssel: kleinste Kind-Kennung unter allen Kindern, die sich ein Elternkonto teilen
create or replace function public.rufe_familie(p_kind bigint) returns bigint
 language sql stable security definer set search_path to 'public' as $$
  select coalesce(min(e2.spieler_id), p_kind)
    from eltern_kinder e1 join eltern_kinder e2 on lower(e2.email)=lower(e1.email)
   where e1.spieler_id=p_kind;
$$;

-- Darf ich diesen Raum sehen? Öffentlich: alle mit Zugang. Privat: Trainerteam und die Familie.
create or replace function public.rufe_raum_sichtbar(p_raum bigint) returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select public.darf_rufen() and exists(
    select 1 from rufe_raum r where r.id=p_raum
       and (r.familie_kind is null or public.is_trainer() or public.is_parent_of(r.familie_kind)));
$$;

drop policy if exists rr_lesen on public.rufe_raum;
create policy rr_lesen on public.rufe_raum for select to authenticated
  using (public.darf_rufen() and (familie_kind is null or public.is_trainer() or public.is_parent_of(familie_kind)));
drop policy if exists rr_mod on public.rufe_raum;
create policy rr_mod on public.rufe_raum for all to authenticated
  using (public.is_rufe_mod() and familie_kind is null) with check (public.is_rufe_mod() and familie_kind is null);

drop policy if exists rn_lesen on public.rufe_nachricht;
create policy rn_lesen on public.rufe_nachricht for select to authenticated
  using (public.rufe_raum_sichtbar(raum_id) and (archiviert_am is null or public.is_trainer()));
drop policy if exists rn_schreiben on public.rufe_nachricht;
create policy rn_schreiben on public.rufe_nachricht for insert to authenticated
  with check (public.rufe_raum_sichtbar(raum_id) and autor = auth.uid());

-- Reaktionen, Meldungen: nur zu Rufen, die man sehen darf (Unterabfrage läuft mit RLS)
drop policy if exists rx_lesen on public.rufe_reaktion;
create policy rx_lesen on public.rufe_reaktion for select to authenticated
  using (exists(select 1 from public.rufe_nachricht n where n.id=nachricht_id));
drop policy if exists rx_eigen on public.rufe_reaktion;
create policy rx_eigen on public.rufe_reaktion for insert to authenticated
  with check (user_id = auth.uid() and exists(select 1 from public.rufe_nachricht n where n.id=nachricht_id and n.archiviert_am is null));
drop policy if exists rme_melden on public.rufe_meldung;
create policy rme_melden on public.rufe_meldung for insert to authenticated
  with check (von = auth.uid() and exists(select 1 from public.rufe_nachricht n where n.id=nachricht_id));

drop policy if exists rf_lesen on public.rufe_fixiert;
create policy rf_lesen on public.rufe_fixiert for select to authenticated using (public.rufe_raum_sichtbar(raum_id));
drop policy if exists rf_mod on public.rufe_fixiert;
create policy rf_mod on public.rufe_fixiert for all to authenticated
  using (public.is_rufe_mod() and public.rufe_raum_sichtbar(raum_id))
  with check (public.is_rufe_mod() and public.rufe_raum_sichtbar(raum_id)
              and exists(select 1 from public.rufe_nachricht n where n.id=nachricht_id and n.raum_id=rufe_fixiert.raum_id));

drop policy if exists rg_eigen on public.rufe_gelesen;
create policy rg_eigen on public.rufe_gelesen for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.rufe_raum_sichtbar(raum_id));

-- Privaten Raum holen oder anlegen. Eltern: die eigene Familie (p_kind leer = erstes eigenes
-- Kind). Trainer: jede Familie mit Elternzugang.
create or replace function public.rufe_privat_raum(p_kind bigint default null) returns bigint
 language plpgsql security definer set search_path to 'public' as $$
declare v_kind bigint; v_id bigint;
begin
  if not public.darf_rufen() then raise exception 'not authorized'; end if;
  if public.is_trainer() then
    if p_kind is null or not exists(select 1 from eltern_kinder e where e.spieler_id=p_kind) then raise exception 'kein Elternzugang'; end if;
    v_kind := p_kind;
  else
    if p_kind is null then
      select min(e.spieler_id) into v_kind from eltern_kinder e where lower(e.email)=lower(coalesce(auth.jwt()->>'email',''));
    elsif public.is_parent_of(p_kind) then v_kind := p_kind;
    end if;
    if v_kind is null then raise exception 'not authorized'; end if;
  end if;
  v_kind := public.rufe_familie(v_kind);
  select id into v_id from rufe_raum where familie_kind=v_kind;
  if v_id is null then
    insert into rufe_raum(name, emoji, sort, familie_kind) values ('Trainerteam', '🔒', 1000, v_kind)
    on conflict (familie_kind) where familie_kind is not null do nothing
    returning id into v_id;
    if v_id is null then select id into v_id from rufe_raum where familie_kind=v_kind; end if;
  end if;
  return v_id;
end $$;

-- Trigger wie v670, dazu: stumm gilt nur in offenen Räumen; @alle gibt es nur in offenen Räumen
create or replace function public.rufe_vor_insert() returns trigger
 language plpgsql security definer set search_path to 'public' as $$
declare v_mail text := lower(coalesce((select auth.jwt())->>'email',''));
        v_name text; v_kinder text; v_privat boolean;
begin
  new.autor := auth.uid();
  new.bearbeitet_am := null; new.archiviert_am := null; new.archiviert_von := null;
  select r.familie_kind is not null into v_privat from rufe_raum r where r.id=new.raum_id;
  if not coalesce(v_privat,false) and exists(select 1 from rufe_stumm s where s.user_id=new.autor and s.bis > now()) then
    raise exception 'stumm';
  end if;
  select string_agg(k.name, ', ' order by k.name) into v_kinder
    from eltern_kinder e join kader k on k.id=e.spieler_id where lower(e.email)=v_mail;
  if public.is_trainer() then
    select coalesce(nullif(trim(p.anzeigename),''),'Trainer') into v_name from profiles p where p.id=new.autor;
    new.autor_name := coalesce(v_name,'Trainer'); new.autor_zusatz := 'Trainerteam'; new.autor_rolle := 'trainer';
  else
    select nullif(trim(a.vorname),'') into v_name from eltern_angaben a where a.user_id=new.autor;
    if v_name is null then select nullif(trim(p.anzeigename),'') into v_name from profiles p where p.id=new.autor; end if;
    new.autor_name := coalesce(v_name, 'Elternteil');
    new.autor_zusatz := case when v_kinder is not null then 'Eltern von '||v_kinder else '' end;
    new.autor_rolle := case when exists(select 1 from rufe_moderator m where m.email=v_mail) then 'moderator' else 'eltern' end;
  end if;
  if new.an_alle and (new.autor_rolle = 'eltern' or coalesce(v_privat,false)) then new.an_alle := false; end if;
  if new.antwort_auf is not null and not exists(select 1 from rufe_nachricht n where n.id=new.antwort_auf and n.raum_id=new.raum_id) then
    new.antwort_auf := null;
  end if;
  new.created_at := now();
  return new;
end $$;

-- Archivieren: Absender, Trainer; Moderatoren aus der Elternschaft nur in offenen Räumen
create or replace function public.rufe_archivieren(p_id bigint) returns boolean
 language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.darf_rufen() then raise exception 'not authorized'; end if;
  update rufe_nachricht n set archiviert_am=now(), archiviert_von=auth.uid()
   where n.id=p_id and n.archiviert_am is null and public.rufe_raum_sichtbar(n.raum_id)
     and (n.autor=auth.uid() or public.is_trainer()
          or (public.is_rufe_mod() and exists(select 1 from rufe_raum r where r.id=n.raum_id and r.familie_kind is null)));
  if not found then raise exception 'not authorized'; end if;
  delete from rufe_fixiert where nachricht_id=p_id;
  return true;
end $$;

create or replace function public.rufe_ungelesen() returns table(raum_id bigint, anzahl integer, an_alle boolean)
 language sql stable security definer set search_path to 'public' as $$
  select n.raum_id, count(*)::int, bool_or(n.an_alle)
    from rufe_nachricht n
    join rufe_raum r on r.id=n.raum_id and not r.archiviert
         and (r.familie_kind is null or public.is_trainer() or public.is_parent_of(r.familie_kind))
    left join rufe_gelesen g on g.raum_id=n.raum_id and g.user_id=auth.uid()
   where public.darf_rufen() and n.archiviert_am is null and n.autor<>auth.uid()
     and n.created_at > coalesce(g.zuletzt, '-infinity'::timestamptz)
   group by n.raum_id;
$$;

-- Push wie v673, dazu: private Räume nur an Trainer und die Familie; Link führt in den Raum
create or replace function public.rufe_push_faellig(p_jetzt timestamptz default now())
returns table(user_id uuid, trainer boolean, anzahl integer, titel text, text text, url text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_std int := extract(hour from (p_jetzt at time zone 'Europe/Berlin'))::int;
begin
  if v_std >= 21 or v_std < 7 then return; end if;
  return query
  with empf as (
    select distinct s.user_id, coalesce(p.role='trainer',false) trainer, lower(u.email) mail
      from push_subscriptions s
      join auth.users u on u.id=s.user_id
      left join profiles p on p.id=s.user_id
     where (p.role='trainer' or exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)))
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
end $$;
revoke all on function public.rufe_push_faellig(timestamptz) from public, anon, authenticated;
grant execute on function public.rufe_push_faellig(timestamptz) to service_role;

-- ── Abstimmungen ──────────────────────────────────────────────────────────────────
create table if not exists public.rufe_umfrage (
  id           bigint generated always as identity primary key,
  nachricht_id bigint not null unique references public.rufe_nachricht(id) on delete cascade,
  optionen     text[] not null check (array_length(optionen,1) between 2 and 6),
  anonym       boolean not null default false,
  mehrfach     boolean not null default false,
  schluss      timestamptz,
  beendet_am   timestamptz,
  von          uuid not null default auth.uid(),
  created_at   timestamptz not null default now()
);
comment on table public.rufe_umfrage is 'v674: Abstimmung zu einem Ruf (Ruftext = Frage). Anlegen, abstimmen, beenden nur über RPC.';
alter table public.rufe_umfrage enable row level security;
drop policy if exists ru_lesen on public.rufe_umfrage;
create policy ru_lesen on public.rufe_umfrage for select to authenticated
  using (exists(select 1 from public.rufe_nachricht n where n.id=nachricht_id));
revoke all on public.rufe_umfrage from anon;
revoke insert, update, delete on public.rufe_umfrage from authenticated;

create table if not exists public.rufe_stimme (
  umfrage_id bigint not null references public.rufe_umfrage(id) on delete cascade,
  user_id    uuid not null default auth.uid(),
  option     smallint not null check (option between 0 and 5),
  name       text,
  created_at timestamptz not null default now(),
  primary key (umfrage_id, user_id, option)
);
comment on table public.rufe_stimme is 'v674: Stimmen. Jeder liest nur die eigenen; Ergebnis über rufe_umfrage_stand. Bei anonymen Abstimmungen wird kein Name gespeichert.';
alter table public.rufe_stimme enable row level security;
drop policy if exists rst_eigen on public.rufe_stimme;
create policy rst_eigen on public.rufe_stimme for select to authenticated using (user_id = auth.uid());
revoke all on public.rufe_stimme from anon;
revoke insert, update, delete on public.rufe_stimme from authenticated;

-- Anzeigename wie im Chat: Trainer mit Trainername, Eltern mit Vorname und Kind
create or replace function public.rufe_ich_name() returns text
 language sql stable security definer set search_path to 'public' as $$
  select case when public.is_trainer() then
           coalesce((select nullif(trim(p.anzeigename),'') from profiles p where p.id=auth.uid()),'Trainer')
         else
           coalesce((select nullif(trim(a.vorname),'') from eltern_angaben a where a.user_id=auth.uid()),
                    (select nullif(trim(p.anzeigename),'') from profiles p where p.id=auth.uid()),'Elternteil')
           || coalesce(' ('||(select string_agg(k.name, ', ' order by k.name) from eltern_kinder e join kader k on k.id=e.spieler_id
                              where lower(e.email)=lower(coalesce(auth.jwt()->>'email','')))||')','')
         end;
$$;

create or replace function public.rufe_umfrage_erstellen(p_raum bigint, p_frage text, p_optionen text[],
  p_anonym boolean default false, p_mehrfach boolean default false, p_stunden integer default null) returns bigint
 language plpgsql security definer set search_path to 'public' as $$
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
  insert into rufe_umfrage(nachricht_id, optionen, anonym, mehrfach, schluss, von)
  values (v_n, v_opt, coalesce(p_anonym,false), coalesce(p_mehrfach,false),
          case when p_stunden is null then null else now() + make_interval(hours => p_stunden) end, auth.uid());
  return v_n;
end $$;

-- Abstimmen ersetzt die eigenen Stimmen; eine leere Liste nimmt die Stimme zurück
create or replace function public.rufe_abstimmen(p_umfrage bigint, p_optionen integer[]) returns boolean
 language plpgsql security definer set search_path to 'public' as $$
declare u record; v_opt int[];
begin
  select f.*, n.raum_id, n.archiviert_am into u
    from rufe_umfrage f join rufe_nachricht n on n.id=f.nachricht_id where f.id=p_umfrage;
  if u.id is null or not public.rufe_raum_sichtbar(u.raum_id) or u.archiviert_am is not null then raise exception 'not authorized'; end if;
  if u.beendet_am is not null or (u.schluss is not null and u.schluss <= now()) then raise exception 'beendet'; end if;
  select coalesce(array_agg(distinct o),'{}') into v_opt from unnest(coalesce(p_optionen,'{}')) o;
  if exists(select 1 from unnest(v_opt) o where o < 0 or o >= array_length(u.optionen,1)) then raise exception 'optionen'; end if;
  if not u.mehrfach and array_length(v_opt,1) > 1 then raise exception 'nur eine'; end if;
  delete from rufe_stimme where umfrage_id=p_umfrage and user_id=auth.uid();
  insert into rufe_stimme(umfrage_id, user_id, option, name)
  select p_umfrage, auth.uid(), o, case when u.anonym then null else public.rufe_ich_name() end from unnest(v_opt) o;
  return true;
end $$;

create or replace function public.rufe_umfrage_beenden(p_umfrage bigint) returns boolean
 language plpgsql security definer set search_path to 'public' as $$
begin
  update rufe_umfrage f set beendet_am=now()
    from rufe_nachricht n
   where f.id=p_umfrage and n.id=f.nachricht_id and f.beendet_am is null and public.rufe_raum_sichtbar(n.raum_id)
     and (f.von=auth.uid() or public.is_trainer()
          or (public.is_rufe_mod() and exists(select 1 from rufe_raum r where r.id=n.raum_id and r.familie_kind is null)));
  if not found then raise exception 'not authorized'; end if;
  return true;
end $$;

-- Stand je Antwort: Anzahl, bei namentlichen Abstimmungen die Namen, ob ich sie gewählt habe,
-- und wie viele insgesamt abgestimmt haben
create or replace function public.rufe_umfrage_stand(p_ids bigint[])
returns table(umfrage_id bigint, option integer, anzahl integer, namen text[], ich boolean, teilnehmer integer)
 language sql stable security definer set search_path to 'public' as $$
  select s.umfrage_id, s.option::int, count(*)::int,
         case when f.anonym then null else array_agg(coalesce(s.name,'?') order by s.created_at) end,
         bool_or(s.user_id=auth.uid()),
         (select count(distinct s2.user_id)::int from rufe_stimme s2 where s2.umfrage_id=s.umfrage_id)
    from rufe_stimme s
    join rufe_umfrage f on f.id=s.umfrage_id
    join rufe_nachricht n on n.id=f.nachricht_id
   where s.umfrage_id = any(p_ids) and public.rufe_raum_sichtbar(n.raum_id)
     and (n.archiviert_am is null or public.is_trainer())
   group by s.umfrage_id, s.option, f.anonym;
$$;

do $$
declare f text;
begin
  foreach f in array array['rufe_familie(bigint)','rufe_raum_sichtbar(bigint)','rufe_privat_raum(bigint)','rufe_archivieren(bigint)',
                           'rufe_ungelesen()','rufe_ich_name()','rufe_umfrage_erstellen(bigint,text,text[],boolean,boolean,integer)',
                           'rufe_abstimmen(bigint,integer[])','rufe_umfrage_beenden(bigint)','rufe_umfrage_stand(bigint[])'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  execute 'revoke all on function public.rufe_vor_insert() from public, anon, authenticated';
end $$;
