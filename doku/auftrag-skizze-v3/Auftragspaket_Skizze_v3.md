# Auftragspaket: Skizze v3 – Schritte, Präsentationsmodus, Abspielen

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 15.09.2026 (App v554). Gilt zusammen mit `CLAUDE.md`
und dem Muster aus `doku/auftrag-skizze-v2/`.

> **Status: Entscheidungen getroffen (15.09.2026), wartet auf Freigabe zum Bau.** Die drei
> Fragen am Ende hat Charles beantwortet; gebaut wird Scheibe für Scheibe auf sein Wort.

## Ausgangslage

Die Skizze der App dient drei Einsatzfällen, und sie deckt sie unterschiedlich gut ab:

1. **Ansicht im Training** – Standbild am Handy, 280 × 180, Legende, Bildexport. Gelöst.
   Schwäche: der dunkle Rasen (`#2d6a2d`) in der Sonne am Platz.
2. **Erstellen von Übungen und Einheiten** – Tipp-Editor (`md-skizze.js`: Werkzeuge, Farben,
   vier Pfeiltypen, Verschieben, Entfernen, Rückgängig, dreizehn Vorlagen), Übungsbibliothek
   und Vorlagen-Abgleich. Schwäche: eine Übung ist **ein** Bild, obwohl sie fast immer drei
   Momente hat (Aufbau, Pass, Abschluss). Heute wird der Ablauf in Pfeile und den Text unter
   dem Bild gequetscht; „Dreieckspassen mit Abschluss“ aus v554 zeigt fünf Pfeile auf einmal.
3. **Live in Besprechungen mit Kindern** – nicht gelöst. Das Taktikboard (`md-taktikboard.js`)
   kennt Formationen, Laufwege und den Bildexport, aber keine Übungen; die Übungsskizze kennt
   keine Schritte. Ein U9-Kind versteht keine Pfeilsammlung, aber „erst so, dann so“.

Recherche vom 15.09. (Drive-Ordner „Trainingsformen“ mit 40 PDF-Exporten der
Fussballtraining-App von Philippka; TacticalPad, easy2coach Tactics, Sport Session Planner,
CoachFX 360, TactX, DFB-Grafiktool): Die animierten Werkzeuge sind eigene Editoren mit
Zeitachse, Keyframes und Laufzeit. Philippka bleibt beim Standbild, hell und figürlich.
Eintrag dazu in `entscheidungen.md` des privaten Repos.

**Entscheidung dieses Pakets:** kein 3D, keine freie Zeitachse. Eine Skizze bekommt
**Schritte** – eine Folge von Bildern, die den Aufbau teilen und nur Spieler, Ball, Pfeile
und Text neu setzen. Ein Mechanismus für alle drei Fälle: beim Erstellen „Bild hinzufügen“
und drei Kreise verschieben; im Training zeigt das Detail Bild 1 wie heute; in der
Besprechung wird am Tablet im Vollbild geblättert, und „Abspielen“ schiebt Spieler und Ball
von Bild zu Bild. Bleibt Vanilla, bleibt **eine** Beschreibung je Übung, alte Skizzen ohne
Schritte rendern unverändert.

Sollbild: `vorschau.html` in diesem Ordner (Ordner über `python -m http.server` öffnen)
zeigt „Dreieckspassen mit Abschluss“ in vier Bildern, gezeichnet mit dem **heutigen**
Renderer aus `beispiel-schritte.json`; `sollbild.png` ist die Aufnahme davon.

## Drei Scheiben, drei Versionen

Jede Scheibe ist ein eigener Entwurfs-PR mit eigenem Bump und eigenem Prüffall. Scheibe 1
hat keine Abhängigkeit, Scheibe 3 braucht Scheibe 2. Reihenfolge so gewählt, dass nach jeder
Scheibe etwas am Platz benutzbar ist.

| Scheibe | Was | Version |
|---|---|---|
| 1 | Präsentationsmodus: Vollbild, Fingerzoom, helle Rasenvariante | v5xx |
| 2 | Schritte in Beschreibung, Renderer, Editor, Import, Detail, Export | v5xx+1 |
| 3 | Abspielen zwischen Schritten; Taktikboard mit denselben Bildern | v5xx+2 |
| 4 | Besetzung: Kürzel und Fotos der Kinder statt „S“ und „O“ | v5xx+3 |

