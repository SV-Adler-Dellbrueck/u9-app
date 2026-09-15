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

/* ═══════════════════════════════════
   MATERIAL DES TEAMS – was haben wir, und wann haben wir zuletzt gezählt?

   Die Kachel hier hieß immer schon „Bälle, Leibchen & Co. – wer hat was?" und
   zeigte trotzdem eine Größentabelle. Gefragt war stets das andere.

   „ist" und „soll" dürfen leer bleiben: „noch nicht gezählt" ist eine eigene
   Aussage, eine 0 wäre die Behauptung, es sei keines da. Nur wer das trennt,
   kann eine Inventur überhaupt abschließen.

   Kleidung wird nicht zweimal gezählt: ein Posten kann auf einen Gegenstand aus
   der Ausstattung zeigen, dann steht daneben, wie viele davon gerade bei den
   Kindern sind. Ohne das läge der Schrank immer „unter Soll“.
═══════════════════════════════════ */
const MAT_ALT_TAGE=180;      // ab wann eine Zählung als alt gilt
let MAT_POSTEN=[];
/* ═══ v559 – Was die Übung braucht, gegen das, was im Schrank steht ═══
   Der Bestand führt „Hütchen" in drei Farben; für den Abgleich zählt die Summe, denn
   auf dem Platz ist ein Hütchen ein Hütchen. Gezählt wird nur, wo wirklich gezählt
   wurde: ein leeres Feld heißt „nicht gezählt", nicht „null Stück" (v545). Und was der
   Bestand gar nicht führt, wird als solches benannt statt stillschweigend übergangen –
   genau daran fällt auf, dass Minitore und Stangen bisher in keiner Liste stehen. */
/* Gesucht wird unter Ein- UND Mehrzahl. Die Zeichnung sagt „1 Stange", der Schrank
   führt „Stangen" – vorher galt genau eine einzelne Stange als nicht geführt, obwohl sechs
   im Schrank lagen. Umgekehrt genauso: wer den Posten „Stange" nennt, wird auch gefunden.
   Der Trainer tippt den Namen selbst ein; die App darf ihm keine Form vorschreiben. */
function matBestandFuer(name,auch){
  const namen=[name,auch].filter(Boolean).map(n=>String(n).trim().toLowerCase());
  const treffer=(MAT_POSTEN||[]).filter(p=>p.aktiv!==false&&namen.includes(String(p.name||"").trim().toLowerCase()));
  if(!treffer.length)return {gefuehrt:false,ist:null};
  const gezaehlt=treffer.filter(p=>p.ist!=null);
  if(!gezaehlt.length)return {gefuehrt:true,ist:null};
  return {gefuehrt:true,ist:gezaehlt.reduce((a,p)=>a+Number(p.ist||0),0)};
}
/* Liefert die Zeilen fertig zum Anzeigen: Menge, Gegenstand und – wo bekannt – ob es reicht. */
function matAbgleich(liste){
  return (liste||[]).map(m=>{
    const andere=(typeof skzMatWort==="function"&&m.schluessel)?skzMatWort(m.schluessel,m.anzahl===1?2:1):null;
    const b=matBestandFuer(m.was,andere);
    return {...m, gefuehrt:b.gefuehrt, ist:b.ist, fehlt:(b.ist!=null&&b.ist<m.anzahl)?(m.anzahl-b.ist):0};
  });
}
function matBedarfZeile(spec,opt){
  if(typeof skzMaterial!=="function")return "";
  const liste=(opt&&opt.summe)?skzMaterialSumme(spec):skzMaterial(spec);
  if(!liste.length)return "";
  const zeilen=matAbgleich(liste);
  const teile=zeilen.map(m=>{
    const kern=esc(m.anzahl+" "+m.was);
    if(m.fehlt)return '<span style="color:var(--red);font-weight:700">'+kern+' · es fehlen '+m.fehlt+'</span>';
    if(!m.gefuehrt)return '<span title="steht in keiner Bestandsliste">'+kern+'</span>';
    return kern;
  });
  const ungefuehrt=zeilen.filter(m=>!m.gefuehrt).map(m=>m.was);
  return '<div style="font-size:11.5px;color:var(--text2);line-height:1.6;margin:0 0 8px">'
    +'<b>Dafür brauchst du:</b> '+teile.join(" · ")
    +(ungefuehrt.length?'<div style="color:var(--text3);font-size:10.5px;margin-top:2px">Nicht im Materialbestand geführt: '+esc(ungefuehrt.join(", "))+'</div>':"")
    +'</div>';
}
let _matKat="";              // "" = alle
const _matTimer={};

