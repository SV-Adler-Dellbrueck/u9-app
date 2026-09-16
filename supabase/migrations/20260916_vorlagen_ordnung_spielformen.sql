-- v568 · Drei weitere Ordnungen: die Spielformen des Spieltags
--
-- Die Einheiten fuer 3+1 (Raute ohne Aufpasser, der Torwart spielt mit), FUNiño
-- (Dreieck ohne Jaeger, der Aufpasser als Mittelmann) und die Kombination
-- „3+1 gegen FUNiño" (grosses Tor gegen zwei kleine) tragen ihre Spielform als Ordnung.
-- Die Spalte ist Text ohne Check-Constraint (20260914_vorlagen_ordnung.sql) – die
-- Werteliste lebt in EI_ORDNUNGEN (md-einheit-import.js). Nur der Kommentar zieht nach,
-- damit er nicht luegt. Keine update-Zeilen: die acht neuen Vorlagen bringen ihre
-- Ordnung ueber den Abgleich mit (uebungen/vorlagen.json, Stand 2026-09-16-1).

comment on column public.trainingsvorlagen.ordnung is
  'Wie die Mannschaft im Spiel steht: 1 gegen 1 · 2 gegen 2 · Dreieck (3 gegen 3) · Raute (4 gegen 4) · 3+1 · FUNiño · 3+1 gegen FUNiño · Ueberzahl · ohne Gegner. NULL = keine besondere.';
