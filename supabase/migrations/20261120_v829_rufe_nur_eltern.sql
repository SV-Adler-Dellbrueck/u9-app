-- v829 · Adler-Rufe: Raum „nur Eltern“ – ohne Trainerteam (Auftrag Charles 10.11.2026)
--
-- Die Eltern bekommen einen Raum, den das Trainerteam weder sieht noch lesen, beschreiben, zählen
-- oder moderieren kann. Wer ein Trainerkonto hat (profiles.role = 'trainer'), ist draußen – auch
-- mit eigenem Kind im Kader. Moderation übernehmen Elternbeirat-Konten aus rufe_moderator
-- (derzeit leer: erst wenn dort Konten stehen, kann jemand Meldungen bearbeiten, archivieren, fixieren).
-- Archivierte Rufe dieses Raums sehen nur diese Moderatoren, nie Trainer.
--
-- Technisch ist es ein Kennzeichen am Raum (rufe_raum.nur_eltern). Alle Stellen, die Trainern
-- bisher überall Zugriff gaben, fragen jetzt zuerst danach: Räume, Rufe, Anhänge (Tabelle und
-- Speicher), Meldungen, „Gesehen von“, ungelesene Zähler, Umfragen, Push.
-- Grenze, offen gesagt: Wer Zugriff auf die Datenbank selbst hat (Projektinhaber), kann die
-- Tabellen weiterhin lesen. Die Rufe stehen weder im Export noch in der nächtlichen Sicherung.

alter table public.rufe_raum add column if not exists nur_eltern boolean not null default false;
alter table public.rufe_raum drop constraint if exists rufe_raum_eltern_ohne_familie;
alter table public.rufe_raum add constraint rufe_raum_eltern_ohne_familie check (not nur_eltern or familie_kind is null);

-- Hilfsfunktionen (ohne RLS lesen, damit auch ein Trainer eine ehrliche Antwort bekommt)
create or replace function public.rufe_nur_eltern(p_raum bigint) returns boolean
 language sql stable security definer set search_path to 'public' as $fn$
  select coalesce((select r.nur_eltern from public.rufe_raum r where r.id = p_raum), false);
$fn$;
create or replace function public.rufe_nachricht_nur_eltern(p_nachricht bigint) returns boolean
 language sql stable security definer set search_path to 'public' as $fn$
  select coalesce((select r.nur_eltern from public.rufe_nachricht n join public.rufe_raum r on r.id = n.raum_id
                    where n.id = p_nachricht), false);
$fn$;
create or replace function public.rufe_anhang_nur_eltern(p_pfad text) returns boolean
 language sql stable security definer set search_path to 'public' as $fn$
  select coalesce(public.rufe_nur_eltern(public.rufe_anhang_raum(p_pfad)), false);
$fn$;

-- Zentrale Prüfung „darf diesen Raum sehen“
create or replace function public.rufe_raum_sichtbar(p_raum bigint) returns boolean
 language sql stable security definer set search_path to 'public' as $fn$
  select public.darf_rufen() and exists(
    select 1 from rufe_raum r where r.id = p_raum
      and case when r.nur_eltern then not public.is_trainer()
               else (r.familie_kind is null or public.is_trainer() or public.is_parent_of(r.familie_kind)) end);
$fn$;

-- Wer archivierte Rufe eines Raums sehen darf: im Eltern-Raum nur dessen Moderatoren, sonst die Trainer
create or replace function public.rufe_darf_archiv(p_raum bigint) returns boolean
 language sql stable security definer set search_path to 'public' as $fn$
  select case when public.rufe_nur_eltern(p_raum)
              then public.rufe_raum_sichtbar(p_raum) and public.is_rufe_mod()
              else public.is_trainer() end;
$fn$;
revoke all on function public.rufe_nur_eltern(bigint), public.rufe_nachricht_nur_eltern(bigint),
  public.rufe_anhang_nur_eltern(text), public.rufe_darf_archiv(bigint) from public, anon;
grant execute on function public.rufe_nur_eltern(bigint), public.rufe_nachricht_nur_eltern(bigint),
  public.rufe_anhang_nur_eltern(text), public.rufe_darf_archiv(bigint) to authenticated;

