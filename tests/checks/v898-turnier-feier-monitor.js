/* v898 · Turnierseite: Tor-Moment, Abschluss, Monitor als eine Tafel (Entwurf, Charles 19.11.).

   a) Tor-Moment: kommt zwischen zwei Aktualisierungen von außen ein Tor dazu, leuchtet die Karte
      („tor-jetzt“) und das Ergebnis federt.
   b) Tor-Moment NICHT für die eigene Eingabe am Anzeigetisch: „+“ im Eintrage-Blatt, „Fertig“ – die
      Seite lädt neu, aber nichts leuchtet.
   c) Monitor mit ?monitor=1 bei 1280 × 800: eine Tafel mit „Jetzt live“, „Gleich dran“ und beiden
      Gruppentabellen, nichts ragt aus dem Bild, kein Schließen-Knopf; die Uhr tickt. Über den Knopf
      geöffnet hat er einen Schließen-Knopf (≥ 44 px), der ihn schließt.
   d) Turnierende: Abschlusskarte mit Pokal, allen Wappen gleich groß, „jedes Kind bekommt heute eine
      Medaille“, Fair-Play-Pokal; kein Podest; die Gruppentabellen stehen weiter darunter. Konfetti läuft
      genau einmal (nach 5 s aus dem DOM, eine Aktualisierung startet es nicht neu).
   e) Turnierende mit prefers-reduced-motion: keine Animation, kein Konfetti.
   f) Turnierende 390 px: jede Schrift außerhalb von Verläufen ≥ 4,5:1. */
