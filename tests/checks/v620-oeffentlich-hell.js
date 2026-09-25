/* v620 · Paket C, letzter Schritt: die öffentlichen Seiten bleiben hell.

   Matchday (?match), Delegate, Liveticker, Kind-Link, Übergabe, Festival-/Turnier-Link und
   Stadionheft haben ein festes helles Layout (weiße Karten auf #f1f5f9). Im dunklen Modus des
   Handys – oder wenn jemand in der App „dunkel“ gewählt hat – schalteten die Farb-Tokens
   trotzdem um: helle Schrift auf Weiß. v615 hatte das nur für den Festival-Link gelöst.

   Je Seite, dunkler Modus des Handys UND gespeicherte Wahl „dunkel“:
   a) <html data-theme="light">, der Seitengrund ist hell;
   b) jede sichtbare Schrift erreicht 4,5:1 (große 3:1) – gemessen am echten DOM, auch in
      Leer- und Fehlerzuständen (die Attrappe liefert keine Daten). */
"use strict";
const MESS_SRC = `(wo)=>{const out=[];const els=[...document.querySelectorAll("body *")].filter(el=>{const rr=el.getBoundingClientRect();if(!rr.width||!rr.height)return false;return [...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);});
 for(const el of els){const b=el.getBoundingClientRect();if(!b.width||!b.height)continue;const st=getComputedStyle(el);if(st.visibility==="hidden"||parseFloat(st.opacity)<0.2)continue;
  const k=window.__kontrastVon(el);const fs=parseFloat(st.fontSize),fw=parseInt(st.fontWeight)||400;const gross=fs>=24||(fs>=18.66&&fw>=700);const soll=gross?3:4.5;
  let verlauf=false;for(let e=el;e;e=e.parentElement){if(getComputedStyle(e).backgroundImage!=="none"){verlauf=true;break;}} if(k<soll)out.push({wo,k,soll,verlauf,t:[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join("").trim().replace(/\\s+/g," ").slice(0,34),farbe:st.color,style:(el.getAttribute("style")||"").slice(0,60)});}
 out.push({wo:wo+"#gesamt",n:els.length});return out;}`;

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const SEITEN = [["Matchday", "?match=2026-09-26"], ["Delegate", "?delegate=abc"], ["Liveticker", "?ticker=abc"], ["Kind-Link", "?kind=abc"],
                  ["Übergabe", "?handover"], ["Festival", "?turnier=kinderfestival-x"], ["Stadionheft", "?heft"]];
  for (const [name, q] of SEITEN) {
    const s = await h.starten({ start: "/eltern/index.html" + q, angemeldet: false, warten: 1500, scheme: "dark", speicherBehalten: true, breite: 390, hoehe: 900,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    await s.page.evaluate(() => { try { localStorage.setItem("adler_theme", "dark"); } catch (e) {} });
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3000);
    const r = await s.page.evaluate(({ MESS, helfer, wo }) => {
      eval(helfer); const mess = eval(MESS);
      const bg = getComputedStyle(document.body).backgroundColor;
      const m = bg.match(/\d+/g).map(Number); const hell = (m[0] + m[1] + m[2]) / 3 > 200;
      return { theme: document.documentElement.getAttribute("data-theme"), hell, bg, befunde: mess(wo) };
    }, { MESS: MESS_SRC, helfer: h.kontrastHelfer, wo: name });
    await s.schliessen();
    const n = (r.befunde.find(x => /#gesamt/.test(x.wo)) || {}).n || 0;
    const unter = r.befunde.filter(x => !/#gesamt/.test(x.wo) && !x.verlauf && /[A-Za-zÄÖÜäöüß0-9]/.test(x.t));
    if (r.theme !== "light") probleme.push(`a) ${name}: data-theme=${r.theme}`);
    if (!r.hell) probleme.push(`a) ${name}: Seitengrund dunkel (${r.bg})`);
    if (!n) probleme.push(`b) ${name}: keine Schrift gemessen – die Seite hat sich nicht aufgebaut`);
    if (unter.length) probleme.push(`b) ${name}: ${unter.length} Stellen unter dem Soll – ` + unter.slice(0, 3).map(x => `„${x.t}“ ${x.k}:1`).join(" · "));
    zeilen.push(`${name}: ${r.theme}, Grund ${r.hell ? "hell" : "dunkel"}, ${n} Textstellen, ${unter.length} unter dem Soll`);
  }
  return h.ergebnis("v620 Öffentliche Seiten bleiben hell – auch im dunklen Modus und bei gewähltem „dunkel“", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
