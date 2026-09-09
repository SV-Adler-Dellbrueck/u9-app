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
  getAllT(dims).forEach(n=>[1,2,3,4].forEach(v=>{
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
    setV("p-foot",lm.foot||"R");
    const seg=(hid,val)=>{const v=String(val||"2");setV(hid,v);document.querySelectorAll(`#${hid}-seg .seg-btn`).forEach(b=>b.classList.toggle("active",b.dataset.val===v));};
    seg("p-eltern",lm.eltern);seg("p-att",lm.att);
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
function bewRundeBarRender(){
  const bar=document.getElementById("bew-runde-bar"); if(!bar)return;
  if(!BEW_RUNDE.active){
    bar.innerHTML=`<button onclick="bewRundeStart()" style="width:100%;min-height:48px;border:none;border-radius:12px;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.28)"><i class="ti ti-clipboard-list"></i> Bewertungsrunde starten (alle nacheinander)</button>`;
    return;
  }
  const pos=BEW_RUNDE.idx+1, tot=BEW_RUNDE.queue.length, name=BEW_RUNDE.queue[BEW_RUNDE.idx];
  bar.innerHTML=`<div style="flex:1;min-width:150px;font-size:12.5px;font-weight:800;color:var(--club-accent)">📋 Runde · Spieler ${pos}/${tot}: ${esc(name)}</div>
    <button class="btn btn-sm" onclick="bewRundeSkip()">Überspringen ›</button>
    <button class="btn btn-sm" onclick="bewRundeStop()" style="color:var(--red)">Beenden</button>`;
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
      <div class="dim-head" onclick="toggleDim(this)">
        <div class="dim-iw" style="background:${d.col}22"><i class="ti ${d.icon}" style="font-size:15px;color:${d.col}"></i></div>
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
    tt.innerHTML=`<thead><tr><th>Beobachtung</th><th>Ansatz</th><th>Solide</th><th>Gut</th><th>Stark</th></tr></thead>`;
    const tb=document.createElement("tbody");
    d.tier.forEach(t=>{
      const tr=document.createElement("tr");
      let h=`<td class="cn">${t.l}<small>${t.h}</small></td>`;
      t.opts.forEach(o=>{
        const bc=o.v===1?"lb1":o.v===2?"lb2":o.v===3?"lb3":"lb4";
        h+=`<td><div class="topt"><label id="tl-${t.n}-${o.v}"><input type="radio" name="${t.n}" value="${o.v}" onchange="onChange()"><span class="lb ${bc}">${["","Ansatz","Solide","Gut","Stark"][o.v]}</span><span><span class="ltitle">${o.t}</span><span class="ldesc">${o.d}</span></span></label></div></td>`;
      });
      tr.innerHTML=h;tb.appendChild(tr);
    });
    tt.appendChild(tb);body.appendChild(tt);
    if(d.mx.length){ // Detail-Matrix nur rendern, wenn die Dimension welche hat (v2: leer)
    const sep=document.createElement("div");
    sep.style.cssText="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text2);padding:6px 0 4px;margin-top:4px";
    sep.textContent="Detail-Bewertung (1–5)";
    body.appendChild(sep);
    const mx=document.createElement("table");mx.className="mx-t";
    mx.innerHTML=`<thead><tr><th>Kriterium</th><th>1<br><span style="font-weight:400;font-size:9px">Noch nicht</span></th><th>2<br><span style="font-weight:400;font-size:9px">Ansatz</span></th><th>3<br><span style="font-weight:400;font-size:9px">Solide</span></th><th>4<br><span style="font-weight:400;font-size:9px">Gut</span></th><th>5<br><span style="font-weight:400;font-size:9px">Stark</span></th></tr></thead>`;
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
    mxHint.innerHTML='<i class="ti ti-arrows-left-right" style="font-size:12px"></i>Seitwärts scrollen für alle Spalten';
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
        <div style="font-size:13px;font-weight:700;color:var(--text)">${label} · ${wizIdx+1}/${blocks.length}</div>
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
}
// Kader-Verwaltung: Modal mit editierbaren Zeilen (name/nr/tw/twPrio/geb/medical/aktiv).
function kaderEditRow(k,i){
  const drin=k.aktiv!==false;
  return `<div class="kader-edit-row" data-id="${k._id||''}" style="border:var(--border-s);border-radius:var(--r);padding:8px;margin-bottom:8px${drin?"":";opacity:0.62"}">
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input class="ke-name" value="${esc(k.name||'')}" placeholder="Name" style="flex:1;min-width:80px;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit">
      <input class="ke-nr" type="number" value="${k.nr!=null?k.nr:''}" placeholder="Nr" style="width:56px;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit">
      <button onclick="kaderEditDelete(this,'${esc(k.name||'')}','${k._id||''}')" aria-label="Spieler aus dem Kader entfernen" title="Spieler entfernen" style="flex:none;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid var(--red);border-radius:10px;background:var(--red-bg);color:var(--red);cursor:pointer;font-size:16px"><i class="ti ti-trash"></i></button>
    </div>
    <div class="ke-raus-hinweis" style="font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:5px 8px;margin-bottom:6px;line-height:1.4${drin?";display:none":""}">Nicht mehr im Kader – taucht in Anwesenheit, Nominierung, Aufstellung und Turnier nicht mehr auf. Alles Bisherige bleibt gespeichert.</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
      <label style="font-size:12px;display:flex;align-items:center;gap:4px" title="Häkchen weg = nicht mehr im Kader. Verschwindet aus Anwesenheit, Nominierung, Aufstellung und Turnier – die Historie bleibt erhalten."><input class="ke-aktiv" type="checkbox" ${drin?"checked":""} onchange="kaderAktivToggle(this)">👥 Im Kader</label>
      <label style="font-size:12px;display:flex;align-items:center;gap:4px"><input class="ke-tw" type="checkbox" ${k.tw?"checked":""}>🥅 TW</label>
      <select class="ke-prio" style="padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:12px">
        <option value="0"${(k.twPrio||0)===0?" selected":""}>kein TW</option>
        <option value="1"${k.twPrio===1?" selected":""}>TW primär</option>
        <option value="2"${k.twPrio===2?" selected":""}>TW Option</option>
      </select>
      <input class="ke-geb" type="date" value="${esc(k.geb||'')}" title="Geburtstag" style="padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:12px">
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
      <select class="ke-fuss" title="Starker Fuß" style="padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:12px">
        <option value=""${!k.starker_fuss?" selected":""}>Fuß?</option>
        <option value="R"${k.starker_fuss==="R"?" selected":""}>Rechts</option>
        <option value="L"${k.starker_fuss==="L"?" selected":""}>Links</option>
        <option value="B"${k.starker_fuss==="B"?" selected":""}>Beidfüßig</option>
      </select>
      <input class="ke-pos" value="${esc(k.lieblingsposition||'')}" placeholder="Lieblingsposition" style="flex:1;min-width:90px;padding:6px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:12px">
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text2)">Foto (Karte):</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" onchange="kaderRowFoto(this)" style="font-size:11px;flex:1">
      ${k.foto_path?'<span style="font-size:10px;color:var(--green)">✓ vorhanden</span>':''}
    </div>
    <label style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;font-size:11px;color:var(--text2)" title="Nur mit ausdrücklicher Eltern-Zustimmung. Ohne Häkchen erscheinen überall nur die Initialen.">
      <input class="ke-fotook" type="checkbox" ${k.foto_stadionheft_ok?"checked":""} style="margin-top:1px">
      <span>📰 Foto freigegeben für <b>„Adler Nest" &amp; Team-Galerie</b> <span style="color:var(--text3)">(Eltern-Einwilligung eingeholt)</span></span>
    </label>
    <input class="ke-medical" value="${esc(k.medical||'')}" placeholder="Medical-Hinweis (z. B. Asthma, Allergie…)" style="width:100%;padding:7px;border:1px solid var(--rand-bedien);border-radius:6px;font-family:inherit;font-size:12px">
    ${k._id?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
      <button type="button" class="btn btn-sm" onclick="kontakteEditOpen(${k._id})" title="Kontakte & Eltern-Login" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2"><i class="ti ti-address-book" style="font-size:17px"></i>Kontakte</button>
      <button type="button" class="btn btn-sm" onclick="zieleOpen(${k._id})" title="Entwicklungs-Ziele setzen & verfolgen" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2"><i class="ti ti-target" style="font-size:17px"></i>Ziele</button>
      <button type="button" class="btn btn-sm" onclick="kindLinkShare(${k._id})" title="Persönlicher 1-Tap Zu-/Absage-Link ohne Login" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2"><i class="ti ti-calendar-check" style="font-size:17px"></i>Zu-/Absage</button>
      <button type="button" class="btn btn-sm" onclick="childWrappedShare(${k._id})" title="Persönliche Saison-Rückblick-Karte zum Teilen mit der Familie" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2"><i class="ti ti-movie" style="font-size:17px"></i>Saison</button>
      <button type="button" class="btn btn-sm" onclick="lobRecordOpen(${k._id},'${(k.name||'').replace(/'/g,'')}')" title="Kurzes Sprachlob aufnehmen – das Kind hört es in der Kabine" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2;grid-column:1/-1"><i class="ti ti-microphone" style="font-size:17px"></i>🎤 Sprachlob aufnehmen</button>
    </div>`:'<div style="font-size:10px;color:var(--text3);margin-top:6px">Erst speichern – dann sind Kontakte, Links & Saison-Karte verfügbar.</div>'}
  </div>`;
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
  const modal=document.createElement("div");
  modal.id="kader-edit-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:440px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:4px">Spieler verwalten</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Geburtstag & Medical-Hinweise sind nur für Trainer sichtbar (nicht für Eltern).</div>
    <div id="kader-edit-list">${KADER.slice().sort((a,b)=>((a.aktiv===false)-(b.aktiv===false))).map((k,i)=>kaderEditRow(k,i)).join("")}</div>
    <button class="btn btn-sm" onclick="kaderEditAdd()" style="margin-bottom:12px"><i class="ti ti-plus"></i>Spieler hinzufügen</button>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p" onclick="kaderSaveAll(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn" onclick="document.getElementById('kader-edit-modal').remove()">Schließen</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}
function kaderEditAdd(){
  const list=document.getElementById("kader-edit-list");
  if(list)list.insertAdjacentHTML("beforeend",kaderEditRow({name:"",tw:false,twPrio:0},KADER.length));
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
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:420px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:2px">📇 ${esc(k?k.name:"Spieler")} – Kontakte & Eltern-Login</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Login-E-Mails: wer sich im Eltern-Bereich anmelden & zu-/absagen darf. Telefonnummern: beliebig viele (Vater, Mutter, Oma…).</div>
    <div id="kontakte-body"><div style="color:var(--text3);font-size:12px;padding:12px">Lade…</div></div>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" onclick="document.getElementById('kontakte-modal').remove()">Schließen</button></div>
  </div>`;
  document.body.appendChild(modal);
  kontakteRender(spielerId);
}
/* Eltern-Einladung: vorbereitete Nachricht, kein Server-Versand. Der Portal-Link ist
   kein Geheimnis – anmelden kann sich nur, wessen E-Mail in eltern_kinder steht
   (is_email_whitelisted + Einmal-Code). Der Trainer sieht den Text und sendet selbst. */
/* Für Werte in onclick="fn('${jsq(x)}')": neben \ und ' muss auch " maskiert werden –
   sonst bricht ein Anführungszeichen im Namen aus dem HTML-Attribut aus. */
function jsq(s){ return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;"); }
function elternPortalUrl(){ return appRoot()+"?portal"; }
function inviteText(email,kind){
  return `Hallo! 🦅\n\nHier ist dein Zugang zum Eltern-Bereich der U9 vom SV Adler Dellbrück`
    +`${kind?` – für ${kind}`:""}.\n\n${elternPortalUrl()}\n\n`
    +`So geht's:\n1. Link öffnen\n2. Diese E-Mail-Adresse eingeben: ${email}\n3. Du bekommst einen Einmal-Code per Mail – fertig. Kein Passwort nötig.\n\n`
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
  const inp="padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px";
  // Am Platz wird mit dem Daumen getippt: Aktionen sind beschriftet und 44px hoch,
  // "Loeschen" steht raeumlich abgesetzt und fragt nach (es nimmt einem Elternteil den Zugang).
  const kkZeile="padding:10px 0;border-bottom:1px solid var(--surface2)";
  const kkAktion="flex:1;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:6px;"
    +"padding:0 12px;border:1.5px solid;border-radius:10px;background:var(--surface);"
    +"font-family:inherit;font-size:13px;font-weight:700;cursor:pointer";
  const kkLoeschen="min-width:44px;min-height:44px;margin-left:12px;display:inline-flex;align-items:center;justify-content:center;"
    +"border:1.5px solid var(--red);border-radius:10px;background:var(--red-bg);color:var(--red);font-size:16px;cursor:pointer";
  body.innerHTML=`
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">🔑 Login-E-Mails</div>
    ${emails.length?emails.map(e=>`<div style="${kkZeile}">
      <div style="font-size:13px;word-break:break-all;margin-bottom:8px">${esc(e.email)}${e.label?` <span style="color:var(--text3);font-size:11px">(${esc(e.label)})</span>`:""}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <button onclick="inviteMail('${jsq(e.email)}','${jsq(kName)}')" style="${kkAktion};border-color:#c4b5fd;color:var(--purple)"><i class="ti ti-mail-forward"></i>Einladen</button>
        <button onclick="kontakteDelEmail(${e.id},${sid},'${jsq(e.email)}')" aria-label="Login-E-Mail entfernen" style="${kkLoeschen}"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch keine Login-E-Mail.</div>'}
    ${emails.length?'<div style="font-size:10.5px;color:var(--text3);margin-top:6px">„Einladen" öffnet dein Mail-Programm mit fertigem Text – du tippst nur noch auf Senden.</div>':""}
    <div style="display:flex;gap:6px;margin:8px 0 16px;flex-wrap:wrap">
      <input id="kk-new-email" type="email" placeholder="eltern@mail.de" style="flex:2;min-width:130px;${inp}">
      <input id="kk-new-email-label" placeholder="Rolle (optional)" style="flex:1;min-width:80px;${inp}">
      <button class="btn" style="min-height:44px" onclick="kontakteAddEmail(${sid})"><i class="ti ti-plus"></i>Hinzufügen</button>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">📞 Telefonnummern</div>
    ${phones.length?phones.map(p=>`<div style="${kkZeile}">
      <div style="font-size:13px;margin-bottom:8px">${esc(p.telefon)}${(p.name||p.rolle)?` <span style="color:var(--text3);font-size:11px">(${esc([p.rolle,p.name].filter(Boolean).join(" · "))})</span>`:""}${p.geburtstag?` <span style="color:var(--text3);font-size:11px">🎂 ${new Date(p.geburtstag+"T00:00:00").toLocaleDateString("de-DE")}</span>`:""}</div>
      <div style="display:flex;gap:8px;align-items:center">
        ${(typeof waNumber==="function"&&waNumber(p.telefon))&&emails.length?`<button onclick="inviteWa('${jsq(p.telefon)}','${jsq(kName)}','${jsq(emails[0].email)}')" style="${kkAktion};border-color:#86efac;color:#15803d"><i class="ti ti-brand-whatsapp"></i>WhatsApp</button>`:`<span style="flex:1;font-size:10.5px;color:var(--text3)">${(typeof waNumber==="function"&&waNumber(p.telefon))?"Erst eine Login-E-Mail hinterlegen":"Keine Handynummer"}</span>`}
        <button onclick="kontakteDelPhone(${p.id},${sid},'${jsq(p.telefon)}')" aria-label="Telefonnummer entfernen" style="${kkLoeschen}"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch keine Nummer.</div>'}
    ${phones.length?'<div style="font-size:10.5px;color:var(--text3);margin-top:6px">„WhatsApp" öffnet den Chat mit der Einladung. Anmelden kann sich nur, wessen E-Mail oben hinterlegt ist.</div>':""}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <input id="kk-new-tel" type="tel" placeholder="Telefon" style="flex:2;min-width:110px;${inp}">
      <input id="kk-new-rolle" placeholder="Rolle (z. B. Mutter)" style="flex:1;min-width:90px;${inp}">
      <input id="kk-new-name" placeholder="Name (optional)" style="flex:1;min-width:90px;${inp}">
      <label style="flex:1;min-width:130px;font-size:10px;color:var(--text3)">🎂 Geburtstag (optional)<input id="kk-new-geb" type="date" style="width:100%;${inp}"></label>
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
// Adler-Wrapped pro Kind: persönliche Saison-Karte (Bild) für die Familie. Daten aus get_child_wrapped.
async function childWrappedShare(spielerId){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  toast("🎬 Saison-Karte wird erstellt…");
  let d=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/get_child_wrapped`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:spielerId})});if(sbCheck401(r))return;if(r.ok)d=await r.json();}catch(e){}
  if(!d||!d.ok){toast("Konnte Saison-Daten nicht laden","err");return;}
  const logo=new Image();
  logo.onload=()=>drawChildWrapped(logo,d);
  logo.onerror=()=>drawChildWrapped(null,d);
  logo.src="logo.png";
}
function drawChildWrapped(logoImg,d){
  const W=640,H=800,c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#5b21b6");g.addColorStop(1,"#1e3a8a");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";ctx.textBaseline="alphabetic";
  if(logoImg){try{ctx.drawImage(logoImg,W/2-40,42,80,80);}catch(e){}}
  ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 15px Arial";ctx.fillText("🦅 ADLER WRAPPED",W/2,150);
  ctx.fillStyle="#facc15";ctx.font="bold 38px Arial";ctx.fillText(((d.name||"")+"s Saison"),W/2,196);
  const rows=[["⚽",d.tore||0,"Tore"],["🔥",d.aktionen||0,"Ballaktionen"],["⏱️",d.einsatz_min||0,"Minuten Spielzeit"],[XP_ICON,d.xp||0,XP_LABEL+" gesammelt"],["📅",d.spiele||0,"Spiele bestritten"]];
  let y=254;
  rows.forEach(r=>{
    ctx.fillStyle="rgba(255,255,255,.1)";tbRoundRect(ctx,70,y,W-140,82,16);ctx.fill();
    ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="32px Arial";ctx.fillText(r[0],96,y+53);
    ctx.font="bold 38px Arial";ctx.fillStyle="#facc15";ctx.fillText(String(r[1]),150,y+54);
    ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 20px Arial";ctx.fillText(r[2],W-96,y+51);
    ctx.textAlign="center";y+=96;
  });
  ctx.fillStyle="rgba(255,255,255,.92)";ctx.font="bold 22px Arial";ctx.fillText("Stark gemacht! 🦅❤️",W/2,H-38);
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
    <textarea id="wc-input" rows="3" placeholder="z. B. „Diese Woche: 50 Ballkontakte im Garten – jeden Tag ein bisschen!&quot;" style="width:100%;padding:9px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box;resize:vertical">${esc(cur)}</textarea>
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
  el.innerHTML=`<div style="font-size:11.5px;color:#3730a3;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:7px 10px;margin-bottom:8px">🎯 <b>Passt zu offenen Entwicklungszielen:</b> ${ex.map(esc).join(" · ")}</div>`;
}
async function zieleOpen(spielerId){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  const k=KADER.find(x=>x._id===spielerId);
  document.getElementById("ziele-modal")?.remove();
  const modal=document.createElement("div");modal.id="ziele-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Entwicklungs-Ziele");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("ziele-modal","🎯","Entwicklungs-Ziele",`${esc(k?.name||"Spieler")} · 1–2 Förderziele für die Saison`,"var(--amber)")}
    <div id="ziele-list" style="margin-bottom:12px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:4px">Vorlage antippen (verknüpft passende Übungen) – oder unten frei formulieren:</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${ZIEL_VORLAGEN.map((v,i)=>`<button onclick="zieleAddVorlage(${spielerId},${i})" style="padding:6px 10px;border:1.5px solid #c7d2fe;border-radius:16px;background:#eef2ff;color:#3730a3;font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer">🎯 ${esc(v.ziel)}</button>`).join("")}</div>
    <textarea id="ziele-input" rows="2" placeholder="Eigenes Ziel frei formulieren, z. B. „Ruhiger im Aufbau&quot;" style="width:100%;padding:9px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box;resize:vertical"></textarea>
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
  if(!rows.length){box.innerHTML='<div style="color:var(--text3);font-size:12.5px;padding:6px 0">Noch keine Ziele – setz das erste unten. 🎯</div>';return;}
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
        trend=`<span style="color:${d>0?"var(--green)":d<0?"var(--red)":"var(--text3)"};font-weight:700">Gesamt ${base.total_score}% → ${last.total_score}% ${d>0?"↗":d<0?"↘":"→"}</span>`;
      }
    }
    return `<div style="padding:8px 0;border-bottom:1px solid var(--surface2)">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <button onclick="zieleToggle(${z.id},'${done?'offen':'erreicht'}',${spielerId})" title="${done?'wieder offen':'als erreicht markieren'}" style="border:none;background:transparent;cursor:pointer;font-size:18px;line-height:1;padding:0">${done?'✅':'⬜'}</button>
        <span style="flex:1;font-size:13px;${done?'text-decoration:line-through;color:var(--text3)':''}">${esc(z.ziel)}</span>
        <button onclick="zieleDelete(${z.id},${spielerId})" title="löschen" style="border:none;background:transparent;color:var(--red);cursor:pointer;font-size:13px;padding:2px 4px"><i class="ti ti-trash"></i></button>
      </div>
      ${(!done&&ex.length)?`<div style="font-size:11px;color:var(--text2);margin:2px 0 0 26px">🏃 Passende Übungen: ${ex.map(esc).join(" · ")}</div>`:""}
      ${trend?`<div style="font-size:11px;margin:3px 0 0 26px">📈 ${trend} <span style="color:var(--text3)">seit Zielsetzung</span></div>`:""}
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
  if(btn)btn.disabled=true;
  try{
    /* on_conflict=id statt name: mit dem Namen als Schluessel legte eine Umbenennung
       eine ZWEITE Zeile mit neuer ID an, an der alten hingen Punkte, Pausen und
       Rueckmeldungen weiter. Jetzt ist Umbenennen eine normale Aenderung; die
       namens-gefuehrten Texttabellen zieht ein Trigger in der Datenbank nach. */
    const r=await fetch(`${SB_URL}/rest/v1/kader?on_conflict=id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(payload)});
    if(sbCheck401(r)){return;}
    if(r.status===409){toast("Name schon vergeben – jedes Kind braucht einen eigenen","err");return;}
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
async function backupExport(){
  if(!sbToken()){toast("Bitte zuerst als Trainer anmelden","err");return;}
  toast("Backup wird erstellt…");
  // Die trainer_poll-Tabellen fehlten hier von Anfang an – seit die Meetings Themen
  // sammeln, steckt darin Inhalt und nicht nur eine Terminabstimmung.
  // Das Trainingsturnier haengt seit v444 am Termin und liegt in der Datenbank -
  // damit gehoert es in die Sicherung.
  const tables=["kader","spielerprofile","termine","matchday","blitz_ratings","match_actions","ticker_events","nominierungen","anwesenheit","trainings_eval",
                "trainer_poll","trainer_poll_slot","trainer_poll_vote","trainer_poll_thema","trainingsturnier",
                // Beim Saisonstart wandern die alten Spielerbewertungen hierher. Ohne diese
                // Zeile enthielte eine Sicherung nach dem Reset nur noch leere Tabellen.
                "archiv_bewertungen",
                /* Fehlten hier von Anfang an. Der Trainingsplan haelt seit v447 die ganze
                   Einheit (Phasen, Dauern, Uebungen) und ist damit die Vorbereitung
                   mehrerer Wochen - eine Sicherung ohne ihn sichert die Arbeit nicht,
                   um die es geht. */
                "trainingsplan","trainingsgruppen"];
  const dump={_meta:{app:"U9 Adler Dellbrück",exported_at:new Date().toISOString(),tables}};
  try{
    for(const t of tables){
      try{
        const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*`,{headers:sbAuthHeaders()});
        dump[t]=r.ok?await r.json():{error:r.status};
      }catch(e){dump[t]={error:"fetch"};}
    }
    const blob=new Blob([JSON.stringify(dump,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`adler-u9-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Backup heruntergeladen ✓");
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
  const rows=kids.map(k=>{const x=fc(k);return {name:k.name,intern:x.intern,video:x.video,pub:x.public_ok,nf:notfall.has(k.id)};}).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const missIntern=rows.filter(r=>!r.intern).length, missNf=rows.filter(r=>!r.nf).length;
  const cell=ok=>`<span style="font-size:14px">${ok?"✅":"⛔"}</span>`;
  document.getElementById("setup-modal")?.remove();
  const modal=document.createElement("div"); modal.id="setup-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    ${mdlHead("setup-modal","🚀","Eltern-Setup","Foto-Freigaben & Notfallkarten je Kind","#0d9488")}
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:10px">Offen: 📸 ${missIntern} ohne interne Foto-Freigabe · 🚑 ${missNf} ohne Notfallkarte. Foto-Spalten: 🖼️ intern · 🎥 Video · 🌍 öffentlich.</div>
    <div style="display:grid;grid-template-columns:1fr 34px 34px 34px 34px;gap:2px;font-size:10px;font-weight:700;color:var(--text2);padding:0 4px 4px"><div>Kind</div><div style="text-align:center" title="app-intern">🖼️</div><div style="text-align:center" title="Trainingsvideo">🎥</div><div style="text-align:center" title="öffentlich">🌍</div><div style="text-align:center" title="Notfallkarte">🚑</div></div>
    ${rows.map(r=>`<div style="display:grid;grid-template-columns:1fr 34px 34px 34px 34px;gap:2px;align-items:center;padding:5px 4px;border-top:var(--border);font-size:13px"><div>${esc(r.name)}</div><div style="text-align:center">${cell(r.intern)}</div><div style="text-align:center">${cell(r.video)}</div><div style="text-align:center">${cell(r.pub)}</div><div style="text-align:center">${cell(r.nf)}</div></div>`).join("")}
    ${(missIntern||missNf)?`<button class="btn btn-sm btn-p" style="width:100%;margin-top:12px" onclick="setupRemindPush()"><i class="ti ti-bell"></i>Eltern per Push erinnern</button>`:'<div style="text-align:center;color:var(--green);font-size:13px;font-weight:700;margin-top:12px">Alles eingerichtet 🎉</div>'}
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
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:10px">Pausierte Kinder sind bei Prognose, Nominierung und Buddy-Auslosung automatisch raus – bis zum Datum. Grund optional, keine Diagnosen.</div>
    ${paused.length?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text2);margin:4px 0 2px">Aktuell pausiert</div>${paused.map(k=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:var(--border)"><span style="flex:1;font-size:13px">${esc(k.name)} <span style="color:var(--amber);font-weight:700">· bis ${pauseBisLabel(k.name)}</span>${PAUSE_MAP[k.name].grund?`<span style="color:var(--text3);font-size:11px"> · ${esc(PAUSE_MAP[k.name].grund)}</span>`:""}</span><button class="btn btn-sm" title="Genesungsgrüße vom Team erlauben/stoppen (Familie vorher fragen)" onclick="pauseGruesse(${k._id},${PAUSE_MAP[k.name].gruesse_ok?"false":"true"})">${PAUSE_MAP[k.name].gruesse_ok?"💌 an":"💌 aus"}</button><button class="btn btn-sm" onclick="pauseEnd(${k._id})">Beenden</button></div>`).join("")}`:'<div style="font-size:12.5px;color:var(--text3);padding:4px 0">Aktuell pausiert niemand.</div>'}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text2);margin:14px 0 4px">Kind pausieren</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <select id="pause-kid" style="flex:1;min-width:120px;min-height:40px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;background:var(--surface);color:var(--text)">${frei.map(k=>`<option value="${k._id}">${esc(k.name)}</option>`).join("")}</select>
      <input type="date" id="pause-bis" value="${defBis}" style="min-height:40px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;background:var(--surface);color:var(--text)">
    </div>
    <input type="text" id="pause-grund" maxlength="80" placeholder="Grund (optional, keine Diagnosen)" style="width:100%;margin-top:6px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:12.5px;background:var(--surface);color:var(--text);box-sizing:border-box">
    <label style="display:flex;align-items:flex-start;gap:8px;font-size:11.5px;color:var(--text2);margin-top:8px;cursor:pointer"><input type="checkbox" id="pause-gruesse" style="margin-top:2px">💌 Team darf Genesungsgrüße schicken <span style="color:var(--text3)">(bitte vorher die Familie fragen – sichtbar wird nur „fehlt gerade", nie der Grund)</span></label>
    <button class="btn btn-p btn-sm" style="width:100%;margin-top:8px" onclick="pauseSetFromPicker()">⏸ Pausieren</button>
    ${reco.length?`<div style="font-size:11.5px;color:#9a3412;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:7px 10px;margin-top:12px">🩹 Zuletzt krank gemeldet (letzte 14 T.): <b>${reco.map(esc).join(", ")}</b> – bei Bedarf hier als Pause setzen.</div>`:""}
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
  const nameById={}; (typeof KADER!=="undefined"?KADER:[]).forEach(k=>{nameById[k.id]=k.name;});
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
        <div style="font-weight:800;font-size:14px;margin-bottom:4px">${esc(nameById[x.spieler_id]||("Kind #"+x.spieler_id))}</div>
        ${flds.filter(f=>x[f[0]]).map(f=>`<div style="font-size:12.5px;padding:2px 0"><span style="color:var(--text2)">${f[1]}:</span> ${f[0]==="notfall_tel"?tel(x[f[0]]):esc(x[f[0]])}</div>`).join("")}
      </div>`).join(""):'<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px">Noch keine Notfallkarten hinterlegt.<br>Die Eltern füllen sie im Eltern-Bereich (🚑 Notfallkarte).</div>'}
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
  const kTool=(label,fn,title)=>`<button onclick="${fn}" title="${title}" style="flex:1 1 calc(33.3% - 6px);min-width:120px;min-height:46px;border:1px solid var(--rand-bedien);border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--text);background:var(--surface);padding:0 10px">${label}</button>`;
  let html=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      ${kTool("⏸ Pausen","pausenOpen()","Kinder pausieren (fließt in Prognose/Nominierung/Buddy)")}
      ${kTool("🚀 Eltern-Setup","setupTrainerOpen()","Wer hat Foto-Freigabe & Notfallkarte schon eingerichtet?")}
      ${kTool("🚑 Notfallkarten","notfallTrainerOpen()","Notfall-/Gesundheitskarten der Kinder – schreibgeschützt, für den Platz auch offline")}
    </div><table class="kader-t"><thead><tr><th>Spieler</th><th>Rolle</th><th>Grp</th><th>Tech.</th><th>Wahr.</th><th>Phys.</th><th>Ges.</th><th>Pot.</th><th>Von</th><th></th></tr></thead><tbody>`;
  filtered.forEach(name=>{
    const lat=letzter(name);
    const kd=getKader(name);
    const nrBadge=kd&&kd.nr?`<span style="font-size:9px;font-weight:700;color:var(--text3);background:var(--surface2);border:var(--border);border-radius:8px;padding:1px 5px;margin-right:4px">${kd.nr}</span>`:"";
    if(!lat){
      /* Noch nicht bewertet: das Kind steht trotzdem im Kader – mit dem Weg zur ersten
         Bewertung statt einer Zeile voller Nullen, die Koennen vortaeuschen wuerden. */
      html+=`<tr>
        <td><div style="font-weight:600;font-size:12.5px">${nrBadge}${esc(name)}${kd&&kd.tw?' <span style="font-size:9px;color:var(--teal);font-weight:700">🥅</span>':""}</div></td>
        <td colspan="7" style="font-size:11.5px;color:var(--text2)">noch nicht bewertet</td>
        <td style="white-space:nowrap"><button class="btn btn-sm" onclick="kaderBewerten('${jsq(name)}')" title="Erste Bewertung anlegen"><i class="ti ti-clipboard-plus"></i></button></td>
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
    const snBadge=DB[name].length>1?`<span title="${DB[name].length} Bewertungen – mehr = verlässlicher" style="font-size:9px;color:var(--teal);font-weight:600;margin-left:4px">×${DB[name].length}</span>`:"";
    const _tr=(typeof playerTrend==="function")?playerTrend(name):{delta:0,conf:0};
    const trArrow=_tr.delta>2?`<span title="verbessert (+${_tr.delta}%)" style="color:var(--green);font-size:12px;font-weight:800"> ↗</span>`:_tr.delta<-2?`<span title="gefallen (${_tr.delta}%)" style="color:var(--red);font-size:12px;font-weight:800"> ↘</span>`:_tr.conf>=2?`<span title="stabil" style="color:var(--text3);font-size:12px"> →</span>`:"";
    const _hist=(DB[name]||[]).map(s=>s.total_score||0);
    const _spark=(typeof sparklineSVG==="function")?sparklineSVG(_hist):"";
    html+=`<tr>
      <td><div style="font-weight:600;font-size:12.5px">${getKader(name)?.nr?`<span style="font-size:9px;font-weight:700;color:var(--text3);background:var(--surface2);border:var(--border);border-radius:8px;padding:1px 5px;margin-right:4px">${getKader(name).nr}</span>`:""}${esc(name)}${isTw?" 🥅":""}</div><div style="font-size:10px;color:var(--text2)">${esc(lat.datum||'')}${snBadge}</div></td>
      <td><span class="rbadge ${bMap[prim]||'rb-flex'}">${isTw?`TW / ${esc(lMap[prim]||prim)}`:esc(lMap[prim]||prim)}</span>${lat.sek_rolle&&!isTw?`<br><span style="font-size:10px;color:var(--text2)">${esc(lat.sek_rolle)}</span>`:""}</td>
      <td>${grpB}</td>
      ${[0,1,2].map(i=>`<td><span style="font-size:11px;font-weight:600;color:${dimCols[i]}">${sc[i]||0}%</span>${mini(sc[i]||0)}</td>`).join("")}
      <td><span style="font-weight:700;font-size:13px">${tot}%</span>${trArrow}${_spark}</td>
      <td><span style="font-size:11px;color:var(--teal);font-weight:600">${pot}%</span></td>
      <td style="font-size:11px;color:var(--text2)">${esc(lat.trainer||'–')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" data-edit-player data-name="${esc(name)}" data-snap-idx="${DB[name].length-1}" title="Laden"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-d" data-del-player data-name="${esc(name)}"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  });
  html+="</tbody></table>";
  const offen=filtered.filter(n=>!letzter(n)).length;
  wrap.innerHTML='<div class="kader-wrap">'+html+'</div>'
    +(offen?`<div class="kader-hint">${offen} von ${filtered.length} Kindern ${offen===1?"ist":"sind"} noch nicht bewertet – nach dem Saisonstart normal.</div>`:"")
    +'<div class="kader-hint">Technik, Wahrnehmung und Physis stehen je Spieler im <b>Profil</b>.</div>';
  renderRauteMap(bewertet.filter(n=>names.includes(n)));   // die Raute kennt nur Bewertete
}
/* Erste Bewertung aus der Kaderliste heraus starten: Reiter wechseln, Kind vorwaehlen. */
function kaderBewerten(name){
  go("bew");
  setTimeout(()=>{
    const sel=document.getElementById("p-name");
    if(sel){
      sel.value=name;
      if(typeof onChange==="function")onChange();
      if(typeof updateTierHL==="function")updateTierHL();
      if(typeof updateDimPills==="function")updateDimPills();
    }
    if(typeof toast==="function")toast(name+" – Bewertung starten");
  },120);
}

function renderRauteMap(names){
  const wrap=document.getElementById("raute-map");
  if(!names.length){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Noch keine Spieler bewertet</div>';return;}
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
  html+='<div style="padding:8px 10px;background:#fef9c3;border:1px solid #fcd34d;border-radius:var(--r);margin-bottom:8px;font-size:12px;color:#854d0e">';
  html+='<span style="font-weight:700">🥅 Torwart (+1):</span> ';
  if(tw1.length>0) html+='<span style="font-weight:600">'+tw1.map(esc).join(', ')+'</span> <span style="font-size:10px;opacity:.7">(primär)</span>';
  if(tw2.length>0) html+=(tw1.length>0?' · ':'')+tw2.map(esc).join(', ')+' <span style="font-size:10px;opacity:.7">(Option)</span>';
  if(twList.length===0) html+='<span style="font-style:italic;opacity:.6">Noch nicht bewertet</span>';
  html+='</div>';
  html+=`<div class="rk-grid">
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.jaeger.col};background:${cfg.jaeger.bg}"><div class="rk-pos-lbl" style="color:${cfg.jaeger.col}">${cfg.jaeger.label}</div>${posMap.jaeger.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.jaeger.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.flitzer_l.col};background:${cfg.flitzer_l.bg}"><div class="rk-pos-lbl" style="color:${cfg.flitzer_l.col}">${cfg.flitzer_l.label}</div>${posMap.flitzer_l.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.flitzer_l.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.flitzer_r.col};background:${cfg.flitzer_r.bg}"><div class="rk-pos-lbl" style="color:${cfg.flitzer_r.col}">${cfg.flitzer_r.label}</div>${posMap.flitzer_r.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.flitzer_r.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.aufpasser.col};background:${cfg.aufpasser.bg}"><div class="rk-pos-lbl" style="color:${cfg.aufpasser.col}">${cfg.aufpasser.label}</div>${posMap.aufpasser.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.aufpasser.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
  </div>`;
  if(posMap.flex.length>0)html+=`<div style="margin-top:.75rem;font-size:11.5px;color:var(--text2)"><i class="ti ti-adjustments" style="font-size:13px"></i> Noch ohne feste Rolle: ${posMap.flex.map(n=>esc(n)).join(", ")}</div>`;
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
let rchart=null,rchartTimer=0;
function renderProfil(){
  const name=document.getElementById("psel-profil").value;
  if(!window._dbLoaded&&!Object.keys(DB).length){document.getElementById("profil-content").innerHTML=skeletonRows(3);return;} // L2
  if(!name){document.getElementById("profil-content").innerHTML='<div class="empty"><i class="ti ti-user-circle"></i>Spieler auswählen</div>';return;}
  const snaps=DB[name]||[];if(!snaps.length)return;
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
        <div style="font-weight:700;font-size:15px">${esc(name)}${isTw?" 🥅":""}</div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:4px">
          <span class="rbadge ${bMap[lat.position]||'rb-flex'}">${esc(prim)}</span>
          ${!isTw?`<span style="font-size:10.5px;color:var(--text2)">Sek: ${esc(sek)}</span>`:""}
          ${grpB}
          <span style="font-size:10.5px;color:var(--text2)">${esc(lat.trainer||"")} · ${esc(lat.datum||"")}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--text2)">Entwicklungsstand</div>
        <div style="font-size:26px;font-weight:700;color:var(--blue-text)">${tot}%</div>
        <div style="font-size:10.5px;color:var(--teal);font-weight:500">Entwicklungstempo ~${pot}%</div>
        ${typeof raeInfo==="function"&&raeInfo(getKader(name)?.geb)?`<div style="font-size:9.5px;color:var(--text3);max-width:150px;margin-top:2px">${raeInfo(getKader(name)?.geb)}</div>`:""}
      </div>
    </div>

    ${summary?`<div class="summary-box">
      <h3><i class="ti ti-sparkles" style="font-size:13px"></i>Zusammenfassung</h3>
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
      <div class="mb-title"><i class="ti ti-list-check" style="font-size:14px"></i>Konkrete Maßnahmen & Erkenntnisse</div>
      ${st.slice(0,5).map(s=>`<div class="mb-item"><div class="mb-icon" style="background:#dcfce7"><i class="ti ti-plus" style="font-size:11px;color:#15803d"></i></div><div class="mb-text">${esc(s)}</div></div>`).join("")}
      ${ef.slice(0,5).map(e=>`<div class="mb-item"><div class="mb-icon" style="background:#fee2e2"><i class="ti ti-arrow-right" style="font-size:11px;color:var(--red)"></i></div><div class="mb-text">${esc(e)}</div></div>`).join("")}
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
    <div style="font-weight:800;font-size:13.5px;margin-bottom:6px">💪 So sieht ${esc(name)} sich selbst <span style="font-weight:400;color:var(--text2);font-size:11px">(aus der Kabine · ${esc(row.datum)})</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${KAB_SELBST_FRAGEN.map(f=>{const s=KAB_SELBST_STUFEN[a[f.k]];return s?`<span style="font-size:11.5px;font-weight:700;padding:4px 9px;border-radius:12px;background:var(--surface2)">${f.emo} ${esc(f.t)}: ${s[0]}</span>`:"";}).join("")}
    </div>
    ${ueben.length?`<div style="font-size:12px;color:#7c3aed;font-weight:700;margin-top:8px">🌱 Will üben: ${ueben.map(f=>esc(f.t)).join(", ")} – guter Aufhänger fürs nächste Lob oder Entwicklungsziel.</div>`:""}
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
    <div class="aw-pop d2" style="font-size:16px;opacity:.85;margin-top:6px">Saison ${esc(String(d.saison||""))}</div>
    <div class="aw-pop d3" style="font-size:12px;opacity:.6;margin-top:24px">Tippe rechts → weiter · links ← zurück</div></div>`});
  S.push({bg:g("#155e75","#06b6d4"),html:`<div>
    <div class="aw-pop" style="font-size:14px;opacity:.85;text-transform:uppercase;letter-spacing:2px">Ihr wart fleißig</div>
    <div class="aw-big aw-pop d1">${d.spiele||0}</div>
    <div class="aw-pop d1" style="font-size:19px;font-weight:800">Spiele & Turniere</div>
    <div class="aw-pop d2" style="font-size:15px;opacity:.85;margin-top:18px">und <b>${d.trainings||0}</b> Trainingseinheiten 💪</div></div>`});
  S.push({bg:g("#9a3412","#f97316"),html:`<div>
    <div class="aw-pop" style="font-size:14px;opacity:.85;text-transform:uppercase;letter-spacing:2px">Gemeinsam erzielt</div>
    <div class="aw-big aw-pop d1">${d.tore||0}</div>
    <div class="aw-pop d1" style="font-size:22px;font-weight:800">Tore ⚽</div></div>`});
  S.push({bg:g("#5b21b6","#8b5cf6"),html:`<div>
    <div class="aw-big aw-pop">${d.aktionen||0}</div>
    <div class="aw-pop d1" style="font-size:20px;font-weight:800">Ballaktionen 🔥</div>
    <div class="aw-pop d2" style="font-size:15px;opacity:.85;margin-top:16px">darunter <b>${d.paesse||0}</b> Pässe und <b>${d.paraden||0}</b> Paraden 🧤</div></div>`});
  S.push({bg:g("#065f46","#10b981"),html:`<div>
    <div class="aw-pop" style="font-size:14px;opacity:.85;text-transform:uppercase;letter-spacing:2px">Team-Missionen</div>
    <div class="aw-big aw-pop d1">${d.quests_geschafft||0}</div>
    <div class="aw-pop d1" style="font-size:20px;font-weight:800">Quests geknackt 🏆</div></div>`});
  const awards=[];
  if(d.top_torschuetze&&d.top_torschuetze.name)awards.push(["⚽","Torschützenkönig",d.top_torschuetze]);
  if(d.fleissigste&&d.fleissigste.name)awards.push(["🏃","Fleißbiene (Training)",d.fleissigste]);
  if(d.top_aktiv&&d.top_aktiv.name)awards.push(["🔥","Aktivposten",d.top_aktiv]);
  const awardsHtml=awards.length?awards.map((a,i)=>`<div class="aw-pop d${i+1}" style="background:rgba(255,255,255,.14);border-radius:14px;padding:11px 16px;margin:8px auto;max-width:280px">
    <div style="font-size:26px">${a[0]}</div>
    <div style="font-size:19px;font-weight:800">${esc(a[2].name)}</div>
    <div style="font-size:12px;opacity:.85">${a[1]} · ${a[2].wert}</div></div>`).join("")
    :`<div class="aw-pop" style="opacity:.85;font-size:15px">Sammelt Aktionen am Spieltag – dann gibt's hier eure Helden! 🦅</div>`;
  S.push({bg:g("#1e3a8a","#3b82f6"),confetti:true,html:`<div>
    <div class="aw-pop" style="font-size:22px;font-weight:900;margin-bottom:14px">🏅 Eure Saison-Helden</div>${awardsHtml}</div>`});
  S.push({bg:g("#7c2d12","#dc2626"),confetti:true,html:`<div>
    <div class="aw-pop" style="font-size:58px">🦅❤️</div>
    <div class="aw-pop d1" style="font-size:26px;font-weight:900;margin-top:10px">Was für eine Saison, Adler!</div>
    <div class="aw-pop d2" style="font-size:15px;opacity:.85;margin-top:10px">${d.spieler_anzahl||0} Kinder · ein Team</div></div>`});
  // FEAT X: Galerie-Fotos als Hintergrund einstreuen (Gradient-Overlay -> Text bleibt lesbar).
  // Rein DOM (background-image), daher kein Canvas-Taint. Fotos sind lokale Blob-URLs.
  if(fotos&&fotos.length){
    const overlay=(slide,foto)=>{slide.bg=slide.bg.replace(/linear-gradient\(160deg,\s*([^,]+),\s*([^)]+)\)/,(m,a,b)=>`linear-gradient(160deg,${a.trim()}cc,${b.trim()}cc), url("${foto}") center/cover`);};
    [1,2,3,4,5].forEach((si,k)=>{ if(S[si]&&fotos[k])overlay(S[si],fotos[k]); }); // Intro & Finale bleiben clean
    S.splice(S.length-1,0,{bg:`linear-gradient(160deg,#0f172acc,#1e293bcc), url("${fotos[0]}") center/cover`,html:`<div>
      <div class="aw-pop" style="font-size:14px;opacity:.9;text-transform:uppercase;letter-spacing:2px">Unsere Momente</div>
      <div class="aw-pop d1" style="font-size:26px;font-weight:900;margin-top:8px">📸 ${fotos.length} Erinnerungen</div>
      <div class="aw-pop d2" style="font-size:14px;opacity:.85;margin-top:10px">Eine Saison zum Nie-Vergessen 🦅</div></div>`});
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
    <button onclick="adlerWrappedClose()" aria-label="Schließen" style="position:absolute;top:30px;right:12px;z-index:4;background:rgba(0,0,0,.25);border:none;color:#fff;font-size:22px;width:36px;height:36px;border-radius:50%;cursor:pointer">×</button>
    <div id="aw-stage" style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px;position:relative;z-index:1"></div>
    <div style="position:absolute;top:32px;bottom:0;left:0;right:0;z-index:2;display:flex">
      <div style="flex:1" onclick="adlerWrappedPrev()"></div>
      <div style="flex:2" onclick="adlerWrappedNext()"></div>
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
        ${snaps.length?`<div class="zb">Entwicklungsstand<b>${tot}%</b></div>
        <div class="zb">Tempo<b>~${pot}%</b></div>`:""}
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
  const fld="width:100%;box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13.5px;background:var(--surface2);color:var(--text);margin-top:6px";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("urk-modal","🏅","Urkunden-Studio","Saison-Urkunden für alle – oder eine Urkunde zum Anlass","var(--amber)")}
    <div style="font-weight:800;font-size:13px;margin-bottom:4px">Saison-Urkunden (alle Kinder)</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Je Kind eine A4-Seite: Stärken aus der Bewertung, Rolle, Federn und Unterschriften-Zeile – fertig fürs Saisonabschluss-Fest.</div>
    <button class="btn btn-p" style="width:100%" onclick="urkundenAlle(this)"><i class="ti ti-printer"></i>Alle ${active.length} Urkunden drucken</button>
    <div style="font-weight:800;font-size:13px;margin:18px 0 4px">Urkunde zum Anlass</div>
    <div style="font-size:12px;color:var(--text2)">Turnier, Team-Meilenstein, besondere Leistung – Titel und Text frei.</div>
    <select id="urk-kind" style="${fld}"><option value="*">Alle Kinder</option>${active.map(k=>`<option value="${esc(k.name)}">${esc(k.name)}</option>`).join("")}</select>
    <input id="urk-titel" placeholder="Titel, z. B. Turnier-Urkunde" value="Turnier-Urkunde" style="${fld}">
    <input id="urk-anlass" placeholder="Anlass/Untertitel, z. B. Sommer-Cup 2026" style="${fld}">
    <textarea id="urk-text" rows="3" style="${fld}" placeholder="Text auf der Urkunde">Für großartigen Einsatz, Teamgeist und Fairplay. Das ganze Adler-Team ist stolz auf dich!</textarea>
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="urkundeFrei(this)"><i class="ti ti-printer"></i>Anlass-Urkunde drucken</button>
    <div style="font-size:10.5px;color:var(--text3);margin-top:10px">Tipp: Im Druckdialog „Als PDF speichern" wählen, um die Urkunden digital zu verschicken.</div>
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
async function entwicklungsReport(){
  const name=document.getElementById("psel-profil")?.value;
  if(!name){toast("Erst einen Spieler wählen","err");return;}
  const snaps=DB[name]||[]; if(!snaps.length){toast("Keine Bewertung vorhanden","err");return;}
  const lat=snaps[snaps.length-1];
  const k=getKader(name)||{}, isTw=lat.tw===true||k.tw;
  const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
  const {dims:ds}=calcScores(v,DIMS_FELD);
  const dimHtml=DIMS_FELD.map(d=>{const p=Math.round(ds[d.id]||0);return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
    <div style="width:150px;font-size:12px">${esc(d.label)}</div>
    <div style="flex:1;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden"><div style="height:100%;width:${p}%;background:${d.col};border-radius:5px"></div></div>
    <div style="width:38px;text-align:right;font-size:12px;font-weight:700">${p}%</div></div>`;}).join("");
  const tr=playerTrend(name)||{delta:0,conf:snaps.length};
  const arrow=tr.delta>0?`↗ +${tr.delta}%`:tr.delta<0?`↘ ${tr.delta}%`:"→ stabil";
  const badges=(adlerCardData(name)||{}).badges||[];
  const staerken=badges.slice(0,3).map(b=>`<span style="display:inline-block;background:#eef2ff;color:#3730a3;border-radius:14px;padding:3px 10px;font-size:12px;margin:2px 4px 2px 0">${b.icon} ${esc(b.label)}</span>`).join("")||"—";
  // Anwesenheit
  let trP=0,trT=0; try{Object.keys(AW_DATA||{}).forEach(d=>{const e=(AW_DATA[d]||{})[name];if(e&&typeof e.da==="boolean"){trT++;if(e.da)trP++;}});}catch(e){}
  let gmP=0,gmT=0; try{const r=await fetch(`${SB_URL}/rest/v1/nominierungen?select=data`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(row=>{const s=kidMapFromIds(row.data||{})[name];if(s==="dabei"||s==="nicht"||s==="verletzt"){gmT++;if(s==="dabei")gmP++;}});}catch(e){}
  const q=(p,t)=>t?Math.round(p/t*100)+"% ("+p+"/"+t+")":"—";
  // Aktuelle Ziele
  let goals=[]; if(k.id){try{const r=await fetch(`${SB_URL}/rest/v1/entwicklungsziele?spieler_id=eq.${k.id}&status=eq.offen&select=ziel&order=created_at.desc`,{headers:sbAuthHeaders()});if(r.ok)goals=(await r.json()).map(z=>z.ziel).filter(Boolean);}catch(e){}}
  const goalsHtml=goals.length?goals.map(g=>`<li style="font-size:12.5px;margin:2px 0">${esc(g)}</li>`).join(""):'<li style="font-size:12.5px;color:#64748b">Noch kein Ziel gesetzt</li>';
  const fazit=(lat.fazit||"").trim();
  document.getElementById("zert-print").innerHTML=`
    <div style="max-width:720px;margin:0 auto;padding:24px;font-family:Inter,system-ui,sans-serif;color:#1a1a2e">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--blue);padding-bottom:10px;margin-bottom:14px">
        <img src="logo.png" alt="" style="width:48px;height:48px;object-fit:contain">
        <div><div style="font-size:12px;color:#64748b">SV Adler Dellbrück e.V. · U9</div>
        <div style="font-size:20px;font-weight:800">Entwicklungsbericht</div></div>
        <div style="margin-left:auto;text-align:right;font-size:12px;color:#64748b">Saison ${saisonLabel()}<br>${new Date().toLocaleDateString("de-DE")}</div>
      </div>
      <div style="font-size:22px;font-weight:800;margin-bottom:2px">${esc(name)}${isTw?" 🥅":""}${k.nr!=null?` <span style="color:#94a3b8;font-size:15px">#${k.nr}</span>`:""}</div>
      <div style="font-size:13px;color:#475569;margin-bottom:14px">Rolle: ${esc(lat.prim_rolle||k.lieblingsposition||"Allrounder")} · ${snaps.length} Bewertung${snaps.length!==1?"en":""}</div>

      <div style="display:flex;gap:14px;margin-bottom:14px">
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Entwicklungsstand</div>
          <div style="font-size:24px;font-weight:800;color:var(--blue-text)">${lat.total_score||0}%</div>
          <div style="font-size:12px;font-weight:700;color:${tr.delta>0?'var(--green)':tr.delta<0?'var(--red)':'#64748b'}">${arrow}</div>
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

      <div style="margin-top:18px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px">Vertraulich – nur für das Entwicklungsgespräch. Trainerteam SV Adler Dellbrück U9.</div>
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
const CARD_THEMES={
  tech:{a:"#1e3a8a",b:"#3b82f6",name:"TECHNIK"}, raute:{a:"#5b21b6",b:"#8b5cf6",name:"SPIELWITZ"},
  phys:{a:"#9a3412",b:"#f97316",name:"DYNAMIK"}, mental:{a:"#065f46",b:"#10b981",name:"CHARAKTER"},
  entw:{a:"#155e75",b:"#06b6d4",name:"TALENT"}, keeper:{a:"#854d0e",b:"#eab308",name:"TORWART"}
};
/* Meilenstein-Karten (Phase 11-R): Design nach TEILNAHME, nicht Leistung.
   ≥10 Trainings → Gold, ≥20 → Hero. Überschreibt das Dim-Theme. Metallischer Verlauf,
   Doppelrahmen, Glanz + Siegel werden in adlerCardDraw gebacken (bleiben im PNG-Export). */
const CARD_MILESTONES=[
  {min:20, a:"#2a0e57", b:"#f59e0b", name:"HERO", medal:"hero", border:"#fcd34d"},
  {min:10, a:"#5c4300", b:"#e9c94a", name:"GOLD", medal:"gold", border:"#ffe08a"}
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
  wrap.innerHTML=`<div style="font-size:11px;font-weight:800;color:var(--text);margin-bottom:8px">🃏 Karten-Designs <span style="color:var(--text3);font-weight:600">(${unlocked}/${shown.length} frei · ${f} 🪶)</span></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`+
    shown.map(s=>{
      const on=f>=s.min, isActive=active&&active.name===s.name;
      return `<div style="text-align:center;padding:6px 2px;border-radius:10px;${isActive?"background:rgba(250,204,21,.14);outline:2px solid "+(s.border||"#facc15"):""}">
        <div style="font-size:24px;line-height:1;${on?"":"filter:grayscale(1);opacity:.4"}">${s.emo}</div>
        <div style="font-size:9px;font-weight:700;color:${on?"var(--text)":"var(--text3)"};margin-top:3px;line-height:1.1">${s.name.replace("-Adler","")}</div>
        <div style="font-size:8px;color:var(--text3);margin-top:1px">${on?(isActive?"aktiv":"frei ✓"):"🔒 "+s.min+" 🪶"}</div>
      </div>`;
    }).join("")+`</div>
    <div style="font-size:9px;color:var(--text3);margin-top:8px;text-align:center">Sammle Adler-Federn 🪶 – z. B. im Fußball-Wissensquiz – und schalte neue Designs frei!</div>`;
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
    b.style.cssText="position:fixed;top:12%;left:50%;z-index:10073;background:"+((sk&&sk.border)||"#facc15")+";color:#1a1205;font-weight:900;font-size:16px;padding:10px 18px;border-radius:30px;box-shadow:0 8px 30px rgba(0,0,0,.45);animation:cardBanner 2.8s ease-out forwards";
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
function adlerCardData(name){
  const snaps=DB[name]||[];
  if(!snaps.length)return null;
  const lat=snaps[snaps.length-1];
  const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
  const k=getKader(name)||{};
  // Top-3 Staerken (nach Wert; bei Gleichstand egal) – jedes Kind bekommt 3 Badges
  const strengths=Object.keys(CARD_BADGES).map(key=>({key,val:v[key]||0})).sort((a,b)=>b.val-a.val).slice(0,3);
  // Design-Farbe: staerkste Dimension (TW -> Gold)
  const{dims:ds}=calcScores(v,DIMS_FELD);
  const topDim=Object.entries(ds).sort((a,b)=>b[1]-a[1])[0]||["tech",0];
  const theme=k.tw?CARD_THEMES.keeper:(CARD_THEMES[topDim[0]]||CARD_THEMES.tech);
  const posMap={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer",flitzer_r:"Flitzer"};
  const pos=k.lieblingsposition||(k.tw?"Torwart":(posMap[lat.position]||lat.prim_rolle||"Allrounder"));
  const fussMap={L:"linker Fuß",R:"rechter Fuß",B:"beidfüßig"};
  return {name,nr:k.nr,tw:!!k.tw,geb:k.geb,fotoPath:k.foto_path,pos:cardPosLabel(pos),fuss:fussMap[k.starker_fuss||lat.strong_foot]||"",
          alter:k.geb?homeAlter(k.geb):(lat.age||null), badges:strengths.map(s=>CARD_BADGES[s.key]), theme, spielerId:k.id};
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

  // ── Einsatz-Zähler (Fleiß statt Skill-Ranking): positionsgerecht (TW → Paraden) ──
  const c=d.counts||null;
  const first=d.tw?{ic:"🧤",v:c&&c.paraden,l:"PARADEN"}:{ic:"⚽",v:c&&c.tore,l:"TORE"};
  const quad=[first,{ic:"🎯",v:c&&c.aktionen,l:"AKTIONEN"},{ic:"👟",v:c&&c.spiele,l:"SPIELE"},{ic:"🏃",v:c&&c.trainings,l:"TRAININGS"}];
  const ty=nameY+50, tbh=88, tw4=(W-80)/4;
  ctx.save();tbRoundRect(ctx,40,ty,W-80,tbh,16);ctx.fillStyle="rgba(0,0,0,.20)";ctx.fill();ctx.restore();
  quad.forEach((t,i)=>{
    const tx=40+tw4*i+tw4/2;
    ctx.textAlign="center";
    ctx.font="20px Arial";ctx.fillStyle="#fff";ctx.fillText(t.ic,tx,ty+28);
    ctx.font="800 26px Arial";ctx.fillText((c&&t.v!=null)?String(t.v):"–",tx,ty+58);
    ctx.font="600 10px Arial";ctx.fillStyle="rgba(255,255,255,.85)";ctx.fillText(t.l,tx,ty+75);
    if(i<3){ctx.strokeStyle="rgba(255,255,255,.16)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40+tw4*(i+1),ty+14);ctx.lineTo(40+tw4*(i+1),ty+tbh-14);ctx.stroke();}
  });

  // ── Badges (immer 3) ──
  const by=ty+tbh+16, bh=118;
  ctx.save();tbRoundRect(ctx,30,by,W-60,bh,18);ctx.fillStyle="rgba(0,0,0,.24)";ctx.fill();ctx.restore();
  const bw=(W-60)/3;
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
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?select=data`,{headers:sbAuthHeaders()});
    if(r.ok){out.spiele=(await r.json()).filter(x=>x.data&&kidMapFromIds(x.data)[name]==="dabei").length;}
  }catch(e){}
  try{
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
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10002;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  canvas.style.cssText="max-width:100%;width:300px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)";
  const cardWrap=cardHoloWrap(canvas); // FUT 2.0: Foil-Overlay über der Karte
  modal.appendChild(cardWrap);
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
  bar.innerHTML=`<button class="btn btn-p" onclick="adlerCardShare()"><i class="ti ti-share"></i>Karte teilen</button>
    <button class="btn" onclick="document.getElementById('adler-card-modal').remove()">Schließen</button>`;
  modal.appendChild(bar);
  document.body.appendChild(modal);
  // Federn-Stand → Karten-Skin (wird in render() gebacken) + Foil-Tier + Skin-Galerie
  if(d.spielerId){ xpTotal(d.spielerId).then(f=>{ if(document.getElementById("adler-card-modal")){ d.federn=f; render(); cardHoloSetTier(cardWrap,cardSkinFor(f)); modal.appendChild(cardSkinGalleryEl(f)); } }).catch(()=>{}); }
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
  if(!name){document.getElementById("verlauf-content").innerHTML='<div class="empty"><i class="ti ti-chart-line"></i>Spieler auswählen</div>';return;}
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
    deltaHtml=`<div class="delta-box"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:8px"><i class="ti ti-trending-up" style="font-size:13px"></i> Delta ${esc(prev.datum||'–')} → ${esc(curr.datum||'–')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${dl.map((l,i)=>{const d=(scC[i]||0)-(scP[i]||0);return`<span class="hp">${l}: <span class="${d>0?'dp':d<0?'dn':''}">${d>0?'+':''}${d}%</span></span>`;}).join("")}</div>
    <div style="font-size:12.5px;font-weight:600">Gesamt: <span class="${totD>0?'dp':totD<0?'dn':''}">${totD>0?'+':''}${totD}%</span></div></div>`;
  }
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
    <div style="font-weight:700;font-size:14px">${esc(name)}${isTw?" 🥅":""}</div>
    <span style="font-size:11px;color:var(--text2)">${snaps.length} Bewertung${snaps.length!==1?"en":""}</span>
  </div>
  ${snaps.length>=2?deltaHtml:""}
  ${snaps.length<2?'<div class="status s-info show" style="margin-bottom:.75rem">Mind. 2 Bewertungen für Verlaufsdiagramm nötig.</div>':""}
  <div style="position:relative;height:240px;margin-bottom:1rem"><canvas id="vc" role="img" aria-label="Verlauf ${esc(name)}">Entwicklung</canvas></div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:1rem">${dl.map((l,i)=>`<span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:500;color:var(--text2)"><span style="width:14px;height:3px;background:${cols[i]};display:inline-block;border-radius:2px"></span>${l}</span>`).join("")}</div>
  <div class="sl"><i class="ti ti-history"></i>Alle Snapshots</div>`;
  snaps.forEach((s,idx)=>{
    const sc=safeParse(s.scores,[]);
    const prev=idx>0?safeParse(snaps[idx-1].scores,null):null;
    const bMap={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts"};
    html+=`<div class="hi">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
        <span style="font-weight:600;font-size:13px">${esc(s.datum||'–')}</span>
        <span class="rbadge ${bMap[s.position]||'rb-flex'}">${esc(s.prim_rolle||s.position||'–')}</span>
        <span style="font-size:10.5px;color:var(--text2)">${esc(s.trainer||'')}</span>
        <span style="font-size:14px;font-weight:700;color:var(--blue-text)">${s.total_score||0}%</span>
        <button data-del-snap data-name="${esc(name)}" data-datum="${esc(s.datum||'')}" data-id="${esc(s.id||'')}" style="padding:3px 8px;font-size:10px;background:#fef2f2;color:var(--red);border:1px solid #fca5a5;border-radius:6px;cursor:pointer;font-family:inherit">Löschen</button>
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
  // Reiter-Beschriftung = Kachel-Beschriftung = Seitenüberschrift (PO: ein Name je Sache)
  team:    {sections:[
    {key:"kader",   label:"Kader",       icon:"ti-users"},
    {key:"profil",  label:"Profil",      icon:"ti-user"},
    {key:"bew",     label:"Bewerten",    icon:"ti-clipboard-list"},
    {key:"verlauf", label:"Entwicklung", icon:"ti-chart-line"},
  ]},
  training:{sections:[
    // Beschriftung muss zur Training-Kachel passen (PO) – ein Name je Sache
    {key:"anwesenheit", label:"Anwesenheit",   icon:"ti-checkbox"},
    {key:"planung",     label:"Trainingsplan", icon:"ti-calendar-event"},
    {key:"formen",      label:"Übungen",       icon:"ti-ball-football"},
    {key:"quizresults", label:"Quiz-Ergebnisse", icon:"ti-brain", hidden:true}, // PO: wohnt jetzt unter Eltern & Kinder; go() braucht den Eintrag weiter
  ]},
  spieltag:{sections:[
    {key:"spieltag", label:"Match",       icon:"ti-ball-football"},
    {key:"kombi",    label:"Aufstellung", icon:"ti-users-group"},
    {key:"analyse",  label:"Analyse",     icon:"ti-chart-dots"},
  ]},
  taktik:  {sections:[
    {key:"taktik",   label:"Taktikboard", icon:"ti-arrows-move"},
  ]},
  orga:    {sections:[
    {key:"termine",  label:"Termine",  icon:"ti-calendar"},
    {key:"team",     label:"Pinnwand", icon:"ti-clipboard"},
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
      if(typeof tpPlanRestore==="function")tpPlanRestore();};
    if(s&&s.options.length<=1&&typeof terminSelectFill==="function")terminSelectFill("tp-date",{types:["training"],future:true,vorbeiUeberspringen:true,onReady:go}); else go();
    if(typeof tpVorplanLoad==="function")tpVorplanLoad();}},
  anwesenheit:{cid:"train-sub-anwesenheit",sub:true, init:()=>awDatesLoad()},
  quizresults:{cid:"train-sub-quizresults",sub:true, init:()=>w2("tqRenderTrainerView")},
  team:       {cid:"train-sub-team",       sub:true, init:()=>{w2("tnLoad");w2("teamStatsRender");tvInit();}},
  analyse:    {cid:"train-sub-analyse",    sub:true, init:()=>w2("anInit")},
  spieltag:   {cid:"train-sub-spieltag",   sub:true, init:()=>{spieltagPhasenZu();spieltagPhaseVorwaehlen();w2("rotRenderControls");w2("nomInit");}},
};
const tabState={}; // zuletzt geöffnete Sektion je Tab (UX: Rückkehr an dieselbe Stelle)
let curSection="bew"; // aktuell sichtbare Sektion (für Pull-to-Refresh)
function sectionTab(key){ for(const t in TABS){ if(TABS[t].sections.some(s=>s.key===key))return t; } return null; }

function renderSubbar(tabId,activeKey){
  const bar=document.getElementById("tab-subbar");
  if(!bar)return;
  const secs=TABS[tabId].sections.filter(s=>!s.hidden);
  if(secs.length<=1){ bar.style.display="none"; bar.innerHTML=""; return; }
  bar.style.display="flex";
  // Aktiver Reiter trägt die Familienfarbe der Kachel (PO: gleiche Optik wie das Kachel-Menü)
  const fam=(typeof KACHELN!=="undefined"&&KACHELN[tabId])?KACHELN[tabId].col:"var(--blue)";
  bar.innerHTML=secs.map(s=>`<button class="sub-tab${s.key===activeKey?' active':''}"${s.key===activeKey?` style="background:${fam};box-shadow:none"`:""} onclick="go('${s.key}')"><i class="ti ${s.icon}"></i>${s.label}</button>`).join("");
}
function _open(key){
  const sec=SECS[key]; if(!sec)return;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".train-sub").forEach(v=>v.classList.remove("active"));
  if(sec.sub)document.getElementById("view-training")?.classList.add("active"); // passiver Host sichtbar machen
  document.getElementById(sec.cid)?.classList.add("active");
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
  if(document.startViewTransition&&!reduce)document.startViewTransition(()=>_open(key));else _open(key);
  // Nebenwirkungen (aus altem _svApply/switchTrainSub übernommen)
  if(key==="taktik")requestWakeLock();else releaseWakeLock();
  // Rotations-Timer/Match-Uhr-Tick stoppen beim Verlassen des Spieltags (try/catch: ggf. noch in TDZ beim Start)
  try{ if(key!=="spieltag"&&rotTimerId&&typeof rotStop==="function")rotStop(); }catch(e){} // rotStop persistiert die Zeiten – blanker clearInterval verlor bis zu 30 s Fairness-Daten
  try{ if(key!=="spieltag"&&mcTickId){clearInterval(mcTickId);mcTickId=null;} }catch(e){}
  if(SECS[key].init)setTimeout(SECS[key].init,50);
  tabState[tabId]=key;
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
}
/* v473 – Rundgang: Am Spieltag lag der Ticker drei Taps tief (Spieltag → Match → „② Während
   des Spiels" aufklappen). Ist der gewaehlte Spieltag HEUTE, oeffnet die Seite den
   Abschnitt, den die Uhrzeit nahelegt: vor dem Anpfiff „① Vor dem Spiel", waehrend „② Live",
   danach „③ Nach dem Spiel". Laeuft die Match-Uhr, zaehlt das mehr als die Uhrzeit.
   An jedem anderen Tag bleibt alles zu (v459). Welle-1-Code: Welle-2-Namen nur ueber typeof. */
async function spieltagPhaseVorwaehlen(){
  const heute=new Date().toISOString().slice(0,10);
  const datum=(typeof spieltagRawDate==="function")?spieltagRawDate():(document.getElementById("spieltag-date")?.value||heute);
  if(datum!==heute)return;
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
  const d=document.getElementById(phase); if(d)d.open=true;
}
function openTab(tabId){ if(!TABS[tabId])return; go(tabState[tabId]||TABS[tabId].sections[0].key); }
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
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="flex:1;font-weight:800;font-size:13.5px">🗣️ Elterngespräch-Wünsche (${rows.length})</div>
      <button onclick="epollTrainerOpen()" class="btn btn-sm">🗓️ Terminfindungen</button></div>
    ${rows.map(w=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:var(--border-s)">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700">${esc((w.kader&&w.kader.name)||"Ein Elternteil")}</div>
        ${w.thema?`<div style="font-size:11.5px;color:var(--text2);line-height:1.4">${esc(w.thema)}</div>`:`<div style="font-size:11.5px;color:var(--text3)">Kein Thema angegeben</div>`}
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${new Date(w.created_at).toLocaleDateString("de-DE")}</div>
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

/* Trainer-Meeting-Doodle: Terminvorschläge, Abstimmung (✓/?/✗) unter Trainern, festlegen.
   Nur Trainer (RLS). Stimmen per Upsert (voter = auth.uid()). */
async function trainerMeetingOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("tm-meet-modal")?.remove();
  const m=document.createElement("div");m.id="tm-meet-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
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
  const FLD="padding:8px;min-height:44px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  let polls=[],slots=[],votes=[],themen=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?select=*&order=created_at.desc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)polls=await r.json();}catch(e){}
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
    const slotHtml=ss.map(s=>{
      const vs=votesBySlot[s.id]||[];
      const ja=vs.filter(v=>v.status==="ja").length, viel=vs.filter(v=>v.status==="vielleicht").length, nein=vs.filter(v=>v.status==="nein").length;
      const mine=(vs.find(v=>v.voter===myUid)||{}).status||null;
      const d=new Date(s.datum+"T00:00:00");
      const dstr=d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
      const zstr=s.uhrzeit?" · "+String(s.uhrzeit).slice(0,5)+" Uhr":"";
      if(steht){
        const tage=Math.round((d-new Date(new Date().toISOString().slice(0,10)+"T00:00:00"))/864e5);
        const bald=tage<0?"war am":tage===0?"heute":tage===1?"morgen":"in "+tage+" Tagen";
        return `<div style="border:1.5px solid var(--green);background:var(--green-bg);border-radius:10px;padding:10px 12px;margin-top:6px">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--green)">✅ Termin steht · ${esc(bald)}</div>
          <div style="font-size:15px;font-weight:800;color:var(--text);margin-top:2px">${dstr}${zstr}</div>
          <div style="font-size:10.5px;color:var(--text3);margin-top:3px">✓ ${ja} · ? ${viel} · ✗ ${nein} · <button onclick="tpollOeffnen(${p.id})" style="border:none;background:none;color:var(--blue-text);font-weight:700;cursor:pointer;font-size:10.5px;padding:0">Termin doch ändern</button></div>
        </div>`;
      }
      const voteBtns=["ja","vielleicht","nein"].map(st=>{const on=mine===st;const emo=st==="ja"?"✓":st==="vielleicht"?"?":"✗";const col=st==="ja"?"var(--green)":st==="vielleicht"?"var(--amber)":"var(--red)";
        return `<button onclick="tpollVote(${s.id},'${st}')" aria-label="${st}" style="min-width:44px;min-height:44px;border-radius:8px;border:${on?"1.5px solid "+col:"var(--border-s)"};background:${on?col:"var(--surface)"};color:${on?"#fff":"var(--text2)"};cursor:pointer;font-weight:800">${emo}</button>`;}).join("");
      return `<div style="border:var(--border-s);border-radius:10px;padding:8px 10px;margin-top:6px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:110px;font-size:12.5px;font-weight:700">${dstr}${zstr}</div>
          <div style="display:flex;gap:4px">${voteBtns}</div>
        </div>
        <div style="font-size:10.5px;color:var(--text3);margin-top:4px">✓ ${ja} · ? ${viel} · ✗ ${nein} · <button onclick="tpollDecide(${p.id},${s.id})" style="border:none;background:none;color:var(--blue-text);font-weight:700;cursor:pointer;font-size:10.5px;padding:0">diesen Termin festlegen</button></div>
      </div>`;
    }).join("");
    return `<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px"><div style="flex:1;font-weight:800;font-size:14px">🗓️ ${esc(p.titel)}</div>
        <button onclick="tpollDelete(${p.id},'${jsq(p.titel)}')" aria-label="Meeting löschen" style="border:none;background:none;color:var(--red);cursor:pointer;min-width:44px;min-height:44px"><i class="ti ti-trash"></i></button></div>
      ${steht?"":'<div style="font-size:11px;color:var(--text3)">Stimmt ab: ✓ passt · ? vielleicht · ✗ nicht</div>'}
      ${slotHtml||'<div style="font-size:11px;color:var(--text3)">Keine Termine.</div>'}
      ${steht?tpollThemenHtml(p.id,themenByPoll[p.id]||[]):""}
    </div>`;
  }).join("");
  c.innerHTML=`${mdlHead("tm-meet-modal","🗓️","Trainer-Meetings","Nur Trainer · vorschlagen, abstimmen, festlegen","#334155")}
    ${pollHtml||'<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Noch kein Meeting geplant.</div>'}
    <div style="border-top:var(--border);padding-top:12px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">Neues Meeting</div>
      <input id="tpoll-titel" placeholder="Titel (z. B. Saisonplanung)" style="width:100%;margin-bottom:6px;${FLD}">
      <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Terminvorschläge (Datum + Uhrzeit):</div>
      ${[0,1,2,3].map(i=>`<div style="display:flex;gap:6px;margin-bottom:4px"><input type="date" id="tpoll-d${i}" style="flex:2;${FLD}"><input type="time" id="tpoll-t${i}" style="flex:1;${FLD}"></div>`).join("")}
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-p btn-sm" onclick="tpollCreate(this)"><i class="ti ti-plus"></i>Meeting anlegen</button>
        <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('tm-meet-modal').remove()">Schließen</button>
      </div>
    </div>`;
}
/* Themen zum festgelegten Meeting: die Tagesordnung. Wer zwischendurch etwas einfällt,
   schreibt es hier hin, statt es bis zum Abend zu behalten. Erledigtes bleibt stehen und
   wird durchgestrichen – so sieht man am Ende, was wirklich besprochen wurde. */
function tpollThemenHtml(pollId,liste){
  const offen=liste.filter(t=>!t.erledigt).length;
  const zeilen=liste.map(t=>`<div style="display:flex;align-items:center;gap:6px;padding:2px 0">
      <button onclick="tpollThemaToggle(${t.id},${t.erledigt?"false":"true"})" aria-label="${t.erledigt?"wieder öffnen":"abhaken"}" style="border:none;background:transparent;font-size:16px;cursor:pointer;min-width:44px;min-height:44px;margin:-8px 0;flex:none">${t.erledigt?"✅":"⬜"}</button>
      <div style="flex:1;min-width:0;font-size:13px;line-height:1.4;${t.erledigt?"text-decoration:line-through;color:var(--text3)":"color:var(--text)"}">${esc(t.text)}</div>
      <button onclick="tpollThemaDelete(${t.id})" aria-label="Thema löschen" style="border:none;background:transparent;color:var(--text2);cursor:pointer;min-width:44px;min-height:44px;margin:-8px 0;flex:none"><i class="ti ti-x"></i></button>
    </div>`).join("");
  return `<div style="border-top:var(--border);margin-top:10px;padding-top:10px">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">📝 Themen fürs Meeting${liste.length?` · ${offen} offen von ${liste.length}`:""}</div>
    ${zeilen||'<div style="font-size:11.5px;color:var(--text3);padding:2px 0 6px">Noch kein Thema. Was soll besprochen werden?</div>'}
    <div style="display:flex;gap:6px;margin-top:6px">
      <input id="tpoll-thema-${pollId}" placeholder="z. B. Trikots nachbestellen" onkeydown="if(event.key==='Enter')tpollThemaAdd(${pollId})" style="flex:1;min-height:44px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box">
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
async function tpollThemaToggle(id,erledigt){
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_thema?id=eq.${id}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({erledigt})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht ändern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
  tpollRender();
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
    const r=await fetch(`${SB_URL}/rest/v1/trainer_poll`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify({titel})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht anlegen"),"err");return;}
    const poll=(await r.json())[0];
    await fetch(`${SB_URL}/rest/v1/trainer_poll_slot`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(slots.map(s=>({poll_id:poll.id,datum:s.datum,uhrzeit:s.uhrzeit})))});
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Meeting angelegt ✓");
  tpollRender();
}
async function tpollVote(slotId,status){
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll_vote?on_conflict=slot_id,voter`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({slot_id:slotId,status})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht abstimmen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  tpollRender();
}
async function tpollDecide(pollId,slotId){
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_poll?id=eq.${pollId}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({status:"entschieden",decided_slot_id:slotId})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht festlegen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Termin festgelegt ✓");
  tpollRender();
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
  const FLD="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
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
        <div style="flex:1;min-width:110px;font-size:12.5px;font-weight:700">${dstr}${zstr}${decided?' <span style="color:var(--green)">✅</span>':""}</div>
        <div style="font-size:11px;color:var(--text2)">${antwort}</div>
        ${p.status!=="entschieden"?`<button onclick="epollDecide(${p.id},${s.id})" class="btn btn-sm">festlegen</button>`:""}
      </div>`;
    }).join("");
    return `<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px"><div style="flex:1;font-weight:800;font-size:14px">🗓️ ${esc((p.kader&&p.kader.name)||"Familie")}${p.titel&&p.titel!=="Elterngespräch"?" · "+esc(p.titel):""}</div>
        <button onclick="epollDelete(${p.id})" aria-label="löschen" style="border:none;background:none;color:var(--red);cursor:pointer;min-width:32px;min-height:32px"><i class="ti ti-trash"></i></button></div>
      ${p.status==="entschieden"?'<div style="font-size:11px;color:var(--green);font-weight:700">Termin steht ✓</div>':'<div style="font-size:11px;color:var(--text3)">Warte auf die Rückmeldung der Eltern.</div>'}
      ${slotHtml||'<div style="font-size:11px;color:var(--text3)">Keine Termine.</div>'}
    </div>`;
  }).join("");
  const kinder=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const kidOpts=kinder.map(k=>`<option value="${k._id!=null?k._id:k.id}"${(prefillSpieler&&(k._id===prefillSpieler||k.id===prefillSpieler))?" selected":""}>${esc(k.name)}</option>`).join("");
  c.innerHTML=`${mdlHead("ep-poll-modal","🗣️","Elterngespräch-Termine","Einer Familie Termine vorschlagen · Eltern antworten, du legst fest","#475569")}
    ${pollHtml||'<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Noch keine Terminfindung.</div>'}
    <div style="border-top:var(--border);padding-top:12px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">Neuer Terminvorschlag</div>
      <label style="font-size:10px;color:var(--text3)">Familie / Kind<select id="epoll-kid" style="width:100%;margin-bottom:6px;${FLD}">${kidOpts}</select></label>
      <input id="epoll-titel" placeholder="Thema (optional, z. B. Entwicklung)" style="width:100%;margin-bottom:6px;${FLD}">
      <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Terminvorschläge (Datum + Uhrzeit):</div>
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
    <span style="font-size:11px;color:${col||'var(--text2)'};font-weight:${col?700:400}">${right}</span></div>`;
  const playHtml=top.length?`<div style="font-weight:700;margin-bottom:2px">🎯 Kein Kind übersehen</div>
    <div style="font-size:10.5px;color:var(--text2);margin-bottom:8px">Zuletzt am wenigsten Spielzeit &amp; Aktionen – gib ihnen bewusst mehr Bühne.</div>
    ${top.map(s=>line(s.nr,s.name,`${s.min} Min · ${s.act} Aktionen`)).join("")}`:"";
  const absHtml=absent.length?`<div style="font-weight:700;margin:${top.length?"14px":"0"} 0 6px">📅 Zuletzt öfter gefehlt</div>
    ${absent.slice(0,3).map(a=>line(a.nr,a.name,`${a.streak}× nicht da`,"var(--red)")).join("")}`:"";
  box.innerHTML=`<div class="card" style="padding:14px;margin-bottom:10px;border-left:3px solid var(--red)">${playHtml}${absHtml}</div>`;
}
function onboardingDismiss(){ try{localStorage.setItem("adler_onboarded","1");}catch(e){} document.getElementById("onboard-card")?.remove(); }
// Schnelle Einheit-Bewertung: 3 Stern-Kategorien (Spaß/Umsetzung/Erfolg) + Notiz, pro Datum.
let EINHEIT_CACHE=[];
function einheitStarsHtml(key,val,max,size){
  return [...Array(max).keys()].map(n=>n+1).map(i=>`<span onclick="einheitSetStar('${key}',${i},${max},${size})" style="cursor:pointer;font-size:${size}px;line-height:1;color:${i<=val?'#f59e0b':'#cbd5e1'}">${i<=val?'★':'☆'}</span>`).join("");
}
function einheitStarRow(key,label,val,max,size){
  val=val||0; max=max||5; size=size||24;
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0">
    <span style="font-size:13.5px;font-weight:600;color:var(--text);min-width:0">${label}</span>
    <span id="eb-stars-${key}" data-val="${val}" style="white-space:nowrap">${einheitStarsHtml(key,val,max,size)}</span></div>`;
}
function einheitSetStar(key,val,max,size){
  const box=document.getElementById("eb-stars-"+key); if(!box)return;
  const nv=(parseInt(box.dataset.val)||0)===val?0:val; // gleicher Stern nochmal = zurücksetzen
  box.dataset.val=nv;
  box.innerHTML=einheitStarsHtml(key,nv,max||5,size||24);
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
let EB_TERMINE=[], EB_DATUM=null, EB_PLAN=[], EB_SPIELER=[];

/* v483: aus dem Trainingsplan direkt in die Nachbereitung dieses Tages. */
async function einheitNachbereiten(datum){
  await einheitBewertenOpen();
  if(datum&&document.getElementById("eb-card"))einheitDetailOpen(datum);
}
async function einheitBewertenOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("eb-modal")?.remove();
  const heute=new Date().toISOString().slice(0,10);
  try{const r=await fetch(`${SB_URL}/rest/v1/einheit_bewertung?select=*&order=datum.desc&limit=20`,{headers:sbAuthHeaders()});if(r.ok)EINHEIT_CACHE=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=eq.training&datum=lte.${heute}&select=datum,platz,uhrzeit&order=datum.desc&limit=10`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)EB_TERMINE=await r.json();}catch(e){}
  const modal=document.createElement("div");
  modal.id="eb-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Einheit bewerten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="eb-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c);document.body.appendChild(modal);
  einheitListRender();
}

function einheitListRender(){
  const c=document.getElementById("eb-card"); if(!c)return;
  EB_DATUM=null;
  const wtag=d=>["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(d+"T00:00:00").getDay()];
  const rows=EB_TERMINE.map(t=>{
    const bew=EINHEIT_CACHE.find(x=>x.datum===t.datum);
    const dt=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
    return `<div onclick="einheitDetailOpen('${t.datum}')" style="display:flex;align-items:center;gap:10px;padding:11px 10px;border:var(--border-s);border-radius:10px;margin-bottom:6px;cursor:pointer;background:var(--surface2)">
      <div style="font-size:20px">${bew?"✅":"⭐"}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:var(--text)">${wtag(t.datum)} ${dt}</div>
        <div style="font-size:10.5px;color:var(--text3)">${t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":""}${t.platz?" · 🏟️ "+esc(t.platz):""}${bew?" · bewertet":" · noch offen"}</div>
      </div>
      <div style="font-size:18px;color:var(--text3)">›</div>
    </div>`;
  }).join("");
  c.innerHTML=`${mdlHead("eb-modal","⭐","Einheit bewerten","Wähle die Trainingseinheit, die du nachbereiten willst","#2563eb")}
    ${EB_TERMINE.length?rows:'<div style="font-size:12.5px;color:var(--text3);padding:10px 0">Es sind noch keine Trainings-Termine vergangen. Lege sie unter „Termine“ an.</div>'}
    <div style="display:flex;margin-top:10px"><button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('eb-modal').remove()">Schließen</button></div>`;
}

async function einheitDetailOpen(datum){
  const c=document.getElementById("eb-card"); if(!c)return;
  EB_DATUM=datum;
  c.innerHTML='<div style="padding:20px;color:var(--text3);font-size:12.5px">Lade Einheit…</div>';
  EB_PLAN=(typeof tpPlanLoad==="function")?await tpPlanLoad(datum):[];
  // P3 (PO): Jeder Trainer bewertet nur SEINE Übungen; „Alle"-Stationen sieht jeder.
  // Kennt der Plan keine Trainer-Zuordnung (Altbestand), bleibt alles sichtbar.
  try{
    const me=await trainerMe();
    if(me&&EB_PLAN.some(p=>p.trainer&&p.trainer!=="Alle")){
      const meine=EB_PLAN.filter(p=>!p.trainer||p.trainer==="Alle"||p.trainer===me);
      if(meine.length)EB_PLAN=meine;
    }
  }catch(e){}
  const ex=EINHEIT_CACHE.find(x=>x.datum===datum)||{};
  const evals=(typeof EVAL_DATA!=="undefined"&&EVAL_DATA[datum])||[];
  const aw=(typeof AW_DATA!=="undefined"&&AW_DATA[datum])||null;
  const fld="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const kopf=`<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:16px 0 4px">`;

  // ── Übungen aus dem gespeicherten Plan des Tages ──
  let ueHtml;
  if(!EB_PLAN.length){
    ueHtml=`<div style="font-size:12px;color:var(--text3);background:var(--surface2);border-radius:8px;padding:10px">Für diesen Tag ist kein Trainingsplan gespeichert. Pläne werden ab jetzt automatisch am Datum festgehalten, sobald du im Reiter „Training“ Übungen zuweist.</div>`;
  }else{
    ueHtml=EB_PLAN.map((p,i)=>{
      const alt=evals.find(e=>e.formIdx===p.formIdx&&e.trainer===p.trainer)||{};
      const skip=!!alt.skipped;
      const badge=p.trainer&&p.trainer!=="Alle"?`<span style="background:#e0e7ff;color:#3730a3;font-size:9px;padding:1px 6px;border-radius:4px;margin-left:6px">${esc(p.trainer)}</span>`:"";
      return `<div id="eb-ue-${i}" data-skip="${skip?1:0}" style="border:var(--border-s);border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
          <span style="font-size:13px;font-weight:700;color:var(--text)">${esc(p.formName)}</span>${badge}
        </div>
        <div style="font-size:10px;color:var(--text3);margin-bottom:6px">${esc(p.slotLabel||"")}</div>
        <div id="eb-ue-stars-${i}" style="${skip?"opacity:.35;pointer-events:none":""}">
          ${EB_DIMS.map(d=>einheitStarRow(`ue-${i}-${d.key}`,d.label,alt[d.key]||0,5,19)).join("")}
        </div>
        <input id="eb-ue-notiz-${i}" value="${esc(alt.notiz||"")}" placeholder="Kommentar zur Übung (optional) – steht beim nächsten Mal im Plan" maxlength="200"
          style="${fld};width:100%;min-height:44px;margin-top:6px">
        <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11.5px;color:var(--text2);cursor:pointer">
          <input type="checkbox" id="eb-skip-${i}" ${skip?"checked":""} onchange="einheitSkipToggle(${i})">
          Übersprungen / anderer Trainer – nicht bewerten
        </label>
      </div>`;
    }).join("");
  }

  // ── Spieler-Sterne: nur für Kinder, die an dem Tag als anwesend erfasst sind ──
  let spHtml;
  if(!aw){
    spHtml=`<div style="font-size:12px;color:var(--text3);background:var(--surface2);border-radius:8px;padding:10px">Für diesen Tag ist keine Anwesenheit erfasst. Trage sie unter „Anwesenheit“ ein – danach kannst du die Kinder hier bewerten.</div>`;
  }else{
    EB_SPIELER=KADER.filter(k=>aw[k.name]&&aw[k.name].da).map(k=>k.name); // Index statt Name im Key: Namen mit ' wuerden den onclick sprengen
    spHtml=EB_SPIELER.length
      ? EB_SPIELER.map((n,i)=>einheitStarRow(`sp-${i}`,esc(n),(aw[n].qual)||0,3,21)).join("")
      : `<div style="font-size:12px;color:var(--text3)">An diesem Tag war kein Kind als anwesend eingetragen.</div>`;
  }

  const dt=new Date(datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
  c.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
      <button class="btn btn-sm" onclick="einheitListRender()"><i class="ti ti-arrow-left"></i></button>
      <div style="font-weight:800;font-size:16px">⭐ ${dt}</div>
    </div>
    ${kopf}Die Einheit insgesamt</div>
    <div id="eb-rows">${einheitRowsHtml(ex)}</div>
    <textarea id="eb-notiz" rows="2" placeholder="Notiz zur Einheit (optional)" style="${fld};width:100%;resize:vertical;margin-top:6px">${esc(ex.notiz||"")}</textarea>
    ${kopf}Die Übungen</div>
    ${ueHtml}
    ${kopf}Die Kinder <span style="font-weight:600;text-transform:none;color:var(--text3)">· 1–3 Sterne</span></div>
    ${spHtml}
    <button onclick="einheitSave()" style="width:100%;min-height:56px;margin-top:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-family:inherit;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 2px 10px rgba(37,99,235,.3)">💾 Nachbewertung speichern</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('eb-modal').remove()">Schließen</button>`;
}

function einheitSkipToggle(i){
  const cb=document.getElementById("eb-skip-"+i), box=document.getElementById("eb-ue-stars-"+i), wrap=document.getElementById("eb-ue-"+i);
  if(!cb||!box||!wrap)return;
  wrap.dataset.skip=cb.checked?"1":"0";
  box.style.opacity=cb.checked?".35":"";
  box.style.pointerEvents=cb.checked?"none":"";
}

async function einheitSave(){
  const datum=EB_DATUM; if(!datum){toast("Keine Einheit gewählt","err");return;}
  // 1) Einheit gesamt -> Tabelle einheit_bewertung (unveraendert)
  const g=k=>einheitGetStar(k)||null;
  const body={datum,spass:g("spass"),umsetzung:g("umsetzung"),erfolg:g("erfolg"),notiz:(document.getElementById("eb-notiz")?.value||"").trim()||null,updated_at:new Date().toISOString()};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/einheit_bewertung?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!(r.ok||r.status===201)){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  const idx=EINHEIT_CACHE.findIndex(x=>x.datum===datum); if(idx>=0)EINHEIT_CACHE[idx]=body; else EINHEIT_CACHE.unshift(body);
  EINHEIT_CACHE.sort((a,b)=>String(b.datum).localeCompare(String(a.datum)));

  // 2) Uebungen -> EVAL_DATA (gleiche Struktur wie evalSave, damit Verlauf/Trainer-Stats weiterlaufen).
  //    Uebersprungene bekommen KEINE Zahlenwerte, sonst zoegen sie den Schnitt auf 0.
  if(EB_PLAN.length&&typeof EVAL_DATA!=="undefined"){
    const evals=EB_PLAN.map((p,i)=>{
      const skip=document.getElementById("eb-ue-"+i)?.dataset.skip==="1";
      /* v483 – PO: „Wie kann ein Trainer optional die Übungen nach einem Training bewerten und
         kommentieren?" Das Feld gab es, es blieb immer leer. Jetzt je Übung ein Kommentar –
         er erscheint im Trainingsplan, wenn die Übung wieder gewählt wird (tpUebungKommentare). */
      const e={name:p.formName,trainer:p.trainer||"",formIdx:p.formIdx,notiz:(document.getElementById("eb-ue-notiz-"+i)?.value||"").trim(),skipped:skip};
      if(!skip)EB_DIMS.forEach(d=>{e[d.key]=einheitGetStar(`ue-${i}-${d.key}`);});
      return e;
    });
    EVAL_DATA[datum]=evals;
    try{localStorage.setItem(EVAL_KEY,JSON.stringify(EVAL_DATA));}catch(e){}
    if(typeof teamTsSet==="function")teamTsSet(EVAL_TS_KEY,datum);
    if(typeof teamSyncUpsertDebounced==="function")teamSyncUpsertDebounced("trainings_eval",datum,evals);
  }

  // 3) Spieler-Sterne -> AW_DATA[datum][name].qual. "da" bleibt unangetastet, damit die
  //    Anwesenheitsquote nicht kippt; Kinder ohne Anwesenheits-Eintrag werden nicht angelegt.
  if(typeof AW_DATA!=="undefined"&&AW_DATA[datum]){
    const day=AW_DATA[datum]; let changed=false;
    EB_SPIELER.forEach((name,i)=>{
      if(!day[name]||!day[name].da)return;
      const el=document.getElementById("eb-stars-sp-"+i); if(!el)return;
      const v=parseInt(el.dataset.val)||0;
      if(day[name].qual!==v){day[name].qual=v;changed=true;}
    });
    if(changed){
      try{localStorage.setItem(AW_KEY,JSON.stringify(AW_DATA));}catch(e){}
      if(typeof teamTsSet==="function")teamTsSet(AW_TS_KEY,datum);
      if(typeof terminIdForDatum==="function")terminIdForDatum(datum).then(tid=>teamSyncUpsertDebounced("anwesenheit",datum,day,tid?{termin_id:tid}:null)).catch(()=>{});
    }
  }
  toast("Einheit nachbereitet ✓");
  einheitListRender();
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
  try{const r=await fetch(`${SB_URL}/rest/v1/nominierungen?select=data&datum=gte.${ab}`,{headers:sbAuthHeaders()});if(r.ok){(await r.json()).forEach(row=>{const data=kidMapFromIds(row.data||{});active.forEach(k=>{const s=data[k.name];if(s&&(s==="dabei"||s==="nicht"||s==="verletzt")){gm[k.name].t++;if(s==="dabei")gm[k.name].p++;}});});}}catch(e){}
  const pct=(o)=>o.t?Math.round(o.p/o.t*100):null;
  const col=(p)=>p==null?"var(--text3)":p>=75?"var(--green)":p>=50?"var(--amber)":"var(--red)";
  const cell=(o)=>{const p=pct(o);return `<span style="font-weight:700;color:${col(p)}">${p==null?"–":p+"%"}</span> <span style="color:var(--text3);font-size:10px">${o.t?`(${o.p}/${o.t})`:""}</span>`;};
  const rows=active.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(k=>`<tr style="border-top:var(--border)">
    <td style="padding:6px 8px;font-weight:600">${esc(k.name)}</td>
    <td style="padding:6px 8px;text-align:right">${cell(tr[k.name])}</td>
    <td style="padding:6px 8px;text-align:right">${cell(gm[k.name])}</td></tr>`).join("");
  el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">
      <tr style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)"><td style="padding:4px 8px">Spieler</td><td style="padding:4px 8px;text-align:right">🏃 Training</td><td style="padding:4px 8px;text-align:right">⚽ Spiele</td></tr>
      ${rows||'<tr><td style="padding:8px;color:var(--text3)">Noch keine Daten.</td></tr>'}
    </table></div>
    <div style="font-size:11px;color:var(--text3);margin-top:8px">Training aus der Anwesenheitsliste, Spiele aus den Nominierungen · gezählt ab Saisonbeginn ${esc(abTr)} bzw. ${esc(ab)} · nur Info</div>`;
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
// Eltern-Onboarding-Paket: fertige WhatsApp-Nachricht mit Eltern-Link + Kurzanleitung,
// damit der Trainer die ganze Elternschaft in einem Rutsch an Bord holt.
function elternInvitePaket(){
  const url=appRoot()+"eltern/";
  const msg=`🦅 SV Adler Dellbrück U9 – unsere Eltern-App\n\n`+
    `Liebe Eltern, ab jetzt läuft alles rund um euer Kind über die Eltern-App:\n`+
    `✅ Termine zu- & absagen\n📅 alle Termine + Kalender-Export\n📣 Liveticker, wenn ihr mal nicht dabei seid\n🃏 Sammelkarte & Technik-Abzeichen fürs Kind\n🍿 Büdchen- & Mitbringlisten\n\n`+
    `🔒 Und wichtig: Fotos & Daten eurer Kinder bleiben hier im geschützten Team-Bereich (Server in der EU, ihr entscheidet per Freigabe) – sicherer als jede WhatsApp-Gruppe.\n\n`+
    `So kommt ihr rein:\n`+
    `1️⃣ Link öffnen: ${url}\n`+
    `2️⃣ Mit EURER E-Mail anmelden (die, die ihr dem Trainer gegeben habt) – ihr bekommt einen Code per Mail.\n`+
    `3️⃣ Im Browser-Menü „Zum Startbildschirm hinzufügen“ – dann läuft sie wie eine echte App.\n\n`+
    `Bis bald am Platz! 🖤`;
  elternInviteTeilen(msg);
}
/* Drei Wege, und der Trainer erfährt immer, welcher gegriffen hat. Vorher schluckte
   ein .catch(()=>{}) jeden Fehler des Teilen-Menüs, die Zwischenablage lief unbemerkt
   ins Leere (writeText ist ein Promise, try/catch fängt das nicht) und ein blockiertes
   Pop-up hinterließ gar nichts – ein Knopf, der nichts tut, sieht aus wie ein Defekt. */
async function elternInviteTeilen(msg){
  // 1. Teilen-Menü des Geräts
  if(navigator.share){
    try{ await navigator.share({title:"Eltern-App · SV Adler U9",text:msg}); return; }
    catch(e){ if(e&&e.name==="AbortError")return; }   // bewusst abgebrochen: kein Ersatzweg aufdrängen
  }
  // 2. Zwischenablage + WhatsApp im neuen Tab
  let kopiert=false;
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(msg); kopiert=true; } }catch(e){}
  const fenster=window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
  if(fenster){ toast(kopiert?"WhatsApp geöffnet · Text ist auch kopiert ✓":"WhatsApp geöffnet ✓"); return; }
  if(kopiert){ toast("Einladungstext kopiert – jetzt in WhatsApp einfügen ✓"); return; }
  // 3. Nichts ging (Pop-up blockiert, keine Zwischenablage): Text zum Herauskopieren zeigen
  elternInviteTextZeigen(msg);
}
function elternInviteTextZeigen(msg){
  document.getElementById("invite-modal")?.remove();
  const m=document.createElement("div"); m.id="invite-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Einladungstext");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;padding:16px;overflow-y:auto";
  m.style.zIndex=(typeof zOben==="function")?zOben(10010):10010;
  m.onclick=e=>{if(e.target===m)m.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("invite-modal","🔗","Einladungstext","Teilen ging nicht – hier zum Kopieren","#1e3a8a")}
    <textarea id="invite-text" readonly style="width:100%;height:220px;border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface2);color:var(--text);font-family:inherit;font-size:12.5px;line-height:1.5;padding:10px;resize:vertical">${esc(msg)}</textarea>
    <button type="button" id="invite-copy" style="width:100%;min-height:44px;margin-top:10px;border:none;border-radius:12px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">Text markieren</button>`;
  m.appendChild(c); document.body.appendChild(m);
  c.querySelector("#invite-copy").onclick=()=>{
    const t=c.querySelector("#invite-text");
    t.focus(); t.select(); t.setSelectionRange(0,msg.length);
    toast("Markiert – jetzt kopieren und in WhatsApp einfügen");
  };
}
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
    const von=new Date().toISOString().slice(0,10);
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
  return f?`<span title="Schulferien NRW" style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:#e0f2fe;color:#0369a1;white-space:nowrap">🏖️ ${esc(f.name)}</span>`:"";
}
// Warnzeile unter einem Datumsfeld (Termin anlegen/bearbeiten)
async function ferienDatumHint(input,slotId){
  const slot=document.getElementById(slotId); if(!slot||!input||!input.value)return;
  await ferienLoad();
  const f=ferienFuer(input.value);
  slot.innerHTML=f?`<div style="font-size:11.5px;color:#0369a1;background:#e0f2fe;border-radius:8px;padding:6px 10px;margin-top:4px">🏖️ Achtung: Das Datum liegt in den <b>${esc(f.name)}</b> (${new Date(f.von+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}–${new Date(f.bis+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}) – mit dünner Beteiligung rechnen.</div>`:"";
}
// Dashboard: Hinweis nur, wenn Ferien laufen oder in <21 Tagen beginnen
async function homeFerien(){
  const el=document.getElementById("home-ferien"); if(!el)return;
  const rows=await ferienLoad();
  const slot=document.getElementById("home-ferien"); if(!slot)return;
  const heute=new Date().toISOString().slice(0,10);
  const grenze=new Date(Date.now()+21*864e5).toISOString().slice(0,10);
  const jetzt=rows.find(f=>heute>=f.von&&heute<=f.bis);
  const bald=rows.filter(f=>f.von>heute&&f.von<=grenze).sort((a,b)=>a.von<b.von?-1:1)[0];
  const f=jetzt||bald;
  if(!f){slot.innerHTML="";return;}
  const dLabel=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const tage=Math.round((new Date(f.von+"T00:00:00")-new Date(heute+"T00:00:00"))/864e5);
  slot.innerHTML=`<div class="card" style="padding:10px 14px;margin-bottom:8px;border-left:3px solid #0ea5e9;display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">🏖️</span>
    <div style="font-size:12.5px;color:var(--text2)"><b style="color:var(--text)">${esc(f.name)} NRW</b> ${jetzt?`laufen gerade (bis ${dLabel(f.bis)})`:`starten in ${tage} Tag${tage===1?"":"en"} (${dLabel(f.von)}–${dLabel(f.bis)})`} – Termine ggf. anpassen, Rückmeldungen früh einholen.</div>
  </div>`;
}
/* ── J2: Saisonstart-Assistent – geführter Übergang in die neue Saison. Sechs Schritte
   mit Abhaken (localStorage je Saison); der Werkzeug-Button erscheint nur Juni–September. ── */
const SAISONSTART_STEPS=[
  {k:"wrapped",  emo:"🏆", t:"Adler Wrapped ansehen",       d:"Der Saison-Rückblick fürs Team – Gänsehaut zum Abschluss.", run:"adlerWrappedTeaser()"},
  {k:"urkunden", emo:"🏅", t:"Saison-Urkunden drucken",     d:"Alle Kinder in einem Druckauftrag – fürs Abschlussfest.", run:"urkundenOpen()"},
  {k:"kader",    emo:"📋", t:"Kader aufräumen",             d:"Abgänge deaktivieren, Neuzugänge anlegen, Trikotnummern prüfen.", run:"go('kader')"},
  {k:"serie",    emo:"📅", t:"Trainings-Termine anlegen",    d:"Die Trainingstage der neuen Saison eintragen.", run:"go('termine')"},
  {k:"einladung",emo:"🔗", t:"Eltern-Einladung verschicken",d:"Neue Familien per WhatsApp-Paket in die App holen.", run:"elternInvitePaket()"},
  {k:"ansage",   emo:"📣", t:"Saisonstart-Ansage senden",   d:"Alle Eltern begrüßen – mit Gelesen-Status.", run:"ansageTrainerOpen()"}
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
      <button onclick="saisonStartToggle('${s.k}')" aria-label="abhaken" style="border:none;background:transparent;font-size:20px;cursor:pointer;min-width:44px;min-height:44px;margin:-6px 0 -6px -8px;flex:none">${done[s.k]?"✅":"⬜"}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:13.5px;font-weight:800;${done[s.k]?"text-decoration:line-through":""}">${s.emo} ${s.t}</div>
        <div style="font-size:11.5px;color:var(--text2)">${s.d}</div>
      </div>
      <button class="btn btn-sm" onclick="document.getElementById('sstart-modal').remove();${s.run}">Los</button>
    </div>`).join("")}
    ${n===SAISONSTART_STEPS.length?'<div style="text-align:center;font-size:13.5px;font-weight:800;color:var(--green);padding:6px">Alles erledigt – auf in die neue Saison! 🦅</div>':""}
    <button type="button" onclick="saisonStartFertig()" style="width:100%;min-height:44px;margin-top:4px;border:${n===SAISONSTART_STEPS.length?"none":"var(--border-s)"};border-radius:12px;background:${n===SAISONSTART_STEPS.length?"var(--green)":"var(--surface2)"};color:${n===SAISONSTART_STEPS.length?"#fff":"var(--text2)"};font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">Saisonstart abschließen – bis zur nächsten Saison ausblenden</button>
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
  const fld="width:100%;box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13.5px;background:var(--surface2);color:var(--text);margin-top:6px";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("wahl-modal","🗳️","Kabinen-Wahl","Die Kinder stimmen in der Kabine ab – Song, Motto, Wunsch-Spielform","#0284c7")}
    <input id="wahl-frage" placeholder="Frage, z. B. Welcher Einlauf-Song im August?" style="${fld}">
    <input id="wahl-opt1" placeholder="Option 1" style="${fld}">
    <input id="wahl-opt2" placeholder="Option 2" style="${fld}">
    <input id="wahl-opt3" placeholder="Option 3 (optional)" style="${fld}">
    <input id="wahl-opt4" placeholder="Option 4 (optional)" style="${fld}">
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="wahlAnlegen(this)"><i class="ti ti-plus"></i>Wahl starten</button>
    <div style="font-weight:800;font-size:13px;margin:16px 0 6px">Bisherige Wahlen</div>
    <div id="wahl-liste"><div style="font-size:12px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  wahlListeLoad();
}
async function wahlListeLoad(){
  const el=document.getElementById("wahl-liste"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl?select=*&order=created_at.desc&limit=6`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  if(!rows.length){el.innerHTML='<div style="font-size:12px;color:var(--text3)">Noch keine Wahl gestartet.</div>';return;}
  const ergAlle={};
  await Promise.all(rows.map(async w=>{
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/wahl_ergebnis`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_wahl:w.id})});if(r.ok)ergAlle[w.id]=(await r.json())||[];}catch(e){}
  }));
  el.innerHTML=rows.map(w=>{
    const erg=ergAlle[w.id]||[];
    const counts=(w.optionen||[]).map((_,i)=>{const e2=erg.find(x=>x.wahl===i);return e2?e2.n:0;});
    const total=counts.reduce((s,n)=>s+n,0);
    return `<div style="border:var(--border-s);border-left:4px solid ${w.aktiv?"#0284c7":"#cbd5e1"};border-radius:12px;padding:10px 12px;margin-bottom:8px;${w.aktiv?"":"opacity:.65"}">
      <div style="font-size:13px;font-weight:800">${esc(w.frage)} <span style="font-weight:400;color:var(--text3);font-size:11px">· ${total} Stimme${total===1?"":"n"}</span></div>
      ${(w.optionen||[]).map((o,i)=>{const pct=total?Math.round(counts[i]/total*100):0;
        return `<div style="display:flex;align-items:center;gap:8px;margin-top:5px;font-size:12px"><span style="flex:1;min-width:0">${esc(String(o))}</span><span style="color:var(--text2)">${counts[i]}</span><span style="width:70px;height:6px;background:var(--surface2);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${pct}%;background:#0284c7"></span></span></div>`;}).join("")}
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
    <span style="font-size:20px">🎉</span>
    <div><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3)">Team-Meilenstein</div>
    <div style="font-size:13.5px;font-weight:800">${esc(m.label)}</div></div>
  </div>`).join("");
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
    <textarea id="ansage-text" rows="3" placeholder="z. B. Sonntag Treffpunkt schon 9:15 am Käfig – bitte pünktlich!" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);resize:vertical"></textarea>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2);margin-top:8px;cursor:pointer"><input type="checkbox" id="ansage-push" checked>Eltern per Push benachrichtigen</label>
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="ansageSend(this)"><i class="ti ti-send"></i>Ansage senden</button>
    <div style="font-weight:800;font-size:13px;margin:16px 0 6px">Bisherige Ansagen</div>
    <div id="ansage-liste"><div style="font-size:12px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  if(prefill&&typeof prefill==="string"){const t=document.getElementById("ansage-text");if(t){t.value=prefill;t.focus();try{t.setSelectionRange(t.value.length,t.value.length);}catch(e){}}}
  ansageListeLoad();
}
async function ansageListeLoad(){
  const el=document.getElementById("ansage-liste"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/ansagen_status`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  if(!rows.length){el.innerHTML='<div style="font-size:12px;color:var(--text3)">Noch keine Ansagen.</div>';return;}
  el.innerHTML=rows.map(a=>{const d=new Date(a.created_at);const pct=a.familien?Math.round(a.gelesen/a.familien*100):0;
    return `<div style="border:var(--border-s);border-left:4px solid ${a.aktiv?"#1e3a8a":"#cbd5e1"};border-radius:12px;padding:10px 12px;margin-bottom:8px;${a.aktiv?"":"opacity:.6"}">
      <div style="font-size:13px;line-height:1.45;white-space:pre-wrap">${esc(a.text)}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11.5px;color:var(--text2)">
        <span>${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</span>
        <span style="font-weight:800;color:${a.gelesen>=a.familien?"var(--green)":"var(--amber)"}">👁 Gelesen: ${a.gelesen}/${a.familien} Familien</span>
        <button onclick="ansageToggle(${a.id},${a.aktiv?"false":"true"})" style="margin-left:auto;min-height:32px;border:none;background:transparent;color:var(--text2);font-family:inherit;font-size:11px;cursor:pointer;text-decoration:underline">${a.aktiv?"Beenden":"Reaktivieren"}</button>
      </div>
      <div style="height:6px;background:var(--surface2);border-radius:4px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#1e3a8a,#2563eb)"></div></div>
      ${a.aktiv&&Array.isArray(a.fehlt)&&a.fehlt.length&&a.gelesen<a.familien?`<details style="margin-top:6px"><summary style="font-size:11px;color:var(--text3);cursor:pointer">Wer fehlt noch?</summary><div style="font-size:11.5px;color:var(--text2);margin-top:4px">Familien von: ${a.fehlt.map(esc).join(", ")}</div></details>`:""}
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
  const fld="box-sizing:border-box;padding:10px;border:var(--border-s);border-radius:10px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text)";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("probe-modal","🆕","Probetraining","Schnupperkinder – getrennt vom Kader, Auto-Löschung nach Entscheidung","#0891b2")}
    <div style="display:flex;flex-direction:column;gap:8px">
      <input id="probe-name" placeholder="Name des Kindes" style="${fld}">
      <div style="display:flex;gap:8px">
        <input id="probe-kontakt" placeholder="Eltern-Kontakt (Telefon/Mail)" style="${fld};flex:1;min-width:0">
        <button class="btn btn-p btn-sm" onclick="probeAdd(this)"><i class="ti ti-plus"></i>Anlegen</button>
      </div>
    </div>
    <div id="probe-liste" style="margin-top:14px"><div style="font-size:12px;color:var(--text3)">Lade…</div></div>
    <div style="font-size:10.5px;color:var(--text3);margin-top:10px">Datenschutz: Probekinder stehen bewusst NICHT im Kader. Nach „Aufnehmen“/„Absagen“ wird der Eintrag 30 Tage später automatisch gelöscht – Aufgenommene vorher unter Kader → „Spieler verwalten“ anlegen.</div>
  </div>`;
  document.body.appendChild(m);
  probeListeLoad();
}
const PROBE_STATUS={schnuppert:["🟡","schnuppert","var(--amber)"],aufnehmen:["✅","aufnehmen","var(--green)"],abgesagt:["❌","abgesagt","var(--red)"]};
async function probeListeLoad(){
  const el=document.getElementById("probe-liste"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/probekinder?select=*&order=created_at.desc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  if(!rows.length){el.innerHTML='<div style="font-size:12px;color:var(--text3)">Aktuell keine Probekinder.</div>';return;}
  el.innerHTML=rows.map(p=>{
    const st=PROBE_STATUS[p.status]||PROBE_STATUS.schnuppert;
    const tel=/^[+\d][\d\s\/-]{5,}$/.test((p.kontakt||"").trim());
    return `<div style="border:var(--border-s);border-left:4px solid ${st[2]};border-radius:12px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:800;font-size:14px;flex:1;min-width:0">${esc(p.name)}</span>
        <span style="font-size:11px;font-weight:800;color:${st[2]}">${st[0]} ${st[1]}${p.entschieden_am?" · "+new Date(p.entschieden_am+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}):""}</span>
      </div>
      ${p.kontakt?`<div style="font-size:12px;color:var(--text2);margin-top:2px">📞 ${tel?`<a href="tel:${esc(p.kontakt.replace(/[\s\/-]/g,""))}" style="color:var(--blue-text)">${esc(p.kontakt)}</a>`:esc(p.kontakt)}</div>`:""}
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">
        <span style="font-size:11.5px;color:var(--text2)">🏃 ${p.trainings} Training${p.trainings===1?"":"s"}</span>
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
    const r=await fetch(`${SB_URL}/rest/v1/probekinder?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({status,entschieden_am:new Date().toISOString().slice(0,10)})});
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
  try{const r=await fetch(`${SB_URL}/rest/v1/nominierungen?select=data&datum=gte.${ab}`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(row=>{const data=kidMapFromIds(row.data||{});active.forEach(k=>{const s=data[k.name];if(s==="dabei"||s==="nicht"||s==="verletzt"){att[k.name].t++;if(s==="dabei"){att[k.name].p++;einsatz[k.name]++;}}});});}catch(e){}
  // G2: Eltern-Puls-Saisontrend (anonym, via RPC – keine user_ids)
  let puls=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/puls_season`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_from:ab})});if(!sbCheck401(r)&&r.ok)puls=await r.json();}catch(e){}
  const moodEmo=a=>a>=2.6?"😀":a>=1.8?"😐":"😟";
  let pulsHtml="";
  if(puls&&puls.overall_n){
    const weeks=(puls.weeks||[]).slice(-8);
    const bars=weeks.map(w=>{const h=Math.round((w.avg/3)*42)+6;const col=w.avg>=2.6?"var(--green)":w.avg>=1.8?"var(--amber)":"var(--red)";return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><div style="font-size:9px;color:var(--text3)">${w.avg}</div><div style="width:68%;height:${h}px;background:${col};border-radius:4px 4px 0 0" title="${w.n} Rückmeldungen"></div><div style="font-size:8.5px;color:var(--text3);white-space:nowrap">${esc(w.wlabel)}</div></div>`;}).join("");
    pulsHtml=`<div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">🌡️ Eltern-Puls <span style="font-weight:400;color:var(--text2);font-size:11px">(anonym · ${puls.overall_n} Rückmeldungen · Ø ${puls.overall_avg} ${moodEmo(puls.overall_avg)})</span></div>`
      +(weeks.length?`<div style="display:flex;align-items:flex-end;gap:4px;height:74px;padding:4px 0">${bars}</div>`:'<div style="font-size:12px;color:var(--text3)">Sammelt sich, sobald Eltern nach Events abstimmen.</div>');
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
        stimmungHtml=`<div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">🧒 Kinder-Stimmung <span style="font-weight:400;color:var(--text2);font-size:11px">(Kabine · ${rows.length} Antworten · Ø ${avg} ${moodEmo(Number(avg))})</span></div>`
          +(tArr.length?`<div style="font-size:12.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px">😞 Zuletzt unzufrieden: <b>${tArr.map(([n,c])=>esc(n)+(c>1?` (${c}×)`:"")).join(", ")}</b> – vielleicht kurz das Gespräch suchen.</div>`
                     :'<div style="font-size:12.5px;color:var(--green)">Kein Kind hat zuletzt 😞 gedrückt 👍</div>');
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
        postHtml=`<div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">📬 Adler-Post <span style="font-weight:400;color:var(--text2);font-size:11px">(${rows.length} Nachrichten · 60 Tage)</span></div>`
          +(ohne.length?`<div style="font-size:12.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px">Noch ohne Post: <b>${ohne.map(esc).join(", ")}</b> – vielleicht mal ein Kompliment anstoßen (oder Sprachlob!).</div>`
                       :'<div style="font-size:12.5px;color:var(--green)">Jedes Kind hat schon Post bekommen 👍</div>');
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
        tempoHtml=`<div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">⏱️ Rückmelde-Tempo <span style="font-weight:400;color:var(--text2);font-size:11px">(Zu-/Absagen · Team-Ø ${teamAvg} Tage vor dem Termin)</span></div>`
          +arr.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0"><span style="flex:1">${esc(x.name)}</span>${x.kurz?`<span title="davon kurzfristig (≤1 Tag vorher)" style="font-size:10px;color:var(--text3)">⚡ ${x.kurz}× kurzfristig</span>`:""}<span style="font-weight:700;color:${col(x.avg)}">Ø ${x.avg.toFixed(1).replace(".",",")} Tage</span><span style="font-size:10px;color:var(--text3)">(${x.n})</span></div>`).join("")
          +`<div style="font-size:10px;color:var(--text3);margin-top:4px">Ø Tage zwischen erster Antwort und Termin – je höher, desto früher meldet die Familie zurück. Exakt gemessen ab Juli 2026; ältere Antworten zählen mit dem Zeitpunkt der letzten Änderung.</div>`;
      }
    }
  }catch(e){}
  // A-Etappe 2: Rollen-Erfahrung auch im Cockpit (Kurzform + Button zur vollen Matrix)
  let rollenHtml="";
  try{ if(typeof rollenExpFetch==="function"){ const re=await rollenExpFetch(); if(re&&re.games){ const nie=(typeof _neverTW==="function")?_neverTW(re.byKid):[];
    rollenHtml=`<div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">🎽 Rollen-Erfahrung <span style="font-weight:400;color:var(--text2);font-size:11px">(${re.games} Aufstellungen)</span></div>`
      +(nie.length?`<div style="font-size:12.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px">🥅 Noch nie im Tor: <b>${nie.map(esc).join(", ")}</b></div>`:'<div style="font-size:12.5px;color:var(--green)">Jedes aktive Kind stand schon mal im Tor 👍</div>')
      +`<button class="btn btn-sm" style="margin-top:8px" onclick="document.getElementById('sc-modal').remove();w2('rollenMatrixOpen')"><i class="ti ti-layout-grid"></i>Volle Rollen-Matrix</button>`;
  } } }catch(e){}
  // R6: faire Einsätze – die mit den wenigsten Spiel-Einsätzen (nur wenn überhaupt gespielt wurde)
  const maxEins=Math.max(0,...active.map(k=>einsatz[k.name]));
  const fairArr=active.map(k=>({name:k.name,e:einsatz[k.name]})).sort((a,b)=>a.e-b.e);
  const wenig=maxEins>=2?fairArr.filter(x=>x.e<maxEins).slice(0,4):[];
  const attArr=active.map(k=>({name:k.name,pct:att[k.name].t?Math.round(att[k.name].p/att[k.name].t*100):null,t:att[k.name].t})).filter(x=>x.pct!=null).sort((a,b)=>b.pct-a.pct);
  const topAtt=attArr.slice(0,5);
  const lowAtt=attArr.filter(x=>x.pct<60).slice(-3);
  const kpi=(v,l,c)=>`<div style="flex:1;min-width:80px;text-align:center;background:var(--surface2);border-radius:12px;padding:10px"><div style="font-size:22px;font-weight:900;color:${c}">${v}</div><div style="font-size:10px;color:var(--text2)">${l}</div></div>`;
  const medal=i=>["🥇","🥈","🥉"][i]||`${i+1}.`;
  const attRow=x=>`<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0"><span style="flex:1">${esc(x.name)}</span><span style="font-weight:700;color:${x.pct>=75?"var(--green)":x.pct>=50?"var(--amber)":"var(--red)"}">${x.pct}%</span><span style="font-size:10px;color:var(--text3)">(${x.t})</span></div>`;
  document.getElementById("sc-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="sc-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Saison-Cockpit");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("sc-modal","📈","Saison-Cockpit",`Saison seit ${new Date(ab+"T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"})} · alles auf einen Blick`,"#1e3a8a")}
    <div style="display:flex;gap:8px;margin-bottom:14px">${kpi(spiele,"Spiele","var(--blue)")}${kpi("⚽ "+toreGesamt,"Tore","var(--green)")}${kpi(trainings,"Trainings","#7c3aed")}</div>
    <div style="font-weight:800;font-size:13.5px;margin-bottom:4px">🥇 Top-Torschützen</div>
    ${scorers.length?scorers.map(([n,c],i)=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0"><span style="width:22px">${medal(i)}</span><span style="flex:1">${esc(n)}</span><span style="font-weight:800;color:var(--green)">${c}</span></div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch keine Tore erfasst.</div>'}
    <div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">📊 Anwesenheit – am zuverlässigsten</div>
    ${topAtt.length?topAtt.map(attRow).join(""):'<div style="font-size:12px;color:var(--text3)">Noch keine Daten.</div>'}
    ${lowAtt.length?`<div style="font-weight:800;font-size:12.5px;margin:12px 0 2px;color:var(--amber)">Zuletzt oft gefehlt – dranbleiben</div>${lowAtt.map(attRow).join("")}`:""}
    ${tempoHtml}
    ${wenig.length?`<div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">⚖️ Faire Einsätze – wer war seltener dabei</div>${wenig.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0"><span style="flex:1">${esc(x.name)}</span><span style="font-size:11px;color:var(--text3)">${x.e} Einsätze</span></div>`).join("")}`:""}
    ${(toreTeam[2]||toreTeam[3])?`<div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">🏆 Tore je Team</div><div style="display:flex;gap:8px;flex-wrap:wrap">${[1,2,3].filter(t=>toreTeam[t]>0||t===1).map(t=>`<div style="flex:1;min-width:70px;text-align:center;background:var(--surface2);border-radius:10px;padding:8px"><div style="font-size:11px;color:var(--text2)">Adler ${t}</div><div style="font-size:18px;font-weight:900;color:var(--green)">⚽ ${toreTeam[t]||0}</div></div>`).join("")}</div>`:""}
    ${stimmungHtml}
    ${postHtml}
    ${rollenHtml}
    ${pulsHtml}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <button class="btn btn-sm" onclick="document.getElementById('sc-modal').remove();anwesenheitOpen()"><i class="ti ti-checkbox"></i>Volle Anwesenheits-Quote</button>
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
    {t:"Startseite", d:"To-Do-Banner (nur bei offenen Aufgaben), „Bist du dabei?“ mit den Terminen der nächsten 14 Tage, für die deine Antwort noch fehlt (beantwortet = Karte weg), „Diese Woche“ mit dem Stand je Termin – die erste Zeile ist der nächste Termin mit Wetter, Packtipp und den Sprungknöpfen „Anwesenheit“ und „Plan“ –, der Knopf zu allen Terminen und sechs große Kacheln – dahinter jeweils ein Kachel-Menü.", go:"home"},
  ]},
  {cat:"👥 Team", items:[
    {t:"Saison-Cockpit", d:"Torschützen, Anwesenheit, Rückmelde-Tempo der Familien, faire Einsätze, Eltern-Puls, Rückmelde-Tempo – alles auf einen Blick.", run:"saisonCockpitOpen()"},
    {t:"Anwesenheit (Saison)", d:"Drei Reiter: Quote je Kind im Training, Anwesenheit der Trainer, und die Quote inklusive Spiele aus den Nominierungen. Alle drei rechnen auf denselben Zähltagen wie die Zahlen neben der Nominierung: ab dem Saisonstichtag, und nur echte Trainings – Spiel- und Turniertage zählen nicht mit, auch nicht bei der Serie 🔥.", run:"awUebersichtOpen()"},
    {t:"Probetraining", d:"Schnupperkinder verwalten – bewusst getrennt vom Kader, Auto-Löschung nach Entscheidung.", run:"probeOpen()"},
    {t:"Kader", d:"Spieler anlegen/bearbeiten, Trikotnummer, Foto, Kontakte, Foto-Freigabe.", go:"kader"},
    {t:"Bewerten", d:"Spieler in 16 Kriterien einschätzen – mit Live-Radar. Kriterien, Live-Profil und Förderplan erscheinen, sobald oben ein Kind gewählt ist; „Bewertungsrunde starten“ geht alle Kinder nacheinander durch.", go:"bew"},
    {t:"Profil", d:"Spielerprofil, Stärken, Adler-Karte, Entwicklungs-Report drucken.", go:"profil"},
    {t:"Entwicklung", d:"Entwicklung über die Zeit als Diagramm.", go:"verlauf"},
  ]},
  {cat:"🏃 Training", items:[
    {t:"Anwesenheit erfassen", d:"Wer war beim Training da – Haken je Kind. Hier stehen nur Trainings: die Anwesenheit an Spiel- und Turniertagen ist „Dabei“ in „Teams festlegen“ im Spieltag. Die Trainer-Haken zeigen bis zum Tag die Rückmeldungen aus „Bist du dabei?“ – ein Tap darauf ändert die Rückmeldung des Kollegen für alle. Am Tag selbst werden die Haken mit „Speichern“ zur Anwesenheit dieses Tages. Die Saison-Auswertung dazu liegt bei Team.", go:"anwesenheit"},
    {t:"Trainingsplan", d:"Stationen bauen, Übungen zuweisen, Gruppen einteilen, Trainingsstart auf allen Handys. Welche Trainer angehakt sind, kommt aus EINER Quelle: der Rückmeldung aus „Bist du dabei?“ bzw. dem Trainerplan (✓ zugesagt, ✕ abgesagt, ? keine Antwort). Am Tag selbst zählt die erfasste Anwesenheit. Über den Chips steht, was gerade gilt – und ein Tap auf einen Chip ändert genau das: die Rückmeldung des Kollegen (für alle sichtbar, auch auf der Startseite) oder am Tag die Anwesenheit. Sagt jemand kurzfristig ab, tippst du ihn hier ab, und Felder und Gruppen rechnen neu. Die Hinweise je Phase sind zugeklappt („💡 Tipp“). Die Nachbewertung der Einheit ist nicht mehr auf dieser Seite – sie kommt nach dem Training als To-Do auf die Startseite und läuft über „Einheit bewerten“. Torwart- und Einzeltraining laufen parallel zum Hauptteil und genauso lang; der Trainer dort fällt für die Felder weg – aus vier Trainern werden drei Felder. Sind mehr Gruppen ausgelost als Felder frei, spielt die überzählige Gruppe in diesem Hauptteil bei einem anderen Feld mit; die Auslosung selbst bleibt. Weniger Übungen als Felder? Im Trainer-Dropdown eines Feldes „✕ Feld weglassen“ wählen – die Gruppe spielt bei den anderen mit, „↩ Feld wieder aufnehmen“ holt es zurück. Die Trainer-Reihe oben folgt den Rückmeldungen zum Termin: ✓ grün = zugesagt (automatisch angehakt), 🤔 gelb = unsicher, ✕ rot = abgesagt, ohne Zeichen = noch keine Antwort. Angehakt wird nur, wer zugesagt hat – du kannst jeden Trainer trotzdem von Hand dazunehmen oder abwählen.", go:"planung"},
    {t:"Einheit bewerten", d:"Nach dem Training, alles optional: Sterne für die Einheit (Spaß, Umsetzung, Erfolg) mit Notiz, je Übung drei Sterne-Reihen und ein Kommentar (steht beim nächsten Mal im Trainingsplan bei der Übung), Schnell-Sterne für die anwesenden Kinder. Erreichbar über das To-do auf der Startseite, im Trainingsplan über „Einheit nachbereiten“, sobald die Einheit vorbei ist – oder hier.", run:"einheitBewertenOpen()"},
    {t:"Übungen", d:"Die Übungs-Datenbank: Gruppen-Kacheln, ⭐-Filter, Skizze je Übung, ➕ direkt in den Trainingsplan · KI-Coach · Themenplan. Bei einer eigenen Übung kannst du die Skizze selbst erzeugen: zehn Vorlagen zum Antippen (Rondo, Slalom, Torschuss …) oder mit Spielern, Hütchen, Toren, Zonen und Pfeilen selbst auf den Platz tippen.", go:"formen"},
    {t:"Trainingsturnier", d:"Turnier zum Trainingsabschluss mit Zeitbudget-Automatik – vorab planbar: es hängt am gewählten Termin und wird gespeichert, du kannst es also Tage vorher vorbereiten und findest es am Trainingstag auf jedem Gerät wieder. Gesamtzeit (z. B. 40 Min.) und 1–4 Felder vorgeben, die Automatik wählt Format und Spielzeit (5–10 Min.; bleibt Zeit übrig, gibt es eine Rückrunde statt eines Finales – beim Training soll niemand am Ende nur zuschauen) – reicht die Zeit fair nicht, sagt sie ehrlich, wie viele Minuten fehlen. Ein Platzrechner sagt vorab, wie viele Kinder die gewählte Feld-/Formatkombination gleichzeitig braucht und ob alle Teams durchgehend im Spiel sind. Zwei Modi: Kinder-Turnier (Trainer spielen auf Wunsch in den Teams mit) oder Kinder gegen Eltern (1–4 Eltern-Teams, Duelle parallel auf den Feldern, Duell-Scoreboard, nie Kind gegen Kind). Spielform wählbar (FUNiño, 4+1, 5+1) mit Team-Vorschlag aus der Kinderzahl. Ein Pfiff für alle Felder.", run:"blitzOpen()"},
  ]},
  {cat:"⚽ Spieltag", items:[
    {t:"Match", d:"Zuerst „Teams festlegen“ in zwei Blöcken: „Wer ist dabei?“ (zugeklappt, sobald jemand dabei ist – vorbelegt aus den Eltern-Rückmeldungen, ohne Antwort bleibt ein Kind offen, „N Offene auf Dabei setzen“ erledigt das am Platz auf einmal; „Dabei“ ist zugleich die Anwesenheit dieses Spieltags und zählt für die Spiele-Quote) und darunter die Teams als Karten mit den Namen: ein Tipp auf einen Namen schiebt das Kind ins nächste Team, zuletzt in die Pause. Die Team-Kacheln darunter zeigen die Namen ohne Aufklappen. Dazu, wie viele Teams wir stellen und welche Spielform jedes Team spielt (beim Kinderfestival etwa Adler 1 auf 4+1, Adler 2 FUNiño). Die Automatik setzt Torwart-Kinder zuerst auf die Teams mit Torwart, füllt dann die Felder und verteilt die übrigen Kinder so, dass die Spielzeit je Kind über alle Teams möglichst gleich ist – der Anteil steht je Team dabei. Steht ein Spielplan für den Tag (Festival oder Heimspiel), kommt alles Weitere von dort: „Teams festlegen“ zeigt je Runde, auf welchem Feld ein Team spielt, in welcher Spielform und gegen wen, und die Runde wechselt mit dem Anpfiff im Planer – geändert wird im Spielplan, „Im Spielplan ändern“ führt hin. Auch die Match-Uhr nimmt an so einem Tag ihre Spielzeit von dort (8 Minuten statt der üblichen 10), spielt sie ohne Halbzeit durch und läuft erst, wenn die Runde angepfiffen ist – „Spiel läuft“ steht dann auf den Team-Kacheln, die gerade auf dem Feld sind, und der Wechsel-Timer startet mit – mit der halben Spielzeit als Intervall (bei 8 Minuten also einer in der Mitte, einer am Ende); anhalten kannst du ihn jederzeit. Vor der ersten Runde teilt der Plan die Aufwärmfelder zu: wir immer im Käfig, die Gastvereine der Reihe nach auf die übrigen Felder; auf der Gast-Seite steht das ganz oben. Ohne Spielplan (Auswärtsturnier) legst du die Felder des Tages selbst an (Feld 1: 4+1, Feld 2: FUNiño …): die festen Teams wandern dann mit „Nächste Runde“ ein Feld weiter, und fehlt einem Team auf seinem Feld ein Kind, hilft eines aus dem Team mit der meisten Bank aus – nur für diese Runde, Torwart-Kinder wechseln sich dabei ab, welcher Trainer sie betreut – die Kinder werden dabei automatisch verteilt und lassen sich von Hand umsetzen. „Dabei“ heißt automatisch „Spielt mit“ – wen du pausieren lassen willst, stellst du selbst um. Neben jedem Kind stehen die Trainingsquote und die Zahl der Einsätze; beide zählen ab einem Stichtag (zurzeit: Trainings ab dem 31.08., Spiele ab dem 05.09.2026), damit die faire Einteilung nicht an alten Zahlen hängt. Danach hat jedes Team seine eigene Kachel mit Kader, Rollen, Match-Uhr, Rotations-Timer, Live-Aktionen und Liveticker. Den Liveticker startest du selbst mit „▶️ Liveticker starten“ – er hängt nicht am Anpfiff und nicht an der Aufstellung. Sobald er läuft, erscheint bei den Eltern ganz oben eine rote LIVE-Kachel mit Teilen-Knopf – der Link geht auch an Oma und Opa, ohne Anmeldung. Stoppst du ihn wieder, kommt nur nichts Neues mehr dazu – das Bisherige bleibt für die Eltern sichtbar. Drei Tage nach dem Spieltag zeigt der Link nur noch den Endstand; die Ereignisse bleiben gespeichert. Beim Blitz-Rating nach dem Spiel zählt pro Kind, Trainer und Spieltag genau eine Bewertung – gehst du ein zweites Mal durch, korrigierst du die erste, statt sie zu verdoppeln. In der Live-Aktion stehen oben die Kinder aus der Aufstellung und unter einer gestrichelten Linie alle weiteren, die heute dabei sind – du kannst also auch tickern, wenn die Aufstellung nicht gepflegt ist. Bei „Parade“ erscheinen nur die Torhüter. Hast du selbst keine Hand frei: „🙋 Jemand anderen tickern lassen“ verschickt einen Link an einen Helfer am Spielfeldrand; der sieht nur die Kinder von heute und die Aktionsknöpfe und kann Tore, Paraden und Gegentore melden – keine Bewertungen, keine Kaderdaten. Der Link gilt nur, solange der Ticker läuft. Die Team-Quests stehen darunter und gelten für alle Teams zusammen. Ist heute Spieltag, öffnet sich beim Betreten der Abschnitt, der zur Uhrzeit passt – vor dem Anpfiff „Vor dem Spiel“, während „Live“, danach „Nach dem Spiel“.", go:"spieltag"},
    {t:"Aufstellung", d:"Rollen-Empfehlung aus den Bewertungen: wer passt als Aufpasser, Jäger, Flitzer links/rechts. Braucht mindestens 4 bewertete Kinder – wer noch niemanden bewertet hat, nutzt im Spieltag „Feld & Bank fair besetzen“ (verteilt nach Einsatzzeiten).", go:"kombi"},
    {t:"Analyse", d:"Auswertung nach dem Spiel: Entwicklungs-Meilensteine aus den Bewertungen, Einsatz-Fairness (zählt Spieltage mit Blitz-Rating je Kind) und Formtrend. Solange kein Spiel bewertet ist, steht dort nur ein Satz mit dem Weg zum Spieltag.", go:"analyse"},
    {t:"Heimspiel & Festival planen", d:"Für jeden Spieltag bei uns – ein Kinderfestival mit zwei bis drei Gastvereinen genauso wie ein normales Heimspiel, bei dem nur ein Gegner kommt, der aber mehrere Teams stellen kann. Beim Heimspiel steht der Gegner schon im Termin und wird gleich mit eingetragen. Unsere Kinder und Teams kommen aus „Teams festlegen“ (änderbar, „Wieder übernehmen“ holt sie zurück); die Gastvereine trägst du mit ihren angereisten Kindern ein, die App macht daraus Teams (10 Kinder = zwei Teams). Standard sind alle vier Felder – Käfig (4+1), Funino 1, Funino 2 und 4+1 oben; braucht der Plan weniger, fallen sie beim Erstellen von hinten weg, zuerst 4+1 oben. Beginn ist die Uhrzeit des Termins (sonst 10:15), zwischen den Runden 5 Minuten Trinkpause. Im fertigen Plan tauschst du zwei Teams, indem du beide antippst, und trägst rechts das Ergebnis ein (freiwillig, es gibt keine Tabelle) – der Plan liegt in der Datenbank und ist für alle Trainer änderbar. Am Festivaltag pfeifst du jede Runde gemeinsam an: „Runde 1 anpfeifen“ startet einen Countdown, den alle Trainer sehen – in der App und im Gast-Link. Läuft die Zeit ab, gibt dein Handy ein Signal und die Trinkpause zählt rückwärts bis zum nächsten Anpfiff; angepfiffen wird immer von Hand. Die geplanten Uhrzeiten ziehen dabei mit: pfeifst du Runde 2 drei Minuten später an, stehen alle folgenden Runden drei Minuten später. Derselbe Anpfiff startet auch die Match-Uhr der Adler-Teams dieser Runde, und umgekehrt startet der Anpfiff an der Match-Uhr im Spieltag die Festival-Runde – Ticker, Wechsel und Countdown zeigen dieselbe Zeit. Der Link an die Gast-Trainer enthält den Schreib-Code, damit sie Ergebnisse eintragen können; ihr korrigiert sie in der App. Auf der Gast-Seite gibt es außerdem „Regeln“ (4+1, FUNiño und unsere Vereinbarungen). Die Felder heißen wie am Platz – „Käfig“ für das erste 4+1-Feld, „Funino 1/2“, „4+1 oben“ für ein zweites – und jeder Name lässt sich je Feld überschreiben. Aus Beginn, Gesamtdauer und Spielzeit entsteht ein Runden-Plan: pro Runde spielen alle Felder gleichzeitig, jede Mannschaft trifft möglichst jede andere und wechselt dabei zwischen den Formaten. Keine Tabelle – bei uns gewinnt die Freude am Spiel. Den fertigen Plan schickst du als Link an die Gast-Trainer (mit Wappen, Feldern und Zeiten, ohne Login) oder druckst ihn als Aushang. Auf der Gast-Seite steht ein Info-Knopf „Anfahrt, Parken & Felder“: Adresse mit Kartenlink, der Parkhinweis (am Platz oft voll, besser an der Straße) mit Skizze, eine Skizze, wo welches Feld liegt, und deine Zeilen aus „Infos für die Gäste“ – Kaffee und Brötchen, WC, Turnierleitung. Am Spieltag führt die Turnier-Kachel im Spieltag hierher, wenn wir ausrichten; sind wir zu Gast, öffnet sie den Turnier-Modus zum Erfassen der Kurzspiele.", run:"htOpen()"},
  ]},
  {cat:"🎯 Taktik", items:[
    {t:"Taktikboard", d:"Formationen stellen, Laufwege/Pässe zeichnen, als Bild teilen – auf dem Tablet im Pro-Modus.", go:"taktik"},
  ]},
  {cat:"🪶 Eltern & Kinder", items:[
    {t:"Team-Ansage", d:"Wichtige Info an alle Eltern – mit Gelesen-Status (wer fehlt noch?).", run:"ansageTrainerOpen()"},
    {t:"Adler Nest", d:"Digitales Stadionheft erstellen & drucken.", run:"stadionheftOpen()"},
    {t:"Eltern-Bereich", d:"Eltern melden sich per Link/Einmal-Code an: Zu- und Absagen, Karte, Quiz, Betreuung vor Ort."},
    {t:"Adler-Welt-Hub", d:"Federn je Kind, FUT-Karten, Technik-Abzeichen und Wochen-Challenge an einem Ort.", run:"adlerWeltOpen()"},
    {t:"Kabinen-Wahl", d:"Die Kinder stimmen ab (Song, Motto, Spielform) – du legst die Optionen fest.", run:"wahlTrainerOpen()"},
    {t:"Album-Karten-Fotos", d:"Bilder für die Trainer- und Vereins-Sticker im Panini-Sammelalbum.", run:"albumFotosOpen()"},
    {t:"Urkunden-Studio", d:"Saison-Urkunden für alle Kinder in einem Druck + freie Anlass-Urkunde.", run:"urkundenOpen()"},
    {t:"Quiz (Kinder)", d:"Kinder spielen über den Kids-Link (?quiz); Ergebnisse unter Eltern & Kinder → Quiz-Ergebnisse.", go:"quizresults"},
  ]},
  {cat:"📅 Orga", items:[
    {t:"Nutzung", d:"Welche Bereiche, Kacheln und Aktionen in den letzten 7, 30 oder 90 Tagen wirklich benutzt wurden – und welche Kacheln gar nicht. Grundlage fürs Ausmisten. Keine Kindernamen, nur Ereignisse.", run:"nutzungOpen()"},
    {t:"Trainerplan", d:"Alle kommenden Trainings, Spiele und Turniere als Tabelle: Termine untereinander, der Trainerstab als Spalten, ein Tap je Zelle wechselt zwischen dabei ✓, unsicher ?, nicht dabei ✕ und keine Antwort. Der Balken links zeigt die Zahl der Zusagen – rot keine, orange eine, hellgrün zwei, dunkelgrün ab drei. Er bewertet nicht, er zählt: ob ein Termin damit läuft, entscheidet ihr. Der Filter „Höchstens eine Zusage“ zeigt nur die Termine, bei denen noch wenig steht. Unterschied zu „Bist du dabei?“ auf der Startseite: dort beantwortest DU deine Termine, hier siehst du das ganze Team.", run:"trainerPlanOpen()"},
    {t:"Termine", d:"Das Formular zeigt nur, was zum Typ gehört: eine Treffzeit gibt es bei Spiel, Turnier und Event (bei Spielen −45 Min. vom Anpfiff vorgeschlagen) – beim Training kommen ohnehin alle zur Trainingszeit. „Wiederholen“ steht beim Event, weil Spiele und Turniere jedes Mal andere sind. Unter „Wer hilft“ sagst du, was die Eltern übernehmen sollen: beim Training die Anzahl Funino-Tore und Jugendtore (leer = ohne Zahl anbieten, 0 = wird nicht gebraucht), dazu bei jedem Typ ein freier Hinweis. Das steht im Eltern-Bereich als Beschreibung unter der Aufgabe – ohne sie trägt sich niemand ein. Dazu: anlegen/bearbeiten · Endzeit (danach automatisch ins Archiv) · Platz · Trainer-Verfügbarkeit · Wetter · Ferien-Warnung.", go:"termine"},
    {t:"Gegner-Datenbank", d:"Adresse, Ansprechpartner, Telefon/WhatsApp, bisherige Spiele.", run:"gegnerManageOpen()"},
    {t:"Pinnwand", d:"Team-Notizen fürs Trainerteam.", go:"team"},
    {t:"Trainer-Meeting", d:"Zwei Phasen. Erst der Termin: Vorschläge machen, im Trainerteam abstimmen (✓ / ? / ✗), einen festlegen – solange deine Stimme fehlt, erinnert dich die Startseite. Steht der Termin, verschwinden Abstimmung und Vorschläge, und es geht um den Inhalt: eine Themenliste fürs Meeting, die alle Trainer füllen können. Abgehaktes bleibt durchgestrichen stehen, damit man am Ende sieht, was besprochen wurde. Auf der Startseite steht dann der Termin mit der Zahl offener Themen. Ein Trainer-Meeting landet bewusst NICHT bei den Terminen – die sehen die Eltern.", run:"trainerMeetingOpen()"},
    {t:"Saisonstart-Check", d:"Sechs Schritte für den Übergang in die neue Saison – Wrapped, Urkunden, Kader, Trainings-Serie, Eltern-Einladung, Ansage. Er steht Juni bis September im Orga-Menü; mit „Saisonstart abschließen“ blendest du ihn bis zur nächsten Saison aus. Von hier aus geht er immer auf.", run:"saisonStartOpen()"},
    {t:"Teamkasse", d:"Kassen-Link hinterlegen (kein Geld in der App).", run:"kasseOpen()"},
    {t:"Fundbüro", d:"Liegengebliebenes verwalten.", run:"fundbueroOpen()"},
    {t:"Team-Ausrüstung", d:"Wer hat welches Material.", run:"ausruestungGrid()"},
    {t:"Backup", d:"Kader-Daten exportieren.", run:"backupExport()"},
    {t:"Dark Mode", d:"Hell/Dunkel umschalten.", run:"toggleTheme()"},
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
    <button class="btn btn-p btn-sm" style="width:100%" onclick="hilfeClose();tourStart()"><i class="ti ti-player-play"></i>Kurze Feature-Tour starten</button>
    <input type="text" placeholder="Suchen… (z. B. Wetter, Aufstellung)" oninput="hilfeRender(this.value)" style="width:100%;margin-top:10px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box">
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
    return `<div style="margin-top:10px"><div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">${g.cat}</div>`+
      items.map(it=>{const act=it.go?`hilfeClose();go('${it.go}')`:it.run?`hilfeClose();${it.run}`:"";
        return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-top:var(--border)">
          <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700">${esc(it.t)}</div><div style="font-size:11.5px;color:var(--text2);line-height:1.35">${esc(it.d)}</div></div>
          ${act?`<button class="btn btn-sm" onclick="${act}" title="Öffnen"><i class="ti ti-arrow-right"></i></button>`:""}
        </div>`;}).join("")+`</div>`;
  }).join("");
  box.innerHTML=html||`<div style="font-size:12px;color:var(--text3);padding:10px 0">Nichts gefunden.</div>`;
}
const TOUR=[
  {emo:"🦅", t:"Willkommen in der Adler-App", d:"Die Startseite ist bewusst schlank: Ganz oben erscheinen DEINE To-Dos (nur wenn etwas offen ist) – jedes führt dorthin, wo es sich erledigen lässt, und was du nicht mehr nachtragen willst, hakst du mit dem ✓ daneben für das ganze Trainerteam ab, darunter „Bist du dabei?“ – nur die Termine der nächsten 14 Tage, für die deine Antwort noch fehlt; ein Tap auf ✅ 🤔 ❌ genügt, und ist alles beantwortet, verschwindet die Karte. Danach „Diese Woche“ – die Termine der nächsten sieben Tage mit dem Stand (Zusagen, Trainer, Plan, Aufstellung); die erste Zeile ist der nächste Termin mit Wetter, Packtipp und Sprungknopf. Dann ein festgelegtes Trainer-Meeting (falls eines ansteht, mit der Zahl offener Themen), ein Knopf zu allen Terminen der Saison – und sechs große Kacheln, die du auch unten in der Leiste findest. Hinter jeder Kachel wartet wieder ein Kachel-Menü. Diese Tour findest du jederzeit über ❓ oben rechts."},
  {emo:"🏃", t:"Kachel: Training", d:"Vier Wege: Anwesenheit (heute + kommende Termine), Trainingsplan mit Stationen und Trainingsstart (die Trainer-Reihe oben zeigt farbig, wer für den Termin zu-, ab- oder noch nicht geantwortet hat), die Übungs-Datenbank und das 🏆 Trainingsturnier, das du vorab planen kannst – auch Eltern gegen Kinder. Die Nachbewertung meldet sich nach dem Training von selbst als To-Do auf der Startseite."},
  {emo:"⚽", t:"Kachel: Spieltag", d:"Der Ablauf von oben nach unten: „Teams festlegen“ beantwortet einmal für den ganzen Tag, wer dabei ist und wie viele Teams wir stellen – die Kinder verteilt die App automatisch, du korrigierst nur. Darunter je Team eine Kachel mit Kader, Rollen, Uhr, Rotations-Timer und Liveticker; danach die Team-Quests für alle Teams zusammen. Beim Öffnen sind alle Abschnitte eingeklappt – du tippst auf, was du gerade brauchst. Dazu die Rollen-Empfehlung aus den Bewertungen und die Analyse. Steht ein Turnier an, erscheint ganz unten der Turnier-Bereich (Heimturnier ausrichten mit öffentlichem Link für die Gast-Trainer)."},
  {emo:"👥", t:"Kachel: Team", d:"Kader verwalten, Spieler alle 6 Wochen in 16 Kriterien bewerten (Live-Radar), Profil mit Sprachlob und Entwicklungs-Report, dazu Saison-Cockpit, Anwesenheit über die Saison und Rollen-Matrix. Auch Notfallkarten und Probetraining wohnen hier."},
  {emo:"🎯", t:"Kachel: Taktik", d:"Das Taktikboard: Formationen stellen, Laufwege und Pässe zeichnen, als Bild teilen – auf dem Tablet im großen Pro-Modus. Daneben die Übungs-Datenbank."},
  {emo:"🪶", t:"Kachel: Eltern & Kinder", d:"Team-Ansage mit Gelesen-Status, Eltern einladen, Elterngespräche – und die ganze Adler-Welt der Kinder: Federn, Karten, Abzeichen, Kabinen-Wahl, Sammelalbum-Fotos, Team-Quests, Urkunden-Studio und das Adler Nest."},
  {emo:"📅", t:"Kachel: Orga", d:"Termine mit Endzeit (danach automatisch ins Archiv), Pinnwand fürs Trainerteam, Ferien-Radar, Mitbringlisten, Trainer-Meeting (steht der Termin, erscheint er auf deiner Startseite – die Eltern sehen ihn nicht), Teamkasse, Ausrüstung und Fundbüro. Ganz unten: Push-Benachrichtigungen und dein Passwort."},
  {emo:"🧭", t:"Und unten?", d:"Die Leiste am unteren Rand führt zu denselben Bereichen – für den schnellen Daumen-Wechsel. Kacheln und Leiste sind dieselbe Logik, nur zwei Wege. Viel Spaß – auf geht's, Adler! 🎉"},
];
let tourIdx=0;
// Nie im Kinder-Quiz: ?quiz laesst #home-content im DOM, renderHome laeuft also mit und
// wuerde den Kindern die Trainer-Tour zeigen (die von Kader & Trainingsplan erzaehlt).
function tourMaybe(){ if(document.body.classList.contains("quiz-extern"))return; try{if(localStorage.getItem("adler_trainer_tour"))return;}catch(e){} tourStart(); }
function tourStart(){ tourIdx=0; tourRender(); }
function tourNext(){ if(tourIdx<TOUR.length-1){tourIdx++;tourRender();}else tourClose(); }
function tourPrev(){ if(tourIdx>0){tourIdx--;tourRender();} }
function tourClose(){ try{localStorage.setItem("adler_trainer_tour","1");}catch(e){} document.getElementById("tour-ov")?.remove(); }
function tourRender(){
  document.getElementById("tour-ov")?.remove();
  const s=TOUR[tourIdx]; if(!s){tourClose();return;}
  const last=tourIdx===TOUR.length-1;
  const ov=document.createElement("div"); ov.id="tour-ov";
  ov.style.cssText="position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.75);display:flex;align-items:center;justify-content:center;padding:20px";
  ov.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:360px;width:100%;border-radius:18px;padding:22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.5)">
    <div style="font-size:42px;line-height:1">${s.emo}</div>
    <div style="font-size:18px;font-weight:800;margin:8px 0 8px">${esc(s.t)}</div>
    <div style="font-size:13.5px;color:var(--text2);line-height:1.5;text-align:left">${esc(s.d)}</div>
    <div style="display:flex;gap:6px;justify-content:center;margin:16px 0 4px">${TOUR.map((_,i)=>`<span style="width:7px;height:7px;border-radius:50%;background:${i===tourIdx?'var(--blue)':'var(--border)'}"></span>`).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      ${tourIdx>0?`<button class="btn btn-sm" onclick="tourPrev()">Zurück</button>`:`<button class="btn btn-sm" onclick="tourClose()">Überspringen</button>`}
      <button class="btn btn-p btn-sm" style="margin-left:auto" onclick="tourNext()">${last?"Fertig 🚀":"Weiter"}</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

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
      <div style="font-size:13px;font-weight:700">${k.nr!=null?`<span style="color:var(--text3);font-weight:600">#${k.nr}</span> `:""}${esc(k.name)}</div>
      <div id="aw-fed-${k.id}" style="font-size:11px;color:#7c3aed;font-weight:700">…</div>
    </div>
    <button class="btn btn-sm" onclick="adlerCardOpen('${(k.name||'').replace(/'/g,'')}')" title="FUT-Karte ansehen">🃏</button>
    <button class="btn btn-sm" onclick="abzeichenOpen(${k.id},'${(k.name||'').replace(/'/g,'')}')" title="Technik-Abzeichen">🎖️</button>
  </div>`).join("");
  c.innerHTML=`${mdlHead("aw-modal","🪶","Adler-Welt","Federn, Karten, Abzeichen & Challenge – ansehen und verwalten","#7c3aed")}
    <div id="aw-team-level" style="margin-bottom:12px"></div>
    <button class="btn btn-p btn-sm" style="width:100%" onclick="document.getElementById('aw-modal').remove();wochenChallengeOpen()"><i class="ti ti-trophy"></i>Wochen-Challenge setzen / bearbeiten</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('aw-modal').remove();w2('skillWocheOpen')"><i class="ti ti-video"></i>🎬 Skill der Woche setzen</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('aw-modal').remove();wahlTrainerOpen()"><i class="ti ti-chart-bar"></i>🗳️ Kabinen-Wahl (Kinder stimmen ab)</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="document.getElementById('aw-modal').remove();albumFotosOpen()"><i class="ti ti-photo"></i>🃏 Album-Karten-Fotos (Trainer &amp; Verein)</button>
    <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 4px">🎵 Kabinen-Playlist</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:6px">Spotify-Link zur U9-Playlist. Die Kinder hören sie in der Kabine.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <input id="aw-spotify" type="url" placeholder="https://open.spotify.com/playlist/…" style="flex:1;min-width:150px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)">
      <button class="btn btn-sm" onclick="spotifySave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
    <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 0">Spieler · ${XP_ICON} Federn</div>
    ${rows||'<div style="font-size:12px;color:var(--text3);padding:8px 0">Kein Kader geladen.</div>'}
    <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 4px">🔒 Kabinen-Code</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:6px">Mit diesem Code verlassen die Eltern den Kinder-Modus. Er bremst ein Kind – ein Schutz ist er nicht.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <input id="aw-kabinencode" type="text" inputmode="numeric" autocomplete="off" placeholder="Neuer Code (min. 4 Zeichen)" style="flex:1;min-width:150px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)">
      <button class="btn btn-sm" onclick="kabineCodeSave(this)"><i class="ti ti-device-floppy"></i>Code ändern</button>
    </div>
    <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 4px">🤝 Unsere Vereinbarung</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:6px">Die Eltern sehen beides in EINEM Dokument: oben die kurzen Fairplay-Regeln, darunter die ausformulierten Punkte nach Rubriken.</div>
    <button class="btn btn-sm" style="width:100%;margin-bottom:6px" onclick="document.getElementById('aw-modal').remove();w2('fairplayEditOpen')"><i class="ti ti-edit"></i>Fairplay-Regeln bearbeiten (oberer Teil)</button>
    <button class="btn btn-sm" style="width:100%" onclick="document.getElementById('aw-modal').remove();w2('leitfadenEditOpen')"><i class="ti ti-edit"></i>Praktische Punkte bearbeiten (Rubriken)</button>
    <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 4px">🏟️ Team-Arena</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:6px">Schlachtruf & Einlauf-Song, die die Kinder in der Kabine sehen.</div>
    <button class="btn btn-sm" style="width:100%" onclick="document.getElementById('aw-modal').remove();w2('arenaEditOpen')"><i class="ti ti-flag"></i>Arena bearbeiten</button>
    <div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 4px">🔗 Eltern einladen</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:6px">Fertige WhatsApp-Nachricht mit Eltern-Link + Kurzanleitung – an die Elternschaft schicken.</div>
    <button class="btn btn-sm btn-p" style="width:100%" onclick="document.getElementById('aw-modal').remove();elternInvitePaket()"><i class="ti ti-brand-whatsapp"></i>Einladung erstellen</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="qrAushangOpen()"><i class="ti ti-qrcode"></i>🖨️ QR-Aushang fürs schwarze Brett drucken</button>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('aw-modal').remove()">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
  if(typeof teamLevelLoad==="function")teamLevelLoad("aw-team-level"); // Küken-Schwarm (Team-Level) jetzt hier
  active.forEach(k=>{xpTotal(k.id).then(t=>{const el=document.getElementById("aw-fed-"+k.id);if(el){const b=xpBadge(t);el.textContent=`${XP_ICON} ${t} · ${b.emo} ${b.t}`;}}).catch(()=>{});});
  // aktuelle Spotify-Playlist vorbefüllen
  fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=spotify_playlist`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).then(rows=>{const el=document.getElementById("aw-spotify");if(el&&rows[0]&&rows[0].spotify_playlist)el.value=rows[0].spotify_playlist;}).catch(()=>{});
}
/* ── K5: QR-Aushang – druckbares A4-Plakat mit QR-Code zum Eltern-Bereich (schwarzes
   Brett am Käfig, Probetraining-Eltern). Der QR kommt als Bild von api.qrserver.com und
   enthält NUR die öffentliche App-Adresse, keine persönlichen Daten. ── */
function qrAushangOpen(){
  const link=appRoot()+"?portal";
  const qr="https://api.qrserver.com/v1/create-qr-code/?size=420x420&data="+encodeURIComponent(link);
  const html=`<div class="zert-page"><div class="zert-card">
    <div class="zert-crest"><img src="logo.png" alt=""></div>
    <div class="zert-club">SV Adler Dellbrück e.V. · U9</div>
    <div class="zert-title">Unsere Team-App</div>
    <div class="zert-season">für alle Adler-Eltern &amp; Schnupper-Familien</div>
    <div class="zert-text" style="text-align:left;max-width:460px">
      <b>1.</b> QR-Code scannen und mit E-Mail anmelden – der Login-Code kommt per Mail, ganz ohne Passwort.<br>
      <b>2.</b> Dem Trainerteam kurz die E-Mail-Adresse nennen, damit euer Kind verknüpft wird.<br>
      <b>3.</b> Fertig: Termine zu-/absagen, Infos &amp; Fotos, Liveticker – und „Die Kabine“ für die Kinder.</div>
    <img src="${qr}" alt="QR-Code zur Eltern-App" crossorigin="anonymous" style="width:220px;height:220px;margin:14px auto 6px;display:block">
    <div style="font-size:11px;color:#64748b;word-break:break-all">${esc(link)}</div>
    <div class="zert-sign"><div>Euer Trainerteam<br>${(typeof TRAINER!=="undefined"?TRAINER:[]).join(" · ")}</div><div>Fragen? Sprecht uns am Platz an!</div></div>
  </div></div>`;
  toast("🖨️ QR-Aushang wird vorbereitet …");
  const probe=new Image(); probe.crossOrigin="anonymous";
  probe.onload=()=>_zertPrint(html);
  probe.onerror=()=>toast("QR-Dienst gerade nicht erreichbar – bitte später nochmal","err");
  probe.src=qr;
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
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:10px">Kinder-Sticker nutzen automatisch das Profilfoto (mit Eltern-Freigabe). Hier pflegst du die restlichen Karten – Querformat wird rund zugeschnitten, max. 3 MB.</div>
    ${_albumFotoSlots().map(s=>`<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-radius:12px;padding:8px 12px;margin-bottom:6px">
      <span style="flex:1;min-width:0;font-size:13px;font-weight:700">${s.label}</span>
      <span style="font-size:11px;color:${map[s.key]?"var(--green)":"var(--text3)"}">${map[s.key]?"✅ Foto da":"– kein Foto"}</span>
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
  // Trainer-PIN und Kabinen-Code sind ab Werk beide "1922". Wer den einen kennt, kennt den anderen.
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
  const fld="width:100%;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:360px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    ${mdlHead("pw-modal","🔑","Passwort ändern","Eigenes, sicheres Passwort (mind. 8 Zeichen)","#334155")}
    <label style="font-size:11px;color:var(--text2)">Neues Passwort<input type="password" id="pw-new" autocomplete="new-password" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Nochmal eingeben<input type="password" id="pw-new2" autocomplete="new-password" onkeydown="if(event.key==='Enter')pwChangeSave()" style="${fld}"></label>
    <div id="pw-err" style="color:var(--red);font-size:12px;min-height:16px;margin-top:6px"></div>
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
  if(p1.length<8){fail("Mindestens 8 Zeichen.");return;}
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

/* Kopfzeile: statt einer veralteten Trainer-Liste der nächste Termin.
   Fällt still auf "U9 I · Trainerstab" zurück (offline, kein Termin, kein Login). */
async function topbarNaechsterTermin(){
  const el=document.getElementById("topbar-sub");
  if(!el||!sbToken())return;
  const heute=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=gte.${heute}&select=datum,uhrzeit,uhrzeit_ende,typ,ort,platz&order=datum.asc,uhrzeit.asc.nullslast&limit=6`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    // v478: ein beendetes Training von heute ist nicht mehr „das Naechste"
    const t=((await r.json())||[]).find(x=>!(typeof terminVorbei==="function"&&terminVorbei(x)));
    if(!t)return;
    const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ};
    const d=new Date(t.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=t.uhrzeit?" · "+String(t.uhrzeit).slice(0,5)+" Uhr":"";
    const ort=t.platz?" · "+t.platz:(t.ort?" · "+t.ort:"");
    el.textContent=`Nächstes: ${m.icon} ${m.label} ${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit}${ort}`;
  }catch(e){/* Kopfzeile ist Beiwerk – niemals stören */}
}

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
  return `<span style="display:inline-block;font-size:11px;font-weight:700;line-height:1.3;padding:3px 8px;border-radius:10px;background:${f[0]};color:${f[1]};border:1px solid ${f[1]}33">${text}</span>`;
}
function wocheOpen(id,datum,typ){
  if(typeof nutzungLog==="function")nutzungLog("aktion","woche:"+typ);
  if(typeof tmDetailOpen==="function")tmDetailOpen(id); else go("termine");
}
async function homeWocheLoad(){
  const slot=document.getElementById("home-woche"); if(!slot)return;
  if(!sbToken()){slot.innerHTML="";return;}
  const heute=new Date().toISOString().slice(0,10);
  const bis=new Date(Date.now()+WOCHE_TAGE*864e5).toISOString().slice(0,10);
  let fern=false;   // kein Termin in 7 Tagen → der naechste danach
  /* v474: Jede gerechnete Zahl nennt ihre Quelle (Muster v470) – sonst raet der Trainer,
     ob „3 zugesagt" aus den Eltern-Antworten oder aus seiner eigenen Anwesenheit stammt. */
  const quelle=`<div class="woche-quelle" style="font-size:10.5px;color:var(--text3);margin-top:6px;line-height:1.4">Zusagen aus den Eltern-Rückmeldungen, am Spieltag „dabei“ aus „Teams festlegen“ · Trainer aus dem Trainerplan · Plan aus der App</div>`;
  const karte=(inner,mitQuelle)=>`<div class="card" style="padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text2)">🗓️ ${fern?"Als Nächstes":"Diese Woche"}</div>
      <div style="font-size:11px;color:var(--text3)">${fern?"kein Termin in den nächsten "+WOCHE_TAGE+" Tagen":"nächste "+WOCHE_TAGE+" Tage"}</div>
    </div>${inner}${mitQuelle?quelle:""}</div>`;
  let termine=[];
  try{
    const felder="id,datum,uhrzeit,uhrzeit_ende,typ,titel,gegner,ort,platz,spielform,trainer_status";
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
    slot.innerHTML=karte(`<div style="font-size:12.5px;color:var(--text2)">Kein Termin geplant. <a href="#" onclick="go('termine');return false" style="color:var(--blue-text);font-weight:700">Termin erfassen ›</a></div>`);
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
    const chips=[];
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
      chips.push(_wocheChip(`${ja} zugesagt`,ja>=6?"ok":ja?"warn":nah?"rot":"neutral"));
      if(nein)chips.push(_wocheChip(`${nein} abgesagt`,"neutral"));
      if(offen)chips.push(_wocheChip(`${offen} offen`,"neutral"));
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
    const erweitert=idx!==0?"":`<div class="woche-erweitert" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${istSpiel?`<button class="btn btn-p btn-sm" onclick="tmJump('blitz','${t.datum}','${esc(t.spielform||"")}')" style="white-space:nowrap"><i class="ti ti-ball-football"></i>Matchday</button>`
            :t.typ==="event"?`<button class="btn btn-sm" onclick="mitbringTrainerOpen()" style="white-space:nowrap"><i class="ti ti-basket"></i>Mitbringliste</button>`
            :`<button class="btn btn-sm" onclick="tmJump('anwesenheit','${t.datum}')" style="white-space:nowrap"><i class="ti ti-checkbox"></i>Anwesenheit</button>
             <button class="btn btn-sm" onclick="tmJump('planung','${t.datum}')" style="white-space:nowrap"><i class="ti ti-clipboard-list"></i>Plan</button>`}
          ${t.spielform?`<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${m.col}22;color:${m.col}">${esc(t.spielform)}</span>`:""}
          ${t.ort?`<span style="font-size:11.5px;color:var(--text2)">📍 ${mapsAnchor(t.ort)}</span>`:""}
        </div>
        <div id="wetter-home"></div><div id="wetter-warn-home"></div><div id="gegner-contact-home"></div>
      </div>`;
    return `<div class="woche-zeile" role="button" tabindex="0" onclick="wocheOpen(${t.id},'${t.datum}','${esc(t.typ)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"
        style="display:flex;gap:10px;align-items:flex-start;min-height:44px;padding:8px 4px;border-top:1px solid var(--rand-bedien);cursor:pointer">
      <div style="flex:0 0 52px;text-align:center">
        <div style="font-size:11px;font-weight:800;color:${inTagen===0?"var(--red)":"var(--text2)"}">${inTagen===0?"HEUTE":inTagen===1?"morgen":wtag}</div>
        <div style="font-size:14px;font-weight:800;line-height:1.2">${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</div>
        <div style="font-size:11px;color:var(--text2)">${zeit||"&nbsp;"}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13.5px;font-weight:800;line-height:1.25">${m.icon} ${titel}${ort?` <span style="font-weight:500;color:var(--text2);font-size:11.5px">· ${esc(ort)}</span>`:""}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${chips.join("")}</div>
        ${erweitert}
      </div>
      <div aria-hidden="true" style="align-self:center;color:var(--text3);font-size:16px">›</div>
    </div>`;
  });
  slot.innerHTML=karte(`<div style="margin:0 -4px">${zeilen.join("")}</div>`,true);
  // Wetter, Warnung und Gegner-Kontakt fuer den ersten Termin – wie frueher in der eigenen Karte
  const t0=termine[0];
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
    <div id="nutzung-body"><div style="font-size:12px;color:var(--text2)">Lade Auswertung…</div></div>
    <button class="btn btn-sm" style="width:100%;margin-top:12px" onclick="nutzungAufraeumen()"><i class="ti ti-trash"></i>Einträge älter als 90 Tage löschen</button>
  </div>`;
  document.body.appendChild(m);
  nutzungLaden(_nutzungTage);
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
    if(!r.ok){box.innerHTML=`<div style="font-size:12.5px;color:var(--text2)">Auswertung gerade nicht erreichbar – später noch einmal öffnen.</div>`;return;}
    rows=(await r.json())||[];
  }catch(e){box.innerHTML=`<div style="font-size:12.5px;color:var(--text2)">Kein Netz – die Auswertung braucht den Server.</div>`;return;}
  if(!document.getElementById("nutzung-body"))return;
  if(!rows.length){box.innerHTML=`<div style="font-size:12.5px;color:var(--text2)">Noch keine Einträge in den letzten ${tage} Tagen. Das Log läuft seit v453 – einfach benutzen, die Zahlen kommen von selbst.</div>`;return;}
  const tageHer=ts=>{const d=Math.round((Date.now()-new Date(ts))/864e5);return d<=0?"heute":d===1?"gestern":`vor ${d} Tagen`;};
  const gruppe=(titel,ereignis,rolle)=>{
    const l=rows.filter(x=>x.ereignis===ereignis&&(!rolle||x.rolle===rolle)).sort((a,b)=>b.anzahl-a.anzahl);
    if(!l.length)return "";
    const max=Math.max(...l.map(x=>+x.anzahl));
    return `<div style="font-size:13px;font-weight:800;margin:14px 0 6px">${titel}</div>`+l.map(x=>`
      <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;font-size:12.5px;padding:5px 0;border-top:1px solid var(--rand-bedien)">
        <div style="min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis">${esc(x.ziel||"–")}</div>
          <div style="height:4px;border-radius:2px;background:var(--surface2);margin-top:4px"><div style="height:4px;border-radius:2px;background:var(--blue);width:${Math.max(4,Math.round(100*x.anzahl/max))}%"></div></div></div>
        <div style="text-align:right;font-variant-numeric:tabular-nums"><b>${x.anzahl}</b>×<div style="font-size:10.5px;color:var(--text2)">${x.nutzer} Nutzer</div></div>
        <div style="font-size:10.5px;color:var(--text2);text-align:right;min-width:60px">${tageHer(x.zuletzt)}</div>
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
    (nie.length?`<div style="font-size:13px;font-weight:800;margin:14px 0 6px">Nie benutzt in ${tage} Tagen (${nie.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${nie.map(a=>`<span style="font-size:11px;padding:3px 8px;border-radius:10px;background:var(--surface2);color:var(--text2);border:1px solid var(--rand-bedien)">${esc(a)}</span>`).join("")}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:6px">Kandidaten fürs Ausmisten – erst nach 4–6 Wochen Daten entscheiden.</div>`:"");
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
  if(!window._topbarChecked){window._topbarChecked=true;topbarNaechsterTermin();}
  if(!window._tourChecked){window._tourChecked=true;setTimeout(tourMaybe,700);} // Feature-Tour beim ersten Start
  const heute=new Date().toISOString().slice(0,10);
  const card=(inner,accent)=>`<div style="background:var(--surface);border:var(--border-s);${accent?`border-left:3px solid ${accent};`:""}border-radius:var(--rl);padding:12px 14px;margin-bottom:10px">${inner}</div>`;
  const homeTool=(label,fn)=>`<button onclick="${fn}" style="flex:1 1 calc(50% - 4px);min-width:140px;min-height:46px;border:1px solid var(--rand-bedien);border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--text);background:var(--surface);text-align:left;padding:0 12px">${label}</button>`;

  // ── Quick-Stats (sofort, aus lokalen Daten) ──
  const names=Object.keys(DB||{});
  const bewertet=names.filter(n=>DB[n]&&DB[n].length).length;
  const cutoff=new Date(Date.now()-42*86400000).toISOString().slice(0,10); // 6 Wochen (Bewertung alle 6 Wochen im Trainermeeting)
  const stale=KADER.filter(k=>{
    const s=DB[k.name];
    if(!s||!s.length)return true;
    return (s[s.length-1].datum||"0000")<cutoff;
  }).length;
  const statTile=(val,lbl,col,jump)=>`<div onclick="${jump}" class="card" style="flex:1;min-width:90px;padding:10px;text-align:center;cursor:pointer">
    <div style="font-size:22px;font-weight:800;color:${col}">${val}</div>
    <div style="font-size:10px;color:var(--text2)">${lbl}</div></div>`;

  // ── Geburtstage (nur wenn geb im KADER gepflegt) ──
  const mitGeb=KADER.filter(k=>k.geb);
  let gebHtml="";
  if(!mitGeb.length){
    gebHtml=card(`<div style="font-size:12px;color:var(--text2)">🎂 Geburtstage: noch keine Daten im Kader gepflegt (Feld <code>geb:"JJJJ-MM-TT"</code> je Spieler ergänzen).</div>`);
  }else{
    const soon=mitGeb.map(k=>({k,d:homeGebTage(k.geb)})).filter(x=>x.d<=14).sort((a,b)=>a.d-b.d);
    if(soon.length){
      gebHtml=card(soon.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0">
        <span style="font-size:16px">${x.d===0?"🎉":"🎂"}</span>
        <strong>${esc(x.k.name)}</strong>
        <span style="color:var(--text2);font-size:11.5px">${x.d===0?`wird HEUTE ${homeAlter(x.k.geb)+1}!`:`wird in ${x.d} Tag${x.d===1?"":"en"} ${homeAlter(x.k.geb)+1}`}</span>
      </div>`).join(""),"var(--amber)");
    }
  }

  // Team-Quests leben jetzt im Spieltag (dort werden sie gezählt & geschafft) – nicht mehr auf der Startseite.
  let onboardHtml="";
  try{ if(!localStorage.getItem("adler_onboarded")) onboardHtml=`<div id="onboard-card" class="card" style="padding:16px;margin-bottom:12px;border-left:3px solid var(--blue)">
    <div style="font-weight:800;font-size:15px;margin-bottom:2px">👋 Willkommen im Adler-Trainer!</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">In 3 Schritten startklar:</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn" style="justify-content:flex-start" onclick="go('kader')"><i class="ti ti-users"></i>1️⃣ Kader anlegen / prüfen</button>
      <button class="btn" style="justify-content:flex-start" onclick="go('termine')"><i class="ti ti-calendar-plus"></i>2️⃣ Ersten Termin eintragen</button>
      <button class="btn" style="justify-content:flex-start" onclick="openTab('spieltag')"><i class="ti ti-ball-football"></i>3️⃣ Am Spieltag loslegen</button>
    </div>
    <button onclick="onboardingDismiss()" style="margin-top:10px;background:transparent;border:none;color:var(--text3);font-family:inherit;font-size:11.5px;cursor:pointer;text-decoration:underline">Alles klar, ausblenden</button>
  </div>`; }catch(e){}
  /* N1-Umbau (PO + Trainerkollegen: „zu überladen"): Die Startseite ist nur noch
     To-Do-Banner → Diese Woche → 6 Kacheln (2×3). ALLE Werkzeuge leben
     jetzt hinter den Kachelseiten (kachelOpen) – nichts wurde gelöscht, nur einsortiert. */
  box.innerHTML=`
    ${onboardHtml}
    <div id="trainer-todo-slot"></div>
    <div id="trainer-termine-slot"></div>
    <div id="eg-trainer"></div>
    <div id="home-woche"></div>
    <div id="home-next"></div>
    <div id="home-meeting"></div>
    <div id="trainer-alle-termine-slot"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">
      ${kachelTile("training","🏃","Training","var(--fam-training)","var(--fam-training-2)")}
      ${kachelTile("spieltag","⚽","Spieltag","var(--fam-spieltag)","var(--fam-spieltag-2)")}
      ${kachelTile("team","👥","Team","var(--fam-team)","var(--fam-team-2)")}
      ${kachelTile("taktik","🎯","Taktik","var(--fam-taktik)","var(--fam-taktik-2)")}
      ${kachelTile("elki","🪶","Eltern & Kinder","var(--fam-elki)","var(--fam-elki-2)")}
      ${kachelTile("orga","📅","Orga","var(--fam-orga)","var(--fam-orga-2)")}
    </div>
    <div id="app-version" style="text-align:center;font-size:10.5px;color:var(--text3);margin:14px 0 4px"></div>`;
  appVersionInto("app-version");   // liest die Version aus dem geladenen Cache
  elterngespraecheTrainerLoad(); // offene Elterngespräch-Wünsche (handeln nötig → bleibt oben)
  trainerTodoLoad();             // To-Do-Banner (leer = unsichtbar)
  homeWocheLoad();               // Diese Woche: Termine mit Zusagen, Trainern, Plan-Stand
  trainerTermineHomeLoad();      // Termine der nächsten 14 Tage zum Antippen
  trainerMeetingHomeLoad();      // festgelegtes Trainer-Meeting (steht nicht in `termine`)
  if(typeof tlCheck==="function")tlCheck(); // läuft gerade ein Trainingsstart? → Bereit-Fenster ploppt auf
  if(stale>0){const b=document.getElementById("kb-team");if(b)b.textContent=stale+" Bewertungen fällig";}
  // ── Next Event (async nachladen, damit das Dashboard sofort steht) ──
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&datum=gte.${heute}&order=datum.asc,uhrzeit.asc.nullslast&limit=10`,{headers:sbAuthHeaders()});
    const slot=document.getElementById("home-next");
    if(!slot)return; // Nutzer hat den Tab schon verlassen
    if(!r.ok){slot.innerHTML=card('<div style="font-size:12px;color:var(--text3)">Termine offline nicht verfügbar.</div>');return;}
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
      setB("kb-training",rows.find(x=>x.typ==="training"));
      setB("kb-spieltag",rows.find(x=>x.typ==="spiel"||x.typ==="turnier"));
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
  const inTagen=Math.round((new Date(t.datum+"T00:00:00")-new Date(new Date().toISOString().slice(0,10)+"T00:00:00"))/864e5);
  if(inTagen<0||inTagen>2)return; // nur wenn's unmittelbar bevorsteht
  let w=null; try{ w=await wetterFetch(t.datum,t.ort,t.uhrzeit); }catch(e){}
  const warn=(typeof wetterWarn==="function")?wetterWarn(w):null; if(!warn)return;
  const abgesagt=t.platz_status==="abgesagt";
  const tt=(t.titel||t.gegner||"Termin").replace(/'/g,"");
  el.innerHTML=`<div style="margin-top:8px;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px">
    <div style="font-size:12.5px;font-weight:800;color:var(--red)">⚠️ Wetter kritisch: ${esc(warn.lvl)}</div>
    <div style="font-size:11.5px;color:#7f1d1d;margin:2px 0 8px">${esc(warn.msg)} Absagen und die Eltern informieren?</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${abgesagt?'<span style="font-size:11.5px;color:var(--red);font-weight:700">🔴 Bereits als „fällt aus" markiert</span>':`<button class="btn btn-sm btn-d" onclick="wetterAbsagen(${Number(t.id)})"><i class="ti ti-x"></i>Platz absagen</button>`}
      <button class="btn btn-sm" onclick="wetterInfoPush(${Number(t.id)},'${tt}','${t.datum}')"><i class="ti ti-bell"></i>Eltern informieren</button>
    </div>
  </div>`;
}
async function wetterAbsagen(id){
  if(typeof platzAmpelSet==="function")await platzAmpelSet(id,"abgesagt");
  const el=document.getElementById("wetter-warn-home");
  if(el)el.querySelector("div>div:last-child").innerHTML='<span style="font-size:11.5px;color:var(--red);font-weight:700">🔴 Als „fällt aus" markiert – jetzt noch die Eltern informieren.</span>';
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
  const heute=new Date().toISOString().slice(0,10);
  const vor14=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  const vor7=new Date(Date.now()-7*864e5).toISOString().slice(0,10);
  const todos=[];
  /* a) „Bist du dabei?" stand hier als Zähler und ist seit v403 eine eigene Karte direkt
     darunter – mit den Terminen im Klartext statt einer Zahl. Zwei Elemente auf demselben
     Bildschirm, die dasselbe sagen, kosten nur Platz; deshalb hier gestrichen. */
  // b) Einheit nachbereiten, wenn du laut Trainingsplan eingeteilt warst
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?select=datum,plan&datum=gte.${vor14}&datum=lt.${heute}`,{headers:sbAuthHeaders()});
    const r2=await fetch(`${SB_URL}/rest/v1/einheit_bewertung?select=datum&datum=gte.${vor14}`,{headers:sbAuthHeaders()});
    if(r.ok){
      const done=new Set(r2.ok?((await r2.json())||[]).map(x=>x.datum):[]);
      const meine=((await r.json())||[]).filter(row=>!done.has(row.datum)&&JSON.stringify(row.plan||"").includes(`"${me}"`));
      meine.slice(0,2).forEach(row=>{const d=new Date(row.datum+"T00:00:00");
        todos.push({emo:"⭐",txt:`Einheit vom ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})} nachbereiten – du warst eingeteilt`,act:"einheitBewertenOpen()"});});
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
  // e) Ergebnis nachtragen: vergangene Spiele/Turniere ohne Ergebnis (füttert Cockpit,
  //    Spielbericht, Nach-dem-Spiel-Gruß und Team-Meilensteine – ohne Ergebnis bleibt alles stumm)
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,datum,titel,gegner,spielform,uhrzeit_ende,ergebnis,ohne_ergebnis&typ=in.(spiel,turnier)&datum=gte.${vor14}&datum=lte.${heute}&order=datum.desc&limit=5`,{headers:sbAuthHeaders()});
    if(r.ok){
      /* v471 – PO: „das To-Do wird nicht gelöscht … dann ist es ärgerlich, wenn es als
         dauerhaftes To-Do stehen bleibt."
         Zwei Fehler steckten darin. Erstens fuehrte der Knopf ins Blitz-Rating – dort gibt
         es gar kein Ergebnisfeld, das To-Do liess sich also durch Antippen nie erledigen.
         Jetzt oeffnet er das Termin-Detail, wo das Ergebnis eingetragen wird.
         Zweitens gab es keinen Weg, darauf zu verzichten: ohne_ergebnis am Termin ist
         diese Entscheidung, und sie gilt fuer das ganze Trainerteam (PO). */
      const offen=((await r.json())||[]).filter(t=>(typeof terminVorbei!=="function"||terminVorbei(t))&&!(t.ergebnis||"").trim()&&t.ohne_ergebnis!==true);
      offen.slice(0,2).forEach(t=>{const d=new Date(t.datum+"T00:00:00");
        todos.push({emo:"⚽",txt:`Ergebnis &amp; Bericht für ${esc(t.titel||t.gegner||"das Spiel")} (${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}) nachtragen`,
          act:`(typeof tmDetailOpen==="function"?tmDetailOpen(${Number(t.id)}):go("termine"))`,
          hakenAct:`todoOhneErgebnis(${Number(t.id)})`});});
    }
  }catch(e){}
  if(!todos.length){slot.innerHTML="";return;}
  slot.innerHTML=`<div class="card" style="border-left:4px solid var(--amber);padding:12px 14px;margin-bottom:10px">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--amber);margin-bottom:8px">📌 Deine To-Dos, ${esc(me)}</div>
    ${todos.map(t=>`<div style="display:flex;gap:6px;align-items:stretch;margin-bottom:6px">
      <button onclick="${t.act}" style="display:flex;gap:10px;align-items:center;flex:1;min-width:0;text-align:left;background:var(--surface);border:1px solid var(--rand-bedien);border-radius:10px;padding:10px 12px;font-family:inherit;cursor:pointer;color:var(--text)"><span style="font-size:17px;line-height:1">${t.emo}</span><span style="flex:1;font-size:12.5px;font-weight:600;line-height:1.4">${t.txt}</span><span style="color:var(--text3)">›</span></button>
      ${t.hakenAct?`<button onclick="${t.hakenAct}" title="Erledigt – ohne Ergebnis abhaken. Gilt für das ganze Trainerteam." aria-label="To-Do abhaken" style="flex:none;min-width:48px;min-height:44px;background:var(--surface);border:1px solid var(--rand-bedien);border-radius:10px;font-size:17px;cursor:pointer;color:var(--green);font-family:inherit">✓</button>`:""}
    </div>`).join("")}
  </div>`;
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
  const heute=new Date().toISOString().slice(0,10);
  // Alles ab heute, ohne obere Grenze. 300 deckt auch eine komplette Saison ab.
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,datum,uhrzeit,typ,titel,gegner,trainer_status&datum=gte.${heute}&order=datum.asc,uhrzeit.asc.nullslast&limit=300`,{headers:sbAuthHeaders()});
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
    style="min-height:44px;padding:6px 16px;border:1px solid var(--rand-bedien);border-radius:22px;font-family:inherit;font-size:12.5px;font-weight:${an?"700":"500"};cursor:pointer;background:${an?"var(--blue)":"var(--surface)"};color:${an?"#fff":"var(--text2)"}">${lbl}</button>`;
  return chip(!_trsvpNurOffen,`Alle (${alle})`,"trainerRsvpFilter(false)")+
         chip(_trsvpNurOffen,`Nur offene (${offen})`,"trainerRsvpFilter(true)");
}
function _trsvpListHtml(){
  const rows=_trsvpNurOffen?_trsvpOffen():_trsvpRows;
  if(!rows.length)return `<div style="font-size:12.5px;color:var(--text3);padding:14px;text-align:center">${
    _trsvpNurOffen?"Alle Termine beantwortet ✓":"Keine kommenden Termine eingetragen."}</div>`;
  let html="", monat="";
  rows.forEach(t=>{
    const m=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
    if(m!==monat){
      monat=m;
      html+=`<div style="position:sticky;top:0;z-index:2;background:var(--surface);font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);padding:8px 2px 4px">${esc(m)}</div>`;
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
  const btn=(val,emo,lbl,col)=>`<button onclick="trainerRsvpSet(${Number(t.id)},'${val}')" aria-pressed="${st===val?"true":"false"}" style="flex:1;min-height:44px;border-radius:10px;border:1.5px solid ${st===val?col:"var(--rand-bedien)"};background:${st===val?col:"var(--surface)"};color:${st===val?"#fff":"var(--text2)"};font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">${emo} ${lbl}</button>`;
  return `<div id="${pre}-${t.id}" style="border:var(--border-s);border-left:3px solid ${m.col};border-radius:12px;padding:10px 12px;margin-bottom:8px;background:var(--surface)">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div style="font-size:13px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.icon} ${esc(t.titel||t.gegner||m.label)}</div>
      <div style="font-size:11px;color:var(--text2);white-space:nowrap">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""}</div>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px">${btn("ja","✅","Dabei","var(--green)")}${btn("unsicher","🤔","Unsicher","#ca8a04")}${btn("nein","❌","Nicht","var(--red)")}</div>
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
    <div id="trsvp-kopf" style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${_trsvpKopfText()}</div>
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
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);align-self:end">Termin</div>
    ${namen.map(n=>`<div title="${esc(n)}" style="text-align:center;font-size:10.5px;font-weight:800;color:var(--text2)">${esc(kurz[n])}</div>`).join("")}
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
    style="min-height:44px;border:none;border-radius:8px;background:${look.bg};color:${look.fg};font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">${look.z}</button>`;
}
function _tpZeileHtml(t,namen){
  const a=_tpAmpel(t.trainer_status,namen);
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅"};
  const sp=`92px repeat(${namen.length},minmax(36px,1fr))`;
  return `<div id="tp-row-${t.id}" style="display:grid;grid-template-columns:${sp};gap:3px;align-items:center;padding:3px 0;border-top:var(--border)">
    <div style="border-left:4px solid ${a.farbe};padding-left:6px;min-width:0;overflow:hidden">
      <div style="font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.icon} ${wtag} ${d.getDate()}.${d.getMonth()+1}.</div>
      <div style="font-size:9.5px;color:${a.stufe<=1?a.farbe:"var(--text3)"};font-weight:${a.stufe<=1?"700":"400"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.ja===0?"niemand":a.ja+" dabei"}</div>
    </div>
    ${namen.map(n=>_tpZelleHtml(t,n)).join("")}
  </div>`;
}
function _tpListeHtml(){
  const namen=_tpNamen(), kurz=_tpKuerzel(namen);
  let rows=_tpZeilen();
  if(_tpNurEng)rows=rows.filter(t=>_tpAmpel(t.trainer_status,namen).stufe<=1); // 0 oder 1 Zusage
  if(!rows.length)return `<div style="font-size:12.5px;color:var(--text3);padding:16px;text-align:center">${
    _tpNurEng?"Überall mindestens zwei Zusagen ✓":"Keine kommenden Trainings, Spiele oder Turniere."}</div>`;
  let html=_tpKopfHtml(namen,kurz), monat="";
  rows.forEach(t=>{
    const mn=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
    if(mn!==monat){ monat=mn;
      html+=`<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);padding:10px 2px 2px">${esc(mn)}</div>`; }
    html+=_tpZeileHtml(t,namen);
  });
  return html;
}
function _tpFilterHtml(){
  const namen=_tpNamen();
  const alle=_tpZeilen(), eng=alle.filter(t=>_tpAmpel(t.trainer_status,namen).stufe<=1);
  const chip=(an,lbl,fn)=>`<button onclick="${fn}" aria-pressed="${an?"true":"false"}"
    style="min-height:44px;padding:6px 16px;border:1px solid var(--rand-bedien);border-radius:22px;font-family:inherit;font-size:12.5px;font-weight:${an?"700":"500"};cursor:pointer;background:${an?"var(--blue)":"var(--surface)"};color:${an?"#fff":"var(--text2)"}">${lbl}</button>`;
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
    <div id="tp-kopf" style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${_tpKopfText()}</div>
    <div id="tp-filter" style="display:flex;gap:6px;margin-bottom:10px">${_tpFilterHtml()}</div>
    <div id="tp-liste" style="flex:1;min-height:0;overflow:auto">${_tpListeHtml()}</div>
    <div style="font-size:10.5px;color:var(--text3);line-height:1.5;margin-top:10px;padding-top:8px;border-top:var(--border)">
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
  return _trsvpRows.filter(t=>t.datum<=bis&&!(t.trainer_status||{})[_trsvpMe]);
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
  return `<button onclick="trainerRsvpQuickOpen()" style="display:flex;gap:6px;align-items:center;justify-content:center;width:100%;min-height:44px;margin-bottom:12px;background:var(--surface);border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--text2);cursor:pointer">🗓️ Alle ${_trsvpRows.length} Termine<span style="color:var(--text3)">›</span></button>`;
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
    inhalt+=`<div style="font-size:11.5px;color:var(--text3);text-align:center;padding:2px 0 6px">und ${offen.length-zeigen.length} weitere ohne deine Antwort</div>`;
  slot.innerHTML=`<div class="card" style="border-left:4px solid var(--amber);padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--amber)">🗓️ Bist du dabei?</div>
      <div id="trhome-kopf" style="font-size:11px;color:var(--text2);text-align:right">${_trhomeKopfText()}</div>
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
    const heute=new Date().toISOString().slice(0,10);
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
        <span style="font-size:20px;flex:none">🗓️</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text2)">Trainer-Meeting · ${esc(bald)}</span>
          <span style="display:block;font-size:13.5px;font-weight:800;color:var(--text)">${esc(p.titel)}</span>
          <span style="display:block;font-size:12px;color:var(--text2)">${esc(wann)} · ${offen[p.id]?`📝 ${offen[p.id]} ${offen[p.id]===1?"Thema":"Themen"}`:"noch keine Themen"}</span>
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
  const heute=new Date().toISOString().slice(0,10);
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
  slot.innerHTML=`<div onclick="rsvpOverviewOpen(${t.id})" class="card" style="padding:12px 14px;margin-bottom:10px;border-left:3px solid var(--amber);cursor:pointer;display:flex;align-items:center;gap:8px">
    <span style="font-size:18px">🔔</span>
    <span style="flex:1;font-size:12.5px"><strong style="color:var(--amber)">${offen} ohne Rückmeldung</strong> für ${m.icon} ${esc(t.titel||t.gegner||m.label)} · ${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</span>
    <span style="font-size:11px;font-weight:800;color:var(--blue-text)">nachfassen ›</span>
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
      <span style="font-size:18px">🌟</span>
      <span style="flex:1;font-size:12.5px"><strong>${esc(pick)}</strong> hatte diese Saison noch kein Torerlebnis – gib ihm/ihr heute bewusst eine Bühne. 💛</span>
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
    const key="adler_bday_"+new Date().toISOString().slice(0,10)+"_"+k.name;
    let sent=false; try{sent=!!localStorage.getItem(key);}catch(e){}
    return `<div class="card" style="padding:12px 14px;margin-bottom:10px;border-left:3px solid #ec4899">
      <div style="font-size:13.5px;font-weight:800">🎂 ${esc(k.name)} hat heute Geburtstag – wird ${homeAlter(k.geb)+1}!</div>
      <button onclick="birthdayPush('${(k.name).replace(/'/g,'')}','${key}')" style="width:100%;min-height:44px;margin-top:8px;border:none;border-radius:10px;background:#ec4899;color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">${sent?"✓ Gruß gesendet – nochmal senden":"🎉 Geburtstags-Gruß als Push senden"}</button>
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
   Trainer bearbeitet Titel, Einleitung, „Spieler im Fokus" + Trainer-Kommentar,
   sieht eine Live-Vorschau und druckt. Texte bleiben in localStorage erhalten.
   heftBuildHtml(cfg,{mask}) baut das Heft rein – die Nachnamen-Maskierung ist
   bereits eingebaut (Aktivierung folgt in der DSGVO-Etappe). ═══ */
let heftKader=[], heftFanfacts={}, heftTermin=null, heftFotos=[];
let heftCfg={titel:"Adler Nest · U9", einleitung:"", fokusId:"", fokusText:"", kommentar:""};
function heftCfgLoad(){ try{const s=JSON.parse(localStorage.getItem("adler_heft_cfg")||"null"); if(s&&typeof s==="object")heftCfg=Object.assign(heftCfg,s);}catch(e){} }
function heftCfgSave(){ try{localStorage.setItem("adler_heft_cfg",JSON.stringify(heftCfg));}catch(e){} }
// DSGVO: Nachname zu Initiale kürzen ("Max Mustermann" -> "Max M."); Einzelnamen bleiben.
function heftMaskName(name){ const p=String(name||"").trim().split(/\s+/); if(p.length<2)return p[0]||""; return p[0]+" "+p[p.length-1].charAt(0).toUpperCase()+"."; }
function heftBuildHtml(cfg,opts){
  opts=opts||{}; const mask=!!opts.mask; const nm=n=>mask?heftMaskName(n):n;
  const cards=heftKader.map((k,i)=>{
    const foto=heftFotos[i];
    const initialen=(k.name||"?").trim().slice(0,1).toUpperCase();
    const spitz=heftFanfacts[k.id];
    const pos=k.lieblingsposition?cardPosLabel(k.lieblingsposition):(k.tw?"Torwart":"");
    return `<div class="heft-card">
      <div class="heft-foto">${foto?`<img src="${foto}" alt="">`:`<span>${esc(initialen)}</span>`}${k.nr!=null?`<div class="heft-nr">${esc(k.nr)}</div>`:""}</div>
      <div class="heft-name">${esc(nm(k.name))}${k.tw?" 🥅":""}</div>
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
      const k=heftKader[idx], foto=heftFotos[idx];
      const initialen=(k.name||"?").trim().slice(0,1).toUpperCase();
      fokusHtml=`<div class="heft-fokus">
        <div class="heft-fokus-foto">${foto?`<img src="${foto}" alt="">`:`<span>${esc(initialen)}</span>`}</div>
        <div class="heft-fokus-body">
          <div class="heft-fokus-badge">⭐ Spieler im Fokus</div>
          <div class="heft-fokus-name">${esc(nm(k.name))}${k.nr!=null?` · #${esc(k.nr)}`:""}</div>
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
      ${reps.map(x=>`<div style="margin-top:6px;font-size:12.5px"><b>${esc(x.frage)}</b><br>„${esc(x.antwort)}" – <i>${esc(nm(nameById[x.spieler_id]||"ein Adler"))}</i></div>`).join("")}
    </div>`;
  }
  return `<div class="heft-wrap">
    <div class="heft-head">
      <img src="logo.png" alt="SV Adler Dellbrück">
      <div class="heft-club">SV ADLER DELLBRÜCK e.V.</div>
      <div class="heft-title">${esc(cfg.titel||"Adler Nest")}</div>
      <div style="font-size:11px;color:#64748b;font-weight:600;letter-spacing:.5px">Das Vereinsheft der jungen Adler 🪺</div>
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
  try{const r=await fetch(`${SB_URL}/rest/v1/kader?select=id,name,nr,foto_path,lieblingsposition,tw,aktiv&order=nr.asc.nullslast`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)heftKader=(await r.json()).filter(k=>k.aktiv!==false);}catch(e){}
  if(!heftKader.length){toast("Kein Kader gefunden","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?select=spieler_id,spitzname`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(f=>{if(f.spitzname)heftFanfacts[f.spieler_id]=f.spitzname;});}catch(e){}
  const heute=new Date().toISOString().slice(0,10);
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
  const fld="width:100%;padding:8px 10px;border:var(--border-s);border-radius:10px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box;resize:vertical";
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:900px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`
    ${mdlHead("heft-modal","📰","Adler-Nest-Editor","frei bearbeiten · Vorschau live · Texte werden gemerkt","#1e3a8a")}
    <button id="heft-ai-btn" onclick="heftAutoContent()" class="btn" style="width:100%;margin-bottom:4px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;min-height:44px;font-weight:800"><i class="ti ti-sparkles"></i> Auto-Entwurf aus den letzten Wochen (KI)</button>
    <div style="font-size:10.5px;color:var(--text2);margin:0 0 12px;text-align:center">Zieht Trainings, Ergebnisse & Geburtstage – kindgerecht formuliert, danach frei änderbar.</div>
    <div style="display:grid;grid-template-columns:1fr;gap:16px">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="font-size:11px;font-weight:700;color:var(--text2)">Titel
          <input id="heft-f-titel" type="text" value="${esc(heftCfg.titel||"")}" style="${fld};min-height:40px;font-size:14px"></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">Einleitung / Grußwort
          <textarea id="heft-f-einl" rows="3" style="${fld}">${esc(heftCfg.einleitung||"")}</textarea></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">⭐ Spieler im Fokus
          <select id="heft-f-fokus" style="${fld};min-height:40px;font-size:14px">${kaderOpts}</select></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">Text zum Spieler im Fokus
          <textarea id="heft-f-fokustext" rows="2" style="${fld}">${esc(heftCfg.fokusText||"")}</textarea></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">📣 Trainer-Kommentar
          <textarea id="heft-f-komm" rows="3" style="${fld}">${esc(heftCfg.kommentar||"")}</textarea></label>
        <div id="heft-reporter-queue"></div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px">Vorschau</div>
        <div id="heft-preview" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;max-height:60vh;overflow:auto"></div>
      </div>
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;margin-top:12px;padding:9px 11px;background:var(--surface2);border:var(--border-s);border-radius:10px;cursor:pointer">
      <input type="checkbox" id="heft-f-mask" ${heftCfg.mask?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:0 0 auto">
      <span style="font-size:12px;color:var(--text)"><strong>🔒 Eltern-Version (Nachnamen maskiert)</strong><br><span style="font-size:11px;color:var(--text2)">DSGVO: Fürs Verteilen/Aushängen werden Nachnamen zu „Max M." gekürzt. Für die interne Trainer-Version aus lassen.</span></span>
    </label>
    <label style="display:flex;align-items:flex-start;gap:8px;margin-top:8px;padding:9px 11px;background:${heftCfg.published?"#dcfce7":"var(--surface2)"};border:var(--border-s);border-radius:10px;cursor:pointer">
      <input type="checkbox" id="heft-f-pub" ${heftCfg.published?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:0 0 auto">
      <span style="font-size:12px;color:var(--text)"><strong>👨‍👩‍👧 Für Eltern veröffentlichen (digital)</strong><br><span style="font-size:11px;color:var(--text2)">Sichtbar im Eltern-Bereich. Namen erscheinen dort <b>immer maskiert</b>; Fotos nur bei Einwilligung.${heftCfg.published&&heftCfg._pubAt?" · zuletzt "+new Date(heftCfg._pubAt).toLocaleString("de-DE"):""}</span></span>
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
  const fokusEl=document.getElementById("heft-f-fokus");if(fokusEl)fokusEl.onchange=()=>{heftCfg.fokusId=fokusEl.value;heftCfgSave();heftRenderPreview();};
  const maskEl=document.getElementById("heft-f-mask");if(maskEl)maskEl.onchange=()=>{heftCfg.mask=maskEl.checked;heftCfgSave();heftRenderPreview();};
  const pubEl=document.getElementById("heft-f-pub");if(pubEl)pubEl.onchange=()=>{heftCfg.published=pubEl.checked;};
  heftReporterQueueRender(); // I-C: offene Kabinen-Reporter-Antworten freigeben
  heftRenderPreview();
}
/* ── I-C: Freigabe-Queue der Kabinen-Reporter-Antworten. Nur Freigegebenes erscheint
   im Heft (Vorschau/Druck/Eltern-Ansicht). Löschen entfernt die Antwort endgültig. ── */
function heftReporterQueueRender(){
  const el=document.getElementById("heft-reporter-queue"); if(!el)return;
  const nameById={}; heftKader.forEach(k=>nameById[k.id]=k.name);
  const offen=(window._heftReporter||[]).filter(x=>!x.freigegeben);
  if(!offen.length){el.innerHTML="";return;}
  el.innerHTML=`<div style="font-size:11px;font-weight:700;color:var(--text2)">🎙️ Kabinen-Reporter – ${offen.length} Antwort${offen.length===1?"":"en"} warten auf Freigabe</div>
    ${offen.map(x=>`<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-left:3px solid #14b8a6;border-radius:10px;padding:8px 10px;margin-top:6px">
      <div style="flex:1;min-width:0;font-size:12px"><b>${esc(nameById[x.spieler_id]||"?")}</b> · ${esc(x.frage)}<br><span style="color:var(--text2)">„${esc(x.antwort)}"</span></div>
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
async function renderStadionheftView(){
  const root=document.createElement("div");
  root.style.cssText="max-width:460px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML=(typeof elternLoader==="function")?elternLoader("Adler Nest wird geladen …"):'<div style="text-align:center;padding:48px;color:#64748b">Lade Adler Nest…</div>';
  let d=null;
  try{
    const r=await fetch(`${SB_URL}/functions/v1/stadionheft-view`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({team:"adler1"})});
    d=r.ok?await r.json():null;
  }catch(e){}
  if(!d||!d.published){
    root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b"><img src="logo.png" style="width:56px;height:56px" alt=""><div style="margin-top:12px">Aktuell ist kein <b>Adler Nest</b> veröffentlicht.<br>Schau bald wieder rein! 🦅</div></div>';
    return;
  }
  const h=d.heft||{};
  const avatar=(sp,size)=>`<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#1a56db,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size*0.38)}px;font-weight:800">${sp.foto_url?`<img src="${sp.foto_url}" alt="" style="width:100%;height:100%;object-fit:cover">`:`<span>${esc((sp.name||"?").slice(0,1).toUpperCase())}</span>`}</div>`;
  const cards=(d.spieler||[]).map(sp=>{
    const pos=sp.lieblingsposition?(typeof cardPosLabel==="function"?cardPosLabel(sp.lieblingsposition):sp.lieblingsposition):(sp.tw?"Torwart":"");
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;text-align:center">
      <div style="width:64px;margin:0 auto 6px;position:relative">${avatar(sp,64)}${sp.nr!=null?`<div style="position:absolute;bottom:-2px;right:-2px;min-width:20px;height:20px;background:#facc15;color:#1e293b;border-radius:10px;border:2px solid #fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 3px">${esc(sp.nr)}</div>`:""}</div>
      <div style="font-size:14px;font-weight:800;color:#1e293b">${esc(sp.name)}${sp.tw?" 🥅":""}</div>
      ${sp.spitzname?`<div style="font-size:10.5px;color:#64748b;font-style:italic">„${esc(sp.spitzname)}"</div>`:""}
      ${pos?`<div style="font-size:10.5px;color:#1a56db;font-weight:700">${esc(pos)}</div>`:""}
    </div>`;
  }).join("");
  const fk=h.fokus;
  const fokusHtml=fk?`<div style="display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1px solid #fde047;border-radius:14px;padding:12px;margin-bottom:12px">
    <div style="flex:0 0 auto">${avatar(fk,66)}</div>
    <div><div style="font-size:10.5px;font-weight:800;color:#a16207;text-transform:uppercase;letter-spacing:.5px">⭐ Spieler im Fokus</div>
      <div style="font-size:16px;font-weight:900;color:#1e293b">${esc(fk.name)}${fk.nr!=null?" · #"+esc(fk.nr):""}</div>
      ${fk.text?`<div style="font-size:12px;color:#475569;margin-top:2px;line-height:1.4">${esc(fk.text).replace(/\n/g,"<br>")}</div>`:""}</div></div>`:"";
  const nestLbl=t=>`<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8;margin:16px 4px 8px">${t}</div>`;
  // I-C: Kabinen-Reporter-Rubrik (RPC reporter_public: nur Freigegebenes, Namen serverseitig maskiert)
  let repHtml="";
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/reporter_public`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:"{}"});
    if(r.ok){const reps=((await r.json())||[]).slice(0,6);
      if(reps.length)repHtml=nestLbl("🎙️ Kabinen-Reporter – die Kinder haben das Wort")
        +reps.map(x=>`<div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #14b8a6;border-radius:12px;padding:10px 13px;margin-bottom:8px;font-size:12.5px;color:#334155"><b>${esc(x.frage)}</b><br>„${esc(x.antwort)}" – <i>${esc(x.name)}</i></div>`).join("");}
  }catch(e){}
  root.innerHTML=`<div class="elt-fade">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:16px;padding:18px 16px;text-align:center;color:#fff;margin:4px 0 14px;box-shadow:0 2px 12px rgba(30,58,138,.28)">
      <img src="logo.png" style="width:56px;height:56px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.3))" alt="SV Adler Dellbrück">
      <div style="font-size:11px;font-weight:700;letter-spacing:.8px;opacity:.85;margin-top:4px">SV ADLER DELLBRÜCK e.V.</div>
      <div style="font-size:23px;font-weight:900;margin:2px 0">${esc(h.titel||"Adler Nest")}</div>
      <div style="font-size:11.5px;opacity:.85">Das Vereinsheft der jungen Adler 🪺</div>
    </div>
    ${h.einleitung?`<div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:12px;padding:12px 13px;font-size:13px;color:#334155;line-height:1.55;margin-bottom:12px">${esc(h.einleitung).replace(/\n/g,"<br>")}</div>`:""}
    ${fokusHtml}
    ${nestLbl("🦅 Unser Kader")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${cards}</div>
    ${repHtml}
    ${h.kommentar?`${nestLbl("📣 Vom Trainerteam")}<div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #16a34a;border-radius:12px;padding:12px 13px;font-size:12.5px;color:#334155;line-height:1.55">${esc(h.kommentar).replace(/\n/g,"<br>")}</div>`:""}
    <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:18px">Auf geht's, Adler! 🦅 · SV Adler Dellbrück e.V.</div></div>`;
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
  return `<button onclick="kachelOpen('${key}')" style="min-height:104px;border:none;border-radius:16px;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,${c1},${c2});color:#fff;padding:14px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;box-shadow:var(--shadow-md);text-align:left">
    <span style="font-size:30px">${emo}</span>
    <span style="min-width:0">
      <span style="display:block;font-size:15.5px;font-weight:900">${label}</span>
      <span id="kb-${key}" style="display:block;font-size:12px;min-height:15px"></span>
    </span>
  </button>`;
}
// Aktion aus einer Kachelseite: Seite schließen, Funktion aufrufen (ehrlicher Toast, falls fehlt)
/* PO v408: „wenn ich jetzt die kachel schliese komme ich direkt wieder auf die Startseite
   anstatt auf die kachel vorher eltern Welt zu kommen."
   kachelRun schloss das Menü IMMER, bevor die Aktion lief. Bei einem Tab-Wechsel (`go`) ist
   das richtig – man verlässt das Menü ja. Bei den 12 Einträgen, die nur ein Fenster öffnen,
   war es falsch: schließt man das Fenster, ist auch das Menü weg und man steht auf der
   Startseite.

   Jetzt bleibt das Menü stehen und das Fenster legt sich darüber. Zwei Sicherungen:
   - navigierende Aktionen schließen es sofort (kein Menü, das über einem Tab hängen bleibt)
   - ruft eine Aktion INTERN go() auf, merkt der Vergleich der aktiven Navi-Schaltfläche das
     und räumt nach – dafür braucht es keine gepflegte Namensliste. */
const KACHEL_NAVIGIERT=["go","openTab","kachelOpen","tmJump"];
function _kachelNavId(){ return (document.querySelector("#main-nav .nb.active")||{}).id||""; }
function kachelRun(fn,arg){
  const f=window[fn];
  if(typeof f!=="function"){toast("Da fehlt noch eine Verknüpfung ("+fn+") – bitte kurz melden","err");return;}
  if(typeof nutzungLog==="function")nutzungLog("aktion",fn+(arg!==undefined?":"+arg:""));
  const navVor=_kachelNavId(), navigiert=KACHEL_NAVIGIERT.includes(fn);
  if(navigiert)document.getElementById("kachel-modal")?.remove();
  arg===undefined?f():f(arg);
  if(!navigiert)setTimeout(()=>{ if(_kachelNavId()!==navVor)document.getElementById("kachel-modal")?.remove(); },0);
}
// Untermenü-Kacheln: 2 Spalten, groß und tippfreundlich; Farbkante oben = Familienfarbe
function kTiles(items,col){
  const t=items.filter(Boolean);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">`+t.map((x,i)=>{
    const voll=(t.length%2===1&&i===t.length-1);
    return `<button onclick="kachelRun('${x.fn}'${x.arg!==undefined?`,'${x.arg}'`:""})" style="${voll?"grid-column:1/-1;":""}min-height:88px;border:1px solid var(--rand-bedien);border-top:3px solid ${col};border-radius:14px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:12px 8px;text-align:center">
      <span style="font-size:30px">${x.emo}</span>
      <span style="font-size:14px;font-weight:800;line-height:1.25">${x.label}</span>
    </button>`;
  }).join("")+`</div>`;
}
function kSec(t){return `<div style="font-size:13.5px;font-weight:800;color:var(--text);margin:16px 0 8px">${t}</div>`;}
const KACHELN={
  training:{emo:"🏃",titel:"Training",sub:"Vom Plan bis zum Abpfiff",col:"var(--fam-training)"},
  spieltag:{emo:"⚽",titel:"Spieltag",sub:"Vorher, während, danach",col:"var(--fam-spieltag)"},
  team:{emo:"👥",titel:"Team",sub:"Spieler, Entwicklung, Überblick",col:"var(--fam-team)"},
  taktik:{emo:"🎯",titel:"Taktik",sub:"Brett, Zeichnen, Bibliothek",col:"var(--fam-taktik)"},
  elki:{emo:"🪶",titel:"Eltern & Kinder",sub:"Kommunikation und Adler-Welt",col:"var(--fam-elki)"},
  orga:{emo:"📅",titel:"Orga",sub:"Termine, Events, Verwaltung",col:"var(--fam-orga)"}
};
function kachelOpen(key){
  const k=KACHELN[key]; if(!k)return;
  if(typeof nutzungLog==="function")nutzungLog("kachel",key);
  document.getElementById("kachel-modal")?.remove();
  const m=document.createElement("div");m.id="kachel-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label",k.titel);
  /* Das Kachel-Menü ist die UNTERSTE Ebene des Fensterstapels: seit v408 bleibt es offen,
     während eine Aktion ihr Fenster darüber legt. Auf 10002 hätte es 18 dieser Fenster
     verdeckt (die meisten liegen auf 9999–10002). 9500 liegt über der Seite und unter
     jedem Dialog – dadurch braucht keiner von ihnen einen Sonderwert. */
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9500;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("kachel-modal",k.emo,k.titel,k.sub,k.col)}
    <div id="kachel-body">${_kachelInhalt(key)}</div>
  </div>`;
  document.body.appendChild(m);
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
  if(key==="spieltag")return kSec("Rund ums Spiel")
    +kTiles([
      {emo:"🎽",label:"Match",fn:"go",arg:"spieltag"},
      {emo:"🧩",label:"Aufstellung",fn:"go",arg:"kombi"},
      {emo:"✅",label:"Anwesenheit",fn:"go",arg:"anwesenheit"},
      {emo:"📊",label:"Analyse",fn:"go",arg:"analyse"}
    ],col)
    +`<div id="kachel-turnier"></div>`;
  if(key==="team"){
    const names=Object.keys(DB||{});
    const bewertet=names.filter(n=>DB[n]&&DB[n].length).length;
    const cutoff=new Date(Date.now()-42*86400000).toISOString().slice(0,10);
    const stale=KADER.filter(x=>{const s=DB[x.name];if(!s||!s.length)return true;return (s[s.length-1].datum||"0000")<cutoff;}).length;
    const tile=(v,l,c,arg)=>`<button onclick="kachelRun('go','${arg}')" style="flex:1;min-width:90px;min-height:72px;border:1px solid var(--rand-bedien);border-radius:14px;background:var(--surface);padding:10px;text-align:center;cursor:pointer;font-family:inherit"><div style="font-size:24px;font-weight:900;color:${c}">${v}</div><div style="font-size:12px;color:var(--text2);font-weight:700">${l}</div></button>`;
    return `<div style="display:flex;gap:10px;margin-bottom:4px">${tile(KADER.length,"Kader","var(--blue)","kader")}${tile(bewertet+"/"+KADER.length,"bewertet","var(--green)","bew")}${tile(stale,"überfällig","var(--red)","bew")}</div>
      <div id="home-antifrust"></div><div id="home-birthday"></div><div id="home-radar"></div>`
      +kSec("Spieler")
      +kTiles([
        {emo:"👥",label:"Kader",fn:"go",arg:"kader"},
        {emo:"📝",label:"Bewerten",fn:"go",arg:"bew"},
        {emo:"🌟",label:"Profil",fn:"go",arg:"profil"},
        {emo:"📈",label:"Entwicklung",fn:"go",arg:"verlauf"},
        {emo:"⏸️",label:"Pausen-Status",fn:"pausenOpen"}
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
  if(key==="taktik")return kSec("Am Brett")
    +kTiles([
      {emo:"🎯",label:"Taktikboard",fn:"go",arg:"taktik"},
      {emo:"📚",label:"Übungen",fn:"go",arg:"formen"}
    ],col);
  if(key==="elki")return kSec("Kommunikation")
    +kTiles([
      {emo:"📣",label:"Team-Ansage",fn:"ansageTrainerOpen"},
      {emo:"🗣️",label:"Elterngespräch",fn:"epollTrainerOpen"},
      {emo:"🔗",label:"Eltern einladen",fn:"elternInvitePaket"},
      {emo:"🖨️",label:"QR-Aushang",fn:"qrAushangOpen"}
    ],col)
    +kSec("Adler-Welt (Kinder)")
    +kTiles([
      {emo:"🪶",label:"Adler-Welt",fn:"adlerWeltOpen"},
      {emo:"🧠",label:"Quiz-Ergebnisse",fn:"go",arg:"quizresults"},
      {emo:"🗳️",label:"Kabinen-Wahl",fn:"wahlTrainerOpen"},
      {emo:"🖼️",label:"Karten-Fotos",fn:"albumFotosOpen"},
      {emo:"🎯",label:"Team-Quests",fn:"questEditorOpen"},
      {emo:"🏅",label:"Urkunden-Studio",fn:"urkundenOpen"}
    ],col)
    +kSec("Inhalte")
    +kTiles([
      {emo:"📰",label:"Adler Nest",fn:"stadionheftOpen"},
      {emo:"🏆",label:"Adler Wrapped",fn:"adlerWrappedTeaser"}
    ],col)
    +`<div id="home-milestone" style="margin-top:8px"></div>`;
  if(key==="orga")return `<div id="home-rsvp"></div><div id="home-ferien"></div>`
    +kSec("Termine")
    +kTiles([
      {emo:"📅",label:"Termine",fn:"go",arg:"termine"},
      // Team-Sicht auf die Verfügbarkeit – NEBEN „Bist du dabei?" (Ich-Sicht), nicht statt.
      {emo:"🧑‍🏫",label:"Trainerplan",fn:"trainerPlanOpen"},
      {emo:"📌",label:"Pinnwand",fn:"go",arg:"team"} // war nur über die Reiterzeile erreichbar
    ],col)
    +kSec("Events & Team-Orga")
    +kTiles([
      {emo:"🎉",label:"Mitbringliste",fn:"mitbringTrainerOpen"},
      {emo:"🗓️",label:"Trainer-Meeting",fn:"trainerMeetingOpen"},
      {emo:"💰",label:"Teamkasse",fn:"kasseOpen"},
      {emo:"👕",label:"Ausrüstung",fn:"ausruestungGrid"},
      {emo:"🧦",label:"Fundbüro",fn:"fundbueroOpen"},
      // Juni–September – und nur solange die Saison nicht abgehakt ist. Zur nächsten
      // Saison wechselt der Schlüssel, dann steht er von selbst wieder da.
      (new Date().getMonth()>=5&&new Date().getMonth()<=8&&!saisonStartZu())?{emo:"🌅",label:"Saisonstart-Check",fn:"saisonStartOpen"}:null,
      {emo:"🧰",label:"Setup-Übersicht",fn:"setupTrainerOpen"}
    ],col)
    +kSec("Einstellungen")
    +`<div id="push-slot-trainer" style="margin-bottom:10px"></div>`
    +kTiles([
      {emo:"🔑",label:"Passwort ändern",fn:"pwChangeOpen"},
      {emo:"📊",label:"Nutzung",fn:"nutzungOpen"}
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
    if(key==="spieltag")_kachelTurnierCheck();
  }catch(e){}
}
/* PO-Entscheid: Die Turnier-Gruppe erscheint unter Spieltag NUR, wenn etwas ansteht – sonst
   bleibt die Seite schlank. v490: „ansteht" heisst jetzt auch ein Heimspiel; geplant wird es
   wie ein kleines Festival (ein Gegner, evtl. mehrere Teams auf beiden Seiten). */
async function _kachelTurnierCheck(){
  const slot=document.getElementById("kachel-turnier"); if(!slot)return;
  const heute=new Date().toISOString().slice(0,10);
  let terminHeim=null, terminTurnier=null, heimAngelegt=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&datum=gte.${heute}&select=id,typ,heim&order=datum.asc&limit=20`,{headers:sbAuthHeaders()});
    if(r.ok){const rows=(await r.json())||[]; terminHeim=rows.find(t=>t.heim===true)||null; terminTurnier=rows.find(t=>t.typ==="turnier")||null;}}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?select=id&limit=1`,{headers:sbAuthHeaders()});if(r.ok)heimAngelegt=((await r.json())||[]).length>0;}catch(e){}
  if(!terminHeim&&!terminTurnier&&!heimAngelegt)return;
  if(!document.getElementById("kachel-turnier"))return; // Seite schon gewechselt
  const heimspiel=terminHeim&&terminHeim.typ==="spiel";
  slot.innerHTML=kSec(terminHeim?"🏟️ Spieltag bei uns":"🏆 Turnier steht an")
    +kTiles([
      (terminHeim||heimAngelegt)?{emo:"🏟️",label:heimspiel?"Heimspiel planen":"Festival ausrichten",fn:"htOpen"}:null,
      {emo:"📋",label:"Turnierplan (auswärts)",fn:"go",arg:"spieltag"}
    ],(KACHELN.spieltag||{}).col||"var(--fam-spieltag)");
}
