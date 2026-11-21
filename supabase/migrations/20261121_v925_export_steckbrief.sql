-- v925 · Steckbrief im nächtlichen Export für den Projekt-Chat (Charles 21.11.: „Steckbrief im Projekt-Chat freigegeben“).
-- Wie alle Export-Views: Kind nur als Alias („Kind C“), Freitexte durch export.ohne_namen (Kindernamen → Buchstabe,
-- Elternnamen → „ein Elternteil“). Bewusst NICHT im Export: Spitzname (identifiziert), Grund für die Rückennummer
-- (bleibt beim Trainerteam), Verein der weiteren Sportart (Ort), Schuhgröße, Fotos und Foto-Freigaben. Von den Fotos geht
-- nur hinaus, zu welchen Kacheln es eines gibt (Zweck), nie ein Bild oder ein Pfad.
create or replace view export.steckbrief as
select export.kind_alias(f.spieler_id) as kind,
       f.lieblingsposition, f.starker_fuss,
       export.ohne_namen(f.lieblingsspieler) as lieblingsspieler, export.ohne_namen(f.lieblingsverein) as lieblingsverein,
       export.ohne_namen(f.schoenster_moment) as schoenster_moment, export.ohne_namen(f.torjubel) as torjubel,
       export.ohne_namen(f.saisonziel) as saisonziel, export.ohne_namen(f.adler_seit) as adler_seit,
       export.ohne_namen(f.hobby) as hobby, export.ohne_namen(f.kann_gut) as kann_gut,
       export.ohne_namen(f.lieblingsessen) as lieblingsessen, export.ohne_namen(f.lieblingstier) as lieblingstier,
       export.ohne_namen(f.gross_werden) as gross_werden, export.ohne_namen(f.stolz_auf) as stolz_auf,
       export.ohne_namen(f.weiterer_sport) as weiterer_sport,
       export.ohne_namen(f.lieblingsfarbe) as lieblingsfarbe, export.ohne_namen(f.lieblingsbuch) as lieblingsbuch,
       export.ohne_namen(f.lieblingsfilm) as lieblingsfilm, export.ohne_namen(f.lieblingsmusik) as lieblingsmusik,
       export.ohne_namen(f.lieblingsspiel) as lieblingsspiel, export.ohne_namen(f.lieblingsfach) as lieblingsfach,
       export.ohne_namen(f.mag_nicht) as mag_nicht, export.ohne_namen(f.groesster_wunsch) as groesster_wunsch,
       export.ohne_namen(f.superkraft) as superkraft, export.ohne_namen(f.zaubern) as zaubern,
       export.ohne_namen(f.lieblingswitz) as lieblingswitz, export.ohne_namen(f.geheimes_talent) as geheimes_talent,
       export.ohne_namen(f.star_spielen) as star_spielen, export.ohne_namen(f.traumstadion) as traumstadion,
       export.ohne_namen(f.fussball_erlebnis) as fussball_erlebnis, export.ohne_namen(f.satz_an_team) as satz_an_team,
       coalesce((select array_agg(distinct x.zweck order by x.zweck) from public.kind_foto x where x.spieler_id = f.spieler_id), '{}'::text[]) as foto_zwecke
  from public.kind_fanfacts f
  join public.kader k on k.id = f.spieler_id
 where k.alias is not null and coalesce(k.aktiv, true);

revoke all on export.steckbrief from public, anon, authenticated;
grant select on export.steckbrief to adler_export_lese;
