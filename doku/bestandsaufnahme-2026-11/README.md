# Bestandsaufnahme November 2026 – Arbeitsliste

Auftrag Charles, 17.11.2026: umfangreiche Überarbeitung von Trainer- und Eltern-App mit Schwerpunkt
Usability, Logik, Struktur und fachlicher Sinn der Trainingseinheiten. Maßstab: „Ein Trainer muss
einfach und schnell ans Ergebnis kommen.“

Grundlage sind drei Code-Prüfungen (Trainer-Abläufe, Eltern- und Kinder-App, Trainingsinhalte) und ein
Durchgang durch alle Hauptbildschirme im Browser, Stand v833. Die Befunde sind am Code belegt, aber
nicht alle am Gerät nachgestellt – **vor jeder Umsetzung wird der Befund nachgeprüft**. Reihenfolge der
Pakete laut Charles: 1 zuerst.

Status: ✅ erledigt · 🔶 braucht Charles' Wort (kehrt eine frühere Entscheidung um) · ⬜ offen

## Paket 1 · Planungslogik („Training füllen“, Gruppen)

| # | Befund | Status |
|---|---|---|
| 1.1 | Vorlage mit drei Stufen und zwei Trainern: Feld 2 bekam eine fremde Übung, keine Gruppe erlebte frei → eng → offen (`boot.js` `tpGenerate`, seit v713) | ✅ v834 |
| 1.2 | Jeder Hauptteil bekam automatisch eine Zusatzregel, auch „frei“ und Vorlagen-Blöcke | ✅ v834: höchstens eine je Einheit, zweiter Hauptteil, nie in Vorlagen |
| 1.3 | Ein Trainer, leerer Plan: vier verschiedene Übungen zu je zehn Minuten | ✅ v834: eine Spielform in drei Stufen |
| 1.4 | Leerer Plan wich vom 75-Minuten-Rahmen des Konzepts ab (kein Straßenfußball-Fenster) | ✅ v834: 10/8/34/18 beim Füllen |
| 1.5 | „Lehrgang – Zwei-Seiten-Spiel“ rutschte durch den Erwachsenen-Filter | ✅ v834 |
| 1.6 | Wenige Kinder: die Trainerzahl schlägt die Kinderzahl (sechs Kinder, zwei Trainer → zwei Dreiergruppen ohne Spielform; `tgBedarf`) | ✅ v835 (Charles 17.11.: unter acht Kindern eine Gruppe) |
| 1.7 | Übungswahl kennt weder Dauer noch Betreuung noch Tore; Thema folgt der Kategorie von Feld 1 statt der Leitfrage (`tpStationWahl`) | ✅ v864 (Charles 18.11.): Fokus zuerst, Abzüge für zu lange Übungen und fehlende Betreuung; Tore/Material stehen nur im Freitext – offen |
| 1.8 | Ein Trainer mit zehn und mehr Kindern: die gewählte Spielform ist oft zu klein; besser zwei Felder mit derselben Form | ✅ v864 (Charles 18.11.): ein Trainer ab 10 Kindern zwei Felder, dieselbe Form; hebt v656 nur für diesen Fall auf |
| 1.9 | Einzel-Hauptteil ohne Stufen (Technik-Parcours) bekam bei zwei Trainern eine fremde Übung auf Feld 2 | ✅ v834 |
| 1.10 | `trainerIstFeldtrainer` wird nirgends aufgerufen – Trainer mit Rolle „organisation“ zählt als Station | ✅ nachgeprüft 18.11.: seit v536 nicht vorbelegt, kein Feld (Prüffall v536); nur die Hilfsfunktion ist ungenutzt → toter Code |
| 1.11 | Torwart: L3-1 hängt den Torwart-Block an Stufe 1; Gruppenbildung verteilt nach Torwart-Haken statt Rotation | teils ✅ v864: Torwart-Block der Vorlage parallel zum letzten Hauptteil davor, Tausch auf gleicher Position; ✅ v865 Rotation „zuletzt im Tor“ (Spieltag-Aufstellungen) |
| 1.12 | Vorlagen der Typen L4-2/L4-5: `vuAbschlussturnierSichern` schneidet ein zweites Turnier ab | ✅ v863: L4-5 bekommt kein zweites Turnier mehr; L4-2 bleibt Lehrgangsform 15:30:15:30 (Charles 18.11.) |

## Paket 2 · Trainer am Platz

