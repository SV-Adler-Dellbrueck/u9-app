/* ═══════════════════════════════════
   AUSSTATTUNG DER KINDER (Welle 2) – wer hat was von uns bekommen?

   Vorher stand hier ein Raster mit Trikot- und Schuhgröße, gefüttert aus den
   Fan-Fakten der Eltern. Das war die falsche Frage: Wer welche Größe trägt, weiß
   die Familie; was der Verein ausgegeben hat, weiß nur der Verein. Und die Größe
   lag dadurch an zwei Stellen gleichzeitig – mit v544 gibt es nur noch eine.

   Der Katalog ist bewusst eine Tabelle und keine feste Liste im Code: der zweite
   Präsentationsanzug kommt noch, Trinkflasche und Rucksack sind absehbar. Ein
   neuer Gegenstand ist eine Zeile, kein Eingriff in die App.

   Geschrieben wird sofort beim Antippen, nicht am Ende über einen Speichern-Knopf.
   Diese Liste wird im Stehen neben dem Kleidersack geführt; ein Fenster, das man
   erst unten zumachen muss, verliert genau dort seine Einträge.
═══════════════════════════════════ */
let AUS_ARTIKEL=[];          // Katalog
let AUS_AUSGABE={};          // "<spieler>_<artikel>" → Zeile
let _ausAktiv=null;          // gewählter Artikel
let _ausOffeneZuerst=false;  // Filter: nur wer noch nichts hat
const _ausTimer={};

function ausKey(s,a){ return s+"_"+a; }
function _ausArtikel(){ return AUS_ARTIKEL.find(a=>a.id===_ausAktiv)||null; }
function ausKinder(){ return (typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false&&k._id); }

async function ausstattungOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("aus-modal")?.remove();
  const m=document.createElement("div");m.id="aus-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Ausstattung der Kinder");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:500px;width:100%;margin:auto">
    ${mdlHead("aus-modal","👕","Ausstattung","Was hat welches Kind von uns bekommen?","#1e3a8a")}
    <div id="aus-body"><div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  await ausstattungLaden();
  ausstattungRender();
}

async function ausstattungLaden(){
  AUS_ARTIKEL=[]; AUS_AUSGABE={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ausstattung_artikel?aktiv=is.true&select=*&order=sort.asc,name.asc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(r.ok)AUS_ARTIKEL=(await r.json())||[];
  }catch(e){}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ausstattung_ausgabe?select=*`,{headers:sbAuthHeaders()});
    if(r.ok)((await r.json())||[]).forEach(z=>{AUS_AUSGABE[ausKey(z.spieler_id,z.artikel_id)]=z;});
  }catch(e){}
  if(!_ausAktiv||!AUS_ARTIKEL.some(a=>a.id===_ausAktiv))_ausAktiv=AUS_ARTIKEL.length?AUS_ARTIKEL[0].id:null;
}

/* Wie viele haben den gewählten Gegenstand, und wie viele Rückgaben stehen aus?
   Diese Zeile ist der eigentliche Zweck des Fensters – beim Anprobieren will man
   wissen, wer noch fehlt, nicht vierzehn Kästchen einzeln durchsehen. */
function ausStand(artikelId){
  const kinder=ausKinder();
  let hat=0, zurueck=0, ohneGroesse=0;
  const art=AUS_ARTIKEL.find(a=>a.id===artikelId);
  kinder.forEach(k=>{
    const z=AUS_AUSGABE[ausKey(k._id,artikelId)];
    if(z&&z.ausgegeben_am&&!z.zurueck_am){ hat++; if(art&&art.mit_groesse&&!String(z.groesse||"").trim())ohneGroesse++; }
    if(z&&z.zurueck_am)zurueck++;
  });
  return {gesamt:kinder.length, hat, zurueck, ohneGroesse};
}

function ausstattungRender(){
  const body=document.getElementById("aus-body"); if(!body)return;
  if(!AUS_ARTIKEL.length){
    body.innerHTML=`<div class="empty" style="padding:24px 8px"><i class="ti ti-shirt"></i>Noch kein Gegenstand angelegt.</div>
      <button class="btn btn-p" style="width:100%;min-height:56px;font-size:15px;font-weight:800" onclick="ausArtikelNeuOpen()">Gegenstand erfassen</button>`;
    return;
  }
  const art=_ausArtikel();
  const st=ausStand(art.id);
  const kinder=ausKinder().slice().sort((a,b)=>(a.nr==null?999:a.nr)-(b.nr==null?999:b.nr));
  const sichtbar=_ausOffeneZuerst?kinder.filter(k=>{const z=AUS_AUSGABE[ausKey(k._id,art.id)];return !(z&&z.ausgegeben_am&&!z.zurueck_am);}):kinder;
  const groessen=String(art.groessen||"").split(",").map(s=>s.trim()).filter(Boolean);

  body.innerHTML=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      ${AUS_ARTIKEL.map(a=>`<button class="ftag${a.id===art.id?" active":""}" aria-pressed="${a.id===art.id}" onclick="ausArtikelWahl(${a.id})">${esc(a.name)}</button>`).join("")}
      <button class="ftag" onclick="ausArtikelNeuOpen()" title="Weiteren Gegenstand anlegen">＋</button>
    </div>
    ${art.beschreibung?`<div style="font-size:11.5px;color:var(--text3);margin-bottom:8px">${esc(art.name)}: ${esc(art.beschreibung)}</div>`:""}
    <div style="font-size:12.5px;color:var(--text2);margin-bottom:4px">
      <b>${st.hat}</b> von ${st.gesamt} haben ${esc(art.name)}${st.ohneGroesse?` · <span style="color:var(--amber)">${st.ohneGroesse} ohne Größe</span>`:""}${st.zurueck?` · ${st.zurueck} zurückgegeben`:""}
    </div>
    <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);margin-bottom:10px;min-height:44px">
      <input type="checkbox" ${_ausOffeneZuerst?"checked":""} onchange="_ausOffeneZuerst=this.checked;ausstattungRender()"> nur wer noch nichts hat
    </label>
    ${groessen.length?`<datalist id="aus-groessen">${groessen.map(g=>`<option value="${esc(g)}">`).join("")}</datalist>`:""}
    <div>${sichtbar.length?sichtbar.map(k=>ausZeile(k,art)).join(""):'<div class="card-empty">Alle versorgt 🎉</div>'}</div>
    <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.5">Änderungen werden sofort gespeichert. „Zurück“ setzt das heutige Datum – das Kind taucht dann wieder als offen auf.</div>`;
}

