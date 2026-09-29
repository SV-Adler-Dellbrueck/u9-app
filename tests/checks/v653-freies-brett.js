/* v653 · Freies Brett (Trainer, Taktik) und Mein Taktikbrett (Kabine) – md-brett.js.
   Charles 28.09.2026: am Platz „ein paar Bewegungen visualisieren … frei zeichnen“, und die
   Kinder sollen „selber rumbasteln“ können. Kacheln: „Beides jetzt“, Stift nur im Brett.
   Gemessen mit echter Maus (Pointer-Events) am gerenderten SVG:
   a) Taktik zeigt „Freies Brett“ als erste Aktion; es öffnet als Dialog im Vollbild.
   b) Grundstellung 4+1: fünf eigene, fünf Gegner, ein Ball.
   c) Stift: ein Wisch ergibt genau einen Strich mit vielen Punkten.
   d) Schieben: ein Stein folgt dem Finger. e) Radieren nimmt den Strich, Zurück holt ihn.
   f) Stand übersteht Schließen und Öffnen (nur localStorage). g) Spielform 3+1 wechselt die
      Steine, die Zeichnung bleibt. h) Kein einziger Netzaufruf während der Arbeit am Brett.
   i) Kabine: Kachel „Mein Taktikbrett“ unter „Mehr entdecken“, vorn weiter acht; im Brett
      größere Steine, kein Textfeld, kein „Stift weg“, alle Knöpfe mindestens 44 px.
   j) Der Kinder-Loader lädt md-brett.js. */
