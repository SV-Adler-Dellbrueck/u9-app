-- Kinder-App, Schritt 2 (Auftragspaket doku/auftrag-kinder-app/Auftragspaket_Kinder-App.md)
--
-- Die Kabine ist heute ein Schloss in der Eltern-Sitzung: jede Abfrage laeuft ueber
-- is_parent_of(spieler_id) gegen die E-Mail der angemeldeten Eltern. Auf einem eigenen
-- Geraet des Kindes traegt das nicht mehr - dort laege sonst dauerhaft eine Sitzung mit
-- allen Elternrechten. Diese Migration gibt dem Kind eine eigene Identitaet und erzwingt
-- in der Datenbank, was es sehen und schreiben darf.
--
-- Drei Tabellen, zwei Prueffunktionen, vier neue RPCs, und in den Policies der
-- Kabinen-Tabellen jeweils EIN zusaetzliches ODER. Nichts wird eingeschraenkt: Eltern und
-- Trainer behalten Wort fuer Wort ihre bisherigen Rechte.
--
-- KEINE personenbezogenen Daten in den neuen Tabellen: wer gekoppelt hat, steht als
-- auth-uid, nicht als E-Mail. Eine Sicherung der App laedt diese Tabellen mit herunter.

-- ── 1 · Tabellen ──────────────────────────────────────────────────────────────

-- Ein Geraet eines Kindes. Der Schluessel ist die auth-uid der anonymen Sitzung;
-- faellt das Konto weg, faellt die Zeile mit (on delete cascade).
create table if not exists public.kind_konto (
  uid            uuid        primary key references auth.users(id) on delete cascade,
  spieler_id     bigint      not null references public.kader(id) on delete cascade,
  geraet         text,                                    -- frei benannt von den Eltern
  tageslimit_min smallint    not null default 60 check (tageslimit_min between 0 and 180),
  aktiv          boolean     not null default true,       -- Entkoppeln setzt false, statt zu loeschen
  gekoppelt_am   timestamptz not null default now(),
  gekoppelt_von  uuid                                     -- auth-uid der Eltern, KEINE E-Mail
);
comment on table public.kind_konto is
  'Ein Kindergeraet: anonymes Konto, von den Eltern per Code an ein Kind gebunden. tageslimit_min ist die taegliche Appzeit.';
create index if not exists kind_konto_spieler_idx on public.kind_konto (spieler_id);

-- Einmal-Code, den die Eltern in ihrer App erzeugen. Gespeichert wird nur der Hash -
-- der Code selbst steht auf dem Bildschirm der Eltern und nirgends sonst.
create table if not exists public.kind_kopplung (
  id            bigint generated always as identity primary key,
  spieler_id    bigint      not null references public.kader(id) on delete cascade,
  code_hash     text        not null,
  erstellt_von  uuid,                                     -- auth-uid der Eltern
  erstellt_am   timestamptz not null default now(),
  gueltig_bis   timestamptz not null,
  eingeloest_am timestamptz
);
create index if not exists kind_kopplung_offen_idx on public.kind_kopplung (code_hash)
  where eingeloest_am is null;

-- Minuten je Geraet und Tag. Geschrieben wird ausschliesslich ueber kind_tick();
-- deshalb gibt es fuer diese Tabelle bewusst KEINE Schreib-Policy.
create table if not exists public.kind_sitzung (
  uid     uuid     not null references public.kind_konto(uid) on delete cascade,
  datum   date     not null,                              -- Tag in Europe/Berlin
  minuten smallint not null default 0,
  primary key (uid, datum)
);

alter table public.kind_konto    enable row level security;
alter table public.kind_kopplung enable row level security;
alter table public.kind_sitzung  enable row level security;

-- ── 2 · Prueffunktionen ───────────────────────────────────────────────────────

-- „Bin ich dieses Kind?" - das Gegenstueck zu is_parent_of fuer die Kind-Sitzung.
create or replace function public.is_kind_selbst(p_spieler bigint)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(
    select 1 from public.kind_konto
     where uid = (select auth.uid()) and spieler_id = p_spieler and aktiv
  );
$$;

