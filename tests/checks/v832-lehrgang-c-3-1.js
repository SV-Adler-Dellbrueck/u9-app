/* v832 · C-Lizenz Aufgabe 3.1 (Gruppenarbeit): „Lehrgang – Zwei-Seiten-Spiel“.
   Auftragspaket `doku/auftrag-lehrgang-c-3-1/`. Spielform 4 gegen 4, Thema Spielverlagerung; die Skizze
   entsteht wie bei den Basis-Coach-Abgaben in der App. Die Übung ist ein gewöhnlicher Eintrag der Bibliothek.

   a) Der Abgleich legt die neue Übung an und überspringt den Bestand: Stehen alle anderen schon in der
      Datenbank, wird genau eine angelegt; ein zweiter Lauf tut nichts.
   b) Nachtrag und Bibliothek tragen dieselbe Übung, Zeichen für Zeichen; _euPruefung und _eiSkizzeFehler
      ohne Befund; Stand mindestens 2026-11-13-1.
   c) Die Skizze rendert: ein Bild, quer, 8 Spieler, 3 Wege (2 Pässe, 1 Schuss), Schritte 1–3, Beschriftung.
   d) Kein Spielerkreis näher als 24 an einem anderen; kein Nummernkreis auf Spieler (≥ 16), Gerät oder Ball;
      Pfeil 2 (Verlagerung) läuft an keinem Gegnerkreis vorbei, der ihn berührt (Abstand ≥ 12).
   e) Die Minitore sitzen hinter den Grundlinien (Kante an der Zone) und symmetrisch zur Mittellinie –
      im Nachtrag standen sie zuerst, als wäre die Koordinate der Mittelpunkt (sie ist die Ecke).
   f) Material: 4 Minitore, 6 Hütchen, 1 Ball – der Trainer zählt nicht.
   g) Übungsart „spiel“ (= Spielform, wie beim Basis-Coach-Paket beschlossen); keine Kindernamen. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v832 Lehrgang C-3.1: Zwei-Seiten-Spiel – Abgleich, Skizze, Abstände, Tore, Material";
  const probleme = [], zeilen = [];
  const NAME = "Lehrgang – Zwei-Seiten-Spiel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const roh = fs.readFileSync(path.join(h.REPO, "doku/auftrag-lehrgang-c-3-1/nachtrag.json"), "utf8");
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis(titel, false, ["Die Übung steht nicht in der Bibliothek (Stand vor v832)"]);
  const soll = JSON.parse(roh).uebungen[0];
  if (JSON.stringify(u) !== JSON.stringify(soll)) probleme.push("b) bibliothek.json und nachtrag.json tragen verschiedene Fassungen");
  if (bib.uebungen.filter(x => x.name === NAME).length !== 1) probleme.push("b) die Übung steht mehrfach in der Bibliothek");
  const rang = x => String(x || "").split("-").map(t => parseInt(t, 10) || 0);
  const mind = (a, b) => { a = rang(a); b = rang(b); for (let i = 0; i < Math.max(a.length, b.length); i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0); } return true; };
  if (!mind(bib.stand, "2026-11-13-1")) probleme.push(`b) Stand „${bib.stand}“ liegt vor 2026-11-13-1`);

  // Bestand in der Datenbank: alle Übungen der Bibliothek außer der neuen
  let naechste = 1;
  const bestand = bib.uebungen.filter(x => x.name !== NAME).map(x => ({ id: naechste++, ...x, skizze: x.skizze || null }));
  const angelegt = [];
  const s = await h.starten({ breite: 900, hoehe: 1000, warten: 400, bibliothek: true,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      trainingsformen: (url, req) => {
        if (req.method() === "POST") { try { const b = JSON.parse(req.postData() || "null"); (Array.isArray(b) ? b : [b]).forEach(x => angelegt.push(x && x.name)); } catch (e) { } return { status: 201, body: "[]" }; }
        if (req.method() === "PATCH") return { status: 204, body: "" };
        return bestand;
      },
      team_config: (url, req) => req.method() !== "GET" ? { status: 201, body: "[]" } : [] }) });
  const r = await s.page.evaluate(async ({ roh, NAME }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof bibliothekAbgleich !== "function"; i++) await w(100);
    if (typeof bibliothekAbgleich !== "function") return { fehlt: true };
    for (let i = 0; i < 40 && !(typeof _eiFormIndex === "function" && _eiFormIndex("Warm up Adler") >= 0); i++) await w(150);
    const spec = JSON.parse(roh).uebungen[0].skizze;
    const out = { eu: _euPruefung(roh).fehler, sk: _eiSkizzeFehler(spec), bilder: skzBildZahl(spec) };
    const d = document.createElement("div"); d.innerHTML = _skz(spec);
    const svg = d.querySelector("svg");
    out.viewBox = svg.getAttribute("viewBox");
    out.spieler = d.querySelectorAll('circle[r="8"]').length;
    out.wege = d.querySelectorAll("line[marker-end]").length + d.querySelectorAll("path[marker-end]").length;
    out.text = [...d.querySelectorAll("text")].map(t => t.textContent).join(" | ");
    out.nummern = (spec.p || []).map(p => Number(p[5]));
    const eng = [], koll = [];
    (spec.s || []).forEach((x, i) => spec.s.forEach((y, j) => { if (j > i && Math.hypot(x[0] - y[0], x[1] - y[1]) < 24) eng.push(i + "↔" + j); }));
    (spec.p || []).forEach(p => {
      const dx = p[2] - p[0], dy = p[3] - p[1], len = Math.hypot(dx, dy) || 1, kx = p[0] - dx / len * 7, ky = p[1] - dy / len * 7;
      (spec.s || []).forEach(sp => { if (Math.hypot(kx - sp[0], ky - sp[1]) < 16) koll.push(`Nummer ${p[5]} auf Spieler (${Math.round(Math.hypot(kx - sp[0], ky - sp[1]))})`); });
      (spec.ger || []).forEach(g => { if (Math.hypot(kx - g[0], ky - g[1]) < 11) koll.push(`Nummer ${p[5]} auf ${g[2]}`); });
      (spec.b || []).forEach(b => { if (Math.hypot(kx - b[0], ky - b[1]) < 9.5) koll.push(`Nummer ${p[5]} auf dem Ball`); });
    });
    const seg = (q, p) => { const dx = p[2] - p[0], dy = p[3] - p[1], t = Math.max(0, Math.min(1, ((q[0] - p[0]) * dx + (q[1] - p[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] + t * dx - q[0], p[1] + t * dy - q[1]); };
    const p2 = (spec.p || []).find(p => Number(p[5]) === 2);
    out.p2Abstand = p2 ? Math.min(...spec.s.filter(x => x[2] === "r").map(x => seg(x, p2))) : 0;
    out.eng = eng; out.koll = koll;
    out.material = skzMaterial(spec).map(x => `${x.anzahl} ${x.was}`);
    out.materialSchluessel = skzMaterial(spec).map(x => x.schluessel);
    out.art = (typeof UEBUNG_ART_VORSCHLAG !== "undefined" ? UEBUNG_ART_VORSCHLAG : {})[NAME];
    out.artAufgeloest = typeof _tpArtVorschlag === "function" ? _tpArtVorschlag({ name: NAME }) : "";
    out.vorher = typeof _eiFormIndex === "function" ? _eiFormIndex(NAME) : null;
    try { localStorage.removeItem(BIB_STAND_KEY); } catch (e) { }
    out.abgleich = await bibliothekAbgleich();
    out.zweiter = await bibliothekAbgleich();
    return out;
  }, { roh, NAME }).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["bibliothekAbgleich fehlt"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  // a)
  if (r.vorher !== -1) probleme.push(`a) die neue Übung kannte die App schon vor dem Abgleich (Index ${r.vorher})`);
  if (!r.abgleich || r.abgleich.angelegt !== 1 || angelegt.filter(Boolean).join() !== NAME) probleme.push(`a) Abgleich: ${JSON.stringify(r.abgleich)}, angelegt ${JSON.stringify(angelegt)} – erwartet genau „${NAME}“`);
  if (r.zweiter !== null && r.zweiter !== undefined) probleme.push("a) der zweite Lauf hat trotz gleichem Stand gearbeitet");
  // b)
  if (r.eu.length) probleme.push("b) _euPruefung: " + r.eu.join(" · "));
  if (r.sk.length) probleme.push("b) _eiSkizzeFehler: " + r.sk.join(" · "));
  // c)
  if (r.bilder !== 1) probleme.push(`c) ${r.bilder} Bilder statt einem`);
  if (r.viewBox !== "0 0 280 180") probleme.push(`c) Format ${r.viewBox} statt quer`);
  if (r.spieler !== 8) probleme.push(`c) ${r.spieler} Spieler statt acht`);
  if (r.wege !== 3) probleme.push(`c) ${r.wege} Wege statt drei`);
  if (String(r.nummern) !== "1,2,3") probleme.push(`c) Schritte ${r.nummern}`);
  if (!/Seitenwechsel Pflicht vor jedem Torschuss/.test(r.text)) probleme.push("c) Beschriftung fehlt");
  // d)
  if (r.eng.length) probleme.push("d) Spieler zu eng: " + r.eng.join(", "));
  if (r.koll.length) probleme.push("d) Nummernkreise verdeckt: " + r.koll.join(" · "));
  if (r.p2Abstand < 12) probleme.push(`d) Pfeil 2 kommt einem Gegner auf ${r.p2Abstand.toFixed(1)} nahe (nötig 12)`);
  // e) Tore: Ecke ist die Koordinate; Kante an der Zone, Mitte symmetrisch zur Mittellinie
  const z = u.skizze.z[0], mitteY = u.skizze.li[0][1];
  const links = u.skizze.tor.filter(t => t[0] < 140), rechts = u.skizze.tor.filter(t => t[0] > 140);
  if (links.length !== 2 || rechts.length !== 2) probleme.push("e) nicht je zwei Tore an beiden Grundlinien");
  links.forEach(t => { if (t[0] + 7 !== z[0]) probleme.push(`e) linkes Tor bei x ${t[0]}: Kante ${t[0] + 7} statt an der Grundlinie ${z[0]}`); });
  rechts.forEach(t => { if (t[0] !== z[0] + z[2]) probleme.push(`e) rechtes Tor bei x ${t[0]} statt an der Grundlinie ${z[0] + z[2]}`); });
  [links, rechts].forEach(paar => { if (paar.length === 2) { const m = paar.map(t => t[1] + t[3] / 2).sort((a, b) => a - b); if (Math.abs((m[0] + m[1]) / 2 - mitteY) > 0.5) probleme.push(`e) Tore nicht symmetrisch zur Mittellinie (Mitten ${m.join("/")}, Linie ${mitteY})`); } });
  // f)
  ["4 Minitore", "6 Hütchen", "1 Ball"].forEach(m => { if (!r.material.includes(m)) probleme.push(`f) Material ohne „${m}“: ${r.material.join(", ")}`); });
  if (r.material.length !== 3) probleme.push(`f) ${r.material.length} Posten statt drei: ${r.material.join(", ")}`);
  if (r.materialSchluessel.includes("trainer")) probleme.push("f) der Trainer steht in der Materialliste");
  // g)
  if (r.art !== "spiel" || r.artAufgeloest !== "spiel") probleme.push(`g) Übungsart ${r.art} / ${r.artAufgeloest} statt spiel`);
  const text = JSON.stringify(u); const kn = h.KINDER.filter(n => text.includes(n));
  if (kn.length) probleme.push("g) Kindername: " + kn.join(", "));
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`Abgleich legt 1 an (Bestand ${bestand.length} übersprungen) · 1 Bild quer, 8 Spieler, 3 Wege · Pfeil 2 mit ${r.p2Abstand.toFixed(1)} Abstand · Material ${r.material.join(" · ")}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