Scheibe 4 hängt **nur an Scheibe 1**, nicht an den Schritten. Soll die Wirkung in der
Besprechung zuerst da sein, wird in der Reihenfolge 1 · 4 · 2 · 3 gebaut.

---

## Scheibe 1 · Präsentationsmodus

**Wo:** Detailansicht einer Übung (`tpShowExercise` in `boot.js`, dort wo `skzLegende()` und
„Skizze teilen“ stehen), Übungsvorschau im Einheiten-Import, KI-Coach-Vorschau – überall,
wo `_skz`-Ausgabe mit Legende steht. Aufruf mit `typeof`-Schutz, das Modul ist Welle 2.

**Knopf „Groß zeigen“** (mindestens 44 px, neben „Skizze teilen“). Öffnet ein Overlay:

- `role="dialog" aria-modal="true"`, zentraler Fokus-Trap aus `core.js`, Schließen mit
  Escape, mit dem 56-px-Knopf und mit Tipp auf den Rand. Kein `prompt`, kein `confirm`.
- Die SVG füllt den Bildschirm so groß wie möglich bei erhaltenem Seitenverhältnis 280:180;
  im Querformat am Tablet also fast bildschirmfüllend. Die Legende steht darunter, aus
  `skzLegende()`, nicht abgetippt.
- **Fingerzoom:** zwei Finger zoomen (1× bis 4×), ein Finger verschiebt im gezoomten
  Zustand, Doppeltipp setzt zurück. Umgesetzt über `transform` auf dem SVG-Container mit
  Pointer-Events, keine Bibliothek. Am Desktop Mausrad zoomt. Weil die Skizze Vektor ist,
  bleibt sie bei 4× scharf – nichts wird neu gezeichnet.
- **Helle Rasenvariante:** Umschalter „Hell / Dunkel“ im Overlay (Text plus Symbol, nie nur
  Farbe), Wahl in `localStorage` gemerkt (`adler-skizze-hell`), Standard dunkel (Entscheidung 1). Die Variante wird beim Zeichnen gewählt, **nicht** in der Beschreibung
  gespeichert: `_skz(spec, {hell:true})`. Rasen hell (Richtwert `#8fd18f`, wie in den
  Philippka-Grafiken), Feldlinien dunkel statt weiß, Spielerkreise mit dunklem Rand
  (`rgba(0,0,0,.55)`), Text dunkel. **Alle Kontraste messen** und in `data.js` kommentieren:
  Kreisfüllung gegen Rasen mindestens 3:1, Kürzel im Kreis mindestens 4,5:1, jede Pfeilfarbe
  mindestens 3:1 gegen den hellen Rasen. Wo eine Legendenfarbe (weißer Pass, gelber Laufweg)
  das auf hellem Grund nicht schafft, bekommt die helle Variante eine eigene Farbtabelle
  `SKZ_PFEIL_HELL` mit denselben Schlüsseln – die Legende liest sie mit. Die dunkle Variante
  bleibt zeichengleich zu heute (Abnahme 1).
- Kinder sehen keine Zahlen: das Overlay zeigt Skizze, Legende und Übungsname, sonst nichts.

**Abnahmekriterien Scheibe 1**

1. `_skz(spec)` ohne Option liefert für alle Specs in `TF_SKIZZEN` und `uebungen/bibliothek.json`
   denselben String wie vor der Änderung (Vergleich im Prüffall gegen `REPO=`-Gegenprobe
   oder gegen eine mitgelieferte Prüfsumme).
2. Overlay öffnet aus dem Detail, hat `role="dialog"`, der Fokus liegt darin, Escape schließt.
3. Bei 390 × 844 (Handy hochkant) ist die Skizze mindestens 358 px breit; bei 1024 × 768
   (Tablet quer) mindestens 900 px.
4. Zwei-Finger-Zoom auf 2× verändert die `transform` des Containers, Doppeltipp setzt sie auf
   1× zurück (Playwright: `page.touchscreen` bzw. synthetische Pointer-Events).
5. Helle Variante: gemessene Kontraste stehen als Kommentar in `data.js`, der Prüffall
   rechnet sie aus den Farbkonstanten nach (Formel wie in `tests/checks/v517-skizze-v2.js`).
6. Umschalter merkt sich die Wahl über ein Neuladen.

**Testfälle:** `tests/checks/v5xx-skizze-praesentation.js` mit den sechs Punkten oben.

---

## Scheibe 2 · Schritte

