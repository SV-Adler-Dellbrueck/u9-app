# Auftragspaket: Foto-Freigaben nach der Regel des Vereins

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 24.09.2026. Gilt zusammen mit `CLAUDE.md`.

**Fertig bis Sonntag, 27.09.2026.** Am 28.09. wird der Freigabe-Dialog beim Elternabend gezeigt.

## Warum

Das Trainerteam richtet sich beim Datenschutz nach dem Verein. Mit dem Mitgliedsantrag haben alle
Familien zugestimmt, dass Fotos im Rahmen der Vereinsaktivitäten gemacht und veröffentlicht werden
dürfen. Wer damit ein Problem hat, spricht das Trainerteam an.

Am 24.09.2026 wurden deshalb zwei **Datenänderungen** gemacht, kein Code:

- `team_config.foto_consent_text` (id 1) trägt jetzt den Einleitungstext des Freigabe-Dialogs:
  „Grundlage ist euer Mitgliedsantrag beim SV Adler Dellbrück: Dort habt ihr zugestimmt, dass Fotos
  im Rahmen der Vereinsaktivitäten gemacht und veröffentlicht werden dürfen. Wir haben die Freigaben
  für euer Kind danach gesetzt. Wenn ihr damit ein Problem habt oder etwas ändern möchtet, sprecht
  uns bitte an."
- `foto_consent` steht für alle aktiven Kinder auf `intern`, `video` und `public_ok` = true,
  `updated_by` = „trainer (Mitgliedsantrag, 24.09.2026)".

Im Code stehen aber noch Sätze aus der alten Linie „ihr entscheidet selbst, wir fragen extra". Sie
widersprechen jetzt dem Einleitungstext direkt darüber. Dieses Paket gleicht sie an.

## Was sich ändert

Nur Texte. Kein Verhalten, keine Tabelle, keine Policy.

**1. Stufe „Öffentlich" im Freigabe-Dialog** — `md-eltern-portal.js`, Array `FOTO_STUFEN`, Eintrag
`public_ok`, Feld `d`.

Bisher: „Vereins-Website, Social Media (z. B. Instagram) und Aushänge. Diese Bilder sind auch
außerhalb der App sichtbar und im Netz auffindbar – deshalb fragen wir hier extra nach. Du kannst
die Freigabe jederzeit wieder zurücknehmen."

Neu: „Vereins-Website, Social Media (z. B. Instagram) und Aushänge. Diese Bilder sind auch außerhalb
der App sichtbar und im Netz auffindbar. Grundlage ist euer Mitgliedsantrag beim Verein – wenn ihr
damit ein Problem habt, sprecht uns an."

**2. Offline-Fallback des Einleitungstexts** — `md-eltern-portal.js`, Konstante
`FOTO_CONSENT_DEFAULT`.

Sie wird nur gezeigt, wenn `team_config` nicht erreichbar ist, muss aber nach `CLAUDE.md`, Pflicht 4,
synchron zur Datenbank sein. Neu: **wörtlich derselbe Text** wie in `team_config.foto_consent_text`
oben, mit typografischen Anführungszeichen.

**3. Hinweis unter dem Dialog** — `md-eltern-portal.js`, der Satz zu Gruppenfotos.

Der erste Teil bleibt („Bei Gruppenfotos zeigen wir dein Kind öffentlich nur, wenn alle abgebildeten
Familien der Stufe „Öffentlich" zugestimmt haben."). Der Nachsatz „Freiwillig & jederzeit
widerrufbar." wird ersetzt durch: „Fragen dazu? Sprecht uns an."

**4. Erklärung „So schützen wir eure Fotos & Daten"** — `md-eltern-portal.js`, der Punkt mit dem
Titel „Ihr entscheidet über jedes Bild".

