/* ═══ v670 – ADLER-RUFE: der Team-Chat für Eltern und Trainer (Stufe 1) ══════════════════
   Beschluss 29.09. (Kachelrunden): offener Gruppenchat statt nur Ansagen; ein Raum zum Start,
   Moderatoren (Trainer, Elternbeirat) legen weitere an. Antworten mit Zitat, Reaktionen, bis zu
   drei fixierte Rufe mit Ablauf (Signal-Modell), @alle nur für Moderatoren, Bearbeiten, Suche.
   Moderation: melden, stummschalten, archivieren statt löschen – archivierte Rufe sehen nur
   Trainer. Kinder haben keinen Zugang; Name und Rolle setzt die Datenbank, nicht das Gerät.
   Push folgt in einer eigenen Stufe; bis dahin zählt ein Punkt die ungelesenen Rufe.

   Datenweg: Tabellen rufe_* mit RLS (Migration 20260929_v670_adler_rufe.sql). Bearbeiten und
   Archivieren nur über RPC. Keine Systemdialoge – alle Rückfragen sind eigene Fenster. */
const RUFE_EMOJI=["👍","❤️","😂","⚽","👏","🙏"];
const RUFE_TAKT=8000;          // Nachladen, solange das Fenster offen ist
const RUFE_ANZAHL=80;          // so viele Rufe je Raum auf einmal
let _rf=null;

