/* ═══════════════════════════════════
   VOICE-TO-ACTION (Phase 8-E) – BETA, bewusst als Bonus, nie als Hauptweg.
   Kritische Design-Entscheidungen (siehe Tech-Lead-Analyse):
   • Manuell-first: der Tap-Tracker bleibt der Arbeitspferd; Voice ist opt-in.
   • Nur wenn SpeechRecognition unterstützt wird (auf iOS oft wackelig) – sonst
     sauberer Hinweis, kein toter Button.
   • Suchraum = NUR nominierte Spieler (kleiner Namensraum) + Levenshtein-Fuzzy-Match,
     weil Eigennamen das Schwierigste für STT sind.
   • NIEMALS Auto-Push: jede erkannte Aktion muss vor dem Senden bestätigt werden
     (Fehlerkennung „Tor durch X" darf nicht ungeprüft in den Eltern-Ticker).
   • Nur positive Aktionen per Sprache (konsistent zum Pädagogik-Filter).
═══════════════════════════════════ */
const AT_LABEL={}; [...AT_ACTIONS,...AT_ACTIONS_TW].forEach(a=>AT_LABEL[a.key]=a.label); AT_LABEL.tor="Tor";
const VOICE_ACTIONS={ // gesprochenes Schlüsselwort → Aktions-Key (nur positive)
  tor:"tor",tooor:"tor",treffer:"tor",tore:"tor",
  pass:"pass",zuspiel:"pass",abspiel:"pass",paesse:"pass",
  dribbling:"dribbling",dribbel:"dribbling",dribbelt:"dribbling",
  ballgewinn:"gewinn",gewinn:"gewinn",erobert:"gewinn",eroberung:"gewinn",
  parade:"parade",gehalten:"parade",reflex:"parade",gehalt:"parade",
  aufbau:"aufbau",abwurf:"aufbau",
  herauslaufen:"heraus",heraus:"heraus",herausgelaufen:"heraus"
};
const voiceSupported=!!(typeof window!=="undefined"&&(window.SpeechRecognition||window.webkitSpeechRecognition));
let voiceRec=null, voiceOn=false;
function voiceNorm(s){return String(s||"").toLowerCase().replace(/[^a-zäöüß\s]/g,"").replace(/\s+/g," ").trim();}
function levenshtein(a,b){
  a=a||"";b=b||"";const m=a.length,n=b.length;
  if(!m)return n;if(!n)return m;
  let prev=Array.from({length:n+1},(_,i)=>i),cur=new Array(n+1);
  for(let i=1;i<=m;i++){cur[0]=i;
    for(let j=1;j<=n;j++){const cost=a[i-1]===b[j-1]?0:1;cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+cost);}
    [prev,cur]=[cur,prev];
  }
  return prev[n];
}
// Bestes Fuzzy-Match eines Wortes gegen den (kleinen) Kader; normalisierte Distanz ≤ 0.34.
function voiceMatchName(word,roster){
  let best=null,bd=1;
  roster.forEach(n=>{const nn=voiceNorm(n).split(" ")[0]; const d=levenshtein(word,nn)/Math.max(word.length,nn.length,1); if(d<bd){bd=d;best=n;}});
  return bd<=0.34?{name:best,score:bd}:null;
}
function voiceParse(alts){
  const roster=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():kaderNamen();
  let found=null;
  for(const raw of alts){
    const words=voiceNorm(raw).split(" ").filter(Boolean);
    let aktion=null;
    for(const w of words){ if(!aktion&&VOICE_ACTIONS[w]){aktion=VOICE_ACTIONS[w];break;} }
    let bestName=null,bestScore=1;
    for(const w of words){ const m=voiceMatchName(w,roster); if(m&&m.score<bestScore){bestScore=m.score;bestName=m.name;} }
    if(aktion&&bestName){found={aktion,name:bestName,transcript:raw};break;}
  }
  if(!found){ toast(`Nicht verstanden${alts[0]?`: „${alts[0]}"`:""} – bitte manuell tippen.`,"err"); return; }
  voiceConfirm(found.aktion,found.name,found.transcript);
}
function voiceConfirm(aktion,name,transcript){
  document.getElementById("voice-confirm")?.remove();
  const emo=AT_EMO[aktion]||"•", lbl=AT_LABEL[aktion]||aktion;
  const m=document.createElement("div");
  m.id="voice-confirm";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:20px;max-width:340px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">🎤 Verstanden${transcript?` · „${esc(transcript)}"`:""}</div>
    <div style="font-size:22px;font-weight:800;margin-bottom:2px">${emo} ${esc(lbl)}</div>
    <div style="font-size:15px;color:var(--text2);margin-bottom:16px">durch <strong>${esc(name)}</strong>?</div>
    <div style="display:flex;gap:10px">
      <button class="btn" style="flex:1" onclick="document.getElementById('voice-confirm').remove()"><i class="ti ti-x"></i>Verwerfen</button>
      <button class="btn btn-p" style="flex:1" onclick="voiceApply('${aktion}','${name.replace(/'/g,"")}');document.getElementById('voice-confirm').remove()"><i class="ti ti-check"></i>Übernehmen</button>
    </div></div>`;
  document.body.appendChild(m);
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
}
// Erst nach Bestätigung: setzt den Spieler aktiv und löst den regulären Aktions-Flow aus.
function voiceApply(aktion,name){
  atSel=name; atRender();
  if(aktion==="tor")tickerGoal(); else atTap(aktion);
}
function voiceBtnUpdate(){
  const b=document.getElementById("voice-btn");
  if(!b)return;
  b.innerHTML=voiceOn
    ? '<i class="ti ti-microphone-2"></i>Hört zu… (tippen = Stopp)'
    : '<i class="ti ti-microphone"></i>Voice<span style="font-size:9px;background:#f59e0b;color:#fff;padding:1px 5px;border-radius:8px;margin-left:5px">Beta</span>';
  b.classList.toggle("btn-p",voiceOn);
}
function voiceStart(){
  if(!voiceSupported){toast("Spracheingabe wird auf diesem Gerät nicht unterstützt – bitte manuell tippen.","err");return;}
  try{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    voiceRec=new SR();
    voiceRec.lang="de-DE";voiceRec.interimResults=false;voiceRec.maxAlternatives=4;voiceRec.continuous=false;
    voiceRec.onresult=e=>{ const alts=[...e.results[0]].map(a=>a.transcript); voiceParse(alts); };
    voiceRec.onerror=ev=>{ voiceOn=false;voiceBtnUpdate(); if(ev.error==="not-allowed"||ev.error==="service-not-allowed")toast("Mikrofon-Zugriff nötig – bitte erlauben.","err"); else if(ev.error!=="no-speech"&&ev.error!=="aborted")toast("Sprachfehler – bitte manuell.","err"); };
    voiceRec.onend=()=>{ voiceOn=false;voiceBtnUpdate(); };
    voiceOn=true;voiceBtnUpdate();
    voiceRec.start();
  }catch(err){ voiceOn=false;voiceBtnUpdate(); toast("Sprachstart fehlgeschlagen – bitte manuell.","err"); }
}
function voiceStop(){ try{voiceRec&&voiceRec.stop();}catch(e){} voiceOn=false;voiceBtnUpdate(); }
function voiceToggle(){ voiceOn?voiceStop():voiceStart(); }

/* ═══════════════════════════════════
   VOICE DIARY (Phase 18.1) – der Trainer diktiert/tippt nach Abpfiff seine Gedanken.
   Landet in trainer_notes (nur Trainer); der Adler-Coach (KI) kann sie auf Wunsch
   einbeziehen. Freies Diktat (continuous), im Gegensatz zum Voice-to-Action-Tracker.
   Spracheingabe ist Bonus: ohne SpeechRecognition bleibt das Textfeld voll nutzbar. */
let vdRec=null, vdOn=false, vdBase="";
function vdMicUpdate(){
  const b=document.getElementById("vd-mic"); if(!b)return;
  b.innerHTML=vdOn?'<i class="ti ti-microphone-2"></i>Hört zu … (tippen = Stopp)':'<i class="ti ti-microphone"></i>Aufnehmen';
  b.classList.toggle("btn-p",vdOn);
  const iv=document.getElementById("vd-interim"); if(iv&&!vdOn)iv.textContent="";
}
function vdMicToggle(){
  if(vdOn){ vdOn=false; try{vdRec&&vdRec.stop();}catch(e){} vdMicUpdate(); return; }
  if(!voiceSupported){toast("Spracheingabe wird auf diesem Gerät nicht unterstützt – bitte tippen.","err");return;}
  try{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    vdRec=new SR(); vdRec.lang="de-DE"; vdRec.interimResults=true; vdRec.continuous=true; vdRec.maxAlternatives=1;
    const ta=document.getElementById("vd-text"); vdBase=ta?ta.value:"";
    vdRec.onresult=e=>{
      let interim="",fin="";
      for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal)fin+=r[0].transcript; else interim+=r[0].transcript; }
      if(fin)vdBase=(vdBase?vdBase.trim()+" ":"")+fin.trim();
      if(ta)ta.value=vdBase+(interim?(vdBase?" ":"")+interim:"");
      const iv=document.getElementById("vd-interim"); if(iv)iv.textContent=interim?"… "+interim:"";
    };
    vdRec.onerror=ev=>{ vdOn=false; vdMicUpdate(); if(ev.error==="not-allowed"||ev.error==="service-not-allowed")toast("Mikrofon-Zugriff nötig – bitte erlauben.","err"); else if(ev.error!=="no-speech"&&ev.error!=="aborted")toast("Sprachfehler – bitte tippen.","err"); };
    vdRec.onend=()=>{ if(vdOn){ try{vdRec.start();}catch(e){ vdOn=false; vdMicUpdate(); } } else { const ta2=document.getElementById("vd-text"); if(ta2)ta2.value=vdBase; vdMicUpdate(); } };
    vdOn=true; vdMicUpdate(); vdRec.start();
  }catch(err){ vdOn=false; vdMicUpdate(); toast("Sprachstart fehlgeschlagen – bitte tippen.","err"); }
}
function voiceDiaryOpen(datum){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  datum=datum||null;
  document.getElementById("vd-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="vd-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Trainer-Notiz");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal){vdOn=false;try{vdRec&&vdRec.stop();}catch(e){}modal.remove();}};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const micBtn=voiceSupported
    ?`<button id="vd-mic" class="btn btn-sm" onclick="vdMicToggle()"><i class="ti ti-microphone"></i>Aufnehmen</button>`
    :`<span style="font-size:11px;color:var(--text3)">🎤 Spracheingabe auf diesem Gerät nicht verfügbar – bitte tippen.</span>`;
  c.innerHTML=`${mdlHead("vd-modal","🎤","Trainer-Notiz","","#334155")}
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Direkt nach Abpfiff festhalten, bevor Details weg sind. Der Adler-Coach (KI) kann deine Notizen später einbeziehen.</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">${micBtn}<span id="vd-interim" style="font-size:12px;color:var(--text3);flex:1"></span></div>
    <textarea id="vd-text" rows="5" placeholder="z. B. Umschaltspiel war heute mies – wir standen nach Ballverlust zu offen." style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:13px;line-height:1.5;background:var(--surface2);color:var(--text);resize:vertical"></textarea>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-p btn-sm" onclick="vdSave(${datum?`'${jsq(datum)}'`:"null"})"><i class="ti ti-device-floppy"></i>Notiz speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="vdOn=false;try{vdRec&&vdRec.stop()}catch(e){};document.getElementById('vd-modal').remove()">Schließen</button>
    </div>
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3);margin:14px 0 4px">Letzte Notizen</div>
    <div id="vd-list"><div style="font-size:12px;color:var(--text3)">Lade …</div></div>`;
  modal.appendChild(c);document.body.appendChild(modal);
  vdListLoad();
}
async function vdListLoad(){
  const box=document.getElementById("vd-list"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_notes?select=id,datum,text,created_at&order=created_at.desc&limit=6`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML='<div style="font-size:12px;color:var(--text3)">Noch keine Notizen.</div>';return;}
  const fmt=d=>{const t=new Date(d);return t.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})+" "+t.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});};
  box.innerHTML=rows.map(n=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--surface2)">
    <div style="flex:1"><div style="font-size:13px;line-height:1.45">${esc(n.text)}</div><div style="font-size:10px;color:var(--text3);margin-top:2px">${fmt(n.created_at)}${n.datum?" · Spieltag "+esc(n.datum):""}</div></div>
    <button onclick="vdDelete(${n.id})" aria-label="Notiz löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:32px;min-height:32px"><i class="ti ti-trash"></i></button>
  </div>`).join("");
}
async function vdSave(datum){
  if(vdSave._busy)return; vdSave._busy=true; setTimeout(()=>{vdSave._busy=false;},1500);
  const ta=document.getElementById("vd-text");
  const text=(ta&&ta.value||"").trim();
  if(!text){toast("Bitte erst etwas notieren","err");return;}
  if(vdOn){vdOn=false;try{vdRec&&vdRec.stop();}catch(e){}vdMicUpdate();}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_notes`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({datum:datum||null,text})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Notiz gespeichert ✓");
  if(ta)ta.value=""; vdBase="";
  vdListLoad();
}
async function vdDelete(id){
  if(!confirm("Diese Notiz löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_notes?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  vdListLoad();
}
function atCount(sp,ak){return (atCounts[sp]&&atCounts[sp][ak])||0;}
function atSummary(sp){ if(!atCounts[sp])return ""; return Object.keys(atCounts[sp]).map(k=>atCounts[sp][k]?(AT_EMO[k]||"•")+atCounts[sp][k]:"").filter(Boolean).join(" "); }
async function atInit(){
  atCounts={};atSel="";atLog=[];atUid=0; if(typeof atTorRunden!=="undefined")atTorRunden=[];
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&select=spieler,aktion,runde`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      rows.forEach(a=>{if(!atCounts[a.spieler])atCounts[a.spieler]={};atCounts[a.spieler][a.aktion]=(atCounts[a.spieler][a.aktion]||0)+1;
        if(a.aktion==="tor"&&typeof atTorMerken==="function")atTorMerken(a.runde);});   // v504: Runde je Tor
    }
  }catch(e){}
  await loadTeamConfig(); // editierbare Quests + Belohnung laden
  await questFremdLaden(); // Quest-Fortschritt der ANDEREN Teams desselben Spieltags
  await atLoadGegentore(); // Gegentor-Stand fürs Live-Ergebnis
  questSeedDone(); // bereits erfüllte Quests still markieren, bevor gerendert wird
  atRender();
  questPanelRender();      // Team-Quest-Sektion im Spieltag zeichnen
  teamQuestRewardMaybe();  // falls beim Neuladen bereits alle Quests geschafft sind
}
function atRender(){
  const box=document.getElementById("action-panel");
  if(!box)return;
  box.innerHTML=`
    <div id="quest-strip" style="position:relative;overflow:hidden;background:var(--surface);border:var(--border-s);border-radius:12px;padding:10px 12px;margin-bottom:12px">${questStripHTML(questCountsAll())}</div>
    <button onclick="atLiveOpen()" style="width:100%;min-height:64px;margin-bottom:10px;border:none;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-size:17px;font-weight:800;font-family:inherit;cursor:pointer">⚡ Live-Aktion starten (Vollbild)</button>
    ${voiceSupported?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button id="voice-btn" class="btn btn-sm" onclick="voiceToggle()"><i class="ti ti-microphone"></i>Voice<span style="font-size:9px;background:#f59e0b;color:#fff;padding:1px 5px;border-radius:8px;margin-left:5px">Beta</span></button>
      <span style="font-size:10px;color:var(--text3);flex:1;min-width:140px">Sag z. B. „Pass“ und den Namen – du bestätigst vor dem Senden. Braucht Netz &amp; Ruhe.</span>
    </div>`:''}
    <div style="font-size:11px;color:var(--text3);text-align:center;margin-top:2px">Alle Aktionen – Pässe, Dribblings, Ballgewinne, Paraden, Tore &amp; Gegentore – erfasst du im Vollbild. Ein Elternteil kann per <b>Helfer-Link</b> übernehmen.</div>`;
}
function atPick(n){atSel=n;atRender();}