| # | Befund | Status |
|---|---|---|
| 2.1 | Live-Ansicht „Trainingsstart“ zeigt weder Skizze noch Ablauf (`_tlRender`) | ✅ v835 |
| 2.2 | Knopf „Matchday“ führt vor dem Spiel in „Nach dem Spiel“ (`views.js` `tmJump('blitz')`) | ✅ v835 „Zum Spieltag“ |
| 2.3 | Vorlage übernehmen: Vorschau und Hauptknopf stehen unter der ganzen Liste | ✅ v835 |
| 2.4 | Trainingsplan ist dreieinhalb Handy-Höhen lang; Planen und Durchführen auf einer Seite, Startknopf ganz unten | ✅ seit v797 klebt „Trainingsstart“ über der Navigation; seit v857 klappen gefüllte Blöcke auf eine Zeile ein (Charles 18.11.) |
| 2.5 | Speichern verhält sich je Seite anders (automatisch, Knopf, beides) | ✅ Plan zeigt den Stand seit v797, Anwesenheit seit v845, Aufstellungsseite seit v856 |
| 2.6 | Teams: Zwischenschritt „In die Nominierungen übertragen“ mit Systemdialog | ✅ v836 „Teams übernehmen“, eigenes Fenster; ✅ v856 Stand „übernommen / noch nicht übernommen“ über dem Knopf |
| 2.7 | Zwei Aufstellungen in zwei Tabellen, die nichts voneinander wissen | ✅ v858 ein Ort: das Mini-Feld; Rollen-Matrix zählt die Startaufstellung beim Anpfiff; „fair besetzen“ ohne Bewertung (Charles 18.11.) |
| 2.8 | „Wer kommt?“ hat fünf Ansichten mit fünf Namen | teils ✅ v846: Stand und Detail der Rückmeldungen verbunden, Einstiege gleich benannt; „Wer kommt?“ am Spieltag und die Anwesenheit bleiben eigene Seiten |
| 2.9 | „Wie war’s?“ erreicht nur, wer zugesagt hat oder im Plan steht | ✅ v844 auch nach gespeicherter Trainer-Anwesenheit (das To-do über den Plan unverändert) |
| 2.10 | Termin anlegen liegt drei Ebenen tief, kein Einstieg von der Startseite | ✅ v835 |
| 2.11 | Systemdialoge am Platz (Trainingsstart verwerfen, Gruppenname, Anwesenheit) | ✅ v836 |
| 2.12 | Pinnwand fragt „Wer schreibt“ per Auswahlfeld | ✅ v836 vorbelegt |

## Paket 3 · Eltern-App

| # | Befund | Status |
|---|---|---|
| 3.1 | Ohne Netz steht „keinem Kind zugeordnet“ statt des Termins | ✅ v837 |
| 3.2 | Eltern können sich über die Kabine aussperren (Code steht nirgends) | ✅ v837 Rückfrage beim ersten Start |
| 3.3 | Antwortknöpfe sehen an vier Stellen viermal anders aus; „Krank“ fehlt in zwei Listen | ✅ v840 eine Bauart; Regel für den Absagegrund je Ort noch verschieden |
| 3.4 | Trainings werden rot gemahnt, obwohl sie als zugesagt gelten | ✅ v838 (Charles 17.11.) |
| 3.5 | Bis zu elf bedingte Blöcke oben ohne Ordnung; Ansage steht unter Terminkarte | ✅ v838 drei Zonen (Charles 17.11.) |
| 3.6 | „Neue Adler-Rufe“ öffnet den ersten offenen Raum, nicht den mit dem neuen Ruf | ✅ v837 |
| 3.7 | Neuigkeiten verschwinden mit dem Lesen, kein Ort zum Nachlesen | ✅ v859 „Nachlesen“: Ansagen 60 Tage, Neues in der App |
| 3.8 | „Passwort vergessen“ endet ohne neues Passwort | ✅ v837 |
| 3.9 | Erster Besuch stapelt sechs Dinge (Einwilligung, Auftakt, Tour, Hinweise, Checkliste) | ✅ v862 (Charles 18.11.): Einwilligung allein, Tour 6 statt 12 Schritte mit Push-Angebot, Hinweise erst danach |
| 3.10 | Kontoeinstellungen liegen an vier Orten | ✅ v860: „⚙️ Mein Konto“ unter ⋯ bündelt Angaben, Passwort, Benachrichtigungen, Daten und Abmelden |
| 3.11 | Foto-Knopf auf der Terminkarte zeigt den kommenden Termin, also meist nichts | ✅ v859 vor dem Termin: Fotos der letzten Spieltage |
| 3.12 | Tipp auf eine Benachrichtigung: erst Auftakt, dann Wartezeit | ✅ v837 |
| 3.13 | Wochenkacheln schmal; „✕“ steht für drei Bedeutungen | teils ✅ v859: „–“ für „fällt aus“, „✕“ für „nicht dabei“; ✅ v861: Tage mit Termin 64 statt 39 px breit (360 px) |
| 3.14 | Barrierefreiheit: `aria-pressed` fehlt, Sperrknopf nur über Deckkraft, Dunkelmodus ungeprüft | teils ✅ aria-pressed an den Antwortknöpfen seit v840; v859 Einwilligungs-Knopf mit Text statt Deckkraft; ✅ v861 Dunkelmodus gemessen: Schrift überall ≥ 4,5:1 (Startseite, sechs Bereiche, Termin, Mein Konto), Kachel- und Knopfränder von 2,4:1 auf ≥ 3:1, Kopfknöpfe mit hellem Rand |
| 3.15 | „Für die Kinder“ steht vor „Trainerteam kontaktieren“; „Mehr vom Team“ bündelt acht ungleiche Dinge | ✅ v862 (Charles 18.11.): „Fürs Team“ → „Für die Kinder“ → „Mehr“; „Mehr vom Team“ in Lesen, Fotos, Untereinander |

