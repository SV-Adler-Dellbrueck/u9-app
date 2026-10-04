/* v746 · Kassenbelege und Aushang-Fotos ohne Quadrat-Zuschnitt
   Befund: kasseBelegHochladen verkleinerte Fotos mit fotoCompress – das schneidet mittig quadratisch zu
   (gebaut für Spielerfotos). Bei einem langen Kassenbon fehlten oben und unten Händler, Datum und Summe.
   Dasselbe galt für das Foto vom Turnier-Aushang. PO 04.10.: Kachel „So bauen“.
   a) Kasse: ein 600×2400-Bon wird als 400×1600 hochgeladen (Seitenverhältnis bleibt, längste Seite 1600)
   b) fotoVerkleinern lässt kleine Bilder in Originalgröße
   c) Spielerfotos bleiben quadratisch (fotoCompress unverändert)
   d) Aushang-Upload im Turnierplan nutzt nicht mehr fotoCompress */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 1200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 40 && typeof kasseBelegHochladen !== "function"; i++) await w(100);
    if (typeof kasseBelegHochladen !== "function") return { fehlt: true };
    const bild = async (bw, bh) => { const cv = document.createElement("canvas"); cv.width = bw; cv.height = bh; cv.getContext("2d").fillRect(0, 0, 10, 10);
      return new File([await new Promise(x => cv.toBlob(x, "image/png"))], "bon.png", { type: "image/png" }); };
    const masse = async b => { const im = await createImageBitmap(b); return im.width + "x" + im.height; };
    const echt = window.fetch; let koerper = null, ziel = "";
    window.fetch = async (u, o) => { if (/\/storage\/v1\/object\/kasse-belege\//.test(String(u)) && o && o.method === "POST") { koerper = o.body; ziel = String(u); return new Response("{}", { status: 200 }); } return echt(u, o); };
    try { out.pfad = await kasseBelegHochladen(await bild(600, 2400)); } catch (e) { out.err = String(e); }
    window.fetch = echt;
    out.a = koerper ? await masse(koerper) : null; out.typ = koerper && koerper.type; out.ziel = ziel.replace(/^.*\/object\//, "");
    out.b = typeof fotoVerkleinern === "function" ? await masse(await fotoVerkleinern(await bild(300, 500), 1600)) : null;
    out.c = await masse(await fotoCompress(await bild(600, 2400), 400));
    return out;
  });
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v746 Belege ohne Zuschnitt", false, ["kasseBelegHochladen fehlt"]);
  if (r.a !== "400x1600" || r.typ !== "image/jpeg" || !/^kasse-belege\/[^/]+\.jpg$/.test(r.ziel)) probleme.push(`a) Beleg: ${JSON.stringify(r)}`);
  zeilen.push(`a) Bon 600×2400 → hochgeladen als ${r.a} (${r.ziel})`);
  if (r.b !== "300x500") probleme.push(`b) kleines Bild: ${r.b}`);
  zeilen.push(`b) 300×500 bleibt ${r.b}`);
  if (r.c !== "400x400") probleme.push(`c) Spielerfoto: ${r.c}`);
  zeilen.push(`c) Spielerfoto weiter quadratisch: ${r.c}`);
  const tp = fs.readFileSync(path.join(h.REPO, "md-turnierplan.js"), "utf8").split("\n").filter(z => /istPdf\?file:/.test(z));
  if (tp.length !== 2 || tp.some(z => /fotoCompress/.test(z)) || tp.some(z => !/fotoVerkleinern/.test(z))) probleme.push(`d) Aushang: ${tp.map(z => z.trim()).join(" | ")}`);
  zeilen.push(`d) Aushang-Upload (${tp.length}×) über fotoVerkleinern`);
  if (f1.length) probleme.push("Konsole: " + f1.join(" | "));
  return h.ergebnis("v746 Belege und Aushänge ohne Quadrat-Zuschnitt", !probleme.length, probleme.length ? probleme : zeilen);
};
