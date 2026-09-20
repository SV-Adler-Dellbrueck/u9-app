# Auftragspaket: Kinder-App — die Kabine als eigene, installierbare App

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 20.09.2026 (App v589). Gilt zusammen mit `CLAUDE.md`.

> **Freigegeben am 20.09.2026** (PR #172). Charles hat drei Anforderungen gesetzt: die Kabine
> soll eine eigene App werden, sie muss auf einem anderen Endgerät installierbar sein, und
> die Eltern stellen in ihrer App die Appzeit des Kindes ein. Gebaut wird in der Reihenfolge
> unter „Schritte“; **Schritt 1 ist erledigt**, das Ergebnis steht unten unter „Nachtrag
> Schritt 1 — gemessen, nicht geraten“ und ändert vier Stellen dieses Pakets.

## Wozu

Die Kabine ist heute ein Kinder-Modus **innerhalb der Eltern-Sitzung**: Eltern melden sich
per E-Mail-Code an, geben das Handy weiter, und die Kabine versteckt alles Elterliche. Die
Datenbank prüft jeden Zugriff mit `is_parent_of(spieler_id)` gegen die E-Mail der
angemeldeten Eltern. Der Ausgangs-Code ist ein Hash in `kabine_config` für die ganze
Mannschaft, das 60-Minuten-Limit ein Zeitstempel im lokalen Speicher (`md-kabine.js`,
`KABINE_MAX_MIN`). Das trägt, solange das Gerät den Eltern gehört.

Auf einem eigenen Gerät des Kindes trägt es nicht mehr. Läge dort die Eltern-Sitzung, hätte
das Gerät dauerhaft alle Elternrechte (Zu- und Absagen, Kasse, Rückmeldungen, Notfallkarte),
und `eltern/` wäre eine Adresszeile entfernt. „Kinder sehen nie Bewertungszahlen“ wäre dann
ein Versprechen der Oberfläche, nicht der Datenbank.

Deshalb bekommt das Kind eine **eigene Identität**: ein anonymes Supabase-Konto je Gerät,
das die Eltern in ihrer App mit einem Kopplungscode an ihr Kind binden. Was das Kind sehen
und schreiben darf, entscheidet die Row-Level-Security, nicht das Verhalten eines
Achtjährigen. Das Zeitbudget liegt am Konto und wird serverseitig geprüft.

**Ausdrücklich nicht:** kein Passwort und keine E-Mail für Kinder, kein Klarname im Konto,
keine neuen Rechte auf Eltern- oder Trainer-Tabellen, keine Bewertungszahlen in
Reichweite der Kind-Sitzung.

## Was bleibt, was sich ändert

| Heute | Kinder-App |
|---|---|
| Kabine öffnet aus dem Eltern-Dashboard, Eltern-Sitzung | Eigener Einstieg `kinder/`, eigene anonyme Kind-Sitzung |
| Ausgangs-Code der Mannschaft schließt die Kabine | Entfällt in der Kinder-App; die Kabine in der Eltern-App behält ihn |
| 60 Minuten je Öffnung, lokal gezählt | Tagesbudget je Kind, von den Eltern gesetzt, serverseitig gezählt |
| Kindliste aus `eltern_kinder` über die Eltern-E-Mail | Kindliste aus `kind_konto` über die eigene uid |
| Quiz springt nach `?quiz&from=kabine` in die Eltern-Route | Quiz läuft im Scope `kinder/` mit der Kind-Sitzung |
| Nutzungslog kennt Rolle `kind` schon (`_nutzungRolle`) | Bleibt; dazu die Sitzungsminuten für die Eltern |

Die Kabine **in der Eltern-App bleibt bestehen**. Familien ohne Kindergerät verlieren nichts.

## 1 · Datenbank

### Neue Tabellen

```
kind_konto          -- ein Gerät eines Kindes
  uid             uuid primary key references auth.users(id) on delete cascade
  spieler_id      bigint not null references kader(id) on delete cascade
  geraet          text                     -- frei, von den Eltern vergeben („Tablet Wohnzimmer“)
  tageslimit_min  smallint not null default 60 check (tageslimit_min between 0 and 180)
  aktiv           boolean not null default true
  gekoppelt_am    timestamptz not null default now()
  gekoppelt_von   text not null            -- E-Mail der Eltern, die gekoppelt haben (für den Nachweis)

kind_kopplung       -- Einmal-Code, den die Eltern erzeugen
  id              bigint identity primary key
  spieler_id      bigint not null references kader(id) on delete cascade
  code_hash       text not null            -- SHA-256 des sechsstelligen Codes, nie der Code
  erstellt_von    text not null            -- E-Mail der Eltern
  gueltig_bis     timestamptz not null     -- 15 Minuten
  eingeloest_am   timestamptz

kind_sitzung        -- Minuten je Tag und Gerät
  uid             uuid not null references kind_konto(uid) on delete cascade
  datum           date not null            -- Europe/Berlin
  minuten         smallint not null default 0
  primary key (uid, datum)
```

Alle drei mit RLS. `kind_konto`: Eltern lesen und ändern (`tageslimit_min`, `aktiv`,
`geraet`) für ihre Kinder über `is_parent_of(spieler_id)`, das Kind liest nur die eigene
Zeile (`uid = auth.uid()`), Trainer lesen alles. `kind_kopplung`: Eltern schreiben für ihre
Kinder, niemand liest den Hash außer der Edge Function. `kind_sitzung`: Eltern lesen, das
Kind schreibt nur über den RPC unten. Alle drei in die Backup-Funktion (Pflicht 3).

### Neue Prüffunktionen

```sql
create function is_kind_selbst(p_spieler bigint) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists(select 1 from kind_konto
                where uid = auth.uid() and spieler_id = p_spieler and aktiv);
$$;

create function kind_zeit_uebrig() returns boolean ...
  -- true, wenn für auth.uid() heute (Europe/Berlin) minuten < tageslimit_min
```

`is_kind_selbst` kommt **nur** in die Policies der Kabinen-Tabellen dazu, jeweils als
`or is_kind_selbst(spieler_id)` neben dem vorhandenen `is_parent_of`:

| Tabelle | Betroffene Policies |
|---|---|
| `kabine_post` | sel (`an_spieler`, `von_spieler`), ins (`von_spieler`), upd (`an_spieler`) |
| `kabine_lob` | sel |
| `kabine_reporter` | sel, ins, del |
| `kabinen_wahl_stimmen` | sel, ins, upd |
| `kind_stimmung` | sel, ins, upd |
| `kind_selbstbild` | sel, ins |
| `album_kind` | sel, ins, upd |
| `album_tausch` | ins, del (`von_spieler`) |
| `kind_fanfacts` | rw |
| `kader` | zusätzliche select-Policy `is_kind_selbst(id)` |

Schreibende Policies für das Kind bekommen zusätzlich `and kind_zeit_uebrig()`: nach
Ablauf des Budgets nimmt die Datenbank nichts mehr an, auch wenn die App es versuchen
sollte.

**Nicht anfassen:** `eltern_kinder`, `rueckmeldungen`, `nominierungen`, `spielerprofile`,
`blitz_ratings`, `kind_notfall`, `kind_pause` (Trainer-Policy), Kasse, Notfallkarte. Die
Kabine liest heute `rueckmeldungen` einmal (Zeile 708, Absage-Prüfung fürs Countdown) und
`kind_pause` (Genesungsgrüße, Policy `gruesse_ok` für jeden Angemeldeten). Beides muss vor
dem Bau geprüft werden: entweder über einen bestehenden RPC lösen oder die Kachel in der
Kinder-App ohne diese Abfrage rendern. **Keine Kind-Policy auf `rueckmeldungen`.**

Bereits lesbar für jeden Angemeldeten, also ohne Änderung: `termine` (außer
Trainermeeting), `team_config`, `kabinen_wahl`, `album_fotos`, `skill_woche`,
`team_quests`, `wochen_challenge`, `kinder_codex`, `quiz_progress` (select).

### RPCs

Die Kabine ruft zwölf RPCs auf: `album_tausch_annehmen`, `kader_namen`,
`kind_rolle_heute`, `meine_rollen`, `meine_ziele`, `team_federn_total`, `team_gallery`,
`team_meilensteine`, `wahl_ergebnis`, `xp_award_event`, dazu aus dem Quiz und den Quests
je einer. Jeder, der `is_trainer() or is_parent_of(p_spieler)` prüft (Beispiel
`kind_rolle_heute`), bekommt `or is_kind_selbst(p_spieler)`. Vor dem Bau: Liste aller
zwölf Definitionen aus `pg_proc` ziehen und je RPC festhalten, ob er Zahlen liefert, die
ein Kind nicht sehen soll.

Neu:

- `kind_tick()` — security definer, erhöht `kind_sitzung.minuten` für heute um 1 und gibt
  die Restminuten zurück. Wird von der Kinder-App jede Minute gerufen, solange sie
  sichtbar ist (`visibilityState`). Rechnet den Tag in Europe/Berlin.
- `kind_status()` — liefert dem Kind `spieler_id`, Name, Nummer, Tageslimit und Rest.

### Supabase-Einstellung

Anonyme Anmeldungen einschalten (Dashboard → Authentication → Sign In / Providers →
Anonymous). Das ist ein Häkchen außerhalb des Repos und gehört in `entscheidungen.md`.
Fallback, falls das nicht gewünscht ist: die Edge Function legt Konten mit einer
Pseudo-Adresse an (`kind-<uuid>@adler.invalid`) — dann steht eine Adresse im
Auth-Schema, die es nicht gibt. Empfohlen ist die anonyme Anmeldung.

## 2 · Edge Function `kind-kopplung`

Eine Funktion, zwei Aufrufe:

1. **Eltern-App erzeugt den Code** — nein, das braucht keine Funktion: die Eltern-App
   schreibt den Hash selbst in `kind_kopplung` (RLS `is_parent_of`) und zeigt den Code
   sechsstellig groß an, 15 Minuten gültig.
2. **Kinder-App löst den Code ein** — die Kinder-App meldet sich zuerst anonym an
   (`POST /auth/v1/signup` ohne Body) und ruft dann mit ihrem JWT die Funktion mit dem
   Code. Die Funktion (Service-Role) sucht den ungenutzten, gültigen Hash, schreibt
   `kind_konto(uid, spieler_id, gekoppelt_von)`, markiert den Code als eingelöst und
   antwortet mit `kind_status()`. Höchstens fünf Fehlversuche je uid und Stunde.

Geheimnisse nur in den Secrets, nie im Repo (`CLAUDE.md`). Quelltext unter
`supabase/functions/kind-kopplung/` mit README nach dem Muster von `ki-uebung`.

## 3 · Dritter Einstieg `kinder/`

Nach dem Muster von `eltern/`:

- `kinder/index.html` mit `<base href="../">`, eigenem Manifest `manifest-kinder.json`
  (`id: adler-u9-kinder`, `scope: ./kinder/`, `start_url: ./kinder/`, `short_name` „Kabine“,
  Farbe aus dem Kabinen-Verlauf `#0f172a` → `#1e3a8a`), eigenen Icons
  `icon-kinder.png` und `icon-kinder-maskable.png`.
- Weiche in `index.html`: neue Route `kinder` → Ordner `kinder/`; `core.js:843`
  (Installierbarkeit) und der Manifest-Wechsel in `eltern/index.html` bleiben, wie sie sind.
- `sw.js`: `./kinder/`, das Manifest und die Icons in `PRECACHE`; `einstiegFuer()` kennt
  `/kinder/`; Version hochzählen (Pflicht 1).
- Eigener Loader: **welche Dateien** die Kinder-App braucht, wird vorher gemessen, nicht
  geraten. `md-kabine.js` ruft `elternCardOpen` und `elternDashLoad`
  (`md-eltern-portal.js`), `abzeichenOpen` (`md-abzeichen.js`), `elternLoader`
  (`md-spielbericht.js`), `elternEsc` (`md-matchcard.js`), `hashPin` (`boot.js`) sowie
  Quiz und Quests. Erster Schritt ist ein Prüffall, der die Kinder-App mit einer
  Minimalliste startet und jede fehlende Funktion meldet; die Liste wächst, bis er grün
  ist. Erwartung: Welle 1 aus `data.js`, `core.js`, `engine.js`, `views.js`,
  `md-kabine.js`, `md-abzeichen.js`, `quiz.js`, `md-quests.js`, `boot.js`, Rest in Welle 2.
  `MODUL_WACHE` wie in den anderen Loadern.
- `boot.js`: Route `?kinder` → `renderKinderApp()`. Mit Kind-Sitzung (eigenes Fach
  `SB_TOKEN_KEY_KIND`, Forever-Login über den refresh_token wie bei den Eltern) direkt
  `kabineOpen({kind:true})`; ohne Sitzung der Kopplungsbildschirm: sechs große Ziffernfelder,
  kein Text, den ein Kind nicht lesen kann.

## 4 · Änderungen in `md-kabine.js`

- `kabineOpen(opt)`: im Kind-Modus kommt die Kindliste aus `kind_status()` statt aus
  `_elternKids`; Knopf „Für Erwachsene: Kabine verlassen“ entfällt; `kabineZeitEnde()`
  zeigt „Für heute ist die Kabine zu — bis morgen! 🦅“ statt `elternDashLoad()`.
- Zeitanzeige: Restminuten aus `kind_tick()`, nicht aus `localStorage`; unter zehn Minuten
  der bekannte Hinweis, bei null der Schluss-Bildschirm. Neustart der App hilft nicht,
  weil der Server zählt.
- `kabineQuiz(mode)`: Ziel `location.pathname+"?quiz&from=kabine"` bleibt gültig, weil
  der Pfad jetzt `/kinder/` ist; `quiz.js:436` (Federn fürs eigene Kind über
  `eltern_kinder`) bekommt einen Kind-Zweig über `kind_status()`.
- `kabineCountdownLoad` und `_kabNaechsterTermin`: die Absage-Prüfung über
  `rueckmeldungen` (Zeile 708) im Kind-Modus über einen RPC, der nur „abgesagt ja/nein“
  liefert — oder weglassen und den nächsten Termin ohne Rückmeldungsfilter zeigen.
  Entscheidung vor dem Bau.
- `kabineMyCard` → `elternCardOpen`: prüfen, ob die Adler-Karte in der Kind-Sitzung ohne
  Zahlen bleibt. Sie ist heute schon für den Kinder-Modus gedacht; der Prüffall misst es.

## 5 · Eltern-App: Karte „Kinder-App“

Im Eltern-Dashboard unterhalb der Kabinen-Kachel (`md-eltern-portal.js:715`):

- **Gerät koppeln**: Code erzeugen, groß anzeigen, 15-Minuten-Uhr, Hinweis „Auf dem Gerät
  des Kindes: Kabine öffnen, Code eingeben“.
- **Gekoppelte Geräte**: Liste aus `kind_konto` je Kind mit Gerätename, Datum, heute
  genutzte Minuten aus `kind_sitzung`, Knopf „Entkoppeln“ (setzt `aktiv=false`, die
  Kind-Sitzung verliert damit sofort alle Rechte).
- **Appzeit**: Schieber 0 bis 180 Minuten je Tag in 15-Minuten-Schritten, Vorgabe 60, mit
  Erklärung „gilt ab sofort, auch mitten in einer Sitzung“. 0 heißt „heute gesperrt“.
- Systemdialoge vermeiden, eigenes Overlay, `role="dialog"`, 44-Pixel-Knöpfe, Kontrast
  wie in `CLAUDE.md`.

Trainer sehen unter Orga → Nutzung, wie viele Kindergeräte gekoppelt sind, ohne Namen.

## 6 · Prüffälle (`tests/checks/vNNN-kinder-app.js`)

1. Kinder-App startet ohne Sitzung im Kopplungsbildschirm; kein Eltern-Element im DOM.
2. Mit Attrappen-Kind-Sitzung öffnet sie direkt die Kabine; der Knopf „Kabine verlassen“
   fehlt.
3. `kind_tick()` liefert 0 → Schluss-Bildschirm, keine Kachel mehr bedienbar.
4. Kein Netzaufruf der Kinder-App geht an `rueckmeldungen`, `spielerprofile`,
   `blitz_ratings`, `nominierungen`, `kind_notfall`, `eltern_kinder` (die Attrappe
   protokolliert jede URL).
5. Loader: Minimalliste vollständig (Modul-Wache grün), Manifest-Scope `kinder/`.
6. Eltern-Karte: Code erzeugen schreibt einen Hash, nie den Code; Schieber schreibt
   `tageslimit_min`.
7. Quiz aus der Kabine bleibt im Scope `/kinder/`.

Dazu ein SQL-Prüfskript, das für eine Test-uid ohne `kind_konto` jede Kabinen-Tabelle
abfragt und null Zeilen erwartet, und mit `aktiv=false` ebenso.

## 7 · Pflichten

`sw.js` hochzählen; neue Dateien in `PRECACHE` und alle drei Loader; drei Tabellen in die
Sicherung; Hilfe und Rundgang in Eltern- und Trainer-App um die Kinder-App ergänzen;
Funktionsübersicht (neue Zeile in Abschnitt 3 „Kinderzugang“, Stand hochsetzen);
Eltern-Leitfaden um einen Absatz, dass Kindergeräte ein anonymes Konto ohne Namen und ohne
E-Mail bekommen, das die Eltern jederzeit trennen können; `entscheidungen.md` und
`stand.md` im privaten Repo.

## Schritte

1. **Messen, nicht raten:** Prüffall 5 mit Minimal-Loader, Liste der zwölf RPC-Definitionen
   mit Bewertung „liefert Zahlen?“, Klärung der beiden Abfragen auf `rueckmeldungen` und
   `kind_pause`. Ergebnis als Nachtrag in dieses Paket, bevor Code entsteht.
2. Datenbank: Tabellen, Prüffunktionen, Policies, RPCs, Backup — eine Migration.
3. Edge Function `kind-kopplung`, anonyme Anmeldung einschalten.
4. Einstieg `kinder/`, Manifest, Icons, Weiche, Service Worker, Loader, Route.
5. `md-kabine.js` und `quiz.js` für den Kind-Modus.
6. Eltern-Karte „Kinder-App“.
7. Prüffälle 1 bis 7, SQL-Prüfskript, Doku, Hilfe, Version.

Jeder Schritt ein eigener Entwurfs-PR, zusammengeführt auf Charles' Wort.

## Offene Entscheidungen

- **Tagesbudget oder Zeitfenster?** Vorgesehen ist ein Tagesbudget in Minuten. Ein
  Zeitfenster („nur 16 bis 18 Uhr“) wäre zusätzlich möglich, kostet aber eine zweite
  Einstellung und eine zweite Erklärung.
- **Mehrere Geräte je Kind?** Das Schema erlaubt es; das Budget zählt dann je Gerät. Soll
  es je Kind zählen, summiert `kind_zeit_uebrig()` über alle Geräte des Kindes.
- **Was sieht das Kind nach Ablauf?** Vorgesehen: ein freundlicher Schluss-Bildschirm ohne
  Bedienelemente. Alternative: nur lesen (Codex, Galerie), nicht mehr schreiben.
- **Geschwister auf einem Gerät?** Heute zeigt die Kabine alle Kinder der Familie. Bei
  eigenem Konto je Kind ist das Gerät genau einem Kind zugeordnet; für Geschwister zwei
  Kopplungen auf demselben Gerät wären ein Kontowechsel, den es noch nicht gibt.

---

## Nachtrag Schritt 1 — gemessen, nicht geraten (20.09.2026)

Werkzeug: `doku/auftrag-kinder-app/messung-minimal-loader.js`. Es lädt `eltern/index.html`
im Prüfstand-Browser, liefert jede JS-Datei außerhalb einer Liste **leer** aus, öffnet die
Kabine mit einer vorgetäuschten Eltern-Sitzung und klickt alle 13 Kacheln samt erster
Unterebene an (ohne Quiz-Sprung und Ausgangs-Code). Jeder ReferenceError ist eine fehlende
Datei. Zweiter Modus: die Quiz-Route `?quiz&from=kabine`.

### Minimal-Loader

| Liste | Ergebnis |
|---|---|
| `data.js core.js engine.js views.js md-kabine.js md-abzeichen.js quiz.js md-quests.js boot.js` (9 Dateien, 28 leer) | Kabine öffnet, 12 von 13 Kacheln fehlerfrei; **einzige Lücke** `elternCardOpen` („Meine Karte“, in `md-eltern-portal.js`) |
| dieselben plus `md-eltern-portal.js` (10 Dateien) | **null Fehler** über alle Kacheln und Unterebenen |

Nutzlast der Zehnerliste 1 752 477 Bytes gegenüber 2 680 281 Bytes für den vollständigen
Eltern-Loader. Davon entfallen 493 KB auf `views.js`, 373 KB auf `data.js` und 307 KB auf
`boot.js` — Welle-1-Dateien der Trainer-App, aus denen die Kabine nur wenige Funktionen
braucht (`jsq`, `kidName`, `adlerCardDraw`, `cardApplyGlow`, `hashPin`). Das ist kein
Blocker für den Start, aber ein Hinweis: Wer die Kinder-App schlank will, zieht die
Adler-Karte (`elternCardOpen`, `adlerCardDataFromChild`, `adlerCardDraw`) in ein eigenes
Modul, das Eltern- und Kinder-App teilen; dann entfällt `md-eltern-portal.js` (174 KB) aus
der Liste. `md-kabine.js` selbst enthält ab Zeile 1687 auch Trainer-Oberfläche
(`renderTrainerUI`) — sie stört nicht, gehört aber nicht in eine Kinder-App.

**Folge für Abschnitt 3:** Welle 1 der Kinder-App ist die Zehnerliste; eine Welle 2 gibt
es nicht, weil nichts weiter gebraucht wird. `MODUL_WACHE` prüft dieselben zehn Namen.

### Quiz-Route mit der Zehnerliste

Zwei Befunde:

1. `showMilestoneHint is not defined` — die Startkette in `core.js:277` ruft die Funktion
   aus `md-analyse.js` **ohne** `typeof`-Schutz auf. Im Eltern-Loader fällt das nicht auf,
   weil dort alles geladen wird. Für die Kinder-App: Schutz in `core.js` nachziehen (die
   Regel aus `CLAUDE.md`), nicht `md-analyse.js` mitladen.
2. Ohne Eltern-Sitzung zeigt das Quiz „Wer bist du?“ mit **allen 15 Kindern** zur Auswahl.
   `tqEigeneKinder()` erkennt „eigene Kinder“ nur an der Eltern-Sitzung
   (`SB_TOKEN_KEY_ELTERN`) und an `eltern_kinder`. Für die Kind-Sitzung braucht die
   Funktion einen dritten Zweig über `kind_status()`; sonst kann ein Kind im Quiz unter
   jedem Namen spielen und Federn für andere sammeln.

### Die zwölf RPCs der Kabine, dazu drei aus Quiz, Quests und Abzeichen

| RPC | Prüfung heute | Liefert | Für die Kind-Sitzung |
|---|---|---|---|
| `kader_namen` | `auth.uid()` gesetzt | id, Name, Nummer aller aktiven Kinder | unverändert |
| `team_gallery` | keine | je Kind Name, Nummer, Spitzname, Verein, Foto, Trainingszahl **und `radios` aus `spielerprofile`** | **Befund, siehe unten** |
| `team_federn_total` | keine | Team-Summe | unverändert |
| `team_meilensteine` | `auth.uid()` fürs Schreiben | Team-Zähler | unverändert |
| `wahl_ergebnis` | `auth.uid()` | Stimmenzahlen | unverändert |
| `kind_rolle_heute` | `is_trainer() or is_parent_of` | Rolle des Kindes heute | `or is_kind_selbst` |
| `meine_rollen` | `is_parent_of or is_trainer` | Anzahl Spiele je Rolle (eigenes Kind) | `or is_kind_selbst` |
| `meine_ziele` | `is_parent_of or is_trainer` | offene Entwicklungsziele (Text, eigenes Kind) | `or is_kind_selbst` |
| `xp_award_event` | `is_trainer() or is_parent_of` | schreibt Federn | `or is_kind_selbst`, dazu `kind_zeit_uebrig()` |
| `album_tausch_annehmen` | `is_trainer() or is_parent_of` | schreibt Sticker | `or is_kind_selbst`, dazu `kind_zeit_uebrig()` |
| `wq_done` (Quiz) | `is_trainer() or is_parent_of` | erledigte Wissensquiz-Kennungen | `or is_kind_selbst` |
| `xp_events_for` (Abzeichen) | `is_trainer() or is_parent_of` im `where` | Federn-Ereignisse des Kindes | `or is_kind_selbst` |
| `xp_award_teamquest` (Quests) | nur `is_trainer()` | schreibt Team-Belohnung | unverändert — Kinder vergeben keine Team-Belohnung |
| `kind_team`, `kind_spiel_stats`, `kind_nominierungsstatus` | `is_parent_of` | Team-Einteilung, **Aktionszahlen**, Nominierung | **nicht** für Kinder öffnen; werden nur von Eltern-Portal und Kasse gerufen, nicht von der Kabine |

Keiner der zwölf Kabinen-RPCs liefert Bewertungszahlen des eigenen Kindes. `meine_rollen`
liefert Einsatzzahlen je Position, das ist eine Statistik, keine Bewertung; sie steht heute
schon in „Wo spiele ich?“.

**Befund `team_gallery`:** Der RPC gibt ohne jede Prüfung die `radios` (Bewertungswerte)
**aller** Kinder an jede angemeldete Sitzung, also heute schon an die Kabine in der
Eltern-App. `galleryCardData()` in `md-kabine.js` zeichnet daraus keine Zahl, aber die drei
Stärke-Abzeichen und das Farbthema der Karte jedes Mitspielers. Für die Kinder-App gehört
das serverseitig aufgelöst: ein RPC `team_gallery_kind()` liefert Abzeichen und Thema
fertig berechnet und keine Rohwerte. Das verbessert nebenbei auch die Eltern-Kabine.

### Die drei Direktabfragen

- `rueckmeldungen` (Zeile 708, Countdown): nur `termin_id, spieler_id, status` der eigenen
  Kinder, um ein abgesagtes Spiel im Countdown zu überspringen. Für die Kind-Sitzung ein
  kleiner RPC `kind_abgesagt(p_spieler)` (Liste der Termin-IDs mit Status `abgesagt`),
  **keine** Policy auf `rueckmeldungen`.
- `kind_pause` (Zeile 990, Genesungsgrüße): Policy `kind_pause_sel_gruesse` erlaubt schon
  heute jedem Angemeldeten `gruesse_ok = true`. **Keine Änderung nötig** — das Paket nannte
  oben fälschlich eine Trainer-Policy; die gilt nur fürs Schreiben.
- `kader` (Zeile 68, Geburtstag): `id, geb` der eigenen Kinder. Die neue select-Policy
  `is_kind_selbst(id)` deckt das ab.

### Was sich am Paket ändert

1. Abschnitt 3, Loader: Zehnerliste als Welle 1, keine Welle 2 (oben).
2. Abschnitt 1, RPCs: die Tabelle oben ersetzt die Aufzählung; neu dazu `team_gallery_kind()`
   und `kind_abgesagt()`; `kind_pause` braucht nichts.
3. Abschnitt 4: `tqEigeneKinder()` in `quiz.js` bekommt den Kind-Zweig; `showMilestoneHint`
   in `core.js` wird `typeof`-geschützt.
4. Abschnitt 6, Prüffälle: Prüffall 4 (verbotene Tabellen) prüft zusätzlich, dass die
   Kinder-App `team_gallery` nicht mehr ruft, sondern `team_gallery_kind`.

Damit ist Schritt 1 abgeschlossen; Schritt 2 (Migration) kann beginnen.

---

## Nachtrag Schritt 2 — Datenbank steht (20.09.2026, v590)

Migration `supabase/migrations/20260920_kinder_app_kind_konto.sql`, angewendet und am
Bestand geprüft. Drei Tabellen (`kind_konto`, `kind_kopplung`, `kind_sitzung`, alle mit
Row-Level-Security), zwei Prüffunktionen (`is_kind_selbst`, `kind_zeit_uebrig`), vier neue
RPCs (`kind_status`, `kind_tick`, `kind_abgesagt`, `team_gallery_kind`), sieben erweiterte
RPCs und 22 Policies auf zehn Tabellen. Die drei Tabellen stehen in der Backup-Funktion.

Gemessen nach dem Anwenden: RLS auf allen drei Tabellen an, alle sechs neuen Funktionen
`security definer` mit festem `search_path`, `is_kind_selbst` in 22 Policies und in acht
RPCs. Eine Sitzung ohne Kindergerät bekommt `is_kind_selbst = false`,
`kind_zeit_uebrig = false`, `kind_status = {ok:false}`. `team_gallery_kind()` liefert
dieselben 14 Kinder wie `team_gallery()`, aber **ohne** `radios`; die Stärken-Sortierung
wurde gegen einen Testsatz geprüft (`f_pass 4, f_abschluss 3, f_tempo 2` → genau diese
drei, Torwart-Merkmale und Nullwerte bleiben draußen).

**Nichts wurde eingeschränkt.** Jede Policy bekam ein zusätzliches ODER; Eltern und Trainer
behalten Wort für Wort ihre bisherigen Rechte. Der Zeitriegel `kind_zeit_uebrig()` steht
ausschließlich im Kind-Zweig, sonst hätte er Eltern und Trainer mit ausgesperrt.

### Fünf Abweichungen und Befunde, die zu melden sind

1. **`gekoppelt_von` und `erstellt_von` sind auth-uid, nicht E-Mail** (das Paket nannte die
   E-Mail). Grund: Die Sicherung der App lädt diese Tabellen als JSON herunter; eine
   Elternadresse in einer Datei, die auf einem Trainer-Rechner liegt, wäre neu und
   unnötig. Die uid genügt als Nachweis, wer gekoppelt hat.
2. **„Gesehen" braucht keine Appzeit.** Das Markieren gelesener Adler-Post ist die Folge
   des Lesens, kein neuer Inhalt. Mit Zeitriegel bliebe Post nach Ablauf für immer
   ungelesen. Alle inhaltlichen Schreibvorgänge (Post senden, Reporter, Wahl, Stimmung,
   Selbstbild, Album, Tausch, Fanfakten, Federn) haben ihn.
3. **`quiz_progress` bleibt unverändert — mit einem Befund.** Die Policy erlaubt jedem
   Angemeldeten, Fortschritt unter *jedem* Kadernamen zu schreiben (`is_kader_name`). Das
   gilt heute schon für die Eltern-Sitzung. Für die Kinder-App ist die Abhilfe der
   Kind-Zweig in `tqEigeneKinder()` (Schritt 5); die Policy enger zu ziehen träfe auch
   Eltern mit mehreren Kindern und gehört, wenn überhaupt, in ein eigenes Paket.
4. **Die Sicherheitsprüfung von Supabase meldet weiterhin „SECURITY DEFINER von anon
   aufrufbar"** — für 52 Funktionen, die es alle schon vorher gab (`is_trainer`,
   `is_parent_of`, `kind_termine` …). Die neuen Funktionen reihen sich ein und prüfen
   jede für sich; `team_gallery_kind` gibt ohne Anmeldung eine leere Liste zurück.
   `is_kind_selbst` und `kind_zeit_uebrig` **müssen** für anonyme Sitzungen aufrufbar
   bleiben: sie stehen in Policies, deren Tabellen anonym gelesen werden (Stadionheft
   liest freigegebene Reporter-Antworten). Ein Entzug führte dort zu einem Fehler statt
   zu einer leeren Antwort.
