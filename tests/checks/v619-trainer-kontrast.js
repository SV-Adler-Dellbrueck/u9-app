/* v619 · Paket C, fünfter Schritt: der Trainer-Bereich, gemessen wie der Eltern-Bereich (v614).

   Handybreite 390 px, hell und dunkel: die sieben Reiter (Start, Training, Spieltag, Team,
   Taktik, Eltern & Kinder, Orga) und 24 Fenster. Jede sichtbare Schrift muss 4,5:1 erreichen,
   große Schrift 3:1; nicht gewertet werden reine Emojis und Schrift auf Farbverläufen.

   v618 hatte 14 Stellen darunter:
   - im dunklen Modus der aktive Reiter „Training“ und sein Unterreiter (Weiß auf hellem Grün,
     1,74:1) – die Familienfarbe hing an --green, das im Dunkeln Schriftfarbe ist,
   - die Kader-Zahl im Reiter Team (Blau auf Dunkel, 2,37:1),
   - „pro Kind“ im Quest-Editor (helles Grau auf hellem Grün im Dunkeln, 1,97:1),
   - die gewählten Knöpfe im Trainingsturnier (Weiß auf Orange, 3,19:1). */
"use strict";
const MESS_SRC = `(wo)=>{const out=[];const els=[...document.querySelectorAll("body *")].filter(el=>{const rr=el.getBoundingClientRect();if(!rr.width||!rr.height)return false;return [...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);});
 for(const el of els){const b=el.getBoundingClientRect();if(!b.width||!b.height)continue;const st=getComputedStyle(el);if(st.visibility==="hidden"||parseFloat(st.opacity)<0.2)continue;
  const k=window.__kontrastVon(el);const fs=parseFloat(st.fontSize),fw=parseInt(st.fontWeight)||400;const gross=fs>=24||(fs>=18.66&&fw>=700);const soll=gross?3:4.5;
  let verlauf=false;for(let e=el;e;e=e.parentElement){if(getComputedStyle(e).backgroundImage!=="none"){verlauf=true;break;}} if(k<soll)out.push({wo,k,soll,verlauf,t:[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join("").trim().replace(/\\s+/g," ").slice(0,34),farbe:st.color,style:(el.getAttribute("style")||"").slice(0,60)});}
 out.push({wo:wo+"#gesamt",n:els.length});return out;}`;

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const alle = [];
  for (const scheme of ["light", "dark"]) {
    const s = await h.starten({ warten: 2500, breite: 390, hoehe: 900, scheme, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      termine: [{ id: 5, datum: h.tagePlus(2), typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz" }, { id: 6, datum: h.tagePlus(4), typ: "spiel", uhrzeit: "10:00", gegner: "Gegner FC", ort: "Auswärts" }] }) });
    await s.page.evaluate(() => { document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block"; });
    const lauf = async (n, code, fenster) => {
      try {
        alle.push(...await s.page.evaluate(async ({ MESS, helfer, wo, code, fenster }) => {
          eval(helfer); const mess = eval(MESS); const w = ms => new Promise(r => setTimeout(r, ms));
          const vor = new Set(document.body.children); try { await eval("(async()=>{" + code + "})()"); } catch (e) {}
          await w(900); const o = mess(wo); if (fenster) [...document.body.children].filter(e => !vor.has(e)).forEach(e => e.remove()); return o;
        }, { MESS: MESS_SRC, helfer: h.kontrastHelfer, wo: scheme + ":" + n, code, fenster }));
      } catch (e) { await s.page.waitForTimeout(3000); }   // ein Fenster, das neu lädt, zählt hier nicht
    };
    for (const t of ["home", "training", "spieltag", "team", "taktik", "elki", "orga"]) await lauf("Reiter " + t, `openTab("${t}")`, false);
    for (const fn of ["materialOpen", "trainerPlanOpen", "pausenOpen", "notfallTrainerOpen", "fundbueroOpen", "kasseOpen", "ausstattungOpen", "mitbringTrainerOpen",
      "trainerMeetingOpen", "saisonCockpitOpen", "awUebersichtOpen", "rollenMatrixOpen", "probeOpen", "ansageTrainerOpen", "epollTrainerOpen", "einladungskartenOpen",
      "qrAushangOpen", "wahlTrainerOpen", "questEditorOpen", "urkundenOpen", "setupTrainerOpen", "nutzungOpen", "blitzOpen", "wissenAuf"])
      await lauf(fn, `openTab("home"); if(typeof ${fn}==="function") await ${fn}()`, true);
    await s.schliessen();
  }
  const gemessen = alle.filter(x => /#gesamt/.test(x.wo));
  const befunde = alle.filter(x => !/#gesamt/.test(x.wo) && !x.verlauf && /[A-Za-zÄÖÜäöüß0-9]/.test(x.t));
  const summe = sch => gemessen.filter(x => x.wo.startsWith(sch)).reduce((a, x) => a + x.n, 0);
  if (summe("light") < 1500 || summe("dark") < 1500) probleme.push(`zu wenig gemessen (hell ${summe("light")}, dunkel ${summe("dark")}) – der Trainer-Bereich hat sich nicht aufgebaut`);
  if (befunde.length) {
    const g = {}; befunde.forEach(x => { g[`${x.wo.split(":")[0] === "light" ? "hell" : "dunkel"} ${x.k}:1 „${x.t}“ (${x.wo.split(":")[1]})`] = 1; });
    probleme.push(`${befunde.length} Stellen unter dem Soll: ` + Object.keys(g).slice(0, 6).join(" · "));
  }
  zeilen.push(`gemessen: hell ${summe("light")} und dunkel ${summe("dark")} Textstellen in 7 Reitern + 24 Fenstern · unter dem Soll: ${befunde.length}`);
  return h.ergebnis("v619 Trainer-Bereich: jede Schrift lesbar, hell und dunkel (gemessen)", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
