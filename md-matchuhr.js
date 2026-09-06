/* ═══════════════════════════════════
   MATCH-UHR (Phase 6) – Anker-basierte Spieluhr, synchron über alle Geräte.
   Zustand liegt auf matchday (datum-keyed): half, clock_status, started_at,
   paused_ms. Jeder Client rechnet die verstrichene Zeit selbst aus dem Anker –
   kein Sekunden-Broadcast nötig. Speist später die Minute für den Eltern-Ticker.
═══════════════════════════════════ */
/* Standard 10 Minuten, eine Spielzeit (PO v397). Die U9 spielt in aller Regel kurze
   Einzelspiele; die alten 20 Minuten mit Halbzeit waren aus der Feldgröße geraten. */
const MC_DAUER_STD=10, MC_HALBZEITEN_STD=1;
let mcState=null, mcTickId=null, mcSpieldauer=MC_DAUER_STD, mcHalbzeiten=MC_HALBZEITEN_STD, mcTickerOpen=false, mcDelegateToken=null;
function mcElapsedSec(mc){
  const paused=mc.paused_ms||0;
  if(mc.clock_status==="running"&&mc.started_at){
    return (paused+(Date.now()-new Date(mc.started_at).getTime()))/1000;
  }
  return paused/1000;
}
/* Minute fürs Anzeigen/den Ticker – gedeckelt auf die Spielzeit ("20.+" statt "23.").
   Bei EINER Spielzeit gibt es keinen Halbzeit-Versatz; mc.half bleibt dann immer 1. */
