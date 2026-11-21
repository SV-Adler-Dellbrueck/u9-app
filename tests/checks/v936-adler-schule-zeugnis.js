/* v936 · Adler-Schule mit Zeugnis (Charles 21.11.2026, Entwurf freigegeben: „Stunden zuerst“, „nur Adler-Schule“).

   a) Kabine: keine Kacheln „Taktik-Quiz“ und „Fußball-Wissen“ mehr; die breite Kachel „Adler-Schule“ bleibt;
      der Rundgang zeigt keine verschwundene Kachel.
   b) Die Schule (tqStart) heißt „🎓 Adler-Schule“; Reihenfolge der Stunden: Training verstehen, Taktik, Fußball-Wissen;
      darunter das Zeugnis.
   c) Zeugnis: Name des Kindes, Halbjahr, Sport mit echtem Stand (2 gemeisterte Trainingsfragen, 1 Taktik-Block),
      fünf weitere Fächer mit Augenzwinkern; kein Prozentzeichen und keine Note.
   d) Rückweg aus Training verstehen führt „Zurück zur Adler-Schule“.
   e) 360 px, hell und dunkel: Zeugnis ohne Überlauf, Schrift ≥ 11,5 px, Text mindestens 4,5:1.
   f) Kader: fester Knopf „📖 Steckbriefe“ öffnet die Übersicht (Welle-2-Aufruf geschützt). */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const kab = fs.readFileSync(path.join(h.REPO, "md-kabine.js"), "utf8");
  if (/kabineQuiz\('taktik'\)|kabineQuiz\('wissen'\)|kabineQuiz\(\\'taktik|kabineQuiz\(\\'wissen/.test(kab)) probleme.push("a) Kabine kennt noch die Kacheln Taktik-Quiz oder Fußball-Wissen");
  if (!/tile\("kabineQuiz\('schule'\)","🎓","Adler-Schule"/.test(kab)) probleme.push("a) Kachel „Adler-Schule“ fehlt");
  const shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  if (!/id="kader-steckbriefe" onclick="if\(typeof steckbriefUebersichtOpen==='function'\)steckbriefUebersichtOpen\(\)"[^>]*>📖 Steckbriefe</.test(shell)) probleme.push("f) Knopf „📖 Steckbriefe“ im Kader fehlt oder ist ungeschützt");
  for (const scheme of ["light", "dark"]) {
    const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 360, hoehe: 740, scheme, warten: 2500, bibliothek: true,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    await s.page.addScriptTag({ content: h.kontrastHelfer || "" }).catch(() => {});
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
      localStorage.setItem("adler_quiz_tutorial_done", "1");
      tqPlayer = "Kind A";
      const p = {}; p["Kind A"] = { 0: { score: 9, total: 10 }, [KF_BLOCK_BASIS + 1]: { score: 8, total: 10 }, [KF_BLOCK_BASIS + 2]: { score: 10, total: 10 }, [KF_BLOCK_BASIS + 3]: { score: 3, total: 10 } };
      localStorage.setItem(TQ_PROGRESS_KEY, JSON.stringify(p));
      tqStart(); await w(80);
      const panel = document.getElementById("tq-panel");
      const txt = panel.textContent.replace(/\s+/g, " ");
      const z = document.getElementById("schule-zeugnis");
      const iT = txt.indexOf("Training verstehen"), iK = txt.indexOf("🎯 Taktik"), iW = txt.indexOf("Fußball-Wissen"), iZ = txt.indexOf("Mein Adler-Zeugnis");
      const zr = z ? z.getBoundingClientRect() : null;
      const schrift = z ? [...z.querySelectorAll("*")].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && getComputedStyle(e).position !== "absolute").map(e => parseFloat(getComputedStyle(e).fontSize)) : [];
      const kontrast = z && window.__kontrastVon ? [...z.querySelectorAll(".sz-fach b, .sz-fach span span, .sz-fach > span:last-child")].map(e => window.__kontrastVon(e)).filter(x => typeof x === "number") : [];
      const out = { kopf: /🎓 Adler-Schule/.test(txt), reihe: iT >= 0 && iT < iK && iK < iW && iW < iZ, fach: z ? [...z.querySelectorAll(".sz-fach b")].map(b => b.textContent) : [],
        sport: z ? z.querySelector(".sz-fach").textContent.replace(/\s+/g, " ").trim() : "", kopfZ: z ? z.textContent.replace(/\s+/g, " ").slice(0, 80) : "",
        prozent: z ? /%|\bNote\b/.test(z.textContent) : true, ueber: zr ? Math.round(zr.right - innerWidth) : 99, minSchrift: Math.min(...schrift), kontrast: kontrast.length ? Math.min(...kontrast) : null };
      await kfStart(); await w(80);
      out.zurueck = [...panel.querySelectorAll("button")].some(b => /Zurück zur Adler-Schule/.test(b.textContent));
      return out;
    });
    await s.schliessen();
    if (!r.kopf) probleme.push(`b) ${scheme}: Überschrift „🎓 Adler-Schule“ fehlt`);
    if (!r.reihe) probleme.push(`b) ${scheme}: Reihenfolge Training – Taktik – Wissen – Zeugnis stimmt nicht`);
    if (r.fach.join(",") !== "Sport,Mathe,Deutsch,Musik,Erdkunde,Chemie") probleme.push(`c) ${scheme}: Fächer ${r.fach.join(",")}`);
    if (!/2 von 6 Trainings-Fragen · 1 von \d+ Taktik-Blöcken/.test(r.sport)) probleme.push(`c) ${scheme}: Sport „${r.sport}“`);
    if (!/Kind A · (Herbst|Winter|Frühling|Sommer) \d{4}/.test(r.kopfZ)) probleme.push(`c) ${scheme}: Kopf „${r.kopfZ}“`);
    if (r.prozent) probleme.push(`c) ${scheme}: Prozent oder Note im Zeugnis`);
    if (!r.zurueck) probleme.push(`d) ${scheme}: „Zurück zur Adler-Schule“ fehlt`);
    if (r.ueber > 0) probleme.push(`e) ${scheme}: Zeugnis ragt ${r.ueber} px hinaus`);
    if (r.minSchrift < 11.5) probleme.push(`e) ${scheme}: Schrift ${r.minSchrift} px`);
    if (r.kontrast != null && r.kontrast < 4.5) probleme.push(`e) ${scheme}: Kontrast ${r.kontrast.toFixed(2)}`);
    if (scheme === "light") zeilen.push(`b) Stunden → Zeugnis · c) ${r.fach.join(", ")} · „${r.sport}“ · d) Rückweg zur Adler-Schule`);
    zeilen.push(`e) ${scheme}: Schrift ≥ ${r.minSchrift} px · Kontrast ${r.kontrast == null ? "nicht gemessen" : r.kontrast.toFixed(2)}`);
  }
  return h.ergebnis("v936 Adler-Schule: Stunden und Zeugnis", !probleme.length, zeilen.concat(probleme));
};
