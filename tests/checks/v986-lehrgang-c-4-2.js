/* v986 · C-Lizenz Aufgabe 4.2 (Gruppenarbeit): vier defensive Spielformen, Auftragspaket `doku/auftrag-lehrgang-c-4-2/`.
   Defensives Gegenstück zu 3.1; Kategorie pressing, Übungsart Spielform (`spiel`). Die Skizzen entstehen in der App.

   a) Der Abgleich legt die vier neuen Übungen an und überspringt den Bestand; ein zweiter Lauf tut nichts.
   b) Nachträge und Bibliothek tragen dieselben Übungen; _euPruefung und _eiSkizzeFehler ohne Befund; Stand mindestens
      2026-11-27-1; `kurz` höchstens 80 Zeichen; `ablauf_lang` mit den zwölf Überschriften je auf eigener Zeile, in Reihenfolge.
   c) Jede Skizze: ein Bild, quer, Schritte lückenlos ab 1, Beschriftung oben (y 13) auf der Zeichenfläche.
   d) Kein Spielerkreis näher als 24 an einem anderen; kein Nummernkreis auf Spieler (≥ 16), Hütchen oder Ball
      (beim Prüfen am 27.11. lagen alle neun Nummern 7–12 von einem Spieler – die Läufer stehen jetzt 24 vom Pfeilanfang).
   e) Übung 2: Endzonen bündig mit dem Feld. Übung 3: Dribbeltore an beiden Grundlinien, die Koordinate ist der Anfang –
      Mitten symmetrisch zur Mittellinie (beim Prüfen lagen sie 12 zu tief). Übung 4: Pfeil 1 nicht durch das Hütchen (140, 113).
   f) Material wie gezeichnet; der Trainer zählt nicht.
   g) Übungsart „spiel“, Kategorie „pressing“; keine Kindernamen. */