async function materialOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("mat-modal")?.remove();
  const m=document.createElement("div");m.id="mat-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Material des Teams");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:500px;width:100%;margin:auto">
    ${mdlHead("mat-modal","🧰","Material","Was haben wir – und wann zuletzt gezählt?","#1e3a8a")}
    <div id="mat-body"><div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  await materialLaden();
  materialRender();
}

async function materialLaden(){
  MAT_POSTEN=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/material_posten?aktiv=is.true&select=*&order=sort.asc,name.asc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(r.ok)MAT_POSTEN=(await r.json())||[];
  }catch(e){}
  // Für „davon bei den Kindern" – nur nötig, wenn ein Posten darauf zeigt.
  if(MAT_POSTEN.some(p=>p.artikel_id)&&!Object.keys(AUS_AUSGABE).length){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/ausstattung_ausgabe?select=*`,{headers:sbAuthHeaders()});
      if(r.ok)((await r.json())||[]).forEach(z=>{AUS_AUSGABE[ausKey(z.spieler_id,z.artikel_id)]=z;});
    }catch(e){}
  }
}

function _matDraussen(artikelId){
  return Object.values(AUS_AUSGABE).filter(z=>z.artikel_id===artikelId&&z.ausgegeben_am&&!z.zurueck_am).length;
}

/* Wie alt ist die jüngste Zählung? Nicht die älteste: gefragt ist, ob überhaupt
   in letzter Zeit jemand im Schrank war. */
function matLetzteZaehlung(){
  const tage=MAT_POSTEN.map(p=>p.zuletzt_gezaehlt).filter(Boolean).sort();
  if(!tage.length)return null;
  const letzte=tage[tage.length-1];
  return {datum:letzte, alter:Math.floor((Date.now()-new Date(letzte+"T00:00:00").getTime())/864e5)};
}

function materialRender(){
  const body=document.getElementById("mat-body"); if(!body)return;
  if(!MAT_POSTEN.length){
    body.innerHTML=`<div class="empty" style="padding:24px 8px"><i class="ti ti-box"></i>Noch kein Posten erfasst.</div>
      <button class="btn btn-p" style="width:100%;min-height:56px;font-size:15px;font-weight:800" onclick="matPostenNeuOpen()">Posten erfassen</button>`;
    return;
  }
  /* Stillgelegte Posten holt schon die Abfrage nicht – hier noch einmal, damit die Liste
     nicht davon abhängt, wie sie befüllt wurde. */
  const aktive=MAT_POSTEN.filter(p=>p.aktiv!==false);
  const kats=[...new Set(aktive.map(p=>p.kategorie||"Sonstiges"))];
  const sichtbar=_matKat?aktive.filter(p=>(p.kategorie||"Sonstiges")===_matKat):aktive;
  const z=matLetzteZaehlung();
  /* Nur was wir selbst zählen, kann „ohne Zahl" sein – sonst wäre die Inventur nie fertig. */
  const eigene=aktive.filter(p=>!matFremd(p));
  const offen=eigene.filter(p=>p.ist==null).length;
  const alt=!z||z.alter>MAT_ALT_TAGE;
  body.innerHTML=`
    <div style="border:1px solid ${alt?"var(--amber)":"var(--rand-bedien)"};border-left-width:3px;border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:12.5px;color:var(--text2)">
      ${z?`Zuletzt gezählt am <b>${esc(_ausDatum(z.datum))}</b>${alt?` · <span style="color:var(--amber);font-weight:700">das ist ${z.alter} Tage her</span>`:""}`
         :'<span style="color:var(--amber);font-weight:700">Noch nie gezählt.</span> Trag ein, was da ist – leer heißt „nicht gezählt", nicht „keines da".'}
      ${offen?`<div style="margin-top:2px">${offen} von ${eigene.length} Posten ohne Zahl.</div>`:""}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <button class="ftag${_matKat?"":" active"}" aria-pressed="${!_matKat}" onclick="matKatWahl('')">Alle</button>
      ${kats.map(k=>`<button class="ftag${_matKat===k?" active":""}" aria-pressed="${_matKat===k}" onclick="matKatWahl('${esc(k).replace(/'/g,"")}')">${esc(k)}</button>`).join("")}
      <button class="ftag" onclick="matPostenNeuOpen()" title="Weiteren Posten anlegen">＋</button>
    </div>
    <div>${sichtbar.map(matZeile).join("")}</div>
    <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.5">Jede eingetragene Zahl setzt das Zähldatum dieses Postens auf heute. Gespeichert wird sofort.</div>`;
}

