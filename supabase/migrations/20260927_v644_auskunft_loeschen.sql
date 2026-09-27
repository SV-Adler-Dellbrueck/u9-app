-- v644: Auskunft und Löschen per Knopf (Datenschutz-Paket, Entscheidung Charles 27.09.2026)
--   • Eltern laden alle Daten zu ihrem Konto und ihren Kindern herunter – AUSSER den
--     Einschätzungen des Trainerteams (Bewertungen, Entwicklungsziele, Tagebuch, Blitz-
--     Wertungen, Einheiten-Auswertungen, Nominierungshinweise, Trainingsqualität).
--   • Eltern löschen ihr eigenes Konto selbst (Edge Function konto-loeschen).
--   • Die Daten des Kindes löschen sie per Antrag; der Trainer erledigt ihn mit einem Klick
--     (Edge Function kind-loeschen → kind_daten_loeschen).

-- ── 1. Löschanträge ──────────────────────────────────────────────────────────────────
create table if not exists public.loeschantrag (
  id bigint generated always as identity primary key,
  spieler_id bigint not null,               -- bewusst ohne FK: der Nachweis „erledigt“ überlebt das Kind
  antrag_von uuid default auth.uid(),   -- setzt die Datenbank, nicht der Browser
  antrag_email text,
  erstellt_am timestamptz not null default now(),
  erledigt_am timestamptz,
  erledigt_von uuid
);
create unique index if not exists loeschantrag_offen_je_kind on public.loeschantrag (spieler_id) where erledigt_am is null;
alter table public.loeschantrag enable row level security;
drop policy if exists la_select on public.loeschantrag;
create policy la_select on public.loeschantrag for select to authenticated
  using (public.is_trainer() or antrag_von = (select auth.uid()));
drop policy if exists la_insert on public.loeschantrag;
create policy la_insert on public.loeschantrag for insert to authenticated
  with check (
    antrag_von = (select auth.uid()) and erledigt_am is null
    and exists (select 1 from public.eltern_kinder ek where ek.spieler_id = loeschantrag.spieler_id
                and lower(ek.email) = lower(coalesce((select auth.jwt()) ->> 'email', '')))
  );
drop policy if exists la_trainer on public.loeschantrag;
create policy la_trainer on public.loeschantrag for update to authenticated using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists la_trainer_del on public.loeschantrag;
create policy la_trainer_del on public.loeschantrag for delete to authenticated using (public.is_trainer());
comment on table public.loeschantrag is 'v644: Antrag der Eltern, die Daten ihres Kindes zu löschen. Nach Erledigung bleiben nur spieler_id und Zeitpunkte (Nachweis).';

-- ── 2. Datenauszug für Eltern ────────────────────────────────────────────────────────
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

