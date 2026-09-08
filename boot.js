/* ═══════════════════════════════════════════════════════════
   ADLER BOOT & ORGA LAYER (Modularisierung 8/8 – Schlussstein)
   INIT (Mode-Routing, Trainingsbibliothek), Team-Modul (Block G),
   Anwesenheits-Tracker, Trainingsplanung, PIN-Gate,
   Trainings-Bewertung, Auto-Trainingsvorschlag, PWA-Setup (SW-Reg.).
   Laedt als LETZTES Skript – orchestriert den App-Start.
   ═══════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */


let CUSTOM_FORMS=[];
let activeTF=null; // bewusst KEINE Vorbelegung: 100+ Übungen aufgeklappt erschlagen – erst Kategorie wählen oder suchen
// FEAT AC-Folge: EINE gemeinsame Formenliste (Bibliothek + eigene/KI-Übungen).
// Die Planung ist index-basiert – deshalb MUSS ueberall dieselbe Liste (gleicher
// Index-Raum) genutzt werden, sonst zeigt ein Slot die falsche Uebung.
function tpAllForms(){ return (typeof TRAININGSFORMEN!=="undefined"?TRAININGSFORMEN:[]).concat(typeof CUSTOM_FORMS!=="undefined"?CUSTOM_FORMS:[]); }

async function loadCustomForms(){
  try{
    const r=await fetch(SB_URL+'/rest/v1/trainingsformen?select=*',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    if(r.ok){CUSTOM_FORMS=await r.json()||[];}
  }catch(e){CUSTOM_FORMS=[];}
  // PO: Eigene/KI-Übungen ohne Zeichnung – KI liefert jetzt eine skizze-Spec (Spalte
  // trainingsformen.skizze), ältere und handangelegte bekommen die Kategorie-Symbolskizze.
  try{
    /* PO v412: „die Zeichnung ist falsch weil nirgendwo gepasst werden soll."
       Die Zeichnung war gar nicht seine – ohne eigene Skizze sprang bisher das
       KATEGORIE-Symbolbild ein (SKZ_KAT), und das der Kategorie „raute" enthält nun mal
       Pass-Pfeile. Beschriftet war es mit „Symbolskizze", aber niemand liest ein Bild als
       „das ist NICHT deine Übung" – ein plausibel aussehendes falsches Bild ist schlimmer
       als gar keines. Ohne echte Skizze bleibt das Feld jetzt leer; die Detailansicht
       bietet stattdessen an, eine zu zeichnen. */
    CUSTOM_FORMS.forEach(f=>{
      if(f.svg&&f.svg.length>10)return;
      f.svg=(f.skizze&&typeof f.skizze==="object")?_skz(f.skizze):"";
    });
  }catch(e){}
  renderTraining();
}

async function saveCustomTraining(){
  var name=document.getElementById('tf-name').value.trim();
  if(!name){toast('Bitte Name eingeben','err');return;}
  var form={
    name:name,kat:document.getElementById('tf-kat').value,
    ablauf:document.getElementById('tf-ablauf').value,
    varianten:document.getElementById('tf-varianten').value,
    coaching:document.getElementById('tf-coaching').value,
    spieler:document.getElementById('tf-spieler').value,
    feld:document.getElementById('tf-feld').value,
    dauer:document.getElementById('tf-dauer').value,
    spass:parseInt(document.getElementById('tf-spass').value),
    diff:parseInt(document.getElementById('tf-diff').value),
    custom:true,focus:false,tags:'Eigene Übung',
    kurz:document.getElementById('tf-ablauf').value.slice(0,80),
    /* v409: die selbst getippte oder aus einer Vorlage geladene Skizze. Die Spalte
       `skizze` (jsonb) gab es schon – gefüllt hat sie nur nie jemand. */
    skizze:(window.TF_SKIZZE&&typeof window.TF_SKIZZE==="object")?window.TF_SKIZZE:null
  };
  try{
    // Trainer-Token statt anon (RLS: trainingsformen schreibbar nur fuer is_trainer). Kein svg-Feld (Spalte existiert nicht).
    // return=representation: die id kommt zurueck und die Uebung ist sofort nachtraeglich
    // bearbeitbar (Skizze nachtragen) – vorher ging das erst nach einem Neuladen.
    var res=await fetch(SB_URL+'/rest/v1/trainingsformen',{
      method:'POST',
      headers:sbAuthHeaders({'Prefer':'return=representation'}),
      body:JSON.stringify(form)
    });
    if(!res.ok){toast("Cloud-Speicherung fehlgeschlagen – nur lokal gespeichert","info");}
    else{ try{const zeile=(await res.json())[0]; if(zeile&&zeile.id)form.id=zeile.id;}catch(e){} }
  }catch(e){toast("Offline – Übung nur lokal gespeichert","info");}
  // Bild sofort mitrechnen, damit die neue Übung in der Liste nicht erst nach einem
  // Neuladen ihre Skizze zeigt. OHNE eigene Skizze bleibt es leer (v412) – siehe oben.
  try{ form.svg=form.skizze?_skz(form.skizze):""; }catch(e){}
  CUSTOM_FORMS.push(form);
  closeAddTraining();
  renderTraining();
  toast("Übung gespeichert ✓");
}

function openAddTraining(){
  document.getElementById('training-modal').style.display='block';
  window.TF_SKIZZE=null;                                   // jede Übung startet ohne Skizze
  if(typeof tfSkizzeVorschau==="function")tfSkizzeVorschau(); // Welle 2 – ungeschützt reißt es den Dialog mit
}
function closeAddTraining(){
  document.getElementById('training-modal').style.display='none';
  window.TF_SKIZZE=null;
  if(typeof tfSkizzeVorschau==="function")tfSkizzeVorschau();
  ['tf-name','tf-ablauf','tf-varianten','tf-coaching','tf-spieler','tf-feld','tf-dauer'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('tf-spass').value='5';
  document.getElementById('tf-diff').value='2';
  document.getElementById('tf-kat').value='raute';
}

/* setTF/ftag-Filter entfernt (PO-Umbau) – die Datenbank filtert über Gruppen-Kacheln (TF_GRUPPEN). */

// Trainings-Periodisierung: Saison-Themenplan (ein Schwerpunkt je Monat) – zeigt oben im Trainings-Tab.
const PERIOD_CATS={aufwaermen:'Aufwärmen',raute:'Raute & Grundordnung',passspiel:'Passspiel',wahrnehmung:'Wahrnehmung & IQ',technik:'Technik & Ball',pressing:'Pressing & Umschalten',spass:'Spass & Wettbewerb',torwart:'Torwart',individual:'Individual',mindset:'Mindset'};
async function periodLoad(){
  const box=document.getElementById("period-banner"); if(!box)return;
  const monat=new Date().toISOString().slice(0,7);
  let cur=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${monat}&select=*`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0];}catch(e){}
  const monName=new Date().toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  window._periodKat=cur&&cur.kategorie?cur.kategorie:null; // fürs Schwerpunkt-Badge auf den Übungskarten
  if(cur){
    box.innerHTML=`<div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1"><strong>🎯 Schwerpunkt ${esc(monName)}: ${esc(cur.thema)}</strong>${cur.kategorie?`<div style="font-size:11px;margin-top:2px">Passende Übungen: <b>${esc(PERIOD_CATS[cur.kategorie]||cur.kategorie)}</b> – über die Kategorien unten filtern.</div>`:""}</div><button onclick="periodOpen()" class="btn btn-sm" style="flex:none">📅 Plan</button></div>`;
  }else{
    box.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><span style="flex:1">Plane die Saison in <b>Themenblöcken</b> (ein Schwerpunkt je Monat).</span><button onclick="periodOpen()" class="btn btn-sm" style="flex:none">📅 Themenplan</button></div>`;
  }
}
async function periodOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("period-modal")?.remove();
  const modal=document.createElement("div");modal.id="period-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Saison-Themenplan");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const opts=Object.entries(PERIOD_CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("period-modal","📅","Saison-Themenplan","Ein Schwerpunkt je Monat · erscheint oben im Trainings-Tab","#2563eb")}
    <div id="period-list" style="margin-bottom:12px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <label style="font-size:11px;color:var(--text2)">Monat<input type="month" id="period-monat" value="${new Date().toISOString().slice(0,7)}" style="${fld}"></label>
      <label style="font-size:11px;color:var(--text2)">Kategorie<select id="period-kat" style="${fld}"><option value="">—</option>${opts}</select></label>
    </div>
    <label style="font-size:11px;color:var(--text2)">Thema<input id="period-thema" placeholder="z. B. Dribbling & 1-gegen-1" style="${fld}"></label>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn btn-p" onclick="periodSave()"><i class="ti ti-plus"></i>Speichern</button>
      <button class="btn btn-sm" onclick="document.getElementById('period-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
  periodListRender();
}
async function periodListRender(){
  const box=document.getElementById("period-list"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/periodisierung?select=*&order=monat.asc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML='<div style="color:var(--text3);font-size:12.5px;padding:6px 0">Noch keine Monate geplant.</div>';return;}
  const fmtM=m=>{const p=String(m).split("-");return p.length===2?new Date(p[0],p[1]-1,1).toLocaleDateString("de-DE",{month:"short",year:"2-digit"}):m;};
  box.innerHTML=rows.map(x=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--surface2)">
    <span style="font-weight:700;font-size:11px;color:var(--blue);width:58px">${esc(fmtM(x.monat))}</span>
    <span style="flex:1;font-size:13px">${esc(x.thema)}${x.kategorie?` <span style="font-size:10px;color:var(--text3)">(${esc(PERIOD_CATS[x.kategorie]||x.kategorie)})</span>`:""}</span>
    <button onclick="periodDelete('${esc(x.monat)}')" title="löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;font-size:13px;padding:2px 4px"><i class="ti ti-trash"></i></button>
  </div>`).join("");
}
async function periodSave(){
  const monat=document.getElementById("period-monat")?.value;
  const thema=(document.getElementById("period-thema")?.value||"").trim();
  const kategorie=document.getElementById("period-kat")?.value||null;
  if(!monat||!thema){toast("Monat und Thema angeben","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/periodisierung?on_conflict=monat`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({monat,thema,kategorie,updated_at:new Date().toISOString()})});if(sbCheck401(r))return;if(!r.ok&&r.status!==201){toast("Speichern fehlgeschlagen","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  const t=document.getElementById("period-thema");if(t)t.value="";
  toast("Themenplan gespeichert ✓");periodListRender();periodLoad();
}
async function periodDelete(monat){
  if(!confirm(`Monats-Schwerpunkt für ${monat} wirklich löschen?`))return;
  try{await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${encodeURIComponent(monat)}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  periodListRender();periodLoad();
}
/* PO-Umbau: Die Formen-Datenbank spricht dieselbe Sprache wie der Übungs-Picker in der
   Planung – Gruppen-Kacheln statt Filter-Chips, Karten statt Klapplisten, ⭐-Schwierigkeit,
   „lange nicht gemacht“-Filter und Übernahme direkt in den Trainingsplan. */
const TF_GRUPPEN=[
  {key:"aufwaermen",label:"🔥 Aufwärmen",kats:["aufwaermen"]},
  {key:"technik",label:"⚽ Technik & Ballgefühl",kats:["technik","wahrnehmung"]},
  {key:"passen",label:"🎯 Passen & Spielaufbau",kats:["passspiel","raute"]},
  {key:"zweikampf",label:"🛡️ 1 gegen 1 & Zweikampf",kats:["pressing"]},
  {key:"kopf",label:"🎉 Spaß & Kopf",kats:["spass","mindset"]},
  {key:"torwart",label:"🧤 Torwart",kats:["torwart"]},
  {key:"individual",label:"🧍 Individual",kats:["individual"]},
  {key:"custom",label:"🧪 Eigene & KI",kats:["custom"]}
];
let _tfDb={gruppe:null,stern:0,lange:false};
function _tfGruppeVon(f,i){
  if(f.custom||i>=(typeof TRAININGSFORMEN!=="undefined"?TRAININGSFORMEN.length:0))return "custom";
  const g=TF_GRUPPEN.find(g2=>g2.kats.includes(f.kat));
  return g?g.key:"custom";
}
function renderTraining(){
  const wrap=document.getElementById('training-content'); if(!wrap)return;
  if(!window._periodLoaded){window._periodLoaded=true;periodLoad();}
  if(!window._uebungMeta)uebungMetaLoad().then(()=>renderTraining()); // ⭐-Overrides einmal nachladen
  const search=((document.getElementById('training-search')||{}).value||"").trim().toLowerCase();
  const alle=tpAllForms().map((f,i)=>({i,f,gr:_tfGruppeVon(f,i)}));
  // Team-Schwäche einmal je Render bestimmen (Badge „stärkt …“ auf passenden Karten)
  let weak=[];window._tfWeakLabel=null;
  try{
    const avg=(teamAggregate()||{}).avg||{};
    const s=Object.entries(avg).filter(([,v])=>v!=null).sort((a,b)=>a[1]-b[1]);
    if(s.length){window._tfWeakLabel=AUTOPLAN_DIMLABEL[s[0][0]]||null;weak=AUTOPLAN_DIMKAT[s[0][0]]||[];}
  }catch(e){}
  window._tfWeak=weak;
  const kEl=document.getElementById("tf-kacheln");
  if(kEl){
    const counts={};alle.forEach(x=>{counts[x.gr]=(counts[x.gr]||0)+1;});
    kEl.innerHTML=TF_GRUPPEN.filter(g=>counts[g.key]).map(g=>`<button onclick="_tfDb.gruppe=_tfDb.gruppe==='${g.key}'?null:'${g.key}';renderTraining()" style="min-height:64px;border:1px solid var(--rand-bedien);${_tfDb.gruppe===g.key?"background:#16a34a;color:#fff;border-color:#16a34a;":"background:var(--surface);color:var(--text);"}border-top:3px solid #16a34a;border-radius:14px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer;padding:8px 6px">${g.label}<span style="display:block;font-size:11px;font-weight:700;opacity:.7;margin-top:2px">${counts[g.key]} Übungen</span></button>`).join("");
  }
  const fEl=document.getElementById("tf-filter");
  if(fEl)fEl.innerHTML=[0,1,2,3].map(s=>`<button onclick="_tfDb.stern=${s};renderTraining()" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);${_tfDb.stern===s?"background:#16a34a;color:#fff;border-color:#16a34a;":"background:var(--surface2);color:var(--text2);"}border-radius:10px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">${s===0?"Alle":"⭐".repeat(s)}</button>`).join("")
    +`<button onclick="_tfDb.lange=!_tfDb.lange;renderTraining()" title="Übungen, die 4+ Wochen nicht dran waren" style="flex:1.4;min-height:44px;border:1px solid var(--rand-bedien);${_tfDb.lange?"background:#16a34a;color:#fff;border-color:#16a34a;":"background:var(--surface2);color:var(--text2);"}border-radius:10px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">🕘 lange her</button>`;
  // Ohne Auswahl nur die Kacheln zeigen – keine 100-Übungen-Liste
  if(!search&&!_tfDb.gruppe&&!_tfDb.stern&&!_tfDb.lange){
    wrap.innerHTML='<div style="text-align:center;padding:1.6rem 1rem;color:var(--text2)"><div style="font-size:30px;margin-bottom:6px">📚</div><div style="font-size:13.5px;font-weight:700;color:var(--text)">Gruppe antippen oder suchen</div></div>';
    return;
  }
  let items=alle;
  if(search)items=items.filter(x=>((x.f.name||"")+" "+(x.f.kurz||"")+" "+(x.f.kat||"")).toLowerCase().includes(search));
  else if(_tfDb.gruppe)items=items.filter(x=>x.gr===_tfDb.gruppe);
  if(_tfDb.stern)items=items.filter(x=>_tpStern(x.f)===_tfDb.stern);
  if(_tfDb.lange)items=items.filter(x=>{const d=tpLastUsedDays(x.i);return d===null||d>=28;});
  if(!items.length){wrap.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text3);font-size:13px">Keine Übung gefunden.</div>';return;}
  items=items.filter(x=>x.f.focus).concat(items.filter(x=>!x.f.focus)); // Fokus-Übungen zuerst
  wrap.innerHTML=`<div style="font-size:12px;font-weight:800;color:var(--text2);margin:2px 0 6px">${items.length} Übung${items.length===1?"":"en"}</div>`+items.map(_tfKarte).join("");
}
function _tfKarte(x){
  const d=tpLastUsedDays(x.i);
  const frische=d===null?'<span style="color:#16a34a">🆕 neu</span>':(d<14?`<span style="color:#b45309">vor ${d} T.</span>`:`vor ${d} T.`);
  const stern=_tpStern(x.f);
  const badges=[];
  if(x.f.focus)badges.push('<span style="background:#fef3c7;color:#92400e;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:800;white-space:nowrap">⭐ Fokus</span>');
  if(window._periodKat&&x.f.kat===window._periodKat)badges.push('<span style="background:#dbeafe;color:#1e40af;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:800;white-space:nowrap">🎯 Monats-Schwerpunkt</span>');
  if((window._tfWeak||[]).includes(x.f.kat))badges.push(`<span style="background:#fee2e2;color:#991b1b;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:800;white-space:nowrap">📊 stärkt ${esc(window._tfWeakLabel||"Team-Schwäche")}</span>`);
  return `<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-radius:12px;padding:10px 12px;margin-bottom:8px;background:var(--surface)">
    <button onclick="tpShowExercise(${x.i})" style="flex:1;min-width:0;min-height:44px;border:none;background:transparent;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;padding:0">
      <span style="display:block;font-size:14px;font-weight:800">${esc(x.f.name)}${badges.length?" "+badges.join(" "):""}</span>
      <span style="display:block;font-size:11.5px;color:var(--text2);margin-top:2px">${x.f.dauer||"?"} Min. · ${esc(String(x.f.spieler||"?"))} Sp. · ${esc(x.f.feld||"?")} · ${frische}</span>
    </button>
    <button onclick="tpSternTipp('${(x.f.name||"").replace(/'/g,"\\'")}')" title="Schwierigkeit antippen zum Ändern" style="min-width:48px;min-height:44px;border:none;background:transparent;color:#f59e0b;font-size:12px;cursor:pointer;letter-spacing:1px">${"⭐".repeat(stern)}</button>
    <button onclick="tfInPlan(${x.i})" aria-label="In den Trainingsplan übernehmen" title="In den Trainingsplan übernehmen" style="min-width:44px;min-height:44px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-size:17px;font-weight:900;cursor:pointer">➕</button>
  </div>`;
}
// Übung aus der Datenbank in den nächsten freien, passenden Slot des Trainingsplans legen.
// Passend = ein Slot, dessen (typ-gefiltertes) Auswahl-Select diese Übung überhaupt anbietet.
function tfInPlan(i){
  go("planung");
  setTimeout(()=>{
    const sels=[...document.querySelectorAll(".tp-form-sel")];
    const ziel=sels.find(s=>!s.value&&[...s.options].some(o=>o.value===String(i)));
    if(!ziel){toast("Kein freier passender Slot – erst Phase hinzufügen","err");return;}
    ziel.value=String(i);
    try{tpOnSelectChange(ziel);}catch(e){}
    tpPickSync(ziel.id);
    (ziel.closest(".tp-station")||ziel.closest(".tp-slot"))?.scrollIntoView({behavior:"smooth",block:"center"});
    toast("Übung im Plan ✓");
  },900);
}

function toggleTF(id){
  var body=document.getElementById('body-'+id);
  var chev=document.getElementById('chev-'+id);
  if(!body)return;
  var open=body.classList.toggle('open');
  if(chev)chev.style.transform=open?'rotate(180deg)':'';
}

/* PRINT: printView() ist weiter oben (bei renderProfil) vollständig definiert –
   inkl. Titel/Meta-Kopf und Aufklappen eingeklappter Dim-Blöcke. Die frühere
   schlanke Duplikat-Definition an dieser Stelle wurde entfernt (sie überschrieb
   die vollständige Variante und unterdrückte so die Druck-Kopfzeile). */

// p-date (Bewertung), tp-date (Planung) und aw-date (Anwesenheit) sind jetzt Termin-Dropdowns –
// gefüllt aus den echten Terminen beim Öffnen des jeweiligen Tabs (terminSelectFill).
/* Nach einem Neuladen (Browser-Refresh, Tab-Wiederherstellung) wieder dort landen, wo man
   war – nicht auf der Startseite. Erst nach loadKader, damit die Seite ihre Daten vorfindet. */
/* Sofort lesen: openTab("home") drei Zeilen weiter unten schreibt „home" hinein, bevor
   die Kette unten fertig ist – gelesen wird also, was VOR dem Neuladen galt. */
const _bootLetzteSeite=(()=>{try{return sessionStorage.getItem("adler_letzte_seite");}catch(e){return null;}})();
function bootSeiteZurueck(){
  const k=_bootLetzteSeite;
  if(!k||k==="home"||typeof SECS==="undefined"||!SECS[k])return false;
  window._nutzungStumm=true; try{go(k);}finally{window._nutzungStumm=false;}   // ein Neuladen ist kein Besuch
  return true;
}
loadKader().then(()=>loadDB()).then(()=>{if(!bootSeiteZurueck()&&curSection==="home")renderHome();}).then(()=>teamSyncLoad()).then(()=>setTimeout(showMilestoneHint,1500)); // Kader (Supabase) zuerst, dann G1 + KI-Light + Home-Stats
loadCustomForms();
openTab("home"); // Start auf dem Trainer-Dashboard + Sub-Tab-Leiste initial rendern
/* loadTeamConfig lebt in md-quests.js = Welle 2. Seit dem Zwei-Wellen-Laden ist es hier
   (Welle 1, boot.js-Top-Level) noch NICHT definiert -> ReferenceError killte den ganzen
   Startup und das PIN-Gate blieb taub. Erst rufen, wenn Welle 2 die Funktion bereitstellt. */
(function waitTeamConfig(n){
  if(typeof loadTeamConfig==="function"){
    if(sbToken())loadTeamConfig().then(()=>{if(typeof curSection!=="undefined"&&curSection==="home")renderHome();}).catch(()=>{});
  }else if(n<40){ setTimeout(()=>waitTeamConfig(n+1),100); }
})(0);

/* Pull-to-Refresh (Schritt 6): am Listenanfang nach unten wischen -> Daten still neu laden. */
async function appRefresh(){
  try{ await loadDB(); if(typeof refreshSelects==="function")refreshSelects(); }catch(e){}
  try{ const sec=SECS[curSection]; if(sec&&sec.init)sec.init(); }catch(e){}
}
(function(){
  let startY=0, pulling=false, dist=0, ind=null;
  const THRESH=70;
  const scrollTop=()=>window.scrollY||document.documentElement.scrollTop||0;
  function el(){
    if(ind)return ind;
    ind=document.createElement("div");
    ind.id="ptr-ind";
    ind.style.cssText="position:fixed;top:0;left:50%;z-index:60;background:var(--club-accent,#1a56db);color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25);transition:transform .18s;transform:translate(-50%,-56px);font-size:18px";
    ind.innerHTML='<i class="ti ti-refresh"></i>';
    document.body.appendChild(ind);
    return ind;
  }
  document.addEventListener("touchstart",e=>{
    if(scrollTop()>0||document.body.classList.contains("quiz-extern")){pulling=false;return;}
    startY=e.touches[0].clientY; pulling=true; dist=0;
  },{passive:true});
  document.addEventListener("touchmove",e=>{
    if(!pulling)return;
    dist=e.touches[0].clientY-startY;
    if(dist<=0||scrollTop()>0){ pulling=false; el().style.transform="translate(-50%,-56px)"; return; }
    const pull=Math.min(dist,120);
    el().style.transform=`translate(-50%,${Math.min(pull-56,20)}px) rotate(${Math.round(pull*3)}deg)`;
  },{passive:true});
  document.addEventListener("touchend",async()=>{
    if(!pulling)return;
    pulling=false;
    const e=el();
    if(dist>=THRESH){
      e.style.transform="translate(-50%,16px)";
      e.querySelector("i").classList.add("ptr-spin");
      await appRefresh();
      if(typeof toast==="function")toast("Aktualisiert ✓");
      e.querySelector("i").classList.remove("ptr-spin");
    }
    e.style.transform="translate(-50%,-56px)";
  },{passive:true});
})();

/* switchTrainSub() lebt jetzt als Shim im 5-Tab-Router (siehe oben, delegiert an go()).
   Die frühere vollständige Definition wurde entfernt – ihre Init-Logik steckt in SECS. */

/* ═══════════════════════════════════
   TEAM-MODUL (Block G)
═══════════════════════════════════ */
// Header-Helfer für Team-Tabellen – seit Block I mit User-Token (RLS: nur authenticated)
function sbTeamHeaders(){
  return sbAuthHeaders();
}

// G1: local-first Upsert (Fehler still schlucken – offline-fähig bleiben)
async function teamSyncUpsert(table,datum,data,extra){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/${table}?on_conflict=datum`,{
      method:"POST",
      headers:{...sbTeamHeaders(),'Prefer':'resolution=merge-duplicates'},
      /* v478: updated_at MUSS mit – ein Upsert per merge-duplicates laesst die Spalte sonst
         auf dem Wert des ersten Anlegens stehen. Die Konfliktregel „juengerer updated_at
         gewinnt" (teamSyncLoad) hielt den Server damit fuer immer aelter als jede lokale
         Kopie, und zwei Handys ueberschrieben sich gegenseitig (07.09.: die Trainerliste
         vom Platz wurde abends durch den Vorab-Stand von gestern ersetzt). Seit v478 setzt
         zusaetzlich ein Datenbank-Trigger die Spalte bei jedem Update. */
      body:JSON.stringify(Object.assign({datum,data:(table==="anwesenheit"&&typeof kidMapToIds==="function")?kidMapToIds(data):data,updated_at:new Date().toISOString()},extra||{})) // HOTFIX 3-FE: optional termin_id
    });
    /* Vorher wurde r.ok NIE geprueft: bei 403/500 glaubte der Trainer "gespeichert",
       das Zweitgeraet sah aber nichts. Einmal pro Minute ehrlich Bescheid geben. */
    if(!r.ok&&(!teamSyncUpsert._warnAt||Date.now()-teamSyncUpsert._warnAt>60000)){
      teamSyncUpsert._warnAt=Date.now();
      toast("⚠️ Nur lokal gespeichert – Team-Sync gerade nicht möglich","err");
    }
  }catch(e){/* offline: Daten liegen lokal, Sync folgt beim naechsten Speichern */}
}
// Schritt 6 (API-Debouncing): Netzwerk-Schutz. Bursts auf DIESELBE (table,datum)-Zeile
// werden zu einem Write zusammengefasst (1,5 s). Lokal wird sofort gespeichert (local-first),
// nur der Supabase-Write wartet – schützt vor Request-Spam bei schnellem Tippen/Speichern.
const _tsuTimers={};
function teamSyncUpsertDebounced(table,datum,data,extra){
  const key=table+"|"+datum;
  clearTimeout(_tsuTimers[key]);
  _tsuTimers[key]=setTimeout(()=>{ delete _tsuTimers[key]; teamSyncUpsert(table,datum,data,extra); }, 1500);
}
// Generischer Debounce-Helfer (wiederverwendbar)
function debounce(fn,ms){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms); }; }

// G1: lokale Schreib-Zeitstempel je Datum (für Konfliktregel "jüngerer updated_at gewinnt")
const AW_TS_KEY="adler_anwesenheit_ts",EVAL_TS_KEY="adler_training_eval_ts";
function teamTsSet(key,datum){
  const ts=safeParse(localStorage.getItem(key),{})||{};
  ts[datum]=new Date().toISOString();
  localStorage.setItem(key,JSON.stringify(ts));
}

// G1: beim Start beide Tabellen laden und mit localStorage mergen
async function teamSyncLoad(){
  const merge=async(table,localObj,storeKey,tsKey)=>{
    try{
      const r=await fetch(`${SB_URL}/rest/v1/${table}?select=*`,{headers:sbTeamHeaders()});
      if(!r.ok)return;
      const rows=await r.json();
      const localTs=safeParse(localStorage.getItem(tsKey),{})||{};
      const remoteByDatum={};
      rows.forEach(row=>{if(row&&row.datum)remoteByDatum[row.datum]=row;});
      rows.forEach(row=>{
        if(!row||!row.datum)return;
        const lts=localTs[row.datum];
        // Remote übernehmen, wenn lokal nichts da ist oder Remote jünger ist
        if(!localObj[row.datum]||!lts||new Date(row.updated_at||0)>=new Date(lts)){
          // Anwesenheit liegt in der Datenbank nach kader.id, im Speicher nach Name
          localObj[row.datum]=(table==="anwesenheit"&&typeof kidMapFromIds==="function")?kidMapFromIds(row.data):row.data;
        }
      });
      // Push-Back: lokale Änderungen, die beim Offline-Speichern nie ankamen (oder neuer als
      // der Remote-Stand sind), jetzt im Hintergrund nachreichen statt für immer lokal gefangen
      // zu bleiben
      Object.keys(localObj).forEach(datum=>{
        const lts=localTs[datum];
        if(!lts)return; // kein lokaler Zeitstempel = nie offline geändert, nichts zu pushen
        const remote=remoteByDatum[datum];
        if(!remote||new Date(lts)>new Date(remote.updated_at||0)){
          teamSyncUpsert(table,datum,localObj[datum]);
        }
      });
      localStorage.setItem(storeKey,JSON.stringify(localObj));
    }catch(e){/* offline */}
  };
  await merge("anwesenheit",AW_DATA,AW_KEY,AW_TS_KEY);
  await merge("trainings_eval",EVAL_DATA,EVAL_KEY,EVAL_TS_KEY);
}

// Micro-Voting: Schwerpunkt-Abstimmung fürs nächste Training (async, aggregiert)
const TV_OPTIONS=["Umschaltspiel","Passschärfe","Zweikampf","Spaß & Motivation"];
function tvInit(){
  const box=document.getElementById("tv-buttons");
  if(!box)return;
  box.innerHTML=TV_OPTIONS.map(o=>`<button class="btn btn-sm" style="min-height:44px" onclick="tvVote('${o.replace(/'/g,"")}')">${o}</button>`).join("");
  tvLoad();
}
async function tvVote(wahl){
  const autor=document.getElementById("tv-autor")?.value||"";
  if(!autor){toast("Bitte Trainer wählen","err");return;}
  const datum=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_polls?on_conflict=datum,autor`,{
      method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum,autor,wahl})
    });
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("Stimme gezählt ✓");tvLoad();}
    else toast("Fehler beim Abstimmen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tvLoad(){
  const wrap=document.getElementById("tv-results");
  if(!wrap)return;
  const datum=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_polls?datum=eq.${encodeURIComponent(datum)}&select=autor,wahl`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){wrap.innerHTML="";return;}
    const rows=await r.json();
    const counts={};TV_OPTIONS.forEach(o=>counts[o]=0);
    rows.forEach(v=>{if(counts[v.wahl]!=null)counts[v.wahl]++;});
    const total=rows.length;
    if(!total){wrap.innerHTML='<div style="font-size:11px;color:var(--text3)">Noch keine Stimme heute.</div>';return;}
    wrap.innerHTML=`<div style="font-size:10px;color:var(--text3);margin-bottom:6px">${total} Stimme${total!==1?"n":""} heute</div>`+TV_OPTIONS.map(o=>{
      const c=counts[o], pct=total?Math.round(c/total*100):0;
      return `<div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px"><span>${o}</span><span style="color:var(--text2)">${c}</span></div>
        <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--blue);border-radius:4px;transition:width .3s"></div></div>
      </div>`;
    }).join("");
  }catch(e){wrap.innerHTML="";}
}

/* ═══════════════════════════════════
   ANWESENHEITS-TRACKER
═══════════════════════════════════ */
let AW_DATA={};
const AW_KEY="adler_anwesenheit";
try{AW_DATA=JSON.parse(localStorage.getItem(AW_KEY)||"{}");}catch(e){AW_DATA={};}

/* Generisch: ein <select> aus den echten Terminen füllen – keine freien Datumsfelder mehr.
   opt.types (Standard alle 4), opt.future (true = künftige zuerst + nächster vorgewählt,
   sonst neueste zuerst + jüngster vergangener vorgewählt), opt.onReady (Callback danach). */
function terminOptionLabel(t){
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ};
  const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const dd=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});
  return `${wtag} ${dd} · ${m.icon} ${esc(t.titel||t.gegner||m.label)}`;
}
// Eine gecachte Terminliste bedient alle drei Datums-Selects (Anwesenheit/Planung/Bewertung)
// – statt bei jedem Tab-Öffnen 90 Termine neu zu ziehen (45s-TTL).
let _termineSel={rows:null,at:0};
async function _termineSelLoad(){
  if(_termineSel.rows && Date.now()-_termineSel.at<45000) return _termineSel.rows;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=datum,typ,titel,gegner,uhrzeit,uhrzeit_ende&order=datum.desc,uhrzeit.desc.nullslast&limit=120`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  _termineSel={rows:rows||[],at:Date.now()};
  return _termineSel.rows;
}
async function terminSelectFill(selId, opt){
  opt=opt||{}; const sel=document.getElementById(selId); if(!sel)return;
  const types=opt.types||["training","spiel","turnier","event"], future=!!opt.future;
  const heute=new Date().toISOString().slice(0,10);
  let rows=(await _termineSelLoad()).filter(t=>types.includes(t.typ));
  // future: NUR heute + kommende (geplant wird nie für die Vergangenheit – PO);
  // vonTagen: zusätzlich die letzten N Tage (Anwesenheits-Nachträge), Rest fliegt raus.
  if(future)rows=rows.filter(t=>t.datum>=heute).slice().sort((a,b)=>(a.datum<b.datum?-1:a.datum>b.datum?1:0));
  else if(opt.vonTagen){const min=new Date(Date.now()-opt.vonTagen*864e5).toISOString().slice(0,10);rows=rows.filter(t=>t.datum>=min);}
  if(!rows.length){ sel.innerHTML=`<option value="${heute}">Heute (${heute}) – noch kein Termin hinterlegt</option>`; if(opt.onReady)opt.onReady(); return; }
  sel.innerHTML=rows.map(t=>`<option value="${t.datum}">${terminOptionLabel(t)}</option>`).join("");
  let def;
  /* v478: vorbeiUeberspringen – der Plan stand um 22 Uhr noch auf dem Training von 16:45.
     Geplant wird fuer das naechste, nicht fuer das beendete. Die Anwesenheit dagegen
     bleibt auf heute: nach dem Training wird nachgetragen. */
  if(future){ const kand=opt.vorbeiUeberspringen?rows.find(t=>t.datum>=heute&&!(typeof terminVorbei==="function"&&terminVorbei(t))):null;
    def=(kand||rows.find(t=>t.datum>=heute)||rows[rows.length-1]).datum; }   // nächster künftiger
  else { const past=rows.find(t=>t.datum<=heute); def=past?past.datum:rows[rows.length-1].datum; } // jüngster vergangener
  sel.value=def;
  if(opt.onReady)opt.onReady();
}
// Stellt sicher, dass ein bestimmtes Datum als Option existiert (z. B. das Datum einer alten
// Bewertung, das keinem Termin entspricht) und wählt es aus.
function terminSelectEnsure(selId, datum){
  const sel=document.getElementById(selId); if(!sel||!datum)return;
  if(![...sel.options].some(o=>o.value===datum)){
    const d=new Date(datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const dd=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});
    const o=document.createElement("option"); o.value=datum; o.textContent=`${wtag} ${dd}`; sel.insertBefore(o,sel.firstChild);
  }
  sel.value=datum;
}
// Anwesenheit: heute + kommende + die letzten 7 Tage (Nachträge) – ältere raus (PO).
/* PO: In der Auswahl stehen nur heute + kommende Termine – Anwesenheit wird am Platz
   erfasst. Wer etwas vergessen hat, holt die letzten 3 Wochen bewusst per Klick dazu. */