### 2.1 Beschreibung (Schema)

Neue Liste **`schritte`** in der Skizzen-Beschreibung. Jeder Eintrag ist ein Objekt mit
höchstens den vier **beweglichen** Listen `s`, `b`, `p`, `tx`. Die Grundbeschreibung ist
Bild 1; `schritte[0]` ist Bild 2 usw. Der **Aufbau** (`z`, `tor`, `li`, `h`, `leiter`, `wand`)
steht nur in der Grundbeschreibung und gilt für alle Bilder. Beispiel: `beispiel-schritte.json`.

Regeln, die der Import prüft und der Editor einhält:

- Höchstens **6** Schritte (also 7 Bilder). Mehr ist keine Übung mehr, sondern ein Film.
- In jedem Schritt hat `s` **dieselbe Anzahl** Spieler wie die Grundbeschreibung, und Farbe
  und Kürzel je Index sind gleich. Nur so ist klar, wer wohin läuft – und nur so kann
  Scheibe 3 die Positionen ineinander überführen. `b` ebenso (gleiche Anzahl Bälle).
- `p` und `tx` sind je Schritt frei: die Pfeile eines Bildes zeigen, was **in diesem Bild**
  passiert. Ein Bild ohne Pfeile ist erlaubt (Endstellung).
- Ein Schritt ohne eine der vier Listen übernimmt sie aus dem vorherigen Bild.
- `EI_SKZ_LISTEN` bekommt `"schritte"` dazu; `_eiSkizzeOk` prüft zusätzlich, dass jeder
  Schritt ein Objekt ist, dessen Schlüssel aus `s, b, p, tx` stammen, und dass die Regeln
  oben gelten – mit Blocknummer und Bildnummer in der Fehlermeldung, wie bisher.
- Schema-Kennungen (`adler-uebungen/1`, `adler-vorlagen/1`) bleiben – die Änderung ist
  additiv. `trainingsformen.skizze` ist `jsonb`, keine Migration. `taktik_templates.data`
  ebenso (Scheibe 3).

### 2.2 Renderer `_skz`

`_skz(spec, opt)` mit `opt.bild` (0 = Grundbeschreibung, 1 = `schritte[0]` …). Intern: die
Grundbeschreibung mit dem gewählten Schritt zusammenlegen (Aufbau aus der Basis, bewegliche
Listen aus dem Schritt, Fehlendes aus dem vorigen Bild) und wie heute zeichnen. Ohne `opt`
und ohne `schritte` entsteht **Zeichen für Zeichen dieselbe Ausgabe wie heute** – der
Prüffall vergleicht alle bestehenden Specs. Die Zusammenlegung ist eine eigene reine
Funktion `_skzBild(spec, n)`, damit Editor, Export und Scheibe 3 dieselbe benutzen.
Kein Vorwärtsverweis auf Welle 2.

### 2.3 Detailansicht

Hat eine Skizze Schritte, stehen unter dem Bild **Bildknöpfe** „1 · 2 · 3 …“ (je mindestens
44 px, der aktive mit `aria-pressed`, beschriftet mit Zahl – nie nur Farbe) und Pfeile
„◀ ▶“. Der Text unter den Knöpfen ist das `tx` des Bildes. Bild 1 ist voreingestellt, damit
die Ansicht im Training unverändert bleibt. Im Präsentationsmodus (Scheibe 1) dieselben
Knöpfe, größer (56 px), und Wischen wechselt das Bild.

### 2.4 Editor

- **Bildleiste** über der Bühne: „Bild 1 · Bild 2 · + Bild“. „+ Bild“ kopiert die
  beweglichen Listen des aktuellen Bildes als neues Bild dahinter – man verschiebt dann nur,
  was sich bewegt. „Bild entfernen“ (ab Bild 2), Bild 1 ist nicht löschbar. Höchstens 7.
- **Aufbau nur in Bild 1:** In Bild 2 und folgenden sind die Werkzeuge Zone, Tor, Jugendtor,
  Mittellinie, Schusszone, Leiter, Hütchen ausgegraut (`disabled`, Hinweiszeile „Aufbau wird
  in Bild 1 gesetzt“). Spieler und Ball lassen sich ab Bild 2 **nur verschieben**, nicht
  hinzufügen oder entfernen – sonst bricht die Regel „gleiche Anzahl“. Pfeile und Text sind
  frei.