5. **`team_gallery()` bleibt vorerst stehen.** Einziger Aufrufer ist die Kabine; sobald
   Schritt 5 sie auf `team_gallery_kind()` umstellt, hat sie keinen mehr und kann weg —
   aber erst, wenn kein Gerät mehr eine alte Fassung im Cache hält.

Offen bleibt die Prüfung mit einer echten Kind-Sitzung: dafür braucht es das anonyme
Konto aus Schritt 3. Erst dort lässt sich messen, dass ein Kind nach Ablauf der Appzeit
wirklich nichts mehr schreiben kann.

---

## Nachtrag Schritt 3a — der Riegel vor dem Häkchen (20.09.2026)

Vor dem Einschalten der anonymen Anmeldung geprüft, was sie im Bestand öffnen würde.
Supabase gibt anonymen Sitzungen dieselbe Rolle wie jedem angemeldeten Elternteil
(`authenticated`); der öffentliche App-Schlüssel steht im Quelltext der App. Gemessen:

| Was | Vor dem Riegel |
|---|---|
| `team_gallery()` | für `authenticated` aufrufbar, liefert Namen, Nummern, Fotopfade **und die Bewertungswerte** aller Kinder |
| `quiz_progress` | nimmt Einträge für **jeden** Kadernamen an (`is_kader_name`) |
| `kabine_config` | für jeden Angemeldeten lesbar — dort steht der Hash des Kabinen-Ausgangscodes |
| `album_fotos`, `album_tausch`, `kabinen_wahl`, `ansagen`, `ausstattung_artikel`, `team_config` | „irgendjemand ist angemeldet" genügt |

