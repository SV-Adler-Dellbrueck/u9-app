/* ═══════════════════════════════════
   TEAM-QUESTS (Phase 8-F) – kollektive Missionen pro Spieltag.
   Bewusst TEAM-Ziele (nicht Einzelwertung): das ganze Team zieht an einem Strang.
   Fortschritt = Summe der positiven Aktionen aus atCounts (bereits live im Speicher,
   kein Extra-Query). Beim Erreichen: confetti() + Toast, genau einmal (questDone).
   Nur positive Aktionen – Ballverlust/Fehler zählen bewusst nicht mit.
═══════════════════════════════════ */
const TEAM_QUESTS=[
  {key:"pass",icon:"🎯",label:"Pass-Maschine",target:20},
  {key:"dribbling",icon:"🌀",label:"Dribbel-Show",target:10},
  {key:"gewinn",icon:"🦅",label:"Ball-Räuber",target:12},
  {key:"parade",icon:"🧤",label:"Fels im Tor",target:5},
  {key:"tor",icon:"⚽",label:"Torfabrik",target:5}
];
// Editierbare Laufzeit-Kopie aus team_config (TEAM_QUESTS bleibt der Default) + Freitext-Belohnung.
let teamQuests=TEAM_QUESTS.map(q=>({...q})), teamBelohnung="", teamDoubleXpUntil=null;
// Standard-Federbelohnung, wenn das Team ALLE Quests eines Spieltags schafft (editierbar, Default 20).
let teamQuestFedern=20;
// HOTFIX 4: waehlbare Quest-Aktionen (qkey) im CRUD-Editor
const QUEST_KEYS=[
  {key:"pass",label:"Pässe"},{key:"dribbling",label:"Dribblings"},{key:"gewinn",label:"Ballgewinne"},
  {key:"parade",label:"Paraden (TW)"},{key:"tor",label:"Tore"},{key:"aufbau",label:"Spielaufbau"},{key:"heraus",label:"Herausspielen"}
];
async function loadTeamConfig(){
  // Belohnung + Booster bleiben in team_config; Quests kommen aus der team_quests-Tabelle
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=belohnung,double_xp_until,teamquest_federn`,{headers:sbAuthHeaders()});
    if(r.ok){const c=(await r.json())[0]; if(c){teamBelohnung=c.belohnung||""; teamDoubleXpUntil=c.double_xp_until||null; teamQuestFedern=(c.teamquest_federn==null?20:Number(c.teamquest_federn));}}
  }catch(e){}
  await loadTeamQuests();
}
async function loadTeamQuests(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_quests?select=id,qkey,icon,label,target,aktiv,sort&order=sort.asc`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+(sbToken()||SB_KEY)}});
    if(!r.ok)return;
    let rows=await r.json();
    if(!rows.length){ // leer -> mit Defaults seeden (nur Trainer darf schreiben)
      if(sbToken()){
        try{await fetch(`${SB_URL}/rest/v1/team_quests`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=representation'}),body:JSON.stringify(TEAM_QUESTS.map((q,i)=>({team:'adler1',qkey:q.key,icon:q.icon,label:q.label,target:q.target,aktiv:true,sort:i})))}).then(rr=>rr.ok&&rr.json().then(d=>rows=d));}catch(e){}
      }
      if(!rows.length)return; // anon/offline -> Defaults aus data.js bleiben aktiv
    }
    // auf die von questStripHTML/questCheck erwartete Struktur mappen (qkey -> key)
    teamQuests=rows.filter(r=>r.aktiv!==false).sort((a,b)=>(a.sort||0)-(b.sort||0))
      .map(r=>({key:r.qkey||"pass",icon:r.icon||"🏆",label:r.label||"Quest",target:Number(r.target)||10,_id:r.id}));
  }catch(e){}
}
/* FEAT T: Double-XP-Booster – der Trainer schaltet nur das Zeitfenster in team_config.
   Den Multiplikator wendet ausschließlich die Server-RPC xp_award_event an. */
