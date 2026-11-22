-- v951 · Charles 22.11.2026: „Es werden immer zwei Familien fest eingeplant. Falls nur 1 benötigt werden sollte, wird das von
-- den Trainern geändert und die beiden Familien können dann wählen, wer übernimmt und wer wieder für die nächste Einteilung
-- verfügbar wäre. Sollten die beiden Familien sich bis 1 Stunde vorher nicht über die App einigen, wählt die App automatisch.“
-- Freigegeben: Auto-Wahl „wer seltener dran war“, Frist 1 Stunde vor der Grillzeit (sonst vor dem Termin), Migration und Job Ja.
--
-- Zustand „Wahl offen“: termine.grill_plaetze = 1, aber noch zwei Einteilungen. Wer abgibt, wird gelöscht – er zählt nicht als
-- Dienst und ist bei der nächsten Einteilung wieder dran (dienst_einteilen zählt die Einteilungen der Saison).
-- termine.grill_wahl hält fest, wer bleibt und wer abgegeben hat; push-send liest es (Benachrichtigung beider Familien).

alter table public.termine add column if not exists grill_wahl jsonb;

-- Wirksames Kind einer Einteilung (übernommen → das übernehmende Kind)
create or replace function public.grill_kind(d public.dienst_einteilung) returns bigint
language sql immutable as $$ select case when d.status='uebernommen' and d.uebernommen_kind is not null then d.uebernommen_kind else d.kind_id end $$;

-- Frist: 1 Stunde vor Beginn der Grillzeit („11:15–12:30“ → 11:15), sonst vor der Terminzeit, sonst vor 10:00 (Berliner Zeit)
create or replace function public.grill_frist(p_termin bigint) returns timestamptz
language sql stable security definer set search_path = public as $$
  select ((te.datum || ' ' || coalesce(replace(substring(te.grill_zeit from '\d{1,2}[:.]\d{2}'), '.', ':'),
                                        to_char(te.uhrzeit, 'HH24:MI'), '10:00'))::timestamp at time zone 'Europe/Berlin') - interval '1 hour'
    from termine te where te.id = p_termin
$$;

-- Eltern wählen: „Wir übernehmen“ (p_uebernehmen true) oder „Wir geben ab“ (false)
create or replace function public.grill_wahl(p_id bigint, p_uebernehmen boolean)
returns json
language plpgsql security definer set search_path = public as $$
declare d dienst_einteilung; v_plaetze int; v_n int; v_bleibt bigint; v_weg bigint;
begin
  if not public.sitzung_gueltig() or public.ist_anonym() then raise exception 'not authorized'; end if;
  select * into d from dienst_einteilung where id = p_id and dienst = 'grillhuette' for update;
  if d.id is null then raise exception 'not found'; end if;
  if not (public.is_parent_of(public.grill_kind(d)) or d.uebernommen_von = auth.uid()) then raise exception 'not authorized'; end if;
  select coalesce(te.grill_plaetze, (select coalesce(max(dienst_plaetze), 2) from team_config)) into v_plaetze from termine te where te.id = d.termin_id;
  select count(*) into v_n from dienst_einteilung where termin_id = d.termin_id and dienst = 'grillhuette';
  if v_plaetze <> 1 or v_n < 2 then raise exception 'keine Wahl offen'; end if;
  if now() >= public.grill_frist(d.termin_id) then raise exception 'Frist vorbei'; end if;
  if p_uebernehmen then
    select public.grill_kind(x) into v_weg from dienst_einteilung x where x.termin_id = d.termin_id and x.dienst = 'grillhuette' and x.id <> p_id limit 1;
    delete from dienst_einteilung where termin_id = d.termin_id and dienst = 'grillhuette' and id <> p_id;
    update dienst_einteilung set platz = 1, geaendert_von = auth.uid(), updated_at = now() where id = p_id;
    v_bleibt := public.grill_kind(d);
  else
    v_weg := public.grill_kind(d);
    delete from dienst_einteilung where id = p_id;
    update dienst_einteilung set platz = 1, updated_at = now() where termin_id = d.termin_id and dienst = 'grillhuette'
      returning public.grill_kind(dienst_einteilung) into v_bleibt;
  end if;
  update termine set grill_wahl = jsonb_build_object('bleibt', v_bleibt, 'weg', v_weg, 'auto', false, 'wann', now(), 'gemeldet', false)
   where id = d.termin_id;
  return json_build_object('termin_id', d.termin_id, 'bleibt', v_bleibt, 'weg', v_weg);