Migration `20260920_kinder_app_anonym_riegel.sql`, angewendet. Sie zieht die Grenze nicht
zwischen angemeldet und nicht angemeldet, sondern zwischen einer **echten Sitzung** (Eltern,
Trainer) oder einem **gekoppelten Kindergerät** und einer beliebigen anonymen Sitzung:

- `ist_anonym()` liest die Marke aus dem Ausweis, `sitzung_gueltig()` verlangt eine echte
  Anmeldung **oder** ein aktives `kind_konto`.
- Sieben Policies laufen jetzt über `sitzung_gueltig()`; die Klasse „nur angemeldet"
  (`auth.uid() is not null`) ist danach leer.
- `kabine_config` ist für anonyme Sitzungen zu — die Kinder-App hat keinen Ausgangscode.
- `ist_eigener_quizname()` löst den Altbefund aus Schritt 2 zur Hälfte: Eltern und Trainer
  dürfen weiter für jedes Kind schreiben (Geschwister, Nachtragen), ein Kindergerät nur
  noch unter dem eigenen Namen.
- `team_gallery()` gibt anonymen Sitzungen eine leere Liste; `team_gallery_kind()` verlangt
  eine gültige Sitzung.

Geprüft ohne Anmeldung: Marke wird erkannt, `sitzung_gueltig()` false, beide Galerien leer,
sieben Policies mit Riegel, zwei mit der Quiz-Prüfung, null Policies mit der alten Form.
**Noch nicht geprüft:** das Verhalten einer echten anonymen Sitzung — dafür muss das
Häkchen gesetzt sein. Das ist der erste Messpunkt von Schritt 3.

