/* ═══════════════════════════════════
   TURNIERPLAN – Begegnungen VOR dem Turnier erfassen.
   Bisher kannte der Turnier-Modus nur gespielte Spiele (turnier_spiele). Jetzt gibt es
   den Spielplan (turnier_plan): Uhrzeit, Gegner, Feld, Runde. Ergebnisse haengen per
   plan_id daran. Dazu am Termin ein Link zum Online-Turnierbaum und der hochgeladene
   Aushang (Foto/PDF) – der funktioniert auch, wenn am Platz kein Netz ist.
═══════════════════════════════════ */
const TP_EIGENE=/adler|dellbr[üu]ck|u\s?9|wir|heim/i;
/* Auf jedem Aushang stehen Zeilen, die keine Begegnung sind – sonst erfinden wir Gegner.
   Zusammengesetzte Woerter ohne Wortgrenze suchen ("Kaffeepause"), kurze mehrdeutige
   Woerter dagegen MIT Wortgrenze, sonst faellt "SV Endenich" dem "ende" zum Opfer. */
const TP_KEIN_SPIEL=/(kaffee|pause|ehrung|auslosung|einlaufen|aufw[äa]rmen|er[öo]ffnung|begr[üu][ßs]ung|fr[üu]hst[üu]ck|imbiss|freilos|spielfrei|halbzeit|turnierende|turnierbeginn)/i;
const TP_KEIN_SPIEL2=/\b(ende|beginn|abschluss|mittag|start)\b/i;

/* Der Aushang wird kopiert oder abgetippt und sieht nie gleich aus. Deshalb: Uhrzeit,
   Feld und Runde per Muster herausziehen, den Rest als Begegnung deuten und das eigene
   Team herausrechnen. Was keinen Gegner ergibt, wird verworfen statt geraten. */
function turnierPlanParse(text){
  const zeilen=String(text||"").split(/\r?\n/);
  const treffer=[];
  zeilen.forEach(roh=>{
    let z=roh.replace(/\t/g," ").trim();
    if(!z||z.length<3)return;
    if(TP_KEIN_SPIEL.test(z)||TP_KEIN_SPIEL2.test(z))return;   // Pause, Siegerehrung, Freilos …
    const mZeit=z.match(/\b(\d{1,2})[:.](\d{2})\b/);
    const uhrzeit=mZeit?String(mZeit[1]).padStart(2,"0")+":"+mZeit[2]:null;
    if(mZeit)z=z.replace(mZeit[0]," ");
    const mFeld=z.match(/\b(?:Feld|Platz|Court)\s*([0-9A-Za-z]{1,3})\b/i);
    const feld=mFeld?mFeld[0].replace(/\s+/," "):null;
    if(mFeld)z=z.replace(mFeld[0]," ");
    const mRunde=z.match(/\b(Gruppe\s*[A-Z0-9]|Vorrunde|Zwischenrunde|Halbfinale|Viertelfinale|Finale|Spiel\s*um\s*Platz\s*\d+)\b/i);
    const runde=mRunde?mRunde[0]:null;
    if(mRunde)z=z.replace(mRunde[0]," ");
    z=z.replace(/\b\d+\s*[:\-]\s*\d+\b/g," ")            // bereits eingetragene Ergebnisse ignorieren
       .replace(/^\s*\d+[.)]\s*/,"")                      // "1." / "3)" am Zeilenanfang
       .replace(/\s{2,}/g," ").trim();
    let gegner=null;
    const paar=z.split(/\s+(?:-|–|—|vs\.?|gegen|:)\s+/i);
    if(paar.length>=2){
      const fremd=paar.filter(p=>p.trim()&&!TP_EIGENE.test(p));
      gegner=(fremd.length?fremd[0]:paar[1]).trim();
    }else if(z&&!TP_EIGENE.test(z)){
      gegner=z.trim();
    }
    gegner=(gegner||"").replace(/[|;,.\-–—]+$/,"").trim();
    // Ein Gegner braucht Buchstaben. "---" oder "3" sind keine Mannschaft.
    if(!gegner||!/[A-Za-zÄÖÜäöüß]{2,}/.test(gegner))return; // lieber nichts als Unsinn
    treffer.push({uhrzeit,gegner,feld,runde});
  });
  return treffer;
}

let TP_PLAN=[], TP_TERMIN=null;

/* Spielplan + Quellen (Link/Aushang). ergebnisse = turnier_spiele, damit jede geplante
   Begegnung ihr Ergebnis direkt zeigt bzw. ein Eingabefeld anbietet. */
function turnierPlanRender(ergebnisse){
  const box=document.getElementById("turnier-plan");
  if(!box)return;
  const erg={}; (ergebnisse||[]).forEach(x=>{ if(x.plan_id)erg[x.plan_id]=x; });
  const fld="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";

  // Quellen: Link zum Online-Turnierbaum und hochgeladener Aushang
  let quellen="";
  if(!TP_TERMIN){
    quellen=`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Für dieses Datum ist kein Termin hinterlegt – Link und Aushang lassen sich erst danach speichern.</div>`;
  }else{
    quellen=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <input id="tp-url" value="${esc(TP_TERMIN.turnierplan_url||"")}" placeholder="https://… Link zum Turnierbaum" style="flex:1;min-width:160px;${fld}">
        <button class="btn btn-sm" onclick="turnierPlanUrlSave()"><i class="ti ti-device-floppy"></i>Speichern</button>
        ${TP_TERMIN.turnierplan_url?`<a class="btn btn-sm" href="${esc(TP_TERMIN.turnierplan_url)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link"></i>Öffnen</a>`:""}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        <input id="tp-datei" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="flex:1;min-width:150px;font-size:11px">
        <button class="btn btn-sm" onclick="turnierPlanDateiUpload(this)"><i class="ti ti-upload"></i>Aushang hochladen</button>
        ${TP_TERMIN.turnierplan_datei?`<button class="btn btn-sm" onclick="turnierPlanDateiOeffnen()"><i class="ti ti-file-text"></i>Aushang ansehen</button>`:""}
      </div>`;
  }

  let plan;
  if(!TP_PLAN.length){
    plan=`<div style="font-size:12px;color:var(--text3);padding:4px 0">Noch kein Spielplan. Kopiere die Begegnungen von der Turnierseite und füge sie unten ein.</div>`;
  }else{
    plan=TP_PLAN.map(p=>{
      const e=erg[p.id];
      const kopf=`<div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${esc(p.gegner||"?")}</div>
          <div style="font-size:10.5px;color:var(--text2)">${p.uhrzeit?esc(p.uhrzeit)+" Uhr":""}${p.feld?" · "+esc(p.feld):""}${p.runde?" · "+esc(p.runde):""}</div>
        </div>`;
      if(e){
        const w=e.tore>e.gegentore?"#15803d":e.tore===e.gegentore?"#a16207":"#dc2626";
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--surface2)">
          ${kopf}<span style="font-weight:800;color:${w};font-size:15px">${e.tore}:${e.gegentore}</span>
          <button onclick="turnierPlanDelete(${p.id},'${jsq(p.gegner||"")}')" aria-label="Begegnung entfernen" style="min-width:40px;min-height:40px;border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
        </div>`;
      }
      return `<div style="display:flex;align-items:center;gap:6px;padding:8px 0;border-top:1px solid var(--surface2);flex-wrap:wrap">
        ${kopf}
        <input id="tp-tore-${p.id}" type="number" min="0" value="0" style="width:52px;text-align:center;${fld}">
        <span style="font-weight:800">:</span>
        <input id="tp-geg-${p.id}" type="number" min="0" value="0" style="width:52px;text-align:center;${fld}">
        <button class="btn btn-sm btn-p" onclick="turnierPlanErgebnis(${p.id},'${jsq(p.gegner||"")}')">Ergebnis</button>
        <button onclick="turnierPlanDelete(${p.id},'${jsq(p.gegner||"")}')" aria-label="Begegnung entfernen" style="min-width:40px;min-height:40px;border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
      </div>`;
    }).join("");
  }

  box.innerHTML=quellen+plan+
    `<details style="margin-top:10px">
      <summary style="cursor:pointer;font-size:12px;font-weight:600;color:var(--blue)">📋 Spielplan einfügen</summary>
      <div style="font-size:11px;color:var(--text2);margin:6px 0">Begegnungen von der Turnierseite kopieren und hier einfügen. Uhrzeit, Feld und Runde werden erkannt; Pausen und Siegerehrung ignoriert.</div>
      <textarea id="tp-import" rows="4" placeholder="09:00 Feld 1 SV Adler Dellbrück - FC Musterstadt&#10;09:20 Feld 2 TuS Beispiel - SV Adler Dellbrück" style="${fld};width:100%;resize:vertical"></textarea>
      <button class="btn btn-sm" style="margin-top:6px" onclick="turnierPlanImportPreview()"><i class="ti ti-eye"></i>Vorschau</button>
      <div id="tp-import-preview"></div>
    </details>`;
}

async function turnierPlanLoad(){
  TP_PLAN=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_plan?datum=eq.${encodeURIComponent(spieltagKey())}&select=*&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(r.ok)TP_PLAN=await r.json();
  }catch(e){}
}
async function turnierTerminLoad(){
  TP_TERMIN=null;
  const d=spieltagRawDate(); if(!d)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(d)}&select=id,turnierplan_url,turnierplan_datei&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)TP_TERMIN=(await r.json())[0]||null;
  }catch(e){}
}
async function turnierPlanImportPreview(){
  const txt=document.getElementById("tp-import")?.value||"";
  const treffer=turnierPlanParse(txt);
  const box=document.getElementById("tp-import-preview");
  if(!box)return;
  if(!treffer.length){ box.innerHTML='<div style="font-size:11.5px;color:#b45309">Keine Begegnung erkannt. Zeilen brauchen mindestens einen Gegnernamen.</div>'; return; }
  window._tpImport=treffer;
  box.innerHTML=`<div style="font-size:11.5px;color:var(--text2);margin:6px 0">${treffer.length} Begegnung(en) erkannt – bitte prüfen:</div>`
    +treffer.map(t=>`<div style="font-size:12px;padding:3px 0;border-top:1px solid var(--surface2)">${t.uhrzeit||"--:--"} · <b>${esc(t.gegner)}</b>${t.feld?" · "+esc(t.feld):""}${t.runde?" · "+esc(t.runde):""}</div>`).join("")
    +`<button class="btn btn-p btn-sm" style="margin-top:8px" onclick="turnierPlanImportSave()"><i class="ti ti-check"></i>${treffer.length} übernehmen</button>`;
}
async function turnierPlanImportSave(){
  const treffer=window._tpImport||[];
  if(!treffer.length)return;
  const basis=TP_PLAN.length;
  const rows=treffer.map((t,i)=>({datum:spieltagKey(),sort:basis+i,uhrzeit:t.uhrzeit,gegner:t.gegner,feld:t.feld,runde:t.runde}));
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_plan`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(rows)});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Spielplan konnte nicht gespeichert werden"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast(`${rows.length} Begegnungen übernommen ✓`);
  window._tpImport=null;
  const ta=document.getElementById("tp-import"); if(ta)ta.value="";
  await turnierPlanLoad(); turnierRender();
}
async function turnierPlanDelete(id,gegner){
  if(!confirm(`Begegnung gegen ${gegner||"?"} aus dem Spielplan entfernen?`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/turnier_plan?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  await turnierPlanLoad(); turnierRender();
}
// Ergebnis direkt an der geplanten Begegnung eintragen (haengt per plan_id daran)
async function turnierPlanErgebnis(planId,gegner){
  const t=parseInt(document.getElementById("tp-tore-"+planId)?.value)||0;
  const g=parseInt(document.getElementById("tp-geg-"+planId)?.value)||0;
  const _r=await sbQueuedPost("turnier_spiele",{datum:spieltagKey(),gegner:gegner||null,tore:t,gegentore:g,plan_id:planId},"return=minimal");
  if(_r&&_r.queued)toast("📶 Offline – Ergebnis wird nachgetragen");
  else toast("Ergebnis eingetragen ✓");
  turnierRender();
}
async function turnierPlanUrlSave(){
  if(!TP_TERMIN){toast("Für dieses Datum gibt es keinen Termin","err");return;}
  const url=(document.getElementById("tp-url")?.value||"").trim();
  if(url&&!/^https?:\/\//i.test(url)){toast("Bitte eine vollständige Adresse (https://…)","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${TP_TERMIN.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({turnierplan_url:url||null})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  TP_TERMIN.turnierplan_url=url||null;
  toast(url?"Turnierplan-Link gespeichert ✓":"Link entfernt");
  turnierRender();
}
async function turnierPlanDateiUpload(btn){
  if(!TP_TERMIN){toast("Für dieses Datum gibt es keinen Termin","err");return;}
  const input=document.getElementById("tp-datei");
  const file=input&&input.files&&input.files[0];
  if(!file){toast("Bitte eine Datei wählen","err");return;}
  if(file.size>5*1024*1024){toast("Datei zu groß (max. 5 MB)","err");return;}
  const istPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name);
  if(btn)btn.disabled=true;
  try{
    const körper=istPdf?file:await fotoCompress(file,1600); // Foto vom Aushang: lesbar, aber sparsam
    const pfad=`plan/${TP_TERMIN.id}-${Date.now()}.${istPdf?"pdf":"jpg"}`;
    const up=await fetch(`${SB_URL}/storage/v1/object/termin_media/${pfad}`,{method:"POST",
      headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':istPdf?"application/pdf":"image/jpeg"},body:körper});
    if(!up.ok){toast("Upload fehlgeschlagen","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${TP_TERMIN.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({turnierplan_datei:pfad})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
    TP_TERMIN.turnierplan_datei=pfad;
    toast("Turnierplan hochgeladen ✓");
    if(input)input.value="";
    turnierRender();
  }catch(e){toast("Datei konnte nicht verarbeitet werden","err");}
  finally{if(btn)btn.disabled=false;}
}
// Der Bucket ist privat: die Datei wird mit dem Token geholt und lokal geöffnet.
async function turnierPlanDateiOeffnen(){
  if(!TP_TERMIN||!TP_TERMIN.turnierplan_datei)return;
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${TP_TERMIN.turnierplan_datei}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok){toast("Datei nicht gefunden","err");return;}
    const url=URL.createObjectURL(await r.blob());
    window.open(url,"_blank","noopener");
  }catch(e){toast("Netzwerkfehler","err");}
}

async function turnierAdd(){
  const g=(document.getElementById("turnier-gegner")?.value||"").trim();
  const tore=parseInt(document.getElementById("turnier-tore")?.value)||0;
  const geg=parseInt(document.getElementById("turnier-geg")?.value)||0;
  const _r=await sbQueuedPost("turnier_spiele",{datum:spieltagKey(),gegner:g||null,tore,gegentore:geg},"return=minimal");
  if(_r&&_r.queued)toast("📶 Offline – Spiel wird nachgetragen");
  ["turnier-gegner"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  ["turnier-tore","turnier-geg"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="0";});
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  turnierRender();
}
async function turnierDelete(id){
  if(!confirm("Dieses Turnier-Spiel wirklich löschen?"))return;
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/turnier_spiele?id=eq.${id}&select=*`,{headers:sbAuthHeaders()});if(r.ok)row=(await r.json())[0];}catch(e){}
  try{await fetch(`${SB_URL}/rest/v1/turnier_spiele?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  turnierRender();
  if(row&&typeof toastUndo==="function")toastUndo("Spiel gelöscht",async()=>{
    try{await fetch(`${SB_URL}/rest/v1/turnier_spiele`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({datum:row.datum,gegner:row.gegner,tore:row.tore,gegentore:row.gegentore})});}catch(e){}
    turnierRender();
  });
}
// Spieltags-Nominierung: wer ist dabei / nicht / verletzt – speist Rotations-Timer + Blitz
let nomStatus={};
/* Turnier-Banner im Spieltag: erscheint NUR, wenn der gewählte Spieltag ein Turnier ist.
   PO: „Ein Turnier kommt nur selten vor und wird dann vorab in der Termin-Anlage schon
   organisiert" – als Dauergast über jedem normalen Spiel war es Ballast. Dieselbe
   Kontext-Logik wie die Turnier-Gruppe im Kachel-Menü (_kachelTurnierCheck, v346).
   Der Typ kommt aus derselben Abfrage, die die Auswahlliste füllt – keine zweite Runde. */
let _spieltagTypen={}, _spieltagHeim={}, _spieltagNamen={};
/* v484 – PO: „Das soll die Kachel Turnier-Modus dann ersetzen." Richten WIR aus, fuehrt der
   Banner in den Festival-Planer (Vereine, Felder, Spielplan, Teilen). Sind wir zu Gast,
   bleibt der Turnier-Modus: dort macht den Plan der Ausrichter, wir erfassen nur Kurzspiele. */
function _spieltagTurnierBanner(){
  const b=document.getElementById("spieltag-turnier-banner"); if(!b)return;
  const d=document.getElementById("spieltag-date")?.value||"";
  const typ=_spieltagTypen[d], heim=_spieltagHeim[d]===true;
  /* v490: Auch das Heimspiel wird geplant wie ein kleines Festival – ein Gegner, evtl. mehrere
     Teams auf beiden Seiten. Nur auswärts bleibt es beim Turnier-Modus. */
  b.hidden=!(typ==="turnier"||(typ==="spiel"&&heim));
  if(b.hidden)return;
  const anlass=(typ==="spiel")?"heimspiel":"festival";
  b.onclick=heim?(()=>{ if(typeof htOpen==="function")htOpen(d,_spieltagNamen&&_spieltagNamen[d],anlass); else toast("Planer lädt noch"); })
                :(()=>turnierOpen());
  const em=b.querySelector("span[style*='font-size:22px']");
  if(em)em.textContent=!heim?"🏆":(anlass==="heimspiel"?"⚽":"🏟️");
  const t=b.querySelector("span[style*='font-weight:800']"), u=b.querySelector("span[style*='opacity']");
  if(t)t.textContent=!heim?"Turnier-Modus":(anlass==="heimspiel"?"Heimspiel planen":"Festival planen");
  if(u)u.textContent=!heim?"Mehrere Kurzspiele erfassen – Spielplan & Ergebnisse"
      :(anlass==="heimspiel"?"Gegner, Teams, Felder, Spielplan – und teilen":"Vereine, Felder, Spielplan – und teilen");
}
// Match-Datum nur aus hinterlegten Spieltagen (termine typ spiel/turnier) wählbar – kein Freitext.
async function spieltagDatesLoad(preferDatum){
  const sel=document.getElementById("spieltag-date"); if(!sel)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&select=datum,gegner,typ,heim,titel&order=datum.asc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  const seen=new Set(), items=[];
  rows.forEach(t=>{if(t.datum&&!seen.has(t.datum)){seen.add(t.datum);items.push(t);}});
  if(!items.length){ sel.innerHTML='<option value="">— kein Spieltag angelegt (unter Orga anlegen) —</option>'; nomLoad(); return; }
  const heute=new Date().toISOString().slice(0,10);
  const def=(preferDatum&&seen.has(preferDatum))?preferDatum:((items.find(t=>t.datum>=heute)||{}).datum||items[items.length-1].datum);
  const fmt=(t)=>{const d=new Date(t.datum+"T00:00:00");const wd=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];const ds=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});const g=t.typ==="turnier"?"🏆 Turnier":(t.gegner?"vs "+t.gegner:"Spiel");return `${wd} ${ds} · ${g}`;};
  sel.innerHTML=items.map(t=>`<option value="${esc(t.datum)}"${t.datum===def?" selected":""}>${esc(fmt(t))}</option>`).join("");
  // Typ je Spieltag merken – das Turnier-Banner haengt daran (siehe _spieltagTurnierBanner)
  _spieltagTypen={}; _spieltagHeim={}; _spieltagNamen={};
  items.forEach(t=>{ _spieltagTypen[t.datum]=t.typ; _spieltagHeim[t.datum]=t.heim===true; _spieltagNamen[t.datum]=t.titel||""; });
  _spieltagTurnierBanner();
  nomLoad();
}
function nomInit(){
  spieltagTeam=1;                                   // Tab-Eintritt: Standard-Team
  if(typeof TEAM_KARTE_OFFEN!=="undefined")TEAM_KARTE_OFFEN=0;  // … und alle Kacheln zu
  spieltagDatesLoad(); // Spieltag-Dropdown aus hinterlegten Terminen befüllen (ruft dann nomLoad)
}
// Eltern-RSVP (Phase 10-M, Etappe 3): Rückmeldungen der Eltern zum Termin dieses Datums laden.
let nomRsvp={}, nomOvr=new Set(); // nomRsvp: name->{status,kommentar}; nomOvr: vom Trainer manuell überstimmte Namen
async function nomLoadRsvp(){
  nomRsvp={};
  const datum=spieltagRawDate();
  try{
    const tr=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&select=id&limit=1`,{headers:sbAuthHeaders()});
    if(!tr.ok)return;
    const trows=await tr.json(); const tid=trows[0]&&trows[0].id;
    if(!tid)return;
    const rr=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${tid}&select=spieler_id,status,kommentar`,{headers:sbAuthHeaders()});
    if(!rr.ok)return;
    (await rr.json()).forEach(x=>{const k=KADER.find(kk=>kk._id===x.spieler_id); if(k)nomRsvp[k.name]={status:x.status,kommentar:x.kommentar};});
  }catch(e){}
}

/* Return-to-Play-Ampel (Phase 18.2): Kinder, die in den letzten 14 Tagen ein Training
   oder Spiel mit "krank" abgesagt haben und heute wieder dabei sind, werden in der
   Live-Aufstellung mit 🩹 markiert – Signal an den Trainer: heute Belastung dosieren. */
let RECOVERY=new Set();
function istRecovery(n){ return RECOVERY.has(n); }
async function recoveryLoad(){
  RECOVERY=new Set();
  const heute=spieltagRawDate();
  const grenze=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?status=eq.krank&select=spieler_id,termine(datum)`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return;
    (await r.json()).forEach(x=>{
      const d=x.termine&&x.termine.datum;
      if(!d||d<grenze||d>heute)return;           // nur die letzten 14 Tage
      const k=KADER.find(kk=>kk._id===x.spieler_id);
      if(k)RECOVERY.add(k.name);
    });
    // Wer HEUTE krank gemeldet ist, ist nicht "zurück" – der spielt ja gar nicht.
    Object.keys(nomRsvp).forEach(n=>{ if(nomRsvp[n]&&nomRsvp[n].status==="krank")RECOVERY.delete(n); });
  }catch(e){}
}

/* Kapitäns-Tracker (Phase 17.2): jedes Kind soll mal die Binde tragen. Die App führt
   Buch (Zählung über alle Spiele) und meldet den Kapitän live in den Eltern-Ticker.
   Kapitän = match_actions-Zeile aktion='kapitaen'; genau einer je Spiel. */
let matchKapitaen=null, KAP_COUNT={};
async function kapitaenLoad(){
  matchKapitaen=null; KAP_COUNT={};
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/match_actions?aktion=eq.kapitaen&select=spieler,datum&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return;
    (await r.json()).forEach(x=>{
      KAP_COUNT[x.spieler]=(KAP_COUNT[x.spieler]||0)+1;
      if(x.datum===datum&&!matchKapitaen)matchKapitaen=x.spieler; // jüngster für dieses Spiel
    });
  }catch(e){}
}
/* B2 – Faire Rollen: „jeder mal dran". Kapitän gibt es schon; hier zusätzlich die Rolle
   „Anstoß" und eine Fairness-Übersicht, wer eine Rolle noch nie hatte (⭐). */
let ANSTOSS_COUNT={}, matchAnstoss=null;
async function anstossLoad(){
  ANSTOSS_COUNT={}; matchAnstoss=null; const datum=spieltagKey();
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?aktion=eq.anstoss&select=spieler,datum&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(x=>{ANSTOSS_COUNT[x.spieler]=(ANSTOSS_COUNT[x.spieler]||0)+1; if(x.datum===datum&&!matchAnstoss)matchAnstoss=x.spieler;});}catch(e){}
}
async function anstossSet(name){
  if(!name)return; const datum=spieltagKey();
  try{ await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&aktion=eq.anstoss`,{method:"DELETE",headers:sbAuthHeaders()}); }catch(e){}
  if(ANSTOSS_COUNT[matchAnstoss])ANSTOSS_COUNT[matchAnstoss]--;
  matchAnstoss=name; ANSTOSS_COUNT[name]=(ANSTOSS_COUNT[name]||0)+1;
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  terminIdForDatum(datum).then(tid=>sbQueuedPost("match_actions",{datum,spieler:name,aktion:"anstoss",termin_id:tid}));
  toast(`🏁 ${name} stößt heute an`);
  rollenPanelRender();
}
async function rollenPanelRender(){
  const box=document.getElementById("rollen-panel"); if(!box)return;
  await anstossLoad(); // KAP_COUNT wird über kapitaenLoad in nomLoad gefüllt
  /* Nur die Kinder DIESES Teams. Der frühere Rückfall auf den ganzen Kader war gut
     gemeint, aber hier falsch: die Rollen wohnen in der Team-Kachel, und ein Kapitän aus
     einem anderen Team steht am Spielfeldrand. Ist das Team leer, sagt das Panel das –
     eine Auswahl über 16 Namen wäre nur eine Falle. */
  const squad=(typeof nominierteSpieler==="function")?nominierteSpieler():[];
  if(!squad.length){
    box.innerHTML=`<div style="font-size:11.5px;color:var(--text3)">Noch niemand in diesem Team – erst oben unter „Teams festlegen“ einteilen.</div>`;
    return;
  }
  const nie=(cnt)=>squad.filter(n=>!(cnt[n]>0));
  const opts=(cnt,cur)=>squad.slice().sort((a,b)=>(cnt[a]||0)-(cnt[b]||0)).filter(n=>n!==cur).map(n=>`<option value="${esc(n)}">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)} · ${(cnt[n]||0)===0?"noch nie ⭐":(cnt[n]||0)+"×"}</option>`).join("");
  const row=(icon,label,cnt,cur,setFn)=>{
    const offen=nie(cnt);
    return `<div style="background:var(--surface);border:var(--border-s);border-radius:12px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="flex:1;font-size:12.5px;font-weight:700">${icon} ${label}${cur?`: <span style="color:var(--blue)">${esc(cur)}</span>`:""}</span>
        <select onchange="if(this.value)${setFn}(this.value)" style="padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:12px;background:var(--surface2);color:var(--text)"><option value="">${cur?"wechseln…":"wählen…"}</option>${opts(cnt,cur)}</select>
      </div>
      ${offen.length?`<div style="font-size:10.5px;color:var(--text2);margin-top:5px">Noch nie dran ⭐: ${offen.map(esc).join(", ")}</div>`:`<div style="font-size:10.5px;color:var(--green);margin-top:5px">Alle waren schon dran – fair verteilt ✓</div>`}
    </div>`;
  };
  box.innerHTML=`<div style="font-size:10.5px;color:var(--text3);margin-bottom:6px">Damit jedes Kind mal die besondere Rolle bekommt.</div>`+
    row("©️","Kapitän",(typeof KAP_COUNT!=="undefined"?KAP_COUNT:{}),(typeof matchKapitaen!=="undefined"?matchKapitaen:null),"kapitaenSet")+
    row("🏁","Anstoß",ANSTOSS_COUNT,matchAnstoss,"anstossSet");
}
async function kapitaenSet(name){
  if(!name)return;
  const datum=spieltagKey();
  // genau ein Kapitän je Spiel: alten Eintrag dieses Datums entfernen
  try{ await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&aktion=eq.kapitaen`,{method:"DELETE",headers:sbAuthHeaders()}); }catch(e){}
  if(KAP_COUNT[matchKapitaen])KAP_COUNT[matchKapitaen]--; // Zähler des alten zurück
  matchKapitaen=name;
  KAP_COUNT[name]=(KAP_COUNT[name]||0)+1;
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  terminIdForDatum(datum).then(tid=>sbQueuedPost("match_actions",{datum,spieler:name,aktion:"kapitaen",termin_id:tid}));
  tickerPush(name,"kapitaen");   // Highlight für die Eltern
  toast(`©️ ${name} ist heute Kapitän`);
  rotRenderLive();          // Anzeige im Rotations-Timer
  rollenPanelRender();      // und die Zeile bei den fairen Rollen
}
/* Kapitäns-Zeile im Rotations-Timer: nur noch ANZEIGE.
   PO-Meldung v396: „es gibt den Auswahl für Kapitän auch 2 x." Stimmt – einmal unter
   „Faire Rollen" (① Vor dem Spiel) und einmal hier. Zwei Auswahlfelder für dieselbe
   Entscheidung, mit unterschiedlichen Namenslisten obendrein: hier kam sie aus Feld und
   Bank des Rotations-Timers, dort aus dem Team-Kader. Gewählt wird jetzt nur noch bei
   den fairen Rollen; hier steht, wer es geworden ist, damit man es während des Spiels
   sieht ohne hochzuscrollen. */
