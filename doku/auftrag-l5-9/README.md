# Auftrag: Vorlage L5-9 und neue Übung "Zwei-Seiten-Spiel" in die Bibliothek

Lege dieses Auftragspaket unter `doku/auftrag-l5-9/` ab und committe es. Dann setze es um.

## Ziel
Eine neue Konzept-Einheit L5-9 (Leitfrage 5) aus zwei Formen: Joker-Duell (gibt es schon in der Bibliothek) und Zwei-Seiten-Spiel in einer U9-Fassung (neu). Inhalt und Aufbau stehen in den beiden JSON-Blöcken unten.

## Betroffene Dateien
- `uebungen/bibliothek.json`: neue Übung aufnehmen (Block 1).
- `uebungen/vorlagen.json`: neue Vorlage aufnehmen (Block 2), `stand` hochzählen.
- `tests/checks/`: neuer Prüffall.
- `sw.js`, Funktionsübersicht, Hilfe.

## Block 1: Übung (adler-uebungen/1)
```json
{
  "schema": "adler-uebungen/1",
  "uebungen": [{
    "name": "Zwei-Seiten-Spiel – Platz suchen, Seite wechseln",
    "kat": "passspiel",
    "kurz": "3 gegen 3 oder 4 gegen 4 auf vier Minitore: In Stufe 2 zählt ein Tor erst nach einem Pass auf die andere Seite des Feldes.",
    "spieler": "6-8",
    "feld": "3 gegen 3: 20 x 24 m, 4 gegen 4: 30 x 22 m, vier Minitore, Längslinie nur in Stufe 2",
    "dauer": "17",
    "ablauf": "AUFBAU: Feld mit vier Eckhütchen. An jeder Grundlinie zwei Minitore im Abstand von ca. 12 m, also je eins pro Seite. Zwei Teams zu 3 oder zu 4 Kindern in Leibchen, kein Torwart. Jedes Team verteidigt die zwei Tore an der eigenen Grundlinie und greift die zwei gegenüber an. Die Längslinie aus sechs Hütchen legen die Kinder zu Beginn von Stufe 2 in die Feldmitte und sammeln sie vor Stufe 3 wieder ein. Die Bälle liegen beim Trainer am Rand.\n\nBALLVERSORGUNG: Geht der Ball ins Aus, bringt der Trainer sofort einen neuen. Nach einem Tor startet das andere Team mit Anspiel von der eigenen Grundlinie.\n\nSTUFE 1 – FREI (5 Min): Keine Linie, keine Zusatzregel. Jedes Tor zählt einen Punkt, alle dürfen sich im ganzen Feld bewegen. Der Trainer lobt und ermutigt, er fragt nichts.\n\nSTUFE 2 – ENG (8 Min): Zwei Runden. Die Längslinie liegt in der Mitte und teilt das Feld in zwei Seiten, sie ist nur Markierung, alle dürfen überall hin. Ein Tor zählt nur, wenn der Ball in diesem Ballbesitz mindestens einmal auf die andere Seite gekommen ist. Tor nach Seitenwechsel = ein Punkt. Tor ohne Seitenwechsel zählt nicht, das andere Team bekommt Anspiel. Runde A (4 Min): Der Seitenwechsel gilt per Pass oder per Dribbling über die Linie. Runde B (4 Min): Der Seitenwechsel gilt nur per Pass. Der Trainer steht an der Längslinie außen, sieht beide Seiten und beurteilt, ob der Seitenwechsel gültig war. Er friert ein und fragt.\n\nSTUFE 3 – OFFEN (4 Min, einschließlich Wechsel): Die Hütchen der Längslinie werden eingesammelt (die Kinder erledigen das). Keine Zusatzregel, jedes Tor zählt einen Punkt. Der Trainer beobachtet und lobt.\n\nSKALIERUNG: 6 Kinder = 3 gegen 3 auf 20 x 24 m; 7 Kinder = 3 gegen 3, ein Kind wechselt nach jedem Tor ein; 8 Kinder = 4 gegen 4 auf 30 x 22 m, wenn der ganze Käfig frei ist, sonst auf 20 x 24 m.\n\nTypische Fehlerbilder: Alle laufen zum Ball. Der ballferne Spieler rückt zum Ball, statt breit zu bleiben. Der Ball wird mit dem Rücken zur freien Seite angenommen. Der Seitenwechsel ist zu langsam, der Gegner verschiebt rechtzeitig. Ein Tor wird gefeiert, obwohl der Ball die Seite nicht gewechselt hat.",
    "varianten": "Leichter (Regeln): Der Seitenwechsel gilt auch per Dribbling über die Linie, auch in Runde B. Schwerer (Wettbewerb): Ein Tor nach zwei Seitenwechseln zählt doppelt. Schwerer (Regeln): Der Seitenwechsel gilt nur per Direktpass.",
    "coaching": "Ziel ist die Verbesserung der Spielverlagerung.\nStufe 1 (nur loben): Gut, du hast dich zur freien Seite angeboten.\nStufe 2 (als Frage): Wo ist gerade viel Platz?\nStufe 2 (als Frage): Wer kann sich jetzt anbieten, bevor der Ball kommt?",
    "diff": 2,
    "skizze": {
      "z": [[30,20,220,140]],
      "tor": [[75,13,"h",20],[185,13,"h",20],[75,160,"h",20],[185,160,"h",20]],
      "h": [[140,34,"y"],[140,58,"y"],[140,82,"y"],[140,106,"y"],[140,130,"y"],[140,150,"y"]],
      "ger": [[262,90,"trainer","w"]],
      "s": [[80,125,"g","A"],[110,80,"g","B"],[205,105,"g","C"],[95,100,"r","X"],[60,70,"r","Y"],[170,60,"r","Z"]],
      "b": [[88,133]],
      "p": [[102,126,188,110,"p",1],[205,80,197,34,"s",2]],
      "tx": [[140,176,"Tor erst nach Seitenwechsel über die Linie"]]
    }
  }]
}
```

