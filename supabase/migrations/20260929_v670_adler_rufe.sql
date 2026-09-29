-- v670 · Adler-Rufe, Stufe 1: der Team-Chat für Eltern und Trainer.
-- Beschluss 29.09. (Kachelrunden, Projektgedächtnis „Adler-Rufe“): offener Gruppenchat, ein Raum
-- zum Start, Moderatoren (Trainer, Elternbeirat) können weitere Räume anlegen. Antworten mit
-- Zitat, Reaktionen, bis zu drei fixierte Nachrichten mit Ablauf, @alle nur für Moderatoren,
-- Bearbeiten, Suche. Moderation: melden, stummschalten, archivieren statt löschen.
-- Kinder haben keinen Zugang (auch nicht mit gekoppeltem Kindergerät). Namen kommen aus der
-- Datenbank, nicht vom Gerät: Vorname aus „Meine Angaben“ bzw. Trainername.

-- Wer moderiert, außer den Trainern (Konto-E-Mail, gepflegt vom Trainerteam – wie kasse_team)
create table if not exists public.rufe_moderator (
  email      text primary key check (email = lower(email) and position('@' in email) > 1),
  created_at timestamptz not null default now()
);
comment on table public.rufe_moderator is 'v670: Konten, die die Adler-Rufe moderieren (z. B. Elternbeirat). Nur Trainer pflegen.';
alter table public.rufe_moderator enable row level security;
drop policy if exists rm_trainer on public.rufe_moderator;
create policy rm_trainer on public.rufe_moderator for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists rm_selbst on public.rufe_moderator;
create policy rm_selbst on public.rufe_moderator for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
revoke all on public.rufe_moderator from anon;

-- Wer rufen darf: Trainer und Eltern mit hinterlegtem Kind. Kindergeräte nicht.
create or replace function public.darf_rufen() returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select public.is_trainer()
      or ((select auth.uid()) is not null and not public.ist_anonym()
          and exists(select 1 from public.eltern_kinder e
                      where lower(e.email)=lower(coalesce((select auth.jwt())->>'email',''))));
$$;
create or replace function public.is_rufe_mod() returns boolean
 language sql stable security definer set search_path to 'public' as $$
  select public.is_trainer()
      or (public.darf_rufen() and exists(select 1 from public.rufe_moderator m
                                          where m.email=lower(coalesce((select auth.jwt())->>'email',''))));
$$;