- Rückgängig arbeitet über alle Bilder (der Verlauf merkt sich die ganze Beschreibung).
- Vorlagen (`SKZ_VORLAGEN`) bleiben Ein-Bild-Vorlagen; „Passdreieck“ bekommt als einzige
  drei Bilder, damit man den Mechanismus in einer Vorlage sieht.
- `skzSpeichern` gilt eine Skizze als leer, wenn Bild 1 leer ist; Schritte ohne Bild 1 gibt
  es nicht.

### 2.5 Export

- „Skizze teilen“ teilt das **aktuelle** Bild; Dateiname `…-bild-2.png`.
- `doku/auftrag-lehrgangsskizzen/export-skizzen.js` bekommt eine Option `bilder:true`, die
  je Bild eine SVG und eine PNG mit Suffix `-bild-N` schreibt; die Legende wie heute.
- Keine Mehrbild-Datei (kein GIF, kein Video) – bewusst.

### 2.6 Inhalte

„Dreieckspassen mit Abschluss“ (v554) bekommt die vier Bilder aus `beispiel-schritte.json`.
**Achtung, bekannte Falle:** der Abgleich legt nur **neue Namen** an und ändert bestehende
Übungen nicht. Die Änderung muss also **direkt in der Datenbank** nachgezogen werden
(erlaubt seit 13.09.) – `update trainingsformen set skizze = … where name = …` – und in
`bibliothek.json` für Neuinstallationen, mit `stand` hochgesetzt. Beide Wege im Prüffall
belegen.

**Abnahmekriterien Scheibe 2**

1. Alle bestehenden Specs rendern zeichengleich (wie Scheibe 1, Abnahme 1).
2. `_skzBild(beispiel, 3)` enthält die Zone, das Tor und die Schusszone der Basis, die
   Spieler aus `schritte[2]`, keinen Pfeil aus einem anderen Bild.
3. Import: eine Beschreibung mit 7 Schritten, mit einem Schritt mit vier statt drei Spielern
   und mit `schritte` als Objekt statt Liste wird je mit einer Meldung abgewiesen, die Bild
   und Grund nennt; `beispiel-schritte.json` wird angenommen.
4. Editor: „+ Bild“ erzeugt Bild 2 mit denselben Spielern; Werkzeug „Tor“ ist in Bild 2
   `disabled`; Verschieben in Bild 2 ändert nur `schritte[0].s`, nicht `s` der Basis;
   Rückgängig nach dem Verschieben stellt Bild 2 wieder her.
5. Detail: bei einer Skizze ohne Schritte erscheinen keine Bildknöpfe; mit Schritten
   erscheinen so viele Knöpfe wie Bilder, jeder mindestens 44 px, der aktive mit
   `aria-pressed="true"`.
6. Kein Spielerkreis eines Bildes näher als 24 px am nächsten – geprüft über alle Bilder,
   Position und Bildnummer werden gemeldet.
7. Export: je Bild eine PNG 1120 × 864 mit Legende, die SVG enthält die `_skzBild`-Ausgabe.

**Testfälle:** `tests/checks/v5xx-skizze-schritte.js` mit den sieben Punkten; dazu
`v549-vorlagen-skizzen.js` unverändert grün (die Sperrklinke der 37 handgezeichneten bleibt).

---

## Scheibe 3 · Abspielen und Taktikboard

### 3.1 Abspielen in Skizze und Präsentationsmodus

Knopf „▶ Abspielen“ neben den Bildknöpfen (44 px, im Präsentationsmodus 56 px). Ablauf:
Bild n steht 600 ms, dann gleiten Spieler und Ball in 800 ms nach Bild n+1 (Ease-in-out),
die Pfeile von Bild n bleiben während des Gleitens sichtbar und wechseln erst mit dem
Ankommen; am letzten Bild bleibt es stehen, ein zweiter Tipp startet von vorn. Während
des Laufens heißt der Knopf „⏸ Anhalten“.

Umsetzung: `_skzZwischen(specA, specB, t)` liefert eine Beschreibung mit linear
interpolierten `s`- und `b`-Koordinaten (Farbe und Kürzel aus A), `p` und `tx` aus A;
`requestAnimationFrame` ruft `_skz` damit auf und ersetzt das SVG. Bei
`prefers-reduced-motion: reduce` wird nicht geglitten, sondern geschnitten (Bild für Bild,
1,4 s Stand). Kein Canvas, keine CSS-Animation auf SVG-Attributen, keine Bibliothek. Die
Funktionen liegen in `md-skizze.js` (Welle 2); das Detail ruft sie mit `typeof`-Schutz.

