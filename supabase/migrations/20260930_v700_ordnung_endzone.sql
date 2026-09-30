-- v700: Neue Ordnung „Endzone (4 gegen 4)“ für die Vorlage L5-7 „Endzone und Fähnchen“.
-- Nur der Spaltenkommentar; die erlaubten Werte prüft die App (EI_ORDNUNGEN), nicht die Datenbank.
comment on column public.trainingsvorlagen.ordnung is
  'Wie die Mannschaft im Spiel steht: 1 gegen 1 · 2 gegen 2 · Dreieck (3 gegen 3) · Raute (4 gegen 4) · 3+1 · FUNiño · 3+1 gegen FUNiño · 3+1 und FUNiño · Ueberzahl · ohne Gegner · Endzone (4 gegen 4). NULL = keine besondere.';
