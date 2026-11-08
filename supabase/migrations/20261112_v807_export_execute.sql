-- v807 · Korrektur zu v804: Funktionen in einer View werden mit den Rechten des AUFRUFERS geprüft, nicht des View-Eigentümers.
-- Die Rolle adler_export_lese braucht deshalb EXECUTE auf den drei Maskier-Funktionen, sonst scheitert jede Abfrage der Views
-- mit „permission denied for function ohne_namen“ (aufgefallen beim ersten Lauf der Export-Action am 08.11.2026).
-- Die Funktionen sind SECURITY DEFINER und geben nur ersetzte Texte beziehungsweise Buchstaben zurück; die Rolle bekommt
-- weiterhin keinerlei Recht auf Tabellen in public. anon und authenticated bleiben ausgeschlossen.
-- Bereits im Projekt eingespielt (08.11.2026, per Management-API); diese Datei hält das Repo gleich.
grant execute on function export.ohne_namen(text), export.kind_alias(bigint), export.json_ohne_namen(jsonb) to adler_export_lese;
