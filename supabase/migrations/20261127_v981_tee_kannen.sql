-- v981 · Tee-Kannen als Gegenstände (Charles 26.11.2026, nach Bild freigegeben)
-- Bisher (v969) leitete die App aus dem Tee-Eintrag am nächsten Termin ab, dass dieselbe Familie die Kanne am Termin davor
-- mitnimmt – auch wenn sie dort gar nicht ist. Jetzt merkt sich die App, wo jede der zwei Kannen ist:
--   ① Am Termin (ab Beginn, am selben Tag) trägt sich eine Familie, deren Kind zugesagt hat, fürs Mitnehmen einer Kanne ein.
--   ② Die Familie mit der Kanne sieht beim nächsten Termin, für den ihr Kind zugesagt hat, „Bringt ihr sie mit Tee mit?“ –
--      ein Tipp trägt sie bei „🫖 Tee mitbringen“ ein. Mit Beginn dieses Termins ist die Kanne wieder „am Platz“.
--   ③ Trainer sehen, wo die Kannen sind, und können „ist zurück“ setzen. Andere Eltern sehen nur „unterwegs“ – ohne Namen.
-- „Zugesagt“ heißt wie überall in der App: Rückmeldung „zugesagt“, beim Training auch ohne Rückmeldung (gilt als zugesagt).
-- Schreiben nur über die Funktionen; die Tabelle lesen direkt nur Trainer.

create table if not exists public.tee_kanne (
  nr smallint primary key check (nr between 1 and 2),
  user_id uuid,
  name text check (name is null or char_length(name) <= 60),
  seit timestamptz,
  von_termin_id bigint,
  tee_termin_id bigint,
  updated_at timestamptz not null default now()
);
insert into public.tee_kanne(nr) values (1), (2) on conflict (nr) do nothing;

alter table public.tee_kanne enable row level security;
revoke all on public.tee_kanne from anon, authenticated;
grant select on public.tee_kanne to authenticated;
drop policy if exists tee_kanne_trainer_lesen on public.tee_kanne;
create policy tee_kanne_trainer_lesen on public.tee_kanne for select to authenticated using (public.is_trainer());

-- Beginn eines Termins in Berliner Zeit (ohne Uhrzeit: Tagesbeginn)
create or replace function public.tee_termin_beginn(p_termin_id bigint)
returns timestamptz language sql stable security definer set search_path to 'public' as $$
  select ((t.datum || ' ' || coalesce(t.uhrzeit::text, '00:00'))::timestamp at time zone 'Europe/Berlin')
    from public.termine t where t.id = p_termin_id
$$;

-- Kommt ein Kind dieser Familie (E-Mail aus dem Login) zu dem Termin?
create or replace function public.tee_kind_kommt(p_termin_id bigint)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.eltern_kinder ek
      join public.termine t on t.id = p_termin_id
      left join public.rueckmeldungen r on r.termin_id = t.id and r.spieler_id = ek.spieler_id
     where lower(ek.email) = lower(coalesce(auth.jwt()->>'email', ''))
       and (r.status = 'zugesagt' or (t.typ = 'training' and r.status is null))
  )
$$;

-- Ist die Kanne frei? Niemand hat sie, oder der Termin, zu dem sie mit Tee zurückkam, hat begonnen (und fiel nicht aus).
create or replace function public.tee_kanne_ist_frei(k public.tee_kanne)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select k.user_id is null or (k.tee_termin_id is not null and exists (
    select 1 from public.termine t where t.id = k.tee_termin_id
       and coalesce(t.platz_status, '') <> 'abgesagt' and public.tee_termin_beginn(t.id) <= now()))
$$;

-- Stand für alle Angemeldeten: Namen nur für Trainer, eigene Angaben für die Familie mit der Kanne.
create or replace function public.tee_kanne_stand()
returns table(nr smallint, frei boolean, mein boolean, seit timestamptz, name text, tee_termin_id bigint)
language sql stable security definer set search_path to 'public' as $$
  select k.nr,
         public.tee_kanne_ist_frei(k),
         (not public.tee_kanne_ist_frei(k)) and k.user_id = auth.uid(),
         case when public.tee_kanne_ist_frei(k) then null when public.is_trainer() or k.user_id = auth.uid() then k.seit end,
         case when public.tee_kanne_ist_frei(k) then null when public.is_trainer() then k.name end,
         case when public.tee_kanne_ist_frei(k) then null when public.is_trainer() or k.user_id = auth.uid() then k.tee_termin_id end
    from public.tee_kanne k
   where auth.uid() is not null
   order by k.nr
$$;