function mcMinuteLabel(mc,dauer,halbzeiten){
  if(!mc||mc.clock_status==="idle")return "–";
  if(mc.clock_status==="halftime")return "Halbzeit";
  if(mc.clock_status==="ended")return "Abgepfiffen";
  const sec=mcElapsedSec(mc);
  const minIn=Math.floor(sec/60);
  const zweite=(Number(halbzeiten)||2)===2&&(mc.half||1)===2;
  const offset=zweite?dauer:0;
  if(minIn>=dauer) return (offset+dauer)+".+"; // Nachspielzeit
  return (offset+minIn+1)+".";
}
async function mcLoad(){
  const datum=spieltagKey();
  const realDate=spieltagRawDate(); // Spieldauer liegt am echten Termin-Datum, nicht am Team-Key
  try{
    const [mdRes,tmRes]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=half,clock_status,started_at,paused_ms,ticker_open,delegate_token,spieldauer_min,halbzeiten`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(realDate)}&select=spieldauer_min,halbzeiten&order=id.desc&limit=1`,{headers:sbAuthHeaders()})
    ]);
    const mdRows=mdRes.ok?await mdRes.json():[];
    const tmRows=tmRes.ok?await tmRes.json():[];
    /* Der Termin ist die Planung und hat Vorrang; matchday faengt die Faelle ohne
       Termin-Eintrag ab (frei getipptes Datum). Aendert der Trainer die Zeit an der Uhr,
       wird beides geschrieben – dann koennen sie gar nicht auseinanderlaufen. */
    mcSpieldauer=(tmRows[0]&&tmRows[0].spieldauer_min)||(mdRows[0]&&mdRows[0].spieldauer_min)||MC_DAUER_STD;
    mcHalbzeiten=(tmRows[0]&&tmRows[0].halbzeiten)||(mdRows[0]&&mdRows[0].halbzeiten)||MC_HALBZEITEN_STD;
    mcState=mdRows[0]||{half:1,clock_status:"idle",started_at:null,paused_ms:0};
    /* v468: Der Ticker ist AUS, bis der Trainer ihn ausdruecklich startet. Frueher war
       ticker_open ein Aus-Schalter (alles ausser false galt als an) – damit gab es keinen
       Moment „wir tickern heute", und die Eltern-Kachel musste raten. */
    mcTickerOpen=mdRows[0]?mdRows[0].ticker_open===true:false;
    mcDelegateToken=(mdRows[0]&&mdRows[0].delegate_token)||null;
  }catch(e){
    mcState=mcState||{half:1,clock_status:"idle",started_at:null,paused_ms:0};
  }
  mcRenderLive();
  tickerRenderControls();
  clearInterval(mcTickId);
  mcTickId=setInterval(()=>{ if(mcState&&mcState.clock_status==="running")mcRenderLive(); },1000);
}
async function mcSave(patch){
  const datum=spieltagKey();
  mcState=Object.assign({},mcState,patch);
  mcRenderLive();
  try{await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum,...patch})});}catch(e){}
}
// Match-Uhr und Rotations-Timer laufen gekoppelt: EIN Button (Anpfiff) startet beide.
// Der Rotations-Timer bleibt ueber sein eigenes Panel weiterhin manuell bedienbar
// (z. B. kurze Trinkpause ohne offizielle Spielunterbrechung).
// halbzeiten mitschreiben: der oeffentliche Ticker liest matchday anonym und kennt den Termin nicht
function mcStart(){ mcSave({half:1,clock_status:"running",started_at:new Date().toISOString(),paused_ms:0,spieldauer_min:mcSpieldauer,halbzeiten:mcHalbzeiten}); rotStart();
  /* Anpfiff: alles Vorbereitende zuklappen und „Während des Spiels" aufmachen –
     ab jetzt braucht der Trainer nur noch Uhr, Wechsel und Aktionen.
     mt-phase-vor ist die globale Team-Festlegung, mt-phase-nom die Nominierung des Teams. */
  ["mt-phase-vor","mt-phase-nom"].forEach(id=>document.getElementById(id)?.removeAttribute("open"));
  const live=document.getElementById("mt-phase-live"); if(live)live.open=true;
}
function mcPause(){
  if(!mcState||mcState.clock_status!=="running")return;
  const addMs=Date.now()-new Date(mcState.started_at).getTime();
  mcSave({clock_status:"paused",started_at:null,paused_ms:(mcState.paused_ms||0)+addMs});
  rotStop();
}
function mcResume(){ mcSave({clock_status:"running",started_at:new Date().toISOString()}); rotStart(); }
function mcHalftimeStart(){
  if(!mcState||mcState.clock_status!=="running")return;
  const addMs=Date.now()-new Date(mcState.started_at).getTime();
  mcSave({clock_status:"halftime",started_at:null,paused_ms:(mcState.paused_ms||0)+addMs});
  rotStop();
}
function mcHalftimeEnd(){ mcSave({half:2,clock_status:"running",started_at:new Date().toISOString(),paused_ms:0}); rotStart(); }
function mcEnd(){ if(mcState&&mcState.clock_status==="running"&&!confirm("Wirklich abpfeifen? Die Uhr lässt sich danach nur auf 0:00 zurücksetzen."))return; mcSave({clock_status:"ended",started_at:null}); rotStop(); }
function mcReset(){ mcSave({half:1,clock_status:"idle",started_at:null,paused_ms:0}); rotStop(); }
function mcRenderLive(){
  const box=document.getElementById("mc-panel");
  if(!box||!mcState)return;
  const label=mcMinuteLabel(mcState,mcSpieldauer,mcHalbzeiten);
  const s=mcState.clock_status;
  const eineZeit=mcHalbzeiten===1;   // U9 spielt oft 1×8 oder 1×10 – dann gibt es keine Halbzeit
  let controls="";
  if(s==="idle") controls=`<button class="btn btn-p" onclick="mcStart()"><i class="ti ti-player-play"></i>Anpfiff</button>`;
  else if(s==="running") controls=`<button class="btn" onclick="mcPause()"><i class="ti ti-player-pause"></i>Unterbrechung</button>`+
    ((!eineZeit&&mcState.half===1)?`<button class="btn" onclick="mcHalftimeStart()"><i class="ti ti-hourglass"></i>Halbzeit</button>`:`<button class="btn btn-d" onclick="mcEnd()"><i class="ti ti-flag"></i>Abpfiff</button>`);
  else if(s==="paused") controls=`<button class="btn btn-p" onclick="mcResume()"><i class="ti ti-player-play"></i>Weiter</button>`;
  else if(s==="halftime") controls=`<button class="btn btn-p" onclick="mcHalftimeEnd()"><i class="ti ti-player-play"></i>2. Halbzeit anpfeifen</button>`;
  else if(s==="ended") controls=`<button class="btn" onclick="mcReset()"><i class="ti ti-refresh"></i>Neu starten</button>`;
  const phase=eineZeit?`Spielzeit · ${mcSpieldauer} Min.`:`${mcState.half===2?"2. Halbzeit":"1. Halbzeit"} · ${mcSpieldauer} Min./HZ`;
  /* Spielzeit direkt an der Uhr einstellbar (PO v397). Bis dahin ging das nur im
     Termin-Editor – am Spielfeldrand, wo die Zeit tatsächlich abgesprochen wird, war sie
     unerreichbar. Nicht sichtbar, waehrend die Uhr laeuft: dann waere jede Aenderung ein
     Eingriff ins laufende Spiel. */
  const einstellbar=(s!=="running");
  const hzBtn=n=>`<button onclick="mcSetHalbzeiten(${n})" aria-pressed="${mcHalbzeiten===n?"true":"false"}"
      style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:12px;font-weight:${mcHalbzeiten===n?"700":"500"};background:${mcHalbzeiten===n?"var(--blue)":"var(--surface)"};color:${mcHalbzeiten===n?"#fff":"var(--text2)"}">${n===1?"eine":"zwei"}</button>`;
  box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="font-size:28px;font-weight:800;min-width:70px">${label}</div>
    <div style="font-size:11px;color:var(--text2)">${phase}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">${controls}</div>
  </div>`+(einstellbar?`
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:var(--border);font-size:11.5px;color:var(--text2)">
    <label for="mc-dauer">${mcHalbzeiten===1?"Spielzeit":"Je Halbzeit"}</label>
    <input id="mc-dauer" type="number" min="1" max="45" value="${mcSpieldauer}" onchange="mcSetDauer(this.value)"
      style="width:72px;min-height:44px;padding:8px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:14px;font-weight:700;text-align:center;background:var(--surface);color:var(--text);box-sizing:border-box">
    <span>Min.</span>
    <span style="margin-left:8px">Halbzeiten</span>${hzBtn(1)}${hzBtn(2)}
  </div>`:"");
}
/* Schreibt in den Termin (dort plant der Trainer) UND in matchday (dort liest der
   oeffentliche Ticker, der den Termin nicht kennt). Gibt es fuer das Datum keinen Termin,
   greift still nur der zweite Weg. */
async function mcZeitSpeichern(){
  const realDate=spieltagRawDate();
  try{
    await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(realDate)}`,{method:"PATCH",
      headers:sbAuthHeaders({'Prefer':'return=minimal'}),
      body:JSON.stringify({spieldauer_min:mcSpieldauer,halbzeiten:mcHalbzeiten})});
  }catch(e){}
  mcSave({spieldauer_min:mcSpieldauer,halbzeiten:mcHalbzeiten});
}
function mcSetDauer(v){
  const n=Math.max(1,Math.min(45,parseInt(v)||MC_DAUER_STD));
  if(n===mcSpieldauer){ mcRenderLive(); return; }
  mcSpieldauer=n;
  mcZeitSpeichern();
  toast(`Spielzeit: ${n} Min.${mcHalbzeiten===2?" je Halbzeit":""}`);
}
function mcSetHalbzeiten(n){
  n=(Number(n)===2)?2:1;
  if(n===mcHalbzeiten)return;
  mcHalbzeiten=n;
  mcZeitSpeichern();
}