Zur Skizze: Grün A spielt den Seitenwechsel-Pass (1) über die Längslinie zu Grün C, der frei auf der anderen Seite steht. C schießt (2) aufs rechte obere Minitor. Rot X, Y, Z stehen mindestens 25 Punkte von jedem anderen Spieler entfernt.

## Block 2: Vorlage (adler-vorlagen/1)
```json
{
  "schema": "adler-vorlagen/1",
  "vorlagen": [{
    "name": "L5-9 Anbieten und Verlagern – Joker-Duell und Zwei-Seiten-Spiel",
    "leitfrage": "Wo stehe ich, wenn wir den Ball haben – und wo, wenn nicht?",
    "ziel_kinder": "Heute schaust du, bevor der Ball kommt, bietest dich an und suchst die Seite, auf der viel Platz ist.",
    "folge_nr": 9,
    "tags": [],
    "dauer_min": 75,
    "netto_spielform_min": 34,
    "skalierung": {
      "6": "Nacheinander, alle zusammen: Hauptteil 1 Joker-Duell mit zwei Bahnen, ein Kind holt Bälle und rückt ein; Hauptteil 2 Zwei-Seiten-Spiel 3 gegen 3 auf 20 x 24 m",
      "8": "Nacheinander, alle zusammen: Hauptteil 1 Joker-Duell mit zwei Bahnen und je eigenem Joker (4 Kinder je Bahn); Hauptteil 2 Zwei-Seiten-Spiel 4 gegen 4 auf 30 x 22 m",
      "10": "2 Stationen: Joker-Duell mit einer Bahn (4 Kinder: Joker, zwei Angreifer im Wechsel, ein Verteidiger) und Zwei-Seiten-Spiel 3 gegen 3 (6 Kinder), Gruppen wechseln nach 17 Min",
      "12": "2 Stationen: Joker-Duell mit zwei Bahnen (6 Kinder, der sechste holt Bälle und rückt ein) und Zwei-Seiten-Spiel 3 gegen 3 (6 Kinder), Gruppen wechseln nach 17 Min",
      "14": "2 Stationen: Joker-Duell mit zwei Bahnen (7 Kinder, zwei holen Bälle und rücken ein) und Zwei-Seiten-Spiel 3 gegen 3 mit einem Wechsler (7 Kinder), Gruppen wechseln nach 17 Min",
      "16": "2 Stationen: Joker-Duell mit zwei Bahnen und je eigenem Joker (8 Kinder) und Zwei-Seiten-Spiel 4 gegen 4 auf 20 x 24 m (8 Kinder), Gruppen wechseln nach 17 Min"
    },
    "beobachtung": "Wer hat sich wie ein Flitzer vom Verteidiger gelöst, bevor der Ball kam – und wer hat als Aufpasser den Ball auf die freie Seite verteilt, wo schon ein Flitzer wartete?",
    "bloecke": [
      {"typ":"warmup","label":"Straßenfußball-Fenster","dauer":10},
      {"typ":"warmup","label":"Warm up Adler, kurz","dauer":8,"uebung_name":"Warm up Adler"},
      {"typ":"spielform","label":"Hauptteil 1 – Stationen: Joker-Duell (frei, eng, offen) | Zwei-Seiten-Spiel (frei, eng, offen)","dauer":17,"stationen":[{"uebung_name":"Joker-Duell – anbieten und freilaufen"},{"uebung_name":"Zwei-Seiten-Spiel – Platz suchen, Seite wechseln"}]},
      {"typ":"spielform","label":"Hauptteil 2 – Gruppen wechseln die Station: Regeln wie in Hauptteil 1","dauer":17,"stationen":[{"uebung_name":"Joker-Duell – anbieten und freilaufen"},{"uebung_name":"Zwei-Seiten-Spiel – Platz suchen, Seite wechseln"}]},
      {"typ":"abschluss","label":"Abschlussturnier – wer sucht die freie Seite, bevor der Ball kommt?","dauer":18}
    ],
    "ordnung": "1 gegen 1"
  }]
}
```

