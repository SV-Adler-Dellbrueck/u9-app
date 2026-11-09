/* v818 · Leistung: Die Icon-Schrift ist ein Zuschnitt.
   Bis v817 lud jedes Gerät mit jeder Version alle 5.717 Tabler-Icons (865 KB Schrift, 238 KB CSS) –
   gebraucht werden rund 150. Seit v818 liegen in vendor/ nur noch die genutzten; die Vollfassung
   steht unter tools/quelle/ und tools/icons-zuschneiden.js baut daraus den Zuschnitt.

   Die Gefahr dabei: Wer ein neues Icon in den Code schreibt und den Zuschnitt nicht neu baut,
   bekommt ein leeres Kästchen – ohne Fehlermeldung. Deshalb:

   a) Jedes Icon, das der App-Code nennt, hat eine Regel im Zuschnitt-CSS; zusammengesetzte
      Namen (ti-${…}) sind alle auflösbar.
   b) Zu jeder Regel im Zuschnitt-CSS gibt es die Glyphe wirklich in der Schrift (am Bildschirm
      gemessen: das Zeichen sieht in der Icon-Schrift anders aus als ohne sie).
   c) Der Zuschnitt ist klein geblieben (niemand hat die Vollfassung zurückkopiert) und die
      Vollfassung liegt als Quelle bereit.
   Abhilfe bei Rot: node tools/icons-zuschneiden.js --schreiben (setzt auch den Namen des festen Caches in sw.js neu). */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v818 Icon-Schrift als Zuschnitt: jedes genutzte Icon ist enthalten";
  const R = h.REPO, probleme = [], zeilen = [];
  const werkzeug = path.join(R, "tools/icons-zuschneiden.js");
  if (!fs.existsSync(werkzeug)) return h.ergebnis(titel, false, ["tools/icons-zuschneiden.js fehlt – kein Zuschnitt (Stand vor v818)"]);
  const w = require(werkzeug);
  for (const f of [w.VOLL_CSS, w.VOLL_FONT, w.ZIEL_CSS, w.ZIEL_FONT])
    if (!fs.existsSync(path.join(R, f))) probleme.push(`c) ${f} fehlt`);
  if (probleme.length) return h.ergebnis(titel, false, probleme);

  // a) Menge
  const { genutzt, ungeloest } = w.sammeln(R);
  const zuschnitt = w.regeln(fs.readFileSync(path.join(R, w.ZIEL_CSS), "utf8"));
  const fehlt = [...genutzt].filter(n => !zuschnitt.has(n)).sort();
  if (fehlt.length) probleme.push(`a) im Code genutzt, aber nicht im Zuschnitt: ${fehlt.join(", ")} → node tools/icons-zuschneiden.js --schreiben`);
  if (ungeloest.length) probleme.push(`a) zusammengesetzter Icon-Name nicht auflösbar: ${ungeloest.join(", ")}`);
  if (genutzt.size < 50) probleme.push(`a) nur ${genutzt.size} Icons im Code gefunden – die Suche greift nicht mehr`);

  // c) Größe
  const kb = f => fs.statSync(path.join(R, f)).size / 1024;
  if (kb(w.ZIEL_FONT) > 120) probleme.push(`c) ${w.ZIEL_FONT} hat ${kb(w.ZIEL_FONT).toFixed(0)} KB – das ist kein Zuschnitt mehr`);
  if (kb(w.ZIEL_CSS) > 40) probleme.push(`c) ${w.ZIEL_CSS} hat ${kb(w.ZIEL_CSS).toFixed(0)} KB – das ist kein Zuschnitt mehr`);

  // b) Glyphen am Bildschirm
  const s = await h.starten({ start: "/trainer/index.html", supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const liste = [...zuschnitt].map(([name, hex]) => ({ name, cp: parseInt(hex, 16) }));
  const r = await s.page.evaluate(async liste => {
    await document.fonts.ready;
    try { await document.fonts.load('40px "tabler-icons"', String.fromCodePoint(liste[0].cp)); } catch (e) {}
    const geladen = [...document.fonts].some(f => f.status === "loaded" && f.family.replace(/"/g, "") === "tabler-icons");
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const x = c.getContext("2d", { willReadFrequently: true });
    const bild = (schrift, z) => {
      x.clearRect(0, 0, 64, 64); x.font = schrift; x.textBaseline = "top"; x.fillStyle = "#000"; x.fillText(z, 8, 8);
      const d = x.getImageData(0, 0, 64, 64).data; let farbe = 0, sum = 0;
      for (let i = 3; i < d.length; i += 4) { if (d[i]) farbe++; sum = (sum * 31 + d[i]) >>> 0; }
      return { farbe, sum };
    };
    const leer = [];
    liste.forEach(e => {
      const z = String.fromCodePoint(e.cp);
      const mit = bild('40px "tabler-icons", serif', z), ohne = bild("40px serif", z);
      if (!mit.farbe || (mit.farbe === ohne.farbe && mit.sum === ohne.sum)) leer.push(e.name);
    });
    // Gegenprobe: ein Zeichen, das im Zuschnitt sicher NICHT steht, muss als fehlend erkannt werden –
    // sonst misst die Prüfung nichts.
    const fremd = String.fromCodePoint(0xf8fe);
    const m = bild('40px "tabler-icons", serif', fremd), o = bild("40px serif", fremd);
    return { geladen, leer, gegenprobe: m.farbe === o.farbe && m.sum === o.sum };
  }, liste);
  const fe = s.fehler(); await s.schliessen();
  if (!r.geladen) probleme.push("b) Icon-Schrift wurde nicht geladen");
  if (!r.gegenprobe) probleme.push("b) Gegenprobe schlägt nicht an: ein fremdes Zeichen gilt als vorhanden – die Messung taugt nicht");
  if (r.leer.length) probleme.push(`b) Regel im CSS, aber keine Glyphe in der Schrift: ${r.leer.slice(0, 12).join(", ")}${r.leer.length > 12 ? " …" : ""} → node tools/icons-zuschneiden.js --schreiben`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));

  zeilen.push(`${genutzt.size} Icons im Code, ${zuschnitt.size} im Zuschnitt · Schrift ${kb(w.ZIEL_FONT).toFixed(1)} KB, CSS ${kb(w.ZIEL_CSS).toFixed(1)} KB (Vollfassung ${kb(w.VOLL_FONT).toFixed(0)} + ${kb(w.VOLL_CSS).toFixed(0)} KB)`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
