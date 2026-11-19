/* v897 · Öffentliche Turnierseite neu (Entwurf, Charles 19.11.). Gemessen an der echten Seite
   (?turnier=…) mit der Attrappe aus tests/turnier-attrappe.js, Uhr fest auf 10:28.

   a) Zwischenstand zählt nicht: das laufende 1:0 (Adler – Rheinaue, Anpfiff 10:24) trägt „LIVE“ und
      „Zwischenstand“ und zählt NICHT in der Gruppentabelle. Um 10:35 (Spielzeit vorbei) steht
      „Endstand“ und es zählt. (v888: zählte sofort.)
   b) Regelwerk bleibt offen: aufklappen, hinscrollen, 11 s warten (die Seite lädt alle 10 s neu) –
      noch offen, Scrollposition gleich. (v888: klappte zu, Seite sprang.)
   c) Vereinsfilter zeigt Platzierungsspiele: mit „SV Adler Dellbrück“ gewählt stehen die Spiele der
      Finalrunde („1. Gruppe A“ …) weiter da, nirgends „Keine weiteren Spiele“. (v888: versteckt.)
   d) Wappen überall, nie eine Lücke: Kopfreihe, Chips, Spielkarten, Tabellen. Ein Verein ohne
      Wappen und ein Bild, das nicht lädt, zeigen Initialen im Kreis.
   e) Ergebnis-Modus (&code=): Filter auf ein Team, der Eintragen-Knopf eines Spiels öffnet das Blatt
      für genau dieses Spiel; „+“ schickt p_idx = Index im GESAMTEN Plan.
   f) prefers-reduced-motion: keine einzige laufende Animation.
   g) 390 und 1280 px, hell und im dunklen Modus des Handys: Seite bleibt hell, jede Schrift außerhalb
      von Verläufen ≥ 4,5:1 (groß 3:1), jeder Knopf ≥ 44 px, kein waagerechtes Scrollen. */