"use strict";
const T = require("../turnier-attrappe.js");
const START = "/eltern/index.html?turnier=herbstcup-21-11";
const ENDE = "2026-11-21T11:16:00";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const warte = ms => new Promise(r => setTimeout(r, ms));

  // a) Tor von außen
  {
    let row = T.zeile();
    const s = await h.starten({ start: START, angemeldet: false, warten: 2500, jetzt: T.JETZT, supabase: h.supabaseAttrappe({ heimturnier: () => [row] }) });
    const vor = await s.page.evaluate(() => document.querySelectorAll(".htp-spiel.tor-jetzt").length);
    row = T.zeile(); row.plan[4].ta = 2;
    await s.page.evaluate(() => _htPubLoad()); await warte(150);
    const r = await s.page.evaluate(() => ({ karten: document.querySelectorAll('.htp-spiel.tor-jetzt[data-mi="4"]').length, andere: document.querySelectorAll('.htp-spiel.tor-jetzt:not([data-mi="4"])').length, feder: document.querySelectorAll(".htp-tore.neu").length }));
    await s.schliessen();
    if (vor) probleme.push(`a) Tor-Moment schon beim ersten Laden (${vor})`);
    if (!r.karten || !r.feder) probleme.push(`a) Tor von außen ohne Tor-Moment (Karten ${r.karten}, Federn ${r.feder})`);
    if (r.andere) probleme.push(`a) Tor-Moment an ${r.andere} anderen Karten`);
    zeilen.push(`a) Tor von außen: ${r.karten} Karten leuchten, ${r.feder} Ergebnisse federn`);
  }

  // b) eigene Eingabe am Anzeigetisch
  {
    const row = T.zeile();
    const s = await h.starten({ start: START + "&code=abc123", angemeldet: false, warten: 2500, jetzt: T.JETZT,
      supabase: h.supabaseAttrappe({ heimturnier: () => [row], rpc: { heimturnier_ergebnis: (u, req) => { const b = JSON.parse(req.postData() || "{}"); row.plan[b.p_idx].ta = b.p_ta; row.plan[b.p_idx].tb = b.p_tb; return true; } } }) });
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms)), leuchten = [];
      const beob = new MutationObserver(() => { const n = document.querySelectorAll(".htp-spiel.tor-jetzt").length; if (n) leuchten.push(n); });
      beob.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
      htPubEdit(4); await w(100);
      const plus = [...document.querySelectorAll("#htpub-sheet button")].find(b => b.getAttribute("aria-label") === "Tor");
      plus.click(); await w(300);
      [...document.querySelectorAll("#htpub-sheet button")].find(b => /Fertig/.test(b.textContent)).click(); await w(600);
      beob.disconnect();
      const karte = document.querySelector('#ht-public .htp-spiel[data-mi="4"]');
      return { leuchten: leuchten.length, text: karte ? karte.textContent.replace(/\s+/g, " ") : "" };
    });
    await s.schliessen();
    if (!/2\s*:?\s*(zu\s*)?0/.test(r.text)) probleme.push(`b) eigene Eingabe kam nicht an: „${r.text.slice(0, 80)}“`);
    if (r.leuchten) probleme.push("b) Tor-Moment bei der eigenen Eingabe am Anzeigetisch");
    zeilen.push(`b) eigene Eingabe 2:0 eingetragen, Tor-Moment ${r.leuchten ? "ja" : "nein"}`);
  }

  // c) Monitor
  {
    const row = T.zeile();
    const s = await h.starten({ start: START + "&monitor=1", angemeldet: false, warten: 2500, jetzt: T.JETZT, breite: 1280, hoehe: 800, supabase: h.supabaseAttrappe({ heimturnier: () => [row] }) });
    const m = () => s.page.evaluate(() => {
      const ov = document.getElementById("htpub-monitor"); if (!ov) return null;
      const t = ov.textContent, raus = [...ov.querySelectorAll("*")].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1); }).length;
      return { live: /Jetzt live/i.test(t), gleich: /Gleich dran/i.test(t), tabs: ov.querySelectorAll("table").length, zu: !!ov.querySelector("button"), raus,
        uhr: (ov.querySelector(".htp-mon-uhr") || {}).textContent, wappen: ov.querySelectorAll(".htp-wp").length };
    });
    const r = await m();
    await s.page.clock.setFixedTime(new Date("2026-11-21T10:28:05")); await warte(1300);
    const r2 = await m();
    // über den Knopf: mit Schließen-Knopf
    const k = await s.page.evaluate(async () => {
      htPubMonitorStop(); await new Promise(x => setTimeout(x, 100));
      document.querySelector('#ht-public button[onclick="htPubMonitor()"]').click(); await new Promise(x => setTimeout(x, 300));
      const zu = document.querySelector("#htpub-monitor button"); const hh = zu ? Math.round(zu.getBoundingClientRect().height) : 0;
      if (zu) zu.click(); await new Promise(x => setTimeout(x, 100));
      return { zu: !!zu, h: hh, weg: !document.getElementById("htpub-monitor") };
    });
    await s.schliessen();
    if (!r) probleme.push("c) ?monitor=1 öffnet keinen Monitor");
    else {
      if (!r.live || !r.gleich || r.tabs !== 2) probleme.push(`c) Tafel unvollständig: Live ${r.live}, Gleich dran ${r.gleich}, Tabellen ${r.tabs}`);
      if (r.raus) probleme.push(`c) ${r.raus} Elemente ragen aus 1280 × 800 heraus`);
      if (r.zu) probleme.push("c) ?monitor=1 hat einen Schließen-Knopf");
      if (r.uhr === r2.uhr) probleme.push(`c) die Uhr tickt nicht (${r.uhr})`);
      if (!r.wappen) probleme.push("c) keine Wappen auf der Tafel");
      zeilen.push(`c) Tafel: Live, Gleich dran, ${r.tabs} Tabellen, ${r.wappen} Wappen, ${r.raus} außerhalb, Uhr ${r.uhr} → ${r2.uhr}`);
    }
    if (!k.zu || k.h < 44 || !k.weg) probleme.push(`c) Monitor über den Knopf: Schließen-Knopf ${k.zu ? k.h + " px" : "fehlt"}, schließt ${k.weg}`);
  }

  // d) Turnierende, Konfetti genau einmal
  {
    const row = T.zeile({ ende: true });
    const s = await h.starten({ start: START, angemeldet: false, warten: 600, jetzt: ENDE, supabase: h.supabaseAttrappe({ heimturnier: () => [row] }) });
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms)), boxen = new Set();
      const beob = new MutationObserver(() => document.querySelectorAll(".htp-konfetti").forEach(b => boxen.add(b)));
      beob.observe(document.body, { childList: true });
      document.querySelectorAll(".htp-konfetti").forEach(b => boxen.add(b));
      const a = document.getElementById("htp-abschluss"); if (a) a.scrollIntoView();
      await w(5200);
      const nachFuenf = document.querySelectorAll(".htp-konfetti").length;
      await _htPubLoad(); await w(1500);
      beob.disconnect();
      const ab = document.getElementById("htp-abschluss");
      const breiten = ab ? [...ab.querySelectorAll(".htp-alle-wappen .htp-wp")].map(e => Math.round(e.getBoundingClientRect().width)) : [];
      return { ab: !!ab, text: ab ? ab.textContent.replace(/\s+/g, " ") : "", pokal: !!(ab && ab.querySelector(".htp-pokal svg")), breiten,
        tabellen: [...document.querySelectorAll("#ht-public table caption")].map(c => c.textContent), boxen: boxen.size, nachFuenf, podest: /Podest|1\. Platz|Sieger:/i.test(ab ? ab.textContent : "") };
    });
    await s.schliessen();
    if (!r.ab) probleme.push("d) keine Abschlusskarte am Turnierende");
    else {
      if (!r.pokal) probleme.push("d) kein Pokal");
      if (!/jedes Kind bekommt heute eine Medaille/.test(r.text)) probleme.push("d) „jedes Kind bekommt heute eine Medaille“ fehlt");
      if (!/Fair-Play-Pokal/.test(r.text) || !/Auenfeld/.test(r.text)) probleme.push("d) Fair-Play-Pokal fehlt");
      if (r.breiten.length !== 6 || new Set(r.breiten).size !== 1) probleme.push(`d) Wappen nicht alle da/gleich groß: ${r.breiten.join(", ")}`);
      if (r.podest) probleme.push("d) Abschluss zeigt eine Rangfolge");
      if (r.tabellen.length !== 2) probleme.push(`d) Gruppentabellen unter dem Abschluss: ${r.tabellen.join(", ") || "keine"}`);
      if (r.boxen !== 1) probleme.push(`d) Konfetti lief ${r.boxen}-mal (Soll genau einmal, auch nach der Aktualisierung)`);
      if (r.nachFuenf) probleme.push("d) Konfetti nach 5 s noch im DOM");
      zeilen.push(`d) Abschluss: Pokal, ${r.breiten.length} Wappen à ${r.breiten[0]} px, Tabellen ${r.tabellen.join("/")}, Konfetti ${r.boxen}×`);
    }
  }

  // e) + f) Turnierende mit reduzierter Bewegung, Kontrast
  {
    const row = T.zeile({ ende: true });
    const s = await h.starten({ start: START, angemeldet: false, warten: 300, jetzt: ENDE, supabase: h.supabaseAttrappe({ heimturnier: () => [row] }) });
    await s.page.emulateMedia({ reducedMotion: "reduce" });
    await s.page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(1500);
    const r = await s.page.evaluate(helfer => {
      eval(helfer);
      const a = document.getElementById("htp-abschluss"); if (a) a.scrollIntoView();
      const wrap = document.getElementById("ht-public");
      const unter = [...wrap.querySelectorAll("*")].filter(el => { const b = el.getBoundingClientRect(); return b.width && b.height && [...el.childNodes].some(n => n.nodeType === 3 && /[A-Za-z0-9]/.test(n.textContent)); })
        .filter(el => { let v = false; for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).backgroundImage !== "none") { v = true; break; } if (v) return false;
          const st = getComputedStyle(el), fs = parseFloat(st.fontSize), fw = parseInt(st.fontWeight) || 400; return window.__kontrastVon(el) < ((fs >= 24 || (fs >= 18.66 && fw >= 700)) ? 3 : 4.5); })
        .map(el => el.textContent.trim().slice(0, 30));
      return { ab: !!a, unter };
    }, h.kontrastHelfer);
    await s.page.waitForTimeout(600);
    const e = await s.page.evaluate(() => ({ anim: document.getAnimations().length, konfetti: document.querySelectorAll(".htp-konfetti").length }));
    await s.schliessen();
    if (!r.ab) probleme.push("e) keine Abschlusskarte (reduzierte Bewegung)");
    if (e.anim || e.konfetti) probleme.push(`e) reduzierte Bewegung: ${e.anim} Animationen, ${e.konfetti} Konfetti`);
    if (r.unter.length) probleme.push(`f) ${r.unter.length} Stellen unter dem Soll: ${r.unter.slice(0, 3).join(" · ")}`);
    zeilen.push(`e) reduzierte Bewegung am Ende: ${e.anim} Animationen, ${e.konfetti} Konfetti · f) ${r.unter.length} unter dem Soll`);
  }
  return h.ergebnis("v898 Turnierseite: Tor-Moment (nicht bei eigener Eingabe), Monitor-Tafel, Abschluss mit Konfetti einmal", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
