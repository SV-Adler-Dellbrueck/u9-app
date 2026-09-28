-- v664 · Kassenwart-Kasse: ein Elternteil pflegt die Teamkasse, „wer hat bezahlt“ je Kind
-- PO 28.09.: „Die Mutter von Samu ist neue Kassenwärtin … wie können wir da mit der App
-- unterstützen und helfen? Also wie eine digitale Mannschaftskassen-App.“ Kachel: „Ja, so bauen“
-- (Rolle „Kasse“ für ein Elternteil, bezahlt/offen je Familie, Erinnerung, Export –
-- ohne Zahlungsabwicklung). Kein Geld in der App: gezahlt wird außerhalb, hier wird nur
-- festgehalten, was angekommen ist.

-- Wer die Kasse führt (E-Mail des Kontos). Pflege nur durch Trainer.
create table if not exists public.kasse_team (
  email      text primary key check (email = lower(email) and position('@' in email) > 1),
  created_at timestamptz not null default now()
);
comment on table public.kasse_team is 'v664: Konten mit der Rolle „Kasse“ (Kassenwart aus der Elternschaft). Nur Trainer pflegen.';
alter table public.kasse_team enable row level security;
drop policy if exists kt_trainer on public.kasse_team;
create policy kt_trainer on public.kasse_team for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
drop policy if exists kt_selbst on public.kasse_team;
create policy kt_selbst on public.kasse_team for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
revoke all on public.kasse_team from anon;

create or replace function public.is_kasse()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_trainer()
      or (public.sitzung_gueltig()
          and exists (select 1 from public.kasse_team
                      where email = lower(coalesce(auth.jwt() ->> 'email', ''))));
$$;
revoke all on function public.is_kasse() from public, anon;
grant execute on function public.is_kasse() to authenticated;

-- Buchungen und Umlagen darf jetzt auch die Kasse pflegen.
drop policy if exists tk_kasse on public.teamkasse;
create policy tk_kasse on public.teamkasse for all to authenticated using (public.is_kasse()) with check (public.is_kasse());
drop policy if exists ku_kasse on public.kasse_umlagen;
create policy ku_kasse on public.kasse_umlagen for all to authenticated using (public.is_kasse()) with check (public.is_kasse());

-- Wer hat bezahlt: je Umlage und Kind eine Zeile. Keine Beträge, keine Kontodaten.
create table if not exists public.kasse_zahlung (
  umlage_id  bigint not null references public.kasse_umlagen(id) on delete cascade,
  spieler_id bigint not null references public.kader(id) on delete cascade,
  bezahlt_am date not null default current_date,
  primary key (umlage_id, spieler_id)
);
comment on table public.kasse_zahlung is 'v664: Umlage für dieses Kind ist bezahlt (von der Kasse abgehakt). Eltern sehen nur ihre eigenen Kinder.';
alter table public.kasse_zahlung enable row level security;
drop policy if exists kz_kasse on public.kasse_zahlung;
create policy kz_kasse on public.kasse_zahlung for all to authenticated using (public.is_kasse()) with check (public.is_kasse());
drop policy if exists kz_eltern on public.kasse_zahlung;
create policy kz_eltern on public.kasse_zahlung for select to authenticated
  using (public.is_parent_of(spieler_id) and public.sitzung_gueltig());
revoke all on public.kasse_zahlung from anon;

-- Übersicht für die Kasse: aktive Kinder (Vorname wie im Kader) und alle Häkchen.
-- Eltern lesen den Kader sonst nur für ihre eigenen Kinder.
create or replace function public.kasse_uebersicht()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_kasse() then raise exception 'nur für die Kasse'; end if;
  return jsonb_build_object(
    'kinder', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name) order by k.name)
                        from public.kader k where coalesce(k.aktiv, true)), '[]'::jsonb),
    'zahlungen', coalesce((select jsonb_agg(jsonb_build_object('u', z.umlage_id, 's', z.spieler_id, 'am', z.bezahlt_am))
                           from public.kasse_zahlung z), '[]'::jsonb)
  );
end
$$;
revoke all on function public.kasse_uebersicht() from public, anon;
grant execute on function public.kasse_uebersicht() to authenticated;

-- Erinnerung höchstens einmal am Tag (Push geht nur an Familien mit offenem Betrag).
alter table public.team_config add column if not exists kasse_erinnert_am timestamptz;
