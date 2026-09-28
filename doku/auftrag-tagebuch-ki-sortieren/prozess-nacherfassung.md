# Teil 2: Der ganze Weg der Nacherfassung — ein Mal sprechen, alles andere im Hintergrund

Stand 28.09.2026, Ergänzung zum Auftrag in diesem Ordner. Gilt für jeden Trainer, nicht nur
für Charles.

## Ziel in einem Satz

Nach einem Training oder Spieltag hinterlässt ein Trainer sein Feedback **einmal, gesprochen,
in unter einer Minute**. Alles Weitere — Bewertung, Tagebuch-Vorschlag, To-dos — entsteht
daraus im Hintergrund. Nichts wird zweimal eingegeben, und jeder Klick, der nicht nötig ist,
fällt weg.

## Schritt 1: Ist-Aufnahme, bevor gebaut wird

Nimm den heutigen Weg auf und leg ihn mir vor, bevor du etwas änderst:

- Wie kommt ein Trainer nach einem Termin zur Nachbereitung? Von wo aus, mit wie vielen Tipps?
- Welche Fenster durchläuft er für Bewertung, Sprachnotiz, Tagebuch — und in welcher
  Reihenfolge?
- Wo gibt er **dasselbe zweimal** ein oder startet denselben Inhalt zweimal? Konkreter
  Verdacht: `ki-nachbereitung` kennt `art = "tagebuch"`, um einen Tagebucheintrag später aus
  einer gespeicherten Sprachnotiz zu erzeugen. Wenn das ein zweiter Durchgang für denselben
  Termin ist, ist es genau die Doppelung, die weg soll.
- Wie viele Tipps von „Termin vorbei" bis „alles gespeichert"? Je Fall zählen: Training,
  Spieltag, Festival.
- Was passiert, wenn zwei Trainer denselben Termin nachbereiten?

Ergebnis als kurze Liste mit Tippzahl je Schritt. Dann erst Umbau.

## Schritt 2: Der Soll-Weg

**Einstieg.** Nach Ende eines Termins, an dem der Trainer eingeteilt war, erscheint eine
Karte oder Benachrichtigung „Wie war's?" mit **einem großen Mikrofon-Knopf** (56 px, einzige
Hauptaktion). Tipp auf die Benachrichtigung öffnet direkt die Aufnahme, nicht erst eine Liste.

**Sprechen.** Einmal sprechen, so lang wie nötig. Kein Formular vorher, keine Pflichtfelder,
keine Auswahl von Bausteinen, Übungen oder Kindern — das ordnet die Auswertung zu. Wer lieber
tippt, bekommt dasselbe als ein Textfeld.

**Im Hintergrund, aus derselben einen Notiz, in einem Durchgang:**

1. Bewertung der Einheit oder des Spieltags (wie heute).
2. Tagebuch-Vorschlag nach dem Hauptauftrag: sortiert, nicht geschrieben.
3. **To-dos**: alles, was der Trainer als zu tun angekündigt hat — Konsequenzen fürs Training,
   aber auch Organisatorisches („Hütchen reichen nicht", „mit dem Trainer der U8 die
   Platzübergabe klären"). Je To-do ein Vorschlag für die Zuständigkeit aus den Rollen im
   Trainerstab (Material und Organisation → Organisation, Torwart → Skill Development Coach),
   nie automatisch zugewiesen.

Kein zweiter Aufruf für den Tagebuch-Teil. Kein nachträgliches „Tagebuch aus Notiz erzeugen".

**Prüfen, ein Bildschirm.** Danach **eine** Karte mit allem zusammen: Bewertung, Tagebuch,
To-dos. Rückfragen der KI (höchstens zwei) als Tipp-Chips oder Mikrofon direkt darunter. Datum
für Konsequenzen und To-dos per Tipp auf die nächsten eigenen Termine. Ganz unten **ein**
Knopf „Passt so", der alles auf einmal bestätigt. Einzelne Felder lassen sich antippen und
ändern; wer nichts ändert, braucht keinen weiteren Tipp.

**Später erledigen.** Wer keine Zeit hat, schließt die Karte. Die Notiz ist gespeichert, der
Vorschlag wartet; die Karte „Wie war's?" wird zu „Noch zu bestätigen". Keine Erinnerung öfter
als einmal am Folgetag.

**Tippbudget:** höchstens **drei Tipps** von der Benachrichtigung bis „gespeichert" —
öffnen, Aufnahme beenden, „Passt so". Alles darüber braucht eine Begründung im PR.

## Mehrere Trainer, ein Termin

- Jeder spricht seine eigene Notiz; nichts wird überschrieben.
- Die **Bewertung** des Termins führt die Notizen zusammen: Werte, die mehrere nennen, werden
  gemittelt oder als Spanne gezeigt — Claude Code schlägt vor, welches, und sagt es vorher.
- Das **Tagebuch** bleibt persönlich: ein Vorschlag je Autor, nur in dessen Tagebuch.
- **To-dos** werden gegen bestehende offene To-dos abgeglichen. Ist dasselbe schon offen
  („Hütchen nachkaufen"), wird kein zweites angelegt, sondern das bestehende ergänzt.

## To-dos: wo sie leben

Prüfe, ob die App schon eine Aufgabenliste führt. Wenn ja, dort hinein. Wenn nein, sind
To-dos Teil der Wiedervorlage aus dem Auftrag „Tagebuch als Arbeitsmittel": ein offener Punkt
mit Datum, Zuständigkeit und Herkunft (Termin und Notiz). Keine zweite Liste neben der
Wiedervorlage.

Abgehakt wird ausdrücklich, nie durch Zeitablauf.

## Oberfläche

Nach Skill `cockpit-ui`: Hauptaktion 56 px, Bedienelemente mindestens 48 px, genau eine
Hauptaktion je Bildschirm, bedienbar mit einer Hand am Spielfeldrand. Keine Auswahllisten, wo
ein Knopf reicht. Keine Bestätigungsdialoge für Dinge, die sich rückgängig machen lassen.

## Abnahmekriterien

1. Ist-Aufnahme mit Tippzahlen liegt vor, bevor Code geändert wird.
2. Von der Benachrichtigung bis „gespeichert": höchstens drei Tipps, wenn der Vorschlag passt.
3. Aus einer Notiz entstehen Bewertung, Tagebuch-Vorschlag und To-dos in **einem**
   KI-Aufruf; es gibt keinen zweiten Weg, denselben Termin erneut in ein Tagebuch zu schicken.
4. Keine Eingabe wird an zwei Stellen verlangt.
5. Ein To-do, das schon offen ist, wird nicht doppelt angelegt.
6. Zwei Trainer, ein Termin: beide Notizen erhalten, Bewertung zusammengeführt, je ein
   persönlicher Tagebuch-Vorschlag.
7. Abbrechen verliert nichts; die Karte wartet als „Noch zu bestätigen".
8. Tageslimit der KI (`ki_usage`) zählt einen Termin als **einen** Aufruf.
9. RLS für jede neue Tabelle oder Spalte, keine Klarnamen außerhalb der App, `cockpit-ui`
   eingehalten, `node tests/run.js` grün, `sw.js` hochgezählt.

## Was nicht gebaut wird

- Kein Formular vor der Aufnahme.
- Keine automatische Zuweisung von To-dos an Personen.
- Keine KI, die Aha oder Erkenntnisse formuliert (siehe Hauptauftrag).
- Keine zweite Aufgabenliste neben der Wiedervorlage.