"use strict";
const T = require("../turnier-attrappe.js");
const START = "/eltern/index.html?turnier=herbstcup-21-11";
const MESS = `(()=>{const out=[];const wrap=document.getElementById("ht-public");const els=[...wrap.querySelectorAll("*")].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&[...el.childNodes].some(n=>n.nodeType===3&&/[A-Za-z0-9ÄÖÜäöü]/.test(n.textContent));});
 for(const el of els){const st=getComputedStyle(el);if(st.visibility==="hidden"||parseFloat(st.opacity)<0.2)continue;const k=window.__kontrastVon(el);const fs=parseFloat(st.fontSize),fw=parseInt(st.fontWeight)||400;const soll=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5;let v=false;for(let e=el;e;e=e.parentElement)if(getComputedStyle(e).backgroundImage!=="none"){v=true;break;}if(k<soll&&!v)out.push(el.textContent.trim().slice(0,30)+" "+k+":1");}
 const kn=[...wrap.querySelectorAll("button,summary")].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height<44}).map(b=>(b.getAttribute("aria-label")||b.textContent).trim().slice(0,20)+" "+Math.round(b.getBoundingClientRect().height)+"px");
 return {n:els.length,unter:out,knoepfe:kn,quer:document.documentElement.scrollWidth>innerWidth+1,theme:document.documentElement.getAttribute("data-theme")};})()`;

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const att = (row, extra) => h.supabaseAttrappe(Object.assign({ heimturnier: () => [row()] }, extra || {}));

  // a) + c) + d) + f) eine Seite
  {
    let row = T.zeile({ kaputt: true });
    const s = await h.starten({ start: START, angemeldet: false, warten: 2500, jetzt: T.JETZT, supabase: att(() => row) });
    const tab = () => s.page.evaluate(() => {
      const wrap = document.getElementById("ht-public"); if (!wrap) return null;
      const zeile = [...wrap.querySelectorAll("tr")].find(tr => /SV Adler Dellbrück/.test(tr.textContent) && tr.querySelectorAll("td").length >= 4);
      const innen = [...wrap.querySelectorAll("article,tr,div")].reverse().find(e => /SV Adler Dellbrück/.test(e.textContent) && /SC Rheinaue/.test(e.textContent) && /1\s*:\s*(zu\s*)?0/.test(e.textContent.replace(/\s+/g, " ")) && e.textContent.length < 400);
      const karte = innen && (innen.closest("article") || innen);
      return { pkt: zeile ? zeile.lastElementChild.textContent.trim() : null, sp: zeile ? zeile.children[zeile.children.length - 3].textContent.trim() : null,
        karte: karte ? karte.textContent.replace(/\s+/g, " ").trim() : "" };
    });
    const a1 = await tab();
    if (!a1) probleme.push("die öffentliche Seite wurde nicht aufgebaut");
    else {
      if (!/LIVE/.test(a1.karte) || !/Zwischenstand/i.test(a1.karte)) probleme.push(`a) laufendes 1:0 ohne „LIVE“/„Zwischenstand“: „${a1.karte.slice(0, 120)}“`);
      if (a1.pkt !== "0") probleme.push(`a) 10:28: der Zwischenstand zählt schon – Adler hat ${a1.pkt} Punkte (Soll 0)`);
      await s.page.clock.setFixedTime(new Date("2026-11-21T10:35:00"));
      await s.page.evaluate(() => _htPubLoad());
      const a2 = await tab();
      if (a2.pkt !== "3") probleme.push(`a) 10:35: nach Ablauf zählt das 1:0 nicht – Adler hat ${a2.pkt} Punkte (Soll 3)`);
      if (!/Endstand/i.test(a2.karte)) probleme.push(`a) 10:35: kein „Endstand“: „${a2.karte.slice(0, 120)}“`);
      zeilen.push(`a) 10:28 Adler ${a1.pkt} Pkt. (${a1.sp} Sp.), Karte „${(a1.karte.match(/LIVE|Zwischenstand|ZWISCHENSTAND/g) || []).join("/")}“ · 10:35 ${a2.pkt} Pkt., Endstand`);
      await s.page.clock.setFixedTime(new Date(T.JETZT));
      await s.page.evaluate(() => _htPubLoad());

      // d) Wappen
      const d = await s.page.evaluate(async () => {
        await new Promise(r => setTimeout(r, 800));
        const w = document.getElementById("ht-public");
        const zaehl = sel => w.querySelectorAll(sel).length;
        const ini = [...w.querySelectorAll(".htp-wp.ini")].map(e => e.textContent.trim());
        const kaputt = [...w.querySelectorAll("img")].filter(i => i.complete && i.naturalWidth === 0).length;
        return { medaillen: zaehl(".htp-medaille .htp-wp"), chips: zaehl(".htp-chip .htp-wp"), karten: zaehl(".htp-spiel .htp-team:not(.platzhalter) .htp-wp"), tabellen: zaehl("table .htp-wp"),
          ini: [...new Set(ini)], kaputt };
      });
      if (d.medaillen !== 6 || d.chips !== 6) probleme.push(`d) Wappenreihe ${d.medaillen}, Chips ${d.chips} (Soll je 6)`);
      if (!d.karten || d.tabellen !== 6) probleme.push(`d) Wappen in Spielkarten ${d.karten}, in Tabellen ${d.tabellen} (Soll > 0 und 6)`);
      if (!d.ini.includes("KA")) probleme.push(`d) Verein ohne Wappen zeigt keine Initialen „KA“: ${JSON.stringify(d.ini)}`);
      if (!d.ini.includes("RH")) probleme.push(`d) kaputtes Bild wird nicht zu Initialen „RH“: ${JSON.stringify(d.ini)}`);
      if (d.kaputt) probleme.push(`d) ${d.kaputt} kaputte Bilder stehen noch auf der Seite`);
      zeilen.push(`d) Wappen: Kopf ${d.medaillen}, Chips ${d.chips}, Karten ${d.karten}, Tabellen ${d.tabellen}, Initialen ${d.ini.join("/")}`);

      // c) Filter
      const c = await s.page.evaluate(async () => {
        htPubFilter(0); await new Promise(r => setTimeout(r, 200));
        const w = document.getElementById("ht-public"), t = w.textContent;
        const platz = [...w.querySelectorAll("article,tr")].filter(e => /\d\. Gruppe [AB]/.test(e.textContent)).length;
        const r = { keine: /Keine weiteren Spiele/.test(t), platz };
        htPubFilter(null); return r;
      });
      if (c.keine) probleme.push("c) Filter: „Keine weiteren Spiele“, obwohl noch Platzierungsspiele kommen");
      if (c.platz < 3) probleme.push(`c) Filter versteckt die Platzierungsspiele (${c.platz} sichtbar, Soll 3)`);
      zeilen.push(`c) Filter Adler: ${c.platz} Platzierungsspiele sichtbar`);

      // f) reduzierte Bewegung
      await s.page.emulateMedia({ reducedMotion: "reduce" });
      await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(2500);
      const f = await s.page.evaluate(() => ({ anim: document.getAnimations().map(a => a.animationName || a.constructor.name), seite: !!document.querySelector("#ht-public .htp-spiel") }));
      if (!f.seite) probleme.push("f) Seite mit reduzierter Bewegung nicht aufgebaut");
      if (f.anim.length) probleme.push(`f) prefers-reduced-motion: ${f.anim.length} laufende Animationen (${[...new Set(f.anim)].join(", ")})`);
      zeilen.push(`f) reduzierte Bewegung: ${f.anim.length} Animationen`);
    }
    const fe = s.fehler().filter(x => !/kaputt-wappen/.test(x));
    if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
    await s.schliessen();
  }

  // b) Regelwerk bleibt offen (echte 10-s-Aktualisierung)
  {
    const row = T.zeile();
    const s = await h.starten({ start: START, angemeldet: false, warten: 2500, jetzt: T.JETZT, supabase: att(() => row) });
    const finde = `[...document.querySelectorAll("#ht-public details")].find(d=>/Regel/.test(d.querySelector("summary")?.textContent||""))`;
    const vor = await s.page.evaluate(`(()=>{const d=${finde};if(!d)return null;d.open=true;d.scrollIntoView({block:"center"});return {offen:d.open,y:Math.round(scrollY)};})()`);
    await s.page.waitForTimeout(11500);
    const nach = await s.page.evaluate(`(()=>{const d=${finde};return {offen:!!(d&&d.open),y:Math.round(scrollY)};})()`);
    await s.schliessen();
    if (!vor) probleme.push("b) kein Regelwerk zum Aufklappen gefunden");
    else {
      if (!nach.offen) probleme.push("b) das Regelwerk klappt bei der automatischen Aktualisierung wieder zu");
      if (Math.abs(nach.y - vor.y) > 2) probleme.push(`b) die Seite springt bei der Aktualisierung (${vor.y} → ${nach.y} px)`);
      zeilen.push(`b) Regelwerk nach 11,5 s ${nach.offen ? "offen" : "zu"}, Scroll ${vor.y} → ${nach.y}`);
    }
  }

  // e) Ergebnis-Modus
  {
    const row = T.zeile();
    const s = await h.starten({ start: START + "&code=abc123", angemeldet: false, warten: 2500, jetzt: T.JETZT,
      supabase: att(() => row, { rpc: { heimturnier_ergebnis: true } }) });
    const e = await s.page.evaluate(async () => {
      htPubFilter(3); await new Promise(r => setTimeout(r, 200));
      const karte = [...document.querySelectorAll("#ht-public article")].find(a => /FC Viktoria Mühlenbach gegen SpVg Kastanienhain/.test(a.getAttribute("aria-label") || "") || /Viktoria Mühlenbach/.test(a.textContent) && /Kastanienhain/.test(a.textContent));
      const knopf = karte && karte.querySelector("button");
      if (!knopf) return { knopf: false };
      const h = Math.round(knopf.getBoundingClientRect().height);
      knopf.click(); await new Promise(r => setTimeout(r, 200));
      const blatt = document.getElementById("htpub-sheet");
      const titel = blatt ? blatt.textContent.replace(/\s+/g, " ").slice(0, 80) : "";
      const plus = blatt && [...blatt.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === "Tor");
      if (plus) { plus.click(); await new Promise(r => setTimeout(r, 400)); }
      return { knopf: true, h, titel };
    });
    const rpc = s.gesendet.filter(g => /heimturnier_ergebnis/.test(g.pfad));
    await s.schliessen();
    if (!e.knopf) probleme.push("e) Ergebnis-Modus: kein Eintragen-Knopf an der Karte Viktoria – Kastanienhain");
    else {
      if (!/Viktoria Mühlenbach.*Kastanienhain/.test(e.titel)) probleme.push(`e) das Blatt gehört zum falschen Spiel: „${e.titel}“`);
      if (!rpc.length || rpc[0].body.p_idx !== 3) probleme.push(`e) „+“ schickt p_idx ${rpc.length ? rpc[0].body.p_idx : "–"} (Soll 3, Index im Gesamtplan)`);
      if (e.h < 44) probleme.push(`e) Eintragen-Knopf nur ${e.h} px hoch`);
      zeilen.push(`e) Filter Viktoria: Blatt „${e.titel.slice(0, 50)}“, p_idx ${rpc.length ? rpc[0].body.p_idx : "–"}, Knopf ${e.h} px`);
    }
  }

  // g) Kontrast, Knöpfe, Breite
  for (const [breite, scheme] of [[390, "light"], [390, "dark"], [1280, "light"]]) {
    const row = T.zeile();
    const s = await h.starten({ start: START, angemeldet: false, warten: 2500, jetzt: T.JETZT, breite, hoehe: 900, scheme, supabase: att(() => row) });
    await s.page.waitForTimeout(1500);   // Auftauchen der Karten vorbei
    const g = await s.page.evaluate(`(()=>{eval(${JSON.stringify(h.kontrastHelfer)});return ${MESS};})()`);
    await s.schliessen();
    const wo = `g) ${breite} px ${scheme === "dark" ? "dunkel" : "hell"}`;
    if (g.theme !== "light") probleme.push(`${wo}: data-theme=${g.theme}`);
    if (!g.n) probleme.push(`${wo}: keine Schrift gemessen`);
    if (g.unter.length) probleme.push(`${wo}: ${g.unter.length} Stellen unter dem Soll – ${g.unter.slice(0, 3).join(" · ")}`);
    if (g.knoepfe.length) probleme.push(`${wo}: Knöpfe unter 44 px – ${g.knoepfe.slice(0, 3).join(" · ")}`);
    if (g.quer) probleme.push(`${wo}: die Seite scrollt waagerecht`);
    zeilen.push(`${wo}: ${g.n} Textstellen, ${g.unter.length} unter dem Soll, ${g.knoepfe.length} Knöpfe < 44 px`);
  }
  return h.ergebnis("v897 Öffentliche Turnierseite: Zwischenstand, Regelwerk bleibt offen, Filter, Wappen, Ergebnis-Modus, Bewegung, Kontrast", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