function xpBoostActive(){return !!(teamDoubleXpUntil&&new Date(teamDoubleXpUntil)>new Date());}
async function xpBoosterToggle(btn){
  const neu=xpBoostActive()?null:new Date(Date.now()+72*3600*1000).toISOString();
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({double_xp_until:neu,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte Booster nicht schalten","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  teamDoubleXpUntil=neu;
  toast(neu?"⚡ Doppel-"+XP_LABEL+" aktiv – 72 Stunden!":"Booster beendet");
  questEditorOpen(); // Editor mit aktualisiertem Status neu zeichnen
}
let questDone=new Set();
function questCountsLive(){
  const c={};
  Object.values(atCounts).forEach(pl=>Object.keys(pl).forEach(k=>{c[k]=(c[k]||0)+pl[k];}));
  return c;
}
/* ── Quests gelten teamuebergreifend (PO v392) ────────────────────────────────
   Vorher zaehlte nur atCounts, also das gerade geoeffnete Team. Bei drei Teams
   hat jedes fuer sich "Pass-Maschine 20" geholt – die Quest fiel dreimal und war
   entsprechend billig. Jetzt gilt: EIN Ziel fuer den ganzen Spieltag.
     Fortschritt = eigenes Team live (atCounts) + die anderen Teams aus der DB
     Ziel        = q.target × Anzahl Teams  (drei Teams -> 60 statt 20)
   questFremd haelt nur die ANDEREN Teams, damit ein Tipp im Aktions-Tracker
   sofort sichtbar ist, ohne auf einen neuen Query zu warten. */
let questFremd={};
async function questFremdLaden(){
  questFremd={};
  const tag=(typeof spieltagRawDate==="function")?spieltagRawDate():"";
  const eigen=(typeof spieltagKey==="function")?spieltagKey():tag;
  if(!tag)return;
  try{
    // like.<datum>* trifft "2026-08-11" und "2026-08-11__t2" – Datumsschluessel haben feste Laenge.
    const r=await fetch(`${SB_URL}/rest/v1/match_actions?datum=like.${encodeURIComponent(tag)}*&select=datum,aktion`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    (await r.json()).forEach(a=>{
      const d=String(a.datum||"");
      if(d===eigen)return;                                  // eigenes Team kommt live aus atCounts
      if(d!==tag&&d.indexOf(tag+"__t")!==0)return;          // Sicherheitsnetz gegen Fehltreffer
      questFremd[a.aktion]=(questFremd[a.aktion]||0)+1;
    });
  }catch(e){}
}
function questTeams(){
  const n=(typeof TEAM_ANZAHL!=="undefined")?parseInt(TEAM_ANZAHL):1;
  return Math.max(1,n||1);
}
function questZiel(q){ return Math.max(1,(parseInt(q&&q.target)||1)*questTeams()); }
function questCountsAll(){
  const c=questCountsLive();
  Object.keys(questFremd).forEach(k=>{c[k]=(c[k]||0)+questFremd[k];});
  return c;
}
function questStripHTML(counts){
  counts=counts||questCountsAll();
  const items=teamQuests.map(q=>{
    const ziel=questZiel(q);
    const n=counts[q.key]||0,done=n>=ziel,pct=Math.min(100,Math.round(n/ziel*100));
    return `<div style="flex:1;min-width:86px">
      <div style="display:flex;justify-content:space-between;font-size:var(--s-klein);color:var(--text2);margin-bottom:2px">
        <span>${q.icon} ${esc(q.label)}</span><span style="font-weight:700;color:${done?"#059669":"var(--text)"}">${n}/${ziel}${done?" ✓":""}</span>
      </div>
      <div style="height:6px;background:var(--surface2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${done?"#059669":"var(--blue)"};transition:width .3s"></div>
      </div>
    </div>`;
  }).join("");
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:var(--s-klein);text-transform:uppercase;letter-spacing:.5px;color:var(--text3);flex:1">🏆 Team-Quests heute${questTeams()>1?` · alle ${questTeams()} Teams zusammen`:""}</span>
      <button onclick="questEditorOpen()" style="border:none;background:transparent;color:var(--blue-text);font-size:var(--s-klein);cursor:pointer;font-family:inherit">anpassen</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">${items}</div>
    ${teamBelohnung?`<div style="margin-top:8px;font-size:var(--s-klein);color:var(--text2)">🎁 Belohnung: <strong>${esc(teamBelohnung)}</strong></div>`:""}`;
}
// Spieltag-Sektion „Team-Quests": Ziele + Feder-Belohnung im Überblick, mit Editor-Zugang.
// Steht ausserhalb der Team-Kacheln – die Ziele gelten fuer alle Teams des Tages gemeinsam.
function questPanelRender(){
  const box=document.getElementById("quest-panel"); if(!box)return;
  const teams=questTeams();
  const counts=questCountsAll();
  const chips=teamQuests.map(q=>{
    const ziel=questZiel(q), n=counts[q.key]||0, done=n>=ziel;
    return `<span style="font-size:var(--s-klein);background:${done?"#ecfdf5":"var(--surface2)"};color:${done?"#065f46":"var(--text)"};border-radius:12px;padding:3px 9px">${q.icon} ${esc(q.label)} · ${n}/${ziel}${done?" ✓":""}</span>`;
  }).join("");
  box.innerHTML=`<div style="background:var(--surface);border:var(--border-s);border-left:3px solid #7c3aed;border-radius:12px;padding:12px 14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="flex:1;font-size:var(--s-text);font-weight:700">🏆 Diese Ziele holen sich ${teams>1?"alle Teams gemeinsam":"die Kinder im Spiel"}</span>
      <button class="btn btn-sm" onclick="questEditorOpen()"><i class="ti ti-pencil"></i>Anpassen</button>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:8px">${teams>1
      ?`Ein Ziel für den ganzen Spieltag: gezählt werden die Aktionen <b>aller ${teams} Teams zusammen</b>, dafür ist das Ziel ${teams}× so hoch.`
      :`Gezählt werden die Aktionen aus dem Live-Tracker.`}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${chips||'<span style="font-size:var(--s-klein);color:var(--text3)">Noch keine Quests – „Anpassen" antippen.</span>'}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font-size:var(--s-klein);color:var(--text2)">
      ${teamQuestFedern>0?`<span style="background:#ecfdf5;color:#065f46;border-radius:12px;padding:3px 9px;font-weight:700">${XP_ICON} ${teamQuestFedern} Federn pro Kind, wenn ALLE Ziele fallen</span>`:`<span style="color:var(--text3)">Feder-Belohnung aus</span>`}
      ${teamBelohnung?`<span>🎁 <strong>${esc(teamBelohnung)}</strong></span>`:""}
    </div>
  </div>`;
}
// Erst prüfen ob eine Quest NEU geschafft wurde – dann feiern (einmalig pro Spieltag).
function questCheck(counts){
  counts=counts||questCountsAll();
  const cont=document.getElementById("quest-strip");
  teamQuests.forEach(q=>{
    if((counts[q.key]||0)>=questZiel(q)&&!questDone.has(q.key)){
      questDone.add(q.key);
      if(cont)confetti(cont);
      toast(`🏆 Team-Quest geschafft: ${q.label}!`);
      try{navigator.vibrate&&navigator.vibrate([30,40,30]);}catch(e){}
    }
  });
  teamQuestRewardMaybe(); // alle geschafft? -> Federn an jedes mitspielende Kind
}
/* Wenn ALLE Quests des Spieltags fallen, bekommt jedes mitspielende Kind die eingestellte
   Feder-Belohnung – automatisch, serverseitig idempotent pro Spieler+Spieltag.
   Schluessel ist bewusst das REINE Datum (nicht spieltagKey): die Quests gelten
   teamuebergreifend, also gibt es die Belohnung einmal pro Kind und Spieltag – sonst
   koennte ein Kind ueber "…__t2" ein zweites Mal kassieren.
   Belohnt werden alle eingeteilten Kinder aller Teams; ohne Einteilung das nominierte Team. */
let questRewardedFor=null;
async function teamQuestRewardMaybe(){
  if(!teamQuests.length||questDone.size<teamQuests.length)return; // noch nicht alle geschafft
  if(teamQuestFedern<=0)return;                                    // Belohnung deaktiviert
  if(!sbToken())return;                                            // nur das Trainerteam vergibt
  const datum=(typeof spieltagRawDate==="function")?spieltagRawDate():spieltagKey();
  if(questRewardedFor===datum)return;                              // in dieser Sitzung schon vergeben
  questRewardedFor=datum;
  const ausTeams=(typeof TEAMS==="object"&&TEAMS)?Object.keys(TEAMS).filter(n=>TEAMS[n]):[];
  const namen=ausTeams.length?ausTeams
            :((typeof nominierteSpieler==="function")?nominierteSpieler():[]);
  let n=0;
  for(const name of namen){
    const k=getKader(name); if(!k||!k._id)continue;
    try{const d=await xpTeamQuestAward(k._id,datum); if(d>0)n++;}catch(e){}
  }
  if(n>0){
    const cont=document.getElementById("quest-strip"); if(cont)confetti(cont);
    toast(`🎉 Alle Quests geschafft! ${XP_ICON} ${teamQuestFedern} Federn für ${n} ${n===1?"Kind":"Kinder"}!`);
    try{navigator.vibrate&&navigator.vibrate([40,60,40,60,80]);}catch(e){}
  }
}
async function xpTeamQuestAward(spielerId,datum){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_teamquest`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_datum:datum})});
    if(!r.ok)return 0;
    return (await r.json())||0;
  }catch(e){return 0;}
}
// Beim Laden bereits erfüllte Quests still als „erledigt" markieren (kein Confetti beim Öffnen).
function questSeedDone(){
  const counts=questCountsAll();
  questDone=new Set(teamQuests.filter(q=>(counts[q.key]||0)>=questZiel(q)).map(q=>q.key));
}
// Trainer-Editor: Ziel & Name je Quest anpassen + Freitext-Belohnung für die Kids.
let qeDraft=[];
function questEditorOpen(){
  document.getElementById("quest-editor")?.remove();
  qeDraft=teamQuests.map(q=>({key:q.key,icon:q.icon,label:q.label,target:q.target}));
  const m=document.createElement("div");
  m.id="quest-editor";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:440px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:2px">🏆 Team-Quests verwalten</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:12px">Quests anlegen, bearbeiten oder löschen. Jede Quest zählt eine Aktion bis zum Ziel.</div>
    <div id="qe-list"></div>
    <button class="btn btn-sm" style="margin-bottom:12px" onclick="qeAddQuest()"><i class="ti ti-plus"></i>Quest hinzufügen</button>
    <div style="margin:0 0 12px;padding:10px;border:1.5px dashed #10b981;border-radius:10px;background:#ecfdf5">
      <label style="font-weight:700;font-size:var(--s-text);color:#065f46">${XP_ICON} Federn, wenn das Team ALLE Quests schafft</label>
      <div style="font-size:var(--s-klein);color:#047857;margin:2px 0 6px">Bekommt jedes mitspielende Kind gutgeschrieben – automatisch, einmal pro Spieltag.</div>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="qe-federn" type="number" min="0" max="200" value="${teamQuestFedern}" style="width:90px;padding:8px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-karte);font-weight:700;box-sizing:border-box">
        <span style="font-size:var(--s-text);color:#047857">${XP_ICON} pro Kind</span>
      </div>
    </div>
    <label for="qe-belohnung" style="font-size:var(--s-klein);color:var(--text2)">🎁 Zusätzliche Belohnung (Freitext, optional)</label>
    <textarea id="qe-belohnung" rows="2" placeholder="z. B. Eis für alle beim nächsten Training!" style="width:100%;padding:8px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text);margin:4px 0 12px;box-sizing:border-box">${esc(teamBelohnung)}</textarea>
    <div style="margin:0 0 12px;padding:10px;border:1.5px dashed #f59e0b;border-radius:10px;background:#fffbeb">
      <div style="font-weight:700;font-size:var(--s-text);color:#92400e;margin-bottom:2px">⚡ Doppel-${XP_LABEL}-Booster</div>
      <div style="font-size:var(--s-klein);color:#78716c;margin-bottom:8px">${xpBoostActive()?`Aktiv bis ${new Date(teamDoubleXpUntil).toLocaleString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})} Uhr – alle ${XP_LABEL} zählen doppelt!`:"72-Stunden-Fenster (z. B. übers Wochenende). Den 2x-Multiplikator rechnet der Server."}</div>
      <button class="btn btn-sm ${xpBoostActive()?"":"btn-p"}" onclick="xpBoosterToggle(this)">${xpBoostActive()?"Booster beenden":"⚡ 72h aktivieren"}</button>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" onclick="document.getElementById('quest-editor').remove()">Abbrechen</button>
      <button class="btn btn-p" onclick="questSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  qeRenderList();
}
function qeSyncFromInputs(){
  document.querySelectorAll("#qe-list [data-i]").forEach(el=>{
    const i=+el.dataset.i, f=el.dataset.f; if(!qeDraft[i])return;
    if(f==="target")qeDraft[i].target=Math.max(1,parseInt(el.value)||1);
    else if(f==="key")qeDraft[i].key=el.value;
    else qeDraft[i][f]=el.value;
  });
}
function qeRenderList(){
  const wrap=document.getElementById("qe-list"); if(!wrap)return;
  wrap.innerHTML=qeDraft.map((q,i)=>`<div style="display:flex;align-items:center;gap:5px;margin-bottom:8px">
    <input data-i="${i}" data-f="icon" value="${esc(q.icon||"🏆")}" maxlength="2" style="width:34px;text-align:center;padding:7px 2px;border:1px solid var(--rand-bedien);border-radius:6px;font-size:var(--s-karte)">
    <input data-i="${i}" data-f="label" value="${esc(q.label||"")}" placeholder="Name" style="flex:1;min-width:70px;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text)">
    <select data-i="${i}" data-f="key" style="padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text)">${QUEST_KEYS.map(k=>`<option value="${k.key}"${k.key===q.key?" selected":""}>${k.label}</option>`).join("")}</select>
    <input data-i="${i}" data-f="target" type="number" min="1" value="${q.target||10}" title="Ziel" style="width:52px;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text)">
    <button onclick="qeDelQuest(${i})" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;font-size:var(--s-karte)">🗑</button>
  </div>`).join("")||'<div style="font-size:var(--s-text);color:var(--text3);padding:6px">Noch keine Quests – füge eine hinzu.</div>';
}
function qeAddQuest(){ qeSyncFromInputs(); qeDraft.push({key:"pass",icon:"🏆",label:"Neue Quest",target:10}); qeRenderList(); }
function qeDelQuest(i){ qeSyncFromInputs(); qeDraft.splice(i,1); qeRenderList(); }
async function questSave(btn){
  qeSyncFromInputs();
  const clean=qeDraft.filter(q=>(q.label||"").trim()).map(q=>({key:q.key||"pass",icon:(q.icon||"🏆").trim()||"🏆",label:q.label.trim(),target:Math.max(1,parseInt(q.target)||1)}));
  teamBelohnung=(document.getElementById("qe-belohnung")?.value||"").trim();
  teamQuestFedern=Math.max(0,Math.min(200,parseInt(document.getElementById("qe-federn")?.value)||0));
  if(btn)btn.disabled=true;
  try{
    // HOTFIX 4: Quests -> team_quests (replace-all), Belohnung bleibt in team_config
    const del=await fetch(`${SB_URL}/rest/v1/team_quests?team=eq.adler1`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(del))return;
    if(clean.length){
      const ins=await fetch(`${SB_URL}/rest/v1/team_quests`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(clean.map((q,i)=>({team:'adler1',qkey:q.key,icon:q.icon,label:q.label,target:q.target,aktiv:true,sort:i})))});
      if(!ins.ok){toast("Speichern fehlgeschlagen","err");return;}
    }
    await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,belohnung:teamBelohnung,teamquest_federn:teamQuestFedern,updated_at:new Date().toISOString()})});
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  teamQuests=clean.map(q=>({...q}));
  document.getElementById("quest-editor")?.remove();
  toast("Team-Quests gespeichert ✓");
  questSeedDone(); if(document.getElementById("action-panel"))atRender();
  if(document.getElementById("quest-panel"))questPanelRender();
  if(typeof curSection!=="undefined"&&curSection==="home"&&typeof renderHome==="function")renderHome();
}