/* v561: Soll und Ist stehen nebeneinander, in zwei gleich breiten Spalten unter dem
   Namen. Vorher lagen sie in einer umbrechenden Zeile neben dem Namen – am Handy rutschte
   „Soll" nach rechts oben und „Ist" darunter nach links, und man musste erst lesen, welches
   Feld wozu gehört. Nebeneinander ist der Vergleich das, was er ist: ein Vergleich.
   Der Ort steht als Hinweiszeile am Posten – „Materialschuppen Verein" sagt alles, was man
   wissen muss, ohne dass jemand ein Kästchen setzen müsste. */
/* v562: Was im Vereinsschuppen liegt, gehört nicht in unsere Inventur. Wir zählen es nicht –
   wir wissen nur, dass es da ist und wo. Soll und Ist wären dort zwei Felder, die niemand
   ausfüllen kann und die die Inventur nie fertig werden ließen.

   Erkannt wird das am Ort. Ein eigenes Kennzeichen dafür gab es schon einmal und war eines
   zu viel (v561). Trägt jemand einen anderen Wortlaut ein, erscheinen die Felder wieder –
   das ist der harmlose Ausgang: zwei Felder zu viel, nie eine falsche Zahl. */
const MAT_FREMD=/verein/i;
function matFremd(p){ return MAT_FREMD.test(String((p&&p.ort)||"")); }

function matZeile(p){
  const fehlt=p.soll!=null&&p.ist!=null&&p.ist<p.soll;
  const rand=fehlt?"var(--red)":(p.ist!=null?"var(--green)":"var(--rand-bedien)");
  const draussen=p.artikel_id?_matDraussen(p.artikel_id):0;
  const feld="width:100%;min-height:48px;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:15px;background:var(--surface);color:var(--text);text-align:right";
  const kopf="display:block;font-size:11px;margin-bottom:2px";
  const kopfzeile=`<div style="font-size:13.5px;font-weight:600">${esc(p.name)}${p.variante?` <span style="color:var(--text3);font-weight:400">· ${esc(p.variante)}</span>`:""}</div>
    ${p.ort?`<div style="font-size:11px;color:var(--text3);margin-top:1px">${esc(p.ort)}</div>`:""}`;
  if(matFremd(p))return `<div style="border:1px solid var(--rand-bedien);border-left-width:3px;border-radius:10px;padding:8px 10px;margin-bottom:6px">${kopfzeile}</div>`;
  return `<div style="border:1px solid ${rand};border-left-width:3px;border-radius:10px;padding:8px 10px;margin-bottom:6px">
    ${kopfzeile}
    ${draussen?`<div style="font-size:11px;color:var(--text3)">davon ${draussen} bei den Kindern</div>`:""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
      <label><span style="${kopf};color:var(--text3)">Soll</span>
        <input type="number" inputmode="numeric" min="0" value="${p.soll!=null?p.soll:""}" placeholder="–" aria-label="Sollbestand ${esc(p.name)}"
          oninput="matFeldTippen(${p.id},'soll',this.value)" style="${feld}"></label>
      <label><span style="${kopf};color:var(--text2);font-weight:700">Ist</span>
        <input type="number" inputmode="numeric" min="0" value="${p.ist!=null?p.ist:""}" placeholder="–" aria-label="Istbestand ${esc(p.name)}"
          oninput="matFeldTippen(${p.id},'ist',this.value)" style="${feld}"></label>
    </div>
    ${fehlt?`<div style="font-size:11.5px;color:var(--red);font-weight:700;margin-top:4px">${p.soll-p.ist} fehlen</div>`:""}
    ${p.zuletzt_gezaehlt?`<div style="font-size:10.5px;color:var(--text3);margin-top:2px">gezählt am ${esc(_ausDatum(p.zuletzt_gezaehlt))}</div>`:""}
  </div>`;
}

function matKatWahl(k){ _matKat=k; materialRender(); }

