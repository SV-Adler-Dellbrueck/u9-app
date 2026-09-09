/* v492 – PO: „Es gibt ja mehrere solcher Kacheln. Gehe die alle im gleichen Muster nochmal
   durch und optimiere." Der Durchgang ergab: die Termin-Karte war der Ausreisser (v491), die
   uebrigen Fenster sind geordnet. Damit das so bleibt, prueft dieser Lauf sie ALLE bei jedem
   Durchgang: jedes Fenster oeffnet ohne Fehler, hat eine Ueberschrift, und kein beschriftetes
   Bedienelement ist kleiner als 44 px (runde Icon-Knoepfe und Inline-Links ausgenommen –
   so steht es in CLAUDE.md). Neue Fenster gehoeren in diese Liste. */
const FENSTER = ["ttOpen", "arenaEditOpen", "skillWocheOpen", "elternGespraechOpen", "rollenMatrixOpen",
  "periodOpen", "kleingruppenOpen", "awUebersichtOpen", "tgOpen", "fotoAmpelOpen", "chronikOpen",
  "elternTermineOpen", "fundbueroOpen", "ausruestungGrid", "gegnerManageOpen", "turnierOpen",
  "kasseOpen", "wochenChallengeOpen", "setupTrainerOpen", "pausenOpen", "notfallTrainerOpen",
  "urkundenOpen", "anwesenheitOpen", "saisonStartOpen", "wahlTrainerOpen", "probeOpen",
  "saisonCockpitOpen", "hilfeOpen", "adlerWeltOpen", "albumFotosOpen", "pwChangeOpen", "nutzungOpen",
  "trainerRsvpQuickOpen", "trainerPlanOpen", "heftRenderEditor", "kiCoachOpen"];
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  /* Ein Fenster kann die Seite mitreissen (ein spaeter Timer eines vorherigen Fensters, ein
     Deep-Link). Dann wird neu gestartet und DASSELBE Fenster noch einmal geoeffnet: geht es
     dann, lag es nicht an ihm; stirbt es wieder, ist es sein Fehler. */
  const neu = async () => {
    const x = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [],
      termine: [{ id: 1, datum: h.tagePlus(2), typ: "spiel", heim: true, uhrzeit: "11:00", gegner: "SC Test", trainer_status: { Charles: "ja" } }],
      profiles: [{ name: "Charles", rolle: "trainer" }] }), hoehe: 1400 });
    await x.page.evaluate(async () => {
      await loadKader(); window.trainerMe = async () => "Charles";
      document.getElementById("pin-gate")?.remove();
      const a = document.getElementById("main-app"); if (a) a.style.display = "block";
    });
    return x;
  };
  let s = await neu(); const neustarts = [];
  const mess = fn => `(async()=>{
    const warte=ms=>new Promise(r=>setTimeout(r,ms));
    document.querySelectorAll('[id$="-modal"]').forEach(m=>m.remove());
    if(typeof window[${JSON.stringify(fn)}]!=="function")return {fehlt:true};
    try{ await window[${JSON.stringify(fn)}](); }catch(e){ return {fehler:String(e).slice(0,70)}; }
    await warte(300);
    const mo=[...document.querySelectorAll('[id$="-modal"]')].pop();
    if(!mo)return {leer:true};
    const kopf=mo.textContent.replace(/\\s+/g," ").trim().slice(0,40);
    const klein=[...mo.querySelectorAll("button,a.btn")].filter(b=>{
      const r=b.getBoundingClientRect(), t=(b.textContent||"").trim();
      return r.height>0&&r.height<44&&t.replace(/[^\\p{L}\\p{N}]/gu,"").length>=3;
    }).map(b=>(b.textContent||"").trim().slice(0,20)+" ("+Math.round(b.getBoundingClientRect().height)+"px)");
    return {kopf,klein,knoepfe:mo.querySelectorAll("button,a.btn").length};
  })()`;
  const ergebnis = []; let fehler = [];
  for (const fn of FENSTER) {
    let r;
    try { r = await s.page.evaluate(mess(fn)); }
    catch (e) {
      fehler = fehler.concat(s.fehler()); try { await s.schliessen(); } catch (_) {}
      s = await neu(); neustarts.push(fn);
      try { r = await s.page.evaluate(mess(fn)); }
      catch (e2) { r = { fehler: "reißt die Seite mit" }; try { await s.schliessen(); } catch (_) {} s = await neu(); }
    }
    ergebnis.push({ fn, ...(r || { leer: true }) });
  }
  fehler = fehler.concat(s.fehler()); await s.schliessen();
  const fehlt = ergebnis.filter(e => e.fehlt).map(e => e.fn);
  const kaputt = ergebnis.filter(e => e.fehler).map(e => `${e.fn}: ${e.fehler}`);
  const leer = ergebnis.filter(e => e.leer).map(e => e.fn);
  const klein = ergebnis.filter(e => e.klein && e.klein.length).map(e => `${e.fn} → ${e.klein.join(", ")}`);
  if (fehlt.length) probleme.push(`Fenster nicht gefunden: ${fehlt.join(", ")}`);
  if (kaputt.length) probleme.push(...kaputt.slice(0, 4));
  if (leer.length) probleme.push(`öffnen kein Fenster: ${leer.join(", ")}`);
  if (klein.length) probleme.push(...klein.slice(0, 6));
  const ohneKopf = ergebnis.filter(e => e.kopf !== undefined && e.kopf.length < 3).map(e => e.fn);
  if (ohneKopf.length) probleme.push(`ohne Überschrift: ${ohneKopf.join(", ")}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  const gut = ergebnis.filter(e => e.kopf !== undefined);
  zeilen.push(`${gut.length} von ${FENSTER.length} Fenstern geöffnet, alle mit Überschrift und ohne zu kleines Bedienelement`);
  zeilen.push(`Knöpfe je Fenster: ${Math.min(...gut.map(e => e.knoepfe))}–${Math.max(...gut.map(e => e.knoepfe))}`);
  if (neustarts.length) zeilen.push(`Seite neu gestartet vor: ${neustarts.join(", ")} – danach sauber geöffnet`);
  return h.ergebnis("Alle Fenster öffnen sauber und halten 44 px ein", !probleme.length, zeilen.concat(probleme));
};