create table if not exists public.rufe_raum (
  id         bigint generated always as identity primary key,
  name       text not null check (length(trim(name)) between 1 and 40),
  emoji      text not null default '💬',
  sort       integer not null default 0,
  archiviert boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.rufe_raum is 'v670: Räume der Adler-Rufe. Anlegen nur Moderatoren; zum Start „Allgemein“.';
alter table public.rufe_raum enable row level security;
drop policy if exists rr_lesen on public.rufe_raum;
create policy rr_lesen on public.rufe_raum for select to authenticated using (public.darf_rufen());
drop policy if exists rr_mod on public.rufe_raum;
create policy rr_mod on public.rufe_raum for all to authenticated using (public.is_rufe_mod()) with check (public.is_rufe_mod());
revoke all on public.rufe_raum from anon;
insert into public.rufe_raum(name, emoji, sort)
select 'Allgemein', '📣', 0 where not exists(select 1 from public.rufe_raum);

create table if not exists public.rufe_nachricht (
  id             bigint generated always as identity primary key,
  raum_id        bigint not null references public.rufe_raum(id) on delete cascade,
  autor          uuid not null default auth.uid(),
  autor_name     text not null default '',
  autor_zusatz   text not null default '',
  autor_rolle    text not null default 'eltern' check (autor_rolle in ('trainer','moderator','eltern')),
  text           text not null check (length(trim(text)) between 1 and 2000),
  antwort_auf    bigint references public.rufe_nachricht(id) on delete set null,
  an_alle        boolean not null default false,
  bearbeitet_am  timestamptz,
  archiviert_am  timestamptz,
  archiviert_von uuid,
  created_at     timestamptz not null default now()
);
create index if not exists rufe_nachricht_raum_zeit on public.rufe_nachricht(raum_id, created_at desc);
comment on table public.rufe_nachricht is 'v670: Nachrichten der Adler-Rufe. Schreiben über RLS, Name/Rolle setzt der Trigger; bearbeiten und archivieren nur über RPC. Archivierte sehen nur Trainer.';
alter table public.rufe_nachricht enable row level security;
drop policy if exists rn_lesen on public.rufe_nachricht;
create policy rn_lesen on public.rufe_nachricht for select to authenticated
  using (public.darf_rufen() and (archiviert_am is null or public.is_trainer()));
drop policy if exists rn_schreiben on public.rufe_nachricht;
create policy rn_schreiben on public.rufe_nachricht for insert to authenticated
  with check (public.darf_rufen() and autor = auth.uid());
revoke all on public.rufe_nachricht from anon;
revoke update, delete on public.rufe_nachricht from authenticated;

create table if not exists public.rufe_stumm (
  user_id    uuid primary key,
  bis        timestamptz not null,
  grund      text,
  von        uuid default auth.uid(),
  created_at timestamptz not null default now()
);
comment on table public.rufe_stumm is 'v670: stummgeschaltete Konten (bis Zeitpunkt). Nur Moderatoren; jeder sieht die eigene Zeile.';
alter table public.rufe_stumm enable row level security;
drop policy if exists rs_mod on public.rufe_stumm;
create policy rs_mod on public.rufe_stumm for all to authenticated using (public.is_rufe_mod()) with check (public.is_rufe_mod());
drop policy if exists rs_selbst on public.rufe_stumm;
create policy rs_selbst on public.rufe_stumm for select to authenticated using (user_id = auth.uid());
revoke all on public.rufe_stumm from anon;

-- Name, Zusatz und Rolle aus der Datenbank; @alle nur für Moderatoren; stumm = kein Schreiben
create or replace function public.rufe_vor_insert() returns trigger
 language plpgsql security definer set search_path to 'public' as $$
declare v_mail text := lower(coalesce((select auth.jwt())->>'email',''));
        v_name text; v_kinder text;
begin
  new.autor := auth.uid();
  new.bearbeitet_am := null; new.archiviert_am := null; new.archiviert_von := null;
  if exists(select 1 from rufe_stumm s where s.user_id=new.autor and s.bis > now()) then
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
  if new.an_alle and new.autor_rolle = 'eltern' then new.an_alle := false; end if;
  if new.antwort_auf is not null and not exists(select 1 from rufe_nachricht n where n.id=new.antwort_auf and n.raum_id=new.raum_id) then
    new.antwort_auf := null;
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists rufe_nachricht_vor on public.rufe_nachricht;
create trigger rufe_nachricht_vor before insert on public.rufe_nachricht for each row execute function public.rufe_vor_insert();

create table if not exists public.rufe_reaktion (
  nachricht_id bigint not null references public.rufe_nachricht(id) on delete cascade,
  user_id      uuid not null default auth.uid(),
  emoji        text not null check (emoji in ('👍','❤️','😂','⚽','👏','🙏')),
  created_at   timestamptz not null default now(),
  primary key (nachricht_id, user_id, emoji)
);
comment on table public.rufe_reaktion is 'v670: Emoji-Reaktionen auf Adler-Rufe (sechs feste Zeichen).';
alter table public.rufe_reaktion enable row level security;
drop policy if exists rx_lesen on public.rufe_reaktion;
create policy rx_lesen on public.rufe_reaktion for select to authenticated using (public.darf_rufen());
drop policy if exists rx_eigen on public.rufe_reaktion;
create policy rx_eigen on public.rufe_reaktion for insert to authenticated with check (public.darf_rufen() and user_id = auth.uid());
drop policy if exists rx_weg on public.rufe_reaktion;
create policy rx_weg on public.rufe_reaktion for delete to authenticated using (user_id = auth.uid());
revoke all on public.rufe_reaktion from anon;

create table if not exists public.rufe_fixiert (
  nachricht_id bigint primary key references public.rufe_nachricht(id) on delete cascade,
  raum_id      bigint not null references public.rufe_raum(id) on delete cascade,
  bis          timestamptz,
  von          uuid default auth.uid(),
  created_at   timestamptz not null default now()
);
comment on table public.rufe_fixiert is 'v670: oben fixierte Nachrichten je Raum, höchstens drei gleichzeitig gültig; bis = null heißt „immer“.';
alter table public.rufe_fixiert enable row level security;
drop policy if exists rf_lesen on public.rufe_fixiert;
create policy rf_lesen on public.rufe_fixiert for select to authenticated using (public.darf_rufen());
drop policy if exists rf_mod on public.rufe_fixiert;
create policy rf_mod on public.rufe_fixiert for all to authenticated using (public.is_rufe_mod()) with check (public.is_rufe_mod());
revoke all on public.rufe_fixiert from anon;
create or replace function public.rufe_fix_grenze() returns trigger
 language plpgsql security definer set search_path to 'public' as $$
begin
  if (select count(*) from rufe_fixiert f where f.raum_id=new.raum_id and f.nachricht_id<>new.nachricht_id
        and (f.bis is null or f.bis > now())) >= 3 then
    raise exception 'hoechstens drei fixiert';
  end if;
  return new;
end $$;
drop trigger if exists rufe_fixiert_grenze on public.rufe_fixiert;
create trigger rufe_fixiert_grenze before insert or update on public.rufe_fixiert for each row execute function public.rufe_fix_grenze();

create table if not exists public.rufe_meldung (
  id           bigint generated always as identity primary key,
  nachricht_id bigint not null references public.rufe_nachricht(id) on delete cascade,
  von          uuid not null default auth.uid(),
  grund        text check (grund is null or length(grund) <= 300),
  erledigt     boolean not null default false,
  created_at   timestamptz not null default now()
);
comment on table public.rufe_meldung is 'v670: gemeldete Adler-Rufe. Melden: alle; lesen und erledigen: Moderatoren.';
alter table public.rufe_meldung enable row level security;
drop policy if exists rme_melden on public.rufe_meldung;
create policy rme_melden on public.rufe_meldung for insert to authenticated with check (public.darf_rufen() and von = auth.uid());
drop policy if exists rme_mod on public.rufe_meldung;
create policy rme_mod on public.rufe_meldung for select to authenticated using (public.is_rufe_mod());
drop policy if exists rme_erledigt on public.rufe_meldung;
create policy rme_erledigt on public.rufe_meldung for update to authenticated using (public.is_rufe_mod()) with check (public.is_rufe_mod());
revoke all on public.rufe_meldung from anon;

create table if not exists public.rufe_gelesen (
  user_id uuid not null default auth.uid(),
  raum_id bigint not null references public.rufe_raum(id) on delete cascade,
  zuletzt timestamptz not null default now(),
  primary key (user_id, raum_id)
);
comment on table public.rufe_gelesen is 'v670: bis wann jemand einen Raum gelesen hat (für die Zahl ungelesener Rufe). Nur die eigene Zeile.';
alter table public.rufe_gelesen enable row level security;
drop policy if exists rg_eigen on public.rufe_gelesen;
create policy rg_eigen on public.rufe_gelesen for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.darf_rufen());
revoke all on public.rufe_gelesen from anon;

