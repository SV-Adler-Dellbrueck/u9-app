/* ═══════════════════════════════════
   LIVE-AKTION VOLLBILD (schneller Modus) – Aktion zuerst, dann Feld-Spieler.
   Ziel: minimale Taps am Spielfeldrand. Große Kacheln, nur die aktuell auf dem
   Feld stehenden Spieler (rotTW + rotField), sofortige Aufzeichnung + Haptik.
═══════════════════════════════════ */
let atLiveAction=null, atGegentore=0;
const AT_LIVE_ACTS=[AT_ACTIONS[0],AT_ACTIONS[1],AT_ACTIONS[2],{key:"parade",label:"Parade",col:"#0d9488",emo:"🧤"},AT_ACTIONS[3],{key:"tor",label:"Tor",col:"#7c3aed",emo:"⚽"},{key:"gegentor",label:"Gegentor",col:"#475569",emo:"🛡️",direct:true,wide:true}];
function atTore(){ return Object.values(atCounts).reduce((s,pl)=>s+(pl.tor||0),0); }
async function atLoadGegentore(){
  atGegentore=0;
  try{ const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(spieltagKey())}&typ=eq.gegentor&select=id`,{headers:sbAuthHeaders()}); if(r.ok)atGegentore=(await r.json()).length; }catch(e){}
}
function atOnFieldPlayers(){
  const onField=[];
  if(typeof rotTW!=="undefined"&&rotTW)onField.push(rotTW);
  if(typeof rotField!=="undefined"&&rotField.length)onField.push(...rotField);
  if(onField.length)return onField;
  return (typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():KADER.filter(k=>k.aktiv!==false).map(k=>k.name);
}
/* v468 – PO: „dass der Liveticker auch bedient werden kann, selbst wenn die
   Liveaufstellungen und Auswechslungen nicht vorgenommen werden."
   Bisher war die Spielerauswahl alles-oder-nichts: entweder die Feldspieler (wenn
   Aufstellung/Rotation gepflegt sind) ODER als Rueckfall alle Nominierten. Der schlimme
   Fall lag dazwischen – Aufstellung gepflegt, aber veraltet: dann fehlte genau das Kind,
   das gerade auf dem Platz steht. Jetzt zwei Bloecke: oben, was die App glaubt, darunter
   alle uebrigen Kinder des Tages. Der untere Block aendert die Aufstellung NICHT (PO):
   sonst korrigierte das Tickern still die Rotation und damit die Einsatzzeiten. */
function atAlleHeute(){
  const kader=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false).map(k=>k.name);
  // Alle, die heute da sind – bewusst teamuebergreifend: bei Turnieren hilft mal jemand
  // aus Adler 2 im anderen Team aus, und dann fehlte er sonst genau im Moment des Tores.
  if(typeof nomStatus==="object"&&nomStatus){
    const dabei=kader.filter(n=>nomStatus[n]==="dabei");
    if(dabei.length)return dabei;
  }
  return kader;
}
function atWeitereSpieler(){
  const oben=new Set(atOnFieldPlayers());
  return atAlleHeute().filter(n=>!oben.has(n));
}
/* v469 – PO: „Bei Parade kann ich ausschliesslich die Torhueter anbieten, weil ein
   Feldspieler keine Parade macht." Beim BEWERTEN unterscheidet die App das laengst
   (atActionsFor gibt Torhuetern eigene Knoepfe); im Live-Vollbild war es vergessen.
   Beruecksichtigt wird, wer im Kader als Torwart markiert ist UND wer laut Aufstellung
   gerade im Tor steht. Ist niemand markiert, bleibt die volle Liste stehen – ein leerer
   Bildschirm am Spielfeldrand waere schlimmer als eine zu lange Liste. */
function atTorhueter(namen){
  const imTor=(typeof rotTW!=="undefined"&&rotTW)?rotTW:null;
  const tw=namen.filter(n=>n===imTor||(typeof getKader==="function"&&getKader(n)&&getKader(n).tw));
  return tw.length?tw:namen;
}
let atLiveClockId=null;
function atLiveOpen(){
  document.getElementById("at-live")?.remove();
  atLiveAction=null;
  if(!document.getElementById("at-live-style")){
    const st=document.createElement("style");st.id="at-live-style";
    st.textContent="@keyframes atFlash{0%{opacity:0;transform:scale(.6)}25%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.15)}}";
    document.head.appendChild(st);
  }
  const m=document.createElement("div");m.id="at-live";
  m.style.cssText="position:fixed;inset:0;z-index:9500;background:#0f172a;display:flex;flex-direction:column;color:#fff;overflow:hidden";
  document.body.appendChild(m);
  atLiveRender();
  atLoadGegentore().then(()=>atLiveRender()); // aktuellen Gegentor-Stand fürs Live-Ergebnis nachladen
  clearInterval(atLiveClockId);
  let _tick=0;
  atLiveClockId=setInterval(()=>{
    const el=document.getElementById("at-live-min");if(el&&typeof mcState!=="undefined"&&mcState)el.textContent=mcMinuteLabel(mcState,typeof mcSpieldauer!=="undefined"?mcSpieldauer:10,typeof mcHalbzeiten!=="undefined"?mcHalbzeiten:1);
    if((_tick++ % 8)===0)atLiveClapPoll();   // B1: „die Tribüne feiert" alle 8s nachladen
  },1000);
  atLiveClapPoll();
}
// Applaus-Zähler der Eltern ins Live-Panel (die Tribüne feiert!).
async function atLiveClapPoll(){
  const el=document.getElementById("at-claps"); if(!el)return;
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_claps?datum=eq.${encodeURIComponent(spieltagRawDate())}&select=count`,{headers:sbAuthHeaders()});
    if(r.ok){const j=await r.json(); const c=(j[0]&&j[0].count)||0; el.textContent=c?`👏 ${c}`:"";}}catch(e){}
}
function atLiveClose(){ clearInterval(atLiveClockId); document.getElementById("at-live")?.remove(); atLiveAction=null; if(document.getElementById("action-panel"))atRender(); }
function atLiveRender(){
  const m=document.getElementById("at-live"); if(!m)return;
  const counts=questCountsAll();   // Quests gelten teamübergreifend
  const done=teamQuests.filter(q=>(counts[q.key]||0)>=questZiel(q)).length;
  const top=`<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#1e293b">
    <div style="flex:1;font-size:13px;font-weight:800">⚡ Live-Aktion${atLiveAction?"":" · Aktion wählen"}</div>
    <div title="Ergebnis (Tore:Gegentore)" style="font-size:17px;font-weight:900;padding:3px 12px;background:rgba(255,255,255,.14);border-radius:10px">${atTore()}:${atGegentore}</div>
    <div style="font-size:11px;color:#94a3b8">🏆 ${done}/${teamQuests.length}</div>
    <button onclick="atLiveClose()" aria-label="Schließen" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer">×</button></div>`;
  // Fokus-Modus: Uhr (live) + Wechsel-Vorschlag direkt im Vollbild
  const minute=(typeof mcState!=="undefined"&&mcState)?mcMinuteLabel(mcState,typeof mcSpieldauer!=="undefined"?mcSpieldauer:10,typeof mcHalbzeiten!=="undefined"?mcHalbzeiten:1):"";
  let subHint="";
  if(typeof rotBench!=="undefined"&&rotBench&&rotBench.length&&rotField&&rotField.length){
    const benchTop=[...rotBench].sort((a,b)=>(rotBenchSec[b]||0)-(rotBenchSec[a]||0))[0];
    const fieldTired=[...rotField].sort((a,b)=>(rotBenchSec[a]||0)-(rotBenchSec[b]||0))[0];
    if(benchTop&&fieldTired)subHint=`🔁 ${esc(benchTop)} → ${esc(fieldTired)}`;
  }
  // A3: Fairness-Ampel aus den Bank-Zeiten (kleine Spanne = alle fair dran).
  let fair="";
  if(typeof rotBenchSec!=="undefined"){
    const all=[...(rotField||[]),...(rotBench||[])];
    const bs=all.map(p=>rotBenchSec[p]||0);
    if(bs.length>=2){ const spread=Math.max(...bs)-Math.min(...bs);
      const col=spread<90?"#22c55e":spread<210?"#fbbf24":"#f87171", lbl=spread<90?"fair ✓":spread<210?"ok":"achtung";
      fair=`<span style="display:inline-flex;align-items:center;gap:4px;font-weight:700;color:${col}">⚖️ ${lbl}</span>`;
    }
  }
  const info=`<div style="display:flex;align-items:center;gap:12px;padding:8px 14px;background:#172033;font-size:12.5px;border-top:1px solid rgba(255,255,255,.06);flex-wrap:wrap">
    <span style="font-weight:800">⏱ <span id="at-live-min">${esc(minute)}</span></span>
    ${fair}
    <span id="at-claps" style="color:#f9a8d4;font-weight:700"></span>
    ${subHint?`<span style="color:#fbbf24;font-weight:700;margin-left:auto">${subHint}</span>`:""}
  </div>`;
  let body;
  if(!atLiveAction){
    body=`<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px">
      ${AT_LIVE_ACTS.map(a=>`<button onclick="atLivePick('${a.key}')" style="${a.wide?'grid-column:1/-1;':''}border:none;border-radius:18px;background:${a.col};color:#fff;font-family:inherit;cursor:pointer;display:flex;${a.wide?'flex-direction:row':'flex-direction:column'};align-items:center;justify-content:center;gap:8px;font-size:18px;font-weight:800">
        <span style="font-size:${a.wide?28:34}px">${a.emo}</span>${a.label}</button>`).join("")}
    </div>`;
  }else{
    const a=AT_LIVE_ACTS.find(x=>x.key===atLiveAction)||{label:atLiveAction,emo:"",col:"#1e293b"};
    const nurTW=atLiveAction==="parade";
    const players=nurTW?atTorhueter(atOnFieldPlayers()):atOnFieldPlayers();
    const weitere=nurTW?atTorhueter(atWeitereSpieler()).filter(n=>!players.includes(n)):atWeitereSpieler();
    const knopf=(n,dunkel)=>`<button onclick="atLiveRecord('${n.replace(/'/g,"")}')" style="min-height:66px;border:${dunkel?"none":"1.5px solid #334155"};border-radius:16px;background:${dunkel?"#1e293b":"transparent"};color:#fff;font-size:18px;font-weight:700;font-family:inherit;cursor:pointer">${getKader(n)?.tw?"🥅 ":(getKader(n)?.nr?getKader(n).nr+" ":"")}${esc(n)}</button>`;
    const trenner=weitere.length?`<div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin:6px 0 2px">
        <span style="flex:1;border-top:2px dashed #334155"></span>
        <span style="font-size:10.5px;font-weight:800;letter-spacing:.5px;color:#94a3b8">${nurTW?"WEITERE TORHÜTER":"AUCH HEUTE DABEI"}</span>
        <span style="flex:1;border-top:2px dashed #334155"></span>
      </div>`:"";
    body=`<div style="padding:12px 14px;font-size:16px;font-weight:800;background:${a.col}"> ${a.emo} ${a.label} – wer war's?</div>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;overflow-y:auto;align-content:start">
        ${players.map(n=>knopf(n,true)).join("")}
        ${trenner}
        ${weitere.map(n=>knopf(n,false)).join("")}
        ${(!players.length&&!weitere.length)?'<div style="grid-column:1/-1;color:#94a3b8;font-size:13px">Für heute ist noch niemand als „dabei" eingetragen.</div>':""}
      </div>
      <button onclick="atLiveAction=null;atLiveRender()" style="margin:0 14px 14px;padding:14px;border:none;border-radius:14px;background:rgba(255,255,255,.12);color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">← andere Aktion</button>`;
  }
  m.innerHTML=top+info+body;
}
function atLivePick(aktion){
  const a=AT_LIVE_ACTS.find(x=>x.key===aktion);
  if(a&&a.direct){ atLiveDirect(aktion); return; } // Gegentor: kein Spieler nötig → 1 Tap
  atLiveAction=aktion; atLiveRender();
}
function atLiveDirect(aktion){
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  if(aktion==="gegentor"){ atGegentore++; if(typeof tickerCounterGoal==="function")tickerCounterGoal(); }
  atLiveFlash("Gegentor","#f59e0b");
  atLiveRender();
}
function atLiveRecord(player){
  const aktion=atLiveAction;
  if(!aktion)return;
  atSel=player;
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  const a=AT_LIVE_ACTS.find(x=>x.key===aktion);
  atLiveAction=null;
  if(aktion==="tor")tickerGoal(); else atTap(aktion); // synchroner Teil bumpt atCounts sofort; Netz läuft im Hintergrund
  atLiveRender();  // Ergebnis + Zähler frisch
  atLiveFlash(`${a?a.emo:""} ${player}`);
}
function atLiveFlash(txt,color){
  const m=document.getElementById("at-live"); if(!m)return;
  const f=document.createElement("div");
  f.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5;font-size:34px;font-weight:900;color:"+(color||"#22c55e")+";background:rgba(0,0,0,.3);animation:atFlash .6s ease-out forwards";
  f.textContent=txt+" ✓";
  m.appendChild(f);
  setTimeout(()=>f.remove(),600);
}
async function atTap(aktion){
  if(!atSel)return;
  const act=atActionsFor(atSel).find(a=>a.key===aktion)||{label:aktion};
  if(!atCounts[atSel])atCounts[atSel]={};
  atCounts[atSel][aktion]=(atCounts[atSel][aktion]||0)+1;
  const entry={uid:++atUid,id:null,spieler:atSel,aktion,label:act.label};
  atLog.push(entry);
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  atRender();
  // Paedagogik-Filter (Phase 4): nur positive Aktionen speisen den Eltern-Ticker – Undo
  // nimmt das interne Rating zurueck, ein bereits oeffentlich gepushter Ticker-Satz bleibt
  // stehen (geringes Risiko, da nur positive Ereignisse gepusht werden).
  if(TICKER_POSITIVE_KEYS.includes(aktion))tickerPush(atSel,aktion);
  questCheck(); // Team-Quest evtl. gerade geknackt → Confetti + Toast
  const datum=spieltagKey();
  const tid=await terminIdForDatum(datum); // HOTFIX 3-FE: FK-Kopplung für ON DELETE CASCADE
  const res=await sbQueuedPost("match_actions",{datum,spieler:atSel,aktion,termin_id:tid},"return=representation"); // offline -> Queue
  if(res.ok&&res.res){try{const rows=await res.res.json();if(rows&&rows[0]&&rows[0].id!=null)entry.id=rows[0].id;}catch(e){}}
}
// Undo (Korrektur 2): letzte Aktion am Spielfeldrand zurücknehmen – In-Memory-Zähler
// runter + die frisch angelegte Supabase-Zeile entfernen (gerade erst erstellt -> Hard-Delete ok).
async function atUndo(uid){
  const i=atLog.findIndex(e=>e.uid===uid);
  if(i<0)return;
  const e=atLog[i];
  if(atCounts[e.spieler]&&atCounts[e.spieler][e.aktion]){
    atCounts[e.spieler][e.aktion]--;
    if(atCounts[e.spieler][e.aktion]<=0)delete atCounts[e.spieler][e.aktion];
  }
  atLog.splice(i,1);
  try{navigator.vibrate&&navigator.vibrate(12);}catch(err){}
  atRender();
  if(e.id!=null){
    try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?id=eq.${e.id}`,{method:"DELETE",headers:sbAuthHeaders()});sbCheck401(r);}catch(err){}
  }
}

// Blitz-Rating: schnelle Nachbewertung nach dem Spiel (eigenes leichtes Protokoll,
// verfälscht NICHT die 37-Kriterien-Hauptbewertung). Karten-Flow, ein Spieler nach dem anderen.
let blitzIdx=0, blitzPlayers=[], blitzCrit={}, blitzCritPlayer=null;
const BLITZ_CRIT=[
  {key:"einsatz",label:"Einsatz & Zweikampf"},
  {key:"technik",label:"Technik am Ball"},
  {key:"verstaendnis",label:"Spielverständnis"},
  {key:"team",label:"Teamverhalten"},
  {key:"form",label:"Tagesform"}
];
function blitzInit(){
  // nur die nominierten (dabei) Spieler bewerten, falls eine Nominierung vorliegt
  blitzPlayers=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():KADER.map(k=>k.name);
  blitzIdx=0;
  const box=document.getElementById("blitz-panel");
  if(!box)return;
  box.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <span style="font-size:11px;color:var(--text2)">Bewertet von:</span>
      <select id="blitz-autor" style="min-height:40px;padding:6px 10px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit">${TRAINER.map(t=>`<option>${t}</option>`).join("")}</select>
    </div>
    <div id="blitz-card"></div>
    <div id="blitz-saved" style="margin-top:12px"></div>`;
  blitzRenderCard();
  blitzLoadSaved();
}
// Gespeicherte Blitz-Bewertungen dieses Spieltags als Chips – ✕ loescht die Eintragung
// (Korrektur = loeschen + ueber "Von vorne" neu bewerten).
async function blitzLoadSaved(){
  const box=document.getElementById("blitz-saved");
  if(!box)return;
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/blitz_ratings?datum=eq.${encodeURIComponent(datum)}&select=id,spieler,wertung&order=created_at.asc`,{headers:sbAuthHeaders()});
    if(!r.ok){box.innerHTML="";return;}
    const rows=await r.json();
    if(!rows.length){box.innerHTML="";return;}
    const wCol={top:"#15803d",solide:"#64748b",blass:"#dc2626"};
    box.innerHTML=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:5px">Gespeicherte Bewertungen (${rows.length}) · ✕ zum Löschen/Korrigieren</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${rows.map(x=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 9px;border-radius:14px;background:var(--surface2);border:var(--border-s)"><span style="width:8px;height:8px;border-radius:50%;background:${wCol[x.wertung]||"#64748b"}"></span>${esc(x.spieler)}<button onclick="blitzDelete(${Number(x.id)})" title="Bewertung löschen" aria-label="Löschen" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-size:13px;line-height:1;padding:0 2px">✕</button></span>`).join("")}</div>`;
  }catch(e){}
}
async function blitzDelete(id){
  if(!confirm("Blitz-Bewertung wirklich löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/blitz_ratings?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  blitzLoadSaved();
  toast("Blitz-Bewertung gelöscht");
}
function blitzRenderCard(){
  const card=document.getElementById("blitz-card");
  if(!card)return;
  if(blitzIdx>=blitzPlayers.length){
    card.innerHTML=`<div class="card" style="text-align:center;padding:22px 16px">
      <div style="font-size:30px">✅</div>
      <div style="font-weight:700;margin:6px 0">Alle durch!</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${blitzPlayers.length} Spieler bewertet.</div>
      <button class="btn" onclick="blitzIdx=0;blitzRenderCard()"><i class="ti ti-refresh"></i>Von vorne</button>
    </div>`;
    return;
  }
  const name=blitzPlayers[blitzIdx];const nr=getKader(name)?.nr;
  if(blitzCritPlayer!==name){blitzCrit={};BLITZ_CRIT.forEach(c=>blitzCrit[c.key]=2);blitzCritPlayer=name;} // Mitte vorbelegt
  const evidenz=(typeof atSummary==="function"&&atSummary(name))?`<div style="font-size:12px;color:var(--text2);margin-bottom:12px">Live-Aktionen: ${atSummary(name)}</div>`:"";
  const lvlBtn=(cKey,val,txt,col)=>{const on=blitzCrit[cKey]===val;return `<button onclick="blitzSetCrit('${cKey}',${val})" style="flex:1;min-height:40px;font-size:12px;border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${on?col:"var(--surface2)"};color:${on?"#fff":"var(--text2)"}">${txt}</button>`;};
  card.innerHTML=`<div class="card" style="padding:16px">
    <div style="text-align:center">
      <div style="font-size:11px;color:var(--text3)">Spieler ${blitzIdx+1}/${blitzPlayers.length}</div>
      <div style="font-size:22px;font-weight:800;margin:6px 0 10px">${nr?nr+" ":""}${esc(name)}</div>
    </div>
    ${evidenz}
    ${BLITZ_CRIT.map(c=>`
      <div style="margin-bottom:8px">
        <div style="font-size:11.5px;font-weight:600;margin-bottom:4px">${c.label}</div>
        <div style="display:flex;gap:5px">
          ${lvlBtn(c.key,1,"schwach","#dc2626")}
          ${lvlBtn(c.key,2,"ok","#64748b")}
          ${lvlBtn(c.key,3,"stark","#15803d")}
        </div>
      </div>`).join("")}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-p" style="flex:1;min-height:48px;font-size:15px" onclick="blitzRate()"><i class="ti ti-check"></i>Speichern & weiter</button>
      <button class="btn btn-sm" style="opacity:.7" onclick="blitzSkip()">›</button>
    </div>
  </div>`;
}
function blitzSetCrit(key,val){blitzCrit[key]=val;blitzRenderCard();}
async function blitzRate(){
  const name=blitzPlayers[blitzIdx];
  const datum=spieltagKey();
  const autor=document.getElementById("blitz-autor")?.value||"";
  const kriterien={...blitzCrit};
  const avg=BLITZ_CRIT.reduce((s,c)=>s+(kriterien[c.key]||2),0)/BLITZ_CRIT.length;
  const wertung=avg>=2.5?"top":avg>=1.7?"solide":"blass"; // Gesamt für Rückwärtskompatibilität
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  blitzIdx++;blitzCritPlayer=null;blitzRenderCard(); // optimistisch weiter
  const res=await sbQueuedPost("blitz_ratings",{datum,spieler:name,wertung,autor,kriterien}); // offline -> Queue
  if(res.ok)blitzLoadSaved(); // bei Online: gespeicherte Liste aktualisieren
}
function blitzSkip(){blitzIdx++;blitzCritPlayer=null;blitzRenderCard();}

