/* v750 · Mein Taktikbrett: leeres Feld und Spieler aus dem Kader
   Charles 04.10.: „… dass das Board komplett leer ist und das Kind selbst alles anlegen kann. Auch die
   Spieler aussuchen, die aufgestellt werden, aus dem Team-Kader.“ Kachel: Vorname auf dem Stein.
   a) Spielform „Leeres Feld“: keine Steine, keine Tore
   b) „Hinzufügen“ öffnet eine Auswahl (role=dialog) mit den Kindern aus der Team-Galerie und den Dingen
      Mitspieler, Torwart, Gegner, Ball, Hütchen, Stange, Minitor; alle Knöpfe mindestens 44 px
   c) Ein Kind wird mit Vornamen aufgestellt (auf 6 Zeichen gekürzt) und ist danach in der Auswahl gesperrt
   d) Gegner, Ball und Geräte lassen sich dazulegen
   e) „Radieren“ nimmt einen Stein wieder weg
   f) Kein Textfeld, md-brett.js ohne Netzaufruf, der Stand samt Namen übersteht Schließen und Öffnen
   g) Trainer: dieselbe Auswahl zeigt den Kader */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/eltern/index.html", warten: 3000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80 && (typeof brettKabine !== "function" || typeof kabineHome !== "function"); i++) await w(50);
    if (typeof brettWahlAuf !== "function") return { fehlt: true };
    document.querySelectorAll(".modal-overlay,[role=dialog]").forEach(d => d.remove());
    const k = document.createElement("div"); k.id = "kabine"; k.innerHTML = '<div id="kabine-body" style="display:flex;flex-direction:column;height:900px;background:#1e3a8a"></div>';
    document.body.appendChild(k);
    kabineGalleryData = [{ spieler_id: 1, name: "Testa Beispiel" }, { spieler_id: 2, name: "Kindername Z" }];
    try { localStorage.removeItem("adler-brett-kind"); } catch (e) {}
    window.__netz = 0; const f0 = window.fetch; window.fetch = function () { window.__netz++; return f0.apply(this, arguments); };
    const body = document.getElementById("kabine-body");
    brettKabine(body); await w(50);
    const out = {};
    brettForm("leer"); await w(20);
    out.a = { steine: body.querySelectorAll("[data-stein]").length, formKnopf: [...body.querySelectorAll(".br-form")].some(b => /Leeres Feld/.test(b.textContent)),
      tore: body.querySelector(".br-platz").innerHTML.length };
    brettWahlAuf(); await w(50);
    const d = document.getElementById("br-wahl");
    out.b = d ? { role: d.getAttribute("role") + "/" + d.getAttribute("aria-modal"), knoepfe: [...d.querySelectorAll(".br-wahl-reihe button")].map(b => b.textContent.trim()),
      klein: [...d.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent.trim()) } : null;
    [...(d ? d.querySelectorAll("button") : [])].find(b => /Testa/.test(b.textContent))?.click(); await w(30);
    out.c = { namen: [...body.querySelectorAll("[data-stein] text")].map(t => t.textContent), wahlZu: !document.getElementById("br-wahl") };
    brettWahlAuf(); await w(30);
    const testaKnopf = [...document.querySelectorAll("#br-wahl button")].find(b => /Testa/.test(b.textContent));
    out.c.gesperrt = !!(testaKnopf && testaKnopf.disabled && /✓/.test(testaKnopf.textContent));
    [...document.querySelectorAll("#br-wahl button")].find(b => /Kindern/.test(b.textContent))?.click(); await w(30);
    out.c.namen2 = [...body.querySelectorAll("[data-stein] text")].map(t => t.textContent);
    for (const t of ["gegner", "ball", "huetchen", "stange", "minitor", "tw"]) brettNeu(t);
    await w(20);
    out.d = { steine: body.querySelectorAll("[data-stein]").length, toks: JSON.parse(localStorage.getItem("adler-brett-kind")).toks.map(t => t.t).join(",") };
    // e) Radieren auf den Stein von Testa
    const st = JSON.parse(localStorage.getItem("adler-brett-kind")).toks.find(t => t.n === "Testa");
    brettWerkzeug("radierer");
    const svg = body.querySelector(".br-svg"), m = svg.getScreenCTM();
    const pt = svg.createSVGPoint(); pt.x = st.x; pt.y = st.y; const sc = pt.matrixTransform(m);
    out.e = { sc: [Math.round(sc.x), Math.round(sc.y)], hinweis: (document.getElementById("br-hinweis") || {}).textContent };
    out.eingaben = body.querySelectorAll("input,textarea,[contenteditable]").length;
    return out;
  });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v750 Brett leer und Kader", false, ["brettWahlAuf fehlt"]); }
  // echter Mausklick auf den Stein
  await s.page.mouse.move(r.e.sc[0], r.e.sc[1]); await s.page.mouse.down(); await s.page.mouse.up(); await s.page.waitForTimeout(80);
  const r2 = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const body = document.getElementById("kabine-body");
    const nach = { namen: [...body.querySelectorAll("[data-stein] text")].map(t => t.textContent), steine: body.querySelectorAll("[data-stein]").length };
    brettKabineZu(); await w(30);
    brettKabine(body); await w(30);
    nach.wieder = { namen: [...body.querySelectorAll("[data-stein] text")].map(t => t.textContent), steine: body.querySelectorAll("[data-stein]").length };
    nach.netz = window.__netz;
    return nach;
  });
  const fe = s.fehler(); await s.schliessen();

  if (r.a.steine !== 0 || !r.a.formKnopf || /rect[^>]*class="?tor/.test("")) probleme.push(`a) Leeres Feld: ${JSON.stringify(r.a)}`);
  zeilen.push(`a) Leeres Feld: ${r.a.steine} Steine`);
  const b = r.b || {};
  const soll = ["Kindername", "Testa", "Mitspieler ohne Namen", "Torwart", "Gegner", "Ball", "Hütchen", "Stange", "Minitor"];
  if (!r.b || b.role !== "dialog/true" || soll.some(x => !b.knoepfe.some(k => k.includes(x))) || b.klein.length) probleme.push(`b) Auswahl: ${JSON.stringify(b)}`);
  zeilen.push(`b) Auswahl: ${(b.knoepfe || []).join(" · ")}`);
  if (JSON.stringify(r.c.namen) !== '["Testa"]' || !r.c.wahlZu || !r.c.gesperrt || JSON.stringify(r.c.namen2) !== '["Testa","Kinder"]') probleme.push(`c) Namen: ${JSON.stringify(r.c)}`);
  zeilen.push(`c) Steine mit Vornamen: ${r.c.namen2.join(", ")} – Testa danach gesperrt`);
  if (r.d.steine !== 8 || r.d.toks !== "wir,wir,gegner,ball,huetchen,stange,minitor,tw") probleme.push(`d) Dazulegen: ${JSON.stringify(r.d)}`);
  zeilen.push(`d) ${r.d.toks}`);
  if (r2.steine !== 7 || r2.namen.includes("Testa") || !/Spieler/.test(r.e.hinweis)) probleme.push(`e) Radieren: ${JSON.stringify(r2)} · ${r.e.hinweis}`);
  zeilen.push("e) Radieren nimmt den Stein von Testa weg");
  if (r.eingaben || /fetch\(|SB_URL|sbAuthHeaders/.test(require("fs").readFileSync(require("path").join(h.REPO, "md-brett.js"), "utf8")) || r2.wieder.steine !== 7 || !r2.wieder.namen.includes("Kinder")) probleme.push(`f) ${JSON.stringify({ eingaben: r.eingaben, netz: r2.netz, wieder: r2.wieder })}`);
  zeilen.push(`f) 0 Textfelder, md-brett.js ohne Netzaufruf, nach Neuöffnen ${r2.wieder.steine} Steine`);
  if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | "));

  // g) Trainer
  const t = await h.starten({ warten: 2500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), taktik_templates: [] }) });
  const g = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof brettOpen !== "function"; i++) await w(50);
    if (typeof loadKader === "function") await loadKader();
    brettOpen(); await w(50); brettForm("leer"); brettWahlAuf(); await w(30);
    const d = document.getElementById("br-wahl");
    return { kader: d ? d.querySelectorAll(".br-kopf-wahl").length : 0, steine: document.querySelectorAll("#brett-modal [data-stein]").length };
  });
  const ft = t.fehler(); await t.schliessen();
  if (g.kader < 5 || g.steine !== 0) probleme.push(`g) Trainer: ${JSON.stringify(g)}`);
  zeilen.push(`g) Trainer: ${g.kader} Kinder aus dem Kader in der Auswahl`);
  if (ft.length) probleme.push("Konsole Trainer: " + ft.slice(0, 2).join(" | "));
  return h.ergebnis("v750 Mein Taktikbrett: leeres Feld, Spieler aus dem Kader", !probleme.length, probleme.length ? probleme : zeilen);
};