-- Ist fuer heute noch Appzeit uebrig? Gilt nur fuer Kind-Sitzungen; wer kein Kindergeraet
-- ist, bekommt false - die Policies fragen das ausschliesslich im Kind-Zweig ab.
create or replace function public.kind_zeit_uebrig()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(
    select 1 from public.kind_konto k
     left join public.kind_sitzung s
       on s.uid = k.uid
      and s.datum = (now() at time zone 'Europe/Berlin')::date
     where k.uid = (select auth.uid()) and k.aktiv
       and coalesce(s.minuten, 0) < k.tageslimit_min
  );
$$;

-- ── 3 · Policies der neuen Tabellen ───────────────────────────────────────────

-- Das Kind liest seine eigene Zeile (Limit und Geraetename), aendern duerfen nur die
-- Eltern. Ein Kind, das sein eigenes Tageslimit hochsetzen koennte, haette keines.
drop policy if exists kind_konto_sel on public.kind_konto;
create policy kind_konto_sel on public.kind_konto for select
  using (is_trainer() or is_parent_of(spieler_id) or uid = (select auth.uid()));
drop policy if exists kind_konto_ins on public.kind_konto;
create policy kind_konto_ins on public.kind_konto for insert
  with check (is_trainer() or is_parent_of(spieler_id));
drop policy if exists kind_konto_upd on public.kind_konto;
create policy kind_konto_upd on public.kind_konto for update
  using (is_trainer() or is_parent_of(spieler_id))
  with check (is_trainer() or is_parent_of(spieler_id));
drop policy if exists kind_konto_del on public.kind_konto;
create policy kind_konto_del on public.kind_konto for delete
  using (is_trainer() or is_parent_of(spieler_id));

-- Den Kopplungscode sehen und setzen nur Eltern und Trainer. Eingeloest wird er von der
-- Edge Function mit dem Dienstschluessel, die an der RLS vorbeigeht.
drop policy if exists kind_kopplung_sel on public.kind_kopplung;
create policy kind_kopplung_sel on public.kind_kopplung for select
  using (is_trainer() or is_parent_of(spieler_id));
drop policy if exists kind_kopplung_ins on public.kind_kopplung;
create policy kind_kopplung_ins on public.kind_kopplung for insert
  with check (is_trainer() or is_parent_of(spieler_id));
drop policy if exists kind_kopplung_del on public.kind_kopplung;
create policy kind_kopplung_del on public.kind_kopplung for delete
  using (is_trainer() or is_parent_of(spieler_id));

-- Nur lesen: das Kind seine eigenen Minuten, die Eltern die ihrer Kinder.
drop policy if exists kind_sitzung_sel on public.kind_sitzung;
create policy kind_sitzung_sel on public.kind_sitzung for select
  using (
    is_trainer() or uid = (select auth.uid())
    or exists(select 1 from public.kind_konto k where k.uid = kind_sitzung.uid and is_parent_of(k.spieler_id))
  );

-- ── 4 · Die Kabinen-Tabellen: je ein ODER mehr ────────────────────────────────
-- Schreiben zusaetzlich nur, solange Appzeit uebrig ist. Der Zeitriegel steht IM
-- Kind-Zweig - sonst wuerde er Eltern und Trainer mit aussperren.

drop policy if exists kabine_post_sel on public.kabine_post;
create policy kabine_post_sel on public.kabine_post for select
  using (is_trainer() or is_parent_of(an_spieler) or is_parent_of(von_spieler)
         or is_kind_selbst(an_spieler) or is_kind_selbst(von_spieler));
drop policy if exists kabine_post_ins on public.kabine_post;
create policy kabine_post_ins on public.kabine_post for insert
  with check (is_trainer()
    or (von_spieler is not null and is_parent_of(von_spieler))
    or (typ = 'horst' and is_parent_of(an_spieler))
    or (von_spieler is not null and is_kind_selbst(von_spieler) and kind_zeit_uebrig())
    or (typ = 'horst' and is_kind_selbst(an_spieler) and kind_zeit_uebrig()));
