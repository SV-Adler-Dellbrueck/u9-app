-- v699: Mannschaftskasse für alle Eltern lesbar, Kasse bucht mit Datum, Kategorie und Beleg.
-- PO 30.09.: „Kachel Mannschaftskasse, in der alle Eltern Leserechte haben … Kontostand und alle
-- Ausgaben, für was und wann.“ Abgehakte Beiträge zählen automatisch als Einnahme (Sammelposten).

-- 1) Buchungen: Kategorie, Beleg, Änderungszeit
alter table public.teamkasse add column if not exists kategorie text not null default 'sonstiges';
alter table public.teamkasse add column if not exists beleg text;
alter table public.teamkasse add column if not exists geaendert_am timestamptz;
do $$ begin
  alter table public.teamkasse add constraint teamkasse_kategorie_check
    check (kategorie in ('uebertrag','beitraege','spenden','ausruestung','turniere','feiern','sonstiges'));
exception when duplicate_object then null; end $$;
alter table public.teamkasse alter column datum set not null;

-- 2) Alle angemeldeten Mitglieder (Eltern, Trainer, Kasse) dürfen die Buchungen lesen – schreiben
--    bleibt bei tk_kasse / tk_trainer. Belege selbst liegen im Storage und bleiben der Kasse vorbehalten.
drop policy if exists tk_lesen on public.teamkasse;
create policy tk_lesen on public.teamkasse for select using (public.sitzung_gueltig());

-- 3) Zusammenfassung: Kassenstand inkl. abgehakter Beiträge, Sammelposten ohne Namen
create or replace function public.kasse_summary_roh()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  with sammel as (
    select u.id, u.titel, u.betrag, count(z.*)::int as anzahl, sum(u.betrag) as summe, max(z.bezahlt_am) as letzte
      from public.kasse_umlagen u join public.kasse_zahlung z on z.umlage_id = u.id
     group by u.id, u.titel, u.betrag)
  select jsonb_build_object(
    'saldo', coalesce((select sum(betrag) from public.teamkasse),0) + coalesce((select sum(summe) from sammel),0),
    'umlagen', coalesce((select jsonb_agg(jsonb_build_object(
        'id',id,'titel',titel,'betrag',betrag,'faellig',faellig,'paypal_link',paypal_link
      ) order by faellig nulls last) from public.kasse_umlagen where aktiv), '[]'::jsonb),
    'sammel', coalesce((select jsonb_agg(jsonb_build_object('id',id,'titel',titel,'betrag',betrag,'anzahl',anzahl,'summe',summe,'datum',letzte)
        order by letzte desc) from sammel), '[]'::jsonb)
  );
$$;

-- 4) Belege: eigener privater Bucket „kasse-belege“ (10 MB, Bilder/PDF) – nur Kasse und Trainerteam.
--    NICHT den Bucket „belege“ benutzen: der gehört einer anderen Anwendung im selben Projekt.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kasse-belege', 'kasse-belege', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;
create policy kasse_belege_lesen on storage.objects for select to authenticated using (bucket_id = 'kasse-belege' and public.is_kasse());
create policy kasse_belege_schreiben on storage.objects for insert to authenticated with check (bucket_id = 'kasse-belege' and public.is_kasse());
create policy kasse_belege_aendern on storage.objects for update to authenticated using (bucket_id = 'kasse-belege' and public.is_kasse());
create policy kasse_belege_loeschen on storage.objects for delete to authenticated using (bucket_id = 'kasse-belege' and public.is_kasse());