function kapitaenRow(){
  if(matchKapitaen){
    const n=KAP_COUNT[matchKapitaen]||1;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:var(--r);font-size:12.5px;color:#3730a3;margin-bottom:10px">
      ©️ <strong>Kapitän: ${esc(matchKapitaen)}</strong><span style="font-size:10px;color:#6366f1">${n}. Mal</span></div>`;
  }
  return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f5f3ff;border:1px dashed #c7d2fe;border-radius:var(--r);font-size:12.5px;color:#4338ca;margin-bottom:10px">
    ©️ <span>Noch kein Kapitän – unter „① Vor dem Spiel“ bei den fairen Rollen wählen.</span></div>`;
}
/* Die Nominierung gehoert seit v393 dem SPIELTAG, nicht dem einzelnen Team: „wer ist heute
   ueberhaupt dabei". Sie liegt unter „<datum>__nom" – dieselbe Tabelle, dieselben Rechte,
   nur ein weiterer Schluessel neben „__teams" und den Team-Zeilen.
   Die Aufteilung auf die Teams steckt in TEAMS (md-teams.js); die Team-Zeilen schreibt
   weiterhin teamsAnwenden(), weil Eltern-Ansicht und Liveticker sie lesen. */
function nomKey(){ return spieltagRawDate()+"__nom"; }
async function nomLoad(){
  const tag=spieltagRawDate();
  nomStatus={}; nomOvr=new Set();
  try{
    // Ein Query fuer alle Zeilen des Tages: die globale und (fuer Altbestand) die Team-Zeilen.
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=like.${encodeURIComponent(tag)}*&select=datum,data`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      const global=rows.find(x=>x.datum===nomKey());
      if(global&&global.data){
        const d=kidMapFromIds(global.data); if(Array.isArray(d._ovr))nomOvr=new Set(kidListFromIds(d._ovr)); delete d._ovr; nomStatus=d;
      }else{
        /* Altbestand vor v393: die Nominierung lag je Team. Wer in IRGENDEINEM Team dabei
           war, war an diesem Spieltag dabei – sonst stuende ein alter Spieltag plötzlich leer.
           „dabei" gewinnt deshalb immer gegen ein „nicht" aus einer anderen Team-Zeile. */
        rows.forEach(x=>{
          if(/__teams$/.test(x.datum)||!x.data)return;
          const alt=kidMapFromIds(x.data);
          Object.keys(alt).forEach(name=>{
            if(name==="_ovr")return;
            const st=alt[name];
            if(st==="dabei"||!nomStatus[name])nomStatus[name]=st;
          });
        });
      }
    }
  }catch(e){}
  // HOTFIX 14: strikte Trennung Orga/Match – KEIN pauschales "dabei" mehr. Nur explizit
  // Gesetzte (gespeichert / Eltern-Zusage / Trainer-Override) sind dabei; der Rest bleibt "offen".
  KADER.filter(k=>k.aktiv!==false).forEach(k=>{if(!nomStatus[k.name])nomStatus[k.name]="offen";});
  await nomLoadRsvp();
  await recoveryLoad();   // Return-to-Play: kürzlich krank gemeldete Kinder markieren
  await kapitaenLoad();   // Kapitän dieses Spiels + Fairness-Zählung
  // Eltern-Zusagen automatisch übernehmen – außer wo der Trainer manuell überstimmt hat (nomOvr).
  Object.keys(nomRsvp).forEach(name=>{ if(!nomOvr.has(name)) nomStatus[name]=nomRsvp[name].status==="zugesagt"?"dabei":"nicht"; });
  // C: explizit pausierte Kinder sind raus (außer der Trainer hat manuell überstimmt).
  if(typeof pauseLoad==="function"){ await pauseLoad(); Object.keys(PAUSE_MAP||{}).forEach(name=>{ if(!nomOvr.has(name)) nomStatus[name]="nicht"; }); }
  nomRender();
  await teamsLoad();   // Einteilung gehört zum Datum, nicht zum einzelnen Team
  // Faire Rollen ERST danach: sie fragen über nominierteSpieler() den Kader dieses Teams
  // ab, und den kennt die App erst, wenn teamsLoad die Einteilung geladen hat. Vorher
  // stand hier der ganze Kader in der Auswahl (PO-Meldung v396).
  nomApplyToTools();
  if(document.getElementById("action-panel"))atInit(); // Aktionen fürs neue Datum laden
}
function nomSet(name,status){
  nomStatus[name]=status;nomOvr.add(name);
  if(typeof TEAMS==="object"&&TEAMS){
    // Wer nicht mehr dabei ist, steht in keinem Team – sonst bliebe er in der Kachel stehen.
    if(status!=="dabei")delete TEAMS[name];
    // … und wer zusagt, kommt direkt in ein Team, statt als „pausiert" dazustehen.
    else if(typeof teamPlatzEinsortieren==="function")teamPlatzEinsortieren(name);
  }
  if(typeof teamsSpeichern==="function")teamsSpeichern();
  nomRender();
  if(typeof teamsRender==="function")teamsRender();
  if(typeof spieltagTeamKartenRender==="function")spieltagTeamKartenRender();
  nomApplyToTools();nomSave();
}
async function nomSave(){
  if(!document.getElementById("spieltag-date")?.value)return;
  try{await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum:nomKey(),data:kidMapToIds({...nomStatus,_ovr:kidListToIds([...nomOvr])})})});}catch(e){}
  // Eltern-Ansicht und Ticker lesen die Team-Zeilen – die müssen mitziehen.
  if(typeof teamsSyncBald==="function")teamsSyncBald();
}
/* Wer spielt im GERADE gewaehlten Team? Bis v392 war das die Nominierung selbst, denn die
   lag je Team vor. Seit v393 ist die Nominierung global und die Aufteilung steckt in TEAMS.
   Solange nichts verteilt ist, gilt die ganze Nominierung – so bleibt der Ein-Team-Fall
   unveraendert. Alles, was einen Kader braucht (Rotation, Aufstellung, Blitz-Rating,
   Spielbericht, Aktions-Tracker), haengt an dieser einen Funktion. */
function nominierteSpieler(){
  const dabei=KADER.filter(k=>k.aktiv!==false).map(k=>k.name).filter(n=>nomStatus[n]==="dabei");
  if(typeof TEAMS!=="object"||!TEAMS||!Object.keys(TEAMS).length)return dabei;
  const t=(typeof spieltagTeam!=="undefined")?spieltagTeam:1;
  return dabei.filter(n=>TEAMS[n]===t);
}
/* Nur noch der KOPF der Nominierung: Stand der Eltern-Rückmeldungen und der Knopf, der
   eigene Änderungen verwirft. Die Kinderzeilen selbst leben seit v393 in teamsRender() –
   dort stehen Anwesenheit und Team-Zuordnung in EINER Zeile beieinander.
   Vorher waren es zwei 16-Zeilen-Listen direkt untereinander: oben „dabei/nicht/verletzt",
   unten dieselben Kinder noch einmal mit den Team-Knöpfen. */
function nomRender(){
  const box=document.getElementById("nom-panel");
  if(!box)return;
  const hasRsvp=Object.keys(nomRsvp).length>0;
  const aktiv=KADER.filter(k=>k.aktiv!==false);
  const dabeiAlle=aktiv.filter(k=>nomStatus[k.name]==="dabei").length;
  const offenAlle=aktiv.filter(k=>nomStatus[k.name]==="offen"||nomStatus[k.name]==null).length;
  const c={zugesagt:0,abgesagt:0,krank:0};
  Object.values(nomRsvp).forEach(x=>{if(c[x.status]!=null)c[x.status]++;});
  /* v481: die Kinderliste liegt in einem zugeklappten Block, sobald jemand dabei ist –
     die Teams darunter sind der Arbeitsplatz. Hier nur noch Dabei/Nicht/Verletzt; das Team
     wechselt man in der Team-Karte per Chip. */
  const stCfg={dabei:{lbl:"Dabei",col:"var(--green)"},nicht:{lbl:"Nicht",col:"var(--text3)"},verletzt:{lbl:"Verletzt",col:"var(--red)"}};
  const rvEmo={zugesagt:"✅",abgesagt:"❌",krank:"🤒"};
  const q=n=>(typeof teamQuoteText==="function"&&typeof teamEinsatzText==="function")?`${teamQuoteText(n)} · ${teamEinsatzText(n)}`:"";
  const zeile=n=>{
    const st=nomStatus[n]||"offen";
    const rv=nomRsvp[n]||null;
    const badge=rv?`<span title="Eltern-Rückmeldung: ${esc(rv.status)}${rv.kommentar?" – "+esc(rv.kommentar):""}" style="width:16px;text-align:center;font-size:13px">${rvEmo[rv.status]||""}</span>`:`<span style="width:16px;text-align:center;font-size:12px;color:var(--text3)" title="noch keine Eltern-Antwort">?</span>`;
    const pause=(typeof istPaused==="function"&&istPaused(n))?` <span title="Pausiert – zählt nicht mit" style="font-size:10px;font-weight:700;color:var(--amber)">⏸ bis ${pauseBisLabel(n)}</span>`:"";
    const k=getKader(n);
    return `<div style="padding:6px 0;border-top:var(--border)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">${badge}
        <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600">${k&&k.nr?k.nr+" ":""}${esc(n)}${(typeof istTorwart==="function"&&istTorwart(n))?" 🥅":""}${pause}</span>
        <span style="font-size:10px;color:var(--text2)">${q(n)}</span></div>
      <div style="display:flex;gap:5px">${["dabei","nicht","verletzt"].map(s=>`<button onclick="nomSet('${jsq(n)}','${s}')" aria-pressed="${st===s?"true":"false"}"
        style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:${st===s?"700":"500"};background:${st===s?stCfg[s].col:"var(--surface)"};color:${st===s?"#fff":"var(--text)"}">${stCfg[s].lbl}</button>`).join("")}</div>
    </div>`;
  };
  box.innerHTML=`<details id="nom-dabei" class="tp-tipp"${dabeiAlle?"":" open"}>
    <summary>👥 Wer ist dabei? <b>${dabeiAlle} von ${aktiv.length}</b>${offenAlle?` <span style="font-weight:400;color:var(--amber)">· ${offenAlle} offen</span>`:""}</summary>
    <div>
      <div id="nom-quelle" style="font-size:10.5px;color:var(--text3);margin-bottom:8px;line-height:1.4">📣 Vorbelegt aus den Eltern-Rückmeldungen (zugesagt = Dabei, abgesagt = Nicht, ohne Antwort = offen). <b>Dabei</b> ist die Anwesenheit dieses Spieltags und zählt für die Spiele-Quote.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        ${offenAlle?`<button class="btn btn-sm" id="nom-offene-dabei" onclick="nomOffeneDabei()"><i class="ti ti-users-plus"></i>${offenAlle} Offene auf „Dabei“ setzen</button>`:""}
        ${hasRsvp?`<button class="btn btn-sm" onclick="nomApplyRsvp()" title="Setzt die Nominierung auf den Stand der Eltern-Rückmeldungen zurück">Eltern-Stand: ✅ ${c.zugesagt} ❌ ${c.abgesagt} 🤒 ${c.krank} – übernehmen</button>`:""}
      </div>
      ${aktiv.map(k=>zeile(k.name)).join("")}
    </div>
  </details>`;
}
/* v477: Wer ohne Eltern-Antwort am Platz steht, ist dabei – ein Tipp fuer alle Offenen. */
function nomOffeneDabei(){
  const offen=KADER.filter(k=>k.aktiv!==false&&(nomStatus[k.name]==="offen"||nomStatus[k.name]==null)).map(k=>k.name);
  if(!offen.length){toast("Niemand mehr offen");return;}
  offen.forEach(n=>{ nomStatus[n]="dabei"; nomOvr.add(n); if(typeof teamPlatzEinsortieren==="function")teamPlatzEinsortieren(n); });
  if(typeof teamsSpeichern==="function")teamsSpeichern();
  nomRender();
  if(typeof teamsRender==="function")teamsRender();
  if(typeof spieltagTeamKartenRender==="function")spieltagTeamKartenRender();
  nomApplyToTools();nomSave();
  toast(`${offen.length} Kinder auf „Dabei“ gesetzt`);
}

/* ═══════════════════════════════════
   M1: BLITZTURNIER – schnelles Turnier zum Trainingsabschluss, jetzt mit Zeitbudget-
   Automatik: Budget (15/20/30/40/frei) + 1–4 Felder (FUNiño!) → die Automatik wählt
   Spielzeit (5–10 Min.) und Format. Kürzungsleiter: Spielzeit runter → Felder parallel
   → Finale nur bei Restzeit → 2 Los-Gruppen mit Finale + kleinem Finale → ehrliche
   „braucht X Min. mehr“-Meldung (nie heimlich unter 5 Minuten). Bei mehreren Feldern
   gilt EIN Pfiff für alle (Festival-Praxis). Reines Frontend + localStorage.
═══════════════════════════════════ */
const BLZ_FARBEN=["#1a56db","#dc2626","#059669","#7c3aed","#d97706"];
const BLZ_MIN=5, BLZ_MAX=10, BLZ_W=1; // Spielzeit-Grenzen + Wechselminute zwischen Fenstern
let BLZ=null;
function _blzHeute(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
/* ── Speichern: Gerät UND Server ────────────────────────────────────────────────
   Bisher lag das Turnier nur im localStorage – an kein Datum gebunden, eines auf
   einmal, weg beim Gerätewechsel. Damit war „am Mittwoch für Freitag planen"
   unmöglich. Jetzt hängt es am TERMINDATUM und liegt zusätzlich in der Datenbank.

   Das Datum wird beim Anlegen festgeschrieben (BLZ.datum) und beim Speichern NICHT
   neu aus #tp-date gelesen: sonst wanderte ein offenes Turnier in einen anderen
   Termin, sobald jemand die Terminauswahl umstellt. */
function _blzBindeDatum(){
  const sel=document.getElementById("tp-date");
  return (sel&&sel.value)||_blzHeute();
}
let _blzDbTimer=null;
function blzSave(){
  try{localStorage.setItem("adler_blitz",JSON.stringify(BLZ));}catch(e){}
  clearTimeout(_blzDbTimer);
  _blzDbTimer=setTimeout(_blzDbSpeichern,1200);   // gebündelt: ein Tipp = ein Schreibvorgang
}
async function _blzDbSpeichern(){
  if(!BLZ||!BLZ.datum)return;
  if(typeof sbToken!=="function"||!sbToken())return;   // ohne Anmeldung bleibt es lokal
  try{
    await fetch(`${SB_URL}/rest/v1/trainingsturnier?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({datum:BLZ.datum,data:_blzMit(BLZ,kidListToIds),updated_at:new Date().toISOString()})});
  }catch(e){/* lokal ist gespeichert – der Server ist die Kür, nicht die Pflicht */}
}
async function _blzDbLaden(datum){
  if(typeof sbToken!=="function"||!sbToken())return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsturnier?datum=eq.${encodeURIComponent(datum)}&select=data`,{headers:sbAuthHeaders()});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return null;
    if(!r.ok)return null;
    const rows=await r.json();
    return (rows[0]&&rows[0].data)?_blzMit(rows[0].data,kidListFromIds):null;
  }catch(e){return null;}
}
/* Teams in der Datenbank nach kader.id, im Speicher nach Name; Trainer-Marken („🧢 …")
   und Eltern-Teams bleiben, wie sie sind. */
function _blzMit(b,f){
  if(!b||!Array.isArray(b.teams))return b;
  return {...b,teams:b.teams.map(t=>({...t,spieler:Array.isArray(t.spieler)?f(t.spieler):t.spieler}))};
}
/* Wurde für DIESEN Termin schon etwas vorbereitet – auf einem anderen Gerät oder vor
   Tagen? Dann nachladen. Nur wenn lokal nichts zu diesem Termin liegt: was der Trainer
   gerade in der Hand hat, wird nie vom Server überschrieben. */
async function _blzVomServer(datum){
  const vom=await _blzDbLaden(datum);
  if(!vom||!document.getElementById("blitz-modal"))return;
  vom.datum=datum;
  BLZ=vom;
  try{localStorage.setItem("adler_blitz",JSON.stringify(BLZ));}catch(e){}
  if(BLZ.phase==="setup")_blzTeamsAufraeumen();
  blzRender();
  if(typeof toast==="function")toast("Vorbereitetes Turnier für diesen Termin geladen ✓");
}
function _blzLoad(){
  try{
    // Bewusst KEINE Tages-Grenze mehr: ein vorbereitetes Turnier (z. B. am Vorabend
    // angelegt) wartet, bis es am Platz geöffnet wird. Weg geht es nur über
    // „Turnier beenden“ oder „Neu starten“.
    const s=JSON.parse(localStorage.getItem("adler_blitz")||"null");
    if(s){
      // Migration älterer Stände (vor der Zeitbudget-Automatik)
      if(s.budget==null)s.budget=0;
      if(!s.felder)s.felder=1;
      if(!s.modus)s.modus="rr";
      if(!s.spielmodus)s.spielmodus="kinder";
      if(!s.trainer)s.trainer=[];
      if(!s.spielform)s.spielform="frei";
      if(!s.elternAnzahl)s.elternAnzahl=1;
      if(s.spielmodus!=="duell")s.teams=(s.teams||[]).filter(t=>!t.eltern); // Kinder-Modus nie mit Eltern-Team
      (s.plan||[]).forEach((p,i)=>{if(!p.phase)p.phase="runde";if(p.slot==null)p.slot=i;if(!p.feld)p.feld=1;});
      return s;
    }
  }catch(e){}
  return null;
}
function _blzDatumKurz(d){
  try{ return new Date(d+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}); }
  catch(e){ return d; }
}
/* Spielerpool: die Anwesenheit des GEPLANTEN Trainings (nur wer da ist), sonst alle
   aktiven Kader-Kinder.

   Vorher stand hier _blzHeute(). Ein Blitzturnier wird aber am Vorabend geplant – die
   Anwesenheit steht dann schon fuer den Trainingstag, fuer HEUTE gibt es keine. Der
   Griff ins Leere fiel still auf „ganzer Kader" zurueck und teilte damit auch Kinder
   ein, die fuer den Tag ausdruecklich abgemeldet waren. */
function _blzPoolDatum(){
  const sel=document.getElementById("tp-date");
  return (sel&&sel.value)||_blzHeute();
}
function _blzPool(){
  const aktive=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false).map(k=>k.name);
  try{
    const datum=_blzPoolDatum();
    const day=(typeof AW_DATA!=="undefined"?AW_DATA:{})[datum]||{};
    const da=aktive.filter(n=>day[n]&&day[n].da===true);
    if(da.length>=4)return {namen:da,quelle:"Anwesenheit "+_blzDatumKurz(datum)};
  }catch(e){}
  return {namen:aktive,quelle:"ganzer Kader"};
}
/* Eine gebaute Einteilung bleibt gespeichert – auch ueber Tage. Wird ein Kind danach
   inaktiv gesetzt oder fuer den Tag abgemeldet, stand es trotzdem weiter in seinem Team:
   die Teams wurden beim Oeffnen nie gegen den aktuellen Pool gehalten. Trainer (🧢) und
   von Hand angelegte Teams bleiben unangetastet. */
let _blzEntfernt=[], _blzErgaenzt=[];
function _blzTeamsAufraeumen(){
  _blzEntfernt=[]; _blzErgaenzt=[];
  if(!BLZ||!Array.isArray(BLZ.teams))return;
  const pool=_blzPool();
  const erlaubt=new Set(pool.namen);
  const ziele=BLZ.teams.filter(t=>!t.eltern);
  if(!ziele.length)return;

  // a) Wer nicht (mehr) in den Pool gehoert, fliegt raus
  ziele.forEach(t=>{
    t.spieler=(t.spieler||[]).filter(n=>{
      if(typeof n!=="string"||n.indexOf("🧢 ")===0)return true;   // Trainer bleiben
      if(erlaubt.has(n))return true;
      _blzEntfernt.push(n);
      return false;
    });
  });

  /* b) Und der umgekehrte Fall: wer laut Anwesenheit DA ist, aber in der gespeicherten
        Einteilung fehlt, stuende sonst ohne Team am Platz. Kommt jeweils ins kleinste. */
  const drin=new Set(); ziele.forEach(t=>(t.spieler||[]).forEach(n=>drin.add(n)));
  pool.namen.forEach(n=>{
    if(drin.has(n))return;
    let ziel=ziele[0];
    ziele.forEach(t=>{ if((t.spieler||[]).length<(ziel.spieler||[]).length)ziel=t; });
    ziel.spieler=(ziel.spieler||[]).concat(n);
    _blzErgaenzt.push(n);
  });

  if(_blzEntfernt.length||_blzErgaenzt.length){
    // Die Einteilung deckt sich jetzt mit dem Pool – dann darf die Quelle das auch sagen.
    BLZ.quelle=pool.quelle;
    blzSave();
  }
}
/* Fisher-Yates. Ohne das war „🎲 Neu mischen" wirkungslos: die Verteilung unten ist
   deterministisch, und bei U9 liefert teamStaerke für alle 0 – also war die Reihenfolge
   immer die Kader-Reihenfolge und jede Neuverteilung erzeugte exakt dieselben Teams.
   Der Knopf reagierte, das Ergebnis änderte sich nie. */
function _blzMischen(liste){
  const a=liste.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
// Ausgewogene Auto-Einteilung: stärkstes Kind ins momentan schwächste Team (wie Spieltag-Einteilung)
function _blzAuto(n){
  const pool=_blzPool();
  const st=x=>(typeof teamStaerke==="function")?Math.max(0,teamStaerke(x)):0;
  const teams=[];for(let i=0;i<n;i++)teams.push({name:"Adler "+(i+1),spieler:[],fest:false});
  const summe=new Array(n).fill(0);
  /* Erst mischen, dann nach Stärke sortieren: Array.sort ist stabil, also bleibt die
     Balance erhalten (stärkstes Kind zuerst) und nur GLEICH starke Kinder landen in
     wechselnder Reihenfolge – genau das, was „neu mischen" meint. */
  _blzMischen(pool.namen).sort((a,b)=>st(b)-st(a)).forEach(name=>{
    let ziel=0;for(let t=1;t<n;t++){if(teams[t].spieler.length<teams[ziel].spieler.length||(teams[t].spieler.length===teams[ziel].spieler.length&&summe[t]<summe[ziel]))ziel=t;}
    teams[ziel].spieler.push(name);summe[ziel]+=st(name);
  });
  return {teams,quelle:pool.quelle};
}
/* ── PLATZRECHNER ───────────────────────────────────────────────────────────────
   Wie viele Kinder stehen bei dieser Feld-/Spielform-Kombination GLEICHZEITIG auf
   dem Platz? Die Frage entscheidet vor dem Aufbauen, ob eine Kombination ueberhaupt
   aufgeht – und sie wurde bisher nirgends beantwortet. Beispiel aus der Praxis:
   zwei FUNiño-Felder plus ein 4+1-Feld braucht 6+6+10 = 22 Kinder. Bei 15 im Kader
   geht das nicht, egal wie gut der Spielplan ist.

   Die Mannschaftsgroesse steht schon in BLZ_SPIELFORM (funino:3, f4:5 …) – hier wird
   sie nur zu Ende gerechnet, statt sie im Kopf des Trainers zu lassen. */
function _blzSpielformKurz(label){ return String(label||"").split(" · ")[0]; }
function _blzPlatz(){
  const form=BLZ_SPIELFORM[BLZ.spielform];
  const groesse=(form||[])[1]||0;               // 0 = „frei", keine feste Groesse
  const felder=Math.max(1,BLZ.felder||1);
  const pool=_blzPool();
  const trainerMit=(BLZ.trainer||[]).length;
  const da=pool.namen.length+trainerMit;
  const proFeld=groesse*2;
  const bedarf=proFeld*felder;
  return {groesse,felder,proFeld,bedarf,da,kinder:pool.namen.length,trainerMit,
          quelle:pool.quelle,label:form?form[0]:"",
          passtFelder:proFeld?Math.floor(da/proFeld):0,
          fehlt:Math.max(0,bedarf-da), uebrig:Math.max(0,da-bedarf)};
}
/* „es soll immer gespielt werden mit kurzen Pausen zum Trinken und Platzwechsel."
   Ob das aufgeht, haengt an ZWEI Bedingungen – gemessen, nicht geschaetzt:
     • gerade Teamzahl: bei ungerader hat in JEDER Runde ein Team spielfrei,
       egal wie viele Felder stehen;
     • genug Felder: es laufen hoechstens so viele Spiele wie Felder, also
       braucht es Teams/2 Felder, damit kein Team wartet.
   Ein Kind auf der Bank eines spielenden Teams zaehlt als im Spiel (fliegender
   Wechsel) – daneben steht nur, wessen TEAM pausiert. */
function _blzDurchspielen(){
  if(BLZ.spielmodus==="duell")return null;
  const teams=BLZ.teams.filter(t=>!t.eltern).length;
  if(teams<2)return null;
  const felder=Math.max(1,BLZ.felder||1);
  const noetig=Math.ceil(teams/2);
  const gerade=teams%2===0;
  const v=_blzTeamVorschlag();
  return {teams,felder,noetig,gerade,ok:gerade&&felder>=noetig,
          vTeams:v?v.teams:null,vFelder:v?v.felder:null};
}
function _blzDurchspielHtml(){
  const d=_blzDurchspielen(); if(!d)return "";
  if(d.ok){
    return `<div style="font-size:11.5px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;padding:7px 9px;margin-bottom:8px;line-height:1.45">
      ▶️ <b>Alle Teams sind durchgehend im Spiel</b> – kein Team wartet. Zwischen den Runden liegt ${BLZ_W} Min. für Trinken und Platzwechsel.</div>`;
  }
  const grund=!d.gerade
    ? `Bei <b>${d.teams} Teams</b> (ungerade) hat in jeder Runde eines spielfrei – daran ändert auch ein zusätzliches Feld nichts.`
    : `<b>${d.teams} Teams</b> brauchen <b>${d.noetig} Felder</b>, damit alle gleichzeitig spielen – aufgebaut ${d.felder}.`;
  const rat=(d.vTeams&&d.vFelder)
    ? ` Durchgehend spielen alle mit <b>${d.vTeams} Teams auf ${d.vFelder} Feld${d.vFelder===1?"":"ern"}</b>.`:"";
  return `<div style="font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:7px 9px;margin-bottom:8px;line-height:1.45">
    ⏸️ ${grund}${rat}</div>`;
}
function _blzPlatzHtml(){
  const p=_blzPlatz();
  // Pro-Feld-Bedarf aller Spielformen: die Grundlage fuer eine Kombination aus
  // verschiedenen Feldern, die von Hand aufgebaut wird.
  const tabelle=Object.keys(BLZ_SPIELFORM).map(k=>BLZ_SPIELFORM[k]).filter(v=>v[1]>0)
    .map(v=>`${esc(_blzSpielformKurz(v[0]))} <b>${v[1]*2}</b>`).join(" · ");
  /* Die farbigen Kaesten haben einen FEST hellen Grund. var(--text3) waere dort im
     dunklen Modus hell auf hell (2,8:1 – Hausregel verlangt 4,5:1), deshalb je Kasten
     eine feste Fussfarbe; nur der neutrale Kasten folgt dem Thema. */
  const fuss=farbe=>`<div style="font-size:10.5px;color:${farbe};margin-top:5px">Pro Feld: ${tabelle} — zum Kombinieren verschiedener Felder zusammenzählen.</div>`;
  if(!p.groesse){
    return `<div style="font-size:11.5px;color:var(--text2);background:var(--surface2);border:var(--border-s);border-radius:9px;padding:7px 9px;margin-bottom:8px;line-height:1.4">
      📐 Ohne feste Spielform lässt sich der Platzbedarf nicht rechnen.${fuss("var(--text3)")}</div>`;
  }
  const wer=`${p.kinder} Kind${p.kinder===1?"":"er"}`+(p.trainerMit?` + ${p.trainerMit} Trainer`:"");
  const kopf=`${p.felder} Feld${p.felder===1?"":"er"} × ${esc(_blzSpielformKurz(p.label))} = <b>${p.bedarf}</b> gleichzeitig auf dem Platz`;
  if(p.fehlt>0){
    const rat=p.passtFelder>=1
      ? `Es ${p.passtFelder===1?"passt":"passen"} <b>${p.passtFelder} Feld${p.passtFelder===1?"":"er"}</b>.`
      : `Für ein volles Feld fehlen Kinder.`;
    return `<div style="font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:7px 9px;margin-bottom:8px;line-height:1.45">
      📐 ${kopf}.<br>${wer} dabei (${esc(p.quelle)}) → <b>${p.fehlt} zu wenig</b>. ${rat}${fuss("#8a5a17")}</div>`;
  }
  const rest=p.uebrig?`<b>${p.uebrig}</b> wechseln durch`:`alle spielen gleichzeitig`;
  return `<div style="font-size:11.5px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;padding:7px 9px;margin-bottom:8px;line-height:1.45">
    📐 ${kopf}.<br>${wer} dabei (${esc(p.quelle)}) → ${rest}.${fuss("#2f6b45")}</div>`;
}
/* Struktur-Änderung (Modus, Team-Anzahl) macht einen gebauten Spielplan ungültig.
   Ohne Ergebnisse wird er still verworfen; mit Ergebnissen erst nach Rückfrage. */
function _blzPlanVerwerfen(){
  if(!BLZ.plan||!BLZ.plan.length)return true;
  const hatErg=BLZ.plan.some(p=>p.ta!=null);
  if(hatErg&&!confirm("Es gibt schon Ergebnisse – diese Änderung verwirft Spielplan UND Ergebnisse. Fortfahren?"))return false;
  BLZ.plan=[];
  return true;
}
/* Anwesende Trainer als Mitspieler in die Kinder-Teams verteilen (🧢-Kennung).
   Reihum ins jeweils kleinste Team; per Tipp wie jedes Kind weiter verschiebbar. */
function _blzTrainerVerteilen(){
  const ziele=BLZ.teams.filter(t=>!t.eltern);
  if(!ziele.length)return;
  (BLZ.trainer||[]).forEach(name=>{
    const tag="🧢 "+name;
    if(BLZ.teams.some(t=>t.spieler.indexOf(tag)>=0))return;
    let ziel=ziele[0];
    ziele.forEach(t=>{if(t.spieler.length<ziel.spieler.length)ziel=t;});
    ziel.spieler.push(tag);
  });
}
function blzTrainerToggle(name){
  BLZ.trainer=BLZ.trainer||[];
  const ix=BLZ.trainer.indexOf(name);
  if(ix>=0){
    BLZ.trainer.splice(ix,1);
    const tag="🧢 "+name;
    BLZ.teams.forEach(t=>{t.spieler=t.spieler.filter(s=>s!==tag);});
  }else{
    BLZ.trainer.push(name);
    _blzTrainerVerteilen();
  }
  blzSave();blzRender();
}
/* Duell-Modus: 1–4 Eltern-Teams (abstrakt, ohne Kader) + 1–4 Kinder-Teams; gespielt
   wird IMMER NUR Kinder gegen Eltern – bei gleich vielen Teams laufen die Duelle
   parallel auf mehreren Feldern (13 Kinder + 13 Eltern, FUNiño, 4 Felder!). */
function _blzDuellTeams(nKids){
  const m=Math.min(4,Math.max(1,BLZ.elternAnzahl||1));
  const alteEltern=BLZ.teams.filter(t=>t.eltern);
  const eltern=[];
  for(let i=0;i<m;i++)eltern.push(alteEltern[i]||{name:m>1?"Eltern "+(i+1):"Eltern",spieler:[],fest:false,eltern:true});
  // Standard-Namen an die neue Anzahl anpassen (umbenannte Teams bleiben unangetastet)
  if(m===1&&/^Eltern \d$/.test(eltern[0].name))eltern[0].name="Eltern";
  if(m>1)eltern.forEach((t,i)=>{if(t.name==="Eltern")t.name="Eltern "+(i+1);});
  const a=_blzAuto(nKids);
  BLZ.teams=eltern.concat(a.teams);
  BLZ.quelle=a.quelle;
  _blzTrainerVerteilen();
}
function blzElternAnzahl(m){if(!_blzPlanVerwerfen())return;BLZ.elternAnzahl=m;_blzDuellTeams(BLZ.anzahl);blzSave();blzRender();}
const BLZ_SPIELFORM={f2:["2 gegen 2 · ohne Torwart",2],funino:["FUNiño (3 gegen 3)",3],f4:["4+1",5],f5:["5+1",6],frei:["frei",0]};
function blzSpielform(sf){BLZ.spielform=sf;blzSave();blzRender();}
// Team-Größen-Vorschlag aus Kinderzahl + Spielform (13 Kinder, FUNiño → 4 Teams)
function _blzTeamVorschlag(){
  const groesse=(BLZ_SPIELFORM[BLZ.spielform]||[])[1];
  if(!groesse)return null;
  const pool=_blzPool().namen.length;
  if(!pool)return null;
  const max=BLZ.spielmodus==="duell"?4:6; // 2 gegen 2 braucht viele Teams (13 Kinder → 6)
  if(BLZ.spielmodus==="duell")
    return {pool,teams:Math.min(max,Math.max(1,Math.round(pool/groesse)))};
  /* GERADE Teamzahl. Bei ungerader Zahl hat in jeder Runde ein Team spielfrei – der
     PO-Wunsch „es soll immer gespielt werden" ist dann strukturell unmöglich, egal wie
     viele Felder aufgebaut sind. Vorher rundete hier Math.round(15/3) auf 5 Teams und
     schrieb damit ein Dauer-Pausenteam fest.
     Grundlage ist, wie viele Teams der Pool VOLL besetzen kann (abrunden), davon die
     nächstkleinere gerade Zahl; die Restkinder verteilen sich als Auswechsler. */
  const passen=Math.floor(pool/groesse);
  const teams=Math.min(max-(max%2),Math.max(2,passen-(passen%2)));
  return {pool,teams,felder:teams/2};
}
function blzModus(m){
  if(m===BLZ.spielmodus)return;
  if(!_blzPlanVerwerfen())return;
  BLZ.spielmodus=m;
  if(m==="duell"){BLZ.anzahl=Math.min(3,Math.max(1,BLZ.anzahl===4?3:BLZ.anzahl));_blzDuellTeams(BLZ.anzahl);}
  else{BLZ.teams=BLZ.teams.filter(t=>!t.eltern);if(BLZ.teams.filter(t=>!t.fest).length<2)blzAnzahl(Math.max(2,BLZ.anzahl));}
  blzSave();blzRender();
}
// Berger-Rotation: jeder gegen jeden, fair verteilt (niemand spielt zweimal direkt hintereinander)
function _blzRR(n){
  const ids=[...Array(n).keys()];if(n%2)ids.push(-1);
  const runden=ids.length-1,halb=ids.length/2,out=[];
  let arr=ids.slice();
  for(let r=0;r<runden;r++){
    for(let i=0;i<halb;i++){const a=arr[i],b=arr[arr.length-1-i];if(a!==-1&&b!==-1)out.push([a,b]);}
    arr=[arr[0],arr[arr.length-1]].concat(arr.slice(1,arr.length-1));
  }
  return out;
}
/* Echte Spiele in Zeitfenster packen: bis zu <felder> parallel, kein Team doppelt je
   Fenster. Liefert die Anzahl Fenster zurück; Finals bekommen danach eigene Fenster. */
function _blzSlots(matches,felder){
  const queue=matches.slice(); let slot=0;
  while(queue.length&&slot<100){
    const belegt=new Set(); let f=1;
    for(let i=0;i<queue.length&&f<=felder;){
      const m=queue[i];
      if(!belegt.has(String(m.a))&&!belegt.has(String(m.b))){
        m.slot=slot;m.feld=f++;belegt.add(String(m.a));belegt.add(String(m.b));
        queue.splice(i,1);continue;
      }
      i++;
    }
    slot++;
  }
  return matches.length?Math.max(...matches.map(m=>m.slot))+1:0;
}
/* Zeitbudget-Automatik. Liefert {ms,slots,z,modus,dauer,hinweis,rueckrunde}:
   ms = fertige Spielliste (Finals als Platzhalter a/b=null, werden live aufgelöst),
   hinweis = fehlende Minuten, wenn selbst das kürzeste faire Format nicht passt. */
function _blzPlanen(n,budget,felder,spielmodus,elternAnzahl){
  /* Mit weniger als 2 Teams gibt es keine Begegnung. Ohne diesen Riegel rechnete zMax(0)
     durch 0 und die Vorschau meldete grün „à 10 Min. → 0 Spiele" statt zu sagen, was fehlt. */
  if(!(n>=2))return {ms:[],slots:0,z:null,modus:"rr",dauer:0,hinweis:null,fehler:"Mindestens 2 Teams nötig"};
  const dauer=(slots,z)=>slots*z+Math.max(0,slots-1)*BLZ_W;
  const zMax=slots=>Math.floor((budget-(slots-1)*BLZ_W)/slots);
  /* Duell-Modus (Kinder gegen Eltern): Teams 0..m-1 = Eltern-Teams, dahinter die
     Kinder-Teams. Je Durchgang spielt JEDES Kinder-Team genau einmal – gegen ein
     rotierendes Eltern-Team (nie Kind gegen Kind, nie Eltern gegen Eltern). Bei
     gleich vielen Eltern-Teams laufen die Duelle parallel auf den Feldern; die
     Fenster-Packung verhindert, dass ein Eltern-Team doppelt im selben Fenster steht. */
  if(spielmodus==="duell"){
    const m=Math.max(1,elternAnzahl||1);
    const nKids=Math.max(1,n-m);
    const runde=d=>{
      const ms=[];
      for(let r=0;r<d;r++)for(let k=0;k<nKids;k++)ms.push({a:(k+r)%m,b:m+k,phase:"runde",ta:null,tb:null});
      const slots=_blzSlots(ms,felder);
      return {ms,slots};
    };
    if(!budget||budget<=0)return {...runde(2),z:null,modus:"duell",dauer:null,hinweis:null,rueckrunde:false};
    for(let d=3;d>=1;d--){
      const v=runde(d), z=zMax(v.slots);
      if(z>=BLZ_MIN){const z2=Math.min(BLZ_MAX,z);return {...v,z:z2,modus:"duell",dauer:dauer(v.slots,z2),hinweis:null,rueckrunde:false};}
    }
    const v=runde(1), braucht=dauer(v.slots,BLZ_MIN);
    return {...v,z:BLZ_MIN,modus:"duell",dauer:braucht,hinweis:braucht-budget,rueckrunde:false};
  }
  const bau=modus=>{
    let ms=[],finals=[];
    if(modus==="gruppen"){
      const na=Math.ceil(n/2);
      const A=[...Array(na).keys()],B=[...Array(n-na).keys()].map(i=>i+na);
      const ra=_blzRR(A.length).map(([x,y])=>({a:A[x],b:A[y],phase:"gruppeA",ta:null,tb:null}));
      const rb=_blzRR(B.length).map(([x,y])=>({a:B[x],b:B[y],phase:"gruppeB",ta:null,tb:null}));
      const max=Math.max(ra.length,rb.length);
      for(let i=0;i<max;i++){if(ra[i])ms.push(ra[i]);if(rb[i])ms.push(rb[i]);}
      /* PO: „beim Training soll es kein klassisches Finale geben, damit keine Kinder am
         Ende nur zugucken müssen." Vorher standen hier kleines Finale + Finale – bei einem
         Feld zwei Zeitfenster, in denen von 15 Kindern 9 danebenstanden. Jetzt spielen die
         Gruppen ihre Runde zu Ende und hören gemeinsam auf. */
      finals=[];
    }else if(n===2){
      ms=[{a:0,b:1,phase:"runde",ta:null,tb:null},{a:1,b:0,phase:"runde",ta:null,tb:null}];
    }else{
      ms=_blzRR(n).map(([a,b])=>({a,b,phase:"runde",ta:null,tb:null}));
    }
    let slots=_blzSlots(ms,felder);
    finals.forEach(f2=>{f2.slot=slots++;f2.feld=1;});
    return {ms:ms.concat(finals),slots};
  };
  // Ohne Budget (frei): volles Programm, Spielzeit stellt der Trainer selbst
  if(!budget||budget<=0){const v0=bau("rr");return {...v0,z:null,modus:"rr",dauer:null,hinweis:null,rueckrunde:false};}
  /* Stufe 1: volle Runde, Spielzeit 10 → 5. Bleibt Zeit übrig, geht sie in eine
     RÜCKRUNDE statt in ein Finale. Ein Finale beschäftigt zwei Teams; alle anderen
     schauen zu – genau das soll beim Training nicht passieren. Eine Rückrunde
     beschäftigt wieder alle. */
  const v=bau("rr");
  let z=zMax(v.slots);
  if(z>=BLZ_MIN){
    if(n>=3){
      const hin=v.ms.filter(m=>m.phase==="runde");
      const rueck=hin.map(m=>({a:m.b,b:m.a,phase:"runde",ta:null,tb:null}));
      const alle=hin.concat(rueck);
      const slots2=_blzSlots(alle,felder);          // verteilt Fenster und Felder neu
      const z2=zMax(slots2);
      if(z2>=BLZ_MIN){
        const zR=Math.min(BLZ_MAX,z2);
        return {ms:alle,slots:slots2,z:zR,modus:"rr",dauer:dauer(slots2,zR),hinweis:null,rueckrunde:true};
      }
      _blzSlots(v.ms,felder);                        // Fensterzuteilung wiederherstellen
    }
    z=Math.min(BLZ_MAX,z);
    return {...v,z,modus:"rr",dauer:dauer(v.slots,z),hinweis:null,rueckrunde:false};
  }
  // Stufe 2 (ab 4 Teams): 2 Los-Gruppen + kleines Finale + Finale – jedes Team gleich viele Spiele
  if(n>=4){
    const g=bau("gruppen");
    const zg=zMax(g.slots);
    if(zg>=BLZ_MIN){const z2=Math.min(BLZ_MAX,zg);return {...g,z:z2,modus:"gruppen",dauer:dauer(g.slots,z2),hinweis:null,rueckrunde:false};}
    const braucht=dauer(g.slots,BLZ_MIN);
    return {...g,z:BLZ_MIN,modus:"gruppen",dauer:braucht,hinweis:braucht-budget,rueckrunde:false};
  }
  // Stufe 3 (2–3 Teams): ehrlich sagen, was das kürzeste faire Format braucht
  if(n===2){
    const eins={ms:[{a:0,b:1,phase:"runde",ta:null,tb:null,slot:0,feld:1}],slots:1};
    const z1=Math.min(BLZ_MAX,budget);
    if(z1>=BLZ_MIN)return {...eins,z:z1,modus:"rr",dauer:z1,hinweis:null,rueckrunde:false};
    return {...eins,z:BLZ_MIN,modus:"rr",dauer:BLZ_MIN,hinweis:BLZ_MIN-budget,rueckrunde:false};
  }
  const braucht=dauer(v.slots,BLZ_MIN);
  return {...v,z:BLZ_MIN,modus:"rr",dauer:braucht,hinweis:braucht-budget,rueckrunde:false};
}
// Vorschau-Text für das Setup (transparent: Format, Spielzeit, Gesamtdauer, Warnung)
function _blzVorschauHtml(){
  if(!BLZ.budget)return `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Freies Spiel: Du stellst die Spielzeit selbst ein – ohne Zeitbudget, ohne Automatik.</div>`;
  const p=_blzPlanen(BLZ.teams.length,BLZ.budget,BLZ.felder||1,BLZ.spielmodus,BLZ.teams.filter(t=>t.eltern).length);
  if(p.fehler)return `<div style="background:#fef3c7;color:#92400e;border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:700;margin-bottom:8px">⚠️ ${esc(p.fehler)} – lege noch ein Team an.</div>`;
  const nKids=BLZ.teams.filter(t=>!t.eltern).length;
  const fmt=p.modus==="duell"?`Kinder gegen Eltern – ${Math.round(p.ms.length/Math.max(1,nKids))} Durchgang${p.ms.length/Math.max(1,nKids)>1?"e":""} je Kinder-Team`
    :p.modus==="gruppen"?"2 Los-Gruppen, jede Gruppe für sich":(BLZ.teams.length===2?(p.slots===1?"ein Spiel":"Hin- und Rückspiel"):"jeder gegen jeden"+(p.rueckrunde?" + Rückrunde":""));
  const felderTxt=(BLZ.felder||1)>1?` · ${BLZ.felder} Felder, ein Pfiff für alle`:"";
  // BLZ_W gab es immer, benannt wurde es nie – der Trainer sah nur, dass die Rechnung
  // nicht ganz aufging. Es ist die Trinkpause zwischen den Runden.
  if(p.hinweis>0)return `<div style="font-size:12px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 10px;margin-bottom:8px">⏰ Fair (min. ${BLZ_MIN} Min. je Spiel) braucht das kürzeste Format <b>${p.dauer} Min.</b> – das sind <b>${p.hinweis} Min. mehr</b> als geplant. Budget erhöhen, ein Feld dazu – oder bewusst überziehen und trotzdem starten.</div>`;
  return `<div style="font-size:12px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;margin-bottom:8px">✅ Vorschlag: <b>${fmt}</b> à <b>${p.z} Min.</b> → ${p.ms.length} Spiele, ca. <b>${p.dauer} von ${BLZ.budget} Min.</b>${felderTxt}</div>`;
}
function blitzOpen(vorgabeBudget){
  const alt=_blzLoad();
  const datum=_blzBindeDatum();
  /* Ein Turnier gehört jetzt zu EINEM Termin. Der lokale Stand zählt deshalb nur,
     wenn er zu diesem Termin gehört – sonst zeigte die App beim Freitagstermin das
     Turnier vom Mittwoch. Ausnahme: ein LAUFENDES Turnier mit Ergebnissen bleibt in
     jedem Fall stehen; mitten im Turnier darf nichts verschwinden. */
  const laeuft=!!(alt&&(alt.plan||[]).some(x=>x.ta!=null));
  const lokalPasst=!!(alt&&(alt.datum===datum||laeuft));
  if(lokalPasst){BLZ=alt;}
  else{const a=_blzAuto(2);BLZ={datum:_blzBindeDatum(),phase:"setup",spielmodus:"kinder",anzahl:2,elternAnzahl:1,spielform:"frei",runde:8,budget:20,felder:1,modus:"rr",quelle:a.quelle,teams:a.teams,trainer:[],plan:[]};blzSave();}
  // Aus dem Trainingsplan geöffnet: die Dauer des Abschluss-Slots wird zum Zeitbudget
  if(vorgabeBudget>0&&BLZ.phase==="setup"){BLZ.budget=Math.round(vorgabeBudget);blzSave();}
  if(!BLZ.datum)BLZ.datum=_blzBindeDatum();          // Altbestand ohne Termin-Bindung
  if(alt&&BLZ.phase==="setup")_blzTeamsAufraeumen(); // gespeicherte Teams gegen den heutigen Pool halten
  document.getElementById("blitz-modal")?.remove();
  const m=document.createElement("div");m.id="blitz-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Trainingsturnier");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto;overflow-x:hidden;box-sizing:border-box">
    ${mdlHead("blitz-modal","🏆","Trainingsturnier","Vorab planen und speichern – die Automatik baut den Spielplan","#d97706")}
    <div id="blitz-body" style="max-width:100%;overflow-x:hidden"></div>
  </div>`;
  document.body.appendChild(m);
  blzRender();
  // Nur nachladen, wenn lokal nichts zu diesem Termin lag: was der Trainer gerade in
  // der Hand hat, wird nie vom Server überschrieben.
  if(!lokalPasst)_blzVomServer(datum);
}
function blzRender(){
  const el=document.getElementById("blitz-body");if(!el||!BLZ)return;
  if(BLZ.phase!=="setup")_blzResolve();
  el.innerHTML=(BLZ.phase==="setup")?_blzSetupHtml():_blzLiveHtml();
}
function _blzSetupHtml(){
  const chip=(aktiv,label,onclick)=>`<button onclick="${onclick}" style="flex:1;min-width:30%;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;background:${aktiv?"#d97706":"var(--surface2)"};color:${aktiv?"#fff":"var(--text2)"}">${label}</button>`;
  const duell=BLZ.spielmodus==="duell";
  const vorschlag=_blzTeamVorschlag();
  const mChips=chip(!duell,"⚽ Kinder-Turnier","blzModus('kinder')")+chip(duell,"👨‍👩‍👧 Kinder gegen Eltern","blzModus('duell')");
  const nChips=(duell?[1,2,3,4]:[2,3,4,5,6]).map(n=>chip(BLZ.anzahl===n,n+(duell?" Kinder-Team"+(n>1?"s":""):" Teams")+(vorschlag&&vorschlag.teams===n?" ✦":""),`blzAnzahl(${n})`)).join("");
  const eChips=[1,2,3,4].map(m=>chip((BLZ.elternAnzahl||1)===m,m+" Eltern-Team"+(m>1?"s":""),`blzElternAnzahl(${m})`)).join("");
  const sfChips=Object.entries(BLZ_SPIELFORM).map(([k,v])=>chip((BLZ.spielform||"frei")===k,v[0],`blzSpielform('${k}')`)).join("");
  /* 25 und 35 ergänzt (PO): die Sprünge 20→30→40 waren für einen Abschluss-Slot zu
     grob. Die Automatik rechnet sie ohne Zusatzarbeit mit – geprüft über alle 7 Budgets
     × 5 Teamzahlen × 3 Feldzahlen: die Gesamtdauer bleibt im Budget, und wo es nicht
     reicht, wird weiterhin ehrlich gesagt, wie viele Minuten fehlen. */
  const bChips=[10,15,20,25,30,35,40,0].map(b=>chip((BLZ.budget||0)===b,b?b+" Min.":"frei",`blzBudget(${b})`)).join("");
  const fChips=[1,2,3,4].map(f=>chip((BLZ.felder||1)===f,f+(f===1?" Feld":" Felder"),`blzFelder(${f})`)).join("");
  const trainerChips=(typeof TRAINER!=="undefined"&&TRAINER.length)?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">Trainer spielen mit <span style="font-weight:400;text-transform:none;letter-spacing:0">(landen erst bei den Kindern – antippen schiebt sie weiter${duell?", auch in die Eltern-Teams":""})</span></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${TRAINER.map(t=>`<button onclick="blzTrainerToggle('${jsq(t)}')" style="min-height:44px;padding:6px 12px;border:1px solid var(--rand-bedien);border-radius:18px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;background:${(BLZ.trainer||[]).indexOf(t)>=0?"#d97706":"var(--surface2)"};color:${(BLZ.trainer||[]).indexOf(t)>=0?"#fff":"var(--text2)"}">🧢 ${esc(t)}</button>`).join("")}</div>`:"";
  const nEltern=BLZ.teams.filter(t=>t.eltern).length;
  const teamKarte=(t,i)=>`<div style="border:var(--border-s);border-left:4px solid ${t.eltern?"#7c3aed":BLZ_FARBEN[i%BLZ_FARBEN.length]};border-radius:12px;padding:8px 10px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="blzRename(${i})" title="Team umbenennen" style="border:none;background:transparent;font-family:inherit;font-size:13.5px;font-weight:800;color:var(--text);cursor:pointer;min-height:44px;padding:0;margin:-8px 0">${t.eltern?"👨‍👩‍👧 ":""}${esc(t.name)} ✏️</button>
        <span style="margin-left:auto;font-size:11px;color:var(--text3)">${t.eltern?(t.spieler.length?"🧢 "+t.spieler.length+" dabei · ":"")+(nEltern>1?"Duell-Gegner im Wechsel":"tritt in jedem Duell an"):(t.spieler.length?t.spieler.length+" im Team":"ohne Kader-Kinder")}</span>
        ${t.fest?`<button onclick="blzTeamWeg(${i})" aria-label="Team entfernen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:44px;min-height:44px;margin:-8px -8px -8px 0"><i class="ti ti-trash"></i></button>`:""}
      </div>
      ${t.spieler.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${t.spieler.map(n=>`<button onclick="blzCycle('${jsq(n)}')" title="Tippen = ins nächste Team" style="min-height:44px;padding:6px 12px;border:1px solid var(--rand-bedien);border-radius:18px;font-family:inherit;font-size:12.5px;cursor:pointer;background:var(--surface2);color:var(--text)">${esc(n)}</button>`).join("")}</div>`:""}
    </div>`;
  // Im Duell sichtbar getrennt: erst die Eltern-Seite, dann die Kinder-Teams
  const gruppe=titel=>`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:8px 0 4px">${titel}</div>`;
  const teams=duell
    ?gruppe(`👨‍👩‍👧 Eltern-Seite (${nEltern} Team${nEltern>1?"s":""})`)
      +BLZ.teams.map((t,i)=>t.eltern?teamKarte(t,i):"").join("")
      +gruppe("⚽ Kinder-Teams")
      +BLZ.teams.map((t,i)=>t.eltern?"":teamKarte(t,i)).join("")
    :BLZ.teams.map(teamKarte).join("");
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${mChips}</div>
    ${duell?`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Duell-Tag: Gespielt wird NUR Kinder gegen Eltern – nie Kinder gegen Kinder, nie Eltern gegen Eltern. Bei gleich vielen Teams laufen die Duelle parallel auf den Feldern.</div>`:""}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">Spielform</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:8px">${sfChips}</div>
    ${vorschlag?`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">💡 ${vorschlag.pool} Kinder → Vorschlag: <b>${vorschlag.teams} Kinder-Team${vorschlag.teams>1?"s":""}</b> (${BLZ_SPIELFORM[BLZ.spielform][0]})${duell?" – und genauso viele Eltern-Teams, dann spielt alles parallel":""}</div>`:""}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">Zeitbudget</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:8px">${bChips}</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">Spielfelder <span style="font-weight:400;text-transform:none;letter-spacing:0">(3–4 = FUNiño/Kleinfelder · ein Pfiff für alle)</span></div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:8px">${fChips}</div>
    ${_blzPlatzHtml()}
    ${_blzDurchspielHtml()}
    ${duell?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">Eltern-Teams</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:8px">${eChips}</div>`:""}
    ${_blzVorschauHtml()}
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px">${nChips}</div>
    ${trainerChips}
    ${(_blzEntfernt.length||_blzErgaenzt.length)?`<div style="font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:7px 9px;margin-bottom:8px;line-height:1.4">ℹ️ Gespeicherte Einteilung an diesen Termin angepasst.${
      _blzEntfernt.length?`<br>Nicht dabei, deshalb herausgenommen: <b>${_blzEntfernt.map(n=>esc(n)).join(", ")}</b>`:""}${
      _blzErgaenzt.length?`<br>Dabei, aber ohne Team – ergänzt: <b>${_blzErgaenzt.map(n=>esc(n)).join(", ")}</b>`:""}</div>`:""}
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">Quelle: ${esc(BLZ.quelle)} · Kind antippen = wandert ins nächste Team · Würfel = neu mischen</div>
    ${teams}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-sm" onclick="blzNeuMischen()">🎲 Neu mischen</button>
      <button class="btn btn-sm" onclick="blzTeamPlus()">➕ Team von Hand (z. B. Eltern)</button>
    </div>
    ${!BLZ.budget?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <label for="blz-runde" style="font-size:12.5px;color:var(--text2)">Spielzeit je Begegnung</label>
      <input id="blz-runde" type="number" min="1" max="30" value="${BLZ.runde}" style="width:64px;text-align:center;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text)"> <span style="font-size:12.5px;color:var(--text2)">Min.</span>
    </div>`:""}
    ${BLZ.plan&&BLZ.plan.length?`
      <div style="font-size:11.5px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;margin-bottom:8px">💾 Turnier ist gebaut${BLZ.datum!==_blzHeute()?" (angelegt "+new Date(BLZ.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})+")":""} und bleibt gespeichert, bis ihr es beendet. Kinder/Trainer umsetzen und Namen ändern geht jederzeit – nur Modus- oder Team-Anzahl-Änderungen verwerfen den Plan.</div>
      <button class="btn btn-p" style="width:100%" onclick="blzWeiter()">▶ Weiter im Turnier (Plan &amp; Ergebnisse behalten)</button>
      <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="blzStart()">🔁 Spielplan neu erzeugen</button>`
    :`<button class="btn btn-p" style="width:100%" onclick="blzStart()"><i class="ti ti-tournament"></i>Turnier bauen &amp; los</button>`}`;
}
function blzBudget(b){BLZ.budget=b;blzSave();blzRender();}
function blzFelder(f){BLZ.felder=f;blzSave();blzRender();}
function blzAnzahl(n){
  if(!_blzPlanVerwerfen())return;
  BLZ.anzahl=n;
  if(BLZ.spielmodus==="duell"){_blzDuellTeams(n);}
  else{const a=_blzAuto(n);BLZ.teams=a.teams.concat(BLZ.teams.filter(t=>t.fest&&!t.eltern));BLZ.quelle=a.quelle;_blzTrainerVerteilen();}
  blzSave();blzRender();
}
function blzNeuMischen(){
  // Mischen ändert nur die Zusammensetzung, nicht die Team-Anzahl – der Plan bleibt gültig
  if(BLZ.spielmodus==="duell"){_blzDuellTeams(BLZ.anzahl);}
  else{const a=_blzAuto(BLZ.anzahl);BLZ.teams=a.teams.concat(BLZ.teams.filter(t=>t.fest&&!t.eltern));BLZ.quelle=a.quelle;_blzTrainerVerteilen();}
  blzSave();blzRender();
}
function blzCycle(name){
  const von=BLZ.teams.findIndex(t=>t.spieler.indexOf(name)>=0);if(von<0)return;
  // Kinder wandern nie ins abstrakte Eltern-Team – Trainer (🧢) dürfen überall hin,
  // damit sie beim Eltern-Duell auch auf der Eltern-Seite mitspielen können.
  const istTrainer=name.indexOf("🧢 ")===0;
  let ziel=(von+1)%BLZ.teams.length, runden=0;
  while(!istTrainer&&BLZ.teams[ziel].eltern&&runden++<BLZ.teams.length)ziel=(ziel+1)%BLZ.teams.length;
  if(ziel===von)return;
  BLZ.teams[von].spieler=BLZ.teams[von].spieler.filter(x=>x!==name);
  BLZ.teams[ziel].spieler.push(name);
  blzSave();blzRender();
}
function blzTeamPlus(){
  const name=(prompt("Name des Teams (z. B. Eltern, Trainer):")||"").trim();if(!name)return;
  if(!_blzPlanVerwerfen())return;
  BLZ.teams.push({name,spieler:[],fest:true});blzSave();blzRender();
}
function blzTeamWeg(i){if(!_blzPlanVerwerfen())return;BLZ.teams.splice(i,1);blzSave();blzRender();}
// Aus dem laufenden Turnier zurück ins Setup: Trainer/Kinder umsetzen, Namen ändern –
// Spielplan und Ergebnisse bleiben erhalten, solange die Team-Struktur gleich bleibt.
function blzBearbeiten(){BLZ.phase="setup";blzSave();blzRender();}
function blzWeiter(){BLZ.phase="live";blzSave();blzRender();}
function blzRename(i){
  const name=(prompt("Neuer Team-Name:",BLZ.teams[i].name)||"").trim();if(!name)return;
  BLZ.teams[i].name=name;blzSave();blzRender();
}
function blzStart(){
  if(BLZ.teams.length<2){toast("Mindestens 2 Teams","err");return;}
  if(BLZ.plan&&BLZ.plan.some(p=>p.ta!=null)&&!confirm("Es gibt schon Ergebnisse – Spielplan wirklich neu erzeugen? Alle Ergebnisse gehen verloren."))return;
  const p=_blzPlanen(BLZ.teams.length,BLZ.budget||0,BLZ.felder||1,BLZ.spielmodus,BLZ.teams.filter(t=>t.eltern).length);
  if(BLZ.budget){BLZ.runde=p.z;}
  else{const r=Number(document.getElementById("blz-runde")?.value)||8;BLZ.runde=Math.min(30,Math.max(1,r));}
  BLZ.plan=p.ms;
  BLZ.modus=p.modus;
  BLZ.dauer=BLZ.budget?p.dauer:null;
  BLZ.hinweis=BLZ.budget?(p.hinweis||0):0;
  BLZ.phase="live";blzSave();blzRender();
}
// Tabelle über eine Phasen-Teilmenge (Finale/kleines Finale zählen nie in die Tabelle)
function _blzTab(phasenRx){
  const t=BLZ.teams.map((team,i)=>({i,name:team.name,pkt:0,tore:0,geg:0,sp:0}));
  BLZ.plan.forEach(p=>{
    if(p.a==null||p.b==null||p.ta==null||p.tb==null||!phasenRx.test(p.phase))return;
    const A=t[p.a],B=t[p.b];if(!A||!B)return;
    A.sp++;B.sp++;A.tore+=p.ta;A.geg+=p.tb;B.tore+=p.tb;B.geg+=p.ta;
    if(p.ta>p.tb)A.pkt+=3;else if(p.ta<p.tb)B.pkt+=3;else{A.pkt++;B.pkt++;}
  });
  return t.sort((a,b)=>b.pkt-a.pkt||(b.tore-b.geg)-(a.tore-a.geg)||b.tore-a.tore);
}
// Finale/kleines Finale besetzen, sobald die Vorrunde komplett ist
function _blzResolve(){
  if(!BLZ||!BLZ.plan)return;
  const vorrundeFertig=BLZ.plan.filter(p=>p.a!=null&&!/finale/.test(p.phase)).every(p=>p.ta!=null);
  if(!vorrundeFertig)return;
  BLZ.plan.forEach(p=>{
    if(p.a!=null||!/finale/.test(p.phase))return;
    if(BLZ.modus==="gruppen"){
      const gA=_blzGruppe("A"),gB=_blzGruppe("B");
      const rangA=_blzTab(/^gruppeA$/).filter(z=>gA.indexOf(z.i)>=0);
      const rangB=_blzTab(/^gruppeB$/).filter(z=>gB.indexOf(z.i)>=0);
      const r=p.phase==="finale"?0:1;
      if(rangA[r]&&rangB[r]){p.a=rangA[r].i;p.b=rangB[r].i;}
    }else{
      const t=_blzTab(/^runde$/);
      if(t[0]&&t[1]){p.a=t[0].i;p.b=t[1].i;}
    }
  });
  blzSave();
}
function _blzGruppe(g){
  const na=Math.ceil(BLZ.teams.length/2);
  return g==="A"?[...Array(na).keys()]:[...Array(BLZ.teams.length-na).keys()].map(i=>i+na);
}
const BLZ_PHASE={runde:"",gruppeA:"Gruppe A",gruppeB:"Gruppe B",kfinale:"Kleines Finale",finale:"Finale"};
function _blzLiveHtml(){
  const felder=BLZ.felder||1;
  // nächstes offenes Fenster (kleinster Slot mit einem Spiel ohne Ergebnis)
  const offene=BLZ.plan.filter(p=>p.ta==null);
  const naechsterSlot=offene.length?Math.min(...offene.map(p=>p.slot)):-1;
  const slots=[...new Set(BLZ.plan.map(p=>p.slot))].sort((a,b)=>a-b);
  const step=(mi,seite,wert)=>`<span style="display:inline-flex;align-items:center;gap:2px;flex:none">
      <button onclick="blzTor(${mi},'${seite}',-1)" aria-label="Tor zurücknehmen" style="min-width:42px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface2);color:var(--text);font-size:16px;cursor:pointer;flex:none">−</button>
      <b style="min-width:26px;text-align:center;font-size:17px">${wert==null?"–":wert}</b>
      <button onclick="blzTor(${mi},'${seite}',1)" aria-label="Tor" style="min-width:42px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface2);color:var(--text);font-size:16px;cursor:pointer;flex:none">+</button>
    </span>`;
  const karte=p=>{
    const mi=BLZ.plan.indexOf(p);
    const offenPlatzh=p.a==null;
    const nameVon=v=>offenPlatzh?(p.phase==="finale"?(BLZ.modus==="gruppen"?(v==="a"?"1. Gruppe A":"1. Gruppe B"):(v==="a"?"Erster":"Zweiter")):(v==="a"?"2. Gruppe A":"2. Gruppe B")):esc(BLZ.teams[p[v]].name);
    const fA=p.a!=null?BLZ_FARBEN[p.a%BLZ_FARBEN.length]:"#94a3b8";
    const fB=p.b!=null?BLZ_FARBEN[p.b%BLZ_FARBEN.length]:"#94a3b8";
    return `<div style="border:var(--border-s);border-radius:12px;padding:8px 10px;flex:1 1 200px;min-width:0;box-sizing:border-box;${p.ta!=null?"opacity:.75;":""}">
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;flex-wrap:wrap">
        ${felder>1?`<span style="font-size:9.5px;font-weight:800;background:var(--surface2);border-radius:8px;padding:2px 7px;color:var(--text2)">Feld ${p.feld||1}</span>`:""}
        ${BLZ_PHASE[p.phase]?`<span style="font-size:9.5px;font-weight:800;color:#b45309">${BLZ_PHASE[p.phase]}</span>`:""}
        <span style="color:${fA}">${nameVon("a")}</span><span style="color:var(--text3)">vs</span><span style="color:${fB}">${nameVon("b")}</span>
      </div>
      ${p.a!=null?`<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px">${step(mi,"ta",p.ta)}<span style="font-weight:900">:</span>${step(mi,"tb",p.tb)}</div>`:'<div style="font-size:11px;color:var(--text3);margin-top:4px">Wird nach der Vorrunde besetzt.</div>'}
    </div>`;
  };
  const fenster=slots.map(s=>{
    const ms=BLZ.plan.filter(p=>p.slot===s);
    const aktiv=s===naechsterSlot;
    return `<div style="margin-bottom:10px;${aktiv?"box-shadow:0 0 0 2px #d97706;border-radius:14px;padding:8px;":""}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;font-weight:800;color:${aktiv?"#d97706":"var(--text3)"}">Fenster ${s+1}/${slots.length}${ms.length>1?` · ${ms.length} Spiele parallel`:""}</span>
        ${aktiv?`<button class="btn btn-sm btn-p" style="margin-left:auto" onclick="blzTimerStart(${s})">⏱️ ${BLZ.runde} Min.${felder>1?" – Pfiff für alle Felder":""}</button>`:""}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${ms.map(karte).join("")}</div>
    </div>`;
  }).join("");
  // Tabellen
  let tabellen="";
  const tabHtml=(titel,rows)=>`<div style="font-weight:800;font-size:13.5px;margin:12px 0 4px">📊 ${titel}</div>`
    +rows.map((z,pl)=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0">
      <span style="width:22px">${["🥇","🥈","🥉"][pl]||(pl+1)+"."}</span>
      <span style="flex:1;color:${BLZ_FARBEN[z.i%BLZ_FARBEN.length]};font-weight:700">${esc(z.name)}</span>
      <span style="font-size:11px;color:var(--text3)">${z.tore}:${z.geg}</span>
      <span style="font-weight:900;min-width:24px;text-align:right">${z.pkt}</span>
    </div>`).join("");
  if(BLZ.modus==="duell"){
    // großes Duell-Scoreboard (Gesamttore) + Rangliste der Kinder-Teams gegen die Eltern
    let kTore=0,eTore=0;
    BLZ.plan.forEach(p=>{if(p.ta!=null){eTore+=p.ta;kTore+=p.tb;}});
    const elternSet=new Set(BLZ.teams.map((t,i)=>t.eltern?i:-1).filter(i=>i>=0));
    tabellen=`<div style="display:flex;align-items:center;justify-content:center;gap:14px;background:var(--surface2);border-radius:14px;padding:12px;margin:12px 0 4px">
        <div style="text-align:center"><div style="font-size:11px;font-weight:800;color:var(--text2)">KINDER</div><div style="font-size:30px;font-weight:900;color:#059669">${kTore}</div></div>
        <div style="font-size:22px;font-weight:900;color:var(--text3)">:</div>
        <div style="text-align:center"><div style="font-size:11px;font-weight:800;color:var(--text2)">ELTERN</div><div style="font-size:30px;font-weight:900;color:#7c3aed">${eTore}</div></div>
      </div>`
      +tabHtml("Beste Kinder-Teams gegen die Eltern",_blzTab(/^runde$/).filter(z=>!elternSet.has(z.i)));
  }else if(BLZ.modus==="gruppen"){
    const gA=_blzGruppe("A"),gB=_blzGruppe("B");
    tabellen=tabHtml("Gruppe A",_blzTab(/^gruppeA$/).filter(z=>gA.indexOf(z.i)>=0))
            +tabHtml("Gruppe B",_blzTab(/^gruppeB$/).filter(z=>gB.indexOf(z.i)>=0));
  }else{
    tabellen=tabHtml("Tabelle",_blzTab(/^runde$/));
  }
  const kopf=`<div style="font-size:11px;color:var(--text2);margin-bottom:8px">${BLZ.dauer?`~${BLZ.dauer} Min. geplant (Budget ${BLZ.budget})`:`Spielzeit frei gewählt`} · ${BLZ.runde} Min. je Spiel · ${felder>1?felder+" Felder, ein Pfiff für alle":"1 Feld"}${(BLZ.spielform&&BLZ.spielform!=="frei")?" · ⚽ "+BLZ_SPIELFORM[BLZ.spielform][0]:""}</div>`
    +(BLZ.hinweis>0?`<div style="font-size:12px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 10px;margin-bottom:8px">⏰ Ehrlich gesagt: Das kürzeste faire Format braucht <b>${BLZ.hinweis} Min. mehr</b> als geplant – ihr überzieht bewusst.</div>`:"");
  return kopf+fenster+tabellen+`
    <button class="btn btn-p" style="width:100%;margin-top:12px" onclick="blzEnde()"><i class="ti ti-trophy"></i>Turnier beenden</button>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-sm" style="flex:1" onclick="blzBearbeiten()">✏️ Bearbeiten (Teams/Trainer)</button>
      <button class="btn btn-sm" style="flex:1;color:#dc2626" onclick="blzReset()">🗑️ Neu starten</button>
    </div>`;
}
function blzTor(mi,seite,delta){
  const p=BLZ.plan[mi];
  if(!p||p.a==null)return;
  p[seite]=Math.max(0,(p[seite]==null?0:p[seite])+delta);
  const andere=seite==="ta"?"tb":"ta";if(p[andere]==null)p[andere]=0; // Ergebnis zählt erst, wenn beide Seiten stehen
  blzSave();blzRender();
}
function blzEnde(){
  const offen=BLZ.plan.filter(p=>p.ta==null).length;
  if(offen&&!confirm(offen+" Begegnung"+(offen===1?"":"en")+" ohne Ergebnis – trotzdem beenden?"))return;
  // Sieger: Duell = Gesamttore Kinder vs Eltern; sonst gespieltes Finale vor Tabelle
  let kopf;
  if(BLZ.modus==="duell"){
    let kTore=0,eTore=0;BLZ.plan.forEach(p=>{if(p.ta!=null){eTore+=p.ta;kTore+=p.tb;}});
    const elternSet=new Set(BLZ.teams.map((t,i)=>t.eltern?i:-1).filter(i=>i>=0));
    const besteKids=_blzTab(/^runde$/).filter(z=>!elternSet.has(z.i))[0];
    const titel=kTore>eTore?"DIE KINDER GEWINNEN!":kTore<eTore?"Die Eltern gewinnen!":"Unentschieden!";
    const unter=kTore>eTore?`${kTore}:${eTore} gegen die Eltern – was für ein Team! 🦅`
      :kTore<eTore?`${eTore}:${kTore} für die Eltern – Revanche im nächsten Training! 💪`
      :`${kTore}:${kTore} – ehrenvoll für beide Seiten! 🤝`;
    kopf=`<div style="text-align:center;padding:14px 0">
      <div style="font-size:56px">${kTore>=eTore?"🏆":"👨‍👩‍👧"}</div>
      <div style="font-size:20px;font-weight:900;margin:8px 0">${titel}</div>
      <div style="font-size:12.5px;color:var(--text2)">${unter}</div>
      ${besteKids&&besteKids.sp?`<div style="font-size:12px;color:var(--text2);margin-top:6px">⭐ Bestes Kinder-Team: <b>${esc(besteKids.name)}</b></div>`:""}
    </div>`;
  }else{
    const finale=BLZ.plan.find(p=>p.phase==="finale"&&p.a!=null&&p.ta!=null);
    let erste;
    if(finale&&finale.ta!==finale.tb){
      erste=[{name:BLZ.teams[finale.ta>finale.tb?finale.a:finale.b].name}];
    }else{
      const tab=BLZ.modus==="gruppen"?_blzTab(/^gruppe/):_blzTab(/^runde$/);
      erste=tab.filter(z=>z.pkt===tab[0].pkt&&(z.tore-z.geg)===(tab[0].tore-tab[0].geg));
    }
    kopf=`<div style="text-align:center;padding:14px 0">
      <div style="font-size:56px">🏆</div>
      <div style="font-size:20px;font-weight:900;margin:8px 0">${erste.map(z=>esc(z.name)).join(" & ")}</div>
      <div style="font-size:12.5px;color:var(--text2)">${erste.length>1?"Geteilter Turniersieg":"gewinnt das Trainingsturnier"} – stark gespielt, alle zusammen! 🦅</div>
    </div>`;
  }
  const el=document.getElementById("blitz-body");if(!el)return;
  el.innerHTML=kopf
    +BLZ.plan.filter(p=>p.a!=null&&p.ta!=null).map(p=>`<div style="display:flex;gap:8px;font-size:12.5px;padding:2px 0;justify-content:center"><span>${BLZ_PHASE[p.phase]?BLZ_PHASE[p.phase]+": ":""}${esc(BLZ.teams[p.a].name)}</span><b>${p.ta}:${p.tb}</b><span>${esc(BLZ.teams[p.b].name)}</span></div>`).join("")
    +`<button class="btn btn-sm" style="width:100%;margin-top:12px" onclick="blzReset()">Neues Trainingsturnier</button>`;
  try{if(typeof confetti==="function")confetti(el);}catch(e){}
  try{navigator.vibrate&&navigator.vibrate([60,40,60]);}catch(e){}
  try{localStorage.removeItem("adler_blitz");}catch(e){}
  BLZ=null;
}
function blzReset(){
  if(BLZ&&BLZ.plan&&BLZ.plan.length&&!confirm("Alles verwerfen und komplett neu starten?"))return;
  try{localStorage.removeItem("adler_blitz");}catch(e){}
  BLZ=null;blitzOpen();
}
/* Rundentimer: Vollbild-Countdown (ein Pfiff für alle Felder). Nach dem Abpfiff wird
   das Vollbild zur großen Ergebnis-Eingabe für GENAU dieses Fenster – eintragen,
   „Fenster abschließen“, und die Live-Ansicht steht schon auf dem nächsten Fenster. */