-- „gesehen" ist die Folge des Lesens, nicht ein neuer Inhalt: ohne Zeitriegel, sonst
-- bliebe Post nach Ablauf fuer immer ungelesen markiert.
drop policy if exists kabine_post_upd on public.kabine_post;
create policy kabine_post_upd on public.kabine_post for update
  using (is_trainer() or is_parent_of(an_spieler) or is_kind_selbst(an_spieler))
  with check (is_trainer() or is_parent_of(an_spieler) or is_kind_selbst(an_spieler));

drop policy if exists kl_sel on public.kabine_lob;
create policy kl_sel on public.kabine_lob for select
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id));

drop policy if exists kabine_reporter_sel on public.kabine_reporter;
create policy kabine_reporter_sel on public.kabine_reporter for select
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id) or freigegeben = true);
drop policy if exists kabine_reporter_ins on public.kabine_reporter;
create policy kabine_reporter_ins on public.kabine_reporter for insert
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));
drop policy if exists kabine_reporter_del on public.kabine_reporter;
create policy kabine_reporter_del on public.kabine_reporter for delete
  using (is_trainer() or is_parent_of(spieler_id)
         or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));

drop policy if exists kws_sel on public.kabinen_wahl_stimmen;
create policy kws_sel on public.kabinen_wahl_stimmen for select
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id));
drop policy if exists kws_ins on public.kabinen_wahl_stimmen;
create policy kws_ins on public.kabinen_wahl_stimmen for insert
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));
drop policy if exists kws_upd on public.kabinen_wahl_stimmen;
create policy kws_upd on public.kabinen_wahl_stimmen for update
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id))
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));

drop policy if exists kind_stimmung_sel on public.kind_stimmung;
create policy kind_stimmung_sel on public.kind_stimmung for select
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id));
drop policy if exists kind_stimmung_ins on public.kind_stimmung;
create policy kind_stimmung_ins on public.kind_stimmung for insert
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));
drop policy if exists kind_stimmung_upd on public.kind_stimmung;
create policy kind_stimmung_upd on public.kind_stimmung for update
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id))
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));

drop policy if exists kind_selbstbild_sel on public.kind_selbstbild;
create policy kind_selbstbild_sel on public.kind_selbstbild for select
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id));
drop policy if exists kind_selbstbild_ins on public.kind_selbstbild;
create policy kind_selbstbild_ins on public.kind_selbstbild for insert
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));

drop policy if exists album_kind_sel on public.album_kind;
create policy album_kind_sel on public.album_kind for select
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id));
drop policy if exists album_kind_ins on public.album_kind;
create policy album_kind_ins on public.album_kind for insert
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));
drop policy if exists album_kind_upd on public.album_kind;
create policy album_kind_upd on public.album_kind for update
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id))
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));

drop policy if exists album_tausch_ins on public.album_tausch;
create policy album_tausch_ins on public.album_tausch for insert
  with check (is_trainer() or is_parent_of(von_spieler)
              or (is_kind_selbst(von_spieler) and kind_zeit_uebrig()));
drop policy if exists album_tausch_del on public.album_tausch;
create policy album_tausch_del on public.album_tausch for delete
  using (is_trainer() or is_parent_of(von_spieler)
         or (is_kind_selbst(von_spieler) and kind_zeit_uebrig()));

drop policy if exists kf_rw on public.kind_fanfacts;
create policy kf_rw on public.kind_fanfacts for all to authenticated
  using (is_trainer() or is_parent_of(spieler_id) or is_kind_selbst(spieler_id))
  with check (is_trainer() or is_parent_of(spieler_id)
              or (is_kind_selbst(spieler_id) and kind_zeit_uebrig()));

-- Das eigene Kind im Kader lesen (Geburtstag, Nummer) - wie die Eltern es duerfen.
drop policy if exists kader_kind_select on public.kader;
create policy kader_kind_select on public.kader for select to authenticated
  using (is_kind_selbst(id));

-- ── 5 · Die sieben RPCs der Kabine ────────────────────────────────────────────
-- Wortgleich wie bisher, nur der Berechtigungssatz bekommt den Kind-Zweig.

