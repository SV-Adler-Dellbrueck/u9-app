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
/* v511 – Die Kategorien, die es wirklich gibt: dieselben zehn, die der Übungs-Editor
   anbietet (<select id="tf-kat"> in shell.html). tpFilteredOpts() nennt nur die drei
   Sonderfälle beim Namen und wirft alles Übrige in den Hauptteil – eine erfundene
   Kategorie fiele dort also nicht auf, wäre aber in der Formen-Datenbank in keiner
   Gruppe zu finden. Hier gespiegelt, weil der Editor beim Prüfen nicht offen sein muss;
   die Prüfung v511 hält beide Listen gegeneinander. */
const EI_KATS=["aufwaermen","raute","passspiel","wahrnehmung","technik","pressing","spass","torwart","individual","mindset"];
const EI_KAT_LABEL={aufwaermen:"Aufwärmen",raute:"Raute",passspiel:"Passspiel",wahrnehmung:"Wahrnehmung",technik:"Technik",pressing:"Pressing",spass:"Spaß",torwart:"Torwart",individual:"Individual",mindset:"Mindset"};
/* v511 – Eine mitgelieferte Zeichnung. Format ist die Beschreibung, die `_skz(spec)` in
   data.js rendert (Zuschnitt 280×180) und die auch der Skizzen-Editor erzeugt. Bewusst
   KEINE tiefe Prüfung: unbekannte Listen überliest der Zeichner ohnehin. Geprüft wird nur,
   dass keine Liste etwas anderes als eine Liste ist – `(o.z||[]).forEach` wirft sonst,
   und ein geworfener Fehler beim Zeichnen risse die ganze Übung mit. */
const EI_SKZ_LISTEN=["z","tor","leiter","wand","p","li","h","s","b","tx"];   // v517: „li“ = Mittellinie und Schusszone
function _eiSkizzeOk(x){
  if(!x||typeof x!=="object"||Array.isArray(x))return false;
  return EI_SKZ_LISTEN.every(k=>x[k]==null||Array.isArray(x[k]));
}
function _eiSkizze(x){ return _eiSkizzeOk(x)?x:null; }
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
    if(b.uebung&&b.uebung.skizze!=null&&!_eiSkizzeOk(b.uebung.skizze))fehler.push(`Block ${nr}: „skizze“ ist keine Zeichnungs-Beschreibung – erwartet ein Objekt mit den Listen ${EI_SKZ_LISTEN.join(", ")}.`);
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
    /* v511: bis dahin fest `null` – eine mitgelieferte Zeichnung ging beim Import verloren
       und die Übung zeigte danach gar kein Bild. */
    skizze:_eiSkizze(u.skizze)
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

/* ═══════════════════════════════════════════════════════════════════════════
   v511 – ÜBUNGEN IMPORTIEREN (reiner Bibliotheks-Import)

   Übungen kamen bisher nur als Nebenwirkung eines Einheiten-Imports in die App:
   einheitImportUebernehmen() legte sie an und schrieb danach zwingend einen
   Trainingsplan für ein Datum. Wer nur Trainingsformen sammeln wollte, musste
   also eine Einheit erfinden und den Plan hinterher zurechtziehen.

   Format `adler-uebungen/1`: nur `schema` und die Liste `uebungen`. Kein Datum,
   keine Blöcke, und es wird NICHTS in `trainingsplan` geschrieben.

   Vorhandene Namen werden ÜBERSPRUNGEN, nicht überschrieben: eine Übung, an der
   jemand hier etwas geändert hat (Skizze gezeichnet, Coaching ergänzt), darf ein
   zweiter Import derselben Datei nicht stillschweigend wieder plattmachen.
   ═══════════════════════════════════════════════════════════════════════════ */
const EI_UEB_SCHEMA="adler-uebungen/1";
let _euGeprueft=null;      // {uebungen:[{...,neu:bool}]}

function uebungImportClose(){ document.getElementById("eu-modal")?.remove(); _euGeprueft=null; }