"use strict";
const { bn } = require("../bibliothek-norm.js");
const fs = require("fs"), path = require("path");
const KOEPFE = ["ZIEL", "KURZBESCHREIBUNG", "AUFBAU", "ABLAUF", "REGELN", "COACHING-ASPEKTE", "ESKALATIONSSTUFEN", "ZUSATZREGELN", "VORTEILE", "NACHTEILE", "TYPISCHE FEHLERBILDER", "WORAUF ACHTEN"];
const MATERIAL = {
  "Lehrgang – Zwei-Seiten-Spiel verteidigen": "4 Minitore · 6 Hütchen · 1 Ball",
  "Lehrgang – Fünf-Sekunden-Jagd": "8 Hütchen · 1 Ball",
  "Lehrgang – Erster attackiert, Zweiter sichert": "12 Hütchen · 1 Ball",
  "Lehrgang – Drei Bahnen, klare Zuständigkeit": "3 Minitore · 14 Hütchen · 1 Ball"
};
module.exports = async function (h) {
  const titel = "v986 Lehrgang C-4.2: vier defensive Spielformen – Abgleich, Skizzen, Abstände, Tore, Material";
  const probleme = [], zeilen = [];
  const NAMEN = Object.keys(MATERIAL);
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const roh1 = fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-4-2/nachtrag.json"), "utf8");
  const roh2 = fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-4-2/nachtrag-4.json"), "utf8");
  const soll = JSON.parse(roh1).uebungen.concat(JSON.parse(roh2).uebungen);
  if (soll.map(u => u.name).join("|") !== NAMEN.join("|")) probleme.push("b) die Nachträge tragen andere Übungen: " + soll.map(u => u.name).join(", "));
  for (const s of soll) {
    const u = bib.uebungen.filter(x => x.name === s.name);
    if (u.length !== 1) { probleme.push(`b) „${s.name}“ steht ${u.length}-mal in der Bibliothek`); continue; }
    if (JSON.stringify(bn(u[0])) !== JSON.stringify(bn(s))) probleme.push(`b) „${s.name}“: Bibliothek und Nachtrag verschieden`);
    if (s.kurz.length > 80) probleme.push(`b) „${s.name}“: kurz ${s.kurz.length} Zeichen`);
    const k = s.ablauf_lang.split("\n").map(z => z.trim()).filter(z => KOEPFE.includes(z));
    if (k.join("|") !== KOEPFE.join("|")) probleme.push(`b) „${s.name}“: Überschriften ${k.join(", ")}`);
    if (s.kat !== "pressing") probleme.push(`g) „${s.name}“: Kategorie ${s.kat}`);
  }
  const rang = x => String(x || "").split("-").map(t => parseInt(t, 10) || 0);
  const mind = (a, b) => { a = rang(a); b = rang(b); for (let i = 0; i < Math.max(a.length, b.length); i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0); } return true; };
  if (!mind(bib.stand, "2026-11-27-1")) probleme.push(`b) Stand „${bib.stand}“ liegt vor 2026-11-27-1`);

  let naechste = 1;
  const bestand = bib.uebungen.filter(x => !NAMEN.includes(x.name)).map(x => ({ id: naechste++, ...x, skizze: x.skizze || null }));
  const angelegt = [];
  const s = await h.starten({ breite: 900, hoehe: 1000, warten: 400, bibliothek: true,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      trainingsformen: (url, req) => {
        if (req.method() === "POST") { try { const b = JSON.parse(req.postData() || "null"); (Array.isArray(b) ? b : [b]).forEach(x => angelegt.push(x && x.name)); } catch (e) { } return { status: 201, body: "[]" }; }
        if (req.method() === "PATCH") return { status: 204, body: "" };
        return bestand;
      },
      team_config: (url, req) => req.method() !== "GET" ? { status: 201, body: "[]" } : [] }) });
  const r = await s.page.evaluate(async ({ roh1, roh2, NAMEN }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof bibliothekAbgleich !== "function"; i++) await w(100);
    if (typeof bibliothekAbgleich !== "function") return { fehlt: true };
    for (let i = 0; i < 40 && !(typeof _eiFormIndex === "function" && _eiFormIndex("Warm up Adler") >= 0); i++) await w(150);
    const alle = JSON.parse(roh1).uebungen.concat(JSON.parse(roh2).uebungen);
    const seg = (q, p) => { const dx = p[2] - p[0], dy = p[3] - p[1], t = Math.max(0, Math.min(1, ((q[0] - p[0]) * dx + (q[1] - p[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] + t * dx - q[0], p[1] + t * dy - q[1]); };
    const out = { eu: _euPruefung(roh1).fehler.concat(_euPruefung(roh2).fehler), ue: [] };
    for (const u of alle) {
      const spec = u.skizze, o = { name: u.name, sk: _eiSkizzeFehler(spec), bilder: skzBildZahl(spec) };
      const d = document.createElement("div"); d.innerHTML = _skz(spec);
      o.viewBox = d.querySelector("svg").getAttribute("viewBox");
      o.oben = [...d.querySelectorAll("text")].filter(t => Number(t.getAttribute("y")) === 13 && t.textContent.length > 10).map(t => t.textContent);
      o.nummern = (spec.p || []).map(p => Number(p[5])).join(",");
      o.eng = []; (spec.s || []).forEach((x, i) => spec.s.forEach((y, j) => { if (j > i && Math.hypot(x[0] - y[0], x[1] - y[1]) < 24) o.eng.push(i + "↔" + j); }));
      o.koll = [];
      (spec.p || []).forEach(p => {
        const dx = p[2] - p[0], dy = p[3] - p[1], len = Math.hypot(dx, dy) || 1, kx = p[0] - dx / len * 7, ky = p[1] - dy / len * 7;
        (spec.s || []).forEach(sp => { const a = Math.hypot(kx - sp[0], ky - sp[1]); if (a < 16) o.koll.push(`Nummer ${p[5]} auf Spieler (${a.toFixed(1)})`); });
        (spec.h || []).forEach(g => { if (Math.hypot(kx - g[0], ky - g[1]) < 10) o.koll.push(`Nummer ${p[5]} auf Hütchen`); });
        (spec.b || []).forEach(b => { if (Math.hypot(kx - b[0], ky - b[1]) < 9.5) o.koll.push(`Nummer ${p[5]} auf dem Ball`); });
      });
      const p1 = (spec.p || []).find(p => Number(p[5]) === 1);
      o.p1Huetchen = p1 ? seg([140, 113], p1) : 0;
      o.material = skzMaterialText(spec);
      o.trainer = skzMaterial(spec).some(x => x.schluessel === "trainer");
      o.art = typeof _tpArtVorschlag === "function" ? _tpArtVorschlag({ name: u.name }) : "";
      o.vorher = typeof _eiFormIndex === "function" ? _eiFormIndex(u.name) : null;
      out.ue.push(o);
    }
    try { localStorage.removeItem(BIB_STAND_KEY); } catch (e) { }
    out.abgleich = await bibliothekAbgleich();
    out.zweiter = await bibliothekAbgleich();
    return out;
  }, { roh1, roh2, NAMEN }).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["bibliothekAbgleich fehlt"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  // a)
  if (!r.abgleich || r.abgleich.angelegt !== 4 || angelegt.filter(Boolean).sort().join("|") !== NAMEN.slice().sort().join("|")) probleme.push(`a) Abgleich: ${JSON.stringify(r.abgleich)}, angelegt ${JSON.stringify(angelegt)}`);
  if (r.zweiter !== null && r.zweiter !== undefined) probleme.push("a) der zweite Lauf hat trotz gleichem Stand gearbeitet");
  if (r.eu.length) probleme.push("b) _euPruefung: " + r.eu.join(" · "));
  for (const o of r.ue) {
    const n = `„${o.name}“`;
    if (o.vorher !== -1) probleme.push(`a) ${n} kannte die App schon vor dem Abgleich`);
    if (o.sk.length) probleme.push(`b) ${n} _eiSkizzeFehler: ${o.sk.join(" · ")}`);
    if (o.bilder !== 1 || o.viewBox !== "0 0 280 180") probleme.push(`c) ${n}: ${o.bilder} Bilder, ${o.viewBox}`);
    if (!/^1(,\d)*$/.test(o.nummern) || o.nummern.split(",").some((x, i) => Number(x) !== i + 1)) probleme.push(`c) ${n}: Schritte ${o.nummern}`);
    if (o.oben.length !== 1) probleme.push(`c) ${n}: Beschriftung oben ${JSON.stringify(o.oben)}`);
    if (o.eng.length) probleme.push(`d) ${n}: Spieler zu eng ${o.eng.join(", ")}`);
    if (o.koll.length) probleme.push(`d) ${n}: ${o.koll.join(" · ")}`);
    if (o.material !== MATERIAL[o.name] || o.trainer) probleme.push(`f) ${n}: Material ${o.material}`);
    if (o.art !== "spiel") probleme.push(`g) ${n}: Übungsart ${o.art}`);
  }
  // e)
  const S = name => soll.find(u => u.name === name).skizze;
  const s2 = S("Lehrgang – Fünf-Sekunden-Jagd"), feld = s2.z[0];
  const ez = s2.z.slice(1);
  if (ez.length !== 2 || ez[0][0] !== feld[0] || ez[1][0] + ez[1][2] !== feld[0] + feld[2] || ez.some(z => z[1] !== feld[1] || z[3] !== feld[3])) probleme.push("e) Übung 2: Endzonen nicht bündig mit dem Feld " + JSON.stringify(s2.z));
  const s3 = S("Lehrgang – Erster attackiert, Zweiter sichert"), f3 = s3.z[0], mitte = f3[1] + f3[3] / 2;
  [f3[0], f3[0] + f3[2]].forEach(x => {
    const paar = s3.dtor.filter(t => t[0] === x);
    const m = paar.map(t => t[1] + t[2] / 2).sort((a, b) => a - b);
    if (paar.length !== 2 || Math.abs((m[0] + m[1]) / 2 - mitte) > 0.5) probleme.push(`e) Übung 3: Dribbeltore bei x ${x} nicht symmetrisch (Mitten ${m.join(", ")})`);
  });
  const o4 = r.ue.find(o => o.name === "Lehrgang – Drei Bahnen, klare Zuständigkeit");
  if (!o4 || o4.p1Huetchen < 6) probleme.push(`e) Übung 4: Pfeil 1 läuft durch das Hütchen (140, 113): ${o4 && o4.p1Huetchen.toFixed(1)}`);
  // g)
  const text = JSON.stringify(soll); const kn = h.KINDER.filter(n => text.includes(n));
  if (kn.length) probleme.push("g) Kindername: " + kn.join(", "));
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`Abgleich legt 4 an (Bestand ${bestand.length} übersprungen) · je 1 Bild quer, Nummern frei, Abstände ≥ 24 · Dribbeltore symmetrisch · Pfeil 1 in Übung 4 mit ${o4 ? o4.p1Huetchen.toFixed(1) : "?"} Abstand zum Hütchen`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