/* Eine leere Zahl ist NULL, nicht 0 – sonst behauptet ein geleertes Feld, das Fach
   sei leer. Nur das Feld „ist" setzt das Zähldatum: das Soll ist eine Festlegung,
   keine Zählung. */
function matFeldTippen(id,feld,wert){
  const p=MAT_POSTEN.find(x=>x.id===id); if(!p)return;
  const roh=String(wert).trim();
  p[feld]=roh===""?null:Math.max(0,parseInt(roh,10)||0);
  if(feld==="ist")p.zuletzt_gezaehlt=p.ist==null?p.zuletzt_gezaehlt:new Date().toISOString().slice(0,10);
  clearTimeout(_matTimer[id+feld]);
  _matTimer[id+feld]=setTimeout(()=>matSchreiben(p),900);
}

async function matSchreiben(p){
  const body={soll:p.soll==null?null:p.soll, ist:p.ist==null?null:p.ist,
    zuletzt_gezaehlt:p.zuletzt_gezaehlt||null};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/material_posten?id=eq.${p.id}`,
      {method:"PATCH",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte nicht speichern – bitte noch einmal eintragen","err");return;}
  }catch(e){ toast("Kein Netz – die Zahl ist nicht gespeichert","err"); }
}

function matPostenNeuOpen(){
  document.getElementById("mat-neu")?.remove();
  const m=document.createElement("div");m.id="mat-neu";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Posten erfassen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:"+(typeof zOben==="function"?zOben(10001):10001)+";display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const feld="width:100%;min-height:48px;padding:10px;margin:4px 0 10px;border:1px solid var(--rand-bedien);border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px;background:var(--surface);color:var(--text)";
  const kats=["Bälle","Hütchen","Markierung","Geräte","Kleidung","Medizin","Sonstiges"];
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:400px;width:100%;margin:auto">
    ${mdlHead("mat-neu","➕","Posten erfassen","z. B. Hütchen in einer weiteren Farbe","#1e3a8a")}
    <label for="mn-name" style="font-size:12px;color:var(--text2)">Was ist es?</label>
    <input id="mn-name" placeholder="Hütchen" style="${feld}">
    <label for="mn-var" style="font-size:12px;color:var(--text2)">Farbe, Größe oder Nummernkreis (freiwillig)</label>
    <input id="mn-var" placeholder="orange" style="${feld}">
    <label for="mn-kat" style="font-size:12px;color:var(--text2)">Schublade</label>
    <select id="mn-kat" style="${feld}">${kats.map(k=>`<option>${k}</option>`).join("")}</select>
    <label for="mn-soll" style="font-size:12px;color:var(--text2)">Soll (freiwillig)</label>
    <input id="mn-soll" type="number" inputmode="numeric" min="0" placeholder="–" style="${feld}">
    <label for="mn-ort" style="font-size:12px;color:var(--text2)">Wo liegt es? (freiwillig)</label>
    <input id="mn-ort" placeholder="Materialschuppen Verein" style="${feld}">
    <button class="btn btn-p" style="width:100%;min-height:56px;font-size:15px;font-weight:800" onclick="matPostenNeuSpeichern()">Posten erfassen</button>
  </div>`;
  document.body.appendChild(m);
}

async function matPostenNeuSpeichern(){
  const name=(document.getElementById("mn-name")?.value||"").trim();
  if(!name){toast("Der Posten braucht einen Namen","err");return;}
  const soll=(document.getElementById("mn-soll")?.value||"").trim();
  const body={name,
    variante:(document.getElementById("mn-var")?.value||"").trim()||null,
    kategorie:document.getElementById("mn-kat")?.value||"Sonstiges",
    soll:soll===""?null:Math.max(0,parseInt(soll,10)||0),
    ort:(document.getElementById("mn-ort")?.value||"").trim()||null,
    sort:(MAT_POSTEN.length?Math.max(...MAT_POSTEN.map(p=>p.sort||0)):0)+10};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/material_posten`,
      {method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte nicht angelegt werden","err");return;}
    document.getElementById("mat-neu")?.remove();
    toast("Posten erfasst ✓");
    await materialLaden();
    materialRender();
  }catch(e){ toast("Kein Netz – bitte noch einmal versuchen","err"); }
}

/* Marke für die MODUL_WACHE: steht ganz unten, damit ein Abbruch mittendrin
   auffällt. Bricht die Datei vorher ab, fehlt genau dieser Name. */
function ausstattungModulDa(){ return true; }
