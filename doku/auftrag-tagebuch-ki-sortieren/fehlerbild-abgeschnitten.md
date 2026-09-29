# Fehlerbild: abgeschnittener Satz im Tagebuch-Vorschlag

Gefunden am 29.09.2026 im Tagebucheintrag zur Einheit vom 28.09.2026 (Quelle `einheit`,
`ki_vorschlag = true`, angelegt am 29.09.2026 gegen Mittag).

## Was zu sehen ist

Im Feld `beobachtung` folgt auf einen vollständigen Absatz ein Absatz, der **mitten im Wort**
beginnt: „…on von Kenneth auffällig geworden." Der Anfang des Satzes fehlt — und damit genau
der Teil, der das betroffene Kind benennt. Inhaltlich gemeint war ein Kind an Kenneths
Station; das ließ sich nur durch Nachfrage beim Trainer klären.

## Verdacht, nicht geprüft

- Die Beobachtung wird aus mehreren Teilen zusammengesetzt (Freitext, „Das hat getragen",
  „Daran arbeiten wir", Bewertungszeile). Beim Zusammensetzen oder Kürzen wird ein Teil nicht
  am Satzanfang, sondern an einer festen Zeichenposition abgeschnitten.
- Oder die Rückübersetzung „Kind n" → Vorname ersetzt einen Bereich falscher Länge.
- Oder die Antwort der KI war an dieser Stelle schon abgeschnitten (`max_tokens` 1400), und
  die App setzt den Rest ungeprüft zusammen.

Der Eintrag vom 26.09. endet ebenfalls mitten im Satz („… um keine Frustration zu erzeugen,
nur"). Das spricht für ein Längenlimit, nicht für einen Einzelfall.

## Was ich erwarte

1. Ursache finden und benennen, bevor etwas geändert wird.
2. Kein Feld wird je mitten im Wort oder mitten im Satz abgeschnitten. Wenn gekürzt werden
   muss, dann am Satzende, und der Eintrag zeigt sichtbar, dass gekürzt wurde.
3. Mit dem gespeicherten `diktat` aus dem Hauptauftrag lässt sich jeder Vorschlag gegen das
   Original prüfen — der Fall hier ist das Beispiel, warum das Diktat mitgespeichert werden
   muss.
4. Die beiden betroffenen Einträge **nicht** automatisch reparieren; melden, der Trainer
   ergänzt selbst.
5. Prüffall in `tests/checks/` mit einer langen Notiz, die über die Grenze geht.