async function awDatesLoad(){
  const hint=document.getElementById("aw-nachtragen");
  if(hint)hint.innerHTML=`<button class="btn btn-sm" style="margin-top:6px" onclick="awNachtragen()">🕘 Vergangenes nachtragen</button>`;
  /* v477 – PO: „Die Reiter Trainingsplan und Übungen sind immer noch da, obwohl es kein
     Training ist. Und das Turnier läuft unter dem Reiter Training." Ein Ort je Termintyp:
     hier nur Trainings. Spiel und Turnier haben ihre Anwesenheit in „Teams festlegen"
     (Dabei = anwesend, zaehlt fuer die Spiele-Quote); Events brauchen keine – niemand las sie. */
  return terminSelectFill("aw-date",{types:["training"],future:true,onReady:awLoad});
}
async function awNachtragen(){
  const hint=document.getElementById("aw-nachtragen");
  if(hint)hint.innerHTML=`<div style="font-size:11.5px;color:var(--text2);margin-top:6px">🕘 Auch vergangene Termine (3 Wochen) in der Liste</div>`;
  return terminSelectFill("aw-date",{types:["training"],vonTagen:21,onReady:awLoad});
}
function awRenderList(){
  const wrap=document.getElementById("aw-list");
  if(!wrap)return;
  const de=document.getElementById("aw-date"); const datum=de?de.value:"";
  const existing=AW_DATA[datum]||{};
  // PO-Umbau: statt langer Zeilenliste ein 3-spaltiges Kachel-Raster – ein Tipp pro Kind
  // (grün = da). Die Sterne aus „Einheit bewerten" bleiben klein auf der Kachel sichtbar.
  let html=`<button class="btn btn-sm" style="margin:8px 0" onclick="awAlleDa()">✅ Alle da (dann Fehlende abwählen)</button>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`;
  KADER.filter(k=>k.aktiv!==false).forEach(k=>{
    const p=existing[k.name]||{da:false,qual:0};
    html+=`<button class="aw-tile${p.da?" on":""}" onclick="awToggle(this,'${jsq(k.name)}')" data-player="${esc(k.name)}">
      <span class="aw-ok">✓</span>
      <span style="font-size:13px;font-weight:800;line-height:1.2">${esc(k.name)}</span>
      ${p.qual?`<span title="Bewertung aus „Einheit bewerten“" style="font-size:9px;color:#f59e0b;letter-spacing:1px">${"★".repeat(p.qual)}</span>`:""}
    </button>`;
  });
  html+='</div>';
  wrap.innerHTML=html;
  awRenderStats();
}

function awToggle(btn,name){
  window._awDirty=true; // Haken gesetzt, aber noch nicht gespeichert
  btn.classList.toggle("on");
}
/* v475: Trainer-Haken in der Anwesenheit. Ist der Tag noch nicht da, geht der Tipp in die
   Quelle (Rueckmeldung des Trainings-Termins); am Tag selbst ist er Teil der Anwesenheit
   und wird mit „Speichern" zur Tatsache. */
async function awTrainerToggle(cb){
  const datum=document.getElementById("aw-date")?.value||"";
  if(awZaehltAlsTatsache(datum)){ window._awDirty=true; return; }
  const optText=document.getElementById("aw-date")?.selectedOptions?.[0]?.textContent||"";
  const t=await terminDesTages(datum,optText); const tid=t?t.id:null;   // v476: auch Spiel/Turnier/Event
  if(!tid){ window._awDirty=true; return; }   // kein Termin an diesem Tag: wie bisher lokal
  const st=await trainerRsvpSetzen(tid,cb.value,cb.checked?"ja":"nein",datum);
  if(!st)cb.checked=!cb.checked;   // nicht gespeichert – Haken zuruecknehmen, sonst luegt die Anzeige
}
function awAlleDa(){
  document.querySelectorAll("#aw-list .aw-tile").forEach(b=>b.classList.add("on"));
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
}

function awSave(){
  const datum=document.getElementById("aw-date").value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  /* v475: Vor dem Tag sind die Trainer-Haken nur die Rueckmeldungen – die stehen schon
     am Termin. Nicht als Tatsache abspeichern, sonst friert der Stand von heute ein und
     ueberdeckt am Tag selbst jede spaetere Zu- oder Absage (so geschehen am 11.09.). */
  const trainers=awZaehltAlsTatsache(datum)?Array.from(document.querySelectorAll("#aw-trainer-checks input:checked")).map(c=>c.value):[];
  const data={_trainers:trainers};
  const vorher=AW_DATA[datum]||{};
  KADER.forEach(k=>{
    const toggle=document.querySelector(`.aw-tile[data-player="${k.name}"]`);
    // qual wird hier NICHT mehr erfasst (steht in "Einheit bewerten") – bestehenden Wert
    // uebernehmen, sonst wuerde jedes Anwesenheits-Speichern die Sterne auf 0 setzen.
    data[k.name]={da:toggle?.classList.contains("on")||false,qual:(vorher[k.name]||{}).qual||0};
  });
  AW_DATA[datum]=data;
  localStorage.setItem(AW_KEY,JSON.stringify(AW_DATA));
  teamTsSet(AW_TS_KEY,datum); // G1
  // HOTFIX 3-FE: termin_id mitschreiben (falls Termin am Datum existiert) -> Cascade greift
  terminIdForDatum(datum).then(tid=>teamSyncUpsertDebounced("anwesenheit",datum,data,tid?{termin_id:tid}:null));
  // FEAT S: Trainings-XP für anwesende Kinder – idempotent pro Datum (quelle_id),
  // Mehrfach-Speichern vergibt also nie doppelt. Un-Toggle nimmt bewusst nichts weg.
  KADER.forEach(k=>{if(data[k.name]&&data[k.name].da)xpAwardByName(k.name,"training",datum).catch(()=>{});});
  awStreakAward(data); // F7: Serien-Meilensteine + Feier-Toast
  awRenderStats();
  awRenderTrainerStats();
  try{navigator.vibrate&&navigator.vibrate(50);}catch(e){} // 1C: haptische Bestätigung
  toast("Anwesenheit gespeichert ✓"); window._awDirty=false;
}

/* ═══════════════════════════════════
   FEAT V: BUDDY-AUSLOSUNG (Welle 1)
   Fisher-Yates über die anwesend markierten Kinder → Zweier-Paare,
   bei ungerader Zahl wird das letzte Paar zum Dreier-Team.
   Anzeige zuerst (fürs Hochhalten am Platz), Persistenz best-effort
   in termine.buddies des Termins am gewählten Datum.
═══════════════════════════════════ */
/* FEAT V2: KLEINGRUPPEN-AUSLOSUNG – aus der Anwesenheit in die Trainings-Planung
   umgezogen (PO). 2er/3er/4er-Gruppen, zufällig (Buddy-Charakter) oder ausgewogen
   (nach Stärke, Schlangenlinie). Reste machen die letzten Gruppen größer – nie eine
   Mini-Restgruppe (13 Kinder in 4ern = 4+4+5). Quelle: heutige Anwesenheit, sonst
   der aktive Kader; pausierte Kinder bleiben außen vor. */
let _kgGroesse=2;
function _kgPool(){
  const h=new Date(), d=h.getFullYear()+"-"+String(h.getMonth()+1).padStart(2,"0")+"-"+String(h.getDate()).padStart(2,"0");
  const day=(AW_DATA||{})[d]||{};
  const aktive=KADER.filter(k=>k.aktiv!==false).map(k=>k.name);
  const da=aktive.filter(n=>day[n]&&day[n].da===true);
  const basis=da.length>=2?da:aktive;
  return {
    namen:basis.filter(n=>!(typeof istPaused==="function"&&istPaused(n))),
    ausAnwesenheit:da.length>=2
  };
}
function kleingruppenOpen(){
  document.getElementById("kg-modal")?.remove();
  const m=document.createElement("div");m.id="kg-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Kleingruppen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("kg-modal","👥","Kleingruppen","Buddy-Auslosung für Übungen – 2er, 3er oder 4er","#16a34a")}
    <div id="kg-chips" style="display:flex;gap:8px;margin-bottom:10px"></div>
    <div id="kg-quelle" style="font-size:12px;margin-bottom:10px"></div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button class="btn btn-p" style="flex:1;min-height:52px" onclick="kgLos('zufall')">🎲 Zufällig losen</button>
      <button class="btn" style="flex:1;min-height:52px" onclick="kgLos('ausgewogen')">⚖️ Ausgewogen</button>
    </div>
    <div id="kg-result"></div>
  </div>`;
  document.body.appendChild(m);
  _kgChipsRender();
  const p=_kgPool();
  const q=document.getElementById("kg-quelle");
  if(q)q.innerHTML=p.ausAnwesenheit
    ?`<span style="color:#166534">Quelle: Anwesenheit heute – ${p.namen.length} Kinder.</span>`
    :`<span style="color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:6px 10px;display:inline-block">Heute ist noch keine Anwesenheit erfasst – ich nehme den ganzen Kader (${p.namen.length} Kinder).</span>`;
}
function _kgChipsRender(){
  const el=document.getElementById("kg-chips"); if(!el)return;
  el.innerHTML=[2,3,4].map(n=>`<button onclick="kgGroesse(${n})" style="flex:1;min-height:48px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:${_kgGroesse===n?"#16a34a":"var(--surface2)"};color:${_kgGroesse===n?"#fff":"var(--text2)"}">${n}er-Gruppen</button>`).join("");
}
function kgGroesse(n){_kgGroesse=n;_kgChipsRender();}
async function kgLos(modus){
  if(typeof pauseLoad==="function")await pauseLoad();
  const pool=_kgPool();
  let namen=pool.namen.slice();
  if(namen.length<2){toast("Mindestens 2 Kinder nötig","err");return;}
  const gr=_kgGroesse, g=Math.max(1,Math.floor(namen.length/gr));
  const gruppen=Array.from({length:g},()=>[]);
  if(modus==="ausgewogen"){
    const st=x=>(typeof teamStaerke==="function")?Math.max(0,teamStaerke(x)):0;
    namen.sort((a,b)=>st(b)-st(a));
    // Schlangenlinie: stark und weniger stark mischen sich gleichmäßig
    namen.forEach((n,i)=>{const runde=Math.floor(i/g), pos=runde%2===0?(i%g):(g-1-(i%g));gruppen[pos].push(n);});
  }else{
    for(let i=namen.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[namen[i],namen[j]]=[namen[j],namen[i]];}
    // Reste vergrößern die LETZTEN Gruppen (13 in 4ern = 4+4+5, keine Mini-Gruppe)
    const rest=namen.length-g*gr;
    let idx=0;
    // min(): bei weniger Kindern als Gruppengröße (3 Kinder, 4er-Gruppen) wäre rest
    // negativ und die Schleife hätte über das Array hinaus gegriffen → "undefined" im Team.
    for(let gi=0;gi<g;gi++){const size=Math.min(gr+(gi>=g-rest?1:0),namen.length-idx);for(let j=0;j<size;j++)gruppen[gi].push(namen[idx++]);}
  }
  const farben=["#eff6ff","#f0fdf4","#fef3c7","#fdf2f8","#f0f9ff","#f5f3ff","#fff7ed","#f0fdfa"];
  const el=document.getElementById("kg-result");
  if(el)el.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
    ${gruppen.map((p,i)=>`<div style="padding:14px;border-radius:12px;background:${farben[i%farben.length]};color:#1e293b;font-size:16px;font-weight:800;text-align:center">${p.map(esc).join(" 🤝 ")}</div>`).join("")}
  </div>`;
  _kgPersist(gruppen);
  try{navigator.vibrate&&navigator.vibrate([30,40,30]);}catch(e){}
}
// Persistenz best effort am geplanten Termin (tp-date), sonst am heutigen Termin
async function _kgPersist(gruppen){
  const h=new Date(), heute=h.getFullYear()+"-"+String(h.getMonth()+1).padStart(2,"0")+"-"+String(h.getDate()).padStart(2,"0");
  const datum=document.getElementById("tp-date")?.value||heute;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&select=id&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    const rows=await r.json();
    if(!rows.length)return; // kein Termin an dem Tag -> nur Anzeige, kein Fehler
    await fetch(`${SB_URL}/rest/v1/termine?id=eq.${rows[0].id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({buddies:gruppen.map(g=>kidListToIds(g))})});
  }catch(e){}
}

function awLoad(){
  if(window._awDirty&&!confirm("Ungespeicherte Anwesenheits-Haken verwerfen?"))return;
  window._awDirty=false;
  const datum=document.getElementById("aw-date").value;
  const existing=AW_DATA[datum]||{};
  const savedTrainers=existing._trainers;
  const apply=list=>document.querySelectorAll("#aw-trainer-checks input").forEach(cb=>{cb.checked=(list||[]).includes(cb.value);});
  /* v475: Erst wenn der Tag da ist, sind die Haken die Tatsache. Vorher zeigen sie die
     Rueckmeldungen – und ein Tipp darauf aendert die Rueckmeldung (awTrainerToggle). */
  const tatsache=awZaehltAlsTatsache(datum);
  const quelle=document.getElementById("aw-trainer-quelle");
  if(quelle)quelle.innerHTML=tatsache
    ? '<span title="Was du hier anhakst und speicherst, ist die Anwesenheit dieses Tages – sie zählt im Trainingsplan und in der Saison-Statistik.">✅ Anwesenheit dieses Tages – Haken setzen und speichern</span>'
    : '<span title="Der Tag ist noch nicht da. Die Haken zeigen die Rückmeldungen aus „Bist du dabei?“; antippen setzt die Rückmeldung des Trainers – für alle sichtbar.">📣 Aus den <b>Rückmeldungen</b> – antippen ändert die Rückmeldung für alle</span>';
  if(tatsache&&savedTrainers&&savedTrainers.length){ apply(savedTrainers); }
  else apply([]);
  /* v476: der Termin des Tages – auch Spiel, Turnier, Event. Vorher nur typ=training, an
     einem Turniertag also nichts. Liefert Rueckmeldungen fuer die Haken und den Typ fuer
     die Karte darunter. */
  const optText=document.getElementById("aw-date")?.selectedOptions?.[0]?.textContent||"";
  terminDesTages(datum,optText).then(t=>{
    if(document.getElementById("aw-date")?.value!==datum)return;   // inzwischen umgeschaltet
    if(!(tatsache&&savedTrainers&&savedTrainers.length)){
      const ts=(t&&t.trainer_status)||{}; const ja=Object.keys(ts).filter(n=>ts[n]==="ja"); if(ja.length)apply(ja);
    }
  }).catch(()=>{});
  awRenderList();
  // v482: Kader noch nicht da (Start ohne gueltigen Token)? Dann nach dem Laden nachzeichnen.
  if(typeof KADER!=="undefined"&&!KADER.length&&typeof loadKader==="function")loadKader().then(()=>{ if(KADER.length&&document.getElementById("aw-date")?.value===datum)awRenderList(); }).catch(()=>{});
}
/* v477: Das Vorhaken der Anwesenheit aus der Nominierung ist weg – Spieltage stehen
   nicht mehr in dieser Auswahl. Die Anwesenheit eines Spieltags IST die Nominierung. */

/* Saison-Übersichten hinter EINER Kachel (PO): Modal mit zwei großen Kacheln,
   die Inhalte rendern in die bekannten Container-IDs (aw-stats / aw-trainer-stats). */
