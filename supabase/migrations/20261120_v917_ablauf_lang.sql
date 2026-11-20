-- v917 · Bestandsaufnahme 5.10, lange Abläufe (Charles 20.11.: „Es soll eine kurze Variante geben, aber auch
-- eine lange, die genau beschreibt, was die Übung ist und welche Ziele sie hat. Die lange können wir optional
-- abrufbar machen.“). ablauf bleibt die kurze Fassung, die überall sichtbar ist; ablauf_lang ist die ganze
-- Beschreibung, im Übungsdetail aufklappbar. Ohne Wert bei allen bestehenden Zeilen. RLS unverändert
-- (Spalte erbt die Richtlinien der Tabelle); die Sicherung liest select=* und nimmt sie mit.
alter table public.trainingsformen add column if not exists ablauf_lang text;