### 3.2 Taktikboard mit Bildern

Dasselbe Prinzip auf `tbField` und `tbBall`: „+ Bild“ friert die Positionen als Bild ein,
Bildknöpfe blättern, „Abspielen“ gleitet die Token per `transition` auf `left/top` (sie
sind bereits absolut in Prozent gesetzt). Gespeicherte Boards (`taktik_templates.data`)
tragen `schritte` im selben Muster; alte Einträge ohne Schritte laden unverändert.
Bildexport (`taktikShareBild`) exportiert das aktuelle Bild. Namen der Kinder bleiben, wie
heute, nur in der Trainer-App.

**Abnahmekriterien Scheibe 3**

1. `_skzZwischen(A, B, 0)` ist zeichengleich mit `_skzBild(A)`, bei `t = 1` stehen `s` und
   `b` auf den Werten von B; bei `t = 0.5` genau in der Mitte.
2. Abspielen einer Vier-Bild-Skizze endet nach höchstens 4,5 s auf Bild 4; der Knopf
   heißt währenddessen „Anhalten“ und danach wieder „Abspielen“.
3. Mit `prefers-reduced-motion: reduce` (Playwright `emulateMedia`) ändert sich zwischen zwei
   Frames nie eine Koordinate um weniger als den ganzen Weg – es wird geschnitten.
4. Taktikboard: nach „+ Bild“ und Verschieben eines Tokens hat Bild 1 die alte, Bild 2 die
   neue Position; Speichern und Laden über die Attrappe stellt beide her.
5. Ein Board ohne `schritte` lädt wie heute und zeigt keine Bildknöpfe.

**Testfälle:** `tests/checks/v5xx-skizze-abspielen.js` und `v5xx-taktik-bilder.js`.

---

---

## Scheibe 4 · Besetzung — die Kinder finden sich wieder

**Warum.** In der Skizze steht „S“ und „O“. Ein Achtjähriger erkennt darin nicht sich
selbst. Steht im Kreis „Mi“ für Mika und „Ma“ für Matteo — und am Tablet das Foto —, dann
ist es seine Aufgabe, nicht irgendeine. Am Handy ist ein Gesicht in einem 16-px-Kreis
Matsch; deshalb ist das Foto an die tatsächliche Anzeigebreite gebunden und nicht an eine
Einstellung.

### 4.1 Die Skizze bleibt neutral

Die Zuordnung Kreis → Kind ist eine **Ansicht**, keine Eigenschaft der Übung. Sie wird
**nie** in `trainingsformen.skizze` und **nie** in `uebungen/*.json` geschrieben. Drei
Gründe, jeder für sich ausreichend:

- Das Repo ist öffentlich. `CLAUDE.md`: keine Kindernamen, auch nicht in Beispieldaten.
- Eine Übung wird über Jahre benutzt, eine Mannschaft wechselt jedes Jahr.
- In den öffentlichen Ansichten sind Kindernamen maskiert. Was gar nicht erst in der
  Beschreibung steht, kann dort auch nicht durchrutschen.

Gearbeitet wird mit **Kinder-IDs**, nicht mit Namen — wie seit v451 überall am
Speicherrand. Der Name entsteht erst beim Zeichnen.

### 4.2 Woher die Besetzung kommt

- **Aus dem Trainingsplan des Tages.** Der Plan weiß für jede Phase bereits, welche
  Tagesgruppe auf welchem Feld steht (`slots[].gruppen[].kinder`). Knopf „Besetzung aus dem
  Plan“ nimmt genau diese Kinder, in der Reihenfolge der Kreise gleicher Farbe. Das ist der
  eigentliche Gewinn: es muss nichts eingetippt werden.
- **Von Hand.** Tipp auf einen Kreis öffnet die Liste der Kinder mit Zusage am Termin;
  Tipp auf „—“ macht den Kreis wieder neutral. Ein Kreis ohne Kind behält sein Kürzel aus
  der Beschreibung.
- Gegnerkreise bleiben in der Regel neutral; besetzbar sind sie, wenn zwei Tagesgruppen
  gegeneinander spielen.
- Die Besetzung ist **flüchtig** — sie lebt, solange die Ansicht offen ist. Nichts wird
  zusätzlich gespeichert; die Quelle ist der Plan, und der wird ohnehin geführt.

