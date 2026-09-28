/* ═════════════════════════════════════════════════════════════════════════════
   v650 – TRAININGSBLOCK: EIN ZIEL ÜBER DREI WOCHEN, DREI EINHEITEN IM WECHSEL

   PO: „Wir würden gerne als Trainer ein Trainingsziel über die nächsten drei Wochen
   festlegen und darunter dann drei bis vier fertige Trainingseinheiten mit diesem Fokus
   bereit haben, sodass wir Übungen auch repetitiv immer wieder einsetzen … mit acht,
   zehn, zwölf oder vierzehn Spielern.“ Kacheln: Ziel = Leitfrage + eigener Satz;
   genau drei Einheiten A, B, C im Wechsel A-B-C-A-B-C.

   Gebaut wird nur die Klammer – der Inhalt ist schon da: die Vorlagen der Leitfragen
   (L1-1 … L6-5) tragen ihre Blöcke und je Kinderzahl einen Aufbau (skalierung).

   · Gespeichert wird der Block (Tabelle trainingsblock), nicht die Zuordnung zu den
     Terminen. Die rechnet blockZuordnung aus den Trainings im Zeitraum: fällt ein Termin
     weg oder kommt einer dazu, rückt der Wechsel nach, statt dass eine Einheit ausfällt.
   · Welcher Aufbau heute gilt, entscheidet dieselbe Liste wie die Gruppen (_tgPool):
     Anwesenheit, sonst Zusagen, sonst Kader ohne Absagen. Genommen wird der größte
     Aufbau, der nicht mehr Kinder braucht als da sind; der Rest steht als Hinweis dabei.
   · Übernommen wird über denselben Weg wie „Vorlage übernehmen“ (vorlageUebernehmenSetzen)
     – eine Maschine, keine zweite.
   ═════════════════════════════════════════════════════════════════════════════ */
let TB_BLOECKE=[], _tbGeladen=false, _tbEdit=null, _tbTrainingsCache={};
const TB_BUCHSTABEN=["A","B","C"];
const TB_WOCHEN=[2,3,4];