Neuer Titel: „Fotos nach der Regel des Vereins".
Neuer Text: „Grundlage ist euer Mitgliedsantrag beim Verein. In der App gibt es für jedes Kind drei
getrennte Freigaben (App-intern / Trainingsvideos / öffentlich); wir haben sie danach gesetzt. Wer
damit ein Problem hat, spricht uns an. Ohne Häkchen zeigt die App nur Initialen statt Foto. Beim
Aushängen und Verteilen werden Nachnamen automatisch gekürzt („Max M.")."

**5. Hinweis im Trainerbereich** — `views.js`, `title` des Labels zur Foto-Freigabe im Kader.

Bisher: „Nur mit ausdrücklicher Eltern-Zustimmung. Ohne Häkchen erscheinen überall nur die
Initialen."
Neu: „Gesetzt nach dem Mitgliedsantrag des Vereins. Ohne Häkchen erscheinen überall nur die
Initialen."

## Was ausdrücklich bleibt

- **Der Dialog bleibt bedienbar.** Eltern können weiter Häkchen entfernen, „Speichern" und „Alles
  widerrufen" bleiben unverändert. Die Regel ist „sprecht uns an", nicht „ihr könnt nichts mehr
  ändern".
- Die Gruppenfoto-Regel bleibt.
- Die Nachnamen-Kürzung bleibt.
- Keine Änderung an `foto_consent`, `team_config` oder an Policies — die Daten sind bereits gesetzt.

## Vor dem Bauen klären

- Alle Fundstellen der alten Linie suchen, nicht nur die fünf oben: Suchbegriffe „fragen wir",
  „ausdrücklich", „Ihr entscheidet", „Freiwillig" im Zusammenhang mit Fotos, auch in Hilfe und
  Rundgang. Was dieselbe alte Aussage trifft, wird im selben Sinn angepasst und im PR aufgelistet.
- Stimmt die Konstante `FOTO_CONSENT_DEFAULT` nach der Änderung Zeichen für Zeichen mit
  `team_config.foto_consent_text` überein? Die Datenbank ist die Quelle.

## Abnahmekriterien

1. Der Freigabe-Dialog enthält nirgends mehr „fragen wir hier extra" oder „Freiwillig & jederzeit
   widerrufbar".
2. Die Stufe „Öffentlich" nennt den Mitgliedsantrag und „sprecht uns an".
3. Ohne Netz zeigt der Dialog denselben Einleitungstext wie mit Netz.
4. Die Erklärung „So schützen wir eure Fotos & Daten" trägt den neuen Titel und Text.
5. Der Kader-Hinweis im Trainerbereich nennt den Mitgliedsantrag.
6. Häkchen entfernen, speichern und „Alles widerrufen" funktionieren unverändert.
7. Typografische Anführungszeichen in allen neuen Strings; `node --check` über alle Dateien grün.

## Testfälle

- Prüfdatei `tests/checks/` mit Versionsnummer: Dialog öffnen mit Attrappe, die `team_config` liefert
  → Einleitungstext aus der Attrappe; Attrappe ohne `team_config` → Fallback-Text, gleichlautend.
- Im gerenderten Dialog kommt die Zeichenfolge „fragen wir hier extra" nicht vor.
- „Alles widerrufen" schreibt weiter `intern`, `video`, `public_ok` = false.

## Pflichten (aus `CLAUDE.md`)

- `node tests/run.js` grün, danach `sw.js` hochzählen.
- Funktionsübersicht mitziehen: in `doku/Uebersicht_Funktionen-Adler-App_v1.md` unter Eltern-App,
  „Datenschutz & Freigaben", ein Halbsatz zur Vereinsregel; Stand-Zeile auf die neue Version.
- Hilfe und Rundgang mitziehen, wo sie die alte Aussage enthalten.
- Keine Kindernamen, keine Schlüssel.

## Ausdrücklich nicht in diesem Paket

Keine Änderung am Datenmodell. Kein Entfernen der Widerrufsmöglichkeit. Keine Rechtsauskunft in der
Oberfläche — ob und wie die Rechtsgrundlage im Einleitungstext genannt wird, entscheidet das
Trainerteam mit dem Verein; das ist eine Datenänderung in `team_config`, kein Code.