function uebungImportOpen(){
  document.getElementById("eu-modal")?.remove();
  _euGeprueft=null;
  const m=document.createElement("div");
  m.id="eu-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Übungen importieren");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)uebungImportClose(); };
  const fld="box-sizing:border-box;width:100%;padding:10px;border:var(--border-s);border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:var(--surface2);color:var(--text)";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("eu-modal","📚","Übungen importieren","Nur die Übungsdatenbank füllen – ohne Einheit und ohne Plan","#1a56db")}
    <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:8px">
      Format <b>${esc(EI_UEB_SCHEMA)}</b>. Die Übungen landen in der Formen-Datenbank und stehen sofort im Trainingsplan zur Auswahl – gefiltert nach ihrer Kategorie.
      Namen, die es schon gibt, werden <b>übersprungen</b>, nicht überschrieben.
    </div>
    <textarea id="eu-json" rows="10" placeholder='{ "schema": "${EI_UEB_SCHEMA}", "uebungen": [ { "name": "…", "kat": "aufwaermen" } ] }' style="${fld};resize:vertical"></textarea>
    <div id="eu-melde" style="margin-top:10px"></div>
    <div id="eu-vorschau" style="margin-top:10px"></div>
    <button id="eu-haupt" onclick="uebungImportPruefen()" class="btn btn-p" style="width:100%;min-height:56px;margin-top:12px;justify-content:center;font-size:15px"><i class="ti ti-checkup-list"></i>Prüfen</button>
    <button onclick="uebungImportClose()" class="btn" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>
  </div>`;
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById("eu-json")?.focus(),60);
}

/* Prüfen wie beim Einheiten-Import: eine Liste im Klartext mit laufender Nummer.
   Solange sie nicht leer ist, wird nichts geschrieben. Pflicht ist nur der Name. */
function _euPruefung(text){
  const fehler=[];
  let d=null;
  try{ d=JSON.parse(text); }
  catch(e){ return {fehler:["Das ist kein gültiges JSON: "+e.message]}; }
  if(!d||typeof d!=="object"||Array.isArray(d))return {fehler:["Die oberste Ebene muss ein Objekt sein."]};
  if(d.schema!==EI_UEB_SCHEMA)fehler.push(`Feld „schema“ muss „${EI_UEB_SCHEMA}“ sein${d.schema?(" – gefunden: „"+String(d.schema)+"“"):" – es fehlt"}.`);
  const ub=Array.isArray(d.uebungen)?d.uebungen:[];
  if(!ub.length)fehler.push("Es braucht mindestens eine Übung in „uebungen“.");
  const gesehen=new Map();
  ub.forEach((u,i)=>{
    const nr=i+1;
    if(!u||typeof u!=="object"||Array.isArray(u)){ fehler.push(`Übung ${nr}: kein Objekt.`); return; }
    const name=String(u.name||"").trim();
    if(!name){ fehler.push(`Übung ${nr}: „name“ fehlt.`); return; }
    const kat=u.kat==null?"technik":String(u.kat);
    if(!EI_KATS.includes(kat))fehler.push(`Übung ${nr} („${name}“): Kategorie „${kat}“ gibt es nicht – erlaubt sind ${EI_KATS.join(", ")}.`);
    if(u.skizze!=null&&!_eiSkizzeOk(u.skizze))fehler.push(`Übung ${nr} („${name}“): „skizze“ ist keine Zeichnungs-Beschreibung – erwartet ein Objekt mit den Listen ${EI_SKZ_LISTEN.join(", ")}.`);
    /* Zwei gleiche Namen in derselben Datei: die zweite legte sonst eine Dublette an,
       weil die erste beim Prüfen noch gar nicht in der Datenbank steht. */
    const n=_eiNorm(name);
    if(gesehen.has(n))fehler.push(`Übung ${nr} („${name}“): steht in dieser Datei schon als Übung ${gesehen.get(n)}.`);
    else gesehen.set(n,nr);
  });
  return {fehler,daten:d};
}
function _euMelde(zeilen,art){
  const el=document.getElementById("eu-melde"); if(!el)return;
  _eiMelde(el,zeilen,art);
}
function uebungImportPruefen(){
  const box=document.getElementById("eu-melde"), vor=document.getElementById("eu-vorschau"), haupt=document.getElementById("eu-haupt");
  if(!box||!vor)return;
  vor.innerHTML=""; _euGeprueft=null;
  if(haupt){ haupt.onclick=uebungImportPruefen; haupt.innerHTML='<i class="ti ti-checkup-list"></i>Prüfen'; }
  const text=document.getElementById("eu-json")?.value||"";
  if(!text.trim()){ _euMelde(["Bitte zuerst das JSON einfügen."],"err"); return; }
  const {fehler,daten}=_euPruefung(text);
  if(fehler.length){ _euMelde(fehler,"err"); return; }
  const uebungen=daten.uebungen.map(u=>({...u,kat:u.kat==null?"technik":String(u.kat),neu:_eiFormIndex(u.name)<0}));
  _euGeprueft={uebungen};
  _euMelde([],"ok");
  vor.innerHTML=_euVorschauHtml(uebungen);
  if(haupt){
    const neu=uebungen.filter(u=>u.neu).length;
    haupt.onclick=uebungImportUebernehmen;
    haupt.disabled=!neu;
    haupt.innerHTML=neu?`<i class="ti ti-download"></i>${neu} Übung${neu===1?"":"en"} anlegen`:'<i class="ti ti-check"></i>Alles schon da';
  }
}
function _euVorschauHtml(uebungen){
  const neu=uebungen.filter(u=>u.neu).length, da=uebungen.length-neu;
  const zeile=u=>`<div style="padding:7px 0;border-bottom:1px solid var(--surface2)">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center">
        <span style="min-width:0"><b style="font-size:13px">${esc(u.name)}</b>
          <span style="display:block;font-size:11.5px;color:var(--text2)">${esc(EI_KAT_LABEL[u.kat]||u.kat)}${u.dauer?" · "+esc(String(u.dauer))+" Min.":""}${u.spieler?" · "+esc(String(u.spieler)):""}</span></span>
        <span style="font-size:10px;font-weight:800;border-radius:8px;padding:3px 8px;white-space:nowrap;background:${u.neu?"var(--green-bg)":"var(--surface2)"};color:${u.neu?"var(--green)":"var(--text2)"}">${u.neu?"neu":"vorhanden"}</span>
      </div>
      ${(u.neu&&_eiSkizzeOk(u.skizze)&&typeof _skz==="function")?_skz(u.skizze):""}
    </div>`;
  /* v512: Die Strich-Legende gehört dorthin, wo eine Zeichnung zu sehen ist – bisher stand
     sie nur im Übungsdetail und im KI-Coach. */
  const mitBild=uebungen.some(u=>u.neu&&_eiSkizzeOk(u.skizze));
  return `<div style="border:var(--border-s);border-radius:12px;padding:12px">
    <div style="font-size:13.5px;font-weight:800">${uebungen.length} Übung${uebungen.length===1?"":"en"}</div>
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${neu} neu${da?` · ${da} schon vorhanden (wird übersprungen)`:""}</div>
    ${(mitBild&&typeof skzLegende==="function")?skzLegende():""}
    ${uebungen.map(zeile).join("")}
    ${da&&!neu?`<div style="font-size:12px;color:var(--text2);margin-top:8px">Es gibt nichts anzulegen – alle Namen stehen schon in der Datenbank.</div>`:""}
  </div>`;
}
/* Die Anlege-Schleife – EINE Maschine für den Knopf und für den Abgleich beim Öffnen.
   Legt nur an, was `neu` ist, und lädt danach nach; ohne Transaktion sagt sie ehrlich,
   wie weit sie gekommen ist. Ein Abbruch ist kein Verlust: dieselbe Datei ein zweites Mal
   überspringt, was schon steht. */
async function _euAnlegen(uebungen){
  const neu=(uebungen||[]).filter(u=>u.neu);
  let angelegt=0, fehler=null;
  try{
    for(const u of neu){
      if(!await _eiUebungAnlegen(u)){ fehler=u.name; break; }
      angelegt++;
    }
  }catch(e){ fehler=fehler||"__netz"; }
  // Erst danach nachladen: vorher kennt tpAllForms() die neuen Übungen nicht.
  if(angelegt&&typeof loadCustomForms==="function"){ try{ await loadCustomForms(); }catch(e){} }
  return {angelegt, offen:neu.length-angelegt, fehler, uebersprungen:(uebungen||[]).length-neu.length};
}
async function uebungImportUebernehmen(){
  const g=_euGeprueft;
  if(!g){ _euMelde(["Bitte zuerst prüfen."],"err"); return; }
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst als Trainer anmelden","err"); return; }
  const haupt=document.getElementById("eu-haupt");
  if(haupt)haupt.disabled=true;
  const e=await _euAnlegen(g.uebungen);
  if(e.fehler){
    _euMelde([e.fehler==="__netz"
      ? `Kein Netz – ${e.angelegt} von ${e.angelegt+e.offen} Übungen angelegt.`
      : `Die Übung „${e.fehler}“ konnte nicht angelegt werden.${e.angelegt?` Vorher angelegt: ${e.angelegt}.`:""} Nach dem Beheben kannst du dieselbe Datei nochmal einlesen – das schon Angelegte wird übersprungen.`],"err");
    if(haupt)haupt.disabled=false; return;
  }
  uebungImportClose();
  toast(`📚 ${e.angelegt} Übung${e.angelegt===1?"":"en"} angelegt ✓${e.uebersprungen?` · ${e.uebersprungen} übersprungen`:""}`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   v513 – VORLAGEN (Welle 2, nur Trainer)

   `adler-einheit/1` verknüpft Zusammenstellung und Datum fest: Wer eine erprobte
   Einheit zweimal fahren will, muss sie zweimal importieren. Eine VORLAGE ist die
   Ebene dazwischen – eine Zusammenstellung ohne Datum und ohne Kinder. Der
   Trainingsplan wird daraus erzeugt, nicht ersetzt.

   Gebaut wie `adler-uebungen/1` aus v511: prüfen, Vorschau, anlegen, Namensdubletten
   überspringen. Die Blöcke verweisen über den NAMEN auf `trainingsformen` – dieselbe
   Regel wie im Einheiten-Import und aus demselben Grund (ein Index bedeutet in einer
   fremden Datei etwas anderes als hier). Fehlt eine Übung, wird sie beim Prüfen
   benannt und die Vorlage nicht angelegt.

   Fachliche Grundlage: doku/ausbildungskonzept-u9-v3.md.
   ═══════════════════════════════════════════════════════════════════════════ */
const EI_VOR_SCHEMA="adler-vorlagen/1";
const EI_TAGS=["wenig-platz","vor-spieltag","halle","schlechtwetter"];
/* Konzept §2: „Spielformen" sind die Blöcke, in denen wirklich gespielt wird –
   Hauptteil und Abschluss. Das Warm-up zählt nicht mit, das Torwart- und
   Einzeltraining läuft parallel und verlängert die Einheit nicht (TP_PARALLEL_TYPEN). */
const EI_SPIELFORM_TYPEN=["main","abschluss"];
/* Konzept §2: brutto rund 50 Minuten, netto 35 bis 40 – der Abzug für Erklären,
   Bälle, Trinken und Wechseln liegt also bei rund einem Viertel. Außerhalb dieses
   Bandes stimmt eine der beiden Zahlen nicht; gesagt wird es als HINWEIS, nicht als
   Fehler – entscheiden soll der Trainer. */
const EI_NETTO_BAND=[0.6,1.0];
let _evGeprueft=null;      // {vorlagen:[{...,neu:bool,brutto,hinweis}]}

function _evSpielformSumme(bloecke){
  return (bloecke||[]).reduce((a,b)=>a+(EI_SPIELFORM_TYPEN.includes(b&&b.typ)?Number(b.dauer)||0:0),0);
}
/* Gibt den Hinweis-Text zurück oder "" – nie einen Fehler. */
function _evNettoHinweis(v){
  const netto=Number(v&&v.netto_spielform_min);
  const brutto=_evSpielformSumme(v&&v.bloecke);
  if(!isFinite(netto)||netto<=0||!brutto)return "";
  const anteil=netto/brutto;
  if(anteil>EI_NETTO_BAND[1])return `${netto} Min. netto bei ${brutto} Min. Spielform-Blöcken – netto kann nicht größer sein als brutto.`;
  if(anteil<EI_NETTO_BAND[0])return `${netto} Min. netto bei ${brutto} Min. Spielform-Blöcken – das ist weniger als die Hälfte; laut Konzept bleiben rund drei Viertel übrig.`;
  return "";
}
function _evNorm(s){ return _eiNorm(s); }
function _evVorhanden(name){
  const n=_evNorm(name);
  return (typeof VORLAGEN!=="undefined"?VORLAGEN:[]).some(v=>_evNorm(v&&v.name)===n);
}
/* Prüfen: Liste im Klartext mit laufender Nummer. Solange sie nicht leer ist, wird
   nichts geschrieben. Pflicht sind Name und mindestens ein Block. */
function _evPruefung(text){
  const fehler=[];
  let d=null;
  try{ d=JSON.parse(text); }
  catch(e){ return {fehler:["Das ist kein gültiges JSON: "+e.message]}; }
  if(!d||typeof d!=="object"||Array.isArray(d))return {fehler:["Die oberste Ebene muss ein Objekt sein."]};
  if(d.schema!==EI_VOR_SCHEMA)fehler.push(`Feld „schema“ muss „${EI_VOR_SCHEMA}“ sein${d.schema?(" – gefunden: „"+String(d.schema)+"“"):" – es fehlt"}.`);
  const vl=Array.isArray(d.vorlagen)?d.vorlagen:[];
  if(!vl.length)fehler.push("Es braucht mindestens eine Vorlage in „vorlagen“.");
  const gesehen=new Map();
  vl.forEach((v,i)=>{
    const nr=i+1;
    if(!v||typeof v!=="object"||Array.isArray(v)){ fehler.push(`Vorlage ${nr}: kein Objekt.`); return; }
    const name=String(v.name||"").trim();
    if(!name){ fehler.push(`Vorlage ${nr}: „name“ fehlt.`); return; }
    const n=_evNorm(name);
    if(gesehen.has(n))fehler.push(`Vorlage ${nr} („${name}“): steht in dieser Datei schon als Vorlage ${gesehen.get(n)}.`);
    else gesehen.set(n,nr);
    if(!String(v.leitfrage||"").trim())fehler.push(`Vorlage ${nr} („${name}“): „leitfrage“ fehlt – ohne sie lässt sich die Vorlage nicht filtern.`);
    (Array.isArray(v.tags)?v.tags:[]).forEach(t=>{
      if(!EI_TAGS.includes(String(t)))fehler.push(`Vorlage ${nr} („${name}“): Tag „${t}“ gibt es nicht – erlaubt sind ${EI_TAGS.join(", ")}.`);
    });
    const bl=Array.isArray(v.bloecke)?v.bloecke:[];
    if(!bl.length){ fehler.push(`Vorlage ${nr} („${name}“): keine Blöcke.`); return; }
    bl.forEach((b,j)=>{
      const bn=`Vorlage ${nr} („${name}“), Block ${j+1}`;
      if(!b||typeof b!=="object"){ fehler.push(`${bn}: kein Objekt.`); return; }
      if(!String(b.label||"").trim())fehler.push(`${bn}: „label“ fehlt.`);
      if(!EI_TYPEN.includes(b.typ))fehler.push(`${bn}: „typ“ ist „${b.typ==null?"":String(b.typ)}“ – erlaubt sind ${EI_TYPEN.join(", ")}.`);
      const dau=Number(b.dauer);
      if(!isFinite(dau)||dau<=0)fehler.push(`${bn}: „dauer“ muss eine Zahl größer als 0 sein.`);
      const un=String(b.uebung_name||"").trim();
      if(!un)return;
      /* Der Abschluss ist im Trainingsplan freies Spiel und hat gar kein Übungsfeld –
         dieselbe Falle wie in v506. */
      if(b.typ==="abschluss"){ fehler.push(`${bn}: der Abschluss ist freies Spiel und hat im Trainingsplan kein Feld für eine Übung – bitte „uebung_name“ weglassen.`); return; }
      const idx=_eiFormIndex(un);
      if(idx<0){ fehler.push(`${bn}: die Übung „${un}“ gibt es nicht. Erst die Übung anlegen (Übungen importieren), dann die Vorlage.`); return; }
      const kat=(tpAllForms()[idx]||{}).kat||"technik";
      if(b.typ&&EI_TYPEN.includes(b.typ)&&!_eiKatPasst(b.typ,kat)){
        const soll=EI_KAT_PHASE[b.typ]?("nur Übungen der Kategorie „"+EI_KAT_PHASE[b.typ]+"“"):"keine Aufwärm-, Torwart- oder Einzeltrainings-Übungen";
        fehler.push(`${bn}: „${un}“ hat die Kategorie „${kat}“ und passt nicht in eine Phase vom Typ „${b.typ}“ – dort stehen ${soll}.`);
      }
    });
  });
  return {fehler,daten:d};
}

function vorlagenImportClose(){ document.getElementById("ev-modal")?.remove(); _evGeprueft=null; }
function vorlagenImportOpen(){
  document.getElementById("ev-modal")?.remove();
  _evGeprueft=null;
  const m=document.createElement("div");
  m.id="ev-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Vorlagen importieren");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)vorlagenImportClose(); };
  const fld="box-sizing:border-box;width:100%;padding:10px;border:var(--border-s);border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:var(--surface2);color:var(--text)";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("ev-modal","🗂️","Vorlagen importieren","Fertige Zusammenstellungen ohne Datum und ohne Kinder","#7c3aed")}
    <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:8px">
      Format <b>${esc(EI_VOR_SCHEMA)}</b>. Eine Vorlage verweist über den <b>Namen</b> auf Übungen – fehlt eine, wird sie hier benannt und die Vorlage nicht angelegt.
      Namen, die es schon gibt, werden <b>übersprungen</b>, nicht überschrieben.
    </div>
    <textarea id="ev-json" rows="10" placeholder='{ "schema": "${EI_VOR_SCHEMA}", "vorlagen": [ { "name": "…", "leitfrage": "…", "bloecke": [ … ] } ] }' style="${fld};resize:vertical"></textarea>
    <div id="ev-melde" style="margin-top:10px"></div>
    <div id="ev-vorschau" style="margin-top:10px"></div>
    <button id="ev-haupt" onclick="vorlagenImportPruefen()" class="btn btn-p" style="width:100%;min-height:56px;margin-top:12px;justify-content:center;font-size:15px"><i class="ti ti-checkup-list"></i>Prüfen</button>
    <button onclick="vorlagenImportClose()" class="btn" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>
  </div>`;
  document.body.appendChild(m);
  setTimeout(()=>document.getElementById("ev-json")?.focus(),60);
}
function _evMelde(zeilen,art){
  const el=document.getElementById("ev-melde"); if(el)_eiMelde(el,zeilen,art);
}
/* Aus geprüften Daten die Anzeige-Liste bauen – gemeinsame Stelle für Knopf und Abgleich. */
function _evAufbereiten(daten){
  return (daten.vorlagen||[]).map(v=>({...v,neu:!_evVorhanden(v.name),hinweis:_evNettoHinweis(v)}));
}
async function vorlagenImportPruefen(){
  const box=document.getElementById("ev-melde"), vor=document.getElementById("ev-vorschau"), haupt=document.getElementById("ev-haupt");
  if(!box||!vor)return;
  vor.innerHTML=""; _evGeprueft=null;
  if(haupt){ haupt.onclick=vorlagenImportPruefen; haupt.disabled=false; haupt.innerHTML='<i class="ti ti-checkup-list"></i>Prüfen'; }
  const text=document.getElementById("ev-json")?.value||"";
  if(!text.trim()){ _evMelde(["Bitte zuerst das JSON einfügen."],"err"); return; }
  await vorlagenLaden();                       // frischer Stand: was steht schon da?
  const {fehler,daten}=_evPruefung(text);
  if(fehler.length){ _evMelde(fehler,"err"); return; }
  const vorlagen=_evAufbereiten(daten);
  _evGeprueft={vorlagen};
  _evMelde([],"ok");
  vor.innerHTML=_evVorschauHtml(vorlagen);
  if(haupt){
    const neu=vorlagen.filter(v=>v.neu).length;
    haupt.onclick=vorlagenImportUebernehmen;
    haupt.disabled=!neu;
    haupt.innerHTML=neu?`<i class="ti ti-download"></i>${neu} Vorlage${neu===1?"":"n"} anlegen`:'<i class="ti ti-check"></i>Alles schon da';
  }
}
function _evZeileHtml(v){
  const bl=(v.bloecke||[]);
  const summe=bl.reduce((a,b)=>a+(Number(b.dauer)||0),0);
  const tags=(Array.isArray(v.tags)?v.tags:[]).map(t=>`<span style="font-size:9.5px;font-weight:700;background:var(--surface2);color:var(--text2);border-radius:8px;padding:2px 6px">${esc(t)}</span>`).join(" ");
  return `<div style="padding:8px 0;border-bottom:1px solid var(--surface2)">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center">
        <span style="min-width:0"><b style="font-size:13px">${esc(v.name)}</b>
          <span style="display:block;font-size:11.5px;color:var(--text2)">${esc(v.leitfrage||"")}</span></span>
        <span style="font-size:10px;font-weight:800;border-radius:8px;padding:3px 8px;white-space:nowrap;background:${v.neu?"var(--green-bg)":"var(--surface2)"};color:${v.neu?"var(--green)":"var(--text2)"}">${v.neu?"neu":"vorhanden"}</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px">${bl.length} Blöcke · ${summe} Min.${v.netto_spielform_min?` · ${Number(v.netto_spielform_min)} Min. netto`:""} ${tags}</div>
      ${v.hinweis?`<div style="font-size:11.5px;color:var(--amber);background:var(--amber-bg);border-radius:8px;padding:6px 8px;margin-top:5px;line-height:1.45">💡 ${esc(v.hinweis)}</div>`:""}
      <div style="font-size:11px;color:var(--text2);margin-top:4px;line-height:1.5">${bl.map(b=>`${Number(b.dauer)}′ ${esc(b.label)}${b.uebung_name?" · "+esc(b.uebung_name):""}`).join("<br>")}</div>
    </div>`;
}
function _evVorschauHtml(vorlagen){
  const neu=vorlagen.filter(v=>v.neu).length, da=vorlagen.length-neu;
  const hinweise=vorlagen.filter(v=>v.hinweis).length;
  return `<div style="border:var(--border-s);border-radius:12px;padding:12px">
    <div style="font-size:13.5px;font-weight:800">${vorlagen.length} Vorlage${vorlagen.length===1?"":"n"}</div>
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:6px">${neu} neu${da?` · ${da} schon vorhanden (wird übersprungen)`:""}${hinweise?` · ${hinweise} mit Hinweis`:""}</div>
    ${vorlagen.map(_evZeileHtml).join("")}
    ${da&&!neu?`<div style="font-size:12px;color:var(--text2);margin-top:8px">Es gibt nichts anzulegen – alle Namen stehen schon in der Datenbank.</div>`:""}
  </div>`;
}
/* Eine Vorlage anlegen. Kein Upsert: die Tabelle hat per RLS gar kein UPDATE – was
   einmal steht, bleibt stehen, bis es jemand in Supabase selbst entfernt. */
