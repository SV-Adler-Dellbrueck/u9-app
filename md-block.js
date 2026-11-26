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
    /* v682: angelegt wird ein Block im Trainingsplan (blockPlanKarte) – dort, wo die Einheiten
       entstehen. Unter Übungen stand derselbe Knopf ein zweites Mal über der Suche. */
    el.innerHTML="";
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
        <div style="font-size:var(--s-text);font-weight:800;color:var(--text)">🧱 Trainingsblock ${laeuft?"bis":"ab"} ${esc(_tbDatumKurz(laeuft?b.bis:b.von))}</div>
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
    /* v690: Der Knopf stand in voller Breite über „Vorlage übernehmen“ und „Auto-Plan“ und sah wie ein
       dritter, gleichrangiger Weg zum heutigen Inhalt aus – er plant aber zwei bis vier Wochen. Jetzt
       ein leiser Link unter den beiden Hauptwegen. */
    el.innerHTML="";
    const neu=document.getElementById("tp-block-neu");
    /* v952: Der Link steht schon in der Startkarte (tps-block) – hier nicht ein zweites Mal. */
    if(neu)neu.innerHTML=kommt||document.getElementById("tps-block")?"":`<button class="btn btn-link" type="button" id="tp-block-link" onclick="blockEditorOpen()" style="min-height:44px;font-size:var(--s-text);text-align:left">🧱 Über mehrere Wochen planen: Trainingsblock anlegen</button>`;
    return;
  }
  { const neu=document.getElementById("tp-block-neu"); if(neu)neu.innerHTML=""; }
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
    <div style="font-size:var(--s-text);font-weight:800;color:var(--text)">🧱 Block: ${esc(b.leitfrage)}</div>
    <div style="font-size:var(--s-karte);font-weight:800;margin-top:2px">Einheit ${z.buchstabe} · ${esc(z.vorlage)}</div>
    <div style="font-size:var(--s-klein);color:var(--text2)">${z.nr}. von ${zu.length} Trainings im Block${b.ziel?` · ${esc(b.ziel)}`:""}</div>
    ${v&&v.ziel_kinder?`<div id="tp-block-kinderziel" style="font-size:var(--s-text);background:var(--surface2);border-radius:10px;padding:8px 10px;margin-top:8px;line-height:1.45"><b>⚽ Für die Kinder:</b> ${esc(v.ziel_kinder)}</div>`:""}
    ${!v?`<div style="margin-top:8px;font-size:var(--s-text);color:var(--red)">Diese Vorlage gibt es in der App nicht mehr. Im Block eine andere wählen.</div>`
    :`<div style="margin-top:8px;font-size:var(--s-text)">👥 <b>${n} Kinder</b>${quelle?` <span style="color:var(--text2)">(${quelle})</span>`:""}${a?` → <b>Aufbau für ${a.key}</b>`:""}</div>
      ${a?`<div id="tp-block-aufbau" style="font-size:var(--s-text);margin-top:2px">${esc(a.text)}</div>`:`<div style="font-size:var(--s-text);color:var(--text2);margin-top:2px">Für diese Einheit ist kein Aufbau nach Kinderzahl hinterlegt.</div>`}
      ${a&&a.rest?`<div id="tp-block-rest" style="font-size:var(--s-klein);color:var(--text2);margin-top:2px">${esc(blockRestText(a))}</div>`:""}
      ${andere.length?`<details style="margin-top:6px"><summary style="font-size:var(--s-klein);color:var(--text2);cursor:pointer;min-height:32px">Andere Kinderzahlen (${andere.join(" / ")})</summary>
        ${andere.map(k=>`<div style="font-size:var(--s-klein);margin-top:4px"><b>${k} Kinder:</b> ${esc(String(sk[String(k)]))}</div>`).join("")}</details>`:""}
      <button class="btn btn-p" id="tp-block-akt" style="width:100%;min-height:56px;margin-top:10px;justify-content:center" onclick="blockAktualisieren('${esc(datum)}')">🔄 Aktualisieren nach Anwesenheit</button>
      <div id="tp-block-ergebnis" aria-live="polite"></div>
      <button class="btn btn-sm" id="tp-block-los" style="width:100%;min-height:44px;margin-top:8px" onclick="blockEinheitUebernehmen('${esc(datum)}')">Einheit ${z.buchstabe} neu einsetzen</button>`}
  </div>`;
}
async function blockEinheitUebernehmen(datum,opt){
  const b=blockFuerDatum(datum); if(!b)return;
  const z=blockZuordnung(await _tbTrainings(String(b.von),String(b.bis)),b).find(x=>x.datum===datum); if(!z)return;
  await _tbVorlagenSicher();
  const v=_tbVorlage(z.vorlage);
  if(!v){ toast(`Die Vorlage „${z.vorlage}“ gibt es nicht mehr`,"err"); return; }
  if(typeof vorlageUebernehmenSetzen!=="function"){ toast("Die Vorlagen sind noch nicht geladen – gleich nochmal","err"); return; }
  if(!(opt&&opt.still)&&typeof _vuPlanVorhanden==="function"&&await _vuPlanVorhanden(datum)
     &&!await frageJaNein({emoji:"📋",titel:"Plan ersetzen?",text:`Für ${_tbDatumKurz(datum)} steht schon ein Plan. Durch Einheit ${z.buchstabe} ersetzen?`,ja:"Ersetzen",ton:"rot"}))return;
  const knopf=document.getElementById("tp-block-los"); if(knopf)knopf.disabled=true;
  _vuAuswahl=v.id;
  try{ await vorlageUebernehmenSetzen(); }
  finally{ _vuAuswahl=null; if(knopf)knopf.disabled=false; }
  if(!(opt&&opt.still))blockPlanKarte(datum);
}

/* ── v657 · Aktualisieren nach Anwesenheit ─────────────────────────────────────
   PO 28.09.: „… am Tag des Trainings noch mal über einen Button, sodass die KI dann im
   gleichen Schwerpunkt die Übungen noch mal anpasst und prüft, ob der Plan auch so aufgeht.“
   Zwei Schritte, auf Charles' Wahl beide:
   1. Regeln, sofort und ohne Netz: Gruppen so viele wie Trainer (tgBedarf), Kinder aus
      Anwesenheit bzw. Zusagen, und jede Station, an der die Gruppe nicht zur Übung passt
      (mehr als ein Wechsler oder zu wenige Kinder), bekommt eine passende Übung derselben Art.
      Regelt die Einheit die Größe selbst (Feldtext „bei 5 …“), bleibt die Übung.
   2. Danach prüft die KI im selben Thema (Edge Function ki-plan-pruefen) und schlägt Tausche
      vor – nur Übungen aus der Bibliothek, jeder Vorschlag mit einem Tipp übernehmbar.
      Die KI ändert nie selbst; fällt sie aus, steht der Plan aus Schritt 1. */
function _tbStationPasst(selId){
  const info=_tpStationGruppe[selId], sel=document.getElementById(selId);
  if(!info||!sel||!sel.value||!info.n)return true;
  const idx=parseInt(sel.value);
  const sp=tpUebungSpanne(idx);
  if(sp.alle||!sp.min)return true;
  if(typeof tpFeldVariante==="function"&&typeof tpFeldTextFuer==="function"&&tpFeldVariante(tpFeldTextFuer(info.si,info.p,idx),info.n))return true;
  return info.n>=sp.min&&info.n<=sp.max+1;
}
function blockUebungenPruefen(){
  const getauscht=[];
  Object.keys(_tpStationGruppe||{}).forEach(selId=>{
    if(_tbStationPasst(selId))return;
    const info=_tpStationGruppe[selId], sel=document.getElementById(selId);
    const idx=parseInt(sel.value), alt=(tpAllForms()[idx]||{}).name;
    const vor=(typeof tpGroesserVorschlaege==="function")?tpGroesserVorschlaege(selId,idx,info.n):[];
    if(!vor.length){ getauscht.push({selId,von:alt,zu:null,n:info.n}); return; }
    const neu=vor[0];
    if(![...sel.options].some(o=>o.value===String(neu.i)))sel.add(new Option(neu.x.name,String(neu.i)));
    tpWahlWaehlen(selId,neu.i);   // v884: gewählt über den Zustand (boot.js, Welle 1)
    getauscht.push({selId,von:alt,zu:neu.x.name,n:info.n});
  });
  return getauscht;
}
async function blockAktualisieren(datum){
  const knopf=document.getElementById("tp-block-akt"); if(knopf)knopf.disabled=true;
  const box=()=>document.getElementById("tp-block-ergebnis");
  const zeilen=[];
  try{
    if(typeof _vuPlanVorhanden==="function"&&!(await _vuPlanVorhanden(datum))){
      await blockEinheitUebernehmen(datum,{still:true});
      zeilen.push("Einheit eingesetzt");
    }
    if(typeof tpRsvpBereit==="function")await tpRsvpBereit(datum);
    if(typeof tgSync==="function")await tgSync();
    const kinder=(typeof _tgPool==="function")?_tgPool().namen.length:0;
    const bedarf=tgBedarf(kinder);
    const tg=tgFor(), jetzt=(tg&&Array.isArray(tg.gruppen))?tg.gruppen.length:0;
    if(!jetzt)tgBilden(bedarf);
    else if(bedarf>jetzt)tgErweitern(bedarf);
    else if(bedarf<jetzt)tgZusammenlegen(bedarf);
    else if(typeof tgAnwesenheitAbgleich==="function")tgAnwesenheitAbgleich();
    const tg2=tgFor();
    zeilen.push(`${kinder} Kinder · ${(tg2&&tg2.gruppen||[]).length} Gruppen (${(tg2&&tg2.gruppen||[]).map(g=>g.kinder.length).join("/")})`);
    if(typeof tpPlanRestore==="function")await tpPlanRestore(datum); else tpRenderTimeline();
    const getauscht=blockUebungenPruefen();
    getauscht.filter(x=>x.zu).forEach(x=>zeilen.push(`🔁 ${x.n} Kinder: „${x.von}“ → „${x.zu}“`));
    getauscht.filter(x=>!x.zu).forEach(x=>zeilen.push(`⚠️ ${x.n} Kinder bei „${x.von}“ – keine passende Übung gefunden`));
    if(!getauscht.length)zeilen.push("✓ Alle Übungen passen zur Gruppengröße");
    _tbErgebnis(zeilen,"🤖 KI prüft den Plan im selben Thema …");
    await blockKiPruefen(datum,zeilen);
  }catch(e){
    _tbErgebnis(zeilen.concat(["Nicht vollständig aktualisiert – bitte nochmal."]),"");
  }finally{
    const k=document.getElementById("tp-block-akt"); if(k)k.disabled=false;
  }
}
function _tbErgebnis(zeilen,kiHtml){
  const el=document.getElementById("tp-block-ergebnis"); if(!el)return;
  el.innerHTML=`<div style="border:1px solid var(--rand-bedien);border-radius:10px;padding:8px 10px;margin-top:8px;font-size:var(--s-klein);line-height:1.5">
    <div style="font-weight:800;margin-bottom:2px">Nach Anwesenheit aktualisiert</div>
    ${zeilen.map(z=>`<div>${esc(z)}</div>`).join("")}
    <div id="tp-block-ki" style="margin-top:6px;color:var(--text2)">${kiHtml}</div>
  </div>`;
}
/* Was an die KI geht: Thema, Ziel, Zahlen, die Übungen je Station mit Kinderzahl und eine
   Kandidatenliste aus der Bibliothek. Keine Kindernamen, keine Gruppennamen. */
function blockKiNutzlast(datum){
  const b=blockFuerDatum(datum)||{};
  const alle=tpAllForms();
  const bloecke=[];
  (tpSlots||[]).forEach((sl,si)=>{
    if(!(typeof tpIstHauptteil==="function"&&tpIstHauptteil(sl&&sl.typ)))return;
    /* v881: Felderzahl aus dem Modell (boot.js, Welle 1) – ohne sie wie bisher aus der Seite */
    const felder=(typeof tpFelderZahl==="function")
      ? Array.from({length:tpFelderZahl(si)},(_,p)=>document.getElementById(`tp-form-${si}-${p}`)).filter(x=>x&&x.matches("select.tp-form-sel"))
      : [...document.querySelectorAll(`select.tp-form-sel[id^="tp-form-${si}-"]`)];
    /* v883: die Wahl aus dem Zustand (boot.js, Welle 1) – ohne ihn wie bisher aus dem Auswahlfeld */
    const st=felder.map(x=>{
      const f=alle[(typeof tpWahlIdx==="function")?tpWahlIdx(x.id):parseInt(x.value)]||{}; const p=Number(x.id.split("-").pop());
      return {station:p,uebung:f.name||"",spieler:String(f.spieler||"").slice(0,80),kinder:(_tpStationGruppe[x.id]||{}).n||0};
    }).filter(x=>x.uebung);
    if(st.length)bloecke.push({block:si,label:String(sl.label||"").split("|")[0].trim().slice(0,80),dauer:Number(sl.dauer)||0,stationen:st});
  });
  const kandidaten=alle.filter(f=>f&&f.name&&!(typeof tfDublette==="function"&&tfDublette(f)))
    .map(f=>({name:f.name,kat:f.kat||"",spieler:String(f.spieler||"").slice(0,60)})).slice(0,220);
  const v=_tbVorlage((blockZuordnungFuer(datum)||{}).vorlage);
  return {leitfrage:String(b.leitfrage||""),ziel:String(b.ziel||""),ziel_kinder:String((v||{}).ziel_kinder||""),
    kinder:(typeof _tgPool==="function")?_tgPool().namen.length:0,
    trainer:(typeof tpGetCheckedTrainers==="function")?tpGetCheckedTrainers().length:0,
    format:"FUNiño 3 gegen 3 und 3+1 (Raute mit Torwart)",bloecke,kandidaten};
}
let _tbZuCache={};
function blockZuordnungFuer(datum){ return _tbZuCache[datum]||null; }
async function blockKiPruefen(datum){
  const el=()=>document.getElementById("tp-block-ki");
  const b=blockFuerDatum(datum);
  if(b){ const zu=blockZuordnung(await _tbTrainings(String(b.von),String(b.bis)),b); zu.forEach(z=>{_tbZuCache[z.datum]=z;}); }
  const last=blockKiNutzlast(datum);
  if(!last.bloecke.length){ if(el())el().textContent=""; return; }
  const ctrl=new AbortController(), t=setTimeout(()=>ctrl.abort(),60000);
  try{
    const r=await fetch(`${SB_URL}/functions/v1/ki-plan-pruefen`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(last),signal:ctrl.signal});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(String(d.error||("Fehler "+r.status)));
    _tbKiZeigen(d);
  }catch(e){
    const msg=(e&&e.name==="AbortError")?"Zeitüberschreitung":(e instanceof TypeError)?"kein Netz":String((e&&e.message)||"nicht erreichbar");
    if(el())el().textContent=`KI-Prüfung nicht möglich (${msg}). Der Plan oben steht und gilt.`;
  }finally{ clearTimeout(t); }
}
/* Nur Vorschläge, deren Übung es gibt und deren Station es gibt – die Antwort ist Eingabe,
   nicht Befehl (wie die Bibliothek). */
function _tbKiZeigen(d){
  const el=document.getElementById("tp-block-ki"); if(!el)return;
  const alle=tpAllForms();
  const tausch=(Array.isArray(d.tausch)?d.tausch:[]).map(t=>{
    const selId=`tp-form-${Number(t.block)}-${Number(t.station)}`;
    const sel=document.getElementById(selId);
    const i=alle.findIndex(f=>f&&f.name===t.zu);
    const jetzt=(typeof tpWahlIdx==="function")?tpWahlIdx(selId):(sel&&sel.value!==""?Number(sel.value):null);   // v883: aus dem Zustand
    return (sel&&i>=0&&jetzt!==i)?{selId,i,zu:t.zu,grund:String(t.grund||"")}:null;
  }).filter(Boolean).slice(0,5);
  window._tbKiTausch=tausch;
  const hinw=(Array.isArray(d.hinweise)?d.hinweise:[]).slice(0,4);
  el.innerHTML=`<div style="color:var(--text)"><b>🤖 ${d.passt?"Der Plan geht auf":"Die KI schlägt vor"}:</b> ${esc(String(d.urteil||""))}</div>
    ${hinw.map(h=>`<div>• ${esc(String(h))}</div>`).join("")}
    ${tausch.map((t,k)=>`<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><span style="flex:1;min-width:0">🔁 ${esc(t.zu)}${t.grund?` – ${esc(t.grund)}`:""}</span>
      <button class="btn btn-sm" style="min-height:44px" onclick="blockKiTausch(${k})">Übernehmen</button></div>`).join("")}
    ${tausch.length>1?`<button class="btn btn-sm" style="min-height:44px;margin-top:6px" onclick="blockKiTauschAlle()">Alle übernehmen</button>`:""}`;
}
function blockKiTausch(k){
  const t=(window._tbKiTausch||[])[k]; if(!t)return;
  if(typeof tpUebungTausch==="function")tpUebungTausch(t.selId,t.i);
  t.fertig=true;
  const b=document.querySelectorAll("#tp-block-ki button")[k]; if(b){ b.disabled=true; b.textContent="✓ Übernommen"; }
}
function blockKiTauschAlle(){ (window._tbKiTausch||[]).forEach((t,k)=>{ if(!t.fertig)blockKiTausch(k); }); }

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
  /* v833: Themen für einen Block nur aus Vorlagen einer Leitfragen-Folge (folge_nr > 0; beim Anlegen wird null zu 0). Eine Sondereinheit ohne Folge
     („Sonder – Technik-Parcours“) bleibt im Vorlagen-Fenster wählbar, als Block-Thema wäre „Block erfassen“ gesperrt. */
  alle.forEach(v=>{ const f=String(v.leitfrage||""); if(!f||!(Number(v.folge_nr)>0))return; const k=_tbKuerzel(v.name)[0]; if(!m.has(f)||k<m.get(f))m.set(f,k); });
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
/* v667 · Saisonformat (Beschluss 28.09., Entwurf abgenommen 29.09.): „Die Saison spielt nur
   FUNiño 3 gegen 3 und 3+1 … die Automatik nimmt je Block mindestens zwei Einheiten in
   3+1/FUNiño.“ Mit der Leitfrage sind deshalb drei Einheiten vorgewählt – zuerst die im
   Saisonformat, der Rest in der Reihenfolge der Folge. Gibt es weniger als zwei, stehen alle
   da, die es gibt, und der Editor sagt das. Abwählen und tauschen bleibt frei. */
const TB_SAISON_ORDNUNGEN=["3+1","FUNiño","3+1 gegen FUNiño","3+1 und FUNiño"];
function _tbSaison(v){ return TB_SAISON_ORDNUNGEN.includes(String((v&&v.ordnung)||"")); }
function _tbVorwahl(leitfrage){
  const folge=_tbFolge(leitfrage);
  const saison=folge.filter(_tbSaison), rest=folge.filter(v=>!_tbSaison(v));
  return saison.concat(rest).slice(0,3).map(v=>v.name);
}
function blockLeitfrageSetzen(i){ const f=_tbLeitfragen()[i]; if(!f)return; if(_tbEdit.leitfrage!==f){_tbEdit.leitfrage=f;_tbEdit.wahl=_tbVorwahl(f);} blockEditorRender(); }
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
/* v656 · Die Einheit als Karte: Kurztitel, was die Kinder lernen, Dauer und Kinderzahlen –
   und aufklappbar der Ablauf, damit man vor dem Wählen sieht, worum es geht. Der Knopf
   „Wählen“ ist die eine Handlung; der Aufklapper nur zum Nachsehen. */
function blockThemaSetzen(i){
  const t=(typeof vuThemen==="function")?vuThemen()[i]:null; if(!t)return;
  if(_tbEdit.leitfrage!==t.frage){ _tbEdit.leitfrage=t.frage; _tbEdit.wahl=_tbVorwahl(t.frage); }
  blockEditorRender();
}
function _tbSaisonHinweis(folge,geordnet){
  const da=folge.filter(_tbSaison).length;
  const gewaehlt=folge.filter(v=>_tbSaison(v)&&geordnet.includes(v.name)).length;
  const txt=da<2?`Zu dieser Leitfrage gibt es ${da===0?"keine Einheit":"nur eine Einheit"} im Saisonformat (3+1 oder FUNiño) – ${da===0?"die anderen sind vorgewählt":"sie ist vorgewählt"}.`
    :gewaehlt<2?`Im Saisonformat (3+1 oder FUNiño) sind nur ${gewaehlt} gewählt – vorgesehen sind mindestens zwei.`
    :`${gewaehlt} von 3 im Saisonformat (3+1 oder FUNiño) vorgewählt – tauschen geht.`;
  return `<div id="tb-saison" style="font-size:var(--s-klein);color:var(--text2);margin:0 0 6px;line-height:1.45">⚽ ${txt}</div>`;
}
function blockEinheitKarte(v,i,p){
  const bl=Array.isArray(v.bloecke)?v.bloecke:[];
  const summe=bl.reduce((a,b)=>a+(Number(b.dauer)||0),0);
  const sk=(typeof _evSkalierungSchluessel==="function")?_evSkalierungSchluessel(v.skalierung):[];
  const an=p>=0;
  const kurz=(typeof vuKurztitel==="function")?vuKurztitel(v.name):v.name;
  const kz=(/^(L\d+-\d+)/.exec(String(v.name||""))||[])[1]||"";
  const zeile=b=>`<div style="display:flex;gap:8px;padding:3px 0;border-top:1px solid var(--surface2)"><b style="min-width:3.2em">${Number(b.dauer)} Min.</b><span style="min-width:0">${esc(b.label||"")}${(typeof _evBlockText==="function")?`<span style="display:block;color:var(--text2)">${_evBlockText(b)}</span>`:""}</span></div>`;
  return `<div class="tb-einheit" style="border:1.5px solid ${an?"var(--text)":"var(--rand-bedien)"};border-radius:12px;padding:10px 12px;background:var(--surface)">
    <div style="display:flex;gap:8px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--s-klein);color:var(--text2)">${an?`<b style="color:var(--text)">Einheit ${TB_BUCHSTABEN[p]}</b> · `:""}${esc(kz)}</div>
        <div style="font-size:var(--s-text);font-weight:800;line-height:1.35">${esc(kurz)}</div>
        ${v.ziel_kinder?`<div style="font-size:var(--s-klein);margin-top:3px;line-height:1.45">⚽ ${esc(v.ziel_kinder)}</div>`:""}
        <div style="font-size:var(--s-klein);color:var(--text2);margin-top:3px">${summe} Min.${v.netto_spielform_min?` · ${Number(v.netto_spielform_min)} Min. Spielform`:""}${sk.length?` · für ${sk.join("/")} Kinder`:""}${v.ordnung?` · ${esc(v.ordnung)}`:""}</div>
      </div>
      <button type="button" class="btn btn-sm" aria-pressed="${an}" onclick="blockVorlageUmschalten(${i})" style="${an?"background:var(--text);color:var(--surface);":""}min-width:88px">${an?"✓ Gewählt":"Wählen"}</button>
    </div>
    <details style="margin-top:6px"><summary style="font-size:var(--s-klein);color:var(--text2);cursor:pointer;min-height:32px;display:flex;align-items:center">Ablauf ansehen</summary>
      <div style="font-size:var(--s-klein);line-height:1.45;margin-top:4px">${bl.map(zeile).join("")}
        ${v.beobachtung?`<div style="color:var(--text2);margin-top:6px">👀 ${esc(v.beobachtung)}</div>`:""}</div>
    </details>
  </div>`;
}
function _tbBis(){ return _tbPlusTage(_tbEdit.von,_tbEdit.wochen*7-1); }
async function blockEditorRender(){
  const box=document.getElementById("tb-inhalt"); if(!box||!_tbEdit)return;
  const fragen=_tbLeitfragen();
  if(!fragen.length){ box.innerHTML=`<div style="font-size:var(--s-text);color:var(--text2);line-height:1.6">Noch keine Vorlagen in der App. Sie kommen beim Öffnen aus <b>uebungen/vorlagen.json</b>.</div>`; return; }
  const chip=(an,txt,onclick,label)=>`<button type="button" class="btn btn-sm" aria-pressed="${an}" onclick="${onclick}" ${label?`aria-label="${esc(label)}"`:""} style="${an?"background:var(--text);color:var(--surface);":""}text-align:left">${an&&!/^✓/.test(String(txt))?"✓ ":""}${txt}</button>`;   // v878: ✓ – Farbe trägt nicht allein
  const folge=_tbEdit.leitfrage?_tbFolge(_tbEdit.leitfrage):[];
  const geordnet=_tbWahlGeordnet();
  const bis=_tbBis();
  const ueber=(TB_BLOECKE||[]).filter(b=>String(b.von)<=bis&&_tbEdit.von<=String(b.bis));
  box.innerHTML=`
    <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:4px 0">1 · Ziel: welche Leitfrage?${typeof infoTipp==="function"?infoTipp("Leitfrage",INFO_LEITFRAGE):""}</div>
    ${(typeof vuThemenKacheln==="function")?vuThemenKacheln("blockThemaSetzen",_tbEdit.leitfrage,true)
      :`<div style="display:grid;gap:6px">${fragen.map((f,i)=>chip(_tbEdit.leitfrage===f,esc(f),`blockLeitfrageSetzen(${i})`)).join("")}</div>`}
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
    ${_tbEdit.leitfrage?_tbSaisonHinweis(folge,geordnet):""}
    ${_tbEdit.leitfrage?`<div style="display:grid;gap:8px">${folge.map((v,i)=>blockEinheitKarte(v,i,geordnet.indexOf(v.name))).join("")}</div>`
      :`<div style="font-size:var(--s-text);color:var(--text3)">Erst oben eine Leitfrage wählen.</div>`}
    <div id="tb-vorschau" style="margin-top:12px"></div>
    <button class="btn" id="tb-speichern" style="width:100%;margin-top:12px" ${(_tbEdit.leitfrage&&geordnet.length===3)?"":"disabled"} onclick="blockSpeichern()">Block erfassen</button>
    ${(TB_BLOECKE||[]).length?`<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:18px 0 4px">Erfasste Blöcke</div>
      ${TB_BLOECKE.map(b=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--surface2)">
        <div style="flex:1;min-width:0;font-size:var(--s-klein)"><b>${esc(_tbDatumKurz(b.von))} – ${esc(_tbDatumKurz(b.bis))}</b> · ${esc(b.leitfrage)}</div>
        <button class="btn btn-sm" onclick="blockNeuPlanen(${Number(b.id)})" aria-label="Alle Trainings des Blocks ab ${esc(_tbDatumKurz(b.von))} neu planen">Neu planen</button>
        <button class="btn btn-sm" onclick="blockLoeschen(${Number(b.id)})" aria-label="Block ab ${esc(_tbDatumKurz(b.von))} löschen">Löschen</button></div>`).join("")}`:""}`;
  if(_tbEdit.leitfrage&&geordnet.length===3){
    const tr=await _tbTrainings(_tbEdit.von,bis);
    const zu=blockZuordnung(tr,{vorlagen:geordnet});
    const el=document.getElementById("tb-vorschau"); if(!el)return;
    el.innerHTML=zu.length
      ?`<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-bottom:4px">So verteilt sich der Block (${zu.length} Trainings)</div>
        ${zu.map(z=>`<div style="font-size:var(--s-klein);padding:2px 0"><b>${esc(_tbDatumKurz(z.datum))}</b> · Einheit ${z.buchstabe} · ${esc((typeof vuKurztitel==="function")?vuKurztitel(z.vorlage):z.vorlage)}</div>`).join("")}
        <div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px;line-height:1.45">📅 „Block erfassen“ plant alle ${zu.length} Trainings sofort. <b>Stehende Pläne in diesem Zeitraum werden ersetzt.</b> Gruppen und Feinschliff am Trainingstag: „Aktualisieren nach Anwesenheit“.</div>`
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
  blockEditorClose();
  await blockLaden();
  /* v657: Der Block plant alle Trainings im Zeitraum sofort (PO 28.09., „Alle überschreiben“). */
  const b=(TB_BLOECKE||[]).find(x=>String(x.von)===zeile.von&&String(x.leitfrage)===zeile.leitfrage)||{...zeile};
  const e=await blockAllePlanen(b);
  toast(e.fehler?`🧱 Block erfasst – ${e.geplant} von ${e.gesamt} Trainings geplant, ${e.fehler}`:`🧱 Block erfasst ✓ ${e.geplant} Training${e.geplant===1?"":"s"} geplant`,e.fehler?"err":undefined);
  blockBannerRender();
  const d=document.getElementById("tp-date")?.value; if(d)blockPlanKarte(d);
}
/* v657 · Alle Trainings eines Blocks planen. Jede Einheit geht über denselben Bau wie
   „Vorlage übernehmen“ (vuPlanAusVorlage) – mit Abschlussturnier und Stationen. Gruppen werden
   hier NICHT gebildet: wer kommt, weiß man erst am Tag; dafür gibt es „Aktualisieren nach
   Anwesenheit“. Bestehende Pläne im Zeitraum werden ersetzt (PO-Entscheidung). */
