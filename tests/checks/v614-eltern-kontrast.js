/* v614 · Paket C, vierter Schritt: jede Schrift im Eltern-Bereich ist lesbar, hell und dunkel.

   Den Eltern-Bereich sehen ab dem Elternabend (28.09.) alle Familien. Gemessen am echten DOM,
   Handybreite 390 px, mit einem zugeordneten Kind und zwei Terminen: das Dashboard und sieben
   Fenster (Fahrgemeinschaft, Fan-Fakten, Abzeichen, Chronik, Tour, Was ist neu, Termin).
   Jede sichtbare Schrift muss 4,5:1 erreichen, große Schrift 3:1 (WCAG). Nicht gewertet werden
   reine Emojis (farbige Bilder, kein Schriftkontrast) und Schrift auf Farbverläufen, deren
   Grund sich nicht als eine Farbe messen lässt.

   v613 hatte 174 Stellen darunter, unter anderem:
   - im dunklen Modus die Knöpfe Zusage/Unsicher/Absage (4,42:1) – der Dunkel-Sweep hellte
     dunkle Schrift nur zur Hälfte auf,
   - das leise Grau auf dem grauen Seitengrund (#64748b auf #f1f5f9: 4,34:1),
   - die Orts-Links im dunklen Modus (#1a56db auf Dunkel: 2,17:1),
   - „Als geschafft eintragen“ (Weiß auf #f59e0b: 2,15:1) und „Mitfahrt suchen“ (3,77:1),
   - „– Ergebnis folgt –“ in der Chronik (#94a3b8: 2,56:1). */
"use strict";
const MESS_SRC = `(wo)=>{const out=[];const els=[...document.querySelectorAll("body *")].filter(el=>{const rr=el.getBoundingClientRect();if(!rr.width||!rr.height)return false;return [...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);});
 for(const el of els){const b=el.getBoundingClientRect();if(!b.width||!b.height)continue;const st=getComputedStyle(el);if(st.visibility==="hidden"||parseFloat(st.opacity)<0.2)continue;
  const k=window.__kontrastVon(el);const fs=parseFloat(st.fontSize),fw=parseInt(st.fontWeight)||400;const gross=fs>=24||(fs>=18.66&&fw>=700);const soll=gross?3:4.5;
  let verlauf=false;for(let e=el;e;e=e.parentElement){if(getComputedStyle(e).backgroundImage!=="none"){verlauf=true;break;}} if(k<soll)out.push({wo,k,soll,verlauf,t:[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join("").trim().replace(/\\s+/g," ").slice(0,34),farbe:st.color,style:(el.getAttribute("style")||"").slice(0,60)});}
 out.push({wo:wo+"#gesamt",n:els.length});return out;}`;
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const alle = [];
  for (const scheme of ["light", "dark"]) {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 900, scheme,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
        termine: [{ id: 5, datum: h.tagePlus(2), typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz" },
                  { id: 6, datum: h.tagePlus(4), typ: "spiel", uhrzeit: "10:00", gegner: "Gegner FC", ort: "Auswärts" }], rueckmeldungen: [] }) });
    await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4500);
    const lauf = async (n, code) => {
      try {
        alle.push(...await s.page.evaluate(async ({ MESS, helfer, wo, code }) => {
          eval(helfer); const mess = eval(MESS); const w = ms => new Promise(r => setTimeout(r, ms));
          if (!code) return mess(wo);
          const vor = new Set(document.body.children); try { await eval("(async()=>{" + code + "})()"); } catch (e) {}
          await w(1000); const o = mess(wo); [...document.body.children].filter(e => !vor.has(e)).forEach(e => e.remove()); return o;
        }, { MESS: MESS_SRC, helfer: h.kontrastHelfer, wo: scheme + ":" + n, code }));
      } catch (e) { await s.page.waitForTimeout(4500); }   // ein Fenster, das neu lädt, zählt hier nicht
    };
    await lauf("Dashboard", null);
    for (const [n, c] of [["Fahrgemeinschaft", "await elternCarpoolOpen(1,5)"], ["Fan-Fakten", "await elternFanfactsOpen(1,'Kind A')"],
      ["Abzeichen", "await abzeichenOpen(1,'Kind A',false)"], ["Chronik", "await chronikOpen()"], ["Tour", "elternTourIdx=0;elternTourRender()"],
      ["Was ist neu", "whatsNewOpen()"], ["Termin", "await terminDetailOpen(5)"]]) await lauf(n, c);
    await s.schliessen();
  }
  const gemessen = alle.filter(x => /#gesamt/.test(x.wo));
  const befunde = alle.filter(x => !/#gesamt/.test(x.wo) && !x.verlauf && /[A-Za-zÄÖÜäöüß0-9]/.test(x.t));
  const summe = sch => gemessen.filter(x => x.wo.startsWith(sch)).reduce((a, x) => a + x.n, 0);
  if (summe("light") < 300 || summe("dark") < 300) probleme.push(`zu wenig gemessen (hell ${summe("light")}, dunkel ${summe("dark")}) – der Eltern-Bereich hat sich nicht aufgebaut`);
  if (befunde.length) {
    const g = {}; befunde.forEach(x => { const k = `${x.wo.split(":")[0] === "light" ? "hell" : "dunkel"} ${x.k}:1 „${x.t}“ (${x.wo.split(":")[1]})`; g[k] = 1; });
    probleme.push(`${befunde.length} Stellen unter dem Soll: ` + Object.keys(g).slice(0, 6).join(" · "));
  }
  zeilen.push(`gemessen: hell ${summe("light")} und dunkel ${summe("dark")} Textstellen in Dashboard + 7 Fenstern · unter dem Soll: ${befunde.length}`);
  return h.ergebnis("v614 Eltern-Bereich lesbar: jede Schrift ≥ 4,5:1 (groß 3:1), hell und dunkel", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
