# Auftragspaket: Kinder-App — die Kabine als eigene, installierbare App

Repo `SV-Adler-Dellbrueck/u9-app`, Stand 20.09.2026 (App v589). Gilt zusammen mit `CLAUDE.md`.

> **Entwurf, noch nicht beauftragt.** Charles hat am 20.09.2026 drei Anforderungen gesetzt:
> die Kabine soll eine eigene App werden, sie muss auf einem anderen Endgerät installierbar
> sein, und die Eltern stellen in ihrer App die Appzeit des Kindes ein. Dieses Paket
> beschreibt, was dafür zu tun ist. Gebaut wird nach seiner Freigabe, in der Reihenfolge
> unter „Schritte“.

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