-- Funktionen, die Trainern bisher überall Zugriff gaben (Wortlaut der laufenden Fassung, je eine Zeile geändert)
CREATE OR REPLACE FUNCTION public.rufe_anhang_lesbar(p_pfad text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                 select exists (select 1 from rufe_anhang a join rufe_nachricht n on n.id = a.nachricht_id
                                                                                                                                  where a.pfad = p_pfad and public.rufe_raum_sichtbar(a.raum_id) and (n.archiviert_am is null or public.rufe_darf_archiv(a.raum_id)));
                                                                                                                                  $function$;

CREATE OR REPLACE FUNCTION public.rufe_ungelesen()
 RETURNS TABLE(raum_id bigint, anzahl integer, an_alle boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select n.raum_id, count(*)::int, bool_or(n.an_alle)
    from rufe_nachricht n
    join rufe_raum r on r.id=n.raum_id and not r.archiviert
         and public.rufe_raum_sichtbar(r.id)
    left join rufe_gelesen g on g.raum_id=n.raum_id and g.user_id=auth.uid()
   where public.darf_rufen() and n.archiviert_am is null and n.autor<>auth.uid()
     and n.created_at > coalesce(g.zuletzt, '-infinity'::timestamptz)
   group by n.raum_id;
$function$;

CREATE OR REPLACE FUNCTION public.rufe_umfrage_stand(p_ids bigint[])
 RETURNS TABLE(umfrage_id bigint, option integer, anzahl integer, namen text[], ich boolean, teilnehmer integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.umfrage_id, s.option::int, count(*)::int,
         case when f.anonym then null else array_agg(coalesce(s.name,'?') order by s.created_at) end,
         bool_or(s.user_id=auth.uid()),
         (select count(distinct s2.user_id)::int from rufe_stimme s2 where s2.umfrage_id=s.umfrage_id)
    from rufe_stimme s
    join rufe_umfrage f on f.id=s.umfrage_id
    join rufe_nachricht n on n.id=f.nachricht_id
   where s.umfrage_id = any(p_ids) and public.rufe_raum_sichtbar(n.raum_id)
     and public.rufe_darf_archiv(n.raum_id)
   group by s.umfrage_id, s.option, f.anonym;
$function$;

CREATE OR REPLACE FUNCTION public.rufe_gesehen(p_nachricht bigint)
 RETURNS TABLE(name text, trainer boolean, gesehen boolean, zuletzt timestamp with time zone, ohne_zugang boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select e.name, e.trainer, e.gesehen, case when e.gesehen then e.zuletzt end, false
    from public._rufe_empfaenger(p_nachricht) e where public.is_trainer() and not public.rufe_nachricht_nur_eltern(p_nachricht)
  union all
  select k.name, false, false, null, true
    from kader k
   where public.is_trainer() and not public.rufe_nachricht_nur_eltern(p_nachricht) and k.aktiv
     and exists(select 1 from rufe_nachricht n join rufe_raum r on r.id=n.raum_id where n.id=p_nachricht and r.familie_kind is null)
     and not exists(select 1 from eltern_kinder e join auth.users u on lower(u.email)=lower(e.email) where e.spieler_id=k.id);
$function$;

CREATE OR REPLACE FUNCTION public.rufe_gesehen_zahlen(p_ids bigint[])
 RETURNS TABLE(nachricht_id bigint, gesehen integer, empfaenger integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select i, count(*) filter (where e.gesehen)::int, count(*)::int
    from unnest(p_ids[1:200]) i, public._rufe_empfaenger(i) e
   where public.is_trainer() and not public.rufe_nachricht_nur_eltern(i)
   group by i;
$function$;

CREATE OR REPLACE FUNCTION public.rufe_anhaenge_loeschen(p_nachricht bigint)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                            declare v_pfade text[];
                                                                                                                                                                                                                            begin
                                                                                                                                                                                                                              if not public.is_trainer() or public.rufe_nachricht_nur_eltern(p_nachricht) then raise exception 'not authorized'; end if;
                                                                                                                                                                                                                                with weg as (delete from rufe_anhang where nachricht_id = p_nachricht returning pfad)
                                                                                                                                                                                                                                  select coalesce(array_agg(pfad), '{}') into v_pfade from weg;
                                                                                                                                                                                                                                    if array_length(v_pfade, 1) > 0 then update rufe_nachricht set anhang_entfernt_am = now() where id = p_nachricht; end if;
                                                                                                                                                                                                                                      return v_pfade;
                                                                                                                                                                                                                                      end $function$;

CREATE OR REPLACE FUNCTION public.rufe_push_faellig(p_jetzt timestamp with time zone DEFAULT now())
 RETURNS TABLE(user_id uuid, trainer boolean, anzahl integer, titel text, text text, url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  return query
  with empf as (
    select distinct s.user_id, coalesce(p.role='trainer',false) trainer, lower(u.email) mail
      from push_subscriptions s
      join auth.users u on u.id=s.user_id
      left join profiles p on p.id=s.user_id
     where (p.role='trainer' or exists(select 1 from eltern_kinder e where lower(e.email)=lower(u.email)))
       and not public.push_ruht(s.user_id, p_jetzt)
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
       and not (r.nur_eltern and e.trainer)
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

-- Policies
drop policy if exists rr_lesen on public.rufe_raum;
create policy rr_lesen on public.rufe_raum for select to authenticated
  using (public.darf_rufen() and case when nur_eltern then not public.is_trainer()
                                      else (familie_kind is null or public.is_trainer() or public.is_parent_of(familie_kind)) end);
drop policy if exists rr_mod on public.rufe_raum;
create policy rr_mod on public.rufe_raum for all to authenticated
  using (public.is_rufe_mod() and familie_kind is null and (not nur_eltern or not public.is_trainer()))
  with check (public.is_rufe_mod() and familie_kind is null and (not nur_eltern or not public.is_trainer()));

drop policy if exists rn_lesen on public.rufe_nachricht;
create policy rn_lesen on public.rufe_nachricht for select to authenticated
  using (public.rufe_raum_sichtbar(raum_id) and (archiviert_am is null or public.rufe_darf_archiv(raum_id)));

drop policy if exists ra_lesen on public.rufe_anhang;
create policy ra_lesen on public.rufe_anhang for select to authenticated
  using (public.rufe_raum_sichtbar(raum_id) and exists (select 1 from public.rufe_nachricht n
          where n.id = rufe_anhang.nachricht_id and (n.archiviert_am is null or public.rufe_darf_archiv(rufe_anhang.raum_id))));
drop policy if exists ra_loeschen on public.rufe_anhang;
create policy ra_loeschen on public.rufe_anhang for delete to authenticated
  using (public.is_trainer() and not public.rufe_nur_eltern(raum_id));

-- Meldungen aus dem Eltern-Raum sieht kein Trainer (auch nicht den Grund)
drop policy if exists rme_mod on public.rufe_meldung;
create policy rme_mod on public.rufe_meldung for select to authenticated
  using (public.is_rufe_mod() and not (public.rufe_nachricht_nur_eltern(nachricht_id) and public.is_trainer()));
drop policy if exists rme_erledigt on public.rufe_meldung;
create policy rme_erledigt on public.rufe_meldung for update to authenticated
  using (public.is_rufe_mod() and not (public.rufe_nachricht_nur_eltern(nachricht_id) and public.is_trainer()))
  with check (public.is_rufe_mod() and not (public.rufe_nachricht_nur_eltern(nachricht_id) and public.is_trainer()));

-- Speicher: Trainer lesen und löschen weiter alles – außer im Eltern-Raum
drop policy if exists "rufe-anhang lesen" on storage.objects;
create policy "rufe-anhang lesen" on storage.objects for select to authenticated using (
  bucket_id = 'rufe-anhang' and (public.rufe_anhang_lesbar(name)
    or (public.is_trainer() and not public.rufe_anhang_nur_eltern(name))
    or (coalesce(owner_id, owner::text) = auth.uid()::text and not public.rufe_anhang_vergeben(name))));
drop policy if exists "rufe-anhang loeschen" on storage.objects;
create policy "rufe-anhang loeschen" on storage.objects for delete to authenticated using (
  bucket_id = 'rufe-anhang' and ((public.is_trainer() and not public.rufe_anhang_nur_eltern(name))
    or (coalesce(owner_id, owner::text) = auth.uid()::text and not public.rufe_anhang_vergeben(name))));

-- Der Raum selbst (einmalig; Name und Zeichen später über rufe_raum änderbar – nur von Elternbeirat-Moderatoren)
insert into public.rufe_raum(name, emoji, sort, nur_eltern)
select 'Elternrunde', '👪', 10, true
 where not exists (select 1 from public.rufe_raum where nur_eltern);
