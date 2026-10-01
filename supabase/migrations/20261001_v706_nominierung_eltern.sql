-- v706 · Eltern sehen die Nominierung aus Schritt ① „Wer kommt?“, nicht die Team-Zeile
-- PO 01.10.2026: „Wo kann ich jetzt die Teams in die Nominierung in die Eltern-App übertragen, damit die
-- Eltern sehen, ob ihr Kind nominiert ist?“ Befund: Übertragen muss niemand – kind_nominierungsstatus
-- las aber die ERSTE Zeile des Tages. Seit es mehrere Teams gibt, ist das die Zeile von Adler 1
-- („<datum>“ = Team 1, „__t2“, „__t3“; teamsZeilenSchreiben) – und darin steht jedes Kind aus
-- Adler 2 und 3 als „nicht“. Für den 03.10. sahen so 9 von 13 nominierten Familien „diesmal pausiert“.
-- Jetzt zählt die Nominierung („<datum>__nom“). Nur wo es sie nicht gibt (ältere Spieltage), gilt die
-- frühere Suche, ohne die Team-Zeilen. Kachel: „Beheben, ohne Team“ – die Team-Einteilung bleibt
-- Trainersache.
create or replace function public.kind_nominierungsstatus(p_spieler bigint, p_datum text)
returns json language plpgsql stable security definer set search_path to 'public' as $function$
declare v_name text; v_status text; v_eingeteilt boolean; v_nominiert boolean; v_zugesagt boolean; v_grund text;
begin
  if not (is_trainer() or is_parent_of(p_spieler)) then
    return json_build_object('ok', false, 'error', 'nicht berechtigt');
  end if;
  select name into v_name from kader where id = p_spieler;
  if v_name is null then return json_build_object('ok', false); end if;
  -- v706: zuerst die Nominierung des Tages
  select coalesce(n.data->>(p_spieler::text), n.data->>v_name) into v_status
    from nominierungen n
   where n.datum = p_datum || '__nom'
     and (n.data ? (p_spieler::text) or n.data ? v_name);
  if v_status is null then
    select coalesce(n.data->>(p_spieler::text), n.data->>v_name) into v_status
      from nominierungen n
     where n.datum like p_datum || '%' and n.datum not like '%\_\_teams' and n.datum not like '%\_\_t%'
       and (n.data ? (p_spieler::text) or n.data ? v_name)
     order by n.datum
     limit 1;
  end if;
  v_nominiert  := (v_status = 'dabei');
  v_eingeteilt := (v_status in ('dabei','nicht','verletzt'));
  select exists(select 1 from rueckmeldungen r join termine t on t.id = r.termin_id
                where r.spieler_id = p_spieler and t.datum = p_datum and r.status = 'zugesagt') into v_zugesagt;
  select grund into v_grund from nominierung_hinweis where datum = p_datum and spieler_id = p_spieler;
  return json_build_object('ok', true, 'eingeteilt', v_eingeteilt, 'nominiert', v_nominiert,
                           'zugesagt', v_zugesagt, 'status', v_status, 'grund', v_grund);
end $function$;