async function blockAllePlanen(b){
  const erg={geplant:0,gesamt:0,fehler:""};
  if(!b||typeof vuPlanAusVorlage!=="function"||typeof vuPlanSchreiben!=="function"){ erg.fehler="Vorlagen noch nicht geladen"; return erg; }
  await _tbVorlagenSicher();
  const zu=blockZuordnung(await _tbTrainings(String(b.von),String(b.bis)),b);
  erg.gesamt=zu.length;
  for(const z of zu){
    const v=_tbVorlage(z.vorlage);
    if(!v){ erg.fehler=`„${z.vorlage}“ fehlt`; continue; }
    const {slots,plan,fehlend}=vuPlanAusVorlage(v);
    if(fehlend){ erg.fehler=`Übung „${fehlend}“ fehlt`; continue; }
    try{ if(await vuPlanSchreiben(z.datum,slots,plan))erg.geplant++; else erg.fehler="Server lehnt ab"; }
    catch(e){ erg.fehler="kein Netz"; }
  }
  const d=document.getElementById("tp-date")?.value;
  if(d&&zu.some(z=>z.datum===d)&&typeof tpPlanRestore==="function"){ try{ await tpPlanRestore(d); }catch(e){} }
  return erg;
}
async function blockNeuPlanen(id){
  const b=(TB_BLOECKE||[]).find(x=>Number(x.id)===Number(id)); if(!b)return;
  const e=await blockAllePlanen(b);
  toast(e.fehler?`${e.geplant} von ${e.gesamt} Trainings geplant – ${e.fehler}`:`📅 ${e.geplant} Training${e.geplant===1?"":"s"} neu geplant ✓`,e.fehler?"err":undefined);
}