function awUebersichtOpen(){
  document.getElementById("awueb-modal")?.remove();
  const m=document.createElement("div");m.id="awueb-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Anwesenheits-Übersicht");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("awueb-modal","📊","Anwesenheit (Saison)","Spieler, Trainer und die Quote inklusive Spiele","#16a34a")}
    <div id="awueb-tabs" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px"></div>
    <div id="awueb-inhalt"></div>
  </div>`;
  document.body.appendChild(m);
  awUebersichtZeig("spieler");
}
function awUebersichtZeig(art){
  const tabs=document.getElementById("awueb-tabs");
  // Dritter Reiter „Spiele" seit v381: die Quote (inkl. Nominierungen) sass frueher auf
  // einer eigenen Team-Kachel direkt daneben. Zwei aehnliche Einstiege nebeneinander –
  // jetzt eine Tuer, drei Reiter.
  if(tabs)tabs.innerHTML=[["spieler","🧒","Spieler"],["trainer","🧑‍🏫","Trainer"],["spiele","⚽","Spiele"]].map(([k,emo,l])=>
    `<button onclick="awUebersichtZeig('${k}')" style="min-height:72px;border:1px solid var(--rand-bedien);${art===k?"border-top:3px solid #16a34a;background:var(--surface2);":"border-top:3px solid transparent;background:var(--surface);"}border-radius:14px;color:var(--text);cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px 6px">
      <span style="font-size:26px">${emo}</span><span style="font-size:13px;font-weight:800">${l}</span>
    </button>`).join("");
  const wrap=document.getElementById("awueb-inhalt"); if(!wrap)return;
  if(art==="spiele"){
    wrap.innerHTML='<div id="awueb-quote">Lade…</div>';
    // Welle-1-Funktion, aber der Schutz kostet nichts und haelt den Reiter am Leben,
    // falls die Quote spaeter in ein Modul wandert.
    if(typeof anwesenheitQuoteInto==="function")anwesenheitQuoteInto(document.getElementById("awueb-quote"));
    else wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Die Quote ist gerade nicht verfügbar.</div>';
    return;
  }
  wrap.innerHTML=art==="spieler"?'<div id="aw-stats"></div>':'<div id="aw-trainer-stats"></div>';
  art==="spieler"?awRenderStats():awRenderTrainerStats();
}
/* Zähltage der Saison – EINE Grundlage fuer Spieler-Tabelle, Trainer-Tabelle und Serie.
   Dieselben zwei Regeln wie die Zahlen neben der Nominierung (v462/v463): erst ab dem
   Saison-Stichtag, und nur echte Trainingstage – am Spiel- oder Turniertag wird auch
   eine Anwesenheit gefuehrt, die hier sonst als Training durchginge.
   saisonStart()/trainingstageSet() liegen in Welle 2, deshalb nur ueber die typeof-Wache;
   ohne das Modul zaehlen wie frueher alle erfassten Tage. */
let _awTageGeholt=false;
function awZaehltage(){
  const ab=(typeof saisonStart==="function")?saisonStart():"0000-01-01";
  const tage=(typeof trainingstageSet==="function")?trainingstageSet():null;
  /* Beim ersten Zeichnen ist das Set oft noch nicht da. Einmal nachladen und die
     offenen Tabellen neu zeichnen – sonst zaehlten sie dauerhaft die Spieltage mit. */
  if(!tage&&!_awTageGeholt&&typeof trainingstageLaden==="function"){
    _awTageGeholt=true;
    trainingstageLaden().then(()=>{
      if(document.getElementById("aw-stats"))awRenderStats();
      if(document.getElementById("aw-trainer-stats"))awRenderTrainerStats();
    }).catch(()=>{});
  }
  return Object.keys(AW_DATA||{}).filter(d=>d>=ab&&(!tage||tage.has(d))).sort();
}
function awRenderTrainerStats(){
  const wrap=document.getElementById("aw-trainer-stats");
  if(!wrap)return;
  const dates=awZaehltage();
  const allTrainers=((typeof TRAINER!=="undefined"&&TRAINER)||[]); // Single Source: TRAINER aus data.js (Welle 1), keine Notfall-Kopie mehr
  if(!dates.length){wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Noch kein Training in dieser Saison erfasst.</div>';return;}
  const stats={};
  allTrainers.forEach(t=>{stats[t]={da:0,total:dates.length};});
  dates.forEach(d=>{
    const trainers=AW_DATA[d]._trainers||[];
    trainers.forEach(t=>{if(stats[t])stats[t].da++;});
  });
  /* Hier stand bis v465 eine Auswertung der durchgefuehrten Uebungen je Trainer aus
     EVAL_DATA. Sie wurde bei jedem Zeichnen berechnet und nie ausgegeben – PO hat sich
     gegen das Feature entschieden. Die Spalte „Einheiten" zeigt die Anwesenheit. */
  let html='<div class="card" style="overflow:hidden;font-size:12px">';
  html+='<div style="display:grid;grid-template-columns:1fr 60px 70px;padding:6px 10px;background:var(--surface2);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">';
  html+='<div>Trainer</div><div>Quote</div><div>Einheiten</div></div>';
  allTrainers.forEach(t=>{
    const s=stats[t];
    const pct=s.total?Math.round(s.da/s.total*100):0;
    const col=pct>=80?"#16a34a":pct>=50?"#b45309":"#dc2626";
    html+=`<div style="display:grid;grid-template-columns:1fr 60px 70px;padding:6px 10px;border-top:var(--border);align-items:center">
      <div style="font-weight:600">${t}</div>
      <div style="color:${col};font-weight:700">${pct}%</div>
      <div style="color:var(--text2)">${s.da}/${s.total}</div>
    </div>`;
  });
  html+='</div>';
  html+=`<div style="font-size:10px;color:var(--text3);margin-top:6px">Grundlage: ${dates.length} Training${dates.length===1?"":"s"} dieser Saison – Spiel- und Turniertage zählen nicht mit.</div>`;
  wrap.innerHTML=html;
}

/* F7: Anwesenheits-Serie – aufeinanderfolgende ERFASSTE Einheiten (neueste zuerst), in
   denen das Kind „da" war. Erste Abwesenheit beendet die Serie; Einheiten vor dem Beitritt
   (Kind fehlt im Datensatz) werden übersprungen, nicht als Lücke gewertet. */
const AW_STREAK_MILES=[3,5,8,12,16,20];
function awStreak(name){
  // Dieselben Zähltage: ein Turnier, bei dem das Kind nicht dabei war, ist keine
  // gerissene Trainings-Serie.
  const dates=awZaehltage().reverse();
  let s=0;
  for(const d of dates){ const day=AW_DATA[d]; if(!day||!(name in day))continue; if(day[name]&&day[name].da)s++; else break; }
  return s;
}
// Milestone-Federn für erreichte Serien (idempotent pro Meilenstein via xp_award_event) +
// eine Feier-Toast für die längste neue Serie. Aufruf nach dem Speichern der Anwesenheit.
function awStreakAward(data){
  let bestStreak=0,bestName="";
  KADER.forEach(k=>{
    if(!(data[k.name]&&data[k.name].da))return;
    const st=awStreak(k.name);
    AW_STREAK_MILES.filter(m=>m<=st).forEach(m=>{try{xpAwardByName(k.name,"streak","s"+m).catch(()=>{});}catch(e){}});
    if(st>bestStreak){bestStreak=st;bestName=k.name;}
  });
  if(bestStreak>=3)setTimeout(()=>toast(`🔥 ${bestName}: ${bestStreak}× in Folge dabei!`),700);
}
function awRenderStats(){
  const wrap=document.getElementById("aw-stats");
  if(!wrap)return;
  const dates=awZaehltage();
  if(!dates.length){wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Noch kein Training in dieser Saison erfasst.</div>';return;}
  const stats={};
  KADER.forEach(k=>{stats[k.name]={total:0,da:0,qualSum:0,qualCount:0};});
  dates.forEach(d=>{
    const day=AW_DATA[d];
    KADER.forEach(k=>{
      stats[k.name].total++;
      if(day[k.name]?.da){
        stats[k.name].da++;
        if(day[k.name].qual>0){stats[k.name].qualSum+=day[k.name].qual;stats[k.name].qualCount++;}
      }
    });
  });
  let html='<div class="card" style="overflow:hidden;font-size:12px">';
  html+='<div style="display:grid;grid-template-columns:1fr 60px 60px 70px;padding:6px 10px;background:var(--surface2);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">';
  html+='<div>Spieler</div><div>Quote</div><div title="Durchschnitt der Sterne-Bewertung aus „Einheit bewerten" (nur Tage, an denen das Kind da war)">Ø ★</div><div>Einheiten</div></div>';
  KADER.forEach(k=>{
    const s=stats[k.name];
    const pct=s.total?Math.round(s.da/s.total*100):0;
    const avgQ=s.qualCount?Math.round(s.qualSum/s.qualCount*10)/10:"-";
    const col=pct>=80?"#16a34a":pct>=50?"#b45309":"#dc2626";
    const st=awStreak(k.name);
    const flame=st>=2?` <span title="${st}× in Folge dabei" style="font-size:11px;font-weight:700;color:#ea580c">🔥${st}</span>`:"";
    html+=`<div style="display:grid;grid-template-columns:1fr 60px 60px 70px;padding:6px 10px;border-top:var(--border);align-items:center">
      <div style="font-weight:600">${k.name}${flame}</div>
      <div style="color:${col};font-weight:700">${pct}%</div>
      <div>${avgQ!=="-"?"★".repeat(Math.round(avgQ)):"-"}</div>
      <div style="color:var(--text2)">${s.da}/${s.total}</div>
    </div>`;
  });
  html+='</div>';
  html+='<div style="font-size:10px;color:var(--text3);margin-top:6px">Ø ★ = durchschnittliche Trainings-Bewertung des Kindes aus „Einheit bewerten" (an Anwesenheits-Tagen).</div>';
  wrap.innerHTML=html;
}

/* ═══════════════════════════════════
   TRAININGSPLANUNG
═══════════════════════════════════ */
/* Standard-Einheit nach DFB-/FIFA-Linie: Ankommensspiele ab dem ersten Kind, zwei
   Hauptteile (mit Variations-Hinweis nach ~10 Min – Aufmerksamkeitsspanne 7–9 J.),
   Abschluss 20 statt 15 Min, weil das freie Spiel im Wettspielformat (3v3/FUNiño)
   der wichtigste Teil der Einheit ist. 10+20+20+20 = 70 von 75 Min. */
const TP_PHASEN=[
  {label:"Ankommen & Aufwärmen",dauer:10,farbe:"#059669",typ:"warmup"},
  {label:"Hauptteil 1",dauer:20,farbe:"#1a56db",typ:"main"},
  {label:"Hauptteil 2",dauer:20,farbe:"#7c3aed",typ:"main"},
  {label:"Abschlussspiel",dauer:20,farbe:"#c2410c",typ:"abschluss"}
];
let tpSlots=[...TP_PHASEN];
let tpExerciseLog={};
try{tpExerciseLog=JSON.parse(localStorage.getItem("adler_exercise_log")||"{}");}catch(e){tpExerciseLog={};}

function tpGetExerciseHistory(formIdx){
  const entries=[];
  Object.entries(tpExerciseLog).forEach(([date,forms])=>{
    if(forms.includes(formIdx))entries.push(date);
  });
  return entries.sort().reverse();
}
// Tage seit letztem Einsatz einer Form (null = nie genutzt) – für Vielfalt-Hinweise.
function tpLastUsedDays(formIdx){
  const h=tpGetExerciseHistory(formIdx);
  if(!h.length)return null;
  const last=new Date(h[0]); if(isNaN(last))return null;
  return Math.max(0,Math.floor((Date.now()-last.getTime())/86400000));
}
/* autoPlanFreshHint entfernt (letzter Nutzer war autoPlanBuild) – die Uebungs-Datenbank
   zeigt die Frische selbst in _tfKarte an. */

function tpGetTrainerCount(){
  return document.querySelectorAll("#tp-trainer-checks input:checked").length;
}

function tpFilteredOpts(typ,kat){
  const allForms=tpAllForms();
  if(typ==="warmup") return allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="aufwaermen");
  if(typ==="tw") return allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="torwart");
  if(typ==="individual") return allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="individual");
  const mainForms=allForms.map((f,i)=>({i,f})).filter(x=>!["aufwaermen","torwart","individual"].includes(x.f.kat)); // custom/KI-Übungen jetzt im Hauptteil wählbar
  if(kat) return mainForms.filter(x=>x.f.kat===kat);
  return mainForms;
}
/* Torwart- UND Individual-Training laufen NEBEN einem Hauptteil, nicht dahinter: die
   Torhüter bzw. das eine Kind sind während dieser Station weg, die Einheit wird dadurch
   nicht länger. Bis v382 galt das nur für „individual" – ein Torwart-Block wurde hinten
   angehängt und zählte voll auf die Gesamtzeit („85 von 75 Min. – zu lang!"), obwohl
   parallel trainiert wird. Beide Typen laufen jetzt durch dieselben Weichen. */
const TP_PARALLEL_TYPEN=["individual","tw"];
function tpKannParallel(typ){return TP_PARALLEL_TYPEN.includes(typ||"main");}
function tpIstParallel(slot){return !!(slot&&tpKannParallel(slot.typ)&&slot.parallelZu!=null&&tpSlots[slot.parallelZu]);}
function tpParallelIcon(typ){return typ==="tw"?"🧤 ":"🎯 ";}
function tpGetCheckedTrainers(){
  return Array.from(document.querySelectorAll("#tp-trainer-checks input:checked")).map(c=>c.value);
}
const TP_MAIN_CATS=[
  {key:"raute",label:"Raute & Grundordnung"},
  {key:"mindset",label:"Mindset & Selbstvertrauen"},
  {key:"passspiel",label:"Passspiel & Freilaufen"},
  {key:"wahrnehmung",label:"Wahrnehmung & IQ"},
  {key:"technik",label:"Technik & Ball"},
  {key:"pressing",label:"Pressing & Umschalten"},
  {key:"spass",label:"Spaß & Wettbewerb"}
];
function tpOnCatChange(selId,si,p){
  const catSel=document.getElementById("tp-cat-"+si+"-"+p);
  const formSel=document.getElementById(selId);
  if(!catSel||!formSel)return;
  const kat=catSel.value;
  const filtered=tpFilteredOpts("main",kat||null);
  formSel.innerHTML='<option value="">— Übung wählen —</option>'+filtered.map(x=>`<option value="${x.i}">${x.f.name} (${x.f.dauer})</option>`).join("");
  formSel.value="";
  const histDiv=document.getElementById(selId+"-hist");
  if(histDiv)histDiv.innerHTML="";
}

/* v483: Kommentare der Trainer zu einer Uebung aus „Einheit bewerten" – juengster zuerst. */
function tpUebungKommentare(formIdx){
  const out=[];
  if(typeof EVAL_DATA!=="object"||!EVAL_DATA)return out;
  Object.keys(EVAL_DATA).sort().reverse().forEach(datum=>{
    (EVAL_DATA[datum]||[]).forEach(e=>{ if(e&&e.formIdx===formIdx&&e.notiz&&String(e.notiz).trim())out.push({datum,trainer:e.trainer||"",notiz:String(e.notiz).trim()}); });
  });
  return out;
}
function tpExerciseHistoryHtml(formIdx){
  const hist=tpGetExerciseHistory(formIdx);
  if(!hist.length) return '<span style="color:var(--text3);font-size:9px">Noch nie verwendet</span>';
  const k=tpUebungKommentare(formIdx)[0];
  const kurz=k?` · 💬 „${esc(k.notiz.length>70?k.notiz.slice(0,68)+"…":k.notiz)}“`:"";
  return `<span style="color:var(--text3);font-size:9px" title="${k?esc(k.notiz+" ("+(k.trainer?k.trainer+", ":"")+new Date(k.datum).toLocaleDateString("de-DE")+")"):""}">✓ ${hist.length}× verwendet – zuletzt ${new Date(hist[0]).toLocaleDateString("de-DE")}${kurz}</span>`;
}

function tpShowExercise(formIdx){
  const allForms=tpAllForms();
  const f=allForms[formIdx];
  if(!f)return;
  const hist=tpGetExerciseHistory(formIdx);
  const komm=tpUebungKommentare(formIdx).slice(0,3);
  const kommHtml=komm.length?`<div style="margin-top:8px;font-size:11px;color:var(--text2)"><strong>💬 Kommentare der Trainer:</strong>${komm.map(k=>`<div style="margin-top:3px">„${esc(k.notiz)}“ <span style="color:var(--text3)">– ${k.trainer?esc(k.trainer)+", ":""}${new Date(k.datum).toLocaleDateString("de-DE")}</span></div>`).join("")}</div>`:"";
  const histHtml=kommHtml+(hist.length?`<div style="margin-top:8px;font-size:11px;color:var(--text2)"><strong>Einsatz-Historie (${hist.length}×):</strong><br>${hist.slice(0,8).map(d=>'• '+new Date(d).toLocaleDateString("de-DE")).join('<br>')}</div>`:'<div style="margin-top:8px;font-size:11px;color:var(--text3)">Noch nie in einer Einheit verwendet.</div>');
  /* PO v412: „oben die Zeile ist abgetrennt im text und unten steht der text komplett
     nochmal." – `kurz` ist bei eigenen Übungen genau der abgeschnittene Anfang von
     `ablauf` (slice(0,80)). Als Untertitel über demselben Text ist das keine
     Zusammenfassung, sondern eine kaputte Dopplung. Nur zeigen, wenn es wirklich etwas
     anderes ist. */
  const kurz=String(f.kurz||"").trim(), ablauf=String(f.ablauf||"").trim();
  const norm=s=>s.replace(/\s+/g," ").toLowerCase();
  const zeigKurz=kurz&&!norm(ablauf).startsWith(norm(kurz).replace(/[.…]+$/,""));
  const eigene=!!(f.custom||f.id);
  const modal=document.createElement("div");
  modal.id="uebung-modal";
  modal.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px";
  if(typeof zOben==="function")modal.style.zIndex=zOben(9999);
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:380px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25)">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
      <div style="font-size:14px;font-weight:700;color:var(--text)">${esc(f.name)}</div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text2)">×</button>
    </div>
    ${zeigKurz?`<div style="font-size:11px;color:var(--text2);margin-bottom:6px">${esc(kurz)}</div>`:""}
    ${f.svg
      ? `<div style="margin-bottom:2px">${f.svg}</div>${typeof skzLegende==="function"?skzLegende():""}`
      : (eigene?`<div style="border:1px dashed var(--text3);border-radius:10px;padding:12px;margin-bottom:8px;text-align:center">
          <div style="font-size:11.5px;color:var(--text3);margin-bottom:8px">Für diese Übung gibt es noch keine Skizze.</div>
          <button onclick="uebungSkizzeNachtragen(${formIdx})" style="min-height:44px;padding:8px 14px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">🎨 Skizze zeichnen</button>
        </div>`:"")}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <span style="font-size:10px;background:var(--surface);padding:2px 6px;border-radius:4px">⏱ ${f.dauer}</span>
      <span style="font-size:10px;background:var(--surface);padding:2px 6px;border-radius:4px">👥 ${f.spieler||"?"}</span>
      <span style="font-size:10px;background:var(--surface);padding:2px 6px;border-radius:4px">📐 ${f.feld||"?"}</span>
    </div>
    <div style="font-size:11px;color:var(--text);white-space:pre-wrap;line-height:1.5;margin-bottom:8px">${esc(f.ablauf||"")}</div>
    ${f.coaching?`<div style="font-size:10px;color:var(--text2);background:var(--surface);padding:8px;border-radius:6px;white-space:pre-wrap"><strong>🎯 Coaching-Tipps:</strong>\n${esc(f.coaching)}</div>`:""}
    ${histHtml}
  </div>`;
  document.body.appendChild(modal);
}

// Stationen-Board: Trainer-Zuweisung pro Übungs-Station (wer macht was)
let tpCoaches={};
/* Ein Trainer, ein Platz: wer an einem parallelen Block (Torwart-/Einzeltraining) dieses
   Hauptteils haengt, steht fuer dessen Felder nicht zur Verfuegung. Vorher zaehlte die
   Feldzahl alle angehakten Trainer – vier Trainer, Finn beim Torwart-Training, und
   trotzdem vier Felder, das vierte mit einem Trainer, der schon eines hatte. */
function tpParallelTrainer(mainIdx){
  const s=new Set();
  tpSlots.forEach((sl,i)=>{ if(tpIstParallel(sl)&&sl.parallelZu===mainIdx){const t=tpCoaches[`tp-form-${i}-0`]; if(t)s.add(t);} });
  return s;
}
/* Weniger Felder als ausgeloste Gruppen (weil ein Trainer am Torwart-/Einzelblock steht):
   die ueberzaehligen Gruppen spielen bei den kleinsten Feldern mit – nur fuer diesen
   Hauptteil, die Auslosung selbst bleibt unangetastet (ein anderer Hauptteil ohne Block
   hat wieder alle Gruppen). Kein Kind verschwindet, keine Gruppe wird gespeichert. */
function tpFelderGruppen(tg,n,weg){
  const alle=(tg&&tg.gruppen)||[];
  if(!alle.length)return [];
  const raus=Array.isArray(weg)?weg:[];
  // Vom Trainer weggelassene Felder: ihre Gruppe wird auf die anderen verteilt
  const g=alle.filter((x,i)=>!raus.includes(i)).concat(alle.filter((x,i)=>raus.includes(i)));
  n=Math.max(1,Math.min(n||g.length,g.length));
  const felder=g.slice(0,n).map(x=>({...x,kinder:(x.kinder||[]).slice(),dazu:[]}));
  g.slice(n).forEach(x=>{
    let ziel=felder[0]; felder.forEach(f=>{if(f.kinder.length<ziel.kinder.length)ziel=f;});
    ziel.kinder=ziel.kinder.concat(x.kinder||[]); ziel.dazu.push(x.name);
  });
  felder.forEach(f=>{ if(f.dazu.length)f.name=f.name+" + "+f.dazu.join(" + "); });
  return felder;
}
/* „✕ Feld weglassen" im Trainer-Dropdown eines Hauptteils: weniger Uebungen als Felder
   moeglich – die Gruppe dieses Feldes spielt bei den anderen mit. Position der Felder
   dahinter rueckt nach, die Trainer-Zuordnung wandert mit. Zurueck ueber „wieder aufnehmen". */
function tpFeldWeglassen(si,p){
  const slot=tpSlots[si]; if(!slot)return;
  const anzahl=document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`).length;
  if(anzahl<=1)return;
  const weg=Array.isArray(slot.weg)?slot.weg.slice():[];
  // p ist die Position unter den SICHTBAREN Feldern; auf den Gruppen-Index abbilden
  const tg=(typeof tgFor==="function")?tgFor():null;
  const sichtbar=tg&&tg.gruppen?tg.gruppen.map((x,i)=>i).filter(i=>!weg.includes(i)):null;
  weg.push(sichtbar?(sichtbar[p]!=null?sichtbar[p]:p):(weg.length+p));
  slot.weg=weg;
  for(let q=p;q<anzahl-1;q++){const a=tpCoaches[`tp-form-${si}-${q+1}`]; if(a)tpCoaches[`tp-form-${si}-${q}`]=a; else delete tpCoaches[`tp-form-${si}-${q}`];}
  delete tpCoaches[`tp-form-${si}-${anzahl-1}`];
  tpRenderTimeline(); tpPlanSaveDebounced();
}
function tpFeldZurueck(si){ if(tpSlots[si]){delete tpSlots[si].weg; tpRenderTimeline(); tpPlanSaveDebounced();} }
function tpSetCoach(stationId,name){
  if(name==="__weg"){const m=String(stationId).match(/^tp-form-(\d+)-(\d+)$/); if(m)tpFeldWeglassen(+m[1],+m[2]); return;}
  tpCoaches[stationId]=name;
  tpPlanSaveDebounced();                        // Zuordnung am Datum festhalten
  // Trainer eines parallelen Blocks gewechselt → die Felder des Hauptteils rechnen neu
  const m=String(stationId).match(/^tp-form-(\d+)-0$/);
  if(m&&tpIstParallel(tpSlots[+m[1]]))tpRenderTimeline();
}
function tpCoachSelect(stationId,ausschluss,wegOption){
  const avail=tpGetCheckedTrainers();
  const cur=tpCoaches[stationId]||"";
  const list=(avail.length?avail:TRAINER).filter(t=>!(ausschluss&&ausschluss.has(t)&&t!==cur));
  const weg=wegOption?`<option value="__weg">✕ Feld weglassen</option>`:"";
  return `<select class="tp-coach-sel" data-station="${stationId}" onchange="tpSetCoach('${stationId}',this.value)" aria-label="Trainer für diese Station" title="Wer leitet diese Station?">
    <option value="">👤 Trainer?</option>${list.map(t=>`<option value="${t}"${t===cur?" selected":""}>${t}</option>`).join("")}${weg}
  </select>`;
}

/* ── Trainer-Chips in der Planung folgen den Rückmeldungen (PO v413) ─────────
   „Die trainer die hier angeklickt sind sollen sich aus den Rückmeldungen der Trainer
   automatisch befüllen bzw offen bleiben oder mit rot markiert werden wenn der Trainer
   nicht kann oder gelb wenn es unsicher ist."

   Vorher waren zwei Namen fest angehakt – geraten, nicht gewusst. Die Antwort
   steht längst in `termine.trainer_status` (die „Bist du dabei?"-Kachel schreibt sie).

   Regel: nur ZUGESAGT wird automatisch angehakt. Unsicher bleibt sichtbar offen – ein
   Plan, der mit einem „vielleicht" rechnet, fällt am Platz auseinander; wer es trotzdem
   will, tippt einmal. Abgesagt ist rot und ebenfalls offen.
   Farbe ist nie der einzige Träger: jedes Chip trägt zusätzlich ein Zeichen (✓ 🤔 ✕). */
let TP_RSVP={}, TP_TRAINER_MANUELL={}, TP_VORBELEGT="", TP_ANWESEND=null;
const TP_RSVP_MARKE={ja:{ico:"✓",farbe:"var(--green)",titel:"hat zugesagt"},
                     unsicher:{ico:"🤔",farbe:"var(--amber)",titel:"ist unsicher"},
                     nein:{ico:"✕",farbe:"var(--red)",titel:"hat abgesagt"},
                     offen:{ico:"?",farbe:"var(--text3)",titel:"noch keine Rückmeldung"}};   // v475: „keine Antwort" sichtbar machen
let TP_TERMIN_ID=null;   // v475: der Trainings-Termin des Tages – Ziel fuer Aenderungen an der Rueckmeldung
/* v475 – PO: „Eigentlich müsste doch eine Quelle vorgegeben werden, wo ich als Trainer
   angebe, ob ich da bin, und dann müssten sich diese Ergebnisse in die weiteren
   Unterbereiche automatisch einpflegen … Dann muss es noch eine Möglichkeit geben, das
   händisch zu ändern, wenn ein Kollege kurzfristig absagt."
   Die Quelle ist die Rueckmeldung (termine.trainer_status – „Bist du dabei?" auf der
   Startseite, Trainerplan, Termin-Detail). Die Anwesenheit ist die Tatsache – aber erst,
   wenn der Tag da ist (heute oder vergangen). Vorher konnte eine im Voraus gespeicherte
   Anwesenheit (11.09., gespeichert am 07.09.) die Rueckmeldungen dauerhaft ueberdecken.
   Aendern heisst seit v475: in die Quelle schreiben, nicht daneben. */
function tpTrainerChipsRender(){
  const box=document.getElementById("tp-trainer-checks"); if(!box)return;
  // Woher die Haken kommen – sonst ist unerklaerlich, warum jemand angehakt ist oder nicht.
  const hinweis=document.getElementById("tp-trainer-quelle");
  if(hinweis)hinweis.innerHTML=TP_ANWESEND
    ? '<span title="Die Anwesenheitsliste dieses Tages ist erfasst – sie zählt mehr als die Rückmeldung.">✅ Aus der <b>Anwesenheit</b> dieses Tages – antippen ändert die Anwesenheit</span>'
    : (TP_TERMIN_ID
      ? '<span title="Die Rückmeldungen aus „Bist du dabei?“ bzw. dem Trainerplan. Antippen setzt die Rückmeldung des Trainers für diesen Termin – für alle sichtbar.">📣 Aus den <b>Rückmeldungen</b> – antippen ändert die Rückmeldung für alle</span>'
      : '<span title="Für diesen Tag gibt es keinen Trainings-Termin – die Haken gelten nur für diesen Plan.">📝 Kein Trainings-Termin an diesem Tag – Haken gelten nur hier</span>');
  const liste=(typeof TRAINER!=="undefined"&&Array.isArray(TRAINER))?TRAINER:[];
  box.innerHTML=liste.map(t=>{
    const st=TP_RSVP[t]||"", m=TP_RSVP_MARKE[st]||TP_RSVP_MARKE.offen;
    /* v478 – PO: „Die Haken oder Kreuze hinter den Namen stimmen irgendwie nicht." Am Tag
       mit erfasster Anwesenheit stand „Charles ✕" auf einem gruenen Chip – die Rueckmeldung
       (abgesagt) neben der Tatsache (war da). Zwei Wahrheiten in einem Chip. Am Tatsache-Tag
       zeigt der Chip nur noch die Anwesenheit; die Rueckmeldung bleibt im Tooltip. */
    const zeichen=TP_ANWESEND?"":(m?" "+m.ico:"");
    /* Tatsache schlaegt Vorhersage: liegt fuer den Tag schon Anwesenheit vor, zaehlt der
       Haken dort – sonst wie bisher die Rueckmeldung. */
    const auto=TP_ANWESEND?TP_ANWESEND.includes(t):(st==="ja");
    const an=(t in TP_TRAINER_MANUELL)?TP_TRAINER_MANUELL[t]:auto;
    // angehakt gewinnt optisch (grün wie bisher), das Zeichen bleibt trotzdem stehen –
    // sonst sieht man nicht mehr, dass der Trainer eigentlich „unsicher" gesagt hat
    const stil=an?"" : ((m&&!TP_ANWESEND)?`border-color:${m.farbe};color:${m.farbe}`:"");
    const grund=TP_ANWESEND
      ? (TP_ANWESEND.includes(t)?"steht in der Anwesenheit als anwesend":"in der Anwesenheit nicht angehakt")+" · Rückmeldung: "+m.titel
      : m.titel;
    const titel=grund
      +(an!==auto?(t===TP_VORBELEGT?" – du planst gerade, deshalb vorbelegt":" – von dir eingeplant"):"");
    return `<label class="tp-check"><input type="checkbox" value="${esc(t)}"${an?" checked":""}
      onchange="tpTrainerManuell('${String(t).replace(/'/g,"")}',this.checked)">
      <span style="${stil}" title="${esc(titel)}">${esc(t)}${zeichen}</span></label>`;
  }).join("");
}
/* v475: Antippen schreibt in die Quelle. Liegt die Anwesenheit des Tages vor, in die
   Anwesenheit; sonst in die Rueckmeldung des Trainings-Termins (ja/nein) – damit Startseite,
   Trainerplan, Termin-Detail und Anwesenheit dasselbe zeigen. Nur ohne Termin bleibt der
   Haken lokal (wie bisher). */
async function tpTrainerManuell(name,an){
  const datum=document.getElementById("tp-date")?.value||"";
  if(TP_ANWESEND&&datum){
    const liste=await awTrainerSetzen(datum,name,!!an);
    if(liste)TP_ANWESEND=liste.slice();
  }else if(TP_TERMIN_ID){
    const st=await trainerRsvpSetzen(TP_TERMIN_ID,name,an?"ja":"nein",datum);
    if(st)TP_RSVP=st;
    else TP_TRAINER_MANUELL[name]=!!an;   // nicht gespeichert – wenigstens diesen Plan richtig rechnen
  }else{
    TP_TRAINER_MANUELL[name]=!!an;
  }
  tpTrainerChipsRender(); tpRenderTimeline();
}
/* Rueckmeldung eines Trainers fuer einen Termin setzen – frisch vom Server lesen, dann
   nur diesen Namen aendern, damit die Antwort eines Kollegen von eben nicht ueberschrieben
   wird. Gibt den neuen trainer_status zurueck (oder null bei Fehler). */
async function trainerRsvpSetzen(terminId,name,status,datum){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${terminId}&select=trainer_status`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return null;
    const st=Object.assign({},(((await r.json())||[])[0]||{}).trainer_status||{});
    if(status)st[name]=status; else delete st[name];
    const p=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${terminId}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({trainer_status:st})});
    if(sbCheck401(p)||!p.ok){toast("Rückmeldung nicht gespeichert","err");return null;}
    const wann=datum?new Date(datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"}):"diesen Termin";
    toast(`${name}: ${status==="ja"?"dabei":"nicht dabei"} am ${wann} – gilt überall`);
    try{ if(typeof TM_TERMINE!=="undefined"&&Array.isArray(TM_TERMINE)){const t=TM_TERMINE.find(x=>Number(x.id)===Number(terminId)); if(t)t.trainer_status=st;} }catch(e){}
    try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
    return st;
  }catch(e){toast("Netzwerkfehler","err");return null;}
}
/* Trainer in der erfassten Anwesenheit eines Tages an- oder abhaken – nur `_trainers`
   aendern, die Kinder bleiben, wie sie sind. Gibt die neue Liste zurueck. */