"use strict";
const fs = require("fs"), path = require("path");

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const netz = () => { window.__netz = 0; const f0 = window.fetch; window.fetch = function () { window.__netz++; return f0.apply(this, arguments); }; };

  // ── Trainer ────────────────────────────────────────────────────────────────────
  {
    const s = await h.starten({ warten: 3000, hoehe: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), taktik_templates: [] }) });
    const p = s.page;
    const a = await p.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
      try { localStorage.removeItem("adler-brett-trainer"); } catch (e) {}
      for (let i = 0; i < 60 && typeof brettOpen !== "function"; i++) await w(50);
      if (typeof go === "function") go("taktik");
      for (let i = 0; i < 40 && !document.querySelector("#sit-hub .sit-brett"); i++) await w(50);
      await w(700);   // Seitenübergang (View Transition) von go() abwarten – er fängt sonst die Maus
      const hub = document.getElementById("sit-hub");
      const erste = hub && hub.querySelector("button");
      return { da: typeof brettOpen === "function", erste: erste ? erste.textContent.trim() : "" };
    });
    if (!a.da) { await s.schliessen(); return h.ergebnis("v653 Freies Brett", false, ["brettOpen fehlt"]); }
    if (!/Freies Brett/.test(a.erste)) probleme.push(`a) erste Aktion unter Taktik: „${a.erste}“`);
    await p.evaluate(netz);
    await p.evaluate(() => document.querySelector("#sit-hub .sit-brett").click());
    await p.waitForTimeout(150);
    const b = await p.evaluate(() => {
      const d = document.getElementById("brett-modal");
      return { rolle: d && d.getAttribute("role"), modal: d && d.getAttribute("aria-modal"),
        steine: document.querySelectorAll("#brett-modal [data-stein]").length,
        gegner: [...document.querySelectorAll("#brett-modal [data-stein] circle")].filter(c => c.getAttribute("fill") === "#f87171").length };
    });
    if (b.rolle !== "dialog" || b.modal !== "true") probleme.push("a) kein Dialog");
    if (b.steine !== 11 || b.gegner !== 5) probleme.push(`b) Grundstellung: ${b.steine} Steine, ${b.gegner} Gegner`);

    let ctm = null;
    const messen = async () => { ctm = await p.evaluate(() => { const m = document.querySelector("#brett-modal .br-svg").getScreenCTM(); return { a: m.a, d: m.d, e: m.e, f: m.f }; }); };
    const inSvg = (vx, vy) => [ctm.e + vx * ctm.a, ctm.f + vy * ctm.d];
    await messen();
    // c) Stift
    await p.evaluate(() => document.querySelector('#brett-modal [data-farbe="w"]').click()); await messen();
    let [x0, y0] = inSvg(40, 200); await p.mouse.move(x0, y0); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { const [x, y] = inSvg(40 + i * 8, 200 - i * 8); await p.mouse.move(x, y); }
    await p.mouse.up();
    const c = await p.evaluate(() => ({ n: document.querySelectorAll("#brett-modal [data-strich]").length, d: (document.querySelector("#brett-modal [data-strich]") || { getAttribute: () => "" }).getAttribute("d") }));
    const punkte = (c.d.match(/[ML]/g) || []).length;
    if (c.n !== 1 || punkte < 8) probleme.push(`c) Stift: ${c.n} Striche, ${punkte} Punkte`);
    // d) Schieben: Ball (letzter Stein, Mitte 90/140)
    await p.evaluate(() => document.querySelector('#brett-modal [data-werk="ziehen"]').click()); await messen();
    [x0, y0] = inSvg(90, 140); await p.mouse.move(x0, y0); await p.mouse.down();
    for (let i = 1; i <= 5; i++) { const [x, y] = inSvg(90 + i * 6, 140 + i * 4); await p.mouse.move(x, y); }
    await p.mouse.up();
    const ball = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem("adler-brett-trainer")); return st.toks.find(t => t.t === "ball"); });
    if (!ball || Math.abs(ball.x - 120) > 4 || Math.abs(ball.y - 160) > 4) probleme.push(`d) Ball steht bei ${ball && ball.x}/${ball && ball.y} statt 120/160`);
    // e) Radieren + Zurück
    await p.evaluate(() => document.querySelector('#brett-modal [data-werk="radierer"]').click()); await messen();
    [x0, y0] = inSvg(72, 168); await p.mouse.click(x0, y0);
    const nachRad = await p.evaluate(() => document.querySelectorAll("#brett-modal [data-strich]").length);
    await p.evaluate(() => brettZurueck());
    const nachZur = await p.evaluate(() => document.querySelectorAll("#brett-modal [data-strich]").length);
    if (nachRad !== 0 || nachZur !== 1) probleme.push(`e) Radieren ${nachRad}, Zurück ${nachZur}`);
    // f) Schließen/Öffnen
    const f = await p.evaluate(async () => { brettClose(); brettOpen(); await new Promise(x => setTimeout(x, 80));
      return { striche: document.querySelectorAll("#brett-modal [data-strich]").length, ball: JSON.parse(localStorage.getItem("adler-brett-trainer")).toks.find(t => t.t === "ball") }; });
    if (f.striche !== 1 || !f.ball || Math.abs(f.ball.x - 120) > 4) probleme.push(`f) nach dem Öffnen: ${f.striche} Striche, Ball ${f.ball && f.ball.x}`);
    // g) 3+1
    const g = await p.evaluate(() => { brettForm("3+1"); return { steine: document.querySelectorAll("#brett-modal [data-stein]").length, striche: document.querySelectorAll("#brett-modal [data-strich]").length }; });
    if (g.steine !== 9 || g.striche !== 1) probleme.push(`g) 3+1: ${g.steine} Steine, ${g.striche} Striche`);
    // Knöpfe ≥ 44 px
    const klein = await p.evaluate(() => [...document.querySelectorAll("#brett-modal button")].filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent.trim() || b.getAttribute("aria-label")));
    if (klein.length) probleme.push("Knöpfe unter 44 px: " + klein.join(", "));
    const n = await p.evaluate(() => window.__netz);
    if (n) probleme.push(`h) ${n} Netzaufrufe während der Arbeit am Brett`);
    const fe = s.fehler(); await s.schliessen();
    if (fe.length) probleme.push("Konsole Trainer: " + fe.slice(0, 2).join(" | "));
    zeilen.push(`Trainer: ${b.steine} Steine · Strich mit ${punkte} Punkten · Ball → ${ball && ball.x}/${ball && ball.y} · 3+1 ${g.steine} Steine`);
  }

  // ── Kabine ─────────────────────────────────────────────────────────────────────
  {
    const s = await h.starten({ start: "/eltern/index.html", warten: 3000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 80 && (typeof brettKabine !== "function" || typeof kabineHome !== "function"); i++) await w(50);
      if (typeof brettKabine !== "function" || typeof kabineHome !== "function") return { fehlt: true };
      document.querySelectorAll(".modal-overlay,[role=dialog]").forEach(d => d.remove());
      const k = document.createElement("div"); k.id = "kabine"; k.innerHTML = '<div id="kabine-body" style="display:flex;flex-direction:column;height:900px;background:#1e3a8a"></div>';
      document.body.appendChild(k);
      kabineHome(); await w(100);
      const mehr = document.getElementById("kab-mehr");
      const kachel = mehr && [...mehr.querySelectorAll("button")].find(b => /Mein Taktikbrett/.test(b.textContent));
      try { localStorage.removeItem("adler-brett-kind"); } catch (e) {}
      window.__netz = 0; const f0 = window.fetch; window.fetch = function () { window.__netz++; return f0.apply(this, arguments); };
      if (kachel) kachel.click(); await w(100);
      const body = document.getElementById("kabine-body");
      const out = { kachel: !!kachel, brett: !!body.querySelector(".br-svg"),
        eingaben: body.querySelectorAll("input,textarea,[contenteditable]").length,
        stiftWeg: /Stift weg/.test(body.textContent), stifte: body.querySelectorAll("[data-farbe]").length,
        r: Number((body.querySelector("[data-stein] circle") || { getAttribute: () => 0 }).getAttribute("r")),
        klein: [...body.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent.trim()) };
      brettStift("y"); brettGrundstellung(); brettZurueck();
      out.gespeichert = !!localStorage.getItem("adler-brett-kind");
      out.netz = window.__netz;
      return out;
    });
    const fe = s.fehler(); await s.schliessen();
    if (r.fehlt) probleme.push("i) brettKabine/kabineHome fehlen im Eltern-Bereich");
    else {
      if (!r.kachel || !r.brett) probleme.push(`i) Kachel ${r.kachel}, Brett ${r.brett}`);
      if (r.eingaben || r.stiftWeg || r.stifte !== 2 || r.r < 11) probleme.push(`i) Kinder-Brett: ${JSON.stringify({ eingaben: r.eingaben, stiftWeg: r.stiftWeg, stifte: r.stifte, r: r.r })}`);
      if (r.klein.length) probleme.push("i) Knöpfe unter 44 px: " + r.klein.join(", "));
      if (r.netz) probleme.push(`h) Kabine: ${r.netz} Netzaufrufe`);
      if (!r.gespeichert) probleme.push("f) Kinder-Brett speichert nicht auf dem Gerät");
      zeilen.push(`Kabine: Kachel unter „Mehr entdecken“ · Steine r=${r.r} · ${r.stifte} Stifte · 0 Textfelder`);
    }
    if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | "));
  }

  // j) Kinder-Loader, und kein Netz im Modul
  const kl = fs.readFileSync(path.join(h.REPO, "kinder/index.html"), "utf8");
  if (!/const ALLE=\[[^\]]*"md-brett\.js"/.test(kl)) probleme.push("j) kinder/index.html lädt md-brett.js nicht");
  const mod = fs.readFileSync(path.join(h.REPO, "md-brett.js"), "utf8");
  if (/fetch\(|SB_URL|sbAuthHeaders/.test(mod)) probleme.push("h) md-brett.js spricht mit dem Server");

  return h.ergebnis("v653 Freies Brett und Mein Taktikbrett", !probleme.length, probleme.concat(zeilen));
};