end $$;

-- Auto-Wahl nach der Frist: Es bleibt, wer in dieser Saison seltener Grilldienst hatte; eine freigegebene Einteilung
-- (Familie sucht Ersatz) gibt zuerst ab; bei Gleichstand Platz 1. Nur service_role (Job über push-send).
create or replace function public.grill_wahl_auto()
returns table(termin_id bigint, bleibt bigint, weg bigint)
language plpgsql security definer set search_path = public as $$
declare t record; v_ab text := to_char(public.saison_beginn(), 'YYYY-MM-DD'); v_heute text := to_char(current_date, 'YYYY-MM-DD');
        v_keep bigint; v_bleibt bigint; v_weg bigint;
begin
  for t in
    select te.id from termine te
     where te.datum >= v_heute
       and coalesce(te.grill_plaetze, (select coalesce(max(dienst_plaetze), 2) from team_config)) = 1
       and (select count(*) from dienst_einteilung x where x.termin_id = te.id and x.dienst = 'grillhuette') >= 2
       and now() >= public.grill_frist(te.id)
  loop
    select x.id, public.grill_kind(x) into v_keep, v_bleibt
      from dienst_einteilung x
     where x.termin_id = t.id and x.dienst = 'grillhuette'
     order by (x.status = 'freigegeben'),
              (select count(*) from dienst_einteilung y join termine ty on ty.id = y.termin_id
                where y.dienst = 'grillhuette' and ty.datum >= v_ab and ty.datum < v_heute
                  and public.rufe_familie(public.grill_kind(y)) = public.rufe_familie(public.grill_kind(x))),
              coalesce(x.platz, 1), x.id
     limit 1;
    select public.grill_kind(x) into v_weg from dienst_einteilung x where x.termin_id = t.id and x.dienst = 'grillhuette' and x.id <> v_keep limit 1;
    delete from dienst_einteilung x where x.termin_id = t.id and x.dienst = 'grillhuette' and x.id <> v_keep;
    update dienst_einteilung x set platz = 1, updated_at = now() where x.id = v_keep;
    update termine set grill_wahl = jsonb_build_object('bleibt', v_bleibt, 'weg', v_weg, 'auto', true, 'wann', now(), 'gemeldet', false) where id = t.id;
    termin_id := t.id; bleibt := v_bleibt; weg := v_weg; return next;
  end loop;
end $$;

revoke execute on function public.grill_frist(bigint) from public, anon;
grant execute on function public.grill_frist(bigint) to authenticated, service_role;
revoke execute on function public.grill_wahl(bigint, boolean) from public, anon;
grant execute on function public.grill_wahl(bigint, boolean) to authenticated, service_role;
revoke execute on function public.grill_wahl_auto() from public, anon, authenticated;
grant execute on function public.grill_wahl_auto() to service_role;

-- Job: alle 10 Minuten push-send mit dem Cron-Geheimnis aus dem Vault (art „grill_wahl_auto“). Ohne fällige Wahl tut er nichts.
select cron.unschedule('adler-grill-wahl') where exists (select 1 from cron.job where jobname = 'adler-grill-wahl');
-- Aufruf wie der Job adler-rufe-push (gleiche Kopfzeilen, Geheimnis aus dem Vault), nur Ziel und Inhalt anders – so steht kein Schlüssel im Repo.
select cron.schedule('adler-grill-wahl', '*/10 * * * *',
  replace(replace((select command from cron.job where jobname = 'adler-rufe-push'),
    '/functions/v1/rufe-push', '/functions/v1/push-send'),
    '''{}''::jsonb', '''{"art":"grill_wahl_auto"}''::jsonb'));