### 4.3 Kürzel

Zwei bis drei Zeichen, berechnet über den **ganzen aktiven Kader**, nicht über die eine
Skizze — sonst hieße ein Kind mal „Mi“ und mal „Mik“, je nachdem, wer sonst noch im Bild
steht. Ein Kind soll immer dasselbe Kürzel haben.

1. Die ersten zwei Buchstaben des Vornamens: Mika → `Mi`, Matteo → `Ma`.
2. Kollision → so viele Buchstaben, bis eindeutig, höchstens drei: Mika/Mia → `Mik`/`Mia`.
3. Immer noch gleich → der erste Buchstabe des zweiten Namensteils als drittes Zeichen;
   fehlt er, die Rückennummer: `Mi7`.

Drei Zeichen sind die Obergrenze, und das ist kein Zufall: `_skz` zeichnet `s[3]` mit 8 px
in einen Kreis mit 8 px Radius, und der Tipp-Editor schneidet schon heute auf drei Zeichen.
**Für die Kürzel ändert sich am Renderer also nichts** — es wird nur ein anderes Label
übergeben.

### 4.4 Foto

- Nur mit **Einwilligungsstufe 1** („App-intern“, `FOTO_STUFEN[0]`) für dieses Kind —
  dieselbe Freigabe, auf der Galerie, Sammelkarte und Kabine stehen. Ohne Freigabe das
  Kürzel, ohne Lücke und **ohne Hinweis auf das fehlende Foto**: in einem Bild, das die
  ganze Gruppe sieht, soll kein Kind bemerken, dass bei ihm etwas fehlt.
- Nur ab **600 px** gemessener Anzeigebreite der Skizze. Darunter bleibt es beim Kürzel.
- Geladen über `fotoLoadImage(path)` — dieselbe Funktion wie in der Kabine, kein zweiter
  Weg zum Speicher.
- Gezeichnet als `<image>` in einem `<clipPath>`-Kreis, darüber die vorhandene Kreiskontur
  in der Mannschaftsfarbe mit Strichstärke 2,5 statt 1,5, darunter ein Namensschild mit dem
  Kürzel (7 px). Damit bleibt die Mannschaftszugehörigkeit erkennbar, ohne dass Farbe der
  einzige Träger wäre.

### 4.5 Export und Teilen

„Skizze teilen“ liefert im Besetzungsmodus **immer die neutrale Fassung** — keine Namen,
keine Gesichter —, und sagt das in einem Toast. Zwei Gründe, ein fachlicher und ein
technischer:

- Ein PNG verlässt die App und landet in einer Nachricht. Gesichter und Namen von Kindern
  gehören dort nicht hin.
- Ein Bild aus dem Speicher färbt die Zeichenfläche ein; `toBlob` bräche dann mit einem
  Sicherheitsfehler ab. Die neutrale Fassung ist damit zugleich die einzige, die
  zuverlässig funktioniert.

### 4.6 Wo der Modus gilt

| Ort | Besetzung |
|---|---|
| Trainer-App: Übungsdetail, Präsentationsmodus, Trainingsplan | ja, mit Foto ab 600 px |
| Kabine (Kinder) | nur lesend, nur die Besetzung des Tages; Bewertungen bleiben unsichtbar |
| Eltern-Bereich | nein |
| Öffentliche Ansichten (`?ticker`, `?heft`, `?turnier`, Gast-Link) | **hart aus** |

### Abnahmekriterien Scheibe 4

1. `_skz` ohne Besetzung rendert zeichengleich zu heute.
2. Kürzel sind über den ganzen Kader eindeutig; zwei Kinder mit gleichem Vornamen bekommen
   verschiedene; ein Kürzel ändert sich nicht, wenn ein Kind ohne Kollision dazukommt.
3. Foto erscheint nur mit Stufe 1 **und** ab 600 px; ohne Freigabe steht das Kürzel und
   kein Platzhalter.
4. „Skizze teilen“ liefert die neutrale Fassung: im erzeugten PNG steht kein Kindername.
5. In `?ticker`, `?heft`, `?turnier` und auf der Gast-Seite kommt keine Besetzung an — auch
   dann nicht, wenn sie in der Trainer-App vorher aktiv war.
6. Nach dem Schließen ist die Beschreibung der Übung unverändert: kein Name in
   `trainingsformen.skizze`, kein `PATCH` auf die Übung, kein Eintrag in `uebungen/*.json`.
