-- v660 · Angaben der Eltern und Geburtstag des Kindes
-- PO 28.09.: „… dass alle Eltern als To-do angezeigt bekommen, die Daten ihres Kindes und ihre
-- eigenen einzutragen … Name, Handy, E-Mail, Geburtsdatum, damit wir auch den Eltern als Teil
-- der Mannschaft gratulieren können. Vom Kind brauchen wir das auch.“
-- Die E-Mail steht schon im Konto (auth.users/profiles) und wird nicht doppelt gespeichert.
-- Sehen dürfen die Angaben nur das Elternteil selbst und das Trainerteam.

create table if not exists public.eltern_angaben (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  vorname     text check (vorname is null or char_length(vorname) between 1 and 60),
  nachname    text check (nachname is null or char_length(nachname) between 1 and 60),
  handy       text check (handy is null or handy ~ '^[0-9 +()/-]{6,25}$'),
  geburtstag  date check (geburtstag is null or geburtstag between date '1920-01-01' and current_date),
  updated_at  timestamptz not null default now()
);
comment on table public.eltern_angaben is
  'v660: Angaben eines Elternteils (Name, Handy, Geburtstag) für Rückfragen und Gratulation. Nur das Elternteil selbst und Trainer lesen.';

alter table public.eltern_angaben enable row level security;

drop policy if exists eltern_angaben_selbst on public.eltern_angaben;
create policy eltern_angaben_selbst on public.eltern_angaben
  for all to authenticated
  using (user_id = (select auth.uid()) and public.sitzung_gueltig())
  with check (user_id = (select auth.uid()) and public.sitzung_gueltig());

drop policy if exists eltern_angaben_trainer_lesen on public.eltern_angaben;
create policy eltern_angaben_trainer_lesen on public.eltern_angaben
  for select to authenticated
  using (public.is_trainer());

revoke all on public.eltern_angaben from anon;