let _blzT=null;
function blzTimerStart(slot){
  const sek=(BLZ?BLZ.runde:8)*60;
  document.getElementById("blz-timer")?.remove();
  const ov=document.createElement("div");ov.id="blz-timer";
  ov.style.cssText="position:fixed;inset:0;background:#0b1220;color:#fff;z-index:11000;overflow-y:auto;padding:20px;text-align:center";
  document.body.appendChild(ov);
  _blzT={left:sek,paused:false,slot:(slot==null?-1:slot),phase:"lauf",timer:setInterval(_blzTick,1000)};
  try{if(typeof requestWakeLock==="function")requestWakeLock();}catch(e){}
  _blzTimerRender();
}
function _blzTick(){
  if(!_blzT||_blzT.paused||_blzT.phase!=="lauf")return;
  _blzT.left--;
  if(_blzT.left<=0)blzAbpfiff();
  else _blzTimerRender();
}
// Abpfiff (automatisch bei 0:00 oder per Knopf): Pfiff + Wechsel zur Ergebnis-Eingabe
function blzAbpfiff(){
  if(!_blzT)return;
  try{if(typeof stTimerWhistle==="function")stTimerWhistle();}catch(e){}
  if(_blzT.timer){clearInterval(_blzT.timer);_blzT.timer=null;}
  _blzT.left=0;_blzT.phase="ergebnis";
  _blzTimerRender();
}
// Große Stepper direkt im Vollbild – schreibt in den Plan, Punktetafel rechnet live mit
function blzTorOv(mi,seite,delta){
  const p=BLZ&&BLZ.plan[mi]; if(!p||p.a==null)return;
  p[seite]=Math.max(0,(p[seite]==null?0:p[seite])+delta);
  const andere=seite==="ta"?"tb":"ta"; if(p[andere]==null)p[andere]=0;
  blzSave();blzRender();_blzTimerRender();
}
function _blzTimerRender(){
  const ov=document.getElementById("blz-timer");if(!ov||!_blzT)return;
  if(_blzT.phase==="ergebnis"){
    const spiele=BLZ.plan.map((p,mi)=>({p,mi})).filter(x=>x.p.slot===_blzT.slot&&x.p.a!=null);
    const step=(mi,seite,wert)=>`<span style="display:inline-flex;align-items:center;gap:4px">
        <button onclick="blzTorOv(${mi},'${seite}',-1)" aria-label="Tor zurücknehmen" style="min-width:52px;min-height:52px;border:1px solid #334155;border-radius:12px;background:#1e293b;color:#fff;font-size:20px;cursor:pointer">−</button>
        <b style="min-width:38px;text-align:center;font-size:30px;font-variant-numeric:tabular-nums">${wert==null?0:wert}</b>
        <button onclick="blzTorOv(${mi},'${seite}',1)" aria-label="Tor" style="min-width:52px;min-height:52px;border:1px solid #334155;border-radius:12px;background:#1e293b;color:#fff;font-size:20px;cursor:pointer">+</button>
      </span>`;
    ov.innerHTML=`<div style="max-width:520px;margin:0 auto">
      <div style="font-size:26px;font-weight:900;margin:8px 0 2px">⏱️ Abpfiff${(BLZ&&BLZ.felder>1)?" – alle Felder":""}!</div>
      <div style="font-size:13px;opacity:.75;margin-bottom:14px">Ergebnisse eintragen – dann weiter zum nächsten Fenster.</div>
      ${spiele.length?spiele.map(x=>`<div style="background:#111c33;border-radius:16px;padding:14px;margin-bottom:12px">
        <div style="font-size:16px;font-weight:800;margin-bottom:10px">${(BLZ.felder>1)?`<span style="font-size:11px;font-weight:800;background:#334155;border-radius:8px;padding:2px 8px;margin-right:6px">Feld ${x.p.feld||1}</span>`:""}${esc(BLZ.teams[x.p.a].name)} <span style="opacity:.5">vs</span> ${esc(BLZ.teams[x.p.b].name)}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:14px">${step(x.mi,"ta",x.p.ta)}<span style="font-size:24px;font-weight:900">:</span>${step(x.mi,"tb",x.p.tb)}</div>
      </div>`).join(""):'<div style="font-size:14px;opacity:.75;padding:20px 0">Für dieses Fenster stehen die Teams noch nicht fest.</div>'}
      <button onclick="blzTimerStop()" style="width:100%;min-height:54px;border:none;border-radius:14px;background:#16a34a;color:#fff;font-size:16px;font-weight:900;font-family:inherit;cursor:pointer;margin-top:4px">✅ Fenster abschließen</button>
    </div>`;
    return;
  }
  const mm=Math.floor(_blzT.left/60),ss=_blzT.left%60;
  ov.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh">
    <div style="font-size:15px;opacity:.7">🏆 Trainingsturnier${(BLZ&&BLZ.felder>1)?" · "+BLZ.felder+" Felder":""}</div>
    <div style="font-size:88px;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:2px">${mm+":"+(ss<10?"0":"")+ss}</div>
    <div style="display:flex;gap:10px;margin-top:24px">
      <button onclick="_blzT.paused=!_blzT.paused;_blzTimerRender()" style="padding:14px 24px;border:none;border-radius:12px;background:#334155;color:#fff;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer">${_blzT.paused?"▶ Weiter":"⏸ Pause"}</button>
      <button onclick="blzAbpfiff()" style="padding:14px 24px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer">⏹ Abpfiff &amp; Ergebnisse</button>
    </div>
  </div>`;
}
function blzTimerStop(){
  if(_blzT&&_blzT.timer)clearInterval(_blzT.timer);
  _blzT=null;
  document.getElementById("blz-timer")?.remove();
  try{if(typeof releaseWakeLock==="function")releaseWakeLock();}catch(e){}
  blzRender(); // Live-Ansicht springt aufs nächste Fenster (Markierung + Timer-Knopf)
}


/* ═══════════════════════════════════
   M2/M3: HEIMTURNIER – wir richten selbst aus. Teams direkt aus der Gegner-DB (Vereine
   dürfen mehrere Mannschaften stellen → automatische „2"/„3"-Nummerierung), 2–4 Gruppen
   je nach Meldezahl, 1–4 Felder parallel, Spielform (FUNiño, 4+1, 5+1 …) mit hinterlegtem,
   anpassbarem Regelwerk. Der Plan geht per öffentlichem Link (?turnier=<slug>) ohne Login
   an die Gast-Trainer – er enthält NUR Teamnamen, nie Kindernamen.
   Formate: Liga (jeder gegen jeden), Gruppen + Finalrunde, Festival (keine Tabelle).
═══════════════════════════════════ */
let _HT=null;
function _htSlug(){ return Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,6); }
function _htUrl(slug){ return appRoot()+"?turnier="+encodeURIComponent(slug); }
const HT_FORMATE={liga:"Liga – jeder gegen jeden",gruppen:"Gruppen + Finalrunde",festival:"Festival – alle spielen, keine Tabelle"};
const HT_SPIELFORM={funino:"FUNiño (3 gegen 3)",f4:"4+1",f5:"5+1",f6:"6+1",f7:"7 gegen 7",frei:"eigene Spielform"};
/* Regel-Vorlagen je Spielform – bewusst als VORLAGE beschriftet, der Trainer passt sie an
   die eigene Ausschreibung/Kreis-Vorgaben an (die Details sind regional unterschiedlich). */
const HT_REGELN={
  funino:"FUNiño – 3 gegen 3 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 3 gegen 3 auf vier Minitore, ohne Torwart\n• Tore zählen nur aus der Schusszone vor den Toren\n• Eindribbeln statt Einwurf, Ecke und Abstoß\n• Nach jedem Tor und in festen Abständen wird gewechselt – alle spielen gleich viel\n• Ohne Schiedsrichter: die Kinder entscheiden selbst, die Trainer begleiten\n• Fair-Play-Regel: Zuschauer feuern an, coachen nicht",
  f4:"4+1 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 4 Feldspieler + Torwart, fliegender Wechsel\n• Kein Abseits\n• Eindribbeln oder Einpassen statt Einwurf\n• Abstoß und Freistoß: Gegner mindestens 3 m Abstand\n• Torwart darf den Rückpass aufnehmen\n• Fair-Play-Liga: ohne Schiedsrichter, die Trainer begleiten das Spiel\n• Zuschauerzone mit Abstand zum Spielfeld – anfeuern ja, coachen nein",
  f5:"5+1 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 5 Feldspieler + Torwart, fliegender Wechsel\n• Kein Abseits\n• Einwurf oder Eindribbeln (je nach Ausschreibung)\n• Freistöße indirekt, Gegner mindestens 3 m Abstand\n• Fair-Play-Liga: ohne Schiedsrichter, die Trainer begleiten das Spiel\n• Zuschauerzone mit Abstand zum Spielfeld – anfeuern ja, coachen nein",
  f6:"6+1 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 6 Feldspieler + Torwart, fliegender Wechsel\n• Kein Abseits\n• Einwurf regulär\n• Freistöße indirekt, Gegner mindestens 3 m Abstand\n• Spielbegleiter statt Schiedsrichter (je nach Ausschreibung)",
  f7:"7 gegen 7 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 6 Feldspieler + Torwart, fliegender Wechsel\n• Abseits je nach Kreis-Ausschreibung\n• Einwurf regulär, Freistöße nach Ausschreibung\n• Schiedsrichter oder Spielbegleiter je nach Turnierordnung",
  frei:"Eigene Spielform – Regeln hier eintragen."
};
const HT_INFOS_VORLAGE="⏰ Bitte 30 Minuten vor dem ersten Spiel da sein\n⚽ Bitte bringt zum Aufwärmen eure eigenen Bälle mit\n☕ Kaffee und Brötchen stehen bereit\n🧑‍⚖️ Schiedsrichter: die Trainer am Feld – fair und kindgerecht";
const HT_GRLABEL=["A","B","C","D"];
// Platzhalter der Finalrunde lesbar machen ("A1" = Erster Gruppe A, "S|Halbfinale 1" = Sieger HF 1 …)
function _htName(v,teams){
  if(typeof v==="number")return teams[v]||"?";
  const s=String(v);
  let m=/^([A-D])(\d+)$/.exec(s); if(m)return `${m[2]}. Gruppe ${m[1]}`;
  m=/^S\|(.+)$/.exec(s); if(m)return "Sieger "+m[1];
  m=/^V\|(.+)$/.exec(s); if(m)return "Verlierer "+m[1];
  if(s==="GS1")return "Bester Gruppensieger";
  if(s==="GS2")return "Zweitbester Gruppensieger";
  if(s==="GS3")return "Drittbester Gruppensieger";
  if(s==="GZ1")return "Bester Gruppenzweiter";
  return s;
}
// Gruppen-Einteilung: Teamliste in <gruppen> Blöcke (Reihenfolge bestimmt der Trainer)
function _htGruppenN(row){
  const n=(row.teams||[]).length, g=Math.min(4,Math.max(2,Number((row.config||{}).gruppen)||2));
  const out=[]; const basis=Math.floor(n/g); let rest=n%g, start=0;
  for(let i=0;i<g;i++){const groesse=basis+(i<rest?1:0);out.push([...Array(groesse).keys()].map(x=>x+start));start+=groesse;}
  return out;
}
function _htGrVorschlag(n){ if(n>=12&&n%4===0)return 4; if(n>=9&&n%3===0)return 3; if(n>=13)return 4; if(n>=10)return 3; return 2; }
/* Spielplan-Generator: Begegnungen je Format, dann Zeitfenster füllen (bis zu <felder>
   Spiele parallel, kein Team doppelt im selben Fenster). Finalrunde startet erst nach den
   Gruppenspielen (+ Puffer); Finale/Platz 3 nach den Halbfinals; das Finale spielt allein. */
function _htGen(teams,cfg){
  const n=teams.length;
  let ms=[];
  if(cfg.format==="gruppen"&&n>=4){
    const gruppen=_htGruppenN({teams,config:cfg});
    const rr=gruppen.map((idxs,g)=>_blzRR(idxs.length).map(([x,y])=>({a:idxs[x],b:idxs[y],phase:"Gruppe "+HT_GRLABEL[g]})));
    const max=Math.max(...rr.map(r=>r.length));           // Gruppen abwechselnd = faire Pausen
    for(let i=0;i<max;i++)rr.forEach(r=>{if(r[i])ms.push(r[i]);});
    if(gruppen.length===2){
      const plaetze=Math.min(gruppen[0].length,gruppen[1].length);
      for(let r=plaetze-1;r>=0;r--)ms.push({a:"A"+(r+1),b:"B"+(r+1),phase:r===0?"Finale":"Spiel um Platz "+(2*r+1)});
    }else if(gruppen.length===3){
      ms.push({a:"GS3",b:"GZ1",phase:"Spiel um Platz 3"});
      ms.push({a:"GS1",b:"GS2",phase:"Finale"});
    }else{
      ms.push({a:"A1",b:"C1",phase:"Halbfinale 1"});
      ms.push({a:"B1",b:"D1",phase:"Halbfinale 2"});
      ms.push({a:"V|Halbfinale 1",b:"V|Halbfinale 2",phase:"Spiel um Platz 3"});
      ms.push({a:"S|Halbfinale 1",b:"S|Halbfinale 2",phase:"Finale"});
    }
  }else{
    ms=_blzRR(n).map(([a,b])=>({a,b,phase:cfg.format==="festival"?"Festival":"Runde"}));
  }
  const felder=Math.min(4,Math.max(1,Number(cfg.felder)||1)), dauer=Math.max(1,Number(cfg.spieldauer)||10), pause=Math.max(0,Number(cfg.pause)||0), puffer=Math.max(0,Number(cfg.puffer)||0);
  const [sh,sm]=(cfg.start||"10:00").split(":").map(Number);
  let slot=0, extra=0; const done=[]; const queue=ms.slice();
  while(queue.length&&slot<300){
    const belegt=new Set(); let f=1, slotGruppe=false, slotHF=false;
    for(let i=0;i<queue.length&&f<=felder;){
      const m=queue[i], finale=m.phase==="Finale", platzh=typeof m.a==="string";
      const gruppenOffen=queue.some(q=>typeof q.a==="number"&&/^(Gruppe|Runde|Festival)/.test(q.phase));
      const hfOffen=queue.some(q=>/^Halbfinale/.test(q.phase))||slotHF;
      // Finalrunde nie im selben Fenster wie ein Gruppenspiel; Finale/Platz 3 erst NACH den Halbfinals
      const wartet=platzh&&(gruppenOffen||slotGruppe||(/^[SV]\|/.test(String(m.a))&&hfOffen));
      if(!belegt.has(String(m.a))&&!belegt.has(String(m.b))&&!wartet&&(!finale||(f===1&&!belegt.size))){
        if(platzh&&!extra)extra=puffer;                    // Verschnaufpause vor der Finalrunde
        const t=sh*60+sm+slot*(dauer+pause)+extra;
        m.zeit=String(Math.floor(t/60)%24).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
        m.feld=f++; belegt.add(String(m.a)); belegt.add(String(m.b));
        if(typeof m.a==="number")slotGruppe=true;
        if(/^Halbfinale/.test(m.phase))slotHF=true;
        done.push(m); queue.splice(i,1);
        if(finale)break;
      }else i++;
    }
    slot++;
  }
  return done.map(m=>({...m,ta:null,tb:null}));
}
// Tabelle über eine Teilmenge des Plans (nur echte Team-Indizes, nur mit Ergebnis)
function _htTabelle(plan,idxs,teams){
  const t={}; idxs.forEach(i=>t[i]={i,name:teams[i],pkt:0,tore:0,geg:0,sp:0});
  plan.forEach(p=>{
    if(typeof p.a!=="number"||typeof p.b!=="number"||p.ta==null||p.tb==null)return;
    if(!t[p.a]||!t[p.b])return;
    const A=t[p.a],B=t[p.b];A.sp++;B.sp++;A.tore+=p.ta;A.geg+=p.tb;B.tore+=p.tb;B.geg+=p.ta;
    if(p.ta>p.tb)A.pkt+=3;else if(p.ta<p.tb)B.pkt+=3;else{A.pkt++;B.pkt++;}
  });
  return Object.values(t).sort((a,b)=>b.pkt-a.pkt||(b.tore-b.geg)-(a.tore-a.geg)||b.tore-a.tore);
}
/* v476: mit Datum aufgerufen (aus der Anwesenheit eines Heimturnier-Termins) oeffnet sich
   das Turnier dieses Tages direkt – oder das Anlege-Formular steht schon mit Datum und Namen. */
async function htOpen(datum,name,anlass){
  _htAnlass=anlass||"";
  document.getElementById("hturnier-modal")?.remove();
  const m=document.createElement("div");m.id="hturnier-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Heimturnier");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("hturnier-modal","🏆",_htAnlass==="heimspiel"?"Heimspiel bei uns":"Heimturnier","Wir richten aus – Spielplan erstellen und per Link an alle Trainer","#b45309")}
    <div id="ht-body"><div style="font-size:12px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  const rows=await htListe();
  if(datum){
    const vorhanden=(rows||[]).find(t=>String(t.datum||"")===String(datum));
    if(vorhanden){ htEdit(vorhanden.id); return; }
    const d=document.getElementById("ht-datum"), n=document.getElementById("ht-name");
    if(d)d.value=datum;
    const tag=new Date(datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
    if(n&&!n.value)n.value=(String(name||"").replace(/\s*·\s*Heim\s*$/i,"").trim())||(_htAnlass==="heimspiel"?("Heimspiel "+tag):("Kinderfestival "+tag));
  }
}
async function htListe(){
  _HT=null;
  const el=document.getElementById("ht-body"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?select=id,slug,name,datum,teams,aktiv,config&order=created_at.desc&limit=10`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  const fld="box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13.5px;background:var(--surface2);color:var(--text)";
  el.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:6px">
      <input id="ht-name" placeholder="Name, z. B. Kinderfestival September" style="${fld}">
      <div style="display:flex;gap:8px"><input id="ht-datum" type="date" style="${fld};flex:1"><button class="btn btn-p btn-sm" onclick="htNeu(this)"><i class="ti ti-plus"></i>Anlegen</button></div>
    </div>
    <div style="font-weight:800;font-size:13px;margin:12px 0 6px">Unsere Turniere</div>
    ${rows.length?rows.map(t=>`<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-left:4px solid #b45309;border-radius:12px;padding:10px 12px;margin-bottom:8px">
        <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:800">${esc(t.name)}</div>
        <div style="font-size:11px;color:var(--text2)">${t.datum?new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})+" · ":""}${(t.teams||[]).length} Teams${((t.config||{}).anlass==="heimspiel")?" · ⚽ Heimspiel":((t.config||{}).art==="festival")?" · 🏟️ Festival":""}</div></div>
        <button class="btn btn-sm btn-p" onclick="htEdit(${t.id})">Öffnen</button>
      </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch kein Heimturnier angelegt.</div>'}`;
  return rows;
}
async function htNeu(btn){
  const name=(document.getElementById("ht-name")?.value||"").trim();
  const datum=document.getElementById("ht-datum")?.value||null;
  if(!name){toast("Bitte einen Turniernamen eingeben","err");return;}
  if(btn)btn.disabled=true;
  try{
    /* v484: Neu angelegt wird immer ein FESTIVAL – der Fall, den wir wirklich ausrichten
       (2–3 Gastvereine, eine Stunde, gemischte Felder). Die alten Turniere mit Gruppen und
       Finalrunde bleiben lesbar und editierbar, es entstehen nur keine neuen mehr. */
    /* v486: Beginn aus der Uhrzeit des Termins (sonst 10:15), unsere Kinder und Teams aus
       „Teams festlegen" – da sind sie schon erfasst (PO). */
    let start=FST_START, termin=null;
    if(datum){ try{const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&typ=in.(spiel,turnier)&select=uhrzeit,typ,gegner&limit=1`,{headers:sbAuthHeaders()});if(r.ok){termin=((await r.json())||[])[0]||null;if(termin&&termin.uhrzeit)start=String(termin.uhrzeit).slice(0,5);}}catch(e){} }
    /* v490: Beim Heimspiel steht der Gegner schon im Termin – er kommt als zweiter Verein
       gleich mit hinein, mit so vielen Teams wie wir. Kinderzahl trägt der Trainer nach. */
    const anlass=(_htAnlass==="heimspiel"||(termin&&termin.typ==="spiel"))?"heimspiel":"festival";
    const ein=datum?await fstEinteilungLaden(datum):null;
    const adler={name:"SV Adler Dellbrück",kinder:ein&&ein.dabei?ein.dabei:14,teams:ein&&ein.dabei?(ein.teams||fstTeamsVorschlag(ein.dabei,FST_STANDARD_FELDER)):2};
    const vereine=[adler];
    if(termin&&termin.gegner)vereine.push({name:termin.gegner,kinder:0,teams:adler.teams});
    const body={slug:_htSlug(),name,datum,ort:(typeof VEREIN_ADRESSE!=="undefined"?VEREIN_ADRESSE:"Thurner Kamp 97, 51069 Köln"),
      edit_code:Math.random().toString(36).slice(2,8),   // v488: Gast-Trainer tragen Ergebnisse ueber den Link ein
      config:{art:"festival",format:"festival",anlass,start,dauer:60,spieldauer:8,wechsel:FST_PAUSE,
        felder:FST_STANDARD_FELDER.slice(),
        vereine,
        infos:HT_INFOS_VORLAGE},
      teams:fstTeamsBauen(vereine).map(t=>t.name)};
    const r=await fetch(`${SB_URL}/rest/v1/heimturnier`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht anlegen"),"err");return;}
    const row=(await r.json())[0];
    toast(anlass==="heimspiel"?"⚽ Heimspiel angelegt":"🏆 Festival angelegt");
    htEdit(row.id);
  }catch(e){toast("Netzwerkfehler","err");}
  finally{if(btn)btn.disabled=false;}
}
async function htEdit(id){
  const el=document.getElementById("ht-body"); if(!el)return;
  el.innerHTML='<div style="font-size:12px;color:var(--text3)">Lade…</div>';
  try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?id=eq.${id}&select=*`,{headers:sbAuthHeaders()});if(r.ok)_HT=((await r.json())||[])[0]||null;}catch(e){}
  if(!_HT){el.innerHTML='<div style="font-size:12px;color:var(--text3)">Nicht gefunden.</div>';return;}
  // Gegner-DB einmal laden – daraus werden die Schnellwahl-Chips
  if(!window._htGegner){
    try{const r=await fetch(`${SB_URL}/rest/v1/gegner?select=name&order=name.asc&limit=60`,{headers:sbAuthHeaders()});if(r.ok)window._htGegner=((await r.json())||[]).map(g=>g.name);}catch(e){}
    if(!window._htGegner)window._htGegner=[];
  }
  if(fstIst(_HT)){
    /* v487 PO: „Die Infos sind nicht vollstaendig … Start immer 10:15 und mit allen 4 Plaetzen."
       Die Vorgaben galten nur fuer neu angelegte Festivals; ein bestehendes trug den alten
       Stand. Beim Oeffnen ziehen wir die Standards nach – nur dort, wo noch der alte Standard
       steht, nie ueber eine bewusste Aenderung des Trainers hinweg. */
    const nz=fstStandardNachziehen(_HT);
    if(nz.geaendert&&await htPatch({config:nz.config}))toast("Standard nachgezogen: "+nz.was.join(", "));
    fstRender();
  } else htRender();   // v484: Festival hat eine eigene, schlanke Oberflaeche
}
function fstStandardNachziehen(row){
  const cfg={...((row&&row.config)||{})}, was=[];
  const plan=(row&&row.plan)||[];
  const infos=String(cfg.infos||"");
  if(!/Bälle/.test(infos)){
    const z=infos?infos.split("\n"):[];
    z.splice(z.length&&/^⏰/.test(z[0])?1:0,0,"⚽ Bitte bringt zum Aufwärmen eure eigenen Bälle mit");
    cfg.infos=z.join("\n"); was.push("Bälle-Hinweis");
  }
  if(!plan.length){   // mit fertigem Plan haengen Zeiten und Felder am Plan – dann nichts anfassen
    if(!cfg.start||cfg.start==="10:00"){ cfg.start=FST_START; was.push("Beginn 10:15"); }
    if(cfg.wechsel==null||cfg.wechsel===2){ cfg.wechsel=FST_PAUSE; was.push("Trinkpause 5 Min."); }
    const f=cfg.felder||[];
    const alterStandard=f.length===3&&f.every((x,i)=>!x.name&&(x.form||"funino")===["f4","funino","funino"][i]);
    if(!f.length||alterStandard){ cfg.felder=FST_STANDARD_FELDER.slice(); was.push("alle 4 Felder"); }
  }
  return {config:cfg,geaendert:was.length>0,was};
}
async function htPatch(fields){
  if(!_HT)return false;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/heimturnier?id=eq.${_HT.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({...fields,updated_at:new Date().toISOString()})});
    if(!r.ok&&r.status!==204){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return false;}
    Object.assign(_HT,fields);
    return true;
  }catch(e){toast("Netzwerkfehler","err");return false;}
}
function htRender(){
  const el=document.getElementById("ht-body"); if(!el||!_HT)return;
  const cfg=_HT.config||{}, teams=_HT.teams||[], plan=_HT.plan||[];
  const fld="box-sizing:border-box;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)";
  const istGruppen=cfg.format==="gruppen";
  const gruppen=istGruppen?_htGruppenN(_HT):null;
  const grVon=i=>{if(!gruppen)return "";const g=gruppen.findIndex(idxs=>idxs.indexOf(i)>=0);return g>=0?HT_GRLABEL[g]:"";};
  const teamZeile=(name,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:2px 0">
      ${istGruppen?`<span style="font-size:10px;font-weight:800;color:#b45309;width:18px">${grVon(i)}</span>`:""}
      <span style="flex:1;font-size:13px">${esc(name)}</span>
      ${i>0?`<button onclick="htTeamHoch(${i})" aria-label="nach oben" style="min-width:44px;min-height:44px;margin:-8px 0;border:none;background:transparent;color:var(--text2);cursor:pointer"><i class="ti ti-arrow-up"></i></button>`:'<span style="min-width:44px"></span>'}
      <button onclick="htTeamWeg(${i})" aria-label="Team entfernen" style="min-width:44px;min-height:44px;margin:-8px 0;border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`;
  // Schnellwahl aus der Gegner-DB: Tippen fügt hinzu; nochmal tippen = zweite Mannschaft („… 2")
  const dbChips=(window._htGegner||[]).length?`<div style="font-size:11px;color:var(--text2);margin:6px 0 4px">Aus der Gegner-Datenbank (nochmal tippen = 2. Mannschaft):</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${(window._htGegner||[]).map(g=>`<button onclick="htTeamAusDB('${jsq(g)}')" style="min-height:44px;padding:6px 12px;border:1px solid var(--rand-bedien);border-radius:18px;font-family:inherit;font-size:12px;cursor:pointer;background:var(--surface2);color:var(--text)">${esc(g)}</button>`).join("")}</div>`:"";
  // Spielplan-Zeilen mit Ergebnis-Steppern (Platzhalter erst nach „Finalrunde füllen" spielbar)
  const spielZeile=(p,mi)=>{
    const echt=typeof p.a==="number"&&typeof p.b==="number";
    const step=(seite,wert)=>`<span style="display:inline-flex;align-items:center;gap:2px">
      <button onclick="htTor(${mi},'${seite}',-1)" aria-label="Tor zurücknehmen" style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface2);color:var(--text);font-size:15px;cursor:pointer">−</button>
      <b style="min-width:24px;text-align:center;font-size:16px">${wert==null?"–":wert}</b>
      <button onclick="htTor(${mi},'${seite}',1)" aria-label="Tor" style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface2);color:var(--text);font-size:15px;cursor:pointer">+</button>
    </span>`;
    return `<div style="border:var(--border-s);border-radius:12px;padding:8px 10px;margin-bottom:8px;${p.ta!=null?"opacity:.78;":""}">
      <div style="font-size:10.5px;color:var(--text2);display:flex;gap:8px"><b>${esc(p.zeit||"")}</b><span>Feld ${p.feld||1}</span><span style="margin-left:auto;color:#b45309;font-weight:700">${esc(p.phase||"")}</span></div>
      <div style="font-size:13px;font-weight:800;margin-top:2px">${esc(_htName(p.a,teams))} <span style="color:var(--text3);font-weight:400">vs</span> ${esc(_htName(p.b,teams))}</div>
      ${echt?`<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px">${step("ta",p.ta)}<span style="font-weight:900">:</span>${step("tb",p.tb)}</div>`:'<div style="font-size:11px;color:var(--text3);margin-top:4px">Wird über „Finalrunde füllen" besetzt.</div>'}
    </div>`;
  };
  // Tabellen (Festival: bewusst keine)
  let tabellen="";
  if(plan.length&&cfg.format!=="festival"){
    const blocks=istGruppen
      ?_htGruppenN(_HT).map((idxs,g)=>["Gruppe "+HT_GRLABEL[g],idxs])
      :[["Tabelle",teams.map((_,i)=>i)]];
    tabellen=blocks.map(([titel,idxs])=>`<div style="font-weight:800;font-size:13px;margin:10px 0 2px">📊 ${titel}</div>`
      +_htTabelle(plan,idxs,teams).map((z,pl)=>`<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:2px 0">
        <span style="width:20px">${pl+1}.</span><span style="flex:1">${esc(z.name)}</span>
        <span style="font-size:10.5px;color:var(--text3)">${z.tore}:${z.geg}</span><b style="min-width:22px;text-align:right">${z.pkt}</b>
      </div>`).join("")).join("");
  }
  const url=_htUrl(_HT.slug);
  const finalsOffen=istGruppen&&plan.some(p=>typeof p.a==="string");
  const vorschlag=_htGrVorschlag(teams.length);
  el.innerHTML=`
    <button class="btn btn-sm" style="margin-bottom:10px" onclick="htListe()"><i class="ti ti-arrow-left"></i>Alle Turniere</button>
    <div style="font-size:15px;font-weight:900;margin-bottom:8px">${esc(_HT.name)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <label style="font-size:11px;color:var(--text2)">Datum<input id="ht-e-datum" type="date" value="${esc(_HT.datum||"")}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Start<input id="ht-e-start" type="time" value="${esc(cfg.start||"10:00")}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Spielfelder<select id="ht-e-felder" style="${fld};width:100%;margin-top:3px">${[1,2,3,4].map(f=>`<option value="${f}"${cfg.felder==f?" selected":""}>${f} ${f===1?"Feld":"Felder parallel"}</option>`).join("")}</select></label>
      <label style="font-size:11px;color:var(--text2)">Format<select id="ht-e-format" onchange="htRenderCfg()" style="${fld};width:100%;margin-top:3px">${Object.entries(HT_FORMATE).map(([k,v])=>`<option value="${k}"${cfg.format===k?" selected":""}>${v}</option>`).join("")}</select></label>
      ${istGruppen?`<label style="font-size:11px;color:var(--text2)">Gruppen<select id="ht-e-gruppen" style="${fld};width:100%;margin-top:3px">${[2,3,4].map(g=>`<option value="${g}"${(cfg.gruppen||2)==g?" selected":""}>${g} Gruppen${g===vorschlag?" (Vorschlag)":""}</option>`).join("")}</select></label>`:""}
      <label style="font-size:11px;color:var(--text2)">Spielform<select id="ht-e-spielform" style="${fld};width:100%;margin-top:3px">${Object.entries(HT_SPIELFORM).map(([k,v])=>`<option value="${k}"${(cfg.spielform||"f4")===k?" selected":""}>${v}</option>`).join("")}</select></label>
      <label style="font-size:11px;color:var(--text2)">Spielzeit (Min.)<input id="ht-e-dauer" type="number" min="4" max="30" value="${cfg.spieldauer||12}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Pause (Min.)<input id="ht-e-pause" type="number" min="0" max="15" value="${cfg.pause==null?3:cfg.pause}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Puffer vor Finalrunde (Min.)<input id="ht-e-puffer" type="number" min="0" max="60" value="${cfg.puffer==null?10:cfg.puffer}" style="${fld};width:100%;margin-top:3px"></label>
    </div>
    ${istGruppen?`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">${teams.length} Teams → Vorschlag: <b>${vorschlag} Gruppen</b>. Finalrunde: 2 Gruppen = Platzierungsspiele Rang gegen Rang · 3 Gruppen = Finale der besten Gruppensieger · 4 Gruppen = Überkreuz-Halbfinals + Finale.</div>`:""}
    <div style="font-weight:800;font-size:13px;margin:10px 0 4px">Teams <span style="font-weight:400;font-size:11px;color:var(--text3)">(${teams.length}${istGruppen?" · Reihenfolge = Gruppen-Blöcke, ↑ zum Sortieren":""})</span></div>
    ${teams.map(teamZeile).join("")}
    ${dbChips}
    <div style="display:flex;gap:6px;margin:6px 0 10px">
      <input id="ht-team-neu" placeholder="Team von Hand, z. B. FC Musterstadt" style="${fld};flex:1;min-width:0" onkeydown="if(event.key==='Enter')htTeamPlus()">
      <button class="btn btn-sm" onclick="htTeamPlus()"><i class="ti ti-plus"></i></button>
    </div>
    <details style="margin-bottom:10px"${plan.length?"":" open"}>
      <summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--blue);min-height:44px;display:flex;align-items:center">📖 Regelwerk &amp; Infos für Gastvereine</summary>
      <div style="font-size:11px;color:var(--text2);margin:6px 0 4px">Regelwerk (steht auf der öffentlichen Turnierseite):</div>
      <textarea id="ht-e-regeln" rows="7" style="${fld};width:100%;resize:vertical">${esc(cfg.regeln||"")}</textarea>
      <button class="btn btn-sm" style="margin-top:4px" onclick="htRegelnVorlage()">↺ Vorlage zur gewählten Spielform laden</button>
      <div style="font-size:11px;color:var(--text2);margin:10px 0 4px">Infos für die Gastvereine (Anreise, Parken, Turnierleitung …):</div>
      <textarea id="ht-e-infos" rows="6" style="${fld};width:100%;resize:vertical">${esc(cfg.infos||"")}</textarea>
      <button class="btn btn-sm btn-p" style="margin-top:6px" onclick="htTexteSave(this)"><i class="ti ti-device-floppy"></i>Regeln &amp; Infos speichern</button>
    </details>
    <button class="btn btn-p" style="width:100%" onclick="htGenerieren()"><i class="ti ti-calendar-bolt"></i>${plan.length?"Spielplan NEU erzeugen":"Spielplan erzeugen"}</button>
    ${plan.length?`
      <div style="font-weight:800;font-size:13.5px;margin:14px 0 6px">📅 Spielplan <span style="font-weight:400;font-size:11px;color:var(--text3)">(${plan.length} Spiele · ${HT_SPIELFORM[cfg.spielform]||""})</span></div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn btn-sm" style="flex:1" onclick="htShift(5)" title="Alle noch offenen Spiele 5 Minuten nach hinten – wenn sich der Zeitplan schiebt">⏩ Rest +5 Min.</button>
        <button class="btn btn-sm" style="flex:1" onclick="htShift(-5)" title="Wieder 5 Minuten nach vorn">⏪ Rest −5 Min.</button>
      </div>
      ${plan.map(spielZeile).join("")}
      ${finalsOffen?`<button class="btn btn-sm" style="width:100%" onclick="htFinalsFill()">🏁 Finalrunde füllen (nach Gruppen bzw. Halbfinals)</button>`:""}
      ${tabellen}
      ${cfg.format==="festival"?'<div style="font-size:11.5px;color:#16a34a;margin-top:6px">🦅 Festival-Modus: alle spielen gleich viel, bewusst keine Tabelle (DFB-Kinderfußball).</div>':""}
      <div style="font-weight:800;font-size:13.5px;margin:14px 0 6px">📤 An die Gast-Trainer</div>
      <div style="font-size:11px;color:var(--text2);word-break:break-all;background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:8px">${esc(url)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-p" onclick="htShare()"><i class="ti ti-share"></i>Link teilen</button>
        <a class="btn btn-sm" href="https://wa.me/?text=${encodeURIComponent("🏆 "+_HT.name+" – Spielplan & Live-Ergebnisse: "+url)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a class="btn btn-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link"></i>Ansicht öffnen</a>
      </div>
      <div style="text-align:center;margin-top:10px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}" alt="QR-Code zum Turnierplan" width="180" height="180" style="border-radius:10px;background:#fff;padding:6px"></div>
      <div style="font-size:11px;color:var(--text2);margin-top:12px">✏️ <b>Helfer-Link</b> – wie der Zuschauer-Link, aber mit Schreib-Code: wer ihn hat (z. B. der Anzeigetisch), darf Ergebnisse eintragen, sonst nichts.</div>
      <button class="btn btn-sm" style="margin-top:4px" onclick="htShareHelfer()"><i class="ti ti-pencil"></i>Helfer-Link teilen</button>
      <div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">📣 Live-Durchsage</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px">Erscheint groß auf der öffentlichen Seite und im Monitor-Modus – z. B. wenn sich der Plan schiebt.</div>
      ${cfg.durchsage?`<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:8px 10px;font-size:12.5px;margin-bottom:6px">📣 <b>${esc(cfg.durchsage)}</b> <span style="color:var(--text3);font-size:10.5px">(${esc(cfg.durchsage_um||"")} Uhr)</span></div>`:""}
      <div style="display:flex;gap:6px">
        <input id="ht-durchsage" placeholder="z. B. Siegerehrung 13:30 am Vereinsheim" style="${fld};flex:1;min-width:0" onkeydown="if(event.key==='Enter')htDurchsage()">
        <button class="btn btn-sm btn-p" onclick="htDurchsage()"><i class="ti ti-speakerphone"></i>Senden</button>
      </div>
      ${cfg.durchsage?`<button class="btn btn-sm" style="margin-top:6px" onclick="htDurchsage(true)">Durchsage beenden</button>`:""}
      <div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">🤝 Fair-Play-Pokal</div>
      <select id="ht-fairplay" onchange="htFairplay(this.value)" style="${fld};width:100%"><option value="">– noch nicht vergeben –</option>${teams.map((t,i)=>`<option value="${i}"${cfg.fairplay==i?" selected":""}>${esc(t)}</option>`).join("")}</select>
      <div style="font-size:10.5px;color:var(--text3);margin-top:4px">Das fairste Team des Turniers – erscheint auf der öffentlichen Seite und bekommt eine eigene Urkunde.</div>
      <div style="font-weight:800;font-size:13.5px;margin:14px 0 4px">🖨️ Drucken</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="htFeldDruck()">🖨️ Feld-Aushänge (je Feld eine Seite)</button>
        <button class="btn btn-sm" onclick="htUrkundenDruck()">🏅 Team-Urkunden (alle Teams)</button>
      </div>
    `:""}
    <button class="btn btn-sm" style="width:100%;margin-top:14px;color:#dc2626" onclick="htDelete()"><i class="ti ti-trash"></i>Turnier löschen</button>`;
}
// Formatwechsel: Gruppen-Auswahl ein-/ausblenden, ohne Eingaben zu verlieren
function htRenderCfg(){ Object.assign(_HT.config,_htCfgLesen()); htRender(); }
function _htCfgLesen(){
  const alt=_HT&&_HT.config||{};
  // Spread zuerst: unbekannte Schlüssel (durchsage, fairplay …) überleben jedes Speichern
  return {...alt,
    felder:Number(document.getElementById("ht-e-felder")?.value)||alt.felder||1,
    start:document.getElementById("ht-e-start")?.value||alt.start||"10:00",
    spieldauer:Number(document.getElementById("ht-e-dauer")?.value)||alt.spieldauer||12,
    pause:document.getElementById("ht-e-pause")?(Number(document.getElementById("ht-e-pause").value)||0):(alt.pause==null?3:alt.pause),
    puffer:document.getElementById("ht-e-puffer")?(Number(document.getElementById("ht-e-puffer").value)||0):(alt.puffer==null?10:alt.puffer),
    format:document.getElementById("ht-e-format")?.value||alt.format||"liga",
    gruppen:Number(document.getElementById("ht-e-gruppen")?.value)||alt.gruppen||2,
    spielform:document.getElementById("ht-e-spielform")?.value||alt.spielform||"f4",
    regeln:document.getElementById("ht-e-regeln")?document.getElementById("ht-e-regeln").value:(alt.regeln||""),
    infos:document.getElementById("ht-e-infos")?document.getElementById("ht-e-infos").value:(alt.infos||"")
  };
}
function htRegelnVorlage(){
  const sf=document.getElementById("ht-e-spielform")?.value||"f4";
  const ta=document.getElementById("ht-e-regeln"); if(!ta)return;
  if(ta.value.trim()&&!confirm("Regelwerk durch die Vorlage ersetzen?"))return;
  ta.value=HT_REGELN[sf]||"";
}
async function htTexteSave(btn){
  if(btn)btn.disabled=true;
  const ok=await htPatch({config:_htCfgLesen(),datum:document.getElementById("ht-e-datum")?.value||_HT.datum});
  if(btn)btn.disabled=false;
  if(ok)toast("Gespeichert ✓");
}
// Aus der Gegner-DB: erster Tipp = Vereinsname, weitere Tipps = „… 2", „… 3" (mehrere Mannschaften)
async function htTeamAusDB(name){
  const teams=_HT.teams||[];
  let neu=name, nr=2;
  while(teams.some(t=>t.toLowerCase()===neu.toLowerCase())){neu=name+" "+nr;nr++;}
  if(await htPatch({teams:[...teams,neu],config:_htCfgLesen(),datum:document.getElementById("ht-e-datum")?.value||_HT.datum}))htRender();
}
async function htTeamPlus(){
  const inp=document.getElementById("ht-team-neu");
  const name=(inp?.value||"").trim(); if(!name)return;
  if((_HT.teams||[]).some(t=>t.toLowerCase()===name.toLowerCase())){toast("Team ist schon dabei – für eine zweite Mannschaft z. B. „… 2“ anhängen","err");return;}
  if(await htPatch({teams:[...(_HT.teams||[]),name],config:_htCfgLesen(),datum:document.getElementById("ht-e-datum")?.value||_HT.datum}))htRender();
}
async function htTeamWeg(i){
  const teams=(_HT.teams||[]).slice();
  if((_HT.plan||[]).length&&!confirm("Team entfernen? Der Spielplan muss danach neu erzeugt werden."))return;
  teams.splice(i,1);
  if(await htPatch({teams,plan:[]}))htRender();
}
async function htTeamHoch(i){
  const teams=(_HT.teams||[]).slice();
  const t=teams.splice(i,1)[0];teams.splice(i-1,0,t);
  if(await htPatch({teams}))htRender();
}
async function htGenerieren(){
  const teams=_HT.teams||[];
  if(teams.length<3){toast("Mindestens 3 Teams eintragen","err");return;}
  const cfg=_htCfgLesen();
  if(cfg.format==="gruppen"&&teams.length<cfg.gruppen*2){toast("Zu wenige Teams für "+cfg.gruppen+" Gruppen","err");return;}
  const hatErg=(_HT.plan||[]).some(p=>p.ta!=null);
  if(hatErg&&!confirm("Es gibt schon Ergebnisse – Spielplan wirklich neu erzeugen? Alle Ergebnisse gehen verloren."))return;
  const plan=_htGen(teams,cfg);
  if(await htPatch({config:cfg,plan,datum:document.getElementById("ht-e-datum")?.value||_HT.datum})){
    toast("📅 Spielplan steht – "+plan.length+" Spiele");
    htRender();
  }
}
async function htTor(mi,seite,delta){
  const plan=(_HT.plan||[]).slice();
  const p=plan[mi]; if(!p)return;
  p[seite]=Math.max(0,(p[seite]==null?0:p[seite])+delta);
  const andere=seite==="ta"?"tb":"ta"; if(p[andere]==null)p[andere]=0;
  if(await htPatch({plan}))htRender();
}
/* Finalrunde füllen: löst Platzhalter auf, sobald die Daten da sind.
   Gruppen-Ränge (A1…D3) nach der Gruppenphase; GS/GZ (3 Gruppen) im Quer-Vergleich
   aller Gruppensieger bzw. Zweiten; Sieger/Verlierer der Halbfinals (4 Gruppen)
   nach den HF-Ergebnissen – bei HF-Unentschieden bitte erst einen Sieger eintragen. */
async function htFinalsFill(){
  const plan=(_HT.plan||[]).slice(), teams=_HT.teams||[];
  const offenGruppe=plan.some(p=>typeof p.a==="number"&&/^Gruppe/.test(p.phase||"")&&p.ta==null);
  if(offenGruppe&&!confirm("Noch nicht alle Gruppenspiele haben ein Ergebnis – Platzhalter trotzdem nach aktuellem Stand füllen?"))return;
  const gruppen=_htGruppenN(_HT);
  const tabs=gruppen.map((idxs,g)=>_htTabelle(plan.filter(p=>p.phase==="Gruppe "+HT_GRLABEL[g]),idxs,teams));
  const cmp=(a,b)=>b.pkt-a.pkt||(b.tore-b.geg)-(a.tore-a.geg)||b.tore-a.tore;
  const sieger=tabs.map(t=>t[0]).filter(Boolean).sort(cmp);
  const zweite=tabs.map(t=>t[1]).filter(Boolean).sort(cmp);
  let hfUnentschieden=false;
  const aufloesen=v=>{
    const s=String(v);
    let m=/^([A-D])(\d+)$/.exec(s);
    if(m){const rang=(tabs[HT_GRLABEL.indexOf(m[1])]||[])[Number(m[2])-1];return rang?rang.i:v;}
    m=/^GS(\d)$/.exec(s); if(m)return sieger[Number(m[1])-1]?sieger[Number(m[1])-1].i:v;
    if(s==="GZ1")return zweite[0]?zweite[0].i:v;
    m=/^([SV])\|(.+)$/.exec(s);
    if(m){
      const hf=plan.find(p=>p.phase===m[2]&&typeof p.a==="number"&&typeof p.b==="number"&&p.ta!=null);
      if(!hf)return v;
      if(hf.ta===hf.tb){hfUnentschieden=true;return v;}
      const siegerIdx=hf.ta>hf.tb?hf.a:hf.b, verliererIdx=hf.ta>hf.tb?hf.b:hf.a;
      return m[1]==="S"?siegerIdx:verliererIdx;
    }
    return v;
  };
  plan.forEach(p=>{if(typeof p.a==="string")p.a=aufloesen(p.a);if(typeof p.b==="string")p.b=aufloesen(p.b);});
  if(await htPatch({plan})){
    toast(hfUnentschieden?"Halbfinale unentschieden – bitte erst einen Sieger eintragen (z. B. nach Neunmeter)":"🏁 Finalrunde gefüllt");
    htRender();
  }
}
function htShare(){
  const url=_htUrl(_HT.slug);
  if(navigator.share){navigator.share({title:_HT.name,text:"🏆 "+_HT.name+" – Spielplan & Live-Ergebnisse",url}).catch(()=>{});return;}
  try{navigator.clipboard.writeText(url);toast("Link kopiert ✓");}catch(e){prompt("Link kopieren:",url);}
}
// Helfer-Link = Zuschauer-Link + Schreib-Code (nur Ergebnisse, via RPC heimturnier_ergebnis)
function htShareHelfer(){
  if(!_HT.edit_code){toast("Kein Schreib-Code vorhanden","err");return;}
  const url=_htUrl(_HT.slug)+"&code="+encodeURIComponent(_HT.edit_code);
  if(navigator.share){navigator.share({title:_HT.name+" (Helfer)",text:"✏️ Helfer-Link "+_HT.name+" – Ergebnisse eintragen",url}).catch(()=>{});return;}
  try{navigator.clipboard.writeText(url);toast("Helfer-Link kopiert ✓");}catch(e){prompt("Helfer-Link kopieren:",url);}
}
/* Turniertage schieben sich gern nach hinten: verschiebt alle noch offenen Begegnungen
   (ab dem ersten Spiel ohne Ergebnis) um +/- Minuten – der öffentliche Link zieht mit. */
async function htShift(delta){
  const plan=(_HT.plan||[]).slice();
  const ab=plan.findIndex(p=>p.ta==null);
  if(ab<0){toast("Alle Spiele haben schon ein Ergebnis","err");return;}
  for(let i=ab;i<plan.length;i++){
    const [h,m]=(plan[i].zeit||"00:00").split(":").map(Number);
    const t=Math.max(0,h*60+m+delta);
    plan[i].zeit=String(Math.floor(t/60)%24).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
  }
  if(await htPatch({plan})){
    toast(delta>0?"⏩ Offene Spiele +"+delta+" Min. geschoben":"⏪ Offene Spiele "+Math.abs(delta)+" Min. vorgezogen");
    htRender();
  }
}
/* Live-Durchsage: kurze Nachricht, die groß auf der öffentlichen Seite und im
   Monitor-Modus erscheint (Auto-Refresh trägt sie in <30 s zu allen). */
async function htDurchsage(beenden){
  const cfg=_htCfgLesen();
  if(beenden){cfg.durchsage="";cfg.durchsage_um="";}
  else{
    const txt=(document.getElementById("ht-durchsage")?.value||"").trim();
    if(!txt){toast("Bitte erst den Text eingeben","err");return;}
    cfg.durchsage=txt;
    cfg.durchsage_um=new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  }
  if(await htPatch({config:cfg})){
    toast(beenden?"Durchsage beendet":"📣 Durchsage ist draußen – erscheint bei allen in unter 30 Sekunden");
    htRender();
  }
}
async function htFairplay(v){
  const cfg=_htCfgLesen();
  cfg.fairplay=(v===""?null:Number(v));
  if(await htPatch({config:cfg}))toast(v===""?"Fair-Play-Pokal zurückgenommen":"🤝 Fair-Play-Pokal vergeben");
}
/* Endstand aus den Platzierungsspielen (Finale = 1/2, Spiel um Platz N = N/N+1);
   Liga füllt aus der Tabelle auf. Wer kein Platzierungsspiel hatte (3./4. Gruppen,
   Festival), bleibt ohne Nummer und bekommt eine Teilnahme-Urkunde. */
function _htEndstand(row){
  const teams=row.teams||[], plan=row.plan||[], cfg=row.config||{};
  const platz={};
  if(cfg.format!=="festival"){
    plan.forEach(p=>{
      if(typeof p.a!=="number"||typeof p.b!=="number"||p.ta==null||p.tb==null||p.ta===p.tb)return;
      let basis=null;
      if(p.phase==="Finale")basis=1;
      else{const m=/^Spiel um Platz (\d+)$/.exec(p.phase||"");if(m)basis=Number(m[1]);}
      if(basis==null)return;
      const w=p.ta>p.tb?p.a:p.b, l=p.ta>p.tb?p.b:p.a;
      platz[w]=basis; platz[l]=basis+1;
    });
    if(cfg.format==="liga"){
      _htTabelle(plan,teams.map((_,i)=>i),teams).forEach((z,i)=>{if(platz[z.i]==null)platz[z.i]=i+1;});
    }
  }
  const nummeriert=teams.map((_,i)=>i).filter(i=>platz[i]!=null).sort((a,b)=>platz[a]-platz[b]);
  const rest=teams.map((_,i)=>i).filter(i=>platz[i]==null);
  return {platz,nummeriert,rest};
}
// Druck über ein unsichtbares iframe: kein Popup-Blocker, App bleibt unangetastet
function _htDruck(html,titel,css){
  const f=document.createElement("iframe");
  f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d=f.contentDocument;
  d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titel)}</title><style>${css}</style></head><body>${html}</body></html>`);
  d.close();
  setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print();}catch(e){}},350);
  setTimeout(()=>f.remove(),60000);
}
function htUrkundenDruck(){
  const teams=_HT.teams||[], cfg=_HT.config||{};
  if(!teams.length){toast("Erst Teams eintragen","err");return;}
  const {platz,nummeriert,rest}=_htEndstand(_HT);
  const datum=_HT.datum?new Date(_HT.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"}):"";
  const seite=(team,zeile)=>`<div class="seite"><div class="rahmen">
      <div style="font-size:54px">🏆</div>
      <div class="t1">URKUNDE</div>
      <div class="t2">${esc(_HT.name)}</div>
      <div class="team">${esc(team)}</div>
      <div class="platz">${zeile}</div>
      <div class="fuss">${esc(datum)}${datum?" · ":""}SV Adler Dellbrück U9 · Fairness zuerst 🦅</div>
    </div></div>`;
  let html="";
  nummeriert.forEach(i=>{const p=platz[i];html+=seite(teams[i],p===1?"🥇 1. Platz":p===2?"🥈 2. Platz":p===3?"🥉 3. Platz":p+". Platz");});
  rest.forEach(i=>{html+=seite(teams[i],cfg.format==="festival"?"⚽ Starke Leistung beim Festival":"⚽ Starke Teilnahme");});
  if(cfg.fairplay!=null&&teams[cfg.fairplay])html+=seite(teams[cfg.fairplay],"🤝 Fair-Play-Pokal – das fairste Team des Turniers");
  const css=`body{font-family:Georgia,'Times New Roman',serif;margin:0}
    .seite{page-break-after:always;display:flex;align-items:center;justify-content:center;min-height:96vh}
    .rahmen{border:6px double #b45309;border-radius:14px;padding:56px 40px;text-align:center;width:82%}
    .t1{font-size:34px;font-weight:700;letter-spacing:8px;color:#b45309;margin-top:8px}
    .t2{font-size:16px;color:#555;margin-top:10px}
    .team{font-size:38px;font-weight:700;margin:26px 0 10px}
    .platz{font-size:22px;color:#1e3a8a;font-weight:700}
    .fuss{font-size:12px;color:#777;margin-top:40px}`;
  _htDruck(html,"Team-Urkunden "+_HT.name,css);
  toast("🏅 "+(nummeriert.length+rest.length+((cfg.fairplay!=null&&teams[cfg.fairplay])?1:0))+" Urkunden im Druckdialog");
}
function htFeldDruck(){
  const teams=_HT.teams||[], plan=_HT.plan||[], cfg=_HT.config||{};
  if(!plan.length){toast("Erst den Spielplan erzeugen","err");return;}
  const felder=[...new Set(plan.map(p=>p.feld||1))].sort((a,b)=>a-b);
  const html=felder.map(f=>`<div class="seite">
      <h1>🏆 ${esc(_HT.name)} · Feld ${f}</h1>
      <table><tr><th>Zeit</th><th>Runde</th><th>Begegnung</th><th class="erg">Ergebnis</th></tr>
      ${plan.filter(p=>(p.feld||1)===f).map(p=>`<tr><td class="z">${esc(p.zeit||"")}</td><td class="ph">${esc(p.phase||"")}</td><td>${esc(_htName(p.a,teams))} – ${esc(_htName(p.b,teams))}</td><td class="erg">${p.ta!=null?p.ta+" : "+p.tb:""}</td></tr>`).join("")}
      </table>
      <div class="fuss">Spielzeit ${cfg.spieldauer||"?"} Min.${HT_SPIELFORM[cfg.spielform]?" · "+HT_SPIELFORM[cfg.spielform]:""} · SV Adler Dellbrück U9</div>
    </div>`).join("");
  const css=`body{font-family:Inter,Arial,sans-serif;margin:0;padding:24px}
    .seite{page-break-after:always}
    h1{font-size:26px;margin:0 0 14px}
    table{width:100%;border-collapse:collapse;font-size:18px}
    th{text-align:left;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#666;padding:6px 8px;border-bottom:2px solid #333}
    td{padding:10px 8px;border-bottom:1px solid #ccc}
    .z{font-weight:700;white-space:nowrap}
    .ph{color:#b45309;font-size:14px;white-space:nowrap}
    .erg{min-width:110px;font-weight:700}
    .fuss{font-size:12px;color:#777;margin-top:16px}`;
  _htDruck(html,"Feld-Aushänge "+_HT.name,css);
  toast("🖨️ "+felder.length+" Feld-Aushänge im Druckdialog");
}
async function htDelete(){
  if(!confirm(`„${_HT.name}" samt Spielplan wirklich löschen?`))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/heimturnier?id=eq.${_HT.id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok&&r.status!==204){toast("Konnte nicht löschen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Gelöscht ✓");
  htListe();
}
/* ── M3: Öffentliche Turnierseite (?turnier=<slug>) – kein Login, nur Teamnamen.
   Eigenes helles Layout (unabhängig vom App-Theme), Auto-Aktualisierung alle 30 s.
   Mit &code=<edit_code> wird sie zum Helfer-Modus: Ergebnisse antippbar (RPC-gesichert);
   anon darf die Spalte edit_code nicht lesen, deshalb hier eine explizite Spaltenliste. ── */
let _htPub=null;
/* ═══════════════════════════════════════════════════════════════════════════
   FESTIVAL (v484) – PO: „Wenn wir ein Festival als Heimspiel haben, kommen 2 bis 3
   andere Mannschaften zu uns. Dafuer muessen wir ein kleines Turnier mit 1 Stunde Dauer
   organisieren und planen. Wir erfahren vorher, welche Mannschaften es sind und auch mit
   wie vielen Kindern die Teams anreisen. … Standard waere ein 4+1 Feld und 2 x FUNiño
   Felder." Entscheidungen (Kacheln): die App rechnet Teams aus den Kinderzahlen und der
   Trainer korrigiert; Runden, auf allen Feldern gleichzeitig; keine Tabelle, Tore optional;
   das Festival ersetzt das grosse Turnier-Formular als Standardweg.
   Gespeichert in derselben Tabelle heimturnier – config.art="festival" unterscheidet. */
const FST_FORMEN={
  f4:    {label:"4+1",        kurz:"4+1", lang:"4+1 mit Torwart", auf:5, tore:"2 Jugendtore", farbe:"#1d4ed8"},
  funino:{label:"FUNiño 3:3", kurz:"3:3", lang:"FUNiño 3 gegen 3",auf:3, tore:"4 Minitore",   farbe:"#15803d"}
};
const FST_GRUSS="Herzlich willkommen bei den Adlern! Schön, dass ihr dabei seid – wir freuen uns auf tolle Spiele mit euch.";
const FST_STANDARD_FELDER=[{form:"f4"},{form:"funino"},{form:"funino"},{form:"f4"}];   // v486 PO: „Standard alle 4 Felder anlegen" – Käfig, Funino 1, Funino 2, 4+1 oben
const FST_START="10:15", FST_PAUSE=5;   // PO: „Beginn ist immer 10:15" · „5 Minuten Trinkpause zwischen den Spielen"
function fstIst(row){ return ((row||_HT||{}).config||{}).art==="festival"; }
/* v490 PO: „Das gleiche Vorgehen brauchen wir für jedes Heimspiel, auch wenn es kein Festival
   ist. Bei einem Heimspiel kommt nur ein Gegner, der stellt aber evtl. mehrere Teams, so wie
   wir auch." Das ist derselbe Fall mit zwei Vereinen statt vier – also dieselbe Maschine
   (art bleibt „festival"), nur ein anderes Wort auf den Knöpfen. */
function fstWort(row){ return (((row||_HT||{}).config||{}).anlass==="heimspiel")?"Heimspiel":"Festival"; }
let _htAnlass="";
function _fstF(k){ return FST_FORMEN[k]||FST_FORMEN.funino; }
/* Feldnamen, wie sie am Platz heissen (PO): das erste 4+1-Feld ist immer der „Käfig",
   das zweite „4+1 oben" (obere Haelfte des grossen Platzes), FUNiño-Felder „Funino 1, 2 …".
   Ein eigener Name je Feld ueberschreibt den Standard. */
const FST_NAMEN_F4=["Käfig","4+1 oben"];
function fstFeldName(felder,i){
  const f=(felder&&felder.length)?felder:FST_STANDARD_FELDER;
  const x=f[i]; if(!x)return "Feld "+(i+1);
  if(x.name&&String(x.name).trim())return String(x.name).trim();
  const gleich=f.slice(0,i+1).filter(y=>(y.form||"funino")===(x.form||"funino")).length;   // wievieltes Feld dieser Form
  if((x.form||"funino")==="f4")return FST_NAMEN_F4[gleich-1]||("4+1 "+gleich);
  return "Funino "+gleich;
}
async function fstFeldNameSet(i,wert){
  const cfg=_fstCfgLesen(); const f=cfg.felder.slice(); if(!f[i])return;
  const name=String(wert||"").trim();
  f[i]=name?{...f[i],name}:{form:f[i].form};
  if(await _fstSpeichern(f))fstRender();
}
/* Wie viele Teams stellt ein Verein? So viele, dass jedes Team eine spielbare Groesse hat
   (Feldbesetzung plus mindestens ein Wechselkind). Bei gemischten Feldern zaehlt der
   Durchschnitt der Feldgroessen – 10 Kinder auf 4+1/FUNiño ergeben zwei Teams. */
function fstTeamsVorschlag(kinder,felder){
  const f=(felder&&felder.length)?felder:FST_STANDARD_FELDER;
  const schnitt=f.reduce((a,x)=>a+_fstF(x.form).auf,0)/f.length;
  return Math.max(1,Math.min(4,Math.round(kinder/(schnitt+1))));
}
/* Felder aus der Teamzahl: je Feld eine Paarung, also Teams/2 Felder. Das erste Feld ist
   4+1 (Jugendtore), die weiteren FUNiño – genau der Aufbau, den der Verein hinstellt. */
function fstFelderVorschlag(teamZahl){
  const n=Math.max(1,Math.round(teamZahl/2));
  return Array.from({length:n},(_,i)=>({form:i===0?"f4":"funino"}));
}
/* v486 PO: „Standard alle 4 Felder … wenn dann nur 3 Felder benoetigt werden, soll das
   angepasst werden … grundsaetzlich 4+1 oben loeschen, aber pruefen, was besser auf die Teams
   passt." Der Plan braucht Teams/2 Felder. Ueberzaehlige fallen von hinten weg – also zuerst
   „4+1 oben". Nur bei grossen Teams (im Schnitt 6+ Kinder) bleibt das zweite 4+1 und ein
   FUNiño-Feld geht, weil dort sonst die Haelfte auf der Bank saesse. */
function fstFelderKuerzen(felder,teams){
  const f=((felder&&felder.length)?felder:FST_STANDARD_FELDER).slice();
  const n=Math.max(1,Math.round((teams||[]).length/2));
  if(f.length<=n)return f;
  const kinder=(teams||[]).reduce((a,t)=>a+(t.kinder||0),0);
  const gross=teams.length>0&&kinder/teams.length>=6;
  while(f.length>n){
    const f4=f.map((x,i)=>(x.form||"funino")==="f4"?i:-1).filter(i=>i>=0);
    const fu=f.map((x,i)=>(x.form||"funino")!=="f4"?i:-1).filter(i=>i>=0);
    let weg;
    if(gross&&f4.length>=2&&fu.length>=1)weg=fu[fu.length-1];      // grosse Teams: 4+1 oben bleibt, letztes FUNiño geht
    else if(f4.length>=2)weg=f4[f4.length-1];                       // sonst zuerst das zweite 4+1 (oben)
    else weg=f.length-1;
    f.splice(weg,1);
  }
  return f;
}
/* Aus den Vereinen die Teamliste bauen: „Adler 1", „Adler 2", „Auweiler 1" …
   Die Kinder eines Vereins werden gleichmaessig auf seine Teams verteilt. */
function fstTeamsBauen(vereine){
  const teams=[];
  (vereine||[]).forEach(v=>{
    const anz=Math.max(1,v.teams||1);
    /* Kurzname fuer die Spielplan-Zeile: „SV Adler Dellbrück" → „Adler Dellbrück".
       Nur kuerzen, wenn danach wirklich ein Name steht – „VfB 05 Köln" bliebe sonst „05 Köln". */
    const ohne=String(v.name||"Team").replace(/^(SV|SC|FC|TuS|VfL|VfB|DJK|SG|TSV|1\.\s*FC)\s+/i,"").trim();
    const kurz=(ohne&&/^[A-Za-zÄÖÜäöüß]/.test(ohne))?ohne:String(v.name||"Team");
    for(let i=0;i<anz;i++){
      const rest=Math.floor((v.kinder||0)/anz)+(i<((v.kinder||0)%anz)?1:0);
      teams.push({name:anz>1?`${kurz} ${i+1}`:kurz, verein:v.name, kinder:rest});
    }
  });
  return teams;
}
/* Kreismethode: n-1 Runden, in jeder Runde spielt jedes Team hoechstens einmal.
   Bei ungerader Teamzahl setzt reihum eines aus (-1 = Freilos). */
function _fstRunden(n){
  const idx=Array.from({length:n},(_,i)=>i);
  if(n%2)idx.push(-1);
  const m=idx.length, runden=[];
  for(let r=0;r<m-1;r++){
    const paare=[];
    for(let i=0;i<m/2;i++){ const a=idx[i], b=idx[m-1-i]; if(a>=0&&b>=0)paare.push(r%2?[b,a]:[a,b]); }
    runden.push(paare);
    idx.splice(1,0,idx.pop());
  }
  return runden;
}
/* Der Spielplan: Runden nacheinander, in jeder Zeitscheibe spielen alle Felder gleichzeitig.
   Passen mehr Paarungen in eine Runde als Felder da sind, wird die Runde geteilt – so spielt
   nie ein Team zweimal gleichzeitig. Das Feld wandert je Zeitscheibe weiter, damit jede
   Mannschaft beide Formate sieht (PO: „nicht fest 4+1 oder nur FUNiño, sondern durchwechseln"). */
function fstPlanBauen(teams,cfg){
  const felder=(cfg.felder&&cfg.felder.length)?cfg.felder:FST_STANDARD_FELDER;
  const F=felder.length, n=teams.length;
  if(n<2)return [];
  const scheiben=[];
  _fstRunden(n).forEach(paare=>{ for(let i=0;i<paare.length;i+=F)scheiben.push(paare.slice(i,i+F)); });
  const spiel=Math.max(3,cfg.spieldauer||8), wechsel=Math.max(0,cfg.wechsel==null?FST_PAUSE:cfg.wechsel);
  const gesamt=Math.max(spiel,cfg.dauer||60);
  const max=Math.max(1,Math.floor((gesamt+wechsel)/(spiel+wechsel)));
  const [sh,sm]=String(cfg.start||"10:00").split(":").map(Number);
  const plan=[];
  scheiben.slice(0,max).forEach((paare,s)=>{
    const min=(sh||0)*60+(sm||0)+s*(spiel+wechsel);
    const zeit=String(Math.floor(min/60)%24).padStart(2,"0")+":"+String(min%60).padStart(2,"0");
    paare.forEach((p,k)=>{
      const fi=(k+s)%F;
      plan.push({runde:s+1,feld:fi+1,form:felder[fi].form||"funino",zeit,a:p[0],b:p[1],phase:"Runde "+(s+1)});
    });
  });
  return plan;
}
/* Wie viele Zeitscheiben braucht es fuer die volle Runde? Fuer die ehrliche Ansage
   „passt in eine Stunde" bzw. „dafuer braucht ihr X Minuten". */
function fstBedarf(teams,cfg){
  const F=Math.max(1,((cfg.felder&&cfg.felder.length)?cfg.felder:FST_STANDARD_FELDER).length);
  const n=teams.length;
  if(n<2)return {scheiben:0,minuten:0};
  let scheiben=0; _fstRunden(n).forEach(paare=>{ scheiben+=Math.ceil(paare.length/F); });
  const spiel=Math.max(3,cfg.spieldauer||8), wechsel=Math.max(0,cfg.wechsel==null?FST_PAUSE:cfg.wechsel);
  return {scheiben,minuten:scheiben*spiel+(scheiben-1)*wechsel};
}
function _fstCfgLesen(){
  const alt=(_HT&&_HT.config)||{};
  const felder=(alt.felder&&alt.felder.length)?alt.felder:FST_STANDARD_FELDER.slice();
  return {...alt, art:"festival", format:"festival",
    start:document.getElementById("fst-start")?.value||alt.start||FST_START,
    dauer:Number(document.getElementById("fst-dauer")?.value)||alt.dauer||60,
    spieldauer:Number(document.getElementById("fst-spiel")?.value)||alt.spieldauer||8,
    wechsel:document.getElementById("fst-wechsel")?(Number(document.getElementById("fst-wechsel").value)||0):(alt.wechsel==null?FST_PAUSE:alt.wechsel),
    felder, vereine:alt.vereine||[],
    infos:document.getElementById("fst-infos")?document.getElementById("fst-infos").value:(alt.infos||HT_INFOS_VORLAGE)
  };
}
async function _fstSpeichern(felder){
  const cfg=_fstCfgLesen();
  if(felder)cfg.felder=felder;
  const teams=fstTeamsBauen(cfg.vereine);
  return htPatch({config:cfg,teams:teams.map(t=>t.name),
    datum:document.getElementById("fst-datum")?.value||_HT.datum});
}
/* Vereine pflegen – Name, angereiste Kinder, Teams. Die Teamzahl schlaegt die App vor,
   der Trainer aendert sie. */
async function fstVereinPlus(name){
  const cfg=_fstCfgLesen();
  const v=(cfg.vereine||[]).slice();
  const kinder=10;
  v.push({name:name||"Neuer Verein",kinder,teams:fstTeamsVorschlag(kinder,cfg.felder)});
  cfg.vereine=v;
  if(await htPatch({config:cfg,teams:fstTeamsBauen(v).map(t=>t.name)}))fstRender();
}
async function fstVereinWeg(i){
  const cfg=_fstCfgLesen(); const v=(cfg.vereine||[]).slice(); v.splice(i,1); cfg.vereine=v;
  if(await htPatch({config:cfg,teams:fstTeamsBauen(v).map(t=>t.name)}))fstRender();
}
async function fstVereinSet(i,feld,wert){
  const cfg=_fstCfgLesen(); const v=(cfg.vereine||[]).slice(); if(!v[i])return;
  if(feld==="kinder"){ v[i].kinder=Math.max(0,parseInt(wert)||0); v[i].teams=fstTeamsVorschlag(v[i].kinder,cfg.felder); if(fstIstUnser(v[i]))v[i].manuell=true; }
  else if(feld==="teams"){ v[i].teams=Math.max(1,Math.min(4,parseInt(wert)||1)); if(fstIstUnser(v[i]))v[i].manuell=true; }
  else v[i].name=String(wert||"").trim()||v[i].name;
  cfg.vereine=v;
  if(await htPatch({config:cfg,teams:fstTeamsBauen(v).map(t=>t.name)}))fstRender();
}
async function fstFeldSet(i,form){ const cfg=_fstCfgLesen(); const f=cfg.felder.slice(); if(f[i])f[i]=f[i].name?{form,name:f[i].name}:{form}; if(await _fstSpeichern(f))fstRender(); }
async function fstFeldPlus(){ const cfg=_fstCfgLesen(); if(cfg.felder.length>=6)return; if(await _fstSpeichern(cfg.felder.concat([{form:"funino"}])))fstRender(); }
async function fstFeldWeg(i){ const cfg=_fstCfgLesen(); if(cfg.felder.length<=1)return; const f=cfg.felder.slice(); f.splice(i,1); if(await _fstSpeichern(f))fstRender(); }
async function fstFelderAuto(){
  const cfg=_fstCfgLesen();
  const teams=fstTeamsBauen(cfg.vereine);
  if(!teams.length){toast("Erst Vereine eintragen","err");return;}
  if(await _fstSpeichern(fstFelderVorschlag(teams.length)))fstRender();
}
async function fstZeitSpeichern(){ if(await _fstSpeichern())fstRender(); }
async function fstPlanErstellen(){
  const cfg=_fstCfgLesen();
  const teams=fstTeamsBauen(cfg.vereine);
  if(teams.length<2){toast("Mindestens zwei Teams – bitte Vereine eintragen","err");return;}
  if((_HT.plan||[]).some(p=>p.ta!=null)&&!confirm("Es gibt schon Ergebnisse – Spielplan neu erzeugen? Die Tore gehen verloren."))return;
  const felderVorher=cfg.felder.length;
  cfg.felder=fstFelderKuerzen(cfg.felder,teams);   // v486: ueberzaehlige Felder fallen weg, zuerst „4+1 oben"
  _fstTauschWahl=null;
  const plan=fstPlanBauen(teams,cfg);
  if(await htPatch({config:cfg,teams:teams.map(t=>t.name),plan,datum:document.getElementById("fst-datum")?.value||_HT.datum})){
    toast(`📅 Spielplan steht – ${plan.length} Spiele${cfg.felder.length<felderVorher?` auf ${cfg.felder.length} Feldern`:""}`);
    fstRender();
  }
}
/* v486 PO: „Die Anzahl der Kinder fuer unseren Verein direkt aus der Einteilung und
   Anwesenheit Spieltag/Match uebernehmen – da haben wir alle Kinder bereits erfasst und
   auch die Teams gebildet." Quelle: nominierungen „<datum>__nom" (dabei) und „__teams"
   (_anzahl). Unsere Zeile folgt der Einteilung, bis der Trainer sie von Hand aendert. */
function fstIstUnser(v){ return /adler/i.test(String((v&&v.name)||"")); }
async function fstEinteilungLaden(datum){
  if(!datum)return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=in.(${encodeURIComponent(datum+"__nom")},${encodeURIComponent(datum+"__teams")})&select=datum,data`,{headers:sbAuthHeaders()});
    if(!r.ok)return null;
    const rows=(await r.json())||[];
    const nom=rows.find(x=>x.datum===datum+"__nom"), tm=rows.find(x=>x.datum===datum+"__teams");
    const d=(nom&&nom.data)||{};
    const dabei=Object.keys(d).filter(k=>k.charAt(0)!=="_"&&d[k]==="dabei").length;
    const teams=tm&&tm.data&&tm.data._anzahl?Math.max(1,Math.min(4,parseInt(tm.data._anzahl)||1)):0;
    return {dabei,teams};
  }catch(e){return null;}
}
let _fstEinteilung=null;
async function fstEinteilungSync(){
  if(!_HT||!_HT.datum)return;
  const ein=await fstEinteilungLaden(_HT.datum); _fstEinteilung=ein;
  const hinweis=document.getElementById("fst-einteilung");
  if(!ein||!ein.dabei){ if(hinweis)hinweis.textContent="Noch keine Einteilung unter „Teams festlegen“ – Kinderzahl von Hand."; return; }
  const cfg=_HT.config||{}, v=(cfg.vereine||[]).slice();
  const i=v.findIndex(fstIstUnser);
  const teams=ein.teams||fstTeamsVorschlag(ein.dabei,cfg.felder);
  if(i>=0&&!v[i].manuell&&(v[i].kinder!==ein.dabei||v[i].teams!==teams)){
    v[i]={...v[i],kinder:ein.dabei,teams};
    const neu={...cfg,vereine:v};
    if(await htPatch({config:neu,teams:fstTeamsBauen(v).map(t=>t.name)})){ fstRender(); return; }
  }
  if(hinweis)hinweis.innerHTML=`Aus „Teams festlegen“: <b>${ein.dabei} dabei</b>, ${teams} Team${teams===1?"":"s"}${i>=0&&v[i].manuell?` – hier von Hand geändert. <a href="#" onclick="fstEinteilungFolgen();return false" style="color:var(--blue-text);font-weight:700">Wieder übernehmen</a>`:""}`;
}
async function fstEinteilungFolgen(){
  const cfg=_fstCfgLesen(); const v=(cfg.vereine||[]).slice(); const i=v.findIndex(fstIstUnser); if(i<0)return;
  delete v[i].manuell; cfg.vereine=v;
  if(await htPatch({config:cfg}))fstEinteilungSync();
}
/* v486 PO: „Der Plan soll speicherbar und veraenderbar sein von allen Trainern." Gespeichert
   ist er in der Datenbank fuer alle; veraendern heisst: zwei Teams antippen, sie tauschen
   die Plaetze. Zeiten und Felder bleiben. Spielt ein Team dadurch in einer Runde zweimal,
   sagt die App es – und laesst es zu, der Trainer sieht es. */
/* v488 PO: „Regeln in den externen Link einbauen, 4+1 und FUNiño, aus dem DFB-Portal kurz
   auflisten" plus seine eigenen Vereinbarungen. Kacheln: Torwart darf den Rueckpass in die
   Hand nehmen; Abstoss/Abwurf Gegner hinter die Mittellinie; Abklatschen; Eltern feuern an. */
const FST_REGELN={
  alle:{t:"Für alle Spiele",z:[
    "Seitenaus und Ecke: eindribbeln oder einpassen – vor einem Tor mindestens ein Ballkontakt eines Mitspielers",
    "Unklare Situationen (Aus, Foul) klären die Kinder zuerst selbst auf dem Platz – erst dann helfen die Trainer",
    "Berührt der Ball das abgehängte Tor und geht danach rein, zählt das Tor",
    "Kein Abseits",
    "Abklatschen nach jedem Spiel – Tore werden nicht gegen den Gegner bejubelt",
    "Fairer Umgang mit den anderen Teams – wir Trainer sind das Vorbild",
    "Eltern feuern an, coachen nicht – mit Abstand zum Feld",
    "Der Spaß der Kinder steht im Vordergrund – keine Tabelle, kein Ergebnisdruck"]},
  f4:{t:"4+1 · Käfig und 4+1 oben",z:[
    "4 Feldspieler und Torwart auf zwei Jugendtore",
    "Tore dürfen nicht direkt aus der eigenen Hälfte erzielt werden – keine Weitschüsse",
    "Nach einem Tor: Anstoß in der Mitte",
    "Torwart darf den Rückpass in die Hand nehmen",
    "Abstoß und Abwurf: der Gegner geht hinter die Mittellinie"]},
  funino:{t:"FUNiño · Funino 1 und 2",z:[
    "3 gegen 3 auf vier Minitore, ohne Torwart",
    "Tore zählen nur aus der Schusszone (6 m vor den Toren)",
    "Nach einem Tor spielt das Team, das es bekommen hat, von der Grundlinie ein – der Gegner wartet außerhalb der Schusszone",
    "Führt ein Team mit 3 Toren Vorsprung, darf das andere mit 4 Feldspielern spielen, wenn es möchte"]}
};
function fstRegelnHtml(hell,cfg){
  const pause=Math.max(0,(cfg&&cfg.wechsel!=null)?cfg.wechsel:FST_PAUSE);
  const karte=(k)=>`<div style="background:${hell?"#fff":"var(--surface)"};border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-size:12px;font-weight:800;color:${hell?"#475569":"var(--text2)"};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${esc(k.t)}</div>
      <ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.55">${k.z.map(z=>`<li style="margin-bottom:4px">${esc(z)}</li>`).join("")}</ul></div>`;
  const alle={t:FST_REGELN.alle.t,z:FST_REGELN.alle.z.concat(pause?[`Zwischen den Spielen liegen ${pause} Minuten Trinkpause – zum Erholen und für den Platzwechsel`]:[])};
  return karte(FST_REGELN.f4)+karte(FST_REGELN.funino)+karte(alle)
    +`<div style="font-size:11px;color:${hell?"#94a3b8":"var(--text3)"};margin:4px 0 10px">Nach den DFB-Spielformen im Kinderfußball, ergänzt um unsere Vereinbarungen.</div>`;
}
function fstRegelnOpen(){
  document.getElementById("fst-regeln")?.remove();
  const d=document.createElement("div"); d.id="fst-regeln";
  d.setAttribute("role","dialog"); d.setAttribute("aria-modal","true"); d.setAttribute("aria-label","Regeln");
  d.style.cssText="position:fixed;inset:0;background:#f1f5f9;z-index:1000;overflow:auto;-webkit-overflow-scrolling:touch;color:#0f172a;font-family:Inter,system-ui,sans-serif";
  d.innerHTML=`<div style="max-width:560px;margin:0 auto;padding:14px 14px 40px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="font-size:18px;font-weight:900;flex:1">📖 So spielen wir</div>
      <button onclick="document.getElementById('fst-regeln').remove()" aria-label="Schließen" style="min-width:44px;min-height:44px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font-size:18px;cursor:pointer">✕</button>
    </div>
    ${fstRegelnHtml(true,((_htPub&&_htPub.row&&_htPub.row.config)||(_HT&&_HT.config)||{}))}
    <button onclick="document.getElementById('fst-regeln').remove()" style="width:100%;min-height:48px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit">Zurück zum Spielplan</button>
  </div>`;
  document.body.appendChild(d);
}
/* v488 PO: „Wo kann der Adler-Trainer das Turnier starten? Dann soll die Uhrzeit starten und
   der Spielplan entsprechend angepasst werden – starten wir um 10:18, alle Spiele um 3 Minuten
   nach hinten." Der Plan bleibt, wie er ist; nur die ANZEIGE verschiebt sich um die Differenz
   zwischen geplantem Beginn (start) und tatsaechlichem (startIst). Der oeffentliche Link
   laedt alle 30 s neu und zieht mit. */
function _fstMin(hhmm){ const m=/^(\d{1,2}):(\d{2})/.exec(String(hhmm||"")); return m?(+m[1])*60+(+m[2]):null; }
function _fstHhmm(min){ min=((min%1440)+1440)%1440; return String(Math.floor(min/60)).padStart(2,"0")+":"+String(min%60).padStart(2,"0"); }
function fstVerzug(cfg){ const a=_fstMin(cfg&&cfg.start), b=_fstMin(cfg&&cfg.startIst); return (a==null||b==null)?0:b-a; }
function fstZeitIst(zeit,cfg){ const v=fstVerzug(cfg); const m=_fstMin(zeit); return (m==null||!v)?(zeit||""):_fstHhmm(m+v); }
function _fstJetztHhmm(){ const d=new Date(); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
async function fstStarten(wert){
  const cfg=_fstCfgLesen(); cfg.startIst=wert||_fstJetztHhmm();
  if(await htPatch({config:cfg})){ const v=fstVerzug(cfg); toast(v?`▶️ Gestartet ${cfg.startIst} – Plan ${v>0?"+":""}${v} Min.`:`▶️ Gestartet ${cfg.startIst} – pünktlich`); fstRender(); }
}
async function fstStartZurueck(){ const cfg=_fstCfgLesen(); delete cfg.startIst; if(await htPatch({config:cfg}))fstRender(); }
/* Welche Runde laeuft gerade? Nur am Festivaltag und nur nach dem Start. */
function fstRundeJetzt(row){
  const cfg=(row&&row.config)||{};
  /* v489: Ist wirklich angepfiffen, gilt die Uhr – nicht die geplante Uhrzeit. */
  const st=fstUhrStand(row);
  if(st.phase==="laeuft")return {runde:st.runde,status:"laeuft"};
  if(st.phase==="pause"||st.phase==="ende")return st.naechste?{runde:st.naechste,status:"naechste"}:null;
  if(!cfg.startIst||!row.datum)return null;
  if(row.datum!==new Date().toISOString().slice(0,10))return null;
  const jetzt=_fstMin(_fstJetztHhmm()), dauer=Math.max(3,cfg.spieldauer||8);
  const runden=[...new Set((row.plan||[]).map(p=>p.runde))].sort((a,b)=>a-b);
  for(const r of runden){ const p=(row.plan||[]).find(x=>x.runde===r); const t=_fstMin(fstZeitIst(p&&p.zeit,cfg)); if(t!=null&&jetzt>=t&&jetzt<t+dauer)return {runde:r,status:"laeuft"}; }
  const naechste=runden.find(r=>{ const p=(row.plan||[]).find(x=>x.runde===r); const t=_fstMin(fstZeitIst(p&&p.zeit,cfg)); return t!=null&&t>jetzt; });
  return naechste?{runde:naechste,status:"naechste"}:null;
}
/* v488 PO: „Wo koennen optional die Ergebnisse eingetragen werden? Die externen Trainer
   ueber den Link, die Adler-Trainer in der App korrigieren und ergaenzen." Im Link laeuft das
   ueber den Helfer-Code (RPC heimturnier_ergebnis, wie beim alten Turnier); in der App direkt. */
function fstErgebnis(i){
  const plan=(_HT&&_HT.plan)||[]; const p=plan[i]; if(!p)return;
  const teams=_HT.teams||[]; const nm=k=>esc(teams[k]||("Team "+(k+1)));
  document.getElementById("fst-erg")?.remove();
  const d=document.createElement("div"); d.id="fst-erg";
  d.setAttribute("role","dialog"); d.setAttribute("aria-modal","true"); d.setAttribute("aria-label","Ergebnis eintragen");
  d.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10050;display:flex;align-items:flex-end;justify-content:center";
  const taste=(seite,delta,lbl)=>`<button onclick="fstErgTor(${i},'${seite}',${delta})" aria-label="${lbl}" style="min-width:52px;min-height:52px;border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface2);color:var(--text);font-size:20px;cursor:pointer">${delta>0?"+":"−"}</button>`;
  d.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px 16px 0 0;padding:16px;width:100%;max-width:560px;box-shadow:0 -6px 30px rgba(0,0,0,.3)">
    <div style="font-weight:800;font-size:14px;text-align:center">${nm(p.a)} <span style="color:var(--text3)">vs</span> ${nm(p.b)}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0">
      <span style="display:inline-flex;align-items:center;gap:4px">${taste("ta",-1,"Tor zurücknehmen")}<b id="fst-erg-ta" style="min-width:36px;text-align:center;font-size:28px">${p.ta==null?0:p.ta}</b>${taste("ta",1,"Tor")}</span>
      <span style="font-weight:900;font-size:24px">:</span>
      <span style="display:inline-flex;align-items:center;gap:4px">${taste("tb",-1,"Tor zurücknehmen")}<b id="fst-erg-tb" style="min-width:36px;text-align:center;font-size:28px">${p.tb==null?0:p.tb}</b>${taste("tb",1,"Tor")}</span>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="fstErgLoeschen(${i})" style="color:var(--red)">Ergebnis löschen</button>
      <button class="btn btn-p" onclick="document.getElementById('fst-erg').remove();fstRender()" style="flex:1;min-height:48px">Fertig</button>
    </div></div>`;
  document.body.appendChild(d);
}
async function fstErgTor(i,seite,delta){
  const plan=(_HT.plan||[]).slice(); const p={...plan[i]};
  p.ta=Math.max(0,(p.ta==null?0:p.ta)+(seite==="ta"?delta:0)); p.tb=Math.max(0,(p.tb==null?0:p.tb)+(seite==="tb"?delta:0));
  plan[i]=p;
  if(await htPatch({plan})){ const el=document.getElementById("fst-erg-"+seite); if(el)el.textContent=String(seite==="ta"?p.ta:p.tb); }
}
async function fstErgLoeschen(i){
  const plan=(_HT.plan||[]).slice(); const p={...plan[i]}; delete p.ta; delete p.tb; plan[i]=p;
  if(await htPatch({plan})){ document.getElementById("fst-erg")?.remove(); fstRender(); }
}
/* ═══ v489 – Gemeinsamer Anpfiff je Runde ═══════════════════════════════════
   PO: „Jedes Spiel im Festival soll gemeinsam angepfiffen werden … dann läuft im
   Spielplan live ein Countdown, den jeder Trainer sieht, egal ob Adler oder extern …
   gekoppelt mit dem Liveticker und den Auswechslungen … gestartet werden kann an
   beiden Stellen." Umgesetzt wie die Match-Uhr: EIN Anker-Zeitstempel in
   config.uhr={runde,start,dauer}. Niemand sendet Sekunden – jedes Gerät rechnet die
   Restzeit selbst aus dem Anker. Derselbe Anker geht in die matchday-Zeilen der
   Adler-Teams dieser Runde, damit Ticker und Wechsel dieselbe Zeit zeigen.
   Kacheln: nach Ablauf zählt die Trinkpause rückwärts · Ton und Vibration auf dem
   Gerät, das angepfiffen hat · alle Adler-Teams der Runde starten mit. */
let _fstAudio=null, _fstSignalFuer=null, _fstUhrTimer=null, _fstUhrMarke="";
function _fstMmSs(sec){ sec=Math.max(0,Math.round(sec)); return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0"); }
function fstUhrStand(row){
  const cfg=(row&&row.config)||{}, u=cfg.uhr, plan=(row&&row.plan)||[];
  const runden=[...new Set(plan.map(p=>p.runde))].sort((a,b)=>a-b);
  if(!u||!u.start||!runden.length)return {phase:"aus",runde:null,rest:0,naechste:runden[0]||null,runden};
  const dauer=Math.max(1,u.dauer||cfg.spieldauer||8)*60;
  const pause=Math.max(0,cfg.wechsel==null?FST_PAUSE:cfg.wechsel)*60;
  const weg=(Date.now()-new Date(u.start).getTime())/1000;
  const naechste=runden.find(r=>r>u.runde)||null;
  if(weg<dauer)   return {phase:"laeuft",runde:u.runde,rest:dauer-weg,naechste,runden};
  if(naechste&&weg<dauer+pause)return {phase:"pause",runde:u.runde,rest:dauer+pause-weg,naechste,runden};
  return {phase:"ende",runde:u.runde,rest:0,naechste,runden};
}
/* Welche Felder spielen in dieser Runde – als Zeile unter der Uhr. */
function _fstRundeFelder(row,r){
  const cfg=(row&&row.config)||{}, felder=(cfg.felder&&cfg.felder.length)?cfg.felder:FST_STANDARD_FELDER;
  return [...new Set(((row&&row.plan)||[]).filter(p=>p.runde===r).map(p=>fstFeldName(felder,(p.feld||1)-1)))].join(" · ");
}
function fstUhrInnen(row,st,trainer){
  const gross="font-size:44px;font-weight:900;line-height:1;letter-spacing:1px;font-variant-numeric:tabular-nums";
  const knopf=(r,txt)=>trainer?`<button class="btn btn-p" onclick="fstAnpfiff(${r})" style="width:100%;min-height:52px;margin-top:10px"><i class="ti ti-whistle"></i>${txt}</button>`:"";
  if(st.phase==="aus")
    return `<div style="font-size:13px;font-weight:700;opacity:.85">${st.naechste?`Runde ${st.naechste} steht bereit`:"Noch kein Spielplan"}</div>
      <div style="font-size:12px;opacity:.75;margin-top:2px">${st.naechste?"Alle Felder werden gemeinsam angepfiffen.":""}</div>
      ${st.naechste?knopf(st.naechste,`Runde ${st.naechste} anpfeifen`):""}`;
  if(st.phase==="laeuft")
    return `<div style="font-size:13px;font-weight:800">▶ Runde ${st.runde} läuft</div>
      <div id="fst-uhr-zeit" style="${gross};margin:6px 0 2px">${_fstMmSs(st.rest)}</div>
      <div style="font-size:11.5px;opacity:.8">${esc(_fstRundeFelder(row,st.runde))}</div>`;
  if(st.phase==="pause")
    return `<div style="font-size:13px;font-weight:800">⏸ Zeit um – Runde ${st.runde} ist durch</div>
      <div id="fst-uhr-zeit" style="${gross};margin:6px 0 2px">${_fstMmSs(st.rest)}</div>
      <div style="font-size:11.5px;opacity:.8">bis zum Anpfiff von Runde ${st.naechste}</div>
      ${knopf(st.naechste,`Runde ${st.naechste} anpfeifen`)}`;
  return `<div style="font-size:13px;font-weight:800">⏹ Runde ${st.runde} ist durch</div>
    <div style="font-size:12px;opacity:.8;margin-top:2px">${st.naechste?`Runde ${st.naechste} wartet auf den Anpfiff.`:"Das war die letzte Runde – danke euch allen!"}</div>
    ${st.naechste?knopf(st.naechste,`Runde ${st.naechste} anpfeifen`):""}`;
}
function _fstUhrFarbe(st){
  if(st.phase==="laeuft")return {bg:"linear-gradient(135deg,#15803d,#16a34a)",fg:"#fff"};
  if(st.phase==="pause") return {bg:"linear-gradient(135deg,#b45309,#d97706)",fg:"#fff"};
  return {bg:"linear-gradient(135deg,#1e3a8a,#2563eb)",fg:"#fff"};
}
/* Malt die Uhr. Laeuft nur die Zeit weiter, wird bloss die Ziffernzeile getauscht –
   sonst wuerde der Knopf unter dem Finger des Trainers jede Sekunde neu entstehen. */
function fstUhrMalen(){
  const el=document.getElementById("fst-uhr"); if(!el)return;
  const trainer=!(typeof _htPub!=="undefined"&&_htPub);
  const row=(typeof _htPub!=="undefined"&&_htPub&&_htPub.row)||_HT; if(!row)return;
  const st=fstUhrStand(row);
  const marke=st.phase+"|"+st.runde+"|"+st.naechste;
  if(marke===_fstUhrMarke){
    const z=document.getElementById("fst-uhr-zeit");
    if(z){ z.textContent=_fstMmSs(st.rest); return; }
  }
  _fstUhrMarke=marke;
  const f=_fstUhrFarbe(st);
  el.style.cssText=`background:${f.bg};color:${f.fg};border-radius:16px;padding:14px;margin-bottom:10px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.18)`;
  el.innerHTML=fstUhrInnen(row,st,trainer);
  if(st.phase!=="laeuft"&&_fstSignalFuer!=null&&_fstSignalFuer===st.runde){ _fstSignalFuer=null; _fstSignal(); }
}
function fstUhrTicken(){ clearInterval(_fstUhrTimer); _fstUhrMarke=""; fstUhrMalen();
  _fstUhrTimer=setInterval(()=>{ if(!document.getElementById("fst-uhr")){clearInterval(_fstUhrTimer);return;} fstUhrMalen(); },1000); }
/* Ton nur auf dem Geraet, das angepfiffen hat: der Tastendruck erlaubt die Audioausgabe. */
function _fstTonVorbereiten(){ try{ const A=window.AudioContext||window.webkitAudioContext; if(A&&!_fstAudio)_fstAudio=new A(); if(_fstAudio&&_fstAudio.state==="suspended")_fstAudio.resume(); }catch(e){} }
function _fstSignal(){
  try{ navigator.vibrate&&navigator.vibrate([220,120,220]); }catch(e){}
  try{ if(!_fstAudio)return;
    [0,0.36].forEach(t=>{ const o=_fstAudio.createOscillator(), g=_fstAudio.createGain();
      o.type="sine"; o.frequency.value=880; o.connect(g); g.connect(_fstAudio.destination);
      const s=_fstAudio.currentTime+t;
      g.gain.setValueAtTime(0.0001,s); g.gain.exponentialRampToValueAtTime(0.35,s+0.02); g.gain.exponentialRampToValueAtTime(0.0001,s+0.3);
      o.start(s); o.stop(s+0.32); });
  }catch(e){}
}
/* Anpfiff aus dem Festival-Plan. Setzt den Anker, zieht die geplanten Zeiten auf die
   Wirklichkeit nach (die angepfiffene Runde steht ab jetzt) und startet die Match-Uhren. */
async function fstAnpfiff(runde){
  /* v490 PO: „Anpfiff dürfen nur die Adler-Trainer, kein externer." Drei Schlösser: der Knopf
     wird nur im Trainer-Fenster gezeichnet, _HT gibt es nur dort, und die Datenbank lässt das
     Schreiben von config ohnehin nur angemeldeten Trainern zu (der Gäste-Code kann per
     RPC ausschliesslich Tore setzen). */
  if(!_HT||(typeof _htPub!=="undefined"&&_htPub))return;
  const cfg=_fstCfgLesen(), plan=_HT.plan||[];
  const st=fstUhrStand(_HT);
  const r=runde||st.naechste||st.runden[0];
  if(!r){toast("Erst den Spielplan erstellen","err");return;}
  _fstTonVorbereiten();
  const anker=new Date().toISOString();
  cfg.uhr={runde:r,start:anker,dauer:Math.max(3,cfg.spieldauer||8)};
  const geplant=_fstMin((plan.find(p=>p.runde===r)||{}).zeit), basis=_fstMin(cfg.start);
  if(geplant!=null&&basis!=null)cfg.startIst=_fstHhmm(basis+(_fstMin(_fstJetztHhmm())-geplant));
  if(await htPatch({config:cfg})){
    _fstSignalFuer=r;
    fstMatchdayAnpfiff(_HT,r,anker);
    toast(`▶️ Runde ${r} angepfiffen`);
    fstRender();
  }
}
async function fstUhrStoppen(){
  const cfg=_fstCfgLesen(); delete cfg.uhr; _fstSignalFuer=null;
  if(await htPatch({config:cfg})){ toast("Uhr zurückgesetzt"); fstRender(); }
}
/* Derselbe Anker in die matchday-Zeilen der Adler-Teams, die in dieser Runde spielen:
   Team 1 liegt auf dem Datum, Team n auf „datum__tn" – so liest die Match-Uhr im
   Spieltag dieselbe Zeit, und Ticker wie Wechsel-Timer haengen daran. */
async function fstMatchdayAnpfiff(row,runde,anker,ausser){
  const cfg=(row&&row.config)||{}, teams=(row&&row.teams)||[], plan=(row&&row.plan)||[];
  if(!row||!row.datum)return;
  const drin=new Set(plan.filter(p=>p.runde===runde).flatMap(p=>[p.a,p.b]));
  const dauer=Math.max(3,cfg.spieldauer||8);
  let n=0;
  for(let i=0;i<teams.length;i++){
    if(!/adler/i.test(String(teams[i]||"")))continue;
    n++; if(!drin.has(i))continue;
    const key=n===1?row.datum:`${row.datum}__t${n}`;
    if(ausser&&key===ausser)continue;
    try{await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum:key,half:1,clock_status:"running",started_at:anker,paused_ms:0,spieldauer_min:dauer,halbzeiten:1})});}catch(e){}
  }
  if(typeof mcLoad==="function"&&typeof spieltagRawDate==="function"&&spieltagRawDate()===row.datum){try{mcLoad();}catch(e){}}
}
/* Gegenrichtung: der Anpfiff an der Match-Uhr im Spieltag startet die Festival-Runde mit
   demselben Anker – damit zeigt der Gast-Link dieselbe Restzeit. */
async function fstAppAnpfiff(anker){
  if(typeof spieltagRawDate!=="function")return;
  const datum=spieltagRawDate(); let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?datum=eq.${encodeURIComponent(datum)}&select=id,datum,config,teams,plan&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)row=((await r.json())||[])[0]||null;}catch(e){}
  if(!row||!fstIst(row)||!((row.plan||[]).length))return;
  const cfg=row.config||{}, st=fstUhrStand(row);
  const r=st.phase==="aus"?st.naechste:(st.naechste||st.runde);
  if(!r)return;
  cfg.uhr={runde:r,start:anker,dauer:Math.max(3,cfg.spieldauer||8)};
  const geplant=_fstMin((row.plan.find(p=>p.runde===r)||{}).zeit), basis=_fstMin(cfg.start);
  if(geplant!=null&&basis!=null)cfg.startIst=_fstHhmm(basis+(_fstMin(_fstJetztHhmm())-geplant));
  try{await fetch(`${SB_URL}/rest/v1/heimturnier?id=eq.${row.id}`,{method:"PATCH",headers:sbAuthHeaders(),
    body:JSON.stringify({config:cfg,updated_at:new Date().toISOString()})});}catch(e){}
  if(_HT&&_HT.id===row.id){_HT.config=cfg;}
  fstMatchdayAnpfiff({...row,config:cfg},r,anker,typeof spieltagKey==="function"?spieltagKey():null);
  if(typeof toast==="function")toast(`▶️ Runde ${r} im Festival angepfiffen`);
}
let _fstTauschWahl=null;
async function fstTausch(i,seite){
  const plan=(_HT&&_HT.plan||[]).slice(); if(!plan[i])return;
  if(!_fstTauschWahl){ _fstTauschWahl={i,seite}; fstRender(); toast("Jetzt das Team antippen, mit dem getauscht wird"); return; }
  const w=_fstTauschWahl; _fstTauschWahl=null;
  if(w.i===i&&w.seite===seite){ fstRender(); return; }
  const a={...plan[w.i]}, b={...plan[i]};
  const t=a[w.seite]; a[w.seite]=b[seite]; b[seite]=t;
  plan[w.i]=a; plan[i]=b;
  if(a.a===a.b||b.a===b.b){ toast("So spielt ein Team gegen sich selbst","err"); fstRender(); return; }
  const doppelt=[a,b].filter(p=>plan.some(q=>q!==p&&q.runde===p.runde&&[q.a,q.b].some(x=>x===p.a||x===p.b)));
  if(await htPatch({plan})){ toast(doppelt.length?`Getauscht – Achtung: in Runde ${doppelt[0].runde} spielt ein Team zweimal`:"Getauscht ✓"); fstRender(); }
}
function fstRender(){
  const el=document.getElementById("ht-body"); if(!el||!_HT)return;
  const cfg=_HT.config||{}, vereine=cfg.vereine||[];
  const felder=(cfg.felder&&cfg.felder.length)?cfg.felder:FST_STANDARD_FELDER;
  const teams=fstTeamsBauen(vereine);
  const plan=_HT.plan||[];
  const fld="box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13.5px;background:var(--surface2);color:var(--text);min-height:44px";
  const bedarf=fstBedarf(teams,{...cfg,felder});
  const kinderGesamt=vereine.reduce((a,v)=>a+(v.kinder||0),0);
  const platz=felder.reduce((a,f)=>a+_fstF(f.form).auf*2,0);

  const vHtml=vereine.map((v,i)=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input value="${esc(v.name||"")}" onchange="fstVereinSet(${i},'name',this.value)" aria-label="Vereinsname" style="${fld};flex:1;min-width:0">
      <input type="number" min="0" max="40" value="${v.kinder||0}" onchange="fstVereinSet(${i},'kinder',this.value)" aria-label="Kinder" title="angereiste Kinder" style="${fld};width:60px;text-align:center">
      <select onchange="fstVereinSet(${i},'teams',this.value)" aria-label="Teams" title="Teams dieses Vereins" style="${fld};width:64px">${[1,2,3,4].map(n=>`<option value="${n}"${(v.teams||1)===n?" selected":""}>${n}×</option>`).join("")}</select>
      <button class="btn btn-sm" onclick="fstVereinWeg(${i})" aria-label="${esc(v.name||"Verein")} entfernen" style="min-width:44px;justify-content:center">✕</button>
    </div>`).join("");

  const vorschlag=fstFelderVorschlag(teams.length);
  const gekuerzt=fstFelderKuerzen(felder,teams);
  const passt=vorschlag.length===felder.length;

  el.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <input id="fst-datum" type="date" value="${esc(_HT.datum||"")}" onchange="fstZeitSpeichern()" style="${fld};flex:1">
      <button class="btn btn-sm" onclick="htShare()" title="Plan an die Gast-Trainer schicken"><i class="ti ti-share"></i>Teilen</button>
    </div>

    <div style="font-size:12px;font-weight:800;margin:14px 0 6px">1 · ${cfg.anlass==="heimspiel"?"Wer spielt mit?":"Wer kommt?"}</div>
    ${vereine.length?vHtml:'<div style="font-size:12px;color:var(--text3);margin-bottom:6px">Noch kein Verein eingetragen.</div>'}
    <div style="font-size:10.5px;color:var(--text3);margin-bottom:6px">Name · angereiste Kinder · Teams (Vorschlag der App, änderbar)</div>
    <div id="fst-gegner" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px"></div>
    <button class="btn btn-sm" onclick="fstVereinPlus()" style="width:100%;margin-bottom:4px"><i class="ti ti-plus"></i>Verein hinzufügen</button>
    <div id="fst-einteilung" style="font-size:11px;color:var(--text3);margin-bottom:6px">Unsere Kinder kommen aus „Teams festlegen“ …</div>
    ${teams.length?`<div style="font-size:11.5px;color:var(--text2);margin-bottom:10px">➜ <b>${teams.length} Teams</b>, ${kinderGesamt} Kinder: ${esc(teams.map(t=>t.name+" ("+t.kinder+")").join(" · "))}</div>`:""}

    <div style="font-size:12px;font-weight:800;margin:14px 0 6px">2 · Felder aufbauen</div>
    ${felder.map((f,i)=>{const F=_fstF(f.form);const name=fstFeldName(felder,i);return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input id="fst-feld-name-${i}" value="${esc(name)}" aria-label="Name Feld ${i+1}" onchange="fstFeldNameSet(${i},this.value)" style="${fld};width:92px;font-weight:800;color:${F.farbe}">
      <div class="seg-ctrl" role="group" aria-label="Spielform Feld ${i+1} (${esc(name)})" style="flex:1">${Object.entries(FST_FORMEN).map(([k,v])=>`<button class="seg-btn${f.form===k?" active":""}" onclick="fstFeldSet(${i},'${k}')" aria-pressed="${f.form===k?"true":"false"}">${v.label}</button>`).join("")}</div>
      <button class="btn btn-sm" onclick="fstFeldWeg(${i})" aria-label="Feld ${esc(name)} entfernen" style="min-width:44px;justify-content:center"${felder.length<=1?" disabled":""}>✕</button>
    </div>`;}).join("")}
    <div style="font-size:10.5px;color:var(--text3);margin-bottom:6px">🥅 ${felder.map((f,i)=>`${esc(fstFeldName(felder,i))}: ${_fstF(f.form).tore}`).join(" · ")} – Namen wie am Platz, antippen zum Ändern</div>
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <button class="btn btn-sm" onclick="fstFeldPlus()" style="flex:1"><i class="ti ti-plus"></i>Feld</button>
      <button class="btn btn-sm" onclick="fstFelderAuto()" style="flex:1"${passt?" disabled":""}><i class="ti ti-wand"></i>${passt?"passt":(vorschlag.length===1?"1 Feld vorschlagen":`${vorschlag.length} Felder vorschlagen`)}</button>
    </div>
    <div style="font-size:11.5px;color:${passt?"var(--text2)":"var(--amber)"};margin-bottom:10px">${passt
      ? `Alle ${teams.length} Teams spielen gleichzeitig · ${platz} Kinder auf den Feldern`
      : gekuerzt.length<felder.length
        ? `${teams.length} Teams brauchen ${gekuerzt.length} Feld${gekuerzt.length===1?"":"er"} – beim Erstellen des Plans bleiben ${esc(gekuerzt.map((f,i)=>fstFeldName(gekuerzt,i)).join(", "))}.`
        : `Bei ${teams.length} Teams und ${felder.length} Feld${felder.length===1?"":"ern"} spielt nicht jeder gleichzeitig – ${vorschlag.length} Feld${vorschlag.length===1?" passt":"er passen"} genau.`}</div>

    <div style="font-size:12px;font-weight:800;margin:14px 0 6px">3 · Zeitplan</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
      <label style="font-size:11px;color:var(--text2)">Beginn<input id="fst-start" type="time" value="${esc(cfg.start||FST_START)}" onchange="fstZeitSpeichern()" style="${fld};width:100%"></label>
      <label style="font-size:11px;color:var(--text2)">Gesamt (Min.)<input id="fst-dauer" type="number" min="20" max="180" step="5" value="${cfg.dauer||60}" onchange="fstZeitSpeichern()" style="${fld};width:100%"></label>
      <label style="font-size:11px;color:var(--text2)">Spielzeit (Min.)<input id="fst-spiel" type="number" min="3" max="20" value="${cfg.spieldauer||8}" onchange="fstZeitSpeichern()" style="${fld};width:100%"></label>
      <label style="font-size:11px;color:var(--text2)">Trinkpause (Min.)<input id="fst-wechsel" type="number" min="0" max="10" value="${cfg.wechsel==null?FST_PAUSE:cfg.wechsel}" onchange="fstZeitSpeichern()" title="Pause zwischen zwei Runden – trinken und Feld wechseln" style="${fld};width:100%"></label>
    </div>
    ${teams.length>1?`<div style="font-size:11.5px;color:var(--text2);margin-bottom:10px">Jeder gegen jeden braucht <b>${bedarf.scheiben} Runden</b> ≈ ${bedarf.minuten} Min.${bedarf.minuten>(cfg.dauer||60)?` – in ${cfg.dauer||60} Min. passen ${Math.max(1,Math.floor(((cfg.dauer||60)+(cfg.wechsel==null?FST_PAUSE:cfg.wechsel))/((cfg.spieldauer||8)+(cfg.wechsel==null?FST_PAUSE:cfg.wechsel))))} Runden.`:" – passt."}</div>`:""}

    <button class="btn btn-p" onclick="fstPlanErstellen()" style="width:100%;min-height:52px"${teams.length<2?" disabled":""}><i class="ti ti-calendar-event"></i>${plan.length?"Spielplan neu erstellen":"Spielplan erstellen"}</button>

    ${plan.length?`<div style="font-size:12px;font-weight:800;margin:16px 0 6px">4 · Der Plan <span style="font-weight:400;color:var(--text3)">· ${plan.length} Spiele</span></div>
      <div id="fst-uhr" data-rolle="trainer"></div>
      ${cfg.startIst
        ? `<div style="display:flex;align-items:center;gap:8px;background:var(--green-bg,#dcfce7);border-radius:12px;padding:8px 10px;margin-bottom:8px">
            <span style="font-size:12.5px;font-weight:800;flex:1">🕘 Zeitplan ${fstVerzug(cfg)?`${fstVerzug(cfg)>0?"+":""}${fstVerzug(cfg)} Min. verschoben`:"pünktlich"} · Beginn ${esc(cfg.startIst)}</span>
            <input type="time" value="${esc(cfg.startIst)}" onchange="fstStarten(this.value)" aria-label="Tatsächlicher Beginn" style="${fld};width:122px;padding:6px">
            <button class="btn btn-sm" onclick="${cfg.uhr?"fstUhrStoppen()":"fstStartZurueck()"}" aria-label="${cfg.uhr?"Uhr zurücksetzen":"Start zurücksetzen"}">↺</button>
          </div>`
        : ""}
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px">${_fstTauschWahl?"Tauschen: jetzt das zweite Team antippen":"Teams antippen zum Tauschen · Ergebnis rechts antippen"}</div>
      ${fstPlanHtml(plan,_HT.teams||[],felder,false,true,cfg)}
      <button class="btn" onclick="${_HT.edit_code?"htShareHelfer()":"htShare()"}" style="width:100%;min-height:48px;margin-top:8px"><i class="ti ti-share"></i>Plan an die Gast-Trainer schicken</button>
      <div style="font-size:10.5px;color:var(--text3);margin:4px 0 6px">${_HT.edit_code?"Mit diesem Link können die Gast-Trainer Ergebnisse eintragen. Nur ansehen: der Teilen-Knopf oben.":"Nur zum Ansehen – dieses Festival hat keinen Schreib-Code."}</div>
      <button class="btn btn-sm" onclick="fstDruck()" style="width:100%;margin-top:2px"><i class="ti ti-printer"></i>Aushang drucken</button>`:""}

    <div style="font-size:12px;font-weight:800;margin:16px 0 6px">Infos für die Gäste</div>
    <textarea id="fst-infos" rows="4" onchange="fstZeitSpeichern()" style="${fld};width:100%;resize:vertical">${esc(cfg.infos||HT_INFOS_VORLAGE)}</textarea>

    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-sm" onclick="htListe()"><i class="ti ti-arrow-left"></i>Übersicht</button>
      <button class="btn btn-sm" style="margin-left:auto;color:var(--red)" onclick="htDelete()"><i class="ti ti-trash"></i>Löschen</button>
    </div>`;
  fstGegnerChips();
  fstEinteilungSync();
  fstUhrTicken();
}
/* Schnellwahl aus der Gegner-Datenbank – tippen statt abtippen. */
async function fstGegnerChips(){
  const box=document.getElementById("fst-gegner"); if(!box)return;
  if(!window._htGegner){
    try{const r=await fetch(`${SB_URL}/rest/v1/gegner?select=name&order=name.asc&limit=40`,{headers:sbAuthHeaders()});if(r.ok)window._htGegner=((await r.json())||[]).map(g=>g.name);}catch(e){}
    if(!window._htGegner)window._htGegner=[];
  }
  const drin=new Set(((_HT&&_HT.config&&_HT.config.vereine)||[]).map(v=>v.name));
  const frei=window._htGegner.filter(n=>!drin.has(n)).slice(0,8);
  box.innerHTML=frei.map(n=>`<button class="btn btn-sm" onclick="fstVereinPlus('${jsq(n)}')" style="font-size:11.5px">+ ${esc(n)}</button>`).join("");
}
/* Der Plan als Runden-Karten – dieselbe Darstellung im Trainer-Fenster und im Aushang. */
function fstPlanHtml(plan,teams,felder,gross,tausch,cfg){
  const runden=[...new Set(plan.map(p=>p.runde))].sort((a,b)=>a-b);
  const nm=i=>esc((teams&&teams[i])||("Team "+(i+1)));
  /* v488 PO: „Alles verrueckt und in der Summe zu gross" – eine Zeile je Spiel: Feld-Marke,
     Team, Team, Ergebnis. Die Teamnamen bleiben Tasten (zwei antippen = tauschen), aber
     flach und in einem festen Raster; lange Namen werden abgeschnitten statt umzubrechen. */
  const tn=(p,seite)=>{ if(!tausch)return `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm(p[seite])}</span>`;
    const pi=plan.indexOf(p); const akt=_fstTauschWahl&&_fstTauschWahl.i===pi&&_fstTauschWahl.seite===seite;
    return `<button class="fst-tausch" onclick="fstTausch(${pi},'${seite}')" aria-pressed="${akt?"true":"false"}" title="${nm(p[seite])}" style="min-width:0;min-height:44px;padding:0 6px;border:1px solid ${akt?"var(--blue)":"var(--rand-bedien)"};border-radius:8px;background:${akt?"var(--blue)":"var(--surface2)"};color:${akt?"#fff":"var(--text)"};font:inherit;font-size:11.5px;line-height:1.15;font-weight:700;cursor:pointer;overflow:hidden;text-align:${seite==="a"?"right":"left"}">${nm(p[seite])}</button>`; };
  const erg=(p)=>{ const pi=plan.indexOf(p); const txt=p.ta!=null?`${p.ta}:${p.tb}`:"–:–";
    if(!tausch)return `<span style="font-size:${gross?"14":"12.5"}px;font-weight:900;color:${p.ta!=null?"var(--text)":"var(--text3)"};text-align:center">${txt}</span>`;
    return `<button onclick="fstErgebnis(${pi})" aria-label="Ergebnis eintragen" style="min-height:44px;min-width:48px;padding:0 4px;border:1px solid var(--rand-bedien);border-radius:8px;background:${p.ta!=null?"var(--surface)":"transparent"};color:${p.ta!=null?"var(--text)":"var(--text3)"};font:inherit;font-size:12.5px;font-weight:900;cursor:pointer">${txt}</button>`; };
  return runden.map(r=>{
    const spiele=plan.filter(p=>p.runde===r);
    return `<div style="border:var(--border-s);border-radius:12px;padding:8px 10px;margin-bottom:6px;background:var(--surface)">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
        <span style="font-size:${gross?"15":"12.5"}px;font-weight:900">Runde ${r}</span>
        <span style="font-size:${gross?"13":"11"}px;color:var(--text2)">${esc(fstZeitIst(spiele[0]?spiele[0].zeit:"",cfg))} Uhr</span>
      </div>
      ${spiele.map(p=>{const F=_fstF(p.form);return `<div style="display:grid;grid-template-columns:auto minmax(0,1fr) 10px minmax(0,1fr) auto;gap:6px;align-items:center;padding:3px 0;font-size:${gross?"14":"12.5"}px;font-weight:700">
        <span style="font-size:${gross?"11":"9.5"}px;font-weight:800;color:#fff;background:${F.farbe};border-radius:6px;padding:3px 6px;white-space:nowrap">${esc(fstFeldName(felder,(p.feld||1)-1))}</span>
        ${tn(p,"a")}<span style="color:var(--text3);font-weight:400;text-align:center">–</span>${tn(p,"b")}
        ${erg(p)}
      </div>`;}).join("")}
    </div>`;
  }).join("");
}
/* Aushang fuer den Anzeigetisch: ein Blatt, grosse Schrift, Wappen oben. */
function fstDruck(){
  const teams=_HT.teams||[], cfg=_HT.config||{};
  const felder=(cfg.felder&&cfg.felder.length)?cfg.felder:FST_STANDARD_FELDER;
  const w=window.open("","_blank"); if(!w){toast("Bitte Pop-ups erlauben","err");return;}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(_HT.name)}</title>
    <style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:18px}
      .k{border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;margin-bottom:6px}
      @media print{@page{margin:12mm}}</style></head><body>
    <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #1e3a8a;padding-bottom:10px;margin-bottom:12px">
      <img src="logo.png" style="width:56px;height:56px" alt="">
      <div><div style="font-size:22px;font-weight:900">${esc(_HT.name)}</div>
      <div style="font-size:13px;color:#475569">${_HT.datum?new Date(_HT.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}):""} · ${esc(_HT.ort||"")}</div></div>
    </div>
    <div style="font-size:13px;margin-bottom:10px">${felder.map((f,i)=>{const F=_fstF(f.form);return `<b style="color:${F.farbe}">${esc(fstFeldName(felder,i))}</b>: ${F.lang} · ${F.tore}`;}).join(" &nbsp;·&nbsp; ")}</div>
    ${fstPlanHtml(_HT.plan||[],teams,felder,true,false,cfg).replace(/var\(--border-s\)/g,"1px solid #e2e8f0").replace(/var\(--surface\)/g,"#fff").replace(/var\(--text2\)/g,"#475569").replace(/var\(--text3\)/g,"#94a3b8")}
    <div style="margin-top:14px;font-size:12px;color:#475569;white-space:pre-wrap">${esc(cfg.infos||"")}</div>
    <div style="margin-top:14px;max-width:420px">${fstSkizzeFelder(felder)}</div>
    </body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
}
/* Skizze der Felder (schematisch, nach der Luftaufnahme): links der eingezaeunte Käfig, daneben
   der grosse Platz quer. Fuers Festival haben wir den Käfig und die LINKE Haelfte des grossen
   Platzes: oben quer „4+1 oben", darunter nebeneinander Funino 1 und 2. Die rechte Haelfte
   bleibt frei. Rechts vom Platz der Parkplatz, unten das Vereinsheim (WC ebenerdig). */
function fstSkizzeFelder(felder){
  const f=(felder&&felder.length)?felder:FST_STANDARD_FELDER;
  const idxF4=[],idxFu=[]; f.forEach((x,i)=>((x.form||"funino")==="f4"?idxF4:idxFu).push(i));
  const nm=i=>i==null?null:fstFeldName(f,i);
  const kaefig=nm(idxF4[0]), oben=nm(idxF4[1]), fu1=nm(idxFu[0]), fu2=nm(idxFu[1]);
  const B=_fstF("f4").farbe, G=_fstF("funino").farbe;
  const box=(x,y,w,h,name,farbe,ort)=>name
    ?`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${farbe}" opacity=".92"/><text x="${x+w/2}" y="${y+h/2+5}" text-anchor="middle" font-size="${w<60?"10.5":"13"}" font-weight="800" fill="#fff">${esc(name)}</text>`
    :`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="#94a3b8" stroke-dasharray="6 4" stroke-width="2"/><text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="11" fill="#64748b">${esc(ort)}</text><text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-size="10" fill="#94a3b8">heute frei</text>`;
  return `<svg viewBox="0 0 360 288" role="img" aria-label="Skizze der Spielfelder" style="width:100%;height:auto;display:block;font-family:inherit">
    <rect x="0" y="0" width="360" height="288" rx="12" fill="#f0fdf4"/>
    <text x="180" y="20" text-anchor="middle" font-size="12" font-weight="800" fill="#334155">Sportanlage Thurner Kamp – Skizze</text>
    <!-- Käfig: kleines eingezaeuntes Feld links -->
    <rect x="8" y="60" width="48" height="150" rx="6" fill="none" stroke="#475569" stroke-width="3" stroke-dasharray="3 3"/>
    ${box(14,66,36,138,kaefig,B,"Käfig")}
    <!-- grosser Platz quer, linke Haelfte fuers Festival -->
    <rect x="64" y="40" width="254" height="190" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
    <line x1="191" y1="40" x2="191" y2="230" stroke="#16a34a" stroke-width="2"/>
    ${box(72,48,112,78,oben,B,"4+1 oben")}
    ${box(72,134,53,88,fu1,G,"Funino 1")}
    ${box(131,134,53,88,fu2,G,"Funino 2")}
    <rect x="198" y="48" width="112" height="174" rx="6" fill="#f1f5f9" opacity=".8"/>
    <text x="254" y="130" text-anchor="middle" font-size="10.5" fill="#64748b">rechte Hälfte</text>
    <text x="254" y="144" text-anchor="middle" font-size="10.5" fill="#64748b">nicht im Festival</text>
    <!-- Parkplatz rechts vom Platz, Vereinsheim unten -->
    <rect x="326" y="60" width="26" height="140" rx="5" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
    <text x="339" y="130" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e" transform="rotate(-90 339 130)">Parkplatz</text>
    <rect x="155" y="238" width="72" height="22" rx="5" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
    <text x="191" y="253" text-anchor="middle" font-size="10" font-weight="700" fill="#334155">Vereinsheim</text>
    <text x="191" y="277" text-anchor="middle" font-size="10" fill="#64748b">WC/Kabinen ebenerdig darunter</text>
    <text x="32" y="224" text-anchor="middle" font-size="10" fill="#64748b">eingezäunt</text>
  </svg>`;
}
/* Skizze der Parkplaetze (schematisch, nach der Luftaufnahme): der Parkplatz liegt rechts
   neben dem grossen Platz und ist oft voll; die Zufahrt kommt vom Thurner Kamp, der schraeg
   an den Tennisplaetzen vorbeilaeuft – dort, entlang der Strasse, ist genug Platz. */
function fstSkizzeParken(){
  const auto=(x,y,farbe)=>`<rect x="${x}" y="${y}" width="12" height="7" rx="2" fill="${farbe}"/>`;
  return `<svg viewBox="0 0 360 280" role="img" aria-label="Skizze der Parkmöglichkeiten" style="width:100%;height:auto;display:block;font-family:inherit">
    <defs><clipPath id="fstParkClip"><rect x="0" y="0" width="360" height="280" rx="12"/></clipPath></defs>
    <rect x="0" y="0" width="360" height="280" rx="12" fill="#f8fafc"/>
    <text x="180" y="20" text-anchor="middle" font-size="12" font-weight="800" fill="#334155">Parken – Skizze</text>
    <!-- Strasse Thurner Kamp, schraeg von links unten nach rechts oben -->
    <g clip-path="url(#fstParkClip)"><g transform="translate(200,170) rotate(-37)">
      <rect x="-230" y="-13" width="460" height="26" fill="#cbd5e1"/>
      <line x1="-230" y1="0" x2="230" y2="0" stroke="#fff" stroke-width="2" stroke-dasharray="10 8"/>
      <text x="70" y="30" text-anchor="middle" font-size="11" font-weight="800" fill="#334155">Thurner Kamp</text>
      <!-- Parkstreifen an der Strasse, platzseitig, suedlich der Zufahrt -->
      <rect x="-150" y="-31" width="140" height="14" rx="3" fill="#dcfce7" stroke="#16a34a" stroke-width="1.5"/>
      ${[-146,-128,-110,-92,-74,-56,-38,-20].map(x=>auto(x,-28,"#16a34a")).join("")}
    </g></g>
    <!-- Zufahrt von der Strasse zum Parkplatz am Platz -->
    <path d="M214 156 L200 124" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round" fill="none"/>
    <text x="232" y="132" font-size="9" fill="#475569">Zufahrt</text>
    <!-- grosser Platz und Parkplatz daneben -->
    <rect x="20" y="40" width="150" height="88" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2.5"/>
    <text x="95" y="88" text-anchor="middle" font-size="12" font-weight="800" fill="#166534">Sportplatz</text>
    <rect x="176" y="42" width="30" height="84" rx="5" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
    ${[180,180,180,180,180].map((x,i)=>auto(x+2,48+i*15,"#b45309")).join("")}
    <text x="191" y="140" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">am Platz</text>
    <text x="191" y="151" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">oft voll</text>
    <!-- Vereinsheim und Tennis suedlich -->
    <rect x="65" y="138" width="60" height="22" rx="5" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/>
    <text x="95" y="153" text-anchor="middle" font-size="9.5" font-weight="700" fill="#334155">Vereinsheim</text>
    <rect x="12" y="168" width="68" height="50" rx="6" fill="#fee2e2" stroke="#ef4444" stroke-width="1.5"/>
    <text x="46" y="197" text-anchor="middle" font-size="10" fill="#991b1b">Tennis</text>
    <text x="12" y="266" font-size="12" font-weight="800" fill="#15803d">an der Straße parken – genug Plätze</text>
  </svg>`;
}
/* Info-Blatt fuer die Gast-Trainer: Adresse mit Karte, Parken mit Skizze, Felder mit Skizze. */
function fstInfoOpen(){
  const row=(_htPub&&_htPub.row)||_HT||{}; const cfg=row.config||{};
  const felder=(cfg.felder&&cfg.felder.length)?cfg.felder:FST_STANDARD_FELDER;
  const adr=row.ort||(typeof VEREIN_ADRESSE!=="undefined"?VEREIN_ADRESSE:"Thurner Kamp 97, 51069 Köln");
  document.getElementById("fst-info")?.remove();
  const d=document.createElement("div"); d.id="fst-info";
  d.setAttribute("role","dialog"); d.setAttribute("aria-modal","true"); d.setAttribute("aria-label","Anfahrt, Parken und Felder");
  d.style.cssText="position:fixed;inset:0;background:#f1f5f9;z-index:1000;overflow:auto;-webkit-overflow-scrolling:touch;color:#0f172a;font-family:Inter,system-ui,sans-serif";
  const karte=(t,inhalt)=>`<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${t}</div>${inhalt}</div>`;
  d.innerHTML=`<div style="max-width:560px;margin:0 auto;padding:14px 14px 40px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="font-size:18px;font-weight:900;flex:1">ℹ️ Anfahrt, Parken &amp; Felder</div>
      <button onclick="document.getElementById('fst-info').remove()" aria-label="Schließen" style="min-width:44px;min-height:44px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font-size:18px;cursor:pointer">✕</button>
    </div>
    ${karte("Adresse",`<div style="font-size:15px;font-weight:800">${esc(adr)}</div>
      <a href="${mapsUrl(adr)}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;margin-top:8px;border-radius:12px;background:#1e3a8a;color:#fff;font-weight:800;font-size:14px;text-decoration:none">📍 Route in Karten öffnen</a>`)}
    ${karte("Parken",`<div style="font-size:13.5px;line-height:1.55;margin-bottom:8px">Direkt am Platz gibt es Parkplätze, wenn ihr hineinfahrt – die sind aber oft schon belegt. <b>Besser gleich an der Straße parken (Thurner Kamp)</b>, dort ist genug Platz.</div>${fstSkizzeParken()}`)}
    ${karte("WC &amp; Kabinen",`<div style="font-size:13.5px;line-height:1.55">🚻 Ebenerdig unter dem Vereinsheim – gleich hinter dem großen Platz.</div>`)}
    ${karte("Wo welches Feld liegt",`<div style="font-size:13px;color:#475569;margin-bottom:8px">Wir spielen im Käfig und auf der linken Hälfte des großen Platzes.</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${felder.map((f,i)=>{const F=_fstF(f.form);return `<span style="font-size:11.5px;font-weight:700;color:#fff;background:${F.farbe};border-radius:20px;padding:5px 11px">${esc(fstFeldName(felder,i))} · ${F.label} · ${F.tore}</span>`;}).join("")}</div>${fstSkizzeFelder(felder)}`)}
    ${cfg.infos?karte("Gut zu wissen",`<div style="font-size:13px;white-space:pre-wrap;line-height:1.6">${esc(cfg.infos)}</div>`):""}
    <button onclick="document.getElementById('fst-info').remove()" style="width:100%;min-height:48px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit">Zurück zum Spielplan</button>
  </div>`;
  document.body.appendChild(d);
}
/* Öffentliche Festival-Seite – das bekommen die Gast-Trainer per Link. Wappen, Felder,
   Runden, Infos. Keine Kindernamen, keine Tabelle (PO: Fairness vor Ergebnis). */
function _fstPublicRender(wrap,row){
  const teams=row.teams||[], plan=row.plan||[], cfg=row.config||{};
  const felder=(cfg.felder&&cfg.felder.length)?cfg.felder:FST_STANDARD_FELDER;
  const dat=row.datum?new Date(row.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}):"";
  const nm=i=>esc(teams[i]||("Team "+(i+1)));
  const runden=[...new Set(plan.map(p=>p.runde))].sort((a,b)=>a-b);
  const helfer=!!(_htPub&&_htPub.code), jetzt=fstRundeJetzt(row), verzug=fstVerzug(cfg);
  wrap.innerHTML=`
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border-radius:18px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 6px 24px rgba(30,58,138,.25)">
      <img src="logo.png" alt="SV Adler Dellbrück" style="width:58px;height:58px;flex:0 0 auto;filter:drop-shadow(0 2px 6px rgba(0,0,0,.3))">
      <div style="min-width:0">
        <div style="font-size:19px;font-weight:900;line-height:1.15">${esc(row.name||"Kinderfestival")}</div>
        <div style="font-size:12.5px;opacity:.92;margin-top:2px">${esc(dat)}</div>
        <div style="font-size:12px;opacity:.85">${esc(row.ort||"")}</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin:14px 0 12px">
      <button onclick="fstInfoOpen()" style="flex:1;min-height:48px;border:1px solid #bfdbfe;border-radius:14px;background:#fff;color:#1e3a8a;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,.08)">ℹ️ Anfahrt &amp; Felder</button>
      <button onclick="fstRegelnOpen()" style="flex:1;min-height:48px;border:1px solid #bfdbfe;border-radius:14px;background:#fff;color:#1e3a8a;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,.08)">📖 Regeln</button>
    </div>
    <div style="background:#fff;border-radius:14px;padding:12px 14px;margin:14px 0 10px;box-shadow:0 1px 3px rgba(0,0,0,.08);display:flex;gap:10px;align-items:flex-start">
      <span style="font-size:20px;line-height:1.2">👋</span>
      <div style="font-size:13.5px;line-height:1.5;font-weight:600">${esc(FST_GRUSS)}</div>
    </div>

    <div id="fst-uhr"></div>
    ${cfg.startIst&&verzug?`<div style="font-size:11.5px;color:#475569;text-align:center;margin:-2px 0 10px">Die Uhrzeiten unten sind ${verzug>0?"um "+verzug+" Min. nach hinten":"um "+(-verzug)+" Min. nach vorn"} gerückt – so, wie wir wirklich spielen.</div>`:""}
    ${helfer?`<div style="font-size:11.5px;color:#475569;margin:-4px 0 10px;text-align:center">✏️ Ergebnisse antippen und eintragen – freiwillig, es gibt keine Tabelle.</div>`:""}

    ${teams.length?`<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Mannschaften</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${teams.map(t=>`<span style="font-size:13px;font-weight:700;background:#f1f5f9;border-radius:16px;padding:5px 12px">${esc(t)}</span>`).join("")}</div>
    </div>`:""}

    ${runden.length?runden.map(r=>{
      const spiele=plan.filter(p=>p.runde===r);
      const aktiv=jetzt&&jetzt.runde===r;
      return `<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,.08)${aktiv?";border:2px solid #16a34a":""}">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">
          <span style="font-size:16px;font-weight:900">Runde ${r}</span>
          <span style="font-size:13px;color:#475569;font-weight:700">${esc(fstZeitIst(spiele[0]?spiele[0].zeit:"",cfg))} Uhr</span>
          ${aktiv?`<span style="margin-left:auto;font-size:11px;font-weight:800;color:#166534;background:#dcfce7;border-radius:10px;padding:2px 8px">${jetzt.status==="laeuft"?"▶ läuft":"als Nächstes"}</span>`:""}
        </div>
        ${spiele.map(p=>{const F=_fstF(p.form); const mi=plan.indexOf(p); const erg=p.ta!=null?`${p.ta} : ${p.tb}`:"– : –";
          return `<div style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 0">
          <span style="font-size:10px;font-weight:800;color:#fff;background:${F.farbe};border-radius:7px;padding:3px 7px;min-width:52px;text-align:center;white-space:nowrap">${esc(fstFeldName(felder,(p.feld||1)-1))}</span>
          <span style="min-width:0;font-size:14px;font-weight:700;line-height:1.3">${nm(p.a)} <span style="color:#94a3b8;font-weight:400">gegen</span> ${nm(p.b)}</span>
          ${helfer?`<button onclick="htPubEdit(${mi})" aria-label="Ergebnis eintragen" style="min-height:44px;min-width:64px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;color:${p.ta!=null?"#0f172a":"#94a3b8"}">${erg}</button>`
                  :`<span style="font-size:14px;font-weight:900;color:${p.ta!=null?"#0f172a":"#cbd5e1"};min-width:44px;text-align:center">${erg}</span>`}
        </div>`;}).join("")}
      </div>`;}).join("")
      :'<div style="background:#fff;border-radius:14px;padding:20px;text-align:center;color:#64748b;font-size:13px">Der Spielplan wird gerade erstellt.</div>'}

    ${cfg.infos?`<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Gut zu wissen</div>
      <div style="font-size:13px;white-space:pre-wrap;line-height:1.6">${esc(cfg.infos)}</div></div>`:""}

    <div style="text-align:center;font-size:11.5px;color:#94a3b8;margin-top:16px;line-height:1.6">
      Wir spielen ohne Tabelle – bei uns gewinnt die Freude am Spiel.<br>SV Adler Dellbrück · U9 · Die Seite aktualisiert sich von selbst
    </div>`;
  fstUhrTicken();
}
async function renderHeimturnierView(slug){
  document.body.style.cssText="margin:0;background:#f1f5f9;font-family:Inter,system-ui,sans-serif;color:#0f172a";
  const wrap=document.createElement("div");
  wrap.id="ht-public";
  wrap.style.cssText="max-width:560px;margin:0 auto;padding:14px 14px 40px";
  document.body.appendChild(wrap);
  _htPub={slug,code:new URLSearchParams(location.search).get("code")||"",wrap,row:null};
  await _htPubLoad();
  /* v489: Der gemeinsame Anpfiff muss schnell bei den Gast-Trainern ankommen – der
     Countdown selbst laeuft lokal aus dem Anker, nur der Start braucht die Runde. */
  setInterval(()=>{if(!document.hidden&&!document.getElementById("htpub-sheet"))_htPubLoad();},10000);
}
async function _htPubLoad(){
  if(!_htPub)return;
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?slug=eq.${encodeURIComponent(_htPub.slug)}&select=id,slug,name,datum,ort,config,teams,plan,aktiv`,{headers:sbAuthHeaders()});if(r.ok)row=((await r.json())||[])[0]||null;}catch(e){}
  _htPub.row=row;
  _htPublicRender(_htPub.wrap,row);
}
// Helfer-Modus: großes Eingabe-Blatt für EIN Spiel (Anzeigetisch-tauglich, 52px-Tasten)
function htPubEdit(mi){
  const row=_htPub&&_htPub.row; if(!row)return;
  const p=row.plan[mi]; if(!p||typeof p.a!=="number"||typeof p.b!=="number")return;
  document.getElementById("htpub-sheet")?.remove();
  const sh=document.createElement("div");sh.id="htpub-sheet";
  sh.style.cssText="position:fixed;left:0;right:0;bottom:0;background:#fff;border-radius:16px 16px 0 0;box-shadow:0 -6px 30px rgba(0,0,0,.3);padding:16px;z-index:1000;max-width:560px;margin:0 auto";
  sh.innerHTML=`<div style="font-weight:800;font-size:14px;text-align:center">${esc(_htName(p.a,row.teams))} <span style="color:#94a3b8">vs</span> ${esc(_htName(p.b,row.teams))}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0">
      <span style="display:inline-flex;align-items:center;gap:4px">
        <button onclick="htPubTor(${mi},'ta',-1)" aria-label="Tor zurücknehmen" style="min-width:52px;min-height:52px;border:1px solid var(--rand-bedien);border-radius:12px;background:#f8fafc;font-size:20px;cursor:pointer">−</button>
        <b id="htpub-ta" style="min-width:36px;text-align:center;font-size:28px">${p.ta==null?0:p.ta}</b>
        <button onclick="htPubTor(${mi},'ta',1)" aria-label="Tor" style="min-width:52px;min-height:52px;border:1px solid var(--rand-bedien);border-radius:12px;background:#f8fafc;font-size:20px;cursor:pointer">+</button>
      </span>
      <span style="font-weight:900;font-size:24px">:</span>
      <span style="display:inline-flex;align-items:center;gap:4px">
        <button onclick="htPubTor(${mi},'tb',-1)" aria-label="Tor zurücknehmen" style="min-width:52px;min-height:52px;border:1px solid var(--rand-bedien);border-radius:12px;background:#f8fafc;font-size:20px;cursor:pointer">−</button>
        <b id="htpub-tb" style="min-width:36px;text-align:center;font-size:28px">${p.tb==null?0:p.tb}</b>
        <button onclick="htPubTor(${mi},'tb',1)" aria-label="Tor" style="min-width:52px;min-height:52px;border:1px solid var(--rand-bedien);border-radius:12px;background:#f8fafc;font-size:20px;cursor:pointer">+</button>
      </span>
    </div>
    <button onclick="document.getElementById('htpub-sheet').remove();_htPubLoad()" style="width:100%;min-height:48px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit">Fertig</button>`;
  document.body.appendChild(sh);
}
async function htPubTor(mi,seite,delta){
  const row=_htPub&&_htPub.row; if(!row)return;
  const p=row.plan[mi];
  const ta=Math.max(0,(p.ta==null?0:p.ta)+(seite==="ta"?delta:0));
  const tb=Math.max(0,(p.tb==null?0:p.tb)+(seite==="tb"?delta:0));
  let ok=false;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/heimturnier_ergebnis`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_slug:_htPub.slug,p_code:_htPub.code,p_idx:mi,p_ta:ta,p_tb:tb})});
    ok=r.ok&&(await r.json())===true;
  }catch(e){}
  if(!ok){if(typeof toast==="function")toast("Eintragen nicht möglich – Helfer-Code ungültig?","err");return;}
  p.ta=ta;p.tb=tb;
  const el=document.getElementById("htpub-"+seite); if(el)el.textContent=String(seite==="ta"?ta:tb);
}
function _htPublicRender(wrap,row){
  if(row&&fstIst(row)){ _fstPublicRender(wrap,row); return; }   // v484: Festival-Seite mit Wappen
  if(!row){wrap.innerHTML=`<div style="text-align:center;padding:60px 20px"><div style="font-size:44px">🏆</div><div style="font-weight:800;margin-top:8px">Turnier nicht gefunden</div><div style="font-size:13px;color:#64748b;margin-top:4px">Der Link ist abgelaufen oder falsch – bitte beim Veranstalter nachfragen.</div></div>`;return;}
  const teams=row.teams||[], plan=row.plan||[], cfg=row.config||{};
  const dat=row.datum?new Date(row.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}):"";
  const helfer=!!(_htPub&&_htPub.code);
  const filter=(_htPub&&_htPub.filter!=null)?_htPub.filter:null;
  const zeilen=plan.map((p,mi)=>{
    if(filter!=null&&p.a!==filter&&p.b!==filter)return "";
    const echt=typeof p.a==="number"&&typeof p.b==="number";
    const erg=p.ta!=null?p.ta+" : "+p.tb:"–";
    const ergZelle=(helfer&&echt)
      ?`<button onclick="htPubEdit(${mi})" style="min-height:44px;min-width:70px;border:1px solid var(--rand-bedien);border-radius:10px;background:#fff;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer">✏️ ${erg}</button>`
      :erg;
    return `<tr style="border-top:1px solid #e2e8f0;${p.ta!=null?"background:#f8fafc;":""}">
      <td style="padding:7px 6px;font-weight:700;white-space:nowrap">${esc(p.zeit||"")}</td>
      <td style="padding:7px 4px;color:#64748b;white-space:nowrap">F${p.feld||1}</td>
      <td style="padding:7px 6px">${esc(_htName(p.a,teams))} – ${esc(_htName(p.b,teams))}<div style="font-size:10px;color:#b45309;font-weight:700">${esc(p.phase||"")}</div></td>
      <td style="padding:7px 6px;text-align:right;font-weight:900;white-space:nowrap">${ergZelle}</td>
    </tr>`;}).join("");
  let tabellen="";
  if(plan.length&&cfg.format!=="festival"){
    const blocks=cfg.format==="gruppen"
      ?_htGruppenN(row).map((idxs,g)=>["Gruppe "+HT_GRLABEL[g],idxs])
      :[["Tabelle",teams.map((_,i)=>i)]];
    tabellen=blocks.map(([titel,idxs])=>`<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-weight:800;font-size:14px;margin-bottom:6px">📊 ${titel}</div>
      ${_htTabelle(plan,idxs,teams).map((z,pl)=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0">
        <span style="width:22px;color:#64748b">${pl+1}.</span><span style="flex:1;font-weight:600">${esc(z.name)}</span>
        <span style="font-size:11px;color:#94a3b8">${z.sp} Sp. · ${z.tore}:${z.geg}</span><b style="min-width:24px;text-align:right">${z.pkt}</b>
      </div>`).join("")}
    </div>`).join("");
  }else if(plan.length){
    tabellen=`<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:12px 14px;margin-top:12px;font-size:13px;color:#065f46">🦅 Festival-Turnier: Alle spielen gleich viel – auf eine Tabelle verzichten wir bewusst (Kinderfußball!).</div>`;
  }
  const sf=HT_SPIELFORM[cfg.spielform]||"";
  wrap.innerHTML=`
    <div style="background:linear-gradient(135deg,#1e3a8a,#b45309);border-radius:16px;padding:18px 16px;color:#fff;text-align:center">
      <div style="font-size:36px">🏆</div>
      <div style="font-size:20px;font-weight:900;margin-top:4px">${esc(row.name)}</div>
      <div style="font-size:12.5px;opacity:.9;margin-top:4px">${esc(dat)}${row.ort?" · "+esc(row.ort):""}</div>
      ${sf?`<div style="display:inline-block;margin-top:8px;background:rgba(255,255,255,.18);border-radius:12px;padding:3px 12px;font-size:12px;font-weight:800">⚽ ${esc(sf)}</div>`:""}
      <div style="font-size:11px;opacity:.75;margin-top:6px">Veranstalter: SV Adler Dellbrück U9 · Ergebnisse live</div>
    </div>
    ${helfer?'<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:10px 12px;margin-top:10px;font-size:13px;color:#065f46;font-weight:700">✏️ Helfer-Modus: Ergebnis antippen und eintragen – mehr geht mit diesem Link nicht.</div>':""}
    ${cfg.durchsage?`<div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:12px 14px;margin-top:10px;font-size:14.5px;color:#78350f;font-weight:800">📣 ${esc(cfg.durchsage)} <span style="font-weight:400;font-size:11px;color:#b45309">(Durchsage ${esc(cfg.durchsage_um||"")} Uhr)</span></div>`:""}
    ${plan.length?`<div style="display:flex;gap:6px;overflow-x:auto;padding:12px 2px 2px;-webkit-overflow-scrolling:touch">
      <button onclick="htPubFilter(null)" style="flex:none;min-height:44px;padding:6px 14px;border-radius:20px;border:1px solid ${filter==null?"#1e3a8a":"var(--rand-bedien)"};background:${filter==null?"#1e3a8a":"#fff"};color:${filter==null?"#fff":"#334155"};font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Alle</button>
      ${teams.map((t,i)=>`<button onclick="htPubFilter(${i})" style="flex:none;min-height:44px;padding:6px 14px;border-radius:20px;border:1px solid ${filter===i?"#1e3a8a":"var(--rand-bedien)"};background:${filter===i?"#1e3a8a":"#fff"};color:${filter===i?"#fff":"#334155"};font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">${esc(t)}</button>`).join("")}
    </div>${filter!=null?_htPubCountdown(row,filter):""}`:""}
    ${plan.length?`<div style="background:#fff;border-radius:14px;padding:8px 4px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">${zeilen}</table>
    </div>`:'<div style="background:#fff;border-radius:14px;padding:20px;margin-top:12px;text-align:center;color:#64748b;font-size:13px">Der Spielplan wird gerade erstellt – gleich nochmal schauen.</div>'}
    ${tabellen}
    ${cfg.regeln?`<details style="background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <summary style="font-weight:800;font-size:14px;cursor:pointer;min-height:44px;display:flex;align-items:center">📖 Regelwerk (${esc(sf||"Spielform")})</summary>
      <div style="font-size:13px;line-height:1.55;white-space:pre-wrap;margin-top:6px;color:#334155">${esc(cfg.regeln)}</div>
    </details>`:""}
    ${cfg.infos?`<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-weight:800;font-size:14px;margin-bottom:6px">ℹ️ Infos für die Gastvereine</div>
      <div style="font-size:13px;line-height:1.55;white-space:pre-wrap;color:#334155">${esc(cfg.infos)}</div>
    </div>`:""}
    ${cfg.fairplay!=null&&teams[cfg.fairplay]!=null?`<div style="background:#ecfdf5;border:2px solid #34d399;border-radius:14px;padding:12px 14px;margin-top:12px;font-size:14px;color:#065f46"><b>🤝 Fair-Play-Pokal: ${esc(teams[cfg.fairplay])}</b><div style="font-size:12px;margin-top:2px">Das fairste Team des Turniers – Glückwunsch!</div></div>`:""}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="location.reload()" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🔄 Aktualisieren</button>
      <button onclick="htPubMonitor()" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📺 Monitor</button>
      <button onclick="window.print()" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🖨️ Drucken</button>
    </div>
    <div style="text-align:center;font-size:10.5px;color:#94a3b8;margin-top:10px">Aktualisiert sich automatisch · Stand ${new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} Uhr</div>`;
}

/* Team-Filter auf der öffentlichen Seite: Gast-Trainer tippt sein Team an und sieht nur
   die eigenen Spiele plus einen Countdown zum nächsten Anpfiff. Rein clientseitig. */
function htPubFilter(i){
  if(!_htPub)return;
  _htPub.filter=(i==null||_htPub.filter===i)?null:i;
  _htPublicRender(_htPub.wrap,_htPub.row);
}
function _htPubCountdown(row,teamIdx){
  const plan=row.plan||[], teams=row.teams||[];
  const d=new Date(), jetzt=d.getHours()*60+d.getMinutes();
  const startMin=z=>{const[a,b]=(z||"0:0").split(":").map(Number);return a*60+b;};
  const naechste=plan.filter(p=>(p.a===teamIdx||p.b===teamIdx)&&p.ta==null&&startMin(p.zeit)>=jetzt)
    .sort((a,b)=>startMin(a.zeit)-startMin(b.zeit))[0];
  if(!naechste)return `<div style="background:#fff;border-radius:12px;padding:10px 14px;margin-top:8px;font-size:13px;color:#64748b;box-shadow:0 1px 3px rgba(0,0,0,.08)">🏁 Keine weiteren Spiele für ${esc(teams[teamIdx]||"?")} – danke fürs Mitspielen!</div>`;
  const inMin=startMin(naechste.zeit)-jetzt;
  const gegner=naechste.a===teamIdx?naechste.b:naechste.a;
  return `<div style="background:#1e3a8a;color:#fff;border-radius:12px;padding:10px 14px;margin-top:8px;font-size:13.5px;font-weight:700">⏱️ Nächstes Spiel: ${esc(naechste.zeit)} auf Feld ${naechste.feld||1} gegen ${esc(_htName(gegner,teams))}${inMin>0?` – <b>in ${inMin} Min.</b>`:" – <b>jetzt!</b>"}</div>`;
}
/* Monitor-Modus: Vollbild-Anzeigetafel fürs Vereinsheim/Tablet – wechselt alle 10 s
   zwischen „Jetzt läuft / Gleich dran" und den Tabellen; Uhr tickt sekündlich,
   die Daten kommen aus dem normalen 30-s-Auto-Refresh der Seite. */
let _htMon=null;
function htPubMonitor(){
  document.getElementById("htpub-monitor")?.remove();
  const ov=document.createElement("div");ov.id="htpub-monitor";
  ov.style.cssText="position:fixed;inset:0;background:#0b1730;color:#fff;z-index:2000;padding:3vmin;overflow:hidden;font-family:Inter,system-ui,sans-serif";
  document.body.appendChild(ov);
  _htMon={screen:0,timer:setInterval(_htMonRender,1000),flip:setInterval(()=>{if(_htMon)_htMon.screen=1-_htMon.screen;},10000)};
  try{if(typeof requestWakeLock==="function")requestWakeLock();}catch(e){}
  try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();}catch(e){}
  _htMonRender();
}
function htPubMonitorStop(){
  if(_htMon){clearInterval(_htMon.timer);clearInterval(_htMon.flip);}
  _htMon=null;
  document.getElementById("htpub-monitor")?.remove();
  try{document.exitFullscreen&&document.fullscreenElement&&document.exitFullscreen();}catch(e){}
  try{if(typeof releaseWakeLock==="function")releaseWakeLock();}catch(e){}
}
function _htMonRender(){
  const ov=document.getElementById("htpub-monitor"); if(!ov||!_htMon)return;
  const row=_htPub&&_htPub.row;
  if(!row){ov.innerHTML='<div style="padding:8vmin;text-align:center;font-size:4vmin">Lade…</div>';return;}
  const teams=row.teams||[], plan=row.plan||[], cfg=row.config||{};
  const d=new Date(), jetzt=d.getHours()*60+d.getMinutes();
  const uhr=d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const startMin=z=>{const[a,b]=(z||"0:0").split(":").map(Number);return a*60+b;};
  const dauer=Math.max(1,Number(cfg.spieldauer)||10);
  const live=plan.filter(p=>{const s=startMin(p.zeit);return s<=jetzt&&jetzt<s+dauer;});
  const next=plan.filter(p=>startMin(p.zeit)>jetzt).slice(0,4);
  const spiel=p=>`<div style="display:flex;align-items:center;gap:2vmin;font-size:4vmin;font-weight:800;padding:1vmin 0"><span style="opacity:.65;font-size:2.8vmin;min-width:14vmin;white-space:nowrap">${esc(p.zeit||"")} · F${p.feld||1}</span><span style="flex:1;min-width:0">${esc(_htName(p.a,teams))} <span style="opacity:.5">vs</span> ${esc(_htName(p.b,teams))}</span><span style="font-size:5vmin;font-weight:900">${p.ta!=null?p.ta+":"+p.tb:""}</span></div>`;
  let inhalt="";
  if(cfg.format!=="festival"&&_htMon.screen===1&&plan.length){
    const blocks=cfg.format==="gruppen"?_htGruppenN(row).map((idxs,g)=>["Gruppe "+HT_GRLABEL[g],idxs]):[["Tabelle",teams.map((_,i)=>i)]];
    inhalt=`<div style="display:flex;gap:4vmin;flex-wrap:wrap">${blocks.map(([t,idxs])=>`<div style="flex:1;min-width:34vmin"><div style="font-size:3.2vmin;font-weight:900;opacity:.75;margin-bottom:1vmin">📊 ${t}</div>${_htTabelle(plan,idxs,teams).map((z,pl)=>`<div style="display:flex;gap:1.5vmin;font-size:3.2vmin;padding:.5vmin 0"><span style="opacity:.55;min-width:4vmin">${pl+1}.</span><span style="flex:1;min-width:0">${esc(z.name)}</span><span style="opacity:.55;font-size:2.6vmin">${z.tore}:${z.geg}</span><b style="min-width:5vmin;text-align:right">${z.pkt}</b></div>`).join("")}</div>`).join("")}</div>`;
  }else{
    const fertig=!live.length&&!next.length&&plan.length&&plan.every(p=>typeof p.a!=="number"||p.ta!=null||startMin(p.zeit)<jetzt);
    inhalt=(live.length?`<div style="font-size:2.8vmin;font-weight:900;color:#4ade80;letter-spacing:.4vmin">● JETZT LÄUFT</div>${live.map(spiel).join("")}`:"")
      +(next.length?`<div style="font-size:2.8vmin;font-weight:900;color:#fbbf24;letter-spacing:.4vmin;margin-top:2.5vmin">⏭ GLEICH DRAN</div>${next.map(spiel).join("")}`:"")
      +((!live.length&&!next.length)?`<div style="font-size:5vmin;font-weight:900;text-align:center;margin-top:8vmin">${fertig?"🏁 Alle Spiele gespielt – Siegerehrung! 🦅":"🦅 Gleich geht es los!"}</div>${cfg.fairplay!=null&&teams[cfg.fairplay]?`<div style="font-size:3.4vmin;text-align:center;margin-top:2vmin">🤝 Fair-Play-Pokal: <b>${esc(teams[cfg.fairplay])}</b></div>`:""}`:"");
  }
  ov.innerHTML=`<div style="display:flex;align-items:center;gap:2vmin">
      <span style="font-size:4vmin">🏆</span>
      <span style="font-size:3.4vmin;font-weight:900;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(row.name)}</span>
      <span style="font-size:4.4vmin;font-weight:900;font-variant-numeric:tabular-nums">${uhr}</span>
      <button onclick="htPubMonitorStop()" aria-label="Monitor beenden" style="min-width:44px;min-height:44px;border:none;background:rgba(255,255,255,.14);color:#fff;border-radius:10px;font-size:18px;cursor:pointer">✕</button>
    </div>
    ${cfg.durchsage?`<div style="background:#f59e0b;color:#0b1730;border-radius:1.5vmin;padding:1.5vmin 2vmin;font-size:3.2vmin;font-weight:900;margin-top:1.5vmin">📣 ${esc(cfg.durchsage)}</div>`:""}
    <div style="margin-top:2.5vmin">${inhalt}</div>`;
}
