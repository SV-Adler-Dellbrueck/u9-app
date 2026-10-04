-- v743 · Spielerkarten Stufe 2: Fotoalbum je Kind (PO 04.10., Kachel „So bauen“)
-- Bis zu 6 Fotos je Kind, jedes mit einem Zweck (Porträt, Aktion, Jubel, Mit dem Team, Frei). Hochladen dürfen die
-- Eltern des Kindes und das Trainerteam; eines davon kann das Kartenfoto sein. Sehen: Trainer und die Eltern des
-- Kindes immer; alle anderen Team-Konten nur das Kartenfoto und nur bei Freigabe „Team intern“ (foto_consent.intern)
-- oder Galerie-Opt-in der Eltern. Nie öffentlich, nie im Adler Nest (das hat eigene Fotos mit eigenem Einverständnis).
-- Dateien im bestehenden privaten Bucket spielerfotos unter <spieler_id>/album/<name>.<jpg|png|webp>.

create table if not exists public.kind_foto (
  id         bigint generated always as identity primary key,
  spieler_id bigint not null references public.kader(id) on delete cascade,
  pfad       text not null unique,
  zweck      text not null default 'frei' check (zweck in ('portraet','aktion','jubel','team','frei')),
  karte      boolean not null default false,
  von        uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
comment on table public.kind_foto is 'v743: Fotoalbum je Kind (bis 6). Eltern des Kindes und Trainer pflegen; andere sehen nur das Kartenfoto bei Freigabe.';
create unique index if not exists kind_foto_eine_karte on public.kind_foto(spieler_id) where karte;
create index if not exists kind_foto_kind on public.kind_foto(spieler_id);

create or replace function public.kind_foto_darf(p_spieler bigint) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select public.is_trainer() or public.is_parent_of(p_spieler);
$$;
create or replace function public.kind_foto_team_frei(p_spieler bigint) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from public.foto_consent c where c.spieler_id=p_spieler and c.intern)
      or exists(select 1 from public.kind_fanfacts f where f.spieler_id=p_spieler and coalesce(f.gallery_optin,false));
$$;
revoke all on function public.kind_foto_darf(bigint) from public, anon;
revoke all on function public.kind_foto_team_frei(bigint) from public, anon;
grant execute on function public.kind_foto_darf(bigint) to authenticated;
grant execute on function public.kind_foto_team_frei(bigint) to authenticated;

-- Vor dem Einfügen: Pfad gehört zu diesem Kind, Datei liegt schon im Bucket, höchstens 6 je Kind
create or replace function public.kind_foto_vor_insert() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.pfad !~ ('^' || new.spieler_id || '/album/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$') then raise exception 'pfad'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='spielerfotos' and o.name=new.pfad) then raise exception 'datei fehlt'; end if;
  if (select count(*) from public.kind_foto k where k.spieler_id=new.spieler_id) >= 6 then raise exception 'höchstens 6 Fotos'; end if;
  new.von := coalesce(auth.uid(), new.von);
  new.karte := false;   -- Kartenfoto nur über kind_foto_als_karte
  return new;
end $$;
drop trigger if exists kind_foto_vor_insert on public.kind_foto;
create trigger kind_foto_vor_insert before insert on public.kind_foto for each row execute function public.kind_foto_vor_insert();

alter table public.kind_foto enable row level security;
drop policy if exists kf_lesen on public.kind_foto;
create policy kf_lesen on public.kind_foto for select to authenticated
  using (public.kind_foto_darf(spieler_id) or (karte and public.sitzung_gueltig() and public.kind_foto_team_frei(spieler_id)));
drop policy if exists kf_einfuegen on public.kind_foto;
create policy kf_einfuegen on public.kind_foto for insert to authenticated
  with check (public.kind_foto_darf(spieler_id) and not public.ist_anonym());
drop policy if exists kf_aendern on public.kind_foto;
create policy kf_aendern on public.kind_foto for update to authenticated
  using (public.kind_foto_darf(spieler_id)) with check (public.kind_foto_darf(spieler_id));
drop policy if exists kf_loeschen on public.kind_foto;
create policy kf_loeschen on public.kind_foto for delete to authenticated
  using (public.kind_foto_darf(spieler_id));
revoke all on public.kind_foto from anon;
-- Ändern nur den Zweck; Kind, Pfad und Kartenfoto bleiben (Kartenfoto über die Funktion)
revoke update on public.kind_foto from authenticated;
grant update (zweck) on public.kind_foto to authenticated;

