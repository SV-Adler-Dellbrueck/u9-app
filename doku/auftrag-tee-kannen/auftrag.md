# Auftrag: Tee-Kannen als Gegenstände (v981)

**Stand:** 26.11.2026 · **Freigabe:** Bild „Tee-Kannen“ (① mitnehmen, ② Hinweis nur bei Zusage, ③ Trainer-Übersicht), Charles 26.11.2026.

## Anlass

Die Tee-Staffel aus v969 leitete aus dem Tee-Eintrag am nächsten Termin ab, dass dieselbe Familie die Kanne am Termin davor
mitnimmt. Das stimmt nicht automatisch – eine eingetragene Familie war am Termin davor gar nicht da.

## Beschluss

- Familien tragen sich fürs **Mitnehmen** einer Kanne ein (am Termin, ab Beginn, nur wenn ihr Kind dabei ist).
- Die App **merkt sich**, welche Familie welche der zwei Kannen hat.
- Diese Familie sieht beim nächsten Termin, **für den ihr Kind zugesagt hat**, den Hinweis „Bringt ihr sie mit warmem Tee mit?“
  (ein Tipp trägt sie bei „🫖 Tee mitbringen“ ein) und bekommt am Vortag eine Erinnerung – sonst keinen Hinweis.
- Mit Beginn des Termins, zu dem die Kanne mit Tee kam, ist sie wieder „am Platz“.
- Trainer sehen in der Anwesenheit, wo die Kannen sind, und können „ist zurück“ setzen. Andere Eltern sehen nur „unterwegs“.
- „Zugesagt“ wie überall in der App: Rückmeldung „zugesagt“, beim Training auch ohne Rückmeldung.

## Umsetzung

Tabelle `tee_kanne` (zwei Zeilen), Funktionen `tee_kanne_stand`, `tee_kanne_nehmen`, `tee_kanne_bringen`, `tee_kanne_nicht_bringen`,
`tee_kanne_zurueck` (Migration `20261127_v981_tee_kannen.sql`, Rechte-Prüfung `tests/sql/v981-tee-kannen.sql`), Oberfläche in
`md-eltern-portal.js` (Termin-Fenster und Startkarte) und `md-gegner.js` (Termindetail, Anwesenheit), push-cron Teil 2b.
Prüffall `tests/checks/v981-tee-kannen.js`.