## Paket 4 · Struktur und Sprache

| # | Befund | Status |
|---|---|---|
| 4.1 | „Eltern“ und „Orga“ je rund 15 gleich gewichtete Kacheln; Einstellungen neben Alltag | ✅ v841 Klappen für Seltenes; v849 Dreierreihen, wo die Gruppe aufgeht |
| 4.2 | Dieselbe Sache, mehrere Namen (Spieltag/Match/Matchday, Block/Phase, Rückmeldung/Antwort, sechs „Adler“-Kanäle) – Wortliste | teils ✅ v842: Spieltag, Spieluhr, Rückmeldung, Die Kabine, Nachbereitung; offen: Block/Phase, Station/Feld, Schließen/Abbrechen/Fertig, Adler-Kanäle |
| 4.3 | Die Hilfe ist ein Änderungsprotokoll (Einträge bis 7.900 Zeichen) | teils ✅ v843: Kurzfassung zuerst, ganzer Text hinter „Alles dazu“; eigene Kurzfassungen für 31 Einträge (v847: die 14 längsten, v848: 13 weitere); rund 25 kürzere zeigen den Anriss |
| 4.4 | Fachsprache ohne Erklärung (Leitfrage, Nominierung, Provokationsregel) | ⬜ |
| 4.5 | Rund 50 Systemdialoge, 180 von Hand gebaute Fenster | ⬜ schrittweise |
| 4.6 | Knopf-Stile: Hauptaktion je Seite anders, rund 200 Knöpfe nur mit Inline-Style | ⬜ schrittweise |
| 4.7 | Toter Code (Import-Fenster, `homeTool`, `statTile`, Taktik-Zweig) | ⬜ |
| 4.8 | Trainingsplan: Zustand lebt im DOM, Sprünge über Zeitgeber | ⬜ groß, hohes Risiko |

## Paket 5 · Inhalte (Vorlagen und Übungen)

