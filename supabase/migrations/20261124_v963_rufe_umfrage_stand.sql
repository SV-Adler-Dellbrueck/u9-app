-- v963 · Charles 24.11.2026: „Ich kann in der Eltern-App unter den Chats bei der Abstimmung klicken, aber ich sehe kein Ergebnis.“
-- Ursache: v829 (Raum „nur Eltern“) hat in rufe_umfrage_stand die Bedingung „(n.archiviert_am is null or public.is_trainer())“
-- durch „public.rufe_darf_archiv(n.raum_id)“ ersetzt – ohne den ersten Teil. Seitdem bekamen nur noch Archiv-Berechtigte (in
-- normalen Räumen: Trainer) Ergebnisse; Eltern sahen bei jeder Abstimmung 0, obwohl ihre Stimmen gespeichert wurden.
-- Jetzt wieder wie bei den Rufen selbst (Policy v829): nicht archiviert, oder archiviert und archiv-berechtigt.
create or replace function public.rufe_umfrage_stand(p_ids bigint[])
returns table(umfrage_id bigint, option integer, anzahl integer, namen text[], ich boolean, teilnehmer integer)
 language sql stable security definer set search_path to 'public' as $$
  select s.umfrage_id, s.option::int, count(*)::int,
         case when f.anonym then null else array_agg(coalesce(s.name,'?') order by s.created_at) end,
         bool_or(s.user_id=auth.uid()),
         (select count(distinct s2.user_id)::int from rufe_stimme s2 where s2.umfrage_id=s.umfrage_id)
    from rufe_stimme s
    join rufe_umfrage f on f.id=s.umfrage_id
    join rufe_nachricht n on n.id=f.nachricht_id
   where s.umfrage_id = any(p_ids) and public.rufe_raum_sichtbar(n.raum_id)
     and (n.archiviert_am is null or public.rufe_darf_archiv(n.raum_id))
   group by s.umfrage_id, s.option, f.anonym;
$$;