async function blockLoeschen(id){
  const b=(TB_BLOECKE||[]).find(x=>Number(x.id)===Number(id)); if(!b)return;
  if(!await frageJaNein({emoji:"🗑️",titel:"Block löschen?",text:`Block „${b.leitfrage}“ (${_tbDatumKurz(b.von)} – ${_tbDatumKurz(b.bis)}) löschen? Bereits übernommene Pläne bleiben stehen.`,ja:"Löschen",ton:"rot"}))return;
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
/* ═══ v940 · Planung: der fertige Plan zuerst (Charles 22.11.2026, Entwurf im Bild freigegeben) ═══════════════════════
   „Sobald ich auf Planung klicke … das All-inclusive-Paket … der komplette Trainingsplan automatisch nach der Leitfrage.“
   Oben steht groß der Plan nach der Leitfrage des Trainingsblocks („Passt – speichern“ / „Ansehen und ändern“), darunter
   gleich groß drei Wege für Tage, an denen man es anders will: Andere Leitfrage (oder die Vorwoche wiederholen – statt zweier
   Leitfragen in einer Einheit; das Ausbildungskonzept sagt „Jede Einheit steht unter einer Frage“), Selbst bauen, Mit KI.
   Zu- und Absagen: Der gespeicherte Plan passt sich beim Öffnen selbst an (dieselbe Rechnung wie „Plan anpassen“), mit
   Hinweis und „Rückgängig“; ab zwei Stunden vor Beginn ändert sich nichts mehr von selbst. */
const TPS_FRIER_MIN=120;
let _tpsRueck=null;            // Stand vor der automatischen Anpassung (für „Rückgängig“)
let _tpsHinweis=null;          // {datum, text}
function _tpsKinder(){ try{ const p=(typeof _tgPool==="function")?_tgPool():null; return p&&Array.isArray(p.namen)?p.namen.length:0; }catch(e){ return 0; } }
function _tpsTrainer(){ try{ return (typeof tpGetTrainerCount==="function")?tpGetTrainerCount():0; }catch(e){ return 0; } }
function _tpsHatPlan(){ try{ return (typeof tpPlanEntries==="function")&&tpPlanEntries().length>0; }catch(e){ return false; } }
/* Aufwärmen · Hauptteil · Abschluss aus den Blöcken: alles vor dem ersten Hauptteil, die Hauptteile, alles danach. */
function _tpsAblauf(slots){
  const s=(slots||[]).filter(x=>x&&x.parallelZu==null);
  const haupt=s.map((x,i)=>(typeof tpIstHauptteil==="function"&&tpIstHauptteil(x.typ))?i:-1).filter(i=>i>=0);
  if(!haupt.length)return null;
  const min=a=>a.reduce((m,x)=>m+(Number(x.dauer)||0),0);
  return {vor:min(s.slice(0,haupt[0])),haupt:min(s.slice(haupt[0],haupt[haupt.length-1]+1)),nach:min(s.slice(haupt[haupt.length-1]+1))};
}
function _tpsStart(datum){
  const z=String((typeof TP_TERMIN_ZEIT!=="undefined"&&TP_TERMIN_ZEIT)||"").slice(0,5);
  return new Date(`${datum}T${/^\d\d:\d\d$/.test(z)?z:"23:59"}:00`);
}
function _tpsEingefroren(datum){ return Date.now()>=_tpsStart(datum).getTime()-TPS_FRIER_MIN*60000; }
async function _tpsVorwoche(datum){
  /* Leitfrage des Trainings eine Woche vorher – aus dem Block, der dort galt. Ohne Block keine Wiederholung. */
  const d=new Date(datum+"T12:00:00"); d.setDate(d.getDate()-7);
  const vor=d.toISOString().slice(0,10);
  const b=blockFuerDatum(vor)||(TB_BLOECKE||[]).filter(x=>String(x.von)<datum&&String(x.bis)<datum).sort((a,c)=>String(c.bis).localeCompare(String(a.bis)))[0]||null;
  return b&&b.leitfrage?String(b.leitfrage):"";
}
async function tpStartRender(datum){
  const el=document.getElementById("tp-start"); if(!el)return;
  datum=String(datum||document.getElementById("tp-date")?.value||"").slice(0,10);
  if(!datum||(typeof sbToken==="function"&&!sbToken())){ el.innerHTML=""; return; }
  if(!_tbGeladen)await blockLaden();
  await _tbVorlagenSicher();
  if((document.getElementById("tp-date")?.value||datum)!==datum)return;
  const b=blockFuerDatum(datum);
  let z=null, zu=[]; if(b){ zu=blockZuordnung(await _tbTrainings(String(b.von),String(b.bis)),b); z=zu.find(x=>x.datum===datum)||null; }
  let v=z?_tbVorlage(z.vorlage):null;
  const hatPlan=_tpsHatPlan();
  /* v949 · Charles 22.11.: „Eine Kachel, die alles automatisch baut fürs Training aus vorbereiteten Einheiten. Eine Leitfrage
     sollte schon festgelegt worden sein. Sollte sie fehlen, sollte ein Hinweis erscheinen und sie wird bestimmt.“ Ohne Block gilt
     die Leitfrage des Monats (periodisierung.leitfrage); die Einheit ist die nächste noch nicht trainierte der Folge. */
  let auto=null, monatLf="", ohneLf=false;
  if(!b&&!hatPlan){
    monatLf=await tpaMonatLeitfrage(datum);
    if((document.getElementById("tp-date")?.value||datum)!==datum)return;
    if(monatLf){ const k=await tpaKandidaten(datum,monatLf); if(k.liste.length){ const i=(_tpaVersatz[datum]||0)%k.liste.length; auto={v:k.liste[i],nr:i+1,von:k.liste.length,offen:k.offen,folge:k.folge}; v=auto.v; } }
    else ohneLf=true;
  }
  const n=_tpsKinder(), tr=_tpsTrainer();
  const ablauf=hatPlan?_tpsAblauf(typeof tpSlots!=="undefined"?tpSlots:[]):(v&&typeof vuPlanAusVorlage==="function"?_tpsAblauf(vuPlanAusVorlage(v).slots):null);
  const lf=b&&z?String(b.leitfrage||""):(auto?monatLf:"");
  const zustand=hatPlan?"steht":(auto?"auto":(v?"bereit":"leer"));
  const titel={steht:"Dein Training steht",bereit:"Dein Training ist bereit",auto:"Dein Training ist bereit",leer:"Noch kein Plan für diesen Termin"}[zustand];
  const haupt={steht:`<button type="button" class="tps-gross" id="tps-speichern" onclick="tpStartSpeichern()"><span aria-hidden="true">✓</span> Passt – speichern</button>`,
    bereit:`<button type="button" class="tps-gross" id="tps-uebernehmen" onclick="tpStartUebernehmen('${esc(datum)}')"><span aria-hidden="true">✓</span> Plan übernehmen</button>`,
    auto:`<button type="button" class="tps-gross" id="tps-bauen" onclick="tpaBauen('${esc(datum)}')"><span aria-hidden="true">✓</span> Training bauen</button>`,
    leer:""}[zustand];
  const h=_tpsHinweis&&_tpsHinweis.datum===datum?_tpsHinweis:null;
  /* v952 · Charles 22.11.: „Wenn ich noch Änderungen vornehme und dann ganz unten Plan speichern klicke, müsste ja oben der fertige
     Plan verschwinden …“ und dann: „Eigentlich kann da die ganze Planungsübersicht als fertig angezeigt werden. Als Trainer muss ich
     dann nur noch den Plan sehen können … Planung doch nochmal ändern kann dann eine Option sein.“ (Bild freigegeben)
     Steht ein gespeicherter Plan, zeigt die Seite nur die Übersicht mit „Training starten“; die Blockkarten erst nach „Plan ändern“. */
  const gz=_tpsZuLesen(datum), gespeichert=!!(gz&&gz.zeit)||!!(typeof TP_STAND!=="undefined"&&TP_STAND[datum]&&TP_STAND[datum].updated_at);
  const fertig=zustand==="steht"&&gespeichert&&!(gz&&gz.offen);
  document.getElementById("train-sub-planung")?.classList.toggle("tp-fertig",fertig);
  if(fertig){ el.innerHTML=tpUebersichtHtml(datum,{lf,n,ablauf,hinweis:h?`<div class="tps-hinweis tpu-hinweis" id="tps-hinweis" role="status"><span aria-hidden="true">🔄</span><span>${esc(h.text)}</span>${_tpsRueck&&_tpsRueck.datum===datum?`<button type="button" onclick="tpStartRueckgaengig()">Rückgängig</button>`:""}</div>`:"",lfKlein:auto?`Leitfrage des Monats · Einheit ${String(auto.v.name).split(" ")[0]}`:(b&&z?`Leitfrage des Blocks · Einheit ${z.buchstabe}`:"")}); tpsSkillHinweis(); return; }
  el.innerHTML=`<section class="tps" aria-label="Plan für diesen Termin">
    <div class="tps-haupt" id="tps-haupt">
      <div class="tps-ueber">⚡ ${zustand==="leer"?"Schnell planen":"Fertiger Plan"}</div>
      <div class="tps-titel">${titel}</div>
      ${auto?`<div class="tps-lf"><span class="tps-lf-klein">Leitfrage des Monats · Einheit ${esc(String(auto.v.name).split(" ")[0])}${auto.offen?"":" · alle schon trainiert, von vorn"}</span>${esc(lf)}<span class="tps-lf-einheit">${esc(String(auto.v.name).replace(/^L\d+-\d+\s*/,""))}</span></div>`
      :ohneLf?`<div class="tps-lf tps-lf-fehlt" role="status"><span class="tps-lf-klein">Hinweis</span>Für ${esc(_tpaMonatName(datum))} ist noch keine Leitfrage festgelegt. Tippe eine an – sie gilt für den ganzen Monat und alle Trainer, dann baut die App das Training.</div>${tpaLfChips(datum,"")}`
      :lf?`<div class="tps-lf"><span class="tps-lf-klein">Leitfrage des Blocks · Einheit ${esc(z.buchstabe)} · Training ${z.nr} von ${zu.length}</span>${esc(lf)}</div>`
        :`<div class="tps-lf"><span class="tps-lf-klein">Kein Trainingsblock für diesen Termin</span>${hatPlan?"Der Plan unten gilt.":"Wähle eine Leitfrage – der Plan entsteht aus der passenden Einheit."}</div>`}
      ${ablauf?`<div class="tps-ablauf"><div style="flex:${Math.max(1,ablauf.vor)}">Aufwärmen<span>${ablauf.vor} Min</span></div><div style="flex:${Math.max(1,ablauf.haupt)}">Hauptteil${tr>1?` · ${tr} Felder`:""}<span>${ablauf.haupt} Min</span></div><div style="flex:${Math.max(1,ablauf.nach)}">Abschluss<span>${ablauf.nach} Min</span></div></div>`:""}
      <div class="tps-rechnet">👥 rechnet mit ${n} ${n===1?"Kind":"Kindern"}${tr?` · ${tr} ${tr===1?"Trainer":"Trainern"}`:""}</div>
      ${haupt}
      ${zustand==="auto"?`<div class="tps-paar"><button type="button" class="tps-zweit" id="tps-andere-einheit" onclick="tpaAndere('${esc(datum)}')">🔄 Andere Einheit</button><button type="button" class="tps-zweit" id="tps-lf-aendern" onclick="tpaLfAendern('${esc(datum)}')">🎯 Leitfrage ändern</button></div><div id="tps-lf-wahl"></div>`
        :zustand==="leer"?"":`<button type="button" class="tps-zweit" id="tps-ansehen" onclick="tpStartAnsehen()">Ansehen und ändern</button>`}
      ${zustand==="steht"&&gespeichert?`<button type="button" class="tps-einklappen" id="tps-einklappen" onclick="tpStartEinklappen('${esc(datum)}')">✓ Fertig – zur Übersicht</button>`:""}
    </div>
    ${h?`<div class="tps-hinweis" id="tps-hinweis" role="status"><span aria-hidden="true">🔄</span><span>${esc(h.text)}</span>${_tpsRueck&&_tpsRueck.datum===datum?`<button type="button" onclick="tpStartRueckgaengig()">Rückgängig</button>`:""}</div>`:""}
    <div class="tps-oder">Heute lieber anders?</div>
    <div class="tps-wege tps-wege-2">
      <button type="button" class="tps-weg" id="tps-selbst" onclick="tpStartAnsehen()"><span class="tps-i" aria-hidden="true">✏️</span><b>Selbst bauen</b><small>jeden Block selbst belegen · ${n} Kinder</small></button>
      <button type="button" class="tps-weg" id="tps-ki" onclick="tpStartKi()"><span class="tps-i" aria-hidden="true">✨</span><b>Mit KI</b><small>Ziel nennen, Übung vom Adler-Coach</small></button>
    </div>
    ${b?"":`<button type="button" class="btn btn-link tps-block-link" id="tps-block" onclick="blockEditorOpen()">🧱 Über mehrere Wochen planen: Trainingsblock anlegen</button>`}
  </section>`;
  tpsSkillHinweis();
}
/* v963 · Charles 24.11.: „… und wir würden es dann auch im Training live trainieren.“ Der Skill des Monats steht als Hinweis über dem
   Plan – mit dem verknüpften Abzeichen; tippen öffnet „So geht's“. Kein eigener Block: wo er hinpasst, entscheidet der Trainer. */
async function tpsSkillHinweis(){
  const ziel=document.querySelector("#tps-haupt .tps-titel")||document.querySelector("#tps-fertig .tpu-ok"); if(!ziel||document.getElementById("tps-skill"))return;
  const sk=(typeof skillMonatLaden==="function")?await skillMonatLaden():null; if(!sk||document.getElementById("tps-skill"))return;
  const a=sk.abzeichen&&typeof abzeichenFinden==="function"?abzeichenFinden(sk.abzeichen):null;
  const d=document.createElement("button"); d.type="button"; d.id="tps-skill"; d.className="tps-skill";
  d.innerHTML=`<span aria-hidden="true">⭐</span><span><small>Skill des Monats – im Training aufgreifen</small><b>${esc(sk.titel||"")}</b></span>`;
  d.onclick=()=>{ if(a&&typeof abzeichenDetail==="function")abzeichenDetail(a.id,0,0); else if(typeof skillWocheOpen==="function")skillWocheOpen(); };
  ziel.insertAdjacentElement("afterend",d);
}
/* ── v949 · „Training automatisch“: Leitfrage des Monats und nächste Einheit der Folge ── */
let _tpaVersatz={}, _tpaLf={};
function _tpaMonatName(datum){ return new Date(String(datum).slice(0,10)+"T12:00:00").toLocaleDateString("de-DE",{month:"long"}); }
async function tpaMonatLeitfrage(datum){
  const m=String(datum).slice(0,7); if(_tpaLf[m]!==undefined)return _tpaLf[m];
  let lf="";
  try{ const r=await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${m}&select=leitfrage`,{headers:sbAuthHeaders()}); if(r.ok)lf=String((((await r.json())||[])[0]||{}).leitfrage||""); }catch(e){}
  if(lf&&!_tbLeitfragen().includes(lf))lf="";   // nur Leitfragen, zu denen es eine Folge gibt
  _tpaLf[m]=lf; return lf;
}
/* Einheiten der Folge: noch nicht trainierte zuerst (im Saisonformat 3+1/FUNiño vorn, sonst in der Reihenfolge der Folge),
   danach die schon trainierten. „Trainiert“ heißt: In einem Plan dieses Monats vor dem Termin stehen mindestens 60 % ihrer Übungen. */
async function tpaKandidaten(datum,lf){
  const folge=_tbFolge(lf).filter(v=>Number(v.folge_nr)>0);
  const m=String(datum).slice(0,7); let plaene=[];
  try{ const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?select=datum,plan&datum=gte.${m}-01&datum=lt.${String(datum).slice(0,10)}`,{headers:sbAuthHeaders()}); if(r.ok)plaene=(await r.json())||[]; }catch(e){}
  const mengen=plaene.map(p=>new Set((Array.isArray(p.plan)?p.plan:[]).map(x=>String(x&&x.formName||"")).filter(Boolean)));
  const trainiert=v=>{ let namen=[]; try{ namen=[...new Set(((typeof vuPlanAusVorlage==="function"?vuPlanAusVorlage(v).plan:[])||[]).map(x=>String(x&&x.formName||"")).filter(Boolean))]; }catch(e){}
    return namen.length>0&&mengen.some(s=>namen.filter(n=>s.has(n)).length>=Math.ceil(namen.length*0.6)); };
  const offen=folge.filter(v=>!trainiert(v)), fertig=folge.filter(v=>trainiert(v));
  const liste=offen.filter(_tbSaison).concat(offen.filter(v=>!_tbSaison(v)),fertig);
  return {liste,offen:offen.length>0,folge};
}
function tpaLfChips(datum,aktiv){
  const L=_tbLeitfragen();
  return `<div class="tps-lf-chips" role="group" aria-label="Leitfrage des Monats">${L.map((f,i)=>`<button type="button" class="tps-lf-chip" aria-pressed="${f===aktiv}" onclick="tpaLfSetzen('${esc(datum)}',${i})"><b>L${_tbKuerzel((_tbFolge(f)[0]||{}).name)[0]}</b> ${esc(f)}</button>`).join("")}</div>`;
}
function tpaLfAendern(datum){ const el=document.getElementById("tps-lf-wahl"); if(!el)return; el.innerHTML=el.innerHTML?"":tpaLfChips(datum,_tpaLf[String(datum).slice(0,7)]||""); }
async function tpaLfSetzen(datum,i){
  const f=_tbLeitfragen()[i]; if(!f)return;
  const m=String(datum).slice(0,7);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${m}&select=monat`,{headers:sbAuthHeaders()});
    const da=r.ok&&((await r.json())||[]).length>0;
    const w=da?await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${m}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({leitfrage:f,updated_at:new Date().toISOString()})})
      :await fetch(`${SB_URL}/rest/v1/periodisierung`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({monat:m,thema:f,leitfrage:f,updated_at:new Date().toISOString()})});
    if(typeof sbCheck401==="function"&&sbCheck401(w))return;
    if(!w.ok){ toast("Leitfrage konnte nicht gespeichert werden","err"); return; }
  }catch(e){ toast("Kein Netz – Leitfrage nicht gespeichert","err"); return; }
  _tpaLf[m]=f; _tpaVersatz[datum]=0;
  toast(`🎯 Leitfrage für ${_tpaMonatName(datum)} festgelegt`);
  tpStartRender(datum);
}
function tpaAndere(datum){ _tpaVersatz[datum]=(_tpaVersatz[datum]||0)+1; tpStartRender(datum); }
async function tpaBauen(datum){
  const lf=await tpaMonatLeitfrage(datum); if(!lf)return tpStartRender(datum);
  const k=await tpaKandidaten(datum,lf); if(!k.liste.length){ toast("Zu dieser Leitfrage gibt es keine Einheit","err"); return; }
  const v=k.liste[(_tpaVersatz[datum]||0)%k.liste.length];
  if(typeof vorlageUebernehmenSetzen!=="function"){ toast("Die Vorlagen laden noch – gleich nochmal","err"); return; }
  const knopf=document.getElementById("tps-bauen"); if(knopf)knopf.disabled=true;
  _vuAuswahl=v.id;
  try{ await vorlageUebernehmenSetzen(); } finally{ _vuAuswahl=null; if(knopf)knopf.disabled=false; }
  if(_tpsHatPlan()){ _tpsLageMerken(datum); tpStartHerz(); }
  tpStartRender(datum);
}
function tpStartAnsehen(){
  const ziel=document.querySelector("#train-sub-planung .tp-schritt")||document.getElementById("tp-timeline");
  if(ziel)ziel.scrollIntoView({behavior:"smooth",block:"start"});
}
function tpStartKi(){
  if(typeof kiCoachOpen==="function")kiCoachOpen(); else toast("Der Adler-Coach lädt noch – gleich nochmal","err");
}
async function tpStartUebernehmen(datum){
  const k=document.getElementById("tps-uebernehmen"); if(k)k.disabled=true;
  try{ await blockEinheitUebernehmen(datum,{still:true}); }
  finally{ if(k)k.disabled=false; }
  if(_tpsHatPlan()){ _tpsLageMerken(datum); tpStartHerz(); }
  tpStartRender(datum);
}
/* v952: Merker „bewusst gespeichert“ je Termin (Zeit und Kinderzahl), übersteht das Neuladen */
let _tpsZu={};
function _tpsZuLesen(datum){ if(_tpsZu[datum])return _tpsZu[datum]; try{ const j=JSON.parse(localStorage.getItem("adler_tps_zu_"+datum)||"null"); if(j)_tpsZu[datum]=j; return j; }catch(e){ return null; } }
function _tpsZuWeg(datum){ delete _tpsZu[datum]; try{ localStorage.removeItem("adler_tps_zu_"+datum); }catch(e){} }
function tpStartGespeichert(datum){
  if(!datum||!_tpsHatPlan())return;
  const d=new Date(); _tpsZu[datum]={zeit:String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"),n:_tpsKinder(),offen:false};
  try{ localStorage.setItem("adler_tps_zu_"+datum,JSON.stringify(_tpsZu[datum])); }catch(e){}
  if((document.getElementById("tp-date")?.value||"")===datum)tpStartRender(datum);
}
function tpStartZeigen(datum){ _tpsZu[datum]=Object.assign(_tpsZuLesen(datum)||{},{offen:true}); tpStartRender(datum).then(()=>document.getElementById("tps-haupt")?.scrollIntoView({block:"start"})); }
function tpStartEinklappen(datum){ const z=_tpsZuLesen(datum); if(z)z.offen=false; tpStartRender(datum).then(()=>{ document.getElementById("tps-fertig")?.scrollIntoView({block:"start"}); document.getElementById("tpu-start")?.focus(); }); }
/* v952: Übersicht des fertigen Plans – dieselben Stationen wie der Trainingsstart (_tlSnapshot), nur lesen. */
function _tpuZeit(min){ const t=String(typeof TP_TERMIN_ZEIT!=="undefined"?TP_TERMIN_ZEIT:""), m=t.match(/^(\d{1,2}):(\d{2})/); if(!m)return min+"′"; const a=Number(m[1])*60+Number(m[2])+min; return String(Math.floor(a/60)%24).padStart(2,"0")+":"+String(a%60).padStart(2,"0"); }
function _tpuIch(){ return (typeof _meTrainer==="string"&&_meTrainer)||""; }
function tpUebersichtHtml(datum,o){
  let st=[]; try{ st=(typeof _tlSnapshot==="function")?_tlSnapshot():[]; }catch(e){}
  const ich=_tpuIch(), gz=_tpsZuLesen(datum);
  const min=st.reduce((a,x)=>a+(Number(x.dauer)||0),0);
  /* Durchgänge eines Blocks stehen als eine Karte: Übungen aus dem ersten, darunter „Gruppen wechseln“ */
  const bl=[]; st.forEach(x=>{ const l=bl[bl.length-1], dg=/ · Durchgang (\d+)\//.exec(String(x.label)); if(l&&dg&&Number(dg[1])>1&&String(x.label).startsWith(l.label+" · Durchgang")){ l.dauer+=x.dauer; l.dg++; } else bl.push({si:x.si,label:String(x.label).replace(/ · Durchgang .*/,""),dauer:x.dauer,farbe:x.farbe,gruppen:x.gruppen,dg:1,ab:0}); });
  let t=0; bl.forEach(x=>{ x.ab=t; t+=x.dauer; });
  const zeile=x=>{
    const alle=x.gruppen.length===1&&(!x.gruppen[0].gruppe);
    const g=x.gruppen.map(gr=>{ const meins=ich&&gr.trainer===ich;
      return `<div class="tpu-g${meins?" tpu-ich":""}">${gr.gruppe?`<span class="tpu-grp">${esc(gr.gruppe)}</span>`:""}<span class="tpu-ueb">${esc(gr.uebung)}</span><span class="tpu-tr">${alle?"alle":meins?"Du":esc(gr.trainer)}</span></div>`; }).join("");
    return `<li class="tpu-b" style="--f:${esc(x.farbe||"#16a34a")}"><span class="tpu-zeit">${_tpuZeit(x.ab)}</span><div class="tpu-k"><div class="tpu-t"><b>${esc(x.label)}</b><span>${x.dauer} Min${x.gruppen.length>1?` · ${x.gruppen.length} Felder`:""}</span></div>${g}${x.dg>1?`<div class="tpu-dg">🔁 Gruppen wechseln ${x.dg-1}× (alle ${Math.round(x.dauer/x.dg)} Min)</div>`:""}</div></li>`;
  };
  return `<section class="tpu" id="tps-fertig" aria-label="Fertiger Plan">
    <div class="tpu-ok"><span class="tps-zu-ok" aria-hidden="true">✓</span><span class="tps-zu-text"><b>Training steht</b><small>${esc(_tpuZeit(0)==="0′"?"":_tpuZeit(0)+" Uhr · ")}${o.n} ${o.n===1?"Kind":"Kinder"} · ${min} Min${gz&&gz.zeit?` · gespeichert ${esc(gz.zeit)}`:""}</small></span></div>
    ${o.lf?`<div class="tpu-lf">${o.lfKlein?`<small>${esc(o.lfKlein)}</small>`:""}${esc(o.lf)}</div>`:""}
    <button type="button" class="tpu-start" id="tpu-start" onclick="taOpen()"><span aria-hidden="true">▶</span> Training starten</button>
    <div class="tpu-zweit"><button type="button" id="tps-zeigen" onclick="tpStartZeigen('${esc(datum)}')">✏️ Plan ändern</button><button type="button" id="tpu-gruppen" onclick="if(typeof tgOpen==='function')tgOpen()">👥 Gruppen</button></div>
    ${o.hinweis||""}
    <ol class="tpu-liste">${bl.map(zeile).join("")}</ol>
  </section>`;
}
async function tpStartSpeichern(){
  const k=document.getElementById("tps-speichern"); if(k)k.disabled=true;
  try{ if(typeof tpPlanSave==="function")await tpPlanSave(true); }
  finally{ if(k)k.disabled=false; }
  const d=document.getElementById("tp-date")?.value; if(d)_tpsLageMerken(d);
  tpStartHerz();
}
/* Andere Leitfrage: gibt es eine Vorwoche, steht sie als eigener Weg da; die Wahl selbst ist der vertraute Vorlagen-Dialog,
   gefiltert auf die Leitfrage (dort stehen die Einheiten der Folge, „Auf den Termin setzen“ bzw. „Plan ersetzen“). */
