# Maskottchen: der Adler

Der Adler ist das feste Wappentier der Adler-App, des Adler Nest und aller Feste (Beschluss 21.11.2026). Er bleibt über die Jahre derselbe und wird nur über Zubehör und Posen verändert, nie neu erfunden. Er spricht mit der Stimme „Lennart“ (ElevenLabs).

Dieser Ordner enthält nur den Adler, keine Kinderdaten und keine Fotos. Das Repo ist öffentlich und soll es auch hier bleiben.

## Was wo liegt

| Ordner | Inhalt |
|---|---|
| `master/` | Der Master-Adler ohne Zubehör, winkend. Ausgangspunkt jeder neuen Variante. Wird nie verändert. |
| `varianten/` | Freigegebene Varianten, je Pose ein Unterordner. Stand 22.11.2026: Weihnachtsmütze in fünf Posen. |
| `quellen/` | Die Original-Bilder mit einfarbig grauem Hintergrund (#BEBEBE), so wie die KI sie geliefert hat. Sie dienen als Referenz für neue Varianten, nicht für die Anzeige. |
| `werkzeuge/` | `freistellen.py`, entfernt den grauen Hintergrund und schneidet zu. |

Pro Bild gibt es vier Dateien mit transparentem Hintergrund:

| Datei | Höhe | Wofür |
|---|---|---|
| `…_gross.png` | ca. 1200 px | Beamer, Folien, Videos. Doppelt hochgerechnet, siehe Grenzen. |
| `…_mittel.png` / `.webp` | 600 px | Normalfall in der App und im Heft |
| `…_klein.png` / `.webp` | 300 px | Avatare, Listen, Sprechblasen |

Namensmuster: `adler_<pose>[_<zubehoer>]_<groesse>.<endung>`, alles klein, Umlaute ausgeschrieben, Bindestrich nur innerhalb eines Begriffs (`jubelt-ball`).

## Vorhandene Posen

| Datei | Zubehör | Gedacht für |
|---|---|---|
| `adler_master` | keins | Ausgangsbild, ganzjährig |
| `adler_winkt_weihnachtsmuetze` | Weihnachtsmütze | Sprecher, Begrüßung |
| `adler_praesentiert_weihnachtsmuetze` | Weihnachtsmütze | Sprecher neben Inhalt, Wischbewegung nach rechts |
| `adler_fliegt_weihnachtsmuetze` | Weihnachtsmütze | Anflug und Abflug, Szenenwechsel |
| `adler_jubelt-ball_weihnachtsmuetze` | Weihnachtsmütze, Fußball | Dank, Schluss, Erfolge |
| `adler_staunt_weihnachtsmuetze` | Weihnachtsmütze | Hervorhebungen |

## Charakterbeschreibung

Maßgeblich ist das Bild `master/`, die Beschreibung hilft beim Prüfen und beim Prompten.

- Stil: Comic für Kinder, dicke dunkle Konturen, flächige Farben mit weicher Schattierung, freundlich und nie bedrohlich.
- Kopf: weiß, mit struppigen Federspitzen an Nacken und Brust. Große, runde, blaue Augen mit schwarzer Pupille und weißem Glanzpunkt, kräftige dunkle Brauen.
- Schnabel: groß, gelb, leicht gebogen, mit Nasenloch. Der Mund ist meist offen und lächelt, die Zunge ist rosa.
- Körper: dunkelbraunes Gefieder an Flügeln und Hüfte, weißer Ansatz an den Schwanzfedern. Aufrechte Haltung auf zwei Beinen, kräftiger Oberkörper.
- Trikot: königsblau mit V-Ausschnitt, weißem Kragenrand und weißen Streifen an den Ärmeln. Kein Text, keine Nummer, kein Wappen aufgemalt.
- Beine: gelb, mit dunkelgrauen Krallen.

## Neue Variante erzeugen

Regel: jede Variante entsteht aus dem Master, nie aus einer anderen Variante. Sonst wandern Gesicht und Proportionen von Mal zu Mal weg.

1. In ElevenLabs das Bild `quellen/adler_master_quelle_grauer-hintergrund.jpg` als Referenz in einen Flow legen und mit „Bild bearbeiten“ arbeiten.
2. Modell: `gpt-image-2.5-sunburst`. So sind die vorhandenen Posen entstanden. Kosten Stand 21.11.2026: etwa 433 Credits je Bild.
3. Prompt-Vorlage:
   ```
   Keep this exact eagle character: same face, beak, eyes, feather colors,
   blue jersey, outline style and proportions. Add <Zubehör>.
   Pose: <Pose>. Plain flat light-grey background, whole figure visible,
   no text, no shadow.
   ```
4. Das Ergebnis gegen die Freigabe-Checkliste prüfen.
5. Mit `werkzeuge/freistellen.py` freistellen (`python3 freistellen.py eingabe.jpg ausgabe.png`, braucht Pillow, numpy und scipy) und die vier Größen exportieren.
6. Original unter `quellen/`, Exporte unter `varianten/` ablegen und die Tabelle oben ergänzen.

Ideen für Zubehör, noch nicht erzeugt: Sonnenbrille (Sommer), blaue Vereinsmütze (Winter), Schal, Pokal, Torwarthandschuhe, Trikot mit Nummer.

## Freigabe-Checkliste

- Gesicht, Augenfarbe und Schnabelform entsprechen dem Master.
- Trikot ist dasselbe Blau mit denselben weißen Streifen, ohne Text.
- Linienstärke und Schattierung passen zum Master.
- Alle Krallen und Finger sind vollständig, kein Körperteil fehlt oder ist doppelt.
- Das Zubehör sitzt plausibel und verdeckt kein Auge.
- Im Bild steht kein Text.

## Wappen

Das Vereinswappen wird von der KI nicht nachgemalt, es würde nie exakt. Soll der Adler es tragen, wird die echte Wappendatei des Vereins nachträglich als Ebene aufgelegt.

## Grenzen

- **Auflösung:** Die KI liefert 1280 × 720 Pixel, die Figur ist darin nur rund 600 Pixel hoch. `_gross` ist doppelt hochgerechnet und deshalb weicher. Für Beamer in Full HD reicht das, für Druck ab etwa Postkartengröße nicht. Dafür bräuchte es ein Hochskalieren mit eigenem Werkzeug oder eine Nachzeichnung.
- **Kein SVG:** Eine automatische Vektorisierung wurde am 22.11.2026 getestet und verworfen. Die Konturen verschoben sich, es blieb ein grauer Rand, und die Datei hatte 1,7 MB. Soll der Adler ein Logo werden, muss ihn jemand von Hand nachzeichnen.
- **Rand:** Auf sehr dunklem Hintergrund bleibt an manchen Federspitzen ein feiner heller Saum. Auf hellen und mittleren Hintergründen fällt er nicht auf.
- **Wiederholbarkeit:** Zwei KI-Bilder aus demselben Master sind nie pixelgleich. Für Posen und Zubehör reicht das, für ein festes Logo nicht.

## Einbindung in die App

Die App lädt diese Bilder derzeit nicht. Wer sie einbaut, beachtet die Pflichten aus `CLAUDE.md`: Dateien in `PRECACHE` und in `FEST_CACHE` (`sw.js`) eintragen, danach `node tools/fest-cache.js --schreiben` aufrufen und `sw.js` hochzählen.
