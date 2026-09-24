-- v603: staerken_von ist ein Baustein, kein Endpunkt.
--
-- Die Funktion liefert zu einem Kindernamen die drei staerksten Bewertungsmerkmale aus
-- spielerprofile. Sie ist SECURITY DEFINER und prueft nichts – das ist richtig, solange nur
-- team_gallery_kind und my_child_card_kind sie aufrufen, die ihre eigene Pruefung haben und
-- selbst als Eigentuemer laufen. Seit 20260920_my_child_card_kind.sql war sie aber zusaetzlich
-- fuer `authenticated` freigegeben und ueber die Standardrechte auch fuer `anon`: Jeder mit dem
-- oeffentlichen Schluessel aus dem Repo haette zu jedem Vornamen die Staerken abfragen koennen.
-- Gemessen am 24.09.: Gegenwaertig gibt es keine Bewertung (0 Zeilen in spielerprofile), die
-- Luecke war also offen, aber leer. Mit der ersten Bewertung waere sie es nicht mehr gewesen.
--
-- Der Browser ruft die Funktion nirgends auf (kein /rpc/staerken_von im Code). Die beiden
-- aufrufenden Funktionen gehoeren postgres und behalten das Recht als Eigentuemer.

revoke execute on function public.staerken_von(text) from public;
revoke execute on function public.staerken_von(text) from anon;
revoke execute on function public.staerken_von(text) from authenticated;

comment on function public.staerken_von(text) is
  'Interner Baustein fuer team_gallery_kind und my_child_card_kind. Kein Aufrufrecht fuer anon/authenticated (v603) – die Funktion prueft selbst nichts.';