7. Kontrast: Kürzel auf der Kreisfüllung mindestens 4,5:1 in beiden Rasenvarianten, der
   Ring mindestens 3:1.
8. „Besetzung aus dem Plan“ setzt genau die Kinder der Tagesgruppe dieser Phase, in der
   Reihenfolge der Kreise gleicher Farbe.

**Testfälle:** `tests/checks/v5xx-skizze-besetzung.js`. Das Prüfwerkzeug kennt nur „Kind A“
bis „Kind O“ — ein guter Fall für die Kollisionsregel: alle fünfzehn beginnen mit `Ki`,
müssen also über die dritte Stufe auseinandergehen (`KiA`, `KiB`, …).

## Pflichten (aus `CLAUDE.md`)

- `node --check` über alle Dateien; `node tests/run.js` grün; **dann** `sw.js` hochzählen,
  je Scheibe einmal. Übersicht (`doku/Uebersicht_Funktionen-Adler-App_v1.md`) je Scheibe
  mitziehen: Zeilen Skizzen-Editor, Übungsdatenbank, Taktikboard.
- Keine neue Datei im Ladeweg: alles in `data.js` (Renderer, Welle 1) und `md-skizze.js`,
  `md-taktikboard.js`, `md-taktik-bib.js` (Welle 2). Welle-1-Code ruft Welle-2-Funktionen
  nur mit `typeof`-Schutz. Ein globaler Name nie in beiden Wellen.
- `uebungen/*.json` bleiben in der Ausnahmeliste des `fetch`-Handlers, nicht im Precache.
- Keine neue Tabelle, also keine Änderung an der Backup-Funktion.
- Hilfe und Rundgang: Abschnitt Skizze um „Groß zeigen“, Bilder und Abspielen ergänzen;
  Abschnitt Taktikboard um Bilder.
- Dialoge mit `role="dialog" aria-modal="true"` und Fokus-Trap; Aktions-Knöpfe 44 px,
  Hauptaktion 56 px; Farbe nie der einzige Bedeutungsträger (Bildnummern als Zahl); Kontrast
  4,5:1 Text, 3:1 Grafik, auch im dunklen Modus.
- Typografische Anführungszeichen in allen deutschen Strings.
- Keine Kindernamen in `uebungen/`, in Prüffällen und in Beispielen.
- Nach jeder Scheibe: `Projektgedaechtnis/stand.md` und `entscheidungen.md` im privaten
  Repo nachziehen; Google Drive von Hand.

## Ausdrücklich nicht in diesem Paket

3D-Ansicht, freie Zeitachse mit Keyframes, gebogene Pfeile, Video- oder GIF-Export,
Maßstab in Metern, Kindernamen oder Fotos in der gespeicherten Beschreibung, Fotos im
Bildexport, Nachzeichnen der 37 handgezeichneten Altskizzen (läuft über die
Sperrklinke weiter), Übernahme von Philippka-Figuren (Kreise mit Kürzel bleiben – sie sind
am Handy lesbar und tragen keine Kindernamen).

## Entscheidungen (Charles, 15.09.2026)

1. **Helle Variante nur als Umschalter** im Präsentationsmodus, Standard bleibt dunkel.
   Detail, Editor und Export bleiben wie heute; die Lehrgangsabgaben ändern sich nicht.
2. **Taktikboard wird in Scheibe 3 mitgezogen** – dieselben Bilder, dasselbe Abspielen,
   gespeicherte Boards tragen die Schritte mit.
3. **Wischen plus Knöpfe** im Präsentationsmodus zum Bildwechsel; Knöpfe bleiben als
   zweiter Weg und für die Tastatur.
4. **Besetzung mit Kürzeln und Fotos** kommt dazu (Scheibe 4, 15.09.): Kinder sollen sich
   in der Skizze wiederfinden. Die Skizze selbst bleibt neutral, das Foto nur mit
   Einwilligungsstufe 1 und nur ab 600 px, der Bildexport immer ohne Namen und Gesichter.

## Anhang

- `beispiel-schritte.json` – „Dreieckspassen mit Abschluss“ mit vier Bildern, Schema aus 2.1
- `vorschau.html` – Sollbild der vier Bilder mit dem heutigen Renderer
- `sollbild.png` – Aufnahme der Vorschau (1240 px breit)