-- Bearbeiten: nur der Absender, nur solange nicht archiviert
create or replace function public.rufe_bearbeiten(p_id bigint, p_text text) returns boolean
 language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.darf_rufen() then raise exception 'not authorized'; end if;
  if length(trim(coalesce(p_text,''))) not between 1 and 2000 then raise exception 'text'; end if;
  update rufe_nachricht set text=p_text, bearbeitet_am=now()
   where id=p_id and autor=auth.uid() and archiviert_am is null;
  if not found then raise exception 'not authorized'; end if;
  return true;
end $$;

-- Archivieren statt löschen: der Absender zieht zurück, Moderatoren nehmen heraus.
-- Die Nachricht bleibt für Trainer lesbar (Beschluss: Archiv nur Trainer).
create or replace function public.rufe_archivieren(p_id bigint) returns boolean
 language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.darf_rufen() then raise exception 'not authorized'; end if;
  update rufe_nachricht set archiviert_am=now(), archiviert_von=auth.uid()
   where id=p_id and archiviert_am is null and (autor=auth.uid() or public.is_rufe_mod());
  if not found then raise exception 'not authorized'; end if;
  delete from rufe_fixiert where nachricht_id=p_id;
  return true;
end $$;

-- Ungelesene Rufe je Raum (ohne eigene, ohne archivierte)
create or replace function public.rufe_ungelesen() returns table(raum_id bigint, anzahl integer, an_alle boolean)
 language sql stable security definer set search_path to 'public' as $$
  select n.raum_id, count(*)::int, bool_or(n.an_alle)
    from rufe_nachricht n
    join rufe_raum r on r.id=n.raum_id and not r.archiviert
    left join rufe_gelesen g on g.raum_id=n.raum_id and g.user_id=auth.uid()
   where public.darf_rufen() and n.archiviert_am is null and n.autor<>auth.uid()
     and n.created_at > coalesce(g.zuletzt, '-infinity'::timestamptz)
   group by n.raum_id;
$$;

do $$
declare f text;
begin
  foreach f in array array['darf_rufen()','is_rufe_mod()','rufe_bearbeiten(bigint,text)','rufe_archivieren(bigint)','rufe_ungelesen()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  execute 'revoke all on function public.rufe_vor_insert() from public, anon, authenticated';
  execute 'revoke all on function public.rufe_fix_grenze() from public, anon, authenticated';
end $$;