function ausZeile(k,art){
  const z=AUS_AUSGABE[ausKey(k._id,art.id)]||{};
  const hat=!!z.ausgegeben_am&&!z.zurueck_am;
  const rand=z.zurueck_am?"var(--amber)":(hat?"var(--green)":"var(--rand-bedien)");
  const nr=k.nr!=null?`<span style="color:var(--text3);font-weight:700">#${k.nr}</span> `:"";
  return `<div style="border:1px solid ${rand};border-left-width:3px;border-radius:10px;padding:8px 10px;margin-bottom:6px;background:var(--surface)">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:150px;min-height:44px;cursor:pointer">
        <input type="checkbox" ${hat?"checked":""} onchange="ausToggle(${k._id},this)" style="width:20px;height:20px;flex:none">
        <span style="font-size:13.5px;font-weight:600">${nr}${esc(k.name)}</span>
      </label>
      ${art.mit_groesse?`<input class="aus-groesse" ${art.groessen?'list="aus-groessen"':""} value="${esc(z.groesse||"")}" placeholder="Größe"
        oninput="ausFeldTippen(${k._id},'groesse',this.value)" aria-label="Größe für ${esc(k.name)}"
        style="width:86px;min-height:44px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--text)">`:""}
      ${art.mit_nummer?`<input value="${esc(z.nummer||"")}" placeholder="Satz-Nr."
        oninput="ausFeldTippen(${k._id},'nummer',this.value)" aria-label="Satznummer für ${esc(k.name)}"
        style="width:78px;min-height:44px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface);color:var(--text)">`:""}
      ${hat?`<button class="btn btn-sm" style="min-height:36px" onclick="ausZurueck(${k._id})" title="Als zurückgegeben eintragen">↩︎ zurück</button>`:""}
    </div>
    ${z.zurueck_am?`<div style="font-size:11px;color:var(--amber);margin-top:4px">zurückgegeben am ${esc(_ausDatum(z.zurueck_am))}</div>`
      :(hat&&z.ausgegeben_am?`<div style="font-size:11px;color:var(--text3);margin-top:4px">ausgegeben am ${esc(_ausDatum(z.ausgegeben_am))}</div>`:"")}
  </div>`;
}

function _ausDatum(d){ try{return new Date(d+"T00:00:00").toLocaleDateString("de-DE");}catch(e){return d||"";} }

function ausArtikelWahl(id){ _ausAktiv=id; ausstattungRender(); }

/* Der Haken. Gesetzt heißt: heute ausgegeben und keine Rückgabe mehr vermerkt –
   sonst stünde ein Kind gleichzeitig als versorgt und als zurückgegeben da. */
async function ausToggle(spielerId,el){
  const art=_ausArtikel(); if(!art)return;
  const k=ausKey(spielerId,art.id);
  const z=AUS_AUSGABE[k]||{spieler_id:spielerId,artikel_id:art.id};
  if(el.checked){ z.ausgegeben_am=new Date().toISOString().slice(0,10); z.zurueck_am=null; }
  else { z.ausgegeben_am=null; z.zurueck_am=null; }
  AUS_AUSGABE[k]=z;
  await ausSchreiben(z);
  ausstattungRender();
}

async function ausZurueck(spielerId){
  const art=_ausArtikel(); if(!art)return;
  const k=ausKey(spielerId,art.id);
  const z=AUS_AUSGABE[k]; if(!z)return;
  z.zurueck_am=new Date().toISOString().slice(0,10);
  await ausSchreiben(z);
  ausstattungRender();
}