async function _evVorlageAnlegen(v,stand){
  const zeile={
    name:String(v.name||"").slice(0,160),
    leitfrage:String(v.leitfrage||""),
    folge_nr:isFinite(Number(v.folge_nr))?Number(v.folge_nr):null,
    tags:(Array.isArray(v.tags)?v.tags:[]).filter(t=>EI_TAGS.includes(String(t))),
    dauer_min:isFinite(Number(v.dauer_min))?Number(v.dauer_min):null,
    netto_spielform_min:isFinite(Number(v.netto_spielform_min))?Number(v.netto_spielform_min):null,
    skalierung:(v.skalierung&&typeof v.skalierung==="object"&&!Array.isArray(v.skalierung))?v.skalierung:{},
    beobachtung:String(v.beobachtung||""),
    bloecke:(Array.isArray(v.bloecke)?v.bloecke:[]).map(b=>({typ:b.typ,label:String(b.label||"").trim(),dauer:Number(b.dauer),uebung_name:String(b.uebung_name||"").trim()||null})),
    stand:stand||null
  };
  const r=await fetch(`${SB_URL}/rest/v1/trainingsvorlagen`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(zeile)});
  if(sbCheck401(r))return false;
  return r.ok;
}
/* Anlege-Schleife – EINE Maschine für den Knopf und für den Abgleich, wie _euAnlegen. */
async function _evAnlegen(vorlagen,stand){
  const neu=(vorlagen||[]).filter(v=>v.neu);
  let angelegt=0, fehler=null;
  try{
    for(const v of neu){
      if(!await _evVorlageAnlegen(v,stand)){ fehler=v.name; break; }
      angelegt++;
    }
  }catch(e){ fehler=fehler||"__netz"; }
  if(angelegt)await vorlagenLaden();
  return {angelegt, offen:neu.length-angelegt, fehler, uebersprungen:(vorlagen||[]).length-neu.length};
}
async function vorlagenImportUebernehmen(){
  const g=_evGeprueft;
  if(!g){ _evMelde(["Bitte zuerst prüfen."],"err"); return; }
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst als Trainer anmelden","err"); return; }
  const haupt=document.getElementById("ev-haupt");
  if(haupt)haupt.disabled=true;
  const e=await _evAnlegen(g.vorlagen,"");
  if(e.fehler){
    _evMelde([e.fehler==="__netz"
      ? `Kein Netz – ${e.angelegt} von ${e.angelegt+e.offen} Vorlagen angelegt.`
      : `Die Vorlage „${e.fehler}“ konnte nicht angelegt werden.${e.angelegt?` Vorher angelegt: ${e.angelegt}.`:""} Dieselbe Datei lässt sich nochmal einlesen – das schon Angelegte wird übersprungen.`],"err");
    if(haupt)haupt.disabled=false; return;
  }
  vorlagenImportClose();
  toast(`🗂️ ${e.angelegt} Vorlage${e.angelegt===1?"":"n"} angelegt ✓${e.uebersprungen?` · ${e.uebersprungen} übersprungen`:""}`);
}

