/* ═══════════════════════════════════════════════════════════════════════════
   v506 – EINHEIT IMPORTIEREN (Welle 2, nur Trainer)

   Eine fertig konzipierte Trainingseinheit kommt als JSON in einem Rutsch in die App:
   neue Übungen anlegen, Phasenstruktur setzen, Plan für das Datum speichern. Bisher ging
   das nur klickweise über den Trainingsplan.

   Der Import baut KEINE zweite Planungsoberfläche. Er schreibt in genau die Strukturen,
   die der bestehende Trainingsplan liest: `slots` (Phasen) und `plan` (Übungszuordnung)
   in der Tabelle `trainingsplan`, dazu die neue Spalte `kopf`.

   ── Die Falle, um die sich hier alles dreht ──────────────────────────────────
   `plan[i].formIdx` ist ein INDEX in `tpAllForms()` = TRAININGSFORMEN (data.js) plus
   CUSTOM_FORMS (Tabelle `trainingsformen`, Reihenfolge = Antwortreihenfolge von
   PostgREST). Ein Index aus einer fremden Datei bedeutet hier also etwas anderes als
   dort – und `tpPlanRestore()` wirft Einträge weg, deren Index ins Leere zeigt.
   Deshalb steht im Import-JSON kein Index, sondern ein NAME, und der Index wird erst
   aufgelöst, nachdem die neuen Übungen angelegt und `loadCustomForms()` gelaufen ist.
   Die Prüfung `v506-einheit-import.js` hält genau das dauerhaft fest.
   ═══════════════════════════════════════════════════════════════════════════ */
const EI_SCHEMA="adler-einheit/1";
/* Bekannte Phasen-Typen. „Ausklang“ kommt als typ „abschluss“ mit eigenem Label – ein
   eigener Typ würde die Gruppenlogik in tpPlanEntries() durchschneiden, wo nur
   warmup, abschluss und tw als gruppenlos gelten. */
const EI_TYPEN=["warmup","main","abschluss","tw","individual"];
/* Farben stehen NICHT im JSON: sie gehören zur Darstellung, nicht zur Einheit.
   Der zweite und jeder weitere Hauptteil bekommt Violett wie in TP_PHASEN. */
const EI_FARBEN={warmup:"#059669",main:"#1a56db",main_weiter:"#7c3aed",abschluss:"#c2410c",tw:"#854d0e",individual:"#0e7490"};
let _eiGeprueft=null;      // {daten, bloecke:[{...,neu:bool}], planDa:bool}

function einheitImportClose(){ document.getElementById("ei-modal")?.remove(); _eiGeprueft=null; }

