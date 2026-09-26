/* v632 · PO: „… eine Funktion, um die Schriftgröße zu erhöhen für die älteren Kollegen unter uns,
   die ihre Lesebrille vergessen haben.“ Kacheln: „Trainer und Eltern“, „als v632“.

   a) Der Knopf „A“ im Kopf schaltet Normal → Groß → Sehr groß → Normal, sagt die Stufe im
      aria-label und merkt sie je Gerät; nach dem Neuladen gilt sie sofort.
   b) Die Schrift wächst wirklich: Fließtext 13 → 15 → 17 px (die fünf Stufen hängen daran).
   c) Nichts läuft bei „Sehr groß“ aus dem Bildschirm, was bei „Normal“ drin war – gemessen auf
      360 px in allen Bereichen der Trainer-App und im Eltern-Dashboard.
   d) Öffentliche feste Seiten (Stadionheft) und die Kinder-App bleiben bei Normal.
   e) PO: „Es geht … um die anderen Trainer und Eltern, nicht um mich“ – eine einmalige Karte auf
      der Trainer-Startseite und im Eltern-Dashboard. „Größer stellen“ stellt Groß ein, „Nein danke“
      lässt Normal; beide Antworten lassen die Karte für immer verschwinden (auch nach Neuaufbau). */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const messen = `window.__ueber=()=>{const w=innerWidth;const raus=[];document.querySelectorAll("body *").forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(e);if(cs.visibility==="hidden"||cs.position==="fixed")return;
      for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){const o=getComputedStyle(a).overflowX;if(o==="auto"||o==="scroll"||o==="hidden")return;}
      if(r.right>w+1&&r.left<w)raus.push((e.id?"#"+e.id:e.tagName.toLowerCase()+"."+String(e.className||"").split(" ")[0])+":"+Math.round(r.right-w));});return {scroll:document.documentElement.scrollWidth-w,raus:raus.slice(0,6),n:raus.length};};`;
  // ── Trainer ──
  const s = await h.starten({ breite: 360, hoehe: 800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await s.page.evaluate(messen);
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof schriftWechseln !== "function") return { fehlt: true };
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    if (!m || !m.getBoundingClientRect().height) return { fehlt: true };
    const out = { knopf: [], groesse: {}, bereiche: {} };
    // e) Hinweiskarte: frisches Gerät → da; „Nein danke“ → weg und bleibt weg, Schrift unverändert
    const karte = () => document.querySelector("#schrift-hinweis-trainer .schrift-hinweis");
    const knopfMit = t => [...(karte()?.querySelectorAll("button") || [])].find(b => b.textContent.trim() === t);
    out.hinweis = { anfangs: !!karte() };
    knopfMit("Nein danke")?.click(); await warte(40);
    schriftHinweisZeigen("schrift-hinweis-trainer");
    out.hinweis.neinWeg = !karte(); out.hinweis.neinStufe = document.documentElement.getAttribute("data-schrift") || "normal";
    localStorage.removeItem("adler_schrift_hinweis"); schriftHinweisZeigen("schrift-hinweis-trainer");
    out.hinweis.wieder = !!karte();
    knopfMit("Größer stellen")?.click(); await warte(40);
    out.hinweis.jaStufe = document.documentElement.getAttribute("data-schrift") || "normal";
    out.hinweis.jaGemerkt = localStorage.getItem("adler_schrift");
    schriftHinweisZeigen("schrift-hinweis-trainer"); out.hinweis.jaWeg = !karte();
    const k = document.querySelector(".schrift-toggle");
    const txt = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--s-text"));
    try { localStorage.removeItem("adler_schrift"); } catch (e) {} applySchrift("");
    const tabs = [...document.querySelectorAll("#main-nav .nb")].map(b => (b.getAttribute("onclick") || "").match(/openTab\('([^']+)'\)/)).filter(Boolean).map(m => m[1]);
    for (let i = 0; i < 3; i++) {
      const stufe = document.documentElement.getAttribute("data-schrift") || "normal";
      out.knopf.push({ stufe, zeichen: k && k.textContent, label: k && k.getAttribute("aria-label") });
      out.groesse[stufe] = txt();
      out.bereiche[stufe] = {};
      for (const t of tabs) { try { openTab(t); } catch (e) {} await warte(120); out.bereiche[stufe][t] = __ueber(); }
      if (k) k.click(); else schriftWechseln();
      await warte(60);
    }
    out.zurueck = document.documentElement.getAttribute("data-schrift") || "normal";
    schriftWechseln(); schriftWechseln();   // auf „Sehr groß“ für das Neuladen
    out.gespeichert = localStorage.getItem("adler_schrift");
    out.tabs = tabs;
    return out;
  });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v632 Schriftgröße", false, ["schriftWechseln fehlt"]); }
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(300);
  const nachLaden = await s.page.evaluate(() => document.documentElement.getAttribute("data-schrift"));
  await s.page.goto("https://app.test/trainer/index.html?heft", { waitUntil: "networkidle" }); await s.page.waitForTimeout(300);
  const heft = await s.page.evaluate(() => document.documentElement.getAttribute("data-schrift"));
  const fe = s.fehler();
  await s.schliessen();
  // ── Eltern ──
  const e = await h.starten({ start: "/eltern/index.html", breite: 360, hoehe: 800, warten: 1200, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await e.page.evaluate(messen);
  const el = await e.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => "t"; window.authRole = async () => "parent";
    let root = document.getElementById("eltern-portal"); if (!root) { root = document.createElement("div"); root.id = "eltern-portal"; document.body.appendChild(root); }
    try { await elternPortalDashboard(root); } catch (e) {}
    await warte(400);
    const out = { knopf: !!document.querySelector(".schrift-toggle"), karte: !!document.querySelector("#schrift-hinweis-eltern .schrift-hinweis") };
    const nein = [...document.querySelectorAll("#schrift-hinweis-eltern button")].find(b => b.textContent.trim() === "Nein danke");
    nein?.click(); await warte(40);
    try { await elternPortalDashboard(root); } catch (e) {} await warte(300);
    out.karteNachher = !!document.querySelector(".schrift-hinweis");
    applySchrift(""); await warte(80); out.normal = __ueber();
    applySchrift("sehrgross"); await warte(80); out.sehrgross = __ueber();
    out.groesse = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--s-text"));
    return out;
  });
  const feE = e.fehler();
  await e.schliessen();

  // a)
  const [n0, n1, n2] = r.knopf;
  if (!n0 || n0.zeichen !== "A" || !/Normal – antippen für Groß/.test(n0.label || "") || n1.zeichen !== "A+" || n2.zeichen !== "A++" || r.zurueck !== "normal") probleme.push("a) Knopf: " + JSON.stringify(r.knopf) + " zurück " + r.zurueck);
  if (r.gespeichert !== "sehrgross" || nachLaden !== "sehrgross") probleme.push(`a) gemerkt ${r.gespeichert}, nach Neuladen ${nachLaden}`);
  // b)
  if (r.groesse.normal !== 13 || r.groesse.gross !== 15 || r.groesse.sehrgross !== 17) probleme.push("b) Fließtext: " + JSON.stringify(r.groesse));
  // c)
  const neu = [];
  for (const t of r.tabs) { const a = r.bereiche.normal[t], b = r.bereiche.sehrgross[t]; if (b && a && (b.scroll > a.scroll + 1 || b.n > a.n)) neu.push(`${t}: ${b.raus.join(", ")} (scroll +${b.scroll})`); }
  if (neu.length) probleme.push("c) Trainer, läuft bei „Sehr groß“ über: " + neu.slice(0, 4).join(" | "));
  if (!el.knopf) probleme.push("a) Eltern-Kopf ohne Schrift-Knopf");
  const hi = r.hinweis || {};
  if (!hi.anfangs || !hi.neinWeg || hi.neinStufe !== "normal" || !hi.wieder || hi.jaStufe !== "gross" || hi.jaGemerkt !== "gross" || !hi.jaWeg) probleme.push("e) Trainer-Hinweis: " + JSON.stringify(hi));
  else zeilen.push("e) Trainer-Hinweis: einmal da; „Nein danke“ lässt Normal, „Größer stellen“ stellt Groß ein – danach weg");
  if (!el.karte || el.karteNachher) probleme.push(`e) Eltern-Hinweis: anfangs ${el.karte}, nach „Nein danke“ und Neuaufbau ${el.karteNachher}`);
  else zeilen.push("e) Eltern-Hinweis: im Dashboard einmal da, nach „Nein danke“ auch beim Neuaufbau weg");
  if (el.sehrgross.scroll > el.normal.scroll + 1 || el.sehrgross.n > el.normal.n) probleme.push("c) Eltern, läuft über: " + el.sehrgross.raus.join(", "));
  if (el.groesse !== 17) probleme.push("b) Eltern Fließtext " + el.groesse);
  // d)
  if (heft) probleme.push(`d) Stadionheft übernimmt die Schrift „${heft}“`);
  if (fe.length || feE.length) probleme.push("Konsole: " + fe.concat(feE).slice(0, 2).join(" | "));
  zeilen.push(`Fließtext ${r.groesse.normal}/${r.groesse.gross}/${r.groesse.sehrgross} px · ${r.tabs.length} Bereiche gemessen · Eltern ${el.normal.n}→${el.sehrgross.n} überstehende Elemente`);
  return h.ergebnis("v632 Schriftgröße je Gerät: Normal, Groß, Sehr groß – nichts läuft aus dem Bild", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