-- ── 3. Kind vollständig löschen (nur über die Edge Function kind-loeschen, service_role) ──
create or replace function public.kind_daten_loeschen(p_spieler_id bigint, p_trainer uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kd record;
  vorname text;
  vorname_eindeutig boolean;
  alt text;
  neu text := 'Ehemaliges Kind';
  n jsonb := '{}'::jsonb;
  c int;
begin
  select * into kd from public.kader where id = p_spieler_id;
  if not found then return jsonb_build_object('fehler', 'Kind nicht gefunden'); end if;
  vorname := split_part(kd.name, ' ', 1);
  select count(*) = 1 into vorname_eindeutig from public.kader where split_part(name, ' ', 1) = vorname;
  alt := to_jsonb(kd.name)::text;   -- "Vorname Nachname" samt Anführungszeichen, wie es in JSON steht

  -- Einschätzungen und namensgebundene Tabellen: löschen
  delete from public.spielerprofile where name = kd.name;           get diagnostics c = row_count; n := n || jsonb_build_object('bewertungen', c);
  delete from public.blitz_ratings where spieler = kd.name;         get diagnostics c = row_count; n := n || jsonb_build_object('blitz', c);
  delete from public.quiz_progress where player = kd.name or (player = vorname and vorname_eindeutig); get diagnostics c = row_count; n := n || jsonb_build_object('quiz', c);
  delete from public.kabine_lob where spieler_id = kd.id;           get diagnostics c = row_count; n := n || jsonb_build_object('sprachlob', c);
  -- Spielgeschehen: der Teamverlauf bleibt, der Name nicht
  update public.match_actions set spieler = neu where spieler = kd.name;       get diagnostics c = row_count; n := n || jsonb_build_object('spielaktionen_anonymisiert', c);
  update public.einsatzzeiten set spieler = neu where spieler = kd.name;       get diagnostics c = row_count; n := n || jsonb_build_object('einsatzzeiten_anonymisiert', c);
  update public.match_substitutions set spieler = neu where spieler = kd.name; get diagnostics c = row_count; n := n || jsonb_build_object('wechsel_anonymisiert', c);
  -- Anwesenheit: Eintrag des Kindes entfernen (Schlüssel = Kader-ID oder – ältere Tage – Vorname)
  update public.anwesenheit set data = data - kd.id::text where data ? kd.id::text;
  if vorname_eindeutig then update public.anwesenheit set data = data - vorname where data ? vorname; end if;
  -- Pläne, Aufstellungen, Nominierungen, Gruppen, Auswertungen: Name durch Platzhalter ersetzen
  update public.aufstellungen   set lineup  = replace(lineup::text,  alt, to_jsonb(neu)::text)::jsonb where lineup::text  like '%' || alt || '%';
  update public.nominierungen   set data    = replace(data::text,    alt, to_jsonb(neu)::text)::jsonb where data::text    like '%' || alt || '%';
  update public.trainingsgruppen set gruppen = replace(gruppen::text, alt, to_jsonb(neu)::text)::jsonb where gruppen::text like '%' || alt || '%';
  update public.trainings_eval  set data    = replace(data::text,    alt, to_jsonb(neu)::text)::jsonb where data::text    like '%' || alt || '%';
  -- Trainertagebuch: Freitext – voller Name immer, Vorname nur, wenn er im Kader eindeutig ist
  update public.tagebuch_eintrag set
    beobachtung = replace(beobachtung, kd.name, 'ein Kind'), aha = replace(aha, kd.name, 'ein Kind'),
    konsequenz = replace(konsequenz, kd.name, 'ein Kind')
  where coalesce(beobachtung,'') || coalesce(aha,'') || coalesce(konsequenz,'') like '%' || kd.name || '%';
  if vorname_eindeutig and length(vorname) > 2 then
    update public.tagebuch_eintrag set
      beobachtung = regexp_replace(beobachtung, '\m' || vorname || '\M', 'ein Kind', 'g'),
      aha = regexp_replace(aha, '\m' || vorname || '\M', 'ein Kind', 'g'),
      konsequenz = regexp_replace(konsequenz, '\m' || vorname || '\M', 'ein Kind', 'g')
    where coalesce(beobachtung,'') || coalesce(aha,'') || coalesce(konsequenz,'') ~ ('\m' || vorname || '\M');
  end if;
  -- Das Kind selbst: alles mit FK auf kader.id fällt per CASCADE mit (Rückmeldungen, Notfallkarte,
  -- Freigaben, Kontakte, Kabine, Federn, Entwicklungsziele, Einladungen, Kinder-Konten …)
  delete from public.kader where id = kd.id;
  update public.loeschantrag set erledigt_am = now(), erledigt_von = p_trainer, antrag_email = null
    where spieler_id = kd.id and erledigt_am is null;
  return n || jsonb_build_object('ok', true);
end
$$;
revoke all on function public.kind_daten_loeschen(bigint, uuid) from public, anon, authenticated;
grant execute on function public.kind_daten_loeschen(bigint, uuid) to service_role;