async function awTrainerSetzen(datum,name,an){
  const tag=AW_DATA[datum]; if(!tag)return null;
  const liste=(Array.isArray(tag._trainers)?tag._trainers:[]).filter(t=>t!==name);
  if(an)liste.push(name);
  tag._trainers=liste;
  try{localStorage.setItem(AW_KEY,JSON.stringify(AW_DATA));}catch(e){}
  teamTsSet(AW_TS_KEY,datum);
  try{const tid=await terminIdForDatum(datum); teamSyncUpsertDebounced("anwesenheit",datum,tag,tid?{termin_id:tid}:null);}catch(e){}
  toast(`${name}: ${an?"anwesend":"nicht anwesend"} – in der Anwesenheit geändert`);
  document.querySelectorAll("#aw-trainer-checks input").forEach(cb=>{ if(cb.value===name)cb.checked=an; });
  return liste;
}
/* v476: Der Termin des Tages – egal welchen Typs. Bisher fragten Anwesenheit und Plan nur
   nach typ=training; an einem Turniertag (Kinderfestival, Samstag) fand sich so kein Termin,
   die Trainer-Chips blieben leer und ein Tipp darauf ging ins Leere. Steht in der Auswahl
   ein bestimmter Termin (Beschriftung), gewinnt der; sonst Training vor Spiel/Turnier/Event. */
async function terminDesTages(datum,optionText){
  if(!datum||typeof sbAuthHeaders!=="function")return null;
  let rows=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&select=id,typ,titel,gegner,ort,uhrzeit,heim,trainer_status&order=uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return null;
    rows=(await r.json())||[];
  }catch(e){return null;}
  if(!rows.length)return null;
  const txt=(optionText||"").replace(/\s+/g," ").trim();
  if(txt&&typeof terminOptionLabel==="function"){
    const passt=rows.find(t=>terminOptionLabel(Object.assign({datum},t)).replace(/\s+/g," ").trim()===txt);
    if(passt)return passt;
  }
  return rows.find(t=>t.typ==="training")||rows[0];
}
/* Gilt eine erfasste Anwesenheit als Tatsache? Erst, wenn der Tag da ist. Eine im Voraus
   gespeicherte Liste ist nur ein Abzug der Rueckmeldungen von damals. */
