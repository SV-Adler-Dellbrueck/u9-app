-- Paket 1 „Das kann dein Kind jetzt" (doku/auftrag-adler-luecken).
--
-- Der Eltern-Bereich soll zeigen, was das Kind NEU KANN – bisher steht dort nur,
-- wie ein Spieltag ausging. Die Quelle dafür ist `entwicklungsziele`, und die ist
-- trainer-only: Eltern dürfen die Tabelle nicht sehen, weil dort auch offene Ziele
-- und die Einschätzung des Trainers stehen.
--
-- Deshalb dasselbe Muster wie bei `xp_events_for` und `training_rueckblick`:
-- eine SECURITY-DEFINER-Funktion, die GENAU das herausgibt, was die Karte braucht,
-- und den Zugriff selbst prüft. Zurück kommen nur Text und Zeitpunkt.
-- Nie eine Bewertungszahl, nie ein anderes Kind, nie ein offenes Ziel.
--
-- Die Prüfung steht bewusst im äußeren WHERE (wie bei xp_events_for): wer weder
-- Trainer noch Elternteil dieses Kindes ist, bekommt eine leere Menge – keinen
-- Fehler, der verriete, dass es das Kind gibt.

create or replace function public.kann_jetzt_public(p_kind_id bigint, p_tage integer default 14)
returns table(art text, text text, wann timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with fenster as (
    -- Nach oben gedeckelt: der Aufrufer bestimmt das Fenster, aber niemand kann
    -- sich damit die ganze Vereinsgeschichte ziehen.
    select now() - make_interval(days => greatest(1, least(coalesce(p_tage, 14), 90))) as ab
  )
  select x.art, x.text, x.wann
    from (
      select 'ziel'::text as art, z.ziel::text as text, z.erreicht_at as wann
        from public.entwicklungsziele z, fenster f
       where z.spieler_id = p_kind_id
         and z.status = 'erreicht'
         and z.erreicht_at is not null
         and z.erreicht_at >= f.ab
         and coalesce(btrim(z.ziel), '') <> ''
      union all
      -- Technik-Abzeichen liegen als append-only-Zeile im punkte_log; `quelle_id` ist
      -- die stabile Abzeichen-Kennung (z. B. ab_jonglier), die die App in einen Namen
      -- übersetzt. Die Federzahl (`delta`) bleibt bewusst draußen.
      select 'abzeichen'::text, p.quelle_id::text, p.created_at
        from public.punkte_log p, fenster f
       where p.spieler_id = p_kind_id
         and p.quelle = 'abzeichen'
         and p.quelle_id is not null
         and p.created_at >= f.ab
    ) x
   where public.is_trainer() or public.is_parent_of(p_kind_id)
   order by x.wann desc
   limit 3;
$function$;

comment on function public.kann_jetzt_public(bigint, integer) is
  'Eltern-Karte „Das kann dein Kind jetzt": erreichte Entwicklungsziele und neue Technik-Abzeichen des EIGENEN Kindes, höchstens drei, neueste zuerst. Nur Text und Zeitpunkt.';

revoke all on function public.kann_jetzt_public(bigint, integer) from public;
grant execute on function public.kann_jetzt_public(bigint, integer) to anon, authenticated;
