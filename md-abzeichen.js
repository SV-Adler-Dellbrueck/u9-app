/* ═══════════════════════════════════
   TECHNIK-ABZEICHEN – echte Off-Screen-Challenges, ELTERN haken ab.
   Schafft das Kind eine Übung zuhause/beim Spielen → Eltern bestätigen → Federn (einmalig
   pro Abzeichen via quelle_id). Erledigte kommen aus xp_events_for (append-only punkte_log).
   IDs sind STABIL (nie umbenennen → sonst Doppel-Gutschrift). Vertrauens-Modell ok: kein
   Ranking, Federn speisen nur die eigene Karte – „Schummeln" bringt niemandem etwas.
═══════════════════════════════════ */
const TECHNIK_ABZEICHEN=[
  {id:"ab_jonglier",emo:"🤹",name:"Ball-Jongleur",desc:"Halte den Ball 5× hoch, ohne dass er runterfällt."},
  {id:"ab_beidfuss",emo:"🦶",name:"Beidfüßer",desc:"Spiele 10× mit rechts und 10× mit links gegen eine Wand."},
  {id:"ab_slalom",emo:"🐍",name:"Slalom-König",desc:"Dribble durch 5 Hütchen (oder Schuhe), ohne eins umzuwerfen."},
  {id:"ab_innenseite",emo:"🎯",name:"Pass-Meister",desc:"Triff eine Wand aus 3 m 10× mit der Fuß-Innenseite."},
  {id:"ab_sohle",emo:"↩️",name:"Sohlen-Roller",desc:"Rolle den Ball 10× mit der Sohle vor und zurück."},
  {id:"ab_torschuss",emo:"⚽",name:"Torjäger",desc:"Triff 5× aus 5 m ins (kleine) Tor."},
  {id:"ab_kopfball",emo:"🧠",name:"Kopfball-Held",desc:"Köpfe einen weichen Ball 3× ganz sanft."},
  {id:"ab_ausdauer",emo:"🏃",name:"Ausdauer-Adler",desc:"Spiele oder laufe 10 Minuten am Stück ohne Pause."},
  {id:"ab_trick",emo:"✨",name:"Trick-Meister",desc:"Übe einen Übersteiger und schaff ihn 3× hintereinander."},
  {id:"ab_stoppen",emo:"🛑",name:"Ball-Stopper",desc:"Nimm einen zugeworfenen Ball 5× sauber an und stoppe ihn."}
];
async function abzeichenOpen(spielerId,name,kidsMode){
  document.getElementById("abzeichen-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="abzeichen-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Technik-Abzeichen");
  // kidsMode: über der Kabine (10050) sichtbar und ohne Abhak-Buttons (Kinder tragen nichts selbst ein).
  modal.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:${kidsMode?10060:10001};display:flex;flex-direction:column;padding:14px;overflow-y:auto`;
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:#fff;color:#1a1a2e;max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("abzeichen-modal","🎖️",`Technik-Abzeichen${name?" · "+esc(name):""}`,"","#6d28d9")}
    <div style="font-size:12px;color:#64748b;margin-bottom:12px">${kidsMode?`Das hast du schon geschafft! Neue Abzeichen trägt Mama oder Papa im Eltern-Bereich ein – dann gibt's Adler-Federn ${XP_ICON}.`:`Übt zuhause und beim Spielen. Wenn dein Kind ein Abzeichen schafft, hakst du es ab – es gibt Adler-Federn ${XP_ICON}!`}</div>
    <div id="abzeichen-list" style="display:flex;flex-direction:column;gap:8px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('abzeichen-modal').remove()">Schließen</button>`;
  modal.appendChild(card);document.body.appendChild(modal);
  abzeichenRender(spielerId,kidsMode);
}
async function abzeichenRender(spielerId,kidsMode){
  const box=document.getElementById("abzeichen-list"); if(!box)return;
  let done=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_events_for`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:"abzeichen"})});if(r.ok)done=(await r.json())||[];}catch(e){}
  const doneSet=new Set(done), geschafft=TECHNIK_ABZEICHEN.filter(a=>doneSet.has(a.id)).length;
  box.innerHTML=`<div style="font-size:11px;font-weight:800;color:#b45309;margin-bottom:2px">${geschafft}/${TECHNIK_ABZEICHEN.length} geschafft</div>`+
    TECHNIK_ABZEICHEN.map(a=>{
      const on=doneSet.has(a.id);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border:1.5px solid ${on?"#16a34a":"#e2e8f0"};border-radius:12px;background:${on?"#f0fdf4":"#fff"}">
        <div style="font-size:26px;line-height:1;${on?"":"filter:grayscale(.3);opacity:.85"}">${a.emo}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e">${esc(a.name)}${on?" ✓":""}</div>
          <div style="font-size:11px;color:#64748b;line-height:1.3">${esc(a.desc)}</div>
        </div>
        ${on?`<span style="font-size:11px;font-weight:800;color:#16a34a">✓ geschafft</span>`
             :(kidsMode?`<span style="font-size:11px;font-weight:700;color:var(--text3);white-space:nowrap">noch offen</span>`
             :`<button onclick="abzeichenAward(${spielerId},'${a.id}',this)" style="flex:none;padding:8px 10px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap">Als geschafft eintragen</button>`)}
      </div>`;
    }).join("");
}
async function abzeichenAward(spielerId,badgeId,btn){
  if(btn)btn.disabled=true;
  try{
    const d=await xpAward(spielerId,"abzeichen",badgeId);
    if(d>0){
      toast(`🎖️ Abzeichen geschafft – ${XP_ICON} +${d} ${XP_LABEL}!`);
      try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){}
      if(typeof confetti==="function")confetti(document.getElementById("abzeichen-modal"));
    }else{
      toast("Dieses Abzeichen hat dein Kind schon 👍");
    }
    abzeichenRender(spielerId);
  }catch(e){ toast("Hat nicht geklappt (online & angemeldet?)","err"); if(btn)btn.disabled=false; }
}