/* ── v513: Vorlage übernehmen ────────────────────────────────────────────────
   Der Weg von der Vorlage in den Trainingsplan. Er setzt die PHASEN für ein Datum
   und ordnet die Übungen zu – Kinder und Torhüter bleiben Sache des Trainingsplans,
   genau wie beim Einheiten-Import. Eine bestehende Planung wird nie stillschweigend
   überschrieben: steht für das Datum schon ein Plan, heißt die Hauptaktion
   „Plan ersetzen" und die Vorschau sagt es deutlich.
   ─────────────────────────────────────────────────────────────────────────── */
let VORLAGEN=[];                       // zuletzt geladene Vorlagen (Welle 2, nur Trainer)
let _vuAuswahl=null, _vuFilter={leitfrage:"",tag:""}, _vuPlanDa=false;

async function vorlagenLaden(){
  if(typeof sbToken==="function"&&!sbToken())return VORLAGEN;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsvorlagen?select=*&order=leitfrage.asc,folge_nr.asc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return VORLAGEN;
    if(r.ok)VORLAGEN=(await r.json())||[];
  }catch(e){}
  return VORLAGEN;
}
function _vuPasst(v){
  if(_vuFilter.leitfrage&&String(v.leitfrage||"")!==_vuFilter.leitfrage)return false;
  if(_vuFilter.tag&&!(Array.isArray(v.tags)?v.tags:[]).includes(_vuFilter.tag))return false;
  return true;
}
function vorlageUebernehmenClose(){ document.getElementById("vu-modal")?.remove(); _vuAuswahl=null; }
async function vorlageUebernehmenOpen(){
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst als Trainer anmelden","err"); return; }
  document.getElementById("vu-modal")?.remove();
  _vuAuswahl=null; _vuFilter={leitfrage:"",tag:""};
  const m=document.createElement("div");
  m.id="vu-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Vorlage übernehmen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)vorlageUebernehmenClose(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("vu-modal","🗂️","Vorlage übernehmen","Fertige Einheit auf den gewählten Termin setzen","#7c3aed")}
    <div id="vu-inhalt"><div style="font-size:12.5px;color:var(--text2);padding:8px 0">Lade Vorlagen …</div></div>
  </div>`;
  document.body.appendChild(m);
  await vorlagenLaden();
  _vuPlanDa=await _vuPlanVorhanden(_vuDatum());
  vorlageUebernehmenRender();
}
function _vuDatum(){ return document.getElementById("tp-date")?.value||""; }
async function _vuPlanVorhanden(datum){
  if(!datum)return false;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=eq.${encodeURIComponent(datum)}&select=datum,slots`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return false;
    const z=(await r.json())||[];
    return z.length>0&&Array.isArray(z[0].slots)&&z[0].slots.length>0;
  }catch(e){ return false; }
}
function vuFilterSet(feld,wert){
  _vuFilter[feld]=(_vuFilter[feld]===wert)?"":wert;
  _vuAuswahl=null;
  vorlageUebernehmenRender();
}
function vuWaehlen(id){
  _vuAuswahl=(_vuAuswahl===id)?null:id;
  vorlageUebernehmenRender();
}
function vorlageUebernehmenRender(){
  const box=document.getElementById("vu-inhalt"); if(!box)return;
  const datum=_vuDatum();
  const tag=(()=>{ if(!datum)return ""; const x=new Date(datum+"T00:00:00"); return isNaN(x)?datum:x.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}); })();
  if(!VORLAGEN.length){
    box.innerHTML=`<div style="font-size:12.5px;color:var(--text2);line-height:1.55;padding:6px 0">
      Es gibt noch keine Vorlagen. Sie kommen beim Öffnen aus <b>uebungen/vorlagen.json</b> – oder von Hand über „Vorlagen importieren“.</div>
      <button onclick="vorlageUebernehmenClose()" class="btn" style="width:100%;min-height:48px;margin-top:10px;justify-content:center">Schließen</button>`;
    return;
  }
  const fragen=[...new Set(VORLAGEN.map(v=>String(v.leitfrage||"")).filter(Boolean))];
  const tags=[...new Set(VORLAGEN.flatMap(v=>Array.isArray(v.tags)?v.tags:[]))];
  const chip=(an,lbl,fn)=>`<button onclick="${fn}" aria-pressed="${an?"true":"false"}" style="min-height:48px;padding:6px 14px;border:1.5px solid ${an?"#7c3aed":"var(--rand-bedien)"};border-radius:24px;font-family:inherit;font-size:12.5px;font-weight:${an?"800":"600"};cursor:pointer;background:${an?"#7c3aed":"var(--surface)"};color:${an?"#fff":"var(--text2)"};text-align:left">${esc(lbl)}</button>`;
  const treffer=VORLAGEN.filter(_vuPasst);
  const gewaehlt=treffer.find(v=>String(v.id)===String(_vuAuswahl))||null;
  const karte=v=>{
    const an=String(v.id)===String(_vuAuswahl);
    const bl=Array.isArray(v.bloecke)?v.bloecke:[];
    const summe=bl.reduce((a,b)=>a+(Number(b.dauer)||0),0);
    return `<button onclick="vuWaehlen('${esc(String(v.id))}')" aria-pressed="${an?"true":"false"}" style="display:block;width:100%;text-align:left;min-height:48px;padding:10px 12px;margin-bottom:6px;border:1.5px solid ${an?"#7c3aed":"var(--rand-bedien)"};border-radius:12px;background:${an?"#7c3aed14":"var(--surface)"};color:var(--text);font-family:inherit;cursor:pointer">
      <div style="font-size:13px;font-weight:800">${esc(v.name)}</div>
      <div style="font-size:11.5px;color:var(--text2);margin-top:2px">${esc(v.leitfrage||"")}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px">${bl.length} Blöcke · ${summe} Min.${v.netto_spielform_min?` · ${Number(v.netto_spielform_min)} Min. netto`:""}${(Array.isArray(v.tags)&&v.tags.length)?" · "+v.tags.map(esc).join(", "):""}</div>
    </button>`;
  };
  const vorschau=v=>{
    const bl=Array.isArray(v.bloecke)?v.bloecke:[];
    let mainNr=0;
    const zeile=b=>{ if(b.typ==="main")mainNr++;
      return `<div style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--surface2)">
        <span style="font-size:10px;font-weight:800;color:#fff;background:${_eiFarbe(b.typ,mainNr)};border-radius:6px;padding:3px 7px;white-space:nowrap">${Number(b.dauer)} Min.</span>
        <span style="min-width:0"><b style="font-size:12.5px">${esc(b.label)}</b>
          <span style="display:block;font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.uebung_name?esc(b.uebung_name):"freies Spiel – keine Übung"}</span></span>
      </div>`; };
    const sk=v.skalierung&&typeof v.skalierung==="object"?v.skalierung:{};
    const skZeilen=["8","12","16"].filter(k=>sk[k]).map(k=>`<div><b>${k} Kinder:</b> ${esc(String(sk[k]))}</div>`).join("");
    return `<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-top:10px">
      <div style="font-size:13px;font-weight:800">${esc(v.name)}</div>
      <div style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${esc(tag||"kein Termin gewählt")}</div>
      ${bl.map(zeile).join("")}
      ${skZeilen?`<div style="font-size:11.5px;color:var(--text2);line-height:1.6;margin-top:8px">📐 ${skZeilen}</div>`:""}
      ${v.beobachtung?`<div style="font-size:11.5px;color:var(--text2);line-height:1.5;margin-top:8px">👀 ${esc(v.beobachtung)}</div>`:""}
      <div style="font-size:11px;color:var(--text3);margin-top:8px">Kinder und Torhüter werden nicht zugeteilt – das bleibt im Trainingsplan.</div>
      ${_vuPlanDa?`<div style="background:var(--amber-bg);border:1px solid var(--amber);border-radius:10px;padding:9px 11px;margin-top:10px;font-size:12.5px;color:var(--amber);line-height:1.5">
        ⚠️ Für diesen Termin steht schon ein Plan. <b>Er wird vollständig ersetzt</b> – Phasen und Übungen.</div>`:""}
    </div>`;
  };
  box.innerHTML=`
    ${datum?"":`<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:10px;padding:9px 11px;margin-bottom:8px;font-size:12.5px;color:var(--red)">Bitte oben zuerst einen Termin wählen.</div>`}
    <div class="lbl-klein" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:2px 2px 5px">Leitfrage</div>
    <div style="display:flex;gap:6px;flex-direction:column;margin-bottom:9px">${fragen.map(f=>chip(_vuFilter.leitfrage===f,f,`vuFilterSet('leitfrage','${esc(f).replace(/'/g,"&#39;")}')`)).join("")}</div>
    ${tags.length?`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:2px 2px 5px">Passt wenn …</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px">${tags.map(t=>chip(_vuFilter.tag===t,t,`vuFilterSet('tag','${esc(t)}')`)).join("")}</div>`:""}
    <div style="font-size:11px;color:var(--text3);margin-bottom:6px">${treffer.length} von ${VORLAGEN.length} Vorlagen${(_vuFilter.leitfrage||_vuFilter.tag)?" · Filter aktiv, nochmal tippen hebt ihn auf":""}</div>
    ${treffer.length?treffer.map(karte).join(""):`<div style="font-size:12.5px;color:var(--text2);padding:8px 0">Keine Vorlage passt zu diesem Filter.</div>`}
    ${gewaehlt?vorschau(gewaehlt):""}
    <button id="vu-haupt" onclick="vorlageUebernehmenSetzen()" class="btn btn-p" style="width:100%;min-height:56px;margin-top:12px;justify-content:center;font-size:15px"${(!gewaehlt||!datum)?" disabled":""}><i class="ti ti-calendar-plus"></i>${_vuPlanDa?"Plan ersetzen":"Auf den Termin setzen"}</button>
    <button onclick="vorlageUebernehmenClose()" class="btn" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>`;
}
/* Setzt Phasen und Übungszuordnung für das Datum – dieselben Strukturen und
   dieselbe Kopfzeile wie tpPlanSave() und der Einheiten-Import. `kopf` wird bewusst
   NICHT geschrieben: eine Vorlage hat keinen Schwerpunkt für diesen einen Tag. */
async function vorlageUebernehmenSetzen(){
  const datum=_vuDatum();
  const v=VORLAGEN.find(x=>String(x.id)===String(_vuAuswahl));
  if(!v||!datum)return;
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst als Trainer anmelden","err"); return; }
  const haupt=document.getElementById("vu-haupt");
  if(haupt)haupt.disabled=true;
  const bl=Array.isArray(v.bloecke)?v.bloecke:[];
  let mainNr=0;
  const slots=bl.map(b=>{
    if(b.typ==="main")mainNr++;
    return {label:String(b.label||"").trim(),dauer:Number(b.dauer),farbe:_eiFarbe(b.typ,mainNr),typ:b.typ};
  });
  const plan=[];
  for(const b of bl){
    const un=String(b.uebung_name||"").trim();
    if(!un)continue;
    const formIdx=_eiFormIndex(un);
    if(formIdx<0){
      toast(`Die Übung „${un}“ gibt es nicht mehr – nichts geändert`,"err");
      if(haupt)haupt.disabled=false; return;
    }
    plan.push({formIdx,formName:tpAllForms()[formIdx].name,trainer:"Alle",slotLabel:String(b.label||"").trim(),key:`${formIdx}-Alle`});
  }
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({datum,plan,slots,updated_at:new Date().toISOString()})});
    if(sbCheck401(r)){ if(haupt)haupt.disabled=false; return; }
    if(!r.ok){ toast(`Nicht gespeichert – Server antwortet ${r.status}`,"err"); if(haupt)haupt.disabled=false; return; }
  }catch(e){ toast("Kein Netz – Vorlage nicht übernommen","err"); if(haupt)haupt.disabled=false; return; }
  vorlageUebernehmenClose();
  toast(`🗂️ „${v.name}“ übernommen ✓ ${slots.length} Phasen`);
  if(typeof tpPlanRestore==="function")await tpPlanRestore(datum);
}

/* ═══════════════════════════════════════════════════════════════════════════
   v512 – BIBLIOTHEKS-ABGLEICH BEIM ÖFFNEN

   Neue Übungen entstehen im Gespräch und werden als Datei ins Repo gelegt. Bis
   v511 musste der Trainer sie von Hand in „Übungen importieren" einfügen – ein
   Schritt, den niemand braucht. Beim Öffnen holt die App jetzt
   `uebungen/bibliothek.json` und legt still an, was neu ist.

   Es ist KEINE zweite Importmaschine: geprüft wird mit `_euPruefung()`,
   geschrieben mit `_euAnlegen()` – dieselben Funktionen wie hinter dem Knopf.

   ── Zwei Fallen ─────────────────────────────────────────────────────────────
   1. Der Service Worker cached mit `ignoreSearch`; ein `?cb=…` hilft dort NICHT.
      Ohne eine Ausnahme in `sw.js` läse die App dauerhaft eine alte Fassung, ohne
      dass etwas Rotes erschiene. Die Ausnahme steht dort oben bei den anderen.
   2. Ohne Trainer-Sitzung lehnt die RLS den Schreibvorgang ab. Der Abgleich läuft
      deshalb erst nach der Anmeldung – und still: kein Netz, keine Datei, kaputtes
      JSON heißt „nichts tun und beim nächsten Öffnen wieder".
   ═══════════════════════════════════════════════════════════════════════════ */
const BIB_DATEI="uebungen/bibliothek.json";
const BIB_STAND_KEY="adler-bibliothek-stand";
/* v513: Die Vorlagen ziehen mit – dieselbe Datei-Mechanik, eigener Stand. */
const VOR_DATEI="uebungen/vorlagen.json";
const VOR_STAND_KEY="adler-vorlagen-stand";
function _bibStandGelesen(k){ try{ return localStorage.getItem(k||BIB_STAND_KEY)||""; }catch(e){ return ""; } }
function _bibStandMerken(v,k){ try{ localStorage.setItem(k||BIB_STAND_KEY,String(v||"")); }catch(e){} }
/* Eine Datei holen und ihren Stand prüfen. Gibt null zurück, wenn nichts zu tun ist –
   kein Netz, keine Datei, kaputtes JSON oder derselbe Stand wie beim letzten Mal. */
async function _bibHolen(datei,standKey){
  const url=(typeof appRoot==="function"?appRoot():"")+datei;
  let d=null;
  try{
    const r=await fetch(url,{cache:"no-store"});
    if(!r.ok)return null;
    d=await r.json();
  }catch(e){ return null; }
  const stand=String((d&&d.stand)||"");
  if(stand&&stand===_bibStandGelesen(standKey))return null;
  return {d,stand};
}
let _bibLaeuft=false;
async function bibliothekAbgleich(){
  if(_bibLaeuft)return null;
  if(typeof sbToken==="function"&&!sbToken())return null;      // ohne Sitzung: RLS sagt ohnehin nein
  _bibLaeuft=true;
  try{
    let erg=null;
    // ── 1) Übungen ────────────────────────────────────────────────────────────
    const bib=await _bibHolen(BIB_DATEI,BIB_STAND_KEY);
    if(bib){
      const {fehler,daten}=_euPruefung(JSON.stringify(bib.d));
      if(!fehler.length){                                       // kaputte Datei: still, beim nächsten Mal wieder
        const uebungen=daten.uebungen.map(u=>({...u,kat:u.kat==null?"technik":String(u.kat),neu:_eiFormIndex(u.name)<0}));
        const e=await _euAnlegen(uebungen);
        /* Den Stand erst merken, wenn wirklich alles durchgelaufen ist – sonst bliebe der
           Rest der Datei für immer liegen. Bricht es ab, versucht es der nächste Start neu
           und überspringt, was schon steht. */
        if(!e.fehler&&bib.stand)_bibStandMerken(bib.stand,BIB_STAND_KEY);
        if(e.angelegt&&typeof toast==="function")toast(`📚 ${e.angelegt} neue Übung${e.angelegt===1?"":"en"}`);
        erg=e;
      }
    }
    /* ── 2) Vorlagen, IMMER nach den Übungen ────────────────────────────────────
       Eine Vorlage verweist über den Namen auf eine Übung. Liefe sie zuerst, würde
       jede Vorlage abgewiesen, deren Übung im selben Durchgang erst entsteht – und
       ihr Stand wäre trotzdem gemerkt. */
    const vor=await _bibHolen(VOR_DATEI,VOR_STAND_KEY);
    if(vor){
      const {fehler,daten}=_evPruefung(JSON.stringify(vor.d));
      if(!fehler.length){
        await vorlagenLaden();
        const v=await _evAnlegen(_evAufbereiten(daten),vor.stand);
        if(!v.fehler&&vor.stand)_bibStandMerken(vor.stand,VOR_STAND_KEY);
        if(v.angelegt&&typeof toast==="function")toast(`🗂️ ${v.angelegt} neue Vorlage${v.angelegt===1?"":"n"}`);
        erg=erg?{...erg,vorlagen:v}:{angelegt:0,offen:0,fehler:null,uebersprungen:0,vorlagen:v};
      }
    }
    return erg;
  }finally{ _bibLaeuft=false; }
}
