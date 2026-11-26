# Auftrag: Skill des Monats – Abnahme durch den Trainer (v980)

**Stand:** 26.11.2026 · **Beschluss:** Den Skill des Monats gibt immer ein Trainer frei, beim Training. Eltern geben ihn nie frei.

## Ausgangslage (geprüft)

Seit v963 kann ein Skill des Monats (`skill_woche`) mit einem Technik-Abzeichen verknüpft sein (`skill_woche.abzeichen`).
Bis v979 lief die Freigabe wie bei allen Abzeichen für zu Hause: Das Kind meldet „🙋 Ich hab's geschafft!“ (`abzeichen_meldung`),
die Eltern geben es in „📌 Für euch“ frei („Ja, geschafft“). Die Freigabe vergab das Abzeichen (Quelle `abzeichen` 10 bzw.
`abzeichen_silber` 20 Federn) und zusätzlich 50 Federn (Quelle `skillwoche`, `quelle_id` = Skill).

## Umsetzung

1. **Kind:** Beim Skill des Monats heißt der Knopf „🙋 Ich kann's – beim Training zeigen“, danach „⏳ Zeig es deinem Trainer beim nächsten Training.“
   Andere Abzeichen melden weiter „Ich hab's geschafft!“ an die Eltern.
2. **Eltern:** Die Meldung zum Skill des Monats steht in „📌 Für euch“ ohne Knopf („… möchte es beim nächsten Training zeigen“).
   Im Abzeichendetail gibt es kein Abhaken; die Skill-Karte nennt den Trainer. Alle übrigen Abzeichen geben weiter die Eltern frei.
3. **Trainer:** In der Anwesenheit eines Trainings (Datum heute oder früher) steht unter der Liste „⭐ Skill des Monats abnehmen“
   mit den anwesenden Kindern, gemeldete zuerst, schon abgenommene mit ✓. Erster Tipp fragt („nochmal tippen = abgenommen“),
   der zweite vergibt das Abzeichen und die 50 Skill-Federn – dieselbe Summe wie früher bei der Freigabe.
   Abhaken im Abzeichendetail bleibt für Trainer möglich.
4. **Eltern-Startkarte** (im selben Paket): Becher-Hinweis und „Für den nächsten Tee“ stehen jetzt auch in „Nächster Termin“,
   als eine Zeile zum Aufklappen.

## Nicht Teil des Auftrags

- Skill ohne verknüpftes Abzeichen: weiter Elternbestätigung (50 Federn) – offen für eine eigene Version.
- Server-seitige Sperre: `xp_award_event` erlaubt Eltern weiterhin die Quellen; die Sperre liegt in der Oberfläche.

## Prüfung

`tests/checks/v980-skill-abnahme-tee-karte.js` (Gegenprobe gegen main rot), angepasst: v926 (Tee-Zeile zum Aufklappen), v963 d (keine Elternfreigabe mehr).
