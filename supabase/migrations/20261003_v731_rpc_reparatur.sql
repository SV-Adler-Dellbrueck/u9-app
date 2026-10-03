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
