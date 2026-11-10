/* ═══════════════════════════════════
   BEITRAGSLISTE FÜR FEIERN (v828) – Eltern tragen ein, was sie mitbringen.
   Feste Plätze zum Antippen (Salat mit Sorte), dazu eigene Beiträge im Abschnitt „Zusätzlich“.
   Tabelle feier_eintraege (supabase/migrations/20261119_v828_feier_eintraege.sql):
   Lesen Eltern und Trainer, Eintragen nur unter der eigenen Kennung, Ändern nur die eigene
   Salatsorte, Löschen die eigenen Zeilen – der Trainer jede. Doppelbelegung verhindert die
   Datenbank (Unique-Constraint); die zweite Familie sieht „Dieser Platz ist gerade vergeben“.
   Die Plätze stehen unten in FEIER_KONFIG: nächste Feier = ein Eintrag mehr, kein Umbau.
═══════════════════════════════════ */
const FEIER_KONFIG=[
  { key:"weihnachten-2026",            // feier_key in der Datenbank
    datum:"2026-12-07", titel:"Weihnachtsfeier",   // an welchem Termin (Event) die Liste erscheint
    freitextMax:80, freitextJeFamilie:3,
    plaetze:[
      { key:"salat",         label:"Salat",                         emoji:"🥗", anzahl:2, optionen:["Nudelsalat","Kartoffelsalat","Überraschung"] },
      { key:"frikadellen",   label:"Frikadellen",                   emoji:"🍖", anzahl:1 },
      { key:"baguette",      label:"Baguette mit Kräuterbutter",    emoji:"🥖", anzahl:1 },
      { key:"laugenstangen", label:"Laugenstangen/Brezeln mit Butter", emoji:"🥨", anzahl:1 },
      { key:"salzstangen",   label:"Salzstangen",                   emoji:"🧂", anzahl:1 },
      { key:"rohkost",       label:"Rohkostplatte",                 emoji:"🥕", anzahl:1 },
      { key:"obst",          label:"Obstplatte",                    emoji:"🍎", anzahl:1 },
      { key:"kuchen",        label:"Kuchen",                        emoji:"🍰", anzahl:1 },
      { key:"muffins",       label:"Muffins",                       emoji:"🧁", anzahl:1 },
      { key:"plaetzchen",    label:"Plätzchen",                     emoji:"🍪", anzahl:1 },
      { key:"haribo",        label:"Haribo",                        emoji:"🍬", anzahl:1 },
      { key:"apfelschorle",  label:"Apfelschorle",                  emoji:"🧃", anzahl:1 },
      { key:"wasser",        label:"Wasser",                        emoji:"💧", anzahl:1 }
    ] }
];
const FEIER_NAME_SCHLUESSEL="adler_feier_name";

