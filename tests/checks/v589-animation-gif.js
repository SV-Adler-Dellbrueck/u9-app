/* v589 – Die ganze Übung als eine Animation, außerhalb der App.

   Charles am 20.09.: „Kannst du zusätzlich eine Animation machen, die alle Bilder vereint?
   Also eine durchlaufende Animation der ganzen Übung?" In der App tut das „Abspielen"; für
   Drive, WhatsApp und die Abgabe gab es davon keine Datei. `exportAnimation` in
   doku/auftrag-lehrgangsskizzen/export-skizzen.js schreibt ein animiertes GIF aus GENAU den
   Zwischenbildern und Zeiten des Abspielens.

   Geprüft wird nicht, ob es hübsch ist, sondern ob es die Animation der App ist und ob die
   Datei stimmt:
   a) Die Bildzahl folgt der Zeitleiste der App: je Bild SKZ_STAND Standzeit, je Übergang
      _skzGleitDauer, am Ende die Schlusspause – gerechnet aus denselben Funktionen.
   b) Die Datei ist ein gültiges GIF89a: Kopf, Maße, Schleife, genau so viele Bilder, und
      jedes Bild lässt sich mit einem eigenen kleinen LZW-Dekoder auf Breite × Höhe Pixel
      entpacken – ein Kodierfehler fiele hier auf, nicht erst im Bildbetrachter.
   c) Der Legendenstreifen ist in jedem Bild gleich hoch (er kommt aus der ganzen
      Beschreibung, nicht aus dem einzelnen Zwischenbild) – gemessen an der Bildhöhe, die
      zur Legende der Sieben-Bilder-Skizze passt.
   Klein gehalten (2 Bilder je Sekunde, 180 px breit), damit die Prüfung schnell bleibt. */