function _rfUid(){ try{const t=sbToken();return t?JSON.parse(atob(t.split(".")[1])).sub:null;}catch(e){return null;} }
async function _rfGet(pfad){
  try{const r=await fetch(`${SB_URL}/rest/v1/${pfad}`,{headers:sbAuthHeaders()}); return r.ok?await r.json():[];}catch(e){return [];}
}
async function _rfRpc(name,body){
  const r=await fetch(`${SB_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  return r;
}
function _rfZeit(ts){ const d=new Date(ts); return d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}); }
function _rfTag(ts){
  const d=new Date(ts), h=new Date(); const g=new Date(h); g.setDate(h.getDate()-1);
  const gleich=(a,b)=>a.toDateString()===b.toDateString();
  return gleich(d,h)?"Heute":gleich(d,g)?"Gestern":d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
}
/* Text sicher darstellen: erst maskieren, dann @Namen hervorheben und Zeilen umbrechen. */
function _rfText(t){
  return esc(String(t||"")).replace(/(^|\s)(@[\wÄÖÜäöüß-]+)/g,'$1<b class="rf-at" style="color:#1d4ed8">$2</b>').replace(/\n/g,"<br>");
}
function _rfZ(n){ return (typeof zOben==="function")?zOben(n):n; }

/* ── Öffnen ───────────────────────────────────────────────────────────────────── */
async function rufeOpen(raumId){
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst anmelden","err"); return; }
  document.getElementById("rufe-modal")?.remove();
  _rf={raeume:[],raum:null,liste:[],reakt:[],fix:[],mod:false,uid:_rfUid(),antwort:null,suche:"",timer:null,letzte:null};
  const m=document.createElement("div"); m.id="rufe-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Adler-Rufe");
  m.style.cssText="position:fixed;inset:0;background:var(--bg,#f1f5f9);display:flex;flex-direction:column";
  m.style.zIndex=_rfZ(10003);
  m.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1e3a8a;color:#fff;flex:none">
      <span style="font-size:var(--s-seite);line-height:1" aria-hidden="true">📣</span>
      <div style="flex:1;min-width:0"><div style="font-size:var(--s-karte);font-weight:800">Adler-Rufe</div>
        <div id="rufe-unter" style="font-size:var(--s-klein);opacity:.9">Eltern und Trainerteam</div></div>
      <button type="button" id="rufe-suche-knopf" onclick="rufeSucheUmschalten()" aria-label="Suchen" style="width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:var(--s-teil);cursor:pointer">🔍</button>
      <button type="button" onclick="rufeClose()" aria-label="Schließen" style="width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:var(--s-teil);cursor:pointer">✕</button>
    </div>
    <div id="rufe-suche" style="display:none;padding:8px 12px;background:var(--surface);border-bottom:1px solid var(--surface2)">
      <label for="rufe-suche-feld" style="position:absolute;left:-9999px">Rufe durchsuchen</label>
      <input id="rufe-suche-feld" type="search" placeholder="Rufe durchsuchen …" oninput="rufeSucheSetzen(this.value)" style="width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:10px;font:inherit;background:var(--surface2);color:var(--text)">
    </div>
    <div id="rufe-raeume" style="display:flex;gap:6px;overflow-x:auto;padding:8px 12px;flex:none"></div>
    <div id="rufe-fix" style="flex:none"></div>
    <div id="rufe-liste" aria-live="polite" style="flex:1;overflow-y:auto;padding:8px 12px 12px"><div style="color:var(--text2);font-size:var(--s-text);padding:12px 0">Lade Rufe …</div></div>
    <div style="flex:none;background:var(--surface);border-top:1px solid var(--surface2);padding:8px 12px calc(8px + env(safe-area-inset-bottom))">
      <div id="rufe-antwort" style="display:none"></div>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <label for="rufe-text" style="position:absolute;left:-9999px">Ruf schreiben</label>
        <textarea id="rufe-text" rows="1" maxlength="2000" placeholder="Ruf schreiben …" oninput="rufeTextWachsen(this)" style="flex:1;min-height:48px;max-height:140px;resize:none;box-sizing:border-box;padding:12px;border:1px solid var(--rand-bedien);border-radius:14px;font:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)"></textarea>
        <button type="button" id="rufe-senden" onclick="rufeSenden()" style="min-width:56px;min-height:48px;border:none;border-radius:14px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:800;cursor:pointer">Senden</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  const [raeume,modR]=await Promise.all([
    _rfGet("rufe_raum?archiviert=eq.false&select=id,name,emoji,sort&order=sort.asc,id.asc"),
    _rfRpc("is_rufe_mod").then(r=>r.ok?r.json():false).catch(()=>false)
  ]);
  if(!_rf)return;
  _rf.raeume=raeume; _rf.mod=modR===true;
  _rf.raum=(raeume.find(r=>String(r.id)===String(raumId))||raeume[0]||{}).id||null;
  if(!_rf.raum){ document.getElementById("rufe-liste").innerHTML=`<div style="color:var(--text2);padding:12px 0">Die Adler-Rufe sind für Eltern mit Zugang und das Trainerteam.</div>`; return; }
  rufeRaeumeRender();
  await rufeLaden(true);
  _rf.timer=setInterval(()=>{ if(!document.getElementById("rufe-modal")){ rufeClose(); return; } if(!document.hidden)rufeLaden(false); },RUFE_TAKT);
}
function rufeClose(){
  if(_rf&&_rf.timer)clearInterval(_rf.timer);
  document.getElementById("rufe-modal")?.remove();
  document.getElementById("rufe-menue")?.remove();
  _rf=null;
  if(typeof rufeBadgeLoad==="function")rufeBadgeLoad();
}
function rufeTextWachsen(t){ t.style.height="auto"; t.style.height=Math.min(140,t.scrollHeight)+"px"; }

function rufeRaeumeRender(){
  const box=document.getElementById("rufe-raeume"); if(!box||!_rf)return;
  const chip=(an,txt,on,label)=>`<button type="button" onclick="${on}" aria-pressed="${an}" ${label?`aria-label="${label}"`:""} style="flex:none;min-height:40px;padding:6px 14px;border-radius:999px;border:1.5px solid ${an?"#1e3a8a":"var(--rand-bedien)"};background:${an?"#1e3a8a":"var(--surface)"};color:${an?"#fff":"var(--text)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer;white-space:nowrap">${txt}</button>`;
  const zeigen=_rf.raeume.length>1||_rf.mod;
  box.style.display=zeigen?"flex":"none";
  box.innerHTML=_rf.raeume.map(r=>chip(r.id===_rf.raum,`${esc(r.emoji||"💬")} ${esc(r.name)}`,`rufeRaumWechseln(${Number(r.id)})`)).join("")
    +(_rf.mod?chip(false,"＋ Raum","rufeRaumNeu()","Neuen Raum anlegen"):"");
}
async function rufeRaumWechseln(id){
  if(!_rf||_rf.raum===id)return;
  _rf.raum=id; _rf.antwort=null; _rf.letzte=null; rufeAntwortRender();
  rufeRaeumeRender();
  document.getElementById("rufe-liste").innerHTML=`<div style="color:var(--text2);padding:12px 0">Lade Rufe …</div>`;
  await rufeLaden(true);
}

/* ── Laden und Zeichnen ───────────────────────────────────────────────────────── */
async function rufeLaden(zumEnde){
  if(!_rf||!_rf.raum)return;
  const raum=_rf.raum;
  const liste=(await _rfGet(`rufe_nachricht?raum_id=eq.${raum}&select=id,autor,autor_name,autor_zusatz,autor_rolle,text,antwort_auf,an_alle,bearbeitet_am,archiviert_am,created_at&order=created_at.desc&limit=${RUFE_ANZAHL}`)).reverse();
  if(!_rf||_rf.raum!==raum)return;
  const ids=liste.map(n=>n.id);
  const [reakt,fix]=await Promise.all([
    ids.length?_rfGet(`rufe_reaktion?nachricht_id=in.(${ids.join(",")})&select=nachricht_id,user_id,emoji`):Promise.resolve([]),
    _rfGet(`rufe_fixiert?raum_id=eq.${raum}&select=nachricht_id,bis`)
  ]);
  if(!_rf||_rf.raum!==raum)return;
  const neu=liste.length&&liste[liste.length-1].id!==_rf.letzte;
  const kennung=JSON.stringify([liste.map(n=>[n.id,n.text,n.archiviert_am]),reakt.length,fix]);
  if(!zumEnde&&kennung===_rf.kennung)return;
  _rf.kennung=kennung;
  _rf.liste=liste; _rf.reakt=reakt; _rf.fix=fix.filter(f=>!f.bis||new Date(f.bis)>new Date());
  const box=document.getElementById("rufe-liste");
  const unten=box&&(box.scrollHeight-box.scrollTop-box.clientHeight<80);
  rufeRender();
  if(box&&(zumEnde||(neu&&unten)))box.scrollTop=box.scrollHeight;
  if(neu){ _rf.letzte=liste[liste.length-1].id; rufeGelesen(); }
}
function rufeRender(){
  if(!_rf)return;
  const box=document.getElementById("rufe-liste"); if(!box)return;
  if(_rf.suche){ rufeSucheRender(); return; }
  rufeFixRender();
  if(!_rf.liste.length){ box.innerHTML=`<div style="text-align:center;color:var(--text2);font-size:var(--s-text);padding:28px 8px">Noch keine Rufe in diesem Raum.<br>Schreib den ersten – alle Eltern und das Trainerteam lesen mit.</div>`; return; }
  let tag="", html="";
  _rf.liste.forEach(n=>{
    const t=_rfTag(n.created_at);
    if(t!==tag){ tag=t; html+=`<div style="text-align:center;margin:10px 0 6px"><span style="font-size:var(--s-klein);color:var(--text2);background:var(--surface2);border-radius:999px;padding:2px 10px">${esc(t)}</span></div>`; }
    html+=rufeNachrichtHtml(n);
  });
  box.innerHTML=html;
}
function rufeNachrichtHtml(n){
  const eigen=n.autor===_rf.uid;
  const arch=!!n.archiviert_am;
  const zitat=n.antwort_auf?(_rf.liste.find(x=>x.id===n.antwort_auf)||null):null;
  const r={}; _rf.reakt.filter(x=>x.nachricht_id===n.id).forEach(x=>{ (r[x.emoji]=r[x.emoji]||{n:0,ich:false}); r[x.emoji].n++; if(x.user_id===_rf.uid)r[x.emoji].ich=true; });
  const rolle=n.autor_rolle==="trainer"?"🦅 ":n.autor_rolle==="moderator"?"🛡️ ":"";
  const fixiert=_rf.fix.some(f=>f.nachricht_id===n.id);
  return `<div class="rf-msg" data-id="${Number(n.id)}" style="display:flex;justify-content:${eigen?"flex-end":"flex-start"};margin:6px 0">
    <div style="max-width:86%;min-width:0;background:${arch?"var(--surface2)":eigen?"#dbeafe":"var(--surface)"};color:var(--text);border:1px solid ${n.an_alle?"#b45309":"var(--surface2)"};border-radius:14px;padding:8px 10px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
        <b style="font-size:var(--s-klein)">${rolle}${esc(eigen?"Du":n.autor_name||"")}</b>
        ${n.autor_zusatz&&!eigen?`<span style="font-size:var(--s-klein);color:var(--text2)">${esc(n.autor_zusatz)}</span>`:""}
        ${n.an_alle?`<span style="font-size:var(--s-klein);font-weight:700;color:#92400e">@alle</span>`:""}
        ${fixiert?`<span style="font-size:var(--s-klein);color:var(--text2)">📌 fixiert</span>`:""}
      </div>
      ${n.antwort_auf?`<div class="rf-zitat" style="margin:4px 0;padding:4px 8px;border-left:3px solid #1e3a8a;background:var(--surface2);border-radius:6px;font-size:var(--s-klein);color:var(--text2)">${zitat?`<b>${esc(zitat.autor_name||"")}</b>: ${esc(String(zitat.text||"").slice(0,120))}`:"Antwort auf einen früheren Ruf"}</div>`:""}
      <div class="rf-text" style="font-size:var(--s-text);line-height:1.45;margin-top:2px;word-wrap:break-word;${arch?"color:var(--text2);font-style:italic":""}">${_rfText(n.text)}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px">
        ${Object.keys(r).map(e=>`<button type="button" class="rf-reakt" onclick="rufeReagieren(${Number(n.id)},'${e}')" aria-pressed="${r[e].ich}" aria-label="${e} ${r[e].n}, ${r[e].ich?"zurücknehmen":"dazu"}" style="min-height:32px;padding:2px 8px;border-radius:999px;border:1.5px solid ${r[e].ich?"#1e3a8a":"var(--rand-bedien)"};background:${r[e].ich?"#dbeafe":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);cursor:pointer">${e} ${r[e].n}</button>`).join("")}
        <span style="flex:1"></span>
        <span style="font-size:var(--s-klein);color:var(--text2)">${arch?"archiviert · ":""}${n.bearbeitet_am?"bearbeitet · ":""}${_rfZeit(n.created_at)}</span>
        ${arch?"":`<button type="button" class="rf-menue-knopf" onclick="rufeMenue(${Number(n.id)})" aria-label="Aktionen zu diesem Ruf" style="width:36px;height:36px;border:none;border-radius:50%;background:transparent;color:var(--text2);font-size:var(--s-teil);cursor:pointer">⋯</button>`}
      </div>
    </div></div>`;
}
function rufeFixRender(){
  const box=document.getElementById("rufe-fix"); if(!box||!_rf)return;
  const fix=_rf.fix.map(f=>_rf.liste.find(n=>n.id===f.nachricht_id)).filter(n=>n&&!n.archiviert_am);
  box.innerHTML=fix.length?fix.map(n=>`<button type="button" onclick="rufeHinspringen(${Number(n.id)})" style="display:flex;gap:8px;align-items:center;width:100%;text-align:left;min-height:44px;padding:6px 12px;border:none;border-bottom:1px solid var(--surface2);background:#fef3c7;color:#78350f;font-family:inherit;font-size:var(--s-klein);cursor:pointer">📌 <b style="flex:none">${esc(n.autor_name||"")}:</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n.text)}</span></button>`).join(""):"";
}
function rufeHinspringen(id){
  const el=document.querySelector(`#rufe-liste .rf-msg[data-id="${Number(id)}"]`);
  if(el){ el.scrollIntoView({block:"center",behavior:"smooth"}); try{el.animate([{opacity:.35},{opacity:1}],{duration:500,iterations:2});}catch(e){} }
}

