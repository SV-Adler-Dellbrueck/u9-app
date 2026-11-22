/* v939 · Weihnachtsvideo U9 I – Vorlage und Render-Skript (Auftrag doku/auftrag-weihnachtsvideo, Charles 22.11.2026).
   Die Videos selbst entstehen lokal; hier wird geprüft, was im öffentlichen Repo liegt:
   a) Der Ordner weihnachtsvideo/ (Namen, Fotos, Ton, Videos) steht in der .gitignore – nur im Wurzelverzeichnis, das
      Werkzeug unter tools/weihnachtsvideo/ bleibt sichtbar.
   b) Die Beispieldatei kennt keine Namen (nur „Kind A“ …) und mindestens ein Kind ohne Einverständnis.
   c) Das Render-Skript ist gültiges JavaScript; kein „Bruce“ in Vorlage, Skript und Anleitung.
   d) Am echten DOM: Vorlage für eine Kinderkarte ohne Foto zeigt den winkenden Adler, höchstens 40 Flocken, jede sichtbare
      Schrift ≥ 44 px, Wappen = logo.png; gleiche Zeit ergibt dasselbe Bild (deterministisch). */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path"), cp = require("child_process");
  const probleme = [], zeilen = [];
  const dir = path.join(h.REPO, "tools", "weihnachtsvideo");
  const gi = fs.readFileSync(path.join(h.REPO, ".gitignore"), "utf8");
  if (!/^\/weihnachtsvideo\/$/m.test(gi)) probleme.push("a) .gitignore schließt /weihnachtsvideo/ nicht aus (oder nicht auf das Wurzelverzeichnis begrenzt)");
  const bsp = JSON.parse(fs.readFileSync(path.join(dir, "beispiel", "kinder.beispiel.json"), "utf8")).kinder;
  if (bsp.some(k => !/^Kind [A-O]$/.test(k.anzeige_name)) || !bsp.some(k => k.einverstanden !== true)) probleme.push("b) Beispieldatei: Namen oder kein Kind ohne Einverständnis");
  try { cp.execFileSync("node", ["--check", path.join(dir, "render.mjs")], { stdio: "pipe" }); } catch (e) { probleme.push("c) render.mjs: " + String(e.stderr || e.message).slice(0, 120)); }
  for (const f of ["render.mjs", "vorlage.html", "README.md"]) if (/bruce/i.test(fs.readFileSync(path.join(dir, f), "utf8"))) probleme.push(`c) „Bruce“ in ${f}`);
  const browser = await require("playwright").chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript(() => { window.SZENE = { art: "kind", name: "Kind A", rolle: "Aufpasser", formation: "Raute", foto: null, ersatz: "../../Maskottchen/varianten/adler_winkt_weihnachtsmuetze/adler_winkt_weihnachtsmuetze_mittel.png", adler: "../../Maskottchen/varianten/adler_praesentiert_weihnachtsmuetze/adler_praesentiert_weihnachtsmuetze_mittel.png", amp: [0, .5, 1, .5, 0], fps: 25 }; });
    await page.goto("file://" + path.join(dir, "vorlage.html"));
    const r = await page.evaluate(async () => {
      await einrichten(); zeigeZeit(3.2); const a = document.getElementById("buehne").innerHTML; zeigeZeit(1.1); zeigeZeit(3.2); const b = document.getElementById("buehne").innerHTML;
      const sichtbar = [...document.querySelectorAll("#buehne *")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && getComputedStyle(e).display !== "none" && !e.closest(".aus"));
      return { ersatz: /adler_winkt/.test(document.getElementById("foto-img").getAttribute("src")) && document.getElementById("foto").classList.contains("adler"),
        flocken: document.querySelectorAll(".flocke").length, minSchrift: Math.min(...sichtbar.map(e => parseFloat(getComputedStyle(e).fontSize))),
        wappen: document.getElementById("wappen").getAttribute("src"), gleich: a === b, bildOk: [...document.images].every(i => i.naturalWidth > 0) };
    });
    if (!r.ersatz) probleme.push("d) ohne Foto kein winkender Adler");
    if (r.flocken > 40) probleme.push(`d) ${r.flocken} Flocken`);
    if (r.minSchrift < 44) probleme.push(`d) Schrift ${r.minSchrift} px`);
    if (r.wappen !== "../../logo.png" || !r.bildOk) probleme.push(`d) Wappen/Bilder: ${r.wappen}, alle geladen ${r.bildOk}`);
    if (!r.gleich) probleme.push("d) gleiche Zeit ergibt nicht dasselbe Bild");
    zeilen.push(`a) /weihnachtsvideo/ ignoriert · b) Beispiel ohne Namen · d) ${r.flocken} Flocken, Schrift ≥ ${r.minSchrift} px, ohne Foto der winkende Adler, deterministisch`);
  } catch (e) { probleme.push("d) " + String(e).slice(0, 160)); }
  finally { await browser.close(); }
  return h.ergebnis("v939 Weihnachtsvideo: Vorlage und Render-Skript", !probleme.length, zeilen.concat(probleme));
};
