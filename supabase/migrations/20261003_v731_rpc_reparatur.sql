-- v731 (03.10.): Drei Hüllfunktionen riefen ihre *_roh-Funktion mit den Spaltennamen der Rückgabe als
-- zusätzliche Argumente auf – „function public.termin_gallery_roh(bigint, bigint, text, timestamp) does not
-- exist“. Folge: Fotos zum Termin (Spieltagsgalerie), Büdchen-Plan und Fundbüro blieben für alle leer,
-- obwohl Hochladen und Eintragen funktionierten. Die *_roh-Funktionen bleiben unverändert; die Hüllen
-- prüfen weiter sitzung_gueltig() und reichen nur den echten Parameter durch. Rechte bleiben erhalten
-- (create or replace ändert keine Grants).
create or replace function public.termin_gallery(p_termin bigint)
 returns table(id bigint, foto_path text, created_at timestamp with time zone)
 language plpgsql security definer set search_path to 'public' as $$
begin if not public.sitzung_gueltig() then return; end if; return query select * from public.termin_gallery_roh(p_termin); end
$$;

create or replace function public.buedchen_plan(p_termin bigint)
 returns table(spieler_id bigint, name text)
 language plpgsql security definer set search_path to 'public' as $$
begin if not public.sitzung_gueltig() then return; end if; return query select * from public.buedchen_plan_roh(p_termin); end
$$;

create or replace function public.fundbuero_board()
 returns table(id bigint, titel text, beschreibung text, foto_path text, status text, gefunden_am date, claimed_label text)
 language plpgsql security definer set search_path to 'public' as $$
begin if not public.sitzung_gueltig() then return; end if; return query select * from public.fundbuero_board_roh(); end
$$;

-- v731 (PO 03.10., Bildschirmfoto Team-Galerie): Eltern sahen in der Team-Galerie nur das Foto des eigenen
-- Kindes, bei allen anderen die Initialen – obwohl alle Kinder die Freigabe „App-intern“ haben. Die
-- Speicher-Regel prüfte die Freigabe über kader / kind_fanfacts / foto_consent; diese Tabellen darf ein
-- Elternkonto für fremde Kinder nicht lesen, das EXISTS war deshalb immer falsch. Jetzt prüft eine
-- Funktion mit Definer-Rechten dieselbe Bedingung wie team_gallery_kind(): aktives Kind, Freigabe intern
-- oder Opt-in, und der Pfad ist sein Kartenfoto. Alle übrigen Zweige der Regel bleiben unverändert.
create or replace function public.spielerfoto_team_sichtbar(p_name text)
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.sitzung_gueltig() and exists (
    select 1 from public.kader k left join public.kind_fanfacts f on f.spieler_id = k.id
    where coalesce(k.aktiv, true)
      and (coalesce(f.gallery_optin, false) or exists (select 1 from public.foto_consent c where c.spieler_id = k.id and c.intern))
      and (p_name = f.foto_path or p_name = k.foto_path));
$$;
revoke all on function public.spielerfoto_team_sichtbar(text) from public;
grant execute on function public.spielerfoto_team_sichtbar(text) to authenticated;

drop policy if exists "spielerfotos auth select" on storage.objects;
create policy "spielerfotos auth select" on storage.objects for select to authenticated using (
  bucket_id = 'spielerfotos' and (
    public.is_trainer()
    or exists (select 1 from public.kader k where k.foto_path = objects.name and public.is_parent_of(k.id))
    or (objects.name ~ '^[0-9]+/' and public.is_parent_of(split_part(objects.name, '/', 1)::bigint))
    or public.spielerfoto_team_sichtbar(objects.name)
  ));
