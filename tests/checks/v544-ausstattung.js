/* v544 – Ausstattung: was hat welches Kind von uns bekommen?

   Ablösung von v543. Dort stand eine einzige Trikotgröße am Kind; das trägt nicht,
   sobald es mehr als ein Kleidungsstück gibt (Anzug und Jacke haben eigene Größen)
   und der zweite Präsentationsanzug kommt noch. Die Größe lag ausserdem zweimal in
   der Datenbank: in `kader` (Trainer, v543) und in `kind_fanfacts` (Eltern, seit
   Phase 11-Q). Beide Stellen sind weg, es gibt nur noch die Ausgabe.

   Der gefährlichste Fall ist d). Geschrieben wird mit merge-duplicates, und ein
   Upsert setzt Spalten, die NICHT mitgeschickt werden, auf ihren Vorgabewert
   zurück. Wer erst die Größe tippt und dann den Haken setzt, verlöre die Größe
   wieder – ohne Fehlermeldung, weil der Server die Zeile ja annimmt.

   Fälle:
   a) Je Gegenstand ein Chip, der gewählte trägt aria-pressed – nicht nur Farbe.
   b) Je Kind im Kader eine Zeile; wer nicht mehr dabei ist, fehlt.
   c) Der Haken schreibt sofort, mit dem heutigen Datum.
   d) Die eben getippte Größe überlebt den Haken – die ganze Zeile geht raus.
   e) „zurück“ trägt das heutige Datum ein; das Kind zählt danach wieder als offen.
   f) Die Zählzeile nennt „x von y“ und lässt Ausgeschiedene aus.
   g) Im Kader-Editor steht keine Trikotgröße mehr, und die Eltern haben kein Feld
      dafür – sonst wäre die zweite Wahrheit nur umgezogen.
   h) Migration, Sicherung und MODUL_WACHE sind mitgezogen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();

  const artikel = [
    { id: 1, name: "Trikotsatz", beschreibung: "Trikot, kurze Hose, Stutzen", mit_groesse: true, mit_nummer: true, groessen: "128,140,152", sort: 10, aktiv: true },
    { id: 2, name: "Spieltagsjacke FRMD PASN", beschreibung: null, mit_groesse: true, mit_nummer: false, groessen: "128,140,152", sort: 20, aktiv: true }
  ];
  /* Kind A hat den Satz schon, Kind O ist ausgeschieden: damit lässt sich zeigen,
     dass die Zählung die Ausgeschiedenen auslässt (14 im Kader, einer versorgt). */
  const ausgabe = [{ id: 1, spieler_id: 1, artikel_id: 1, ausgegeben_am: h.tagePlus(-30), groesse: "128", nummer: "1", zurueck_am: null }];

  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv: [h.KINDER[14]] }),
      ausstattung_artikel: artikel,
      /* Die Antwort auf einen Upsert ist die geschriebene Zeile – genau so verhält
         sich PostgREST mit return=representation, und die App übernimmt sie. */
      ausstattung_ausgabe: (u, req) => {
        if (req.method() === "POST") {
          let b = {}; try { b = JSON.parse(req.postData() || "{}"); } catch (e) {}
          return { status: 201, body: JSON.stringify([{ id: 99, ...b }]) };
        }
        return ausgabe;
      }
    })
  });

  const r = await s.page.evaluate(async ({ heute }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader();
    await ausstattungOpen();
    await warte(300);
    const out = {};
    const body = document.getElementById("aus-body");
    if (!body) return { fensterFehlt: true };

    // a) Chips
    const chips = [...body.querySelectorAll(".ftag")];
    out.chipTexte = chips.map(c => c.textContent.trim());
    out.gewaehlt = chips.filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.textContent.trim());

    // b) Zeilen
    const kaesten = () => [...body.querySelectorAll('input[type="checkbox"]')].filter(c => /ausToggle/.test(c.getAttribute("onchange") || ""));
    out.zahlZeilen = kaesten().length;
    out.namen = body.textContent.includes("Kind O");
    out.schonVersorgt = kaesten()[0].checked;             // Kind A trägt die Vorbelegung

    // f) Zählzeile
    out.stand = (body.textContent.match(/\d+\s*von\s*\d+\s*haben[^·\n]*/) || [""])[0].replace(/\s+/g, " ").trim();

    /* d) Erst die Größe tippen, dann den Haken setzen – die gefährliche Reihenfolge.
       Kind B ist die zweite Zeile und hat noch nichts. */
    const felder = [...body.querySelectorAll(".aus-groesse")];
    felder[1].value = "140";
    /* v565: Die Größe ist bei Gegenständen mit Größenliste ein Auswahlmenü, sonst ein
       Textfeld. Ein echtes Menü meldet „change", ein Textfeld „input" – hier werden beide
       ausgelöst, damit dieser Fall die Reihenfolge prüft und nicht das Bedienelement. */
    felder[1].dispatchEvent(new Event("input", { bubbles: true }));
    felder[1].dispatchEvent(new Event("change", { bubbles: true }));
    await warte(50);
    kaesten()[1].checked = true;
    kaesten()[1].dispatchEvent(new Event("change", { bubbles: true }));
    await warte(400);

    // e) Rückgabe bei Kind A
    const zurueck = [...body.querySelectorAll("button")].find(b => /zurück/.test(b.textContent));
    out.zurueckDa = !!zurueck;
    if (zurueck) { zurueck.click(); await warte(400); }
    out.standNachher = (document.getElementById("aus-body").textContent.match(/\d+\s*von\s*\d+\s*haben[^·\n]*/) || [""])[0].replace(/\s+/g, " ").trim();
    out.heute = heute;
    return out;
  }, { heute });

  if (r.fensterFehlt) {
    probleme.push("ausstattungOpen öffnet kein Fenster");
  } else {
    if (r.chipTexte.length !== 3) probleme.push(`${r.chipTexte.length} Chips statt 2 Gegenstände + „＋“`);
    else if (r.gewaehlt.length !== 1) probleme.push(`${r.gewaehlt.length} Chips tragen aria-pressed, erwartet genau 1`);
    else zeilen.push(`Chips: ${r.chipTexte.join(" · ")} · gewählt „${r.gewaehlt[0]}“`);

    if (r.zahlZeilen !== 14) probleme.push(`${r.zahlZeilen} Zeilen statt 14 – Ausgeschiedene gehören nicht in die Liste`);
    else if (r.namen) probleme.push("Das ausgeschiedene Kind steht trotzdem in der Liste");
    else if (!r.schonVersorgt) probleme.push("Die vorhandene Ausgabe ist nicht als Haken sichtbar");
    else zeilen.push(`Zeilen: ${r.zahlZeilen} Kinder, die vorhandene Ausgabe ist gesetzt`);

    if (!/1 von 14/.test(r.stand)) probleme.push(`Die Zählzeile sagt „${r.stand}“ – erwartet 1 von 14`);
    else zeilen.push(`Zählzeile: „${r.stand}“`);

    if (!r.zurueckDa) probleme.push("Bei einem versorgten Kind fehlt „zurück“");
  }

  // c) + d) Was wirklich rausging
  const posts = s.gesendet.filter(g => /ausstattung_ausgabe/.test(g.pfad || "") && g.methode === "POST");
  if (!posts.length) {
    probleme.push("Der Haken schreibt nicht – nichts ging an ausstattung_ausgabe");
  } else {
    const setzen = posts.find(p => p.body && p.body.spieler_id === 2 && p.body.ausgegeben_am);
    if (!/on_conflict=spieler_id,artikel_id/.test(posts[0].suche || ""))
      probleme.push(`Der Schreibvorgang ist kein Upsert: ${posts[0].suche}`);
    if (!setzen) probleme.push("Der Haken bei Kind B kam nicht am Server an");
    else {
      if (setzen.body.ausgegeben_am !== r.heute) probleme.push(`Ausgegeben am ${setzen.body.ausgegeben_am} statt heute (${r.heute})`);
      if (setzen.body.groesse !== "140") probleme.push(`Die vorher getippte Größe fehlt im Schreibvorgang: ${JSON.stringify(setzen.body.groesse)} statt „140“ – merge-duplicates hätte sie geleert`);
      const fehlend = ["spieler_id", "artikel_id", "ausgegeben_am", "groesse", "nummer", "zurueck_am", "notiz"].filter(f => !(f in setzen.body));
      if (fehlend.length) probleme.push("Die Zeile geht unvollständig raus, es fehlen: " + fehlend.join(", "));
      if (!probleme.length) zeilen.push(`Haken: ganze Zeile als Upsert, Größe „${setzen.body.groesse}“ übersteht ihn, Datum ${setzen.body.ausgegeben_am}`);
    }
    const retour = posts.find(p => p.body && p.body.zurueck_am);
    if (!retour) probleme.push("„zurück“ schreibt kein Rückgabedatum");
    else if (retour.body.zurueck_am !== r.heute) probleme.push(`Rückgabe am ${retour.body.zurueck_am} statt heute`);
    else zeilen.push(`Rückgabe: ${retour.body.zurueck_am}, danach „${r.standNachher}“`);
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  // g) + h) Der Bestand drumherum
  const fs = require("fs"), path = require("path");
  const lies = p => fs.readFileSync(path.join(h.REPO, p), "utf8");
  const views = lies("views.js");
  if (/ke-trikot|trikotgroesse/.test(views)) probleme.push("Im Kader-Editor steht die Trikotgröße noch – zwei Stellen für dieselbe Zahl");
  if (/ff-trikot|trikot_groesse/.test(lies("md-fanfakten.js"))) probleme.push("Die Eltern haben weiter ein Feld für die Trikotgröße");
  if (!/"ausstattung_artikel","ausstattung_ausgabe"/.test(views)) probleme.push("Die neuen Tabellen fehlen in der Sicherung");
  if (!/ausstattungOpen/.test(views)) probleme.push("Keine Kachel führt zur Ausstattung");

  const mig = path.join(h.REPO, "supabase/migrations/20260914_ausstattung.sql");
  if (!fs.existsSync(mig)) probleme.push("Die Migration fehlt");
  else {
    const sql = fs.readFileSync(mig, "utf8");
    ["create table if not exists public.ausstattung_artikel", "create table if not exists public.ausstattung_ausgabe",
     "drop column if exists trikotgroesse", "drop column if exists trikot_groesse"].forEach(t => {
      if (!sql.includes(t)) probleme.push(`Die Migration enthält nicht: ${t}`);
    });
    /* Der Umzug muss VOR dem Löschen stehen, sonst sind die zwei erfassten Größen weg. */
    if (sql.indexOf("insert into public.ausstattung_ausgabe") > sql.indexOf("drop column if exists trikotgroesse"))
      probleme.push("Die Migration löscht die Spalte, bevor die Werte umgezogen sind");
  }

  ["trainer/index.html", "eltern/index.html"].forEach(p => {
    if (!/"md-ausruestung\.js":"ausstattungModulDa"/.test(lies(p)))
      probleme.push(`${p}: die MODUL_WACHE prüft noch den alten Namen`);
  });
  if (!probleme.length) zeilen.push("Drumherum: eine Quelle für die Größe, Migration mit Umzug, Wache und Sicherung nachgezogen");

  return h.ergebnis("Ausstattung: eine Zeile je Kind und Gegenstand, Größe überlebt den Haken", !probleme.length, zeilen.concat(probleme));
};