create or replace function public.kind_rolle_heute(p_spieler bigint)
returns json language plpgsql stable security definer set search_path to 'public' as $$
declare v_name text; v_datum text; v_lineup jsonb; v_rolle text;
begin
  if not (is_trainer() or is_parent_of(p_spieler) or is_kind_selbst(p_spieler)) then
    return json_build_object('ok', false, 'error', 'nicht berechtigt');
  end if;
  v_datum := to_char(now() at time zone 'Europe/Berlin', 'YYYY-MM-DD');
  select name into v_name from kader where id = p_spieler;
  if v_name is null then return json_build_object('ok', false); end if;
  select lineup into v_lineup from aufstellungen where datum = v_datum;
  if v_lineup is null then return json_build_object('ok', true, 'rolle', null); end if;
  select key into v_rolle from jsonb_each_text(v_lineup) where value = v_name limit 1;
  return json_build_object('ok', true, 'datum', v_datum, 'rolle', v_rolle);
end $$;

create or replace function public.meine_rollen(p_spieler_id bigint)
returns json language plpgsql security definer set search_path to 'public' as $$
declare v_name text; res json;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not (public.is_parent_of(p_spieler_id) or public.is_trainer() or public.is_kind_selbst(p_spieler_id)) then
    raise exception 'not authorized for this player';
  end if;
  select name into v_name from public.kader where id=p_spieler_id;
  if v_name is null then return json_build_object('games',0); end if;
  select json_build_object(
    'tw',   count(*) filter (where lineup->>'tw'   = v_name),
    'auf',  count(*) filter (where lineup->>'auf'  = v_name),
    'fll',  count(*) filter (where lineup->>'fll'  = v_name),
    'flr',  count(*) filter (where lineup->>'flr'  = v_name),
    'jaeg', count(*) filter (where lineup->>'jaeg' = v_name),
    'games', count(*)
  ) into res from public.aufstellungen;
  return res;
end $$;

create or replace function public.meine_ziele(p_spieler_id bigint)
returns json language plpgsql security definer set search_path to 'public' as $$
declare res json;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not (public.is_parent_of(p_spieler_id) or public.is_trainer() or public.is_kind_selbst(p_spieler_id)) then
    raise exception 'not authorized for this player';
  end if;
  select coalesce(json_agg(json_build_object('ziel',ziel,'meta',meta) order by created_at desc),'[]'::json)
  into res from public.entwicklungsziele where spieler_id=p_spieler_id and status='offen';
  return res;
end $$;

create or replace function public.wq_done(p_spieler_id bigint)
returns text[] language plpgsql security definer set search_path to 'public' as $$
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler_id) or public.is_kind_selbst(p_spieler_id)) then
    raise exception 'not authorized';
  end if;
  return coalesce(
    (select array_agg(distinct quelle_id)
       from public.punkte_log
      where spieler_id = p_spieler_id and quelle = 'wissensquiz' and quelle_id is not null),
    '{}'::text[]
  );
end $$;

create or replace function public.xp_events_for(p_spieler_id bigint, p_quelle text)
returns setof text language sql stable security definer set search_path to 'public' as $$
  select quelle_id from public.punkte_log
   where spieler_id = p_spieler_id
     and quelle = p_quelle
     and quelle_id is not null
     and (public.is_trainer() or public.is_parent_of(p_spieler_id) or public.is_kind_selbst(p_spieler_id));
$$;

