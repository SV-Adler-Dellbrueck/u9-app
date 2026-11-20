/* v907 · Wappen beim Festival (Charles 20.11., Bild vom Festival-Link):
   a) Unser Logo hatte weiße Ecken – mit dem Schatten der Medaille ein weißer Rahmen. logo.png ist jetzt in den
      Ecken durchsichtig (Palette mit tRNS oder RGBA).
   b) „SC SW Köln U9 I“ fand „SC Schwarz-Weiß Köln“ nicht. Farbkürzel (SW → schwarz weiss) und Mannschaftszusätze
      (U9, I, II, 2) zählen beim Abgleich mit der Gegnerdatenbank nicht als Unterschied.
   c) Am gerenderten Festival-Link: beide Gastvereine zeigen ihr Wappen als Bild, keine Initialen. */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
function pngInfo(buf) {
  const typ = buf[25]; let i = 8, trns = false, idat = [];
  while (i < buf.length) { const n = buf.readUInt32BE(i), t = buf.toString("ascii", i + 4, i + 8); if (t === "tRNS") trns = true; if (t === "IDAT") idat.push(buf.slice(i + 8, i + 8 + n)); i += 12 + n; }
  return { typ, trns, w: buf.readUInt32BE(16) };
}
module.exports = async function (h) {
  const titel = "v907 Wappen beim Festival: Adler-Logo ohne weißen Rahmen, SC SW Köln findet sein Wappen";
  const probleme = [], zeilen = [];
  const png = pngInfo(fs.readFileSync(path.join(h.REPO, "logo.png")));
  if (!(png.typ === 6 || png.typ === 4 || (png.typ === 3 && png.trns))) probleme.push(`a) logo.png ohne Transparenz (Farbtyp ${png.typ}, tRNS ${png.trns})`);
  zeilen.push(`a) logo.png: Farbtyp ${png.typ}${png.trns ? " mit tRNS" : ""}, ${png.w} px`);
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }) });
  const r = await s.page.evaluate(async () => {
    for (let i = 0; i < 40 && typeof _htWappenFinden !== "function"; i++) await new Promise(x => setTimeout(x, 100));
    const liste = [{ name: "SC Schwarz-Weiß Köln", wappen_url: "https://x.test/sw.gif" }, { name: "RSV Rath-Heumar", wappen_url: "https://x.test/rath.webp" }, { name: "SC Wahn-Grengel", wappen_url: "https://x.test/wahn.png" }];
    const f = n => _htWappenFinden(liste, n);
    const b = { sw: f("SC SW Köln U9 I"), rath: f("Rath Heumar U9 II"), wahn: f("SC Wahn Grengel 2"), adler: f("SV Adler Dellbrück") };
    const cfg = { art: "festival", start: "10:15", spieldauer: 8, felder: [{ form: "f4" }, { form: "funino" }, { form: "funino" }],
      vereine: [{ name: "SV Adler Dellbrück", teams: 1 }, { name: "Rath Heumar U9 II", teams: 1 }, { name: "SC SW Köln U9 I", teams: 1 }],
      wappen: { "SV Adler Dellbrück": "logo.png", "Rath Heumar U9 II": "https://x.test/rath.webp", "SC SW Köln U9 I": "https://x.test/sw.gif" } };
    const teams = ["Adler Dellbrück", "Rath Heumar U9 II", "SW Köln U9 I"];
    const row = { name: "Kinderfestival", datum: "2026-11-21", teams, plan: [{ runde: 1, zeit: "10:15", feld: 1, a: 0, b: 1, form: "f4" }], config: cfg };
    const wrap = document.createElement("div"); wrap.id = "ht-public"; document.body.appendChild(wrap);
    _htPub = { row }; _fstPublicRender(wrap, row);
    const auf = [...wrap.querySelectorAll("div")].find(d => /Aufwärmen/.test(d.textContent) && d.querySelectorAll(".htp-wp").length >= 3 && d.children.length < 8);
    const wp = auf ? [...auf.querySelectorAll(".htp-wp")] : [];
    return { b, bilder: wp.filter(x => x.querySelector("img")).length, ini: wp.filter(x => x.classList.contains("ini")).length };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (!/sw\.gif/.test(r.b.sw || "")) probleme.push(`b) SC SW Köln U9 I → ${r.b.sw}`);
  if (!/rath/.test(r.b.rath || "") || !/wahn/.test(r.b.wahn || "")) probleme.push(`b) Rath/Wahn: ${r.b.rath} / ${r.b.wahn}`);
  if (r.b.adler) probleme.push(`b) Adler findet fremdes Wappen ${r.b.adler}`);
  if (r.bilder < 3 || r.ini) probleme.push(`c) Aufwärmen: ${r.bilder} Wappen als Bild, ${r.ini} als Initialen`);
  zeilen.push(`b) SW Köln → sw.gif, Rath → rath, Wahn → wahn · c) ${r.bilder} Wappen als Bild`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : zeilen);
};