Erst jetzt darf „Allow anonymous sign-ins" unter Authentication → Sign In / Providers
eingeschaltet werden.

### Gemessen mit echten Sitzungen (20.09.2026, nach dem Einschalten)

Charles hat „Allow anonymous sign-ins" gesetzt. Gemessen wurde in der Datenbank mit der
Rolle `authenticated` und gesetzten Ausweisdaten, jede Messung in einer Transaktion, die
danach zurückgerollt wurde — es blieb kein Konto und keine Kopplung zurück (nachgezählt:
null Kindkonten, null Sitzungen, acht Auth-Konten wie zuvor).

**Anonyme Sitzung ohne Kopplung** — sie liest nichts außer den Terminen, die auch die
öffentlichen Seiten zeigen:

| Kader | Kabinen-Code | Album-Fotos | Wahl | Team-Config | Ausrüstung | Quiz | Kabinen-Post | Termine |
|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 44 |

Dazu: `sitzung_gueltig()` false, beide Galerien leer, `kind_status()` ohne Ergebnis,
`ist_eigener_quizname()` für jeden Namen false.

**Gekoppeltes Kindergerät** — es sieht genau seinen Teil:

| Darf | Wert | Darf nicht | Wert |
|---|---|---|---|
| eigenes Kind im Kader | 1 von 16 | Bewertungen (`spielerprofile`) | 0 |
| Kinder-Galerie | 14 | alte Galerie mit Rohwerten | 0 |
| eigene Kabinen-Post | 1 | Rückmeldungen | 0 |
| Team-Einstellungen | 1 | Nominierungen | 0 |
| eigener Name im Quiz | ja | Notfallkarten | 0 |
| Appzeit übrig | 60 Minuten | Eltern-Zuordnungen | 0 |
| | | Kabinen-Ausgangscode | 0 |
| | | fremder Name im Quiz | nein |

