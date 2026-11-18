/* v867 · „🎒 Mitnehmen“ im Trainingsplan (Bestandsaufnahme 5.8, Charles 18.11.: „Ja, automatisch zählen“).
   a) Zählregel: Tor mit Jugendtor-Marke oder ab 32 Breite = Tor, schmaler = Minitor; Hütchentor = 2 Hütchen, Stangentor = 2 Stangen.
   b) Ein paralleler Block zählt zu seinem Hauptteil dazu; über die Einheit gilt der größte Block.
   c) Nach „Training füllen“ (ein Trainer, 12 Kinder) steht über der Zeitleiste „Mitnehmen: …, 12 Bälle“ mit Knopf ≥ 44 px.
   d) Eine eigene Angabe (kopf.material) ersetzt den Vorschlag und steht nicht doppelt im Kopf. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const inaktiv = h.KINDER.slice(12);   // zwölf aktive Kinder
  const d3 = h.tagePlus(2), d2 = h.tagePlus(4), d1 = h.tagePlus(6);
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const plaene = {};
  const termine = [
    { id: 91, datum: d3, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } },
    { id: 92, datum: d2, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } },
    { id: 93, datum: d1, typ: "training", trainer_status: { Charles: "ja" } }];
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [],
      // Die Attrappe filtert nicht – der Plan fragt je Datum, also hier selbst filtern.
      termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
      trainingsformen: custom,
      trainingsvorlagen: rows,
      periodisierung: [],
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const p = plaene[d]; if (!p) return [];
        return [p];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ d3, d2, d1 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof tpMaterialVonSpec !== "function") return { alt: true };
    await loadKader();
    const out = {};
    out.a = tpMaterialVonSpec({ tor: [[0, 0, "v", 24], [0, 0, "v", 40], [0, 0, "v", 36, "j"]], h: [[1, 1], [2, 2]], dtor: [[0, 0, 1, 1, "h", "y"], [0, 0, 1, 1, "s", "y"]], ger: [[0, 0, "stange"], [0, 0, "teller"], [0, 0, "trainer"]] });
    const feld = document.getElementById("tp-date");
    if (![...feld.options].some(o => o.value === d1)) feld.add(new Option(d1, d1));
    feld.value = d1; await tpTrainerRsvpLaden(d1); await tpPlanRestore(d1); await warte(200);
    tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    await tpGenerate(); await warte(500); tpMaterialRender();
    const box = document.getElementById("tp-material");
    out.c = { text: box ? box.textContent.replace(/\s+/g, " ").trim() : "", knopf: box && box.querySelector("button") ? Math.round(box.querySelector("button").getBoundingClientRect().height) : 0 };
    // b) synthetisch: zwei Blöcke, einer mit parallelem Block
    const z = tpMaterialZaehlen();
    out.b = { summe: z.summe, gezaehlt: z.gezaehlt };
    // d)
    tpKopfRender({ schwerpunkt: "Probe", material: "2 Leibchen-Sätze, 10 Hütchen" });
    out.d = { box: (document.getElementById("tp-material") || {}).textContent || "", kopf: (document.getElementById("tp-kopf") || {}).textContent || "" };
    tpKopfRender(null);
    return out;
  }, { d3, d2, d1 }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  const titel = "v867 Trainingsplan: „Mitnehmen“ aus den Skizzen gezählt, eigene Angabe möglich";
  if (r.alt) return h.ergebnis(titel, false, ["tpMaterialVonSpec fehlt (Stand vor v867)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const a = r.a;
  if (a.tore !== 2 || a.minitore !== 1 || a.huetchen !== 4 || a.stangen !== 3 || a.teller !== 1) probleme.push("a) Zählregel: " + JSON.stringify(a));
  else zeilen.push("a) 2 Tore, 1 Minitor, 4 Hütchen, 3 Stangen, 1 Teller – Trainer zählt nicht");
  if (!/Mitnehmen:/.test(r.c.text) || !/12 Bälle/.test(r.c.text) || r.c.knopf < 44) probleme.push("c) " + JSON.stringify(r.c));
  else zeilen.push("c) " + r.c.text.replace(/ ✏️ Ändern$/, "").slice(0, 160));
  if (!r.b.gezaehlt) probleme.push("b) keine Übung mit Skizze gezählt: " + JSON.stringify(r.b)); else zeilen.push(`b) ${r.b.gezaehlt} Felder mit Skizze gezählt`);
  if (!/2 Leibchen-Sätze/.test(r.d.box) || /Leibchen/.test(r.d.kopf) || !/Probe/.test(r.d.kopf)) probleme.push("d) " + JSON.stringify(r.d));
  else zeilen.push("d) eigene Angabe ersetzt den Vorschlag, steht nicht doppelt im Kopf");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