function einheitImportOpen(){
  document.getElementById("ei-modal")?.remove();
  _eiGeprueft=null;
  const m=document.createElement("div");
  m.id="ei-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Einheit importieren");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)einheitImportClose(); };
  const fld="box-sizing:border-box;width:100%;padding:10px;border:var(--border-s);border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:var(--surface2);color:var(--text)";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("ei-modal","📥","Einheit importieren","Fertige Einheit als JSON – Übungen, Phasen und Plan in einem Schritt","#16a34a")}
    <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:8px">
      Format <b>${esc(EI_SCHEMA)}</b>. Der Import legt fehlende Übungen an, setzt die Phasen und speichert den Plan für das Datum.
      Kinder und Torhüter werden <b>nicht</b> zugeteilt – das bleibt im Trainingsplan.
    </div>
    <textarea id="ei-json" rows="10" placeholder='{ "schema": "${EI_SCHEMA}", "datum": "2026-09-15", … }' style="${fld};resize:vertical"></textarea>
    <div id="ei-melde" style="margin-top:10px"></div>
    <div id="ei-vorschau" style="margin-top:10px"></div>
    <button id="ei-haupt" onclick="einheitImportPruefen()" class="btn btn-p" style="width:100%;min-height:56px;margin-top:12px;justify-content:center;font-size:15px"><i class="ti ti-checkup-list"></i>Prüfen</button>
    <button onclick="einheitImportClose()" class="btn" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>
  </div>`;
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById("ei-json")?.focus(),60);
}

/* Farbe aus dem Typ – der wievielte Hauptteil es ist, entscheidet über Blau oder Violett. */
function _eiFarbe(typ,mainNr){
  if(typ==="main")return mainNr<=1?EI_FARBEN.main:EI_FARBEN.main_weiter;
  return EI_FARBEN[typ]||EI_FARBEN.main;
}
/* Die Übungs-Auswahl ist im Trainingsplan je Phase GEFILTERT (tpFilteredOpts in boot.js):
   Aufwärmen zeigt nur „aufwaermen“, Torwart nur „torwart“, Einzeltraining nur „individual“,
   der Hauptteil alles Übrige. Eine Übung mit unpassender Kategorie ließe sich dort gar nicht
   einsetzen – und tpPlanRestore() legte sie mangels passendem Feld in die nächste freie
   FREMDE Phase. Deshalb wird die Kategorie geprüft, bevor irgendetwas geschrieben wird.
   Diese Tabelle ist eine Spiegelung; die Prüfung v506 hält sie gegen tpFilteredOpts fest,
   damit sie nicht unbemerkt auseinanderläuft. */
const EI_KAT_PHASE={warmup:"aufwaermen",tw:"torwart",individual:"individual"};
function _eiKatPasst(typ,kat){
  const k=String(kat||"technik");
  if(EI_KAT_PHASE[typ])return k===EI_KAT_PHASE[typ];
  if(typ==="main")return !["aufwaermen","torwart","individual"].includes(k);
  return true;
}
/* Namensvergleich wie ihn ein Mensch erwartet: getrimmt, Groß-/Kleinschreibung egal. */
function _eiNorm(s){ return String(s||"").trim().toLowerCase(); }
function _eiFormIndex(name){
  const n=_eiNorm(name);
  return (typeof tpAllForms==="function"?tpAllForms():[]).findIndex(f=>_eiNorm(f&&f.name)===n);
}
/* Prüfen gibt IMMER eine Liste im Klartext zurück – jeder Fehler mit Blocknummer.
   Solange sie nicht leer ist, wird nichts geschrieben. */
function _eiPruefung(text){
  const fehler=[];
  let d=null;
  try{ d=JSON.parse(text); }
  catch(e){ return {fehler:["Das ist kein gültiges JSON: "+e.message]}; }
  if(!d||typeof d!=="object"||Array.isArray(d))return {fehler:["Die oberste Ebene muss ein Objekt sein."]};
  if(d.schema!==EI_SCHEMA)fehler.push(`Feld „schema“ muss „${EI_SCHEMA}“ sein${d.schema?(" – gefunden: „"+String(d.schema)+"“"):" – es fehlt"}.`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d.datum||"")))fehler.push("Feld „datum“ fehlt oder ist nicht im Format JJJJ-MM-TT.");
  const bl=Array.isArray(d.bloecke)?d.bloecke:[];
  if(!bl.length)fehler.push("Es braucht mindestens einen Block in „bloecke“.");
  bl.forEach((b,i)=>{
    const nr=i+1;
    if(!b||typeof b!=="object"){ fehler.push(`Block ${nr}: kein Objekt.`); return; }
    if(!String(b.label||"").trim())fehler.push(`Block ${nr}: „label“ fehlt.`);
    if(!EI_TYPEN.includes(b.typ))fehler.push(`Block ${nr}: „typ“ ist „${b.typ==null?"":String(b.typ)}“ – erlaubt sind ${EI_TYPEN.join(", ")}.`);
    const dau=Number(b.dauer);
    if(!isFinite(dau)||dau<=0)fehler.push(`Block ${nr}: „dauer“ muss eine Zahl größer als 0 sein.`);
    if(b.uebung&&!String(b.uebung.name||"").trim())fehler.push(`Block ${nr}: die Übung hat keinen Namen.`);
    /* Der Abschluss ist im Trainingsplan freies Spiel und hat gar kein Übungsfeld. Ein
       Eintrag dafür würde beim Wiederherstellen in eine FREMDE Phase rutschen, weil
       tpPlanRestore() ohne passendes Label auf das nächste freie Feld ausweicht. Lieber
       hier sagen als dort still danebenlegen. */
    if(b.uebung&&b.typ==="abschluss")fehler.push(`Block ${nr}: der Abschluss ist freies Spiel und hat im Trainingsplan kein Feld für eine Übung – bitte die Übung weglassen.`);
    if(b.uebung&&String(b.uebung.name||"").trim()&&b.typ&&b.typ!=="abschluss"&&EI_TYPEN.includes(b.typ)){
      const idx=_eiFormIndex(b.uebung.name);
      const kat=idx>=0?((tpAllForms()[idx]||{}).kat||"technik"):(b.uebung.kat||"technik");
      if(!_eiKatPasst(b.typ,kat)){
        const soll=EI_KAT_PHASE[b.typ]?("nur Übungen der Kategorie „"+EI_KAT_PHASE[b.typ]+"“"):"keine Aufwärm-, Torwart- oder Einzeltrainings-Übungen";
        fehler.push(`Block ${nr}: „${b.uebung.name}“ hat die Kategorie „${kat}“ und passt nicht in eine Phase vom Typ „${b.typ}“ – dort stehen ${soll}.`);
      }
    }
  });
  return {fehler,daten:d};
}
function _eiMelde(el,zeilen,art){
  const rot=art==="err";
  el.innerHTML=`<div style="background:${rot?"var(--red-bg)":"var(--green-bg)"};border:1px solid ${rot?"var(--red)":"var(--green)"};border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.55;color:${rot?"var(--red)":"var(--green)"}">
    <b>${rot?"Bitte noch korrigieren:":"Alles in Ordnung"}</b>
    ${zeilen.length?`<ul style="margin:6px 0 0;padding-left:18px">${zeilen.map(z=>`<li style="margin-bottom:3px">${esc(z)}</li>`).join("")}</ul>`:""}
  </div>`;
}
async function einheitImportPruefen(){
  const box=document.getElementById("ei-melde"), vor=document.getElementById("ei-vorschau"), haupt=document.getElementById("ei-haupt");
  if(!box||!vor)return;
  vor.innerHTML=""; _eiGeprueft=null;
  if(haupt){ haupt.onclick=einheitImportPruefen; haupt.innerHTML='<i class="ti ti-checkup-list"></i>Prüfen'; }
  const text=document.getElementById("ei-json")?.value||"";
  if(!text.trim()){ _eiMelde(box,["Bitte zuerst das JSON einfügen."],"err"); return; }
  const {fehler,daten}=_eiPruefung(text);
  if(fehler.length){ _eiMelde(box,fehler,"err"); return; }
  /* Steht für dieses Datum schon ein Plan, wird er nie stillschweigend überschrieben:
     die Hauptaktion heißt dann „Plan ersetzen“ und die Vorschau sagt es deutlich. */
  let planDa=false;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=eq.${encodeURIComponent(daten.datum)}&select=datum`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok)planDa=((await r.json())||[]).length>0;
  }catch(e){}
  const bloecke=(daten.bloecke||[]).map(b=>({...b,neu:!!(b.uebung&&_eiFormIndex(b.uebung.name)<0)}));
  _eiGeprueft={daten,bloecke,planDa};
  _eiMelde(box,[],"ok");
  vor.innerHTML=_eiVorschauHtml(daten,bloecke,planDa);
  if(haupt){
    haupt.onclick=einheitImportUebernehmen;
    haupt.innerHTML=`<i class="ti ti-download"></i>${planDa?"Plan ersetzen":"Übernehmen"}`;
  }
}
function _eiVorschauHtml(d,bloecke,planDa){
  const summe=bloecke.reduce((a,b)=>a+Number(b.dauer||0),0);
  const ziel=Number(d.dauer_min)||0;
  const tag=(()=>{ const x=new Date(d.datum+"T00:00:00"); return isNaN(x)?d.datum:x.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}); })();
  const neu=bloecke.filter(b=>b.neu).length;
  const zeile=(b,i)=>`<div style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--surface2)">
      <span style="font-size:10px;font-weight:800;color:#fff;background:${_eiFarbe(b.typ,bloecke.slice(0,i+1).filter(x=>x.typ==="main").length)};border-radius:6px;padding:3px 7px;white-space:nowrap">${Number(b.dauer)} Min.</span>
      <span style="min-width:0"><b style="font-size:13px">${esc(b.label)}</b>
        <span style="display:block;font-size:11.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.uebung?esc(b.uebung.name):"noch keine Übung – im Trainingsplan wählen"}</span></span>
      ${b.uebung?`<span style="font-size:10px;font-weight:800;border-radius:8px;padding:3px 8px;white-space:nowrap;background:${b.neu?"var(--green-bg)":"var(--surface2)"};color:${b.neu?"var(--green)":"var(--text2)"}">${b.neu?"neu":"vorhanden"}</span>`:'<span></span>'}
    </div>`;
  return `<div style="border:var(--border-s);border-radius:12px;padding:12px">
    <div style="font-size:13.5px;font-weight:800">${esc(tag)}</div>
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${bloecke.length} Blöcke · ${summe} Min.${ziel?(summe===ziel?` (wie geplant)`:` – geplant waren ${ziel}`):""}${neu?` · ${neu} neue Übung${neu===1?"":"en"}`:""}</div>
    ${bloecke.map(zeile).join("")}
    ${d.schwerpunkt?`<div style="font-size:12px;color:var(--text2);margin-top:8px">🎯 ${esc(d.schwerpunkt)}</div>`:""}
    ${planDa?`<div style="background:var(--amber-bg);border:1px solid var(--amber);border-radius:10px;padding:9px 11px;margin-top:10px;font-size:12.5px;color:var(--amber);line-height:1.5">
      ⚠️ Für dieses Datum steht schon ein Plan. <b>Er wird vollständig überschrieben</b> – Phasen, Übungen und Zuordnung.</div>`:""}
  </div>`;
}
/* Eine neue Übung anlegen – Feldbelegung wie in kiCoachSaveForm(), nur mit tags „Import“. */
async function _eiUebungAnlegen(u){
  const form={
    name:String(u.name||"").slice(0,120),
    kat:u.kat||"technik",
    ablauf:u.ablauf||"",
    varianten:u.varianten||"",
    coaching:u.coaching||"",
    spieler:u.spieler||"", feld:u.feld||"", dauer:u.dauer!=null?String(u.dauer):"",
    spass:[1,2,3,4,5].includes(u.spass)?u.spass:5,
    diff:[1,2,3].includes(u.diff)?u.diff:2,
    custom:true, focus:false, tags:"Import",
    kurz:String(u.kurz||u.ablauf||"").slice(0,80),
    skizze:null
  };
  const r=await fetch(`${SB_URL}/rest/v1/trainingsformen`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(form)});
  if(sbCheck401(r))return false;
  return r.ok;
}
/* Der Trainingsplan wählt sein Datum über ein Auswahlfeld aus den Terminen. Ein
   importiertes Datum steht dort nicht zwingend drin – dann kommt es dazu, sonst liefe
   der Sprung ins Leere und der Trainer sähe seinen frischen Plan nicht. */
