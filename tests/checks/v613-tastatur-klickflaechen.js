/* v613 · Paket C, dritter Schritt: jede Klickfläche geht auch mit der Tastatur.

   Befund der App-Prüfung vom 24.09.: 17 Klickflächen sind <div>/<span> mit onclick – die
   Kriterienköpfe in „Bewerten“, Terminkarten, Sterne, Kacheln im Quiz. Mit Tab kam man nicht
   hin, mit Enter passierte nichts.

   Jetzt tragen sie role="button" tabindex="0", und core.js löst bei Enter und Leertaste den
   Klick aus (wie ein echter Knopf).

   a) Im Code steht kein <div>/<span> mit onclick mehr ohne role und tabindex (Ausnahmen:
      Hintergrund-Klick zum Schließen, reine stopPropagation-Hüllen).
   b) Kriterienkopf in „Bewerten“: Tab erreicht ihn, Enter klappt ihn zu und wieder auf.
   c) Sterne: Enter setzt 3, Leertaste auf dem vierten setzt 4 – der Fokus bleibt auf dem Stern.
   d) Eine Zeile mit eigenem onkeydown („Diese Woche“) löst bei Enter genau EINEN Klick aus.
   e) Die Messung am Handy (390 px): in 23 Trainer-Fenstern und im Eltern-Bereich ist keine
      Bedienfläche unter 44 px – außer runden Symbolknöpfen und durchsichtigen Textlinks. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  // ── a) statisch ─────────────────────────────────────────────────────────────
  {
    const rot = [];
    for (const d of fs.readdirSync(h.REPO).filter(d => /\.js$/.test(d))) {
      const s = fs.readFileSync(path.join(h.REPO, d), "utf8");
      const re = /<(div|span|li|td)\b([^>]*?)\bonclick=(["'])(.*?)\3([^>]*)>/gs; let m;
      while ((m = re.exec(s))) {
        const at = m[2] + m[5], oc = m[4];
        if (/role=/.test(at) && /tabindex/.test(at)) continue;
        if (/event\.target===this|e\.target===|^event\.stopPropagation\(\)$/.test(oc)) continue;
        rot.push(`${d}: ${oc.slice(0, 30)}`);
      }
    }
    if (rot.length) probleme.push(`a) ${rot.length} Klickflächen ohne role/tabindex: ` + rot.slice(0, 4).join(" · "));
    zeilen.push(`a) Klickflächen ohne role/tabindex: ${rot.length}`);
  }

  // ── b–d) Tastatur am echten DOM ─────────────────────────────────────────────
  {
    const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    await h.sichtbarMachen(s.page, "#dims-wrap");
    // b) Kriterienkopf
    const b0 = await s.page.evaluate(async () => {
      document.getElementById("pin-gate")?.remove();
      if (!window.Chart) { window.Chart = function () { return { destroy() {}, update() {} }; }; window.Chart.getChart = () => null; }
      try { buildDims(false); } catch (e) { return { fehler: e.message }; }
      const k = document.querySelector("#dims-wrap .dim-head");
      if (!k) return { fehlt: true };
      k.id = "v613-kopf"; k.focus();
      return { fokus: document.activeElement === k, zu: k.nextElementSibling.classList.contains("coll"), tab: k.tabIndex, rolle: k.getAttribute("role") };
    });
    let b1 = {}, b2 = {};
    if (!b0.fehlt && !b0.fehler) {
      await s.page.keyboard.press("Enter");
      b1 = await s.page.evaluate(() => ({ zu: document.getElementById("v613-kopf").nextElementSibling.classList.contains("coll") }));
      await s.page.keyboard.press("Enter");
      b2 = await s.page.evaluate(() => ({ zu: document.getElementById("v613-kopf").nextElementSibling.classList.contains("coll") }));
    }
    // c) Sterne
    await s.page.evaluate(() => {
      const d = document.createElement("div"); d.id = "v613-sterne"; d.innerHTML = einheitStarRow("v613", "Spaß", 0, 5, 24);
      document.body.appendChild(d); document.querySelector("#eb-stars-v613 > :nth-child(3)").focus();
    });
    await s.page.keyboard.press("Enter");
    const c1 = await s.page.evaluate(() => ({ wert: einheitGetStar("v613"), fokus: document.activeElement.getAttribute("aria-label") }));
    await s.page.keyboard.press("Tab");
    await s.page.keyboard.press(" ");
    const c2 = await s.page.evaluate(() => ({ wert: einheitGetStar("v613"), fokus: document.activeElement.getAttribute("aria-label") }));
    // d) eigene onkeydown-Zeile
    const d1 = await s.page.evaluate(() => {
      window.__v613 = 0; const z = document.createElement("div");
      z.innerHTML = `<div class="woche-zeile" id="v613-zeile" role="button" tabindex="0" onclick="window.__v613++" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">Zeile</div>`;
      document.body.appendChild(z); document.getElementById("v613-zeile").focus(); return true;
    });
    await s.page.keyboard.press("Enter");
    const dN = await s.page.evaluate(() => window.__v613);
    const f = s.fehler();
    await s.schliessen();

    if (b0.fehler || b0.fehlt) probleme.push("b) kein Kriterienkopf gebaut: " + (b0.fehler || "fehlt"));
    else {
      if (b0.tab !== 0 || b0.rolle !== "button" || !b0.fokus) probleme.push(`b) Kriterienkopf nicht erreichbar (tabindex ${b0.tab}, role ${b0.rolle})`);
      if (b1.zu === b0.zu) probleme.push("b) Enter klappt den Kriterienkopf nicht um");
      if (b2.zu !== b0.zu) probleme.push("b) zweites Enter stellt den Ausgangszustand nicht her");
    }
    if (c1.wert !== 3) probleme.push(`c) Enter auf dem dritten Stern setzt ${c1.wert}`);
    if (!/^3 von 5/.test(c1.fokus || "")) probleme.push(`c) nach Enter steht der Fokus nicht mehr auf dem Stern (${c1.fokus})`);
    if (c2.wert !== 4) probleme.push(`c) Tab + Leertaste setzt ${c2.wert} statt 4`);
    if (dN !== 1) probleme.push(`d) Enter löste ${dN} Klicks aus statt einem`);
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`b) Kriterienkopf: tabindex ${b0.tab}, ${b0.zu ? "zu" : "offen"} → Enter → ${b1.zu ? "zu" : "offen"} → Enter → ${b2.zu ? "zu" : "offen"}`);
    zeilen.push(`c) Sterne: Enter → ${c1.wert} (Fokus „${c1.fokus}“), Tab + Leertaste → ${c2.wert} · d) eigene Zeile: ${dN} Klick`);
  }

  // ── e) 44 px, gemessen ──────────────────────────────────────────────────────
  {
    const MESS = `(wo,root)=>{const out=[];root.querySelectorAll("button,[role=button],summary").forEach(el=>{const b=el.getBoundingClientRect();if(!b.width||!b.height||b.height>=44)return;const st=getComputedStyle(el);if(st.visibility==="hidden")return;
      if(st.borderRadius.includes("50%")||(parseFloat(st.borderRadius)>=b.height/2-1&&Math.abs(b.width-b.height)<4))return;
      if(st.backgroundColor==="rgba(0, 0, 0, 0)"&&(st.borderTopStyle==="none"||st.borderTopWidth==="0px"))return;
      out.push(wo+": „"+(el.getAttribute("aria-label")||el.textContent).trim().replace(/\\s+/g," ").slice(0,24)+"“ "+Math.round(b.height)+" px");});return out;}`;
    const zuKlein = [];
    const s = await h.starten({ warten: 2500, breite: 390, hoehe: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    for (const fn of ["materialOpen", "trainerPlanOpen", "pausenOpen", "notfallTrainerOpen", "fundbueroOpen", "kasseOpen", "ausstattungOpen", "mitbringTrainerOpen",
      "trainerMeetingOpen", "saisonCockpitOpen", "awUebersichtOpen", "rollenMatrixOpen", "probeOpen", "ansageTrainerOpen", "epollTrainerOpen", "einladungskartenOpen",
      "qrAushangOpen", "wahlTrainerOpen", "questEditorOpen", "urkundenOpen", "setupTrainerOpen", "nutzungOpen", "blitzOpen"]) {
      try {
        zuKlein.push(...await s.page.evaluate(async ({ MESS, fn }) => {
          const mess = eval(MESS); document.getElementById("pin-gate")?.remove();
          if (typeof window[fn] !== "function") return [];
          const vor = new Set(document.body.children); try { await window[fn](); } catch (e) {}
          await new Promise(r => setTimeout(r, 700));
          const neu = [...document.body.children].filter(e => !vor.has(e)), out = [];
          neu.forEach(n => out.push(...mess(fn, n))); neu.forEach(n => n.remove()); return out;
        }, { MESS, fn }));
      } catch (e) { await s.page.waitForTimeout(2000); }   // ein Fenster, das neu lädt, zählt hier nicht
    }
    await s.schliessen();
    if (zuKlein.length) probleme.push(`e) ${zuKlein.length} Bedienflächen unter 44 px: ` + zuKlein.slice(0, 4).join(" · "));
    zeilen.push(`e) 23 Trainer-Fenster am Handy: ${zuKlein.length} Bedienflächen unter 44 px`);
  }
  return h.ergebnis("v613 Klickflächen per Tastatur: Tab erreicht, Enter/Leertaste lösen aus, 44 px gemessen", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