/* ── Schreiben ────────────────────────────────────────────────────────────────── */
function rufeAntwortRender(){
  const box=document.getElementById("rufe-antwort"); if(!box)return;
  const n=_rf&&_rf.antwort?_rf.liste.find(x=>x.id===_rf.antwort):null;
  box.style.display=n?"flex":"none";
  box.style.cssText+=";align-items:center;gap:8px;margin-bottom:6px;padding:6px 8px;border-left:3px solid #1e3a8a;background:var(--surface2);border-radius:8px";
  if(!n){ box.style.display="none"; box.innerHTML=""; return; }
  box.innerHTML=`<div style="flex:1;min-width:0;font-size:var(--s-klein);color:var(--text2)">Antwort an <b>${esc(n.autor_name||"")}</b>: ${esc(String(n.text).slice(0,80))}</div>
    <button type="button" onclick="rufeAntwortWeg()" aria-label="Antwort verwerfen" style="width:36px;height:36px;border:none;border-radius:50%;background:transparent;color:var(--text2);cursor:pointer">✕</button>`;
}
function rufeAntwortWeg(){ if(_rf){ _rf.antwort=null; rufeAntwortRender(); } }
async function rufeSenden(){
  if(!_rf||!_rf.raum)return;
  const feld=document.getElementById("rufe-text"); const text=(feld?.value||"").trim();
  if(!text)return;
  const knopf=document.getElementById("rufe-senden"); if(knopf)knopf.disabled=true;
  const zeile={raum_id:_rf.raum,text,antwort_auf:_rf.antwort||null,an_alle:_rf.mod&&/(^|\s)@alle\b/i.test(text)};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rufe_nachricht`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(zeile)});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){ const t=await r.text().catch(()=>""); toast(/stumm/.test(t)?"Du bist gerade stummgeschaltet – später geht es wieder":"Ruf nicht gesendet – bitte gleich noch einmal","err"); return; }
  }catch(e){ toast("Kein Netz – Ruf nicht gesendet","err"); return; }
  finally{ if(knopf)knopf.disabled=false; }
  feld.value=""; rufeTextWachsen(feld); _rf.antwort=null; rufeAntwortRender();
  await rufeLaden(true);
}
async function rufeReagieren(id,emoji){
  if(!_rf)return;
  const meine=_rf.reakt.some(x=>x.nachricht_id===id&&x.user_id===_rf.uid&&x.emoji===emoji);
  try{
    const r=meine
      ?await fetch(`${SB_URL}/rest/v1/rufe_reaktion?nachricht_id=eq.${Number(id)}&user_id=eq.${_rf.uid}&emoji=eq.${encodeURIComponent(emoji)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=minimal'})})
      :await fetch(`${SB_URL}/rest/v1/rufe_reaktion`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal,resolution=ignore-duplicates'}),body:JSON.stringify({nachricht_id:id,emoji})});
    if(!r.ok){ toast("Reaktion nicht gespeichert","err"); return; }
  }catch(e){ toast("Kein Netz","err"); return; }
  document.getElementById("rufe-menue")?.remove();
  await rufeLaden(false);
}
async function rufeGelesen(){
  if(!_rf||!_rf.raum)return;
  try{ await fetch(`${SB_URL}/rest/v1/rufe_gelesen?on_conflict=user_id,raum_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({raum_id:_rf.raum,zuletzt:new Date().toISOString()})}); }catch(e){}
}

/* ── Aktionen zu einem Ruf ────────────────────────────────────────────────────── */
function _rfBlatt(id,titel,inhalt){
  document.getElementById(id)?.remove();
  const m=document.createElement("div"); m.id=id;
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label",titel);
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center";
  m.style.zIndex=_rfZ(10005);
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom))">
    <div style="font-size:var(--s-karte);font-weight:800;margin-bottom:10px">${titel}</div>${inhalt}</div>`;
  document.body.appendChild(m);
  return m;
}
const _RF_ZEILE="display:flex;align-items:center;gap:10px;width:100%;min-height:48px;margin-top:6px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:var(--s-text);text-align:left;cursor:pointer";
function rufeMenue(id){
  if(!_rf)return;
  const n=_rf.liste.find(x=>x.id===id); if(!n)return;
  const eigen=n.autor===_rf.uid, fixiert=_rf.fix.some(f=>f.nachricht_id===id);
  const zeile=(emo,txt,on)=>`<button type="button" style="${_RF_ZEILE}" onclick="${on}"><span aria-hidden="true">${emo}</span>${txt}</button>`;
  _rfBlatt("rufe-menue","Ruf von "+esc(eigen?"dir":n.autor_name||""),
    `<div style="display:flex;gap:6px;justify-content:space-between">${RUFE_EMOJI.map(e=>`<button type="button" class="rf-emo" onclick="rufeReagieren(${id},'${e}')" aria-label="Mit ${e} reagieren" style="flex:1;min-height:48px;border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface2);font-size:var(--s-teil);cursor:pointer">${e}</button>`).join("")}</div>`
    +zeile("↩️","Antworten",`rufeAntworten(${id})`)
    +(_rf.mod?(fixiert?zeile("📌","Nicht mehr fixieren",`rufeFixieren(${id},null,true)`):zeile("📌","Oben fixieren …",`rufeFixMenue(${id})`)):"")
    +(eigen?zeile("✏️","Bearbeiten",`rufeBearbeitenOpen(${id})`):"")
    +(eigen?zeile("🗄️","Zurückziehen",`rufeArchivieren(${id},true)`):(_rf.mod?zeile("🗄️","Archivieren (nur Trainer sehen ihn noch)",`rufeArchivieren(${id},false)`):""))
    +(!eigen?zeile("🚩","Melden",`rufeMelden(${id})`):"")
    +(_rf.mod&&!eigen&&n.autor_rolle!=="trainer"?zeile("🔇","Stummschalten …",`rufeStummMenue('${esc(n.autor)}','${esc(n.autor_name||"")}')`):"")
    +`<button type="button" onclick="document.getElementById('rufe-menue')?.remove()" style="${_RF_ZEILE};justify-content:center;background:var(--surface2)">Abbrechen</button>`);
}
function rufeAntworten(id){
  document.getElementById("rufe-menue")?.remove();
  if(!_rf)return; _rf.antwort=id; rufeAntwortRender();
  document.getElementById("rufe-text")?.focus();
}
function rufeFixMenue(id){
  const z=(txt,h)=>`<button type="button" style="${_RF_ZEILE}" onclick="rufeFixieren(${id},${h===null?"null":h})">${txt}</button>`;
  _rfBlatt("rufe-menue","Wie lange fixieren?",z("24 Stunden",24)+z("7 Tage",168)+z("30 Tage",720)+z("Immer",null)
    +`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:8px">Höchstens drei Rufe stehen gleichzeitig oben.</div>`);
}
async function rufeFixieren(id,stunden,loesen){
  document.getElementById("rufe-menue")?.remove();
  if(!_rf)return;
  try{
    const r=loesen
      ?await fetch(`${SB_URL}/rest/v1/rufe_fixiert?nachricht_id=eq.${Number(id)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=minimal'})})
      :await fetch(`${SB_URL}/rest/v1/rufe_fixiert?on_conflict=nachricht_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({nachricht_id:id,raum_id:_rf.raum,bis:stunden?new Date(Date.now()+stunden*3600e3).toISOString():null})});
    if(!r.ok){ const t=await r.text().catch(()=>""); toast(/drei/.test(t)?"Schon drei Rufe fixiert – erst einen lösen":"Nicht fixiert","err"); return; }
  }catch(e){ toast("Kein Netz","err"); return; }
  toast(loesen?"Nicht mehr fixiert":"Oben fixiert");
  await rufeLaden(false);
}
function rufeBearbeitenOpen(id){
  const n=_rf&&_rf.liste.find(x=>x.id===id); if(!n)return;
  _rfBlatt("rufe-menue","Ruf bearbeiten",`<label for="rufe-edit" style="position:absolute;left:-9999px">Text</label>
    <textarea id="rufe-edit" rows="4" maxlength="2000" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">${esc(n.text)}</textarea>
    <button type="button" style="${_RF_ZEILE};justify-content:center;background:#1e3a8a;color:#fff;border:none;font-weight:800" onclick="rufeBearbeiten(${id})">Speichern</button>`);
  setTimeout(()=>document.getElementById("rufe-edit")?.focus(),50);
}
async function rufeBearbeiten(id){
  const text=(document.getElementById("rufe-edit")?.value||"").trim(); if(!text)return;
  try{ const r=await _rfRpc("rufe_bearbeiten",{p_id:id,p_text:text}); if(!r.ok){ toast("Nicht gespeichert","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  document.getElementById("rufe-menue")?.remove(); toast("Bearbeitet");
  await rufeLaden(false);
}
async function rufeArchivieren(id,eigen){
  document.getElementById("rufe-menue")?.remove();
  if(!await frageJaNein({emoji:"🗄️",titel:eigen?"Ruf zurückziehen?":"Ruf archivieren?",
    text:eigen?"Der Ruf verschwindet für alle. Gelöscht wird er nicht – das Trainerteam kann ihn im Archiv noch sehen.":"Der Ruf verschwindet für die Eltern. Gelöscht wird er nicht – das Trainerteam sieht ihn im Archiv.",
    ja:eigen?"Zurückziehen":"Archivieren",nein:"Abbrechen"}))return;
  try{ const r=await _rfRpc("rufe_archivieren",{p_id:id}); if(!r.ok){ toast("Das ging nicht","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast(eigen?"Zurückgezogen":"Archiviert");
  await rufeLaden(false);
}
async function rufeMelden(id){
  document.getElementById("rufe-menue")?.remove();
  if(!await frageJaNein({emoji:"🚩",titel:"Ruf melden?",text:"Trainerteam und Elternbeirat sehen die Meldung und kümmern sich. Wer den Ruf geschrieben hat, erfährt nicht, dass du gemeldet hast.",ja:"Melden",nein:"Abbrechen"}))return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_meldung`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify({nachricht_id:id})}); if(!r.ok){ toast("Nicht gemeldet","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Gemeldet – danke");
}
function rufeStummMenue(uid,name){
  const z=(txt,h)=>`<button type="button" style="${_RF_ZEILE}" onclick="rufeStumm('${uid}',${h})">${txt}</button>`;
  _rfBlatt("rufe-menue",`${name} stummschalten?`,`<div style="font-size:var(--s-text);color:var(--text2)">Lesen geht weiter, schreiben nicht.</div>`+z("24 Stunden",24)+z("7 Tage",168));
}
async function rufeStumm(uid,stunden){
  document.getElementById("rufe-menue")?.remove();
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_stumm?on_conflict=user_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({user_id:uid,bis:new Date(Date.now()+stunden*3600e3).toISOString()})}); if(!r.ok){ toast("Nicht stummgeschaltet","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Stummgeschaltet");
}
function rufeRaumNeu(){
  _rfBlatt("rufe-menue","Neuer Raum",`<label for="rufe-raum-name" style="display:block;font-size:var(--s-klein);color:var(--text2)">Name (z. B. Fahrgemeinschaft)</label>
    <input id="rufe-raum-name" type="text" maxlength="40" style="width:100%;box-sizing:border-box;min-height:48px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">
    <button type="button" style="${_RF_ZEILE};justify-content:center;background:#1e3a8a;color:#fff;border:none;font-weight:800" onclick="rufeRaumAnlegen()">Raum anlegen</button>`);
  setTimeout(()=>document.getElementById("rufe-raum-name")?.focus(),50);
}
async function rufeRaumAnlegen(){
  const name=(document.getElementById("rufe-raum-name")?.value||"").trim(); if(!name||!_rf)return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_raum`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify({name,emoji:"💬",sort:_rf.raeume.length})}); if(!r.ok){ toast("Raum nicht angelegt","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  document.getElementById("rufe-menue")?.remove(); toast("Raum angelegt");
  _rf.raeume=await _rfGet("rufe_raum?archiviert=eq.false&select=id,name,emoji,sort&order=sort.asc,id.asc");
  rufeRaeumeRender();
}

/* ── Suche ────────────────────────────────────────────────────────────────────── */
function rufeSucheUmschalten(){
  const s=document.getElementById("rufe-suche"); if(!s||!_rf)return;
  const an=s.style.display==="none"; s.style.display=an?"block":"none";
  if(an)setTimeout(()=>document.getElementById("rufe-suche-feld")?.focus(),30);
  else{ _rf.suche=""; const f=document.getElementById("rufe-suche-feld"); if(f)f.value=""; rufeRender(); }
}
let _rfSucheT=null;
function rufeSucheSetzen(q){
  if(!_rf)return; _rf.suche=String(q||"").trim();
  clearTimeout(_rfSucheT); _rfSucheT=setTimeout(rufeSucheRender,250);
  if(!_rf.suche)rufeRender();
}
async function rufeSucheRender(){
  if(!_rf||!_rf.suche)return;
  const box=document.getElementById("rufe-liste"); if(!box)return;
  const q=_rf.suche.replace(/[%*,()]/g," ").trim(); if(!q)return;
  const treffer=await _rfGet(`rufe_nachricht?text=ilike.*${encodeURIComponent(q)}*&archiviert_am=is.null&select=id,raum_id,autor_name,text,created_at&order=created_at.desc&limit=40`);
  if(!_rf||!_rf.suche)return;
  const raum=id=>(_rf.raeume.find(r=>r.id===id)||{}).name||"";
  box.innerHTML=`<div style="font-size:var(--s-klein);color:var(--text2);margin:4px 0 8px">${treffer.length} Treffer für „${esc(_rf.suche)}“</div>`
    +(treffer.length?treffer.map(n=>`<button type="button" onclick="rufeSucheSprung(${Number(n.raum_id)},${Number(n.id)})" style="${_RF_ZEILE};display:block">
      <div style="font-size:var(--s-klein);color:var(--text2)">${esc(n.autor_name||"")} · ${esc(_rfTag(n.created_at))} ${_rfZeit(n.created_at)}${_rf.raeume.length>1?" · "+esc(raum(n.raum_id)):""}</div>
      <div style="font-size:var(--s-text)">${_rfText(String(n.text).slice(0,200))}</div></button>`).join(""):`<div style="color:var(--text2);font-size:var(--s-text)">Nichts gefunden.</div>`);
}
async function rufeSucheSprung(raumId,id){
  if(!_rf)return;
  _rf.suche=""; const s=document.getElementById("rufe-suche"); if(s)s.style.display="none";
  const f=document.getElementById("rufe-suche-feld"); if(f)f.value="";
  if(_rf.raum!==raumId){ _rf.raum=raumId; rufeRaeumeRender(); }
  await rufeLaden(true);
  rufeHinspringen(id);
}

/* ── Zahl der ungelesenen Rufe (Startseite, Kachel) ───────────────────────────── */
async function rufeBadgeLoad(){
  const els=[...document.querySelectorAll(".rufe-badge")]; if(!els.length)return;
  let n=0, alle=false;
  try{ const r=await _rfRpc("rufe_ungelesen"); if(r.ok){ (await r.json()||[]).forEach(x=>{ n+=Number(x.anzahl)||0; if(x.an_alle)alle=true; }); } }catch(e){}
  els.forEach(el=>{ el.textContent=n?(n>99?"99+":String(n)):""; el.style.display=n?"inline-flex":"none";
    el.setAttribute("aria-label",n?`${n} neue Adler-Rufe${alle?", davon an alle":""}`:""); el.style.background=alle?"#b45309":"#dc2626"; });
}

/* ── Trainerbereich: Moderation (wer moderiert, offene Meldungen) ─────────────── */
async function rufeModOpen(){
  document.getElementById("rufe-mod-modal")?.remove();
  const m=document.createElement("div"); m.id="rufe-mod-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Adler-Rufe moderieren");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.style.zIndex=_rfZ(10002);
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:560px;width:100%;margin:auto">
    ${mdlHead("rufe-mod-modal","🛡️","Adler-Rufe moderieren","Wer moderiert · gemeldete Rufe","#1e3a8a")}
    <div id="rufe-mod-inhalt" style="font-size:var(--s-text);color:var(--text2)">Lädt …</div></div>`;
  document.body.appendChild(m);
  await rufeModRender();
}
async function rufeModRender(){
  const box=document.getElementById("rufe-mod-inhalt"); if(!box)return;
  const [mods,ek,kader,meld]=await Promise.all([
    _rfGet("rufe_moderator?select=email"), _rfGet("eltern_kinder?select=email,spieler_id"), _rfGet("kader?select=id,name"),
    _rfGet("rufe_meldung?erledigt=eq.false&select=id,nachricht_id,created_at,rufe_nachricht(id,autor_name,text,archiviert_am)&order=created_at.desc")
  ]);
  const kname={}; kader.forEach(k=>kname[k.id]=k.name);
  const wer=email=>{ const ks=ek.filter(x=>(x.email||"").toLowerCase()===email).map(x=>kname[x.spieler_id]).filter(Boolean); return ks.length?"Elternteil von "+ks.join(", "):email; };
  const frei=[...new Set(ek.map(x=>(x.email||"").toLowerCase()).filter(Boolean))].filter(e=>!mods.some(t=>t.email===e)).sort((a,b)=>wer(a).localeCompare(wer(b),"de"));
  box.innerHTML=`<div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:4px 0 6px">Moderieren (außer dem Trainerteam)</div>
    ${mods.length?mods.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--surface2);color:var(--text)"><span style="flex:1">🛡️ ${esc(wer(t.email))}</span>
      <button class="btn btn-sm" onclick="rufeModEntfernen('${esc(t.email)}')" aria-label="Moderation für ${esc(wer(t.email))} beenden">Entfernen</button></div>`).join(""):`<div style="color:var(--text2)">Noch niemand – z. B. den Elternbeirat hinzufügen.</div>`}
    <label for="rufe-mod-neu" style="display:block;font-size:var(--s-klein);color:var(--text2);margin-top:10px">Elternteil hinzufügen</label>
    <div style="display:flex;gap:8px;margin-top:4px"><select id="rufe-mod-neu" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:8px;font:inherit;background:var(--surface2);color:var(--text)">
      <option value="">– Elternteil wählen –</option>${frei.map(e=>`<option value="${esc(e)}">${esc(wer(e))}</option>`).join("")}</select>
      <button class="btn" onclick="rufeModSetzen()">Hinzufügen</button></div>
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:18px 0 6px">Gemeldete Rufe</div>
    ${meld.length?meld.map(x=>{ const n=x.rufe_nachricht||{}; return `<div style="border-top:1px solid var(--surface2);padding:8px 0;color:var(--text)">
      <div style="font-size:var(--s-klein);color:var(--text2)">${esc(n.autor_name||"")} · gemeldet ${esc(_rfTag(x.created_at))} ${_rfZeit(x.created_at)}${n.archiviert_am?" · schon archiviert":""}</div>
      <div style="margin:2px 0 6px">${_rfText(n.text||"")}</div>
      <div style="display:flex;gap:8px">${n.archiviert_am?"":`<button class="btn btn-sm" onclick="rufeModArchivieren(${Number(x.id)},${Number(x.nachricht_id)})">Archivieren</button>`}
        <button class="btn btn-sm" onclick="rufeModErledigt(${Number(x.id)})">Erledigt, bleibt stehen</button></div></div>`; }).join(""):`<div style="color:var(--text2)">Keine offenen Meldungen.</div>`}`;
}
async function rufeModSetzen(){
  const email=(document.getElementById("rufe-mod-neu")?.value||"").toLowerCase(); if(!email)return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_moderator`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=ignore-duplicates,return=minimal'}),body:JSON.stringify({email})}); if(!r.ok){ toast("Nicht gespeichert","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Moderation übergeben"); rufeModRender();
}
async function rufeModEntfernen(email){
  if(!await frageJaNein({emoji:"🛡️",titel:"Moderation beenden?",text:"Das Elternteil kann danach nicht mehr fixieren, archivieren oder stummschalten.",ja:"Beenden",nein:"Abbrechen",ton:"rot"}))return;
  try{ await fetch(`${SB_URL}/rest/v1/rufe_moderator?email=eq.${encodeURIComponent(email)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=minimal'})}); }catch(e){}
  rufeModRender();
}
async function rufeModErledigt(id){
  try{ await fetch(`${SB_URL}/rest/v1/rufe_meldung?id=eq.${Number(id)}`,{method:"PATCH",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify({erledigt:true})}); }catch(e){}
  rufeModRender();
}
async function rufeModArchivieren(meldId,nachrichtId){
  try{ const r=await _rfRpc("rufe_archivieren",{p_id:nachrichtId}); if(!r.ok){ toast("Nicht archiviert","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  await rufeModErledigt(meldId); toast("Archiviert");
}
function rufeModulDa(){ return true; }