-- Federn vergeben und Sticker tauschen sind Schreibvorgaenge: fuer das Kind nur,
-- solange Appzeit uebrig ist.
create or replace function public.xp_award_event(p_spieler_id bigint, p_quelle text, p_quelle_id text default null::text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_base integer; v_mult integer := 1; v_delta integer;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not (public.is_trainer() or public.is_parent_of(p_spieler_id)
          or (public.is_kind_selbst(p_spieler_id) and public.kind_zeit_uebrig())) then
    raise exception 'not authorized for this player';
  end if;
  v_base := public.xp_points_for(p_quelle);
  if v_base <= 0 then raise exception 'unknown xp source: %', p_quelle; end if;

  if p_quelle_id is not null then
    if exists (select 1 from public.punkte_log
                where spieler_id=p_spieler_id and quelle=p_quelle and quelle_id=p_quelle_id) then
      return 0;
    end if;
  else
    if exists (select 1 from public.punkte_log
                where spieler_id=p_spieler_id and quelle=p_quelle and quelle_id is null
                  and created_at::date = now()::date) then
      return 0;
    end if;
  end if;

  if exists (select 1 from public.team_config
              where double_xp_until is not null and now() < double_xp_until) then
    v_mult := 2;
  end if;
  v_delta := v_base * v_mult;

  insert into public.punkte_log(spieler_id, delta, grund, quelle, quelle_id)
  values (p_spieler_id, v_delta,
          p_quelle || (case when v_mult>1 then ' (2x Booster)' else '' end),
          p_quelle, p_quelle_id);
  return v_delta;
end; $$;

create or replace function public.album_tausch_annehmen(p_tausch bigint, p_spieler bigint)
returns json language plpgsql security definer set search_path to 'public' as $$
declare o record; s_von jsonb; s_an jsonb; n_vg int; n_aw int;
begin
  if not (is_trainer() or is_parent_of(p_spieler)
          or (is_kind_selbst(p_spieler) and kind_zeit_uebrig())) then
    return json_build_object('ok', false, 'error', 'nicht berechtigt');
  end if;
  select * into o from album_tausch where id = p_tausch and status = 'offen' for update;
  if not found then return json_build_object('ok', false, 'error', 'Das Angebot ist schon weg.'); end if;
  if o.von_spieler = p_spieler then
    return json_build_object('ok', false, 'error', 'Mit dir selbst tauschen geht nicht 🙂');
  end if;
  insert into album_kind(spieler_id) values (o.von_spieler) on conflict do nothing;
  insert into album_kind(spieler_id) values (p_spieler) on conflict do nothing;
  select sticker into s_von from album_kind where spieler_id = o.von_spieler for update;
  select sticker into s_an  from album_kind where spieler_id = p_spieler for update;
  n_vg := coalesce((s_von ->> o.gebe_key)::int, 0);
  n_aw := coalesce((s_an  ->> o.will_key)::int, 0);
  if n_vg < 2 then
    update album_tausch set status = 'geplatzt' where id = o.id;
    return json_build_object('ok', false, 'error', 'Der Anbieter hat den Sticker nicht mehr doppelt – Angebot geplatzt.');
  end if;
  if n_aw < 2 then
    return json_build_object('ok', false, 'error', 'Du brauchst den gesuchten Sticker doppelt zum Tauschen.');
  end if;
  s_von := jsonb_set(s_von, array[o.gebe_key], to_jsonb(n_vg - 1), true);
  s_von := jsonb_set(s_von, array[o.will_key], to_jsonb(coalesce((s_von ->> o.will_key)::int, 0) + 1), true);
  s_an  := jsonb_set(s_an,  array[o.will_key], to_jsonb(n_aw - 1), true);
  s_an  := jsonb_set(s_an,  array[o.gebe_key], to_jsonb(coalesce((s_an ->> o.gebe_key)::int, 0) + 1), true);
  update album_kind set sticker = s_von, updated_at = now() where spieler_id = o.von_spieler;
  update album_kind set sticker = s_an,  updated_at = now() where spieler_id = p_spieler;
  update album_tausch set status = 'fertig', an_spieler = p_spieler where id = o.id;
  return json_build_object('ok', true);
end $$;

-- ── 6 · Neue RPCs ─────────────────────────────────────────────────────────────

-- Wer bin ich, und wie lange darf ich heute noch? Einzige Quelle der Kindliste in der
-- Kinder-App (dort gibt es keine Eltern-E-Mail und damit kein eltern_kinder).
create or replace function public.kind_status()
returns json language plpgsql stable security definer set search_path to 'public' as $$
declare k record; v_min int;
begin
  select * into k from public.kind_konto where uid = (select auth.uid()) and aktiv;
  if not found then return json_build_object('ok', false); end if;
  select coalesce(minuten,0) into v_min from public.kind_sitzung
   where uid = k.uid and datum = (now() at time zone 'Europe/Berlin')::date;
  return (select json_build_object(
      'ok', true, 'spieler_id', k.spieler_id, 'name', kd.name, 'nr', kd.nr, 'tw', kd.tw,
      'geraet', k.geraet, 'limit_min', k.tageslimit_min,
      'rest_min', greatest(0, k.tageslimit_min - coalesce(v_min,0)))
    from public.kader kd where kd.id = k.spieler_id);
end $$;

-- Eine Minute Appzeit verbrauchen. Die App ruft das im Takt, solange sie sichtbar ist;
-- gezaehlt wird auf dem Server, damit ein Neustart der App nichts zurueckdreht.
create or replace function public.kind_tick()
returns json language plpgsql security definer set search_path to 'public' as $$
declare k record; v_tag date; v_min int;
begin
  select * into k from public.kind_konto where uid = (select auth.uid()) and aktiv;
  if not found then return json_build_object('ok', false); end if;
  v_tag := (now() at time zone 'Europe/Berlin')::date;
  insert into public.kind_sitzung(uid, datum, minuten) values (k.uid, v_tag, 1)
    on conflict (uid, datum) do update set minuten = least(1440, public.kind_sitzung.minuten + 1)
    returning minuten into v_min;
  return json_build_object('ok', true, 'limit_min', k.tageslimit_min,
                           'rest_min', greatest(0, k.tageslimit_min - v_min));
end $$;

-- Welche der naechsten Termine hat dieses Kind abgesagt? Ersetzt in der Kinder-App die
-- direkte Abfrage auf rueckmeldungen - dort steht mehr, als ein Kind sehen muss.
create or replace function public.kind_abgesagt(p_spieler bigint)
returns bigint[] language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not (is_trainer() or is_parent_of(p_spieler) or is_kind_selbst(p_spieler)) then
    raise exception 'not authorized for this player';
  end if;
  return coalesce((select array_agg(r.termin_id) from public.rueckmeldungen r
                    where r.spieler_id = p_spieler and r.status = 'abgesagt'), '{}'::bigint[]);
end $$;

-- Die Team-Galerie ohne Bewertungsrohwerte.
--
-- team_gallery() liefert je Kind die radios aus spielerprofile - die vollstaendigen
-- Bewertungswerte JEDES Kindes an JEDE angemeldete Sitzung. Gezeichnet wird daraus nur
-- das Staerken-Abzeichen, gesendet wird alles. Diese Fassung sortiert die drei staerksten
-- Merkmale auf dem Server und schickt nur deren Schluessel; die Zahlen verlassen die
-- Datenbank nicht. Die Farbe der Karte leitet die App aus dem ersten Schluessel ab -
-- DIMS_FELD steht in data.js und bleibt dort, statt hier ein zweites Mal zu existieren.
create or replace function public.team_gallery_kind()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when (select auth.uid()) is null then '[]'::jsonb else
    coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
      'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
      'staerken', coalesce((
         select jsonb_agg(e.key order by e.wert desc, e.key)
           from (select kv.key, (kv.value)::int as wert
                   from jsonb_each_text(coalesce(
                        (select sp.radios from public.spielerprofile sp
                          where sp.name = k.name order by sp.datum desc nulls last limit 1),
                        '{}'::jsonb)) kv
                  where kv.key like 'f\_%' and kv.value ~ '^[0-9]+$' and (kv.value)::int > 0
                  order by (kv.value)::int desc, kv.key limit 3) e), '[]'::jsonb),
      'foto_path', case when coalesce(f.gallery_optin,false) or coalesce(k.foto_stadionheft_ok,false)
                        then coalesce(f.foto_path, k.foto_path) else null end,
      'trainings', (select count(*) from public.anwesenheit a
                     where (coalesce(a.data->(k.id::text), a.data->k.name)->>'da')='true')
    ) as g
    from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id
    where k.aktiv
  ) x;
$$;

-- ── 7 · Rechte ────────────────────────────────────────────────────────────────
grant execute on function public.is_kind_selbst(bigint)  to authenticated;
grant execute on function public.kind_zeit_uebrig()      to authenticated;
grant execute on function public.kind_status()           to authenticated;
grant execute on function public.kind_tick()             to authenticated;
grant execute on function public.kind_abgesagt(bigint)   to authenticated;
grant execute on function public.team_gallery_kind()     to authenticated;