## Gewünschtes Verhalten
- Die Übung heißt ohne "Lehrgang" im Namen, sie ist für die U9 gedacht (Kategorie passspiel, 6 bis 8 Kinder). Die Lehrgangsfassung "Lehrgang – Zwei-Seiten-Spiel" bleibt unverändert daneben stehen.
- L5-9 erscheint in der Vorlagenliste unter Leitfrage 5, mit Skalierungszeilen für 6, 8, 10, 12, 14 und 16 Kinder.
- Hauptteil 1 und 2 sind Stationsblöcke wie bei L5-8. Bei 6 und 8 Kindern laufen die Formen nacheinander, das steht nur in der Skalierungszeile, nicht in der Blockstruktur.
- Das Abschlussturnier folgt der bestehenden Logik aus v810, nichts ändern.

## Abnahmekriterien
1. `_euPruefung` und `_eiSkizzeFehler` laufen vorher über die Übung. Sag mir, was beanstandet wird, bevor du schreibst.
2. Die Skizze steht quer. Engster Spielerabstand 25, vier Minitore, sechs Hütchen, ein Trainer, ein Ball. Die Materialliste der Übung muss "4 Minitore · 6 Hütchen · 1 Ball" ergeben.
3. Der Name der neuen Übung ist eindeutig, der Name der Vorlage ebenso. Die Stationen verweisen auf bestehende Namen: "Joker-Duell – anbieten und freilaufen" und die neue Übung.
4. Kein Kindername, kein Klarname im Repo.
5. `node tests/run.js` grün, dann `sw.js` hochzählen, Funktionsübersicht und Hilfe nachziehen.
6. PR als Entwurf. Zusammengeführt wird auf mein Wort.

## Testfälle
- Vorlage L5-9 öffnen: Skalierung 6, 8, 10, 12, 14, 16 zeigt jeweils den passenden Text.
- Trainingsplan aus L5-9 anlegen: Blöcke 10 + 8 + 17 + 17 + 18 = 70 Min., dazu 5 Min. Abbauen laut App-Logik ergibt 75.
- Übung im Katalog finden und die Skizze im Vollbild ansehen.
- Zweiter Import derselben Dateien ändert nichts (Namen werden übersprungen, nie überschrieben).

## Offen, bitte selbst entscheiden und mir sagen
- `ordnung` steht hier auf "1 gegen 1" wie bei L5-8. Wenn das Feld eine feste Auswahl hat, nimm den passenden Wert.
- `folge_nr` 9 ist der nächste freie Wert bei Leitfrage 5. Prüfe das gegen die Liste.
- `tags` ist leer, weil beide Felder zusammen den ganzen Käfig brauchen. Wenn die App für "halle" oder "wenig-platz" eine feste Regel hat, sag mir, was gilt.
- `diff` der Übung steht auf 2. Vergleiche mit dem Bestand.
- `netto_spielform_min` steht auf 34, das sind die beiden Hauptteile. Wenn L5-8 anders rechnet, gleiche an.

## Nicht Teil des Auftrags
Kein Schreiben ins Google Drive, das macht der Projekt-Chat. Am Ende bitte vermerken, dass Drive nachzuziehen ist.