-- Kartenfoto setzen oder lösen (p_id null = keins)
create or replace function public.kind_foto_als_karte(p_spieler bigint, p_id bigint) returns boolean
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.kind_foto_darf(p_spieler) or public.ist_anonym() then raise exception 'not authorized'; end if;
  if p_id is not null and not exists(select 1 from kind_foto where id=p_id and spieler_id=p_spieler) then raise exception 'foto'; end if;
  update kind_foto set karte=false where spieler_id=p_spieler and karte;
  if p_id is not null then update kind_foto set karte=true where id=p_id; end if;
  return true;
end $$;
revoke all on function public.kind_foto_als_karte(bigint,bigint) from public, anon;
grant execute on function public.kind_foto_als_karte(bigint,bigint) to authenticated;

-- Kartenfoto eines Kindes (für Galerie und eigene Karte)
create or replace function public.kind_kartenfoto(p_spieler bigint) returns text
language sql stable security definer set search_path to 'public' as $$
  select pfad from public.kind_foto where spieler_id=p_spieler and karte limit 1;
$$;
revoke all on function public.kind_kartenfoto(bigint) from public, anon;
grant execute on function public.kind_kartenfoto(bigint) to authenticated;

-- Storage: Team-Sichtbarkeit kennt jetzt auch das Kartenfoto; Eltern dürfen Album-Dateien ihres Kindes löschen
create or replace function public.spielerfoto_team_sichtbar(p_name text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select public.sitzung_gueltig() and (
    exists (select 1 from public.kader k left join public.kind_fanfacts f on f.spieler_id = k.id
             where coalesce(k.aktiv, true)
               and (coalesce(f.gallery_optin, false) or exists (select 1 from public.foto_consent c where c.spieler_id = k.id and c.intern))
               and (p_name = f.foto_path or p_name = k.foto_path))
    or exists (select 1 from public.kind_foto kf join public.kader k on k.id = kf.spieler_id
                where kf.pfad = p_name and kf.karte and coalesce(k.aktiv, true) and public.kind_foto_team_frei(kf.spieler_id)));
$$;
drop policy if exists "spielerfotos parent album delete" on storage.objects;
create policy "spielerfotos parent album delete" on storage.objects for delete to authenticated
  using (bucket_id = 'spielerfotos' and name ~ '^[0-9]+/album/' and public.is_parent_of((split_part(name, '/', 1))::bigint));

-- Galerie und eigene Karte: Kartenfoto vor dem bisherigen Foto
create or replace function public.team_gallery_kind() returns jsonb
language sql stable security definer set search_path to 'public' as $$
select case when not public.sitzung_gueltig() then '[]'::jsonb
  else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end
from ( select jsonb_build_object(
    'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
    'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
    'staerken', public.staerken_von(k.name),
    'fuss', public.kind_fuss(k.starker_fuss, f.starker_fuss),
    'position', nullif(trim(coalesce(k.lieblingsposition,'')), ''),
    'foto_path', case when coalesce(f.gallery_optin,false) or exists(select 1 from public.foto_consent c where c.spieler_id=k.id and c.intern)
                      then coalesce(public.kind_kartenfoto(k.id), f.foto_path, k.foto_path) else null end,
    'trainings', public.kind_trainings_saison(k.id, k.name),
    'spiele', public.kind_spiele_saison(k.id, k.name)
  ) as g
  from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id where k.aktiv) x;
$$;

create or replace function public.team_gallery() returns jsonb
language sql stable security definer set search_path to 'public' as $$
select case when not public.sitzung_gueltig() or public.ist_anonym() or not public.is_trainer() then '[]'::jsonb
  else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end
from ( select jsonb_build_object(
    'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
    'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
    'radios', coalesce((select radios from public.spielerprofile sp where sp.name=k.name order by datum desc nulls last limit 1), '{}'::jsonb),
    'foto_path', case when coalesce(f.gallery_optin,false) or coalesce(k.foto_stadionheft_ok,false)
                      then coalesce(public.kind_kartenfoto(k.id), f.foto_path, k.foto_path) else null end,
    'trainings', public.kind_trainings_saison(k.id, k.name),
    'spiele', public.kind_spiele_saison(k.id, k.name)
  ) as g
  from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id where k.aktiv) x;
$$;

-- Eigene Karte (Eltern-Portal und Kindergerät): Kartenfoto zuerst
create or replace function public.my_child_card(p_spieler bigint) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_k record; v_snap record; v_f record; v_name text;
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler)) then return null; end if;
  select id,name,nr,tw,geb,foto_path,starker_fuss,lieblingsposition into v_k from public.kader where id=p_spieler;
  if v_k.id is null then return null; end if;
  v_name := v_k.name;
  select radios, position as snap_position, prim_rolle, strong_foot, age into v_snap from public.spielerprofile where name=v_name order by datum desc nulls last limit 1;
  select spitzname, lieblingsverein, lieblingsspieler, foto_path, starker_fuss into v_f from public.kind_fanfacts where spieler_id=p_spieler;
  return jsonb_build_object(
    'name', v_k.name, 'nr', v_k.nr, 'tw', v_k.tw, 'geb', v_k.geb, 'foto_path', coalesce(public.kind_kartenfoto(p_spieler), v_f.foto_path, v_k.foto_path),
    'starker_fuss', public.kind_fuss(v_k.starker_fuss, v_f.starker_fuss), 'lieblingsposition', v_k.lieblingsposition,
    'spitzname', v_f.spitzname, 'lieblingsverein', v_f.lieblingsverein, 'lieblingsspieler', v_f.lieblingsspieler,
    'radios', case when public.is_trainer() then coalesce(v_snap.radios, '{}'::jsonb) else null end,
    'staerken', public.staerken_von(v_name),
    'snap_position', v_snap.snap_position, 'prim_rolle', v_snap.prim_rolle, 'strong_foot', v_snap.strong_foot, 'age', v_snap.age,
    'stats', jsonb_build_object(
      'tore', (select count(*) from public.match_actions where spieler=v_name and aktion='tor'),
      'paraden', (select count(*) from public.match_actions where spieler=v_name and aktion='parade'),
      'aktionen', (select count(*) from public.match_actions where spieler=v_name and aktion in ('pass','dribbling','gewinn','parade','aufbau','heraus','tor')),
      'spiele', public.kind_spiele_saison(p_spieler, v_name),
      'trainings', public.kind_trainings_saison(p_spieler, v_name),
      'quizRichtig', coalesce((select sum(score) from public.quiz_progress where player=v_name),0),
      'quizBloecke', (select count(*) from public.quiz_progress where player=v_name)));