async function tpStartLeitfrage(datum){
  if(typeof vorlageUebernehmenOpen!=="function"){ toast("Die Vorlagen laden noch – gleich nochmal","err"); return; }
  const vw=await _tpsVorwoche(datum);
  if(!vw){ vorlageUebernehmenOpen(); return; }
  document.getElementById("tps-modal")?.remove();
  const m=document.createElement("div"); m.id="tps-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Andere Leitfrage");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("tps-modal","🔁","Andere Leitfrage","Heute ein anderes Thema oder die Vorwoche festigen","var(--fam-training)")}
    <button type="button" class="tps-weg tps-weg-breit" id="tps-vorwoche" onclick="tpStartVorwoche()"><span class="tps-i" aria-hidden="true">🔁</span><b>Vorwoche wiederholen</b><small>${esc(vw)}</small></button>
    <button type="button" class="tps-weg tps-weg-breit" id="tps-wahl" onclick="document.getElementById('tps-modal').remove();vorlageUebernehmenOpen()"><span class="tps-i" aria-hidden="true">🎯</span><b>Leitfrage wählen</b><small>alle sechs Leitfragen mit ihren Einheiten</small></button>
  </div>`;
  m.dataset.lf=vw;
  document.body.appendChild(m);
}
async function tpStartVorwoche(){
  const m=document.getElementById("tps-modal"), lf=m?m.dataset.lf:""; if(m)m.remove();
  await vorlageUebernehmenOpen();
  if(lf&&typeof _vuFilter!=="undefined"){ _vuFilter.leitfrage=lf; _vuAuswahl=null; if(typeof vorlageUebernehmenRender==="function")vorlageUebernehmenRender(); }
}
/* Nach dem Öffnen eines Termins: Zu- und Absagen seit dem Speichern? Dann passt sich der Plan selbst an – nur vor dem
   Einfrieren, nur an heutigen und künftigen Terminen und nicht erneut, wenn der Trainer genau diesen Stand zurückgenommen hat. */
function _tpsSchluessel(v){ return `${v.kinderZahl}|${(v.trainer||[]).slice().sort().join(",")}|${(v.raus||[]).slice().sort().join(",")}|${(v.rein||[]).slice().sort().join(",")}`; }
async function tpStartAuto(datum){
  if(!datum||datum<(typeof isoLokal==="function"?isoLokal():datum)||_tpsEingefroren(datum)||!_tpsHatPlan())return false;
  if(typeof tpAnpassenVorschlag!=="function"||typeof tpAnpassenUebernehmen!=="function")return false;
  let v; try{ v=tpAnpassenVorschlag(); }catch(e){ return false; }
  if(!v||v.fehler||v.nichts)return false;
  let nein=""; try{ nein=localStorage.getItem("tps_nein_"+datum)||""; }catch(e){}
  if(nein===_tpsSchluessel(v))return false;
  _tpsRueck={datum,plan:tpPlanEntries(),slots:tpSlotsMitZuordnung(),tg:(typeof tgFor==="function"&&tgFor())?JSON.parse(JSON.stringify(tgFor())):null,schluessel:_tpsSchluessel(v)};
  window._tpAnpassen=v;
  let r=null; try{ r=await tpAnpassenUebernehmen(); }catch(e){ _tpsRueck=null; return false; }
  const grund=[]; if(v.raus.length)grund.push(`${v.raus.length} ${v.raus.length===1?"Absage":"Absagen"}`); if(v.rein.length)grund.push(`${v.rein.length} ${v.rein.length===1?"Zusage":"Zusagen"}`);
  const was=[]; if(v.nachher!==v.vorher)was.push(`${v.nachher} statt ${v.vorher} Felder`);
  const getauscht=r&&r.getauscht||0; if(getauscht)was.push(`${getauscht===1?"eine Übung":getauscht+" Übungen"} getauscht`);
  if(!was.length)was.push(`Gruppen neu: ${v.kinderZahl} Kinder`);
  _tpsHinweis={datum,text:`Angepasst${grund.length?" wegen "+grund.join(" und "):""}: ${was.join(" · ")}.`};
  return true;
}
async function tpStartRueckgaengig(){
  const s=_tpsRueck; if(!s)return;
  const datum=s.datum;
  try{ localStorage.setItem("tps_nein_"+datum,s.schluessel); }catch(e){}
  try{
    if(typeof tpPlanFremdGeschrieben==="function")tpPlanFremdGeschrieben(datum);
    const von=(typeof trainerMe==="function")?(await trainerMe()||null):null;
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({datum,plan:s.plan,slots:s.slots,gespeichert_von:von,updated_at:new Date().toISOString()})});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){ toast(`Nicht zurückgenommen – Server antwortet ${r.status}`,"err"); return; }
    if(typeof TP_STAND!=="undefined")delete TP_STAND[datum];
    if(s.tg&&typeof tgSave==="function")tgSave(s.tg);
  }catch(e){ toast("Kein Netz – nicht zurückgenommen","err"); return; }
  _tpsRueck=null; _tpsHinweis=null;
  toast("↩️ Wie vorher – der Plan bleibt so, bis sich wieder etwas ändert");
  if(typeof tpPlanRestore==="function")await tpPlanRestore(datum);
}
/* Angepasst wird nur, wenn sich seit dem letzten Öffnen auf diesem Gerät Kinder- oder Trainerzahl geändert haben –
   ein Plan, den man zum ersten Mal sieht, bleibt, wie er gespeichert wurde (wer ihn gebaut hat, kannte die Lage). */
function _tpsLage(){
  let tr=[]; try{ tr=(typeof tpGetCheckedTrainers==="function")?tpGetCheckedTrainers().slice().sort():[]; }catch(e){}
  return `${_tpsKinder()}|${tr.join(",")}`;
}
function _tpsLageMerken(datum){ try{ localStorage.setItem("tps_lage_"+datum,_tpsLage()); }catch(e){} }
async function tpStartNachLaden(datum){
  if(!document.getElementById("tp-start"))return;
  if(_tpsHinweis&&_tpsHinweis.datum!==datum){ _tpsHinweis=null; _tpsRueck=null; }
  let vorher=""; try{ vorher=localStorage.getItem("tps_lage_"+datum)||""; }catch(e){}
  if(vorher&&vorher!==_tpsLage()){ try{ await tpStartAuto(datum); }catch(e){} }
  if(_tpsHatPlan())_tpsLageMerken(datum);
  await tpStartRender(datum);
}
/* Kleiner Gruß nach dem Speichern: ein Herz fliegt hoch, dazu ein Satz mit dem Vornamen des angemeldeten Trainers. */
const TPS_GRUESSE=["Danke, {n}! Die Kinder freuen sich.","Stark, {n} – das wird ein gutes Training.","Plan steht, {n}. Viel Spaß auf dem Platz!","Merci, {n}! Ohne dich kein Training.","Top, {n}! Jetzt nur noch Bälle aufpumpen."];
async function tpStartHerz(){
  let name=""; try{ name=String((typeof trainerMe==="function"?await trainerMe():"")||"").trim(); }catch(e){}
  const vn=name.split(/\s+/)[0]||"";
  const satz=TPS_GRUESSE[Math.floor(Math.random()*TPS_GRUESSE.length)].replace("{n}",vn||"Trainer");
  if(typeof freudeHerz==="function")freudeHerz(satz);   // v942: gemeinsam mit der Eltern-App (core.js)
  if(typeof freudeMeilenstein==="function"&&name)setTimeout(()=>freudeMeilenstein("trainer",name),2700);
}

/* ═══ v952 · Trainingsansicht (Charles 22.11., Bild freigegeben) ═══
   „Evtl. müssen wir über eine Trainingsansicht nachdenken, auf der nur die Übungen aufgelistet sind mit den Infos zu den Übungen.
   Vielleicht auch nur die, die der jeweilige Trainer in der Planung zugewiesen hat. Die anderen Hauptteile sind vorerst
   ausgeblendet. Vielleicht auch mit einem kleinen Countdown bzw. einer Stoppuhr.“
   Läuft auf dem eigenen Handy ohne Netz und ohne Warten auf die anderen (Uhr nach Date.now, übersteht Sperrbildschirm);
   „Gemeinsam starten“ (tlStart, alle Handys im Takt) bleibt als Link. Dieselben Stationen wie der Trainingsstart (_tlSnapshot). */
let _ta=null;
function _taFmt(s){ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
function _taRest(){ if(!_ta)return 0; const st=_ta.st[_ta.i]; const ges=(st?st.dauer*60:0)+_ta.extra; const lauf=_ta.acc+(_ta.laeuft?(Date.now()-_ta.seit)/1000:0); return ges-lauf; }
function _taUebung(name){
  try{ const i=(typeof tfIndexVon==="function")?tfIndexVon({formName:String(name||"")}):-1; return i>=0?tpAllForms()[i]:null; }catch(e){ return null; }
}
function _taPunkte(text,max){
  return String(text||"").split(/\n+|(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/).map(x=>x.trim()).filter(Boolean).slice(0,max||4);
}
async function taOpen(){
  let st=[]; try{ st=(typeof _tlSnapshot==="function")?_tlSnapshot():[]; }catch(e){}
  if(!st.length){ toast("Erst Blöcke mit Übungen planen","err"); return; }
  let ich=_tpuIch(); if(!ich&&typeof trainerMe==="function"){ try{ ich=await trainerMe()||""; }catch(e){} }
  _ta={st,i:0,laeuft:false,seit:0,acc:0,extra:0,ich,alle:false,uhr:{laeuft:false,seit:0,acc:0},gepfiffen:-1};
  document.getElementById("ta-ov")?.remove();
  const ov=document.createElement("div"); ov.id="ta-ov"; ov.className="ta-ov";
  ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Trainingsansicht");
  document.body.appendChild(ov);
  _taRender();
  _ta.tick=setInterval(_taTick,500);
  try{ if(navigator.wakeLock)_ta.lock=await navigator.wakeLock.request("screen"); }catch(e){}
  ov.querySelector(".ta-haupt")?.focus();
}
function taSchliessen(){
  if(_ta){ clearInterval(_ta.tick); try{ _ta.lock&&_ta.lock.release(); }catch(e){} }
  _ta=null; document.getElementById("ta-ov")?.remove();
  document.getElementById("tpu-start")?.focus();
}
function _taTick(){
  if(!_ta||!document.getElementById("ta-ov")){ if(_ta)clearInterval(_ta.tick); return; }
  const r=_taRest();
  if(_ta.laeuft&&r>0&&typeof uhrRest==="function")uhrRest(r,"in dieser Übung");   // v975
  if(_ta.laeuft&&r>0&&typeof einzelRollTick==="function"){ const st=_ta.st[_ta.i]||{}, roll=(st.gruppen||[]).map(g=>g&&g.roll).find(Boolean); if(roll)einzelRollTick(roll,st.dauer*60+_ta.extra-r,st.dauer*60+_ta.extra,_ta,_ta.i); }   // v977
  if(_ta.laeuft&&r<=0&&_ta.gepfiffen!==_ta.i){ _ta.gepfiffen=_ta.i; try{ if(typeof stTimerWhistle==="function")stTimerWhistle(); }catch(e){} }
  const u=document.getElementById("ta-uhr"); if(u){ u.textContent=r<=0&&_ta.laeuft?"Abpfiff!":_taFmt(r); u.classList.toggle("ta-aus",r<=0&&_ta.laeuft); }
  const b=document.getElementById("ta-bis"); if(b)b.textContent=_taBisText(r);
  const sw=document.getElementById("ta-sw"); if(sw){ const x=_ta.uhr; sw.textContent=_taFmt(x.acc+(x.laeuft?(Date.now()-x.seit)/1000:0)); }
}
function _taBisText(r){
  if(!_ta.laeuft)return _ta.acc?"pausiert":"tippe auf Start";
  const d=new Date(Date.now()+Math.max(0,r)*1000);
  return "noch · bis "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}
function taStartPause(){ if(!_ta)return; if(_ta.laeuft){ _ta.acc+=(Date.now()-_ta.seit)/1000; _ta.laeuft=false; } else { _ta.seit=Date.now(); _ta.laeuft=true; } _taRender(); }
function taPlusMinute(){ if(!_ta)return; _ta.extra+=60; if(_taRest()>0)_ta.gepfiffen=-1; _taTick(); }
function taWeiter(richtung){
  if(!_ta)return; const n=_ta.i+(richtung||1);
  if(n<0)return;
  if(n>=_ta.st.length){ _ta.i=_ta.st.length; _ta.laeuft=false; _taRender(); return; }
  const lief=_ta.laeuft; _ta.i=n; _ta.acc=0; _ta.extra=0; _ta.seit=Date.now(); _ta.laeuft=lief; _ta.gepfiffen=-1; _taRender();
  document.getElementById("ta-ov")?.scrollTo({top:0});
}
function taAlleUmschalten(){ if(!_ta)return; _ta.alle=!_ta.alle; _taRender(); }
function taUhr(aktion){ if(!_ta)return; const x=_ta.uhr; if(aktion==="reset"){ _ta.uhr={laeuft:false,seit:0,acc:0}; } else if(x.laeuft){ x.acc+=(Date.now()-x.seit)/1000; x.laeuft=false; } else { x.seit=Date.now(); x.laeuft=true; } _taRender(); }
function taGemeinsam(){ taSchliessen(); if(typeof tlStart==="function")tlStart(); }
function _taKarte(g,eigen){
  const f=_taUebung(g.uebung);
  let skizze=""; try{ const sp=f&&typeof skzSpecVon==="function"?skzSpecVon(f):null; if(sp&&typeof _skz==="function")skizze=_skz(sp); }catch(e){}
  const meta=[f&&f.spieler?"👥 "+f.spieler:"",f&&f.feld?"📐 "+f.feld:"",f&&f.material?"🎒 "+f.material:""].filter(Boolean);
  const so=_taPunkte(f&&(f.ablauf||f.kurz),4), achten=_taPunkte(f&&f.coaching,4);
  return `<article class="ta-karte${eigen?" ta-eigen":""}">
    <div class="ta-kl">${g.gruppe?esc(g.gruppe)+" · ":""}${g.kinder&&g.kinder.length?g.kinder.length+" Kinder · ":""}${eigen?"Deine Übung":"🧢 "+esc(g.trainer)}</div>
    <h2>${esc(g.uebung)}</h2>
    ${skizze?`<div class="ta-skizze">${skizze}</div>`:""}
    ${meta.length?`<div class="ta-meta">${meta.map(m=>`<span>${esc(m)}</span>`).join("")}</div>`:""}
    ${so.length?`<h3>So geht’s</h3><ul>${so.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    ${achten.length?`<h3>Worauf achten</h3><ul>${achten.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    ${f&&f.varianten?`<details class="ta-var"><summary>Leichter / schwerer</summary><p>${esc(f.varianten)}</p></details>`:""}
    ${g.kinder&&g.kinder.length?`<h3>Kinder</h3><div class="ta-kids">${g.kinder.map(k=>`<span>${esc(k)}</span>`).join("")}</div>`:""}
    ${f&&typeof tlUebungZeigen==="function"?`<button type="button" class="ta-ganz" data-name="${esc(g.uebung)}" onclick="tlUebungZeigen(this.dataset.name)">Ganze Übung ansehen</button>`:""}
  </article>`;
}
function _taRender(){
  const ov=document.getElementById("ta-ov"); if(!ov||!_ta)return;
  const n=_ta.st.length, kopfX=`<button type="button" class="ta-x" onclick="taSchliessen()" aria-label="Trainingsansicht schließen">✕</button>`;
  if(_ta.i>=n){
    ov.innerHTML=`<div class="ta-haupt" tabindex="-1"><div class="ta-top"><span>🏁 Training geschafft</span>${kopfX}</div>
      <div class="ta-ende"><div style="font-size:64px" aria-hidden="true">🎉</div><b>Gut gemacht!</b><p>Denkt an die Nachbereitung – jeder bewertet seine eigenen Übungen.</p>
      <button type="button" class="ta-p" onclick="taSchliessen()">Fertig</button></div></div>`;
    return;
  }
  const st=_ta.st[_ta.i], ich=_ta.ich;
  const meine=st.gruppen.filter(g=>g.trainer===ich||g.trainer==="Alle"||!g.gruppe&&st.gruppen.length===1);
  const zeigen=_ta.alle||!meine.length?st.gruppen:meine;
  const andere=st.gruppen.length-meine.length;
  const naechst=_ta.st[_ta.i+1];
  const nMeine=naechst?(naechst.gruppen.find(g=>g.trainer===ich)||naechst.gruppen[0]):null;
  const r=_taRest();
  ov.innerHTML=`<div class="ta-haupt" tabindex="-1">
    <div class="ta-top"><span>🏃 ${esc(st.label)} · Block ${_ta.i+1} von ${n}</span>${kopfX}</div>
    <div class="ta-prog" aria-hidden="true">${_ta.st.map((x,i)=>`<div class="${i<_ta.i?"da":i===_ta.i?"jetzt":""}" style="flex:${Math.max(1,x.dauer)}"></div>`).join("")}</div>
    <div class="ta-uhrbox"><div class="ta-uhr${r<=0&&_ta.laeuft?" ta-aus":""}" id="ta-uhr" role="timer" aria-live="off">${r<=0&&_ta.laeuft?"Abpfiff!":_taFmt(r)}</div><div class="ta-bis" id="ta-bis">${esc(_taBisText(r))}</div></div>
    <div class="ta-knoepfe"><button type="button" id="ta-start" onclick="taStartPause()">${_ta.laeuft?"⏸ Pause":"▶ Start"}</button><button type="button" onclick="taPlusMinute()">+1 Min</button><button type="button" class="ta-p" id="ta-weiter" onclick="taWeiter(1)">${_ta.i===n-1?"Fertig ✓":"Weiter ›"}</button></div>
    ${!meine.length&&!_ta.alle?`<div class="ta-hinweis">Dir ist in diesem Block keine Gruppe zugeteilt – hier alle Felder.</div>`:""}
    ${zeigen.map(g=>_taKarte(g,meine.includes(g)&&!!ich&&g.trainer===ich)).join("")}
    ${naechst?`<div class="ta-next"><span aria-hidden="true">⏭</span><div><b>Danach: ${esc(naechst.label)}</b><small>${naechst.dauer} Min${nMeine?" · "+esc(nMeine.uebung):""}</small></div></div>`:""}
    ${andere>0&&meine.length?`<button type="button" class="ta-alle" id="ta-alle" aria-pressed="${_ta.alle}" onclick="taAlleUmschalten()">${_ta.alle?"Nur meine Gruppe":`Andere Gruppen anzeigen (${andere})`}</button>`:""}
    <details class="ta-sw"><summary>⏱ Stoppuhr</summary><div><span id="ta-sw">${_taFmt(_ta.uhr.acc)}</span><button type="button" onclick="taUhr()">${_ta.uhr.laeuft?"⏸":"▶"}</button><button type="button" onclick="taUhr('reset')" aria-label="Stoppuhr zurücksetzen">↺</button></div></details>
    <div class="ta-unten">${_ta.i>0?`<button type="button" class="ta-link" onclick="taWeiter(-1)">‹ Block zurück</button>`:""}<button type="button" class="ta-link" onclick="taGemeinsam()">Gemeinsam starten (alle Handys im Takt)</button></div>
  </div>`;
  const sw=ov.querySelector(".ta-sw"); if(sw&&_ta.swOffen)sw.open=true; if(sw)sw.addEventListener("toggle",()=>{ if(_ta)_ta.swOffen=sw.open; });
}
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&document.getElementById("ta-ov")&&!document.querySelector("#ta-ov ~ [role=dialog]"))taSchliessen(); });
/* ═══ v976: Freier Timer – eine klassische Stoppuhr für Trainer (Charles 26.11.2026) ═══
   Bis hierher lief jeder Timer nur aus einem Zusammenhang (Plan, Matchcard, Turnier). Diese Uhr
   braucht nichts davon: Minuten, Runden und Pause wählen, starten. Die Zeit läuft gegen ein festes
   Ende (Date.now), damit ein gedrosselter Hintergrund-Tab nicht nachgeht. Abpfiff und Restzeit
   gehen über dieselben Wege wie bei den anderen Timern an die Uhr (uhrMeldung, uhrRest). */
const FU_MINUTEN=[1,2,3,5,10,15], FU_RUNDEN=[1,2,3,4,6], FU_PAUSEN=[0,30,60,120];
const FU_WAHL_KEY="adler_fu_wahl";
let _fu=null;
/* Das CSS steht hier, nicht in styles.css: die öffentliche Turnierseite lädt styles.css und hat ein Budget (v899). */
const FU_CSS=`.fu-karte{display:flex;align-items:center;gap:14px;width:100%;margin-top:12px;padding:12px 14px;background:var(--surface);border:2px solid var(--blue);border-radius:16px;color:var(--blue);font-family:inherit;text-align:left;cursor:pointer;min-height:76px}
.fu-karte svg{flex:0 0 auto}
.fu-karte-tx b{display:block;font-size:var(--s-karte);color:var(--text)}
.fu-karte-tx span{font-size:var(--s-text);color:var(--text2)}
#fu-timer{position:fixed;inset:0;z-index:11000;background:#0b1220;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 16px;box-sizing:border-box;overflow-y:auto;text-align:center;font-family:inherit}
#fu-timer .fu-uhr{width:min(68vw,250px);height:auto;flex:0 0 auto}
#fu-timer .fu-lb{font-size:var(--s-klein);letter-spacing:1px;color:#a5b4c8;text-transform:uppercase;margin-top:10px}
#fu-timer .fu-chips{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:6px 0;max-width:420px}
#fu-timer .fu-chip{min-width:48px;min-height:44px;padding:0 10px;border-radius:10px;background:#1e293b;border:1px solid #64748b;color:#fff;font:inherit;font-weight:800;cursor:pointer}
#fu-timer .fu-chip[aria-pressed="true"]{background:#fff;color:#0b1220;border-color:#fff;box-shadow:0 0 0 3px #22c55e}
#fu-timer .fu-eigen input{width:84px;min-height:44px;box-sizing:border-box;border-radius:10px;background:#1e293b;border:1px solid #64748b;color:#fff;font:inherit;font-weight:800;text-align:center}
#fu-timer .fu-eigen.an input{background:#fff;color:#0b1220;box-shadow:0 0 0 3px #22c55e}
#fu-timer .fu-eigen input::placeholder{color:#a5b4c8;font-weight:600}
#fu-timer .fu-start{margin-top:16px;width:100%;max-width:420px;min-height:56px;border:none;border-radius:14px;background:#15803d;color:#fff;font:inherit;font-size:var(--s-teil);font-weight:800;cursor:pointer}
#fu-timer .fu-zu{margin-top:8px;min-height:44px;background:transparent;border:none;color:#cbd5e1;font:inherit;text-decoration:underline;cursor:pointer}
#fu-timer .fu-titel{font-size:26px;font-weight:800;margin:10px 0 4px}
#fu-timer .fu-unter{color:#a5b4c8;font-size:var(--s-text);margin-top:4px}
#fu-timer .fu-reihe{display:flex;gap:8px;width:100%;max-width:440px;margin-top:16px;flex-wrap:wrap}
#fu-timer .fu-k{flex:1 1 30%;min-height:52px;border:none;border-radius:12px;background:#334155;color:#fff;font:inherit;font-weight:700;cursor:pointer;padding:0 8px}
#fu-timer .fu-blau{background:#1a56db}
#fu-timer .fu-rand{background:transparent;border:1px solid #64748b;color:#cbd5e1}
#fu-timer button:focus-visible,#fu-timer input:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
:root[data-theme="dark"] .fu-karte{color:#60a5fa;border-color:#60a5fa}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .fu-karte{color:#60a5fa;border-color:#60a5fa}}`;
function _fuStil(){ if(document.getElementById("fu-stil"))return; const st=document.createElement("style"); st.id="fu-stil"; st.textContent=FU_CSS; document.head.appendChild(st); }
function _fuWahlLaden(){
  let w={min:3,runden:1,pause:30};
  try{ const j=JSON.parse(localStorage.getItem(FU_WAHL_KEY)||"null"); if(j&&typeof j==="object")w=Object.assign(w,j); }catch(e){}
  w.min=Math.min(90,Math.max(1,Math.round(Number(w.min)||3)));
  w.runden=Math.min(20,Math.max(1,Math.round(Number(w.runden)||1)));
  w.pause=Math.min(600,Math.max(0,Math.round(Number(w.pause)||0)));
  return w;
}
function _fuZeit(s){ s=Math.max(0,Math.ceil(s)); const m=Math.floor(s/60), r=s%60; return m+":"+(r<10?"0":"")+r; }
function _fuPauseText(s){ return s?_fuZeit(s):"0"; }
/* Die kleine Uhr im Training-Tab (views.js ruft sie geschützt auf). */
function fuKarteHtml(){
  _fuStil();
  return `<button type="button" class="fu-karte" onclick="fuOpen()" aria-label="Freier Timer öffnen – Minuten und Runden wählen">
    <svg width="54" height="62" viewBox="0 0 62 70" aria-hidden="true" focusable="false"><rect x="25" y="2" width="12" height="7" rx="2" fill="currentColor"/><rect x="28" y="8" width="6" height="6" fill="currentColor"/><rect x="47" y="12" width="9" height="5" rx="2" transform="rotate(40 51 14)" fill="currentColor"/><circle cx="31" cy="41" r="26" fill="var(--surface)" stroke="currentColor" stroke-width="4"/><g stroke="var(--text2)" stroke-width="2"><line x1="31" y1="19" x2="31" y2="24"/><line x1="53" y1="41" x2="48" y2="41"/><line x1="31" y1="63" x2="31" y2="58"/><line x1="9" y1="41" x2="14" y2="41"/></g><line x1="31" y1="41" x2="42" y2="30" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="41" r="3" fill="var(--text)"/></svg>
    <span class="fu-karte-tx"><b>Freier Timer</b><span>Antippen – Minuten und Runden wählen</span></span>
  </button>`;
}
function fuOpen(){
  _fuStil();
  fuStop(true);
  _fu=Object.assign(_fuWahlLaden(),{phase:"wahl",runde:1,ende:0,gesamt:0,rest:0,pausiert:false,timer:null});
  const ov=document.createElement("div"); ov.id="fu-timer"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Freier Timer");
  document.body.appendChild(ov);
  _fuRender();
}
function fuWahl(feld,wert){
  if(!_fu||_fu.phase!=="wahl")return;
  if(feld==="min"){ wert=Math.min(90,Math.max(1,Math.round(Number(wert)||0))); if(!wert)return; }
  _fu[feld]=Number(wert);
  try{ localStorage.setItem(FU_WAHL_KEY,JSON.stringify({min:_fu.min,runden:_fu.runden,pause:_fu.pause})); }catch(e){}
  _fuRender();
}
function _fuPhaseStarten(phase){
  _fu.phase=phase; _fu.gesamt=phase==="pause"?_fu.pause:_fu.min*60;
  _fu.rest=_fu.gesamt; _fu.ende=Date.now()+_fu.gesamt*1000; _fu.pausiert=false;
}
function fuStart(){
  if(!_fu)return;
  _fu.runde=1; _fuPhaseStarten("lauf");
  if(_fu.timer)clearInterval(_fu.timer);
  _fu.timer=setInterval(_fuTick,250);
  try{ if(typeof requestWakeLock==="function")requestWakeLock(); }catch(e){}
  _fuRender();
}
function _fuSignal(titel,text){
  try{ if(typeof rotBeep==="function"){ rotBeep(); setTimeout(rotBeep,260); } }catch(e){}
  try{ navigator.vibrate&&navigator.vibrate([120,80,120]); }catch(e){}
  try{ if(typeof uhrMeldung==="function")uhrMeldung(titel,text); }catch(e){}
}
function _fuTick(){
  if(!_fu||_fu.pausiert||(_fu.phase!=="lauf"&&_fu.phase!=="pause"))return;
  _fu.rest=Math.max(0,(_fu.ende-Date.now())/1000);
  if(_fu.rest<=0){ _fuWeiter(); return; }
  try{ if(typeof uhrRest==="function")uhrRest(_fu.rest,_fu.phase==="pause"?"Pause":"in dieser Runde"); }catch(e){}
  _fuRender();
}
/* Phase beenden: nach einer Runde Pause oder nächste Runde, nach der letzten Schluss. */
function _fuWeiter(){
  if(!_fu)return;
  if(_fu.phase==="lauf"){
    if(_fu.runde>=_fu.runden){ _fuSignal("⏱️ Abpfiff","Die Zeit ist um."); _fu.phase="fertig"; if(_fu.timer){clearInterval(_fu.timer);_fu.timer=null;} try{ if(typeof releaseWakeLock==="function")releaseWakeLock(); }catch(e){} _fuRender(); return; }
    if(_fu.pause>0){ _fuSignal("⏸ Pause","Runde "+_fu.runde+" ist um – "+_fuZeit(_fu.pause)+" Pause."); _fuPhaseStarten("pause"); _fuRender(); return; }
  }
  _fu.runde++; _fuSignal("▶ Runde "+_fu.runde,"Weiter geht's – Runde "+_fu.runde+" von "+_fu.runden+".");
  _fuPhaseStarten("lauf"); _fuRender();
}
function fuNaechste(){ if(_fu&&(_fu.phase==="lauf"||_fu.phase==="pause"))_fuWeiter(); }
function fuPause(){
  if(!_fu||(_fu.phase!=="lauf"&&_fu.phase!=="pause"))return;
  if(_fu.pausiert){ _fu.ende=Date.now()+_fu.rest*1000; _fu.pausiert=false; }
  else{ _fu.rest=Math.max(0,(_fu.ende-Date.now())/1000); _fu.pausiert=true; }
  _fuRender();
}
function fuStop(still){
  if(_fu&&_fu.timer)clearInterval(_fu.timer);
  const offen=!!document.getElementById("fu-timer");
  document.getElementById("fu-timer")?.remove();
  if(_fu&&_fu.phase!=="wahl"&&offen&&!still){ try{ if(typeof releaseWakeLock==="function")releaseWakeLock(); }catch(e){} }
  _fu=null;
}
function _fuUhrSvg(anteil,farbe,gross,klein){
  const C=603.19, off=(C*(1-Math.max(0,Math.min(1,anteil)))).toFixed(1);
  return `<svg class="fu-uhr" viewBox="0 0 250 280" aria-hidden="true" focusable="false"><rect x="104" y="4" width="42" height="20" rx="5" fill="#94a3b8"/><rect x="115" y="22" width="20" height="16" fill="#94a3b8"/><rect x="196" y="40" width="30" height="14" rx="4" transform="rotate(40 211 47)" fill="#94a3b8"/>
    <circle cx="125" cy="160" r="112" fill="#111a2e" stroke="#94a3b8" stroke-width="8"/>
    <circle cx="125" cy="160" r="96" fill="none" stroke="#1e293b" stroke-width="12"/>
    <circle class="fu-ring" cx="125" cy="160" r="96" fill="none" stroke="${farbe}" stroke-width="12" stroke-linecap="round" stroke-dasharray="603.19" stroke-dashoffset="${off}" transform="rotate(-90 125 160)"/>
    <text x="125" y="${klein?172:178}" text-anchor="middle" font-size="58" font-weight="900" fill="#fff" font-family="inherit">${esc(gross)}</text>
    ${klein?`<text x="125" y="206" text-anchor="middle" font-size="15" fill="#94a3b8" font-family="inherit">${esc(klein)}</text>`:""}</svg>`;
}
function _fuChips(feld,werte,aktiv,txt){
  return `<div class="fu-chips" role="group">${werte.map(w=>`<button type="button" class="fu-chip" aria-pressed="${w===aktiv}" onclick="fuWahl('${feld}',${w})">${esc(txt?txt(w):String(w))}</button>`).join("")}</div>`;
}
function _fuRender(){
  const ov=document.getElementById("fu-timer"); if(!ov||!_fu)return;
  const f=_fu;
  if(f.phase==="wahl"){
    const eigen=FU_MINUTEN.indexOf(f.min)<0;
    ov.innerHTML=`${_fuUhrSvg(1,"#22c55e",_fuZeit(f.min*60),f.runden>1?"Runde 1 von "+f.runden:"")}
      <div class="fu-lb" id="fu-lb-min">Minuten</div>
      <div class="fu-chips" role="group" aria-labelledby="fu-lb-min">${FU_MINUTEN.map(w=>`<button type="button" class="fu-chip" aria-pressed="${w===f.min}" onclick="fuWahl('min',${w})">${w}</button>`).join("")}
        <label class="fu-eigen${eigen?" an":""}"><input type="number" aria-label="Eigene Minuten (1 bis 90)" inputmode="numeric" min="1" max="90" value="${eigen?f.min:""}" placeholder="eigene" onchange="fuWahl('min',this.value)"></label></div>
      <div class="fu-lb">Runden</div>${_fuChips("runden",FU_RUNDEN,f.runden)}
      ${f.runden>1?`<div class="fu-lb">Pause dazwischen</div>${_fuChips("pause",FU_PAUSEN,f.pause,_fuPauseText)}`:""}
      <button type="button" class="fu-start" onclick="fuStart()">▶ Start</button>
      <button type="button" class="fu-zu" onclick="fuStop()">Schließen</button>`;
    return;
  }
  if(f.phase==="fertig"){
    ov.innerHTML=`<div style="font-size:60px" aria-hidden="true">🏁</div><div class="fu-titel">Zeit ist um</div>
      <div class="fu-unter">${f.runden>1?f.runden+" Runden à "+_fuZeit(f.min*60):_fuZeit(f.min*60)+" gelaufen"}</div>
      <div class="fu-reihe"><button type="button" class="fu-k fu-blau" onclick="fuOpen()">↺ Nochmal</button><button type="button" class="fu-k fu-rand" onclick="fuStop()">✕ Schließen</button></div>`;
    return;
  }
  const pause=f.phase==="pause";
  const kopf=pause?"Pause":(f.runden>1?"Runde "+f.runde+" von "+f.runden:"Läuft");
  const unten=pause?"Gleich Runde "+(f.runde+1)+" von "+f.runden:(f.runde<f.runden&&f.pause?"danach "+_fuZeit(f.pause)+" Pause":"");
  ov.innerHTML=`<div class="fu-lb" style="margin:0 0 4px" aria-live="polite">${esc(kopf)}${f.pausiert?" · ⏸ angehalten":""}</div>
    ${_fuUhrSvg(f.gesamt?f.rest/f.gesamt:0,pause?"#f59e0b":(f.rest<=10?"#ef4444":"#22c55e"),_fuZeit(f.rest),pause?"Pause":"")}
    ${unten?`<div class="fu-unter">${esc(unten)}</div>`:""}
    <div class="fu-reihe">
      <button type="button" class="fu-k" onclick="fuPause()">${f.pausiert?"▶ Weiter":"⏸ Pause"}</button>
      <button type="button" class="fu-k fu-blau" onclick="fuNaechste()">⏭ ${pause?"Pause vorbei":"Nächste"}</button>
      <button type="button" class="fu-k fu-rand" onclick="fuStop()">✕ Stopp</button>
    </div>`;
}
function blockModulDa(){ return true; }