function awZaehltAlsTatsache(datum){
  if(!datum)return false;
  const heute=new Date(); const h=`${heute.getFullYear()}-${String(heute.getMonth()+1).padStart(2,"0")}-${String(heute.getDate()).padStart(2,"0")}`;
  return datum<=h;
}
async function tpTrainerRsvpLaden(datum){
  TP_RSVP={}; TP_TRAINER_MANUELL={}; TP_VORBELEGT=""; TP_ANWESEND=null; TP_TERMIN_ID=null;   // neuer Termin, neue Lage
  datum=datum||document.getElementById("tp-date")?.value||"";
  /* v470 – PO: „Check mal die Anwesenheiten der Trainer bezogen auf Trainingsplan und
     Anwesenheit. Die scheinen sich nicht abzugleichen."
     Sie taten es nicht: der Plan las `termine.trainer_status` (die Vorhersage aus „Bist du
     dabei?"), die Anwesenheitsliste `anwesenheit.data._trainers` (die Tatsache). Am 07.09.
     hatte Finn nie geantwortet, war aber angehakt – der Plan rechnete mit zwei Trainern
     statt drei, und aus der Trainerzahl folgen Felder und Gruppen.
     Regel jetzt: ist die Anwesenheit des Tages erfasst, gewinnt sie. Eine LEERE Liste gilt
     als „nichts erfasst" – sonst plante man mit null Trainern. */
  try{
    const tag=(typeof AW_DATA==="object"&&AW_DATA)?AW_DATA[datum]:null;
    if(awZaehltAlsTatsache(datum)&&tag&&Array.isArray(tag._trainers)&&tag._trainers.length)TP_ANWESEND=tag._trainers.slice();
  }catch(e){}
  if(datum&&typeof sbAuthHeaders==="function"){
    try{
      /* typ=eq.training ist entscheidend: die Auswahl gab bisher den FRUEHESTEN Termin
         des Tages her. Am 17.07. standen Spiel (10:45, ohne Rueckmeldungen), Training
         (16:45, drei Rueckmeldungen) und Event am selben Tag - geladen wurde das Spiel,
         und weil dann niemand zugesagt hatte, belegte die Automatik still nur den
         eingeloggten Trainer vor. Das Dropdown des Plans bietet ohnehin nur Trainings an. */
      const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,trainer_status&datum=eq.${encodeURIComponent(datum)}&typ=eq.training&order=uhrzeit.asc.nullslast&limit=1`,{headers:sbAuthHeaders()});
      if(r.ok){const t=((await r.json())||[])[0];
        if(t&&t.id!=null)TP_TERMIN_ID=t.id;
        if(t&&t.trainer_status&&typeof t.trainer_status==="object")TP_RSVP=t.trainer_status;}
    }catch(e){}
  }
  /* Hat noch NIEMAND zugesagt, wäre nichts angehakt – „automatisch planen" bräche mit
     „Mindestens 1 Trainer auswählen" ab. Dann den eingeloggten Trainer vorbelegen: wer
     gerade plant, ist mit hoher Wahrscheinlichkeit dabei. Das ist immer noch eine
     Annahme, aber eine begründete – und sie steht im Titel des Chips. */
  const jemand=!!TP_ANWESEND||Object.keys(TP_RSVP).some(k=>TP_RSVP[k]==="ja");
  if(!jemand&&typeof trainerMe==="function"){
    try{
      const me=await trainerMe();
      if(me&&typeof TRAINER!=="undefined"&&TRAINER.includes(me)){ TP_TRAINER_MANUELL[me]=true; TP_VORBELEGT=me; }
    }catch(e){}
  }
  tpTrainerChipsRender();
  tpRenderTimeline();
  tpNachbereitenKnopf(datum);
}
/* v483 – PO-Wahl: „Im Trainingsplan nach der Einheit". Ist das gewaehlte Training vorbei,
   steht oben im Plan der Weg in die Nachbereitung – auch fuer Trainer, die im Plan nicht
   eingeteilt waren und deshalb kein To-do bekommen. */
async function tpNachbereitenKnopf(datum){
  const slot=document.getElementById("tp-nachbereiten"); if(!slot)return;
  slot.innerHTML="";
  if(!datum||typeof _termineSelLoad!=="function"||typeof terminVorbei!=="function")return;
  let rows=[]; try{rows=await _termineSelLoad();}catch(e){}
  const t=rows.find(x=>x.datum===datum&&x.typ==="training");
  if(!t||!terminVorbei(t))return;
  if(document.getElementById("tp-date")?.value!==datum)return;
  slot.innerHTML=`<button class="btn btn-sm" onclick="if(typeof einheitNachbereiten==='function')einheitNachbereiten('${String(datum).replace(/'/g,"")}')" style="width:100%;min-height:44px;justify-content:center;margin:2px 0 8px"><i class="ti ti-star"></i>Einheit nachbereiten – Sterne und Kommentare zu den Übungen</button>`;
}
/* v473: Die Phasen-Hinweise standen als Absatz in JEDER Phase bei JEDEM Oeffnen – die
   Planseite war 2500 px hoch, und wer den Satz kannte, scrollte trotzdem daran vorbei.
   Jetzt ein zugeklappter Tipp: ein Tap zeigt ihn, die Erklaerung bleibt erreichbar. */
function tpTipp(text){
  return `<details class="tp-tipp"><summary>💡 Tipp</summary><div>${esc(text)}</div></details>`;
}
function tpRenderTimeline(){
  const wrap=document.getElementById("tp-timeline");
  if(!wrap)return;
  /* Die Leiste wird komplett neu gezeichnet – bei jeder Dauer, jedem Trainerwechsel.
     Gewaehlte Uebungen, Torwart-Haken und das Einzeltrainings-Kind lebten nur im DOM
     und waren danach weg. Hier merken, unten wieder einsetzen. */
  const merk={sel:{},tw:{},ind:{}};
  wrap.querySelectorAll(".tp-form-sel").forEach(s=>{if(s.value)merk.sel[s.id]=s.value;});
  wrap.querySelectorAll(".tp-tw-player").forEach(c=>{merk.tw[c.dataset.slot+"|"+c.value]=c.checked;});
  wrap.querySelectorAll('select[id^="tp-ind-player-"]').forEach(s=>{if(s.value)merk.ind[s.id]=s.value;});
  if(typeof renderTeamDiagnose==="function")renderTeamDiagnose(); // Phase 7-C: Team-Diagnose oben
  const trainerCount=tpGetTrainerCount();
  const allForms=tpAllForms();
  let time=0;
  // F5: Stationstimer + G3: Anwesenheits-Prognose (async gefüllt).
  /* PO-Umbau: die lose Button-Reihe ist weg. Oben nur Prognose + die Trainingsgruppen-
     Kachel; Kleingruppen wandert an den Aufwärm-Slot, Blitzturnier an den Abschluss-Slot,
     Trainingsstart + Solo-Timer nach unten zu den Aktionen. */
  let html='<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><span id="tp-prognose"></span></div>'
    +tgKachelHtml()
    +'<div id="ziel-uebungen-hint"></div>';
  // Individual läuft PARALLEL zu einem Hauptteil (PO) – Alt-Slots ohne Zuordnung bekommen
  // automatisch den ersten Hauptteil; die Zeitfenster paralleler Slots kommen vom Ziel.
  // Ungültige Ziele (gelöscht, kein Hauptteil, auf sich selbst) zuerst zurücksetzen,
  // damit die Auto-Zuordnung darunter greifen kann.
  tpSlots.forEach((s,i)=>{
    if(s.parallelZu==null)return;
    const z=tpSlots[s.parallelZu];
    if(!z||s.parallelZu===i||(z.typ||"main")!=="main")s.parallelZu=null;
  });
  // Altbestand + neu angelegte Blöcke ohne Ziel: an den ersten Hauptteil hängen (umstellbar
  // über „Läuft parallel zu"). Gilt seit v383 auch für Torwart-Blöcke.
  tpSlots.forEach(s=>{if(tpKannParallel(s.typ)&&s.parallelZu==null){const mi=tpSlots.findIndex(x=>(x.typ||"main")==="main");if(mi>=0)s.parallelZu=mi;}});
  // Parallele Bloecke dauern so lange wie ihr Hauptteil – auch im gespeicherten Plan
  tpSlots.forEach(s=>{if(tpIstParallel(s))s.dauer=tpSlots[s.parallelZu].dauer;});
  let acc=0; const startsArr=tpSlots.map(s=>{const st0=acc;if(!tpIstParallel(s))acc+=s.dauer;return st0;});
  /* Render-Reihenfolge: parallele Blöcke stehen direkt UNTER ihrem Ziel-Slot
     (PO: „zeitlich vor dem Abschluss, aber optisch dahinter eingereiht"). si bleibt der
     echte Array-Index – alle IDs/Handler zeigen weiter auf tpSlots[si]. */
  const renderOrder=[];
  tpSlots.forEach((s,i)=>{
    if(tpIstParallel(s))return;
    renderOrder.push(i);
    tpSlots.forEach((s2,i2)=>{if(tpKannParallel(s2.typ)&&s2.parallelZu===i)renderOrder.push(i2);});
  });
  tpSlots.forEach((s,i)=>{if(!renderOrder.includes(i))renderOrder.push(i);});
  renderOrder.forEach(si=>{ const slot=tpSlots[si];
    const typ=slot.typ||"main";
    const parallel=tpIstParallel(slot);
    const startMin=parallel?startsArr[slot.parallelZu]:time;
    const endMin=startMin+(parallel?tpSlots[slot.parallelZu].dauer:slot.dauer);
    const noGroups=typ==="warmup"||typ==="abschluss"||typ==="tw";
    const noSelect=typ==="abschluss";
    /* Stationen = angehakte Trainer, MINDESTENS aber so viele, wie ausgeloste Gruppen
       existieren. Sagt ein Trainer nach der Auslosung ab, fiel sonst eine komplette
       Gruppe aus Anzeige und Trainingsstart – die Kinder tauchten nirgends mehr auf. */
    const tgAnz=((typeof tgFor==="function"&&tgFor())||{}).gruppen?.length||0;
    const gebunden=typ==="main"?tpParallelTrainer(si):new Set();
    const trainersAlle=tpGetCheckedTrainers();
    const trainers=trainersAlle.filter(t=>!gebunden.has(t));
    /* Haengt ein Trainer am Torwart-/Einzelblock, zaehlen fuer diesen Hauptteil nur die
       freien Trainer – ohne die Untergrenze „Gruppenzahl", denn die ueberzaehligen Gruppen
       spielen hier bei den anderen Feldern mit (tpFelderGruppen). Sonst gilt weiter: nie
       weniger Felder als Gruppen, damit bei einer Absage keine Gruppe verschwindet. */
    const weg=(typ==="main"&&Array.isArray(slot.weg))?slot.weg:[];
    const basisFelder=noGroups?1:(typ==="main"&&gebunden.size)?Math.min(Math.max(1,trainers.length),5):Math.min(Math.max(1,trainerCount,tgAnz),5);
    const parallelSlots=Math.max(1,basisFelder-weg.length);   // vom Trainer weggelassene Felder
    const felderGruppen=(typ==="main"&&typeof tgFor==="function"&&tgFor())?tpFelderGruppen(tgFor(),parallelSlots,weg):null;
    const filtered=tpFilteredOpts(typ);
    const formOpts=filtered.map(x=>`<option value="${x.i}">${x.f.name} (${x.f.dauer})</option>`).join("");

    html+=`<div class="tp-slot" style="border-left:3px solid ${slot.farbe};${parallel?"margin-left:14px;":""}">
      <div class="tp-slot-head">
        <span class="tp-slot-label">${parallel?tpParallelIcon(typ):""}${slot.label}</span>
        <span class="tp-slot-time">${startMin}' – ${endMin}'${parallel?` · parallel zu ${tpSlots[slot.parallelZu].label}`:""}</span>
        ${parallel?"":tpDauerSelect(si,slot)}
        <button class="tp-remove" onclick="tpRemoveSlot(${si})"><i class="ti ti-trash"></i></button>
      </div>`;
    if(parallel){
      const mains=tpSlots.map((s2,i2)=>({s2,i2})).filter(x=>(x.s2.typ||"main")==="main");
      html+=`<div class="tp-feld"><label>Läuft parallel zu</label>
        <select onchange="tpSlots[${si}].parallelZu=Number(this.value);tpRenderTimeline()" style="width:100%;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)">
          ${mains.map(x=>`<option value="${x.i2}"${slot.parallelZu===x.i2?" selected":""}>${x.s2.label}</option>`).join("")}
        </select></div>`;
    }
    if(typ==="main"&&(slot.dauer||0)>=15){
      html+=tpTipp("Nach ~10 Min. variieren oder steigern – 20 Min. dieselbe Übung überfordert die Aufmerksamkeit von 7–9-Jährigen.");
    }
    if(typ==="main"&&(gebunden.size||weg.length)){
      const zusammen=(felderGruppen||[]).filter(f=>f.dazu.length).map(f=>`${f.dazu.join(" + ")} spielt bei ${f.emo} ${f.name.split(" + ")[0]} mit`).join(" · ");
      const grund=gebunden.size?`🧤 ${esc([...gebunden].join(", "))} ${gebunden.size===1?"ist":"sind"} beim Torwart-/Einzeltraining`:"";
      const wegText=weg.length?`✕ ${weg.length} Feld${weg.length===1?"":"er"} weggelassen`:"";
      html+=`<div class="tp-parallel-hinweis" style="font-size:11px;color:var(--text2);padding:2px 0 6px">${[grund,wegText].filter(Boolean).join(" · ")} – ${parallelSlots} Feld${parallelSlots===1?"":"er"} statt ${Math.max(1,trainersAlle.length)}${zusammen?" · "+esc(zusammen):""}${weg.length?` <button class="tp-feld-zurueck" onclick="tpFeldZurueck(${si})" style="margin-left:6px;min-height:28px;padding:2px 10px;border:1px solid var(--rand-bedien);border-radius:8px;background:var(--surface);color:var(--text);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">↩ Feld wieder aufnehmen</button>`:""}</div>`;
    }
    if(typ==="warmup"){
      html+=tpTipp("Ankommensspiel wählen: ab dem ERSTEN Kind spielbar, Nachzügler docken einfach an – kein Warten, kein Laufen ohne Ball.");
    }
    if(noSelect){
      // PO-Wunsch: das Abschlussspiel kann direkt als Blitzturnier laufen – die Slot-Dauer
      // wird zum Zeitbudget (auch 2 gegen 2 ohne Torwart mit bis zu 6 Teams).
      html+=`<div style="font-size:11px;color:var(--text2);padding:4px 0">Freies Spiel – Standard: 3 gegen 3 auf 4 Minitore (FUNiño), ohne Torwart</div>
        <button class="btn btn-sm" style="margin-top:4px" onclick="blitzOpen(${Number(slot.dauer)||15})" title="Trainingsturnier mit dieser Slot-Dauer als Zeitbudget – vorab planbar, wird zum Termin gespeichert">🏆 Als Trainingsturnier spielen (${slot.dauer} Min.)</button>`;
    } else if(typ==="tw"){
      const twPlayers=KADER.filter(k=>k.tw&&k.aktiv!==false);   // ausgetragene Torhueter nicht mehr anbieten
      html+=`<div style="margin-top:6px">
        <div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:4px">Torwart-Spieler</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          ${twPlayers.map(k=>`<label class="tp-check"><input type="checkbox" value="${esc(k.name)}" class="tp-tw-player" data-slot="${si}" checked><span>${k.name}${k.twPrio===1?" ⭐":""}</span></label>`).join("")}
        </div>
        <div class="tp-feld"><label for="tp-form-${si}-0">Übung</label>
          <div class="tp-feld-zeile">
            <select class="tp-form-sel" id="tp-form-${si}-0" onchange="tpOnSelectChange(this)" style="display:none">
              <option value="">— Übung wählen —</option>${formOpts}
            </select>
            <button class="tp-pick" id="tp-form-${si}-0-pick" onclick="tpPickerOpen('tp-form-${si}-0')">— Übung wählen —</button>
            <button class="tp-info" onclick="tpShowExFromSel('tp-form-${si}-0')" aria-label="Übung ansehen" title="Übung ansehen">ℹ️</button>
          </div>
        </div>
        <div class="tp-feld"><label>Trainer</label>${tpCoachSelect(`tp-form-${si}-0`)}</div>
        <div id="tp-form-${si}-0-hist"></div>
      </div>`;
    } else if(typ==="individual"){
      const playerOpts=KADER.filter(k=>k.aktiv!==false).map(k=>`<option value="${esc(k.name)}">${esc(k.name)}</option>`).join("");
      html+=`<div class="tp-feld"><label for="tp-ind-player-${si}">Spieler</label>
        <select id="tp-ind-player-${si}" onchange="tpIndPlayerChange(${si})">
          <option value="">— Spieler wählen —</option>${playerOpts}
        </select>
      </div>
      <div id="tp-ind-reco-${si}" style="margin-bottom:8px"></div>
      <div class="tp-feld"><label for="tp-form-${si}-0">Übung</label>
        <div class="tp-feld-zeile">
          <select class="tp-form-sel" id="tp-form-${si}-0" onchange="tpOnSelectChange(this)" style="display:none">
            <option value="">— Übung wählen —</option>${formOpts}
          </select>
          <button class="tp-pick" id="tp-form-${si}-0-pick" onclick="tpPickerOpen('tp-form-${si}-0')">— Übung wählen —</button>
          <button class="tp-info" onclick="tpShowExFromSel('tp-form-${si}-0')" aria-label="Übung ansehen" title="Übung ansehen">ℹ️</button>
        </div>
      </div>
      <div class="tp-feld"><label>Trainer</label>${tpCoachSelect(`tp-form-${si}-0`)}</div>
      <div id="tp-form-${si}-0-hist"></div>`;
    } else {
      const tg=(typeof tgFor==="function")?tgFor():null; // Trainingsgruppen: Namen + Trainer je Gruppe
      for(let p=0;p<parallelSlots;p++){
        const selId=`tp-form-${si}-${p}`;
        const tgg=(!noGroups)?(felderGruppen?felderGruppen[p]:(tg&&tg.gruppen?tg.gruppen[p]:null)):null;
        if(tpCoaches[selId]&&gebunden.has(tpCoaches[selId]))delete tpCoaches[selId]; // steht jetzt am Torwart-/Einzelblock
        const vorschlag=(tgg&&tgg.trainer&&!gebunden.has(tgg.trainer))?tgg.trainer:trainers[p];
        if(!tpCoaches[selId]&&!noGroups&&vorschlag)tpCoaches[selId]=vorschlag; // Station dem Gruppen-Trainer zuweisen
        const isMain=typ==="main";
        // Eine Karte je Station. Frueher stand hier eine einzige Zeile, die am Handy in
        // fuenf Elemente umbrach – man sah nicht mehr, welches Feld zu welcher Gruppe gehoert.
        // Der Trainername stand doppelt: einmal als Etikett, einmal im (funktionslosen) Dropdown.
        html+=`<div class="tp-station">
          <div class="tp-station-head">
            <span class="tp-station-nr">${noGroups?"👥":(tgg?tgg.emo:p+1)}</span>
            <span class="tp-station-titel">${noGroups?"Alle Kinder":(tgg?`${tgg.name} (${tgg.kinder.length})`:`Gruppe ${p+1}`)}</span>
            ${noGroups?"":tpCoachSelect(selId,gebunden,isMain&&parallelSlots>1)}
          </div>`;
        // Kategorie-Dropdown entfällt – der Übungs-Picker gruppiert selbst (PO: keine Ellenlisten)
        html+=`<div class="tp-feld"><label for="${selId}">Übung</label>
            <div class="tp-feld-zeile">
              <select class="tp-form-sel" id="${selId}" onchange="tpOnSelectChange(this)" style="display:none">
                <option value="">— Übung wählen —</option>${formOpts}
              </select>
              <button class="tp-pick" id="${selId}-pick" onclick="tpPickerOpen('${selId}')">— Übung wählen —</button>
              <button class="tp-info" onclick="tpShowExFromSel('${selId}')" aria-label="Übung ansehen" title="Übung ansehen">ℹ️</button>
            </div>
          </div>
          <div id="${selId}-hist"></div>
        </div>`;
      }
      // PO: Kleingruppen erscheinen NUR, wenn die gewählte Aufwärm-Übung sie braucht
      // (z. B. Schattenläufer = paarweise; Hai & Fische = alle zusammen → kein Button)
      if(typ==="warmup")html+=`<div id="tp-kg-${si}"></div>`;
    }
    html+='</div>';
    if(!parallel)time+=slot.dauer; // parallele Blöcke (Torwart/Individual) zählen nicht doppelt
  });
  const zielDauer=parseInt(document.getElementById("tp-dauer")?.value)||75; // H3 (Wert VOR dem Neuzeichnen gelesen)
  const passt=time<=zielDauer;
  /* Gewarnt wurde bisher nur nach oben. Loescht man eine Phase, sinkt „Gesamt" still –
     25 unverplante Minuten sahen genauso aus wie ein perfekt gefuellter Plan. */
  const frei=zielDauer-time;
  // Ziel-Dauer wohnt jetzt HIER statt als eigene „Zeitplan"-Zeile im Kopf (PO: schlanker)
  const sfq=(typeof tpSpielformQuote==="function")?null:null; // Quote wird nach dem DOM-Aufbau gefüllt (braucht die Selects)
  html+=`<div id="tp-sfq" style="text-align:right;font-size:11px;color:var(--text2);margin-top:8px"></div>`;
  html+=`<div style="display:flex;justify-content:flex-end;align-items:center;gap:6px;font-size:12px;font-weight:${passt?"600":"800"};color:${passt?"var(--text2)":"#dc2626"};margin-top:6px">Gesamt: ${time} von
    <select id="tp-dauer" onchange="tpRenderTimeline()" style="font-size:13px;min-height:44px;padding:4px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;background:var(--surface);color:var(--text)">${[60,75,90].map(d=>`<option value="${d}"${zielDauer===d?" selected":""}>${d}</option>`).join("")}</select>
    Min.${passt?(frei>0?` · noch ${frei} Min. frei`:""):" – zu lang!"}</div>`;
  wrap.innerHTML=html;
  // Gemerkte Auswahl wieder einsetzen (siehe oben)
  Object.keys(merk.sel).forEach(id=>{const s=document.getElementById(id); if(s&&[...s.options].some(o=>o.value===merk.sel[id])){s.value=merk.sel[id]; if(typeof tpPickSync==="function")tpPickSync(id); const hd=document.getElementById(id+"-hist"); if(hd&&typeof tpExerciseHistoryHtml==="function")hd.innerHTML=tpExerciseHistoryHtml(parseInt(s.value));}});
  wrap.querySelectorAll(".tp-tw-player").forEach(c=>{const k=c.dataset.slot+"|"+c.value; if(k in merk.tw)c.checked=merk.tw[k];});
  Object.keys(merk.ind).forEach(id=>{const s=document.getElementById(id); if(s){s.value=merk.ind[id]; if(typeof tpIndPlayerChange==="function"&&s.value)tpIndPlayerChange(Number(id.replace("tp-ind-player-","")));}});
  tpPrognoseLoad(); // G3: erwartete Kinderzahl fürs gewählte Datum
  if(typeof zielUebungenHint==="function")zielUebungenHint(); // B: Übungen zu offenen Entwicklungszielen
  if(typeof tlCheck==="function")tlCheck(); // laufender Trainingsstart? → Bereit-Fenster
  if(typeof tgSync==="function")tgSync();  // Trainingsgruppen vom Server (re-rendert bei Änderung einmal)
  if(typeof tpKgHintAll==="function")tpKgHintAll(); // Kleingruppen-Bedarf initial prüfen
}
/* G3: Anwesenheits-Prognose – erwartete Kinderzahl fürs gewählte Trainingsdatum aus den
   Zusagen (fix) plus historischer Anwesenheitsquote je Kind (für noch offene). */
async function tpPrognoseLoad(){
  const el=document.getElementById("tp-prognose"); if(!el)return;
  if(typeof pauseLoad==="function")await pauseLoad(); // C: Pausen berücksichtigen
  const datum=document.getElementById("tp-date")?.value;
  /* Inaktive Kinder zaehlten bisher mit: KADER wurde ungefiltert durchlaufen, ein
     ausgetragenes Kind steuerte seine Quote (oder 0.7) zur Erwartung bei. */
  const aktive=KADER.filter(k=>k.aktiv!==false);
  /* Steht die Anwesenheit fuer DIESEN Termin schon fest, ist nichts mehr zu schaetzen.
     Vorher rechnete die Prognose stur mit historischen Quoten weiter und widersprach
     damit der Liste, die der Trainer eine Ansicht weiter selbst abgehakt hatte. */
  const tag=(datum&&awZaehltAlsTatsache(datum))?AW_DATA[datum]:null;   // v475: im Voraus Gespeichertes ist keine Tatsache
  if(tag&&Object.keys(tag).some(k=>k.charAt(0)!=="_")){
    const da=aktive.filter(k=>tag[k.name]&&tag[k.name].da===true).length;
    el.innerHTML=`<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;background:var(--surface2);border:var(--border);border-radius:20px;padding:4px 12px">👥 ${da} Kinder eingetragen <span style="font-weight:400;color:var(--text2)">(Anwesenheit)</span></span>`;
    return;
  }
  const dates=Object.keys(AW_DATA); const anyHist=dates.length>0;
  const rate={};
  aktive.forEach(k=>{ let tot=0,da=0; dates.forEach(d=>{const day=AW_DATA[d]; if(day&&(k.name in day)){tot++; if(day[k.name].da)da++;}}); rate[k.name]=tot?da/tot:0.7; });
  let rsvp={};
  if(datum){ try{ const tid=await terminIdForDatum(datum); if(tid){ const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${tid}&select=spieler_id,status`,{headers:sbAuthHeaders()}); if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(x=>rsvp[x.spieler_id]=x.status); } }catch(e){} }
  let exp=0, sure=0;
  aktive.forEach(k=>{
    if(typeof istPaused==="function"&&istPaused(k.name))return; // pausiert -> zählt 0
    const st=rsvp[k.id];
    if(st==="zugesagt"){exp+=1;sure++;}
    else if(st==="abgesagt"||st==="krank"){/* 0 */}
    else exp+=(anyHist?rate[k.name]:0.7);
  });
  /* v474: Quelle dazu (Muster v470) – „~9 erwartet" ohne Herkunft liest sich wie eine Zusage. */
  const quelle=sure?`${sure} zugesagt, Rest nach Trainingsquote`:(anyHist?"nach Trainingsquote":"Schätzung, noch keine Anwesenheit erfasst");
  el.innerHTML=`<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;background:var(--surface2);border:var(--border);border-radius:20px;padding:4px 12px">👥 ~${Math.round(exp)} Kinder erwartet <span style="font-weight:400;color:var(--text2)">(${quelle})</span></span>`;
}

function tpOnSelectChange(sel){
  const histDiv=document.getElementById(sel.id+"-hist");
  if(histDiv&&sel.value) histDiv.innerHTML=tpExerciseHistoryHtml(parseInt(sel.value));
  else if(histDiv) histDiv.innerHTML="";
  if(typeof tpPickSync==="function")tpPickSync(sel.id); // sichtbaren Auswahl-Button nachziehen
  if(typeof tpKgHintAll==="function")tpKgHintAll();     // Kleingruppen-Bedarf der Aufwärm-Übung
  tpPlanSaveDebounced(); // Plan am Datum festhalten -> "Einheit bewerten" kennt ihn spaeter
}
/* Braucht eine Übung Kleingruppen? Text-Analyse über Name/Kurz/Ablauf – erkennt auch
   künftige und KI-Übungen. „Gruppenbildung im Spiel" (Atomspiel) zählt bewusst nicht. */
function _kgBedarf(f){
  if(!f)return null;
  const txt=((f.name||"")+" "+(f.kurz||"")+" "+(f.ablauf||"")).toLowerCase();
  if(/paarweise|zu zweit|partnerübung|partner-übung|2er[- ]?(paar|team|gruppe)/.test(txt))return 2;
  if(/zu dritt|dreiergruppe|3er[- ]?(team|gruppe)/.test(txt))return 3;
  if(/zu viert|vierergruppe|4er[- ]?(team|gruppe)/.test(txt))return 4;
  return null;
}
/* Braucht die Übung Sonder-ROLLEN (Haie, Fänger, Diebe)? Die werden zu Beginn bestimmt. */
function _kgRolle(f){
  if(!f)return null;
  const txt=((f.name||"")+" "+(f.kurz||"")+" "+(f.ablauf||"")).toLowerCase();
  if(/\bhai/.test(txt))return {lbl:"Haie",emo:"🦈"};
  if(/fänger|fangspiel/.test(txt))return {lbl:"Fänger",emo:"🏃"};
  if(/\bdieb/.test(txt))return {lbl:"Diebe",emo:"🕵️"};
  return null;
}
/* Spielform vs. Übungsform (FA: 70 % "ball rolling time", DFB: kleine Spielformen als
   Schlüssel): grobe Text-Heuristik über die gewählten Übungen – die Quote unten im Plan
   zeigt dem Trainer, ob die Einheit genug ECHTES Spielen enthält (Ziel: ≥ 50 %). */
function _istSpielform(f){
  if(!f)return false;
  const kat=f.kat||"", t=((f.name||"")+" "+(f.kurz||"")+" "+(f.ablauf||"")).toLowerCase();
  // Kategorien mit eingebautem Gegner + Ziel sind per Definition Spielformen
  if(kat==="spass"||kat==="raute"||kat==="pressing")return true;
  // Solo-/TW-Arbeit nur, wenn wirklich ein Duell beschrieben ist (1gg1 ja, 1gg0 nein)
  if(kat==="individual"||kat==="torwart")return /\d\s*(gg|gegen)\s*[1-9]/.test(t);
  // Aufwaermen: Fang-/Abwurfspiele haben Gegner + Entscheidungen, Laufschule nicht
  if(kat==="aufwaermen")return /fangspiel|fänger|hai|dieb|zombie|abwurf/.test(t);
  return /\d\s*(gg|gegen)\s*[1-9]|funino|turnier|wettbewerb|staffel|duell|zielspiel/.test(t);
}

function tpSpielformQuote(){
  let spiel=0,gesamt=0;
  document.querySelectorAll(".tp-form-sel").forEach(sel=>{
    if(!sel.value)return;
    const f=tpAllForms()[Number(sel.value)];
    const slotEl=sel.closest(".tp-slot");
    // Dauer des zugehörigen Slots grob über tpSlots ermitteln
    const m=(sel.id||"").match(/^tp-form-(\d+)-/);
    const d=m&&tpSlots[Number(m[1])]?(tpSlots[Number(m[1])].dauer||0):10;
    gesamt+=d;
    if(_istSpielform(f))spiel+=d;
  });
  // Abschluss zählt immer als Spiel (freies Spiel), auch ohne gewählte Übung
  tpSlots.forEach(sl=>{if((sl.typ||"main")==="abschluss"){const belegt=document.querySelector(`[id^="tp-form-${tpSlots.indexOf(sl)}-"]`)?.value;if(!belegt){gesamt+=sl.dauer||0;spiel+=sl.dauer||0;}}});
  if(!gesamt)return null;
  return Math.round(spiel/gesamt*100);
}
function tpSfqRender(){
  const el=document.getElementById("tp-sfq"); if(!el)return;
  const q=tpSpielformQuote();
  if(q==null){el.innerHTML="";return;}
  const gut=q>=50;
  el.innerHTML=`⚽ Spielform-Anteil: <b style="color:${gut?"#16a34a":"#b45309"}">${q}%</b>${gut?"":" – DFB/FIFA empfehlen ≥ 50% echtes Spielen (Tore + Gegner + Entscheidungen)"}`;
}
function tpKgHintAll(){
  document.querySelectorAll("[id^='tp-kg-']").forEach(slotEl=>{
    const si=slotEl.id.split("-")[2];
    const sel=document.getElementById(`tp-form-${si}-0`);
    const f=(sel&&sel.value)?tpAllForms()[Number(sel.value)]:null;
    const gr=_kgBedarf(f), rolle=_kgRolle(f);
    let html="";
    if(gr)html+=`<button class="btn btn-sm" style="margin-top:6px" onclick="_kgGroesse=${gr};kleingruppenOpen()">👥 ${gr}er-Gruppen auslosen – „${esc(f.name)}“ braucht sie</button>`;
    if(rolle)html+=`<button class="btn btn-sm" style="margin-top:6px" onclick="rolleLosOpen('${rolle.lbl}','${rolle.emo}')">${rolle.emo} ${rolle.lbl} auslosen (1–2) – zu Beginn bestimmen</button>`;
    slotEl.innerHTML=html;
  });
  tpSfqRender();
}
/* Rollen-Auslosung (z. B. 1–2 Haie bei „Hai & Fische“): zufällig aus den Anwesenden,
   Ergebnis groß zum Hochhalten, Neu-losen jederzeit. */
let _rolleAnzahl=2;
function rolleLosOpen(lbl,emo){
  document.getElementById("rolle-modal")?.remove();
  const m=document.createElement("div");m.id="rolle-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label",lbl+" auslosen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("rolle-modal",emo,lbl+" auslosen","Wer startet in der Rolle? Zufällig aus den Anwesenden","#16a34a")}
    <div id="rolle-chips" style="display:flex;gap:8px;margin-bottom:10px"></div>
    <button class="btn btn-p" style="width:100%;min-height:52px" onclick="rolleLos('${lbl}','${emo}')">🎲 Auslosen</button>
    <div id="rolle-result" style="margin-top:10px"></div>
  </div>`;
  document.body.appendChild(m);
  _rolleChips(lbl,emo);
}
function _rolleChips(lbl,emo){
  const el=document.getElementById("rolle-chips"); if(!el)return;
  el.innerHTML=[1,2].map(n=>`<button onclick="_rolleAnzahl=${n};_rolleChips('${lbl}','${emo}')" style="flex:1;min-height:48px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:${_rolleAnzahl===n?"#16a34a":"var(--surface2)"};color:${_rolleAnzahl===n?"#fff":"var(--text2)"}">${n} ${n===1?lbl.replace(/e$/,""):lbl}</button>`).join("");
}
async function rolleLos(lbl,emo){
  if(typeof pauseLoad==="function")await pauseLoad();
  const pool=_kgPool();
  const namen=pool.namen.slice();
  if(namen.length<_rolleAnzahl){toast("Zu wenige Kinder","err");return;}
  for(let i=namen.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[namen[i],namen[j]]=[namen[j],namen[i]];}
  const gezogen=namen.slice(0,_rolleAnzahl);
  const el=document.getElementById("rolle-result");
  if(el)el.innerHTML=`<div style="background:#f0fdf4;color:#14532d;border:2px solid #4ade80;border-radius:14px;padding:16px;text-align:center">
      <div style="font-size:40px">${emo}</div>
      <div style="font-size:20px;font-weight:900;margin-top:6px">${gezogen.map(esc).join(" & ")}</div>
      <div style="font-size:12px;color:#166534;margin-top:4px">${gezogen.length===1?"startet":"starten"} als ${lbl}!</div>
    </div>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="rolleLos('${lbl}','${emo}')">🎲 Neu losen</button>`;
  try{navigator.vibrate&&navigator.vibrate([30,40,30]);}catch(e){}
}

function tpShowExFromSel(selId){
  const sel=document.getElementById(selId);
  if(sel&&sel.value) tpShowExercise(parseInt(sel.value));
}

function tpIndPlayerChange(slotIdx){
  const sel=document.getElementById("tp-ind-player-"+slotIdx);
  const reco=document.getElementById("tp-ind-reco-"+slotIdx);
  if(!sel||!reco)return;
  const name=sel.value;
  if(!name){reco.innerHTML="";return;}
  const allForms=tpAllForms();
  const indForms=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="individual");
  const playerKey="adler_player_"+name;
  let vals={};
  try{vals=JSON.parse(localStorage.getItem(playerKey)||"{}");}catch(e){vals={};}
  if(!Object.keys(vals).length){
    reco.innerHTML='<div style="font-size:10px;color:var(--text3);padding:2px 0">Kein Spielerprofil vorhanden – alle Übungen verfügbar.</div>';
    return;
  }
  // v2: Defizite über die 16 f_-Kriterien (Skala 1–4; <=2 = Entwicklungsfeld)
  const deficits=[];
  const critLabels={f_ballkontrolle:"Ballkontrolle & Dribbling",f_pass:"Passspiel",f_abschluss:"Torabschluss",f_raum:"Raumverständnis",f_umschalt:"Umschalten & Pressing",f_laufweg:"Laufwege",f_defense:"Zweikampf & Verteidigen",f_tempo:"Tempo",f_koord:"Koordination",f_einsatz:"Laufbereitschaft",f_selbst:"Selbstvertrauen",f_team:"Kommunikation",f_resil:"Resilienz",f_coach:"Fokus"};
  Object.keys(critLabels).forEach(k=>{const s=vals[k]||0;if(s>0&&s<=2)deficits.push({key:k,label:critLabels[k],score:s});});

  const matched=[];
  indForms.forEach(x=>{
    if(x.f.deficit){
      const hit=deficits.find(d=>d.key===x.f.deficit);
      if(hit) matched.push({...x,deficit:hit});
    }
  });

  if(!deficits.length){
    reco.innerHTML='<div style="font-size:10px;color:#059669;padding:2px 0">✅ Keine auffälligen Defizite – freie Übungswahl!</div>';
    return;
  }

  let html='<div style="font-size:10px;color:var(--text2);padding:2px 0"><strong>Empfohlen für '+name+':</strong></div>';
  if(matched.length){
    matched.forEach(m=>{
      html+=`<div style="display:flex;align-items:center;gap:4px;padding:2px 0">
        <button onclick="document.getElementById('tp-form-${slotIdx}-0').value='${m.i}';tpOnSelectChange(document.getElementById('tp-form-${slotIdx}-0'))" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 6px;font-size:10px;cursor:pointer;font-family:inherit">
          ⭐ ${m.f.name}</button>
        <span style="font-size:9px;color:var(--text3)">→ ${m.deficit.label} verbessern</span>
      </div>`;
    });
  } else {
    html+='<div style="font-size:10px;color:var(--text3)">Defizite: '+deficits.map(d=>d.label).join(", ")+'</div>';
  }
  reco.innerHTML=html;
}

function tpAddSlot(){
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  /* Frueher stand hier eine ZWEITE Liste. Sie war auseinandergelaufen: der Knopf versprach
     „Abschlussspiel · 15 Min.", eingefuegt wurden 20, und aus „Torwart-Training" wurde in
     der Leiste „Torwart-Spielen (rotierend)". Jetzt beschreibt TP_ADD_OPTS beides. */
  const opts=TP_ADD_OPTS;
  let btns=opts.map((o,i)=>`<button onclick="tpDoAddSlot(${i});this.closest('div[style*=fixed]').remove()" style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;border:1px solid var(--rand-bedien);border-left:3px solid ${o.farbe};border-radius:var(--r);background:var(--surface);cursor:pointer;font-family:inherit;font-size:12px;text-align:left"><span style="font-size:18px">${o.icon}</span><div><strong>${o.label}</strong><br><span style="font-size:10px;color:var(--text2)">${tpKannParallel(o.typ)?"parallel zum Hauptteil, gleiche Dauer":o.dauer+" Min."}</span></div></button>`).join("");
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:320px;width:100%">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px">Phase hinzufügen</div>
    <div style="display:flex;flex-direction:column;gap:6px">${btns}</div>
  </div>`;
  document.body.appendChild(modal);
}
/* EINE Quelle fuer den Hinzufuegen-Dialog UND das tatsaechliche Einfuegen: Beschriftung,
   Dauer und Farbe muessen dasselbe sagen wie das, was hinterher in der Leiste steht. */
const TP_ADD_OPTS=[
  {label:"Hauptteil",dauer:20,farbe:"#1a56db",typ:"main",icon:"⚽"},
  {label:"Torwart-Spielen (rotierend)",dauer:15,farbe:"#854d0e",typ:"tw",icon:"🧤"},
  {label:"Individual-Training",dauer:15,farbe:"#0e7490",typ:"individual",icon:"🎯"},
  {label:"Aufwärmen",dauer:10,farbe:"#059669",typ:"warmup",icon:"🔥"},
  {label:"Abschlussspiel",dauer:20,farbe:"#c2410c",typ:"abschluss",icon:"🏆"}
];
/* Die Dauer stand bisher nur als Text da. Wer eine Phase loeschte, konnte die frei
   gewordene Zeit nirgends verteilen – ein Abschlussspiel liess sich nicht verlaengern. */
const TP_DAUER_WERTE=[5,10,15,20,25,30,35,40,45,50,60];
function tpDauerSelect(si,slot){
  const jetzt=Number(slot.dauer)||10;
  // Altbestand kann krumme Werte tragen (z. B. 12) – die duerfen beim Anzeigen nicht
  // stillschweigend auf einen Nachbarwert springen.
  const werte=TP_DAUER_WERTE.includes(jetzt)?TP_DAUER_WERTE:TP_DAUER_WERTE.concat(jetzt).sort((a,b)=>a-b);
  return `<select class="tp-dauer-sel" aria-label="Dauer von ${esc(slot.label||"Phase")} in Minuten" onchange="tpSetDauer(${si},this.value)">`
    +werte.map(d=>`<option value="${d}"${d===jetzt?" selected":""}>${d} Min.</option>`).join("")
    +`</select>`;
}
function tpSetDauer(si,wert){
  if(!tpSlots[si])return;
  tpSlots[si].dauer=Math.max(1,Number(wert)||10);
  tpSlots.forEach(s=>{if(tpKannParallel(s.typ)&&s.parallelZu===si)s.dauer=tpSlots[si].dauer;}); // Torwart/Einzel laufen genauso lang
  tpRenderTimeline();
}
function tpDoAddSlot(idx){
  const o=TP_ADD_OPTS[idx];
  const {icon,...ohneIcon}=o;   // das Symbol ist Dialog-Schmuck und hat im Plan nichts zu suchen
  const neu={...ohneIcon};
  // Torwart/Individual hängen sich parallel an den letzten Hauptteil (PO: nie ans Ende der Kette)
  if(tpKannParallel(neu.typ)){
    let mi=-1; tpSlots.forEach((s,i)=>{if((s.typ||"main")==="main")mi=i;});
    if(mi>=0){neu.parallelZu=mi;neu.dauer=tpSlots[mi].dauer;}   // gleiche Dauer wie der Hauptteil
  }
  tpSlots.push(neu);
  tpRenderTimeline();
}

function tpRemoveSlot(idx){
  tpSlots.splice(idx,1);
  /* parallelZu zeigt auf einen ARRAY-INDEX – nach dem Splice verschiebt sich alles
     dahinter. Ohne Nachziehen hing ein Einzeltraining plötzlich am falschen Hauptteil
     (oder an einem gelöschten Slot, dann verschluckte _tlSnapshot es ganz). */
  tpSlots.forEach(s=>{
    if(s.parallelZu==null)return;
    if(s.parallelZu===idx)s.parallelZu=null;      // Ziel wurde gelöscht → neu zuordnen
    else if(s.parallelZu>idx)s.parallelZu--;
  });
  tpRenderTimeline();
}

/* ═══════════════════════════════════
   PIN GATE
═══════════════════════════════════ */
const PIN_HASH="2c1f3f5f6523af84fde4af934caa1126ae6bcebacd36e397fbddcb8a620c1d73"; // SHA-256("1922") – PIN ist nur UI-Sichtschutz, echte Zugriffskontrolle: Supabase RLS (Block I)
const PIN_SESSION_KEY="adler_pin_ok";
try{const d=document.getElementById("pin-diag");if(d){d.textContent="Bereit ✓";
  if(window.caches)caches.keys().then(ks=>{const v=ks.find(k=>k.indexOf("u9i-adler")===0);if(v)d.textContent="Bereit ✓ · "+v.replace("u9i-adler-","");}).catch(()=>{});
}}catch(e){}
const PIN_SESSION_TTL=30*24*60*60*1000; // 30 Tage (B7)
function pinSessionValid(){
  try{
    const raw=localStorage.getItem(PIN_SESSION_KEY);
    if(!raw)return false;
    const until=parseInt(raw);
    return !isNaN(until)&&Date.now()<until;
  }catch(e){return false;}
}
function pinSessionSet(){
  try{localStorage.setItem(PIN_SESSION_KEY,String(Date.now()+PIN_SESSION_TTL));}catch(e){}
}

async function hashPin(pin){
  const enc=new TextEncoder().encode(pin);
  const buf=await crypto.subtle.digest("SHA-256",enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function pinNext(el,next){
  /* iOS-/Android-Autofill und schnelles Tippen stecken gern MEHRERE Ziffern in EIN Feld
     (maxlength schneidet erst nach dem input-Event). Alles einsammeln und sauber auf die
     vier Felder verteilen – sonst blieb pinCheck still unter 4 Zeichen haengen. */
  const roh=String(el.value||"").replace(/\D/g,"");
  if(roh.length>1){
    const felder=[1,2,3,4].map(i=>document.getElementById("pin"+i));
    const start=felder.indexOf(el);
    for(let k=0;k<roh.length&&start+k<4;k++)felder[start+k].value=roh[k];
    const voll=felder.every(f=>f.value);
    if(voll)pinCheck(); else felder.find(f=>!f.value)?.focus();
    return;
  }
  if(el.value.length===1){
    const n=document.getElementById("pin"+next);
    if(n)n.focus();
    else pinCheck();
  }
}
function pinBack(e,prev){ // Backspace bei leerem Feld springt zurück statt hängenzubleiben
  if(e.key==="Backspace"&&e.target.value===""){
    const p=document.getElementById("pin"+prev);
    if(p){p.focus();p.value="";}
  }
}

async function pinCheck(){
  const err=document.getElementById("pin-err");
  const felder=[1,2,3,4].map(i=>document.getElementById("pin"+i));
  const pin=felder.map(f=>f.value).join("");
  if(pin.length<4){ // vorher STILLES return – "nichts passiert" war nicht diagnostizierbar
    if(err)err.textContent="Bitte alle 4 Ziffern eingeben";
    felder.find(f=>!f.value)?.focus();
    return;
  }
  if(!(window.crypto&&crypto.subtle)){ // http statt https: subtle existiert nicht
    if(err)err.textContent="Bitte die App über https öffnen (Adresszeile prüfen)";
    return;
  }
  let h="";
  try{ h=await hashPin(pin); }
  catch(e){ if(err)err.textContent="Technischer Fehler – bitte Seite neu laden"; return; }
  if(h===PIN_HASH){
    pinSessionSet();
    document.getElementById("pin-gate").classList.add("hidden");
    document.getElementById("main-app").style.display="";
    ensureLogin(); // Block I
  } else {
    document.getElementById("pin-err").textContent="Falscher PIN – bitte erneut versuchen";
    [1,2,3,4].forEach(i=>{document.getElementById("pin"+i).value="";});
    document.getElementById("pin1").focus();
  }
}

(function(){
  const params=new URLSearchParams(window.location.search);
  // Eltern-Ansicht: öffentlicher Read-Only-Matchday, kein Login, kein Trainer-/Quiz-UI
  if(params.has("eltern")||params.has("match")){
    document.title="Spieltag – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    // Trainer-/Quiz-Oberfläche komplett aus dem DOM entfernen – Eltern sehen nur die Card
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    // ueber routeRender, wie die uebrigen Sonderrouten: wartet kurz auf das Modul,
    // statt bei langsamem Netz weiss zu bleiben (md-matchcard.js ist Welle 2).
    routeRender("renderElternView",params.get("match")||"");
    setTimeout(pwaInstallNudge,1800); // Adoption: Hub aufs Handy holen
    return;
  }
  // Delegate-Modus: Eltern-Helfer übernimmt den Ticker am Platz (Capability-Token, keine Trainer-Rechte)
  if(params.has("delegate")){
    document.title="Ticker-Helfer – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    routeRender("renderDelegateView",params.get("delegate"));
    return;
  }
  // Eltern-Portal (?portal): passwortloser OTP-Login → rollenbasiert (parent-Dashboard / Trainer-Hinweis)
  if(params.has("portal")){
    document.title="Eltern-Bereich – SV Adler Dellbrück U9";
    // Manifest/Icon/Theme setzt der Inline-Block im <head> von index.html (Timing!).
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    // UX 3: Deep-Link-Intent (?rsvp=<termin_id>) puffern und die URL SOFORT saeubern,
    // damit Reload/Re-Share den Flow nicht doppelt triggert. Feuert nach Auth im Dashboard.
    const rsvpId=params.get("rsvp");
    if(rsvpId&&/^\d+$/.test(rsvpId)){
      try{sessionStorage.setItem("adler_rsvp_intent",rsvpId);}catch(e){}
      try{history.replaceState({},"",location.pathname+"?portal");}catch(e){}
    }
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    routeRender("renderElternPortal");
    setTimeout(pwaInstallNudge,1800); // UX 1: Soft-Install-Nudge für Eltern
    return;
  }
  // Read-only-Liveticker: Nur-Ansehen fuer alle Eltern (?ticker=<key>), kein Login, keine Eingabe
  if(params.has("ticker")){
    document.title="Liveticker – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    routeRender("renderTickerView",params.get("ticker")||"");
    setTimeout(pwaInstallNudge,1800);
    return;
  }
  // Persönlicher Kind-Link (?kind=<token>): 1-Tap Zu-/Absage ohne Login (Capability-Token).
  if(params.has("kind")){
    document.title="Zu-/Absage – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    routeRender("renderKindView",params.get("kind")||"");
    setTimeout(pwaInstallNudge,1800);
    return;
  }
  // F6: Vertretungs-Paket (?handover) – selbst-enthaltener Read-Only-Snapshot (Daten im #-Fragment), kein Login, kein Server.
  if(params.has("handover")){
    document.title="Vertretung – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    routeRender("renderHandoverView");
    return;
  }
  // M3: Öffentliche Heimturnier-Seite (?turnier=<slug>) – für Gast-Trainer, kein Login.
  // Enthält nur Teamnamen + Spielplan (keine Kindernamen), deshalb anonym lesbar.
  if(params.has("turnier")){
    document.title="Turnierplan – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#b45309");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    routeRender("renderHeimturnierView",params.get("turnier")||"");
    return;
  }
  // Digitales Stadionheft: Nur-Ansehen fuer alle Eltern (?heft), kein Login. Namen maskiert, Fotos nur bei Einwilligung.
  if(params.has("heft")){
    document.title="Adler Nest – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    renderStadionheftView();
    setTimeout(pwaInstallNudge,1800);
    return;
  }
  const isQuizMode=params.has("quiz");
  if(isQuizMode){
    document.title="Taktik-Quiz U9 I – SV Adler Dellbrück";
    // Das Quiz ist keine eigene App mehr – die Kinder kommen ueber die Kabine im
    // Eltern-Zugang hierher. Das Manifest entfernt der Inline-Block im <head>.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#059669");
    document.getElementById("pin-gate").classList.add("hidden");
    document.getElementById("main-app").style.display="";
    document.body.classList.add("quiz-extern");
    document.querySelectorAll("#main-nav,.view").forEach(el=>el.style.display="none");
    document.getElementById("view-taktik").style.display="";
    window.savePlayer=()=>{};window.delPlayer=()=>{};window.delSnapshot=()=>{};
    const qMode=params.get("mode"); if(qMode)window._quizMode=qMode; // direkt ins Taktik-/Wissens-Quiz
    if(params.get("from")==="kabine"){ // sichtbarer Rückweg für die Kinder
      const back=document.createElement("button");
      back.id="quiz-back"; back.type="button"; back.textContent="← Zurück zur Kabine";
      // Zurueck in den KINDER-Modus, nicht ins Eltern-Dashboard: das Flag ueberlebt das
      // replaceState der ?portal-Route, elternDashLoad oeffnet danach direkt die Kabine.
      back.onclick=()=>{try{sessionStorage.setItem("adler_open_kabine","1");}catch(e){} location.href=location.pathname+"?portal";};
      // Das 60-Minuten-Limit der Kabine muss auch hier greifen - sonst haette ein Kind
      // ueber den Quiz-Umweg unbegrenzt Zeit.
      const kabLimit=setInterval(()=>{
        if(typeof kabineZeitRestMin!=="function")return;
        if(kabineZeitRestMin()<=0){
          clearInterval(kabLimit);
          if(typeof kabineAktivSet==="function")kabineAktivSet(false);
          try{localStorage.removeItem("adler_kabine_start");}catch(e){}
          location.href=location.pathname+"?portal";
        }
      },30000);
      back.style.cssText="position:fixed;bottom:12px;left:12px;z-index:9990;padding:10px 14px;border:none;border-radius:12px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)";
      document.body.appendChild(back);
    }
    // Erst klaeren, WER spielt (eigenes Kind aus der Eltern-Sitzung / gemerkter Name).
    // Nur wenn das misslingt, erscheint ueberhaupt eine Namensauswahl.
    setTimeout(async()=>{
      // quiz.js ist Welle 2. Der try fing bisher nur den ersten Aufruf ab – schlug er
      // fehl, weil das Modul fehlt, lief tqStart() ungeschützt hinterher und warf.
      // Für die Kinder bliebe die Seite weiß; jetzt greift die Meldung aus routeRender.
      if(typeof tqStart!=="function"){ routeRender("tqStart"); return; }
      let steht=false;
      try{ if(typeof tqInitPlayer==="function")steht=await tqInitPlayer(); }catch(e){}
      if(!steht)tqStart();
    },100);
    setTimeout(()=>{if(typeof kidsIntroMaybe==="function")kidsIntroMaybe();},250); // einmalige Federn/Karten-Erklärung
    setTimeout(pwaInstallNudge,1800); // UX 1: Soft-Install-Nudge für die Kids
    return;
  }
  /* Der ELTERN-Einstieg darf NIE das Trainer-PIN-Gate zeigen: unbekannte Routen
     (z. B. ein verunglückter ?kabine-Link) landen sonst vor "Zugang zum Trainerstab-
     Tool" - und der Kabinen-Code 1922 wirkt dort "kaputt". Immer ins Portal umleiten. */
  if(location.pathname.includes("/eltern")){
    const q=location.search&&location.search.length>1?location.search+"&portal":"?portal";
    location.replace(location.pathname+q); return; // Query bleibt erhalten (Deep-Links)
  }
  if(pinSessionValid()){
    document.getElementById("pin-gate").classList.add("hidden");
    document.getElementById("main-app").style.display="";
    ensureLogin(); // Block I
  }
  /* Selbstheilung fuer schnelle Tipper: Wer den PIN eingibt, BEVOR boot.js geladen war
     (Inline-Handler liefen ins Leere), hat 4 gefuellte Felder ohne Pruefung - jetzt,
     wo pinCheck existiert, einmal nachpruefen. */
  else if([1,2,3,4].every(i=>document.getElementById("pin"+i)?.value)){ pinCheck(); }
})();

/* ═══════════════════════════════════
   TRAININGS-BEWERTUNG
═══════════════════════════════════ */
const EVAL_KEY="adler_training_eval";
let EVAL_DATA={};
try{EVAL_DATA=JSON.parse(localStorage.getItem(EVAL_KEY)||"{}");}catch(e){EVAL_DATA={};}

/* ═══════════════════════════════════
   PHASE 7-C: TEAM-DIAGNOSE (Data-Driven Trainingsplanung)
   Aggregiert die 14 trainierbaren f_-Kriterien ueber alle bewerteten Spieler,
   findet die schwaechste Team-Metrik und schlaegt passende Uebungen vor
   (deficit-Tags). Wiederverwendung derselben Logik wie die Einzel-Empfehlung.
═══════════════════════════════════ */
const DIAG_LABELS={f_ballkontrolle:"Ballkontrolle & Dribbling",f_pass:"Passspiel",f_abschluss:"Torabschluss",f_raum:"Raumverständnis",f_umschalt:"Umschalten & Pressing",f_laufweg:"Laufwege",f_defense:"Zweikampf & Verteidigen",f_tempo:"Tempo",f_koord:"Koordination",f_einsatz:"Laufbereitschaft",f_selbst:"Selbstvertrauen",f_team:"Kommunikation",f_resil:"Resilienz",f_coach:"Fokus"};
function teamDiagnose(){
  const keys=Object.keys(DIAG_LABELS);
  const sum={},cnt={};
  let players=0;
  Object.keys(DB).forEach(name=>{
    const snaps=DB[name]; if(!snaps||!snaps.length)return;
    const lat=snaps[snaps.length-1];
    const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
    let counted=false;
    keys.forEach(k=>{const val=v[k];if(val){sum[k]=(sum[k]||0)+((val-1)/3)*100;cnt[k]=(cnt[k]||0)+1;counted=true;}});
    if(counted)players++;
  });
  const means=keys.filter(k=>cnt[k]).map(k=>({key:k,label:DIAG_LABELS[k],mean:Math.round(sum[k]/cnt[k]),n:cnt[k]}));
  means.sort((a,b)=>a.mean-b.mean);
  return {players,weakest:means};
}
function renderTeamDiagnose(){
  const box=document.getElementById("tp-diagnose");
  if(!box)return;
  const {players,weakest}=teamDiagnose();
  if(players<2){box.innerHTML="";return;} // erst ab 2 bewerteten Spielern aussagekräftig
  const allForms=tpAllForms();
  const top=weakest[0];
  const reco=allForms.map((f,i)=>({i,f})).filter(x=>x.f.deficit===top.key);
  const chip=(m)=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:var(--surface);border:var(--border-s);border-radius:var(--r);margin-top:6px">
    <div style="font-size:12px"><strong>${esc(m.f.name)}</strong> <span style="font-size:10px;color:var(--text3)">${m.f.dauer||""}</span></div>
    <button class="btn btn-sm" onclick="tpAddRecoExercise(${m.i})"><i class="ti ti-plus"></i>In Plan</button>
  </div>`;
  box.innerHTML=`<div style="background:linear-gradient(135deg,#eff6ff,#f0fdfa);border:1px solid #bfdbfe;border-radius:var(--rl);padding:12px 14px;margin-bottom:12px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1e40af"><i class="ti ti-target-arrow" style="font-size:13px"></i> Team-Diagnose <span style="font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0">· ${players} bewertete Spieler</span></div>
    <div style="font-size:14px;font-weight:700;margin:6px 0 2px">Schwerpunkt heute: ${esc(top.label)} <span style="font-size:12px;color:#dc2626">Ø ${top.mean}%</span></div>
    <div style="font-size:11px;color:var(--text2)">Danach: ${weakest.slice(1,3).map(w=>`${esc(w.label)} (${w.mean}%)`).join(" · ")||"–"}</div>
    ${reco.length?`<div style="margin-top:8px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:2px">Passende Übungen</div>${reco.slice(0,4).map(chip).join("")}</div>`
      :`<div style="font-size:11px;color:var(--text3);margin-top:8px">Keine getaggte Übung für „${esc(top.label)}" – im Reiter „Übungen“ eine auswählen.</div>`}
  </div>`;
}
// Empfohlene Uebung in eine kompatible Planer-Station uebernehmen (nur wo sie als Option existiert).
function tpAddRecoExercise(formIdx){
  const sels=[...document.querySelectorAll(".tp-form-sel")];
  // bevorzugt eine leere Station, in deren Dropdown die Uebung vorkommt
  let target=sels.find(s=>!s.value&&[...s.options].some(o=>o.value===String(formIdx)))
          ||sels.find(s=>[...s.options].some(o=>o.value===String(formIdx)));
  if(!target){toast("Erst eine passende Phase (z. B. Individual/Hauptteil) hinzufügen","err");return;}
  target.value=String(formIdx);
  tpOnSelectChange(target);
  target.scrollIntoView({behavior:"smooth",block:"center"});
  toast("Übung in den Plan übernommen ✓");
}

/* Der geplante Zeitplan als Datenstruktur – frueher nur inline in evalRenderList.
   Wird auch von tpPlanSave() gebraucht, damit "Einheit bewerten" spaeter weiss,
   welche Uebungen an einem vergangenen Termin geplant waren. */
function tpPlanEntries(){
  const allForms=tpAllForms();
  const trainers=tpGetCheckedTrainers();
  const entries=[];
  document.querySelectorAll(".tp-form-sel").forEach(s=>{
    if(!s.value)return;
    const match=s.id.match(/tp-form-(\d+)-(\d+)/);
    if(!match)return;
    const slotIdx=parseInt(match[1]);
    const groupIdx=parseInt(match[2]);
    const slot=tpSlots[slotIdx];
    const typ=slot?.typ||"main";
    const noGrp=typ==="warmup"||typ==="abschluss"||typ==="tw";
    // tpCoaches wurde bisher nur GESCHRIEBEN: das Dropdown "Trainer für diese Station"
    // hatte keinerlei Wirkung. Jetzt entscheidet es, wem die Übung zugerechnet wird
    // (Trainer-Statistik und "Einheit bewerten"). Fällt auf den Gruppen-Trainer zurück.
    const trainer=noGrp?"Alle":(tpCoaches[s.id]||trainers[groupIdx]||`Trainer ${groupIdx+1}`);
    const formIdx=parseInt(s.value);
    const formName=allForms[formIdx]?.name||"?";
    entries.push({formIdx,formName,trainer,slotLabel:slot?.label||"",key:`${formIdx}-${trainer}`});
  });
  return entries;
}
/* Plan pro Datum sichern (debounced). Ohne Trainer-Token still ueberspringen –
   der Plan ist trainer-only und darf offline nicht die Queue verstopfen. */
let _tpPlanTimer=null;
function tpPlanSaveDebounced(){ clearTimeout(_tpPlanTimer); _tpPlanTimer=setTimeout(()=>tpPlanSave(false),1200); }
/* Die Zuordnung gehoert zur Struktur: welcher Trainer welches Feld hat, wer am Torwart-
   oder Einzelblock steht, welche Torhueter angehakt sind, welches Kind einzeln trainiert.
   Bis v455 lebte das alles nur im DOM und in tpCoaches – nach dem Neuladen war Finn nicht
   mehr am Torwart-Block, und der Hauptteil hatte wieder vier Felder. Kinder als kader.id. */
function tpSlotsMitZuordnung(){
  const ids=arr=>(typeof kidListToIds==="function")?kidListToIds(arr):arr;
  const id=n=>{const k=(typeof kidId==="function")?kidId(n):null; return k!=null?k:n;};
  return tpSlots.map((s,si)=>{
    const o={...s}; delete o.coaches; delete o.trainer; delete o.tw; delete o.kind;
    const typ=s.typ||"main";
    if(tpKannParallel(typ)){
      const t=tpCoaches[`tp-form-${si}-0`]; if(t)o.trainer=t;
      if(typ==="tw"){const an=[...document.querySelectorAll(`.tp-tw-player[data-slot="${si}"]`)]; if(an.length)o.tw=ids(an.filter(c=>c.checked).map(c=>c.value));}
      else{const k=document.getElementById(`tp-ind-player-${si}`)?.value; if(k)o.kind=id(k);}
    }else if(typ==="main"){
      const c=[]; document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`).forEach((sel,p)=>{c[p]=tpCoaches[sel.id]||"";});
      if(c.some(Boolean))o.coaches=c;
    }
    return o;
  });
}
async function tpPlanSave(erzwungen){
  if(!sbToken()){if(erzwungen)toast("Bitte zuerst als Trainer anmelden","err");return;}
  const datum=document.getElementById("tp-date")?.value; if(!datum){if(erzwungen)toast("Bitte einen Termin wählen","err");return;}
  const plan=tpPlanEntries();
  const slots=tpSlotsMitZuordnung();
  const zuordnung=slots.some(s=>s.trainer||s.coaches||s.tw||s.kind!=null);
  // Automatik: einen leeren Plan nie ueber einen vollen schreiben. Der Knopf darf immer.
  if(!plan.length&&!zuordnung&&!erzwungen)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},
      /* `slots` traegt die STRUKTUR der Einheit (welche Phasen, wie lang, was parallel)
         samt Zuordnung. Ohne sie kam beim zweiten Trainer nur die Uebungsauswahl an. */
      body:JSON.stringify({datum,plan,slots,updated_at:new Date().toISOString()})});
    if(erzwungen){
      if(r.ok)toast("Plan gespeichert ✓");
      else toast("Plan nicht gespeichert – "+((r.status===401||r.status===403)?"kein Trainer-Recht":"Server antwortet "+r.status),"err");
    }
  }catch(e){ if(erzwungen)toast("Kein Netz – Plan nicht gespeichert","err"); }
}
async function tpPlanLoad(datum){
  if(!sbToken())return [];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=eq.${encodeURIComponent(datum)}&select=plan`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return [];
    const rows=await r.json();
    return (rows[0]&&rows[0].plan)||[];
  }catch(e){return [];}
}
/* Eigene Funktion statt einer Erweiterung von tpPlanLoad: vier Stellen erwarten dort
   ein Uebungs-Array (Einheit bewerten, Eltern-Info, Sprachlob, Vorplanung). */
async function tpSlotsLoad(datum){
  if(!sbToken())return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=eq.${encodeURIComponent(datum)}&select=slots`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return null;
    const rows=await r.json();
    const sl=rows[0]&&rows[0].slots;
    return (Array.isArray(sl)&&sl.length)?sl:null;   // Altbestand ohne Struktur: null
  }catch(e){return null;}
}
/* Weg B (Bucket-List, jetzt gebaut): den gespeicherten Plan beim Öffnen/Terminwechsel
   wieder in die Übungs-Dropdowns laden. Damit sind Übungen FEST pro Termin vorgemerkt
   und mehrere Einheiten im Voraus planbar. Zuordnung über das Phasen-Label; bei
   Form-Index-Drift (gelöschte eigene Übungen) wird der Eintrag lieber ausgelassen. */