end $$;

create or replace function public.my_child_card_kind(p_spieler bigint) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v_k record; v_snap record; v_f record; v_name text;
begin
  if not (public.is_trainer() or public.is_parent_of(p_spieler) or public.is_kind_selbst(p_spieler)) then return null; end if;
  select id,name,nr,tw,geb,foto_path,starker_fuss,lieblingsposition into v_k from public.kader where id=p_spieler;
  if v_k.id is null then return null; end if;
  v_name := v_k.name;
  select position as snap_position, prim_rolle, strong_foot, age into v_snap from public.spielerprofile where name=v_name order by datum desc nulls last limit 1;
  select spitzname, lieblingsverein, lieblingsspieler, foto_path, starker_fuss into v_f from public.kind_fanfacts where spieler_id=p_spieler;
  return jsonb_build_object(
    'name', v_k.name, 'nr', v_k.nr, 'tw', v_k.tw, 'geb', v_k.geb,
    'foto_path', coalesce(public.kind_kartenfoto(p_spieler), v_f.foto_path, v_k.foto_path),
    'starker_fuss', public.kind_fuss(v_k.starker_fuss, v_f.starker_fuss), 'lieblingsposition', v_k.lieblingsposition,
    'spitzname', v_f.spitzname, 'lieblingsverein', v_f.lieblingsverein, 'lieblingsspieler', v_f.lieblingsspieler,
    'staerken', public.staerken_von(v_name),
    'snap_position', v_snap.snap_position, 'prim_rolle', v_snap.prim_rolle, 'strong_foot', v_snap.strong_foot, 'age', v_snap.age,
    'stats', jsonb_build_object(
      'tore', (select count(*) from public.match_actions where spieler=v_name and aktion='tor'),
      'paraden', (select count(*) from public.match_actions where spieler=v_name and aktion='parade'),
      'aktionen', (select count(*) from public.match_actions where spieler=v_name and aktion in ('pass','dribbling','gewinn','parade','aufbau','heraus','tor')),
      'spiele', public.kind_spiele_saison(p_spieler, v_name),
      'trainings', public.kind_trainings_saison(p_spieler, v_name),
      'quizRichtig', coalesce((select sum(score) from public.quiz_progress where player=v_name),0),
      'quizBloecke', (select count(*) from public.quiz_progress where player=v_name)));
end $$;