const fs = require("fs"), path = require("path"), os = require("os");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const NAME = "Raute mit Torwart – Angriff über den anderen Flügel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis("Animation der ganzen Übung (GIF)", false, ["Die Übung steht nicht in der Bibliothek"]);

  // a) Soll-Zahl der Bilder aus den Funktionen der App
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const soll = await s.page.evaluate(({ spec, fps, schlussMs }) => {
    const n = skzBildZahl(spec), schritt = 1000 / fps; let z = 0;
    for (let i = 0; i < n; i++) {
      z += Math.round(((i === n - 1) ? schlussMs : SKZ_STAND) / schritt);
      if (i === n - 1) break;
      const a = _skzBild(spec, i), b = _skzBild(spec, i + 1);
      if (!_skzBewegt(a, b)) { z += 1; continue; }
      z += Math.max(1, Math.round(_skzGleitDauer(a, b) / schritt));
    }
    const L = (typeof skzLegendeArten === "function") ? skzLegendeArten(spec).size : 6;
    return { bilder: z, n, legendeZeilen: Math.max(1, Math.ceil(L / 2)) };
  }, { spec: u.skizze, fps: 2, schlussMs: 2000 });
  await s.schliessen();

  // b) Die Datei
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "adler-gif-"));
  const mod = require(path.join(h.REPO, "doku/auftrag-lehrgangsskizzen/export-skizzen.js"));
  if (typeof mod.exportAnimation !== "function") return h.ergebnis("Animation der ganzen Übung (GIF)", false, ["exportAnimation fehlt in export-skizzen.js"]);
  const log = console.log; console.log = () => {};   // der Export meldet sich selbst – hier nicht
  let datei; try { datei = await mod.exportAnimation({ aus: ziel, muster: /Raute mit Torwart/, slug: "probe", breite: 180, fps: 2 }); } finally { console.log = log; }
  const b = fs.readFileSync(datei);
  const kopf = b.slice(0, 6).toString(), W = b.readUInt16LE(6), H = b.readUInt16LE(8), packed = b[10];
  let p = 13; if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1));
  let frames = 0, schleife = false, dekodiert = 0; const fehler = [];
  const decode = (sub, minCode) => {
    const clear = 1 << minCode, eoi = clear + 1; let codeSize, next, dict, prev = null, out = 0, buf = 0, cnt = 0, pos = 0;
    const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict[i] = [i]; next = eoi + 1; codeSize = minCode + 1; };
    reset();
    for (;;) {
      while (cnt < codeSize && pos < sub.length) { buf |= sub[pos++] << cnt; cnt += 8; }
      if (cnt < codeSize) return out;
      const code = buf & ((1 << codeSize) - 1); buf >>>= codeSize; cnt -= codeSize;
      if (code === clear) { reset(); prev = null; continue; }
      if (code === eoi) return out;
      let e; if (code < next && dict[code]) e = dict[code]; else if (code === next && prev) e = prev.concat([prev[0]]); else throw new Error("ungültiger LZW-Code " + code);
      out += e.length;
      if (prev && next < 4096) { dict[next++] = prev.concat([e[0]]); if (next >= (1 << codeSize) && codeSize < 12) codeSize++; }
      prev = e;
    }
  };
  while (p < b.length) {
    const t = b[p];
    if (t === 0x3B) { p++; break; }
    if (t === 0x21) { if (b[p + 1] === 0xFF && b.slice(p + 3, p + 14).toString() === "NETSCAPE2.0") schleife = true; p += 2; while (b[p] !== 0) p += b[p] + 1; p++; continue; }
    if (t === 0x2C) {
      const w = b.readUInt16LE(p + 5), hh = b.readUInt16LE(p + 7), lp = b[p + 9]; p += 10; if (lp & 0x80) p += 3 * (1 << ((lp & 7) + 1));
      const minCode = b[p++]; const teile = []; while (b[p] !== 0) { teile.push(b.slice(p + 1, p + 1 + b[p])); p += b[p] + 1; } p++;
      frames++;
      try { const n = decode(Buffer.concat(teile), minCode); if (n === w * hh) dekodiert++; else fehler.push(`Bild ${frames}: ${n} statt ${w * hh} Pixel`); }
      catch (e) { fehler.push(`Bild ${frames}: ${e.message}`); }
      continue;
    }
    fehler.push("unbekannter Block 0x" + t.toString(16)); break;
  }
  try { fs.rmSync(ziel, { recursive: true, force: true }); } catch (e) {}

  if (kopf !== "GIF89a") probleme.push(`Kopf „${kopf}“ statt GIF89a`);
  if (!schleife) probleme.push("Keine Endlosschleife (NETSCAPE2.0) – die Animation liefe nur einmal");
  if (frames !== soll.bilder) probleme.push(`${frames} Bilder im GIF, die Zeitleiste der App ergibt ${soll.bilder}`);
  if (dekodiert !== frames) probleme.push(`Nur ${dekodiert} von ${frames} Bildern entpacken sauber: ${fehler.slice(0, 2).join(" · ")}`);
  if (W !== 180) probleme.push(`Breite ${W} statt 180`);
  // c) Höhe = Skizze 280 plus Legende (12 + Zeilen × 16), bei 180 px Breite Maßstab 1
  const sollH = 280 + 12 + soll.legendeZeilen * 16;
  if (H !== sollH) probleme.push(`Höhe ${H} statt ${sollH} – der Legendenstreifen passt nicht zur ganzen Beschreibung (${soll.legendeZeilen} Zeilen)`);

  if (!probleme.length) {
    zeilen.push(`GIF89a ${W}×${H}, ${frames} Bilder bei 2 je Sekunde = Zeitleiste der App für ${soll.n} Skizzenbilder, Endlosschleife`);
    zeilen.push(`Alle ${dekodiert} Bilder entpacken auf ${W}×${H} Pixel; Legende ${soll.legendeZeilen} Zeilen, in jedem Bild gleich`);
  }
  return h.ergebnis("Animation der ganzen Übung (GIF)", !probleme.length, zeilen.concat(probleme));
};
