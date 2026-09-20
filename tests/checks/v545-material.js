/* v545 – Material des Teams: Soll, Ist, und der Unterschied zwischen „null“ und „nichts“.

   Der Fall, der hier wirklich zählt, ist c). Ein leeres Feld muss NULL bleiben. Würde
   es zu 0, behauptete die App nach jedem versehentlichen Leeren, das Fach sei leer –
   und eine Inventur, die „0 Bälle“ sagt, wo niemand gezählt hat, ist schlechter als
   gar keine. Genauso wichtig: nur das Feld „Ist“ setzt das Zähldatum. Das Soll ist
   eine Festlegung, keine Zählung.

   Fälle:
   a) Je Kategorie ein Chip, „Alle“ ist die Vorbelegung, der gewählte trägt aria-pressed.
   b) Der Kopf sagt, wann zuletzt gezählt wurde – und wird gelb, wenn das über ein
      halbes Jahr her ist.
   c) Ein geleertes Feld geht als null raus, nicht als 0; „Ist“ setzt das Zähldatum,
      „Soll“ nicht.
   d) Liegt das Ist unter dem Soll, steht da, wie viele fehlen.
   e) Kleidung wird nicht doppelt gezählt: bei einem Posten mit Verbindung zur
      Ausstattung steht, wie viele Stück gerade bei den Kindern sind.
   f) Migration, Sicherung, Kachel, Saisonstart-Check und Hilfe sind mitgezogen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const alt = h.tagePlus(-400).slice(0, 10);

  const posten = [
    { id: 1, name: "Bälle", kategorie: "Bälle", variante: "Größe 3", soll: 12, ist: 9, zuletzt_gezaehlt: alt, artikel_id: null, sort: 10, aktiv: true },
    { id: 2, name: "Hütchen", kategorie: "Hütchen", variante: "rot", soll: null, ist: null, zuletzt_gezaehlt: null, artikel_id: null, sort: 20, aktiv: true },
    { id: 3, name: "Trikotsätze", kategorie: "Kleidung", variante: null, soll: 16, ist: 16, zuletzt_gezaehlt: alt, artikel_id: 1, sort: 30, aktiv: true }
  ];

  const s = await h.starten({
    hoehe: 2400,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      material_posten: (u, req) => req.method() === "PATCH" ? { status: 200, body: "[]" } : posten,
      ausstattung_artikel: [{ id: 1, name: "Trikotsatz", mit_groesse: true, mit_nummer: true, groessen: "128,140,152", sort: 10, aktiv: true }],
      // Zwei Sätze sind draußen, einer wurde zurückgegeben und zählt nicht mit.
      ausstattung_ausgabe: [
        { id: 1, spieler_id: 1, artikel_id: 1, ausgegeben_am: h.tagePlus(-20), groesse: "128", zurueck_am: null },
        { id: 2, spieler_id: 2, artikel_id: 1, ausgegeben_am: h.tagePlus(-20), groesse: "140", zurueck_am: null },
        { id: 3, spieler_id: 3, artikel_id: 1, ausgegeben_am: h.tagePlus(-40), groesse: "140", zurueck_am: h.tagePlus(-2) }
      ]
    })
  });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader();
    await materialOpen();
    await warte(300);
    const body = document.getElementById("mat-body");
    if (!body) return { fensterFehlt: true };
    const out = {};

    // a) Chips
    const chips = [...body.querySelectorAll(".ftag")];
    out.chips = chips.map(c => c.textContent.trim());
    out.gewaehlt = chips.filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.textContent.trim());

    // b) Kopfzeile
    out.kopf = (body.firstElementChild.textContent || "").replace(/\s+/g, " ").trim();

    // d) + e)
    out.text = body.textContent.replace(/\s+/g, " ");

    // c) Das Ist von „Bälle“ leeren und das Soll von „Hütchen“ setzen
    const felder = [...body.querySelectorAll('input[type="number"]')];
    // Reihenfolge je Zeile: Soll, Ist
    felder[1].value = "";
    felder[1].dispatchEvent(new Event("input", { bubbles: true }));
    felder[2].value = "20";
    felder[2].dispatchEvent(new Event("input", { bubbles: true }));
    await warte(1400);
    return out;
  });

  if (r.fensterFehlt) {
    probleme.push("materialOpen öffnet kein Fenster");
  } else {
    if (r.chips[0] !== "Alle") probleme.push(`Der erste Chip heißt „${r.chips[0]}“ statt „Alle“`);
    else if (r.gewaehlt.length !== 1 || r.gewaehlt[0] !== "Alle") probleme.push(`Vorbelegt ist ${JSON.stringify(r.gewaehlt)} statt „Alle“`);
    else zeilen.push(`Chips: ${r.chips.join(" · ")}`);

    if (!/Zuletzt gezählt/.test(r.kopf)) probleme.push(`Der Kopf nennt keine Zählung: „${r.kopf}“`);
    else if (!/Tage her/.test(r.kopf)) probleme.push(`Eine 400 Tage alte Zählung gilt nicht als alt: „${r.kopf}“`);
    else zeilen.push(`Kopf: „${r.kopf.slice(0, 90)}“`);

    if (!/3 fehlen/.test(r.text)) probleme.push("Bei 9 von 12 steht nicht, dass 3 fehlen");
    else zeilen.push("Unterdeckung: „3 fehlen“ bei 9 von 12");

    if (!/davon 2 bei den Kindern/.test(r.text)) probleme.push("Bei den Trikotsätzen fehlt „davon 2 bei den Kindern“ – die zurückgegebene Zeile darf nicht mitzählen");
    else zeilen.push("Kleidung: davon 2 bei den Kindern (die Rückgabe zählt nicht mit)");
  }

  // c) Was wirklich rausging
  const patches = s.gesendet.filter(g => /material_posten/.test(g.pfad || "") && g.methode === "PATCH");
  if (patches.length < 2) {
    probleme.push(`${patches.length} Schreibvorgänge statt 2 – eine Änderung kam nicht an`);
  } else {
    const leer = patches.find(p => p.body && Object.prototype.hasOwnProperty.call(p.body, "ist") && p.body.ist === null);
    const sollNeu = patches.find(p => p.body && p.body.soll === 20);
    if (!leer) probleme.push(`Ein geleertes Ist-Feld geht nicht als null raus: ${JSON.stringify(patches.map(p => p.body))}`);
    else if (!sollNeu) probleme.push("Das neue Soll kam nicht an");
    else {
      /* Das Soll ist eine Festlegung. Setzte es das Zähldatum, sähe der Schrank
         gezählt aus, ohne dass jemand hingesehen hätte. */
      if (sollNeu.body.zuletzt_gezaehlt) probleme.push(`Ein geändertes Soll setzt das Zähldatum auf ${sollNeu.body.zuletzt_gezaehlt}`);
      else zeilen.push("Schreiben: leeres Ist wird null, ein geändertes Soll setzt kein Zähldatum");
    }
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  // f) Der Bestand drumherum
  const fs = require("fs"), path = require("path");
  const lies = p => fs.readFileSync(path.join(h.REPO, p), "utf8");
  const views = lies("views.js");
  if (!/label:"Material",fn:"materialOpen"/.test(views)) probleme.push("Keine Kachel führt zum Material");
  /* v585: Geprüft wird die Mitgliedschaft in der Tabellenliste von backupExport, nicht mehr
     die letzte Position – seit trainingsformen dahinter steht, sagte „am Ende" nichts mehr
     über „in der Sicherung". */
  const sicherung = (views.match(/async function backupExport\(\)[\s\S]*?const tables=\[([\s\S]*?)\];/) || [])[1] || "";
  if (!/"material_posten"/.test(sicherung)) probleme.push("material_posten fehlt in der Sicherung");
  if (!/k:"material"/.test(views)) probleme.push("Der Saisonstart-Check erinnert nicht ans Zählen");
  if (!/run:"materialOpen\(\)"/.test(views)) probleme.push("In der Hilfe fehlt der Eintrag zum Material");

  const mig = path.join(h.REPO, "supabase/migrations/20260914_material.sql");
  if (!fs.existsSync(mig)) probleme.push("Die Migration fehlt");
  else {
    const sql = fs.readFileSync(mig, "utf8");
    if (!/create table if not exists public\.material_posten/.test(sql)) probleme.push("Die Migration legt die Tabelle nicht an");
    /* Die Startliste darf KEINE Zahlen setzen: was da ist, weiß nur die Zählung. */
    if (/insert into public\.material_posten \(name, kategorie, variante, sort, artikel_id\)/.test(sql) === false)
      probleme.push("Die Startliste hat eine andere Form als erwartet");
    if (/\bist\b\s*,/.test(sql.split("insert into public.material_posten")[1] || "")) probleme.push("Die Startliste behauptet Bestände");
  }
  if (!probleme.length) zeilen.push("Drumherum: Kachel, Sicherung, Saisonstart-Check, Hilfe und Migration ohne erfundene Bestände");

  return h.ergebnis("Material: Soll und Ist, leer heißt nicht gezählt", !probleme.length, zeilen.concat(probleme));
};