function feierFuerTermin(t){
  if(!t||t.typ!=="event")return null;
  const titel=String(t.titel||"").trim().toLowerCase();
  return FEIER_KONFIG.find(f=>f.datum===t.datum&&f.titel.toLowerCase()===titel)||null;
}
function feierPlatzListe(f){            // alle festen Plätze als flache Liste: Salat 1, Salat 2, Frikadellen …
  const l=[]; f.plaetze.forEach(p=>{ for(let n=1;n<=p.anzahl;n++)l.push({platz:p,nr:n}); });
  return l;
}
function feierIstTrainer(){ return /\/trainer\//.test(location.pathname); }
function feierEigeneId(){ try{ return (typeof _sbUid==="function"?_sbUid():sbUserId())||""; }catch(e){ return ""; } }
function feierNameMerken(n){ try{ localStorage.setItem(FEIER_NAME_SCHLUESSEL,n); }catch(e){} }
function feierNameErinnern(){ try{ return localStorage.getItem(FEIER_NAME_SCHLUESSEL)||""; }catch(e){ return ""; } }

async function feierHolen(key){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/feier_eintraege?feier_key=eq.${encodeURIComponent(key)}&select=id,slot_key,slot_nr,auswahl,freitext,anzeige_name,erstellt_von&order=id.asc`,{headers:sbAuthHeaders()});
    if(!r.ok)return null;
    return await r.json();
  }catch(e){ return null; }
}

/* Block in einen vorhandenen Kasten zeichnen (Termin-Fenster der Eltern, Fenster der Trainer). */
async function feierLoad(boxId,t){
  const box=document.getElementById(boxId); if(!box)return;
  box._feierTermin=t;   // damit feierNeuLaden ohne Argumente neu zeichnen kann
  const f=feierFuerTermin(t); if(!f){ box.innerHTML=""; return; }
  box.dataset.feier=f.key; box.dataset.feierBox="1";
  const liste=await feierHolen(f.key);
  if(!document.getElementById(boxId))return;
  if(liste===null){ box.innerHTML=""; return; }   // offline oder Tabelle noch nicht angelegt: Termin bleibt ein normales Event
  const ich=feierEigeneId(), trainer=feierIstTrainer();
  const mein=x=>!!ich&&x.erstellt_von===ich;
  const kann=x=>mein(x)||trainer;
  const esc_=s=>esc(String(s==null?"":s));
  const chip=(text,gut)=>`<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:var(--s-klein);font-weight:700;border:1.5px solid ${gut?"var(--green)":"var(--rand-bedien)"};background:${gut?"var(--green-bg)":"var(--surface)"};color:${gut?"var(--green)":"var(--text2)"}">${text}</span>`;
  const knopf=(label,js,rot)=>`<button type="button" onclick="${js}" style="min-height:48px;padding:8px 14px;border-radius:12px;border:1.5px solid ${rot?"var(--red)":"var(--rand-bedien)"};background:var(--surface);color:${rot?"var(--red)":"var(--text)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${label}</button>`;
  const zeilen=feierPlatzListe(f).map(({platz,nr})=>{
    const name=platz.anzahl>1?`${platz.label} ${nr}`:platz.label;
    const e=liste.find(x=>x.slot_key===platz.key&&Number(x.slot_nr)===nr);
    if(!e){
      return `<button type="button" class="feier-zeile feier-frei" data-slot="${esc_(platz.key)}-${nr}" onclick="feierPlatzWaehlen('${f.key}','${platz.key}',${nr})" aria-label="${esc_(name)} – frei, antippen zum Eintragen" style="display:flex;align-items:center;gap:8px;width:100%;min-height:48px;padding:8px 12px;margin-top:8px;border-radius:12px;border:1.5px solid var(--rand-bedien);background:var(--surface);color:var(--text);font-family:inherit;font-size:var(--s-text);text-align:left;cursor:pointer">
        <span style="flex:1;min-width:0;overflow-wrap:anywhere"><span aria-hidden="true">${platz.emoji}</span> <b>${esc_(name)}</b></span>${chip("frei",true)}</button>`;
    }
    const sorte=e.auswahl?` · ${esc_(e.auswahl)}`:"";
    const aktionen=[];
    if(mein(e)&&platz.optionen)aktionen.push(knopf("Ändern",`feierSorteAendern('${f.key}',${Number(e.id)})`));
    if(kann(e))aktionen.push(knopf("Entfernen",`feierEntfernen(${Number(e.id)},'${f.key}')`,true));
    return `<div class="feier-zeile feier-belegt" data-slot="${esc_(platz.key)}-${nr}" style="margin-top:8px;padding:8px 12px;border-radius:12px;border:1.5px solid var(--border-s,#cbd5e1);background:var(--surface2,var(--surface))">
      <div style="display:flex;align-items:center;gap:8px;min-height:32px">
        <span style="flex:1;min-width:0;overflow-wrap:anywhere;font-size:var(--s-text)"><span aria-hidden="true">${platz.emoji}</span> <b>${esc_(name)}${sorte}</b></span>${chip("vergeben",false)}</div>
      <div style="font-size:var(--s-text);color:var(--text2);overflow-wrap:anywhere">${esc_(e.anzeige_name)}${mein(e)?" · das bist du":""}</div>
      ${aktionen.length?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${aktionen.join("")}</div>`:""}
    </div>`;
  }).join("");
  const frei=liste.filter(x=>x.freitext);
  const meineFrei=frei.filter(mein).length;
  const zusatz=frei.map(x=>`<div class="feier-zeile feier-zusatz" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;padding:8px 12px;border-radius:12px;border:1.5px solid var(--border-s,#cbd5e1);background:var(--surface2,var(--surface))">
      <span style="flex:1;min-width:0;overflow-wrap:anywhere;font-size:var(--s-text)">🎁 <b>${esc_(x.freitext)}</b><br><span style="color:var(--text2)">${esc_(x.anzeige_name)}${mein(x)?" · das bist du":""}</span></span>
      ${kann(x)?knopf("Entfernen",`feierEntfernen(${Number(x.id)},'${f.key}')`,true):""}</div>`).join("");
  const voll=meineFrei>=f.freitextJeFamilie;
  const belegt=feierPlatzListe(f).filter(({platz,nr})=>liste.some(x=>x.slot_key===platz.key&&Number(x.slot_nr)===nr)).length;
  box.innerHTML=`<div class="feier-block" style="border-top:1px solid var(--border-s,#e2e8f0);margin-top:12px;padding-top:12px">
    <div style="font-weight:800;font-size:var(--s-karte)">🎄 Wer bringt was mit?</div>
    <div style="font-size:var(--s-text);color:var(--text2);line-height:1.5;margin:2px 0 4px">Tippt einen freien Platz an und tragt euch ein. ${belegt} von ${feierPlatzListe(f).length} Plätzen sind vergeben.</div>
    ${zeilen}
    <div style="font-weight:800;font-size:var(--s-karte);margin-top:16px">Zusätzlich</div>
    ${zusatz||`<div style="font-size:var(--s-text);color:var(--text2);margin-top:4px">Noch nichts Eigenes eingetragen.</div>`}
    <button type="button" class="feier-frei-neu" ${voll?"disabled":""} onclick="feierFreitextWaehlen('${f.key}')" style="width:100%;min-height:48px;margin-top:12px;padding:8px 12px;border-radius:12px;border:1.5px solid ${voll?"var(--border-s,#cbd5e1)":"var(--blue)"};background:var(--surface);color:${voll?"var(--text2)":"var(--blue)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:${voll?"default":"pointer"}">${voll?`Du hast ${f.freitextJeFamilie} eigene Beiträge eingetragen`:"Etwas anderes mitbringen"}</button>
  </div>`;
  if(typeof elternDarkActive==="function"&&elternDarkActive()&&typeof elternThemeSweep==="function")elternThemeSweep(box);
}
function feierNeuLaden(){
  document.querySelectorAll("[data-feier-box]").forEach(b=>{ if(b.id&&b._feierTermin)feierLoad(b.id,b._feierTermin); });
}
/* ── Dialog: genau eine Hauptaktion („Eintragen“), alles andere 48 px ── */
function feierDialog(opt){
  document.getElementById("feier-dialog")?.remove();
  const f=FEIER_KONFIG.find(x=>x.key===opt.key); if(!f)return;
  const m=document.createElement("div");
  m.id="feier-dialog"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","feier-dlg-titel");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:"+(typeof zOben==="function"?zOben(10020):10020)+";display:flex;align-items:flex-end;justify-content:center;padding:0";
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  const feld=`min-height:48px;width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid var(--rand-bedien);border-radius:12px;font-family:inherit;font-size:var(--s-karte);background:var(--surface);color:var(--text)`;
  const sorten=opt.optionen?`<label for="feier-sorte" style="display:block;font-size:var(--s-text);font-weight:700;margin-top:16px">Welcher Salat?</label>
      <select id="feier-sorte" style="${feld};margin-top:4px">${opt.optionen.map(o=>`<option value="${esc(o)}"${o===opt.auswahl?" selected":""}>${esc(o)}</option>`).join("")}</select>`:"";
  const text=opt.modus==="frei"?`<label for="feier-text" style="display:block;font-size:var(--s-text);font-weight:700;margin-top:16px">Was bringst du mit?</label>
      <input id="feier-text" maxlength="${f.freitextMax}" autocomplete="off" placeholder="z. B. Pavillon, Würstchen" style="${feld};margin-top:4px" onkeydown="if(event.key==='Enter')feierSenden()">`:"";
  const nameFeld=opt.modus==="sorte"?"":`<label for="feier-name" style="display:block;font-size:var(--s-text);font-weight:700;margin-top:16px">Euer Name in der Liste</label>
      <input id="feier-name" maxlength="40" autocomplete="off" value="${esc(feierNameErinnern())}" placeholder="z. B. Familie M. oder Kürzel" style="${feld};margin-top:4px" onkeydown="if(event.key==='Enter')feierSenden()">
      <div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Bitte keine Vor- und Nachnamen von Kindern.</div>`;
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);width:100%;max-width:460px;border-radius:16px 16px 0 0;padding:16px 16px 24px;box-shadow:0 -8px 32px rgba(0,0,0,.35);max-height:92vh;overflow-y:auto;box-sizing:border-box">
    <div id="feier-dlg-titel" style="font-weight:800;font-size:var(--s-teil)">${opt.emoji||"🎄"} ${esc(opt.titel)}</div>
    ${sorten}${text}${nameFeld}
    <button type="button" id="feier-ok" onclick="feierSenden()" style="width:100%;min-height:56px;margin-top:24px;border:none;border-radius:14px;background:var(--blue);color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">${opt.modus==="sorte"?"Speichern":"Eintragen"}</button>
    <button type="button" onclick="document.getElementById('feier-dialog')?.remove()" style="width:100%;min-height:48px;margin-top:8px;border:1.5px solid var(--rand-bedien);border-radius:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Abbrechen</button>
  </div>`;
  document.body.appendChild(m);
  window._feierDlg=opt;
  const ziel=m.querySelector("#feier-text")||m.querySelector("#feier-sorte")||m.querySelector("#feier-name");
  if(ziel)try{ ziel.focus(); }catch(e){}
}
function feierPlatzWaehlen(key,slot,nr){
  const f=FEIER_KONFIG.find(x=>x.key===key); if(!f)return;
  const p=f.plaetze.find(x=>x.key===slot); if(!p)return;
  feierDialog({modus:"platz",key,slot,nr,optionen:p.optionen||null,emoji:p.emoji,
    titel:(p.anzahl>1?`${p.label} ${nr}`:p.label)+" eintragen"});
}
function feierFreitextWaehlen(key){
  const f=FEIER_KONFIG.find(x=>x.key===key); if(!f)return;
  feierDialog({modus:"frei",key,emoji:"🎁",titel:"Etwas anderes mitbringen"});
}
async function feierSorteAendern(key,id){
  const liste=(await feierHolen(key))||[]; const e=liste.find(x=>Number(x.id)===Number(id)); if(!e)return;
  const f=FEIER_KONFIG.find(x=>x.key===key); const p=f&&f.plaetze.find(x=>x.key===e.slot_key); if(!p||!p.optionen)return;
  feierDialog({modus:"sorte",key,id:Number(id),optionen:p.optionen,auswahl:e.auswahl,emoji:p.emoji,titel:"Salatsorte ändern"});
}

/* ── Senden ── */
async function feierSenden(){
  if(feierSenden._busy)return;
  const o=window._feierDlg; if(!o)return;
  const f=FEIER_KONFIG.find(x=>x.key===o.key); if(!f)return;
  const sorte=(document.getElementById("feier-sorte")||{}).value||null;
  const nameFeld=document.getElementById("feier-name");
  const name=nameFeld?String(nameFeld.value||"").trim().slice(0,40):"";
  let r;
  try{
    if(o.modus==="sorte"){
      feierSenden._busy=true;
      r=await fetch(`${SB_URL}/rest/v1/feier_eintraege?id=eq.${Number(o.id)}`,{method:"PATCH",headers:{...sbAuthHeaders(),"Prefer":"return=minimal"},body:JSON.stringify({auswahl:sorte})});
    }else{
      if(!name){ toast("Bitte einen Namen für die Liste eintragen","err"); if(nameFeld)nameFeld.focus(); return; }
      let body;
      if(o.modus==="frei"){
        const tf=document.getElementById("feier-text"); const text=String((tf&&tf.value)||"").trim();
        if(!text){ toast("Bitte eintragen, was du mitbringst","err"); if(tf)tf.focus(); return; }
        if(text.length>f.freitextMax){ toast(`Bitte höchstens ${f.freitextMax} Zeichen`,"err"); return; }
        body={feier_key:o.key,freitext:text,anzeige_name:name};
      }else{
        body={feier_key:o.key,slot_key:o.slot,slot_nr:o.nr,anzeige_name:name};
        if(o.optionen)body.auswahl=sorte;
      }
      feierSenden._busy=true;
      r=await fetch(`${SB_URL}/rest/v1/feier_eintraege`,{method:"POST",headers:{...sbAuthHeaders(),"Prefer":"return=minimal"},body:JSON.stringify(body)});
    }
  }catch(e){ feierSenden._busy=false; toast("Offline – bitte später nochmal","err"); return; }
  feierSenden._busy=false;
  if(typeof sbCheck401==="function"&&sbCheck401(r))return;
  if(!r.ok){ await feierFehler(r); document.getElementById("feier-dialog")?.remove(); feierNeuLaden(); return; }
  if(name)feierNameMerken(name);
  document.getElementById("feier-dialog")?.remove();
  toast(o.modus==="sorte"?"Gespeichert ✓":"Eingetragen – danke! 🎄");
  feierNeuLaden(); feierObenLoad();
}
async function feierFehler(r){
  let t=""; try{ t=await r.text(); }catch(e){}
  if(/feier_freitext_limit/.test(t))toast("Du hast schon drei eigene Beiträge eingetragen","err");
  else if(r.status===409||/23505|duplicate key/i.test(t))toast("Dieser Platz ist gerade vergeben","err");
  else if(r.status===403||r.status===401)toast("Dafür fehlt die Berechtigung – bitte neu anmelden","err");
  else toast("Das hat nicht geklappt – bitte nochmal versuchen","err");
}
async function feierEntfernen(id,key){
  if(typeof frageJaNein==="function"&&!await frageJaNein({emoji:"🎄",titel:"Eintrag entfernen?",text:"Der Platz wird wieder frei.",ja:"Entfernen",ton:"rot"}))return;
  let r;
  try{ r=await fetch(`${SB_URL}/rest/v1/feier_eintraege?id=eq.${Number(id)}`,{method:"DELETE",headers:sbAuthHeaders()}); }
  catch(e){ toast("Offline – bitte später nochmal","err"); return; }
  if(typeof sbCheck401==="function"&&sbCheck401(r))return;
  if(!r.ok){ toast("Nicht entfernt – bitte nochmal versuchen","err"); return; }
  feierNeuLaden(); feierObenLoad();
}

/* Trainer: gleiche Liste als Fenster, mit Löschrecht für jeden Eintrag. */
function feierTrainerOeffnen(t){
  if(typeof t!=="object")t=(typeof TM_TERMINE!=="undefined"&&(TM_TERMINE||[]).find(x=>Number(x.id)===Number(t)))||null;
  if(!t){ toast("Termin nicht gefunden","err"); return; }
  if(!feierFuerTermin(t)){ toast("Für diesen Termin gibt es keine Beitragsliste","err"); return; }
  document.getElementById("feier-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="feier-modal"; modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-label","Beitragsliste");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;flex-direction:column;padding:14px;overflow-y:auto;z-index:"+(typeof zOben==="function"?zOben(10010):10010);
  modal.onclick=e=>{ if(e.target===modal)modal.remove(); };
  modal.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    ${typeof mdlHead==="function"?mdlHead("feier-modal","🎄","Beitragsliste",esc(t.titel||"Feier"),"#15803d"):""}
    <div id="feier-trainer-box"></div>
    <button type="button" onclick="document.getElementById('feier-modal')?.remove()" style="width:100%;min-height:48px;margin-top:12px;border:1.5px solid var(--rand-bedien);border-radius:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">Schließen</button>
  </div>`;
  document.body.appendChild(modal);
  feierLoad("feier-trainer-box",t);
}

/* v830 · Karte ganz oben im Dashboard (Charles 10.11.2026): Die Weihnachtsfeier steht oben, solange
   a) noch nicht zu- oder abgesagt wurde (für mindestens eines der Kinder fehlt die Antwort), oder
   b) zugesagt wurde, aber die Familie noch nichts in die Beitragsliste eingetragen hat.
   Abgesagt, abgesagt-von-der-Mannschaft (fällt aus), vorbei oder eingetragen: keine Karte.
   Genau eine Hauptaktion; sie öffnet das Termin-Fenster (dort wird geantwortet bzw. eingetragen). */
async function feierObenLoad(kids){
  const slot=document.getElementById("feier-slot"); if(!slot)return;
  kids=kids||window._elternKids||[];
  const leer=()=>{ if(document.getElementById("feier-slot"))document.getElementById("feier-slot").innerHTML=""; };
  const heute=isoLokal();
  const f=FEIER_KONFIG.find(x=>x.datum>=heute);
  if(!f||!kids.length||!_feierUid()){ leer(); return; }
  let t=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?typ=eq.event&datum=eq.${f.datum}&titel=eq.${encodeURIComponent(f.titel)}&select=*&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)t=(await r.json())[0]||null;
  }catch(e){}
  /* Nur der Termin der Konfiguration zählt: gleicher Tag, gleicher Titel, Event – nie ein anderer, der zufällig zurückkommt. */
  if(!t||t.typ!=="event"||t.datum!==f.datum||String(t.titel||"").trim().toLowerCase()!==f.titel.toLowerCase()||(typeof terminFaelltAus==="function"&&terminFaelltAus(t))){ leer(); return; }
  const ids=kids.map(k=>k.spieler_id).filter(x=>x!=null);
  let rsvp={}, eigene=0, antwortGeladen=false;
  try{
    const [a,b]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${Number(t.id)}&spieler_id=in.(${ids.join(",")})&select=spieler_id,status`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/feier_eintraege?feier_key=eq.${encodeURIComponent(f.key)}&erstellt_von=eq.${_feierUid()}&select=id&limit=1`,{headers:sbAuthHeaders()})]);
    if(a.ok){ (await a.json()).forEach(x=>rsvp[x.spieler_id]=x.status); antwortGeladen=true; }
    if(b.ok)eigene=(await b.json()).length;
  }catch(e){}
  if(!antwortGeladen||!document.getElementById("feier-slot")){ leer(); return; }   // ohne Antwortstand lieber keine Karte als eine falsche
  const offen=ids.some(id=>!rsvp[id]);
  const zu=ids.some(id=>rsvp[id]==="zugesagt");
  let modus=null;
  if(offen)modus="antwort";
  else if(zu&&!eigene)modus="eintragen";
  if(!modus){ leer(); return; }
  const d=new Date(t.datum+"T00:00:00");
  const wann=d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})+(t.uhrzeit?" · "+String(t.uhrzeit).slice(0,5)+" Uhr":"");
  const text=modus==="antwort"?"Seid ihr dabei? Bitte kurz zu- oder absagen.":"Ihr seid dabei – was bringt ihr mit? Tragt euch in die Beitragsliste ein.";
  slot.innerHTML=`<div class="feier-karte" style="background:var(--surface);color:var(--text);border-radius:14px;padding:16px;margin-bottom:12px;border-left:4px solid var(--green);box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">${modus==="antwort"?"Antwort fehlt":"Beitragsliste"}</div>
    <div style="font-size:var(--s-teil);font-weight:800;margin-top:2px">🎄 ${esc(t.titel||f.titel)}</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-top:2px">${esc(wann)}${t.ort?" · "+esc(t.ort):""}</div>
    <div style="font-size:var(--s-text);margin-top:8px;line-height:1.5">${text}</div>
    <button type="button" class="feier-karte-knopf" onclick="feierObenOeffnen(${Number(t.id)},'${modus}')" style="width:100%;min-height:56px;margin-top:12px;border:none;border-radius:14px;background:var(--blue);color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">${modus==="antwort"?"Jetzt antworten":"Beitragsliste öffnen"}</button>
  </div>`;
}
function _feierUid(){ try{ return (typeof _sbUid==="function"?_sbUid():sbUserId())||""; }catch(e){ return ""; } }
async function feierObenOeffnen(terminId,modus){
  if(typeof terminDetailOpen!=="function")return;
  /* terminDetailOpen sucht den Termin in ELTERN_TERMINE; liegt er außerhalb der geladenen 15, ergänzen wir ihn. */
  if(typeof ELTERN_TERMINE!=="undefined"&&!(ELTERN_TERMINE||[]).some(x=>Number(x.id)===Number(terminId))){
    try{ const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${Number(terminId)}&select=*`,{headers:sbAuthHeaders()}); if(r.ok){ const t=(await r.json())[0]; if(t)ELTERN_TERMINE.push(t); } }catch(e){}
  }
  await terminDetailOpen(terminId);
  if(modus==="eintragen")setTimeout(()=>{ const b=document.getElementById("td-feier"); if(b&&b.scrollIntoView)b.scrollIntoView({block:"start"}); },700);
}

/* Muss die letzte Zeile der Datei bleiben: die MODUL_WACHE prüft diesen Namen. */
function feierModulDa(){ return true; }
