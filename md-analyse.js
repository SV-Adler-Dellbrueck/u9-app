/* ═══════════════════════════════════
   ANALYSE – Meilensteine, Einsatz-Fairness, Formtrend
═══════════════════════════════════ */
// Label-Lookup für alle Bewertungskriterien
function critLabelMap(){
  const map={};
  [...DIMS_FELD,...(typeof DIMS_TW!=="undefined"?DIMS_TW:[])].forEach(d=>{
    (d.tier||[]).forEach(t=>map[t.n]=t.l);
    (d.mx||[]).forEach(m=>map[m.n]=m.l);
  });
  return map;
}
// KI-Light: aus der Bewertungs-Historie automatisch Fortschritte finden (kein Server nötig)
function computeMilestones(){
  const map=critLabelMap();const out=[];
  Object.keys(DB).forEach(name=>{
    const snaps=DB[name];
    if(!snaps||snaps.length<2)return;
    const latest=snaps[snaps.length-1];
    const latestDate=new Date(latest.datum);
    let earlier=snaps[0];
    for(let i=snaps.length-2;i>=0;i--){
      const dd=(latestDate-new Date(snaps[i].datum))/(864e5);
      if(dd>=60){earlier=snaps[i];break;}
    }
    if(earlier===latest)return;
    const vL=safeParse(latest.radios,{}),vE=safeParse(earlier.radios,{});
    Object.keys(vL).forEach(k=>{
      if(vE[k]!=null&&vL[k]!=null&&(vL[k]-vE[k])>=2)out.push({name,label:map[k]||k,from:vE[k],to:vL[k],diff:vL[k]-vE[k]});
    });
    const tD=(latest.total_score||0)-(earlier.total_score||0);
    if(tD>=8)out.push({name,label:"Gesamt-Niveau",from:earlier.total_score,to:latest.total_score,diff:tD,isTotal:true});
  });
  out.sort((a,b)=>b.diff-a.diff);
  return out;
}
function anRenderMeilensteine(){
  const box=document.getElementById("an-meilensteine");if(!box)return;
  const ms=computeMilestones();
  box.innerHTML=ms.length?ms.slice(0,12).map(m=>`<div style="display:flex;gap:8px;align-items:center;background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;border-radius:var(--rl);padding:8px 10px;margin-bottom:6px">
    <span style="font-size:18px">💡</span>
    <div style="font-size:12.5px;color:var(--text)"><strong>${esc(m.name)}</strong>: ${esc(m.label)}${m.isTotal?` +${m.diff}% Niveau`:` von ${m.from} auf ${m.to}`} – heute loben! 🎉</div>
  </div>`).join(""):'<div style="font-size:11px;color:var(--text3)">Noch nicht genug Verlaufsdaten (mind. 2 Bewertungen mit ~2 Monaten Abstand pro Spieler).</div>';
}
async function anLoadServer(){
  const fair=document.getElementById("an-fairness"),form=document.getElementById("an-form");
  if(!fair||!form)return;
  fair.innerHTML='<div style="font-size:11px;color:var(--text3)">Lade...</div>';form.innerHTML="";
  try{
    const r=await fetch(`${SB_URL}/rest/v1/blitz_ratings?select=datum,spieler,kriterien,wertung`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){fair.innerHTML='<div style="font-size:11px;color:var(--text3)">Keine Verbindung</div>';return;}
    const rows=await r.json();
    const gamesByPlayer={},formByPlayer={};
    rows.forEach(b=>{
      if(!gamesByPlayer[b.spieler])gamesByPlayer[b.spieler]=new Set();
      gamesByPlayer[b.spieler].add(b.datum);
      let val=null;
      if(b.kriterien){const vs=Object.values(b.kriterien).filter(x=>typeof x==="number");if(vs.length)val=vs.reduce((a,c)=>a+c,0)/vs.length;}
      else if(b.wertung)val=b.wertung==="top"?3:b.wertung==="solide"?2:1;
      if(val!=null){(formByPlayer[b.spieler]=formByPlayer[b.spieler]||[]).push({datum:b.datum,val});}
    });
    const counts=KADER.map(k=>({name:k.name,n:gamesByPlayer[k.name]?gamesByPlayer[k.name].size:0}));
    /* v474: Math.max(1,…) machte den Leerzustand unerreichbar – ohne ein einziges Blitz-Rating
       standen fuenfzehn Balken mit „0 Spiele" da. Jetzt: ein Satz, eine Aktion. */
    const maxN=Math.max(0,...counts.map(c=>c.n));
    counts.sort((a,b)=>a.n-b.n);
    fair.innerHTML=(maxN===0?`<div class="empty" style="padding:1.2rem 1rem"><i class="ti ti-scale"></i>Noch kein Spiel bewertet – die Verteilung entsteht mit dem Blitz-Rating nach dem Spiel.
        <div style="margin-top:10px"><button class="btn btn-sm" onclick="go('spieltag')"><i class="ti ti-ball-football"></i>Zum Spieltag</button></div></div>`:counts.map(c=>{
      const pct=Math.round(c.n/maxN*100),low=maxN>=2&&c.n<maxN*0.5;
      return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px"><span>${low?"⚠️ ":""}${esc(c.name)}</span><span style="color:var(--text2)">${c.n} Spiele</span></div><div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${low?"#dc2626":"#15803d"};border-radius:4px"></div></div></div>`;
    }).join("")+'<div style="font-size:10px;color:var(--text3);margin-top:4px">⚠️ = deutlich seltener im Einsatz. Auf faire Verteilung achten. Gezählt werden Spieltage mit Blitz-Rating.</div>');
    const formRows=Object.keys(formByPlayer).map(name=>{
      const list=formByPlayer[name].sort((a,b)=>a.datum.localeCompare(b.datum));
      const avg=arr=>arr.length?arr.reduce((s,x)=>s+x.val,0)/arr.length:null;
      const rAvg=avg(list.slice(-3)),oAvg=avg(list.slice(0,-3));
      let arrow='<span style="color:var(--text3)">→</span>';
      if(oAvg!=null&&rAvg!=null)arrow=rAvg>oAvg+0.2?'<span style="color:#15803d">▲</span>':rAvg<oAvg-0.2?'<span style="color:#dc2626">▼</span>':arrow;
      return {name,rAvg:rAvg||0,arrow};
    }).sort((a,b)=>b.rAvg-a.rAvg);
    form.innerHTML=formRows.length?formRows.map(f=>{const st=Math.max(1,Math.min(3,Math.round(f.rAvg)));return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--border)"><span>${esc(f.name)}</span><span>${"★".repeat(st)}<span style="color:var(--border)">${"★".repeat(3-st)}</span> ${f.arrow}</span></div>`;}).join(""):'<div style="font-size:11px;color:var(--text3)">Noch keine Blitz-Bewertungen.</div>';
  }catch(e){fair.innerHTML='<div style="font-size:11px;color:var(--text3)">Offline</div>';}
}
function anInit(){anRenderMeilensteine();anLoadServer();}
// Startup-Hinweis: stärksten Meilenstein einmal pro Sitzung als Banner zeigen
let milestoneHintShown=false;
function showMilestoneHint(){
  if(milestoneHintShown||document.body.classList.contains("quiz-extern"))return;
  const ms=computeMilestones();
  if(!ms.length)return;
  milestoneHintShown=true;
  const m=ms[0];
  const bar=document.createElement("div");
  bar.style.cssText="position:fixed;left:12px;right:12px;bottom:12px;z-index:8000;background:#065f46;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:12.5px;display:flex;align-items:center;gap:10px";
  bar.innerHTML=`<span style="font-size:20px">💡</span><div style="flex:1">Tipp: <strong>${esc(m.name)}</strong> hat sich bei „${esc(m.label)}" stark verbessert – heute loben!</div><button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:8px 10px;cursor:pointer;min-height:44px">OK</button>`;
  document.body.appendChild(bar);
  setTimeout(()=>{if(bar.parentElement)bar.remove();},14000);
}

// Live-Action-Tracker: Co-Trainer tippt während des Spiels 4 Aktionen pro Spieler.
// Macht das Blitz-Rating danach evidenzbasiert.
const AT_ACTIONS=[
  {key:"pass",label:"Guter Pass",col:"#15803d",emo:"🟢"},
  {key:"dribbling",label:"Dribbling",col:"#1a56db",emo:"🔵"},
  {key:"gewinn",label:"Ballgewinn",col:"#ca8a04",emo:"🟡"},
  {key:"verlust",label:"Ballverlust",col:"#dc2626",emo:"🔴"}
];
// Korrektur 3: Der Torwart bekommt eigene, positionsgerechte Rating-Buttons.
const AT_ACTIONS_TW=[
  {key:"parade",label:"Parade",col:"#15803d",emo:"🟢"},
  {key:"aufbau",label:"Aufbau/Abwurf",col:"#1a56db",emo:"🔵"},
  {key:"heraus",label:"Herauslaufen",col:"#ca8a04",emo:"🟡"},
  {key:"fehler",label:"Torwart-Fehler",col:"#dc2626",emo:"🔴"}
];
const AT_EMO={}; [...AT_ACTIONS,...AT_ACTIONS_TW].forEach(a=>AT_EMO[a.key]=a.emo); AT_EMO.tor="⚽"; // Tore werden über tickerGoal erfasst
function atActionsFor(name){ return getKader(name)?.tw ? AT_ACTIONS_TW : AT_ACTIONS; }
let atSel="", atCounts={}, atLog=[], atUid=0; // atCounts[spieler][aktion]=n ; atLog = Undo-Feed

