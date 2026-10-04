/* v747 · Galerie-Fotos ohne Quadrat-Zuschnitt
   Befund (v746 gemeldet): galerieUpload verkleinerte mit fotoCompress auf ein Quadrat von 1000 px – bei Hoch- und
   Querformat fehlten die Ränder für immer. PO 04.10.: Kachel „Ja, mitziehen“.
   a) Ein Querformat 3200×1800 wird als 1600×900 hochgeladen (Seitenverhältnis bleibt)
   b) Hochformat 900×1600 bleibt 900×1600 (nichts vergrößert, nichts abgeschnitten)
   c) Die Vorschau-Kachel schneidet nur die Anzeige zu (aspect-ratio 1, object-fit cover),
      die Großansicht zeigt das ganze Bild (object-fit contain) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 1200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof galerieUpload !== "function"; i++) await w(100);
    if (typeof galerieUpload !== "function") return { fehlt: true };
    const bild = async (bw, bh) => { const cv = document.createElement("canvas"); cv.width = bw; cv.height = bh; cv.getContext("2d").fillRect(0, 0, 10, 10);
      return new File([await new Promise(x => cv.toBlob(x, "image/png"))], "f.png", { type: "image/png" }); };
    const inp = document.createElement("input"); inp.type = "file"; inp.multiple = true; inp.id = "gal-test"; inp.style.display = "none"; document.body.appendChild(inp);
    const dt = new DataTransfer(); dt.items.add(await bild(3200, 1800)); dt.items.add(await bild(900, 1600)); inp.files = dt.files;
    const echt = window.fetch, blobs = [];
    window.fetch = async (u, o) => {
      if (/\/storage\/v1\/object\/termin_media\//.test(String(u)) && o && o.method === "POST") { blobs.push(o.body); return new Response("{}", { status: 200 }); }
      if (/\/rest\/v1\/termin_media/.test(String(u)) && o && o.method === "POST") return new Response("", { status: 201 });
      return echt(u, o);
    };
    try { await galerieUpload(null, 91, "gal-test"); } catch (e) {}
    window.fetch = echt;
    const out = [];
    for (const b of blobs) { const im = await createImageBitmap(b); out.push(im.width + "x" + im.height); }
    return { masse: out };
  });
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v747 Galerie ohne Zuschnitt", false, ["galerieUpload fehlt"]);
  if ((r.masse || [])[0] !== "1600x900") probleme.push(`a) Querformat: ${JSON.stringify(r.masse)}`);
  zeilen.push(`a) 3200×1800 → ${(r.masse || [])[0]}`);
  if ((r.masse || [])[1] !== "900x1600") probleme.push(`b) Hochformat: ${JSON.stringify(r.masse)}`);
  zeilen.push(`b) 900×1600 → ${(r.masse || [])[1]}`);
  const src = fs.readFileSync(path.join(h.REPO, "md-galerie.js"), "utf8");
  const vorschau = /id="gal-img-[^>]*aspect-ratio:1;object-fit:cover/.test(src), gross = /id="gal-gross-img"[^>]*object-fit:contain/.test(src);
  if (!vorschau || !gross) probleme.push(`c) Vorschau cover: ${vorschau} · Großansicht contain: ${gross}`);
  zeilen.push("c) Vorschau quadratisch nur in der Anzeige, Großansicht zeigt das ganze Foto");
  if (f1.length) probleme.push("Konsole: " + f1.join(" | "));
  return h.ergebnis("v747 Galerie-Fotos ohne Quadrat-Zuschnitt", !probleme.length, probleme.length ? probleme : zeilen);
};