// G2: Team-Pinnwand
async function tnLoad(){
  const wrap=document.getElementById("tn-list");
  if(!wrap)return;
  wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Lade Notizen...</div>';
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_notizen?select=*&order=pinned.desc,created_at.desc&limit=50`,{headers:sbTeamHeaders()});
    if(!r.ok){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Keine Verbindung zur Pinnwand</div>';return;}
    const rows=await r.json();
    if(!rows.length){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Noch keine Notizen – schreib die erste!</div>';return;}
    wrap.innerHTML=rows.map(n=>`
      <div class="card" style="padding:10px 12px;margin-bottom:8px${n.pinned?";border-left:3px solid var(--blue)":""}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:11px;font-weight:700">${n.pinned?"📌 ":""}${esc(n.autor||"?")}</span>
          <span style="font-size:10px;color:var(--text3)">${n.created_at?new Date(n.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span>
        </div>
        <div style="font-size:12.5px;color:var(--text);line-height:1.5;margin-bottom:6px">${esc(n.text||"")}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="tnPin(${Number(n.id)},${n.pinned?"false":"true"})"><i class="ti ti-pin"></i>${n.pinned?"Lösen":"Anpinnen"}</button>
          <button class="btn btn-sm btn-d" onclick="tnDel(${Number(n.id)})"><i class="ti ti-trash"></i></button>
        </div>
      </div>`).join("");
  }catch(e){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Offline – Pinnwand nicht verfügbar</div>';}
}
async function tnSend(){
  const autor=document.getElementById("tn-autor")?.value||"";
  const text=(document.getElementById("tn-text")?.value||"").trim();
  if(!text){toast("Bitte Text eingeben","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_notizen`,{
      method:"POST",headers:sbTeamHeaders(),body:JSON.stringify({autor,text})
    });
    if(r.ok||r.status===201){document.getElementById("tn-text").value="";toast("Notiz gesendet ✓");tnLoad();}
    else toast("Fehler beim Senden","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tnPin(id,pinned){
  try{
    await fetch(`${SB_URL}/rest/v1/team_notizen?id=eq.${id}`,{
      method:"PATCH",headers:sbTeamHeaders(),body:JSON.stringify({pinned})
    });
    tnLoad();
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tnDel(id){
  if(!confirm("Notiz wirklich löschen?"))return;
  try{
    await fetch(`${SB_URL}/rest/v1/team_notizen?id=eq.${id}`,{method:"DELETE",headers:sbTeamHeaders()});
    tnLoad();
  }catch(e){toast("Netzwerkfehler","err");}
}

// G4: kompakte Auswertungs-Kacheln (nur Aggregation vorhandener Daten)
function teamStatsRender(){
  const wrap=document.getElementById("team-stats");
  if(!wrap)return;
  // Letzte Einheit + Ø-Nachbewertung
  const evalDates=Object.keys(EVAL_DATA).sort().reverse();
  let evalTile='<div style="font-size:11px;color:var(--text3)">Noch keine Einheit bewertet</div>';
  if(evalDates.length){
    const d=evalDates[0];const entries=(EVAL_DATA[d]||[]).filter(e=>!e.skipped); // Übersprungene zählen nicht mit
    let sum=0,cnt=0;
    entries.forEach(e=>Object.entries(e).forEach(([k,v])=>{if(typeof v==="number"&&k!=="formIdx"){sum+=v;cnt++;}}));
    const avg=cnt?(sum/cnt).toFixed(1):"–";
    evalTile=`<div style="font-size:16px;font-weight:700;color:var(--blue)">${avg} ★</div><div style="font-size:10px;color:var(--text2)">${new Date(d).toLocaleDateString("de-DE")}</div>`;
  }
  // Anwesenheitsquote letzte 4 Termine
  const awDates=Object.keys(AW_DATA).sort().reverse().slice(0,4);
  let quote="–";
  if(awDates.length){
    let da=0,ges=0;
    awDates.forEach(d=>{
      Object.entries(AW_DATA[d]||{}).forEach(([k,v])=>{
        if(k==="_trainers")return;
        ges++;if(v&&v.da)da++;
      });
    });
    if(ges)quote=Math.round(da/ges*100)+"%";
  }
  // Spieler ohne Bewertung seit > 6 Wochen (Bewertung alle 6 Wochen im Trainermeeting)
  const limit=Date.now()-42*24*60*60*1000;
  const stale=KADER.filter(k=>{
    const snaps=DB[k.name];
    if(!snaps||!snaps.length)return true;
    const lat=snaps[snaps.length-1];
    return !lat.datum||new Date(lat.datum).getTime()<limit;
  });
  const tile=(title,body)=>`<div class="card" style="padding:10px 12px"><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">${title}</div>${body}</div>`;
  wrap.innerHTML=
    tile("Letzte Einheit",evalTile)+
    tile("Anwesenheit (letzte 4)",`<div style="font-size:16px;font-weight:700;color:var(--teal)">${quote}</div><div style="font-size:10px;color:var(--text2)">${awDates.length} Termin${awDates.length!==1?"e":""}</div>`)+
    tile("Bewertung überfällig",`<div style="font-size:16px;font-weight:700;color:${stale.length?"#dc2626":"#15803d"};cursor:pointer" onclick="sv('bew')">${stale.length} Spieler</div><div style="font-size:10px;color:var(--text2)">${stale.length?"> 6 Wochen ohne Bewertung":"alle aktuell"}</div>`);
}

// L5: Daten-Backup – alle sechs Tabellen als eine JSON-Datei
async function teamBackupDownload(){
  const tabellen=["spielerprofile","quiz_progress","anwesenheit","trainings_eval","team_notizen","einheiten"];
  const backup={erstellt:new Date().toISOString(),app:"Adler U9 Spielerprofil"};
  try{
    for(const t of tabellen){
      const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*`,{headers:sbAuthHeaders()});
      if(sbCheck401(r))return;
      backup[t]=r.ok?await r.json():{fehler:"HTTP "+r.status};
    }
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="adler-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Backup heruntergeladen ✓");
  }catch(e){toast("Backup fehlgeschlagen: "+e.message,"err");}
}


/* Die alten tpPlanSave/tpPlanLoad/tpShareEinheit lebten hier als Dubletten (Tabelle
   `einheiten`, plus tp-time/Teilen). boot.js lud spaeter und ueberschrieb sie ohnehin –
   gueltig ist die Fassung in boot.js (Tabelle `trainingsplan`). Entfernt im Deep-Dive. */