function _tbIso(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function _tbHeute(){ return _tbIso(new Date()); }
function _tbPlusTage(iso,n){ const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return _tbIso(d); }
/* Nächster Montag, heute eingeschlossen – dort beginnt eine Trainingswoche. */
function _tbNaechsterMontag(){ const d=new Date(); const w=d.getDay(); d.setDate(d.getDate()+((8-w)%7)); return _tbIso(d); }
function _tbDatumKurz(iso){ const d=new Date(String(iso).slice(0,10)+"T12:00:00"); return d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"}); }
/* „L1-2 Ball behalten – König auf dem Feld“ → Kürzel „L1-2“ fürs Sortieren der Leitfragen */
function _tbKuerzel(name){ const m=String(name||"").match(/^L(\d+)-(\d+)/); return m?[Number(m[1]),Number(m[2])]:[99,99]; }

async function blockLaden(){
  if(typeof sbToken==="function"&&!sbToken())return TB_BLOECKE;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsblock?select=*&order=von.desc,id.desc`,{headers:sbAuthHeaders()});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return TB_BLOECKE;
    if(r.ok){ TB_BLOECKE=(await r.json())||[]; _tbGeladen=true; _tbTrainingsCache={}; }
  }catch(e){}
  return TB_BLOECKE;
}
/* Der Block, der an einem Datum gilt. Überschneiden sich zwei, gilt der später begonnene. */
function blockFuerDatum(datum){
  const d=String(datum||"").slice(0,10); if(!d)return null;
  return (TB_BLOECKE||[]).filter(b=>String(b.von)<=d&&d<=String(b.bis))
    .sort((a,b)=>String(b.von).localeCompare(String(a.von))||(Number(b.id)||0)-(Number(a.id)||0))[0]||null;
}
async function _tbTrainings(von,bis){
  const k=von+"|"+bis;
  if(_tbTrainingsCache[k])return _tbTrainingsCache[k];
  let z=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?typ=eq.training&datum=gte.${encodeURIComponent(von)}&datum=lte.${encodeURIComponent(bis)}&select=id,datum,uhrzeit&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});
    if(r.ok)z=(await r.json())||[];
  }catch(e){}
  _tbTrainingsCache[k]=z;
  return z;
}
/* A-B-C-A-B-C über die Trainings des Zeitraums, in zeitlicher Reihenfolge. */
function blockZuordnung(trainings,block){
  const v=Array.isArray(block&&block.vorlagen)?block.vorlagen:[];
  if(v.length!==3)return [];
  return (trainings||[]).map((t,i)=>({datum:String(t.datum).slice(0,10),termin_id:t.id,nr:i+1,buchstabe:TB_BUCHSTABEN[i%3],vorlage:v[i%3]}));
}
/* Welcher Aufbau passt zu n Kindern? Der größte, der nicht mehr Kinder braucht als da sind.
   Sind es weniger als im kleinsten Aufbau, gilt der kleinste – mit Hinweis. */
function blockAufbauWahl(sk,n){
  const sch=(typeof _evSkalierungSchluessel==="function")?_evSkalierungSchluessel(sk)
    :Object.keys(sk||{}).filter(k=>/^\d+$/.test(k)&&String(sk[k]||"").trim()).sort((a,b)=>a-b);
  const keys=sch.map(Number);
  if(!keys.length)return null;
  n=Math.max(0,Math.round(Number(n)||0));
  const passend=keys.filter(k=>k<=n);
  const key=passend.length?passend[passend.length-1]:keys[0];
  return {key, text:String(sk[String(key)]), rest:n-key, alle:keys};
}
function blockRestText(a){
  if(!a||!a.rest)return "";
  if(a.rest>0)return `+${a.rest} Kind${a.rest===1?"":"er"} mehr: ${a.rest===1?"als Joker in der Überzahl-Mannschaft":"als Joker oder in die kleinste Gruppe"}.`;
  return `${-a.rest} Kind${a.rest===-1?"":"er"} weniger als im kleinsten Aufbau: Gruppen um je ein Kind verkleinern.`;
}
function _tbVorlage(name){
  const n=String(name||"").trim().toLowerCase();
  return (typeof VORLAGEN!=="undefined"?VORLAGEN:[]).find(v=>String(v.name||"").trim().toLowerCase()===n)||null;
}
async function _tbVorlagenSicher(){
  if(typeof VORLAGEN!=="undefined"&&VORLAGEN.length)return VORLAGEN;
  if(typeof vorlagenLaden==="function")await vorlagenLaden();
  return typeof VORLAGEN!=="undefined"?VORLAGEN:[];
}

/* ── Banner oben im Trainings-Tab ─────────────────────────────────────────────
   Läuft ein Block, steht er dort, wo sonst der Monats-Schwerpunkt steht – das Monatsband
   tritt so lange zurück. Ohne Block bleibt der Themenplan und darunter der Weg zum Block. */
async function blockBannerRender(){
  const el=document.getElementById("block-banner"); if(!el)return false;
  if(!_tbGeladen)await blockLaden();
  const heute=_tbHeute();
  const b=blockFuerDatum(heute)||(TB_BLOECKE||[]).filter(x=>String(x.von)>heute).sort((a,c)=>String(a.von).localeCompare(String(c.von)))[0]||null;
  const period=document.getElementById("period-banner");
  if(!b){
    if(period)period.style.display="";
    el.innerHTML=`<button class="btn btn-sm" style="width:100%;margin-bottom:10px" onclick="blockEditorOpen()">🧱 Trainingsblock anlegen – ein Ziel, drei Einheiten im Wechsel</button>`;
    return false;
  }
  if(period)period.style.display="none";
  const laeuft=String(b.von)<=heute;
  const tr=await _tbTrainings(String(b.von),String(b.bis));
  const zu=blockZuordnung(tr,b);
  const naechste=zu.find(z=>z.datum>=heute);
  el.innerHTML=`<div style="background:var(--blue-bg);border:var(--border-s);border-radius:var(--rl);padding:12px;margin-bottom:1rem;font-size:var(--s-text);line-height:1.5;color:var(--text)">
    <div style="display:flex;align-items:flex-start;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">🧱 Trainingsblock ${laeuft?"bis":"ab"} ${esc(_tbDatumKurz(laeuft?b.bis:b.von))}</div>
        <div style="font-weight:800;margin-top:2px">🎯 ${esc(b.leitfrage)}</div>
        ${b.ziel?`<div style="color:var(--text2)">${esc(b.ziel)}</div>`:""}
      </div>
      <button class="btn btn-sm" onclick="blockEditorOpen()" aria-label="Trainingsblock bearbeiten">Block</button>
    </div>
    <div style="margin-top:8px;display:grid;gap:4px">${(b.vorlagen||[]).map((n,i)=>`<div style="display:flex;gap:8px;align-items:baseline"><b style="min-width:1.2em">${TB_BUCHSTABEN[i]}</b><span>${esc(n)}</span></div>`).join("")}</div>
    ${naechste?`<div style="margin-top:8px;font-size:var(--s-klein);color:var(--text2)">Nächstes Training ${esc(_tbDatumKurz(naechste.datum))}: Einheit <b>${naechste.buchstabe}</b> · ${zu.length} Trainings im Block</div>`:""}
  </div>`;
  return true;
}

/* ── Karte im Trainingsplan ───────────────────────────────────────────────────── */
async function blockPlanKarte(datum){
  const el=document.getElementById("tp-block"); if(!el)return;
  datum=String(datum||document.getElementById("tp-date")?.value||"").slice(0,10);
  if(!_tbGeladen)await blockLaden();
  const b=blockFuerDatum(datum);
  if(!b){
    /* Kein Block für diesen Termin: nur dann ein schmaler Weg dorthin, wenn auch keiner
       mehr ansteht – sonst stünde der Knopf unter jedem Spiel und jedem Nachholtermin. */
    const kommt=(TB_BLOECKE||[]).some(x=>String(x.bis)>=_tbHeute());
    el.innerHTML=kommt?"":`<button class="btn btn-sm" style="width:100%;margin:4px 0 8px" onclick="blockEditorOpen()">🧱 Trainingsblock anlegen – ein Ziel, drei Einheiten im Wechsel</button>`;
    return;
  }
  const zu=blockZuordnung(await _tbTrainings(String(b.von),String(b.bis)),b);
  const z=zu.find(x=>x.datum===datum);
  if(!z){ el.innerHTML=""; return; }             // kein Training (Spiel, Turnier): der Block schweigt
  await _tbVorlagenSicher();
  const v=_tbVorlage(z.vorlage);
  if((document.getElementById("tp-date")?.value||datum)!==datum)return;   // inzwischen anderer Termin gewählt
  const pool=(typeof _tgPool==="function")?_tgPool():null;
  const n=pool&&Array.isArray(pool.namen)?pool.namen.length:0;
  const quelle=pool?({anwesenheit:"Anwesenheit",zusagen:"Zusagen",kader:"Kader ohne Absagen"}[pool.quelle]||""):"";
  const sk=(v&&v.skalierung&&typeof v.skalierung==="object")?v.skalierung:{};
  const a=blockAufbauWahl(sk,n);
  const andere=a?a.alle.filter(k=>k!==a.key):[];
  el.innerHTML=`<div id="tp-block-karte" style="border:var(--border-s);border-radius:var(--rl);padding:12px;margin:6px 0 10px;background:var(--surface);line-height:1.5">
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">🧱 Block: ${esc(b.leitfrage)}</div>
    <div style="font-size:var(--s-karte);font-weight:800;margin-top:2px">Einheit ${z.buchstabe} · ${esc(z.vorlage)}</div>
    <div style="font-size:var(--s-klein);color:var(--text2)">${z.nr}. von ${zu.length} Trainings im Block${b.ziel?` · ${esc(b.ziel)}`:""}</div>
    ${!v?`<div style="margin-top:8px;font-size:var(--s-text);color:var(--red)">Diese Vorlage gibt es in der App nicht mehr. Im Block eine andere wählen.</div>`
    :`<div style="margin-top:8px;font-size:var(--s-text)">👥 <b>${n} Kinder</b>${quelle?` <span style="color:var(--text2)">(${quelle})</span>`:""}${a?` → <b>Aufbau für ${a.key}</b>`:""}</div>
      ${a?`<div id="tp-block-aufbau" style="font-size:var(--s-text);margin-top:2px">${esc(a.text)}</div>`:`<div style="font-size:var(--s-text);color:var(--text2);margin-top:2px">Für diese Einheit ist kein Aufbau nach Kinderzahl hinterlegt.</div>`}
      ${a&&a.rest?`<div id="tp-block-rest" style="font-size:var(--s-klein);color:var(--text2);margin-top:2px">${esc(blockRestText(a))}</div>`:""}
      ${andere.length?`<details style="margin-top:6px"><summary style="font-size:var(--s-klein);color:var(--text2);cursor:pointer;min-height:32px">Andere Kinderzahlen (${andere.join(" / ")})</summary>
        ${andere.map(k=>`<div style="font-size:var(--s-klein);margin-top:4px"><b>${k} Kinder:</b> ${esc(String(sk[String(k)]))}</div>`).join("")}</details>`:""}
      <button class="btn" id="tp-block-los" style="width:100%;margin-top:10px" onclick="blockEinheitUebernehmen('${esc(datum)}')">Einheit ${z.buchstabe} in den Plan übernehmen</button>`}
  </div>`;
}
async function blockEinheitUebernehmen(datum){
  const b=blockFuerDatum(datum); if(!b)return;
  const z=blockZuordnung(await _tbTrainings(String(b.von),String(b.bis)),b).find(x=>x.datum===datum); if(!z)return;
  await _tbVorlagenSicher();
  const v=_tbVorlage(z.vorlage);
  if(!v){ toast(`Die Vorlage „${z.vorlage}“ gibt es nicht mehr`,"err"); return; }
  if(typeof vorlageUebernehmenSetzen!=="function"){ toast("Die Vorlagen sind noch nicht geladen – gleich nochmal","err"); return; }
  if(typeof _vuPlanVorhanden==="function"&&await _vuPlanVorhanden(datum)
     &&!confirm(`Für ${_tbDatumKurz(datum)} steht schon ein Plan. Durch Einheit ${z.buchstabe} ersetzen?`))return;
  const knopf=document.getElementById("tp-block-los"); if(knopf)knopf.disabled=true;
  _vuAuswahl=v.id;
  try{ await vorlageUebernehmenSetzen(); }
  finally{ _vuAuswahl=null; if(knopf)knopf.disabled=false; }
  blockPlanKarte(datum);
}

/* ── Block anlegen ────────────────────────────────────────────────────────────── */
function blockEditorClose(){ document.getElementById("tb-modal")?.remove(); _tbEdit=null; }
async function blockEditorOpen(){
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst als Trainer anmelden","err"); return; }
  document.getElementById("tb-modal")?.remove();
  _tbEdit={leitfrage:"",ziel:"",von:_tbNaechsterMontag(),wochen:3,wahl:[]};
  const m=document.createElement("div");
  m.id="tb-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Trainingsblock");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)blockEditorClose(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:560px;width:100%;margin:auto">
    ${mdlHead("tb-modal","🧱","Trainingsblock","Ein Ziel über mehrere Wochen · drei Einheiten im Wechsel A-B-C","#1d4ed8")}
    <div id="tb-inhalt"><div style="font-size:var(--s-text);color:var(--text2);padding:8px 0">Lade Vorlagen …</div></div>
  </div>`;
  document.body.appendChild(m);
  await Promise.all([_tbVorlagenSicher(),blockLaden()]);
  blockEditorRender();
}
function _tbLeitfragen(){
  const alle=typeof VORLAGEN!=="undefined"?VORLAGEN:[];
  const m=new Map();
  alle.forEach(v=>{ const f=String(v.leitfrage||""); if(!f)return; const k=_tbKuerzel(v.name)[0]; if(!m.has(f)||k<m.get(f))m.set(f,k); });
  return [...m.entries()].sort((a,b)=>a[1]-b[1]).map(e=>e[0]);
}
function _tbFolge(leitfrage){
  return (typeof VORLAGEN!=="undefined"?VORLAGEN:[]).filter(v=>String(v.leitfrage||"")===leitfrage)
    .sort((a,b)=>(Number(a.folge_nr)||0)-(Number(b.folge_nr)||0)||String(a.name).localeCompare(String(b.name)));
}
/* Reihenfolge A, B, C = Reihenfolge in der Folge der Leitfrage – nicht die Klick-Reihenfolge.
   Die Folge baut aufeinander auf; wer L1-3 vor L1-1 anklickt, meint nicht „erst L1-3“. */
function _tbWahlGeordnet(){
  const folge=_tbFolge(_tbEdit.leitfrage).map(v=>v.name);
  return _tbEdit.wahl.slice().sort((a,b)=>folge.indexOf(a)-folge.indexOf(b));
}
function blockLeitfrageSetzen(i){ const f=_tbLeitfragen()[i]; if(!f)return; if(_tbEdit.leitfrage!==f){_tbEdit.leitfrage=f;_tbEdit.wahl=[];} blockEditorRender(); }
function blockWochenSetzen(w){ _tbEdit.wochen=w; blockEditorRender(); }
function blockVonSetzen(v){ if(/^\d{4}-\d{2}-\d{2}$/.test(v)){ _tbEdit.von=v; blockEditorRender(); } }
function blockZielSetzen(t){ _tbEdit.ziel=String(t||"").slice(0,140); }
function blockVorlageUmschalten(i){
  const v=_tbFolge(_tbEdit.leitfrage)[i]; if(!v)return;
  const w=_tbEdit.wahl, pos=w.indexOf(v.name);
  if(pos>=0)w.splice(pos,1);
  else if(w.length>=3){ toast("Genau drei Einheiten – erst eine abwählen"); return; }
  else w.push(v.name);
  blockEditorRender();
}
function _tbBis(){ return _tbPlusTage(_tbEdit.von,_tbEdit.wochen*7-1); }
async function blockEditorRender(){
  const box=document.getElementById("tb-inhalt"); if(!box||!_tbEdit)return;
  const fragen=_tbLeitfragen();
  if(!fragen.length){ box.innerHTML=`<div style="font-size:var(--s-text);color:var(--text2);line-height:1.6">Noch keine Vorlagen in der App. Sie kommen beim Öffnen aus <b>uebungen/vorlagen.json</b>.</div>`; return; }
  const chip=(an,txt,onclick,label)=>`<button type="button" class="btn btn-sm" aria-pressed="${an}" onclick="${onclick}" ${label?`aria-label="${esc(label)}"`:""} style="${an?"background:var(--text);color:var(--surface);":""}text-align:left">${txt}</button>`;
  const folge=_tbEdit.leitfrage?_tbFolge(_tbEdit.leitfrage):[];
  const geordnet=_tbWahlGeordnet();
  const bis=_tbBis();
  const ueber=(TB_BLOECKE||[]).filter(b=>String(b.von)<=bis&&_tbEdit.von<=String(b.bis));
  box.innerHTML=`
    <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:4px 0">1 · Ziel: welche Leitfrage?</div>
    <div style="display:grid;gap:6px">${fragen.map((f,i)=>chip(_tbEdit.leitfrage===f,esc(f),`blockLeitfrageSetzen(${i})`)).join("")}</div>
    <label for="tb-ziel" style="display:block;font-size:var(--s-klein);color:var(--text2);margin-top:10px">Eigener Zielsatz (optional)</label>
    <input id="tb-ziel" type="text" maxlength="140" value="${esc(_tbEdit.ziel)}" oninput="blockZielSetzen(this.value)" placeholder="z. B. Jedes Kind traut sich ins 1 gegen 1"
      style="width:100%;box-sizing:border-box;min-height:44px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font:inherit;background:var(--surface2);color:var(--text)">
    <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:14px 0 4px">2 · Zeitraum</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <label for="tb-von" style="font-size:var(--s-klein);color:var(--text2)">ab</label>
      <input id="tb-von" type="date" value="${esc(_tbEdit.von)}" onchange="blockVonSetzen(this.value)" style="min-height:44px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font:inherit;background:var(--surface2);color:var(--text)">
      ${TB_WOCHEN.map(w=>chip(_tbEdit.wochen===w,`${w} Wochen`,`blockWochenSetzen(${w})`)).join("")}
    </div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">bis ${esc(_tbDatumKurz(bis))}${ueber.length?` · überschneidet sich mit „${esc(ueber[0].leitfrage)}“ – im Zeitraum gilt der später begonnene Block`:""}</div>
    <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:14px 0 4px">3 · Genau drei Einheiten (${geordnet.length}/3)</div>
    ${_tbEdit.leitfrage?`<div style="display:grid;gap:6px">${folge.map((v,i)=>{ const p=geordnet.indexOf(v.name);
        return chip(p>=0,`${p>=0?`<b>${TB_BUCHSTABEN[p]}</b> · `:""}${esc(v.name)}${(typeof _evSkalierungSchluessel==="function"&&_evSkalierungSchluessel(v.skalierung).length)?` <span style="color:inherit;opacity:.75">(${_evSkalierungSchluessel(v.skalierung).join("/")} Kinder)</span>`:""}`,`blockVorlageUmschalten(${i})`); }).join("")}</div>`
      :`<div style="font-size:var(--s-text);color:var(--text3)">Erst oben eine Leitfrage wählen.</div>`}
    <div id="tb-vorschau" style="margin-top:12px"></div>
    <button class="btn" id="tb-speichern" style="width:100%;margin-top:12px" ${(_tbEdit.leitfrage&&geordnet.length===3)?"":"disabled"} onclick="blockSpeichern()">Block erfassen</button>
    ${(TB_BLOECKE||[]).length?`<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:18px 0 4px">Erfasste Blöcke</div>
      ${TB_BLOECKE.map(b=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--surface2)">
        <div style="flex:1;min-width:0;font-size:var(--s-klein)"><b>${esc(_tbDatumKurz(b.von))} – ${esc(_tbDatumKurz(b.bis))}</b> · ${esc(b.leitfrage)}</div>
        <button class="btn btn-sm" onclick="blockLoeschen(${Number(b.id)})" aria-label="Block ab ${esc(_tbDatumKurz(b.von))} löschen">Löschen</button></div>`).join("")}`:""}`;
  if(_tbEdit.leitfrage&&geordnet.length===3){
    const tr=await _tbTrainings(_tbEdit.von,bis);
    const zu=blockZuordnung(tr,{vorlagen:geordnet});
    const el=document.getElementById("tb-vorschau"); if(!el)return;
    el.innerHTML=zu.length
      ?`<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-bottom:4px">So verteilt sich der Block (${zu.length} Trainings)</div>
        ${zu.map(z=>`<div style="font-size:var(--s-klein);padding:2px 0"><b>${esc(_tbDatumKurz(z.datum))}</b> · Einheit ${z.buchstabe}</div>`).join("")}`
      :`<div style="font-size:var(--s-klein);color:var(--text2)">Im Zeitraum steht noch kein Training im Kalender. Der Block gilt trotzdem; die Einheiten verteilen sich, sobald Trainings eingetragen sind.</div>`;
  }
}
async function blockSpeichern(){
  if(!_tbEdit)return;
  const vorlagen=_tbWahlGeordnet();
  if(!_tbEdit.leitfrage||vorlagen.length!==3){ toast("Leitfrage und genau drei Einheiten wählen","err"); return; }
  const knopf=document.getElementById("tb-speichern"); if(knopf)knopf.disabled=true;
  const zeile={leitfrage:_tbEdit.leitfrage,ziel:String(_tbEdit.ziel||"").trim(),von:_tbEdit.von,bis:_tbBis(),vorlagen};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsblock`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(zeile)});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){ toast(`Block nicht erfasst – Server antwortet ${r.status}`,"err"); if(knopf)knopf.disabled=false; return; }
  }catch(e){ toast("Kein Netz – Block nicht erfasst","err"); if(knopf)knopf.disabled=false; return; }
  toast("🧱 Block erfasst ✓");
  blockEditorClose();
  await blockLaden();
  blockBannerRender();
  const d=document.getElementById("tp-date")?.value; if(d)blockPlanKarte(d);
}
async function blockLoeschen(id){
  const b=(TB_BLOECKE||[]).find(x=>Number(x.id)===Number(id)); if(!b)return;
  if(!confirm(`Block „${b.leitfrage}“ (${_tbDatumKurz(b.von)} – ${_tbDatumKurz(b.bis)}) löschen? Bereits übernommene Pläne bleiben stehen.`))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsblock?id=eq.${Number(id)}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok){ toast(`Nicht gelöscht – Server antwortet ${r.status}`,"err"); return; }
  }catch(e){ toast("Kein Netz – nicht gelöscht","err"); return; }
  toast("Block gelöscht");
  await blockLaden();
  blockEditorRender(); blockBannerRender();
  const d=document.getElementById("tp-date")?.value; if(d)blockPlanKarte(d);
}
/* Welle 2 kommt nach dem ersten Bild: war der Trainings-Tab schon offen, jetzt nachziehen. */
if(window._periodLoaded)blockBannerRender();
function blockModulDa(){ return true; }
