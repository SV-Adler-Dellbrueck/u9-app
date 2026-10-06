/* ═══════════════════════════════════════════════════════════
   ADLER VIEWS LAYER (Modularisierung 5/8)
   Trainer-Ansichten: Live-Radar, Pills, onChange, DOM-Builder,
   Kader-View+Editor+Kontakte, Profil-View, Saison-Zertifikat,
   Konfetti, Adler-Karte (FUT-Canvas), Verlauf, Nav, Home-Dashboard.
   Laedt nach engine.js, vor dem Haupt-Skript.
   Top-Level: nur 2 Listener-Registrierungen (click-Delegation, WakeLock).
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════
   LIVE RADAR
═══════════════════════════════════ */
let liveChart=null;
let builtDimsTw=null; // welche Layout-Variante (Feld=false / TW=true) aktuell im DOM steht; null = leer
function updateLiveRadar(){
  if(!window.Chart){ensureChart().then(updateLiveRadar).catch(()=>{});return;}
  const v=getV(),dims=currentDims();
  const{dims:ds}=calcScores(v,dims);
  const labels=dims.map(d=>d.label.split(" ")[0]);
  const data=dims.map(d=>ds[d.id]||0);
  const colors=dims.map(d=>d.col);
  const ctx=document.getElementById("live-radar");
  if(!ctx)return;
  if(liveChart){liveChart.data.labels=labels;liveChart.data.datasets[0].data=data;liveChart.update("none");return;}
  liveChart=new Chart(ctx,{type:"radar",data:{labels,datasets:[{label:"Profil",data,backgroundColor:"rgba(26,86,219,.1)",borderColor:"#1a56db",borderWidth:2,pointBackgroundColor:colors,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:100,ticks:{stepSize:25,font:{size:9},backdropColor:"transparent"},pointLabels:{font:{size:10},color:colors},grid:{color:"rgba(100,116,139,.15)"},angleLines:{color:"rgba(100,116,139,.15)"}}}}});
}

function updateRautePreview(rolle,tw){
  ["rp-auf","rp-jaeg","rp-links","rp-rechts","rp-tw"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.className="rpos";el.style.opacity="";}
  });
  // TW always highlighted
  const twEl=document.getElementById("rp-tw");
  if(twEl) twEl.classList.add("hl-tw");
  if(tw){
    document.getElementById("raute-hint").textContent="Torwart (+1) – Feld-Rolle berechnet";
    return;
  }
  if(!rolle)return;
  const pEl=document.getElementById(rolle.posId[rolle.prim]);
  const sEl=document.getElementById(rolle.posId[rolle.sek]);
  if(pEl)pEl.classList.add(rolle.hlCls[rolle.prim]);
  if(sEl&&sEl!==pEl)sEl.classList.add("sek");
  const vorlaeufig=countFilled()<totalCrit()?" (vorläufig)":""; // F2
  document.getElementById("raute-hint").textContent=`Primär: ${rolle.primLabel} · Sek: ${rolle.sekLabel}${vorlaeufig}`;
}

/* ═══════════════════════════════════
   TIER/MX HIGHLIGHTS & PILLS
═══════════════════════════════════ */
function updateTierHL(){
  const dims=currentDims();
  getAllT(dims).forEach(n=>[0,1,2,3,4].forEach(v=>{
    const l=document.getElementById(`tl-${n}-${v}`);
    if(l)l.classList.toggle("sel",!!document.querySelector(`input[name="${n}"][value="${v}"]`)?.checked);
  }));
}
function updateMxHL(){
  const dims=currentDims();
  getAllM(dims).forEach(n=>{
    const tr=document.getElementById(`mxr-${n}`);
    if(tr)tr.classList.toggle("mxsel",gv(n)!=null);
  });
}
function updateDimPills(){
  const dims=currentDims();
  dims.forEach(d=>{
    const tot=d.tier.length+d.mx.length;
    let done=0;
    d.tier.forEach(t=>{if(gv(t.n)!=null)done++;});
    d.mx.forEach(m=>{if(gv(m.n)!=null)done++;});
    const pill=document.getElementById(`dpill-${d.id}`);
    if(pill){pill.textContent=`${done}/${tot}`;pill.className=`dpill${done===tot?" done":""}`;}
  });
}

/* ═══════════════════════════════════
   onChange
═══════════════════════════════════ */
function onChange(){
  const filled=countFilled(),total=totalCrit();
  const pct=total?Math.round(filled/total*100):0;
  document.getElementById("pfill").style.width=pct+"%";
  document.getElementById("plbl").textContent=`${filled} / ${total}`;
  document.getElementById("live-prog").textContent=`${filled} / ${total}`;
  document.getElementById("live-pct").textContent=pct?`${pct}%`:"";
  const bsProg=document.getElementById("bs-prog");
  if(bsProg)bsProg.textContent=`${filled} / ${total}${pct?" · "+pct+"%":""}`;
  updateTierHL();updateMxHL();updateDimPills();updateLiveRadar();
  const tw=isTWPlayer();
  if(!tw&&filled>=12)updateRautePreview(calcRolle(getV(),getMeta().foot,true),false); // F2: neutralMissing für stabile Vorschau
  else if(tw)updateRautePreview(null,true);
  if(filled===total){
    const v=getV(),meta=getMeta();
    const result=meta.tw?generateFazitTW(v,meta):generateFazitFeld(v,meta);
    document.getElementById("fazit-out").value=result.text;
  } else if(filled>0){
    document.getElementById("fazit-out").value=`Analyse läuft... ${filled} von ${total} Kriterien bewertet.\n\nBitte alle Felder ausfüllen.`;
  }
}

/* v474: Bis ein Kind gewaehlt ist, zeigt „Bewerten" nur die Stammdaten und einen Satz.
   Vorher standen Live-Profil (0/0), leeres Radar und Foerderplan-Kasten schon da – drei
   leere Kaesten, die so aussahen, als fehle etwas. Die Umschaltung passiert VOR buildDims,
   damit das Radar nicht in einem unsichtbaren Kasten mit 0 px Breite gezeichnet wird. */
function bewLeerSetzen(hatKind){
  ["bew-live-panel","bew-fbox"].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=hatKind?"":"none";});
  const leer=document.getElementById("bew-leer"); if(leer)leer.style.display=hatKind?"none":"";
}
function onPlayerSelect(){
  const name=document.getElementById("p-name").value;
  bewRundeTrainerZeile();
  if(!name){bewLeerSetzen(false);return;}
  bewLeerSetzen(true);
  const k=getKader(name);
  const tw=k?.tw||false;
  // Nur neu bauen, wenn sich die Layout-Variante (Feld/TW) ändert – sonst nur Werte zurücksetzen.
  if(builtDimsTw!==tw){
    buildDims(tw);
  }else{
    document.querySelectorAll('#dims-wrap input[type="radio"]').forEach(r=>r.checked=false);
    if(wizOn){wizIdx=0;wizRender();}
  }
  /* Stammdaten-Carry-Over-Falle: ohne diesen Block behielten Alter/Fuß/Umfeld/Beteiligung/
     Notiz die Werte des VORHER bewerteten Kindes. Jetzt: letzter Snapshot DIESES Kindes,
     sonst neutrale Defaults. */
  try{
    const last=(typeof DB!=="undefined"&&DB[name]&&DB[name].length)?DB[name][DB[name].length-1]:null;
    const lm=last&&(last.meta||last)||{};
    const setV=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val;};
    setV("p-age",lm.age||"8");
    setV("p-foot",lm.strong_foot||lm.foot||"R");   // v636: gespeichert wird strong_foot, nicht foot
    const seg=(hid,val)=>{const v=String(val||"2");setV(hid,v);document.querySelectorAll(`#${hid}-seg .seg-btn`).forEach(b=>b.classList.toggle("active",b.dataset.val===v));};
    seg("p-eltern",lm.eltern);seg("p-att",lm.attendance||lm.att);   // v636: gespeichert wird attendance
    setV("p-notes","");
  }catch(e){}
  showBewSticky(name);
  updateRautePreview(null,tw);
  document.getElementById("raute-hint").textContent=tw?"Torwart + Feldspieler":"Bewertung ausfüllen";
  onChange();
}
function showBewSticky(name){
  const bar=document.getElementById("bew-sticky");
  const nm=document.getElementById("bs-name");
  if(nm)nm.textContent=(name||"")+(BEW_RUNDE.active?` · Spieler ${BEW_RUNDE.idx+1}/${BEW_RUNDE.queue.length}`:"");
  if(bar)bar.style.display=name?"flex":"none";
  bewLeerSetzen(!!name);
}

/* Bewertungsrunde (Trainermeeting alle 6 Wochen): alle Spieler nacheinander bewerten.
   Startet mit den am längsten nicht bewerteten zuerst; nach dem Speichern rückt der Modus
   automatisch zum nächsten Spieler (Hook in savePlayer). */
let BEW_RUNDE={active:false, queue:[], idx:0};
function bewRundeStart(){
  const players=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false).map(k=>k.name);
  if(!players.length){toast("Kein Kader geladen","err");return;}
  players.sort((a,b)=>{
    const da=(DB[a]&&DB[a].length)?DB[a][DB[a].length-1].datum:"0000";
    const db=(DB[b]&&DB[b].length)?DB[b][DB[b].length-1].datum:"0000";
    return String(da).localeCompare(String(db)); // am längsten nicht bewertet zuerst
  });
  BEW_RUNDE={active:true, queue:players, idx:0};
  toast(`📋 Bewertungsrunde gestartet · ${players.length} Spieler`);
  bewRundeLoad();
}
function bewRundeLoad(){
  if(!BEW_RUNDE.active)return;
  const name=BEW_RUNDE.queue[BEW_RUNDE.idx];
  const sel=document.getElementById("p-name");
  if(sel){ sel.value=name; onPlayerSelect(); }
  bewRundeBarRender();
  try{window.scrollTo({top:0,behavior:"smooth"});}catch(e){try{window.scrollTo(0,0);}catch(_){} }
}
function bewRundeAdvance(){
  if(!BEW_RUNDE.active)return;
  BEW_RUNDE.idx++;
  if(BEW_RUNDE.idx>=BEW_RUNDE.queue.length){ bewRundeFinish(); return; }
  bewRundeLoad();
}
function bewRundeSkip(){ bewRundeAdvance(); }
function bewRundeFinish(){
  const n=BEW_RUNDE.queue.length;
  BEW_RUNDE={active:false, queue:[], idx:0};
  bewRundeBarRender();
  toast(`✅ Bewertungsrunde fertig – ${n} Spieler durch!`);
  try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){}
}
function bewRundeStop(){ if(confirm("Bewertungsrunde beenden?")){ BEW_RUNDE={active:false,queue:[],idx:0}; bewRundeBarRender(); } }
// v637/v648: Wann war die letzte Runde, wann ist die nächste fällig? (Takt acht Wochen, fällig ab 49 Tagen)
function bewRundenZeile(){
  if(typeof bewRundenStand!=="function")return "";
  const st=bewRundenStand(), dd=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const txt=st.faellig?(st.letzte&&st.letzte>=BEW_AB?`⏰ Nächste Runde fällig – die letzte war am ${dd(st.letzte)} (vor ${st.tage} Tagen).`:`⏰ Runde fällig – Bewertungen laufen seit ${dd(BEW_AB)}.`)
    :st.letzte&&st.letzte>=BEW_AB?`Letzte Runde am ${dd(st.letzte)} · nächste fällig ab ${dd(st.faelligAb)}.`
    :`Bewertungen ab ${dd(BEW_AB)} · alle acht Wochen gemeinsam im Trainerteam.`;
  return `<div id="bew-runden-stand" style="width:100%;margin-top:6px;font-size:var(--s-klein);color:var(--text2);text-align:center">${txt}</div>`;
}
/* v648: Einzelbewertung erst ab dem Datum, das das Trainerteam setzt (engine.js BEW_AB).
   Gesperrt: Formular weg, ein Satz mit Grund und Datum, das Datumsfeld mit genau einer
   Hauptaktion. Bisherige Bewertungen bleiben unter Profil und Entwicklung lesbar. */
function bewSperreAnwenden(){
  const v=document.getElementById("view-bew"); if(!v)return;
  if(!document.getElementById("bew-sperre-css")){
    const st=document.createElement("style"); st.id="bew-sperre-css";
    st.textContent="#view-bew.bew-gesperrt>:not(#bew-runde-bar){display:none!important}";
    document.head.appendChild(st);
  }
  const zu=!(typeof bewFreigegeben==="function"&&bewFreigegeben());
  v.classList.toggle("bew-gesperrt",zu);
  if(zu&&BEW_RUNDE.active)BEW_RUNDE={active:false,queue:[],idx:0};
  bewRundeBarRender();
}
function bewAbFeldHtml(){
  return `<label for="bew-ab" style="display:block;font-size:var(--s-klein);font-weight:700;margin:10px 0 4px">Erste Bewertungsrunde ab</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <input id="bew-ab" type="date" value="${BEW_AB||""}" style="min-height:48px;flex:1;min-width:160px;padding:8px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)">
      <button class="btn btn-p" style="min-height:48px" onclick="bewAbSpeichern(this)">Datum speichern</button>
    </div>`;
}
async function bewAbSpeichern(btn){
  const el=document.getElementById("bew-ab"), wert=el&&/^\d{4}-\d{2}-\d{2}$/.test(el.value)?el.value:null;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_einstellungen?on_conflict=id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,bewertung_ab:wert})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Datum nicht gespeichert – nur Trainer dürfen es setzen","err");return;}
    BEW_AB=wert; bewSperreAnwenden();
    toast(wert?`Datum gespeichert – Bewertungen ab ${bewAbText()}`:"Datum gespeichert – Bewertungen bleiben gesperrt");
  }catch(e){toast("Netzwerkfehler – Datum nicht gespeichert","err");}
  finally{if(btn)btn.disabled=false;}
}
function bewRundeBarRender(){
  const bar=document.getElementById("bew-runde-bar"); if(!bar)return;
  if(typeof bewFreigegeben==="function"&&!bewFreigegeben()){
    const satz=BEW_AB?`Einzelne Spieler werden bis zum Ende der Hinrunde nicht bewertet. Ab ${bewAbText()} bewertet das ganze Trainerteam jeden Spieler, danach alle acht Wochen.`
      :"Einzelne Spieler werden bis zum Ende der Hinrunde nicht bewertet. Sobald das Trainerteam das Datum festlegt, bewertet es ab dann jeden Spieler, danach alle acht Wochen.";
    bar.innerHTML=`<div id="bew-sperre" style="width:100%;padding:14px;border:1.5px solid var(--rand-bedien);border-radius:12px;background:var(--surface)">
      <div style="font-size:var(--s-karte);font-weight:800;margin-bottom:4px">🔒 Bewerten ist noch gesperrt</div>
      <div style="font-size:var(--s-text);color:var(--text2)">${satz} Bisherige Bewertungen stehen weiter unter Profil und Entwicklung.</div>
      ${bewAbFeldHtml()}</div>`;
    return;
  }
  if(!BEW_RUNDE.active){
    bar.innerHTML=`<button onclick="bewRundeStart()" style="width:100%;min-height:48px;border:none;border-radius:12px;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.28)"><i class="ti ti-clipboard-list"></i> Bewertungsrunde starten (alle nacheinander)</button>${bewRundenZeile()}
      <details style="width:100%;margin-top:4px;font-size:var(--s-klein)"><summary style="cursor:pointer;color:var(--text2)">Startdatum der Bewertungsrunden ändern</summary>${bewAbFeldHtml()}</details>
      <div id="bew-runde-trainer" style="width:100%;font-size:var(--s-klein);color:var(--text2);text-align:center"></div>`;
    bewRundeTrainerZeile();
    return;
  }
  const pos=BEW_RUNDE.idx+1, tot=BEW_RUNDE.queue.length, name=BEW_RUNDE.queue[BEW_RUNDE.idx];
  bar.innerHTML=`<div style="flex:1;min-width:150px;font-size:var(--s-text);font-weight:800;color:var(--club-accent)">📋 Runde · Spieler ${pos}/${tot}: ${esc(name)}</div>
    <button class="btn btn-sm" onclick="bewRundeSkip()">Überspringen ›</button>
    <button class="btn btn-sm" onclick="bewRundeStop()" style="color:var(--red)">Beenden</button>
    <div id="bew-runde-trainer" style="width:100%;font-size:var(--s-klein);color:var(--text2)"></div>`;
  bewRundeTrainerZeile();
}
/* v648: Die Runde gehört dem ganzen Trainerteam. Über dem Formular steht, wer das gewählte
   Kind in dieser Runde (letzte 21 Tage, frühestens ab dem Startdatum) schon bewertet hat. */
function bewRundeTrainerVon(name){
  if(!name||!BEW_AB||typeof DB==="undefined"||!DB[name])return [];
  const grenze=new Date(Date.now()-BEW_RUNDE_FENSTER_TAGE*864e5).toISOString().slice(0,10);
  const ab=grenze>BEW_AB?grenze:BEW_AB, t=new Set();
  DB[name].forEach(s=>{if(s&&String(s.datum||"").slice(0,10)>=ab&&s.trainer)t.add(String(s.trainer));});
  return [...t];
}
function bewRundeTrainerZeile(){
  const el=document.getElementById("bew-runde-trainer"); if(!el)return;
  const name=(document.getElementById("p-name")||{}).value||"";
  if(!name){el.textContent="";return;}
  const t=bewRundeTrainerVon(name);
  el.textContent=t.length?`In dieser Runde schon bewertet von: ${t.join(", ")}`:"In dieser Runde noch von niemandem bewertet.";
  bewEinsatzZeile(el,name);
}
/* v677 PO 29.09.: „… würde es natürlich helfen, wenn man auch dafür eine Übersicht bekommt, wie der
   Trainingseinsatz des einzelnen Kindes im Laufe der letzten Monate war.“ Die schnellen Sterne nach
   jedem Training (ruhig · gut · stark, AW_DATA[datum][name].qual) je Monat: Durchschnitt, wie oft
   bewertet, wie oft da. Nur hier im Trainerbereich, nie für Eltern oder Kinder. */
function bewEinsatzMonate(name,monate){
  const heute=isoLokal();   // v707: Ortszeit
  const ab=new Date(); ab.setMonth(ab.getMonth()-(monate||6)+1); ab.setDate(1);
  const abTag=isoLokal(ab);
  const tage=(typeof awZaehltage==="function"?awZaehltage():Object.keys(typeof AW_DATA!=="undefined"?AW_DATA:{})).filter(d=>d>=abTag&&d<=heute);
  const m={};
  tage.forEach(d=>{
    const k=d.slice(0,7), e=(AW_DATA[d]||{})[name]||{};
    const x=m[k]=m[k]||{monat:k,trainings:0,da:0,summe:0,bewertet:0};
    x.trainings++;
    if(e.da){ x.da++; if(e.qual>0){ x.summe+=e.qual; x.bewertet++; } }
  });
  return Object.values(m).sort((a,b)=>a.monat.localeCompare(b.monat))
    .map(x=>({...x,schnitt:x.bewertet?Math.round(x.summe/x.bewertet*10)/10:null}));
}
function bewEinsatzZeile(anker,name){
  let box=document.getElementById("bew-einsatz");
  if(!box){ box=document.createElement("div"); box.id="bew-einsatz"; box.style.cssText="width:100%;margin-top:6px;font-size:var(--s-klein);color:var(--text2);text-align:center"; }
  if(anker&&box.previousElementSibling!==anker)anker.insertAdjacentElement("afterend",box);
  if(!name){ box.innerHTML=""; return; }
  const zeilen=bewEinsatzMonate(name,6);
  if(!zeilen.length){ box.innerHTML=`🏃 Trainingseinsatz: in den letzten Monaten kein Training erfasst.`; return; }
  const mon=k=>new Date(k+"-01T00:00:00").toLocaleDateString("de-DE",{month:"short"});
  box.innerHTML=`<b style="color:var(--text)">🏃 Trainingseinsatz</b> · ${zeilen.map(x=>
    `<span class="bew-einsatz-monat" style="white-space:nowrap">${esc(mon(x.monat))} ${x.schnitt!=null?"★"+String(x.schnitt).replace(".",",")+` (${x.bewertet}×)`:"ohne Sterne"} · da ${x.da}/${x.trainings}</span>`).join(" &nbsp;|&nbsp; ")}`;
}

/* ═══════════════════════════════════
   DOM BUILDER
═══════════════════════════════════ */
function buildDims(isTw){
  if(!window.Chart){ensureChart().then(()=>buildDims(isTw)).catch(()=>{});return;}
  const dims=isTw?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
  const wrap=document.getElementById("dims-wrap");
  wrap.innerHTML="";
  builtDimsTw=isTw;
  dims.forEach(d=>{
    const block=document.createElement("div");
    block.className="dim-block";
    const tot=d.tier.length+d.mx.length;
    const isTWDim=d.id.startsWith("tw_");
    block.innerHTML=`
      <div class="dim-head" role="button" tabindex="0" onclick="toggleDim(this)">
        <div class="dim-iw" style="background:${d.col}22"><i class="ti ${d.icon}" style="font-size:var(--s-karte);color:${d.col}"></i></div>
        <div style="flex:1">
          <div class="dim-ht">${isTWDim?"🥅 ":""}${d.label}</div>
          <div class="dim-hs">${d.tier.length} Beobachtungen · ${d.mx.length} Detailwerte · ${Math.round(d.w*100)}% Gewichtung</div>
        </div>
        <span class="dpill" id="dpill-${d.id}">0/${tot}</span>
        <i class="ti ti-chevron-down dchev"></i>
      </div>
      <div class="dim-body" id="dbody-${d.id}"></div>`;
    wrap.appendChild(block);
    const body=document.getElementById(`dbody-${d.id}`);
    const tt=document.createElement("table");tt.className="tier-t";
    tt.innerHTML=`<thead><tr><th>Beobachtung</th><th>Ansatz</th><th>Solide</th><th>Gut</th><th>Stark</th><th>Nicht gesehen</th></tr></thead>`;
    const tb=document.createElement("tbody");
    d.tier.forEach(t=>{
      const tr=document.createElement("tr");
      let h=`<td class="cn">${t.l}<small>${t.h}</small></td>`;
      t.opts.forEach(o=>{
        const bc=o.v===1?"lb1":o.v===2?"lb2":o.v===3?"lb3":"lb4";
        h+=`<td><div class="topt"><label id="tl-${t.n}-${o.v}"><input type="radio" name="${t.n}" value="${o.v}" onchange="onChange()"><span class="lb ${bc}">${["","Ansatz","Solide","Gut","Stark"][o.v]}</span><span><span class="ltitle">${o.t}</span><span class="ldesc">${o.d}</span></span></label></div></td>`;
      });
      /* v637: „Nicht gesehen“ (Wert 0) – wer ein Kriterium nicht beobachtet hat, muss keinen Wert
         raten. 0 zählt weder als Ansatz noch in einen Schnitt, nicht als Stärke, nicht als Entwicklungsfeld. */
      h+=`<td><div class="topt"><label id="tl-${t.n}-0"><input type="radio" name="${t.n}" value="0" onchange="onChange()"><span class="lb lb0">Nicht gesehen</span><span><span class="ldesc">zählt nicht mit</span></span></label></div></td>`;
      tr.innerHTML=h;tb.appendChild(tr);
    });
    tt.appendChild(tb);body.appendChild(tt);
    if(d.mx.length){ // Detail-Matrix nur rendern, wenn die Dimension welche hat (v2: leer)
    const sep=document.createElement("div");
    sep.style.cssText="font-size:var(--s-text);font-weight:800;color:var(--text);padding:6px 0 4px;margin-top:4px";
    sep.textContent="Detail-Bewertung (1–5)";
    body.appendChild(sep);
    const mx=document.createElement("table");mx.className="mx-t";
    mx.innerHTML=`<thead><tr><th>Kriterium</th><th>1<br><span style="font-weight:400;font-size:var(--s-klein)">Noch nicht</span></th><th>2<br><span style="font-weight:400;font-size:var(--s-klein)">Ansatz</span></th><th>3<br><span style="font-weight:400;font-size:var(--s-klein)">Solide</span></th><th>4<br><span style="font-weight:400;font-size:var(--s-klein)">Gut</span></th><th>5<br><span style="font-weight:400;font-size:var(--s-klein)">Stark</span></th></tr></thead>`;
    const mb=document.createElement("tbody");
    d.mx.forEach(m=>{
      const tr=document.createElement("tr");tr.id=`mxr-${m.n}`;
      let h=`<td class="mc">${m.l}<small>${m.h}</small></td>`;
      const MX_STUFE=["","Noch nicht","Ansatz","Solide","Gut","Stark"];
      for(let i=1;i<=5;i++)h+=`<td><input type="radio" class="mxr" name="${m.n}" value="${i}" aria-label="${esc(m.l)}: ${MX_STUFE[i]}" onchange="onChange()"></td>`;
      tr.innerHTML=h;mb.appendChild(tr);
    });
    mx.appendChild(mb);// wrap mx for mobile scroll
    const mxWrap=document.createElement("div");
    mxWrap.className="mx-wrap";
    const mxHint=document.createElement("div");
    mxHint.className="mx-scroll-hint";
    mxHint.innerHTML='<i class="ti ti-arrows-left-right" style="font-size:var(--s-text)"></i>Seitwärts scrollen für alle Spalten';
    body.appendChild(mxHint);
    mxWrap.appendChild(mx);
    body.appendChild(mxWrap);
    } // /if d.mx.length
  });
  if(liveChart){liveChart.destroy();liveChart=null;}
  setTimeout(()=>{
    const emptyData=dims.map(()=>0);
    const labels=dims.map(d=>d.label.split(" ")[0]);
    const colors=dims.map(d=>d.col);
    const ctx=document.getElementById("live-radar");if(!ctx)return;
    if(liveChart)return; // B5: paralleler buildDims-Timeout hat schon einen Chart erstellt
    const existing=Chart.getChart(ctx);
    if(existing)existing.destroy();
    liveChart=new Chart(ctx,{type:"radar",data:{labels,datasets:[{label:"Profil",data:emptyData,backgroundColor:"rgba(26,86,219,.1)",borderColor:"#1a56db",borderWidth:2,pointBackgroundColor:colors,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:100,ticks:{stepSize:25,font:{size:9},backdropColor:"transparent"},pointLabels:{font:{size:10},color:colors},grid:{color:"rgba(100,116,139,.15)"},angleLines:{color:"rgba(100,116,139,.15)"}}}}});
  },80);
  if(wizOn){wizIdx=0;wizRender();} // Fokus-Modus nach Neuaufbau (Spielerwechsel) neu ausrichten
}

/* Quick-Rate Fokus-Modus: eine Dimension pro Screen. Reine Sichtebene über dasselbe
   Formular – die Radio-Buttons bleiben im DOM, daher Speichern/Fortschritt unverändert. */
let wizIdx=0, wizOn=(localStorage.getItem("adler_bew_fokus")==="1"); // Fokus-Modus bleibt an, einmal gewählt
function wizToggle(){
  const blocks=document.querySelectorAll("#dims-wrap .dim-block");
  if(!blocks.length){toast("Erst einen Spieler wählen","err");return;}
  wizOn=!wizOn;
  try{localStorage.setItem("adler_bew_fokus",wizOn?"1":"0");}catch(e){}
  const wrap=document.getElementById("dims-wrap");
  const nav=document.getElementById("wiz-nav");
  const btn=document.getElementById("wiz-toggle");
  if(wizOn){
    wrap.classList.add("wiz-active");
    nav.style.display="block";
    btn.innerHTML='<i class="ti ti-list"></i>Alle anzeigen';
    wizIdx=0;wizRender();
  }else{
    wrap.classList.remove("wiz-active");
    nav.style.display="none";
    btn.innerHTML='<i class="ti ti-cards"></i>Fokus-Modus';
    wrap.querySelectorAll(".dim-block").forEach(b=>b.classList.remove("wiz-current"));
  }
}
function wizGo(delta){
  const blocks=document.querySelectorAll("#dims-wrap .dim-block");
  wizIdx=Math.max(0,Math.min(blocks.length-1,wizIdx+delta));
  wizRender();
  document.getElementById("wiz-nav").scrollIntoView({behavior:"smooth",block:"start"});
}
function wizRender(){
  const blocks=[...document.querySelectorAll("#dims-wrap .dim-block")];
  if(!blocks.length)return;
  if(wizIdx>=blocks.length)wizIdx=blocks.length-1;
  blocks.forEach((b,i)=>{
    b.classList.toggle("wiz-current",i===wizIdx);
    if(i===wizIdx){const body=b.querySelector(".dim-body");if(body)body.classList.remove("coll");}
  });
  const cur=blocks[wizIdx];
  const label=cur.querySelector(".dim-ht")?.textContent||("Dimension "+(wizIdx+1));
  const dots=blocks.map((b,i)=>`<span style="width:9px;height:9px;border-radius:50%;background:${i===wizIdx?'var(--blue)':'var(--border)'};display:inline-block"></span>`).join(" ");
  const letzte=wizIdx===blocks.length-1;
  const nav=document.getElementById("wiz-nav");
  nav.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--surface);border:var(--border-s);border-radius:var(--r);margin-bottom:8px;position:sticky;top:0;z-index:15">
      <button class="btn btn-sm" style="min-width:44px;min-height:44px${wizIdx===0?';opacity:.4':''}" onclick="wizGo(-1)"><i class="ti ti-chevron-left"></i></button>
      <div style="text-align:center;flex:1">
        <div style="font-size:var(--s-text);font-weight:700;color:var(--text)">${label} · ${wizIdx+1}/${blocks.length}</div>
        <div style="margin-top:4px;display:flex;gap:5px;justify-content:center">${dots}</div>
      </div>
      <button class="btn ${letzte?'btn-p':''} btn-sm" style="min-width:44px;min-height:44px" onclick="${letzte?"document.querySelector('button[onclick=\\\"savePlayer()\\\"]').scrollIntoView({behavior:'smooth'})":"wizGo(1)"}">${letzte?'<i class="ti ti-check"></i>':'<i class="ti ti-chevron-right"></i>'}</button>
    </div>`;
}

function toggleDim(head){
  const body=head.nextElementSibling;
  const icon=head.querySelector(".dchev");
  body.classList.toggle("coll");
  icon.style.transform=body.classList.contains("coll")?"rotate(-90deg)":"";
}


/* ═══════════════════════════════════
   KADER VIEW
═══════════════════════════════════ */
let activeFilter="all";
function setF(f,btn){
  activeFilter=f;
  document.querySelectorAll(".ftag").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");renderKader();
}

// B6: Delegierter Listener statt Inline-Handler mit interpolierten Daten (XSS-Schutz)
document.addEventListener("click",e=>{
  const editBtn=e.target.closest("[data-edit-player]");
  if(editBtn){const n=editBtn.dataset.name,idx=parseInt(editBtn.dataset.snapIdx);const snap=DB[n]&&DB[n][idx];if(snap)loadPlayerToForm(snap);return;}
  const delBtn=e.target.closest("[data-del-player]");
  if(delBtn){delPlayer(delBtn.dataset.name);return;}
  const delSnapBtn=e.target.closest("[data-del-snap]");
  if(delSnapBtn){delSnapshot(delSnapBtn.dataset.name,delSnapBtn.dataset.datum,delSnapBtn.dataset.id);return;}
});

/* ═══════════════════════════════════
   KADER aus Supabase (nur Trainer). Mutiert das bestehende KADER-Array in-place,
   damit die const-Bindung + alle getKader()/KADER.map()-Aufrufe unveraendert bleiben.
   Anon-Modi (Eltern/Delegate/Quiz) rufen loadKader NIE auf und sehen nie geb/medical.
═══════════════════════════════════ */
/* Globaler Kader – leer bis loadKader() ihn aus der Datenbank fuellt. `var`, damit die
   Bindung an window haengt (Pruefwerkzeug setzt window.KADER); Welle 1, damit kein
   Welle-1-Code je ueber „KADER is not defined" stolpert. */
var KADER=[];

/* ── Kinder am Speicherrand: ID in der Datenbank, Name im Speicher ─────────────
   Bis v450 standen Kinder in sechs jsonb-Spalten (Anwesenheit, Nominierungen,
   Trainingsgruppen, Buddy-Listen, Live-Training, Trainingsturnier) mit ihrem NAMEN
   als Schluessel. Ein umbenanntes Kind verlor damit still seine Historie. Jetzt
   traegt die Datenbank die kader.id; im Speicher rechnet die App weiter mit Namen,
   umgesetzt wird nur beim Laden und Speichern. Beide Richtungen lassen Unbekanntes
   unangetastet: alte Zeilen mit Namen laden weiter, Sonderschluessel (_trainers,
   _ovr, _anzahl, _trainer) und Trainer-Marken („🧢 Name") bleiben Text. */
/* v510 – PO: „Im Taktikboard sind zwei Kinder noch drin, die nicht mehr dabei sind."
   Der Kader kennt seit v482 ein `aktiv`-Kennzeichen; elf Stellen fragen `k.aktiv!==false`,
   die Namenslisten fragten es nicht – sie schrieben `KADER.map(k=>k.name)`. Damit stand ein
   stillgelegtes Kind weiter auf dem Board, in der Bank, im Blitz-Vollbild und in der fairen
   Verteilung. Ab hier holt sich jede Namensliste den Kader über diese beiden Funktionen. */
function kaderAktiv(){ return (typeof KADER==="undefined"?[]:KADER).filter(k=>k.aktiv!==false); }
function kaderNamen(){ return kaderAktiv().map(k=>k.name); }
function kidId(name){ const k=KADER.find(x=>x.name===name); return k?(k._id!=null?k._id:(k.id!=null?k.id:null)):null; }
function kidName(id){ const n=Number(id); const k=KADER.find(x=>(x._id!=null?x._id:x.id)===n); return k?k.name:null; }
function kidKeyToName(key){
  const s=String(key);
  if(s.charAt(0)==="_")return s;
  if(/^\d+$/.test(s))return kidName(s)||("#"+s);   // unbekannte ID bleibt sichtbar, aber harmlos
  return s;
}
function kidNameToKey(name){
  const s=String(name);
  if(s.charAt(0)==="_")return s;
  const m=s.match(/^#(\d+)$/); if(m)return m[1];
  const id=kidId(s); return id!=null?String(id):s;     // unbekannter Name bleibt Name
}
function kidMapFromIds(obj){ if(!obj||typeof obj!=="object"||Array.isArray(obj))return obj; const out={}; Object.keys(obj).forEach(k=>{out[kidKeyToName(k)]=obj[k];}); return out; }
function kidMapToIds(obj){ if(!obj||typeof obj!=="object"||Array.isArray(obj))return obj; const out={}; Object.keys(obj).forEach(k=>{out[kidNameToKey(k)]=obj[k];}); return out; }
function kidListFromIds(arr){ if(!Array.isArray(arr))return arr; return arr.map(x=>(typeof x==="number"||/^\d+$/.test(String(x)))?(kidName(x)||("#"+x)):x); }
function kidListToIds(arr){ if(!Array.isArray(arr))return arr; return arr.map(x=>{ if(typeof x!=="string")return x; const m=x.match(/^#(\d+)$/); if(m)return Number(m[1]); const id=kidId(x); return id!=null?id:x; }); }
/* v625 PO (Bildschirmfoto Einladungskarten: „Alle oder keine lässt sich nicht anklicken“):
   loadKader legt die Datenbank-Kennung als `_id` ab, nicht als `id`. Drei Fenster fragten `k.id`
   und sahen deshalb kein Kind – Einladungskarten („Kein Kader geladen.“), Notfall-Karten (ohne
   Namen) und Adler-Welt (Federn, Abzeichen). Eine Stelle für beide Schreibweisen. */
function kaderId(k){ return k?(k._id!=null?k._id:(k.id!=null?k.id:null)):null; }
async function loadKader(){
  try{
    /* v482 – PO: „Die Anwesenheit der Kinder ist wieder weg." Nach einer Nacht ist der
       Zugangs-Token abgelaufen; sbToken() stoesst die Erneuerung an und gibt null zurueck,
       dieser Abruf lief dann mit dem anonymen Schluessel – die RLS gab null Zeilen, ohne
       Fehler. Der Kader blieb leer, bis jemand die App neu lud. Jetzt: erst die laufende
       Erneuerung abwarten, dann laden. */
    if(typeof sbToken==="function"&&!sbToken()&&typeof sbRefreshing!=="undefined"&&sbRefreshing){ try{await sbRefreshing;}catch(e){} }
    const r=await fetch(`${SB_URL}/rest/v1/kader?select=*&order=sort_order.asc,name.asc`,{headers:sbAuthHeaders()});
    // Bewusst KEIN sbCheck401: laeuft auch im Eltern-/Delegate-Modus (Top-Level-Init).
    // Ohne Trainer-Token liefert die RLS 401 -> KADER bleibt leer.
    if(!r.ok)return;
    const rows=await r.json();
    if(rows.length){
      KADER.splice(0,KADER.length,...rows.map(x=>{
        /* `aktiv` fehlte hier. Damit war k.aktiv ueberall undefined und die elf
           Filter der Form `k.aktiv!==false` liessen JEDES Kind durch – ein aus dem
           Betrieb genommenes Kind stand weiter in Anwesenheit, Nominierung, Teams
           und Blitzturnier. Der Kader-Editor schickt `aktiv` nicht mit; bei einem
           PostgREST-Upsert bleiben nicht mitgeschickte Spalten unangetastet. */
        const o={name:x.name,tw:!!x.tw,twPrio:x.tw_prio||0,_id:x.id,sort_order:x.sort_order,aktiv:x.aktiv!==false};
        if(x.nr!=null)o.nr=x.nr;
        if(x.geb)o.geb=x.geb;
        if(x.medical)o.medical=x.medical;
        if(x.starker_fuss)o.starker_fuss=x.starker_fuss;
        if(x.lieblingsposition)o.lieblingsposition=x.lieblingsposition;
        if(x.foto_path)o.foto_path=x.foto_path;
        o.foto_stadionheft_ok=!!x.foto_stadionheft_ok; // HOTFIX 19 digital: Foto-Freigabe fürs Eltern-Heft
        if(x.staerken_manuell)o.staerken_manuell=x.staerken_manuell; // v757: Stärken, vom Trainerteam gewählt
        if(x.alias)o.alias=x.alias; // v679: fester Buchstabe fürs Tagebuch (kader.alias, einmal vergeben)
        return o;
      }));
    }
  }catch(e){}
}
/* Ein Kind verlaesst den Verein: bis v448 gab es dafuer NUR den Papierkorb – also
   hartes Loeschen samt Punkten und Freigaben, und der Name blieb trotzdem in
   Anwesenheit, Nominierung und Trainingsgruppen stehen (bis v451 hielten die Namen
   als Text, seither die kader.id). Der Saisonstart-Check forderte derweil „Abgaenge deaktivieren“
   – fuer etwas, das keinen Schalter hatte. Hier ist er. */
function kaderAktivToggle(cb){
  const row=cb&&cb.closest(".kader-edit-row"); if(!row)return;
  row.style.opacity=cb.checked?"":"0.62";
  const hin=row.querySelector(".ke-raus-hinweis");
  if(hin)hin.style.display=cb.checked?"none":"";
  if(typeof kaderKopfFrisch==="function")kaderKopfFrisch(cb);
}
// Kader-Verwaltung: Modal mit editierbaren Zeilen (name/nr/tw/twPrio/geb/medical/aktiv).
/* v546 – Der Kader-Editor als ruhige Liste.

   Fünfzehn Kinder mal zwölf Bedienelemente standen gleichzeitig auf einem Bildschirm:
   rund hundertachtzig Felder, alle gleich laut, alle gleich wichtig. Gesucht wird darin
   aber immer genau ein Kind — und zwar zum Ändern einer einzigen Kleinigkeit.

   Deshalb zeigt jede Zeile nur noch Nummer, Name und Zustand; die Felder klappen erst
   auf Tipp auf, und immer nur eine Zeile zugleich.

   Gespeichert wird weiter ALLES auf einmal. Die zugeklappten Felder stehen im Dokument,
   nur nicht im Weg. Ein Umbau auf einzelnes Speichern hätte die Reihenfolge (sort_order)
   und die Behandlung doppelter Nummern mit angefasst — an beidem war nichts falsch. */
function _keChips(k){
  const chip=(txt,farbe,bg)=>`<span style="font-size:var(--s-klein);font-weight:700;padding:2px 7px;border-radius:999px;border:1px solid ${farbe};color:${farbe};background:${bg};white-space:nowrap">${txt}</span>`;
  const c=[];
  if(k.aktiv===false)c.push(chip("nicht im Kader","var(--amber)","transparent"));
  if(k.tw)c.push(chip("🥅 TW","var(--text2)","transparent"));
  if(k.foto_stadionheft_ok)c.push(chip("📰 Foto frei","var(--green)","transparent"));
  if(k.medical)c.push(chip("⚕️ Hinweis","var(--red)","transparent"));
  // v679 (Nachtrag 28.09., Abschnitt 3): der feste Buchstabe, mit dem jeder Tagebuch-Export dieses Kind nennt
  if(k.alias)c.push(`<span title="So heißt das Kind in jedem Tagebuch-Export" style="font-size:var(--s-klein);color:var(--text2);white-space:nowrap">Kind ${esc(k.alias)}</span>`);
  return c.join(" ");
}
function kaderEditRow(k,i){
  const drin=k.aktiv!==false;
  const neu=!k._id&&!k.name;                 // frisch angelegte Zeile: gleich offen
  const kopf=`<button type="button" class="ke-kopf" onclick="${k._id?`kinderProfilOpen(${Number(k._id)})`:"kaderZeileAuf(this)"}" aria-expanded="${neu}"
      style="width:100%;min-height:56px;display:flex;align-items:center;gap:10px;padding:8px 10px;border:none;border-radius:var(--r);background:transparent;color:var(--text);font-family:inherit;text-align:left;cursor:pointer">
      <span class="ke-kopf-nr" style="min-width:34px;font-size:var(--s-text);font-weight:800;color:var(--text3)">${k.nr!=null?"#"+k.nr:"—"}</span>
      <span style="flex:1;min-width:0">
        <span class="ke-kopf-name" style="display:block;font-size:var(--s-karte);font-weight:700">${esc(k.name||"Neuer Spieler")}</span>
        <span class="ke-kopf-chips" style="display:block;margin-top:2px">${_keChips(k)}</span>
      </span>
      <span class="ke-pfeil" aria-hidden="true" style="font-size:var(--s-karte);color:var(--text3);transition:transform .15s${neu?";transform:rotate(90deg)":""}">›</span>
    </button>`;
  return `<div class="kader-edit-row" data-id="${k._id||''}" data-name="${esc(k.name||'')}" style="border:var(--border-s);border-radius:var(--r);margin-bottom:8px${drin?"":";opacity:0.62"}">
    ${kopf}
    <div class="ke-felder" style="padding:0 8px 8px${neu?"":";display:none"}">
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input class="ke-name" value="${esc(k.name||'')}" placeholder="Name" oninput="kaderKopfFrisch(this)" style="flex:1;min-width:80px;min-height:44px;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;background:var(--surface);color:var(--text)">
      <input class="ke-nr" type="number" value="${k.nr!=null?k.nr:''}" placeholder="Nr" oninput="kaderKopfFrisch(this)" style="width:64px;min-height:44px;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;background:var(--surface);color:var(--text)">
    </div>
    <div class="ke-raus-hinweis" style="font-size:var(--s-klein);color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:5px 8px;margin-bottom:6px;line-height:1.4${drin?";display:none":""}">Nicht mehr im Kader – taucht in Anwesenheit, Nominierung, Aufstellung und Turnier nicht mehr auf. Alles Bisherige bleibt gespeichert.</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
      <label style="font-size:var(--s-text);display:flex;align-items:center;gap:4px;min-height:44px" title="Häkchen weg = nicht mehr im Kader. Verschwindet aus Anwesenheit, Nominierung, Aufstellung und Turnier – die Historie bleibt erhalten."><input class="ke-aktiv" type="checkbox" ${drin?"checked":""} onchange="kaderAktivToggle(this)">👥 Im Kader</label>
      <label style="font-size:var(--s-text);display:flex;align-items:center;gap:4px;min-height:44px"><input class="ke-tw" type="checkbox" ${k.tw?"checked":""} onchange="kaderKopfFrisch(this)">🥅 TW</label>
      <select class="ke-prio" style="min-height:44px;padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)">
        <option value="0"${(k.twPrio||0)===0?" selected":""}>kein TW</option>
        <option value="1"${k.twPrio===1?" selected":""}>TW primär</option>
        <option value="2"${k.twPrio===2?" selected":""}>TW Option</option>
      </select>
      <input class="ke-geb" type="date" value="${esc(k.geb||'')}" title="Geburtstag" aria-label="Geburtstag" style="min-height:44px;padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)">
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
      <select class="ke-fuss" title="Starker Fuß" aria-label="Starker Fuß" style="min-height:44px;padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)">
        <option value=""${!k.starker_fuss?" selected":""}>Fuß?</option>
        <option value="R"${k.starker_fuss==="R"?" selected":""}>Rechts</option>
        <option value="L"${k.starker_fuss==="L"?" selected":""}>Links</option>
        <option value="B"${k.starker_fuss==="B"?" selected":""}>Beidfüßig</option>
      </select>
      <input class="ke-pos" value="${esc(k.lieblingsposition||'')}" placeholder="Lieblingsposition" style="flex:1;min-width:90px;min-height:44px;padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)">
    </div>
    <!-- v544: Die Trikotgröße stand hier nur in v543. Sie ist mit dem zweiten
         Kleidungsstück zu einer Ausgabe geworden (Trikotsatz, Anzug, Jacke haben je
         eigene Größen) und lebt jetzt in „Ausstattung" unter Team – eine Stelle, an
         der auch Datum und Rückgabe stehen. Nicht wieder hier einbauen. -->
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-size:var(--s-klein);color:var(--text2)">Foto (Karte):</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" onchange="kaderRowFoto(this)" aria-label="Foto für die Karte" style="font-size:var(--s-klein);flex:1">
      ${k.foto_path?'<span style="font-size:var(--s-klein);color:var(--green)">✓ vorhanden</span>':''}
    </div>
    <label style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;font-size:var(--s-klein);color:var(--text2)" title="Nur mit ausdrücklicher Eltern-Zustimmung. Ohne Häkchen erscheinen überall nur die Initialen.">
      <input class="ke-fotook" type="checkbox" ${k.foto_stadionheft_ok?"checked":""} onchange="kaderKopfFrisch(this)" style="margin-top:1px">
      <span>📰 Foto freigegeben für <b>„Adler Nest" &amp; Team-Galerie</b> <span style="color:var(--text3)">(Eltern-Einwilligung eingeholt)</span></span>
    </label>
    <input class="ke-medical" value="${esc(k.medical||'')}" placeholder="Medical-Hinweis (z. B. Asthma, Allergie…)" oninput="kaderKopfFrisch(this)" style="width:100%;min-height:44px;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)">
    ${k._id?`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px">
      <button type="button" class="btn btn-sm" onclick="kontakteEditOpen(${k._id})" title="Kontakte, Eltern-Login und der persönliche Zu-/Absage-Link" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:var(--s-klein);line-height:1.2"><i class="ti ti-address-book" style="font-size:var(--s-teil)"></i>Kontakte</button>
      <button type="button" class="btn btn-sm" onclick="zieleOpen(${k._id})" title="Entwicklungs-Ziele setzen & verfolgen" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:var(--s-klein);line-height:1.2"><i class="ti ti-target" style="font-size:var(--s-teil)"></i>Ziele</button>
      ${WRAPPED_SICHTBAR?`<button type="button" class="btn btn-sm" onclick="childWrappedShare(${k._id})" title="Persönliche Saison-Rückblick-Karte zum Teilen mit der Familie" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:var(--s-klein);line-height:1.2"><i class="ti ti-movie" style="font-size:var(--s-teil)"></i>Saison</button>`:""}
      <button type="button" class="btn btn-sm" onclick="lobRecordOpen(${k._id},'${(k.name||'').replace(/'/g,'')}')" title="Kurzes Sprachlob aufnehmen – das Kind hört es in der Kabine" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:var(--s-klein);line-height:1.2;grid-column:1/-1"><i class="ti ti-microphone" style="font-size:var(--s-teil)"></i>🎤 Sprachlob aufnehmen</button>
      <button type="button" class="btn btn-sm btn-d" onclick="kaderEditDelete(this,'${jsq(k.name||'')}','${k._id||''}')" style="grid-column:1/-1;justify-content:center;font-size:var(--s-klein)"><i class="ti ti-trash"></i>Endgültig löschen</button>
    </div>`:'<div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">Erst speichern – dann sind Kontakte, Links & Saison-Karte verfügbar.</div>'}
    </div>
  </div>`;
}
/* Eine Zeile auf, alle anderen zu. Zwei offene Kinder nebeneinander sind genau der
   Zustand, aus dem der alte Editor bestand. */
function kaderZeileAuf(btn){
  const row=btn.closest(".kader-edit-row"); if(!row)return;
  const offen=row.querySelector(".ke-felder")?.style.display!=="none";
  document.querySelectorAll("#kader-edit-list .kader-edit-row").forEach(r=>{
    const f=r.querySelector(".ke-felder"), k=r.querySelector(".ke-kopf"), p=r.querySelector(".ke-pfeil");
    if(f)f.style.display="none";
    if(k)k.setAttribute("aria-expanded","false");
    if(p)p.style.transform="";
  });
  if(offen)return;                       // war offen: zu lassen
  const f=row.querySelector(".ke-felder"), p=row.querySelector(".ke-pfeil");
  if(f)f.style.display="";
  btn.setAttribute("aria-expanded","true");
  if(p)p.style.transform="rotate(90deg)";
  row.querySelector(".ke-name")?.focus({preventScroll:true});
}
/* Der Kopf muss mitziehen, sonst steht dort nach einer Umbenennung noch der alte
   Name — und beim Zuklappen sähe man die Änderung nicht mehr. */
function kaderKopfFrisch(el){
  const row=el.closest(".kader-edit-row"); if(!row)return;
  const nr=row.querySelector(".ke-nr")?.value;
  const name=row.querySelector(".ke-name")?.value.trim();
  const kn=row.querySelector(".ke-kopf-nr"), kname=row.querySelector(".ke-kopf-name"), kc=row.querySelector(".ke-kopf-chips");
  if(kn)kn.textContent=nr!==""&&nr!=null?"#"+nr:"—";
  if(kname)kname.textContent=name||"Neuer Spieler";
  if(kc)kc.innerHTML=_keChips({
    aktiv:row.querySelector(".ke-aktiv")?.checked!==false,
    tw:!!row.querySelector(".ke-tw")?.checked,
    foto_stadionheft_ok:!!row.querySelector(".ke-fotook")?.checked,
    medical:row.querySelector(".ke-medical")?.value.trim()});
  row.dataset.name=name||"";
}
/* Suchen statt scrollen. Bei fünfzehn Kindern ist das schon der schnellere Weg,
   bei einem neuen Jahrgang erst recht. */
function kaderFilter(text){
  const q=String(text||"").trim().toLowerCase();
  document.querySelectorAll("#kader-edit-list .kader-edit-row").forEach(r=>{
    r.style.display=!q||(r.dataset.name||"").toLowerCase().includes(q)?"":"none";
  });
}
// Foto aus einer Kader-Zeile hochladen (nutzt den aktuellen Namen der Zeile).
function kaderRowFoto(input){
  const row=input.closest(".kader-edit-row");
  const name=row?.querySelector(".ke-name")?.value.trim();
  if(!name){toast("Erst Namen eintragen (und Spieler speichern)","err");input.value="";return;}
  const file=input.files&&input.files[0];
  if(file)fotoUpload(name,file,input);
}
function kaderEditOpen(){
  if(!sbToken()){toast("Bitte zuerst als Trainer anmelden","err");return;}
  document.getElementById("kader-edit-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="kader-edit-modal";
  modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-label","Spieler verwalten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const drin=KADER.filter(k=>k.aktiv!==false).length, raus=KADER.length-drin;
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("kader-edit-modal","👥","Spieler verwalten",`${drin} im Kader${raus?` · ${raus} ausgetragen`:""}`,"#1e3a8a")}
    <input id="ke-filter" type="search" placeholder="Nach Namen suchen…" aria-label="Nach Namen suchen" oninput="kaderFilter(this.value)"
      style="width:100%;min-height:48px;padding:10px 12px;margin-bottom:10px;border:1px solid var(--rand-bedien);border-radius:10px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)">
    <div id="kader-edit-list">${KADER.slice().sort((a,b)=>((a.aktiv===false)-(b.aktiv===false))).map((k,i)=>kaderEditRow(k,i)).join("")}</div>
    <button type="button" class="btn btn-sm" onclick="kaderEditAdd()" style="width:100%;margin:2px 0 12px"><i class="ti ti-plus"></i>Spieler erfassen</button>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-bottom:10px;line-height:1.5">Geburtstag und Medical-Hinweis sehen nur Trainer. Trikotgröße und Ausgabe stehen unter <b>Team → Ausstattung</b>.</div>
    <button type="button" id="ke-speichern" class="btn btn-p" onclick="kaderSaveAll(this)" style="width:100%;min-height:56px;font-size:var(--s-karte);font-weight:800;display:none"><i class="ti ti-device-floppy"></i>Neue Spieler speichern</button>
  </div>`;
  document.body.appendChild(modal);
}
/* ═══ v739 – Kinderprofil für Trainer ═══════════════════════════════════════════
   PO 04.10. (Bildschirmfoto der aufgeklappten Kader-Zeile): „sieht ganz schlimm aus … unstrukturiert, nicht optisch
   gut und schlechte Usability.“ Statt eines Feldsalats in der Liste öffnet ein Tipp auf ein Kind sein Profil:
   Kopf mit Foto, dann Abschnitte – Stammdaten, Fußball, Foto & Freigaben, Fan-Fakten der Eltern (zum Lesen),
   Gesundheit, Mehr. Gespeichert wird nur dieses Kind (PATCH kader?id=eq.…); die Liste lädt danach frisch, damit
   „Neue Spieler speichern“ nie einen alten Stand zurückschreibt. Neue Kinder entstehen weiter in der Liste. */
const KP_FANFAKTEN=[["spitzname","Spitzname"],["lieblingsverein","Lieblingsverein"],["lieblingsspieler","Lieblingsspieler"],["hobby","Hobby"],["kann_gut","Kann richtig gut"],
  ["adler_seit","Adler seit"],["nummer_grund","Warum diese Nummer"],["lieblingsessen","Lieblingsessen"],["lieblingstier","Lieblingstier"],["lieblingsmusik","Lieblingsmusik"],
  ["lieblingsfilm","Lieblingsfilm"],["fussball_erlebnis","Schönstes Fußball-Erlebnis"],["gross_werden","Wenn ich groß bin"],["saisonziel","Saisonziel"],["weiterer_sport","Weiterer Sport"],["weiterer_sport_team","Team im weiteren Sport"]];
let _kp=null;
function _kpAlter(geb){ if(!geb)return ""; const g=new Date(geb+"T00:00:00"), h=new Date(); let a=h.getFullYear()-g.getFullYear(); if(h<new Date(h.getFullYear(),g.getMonth(),g.getDate()))a--; return `Jahrgang ${g.getFullYear()} · ${a} Jahre`; }
function _kpInit(name){ return String(name||"?").split(/\s+/).map(x=>x[0]||"").join("").slice(0,2).toUpperCase(); }
async function kinderProfilOpen(id){
  const k=KADER.find(x=>Number(x._id)===Number(id)); if(!k){toast("Kind nicht gefunden","err");return;}
  _kp={id:Number(id),k:{...k},geaendert:false};
  document.getElementById("kp-modal")?.remove();
  const m=document.createElement("div"); m.id="kp-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Profil von "+(k.name||"Kind"));
  m.style.cssText="position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;justify-content:center;align-items:flex-start;overflow-y:auto";
  m.style.zIndex=(typeof zOben==="function")?zOben(10002):10002;
  m.onclick=e=>{ if(e.target===m)kinderProfilZu(); };
  document.body.appendChild(m);
  kinderProfilRender();
  // Nachladen: Fan-Fakten der Eltern, Foto-Freigabe, Foto
  const [ff,fc]=await Promise.all([
    fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=eq.${Number(id)}&select=*`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
    fetch(`${SB_URL}/rest/v1/foto_consent?spieler_id=eq.${Number(id)}&select=intern,video,public_ok,updated_at`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[])]);
  if(!_kp||_kp.id!==Number(id))return;
  _kp.ff=ff[0]||{}; _kp.fc=fc[0]||null;
  kinderProfilRender(true);
  const pfad=_kp.ff.foto_path||k.foto_path;
  if(pfad&&typeof fotoLoadImage==="function"){ const img=await fotoLoadImage(pfad); const ziel=document.getElementById("kp-foto"); if(img&&ziel&&_kp&&_kp.id===Number(id)){ ziel.innerHTML=""; img.alt="Foto von "+k.name; img.style.cssText="width:100%;height:100%;object-fit:cover;border-radius:50%"; ziel.appendChild(img); } }
}
function kinderProfilRender(nachgeladen){
  const m=document.getElementById("kp-modal"); if(!m||!_kp)return;
  const k=_kp.k, ff=_kp.ff||{}, fc=_kp.fc;
  const inp="width:100%;min-height:48px;padding:10px 12px;border:1px solid var(--rand-bedien);border-radius:10px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)";
  const lbl=(t,f)=>`<label style="display:block;margin-top:10px"><span style="display:block;font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-bottom:4px">${t}</span>${f}</label>`;
  const karte=(icon,titel,inhalt,extra)=>`<section class="kp-karte" aria-label="${titel}" style="background:var(--surface);border:var(--border-s);border-radius:16px;padding:14px;margin-top:12px${extra||""}"><h3 style="margin:0;font-size:var(--s-karte);font-weight:800;display:flex;align-items:center;gap:8px"><span aria-hidden="true">${icon}</span>${titel}</h3>${inhalt}</section>`;
  const seg=(feld,opts,wert)=>`<div class="kp-seg" role="group" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${opts.map(([v,t])=>`<button type="button" class="kp-seg-btn" data-feld="${feld}" data-wert="${v}" aria-pressed="${String(wert)===String(v)}" onclick="kinderProfilSetze('${feld}','${v}')" style="flex:1;min-width:88px;min-height:44px;padding:6px 10px;border-radius:12px;border:1.5px solid ${String(wert)===String(v)?"#1e3a8a":"var(--rand-bedien)"};background:${String(wert)===String(v)?"#1e3a8a":"var(--surface2)"};color:${String(wert)===String(v)?"#fff":"var(--text)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${String(wert)===String(v)?"✓ ":""}${t}</button>`).join("")}</div>`;
  const twWert=!k.tw?"feld":(k.twPrio===1?"tw1":k.twPrio===2?"tw2":"tw0");
  const chips=[k.aktiv===false?"🚫 nicht im Kader":"👥 im Kader",k.tw?"🥅 Torwart":"",k.alias?`Kind ${esc(k.alias)} im Tagebuch`:""].filter(Boolean).map(t=>`<span style="font-size:var(--s-klein);font-weight:700;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.18);white-space:nowrap">${t}</span>`).join(" ");
  const fanZeilen=KP_FANFAKTEN.filter(([f])=>ff[f]).map(([f,t])=>`<div style="padding:8px 0;border-bottom:1px solid var(--surface2)"><div style="font-size:var(--s-klein);color:var(--text2)">${t}</div><div style="font-size:var(--s-text);font-weight:600">${esc(ff[f])}</div></div>`).join("");
  const frei=(an,t)=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:var(--s-klein);font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid ${an?"var(--green)":"var(--rand-bedien)"};color:${an?"var(--green)":"var(--text2)"}">${an?"✓":"✗"} ${t}</span>`;
  const quelle=ff.foto_path?"Foto von den Eltern (hat Vorrang)":k.foto_path?"Foto vom Trainerteam":"Noch kein Foto";
  m.innerHTML=`<div style="width:100%;max-width:520px;min-height:100vh;background:var(--bg,#f1f5f9);display:flex;flex-direction:column">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:12px 14px 18px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <button type="button" onclick="kinderProfilZu()" aria-label="Zurück zur Liste" style="min-width:44px;min-height:44px;border:none;border-radius:12px;background:rgba(255,255,255,.16);color:#fff;font-size:var(--s-karte);font-weight:800;cursor:pointer">‹</button>
        <span style="font-size:var(--s-klein);opacity:.9">Kinderprofil</span>
        <button type="button" onclick="typeof adlerCardOpen==='function'&&adlerCardOpen('${jsq(k.name||"")}')" style="min-height:44px;padding:0 12px;border:none;border-radius:12px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">🃏 Karte</button>
      </div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:10px">
        <div id="kp-foto" style="width:84px;height:84px;flex:none;border-radius:50%;border:3px solid #F5B700;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900">${esc(_kpInit(k.name))}</div>
        <div style="min-width:0">
          <div style="font-size:26px;font-weight:900;line-height:1.1">${k.nr!=null?`<span style="opacity:.8">#${k.nr}</span> `:""}${esc(k.name||"")}</div>
          <div style="font-size:var(--s-text);opacity:.92;margin-top:2px">${esc(_kpAlter(k.geb))}${ff.spitzname?` · „${esc(ff.spitzname)}“`:""}</div>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${chips}</div>
        </div>
      </div>
    </div>
    <div style="padding:0 12px 120px">
      ${karte("🪪","Stammdaten",`
        <div style="display:grid;grid-template-columns:1fr 110px;gap:8px">${lbl("Vorname",`<input id="kp-name" value="${esc(k.name||"")}" oninput="kinderProfilSetze('name',this.value)" style="${inp}">`)}${lbl("Rückennummer",`<input id="kp-nr" type="number" inputmode="numeric" value="${k.nr!=null?k.nr:""}" oninput="kinderProfilSetze('nr',this.value)" style="${inp}">`)}</div>
        ${lbl("Geburtstag",`<input id="kp-geb" type="date" value="${esc(k.geb||"")}" oninput="kinderProfilSetze('geb',this.value)" style="${inp}">`)}
        <label style="display:flex;align-items:center;gap:12px;min-height:48px;margin-top:10px;cursor:pointer"><input id="kp-aktiv" type="checkbox" ${k.aktiv!==false?"checked":""} onchange="kinderProfilSetze('aktiv',this.checked)" style="width:24px;height:24px;flex:none;accent-color:#1e3a8a"><span><b>Im Kader</b><span style="display:block;font-size:var(--s-klein);color:var(--text2)">Ohne Häkchen taucht das Kind in Anwesenheit, Nominierung und Aufstellung nicht mehr auf – alles Bisherige bleibt.</span></span></label>`)}
      ${karte("⚽","Fußball",`
        <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-top:10px">Torwart</div>${seg("tw",[["feld","Feldspieler"],["tw0","Kann ins Tor"],["tw1","Torwart 1. Wahl"],["tw2","Torwart 2. Wahl"]],twWert)}
        <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-top:12px">Starker Fuß</div>${seg("fuss",[["R","Rechts"],["L","Links"],["B","Beidfüßig"]],k.starker_fuss||"")}
        ${!k.starker_fuss&&ff.starker_fuss?`<div class="kp-fuss-eltern" style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Laut Eltern: ${esc(ff.starker_fuss)} – das steht auf der Karte, bis du hier etwas wählst.</div>`:""}
        ${lbl("Lieblingsposition",`<input id="kp-pos" list="kp-pos-liste" value="${esc(k.lieblingsposition||"")}" placeholder="z. B. Abwehr, Sturm, überall" oninput="kinderProfilSetze('lieblingsposition',this.value)" style="${inp}"><datalist id="kp-pos-liste"><option>Abwehr</option><option>Mittelfeld</option><option>Sturm</option><option>Torwart</option><option>Überall</option></datalist>`)}`)}
      ${karte("🏅","Stärken auf der Karte",`
        <div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">Bis zu drei antippen – sie stehen auf der Spielerkarte (Kind, Eltern, Team-Galerie). Ohne Auswahl rechnet die App sie aus der Einschätzung.</div>
        <div class="kp-staerken" role="group" aria-label="Stärken auf der Karte" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${Object.keys(CARD_BADGES).map(key=>{const b=CARD_BADGES[key],an=staerkenManuell(k).includes(key);return `<button type="button" class="kp-st-btn" data-key="${key}" aria-pressed="${an}" onclick="kinderProfilStaerke('${key}')" style="min-height:44px;padding:6px 12px;border-radius:999px;border:2px solid ${an?"#1e3a8a":"var(--rand-bedien)"};background:${an?"#1e3a8a":"var(--surface2)"};color:${an?"#fff":"var(--text)"};font-weight:${an?800:600};font-family:inherit;font-size:var(--s-text);cursor:pointer">${b.icon} ${esc(b.label)}${an?" ✓":""}</button>`;}).join("")}</div>
        <div id="kp-st-zahl" role="status" style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">${staerkenManuell(k).length?staerkenManuell(k).length+" von 3 gewählt":"Keine Auswahl – berechnet aus der Einschätzung"}</div>
        ${staerkenManuell(k).length?`<button type="button" class="btn btn-sm" onclick="kinderProfilStaerkeLeer()" style="min-height:44px;margin-top:6px">Auswahl löschen (wieder berechnen)</button>`:""}`)}
      ${karte("📸","Foto &amp; Freigaben",`
        <div style="display:flex;align-items:center;gap:10px;margin-top:10px"><span style="flex:1;font-size:var(--s-text);color:var(--text2)">${quelle}</span>
          <label class="btn btn-sm" style="min-height:44px;cursor:pointer"><i class="ti ti-camera"></i>Foto ändern<input type="file" accept="image/jpeg,image/png,image/webp" onchange="kinderProfilFoto(this)" style="display:none"></label></div>
        <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-top:12px">Freigabe der Eltern ${fc&&fc.updated_at?`<span style="font-weight:400">· Stand ${new Date(fc.updated_at).toLocaleDateString("de-DE")}</span>`:""}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${nachgeladen?(frei(fc?fc.intern:k.foto_stadionheft_ok,"Team intern")+frei(fc&&fc.video,"Video")+frei(fc&&fc.public_ok,"Öffentlich")):'<span style="font-size:var(--s-klein);color:var(--text3)">Lädt …</span>'}</div>
        <div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">Die Stufen setzen nur die Eltern (Eltern-Bereich → Datenschutz &amp; Freigaben).</div>
        <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-top:14px">Fotoalbum <span style="font-weight:400">· bis 6 Fotos, eines davon das Kartenfoto</span></div>
        <div id="ka-box-${_kp.id}" class="ka-box" style="margin-top:6px"><span style="font-size:var(--s-klein);color:var(--text3)">Lädt …</span></div>
        <label style="display:flex;align-items:center;gap:12px;min-height:48px;margin-top:8px;cursor:pointer"><input id="kp-fotook" type="checkbox" ${k.foto_stadionheft_ok?"checked":""} onchange="kinderProfilSetze('foto_stadionheft_ok',this.checked)" style="width:24px;height:24px;flex:none;accent-color:#1e3a8a"><span style="font-size:var(--s-text)">Foto für Adler Nest &amp; Team-Galerie freigegeben <span style="display:block;font-size:var(--s-klein);color:var(--text2)">Nur mit Einwilligung der Eltern.</span></span></label>`)}
      ${karte("⭐","Fan-Fakten der Eltern",nachgeladen?(fanZeilen?`<div style="margin-top:4px">${fanZeilen}</div>`:`<div style="font-size:var(--s-text);color:var(--text2);margin-top:8px">Die Eltern haben noch nichts eingetragen.</div>`):`<div style="font-size:var(--s-klein);color:var(--text3);margin-top:8px">Lädt …</div>`)}
      ${karte("⚕️","Gesundheit",`${lbl("Hinweis für das Trainerteam",`<textarea id="kp-medical" rows="2" placeholder="z. B. Asthma, Allergie, Brille" oninput="kinderProfilSetze('medical',this.value)" style="${inp};resize:vertical">${esc(k.medical||"")}</textarea>`)}<div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">Sehen nur Trainer.</div>`)}
      ${karte("➕","Mehr",`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
        <button type="button" class="btn btn-sm" style="min-height:48px" onclick="kontakteEditOpen(${_kp.id})"><i class="ti ti-address-book"></i>Kontakte &amp; Login</button>
        <button type="button" class="btn btn-sm" style="min-height:48px" onclick="zieleOpen(${_kp.id})"><i class="ti ti-target"></i>Ziele</button>
        ${WRAPPED_SICHTBAR?`<button type="button" class="btn btn-sm" style="min-height:48px" onclick="childWrappedShare(${_kp.id})"><i class="ti ti-movie"></i>Saison-Karte</button>`:""}
        <button type="button" class="btn btn-sm" style="min-height:48px" onclick="typeof sonderkartenTrainerOpen==='function'&&sonderkartenTrainerOpen(${_kp.id})"><i class="ti ti-cards"></i>Sonderkarten</button>
        <button type="button" class="btn btn-sm" style="min-height:48px" onclick="lobRecordOpen(${_kp.id},'${jsq(k.name||"")}')"><i class="ti ti-microphone"></i>Sprachlob</button>
        <button type="button" class="btn btn-sm" style="min-height:48px;grid-column:1/-1" onclick="kinderProfilZu();typeof kaderBewerten==='function'&&kaderBewerten('${jsq(k.name||"")}')"><i class="ti ti-chart-radar"></i>Einschätzung öffnen</button>
      </div>
      <button type="button" class="btn btn-sm btn-d" style="width:100%;min-height:44px;margin-top:14px;justify-content:center" onclick="kinderProfilLoeschen()"><i class="ti ti-trash"></i>Endgültig löschen</button>`)}
    </div>
    <div style="position:sticky;bottom:0;margin-top:auto;background:var(--surface);border-top:1px solid var(--surface2);padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:8px">
      <button type="button" onclick="kinderProfilZu()" class="btn" style="min-height:56px;flex:none">Schließen</button>
      <button type="button" id="kp-speichern" onclick="kinderProfilSpeichern()" class="btn btn-p" style="flex:1;min-height:56px;font-size:var(--s-karte);font-weight:800;justify-content:center" ${_kp.geaendert?"":"disabled"}>Änderungen speichern</button>
    </div>
  </div>`;
  /* v743: Fotoalbum (md-fanfakten.js, Welle 2) – nach jedem Aufbau neu einhängen */
  if(nachgeladen&&typeof kindAlbumRender==="function")kindAlbumRender(_kp.id,"ka-box-"+_kp.id,"trainer");
}
function kinderProfilSetze(feld,wert){
  if(!_kp)return;
  const k=_kp.k;
  if(feld==="tw"){ k.tw=wert!=="feld"; k.twPrio=wert==="tw1"?1:wert==="tw2"?2:0; }
  else if(feld==="fuss"){ k.starker_fuss=k.starker_fuss===wert?null:wert; }
  else if(feld==="nr"){ k.nr=wert===""?null:parseInt(wert); }
  else k[feld]=wert;
  _kp.geaendert=true;
  if(feld==="tw"||feld==="fuss"){ kinderProfilRender(_kp.ff!==undefined); const f=document.querySelector(`#kp-modal .kp-seg-btn[data-feld="${feld}"][aria-pressed="true"]`); f&&f.focus(); }
  const b=document.getElementById("kp-speichern"); if(b)b.disabled=false;
}
function kinderProfilStaerke(key){
  if(!_kp||typeof CARD_BADGES==="undefined"||!CARD_BADGES[key])return;
  const k=_kp.k, l=staerkenManuell(k), i=l.indexOf(key);
  if(i>=0)l.splice(i,1);
  else if(l.length>=3){ toast("Höchstens drei Stärken – erst eine abwählen","err"); return; }
  else l.push(key);
  k.staerken_manuell=l.length?l:null; _kp.geaendert=true;
  kinderProfilRender(_kp.ff!==undefined);
  const f=document.querySelector(`#kp-modal .kp-st-btn[data-key="${key}"]`); f&&f.focus();
  const b=document.getElementById("kp-speichern"); if(b)b.disabled=false;
}
function kinderProfilStaerkeLeer(){
  if(!_kp)return; _kp.k.staerken_manuell=null; _kp.geaendert=true; kinderProfilRender(_kp.ff!==undefined);
  const b=document.getElementById("kp-speichern"); if(b)b.disabled=false;
}
async function kinderProfilSpeichern(){
  if(!_kp)return;
  const k=_kp.k, name=String(k.name||"").trim();
  if(!name){toast("Bitte einen Namen eintragen","err");document.getElementById("kp-name")?.focus();return;}
  if(k.nr!=null&&k.aktiv!==false){ const dop=KADER.find(x=>Number(x._id)!==_kp.id&&x.aktiv!==false&&x.nr===k.nr);
    if(dop){toast(`Nummer ${k.nr} trägt schon ${dop.name}. Jede Nummer gehört genau einem Kind.`,"err");document.getElementById("kp-nr")?.focus();return;} }
  const daten={name,nr:k.nr,geb:k.geb||null,aktiv:k.aktiv!==false,tw:!!k.tw,tw_prio:k.twPrio||0,staerken_manuell:staerkenManuell(k).length?staerkenManuell(k):null,starker_fuss:k.starker_fuss||null,
    lieblingsposition:String(k.lieblingsposition||"").trim()||null,foto_stadionheft_ok:!!k.foto_stadionheft_ok,medical:String(k.medical||"").trim()||null};
  const b=document.getElementById("kp-speichern"); if(b)b.disabled=true;
  try{ const r=await fetch(`${SB_URL}/rest/v1/kader?id=eq.${_kp.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify(daten)});
    if(sbCheck401(r))return;
    if(!r.ok){ const t=await r.text().catch(()=>""); toast(/kader_nr_aktiv_uniq/.test(t)?`Nummer ${k.nr} ist schon vergeben`:"Nicht gespeichert – bitte noch einmal","err"); if(b)b.disabled=false; return; } }
  catch(e){ toast("Keine Verbindung – nicht gespeichert","err"); if(b)b.disabled=false; return; }
  _kp.geaendert=false;
  await loadKader();
  _kpListeFrisch();
  toast(`${name} gespeichert ✓`);
  kinderProfilRender(_kp.ff!==undefined);
}
async function kinderProfilZu(){
  if(_kp&&_kp.geaendert&&typeof frageJaNein==="function"&&!await frageJaNein({emoji:"✏️",titel:"Änderungen verwerfen?",text:"Du hast etwas geändert und noch nicht gespeichert.",ja:"Verwerfen",nein:"Weiter bearbeiten",ton:"rot"}))return;
  document.getElementById("kp-modal")?.remove(); _kp=null;
}
async function kinderProfilFoto(input){
  if(!_kp)return; const file=input.files&&input.files[0]; input.value=""; if(!file)return;
  try{
    const blob=await fotoCompress(file);
    const path=(crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now()))+".jpg";
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/kader?id=eq.${_kp.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({foto_path:path})});
    if(sbCheck401(r)||!r.ok){toast("Foto nicht gespeichert","err");return;}
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");return;}
  await loadKader();
  const id=_kp.id, geaendert=_kp.geaendert, k=_kp.k;
  toast(_kp.ff&&_kp.ff.foto_path?"Foto gespeichert ✓ – auf der Karte steht weiter das Foto der Eltern":"Foto gespeichert ✓");
  if(!geaendert){ kinderProfilOpen(id); } else { const neu=KADER.find(x=>Number(x._id)===id); if(neu)k.foto_path=neu.foto_path; }
}
async function kinderProfilLoeschen(){
  if(!_kp)return; const k=_kp.k;
  if(!await frageJaNein({emoji:"🗑️",ton:"rot",titel:`${k.name} endgültig löschen?`,text:"Damit verschwinden auch gesammelte Punkte, Foto-Freigabe und Eltern-Zugang; in alten Anwesenheitslisten bleibt nur eine Nummer. Wer den Verein verlässt: besser „Im Kader“ abwählen – dann bleibt die Historie heil.",ja:"Endgültig löschen",nein:"Abbrechen"}))return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/kader?id=eq.${_kp.id}`,{method:"DELETE",headers:sbAuthHeaders()}); if(sbCheck401(r))return; if(!r.ok){toast("Nicht gelöscht","err");return;} }
  catch(e){ toast("Keine Verbindung","err"); return; }
  document.getElementById("kp-modal")?.remove(); _kp=null;
  await loadKader(); _kpListeFrisch(); toast("Gelöscht");
}
function _kpListeFrisch(){
  const list=document.getElementById("kader-edit-list"); if(!list)return;
  const neue=[...list.querySelectorAll(".kader-edit-row")].filter(r=>!r.dataset.id);   // noch nicht gespeicherte neue Zeilen behalten
  list.innerHTML=KADER.slice().sort((a,b)=>((a.aktiv===false)-(b.aktiv===false))).map((k,i)=>kaderEditRow(k,i)).join("");
  neue.forEach(r=>list.appendChild(r));
}
function kaderEditAdd(){
  const list=document.getElementById("kader-edit-list");
  if(!list)return;
  list.insertAdjacentHTML("beforeend",kaderEditRow({name:"",tw:false,twPrio:0},KADER.length));
  const sp=document.getElementById("ke-speichern"); if(sp)sp.style.display="";
  const neu=list.lastElementChild;
  /* Die neue Zeile steht unten und ist als einzige offen — genau wie nach einem Tipp
     auf eine bestehende. Ohne das Schliessen der anderen stuenden zwei offen. */
  if(neu){
    document.querySelectorAll("#kader-edit-list .kader-edit-row").forEach(r=>{
      if(r===neu)return;
      const f=r.querySelector(".ke-felder"), k=r.querySelector(".ke-kopf"), p=r.querySelector(".ke-pfeil");
      if(f)f.style.display="none";
      if(k)k.setAttribute("aria-expanded","false");
      if(p)p.style.transform="";
    });
    neu.scrollIntoView({block:"nearest"});
    neu.querySelector(".ke-name")?.focus({preventScroll:true});
  }
}
async function kaderEditDelete(btn,name,id){
  /* Hartes Loeschen raeumt per CASCADE rund 25 Tabellen ab – darunter gesammelte
     Punkte und die Foto-Freigabe. In Anwesenheit, Nominierung und Trainingsgruppen
     steht seit v451 die kader.id; ohne Kader-Zeile zeigt die App dort nur noch
     „#<Nummer>". Fuer einen Vereinswechsel ist deshalb fast immer der Haken die
     richtige Wahl. */
  if(!confirm(`${name||"Spieler"} ENDGÜLTIG löschen?\n\nDamit verschwinden auch gesammelte Punkte, Foto-Freigabe und Eltern-Zugang. In vergangenen Anwesenheitslisten bleibt nur noch eine Nummer statt des Namens.\n\nWer den Verein verlässt: besser das Häkchen „Im Kader“ entfernen – dann ist das Kind überall raus und die Historie bleibt heil.`))return;
  if(id){
    try{const r=await fetch(`${SB_URL}/rest/v1/kader?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  }
  btn.closest(".kader-edit-row")?.remove();
}
/* ═══════════════════════════════════
   KONTAKTE & ELTERN-LOGIN pro Kind (Phase 10-M, Etappe 1) – trainer-verwaltet.
   • Login-E-Mails → eltern_kinder (wer darf sich im Portal anmelden & zu-/absagen)
   • Telefonnummern → kind_kontakte (beliebig viele: Vater/Mutter/Oma…)
   Sofort-speichernd (Add/Delete schreiben direkt), RLS erlaubt Schreiben nur Trainern.
═══════════════════════════════════ */
function kontakteEditOpen(spielerId){
  if(!spielerId){toast("Bitte den Spieler zuerst speichern","err");return;}
  const k=KADER.find(x=>x._id===spielerId);
  document.getElementById("kontakte-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="kontakte-modal";
  modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-label","Kontakte und Eltern-Login");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  modal.style.zIndex=(typeof zOben==="function")?zOben(10000):10000;   // v753: über dem Kinderprofil (10002), sonst öffnet sich der Dialog dahinter
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:420px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:2px">📇 ${esc(k?k.name:"Spieler")} – Kontakte & Eltern-Login</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:12px">Login-E-Mails: wer sich im Eltern-Bereich anmelden & zu-/absagen darf. Telefonnummern: beliebig viele (Vater, Mutter, Oma…).</div>
    <div id="kontakte-body"><div style="color:var(--text3);font-size:var(--s-text);padding:12px">Lade…</div></div>
    <!-- v546: Der persönliche Zu-/Absage-Link stand bis hierher in der Stammdatenzeile
         des Kader-Editors, zwischen Geburtstag und Medical-Hinweis. Er ist aber keine
         Eigenschaft des Kindes, sondern ein Zugangsweg für seine Familie – und genau die
         wird hier verwaltet. Als Erinnerung an einen einzelnen Termin taugt er ohnehin
         nicht: er trägt kein Datum. Dafür gibt es das Nachfassen am Termin selbst. -->
    <div style="border-top:var(--border-s);margin-top:14px;padding-top:12px">
      <div style="font-size:var(--s-text);font-weight:700;color:var(--text2);margin-bottom:2px">Ohne Anmeldung zu- und absagen</div>
      <div style="font-size:var(--s-klein);color:var(--text3);margin-bottom:8px;line-height:1.5">Ein persönlicher Link für diese Familie: ein Tipp genügt, kein Login. Gilt dauerhaft für alle Termine – wer an einen einzelnen erinnern will, fasst am Termin selbst nach.</div>
      <button type="button" class="btn" style="width:100%" onclick="kindLinkShare(${spielerId})"><i class="ti ti-calendar-check"></i>Zu-/Absage-Link teilen</button>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" onclick="document.getElementById('kontakte-modal').remove()">Schließen</button></div>
  </div>`;
  document.body.appendChild(modal);
  kontakteRender(spielerId);
}
/* Eltern-Einladung: vorbereitete Nachricht, kein Server-Versand. Der Portal-Link ist
   kein Geheimnis – anmelden kann sich nur, wessen E-Mail in eltern_kinder steht
   (is_email_whitelisted + Einmal-Code). Der Trainer sieht den Text und sendet selbst.
   v604: Der Regelweg ist die Einladungskarte (einladungskartenOpen) – ohne Mailversand. */
/* Für Werte in onclick="fn('${jsq(x)}')": neben \ und ' muss auch " maskiert werden –
   sonst bricht ein Anführungszeichen im Namen aus dem HTML-Attribut aus. */
function jsq(s){ return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;"); }
function elternPortalUrl(){ return appRoot()+"?portal"; }
function inviteText(email,kind){
  return `Hallo! 🦅\n\nHier ist dein Zugang zum Eltern-Bereich der U9 vom SV Adler Dellbrück`
    +`${kind?` – für ${kind}`:""}.\n\n${elternPortalUrl()}\n\n`
    +`So geht's:\n1. Link öffnen\n2. Unten auf „Code per E-Mail“ tippen und diese Adresse eingeben: ${email}\n3. Du bekommst einen Einmal-Code per Mail. Im Eltern-Bereich kannst du dann über 🔑 ein Passwort festlegen.\n\n`
    +`Dort kannst du zu- und absagen, Termine in deinen Kalender laden und die Adler-Karte deines Kindes ansehen.\n\nBis bald am Platz!`;
}
function inviteMail(email,kind){
  const betreff=`Dein Zugang zum Eltern-Bereich der U9${kind?` (${kind})`:""}`;
  location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(inviteText(email,kind))}`;
}
function inviteWa(tel,kind,email){
  const nr=(typeof waNumber==="function")?waNumber(tel):null; if(!nr){toast("Keine gültige Handynummer","err");return;}
  if(!email){toast("Erst eine Login-E-Mail hinterlegen","err");return;} // ohne Whitelist-Mail nützt der Link nichts
  window.open(`https://wa.me/${nr}?text=${encodeURIComponent(inviteText(email,kind))}`,"_blank","noopener");
}
async function kontakteRender(sid){
  const body=document.getElementById("kontakte-body");
  if(!body)return;
  const kName=(KADER.find(x=>x._id===sid)||{}).name||"";
  let emails=[],phones=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?spieler_id=eq.${sid}&select=id,email,label&order=id`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)emails=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_kontakte?spieler_id=eq.${sid}&select=id,name,rolle,telefon,geburtstag&order=id`,{headers:sbAuthHeaders()});if(r.ok)phones=await r.json();}catch(e){}
  const inp="padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:var(--s-text)";
  // Am Platz wird mit dem Daumen getippt: Aktionen sind beschriftet und 44px hoch,
  // "Loeschen" steht raeumlich abgesetzt und fragt nach (es nimmt einem Elternteil den Zugang).
  const kkZeile="padding:10px 0;border-bottom:1px solid var(--surface2)";
  const kkAktion="flex:1;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
    +"padding:0 12px;border:1.5px solid;border-radius:10px;background:var(--surface);"
    +"font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer";
  const kkLoeschen="min-width:44px;min-height:44px;margin-left:12px;display:inline-flex;align-items:center;justify-content:center;"
    +"border:1.5px solid var(--red);border-radius:10px;background:var(--red-bg);color:var(--red);font-size:var(--s-karte);cursor:pointer";
  body.innerHTML=`
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:6px">🔑 Login-E-Mails</div>
    ${emails.length?emails.map(e=>`<div style="${kkZeile}">
      <div style="font-size:var(--s-text);word-break:break-all;margin-bottom:8px">${esc(e.email)}${e.label?` <span style="color:var(--text3);font-size:var(--s-klein)">(${esc(e.label)})</span>`:""}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <button onclick="inviteMail('${jsq(e.email)}','${jsq(kName)}')" style="${kkAktion};border-color:#c4b5fd;color:var(--purple)"><i class="ti ti-mail-forward"></i>Einladen</button>
        <button onclick="kontakteDelEmail(${e.id},${sid},'${jsq(e.email)}')" aria-label="Login-E-Mail entfernen" style="${kkLoeschen}"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Noch keine Login-E-Mail.</div>'}
    ${emails.length?'<div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">„Einladen" öffnet dein Mail-Programm mit fertigem Text – du tippst nur noch auf Senden.</div>':""}
    <div style="display:flex;gap:6px;margin:8px 0 16px;flex-wrap:wrap">
      <input id="kk-new-email" type="email" placeholder="eltern@mail.de" style="flex:2;min-width:130px;${inp}">
      <input id="kk-new-email-label" placeholder="Rolle (optional)" style="flex:1;min-width:80px;${inp}">
      <button class="btn" style="min-height:44px" onclick="kontakteAddEmail(${sid})"><i class="ti ti-plus"></i>Hinzufügen</button>
    </div>
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:6px">📞 Telefonnummern</div>
    ${phones.length?phones.map(p=>`<div style="${kkZeile}">
      <div style="font-size:var(--s-text);margin-bottom:8px">${esc(p.telefon)}${(p.name||p.rolle)?` <span style="color:var(--text3);font-size:var(--s-klein)">(${esc([p.rolle,p.name].filter(Boolean).join(" · "))})</span>`:""}${p.geburtstag?` <span style="color:var(--text3);font-size:var(--s-klein)">🎂 ${new Date(p.geburtstag+"T00:00:00").toLocaleDateString("de-DE")}</span>`:""}</div>
      <div style="display:flex;gap:8px;align-items:center">
        ${(typeof waNumber==="function"&&waNumber(p.telefon))&&emails.length?`<button onclick="inviteWa('${jsq(p.telefon)}','${jsq(kName)}','${jsq(emails[0].email)}')" style="${kkAktion};border-color:#86efac;color:var(--green)"><i class="ti ti-brand-whatsapp"></i>WhatsApp</button>`:`<span style="flex:1;font-size:var(--s-klein);color:var(--text3)">${(typeof waNumber==="function"&&waNumber(p.telefon))?"Erst eine Login-E-Mail hinterlegen":"Keine Handynummer"}</span>`}
        <button onclick="kontakteDelPhone(${p.id},${sid},'${jsq(p.telefon)}')" aria-label="Telefonnummer entfernen" style="${kkLoeschen}"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Noch keine Nummer.</div>'}
    ${phones.length?'<div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">„WhatsApp" öffnet den Chat mit der Einladung. Anmelden kann sich nur, wessen E-Mail oben hinterlegt ist.</div>':""}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <input id="kk-new-tel" type="tel" placeholder="Telefon" style="flex:2;min-width:110px;${inp}">
      <input id="kk-new-rolle" placeholder="Rolle (z. B. Mutter)" style="flex:1;min-width:90px;${inp}">
      <input id="kk-new-name" placeholder="Name (optional)" style="flex:1;min-width:90px;${inp}">
      <label style="flex:1;min-width:130px;font-size:var(--s-klein);color:var(--text3)">🎂 Geburtstag (optional)<input id="kk-new-geb" type="date" style="width:100%;${inp}"></label>
      <button class="btn" style="min-height:44px" onclick="kontakteAddPhone(${sid})"><i class="ti ti-plus"></i>Hinzufügen</button>
    </div>`;
}
async function kontakteAddEmail(sid){
  const email=(document.getElementById("kk-new-email")?.value||"").trim().toLowerCase();
  const label=(document.getElementById("kk-new-email-label")?.value||"").trim();
  if(!email||!/.+@.+\..+/.test(email)){toast("Gültige E-Mail eingeben","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?on_conflict=spieler_id,email`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:sid,email,label:label||null})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Login-E-Mail hinterlegt ✓");
  kontakteRender(sid);
}
async function kontakteDelEmail(id,sid,email){
  // Rueckfrage: das Entfernen sperrt diesen Elternteil aus dem Eltern-Bereich aus.
  if(!confirm(`Login-E-Mail wirklich entfernen?\n\n${email||""}\n\nDanach kann sich diese Adresse nicht mehr anmelden.`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht entfernen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Login-E-Mail entfernt");
  kontakteRender(sid);
}
async function kontakteAddPhone(sid){
  const telefon=(document.getElementById("kk-new-tel")?.value||"").trim();
  const rolle=(document.getElementById("kk-new-rolle")?.value||"").trim();
  const name=(document.getElementById("kk-new-name")?.value||"").trim();
  const geburtstag=(document.getElementById("kk-new-geb")?.value||"")||null;
  if(!telefon){toast("Telefonnummer eingeben","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_kontakte`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler_id:sid,telefon,rolle:rolle||null,name:name||null,geburtstag})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Nummer hinterlegt ✓");
  kontakteRender(sid);
}
async function kontakteDelPhone(id,sid,tel){
  if(!confirm(`Telefonnummer wirklich entfernen?\n\n${tel||""}`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_kontakte?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht entfernen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Nummer entfernt");
  kontakteRender(sid);
}
// Persönlichen 1-Tap Zu-/Absage-Link (?kind=<token>) eines Kindes an die Familie teilen.
async function kindLinkShare(spielerId){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  let token=null, nm="";
  try{const r=await fetch(`${SB_URL}/rest/v1/kader?id=eq.${spielerId}&select=name,rsvp_token`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok){const row=(await r.json())[0];if(row){token=row.rsvp_token;nm=row.name||"";}}}catch(e){}
  if(!token){toast("Kein Link gefunden","err");return;}
  const url=appRoot()+"?kind="+encodeURIComponent(token);
  const text=`⚽ Zu-/Absage für ${nm||"dein Kind"} (1 Tipp, kein Login):\n${url}`;
  if(navigator.share){navigator.share({title:"Zu-/Absage-Link "+nm,text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Link kopiert ✓"),()=>prompt("Link:",url));}
}
/* v754 (PO 04.10.: „Die Saison aktuell ausblenden. Die meisten Werte tracken wir aktuell nicht.“): Der Saison-Rückblick
   (Adler Wrapped, Saison-Karte, Saison-Statistik) ist ausgeblendet, bis genug Werte erfasst werden. Auf true setzen, dann
   erscheinen alle Einstiege wieder; die Funktionen selbst bleiben unverändert. */
let WRAPPED_SICHTBAR=false;
// Adler-Wrapped pro Kind: persönliche Saison-Karte (Bild) für die Familie. Daten aus get_child_wrapped.
async function childWrappedDaten(spielerId){
  let d=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/get_child_wrapped`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:spielerId})});if(sbCheck401(r))return null;if(r.ok)d=await r.json();}catch(e){}
  return (d&&d.ok)?d:null;
}
function childWrappedLogo(cb){
  const logo=new Image();
  logo.onload=()=>cb(logo);
  logo.onerror=()=>cb(null);
  logo.src="logo.png";
}
async function childWrappedShare(spielerId){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  toast("🎬 Saison-Karte wird erstellt…");
  const d=await childWrappedDaten(spielerId);
  if(!d){toast("Konnte Saison-Daten nicht laden","err");return;}
  childWrappedLogo(logo=>childWrappedTeilen(childWrappedCanvas(logo,d)));
}
/* v566 – PO: „Wenn ich in der Eltern-App auf Saison-Statistik klicke, wird direkt der
   Teilen-Button geöffnet. Erst ansehen und wenn man will teilen." Also: dieselbe Karte im
   eigenen Fenster, und „Teilen" ist ein Knopf darunter, keine Folge des Antippens. */
async function childWrappedOpen(spielerId){
  if(!sbToken()){toast("Bitte anmelden","err");return;}
  const d=await childWrappedDaten(spielerId);
  if(!d){toast("Konnte Saison-Daten nicht laden","err");return;}
  childWrappedLogo(logo=>{
    const c=childWrappedCanvas(logo,d);
    document.getElementById("wrapped-modal")?.remove();
    const modal=document.createElement("div");
    modal.id="wrapped-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Saison-Statistik");
    modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10060;display:flex;flex-direction:column;padding:16px;overflow-y:auto";
    const innen=document.createElement("div");
    innen.style.cssText="margin:auto;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%";
    modal.onclick=e=>{if(e.target===modal||e.target===innen)modal.remove();};
    c.style.cssText="max-width:100%;width:320px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)";
    innen.appendChild(c);
    const bar=document.createElement("div");
    bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
    bar.innerHTML=`<button class="btn btn-p" id="wrapped-teilen"><i class="ti ti-share"></i>Teilen</button>
      <button class="btn" onclick="document.getElementById('wrapped-modal').remove()">Schließen</button>`;
    innen.appendChild(bar);
    bar.querySelector("#wrapped-teilen").onclick=()=>childWrappedTeilen(c);
    modal.appendChild(innen);document.body.appendChild(modal);
  });
}
function childWrappedCanvas(logoImg,d){
  const W=640,H=800,c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#5b21b6");g.addColorStop(1,"#1e3a8a");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";ctx.textBaseline="alphabetic";
  if(logoImg){try{ctx.drawImage(logoImg,W/2-40,42,80,80);}catch(e){}}
  ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 15px Arial";ctx.fillText("🦅 ADLER WRAPPED",W/2,150);
  ctx.fillStyle="#facc15";ctx.font="bold 38px Arial";ctx.fillText(((d.name||"")+"s Saison"),W/2,196);
  // v752: ohne Tore und Ballaktionen (nicht erfasst)
  const rows=[["📅",d.spiele||0,"Spiele bestritten"],["⏱️",d.einsatz_min||0,"Minuten Spielzeit"],[XP_ICON,d.xp||0,XP_LABEL+" gesammelt"]];
  let y=254;
  rows.forEach(r=>{
    ctx.fillStyle="rgba(255,255,255,.1)";tbRoundRect(ctx,70,y,W-140,82,16);ctx.fill();
    ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="32px Arial";ctx.fillText(r[0],96,y+53);
    ctx.font="bold 38px Arial";ctx.fillStyle="#facc15";ctx.fillText(String(r[1]),150,y+54);
    ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 20px Arial";ctx.fillText(r[2],W-96,y+51);
    ctx.textAlign="center";y+=96;
  });
  ctx.fillStyle="rgba(255,255,255,.92)";ctx.font="bold 22px Arial";ctx.fillText("Stark gemacht! 🦅❤️",W/2,H-38);
  return c;
}
function childWrappedTeilen(c){
  c.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"adler-wrapped.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ try{await navigator.share({files:[file],title:"Adler Wrapped"});}catch(e){} }
    else{ const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adler-wrapped.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("Saison-Karte heruntergeladen ✓"); }
  },"image/png");
}
// Wochen-Challenge (Kids): Heim-Aufgabe der Woche -> 🪶 20 Federn beim Abhaken.
async function wochenChallengeOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  let cur="";
  try{const r=await fetch(`${SB_URL}/rest/v1/wochen_challenge?aktiv=eq.true&select=text&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok){const row=(await r.json())[0];cur=(row&&row.text)||"";}}catch(e){}
  document.getElementById("wc-modal")?.remove();
  const modal=document.createElement("div");modal.id="wc-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Wochen-Challenge");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("wc-modal","🏆","Wochen-Challenge","Heim-Aufgabe der Woche · geschafft = 🪶 20 Federn","var(--amber)")}
    <textarea id="wc-input" rows="3" placeholder="z. B. „Diese Woche: 50 Ballkontakte im Garten – jeden Tag ein bisschen!&quot;" style="width:100%;padding:9px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box;resize:vertical">${esc(cur)}</textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
      <button class="btn btn-p" onclick="wochenChallengeSave()"><i class="ti ti-trophy"></i>Challenge aktiv setzen</button>
      <button class="btn btn-sm" onclick="document.getElementById('wc-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
}
async function wochenChallengeSave(){
  const el=document.getElementById("wc-input");const text=(el?.value||"").trim();
  if(!text){toast("Bitte eine Aufgabe eintippen","err");return;}
  try{
    await fetch(`${SB_URL}/rest/v1/wochen_challenge?aktiv=eq.true`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({aktiv:false})});
    const r=await fetch(`${SB_URL}/rest/v1/wochen_challenge`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({text,aktiv:true})});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("🏆 Challenge ist live!");document.getElementById("wc-modal")?.remove();}
    else toast("Speichern fehlgeschlagen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
// Entwicklungs-Ziele pro Kind: 1-2 Förderziele setzen & abhaken (DFB-Fördergedanke).
/* B: Entwicklungsziele-Loop. Kuratierte Ziel-Vorlagen mit hinterlegten Übungs-Tags schließen
   den Kreis Ziel → passende Übungen → Wirkung (Gesamt-Trend seit Zielsetzung). Freitext bleibt
   als Fallback (ohne Verknüpfung). Übungs-Tags aus TRAININGSFORMEN (data.js). */
const ZIEL_VORLAGEN=[
  {ziel:"1-gegen-1 mutig angehen",        tags:["1gg1","dribbling","mindset"]},
  {ziel:"Passschärfe & Passspiel",        tags:["passspiel"]},
  {ziel:"Kopf hoch – Übersicht",          tags:["wahrnehmung"]},
  {ziel:"Ballkontrolle & Technik",        tags:["technik","ballkontrolle"]},
  {ziel:"Torabschluss & Mut vorm Tor",    tags:["torschuss","1gg1"]},
  {ziel:"Umschalten & Pressing",          tags:["pressing"]},
  {ziel:"Selbstvertrauen / Mindset",      tags:["mindset","spass"]},
  {ziel:"Torwart-Grundtechnik",           tags:["torwart"]}
];
// Übungen aus der Bibliothek, deren Tags zu den Ziel-Tags passen (case-insensitiv).
function _zielUebungen(tags,limit){
  if(!tags||!tags.length)return [];
  const low=tags.map(t=>String(t).toLowerCase());
  const forms=(typeof TRAININGSFORMEN!=="undefined"?TRAININGSFORMEN:[]);
  return forms.filter(f=>(f.tags||[]).some(t=>low.includes(String(t).toLowerCase()))).map(f=>f.name).slice(0,limit||4);
}
async function zieleAddVorlage(spielerId,idx){
  const v=ZIEL_VORLAGEN[idx]; if(!v)return;
  await sbQueuedPost("entwicklungsziele",{spieler_id:spielerId,ziel:v.ziel,meta:{tags:v.tags}},"return=minimal");
  toast("Ziel gesetzt 🎯");
  zieleRender(spielerId);
}
// Auto-Plan-Hinweis: Übungen, die zu OFFENEN Zielen im Team passen (Slot im Zeitplan).
async function zielUebungenHint(){
  const el=document.getElementById("ziel-uebungen-hint"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/entwicklungsziele?status=eq.offen&select=meta`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  const tags=[]; rows.forEach(z=>{(z.meta&&z.meta.tags||[]).forEach(t=>{if(!tags.includes(t))tags.push(t);});});
  const ex=_zielUebungen(tags,6);
  if(!ex.length){el.innerHTML="";return;}
  el.innerHTML=`<div style="font-size:var(--s-klein);color:#3730a3;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:7px 10px;margin-bottom:8px">🎯 <b>Passt zu offenen Entwicklungszielen:</b> ${ex.map(esc).join(" · ")}</div>`;
}
async function zieleOpen(spielerId){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  const k=KADER.find(x=>x._id===spielerId);
  document.getElementById("ziele-modal")?.remove();
  const modal=document.createElement("div");modal.id="ziele-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Entwicklungs-Ziele");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.style.zIndex=(typeof zOben==="function")?zOben(10000):10000;   // v753: über dem Kinderprofil (10002), sonst öffnet sich der Dialog dahinter
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("ziele-modal","🎯","Entwicklungs-Ziele",`${esc(k?.name||"Spieler")} · 1–2 Förderziele für die Saison`,"var(--amber)")}
    <div id="ziele-list" style="margin-bottom:12px"><div style="color:var(--text3);font-size:var(--s-text)">Lade…</div></div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:4px">Vorlage antippen (verknüpft passende Übungen) – oder unten frei formulieren:</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${ZIEL_VORLAGEN.map((v,i)=>`<button onclick="zieleAddVorlage(${spielerId},${i})" style="padding:6px 10px;border:1.5px solid #c7d2fe;border-radius:16px;background:#eef2ff;color:#3730a3;font-family:inherit;font-size:var(--s-klein);font-weight:600;cursor:pointer">🎯 ${esc(v.ziel)}</button>`).join("")}</div>
    <textarea id="ziele-input" rows="2" placeholder="Eigenes Ziel frei formulieren, z. B. „Ruhiger im Aufbau&quot;" style="width:100%;padding:9px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box;resize:vertical"></textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
      <button class="btn btn-p" onclick="zieleAdd(${spielerId})"><i class="ti ti-plus"></i>Ziel hinzufügen</button>
      <button class="btn btn-sm" onclick="document.getElementById('ziele-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
  zieleRender(spielerId);
}
async function zieleRender(spielerId){
  const box=document.getElementById("ziele-list");if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/entwicklungsziele?spieler_id=eq.${spielerId}&select=*&order=status.asc,created_at.desc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML='<div style="color:var(--text3);font-size:var(--s-text);padding:6px 0">Noch keine Ziele – setz das erste unten. 🎯</div>';return;}
  const nm=(KADER.find(x=>x._id===spielerId)||{}).name;
  const snaps=(nm&&typeof DB!=="undefined"&&DB[nm])?DB[nm]:[];
  box.innerHTML=rows.map(z=>{const done=z.status==="erreicht";
    const ex=_zielUebungen((z.meta&&z.meta.tags)||[]);
    // Wirkung: Gesamt-Score-Trend seit Zielsetzung (Baseline = letzter Snapshot vor dem Ziel).
    let trend="";
    if(!done&&snaps.length){
      const created=(z.created_at||"").slice(0,10);
      const base=[...snaps].reverse().find(s=>(s.datum||"")<=created)||snaps[0];
      const last=snaps[snaps.length-1];
      if(base&&last&&last!==base&&last.total_score!=null&&base.total_score!=null){
        const d=last.total_score-base.total_score;
        trend=`<span style="color:${d>0?"var(--green)":d<0?"var(--red)":"var(--text2)"};font-weight:700">Gesamt ${base.total_score}% → ${last.total_score}% ${d>0?"↗":d<0?"↘":"→"}</span>`;
      }
    }
    return `<div style="padding:8px 0;border-bottom:1px solid var(--surface2)">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <button onclick="zieleToggle(${z.id},'${done?'offen':'erreicht'}',${spielerId})" title="${done?'wieder offen':'als erreicht markieren'}" style="border:none;background:transparent;cursor:pointer;font-size:var(--s-teil);line-height:1;padding:0">${done?'✅':'⬜'}</button>
        <span style="flex:1;font-size:var(--s-text);${done?'text-decoration:line-through;color:var(--text3)':''}">${esc(z.ziel)}</span>
        <button onclick="zieleDelete(${z.id},${spielerId})" title="löschen" style="border:none;background:transparent;color:var(--red);cursor:pointer;font-size:var(--s-text);padding:2px 4px"><i class="ti ti-trash"></i></button>
      </div>
      ${(!done&&ex.length)?`<div style="font-size:var(--s-klein);color:var(--text2);margin:2px 0 0 26px">🏃 Passende Übungen: ${ex.map(esc).join(" · ")}</div>`:""}
      ${trend?`<div style="font-size:var(--s-klein);margin:3px 0 0 26px">📈 ${trend} <span style="color:var(--text3)">seit Zielsetzung</span></div>`:""}
    </div>`;}).join("");
}
async function zieleAdd(spielerId){
  const el=document.getElementById("ziele-input");const ziel=(el?.value||"").trim();
  if(!ziel){toast("Bitte ein Ziel eintippen","err");return;}
  const _r=await sbQueuedPost("entwicklungsziele",{spieler_id:spielerId,ziel},"return=minimal");
  if(el)el.value="";
  toast(_r&&_r.queued?"📶 Offline – Ziel wird nachgetragen":"Ziel gesetzt 🎯");
  zieleRender(spielerId);
}
async function zieleToggle(id,newStatus,spielerId){
  let _zok=false;
  try{const _zr=await fetch(`${SB_URL}/rest/v1/entwicklungsziele?id=eq.${id}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({status:newStatus,erreicht_at:newStatus==="erreicht"?new Date().toISOString():null})});_zok=_zr.ok;}catch(e){}
  if(newStatus==="erreicht"&&_zok){
    try{navigator.vibrate&&navigator.vibrate([40,50,90]);}catch(e){}
    toast("Stark – Ziel erreicht! 🎉");
    if(typeof confetti==="function")confetti(document.getElementById("ziele-modal")||document.body);
    // B-Etappe 3: Federn fürs Kind (idempotent pro Ziel), Punktwert bestimmt der Server.
    try{const d=await xpAward(spielerId,"ziel","z"+id); if(d>0)setTimeout(()=>toast(`${XP_ICON} +${d} ${XP_LABEL} fürs Kind!`),1200);}catch(e){}
  }
  if(!_zok)toast("Konnte nicht gespeichert werden – bitte nochmal","err");
  zieleRender(spielerId);
}
async function zieleDelete(id,spielerId){
  if(!confirm("Entwicklungs-Ziel wirklich löschen?"))return;
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/entwicklungsziele?id=eq.${id}&select=*`,{headers:sbAuthHeaders()});if(r.ok)row=(await r.json())[0];}catch(e){}
  try{await fetch(`${SB_URL}/rest/v1/entwicklungsziele?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  zieleRender(spielerId);
  if(row&&typeof toastUndo==="function")toastUndo("Ziel gelöscht",async()=>{
    try{await fetch(`${SB_URL}/rest/v1/entwicklungsziele`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({spieler_id:row.spieler_id,ziel:row.ziel,status:row.status})});}catch(e){}
    zieleRender(spielerId);
  });
}
async function kaderSaveAll(btn){
  const rows=[...document.querySelectorAll(".kader-edit-row")];
  const payload=[];
  rows.forEach((row,i)=>{
    const name=row.querySelector(".ke-name").value.trim();
    if(!name)return;
    const nrV=row.querySelector(".ke-nr").value;
    const geb=row.querySelector(".ke-geb").value;
    const medical=row.querySelector(".ke-medical").value.trim();
    const fuss=row.querySelector(".ke-fuss")?.value||"";
    const pos=row.querySelector(".ke-pos")?.value.trim()||"";
    const id=parseInt(row.dataset.id)||null;      // bestehende Zeile: ID mitschicken
    payload.push({
      ...(id?{id}:{}),
      name, nr:nrV!==""?parseInt(nrV):null,
      tw:row.querySelector(".ke-tw").checked,
      tw_prio:parseInt(row.querySelector(".ke-prio").value)||0,
      geb:geb||null, medical:medical||null,
      starker_fuss:fuss||null, lieblingsposition:pos||null, sort_order:i+1,
      // Ohne diese Zeile bliebe der Haken wirkungslos: PostgREST setzt beim Upsert nur
      // die mitgeschickten Spalten, `aktiv` waere also nie beschrieben worden.
      aktiv:row.querySelector(".ke-aktiv")?.checked!==false,
      foto_stadionheft_ok:row.querySelector(".ke-fotook")?.checked||false // HOTFIX 19 digital: Foto-Freigabe
    });
  });
  if(!payload.length){toast("Kein Spieler eingetragen","err");return;}
  /* v530: Eine Trikotnummer gehoert genau einem aktiven Kind. Die Datenbank haelt das
     seit v530 fest (kader_nr_aktiv_uniq), aber sie kann nur „geht nicht" sagen. Hier
     steht, WELCHE Nummer und WELCHE zwei Kinder - sonst sucht man in fuenfzehn Zeilen.
     Inaktive zaehlen nicht mit: ausgeschiedene Kinder duerfen ihre Nummer behalten. */
  const nrBelegt=new Map(), dublette=[];
  payload.forEach(k=>{
    if(k.nr==null||!k.aktiv)return;
    if(nrBelegt.has(k.nr))dublette.push({nr:k.nr,a:nrBelegt.get(k.nr),b:k.name});
    else nrBelegt.set(k.nr,k.name);
  });
  if(dublette.length){
    const d=dublette[0];
    toast(`Nummer ${d.nr} ist doppelt: ${d.a} und ${d.b}. Jede Nummer gehört genau einem Kind.`,"err");
    return;
  }
  if(btn)btn.disabled=true;
  try{
    /* on_conflict=id statt name: mit dem Namen als Schluessel legte eine Umbenennung
       eine ZWEITE Zeile mit neuer ID an, an der alten hingen Punkte, Pausen und
       Rueckmeldungen weiter. Jetzt ist Umbenennen eine normale Aenderung; die
       namens-gefuehrten Texttabellen zieht ein Trigger in der Datenbank nach. */
    const r=await fetch(`${SB_URL}/rest/v1/kader?on_conflict=id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(payload)});
    if(sbCheck401(r)){return;}
    if(r.status===409){
      /* Zwei Regeln koennen 409 ausloesen. Ohne Blick in die Antwort bekaeme der Trainer
         bei einer doppelten NUMMER die Meldung zum doppelten NAMEN – und suchte am
         falschen Ende. */
      let grund=""; try{ grund=await r.text(); }catch(e){}
      if(/kader_nr_aktiv_uniq|\(nr\)/.test(grund))toast("Diese Trikotnummer hat schon ein anderes Kind","err");
      else toast("Name schon vergeben – jedes Kind braucht einen eigenen","err");
      return;
    }
    if(r.ok||r.status===201){
      await loadKader();
      renderKader();
      if(typeof refreshSelects==="function")refreshSelects();
      document.getElementById("kader-edit-modal")?.remove();
      toast("Kader gespeichert ✓");
    }else toast("Fehler beim Speichern","err");
  }catch(e){toast("Netzwerkfehler","err");}
  finally{if(btn)btn.disabled=false;}
}
// Saison-Backup: alle relevanten Tabellen als JSON-Download sichern.
/* v603: Was die Sicherung bewusst NICHT enthaelt – jede Tabelle, die die App anspricht,
   steht entweder in der Liste von backupExport oder hier, mit Grund. Der Pruefstand haelt
   das gegen den Code: eine neue Tabelle ohne Eintrag an einer der beiden Stellen macht den
   Lauf rot (Pflicht 3 aus CLAUDE.md, bis v603 nie geprueft). Der Grund steht auch in der
   Sicherungsdatei selbst, damit spaeter niemand eine Luecke fuer einen Fehler haelt. */
const SICHERUNG_AUSNAHMEN={
  kind_notfall:"Gesundheits- und Notfallangaben (Art. 9 DSGVO). Sie gehoeren den Eltern, die sie jederzeit neu eintragen – eine Kopie auf einem Trainergeraet waere eine zweite, ungeschuetzte Ablage.",
  push_subscriptions:"Geraetekennungen fuer Benachrichtigungen. Sie erneuern sich beim naechsten Oeffnen der App von selbst und gehoeren nicht in eine Datei.",
  nutzung_log:"Nutzungsprotokoll fuer die Auswertung unter Orga. Nichts davon wird fuer eine Wiederherstellung gebraucht.",
  eltern_dabei:"Gibt es in der Datenbank nicht. Nur toter Code in md-matchcard.js (edLoad/edSignup) spricht sie noch an.",
  fahrgemeinschaft:"Gibt es in der Datenbank nicht. Nur toter Code in md-matchcard.js (fgLoad/fgOffer/fgJoin) spricht sie noch an; die lebende Fahrgemeinschaft steckt in rueckmeldungen.",
  rufe_anhang_dateien:"Die Dateien der Anhaenge zu Adler-Rufen (Bucket rufe-anhang, v748) stehen nicht in der Sicherung: bis zu 10 MB je Datei sprengen die Sicherungsdatei, und Fotos und Formulare von Familien gehoeren nicht auf ein Trainergeraet. Gesichert ist die Tabelle rufe_anhang (welcher Anhang an welchem Ruf hing).",
  eltern_einladung:"Pruefwerte der gedruckten Einladungskarten (v604). Nach einer Wiederherstellung druckt man neue Karten; eine gesicherte Liste wuerde nur alte Karten wieder gueltig machen. Wer sich angemeldet hat, steht in eltern_kinder – die ist gesichert."
};
async function backupExport(){
  if(!sbToken()){toast("Bitte zuerst als Trainer anmelden","err");return;}
  toast("Backup wird erstellt…");
  // Die trainer_poll-Tabellen fehlten hier von Anfang an – seit die Meetings Themen
  // sammeln, steckt darin Inhalt und nicht nur eine Terminabstimmung.
  // Das Trainingsturnier haengt seit v444 am Termin und liegt in der Datenbank -
  // damit gehoert es in die Sicherung.
  const tables=["kader","spielerprofile","termine","matchday","blitz_ratings","match_actions","ticker_events","nominierungen","anwesenheit","trainings_eval","event_bewertung","tagebuch_eintrag","kinder_codex",
                "trainer_poll","trainer_poll_slot","trainer_poll_vote","trainer_poll_thema","trainingsturnier",
                // Beim Saisonstart wandern die alten Spielerbewertungen hierher. Ohne diese
                // Zeile enthielte eine Sicherung nach dem Reset nur noch leere Tabellen.
                "archiv_bewertungen",
                /* Fehlten hier von Anfang an. Der Trainingsplan haelt seit v447 die ganze
                   Einheit (Phasen, Dauern, Uebungen) und ist damit die Vorbereitung
                   mehrerer Wochen - eine Sicherung ohne ihn sichert die Arbeit nicht,
                   um die es geht. */
                "trainingsplan","trainingsgruppen",
                /* v544: Katalog und Ausgaben. Ohne sie steht nach einer Wieder-
                   herstellung nirgends mehr, wer welches Trikot hat. */
                "ausstattung_artikel","ausstattung_ausgabe","material_posten",
                /* v585: Fehlte von Anfang an. Hier stehen die eigenen und die KI-Übungen
                   samt Skizze, dazu die Bibliotheks-Übungen mit dem Kennzeichen, ob der
                   Trainer sie bearbeitet hat – aus dem Repo ließe sich davon nur die
                   Bibliothek wiederherstellen. */
                "trainingsformen","uebung_umbenannt",   // v716: Umbenennungen alt → neu
                
                /* v590: Die Kinder-App. kind_konto haelt die Kopplung eines Kindergeraets
                   samt Tages-Appzeit, kind_sitzung die verbrauchten Minuten je Tag,
                   kind_kopplung die kurzlebigen Code-Hashes. Ohne sie muessten nach einer
                   Wiederherstellung alle Kindergeraete neu gekoppelt werden. */
                "kind_konto","kind_sitzung","kind_kopplung",
                /* v601: Fehlte seit der Anlage der Gegner-Datenbank. Sie hält Anschrift,
                   Platzart und den Ansprechpartner der anderen Vereine – Daten, die
                   mühsam zusammengetragen wurden und nirgends sonst stehen. Eine
                   Sicherung ohne sie hätte nach einer Wiederherstellung eine leere
                   Kontaktliste hinterlassen. */
                "gegner",
                /* v603: Bis hierher sicherte die Liste 29 der rund 100 Tabellen, und jede
                   Ergaenzung kam erst, nachdem etwas gefehlt hatte. Das Projekt laeuft im
                   kostenlosen Supabase-Plan, der selbst KEINE Sicherungen anlegt – diese
                   Datei ist die einzige. Seit v603 steht hier jede Tabelle, die die App
                   anspricht; was bewusst fehlt, steht mit Grund in SICHERUNG_AUSNAHMEN, und
                   der Pruefstand (v603) haelt beide Listen gegen den Code. Darunter die
                   Einwilligungen (dsgvo_consent, foto_consent), die Eltern-Zuordnung, ohne
                   die sich nach einer Wiederherstellung kein Elternteil anmelden kann, und
                   die Rollen (profiles). */
                "dsgvo_consent","foto_consent","eltern_kinder","profiles",
                "rueckmeldungen","einsatzzeiten","einheit_bewertung","punkte_log","quiz_progress",
                "trainingsvorlagen","team_config","team_einstellungen","team_notizen","team_polls","team_quests",
                "eltern_leitfaden","fairplay_regeln","fairplay_commit","periodisierung","skill_woche",
                "entwicklungsziele","nominierung_hinweis","probekinder","aufstellungen","taktik_templates",
                "trainer_notes","training_live","turnier_plan","turnier_spiele","heimturnier","stadionheft","heft_ausgabe","heft_audio_link","portraet_einreichung","portraet_trainerstimme","portraet_push_log","lob_push_log",
                "betreuung","event_helfer","event_mitbringen","event_puls","elterngespraech_wunsch",
                /* v644: Löschanträge – der Nachweis, dass und wann ein Antrag erledigt wurde. */
                "loeschantrag",
                /* v646: Grillhütten-Einteilung – wer an welchem Heimtermin dran ist. */
                "dienst_einteilung",
                /* v668: Tage, an denen eine Familie nicht eingeteilt wird. */
                "dienst_sperre",
                /* v671: vom Dienst befreite Familien (Trainerfamilien). */
                "dienst_befreit",
                /* v672: Protokoll jeder Änderung einer Rückmeldung. */
                "rueckmeldung_log",
                /* v670: Adler-Rufe – Räume, Rufe, Reaktionen, Fixierte, Meldungen, Stummschaltungen, Moderation, Gelesen. */
                "rufe_raum","rufe_nachricht","rufe_reaktion","rufe_fixiert","rufe_meldung","rufe_stumm","rufe_moderator","rufe_gelesen",
                /* v673: wer keine Rufe-Benachrichtigungen will; bis wann gemeldet ist. */
                "rufe_push_aus","rufe_push_stand","wiewars_push_log",
                "adlerschmiede","adlerschmiede_push_aus","adlerschmiede_push_log",   // v717
                "ticker_helfer",   // v728
                "portraet_verlauf",   // v732
                /* v705: eigene Ruhezeit je Konto und Meldungen, die auf ihr Ende warten. */
                "push_ruhezeit","push_warteschlange",
                /* v674: Abstimmungen und Stimmen (anonyme ohne Namen) */
                "rufe_umfrage","rufe_stimme","rufe_anhang",
                /* v650: Trainingsblöcke – Ziel, Zeitraum und die drei Einheiten im Wechsel. */
                "trainingsblock",
                "eltern_poll","eltern_poll_slot","eltern_poll_vote","ansagen","ansagen_gelesen",
                "kabine_config","kabine_lob","kabine_post","kabine_reporter","kabinen_wahl","kabinen_wahl_stimmen",
                /* v660: Angaben der Eltern (Name, Handy, Geburtstag). */
                "eltern_angaben",
                "kind_fanfacts","kind_kontakte","kind_pause","kind_selbstbild","kind_stimmung",
                /* v743: Fotoalbum je Kind (Dateien liegen in spielerfotos/<id>/album/). */
                "kind_foto",
                /* v744: Sonderkarten – Satz zum Spieltag und vergebene Momentkarten. */
                "sonderkarte",
                /* v751: Trainingsideen der Kinder aus „Mein Training“ (Kabine). */
                "kind_training",
                "album_fotos","album_kind","album_tausch","termin_media","ticker_claps","wochen_challenge",
                "fundbuero","waesche_log","teamkasse","kasse_umlagen","boerse_listings",
                /* v664: Kassenwart-Kasse – wer bezahlt hat, wer die Kasse führt. */
                "kasse_zahlung","kasse_team",
                "match_substitutions",
                /* v679: Tagebuch als Arbeitsmittel – Konsequenzen und To-dos je Punkt, Kinder je
                   Eintrag, die nie wieder vergebenen Buchstaben. ki_nachbereitung_lauf ist nur ein
                   Tageszähler (nur service_role) und gehört nicht in die Sicherung. */
                "tagebuch_punkt","tagebuch_kind","kader_alias_vergeben"];   // v636: fehlte (geschrieben über sbQueuedPost, die v603-Prüfung sah es nicht)
  const dump={_meta:{app:"U9 Adler Dellbrück",exported_at:new Date().toISOString(),tables,
                     nicht_gesichert:SICHERUNG_AUSNAHMEN}};
  try{
    /* Knapp hundert Abfragen nacheinander hiessen am Handy eine Viertelminute Warten. In
       Achtergruppen gleichzeitig: schnell genug, ohne die Verbindung zu fluten. */
    for(let i=0;i<tables.length;i+=8){
      await Promise.all(tables.slice(i,i+8).map(async t=>{
        /* v636: seitenweise (PostgREST liefert höchstens 1000 Zeilen je Abfrage) und Fehler
           zählen. Vorher hieß es „✓“, auch wenn Tabellen leer (401/403) oder abgeschnitten waren. */
        try{
          let alle=[], ab=0;
          for(;;){
            const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*`,{headers:{...sbAuthHeaders(),'Range-Unit':'items','Range':`${ab}-${ab+999}`}});
            if(!r.ok&&r.status!==206){ dump[t]={error:r.status}; return; }
            const teil=await r.json(); alle=alle.concat(teil||[]);
            if(!teil||teil.length<1000)break; ab+=1000;
          }
          dump[t]=alle;
        }catch(e){dump[t]={error:"fetch"};}
      }));
    }
    const fehler=tables.filter(t=>dump[t]&&!Array.isArray(dump[t]));
    dump._meta.fehler=fehler;
    const blob=new Blob([JSON.stringify(dump,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`adler-u9-backup-${isoLokal()}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    if(fehler.length)toast(`Backup heruntergeladen – aber ${fehler.length} Tabelle(n) fehlen: ${fehler.slice(0,4).join(", ")}${fehler.length>4?" …":""}. Bitte neu anmelden und wiederholen.`,"err");
    else toast("Backup heruntergeladen ✓ – alle Tabellen vollständig");
  }catch(e){toast("Backup fehlgeschlagen","err");}
}

/* Eltern-Setup-Übersicht: zeigt dem Trainer, welche Kinder Foto-Freigabe und Notfallkarte
   schon eingerichtet haben (beides trainer-lesbar), damit gezielt nachgehakt werden kann. */
async function setupTrainerOpen(){
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const notfall=new Set();
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?select=spieler_id`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)(await r.json()).forEach(x=>notfall.add(x.spieler_id));}catch(e){}
  if(typeof fotoConsentLoad==="function")await fotoConsentLoad(true);
  const fc=k=>(typeof fotoConsentFor==="function")?fotoConsentFor(k):{intern:!!k.foto_stadionheft_ok,video:false,public_ok:false};
  const rows=kids.map(k=>{const x=fc(k);return {name:k.name,intern:x.intern,video:x.video,pub:x.public_ok,nf:notfall.has(kaderId(k))};}).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const missIntern=rows.filter(r=>!r.intern).length, missNf=rows.filter(r=>!r.nf).length;
  const cell=ok=>`<span style="font-size:var(--s-karte)">${ok?"✅":"⛔"}</span>`;
  document.getElementById("setup-modal")?.remove();
  const modal=document.createElement("div"); modal.id="setup-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    ${mdlHead("setup-modal","🚀","Eltern-Setup","Foto-Freigaben & Notfallkarten je Kind","#0d9488")}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:10px">Offen: 📸 ${missIntern} ohne interne Foto-Freigabe · 🚑 ${missNf} ohne Notfallkarte. Foto-Spalten: 🖼️ intern · 🎥 Video · 🌍 öffentlich.</div>
    <div style="display:grid;grid-template-columns:1fr 34px 34px 34px 34px;gap:2px;font-size:var(--s-klein);font-weight:700;color:var(--text2);padding:0 4px 4px"><div>Kind</div><div style="text-align:center" title="app-intern">🖼️</div><div style="text-align:center" title="Trainingsvideo">🎥</div><div style="text-align:center" title="öffentlich">🌍</div><div style="text-align:center" title="Notfallkarte">🚑</div></div>
    ${rows.map(r=>`<div style="display:grid;grid-template-columns:1fr 34px 34px 34px 34px;gap:2px;align-items:center;padding:5px 4px;border-top:var(--border);font-size:var(--s-text)"><div>${esc(r.name)}</div><div style="text-align:center">${cell(r.intern)}</div><div style="text-align:center">${cell(r.video)}</div><div style="text-align:center">${cell(r.pub)}</div><div style="text-align:center">${cell(r.nf)}</div></div>`).join("")}
    ${(missIntern||missNf)?`<button class="btn btn-sm btn-p" style="width:100%;margin-top:12px" onclick="setupRemindPush()"><i class="ti ti-bell"></i>Eltern per Push erinnern</button>`:'<div style="text-align:center;color:var(--green);font-size:var(--s-text);font-weight:700;margin-top:12px">Alles eingerichtet 🎉</div>'}
    ${typeof fotoAmpelOpen==="function"?`<button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="fotoAmpelOpen()">🚦 Foto-Ampel &amp; Einwilligungstext</button>`:""}
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('setup-modal').remove()">Schließen</button>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
function setupRemindPush(){
  if(typeof pushSendToParents!=="function"){toast("Push nicht verfügbar","err");return;}
  pushSendToParents("🦅 Kurz einrichten?","Bitte im Eltern-Bereich unter 'Erste Schritte' Foto-Freigabe & Notfallkarte prüfen.",appRoot()+"?portal");
}
/* C: Pausen-Setter (Trainer). „pausiert bis" pro Kind; nimmt istRecovery (auto krank) als
   Vorschlag auf. Fließt in Nominierung/Prognose/Buddy ein (kind_pause). */
async function pausenOpen(){
  if(typeof pauseLoad==="function")await pauseLoad(true);
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const paused=kids.filter(k=>PAUSE_MAP[k.name]);
  const frei=kids.filter(k=>!PAUSE_MAP[k.name]);
  let reco=[]; try{ if(typeof RECOVERY!=="undefined"&&RECOVERY)reco=[...RECOVERY].filter(n=>!PAUSE_MAP[n]); }catch(e){}
  const defBis=new Date(Date.now()+14*864e5).toISOString().slice(0,10);
  document.getElementById("pause-modal")?.remove();
  const modal=document.createElement("div"); modal.id="pause-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    ${mdlHead("pause-modal","⏸","Pausen & Wiedereinstieg","","var(--amber)")}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:10px">Pausierte Kinder sind bei Prognose, Nominierung und Buddy-Auslosung automatisch raus – bis zum Datum. Grund optional, keine Diagnosen.</div>
    ${paused.length?`<div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:4px 0 2px">Aktuell pausiert</div>${paused.map(k=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:var(--border)"><span style="flex:1;font-size:var(--s-text)">${esc(k.name)} <span style="color:var(--amber);font-weight:700">· bis ${pauseBisLabel(k.name)}</span>${PAUSE_MAP[k.name].grund?`<span style="color:var(--text3);font-size:var(--s-klein)"> · ${esc(PAUSE_MAP[k.name].grund)}</span>`:""}</span><button class="btn btn-sm" title="Genesungsgrüße vom Team erlauben/stoppen (Familie vorher fragen)" onclick="pauseGruesse(${k._id},${PAUSE_MAP[k.name].gruesse_ok?"false":"true"})">${PAUSE_MAP[k.name].gruesse_ok?"💌 an":"💌 aus"}</button><button class="btn btn-sm" onclick="pauseEnd(${k._id})">Beenden</button></div>`).join("")}`:'<div style="font-size:var(--s-text);color:var(--text3);padding:4px 0">Aktuell pausiert niemand.</div>'}
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:14px 0 4px">Kind pausieren</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <select id="pause-kid" style="flex:1;min-width:120px;min-height:44px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;background:var(--surface);color:var(--text)">${frei.map(k=>`<option value="${k._id}">${esc(k.name)}</option>`).join("")}</select>
      <input type="date" id="pause-bis" value="${defBis}" style="min-height:44px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;background:var(--surface);color:var(--text)">
    </div>
    <input type="text" id="pause-grund" maxlength="80" placeholder="Grund (optional, keine Diagnosen)" style="width:100%;margin-top:6px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text);box-sizing:border-box">
    <label style="display:flex;align-items:flex-start;gap:8px;font-size:var(--s-klein);color:var(--text2);margin-top:8px;cursor:pointer"><input type="checkbox" id="pause-gruesse" style="margin-top:2px">💌 Team darf Genesungsgrüße schicken <span style="color:var(--text3)">(bitte vorher die Familie fragen – sichtbar wird nur „fehlt gerade", nie der Grund)</span></label>
    <button class="btn btn-p btn-sm" style="width:100%;margin-top:8px" onclick="pauseSetFromPicker()">⏸ Pausieren</button>
    ${reco.length?`<div style="font-size:var(--s-klein);color:#9a3412;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:7px 10px;margin-top:12px">🩹 Zuletzt krank gemeldet (letzte 14 T.): <b>${reco.map(esc).join(", ")}</b> – bei Bedarf hier als Pause setzen.</div>`:""}
    <button class="btn btn-sm" style="width:100%;margin-top:10px" onclick="document.getElementById('pause-modal').remove()">Schließen</button>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
async function pauseSetFromPicker(){
  const id=Number(document.getElementById("pause-kid")?.value);
  const bis=document.getElementById("pause-bis")?.value;
  const grund=(document.getElementById("pause-grund")?.value||"").trim()||null;
  const gruesse_ok=!!document.getElementById("pause-gruesse")?.checked;
  if(!id||!bis){toast("Kind und Datum wählen","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_pause?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:id,bis,grund,gruesse_ok,updated_at:new Date().toISOString()})});if(!r.ok){toast((typeof sbDeniedMsg==="function")?sbDeniedMsg(r):"Konnte nicht speichern","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Pause gesetzt ⏸"); if(typeof pauseClear==="function")pauseClear(); pausenOpen();
}
// I-A: Genesungsgrüße pro Pause an/aus (DSGVO: erst nach Rücksprache mit der Familie)
async function pauseGruesse(id,val){
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_pause?spieler_id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({gruesse_ok:val})});if(!r.ok&&r.status!==204){toast("Konnte nicht ändern","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast(val?"💌 Team darf jetzt Grüße schicken":"Grüße gestoppt");
  if(typeof pauseClear==="function")pauseClear(); pausenOpen();
}
async function pauseEnd(id){
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_pause?spieler_id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(!r.ok){toast("Konnte nicht beenden","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Pause beendet ✓"); if(typeof pauseClear==="function")pauseClear(); pausenOpen();
}
/* F1: Notfall-/Gesundheitskarten – Trainer-Leseansicht. Lädt alle Karten (RLS erlaubt dem
   Trainer nur SELECT) und legt sie zusätzlich in localStorage ab, damit sie am Platz auch
   OHNE Netz griffbereit sind. Kein Schreibweg – gepflegt wird ausschließlich von den Eltern. */
async function notfallTrainerOpen(){
  let rows=null, offline=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?select=*`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok){rows=await r.json();try{localStorage.setItem("adler_nf_cache",JSON.stringify({at:Date.now(),rows}));}catch(e){}}}catch(e){}
  /* Der Offline-Cache enthält Gesundheitsdaten von Kindern (Art. 9 DSGVO). Er gilt daher
     nur 24 h und wird danach verworfen statt beliebig lange auf dem Gerät zu liegen;
     beim Abmelden räumt sbClearToken ihn zusätzlich weg. */
  if(!rows){ try{
    const c=JSON.parse(localStorage.getItem("adler_nf_cache")||"null");
    if(c&&c.rows&&c.at&&(Date.now()-c.at)<24*3600*1000){rows=c.rows;offline=true;}
    else if(c)localStorage.removeItem("adler_nf_cache");
  }catch(e){} }
  rows=rows||[];
  const nameById={}; (typeof KADER!=="undefined"?KADER:[]).forEach(k=>{nameById[kaderId(k)]=k.name;});
  const flds=[["notfall_tel","☎️ Notfall"],["notfallkontakt","👤 Kontakt"],["allergien","⚠️ Allergien"],["medikamente","💊 Medikamente"],["krankenversicherung","🏥 Versicherung"],["blutgruppe","🩸 Blutgruppe"],["arzt","🩺 Arzt"],["hinweise","📝 Hinweise"]];
  const cards=rows.filter(x=>flds.some(f=>x[f[0]])).sort((a,b)=>String(nameById[a.spieler_id]||"").localeCompare(String(nameById[b.spieler_id]||"")));
  document.getElementById("nf-tr-modal")?.remove();
  const modal=document.createElement("div"); modal.id="nf-tr-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:520px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const tel=v=>{const num=String(v).replace(/[^\d+]/g,"");return num?`<a href="tel:${num}" style="color:var(--red);font-weight:700;text-decoration:none">${esc(v)}</a>`:esc(v);};
  c.innerHTML=`
    ${mdlHead("nf-tr-modal","🚑","Notfallkarten",`Von den Eltern gepflegt · schreibgeschützt${offline?' · <b style="color:var(--amber)">📴 Offline-Stand</b>':""} · vertraulich`,"var(--red)")}
    ${cards.length?cards.map(x=>`<div style="border:var(--border-s);border-left:3px solid var(--red);border-radius:10px;padding:10px 12px;margin-bottom:8px">
        <div style="font-weight:800;font-size:var(--s-karte);margin-bottom:4px">${esc(nameById[x.spieler_id]||("Kind #"+x.spieler_id))}</div>
        ${flds.filter(f=>x[f[0]]).map(f=>`<div style="font-size:var(--s-text);padding:2px 0"><span style="color:var(--text2)">${f[1]}:</span> ${f[0]==="notfall_tel"?tel(x[f[0]]):esc(x[f[0]])}</div>`).join("")}
      </div>`).join(""):'<div style="text-align:center;color:var(--text3);font-size:var(--s-text);padding:24px">Noch keine Notfallkarten hinterlegt.<br>Die Eltern füllen sie im Eltern-Bereich (🚑 Notfallkarte).</div>'}
    <button class="btn btn-sm" style="margin-top:6px" onclick="document.getElementById('nf-tr-modal').remove()">Schließen</button>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
/* Die Kaderliste kommt aus dem KADER, nicht aus den Bewertungen. Bis v459 stand hier
   `Object.keys(DB)` – die Namen aus `spielerprofile`. Nach dem Saisonstart-Reset (v446)
   ist diese Tabelle leer, und damit war die ganze Kader-Ansicht leer: „Kein Spieler für
   diesen Filter", obwohl 14 Kinder im Kader stehen. Eine Mannschaft hoert nicht auf zu
   existieren, weil noch niemand bewertet wurde. Bewertungen sind jetzt eine SPALTE der
   Zeile, nicht die Bedingung dafuer, dass es sie gibt. */
function renderKader(){
  const wrap=document.getElementById("kader-content");
  const bewertet=Object.keys(DB);
  const aktive=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false).map(k=>k.name);
  // Ohne Kader vom Server (401, offline) wenigstens die bewerteten Namen zeigen
  const names=aktive.length?aktive:bewertet.slice().sort();
  const letzter=n=>{const s=DB[n];return (s&&s.length)?s[s.length-1]:null;};
  if(!window._dbLoaded&&!names.length){wrap.innerHTML=skeletonRows(3);return;} // L2
  if(!names.length){
    wrap.innerHTML='<div class="empty"><i class="ti ti-users"></i>Noch kein Kind im Kader. <a href="#" onclick="kaderEditOpen();return false" style="color:var(--blue-text);font-weight:700">Spieler verwalten ›</a></div>';
    renderRauteMap([]); return;
  }
  const filtered=names.filter(n=>{
    const lat=letzter(n);
    if(activeFilter==="all")return true;
    if(activeFilter==="tw")return (lat&&lat.tw===true)||getKader(n)?.tw;
    return lat?lat.position===activeFilter:false;   // eine Rolle hat nur, wer bewertet ist
  });
  if(!filtered.length){wrap.innerHTML='<div class="empty"><i class="ti ti-filter"></i>Kein Spieler für diesen Filter</div>';renderRauteMap(bewertet);return;}
  const dimCols=["var(--blue)","#7c3aed","var(--amber)","var(--green)","#0e7490"];
  // Kader-Werkzeuge als einheitliche Kachel-Reihe (Design-Sprache), nicht mehr rechtsbündig verstreut.
  /* v683: Pausen, Eltern-Setup und Notfallkarten standen hier als dritte Knopfreihe über der
     Liste – alle drei haben ihre Kachel auf der Team-Übersicht bzw. unter Orga · Einstellungen.
     Solange niemand bewertet ist, zeigt die Liste nur Nummer, Name und den Weg zur Bewertung:
     sieben leere Spalten mit „noch nicht bewertet“ waren Rauschen. */
  const irgendwerBewertet=filtered.some(n=>letzter(n));
  let html=irgendwerBewertet
    ?`<table class="kader-t"><thead><tr><th>Spieler</th><th>Rolle</th><th>Grp</th><th>Tech.</th><th>Wahr.</th><th>Phys.</th><th>Ges.</th><th>Pot.</th><th>Von</th><th></th></tr></thead><tbody>`
    :`<table class="kader-t kader-schlank"><tbody>`;
  filtered.forEach(name=>{
    const lat=letzter(name);
    const kd=getKader(name);
    const nrBadge=kd&&kd.nr?`<span style="font-size:var(--s-klein);font-weight:700;color:var(--text3);background:var(--surface2);border:var(--border);border-radius:8px;padding:1px 5px;margin-right:4px">${kd.nr}</span>`:"";
    if(!lat){
      /* Noch nicht bewertet: das Kind steht trotzdem im Kader – mit dem Weg zur ersten
         Bewertung statt einer Zeile voller Nullen, die Koennen vortaeuschen wuerden. */
      html+=`<tr>
        <td><div style="font-weight:600;font-size:var(--s-text)">${nrBadge}${esc(name)}${kd&&kd.tw?' <span style="font-size:var(--s-klein);color:var(--teal);font-weight:700">🥅</span>':""}</div></td>
        ${irgendwerBewertet?`<td colspan="7" style="font-size:var(--s-klein);color:var(--text2)">noch nicht bewertet</td>`:""}
        <td style="white-space:nowrap"><button class="btn btn-sm" onclick="kaderBewerten('${jsq(name)}')" title="Erste Bewertung anlegen" aria-label="${esc(name)} bewerten"><i class="ti ti-clipboard-plus"></i>${irgendwerBewertet?"":"Bewerten"}</button></td>
      </tr>`;
      return;
    }
    const sc=safeParse(lat.scores,[0,0,0,0,0]);
    const isTw=lat.tw===true||getKader(name)?.tw;
    const prim=lat.position||"flex";
    const bMap={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts",flex:"rb-flex"};
    const lMap={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer L",flitzer_r:"Flitzer R",flex:"Flexibel"};
    const tot=lat.total_score||0,pot=lat.pot_score||0;
    const grpB=""; // A/B-Label abgeschafft (Evidenz: keine Niveau-Etiketten bei 8-Jaehrigen)
    const mini=val=>{let s='<div class="sm">';for(let i=0;i<5;i++)s+=`<div class="sm-s${val>=(i+1)*20?" on":""}"></div>`;return s+'</div>';};
    const snBadge=DB[name].length>1?`<span title="${DB[name].length} Bewertungen – mehr = verlässlicher" style="font-size:var(--s-klein);color:var(--teal);font-weight:600;margin-left:4px">×${DB[name].length}</span>`:"";
    const _tr=(typeof playerTrend==="function")?playerTrend(name):{delta:0,conf:0};
    const _vg=(typeof bewVergleich==="function")?bewVergleich(name):null;   // v637: Runde gegen Runde
    if(_vg&&_vg.runden>=2){_tr.delta=_vg.hoch.length?3:(_vg.runter.length?-3:0);_tr.conf=_vg.runden;}
    const trArrow=_tr.delta>2?`<span title="gewachsen: ${esc(((_vg&&_vg.hoch)||[]).join(", "))}" style="color:var(--green);font-size:var(--s-text);font-weight:800"> ↗</span>`:_tr.delta<-2?`<span title="gesunken: ${esc(((_vg&&_vg.runter)||[]).join(", "))}" style="color:var(--red);font-size:var(--s-text);font-weight:800"> ↘</span>`:_tr.conf>=2?`<span title="stabil" style="color:var(--text3);font-size:var(--s-text)"> →</span>`:"";
    const _hist=(DB[name]||[]).map(s=>s.total_score||0);
    const _spark=(typeof sparklineSVG==="function")?sparklineSVG(_hist):"";
    html+=`<tr>
      <td><div style="font-weight:600;font-size:var(--s-text)">${getKader(name)?.nr?`<span style="font-size:var(--s-klein);font-weight:700;color:var(--text3);background:var(--surface2);border:var(--border);border-radius:8px;padding:1px 5px;margin-right:4px">${getKader(name).nr}</span>`:""}${esc(name)}${isTw?" 🥅":""}</div><div style="font-size:var(--s-klein);color:var(--text2)">${esc(lat.datum||'')}${snBadge}</div></td>
      <td><span class="rbadge ${bMap[prim]||'rb-flex'}">${isTw?`TW / ${esc(lMap[prim]||prim)}`:esc(lMap[prim]||prim)}</span>${lat.sek_rolle&&!isTw?`<br><span style="font-size:var(--s-klein);color:var(--text2)">${esc(lat.sek_rolle)}</span>`:""}</td>
      <td>${grpB}</td>
      ${[0,1,2].map(i=>`<td><span style="font-size:var(--s-klein);font-weight:600;color:${dimCols[i]}">${sc[i]||0}%</span>${mini(sc[i]||0)}</td>`).join("")}
      <td><span style="font-weight:700;font-size:var(--s-text)">${tot}%</span>${trArrow}${_spark}</td>
      <td><span style="font-size:var(--s-klein);color:var(--teal);font-weight:600">${pot}%</span></td>
      <td style="font-size:var(--s-klein);color:var(--text2)">${esc(lat.trainer||'–')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" data-edit-player data-name="${esc(name)}" data-snap-idx="${DB[name].length-1}" title="Laden"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-d" data-del-player data-name="${esc(name)}"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  });
  html+="</tbody></table>";
  const offen=filtered.filter(n=>!letzter(n)).length;
  wrap.innerHTML='<div class="kader-wrap">'+html+'</div>'
    +(offen?`<div class="kader-hint">${offen===filtered.length?"Noch niemand bewertet":`${offen} von ${filtered.length} Kindern ${offen===1?"ist":"sind"} noch nicht bewertet`} – nach dem Saisonstart normal.</div>`:"")
    +(irgendwerBewertet?'<div class="kader-hint">Technik, Wahrnehmung und Physis stehen je Spieler im <b>Profil</b>.</div>':"");
  const rb=bewertet.filter(n=>names.includes(n));
  renderRauteMap(rb);   // die Raute kennt nur Bewertete
  // v683: Rollen-Filter und Rauten-Besetzung gibt es erst, wenn jemand eine Rolle hat
  const frow=document.querySelector("#view-kader .frow"); if(frow)frow.hidden=!rb.length;
  document.querySelectorAll("#view-kader .kader-raute").forEach(el=>{el.hidden=!rb.length;});
}
/* Erste Bewertung aus der Kaderliste heraus starten: Reiter wechseln, Kind vorwaehlen. */
function kaderBewerten(name){
  go("bew");
  setTimeout(()=>{
    const sel=document.getElementById("p-name");
    if(sel){
      sel.value=name;
      /* v635: onPlayerSelect setzt Kriterien und Stammdaten zurück. Vorher standen hier nur
         onChange & Co. – die Werte des zuvor bewerteten Kindes blieben angehakt und wären
         unter dem neuen Namen gespeichert worden. */
      if(typeof onPlayerSelect==="function")onPlayerSelect();
    }
    if(typeof toast==="function")toast(name+" – Bewertung starten");
  },120);
}

function renderRauteMap(names){
  const wrap=document.getElementById("raute-map");
  if(!names.length){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:var(--s-text)">Noch keine Spieler bewertet</div>';return;}
  const posMap={aufpasser:[],flitzer_l:[],flitzer_r:[],jaeger:[],flex:[]};
  const twList=[];
  names.forEach(n=>{
    const lat=DB[n][DB[n].length-1];
    const p=lat.position||"flex";
    const isTw=lat.tw===true||getKader(n)?.tw;
    if(isTw){twList.push(n);}
    else{(posMap[p]||posMap.flex).push(n);}
  });
  const cfg={aufpasser:{label:"Aufpasser",col:"var(--blue)",bg:"#e8f0fe"},flitzer_l:{label:"Flitzer L",col:"var(--amber)",bg:"#fffbeb"},flitzer_r:{label:"Flitzer R",col:"#15803d",bg:"#f0fdf4"},jaeger:{label:"Jäger",col:"#c2410c",bg:"#fff7ed"}};
  let html="";
  // TW row - show priority
  const tw1=twList.filter(n=>{const k=getKader(n);return k&&k.twPrio===1;});
  const tw2=twList.filter(n=>{const k=getKader(n);return k&&k.twPrio===2;});
  html+='<div style="padding:8px 10px;background:var(--yellow-bg);border:1px solid #fcd34d;border-radius:var(--r);margin-bottom:8px;font-size:var(--s-text);color:var(--yellow)">';
  html+='<span style="font-weight:700">🥅 Torwart (+1):</span> ';
  if(tw1.length>0) html+='<span style="font-weight:600">'+tw1.map(esc).join(', ')+'</span> <span style="font-size:var(--s-klein);opacity:.7">(primär)</span>';
  if(tw2.length>0) html+=(tw1.length>0?' · ':'')+tw2.map(esc).join(', ')+' <span style="font-size:var(--s-klein);opacity:.7">(Option)</span>';
  if(twList.length===0) html+='<span style="font-style:italic;opacity:.6">Noch nicht bewertet</span>';
  html+='</div>';
  html+=`<div class="rk-grid">
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.jaeger.col};background:${cfg.jaeger.bg}"><div class="rk-pos-lbl" style="color:${cfg.jaeger.col}">${cfg.jaeger.label}</div>${posMap.jaeger.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:var(--s-klein);color:${cfg.jaeger.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.flitzer_l.col};background:${cfg.flitzer_l.bg}"><div class="rk-pos-lbl" style="color:${cfg.flitzer_l.col}">${cfg.flitzer_l.label}</div>${posMap.flitzer_l.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:var(--s-klein);color:${cfg.flitzer_l.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.flitzer_r.col};background:${cfg.flitzer_r.bg}"><div class="rk-pos-lbl" style="color:${cfg.flitzer_r.col}">${cfg.flitzer_r.label}</div>${posMap.flitzer_r.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:var(--s-klein);color:${cfg.flitzer_r.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.aufpasser.col};background:${cfg.aufpasser.bg}"><div class="rk-pos-lbl" style="color:${cfg.aufpasser.col}">${cfg.aufpasser.label}</div>${posMap.aufpasser.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:var(--s-klein);color:${cfg.aufpasser.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
  </div>`;
  if(posMap.flex.length>0)html+=`<div style="margin-top:.75rem;font-size:var(--s-klein);color:var(--text2)"><i class="ti ti-adjustments" style="font-size:var(--s-text)"></i> Noch ohne feste Rolle: ${posMap.flex.map(n=>esc(n)).join(", ")}</div>`;
  wrap.innerHTML=html;
}

async function delPlayer(name){
  if(!confirm(`Alle Bewertungen von '${name}' löschen?`))return;
  try{
    // Prefer:return=representation, damit ein von RLS still gefiltertes Delete (0 betroffene
    // Zeilen -> trotzdem HTTP 200/204) NICHT als Erfolg gemeldet wird
    const r=await fetch(`${SB_URL}/rest/v1/spielerprofile?name=eq.${encodeURIComponent(name)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=representation'})});
    if(sbCheck401(r))return;
    if(r.ok){
      const deleted=await r.json().catch(()=>[]);
      if(deleted.length>0){await loadDB();renderKader();toast(name+" gelöscht");}
      else{toast("Löschen fehlgeschlagen – keine Berechtigung oder Datensatz nicht gefunden","err");}
    }else{toast("Fehler beim Löschen","err");}
  }catch{toast("Netzwerkfehler","err");}
}

async function delSnapshot(name,datum,id){
  if(!confirm(`Bewertung von ${name} (${datum}) löschen?`))return;
  try{
    let url;
    if(id&&id!=='undefined'&&id!==''){
      url=`${SB_URL}/rest/v1/spielerprofile?id=eq.${encodeURIComponent(id)}`;
    } else {
      url=`${SB_URL}/rest/v1/spielerprofile?name=eq.${encodeURIComponent(name)}&datum=eq.${encodeURIComponent(datum)}`;
    }
    const r=await fetch(url,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=representation'})});
    if(sbCheck401(r))return;
    if(r.ok){
      const deleted=await r.json().catch(()=>[]);
      if(deleted.length>0){
        await loadDB();
        renderVerlauf();
        showSt("save-status",`Bewertung von ${name} (${datum}) gelöscht`,"ok");
      } else {
        toast("Löschen fehlgeschlagen – keine Berechtigung oder Datensatz nicht gefunden","err");
      }
    } else {
      toast("Fehler beim Löschen","err");
    }
  }catch(e){toast("Netzwerkfehler: "+e.message,"err");}
}

/* ═══════════════════════════════════
   PROFIL VIEW
═══════════════════════════════════ */
/* v688: Profil und Entwicklung öffneten mit einer leeren Seite und einer Auswahlliste – zwei Tipps
   bis zum ersten Kind, und ohne jede Bewertung war die Liste leer, ohne dass die Seite sagte, warum.
   Jetzt stehen die Kinder als Namenskacheln da (ein Tipp), und ohne Bewertung sagt ein Satz,
   ab wann es hier etwas zu sehen gibt. Die Auswahlliste oben bleibt zum Wechseln. */
function spielerWahlLeer(selId,icon,was){
  const sel=document.getElementById(selId);
  const namen=sel?[...sel.options].map(o=>o.value).filter(Boolean):[];
  if(sel)sel.style.display=namen.length?"":"none";   // eine Liste nur mit „— Spieler wählen —“ ist keine Wahl
  if(!namen.length){
    const frei=typeof bewFreigegeben==="function"&&bewFreigegeben();
    const ab=typeof bewAbText==="function"?bewAbText():"";
    const wann=frei?"":`<br>Bewertet wird ${ab?"ab dem "+ab:"ab dem Ende der Hinrunde"}.`;
    return `<div class="empty"><i class="ti ${icon}"></i>Noch kein Kind bewertet – ${was} entsteht aus den Bewertungen.${wann}</div>`;
  }
  return `<div class="sl">Welches Kind?</div><div class="spieler-wahl">${namen.map(n=>`<button type="button" class="spieler-wahl-btn" data-name="${esc(n)}" onclick="spielerWahl('${selId}',this.dataset.name)">${esc(n)}</button>`).join("")}</div>`;
}
function spielerWahl(selId,name){
  const sel=document.getElementById(selId); if(!sel)return;
  sel.value=name; sel.dispatchEvent(new Event("change"));
}
let rchart=null,rchartTimer=0;
function renderProfil(){
  const name=document.getElementById("psel-profil").value;
  if(!window._dbLoaded&&!Object.keys(DB).length){document.getElementById("profil-content").innerHTML=skeletonRows(3);return;} // L2
  if(!name){document.getElementById("profil-content").innerHTML=spielerWahlLeer("psel-profil","ti-user-circle","das Profil");return;}
  const snaps=DB[name]||[];if(!snaps.length){document.getElementById("profil-content").innerHTML=spielerWahlLeer("psel-profil","ti-user-circle","das Profil");return;}
  if(!window.Chart){ensureChart().then(renderProfil).catch(()=>{});return;} // Chart lazy laden
  const lat=snaps[snaps.length-1];
  const sc=safeParse(lat.scores,[0,0,0,0,0]);
  const tot=lat.total_score||0,pot=lat.pot_score||0;
  const isTw=lat.tw===true||getKader(name)?.tw;
  const dims=isTw?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
  const prim=lat.prim_rolle||"–",sek=lat.sek_rolle||"–";
  const bMap={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts"};
  const grpB=""; // A/B-Label abgeschafft
  const dl=dims.map(d=>d.label.split(" ")[0]);
  const cols=dims.map(d=>d.col);
  const scPad=dl.map((_,i)=>sc[i]||0);
  const summary=lat.summary||"";

  // Stärken & Felder aus dem Fazit extrahieren (schnelle Anzeige)
  const st=[];const ef=[];
  (lat.fazit||"").split("\n").forEach(line=>{
    if(line.startsWith("  + "))st.push(line.slice(4));
    if(line.startsWith("  → "))ef.push(line.slice(4));
  });

  const printBtn=document.getElementById("print-profil-btn");
  if(printBtn)printBtn.style.display=name?"inline-flex":"none";
  const zertBtn=document.getElementById("zert-profil-btn");
  if(zertBtn)zertBtn.style.display=name?"inline-flex":"none";
  const cardBtn=document.getElementById("card-profil-btn");
  if(cardBtn)cardBtn.style.display=name?"inline-flex":"none";
  document.getElementById("profil-content").innerHTML=`
    <div class="player-card">
      <div class="av ${isTw?"tw":""}">${esc(name.slice(0,2).toUpperCase())}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:var(--s-karte)">${esc(name)}${isTw?" 🥅":""}</div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:4px">
          <span class="rbadge ${bMap[lat.position]||'rb-flex'}">${esc(prim)}</span>
          ${!isTw?`<span style="font-size:var(--s-klein);color:var(--text2)">Sek: ${esc(sek)}</span>`:""}
          ${grpB}
          <span style="font-size:var(--s-klein);color:var(--text2)">${esc(lat.trainer||"")} · ${esc(lat.datum||"")}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--s-klein);color:var(--text2)">Entwicklungsstand</div>
        <div style="font-size:26px;font-weight:700;color:var(--blue-text)">${tot}%</div>
        <div style="font-size:var(--s-klein);color:var(--teal);font-weight:500">Entwicklungstempo ~${pot}%</div>
        ${typeof raeInfo==="function"&&raeInfo(getKader(name)?.geb)?`<div style="font-size:var(--s-klein);color:var(--text3);max-width:150px;margin-top:2px">${raeInfo(getKader(name)?.geb)}</div>`:""}
      </div>
    </div>

    ${summary?`<div class="summary-box">
      <h3><i class="ti ti-sparkles" style="font-size:var(--s-text)"></i>Zusammenfassung</h3>
      <div class="summary-text">${esc(summary)}</div>
      <div class="summary-tags">
        ${st.slice(0,3).map(s=>`<span class="stag pos">+ ${esc(s.split("–")[0].trim())}</span>`).join("")}
        ${ef.slice(0,2).map(e=>`<span class="stag neg">→ ${esc(e.split(":")[0].trim())}</span>`).join("")}
      </div>
    </div>`:""}

    <div class="radar-profil-wrap">
      <div style="position:relative;height:270px"><canvas id="rc" role="img" aria-label="Radar ${esc(name)}">Spielerprofil ${esc(name)}</canvas></div>
      <div>${dl.map((l,i)=>`<div class="rl-item"><div class="rl-nm" style="color:${cols[i]}">${l}</div><div class="rl-bw"><div class="rl-bf" style="width:${scPad[i]}%;background:${cols[i]}"></div></div><div class="rl-vl">${scPad[i]}%</div></div>`).join("")}</div>
    </div>

    ${st.length>0||ef.length>0?`<div class="massnahmen-box">
      <div class="mb-title"><i class="ti ti-list-check" style="font-size:var(--s-karte)"></i>Konkrete Maßnahmen & Erkenntnisse</div>
      ${st.slice(0,5).map(s=>`<div class="mb-item"><div class="mb-icon" style="background:#dcfce7"><i class="ti ti-plus" style="font-size:var(--s-klein);color:var(--green)"></i></div><div class="mb-text">${esc(s)}</div></div>`).join("")}
      ${ef.slice(0,5).map(e=>`<div class="mb-item"><div class="mb-icon" style="background:#fee2e2"><i class="ti ti-arrow-right" style="font-size:var(--s-klein);color:var(--red)"></i></div><div class="mb-text">${esc(e)}</div></div>`).join("")}
    </div>`:""}

    <div id="profil-selbstbild"></div>
    <div class="sl"><i class="ti ti-file-description"></i>Vollständiges Profil</div>
    <div class="detail-box"><div class="fazit-display">${esc(lat.fazit||'–')}</div></div>
    <div class="brow">
      <button class="btn" data-edit-player data-name="${esc(name)}" data-snap-idx="${snaps.length-1}"><i class="ti ti-edit"></i>Profil bearbeiten</button>
      <button class="btn" onclick="entwicklungsReport()"><i class="ti ti-file-text"></i>Entwicklungs-Report</button>
    </div>`;
  profilSelbstbildLoad(name); // I-C: Selbstbild des Kindes aus der Kabine (falls vorhanden)

  if(rchart){rchart.destroy();rchart=null;}
  clearTimeout(rchartTimer);
  rchartTimer=setTimeout(()=>{
    const ctx=document.getElementById("rc");if(!ctx)return;
    rchart=new Chart(ctx,{type:"radar",data:{labels:dl,datasets:[{label:name,data:scPad,backgroundColor:`${cols[0]}18`,borderColor:cols[0],borderWidth:2,pointBackgroundColor:cols,pointRadius:4,pointHoverRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:100,ticks:{stepSize:25,font:{size:9},backdropColor:"transparent"},pointLabels:{font:{size:11},color:cols},grid:{color:"rgba(100,116,139,.15)"},angleLines:{color:"rgba(100,116,139,.15)"}}}}});
  },80);
}

/* ── I-C: Selbstbild des Kindes im Trainer-Profil – „Meine Stärken" aus der Kabine.
   Bewusst KEIN Overlay über das Trainer-Radar (andere Skala, andere Fragen):
   die Kinderstimme steht für sich, als Gesprächsanlass. */
const KAB_SELBST_FRAGEN=[
  {k:"dribbeln",emo:"⚽",t:"Dribbeln"},
  {k:"passen",emo:"🎯",t:"Passen"},
  {k:"tore",emo:"🥅",t:"Tore schießen"},
  {k:"mut",emo:"🦁",t:"Mut im Zweikampf"},
  {k:"team",emo:"🤝",t:"Anfeuern & Teamgeist"}
];
const KAB_SELBST_STUFEN={1:["🌱","übe ich noch"],2:["🙂","geht schon gut"],3:["💪","kann ich super"]};
async function profilSelbstbildLoad(name){
  const el=document.getElementById("profil-selbstbild"); if(!el)return;
  const sid=((typeof KADER!=="undefined"?KADER:[]).find(k=>k.name===name)||{})._id;
  if(!sid){el.innerHTML="";return;}
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_selbstbild?spieler_id=eq.${sid}&select=datum,antworten&order=datum.desc&limit=1`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok)row=((await r.json())||[])[0]||null;}catch(e){}
  const slot=document.getElementById("profil-selbstbild"); if(!slot)return;
  if(!row){slot.innerHTML="";return;}
  const a=row.antworten||{};
  const ueben=KAB_SELBST_FRAGEN.filter(f=>a[f.k]===1);
  slot.innerHTML=`<div class="card" style="padding:12px 14px;margin:10px 0;border-left:3px solid #7c3aed">
    <div style="font-weight:800;font-size:var(--s-text);margin-bottom:6px">💪 So sieht ${esc(name)} sich selbst <span style="font-weight:400;color:var(--text2);font-size:var(--s-klein)">(aus der Kabine · ${esc(row.datum)})</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${KAB_SELBST_FRAGEN.map(f=>{const s=KAB_SELBST_STUFEN[a[f.k]];return s?`<span style="font-size:var(--s-klein);font-weight:700;padding:4px 9px;border-radius:12px;background:var(--surface2)">${f.emo} ${esc(f.t)}: ${s[0]}</span>`:"";}).join("")}
    </div>
    ${ueben.length?`<div style="font-size:var(--s-text);color:#7c3aed;font-weight:700;margin-top:8px">🌱 Will üben: ${ueben.map(f=>esc(f.t)).join(", ")} – guter Aufhänger fürs nächste Lob oder Entwicklungsziel.</div>`:""}
  </div>`;
}
/* ═══════════════════════════════════
   SAISON-ZERTIFIKAT (Print, self-contained)
═══════════════════════════════════ */
function saisonLabel(){
  // Saison läuft Jul–Jun: ab Juli gehört das laufende Jahr zur Saison JJJJ/JJ+1
  const d=new Date(),y=d.getFullYear();
  const start=d.getMonth()>=6?y:y-1;
  return `${start} / ${start+1}`;
}

/* ═══════════════════════════════════
   ADLER WRAPPED (Phase 9-H) – Saison-Rückblick im Story-Format.
   Holt die serverseitig aggregierten Saison-Daten (RPC get_season_wrapped,
   umgeht den PostgREST-1000-Zeilen-Cap) und zeigt sie als Vollbild-Slides
   mit Auto-Advance, Tap-Navigation (links zurück / rechts weiter) und
   Konfetti-Finale. Reines Vanilla-JS/CSS, confetti() recycelt.
═══════════════════════════════════ */
const AWRAP_MS=4800; // Anzeigedauer je Slide
let awrapIdx=0, awrapSlides=[], awrapTimer=0, awrapFotoUrls=[]; // FEAT X: Galerie-Blob-URLs
// FEAT X: Saison-Galerie fuer Wrapped laden (Trainer-only RPC), Fotos als Blob-URLs
// (DOM-Background, kein Canvas -> kein Taint). Alte URLs revoken (Speicher).
async function wrappedLoadFotos(saison){
  awrapFotoUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});
  awrapFotoUrls=[];
  let paths=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/season_gallery`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_saison:saison||null})});if(r.ok)paths=((await r.json())||[]).map(x=>x.foto_path).filter(Boolean);}catch(e){}
  const urls=await Promise.all(paths.slice(0,8).map(async p=>{
    try{const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${p}`,{headers:{'Authorization':'Bearer '+sbToken()}});if(!r.ok)return null;return URL.createObjectURL(await r.blob());}catch(e){return null;}
  }));
  awrapFotoUrls=urls.filter(Boolean);
  return awrapFotoUrls;
}
// HOTFIX 7: Wrapped ist standardmäßig gesperrt (Teaser). Trainer kann trotzdem eine Vorschau öffnen.
async function adlerWrappedTeaser(){
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  const ja=await frageJaNein({
    emoji:"🎬", titel:"Adler Wrapped", unter:"Der große Saison-Rückblick",
    text:"Die volle Story gibt's am Saisonende.\n\nMöchtest du jetzt schon eine Vorschau mit dem aktuellen Stand ansehen?",
    ja:"Vorschau ansehen", nein:"Später"});
  if(ja)adlerWrappedOpen();
}
async function adlerWrappedOpen(){
  const btn=document.getElementById("wrapped-btn");
  if(btn)btn.disabled=true;
  let d=null;
  const call=body=>fetch(`${SB_URL}/rest/v1/rpc/get_season_wrapped`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{ const r=await call({p_saison:saisonLabel()}); if(sbCheck401(r)){if(btn)btn.disabled=false;return;} if(r.ok)d=await r.json(); }catch(e){}
  // Fallback: leere Saison → gesamte Historie zeigen
  if(d&&!d.spiele&&!d.trainings&&!d.tore&&!d.aktionen){ try{ const r=await call({p_saison:null}); if(r.ok)d=await r.json(); }catch(e){} }
  if(!d){if(btn)btn.disabled=false;toast("Rückblick konnte nicht geladen werden","err");return;}
  const fotos=await wrappedLoadFotos(d.saison||saisonLabel()); // FEAT X
  if(btn)btn.disabled=false;
  adlerWrappedShow(d,fotos);
}
function adlerWrappedSlides(d,fotos){
  const g=(a,b)=>`linear-gradient(160deg,${a},${b})`;
  const S=[];
  S.push({bg:g("#0f172a","#1e3a8a"),html:`<div>
    <div class="aw-pop" style="font-size:64px">🦅</div>
    <div class="aw-pop d1" style="font-size:30px;font-weight:900;letter-spacing:1px;margin-top:8px">ADLER WRAPPED</div>
    <div class="aw-pop d2" style="font-size:var(--s-karte);opacity:.85;margin-top:6px">Saison ${esc(String(d.saison||""))}</div>
    <div class="aw-pop d3" style="font-size:var(--s-text);opacity:.6;margin-top:24px">Tippe rechts → weiter · links ← zurück</div></div>`});
  S.push({bg:g("#155e75","#06b6d4"),html:`<div>
    <div class="aw-pop" style="font-size:var(--s-karte);opacity:.85;text-transform:uppercase;letter-spacing:2px">Ihr wart fleißig</div>
    <div class="aw-big aw-pop d1">${d.spiele||0}</div>
    <div class="aw-pop d1" style="font-size:var(--s-teil);font-weight:800">Spiele & Turniere</div>
    <div class="aw-pop d2" style="font-size:var(--s-karte);opacity:.85;margin-top:18px">und <b>${d.trainings||0}</b> Trainingseinheiten 💪</div></div>`});
  /* v752 (PO 04.10.: Tore und Aktionen raus, solange wir sie nicht erfassen): die Folien „Gemeinsam erzielt“
     (Tore) und „Ballaktionen“ entfallen. */
  S.push({bg:g("#065f46","#10b981"),html:`<div>
    <div class="aw-pop" style="font-size:var(--s-karte);opacity:.85;text-transform:uppercase;letter-spacing:2px">Team-Missionen</div>
    <div class="aw-big aw-pop d1">${d.quests_geschafft||0}</div>
    <div class="aw-pop d1" style="font-size:var(--s-teil);font-weight:800">Quests geknackt 🏆</div></div>`});
  const awards=[];
  // v637: kein Torschützenkönig – Ergebnisse zählen in der U9 nicht („Fairness vor Ergebnis“); die Tore stehen als Teamzahl oben.
  if(d.fleissigste&&d.fleissigste.name)awards.push(["🏃","Fleißbiene (Training)",d.fleissigste]);
  // v752: kein „Aktivposten“ mehr – er zählte Ballaktionen, die wir nicht erfassen

  const awardsHtml=awards.length?awards.map((a,i)=>`<div class="aw-pop d${i+1}" style="background:rgba(255,255,255,.14);border-radius:14px;padding:11px 16px;margin:8px auto;max-width:280px">
    <div style="font-size:26px">${a[0]}</div>
    <div style="font-size:var(--s-teil);font-weight:800">${esc(a[2].name)}</div>
    <div style="font-size:var(--s-text);opacity:.85">${a[1]} · ${a[2].wert}</div></div>`).join("")
    :`<div class="aw-pop" style="opacity:.85;font-size:var(--s-karte)">Kommt fleißig zum Training – dann gibt's hier eure Helden! 🦅</div>`;
  S.push({bg:g("#1e3a8a","#3b82f6"),confetti:true,html:`<div>
    <div class="aw-pop" style="font-size:var(--s-seite);font-weight:900;margin-bottom:14px">🏅 Eure Saison-Helden</div>${awardsHtml}</div>`});
  S.push({bg:g("#7c2d12","#dc2626"),confetti:true,html:`<div>
    <div class="aw-pop" style="font-size:58px">🦅❤️</div>
    <div class="aw-pop d1" style="font-size:26px;font-weight:900;margin-top:10px">Was für eine Saison, Adler!</div>
    <div class="aw-pop d2" style="font-size:var(--s-karte);opacity:.85;margin-top:10px">${d.spieler_anzahl||0} Kinder · ein Team</div></div>`});
  // FEAT X: Galerie-Fotos als Hintergrund einstreuen (Gradient-Overlay -> Text bleibt lesbar).
  // Rein DOM (background-image), daher kein Canvas-Taint. Fotos sind lokale Blob-URLs.
  if(fotos&&fotos.length){
    const overlay=(slide,foto)=>{slide.bg=slide.bg.replace(/linear-gradient\(160deg,\s*([^,]+),\s*([^)]+)\)/,(m,a,b)=>`linear-gradient(160deg,${a.trim()}cc,${b.trim()}cc), url("${foto}") center/cover`);};
    [1,2,3,4,5].forEach((si,k)=>{ if(S[si]&&fotos[k])overlay(S[si],fotos[k]); }); // Intro & Finale bleiben clean
    S.splice(S.length-1,0,{bg:`linear-gradient(160deg,#0f172acc,#1e293bcc), url("${fotos[0]}") center/cover`,html:`<div>
      <div class="aw-pop" style="font-size:var(--s-karte);opacity:.9;text-transform:uppercase;letter-spacing:2px">Unsere Momente</div>
      <div class="aw-pop d1" style="font-size:26px;font-weight:900;margin-top:8px">📸 ${fotos.length} Erinnerungen</div>
      <div class="aw-pop d2" style="font-size:var(--s-karte);opacity:.85;margin-top:10px">Eine Saison zum Nie-Vergessen 🦅</div></div>`});
  }
  return S;
}
function adlerWrappedShow(d,fotos){
  awrapSlides=adlerWrappedSlides(d,fotos); awrapIdx=0;
  if(!document.getElementById("wrapped-style")){
    const st=document.createElement("style");st.id="wrapped-style";
    st.textContent=`@keyframes awrapPop{0%{opacity:0;transform:translateY(28px) scale(.9)}100%{opacity:1;transform:none}}
      #adler-wrapped .aw-pop{animation:awrapPop .55s cubic-bezier(.2,.8,.2,1) both}
      #adler-wrapped .aw-pop.d1{animation-delay:.16s}#adler-wrapped .aw-pop.d2{animation-delay:.34s}#adler-wrapped .aw-pop.d3{animation-delay:.52s}
      #adler-wrapped .aw-big{font-size:88px;font-weight:900;line-height:1;letter-spacing:-2px;margin:6px 0}`;
    document.head.appendChild(st);
  }
  const modal=document.createElement("div");
  modal.id="adler-wrapped";
  modal.style.cssText="position:fixed;inset:0;z-index:10000;overflow:hidden;color:#fff;font-family:inherit;display:flex;flex-direction:column";
  modal.innerHTML=`
    <div id="aw-bars" style="display:flex;gap:4px;padding:12px 12px 4px;position:relative;z-index:3"></div>
    <button onclick="adlerWrappedClose()" aria-label="Schließen" style="position:absolute;top:30px;right:12px;z-index:4;background:rgba(0,0,0,.25);border:none;color:#fff;font-size:var(--s-seite);width:36px;height:36px;border-radius:50%;cursor:pointer">×</button>
    <div id="aw-stage" style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px;position:relative;z-index:1"></div>
    <div style="position:absolute;top:32px;bottom:0;left:0;right:0;z-index:2;display:flex">
      <div style="flex:1" role="button" tabindex="0" aria-label="Zurück" onclick="adlerWrappedPrev()"></div>
      <div style="flex:2" role="button" tabindex="0" aria-label="Weiter" onclick="adlerWrappedNext()"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector("#aw-bars").innerHTML=awrapSlides.map((_,i)=>`<div style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.28);overflow:hidden"><div class="aw-barfill" data-i="${i}" style="height:100%;width:0;background:#fff"></div></div>`).join("");
  adlerWrappedRender();
}
function adlerWrappedRender(){
  const modal=document.getElementById("adler-wrapped");
  if(!modal)return;
  clearTimeout(awrapTimer);
  const s=awrapSlides[awrapIdx];
  modal.style.background=s.bg;
  modal.querySelector("#aw-stage").innerHTML=s.html;
  modal.querySelectorAll(".aw-barfill").forEach(f=>{
    const i=+f.dataset.i;
    if(i<awrapIdx){f.style.transition="none";f.style.width="100%";}
    else if(i===awrapIdx){f.style.transition="none";f.style.width="0";void f.offsetWidth;f.style.transition=`width ${AWRAP_MS}ms linear`;f.style.width="100%";}
    else{f.style.transition="none";f.style.width="0";}
  });
  if(s.confetti&&typeof confetti==="function")confetti(modal);
  awrapTimer=setTimeout(adlerWrappedNext,AWRAP_MS);
}
function adlerWrappedNext(){ if(!document.getElementById("adler-wrapped"))return; if(awrapIdx>=awrapSlides.length-1){adlerWrappedClose();return;} awrapIdx++; adlerWrappedRender(); }
function adlerWrappedPrev(){ if(!document.getElementById("adler-wrapped"))return; if(awrapIdx<=0){adlerWrappedRender();return;} awrapIdx--; adlerWrappedRender(); }
function adlerWrappedClose(){ clearTimeout(awrapTimer); awrapFotoUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}}); awrapFotoUrls=[]; document.getElementById("adler-wrapped")?.remove(); }
/* Eine Zertifikat-Karte als HTML (aus printZertifikat extrahiert, damit das
   Urkunden-Studio ALLE Kinder in einem Druckauftrag stapeln kann). */
function _zertCardHtml(name,extra){
  extra=extra||{};
  const snaps=DB[name]||[];
  const lat=snaps.length?snaps[snaps.length-1]:{};
  const isTw=lat.tw===true||getKader(name)?.tw;
  const prim=lat.prim_rolle||"Allrounder";
  const st=[];
  (lat.fazit||"").split("\n").forEach(line=>{ if(line.startsWith("  + "))st.push(line.slice(4).split("–")[0].trim()); });
  const top=st.slice(0,3);
  const staerkenHtml=top.length
    ? top.map(s=>`<div class="zt-i"><b>✔</b><span>${esc(s)}</span></div>`).join("")
    : `<div class="zt-i"><b>✔</b><span>Mit vollem Einsatz dabei – Woche für Woche</span></div>`;
  const tot=lat.total_score||0,pot=lat.pot_score||0;
  const text=extra.text||(`Für eine großartige Saison bei der U9 I des SV Adler Dellbrück. `+
    `Du hast dich als ${esc(prim)}${isTw?" und im Tor":""} weiterentwickelt, im Training angepackt `+
    `und bist Teil unserer Raute-Familie geworden. Weiter so – wir sind stolz auf dich!`);
  return `<div class="zert-card">
      <div class="zert-crest"><img src="logo.png" alt="SV Adler Dellbrück"></div>
      <div class="zert-club">SV Adler Dellbrück e.V. · U9 I</div>
      <div class="zert-title">${esc(extra.titel||"Saison-Zertifikat")}</div>
      <div class="zert-season">${extra.anlass?esc(extra.anlass):"Saison "+saisonLabel()}</div>
      <div class="zert-for">verliehen an</div>
      <div class="zert-name">${esc(name)}${isTw?" 🥅":""}</div>
      ${extra.frei?"":`<div class="zert-role">Rolle in der Raute: ${esc(prim)}</div>`}
      <div class="zert-text">${text}</div>
      ${extra.frei?"":`<div class="zert-staerken">
        <div class="zt-h">Deine Stärken in dieser Saison</div>
        ${staerkenHtml}
      </div>
      <div class="zert-badges">
        ${/* v635: keine Bewertungszahlen auf der Urkunde – sie ist an das Kind adressiert (CLAUDE.md: Kinder sehen nie Bewertungszahlen). */""}
        ${extra.federn!=null?`<div class="zb">Federn gesammelt<b>🪶 ${extra.federn}</b></div>`:""}
      </div>`}
      <div class="zert-sign">
        <div>Trainerteam<br>${((typeof TRAINER!=="undefined"&&TRAINER)||[]).join(" · ")}</div>
        <div>Dellbrück, ${new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}</div>
      </div>
    </div>`;
}
function _zertPrint(html){
  document.getElementById("zert-print").innerHTML=html;
  document.body.classList.add("printing-zert");
  const cleanup=()=>{document.body.classList.remove("printing-zert");window.removeEventListener("afterprint",cleanup);};
  window.addEventListener("afterprint",cleanup);
  setTimeout(cleanup,3000); // Fallback, falls afterprint nicht feuert
  window.print();
}
/* ── I-B: Urkunden-Studio – Saison-Urkunden für ALLE Kinder in einem Druckauftrag
   (Saisonabschluss-Klassiker) + freie Anlass-Urkunde (Turnier, Meilenstein …).
   Nutzt die vorhandene zert-print-Infrastruktur; je Karte eine A4-Seite. ── */
async function urkundenOpen(){
  const active=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  document.getElementById("urk-modal")?.remove();
  const m=document.createElement("div");m.id="urk-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Urkunden-Studio");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const fld="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);margin-top:6px";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("urk-modal","🏅","Urkunden-Studio","Saison-Urkunden für alle – oder eine Urkunde zum Anlass","var(--amber)")}
    <div style="font-weight:800;font-size:var(--s-text);margin-bottom:4px">Saison-Urkunden (alle Kinder)</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:8px">Je Kind eine A4-Seite: Stärken aus der Bewertung, Rolle, Federn und Unterschriften-Zeile – fertig fürs Saisonabschluss-Fest.</div>
    <button class="btn btn-p" style="width:100%" onclick="urkundenAlle(this)"><i class="ti ti-printer"></i>Alle ${active.length} Urkunden drucken</button>
    <div style="font-weight:800;font-size:var(--s-text);margin:18px 0 4px">Urkunde zum Anlass</div>
    <div style="font-size:var(--s-text);color:var(--text2)">Turnier, Team-Meilenstein, besondere Leistung – Titel und Text frei.</div>
    <select id="urk-kind" style="${fld}"><option value="*">Alle Kinder</option>${active.map(k=>`<option value="${esc(k.name)}">${esc(k.name)}</option>`).join("")}</select>
    <input id="urk-titel" placeholder="Titel, z. B. Turnier-Urkunde" value="Turnier-Urkunde" style="${fld}">
    <input id="urk-anlass" placeholder="Anlass/Untertitel, z. B. Sommer-Cup 2026" style="${fld}">
    <textarea id="urk-text" rows="3" style="${fld}" placeholder="Text auf der Urkunde">Für großartigen Einsatz, Teamgeist und Fairplay. Das ganze Adler-Team ist stolz auf dich!</textarea>
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="urkundeFrei(this)"><i class="ti ti-printer"></i>Anlass-Urkunde drucken</button>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:10px">Tipp: Im Druckdialog „Als PDF speichern" wählen, um die Urkunden digital zu verschicken.</div>
  </div>`;
  document.body.appendChild(m);
}
async function urkundenAlle(btn){
  const active=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  if(!active.length){toast("Kein Kader geladen","err");return;}
  if(btn)btn.disabled=true;
  // Federn je Kind (ein RPC-Aufruf pro Kind, parallel; bei Fehler ohne Federn drucken)
  const federn={};
  await Promise.all(active.map(async k=>{ try{federn[k.name]=await xpTotal(k._id||k.id);}catch(e){} }));
  if(btn)btn.disabled=false;
  const html=active.map(k=>`<div class="zert-page">${_zertCardHtml(k.name,{federn:federn[k.name]})}</div>`).join("");
  document.getElementById("urk-modal")?.remove();
  _zertPrint(html);
}
function urkundeFrei(btn){
  const wer=document.getElementById("urk-kind")?.value||"*";
  const titel=(document.getElementById("urk-titel")?.value||"").trim()||"Urkunde";
  const anlass=(document.getElementById("urk-anlass")?.value||"").trim();
  const text=esc((document.getElementById("urk-text")?.value||"").trim()||"Für großartigen Einsatz und Teamgeist!");
  const active=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const namen=wer==="*"?active.map(k=>k.name):[wer];
  if(!namen.length){toast("Kein Kind gewählt","err");return;}
  const html=namen.map(n=>`<div class="zert-page">${_zertCardHtml(n,{frei:true,titel,anlass,text})}</div>`).join("");
  document.getElementById("urk-modal")?.remove();
  _zertPrint(html);
}
function printZertifikat(){
  const name=document.getElementById("psel-profil")?.value;
  if(!name){toast("Erst einen Spieler wählen","err");return;}
  const snaps=DB[name]||[];if(!snaps.length){toast("Keine Bewertung vorhanden","err");return;}
  _zertPrint(_zertCardHtml(name)); // Karte + Druck laufen über die Studio-Helper (I-B)
}
// Entwicklungs-Report (druckbar) fürs Elterngespräch – nutzt vorhandene Daten + den
// generischen Druck-Container (#zert-print / printing-zert). Trend, Dimensionen, Stärken,
// Anwesenheit, aktuelle Ziele, Trainer-Fazit.
/* v635: Der Bericht geht an Eltern. Er zeigt Worte statt Prozente und lässt aus dem Trainertext
   alles weg, was nur fürs Trainerteam ist: Zahlen, den Eltern-Hinweis, die Einordnung mit
   „Entwicklungstempo“ und den alten Gruppen-Rest („Gruppe:“ aus der A/B-Zeit). Gefiltert
   wird der gespeicherte Text, damit auch Bewertungen von vor v635 sauber herauskommen. */
const BERICHT_STUFE=p=>p>=84?"Stark":p>=50?"Gut":p>=17?"Solide":"Ansatz";
function berichtFazitFuerEltern(text){
  const weg=/^(ELTERN-HINWEIS|ENTWICKLUNGSPROGNOSE|EINORDNUNG)/;
  const teile=String(text||"").split(/\n(?=━━ )/);
  return teile.filter(t=>!weg.test(t.replace(/^━━\s*/,""))).join("\n")
    .split("\n").filter(z=>!/%|Gruppe:|Messwert/.test(z)).join("\n")
    .replace(/\n{3,}/g,"\n\n").trim();
}
async function entwicklungsReport(){
  const name=document.getElementById("psel-profil")?.value;
  if(!name){toast("Erst einen Spieler wählen","err");return;}
  const snaps=DB[name]||[]; if(!snaps.length){toast("Keine Bewertung vorhanden","err");return;}
  const lat=snaps[snaps.length-1];
  const k=getKader(name)||{}, isTw=lat.tw===true||k.tw;
  const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
  const {dims:ds}=calcScores(v,DIMS_FELD);
  const dimHtml=DIMS_FELD.map(d=>{const p=Math.round(ds[d.id]||0);const ng=ds[d.id]==null;return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
    <div style="width:150px;font-size:12px">${esc(d.label)}</div>
    <div style="flex:1;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden"><div style="height:100%;width:${p}%;background:${d.col};border-radius:5px"></div></div>
    <div style="width:64px;text-align:right;font-size:12px;font-weight:700">${ng?"nicht beobachtet":BERICHT_STUFE(p)}</div></div>`;}).join("");
  const vg=typeof bewVergleich==="function"?bewVergleich(name):{runden:snaps.length,hoch:[]};   // v637: Runde gegen Runde
  const arrow=vg.runden<2?"Erste Einschätzung":vg.hoch.length?`↗ gewachsen: ${vg.hoch.slice(0,3).join(", ")}`:"→ auf ähnlichem Stand";
  const badges=(adlerCardData(name)||{}).badges||[];
  const staerken=badges.slice(0,3).map(b=>`<span style="display:inline-block;background:#eef2ff;color:#3730a3;border-radius:14px;padding:3px 10px;font-size:12px;margin:2px 4px 2px 0">${b.icon} ${esc(b.label)}</span>`).join("")||"—";
  // Anwesenheit
  let trP=0,trT=0; try{Object.keys(AW_DATA||{}).forEach(d=>{const e=(AW_DATA[d]||{})[name];if(e&&typeof e.da==="boolean"){trT++;if(e.da)trP++;}});}catch(e){}
  let gmP=0,gmT=0; try{const r=await fetch(`${SB_URL}/rest/v1/${nomZeilenPfad()}`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(row=>{const s=kidMapFromIds(row.data||{})[name];if(s==="dabei"||s==="nicht"||s==="verletzt"){gmT++;if(s==="dabei")gmP++;}});   /* v707: nur die Nominierung */}catch(e){}
  const q=(p,t)=>t?Math.round(p/t*100)+"% ("+p+"/"+t+")":"—";
  // Aktuelle Ziele
  let goals=[]; const kid=kaderId(k); if(kid!=null){try{const r=await fetch(`${SB_URL}/rest/v1/entwicklungsziele?spieler_id=eq.${kid}&status=eq.offen&select=ziel&order=created_at.desc`,{headers:sbAuthHeaders()});if(r.ok)goals=(await r.json()).map(z=>z.ziel).filter(Boolean);}catch(e){}}
  const goalsHtml=goals.length?goals.map(g=>`<li style="font-size:12.5px;margin:2px 0">${esc(g)}</li>`).join(""):'<li style="font-size:12.5px;color:#64748b">Noch kein Ziel gesetzt</li>';
  const fazit=berichtFazitFuerEltern(lat.fazit);
  document.getElementById("zert-print").innerHTML=`
    <div style="max-width:720px;margin:0 auto;padding:24px;font-family:Inter,system-ui,sans-serif;color:#1a1a2e">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--blue);padding-bottom:10px;margin-bottom:14px">
        <img src="logo.png" alt="" style="width:48px;height:48px;object-fit:contain">
        <div><div style="font-size:12px;color:#64748b">SV Adler Dellbrück e.V. · U9</div>
        <div style="font-size:20px;font-weight:800">Entwicklungsbericht</div></div>
        <div style="margin-left:auto;text-align:right;font-size:12px;color:#64748b">Saison ${saisonLabel()}<br>${new Date().toLocaleDateString("de-DE")}</div>
      </div>
      <div style="font-size:22px;font-weight:800;margin-bottom:2px">${esc(name)}${isTw?" 🥅":""}${k.nr!=null?` <span style="color:var(--text3);font-size:15px">#${k.nr}</span>`:""}</div>
      <div style="font-size:13px;color:#475569;margin-bottom:14px">Rolle: ${esc(lat.prim_rolle||k.lieblingsposition||"Allrounder")} · ${snaps.length} Bewertung${snaps.length!==1?"en":""}</div>

      <div style="display:flex;gap:14px;margin-bottom:14px">
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Entwicklung</div>
          <div style="font-size:16px;font-weight:800;color:var(--blue-text);margin-top:4px">${arrow}</div>
          <div style="font-size:11.5px;color:#64748b;margin-top:2px">Momentaufnahme aus dem Training, keine Prognose</div>
        </div>
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Anwesenheit</div>
          <div style="font-size:12.5px;margin-top:4px">🏃 Training: <b>${q(trP,trT)}</b></div>
          <div style="font-size:12.5px">⚽ Spiele: <b>${q(gmP,gmT)}</b></div>
        </div>
      </div>

      <div style="font-size:13px;font-weight:800;margin:6px 0 4px">Stärken</div>
      <div style="margin-bottom:12px">${staerken}</div>

      <div style="font-size:13px;font-weight:800;margin:6px 0 6px">Entwicklungsprofil</div>
      ${dimHtml}

      <div style="font-size:13px;font-weight:800;margin:14px 0 4px">Aktuelle Ziele</div>
      <ul style="margin:0 0 12px 18px;padding:0">${goalsHtml}</ul>

      ${fazit?`<div style="font-size:13px;font-weight:800;margin:6px 0 4px">Einschätzung des Trainerteams</div>
      <div style="font-size:12.5px;white-space:pre-wrap;line-height:1.5;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">${esc(fazit)}</div>`:""}

      <div style="margin-top:18px;font-size:11px;color:var(--text3);border-top:1px solid #e2e8f0;padding-top:8px">Vertraulich – nur für das Entwicklungsgespräch. Trainerteam SV Adler Dellbrück U9.</div>
    </div>`;
  document.body.classList.add("printing-zert");
  const cleanup=()=>{document.body.classList.remove("printing-zert");window.removeEventListener("afterprint",cleanup);};
  window.addEventListener("afterprint",cleanup);
  setTimeout(cleanup,3000);
  window.print();
}

/* ═══════════════════════════════════
   PHASE 7-D: ADLER-KARTE (FUT-Style, nativ auf Canvas gezeichnet)
   Paedagogisch: keine harten Prozentzahlen, sondern positive Badges. JEDES Kind
   bekommt seine Top-3-Staerken – so wirkt keine Karte "leer". Trikotnummer statt
   Overall-Rating. Design-Farbe = staerkste Dimension. Foto (D2) wird per Blob
   gezeichnet (kein CORS); ohne Foto zeigt die Karte die Initialen.
═══════════════════════════════════ */
const CARD_BADGES={
  f_tempo:{icon:"🚀",label:"Dynamik-Rakete"}, f_ballkontrolle:{icon:"🎩",label:"Ball-Zauberer"},
  f_pass:{icon:"🎯",label:"Pass-Meister"}, f_abschluss:{icon:"⚽",label:"Torjäger"},
  f_raum:{icon:"🧭",label:"Feld-Leser"}, f_umschalt:{icon:"⚡",label:"Umschalt-Blitz"},
  f_laufweg:{icon:"🏃",label:"Wege-Finder"}, f_defense:{icon:"🛡️",label:"Abwehr-Boss"},
  f_koord:{icon:"🤸",label:"Wirbelwind"}, f_einsatz:{icon:"🔥",label:"Kampf-Herz"},
  f_selbst:{icon:"🦁",label:"Mutig"}, f_team:{icon:"🤝",label:"Teamplayer"},
  f_sozial:{icon:"💛",label:"Herz des Teams"}, f_resil:{icon:"💪",label:"Steh-auf-Typ"},
  f_coach:{icon:"🧠",label:"Blitz-Lerner"}, f_freude:{icon:"😄",label:"Fußball-Fan"}
};
/* Welche Dimension traegt dieses Merkmal? Die Zuordnung steht in DIMS_FELD (data.js)
   und wird hier nur gelesen - ein zweites Verzeichnis waere eine zweite Wahrheit.
   Gebraucht seit v593 von der Team-Galerie, die aus team_gallery_kind() nur noch die
   Merkmalsschluessel bekommt und daraus das Farbthema ableiten muss. */
/* v636: EINE Regel für die drei Stärken – dieselbe wie staerken_von() in der Datenbank
   (Wert absteigend, bei Gleichstand Schlüssel alphabetisch, nur Werte > 0). Vorher löste der
   Browser Gleichstände über die Reihenfolge in CARD_BADGES, die Datenbank alphabetisch: Eltern,
   Trainer und Kind sahen auf einer 4er-Skala oft verschiedene Abzeichen und Farben. */
/* v757 (PO 04.10.: „Unsere Torhüter sind auch Feldspieler. Wir haben keinen festen Torwart.“): Das gelbe TORWART-Thema und die
   Handschuhe auf der Karte trägt nur „Torwart 1. Wahl“ (tw_prio 1). „Kann ins Tor“ und „2. Wahl“ bleiben Feldspieler-Karten.
   Fehlt die Rangfolge (Datenbank vor v757), gilt wie bisher tw. */
function kartenTorwart(x){
  if(!x||!x.tw)return false;
  const p=x.tw_prio!=null?x.tw_prio:x.twPrio;
  return p==null?true:Number(p)===1;
}
/* v757 (PO 04.10.): Stärken auf der Karte – das Trainerteam wählt bis zu drei aus festen Kategorien (kader.staerken_manuell);
   ohne Auswahl bleibt es bei der Berechnung aus der Einschätzung (staerkenAus). */
function staerkenManuell(k){
  const m=k&&k.staerken_manuell;
  const l=(Array.isArray(m)?m:(typeof m==="string"?safeParse(m,[]):[])).filter(x=>typeof CARD_BADGES!=="undefined"&&CARD_BADGES[x]);
  return l.slice(0,3);
}
function staerkenAus(v){
  return Object.keys(CARD_BADGES).map(key=>({key,val:Number(v&&v[key])||0})).filter(x=>x.val>0)
    .sort((a,b)=>b.val-a.val||(a.key<b.key?-1:a.key>b.key?1:0)).slice(0,3).map(x=>x.key);
}
function feldDimVon(key){
  if(!key||typeof DIMS_FELD==="undefined")return null;
  for(const d of DIMS_FELD){
    if((d.tier||[]).some(t=>t.n===key)||(d.mx||[]).some(t=>t.n===key))return d.id;
  }
  return null;
}
const CARD_THEMES={
  tech:{a:"#1e3a8a",b:"#3b82f6",name:"TECHNIK"}, raute:{a:"#5b21b6",b:"#8b5cf6",name:"SPIELWITZ"},
  phys:{a:"#9a3412",b:"#f97316",name:"DYNAMIK"}, mental:{a:"#065f46",b:"#10b981",name:"CHARAKTER"},
  entw:{a:"#155e75",b:"#06b6d4",name:"TALENT"}, keeper:{a:"#854d0e",b:"#eab308",name:"TORWART"},
  /* v563: Ohne Bewertung darf oben nicht „TECHNIK" stehen – das wäre eine Behauptung über
     ein Kind, die niemand aufgestellt hat. Der Saisonstart räumt die Bewertungen ins Archiv;
     bis zur ersten neuen Einschätzung trägt die Karte dieses Thema. */
  neu:{a:"#0f172a",b:"#334155",name:"NEUE SAISON"}
};
/* Meilenstein-Karten (Phase 11-R): Design nach TEILNAHME, nicht Leistung.
   ≥8 Trainings → Gold, ≥16 → Hero (seit v752; vorher 10/20). Überschreibt das Dim-Theme. Metallischer Verlauf,
   Doppelrahmen, Glanz + Siegel werden in adlerCardDraw gebacken (bleiben im PNG-Export). */
/* v752 (PO 04.10., Kachel): Gold ab 8, HERO ab 16 – seit v734 zählen nur Trainings der laufenden Saison,
   mit 10/20 hatte Anfang Oktober kein Kind mehr Gold. */
const CARD_MILESTONES=[
  {min:16, a:"#2a0e57", b:"#f59e0b", name:"HERO", medal:"hero", border:"#fcd34d"},
  {min:8,  a:"#5c4300", b:"#e9c94a", name:"GOLD", medal:"gold", border:"#ffe08a"}
];
function cardMilestoneTheme(trainings){ const t=Number(trainings)||0; return CARD_MILESTONES.find(m=>t>=m.min)||null; }
/* Karten-Skins (Feder-Freischaltung): rein aus dem Federn-Gesamtstand abgeleitet – KEIN
   Extra-Speicher, keine RLS-Änderung. Der höchste erreichte Skin wird automatisch auf die
   Karte gebacken (Rahmen-Akzent + Emblem-Pill), zusätzlich zum Dim-/Meilenstein-Theme.
   Schließt die Federn-Schleife: Lernen (z. B. Wissensquiz) → Federn → neues Karten-Design. */
/* FUT 2.0: jeder Tier färbt die GANZE Karte (wash = metallischer Voll-Verlauf, ins PNG
   gebacken) und bekommt on-screen eine animierte Foil-Sheen (holo=holografisch). */
const CARD_SKINS=[
  {min:0,    name:"Küken-Adler",   emo:"🐣", border:null,      wash:null},
  {min:60,   name:"Bronze-Adler",  emo:"🥉", border:"#cd7f32", wash:["#7c4a1e","#e39a4e"]},
  {min:150,  name:"Silber-Adler",  emo:"🥈", border:"#cbd5e1", wash:["#4b5563","#d7dee7"]},
  {min:300,  name:"Gold-Adler",    emo:"🥇", border:"#facc15", wash:["#7a5c0a","#fde047"]},
  {min:500,  name:"Feuer-Adler",   emo:"🔥", border:"#f97316", wash:["#7c2d12","#fb923c"]},
  {min:800,  name:"Eis-Adler",     emo:"❄️", border:"#38bdf8", wash:["#0c4a6e","#7dd3fc"]},
  {min:1200, name:"Diamant-Adler", emo:"💎", border:"#a78bfa", wash:["#4c1d95","#c4b5fd"], holo:true}
];
function cardSkinFor(federn){ const f=Number(federn)||0; return CARD_SKINS.filter(s=>f>=s.min).pop()||CARD_SKINS[0]; }
// Skin-Galerie fürs Modal (nicht ins PNG gebacken): zeigt alle Designs, freie in Farbe,
// gesperrte ausgegraut mit Federn-Bedarf – der Sammel-/Ansporn-Effekt ohne extra Auswahl.
function cardSkinGalleryEl(federn){
  const f=Number(federn)||0, active=cardSkinFor(f), shown=CARD_SKINS.filter(s=>s.min>0);
  const unlocked=shown.filter(s=>f>=s.min).length;
  const wrap=document.createElement("div");
  wrap.style.cssText="width:300px;max-width:100%;background:var(--surface);border:var(--border-s);border-radius:14px;padding:10px 12px";
  wrap.innerHTML=`<div style="font-size:var(--s-klein);font-weight:800;color:var(--text);margin-bottom:8px">🃏 Karten-Designs <span style="color:var(--text3);font-weight:600">(${unlocked}/${shown.length} frei · ${f} 🪶)</span></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`+
    shown.map(s=>{
      const on=f>=s.min, isActive=active&&active.name===s.name;
      return `<div style="text-align:center;padding:6px 2px;border-radius:10px;${isActive?"background:rgba(250,204,21,.14);outline:2px solid "+(s.border||"#facc15"):""}">
        <div style="font-size:var(--s-seite);line-height:1;${on?"":"filter:grayscale(1);opacity:.4"}">${s.emo}</div>
        <div style="font-size:var(--s-klein);font-weight:700;color:${on?"var(--text)":"var(--text3)"};margin-top:3px;line-height:1.1">${s.name.replace("-Adler","")}</div>
        <div style="font-size:var(--s-klein);color:var(--text3);margin-top:1px">${on?(isActive?"aktiv":"frei ✓"):"🔒 "+s.min+" 🪶"}</div>
      </div>`;
    }).join("")+`</div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:8px;text-align:center">Sammle Adler-Federn 🪶 – z. B. im Fußball-Wissensquiz – und schalte neue Designs frei!</div>`;
  return wrap;
}
// On-Screen-Glanz (nur im Modal, nicht im Export): sanftes Gold-/Hero-Pulsieren um die Karte.
function cardApplyGlow(canvas,trainings){
  if(!canvas)return;
  const ms=cardMilestoneTheme(trainings);
  if(!ms){canvas.style.animation="";return;}
  if(!document.getElementById("card-glow-style")){
    const st=document.createElement("style");st.id="card-glow-style";
    st.textContent="@keyframes cardGlowGold{0%,100%{box-shadow:0 12px 40px rgba(0,0,0,.5)}50%{box-shadow:0 0 34px rgba(255,215,0,.6),0 12px 40px rgba(0,0,0,.5)}}@keyframes cardGlowHero{0%,100%{box-shadow:0 0 22px rgba(245,158,11,.5),0 12px 40px rgba(0,0,0,.5)}50%{box-shadow:0 0 48px rgba(236,72,153,.75),0 12px 40px rgba(0,0,0,.5)}}";
    document.head.appendChild(st);
  }
  canvas.style.animation=(ms.medal==="hero"?"cardGlowHero 1.8s":"cardGlowGold 2.4s")+" ease-in-out infinite";
}
/* ── FUT 2.0: Holo-Foil-Overlay (on-screen, nicht im PNG) + Unboxing-Celebration ── */
function cardEnsureFXStyle(){
  if(document.getElementById("card-fx-style"))return;
  const st=document.createElement("style");st.id="card-fx-style";
  st.textContent=`
  .card-holo{position:relative;display:inline-block;line-height:0}
  .card-holo .foil{position:absolute;inset:0;border-radius:20px;pointer-events:none;opacity:0;mix-blend-mode:overlay;
    background:linear-gradient(115deg,transparent 22%,rgba(255,255,255,.55) 38%,rgba(255,255,255,.12) 47%,transparent 62%);
    background-size:250% 250%}
  .card-holo.tier-on .foil{opacity:1;animation:cardFoil 3.2s linear infinite}
  .card-holo.tier-holo .foil{mix-blend-mode:screen;
    background:linear-gradient(115deg,transparent 12%,rgba(240,171,252,.5) 28%,rgba(103,232,249,.5) 40%,rgba(253,224,71,.5) 50%,rgba(134,239,172,.5) 60%,transparent 74%);
    background-size:250% 250%}
  @keyframes cardFoil{0%{background-position:130% 0}100%{background-position:-40% 0}}
  @keyframes cardFlash{0%{opacity:0}18%{opacity:.92}100%{opacity:0}}
  @keyframes cardBanner{0%{opacity:0;transform:translateX(-50%) translateY(-10px) scale(.9)}12%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}82%{opacity:1}100%{opacity:0}}
  `;
  document.head.appendChild(st);
}
function cardHoloWrap(canvas){
  cardEnsureFXStyle();
  const w=document.createElement("div");w.className="card-holo";
  w.appendChild(canvas);
  const foil=document.createElement("div");foil.className="foil";w.appendChild(foil);
  return w;
}
function cardHoloSetTier(wrap,sk){
  if(!wrap)return;
  wrap.classList.remove("tier-on","tier-holo");
  if(sk&&sk.border){ wrap.classList.add("tier-on"); if(sk.holo)wrap.classList.add("tier-holo"); }
}
// Selbst gemaltes Konfetti (keine externe Library → offline-tauglich).
function confettiBurst(ms){
  const cv=document.createElement("canvas");
  cv.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:10072";
  cv.width=window.innerWidth;cv.height=window.innerHeight;
  document.body.appendChild(cv);
  const ctx=cv.getContext("2d");
  const cols=["#f97316","#facc15","#38bdf8","#a78bfa","#22c55e","#ec4899","#ffffff"];
  const parts=[];
  for(let i=0;i<150;i++)parts.push({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.4,
    vx:(Math.random()-.5)*3,vy:2+Math.random()*4,s:4+Math.random()*6,rot:Math.random()*6.28,vr:(Math.random()-.5)*.3,c:cols[i%cols.length]});
  const start=performance.now();
  (function frame(t){
    ctx.clearRect(0,0,cv.width,cv.height);
    parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.03;p.rot+=p.vr;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);ctx.restore();});
    if(t-start<ms&&document.body.contains(cv))requestAnimationFrame(frame);else cv.remove();
  })(start);
  // Sicherheits-Aufräumung: rAF pausiert im Hintergrund-Tab → Overlay sonst hängen bleiben.
  setTimeout(()=>{ if(document.body.contains(cv))cv.remove(); }, ms+500);
}
// Der große Moment: neuer Tier erreicht → Haptik + Blitz + Puls + Konfetti + Banner.
function cardCelebrate(wrap,sk,label){
  try{navigator.vibrate&&navigator.vibrate([100,50,100,50,200]);}catch(e){}
  if(wrap){
    const flash=document.createElement("div");
    flash.style.cssText="position:absolute;inset:0;border-radius:20px;background:#fff;pointer-events:none;z-index:2;animation:cardFlash .7s ease-out forwards";
    wrap.appendChild(flash);setTimeout(()=>flash.remove(),750);
    if(wrap.animate)wrap.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:600,easing:"ease-out"});
  }
  confettiBurst(3000);
  const modal=document.getElementById("adler-card-modal");
  if(modal){
    const b=document.createElement("div");
    b.style.cssText="position:fixed;top:12%;left:50%;z-index:10073;background:"+((sk&&sk.border)||"#facc15")+";color:#1a1205;font-weight:900;font-size:var(--s-karte);padding:10px 18px;border-radius:30px;box-shadow:0 8px 30px rgba(0,0,0,.45);animation:cardBanner 2.8s ease-out forwards";
    b.textContent=(sk&&sk.emo?sk.emo+" ":"🎉 ")+"Level-Up: "+label+"!";
    modal.appendChild(b);setTimeout(()=>b.remove(),2900);
  }
}
/* Feiert genau dann, wenn das Kind (auf diesem Gerät) erstmals einen höheren Tier zeigt.
   localStorage merkt sich den zuletzt gefeierten Tier-Index pro Kind – kein Server nötig. */
function cardTierCelebrateMaybe(wrap,spielerId,federn){
  const sk=cardSkinFor(federn), idx=CARD_SKINS.indexOf(sk);
  const key="adler_ctier_"+spielerId; let prev=-1;
  try{const v=localStorage.getItem(key); if(v!=null)prev=parseInt(v,10);}catch(e){}
  if(sk&&sk.border&&idx>Math.max(prev,0))cardCelebrate(wrap,sk,sk.name.replace("-Adler",""));
  try{localStorage.setItem(key,String(idx));}catch(e){}
}
// Position ausschreiben: "Flitzer R" -> "Rechter Flitzer", Codes -> Klartext.
function cardPosLabel(pos){
  if(!pos)return pos;
  const p=String(pos).trim(), low=p.toLowerCase();
  const direct={aufpasser:"Aufpasser","jäger":"Jäger",jaeger:"Jäger",torwart:"Torwart",tw:"Torwart",allrounder:"Allrounder",flitzer:"Flitzer",flitzer_l:"Linker Flitzer",flitzer_r:"Rechter Flitzer"};
  if(direct[low])return direct[low];
  const m=low.match(/^(.+?)\s+(r|l|rechts|links)$/);
  if(m){const seite=/^(r|rechts)$/.test(m[2])?"Rechter":"Linker",base=m[1].trim();return seite+" "+base.charAt(0).toUpperCase()+base.slice(1);}
  return p;
}
/* v669 PO 29.09.: „Beim Klick auf die Karte kommt unten die Meldung ‚keine Bewertung vorhanden‘.
   Geht es nicht um die Spielerkarte des Kindes?“ Die Bewertungen ruhen bis Ende der Hinrunde
   (v648), also traf das jedes Kind. Wie seit v563 auf Eltern- und Kindergerät steht die Karte
   jetzt auch ohne Bewertung: Name, Nummer, Foto, Zähler – die Stärken kommen später. */
function adlerCardData(name){
  const snaps=DB[name]||[];
  const kk=getKader(name);
  if(!snaps.length&&!kk)return null;
  const k=kk||{};
  const lat=snaps.length?snaps[snaps.length-1]:{};
  const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
  const bewertet=snaps.length>0;
  // Top-3 Staerken (nach Wert; bei Gleichstand egal) – jedes Kind bekommt 3 Badges
  const manuell=staerkenManuell(k);   // v757: die Auswahl des Trainerteams geht vor
  const strengths=manuell.length?manuell.map(key=>({key})):(bewertet?staerkenAus(v).map(key=>({key})):[]);   // v636: gleiche Regel wie Datenbank und Elternkarte
  // Design-Farbe: Dimension der ersten Stärke (TW -> Gold) – wie auf Eltern- und Kindergerät
  const dim0=strengths.length&&typeof feldDimVon==="function"?feldDimVon(strengths[0].key):null;
  const tw1=kartenTorwart(k);
  const theme=tw1?CARD_THEMES.keeper:((bewertet||strengths.length)?(CARD_THEMES[dim0]||CARD_THEMES.tech):(CARD_THEMES.neu||CARD_THEMES.tech));
  const posMap={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer",flitzer_r:"Flitzer"};
  const pos=k.lieblingsposition||(tw1?"Torwart":(posMap[lat.position]||lat.prim_rolle||"Allrounder"));
  const fussMap={L:"linker Fuß",R:"rechter Fuß",B:"beidfüßig"};
  return {name,nr:k.nr,tw:tw1,geb:k.geb,fotoPath:k.foto_path,pos:cardPosLabel(pos),fuss:fussMap[k.starker_fuss||lat.strong_foot]||"",
          alter:k.geb?homeAlter(k.geb):(lat.age||null), badges:strengths.map(s=>CARD_BADGES[s.key]), theme, spielerId:kaderId(k)};
}
function adlerCardDraw(ctx,W,H,d,photoImg){
  // Meilenstein-Theme (Teilnahme, nicht Leistung) überschreibt das Dim-Theme.
  const ms=(d.counts&&cardMilestoneTheme(d.counts.trainings))||null;
  const th=ms||d.theme;
  const medal=ms?ms.medal:null;
  ctx.clearRect(0,0,W,H);
  // Hintergrund-Verlauf – Meilenstein: diagonal + dreistufig (metallischer Schimmer)
  const g=medal?ctx.createLinearGradient(0,0,W,H):ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,th.a); if(medal){g.addColorStop(.5,th.b);g.addColorStop(1,th.a);} else {g.addColorStop(1,th.b);}
  tbRoundRect(ctx,10,10,W-20,H-20,28);ctx.fillStyle=g;ctx.fill();
  ctx.save();tbRoundRect(ctx,10,10,W-20,H-20,28);ctx.clip();
  // Glanz-Diagonale (Meilenstein deutlich stärker)
  ctx.globalAlpha=medal?.22:.08;ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*.6,0);ctx.lineTo(0,H*.5);ctx.closePath();ctx.fill();
  if(medal){ctx.globalAlpha=.13;ctx.beginPath();ctx.moveTo(W,H*.22);ctx.lineTo(W,H*.44);ctx.lineTo(0,H*.92);ctx.lineTo(0,H*.7);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;ctx.restore();
  // ── FUT 2.0 Tier-Wash: der Feder-Skin färbt die GANZE Karte metallisch (ins PNG gebacken) ──
  const washSk=cardSkinFor(d.federn);
  if(washSk&&washSk.wash){
    ctx.save();tbRoundRect(ctx,10,10,W-20,H-20,28);ctx.clip();
    const wg=ctx.createLinearGradient(0,0,W,H);
    wg.addColorStop(0,washSk.wash[0]);wg.addColorStop(1,washSk.wash[1]);
    ctx.globalAlpha=medal?.16:.34; // bei Gold-/Hero-Meilenstein dezenter (eigenes Theme hat Vorrang)
    ctx.fillStyle=wg;ctx.fillRect(0,0,W,H);
    if(washSk.holo){ // Diamant: holografische Farbbänder
      ctx.globalAlpha=.10;
      ["#f0abfc","#67e8f9","#fde047","#86efac"].forEach((c,i)=>{
        const y=H*(.12+i*.22);ctx.fillStyle=c;ctx.beginPath();
        ctx.moveTo(0,y);ctx.lineTo(W,y-H*.14);ctx.lineTo(W,y-H*.02);ctx.lineTo(0,y+H*.12);ctx.closePath();ctx.fill();
      });
    }
    ctx.globalAlpha=1;ctx.restore();
  }
  // Rahmen – Meilenstein: metallischer Doppelrahmen + Siegel oben mittig
  if(medal){
    ctx.lineWidth=6;ctx.strokeStyle=ms.border;tbRoundRect(ctx,11,11,W-22,H-22,27);ctx.stroke();
    ctx.lineWidth=2;ctx.strokeStyle="rgba(255,255,255,.5)";tbRoundRect(ctx,17,17,W-34,H-34,22);ctx.stroke();
    ctx.font="800 12px Arial";
    const seal=(medal==="hero"?"🦸 HERO":"🏅 GOLD")+" · "+(d.counts.trainings||0)+" Trainings";
    const sw=ctx.measureText(seal).width, pw=sw+22;
    ctx.save();tbRoundRect(ctx,(W-pw)/2,20,pw,24,12);ctx.fillStyle=ms.border;ctx.fill();ctx.restore();
    ctx.fillStyle="#3a2a00";ctx.textAlign="center";ctx.fillText(seal,W/2,36);
    ctx.shadowColor="rgba(0,0,0,.32)";ctx.shadowBlur=3;ctx.shadowOffsetY=1; // Lesbarkeit auf Gold/Hero
  }else{
    ctx.lineWidth=3;ctx.strokeStyle="rgba(255,255,255,.85)";tbRoundRect(ctx,10,10,W-20,H-20,28);ctx.stroke();
  }

  // ── Kopf: Trikotnummer (statt Overall) + Positions-Pill + Theme ──
  ctx.textAlign="left";ctx.fillStyle="#fff";
  ctx.font="800 48px Arial";ctx.fillText(d.nr!=null?String(d.nr):"–",38,80);
  const pos=(d.pos||"").toUpperCase();
  if(pos){
    ctx.font="700 14px Arial";const pw=ctx.measureText(pos).width;
    ctx.save();tbRoundRect(ctx,38,92,pw+22,26,13);ctx.fillStyle="rgba(255,255,255,.20)";ctx.fill();ctx.restore();
    ctx.fillStyle="#fff";ctx.fillText(pos,49,110);
  }
  ctx.font="600 12px Arial";ctx.fillStyle="rgba(255,255,255,.8)";ctx.fillText(th.name,40,134);
  // Wappen oben rechts
  ctx.textAlign="right";ctx.font="34px Arial";ctx.fillText(d.tw?"🧤":"🦅",W-34,84);

  // ── Karten-Skin (Feder-Freischaltung): Rahmen-Akzent + Emblem-Pill, wird ins PNG gebacken ──
  const sk=cardSkinFor(d.federn);
  if(sk&&sk.border){
    if(!medal){ ctx.lineWidth=3;ctx.strokeStyle=sk.border;tbRoundRect(ctx,16,16,W-32,H-32,23);ctx.stroke(); } // Meilenstein-Rahmen hat Vorrang (kein Doppelrahmen)
    ctx.textAlign="right";ctx.font="700 12px Arial";
    const label=sk.emo+" "+sk.name, lw=ctx.measureText(label).width, pw=lw+18, px=W-34-pw, py=98;
    ctx.save();tbRoundRect(ctx,px,py,pw,24,12);ctx.fillStyle="rgba(0,0,0,.30)";ctx.fill();
    ctx.lineWidth=1.5;ctx.strokeStyle=sk.border;ctx.stroke();ctx.restore();
    ctx.fillStyle="#fff";ctx.fillText(label,W-43,py+16);
    ctx.textAlign="left";
  }

  // ── Foto / Initialen (mit Glow) ──
  const cx=W/2, cy=H*0.315, rad=W*0.225;
  const rg=ctx.createRadialGradient(cx,cy,rad*0.6,cx,cy,rad*1.5);
  rg.addColorStop(0,"rgba(255,255,255,.28)");rg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=rg;ctx.beginPath();ctx.arc(cx,cy,rad*1.5,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.closePath();ctx.clip();
  if(photoImg){ ctx.drawImage(photoImg,cx-rad,cy-rad,rad*2,rad*2); }
  else{
    ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
    ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="800 "+Math.round(rad)+"px Arial";
    ctx.fillText((d.name||"?").slice(0,2).toUpperCase(),cx,cy+rad*0.35);
  }
  ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.lineWidth=3;ctx.strokeStyle="rgba(255,255,255,.9)";ctx.stroke();

  // ── Name + Alter/Fuß ──
  const nameY=cy+rad+44;
  const washOn=!!(washSk&&washSk.wash);
  if(washOn){ctx.shadowColor="rgba(0,0,0,.4)";ctx.shadowBlur=4;ctx.shadowOffsetY=1;} // Lesbarkeit auf metallischem Wash
  ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="800 33px Arial";
  ctx.fillText(d.name||"", W/2, nameY);
  ctx.font="600 15px Arial";ctx.fillStyle="rgba(255,255,255,.9)";
  const sub=[d.spitzname?'„'+d.spitzname+'“':"",d.alter?d.alter+" Jahre":"",d.fuss||""].filter(Boolean).join("  ·  ");
  if(sub)ctx.fillText(sub,W/2,nameY+24);
  if(washOn){ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;}

  // ── Einsatz-Zähler (Fleiß statt Skill-Ranking) ──
  /* v752 (PO 04.10.: „Tore und Aktionen sollten wir erstmal rausnehmen, solange wir das nicht tracken“):
     nur noch Spiele und Trainings der Saison – zwei große Felder statt vier, zwei davon mit „–“. */
  const c=d.counts||null;
  const quad=[{ic:"👟",v:c&&c.spiele,l:"SPIELE"},{ic:"🏃",v:c&&c.trainings,l:"TRAININGS"}];
  const ty=nameY+50, tbh=88, tw4=(W-80)/quad.length;
  ctx.save();tbRoundRect(ctx,40,ty,W-80,tbh,16);ctx.fillStyle="rgba(0,0,0,.20)";ctx.fill();ctx.restore();
  quad.forEach((t,i)=>{
    const tx=40+tw4*i+tw4/2;
    ctx.textAlign="center";
    ctx.font="20px Arial";ctx.fillStyle="#fff";ctx.fillText(t.ic,tx,ty+28);
    ctx.font="800 32px Arial";ctx.fillText((c&&t.v!=null)?String(t.v):"–",tx,ty+60);
    ctx.font="700 12px Arial";ctx.fillStyle="rgba(255,255,255,.85)";ctx.fillText(t.l,tx,ty+75);
    if(i<quad.length-1){ctx.strokeStyle="rgba(255,255,255,.16)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40+tw4*(i+1),ty+14);ctx.lineTo(40+tw4*(i+1),ty+tbh-14);ctx.stroke();}
  });

  // ── Badges (immer 3) ──
  const by=ty+tbh+16, bh=118;
  ctx.save();tbRoundRect(ctx,30,by,W-60,bh,18);ctx.fillStyle="rgba(0,0,0,.24)";ctx.fill();ctx.restore();
  const bw=(W-60)/3;
  /* v563: Ein leerer Kasten sähe aus wie ein Fehler. Steht noch keine Bewertung dahinter,
     sagt die Karte das – die Karte selbst gibt es trotzdem, mit Name, Nummer, Foto und
     den Zählern, denn die hängen an nichts, was erst jemand eintragen müsste. */
  if(!(d.badges||[]).length){
    ctx.textAlign="center";ctx.font="30px Arial";ctx.fillStyle="rgba(255,255,255,.9)";
    ctx.fillText("✨",W/2,by+48);
    ctx.font="700 13px Arial";ctx.fillStyle="#fff";
    if(d.fremd){ ctx.fillText("Teil der",W/2,by+76); ctx.fillText("Adler-Familie 🦅",W/2,by+94); }   // v636: kein Hinweis, wer (noch) nicht bewertet ist
    else{ ctx.fillText("Deine Stärken kommen,",W/2,by+76); ctx.fillText("sobald der Trainer sie einträgt.",W/2,by+94); }
  }
  (d.badges||[]).slice(0,3).forEach((b,i)=>{
    const bx=30+bw*i+bw/2;
    ctx.textAlign="center";ctx.font="30px Arial";ctx.fillStyle="#fff";ctx.fillText(b.icon,bx,by+50);
    ctx.font="700 12px Arial";
    const words=(b.label||"").split(" ");
    ctx.fillText(words[0]||"",bx,by+78);
    if(words[1])ctx.fillText(words.slice(1).join(" "),bx,by+94);
  });

  // ── Quiz-Wissen (Fleiß-Wert, nur wenn gequizzt) ──
  if(c&&c.quizBloecke>0){
    ctx.textAlign="center";ctx.font="600 13px Arial";ctx.fillStyle="rgba(255,255,255,.92)";
    ctx.fillText(`🧠 Quiz: ${c.quizRichtig} richtige · ${c.quizBloecke} ${c.quizBloecke===1?"Block":"Blöcke"}`, W/2, by+bh+30);
  }

  // ── Fußzeile ──
  ctx.textAlign="center";ctx.font="600 12px Arial";ctx.fillStyle="rgba(255,255,255,.8)";
  ctx.fillText("SV Adler Dellbrück · U9 · Saison "+saisonLabel(), W/2, H-22);
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;
}
/* Foto-Pipeline (D2): Kompression nativ (Canvas+toBlob), Upload in den privaten
   Bucket, Laden per authentifiziertem GET -> Blob -> Object-URL (kein CORS/tainted
   canvas). Comic-Filter bewusst entfernt: clientseitig nicht überzeugend, echte
   Cartoonisierung bräuchte ein KI-Modell (Foto müsste extern verarbeitet werden –
   widerspricht dem Datenschutz-Konzept "Foto verlässt das Gerät nie ungebrannt"). */
function fotoLoadFromFile(file){
  // EXIF-Orientierung beruecksichtigen, wo verfuegbar (createImageBitmap), sonst Fallback.
  if(window.createImageBitmap){
    return createImageBitmap(file,{imageOrientation:"from-image"}).catch(()=>fotoLoadFallback(file));
  }
  return fotoLoadFallback(file);
}
function fotoLoadFallback(file){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
}
async function fotoCompress(file,size=400){
  const img=await fotoLoadFromFile(file);
  const iw=img.width||img.naturalWidth, ih=img.height||img.naturalHeight;
  const s=Math.min(iw,ih), sx=(iw-s)/2, sy=(ih-s)/2; // zentriert quadratisch zuschneiden
  const cv=document.createElement("canvas");cv.width=size;cv.height=size;
  cv.getContext("2d").drawImage(img,sx,sy,s,s,0,0,size,size);
  return await new Promise(r=>cv.toBlob(r,"image/jpeg",0.82)); // JPEG-Default (iOS-sicher), spart Traffic
}
// v746: Belege und Aushänge ohne Zuschnitt – längste Seite höchstens max, Seitenverhältnis bleibt
// (fotoCompress schneidet quadratisch zu; bei einem langen Kassenbon fehlten so Kopf und Summe)
async function fotoVerkleinern(file,max=1600){
  const img=await fotoLoadFromFile(file);
  const w=img.width||img.naturalWidth, h=img.height||img.naturalHeight, f=Math.min(1,max/Math.max(w,h));
  const cv=document.createElement("canvas");cv.width=Math.round(w*f);cv.height=Math.round(h*f);
  cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
  return await new Promise(r=>cv.toBlob(r,"image/jpeg",0.85));
}
// Einsatz-Zähler für die Karte: Fleiß-/Dabeisein-Metriken (kein Skill-Ranking, damit
// sich die Kinder nicht in ihren Fähigkeiten vergleichen). Tore = match_actions-Zeilen,
// Spiele = Nominierungen "dabei", Trainings = Anwesenheit "da". Läuft nur mit Trainer-Token.
const CARD_POS_AKTIONEN=["pass","dribbling","gewinn","parade","aufbau","heraus","tor"]; // positiv (verlust/fehler bewusst raus)
async function adlerCardStats(name){
  const enc=encodeURIComponent(name), out={tore:0,paraden:0,aktionen:0,spiele:0,trainings:0,quizRichtig:0,quizBloecke:0};
  try{ // ein Query für alle Ballaktionen des Kindes → Tore/Paraden/Aktionen daraus ableiten
    const r=await fetch(`${SB_URL}/rest/v1/match_actions?spieler=eq.${enc}&select=aktion&limit=10000`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      (await r.json()).forEach(a=>{
        if(a.aktion==="tor")out.tore++;
        if(a.aktion==="parade")out.paraden++;
        if(CARD_POS_AKTIONEN.includes(a.aktion))out.aktionen++;
      });
    }
  }catch(e){}
  /* v734: Spiele und Trainings der Saison aus derselben Zählung wie die Karten der Eltern und Kinder
     (kind_spiele_saison / kind_trainings_saison: nur echte Trainingstermine, nur Nominierung „dabei“, bis heute).
     Fehlt die Funktion (Datenbank vor v734), zählt die App wie bisher selbst. */
  const kid=(typeof getKader==="function"&&getKader(name))||null;
  const saison=async(fn)=>{ try{const r=await fetch(`${SB_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_id:kid?kid.id:null,p_name:name})});
    if(r.ok){const v=await r.json(); return typeof v==="number"?v:null;}}catch(e){} return null; };
  const [spS,trS]=kid?await Promise.all([saison("kind_spiele_saison"),saison("kind_trainings_saison")]):[null,null];
  if(spS!=null)out.spiele=spS; else try{
    const r=await fetch(`${SB_URL}/rest/v1/${nomZeilenPfad()}`,{headers:sbAuthHeaders()});   // v707: nur die Nominierung, nicht die Team-Zeilen
    if(r.ok){out.spiele=(await r.json()).filter(x=>x.data&&kidMapFromIds(x.data)[name]==="dabei").length;}
  }catch(e){}
  if(trS!=null)out.trainings=trS; else try{
    const r=await fetch(`${SB_URL}/rest/v1/anwesenheit?select=data`,{headers:sbAuthHeaders()});
    if(r.ok){out.trainings=(await r.json()).filter(x=>{const d=x.data&&kidMapFromIds(x.data);return d&&d[name]&&d[name].da===true;}).length;}
  }catch(e){}
  try{ // Quiz-Fortschritt ist seit v201 nur noch für Angemeldete lesbar (vorher: Anon-Key)
    const r=await fetch(`${SB_URL}/rest/v1/quiz_progress?player=eq.${enc}&select=score,block`,{headers:sbAuthHeaders()});
    if(r.ok){const rows=await r.json();out.quizBloecke=rows.length;out.quizRichtig=rows.reduce((s,x)=>s+(x.score||0),0);}
  }catch(e){}
  return out;
}
async function fotoLoadImage(path){
  if(!path||!sbToken())return null;
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/spielerfotos/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return null;
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);
    return await new Promise((res,rej)=>{const i=new Image();i.onload=()=>{res(i);};i.onerror=rej;i.src=url;});
  }catch(e){return null;}
}
async function fotoUpload(name,file,btn){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  if(btn)btn.disabled=true;
  try{
    const blob=await fotoCompress(file);
    const path=(crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now()))+".jpg";
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    const pr=await fetch(`${SB_URL}/rest/v1/kader?name=eq.${encodeURIComponent(name)}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({foto_path:path})});
    if(sbCheck401(pr))return;
    await loadKader();
    toast("Foto gespeichert ✓");
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{if(btn)btn.disabled=false;}
}

let adlerCardBlob=null;
async function adlerCardOpen(nameArg){
  const name=(typeof nameArg==="string"&&nameArg)?nameArg:document.getElementById("psel-profil")?.value;
  if(!name){toast("Erst einen Spieler wählen","err");return;}
  const d=adlerCardData(name);
  if(!d){toast("Keine Bewertung vorhanden","err");return;}
  d.counts=null; // Einsatz-Zähler laden asynchron nach
  const W=500,H=780;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  let rawPhoto=null;
  function render(){
    adlerCardDraw(ctx,W,H,d,rawPhoto);
    canvas.toBlob(b=>{adlerCardBlob=b;},"image/png");
  }
  render(); // sofort (Initialen + "–"), Foto und Zähler laden asynchron nach
  const modal=document.createElement("div");
  modal.id="adler-card-modal";
  /* v753 (PO 04.10., Bildschirmfoto): Mit justify-content:center schneidet ein Flex-Container, der höher ist als der
     Bildschirm, oben und unten ab – der obere Teil ist nicht erreichbar. Wie im Eltern-Bereich: innen margin:auto
     zentriert, solange Platz ist, und scrollt, sobald keiner mehr ist. */
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10002;display:flex;flex-direction:column;padding:16px;overflow-y:auto";
  modal.style.zIndex=(typeof zOben==="function")?zOben(10002):10002;
  const innen=document.createElement("div");
  innen.style.cssText="margin:auto;display:flex;flex-direction:column;align-items:center;gap:14px;width:100%";
  modal.appendChild(innen);
  modal.onclick=e=>{if(e.target===modal||e.target===innen)modal.remove();};
  canvas.style.cssText="max-width:100%;width:300px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)";
  const cardWrap=cardHoloWrap(canvas); // FUT 2.0: Foil-Overlay über der Karte
  innen.appendChild(cardWrap);
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
  bar.innerHTML=`<button class="btn btn-p" onclick="adlerCardShare()"><i class="ti ti-share"></i>Karte teilen</button>
    <button class="btn" onclick="document.getElementById('adler-card-modal').remove()">Schließen</button>`;
  innen.appendChild(bar);
  document.body.appendChild(modal);
  // Federn-Stand → Karten-Skin (wird in render() gebacken) + Foil-Tier + Skin-Galerie
  if(d.spielerId){ xpTotal(d.spielerId).then(f=>{ if(document.getElementById("adler-card-modal")){ d.federn=f; render(); cardHoloSetTier(cardWrap,cardSkinFor(f)); innen.appendChild(cardSkinGalleryEl(f)); } }).catch(()=>{}); }
  // Einsatz-Zähler laden und neu zeichnen (Modal-Guard gegen Race, falls schon geschlossen)
  adlerCardStats(name).then(c=>{ if(document.getElementById("adler-card-modal")){ d.counts=c; render(); cardApplyGlow(canvas,c.trainings); } });
  // Foto (falls vorhanden) laden und neu zeichnen
  if(d.fotoPath){ const img=await fotoLoadImage(d.fotoPath); if(img&&document.getElementById("adler-card-modal")){ rawPhoto=img; render(); } }
}
async function adlerCardShare(){
  if(!adlerCardBlob){toast("Karte noch nicht bereit","err");return;}
  const file=new File([adlerCardBlob],"adler-karte.png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:"Adler-Karte",text:"Meine Adler-Sammelkarte ⚽"});}catch(e){}
  }else{
    const a=document.createElement("a");a.href=URL.createObjectURL(adlerCardBlob);a.download="adler-karte.png";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Karte heruntergeladen ✓");
  }
}

/* ═══════════════════════════════════
   VERLAUF VIEW
═══════════════════════════════════ */
let vchart=null,vchartTimer=0;
function renderVerlauf(){
  const name=document.getElementById("psel-verlauf").value;
  if(!name){document.getElementById("verlauf-content").innerHTML=spielerWahlLeer("psel-verlauf","ti-chart-line","die Entwicklung");return;}
  if(!window.Chart){ensureChart().then(renderVerlauf).catch(()=>{});return;} // Chart lazy laden
  const snaps=DB[name]||[];
  const isTw=getKader(name)?.tw||false;
  const dims=isTw?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
  const dl=dims.map(d=>d.label.split(" ")[0]);
  const cols=dims.map(d=>d.col);
  const dates=snaps.map(s=>s.datum||'–');
  const datasets=dl.map((l,i)=>({label:l,data:snaps.map(s=>{const sc=safeParse(s.scores,[]);return sc[i]||0;}),borderColor:cols[i],backgroundColor:"transparent",borderWidth:2,pointRadius:4,tension:.3}));
  let deltaHtml="";
  if(snaps.length>=2){
    const prev=snaps[snaps.length-2],curr=snaps[snaps.length-1];
    const scP=safeParse(prev.scores,[]);const scC=safeParse(curr.scores,[]);
    const totD=(curr.total_score||0)-(prev.total_score||0);
    deltaHtml=`<div class="delta-box"><div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:8px"><i class="ti ti-trending-up" style="font-size:var(--s-text)"></i> Delta ${esc(prev.datum||'–')} → ${esc(curr.datum||'–')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${dl.map((l,i)=>{const d=(scC[i]||0)-(scP[i]||0);return`<span class="hp">${l}: <span class="${d>0?'dp':d<0?'dn':''}">${d>0?'+':''}${d}%</span></span>`;}).join("")}</div>
    <div style="font-size:var(--s-text);font-weight:600">Gesamt: <span class="${totD>0?'dp':totD<0?'dn':''}">${totD>0?'+':''}${totD}%</span></div></div>`;
  }
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
    <div style="font-weight:700;font-size:var(--s-karte)">${esc(name)}${isTw?" 🥅":""}</div>
    <span style="font-size:var(--s-klein);color:var(--text2)">${snaps.length} Bewertung${snaps.length!==1?"en":""}</span>
  </div>
  ${snaps.length>=2?deltaHtml:""}
  ${snaps.length<2?'<div class="status s-info show" style="margin-bottom:.75rem">Mind. 2 Bewertungen für Verlaufsdiagramm nötig.</div>':""}
  <div style="position:relative;height:240px;margin-bottom:1rem"><canvas id="vc" role="img" aria-label="Verlauf ${esc(name)}">Entwicklung</canvas></div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:1rem">${dl.map((l,i)=>`<span style="display:flex;align-items:center;gap:5px;font-size:var(--s-klein);font-weight:500;color:var(--text2)"><span style="width:14px;height:3px;background:${cols[i]};display:inline-block;border-radius:2px"></span>${l}</span>`).join("")}</div>
  <div class="sl"><i class="ti ti-history"></i>Alle Snapshots</div>`;
  snaps.forEach((s,idx)=>{
    const sc=safeParse(s.scores,[]);
    const prev=idx>0?safeParse(snaps[idx-1].scores,null):null;
    const bMap={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts"};
    html+=`<div class="hi">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
        <span style="font-weight:600;font-size:var(--s-text)">${esc(s.datum||'–')}</span>
        <span class="rbadge ${bMap[s.position]||'rb-flex'}">${esc(s.prim_rolle||s.position||'–')}</span>
        <span style="font-size:var(--s-klein);color:var(--text2)">${esc(s.trainer||'')}</span>
        <span style="font-size:var(--s-karte);font-weight:700;color:var(--blue-text)">${s.total_score||0}%</span>
        <button data-del-snap data-name="${esc(name)}" data-datum="${esc(s.datum||'')}" data-id="${esc(s.id||'')}" style="padding:3px 8px;font-size:var(--s-klein);background:var(--red-bg);color:var(--red);border:1px solid #fca5a5;border-radius:6px;cursor:pointer;font-family:inherit">Löschen</button>
      </div>
      <div class="hs">${dl.map((l,i)=>{const d=prev?(sc[i]||0)-(prev[i]||0):0;const ds=d>0?`<span class="dp"> +${d}</span>`:d<0?`<span class="dn"> ${d}</span>`:"";return`<span class="hp">${l}: ${sc[i]||0}%${ds}</span>`;}).join("")}</div>
    </div>`;
  });
  document.getElementById("verlauf-content").innerHTML=html;
  const vPrintBtn=document.getElementById("print-verlauf-btn");
  if(vPrintBtn)vPrintBtn.style.display=name?"inline-flex":"none";
  if(vchart){vchart.destroy();vchart=null;}
  clearTimeout(vchartTimer);
  vchartTimer=setTimeout(()=>{
    const ctx=document.getElementById("vc");if(!ctx)return;
    vchart=new Chart(ctx,{type:"line",data:{labels:dates,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{stepSize:25}}}}});
  },80);
}

/* ═══════════════════════════════════
   NAV
═══════════════════════════════════ */
/* ═══════════════════════════════════
   NAVIGATION – 5 Tabs, datengetriebener 2-Ebenen-Router
   TABS: Bottom-Nav-Tab -> Sektionen (dynamische Sub-Tab-Leiste).
   SECS: Sektion -> Container-ID + Init-Funktion (+ sub:true = liegt im Host #view-training).
   sv()/switchTrainSub() bleiben als Kompatibilitäts-Shims für Altaufrufe erhalten.
═══════════════════════════════════ */
const TABS={
  home:    {sections:[
    {key:"home",    label:"Dashboard", icon:"ti-home"},
  ]},
  /* v553 – Die erste Sektion jedes Bereichs ist seine KACHEL-EBENE.
     Vorher führte die untere Leiste unmittelbar in eine Detailseite, während der Weg
     über die Startseite erst Kacheln zeigte. Zwei Wege, zwei Bilder, und die neuen
     Kacheln (Ausstattung, Material) gab es nur auf einem davon – gesucht wurde
     „Ausstattung" folglich im Team-REITER, wo sie nie stand.
     Jetzt endet jeder Weg auf derselben Seite. Die Detailreiter bleiben daneben
     stehen, wer den Sprung kennt, spart sich den Zwischenhalt. */
  // Reiter-Beschriftung = Kachel-Beschriftung = Seitenüberschrift (PO: ein Name je Sache)
  team:    {sections:[
    {key:"ue-team", label:"Übersicht",   icon:"ti-layout-grid"},
    {key:"kader",   label:"Kader",       icon:"ti-users"},
    {key:"profil",  label:"Profil",      icon:"ti-user"},
    {key:"bew",     label:"Bewerten",    icon:"ti-clipboard-list"},
    {key:"verlauf", label:"Entwicklung", icon:"ti-chart-line"},
  ]},
  training:{sections:[
    // Beschriftung muss zur Training-Kachel passen (PO) – ein Name je Sache
    {key:"ue-training", label:"Übersicht", icon:"ti-layout-grid"},
    {key:"anwesenheit", label:"Anwesenheit",   icon:"ti-checkbox"},
    {key:"planung",     label:"Trainingsplan", icon:"ti-calendar-event"},
    {key:"formen",      label:"Übungen",       icon:"ti-ball-football"},
    {key:"quizresults", label:"Quiz-Ergebnisse", icon:"ti-brain", hidden:true, zurueck:"ue-elki"}, // PO: wohnt jetzt unter Eltern & Kinder; go() braucht den Eintrag weiter
  ]},
  spieltag:{sections:[
    {key:"ue-spieltag", label:"Übersicht", icon:"ti-layout-grid"},
    {key:"spieltag", label:"Spieltag",    icon:"ti-ball-football"},   // v710: hieß „Match“, Kachel und Zurück-Knopf sagen „Spieltag“
    {key:"kombi",    label:"Aufstellung", icon:"ti-users-group"},
    {key:"analyse",  label:"Analyse",     icon:"ti-chart-dots"},
  ]},
  taktik:  {sections:[
    /* v682: keine Kachel-Ebene mehr – sie trug eine einzige Kachel („Taktikboard“) und war
       damit ein Tipp ohne Wahl. „Taktik“ führt direkt aufs Brett. */
    {key:"taktik",   label:"Taktikboard", icon:"ti-arrows-move"},
  ]},
  orga:    {sections:[
    {key:"ue-orga", label:"Übersicht", icon:"ti-layout-grid"},
    {key:"termine",  label:"Termine",  icon:"ti-calendar"},
    {key:"team",     label:"Pinnwand", icon:"ti-clipboard"},
    /* v526: Das Tagebuch steht neben der Pinnwand, weil beides Notizen sind – nur gehoert
       die Pinnwand dem Team und das Tagebuch Charles allein. Es ist weder Training noch
       Spieltag: die Eintraege kommen aus beidem. */
    {key:"tagebuch", label:"Tagebuch", icon:"ti-book"},
  ]},
  /* Eltern & Kinder hat nur die Kachel-Ebene: alles darunter öffnet ein eigenes
     Fenster, es gibt keine Detailseite im Router. Die Reiterzeile bleibt deshalb
     verborgen (renderSubbar blendet sie bei einer einzigen Sektion aus). */
  elki:    {sections:[
    {key:"ue-elki",  label:"Übersicht", icon:"ti-layout-grid"},
  ]},
};
/* Eine Welle-2-Funktion sicher aufrufen. Fehlt das Modul – etwa weil ein SyntaxError
   die Datei abgebrochen hat, was laut CLAUDE.md KEIN script.onerror ausloest – reisst
   ein direkter Aufruf hier die ganze Navigation mit: man kaeme in KEINEN Bereich mehr,
   nicht nur in den betroffenen. Stattdessen eine ehrliche Meldung, der Rest bleibt
   bedienbar. Fuer Sonderrouten gibt es das Gegenstueck routeRender() in boot.js. */
function w2(name,...args){
  const f=window[name];
  if(typeof f==="function")return f(...args);
  if(typeof toast==="function")toast("Dieser Bereich konnte nicht geladen werden ("+name+"). Bitte die App neu laden.","err");
  return undefined;
}
const SECS={
  home:       {cid:"view-home",            init:()=>renderHome()},
  /* v553: die sechs Kachel-Ebenen. Eine Zeile je Bereich, der Inhalt kommt aus
     derselben Quelle wie früher im Fenster (_kachelInhalt). */
  "ue-team":     {cid:"view-ue-team",     init:()=>kachelSeite("team")},
  "ue-training": {cid:"view-ue-training", init:()=>kachelSeite("training")},
  "ue-spieltag": {cid:"view-ue-spieltag", init:()=>kachelSeite("spieltag")},
  "ue-elki":     {cid:"view-ue-elki",     init:()=>kachelSeite("elki")},
  "ue-orga":     {cid:"view-ue-orga",     init:()=>kachelSeite("orga")},
  bew:        {cid:"view-bew",              init:()=>{const s=document.getElementById("p-date");if(s&&s.options.length<=1&&typeof terminSelectFill==="function")terminSelectFill("p-date",{});}},
  kader:      {cid:"view-kader",           init:()=>renderKader()},
  profil:     {cid:"view-profil",          init:()=>renderProfil()},
  verlauf:    {cid:"view-verlauf",         init:()=>renderVerlauf()},
  kombi:      {cid:"view-kombi",           init:()=>renderKombi()},
  taktik:     {cid:"view-taktik",          init:()=>w2("taktikInit")},
  formen:     {cid:"train-sub-formen",     sub:true, init:()=>renderTraining()},
  termine:    {cid:"train-sub-termine",    sub:true, init:()=>w2("tmInit")},
  planung:    {cid:"train-sub-planung",    sub:true, init:()=>{const s=document.getElementById("tp-date");
    // v413: Trainer-Chips aus den Rückmeldungen füllen (zieht tpRenderTimeline mit)
    const go=()=>{(typeof tpTrainerRsvpLaden==="function"?tpTrainerRsvpLaden():tpRenderTimeline());
      if(typeof tpPlanRestore==="function")tpPlanRestore();
      /* v538: ERST hier, nicht daneben. Die Kacheln markieren den gewählten Termin und
         lesen ihn aus #tp-date; daneben aufgerufen liefen sie gegen ein Auswahlfeld,
         das terminSelectFill noch gar nicht gefüllt hatte – die Marke „gewählt" fehlte
         dann beim ersten Öffnen. */
      if(typeof tpVorplanLoad==="function")tpVorplanLoad();};
    if(s&&s.options.length<=1&&typeof terminSelectFill==="function")terminSelectFill("tp-date",{types:["training"],future:true,vorbeiUeberspringen:true,onReady:go}); else go();}},
  anwesenheit:{cid:"train-sub-anwesenheit",sub:true, init:()=>awDatesLoad()},
  quizresults:{cid:"train-sub-quizresults",sub:true, init:()=>w2("tqRenderTrainerView")},
  team:       {cid:"train-sub-team",       sub:true, init:()=>{w2("tnLoad");w2("teamStatsRender");tvInit();}},
  analyse:    {cid:"train-sub-analyse",    sub:true, init:()=>w2("anInit")},
  tagebuch:   {cid:"train-sub-tagebuch",   sub:true, init:()=>w2("tagebuchListe")},
  spieltag:   {cid:"train-sub-spieltag",   sub:true, init:()=>{spieltagPhasenZu();
                 if(_spieltagPhaseWunsch){const p=_spieltagPhaseWunsch;_spieltagPhaseWunsch=null;spieltagPhaseZeigen(p);}else spieltagPhaseVorwaehlen();w2("rotRenderControls");w2("nomInit");
                 /* v518: Welle-1-Code ruft eine Welle-2-Funktion nie ungeprueft auf. */
                 const ws=document.getElementById("wissen-slot");
                 if(ws&&typeof wissenKachel==="function")ws.innerHTML=wissenKachel();}},
};
const tabState={}; // zuletzt geöffnete Sektion je Tab (UX: Rückkehr an dieselbe Stelle)
let curSection="bew"; // aktuell sichtbare Sektion (für Pull-to-Refresh)
function sectionTab(key){ for(const t in TABS){ if(TABS[t].sections.some(s=>s.key===key))return t; } return null; }

/* v681 PO (Kollegen-Rückmeldung 29.09.): „Die Unterseiten … die Kacheln sind verschoben, optisch
   nicht gut aufgearbeitet … man findet gar nicht direkt, wo man hin will." Die Reiterzeile lief
   auf fast jeder Detailseite über den Rand („Analys…“, „Entwickl…“) und doppelte die Kacheln der
   Übersicht – zwei Wege zum selben Ziel, einer davon halb verdeckt. Jetzt gibt es EINEN Weg:
   Bereich → Kacheln → Seite, und oben auf jeder Seite steht, wo man ist und wohin „zurück“ führt.
   Die Kachel-Ebenen selbst tragen ihren Kopf aus kachelSeite und brauchen hier nichts. */
function renderSubbar(tabId,activeKey){
  const bar=document.getElementById("tab-subbar");
  if(!bar)return;
  const alle=TABS[tabId].sections, sec=alle.find(s=>s.key===activeKey);
  const ue=sec&&sec.zurueck?sec.zurueck:(alle[0]&&/^ue-/.test(alle[0].key)?alle[0].key:null);
  if(!sec||!ue||ue===activeKey||/^ue-/.test(activeKey)){ bar.style.display="none"; bar.innerHTML=""; return; }
  const zielTab=sectionTab(ue)||tabId, k=(typeof KACHELN!=="undefined"&&KACHELN[zielTab])||{titel:"Übersicht",col:"var(--blue)"};
  bar.style.cssText="display:flex;align-items:center;gap:10px;margin-bottom:14px";
  bar.innerHTML=`<button type="button" class="zurueck-kopf" onclick="go('${ue}')" aria-label="Zurück zu ${esc(k.titel)}" style="border-color:${k.col}"><i class="ti ti-chevron-left" aria-hidden="true"></i>${esc(k.titel)}</button>`
    +`<h2 class="seiten-titel"><i class="ti ${sec.icon}" aria-hidden="true" style="color:${k.col}"></i>${esc(sec.titel||sec.label)}</h2>`;
  titelDoppeltAus(activeKey, sec.titel||sec.label);
}
/* v682: Steht als erste Überschrift einer Unterseite noch einmal ihr Name („Kader“ unter
   „‹ Team · Kader“), wird sie ausgeblendet. Nur die ERSTE und nur bei gleichem Wort –
   „Team-Übersicht“ auf der Pinnwand ist ein Abschnitt, kein Titel, und bleibt. */
function titelDoppeltAus(key,titel){
  const box=SECS[key]&&document.getElementById(SECS[key].cid); if(!box)return;
  const erstes=[...box.children].find(el=>el.nodeType===1&&!el.hidden&&el.tagName!=="SCRIPT"&&el.tagName!=="STYLE"&&!/^(tab-subbar)$/.test(el.id));
  if(!erstes||!erstes.classList.contains("sl"))return;
  const norm=t=>String(t||"").replace(/\s+/g," ").trim().toLowerCase();
  const a=norm(erstes.textContent), b=norm(titel);
  if(a===b||a==="trainer"+b)erstes.setAttribute("data-titel-doppelt","");
}
/* v671: Die Überblendung (startViewTransition) ruft _open verzögert auf. Zwei schnelle Tipps –
   auf einem beschäftigten Gerät, etwa während der Service Worker lädt – konnten dabei in der
   falschen Reihenfolge ankommen: man tippte „Orga“ und landete auf „Eltern & Kinder“. Geöffnet
   wird deshalb immer die zuletzt gewählte Seite, nicht die, mit der der Aufruf begann. */
let _openZiel=null;
function _open(key){
  const sec=SECS[key]; if(!sec)return;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".train-sub").forEach(v=>v.classList.remove("active"));
  if(sec.sub)document.getElementById("view-training")?.classList.add("active"); // passiver Host sichtbar machen
  document.getElementById(sec.cid)?.classList.add("active");
}
/* v624 PO: „Der Zurück-Button auf dem Handy soll nicht zum Schließen der App führen, sondern
   Seite zurück." – Jeder Seitenwechsel legt einen Eintrag in den Verlauf; die Zurück-Taste
   holt die vorige Seite (Handler in core.js). Der unterste Eintrag ist immer die Startseite:
   Wer mitten in einer Seite einsteigt, kommt mit Zurück erst nach Hause und erst von dort
   aus der App. Kommt der Wechsel selbst aus der Zurück-Taste, entsteht kein neuer Eintrag. */
let _seiteAusVerlauf=false;
function _seiteVerlauf(key){
  if(_seiteAusVerlauf)return;
  try{
    const st=history.state;
    if(!st||!st.adlerSeite){
      if(key!=="home"){ history.replaceState({adlerSeite:"home"},""); history.pushState({adlerSeite:key},""); }
      else history.replaceState({adlerSeite:"home"},"");
    }else if(key!==curSection)history.pushState({adlerSeite:key},"");
  }catch(e){}
}
function seiteZurueck(key){
  if(!SECS[key]||key===curSection)return;
  _seiteAusVerlauf=true;
  try{ go(key); }finally{ _seiteAusVerlauf=false; }
}
function go(key){
  const tabId=sectionTab(key); if(!tabId||!SECS[key])return;
  if(typeof nutzungLog==="function")nutzungLog("bereich",key);
  document.querySelectorAll("#main-nav .nb").forEach(b=>{b.classList.remove("active");b.removeAttribute("aria-current");b.style.background="";});
  const nbAktiv=document.getElementById("nb-"+tabId);
  if(nbAktiv){
    nbAktiv.classList.add("active");
    nbAktiv.setAttribute("aria-current","page"); // sonst ist der aktive Bereich nur farblich erkennbar
    // Gleiche Familienfarbe wie Kachel und Unterreiter; ohne Eintrag (Home) bleibt Vereinsblau aus dem CSS
    const fam=(typeof KACHELN!=="undefined"&&KACHELN[tabId])?KACHELN[tabId].col:"";
    if(fam)nbAktiv.style.background=fam;
  }
  renderSubbar(tabId,key);
  const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // v629: Solange der Auftakt läuft, keine Überblendung – sie friert für ihren Schnappschuss ein Bild ein, und das Wappen hakt mitten im Flug.
  _openZiel=key;
  if(document.startViewTransition&&!reduce&&!document.getElementById("adler-intro"))document.startViewTransition(()=>_open(_openZiel||key));else _open(key);
  // Nebenwirkungen (aus altem _svApply/switchTrainSub übernommen)
  if(key==="taktik")requestWakeLock();else releaseWakeLock();
  // Rotations-Timer/Match-Uhr-Tick stoppen beim Verlassen des Spieltags (try/catch: ggf. noch in TDZ beim Start)
  try{ if(key!=="spieltag"&&rotTimerId&&typeof rotStop==="function")rotStop(); }catch(e){} // rotStop persistiert die Zeiten – blanker clearInterval verlor bis zu 30 s Fairness-Daten
  try{ if(key!=="spieltag"&&mcTickId){clearInterval(mcTickId);mcTickId=null;} }catch(e){}
  if(SECS[key].init)setTimeout(SECS[key].init,50);
  tabState[tabId]=key;
  _seiteVerlauf(key);
  curSection=key;
  try{sessionStorage.setItem("adler_letzte_seite",key);}catch(e){}   // fuers Neuladen (sessionStorage: nur dieser Tab)
}
/* Beim Betreten des Spieltags stehen alle Phasen zu (PO: „bei Match alle Punkte
   eingeklappt haben"). <details> merkt sich seinen Zustand im DOM – wer gestern
   „Waehrend des Spiels" aufgeklappt hat, fand es beim naechsten Besuch offen vor und
   scrollte an fuenf offenen Bloecken vorbei. Gezielte Spruenge (tmJump auf das
   Blitz-Rating, Match-Uhr auf „Waehrend des Spiels") laufen SPAETER und oeffnen weiter. */
function spieltagPhasenZu(){
  document.querySelectorAll("#train-sub-spieltag details.el-sect").forEach(d=>{d.open=false;});
  spieltagPhasenKacheln(null);
}
/* v681 – Drei Phasen, drei Kacheln, immer nur EINE offen. Eine Phase umfasst mehrere der
   alten Klappblöcke: „Vor dem Spiel“ ist die globale Team-Festlegung UND die Aufstellung des
   Teams, „Nach dem Spiel“ auch die Team-Quests. Wer von außen einen Block per .open aufklappt
   (Match-Uhr → Live, Blitz-Rating → Nach, Anwesenheit → Vor), bekommt über den toggle-Wächter
   unten die ganze Phase und die passende Kachel markiert – kein Aufrufer muss davon wissen. */
/* v702: vier Schritte – „wer“ (Rückmeldungen) steht jetzt vor den Teams. */
const ST_PHASEN={wer:["mt-phase-wer"],vor:["mt-phase-vor","mt-phase-nom"],live:["mt-phase-live"],nach:["mt-phase-nach","mt-phase-quests"]};
function spieltagPhaseVon(id){ for(const p in ST_PHASEN)if(ST_PHASEN[p].includes(id))return p; return null; }
function spieltagPhaseAktuell(){
  for(const p in ST_PHASEN)if(ST_PHASEN[p].some(id=>(document.getElementById(id)||{}).open))return p;
  return null;
}
function spieltagPhasenKacheln(p){
  document.querySelectorAll("#mt-phasen .phase-kachel").forEach(b=>{
    const an=b.dataset.phase===p;
    b.setAttribute("aria-pressed",an?"true":"false"); b.classList.toggle("an",an);
  });
  const leer=document.getElementById("mt-phasen-leer"); if(leer)leer.hidden=!!p;
  /* v703 PO (Bildschirmfoto 01.10.): „Wenn ich unten eins der Teams anklicke, passiert nichts.“ Die
     Kacheln „Adler n“ standen auch unter „Wer kommt?“ – ihr Inhalt (Aufstellung, Uhr, Ergebnis)
     gehört zu den Schritten 2 bis 4, die dort zu sind. Unter Schritt 1 und ohne Schritt stehen sie nicht. */
  const tk=document.getElementById("spieltag-teamkarten"); if(tk)tk.hidden=!p||p==="wer";
}
function spieltagPhaseZeigen(p){
  if(!ST_PHASEN[p])return;
  for(const q in ST_PHASEN)ST_PHASEN[q].forEach(id=>{const d=document.getElementById(id); if(d&&d.open!==(q===p))d.open=(q===p);});
  spieltagPhasenKacheln(p);
  /* Bei mehreren Teams steckt der Inhalt von Aufstellung, Uhr und Ergebnis in der Kachel des
     gewählten Teams. Ist keine aufgeklappt, sähe man nach dem Tipp auf „Während“ nichts –
     also die Kachel des gewählten Teams öffnen. Welle 2, deshalb nur über typeof. */
  try{
    if(p!=="wer"&&typeof TEAM_ANZAHL!=="undefined"&&TEAM_ANZAHL>1&&typeof TEAM_KARTE_OFFEN!=="undefined"&&!TEAM_KARTE_OFFEN   // v703: „Wer kommt?“ hat keine Team-Kacheln
       &&typeof spieltagKarteOeffnen==="function")spieltagKarteOeffnen((typeof spieltagTeam!=="undefined"&&spieltagTeam)||1);
  }catch(e){}
}
document.addEventListener("toggle",e=>{
  const d=e.target; if(!d||!d.id)return;
  const p=spieltagPhaseVon(d.id); if(!p)return;
  if(!d.open){ spieltagPhasenKacheln(spieltagPhaseAktuell()); return; }
  const stimmig=Object.keys(ST_PHASEN).every(q=>ST_PHASEN[q].every(id=>{const x=document.getElementById(id); return !x||x.open===(q===p);}));
  if(stimmig)spieltagPhasenKacheln(p); else spieltagPhaseZeigen(p);
},true);
/* Sprung von der Spieltag-Übersicht direkt in eine Phase. go() ruft die Seite erst nach 50 ms
   auf und schließt dabei alle Phasen – der Wunsch wird deshalb dort eingelöst, nicht hier. */
let _spieltagPhaseWunsch=null;
function spieltagPhase(p){ _spieltagPhaseWunsch=ST_PHASEN[p]?p:null; go("spieltag"); }
/* v473 – Rundgang: Am Spieltag lag der Ticker drei Taps tief (Spieltag → Match → „② Während
   des Spiels" aufklappen). Ist der gewaehlte Spieltag HEUTE, oeffnet die Seite den
   Abschnitt, den die Uhrzeit nahelegt: vor dem Anpfiff „① Vor dem Spiel", waehrend „② Live",
   danach „③ Nach dem Spiel". Laeuft die Match-Uhr, zaehlt das mehr als die Uhrzeit.
   An jedem anderen Tag bleibt alles zu (v459). Welle-1-Code: Welle-2-Namen nur ueber typeof. */
async function spieltagPhaseVorwaehlen(){
  const heute=isoLokal();
  const datum=(typeof spieltagRawDate==="function")?spieltagRawDate():(document.getElementById("spieltag-date")?.value||heute);
  /* v702: An jedem anderen Tag als dem Spieltag ist die erste Frage, wer kommt. */
  if(datum!==heute){ if(!spieltagPhaseAktuell()){const w=document.getElementById("mt-phase-wer"); if(w)w.open=true;} return; }
  let t=null, uhr=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=uhrzeit,uhrzeit_ende&typ=in.(spiel,turnier)&datum=eq.${heute}&order=uhrzeit.asc.nullslast&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)t=((await r.json())||[])[0]||null;
    const m=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${heute}&select=clock_status`,{headers:sbAuthHeaders()});
    if(m.ok)uhr=((await m.json())||[])[0]||null;
  }catch(e){}
  if(!t&&!uhr)return;
  const jetzt=new Date().toTimeString().slice(0,5);
  const ab=(t&&t.uhrzeit)?String(t.uhrzeit).slice(0,5):null, bis=(t&&t.uhrzeit_ende)?String(t.uhrzeit_ende).slice(0,5):null;
  let phase="mt-phase-vor";
  if(uhr&&uhr.clock_status&&uhr.clock_status!=="idle")phase="mt-phase-live";
  else if(ab&&jetzt>=ab)phase=(bis&&jetzt>bis)?"mt-phase-nach":"mt-phase-live";
  if(spieltagPhaseAktuell())return;   // v681: inzwischen selbst eine Phase gewählt – nicht überstimmen
  const d=document.getElementById(phase); if(d)d.open=true;
}
/* v553 – Ein Tipp auf die untere Leiste führt IMMER auf die Kachel-Ebene, nicht
   dorthin zurück, wo man in diesem Bereich zuletzt war. Das ist bewusst ein Verzicht:
   `tabState` merkte sich die letzte Sektion, damit man an derselben Stelle weitermacht.
   Genau das war aber der Grund, warum die Leiste unberechenbar wurde – derselbe Knopf
   führte je nach Vorgeschichte woanders hin. Ein Navigationsziel, das sich merkt, wo man
   war, ist kein Ziel mehr. Bereiche ohne Kachel-Ebene (Home) verhalten sich wie bisher. */
function openTab(tabId){
  if(!TABS[tabId])return;
  const erste=TABS[tabId].sections[0].key;
  go(/^ue-/.test(erste)?erste:(tabState[tabId]||erste));
}
// Kompatibilitäts-Shims: bestehende sv()/switchTrainSub()-Aufrufe im Code bleiben gültig
function sv(name){ if(name==="training"){openTab("training");return;} go(name); }
function switchTrainSub(sub){ go(sub); }

/* ═══════════════════════════════════
   HOME – Trainer-Dashboard
   Next-Event (aus termine), Geburtstags-Alerts (KADER.geb, optional gepflegt),
   Quick-Stats aus DB/KADER. Reine Lesesicht mit Schnellsprüngen.
═══════════════════════════════════ */
function homeAlter(geb){ // Alter in Jahren aus YYYY-MM-DD
  const g=new Date(geb+"T00:00:00"),h=new Date();
  let a=h.getFullYear()-g.getFullYear();
  if(h.getMonth()<g.getMonth()||(h.getMonth()===g.getMonth()&&h.getDate()<g.getDate()))a--;
  return a;
}
/* v660 PO 28.09.: „… damit wir auch den Eltern als Teil der Mannschaft gratulieren können.“
   Die Karte stand bis v659 als toter Code in renderHome (gebaut, nie eingesetzt). Jetzt: Kinder
   aus dem Kader und Eltern aus eltern_angaben, die in den nächsten 14 Tagen Geburtstag haben.
   Eltern tragen ihren Geburtstag selbst ein; das Alter der Eltern steht bewusst nicht dabei. */
async function homeGeburtstage(){
  const slot=document.getElementById("home-geb"); if(!slot)return;
  const liste=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.geb&&k.aktiv!==false)
    .map(k=>({name:k.name,d:homeGebTage(k.geb),alter:homeAlter(k.geb)+1,kind:true}));
  try{
    const r=await fetch(`${SB_URL}/rest/v1/eltern_angaben?select=vorname,nachname,geburtstag&geburtstag=not.is.null`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(e=>{const n=[e.vorname,e.nachname].filter(Boolean).join(" ");if(n)liste.push({name:n,d:homeGebTage(e.geburtstag),kind:false});});
  }catch(e){}
  const bald=liste.filter(x=>x.d<=14).sort((a,b)=>a.d-b.d);
  if(!document.getElementById("home-geb"))return;
  if(!bald.length){slot.innerHTML="";return;}
  slot.innerHTML=`<div class="card" style="padding:12px 14px;margin-top:10px;border-left:3px solid var(--amber)">
    <div style="font-weight:800;font-size:var(--s-text);margin-bottom:4px">🎂 Geburtstage in den nächsten 14 Tagen</div>
    ${bald.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:3px 0">
      <span aria-hidden="true">${x.d===0?"🎉":"🎂"}</span><strong>${esc(x.name)}</strong>
      <span style="color:var(--text2);font-size:var(--s-klein)">${x.kind?"":"Elternteil · "}${x.d===0?(x.kind?`wird HEUTE ${x.alter}!`:"hat HEUTE Geburtstag!"):`in ${x.d} Tag${x.d===1?"":"en"}${x.kind?` · wird ${x.alter}`:""}`}</span>
    </div>`).join("")}
  </div>`;
}
function homeGebTage(geb){ // Tage bis zum nächsten Geburtstag (0 = heute)
  const h=new Date();h.setHours(0,0,0,0);
  const g=new Date(geb+"T00:00:00");
  const next=new Date(h.getFullYear(),g.getMonth(),g.getDate());
  if(next<h)next.setFullYear(h.getFullYear()+1);
  return Math.round((next-h)/86400000);
}
// "Kein Kind übersehen"-Radar: welche Kinder hatten zuletzt am wenigsten Spielzeit/Aktionen?
// Fairness-Nudge fürs Trainer-Dashboard. Nur bei genug Daten sichtbar.
/* Elterngespräch-Wünsche (Trainer): offene Anfragen der Eltern anzeigen + abhaken. */
async function elterngespraecheTrainerLoad(){
  const box=document.getElementById("eg-trainer"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/elterngespraech_wunsch?status=eq.offen&select=id,thema,created_at,spieler_id,kader(name)&order=created_at.asc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML="";return;}
  box.innerHTML=`<div class="card" style="border-left:3px solid #7c3aed;padding:12px 14px;margin-top:10px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="flex:1;font-weight:800;font-size:var(--s-text)">🗣️ Elterngespräch-Wünsche (${rows.length})</div>
      <button onclick="epollTrainerOpen()" class="btn btn-sm">🗓️ Terminfindungen</button></div>
    ${rows.map(w=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:var(--border-s)">
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-text);font-weight:700">${esc((w.kader&&w.kader.name)||"Ein Elternteil")}</div>
        ${w.thema?`<div style="font-size:var(--s-klein);color:var(--text2);line-height:1.4">${esc(w.thema)}</div>`:`<div style="font-size:var(--s-klein);color:var(--text3)">Kein Thema angegeben</div>`}
        <div style="font-size:var(--s-klein);color:var(--text3);margin-top:2px">${new Date(w.created_at).toLocaleDateString("de-DE")}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex:none">
        ${w.spieler_id?`<button onclick="epollTrainerOpen(${w.spieler_id})" class="btn btn-sm">🗓️ Termine</button>`:""}
        <button onclick="elterngespraechErledigt(${w.id})" class="btn btn-sm">Erledigt</button>
      </div>
    </div>`).join("")}
  </div>`;
}
async function elterngespraechErledigt(id){
  try{const r=await fetch(`${SB_URL}/rest/v1/elterngespraech_wunsch?id=eq.${id}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({status:"erledigt"})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht ändern"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Als erledigt markiert ✓");
  elterngespraecheTrainerLoad();
}

/* v644: Löschanträge der Eltern. Oben auf der Startseite, solange einer offen ist – DSGVO
   gibt einen Monat. „Jetzt löschen“ ruft die Edge Function kind-loeschen: Kaderplatz und alles
   daran, Einschätzungen, Foto, Sprach-Lobe und Kindergeräte; Pläne und Spielberichte behalten
   „Ehemaliges Kind“ statt des Namens. confirm() ist im Trainerbereich erlaubt (CLAUDE.md). */
async function loeschantraegeTrainerLoad(){
  const box=document.getElementById("la-trainer"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/loeschantrag?erledigt_am=is.null&select=id,spieler_id,erstellt_am,antrag_email&order=erstellt_am.asc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML="";return;}
  const name=id=>((typeof KADER!=="undefined"?KADER:[]).find(k=>Number(kaderId(k))===Number(id))||{}).name||"Kind (nicht im Kader)";
  box.innerHTML=`<div class="card" style="border-left:3px solid var(--red);padding:12px 14px;margin-top:10px">
    <div style="font-weight:800;font-size:var(--s-text);margin-bottom:6px">🗑️ Löschanträge (${rows.length})</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">Eltern bitten, alle Daten ihres Kindes zu löschen. Frist: ein Monat ab Antrag.</div>
    ${rows.map(a=>{ const tage=Math.floor((Date.now()-new Date(a.erstellt_am))/864e5);
      return `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:var(--border-s)">
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-text);font-weight:700">${esc(name(a.spieler_id))}</div>
        <div style="font-size:var(--s-klein);color:var(--text2)">seit ${new Date(a.erstellt_am).toLocaleDateString("de-DE")} (${tage} ${tage===1?"Tag":"Tage"})${a.antrag_email?" · "+esc(a.antrag_email):""}</div>
      </div>
      <button onclick="kindVollstaendigLoeschen(${Number(a.spieler_id)},this)" class="btn btn-sm" style="color:var(--red);border-color:var(--red);min-height:44px">Jetzt löschen</button>
    </div>`;}).join("")}
  </div>`;
}
async function kindVollstaendigLoeschen(spielerId,btn){
  const k=(typeof KADER!=="undefined"?KADER:[]).find(x=>Number(kaderId(x))===Number(spielerId));
  const nm=(k&&k.name)||"dieses Kind";
  if(!confirm(`Alle Daten von ${nm} endgültig löschen?\n\nKaderplatz, Rückmeldungen, Freigaben, Notfallkarte, Kabine, Einschätzungen, Foto und Kindergeräte. In Plänen und Spielberichten steht danach „Ehemaliges Kind“. Das lässt sich nicht rückgängig machen.`))return;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/functions/v1/kind-loeschen`,{method:"POST",headers:{...sbAuthHeaders(),"Content-Type":"application/json"},body:JSON.stringify({spieler_id:spielerId})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){toast("Nicht gelöscht: "+(d.error||("Fehler "+r.status)),"err");if(btn)btn.disabled=false;return;}
    toast(`${nm} ist gelöscht ✓`);
  }catch(e){toast("Kein Netz – nichts gelöscht","err");if(btn)btn.disabled=false;return;}
  try{ await loadKader(); if(typeof renderKader==="function")renderKader(); }catch(e){}
  loeschantraegeTrainerLoad();
}

/* Trainer-Meeting-Doodle: Terminvorschläge, Abstimmung (✓/?/✗) unter Trainern, festlegen.
   Nur Trainer (RLS). Stimmen per Upsert (voter = auth.uid()).

   v527 – der Umbau: Das Meeting ist jetzt eine eigene TERMINART. Diese Ansicht bleibt als
   Übersicht über alle Meetings; angelegt und bearbeitet wird aus dem Termin heraus
   (tmMeetingOeffnen). Dazu vier Dinge, die vorher fehlten:

   · „Hier können alle" steht ausdrücklich da, statt sich aus drei Zahlenreihen zu ergeben.
   · Wer noch nicht abgestimmt hat, steht mit Namen da. „✓ 3" bei fünf Trainern heißt eben
     nicht, dass zwei abgesagt haben – vielleicht haben zwei nur nicht geantwortet, und das
     ist für die Entscheidung ein Unterschied.
   · Themen lassen sich von Anfang an sammeln, nicht erst wenn der Termin steht. Der Moment,
     in dem einem etwas einfällt, ist selten der, in dem der Termin feststeht.
   · Beim Abhaken fragt die App nach dem BESCHLUSS. Ein Haken sagt „erledigt", aber nicht
     was entschieden wurde – der häufigste Grund, warum dasselbe Thema im übernächsten
     Meeting wieder auftaucht. */
let _TPOLL_TERMIN=null;   // gesetzt = nur das Meeting dieses Termins zeigen
/* Namen der Trainer zu ihren User-IDs. Nur id und anzeigename – die E-Mail aus `profiles`
   wird hier NICHT geholt, sie hat im Browser nichts verloren. */
let _TPOLL_NAMEN=null;
async function tpollNamen(){
  if(_TPOLL_NAMEN)return _TPOLL_NAMEN;
  const map={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/profiles?select=id,anzeigename&role=eq.trainer`,{headers:sbAuthHeaders()});
    if(r.ok)((await r.json())||[]).forEach(x=>{ if(x&&x.id)map[x.id]=(x.anzeigename||"").trim()||"Trainer"; });
  }catch(e){}
  _TPOLL_NAMEN=map; return map;
}
/* Aus dem Termin heraus: die Abstimmung und die Themen zu genau diesem Meeting.

   v528 – PO: „Es fehlt die Möglichkeit Themen zu sammeln. Und wo finde ich die Möglichkeit
   für einen Termin abstimmen zu lassen?" Beides hing daran, dass die Abstimmung erst
   entstand, wenn jemand von Hand einen Vorschlag eintrug – und die Themenliste hängt an
   der Abstimmung. Wer nur Themen sammeln wollte, stand vor einem leeren Fenster.
   Jetzt legt das Öffnen sie an, falls es noch keine gibt: Titel vom Termin, und der Termin
   selbst ist der erste Vorschlag. Er hat ja schon ein Datum – „Termin finden" heißt dann
   nicht mehr „fang bei null an", sondern „oder passt ein anderer besser?". */
async function tmMeetingOeffnen(terminId){
  _TPOLL_TERMIN=Number(terminId)||null;
  document.getElementById("tmd-modal")?.remove();
  if(_TPOLL_TERMIN)await tpollSicherstellen(_TPOLL_TERMIN);
  await trainerMeetingOpen();
}
/* weitere: [{datum,uhrzeit}] aus dem Anlege-Formular (v529, Vorschlag 2 und 3). Der Termin
   selbst bleibt Vorschlag 1 – sein Datum ist das vorlaeufige, bis das Team entschieden hat. */
async function tpollSicherstellen(terminId,weitere){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?termin_id=eq.${Number(terminId)}&select=id&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    if(((await r.json())||[]).length)return;                 // gibt es schon
    const t=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${Number(terminId)}&select=titel,datum,uhrzeit&limit=1`,{headers:sbAuthHeaders()});
    if(!t.ok)return;
    const termin=((await t.json())||[])[0]; if(!termin)return;
    const neu=await fetch(`${SB_URL}/rest/v1/trainer_poll`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},
      body:JSON.stringify({titel:(termin.titel||"Trainermeeting"),termin_id:Number(terminId)})});
    if(!neu.ok&&neu.status!==201)return;
    const poll=((await neu.json())||[])[0]; if(!poll)return;
    const slots=[];
    if(termin.datum)slots.push({poll_id:poll.id,datum:termin.datum,uhrzeit:termin.uhrzeit||null});
    (Array.isArray(weitere)?weitere:[]).forEach(w=>{
      if(!w||!w.datum)return;
      if(slots.some(x=>x.datum===w.datum&&String(x.uhrzeit||"")===String(w.uhrzeit||"")))return;   // derselbe Vorschlag zweimal hilft niemandem
      slots.push({poll_id:poll.id,datum:w.datum,uhrzeit:w.uhrzeit||null});
    });
    if(slots.length){
      await fetch(`${SB_URL}/rest/v1/trainer_poll_slot`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},
        body:JSON.stringify(slots)});
    }
    await tpollOffeneUebernehmen(poll.id);
  }catch(e){}
}
async function trainerMeetingOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("tm-meet-modal")?.remove();
  const m=document.createElement("div");m.id="tm-meet-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m){m.remove();_TPOLL_TERMIN=null;}};
  const c=document.createElement("div");c.id="tm-meet-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3)">Lade …</div>';
  m.appendChild(c);document.body.appendChild(m);
  tpollRender();
}
async function tpollRender(){
  const c=document.getElementById("tm-meet-card"); if(!c)return;
  // min-height:44px – die Felder im „Neues Meeting"-Block waren 33 px hoch und standen
  // damit neben dem 44er-Themenfeld sichtbar aus der Reihe.
  const FLD="padding:8px;min-height:44px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box";
  let polls=[],slots=[],votes=[],themen=[];
  const namen=await tpollNamen();
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?select=*&order=created_at.desc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)polls=await r.json();}catch(e){}
  /* Aus dem Termin heraus zeigt das Fenster genau dessen Meeting – sonst muesste man in
     einer Liste aller Meetings das eine suchen, das man gerade offen hatte. */
  const nurTermin=_TPOLL_TERMIN;
  if(nurTermin)polls=polls.filter(p=>Number(p.termin_id)===Number(nurTermin));
  let terminZeile=null;
  if(nurTermin){
    try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${Number(nurTermin)}&select=id,datum,titel,uhrzeit,ort&limit=1`,{headers:sbAuthHeaders()});
      if(r.ok)terminZeile=((await r.json())||[])[0]||null;}catch(e){}
  }
  const pids=polls.map(p=>p.id);
  if(pids.length){
    try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_slot?poll_id=in.(${pids.join(",")})&select=*&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});if(r.ok)slots=await r.json();}catch(e){}
    try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?poll_id=in.(${pids.join(",")})&select=*&order=erledigt.asc,created_at.asc`,{headers:sbAuthHeaders()});if(r.ok)themen=await r.json();}catch(e){}
    const sids=slots.map(s=>s.id);
    if(sids.length){try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_vote?slot_id=in.(${sids.join(",")})&select=slot_id,voter,status`,{headers:sbAuthHeaders()});if(r.ok)votes=await r.json();}catch(e){}}
  }
  const myUid=(typeof sbUserId==="function")?sbUserId():null;
  const slotsByPoll={}; slots.forEach(s=>{(slotsByPoll[s.poll_id]=slotsByPoll[s.poll_id]||[]).push(s);});
  const votesBySlot={}; votes.forEach(v=>{(votesBySlot[v.slot_id]=votesBySlot[v.slot_id]||[]).push(v);});
  const themenByPoll={}; themen.forEach(t=>{(themenByPoll[t.poll_id]=themenByPoll[t.poll_id]||[]).push(t);});
  const pollHtml=polls.map(p=>{
    const steht=p.status==="entschieden";
    /* Steht der Termin, hat die Abstimmung ihre Arbeit getan: die uebrigen Vorschlaege und
       die ✓/?/✗-Knoepfe sind dann nur noch Krach. Ab hier geht es um den INHALT. */
    const ss=(slotsByPoll[p.id]||[]).filter(s=>!steht||s.id===p.decided_slot_id);
    /* v527 – „welchen Termin können alle": kein einziges ✗ und die meisten ✓. Bei
       Gleichstand gewinnt der frühere Vorschlag (die Liste ist nach Datum sortiert), damit
       die Empfehlung nicht bei jedem Neuzeichnen springt. Gibt es gar keine Stimme, gibt es
       auch keine Empfehlung – sonst empföhle die App den erstbesten Vorschlag. */
    let bester=null;
    if(!steht){
      ss.forEach(s=>{
        const vs=votesBySlot[s.id]||[];
        if(!vs.length||vs.some(v=>v.status==="nein"))return;
        const ja=vs.filter(v=>v.status==="ja").length;
        if(!ja)return;
        if(!bester||ja>bester.ja)bester={id:s.id,ja};
      });
    }
    const slotHtml=ss.map(s=>{
      const vs=votesBySlot[s.id]||[];
      const ja=vs.filter(v=>v.status==="ja").length, viel=vs.filter(v=>v.status==="vielleicht").length, nein=vs.filter(v=>v.status==="nein").length;
      const mine=(vs.find(v=>v.voter===myUid)||{}).status||null;
      /* „✓ 3" bei fünf Trainern heißt nicht, dass zwei abgesagt haben – vielleicht haben
         zwei nur nicht geantwortet. Für die Entscheidung ist das ein Unterschied. */
      const abgestimmt=new Set(vs.map(v=>v.voter));
      const offeneNamen=Object.keys(namen).filter(uid=>!abgestimmt.has(uid)).map(uid=>namen[uid]).sort();
      const fehltTxt=offeneNamen.length?` · <span style="color:var(--text2)">offen: ${esc(offeneNamen.join(", "))}</span>`:"";
      const d=new Date(s.datum+"T00:00:00");
      const dstr=d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
      const zstr=s.uhrzeit?" · "+String(s.uhrzeit).slice(0,5)+" Uhr":"";
      if(steht){
        const tage=Math.round((d-new Date(isoLokal()+"T00:00:00"))/864e5);
        const bald=tage<0?"war am":tage===0?"heute":tage===1?"morgen":"in "+tage+" Tagen";
        return `<div style="border:1.5px solid var(--green);background:var(--green-bg);border-radius:10px;padding:10px 12px;margin-top:6px">
          <div style="font-size:var(--s-text);font-weight:800;color:var(--green)">✅ Termin steht · ${esc(bald)}</div>
          <div style="font-size:var(--s-karte);font-weight:800;color:var(--text);margin-top:2px">${dstr}${zstr}</div>
          <div style="font-size:var(--s-klein);color:var(--text3);margin-top:3px">✓ ${ja} · ? ${viel} · ✗ ${nein} · <button onclick="tpollOeffnen(${p.id})" style="border:none;background:none;color:var(--blue-text);font-weight:700;cursor:pointer;font-size:var(--s-klein);padding:0">Termin doch ändern</button></div>
        </div>`;
      }
      const voteBtns=["ja","vielleicht","nein"].map(st=>{const on=mine===st;const emo=st==="ja"?"✓":st==="vielleicht"?"?":"✗";const col=st==="ja"?"var(--green)":st==="vielleicht"?"var(--amber)":"var(--red)";
        return `<button onclick="tpollVote(${s.id},'${st}')" aria-label="${st}" style="min-width:44px;min-height:44px;border-radius:8px;border:${on?"1.5px solid "+col:"var(--border-s)"};background:${on?col:"var(--surface)"};color:${on?"#fff":"var(--text2)"};cursor:pointer;font-weight:800">${emo}</button>`;}).join("");
      const empfohlen=bester&&bester.id===s.id;
      /* data-slot: der Vorschlag traegt seine Kennung selbst. Ohne sie muss jede Pruefung
         aus verschachtelten <div> erraten, welcher Kasten gemeint ist – und greift dann
         die Fusszeile statt des Kastens. */
      return `<div data-slot="${s.id}"${empfohlen?' data-empfohlen="1"':""} style="border:${empfohlen?"1.5px solid var(--green)":"var(--border-s)"};background:${empfohlen?"var(--green-bg)":"transparent"};border-radius:10px;padding:8px 10px;margin-top:6px">
        ${empfohlen?`<div style="font-size:var(--s-text);font-weight:800;color:var(--green);margin-bottom:2px">👍 Hier können alle – niemand hat abgesagt</div>`:""}
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:110px;font-size:var(--s-text);font-weight:700">${dstr}${zstr}</div>
          <div style="display:flex;gap:4px">${voteBtns}</div>
        </div>
        <div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">✓ ${ja} · ? ${viel} · ✗ ${nein}${fehltTxt} · <button onclick="tpollDecide(${p.id},${s.id})" style="border:none;background:none;color:var(--blue-text);font-weight:700;cursor:pointer;font-size:var(--s-klein);padding:0">diesen Termin festlegen</button></div>
      </div>`;
    }).join("");
    return `<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px"><div style="flex:1;font-weight:800;font-size:var(--s-karte)">🗓️ ${esc(p.titel)}</div>
        <button onclick="tpollDelete(${p.id},'${jsq(p.titel)}')" aria-label="Meeting löschen" style="border:none;background:none;color:var(--red);cursor:pointer;min-width:44px;min-height:44px"><i class="ti ti-trash"></i></button></div>
      ${steht?"":'<div style="font-size:var(--s-klein);color:var(--text3)">Stimmt ab: ✓ passt · ? vielleicht · ✗ nicht</div>'}
      ${slotHtml||'<div style="font-size:var(--s-klein);color:var(--text3)">Keine Termine.</div>'}
      ${tpollThemenHtml(p.id,themenByPoll[p.id]||[],steht)}
    </div>`;
  }).join("");
  /* Aus dem Termin heraus traegt der Kopf dessen Titel; ueber die Orga-Kachel bleibt es die
     Uebersicht ueber alle Meetings. */
  const kopfTitel=terminZeile?(terminZeile.titel||"Trainermeeting"):"Trainer-Meetings";
  /* v529: Solange das Team nicht entschieden hat, ist das Datum im Kopf ein VORSCHLAG und
     wird auch so genannt – sonst liest sich das Fenster wie „Termin steht, stimmt trotzdem
     ab", und genau das hat der PO zu Recht unlogisch gefunden. */
  const terminSteht=nurTermin&&polls.length&&polls.every(p=>p.status==="entschieden");
  const kopfSub=terminZeile
    ? (terminSteht?"":"Vorschlag 1: ")
      +new Date(String(terminZeile.datum)+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})
      +(terminZeile.uhrzeit?" · "+String(terminZeile.uhrzeit).slice(0,5)+" Uhr":"")
      +(terminSteht?" · nur fürs Trainerteam":" · Termin steht noch nicht")
    : "Nur Trainer · vorschlagen, abstimmen, festlegen";
  const leerSatz=nurTermin
    ? "Für diesen Termin läuft noch keine Abstimmung. Trag unten Vorschläge ein – oder sammelt schon mal Themen."
    : "Noch kein Meeting geplant.";
  c.innerHTML=`${mdlHead("tm-meet-modal","🗓️",esc(kopfTitel),esc(kopfSub),"#334155")}
    ${pollHtml||`<div style="font-size:var(--s-text);color:var(--text3);margin-bottom:10px">${esc(leerSatz)}</div>`}
    ${(nurTermin&&polls.length)
      /* v529: Im Termin gibt es die Abstimmung schon – ein Block „Neues Meeting" darunter war
         Unsinn und trug vier Felder ohne Beschriftung. Hier fehlt hoechstens ein weiterer
         Vorschlag. Erst wenn der Termin steht, ist auch das vorbei. */
      ? (polls.every(p=>p.status==="entschieden")?"":`<div style="border-top:var(--border);padding-top:12px">
      <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:6px">Weiteren Vorschlag hinzufügen</div>
      <div class="mgrid" style="grid-template-columns:1fr 1fr;gap:8px;align-items:end;margin-bottom:0">
        <label style="font-size:var(--s-klein);color:var(--text2)">Datum<input type="date" id="tpoll-neu-d" style="width:100%;margin-top:3px;${FLD}"></label>
        <label style="font-size:var(--s-klein);color:var(--text2)">Uhrzeit<input type="time" id="tpoll-neu-t" style="width:100%;margin-top:3px;${FLD}"></label>
      </div>
      <button class="btn" onclick="tpollSlotHinzufuegen(${Number(polls[0].id)})" style="width:100%;min-height:48px;margin-top:8px;justify-content:center"><i class="ti ti-plus"></i>Vorschlag hinzufügen</button>
    </div>`)
      : `<div style="border-top:var(--border);padding-top:12px">
      <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:6px">Neues Meeting</div>
      <label style="font-size:var(--s-klein);color:var(--text2)">Titel<input id="tpoll-titel" value="${terminZeile?esc(terminZeile.titel||""):""}" placeholder="z. B. Saisonplanung" style="width:100%;margin:3px 0 8px;${FLD}"></label>
      ${[0,1,2,3].map(i=>`<div class="mgrid" style="grid-template-columns:1fr 1fr;gap:8px;align-items:end;margin-bottom:6px">
        <label style="font-size:var(--s-klein);color:var(--text2)">Vorschlag ${i+1} · Datum<input type="date" id="tpoll-d${i}" style="width:100%;margin-top:3px;${FLD}"></label>
        <label style="font-size:var(--s-klein);color:var(--text2)">Uhrzeit<input type="time" id="tpoll-t${i}" style="width:100%;margin-top:3px;${FLD}"></label>
      </div>`).join("")}
      <button class="btn btn-p" onclick="tpollCreate(this)" style="width:100%;min-height:56px;margin-top:4px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-plus"></i>Meeting anlegen</button>
    </div>`}
    <button class="btn" onclick="document.getElementById('tm-meet-modal').remove();_TPOLL_TERMIN=null;" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Schließen</button>`;
}
/* Themen zum festgelegten Meeting: die Tagesordnung. Wer zwischendurch etwas einfällt,
   schreibt es hier hin, statt es bis zum Abend zu behalten. Erledigtes bleibt stehen und
   wird durchgestrichen – so sieht man am Ende, was wirklich besprochen wurde. */
function tpollThemenHtml(pollId,liste,steht){
  const offen=liste.filter(t=>!t.erledigt).length;
  const zeilen=liste.map(t=>`<div style="padding:2px 0"><div style="display:flex;align-items:center;gap:6px">
      <button onclick="tpollThemaToggle(${t.id},${t.erledigt?"false":"true"})" aria-label="${t.erledigt?"wieder öffnen":"abhaken"}" style="border:none;background:transparent;font-size:var(--s-karte);cursor:pointer;min-width:44px;min-height:44px;margin:-8px 0;flex:none">${t.erledigt?"✅":"⬜"}</button>
      <div style="flex:1;min-width:0;font-size:var(--s-text);line-height:1.4;${t.erledigt?"text-decoration:line-through;color:var(--text3)":"color:var(--text)"}">${esc(t.text)}</div>
      <button onclick="tpollThemaDelete(${t.id})" aria-label="Thema löschen" style="border:none;background:transparent;color:var(--text2);cursor:pointer;min-width:44px;min-height:44px;margin:-8px 0;flex:none"><i class="ti ti-x"></i></button>
    </div>
    ${t.erledigt?(String(t.beschluss||"").trim()
      ? `<div style="font-size:var(--s-text);color:var(--text2);line-height:1.45;margin:2px 0 4px 26px;border-left:2px solid var(--green);padding-left:8px">${esc(t.beschluss)}</div>`
      : `<div style="margin:2px 0 4px 26px"><button class="btn btn-sm" onclick="tpollBeschlussFragen(${t.id},'${jsq(t.text)}')" style="min-height:36px;font-size:var(--s-klein)"><i class="ti ti-writing"></i>Was wurde entschieden?</button></div>`):""}
    </div>`).join("");
  return `<div style="border-top:var(--border);margin-top:10px;padding-top:10px">
    ${!steht?`<div style="font-size:var(--s-klein);color:var(--text3);margin-bottom:4px">Sammeln geht schon jetzt – der Termin muss dafür nicht stehen.</div>`:""}
    ${liste.some(t=>t.erledigt)?`<div style="display:flex;justify-content:flex-end;margin-bottom:4px"><button class="btn btn-sm" onclick="tpollProtokoll(${pollId})" style="min-height:36px;font-size:var(--s-klein)"><i class="ti ti-file-text"></i>Protokoll teilen</button></div>`:""}
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:4px">📝 Themen fürs Meeting${liste.length?` · ${offen} offen von ${liste.length}`:""}</div>
    ${zeilen||'<div style="font-size:var(--s-klein);color:var(--text3);padding:2px 0 6px">Noch kein Thema. Was soll besprochen werden?</div>'}
    <div style="display:flex;gap:6px;margin-top:6px">
      <input id="tpoll-thema-${pollId}" placeholder="z. B. Trikots nachbestellen" onkeydown="if(event.key==='Enter')tpollThemaAdd(${pollId})" style="flex:1;min-height:44px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box">
      <button class="btn btn-sm" onclick="tpollThemaAdd(${pollId})" aria-label="Thema hinzufügen"><i class="ti ti-plus"></i>Thema</button>
    </div>
  </div>`;
}
async function tpollThemaAdd(pollId){
  const el=document.getElementById("tpoll-thema-"+pollId);
  const text=(el?.value||"").trim();
  if(!text){toast("Bitte ein Thema eintippen","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({poll_id:pollId,text})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  if(el)el.value="";
  tpollRender();
}
/* v527 – der Beschluss. Ein Haken sagt „erledigt", nicht WAS entschieden wurde; eine Woche
   später weiß das niemand mehr. Gefragt wird beim Abhaken, aber das Abhaken wartet nicht
   darauf: wer gerade keine Zeit hat, hakt ab und schreibt später – der Knopf „Was wurde
   entschieden?" bleibt am Thema stehen. Pflicht wäre hier falsch, weil sie dazu führte,
   dass gar nicht mehr abgehakt wird. */
async function tpollBeschlussFragen(id,thema){
  const text=await frageText({emoji:"📝",titel:"Was wurde entschieden?",
    sub:thema||"",platzhalter:"Ein Satz genügt – z. B. „Trikots bestellt Kenneth bis Freitag“",
    ja:"Festhalten"});
  if(text===null)return;                       // abgebrochen – Haken bleibt, wie er ist
  await tpollBeschlussSetzen(id,text.trim());
}
async function tpollBeschlussSetzen(id,beschluss){
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?id=eq.${id}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({beschluss:beschluss||null})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  tpollRender();
}
/* Ein Textfeld im App-Look statt prompt(). prompt() reißt den Bildschirm aus der App, kennt
   den dunklen Modus nicht und heißt auf manchen Geräten „Diese Seite sagt:". Liefert den
   Text oder null bei Abbruch. */
function frageText(o){
  return new Promise(res=>{
    document.getElementById("frage-text-modal")?.remove();
    const m=document.createElement("div"); m.id="frage-text-modal";
    m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label",o.titel||"Eingabe");
    m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10080;display:flex;align-items:center;justify-content:center;padding:18px";
    const fertig=v=>{m.remove();res(v);};
    m.onclick=e=>{if(e.target===m)fertig(null);};
    m.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:400px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
      <div style="font-size:var(--s-karte);font-weight:800">${o.emoji||""} ${esc(o.titel||"")}</div>
      ${o.sub?`<div style="font-size:var(--s-text);color:var(--text2);margin-top:4px;line-height:1.45">${esc(o.sub)}</div>`:""}
      <textarea id="frage-text-feld" rows="3" maxlength="300" placeholder="${esc(o.platzhalter||"")}" style="width:100%;box-sizing:border-box;min-height:48px;margin-top:10px;padding:10px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);resize:vertical"></textarea>
      <button class="btn btn-p" id="frage-text-ok" style="width:100%;min-height:56px;margin-top:10px;justify-content:center;font-size:var(--s-karte);font-weight:800">${esc(o.ja||"Übernehmen")}</button>
      <button class="btn" id="frage-text-ab" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>
    </div>`;
    document.body.appendChild(m);
    const feld=m.querySelector("#frage-text-feld");
    if(feld&&o.wert)feld.value=String(o.wert);   // v609: z. B. ein Link zum Kopieren
    m.querySelector("#frage-text-ok").onclick=()=>fertig(feld?feld.value:"");
    m.querySelector("#frage-text-ab").onclick=()=>fertig(null);
    if(feld)feld.focus();
  });
}
async function tpollThemaToggle(id,erledigt){
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?id=eq.${id}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({erledigt})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht ändern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
  await tpollRender();
  /* Nur beim Abhaken fragen, nicht beim Wiederöffnen – und erst NACH dem Neuzeichnen,
     damit der Haken schon steht, während man den Satz tippt. */
  if(erledigt)tpollBeschlussFragen(id,"");
}
async function tpollThemaDelete(id){
  if(!await frageJaNein({emoji:"📝",titel:"Thema löschen?",text:"Es verschwindet für alle Trainer aus der Liste.",ja:"Löschen",ton:"rot"}))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  tpollRender();
}
/* Zurück zur Abstimmung – ohne die Themen anzurühren, die gehören zum Meeting, nicht zum Termin. */
async function tpollOeffnen(pollId){
  if(!await frageJaNein({emoji:"🗓️",titel:"Termin doch ändern?",
    text:"Die Abstimmung wird wieder geöffnet und alle Vorschläge erscheinen erneut.\n\nDie gesammelten Themen bleiben erhalten.",
    ja:"Wieder öffnen",nein:"Abbrechen"}))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?id=eq.${pollId}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({status:"offen",decided_slot_id:null})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht öffnen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Abstimmung wieder offen");
  tpollRender();
}
async function tpollCreate(btn){
  const titel=(document.getElementById("tpoll-titel")?.value||"").trim();
  if(!titel){toast("Bitte einen Titel","err");return;}
  const slots=[0,1,2,3].map(i=>({datum:document.getElementById("tpoll-d"+i)?.value,uhrzeit:document.getElementById("tpoll-t"+i)?.value||null})).filter(s=>s.datum);
  if(!slots.length){toast("Mindestens einen Terminvorschlag","err");return;}
  if(btn)btn.disabled=true;
  try{
    /* v527: Die Abstimmung gehört ab jetzt zu einem Termin. Aus dem Termin heraus angelegt,
       trägt sie dessen id; über die Orga-Kachel angelegt bleibt sie ungebunden wie bisher,
       damit der alte Weg nicht bricht. */
    const anTermin=_TPOLL_TERMIN?{termin_id:Number(_TPOLL_TERMIN)}:{};
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify({titel,...anTermin})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht anlegen"),"err");return;}
    const poll=(await r.json())[0];
    await tpollOffeneUebernehmen(poll.id);
    await fetch(`${SB_URL}/rest/v1/trainer_poll_slot`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(slots.map(s=>({poll_id:poll.id,datum:s.datum,uhrzeit:s.uhrzeit})))});
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Meeting angelegt ✓");
  tpollRender();
}
/* v527 – was offen blieb, wandert mit. Sonst tippt jemand dieselben drei Punkte beim
   nächsten Mal neu ab, oder sie fallen still unter den Tisch. Übernommen werden nur Themen
   aus dem zuletzt ENTSCHIEDENEN Meeting: alles andere ist noch in Arbeit und stünde dann
   doppelt da. */
async function tpollOffeneUebernehmen(neuePollId){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?select=id,created_at&status=eq.entschieden&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    const vor=((await r.json())||[])[0]; if(!vor)return;
    const t=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?poll_id=eq.${vor.id}&erledigt=is.false&select=text&order=created_at.asc`,{headers:sbAuthHeaders()});
    if(!t.ok)return;
    const offen=((await t.json())||[]).map(x=>String(x.text||"").trim()).filter(Boolean);
    if(!offen.length)return;
    await fetch(`${SB_URL}/rest/v1/trainer_poll_thema`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},
      body:JSON.stringify(offen.map(text=>({poll_id:neuePollId,text})))});
    toast(offen.length+(offen.length===1?" offenes Thema übernommen":" offene Themen übernommen"));
  }catch(e){}
}
/* Das Protokoll als Markdown – derselbe Weg wie beim Tagebuch: Teilen-Menü des Geräts oder
   Download, kein Serveraufruf und keine Zugangsdaten in der App. */
async function tpollProtokoll(pollId){
  let poll=null,themen=[],slot=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?id=eq.${pollId}&select=*&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)poll=((await r.json())||[])[0]||null;
  }catch(e){}
  if(!poll){toast("Meeting nicht gefunden","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?poll_id=eq.${pollId}&select=*&order=erledigt.asc,created_at.asc`,{headers:sbAuthHeaders()});
    if(r.ok)themen=(await r.json())||[];
  }catch(e){}
  if(poll.decided_slot_id){
    try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_slot?id=eq.${poll.decided_slot_id}&select=datum,uhrzeit&limit=1`,{headers:sbAuthHeaders()});
      if(r.ok)slot=((await r.json())||[])[0]||null;}catch(e){}
  }
  const dstr=slot?new Date(slot.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})
                 +(slot.uhrzeit?", "+String(slot.uhrzeit).slice(0,5)+" Uhr":""):"ohne festen Termin";
  const z=[`## Trainermeeting — ${poll.titel||""}`,`_${dstr}_`,""];
  const erledigt=themen.filter(t=>t.erledigt), offen=themen.filter(t=>!t.erledigt);
  if(erledigt.length){
    z.push("### Besprochen","");
    erledigt.forEach(t=>{
      z.push(`- **${String(t.text||"").replace(/\n/g," ")}**`);
      z.push(`  - ${String(t.beschluss||"").trim()||"kein Beschluss festgehalten"}`);
    });
    z.push("");
  }
  if(offen.length){
    z.push("### Offen geblieben","");
    offen.forEach(t=>z.push(`- ${String(t.text||"").replace(/\n/g," ")}`));
    z.push("");
  }
  const text=z.join("\n").trim();
  if(navigator.share){ navigator.share({title:"Trainermeeting",text}).catch(()=>{}); return; }
  try{ await navigator.clipboard.writeText(text); toast("Protokoll kopiert ✓"); }
  catch(e){
    try{
      const url=URL.createObjectURL(new Blob([text],{type:"text/markdown;charset=utf-8"}));
      const a=document.createElement("a"); a.href=url; a.download="trainermeeting.md"; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    }catch(e2){ toast("Teilen ging nicht","err"); }
  }
}
/* v529: Ein weiterer Vorschlag zu einer laufenden Abstimmung – aus dem Termin heraus. */
async function tpollSlotHinzufuegen(pollId){
  const datum=document.getElementById("tpoll-neu-d")?.value||"";
  const uhrzeit=document.getElementById("tpoll-neu-t")?.value||null;
  if(!datum){toast("Bitte ein Datum für den Vorschlag wählen","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_slot`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},
      body:JSON.stringify([{poll_id:Number(pollId),datum,uhrzeit}])});
    if(sbCheck401(r))return;
    if(!r.ok&&r.status!==201){toast(sbDeniedMsg(r,"Konnte den Vorschlag nicht eintragen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Vorschlag eingetragen ✓");
  tpollRender();
}
async function tpollVote(slotId,status){
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_vote?on_conflict=slot_id,voter`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({slot_id:slotId,status})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht abstimmen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  tpollRender();
}
async function tpollDecide(pollId,slotId){
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?id=eq.${pollId}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({status:"entschieden",decided_slot_id:slotId})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht festlegen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  /* v528: Der Termin wandert mit. Vorher zeigte der Kalender weiter den Tag, an dem der
     Termin angelegt wurde, während das Meeting an einem anderen stattfand – zwei Wahrheiten
     für dieselbe Sache, und die im Kalender ist die, die alle sehen. */
  await tpollTerminNachziehen(pollId,slotId);
  toast("Termin festgelegt ✓");
  tpollRender();
}
/* Schiebt den gebundenen Termin auf den entschiedenen Vorschlag. Ohne Bindung (Abstimmung
   über die alte Orga-Kachel angelegt) gibt es nichts nachzuziehen. */
async function tpollTerminNachziehen(pollId,slotId){
  try{
    const p=await fetch(`${SB_URL}/rest/v1/trainer_poll?id=eq.${pollId}&select=termin_id&limit=1`,{headers:sbAuthHeaders()});
    if(!p.ok)return;
    const tid=(((await p.json())||[])[0]||{}).termin_id;
    if(!tid)return;
    const sl=await fetch(`${SB_URL}/rest/v1/trainer_poll_slot?id=eq.${slotId}&select=datum,uhrzeit&limit=1`,{headers:sbAuthHeaders()});
    if(!sl.ok)return;
    const slot=((await sl.json())||[])[0]; if(!slot||!slot.datum)return;
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${Number(tid)}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},
      body:JSON.stringify({datum:slot.datum,uhrzeit:slot.uhrzeit||null})});
    if(!r.ok&&r.status!==204)return;
    /* Die geladene Terminliste mitziehen, sonst zeigt das Termin-Fenster daneben noch den
       alten Tag, bis jemand neu lädt. */
    try{ if(typeof TM_TERMINE!=="undefined"&&Array.isArray(TM_TERMINE)){
      const t=TM_TERMINE.find(x=>Number(x.id)===Number(tid));
      if(t){t.datum=slot.datum;t.uhrzeit=slot.uhrzeit||null;}
    } }catch(e){}
    if(typeof tmLoad==="function")tmLoad();
  }catch(e){}
}
async function tpollDelete(id,titel){
  if(!confirm(`Meeting „${titel||""}" wirklich löschen?`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  tpollRender();
}

/* Elterngespräch-Doodle (Trainer-Seite): einer Familie Termine vorschlagen, die
   Rückmeldung der Eltern sehen, festlegen. Eltern antworten in ihrem Bereich. */
async function epollTrainerOpen(prefillSpieler){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("ep-poll-modal")?.remove();
  const m=document.createElement("div");m.id="ep-poll-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const c=document.createElement("div");c.id="ep-poll-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3)">Lade …</div>';
  m.appendChild(c);document.body.appendChild(m);
  epollTrainerRender(prefillSpieler);
}
async function epollTrainerRender(prefillSpieler){
  const c=document.getElementById("ep-poll-card"); if(!c)return;
  const FLD="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box";
  let polls=[],slots=[],votes=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll?select=*,kader(name)&order=created_at.desc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)polls=await r.json();}catch(e){}
  const pids=polls.map(p=>p.id);
  if(pids.length){
    try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll_slot?poll_id=in.(${pids.join(",")})&select=*&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});if(r.ok)slots=await r.json();}catch(e){}
    const sids=slots.map(s=>s.id);
    if(sids.length){try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll_vote?slot_id=in.(${sids.join(",")})&select=slot_id,status`,{headers:sbAuthHeaders()});if(r.ok)votes=await r.json();}catch(e){}}
  }
  const byPoll={}; slots.forEach(s=>{(byPoll[s.poll_id]=byPoll[s.poll_id]||[]).push(s);});
  const bySlot={}; votes.forEach(v=>{(bySlot[v.slot_id]=bySlot[v.slot_id]||[]).push(v);});
  const pollHtml=polls.map(p=>{
    const ss=byPoll[p.id]||[];
    const slotHtml=ss.map(s=>{
      const vs=bySlot[s.id]||[];
      const ja=vs.filter(v=>v.status==="ja").length, viel=vs.filter(v=>v.status==="vielleicht").length, nein=vs.filter(v=>v.status==="nein").length;
      const dstr=new Date(s.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
      const zstr=s.uhrzeit?" · "+String(s.uhrzeit).slice(0,5):"";
      const decided=p.decided_slot_id===s.id;
      const antwort=vs.length?`👍 ${ja} · 🤔 ${viel} · 👎 ${nein}`:'<span style="color:var(--text3)">noch keine Antwort</span>';
      return `<div style="border:var(--border-s);${decided?"border-color:var(--green);background:#f0fdf4;color:#14532d;":""}border-radius:10px;padding:8px 10px;margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="flex:1;min-width:110px;font-size:var(--s-text);font-weight:700">${dstr}${zstr}${decided?' <span style="color:var(--green)">✅</span>':""}</div>
        <div style="font-size:var(--s-klein);color:var(--text2)">${antwort}</div>
        ${p.status!=="entschieden"?`<button onclick="epollDecide(${p.id},${s.id})" class="btn btn-sm">festlegen</button>`:""}
      </div>`;
    }).join("");
    return `<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px"><div style="flex:1;font-weight:800;font-size:var(--s-karte)">🗓️ ${esc((p.kader&&p.kader.name)||"Familie")}${p.titel&&p.titel!=="Elterngespräch"?" · "+esc(p.titel):""}</div>
        <button onclick="epollDelete(${p.id})" aria-label="löschen" style="border:none;background:none;color:var(--red);cursor:pointer;min-width:32px;min-height:32px"><i class="ti ti-trash"></i></button></div>
      ${p.status==="entschieden"?'<div style="font-size:var(--s-klein);color:var(--green);font-weight:700">Termin steht ✓</div>':'<div style="font-size:var(--s-klein);color:var(--text3)">Warte auf die Rückmeldung der Eltern.</div>'}
      ${slotHtml||'<div style="font-size:var(--s-klein);color:var(--text3)">Keine Termine.</div>'}
    </div>`;
  }).join("");
  const kinder=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const kidOpts=kinder.map(k=>`<option value="${k._id!=null?k._id:k.id}"${(prefillSpieler&&(k._id===prefillSpieler||k.id===prefillSpieler))?" selected":""}>${esc(k.name)}</option>`).join("");
  c.innerHTML=`${mdlHead("ep-poll-modal","🗣️","Elterngespräch-Termine","Einer Familie Termine vorschlagen · Eltern antworten, du legst fest","#475569")}
    ${pollHtml||'<div style="font-size:var(--s-text);color:var(--text3);margin-bottom:10px">Noch keine Terminfindung.</div>'}
    <div style="border-top:var(--border);padding-top:12px">
      <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:6px">Neuer Terminvorschlag</div>
      <label style="font-size:var(--s-klein);color:var(--text3)">Familie / Kind<select id="epoll-kid" style="width:100%;margin-bottom:6px;${FLD}">${kidOpts}</select></label>
      <input id="epoll-titel" placeholder="Thema (optional, z. B. Entwicklung)" style="width:100%;margin-bottom:6px;${FLD}">
      <div style="font-size:var(--s-klein);color:var(--text3);margin-bottom:4px">Terminvorschläge (Datum + Uhrzeit):</div>
      ${[0,1,2,3].map(i=>`<div style="display:flex;gap:6px;margin-bottom:4px"><input type="date" id="epoll-d${i}" style="flex:2;${FLD}"><input type="time" id="epoll-t${i}" style="flex:1;${FLD}"></div>`).join("")}
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-p btn-sm" onclick="epollCreate(this)"><i class="ti ti-plus"></i>Vorschlagen</button>
        <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('ep-poll-modal').remove()">Schließen</button>
      </div>
    </div>`;
}
async function epollCreate(btn){
  const kidSel=document.getElementById("epoll-kid");
  const spielerId=kidSel?Number(kidSel.value):null;
  if(!spielerId){toast("Bitte ein Kind wählen","err");return;}
  const titel=(document.getElementById("epoll-titel")?.value||"").trim()||"Elterngespräch";
  const slots=[0,1,2,3].map(i=>({datum:document.getElementById("epoll-d"+i)?.value,uhrzeit:document.getElementById("epoll-t"+i)?.value||null})).filter(s=>s.datum);
  if(!slots.length){toast("Mindestens einen Terminvorschlag","err");return;}
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/eltern_poll`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify({spieler_id:spielerId,titel})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht anlegen"),"err");return;}
    const poll=(await r.json())[0];
    await fetch(`${SB_URL}/rest/v1/eltern_poll_slot`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(slots.map(s=>({poll_id:poll.id,datum:s.datum,uhrzeit:s.uhrzeit})))});
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Termine vorgeschlagen ✓ – die Eltern bekommen sie im Eltern-Bereich.");
  epollTrainerRender();
}
async function epollDecide(pollId,slotId){
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll?id=eq.${pollId}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({status:"entschieden",decided_slot_id:slotId})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht festlegen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Termin festgelegt ✓");
  epollTrainerRender();
}
async function epollDelete(id){
  if(!confirm("Diese Terminfindung löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  epollTrainerRender();
}
async function homeRadarLoad(){
  const box=document.getElementById("home-radar"); if(!box)return;
  const active=KADER.filter(k=>k.aktiv!==false); if(active.length<3){box.innerHTML="";return;}
  let ez=[], ma=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/einsatzzeiten?select=spieler,feld_sek`,{headers:sbAuthHeaders()});if(sbCheck401&&sbCheck401(r))return;if(r.ok)ez=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?select=spieler`,{headers:sbAuthHeaders()});if(r.ok)ma=await r.json();}catch(e){}
  // Spielzeit/Aktionen-Signal – nur wenn genug Matchdaten
  let top=[];
  if((ez.length+ma.length)>=4){
    const min={}, act={};
    ez.forEach(x=>{if(x.spieler)min[x.spieler]=(min[x.spieler]||0)+(x.feld_sek||0);});
    ma.forEach(x=>{if(x.spieler)act[x.spieler]=(act[x.spieler]||0)+1;});
    const maxMin=Math.max(1,...active.map(k=>min[k.name]||0));
    const scored=active.map(k=>{const m=min[k.name]||0,a=act[k.name]||0; const score=(1-m/maxMin)*2+(a===0?1.5:0); return {name:k.name,nr:k.nr,min:Math.round(m/60),act:a,score};});
    scored.sort((x,y)=>y.score-x.score);
    top=scored.slice(0,3).filter(s=>s.score>0.5);
  }
  // Anwesenheits-Muster: aufeinanderfolgende jüngste Fehltage (aus lokalem AW_DATA)
  const absent=[];
  try{
    if(typeof AW_DATA==="object"&&AW_DATA){
      const dates=Object.keys(AW_DATA).sort().reverse();
      active.forEach(k=>{ let streak=0; for(const d of dates){ const e=AW_DATA[d]&&AW_DATA[d][k.name]; if(!e)continue; if(e.da===false)streak++; else break; } if(streak>=2)absent.push({name:k.name,nr:k.nr,streak}); });
      absent.sort((a,b)=>b.streak-a.streak);
    }
  }catch(e){}
  if(!top.length&&!absent.length){box.innerHTML="";return;}
  const line=(nr,name,right,col)=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--surface2)">
    <span style="flex:1;font-weight:600">${nr!=null?esc(nr)+" ":""}${esc(name)}</span>
    <span style="font-size:var(--s-klein);color:${col||'var(--text2)'};font-weight:${col?700:400}">${right}</span></div>`;
  const playHtml=top.length?`<div style="font-weight:700;margin-bottom:2px">🎯 Kein Kind übersehen</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:8px">Zuletzt am wenigsten Spielzeit &amp; Aktionen – gib ihnen bewusst mehr Bühne.</div>
    ${top.map(s=>line(s.nr,s.name,`${s.min} Min · ${s.act} Aktionen`)).join("")}`:"";
  const absHtml=absent.length?`<div style="font-weight:700;margin:${top.length?"14px":"0"} 0 6px">📅 Zuletzt öfter gefehlt</div>
    ${absent.slice(0,3).map(a=>line(a.nr,a.name,`${a.streak}× nicht da`,"var(--red)")).join("")}`:"";
  box.innerHTML=`<div class="card" style="padding:14px;margin-bottom:10px;border-left:3px solid var(--red)">${playHtml}${absHtml}</div>`;
}
function onboardingDismiss(){ try{localStorage.setItem("adler_onboarded","1");}catch(e){} document.getElementById("onboard-card")?.remove(); }
// Schnelle Einheit-Bewertung: 3 Stern-Kategorien (Spaß/Umsetzung/Erfolg) + Notiz, pro Datum.
let EINHEIT_CACHE=[];
function einheitStarsHtml(key,val,max,size){
  return [...Array(max).keys()].map(n=>n+1).map(i=>`<span role="button" tabindex="0" aria-label="${i} von ${max} Sternen" onclick="einheitSetStar('${key}',${i},${max},${size})" style="cursor:pointer;font-size:${size}px;line-height:1;color:${i<=val?'#f59e0b':'#cbd5e1'}">${i<=val?'★':'☆'}</span>`).join("");
}
function einheitStarRow(key,label,val,max,size){
  val=val||0; max=max||5; size=size||24;
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0">
    <span style="font-size:var(--s-text);font-weight:600;color:var(--text);min-width:0">${label}</span>
    <span id="eb-stars-${key}" data-val="${val}" style="white-space:nowrap">${einheitStarsHtml(key,val,max,size)}</span></div>`;
}
function einheitSetStar(key,val,max,size){
  const box=document.getElementById("eb-stars-"+key); if(!box)return;
  const nv=(parseInt(box.dataset.val)||0)===val?0:val; // gleicher Stern nochmal = zurücksetzen
  box.dataset.val=nv;
  const hatteFokus=box.contains(document.activeElement);   // v613: mit der Tastatur bleibt der Fokus auf dem Stern
  box.innerHTML=einheitStarsHtml(key,nv,max||5,size||24);
  if(hatteFokus&&box.children[val-1])box.children[val-1].focus();
}
function einheitGetStar(key){ const el=document.getElementById("eb-stars-"+key); const v=el?parseInt(el.dataset.val):0; return v>0?v:0; }
function einheitRowsHtml(v){ v=v||{}; return einheitStarRow("spass","😄 Spaß",v.spass)+einheitStarRow("umsetzung","🎯 Umsetzung",v.umsetzung)+einheitStarRow("erfolg","🏆 Erfolg",v.erfolg); }
/* "Einheit bewerten" ist der EINE Ort nach dem Training:
   Schritt 1 – Liste der letzten stattgefundenen Trainings.
   Schritt 2 – Einheit (3 Sterne) + jede geplante Übung (bewerten/überspringen) + kurze
               Spieler-Bewertung der anwesenden Kinder.
   Geschrieben wird in die BESTEHENDEN Speicher: einheit_bewertung (Tabelle),
   EVAL_DATA/trainings_eval (Übungen), AW_DATA/anwesenheit (Spieler-Sterne).
   Keine Datenmigration, alle Auswertungen bleiben gültig. */
const EB_DIMS=[{key:"Durchführung",label:"Durchführung"},{key:"Spaßfaktor Kinder",label:"Spaßfaktor Kinder"},{key:"Anforderung umgesetzt",label:"Anforderung umgesetzt"}];
let EB_EVENT_BEW=[];   // v634: Nachbereitungen von Spiel und Festival für die gemeinsame Liste
let EB_TERMINE=[], EB_DATUM=null, EB_PLAN=[], EB_SPIELER=[], EB_ME="", EB_ALT_OHNE_VON=new Set();

/* v483: aus dem Trainingsplan direkt in die Nachbereitung dieses Tages. */
async function einheitNachbereiten(datum){
  await einheitBewertenOpen();
  if(datum&&document.getElementById("eb-card"))einheitDetailOpen(datum);
}
async function einheitBewertenOpen(datum){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("eb-modal")?.remove();
  const heute=isoLokal();
  try{const r=await fetch(`${SB_URL}/rest/v1/einheit_bewertung?select=*&order=datum.desc&limit=80`,{headers:sbAuthHeaders()});if(r.ok)EINHEIT_CACHE=await r.json();}catch(e){}
  /* v630: Jeder Trainer bewertet selbst (PK datum+autor) – wer bin ich? */
  try{EB_ME=((typeof trainerMe==="function")?await trainerMe():"")||"";}catch(e){EB_ME="";}
  /* v634 PO: „Vielleicht sollten wir dieses Thema irgendwie vereinheitlichen.“ – Kachel „Ja, so bauen“.
     Ein Einstieg für Training, Spiel und Festival: dieselbe Liste, derselbe Stempel. Training
     öffnet den Trainingsbogen, Spiel und Festival die Nachbereitung aus md-fazit.js. */
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(training,spiel,turnier)&datum=lte.${heute}&select=id,typ,titel,gegner,datum,platz,uhrzeit,uhrzeit_ende&order=datum.desc&limit=14`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)EB_TERMINE=((await r.json())||[]).filter(t=>(t.typ||"training")==="training"||typeof terminVorbei!=="function"||terminVorbei(t));}catch(e){}
  EB_EVENT_BEW=[];
  const evIds=EB_TERMINE.filter(t=>t.typ&&t.typ!=="training").map(t=>Number(t.id)).filter(Boolean);
  if(evIds.length){ try{const r=await fetch(`${SB_URL}/rest/v1/event_bewertung?termin_id=in.(${evIds.join(",")})&select=termin_id,autor,updated_at`,{headers:sbAuthHeaders()});if(r.ok)EB_EVENT_BEW=await r.json();}catch(e){} }
  const modal=document.createElement("div");
  modal.id="eb-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Einheit bewerten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="eb-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c);document.body.appendChild(modal);
  einheitListRender();
  if(datum&&typeof einheitDetailOpen==="function")einheitDetailOpen(datum);   // v633: das To-do öffnet genau seine Einheit
}

/* v634: Spiel und Festival in derselben Liste. Status und Stempel aus event_bewertung (je Trainer
   seit v525); ein Tipp schließt die Liste und öffnet die Nachbereitung (Welle 2, geprüft). */
function einheitListEventZeile(t,wtag){
  const alle=EB_EVENT_BEW.filter(x=>Number(x.termin_id)===Number(t.id));
  const bew=alle.find(x=>x.autor===EB_ME);
  const von=[...new Set(alle.map(x=>x.autor).filter(Boolean))];
  const dt=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
  const art=t.typ==="turnier"?"🏆 Festival":"⚽ Spiel";
  const name=t.titel||t.gegner||"";
  return `<div role="button" tabindex="0" onclick="einheitEventOeffnen(${Number(t.id)})" style="display:flex;align-items:center;gap:10px;padding:11px 10px;border:var(--border-s);border-radius:10px;margin-bottom:6px;cursor:pointer;background:var(--surface2)">
      <div style="font-size:var(--s-teil)">${bew?"✅":"⭐"}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-text);font-weight:700;color:var(--text)">${art} · ${wtag(t.datum)} ${dt}</div>
        <div style="font-size:var(--s-klein);color:var(--text3)">${name?esc(name)+" · ":""}${bew?"von dir nachbereitet":"von dir noch offen"}${von.length?`<br>✍️ nachbereitet von ${esc(von.join(", "))}`:""}</div>
      </div>
      <div style="font-size:var(--s-teil);color:var(--text3)">›</div>
    </div>`;
}
function einheitEventOeffnen(id){
  if(typeof fazitOpen!=="function"){ toast("Lädt noch – gleich nochmal","err"); return; }
  document.getElementById("eb-modal")?.remove();
  fazitOpen(id);
}
function einheitListRender(){
  const c=document.getElementById("eb-card"); if(!c)return;
  EB_DATUM=null;
  c.classList.remove("nb-weg-an"); if(typeof _nbWeg!=="undefined")_nbWeg=null;   // v627: der geführte Ablauf gehört zu einer Einheit, nicht zur Liste
  const wtag=d=>["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(d+"T00:00:00").getDay()];
  const rows=EB_TERMINE.map(t=>{
    if(t.typ&&t.typ!=="training")return einheitListEventZeile(t,wtag);
    const alleB=EINHEIT_CACHE.filter(x=>x.datum===t.datum);
    const bew=alleB.find(x=>x.autor===EB_ME);
    const von=[...new Set(alleB.map(x=>x.autor==="Trainerteam"?"Trainerteam":x.autor).filter(Boolean))];
    const dt=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
    return `<div role="button" tabindex="0" onclick="einheitDetailOpen('${t.datum}')" style="display:flex;align-items:center;gap:10px;padding:11px 10px;border:var(--border-s);border-radius:10px;margin-bottom:6px;cursor:pointer;background:var(--surface2)">
      <div style="font-size:var(--s-teil)">${bew?"✅":"⭐"}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-text);font-weight:700;color:var(--text)">🏃 Training · ${wtag(t.datum)} ${dt}</div>
        <div style="font-size:var(--s-klein);color:var(--text3)">${t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":""}${t.platz?" · 🏟️ "+esc(t.platz):""}${bew?" · von dir bewertet":" · von dir noch offen"}${von.length?`<br>✍️ bewertet von ${esc(von.join(", "))}`:""}</div>
      </div>
      <div style="font-size:var(--s-teil);color:var(--text3)">›</div>
    </div>`;
  }).join("");
  c.innerHTML=`${mdlHead("eb-modal","📝","Nachbereiten","Training, Spiel oder Festival – erzählen, die KI ordnet, daraus wird ein Tagebucheintrag","#2563eb")}
    ${EB_TERMINE.length?rows:'<div style="font-size:var(--s-text);color:var(--text3);padding:10px 0">Es ist noch kein Termin vergangen. Lege Termine unter „Termine“ an.</div>'}
    <div style="display:flex;margin-top:10px"><button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('eb-modal').remove()">Schließen</button></div>`;
}

/* v575 – EINE KARTE JE ÜBUNG, NICHT JE DURCHGANG

   PO am 18.09., mit Bildschirmfoto der Nachbereitung: „Eine Übung wird 2× aufgeführt.
   Wahrscheinlich 1× als Hauptteil bzw. Übersicht über alle Einheiten. Macht aber im Tagebuch
   wenig Sinn." Keine der Karten war eine Übersicht: Die Nachbereitung listete jeden
   PLAN-EINTRAG, und eine Einheit wie L4-8 setzt dieselben drei Übungen in allen drei
   Hauptteilen ein – also dreimal dieselbe Karte, je einmal pro Block.

   Das war nicht nur Lärm, sondern falsch:
   · Gespeichert wurden drei Bewertungen derselben Übung. Ø-Sterne und Trainer-Statistik
     zählten sie dreifach, und der Kommentar erschien dreimal im Trainingsplan.
   · Beim erneuten Öffnen zog `evals.find(e => e.formIdx === p.formIdx …)` für alle drei
     Karten denselben ersten Treffer: Wer sie unterschiedlich bewertet hatte, sah zwei
     Bewertungen nicht wieder.

   Gebündelt wird nach Übung UND Trainer: Bewertet wird die Übung, nicht der Durchgang – aber
   zwei Trainer, die dieselbe Übung an verschiedenen Feldern betreut haben, urteilen getrennt.
   Die Blöcke, in denen sie lief, stehen als Zeile darunter. */
function einheitPlanBuendeln(plan){
  const aus=[], nach=new Map();
  (Array.isArray(plan)?plan:[]).forEach(p=>{
    if(!p)return;
    const key=((typeof _tfNormName==="function"?_tfNormName(p.formName):String(p.formName||"").trim().toLowerCase())||("#"+p.formIdx))+"|"+String(p.trainer||"");   // v586: nach Namen
    const da=nach.get(key);
    if(da){
      const l=String(p.slotLabel||"").trim();
      if(l&&!da._labels.includes(l))da._labels.push(l);
      return;
    }
    const kopie={...p,_labels:[String(p.slotLabel||"").trim()].filter(Boolean)};
    nach.set(key,kopie); aus.push(kopie);
  });
  return aus;
}
/* „Hauptteil 1 – drei Stationen, 3 Min frei …“ und „Hauptteil 2 – Gruppen rücken …“ sind
   zwei Sätze, die zusammen breiter sind als der Bildschirm. Gesucht ist, was sie
   unterscheidet: der Anfang bis zum Gedankenstrich. */
function einheitBlockNamen(p){
  const kurz=(String(p&&p.slotLabel||"")).trim();
  const alle=(p&&Array.isArray(p._labels)&&p._labels.length)?p._labels:[kurz].filter(Boolean);
  const namen=alle.map(l=>{
    const m=/^([^–—:]{1,40}?)\s*[–—:]/.exec(l);
    return (m?m[1]:l).trim();
  }).filter(Boolean);
  return [...new Set(namen)];
}
async function einheitDetailOpen(datum){
  const c=document.getElementById("eb-card"); if(!c)return;
  EB_DATUM=datum;
  c.innerHTML='<div style="padding:20px;color:var(--text3);font-size:var(--s-text)">Lade Einheit…</div>';
  EB_PLAN=(typeof tpPlanLoad==="function")?await tpPlanLoad(datum):[];
  EB_PLAN=einheitPlanBuendeln(EB_PLAN);
  // P3 (PO): Jeder Trainer bewertet nur SEINE Übungen; „Alle"-Stationen sieht jeder.
  // Kennt der Plan keine Trainer-Zuordnung (Altbestand), bleibt alles sichtbar.
  try{
    const me=await trainerMe();
    if(me&&EB_PLAN.some(p=>p.trainer&&p.trainer!=="Alle")){
      const meine=EB_PLAN.filter(p=>!p.trainer||p.trainer==="Alle"||p.trainer===me);
      if(meine.length)EB_PLAN=meine;
    }
  }catch(e){}
  if(!EB_ME){ try{EB_ME=((typeof trainerMe==="function")?await trainerMe():"")||"";}catch(e){} }
  /* v630: die eigene Bewertung dieses Tages – die der anderen stehen darunter, nur zum Lesen. */
  const ex=EINHEIT_CACHE.find(x=>x.datum===datum&&x.autor===EB_ME)||{};
  const andere=EINHEIT_CACHE.filter(x=>x.datum===datum&&x.autor!==EB_ME);
  const evals=(typeof EVAL_DATA!=="undefined"&&EVAL_DATA[datum])||[];
  EB_ALT_OHNE_VON=new Set();
  const aw=(typeof AW_DATA!=="undefined"&&AW_DATA[datum])||null;
  const fld="padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box";
  const kopf=`<div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:16px 0 4px">`;

  // ── Übungen aus dem gespeicherten Plan des Tages ──
  let ueHtml;
  if(!EB_PLAN.length){
    ueHtml=`<div style="font-size:var(--s-text);color:var(--text3);background:var(--surface2);border-radius:8px;padding:10px">Für diesen Tag ist kein Trainingsplan gespeichert. Pläne werden ab jetzt automatisch am Datum festgehalten, sobald du im Reiter „Training“ Übungen zuweist.</div>`;
  }else{
    ueHtml=EB_PLAN.map((p,i)=>{
      const gleich=e=>e&&e.trainer===p.trainer&&(typeof tfGleicheUebung==="function"?tfGleicheUebung(e,p):e.formIdx===p.formIdx);   // v586: nach Namen
      /* v630: je Trainer eine eigene Bewertung der Übung (Feld „von“). Einträge von vor v630 tragen
         keinen Namen – die gelten als die eigenen, wie bisher, und werden beim Speichern ersetzt. */
      let alt=evals.find(e=>gleich(e)&&e.von===EB_ME);
      if(!alt){ alt=evals.find(e=>gleich(e)&&!e.von); if(alt)EB_ALT_OHNE_VON.add(`${p.formName}|${p.trainer||""}`); }
      alt=alt||{};
      const fremdeUe=evals.filter(e=>gleich(e)&&e.von&&e.von!==EB_ME);
      const skip=!!alt.skipped;
      const badge=p.trainer&&p.trainer!=="Alle"?`<span style="background:#e0e7ff;color:#3730a3;font-size:var(--s-klein);padding:1px 6px;border-radius:4px;margin-left:6px">${esc(p.trainer)}</span>`:"";
      return `<div id="eb-ue-${i}" data-skip="${skip?1:0}" style="border:var(--border-s);border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
          <span style="font-size:var(--s-text);font-weight:700;color:var(--text)">${esc(p.formName)}</span>${badge}
        </div>
        <div style="font-size:var(--s-klein);color:var(--text3);margin-bottom:6px">${esc(einheitBlockNamen(p).join(" · "))}${(p._labels&&p._labels.length>1)?` <span style="color:var(--text2)">· ${p._labels.length}× im Plan</span>`:""}</div>
        <div id="eb-ue-stars-${i}" style="${skip?"opacity:.35;pointer-events:none":""}">
          ${EB_DIMS.map(d=>einheitStarRow(`ue-${i}-${d.key}`,d.label,alt[d.key]||0,5,19)).join("")}
        </div>
        <textarea id="eb-ue-notiz-${i}" class="wachsen" rows="1" placeholder="Kommentar zur Übung (optional) – steht beim nächsten Mal im Plan" maxlength="800"
          style="${fld};width:100%;min-height:44px;margin-top:6px;resize:vertical">${esc(alt.notiz||"")}</textarea>
        ${fremdeUe.map(f=>`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">${esc(stempelText(f.von,f.am))}: ${EB_DIMS.filter(d=>f[d.key]).map(d=>d.label+" "+"★".repeat(f[d.key])).join(", ")||(f.skipped?"nicht bewertet":"")}${f.notiz?" – "+esc(f.notiz):""}</div>`).join("")}
        <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:var(--s-klein);color:var(--text2);cursor:pointer">
          <input type="checkbox" id="eb-skip-${i}" ${skip?"checked":""} onchange="einheitSkipToggle(${i})">
          Übersprungen / anderer Trainer – nicht bewerten
        </label>
      </div>`;
    }).join("");
  }

  // ── Spieler-Sterne: nur für Kinder, die an dem Tag als anwesend erfasst sind ──
  let spHtml;
  /* v648 hatte hier auch die Sterne je Kind gesperrt. v677 PO 29.09.: Gesperrt ist nur die
     Profilbewertung (Team → Bewerten). Die schnellen Sterne zum Trainingseinsatz sammeln genau das
     Material dafür und sind immer frei. */
  if(!aw){
    spHtml=`<div style="font-size:var(--s-text);color:var(--text3);background:var(--surface2);border-radius:8px;padding:10px">Für diesen Tag ist keine Anwesenheit erfasst. Trage sie unter „Anwesenheit“ ein – danach kannst du die Kinder hier bewerten.</div>`;
  }else{
    EB_SPIELER=KADER.filter(k=>aw[k.name]&&aw[k.name].da).map(k=>k.name); // Index statt Name im Key: Namen mit ' wuerden den onclick sprengen
    spHtml=EB_SPIELER.length
      ? EB_SPIELER.map((n,i)=>einheitStarRow(`sp-${i}`,esc(n),(aw[n].qual)||0,3,21)).join("")
      : `<div style="font-size:var(--s-text);color:var(--text3)">An diesem Tag war kein Kind als anwesend eingetragen.</div>`;
  }

  const dt=new Date(datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
  c.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
      <button class="btn btn-sm" onclick="einheitListRender()"><i class="ti ti-arrow-left"></i></button>
      <div style="font-weight:800;font-size:var(--s-karte)">⭐ ${dt}</div>
    </div>
    ${ex.autor?stempelHtml(ex.autor,ex.updated_at,"· deine Bewertung"):stempelHtml(EB_ME||"Trainer",null,"· du bewertest")}
    ${andere.length?`<details style="margin:2px 0 4px"><summary style="font-size:var(--s-klein);color:var(--text2);cursor:pointer;min-height:32px">Auch bewertet von ${esc(andere.map(a=>a.autor).join(", "))}</summary>
      ${andere.map(a=>`<div style="border:var(--border-s);border-radius:8px;padding:8px;margin-top:6px;background:var(--surface2)">${stempelHtml(a.autor,a.updated_at)}
        <div style="font-size:var(--s-text)">${[["spass","Spaß"],["umsetzung","Umsetzung"],["erfolg","Erfolg"]].filter(([k])=>a[k]).map(([k,l])=>l+" "+"★".repeat(a[k])).join(" · ")||"ohne Sterne"}</div>
        ${a.notiz?`<div style="font-size:var(--s-text);white-space:pre-wrap;margin-top:4px">${esc(a.notiz)}</div>`:""}</div>`).join("")}</details>
      ${ebSpanneHtml([ex].concat(andere))}`:""}
    ${typeof nbSprachHtml==="function"?nbSprachHtml("training","d"+datum):""}
    <div id="eb-fokus"></div>
    ${kopf}Die Einheit insgesamt</div>
    <div id="eb-rows">${einheitRowsHtml(ex)}</div>
    <textarea id="eb-notiz" class="wachsen" rows="2" maxlength="3000" placeholder="Notiz zur Einheit (optional)" style="${fld};width:100%;resize:vertical;margin-top:6px">${esc(ex.notiz||"")}</textarea>
    ${kopf}Die Übungen</div>
    ${ueHtml}
    ${kopf}Die Kinder <span style="font-weight:600;text-transform:none;color:var(--text3)">· Trainingseinsatz, 1–3 Sterne</span></div>
    ${spHtml}
    <button onclick="einheitSave()" style="width:100%;min-height:56px;margin-top:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:900;cursor:pointer;box-shadow:0 2px 10px rgba(37,99,235,.3)">💾 Nachbewertung speichern</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('eb-modal').remove()">Schließen</button>`;
  if(typeof tbFokusInto==="function")tbFokusInto("eb-fokus",datum,"wirkung");   // v712: Hat die Konsequenz gewirkt?
  /* v627 PO: geführte Nachbereitung als Standard – Frage für Frage mit Antwort-Kacheln (md-fazit.js). */
  if(typeof felderWachsen==="function")felderWachsen(c);
  if(typeof nbWegStart==="function")nbWegStart("training");
}

function einheitSkipToggle(i){
  const cb=document.getElementById("eb-skip-"+i), box=document.getElementById("eb-ue-stars-"+i), wrap=document.getElementById("eb-ue-"+i);
  if(!cb||!box||!wrap)return;
  wrap.dataset.skip=cb.checked?"1":"0";
  box.style.opacity=cb.checked?".35":"";
  box.style.pointerEvents=cb.checked?"none":"";
}

async function einheitSave(opt){
  const datum=EB_DATUM; if(!datum){toast("Keine Einheit gewählt","err");return;}
  // 1) Einheit gesamt -> Tabelle einheit_bewertung (unveraendert)
  const g=k=>einheitGetStar(k)||null;
  const body={datum,autor:EB_ME||"Trainer",spass:g("spass"),umsetzung:g("umsetzung"),erfolg:g("erfolg"),notiz:(document.getElementById("eb-notiz")?.value||"").trim()||null,updated_at:new Date().toISOString()};
  const _sn=(typeof nbSprachnotizFuer==="function")?nbSprachnotizFuer("d"+datum):undefined; if(_sn)body.sprachnotiz=_sn;   // v628: gesprochener Rohtext bleibt erhalten
  try{
    const r=await fetch(`${SB_URL}/rest/v1/einheit_bewertung?on_conflict=datum,autor`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!(r.ok||r.status===201)){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  const idx=EINHEIT_CACHE.findIndex(x=>x.datum===datum&&x.autor===body.autor); if(idx>=0)EINHEIT_CACHE[idx]=body; else EINHEIT_CACHE.unshift(body);
  EINHEIT_CACHE.sort((a,b)=>String(b.datum).localeCompare(String(a.datum)));

  // 2) Uebungen -> EVAL_DATA (gleiche Struktur wie evalSave, damit Verlauf/Trainer-Stats weiterlaufen).
  //    Uebersprungene bekommen KEINE Zahlenwerte, sonst zoegen sie den Schnitt auf 0.
  if(EB_PLAN.length&&typeof EVAL_DATA!=="undefined"){
    const evals=EB_PLAN.map((p,i)=>{
      const skip=document.getElementById("eb-ue-"+i)?.dataset.skip==="1";
      /* v483 – PO: „Wie kann ein Trainer optional die Übungen nach einem Training bewerten und
         kommentieren?" Das Feld gab es, es blieb immer leer. Jetzt je Übung ein Kommentar –
         er erscheint im Trainingsplan, wenn die Übung wieder gewählt wird (tpUebungKommentare). */
      const e={name:p.formName,trainer:p.trainer||"",formIdx:p.formIdx,notiz:(document.getElementById("eb-ue-notiz-"+i)?.value||"").trim(),skipped:skip,von:EB_ME||"Trainer",am:new Date().toISOString()};
      if(!skip)EB_DIMS.forEach(d=>{e[d.key]=einheitGetStar(`ue-${i}-${d.key}`);});
      return e;
    });
    /* v607: Zusammenführen statt ersetzen. Jeder Trainer sieht hier nur SEINE Übungen (P3),
       gespeichert wurde aber die Liste des ganzen Tages – wer als Zweiter bewertete, löschte
       Sterne und Kommentare des Ersten, lokal und auf dem Server. Jetzt gilt: Die eigenen
       Einträge (Übung + Trainer) werden ersetzt, alle anderen bleiben. Grundlage ist der
       Stand auf dem Server, nicht der des Geräts – der Kollege hat womöglich erst vor einer
       Minute gespeichert. */
    let basis=Array.isArray(EVAL_DATA[datum])?EVAL_DATA[datum]:[];
    try{
      const r=await fetch(`${SB_URL}/rest/v1/trainings_eval?datum=eq.${encodeURIComponent(datum)}&select=data`,{headers:sbAuthHeaders()});
      if(r.ok){const rows=await r.json(); if(rows&&rows[0]&&Array.isArray(rows[0].data))basis=rows[0].data;}
    }catch(e){}
    /* v630: Schlüssel mit Namen des Bewertenden – zwei Trainer an einer „Alle“-Station behalten
       beide ihre Bewertung. Einträge ohne Namen (vor v630), die hier als die eigenen galten, weichen. */
    const schluessel=x=>`${x&&x.name||""}|${x&&x.trainer||""}|${x&&x.von||""}`;
    const eigene=new Set(evals.map(schluessel));
    const zusammen=basis.filter(x=>!eigene.has(schluessel(x))&&!(x&&!x.von&&EB_ALT_OHNE_VON.has(`${x.name||""}|${x.trainer||""}`))).concat(evals);
    EVAL_DATA[datum]=zusammen;
    try{localStorage.setItem(EVAL_KEY,JSON.stringify(EVAL_DATA));}catch(e){}
    if(typeof teamTsSet==="function")teamTsSet(EVAL_TS_KEY,datum);
    if(typeof teamSyncUpsertDebounced==="function")teamSyncUpsertDebounced("trainings_eval",datum,zusammen);
  }

  // 3) Spieler-Sterne -> AW_DATA[datum][name].qual. "da" bleibt unangetastet, damit die
  //    Anwesenheitsquote nicht kippt; Kinder ohne Anwesenheits-Eintrag werden nicht angelegt.
  if(typeof AW_DATA!=="undefined"&&AW_DATA[datum]){
    let day=AW_DATA[datum]; let changed=false;
    /* v679 (prozess-nacherfassung.md, zwei Trainer): Gespeichert wird der ganze Tag. Grundlage war
       die Kopie auf DIESEM Gerät – wer als Zweiter bewertete, schrieb die Sterne des Ersten mit dem
       alten Stand zurück. Jetzt zuerst der Stand vom Server, dann nur die eigenen Sterne darauf;
       qual_von hält fest, wer welchen Wert gegeben hat. */
    const eigene={};
    EB_SPIELER.forEach((name,i)=>{
      if(!day[name]||!day[name].da)return;
      const el=document.getElementById("eb-stars-sp-"+i); if(!el)return;
      const v=parseInt(el.dataset.val)||0;
      if(v&&day[name].qual!==v)eigene[name]=v;
      else if(!v&&day[name].qual&&(day[name].qual_von||{})[EB_ME||"Trainer"])eigene[name]=0;   // eigenen Wert zurückgenommen
    });
    if(Object.keys(eigene).length){
      try{
        const r=await fetch(`${SB_URL}/rest/v1/anwesenheit?datum=eq.${encodeURIComponent(datum)}&select=data`,{headers:sbAuthHeaders()});
        if(r.ok){const rows=await r.json(); const srv=rows&&rows[0]&&rows[0].data; if(srv&&typeof srv==="object"){
          const namen=typeof kidMapFromIds==="function"?kidMapFromIds(srv):srv;
          day=Object.assign({},namen); Object.keys(AW_DATA[datum]).forEach(n=>{ if(!day[n])day[n]=AW_DATA[datum][n]; });
        }}
      }catch(e){}
      const ich=EB_ME||"Trainer";
      Object.keys(eigene).forEach(name=>{
        if(!day[name])return;
        const von=Object.assign({},day[name].qual_von||{}); if(eigene[name])von[ich]=eigene[name]; else delete von[ich];
        day[name]=Object.assign({},day[name],{qual:eigene[name]||Object.values(von).pop()||0,qual_von:von});
        changed=true;
      });
      AW_DATA[datum]=day;
    }
    if(changed){
      try{localStorage.setItem(AW_KEY,JSON.stringify(AW_DATA));}catch(e){}
      if(typeof teamTsSet==="function")teamTsSet(AW_TS_KEY,datum);
      if(typeof terminIdForDatum==="function")terminIdForDatum(datum).then(tid=>teamSyncUpsertDebounced("anwesenheit",datum,day,tid?{termin_id:tid}:null)).catch(()=>{});
    }
  }
  /* v526: Derselbe Weg wie im Fazit-Dialog. Die Nachbereitung ist der einzige Moment,
     in dem die Beobachtung noch frisch ist; eine Stunde spaeter wird sie abgeschrieben
     oder gar nicht. md-tagebuch.js liegt in Welle 2 – ohne die typeof-Wache riesse ein
     fehlendes Modul hier das Ende des Speicherns mit. */
  einheitListRender();
  if(opt&&typeof opt.danach==="function") return opt.danach();   // v679: „Wie war's?“ geht direkt zur Prüfkarte
  if(typeof tagebuchAusEinheit==="function") ebWeiterInsTagebuch(datum);
  else toast("Einheit nachbereitet ✓");
}
/* v679 · Zwei Trainer, ein Termin (prozess-nacherfassung.md): Die Einheit zeigt, was die Trainer
   zusammen sagen – als Spanne, nicht als Mittelwert (PO 29.09.). „Spaß ★3–4“ sagt, dass zwei
   verschieden gesehen haben; ein Mittelwert ★3,5 täte so, als hätte jemand 3,5 gesagt. Die
   einzelnen Bewertungen bleiben, wie sie sind. */
function ebSpanne(rows,key){
  const w=(rows||[]).map(r=>Number(r&&r[key])||0).filter(Boolean);
  if(!w.length)return "";
  const lo=Math.min(...w), hi=Math.max(...w);
  return lo===hi?`★${lo}`:`★${lo}–${hi}`;
}
function ebSpanneHtml(rows){
  const mit=(rows||[]).filter(r=>r&&(r.spass||r.umsetzung||r.erfolg));
  if(mit.length<2)return "";
  const t=[["spass","Spaß"],["umsetzung","Umsetzung"],["erfolg","Ziel erreicht"]].map(([k,l])=>{const x=ebSpanne(mit,k);return x?l+" "+x:"";}).filter(Boolean).join(" · ");
  return t?`<div class="eb-spanne" style="font-size:var(--s-klein);color:var(--text2);margin:0 0 6px">👥 Zusammen (${mit.length} Trainer): ${t}</div>`:"";
}
/* Kein stiller Sprung: gespeichert ist gespeichert, das Tagebuch ist ein Angebot. */
function ebWeiterInsTagebuch(datum){
  document.getElementById("eb-weiter")?.remove();
  // v679: Vorschlag aus der Sprachnotiz schon gespeichert → zu dessen Prüfung, kein zweiter Eintrag
  const vid=(typeof tbVorschlagIdFuer==="function")?tbVorschlagIdFuer("d"+datum):null;
  if(vid&&typeof nbWeiterZurPruefung==="function"){ nbWeiterZurPruefung(vid,"Einheit nachbereitet ✓"); return; }
  const box=document.createElement("div");
  box.id="eb-weiter";
  box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true");
  box.setAttribute("aria-label","Nachbereitet");
  box.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10055;display:flex;align-items:center;justify-content:center;padding:18px";
  box.onclick=e=>{ if(e.target===box) box.remove(); };
  box.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:380px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-size:var(--s-karte);font-weight:800">Einheit nachbereitet ✓</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin:6px 0 14px;line-height:1.5">Willst du daraus einen Tagebucheintrag machen? Auslöser und Beobachtung stehen schon da – es fehlen nur dein Aha und die Konsequenz.</div>
    <button class="btn btn-p" onclick="document.getElementById('eb-weiter').remove();tagebuchAusEinheit('${String(datum).replace(/'/g,"")}')" style="width:100%;min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-book"></i>Ins Tagebuch</button>
    <button class="btn" onclick="document.getElementById('eb-weiter').remove()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Später</button>
  </div>`;
  document.body.appendChild(box);
}
// Anwesenheits-Quote je Kind: Training (aus AW_DATA) + Spiele/Turniere (aus nominierungen "dabei").
/* Die Quoten-Tabelle steckte frueher fest in ihrem eigenen Fenster. Sie wird jetzt
   auch als dritter Reiter der Saison-Uebersicht gebraucht (awUebersichtZeig), damit
   Spieler-, Trainer- und Spiele-Zahlen hinter EINER Tuer liegen statt auf zwei
   aehnlichen Kacheln. Deshalb baut diese Funktion nur noch den Inhalt. */
async function anwesenheitQuoteInto(el){
  if(!el)return;
  const active=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  /* Dieselben Stichtage wie die Zahlen neben der Nominierung (md-teams.js, Welle 2):
     die Saison hat diese Woche angefangen, alles davor waren Testtermine. Ohne die
     typeof-Wache riesse ein fehlendes Modul hier den try-Block mit. */
  const abTr=(typeof saisonStart==="function")?saisonStart():"2000-01-01";
  const ab=(typeof spieleAb==="function")?spieleAb():abTr;   // Spiele zaehlen ab dem eigenen Stichtag
  /* Nur echte Trainingstage: am Spiel- oder Turniertag wird auch eine Anwesenheit
     gefuehrt, und die zaehlte hier bisher in die Trainingsquote hinein. */
  let tage=null;
  if(typeof trainingstageLaden==="function"){try{tage=await trainingstageLaden();}catch(e){}}
  const tr={}, gm={}; active.forEach(k=>{tr[k.name]={p:0,t:0};gm[k.name]={p:0,t:0};});
  // Training: AW_DATA[datum][name].da (true=da, false=gefehlt); ohne Eintrag = unbekannt
  try{Object.keys(AW_DATA||{}).forEach(d=>{if(d<abTr)return;if(tage&&!tage.has(d))return;const day=AW_DATA[d]||{};active.forEach(k=>{const e=day[k.name];if(e&&typeof e.da==="boolean"){tr[k.name].t++;if(e.da)tr[k.name].p++;}});});}catch(e){}
  // Spiele/Turniere: nominierungen.data[name] = dabei/nicht/verletzt
  try{const r=await fetch(`${SB_URL}/rest/v1/${nomZeilenPfad(ab)}`,{headers:sbAuthHeaders()});if(r.ok){(await r.json()).forEach(row=>{const data=kidMapFromIds(row.data||{});active.forEach(k=>{const s=data[k.name];if(s&&(s==="dabei"||s==="nicht"||s==="verletzt")){gm[k.name].t++;if(s==="dabei")gm[k.name].p++;}});});}}catch(e){}
  const pct=(o)=>o.t?Math.round(o.p/o.t*100):null;
  const col=(p)=>p==null?"var(--text3)":p>=75?"var(--green)":p>=50?"var(--amber)":"var(--red)";
  const cell=(o)=>{const p=pct(o);return `<span style="font-weight:700;color:${col(p)}">${p==null?"–":p+"%"}</span> <span style="color:var(--text3);font-size:var(--s-klein)">${o.t?`(${o.p}/${o.t})`:""}</span>`;};
  const rows=active.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(k=>`<tr style="border-top:var(--border)">
    <td style="padding:6px 8px;font-weight:600">${esc(k.name)}</td>
    <td style="padding:6px 8px;text-align:right">${cell(tr[k.name])}</td>
    <td style="padding:6px 8px;text-align:right">${cell(gm[k.name])}</td></tr>`).join("");
  el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:var(--s-text)">
      <tr style="font-size:var(--s-klein);text-transform:uppercase;letter-spacing:.5px;color:var(--text2)"><td style="padding:4px 8px">Spieler</td><td style="padding:4px 8px;text-align:right">🏃 Training</td><td style="padding:4px 8px;text-align:right">⚽ Spiele</td></tr>
      ${rows||'<tr><td style="padding:8px;color:var(--text3)">Noch keine Daten.</td></tr>'}
    </table></div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:8px">Training aus der Anwesenheitsliste, Spiele aus den Nominierungen · gezählt ab Saisonbeginn ${esc(abTr)} bzw. ${esc(ab)} · nur Info</div>`;
}
async function anwesenheitOpen(){
  document.getElementById("aq-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="aq-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Anwesenheits-Quote");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const cardEl=document.createElement("div");
  cardEl.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  cardEl.innerHTML=`${mdlHead("aq-modal","📊","Anwesenheits-Quote","Training aus der Liste, Spiele aus den Nominierungen · nur Info","#3b82f6")}
    <div id="aq-inhalt">Lade…</div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('aq-modal').remove()">Schließen</button>`;
  modal.appendChild(cardEl);document.body.appendChild(modal);
  await anwesenheitQuoteInto(document.getElementById("aq-inhalt"));
}
/* Drei Wege, und der Trainer erfährt immer, welcher gegriffen hat. Vorher schluckte
   ein .catch(()=>{}) jeden Fehler des Teilen-Menüs, die Zwischenablage lief unbemerkt
   ins Leere (writeText ist ein Promise, try/catch fängt das nicht) und ein blockiertes
   Pop-up hinterließ gar nichts – ein Knopf, der nichts tut, sieht aus wie ein Defekt. */
// Saison-Cockpit: ein Blick auf die Saison – Kennzahlen, Top-Torschützen, Anwesenheit,
// Sprung zur Einsatz-Fairness. Führt vorhandene Datenquellen zusammen (keine neue Persistenz).
/* ── I-B: Ferien-Radar – NRW-Schulferien über die OpenHolidays API (offene Daten,
   kein Scraping; gleiche Machart wie Wetter). 7-Tage-Cache in localStorage. Bewusst
   KEINE eigene Tür: Warnzeile im Termin-Formular, 🏖️-Badge auf Terminkarten und ein
   dezenter Dashboard-Hinweis, wenn Ferien nahen. ── */
async function ferienLoad(){
  try{const c=JSON.parse(localStorage.getItem("adler_ferien")||"null");
    if(c&&c.rows&&Date.now()-c.at<7*864e5){window._ferien=c.rows;return c.rows;}}catch(e){}
  let rows=[];
  try{
    const von=isoLokal();
    const bis=new Date(Date.now()+400*864e5).toISOString().slice(0,10);
    const r=await fetch(`https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-NW&languageIsoCode=DE&validFrom=${von}&validTo=${bis}`);
    if(r.ok){const data=await r.json();
      rows=(Array.isArray(data)?data:[]).map(h=>({von:h.startDate,bis:h.endDate,name:((h.name&&h.name[0]&&h.name[0].text)||"Ferien").replace(/\s*Nordrhein-Westfalen\s*/i,"").trim()||"Ferien"}));}
  }catch(e){}
  if(rows.length){window._ferien=rows;try{localStorage.setItem("adler_ferien",JSON.stringify({at:Date.now(),rows}));}catch(e){}}
  return window._ferien||[];
}
function ferienFuer(datum){ return (window._ferien||[]).find(f=>datum>=f.von&&datum<=f.bis)||null; }
function ferienBadge(datum){
  const f=ferienFuer(datum);
  return f?`<span title="Schulferien NRW" style="font-size:var(--s-klein);font-weight:700;padding:2px 7px;border-radius:10px;background:#e0f2fe;color:#0369a1;white-space:nowrap">🏖️ ${esc(f.name)}</span>`:"";
}
// Warnzeile unter einem Datumsfeld (Termin anlegen/bearbeiten)
async function ferienDatumHint(input,slotId){
  const slot=document.getElementById(slotId); if(!slot||!input||!input.value)return;
  await ferienLoad();
  const f=ferienFuer(input.value);
  slot.innerHTML=f?`<div style="font-size:var(--s-klein);color:#0369a1;background:#e0f2fe;border-radius:8px;padding:6px 10px;margin-top:4px">🏖️ Achtung: Das Datum liegt in den <b>${esc(f.name)}</b> (${new Date(f.von+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}–${new Date(f.bis+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}) – mit dünner Beteiligung rechnen.</div>`:"";
}
// Dashboard: Hinweis nur, wenn Ferien laufen oder in <21 Tagen beginnen
async function homeFerien(){
  const el=document.getElementById("home-ferien"); if(!el)return;
  const rows=await ferienLoad();
  const slot=document.getElementById("home-ferien"); if(!slot)return;
  const heute=isoLokal();
  const grenze=new Date(Date.now()+21*864e5).toISOString().slice(0,10);
  const jetzt=rows.find(f=>heute>=f.von&&heute<=f.bis);
  const bald=rows.filter(f=>f.von>heute&&f.von<=grenze).sort((a,b)=>a.von<b.von?-1:1)[0];
  const f=jetzt||bald;
  if(!f){slot.innerHTML="";return;}
  const dLabel=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const tage=Math.round((new Date(f.von+"T00:00:00")-new Date(heute+"T00:00:00"))/864e5);
  slot.innerHTML=`<div class="card" style="padding:10px 14px;margin-bottom:8px;border-left:3px solid #0ea5e9;display:flex;align-items:center;gap:10px">
    <span style="font-size:var(--s-teil)">🏖️</span>
    <div style="font-size:var(--s-text);color:var(--text2)"><b style="color:var(--text)">${esc(f.name)} NRW</b> ${jetzt?`laufen gerade (bis ${dLabel(f.bis)})`:`starten in ${tage} Tag${tage===1?"":"en"} (${dLabel(f.von)}–${dLabel(f.bis)})`} – Termine ggf. anpassen, Rückmeldungen früh einholen.</div>
  </div>`;
}
/* ── J2: Saisonstart-Assistent – geführter Übergang in die neue Saison. Sechs Schritte
   mit Abhaken (localStorage je Saison); der Werkzeug-Button erscheint nur Juni–September. ── */
const SAISONSTART_STEPS=[
  {k:"wrapped",  emo:"🏆", t:"Adler Wrapped ansehen",       d:"Der Saison-Rückblick fürs Team – Gänsehaut zum Abschluss.", run:"adlerWrappedTeaser()"},
  {k:"urkunden", emo:"🏅", t:"Saison-Urkunden drucken",     d:"Alle Kinder in einem Druckauftrag – fürs Abschlussfest.", run:"urkundenOpen()"},
  {k:"kader",    emo:"📋", t:"Kader aufräumen",             d:"Abgänge deaktivieren, Neuzugänge anlegen, Trikotnummern prüfen.", go:"kader"},
  {k:"serie",    emo:"📅", t:"Trainings-Termine anlegen",    d:"Die Trainingstage der neuen Saison eintragen.", run:"go('termine')"},
  {k:"einladung",emo:"🪪", t:"Einladungskarten drucken",   d:"Neue Familien per Karte mit QR-Code in die App holen.", run:"einladungskartenOpen()"},
  {k:"ansage",   emo:"📣", t:"Saisonstart-Ansage senden",   d:"Alle Eltern begrüßen – mit Gelesen-Status.", run:"ansageTrainerOpen()"},
  /* v545: Der Saisonwechsel ist der einzige Zeitpunkt, an dem ohnehin alles ausgepackt
     wird. Eine Inventur, die man „mal machen sollte", macht niemand. */
  {k:"material", emo:"🧰", t:"Material zählen",             d:"Bälle, Hütchen, Leibchen, Erste-Hilfe-Set – einmal durchzählen, bevor die Saison läuft.", run:"materialOpen()"}
];
function _saisonStartKey(){ return "adler_saisonstart_"+saisonLabel().replace(/\s/g,""); }
/* Der Check ist eine Aufgabenliste – die darf verschwinden, wenn nichts mehr offen ist
   (dieselbe Regel wie bei „Bist du dabei?"). Abgelegt wird das UNTER dem Saison-Schlüssel:
   zur nächsten Saison heißt der Schlüssel anders, der Check steht also von selbst wieder da.
   `_zu` ist bewusst kein Schritt-Kürzel, damit es den Zähler nicht verfälscht. */
function saisonStartZu(){
  try{ return !!(JSON.parse(localStorage.getItem(_saisonStartKey())||"{}")._zu); }catch(e){ return false; }
}
async function saisonStartFertig(){
  if(!await frageJaNein({emoji:"🌅",titel:"Saisonstart abschließen?",
    text:`Der Check verschwindet aus dem Orga-Menü. Zur nächsten Saison steht er von selbst wieder da – und über die Hilfe erreichst du ihn jederzeit.`,
    ja:"Abschließen",nein:"Offen lassen"}))return;
  let done={}; try{done=JSON.parse(localStorage.getItem(_saisonStartKey())||"{}");}catch(e){}
  done._zu=true;
  try{localStorage.setItem(_saisonStartKey(),JSON.stringify(done));}catch(e){}
  document.getElementById("sstart-modal")?.remove();
  toast("Saisonstart abgeschlossen ✓");
}
function saisonStartOpen(){
  let done={}; try{done=JSON.parse(localStorage.getItem(_saisonStartKey())||"{}");}catch(e){}
  const n=SAISONSTART_STEPS.filter(s=>done[s.k]).length;
  document.getElementById("sstart-modal")?.remove();
  const m=document.createElement("div");m.id="sstart-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Saisonstart-Check");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("sstart-modal","🌅","Saisonstart-Check",`Saison ${saisonLabel()} · ${n}/${SAISONSTART_STEPS.length} erledigt`,"#ea580c")}
    <div style="height:6px;background:var(--surface2);border-radius:4px;overflow:hidden;margin-bottom:12px"><div style="height:100%;width:${Math.round(n/SAISONSTART_STEPS.length*100)}%;background:linear-gradient(90deg,#ea580c,#f59e0b);transition:width .3s"></div></div>
    ${SAISONSTART_STEPS.map(s=>`<div style="display:flex;align-items:center;gap:10px;border:var(--border-s);border-left:4px solid ${done[s.k]?"var(--green)":"#ea580c"};border-radius:12px;padding:10px 12px;margin-bottom:8px;${done[s.k]?"opacity:.65":""}">
      <button onclick="saisonStartToggle('${s.k}')" aria-label="abhaken" style="border:none;background:transparent;font-size:var(--s-teil);cursor:pointer;min-width:44px;min-height:44px;margin:-6px 0 -6px -8px;flex:none">${done[s.k]?"✅":"⬜"}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-text);font-weight:800;${done[s.k]?"text-decoration:line-through":""}">${s.emo} ${s.t}</div>
        <div style="font-size:var(--s-klein);color:var(--text2)">${s.d}</div>
      </div>
      <button class="btn btn-sm" onclick="document.getElementById('sstart-modal').remove();${s.run}">Los</button>
    </div>`).join("")}
    ${n===SAISONSTART_STEPS.length?'<div style="text-align:center;font-size:var(--s-text);font-weight:800;color:var(--green);padding:6px">Alles erledigt – auf in die neue Saison! 🦅</div>':""}
    <button type="button" onclick="saisonStartFertig()" style="width:100%;min-height:44px;margin-top:4px;border:${n===SAISONSTART_STEPS.length?"none":"var(--border-s)"};border-radius:12px;background:${n===SAISONSTART_STEPS.length?"var(--green)":"var(--surface2)"};color:${n===SAISONSTART_STEPS.length?"#fff":"var(--text2)"};font-family:inherit;font-size:var(--s-text);font-weight:800;cursor:pointer">Saisonstart abschließen – bis zur nächsten Saison ausblenden</button>
  </div>`;
  document.body.appendChild(m);
}
function saisonStartToggle(k){
  let done={}; try{done=JSON.parse(localStorage.getItem(_saisonStartKey())||"{}");}catch(e){}
  done[k]=!done[k];
  try{localStorage.setItem(_saisonStartKey(),JSON.stringify(done));}catch(e){}
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  saisonStartOpen();
}
/* ── I-A: Kabinen-Wahl (Trainer) – Wahl anlegen, Ergebnis sehen, beenden. Die Kinder
   stimmen in der Kabine ab; Ergebnis kommt anonym aggregiert (RPC wahl_ergebnis). ── */
async function wahlTrainerOpen(){
  document.getElementById("wahl-modal")?.remove();
  const m=document.createElement("div");m.id="wahl-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Kabinen-Wahl");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const fld="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);margin-top:6px";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("wahl-modal","🗳️","Kabinen-Wahl","Die Kinder stimmen in der Kabine ab – Song, Motto, Wunsch-Spielform","#0284c7")}
    <input id="wahl-frage" placeholder="Frage, z. B. Welcher Einlauf-Song im August?" style="${fld}">
    <input id="wahl-opt1" placeholder="Option 1" style="${fld}">
    <input id="wahl-opt2" placeholder="Option 2" style="${fld}">
    <input id="wahl-opt3" placeholder="Option 3 (optional)" style="${fld}">
    <input id="wahl-opt4" placeholder="Option 4 (optional)" style="${fld}">
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="wahlAnlegen(this)"><i class="ti ti-plus"></i>Wahl starten</button>
    <div style="font-weight:800;font-size:var(--s-text);margin:16px 0 6px">Bisherige Wahlen</div>
    <div id="wahl-liste"><div style="font-size:var(--s-text);color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  wahlListeLoad();
}
async function wahlListeLoad(){
  const el=document.getElementById("wahl-liste"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl?select=*&order=created_at.desc&limit=6`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  if(!rows.length){el.innerHTML='<div style="font-size:var(--s-text);color:var(--text3)">Noch keine Wahl gestartet.</div>';return;}
  const ergAlle={};
  await Promise.all(rows.map(async w=>{
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/wahl_ergebnis`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_wahl:w.id})});if(r.ok)ergAlle[w.id]=(await r.json())||[];}catch(e){}
  }));
  el.innerHTML=rows.map(w=>{
    const erg=ergAlle[w.id]||[];
    const counts=(w.optionen||[]).map((_,i)=>{const e2=erg.find(x=>x.wahl===i);return e2?e2.n:0;});
    const total=counts.reduce((s,n)=>s+n,0);
    return `<div style="border:var(--border-s);border-left:4px solid ${w.aktiv?"#0284c7":"#cbd5e1"};border-radius:12px;padding:10px 12px;margin-bottom:8px;${w.aktiv?"":"opacity:.65"}">
      <div style="font-size:var(--s-text);font-weight:800">${esc(w.frage)} <span style="font-weight:400;color:var(--text3);font-size:var(--s-klein)">· ${total} Stimme${total===1?"":"n"}</span></div>
      ${(w.optionen||[]).map((o,i)=>{const pct=total?Math.round(counts[i]/total*100):0;
        return `<div style="display:flex;align-items:center;gap:8px;margin-top:5px;font-size:var(--s-text)"><span style="flex:1;min-width:0">${esc(String(o))}</span><span style="color:var(--text2)">${counts[i]}</span><span style="width:70px;height:6px;background:var(--surface2);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${pct}%;background:#0284c7"></span></span></div>`;}).join("")}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-sm" onclick="wahlToggle(${w.id},${w.aktiv?"false":"true"})">${w.aktiv?"Beenden":"Reaktivieren"}</button>
        <button class="btn btn-sm" style="margin-left:auto;color:var(--red)" onclick="wahlDelete(${w.id})"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;}).join("");
}
async function wahlAnlegen(btn){
  const frage=(document.getElementById("wahl-frage")?.value||"").trim();
  const optionen=[1,2,3,4].map(i=>(document.getElementById("wahl-opt"+i)?.value||"").trim()).filter(Boolean);
  if(!frage||optionen.length<2){toast("Frage + mindestens 2 Optionen","err");return;}
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({frage,optionen})});
    if(sbCheck401(r))return;
    if(!r.ok&&r.status!==201){toast(sbDeniedMsg(r,"Konnte nicht anlegen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  [["wahl-frage"],["wahl-opt1"],["wahl-opt2"],["wahl-opt3"],["wahl-opt4"]].forEach(([id])=>{const e2=document.getElementById(id);if(e2)e2.value="";});
  toast("🗳️ Wahl gestartet – die Kinder sehen sie in der Kabine");
  wahlListeLoad();
}
async function wahlToggle(id,aktiv){
  try{const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({aktiv})});if(!r.ok&&r.status!==204){toast("Konnte nicht ändern","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  wahlListeLoad();
}
async function wahlDelete(id){
  if(!confirm("Diese Wahl samt Stimmen wirklich löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(!r.ok&&r.status!==204){toast("Konnte nicht löschen","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Gelöscht ✓");
  wahlListeLoad();
}
/* ── H7: frisch erreichte Team-Meilensteine (7 Tage) auch dem Trainer auf der Startseite ── */
async function homeMilestone(){
  const el=document.getElementById("home-milestone"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/team_meilensteine`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)rows=(await r.json())||[];}catch(e){}
  const grenze=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
  const frisch=(rows||[]).filter(m=>m.erreicht_am>=grenze).slice(0,2);
  const slot=document.getElementById("home-milestone"); if(!slot)return;
  if(!frisch.length){slot.innerHTML="";return;}
  slot.innerHTML=frisch.map(m=>`<div class="card" style="padding:10px 14px;margin-bottom:8px;border-left:3px solid #f59e0b;display:flex;align-items:center;gap:10px">
    <span style="font-size:var(--s-teil)">🎉</span>
    <div><div style="font-size:var(--s-text);font-weight:800;color:var(--text)">Team-Meilenstein</div>
    <div style="font-size:var(--s-text);font-weight:800">${esc(m.label)}</div></div>
  </div>`).join("");
}
/* v672 PO 29.09.: „Kann die App tracken über mehrere Wochen hinweg, wann die Zusagen für einen
   Termin der Eltern getätigt wurden … im Schnitt vier Tage vorher oder fünf Minuten vorher, wie oft
   dann wieder abgesagt wurde … auf der Basis des Kindes.“ Kachel: „Bauen, nur Trainer“ – Eltern
   sehen nichts davon, keine Rangliste (sortiert nach Name, keine Ampelfarben).
   Vorlauf aus allen Rückmeldungen; Umentscheidungen erst ab v672 (vorher nicht gespeichert). */
function _rsDauer(std){
  if(std==null)return "–";
  const h=Number(std); if(!isFinite(h))return "–";
  return h<1?"unter 1 Std.":h<24?`${Math.round(h)} Std.`:`${(h/24).toFixed(1).replace(".",",")} Tage`;
}
async function rueckmeldeStatistikOpen(){
  document.getElementById("rs-modal")?.remove();
  const m=document.createElement("div"); m.id="rs-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Rückmelde-Verhalten");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:640px;width:100%;margin:auto">
    ${mdlHead("rs-modal","📈","Rückmelde-Verhalten","Je Kind, diese Saison · nur für das Trainerteam","#1e3a8a")}
    <div id="rs-art" role="group" aria-label="Terminart" style="display:flex;gap:6px;margin-bottom:10px"></div>
    <div id="rs-inhalt" style="font-size:var(--s-text);color:var(--text2)">Lädt …</div></div>`;
  document.body.appendChild(m);
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/rueckmelde_statistik`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)rows=await r.json()||[];}catch(e){}
  window._rsRows=rows;
  rueckmeldeStatistikRender("spiel");
}
function rueckmeldeStatistikRender(art){
  const box=document.getElementById("rs-inhalt"), kn=document.getElementById("rs-art"); if(!box)return;
  const chip=(k,t)=>`<button type="button" class="btn btn-sm" aria-pressed="${k===art}" onclick="rueckmeldeStatistikRender('${k}')" style="${k===art?"background:#1e3a8a;color:#fff;border-color:#1e3a8a":""}">${t}</button>`;
  if(kn)kn.innerHTML=chip("spiel","⚽ Spieltage")+chip("training","🏃 Training");
  const rows=(window._rsRows||[]).filter(x=>x.art===art);
  if(!rows.length){ box.innerHTML=`<div>Noch keine Rückmeldungen in dieser Saison.</div>`; return; }
  const th=t=>`<th scope="col" style="text-align:right;padding:6px 4px;font-size:var(--s-klein);color:var(--text2);font-weight:700">${t}</th>`;
  const td=(t,l)=>`<td style="text-align:${l?"left":"right"};padding:6px 4px;border-top:1px solid var(--surface2)" class="${l?"":"zahl"}">${t}</td>`;
  box.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:var(--s-text);color:var(--text)">
    <thead><tr><th scope="col" style="text-align:left;padding:6px 4px;font-size:var(--s-klein);color:var(--text2)">Kind</th>${th("Antworten")}${th("Ø vorher")}${th("unter 24 Std.")}${th("umentschieden")}${th("zu → ab")}${art==="spiel"?th("ohne Antwort"):""}</tr></thead>
    <tbody>${rows.map(x=>`<tr>${td(esc(x.name||""),true)}${td(Number(x.antworten)||0)}${td(_rsDauer(x.vorlauf_std))}${td(Number(x.kurzfristig)||0)}${td(Number(x.umentschieden)||0)}${td(Number(x.zu_dann_ab)||0)}${art==="spiel"?td(Number(x.ohne_antwort)||0):""}</tr>`).join("")}</tbody></table></div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:10px;line-height:1.5">„Ø vorher“: wie lange vor Terminbeginn die erste Antwort kam. „umentschieden“ und „zu → ab“ zählen erst seit dem 29.09.2026 und nur Änderungen der Eltern, nicht des Trainerteams. ${art==="training"?"Beim Training gilt ohne Antwort als zugesagt – hier zählen vor allem Absagen.":"„ohne Antwort“: vergangene Spieltage dieser Saison ohne jede Rückmeldung – auch aus der Zeit, bevor die Familie einen Zugang hatte."}</div>`;
}
/* v711 · Wer bekommt Benachrichtigungen? Am 01.10. waren es 6 von 14 Familien – Erinnerungen, Rufe,
   Nominierung und Kasse erreichten weniger als die Hälfte. Nur das Trainerteam sieht die Liste
   (RPC push_abdeckung prüft is_trainer); geteilt wird nur eine Anleitung ohne Namen. */
async function pushAbdeckungOpen(){
  document.getElementById("pa-modal")?.remove();
  const m=document.createElement("div"); m.id="pa-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Wer bekommt Benachrichtigungen?");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("pa-modal","🔔","Wer bekommt Push?","Je Familie · nur für das Trainerteam","#1e3a8a")}
    <div id="pa-inhalt" style="font-size:var(--s-text);color:var(--text2)">Lädt …</div></div>`;
  document.body.appendChild(m);
  let rows=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/push_abdeckung`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)rows=await r.json();}catch(e){}
  const box=document.getElementById("pa-inhalt"); if(!box)return;
  if(!Array.isArray(rows)){ box.innerHTML="Konnte nicht laden – bitte mit Netz noch einmal öffnen."; return; }
  const an=rows.filter(x=>Number(x.mit_push)>0), ohneKonto=rows.filter(x=>!Number(x.konten)), aus=rows.filter(x=>Number(x.konten)&&!Number(x.mit_push));
  const zeile=(x,t)=>`<li style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:var(--border)"><span style="color:var(--text);font-weight:600">${esc(x.name||"")}</span><span>${t}</span></li>`;
  box.innerHTML=`<div style="font-size:var(--s-teil);font-weight:800;color:var(--text);margin-bottom:4px">${an.length} von ${rows.length} Familien</div>
    <div style="margin-bottom:12px">bekommen Erinnerungen, Adler-Rufe und Nominierungen aufs Handy.</div>
    ${aus.length?`<div style="font-weight:800;color:var(--text);margin-top:8px">🔕 Konto da, Benachrichtigungen aus (${aus.length})</div><ul style="list-style:none;margin:0 0 8px">${aus.map(x=>zeile(x,`${Number(x.konten)} Konto${Number(x.konten)===1?"":"en"}`)).join("")}</ul>`:""}
    ${ohneKonto.length?`<div style="font-weight:800;color:var(--text);margin-top:8px">🪪 Noch kein Elternkonto (${ohneKonto.length})</div><ul style="list-style:none;margin:0 0 8px">${ohneKonto.map(x=>zeile(x,"Einladungskarte")).join("")}</ul>`:""}
    ${an.length?`<details style="margin-top:8px"><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:700;color:var(--text)">✅ Mit Benachrichtigungen (${an.length})</summary><ul style="list-style:none;margin:0">${an.map(x=>zeile(x,`${Number(x.mit_push)} von ${Number(x.konten)}`)).join("")}</ul></details>`:""}
    <button type="button" class="btn btn-p" style="width:100%;margin-top:14px;justify-content:center" onclick="pushAnleitungTeilen()"><i class="ti ti-brand-whatsapp"></i>Anleitung an die Eltern teilen</button>
    <div style="font-size:var(--s-klein);margin-top:8px;line-height:1.5">Die Anleitung nennt keine Namen – sie geht an alle, z. B. in die WhatsApp-Gruppe. Gezählt wird je Konto auf irgendeinem Gerät; wer das Handy wechselt, muss neu einschalten.</div>`;
}
function pushAnleitungTeilen(){
  const url=(typeof appRoot==="function")?appRoot()+"eltern/":location.origin+"/eltern/";
  const txt="🔔 Damit ihr Erinnerungen, Nominierungen und Nachrichten vom Trainerteam aufs Handy bekommt:\n\n"+
    "1. Adler-App öffnen: "+url+"\n"+
    "2. iPhone: erst in Safari unten auf Teilen → „Zum Home-Bildschirm“, dann die App von dort öffnen.\n"+
    "3. Oben auf der Karte „🔔 Keine Nachricht vom Team verpassen“ auf Einschalten tippen und erlauben.\n\n"+
    "Bei „Trainerteam kontaktieren“ → Benachrichtigungen könnt ihr auch eine Ruhezeit einstellen. Sonntags um 18 Uhr kommt „Aus der Adlerschmiede“ mit den neuen Funktionen der Woche – nur wenn es welche gibt. Danke! 🦅";
  if(navigator.share){ navigator.share({text:txt}).catch(()=>{}); return; }
  window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank","noopener");
}
/* ── H1: Team-Ansagen (Trainer) – senden, Gelesen-Quote je Familie sehen, beenden.
   Eltern bestätigen im Portal mit „Gelesen & verstanden" (ansagen_gelesen); die RPC
   ansagen_status zählt bestätigte Familien (distinct E-Mail aus eltern_kinder). ── */
async function ansageTrainerOpen(prefill){
  document.getElementById("ansage-modal")?.remove();
  const m=document.createElement("div");m.id="ansage-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Team-Ansage");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("ansage-modal","📣","Team-Ansage","Wichtige Info an alle Eltern – mit Gelesen-Status","#1e3a8a")}
    <textarea id="ansage-text" rows="3" placeholder="z. B. Sonntag Treffpunkt schon 9:15 am Käfig – bitte pünktlich!" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-karte);background:var(--surface2);color:var(--text);resize:vertical"></textarea>
    <label style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);color:var(--text2);margin-top:8px;cursor:pointer"><input type="checkbox" id="ansage-push" checked>Eltern per Push benachrichtigen</label>
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="ansageSend(this)"><i class="ti ti-send"></i>Ansage senden</button>
    <div style="font-weight:800;font-size:var(--s-text);margin:16px 0 6px">Bisherige Ansagen</div>
    <div id="ansage-liste"><div style="font-size:var(--s-text);color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  if(prefill&&typeof prefill==="string"){const t=document.getElementById("ansage-text");if(t){t.value=prefill;t.focus();try{t.setSelectionRange(t.value.length,t.value.length);}catch(e){}}}
  ansageListeLoad();
}
async function ansageListeLoad(){
  const el=document.getElementById("ansage-liste"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/ansagen_status`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  if(!rows.length){el.innerHTML='<div style="font-size:var(--s-text);color:var(--text3)">Noch keine Ansagen.</div>';return;}
  el.innerHTML=rows.map(a=>{const d=new Date(a.created_at);const pct=a.familien?Math.round(a.gelesen/a.familien*100):0;
    return `<div style="border:var(--border-s);border-left:4px solid ${a.aktiv?"#1e3a8a":"#cbd5e1"};border-radius:12px;padding:10px 12px;margin-bottom:8px;${a.aktiv?"":"opacity:.6"}">
      <div style="font-size:var(--s-text);line-height:1.45;white-space:pre-wrap">${esc(a.text)}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:var(--s-klein);color:var(--text2)">
        <span>${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</span>
        <span style="font-weight:800;color:${a.gelesen>=a.familien?"var(--green)":"var(--amber)"}">👁 Gelesen: ${a.gelesen}/${a.familien} Familien</span>
        <button onclick="ansageToggle(${a.id},${a.aktiv?"false":"true"})" style="margin-left:auto;min-height:32px;border:none;background:transparent;color:var(--text2);font-family:inherit;font-size:var(--s-klein);cursor:pointer;text-decoration:underline">${a.aktiv?"Beenden":"Reaktivieren"}</button>
      </div>
      <div style="height:6px;background:var(--surface2);border-radius:4px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#1e3a8a,#2563eb)"></div></div>
      ${a.aktiv&&Array.isArray(a.fehlt)&&a.fehlt.length&&a.gelesen<a.familien?`<details style="margin-top:6px"><summary style="font-size:var(--s-klein);color:var(--text3);cursor:pointer">Wer fehlt noch?</summary><div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Familien von: ${a.fehlt.map(esc).join(", ")}</div></details>`:""}
    </div>`;}).join("");
}
async function ansageSend(btn){
  const txt=(document.getElementById("ansage-text")?.value||"").trim();
  if(!txt){toast("Bitte erst einen Text eingeben","err");return;}
  const push=!!document.getElementById("ansage-push")?.checked;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ansagen`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({text:txt})});
    if(sbCheck401(r))return;
    if(!r.ok&&r.status!==201){toast(sbDeniedMsg(r,"Konnte nicht senden"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  const t=document.getElementById("ansage-text"); if(t)t.value="";
  toast("📣 Ansage veröffentlicht ✓");
  try{navigator.vibrate&&navigator.vibrate(40);}catch(e){}
  if(push&&typeof pushSendToParents==="function"){
    try{await pushSendToParents("📣 Neue Ansage vom Trainerteam",txt.slice(0,140),appRoot()+"?portal");}catch(e){}
  }
  ansageListeLoad();
}
async function ansageToggle(id,aktiv){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ansagen?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({aktiv})});
    if(!r.ok&&r.status!==204){toast("Konnte nicht ändern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  ansageListeLoad();
}
/* ── H5: Probetraining – Schnupperkinder BEWUSST getrennt vom Kader (DSGVO-Datensparsamkeit).
   Trainer-only Tabelle probekinder; Entschiedenes („aufnehmen"/„abgesagt") wird 30 Tage nach
   der Entscheidung beim Öffnen automatisch gelöscht – kein Cron nötig. ── */
async function probeOpen(){
  document.getElementById("probe-modal")?.remove();
  try{ // DSGVO-Aufräumen zuerst
    const alt=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
    await fetch(`${SB_URL}/rest/v1/probekinder?status=neq.schnuppert&entschieden_am=lt.${alt}`,{method:"DELETE",headers:sbAuthHeaders()});
  }catch(e){}
  const m=document.createElement("div");m.id="probe-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Probetraining");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const fld="box-sizing:border-box;padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-karte);background:var(--surface2);color:var(--text)";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("probe-modal","🆕","Probetraining","Schnupperkinder – getrennt vom Kader, Auto-Löschung nach Entscheidung","#0891b2")}
    <div style="display:flex;flex-direction:column;gap:8px">
      <input id="probe-name" placeholder="Name des Kindes" style="${fld}">
      <div style="display:flex;gap:8px">
        <input id="probe-kontakt" placeholder="Eltern-Kontakt (Telefon/Mail)" style="${fld};flex:1;min-width:0">
        <button class="btn btn-p btn-sm" onclick="probeAdd(this)"><i class="ti ti-plus"></i>Anlegen</button>
      </div>
    </div>
    <div id="probe-liste" style="margin-top:14px"><div style="font-size:var(--s-text);color:var(--text3)">Lade…</div></div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:10px">Datenschutz: Probekinder stehen bewusst NICHT im Kader. Nach „Aufnehmen“/„Absagen“ wird der Eintrag 30 Tage später automatisch gelöscht – Aufgenommene vorher unter Kader → „Spieler verwalten“ anlegen.</div>
  </div>`;
  document.body.appendChild(m);
  probeListeLoad();
}
const PROBE_STATUS={schnuppert:["🟡","schnuppert","var(--amber)"],aufnehmen:["✅","aufnehmen","var(--green)"],abgesagt:["❌","abgesagt","var(--red)"]};
async function probeListeLoad(){
  const el=document.getElementById("probe-liste"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/probekinder?select=*&order=created_at.desc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  if(!rows.length){el.innerHTML='<div style="font-size:var(--s-text);color:var(--text3)">Aktuell keine Probekinder.</div>';return;}
  el.innerHTML=rows.map(p=>{
    const st=PROBE_STATUS[p.status]||PROBE_STATUS.schnuppert;
    const tel=/^[+\d][\d\s\/-]{5,}$/.test((p.kontakt||"").trim());
    return `<div style="border:var(--border-s);border-left:4px solid ${st[2]};border-radius:12px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:800;font-size:var(--s-karte);flex:1;min-width:0">${esc(p.name)}</span>
        <span style="font-size:var(--s-klein);font-weight:800;color:${st[2]}">${st[0]} ${st[1]}${p.entschieden_am?" · "+new Date(p.entschieden_am+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}):""}</span>
      </div>
      ${p.kontakt?`<div style="font-size:var(--s-text);color:var(--text2);margin-top:2px">📞 ${tel?`<a href="tel:${esc(p.kontakt.replace(/[\s\/-]/g,""))}" style="color:var(--blue-text)">${esc(p.kontakt)}</a>`:esc(p.kontakt)}</div>`:""}
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">
        <span style="font-size:var(--s-klein);color:var(--text2)">🏃 ${p.trainings} Training${p.trainings===1?"":"s"}</span>
        ${p.status==="schnuppert"?`
          <button class="btn btn-sm" onclick="probeTraining(${p.id},${p.trainings})">+1 heute</button>
          <button class="btn btn-sm" style="margin-left:auto;color:var(--green)" onclick="probeStatus(${p.id},'aufnehmen')">✅ Aufnehmen</button>
          <button class="btn btn-sm" style="color:var(--red)" onclick="probeStatus(${p.id},'abgesagt')">❌ Absagen</button>`
        :`<button class="btn btn-sm" style="margin-left:auto" onclick="probeDelete(${p.id},'${(p.name||"").replace(/'/g,"")}')"><i class="ti ti-trash"></i>Jetzt löschen</button>`}
      </div>
    </div>`;}).join("");
}
async function probeAdd(btn){
  const name=(document.getElementById("probe-name")?.value||"").trim();
  const kontakt=(document.getElementById("probe-kontakt")?.value||"").trim()||null;
  if(!name){toast("Bitte den Namen eingeben","err");return;}
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/probekinder`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({name,kontakt})});
    if(sbCheck401(r))return;
    if(!r.ok&&r.status!==201){toast(sbDeniedMsg(r,"Konnte nicht anlegen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  const n=document.getElementById("probe-name"); if(n)n.value="";
  const k=document.getElementById("probe-kontakt"); if(k)k.value="";
  toast("Probekind angelegt ✓");
  probeListeLoad();
}
async function probeTraining(id,n){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/probekinder?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({trainings:(n||0)+1})});
    if(!r.ok&&r.status!==204){toast("Konnte nicht zählen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  probeListeLoad();
}
async function probeStatus(id,status){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/probekinder?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({status,entschieden_am:isoLokal()})});
    if(!r.ok&&r.status!==204){toast("Konnte nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  if(status==="aufnehmen")toast("🎉 Willkommen im Team! Jetzt unter Kader → „Spieler verwalten“ anlegen.");
  else toast("Gespeichert – der Eintrag löscht sich in 30 Tagen selbst.");
  probeListeLoad();
}
async function probeDelete(id,name){
  if(!confirm(`${name} wirklich endgültig löschen?`))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/probekinder?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok&&r.status!==204){toast("Konnte nicht löschen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Gelöscht ✓");
  probeListeLoad();
}
async function saisonCockpitOpen(){
  const active=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const ab=(typeof saisonStart==="function")?saisonStart():"2000-01-01";
  // Torschützen (match_actions aktion=tor, ab Saisonstart) + R8: Tore je Team (datum-Suffix __tN)
  let tore={}, toreGesamt=0; const toreTeam={1:0,2:0,3:0};
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?aktion=eq.tor&datum=gte.${ab}&select=spieler,datum`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(a=>{if(!a.spieler)return;tore[a.spieler]=(tore[a.spieler]||0)+1;toreGesamt++;const m=/__t(\d+)$/.exec(a.datum||"");const t=m?Number(m[1]):1;if(toreTeam[t]!=null)toreTeam[t]++;});}catch(e){}
  const scorers=Object.entries(tore).sort((a,b)=>b[1]-a[1]).slice(0,8);
  // Spiele/Turniere der Saison
  let spiele=0; try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id&typ=in.(spiel,turnier)&datum=gte.${ab}`,{headers:sbAuthHeaders()});if(r.ok)spiele=((await r.json())||[]).length;}catch(e){}
  // Anwesenheit kombiniert (Training aus AW_DATA + Spiele aus nominierungen)
  const att={}, einsatz={}; active.forEach(k=>{att[k.name]={p:0,t:0};einsatz[k.name]=0;});
  let trainings=0;
  try{Object.keys(AW_DATA||{}).forEach(d=>{trainings++;const day=AW_DATA[d]||{};active.forEach(k=>{const e=day[k.name];if(e&&typeof e.da==="boolean"){att[k.name].t++;if(e.da)att[k.name].p++;}});});}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/${nomZeilenPfad(ab)}`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(row=>{const data=kidMapFromIds(row.data||{});active.forEach(k=>{const s=data[k.name];if(s==="dabei"||s==="nicht"||s==="verletzt"){att[k.name].t++;if(s==="dabei"){att[k.name].p++;einsatz[k.name]++;}}});});}catch(e){}
  // G2: Eltern-Puls-Saisontrend (anonym, via RPC – keine user_ids)
  let puls=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/puls_season`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_from:ab})});if(!sbCheck401(r)&&r.ok)puls=await r.json();}catch(e){}
  const moodEmo=a=>a>=2.6?"😀":a>=1.8?"😐":"😟";
  let pulsHtml="";
  if(puls&&puls.overall_n){
    const weeks=(puls.weeks||[]).slice(-8);
    const bars=weeks.map(w=>{const h=Math.round((w.avg/3)*42)+6;const col=w.avg>=2.6?"var(--green)":w.avg>=1.8?"var(--amber)":"var(--red)";return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="font-size:var(--s-klein);color:var(--text3)">${w.avg}</div><div style="width:68%;height:${h}px;background:${col};border-radius:4px 4px 0 0" title="${w.n} Rückmeldungen"></div><div style="font-size:var(--s-klein);color:var(--text3);white-space:nowrap">${esc(w.wlabel)}</div></div>`;}).join("");
    pulsHtml=`<div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">🌡️ Eltern-Puls <span style="font-weight:400;color:var(--text2);font-size:var(--s-klein)">(anonym · ${puls.overall_n} Rückmeldungen · Ø ${puls.overall_avg} ${moodEmo(puls.overall_avg)})</span></div>`
      +(weeks.length?`<div style="display:flex;align-items:flex-end;gap:4px;height:74px;padding:4px 0">${bars}</div>`:'<div style="font-size:var(--s-text);color:var(--text3)">Sammelt sich, sobald Eltern nach Events abstimmen.</div>');
  }
  // H2: Kinder-Stimmung (aus der Kabine, letzte 30 Tage) – Ø-Lage + Frühwarnung bei 😞
  let stimmungHtml="";
  try{
    const ab30=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
    const r=await fetch(`${SB_URL}/rest/v1/kind_stimmung?select=spieler_id,datum,mood&datum=gte.${ab30}&order=datum.desc`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      if(rows.length){
        const avg=(rows.reduce((s,x)=>s+x.mood,0)/rows.length).toFixed(1);
        const nameById={}; active.forEach(k=>nameById[k.id]=k.name);
        // Frühwarnung: Kinder mit 😞 in den letzten 14 Tagen (Name nur trainer-sichtbar)
        const ab14=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
        const traurig={}; rows.filter(x=>x.mood===1&&x.datum>=ab14).forEach(x=>{const n=nameById[x.spieler_id];if(n)traurig[n]=(traurig[n]||0)+1;});
        const tArr=Object.entries(traurig).sort((a,b)=>b[1]-a[1]);
        stimmungHtml=`<div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">🧒 Kinder-Stimmung <span style="font-weight:400;color:var(--text2);font-size:var(--s-klein)">(Kabine · ${rows.length} Antworten · Ø ${avg} ${moodEmo(Number(avg))})</span></div>`
          +(tArr.length?`<div style="font-size:var(--s-text);color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px">😞 Zuletzt unzufrieden: <b>${tArr.map(([n,c])=>esc(n)+(c>1?` (${c}×)`:"")).join(", ")}</b> – vielleicht kurz das Gespräch suchen.</div>`
                     :'<div style="font-size:var(--s-text);color:var(--green)">Kein Kind hat zuletzt 😞 gedrückt 👍</div>');
      }
    }
  }catch(e){}
  // I-A: Adler-Post-Fairness – wer bekommt keine Komplimente? (Kudos-Blick, 60 Tage)
  let postHtml="";
  try{
    const ab60=new Date(Date.now()-60*864e5).toISOString();
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post?select=an_spieler&created_at=gte.${ab60}`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      if(rows.length){
        const per={}; rows.forEach(x=>per[x.an_spieler]=(per[x.an_spieler]||0)+1);
        const ohne=active.filter(k=>!per[k.id]).map(k=>k.name);
        postHtml=`<div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">📬 Adler-Post <span style="font-weight:400;color:var(--text2);font-size:var(--s-klein)">(${rows.length} Nachrichten · 60 Tage)</span></div>`
          +(ohne.length?`<div style="font-size:var(--s-text);color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px">Noch ohne Post: <b>${ohne.map(esc).join(", ")}</b> – vielleicht mal ein Kompliment anstoßen (oder Sprachlob!).</div>`
                       :'<div style="font-size:var(--s-text);color:var(--green)">Jedes Kind hat schon Post bekommen 👍</div>');
      }
    }
  }catch(e){}
  // Rückmelde-Tempo: wie viele Tage VOR dem Termin haben die Familien zu-/abgesagt?
  // Datengrundlage für Elterngespräche (Reaktion auf Benachrichtigungen). created_at ist
  // der Erst-Antwort-Zeitpunkt; spätere Status-Wechsel verschieben ihn nicht.
  let tempoHtml="";
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?select=spieler_id,status,created_at,termine!inner(datum)&termine.datum=gte.${ab}`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      const perKid={}; const nameById={}; active.forEach(k=>nameById[k.id]=k.name);
      rows.forEach(x=>{
        const datum=x.termine&&x.termine.datum; const name=nameById[x.spieler_id];
        if(!datum||!name||!x.created_at)return;
        const cd=new Date(x.created_at);
        const cLoc=cd.getFullYear()+"-"+String(cd.getMonth()+1).padStart(2,"0")+"-"+String(cd.getDate()).padStart(2,"0");
        const diff=Math.round((new Date(datum+"T12:00:00")-new Date(cLoc+"T12:00:00"))/864e5);
        if(diff<0)return; // nachträgliche Antworten sagen nichts über Reaktionszeit
        (perKid[name]=perKid[name]||[]).push(diff);
      });
      const arr=Object.entries(perKid).map(([name,ds])=>({
        name, n:ds.length,
        avg:ds.reduce((s,d)=>s+d,0)/ds.length,
        kurz:ds.filter(d=>d<=1).length
      })).sort((a,b)=>b.avg-a.avg);
      if(arr.length){
        const teamAvg=(arr.reduce((s,x)=>s+x.avg*x.n,0)/arr.reduce((s,x)=>s+x.n,0)).toFixed(1).replace(".",",");
        const col=a=>a>=4?"var(--green)":a>=2?"var(--amber)":"var(--red)";
        tempoHtml=`<div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">⏱️ Rückmelde-Tempo <span style="font-weight:400;color:var(--text2);font-size:var(--s-klein)">(Zu-/Absagen · Team-Ø ${teamAvg} Tage vor dem Termin)</span></div>`
          +arr.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:3px 0"><span style="flex:1">${esc(x.name)}</span>${x.kurz?`<span title="davon kurzfristig (≤1 Tag vorher)" style="font-size:var(--s-klein);color:var(--text3)">⚡ ${x.kurz}× kurzfristig</span>`:""}<span style="font-weight:700;color:${col(x.avg)}">Ø ${x.avg.toFixed(1).replace(".",",")} Tage</span><span style="font-size:var(--s-klein);color:var(--text3)">(${x.n})</span></div>`).join("")
          +`<div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">Ø Tage zwischen erster Antwort und Termin – je höher, desto früher meldet die Familie zurück. Exakt gemessen ab Juli 2026; ältere Antworten zählen mit dem Zeitpunkt der letzten Änderung.</div>`;
      }
    }
  }catch(e){}
  // A-Etappe 2: Rollen-Erfahrung auch im Cockpit (Kurzform + Button zur vollen Matrix)
  let rollenHtml="";
  try{ if(typeof rollenExpFetch==="function"){ const re=await rollenExpFetch(); if(re&&re.games){ const nie=(typeof _neverTW==="function")?_neverTW(re.byKid):[];
    rollenHtml=`<div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">🎽 Rollen-Erfahrung <span style="font-weight:400;color:var(--text2);font-size:var(--s-klein)">(${re.games} Aufstellungen)</span></div>`
      +(nie.length?`<div style="font-size:var(--s-text);color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px">🥅 Noch nie im Tor: <b>${nie.map(esc).join(", ")}</b></div>`:'<div style="font-size:var(--s-text);color:var(--green)">Jedes aktive Kind stand schon mal im Tor 👍</div>')
      +`<button class="btn btn-sm" style="margin-top:8px" onclick="document.getElementById('sc-modal').remove();w2('rollenMatrixOpen')"><i class="ti ti-layout-grid"></i>Volle Rollen-Matrix</button>`;
  } } }catch(e){}
  // R6: faire Einsätze – die mit den wenigsten Spiel-Einsätzen (nur wenn überhaupt gespielt wurde)
  const maxEins=Math.max(0,...active.map(k=>einsatz[k.name]));
  const fairArr=active.map(k=>({name:k.name,e:einsatz[k.name]})).sort((a,b)=>a.e-b.e);
  const wenig=maxEins>=2?fairArr.filter(x=>x.e<maxEins).slice(0,4):[];
  const attArr=active.map(k=>({name:k.name,pct:att[k.name].t?Math.round(att[k.name].p/att[k.name].t*100):null,t:att[k.name].t})).filter(x=>x.pct!=null).sort((a,b)=>b.pct-a.pct);
  const topAtt=attArr.slice(0,5);
  const lowAtt=attArr.filter(x=>x.pct<60).slice(-3);
  const kpi=(v,l,c)=>`<div style="flex:1;min-width:80px;text-align:center;background:var(--surface2);border-radius:12px;padding:10px"><div style="font-size:var(--s-seite);font-weight:900;color:${c}">${v}</div><div style="font-size:var(--s-klein);color:var(--text2)">${l}</div></div>`;
  const medal=i=>["🥇","🥈","🥉"][i]||`${i+1}.`;
  const attRow=x=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:3px 0"><span style="flex:1">${esc(x.name)}</span><span style="font-weight:700;color:${x.pct>=75?"var(--green)":x.pct>=50?"var(--amber)":"var(--red)"}">${x.pct}%</span><span style="font-size:var(--s-klein);color:var(--text3)">(${x.t})</span></div>`;
  document.getElementById("sc-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="sc-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Saison-Cockpit");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("sc-modal","📈","Saison-Cockpit",`Saison seit ${new Date(ab+"T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"})} · alles auf einen Blick`,"#1e3a8a")}
    <div style="display:flex;gap:8px;margin-bottom:14px">${kpi(spiele,"Spiele","var(--blue)")}${kpi("⚽ "+toreGesamt,"Tore","var(--green)")}${kpi(trainings,"Trainings","#7c3aed")}</div>
    <div style="font-weight:800;font-size:var(--s-text);margin-bottom:4px">🥇 Top-Torschützen</div>
    ${scorers.length?scorers.map(([n,c],i)=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:3px 0"><span style="width:22px">${medal(i)}</span><span style="flex:1">${esc(n)}</span><span style="font-weight:800;color:var(--green)">${c}</span></div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Noch keine Tore erfasst.</div>'}
    <div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">📊 Anwesenheit – am zuverlässigsten</div>
    ${topAtt.length?topAtt.map(attRow).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Noch keine Daten.</div>'}
    ${lowAtt.length?`<div style="font-weight:800;font-size:var(--s-text);margin:12px 0 2px;color:var(--amber)">Zuletzt oft gefehlt – dranbleiben</div>${lowAtt.map(attRow).join("")}`:""}
    ${tempoHtml}
    ${wenig.length?`<div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">⚖️ Faire Einsätze – wer war seltener dabei</div>${wenig.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:3px 0"><span style="flex:1">${esc(x.name)}</span><span style="font-size:var(--s-klein);color:var(--text3)">${x.e} Einsätze</span></div>`).join("")}`:""}
    ${(toreTeam[2]||toreTeam[3])?`<div style="font-weight:800;font-size:var(--s-text);margin:14px 0 4px">🏆 Tore je Team</div><div style="display:flex;gap:8px;flex-wrap:wrap">${[1,2,3].filter(t=>toreTeam[t]>0||t===1).map(t=>`<div style="flex:1;min-width:70px;text-align:center;background:var(--surface2);border-radius:10px;padding:8px"><div style="font-size:var(--s-klein);color:var(--text2)">Adler ${t}</div><div style="font-size:var(--s-teil);font-weight:900;color:var(--green)">⚽ ${toreTeam[t]||0}</div></div>`).join("")}</div>`:""}
    ${stimmungHtml}
    ${postHtml}
    ${rollenHtml}
    ${pulsHtml}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <button class="btn btn-sm" onclick="document.getElementById('sc-modal').remove();awUebersichtOpen();setTimeout(()=>{if(typeof awUebersichtZeig==='function')awUebersichtZeig('spiele')},0)"><i class="ti ti-checkbox"></i>Volle Anwesenheits-Quote</button>
      <button class="btn btn-sm" onclick="document.getElementById('sc-modal').remove();go('analyse')"><i class="ti ti-scale"></i>Einsatz-Fairness</button>
    </div>
    <button class="btn btn-sm" style="margin-top:10px;width:100%" onclick="document.getElementById('sc-modal').remove()">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
}
/* ═══════════════════════════════════
   TRAINER-HILFE + FEATURE-TOUR
═══════════════════════════════════ */
const HELP=[
  {cat:"🏠 Start", items:[
    {t:"Diese Woche", d:"Alle Termine der nächsten 7 Tage auf einen Blick: wie viele Kinder zugesagt haben (aus den Eltern-Rückmeldungen; beim Spieltag zählt „dabei“ aus „Teams festlegen“, sobald die Einteilung steht), ob genug Trainer da sind (aus dem Trainerplan), ob der Trainingsplan steht und die Aufstellung fürs Spiel. Die Quelle steht unter der Karte. Rot wird ein Chip erst drei Tage vor dem Termin – vorher ist „0 zugesagt“ normal. Antippen öffnet den Termin.", run:"document.getElementById('home-woche')?.scrollIntoView({behavior:'smooth',block:'center'})"},
    {t:"Startseite", d:"Von oben nach unten: was zu tun ist (Wie war's?, To-Do-Banner nur bei offenen Aufgaben, „Bist du dabei?“ mit den Terminen der nächsten 14 Tage, für die deine Antwort noch fehlt), <b>seit v682 gleich darunter die sechs Bereichs-Kacheln</b> (seit v718 drei je Reihe und halb so hoch; sie führen dorthin, wohin auch die Leiste unten führt, und zeigen dazu den nächsten Termin) – dahinter jeweils wieder eine Seite mit Kacheln, bei Taktik direkt das Brett –, dann „Diese Woche“ mit dem Stand je Termin (die erste Zeile ist der nächste Termin mit Wetter, Packtipp und den Sprungknöpfen „Anwesenheit“ und „Plan“; woher die Zahlen kommen, steht zugeklappt darunter) und der Knopf zu allen Terminen. Die drei Startschritte erscheinen nur, solange es noch keinen Kader gibt. Dieselbe Seite erreichst du über die untere Leiste; beide Wege enden im selben Bild.", go:"home"},
  ]},
  {cat:"👥 Team", items:[
    {t:"Saison-Cockpit", d:"Torschützen, Anwesenheit, Rückmelde-Tempo der Familien, faire Einsätze, Eltern-Puls, Rückmelde-Tempo – alles auf einen Blick.", run:"saisonCockpitOpen()"},
    {t:"Anwesenheit (Saison)", d:"Drei Reiter: Quote je Kind im Training, Anwesenheit der Trainer, und die Quote inklusive Spiele aus den Nominierungen. Alle drei rechnen auf denselben Zähltagen wie die Zahlen neben der Nominierung: ab dem Saisonstichtag, und nur echte Trainings – Spiel- und Turniertage zählen nicht mit, auch nicht bei der Serie 🔥.", run:"awUebersichtOpen()"},
    {t:"Probetraining", d:"Schnupperkinder verwalten – bewusst getrennt vom Kader, Auto-Löschung nach Entscheidung.", run:"probeOpen()"},
    {t:"Kader", d:"Seit v683 schlank, solange niemand bewertet ist: je Kind Nummer, Name und „Bewerten“ – Rollen-Filter und Rauten-Besetzung erscheinen erst mit der ersten Rolle. Pausen und Notfallkarten stehen als Kacheln auf der Team-Seite. Über „Spieler verwalten“ pflegst du die Stammdaten. Das Fenster zeigt seit v546 <b>eine ruhige Zeile je Kind</b> – Nummer, Name und der Zustand als Chip (nicht im Kader · TW · Foto frei · Hinweis). <b>Seit v739 öffnet ein Tipp das Kinderprofil</b>: oben Name, Nummer, Jahrgang und Spitzname, darunter Stammdaten, Fußball (Torwart, starker Fuß, Lieblingsposition als Knöpfe), Foto & Freigaben, die Fan-Fakten der Eltern zum Lesen, Gesundheit und ganz unten „Endgültig löschen“. „Änderungen speichern“ wird erst nach einer Änderung aktiv und schreibt nur dieses Kind; wer mit offener Änderung schließt, wird gefragt. Haben die Eltern einen starken Fuß angegeben und du noch nicht, steht er als Hinweis da. <b>Fotoalbum (seit v743):</b> Unter „Foto &amp; Freigaben“ liegen bis zu 6 Fotos des Kindes, jedes mit Zweck (Porträt, Aktion, Jubel, Mit dem Team, Frei). „☆ Als Kartenfoto“ macht eines zum Foto der Spielerkarte; ohne Kartenfoto bleibt das bisherige Profilfoto. Die Eltern pflegen dasselbe Album in den Fan-Fakten. Andere Familien sehen nur das Kartenfoto – und nur mit Freigabe „Team intern“; nie öffentlich, nie im Adler Nest. Fotos werden nicht mehr quadratisch zugeschnitten. <b>Sonderkarten (seit v744):</b> Unter „Mehr“ im Profil → „Sonderkarten“. Spieltagskarten entstehen von selbst für jeden Spieltag, an dem das Kind „dabei“ war (Aktionsfoto, Ort, Team, Spielform – kein Ergebnis), Kapitänskarten für jede Kapitänsbinde („2. Mal Kapitän“, dazu der Satz, was ein Kapitän bei uns tut). Du ergänzt einen Satz zum Spieltag und vergibst Momentkarten (erster Spieltag, zurück nach Verletzung …). Kind und Eltern sehen sie unter der eigenen Adler-Karte; seit v745 sehen alle Kinder und Familien sie auch in der Team-Galerie unter jeder Karte (nur ansehen, Fotos nur mit Freigabe „Team intern“) – Sätze also so schreiben, dass sie vor allen passen. Speichern nur bei den eigenen Karten, in der Kabine gar nicht. Im Sticker-Album der Kabine sind alle Sonderkarten als neue Seltenheit „SONDER“ 🃏 zu ziehen (seltener als Episch und Matchday, häufiger als Legendär); die eigenen bekommt jedes Kind geschenkt. Oben ein <b>Suchfeld</b>; „Neue Spieler speichern“ erscheint erst, wenn du unten eine neue Zeile anlegst. Geburtstag und Medical-Hinweis sehen nur Trainer, nie die Eltern. <b>Trikotgröße und Ausgabe</b> stehen nicht mehr hier, sondern unter <b>Team → Ausstattung</b> – dort mit Datum und Rückgabe. Der persönliche <b>Zu-/Absage-Link</b> liegt im Kontakte-Fenster des Kindes, weil er ein Zugangsweg der Familie ist und keine Eigenschaft des Kindes; er trägt kein Datum und ersetzt deshalb kein Nachfassen zu einem einzelnen Termin. „Endgültig löschen“ steht ganz unten im Profil – für einen Vereinswechsel ist fast immer der Haken „Im Kader“ die richtige Wahl, dann bleibt die Historie heil.", go:"kader"},
    /* v685: Der Eintrag war auf gut 20.000 Zeichen gewachsen – jede Version hatte einen Absatz
       angehängt. Jetzt steht hier, was man zum Benutzen braucht; die Entstehung je Version steht
       in der Funktionsübersicht (doku/Uebersicht_Funktionen-Adler-App_v1.md). */
    {t:"Übungen", d:"<b>Seit v722:</b> „📋 Kopieren“ (Ansicht oder Bearbeiten) öffnet eine Variante; ins KI-Feld nur sagen, was anders sein soll. <b>Seit v720</b> trägt jede Übung „Kinder je Station von … bis …“ und „🧤 mit Torwart“ (zählt mit) – damit rechnen Training füllen und Plan anpassen. <b>Seit v700</b> in der Bibliothek: „Korb-Chaos-Funino (360°-Variante)“ (Lehrgang 5.2) und „Endzone und Fähnchen“ (Vorlage L5-7). Im Skizzen-Editor schaltet „🤾 Wurfspiel“ die Beschriftung um: Zuwurf und Torwurf statt Pass und Schuss. <b>Übung ansehen:</b> oben Dauer, Kinder und Feld, dann Skizze, Ablauf und Coaching-Tipps; Bearbeiten und Kopieren stehen am Ende (seit v691). <b>Finden:</b> oben suchen, darunter die Gruppen unter Einstieg, Hauptteil und Speziell; ⭐ filtert nach Schwierigkeit, 🕘 zeigt, was lange nicht dran war. Die Sterne in der Liste sind seit v692 nur Anzeige; die Schwierigkeit änderst du im Übungsdetail mit ⭐ / ⭐⭐ / ⭐⭐⭐ – sie gilt für das ganze Trainerteam. Jede Übung zeigt, wie oft und wann zuletzt sie im Plan stand. <br><br><b>Ansehen:</b> Antippen öffnet Aufbau, Ablauf, Coaching und die Skizze. Unter der Skizze: „Groß zeigen“ (zoomen, ⛶ Vollbild, helle Rasenfassung für Sonne), „Abspielen“ bei mehreren Bildern, „Kinder einsetzen“ für die Besprechung (nur im Fenster, nichts wird gespeichert) und „Skizze teilen“ als Bild ohne Namen. Die Zeile darunter nennt das Material, das die Skizze braucht, und was im Schrank fehlt. <br><br><b>Einsetzen:</b> ➕ legt die Übung in den Trainingsplan. Fertige Einheiten übernimmst du im Trainingsplan über „Vorlage übernehmen“; nachschlagen kannst du sie hier über die Kachel „Vorlagen“. <br><br><b>Provokationsregeln:</b> unter den Coaching-Tipps, optional, eine pro Block. <br><br><b>Einordnen:</b> Jede Übung ist Spielform, Übungsform oder keines von beidem, und läuft allein, mit führendem Trainer oder mit Trainer am Feld. Die App bringt Vorschläge mit; unter der Liste stehen die Knöpfe „… Übungen einordnen“ und „… läuft sie ohne Trainer?“, gespeichert wird erst mit „Einordnung übernehmen“. Daraus rechnet der Plan die Spielform-Minuten und warnt, wenn an einem Feld ohne Trainer eine Übung steht, die einen braucht. <br><br><b>Eigene Übung:</b> Kachel „Eigene Übung“ – oben erzählen (tippen oder einsprechen), „KI-Auswertung“ füllt alle Felder und zeichnet die Skizze; du prüfst und tippst „Übung erfassen“. Im Skizzen-Editor gibt es Vorlagen, Felder, Geräte, Pfeile für Pass, Dribbling, Laufweg und Schuss, mehrere Bilder und das Hochkant-Feld. <br><br><b>Umbenennen:</b> Name im Bearbeiten-Fenster ändern – Pläne, Bewertungen und Vorlagen ziehen mit. Grundübungen: kopieren, Kopie umbenennen. <b>Archiv:</b> „📦 Archivieren“ in der Übungsansicht, zurück über „📦 Archiv“ unter der Liste. <br><br><b>Neue Übungen kommen von selbst</b> aus der Bibliothek im Repo („📚 3 neue Übungen“); eine Übung, an der du selbst gezeichnet hast, wird nie überschrieben. Weitere Werkzeuge: KI-Coach, Themenplan, DFB-Regal.", go:"formen"},
    {t:"Trainingsplan", d:"<b>🔄 Plan anpassen (seit v719):</b> Steht der Plan schon und haben sich Zu- oder Absagen geändert, liest der Knopf unter „Training füllen“ Trainer und Kinder neu ein und zeigt erst, was sich ändern müsste: fehlende Kinder, Stationen (Stationen = Trainer – es fällt die Station des fehlenden Trainers weg, sonst die hintere) und Übungen, die für die neue Gruppengröße nicht mehr passen, mit Ersatz zum selben Thema. Erst „Übernehmen“ ändert etwas; Rotation, Zusatzregeln und der gemeinsame Block bleiben. <b>Seit v687 in fünf Schritten:</b> ① Termin, ② wer trainiert mit, ③ Inhalt wählen (Vorlage übernehmen, Auto-Plan oder jeden Block selbst belegen; ein laufender Trainingsblock steht hier). <b>Training füllen (seit v713):</b> Die angehakten Trainer ergeben die Stationen, die Kinder die Gruppengröße. Jede Station bekommt eine eigene Übung, die zur Gruppe passt (eine Person mehr zum Wechseln ist erlaubt), Spielformen zuerst, passend zum Thema – offene Tagebuch-Konsequenzen, sonst der Monatsschwerpunkt. Die Gruppen wechseln je Hauptteil die Station, jeder Trainer bleibt an seinem Aufbau. Steht schon ein Plan (Vorlage, Block), füllt der Knopf nur auf: Feld 1 und eigene Stationen bleiben, die offene Stufe „beide Gruppen auf einem Feld“ auch. Beim Übernehmen einer Vorlage läuft das ab zwei Trainern von selbst. <b>Zusatzregeln (seit v714):</b> Lobpflicht, Ansage-Passspiel, Blick-vor-Ball, Gegenpressing-Pfeife, Torhüter-Tag, Schwacher-Fuß-Tag und die vier Spielformen mit eingebauter Regel (Balleroberung Bonus, 5-Sekunden-Hoch, Umschalt-Sprintpresse, Rauten-Umschalten) kommen nie an eine Station. „Training füllen“ schlägt je Hauptteil eine davon als „Regel für alle Stationen“ vor – 👁 zeigt sie, ✕ nimmt sie weg, und sie bleibt weg. <b>Vorgenommen:</b> je Vorsatz zwei Zeilen, Tippen klappt Volltext und passende Übungen auf; Kinder stehen mit Vornamen da, auch wenn der Text aus der Sprachnotiz mit Buchstaben kam. Der Kasten bleibt gleich, bis „Wie war\'s?“ nach dem Training abhakt, ④ Ablauf und Gruppen, ⑤ Spielform prüfen – seit v690 eine einzige Zahl: „40 von 70 Minuten (57 %)“, unter der Hälfte mit dem Hinweis auf die DFB-Empfehlung –, speichern und starten. „Über mehrere Wochen planen: Trainingsblock anlegen“ steht als Link unter den beiden Hauptwegen in ③; Hinweiskarten (Mindset, Team-Fokus) stehen unter „Block hinzufügen“. Im Ablauf steht, wie viele Kinder <b>dabei</b> sind und wie viele <b>fehlen</b> – aus derselben Liste wie die Gruppen: die gespeicherte Anwesenheit des Termins (auch schon am Vorabend), sonst die Zusagen, sonst der Kader ohne Absagen. Wer in der Anwesenheit abgewählt ist, fällt aus seiner Gruppe. <b>≡ am Block</b> ziehen verschiebt ihn an eine andere Stelle (auch mit den Pfeiltasten); die gewählten Übungen wandern mit. <b>＋ Übung im Aufwärmen</b> hängt eine weitere Übung an. <b>🔁 Durchgänge</b> an einem Hauptteil mit mehreren Stationen: Der folgende Hauptteil wird Durchgang 2 – mit denselben Übungen und Trainern je Station, die Gruppen wechseln, und jeder Durchgang behält seine volle Zeit. Fehlt ein folgender Hauptteil, legt die App ihn an und sagt, um wie viel die Einheit länger wird. Eine eigene Übung im Durchgang ersetzt die übernommene. <b>ℹ️ an einer Übung</b> zeigt oben „Im Plan: … Min.“ – das ist die Länge dieses Blocks; die Minuten in der Beschreibung sind nur der Richtwert, Abschnitte darin gelten als Anteil der geplanten Zeit."},
    {t:"Grillhütte", d:"Unter Termine die Kachel „🔥 Grillhütte“ unter der Terminliste. Eingeteilt wird immer die <b>Familie</b> (das Kind), nie ein einzelnes Elternteil – seit v668 <b>zwei Familien je Heimtermin</b>. <b>Einteilen</b> füllt alle offenen Plätze künftiger Heimtermine: wer in dieser Saison am seltensten dran war, zuerst; jede Familie einmal, bevor eine zum zweiten Mal dran ist; neue Kinder reihen sich hinten ein; Bestehendes bleibt stehen. <b>Kann an dem Tag nicht</b> sperrt eine Familie für ein Datum – das Einteilen überspringt sie dort. Unten unter <b>Vom Dienst befreit</b> stehen Familien, die nie eingeteilt werden (seit v671, z. B. Trainerfamilien). Übernimmt eine Familie einen Dienst, zählt er seit v672 für sie – die abgebende Familie kommt dann wieder regulär an die Reihe. <b>Umbuchen</b> trägt nach, wenn Familien außerhalb der App getauscht haben. Eltern sehen ihren Dienst ab der Einteilung auf der Startseite („Eure Familie ist eingeteilt“) – alle Eltern, die mit dem Kind verknüpft sind – und im Termin; wer nicht kann, tippt „Ersatz suchen“, eine andere Familie „Übernehmen“ – bis dahin bleibt der Dienst bei der eingeteilten Familie. Verlässt ein Kind den Kader, werden seine künftigen Dienste freigegeben."},
    {t:"Trainingsblock", d:"Ein Ziel über zwei bis vier Wochen: „🧱 Über mehrere Wochen planen: Trainingsblock anlegen“ (im Trainingsplan unter Schritt 3, solange kein Block ansteht), eine <b>Leitfrage</b> wählen, auf Wunsch einen eigenen Zielsatz, den Zeitraum und <b>genau drei Einheiten</b> aus der Folge dieser Leitfrage. Die App verteilt sie im Wechsel <b>A-B-C-A-B-C</b> auf die Trainings im Zeitraum – so kommt jede Einheit mehrmals, und die Kinder erkennen die Übungen wieder. Im Trainingsplan steht dann oben, welche Einheit heute dran ist und welcher <b>Aufbau zur Kinderzahl</b> passt (aus Anwesenheit, sonst Zusagen, sonst Kader ohne Absagen); die anderen Größen lassen sich aufklappen. „Einheit in den Plan übernehmen“ setzt sie wie „Vorlage übernehmen“. Fällt ein Training weg, rückt der Wechsel nach. Solange ein Block läuft, tritt der Monats-Schwerpunkt zurück. Die Leitfragen stehen als <b>Themen-Kacheln</b> mit ihren Einheiten; jede Einheit zeigt Dauer und Kinderzahlen, „Ablauf ansehen“ klappt die Blöcke auf, „Wählen“ nimmt sie in den Block. Jede Einheit hat ein <b>Ziel für die Kinder</b> in einem Satz („⚽ Heute schaust du vor dem Pass, wer frei ist.“) – es steht in der Vorschau und oben im Trainingsplan, zum Vorlesen vor dem Training."},
    {t:"Saisonformat (3+1 und FUNiño)", d:"Die Saison spielt 3+1 und FUNiño. Zu jeder Leitfrage gibt es jetzt Einheiten in beiden Formen – seit v667 auch für Ball behalten, Vorbeikommen und Tore machen (L1-5 bis L3-5, mit vier neuen Übungen). Beim Anlegen eines Trainingsblocks sind mit der Leitfrage drei Einheiten vorgewählt, mindestens zwei davon im Saisonformat; ein Satz über den Karten sagt, wie viele. Tauschen und abwählen geht wie bisher."},
    {t:"Geführte Tour",
     d:"❓ oben → „Geführte Tour starten“: Die App öffnet die Bereiche selbst und zeigt mit einem gelben Rahmen auf die Stelle, um die es geht – Startseite, Trainingsplan, Block, Gruppen, Übungen, Spieltag, Team, Taktik, Nachbereiten. Eltern haben ihre eigene Tour (❓ im Eltern-Bereich), Kinder in der Kabine „❓ Zeig mir alles“ in einfacher Sprache. Jede Tour kommt beim ersten Öffnen einmal von selbst; „Überspringen“ beendet sie."},
    {t:"Block automatisch planen",
     d:"Mit „Block erfassen“ plant die App <b>alle Trainings im Zeitraum sofort</b> – Einheit A, B, C im Wechsel, jede mit Abschlussturnier. Stehende Pläne im Zeitraum werden dabei ersetzt; unter „Erfasste Blöcke“ plant „Neu planen“ alles noch einmal. Am Trainingstag oben im Trainingsplan: <b>„🔄 Aktualisieren nach Anwesenheit“</b>. Zuerst greifen feste Regeln – so viele Gruppen wie Trainer, Kinder aus Anwesenheit oder Zusagen, und jede Station, an der die Gruppe nicht zur Übung passt, bekommt eine passende (Spielform bleibt Spielform, FUNiño und 3+1 zuerst). Danach prüft die KI im selben Thema und schlägt höchstens drei Tausche vor, nur mit Übungen aus der App; jeder Vorschlag hat „Übernehmen“. Fällt die KI aus, gilt der Plan aus den Regeln. An die KI gehen nur Zahlen und Übungen, keine Namen."},
    {t:"Gruppen, Wechsler, Abschlussturnier", d:"Sind Feldtrainer angehakt, bildet die App <b>so viele Gruppen wie Trainer</b>, auch wenn die Einheit mehr Stationen vorsieht – die überzählige Station entfällt, und am Block steht „👥 3 Gruppen bilden (eine ohne Trainer)“ für den, der es trotzdem will. Ein Kind mehr, als die Übung trägt, wechselt ein. Sind es zwei oder mehr, steht an der Station „⚠️ Zu viele Wechsler“ mit bis zu drei Übungen, die mit so vielen Kindern laufen, und „🤖 Per KI anpassen“: die Übung öffnet sich als Kopie, die KI schreibt sie für die Kinderzahl um, du prüfst und erfasst. Jede übernommene Vorlage endet mit einem <b>Abschlussturnier von 10 Minuten</b>; hat sie keinen eigenen Abschluss, gibt der letzte Spielblock die Zeit ab."},
    {t:"Trainingsturnier", d:"Seit v687 stehen Spielform, Zeit und Felder im Bereich „⚙️ So wird gespielt“ mit einer Zusammenfassung – beim ersten Mal offen, danach zugeklappt; am Platz prüfst du nur die Teams und tippst „Turnier bauen & los“. Turnier zum Trainingsabschluss mit Zeitbudget-Automatik – vorab planbar: es hängt am gewählten Termin und wird gespeichert, du kannst es also Tage vorher vorbereiten und findest es am Trainingstag auf jedem Gerät wieder. Gesamtzeit (z. B. 40 Min.) und 1–4 Felder vorgeben, die Automatik wählt Format und Spielzeit (5–10 Min.; bleibt Zeit übrig, gibt es eine Rückrunde statt eines Finales – beim Training soll niemand am Ende nur zuschauen) – reicht die Zeit fair nicht, sagt sie ehrlich, wie viele Minuten fehlen. Ein Platzrechner sagt vorab, wie viele Kinder die gewählte Feld-/Formatkombination gleichzeitig braucht und ob alle Teams durchgehend im Spiel sind. Zwei Modi: Kinder-Turnier (Trainer spielen auf Wunsch in den Teams mit) oder Kinder gegen Eltern (1–4 Eltern-Teams, Duelle parallel auf den Feldern, Duell-Scoreboard, nie Kind gegen Kind). Spielform wählbar (FUNiño, 4+1, 5+1) mit Team-Vorschlag aus der Kinderzahl. Ein Pfiff für alle Felder.", run:"blitzOpen()"},
  ]},
  {cat:"⚽ Spieltag", items:[
    {t:"Spieltag in vier Schritten", d:"Seit v702 geht es auf der Spieltag-Seite in vier Schritten durch den Spieltag: ① Wer kommt? (Rückmeldungen, jedes Kind ändern), ② Teams und Kapitäne (mit Aufstellung), ③ Während (Match-Uhr, Wechsel, Liveticker), ④ Danach (Ergebnis, Spielbericht, Team-Quests; das Blitz-Rating kommt erst nach der Hinrunde dazu). Oben stehen die vier als Kacheln; es ist immer nur ein Schritt offen. Am Spieltag selbst wählt die App die passende Phase nach der Uhrzeit vor. Oben links führt „‹ Spieltag“ zurück zur Übersicht – das gilt so auf jeder Unterseite.", run:"go('ue-spieltag')"},
    {t:"Spieltag", d:"<b>Seit v702 in vier Schritten:</b> ① Wer kommt? – oben, wer noch keine Antwort hat, dazu „Offene per Push erinnern“ (geht nur an diese Familien), darunter jedes Kind zum Ändern. ② Teams und Kapitäne. ③ Während des Spiels. ④ Danach. Oben steht die Termin-Karte: Treffzeit, Beginn, Ort, Route; auswärts „Spielplan“ (Link vom Gastgeber oder PDF/Foto – die Eltern sehen beides), bei Heimspielen „Festival planen“. Ein Tipp auf einen Spieltag in „Diese Woche“ führt direkt hierher. Als Kapitän zählt nur ein vergangener Spieltag; 15 Sekunden vor jedem Wechsel vibriert das Handy und piept (das iPhone piept nur). In Schritt ① „Wer kommt?“ steht die Liste offen (vorbelegt aus den Eltern-Rückmeldungen, ohne Antwort bleibt ein Kind offen, „N Offene auf Dabei setzen“ erledigt das am Platz auf einmal; „Dabei“ ist zugleich die Anwesenheit dieses Spieltags und zählt für die Spiele-Quote – die Karte „Nächster Spieltag“ auf der Startseite führt mit „Wer kommt?“ direkt hierher; was hier steht, sehen die Eltern im Termin unter „Kader-Nominierung“, ohne Team). In Schritt ② stehen die Teams als Karten mit den Namen: ein Tipp auf einen Namen schiebt das Kind ins nächste Team, zuletzt in die Pause. Die Team-Kacheln darunter zeigen die Namen ohne Aufklappen. Dazu, wie viele Teams wir stellen und welche Spielform jedes Team spielt (beim Kinderfestival etwa Adler 1 auf 4+1, Adler 2 FUNiño, dazu 3+1 und 5+1). Die Automatik setzt Torwart-Kinder zuerst auf die Teams mit Torwart, füllt dann die Felder und verteilt die übrigen Kinder so, dass die Spielzeit je Kind über alle Teams möglichst gleich ist – der Anteil steht je Team dabei. Steht ein Spielplan für den Tag (Festival oder Heimspiel), kommt alles Weitere von dort: „Teams festlegen“ zeigt je Runde, auf welchem Feld ein Team spielt, in welcher Spielform und gegen wen, und die Runde wechselt mit dem Anpfiff im Planer – geändert wird im Spielplan, „Im Spielplan ändern“ führt hin. Auch die Match-Uhr nimmt an so einem Tag ihre Spielzeit von dort (8 Minuten statt der üblichen 10), spielt sie ohne Halbzeit durch und läuft erst, wenn die Runde angepfiffen ist – „Spiel läuft“ steht dann auf den Team-Kacheln, die gerade auf dem Feld sind, und der Wechsel-Timer startet mit – mit der halben Spielzeit als Intervall (bei 8 Minuten also einer in der Mitte, einer am Ende); anhalten kannst du ihn jederzeit. Vor der ersten Runde teilt der Plan die Aufwärmfelder zu: wir immer im Käfig, die Gastvereine der Reihe nach auf die übrigen Felder; auf der Gast-Seite steht das ganz oben. Ohne Spielplan (Auswärtsturnier) legst du die Felder des Tages selbst an (Feld 1: 4+1, Feld 2: FUNiño …): die festen Teams wandern dann mit „Nächste Runde“ ein Feld weiter, und fehlt einem Team auf seinem Feld ein Kind, hilft eines aus dem Team mit der meisten Bank aus – nur für diese Runde, Torwart-Kinder wechseln sich dabei ab, welcher Trainer sie betreut – die Kinder werden dabei automatisch verteilt und lassen sich von Hand umsetzen. „Dabei“ heißt automatisch „Spielt mit“ – wen du pausieren lassen willst, stellst du selbst um. Neben jedem Kind stehen die Trainingsquote und die Zahl der Einsätze; beide zählen ab einem Stichtag (zurzeit: Trainings ab dem 31.08., Spiele ab dem 05.09.2026), damit die faire Einteilung nicht an alten Zahlen hängt. Den Kapitän wählst du in derselben Team-Karte – er bleibt es für den ganzen Spieltag, die App zählt über alle Spiele mit und sortiert die Auswahl nach „am seltensten dran“ (⭐ = noch nie). Danach hat jedes Team seine eigene Kachel in drei Schritten: „① Vor dem Spiel“ zeigt den Kapitän und die Aufstellung (Torwart fest, „Feld & Bank fair besetzen“, das Mini-Feld mit Bank); „② Während des Spiels“ hält Match-Uhr und Wechseltimer, Live-Aktionen und Liveticker sind darunter zugeklappt; „③ Nach dem Spiel“ sammelt die Ergebnisse (am Festivaltag alle Spiele dieses Teams aus dem Spielplan), Spielbericht und Ergebnis-Karte – und ganz zum Schluss das Blitz-Rating. Am Festivaltag ist die Runde aus dem Spielplan das Spiel: jede Live-Aktion, jeder Ticker-Eintrag und jeder Wechsel trägt sie, der Anpfiff im Planer schaltet um. Tore und Gegentore einer Runde werden von selbst zum Ergebnis im Festival-Plan, der Ticker bekommt bei dir und bei den Eltern einen Absatz je Spiel („Runde 3 · gegen Rath-Heumar 2 · Käfig · 2:1“), das Live-Ergebnis im Vollbild zählt nur die laufende Runde – Blitz-Rating und Spielbericht bleiben einmal je Tag. Den Liveticker startest du selbst mit „▶️ Liveticker starten“ – er hängt nicht am Anpfiff und nicht an der Aufstellung. Sobald er läuft, erscheint bei den Eltern ganz oben eine rote LIVE-Kachel mit Teilen-Knopf – der Link geht auch an Oma und Opa, ohne Anmeldung. Stoppst du ihn wieder, kommt nur nichts Neues mehr dazu – das Bisherige bleibt für die Eltern sichtbar. Drei Tage nach dem Spieltag zeigt der Link nur noch den Endstand; die Ereignisse bleiben gespeichert. Beim Blitz-Rating nach dem Spiel zählt pro Kind, Trainer und Spieltag genau eine Bewertung – gehst du ein zweites Mal durch, korrigierst du die erste, statt sie zu verdoppeln. In der Live-Aktion stehen oben die Kinder aus der Aufstellung und unter einer gestrichelten Linie alle weiteren, die heute dabei sind – du kannst also auch tickern, wenn die Aufstellung nicht gepflegt ist. Bei „Parade“ erscheinen nur die Torhüter. Hast du selbst keine Hand frei: „🙋 Jemand anderen tickern lassen“ verschickt einen Link an einen Helfer am Spielfeldrand; der sieht nur die Kinder von heute und die Aktionsknöpfe und kann Tore, Paraden und Gegentore melden – keine Bewertungen, keine Kaderdaten. Der Link gilt nur, solange der Ticker läuft. Die Team-Quests stehen darunter und gelten für alle Teams zusammen. Ist heute Spieltag, öffnet sich beim Betreten der Abschnitt, der zur Uhrzeit passt – vor dem Anpfiff „Vor dem Spiel“, während „Live“, danach „Nach dem Spiel“.", go:"spieltag"},
    {t:"Spieler bewerten", d:"Team → Bewerten: je Kind 16 Kriterien (Torwart 22) in vier Stufen – Ansatz, Solide (= altersgerecht), Gut, Stark; unter jeder Stufe steht, woran man sie im Spiel erkennt. „Bewertungsrunde starten“ geht alle Kinder nacheinander durch. <b>So wird es verlässlich:</b> vorher im Trainerteam die Stufen-Beschreibungen gemeinsam lesen und an einer gedachten Szene klären, was „Solide“ und was „Gut“ heißt; dann Kriterium für Kriterium über alle Kinder nachdenken statt Kind für Kind (sonst färbt der Gesamteindruck alle Einzelwerte); nur bewerten, was ihr gesehen habt. Ihr bewertet gemeinsam („Bewertet von: Trainerteam“ ist vorgewählt): Damit nicht die erste oder lauteste Stimme den Wert setzt, zeigt jeder seine Stufe gleichzeitig mit den Fingern (1–4); liegt ihr zwei Stufen auseinander, erzählt jeder kurz die Szene, die er gesehen hat – dann entscheidet ihr. Am Ende kurz prüfen, ob oben vor allem früh im Jahr geborene Kinder stehen (Geburtsquartal im Profil). Die Werte sind eine Momentaufnahme aus dem Training, keine Prognose. <b>Seit v635:</b> Kinder sehen nie Zahlen – auch nicht auf der Urkunde. Der Entwicklungsbericht fürs Elterngespräch nennt Stufen in Worten, Stärken, Ziele und Trainingsschwerpunkt, aber keine Prozente und keine Trainer-Interna. <b>Seit v637:</b> Was ihr nicht beobachtet habt, bekommt „Nicht gesehen“ – es zählt nicht mit, statt geraten zu werden. „Gewachsen“ zeigt die App erst, wenn ein Kriterium zwei Stufen gestiegen ist oder zwei Runden hintereinander je eine. <b>Seit v648 (Trainermeeting 27.09.2026):</b> Einzelne Spieler werden erst ab dem Ende der Hinrunde bewertet. Das Datum setzt ihr oben in Bewerten („Erste Bewertungsrunde ab“, sehen und ändern können es nur Trainer). Bis dahin ist das Formular gesperrt, „Runde fällig“ erscheint nirgends, „Einheit bewerten“ zeigt keine Sterne je Kind, das Blitz-Rating ist ausgeblendet, und die KI-Auswertung der Sprachnotiz trägt keine Werte je Kind ein – ein besonderes Ereignis landet als Satz in der Notiz. Ab dem Datum bewertet das ganze Trainerteam jeden Spieler, danach alle acht Wochen; fällig ist eine Runde 49 Tage nach der letzten. Über dem Formular steht, wer das Kind in dieser Runde schon bewertet hat. Seit v677 steht beim gewählten Kind der <b>Trainingseinsatz</b> der letzten sechs Monate: je Monat der Schnitt der schnellen Sterne nach dem Training (ruhig · gut · stark), wie oft bewertet und wie oft da. Diese schnellen Sterne sind nie gesperrt – gesperrt bis zum Startdatum ist nur diese Profilbewertung.", run:"go('bew')"},
    {t:"Aufstellung", d:"Rollen-Empfehlung aus den Bewertungen: wer passt als Aufpasser, Jäger, Flitzer links/rechts. Braucht mindestens 4 bewertete Kinder. Solange Bewerten gesperrt ist, sagt die Seite, ab wann sie rechnet; bis dahin nutzt du im Spieltag „Feld & Bank fair besetzen“ (verteilt nach Einsatzzeiten).", go:"kombi"},
    {t:"Spiel & Festival nachbereiten", d:"Die Ebene über dem Blitz-Rating: wie die MANNSCHAFT gespielt hat. Je Team vier Antippreihen in derselben Skala wie beim Blitz-Rating (schwach / ok / stark) – Ordnung im Raum (verteilt geblieben oder Traube um den Ball), Passspiel, Zweikämpfe, Spaß. Warum je Team und nicht einmal für den Tag: Adler 1 und Adler 2 spielen oft in verschiedenen Formen und gegen verschiedene Gäste, ein gemeinsamer Wert mittelt genau das weg. Darunter die Gäste, sportlich eingeschätzt (zu schwach / passend / zu stark) – die Antwort auf die Frage, wen du beim nächsten Festival einlädst, damit die Kinder Spiele bekommen und keine Vorführungen. Dann zwei Sätze, „Das hat getragen“ und „Daran arbeiten wir“, und zugeklappt drei Orga-Fragen (Zeitplan, Felder, Helfer). Alles freiwillig. Jeder Trainer gibt seine eigene Einschätzung ab, sie ersetzt keine andere. Die einzelnen Kinder bleiben im Blitz-Rating – was hier gefragt ist, sieht man am einzelnen Kind gar nicht: ob ein Achtjähriger seine Position hält, hängt an Spielform und Feldgröße, also an deiner Entscheidung. Erreichbar über das To-do auf der Startseite und im Termin-Fenster unter „Nach dem Termin“. <b>Seit v634 ein Einstieg für alles:</b> Auf der Startseite steht immer „📝 Nachbereiten – Training, Spiel, Festival“. Er zeigt die vergangenen Termine aller drei Arten in einer Liste, je mit ⭐ (von dir noch offen) oder ✅ und wer schon nachbereitet hat. Überall derselbe Ablauf: erzählen, die KI ordnet, daraus wird ein Tagebucheintrag. Das To-do „Ergebnis nachtragen“ gibt es nicht mehr – Ergebnisse zählen in der U9 nicht; wer eines festhalten will, trägt es im Termin-Fenster ein. <b>Seit v627 per Sprachnotiz:</b> Oben im Fenster (auch bei „Einheit bewerten“ nach dem Training) steht „🎙️ Per Sprachnotiz ausfüllen“. Erzähl frei, wie es lief – per Mikrofon-Knopf oder mit dem Mikrofon der Tastatur –, dann „KI auswerten“. Die KI trägt ein, was du gesagt hast: Sterne, Stufen, Kommentare, „übersprungen“, Kinder-Sterne. Was du nicht erwähnst, bleibt, wie es war; gespeichert wird erst mit dem Knopf unten. Kindernamen gehen dabei nicht an die KI – sie werden vorher durch „Kind 1“, „Kind 2“ … ersetzt. <b>Seit v627 führt dich die Nachbereitung Frage für Frage:</b> Beim Öffnen fragt sie zuerst, ob du erzählen (Sprachnotiz) oder gleich losgehen willst, dann je Frage fünf Antwort-Kacheln mit Wort und Sternen („★★★★ viel“) – ein Tipp setzt die Antwort und geht weiter, „überspringen“ lässt die Frage leer. Beim Training: Einheit, jede Übung (mit „fand nicht statt“), die Kinder, eine Notiz; bei Spiel und Festival: je Mannschaft die vier Fragen, die Gäste, zwei Sätze, Organisation. Am Ende steht, was beantwortet ist, und „Speichern“. „Alles auf einen Blick“ zeigt jederzeit den gewohnten Bogen mit denselben Werten. <b>Seit v628 bleibt deine Sprachnotiz erhalten</b> – sie wird mit der Nachbereitung gespeichert. Die KI macht daraus zusätzlich einen Tagebuch-Vorschlag: Baustein, Beobachtung, Aha, Konsequenz und drei bis fünf Schlagworte. Der Eintrag danach ist damit vorausgefüllt und als „Vorschlag der KI“ gekennzeichnet – prüfe ihn und schreib ihn in deinen Worten. Kinder stehen im Tagebuch mit Vornamen; nach außen (Kopieren, Teilen, Export) ersetzt die App sie durch Buchstaben. Seit v679 wird der Vorschlag sofort gespeichert und wartet als „Noch zu bestätigen“ – einen zweiten KI-Aufruf für denselben Termin gibt es nicht mehr. Im Tagebuch stehen oben die Themen mit Anzahl – ein Tipp zeigt nur die Einträge zu diesem Thema. <b>Seit v630 hält das Einsprechen durch:</b> Der Bildschirm bleibt an, solange du sprichst, nach einer Sprechpause hört die App von selbst weiter zu, und doppelt gelieferte Wörter stehen nur einmal im Feld. Unter dem Feld siehst du „Hört zu“ und live, was gerade ankommt; der Punkt pulsiert, sobald du sprichst. „Pause“ unterbricht, „Weiter einsprechen“ hängt an – nichts Gesagtes geht verloren. Nach 90 Sekunden Stille pausiert es von selbst. Kann dein Handy den Bildschirm nicht wach halten (etwa ein iPhone vor iOS 18.4 in der installierten App), steht das unter dem Feld – dann zwischendurch kurz aufs Display tippen. Dasselbe gilt für die Trainer-Notiz. <b>Seit v630 öffnet „Einsprechen“ eine Vollansicht:</b> der Text groß und bearbeitbar, unten Pause/Weiter und „KI-Auswertung“. <b>Seit v638</b> trägt die KI direkt in den Bogen ein – der Bogen mit Sternen und Notizen ist die Zusammenfassung, dort änderst du, was nicht passt, und speicherst. Soll die KI etwas ändern, tippe „Korrektur einsprechen“ und sag es („Die Umsetzung war eher drei Sterne“); die nächste Auswertung ersetzt, was die KI vorher eingetragen hat, und verdoppelt nichts. Kurze Denkpausen setzen keinen Punkt mehr – erst nach einer längeren Pause beginnt ein neuer Satz; die Satzzeichen setzt ohnehin die KI. Wer die beste Erkennung will, tippt ins Feld und nutzt das Mikrofon der Handy-Tastatur. „Fertig“ schließt ohne KI, der Text bleibt stehen. Das kleine Feld wächst beim Tippen mit; ⤢ daneben öffnet dieselbe Vollansicht ohne Mikrofon. <b>Seit v630 bewertet jeder Trainer selbst, mit Stempel:</b> Oben im Fenster steht „✍️ Name · Datum, Uhrzeit“. Haben Kollegen denselben Tag schon bewertet, stehen ihre Einschätzungen unter „Auch bewertet von …“ zum Lesen – deine kommt daneben und ersetzt keine. In der Liste steht bei jedem Training, wer es bewertet hat; Bewertungen von vor v630 tragen „Trainerteam“, weil der Name damals nicht erfasst wurde. Auch jede Übungsbewertung und jeder Tagebuch-Eintrag trägt den Stempel. Texte dürfen lang sein: die KI schreibt vollständig statt knapp, Notizen bis 3000 Zeichen, die Sprachnotiz bis etwa 15 Minuten, und die Felder wachsen mit."},
    {t:"Analyse", d:"Auswertung nach dem Spiel: Entwicklungs-Meilensteine aus den Bewertungen, Einsatz-Fairness (zählt Spieltage mit Blitz-Rating je Kind) und Formtrend. Solange kein Spiel bewertet ist, steht dort nur ein Satz mit dem Weg zum Spieltag.", go:"analyse"},
    {t:"Wissen & Nachschlagen", d:"Die Kachel ganz oben im Spieltag – für das, was man am Platz wissen muss und nicht auswendig kann. Drinnen: <b>Spielformen und Feldmaße</b> je Altersklasse (U8/U9 sind hervorgehoben) mit Torgrößen, Schusszone, Mittellinie, Kadergröße und Spielzeit; die <b>Spielregeln</b> vom Wettlauf zum Ball bis zum Strafangriff; <b>was Ordnungsgeld kostet</b> – die schweren Verstöße, für die vor Ort der gastgebende Verein geradesteht; das <b>Warm up Adler</b> mit allen vier Stufen und je einer Skizze; und <b>unsere Zeiten</b> für Training und Spieltag. Jeder Eintrag nennt Quelle und Stand, damit man erkennt, ob eine Zahl noch gilt – die Regelwerte stammen aus den Durchführungsbestimmungen Kinderfußball des Fußballkreises Köln. Es ist immer nur ein Eintrag aufgeklappt. Ein Hinweis steht ausdrücklich dabei: unser Käfig läuft als 4+1, vorgesehen sind für U8/U9 auf Jugendtoren 3+1 – umstellen kann das jeder Trainer je Feld, und die Teamzahlen ziehen dann automatisch mit (von Hand gesetzte bleiben stehen und werden genannt). Weitere Dokumente kommen hier nach und nach dazu.", run:"wissenOpen()"},
    {t:"Heimspiel & Festival planen", d:"Für jeden Spieltag bei uns – ein Kinderfestival mit zwei bis drei Gastvereinen genauso wie ein normales Heimspiel, bei dem nur ein Gegner kommt, der aber mehrere Teams stellen kann. Beim Heimspiel steht der Gegner schon im Termin und wird gleich mit eingetragen. Unsere Kinder und Teams kommen aus „Teams festlegen“ (änderbar, „Wieder übernehmen“ holt sie zurück); die Gastvereine trägst du mit ihren angereisten Kindern ein, die App macht daraus Teams (10 Kinder = zwei Teams). Standard sind alle vier Felder – Käfig (4+1), Funino 1, Funino 2 und 4+1 oben; je Feld wählst du 4+1, 3+1 (drei Feldspieler und Torwart, ebenfalls auf Jugendtore) oder FUNiño – Teamgröße, Feldname, Skizze und Regelkarte ziehen mit. Braucht der Plan weniger Felder, fallen sie beim Erstellen von hinten weg, zuerst das zweite Jugendtor-Feld oben. Beginn ist die Uhrzeit des Termins (sonst 10:15), zwischen den Runden 5 Minuten Trinkpause. Steht der Plan, klappt die Vorbereitung (Vereine, Felder, Zeiten) zu und im Spielplan ist nur die Runde offen, die gerade läuft oder als Nächstes kommt – auf der Gast-Seite genauso. Im fertigen Plan tauschst du zwei Teams, indem du beide antippst, und trägst rechts das Ergebnis ein (freiwillig, es gibt keine Tabelle) – der Plan liegt in der Datenbank und ist für alle Trainer änderbar. Am Festivaltag pfeifst du jede Runde gemeinsam an: „Runde 1 anpfeifen“ startet einen Countdown, den alle Trainer sehen – in der App und im Gast-Link. Läuft die Zeit ab, gibt dein Handy ein Signal und die Trinkpause zählt rückwärts bis zum nächsten Anpfiff; angepfiffen wird immer von Hand. Die geplanten Uhrzeiten ziehen dabei mit: pfeifst du Runde 2 drei Minuten später an, stehen alle folgenden Runden drei Minuten später. Derselbe Anpfiff startet auch die Match-Uhr der Adler-Teams dieser Runde, und umgekehrt startet der Anpfiff an der Match-Uhr im Spieltag die Festival-Runde – Ticker, Wechsel und Countdown zeigen dieselbe Zeit. Zum Weitergeben gibt es zwei Knöpfe: „Spielplan-Link teilen“ ist der Link für alle – Gast-Trainer, Gast-Eltern und unsere Eltern, nur zum Ansehen. „Ergebnis-Link“ ist derselbe Plan mit Schreib-Code, nur für den Anzeigetisch und die Gast-Trainer; ihr korrigiert Ergebnisse in der App. Auf der Gast-Seite gibt es außerdem „Regeln“ – eine Karte je Spielform, die auf den Feldern steht (4+1, 3+1, FUNiño), und unsere Vereinbarungen. Daneben steht „Am Rand“: unser Codex fürs Verhalten am Spielfeldrand – zwölf kurze Punkte, acht davon direkt aus dem Fairplay-Codex der Eltern-App (änderst du sie dort, ändern sie sich auch für die Gäste). Ganz oben darin und als Karte auf der Gast-Startseite steht die Platzseiten-Regel: an den oberen Feldern sind nur Spieler und Trainer, angefeuert wird am Käfig und an den vorderen Feldern. Welche Felder „oben“ liegen, rechnet die App aus dem Aufbau – bei drei Feldern rutscht das zweite Funino-Feld nach oben, bei vieren ist es das zweite Jugendtor-Feld. Die Skizze zeichnet das mit, samt Schildern „nur Spieler & Trainer“ auf dem oberen Feld und „anfeuern & jubeln“ auf dem vorderen. Der Spielplan-Link ist ausdrücklich auch für die Eltern gedacht – nur der Ergebnis-Link mit Schreib-Code bleibt bei den Trainern. Die Felder heißen wie am Platz – „Käfig“ für das erste 4+1-Feld, „Funino 1/2“, „4+1 oben“ für ein zweites – und jeder Name lässt sich je Feld überschreiben. Aus Beginn, Gesamtdauer und Spielzeit entsteht ein Runden-Plan: pro Runde spielen alle Felder gleichzeitig, jede Mannschaft trifft möglichst jede andere und wechselt dabei zwischen den Formaten. Dabei kommt jede Mannschaft mindestens einmal aufs Jugendtor-Feld: passt das nicht von allein, tauschen zwei Partien derselben Runde das Feld – Gegner, Runde und Uhrzeit bleiben, es ändert sich nur, wo gespielt wird. Hat ein Team weniger Kinder, als die Spielform braucht – vier Kinder auf 4+1 –, steht das als Warnung über dem Plan, mit Runde, Feld und Namen. Weggeräumt wird deshalb nichts: ob jemand aus einer pausierenden Mannschaft aushilft, das Feld eine Nummer kleiner läuft oder ihr die Partien der Runde tauscht, entscheidet ihr. Keine Tabelle – bei uns gewinnt die Freude am Spiel. Den fertigen Plan schickst du als Spielplan-Link (mit Wappen, Feldern und Zeiten, ohne Login). Auf der Gast-Seite steht ein Info-Knopf „Anfahrt, Parken & Felder“: Adresse mit Kartenlink, der Parkhinweis (am Platz oft voll, besser an der Straße) mit Skizze, eine Skizze, wo welches Feld liegt, und deine Zeilen aus „Infos für die Gäste“ – Kaffee und Brötchen, WC, Turnierleitung. Am Spieltag führt die Turnier-Kachel im Spieltag hierher, wenn wir ausrichten; sind wir zu Gast, gibt es seit v702 keinen Turnier-Modus mehr – dann steht oben auf der Spieltag-Seite der Spielplan des Gastgebers (Link oder PDF). Auf dem öffentlichen Link steht neben jedem Team das Wappen seines Vereins – aus der Gegner-Datenbank, beim Speichern übernommen. Fehlt dort ein Wappen, steht nur der Name. Teams desselben Vereins spielen nie gegeneinander – dafür lieber zweimal gegen einen anderen Gast. Die Spielzeit je Begegnung (7–10 Min.) rechnet die App aus den Teams und der Gesamtzeit aus; wer sie von Hand ändert, behält seinen Wert und kann die Empfehlung jederzeit übernehmen. <b>Seit v623 nennt der Link über den Runden</b> Rundenzahl, Spielzeit, Beginn und Ende und die 5 Minuten Trinkpause und Wechselfenster zwischen den Runden – aus dem Plan errechnet, ändert sich also mit, wenn du die Spielzeit anpasst.", run:"htOpen()"},
  ]},
  {cat:"🎯 Taktik", items:[
    {t:"Adler-Coach (KI)", d:"Zwei Eingänge, ein Ergebnis. <b>„💡 Idee beschreiben“</b> (beim Öffnen gewählt): Schwerpunkt, Dauer, Wo und Material einstellen – das genügt schon, der Text darunter ist die Nuance –, dann „Übungen vorschlagen“. Der Coach liefert ein bis drei Übungen für U8/U9, <b>jede mit Skizze</b>. <b>„📋 Text übernehmen“</b> nimmt einen fremden Text von einer Webseite, aus WhatsApp oder aus einem Buch und ordnet ihn ins Format der App, ohne etwas zu erfinden – was nicht dasteht, bleibt leer. Die beiden sind <b>Reiter</b>, keine Aktionsknöpfe: Ein Klick auf den bereits gewählten ändert nichts, das ist kein Fehler. Mitgeschickt wird, was die App ohnehin weiß – Kaderstärke, Monatsschwerpunkt, Platz und Dauer des nächsten Trainings; es steht offen über dem Feld, damit du es korrigieren kannst. <b>Seit v596 kannst du diktieren</b> statt zu tippen: Der Knopf steht nur da, wo dein Gerät zuhören kann, und Gesagtes wird an das Feld angehängt, nicht darüber geschrieben. Gespeichert wird nichts von allein – du entscheidest je Übung, was in die Bibliothek kommt.", run:"kiCoachOpen()"},
    {t:"Sprachlob in der Kabine", d:"<b>Seit v755</b> sammelt die Kabine alle Sprachlobe eines Kindes: Kachel „🎧 Lob vom Trainer“ (oben, mit „Neu“-Punkt), darin die Lobe nach Datum, neueste zuerst; antippen spielt ab, nochmal antippen pausiert. Dieselbe Liste öffnen die Eltern unter „Sprachlob anhören“. Ein Lob gilt als gehört, sobald es zum ersten Mal abgespielt wurde. Aufnehmen wie bisher: Kinderprofil → „Sprachlob“. Eine Push-Nachricht an die Eltern gibt es noch nicht – sie sehen den Hinweis in den Neuigkeiten."},
    {t:"Trainingsideen der Kinder", d:"<b>Seit v751</b> können die Kinder in der Kabine unter „Mehr entdecken“ → „📋 Mein Training“ selbst ein Training planen: drei Teile (🔥 Aufwärmen, ⚽ Übung, 🏆 Abschlussspiel), je eine Übung aus einer festen Kinder-Auswahl (fünf je Teil, Übungen aus unserem Training) oder eine eigene Skizze vom Taktikbrett (auch mit Mitspielern), Minuten als Knöpfe – ohne Textfeld und ohne Bewertung. „An den Trainer schicken“ legt es dir vor: Auf der Startseite erscheint „📋 Trainingsideen der Kinder · n neu“. Öffnen markiert sie als gesehen; „👍 Danke sagen“ sieht das Kind unter „Schon geschickt“. Löschen geht hier oder durch die Familie. Höchstens 20 ungelesene Trainings je Kind; das Kindergerät schickt nur, solange Appzeit übrig ist.", run:"if(typeof kindTrainingListe==='function')kindTrainingListe()"},
    {t:"Freies Brett", d:"<b>Seit v750:</b> Unter den Spielformen gibt es „Leeres Feld“ (ohne Tore und Steine); „＋ Hinzufügen“ legt Kinder aus dem Kader mit Vornamen, Torwart, Gegner, Ball, Hütchen, Stange oder Minitor dazu, „Radieren“ nimmt auch Steine weg. Dasselbe können die Kinder in der Kabine im „Mein Taktikbrett“. Ganz oben unter Taktik: „Freies Brett“ öffnet sofort im Vollbild mit beiden Mannschaften und Ball. „Schieben“ bewegt Spieler und Ball, mit Weiß, Gelb oder Blau zeichnest du mit dem Finger Laufwege und Pässe, „Radieren“ nimmt eine Linie weg, „Stift weg“ alle. Unten wechselst du die Spielform; die Zeichnung bleibt. Gespeichert wird nur auf diesem Gerät – zum Behalten eine Spielsituation anlegen. Die Kinder haben in der Kabine ein eigenes, einfacheres Brett („Mein Taktikbrett“).", go:"taktik"},
    {t:"Taktikboard", d:"Seit v689 in vier Abschnitten: „Neue Situation“ (Freies Brett und die vier Spielformen), „Oder beschreiben“ (die KI zeichnet), „Gespeicherte Situationen“, „Weitere Werkzeuge“ (Video, KI-Coach). Die Spielsituationen sind gezeichnet auf derselben Fläche wie die Skizzen der Übungen. „Beschreib die Situation“: tippen oder einsprechen, „Zeichnen lassen“, die KI legt Kinder, Gegner, Ball und Wege aufs ganze Feld; danach verschiebst du, was nicht passt. „Neue Situation“ startet mit FUNiño, 3+1, 4+1 oder 5+1 samt Rollen (TW, A, FL, FR, J). Gespeicherte Situationen zeigst du groß, spielst mehrere Bilder ab, teilst sie als Bild, bearbeitest, benennst um oder löschst sie. Für die Besprechung: „Groß zeigen“ füllt den Bildschirm (am Tablet auch Vollbild), „Kinder einsetzen“ setzt die Namen aus dem Kader auf die Kreise – nur zum Zeigen, gespeichert wird nichts davon. Unten Video und KI-Coach.", go:"taktik"},
  ]},
  {cat:"🪶 Eltern & Kinder", items:[
    {t:"Benachrichtigungen einschalten", d:"<b>Seit v698</b> steht in beiden Apps ganz oben die Karte „🔔 Keine Nachricht vom Team verpassen“, solange auf dem Handy keine Benachrichtigungen an sind. Hinter „So geht’s“ liegt eine Anleitung für Android und iPhone; auf dem iPhone muss die App dafür auf dem Home-Bildschirm liegen (iOS 16.4 oder neuer). Nach dem Einschalten kommt sofort eine Test-Meldung. Trainer-App: Orga → Einstellungen → „🔔 Benachrichtigungen aktivieren“, dann die Frage des Handys bestätigen. Eltern-App: seit v694 oben auf der Startseite die Karte „🔔 Nichts verpassen“, solange auf dem Gerät keine Benachrichtigungen an sind; sonst unter „Trainerteam kontaktieren“. Die Freigabe hängt am Gerät – nach einer Neuinstallation einmal neu einschalten. Adler-Rufe lassen sich im Chat oben mit 🔔 einzeln aus- und einschalten. <b>Ruhezeit (seit v705):</b> unter dem grünen Schalter wählt jede und jeder selbst – Keine, 21:30–7, 22–6 oder eigene Zeiten. Sie gilt fürs Konto (auf allen Geräten) und für alle Benachrichtigungen: in dieser Zeit kommt nichts aufs Handy, was anfällt, kommt danach gesammelt. Ohne eigene Wahl haben Eltern 21:30–7 Uhr Ruhe, das Trainerteam keine. Nur die Test-Benachrichtigung kommt immer sofort. Ebenfalls seit v705: Trainer- und Eltern-App auf demselben Handy bekommen beide ihre Meldungen – vorher verdrängte das zuletzt eingeschaltete Konto das andere. Ausschalten gilt nur fürs eigene Konto; schicken beide Konten dasselbe, kommt es nur einmal. Seit v695 steht unter dem grünen Schalter „📨 Test-Benachrichtigung an mich“ – sie geht sofort nur an dieses Gerät. Ein Tipp auf eine Meldung öffnet seit v696 die App, zu der sie gehört – eine Eltern-Meldung die Eltern-App, auch wenn gerade die Trainer-App offen ist. Bei Adler-Rufen landet man direkt im Gespräch mit der neuen Nachricht. Eigene Nachrichten meldet die App nie, und was schon gelesen ist, auch nicht: Adler-Rufe werden alle 5 Minuten verschickt, wer vorher in den Chat schaut, bekommt keine Meldung mehr. <b>Aus der Adlerschmiede (seit v717):</b> Eltern bekommen sonntags um 18 Uhr eine Meldung mit den neuen Funktionen der Woche – nur wenn es welche gibt, ohne Fehlerbehebungen und ohne Trainer-Funktionen. Ein Tipp öffnet die Liste; in den Adler News steht sie ebenfalls. Abschalten unter „Trainerteam kontaktieren“ → Benachrichtigungen. Die Einträge stehen in der Tabelle adlerschmiede (Form „Kurztitel: Erklärung“, in Elternsprache)."},
    {t:"Adler-Rufe (Team-Chat)", d:"Seit v670 der Chat für Eltern und Trainerteam – Kinder haben keinen Zugang. Ein Raum zum Start; Trainer und Moderatoren legen weitere an (＋ Raum). Über ⋯ an jedem Ruf: reagieren, antworten (mit Zitat), fixieren (höchstens drei, 24 Stunden bis immer), bearbeiten, zurückziehen, melden. Moderatoren archivieren statt zu löschen und schalten für 24 Stunden oder 7 Tage stumm; archivierte Rufe sieht nur das Trainerteam. „@alle“ hebt einen Ruf hervor – nur für Trainer und Moderatoren. 🔍 durchsucht alle Räume. Mit 🛡️ oben im Raum (seit v689, vorher eine eigene Kachel) legt ihr fest, wer außer dem Trainerteam moderiert (z. B. der Elternbeirat), und bearbeitet gemeldete Rufe. Namen setzt die App aus „Meine Angaben“, Telefonnummern sieht niemand. Seit v673 sitzt der Einstieg oben in der Kopfzeile: 💬 mit roter Zahl für neue Rufe (Eltern und Trainer); bei Eltern steht zusätzlich ganz oben auf der Startseite eine Zeile mit dem letzten Ruf, solange es Ungelesenes gibt. Seit v673 kommen außerdem Benachrichtigungen aufs Handy: Rufe vom Trainerteam und @alle sofort, alle anderen gebündelt höchstens alle 30 Minuten – Gelesenes nie. Ruhezeit: Eltern bekommen ohne eigene Wahl zwischen 21:30 und 7 Uhr keine (was ungelesen bleibt, kommt danach gesammelt), das Trainerteam bekommt Rufe rund um die Uhr; seit v705 stellt jede und jeder die eigene Ruhezeit bei den Benachrichtigungen in den Einstellungen ein, die Zeile unter dem Chat-Kopf sagt, was gilt. Die 🔔 im Chat-Kopf schaltet sie fürs eigene Konto ab und an; die Zahl am Knopf bleibt. Ein Tipp auf die Benachrichtigung öffnet die Adler-Rufe (im Trainerbereich nach der PIN). Seit v674: 🔒 Trainerteam – ein privater Raum je Familie mit dem Trainerteam; mitlesen können nur beide Elternteile (auch für Geschwister derselbe Raum) und das Trainerteam, der Elternbeirat nicht. Das Trainerteam öffnet die Familienräume über „🔒 Familien“. Auch wer stummgeschaltet ist, kann dem Trainerteam dort schreiben. 📊 neben dem Schreibfeld startet eine Abstimmung (alle Eltern dürfen): Frage, zwei bis sechs Antworten, namentlich (alle sehen, wer was gewählt hat) oder anonym (niemand sieht es, auch das Trainerteam nicht – nur die Zahlen), eine oder mehrere Antworten, auf Wunsch mit Schluss nach 24 Stunden, 3 oder 7 Tagen. Nochmal antippen nimmt die Stimme zurück. Beenden über ⋯: wer sie gestartet hat, Trainer und Moderatoren. <b>Gesehen von (seit v740, nur Trainerteam):</b> Unter jedem Ruf steht „👁 12/18“ – so viele Konten, die den Raum lesen dürfen, haben ihn geöffnet, nachdem der Ruf kam. Ein Tipp darauf (oder ⋯ → „Wer hat ihn gesehen?“) zeigt die Namen mit Zeit, wer noch nicht reingeschaut hat und welche Kinder noch keinen Elternzugang haben. Eine Benachrichtigung allein zählt nicht als gesehen. Eltern sehen diese Anzeige nie, weder bei sich noch bei anderen. <b>Seit v748</b> fasst ein Ruf bis zu 5.000 Zeichen (ab 4.500 zählt die App mit); lange Rufe stehen gekürzt mit „Weiterlesen“ da. Mit 📎 hängst du bis zu vier Dateien an – Bilder, PDF, Word, Excel oder PowerPoint, je höchstens 10 MB (Formate mit Makros, SVG und Programme gehen nicht). Fotos verkleinert die App selbst. Ein Ruf darf auch nur aus Anhängen bestehen. Bilder erscheinen als Vorschau, ein Tipp zeigt sie groß; PDF öffnet in einem neuen Tab, Office-Dateien werden heruntergeladen. In offenen Räumen erinnert die App daran, dass alle Eltern mitlesen – bitte keine Fotos anderer Kinder. Dateien von anderen öffnest du bitte mit Vorsicht: ein Virenscan ist nicht möglich. Archivierte oder zurückgezogene Rufe verschwinden für Eltern samt Anhang. Trainer löschen Anhänge über ⋯ → „Anhänge endgültig löschen“; der Ruf bleibt mit „Anhang entfernt“ stehen.", run:"rufeOpen()"},
    {t:"Trainerkreislauf", d:"Seit v712: Was du im Tagebuch als Konsequenz notierst, steht beim nächsten Training im Trainingsplan unter „🎯 Vorgenommen“ – mit bis zu drei passenden Übungen aus der Bibliothek. Nach dem Training fragt „Wie war's?“, ob es gewirkt hat: geklappt (hakt die Konsequenz ab), teilweise oder noch nicht (bleibt stehen). „Gilt dauerhaft“ bleibt immer stehen. Im Tagebuch und im Export für den Lehrgang steht die Wirkung hinter der Konsequenz – Beobachtung, Maßnahme, Wirkung.", go:"tagebuch"},
    {t:"Wer bekommt Push?", d:"Seit v711 unter Eltern & Kinder → Eltern verwalten: wie viele Familien Benachrichtigungen bekommen, welche ein Konto haben, aber Push aus, und welche noch gar kein Elternkonto. „Anleitung an die Eltern teilen“ schickt eine Anleitung ohne Namen, z. B. in die WhatsApp-Gruppe. Nur das Trainerteam sieht die Liste.", run:"pushAbdeckungOpen()"},
    {t:"Rückmelde-Verhalten", d:"Seit v672 unter Eltern & Kinder → Eltern verwalten: je Kind, getrennt nach Spieltagen und Training, wie lange vor Terminbeginn im Schnitt die erste Antwort kam, wie oft unter 24 Stunden vorher, wie oft sich die Familie umentschieden hat (auch „zu → ab“) und bei Spieltagen, wie oft gar keine Antwort kam. Gezählt je Kind – egal, welches Elternteil antwortet. Umentscheidungen zählen erst seit dem 29.09.2026, vorher wurden sie nicht gespeichert; Änderungen durch das Trainerteam zählen nicht. Nur das Trainerteam sieht diese Zahlen, Eltern nicht.", run:"rueckmeldeStatistikOpen()"},
    {t:"Team-Ansage", d:"Wichtige Info an alle Eltern – mit Gelesen-Status (wer fehlt noch?).", run:"ansageTrainerOpen()"},
    {t:"Nest-Ausgaben", d:"<b>Seit v733</b> erscheint das Adler Nest nach jedem Spieltag als eigene, nummerierte Ausgabe – nur in der App (Eltern, Kinder-Konten, Trainerteam), nicht mehr über einen öffentlichen Link. „Neue Ausgabe erfassen“, Spieltag wählen, Texte eintragen oder den Entwurf aus dem Projekt-Chat gegenlesen. <b>Bilderstrecke:</b> 4 bis 6 Fotos aus der Galerie des Spieltags antippen (mehr als 6 geht nicht). <b>Uploads:</b> Titelbild (Maskottchen), Hördatei als MP3 (die Dauer liest die App selbst) und bis zu 2 Privatfotos für das Porträt – nur mit dem Häkchen „Familie ist einverstanden“. <b>Porträt:</b> Kind wählen (der Vorschlag „dran ist reihum“ bleibt), Antworten aus dem Kabinen-Reporter direkt hier freigeben – ins Heft kommt nur Freigegebenes; den Spitznamen nur mit Häkchen; der Grund für die Rückennummer erscheint nie. Spieltagskarte, Teams, Kapitäne und Ergebnis liest die App selbst aus Termin, Teameinteilung und Ticker. Die Quellen zu „An diesem Tag“ sehen nur Trainer. „👁 Vorschau“ zeigt die Ausgabe so, wie Eltern sie sehen; „Veröffentlichen“ fragt nach, meldet die Ausgabe auf der Eltern-Startseite und merkt sich das Porträtkind für den Reihum-Vorschlag. <b>Porträt-Ablauf (seit v734)</b> – oben die Karte „🪺 Nächstes Porträt“: Nach dem Spieltag Kind und kommenden Spieltag bestätigen (die App schlägt vor, wer am längsten nicht dran war). Dann bekommen die Eltern den Porträt-Bogen (Fan-Fakten, bis zu 2 Fotos, Pflichthäkchen „einverstanden“) mit Frist Mittwoch 20 Uhr, das Kind in der Kabine den Hinweis auf die Porträtfragen, jeder Trainer am Montag den Hinweis auf seine Stichpunkte (Frist Freitag 20 Uhr). Erinnert wird genau einmal: Eltern nach Mittwoch 20 Uhr, wenn der Bogen fehlt; Trainer ohne Stichpunkte am Freitagmorgen. Die Ampel zeigt Bogen, Antworten des Kindes und Trainerstimmen. Die Trainerstimmen sehen nur Trainer. „Bei (fast) jedem Training dabei“ steht nur da, wenn die Anwesenheitsliste die Schwelle erreicht (Standard 90 %, mindestens 6 erfasste Trainings; einstellbar in der Karte) – sonst kein Wort dazu. Privatfotos übernimmst du in der Ausgabe aus dem Bogen; zieht die Familie das Einverständnis zurück, verschwinden sie auch aus dem Heft. <b>Seit v735</b> steht vor „Auf geht's, Adler!“ die Karte „Die Mannschaftskasse unterstützen“ mit dem Adler-Kasse-Link – nur für Eltern und Trainer, nie in der Kabine und nicht im Druck; ohne Link erscheint nichts.", run:"nestEditorOpen()"},
    {t:"Stärken und Torwart auf der Spielerkarte", d:"<b>Seit v757</b> wählst du im Kinderprofil unter <b>🏅 Stärken auf der Karte</b> bis zu drei Kategorien aus (Pass-Meister, Torjäger, Teamplayer …). Sie stehen auf der Karte des Kindes bei Kind, Eltern und in der Team-Galerie; ohne Auswahl rechnet die App sie wie bisher aus der Einschätzung. „Auswahl löschen“ geht zurück zur Berechnung. Das gelbe <b>TORWART</b>-Thema mit den Handschuhen trägt nur noch, wer unter „Fußball“ als <b>Torwart 1. Wahl</b> eingetragen ist; „Kann ins Tor“ und „Torwart 2. Wahl“ bleiben Feldspieler-Karten und stehen weiter in der Torwart-Liste beim Spieltag."},
    {t:"Adler Nest als PDF und Hörlink", d:"<b>Seit v756</b> (nur Trainerbereich): Im Editor einer Ausgabe unter „Teilen“ erzeugt <b>📄 PDF herunterladen</b> das Heft als PDF im Format <b>DIN A4 hoch</b> (seit v763, höchstens fünf Seiten, Deckblatt randlos, Fußzeile „Seite X von Y“) – es öffnet den Druckdialog des Geräts, dort „Als PDF sichern“; am Handy passt sich die Ansicht der Breite an; die Datei heißt <i>Adler-Nest_Ausgabe-NN</i>. Das PDF enthält Fotos und Vornamen: nur an Familien weitergeben. Statt des Players trägt das Deckblatt einen antippbaren <b>Link mit QR-Code zur Hörseite</b> (ohne Login, 30 Tage gültig). Im Editor siehst du Ablaufdatum, kannst den Link kopieren, <b>erneuern</b> oder <b>zurückziehen</b>; zurückgezogene Links wirken nach höchstens 10 Minuten nicht mehr. Aus einem Entwurf entsteht ein PDF mit dem Vermerk „Entwurf“ und ohne Link. <b>Seit v762</b> kannst du bei einer veröffentlichten Ausgabe unter „Teilen“ das Häkchen <b>„Eltern dürfen das PDF … speichern“</b> setzen: Dann sehen Eltern (nicht Kinder) am Ende der Leseansicht <b>📄 Als PDF speichern</b>. Ihr PDF hat keinen Hör-Link – den gibt es nur im Trainerbereich. Standard ist aus."},
    {t:"Adler Nest", d:"Digitales Stadionheft erstellen & drucken. <b>Seit v732 „Adler im Porträt“:</b> jede Woche wird reihum ein Kind vorgestellt – der Editor schlägt vor, wer dran ist (noch nie oder am längsten nicht im Porträt). „✨ Porträt-Entwurf“ schreibt aus den Fan-Fakten der Eltern und den Antworten im Kabinen-Reporter einen kurzen Text. An die KI gehen keine Namen (das Kind heißt dort „Kind A“, andere Kinder „ein Mitspieler“, kein Spitzname), freie Reporter-Antworten nur, wenn du sie freigegeben hast. Den Vornamen setzt die App ein; du liest, änderst und speicherst – erst dann steht er im Heft. Beim Veröffentlichen merkt sich die App, wer in welcher Woche dran war.", run:"stadionheftOpen()"},
    {t:"Eltern-Bereich", d:"Eltern melden sich mit E-Mail und Passwort an (alternativ Einmal-Code per Mail): Zu- und Absagen, Karte, Quiz, Betreuung vor Ort. Neue Passwörter – bei Eltern und Trainern – brauchen mindestens 10 Zeichen mit Buchstaben und Ziffern; ältere, kürzere gelten zum Anmelden weiter."},
    {t:"Wer hilft mit? freigeben", d:"Seit v662 sehen Eltern bei einem Termin nur die Helfer-Aufgaben, die du freigibst: im Termin bearbeiten unter „Wer hilft“ anhaken und daneben eintragen, wie viele Helfer du brauchst. Zur Auswahl stehen Funino-Tore, Jugendtore, Aufbau (bei Auswärtsspielen nicht), Abbau, Betreuung, Live-Ticker und Fotos, dazu zwei eigene Aufgaben mit freiem Text. Eltern sehen „x von n“; ist eine Aufgabe voll, kann sich niemand mehr eintragen. Ohne Freigabe erscheint bei den Eltern gar nichts. Bei einem Auswärtsspiel steht dort seit v708 nur „Wer betreut die Kinder mit?“ – die Betreuung mit Anzahl und ein Hinweis; aufgebaut, getickert und fotografiert wird beim Gastgeber."},
    {t:"Geburtstage und Elternangaben", d:"Seit v660 steht auf der Startseite eine Karte mit allen, die in den nächsten 14 Tagen Geburtstag haben – Kinder aus dem Kader und Eltern, die ihren Geburtstag unter „Meine Angaben“ eingetragen haben (bei Eltern ohne Alter). Eltern tragen dort auch Vor- und Nachname, Handynummer und den Geburtstag ihres Kindes ein; „Erste Schritte“ erinnert sie daran, bis alles ausgefüllt ist. Die Angaben sehen nur das Elternteil selbst und das Trainerteam, und sie stehen in der Sicherung."},
    {t:"Wer ist dabei? (Spieltag)", d:"Oben auf der Spieltag-Seite: die Rückmeldungen der Eltern zum nächsten Spieltag – wer zugesagt, abgesagt oder krank gemeldet hat und wer noch nicht geantwortet hat. Zusagen stehen im Match automatisch auf „Dabei“ und werden auf die Teams verteilt; wer nicht dabei ist, steht in keinem Team. Mit „Wer kommt? – ansehen und ändern“ auf der Karte „Nächster Spieltag“ änderst du jedes Kind von Hand (Dabei, Nicht, Verletzt) – deine Entscheidung gilt vor der Eltern-Rückmeldung.", run:"go('spieltag')"},
    {t:"Wer ist dabei? (Training)", d:"Unter Training → Anwesenheit seit v687 in drei Schritten: ① Termin, ② welche Trainer da waren, ③ welche Kinder – darüber zählt die App mit („✓ 14 da · 1 fehlt“), der Knopf „Anwesenheit speichern · 14 da“ nennt dieselbe Zahl, „Alle da“ steht nur, wenn jemand fehlt. Ein Training gilt als zugesagt. Bis die Anwesenheit gespeichert ist, zählen Trainingsplan, Gruppen, „Diese Woche“ und die Anwesenheit selbst dieselben Kinder: <b>alle außer Absagen</b>. In der Anwesenheit sind sie vorbelegt (Hinweis „noch nicht gespeichert“, abgesagte Kinder tragen „abgesagt“) – Fehlende abwählen und speichern. Ausdrückliche Zusagen stehen als Zahl im Trainingsplan."},
    {t:"Elternbeirat & Kasse", d:"Unter „Eltern & Kinder → Elternbeirat & Kasse“ trägst du ein, wer aus der Elternschaft eine Aufgabe übernommen hat (z. B. Elternbeirat, Kassenwart) und wie hoch der Beitrag zur Mannschaftskasse ist. Die Eltern sehen das im Eltern-Bereich unter „Mehr vom Team“ als Karte „Ansprechpartner im Team“. Nur eintragen, wer einverstanden ist – alle Eltern der Mannschaft sehen es. Gezahlt wird weiter außerhalb der App.", run:"elternTeamEditOpen()"},
    {t:"Einladungskarten", d:"Je Kind eine Karte mit QR-Code, vier pro A4-Seite. Die Eltern scannen, legen E-Mail und Passwort fest und sind sofort angemeldet – kein Mailversand, kein Eintragen der Adresse vorab. Eine Karte gilt für zwei Elternteile und bis zum gewählten Datum; neu drucken macht die alte Karte des Kindes ungültig. <b>Seit v658 geht es auch ohne Papier:</b> Nach „Karten erzeugen“ steht je Kind „Link kopieren“ – den Link schickst du im persönlichen Chat (nie in die Gruppe), er wirkt genau wie die Karte. Die Links gibt es nur in diesem Fenster; gedruckt wird erst mit „Karten drucken“.", run:"einladungskartenOpen()"},
    {t:"Adler-Welt-Hub", d:"Federn je Kind, Spielerkarten, Technik-Abzeichen und Wochen-Challenge an einem Ort. 🃏 zeigt die Spielerkarte des Kindes auch ohne Bewertung – Name, Nummer, Foto und Zähler; die Stärken kommen dazu, sobald bewertet ist. Eltern holt ihr über die Einladungskarten (Eltern & Kinder → Eltern verwalten) in die App.", run:"adlerWeltOpen()"},
    {t:"Federn-Stichtag", d:"In „Team-Quests verwalten“ steht „Federn zählen ab“. Quiz-Federn zählen immer. Training, Serien, Zusagen, Missionen, Album und Abzeichen zählen erst ab diesem Tag – auf der Karte, in der Übersicht und im Team-Level, das ab dem Stichtag ganz neu zählt. Gelöscht wird nichts; ein Anlass von vorher bringt auch nachträglich keine Federn. Feld leeren heißt: alles zählt wieder."},
    {t:"Federn – wofür es sie gibt", d:"Automatisch: Training anwesend 15 (beim Speichern der Anwesenheit), Serien 25 (3, 5, 8, 12, 16 und 20 Trainings in Folge), Zusage zum Termin 5 (Eltern), Packliste am Vorabend gepackt 5 (Kabine), Sammelalbum halb und voll je 25 (Kabine), Kinder-Quiz 10 (einmal am Tag), Wissensquiz 2 je Frage, Wochen-Challenge 20, Technik-Abzeichen 10 (zuhause abgehakt), Skill der Woche 50 (Eltern bestätigen), Entwicklungsziel erreicht 30 (Trainer), Trikotwäsche 100 (je Waschtermin), Fairplay-Quiz der Eltern 50 (einmal). Team-Quests: wenn das Team alle Quests eines Spieltags schafft, bekommt jedes mitspielende Kind die eingestellte Zahl (Standard 20). Einstellen: „Eltern & Kinder“ → „Team-Quests“ – dort stehen Team-Quest-Federn, der Doppel-Booster (72 Stunden alles doppelt), „Federn zählen ab“ (Karten und Team) und „Team-Level jetzt auf Null“ (nur das Team). Seit v675 frei: „Eltern & Kinder“ → „Federn vergeben“ – 1 bis 100 je Kind ans ganze Team oder an einzelne Kinder, mit Grund, den die Kinder zwei Wochen lang oben in der Kabine sehen. Die Federn je Kind stehen in „Adler-Welt“."},
    {t:"Kabinen-Wahl", d:"Die Kinder stimmen ab (Song, Motto, Spielform) – du legst die Optionen fest.", run:"wahlTrainerOpen()"},
    {t:"Unsere Regeln", d:"Der Fairplay-Codex spricht die Eltern an. Das hier ist sein Gegenstück für die Kinder: höchstens sechs kurze Sätze, die ein Achtjähriger aufsagen kann – in der Kabine unter „Team & Spaß“. Positiv formulieren statt verbieten, und lieber einen Satz ausblenden als einen siebten dazuschreiben; mehr merkt sich niemand. Änderungen gelten sofort für alle Kinder. Ohne Netz zeigt die Kabine die sechs mitgelieferten Sätze.", run:"codexKinderEditOpen()"},
    {t:"Album-Karten-Fotos", d:"Bilder für die Trainer- und Vereins-Sticker im Panini-Sammelalbum.", run:"albumFotosOpen()"},
    {t:"Urkunden-Studio", d:"Saison-Urkunden für alle Kinder in einem Druck + freie Anlass-Urkunde.", run:"urkundenOpen()"},
    {t:"Quiz (Kinder)", d:"Kinder spielen über den Kids-Link (?quiz); Ergebnisse unter Eltern & Kinder → Quiz-Ergebnisse.", go:"quizresults"},
    {t:"Kinder-App", d:"Die Kabine gibt es seit v592 auch als eigene App auf dem Gerät des Kindes – eigenes Symbol, eigener Name, eigene Installation, unter <b>/kinder/</b>. Koppeln tun die <b>Eltern</b>, nicht du: Sie erzeugen in ihrem Bereich unter „Für die Kinder“ einen sechsstelligen Code, das Kind tippt ihn auf seinem Gerät ein, fertig. Den Weg zur Kinder-App bekommen sie dort gleich mit: QR-Code zum Abscannen, „WhatsApp“ und „Link kopieren“ – nur den Link, der Code bleibt auf ihrem Bildschirm. Das Gerät bekommt dabei ein Konto <b>ohne Namen und ohne E-Mail</b>; was das Kind sehen darf, entscheidet die Leseregel der Datenbank, nicht die Oberfläche. Die tägliche Appzeit stellen ebenfalls die Eltern ein (0 bis 180 Minuten); gezählt wird sie auf dem Server, ein Neustart der App dreht nichts zurück, und ist sie auf, zeigt das Gerät einen Schluss-Bildschirm ohne Bedienelement. Trennen können die Eltern jederzeit – das Gerät verliert sofort alle Rechte. Für dich: unter Orga → Nutzung steht, wie viele Geräte gekoppelt sind, als reine Zahl ohne Namen. Die Kabine im Eltern-Bereich bleibt daneben bestehen. Seit v659 erscheint nach längerer Pause beim Öffnen kein Code-Bildschirm mehr – die App erneuert zuerst ihre Anmeldung. Kommt der Code-Bildschirm trotzdem, ist das Gerät wirklich entkoppelt.", run:"nutzungOpen()"},
  ]},
  {cat:"📅 Orga", items:[
    {t:"Nutzung", d:"Welche Bereiche, Kacheln und Aktionen in den letzten 7, 30 oder 90 Tagen wirklich benutzt wurden – und welche Kacheln gar nicht. Grundlage fürs Ausmisten. Keine Kindernamen, nur Ereignisse.", run:"nutzungOpen()"},
    {t:"Trainerplan", d:"Alle kommenden Trainings, Spiele und Turniere als Tabelle: Termine untereinander, der Trainerstab als Spalten, ein Tap je Zelle wechselt zwischen dabei ✓, unsicher ?, nicht dabei ✕ und keine Antwort. Der Balken links zeigt die Zahl der Zusagen – rot keine, orange eine, hellgrün zwei, dunkelgrün ab drei. Er bewertet nicht, er zählt: ob ein Termin damit läuft, entscheidet ihr. Der Filter „Höchstens eine Zusage“ zeigt nur die Termine, bei denen noch wenig steht. Unterschied zu „Bist du dabei?“ auf der Startseite: dort beantwortest DU deine Termine, hier siehst du das ganze Team.", run:"trainerPlanOpen()"},
    {t:"Termine", d:"Oben „Neuer Termin“, darunter die Termine; Trainerplan und Grillhütte stehen seit v683 als Kacheln unter der Liste. Das Formular zeigt nur, was zum Typ gehört: eine Treffzeit gibt es bei Spiel, Turnier und Event (bei Spielen −45 Min. vom Anpfiff vorgeschlagen) – beim Training kommen ohnehin alle zur Trainingszeit. „Wiederholen“ steht beim Event, weil Spiele und Turniere jedes Mal andere sind. Unter „Wer hilft“ sagst du, was die Eltern übernehmen sollen: beim Training die Anzahl Funino-Tore und Jugendtore (leer = ohne Zahl anbieten, 0 = wird nicht gebraucht), dazu bei jedem Typ ein freier Hinweis. Das steht im Eltern-Bereich als Beschreibung unter der Aufgabe – ohne sie trägt sich niemand ein. Unter „📣 Für die Eltern“ steht die Platz-Ampel: 🟢 Findet statt / 🔴 Fällt aus. Ein abgesagter Termin trägt ab sofort überall ein rotes Schild „Fällt aus“ (mit deinem Grund, wenn du einen einträgst) – auf der Terminkarte, in der Liste, in „Diese Woche“ und im Eltern-Bereich. Gleichzeitig verschwinden seine Aktionen: kein Plan, keine Teams, keine Anwesenheit, und „Bist du dabei?“ fragt nicht mehr danach; die Kachel oben springt zum nächsten Termin, den es wirklich gibt. Zurücknehmen geht mit 🟢 Findet statt. Spiel und Turnier: Heim oder Auswärts, Spielform mit Mehrfachwahl (FUNiño, 3+1, 4+1, 5+1 – auswärts bietet der Gastgeber oft zwei an), voreingestellt FUNiño + 3+1. Auswärts entfällt die Spielfeld-Aufteilung. Die Adresse sucht „Finden“ (OpenStreetMap) – nach dem Getippten und nach dem Verein aus dem Titel; kennt die Karte die Hausnummer nicht, bleibt die getippte stehen. Steht die Adresse schon richtig da, braucht es „Finden“ nicht. Dazu: anlegen/bearbeiten · Endzeit (danach automatisch ins Archiv) · Platz · Trainer-Verfügbarkeit · Wetter · Ferien-Warnung.", go:"termine <b>Seit v741</b> sagst du Termine direkt im Termin ab (oben „🔴 Fällt aus“, darunter ein Grund für die Eltern) und mehrere auf einmal über „🏖️ Ferien &amp; Zeitraum absagen“ über der Terminliste: Ferien antippen oder Von/Bis wählen, die Trainings sind abgehakt, der Grund (z. B. „Herbstferien“) ist vorbelegt – ein Tipp sagt alle ab, und auf demselben Weg nimmst du Absagen zurück. Eine Mitteilung aufs Handy geht dabei nicht raus; die Eltern sehen „🔴 Fällt aus“ mit Grund in jeder Terminliste und brauchen nicht zurückzumelden. Im Kalender-Abo stehen abgesagte Termine als abgesagt."},
    {t:"Gegner-Datenbank", d:"Adresse, Ansprechpartner, Telefon/WhatsApp, bisherige Spiele.", run:"gegnerManageOpen()"},
    {t:"Pinnwand", d:"Oben die Team-Notizen fürs Trainerteam, darunter die Schwerpunkt-Abstimmung und die Team-Übersicht (letzte Einheit, Anwesenheit). Die Datensicherung steht seit v683 unter Orga · Einstellungen.", go:"team"},
    {t:"Wie war's? – einmal erzählen", d:"Seit v679: Nach einem Termin, für den du zugesagt hattest, steht auf der Startseite „Wie war's?“ mit einem großen Knopf „Erzählen“. Er öffnet die Nachbereitung mit laufendem Mikrofon. Erzähl, so lang du willst, dann „KI-Auswertung“: Die KI trägt die Bewertung ein, sortiert deine Worte zu einem Tagebuch-Vorschlag und sammelt, was zu tun ist – alles aus einer Notiz, in einem Aufruf, und sofort gespeichert. Danach eine Karte mit allem: Bewertung, Beobachtung, Aha, bis zu zwei Konsequenzen, To-dos. Das Aha steht nur da, wenn du selbst gesagt hast, was dir klar wurde – sonst fragt die KI nach („Was wurde dir dabei klar?“); deine Antwort, getippt oder eingesprochen, kommt wörtlich ins Feld. Das Datum tippst du an: die nächsten drei Termine, an denen du dabei bist, oder „anderes Datum“. „Passt so“ bestätigt alles. Keine Zeit? „Später“ – der Vorschlag wartet als „Noch zu bestätigen“. Bewerten zwei Trainer denselben Tag, zeigt die Einheit die Spanne („Spaß ★3–4“), jeder behält seine Bewertung und seinen eigenen Tagebuch-Vorschlag, und Kinder-Sterne des anderen bleiben stehen. Korrekturen zum selben Termin zählen nicht noch einmal ins Tageslimit der KI."},
    {t:"Tagebuch", d:"Das Trainertagebuch für den DFB-Basis-Coach – deine persönliche Unterlage, nicht die des Teams. <b>Seit v701:</b> Eine Konsequenz hat eine Frist oder „gilt dauerhaft“ (Grundsatz, keine Aufgabe) – dauerhafte stehen nicht in der Wiedervorlage. Auf der Prüfkarte steht das Aha oben, weil es das Feld ist, das dir gehört. Nach einem Termin, für den du zugesagt hast, kommt „💬 Wie war's?“ aufs Handy (einmal danach, höchstens einmal am Folgetag; seit v705 nach deiner eigenen Ruhezeit, für Trainer ohne eigene Wahl keine); ein Tipp öffnet direkt die Aufnahme. Sechs Felder je Eintrag: Auslöser und Beobachtung sind vorausgefüllt, sobald der Eintrag aus einer Nachbereitung entsteht; Aha und Konsequenz tippst du selbst, und ohne die beiden wird nicht erfasst – ein Eintrag, der sich von allein schreibt, enthält keine Erkenntnis. Dazu optional ein Datum für die erste Umsetzung, ein Beleg und ein Anschluss. Jeder Eintrag gehört zu einem der vier Bausteine des DFB-Entwicklungsmodells (Ich als Trainer, Spiel & Spieler, Organisation, System Fußball); die Liste gruppiert danach und sagt ruhig Bescheid, wenn in einem Baustein seit mehr als drei Wochen nichts steht. Der Weg hinein: nach dem Speichern einer Einheits-Nachbereitung oder eines Spiel-Fazits fragt die App, ob ein Eintrag daraus werden soll – oder hier über „Neuer Eintrag“ für alles außerhalb der App, etwa einen Präsenztag. In der App stehen die Vornamen der Kinder – das Tagebuch sehen nur Trainer, und „Kind einfügen“ schreibt den Vornamen. <b>Nach außen</b> (Kopieren, Teilen, Monatsexport – die Fassung für Lehrgang und Verband) ersetzt die App jeden Namen durch einen Buchstaben („Kind C“, immer dasselbe Kind) und schreibt oben dazu, warum. Ausgabe als Markdown, ohne Zugangsdaten und ohne Umweg über einen Server. <b>Seit v679 ein Arbeitsmittel:</b> <b>💭 Gedanke</b> (Orga → Notizen oder hier) – ein Feld, erfassen, fertig; er wird ein <b>Keim</b>. Ein Keim braucht nur Text, bekommt keine Warnung und zählt beim Hinweis „seit drei Wochen nichts notiert“ nicht mit; oben steht, wie viele Gedanken auf eine Konsequenz warten. Ausarbeiten heißt: Baustein, Aha und Konsequenz ergänzen – dann ist er fertig. Auch ein Eintrag ohne Aha wird so erfasst, als Keim, statt abgelehnt. Konsequenzen haben je ein Datum; <b>Wiedervorlage</b> zeigt alle offenen, überfällig · diese Woche · später, und ein Punkt verschwindet erst, wenn du ihn abhakst – verstrichen ist nicht erledigt. Dort stehen auch die To-dos aus den Nachbereitungen, mit einem Vorschlag, wer zuständig sein könnte (nie zugewiesen). <b>Je Kind</b> bündelt alle Einträge, in denen du ein Kind unter „Wer kommt vor?“ markiert hast; neben dem Vornamen steht sein fester Buchstabe – derselbe wie im Kader und in jedem Export, auch wenn andere Kinder den Kader verlassen. Unter „Monat ausgeben“ wählst du die Ausgabe: <b>Lehrgang</b> (die sechs Felder, nur fertige und bestätigte Einträge, ohne Schlagworte) oder <b>Arbeitsfassung</b> (alles, auch Gedanken, Fristen und To-dos); die C-Lizenz folgt. Jede Ausgabe nennt Kinder nur mit Buchstaben. Das Tagebuch zeigt deine eigenen Einträge – jeder Trainer führt seines.", go:"tagebuch"},
    {t:"Trainermeeting", d:"Seit v527 eine eigene Terminart: Du legst ihn wie jeden anderen Termin an („🗓️ Meeting“). Anders als bei den anderen Terminarten fragt das Formular nicht nach einem festen Datum, sondern nach <b>Vorschlag 1 bis 3</b> – Vorschlag 1 steht bis zur Entscheidung als vorläufiges Datum im Kalender, erkennbar an „Termin steht noch nicht“. Nach dem Anlegen geht es direkt weiter, und aus dem Termin heraus laufen beide Teile. <b>Wer kann wann:</b> weitere Vorschläge eintragen, das Trainerteam stimmt ab (✓ passt · ? vielleicht · ✗ nicht), und der Vorschlag, bei dem niemand abgesagt hat und die meisten zugesagt haben, wird als „Hier können alle“ hervorgehoben. Wer noch gar nicht geantwortet hat, steht mit Namen dabei – drei Zusagen bei fünf Trainern heißen eben nicht, dass zwei abgesagt haben. Solange deine Stimme fehlt, erinnert dich die Startseite. <b>Was wir besprechen:</b> Themen können alle Trainer sammeln, und zwar von Anfang an, nicht erst wenn der Termin steht. Beim Abhaken fragt die App, was entschieden wurde; der Satz bleibt unter dem Thema stehen. Schreiben kannst du ihn auch später nachtragen – gefragt wird, aber nicht erzwungen, sonst hakt am Ende niemand mehr ab. Was offen blieb, wandert beim nächsten Meeting von selbst mit. Das Protokoll (Besprochenes mit Beschluss, dann das Offene) gibt es als Markdown über Teilen. <b>Wichtig:</b> Diesen Termin sehen nur Trainer. Das erzwingt die Leseregel der Datenbank, nicht ein Filter in der App – alle anderen Terminarten sind für jeden lesbar, auch ohne Anmeldung, weil Turnierseite und Stadionheft davon leben. Die Kachel „Meetings“ unter Orga bleibt als Übersicht über alle Meetings.", run:"trainerMeetingOpen()"},
    {t:"Saisonstart-Check", d:"Sieben Schritte für den Übergang in die neue Saison – Wrapped, Urkunden, Kader, Trainings-Serie, Material zählen, Eltern-Einladung, Ansage. Er steht Juni bis September im Orga-Menü; mit „Saisonstart abschließen“ blendest du ihn bis zur nächsten Saison aus. Von hier aus geht er immer auf.", run:"saisonStartOpen()"},
    {t:"Teamkasse", d:"<b>Seit v699</b> sehen alle Eltern die Kachel „💰 Mannschaftskasse“: Kassenstand, Einnahmen und Ausgaben, jede Bewegung mit Datum, Kategorie und Zweck – abgehakte Beiträge zählen automatisch als Sammelposten ohne Namen. Die Kasse bucht in der Kachel „🧾 Kasse führen“ (Trainer: diese Teamkasse) mit Datum, Kategorie und optionalem Beleg (Foto oder PDF, sehen nur Kasse und Trainerteam; seit v746 bleibt ein Foto vollständig – auch ein langer Kassenbon wird nicht mehr quadratisch abgeschnitten), kann jede Bewegung bearbeiten; im Zweck bitte keine Namen von Kindern oder Familien. Eine Umlage mit Zahlungen wird nur noch deaktiviert, nicht gelöscht. Kassenstand, Buchungen und Umlagen (z. B. 40 € pro Saison). Unter „Wer hat bezahlt“ hakst du je Kind ab, was angekommen ist; die Eltern sehen nur den Stand ihres eigenen Kindes. „Offene erinnern“ schickt einmal am Tag eine Mitteilung an Familien mit offenem Betrag, „Export“ erzeugt eine CSV für die Kassenprüfung. <b>Seit v664</b> kann ein Elternteil die Kasse führen: unten unter „Wer führt die Kasse“ auswählen – es findet sie dann im Eltern-Bereich unter „Mehr vom Team → Kasse verwalten“. Seit v698 pflegt die Kasse auch den Fan-Spendenlink (Adler-Kasse). <b>Seit v735</b> lässt sich jede Umlage mit ✏️ ändern (Titel, Betrag, fällig, PayPal.Me-Link); ändert sich der Betrag einer Umlage mit Häkchen, fragt die App vorher und nennt, um wie viel sich der Kassenstand ändert. Den PayPal.Me-Link findest du in der PayPal-App unter Einstellungen → PayPal.Me; er darf mit oder ohne https:// eingefügt werden, andere Adressen nimmt die App nicht an; ein Betrag hinter dem Namen (paypal.me/Name/40) ist erlaubt. Der Adler-Kasse-Link erscheint seit v735 auch im Adler Nest (Karte „Die Mannschaftskasse unterstützen“, nicht in der Kabine). Beiträge bitte nur unter „Wer hat bezahlt“ abhaken und nicht zusätzlich als Bewegung „Beiträge“ erfassen – sonst zählen sie im Kassenstand doppelt. Kein Geld in der App: gezahlt wird außerhalb.", run:"kasseOpen()"},
    {t:"Fundbüro", d:"Liegengebliebenes verwalten.", run:"fundbueroOpen()"},
    {t:"Material", d:"Der Bestand des Teams: Bälle, Hütchen je Farbe, Markierungen, Leibchen, Trinkflaschen, Erste-Hilfe-Set. Je Posten ein <b>Soll</b> (was da sein sollte) und ein <b>Ist</b> (was gezählt wurde). Beide dürfen leer bleiben – leer heißt <b>nicht gezählt</b>, nicht „null Stück“; nur so lässt sich eine Inventur überhaupt abschließen. Jede eingetragene Ist-Zahl setzt das Zähldatum dieses Postens auf heute; oben steht, wann zuletzt überhaupt gezählt wurde, und nach einem halben Jahr wird die Zeile gelb. Liegt ein Posten unter dem Soll, sagt die Zeile, wie viele fehlen. Kleidung wird nicht doppelt gezählt: bei „Trikotsätze“ und „Spieltagsjacken“ steht daneben, wie viele davon gerade bei den Kindern sind (aus „Ausstattung“ unter Team). Neue Posten legst du über „＋“ selbst an. Gezählt wird am besten zweimal im Jahr – der Saisonstart-Check erinnert daran.", run:"materialOpen()"},
    {t:"Ausstattung", d:"Was hat welches Kind von uns bekommen? Oben wählst du den Gegenstand – Trikotsatz FRMD PASN, Präsentationsanzug, Spieltagsjacke –, darunter steht der Kader. Ein Tipp auf das Kästchen setzt die Ausgabe auf heute, rechts daneben trägst du die Größe ein (128, 140, 152 als Vorschlag, frei überschreibbar). Eine Satznummer führen wir nicht: die Nummer am Kind ist die Trikotnummer, und die steht im Kader. Über „↩︎ zurück“ wird eine Rückgabe mit heutigem Datum vermerkt – dafür ist die Liste am Ende da, wenn ein Kind den Verein wechselt. Weitere Gegenstände (Trinkflasche, Rucksack, zweiter Anzug) legst du über „＋“ selbst an; die App muss dafür nicht angefasst werden. Gespeichert wird sofort beim Antippen. Die Zeile oben zählt, wer noch nichts hat.", run:"ausstattungOpen()"},
    {t:"Adresse der App", d:"Die App liegt seit dem 10.09.2026 unter sv-adler-dellbrueck.github.io/u9-app/ – vorher stand in jedem weitergegebenen Link ein privater Benutzername. Die alte Adresse leitet weiter, verschickte Turnier-, Ticker-, Einladungs- und Kind-Links funktionieren also unverändert. Wer die App noch von der alten Adresse auf dem Startbildschirm hat, landet jedes Mal erst auf der Weiterleitung – der Einflug des Wappens ist dann schon halb vorbei. Abhilfe: das alte Symbol löschen und die App unter der neuen Adresse neu ablegen, dann neu anmelden und Benachrichtigungen wieder erlauben. Den Hinweis in der App selbst gibt es seit v617 nicht mehr."},
    {t:"Updates der App", d:"Seit v655 holt sich die App neue Versionen selbst – niemand muss sie neu installieren. Sie sieht nach, sobald sie wieder in den Vordergrund kommt, und alle 30 Minuten, solange sie offen ist. Ist eine neue Version da, lädt sie im passenden Moment neu: in der ersten Minute nach dem Öffnen sofort, sonst beim nächsten Wechsel weg von der App oder nach 10 Minuten ohne Eingabe. Nie, solange etwas verloren ginge – ein offenes Fenster, Text in Arbeit, die laufende Match-Uhr, der Stationstimer oder ein Diktat. Bis dahin steht unten „🔄 Neue Version bereit“ mit dem Knopf „Neu laden“. Welche Version läuft, steht ganz unten auf der Startseite. Wer noch eine Fassung von vor v655 offen hat, lädt einmal von Hand neu; danach geht es von selbst."},
    {t:"Zurück-Taste am Handy", d:"Seit v624 geht die Zurück-Taste eine Seite zurück, statt die App zu schließen: Ist ein Fenster offen, schließt sie zuerst das Fenster; sonst führt sie zur Seite davor und zuletzt zur Startseite. Erst von der Startseite aus schließt sie die App. Das gilt im Trainer-Bereich, im Eltern-Bereich und auf den geteilten Seiten wie dem Festival-Link (Anfahrt, Regeln, „Am Rand“). In der Kabine führt sie zur Kabinen-Startseite – verlassen lässt sich die Kabine weiter nur mit dem Ausgangs-Code."},
    {t:"Datensicherung", d:"Alle Tabellen der App als JSON-Datei – seit v683 als Kachel „Datensicherung“ unter Orga · Einstellungen (vorher im Kader und auf der Pinnwand). Enthält personenbezogene Daten der Kinder: nur auf eigenem, gesperrtem Gerät speichern.", run:"backupExport()"},
    {t:"Dark Mode", d:"Hell/Dunkel umschalten.", run:"toggleTheme()"},
    {t:"Schriftgröße", d:"Oben neben 🌙 steht „A“: ein Tipp macht die Schrift größer – Normal, Groß (A+), Sehr groß (A++), dann wieder Normal. Die Wahl gilt nur auf diesem Gerät und bleibt, bis du sie änderst; die anderen im Trainerteam sehen die App weiter wie gewohnt. Die Zeilen brechen dabei um, statt wie beim Zoomen mit zwei Fingern seitlich aus dem Bildschirm zu laufen. Die untere Leiste behält ihre Größe. Dasselbe gibt es in der Eltern-App. Die Kabine der Kinder und die öffentlichen Seiten (Ticker, Stadionheft, Turnier) bleiben, wie sie sind. Einmal je Gerät erscheint auf der Startseite eine kleine Karte mit „Größer stellen“ – so finden auch die anderen den Knopf. (Seit v632)", run:"schriftWechseln()"},
  ]},
];
function hilfeOpen(){
  document.getElementById("hilfe-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="hilfe-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Hilfe & Funktionen");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10040;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("hilfe-modal","❓","Hilfe & Funktionen","Alles, was die App kann – tippe auf → zum Hinspringen","#475569")}
    <button class="btn btn-p btn-sm" style="width:100%" onclick="hilfeClose();tourStart()"><i class="ti ti-player-play"></i>Geführte Tour starten</button>
    <input type="text" placeholder="Suchen… (z. B. Wetter, Aufstellung)" oninput="hilfeRender(this.value)" style="width:100%;margin-top:10px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box">
    <div id="hilfe-list"></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="hilfeClose()">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
  hilfeRender("");
}
function hilfeClose(){ document.getElementById("hilfe-modal")?.remove(); }
function hilfeRender(q){
  const box=document.getElementById("hilfe-list"); if(!box)return;
  q=(q||"").trim().toLowerCase();
  const html=HELP.map(g=>{
    const items=g.items.filter(it=>!q||(it.t+" "+it.d).toLowerCase().includes(q));
    if(!items.length)return "";
    return `<div style="margin-top:10px"><div style="font-size:var(--s-text);font-weight:800;color:var(--text)">${g.cat}</div>`+
      items.map(it=>{const act=it.go?`hilfeClose();go('${it.go}')`:it.run?`hilfeClose();${it.run}`:"";
        return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-top:var(--border)">
          <div style="flex:1;min-width:0"><div style="font-size:var(--s-text);font-weight:700">${esc(it.t)}</div><div style="font-size:var(--s-klein);color:var(--text2);line-height:1.35">${it.d}</div></div>
          ${act?`<button class="btn btn-sm" onclick="${act}" title="Öffnen"><i class="ti ti-arrow-right"></i></button>`:""}
        </div>`;}).join("")+`</div>`;
  }).join("");
  box.innerHTML=html||`<div style="font-size:var(--s-text);color:var(--text3);padding:10px 0">Nichts gefunden.</div>`;
}
/* v658 · Geführte Tour mit Zeiger (PO 28.09.: „… sodass eine geführte Tour durch die
   verschiedenen Bereiche der App abläuft“). Jeder Schritt öffnet seinen Bereich (`vor`) und
   zeigt auf das Element (`sel`); fehlt es gerade (kein Block, keine To-dos), steht der Schritt
   als Karte in der Mitte. Der Motor liegt in core.js (fuehrungStart), damit Eltern und Kinder
   dieselbe Bedienung bekommen. Texte kurz: eine Sache je Schritt. */
const TOUR=[
  {emo:"🦅", t:"Willkommen im Trainerbereich", vor:()=>openTab("home"),
   d:"Diese Tour zeigt dir in ein paar Schritten, wo was ist. Du kannst jederzeit mit „Überspringen“ aufhören und sie über ❓ oben neu starten."},
  {emo:"✅", t:"Deine To-dos", sel:["#trainer-todo-slot"], vor:()=>openTab("home"),
   d:"Ganz oben steht, was für dich offen ist – Nachbereiten, Rückmeldungen, Löschanträge. Ein Tipp führt direkt dorthin."},
  {emo:"📅", t:"Diese Woche", sel:["#home-woche","#trainer-termine-slot"],
   d:"Die Termine der nächsten sieben Tage mit Zusagen, Trainern und Plan. Fehlt deine Antwort, fragt „Bist du dabei?“ danach."},
  {emo:"🧩", t:"Sechs Bereiche", sel:['#home-content button[onclick="kachelOpen(\'training\')"]'],
   d:"Training, Spieltag, Team, Taktik, Eltern & Kinder und Orga. Hinter jeder Kachel wartet eine Seite mit weiteren Kacheln."},
  {emo:"🧭", t:"Die Leiste unten", sel:["#main-nav"],
   d:"Dieselben Bereiche für den Daumen. Leiste und Kacheln führen auf dieselben Seiten."},
  {emo:"🗓️", t:"Trainingsplan: Termin wählen", sel:["#tp-vorplan"], vor:()=>go("planung"), warte:500,
   d:"Oben die Trainings der nächsten Wochen als Kacheln. Tippe einen an, darunter steht sein Plan."},
  {emo:"🧑‍🏫", t:"Wer ist Trainer?", sel:["#tp-trainer-checks"],
   d:"Hake an, wer heute auf dem Platz steht. So viele Trainer, so viele Gruppen – eine Gruppe ohne Trainer gibt es nur auf ausdrücklichen Wunsch."},
  {emo:"🧱", t:"Trainingsblock", sel:["#tp-block-karte","#tp-block"],
   d:"Läuft ein Block, steht hier die Einheit des Tages mit dem Ziel für die Kinder. Am Trainingstag: „🔄 Aktualisieren nach Anwesenheit“ – die App stellt Gruppen und Übungen passend, die KI prüft im selben Thema."},
  {emo:"🗂️", t:"Vorlage übernehmen", sel:['#train-sub-planung button[onclick*="vorlageUebernehmenOpen"]'],
   d:"Fertige Einheiten nach Thema. Jede endet mit einem Abschlussturnier von zehn Minuten."},
  {emo:"👥", t:"Trainingsgruppen", sel:['#tp-timeline button[onclick="tgOpen()"]'],
   d:"Die Kinder kommen aus Anwesenheit oder Zusagen. Verschieben geht von Hand; an jeder Station steht, wie viele spielen und wer wechselt."},
  {emo:"🧱", t:"Block anlegen", sel:["#tp-block","#block-banner"], vor:()=>go("planung"), warte:700,
   d:"Hier legst du einen Trainingsblock an: Thema wählen, drei Einheiten, Zeitraum – die App plant alle Trainings darin auf einmal."},
  {emo:"📚", t:"Übungen", sel:["#tf-kacheln","#training-search"],
   d:"Alle Übungen nach Art geordnet, mit Skizze. „➕ Eigene Übung“: beschreiben oder einsprechen, die KI füllt die Felder."},
  {emo:"⚽", t:"Spieltag", sel:["#mt-phase-wer"], warte:500,
   vor:()=>{ go("spieltag"); setTimeout(()=>{ if(typeof spieltagPhaseZeigen==="function")spieltagPhaseZeigen("wer"); },120); },
   d:"Vier Schritte: ① Wer kommt? – die Rückmeldungen, jedes Kind zum Ändern; die Eltern sehen das als Nominierung. ② Teams und Kapitäne – die App verteilt die Kinder. ③ Während: Uhr, Rotation, Liveticker. ④ Danach."},
  {emo:"👕", t:"Team", sel:["#view-kader"], vor:()=>go("kader"), warte:400,
   d:"Kader, Profile, Ausstattung. Einzelbewertungen gibt es erst ab Ende der Hinrunde – dann gemeinsam im Trainerteam."},
  {emo:"🎯", t:"Taktik", sel:["#sit-hub"], vor:()=>go("taktik"), warte:400,
   d:"Spielsituationen zeichnen oder von der KI zeichnen lassen, groß zeigen und abspielen. Das „Freie Brett“ ist für den Moment am Platz."},
  {emo:"📝", t:"Nachbereiten", sel:['#trainer-todo-slot button[onclick="einheitBewertenOpen()"]',"#trainer-todo-slot"], vor:()=>openTab("home"), warte:500,
   d:"Nach Training, Spiel oder Festival: einsprechen, was los war – die KI ordnet es und macht einen Vorschlag fürs Tagebuch. Gespeichert wird erst, wenn du es prüfst."},
  {emo:"❓", t:"Hilfe und Schrift", sel:["#help-btn"],
   d:"❓ öffnet die Hilfe mit allen Funktionen und startet diese Tour neu. Daneben „A“ für größere Schrift und 🌙 für den dunklen Modus."},
];
// Nie im Kinder-Quiz: ?quiz laesst #home-content im DOM, renderHome laeuft also mit und
// wuerde den Kindern die Trainer-Tour zeigen (die von Kader & Trainingsplan erzaehlt).
function tourMaybe(){ if(document.body.classList.contains("quiz-extern"))return; try{if(localStorage.getItem("adler_trainer_tour"))return;}catch(e){} tourStart(); }
function tourStart(){ fuehrungStart(TOUR,{schluessel:"adler_trainer_tour",ende:()=>{ try{ openTab("home"); }catch(e){} }}); }
function tourClose(){ if(typeof fuehrungEnde==="function"&&typeof fuehrungLaeuft==="function"&&fuehrungLaeuft())fuehrungEnde(); else { try{localStorage.setItem("adler_trainer_tour","1");}catch(e){} } }

// Adler-Welt: Trainer-Hub für Federn/Karten/Abzeichen/Challenge – ansehen & verwalten.
async function adlerWeltOpen(){
  const active=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  document.getElementById("aw-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="aw-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Adler-Welt");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const rows=active.slice().sort((a,b)=>((a.nr==null?99:a.nr)-(b.nr==null?99:b.nr))||a.name.localeCompare(b.name)).map(k=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:var(--border)">
    <div style="flex:1;min-width:0">
      <div style="font-size:var(--s-text);font-weight:700">${k.nr!=null?`<span style="color:var(--text3);font-weight:600">#${k.nr}</span> `:""}${esc(k.name)}</div>
      <div id="aw-fed-${kaderId(k)}" style="font-size:var(--s-klein);color:#7c3aed;font-weight:700">…</div>
    </div>
    <button class="btn btn-sm" onclick="adlerCardOpen('${(k.name||'').replace(/'/g,'')}')" title="FUT-Karte ansehen">🃏</button>
    <button class="btn btn-sm" onclick="abzeichenOpen(${kaderId(k)},'${(k.name||'').replace(/'/g,'')}')" title="Technik-Abzeichen">🎖️</button>
  </div>`).join("");
  c.innerHTML=`${mdlHead("aw-modal","🪶","Adler-Welt","Federn, Karten, Abzeichen & Challenge – ansehen und verwalten","#7c3aed")}
    <div id="aw-team-level" style="margin-bottom:12px"></div>
    <button class="btn btn-p btn-sm" style="width:100%;margin-bottom:8px" onclick="document.getElementById('aw-modal').remove();w2('federnVergebenOpen')">${XP_ICON} ${XP_LABEL} vergeben (Team oder einzelne Kinder)</button>
    <button class="btn btn-p btn-sm" style="width:100%" onclick="document.getElementById('aw-modal').remove();wochenChallengeOpen()"><i class="ti ti-trophy"></i>Wochen-Challenge setzen / bearbeiten</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('aw-modal').remove();w2('skillWocheOpen')"><i class="ti ti-video"></i>🎬 Skill der Woche setzen</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('aw-modal').remove();wahlTrainerOpen()"><i class="ti ti-chart-bar"></i>🗳️ Kabinen-Wahl (Kinder stimmen ab)</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('aw-modal').remove();albumFotosOpen()"><i class="ti ti-photo"></i>🃏 Album-Karten-Fotos (Trainer &amp; Verein)</button>
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:16px 0 4px">🎵 Kabinen-Playlist</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">Spotify-Link zur U9-Playlist. Die Kinder hören sie in der Kabine; sie lädt dort erst, wenn jemand auf „Playlist laden“ tippt.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <input id="aw-spotify" type="url" placeholder="https://open.spotify.com/playlist/…" style="flex:1;min-width:150px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)">
      <button class="btn btn-sm" onclick="spotifySave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:12px 0 0">Spieler · ${XP_ICON} Federn</div>
    ${rows||'<div style="font-size:var(--s-text);color:var(--text3);padding:8px 0">Kein Kader geladen.</div>'}
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:16px 0 4px">🔒 Kabinen-Code</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">Mit diesem Code verlassen die Eltern den Kinder-Modus. Er bremst ein Kind – ein Schutz ist er nicht.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <input id="aw-kabinencode" type="text" inputmode="numeric" autocomplete="off" placeholder="Neuer Code (min. 4 Zeichen)" style="flex:1;min-width:150px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)">
      <button class="btn btn-sm" onclick="kabineCodeSave(this)"><i class="ti ti-device-floppy"></i>Code ändern</button>
    </div>
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:16px 0 4px">🤝 Unsere Vereinbarung</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">Die Eltern sehen beides in EINEM Dokument: oben die kurzen Fairplay-Regeln, darunter die ausformulierten Punkte nach Rubriken.</div>
    <button class="btn btn-sm" style="width:100%;margin-bottom:6px" onclick="document.getElementById('aw-modal').remove();w2('fairplayEditOpen')"><i class="ti ti-edit"></i>Fairplay-Regeln bearbeiten (oberer Teil)</button>
    <button class="btn btn-sm" style="width:100%" onclick="document.getElementById('aw-modal').remove();w2('leitfadenEditOpen')"><i class="ti ti-edit"></i>Praktische Punkte bearbeiten (Rubriken)</button>
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:16px 0 4px">🏟️ Team-Arena</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">Schlachtruf & Einlauf-Song, die die Kinder in der Kabine sehen.</div>
    <button class="btn btn-sm" style="width:100%" onclick="document.getElementById('aw-modal').remove();w2('arenaEditOpen')"><i class="ti ti-flag"></i>Arena bearbeiten</button>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('aw-modal').remove()">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
  if(typeof teamLevelLoad==="function")teamLevelLoad("aw-team-level"); // Küken-Schwarm (Team-Level) jetzt hier
  active.forEach(k=>{xpTotal(kaderId(k)).then(t=>{const el=document.getElementById("aw-fed-"+kaderId(k));if(el){const b=xpBadge(t);el.textContent=`${XP_ICON} ${t} · ${b.emo} ${b.t}`;}}).catch(()=>{});});
  // aktuelle Spotify-Playlist vorbefüllen
  fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=spotify_playlist`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).then(rows=>{const el=document.getElementById("aw-spotify");if(el&&rows[0]&&rows[0].spotify_playlist)el.value=rows[0].spotify_playlist;}).catch(()=>{});
}
/* v604: QR-Code als SVG, erzeugt im Browser. Die Bibliothek (MIT, Kazuhiko Arase) liegt
   in vendor/ und wird erst beim ersten Druck geladen – kein Trainer braucht sie beim Start.
   Fehlerkorrektur M: hält einen Knick oder Fleck auf der gedruckten Karte aus. */
function qrBibliothek(){
  if(typeof qrcode==="function")return Promise.resolve();
  if(window._qrLaden)return window._qrLaden;
  window._qrLaden=new Promise((ok,fehler)=>{
    const sc=document.createElement("script");sc.src="vendor/qrcode.js";
    sc.onload=()=>typeof qrcode==="function"?ok():fehler(new Error("qrcode fehlt"));
    sc.onerror=()=>{window._qrLaden=null;fehler(new Error("vendor/qrcode.js"));};
    document.head.appendChild(sc);
  });
  return window._qrLaden;
}
async function qrSvg(text,zelle){
  await qrBibliothek();
  const q=qrcode(0,"M"); q.addData(text); q.make();
  return q.createSvgTag({cellSize:zelle||4,margin:(zelle||4)*4,scalable:true,alt:"QR-Code"});
}
/* ═══ v604: Einladungskarten ═══
   Je Kind eine Karte mit QR-Code auf eltern/?portal&einladung=CODE. Wer sie scannt, legt
   mit E-Mail und Passwort ein Konto an und ist sofort dem Kind zugeordnet (Edge Function
   eltern-einladung). Der Code entsteht HIER und steht danach nur auf dem Papier: in der
   Datenbank liegt sein SHA-256. Neu drucken macht die alten Karten der gewählten Kinder
   ungültig – eine verlorene Karte ist so mit einem Druck erledigt. */
const EINL_ZEICHEN="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // ohne I, O, 0, 1: abtippbar
function einladungCode(){
  const b=new Uint8Array(20); crypto.getRandomValues(b);
  return Array.from(b,x=>EINL_ZEICHEN[x%32]).join("");   // 256 ist ein Vielfaches von 32: gleichverteilt
}
async function einladungHash(code){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(code));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function einladungskartenOpen(){
  const kinder=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false&&kaderId(k)!=null);
  let konten={}, karten={};
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?select=spieler_id`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)(await r.json()).forEach(x=>konten[x.spieler_id]=(konten[x.spieler_id]||0)+1);}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_einladung?select=spieler_id,nutzungen,max_nutzungen,gueltig_bis`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>karten[x.spieler_id]=x);}catch(e){}
  document.getElementById("einl-modal")?.remove();
  const m=document.createElement("div");m.id="einl-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Einladungskarten");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const bis=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
  const zeile=k=>{
    const n=konten[kaderId(k)]||0, c=karten[kaderId(k)];
    const stand=[n?`${n} Konto${n>1?"en":""} verbunden`:"noch kein Konto",
      c?(new Date(c.gueltig_bis)>new Date()?`Karte: ${c.nutzungen} von ${c.max_nutzungen} genutzt`:"Karte abgelaufen"):""].filter(Boolean).join(" · ");
    return `<label style="display:flex;align-items:center;gap:10px;min-height:44px;padding:4px 2px;border-bottom:1px solid var(--border);cursor:pointer">
      <input type="checkbox" class="einl-kind" value="${kaderId(k)}" ${n?"":"checked"} style="width:20px;height:20px">
      <span style="flex:1;min-width:0"><b>${esc(k.name)}</b><br><span style="font-size:var(--s-klein);color:var(--text2)">${esc(stand)}</span></span></label>`;
  };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("einl-modal","🎟️","Einladungskarten","Je Kind eine Karte · QR scannen, E-Mail und Passwort festlegen, fertig","#047857")}
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:10px">Vier Karten pro A4-Seite zum Ausschneiden. Eine Karte reicht für <b>zwei</b> Elternteile. Kein Mailversand – das Konto ist sofort da.
      <br><b>Neu drucken macht die alte Karte des Kindes ungültig.</b> Vorausgewählt sind die Kinder ohne verbundenes Konto.</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button class="btn btn-sm" style="flex:1" onclick="document.querySelectorAll('.einl-kind').forEach(c=>c.checked=true)">Alle</button>
      <button class="btn btn-sm" style="flex:1" onclick="document.querySelectorAll('.einl-kind').forEach(c=>c.checked=false)">Keine</button>
    </div>
    <div style="max-height:46vh;overflow-y:auto;margin-bottom:10px">${kinder.map(zeile).join("")||'<div style="font-size:var(--s-text);color:var(--text2)">Kein Kader geladen.</div>'}</div>
    <label for="einl-bis" style="font-size:var(--s-text);color:var(--text2)">Gültig bis</label>
    <input id="einl-bis" type="date" value="${bis}" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-karte);background:var(--surface2);color:var(--text);margin:4px 0 12px">
    <button id="einl-druck" class="btn btn-p" style="width:100%" onclick="einladungskartenDrucken(this)"><i class="ti ti-id-badge-2"></i>Karten erzeugen</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('einl-modal').remove()">Schließen</button>
  </div>`;
  document.body.appendChild(m);
}
async function einladungskartenDrucken(btn){
  const ids=[...document.querySelectorAll(".einl-kind:checked")].map(c=>+c.value);
  if(!ids.length){toast("Bitte mindestens ein Kind auswählen","err");return;}
  const bisTag=document.getElementById("einl-bis")?.value;
  if(!bisTag||bisTag<isoLokal()){toast("Das Datum „Gültig bis“ liegt in der Vergangenheit","err");return;}
  if(!(window.crypto&&crypto.subtle)){toast("Karten lassen sich nur über https erzeugen","err");return;}
  if(btn){btn.disabled=true;btn.textContent="Erzeuge Karten…";}
  const zurueck=()=>{if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-id-badge-2"></i>Karten erzeugen';}};
  try{
    await qrBibliothek();
    const gueltig=new Date(bisTag+"T23:59:59").toISOString();
    const karten=[];
    for(const id of ids){const code=einladungCode();karten.push({id,code,hash:await einladungHash(code)});}
    const del=await fetch(`${SB_URL}/rest/v1/eltern_einladung?spieler_id=in.(${ids.join(",")})`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(del))return zurueck();
    if(!del.ok){toast(sbDeniedMsg(del,"Alte Karten konnten nicht zurückgezogen werden"),"err");return zurueck();}
    const r=await fetch(`${SB_URL}/rest/v1/eltern_einladung`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},
      body:JSON.stringify(karten.map(k=>({spieler_id:k.id,code_hash:k.hash,max_nutzungen:2,gueltig_bis:gueltig})))});
    if(sbCheck401(r))return zurueck();
    if(!r.ok){toast(sbDeniedMsg(r,"Karten konnten nicht gespeichert werden"),"err");return zurueck();}
    const html=await einladungskartenHtml(karten,bisTag);
    document.getElementById("einl-modal")?.remove();
    const ziel=document.getElementById("zert-print"); if(ziel)ziel.innerHTML=html;
    einladungFertigZeigen(karten,html,bisTag);
  }catch(e){toast("Karten konnten nicht erzeugt werden: "+e.message,"err");zurueck();}
}
/* v658 PO 28.09.: „Link kopieren“ je Karte – für Eltern, die beim Elternabend fehlen. Der Code
   lebt nur in diesem Fenster (in der Datenbank steht sein SHA-256); wer es schließt, erzeugt neu.
   Gedruckt wird erst auf Knopfdruck, damit der Druckdialog nicht vor die Links springt. */
let _einlFertig=null;
function einladungFertigZeigen(karten,html,bisTag){
  const kader=(typeof KADER!=="undefined"?KADER:[]);
  const basis=appRoot()+"eltern/?portal&einladung=";
  const bis=bisTag.split("-").reverse().join(".");
  _einlFertig={html,links:karten.map(k=>{const kind=kader.find(x=>kaderId(x)===k.id);
    return {name:String(kind?.name||"").trim(),url:basis+k.code};})};
  document.getElementById("einl-fertig")?.remove();
  const m=document.createElement("div");m.id="einl-fertig";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Einladungskarten erzeugt");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  const zeilen=_einlFertig.links.map((l,i)=>`<div style="display:flex;align-items:center;gap:10px;min-height:48px;border-bottom:1px solid var(--border)">
      <b style="flex:1;min-width:0">${esc(l.name)}</b>
      <button class="btn btn-sm einl-link" style="min-height:44px" onclick="einladungLinkTeilen(${i},this)"><i class="ti ti-link"></i>Link kopieren</button></div>`).join("");
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("einl-fertig","🎟️",`${karten.length} Karte${karten.length>1?"n":""} erzeugt`,`gültig bis ${esc(bis)}`,"#047857")}
    <button id="einl-drucken" class="btn btn-p" style="width:100%;min-height:56px" onclick="einladungKartenDruckenJetzt()"><i class="ti ti-printer"></i>Karten drucken</button>
    <div style="font-size:var(--s-text);color:var(--text2);margin:14px 0 6px">Oder den Link einzeln per WhatsApp schicken – im <b>persönlichen</b> Chat, nie in der Gruppe: wer ihn hat, kommt an die Daten dieses Kindes. Der Link wirkt wie die Karte (zwei Elternteile).</div>
    ${zeilen}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:10px">Die Links gibt es nur in diesem Fenster. Danach geht es nur mit neuen Karten – die alten werden dann ungültig.</div>
    <button class="btn btn-sm" style="width:100%;margin-top:10px" onclick="document.getElementById('einl-fertig').remove()">Schließen</button>
  </div>`;
  document.body.appendChild(m);
  toast(`🎟️ ${karten.length} Karte${karten.length>1?"n":""} bereit`);
}
function einladungKartenDruckenJetzt(){ if(_einlFertig)_zertPrint(_einlFertig.html); }
async function einladungLinkTeilen(i,btn){
  const l=_einlFertig&&_einlFertig.links[i]; if(!l)return;
  let ok=false;
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(l.url);ok=true;} }catch(e){}
  if(!ok){ try{ const t=document.createElement("textarea");t.value=l.url;t.setAttribute("readonly","");t.style.cssText="position:fixed;left:-9999px";
    document.body.appendChild(t);t.select();ok=document.execCommand("copy");t.remove(); }catch(e){} }
  if(ok){ if(btn){btn.innerHTML='<i class="ti ti-check"></i>Kopiert';} toast(`🔗 Link für ${l.name} kopiert – jetzt im Chat einfügen`); }
  else toast("Kopieren ging nicht – bitte die Karte drucken oder als PDF speichern","err");
}
async function einladungskartenHtml(karten,bisTag){
  const kader=(typeof KADER!=="undefined"?KADER:[]);
  const bis=bisTag.split("-").reverse().join(".");
  const basis=appRoot()+"eltern/?portal&einladung=";
  const einzeln=[];
  for(const k of karten){
    const kind=kader.find(x=>kaderId(x)===k.id);
    const vorname=String(kind?.name||"").trim();   // wie im Kader – zwei gleiche Vornamen unterscheidet der Trainer dort
    const qr=await qrSvg(basis+k.code,4);
    einzeln.push(`<div class="einl-karte">
      <div class="einl-kopf"><img src="logo.png" alt=""><div><b>SV Adler Dellbrück · U9</b><br>Einladung zur Team-App</div></div>
      <div class="einl-fuer">für die Familie von <b>${esc(vorname)}</b></div>
      <div class="einl-mitte"><div class="einl-qr">${qr}</div>
        <ol><li>QR-Code mit der Handy-Kamera scannen</li><li>E-Mail-Adresse eingeben und ein Passwort festlegen</li><li>Fertig – die App auf den Startbildschirm legen</li></ol></div>
      <div class="einl-fuss">Für zwei Elternteile · gültig bis ${esc(bis)} · Karte bitte nicht weitergeben</div>
    </div>`);
  }
  const seiten=[];
  for(let i=0;i<einzeln.length;i+=4)seiten.push(`<div class="einl-bogen">${einzeln.slice(i,i+4).join("")}</div>`);
  return `<style>
    @page{size:A4;margin:8mm}
    .einl-bogen{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:136mm;gap:0;page-break-after:always;break-after:page;font-family:system-ui,sans-serif;color:#0f172a}
    .einl-karte{border:1px dashed #94a3b8;padding:7mm 6mm;box-sizing:border-box;display:flex;flex-direction:column;gap:3mm}
    .einl-kopf{display:flex;align-items:center;gap:3mm;font-size:10.5pt;line-height:1.3}
    .einl-kopf img{width:13mm;height:13mm;object-fit:contain}
    .einl-fuer{font-size:13pt;border-top:2px solid #1e3a8a;padding-top:2mm}
    .einl-mitte{display:flex;flex-direction:column;align-items:center;gap:3mm;flex:1}
    .einl-qr{width:52mm;height:52mm}
    .einl-qr svg{width:100%;height:100%}
    .einl-mitte ol{margin:0;padding-left:5mm;font-size:10pt;line-height:1.45}
    .einl-fuss{font-size:8.5pt;color:#334155;text-align:center}
  </style>${seiten.join("")}`;
}
/* ── Album-Karten-Fotos: der Trainer hinterlegt Bilder für Trainer- und Vereins-Sticker.
   (Kinder-Sticker nutzen automatisch das Eltern-Profilfoto, sofern freigegeben.)
   Dateien liegen im spielerfotos-Bucket unter album_<key>; Zuordnung in album_fotos. ── */
function _albumFotoSlots(){
  const s=[]; ((typeof TRAINER!=="undefined"&&TRAINER)||[]).forEach(t=>s.push({key:"tr_"+t,label:"🧢 "+t+" (Trainer)"}));
  [["sp_ball","⚽ Der Spielball"],["sp_kaefig","🥅 Der Käfig"],["sp_buedchen","🍿 Das Büdchen"],["sp_platz","🏟️ Thurner Kamp"],["sp_trikot","👕 Adler-Trikot"],["sp_adler","🦅 Der Adler"],["sp_kurve","📣 Die Eltern-Kurve"],["sp_nest","🪺 Das Adler Nest"],["sp_pokal","🏆 Der Pokal"],["sp_horst","🦅 Horst der Adler"],["sp_feder","🪶 Die Goldene Feder"]].forEach(([k,l])=>s.push({key:k,label:l}));
  return s;
}
async function albumFotosOpen(){
  let map={};
  try{const r=await fetch(`${SB_URL}/rest/v1/album_fotos?select=key,path`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(x=>map[x.key]=x.path);}catch(e){}
  document.getElementById("albfoto-modal")?.remove();
  const m=document.createElement("div");m.id="albfoto-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Album-Karten-Fotos");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("albfoto-modal","🃏","Album-Karten-Fotos","Bilder für Trainer- und Vereins-Sticker – die Kinder sehen sie im Sammelalbum","var(--amber)")}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:10px">Kinder-Sticker nutzen automatisch das Profilfoto (mit Eltern-Freigabe). Hier pflegst du die restlichen Karten – Querformat wird rund zugeschnitten, max. 3 MB.</div>
    ${_albumFotoSlots().map(s=>`<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-radius:12px;padding:8px 12px;margin-bottom:6px">
      <span style="flex:1;min-width:0;font-size:var(--s-text);font-weight:700">${s.label}</span>
      <span style="font-size:var(--s-klein);color:${map[s.key]?"var(--green)":"var(--text3)"}">${map[s.key]?"✅ Foto da":"– kein Foto"}</span>
      <label class="btn btn-sm" style="cursor:pointer;margin:0">📷<input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="albumFotoUpload('${s.key}',this)"></label>
      ${map[s.key]?`<button class="btn btn-sm" style="color:var(--red)" onclick="albumFotoDelete('${s.key}')" title="Foto entfernen"><i class="ti ti-trash"></i></button>`:""}
    </div>`).join("")}
  </div>`;
  document.body.appendChild(m);
}
async function albumFotoUpload(key,inp){
  const f=inp.files&&inp.files[0]; if(!f)return;
  if(f.size>3*1024*1024){toast("Bitte max. 3 MB","err");return;}
  const ext=((f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,""))||"jpg";
  const path=`album_${key}.${ext}`;
  try{
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${path}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':f.type||"image/jpeg",'x-upsert':'true'},body:f});
    if(!up.ok){toast("Upload fehlgeschlagen ("+up.status+")","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/album_fotos?on_conflict=key`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({key,path,updated_at:new Date().toISOString()})});
    if(!r.ok&&r.status!==201){toast("Konnte Zuordnung nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  window._albFotos=null; // Kabinen-Cache invalidieren
  toast("🃏 Karten-Foto gespeichert ✓");
  albumFotosOpen();
}
async function albumFotoDelete(key){
  if(!confirm("Foto für diese Karte wirklich entfernen?"))return;
  try{await fetch(`${SB_URL}/rest/v1/album_fotos?key=eq.${encodeURIComponent(key)}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  window._albFotos=null;
  toast("Foto entfernt");
  albumFotosOpen();
}
async function spotifySave(btn){
  const url=(document.getElementById("aw-spotify")?.value||"").trim();
  if(url&&!/open\.spotify\.com\/(playlist|album|track)\//.test(url)){toast("Bitte einen Spotify-Playlist-Link","err");return;}
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({id:1,spotify_playlist:url||null,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast(url?"Playlist gespeichert ✓":"Playlist entfernt");
}
/* Kabinen-Code ändern: gespeichert wird NUR der SHA-256, der Klartext verlässt das
   Trainer-Gerät nie. team_config ist für alle Angemeldeten lesbar – auch für das Kind
   auf dem Elternhandy –, deshalb dort kein Klartext. */
async function kabineCodeSave(btn){
  const el=document.getElementById("aw-kabinencode");
  const code=(el?.value||"").trim();
  if(code.length<4){toast("Mindestens 4 Zeichen","err");return;}
  const hash=await hashPin(code);
  // Trainer-PIN und Kabinen-Code sind ab Werk derselbe Wert. Wer den einen kennt, kennt den anderen.
  if(typeof PIN_HASH!=="undefined"&&hash===PIN_HASH){
    if(!confirm("Das ist derselbe Code wie der Trainer-PIN.\n\nWer ihn kennt, kommt damit auch in die Trainer-App.\nTrotzdem verwenden?"))return;
  }
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kabine_config?on_conflict=id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,code_hash:hash})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  try{localStorage.setItem(KABINE_HASH_KEY,hash);}catch(e){}   // eigenes Gerät sofort aktuell
  if(el)el.value="";
  toast("Kabinen-Code geändert ✓ Sag ihn den Eltern.");
}

/* Passwort selbst ändern (Trainer-App). Setzt das Passwort über die eigene Sitzung
   (PUT /auth/v1/user) – kein Admin/keine E-Mail nötig. Die laufende Sitzung bleibt gültig.
   Damit kann ein gemeinsames Start-Passwort nach dem ersten Login individuell ersetzt werden. */
function pwChangeOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("pw-modal")?.remove();
  const m=document.createElement("div");m.id="pw-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const fld="width:100%;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-karte);background:var(--surface2);color:var(--text);box-sizing:border-box";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:360px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    ${mdlHead("pw-modal","🔑","Passwort ändern","Eigenes Passwort: "+pwRegelText(),"#334155")}
    <label style="font-size:var(--s-klein);color:var(--text2)">Neues Passwort<input type="password" id="pw-new" autocomplete="new-password" minlength="10" style="${fld}"></label>
    <label style="font-size:var(--s-klein);color:var(--text2);display:block;margin-top:8px">Nochmal eingeben<input type="password" id="pw-new2" autocomplete="new-password" minlength="10" onkeydown="if(event.key==='Enter')pwChangeSave()" style="${fld}"></label>
    <div id="pw-err" style="color:var(--red);font-size:var(--s-text);min-height:16px;margin-top:6px"></div>
    <div style="display:flex;gap:8px;margin-top:2px">
      <button class="btn btn-p btn-sm" onclick="pwChangeSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('pw-modal').remove()">Abbrechen</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById("pw-new")?.focus(),50);
}
async function pwChangeSave(btn){
  const p1=document.getElementById("pw-new")?.value||"", p2=document.getElementById("pw-new2")?.value||"";
  const err=document.getElementById("pw-err"); const fail=(msg)=>{ if(err)err.textContent=msg; };
  {const f=pwRegelFehler(p1);if(f){fail(f);return;}}
  if(p1!==p2){fail("Die Passwörter stimmen nicht überein.");return;}
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/auth/v1/user`,{method:"PUT",headers:sbAuthHeaders(),body:JSON.stringify({password:p1})});
    if(r.status===401){sbCheck401(r);return;}
    if(!r.ok){ const d=await r.json().catch(()=>({})); fail(d.msg||d.error_description||d.error||("Fehler "+r.status)); return; }
  }catch(e){ fail("Netzwerkfehler – bist du online?"); return; }
  finally{ if(btn)btn.disabled=false; }
  document.getElementById("pw-modal")?.remove();
  toast("Passwort geändert ✓ – ab jetzt gilt dein neues Passwort.");
}

/* v693 PO 30.09.: Die Kopfzeile zeigte „Nächstes: 🏃 Training Fr 02.10. · 16:45 Uhr · Platz“ – am
   Handy nach vier Zeichen abgeschnitten und doppelt zur Training-Kachel direkt darunter und zu
   „Diese Woche“. Sie trägt jetzt fest „Trainerstab · U9 I“ (shell.html); der nächste Termin
   steht dort, wo er vollständig Platz hat. */

/* ── Diese Woche (v452, Plan-Punkt D) ──────────────────────────────────────────
   Die Startseite kannte den NAECHSTEN Termin und ein Karussell der naechsten fuenf –
   aber nicht den Stand: Wie viele Kinder haben zugesagt, sind genug Trainer da, steht
   der Plan, ist die Aufstellung gemacht? Genau das entscheidet, ob ein Trainer heute
   noch etwas tun muss. Eine Karte, sieben Tage, je Termin eine Zeile mit Chips. Die
   Chips tragen ihre Bedeutung im Text, die Farbe kommt nur dazu (Hausregel). */
const WOCHE_TAGE=7;
const WOCHE_ROT_AB=3;   // ab so vielen Tagen vor dem Termin darf ein Chip rot werden
function _wocheChip(text,art){
  const f={ok:["var(--green-bg)","var(--green)"],warn:["var(--amber-bg)","var(--amber)"],rot:["var(--red-bg)","var(--red)"],neutral:["var(--surface2)","var(--text2)"]}[art||"neutral"];
  return `<span style="display:inline-block;font-size:var(--s-klein);font-weight:700;line-height:1.3;padding:3px 8px;border-radius:10px;background:${f[0]};color:${f[1]};border:1px solid ${f[1]}33">${text}</span>`;
}
function wocheOpen(id,datum,typ){
  if(typeof nutzungLog==="function")nutzungLog("aktion","woche:"+typ);
  /* v702 PO: „die Frage ist eher, was angezeigt werden soll, wenn ich auf den Termin auf der
     Startseite klicke.“ Ein Spieltag führt direkt auf seine Seite (Schritt „Wer kommt?“, am
     Spieltag selbst die passende Phase); die Termin-Details stehen dort oben einen Tipp weit. */
  if(typ==="spiel"||typ==="turnier"){ spieltagZuTermin(datum); return; }
  if(typeof tmDetailOpen==="function")tmDetailOpen(id); else go("termine");
}
/* v702: Auf die Spieltag-Seite mit genau diesem Termin. Datum und Schritt werden beim Aufbau der
   Seite eingelöst (nomInit liest _spieltagDatumWunsch) – kein Wettlauf mit dem Standard-Datum. */
let _spieltagDatumWunsch=null;
function spieltagZuTermin(datum,phase){
  _spieltagDatumWunsch=datum||null;
  const heute=isoLokal();
  _spieltagPhaseWunsch=ST_PHASEN[phase]?phase:(datum===heute?null:"wer");
  go("spieltag");
}
/* v702: „Heimspiel planen“ – Planer des Heimtermins (md-turnierplan.js, Welle 2). */
function spieltagHeimPlanen(datum){
  if(typeof htOpen==="function")htOpen(datum||undefined); else toast("Der Planer lädt noch – gleich nochmal","err");
}
/* v702 PO: „bei Heimspielen kann es sogar prominenter auftauchen, vielleicht sogar auf die
   Startseite.“ Kachel „Die Woche davor“: ab sechs Tagen vor einem Heimspiel steht es oben. */
async function homeHeimspielLoad(){
  const slot=document.getElementById("home-heimspiel"); if(!slot)return;
  if(!sbToken()){slot.innerHTML="";return;}
  const heute=isoLokal(), bis=new Date(Date.now()+6*864e5).toISOString().slice(0,10);
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&heim=is.true&datum=gte.${heute}&datum=lte.${bis}&select=id,datum,typ,titel,gegner,uhrzeit,platz_status&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)t=((await r.json())||[])[0]||null;}catch(e){}
  if(!document.getElementById("home-heimspiel"))return;
  if(!t||t.platz_status==="abgesagt"){slot.innerHTML="";return;}
  const d=new Date(t.datum+"T00:00:00");
  const wann=t.datum===heute?"Heute":d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit"});
  const art=t.typ==="spiel"?"Heimspiel":"Heimspieltag";
  slot.innerHTML=`<div class="abschnitt" id="home-heimspiel-karte" style="margin-bottom:10px;border-left:4px solid var(--fam-spieltag)">
    <div style="font-size:var(--s-teil);font-weight:800">🏟️ ${esc(art)} · ${esc(wann)}</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin:2px 0 10px">${esc(t.titel||t.gegner||art)}${t.uhrzeit?" · "+String(t.uhrzeit).slice(0,5)+" Uhr":""} – wir sind Gastgeber: Felder, Spielplan, Helfer.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button type="button" class="btn btn-p" style="min-height:48px;justify-content:center" onclick="spieltagHeimPlanen('${esc(t.datum)}')">Planen</button>
      <button type="button" class="btn" style="min-height:48px;justify-content:center" onclick="spieltagZuTermin('${esc(t.datum)}')">Zum Spieltag</button>
    </div></div>`;
}
async function homeWocheLoad(){
  const slot=document.getElementById("home-woche"); if(!slot)return;
  if(!sbToken()){slot.innerHTML="";return;}
  const heute=isoLokal();
  const bis=new Date(Date.now()+WOCHE_TAGE*864e5).toISOString().slice(0,10);
  let fern=false;   // kein Termin in 7 Tagen → der naechste danach
  /* v474: Jede gerechnete Zahl nennt ihre Quelle (Muster v470) – sonst raet der Trainer,
     ob „3 zugesagt" aus den Eltern-Antworten oder aus seiner eigenen Anwesenheit stammt. */
  const quelle=`<details class="woche-quelle-klapp" style="margin-top:6px"><summary style="min-height:44px;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--s-klein);font-weight:700;color:var(--text2)">ⓘ Woher die Zahlen kommen</summary><div class="woche-quelle" style="font-size:var(--s-klein);color:var(--text3);margin-top:0;line-height:1.4">Training: alle dabei außer Absagen · Spiel: Zusagen aus den Eltern-Rückmeldungen, am Spieltag „dabei“ aus „Teams festlegen“ · Trainer aus dem Trainerplan · Plan aus der App</div></details>`;
  const karte=(inner,mitQuelle)=>`<div class="card" style="padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px">
      <div style="font-size:var(--s-karte);font-weight:900;color:var(--text)">🗓️ ${fern?"Als Nächstes":"Diese Woche"}</div>
      <div style="font-size:var(--s-klein);color:var(--text3)">${fern?"kein Termin in den nächsten "+WOCHE_TAGE+" Tagen":"nächste "+WOCHE_TAGE+" Tage"}</div>
    </div>${inner}${mitQuelle?quelle:""}</div>`;
  let termine=[];
  try{
    const felder="id,datum,uhrzeit,uhrzeit_ende,typ,titel,gegner,ort,platz,spielform,trainer_status,platz_status,platz_status_note";
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=${felder}&datum=gte.${heute}&datum=lt.${bis}&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok){slot.innerHTML="";return;}
    termine=((await r.json())||[]).filter(t=>!(typeof terminVorbei==="function"&&terminVorbei(t)));
    /* Nichts in sieben Tagen (Ferien): dann den naechsten Termin danach zeigen – die
       Karte „Naechster Termin" gibt es nicht mehr, ihr Platz ist hier. */
    if(!termine.length){
      const r2=await fetch(`${SB_URL}/rest/v1/termine?select=${felder}&datum=gte.${bis}&order=datum.asc,uhrzeit.asc.nullslast&limit=1`,{headers:sbAuthHeaders()});
      if(r2.ok){termine=((await r2.json())||[]); fern=termine.length>0;}
    }
  }catch(e){slot.innerHTML="";return;}
  if(!document.getElementById("home-woche"))return;   // Tab schon verlassen
  if(!termine.length){
    slot.innerHTML=karte(`<div style="font-size:var(--s-text);color:var(--text2)">Kein Termin geplant. <a href="#" onclick="go('termine');return false" style="color:var(--blue-text);font-weight:700">Termin erfassen ›</a></div>`);
    return;
  }
  const inList=a=>`in.(${a.map(x=>encodeURIComponent(x)).join(",")})`;
  const ids=termine.map(t=>t.id), tage=[...new Set(termine.map(t=>t.datum))];
  const hole=async url=>{ try{const r=await fetch(`${SB_URL}/rest/v1/${url}`,{headers:sbAuthHeaders()}); return r.ok?((await r.json())||[]):[];}catch(e){return [];} };
  const [rsvp,plaene,gruppen,noms]=await Promise.all([
    hole(`rueckmeldungen?select=termin_id,status&termin_id=${inList(ids)}`),
    hole(`trainingsplan?select=datum,plan&datum=${inList(tage)}`),
    hole(`trainingsgruppen?select=datum&datum=${inList(tage)}`),
    hole(`nominierungen?select=datum,data&datum=${inList(tage.map(d=>d+"__nom"))}`)
  ]);
  if(!document.getElementById("home-woche"))return;
  const aktive=(KADER||[]).filter(k=>k.aktiv!==false).length;
  const zeilen=termine.map((t,idx)=>{
    const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"var(--blue)"};
    const d=new Date(t.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const inTagen=Math.round((d-new Date(heute+"T00:00:00"))/864e5);
    /* v474: Rot erst ab drei Tagen vor dem Termin. Ein Training in sechs Tagen mit null
       Zusagen ist kein Alarm – die Eltern antworten meist erst kurz vorher. Vorher war
       jede Woche beim Oeffnen rot, und Rot, das immer da ist, sieht keiner mehr. */
    const nah=inTagen<=WOCHE_ROT_AB;
    const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5):"";
    const faelltAus=typeof terminFaelltAus==="function"&&terminFaelltAus(t);
    const chips=[];
    if(faelltAus)chips.push(terminAbsageChip(t));
    /* v486 PO: „0 Zusagen beim Festival – unter Match haben wir die Kinder doch schon
       eingeteilt." Tatsache schlaegt Vorhersage (v477): steht die Einteilung, zeigt der
       Chip „dabei" aus „Teams festlegen" statt der Eltern-Zusagen. */
    const nomZeile=(t.typ==="spiel"||t.typ==="turnier")?noms.find(n=>n.datum===t.datum+"__nom"):null;
    const dabei=nomZeile&&nomZeile.data?Object.keys(nomZeile.data).filter(k=>k.charAt(0)!=="_"&&nomZeile.data[k]==="dabei").length:0;
    if(dabei){
      chips.push(_wocheChip(`🧩 ${dabei} dabei`,dabei>=6?"ok":"warn"));
    }else if(t.typ==="training"||t.typ==="spiel"||t.typ==="turnier"){
      const rm=rsvp.filter(x=>x.termin_id===t.id);
      const ja=rm.filter(x=>x.status==="zugesagt").length;
      const nein=rm.filter(x=>x.status==="abgesagt"||x.status==="krank").length;
      const offen=Math.max(0,aktive-rm.length);
      /* v609: Ein Training gilt als zugesagt (CLAUDE.md: kein Opt-out) – „0 zugesagt" in Rot
         war deshalb falsch. Beim Training zählt, wer NICHT kommt; Spiel und Turnier bleiben
         bei den Zusagen. */
      if(t.typ==="training"){
        const dabei=Math.max(0,aktive-nein);
        chips.push(_wocheChip(`${dabei} dabei`,dabei>=6?"ok":"warn"));
        if(nein)chips.push(_wocheChip(`${nein} abgesagt`,"neutral"));
      }else{
        chips.push(_wocheChip(`${ja} zugesagt`,ja>=6?"ok":ja?"warn":nah?"rot":"neutral"));
        if(nein)chips.push(_wocheChip(`${nein} abgesagt`,"neutral"));
        if(offen)chips.push(_wocheChip(`${offen} offen`,"neutral"));
      }
    }
    if(t.typ==="training"||t.typ==="spiel"||t.typ==="turnier"){
      const trainerJa=Object.keys(t.trainer_status||{}).filter(n=>t.trainer_status[n]==="ja").length;
      chips.push(trainerJa?_wocheChip(`🧢 ${trainerJa} Trainer`,trainerJa>=2?"ok":"warn"):_wocheChip("🧢 kein Trainer",nah?"rot":"warn"));
    }
    if(t.typ==="training"){
      const plan=plaene.find(p=>p.datum===t.datum&&Array.isArray(p.plan)&&p.plan.length);
      chips.push(plan?_wocheChip("📋 Plan steht","ok"):_wocheChip("📋 kein Plan",nah?"warn":"neutral"));
      if(gruppen.some(g=>g.datum===t.datum))chips.push(_wocheChip("👥 Gruppen","neutral"));
    }
    if((t.typ==="spiel"||t.typ==="turnier")&&!dabei){
      chips.push(_wocheChip("🧩 Teams offen",nah?"warn":"neutral"));
    }
    const titel=esc(t.titel||t.gegner||m.label);
    const ort=t.platz||t.ort;
    const istSpiel=t.typ==="spiel"||t.typ==="turnier";
    /* Erste Zeile = der naechste Termin: hier wohnen jetzt Sprungknopf, Adresse, Wetter,
       Packtipp und Gegner-Kontakt – frueher eine eigene Karte direkt darunter. */
    const erweitert=(idx!==0||faelltAus)?"":`<div class="woche-erweitert" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${istSpiel?`<button class="btn btn-p btn-sm" onclick="tmJump('blitz','${t.datum}','${esc(t.spielform||"")}')" style="white-space:nowrap"><i class="ti ti-ball-football"></i>Matchday</button>`
            :t.typ==="event"?`<button class="btn btn-sm" onclick="mitbringTrainerOpen()" style="white-space:nowrap"><i class="ti ti-basket"></i>Mitbringliste</button>`
            :`<button class="btn btn-sm" onclick="tmJump('anwesenheit','${t.datum}')" style="white-space:nowrap"><i class="ti ti-checkbox"></i>Anwesenheit</button>
             <button class="btn btn-sm" onclick="tmJump('planung','${t.datum}')" style="white-space:nowrap"><i class="ti ti-clipboard-list"></i>Plan</button>`}
          ${t.spielform?`<span style="font-size:var(--s-klein);font-weight:700;padding:2px 7px;border-radius:10px;background:${m.col}22;color:${m.col}">${esc(sfText(t.spielform))}</span>`:""}
          ${t.ort?`<span style="font-size:var(--s-klein);color:var(--text2)">${mapsAnchor(t.ort)}</span>`:""}
        </div>
        <div id="wetter-home"></div><div id="wetter-warn-home"></div><div id="gegner-contact-home"></div>
      </div>`;
    return `<div class="woche-zeile" role="button" tabindex="0" onclick="wocheOpen(${t.id},'${t.datum}','${esc(t.typ)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"
        style="display:flex;gap:10px;align-items:flex-start;min-height:44px;padding:8px 4px;border-top:1px solid var(--rand-bedien);cursor:pointer">
      <div style="flex:0 0 52px;text-align:center">
        <div style="font-size:var(--s-klein);font-weight:800;color:${inTagen===0?"var(--red)":"var(--text2)"}">${inTagen===0?"HEUTE":inTagen===1?"morgen":wtag}</div>
        <div style="font-size:var(--s-karte);font-weight:800;line-height:1.2">${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</div>
        <div style="font-size:var(--s-klein);color:var(--text2)">${zeit||"&nbsp;"}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-text);font-weight:800;line-height:1.25;color:${faelltAus?"var(--text2)":"inherit"}">${m.icon} ${titel}${ort?` <span style="font-weight:500;color:var(--text2);font-size:var(--s-klein)">· ${esc(ort)}</span>`:""}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${chips.join("")}</div>
        ${faelltAus?`<div style="font-size:var(--s-klein);color:var(--text3);margin-top:5px">Abgesagt – die Eltern sehen den Hinweis in ihrer App. Zum Zurücknehmen den Termin antippen.</div>`:""}
        ${erweitert}
      </div>
      <div aria-hidden="true" style="align-self:center;color:var(--text3);font-size:var(--s-karte)">›</div>
    </div>`;
  });
  slot.innerHTML=karte(`<div style="margin:0 -4px">${zeilen.join("")}</div>`,true);
  // Wetter, Warnung und Gegner-Kontakt fuer den ersten Termin – wie frueher in der eigenen Karte
  const t0=termine[0];
  if(typeof terminFaelltAus==="function"&&terminFaelltAus(t0))return;   // kein Wetter, kein Packtipp für einen Termin, den es nicht gibt
  try{ if(typeof wetterInto==="function")wetterInto("wetter-home",t0.datum,t0.ort,t0.uhrzeit); }catch(e){}
  try{ if(t0.typ!=="event"&&typeof wetterWarnHome==="function")wetterWarnHome(t0); }catch(e){}
  try{ if((t0.typ==="spiel"||t0.typ==="turnier")&&typeof gegnerContactInto==="function")gegnerContactInto("gegner-contact-home",t0.titel||t0.gegner); }catch(e){}
}

/* ── Nutzung (v453, Plan-Punkt F) ── Auswertung des Nutzungslogs fuer Trainer */
let _nutzungTage=30;
async function nutzungOpen(){
  if(!sbToken()){toast("Bitte zuerst als Trainer anmelden","err");return;}
  document.getElementById("nutzung-modal")?.remove();
  const m=document.createElement("div"); m.id="nutzung-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Nutzung");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10020;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("nutzung-modal","📊","Nutzung","Was wirklich benutzt wird – die Grundlage fürs Ausmisten","var(--fam-orga)")}
    <div id="nutzung-zeitraum" style="display:flex;gap:8px;margin-bottom:10px"></div>
    <div id="nutzung-kinder"></div>
    <div id="nutzung-body"><div style="font-size:var(--s-text);color:var(--text2)">Lade Auswertung…</div></div>
    <button class="btn btn-sm" style="width:100%;margin-top:12px" onclick="nutzungAufraeumen()"><i class="ti ti-trash"></i>Einträge älter als 90 Tage löschen</button>
  </div>`;
  document.body.appendChild(m);
  nutzungLaden(_nutzungTage);
  kindGeraeteLaden();
}
/* v594: Wie viele Kindergeraete gekoppelt sind - als Zahl, ohne Namen. Der RPC
   kind_geraete_stat gibt ausschliesslich Summen zurueck; die Leseregel auf kind_konto
   liesse einen Trainer zwar auch die Zeilen sehen, aber fuer eine Zahl braucht es die
   spieler_id nicht, und was die App nicht anfragt, kann sie nicht anzeigen.
   Der Block steht ausserhalb von nutzungLaden, damit er auch dann erscheint, wenn im
   Zeitraum noch kein einziger Nutzungseintrag liegt. */
async function kindGeraeteLaden(){
  const box=document.getElementById("nutzung-kinder"); if(!box)return;
  let d=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_geraete_stat`,{method:"POST",headers:{...sbAuthHeaders(),"Content-Type":"application/json"},body:"{}"});
    if(r.ok)d=await r.json();
  }catch(e){}
  if(!document.getElementById("nutzung-kinder"))return;
  if(!d||!d.ok){ box.innerHTML=""; return; }
  const limit=d.geraete?(d.limit_min===d.limit_max?`${d.limit_min} Min.`:`${d.limit_min}–${d.limit_max} Min.`):"–";
  box.innerHTML=`<div style="border:var(--border-s);border-radius:var(--rl);padding:10px 12px;margin-bottom:12px">
    <div style="font-size:var(--s-text);font-weight:800">📱 Kinder-App</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-top:4px;line-height:1.6">
      ${d.geraete===0
        ? "Noch kein Gerät gekoppelt. Die Eltern erzeugen den Code in ihrem Bereich unter „Für die Kinder“."
        : `<b>${d.geraete}</b> ${d.geraete===1?"Gerät":"Geräte"} bei <b>${d.kinder}</b> ${d.kinder===1?"Kind":"Kindern"} gekoppelt · heute ${d.heute_aktiv===0?"noch keins":`<b>${d.heute_aktiv}</b> aktiv`}${d.minuten_heute?` (${d.minuten_heute} Min.)`:""} · Appzeit ${limit} am Tag`}
      ${d.getrennt?`<br><span style="color:var(--text3)">${d.getrennt} ${d.getrennt===1?"Gerät wurde":"Geräte wurden"} wieder getrennt.</span>`:""}
    </div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">Nur Summen – welches Kind welches Gerät hat, entscheiden und sehen die Eltern.</div>
  </div>`;
}
function _nutzungZeitraumHtml(){
  return [7,30,90].map(t=>`<button class="btn btn-sm" aria-pressed="${t===_nutzungTage?"true":"false"}" onclick="nutzungLaden(${t})"
    style="flex:1;font-weight:${t===_nutzungTage?"800":"500"};${t===_nutzungTage?"background:var(--blue);color:#fff;border-color:var(--blue)":""}">${t} Tage</button>`).join("");
}
/* Alle Kacheln und Aktionen, die es gibt – aus denselben Kachelseiten, die der Nutzer
   sieht. So faellt „nie benutzt" nicht aus einer gepflegten Liste, sondern aus dem Bestand. */
function _nutzungAlleAktionen(){
  const out=new Set();
  try{
    Object.keys(KACHELN).forEach(k=>{
      const html=_kachelInhalt(k)||"";
      const re=/kachelRun\('([^']+)'(?:,'([^']*)')?\)/g; let mm;
      while((mm=re.exec(html)))out.add(mm[1]+(mm[2]!==undefined?":"+mm[2]:""));
    });
  }catch(e){}
  return out;
}
async function nutzungLaden(tage){
  _nutzungTage=tage;
  const zr=document.getElementById("nutzung-zeitraum"); if(zr)zr.innerHTML=_nutzungZeitraumHtml();
  const box=document.getElementById("nutzung-body"); if(!box)return;
  let rows=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/nutzung_auswertung`,{method:"POST",headers:{...sbAuthHeaders(),"Content-Type":"application/json"},body:JSON.stringify({p_tage:tage})});
    if(sbCheck401(r))return;
    if(!r.ok){box.innerHTML=`<div style="font-size:var(--s-text);color:var(--text2)">Auswertung gerade nicht erreichbar – später noch einmal öffnen.</div>`;return;}
    rows=(await r.json())||[];
  }catch(e){box.innerHTML=`<div style="font-size:var(--s-text);color:var(--text2)">Kein Netz – die Auswertung braucht den Server.</div>`;return;}
  if(!document.getElementById("nutzung-body"))return;
  if(!rows.length){box.innerHTML=`<div style="font-size:var(--s-text);color:var(--text2)">Noch keine Einträge in den letzten ${tage} Tagen. Das Log läuft seit v453 – einfach benutzen, die Zahlen kommen von selbst.</div>`;return;}
  const tageHer=ts=>{const d=Math.round((Date.now()-new Date(ts))/864e5);return d<=0?"heute":d===1?"gestern":`vor ${d} Tagen`;};
  const gruppe=(titel,ereignis,rolle)=>{
    const l=rows.filter(x=>x.ereignis===ereignis&&(!rolle||x.rolle===rolle)).sort((a,b)=>b.anzahl-a.anzahl);
    if(!l.length)return "";
    const max=Math.max(...l.map(x=>+x.anzahl));
    return `<div style="font-size:var(--s-text);font-weight:800;margin:14px 0 6px">${titel}</div>`+l.map(x=>`
      <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;font-size:var(--s-text);padding:5px 0;border-top:1px solid var(--rand-bedien)">
        <div style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis">${esc(x.ziel||"–")}</div>
          <div style="height:4px;border-radius:2px;background:var(--surface2);margin-top:4px"><div style="height:4px;border-radius:2px;background:var(--blue);width:${Math.max(4,Math.round(100*x.anzahl/max))}%"></div></div></div>
        <div style="text-align:right;font-variant-numeric:tabular-nums"><b>${x.anzahl}</b>×<div style="font-size:var(--s-klein);color:var(--text2)">${x.nutzer} Nutzer</div></div>
        <div style="font-size:var(--s-klein);color:var(--text2);text-align:right;min-width:60px">${tageHer(x.zuletzt)}</div>
      </div>`).join("");
  };
  const benutzt=new Set(rows.filter(x=>x.ereignis==="aktion").map(x=>x.ziel));
  const nie=[..._nutzungAlleAktionen()].filter(a=>!benutzt.has(a)).sort();
  box.innerHTML=
    gruppe("Bereiche (Reiter)","bereich","trainer")+
    gruppe("Kacheln","kachel","trainer")+
    gruppe("Aktionen in den Kacheln","aktion","trainer")+
    gruppe("Eltern-Bereich","eltern-bereich")+
    gruppe("Sonderseiten","route")+
    (nie.length?`<div style="font-size:var(--s-text);font-weight:800;margin:14px 0 6px">Nie benutzt in ${tage} Tagen (${nie.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${nie.map(a=>`<span style="font-size:var(--s-klein);padding:3px 8px;border-radius:10px;background:var(--surface2);color:var(--text2);border:1px solid var(--rand-bedien)">${esc(a)}</span>`).join("")}</div>
      <div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">Kandidaten fürs Ausmisten – erst nach 4–6 Wochen Daten entscheiden.</div>`:"");
}
async function nutzungAufraeumen(){
  if(!confirm("Alle Log-Einträge löschen, die älter als 90 Tage sind?"))return;
  const bis=new Date(Date.now()-90*864e5).toISOString();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nutzung_log?ts=lt.${encodeURIComponent(bis)}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(r.ok)toast("Alte Einträge gelöscht ✓"); else toast("Löschen nicht möglich","err");
  }catch(e){toast("Kein Netz","err");}
  nutzungLaden(_nutzungTage);
}

async function renderHome(){
  const box=document.getElementById("home-content");
  if(!box)return;
  if(!window._tourChecked){window._tourChecked=true;setTimeout(tourMaybe,700);} // Feature-Tour beim ersten Start
  const heute=isoLokal();
  const card=(inner,accent)=>`<div style="background:var(--surface);border:var(--border-s);${accent?`border-left:3px solid ${accent};`:""}border-radius:var(--rl);padding:12px 14px;margin-bottom:10px">${inner}</div>`;
  const homeTool=(label,fn)=>`<button onclick="${fn}" style="flex:1 1 calc(50% - 4px);min-width:140px;min-height:46px;border:1px solid var(--rand-bedien);border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:var(--s-text);font-weight:700;color:var(--text);background:var(--surface);text-align:left;padding:0 12px">${label}</button>`;

  // ── Quick-Stats (sofort, aus lokalen Daten) ──
  /* v636: nur aktive Kinder zählen, und „überfällig“ heißt „bewertet, aber älter als 6 Wochen“.
     Vorher zählte der Nenner inaktive Kinder und jedes nie bewertete Kind als überfällig –
     nach dem Saisonstart stand der ganze Kader in Rot. */
  const names=typeof kaderNamen==="function"?kaderNamen():Object.keys(DB||{});
  const bewertet=names.filter(n=>DB[n]&&DB[n].length).length;
  // v648: fällig nach 49 Tagen, vor dem Startdatum der Bewertungen nie
  const stale=typeof bewKindFaellig==="function"?names.filter(bewKindFaellig).length:0;
  const statTile=(val,lbl,col,jump)=>`<div role="button" tabindex="0" onclick="${jump}" class="card" style="flex:1;min-width:90px;padding:10px;text-align:center;cursor:pointer">
    <div style="font-size:var(--s-seite);font-weight:800;color:${col}">${val}</div>
    <div style="font-size:var(--s-klein);color:var(--text2)">${lbl}</div></div>`;

  // Geburtstage: seit v660 ein eigener Slot (#home-geb), gefüllt von homeGeburtstage().

  // Team-Quests leben jetzt im Spieltag (dort werden sie gezählt & geschafft) – nicht mehr auf der Startseite.
  let onboardHtml="";
  /* v682: Die drei Startschritte zeigen sich nur, solange es noch keinen Kader gibt – für ein
     laufendes Team standen sie als erste Karte da, bis jemand „ausblenden“ fand. */
  try{ if(!localStorage.getItem("adler_onboarded")&&!names.length) onboardHtml=`<div id="onboard-card" class="card" style="padding:16px;margin-bottom:12px;border-left:3px solid var(--blue)">
    <div style="font-weight:800;font-size:var(--s-karte);margin-bottom:2px">👋 Willkommen im Adler-Trainer!</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:12px">In 3 Schritten startklar:</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn" style="justify-content:flex-start" onclick="go('kader')"><i class="ti ti-users"></i>1️⃣ Kader anlegen / prüfen</button>
      <button class="btn" style="justify-content:flex-start" onclick="go('termine')"><i class="ti ti-calendar-plus"></i>2️⃣ Ersten Termin eintragen</button>
      <button class="btn" style="justify-content:flex-start" onclick="openTab('spieltag')"><i class="ti ti-ball-football"></i>3️⃣ Am Spieltag loslegen</button>
    </div>
    <button onclick="onboardingDismiss()" style="margin-top:10px;background:transparent;border:none;color:var(--text3);font-family:inherit;font-size:var(--s-klein);cursor:pointer;text-decoration:underline">Alles klar, ausblenden</button>
  </div>`; }catch(e){}
  /* N1-Umbau (PO + Trainerkollegen: „zu überladen"): Die Startseite ist nur noch
     To-Do-Banner → Diese Woche → 6 Kacheln (2×3). ALLE Werkzeuge leben
     jetzt hinter den Kachelseiten (kachelOpen) – nichts wurde gelöscht, nur einsortiert. */
  box.innerHTML=`
    <div id="push-hinweis-slot-trainer"></div>
    ${onboardHtml}
    <div id="la-trainer"></div>
    <div id="eg-trainer"></div>
    <div id="home-wiewars"></div>
    <div id="home-heimspiel"></div>
    <div id="trainer-todo-slot"></div>
    <div id="home-kindideen"></div>
    <div id="trainer-termine-slot"></div>
    <!-- v682: Die sechs Bereiche stehen direkt unter dem, was zu tun ist – nicht erst nach
         Woche, Terminen und Geburtstagen am Seitenende. -->
    <!-- v718 „entschlacken“: drei Spalten statt zwei, halbe Höhe – die Leiste unten führt
         ohnehin in dieselben Bereiche, die Kacheln tragen vor allem die Live-Hinweise. -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 12px" id="home-bereiche">
      ${kachelTile("training","🏃","Training","var(--fam-training)","var(--fam-training-2)")}
      ${kachelTile("spieltag","⚽","Spieltag","var(--fam-spieltag)","var(--fam-spieltag-2)")}
      ${kachelTile("team","👥","Team","var(--fam-team)","var(--fam-team-2)")}
      ${kachelTile("taktik","🎯","Taktik","var(--fam-taktik)","var(--fam-taktik-2)")}
      ${kachelTile("elki","🪶","Eltern & Kinder","var(--fam-elki)","var(--fam-elki-2)")}
      ${kachelTile("orga","📅","Orga","var(--fam-orga)","var(--fam-orga-2)")}
    </div>
    <div id="home-woche"></div>
    <div id="home-next"></div>
    <div id="home-meeting"></div>
    <div id="home-geb"></div>
    <div id="trainer-alle-termine-slot"></div>
    <div id="app-version" style="text-align:center;font-size:var(--s-klein);color:var(--text3);margin:14px 0 4px"></div>`;
  if(typeof pushKarteRender==="function"&&typeof sbToken==="function"&&sbToken())pushKarteRender("push-hinweis-slot-trainer","trainer");   // v698
  homeGeburtstage();   // v660: Kinder und Eltern, nächste 14 Tage
  appVersionInto("app-version");   // liest die Version aus dem geladenen Cache
  elterngespraecheTrainerLoad(); // offene Elterngespräch-Wünsche (handeln nötig → bleibt oben)
  loeschantraegeTrainerLoad();   // v644: offene Löschanträge (Frist ein Monat → ganz oben)
  trainerTodoLoad();             // To-Do-Banner (leer = unsichtbar)
  if(typeof kindTrainingHomeKarte==="function")kindTrainingHomeKarte("home-kindideen");   // v751: Trainingsideen der Kinder (md-kindtraining.js, Welle 2)
  if(typeof wieWarsKarte==="function")wieWarsKarte();   // v679: „Wie war's?“ / „Noch zu bestätigen“ (md-tagebuch.js, Welle 2)
  homeWocheLoad();               // Diese Woche: Termine mit Zusagen, Trainern, Plan-Stand
  homeHeimspielLoad();           // v702: Heimspiel in den nächsten sechs Tagen
  trainerTermineHomeLoad();      // Termine der nächsten 14 Tage zum Antippen
  trainerMeetingHomeLoad();      // festgelegtes Trainer-Meeting (steht nicht in `termine`)
  if(typeof tlCheck==="function")tlCheck(); // läuft gerade ein Trainingsstart? → Bereit-Fenster ploppt auf
  if(stale>0){const b=document.getElementById("kb-team");if(b)b.textContent=stale+" Bewertungen fällig";}
  // ── Next Event (async nachladen, damit das Dashboard sofort steht) ──
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&datum=gte.${heute}&order=datum.asc,uhrzeit.asc.nullslast&limit=10`,{headers:sbAuthHeaders()});
    const slot=document.getElementById("home-next");
    if(!slot)return; // Nutzer hat den Tab schon verlassen
    if(!r.ok){slot.innerHTML=card('<div style="font-size:var(--s-text);color:var(--text3)">Termine offline nicht verfügbar.</div>');return;}
    const rows=(await r.json()).filter(t=>!(typeof terminVorbei==="function"&&terminVorbei(t)));
    if(typeof TM_TERMINE!=="undefined")TM_TERMINE=rows; // Detail-/Karussell-Klick auf der Startseite findet den Termin (sonst Fallback auf go('termine'))
    /* v472: Das Termin-Karussell ist weg. Es zeigte dieselben Termine, die „Diese Woche"
       direkt darüber schon als Zeilen fuehrt – dieselbe Information zum dritten Mal auf
       einer Seite (nach „Bist du dabei?" und „Diese Woche"). v458 hatte „Naechster Termin"
       aus demselben Grund entfernt; das Karussell war der Rest davon. */
    // Live-Badges auf den Kacheln (aus demselben Termin-Abruf – kostet nichts extra)
    try{
      const kurz=t=>{const d=new Date(t.datum+"T00:00:00");return ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+" "+(t.uhrzeit?String(t.uhrzeit).slice(0,5):d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}));};
      const setB=(id,t)=>{const b=document.getElementById(id);if(b&&t)b.textContent=kurz(t);};
      /* v509: Ein abgesagter Termin ist nicht „der nächste" – die Kachel führt sonst in
         eine Planung, die niemand mehr braucht. Die Zeile in „Diese Woche" zeigt die
         Absage weiterhin, dort gehört sie hin. */
      const echt=x=>!(typeof terminFaelltAus==="function"&&terminFaelltAus(x));
      setB("kb-training",rows.find(x=>x.typ==="training"&&echt(x)));
      setB("kb-spieltag",rows.find(x=>(x.typ==="spiel"||x.typ==="turnier")&&echt(x)));
      /* Der Orga-Zähler stand früher hier und zählte `rows` – das sind die nächsten ZEHN
         (limit=10 in der Abfrage oben). Bei 33 Terminen las man deshalb „10 Termine
         geplant", während der Knopf zwei Zeilen höher „Alle 33 Termine" sagte. Er wird
         jetzt aus derselben Quelle gesetzt wie dieser Knopf (trainerTermineHomeLoad),
         damit beide Zahlen gar nicht mehr auseinanderlaufen KÖNNEN. */
    }catch(e){}
    /* Die Karte „Naechster Termin" stand hier – direkt unter „Diese Woche", deren erste
       Zeile derselbe Termin ist (PO: „doppeln sich"). Wetter, Packtipp, Sprungknopf und
       Gegner-Kontakt leben jetzt in der ersten Zeile der Wochenkarte (homeWocheLoad).
       Der Abruf bleibt fuer Karussell, Kachel-Badges und TM_TERMINE. */
    slot.innerHTML="";
  }catch(e){
    const slot=document.getElementById("home-next");
    if(slot)slot.innerHTML="";
  }
}

/* Wetter-Warnung fürs nächste Outdoor-Event: bei kritischer Vorhersage (≤2 Tage) ein Hinweis
   mit Schnellaktionen – Platz absagen (platz_status) + Eltern per Push informieren. */
async function wetterWarnHome(t){
  const el=document.getElementById("wetter-warn-home"); if(!el)return;
  const inTagen=Math.round((new Date(t.datum+"T00:00:00")-new Date(isoLokal()+"T00:00:00"))/864e5);
  if(inTagen<0||inTagen>2)return; // nur wenn's unmittelbar bevorsteht
  let w=null; try{ w=await wetterFetch(t.datum,t.ort,t.uhrzeit); }catch(e){}
  const warn=(typeof wetterWarn==="function")?wetterWarn(w):null; if(!warn)return;
  const abgesagt=t.platz_status==="abgesagt";
  const tt=(t.titel||t.gegner||"Termin").replace(/'/g,"");
  el.innerHTML=`<div style="margin-top:8px;padding:10px 12px;background:var(--red-bg);border:1px solid #fecaca;border-radius:10px">
    <div style="font-size:var(--s-text);font-weight:800;color:var(--red)">⚠️ Wetter kritisch: ${esc(warn.lvl)}</div>
    <div style="font-size:var(--s-klein);color:#7f1d1d;margin:2px 0 8px">${esc(warn.msg)} Absagen und die Eltern informieren?</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${abgesagt?'<span style="font-size:var(--s-klein);color:var(--red);font-weight:700">🔴 Bereits als „fällt aus" markiert</span>':`<button class="btn btn-sm btn-d" onclick="wetterAbsagen(${Number(t.id)})"><i class="ti ti-x"></i>Platz absagen</button>`}
      <button class="btn btn-sm" onclick="wetterInfoPush(${Number(t.id)},'${tt}','${t.datum}')"><i class="ti ti-bell"></i>Eltern informieren</button>
    </div>
  </div>`;
}
async function wetterAbsagen(id){
  if(typeof platzAmpelSet==="function")await platzAmpelSet(id,"abgesagt");
  const el=document.getElementById("wetter-warn-home");
  if(el)el.querySelector("div>div:last-child").innerHTML='<span style="font-size:var(--s-klein);color:var(--red);font-weight:700">🔴 Als „fällt aus" markiert – jetzt noch die Eltern informieren.</span>';
}
async function wetterInfoPush(id,titel,datum){
  const d=new Date(datum+"T00:00:00"), ds=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  if(typeof pushSendToParents==="function")await pushSendToParents("🌧️ Wetter-Update",`${titel} am ${ds}: Bitte in der App den Platz-Status prüfen.`,appRoot()+"?portal");
  else toast("Push nicht verfügbar","err");
}
/* Der einklappbare „Team-Check" der alten Startseite ist beim Kachel-Umbau weggefallen;
   die Zahlen (Kader/bewertet/überfällig) leben in der Team-Kachel weiter. Nur der
   „Kein Kind übersehen"-Radar hing an toggleTeamCheck und war damit unerreichbar –
   er sitzt jetzt direkt in der Team-Kachel (#home-radar, lazy beim Öffnen). */
function toggleTeamCheck(){ if(typeof homeRadarLoad==="function")homeRadarLoad(); }

/* ── Trainer-To-Dos (PO-Wunsch, Muster wie die Eltern-To-Dos): persönliche offene Punkte
   des EINGELOGGTEN Trainers ganz oben auf der Startseite. Quellen: offene „Trainer dabei?"-
   Antworten, Einheit-Nachbewertung (wenn laut Trainingsplan eingeteilt), rollierendes
   Sprachlob nach Spielen (deterministisch: termin.id % Trainerzahl). ── */
/* Der Anzeigename kommt aus profiles.anzeigename. Frueher stand hier eine Map von
   E-Mail auf Vorname - damit lagen fuenf private Adressen im Quelltext einer
   oeffentlichen App und wurden an jeden Besucher ausgeliefert. Die RLS auf profiles
   gibt jedem genau seine eigene Zeile, deshalb reicht der Filter auf die eigene id. */
/* NUR Erfolge werden gemerkt. Vorher wurde auch das leere Ergebnis dauerhaft
   zwischengespeichert – ein einziger Aufruf ohne gueltigen Token (abgemeldet, oder
   waehrend sbToken() kurz vor Ablauf null liefert) machte den Namen fuer den Rest
   der Sitzung leer. Da tlStart den Namen nicht nur anzeigt, sondern als IDENTITAET
   benutzt, endete das in „Bitte als Trainer anmelden" bei jedem Trainingsstart,
   obwohl man laengst angemeldet war. Solange kein Name feststeht, wird bei jedem
   Aufruf neu gefragt (die Aufrufe sind selten und gedrosselt). */
let _meTrainer=null;
function trainerMeReset(){_meTrainer=null;} // bei An- und Abmeldung: der Name gehoert zum Konto
async function trainerMe(){
  if(_meTrainer)return _meTrainer;
  if(!sbToken())return ""; // ohne Token gar nicht erst fragen – und nichts merken
  try{
    const r=await fetch(`${SB_URL}/auth/v1/user`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+sbToken()}});
    if(r.ok){
      const u=await r.json();
      if(u&&u.id){
        const p=await fetch(`${SB_URL}/rest/v1/profiles?select=anzeigename&id=eq.${encodeURIComponent(u.id)}`,{headers:sbAuthHeaders()});
        if(p.ok){
          const zeilen=await p.json();
          const name=((zeilen&&zeilen[0]&&zeilen[0].anzeigename)||"").trim();
          if(name){_meTrainer=name;return name;}
        }
      }
    }
  }catch(e){}
  return ""; // bewusst NICHT merken
}
/* v471: „Ohne Ergebnis abhaken." Der PO kommt nicht immer dazu, Ergebnis und Bericht
   nachzutragen – dann soll das To-Do verschwinden duerfen, statt dauerhaft zu mahnen.
   Die Entscheidung haengt am Termin und gilt fuer das ganze Trainerteam (PO): sonst
   haekt sie jeder Trainer einzeln weg. Rueckgaengig geht es im Termin selbst, indem
   doch ein Ergebnis eingetragen wird. */
async function todoOhneErgebnis(id){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${Number(id)}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({ohne_ergebnis:true})});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){toast("Konnte nicht abgehakt werden","err");return;}
  }catch(e){toast("Kein Netz – bitte gleich nochmal","err");return;}
  toast("Abgehakt – ohne Ergebnis ✓");
  trainerTodoLoad();
}
async function trainerTodoLoad(){
  const slot=document.getElementById("trainer-todo-slot"); if(!slot)return;
  if(!sbToken()){slot.innerHTML="";return;}
  const me=await trainerMe(); if(!me){slot.innerHTML="";return;}
  const heute=isoLokal();
  const vor14=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  const vor7=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
  const todos=[];
  /* a) „Bist du dabei?" stand hier als Zähler und ist seit v403 eine eigene Karte direkt
     darunter – mit den Terminen im Klartext statt einer Zahl. Zwei Elemente auf demselben
     Bildschirm, die dasselbe sagen, kosten nur Platz; deshalb hier gestrichen. */
  // b) Einheit nachbereiten, wenn du laut Trainingsplan eingeteilt warst
  try{
    /* v633: neueste zuerst – sonst verdrängten zwei alte Einheiten die von gestern. Bewertungen
       von vor v630 tragen den Autor „Trainerteam“ und gelten für alle als erledigt. */
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?select=datum,plan&datum=gte.${vor14}&datum=lt.${heute}&order=datum.desc`,{headers:sbAuthHeaders()});
    const r2=await fetch(`${SB_URL}/rest/v1/einheit_bewertung?select=datum&datum=gte.${vor14}&autor=in.(${encodeURIComponent('"'+(me||"")+'"')},Trainerteam)`,{headers:sbAuthHeaders()});   // v630: je Trainer
    if(r.ok){
      const done=new Set(r2.ok?((await r2.json())||[]).map(x=>x.datum):[]);
      const meine=((await r.json())||[]).filter(row=>!done.has(row.datum)&&JSON.stringify(row.plan||"").includes(`"${me}"`));
      meine.slice(0,2).forEach(row=>{const d=new Date(row.datum+"T00:00:00");
        todos.push({emo:"⭐",txt:`Einheit vom ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})} nachbereiten – du warst eingeteilt`,act:`einheitBewertenOpen('${row.datum}')`,termin:"d"+row.datum});});
    }
  }catch(e){}
  // c) Sprachlob rollierend nach dem letzten Spiel/Turnier
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,datum,titel,gegner&typ=in.(spiel,turnier)&datum=gte.${vor7}&datum=lt.${heute}&order=datum.desc&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const t=((await r.json())||[])[0];
      if(t&&typeof TRAINER!=="undefined"&&TRAINER.length){
        const dran=TRAINER[Number(t.id)%TRAINER.length];
        if(dran===me){
          let done=false;
          try{const l=await fetch(`${SB_URL}/rest/v1/kabine_lob?select=id&created_at=gte.${t.datum}&limit=1`,{headers:sbAuthHeaders()});if(l.ok)done=((await l.json())||[]).length>0;}catch(e){}
          if(!done)todos.push({emo:"🎤",txt:`Du bist dran: Sprachlob für die Kabine (nach ${esc(t.titel||t.gegner||"dem Spiel")})`,act:"kaderEditOpen()"});
        }
      }}
  }catch(e){}
  // d) Trainer-Meeting-Umfrage: offene Doodles, in denen MEINE Stimme noch fehlt (PO-Regel:
  //    bleibt To-Do, bis abgestimmt ist – eine Stimme auf irgendeinem Slot genügt)
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?status=neq.entschieden&select=id,titel`,{headers:sbAuthHeaders()});
    if(r.ok){
      const polls=(await r.json())||[];
      if(polls.length){
        const uid=(typeof sbUserId==="function")?sbUserId():null;
        const pids=polls.map(p=>p.id).join(",");
        const rs=await fetch(`${SB_URL}/rest/v1/trainer_poll_slot?poll_id=in.(${pids})&select=id,poll_id`,{headers:sbAuthHeaders()});
        const slots2=rs.ok?((await rs.json())||[]):[];
        const sids=slots2.map(s=>s.id);
        const mine=new Set();
        if(uid&&sids.length){
          const rv=await fetch(`${SB_URL}/rest/v1/trainer_poll_vote?slot_id=in.(${sids.join(",")})&voter=eq.${uid}&select=slot_id`,{headers:sbAuthHeaders()});
          if(rv.ok)((await rv.json())||[]).forEach(v=>mine.add(v.slot_id));
        }
        const byPoll={}; slots2.forEach(s=>{(byPoll[s.poll_id]=byPoll[s.poll_id]||[]).push(s.id);});
        polls.forEach(p=>{
          const ss=byPoll[p.id]||[];
          if(ss.length&&!ss.some(id=>mine.has(id)))
            todos.push({emo:"🗳️",txt:`Trainer-Meeting „${esc(p.titel)}“: bitte abstimmen`,act:"trainerMeetingOpen()"});
        });
      }
    }
  }catch(e){}
  /* e) „Ergebnis nachtragen“ ist mit v634 gestrichen. PO: „Ergebnisse zählen bei uns in der U9
     noch nicht. Deswegen sind die aktuell eher unwichtig.“ Wer eines festhalten will, trägt es im
     Termin-Fenster ein; die App erinnert nicht mehr daran. An seine Stelle tritt f). */
  /* f) Spiel oder Festival nachbereiten (v525). Erst NACH dem Ergebnis-To-Do: solange das
     Ergebnis fehlt, steht schon eine Zeile zu diesem Termin da, und zwei Aufgaben zum selben
     Tag nebeneinander lesen sich wie ein Vorwurf. fazitOffene liegt in Welle 2 – ohne die
     Pruefung reisst ein fehlendes Modul den ganzen Block mit. */
  try{
    if(typeof fazitOffene==="function"){
      const offen=await fazitOffene(14);
      offen.slice(0,2).forEach(t=>{
        const d=new Date(t.datum+"T00:00:00");
        todos.push({emo:t.typ==="turnier"?"🏆":"⚽",txt:`${t.typ==="turnier"?"Festival":"Spiel"} ${esc(t.titel||t.gegner||"")} (${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}) nachbereiten – erzählen, fürs Tagebuch`,
          act:`(typeof fazitOpen==='function'?fazitOpen(${Number(t.id)}):go('termine'))`,termin:"t"+Number(t.id)});
      });
    }
  }catch(e){}
  /* v634: Der gemeinsame Einstieg steht immer da – unter den To-dos oder, wenn nichts offen
     ist, als schmale Zeile. Nachbereiten ist keine Pflicht, die erst ein To-do auslösen muss. */
  const einstieg=`<button class="btn" onclick="einheitBewertenOpen()" style="width:100%;min-height:44px;justify-content:center;margin-top:${todos.length?4:0}px">📝 Nachbereiten – Training, Spiel, Festival</button>`;
  if(!todos.length){slot.innerHTML=`<div style="margin-bottom:10px">${einstieg}</div>`;return;}
  slot.innerHTML=`<div class="card" style="border-left:4px solid var(--amber);padding:12px 14px;margin-bottom:10px">
    <div style="font-size:var(--s-karte);font-weight:900;color:var(--text);margin-bottom:8px">📌 Deine To-dos, ${esc(me)}</div>
    ${todos.map(t=>`<div class="todo-zeile"${t.termin?` data-termin="${esc(t.termin)}"`:""} style="display:flex;gap:6px;align-items:stretch;margin-bottom:6px">
      <button onclick="${t.act}" style="display:flex;gap:10px;align-items:center;flex:1;min-width:0;text-align:left;background:var(--surface);border:1px solid var(--rand-bedien);border-radius:10px;padding:10px 12px;font-family:inherit;cursor:pointer;color:var(--text)"><span style="font-size:var(--s-teil);line-height:1">${t.emo}</span><span style="flex:1;font-size:var(--s-text);font-weight:600;line-height:1.4">${t.txt}</span><span style="color:var(--text3)">›</span></button>
      ${t.hakenAct?`<button onclick="${t.hakenAct}" title="Erledigt – ohne Ergebnis abhaken. Gilt für das ganze Trainerteam." aria-label="To-Do abhaken" style="flex:none;min-width:48px;min-height:44px;background:var(--surface);border:1px solid var(--rand-bedien);border-radius:10px;font-size:var(--s-teil);cursor:pointer;color:var(--green);font-family:inherit">✓</button>`:""}
    </div>`).join("")}
    ${einstieg}
  </div>`;
  todoDoppelWeg();
}
/* v685: „Wie war's?“ (md-tagebuch.js) und das To-do „… nachbereiten – erzählen“ zeigten denselben
   Termin zweimal untereinander, mit zwei Wegen in dieselbe Nachbereitung. Die Karte gewinnt – sie
   ist der schnellere Weg (einmal erzählen). Beide laden unabhängig; wer zuletzt fertig ist, ruft
   dies hier auf. Bleibt kein To-do übrig, schrumpft der Kasten auf die Zeile „Nachbereiten“. */
function todoDoppelWeg(){
  const key=window._wieWarsKey, slot=document.getElementById("trainer-todo-slot");
  if(!key||!slot)return;
  slot.querySelectorAll(`.todo-zeile[data-termin="${key}"]`).forEach(z=>z.remove());
  if(!slot.querySelector(".todo-zeile")){
    const ein=[...slot.querySelectorAll("button")].find(b=>/Nachbereiten – Training/.test(b.textContent));
    if(ein){ein.style.marginTop="0";const w=document.createElement("div");w.style.marginBottom="10px";w.appendChild(ein);slot.innerHTML="";slot.appendChild(w);}
  }
}
/* „Bist du dabei?": je ein Tap (✅/🤔/❌) speichert sofort – nochmal tippen nimmt die
   Antwort zurück.
   PO v402: „es ist wichtig das ich alle zukünftigen Termine ansehen kann und dort meine
   Anwesenheit sehen und ändern kann." Vorher war die Liste auf drei Wochen begrenzt –
   bei 38 Trainingsterminen bis Weihnachten war der Rest unerreichbar. Kein Fenster mehr;
   stattdessen Monats-Überschriften zur Orientierung und ein Filter für die offenen.
   PO v403: „eine terminliste mit allen anstehenden Terminen. Zum einfach anklicken.
   Auf der Startseite die Termine in den nächsten 14 Tagen. Aber es muss auch eine gesamte
   Ansicht möglich sein." Also beides: die nächsten 14 Tage stehen offen auf der Startseite
   (kein Zähler, der erst aufgeklappt werden muss), der Rest hängt einen Tap dahinter.
   EIN Datenbestand für beide Ansichten – sonst zeigt die Karte etwas anderes als der
   Dialog, sobald man in einem von beiden antwortet. */
let _trsvpRows=[], _trsvpMe="", _trsvpNurOffen=false, _trsvpGeladen=0;
async function _trsvpLoad(){
  if(_trsvpRows.length&&Date.now()-_trsvpGeladen<30000)return true; // frisch genug
  const heute=isoLokal();
  // Alles ab heute, ohne obere Grenze. 300 deckt auch eine komplette Saison ab.
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,datum,uhrzeit,typ,titel,gegner,trainer_status,platz_status,platz_status_note&datum=gte.${heute}&order=datum.asc,uhrzeit.asc.nullslast&limit=300`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return false;
    if(!r.ok)return false;
    _trsvpRows=(await r.json())||[]; _trsvpGeladen=Date.now(); return true;
  }catch(e){return false;}
}
function _trsvpOffen(){ return _trsvpRows.filter(t=>!(t.trainer_status||{})[_trsvpMe]); }
function _trsvpKopfText(){
  const offen=_trsvpOffen().length;
  return `${_trsvpRows.length} Termin${_trsvpRows.length===1?"":"e"} · ${offen?offen+" ohne deine Antwort":"alle beantwortet ✓"}`;
}
function _trsvpFilterHtml(){
  const alle=_trsvpRows.length, offen=_trsvpOffen().length;
  const chip=(an,lbl,fn)=>`<button onclick="${fn}" aria-pressed="${an?"true":"false"}"
    style="min-height:44px;padding:6px 16px;border:1px solid var(--rand-bedien);border-radius:22px;font-family:inherit;font-size:var(--s-text);font-weight:${an?"700":"500"};cursor:pointer;background:${an?"var(--blue)":"var(--surface)"};color:${an?"#fff":"var(--text2)"}">${lbl}</button>`;
  return chip(!_trsvpNurOffen,`Alle (${alle})`,"trainerRsvpFilter(false)")+
         chip(_trsvpNurOffen,`Nur offene (${offen})`,"trainerRsvpFilter(true)");
}
function _trsvpListHtml(){
  const rows=_trsvpNurOffen?_trsvpOffen():_trsvpRows;
  if(!rows.length)return `<div style="font-size:var(--s-text);color:var(--text3);padding:14px;text-align:center">${
    _trsvpNurOffen?"Alle Termine beantwortet ✓":"Keine kommenden Termine eingetragen."}</div>`;
  let html="", monat="";
  rows.forEach(t=>{
    const m=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
    if(m!==monat){
      monat=m;
      html+=`<div style="position:sticky;top:0;z-index:2;background:var(--surface);font-size:var(--s-text);font-weight:800;color:var(--text);padding:8px 2px 4px">${esc(m)}</div>`;
    }
    html+=_trsvpRowHtml(t,_trsvpMe,"trsvp");
  });
  return html;
}
function trainerRsvpFilter(nurOffen){
  _trsvpNurOffen=!!nurOffen;
  const l=document.getElementById("trsvp-list"); if(l)l.innerHTML=_trsvpListHtml();
  const f=document.getElementById("trsvp-filter"); if(f)f.innerHTML=_trsvpFilterHtml();
}
function _trsvpRowHtml(t,me,pre){
  pre=pre||"trsvp";
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
  const st=(t.trainer_status||{})[me];
  const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
  const btn=(val,emo,lbl,col)=>`<button onclick="trainerRsvpSet(${Number(t.id)},'${val}')" aria-pressed="${st===val?"true":"false"}" style="flex:1;min-height:44px;border-radius:10px;border:1.5px solid ${st===val?col:"var(--rand-bedien)"};background:${st===val?col:"var(--surface)"};color:${st===val?"#fff":"var(--text2)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${emo} ${lbl}</button>`;
  /* v509: Bei einem abgesagten Termin steht das Schild da, wo sonst die drei Knöpfe sind –
     zu- oder abzusagen gibt es nichts mehr. */
  const faelltAus=typeof terminFaelltAus==="function"&&terminFaelltAus(t);
  return `<div id="${pre}-${t.id}" style="border:var(--border-s);border-left:3px solid ${faelltAus?"var(--text3)":m.col};border-radius:12px;padding:10px 12px;margin-bottom:8px;background:var(--surface)">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div style="font-size:var(--s-text);font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${faelltAus?"var(--text2)":"inherit"}">${m.icon} ${esc(t.titel||t.gegner||m.label)}</div>
      <div style="font-size:var(--s-klein);color:var(--text2);white-space:nowrap">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""}</div>
    </div>
    ${faelltAus?`<div style="margin-top:8px">${terminAbsageChip(t)}</div>`
      :`<div style="display:flex;gap:6px;margin-top:8px">${btn("ja","✅","Dabei","var(--green)")}${btn("unsicher","🤔","Unsicher","#ca8a04")}${btn("nein","❌","Nicht","var(--red)")}</div>`}
  </div>`;
}
async function trainerRsvpQuickOpen(){
  const me=await trainerMe(); if(!me){toast("Kein Trainer-Konto erkannt","err");return;}
  _trsvpMe=me; _trsvpNurOffen=false;
  await _trsvpLoad();
  document.getElementById("trsvp-modal")?.remove();
  const modal=document.createElement("div"); modal.id="trsvp-modal";
  modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Bist du dabei?");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  /* Kopf und Filter bleiben stehen, nur die Liste scrollt – bei 38 Terminen sonst
     endloses Zurückscrollen, um den Filter wieder zu erreichen. */
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4);display:flex;flex-direction:column;max-height:100%";
  c.innerHTML=`${mdlHead("trsvp-modal","🗓️","Bist du dabei?",`Ein Tap je Termin, ${esc(me)} – nochmal tippen nimmt zurück`,"var(--amber)")}
    <div id="trsvp-kopf" style="font-size:var(--s-klein);color:var(--text2);margin-bottom:8px">${_trsvpKopfText()}</div>
    <div id="trsvp-filter" style="display:flex;gap:6px;margin-bottom:10px">${_trsvpFilterHtml()}</div>
    <div id="trsvp-list" style="flex:1;min-height:0;overflow-y:auto">${_trsvpListHtml()}</div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
async function trainerRsvpSet(id,val){
  const me=await trainerMe(); if(!me)return;
  const t=_trsvpRows.find(x=>Number(x.id)===Number(id)); if(!t)return;
  const st=Object.assign({},t.trainer_status||{});
  st[me]=st[me]===val?undefined:val;           // nochmal tippen = Antwort zurücknehmen
  if(st[me]===undefined)delete st[me];
  t.trainer_status=st;
  /* Beide Ansichten mitziehen: die Zeile kann im Dialog stehen, auf der Startseiten-Karte
     oder – wenn der Dialog über der Karte liegt – an beiden Stellen gleichzeitig. */
  ["trsvp","trhome"].forEach(pre=>{
    const row=document.getElementById(pre+"-"+id); if(row)row.outerHTML=_trsvpRowHtml(t,me,pre);
  });
  /* Kopfzeile und Filter mitziehen. Die LISTE bleibt bewusst stehen: würde die gerade
     beantwortete Zeile unter dem Finger verschwinden, verliert man beim Durchgehen von
     38 Terminen sofort die Stelle. */
  const kopf=document.getElementById("trsvp-kopf"); if(kopf)kopf.textContent=_trsvpKopfText();
  const filt=document.getElementById("trsvp-filter"); if(filt)filt.innerHTML=_trsvpFilterHtml();
  const hk=document.getElementById("trhome-kopf"); if(hk)hk.textContent=_trhomeKopfText();
  const ha=document.getElementById("trainer-alle-termine-slot"); if(ha&&ha.innerHTML)ha.innerHTML=_trhomeAlleKnopfHtml();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({trainer_status:st})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
}

/* ── TRAINERPLAN: die Team-Sicht auf die Verfügbarkeit ──────────────────────────
   PO nach Markus' handgemachter Tabelle („Trainingsplan U9 I bis Herbstferien",
   Termine als Zeilen, Trainer als Spalten, ja/nein/? je Zelle, Ampel „Klappt?").
   Die Daten dafuer liegen laengst in termine.trainer_status – es fehlte nur die
   Ansicht, die sie NEBENEINANDER legt.

   Abgrenzung zu „Bist du dabei?" (trainerRsvpQuickOpen): das ist die ICH-Sicht zum
   Beantworten – eine Zeile je Termin, drei grosse Knoepfe, nur meine Antwort. Hier
   ist die TEAM-Sicht zum Planen: alle Antworten auf einen Blick, und die Frage ist
   nicht „was sage ich?", sondern „wo wird es eng?".
   Gleiche Daten (_trsvpRows), verschiedene Fragen – deshalb zwei Ansichten und
   NICHT zwei Datenbestaende (Lehre aus v423). */
/* Kurzform fuer die Spaltenkoepfe. Zwei Buchstaben reichen fuer den heutigen Stab,
   aber ein neuer Name darf keine Dublette erzeugen – bei Gleichstand wird verlaengert,
   statt zwei Spalten gleich zu beschriften. */
function _tpKuerzel(namen){
  const out={};
  namen.forEach(n=>{
    let len=2, k=n.slice(0,len);
    while(len<n.length&&Object.values(out).indexOf(k)>=0){ len++; k=n.slice(0,len); }
    out[n]=k;
  });
  return out;
}
/* Ampel je Termin – vier Stufen, allein nach der ZAHL der Zusagen (PO: „eine Schwelle
   gibt es auch nicht"). Die frueheste Fassung rechnete offene Antworten mit („kann noch
   klappen") und behauptete damit eine Mindestbesetzung, die es im Verein gar nicht gibt.
   Jetzt beschreibt die Farbe nur, was DA IST – die Bewertung macht das Trainerteam.
   Die Farbwerte stehen in styles.css (--tp-0…3): sie muessen im Dunkelmodus kippen, und
   ein Inlinestil laesst sich von einer @media-dark-Regel nicht ueberschreiben (v424). */
function _tpAmpel(status,namen){
  const s=status||{};
  let ja=0;
  namen.forEach(n=>{ if(s[n]==="ja")ja++; });
  const stufe = ja===0?0 : ja===1?1 : ja===2?2 : 3;
  return {stufe, ja, farbe:`var(--tp-${stufe})`};
}
let _tpNurEng=false;
function _tpZeilen(){
  return (_trsvpRows||[]).filter(t=>["training","spiel","turnier"].includes(t.typ));
}
function _tpNamen(){
  // trainerstabNamen statt TRAINER: wer schon geantwortet hat, gehoert in die Tabelle,
  // auch wenn er (noch) nicht im Trainingsdienst steht.
  const alle={};
  _tpZeilen().forEach(t=>Object.assign(alle,t.trainer_status||{}));
  return (typeof trainerstabNamen==="function")?trainerstabNamen(alle)
       :((typeof TRAINER!=="undefined"&&TRAINER)||[]).slice();
}
function _tpKopfHtml(namen,kurz){
  const sp=`92px repeat(${namen.length},minmax(36px,1fr))`;
  return `<div style="display:grid;grid-template-columns:${sp};gap:3px;position:sticky;top:0;z-index:2;background:var(--surface);padding:0 0 5px">
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text);align-self:end">Termin</div>
    ${namen.map(n=>`<div title="${esc(n)}" style="text-align:center;font-size:var(--s-klein);font-weight:800;color:var(--text2)">${esc(kurz[n])}</div>`).join("")}
  </div>`;
}
function _tpZelleHtml(t,name){
  const v=(t.trainer_status||{})[name];
  const look=v==="ja"      ?{bg:"#15803d",fg:"#fff",z:"✓"}
            :v==="unsicher"?{bg:"#a16207",fg:"#fff",z:"?"}
            :v==="nein"    ?{bg:"#b91c1c",fg:"#fff",z:"✕"}
            :               {bg:"var(--surface2)",fg:"var(--text3)",z:"·"};
  const lbl=v==="ja"?"dabei":v==="unsicher"?"unsicher":v==="nein"?"nicht dabei":"keine Antwort";
  return `<button onclick="tpZelleTippen(${Number(t.id)},'${String(name).replace(/'/g,"")}')"
    title="${esc(name)}: ${lbl} – tippen wechselt"
    aria-label="${esc(name)} am ${esc(t.datum)}: ${lbl}"
    style="min-height:44px;border:none;border-radius:8px;background:${look.bg};color:${look.fg};font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">${look.z}</button>`;
}
function _tpZeileHtml(t,namen){
  const a=_tpAmpel(t.trainer_status,namen);
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅"};
  const sp=`92px repeat(${namen.length},minmax(36px,1fr))`;
  return `<div id="tp-row-${t.id}" style="display:grid;grid-template-columns:${sp};gap:3px;align-items:center;padding:3px 0;border-top:var(--border)">
    <div style="border-left:4px solid ${a.farbe};padding-left:6px;min-width:0;overflow:hidden">
      <div style="font-size:var(--s-klein);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.icon} ${wtag} ${d.getDate()}.${d.getMonth()+1}.</div>
      <div style="font-size:var(--s-klein);color:${a.stufe<=1?a.farbe:"var(--text3)"};font-weight:${a.stufe<=1?"700":"400"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.ja===0?"niemand":a.ja+" dabei"}</div>
    </div>
    ${namen.map(n=>_tpZelleHtml(t,n)).join("")}
  </div>`;
}
function _tpListeHtml(){
  const namen=_tpNamen(), kurz=_tpKuerzel(namen);
  let rows=_tpZeilen();
  if(_tpNurEng)rows=rows.filter(t=>_tpAmpel(t.trainer_status,namen).stufe<=1); // 0 oder 1 Zusage
  if(!rows.length)return `<div style="font-size:var(--s-text);color:var(--text3);padding:16px;text-align:center">${
    _tpNurEng?"Überall mindestens zwei Zusagen ✓":"Keine kommenden Trainings, Spiele oder Turniere."}</div>`;
  let html=_tpKopfHtml(namen,kurz), monat="";
  rows.forEach(t=>{
    const mn=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
    if(mn!==monat){ monat=mn;
      html+=`<div style="font-size:var(--s-text);font-weight:800;color:var(--text);padding:10px 2px 2px">${esc(mn)}</div>`; }
    html+=_tpZeileHtml(t,namen);
  });
  return html;
}
function _tpFilterHtml(){
  const namen=_tpNamen();
  const alle=_tpZeilen(), eng=alle.filter(t=>_tpAmpel(t.trainer_status,namen).stufe<=1);
  const chip=(an,lbl,fn)=>`<button onclick="${fn}" aria-pressed="${an?"true":"false"}"
    style="min-height:44px;padding:6px 16px;border:1px solid var(--rand-bedien);border-radius:22px;font-family:inherit;font-size:var(--s-text);font-weight:${an?"700":"500"};cursor:pointer;background:${an?"var(--blue)":"var(--surface)"};color:${an?"#fff":"var(--text2)"}">${lbl}</button>`;
  return chip(!_tpNurEng,`Alle (${alle.length})`,"tpFilter(false)")+
         chip(_tpNurEng,`Höchstens eine Zusage (${eng.length})`,"tpFilter(true)");
}
function tpFilter(nurEng){
  _tpNurEng=!!nurEng;
  const l=document.getElementById("tp-liste"); if(l)l.innerHTML=_tpListeHtml();
  const f=document.getElementById("tp-filter"); if(f)f.innerHTML=_tpFilterHtml();
}
/* Zelle tippen: ja → unsicher → nein → offen, derselbe Zyklus wie am Termin selbst
   (tmTrainerToggle). Geschrieben wird die GANZE Statuskarte des Termins – zwei Trainer,
   die gleichzeitig tippen, ueberschreiben sich damit gegenseitig; das ist beim Doodle
   seit jeher so und bei sechs Leuten am selben Termin kein realistischer Fall. */
async function tpZelleTippen(id,name){
  const t=(_trsvpRows||[]).find(x=>Number(x.id)===Number(id)); if(!t)return;
  const st=Object.assign({},t.trainer_status||{});
  st[name]= st[name]==="ja"?"unsicher":st[name]==="unsicher"?"nein":st[name]==="nein"?undefined:"ja";
  if(st[name]===undefined)delete st[name];
  t.trainer_status=st;
  // Nur die eine Zeile neu zeichnen: bei 30 Terminen wuerde ein Neuaufbau der Liste
  // die Wischposition verlieren (Lehre aus v419).
  const namen=_tpNamen();
  const row=document.getElementById("tp-row-"+id); if(row)row.outerHTML=_tpZeileHtml(t,namen);
  const f=document.getElementById("tp-filter"); if(f)f.innerHTML=_tpFilterHtml();
  const k=document.getElementById("tp-kopf"); if(k)k.textContent=_tpKopfText();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({trainer_status:st})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
}
function _tpKopfText(){
  const namen=_tpNamen(), alle=_tpZeilen();
  const ohne=alle.filter(t=>_tpAmpel(t.trainer_status,namen).ja===0).length;
  return `${alle.length} Termine · ${ohne?ohne+" noch ohne Zusage":"überall mindestens eine Zusage ✓"}`;
}
async function trainerPlanOpen(){
  await _trsvpLoad();
  _tpNurEng=false;
  document.getElementById("tp-modal")?.remove();
  const modal=document.createElement("div"); modal.id="tp-modal";
  modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Trainerplan");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4);display:flex;flex-direction:column;max-height:100%";
  const namen=_tpNamen(), kurz=_tpKuerzel(namen);
  c.innerHTML=`${mdlHead("tp-modal","🧑‍🏫","Trainerplan","Alle Zusagen auf einen Blick","var(--blue)")}
    <div id="tp-kopf" style="font-size:var(--s-klein);color:var(--text2);margin-bottom:8px">${_tpKopfText()}</div>
    <div id="tp-filter" style="display:flex;gap:6px;margin-bottom:10px">${_tpFilterHtml()}</div>
    <div id="tp-liste" style="flex:1;min-height:0;overflow:auto">${_tpListeHtml()}</div>
    <div style="font-size:var(--s-klein);color:var(--text3);line-height:1.5;margin-top:10px;padding-top:8px;border-top:var(--border)">
      ${namen.map(n=>`<b>${esc(kurz[n])}</b> ${esc(n)}`).join(" · ")}<br>
      Tippen wechselt: ✓ dabei → ? unsicher → ✕ nicht dabei → · keine Antwort.<br>
      Balken links nach Zusagen: ${[[0,"keine"],[1,"eine"],[2,"zwei"],[3,"drei und mehr"]].map(([i,w])=>
        `<span style="white-space:nowrap"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--tp-${i});vertical-align:-1px;margin-right:3px"></span>${w}</span>`
      ).join(" · ")}.
    </div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}

/* Startseite, zwei getrennte Dinge (PO v404: „ich habe alle offenen Termine beantwortet.
   Dann kann die obere kachel verschwinden. es geht ja nur um die Erinnerung an nicht
   abgestimmte termine. darunter stehen ja dann die kommenden termine"):

   1. OBEN eine reine ERINNERUNG – nur Termine der nächsten 14 Tage, die noch OHNE deine
      Antwort sind. Ist nichts offen, ist die Karte weg. Sie zeigt nicht mehr, was ansteht;
      dafür gibt es direkt darunter „Nächster Termin" und das Karussell.
   2. UNTEN, unter den kommenden Terminen, ein dauerhafter Zugang zur Gesamtliste. Der darf
      NICHT in der Erinnerungskarte hängen: sonst verschwindet mit der letzten Antwort auch
      der einzige Weg zu allen Terminen. Er trägt den Zähler der offenen Antworten mit, auch
      der weiter entfernten – sonst wäre die Lage aus v401 zurück (33 offen, keiner in den
      nächsten 14 Tagen, nirgends ein Hinweis). */
const TRHOME_TAGE=14, TRHOME_MAX=6;
function _trhomeOffeneImFenster(){
  const bis=new Date(Date.now()+TRHOME_TAGE*864e5).toISOString().slice(0,10);
  /* v509: Nach einem abgesagten Termin wird nicht mehr gefragt, ob jemand dabei ist. */
  return _trsvpRows.filter(t=>t.datum<=bis&&!(t.trainer_status||{})[_trsvpMe]&&!(typeof terminFaelltAus==="function"&&terminFaelltAus(t)));
}
/* Die Karte zeigt genau die Termine, die BEIM AUFBAU offen waren. Antworten während des
   Lesens lassen die Zeile stehen – sonst verschwände sie unter dem Finger und die Antwort
   ließe sich nicht mehr zurücknehmen. Weg ist die Karte beim nächsten Aufbau. */
let _trhomeIds=[];
function _trhomeKopfText(){
  const offen=_trhomeIds.filter(id=>{
    const t=_trsvpRows.find(x=>Number(x.id)===Number(id));
    return t&&!(t.trainer_status||{})[_trsvpMe];
  }).length;
  return offen?`${offen} ohne deine Antwort`:"alles beantwortet ✓";
}
function _trsvpAlleOffen(){ return _trsvpRows.filter(t=>!(t.trainer_status||{})[_trsvpMe]).length; }
/* Ein Zähler, eine Quelle: der Knopf „Alle N Termine" und das Abzeichen auf der
   Orga-Kachel nennen dieselbe Zahl, weil beide aus _trsvpRows kommen. */
function _trhomeOrgaBadge(){
  const ob=document.getElementById("kb-orga"); if(!ob)return;
  const n=_trsvpRows.length;
  ob.textContent=n?n+" Termin"+(n===1?"":"e")+" geplant":"";
}
function _trhomeAlleKnopfHtml(){
  const offen=_trsvpAlleOffen();
  return `<button onclick="trainerRsvpQuickOpen()" style="display:flex;gap:6px;align-items:center;justify-content:center;width:100%;min-height:44px;margin-bottom:12px;background:var(--surface);border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);font-weight:700;color:var(--text2);cursor:pointer">🗓️ Alle ${_trsvpRows.length} Termine<span style="color:var(--text3)">›</span></button>`;
}
async function trainerTermineHomeLoad(){
  const slot=document.getElementById("trainer-termine-slot"); if(!slot)return;
  const leer=()=>{slot.innerHTML="";const a=document.getElementById("trainer-alle-termine-slot");if(a)a.innerHTML="";};
  if(!sbToken()){leer();return;}
  const me=await trainerMe(); if(!me){leer();return;}
  _trsvpMe=me;
  if(!await _trsvpLoad()){leer();return;}
  if(!document.getElementById("trainer-termine-slot"))return; // Tab schon verlassen
  if(!_trsvpRows.length){leer();return;}
  // unten: Zugang zur Gesamtliste, unabhängig von der Erinnerung
  const alle=document.getElementById("trainer-alle-termine-slot");
  if(alle)alle.innerHTML=_trhomeAlleKnopfHtml();
  _trhomeOrgaBadge();   // dieselbe Zahl auf die Orga-Kachel
  // oben: die Erinnerung – nur wenn wirklich etwas offen ist
  const offen=_trhomeOffeneImFenster();
  _trhomeIds=offen.map(t=>t.id);
  if(!offen.length){slot.innerHTML="";return;}
  const zeigen=offen.slice(0,TRHOME_MAX);
  let inhalt=zeigen.map(t=>_trsvpRowHtml(t,me,"trhome")).join("");
  if(offen.length>zeigen.length)
    inhalt+=`<div style="font-size:var(--s-klein);color:var(--text3);text-align:center;padding:2px 0 6px">und ${offen.length-zeigen.length} weitere ohne deine Antwort</div>`;
  slot.innerHTML=`<div class="card" style="border-left:4px solid var(--amber);padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px">
      <div style="font-size:var(--s-karte);font-weight:900;color:var(--text)">🗓️ Bist du dabei?</div>
      <div id="trhome-kopf" style="font-size:var(--s-klein);color:var(--text2);text-align:right">${_trhomeKopfText()}</div>
    </div>
    ${inhalt}
  </div>`;
}
/* Ein festgelegtes Trainer-Meeting auf der Startseite. Der Doodle lebt in `trainer_poll`,
   NICHT in `termine` – und das bleibt auch so: `termine` lesen angemeldete Eltern, ein
   Trainer-Meeting geht sie nichts an. Bisher verschwand ein Meeting nach dem Festlegen
   komplett: das To-Do endet mit der eigenen Stimme, danach zeigte es keine Fläche mehr.
   Deshalb hier eine eigene, nur dem Trainer sichtbare Zeile. */
async function trainerMeetingHomeLoad(){
  const slot=document.getElementById("home-meeting"); if(!slot)return;
  slot.innerHTML="";
  if(!sbToken())return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?status=eq.entschieden&decided_slot_id=not.is.null&select=id,titel,decided_slot_id`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    const polls=(await r.json())||[];
    if(!polls.length)return;
    const heute=isoLokal();
    const rs=await fetch(`${SB_URL}/rest/v1/trainer_poll_slot?id=in.(${polls.map(p=>p.decided_slot_id).join(",")})&datum=gte.${heute}&select=id,datum,uhrzeit&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});
    if(!rs.ok)return;
    const slots=(await rs.json())||[];
    if(!slots.length)return;
    // Themen mitzählen – das ist der Grund, warum man vor dem Meeting hier hineintippt
    const offen={};
    try{
      const rt=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?poll_id=in.(${polls.map(p=>p.id).join(",")})&erledigt=is.false&select=poll_id`,{headers:sbAuthHeaders()});
      if(rt.ok)((await rt.json())||[]).forEach(t=>{offen[t.poll_id]=(offen[t.poll_id]||0)+1;});
    }catch(e){}
    if(!document.getElementById("home-meeting"))return;   // Tab schon verlassen
    slot.innerHTML=slots.map(s=>{
      const p=polls.find(x=>x.decided_slot_id===s.id); if(!p)return "";
      const d=new Date(s.datum+"T00:00:00");
      const wann=d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})+(s.uhrzeit?" · "+String(s.uhrzeit).slice(0,5)+" Uhr":"");
      const tage=Math.round((d-new Date(heute+"T00:00:00"))/864e5);
      const bald=tage===0?"heute":tage===1?"morgen":"in "+tage+" Tagen";
      return `<button type="button" onclick="trainerMeetingOpen()" class="card" style="width:100%;text-align:left;border-left:4px solid #334155;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:inherit;min-height:44px">
        <span style="font-size:var(--s-teil);flex:none">🗓️</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:var(--s-text);font-weight:800;color:var(--text)">Trainer-Meeting · ${esc(bald)}</span>
          <span style="display:block;font-size:var(--s-text);font-weight:800;color:var(--text)">${esc(p.titel)}</span>
          <span style="display:block;font-size:var(--s-text);color:var(--text2)">${esc(wann)} · ${offen[p.id]?`📝 ${offen[p.id]} ${offen[p.id]===1?"Thema":"Themen"}`:"noch keine Themen"}</span>
        </span>
        <span style="color:var(--text3);flex:none">›</span>
      </button>`;
    }).join("");
  }catch(e){}
}
// Startseiten-Nudge: wer hat für den nächsten Termin (Training/Spiel/Turnier) noch nicht
// geantwortet? Ein Tap öffnet die Rückmeldungs-Übersicht mit WhatsApp-Erinnerung.
async function homeRsvpNudge(){
  const slot=document.getElementById("home-rsvp"); if(!slot)return;
  const heute=isoLokal();
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,typ,titel,gegner,datum,uhrzeit&typ=in.(training,spiel,turnier)&datum=gte.${heute}&order=datum.asc,uhrzeit.asc.nullslast&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0];}catch(e){}
  if(!t){slot.innerHTML="";return;}
  let rm=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${t.id}&select=spieler_id`,{headers:sbAuthHeaders()});if(r.ok)rm=await r.json();}catch(e){}
  const responded=new Set(rm.map(x=>x.spieler_id));
  // KADER traegt die Datenbank-ID als _id; ueber k.id zaehlte hier jedes Kind als offen
  const offen=(KADER||[]).filter(k=>k.aktiv!==false&&!responded.has(k._id!=null?k._id:k.id)).length;
  if(!offen){slot.innerHTML="";return;}
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ};
  const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  slot.innerHTML=`<div role="button" tabindex="0" onclick="rsvpOverviewOpen(${t.id})" class="card" style="padding:12px 14px;margin-bottom:10px;border-left:3px solid var(--amber);cursor:pointer;display:flex;align-items:center;gap:8px">
    <span style="font-size:var(--s-teil)">🔔</span>
    <span style="flex:1;font-size:var(--s-text)"><strong style="color:var(--amber)">${offen} ohne Rückmeldung</strong> für ${m.icon} ${esc(t.titel||t.gegner||m.label)} · ${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</span>
    <span style="font-size:var(--s-klein);font-weight:800;color:var(--blue-text)">nachfassen ›</span>
  </div>`;
}

// A4 – Anti-Frust-Radar: ein Kind, das diese Saison noch kein Torerlebnis hatte, bekommt
// (rotierend) einen sanften Hinweis, ihm bewusst eine Bühne zu geben. Pädagogik statt Tabelle.
async function homeAntiFrust(){
  const slot=document.getElementById("home-antifrust"); if(!slot)return;
  const ab=(typeof saisonStart==="function")?saisonStart():"2000-01-01";
  const tore={};
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?aktion=eq.tor&datum=gte.${ab}&select=spieler`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(a=>{if(a.spieler)tore[a.spieler]=(tore[a.spieler]||0)+1;});}catch(e){slot.innerHTML="";return;}
  const active=(KADER||[]).filter(k=>k.aktiv!==false);
  const mitTor=active.filter(k=>tore[k.name]>0).length;
  const ohne=active.filter(k=>!(tore[k.name]>0)).map(k=>k.name);
  // Nur wenn schon jemand getroffen hat (sonst ist es einfach Saisonstart) und nicht alle leer sind.
  if(mitTor>=2 && ohne.length){
    const pick=ohne[new Date().getDate()%ohne.length]; // rotiert täglich, damit alle mal drankommen
    slot.innerHTML=`<div class="card" style="padding:12px 14px;margin-bottom:10px;border-left:3px solid var(--amber);display:flex;align-items:center;gap:8px">
      <span style="font-size:var(--s-teil)">🌟</span>
      <span style="flex:1;font-size:var(--s-text)"><strong>${esc(pick)}</strong> hatte diese Saison noch kein Torerlebnis – gib ihm/ihr heute bewusst eine Bühne. 💛</span>
    </div>`;
  } else slot.innerHTML="";
}

// C4 – Geburtstags-Automatik: hat heute ein Kind Geburtstag, bietet die Startseite einen
// 1-Tap-Push-Gruß an die Eltern (idempotent pro Tag via localStorage).
async function homeBirthday(){
  const slot=document.getElementById("home-birthday"); if(!slot)return;
  const today=(KADER||[]).filter(k=>k.geb&&homeGebTage(k.geb)===0);
  if(!today.length){slot.innerHTML="";return;}
  slot.innerHTML=today.map(k=>{
    const key="adler_bday_"+isoLokal()+"_"+k.name;
    let sent=false; try{sent=!!localStorage.getItem(key);}catch(e){}
    return `<div class="card" style="padding:12px 14px;margin-bottom:10px;border-left:3px solid #ec4899">
      <div style="font-size:var(--s-text);font-weight:800">🎂 ${esc(k.name)} hat heute Geburtstag – wird ${homeAlter(k.geb)+1}!</div>
      <button onclick="birthdayPush('${(k.name).replace(/'/g,'')}','${key}')" style="width:100%;min-height:44px;margin-top:8px;border:none;border-radius:10px;background:#ec4899;color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:800;cursor:pointer">${sent?"✓ Gruß gesendet – nochmal senden":"🎉 Geburtstags-Gruß als Push senden"}</button>
    </div>`;
  }).join("");
}
async function birthdayPush(name,key){
  const url=(typeof appRoot==="function")?appRoot()+"eltern/":"./";
  const ok=(typeof pushSendToParents==="function")&&await pushSendToParents("🎂 Alles Gute!", `Unser Adler ${name} hat heute Geburtstag – das ganze Team gratuliert von Herzen! 🎉🦅`, url);
  if(ok){ try{localStorage.setItem(key,"1");}catch(e){} homeBirthday(); }
}

// Wake Lock API (nativ) – verhindert, dass das Display während der Nutzung ausgeht
let wakeLock=null;
async function requestWakeLock(){
  try{if("wakeLock" in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request("screen");}catch(e){}
}
function releaseWakeLock(){try{if(wakeLock){wakeLock.release();wakeLock=null;}}catch(e){}}
// Nach Tab-Wechsel/Bildschirm-Aus wird der Lock vom System freigegeben – wieder anfordern
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&document.getElementById("view-taktik")?.classList.contains("active"))requestWakeLock();
});


/* ═══════════════════════════════════
   STADIONHEFT (FEAT X, Print) – druckbares Programmheft mit Mannschafts-
   vorstellung. Fotos werden als Data-URL EINGEBETTET (Auth-Download ->
   Blob -> FileReader), damit sie im Druck garantiert da sind – keine
   ablaufenden Signed-URLs, kein CORS-Problem. Muster wie printZertifikat.
═══════════════════════════════════ */
async function heftFotoDataUrl(path){
  if(!path)return null;
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/spielerfotos/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return null;
    const blob=await r.blob();
    return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(blob);});
  }catch(e){return null;}
}
/* ═══ HOTFIX 19: Stadionheft-Editor (WYSIWYG) – ersetzt den Direktdruck.
   Trainer bearbeitet Titel, Einleitung, „Adler im Porträt" (bis v731 „Spieler im Fokus") + Trainer-Kommentar,
   sieht eine Live-Vorschau und druckt. Texte bleiben in localStorage erhalten.
   heftBuildHtml(cfg,{mask}) baut das Heft rein – die Nachnamen-Maskierung ist
   bereits eingebaut (Aktivierung folgt in der DSGVO-Etappe). ═══ */
let heftKader=[], heftFanfacts={}, heftTermin=null, heftFotos=[];
let heftCfg={titel:"Adler Nest · U9", einleitung:"", fokusId:"", fokusText:"", kommentar:"", mask:true};   // v636: Eltern-Version ist Standard
function heftCfgLoad(){ try{const s=JSON.parse(localStorage.getItem("adler_heft_cfg")||"null"); if(s&&typeof s==="object")heftCfg=Object.assign(heftCfg,s);}catch(e){} }
function heftCfgSave(){ try{localStorage.setItem("adler_heft_cfg",JSON.stringify(heftCfg));}catch(e){} }
// DSGVO: Nachname zu Initiale kürzen ("Max Mustermann" -> "Max M."); Einzelnamen bleiben.
function heftMaskName(name){ const p=String(name||"").trim().split(/\s+/); if(p.length<2)return p[0]||""; return p[0]+" "+p[p.length-1].charAt(0).toUpperCase()+"."; }
/* v636: Die Eltern-Version (maskiert) ist die, die ausgehängt und verteilt wird. Dort gelten
   dieselben Regeln wie im digitalen Heft: Foto und Jahrgang nur mit der Freigabe „öffentlich“. */
function heftOeffentlichOk(k){ return !!(k&&k.foto_stadionheft_ok); }
function heftJahrgang(k){ const j=String((k&&k.geb)||"").slice(0,4); return /^\d{4}$/.test(j)?j:""; }
function heftBuildHtml(cfg,opts){
  opts=opts||{}; const mask=!!opts.mask; const nm=n=>mask?heftMaskName(n):n;
  const fotoVon=i=>(!mask||heftOeffentlichOk(heftKader[i]))?heftFotos[i]:null;
  const jgVon=k=>(!mask||heftOeffentlichOk(k))?heftJahrgang(k):"";
  const cards=heftKader.map((k,i)=>{
    const foto=fotoVon(i), jg=jgVon(k);
    const initialen=(k.name||"?").trim().slice(0,1).toUpperCase();
    const spitz=heftFanfacts[k.id];
    const pos=k.lieblingsposition?cardPosLabel(k.lieblingsposition):(kartenTorwart(k)?"Torwart":"");
    return `<div class="heft-card">
      <div class="heft-foto">${foto?`<img src="${foto}" alt="">`:`<span>${esc(initialen)}</span>`}${k.nr!=null?`<div class="heft-nr">${esc(k.nr)}</div>`:""}</div>
      <div class="heft-name">${esc(nm(k.name))}${k.tw?" 🥅":""}</div>
      ${jg?`<div class="heft-spitz">Jahrgang ${esc(jg)}</div>`:""}
      ${spitz?`<div class="heft-spitz">„${esc(spitz)}"</div>`:""}
      ${pos?`<div class="heft-pos">${esc(pos)}</div>`:""}
    </div>`;
  }).join("");
  let spielHtml="";
  if(heftTermin){
    const tm=(typeof TM_META!=="undefined"&&TM_META[heftTermin.typ])||{icon:"⚽"};
    const d=new Date(heftTermin.datum+"T00:00:00");
    spielHtml=`<div class="heft-match">${tm.icon} Nächstes Spiel: ${esc(heftTermin.titel||heftTermin.gegner||"")} · ${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}${heftTermin.uhrzeit?" · "+String(heftTermin.uhrzeit).slice(0,5)+" Uhr":""}${heftTermin.ort?" · "+esc(heftTermin.ort):""}</div>`;
  }
  const einl=cfg.einleitung&&cfg.einleitung.trim()?`<div class="heft-intro">${esc(cfg.einleitung).replace(/\n/g,"<br>")}</div>`:"";
  let fokusHtml="";
  if(cfg.fokusId){
    const idx=heftKader.findIndex(k=>String(k.id)===String(cfg.fokusId));
    if(idx>=0){
      const k=heftKader[idx], foto=fotoVon(idx), jg=jgVon(k);
      const initialen=(k.name||"?").trim().slice(0,1).toUpperCase();
      fokusHtml=`<div class="heft-fokus">
        <div class="heft-fokus-foto">${foto?`<img src="${foto}" alt="">`:`<span>${esc(initialen)}</span>`}</div>
        <div class="heft-fokus-body">
          <div class="heft-fokus-badge">🦅 Adler im Porträt</div>
          <div class="heft-fokus-name">${esc(nm(k.name))}${k.nr!=null?` · #${esc(k.nr)}`:""}${jg?` · Jahrgang ${esc(jg)}`:""}</div>
          ${cfg.fokusText&&cfg.fokusText.trim()?`<div class="heft-fokus-text">${esc(cfg.fokusText).replace(/\n/g,"<br>")}</div>`:""}
        </div></div>`;
    }
  }
  const komm=cfg.kommentar&&cfg.kommentar.trim()?`<div class="heft-komm"><div class="heft-komm-h">📣 Ein Wort vom Trainerteam</div><div>${esc(cfg.kommentar).replace(/\n/g,"<br>")}</div></div>`:"";
  // I-C: Kabinen-Reporter-Rubrik (nur freigegebene Antworten, max. 6)
  let repHtml="";
  const reps=((window._heftReporter||[]).filter(x=>x.freigegeben)).slice(0,6);
  if(reps.length){
    const nameById={}; heftKader.forEach(k=>nameById[k.id]=k.name);
    repHtml=`<div class="heft-komm"><div class="heft-komm-h">🎙️ Kabinen-Reporter – die Kinder haben das Wort</div>
      ${reps.map(x=>`<div style="margin-top:6px;font-size:var(--s-text)"><b>${esc(x.frage)}</b><br>„${esc(x.antwort)}" – <i>${esc(nm(nameById[x.spieler_id]||"ein Adler"))}</i></div>`).join("")}
    </div>`;
  }
  return `<div class="heft-wrap">
    <div class="heft-head">
      <img src="logo.png" alt="SV Adler Dellbrück">
      <div class="heft-club">SV ADLER DELLBRÜCK e.V.</div>
      <div class="heft-title">${esc(cfg.titel||"Adler Nest")}</div>
      <div style="font-size:var(--s-klein);color:#64748b;font-weight:600;letter-spacing:.5px">Das Vereinsheft der jungen Adler 🪺</div>
      <div class="heft-club">Saison ${typeof saisonLabel==="function"?saisonLabel():""} · unsere Mannschaft</div>
    </div>
    ${spielHtml}
    ${einl}
    ${fokusHtml}
    <div class="heft-rubrik">⚽ Unsere Mannschaft</div>
    <div class="heft-grid">${cards}</div>
    ${repHtml}
    ${komm}
    <div class="heft-foot">Auf geht's, Adler! 🦅 · Trainerteam ${((typeof TRAINER!=="undefined"&&TRAINER)||[]).join(" · ")}</div>
  </div>`;
}
async function stadionheftOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  toast("📰 Adler Nest wird geladen…");
  heftKader=[];heftFanfacts={};heftTermin=null;heftFotos=[];window._heftReporter=[];
  // I-C: Reporter-Antworten (60 Tage) – freigegebene fürs Heft, offene für die Freigabe-Queue
  try{const ab=new Date(Date.now()-60*864e5).toISOString();
    const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?select=id,spieler_id,frage,antwort,freigegeben,created_at&created_at=gte.${ab}&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(r.ok)window._heftReporter=(await r.json())||[];}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kader?select=id,name,nr,geb,foto_path,foto_stadionheft_ok,lieblingsposition,tw,aktiv&order=nr.asc.nullslast`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)heftKader=(await r.json()).filter(k=>k.aktiv!==false);}catch(e){}
  if(!heftKader.length){toast("Kein Kader gefunden","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?select=spieler_id,spitzname`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(f=>{if(f.spitzname)heftFanfacts[f.spieler_id]=f.spitzname;});}catch(e){}
  const heute=isoLokal();
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&typ=in.(spiel,turnier)&datum=gte.${heute}&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)heftTermin=(await r.json())[0]||null;}catch(e){}
  heftFotos=await Promise.all(heftKader.map(k=>heftFotoDataUrl(k.foto_path)));
  heftCfgLoad();
  // HOTFIX 19 digital: Server-Stand ist die Quelle der Wahrheit (geräteübergreifend). Nur überschreiben, wenn eine Zeile existiert.
  try{
    const r=await fetch(`${SB_URL}/rest/v1/stadionheft?team=eq.adler1&select=*&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const row=(await r.json())[0]; if(row){
      heftCfg.titel=row.titel||heftCfg.titel;
      heftCfg.einleitung=row.einleitung||"";
      heftCfg.fokusId=row.fokus_spieler_id!=null?String(row.fokus_spieler_id):"";
      heftCfg.fokusText=row.fokus_text||"";
      heftCfg.kommentar=row.kommentar||"";
      heftCfg.published=!!row.published;
      heftCfg._pubAt=row.updated_at;
    }}
  }catch(e){}
  heftRenderEditor();
}
// KI-Auto-Entwurf: zieht Trainings/Ergebnisse/Geburtstage der letzten Wochen -> füllt Einleitung + Kommentar (frei änderbar).
async function heftAutoContent(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  const btn=document.getElementById("heft-ai-btn");
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Entwurf wird geschrieben …';}
  const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(),35000);
  try{
    const r=await fetch(`${SB_URL}/functions/v1/ki-stadionheft`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({}),signal:ctrl.signal});
    clearTimeout(to);
    if(sbCheck401(r))return;
    const d=await r.json().catch(()=>({}));
    if(!r.ok){toast(d.error||("Fehler "+r.status),"err");return;}
    if(d.einleitung){heftCfg.einleitung=d.einleitung;const el=document.getElementById("heft-f-einl");if(el)el.value=d.einleitung;}
    if(d.kommentar){heftCfg.kommentar=d.kommentar;const el=document.getElementById("heft-f-komm");if(el)el.value=d.kommentar;}
    heftCfgSave();heftRenderPreview();
    const m=d.meta||{};
    toast(`✨ Entwurf da (${m.trainings||0} Trainings, ${m.spiele||0} Spiele${m.geburtstage?", "+m.geburtstage+" 🎂":""}) – frei anpassbar`);
  }catch(e){ clearTimeout(to); toast(e&&e.name==="AbortError"?"Zeitüberschreitung – bitte nochmal":"Netzwerkfehler","err"); }
  finally{ if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-sparkles"></i> Auto-Entwurf aus den letzten Wochen (KI)';} }
}
function heftRenderEditor(){
  const old=document.getElementById("heft-modal");if(old)old.remove();
  const modal=document.createElement("div");
  modal.id="heft-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Adler-Nest-Editor");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;flex-direction:column;padding:12px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const kaderOpts=`<option value="">— keiner —</option>`+heftKader.map(k=>`<option value="${esc(k.id)}"${String(heftCfg.fokusId)===String(k.id)?" selected":""}>${esc(k.name)}${k.nr!=null?" (#"+esc(k.nr)+")":""}</option>`).join("");
  const fld="width:100%;padding:8px 10px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box;resize:vertical";
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:900px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`
    ${mdlHead("heft-modal","📰","Adler-Nest-Editor","frei bearbeiten · Vorschau live · Texte werden gemerkt","#1e3a8a")}
    <button id="heft-ai-btn" onclick="heftAutoContent()" class="btn" style="width:100%;margin-bottom:4px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;min-height:44px;font-weight:800"><i class="ti ti-sparkles"></i> Auto-Entwurf aus den letzten Wochen (KI)</button>
    <div style="font-size:var(--s-klein);color:var(--text2);margin:0 0 12px;text-align:center">Zieht Trainings, Ergebnisse & Geburtstage – kindgerecht formuliert, danach frei änderbar.</div>
    <div style="display:grid;grid-template-columns:1fr;gap:16px">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">Titel
          <input id="heft-f-titel" type="text" value="${esc(heftCfg.titel||"")}" style="${fld};min-height:44px;font-size:var(--s-karte)"></label>
        <label style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">Einleitung / Grußwort
          <textarea id="heft-f-einl" rows="3" style="${fld}">${esc(heftCfg.einleitung||"")}</textarea></label>
        <label style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">🦅 Adler im Porträt
          <select id="heft-f-fokus" style="${fld};min-height:44px;font-size:var(--s-karte)">${kaderOpts}</select></label>
        <div id="heft-portraet-hilfe"></div>
        <label style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">Porträt-Text
          <textarea id="heft-f-fokustext" rows="5" style="${fld}">${esc(heftCfg.fokusText||"")}</textarea></label>
        <label style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">📣 Trainer-Kommentar
          <textarea id="heft-f-komm" rows="3" style="${fld}">${esc(heftCfg.kommentar||"")}</textarea></label>
        <div id="heft-reporter-queue"></div>
      </div>
      <div>
        <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-bottom:6px">Vorschau</div>
        <div id="heft-preview" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;max-height:60vh;overflow:auto"></div>
      </div>
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;margin-top:12px;padding:9px 11px;background:var(--surface2);border:var(--border-s);border-radius:10px;cursor:pointer">
      <input type="checkbox" id="heft-f-mask" ${heftCfg.mask?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:0 0 auto">
      <span style="font-size:var(--s-text);color:var(--text)"><strong>🔒 Eltern-Version (Nachnamen maskiert)</strong><br><span style="font-size:var(--s-klein);color:var(--text2)">Fürs Verteilen und Aushängen: Nachnamen werden zu „Max M.“ gekürzt, Foto und Jahrgang erscheinen nur mit der Freigabe „öffentlich“. Nur für die interne Trainer-Version ausschalten.</span></span>
    </label>
    <label style="display:flex;align-items:flex-start;gap:8px;margin-top:8px;padding:9px 11px;background:${heftCfg.published?"#dcfce7":"var(--surface2)"};border:var(--border-s);border-radius:10px;cursor:pointer">
      <input type="checkbox" id="heft-f-pub" ${heftCfg.published?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:0 0 auto">
      <span style="font-size:var(--s-text);color:var(--text)"><strong>👨‍👩‍👧 Für Eltern veröffentlichen (digital)</strong><br><span style="font-size:var(--s-klein);color:var(--text2)">Sichtbar im Eltern-Bereich. Kinder erscheinen dort nur mit Vornamen (Nachnamen gekürzt); Fotos nur bei Einwilligung.${heftCfg.published&&heftCfg._pubAt?" · zuletzt "+new Date(heftCfg._pubAt).toLocaleString("de-DE"):""}</span></span>
    </label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px">
      <button class="btn btn-p" onclick="heftSaveDb()"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" onclick="heftPrintNow()"><i class="ti ti-printer"></i>Drucken</button>
      <button class="btn btn-sm" onclick="document.getElementById('heft-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);
  document.body.appendChild(modal);
  const bind=(id,key)=>{const el=document.getElementById(id);if(el)el.oninput=()=>{heftCfg[key]=el.value;heftCfgSave();heftRenderPreview();};};
  bind("heft-f-titel","titel");bind("heft-f-einl","einleitung");bind("heft-f-fokustext","fokusText");bind("heft-f-komm","kommentar");
  const fokusEl=document.getElementById("heft-f-fokus");if(fokusEl)fokusEl.onchange=()=>{heftCfg.fokusId=fokusEl.value;heftCfgSave();heftRenderPreview();heftPortraetHilfe();};
  const maskEl=document.getElementById("heft-f-mask");if(maskEl)maskEl.onchange=()=>{heftCfg.mask=maskEl.checked;heftCfgSave();heftRenderPreview();};
  const pubEl=document.getElementById("heft-f-pub");if(pubEl)pubEl.onchange=()=>{heftCfg.published=pubEl.checked;};
  heftReporterQueueRender(); // I-C: offene Kabinen-Reporter-Antworten freigeben
  heftRenderPreview();
  heftPortraetHilfe();   // v732
}
/* ═══ v732: „Adler im Porträt“ ═══
   PO 03.10.: Fan-Fakten „pro Woche ins Spielerprofil ins Adler Nest einbauen“ und „per KI einen tollen
   Bericht über den Spieler verfassen“ – Kachel „KI-Entwurf, Trainer gibt frei“. Bewusst „Adler im
   Porträt“ statt „Spieler der Woche“: reihum, keine Auszeichnung (Fairness vor Ergebnis).
   Datenschutz: An die KI gehen keine Namen. Das Kind heißt dort „Kind A“, Namen anderer Kinder in
   Freitexten werden zu „ein Mitspieler“, der Spitzname bleibt ganz draußen; den Vornamen setzt erst
   die App wieder ein. Ins Heft kommt der Text erst mit „Speichern“ durch das Trainerteam. */
function heftWochenMontag(){ const d=new Date(isoLokal()+"T12:00:00"); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.toISOString().slice(0,10); }
async function heftPortraetVerlauf(){
  try{const r=await fetch(`${SB_URL}/rest/v1/portraet_verlauf?select=spieler_id,woche&order=woche.desc`,{headers:sbAuthHeaders()});if(r.ok)return (await r.json())||[];}catch(e){}
  return [];   // vor der Migration v732 gibt es die Tabelle noch nicht – dann eben ohne Verlauf
}
function heftPortraetNaechster(kader,verlauf){
  const zuletzt={}; (verlauf||[]).forEach(v=>{ if(!zuletzt[v.spieler_id]||v.woche>zuletzt[v.spieler_id])zuletzt[v.spieler_id]=v.woche; });
  const liste=(kader||[]).slice().sort((a,b)=>{ const za=zuletzt[a.id]||"", zb=zuletzt[b.id]||""; return za<zb?-1:za>zb?1:String(a.name).localeCompare(String(b.name),"de"); });
  return liste[0]?{kind:liste[0],zuletzt:zuletzt[liste[0].id]||null}:null;
}
async function heftPortraetHilfe(){
  const el=document.getElementById("heft-portraet-hilfe"); if(!el)return;
  const v=heftPortraetNaechster(heftKader,await heftPortraetVerlauf());
  const vor=v?`<div style="font-size:var(--s-klein);color:var(--text2)">Reihum dran: <b>${esc(v.kind.name)}</b> ${v.zuletzt?"(zuletzt Woche ab "+esc(new Date(v.zuletzt+"T12:00:00").toLocaleDateString("de-DE"))+")":"(noch nie im Porträt)"}
      ${String(heftCfg.fokusId)!==String(v.kind.id)?`<button type="button" class="btn btn-sm" onclick="heftPortraetWaehle(${Number(v.kind.id)})" style="margin-left:6px;min-height:44px">Übernehmen</button>`:" ✓"}</div>`:"";
  el.innerHTML=`<div style="display:flex;flex-direction:column;gap:6px;border:var(--border-s);border-left:3px solid #7c3aed;border-radius:10px;padding:8px 10px">
    ${vor}
    <button type="button" id="heft-portraet-ki" class="btn" onclick="heftPortraetEntwurf()" ${heftCfg.fokusId?"":"disabled"} style="min-height:44px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;font-weight:800">✨ Porträt-Entwurf aus Fan-Fakten &amp; Reporter (KI)</button>
    <div style="font-size:var(--s-klein);color:var(--text3)">Ohne Namen an die KI – du liest und änderst den Text, ins Heft kommt er erst mit „Speichern“.</div>
  </div>`;
}
function heftPortraetWaehle(id){
  heftCfg.fokusId=String(id); const sel=document.getElementById("heft-f-fokus"); if(sel)sel.value=String(id);
  heftCfgSave(); heftRenderPreview(); heftPortraetHilfe();
}
const HEFT_PORTRAET_FELDER=["lieblingsverein","lieblingsspieler","adler_seit","nummer_grund","hobby","kann_gut","lieblingsessen","lieblingstier","lieblingsmusik","lieblingsfilm","fussball_erlebnis","gross_werden"];
function heftPortraetMaske(txt,eigen){
  let t=String(txt||"");
  heftKader.forEach(k=>{ const vn=String(k.name||"").trim().split(/\s+/)[0]; if(!vn)return;
    const re=new RegExp("(^|[^\\p{L}])"+vn.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?![\\p{L}])","giu");
    t=t.replace(re,(m,vor)=>vor+(String(k.id)===String(eigen)?"Kind A":"ein Mitspieler")); });
  return t;
}
async function heftPortraetEntwurf(){
  const id=heftCfg.fokusId; if(!id){toast("Bitte erst ein Kind wählen","err");return;}
  const k=heftKader.find(x=>String(x.id)===String(id)); if(!k)return;
  const btn=document.getElementById("heft-portraet-ki"); if(btn){btn.disabled=true;btn.textContent="Entwurf wird geschrieben …";}
  try{
    let ff={}, antworten=[];
    try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=eq.${Number(id)}&select=*`,{headers:sbAuthHeaders()});if(r.ok)ff=(await r.json())[0]||{};}catch(e){}
    try{const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?spieler_id=eq.${Number(id)}&select=frage,antwort,freigegeben&order=created_at.asc`,{headers:sbAuthHeaders()});if(r.ok)antworten=(await r.json())||[];}catch(e){}
    // Freitext (nicht aus den Antwortkacheln) geht nur an die KI, wenn das Trainerteam ihn schon gelesen und freigegeben hat
    const kachelFragen=new Set((typeof REPORTER_FRAGEN!=="undefined"?REPORTER_FRAGEN:[]).filter(q=>!q.frei).map(q=>q.f));
    antworten=antworten.filter(a=>kachelFragen.has(a.frage)||a.freigegeben);
    const fakten={}; HEFT_PORTRAET_FELDER.forEach(f=>{ if(ff[f])fakten[f]=heftPortraetMaske(ff[f],id).slice(0,120); });
    const payload={kind:"Kind A",torwart:!!k.tw,fakten,antworten:antworten.slice(-20).map(a=>({frage:String(a.frage||"").slice(0,120),antwort:heftPortraetMaske(a.antwort,id).slice(0,160)}))};
    if(!Object.keys(fakten).length&&!payload.antworten.length){toast("Für dieses Kind gibt es noch keine Fan-Fakten und keine Reporter-Antworten","err");return;}
    const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(),35000);
    const r=await fetch(`${SB_URL}/functions/v1/ki-portraet`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(payload),signal:ctrl.signal});
    clearTimeout(to);
    if(sbCheck401(r))return;
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.text){toast(d.error||("Fehler "+r.status),"err");return;}
    const vorname=String(k.name||"").trim().split(/\s+/)[0]||"unser Adler";
    heftCfg.fokusText=String(d.text).replace(/Kind A/g,vorname);
    const ta=document.getElementById("heft-f-fokustext"); if(ta)ta.value=heftCfg.fokusText;
    heftCfgSave(); heftRenderPreview();
    toast("✨ Entwurf da – bitte lesen und anpassen, dann „Speichern“");
  }catch(e){ toast(e&&e.name==="AbortError"?"Zeitüberschreitung – bitte nochmal":"Netzwerkfehler","err"); }
  finally{ if(btn){btn.disabled=!heftCfg.fokusId;btn.textContent="✨ Porträt-Entwurf aus Fan-Fakten & Reporter (KI)";} }
}
/* ── I-C: Freigabe-Queue der Kabinen-Reporter-Antworten. Nur Freigegebenes erscheint
   im Heft (Vorschau/Druck/Eltern-Ansicht). Löschen entfernt die Antwort endgültig. ── */
function heftReporterQueueRender(){
  const el=document.getElementById("heft-reporter-queue"); if(!el)return;
  const nameById={}; heftKader.forEach(k=>nameById[k.id]=k.name);
  const offen=(window._heftReporter||[]).filter(x=>!x.freigegeben);
  if(!offen.length){el.innerHTML="";return;}
  el.innerHTML=`<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">🎙️ Kabinen-Reporter – ${offen.length} Antwort${offen.length===1?"":"en"} warten auf Freigabe</div>
    ${offen.map(x=>`<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-left:3px solid #14b8a6;border-radius:10px;padding:8px 10px;margin-top:6px">
      <div style="flex:1;min-width:0;font-size:var(--s-text)"><b>${esc(nameById[x.spieler_id]||"?")}</b> · ${esc(x.frage)}<br><span style="color:var(--text2)">„${esc(x.antwort)}"</span></div>
      <button class="btn btn-sm" style="color:var(--green)" onclick="heftReporterApprove(${x.id})">✓ Ins Heft</button>
      <button class="btn btn-sm" style="color:var(--red)" onclick="heftReporterDelete(${x.id})"><i class="ti ti-trash"></i></button>
    </div>`).join("")}`;
}
async function heftReporterApprove(id){
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({freigegeben:true})});
    if(!r.ok&&r.status!==204){toast("Konnte nicht freigeben","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  const row=(window._heftReporter||[]).find(x=>x.id===id); if(row)row.freigegeben=true;
  toast("🎙️ Ins Heft übernommen ✓");
  heftReporterQueueRender(); heftRenderPreview();
}
async function heftReporterDelete(id){
  if(!confirm("Diese Reporter-Antwort wirklich löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok&&r.status!==204){toast("Konnte nicht löschen","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  window._heftReporter=(window._heftReporter||[]).filter(x=>x.id!==id);
  heftReporterQueueRender(); heftRenderPreview();
}
// HOTFIX 19 digital: Editor-Inhalt in die stadionheft-Tabelle schreiben (+ Veröffentlichen-Status).
async function heftSaveDb(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  const payload={team:"adler1",titel:heftCfg.titel||"Adler Nest",einleitung:heftCfg.einleitung||"",fokus_spieler_id:heftCfg.fokusId?Number(heftCfg.fokusId):null,fokus_text:heftCfg.fokusText||"",kommentar:heftCfg.kommentar||"",published:!!heftCfg.published,updated_at:new Date().toISOString()};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/stadionheft?on_conflict=team`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(payload)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen ("+r.status+")","err");return;}
    heftCfg._pubAt=payload.updated_at; heftCfgSave();
    // v732: veröffentlichtes Porträt in den Verlauf (für „reihum“); vor der Migration schlägt das still fehl
    if(heftCfg.published&&heftCfg.fokusId){ try{ await fetch(`${SB_URL}/rest/v1/portraet_verlauf?on_conflict=spieler_id,woche`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({spieler_id:Number(heftCfg.fokusId),woche:heftWochenMontag()})}); }catch(e){} }
    toast(heftCfg.published?"✅ Gespeichert & für Eltern veröffentlicht":"✅ Gespeichert (nicht veröffentlicht)");
    heftRenderEditor();
  }catch(e){ toast("Netzwerkfehler beim Speichern","err"); }
}
function heftRenderPreview(){ const box=document.getElementById("heft-preview"); if(box)box.innerHTML=heftBuildHtml(heftCfg,{mask:!!heftCfg.mask}); }
function heftPrintNow(){
  document.getElementById("heft-print").innerHTML=heftBuildHtml(heftCfg,{mask:!!heftCfg.mask});
  document.body.classList.add("printing-heft");
  const cleanup=()=>{document.body.classList.remove("printing-heft");window.removeEventListener("afterprint",cleanup);};
  window.addEventListener("afterprint",cleanup);
  setTimeout(cleanup,4000);
  window.print();
}
/* HOTFIX 19 digital: öffentliche Eltern-Ansicht des Stadionhefts (?heft). Ruft die
   Edge Function stadionheft-view – Namen kommen bereits maskiert, Fotos nur bei
   Einwilligung (sonst Initialen). Kein Login, keine Trainer-Daten. */
/* v661 PO 28.09. (Bildschirmfoto Adler Nest in der installierten Eltern-App): „wie komme ich aus
   der Ansicht vom Adler Nest wieder zurück in der Eltern-App?" Die Seite ist öffentlich und hatte
   deshalb keine App-Leiste – in einem App-Fenster ohne Browser-Knöpfe gab es keinen Weg zurück.
   Kommt man aus der App (&von=app), steht oben „← Zurück zur App“; Gäste mit geteiltem Link sehen
   ihn nicht. */
function heftZurueckLeiste(){
  if(new URLSearchParams(location.search).get("von")!=="app")return "";
  return `<button id="heft-zurueck" onclick="heftZurueck()" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:8px 14px;margin:0 0 10px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">← Zurück zur App</button>`;
}
function heftZurueck(){
  let intern=false; try{ intern=!!document.referrer&&new URL(document.referrer).origin===location.origin; }catch(e){}
  if(intern&&history.length>1){ history.back(); return; }
  location.href=location.pathname+"?portal";
}
/* v733 (Auftragspaket Adler Nest, 03.10.): Das Adler Nest erscheint als Ausgabe je Spieltag und ist nur noch
   hinter dem Login lesbar – die Elternfotos der Spieltagsgalerie zeigen auch Gegnerkinder. Der alte öffentliche
   Link bleibt für bestehende Links (Matchcard, Spielende-Seite, geteilte Nachrichten) erhalten, zeigt aber keine
   Ausgabe mehr, sondern den Weg in die App. Die Edge Function stadionheft-view bleibt bis auf Weiteres stehen. */
async function renderStadionheftView(){
  const root=document.createElement("div"); root.id="heft-hinweis";
  root.style.cssText="max-width:460px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:var(--bg)";
  document.body.appendChild(root);
  root.innerHTML=`${heftZurueckLeiste()}<div style="text-align:center;padding:40px 12px;color:var(--text)">
    <img src="logo.png" style="width:64px;height:64px" alt="SV Adler Dellbrück">
    <div style="font-size:var(--s-seite);font-weight:900;margin:12px 0 6px">🪺 Adler Nest</div>
    <p style="font-size:var(--s-karte);line-height:1.5;margin:0 0 6px">Das Adler Nest lesen Eltern in der App.</p>
    <p style="font-size:var(--s-text);color:var(--text2);line-height:1.5;margin:0 0 20px">Nach jedem Spieltag erscheint dort eine neue Ausgabe – mit Bericht, Fotos und Porträt. Weil die Fotos auch andere Kinder zeigen, gibt es das Heft nur nach der Anmeldung.</p>
    <a href="${location.pathname}?portal" id="heft-zum-login" style="display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 24px;border-radius:12px;background:var(--blue);color:#fff;text-decoration:none;font-weight:800;font-size:var(--s-karte)">Zur Eltern-App anmelden</a>
  </div>`;
}

/* ═══════════════════════════════════
   N2: KACHEL-NAVIGATION – die 6 Startseiten-Kacheln (Training, Spieltag, Team, Taktik,
   Eltern & Kinder, Orga) und ihre Seiten. PO-Vorgabe: Übersichtlichkeit vor Dichte –
   KEINE kleinen Buttons oder Texte, die Untermenüs sind wieder GROSSE Kacheln
   (2 Spalten, großes Icon, fetter Text; ungerade Gruppe → letzte Kachel volle Breite).
   Alle Aktionen laufen über kachelRun (schließt die Seite, ruft die bestehende Funktion).
═══════════════════════════════════ */
function kachelTile(key,emo,label,c1,c2){
  /* c1/c2 sind Farbvariablen (--fam-*), keine Hexwerte – der Schatten kann deshalb
     nicht mehr aus der Farbe gebaut werden (frueher `${c1}44`) und ist jetzt neutral.
     Das Badge traegt volle Deckkraft: mit opacity .9 fiel es auf 4.38:1 und lag damit
     unter den geforderten 4.5:1. Die Abstufung macht die Schriftgroesse. */
  // v718: kompakt (drei je Reihe): Symbol, Name, Live-Hinweis – rund halb so hoch wie vorher
  return `<button onclick="kachelOpen('${key}')" style="min-height:76px;min-width:0;border:none;border-radius:14px;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,${c1},${c2});color:#fff;padding:9px 10px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:2px;box-shadow:var(--shadow-md);text-align:left">
    <span aria-hidden="true" style="font-size:var(--s-seite);line-height:1">${emo}</span>
    <span style="min-width:0;max-width:100%">
      <span style="display:block;font-size:var(--s-text);font-weight:900;line-height:1.2;overflow-wrap:anywhere">${label}</span>
      <span id="kb-${key}" style="display:block;font-size:var(--s-klein);line-height:1.25;min-height:13px"></span>
    </span>
  </button>`;
}
/* Aktion von einer Kachelseite: Funktion aufrufen, ehrlicher Toast falls sie fehlt.
   v553: Bis hierher raeumte diese Stelle das Kachel-FENSTER weg – sofort bei einer
   navigierenden Aktion, und sonst nachtraeglich ueber einen Vergleich der aktiven
   Navi-Schaltflaeche (PO v408: „wenn ich jetzt die kachel schliese komme ich direkt
   wieder auf die Startseite"). Die Kachel-Ebene ist jetzt eine Seite; es gibt kein
   Fenster mehr, das haengen bleiben koennte, und damit auch nichts nachzuraeumen. */
function kachelRun(fn,arg){
  const f=window[fn];
  if(typeof f!=="function"){toast("Da fehlt noch eine Verknüpfung ("+fn+") – bitte kurz melden","err");return;}
  if(typeof nutzungLog==="function")nutzungLog("aktion",fn+(arg!==undefined?":"+arg:""));
  arg===undefined?f():f(arg);
}
// Untermenü-Kacheln: 2 Spalten, groß und tippfreundlich; Farbkante oben = Familienfarbe
function kTiles(items,col){
  const t=items.filter(Boolean);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">`+t.map((x,i)=>{
    /* v710: Bei ungerader Zahl wurde die letzte Kachel volle Breite und sah wie die Hauptaktion
       aus („Rollen-Matrix“, „Meetings“, „DFB-Regal“ …). Alle Kacheln sind gleichrangig – also
       gleich groß; die letzte steht links, die Lücke rechts ist ehrlicher als eine Betonung. */
    const voll=false;
    return `<button onclick="kachelRun('${x.fn}'${x.arg!==undefined?`,'${x.arg}'`:""})" style="${voll?"grid-column:1/-1;":""}min-height:88px;border:1px solid var(--rand-bedien);border-top:3px solid ${col};border-radius:14px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:12px 8px;text-align:center">
      <span style="font-size:30px">${x.emo}</span>
      <span style="font-size:var(--s-karte);font-weight:800;line-height:1.25">${x.label}</span>
    </button>`;
  }).join("")+`</div>`;
}
/* v681: Einstiege, die eine Reihenfolge haben (vor → während → nach), stehen untereinander
   in voller Breite mit Nummer – nicht im Raster, wo die dritte Kachel quer darunter läge. */
function kPhasen(items,col){
  return `<div style="display:flex;flex-direction:column;gap:10px">`+items.map(x=>`<button type="button" class="phase-zeile" onclick="kachelRun('spieltagPhase','${x.arg}')" style="border-left-color:${col}">
      <span class="pz-nr" style="background:${col}" aria-hidden="true">${x.nr}</span>
      <span class="pz-emo" aria-hidden="true">${x.emo}</span>
      <span style="flex:1;min-width:0"><span class="pz-t">${x.label}</span><span class="pz-s">${x.sub}</span></span>
      <i class="ti ti-chevron-right" aria-hidden="true" style="font-size:var(--s-seite);color:var(--text3)"></i>
    </button>`).join("")+`</div>`;
}
function kSec(t){return `<div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin:16px 0 8px">${t}</div>`;}
const KACHELN={
  training:{emo:"🏃",titel:"Training",sub:"Vom Plan bis zum Abpfiff",col:"var(--fam-training)"},
  spieltag:{emo:"⚽",titel:"Spieltag",sub:"Vorher, während, danach",col:"var(--fam-spieltag)"},
  team:{emo:"👥",titel:"Team",sub:"Spieler, Entwicklung, Überblick",col:"var(--fam-team)"},
  taktik:{emo:"🎯",titel:"Taktik",sub:"Brett, Zeichnen, Bibliothek",col:"var(--fam-taktik)"},
  elki:{emo:"🪶",titel:"Eltern & Kinder",sub:"Kommunikation und Adler-Welt",col:"var(--fam-elki)"},
  orga:{emo:"📅",titel:"Orga",sub:"Termine, Events, Verwaltung",col:"var(--fam-orga)"}
};
/* v553 – Die Kachel-Ebene war ein FENSTER über der vorigen Seite. Damit lag sie
   grundsätzlich quer zu einer Navigationsleiste: der Knopf navigierte nicht, er legte
   etwas obenauf, und beim Schließen stand man wieder irgendwo. Jetzt ist sie eine Seite.
   `kachelOpen` bleibt als Name bestehen – die Startseiten-Kacheln und die Hilfe rufen ihn
   an rund einem Dutzend Stellen – und leitet nur noch weiter. */
function kachelOpen(key){
  if(!KACHELN[key])return;
  /* Kein eigener Log-Eintrag mehr: `go()` schreibt gleich darauf „bereich:ue-…" – das
     ist derselbe Vorgang. Zwei Zeilen für einen Tipp haetten die Nutzungs-Auswertung
     verzerrt, und zwar genau bei den Bereichen, die man am haeufigsten oeffnet. */
  openTab(key);
}
/* Füllt die Hülle aus shell.html. Der Inhalt kommt unverändert aus _kachelInhalt – der
   Weg über die Startseite und der über die Leiste enden deshalb im selben Bild, und
   eine neue Kachel erscheint auf beiden Wegen, ohne dass jemand daran denken muss. */
function kachelSeite(key){
  const el=document.getElementById("view-ue-"+key), k=KACHELN[key];
  if(!el||!k)return;
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span style="font-size:26px;line-height:1">${k.emo}</span>
      <span style="min-width:0">
        <span style="display:block;font-size:var(--s-teil);font-weight:900;color:var(--text)">${esc(k.titel)}</span>
        <span style="display:block;font-size:var(--s-text);color:var(--text2)">${esc(k.sub)}</span>
      </span>
    </div>
    <div id="kachel-body">${_kachelInhalt(key)}</div>`;
  _kachelNachladen(key);
}
function _kachelInhalt(key){
  const col=(KACHELN[key]||{}).col||"var(--blue)";
  /* PO: genau 4 Kacheln, Beschriftung IDENTISCH zur Unterseite (Anwesenheit,
     Trainingsplan, Übungen, Blitzturnier). „Einheit bewerten" ist raus – das kommt
     nach dem Training als To-Do auf der Startseite. */
  if(key==="training")return kTiles([
      {emo:"✅",label:"Anwesenheit",fn:"go",arg:"anwesenheit"},
      {emo:"📋",label:"Trainingsplan",fn:"go",arg:"planung"},
      {emo:"📚",label:"Übungen",fn:"go",arg:"formen"},
      {emo:"🏆",label:"Trainingsturnier",fn:"blitzOpen"}
    ],col);
  /* v665 PO (Bildschirmfotos 28.09.): „Die Meldung der Anwesenheit an Spieltagen ist zu
     versteckt. Auf der Startkachel ‚Wer ist dabei' müssen direkt die Rückmeldungen der Eltern
     angezeigt werden." Statt einer Kachel, die in den Match springt, steht hier die Karte
     mit dem Stand zum nächsten Spieltag (spieltagDabeiKarteLoad). */
  /* v681 PO (Kollegen 29.09.): „vor dem Spiel, während dem Spiel, nach dem Spiel“ – das sind die
     drei Fragen am Platz, also stehen sie hier als drei große Einstiege. Jeder führt in den
     Match mit genau dieser Phase offen; die Kachel „Match“ ist darin aufgegangen. */
  if(key==="spieltag")return `<div id="st-dabei-karte"></div>`
    +kSec("Am Spieltag")
    +kPhasen([
      {nr:1,emo:"📣",label:"Wer kommt?",sub:"Rückmeldungen der Eltern, Offene erinnern, von Hand ändern",arg:"wer"},
      {nr:2,emo:"👥",label:"Teams und Kapitäne",sub:"Einteilung, Kapitän, Aufstellung",arg:"vor"},
      {nr:3,emo:"⏱️",label:"Während des Spiels",sub:"Match-Uhr, Wechsel, Liveticker",arg:"live"},
      {nr:4,emo:"🏁",label:"Danach",sub:"Ergebnis, Spielbericht, Team-Quests",arg:"nach"}
    ],col)
    +kSec("Vorbereiten und auswerten")
    +kTiles([
      {emo:"🧩",label:"Aufstellung",fn:"go",arg:"kombi"},
      {emo:"📊",label:"Analyse",fn:"go",arg:"analyse"}
    ],col)
    +`<div id="kachel-turnier"></div>`;
  if(key==="team"){
    const names=typeof kaderNamen==="function"?kaderNamen():Object.keys(DB||{});   // v636: nur aktive Kinder
    const bewertet=names.filter(n=>DB[n]&&DB[n].length).length;
    // v648: „Runde fällig“ erst ab dem Startdatum der Bewertungen, dann nach 49 Tagen
    const frei=typeof bewFreigegeben==="function"&&bewFreigegeben();
    const stale=frei?names.filter(bewKindFaellig).length:0;
    const tile=(v,l,c,arg)=>`<button onclick="kachelRun('go','${arg}')" style="flex:1;min-width:90px;min-height:72px;border:1px solid var(--rand-bedien);border-radius:14px;background:var(--surface);padding:10px;text-align:center;cursor:pointer;font-family:inherit"><div style="font-size:var(--s-seite);font-weight:900;color:${c}">${v}</div><div style="font-size:var(--s-text);color:var(--text2);font-weight:700">${l}</div></button>`;
    /* v688: Vor dem Startdatum stand hier „0/15 bewertet“ in Grün – eine Zahl, die nach Rückstand
       aussah, obwohl Bewerten bewusst gesperrt ist. Jetzt steht dort, ab wann bewertet wird. */
    const abKurz=typeof bewAbText==="function"&&bewAbText()?bewAbText().slice(0,6):"Hinrunde";
    const bewTile=frei?tile(bewertet+"/"+names.length,"bewertet","var(--green)","bew"):tile("🔒 "+abKurz,"Bewerten ab","var(--text2)","bew");
    return `<div style="display:flex;gap:10px;margin-bottom:4px">${tile(names.length,"Kader","var(--blue-text)","kader")}${bewTile}${frei?tile(stale,"Runde fällig","var(--red)","bew"):""}</div>
      <div id="home-antifrust"></div><div id="home-birthday"></div><div id="home-radar"></div>`
      +kSec("Spieler")
      +kTiles([
        {emo:"👥",label:"Kader",fn:"go",arg:"kader"},
        {emo:"📝",label:"Bewerten",fn:"go",arg:"bew"},
        {emo:"🌟",label:"Profil",fn:"go",arg:"profil"},
        {emo:"📈",label:"Entwicklung",fn:"go",arg:"verlauf"},
        {emo:"⏸️",label:"Pausen-Status",fn:"pausenOpen"},
        // v544: gehoert neben den Kader, nicht in die Orga – gefragt wird sie beim
        // Anprobieren, und da steht man vor den Kindern.
        {emo:"👕",label:"Ausstattung",fn:"ausstattungOpen"}
      ],col)
      +kSec("Überblick")
      +kTiles([
        {emo:"🧭",label:"Saison-Cockpit",fn:"saisonCockpitOpen"},
        // Ab v381 EIN Einstieg statt zwei: die frühere „Anwesenheits-Quote" ist der
        // Reiter „Spiele" darin, die Übersicht kam aus der Anwesenheits-Erfassung her.
        {emo:"📊",label:"Anwesenheit (Saison)",fn:"awUebersichtOpen"},
        {emo:"🎽",label:"Rollen-Matrix",fn:"rollenMatrixOpen"}
      ],col)
      +kSec("Besonderes")
      +kTiles([
        {emo:"🆘",label:"Notfallkarten",fn:"notfallTrainerOpen"},
        {emo:"🆕",label:"Probetraining",fn:"probeOpen"}
      ],col);
  }
  /* v610: „Übungen" stand hier ein zweites Mal und sprang in den Bereich Training – die
     Leiste wechselte mit, und der Rückweg führte nicht mehr nach Taktik. Übungen wohnen
     unter Training; hier steht, was es nur hier gibt. */
  if(key==="taktik")return kSec("Am Brett")
    +kTiles([
      {emo:"🎯",label:"Taktikboard",fn:"go",arg:"taktik"}
    ],col);
  /* v689: 17 gleichförmige Kacheln in drei Gruppen, die nach Themen statt nach Anlass sortiert waren.
     Jetzt fragt jede Überschrift, was man gerade tun will: schreiben, Eltern verwalten, Kinder
     belohnen, die Kabine gestalten. „Adler-Rufe moderieren“ ist ein Knopf im Raum selbst (🛡️),
     dort, wo man eine Meldung sieht – keine eigene Kachel mehr neben dem Chat. */
  if(key==="elki")return kSec("Nachrichten")
    +kTiles([
      {emo:"💬",label:"Adler-Rufe",fn:"rufeEinstieg"},
      {emo:"📣",label:"Team-Ansage",fn:"ansageTrainerOpen"},
      {emo:"🗣️",label:"Elterngespräch",fn:"epollTrainerOpen"}
    ],col)
    +kSec("Eltern verwalten")
    +kTiles([
      // v610: Die Karten sind seit v604 der Regelweg – vorher nur über Einstellungen erreichbar.
      {emo:"🪪",label:"Einladungskarten",fn:"einladungskartenOpen"},
      {emo:"📈",label:"Rückmelde-Verhalten",fn:"rueckmeldeStatistikOpen"},
      {emo:"🔔",label:"Wer bekommt Push?",fn:"pushAbdeckungOpen"},   // v711
      {emo:"👥",label:"Elternbeirat & Kasse",fn:"elternTeamEditOpen"}
      /* v669 PO 29.09.: „Eltern einladen kann meiner Einschätzung ganz weg ebenso wie QR-Aushang.“
         Der Weg in die App sind die Einladungskarten (seit v604). */
    ],col)
    +kSec("Kinder belohnen")
    +kTiles([
      {emo:"🪶",label:"Federn vergeben",fn:"federnVergebenOpen"},   // v675
      {emo:"🎯",label:"Team-Quests",fn:"questEditorOpen"},
      {emo:"🏅",label:"Urkunden-Studio",fn:"urkundenOpen"}
    ],col)
    +kSec("Kabine gestalten")
    +kTiles([
      {emo:"🦅",label:"Adler-Welt",fn:"adlerWeltOpen"},
      {emo:"🤝",label:"Unsere Regeln",fn:"codexKinderEditOpen"},
      {emo:"🗳️",label:"Kabinen-Wahl",fn:"wahlTrainerOpen"},
      {emo:"🖼️",label:"Karten-Fotos",fn:"albumFotosOpen"},
      {emo:"🧠",label:"Quiz-Ergebnisse",fn:"go",arg:"quizresults"}
    ],col)
    +kSec("Inhalte")
    +kTiles([
      {emo:"🪺",label:"Nest-Ausgaben",fn:"nestEditorOpen"},   // v733: eine Ausgabe je Spieltag
      {emo:"📰",label:"Adler Nest (Porträt-Vorschlag)",fn:"stadionheftOpen"},
      ...(WRAPPED_SICHTBAR?[{emo:"🏆",label:"Adler Wrapped",fn:"adlerWrappedTeaser"}]:[])
    ],col)
    +`<div id="home-milestone" style="margin-top:8px"></div>`;
  if(key==="orga")return `<div id="home-rsvp"></div><div id="home-ferien"></div>`
    /* v688: Unter „Termine“ standen auch Pinnwand, Tagebuch und Gedanke, die Meetings dagegen
       unter „Team-Orga“. Jetzt ordnet die Überschrift: was einen Zeitpunkt hat, was man
       aufschreibt, was man verwaltet. */
    +kSec("Termine")
    +kTiles([
      {emo:"📅",label:"Termine",fn:"go",arg:"termine"},
      // Team-Sicht auf die Verfügbarkeit – NEBEN „Bist du dabei?" (Ich-Sicht), nicht statt.
      {emo:"🧑‍🏫",label:"Trainerplan",fn:"trainerPlanOpen"},
      {emo:"🗓️",label:"Meetings",fn:"trainerMeetingOpen"}   // v527: Übersicht; angelegt wird im Termin
    ],col)
    +kSec("Notizen")
    +kTiles([
      {emo:"💭",label:"Gedanke",fn:"tagebuchGedanke"},   // v679: ein Feld, ein Knopf – wird ein Keim im Tagebuch
      {emo:"📓",label:"Tagebuch",fn:"go",arg:"tagebuch"},
      {emo:"📌",label:"Pinnwand",fn:"go",arg:"team"} // war nur über die Reiterzeile erreichbar
    ],col)
    +kSec("Team-Orga")
    +kTiles([
      {emo:"🎉",label:"Mitbringliste",fn:"mitbringTrainerOpen"},
      {emo:"💰",label:"Teamkasse",fn:"kasseOpen"},
      {emo:"🧰",label:"Material",fn:"materialOpen"},
      {emo:"🧦",label:"Fundbüro",fn:"fundbueroOpen"},
      // Juni–September – und nur solange die Saison nicht abgehakt ist. Zur nächsten
      // Saison wechselt der Schlüssel, dann steht er von selbst wieder da.
      (new Date().getMonth()>=5&&new Date().getMonth()<=8&&!saisonStartZu())?{emo:"🌅",label:"Saisonstart-Check",fn:"saisonStartOpen"}:null
    ],col)
    +kSec("Einstellungen")
    +`<div id="push-slot-trainer" style="margin-bottom:10px"></div>`
    +kTiles([
      // v610: aus „Team-Orga" hierher – dort trug sie dasselbe 🧰 wie „Material".
      {emo:"⚙️",label:"Setup-Übersicht",fn:"setupTrainerOpen"},
      {emo:"🔑",label:"Passwort ändern",fn:"pwChangeOpen"},
      {emo:"📊",label:"Nutzung",fn:"nutzungOpen"},
      // v683: vorher unten auf der Pinnwand und im Kader – eine Sicherung ist Verwaltung, kein Teaminhalt
      {emo:"💾",label:"Datensicherung",fn:"backupExport"}
    ],col);
  return "";
}
// Nachlader je Kachelseite: bestehende Slot-Renderer (schreiben in ihre bekannten IDs)
function _kachelNachladen(key){
  try{
    if(key==="team"){if(typeof homeAntiFrust==="function")homeAntiFrust();if(typeof homeBirthday==="function")homeBirthday();if(typeof homeRadarLoad==="function")homeRadarLoad();}
    if(key==="elki"&&typeof homeMilestone==="function")homeMilestone();
    if(key==="orga"){
      if(typeof homeRsvpNudge==="function")homeRsvpNudge();
      if(typeof homeFerien==="function")homeFerien();
      if(typeof pushRenderInto==="function")pushRenderInto("push-slot-trainer","trainer");
    }
    if(key==="spieltag"){_kachelTurnierCheck();spieltagDabeiKarteLoad();}
  }catch(e){}
}
/* v665: Karte „Wer ist dabei?" auf der Spieltag-Seite – Eltern-Rückmeldungen zum nächsten
   Spieltag direkt sichtbar, je Gruppe mit Namen (Trainer-App, Kinder mit Vornamen wie im
   Kader). Maßgeblich für die Teams bleibt die Anwesenheit im Match (nomStatus): dorthin
   führt der Knopf, und dort kann der Trainer jede Rückmeldung überstimmen. Stand der
   Anwesenheit (Trainer-Entscheid) wird mitgezeigt, sobald es sie gibt. */
async function spieltagDabeiKarteLoad(){
  const slot=document.getElementById("st-dabei-karte"); if(!slot)return;
  const heute=isoLokal();
  let t=null, rm=[], nom=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&datum=gte.${heute}&select=id,datum,typ,gegner,titel,uhrzeit&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=((await r.json())||[])[0]||null;}catch(e){}
  if(!document.getElementById("st-dabei-karte"))return;
  if(!t){slot.innerHTML=`<div class="abschnitt" style="margin-bottom:10px"><div style="font-weight:800;font-size:var(--s-karte)">✅ Wer ist dabei?</div><div style="font-size:var(--s-text);color:var(--text2);margin-top:4px">Kein Spieltag in Sicht – unter Orga einen Termin „Spiel“ oder „Turnier“ anlegen.</div></div>`;return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${t.id}&select=spieler_id,status,kommentar`,{headers:sbAuthHeaders()});if(r.ok)rm=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(t.datum+"__nom")}&select=data`,{headers:sbAuthHeaders()});if(r.ok){const x=((await r.json())||[])[0];nom=x&&x.data||null;}}catch(e){}
  if(!document.getElementById("st-dabei-karte"))return;
  const kader=(typeof kaderAktiv==="function"?kaderAktiv():[]);
  const perId={}; rm.forEach(x=>perId[x.spieler_id]=x);
  const gr={zugesagt:[],abgesagt:[],krank:[],offen:[]};
  kader.forEach(k=>{const x=perId[k._id];const st=x&&gr[x.status]?x.status:"offen";gr[st].push(k);});
  let dabei=null;
  if(nom){dabei=kader.filter(k=>nom[k._id]==="dabei"||nom[String(k._id)]==="dabei").length;}
  const d=new Date(t.datum+"T00:00:00");
  const wann=d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})+(t.uhrzeit?" · "+String(t.uhrzeit).slice(0,5)+" Uhr":"");
  const was=t.typ==="turnier"?"Turnier":(t.gegner?"gegen "+t.gegner:"Spiel");
  /* v702 PO: „Die erste Seite bei Spieltag ist Anwesenheit anpassen und Teams ansehen … ich kann die
     anklicken, es passiert aber nichts.“ Die Namen hier waren nur Anzeige und standen zwei Tipps
     weiter noch einmal – zum Ändern. Jetzt eine Zeile mit dem Stand und EIN Weg in „Wer kommt?“. */
  slot.innerHTML=`<div class="abschnitt" id="st-dabei" style="margin-bottom:10px;border-top:3px solid var(--fam-spieltag)">
    <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
      <span style="font-weight:900;font-size:var(--s-karte)">Nächster Spieltag</span>
      <span style="font-size:var(--s-text);color:var(--text2)">${esc(wann)} · ${esc(was)}</span></div>
    <div style="font-size:var(--s-text);margin-top:6px;line-height:1.5">✅ <b>${gr.zugesagt.length} zugesagt</b> · ❌ ${gr.abgesagt.length} abgesagt · 🤒 ${gr.krank.length} krank · ❓ <b>${gr.offen.length} ohne Antwort</b>${dabei!=null?`<br>Im Match eingeplant: <b>${dabei} von ${kader.length}</b>`:""}</div>
    <button type="button" class="btn btn-p" id="st-dabei-anpassen" style="width:100%;min-height:56px;margin-top:12px" onclick="spieltagZuTermin('${esc(t.datum)}','wer')">Wer kommt? – ansehen und ändern</button>
  </div>`;
}
/* PO-Entscheid: Die Turnier-Gruppe erscheint unter Spieltag NUR, wenn etwas ansteht – sonst
   bleibt die Seite schlank. v490: „ansteht" heisst jetzt auch ein Heimspiel; geplant wird es
   wie ein kleines Festival (ein Gegner, evtl. mehrere Teams auf beiden Seiten). */
async function _kachelTurnierCheck(){
  const slot=document.getElementById("kachel-turnier"); if(!slot)return;
  const heute=isoLokal();
  /* v702 PO: „ganz unten Spieltag bei uns. Wenn es aber ein Auswärtsspiel ist, kann das weg.“
     Vorher genügte ein Heimspiel IRGENDWO unter den nächsten 20 Terminen oder irgendein alter
     Festival-Plan. Jetzt zählt nur der nächste Spieltag. */
  let terminHeim=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&datum=gte.${heute}&select=id,typ,heim,datum,titel&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const t=((await r.json())||[])[0]; terminHeim=(t&&t.heim===true)?t:null;}}catch(e){}
  if(!document.getElementById("kachel-turnier"))return; // Seite schon gewechselt
  const heimspiel=terminHeim&&terminHeim.typ==="spiel";
  /* v610: „Turnierplan (auswärts)" war dieselbe Seite wie die Kachel „Match" darüber.
     Ein Auswärtsturnier plant man im Match – die Gruppe steht nur noch, wenn wir
     selbst ausrichten. */
  if(!terminHeim){ slot.innerHTML=""; return; }
  slot.innerHTML=kSec("🏟️ Spieltag bei uns")
    +kTiles([
      {emo:"🏟️",label:heimspiel?"Heimspiel planen":"Festival ausrichten",fn:"spieltagHeimPlanen",arg:terminHeim.datum}
    ],(KACHELN.spieltag||{}).col||"var(--fam-spieltag)");
}