function _eiDatumSetzen(datum){
  const s=document.getElementById("tp-date"); if(!s)return;
  if(![...s.options].some(o=>o.value===datum)){
    const o=document.createElement("option");
    const x=new Date(datum+"T00:00:00");
    o.value=datum; o.textContent=isNaN(x)?datum:x.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
    s.insertBefore(o,s.firstChild);
  }
  s.value=datum;
}
async function einheitImportUebernehmen(){
  const g=_eiGeprueft;
  const box=document.getElementById("ei-melde");
  if(!g){ if(box)_eiMelde(box,["Bitte zuerst prüfen."],"err"); return; }
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst als Trainer anmelden","err"); return; }
  const haupt=document.getElementById("ei-haupt");
  if(haupt)haupt.disabled=true;
  const {daten,bloecke}=g;
  try{
    // 1) Fehlende Übungen anlegen …
    for(const b of bloecke){
      if(!b.neu||!b.uebung)continue;
      if(!await _eiUebungAnlegen(b.uebung)){
        _eiMelde(box,[`Die Übung „${b.uebung.name}“ konnte nicht angelegt werden. Es wurde kein Plan geschrieben.`],"err");
        if(haupt)haupt.disabled=false; return;
      }
    }
    // 2) … und erst danach nachladen: vorher kennt tpAllForms() sie nicht.
    if(typeof loadCustomForms==="function")await loadCustomForms();
    // 3) Phasen bauen
    let mainNr=0;
    const slots=bloecke.map(b=>{
      if(b.typ==="main")mainNr++;
      return {label:String(b.label).trim(),dauer:Number(b.dauer),farbe:_eiFarbe(b.typ,mainNr),typ:b.typ};
    });
    // 4) Übungen zuordnen – der Index wird JETZT über den Namen aufgelöst.
    const plan=[];
    for(const b of bloecke){
      if(!b.uebung)continue;
      const formIdx=_eiFormIndex(b.uebung.name);
      if(formIdx<0){
        _eiMelde(box,[`Die Übung „${b.uebung.name}“ ist nach dem Anlegen nicht auffindbar. Es wurde kein Plan geschrieben.`],"err");
        if(haupt)haupt.disabled=false; return;
      }
      plan.push({formIdx,formName:tpAllForms()[formIdx].name,trainer:"Alle",slotLabel:String(b.label).trim(),key:`${formIdx}-Alle`});
    }
    const kopf={schwerpunkt:daten.schwerpunkt||"",material:daten.material||"",beobachtung:daten.beobachtung||"",notiz_folge:daten.notiz_folge||""};
    // 5) Upsert – Kopfzeilen und on_conflict exakt wie in tpPlanSave()
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({datum:daten.datum,plan,slots,kopf,updated_at:new Date().toISOString()})});
    if(sbCheck401(r)){ if(haupt)haupt.disabled=false; return; }
    if(!r.ok){
      _eiMelde(box,[`Der Plan wurde nicht gespeichert – Server antwortet ${r.status}.`],"err");
      if(haupt)haupt.disabled=false; return;
    }
    const neu=bloecke.filter(b=>b.neu).length;
    einheitImportClose();
    toast(`📥 Einheit importiert ✓ ${slots.length} Phasen${neu?`, ${neu} neue Übung${neu===1?"":"en"}`:""}`);
    /* 6) Dorthin springen, wo das Ergebnis steht. Das Datum wird VOR dem Seitenwechsel
       gesetzt: der Einstieg in den Reiter stellt den Plan selbst wieder her, und zwar zu
       dem Datum, das im Feld steht. Stünde dort noch das alte, liefen zwei
       Wiederherstellungen mit verschiedenen Daten gegeneinander – und die spätere
       zeichnete die Zeitleiste leer über die frisch gefüllte. */
    _eiDatumSetzen(daten.datum);
    if(typeof go==="function")go("planung");
    if(typeof tpPlanRestore==="function")await tpPlanRestore(daten.datum);
  }catch(e){
    _eiMelde(box,["Kein Netz – Einheit nicht importiert."],"err");
    if(haupt)haupt.disabled=false;
  }
}