**Zwei Fehler in der Messung, nicht im Riegel**, beide gefunden und behoben:

1. Der erste Versuch koppelte ein bestehendes Auth-Konto — und alle acht gehören Trainern
   oder Eltern. Das Gerät erbte deren Rechte, die Messung war wertlos. Gültig wird sie
   erst mit einem Konto, das weder Trainer noch Elternteil ist.
2. Der „fremde" Quizname wurde aus der Kader-Tabelle geholt — die für das Kindergerät nur
   die eigene Zeile zeigt. Damit prüfte der Test den eigenen Namen gegen sich selbst. Mit
   festen Namen: eigener Name ja, fremde Namen nein.

Was von hier aus **nicht** messbar war: der Weg über die HTTP-Schnittstelle. Der Proxy
dieser Sitzung verweigert Verbindungen zu `*.supabase.co` per Richtlinie; die Anmeldung
eines echten anonymen Kontos über `/auth/v1/signup` muss deshalb aus der App kommen.
Das fällt mit dem ersten Kopplungsversuch in Schritt 3 ohnehin an.

---

## Nachtrag Schritt 3 — Kopplung steht (20.09.2026)

**Anonyme Anmeldung ist eingeschaltet** (Charles, 20.09.), der Riegel davor war Schritt 3a.