/* Größe und Satznummer werden getippt, nicht getappt: erst eine knappe Sekunde
   nach dem letzten Zeichen schreiben, sonst geht je Buchstabe eine Anfrage raus.
   Neu gerendert wird dabei NICHT – das Feld verlöre den Fokus mitten im Wort. */
function ausFeldTippen(spielerId,feld,wert){
  const art=_ausArtikel(); if(!art)return;
  const k=ausKey(spielerId,art.id);
  const z=AUS_AUSGABE[k]||{spieler_id:spielerId,artikel_id:art.id};
  z[feld]=wert.trim()||null;
  AUS_AUSGABE[k]=z;
  clearTimeout(_ausTimer[k+feld]);
  _ausTimer[k+feld]=setTimeout(()=>ausSchreiben(z),900);
}

/* Immer die ganze Zeile schreiben. Ein Upsert mit merge-duplicates setzt fehlende
   Spalten auf ihren Vorgabewert zurück – ein Haken würde sonst die eben getippte
   Größe löschen, ohne dass etwas Rotes erschiene. */
async function ausSchreiben(z){
  const body={spieler_id:z.spieler_id,artikel_id:z.artikel_id,
    ausgegeben_am:z.ausgegeben_am||null, groesse:z.groesse||null,
    nummer:z.nummer||null, zurueck_am:z.zurueck_am||null, notiz:z.notiz||null,
    updated_at:new Date().toISOString()};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ausstattung_ausgabe?on_conflict=spieler_id,artikel_id`,
      {method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte nicht speichern – bitte noch einmal antippen","err");return;}
    const neu=(await r.json())[0];
    if(neu)AUS_AUSGABE[ausKey(neu.spieler_id,neu.artikel_id)]=neu;
  }catch(e){ toast("Kein Netz – die Änderung ist nicht gespeichert","err"); }
}

// ── Katalog erweitern ───────────────────────────────────────────────────────
function ausArtikelNeuOpen(){
  document.getElementById("aus-neu")?.remove();
  const m=document.createElement("div");m.id="aus-neu";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Gegenstand erfassen");
  // zOben(): der Katalog geht AUS dem Ausstattungs-Fenster heraus auf – mit fester
  // Zahl läge er je nach Paarung dahinter (v405).
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:"+(typeof zOben==="function"?zOben(10001):10001)+";display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const feld="width:100%;min-height:48px;padding:10px;margin:4px 0 10px;border:1px solid var(--rand-bedien);border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px;background:var(--surface);color:var(--text)";
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:400px;width:100%;margin:auto">
    ${mdlHead("aus-neu","➕","Gegenstand erfassen","z. B. Trinkflasche oder Rucksack","#1e3a8a")}
    <label for="an-name" style="font-size:12px;color:var(--text2)">Name</label>
    <input id="an-name" placeholder="Trinkflasche" style="${feld}">
    <label for="an-besch" style="font-size:12px;color:var(--text2)">Was gehört dazu? (freiwillig)</label>
    <input id="an-besch" placeholder="Flasche mit Vereinslogo" style="${feld}">
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;min-height:44px"><input id="an-groesse" type="checkbox" checked> Es gibt Größen</label>
    <label for="an-liste" style="font-size:12px;color:var(--text2)">Größen als Vorschlag, mit Komma</label>
    <input id="an-liste" value="128,140,152" style="${feld}">
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;min-height:44px;margin-bottom:10px"><input id="an-nummer" type="checkbox"> Jeder Satz hat eine Nummer</label>
    <button class="btn btn-p" style="width:100%;min-height:56px;font-size:15px;font-weight:800" onclick="ausArtikelNeuSpeichern()">Gegenstand erfassen</button>
  </div>`;
  document.body.appendChild(m);
}

async function ausArtikelNeuSpeichern(){
  const name=(document.getElementById("an-name")?.value||"").trim();
  if(!name){toast("Der Gegenstand braucht einen Namen","err");return;}
  const mitG=!!document.getElementById("an-groesse")?.checked;
  const body={name,
    beschreibung:(document.getElementById("an-besch")?.value||"").trim()||null,
    mit_groesse:mitG,
    mit_nummer:!!document.getElementById("an-nummer")?.checked,
    groessen:mitG?((document.getElementById("an-liste")?.value||"").trim()||null):null,
    sort:(AUS_ARTIKEL.length?Math.max(...AUS_ARTIKEL.map(a=>a.sort||0)):0)+10};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ausstattung_artikel`,
      {method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte nicht angelegt werden","err");return;}
    const neu=(await r.json())[0];
    document.getElementById("aus-neu")?.remove();
    toast("Gegenstand erfasst ✓");
    await ausstattungLaden();
    if(neu)_ausAktiv=neu.id;
    ausstattungRender();
  }catch(e){ toast("Kein Netz – bitte noch einmal versuchen","err"); }
}

/* Marke für die MODUL_WACHE: steht ganz unten, damit ein Abbruch mittendrin
   auffällt. Bricht die Datei vorher ab, fehlt genau dieser Name. */
function ausstattungModulDa(){ return true; }