async function tpPlanRestore(datum){
  datum=datum||document.getElementById("tp-date")?.value; if(!datum)return;
  /* Reihenfolge ist entscheidend: erst die Phasen herstellen, dann die Uebungen
     einsetzen. Andersherum gaebe es die Auswahlfelder noch gar nicht, in die sie
     gehoeren - und die Zuordnung ueber das Phasen-Label ginge ins Leere. */
  const slots=await tpSlotsLoad(datum);
  if(slots){
    tpSlots.length=0;
    slots.forEach(s=>tpSlots.push({...s}));
    // Zuordnung des Termins: Feld-Trainer, Trainer am Torwart-/Einzelblock – VOR dem
    // Zeichnen, denn das Zeichnen liest tpCoaches und rechnet daraus die Felder.
    tpCoaches={};
    slots.forEach((s,si)=>{
      if(Array.isArray(s.coaches))s.coaches.forEach((t,p)=>{if(t)tpCoaches[`tp-form-${si}-${p}`]=t;});
      if(s.trainer)tpCoaches[`tp-form-${si}-0`]=s.trainer;
    });
    tpRenderTimeline();
    // nach dem Zeichnen: Torwart-Haken und das Kind im Einzeltraining (kader.id → Name)
    slots.forEach((s,si)=>{
      if(Array.isArray(s.tw)){const namen=new Set((typeof kidListFromIds==="function")?kidListFromIds(s.tw):s.tw); document.querySelectorAll(`.tp-tw-player[data-slot="${si}"]`).forEach(c=>{c.checked=namen.has(c.value);});}
      if(s.kind!=null){const sel=document.getElementById(`tp-ind-player-${si}`); const n=(typeof kidName==="function"&&/^\d+$/.test(String(s.kind)))?kidName(s.kind):s.kind; if(sel&&n&&[...sel.options].some(o=>o.value===n)){sel.value=n; if(typeof tpIndPlayerChange==="function")tpIndPlayerChange(si);}}
    });
  }
  const plan=await tpPlanLoad(datum); if(!plan||!plan.length)return;
  const allForms=tpAllForms();
  const sels=[...document.querySelectorAll(".tp-form-sel")];
  if(!sels.length)return;
  const belegt=new Set();
  plan.forEach(e=>{
    if(e.formIdx==null||!allForms[e.formIdx])return;
    const passend=sels.filter(s=>{
      if(belegt.has(s.id)||s.value)return false;
      const m=s.id.match(/tp-form-(\d+)-/); if(!m)return false;
      const slot=tpSlots[parseInt(m[1])];
      return slot&&(slot.label||"")===(e.slotLabel||"");
    });
    const s=passend[0]||sels.find(x=>!belegt.has(x.id)&&!x.value);
    if(!s)return;
    s.value=String(e.formIdx);
    belegt.add(s.id);
    if(typeof tpOnSelectChange==="function")tpOnSelectChange(s);
  });
}
/* Vorausplanungs-Leiste: die nächsten Trainings mit Plan-Status (✅ geplant / 📝 offen) –
   ein Tipp springt zum Termin und lädt den vorgemerkten Plan. */
async function tpVorplanLoad(){
  const el=document.getElementById("tp-vorplan"); if(!el)return;
  const heute=new Date().toISOString().slice(0,10);
  const rows=(await _termineSelLoad()).filter(t=>t.typ==="training"&&t.datum>=heute)
    .sort((a,b)=>a.datum<b.datum?-1:1).slice(0,5);
  if(rows.length<2){el.innerHTML="";return;}
  let geplant=new Set();
  try{const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=in.(${rows.map(t=>t.datum).join(",")})&select=datum`,{headers:sbAuthHeaders()});
    if(r.ok)((await r.json())||[]).forEach(x=>geplant.add(String(x.datum)));}catch(e){}
  el.innerHTML=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">🗓️ Vorausplanung – antippen zum Planen</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${rows.map(t=>{
      const on=geplant.has(t.datum);
      const d=new Date(t.datum+"T00:00:00");
      const lbl=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
      return `<button onclick="tpVorplanJump('${t.datum}')" class="btn btn-sm" style="${on?"border-color:#16a34a;color:#15803d":""}">${on?"✅":"📝"} ${lbl}</button>`;
    }).join("")}</div>`;
}
function tpVorplanJump(datum){
  if(typeof terminSelectEnsure==="function")terminSelectEnsure("tp-date",datum);
  /* v475: sel.value= loest kein change aus – Trainer-Chips, Quelle und Prognose blieben
     vom vorherigen Tag stehen, nur der Plan wechselte. Jetzt der ganze Tag. */
  tpTrainerRsvpLaden(datum);
  tpPlanRestore(datum);
}

/* ═══════════════════════════════════
   F5: TRAININGS-STATIONSTIMER – die Plan-Stationen (tpSlots) am Platz mit
   Countdown + Pfiff durchlaufen. Reines Frontend, kein Server.
═══════════════════════════════════ */
let _stT={ix:0,left:0,timer:null,stations:[],paused:false};
// Stationen aus dem aktuellen Zeitplan: Label + Dauer je Slot, plus die gewählten Übungen.
function stTimerStations(){
  return tpSlots.map((slot,si)=>{
    const forms=[...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)]
      .map(s=>(s.value&&s.selectedOptions[0])?s.selectedOptions[0].textContent.replace(/\s*\([^)]*\)\s*$/,"").trim():"")
      .filter(Boolean);
    return {label:slot.label||("Station "+(si+1)),dauer:Math.max(1,slot.dauer||10),farbe:slot.farbe||"#1a56db",forms:[...new Set(forms)]};
  });
}
function stTimerStart(){
  const st=stTimerStations();
  if(!st.length){toast("Kein Plan vorhanden – erst Stationen anlegen (Auto-Plan)","err");return;}
  _stT={ix:0,left:st[0].dauer*60,timer:null,stations:st,paused:false};
  document.getElementById("st-timer")?.remove();
  const ov=document.createElement("div"); ov.id="st-timer";
  ov.style.cssText="position:fixed;inset:0;background:#0b1220;color:#fff;z-index:11000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;font-family:inherit";
  document.body.appendChild(ov);
  stTimerRender();
  _stT.timer=setInterval(stTimerTick,1000);
  try{if(typeof requestWakeLock==="function")requestWakeLock();}catch(e){}
}
function stTimerTick(){
  if(_stT.paused)return;
  _stT.left--;
  if(_stT.left<=0){
    stTimerWhistle();
    if(_stT.ix>=_stT.stations.length-1){ stTimerRender(true); if(_stT.timer){clearInterval(_stT.timer);_stT.timer=null;} return; }
    _stT.ix++; _stT.left=_stT.stations[_stT.ix].dauer*60;
  }
  stTimerRender();
}
function stTimerWhistle(){ try{if(typeof rotBeep==="function"){rotBeep();setTimeout(rotBeep,260);}}catch(e){} try{navigator.vibrate&&navigator.vibrate([120,80,120]);}catch(e){} }
function stTimerNext(){
  if(!_stT.stations.length)return; stTimerWhistle();
  if(_stT.ix>=_stT.stations.length-1){ stTimerRender(true); if(_stT.timer){clearInterval(_stT.timer);_stT.timer=null;} return; }
  _stT.ix++; _stT.left=_stT.stations[_stT.ix].dauer*60; stTimerRender();
}
function stTimerPause(){ _stT.paused=!_stT.paused; stTimerRender(); }
function stTimerStop(){ if(_stT.timer){clearInterval(_stT.timer);_stT.timer=null;} document.getElementById("st-timer")?.remove(); try{if(typeof releaseWakeLock==="function")releaseWakeLock();}catch(e){} }
function stTimerRender(done){
  const ov=document.getElementById("st-timer"); if(!ov)return;
  if(done){
    ov.innerHTML=`<div style="font-size:60px">🎉</div><div style="font-size:26px;font-weight:800;margin:12px 0">Training geschafft!</div>
      <button onclick="stTimerStop()" style="margin-top:20px;padding:14px 28px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer">Fertig</button>`;
    return;
  }
  const s=_stT.stations[_stT.ix]||{}, next=_stT.stations[_stT.ix+1];
  const mm=Math.floor(Math.max(0,_stT.left)/60), ss=Math.max(0,_stT.left)%60, clock=mm+":"+(ss<10?"0":"")+ss;
  const warn=_stT.left<=10;
  ov.innerHTML=`
    <div style="font-size:13px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">Station ${_stT.ix+1}/${_stT.stations.length}${_stT.paused?" · ⏸ Pause":""}</div>
    <div style="font-size:26px;font-weight:800;margin:8px 0;color:${s.farbe||"#60a5fa"}">${esc(s.label||"")}</div>
    ${s.forms&&s.forms.length?`<div style="font-size:16px;color:#e2e8f0;margin-bottom:6px;max-width:520px">${s.forms.map(esc).join(" · ")}</div>`:""}
    <div style="font-size:84px;font-weight:900;line-height:1;margin:10px 0;color:${warn?"#f87171":"#fff"}">${clock}</div>
    ${next?`<div style="font-size:14px;color:#94a3b8;max-width:520px">Als Nächstes: ${esc(next.label)}${next.forms&&next.forms.length?" – "+esc(next.forms.join(", ")):""}</div>`:'<div style="font-size:14px;color:#94a3b8">Letzte Station</div>'}
    <div style="display:flex;gap:10px;margin-top:26px;flex-wrap:wrap;justify-content:center">
      <button onclick="stTimerPause()" style="padding:14px 22px;border:none;border-radius:12px;background:#334155;color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">${_stT.paused?"▶️ Weiter":"⏸ Pause"}</button>
      <button onclick="stTimerNext()" style="padding:14px 22px;border:none;border-radius:12px;background:#1a56db;color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">⏭ Nächste</button>
      <button onclick="stTimerStop()" style="padding:14px 22px;border:1px solid #475569;border-radius:12px;background:transparent;color:#cbd5e1;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">✕ Beenden</button>
    </div>`;
}

function evalStar(btn){
  const stars=btn.parentElement.querySelectorAll(".tb-eval-star");
  const val=parseInt(btn.dataset.val);
  const current=Array.from(stars).filter(s=>s.classList.contains("on")).length;
  const newVal=current===val?0:val;
  stars.forEach((s,i)=>{
    s.classList.toggle("on",i<newVal);
    s.textContent=i<newVal?"★":"☆";
  });
}

/* ═══════════════════════════════════
   AUTO-TRAININGSVORSCHLAG
═══════════════════════════════════ */
function tpGenerate(){
  const trainerCount=tpGetTrainerCount();
  if(trainerCount<1){toast("Mindestens 1 Trainer auswählen","err");return;}
  const slots=[{...TP_PHASEN[0]}];
  if(trainerCount>=2) slots.push({label:"Torwart-Training",dauer:15,farbe:"#854d0e",typ:"tw"});
  slots.push({...TP_PHASEN[1]});
  if(trainerCount>=3) slots.push({label:"Individual-Training",dauer:15,farbe:"#0e7490",typ:"individual"});
  slots.push({...TP_PHASEN[2]});
  slots.push({...TP_PHASEN[3]});
  tpSlots=slots;
  tpRenderTimeline();

  setTimeout(()=>{
    const allForms=tpAllForms();
    const warmups=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="aufwaermen");
    const main=allForms.map((f,i)=>({i,f})).filter(x=>!["aufwaermen","torwart","individual"].includes(x.f.kat)&&!x.f.custom);
    const tw=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="torwart");
    const ind=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="individual");

    const pick=(arr)=>arr.length?arr[Math.floor(Math.random()*arr.length)]:null;
    const used=new Set();
    const pickUnique=(arr)=>{
      const avail=arr.filter(x=>!used.has(x.i));
      if(!avail.length)return pick(arr);
      const p=pick(avail);
      if(p)used.add(p.i);
      return p;
    };

    tpSlots.forEach((slot,si)=>{
      const typ=slot.typ||"main";
      if(typ==="abschluss")return;
      const noGroups=typ==="warmup"||typ==="abschluss"||typ==="tw";
      const tgAnz2=((typeof tgFor==="function"&&tgFor())||{}).gruppen?.length||0;
      const parallelSlots=noGroups?1:Math.min(Math.max(1,trainerCount,tgAnz2),5); // wie tpRenderTimeline: ausgeloste Gruppen duerfen nicht wegfallen
      for(let p=0;p<parallelSlots;p++){
        const sel=document.getElementById(`tp-form-${si}-${p}`);
        if(!sel)continue;
        let choice=null;
        if(typ==="warmup") choice=pickUnique(warmups);
        else if(typ==="tw") choice=pickUnique(tw);
        else if(typ==="individual") choice=pickUnique(ind);
        else choice=pickUnique(main);
        if(choice){sel.value=choice.i;tpOnSelectChange(sel);}
      }
    });
    tpRenderTeamFokus(); // Team-Trainingsgenerator: schwächster Mannschaftswert -> Übungen
    tpRenderMindsetTip(); // E3: Mindset-Baustein des Tages
  },100);
}

// E3: schlägt zufällig eine der drei Ritual-Formen als festen Baustein der Einheit vor
// Team-Aggregat: Durchschnitt jeder Dimension über alle bewerteten Spieler
function teamAggregate(){
  const dimKeys=["tech","raute","phys","mental","entw"];
  const sums={},counts={};
  dimKeys.forEach(k=>{sums[k]=0;counts[k]=0;});
  Object.keys(DB).forEach(n=>{
    const pd=getPlayerData(n);
    if(!pd)return;
    /* calcScores liefert für eine Dimension OHNE beantwortete Kriterien 0 (nicht null) –
       z. B. bei Alt-Datensätzen mit inzwischen umbenannten Kriterien. Ohne diesen Filter
       zog jeder solche Spieler den Team-Schnitt als „0 %"-Bewertung nach unten und
       verfälschte damit die Schwerpunkt-Empfehlung. */
    dimKeys.forEach(k=>{if(pd.ds[k]!=null&&pd.ds[k]>0){sums[k]+=pd.ds[k];counts[k]++;}});
  });
  const avg={},n=Object.keys(DB).length;
  dimKeys.forEach(k=>{avg[k]=counts[k]?Math.round(sums[k]/counts[k]):null;});
  return{avg,spielerzahl:counts.tech||0};
}

// Team-Trainingsgenerator: schwächster Mannschaftswert -> passende Übungen aus der Datenbank
function tpRenderTeamFokus(){
  const{avg,spielerzahl}=teamAggregate();
  let box=document.getElementById("tp-team-fokus");
  if(!box){
    box=document.createElement("div");
    box.id="tp-team-fokus";
    const timeline=document.getElementById("tp-timeline");
    if(!timeline)return;
    timeline.insertAdjacentElement("afterend",box);
  }
  if(spielerzahl<3){box.innerHTML="";return;} // zu wenig Daten für ein sinnvolles Team-Bild
  const dimLabel={tech:"Technik & Ball",raute:"Rauten-IQ & Taktik",phys:"Physis & Motorik",mental:"Mentalität & Charakter",entw:"Entwicklungspotenzial"};
  // Dimension -> passende Übungs-Kategorien
  const dimKat={tech:["technik","passspiel"],raute:["raute","pressing","wahrnehmung"],phys:["aufwaermen","individual","spass"],mental:["mindset"],entw:["wahrnehmung","mindset"]};
  const sorted=Object.entries(avg).filter(([,val])=>val!=null).sort((a,b)=>a[1]-b[1]);
  if(!sorted.length){box.innerHTML="";return;}
  const[schwach,schwachVal]=sorted[0];
  const kats=dimKat[schwach]||[];
  const allForms=tpAllForms();
  // Passende Formen: Fokus-Formen bevorzugt, max. 3
  const passende=allForms.map((f,i)=>({i,f})).filter(x=>kats.includes(x.f.kat));
  const gewaehlt=passende.filter(x=>x.f.focus).concat(passende.filter(x=>!x.f.focus)).slice(0,3);
  box.innerHTML=`<div style="margin-top:10px;padding:10px 12px;background:var(--blue-bg);border:1px solid #93c5fd;border-radius:var(--rl)">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1e40af;margin-bottom:4px">📊 Team-Schwerpunkt (aus ${spielerzahl} Bewertungen)</div>
    <div style="font-size:12.5px;color:var(--text);margin-bottom:6px">Schwächster Mannschaftswert: <strong>${dimLabel[schwach]}</strong> (Ø ${schwachVal}%). Passende Übungen:</div>
    ${gewaehlt.length?gewaehlt.map(x=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><button class="btn btn-sm" onclick="tpShowExercise(${x.i})"><i class="ti ti-eye"></i></button><span style="font-size:12px;color:var(--text)">${esc(x.f.name)}</span></div>`).join(""):'<div style="font-size:11px;color:var(--text3)">Keine passende Form gefunden.</div>'}
  </div>`;
}

// Auto-Trainingsplan: aus Monats-Schwerpunkt (Periodisierung) + schwächstem Team-Wert +
// Bibliothek einen kompletten Ablauf bauen (Aufwärmen → Schwerpunkt → Team-Schwäche → Abschluss).
// Reiner Vorschlag – keine Persistenz, „neu würfeln" mischt neu. Läuft im Trainer-Tab.
const AUTOPLAN_DIMKAT={tech:["technik","passspiel"],raute:["raute","pressing","wahrnehmung"],phys:["aufwaermen","individual","spass"],mental:["mindset"],entw:["wahrnehmung","mindset"]};
const AUTOPLAN_DIMLABEL={tech:"Technik & Ball",raute:"Rauten-IQ & Taktik",phys:"Physis & Motorik",mental:"Mentalität & Charakter",entw:"Entwicklung"};
/* autoPlanPick/autoPlanBuild (alte Vorschlags-Box im Formen-Reiter) entfernt: der
   Container #autoplan-box existiert seit dem Formen-Umbau nicht mehr, der Auto-Plan
   der Planung ist tpGenerate(). AUTOPLAN_DIMKAT/-DIMLABEL bleiben – die Uebungs-
   Datenbank markiert damit Uebungen zur schwaechsten Team-Dimension. */
function tpRenderMindsetTip(){
  const allForms=tpAllForms();
  const rituale=["Die Kraft des NOCH","Reset-Knopf","Drei-gute-Dinge-Kreis"];
  const kandidaten=allForms.map((f,i)=>({i,f})).filter(x=>rituale.includes(x.f.name));
  if(!kandidaten.length)return;
  const wahl=kandidaten[Math.floor(Math.random()*kandidaten.length)];
  let box=document.getElementById("tp-mindset-tip");
  if(!box){
    box=document.createElement("div");
    box.id="tp-mindset-tip";
    const timeline=document.getElementById("tp-timeline");
    if(!timeline)return;
    timeline.insertAdjacentElement("afterend",box);
  }
  box.innerHTML=`<div style="margin-top:10px;padding:10px 12px;background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;border-radius:var(--rl)">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#047857;margin-bottom:4px">🧠 Mindset-Baustein des Tages</div>
    <div style="font-size:12.5px;font-weight:600;color:var(--text)">${esc(wahl.f.name)}</div>
    <div style="font-size:11px;color:var(--text2);margin:2px 0 6px">${esc(wahl.f.kurz||"")}</div>
    <button class="btn btn-sm" onclick="tpShowExercise(${wahl.i})"><i class="ti ti-eye"></i>Form ansehen</button>
  </div>`;
}

/* ═══════════════════════════════════
   PWA SETUP
═══════════════════════════════════ */
(function(){
  // Auto-Update: Der SW liefert cache-first (Seite hängt sonst eine Version hinterher).
  // Sobald ein neuer SW übernimmt, einmal automatisch neu laden – danach ist alles aktuell.
  if("serviceWorker" in navigator){
    let swReloaded=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(swReloaded)return;
      swReloaded=true;
      if(performance.now()<60000){location.reload();}
      else if(typeof toast==="function"){toast("Neue Version verfügbar – App einmal neu laden");}
    });
  }
  // Quiz-Modus: Manifest/Icon kommen aus der Quiz-IIFE – hier nicht überschreiben (B1)
  if(new URLSearchParams(location.search).has("quiz")){
    if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
    return;
  }
  // Manifest + Apple-Icon kommen statisch aus dem <head> (manifest-trainer.json mit
  // eindeutiger id "adler-u9-trainer" – getrennt installierbar von der Quiz-App)

  // Register Service Worker for offline support
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }

  // Der Install-Hinweis lebt in core.js (pwaInstallNudge/pwaBannerShow): er kennt den
  // Kontext, benennt die richtige App und meldet sich pro App nur einmal. Der frueher
  // hier stehende zweite Banner war kontextblind – er haette im Eltern-Bereich und im
  // Kinder-Quiz die Trainer-App angeboten – und lief als zweiter
  // beforeinstallprompt-Listener parallel. Ersatzlos entfernt.
})();