**Edge Function `kind-kopplung`** liegt als Quelltext unter
`supabase/functions/kind-kopplung/` und ist als Version 2 aktiv (`verify_jwt` an). Sie
nimmt `{ "code": "123456" }` mit dem Ausweis der anonymen Sitzung und antwortet in der
Form von `kind_status()`.

Was sie erzwingt, und warum dort und nicht im Client:

- **Nur anonyme Sitzungen dürfen koppeln.** Tippt ein angemeldetes Elternteil den Code in
  die eigene App, würde es sich zum Kindergerät machen und dabei Rechte verlieren, ohne
  es zu merken. Die Funktion weist das mit einem erklärenden Satz ab.
- **Fünf Fehlversuche je Gerät und Stunde**, gezählt in der neuen Tabelle
  `kind_kopplung_versuch` (RLS an, bewusst ohne Policy — nur der Dienstschlüssel schreibt
  dort). Ein sechsstelliger Code hat eine Million Möglichkeiten; ohne Deckel wäre er in
  Stunden geraten.
- **Verbrauchte Codes bleiben verbraucht**, abgelaufen wie eingelöst.
- **Ein zweiter Aufruf mit bestehender Kopplung** gibt ohne Code den Stand zurück, damit
  die App einen Neustart übersteht.

Der Hash ist SHA-256 in Kleinbuchstaben, wortgleich mit `hashPin()` in `boot.js` — beide
Seiten müssen dasselbe Verfahren benutzen, sonst passt nie ein Code. Der Berliner Tag
kommt aus `Intl.DateTimeFormat("sv-SE", …)`, nicht aus einem festen Stundenabstand: im
Winter ist er eine Stunde, im Sommer zwei.

**Noch nicht end-to-end geprüft, und zwar aus zwei Gründen:** Der Proxy dieser Sitzung
lässt keine Verbindung zu `*.supabase.co` zu, und es gibt bisher keinen Weg, einen Code
zu *erzeugen* — das ist die Eltern-Karte aus Schritt 6. Solange sie fehlt, kann die
Funktion nur abweisen, nicht koppeln.

**Empfehlung zur Reihenfolge:** die Eltern-Karte (Schritt 6) vor Einstieg und Kabine
(Schritte 4 und 5) bauen. Erst mit ihr lässt sich ein Code erzeugen und damit die
Kopplung überhaupt einmal von Hand durchspielen, bevor die Kinder-App darauf aufsetzt.

---

## Nachtrag Schritt 6 — die Karte der Eltern (20.09.2026, v591)

Vorgezogen, weil ohne sie kein Code entsteht und die Kopplung aus Schritt 3 nicht einmal
von Hand durchzuspielen wäre.

**Wo:** Eltern-Dashboard, Abschnitt „Für die Kinder", direkt unter der Kabinen-Kachel.
Der Code liegt in `md-kabine.js` (dieselben Daten wie die Kabine) vor `renderTrainerUI()`,
damit der Wachname die letzte Funktion der Datei bleibt; der Knopf steht in
`md-eltern-portal.js`. Kein neues Modul, also keine Änderung an Loader, `MODUL_WACHE`
oder `PRECACHE`.

**Was sie kann:** je Kind die gekoppelten Geräte mit Gerätename, Kopplungsdatum und der
heute genutzten Zeit, darunter ein Schieber für die Appzeit (0 bis 180 Minuten in
Viertelstunden) und „Gerät trennen". Dazu „Neues Gerät koppeln": ein sechsstelliger Code
erscheint groß mit einer Uhr, die fünfzehn Minuten rückwärts läuft.