-- Geburtstag des eigenen Kindes: kader bleibt für Eltern nur lesbar; dieser eine Wert geht
-- über eine geprüfte Funktion.
create or replace function public.eltern_kind_geburtstag(p_spieler_id bigint, p_geb date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  if not public.is_parent_of(p_spieler_id) then raise exception 'nicht dein Kind'; end if;
  if p_geb is null or p_geb < (current_date - interval '15 years') or p_geb > (current_date - interval '3 years') then
    raise exception 'Geburtsdatum passt nicht zu einem Kind dieser Altersklasse';
  end if;
  update public.kader set geb = p_geb, updated_at = now() where id = p_spieler_id;
end
$$;
revoke all on function public.eltern_kind_geburtstag(bigint, date) from public, anon;
grant execute on function public.eltern_kind_geburtstag(bigint, date) to authenticated;

-- Auskunft (v644): die neuen Angaben gehören in „Meine Daten herunterladen“.
create or replace function public.eltern_datenauszug()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mail text;
  kid record;
  k jsonb;
  kinder jsonb := '[]'::jsonb;
  tab text;
  v jsonb;
  vorname text;
begin
  if uid is null then raise exception 'nicht angemeldet'; end if;
  select lower(u.email) into mail from auth.users u where u.id = uid;
  for kid in
    select kd.* from public.kader kd
    where kd.id in (select ek.spieler_id from public.eltern_kinder ek where lower(ek.email) = mail)
    order by kd.id
  loop
    k := jsonb_build_object('stammdaten', to_jsonb(kid) - 'rsvp_token' - 'sort_order' - 'tw_prio');
    foreach tab in array array['rueckmeldungen','foto_consent','kind_notfall','kind_kontakte','kind_pause',
      'kind_fanfacts','kind_selbstbild','kind_stimmung','kabine_lob','kabine_reporter','kabinen_wahl_stimmen',
      'punkte_log','abhol_info','betreuung','buedchen','ausstattung_ausgabe','waesche_log','album_kind',
      'kind_konto','kassen_beitrag']
    loop
      execute format('select coalesce(jsonb_agg(to_jsonb(t) - ''spieler_id''), ''[]''::jsonb) from public.%I t where t.spieler_id = $1', tab)
        into v using kid.id;
      k := k || jsonb_build_object(tab, v);
    end loop;
    -- Spielgeschehen: Tore, Einsatzzeiten, Wechsel (Tatsachen, keine Bewertung)
    k := k || jsonb_build_object(
      'spielaktionen', coalesce((select jsonb_agg(jsonb_build_object('datum', m.datum, 'aktion', m.aktion, 'runde', m.runde)) from public.match_actions m where m.spieler = kid.name), '[]'::jsonb),
      'einsatzzeiten', coalesce((select jsonb_agg(jsonb_build_object('datum', e.datum, 'feld_sek', e.feld_sek)) from public.einsatzzeiten e where e.spieler = kid.name), '[]'::jsonb),
      'wechsel', coalesce((select jsonb_agg(jsonb_build_object('datum', s.datum, 'richtung', s.richtung, 'minute', s.minute)) from public.match_substitutions s where s.spieler = kid.name), '[]'::jsonb),
      'kabinenpost', coalesce((select jsonb_agg(jsonb_build_object('typ', p.typ, 'datum', p.datum, 'richtung', case when p.von_spieler = kid.id then 'gesendet' else 'erhalten' end))
                                from public.kabine_post p where p.von_spieler = kid.id or p.an_spieler = kid.id), '[]'::jsonb));
    -- Anwesenheit: nur „da“ – die Qualitätsnote des Trainings ist eine Einschätzung und bleibt weg
    vorname := split_part(kid.name, ' ', 1);
    k := k || jsonb_build_object('anwesenheit', coalesce((
      select jsonb_agg(jsonb_build_object('datum', a.datum, 'da', coalesce(a.data -> kid.id::text -> 'da', a.data -> vorname -> 'da')) order by a.datum)
      from public.anwesenheit a
      where a.data ? kid.id::text or a.data ? vorname), '[]'::jsonb));
    kinder := kinder || jsonb_build_array(k);
  end loop;
  return jsonb_build_object(
    'erstellt', now(),
    'verein', 'SV Adler Dellbrück · U9',
    'hinweis', 'Enthalten sind alle Daten, die die App zu deinem Konto und deinen Kindern speichert – außer den Einschätzungen des Trainerteams (Bewertungen, Entwicklungsziele, Trainernotizen). Diese kannst du beim Trainerteam anfragen.',
    'konto', jsonb_build_object(
      'profil', (select to_jsonb(p) from public.profiles p where p.id = uid),
      'angaben', (select to_jsonb(ea) - 'user_id' from public.eltern_angaben ea where ea.user_id = uid),   -- v660
      'email', mail,
      'einwilligungen', coalesce((select jsonb_agg(to_jsonb(x) - 'user_id') from public.dsgvo_consent x where x.user_id = uid), '[]'::jsonb),
      'fairplay_zusage', (select max(f.committed_at) from public.fairplay_commit f where f.user_id = uid),
      'benachrichtigungen_geraete', (select count(*) from public.push_subscriptions ps where ps.user_id = uid),
      'helferdienste', coalesce((select jsonb_agg(to_jsonb(h) - 'user_id') from public.event_helfer h where h.user_id = uid), '[]'::jsonb),
      'stimmungsbilder', coalesce((select jsonb_agg(to_jsonb(ep) - 'user_id') from public.event_puls ep where ep.user_id = uid), '[]'::jsonb),
      'gespraechswuensche', coalesce((select jsonb_agg(to_jsonb(g) - 'created_by') from public.elterngespraech_wunsch g where g.created_by = uid), '[]'::jsonb),
      'mitbringliste', coalesce((select jsonb_agg(to_jsonb(mb) - 'created_by') from public.event_mitbringen mb where mb.created_by = uid), '[]'::jsonb),
      'terminabstimmungen', coalesce((select jsonb_agg(to_jsonb(pv) - 'voter') from public.eltern_poll_vote pv where pv.voter = uid), '[]'::jsonb),
      'gelesene_ansagen', (select count(*) from public.ansagen_gelesen ag where ag.user_id = uid),
      'loeschantraege', coalesce((select jsonb_agg(to_jsonb(l) - 'antrag_von') from public.loeschantrag l where l.antrag_von = uid), '[]'::jsonb)),
    'kinder', kinder);
end
$$;
revoke all on function public.eltern_datenauszug() from public, anon;
grant execute on function public.eltern_datenauszug() to authenticated;