| # | Befund | Status |
|---|---|---|
| 5.1 | Skalierungszeilen gehen rechnerisch nicht auf (L5-2, L2-4, L1-3, L2-1) oder widersprechen der Übung | teils ✅ v839: L5-2/8, L2-4/12, L1-3/8 berichtigt; Feldmaße gegen die Übungen offen |
| 5.2 | „Warm up Adler“ (Reihenprogramm, 15 Minuten) steht im 8-Minuten-Block von 38 Vorlagen | bleibt so (Charles 17.11.: das Einlaufprogramm wird nicht getauscht) |
| 5.3 | Sechs Vorlagen sind 34 Minuten Übungsform; drei davon sind die Schlechtwetter-Vorlagen; Blocktyp zählt sie als Spielzeit | teils ✅ v847: L1-4, L2-3, L4-4 mit Stufe 1 und 2 als Übungsform, 21 statt 32 Minuten Spielform (Charles 17.11.); ✅ v866: L3-1 ebenso (Charles 18.11., 36 → 21 Min), L6-2 war eine falsche Einordnung von „Igel-Pressing-Kreis“ (jetzt Spielform), die Sondereinheit Technik-Parcours bleibt bewusst Übungsform |
| 5.4 | Stationen-Vorlagen ohne freie Stufe, höchste Erklärlast (L6-5, „3+1 gegen FUNiño“) | ⬜ |
| 5.5 | Regeln, die Kinder nicht selbst prüfen können; Kontaktbegrenzung in L4-1/L4-4 | ✅ v869 (Charles 18.11.): Pässe laut zählen (L4-1), Tausch bei Ballberührung (L4-4) |
| 5.6 | Folge-Nummer ist Entstehungsreihenfolge, keine Progression | ⬜ |
| 5.7 | Halle und Schlechtwetter dünn; keine Zeilen für 6, 10, 14 Kinder | Entwurf: `doku/auftrag-skalierung-6-10-14/` wartet auf fachliche Prüfung; Halle offen |
| 5.8 | Material je Einheit steht nirgends als Liste | ✅ v867 (Charles 18.11.): „🎒 Mitnehmen“ aus den Skizzen gezählt, eigene Angabe möglich |
| 5.9 | Rund 14 Fast-Dubletten „3 gegen 3 auf vier Minitore“ | ✅ 18.11. nachgeprüft: 19 Übungen, davon 15 gewollte Varianten; die zwei echten Paare – „Pflichtpass-Funino“ und „Dreiecksduell 3gg3“ (data.js) – im Archiv (team_config.uebung_archiv, Charles 18.11.); L4-3 und alte Pläne behalten die Übung |
| 5.10 | Datenqualität: Spielerzahl, Feld ohne Maß, Coaching im Befehlston, sehr lange Abläufe | ⬜ |
| 5.11 | Kein Zeitpuffer für Umbau und Trinken | ✅ v868: nachgeprüft – 37 Vorlagen lassen 5 Min. in 75; die Zeile nennt sie jetzt Puffer und warnt unter 3 Min.; Ziel-Dauer folgt dem Termin (vorher immer 75, auch bei 90-Minuten-Trainings) |

Paket 5 betrifft Inhalte, die bisher über Auftragspakete aus dem Projekt-Chat entstehen. Änderungen an
bestehenden Übungen erreichen die Geräte nicht über den Abgleich (er überschreibt nie), sondern
brauchen ein Update in der Datenbank.

## Nachtrag 17.11. · Spielerbewertung vor der ersten Runde

Auftrag Charles: die Bewertung auf Logik, Sinn und Bedienbarkeit prüfen. Befund: je Kind eine Seite von
elf Bildschirmhöhen (14 Kinder, 248 Entscheidungen), die Hilfe empfahl „Kriterium für Kriterium“, die
App konnte nur Kind für Kind; kein Zwischenstand; Alter, Fuß und Beteiligung von Hand; „Umfeld / Eltern“
als Etikett über die Familie; Prozentzahlen im Formular.

| Punkt | Status |
|---|---|
| Runde Kriterium für Kriterium, Zwischenspeicher am Gerät, ein Speichervorgang als „Trainerteam“ | ✅ v850 |
| „Fürs Elterngespräch“ (drei Beobachtungen, ein Satz) statt Umfeld-Etikett; nur im Profil, in keinem Bericht | ✅ v850 (Charles 17.11.) |
| Alter und starker Fuß aus dem Profil, Beteiligung und Prozentzahlen aus dem Formular | ✅ v850 |
| Startdatum der Bewertungen ist in der Datenbank leer – setzt das Trainerteam unter Team → Bewerten | offen (Trainerteam) |
| Kind mit (fast) nur „Nicht gesehen“ bekam 0 %, Rolle und Profiltext – jetzt Mindestregel (Hälfte der Feld-Kriterien) | ✅ v851 |
| Kaderliste: „Ges.“ und „Pot.“ in Prozent – jetzt Stärke in Worten (Charles 18.11.) | ✅ v851 |
| Profil: Entwicklungsstand/-tempo und Bereiche in Prozent, „Ansatz“ als 0 % – jetzt Stufen in Worten (Charles 18.11.) | ✅ v852 |
| Aufstellung: „Beste Aufstellung 87 %“ und „Weitere gute Kombinationen“ als Bestenliste – entfernt, Rollen-Vorschlag bleibt (Charles 18.11.) | ✅ v853 |
| Knopf „Vorschlag“ wählte intern weiter die Kombination mit dem höchsten Rollenwert – jetzt nach Rollen-Erfahrung (Charles 18.11.) | ✅ v855 |