/* A11y: Icon-only-Buttons (×, ✕, 🗑, Pfeile) bekommen automatisch einen barrierefreien
   Namen, falls keiner gesetzt ist. Screenreader lasen sonst „mal-Zeichen“ oder nichts.
   Eine Stelle deckt ALLE per innerHTML erzeugten Modals ab – heute + kuenftig –, statt
   verstreuter aria-labels. childList/subtree-Observer -> setAttribute loest keine
   attribute-Mutation aus, also keine Schleife. */
(function a11yIconButtons(){
  const MAP={"×":"Schließen","✕":"Entfernen","🗑":"Löschen","🗑️":"Löschen","‹":"Zurück","◀":"Zurück","⟨":"Zurück","›":"Weiter","▶":"Weiter","⟩":"Weiter"};
  const hasName=b=>b.getAttribute("aria-label")||b.getAttribute("title")||b.getAttribute("aria-labelledby");
  function label(b){ if(hasName(b))return; const l=MAP[(b.textContent||"").trim()]; if(l)b.setAttribute("aria-label",l); }
  function scan(n){ if(!n||n.nodeType!==1)return; if(n.tagName==="BUTTON"){label(n);return;} n.querySelectorAll&&n.querySelectorAll("button").forEach(label); }
  function start(){
    scan(document.body);
    try{ new MutationObserver(ms=>{ for(const m of ms) m.addedNodes&&m.addedNodes.forEach(scan); }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start); else start();
})();

/* ═══════════════════════════════════
   P2: ÜBUNGS-PICKER – ersetzt die ellenlangen Dropdowns in der Trainings-Planung.
   Das <select> bleibt (versteckt) der Datenträger für Speichern/Laden/Timer; sichtbar
   ist ein großer Auswahl-Button, der dieses Fenster öffnet: Suche, „Zuletzt genutzt",
   4 Kategorie-Gruppen statt 7 Einzelkategorien, ⭐-Schwierigkeit (Startwerte je
   Kategorie, per Tipp korrigierbar – geteilt über team_config.uebung_meta).
═══════════════════════════════════ */
const KAT_GRUPPEN=[
  {key:"technik",  label:"⚽ Technik & Ballgefühl",  kats:["technik","wahrnehmung"]},
  {key:"passen",   label:"🎯 Passen & Spielaufbau",  kats:["passspiel","raute"]},
  {key:"zweikampf",label:"🛡️ 1 gegen 1 & Zweikampf", kats:["pressing"]},
  {key:"kopf",     label:"🎉 Spaß & Kopf",           kats:["spass","mindset"]}
];
const STERN_DEFAULT={aufwaermen:1,spass:1,technik:2,wahrnehmung:2,passspiel:2,individual:2,torwart:2,mindset:2,raute:3,pressing:3};
window._uebungMeta=null;
async function uebungMetaLoad(){
  if(window._uebungMeta)return window._uebungMeta;
  window._uebungMeta={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?select=id,uebung_meta&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const row=((await r.json())||[])[0];if(row){window._uebungMeta=row.uebung_meta||{};window._uebungMetaId=row.id;}}
  }catch(e){}
  return window._uebungMeta;
}
function _tpStern(f){
  if(!f)return 2;
  const ov=(window._uebungMeta||{})[f.name];
  if(ov>=1&&ov<=3)return ov;
  // PO: echte Schwierigkeit je Übung (diff-Feld) statt Pauschalwert je Kategorie –
  // sonst haben z. B. ALLE Pressing-Übungen 3 Sterne und der Filter läuft leer.
  if(f.diff>=1&&f.diff<=3)return f.diff;
  return STERN_DEFAULT[f.kat]||2;
}
function _tpGruppeVon(f){
  const g=KAT_GRUPPEN.find(g2=>g2.kats.includes(f&&f.kat));
  return g?g.key:"eigene";
}
let _tpPick={selId:null,gruppe:null,stern:0,suche:""};
function tpPickerOpen(selId){
  _tpPick={selId,gruppe:null,stern:0,suche:""};
  document.getElementById("tp-pick-modal")?.remove();
  const m=document.createElement("div");m.id="tp-pick-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Übung wählen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10004;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("tp-pick-modal","📚","Übung wählen","Suchen, Gruppe antippen oder aus „Zuletzt genutzt“","#16a34a")}
    <input id="tp-pick-suche" type="text" placeholder="Suchen… (z. B. Dribbling)" oninput="_tpPick.suche=this.value;clearTimeout(window._tpPickDeb);window._tpPickDeb=setTimeout(tpPickerRender,160)" style="width:100%;box-sizing:border-box;min-height:46px;padding:10px 12px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text)">
    <div id="tp-pick-gruppen" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"></div>
    <div id="tp-pick-sterne" style="display:flex;gap:6px;margin-top:8px"></div>
    <div id="tp-pick-liste" style="margin-top:10px"></div>
  </div>`;
  document.body.appendChild(m);
  uebungMetaLoad().then(()=>tpPickerRender());
  tpPickerRender();
}
function _tpPickItems(){
  const sel=document.getElementById(_tpPick.selId); if(!sel)return [];
  const forms=tpAllForms();
  return [...sel.options].filter(o=>o.value!=="").map(o=>{
    const i=Number(o.value), f=forms[i];
    return f?{i,f,label:o.textContent}:null;
  }).filter(Boolean);
}
/* Der Picker zeigt immer nur die Übungen, die zum Typ des Zeitplan-Blocks passen
   (tpFilteredOpts). Die Überschrift sagte trotzdem „Alle Übungen (65)" – als wäre das
   der ganze Bestand. Tatsächlich sind aus dem Hauptteil 45 Übungen ausgeblendet
   (Aufwärmen, Torwart, Einzeltraining). Der PO hat deshalb nachgefragt, wo die
   Torwart- und Einzeltraining-Übungen sind. Jetzt nennt die Überschrift den Block,
   und ein Hinweis sagt, wie viele woanders liegen und wie man dorthin kommt. */
const TP_PICK_TITEL={main:"Übungen für den Hauptteil",warmup:"Aufwärm-Übungen",tw:"Torwart-Übungen",individual:"Übungen fürs Einzeltraining",abschluss:"Übungen für den Abschluss"};
const TP_PICK_ANDERE={main:"Aufwärmen, Torwart, Einzeltraining",warmup:"Hauptteil, Torwart, Einzeltraining",tw:"Hauptteil, Aufwärmen, Einzeltraining",individual:"Hauptteil, Aufwärmen, Torwart"};
function _tpPickTyp(){
  const m=/^tp-form-(\d+)-/.exec(_tpPick.selId||"");
  const slot=(m&&typeof tpSlots!=="undefined")?tpSlots[Number(m[1])]:null;
  return slot?(slot.typ||"main"):"main";
}
function tpPickerRender(){
  const alle=_tpPickItems();
  // Gruppen-Kacheln nur zeigen, wenn die Liste gemischt ist (Aufwärmen/Torwart sind eh vorgefiltert)
  const gruppenIm=new Set(alle.map(x=>_tpGruppeVon(x.f)));
  const gr=document.getElementById("tp-pick-gruppen");
  if(gr){
    const kacheln=KAT_GRUPPEN.filter(g=>gruppenIm.has(g.key));
    if(gruppenIm.has("eigene"))kacheln.push({key:"eigene",label:"🧪 Eigene & KI"});
    gr.style.display=kacheln.length>1?"grid":"none";
    gr.innerHTML=kacheln.map(g=>`<button onclick="_tpPick.gruppe=_tpPick.gruppe==='${g.key}'?null:'${g.key}';tpPickerRender()" style="min-height:56px;border:1px solid var(--rand-bedien);${_tpPick.gruppe===g.key?"background:#16a34a;color:#fff;border-color:#16a34a;":"background:var(--surface2);color:var(--text2);"}border-radius:12px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;padding:8px">${g.label}</button>`).join("");
  }
  const st=document.getElementById("tp-pick-sterne");
  if(st)st.innerHTML=[0,1,2,3].map(s=>`<button onclick="_tpPick.stern=${s};tpPickerRender()" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);${_tpPick.stern===s?"background:#16a34a;color:#fff;border-color:#16a34a;":"background:var(--surface2);color:var(--text2);"}border-radius:10px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">${s===0?"Alle":"⭐".repeat(s)}</button>`).join("");
  const q=(_tpPick.suche||"").trim().toLowerCase();
  let items=alle;
  if(q)items=items.filter(x=>(x.f.name+" "+(x.f.kat||"")).toLowerCase().includes(q));
  else if(_tpPick.gruppe)items=items.filter(x=>_tpGruppeVon(x.f)===_tpPick.gruppe);
  if(_tpPick.stern)items=items.filter(x=>_tpStern(x.f)===_tpPick.stern);
  // „Zuletzt genutzt" nur im ungefilterten Zustand oben anbieten
  let html="";
  if(!q&&!_tpPick.gruppe&&!_tpPick.stern){
    const zuletzt=alle.map(x=>({...x,d:tpLastUsedDays(x.i)})).filter(x=>x.d!==null&&x.d<28).sort((a,b)=>a.d-b.d).slice(0,4);
    if(zuletzt.length)html+=`<div style="font-size:12px;font-weight:800;color:var(--text2);margin:2px 0 6px">🕘 Zuletzt genutzt</div>`+zuletzt.map(_tpPickKarte).join("");
    const typ=_tpPickTyp();
    const versteckt=Math.max(0,((typeof tpAllForms==="function"?tpAllForms():[]).length)-alle.length);
    html+=`<div style="font-size:12px;font-weight:800;color:var(--text2);margin:10px 0 6px">${TP_PICK_TITEL[typ]||"Übungen"} (${items.length})</div>`;
    if(versteckt&&TP_PICK_ANDERE[typ])
      html+=`<div style="font-size:11.5px;color:var(--text3);line-height:1.5;margin:-2px 0 8px">Nur Übungen für diesen Block – die übrigen ${versteckt} liegen in anderen Blöcken (${TP_PICK_ANDERE[typ]}), anzulegen über „➕ Phase hinzufügen".</div>`;
  }else{
    html+=`<div style="font-size:12px;font-weight:800;color:var(--text2);margin:2px 0 6px">${items.length} Übung${items.length===1?"":"en"}</div>`;
  }
  html+=items.map(_tpPickKarte).join("")||'<div style="font-size:12.5px;color:var(--text3);padding:10px 0">Nichts gefunden.</div>';
  const li=document.getElementById("tp-pick-liste");
  if(li)li.innerHTML=html;
}
function _tpPickKarte(x){
  const d=tpLastUsedDays(x.i);
  const frische=d===null?'<span style="color:#16a34a">🆕 neu</span>':(d<14?`<span style="color:#b45309">vor ${d} T.</span>`:`vor ${d} T.`);
  const stern=_tpStern(x.f);
  return `<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-radius:12px;padding:10px 12px;margin-bottom:8px;background:var(--surface)">
    <button onclick="tpPickerSet(${x.i})" style="flex:1;min-width:0;min-height:44px;border:none;background:transparent;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;padding:0">
      <span style="display:block;font-size:14px;font-weight:800">${esc(x.f.name)}</span>
      <span style="display:block;font-size:11.5px;color:var(--text2)">${x.f.dauer||"?"} Min. · ${esc(x.f.kat||"eigene")} · ${frische}</span>
    </button>
    <button onclick="tpSternTipp('${x.f.name.replace(/'/g,"\\'")}')" title="Schwierigkeit antippen zum Ändern" style="min-width:52px;min-height:44px;border:none;background:transparent;color:#f59e0b;font-size:13px;cursor:pointer;letter-spacing:1px">${"⭐".repeat(stern)}</button>
    <button onclick="tpPickerInfo(${x.i})" aria-label="Übung ansehen" title="Skizze & Beschreibung ansehen" style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface2);color:var(--text);font-size:15px;cursor:pointer">ℹ️</button>
  </div>`;
}
function tpPickerSet(idx){
  const sel=document.getElementById(_tpPick.selId);
  if(sel){sel.value=String(idx);try{tpOnSelectChange(sel);}catch(e){}tpPickSync(_tpPick.selId);}
  document.getElementById("tp-pick-modal")?.remove();
}
// Sterne-Korrektur: 1 → 2 → 3 → 1; geteilt über team_config.uebung_meta
async function tpSternTipp(name){
  const forms=tpAllForms(), f=forms.find(x=>x.name===name);
  const neu=(_tpStern(f)%3)+1;
  window._uebungMeta=window._uebungMeta||{};
  window._uebungMeta[name]=neu;
  // je nach Kontext neu zeichnen: Picker offen -> Picker, sonst Formen-Datenbank
  if(document.getElementById("tp-pick-modal"))tpPickerRender();else renderTraining();
  try{
    if(window._uebungMetaId!=null)
      await fetch(`${SB_URL}/rest/v1/team_config?id=eq.${window._uebungMetaId}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({uebung_meta:window._uebungMeta})});
  }catch(e){}
}
// Sichtbaren Auswahl-Button mit dem (versteckten) Select synchron halten
function tpPickSync(selId){
  const sel=document.getElementById(selId), btn=document.getElementById(selId+"-pick");
  if(!sel||!btn)return;
  const o=sel.selectedOptions&&sel.selectedOptions[0];
  btn.textContent=(sel.value&&o)?o.textContent:"— Übung wählen —";
  btn.style.fontWeight=sel.value?"800":"600";
}
function tpPickSyncAll(){document.querySelectorAll(".tp-form-sel").forEach(s=>tpPickSync(s.id));}

/* ═══════════════════════════════════
   P3: TRAININGSSTART – synchroner Ablauf über alle Trainer-Handys (PO).
   Ein Trainer drückt „Trainingsstart“ → bei allen anderen ploppt „Bereit?“ auf.
   Sind alle Pflicht-Trainer bereit, zählt ein 10-Sekunden-Countdown herunter und die
   Station läuft VOLLBILD auf allen Geräten parallel (Anker = slot_start-Zeitstempel in
   training_live; die Geräte pollen alle 3 s – kein Realtime-Framework nötig).
   Jeder Trainer sieht SEINE Übung, hat eine private Stoppuhr und meldet
   „Übung abgeschlossen“; haben alle gemeldet, startet die Bereit-Runde für die nächste
   Station. Ohne Netz: ehrlicher Hinweis + Fallback auf den lokalen Stationstimer.
═══════════════════════════════════ */
let _tl={row:null,poll:null,tick:null,gepfiffen:-1,uhr:{run:false,seit:0,acc:0,laps:[]}};
function _tlHeute(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
/* Snapshot der geplanten Einheit: Slots mit Gruppen (Trainer + Übung + Trainingsgruppe
   samt Kindernamen). Parallele Einzeltrainings werden an ihren Hauptteil angedockt;
   das Einzel-Kind wird in diesem Fenster aus seiner Gruppe herausgenommen. */
function _tlSnapshot(){
  const forms=tpAllForms(), trainers=tpGetCheckedTrainers();
  const tg=(typeof tgFor==="function")?tgFor():null;
  const stationen=[];
  tpSlots.forEach((slot,si)=>{
    if(tpIstParallel(slot))return; // dockt unten an
    const gruppen=[];
    const sels=document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`);
    const felder=(tg&&tg.gruppen&&(slot.typ||"main")==="main")?tpFelderGruppen(tg,sels.length,slot.weg):null;
    sels.forEach((s,p)=>{
      const f=s.value?forms[Number(s.value)]:null;
      const tgg=felder?felder[p]:null;
      gruppen.push({
        trainer:tpCoaches[s.id]||(tgg&&tgg.trainer)||trainers[p]||"Alle",
        uebung:f?f.name:"(keine Übung gewählt)",
        gruppe:tgg?`${tgg.emo} ${tgg.name}`:null,
        kinder:tgg?tgg.kinder.slice():null
      });
    });
    if(!gruppen.length)gruppen.push({trainer:"Alle",uebung:(slot.typ==="abschluss")?"Freies Spiel / Trainingsturnier":"(frei)",gruppe:null,kinder:null});
    stationen.push({si,label:slot.label||("Station "+(si+1)),dauer:Math.max(1,slot.dauer||10),farbe:slot.farbe||"#16a34a",gruppen});
  });
  /* Parallele Blöcke docken an ihre Ziel-Station an. Die beteiligten Kinder werden dort
     aus den Feldgruppen entfernt – sie sind ja weg. Beim Torwart-Block sind das die
     angehakten Torhüter (mehrere), beim Individual-Block das eine gewählte Kind. */
  tpSlots.forEach((slot,si)=>{
    if(!tpIstParallel(slot))return;
    const ziel=stationen.find(st=>st.si===slot.parallelZu); if(!ziel)return;
    const sel=document.querySelector(`.tp-form-sel[id^="tp-form-${si}-"]`);
    const f=(sel&&sel.value)?forms[Number(sel.value)]:null;
    const twBlock=(slot.typ||"main")==="tw";
    const kinder=twBlock
      ? Array.from(document.querySelectorAll(`.tp-tw-player[data-slot="${si}"]:checked`)).map(c=>c.value)
      : [document.getElementById(`tp-ind-player-${si}`)?.value||""].filter(Boolean);
    ziel.gruppen.forEach(g=>{if(g.kinder&&kinder.length)g.kinder=g.kinder.filter(k=>!kinder.includes(k));});
    const titel=twBlock
      ? `🧤 Torwart-Training${kinder.length?" mit "+kinder.join(", "):""}: ${f?f.name:"(Übung wählen)"}`
      : `🎯 Einzeltraining${kinder.length?" mit "+kinder[0]:""}: ${f?f.name:"(Übung wählen)"}`;
    ziel.gruppen.push({trainer:(sel&&tpCoaches[sel.id])||"?",uebung:titel,gruppe:null,kinder:kinder.length?kinder:null,einzel:true});
  });
  return stationen.map(({si,...rest})=>rest);
}
/* Kinder im Live-Plan: kader.id in der Datenbank, Name im Speicher und auf dem Handy */
function _tlPlanMit(plan,f){
  if(!plan||!Array.isArray(plan.slots))return plan;
  return {...plan,slots:plan.slots.map(st=>({...st,gruppen:(st.gruppen||[]).map(g=>({...g,kinder:Array.isArray(g.kinder)?f(g.kinder):g.kinder}))}))};
}
async function _tlFetch(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/training_live?datum=eq.${_tlHeute()}&select=*`,{headers:sbAuthHeaders()});
    if(r.ok){const row=((await r.json())||[])[0]||null; if(row&&row.plan)row.plan=_tlPlanMit(row.plan,kidListFromIds); return row;}
  }catch(e){}
  return undefined; // undefined = Netzproblem, null = keine Session
}
async function _tlPatch(fields,nurStatus){
  try{
    const url=`${SB_URL}/rest/v1/training_live?datum=eq.${_tlHeute()}${nurStatus?`&status=eq.${nurStatus}`:""}`;
    const r=await fetch(url,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({...fields,updated_at:new Date().toISOString()})});
    return r.ok||r.status===204;
  }catch(e){return false;}
}
// Start durch einen Trainer: Session anlegen (oder heutige übernehmen) + Lobby öffnen
async function tlStart(){
  const me=await trainerMe();
  // Zwei verschiedene Ursachen, frueher beide mit derselben (falschen) Meldung: gar nicht
  // angemeldet – oder angemeldet, aber ohne Anzeigenamen im Profil. Der Name ist hier keine
  // Deko: die Lobby fuehrt Pflicht- und Fertig-Meldungen unter genau diesem Namen.
  if(!me){
    toast(sbToken()?"Dein Anzeigename fehlt im Profil – ohne ihn kann die Lobby dich nicht zuordnen. Bitte bei den Trainer-Einstellungen eintragen lassen.":"Bitte als Trainer anmelden","err");
    return;
  }
  const pflicht=tpGetCheckedTrainers();
  if(!pflicht.length){toast("Erst oben die Trainer von heute anhaken","err");return;}
  // Ohne Stationen gibt es nichts zu starten – sonst hängt die Runde unaufhaltsam auf „läuft".
  if(!_tlSnapshot().length){toast("Erst Stationen mit Übungen planen","err");return;}
  if(!pflicht.includes(me)&&pflicht.length)pflicht.push(me);
  const vorhanden=await _tlFetch();
  if(vorhanden===undefined){toast("Kein Netz – nimm den ⏱️ Solo-Timer (läuft ohne Server)","err");return;}
  if(vorhanden&&vorhanden.status!=="fertig"){
    if(vorhanden.status==="lobby"&&(vorhanden.slot||0)===0){
      // BUGFIX (PO-Test): eine hängen gebliebene Lobby (z. B. alte Testrunde mit anderen
      // Trainern) wartete ewig auf Leute, die gar nicht da sind. Ein neuer Start setzt
      // Pflicht-Trainer und Plan frisch auf – solange noch keine Station gelaufen ist.
      await _tlPatch({status:"lobby",slot:0,slot_start:null,bereit:{[me]:true},fertig:{},pflicht,plan:_tlPlanMit({slots:_tlSnapshot()},kidListToIds)});
      const neu=await _tlFetch(); if(neu)_tl.row=neu; else _tl.row=vorhanden;
    }else{
      _tl.row=vorhanden;
    }
    tlOverlayOpen(); _tlPollStart(); await _tlAdvance(); return;
  }
  const body={datum:_tlHeute(),status:"lobby",slot:0,slot_start:null,bereit:{[me]:true},fertig:{},pflicht,plan:_tlPlanMit({slots:_tlSnapshot()},kidListToIds)};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/training_live?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(!r.ok&&r.status!==201){toast(sbDeniedMsg(r,"Konnte nicht starten"),"err");return;}
  }catch(e){toast("Kein Netz – nimm den ⏱️ Stationstimer","err");return;}
  _tl.row=body;
  tlOverlayOpen(); _tlPollStart();
  await _tlAdvance(); // Solo-Trainer: nicht auf den ersten Poll-Takt warten – sofort Countdown
}
/* Passive Erkennung (Startseite/Planung, gedrosselt): läuft heute eine Session, in der
   ich gebraucht werde, ploppt das Bereit-Fenster von selbst auf. */
let _tlCheckAt=0;
async function tlCheck(){
  if(Date.now()-_tlCheckAt<30000)return; _tlCheckAt=Date.now();
  if(document.getElementById("tl-ov"))return;
  const row=await _tlFetch(); if(!row||row.status==="fertig")return;
  const me=await trainerMe(); if(!me||!(row.pflicht||[]).includes(me))return;
  _tl.row=row; tlOverlayOpen(); _tlPollStart();
}
function _tlPollStart(){
  if(_tl.poll)clearInterval(_tl.poll);
  _tl.poll=setInterval(async()=>{
    if(!document.getElementById("tl-ov")){_tlPollStop();return;}
    const row=await _tlFetch();
    if(row){_tl.row=row;await _tlAdvance();}
  },3000);
  if(_tl.tick)clearInterval(_tl.tick);
  _tl.tick=setInterval(()=>{if(document.getElementById("tl-ov"))_tlRender();},500);
  try{if(typeof requestWakeLock==="function")requestWakeLock();}catch(e){}
}
function _tlPollStop(){
  if(_tl.poll){clearInterval(_tl.poll);_tl.poll=null;}
  if(_tl.tick){clearInterval(_tl.tick);_tl.tick=null;}
  try{if(typeof releaseWakeLock==="function")releaseWakeLock();}catch(e){}
}
function tlOverlayOpen(){
  document.getElementById("tl-ov")?.remove();
  const ov=document.createElement("div"); ov.id="tl-ov";
  ov.style.cssText="position:fixed;inset:0;background:#0b1220;color:#fff;z-index:11000;overflow-y:auto;padding:18px;text-align:center";
  document.body.appendChild(ov);
  _tlRender();
}
function tlSchliessen(){ document.getElementById("tl-ov")?.remove(); _tlPollStop(); }
// Lobby verwerfen (nur vor Station 1): Session löschen, dann oben Trainer anpassen + neu starten
async function tlAbbrechen(){
  if(!confirm("Diesen Trainingsstart für ALLE Geräte verwerfen? Danach im Trainingsplan anpassen und neu starten."))return;
  let _delOk=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/training_live?datum=eq.${_tlHeute()}`,{method:"DELETE",headers:sbAuthHeaders()});_delOk=r.ok;}catch(e){}
  if(!_delOk){toast("Konnte nicht verworfen werden – kein Netz? Nochmal versuchen","err");return;}
  _tl.row=null;
  tlSchliessen();
  toast("Trainingsstart verworfen – Trainer oben anpassen und neu starten");
}
/* Einen Trainer aus der laufenden Runde nehmen (kam nicht, Handy leer …). Nimmt ihn aus
   pflicht UND aus den Stations-Gruppen des Snapshots, damit auch _tlSlotTrainer ihn
   nicht mehr erwartet – sonst hinge die nächste Station wieder. */