Entscheidungen:

- **Der Code verlässt die App nicht.** In `kind_kopplung` geht nur sein SHA-256, gebildet
  mit `hashPin()` aus `boot.js` — dasselbe Verfahren wie beim Kabinen-Code und wie in der
  Edge Function. Die Ziffern kommen aus `crypto.getRandomValues`, nicht aus `Math.random`.
- **`sbUid()` in `core.js`** liest die eigene Konto-Kennung aus dem Ausweis, damit
  `erstellt_von` ohne E-Mail auskommt (Schritt 2, Abweichung 1).
- **Trennen fragt in einem eigenen Fenster**, nicht mit `confirm()`; Systemdialoge sind im
  Eltern- und Kinderbereich ausgeschlossen.
- **Farbe trägt nichts allein:** neben dem farbigen Rand steht immer das Wort — „noch 35
  Min. heute", „für heute aufgebraucht", „gesperrt".
- **Fokus** erledigt der zentrale Trap in `core.js` für jedes `role="dialog"`; die
  Stapelhöhe kommt aus `zOben()`, damit das Trennen-Fenster über der Karte liegt.

**Prüffall** `tests/checks/v591-kinder-app-karte.js`, grün: leerer Zustand, Code
sechsstellig mit laufender Uhr, geschrieben wird ein 64-stelliger Hash und **nicht** die
Ziffernfolge, Gültigkeit fünfzehn Minuten, Schieber 0–180 in Viertelstunden schreibt
`tageslimit_min` für genau dieses Gerät, Trennen setzt `aktiv=false` und fragt im eigenen
`role="dialog"`. Knöpfe und Schieber mindestens 44 Pixel. Der ganze Lauf ist grün.

**Damit ist die Kopplung von Hand durchspielbar**, sobald es einen Einstieg für das
Kindergerät gibt (Schritt 4). Bis dahin lässt sich nur die eine Hälfte sehen: dass ein
Code entsteht und wieder abläuft.

---

## Nachtrag Schritt 4 — der Einstieg `kinder/` (20.09.2026, v592)

Die Kabine ist jetzt eine eigene App. Was dazugekommen ist:

- **`kinder/index.html`** mit `<base href="../">`, eigenem Manifest `manifest-kinder.json`
  (`id: adler-u9-kinder`, Scope und Start `./kinder/`, Kurzname „Kabine", Farbe `#0f172a`)
  und eigenen Symbolen `icon-kinder.png` / `-maskable`. Die Symbole sind im Prüfstand-Browser
  aus SVG gezeichnet und abfotografiert — dieselbe Werkstatt wie beim Skizzen-Export.
- **Loader mit der gemessenen Zehnerliste** aus Schritt 1, ohne zweite Welle: was fehlte,
  fehlte dort sofort. Die `MODUL_WACHE` ist wortgleich mit den beiden anderen Einstiegen.
- **Weiche** in `index.html`: `?kinder` geht nach `kinder/`, vor den Eltern-Routen geprüft —
  `kinder` und `kind` unterscheiden sich um einen Buchstaben, und `?kind` ist der
  Zu-/Absage-Link der Familie.
- **Service Worker**: `./kinder/`, Manifest und beide Symbole im `PRECACHE`, `einstiegFuer()`
  kennt `/kinder/`, Version v592.
- **Eigenes Sitzungsfach** `SB_TOKEN_KEY_KIND` in `core.js`. Es fällt **nie** auf die
  Eltern- oder Trainer-Sitzung zurück; erkannt wird das Gerät an `?kinder` oder am Pfad
  `/kinder/` (nötig, weil das Quiz mit `?quiz` startet). `pwaKontext()` gibt der Kabine
  einen eigenen Installationshinweis.
- **Route `?kinder`** in `boot.js` → `kinderGeraetStart()` in `md-kabine.js`: mit gültiger
  Kopplung öffnet die Kabine sofort, sonst der Kopplungsbildschirm mit demselben
  Ziffernfeld wie der Ausgangscode — das kennt ein Kind schon.
- **Anmeldung genau einmal.** Das Gerät legt beim ersten Versuch ein anonymes Konto an und
  benutzt es weiter. Ein neues Konto je Fehlversuch würde die Benutzertabelle füllen und
  den Fehlversuchszähler der Edge Function aushebeln, der an diesem Konto hängt.
- **Vorgriff auf Schritt 5, bewusst:** In der Kabine ist auf dem Kindergerät der
  Erwachsenen-Ausgang ausgeblendet (`window._kindGeraetModus`). Ohne das stünde dort ein
  Knopf, der einen Code verlangt, den die Datenbank anonymen Sitzungen gar nicht mehr
  zeigt (Schritt 3a). Alles Weitere — serverseitige Appzeit über `kind_tick()`, der
  Kind-Zweig im Quiz, `team_gallery_kind` statt `team_gallery` — bleibt Schritt 5.

**Prüfstand erweitert**, weil ein dritter Loader sonst ungeprüft bliebe:
`tests/run.js` liest jetzt auch `kinder/index.html`, vergleicht dessen `MODUL_WACHE` mit
den anderen, prüft dessen Dateiliste gegen Repo und `PRECACHE` und verlangt die drei
Einstiegsseiten samt Manifest und Symbolen im Precache. Dabei fiel ein Altfehler auf: die
Precache-Liste wurde an Kommas getrennt, wodurch ein Zeilenkommentar den nächsten Eintrag
mitfraß — jetzt zeilenweise gelesen. Die Attrappe beantwortet neu `/auth/v1/<name>`, sonst
könnte sich keine Prüfung selbst anmelden.

**Prüffall** `tests/checks/v592-kinder-einstieg.js`, grün: ohne Kopplung ein
`role="dialog"` mit sechs Punkten und zehn Tasten ab 64 Pixeln, kein Eltern-Bereich
dahinter, richtiges Manifest und richtige Farbe; bei falschem Code genau **eine** anonyme
Anmeldung bei zwei Versuchen, der Satz der Funktion erscheint, das Feld ist wieder leer;
mit Kopplung öffnet die Kabine mit dem Kind aus `kind_status()`, ohne Ausgang, und das
Gerät fragt keine der Tabellen ab, die den Eltern gehören.

**Noch offen:** der erste echte Durchlauf auf einem Gerät. Aus dieser Sitzung heraus geht
das nicht, der Proxy lässt keine Verbindung zu Supabase zu.

---

## Nachtrag Schritt 5 — die Kabine im Kind-Modus (20.09.2026, v593)

Die Kabine unterscheidet jetzt an einer einzigen Stelle, auf wessen Gerät sie läuft:
`kabineKindModus()` liest `window._kindGeraetModus`, das der Einstieg aus Schritt 4 setzt.
Daran hängen fünf Änderungen.

**Die Uhr läuft auf dem Server.** `kabineZeitRestMin()` liest auf dem Kindergerät nicht
mehr den gespeicherten Startzeitpunkt, sondern die Restminuten aus `kind_status()`; im
Takt von einer Minute bucht `kind_tick()` eine Minute auf `kind_sitzung` und liefert die
neue Restzeit. Ist die App im Hintergrund, wird nicht gebucht — ein weggelegtes Tablet
verbraucht keine Appzeit. Auf dem Eltern- und Trainergerät bleibt alles, wie es war:
60 Minuten je Öffnung, gerechnet aus `localStorage`. Der Schlüssel `adler_kabine_start`
entsteht auf dem Kindergerät gar nicht mehr.

**Der Schluss-Bildschirm** (`kgSchluss`) tritt an die Stelle der Kabine, sobald die
Appzeit aufgebraucht ist — beim Tick ebenso wie beim Neustart, denn `kind_status()`
liefert dann `rest_min = 0` und die Kabine geht gar nicht erst auf. Er trägt den Text aus
diesem Paket, kein Bedienelement und keinen Weg zurück; steht die Appzeit des Tages auf
null, sagt er das ausdrücklich („Deine Eltern können das ändern"). Der Rückweg ins
Eltern-Dashboard (`elternDashLoad`) läuft nur noch auf dem Eltern-Gerät — auf dem
Kindergerät gibt es kein Dahinter.

**Der Countdown** fragt `kind_abgesagt(p_spieler)` statt `rueckmeldungen`; die Auswertung
(„übersprungen wird nur, wo ALLE Kinder abgesagt haben") bleibt Wort für Wort dieselbe.

**Die Team-Galerie** kommt aus `team_gallery_kind()` — und zwar in beiden Kabinen, nicht
nur auf dem Kindergerät. `galleryCardData()` zeichnet aus `staerken`, einer Liste von
höchstens drei Merkmalsschlüsseln, die der Server sortiert hat. Die Farbe leitet
`feldDimVon()` (neu in `views.js`, gespeist aus `DIMS_FELD`) aus dem stärksten Merkmal ab.
Nebenwirkung, die eine Verbesserung ist: Ohne Bewertung trägt die Karte jetzt
„NEUE SAISON" statt „TECHNIK" — bei lauter Nullen gewann vorher einfach die erste
Dimension, und drei „stärkste" Merkmale wurden aus dem Nichts sortiert. Im Bestand
betrifft das **alle 14 Kinder**: der Saisonstart hat die Bewertungen ins Archiv geräumt.

**Das Quiz** erkennt auf dem Kindergerät genau ein eigenes Kind. `tqEigeneKinder()` hat
einen dritten Zweig über `kind_status()` bekommen; vorher zeigte das Quiz dort „Wer bist
du?" mit dem ganzen Kader, und ein Kind hätte unter jedem Namen Federn sammeln können.

Dazu der `typeof`-Schutz für `showMilestoneHint` — **an zwei Stellen**, nicht an einer:
`core.js:294` (nach der Anmeldung) und `boot.js:362` (beim Start). Der Nachtrag zu
Schritt 1 nannte nur die erste.

### Vier Befunde, die zu melden sind

1. **`my_child_card()` kannte `is_kind_selbst` nicht.** Der RPC steht in
   `md-eltern-portal.js`, nicht in `md-kabine.js`, und fehlte deshalb in der RPC-Tabelle
   aus Schritt 1; Schritt 2 hat ihn folglich nicht erweitert. Auf dem Kindergerät hätte
   „Meine Karte" — eine der zentralen Kacheln der Kabine — mit „Karte konnte nicht geladen
   werden" geantwortet. Ihn einfach zu erweitern wäre der kurze Weg gewesen, hätte dem
   Kind aber seine Bewertungsrohwerte geschickt. Stattdessen:
   `my_child_card_kind()` (Migration `20260920_my_child_card_kind.sql`), Feld für Feld
   dieselbe Karte, aber `staerken` statt `radios`. Die Zähler (Tore, Paraden, Aktionen,
   Spiele, Trainings, Quiz) bleiben — das ist eine Statistik über das, was das Kind selbst
   getan hat, und steht heute schon auf seiner Karte im Eltern-Bereich.
   Die Sortierung der Stärken zog dabei aus `team_gallery_kind()` in eine eigene Funktion
   `staerken_von(name)` um, damit sie nicht zweimal existiert; `team_gallery_kind()` ruft
   sie jetzt auf und liefert nachweislich dasselbe (14 von 14 Kindern unverändert, dazu
   eine Probe mit `f_pass 4, f_abschluss 3, f_tempo 2, tw_fang 4` in einer zurückgerollten
   Transaktion: genau die drei Feldmerkmale, Torwart-Merkmal draußen).

2. **Der Prüfsatz v592 war an einer Stelle blind.** Er prüfte „das Kindergerät fragt keine
   fremden Tabellen ab" gegen `s.gesendet` — und das protokollierte nur Nicht-GET. Jeder
   Lesezugriff ist ein GET und tauchte dort nie auf; die Frage konnte nie mit Nein
   beantwortet werden. Das Prüfwerkzeug führt jetzt zusätzlich `abgefragt` mit **jedem**
   Aufruf; v592 und v593 messen dagegen. `gesendet` bleibt unverändert, damit die anderen
   Prüfsätze weiter zählen, was geschrieben wurde.

3. **Und sofort fand die neue Messung etwas:** Die Startkette in `boot.js:362` lief auch
   auf dem Kindergerät und begann mit `loadDB()` — einer Abfrage auf `spielerprofile`,
   der Tabelle mit den Bewertungen aller Kinder. Die RLS gibt dort nichts heraus, aber
   eine Anfrage, die es nie geben dürfte, überlässt man nicht der RLS. Auf dem
   Kindergerät lädt jetzt nur noch der Kader (die RLS gibt genau das gekoppelte Kind);
   `loadDB()` und `loadCustomForms()` — die Übungsdatenbank des Trainers — bleiben aus.

4. **`kabine_config` ist für die Kind-Sitzung gesperrt** (Schritt 3a: `NOT ist_anonym()`),
   und das ist richtig so: Dort steht der Ausgangs-Code der Eltern-Kabine, den es auf dem
   Kindergerät nicht gibt. Gemessen und bewusst so gelassen.

Geprüft im Bestand: `termine`, `quiz_progress`, `team_config`, `kabinen_wahl`,
`album_fotos`, `kind_pause`, `kinder_codex`, `skill_woche`, `team_quests` und
`wochen_challenge` lassen die Kind-Sitzung über `sitzung_gueltig()` oder eine offene
Leseregel durch; `match_actions` ist trainer-only, wird aber nur von `md-voice.js`
gelesen, und das Modul lädt die Kinder-App nicht.

Prüfsatz `tests/checks/v593-kinder-kabine.js` mit fünf Messungen: Server-Uhr und die
richtigen Quellen, Karte und Quiz kennen genau ein Kind, die Galerie zeichnet aus
`staerken` (mit Gegenprobe ohne Bewertung und für den Torwart), Schluss-Bildschirm ohne
Bedienelement, und ein Neustart hilft nicht. Offen bleibt Schritt 7.