-- ① Mitnehmen: am Tag des Termins ab Beginn, Kind kommt, Kanne frei, Familie hat nicht schon eine.
create or replace function public.tee_kanne_nehmen(p_nr int, p_termin_id bigint, p_name text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare k public.tee_kanne; t public.termine;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select * into t from public.termine where id = p_termin_id;
  if t.id is null or t.typ not in ('training', 'spiel', 'turnier') or coalesce(t.platz_status, '') = 'abgesagt' then raise exception 'kein Tee-Termin'; end if;
  if not public.is_trainer() then
    if t.datum <> to_char(now() at time zone 'Europe/Berlin', 'YYYY-MM-DD') or public.tee_termin_beginn(t.id) > now() then raise exception 'erst am Termin'; end if;
    if not public.tee_kind_kommt(t.id) then raise exception 'Kind hat nicht zugesagt'; end if;
  end if;
  if exists (select 1 from public.tee_kanne x where x.user_id = auth.uid() and not public.tee_kanne_ist_frei(x)) then raise exception 'ihr habt schon eine Kanne'; end if;
  select * into k from public.tee_kanne where nr = p_nr for update;
  if k.nr is null then raise exception 'unbekannte Kanne'; end if;
  if not public.tee_kanne_ist_frei(k) then return false; end if;
  update public.tee_kanne set user_id = auth.uid(), name = left(coalesce(nullif(trim(p_name), ''), 'Eine Familie'), 60),
         seit = now(), von_termin_id = t.id, tee_termin_id = null, updated_at = now() where nr = p_nr;
  return true;
end $$;

-- ② Mit Tee zurückbringen: nur die Familie mit der Kanne, Termin liegt vorn, Kind kommt. Trägt bei „🫖 Tee mitbringen“ ein.
create or replace function public.tee_kanne_bringen(p_nr int, p_termin_id bigint)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare k public.tee_kanne; t public.termine;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select * into k from public.tee_kanne where nr = p_nr for update;
  if k.nr is null or k.user_id is distinct from auth.uid() or public.tee_kanne_ist_frei(k) then raise exception 'nicht eure Kanne'; end if;
  select * into t from public.termine where id = p_termin_id;
  if t.id is null or t.typ not in ('training', 'spiel', 'turnier') or coalesce(t.platz_status, '') = 'abgesagt' then raise exception 'kein Tee-Termin'; end if;
  if public.tee_termin_beginn(t.id) <= now() then raise exception 'Termin hat schon begonnen'; end if;
  if not public.tee_kind_kommt(t.id) then raise exception 'Kind hat nicht zugesagt'; end if;
  update public.tee_kanne set tee_termin_id = t.id, updated_at = now() where nr = p_nr;
  if not exists (select 1 from public.event_helfer h where h.termin_id = t.id and h.user_id = auth.uid() and h.aufgabe = '🫖 Tee mitbringen') then
    insert into public.event_helfer(termin_id, user_id, name, aufgabe) values (t.id, auth.uid(), k.name, '🫖 Tee mitbringen');
  end if;
  return true;
end $$;

-- ② rückgängig: wieder austragen (die Kanne bleibt bei der Familie).
create or replace function public.tee_kanne_nicht_bringen(p_nr int)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare k public.tee_kanne;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select * into k from public.tee_kanne where nr = p_nr for update;
  if k.nr is null or k.user_id is distinct from auth.uid() or public.tee_kanne_ist_frei(k) or k.tee_termin_id is null then return false; end if;
  delete from public.event_helfer h where h.termin_id = k.tee_termin_id and h.user_id = auth.uid() and h.aufgabe = '🫖 Tee mitbringen';
  update public.tee_kanne set tee_termin_id = null, updated_at = now() where nr = p_nr;
  return true;
end $$;

-- ③ Trainer: Kanne ist zurück.
create or replace function public.tee_kanne_zurueck(p_nr int)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_trainer() then raise exception 'nur Trainer'; end if;
  update public.tee_kanne set user_id = null, name = null, seit = null, von_termin_id = null, tee_termin_id = null, updated_at = now() where nr = p_nr;
  return found;
end $$;

revoke all on function public.tee_termin_beginn(bigint), public.tee_kind_kommt(bigint), public.tee_kanne_ist_frei(public.tee_kanne) from public, anon, authenticated;
revoke all on function public.tee_kanne_stand(), public.tee_kanne_nehmen(int, bigint, text), public.tee_kanne_bringen(int, bigint),
  public.tee_kanne_nicht_bringen(int), public.tee_kanne_zurueck(int) from public, anon;
grant execute on function public.tee_kanne_stand(), public.tee_kanne_nehmen(int, bigint, text), public.tee_kanne_bringen(int, bigint),
  public.tee_kanne_nicht_bringen(int), public.tee_kanne_zurueck(int) to authenticated;