async function tlOhne(name){
  const row=_tl.row; if(!row)return;
  if(!confirm(`Ohne ${name} weitermachen? ${name} wird aus dieser Trainingsrunde genommen.`))return;
  const pflicht=(row.pflicht||[]).filter(t=>t!==name);
  if(!pflicht.length){toast("Mindestens ein Trainer muss dabei bleiben","err");return;}
  const plan=JSON.parse(JSON.stringify(row.plan||{slots:[]}));
  (plan.slots||[]).forEach(st=>(st.gruppen||[]).forEach(g=>{if(g.trainer===name)g.trainer="Alle";}));
  const bereit={...(row.bereit||{})}; delete bereit[name];
  await _tlPatch({pflicht,plan,bereit});
  const neu=await _tlFetch(); if(neu)_tl.row=neu;
  toast(`${name} ist raus – weiter geht's`);
  await _tlAdvance();
}
// Zustands-Übergänge, die JEDES Gerät erkennen darf (Guard über status=eq. verhindert Doppel)
async function _tlAdvance(){
  const row=_tl.row; if(!row)return;
  const slots=(row.plan&&row.plan.slots)||[];
  if(row.status==="lobby"){
    /* Es muss GENAU die Menge zählen, die die Lobby auch anzeigt: ab Station 2 sind das
       nur die Trainer dieser Station. Vorher wartete der Übergang auf alle Pflicht-Trainer –
       ein Kollege ohne Gruppe an dieser Station hat das Training stillschweigend blockiert. */
    const noetig=row.slot===0?(row.pflicht||[]):_tlSlotTrainer(row,row.slot);
    const alleBereit=noetig.every(t=>row.bereit&&row.bereit[t]);
    if(alleBereit&&noetig.length){
      await _tlPatch({status:"laeuft",slot_start:new Date(Date.now()+10000).toISOString()},"lobby");
      const neu=await _tlFetch(); if(neu)_tl.row=neu;
    }
  }else if(row.status==="laeuft"){
    const st=slots[row.slot];
    // Ohne Station (leerer Plan / Index über dem Ende) gab es KEINEN Ausweg mehr: die
    // Session blieb auf "laeuft" und riss auf jedem Handy das Vollbild auf.
    if(!st){ await _tlPatch({status:"fertig"},"laeuft"); const n=await _tlFetch(); if(n)_tl.row=n; }
    else{
      const noetig=_tlSlotTrainer(row,row.slot);
      const alleFertig=noetig.every(t=>((row.fertig||{})[t]||[]).includes(row.slot));
      if(alleFertig&&noetig.length){
        if(row.slot+1<slots.length)await _tlPatch({status:"lobby",slot:row.slot+1,slot_start:null,bereit:{}},"laeuft");
        else await _tlPatch({status:"fertig"},"laeuft");
        const neu=await _tlFetch(); if(neu)_tl.row=neu;
      }
    }
  }
  _tlRender();
}
function _tlSlotTrainer(row,slotIdx){
  const st=((row.plan&&row.plan.slots)||[])[slotIdx]; if(!st)return row.pflicht||[];
  const namen=[...new Set(st.gruppen.map(g=>g.trainer))].filter(t=>(row.pflicht||[]).includes(t));
  return namen.length?namen:(row.pflicht||[]);
}
/* Meldungen laufen über die RPC training_live_mark: sie setzt NUR den eigenen Schlüssel
   (jsonb-Merge) statt den ganzen Blob zurückzuschreiben. Vorher galt last-write-wins –
   tippten zwei Trainer in derselben Poll-Lücke, verschwand eine der beiden Meldungen. */
async function _tlMark(feld,slot){
  const me=await trainerMe(); if(!me)return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/training_live_mark`,{method:"POST",
      headers:{...sbAuthHeaders(),'Content-Type':'application/json'},
      body:JSON.stringify({p_datum:_tlHeute(),p_feld:feld,p_trainer:me,p_slot:slot??null})});
    if(!r.ok)return null;
    const row=await r.json();
    return (Array.isArray(row)?row[0]:row)||null;
  }catch(e){ return null; }
}
async function tlBereit(){
  const me=await trainerMe(); if(!me)return;
  const neu=await _tlMark("bereit",null);
  if(neu)_tl.row=neu;
  else if(_tl.row){ // Offline-Fallback: wenigstens lokal anzeigen
    _tl.row.bereit={...(_tl.row.bereit||{}),[me]:true};
    await _tlPatch({bereit:_tl.row.bereit});
  }
  await _tlAdvance();
}
async function tlAbgeschlossen(){
  const me=await trainerMe(); if(!me||!_tl.row)return;
  // Meine Stoppuhr endet mit der Übung (PO) – der Stand bleibt bis zur nächsten Station sichtbar
  if(_tl.uhr.run){_tl.uhr.acc+=Date.now()-_tl.uhr.seit;_tl.uhr.run=false;}
  const slot=_tl.row.slot;
  const neu=await _tlMark("fertig",slot);
  if(neu)_tl.row=neu;
  else{ // Offline-Fallback
    const fertig={...(_tl.row.fertig||{})};
    fertig[me]=[...new Set([...(fertig[me]||[]),slot])];
    await _tlPatch({fertig});
    _tl.row.fertig=fertig;
  }
  try{navigator.vibrate&&navigator.vibrate(40);}catch(e){}
  await _tlAdvance();
}
// ── private Stoppuhr (nur lokal) ──
function tlUhrToggle(){
  const u=_tl.uhr;
  if(u.run){u.acc+=Date.now()-u.seit;u.run=false;}
  else{u.seit=Date.now();u.run=true;}
  _tlRender();
}
function tlUhrRunde(){
  const u=_tl.uhr;
  u.laps.unshift(_tlUhrMs());
  if(u.laps.length>5)u.laps.pop();
  _tlRender();
}
function tlUhrReset(){_tl.uhr={run:false,seit:0,acc:0,laps:[]};_tlRender();}
function _tlUhrMs(){const u=_tl.uhr;return u.acc+(u.run?Date.now()-u.seit:0);}
function _tlFmt(ms){const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
async function _tlMeinName(){ return (typeof _meTrainer==="string"&&_meTrainer)?_meTrainer:await trainerMe(); }
function _tlRender(){
  const ov=document.getElementById("tl-ov"); if(!ov)return;
  const row=_tl.row;
  if(!row){ov.innerHTML='<div style="padding:40px">Lade…</div>';return;}
  const slots=(row.plan&&row.plan.slots)||[];
  const me=(typeof _meTrainer==="string")?_meTrainer:"";
  const kopf=`<div style="display:flex;align-items:center;gap:8px;max-width:520px;margin:0 auto">
      <span style="font-size:20px">🏃</span>
      <span style="font-size:14px;font-weight:800;flex:1;text-align:left">Trainingsstart · Station ${row.slot+1}/${slots.length||"?"}</span>
      <button onclick="tlSchliessen()" aria-label="Schließen" style="min-width:44px;min-height:44px;border:none;background:rgba(255,255,255,.12);color:#fff;border-radius:10px;font-size:17px;cursor:pointer">✕</button>
    </div>`;
  if(row.status==="fertig"){
    ov.innerHTML=kopf+`<div style="max-width:520px;margin:8vh auto 0">
      <div style="font-size:64px">🎉</div>
      <div style="font-size:24px;font-weight:900;margin:10px 0">Training geschafft!</div>
      <div style="font-size:13px;opacity:.8">Denkt an die Nachbewertung – jeder bewertet seine eigenen Übungen.</div>
      <button onclick="tlSchliessen()" style="margin-top:24px;padding:14px 28px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer">Fertig</button>
    </div>`;
    return;
  }
  const st=slots[row.slot]||{label:"Station",dauer:10,gruppen:[]};
  if(row.status==="lobby"){
    const noetig=row.slot===0?(row.pflicht||[]):_tlSlotTrainer(row,row.slot);
    const binBereit=me&&row.bereit&&row.bereit[me];
    ov.innerHTML=kopf+`<div style="max-width:520px;margin:6vh auto 0">
      <div style="font-size:52px">🟢</div>
      <div style="font-size:22px;font-weight:900;margin:8px 0">${row.slot===0?"Training startet":"Nächste Station"} – bereit?</div>
      <div style="font-size:14px;opacity:.85;margin-bottom:16px">${esc(st.label)} · ${st.dauer} Min.</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">
        ${noetig.map(t=>{
          const da=row.bereit&&row.bereit[t];
          // Wer nicht kommt (Handy weg, kurzfristig abgesagt), darf herausgenommen werden –
          // sonst blockiert ein einziger fehlender Trainer die gesamte Runde.
          return `<span style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:18px;font-size:13px;font-weight:800;background:${da?"#16a34a":"rgba(255,255,255,.12)"}">${da?"✅":"⏳"} ${esc(t)}${da?"":`<button onclick="tlOhne('${t.replace(/'/g,"\\'")}')" title="ohne ${esc(t)} weitermachen" aria-label="ohne ${esc(t)} weitermachen" style="min-width:24px;min-height:24px;border:none;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font-size:12px;font-weight:900;cursor:pointer;line-height:1">✕</button>`}</span>`;
        }).join("")}
      </div>
      ${binBereit?'<div style="font-size:14px;opacity:.8">Warten auf die anderen…</div>'
        :`<button onclick="tlBereit()" style="width:100%;max-width:340px;min-height:64px;border:none;border-radius:16px;background:#16a34a;color:#fff;font-size:20px;font-weight:900;font-family:inherit;cursor:pointer">✅ Bereit!</button>`}
      <button onclick="tlAbbrechen()" style="display:block;margin:18px auto 0;min-height:44px;border:none;background:transparent;color:#94a3b8;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline">🔁 Abbrechen & neu starten</button>
    </div>`;
    return;
  }
  // status laeuft: 10-s-Countdown, dann Stations-Countdown – Anker slot_start läuft überall parallel
  // Neue Station = frische Stoppuhr (PO: die Uhr gehört zur Übung, nicht zum ganzen Training)
  if(_tl.uhrSlot!==row.slot){_tl.uhr={run:false,seit:0,acc:0,laps:[]};_tl.uhrSlot=row.slot;}
  const startMs=row.slot_start?new Date(row.slot_start).getTime():Date.now();
  const jetzt=Date.now();
  const meine=st.gruppen.filter(g=>g.trainer===me||g.trainer==="Alle");
  const zeigen=meine.length?meine:st.gruppen;
  if(jetzt<startMs){
    const sek=Math.ceil((startMs-jetzt)/1000);
    ov.innerHTML=kopf+`<div style="max-width:520px;margin:8vh auto 0">
      <div style="font-size:16px;opacity:.8">${esc(st.label)} – gleich geht's los!</div>
      <div style="font-size:110px;font-weight:900;font-variant-numeric:tabular-nums">${sek}</div>
    </div>`;
    return;
  }
  const rest=Math.max(0,Math.round((startMs+st.dauer*60000-jetzt)/1000));
  if(rest===0&&_tl.gepfiffen!==row.slot){_tl.gepfiffen=row.slot;try{if(typeof stTimerWhistle==="function")stTimerWhistle();}catch(e){}}
  const ich=me&&((row.fertig||{})[me]||[]).includes(row.slot);
  ov.innerHTML=kopf+`<div style="max-width:520px;margin:2vh auto 0">
    <div style="font-size:56px;font-weight:900;font-variant-numeric:tabular-nums;color:${rest===0?"#f87171":"#fff"}">${rest===0?"Abpfiff!":_tlFmt(rest*1000)}</div>
    <div style="font-size:12px;opacity:.7;margin-bottom:14px">${esc(st.label)} · läuft auf allen Handys parallel</div>
    ${zeigen.map(g=>`<div style="background:#111c33;border-radius:16px;padding:16px;margin-bottom:10px;text-align:left">
      <div style="font-size:11px;font-weight:800;opacity:.7">🧢 ${esc(g.trainer)}${g.gruppe?" · "+esc(g.gruppe):""}${meine.length?"":" (nicht deine Gruppe)"}</div>
      <div style="font-size:20px;font-weight:900;margin-top:4px">${esc(g.uebung)}</div>
      ${g.kinder&&g.kinder.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${g.kinder.map(k=>`<span style="padding:5px 10px;border-radius:14px;background:rgba(255,255,255,.12);font-size:12.5px;font-weight:700">${esc(k)}</span>`).join("")}</div>`:""}
    </div>`).join("")}
    <div style="background:#111c33;border-radius:16px;padding:14px;margin:14px 0">
      <div style="font-size:11px;font-weight:800;opacity:.7;text-align:left">⏱ Meine Stoppuhr</div>
      <div style="font-size:34px;font-weight:900;font-variant-numeric:tabular-nums;margin:4px 0">${_tlFmt(_tlUhrMs())}</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button onclick="tlUhrToggle()" style="flex:1;min-height:48px;border:none;border-radius:12px;background:#334155;color:#fff;font-weight:800;font-family:inherit;cursor:pointer">${_tl.uhr.run?"⏸ Stopp":"▶ Start"}</button>
        <button onclick="tlUhrRunde()" style="flex:1;min-height:48px;border:none;border-radius:12px;background:#334155;color:#fff;font-weight:800;font-family:inherit;cursor:pointer">🔁 Runde</button>
        <button onclick="tlUhrReset()" style="min-width:64px;min-height:48px;border:none;border-radius:12px;background:#1e293b;color:#94a3b8;font-weight:800;font-family:inherit;cursor:pointer">↺</button>
      </div>
      ${_tl.uhr.laps.length?`<div style="font-size:12px;opacity:.75;margin-top:8px">${_tl.uhr.laps.map((l,i)=>`R${_tl.uhr.laps.length-i}: ${_tlFmt(l)}`).join(" · ")}</div>`:""}
    </div>
    ${ich?'<div style="font-size:14px;font-weight:800;color:#4ade80">✅ Gemeldet – warten auf die anderen…</div>'
      :`<button onclick="tlAbgeschlossen()" style="width:100%;max-width:340px;min-height:60px;border:none;border-radius:16px;background:#16a34a;color:#fff;font-size:17px;font-weight:900;font-family:inherit;cursor:pointer">✅ Übung abgeschlossen</button>`}
    <button onclick="tlAbbrechen()" style="display:block;margin:14px auto 0;min-height:44px;border:none;background:transparent;color:#94a3b8;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline">🔁 Abbrechen & neu starten</button>
  </div>`;
}

/* ═══════════════════════════════════
   TRAININGSGRUPPEN (PO): Vor dem Training werden alle anwesenden Kinder in genau so
   viele Gruppen geteilt, wie Trainer angehakt sind (2 Trainer = 2 Gruppen …).
   Namen bewusst wertungsfrei UND farblogisch zu den Leibchen: Blaue Haie, Rote Füchse,
   Grüne Krokodile, Gelbe Löwen. Kinder per Tipp verschiebbar (ungleiche Größen erlaubt),
   Trainer je Gruppe tauschbar, Namen änderbar. Persistenz je Termin im Gerät; die
   Gruppen fließen in die Hauptteil-Stationen UND in den Trainingsstart (jeder Trainer
   sieht seine Gruppe mit Kindernamen; Einzeltrainings-Kinder werden im betroffenen
   Fenster automatisch herausgenommen).
═══════════════════════════════════ */
const TG_NAMEN=[
  {emo:"🔵",name:"Blaue Haie",farbe:"#2563eb"},
  {emo:"🔴",name:"Rote Füchse",farbe:"#dc2626"},
  {emo:"🟢",name:"Grüne Krokodile",farbe:"#16a34a"},
  {emo:"🟡",name:"Gelbe Löwen",farbe:"#eab308"},
  {emo:"🟣",name:"Lila Drachen",farbe:"#7c3aed"}
];
/* Server-Speicherung (PO): Tabelle trainingsgruppen je Termin-Datum – alle Trainer-
   Geräte sehen dieselbe Aufteilung schon VOR dem Trainingsstart. Der Cache hält die
   Render-Pfade synchron; localStorage bleibt Offline-Fallback (write-through). */
let _tgCache={datum:null,tg:null,geladen:false};
let _tgSaveTimer=null;
function _tgDatum(){return document.getElementById("tp-date")?.value||new Date().toISOString().slice(0,10);}
function _tgKey(){return "adler_tg_"+_tgDatum();}
function tgFor(){return (_tgCache.datum===_tgDatum())?_tgCache.tg:null;}
async function tgSync(){
  const d=_tgDatum();
  if(_tgCache.datum===d&&_tgCache.geladen)return;
  _tgCache={datum:d,tg:_tgCache.datum===d?_tgCache.tg:null,geladen:true};
  let tg=null, offline=false;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsgruppen?datum=eq.${encodeURIComponent(d)}&select=gruppen,aus_anwesenheit`,{headers:sbAuthHeaders()});
    if(r.ok){const row=((await r.json())||[])[0];if(row)tg={gruppen:_tgMitNamen(row.gruppen),ausAnwesenheit:row.aus_anwesenheit};}
    else offline=true;
  }catch(e){offline=true;}
  if(!tg&&offline){try{tg=JSON.parse(localStorage.getItem("adler_tg_"+d)||"null");}catch(e){}}
  if(_tgDatum()!==d)return; // Termin wurde inzwischen gewechselt
  const vorher=JSON.stringify(_tgCache.tg);
  _tgCache={datum:d,tg,geladen:true};
  if(JSON.stringify(tg)!==vorher&&typeof tpRenderTimeline==="function")tpRenderTimeline();
}
// Gruppen: in der Datenbank kader.id, im Speicher Namen (siehe kidListToIds in views.js)
function _tgMitIds(gruppen){ return (gruppen||[]).map(g=>({...g,kinder:kidListToIds(g.kinder||[])})); }
function _tgMitNamen(gruppen){ return (gruppen||[]).map(g=>({...g,kinder:kidListFromIds(g.kinder||[])})); }
function tgSave(tg){
  const d=_tgDatum();
  _tgCache={datum:d,tg,geladen:true};
  try{localStorage.setItem("adler_tg_"+d,JSON.stringify(tg));}catch(e){}
  if(_tgSaveTimer)clearTimeout(_tgSaveTimer);
  _tgSaveTimer=setTimeout(async()=>{
    try{
      const r=await fetch(`${SB_URL}/rest/v1/trainingsgruppen?on_conflict=datum`,{method:"POST",
        headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
        body:JSON.stringify({datum:d,gruppen:_tgMitIds(tg.gruppen),aus_anwesenheit:!!tg.ausAnwesenheit,updated_at:new Date().toISOString()})});
      if(!r.ok&&r.status!==201)toast("Gruppen nur lokal gespeichert (kein Trainer-Recht/Netz)","err");
    }catch(e){toast("Kein Netz – Gruppen nur auf diesem Gerät gespeichert","err");}
  },800);
}
function tgKachelHtml(){
  const tg=tgFor();
  const sub=tg?tg.gruppen.map(g=>`${g.emo} ${g.name} (${g.kinder.length})`).join(" · ")
    :"Alle anwesenden Kinder in so viele Gruppen wie Trainer – antippen";
  return `<button onclick="tgOpen()" style="width:100%;min-height:76px;margin:4px 0 10px;border:1px solid var(--rand-bedien);border-top:3px solid #16a34a;border-radius:14px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px 8px;box-sizing:border-box">
    <span style="font-size:15px;font-weight:900">👥 Trainingsgruppen${tg?"":" bilden"}</span>
    <span style="font-size:11.5px;color:var(--text2);text-align:center">${sub}</span>
  </button>`;
}
/* anzahl (optional): gewuenschte Gruppenzahl. Ohne Angabe wie bisher = Zahl der
   angehakten Trainer. Die Zahl ist NICHT mehr an die Trainerzahl gebunden – je nach
   Uebung braucht man mehr oder weniger Gruppen als Trainer da sind. Obergrenze ist die
   Zahl der Gruppennamen (TG_NAMEN), damit Name und Leibchenfarbe eindeutig bleiben. */
function tgBilden(anzahl){
  const trainers=tpGetCheckedTrainers();
  const n=Math.min(TG_NAMEN.length,Math.max(1,anzahl||trainers.length||1));
  const pool=_kgPool(); // Anwesenheit heute, sonst Kader; pausierte Kinder bleiben draußen
  const st=x=>(typeof teamStaerke==="function")?Math.max(0,teamStaerke(x)):0;
  const namen=pool.namen.slice().sort((a,b)=>st(b)-st(a));
  const gruppen=Array.from({length:n},(_,i)=>({...TG_NAMEN[i%TG_NAMEN.length],trainer:trainers[i]||"",kinder:[]}));
  // Schlangenlinie: ausgewogene Startaufteilung, danach frei verschiebbar
  namen.forEach((k,i)=>{const r=Math.floor(i/n),pos=r%2===0?(i%n):(n-1-(i%n));gruppen[pos].kinder.push(k);});
  const tg={gruppen,ausAnwesenheit:pool.ausAnwesenheit};
  tgSave(tg);
  return tg;
}
async function tgOpen(){
  await tgSync(); // erst den Server-Stand holen – sonst überschreibt ein Gerät die Kollegen
  let tg=tgFor()||tgBilden();
  document.getElementById("tg-modal")?.remove();
  const m=document.createElement("div");m.id="tg-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Trainingsgruppen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("tg-modal","👥","Trainingsgruppen","Kind antippen = nächste Gruppe · Größen dürfen ungleich sein","#16a34a")}
    <div id="tg-quelle" style="font-size:11.5px;color:var(--text2);margin-bottom:8px"></div>
    <div id="tg-anzahl" role="group" aria-label="Anzahl der Gruppen" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px"></div>
    <div id="tg-liste"></div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-sm" style="flex:1" onclick="tgNeuMischen()">🎲 Neu mischen</button>
      <button class="btn btn-p" style="flex:1" onclick="document.getElementById('tg-modal').remove();tpRenderTimeline()">✅ Fertig</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  tgRender();
}
function tgRender(){
  const tg=tgFor(); const el=document.getElementById("tg-liste"); if(!el||!tg)return;
  const q=document.getElementById("tg-quelle");
  if(q)q.innerHTML=tg.ausAnwesenheit?"Quelle: Anwesenheit heute":"⚠️ Heute ist noch keine Anwesenheit erfasst – Basis ist der ganze Kader.";
  /* Gruppenzahl frei waehlbar (PO): je nach Uebung braucht man mehr Gruppen als Trainer
     da sind. „1" bleibt drin – das ist der bisherige Fall „alle zusammen" und darf nicht
     verloren gehen. Filterleiste, deshalb sind 40px hier zulaessig (Konvention: 36px nur
     in Listenzeilen/Filterleisten); aria-pressed macht die Wahl ohne Farbe erkennbar. */
  const az=document.getElementById("tg-anzahl");
  if(az){
    const jetzt=tg.gruppen.length;
    const kinder=tg.gruppen.reduce((s,g)=>s+g.kinder.length,0);
    az.innerHTML=`<span style="font-size:11.5px;color:var(--text2);margin-right:2px">Gruppen:</span>`
      +TG_NAMEN.map((_,i)=>{const n=i+1;const an=n===jetzt;
        return `<button onclick="tgAnzahlSetzen(${n})" aria-pressed="${an?"true":"false"}" style="min-width:44px;min-height:44px;padding:0 12px;border:1px solid var(--rand-bedien);${an?"border-color:transparent;background:var(--fam-training);color:#fff;":"background:var(--surface2);color:var(--text);"}border-radius:16px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">${an?"✓ ":""}${n}</button>`;
      }).join("")
      +`<span style="font-size:11px;color:var(--text3);margin-left:2px">${kinder} Kinder</span>`;
  }
  el.innerHTML=tg.gruppen.map((g,gi)=>`<div style="border:var(--border-s);border-left:4px solid ${g.farbe};border-radius:12px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <button onclick="tgRename(${gi})" title="Gruppe umbenennen" style="border:none;background:transparent;font-family:inherit;font-size:14px;font-weight:900;color:${g.farbe};cursor:pointer;min-height:44px;padding:0;margin:-8px 0">${g.emo} ${esc(g.name)} ✏️</button>
        <span style="font-size:11px;color:var(--text3)">${g.kinder.length} Kinder</span>
        <button onclick="tgTrainerTipp(${gi})" title="Trainer wechseln" style="margin-left:auto;min-height:44px;padding:4px 12px;border:1px solid var(--rand-bedien);border-radius:16px;background:var(--surface2);color:var(--text);font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">🧢 ${esc(g.trainer||"– Trainer –")}</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        ${g.kinder.map(k=>`<button onclick="tgKindTipp(${gi},'${k.replace(/'/g,"\\'")}')" title="Antippen = nächste Gruppe" style="min-height:44px;padding:6px 12px;border:1px solid var(--rand-bedien);border-radius:18px;font-family:inherit;font-size:12.5px;cursor:pointer;background:var(--surface2);color:var(--text)">${esc(k)}</button>`).join("")||'<span style="font-size:11px;color:var(--text3)">leer</span>'}
      </div>
    </div>`).join("");
}
function tgKindTipp(gi,kind){
  const tg=tgFor(); if(!tg)return;
  tg.gruppen[gi].kinder=tg.gruppen[gi].kinder.filter(k=>k!==kind);
  tg.gruppen[(gi+1)%tg.gruppen.length].kinder.push(kind);
  tgSave(tg);tgRender();
}
function tgTrainerTipp(gi){
  const tg=tgFor(); if(!tg)return;
  const trainers=tpGetCheckedTrainers(); if(!trainers.length)return;
  const cur=trainers.indexOf(tg.gruppen[gi].trainer);
  tg.gruppen[gi].trainer=trainers[(cur+1)%trainers.length];
  tgSave(tg);tgRender();
}
function tgRename(gi){
  const tg=tgFor(); if(!tg)return;
  const name=(prompt("Neuer Gruppenname:",tg.gruppen[gi].name)||"").trim(); if(!name)return;
  tg.gruppen[gi].name=name;
  tgSave(tg);tgRender();
}
// Neu mischen behaelt die eingestellte Gruppenzahl – sonst springt sie beim Wuerfeln
// auf die Trainerzahl zurueck und die eben getroffene Wahl waere weg.
function tgNeuMischen(){const tg=tgFor();tgBilden(tg&&tg.gruppen?tg.gruppen.length:undefined);tgRender();}
// Gruppenzahl umstellen: bildet sofort neu (die Kinder sind danach frei verschiebbar).
function tgAnzahlSetzen(n){tgBilden(n);tgRender();}
// ℹ️ direkt aus dem Übungs-Picker: Detail über dem Picker anzeigen (dessen z-index ist höher)
function tpPickerInfo(idx){
  tpShowExercise(idx);
  const m=document.body.lastElementChild;
  if(m&&m.id!=="tp-pick-modal")m.style.zIndex="10006";
}

/* Deep-Link-Router-Helfer: die Render-Funktionen der Sonderrouten (Ticker, Kind-Link,
   Vertretung, Turnier) leben in Welle-2-Dateien. Im Eltern-Ordner laedt bei Sonderrouten
   alles in EINER Welle, ein Direktlink auf trainer/?handover traefe sie aber leer an.
   Darum kurz warten statt hart aufrufen - und nach 4 s ehrlich Bescheid sagen. */
function routeRender(name,arg){
  if(typeof nutzungLog==="function")nutzungLog("route",name);
  if(typeof window[name]==="function"){window[name](arg);return;}
  let n=0;
  const iv=setInterval(()=>{
    if(typeof window[name]==="function"){clearInterval(iv);window[name](arg);return;}
    if(++n>40){
      clearInterval(iv);
      document.body.innerHTML='<div style="font-family:system-ui;text-align:center;padding:48px;color:#334155">'+
        '<div style="font-size:34px;margin-bottom:10px">📡</div>'+
        '<div style="font-weight:700;margin-bottom:6px">Diese Ansicht konnte nicht geladen werden</div>'+
        '<div style="font-size:13px;color:#64748b;margin-bottom:16px">Die Verbindung war zu langsam oder ist abgebrochen.</div>'+
        '<button onclick="location.reload()" style="min-height:44px;padding:10px 20px;border:0;border-radius:10px;background:#1e3a8a;color:#fff;font-size:15px;font-weight:600">Neu laden</button></div>';
    }
  },100);
}
