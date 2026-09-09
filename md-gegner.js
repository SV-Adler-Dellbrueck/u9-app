/* ═══════════════════════════════════
   GEGNER-DATENBANK – Adresse + Ansprechpartner/Kontakt pro Gegner.
   Enthält Kontaktdaten Dritter → Tabelle `gegner` ist RLS-strikt trainer-only.
   Bei der Termin-Anlage füllt ein bekannter Gegner die Adresse automatisch; der
   Ansprechpartner erscheint (klickbar) am nächsten Spiel im Trainer-Dashboard.
═══════════════════════════════════ */
let GEGNER_CACHE=null;
async function gegnerLoad(force){
  if(GEGNER_CACHE&&!force){gegnerDatalistFill();return GEGNER_CACHE;}
  try{const r=await fetch(`${SB_URL}/rest/v1/gegner?select=*&order=name.asc`,{headers:sbAuthHeaders()});if(r.ok)GEGNER_CACHE=await r.json();}catch(e){}
  GEGNER_CACHE=GEGNER_CACHE||[];
  gegnerDatalistFill();
  return GEGNER_CACHE;
}
function gegnerDatalistFill(){
  const dl=document.getElementById("gegner-datalist"); if(!dl||!GEGNER_CACHE)return;
  dl.innerHTML=GEGNER_CACHE.map(g=>`<option value="${esc(g.name)}">`).join("");
}
async function gegnerFind(name){
  if(!name)return null;
  const list=await gegnerLoad(), n=name.trim().toLowerCase();
  return list.find(g=>g.name.toLowerCase()===n) || list.find(g=>n.includes(g.name.toLowerCase())) || null;
}
async function gegnerAutofill(){
  const name=(document.getElementById("tm-titel")?.value||"").trim();
  if(!name)return;
  const g=await gegnerFind(name); if(!g)return;
  const ort=document.getElementById("tm-ort");
  if(ort&&!ort.value.trim()&&g.adresse)ort.value=g.adresse;
  const box=document.getElementById("tm-addr-results");
  if(box)box.innerHTML=`<div style="font-size:11px;color:#16a34a;padding:4px 2px">✓ Gegner erkannt – Adresse${(g.ansprechpartner||g.telefon)?" & Kontakt":""} aus der Datenbank.</div>`;
}
// Telefonnummer → wa.me-Format (nur Ziffern, deutscher Ländercode 49). 0170… → 49170…
function waNumber(tel){
  if(!tel)return "";
  let d=String(tel).replace(/[^\d+]/g,"");
  if(d.charAt(0)==="+")d=d.slice(1);
  else if(d.slice(0,2)==="00")d=d.slice(2);
  else if(d.charAt(0)==="0")d="49"+d.slice(1); // deutsche Nummer
  return d.replace(/\D/g,"");
}
async function gegnerContactInto(elId,name){
  const g=await gegnerFind(name);
  const el=document.getElementById(elId);
  if(!el||!g||!(g.ansprechpartner||g.telefon))return;
  const tel=g.telefon?String(g.telefon).replace(/\s/g,""):"", wa=waNumber(g.telefon);
  el.innerHTML=`<div style="font-size:11.5px;color:var(--text2);margin-top:6px">📇 ${esc(g.ansprechpartner||"Ansprechpartner")}${g.telefon?` · <a href="tel:${esc(tel)}" style="color:var(--blue);font-weight:700;text-decoration:none">☎ ${esc(g.telefon)}</a>${wa?` · <a href="https://wa.me/${wa}" target="_blank" rel="noopener" style="color:#25D366;font-weight:700;text-decoration:none">💬 WhatsApp</a>`:""}`:""}</div>`;
}
async function gegnerQuickSave(){
  const name=(document.getElementById("tm-titel")?.value||"").trim();
  const adresse=(document.getElementById("tm-ort")?.value||"").trim();
  if(!name){toast("Kein Gegnername","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/gegner?on_conflict=name`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({name,adresse:adresse||null})});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("Als Gegner gemerkt ✓ – Kontakt in der Gegner-Datenbank ergänzen");await gegnerLoad(true);}
    else toast("Speichern fehlgeschlagen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function gegnerManageOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("gegner-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="gegner-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Gegner-Datenbank");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:520px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("gegner-modal","🗂️","Gegner-Datenbank","Adresse & Ansprechpartner je Gegner · füllt Termine automatisch","#334155")}
    <div id="gegner-list" style="margin-bottom:8px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div id="gegner-form"></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('gegner-modal').remove()">Schließen</button>`;
  modal.appendChild(card);document.body.appendChild(modal);
  await gegnerLoad(true);
  gegnerRenderList(); gegnerFormRender(null);
}
function gegnerRenderList(){
  const box=document.getElementById("gegner-list"); if(!box)return;
  const list=GEGNER_CACHE||[];
  if(!list.length){box.innerHTML=`<div style="font-size:12px;color:var(--text3)">Noch keine Gegner gespeichert.</div>`;return;}
  box.innerHTML=list.map(g=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:var(--border)">
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700">${esc(g.name)}</div>
      ${g.adresse?`<div style="font-size:11px;color:var(--text2)">📍 ${esc(g.adresse)}</div>`:""}
      ${(g.ansprechpartner||g.telefon)?`<div style="font-size:11px;color:var(--text2)">📇 ${esc(g.ansprechpartner||"")}${g.telefon?` · <a href="tel:${esc(String(g.telefon).replace(/\s/g,""))}" style="color:var(--blue);text-decoration:none">☎ ${esc(g.telefon)}</a> · <a href="https://wa.me/${waNumber(g.telefon)}" target="_blank" rel="noopener" style="color:#25D366;text-decoration:none">💬 WhatsApp</a>`:""}</div>`:""}
    </div>
    <button class="btn btn-sm" onclick="gegnerEdit(${g.id})"><i class="ti ti-edit"></i></button>
  </div>`).join("");
}
// Bisherige Spiele gegen diesen Gegner (aus den geladenen Terminen + termine.ergebnis).
function gegnerHistoryHtml(name){
  if(!name)return "";
  const n=name.trim().toLowerCase();
  const games=(TM_TERMINE||[]).filter(t=>(t.typ==="spiel"||t.typ==="turnier")&&((t.gegner||"").toLowerCase().includes(n)||(t.titel||"").toLowerCase().includes(n)))
    .sort((a,b)=>String(b.datum).localeCompare(String(a.datum))).slice(0,6);
  if(!games.length)return "";
  return `<div style="margin-top:12px;border-top:var(--border-s);padding-top:10px">
    <div style="font-size:11px;font-weight:800;color:var(--text2);margin-bottom:4px">📊 Bisherige Spiele</div>
    ${games.map(t=>{const d=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});
      return `<div style="font-size:11px;color:var(--text2);padding:2px 0">${d} · ${esc(t.titel||t.gegner||"Spiel")}${t.ergebnis?` · <b style="color:var(--text)">${esc(t.ergebnis)}</b>`:` · <span style="color:var(--text3)">kein Ergebnis</span>`}</div>`;}).join("")}
  </div>`;
}
function gegnerFormRender(g){
  const box=document.getElementById("gegner-form"); if(!box)return;
  g=g||{};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  box.innerHTML=`<div style="border-top:var(--border-s);padding-top:10px">
    <div style="font-size:11px;font-weight:800;color:var(--text2);margin-bottom:6px">${g.id?"✏️ Gegner bearbeiten":"➕ Neuer Gegner"}</div>
    <input type="hidden" id="gg-id" value="${g.id||""}">
    <label style="font-size:11px;color:var(--text2)">Name*<input id="gg-name" value="${esc(g.name||"")}" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2)">Adresse<input id="gg-adresse" value="${esc(g.adresse||"")}" placeholder="Straße, PLZ Ort" style="${fld}"></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <label style="font-size:11px;color:var(--text2)">Ansprechpartner<input id="gg-ap" value="${esc(g.ansprechpartner||"")}" style="${fld}"></label>
      <label style="font-size:11px;color:var(--text2)">Telefon<input id="gg-tel" value="${esc(g.telefon||"")}" style="${fld}"></label>
    </div>
    <label style="font-size:11px;color:var(--text2)">E-Mail<input id="gg-email" value="${esc(g.email||"")}" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2)">Notiz<input id="gg-notiz" value="${esc(g.notiz||"")}" style="${fld}"></label>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
      <button class="btn btn-p btn-sm" onclick="gegnerSave()"><i class="ti ti-device-floppy"></i>Speichern</button>
      ${g.id?`<button class="btn btn-sm" onclick="gegnerFormRender(null)">Neu</button><button class="btn btn-sm" style="margin-left:auto;color:#dc2626" onclick="gegnerDelete(${g.id})"><i class="ti ti-trash"></i>Löschen</button>`:""}
    </div>
    ${g.id?gegnerHistoryHtml(g.name):""}
  </div>`;
}
function gegnerEdit(id){ const g=(GEGNER_CACHE||[]).find(x=>x.id===id); gegnerFormRender(g||null); }
async function gegnerSave(){
  const name=(document.getElementById("gg-name")?.value||"").trim();
  if(!name){toast("Name fehlt","err");return;}
  const id=document.getElementById("gg-id")?.value;
  const v=i=>(document.getElementById(i)?.value||"").trim()||null;
  const body={name, adresse:v("gg-adresse"), ansprechpartner:v("gg-ap"), telefon:v("gg-tel"), email:v("gg-email"), notiz:v("gg-notiz")};
  try{
    let r;
    if(id) r=await fetch(`${SB_URL}/rest/v1/gegner?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify(body)});
    else   r=await fetch(`${SB_URL}/rest/v1/gegner?on_conflict=name`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){ toast("Gegner gespeichert ✓"); await gegnerLoad(true); gegnerRenderList(); gegnerFormRender(null); }
    else toast("Speichern fehlgeschlagen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function gegnerDelete(id){
  const g=(GEGNER_CACHE||[]).find(x=>x.id===id);
  if(!confirm(`Gegner wirklich löschen?

${g?g.name:""}

Kontaktdaten und Historie gehen verloren.`))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/gegner?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    toast("Gegner gelöscht"); await gegnerLoad(true); gegnerRenderList(); gegnerFormRender(null);
  }catch(e){toast("Netzwerkfehler","err");}
}
let TM_TERMINE=[]; // zuletzt geladene Termine (für .ics-Lookup + Gegner-Historie)
async function tmLoad(){
  const up=document.getElementById("tm-upcoming"),pa=document.getElementById("tm-past");
  if(!up||!pa)return;
  gegnerLoad(); // Gegner-Datenbank → Datalist für Auto-Fill
  up.innerHTML='<div style="font-size:11px;color:var(--text3)">Lade...</div>';pa.innerHTML="";
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Keine Verbindung</div>';return;}
    const rows=await r.json();
    TM_TERMINE=rows;
    const heute=new Date().toISOString().slice(0,10);
    // Mit Endzeit wandert ein Termin noch am selben Tag ins Archiv (terminVorbei, core.js)
    const vorbei=(typeof terminVorbei==="function")?terminVorbei:(t=>t.datum<heute);
    const kommend=rows.filter(t=>!vorbei(t));
    const vergangen=rows.filter(t=>vorbei(t)).reverse();
    // Nur der NÄCHSTE Termin als volle Karte (Wetter/Büdchen inline); alle weiteren kompakt
    // hinter einem Button, damit die Liste bei einer ganzen Saison nicht endlos wird.
    const FULL=1;
    const kFull=kommend.slice(0,FULL), kRest=kommend.slice(FULL);
    up.innerHTML=kommend.length
      ? kFull.map(tmCard).join("")+(kRest.length?`<button id="tm-more-btn" class="btn btn-sm" style="width:100%;margin:2px 0 8px" onclick="tmToggleMore()"><i class="ti ti-chevron-down"></i>Weitere ${kRest.length} Termine anzeigen</button><div id="tm-more" style="display:none">${kRest.map(tmRow).join("")}</div>`:"")
      : '<div style="font-size:11px;color:var(--text3);padding:6px">Keine kommenden Termine.</div>';
    pa.innerHTML=vergangen.length?vergangen.slice(0,40).map(tmRow).join(""):'<div style="font-size:11px;color:var(--text3);padding:6px">Noch keine vergangenen Termine.</div>';
    kFull.forEach(t=>wetterInto("wx-tm-"+t.id,t.datum,t.ort,t.uhrzeit)); // Wetter nur für die vollen Karten
    kFull.filter(t=>t.heim===true&&(t.typ==="spiel"||t.typ==="turnier")).forEach(buedchenTrainerFill); // Büdchen je Heimspiel
  }catch(e){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Offline</div>';}
}
// J6: Ansage zu einem Termin – öffnet das Ansage-Modal mit vorbefülltem Termin-Text.
function ansageVomTermin(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id));
  if(!t||typeof ansageTrainerOpen!=="function")return;
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ};
  const d=new Date(t.datum+"T00:00:00");
  const ds=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+", "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
  ansageTrainerOpen(`${m.icon} ${t.titel||m.label} am ${ds}${zeit?" um "+zeit:""}${t.ort?" · "+t.ort:""}\nTreffpunkt: `);
}
// Kompakte Termin-Zeile (für den langen Schwanz kommender Termine + das Archiv).
// Ein Tap öffnet das volle Detailfenster (tmDetailOpen) – so bleibt die Liste kurz.
function tmRow(t){
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
  const hb=heimLabel(t);
  return `<div onclick="tmDetailOpen(${t.id})" style="display:flex;align-items:center;gap:10px;background:var(--surface);border:var(--border-s);border-left:3px solid ${m.col};border-radius:var(--rl);padding:9px 12px;margin-bottom:6px;cursor:pointer">
    <span style="font-size:18px">${m.icon}</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.titel||m.label)}</div>
      <div style="font-size:11px;color:var(--text2)">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"})}${zeit?" · "+zeit:""}${hb?` · <span style="color:${t.heim?"#15803d":"#b45309"};font-weight:700">${esc(hb)}</span>`:""}</div>
    </div>
    <span style="font-size:16px;color:var(--text3)">›</span>
  </div>`;
}
// „Weitere Termine" (kompakter Schwanz) ein-/ausklappen.
function tmToggleMore(){
  const box=document.getElementById("tm-more"), btn=document.getElementById("tm-more-btn");
  if(!box)return;
  const show=box.style.display==="none";
  box.style.display=show?"block":"none";
  if(btn)btn.innerHTML=`<i class="ti ti-chevron-${show?"up":"down"}"></i>Weitere Termine ${show?"ausblenden":"anzeigen"}`;
}
// Trainer-Termin-Detailfenster: zeigt die volle Terminkarte (mit allen Aktionen) als Overlay.
function tmDetailOpen(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id));
  if(!t){ if(typeof go==="function")go("termine"); return; }
  document.getElementById("tmd-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="tmd-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Termin-Details");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10040;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.dataset.tid=String(t.id);   // damit tmDetailNeu weiss, welcher Termin offen ist
  const c=document.createElement("div");
  c.id="tmd-inhalt";
  c.style.cssText="max-width:460px;width:100%;margin:auto";
  c.innerHTML=_tmdInhalt(t);
  modal.appendChild(c);document.body.appendChild(modal);
  _tmdNachlader(t);
}
/* ═══ v491 – Das Termin-Fenster ist die Arbeitsansicht ══════════════════════
   PO: „Diese Kachel, wenn ich von der Startseite auf einen Termin klicke, ist total
   unübersichtlich und nicht gut strukturell aufgebaut. Hier wäre auch ein Absprung zur
   Festival-Planung oder ins Match sinnvoll. Optimiere diese Seite optisch, strukturell
   und inhaltlich."
   Die LISTE bleibt kompakt (tmCard) – dort wird gescannt. Das FENSTER bekommt eine eigene
   Ordnung, denn dort wird gearbeitet: Kopf → Wo → Was du hier tust → Wer dabei ist → Nach
   dem Spiel → Für die Eltern → Mehr. Die zwei Wege in die Arbeit (Planer und Match) stehen
   groß oben, alles Seltene klappt zu. Am Termintag führt der erste Knopf ins Match, davor
   in die Planung – die Reihenfolge folgt dem Kalender, nicht dem Zufall. */
function tmPlanerOpen(datum,titel,anlass){
  document.getElementById("tmd-modal")?.remove();
  if(typeof htOpen==="function")htOpen(datum,titel,anlass);
  else toast("Der Planer lädt noch – gleich nochmal","err");
}
function tmTurnierModusOpen(){
  document.getElementById("tmd-modal")?.remove();
  if(typeof turnierOpen==="function")turnierOpen(); else toast("Turnier-Modus lädt noch","err");
}
function _tmdKarte(t){
  const m=TM_META[t.typ]||TM_META.training;
  const heute=new Date().toISOString().slice(0,10);
  const kommt=t.datum>=heute, istHeute=t.datum===heute, vorbei=t.datum<heute;
  const istSpiel=t.typ==="spiel"||t.typ==="turnier";
  const routeAddr=t.ort||(t.heim===true?VEREIN_ADRESSE:"");
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const datumStr=wtag+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const zeitStr=t.uhrzeit?String(t.uhrzeit).slice(0,5):((/Uhrzeit:\s*(\d{1,2}:\d{2})/.exec(t.notiz||"")||[])[1]||"");
  const notizClean=(t.notiz&&!/^Uhrzeit:/.test(t.notiz))?t.notiz:"";
  const badge=(txt,bg,col)=>`<span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px;background:${bg};color:${col}">${txt}</span>`;
  const hb=heimLabel(t);
  const badges=[
    hb?badge(esc(hb),t.heim?"#dcfce7":"#fef3c7",t.heim?"#15803d":"#b45309"):"",
    (istSpiel&&t.spielform)?badge(esc(t.spielform),m.col+"22",m.col):"",
    (typeof ferienBadge==="function")?ferienBadge(t.datum):""
  ].join("");
  const sec=x=>`<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:14px 0 6px">${x}</div>`;
  const zu=(sum,inner,offen)=>`<details${offen?" open":""} style="margin-top:10px;border:var(--border-s);border-radius:12px;background:var(--surface2)">
      <summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;padding:0 12px;font-size:12.5px;font-weight:800;color:var(--text2)">${sum}</summary>
      <div style="padding:2px 12px 12px">${inner}</div></details>`;
  const klein=o=>o.href
    ? `<a class="btn btn-sm" href="${o.href}" target="_blank" rel="noopener noreferrer" style="min-height:44px;justify-content:flex-start;text-decoration:none"><i class="ti ${o.i}"></i>${o.l}</a>`
    : `<button class="btn btn-sm" onclick="${o.c}" style="min-height:44px;justify-content:flex-start"><i class="ti ${o.i}"></i>${o.l}</button>`;
  const raster=a=>`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${a.filter(Boolean).map(klein).join("")}</div>`;

  /* 1 · Was du hier tust – höchstens zwei große Wege, nach dem Kalender sortiert. */
  const teamsBtn={i:"ti-users-group",l:"Teams festlegen",c:`tmJump('spieltag','${t.datum}','${t.spielform||""}')`};
  const planerBtn=t.heim===true
    ? {i:"ti-layout-grid",l:t.typ==="spiel"?"Heimspiel planen":"Festival planen",c:`tmPlanerOpen('${t.datum}','${jsq(t.titel||"")}','${t.typ==="spiel"?"heimspiel":"festival"}')`}
    : (t.typ==="turnier"?{i:"ti-trophy",l:"Turnier-Modus",c:"tmTurnierModusOpen()"}:null);
  let gross=[];
  if(t.typ==="training")gross=[{...{i:"ti-clipboard-list",l:"Trainingsplan",c:`tmJump('planung','${t.datum}')`},p:true},
                               {...{i:"ti-checkbox",l:"Anwesenheit",c:`tmJump('anwesenheit','${t.datum}')`},p:false}];
  else if(istSpiel)gross=(istHeute||!planerBtn)
    ? [{...teamsBtn,p:true}, planerBtn?{...planerBtn,p:false}:null]
    : [{...planerBtn,p:true}, {...teamsBtn,p:false}];
  else gross=[{i:"ti-basket",l:"Mitbringliste",c:"mitbringTrainerOpen()",p:true}];
  const grossBtn=o=>`<button class="btn${o.p?" btn-p":""}" onclick="${o.c}" style="width:100%;min-height:52px;justify-content:center;font-size:14px;font-weight:800"><i class="ti ${o.i}"></i>${o.l}</button>`;

  /* 2 · Für die Eltern und 3 · Mehr – getrennt, weil das eine der Verein braucht und das
     andere nur der Trainer. Beides zugeklappt; „Fällt aus" klappt von selbst auf. */
  const elternRest=[
    {i:"ti-users",l:"Eltern-Info",c:`mdOpen('${t.datum}','${t.typ}')`},
    kommt?{i:"ti-speakerphone",l:"Ansage",c:`ansageVomTermin(${Number(t.id)})`}:null,
    kommt?(()=>{const deepLink=appRoot()+"?portal&rsvp="+t.id;
      const waText=`🦅 SV Adler U9 – bitte kurz rückmelden fürs nächste ${m.label}:\n${t.titel||m.label} am ${datumStr}${zeitStr?" um "+zeitStr+" Uhr":""}${t.ort?" ("+t.ort+")":""}\n👉 Zu-/absagen: ${deepLink}`;
      return {i:"ti-bell",l:"Erinnerung",href:`https://wa.me/?text=${encodeURIComponent(waText)}`};})():null
  ];
  const rest=[
    {i:"ti-edit",l:"Bearbeiten",c:`tmEdit(${Number(t.id)})`},
    {i:"ti-calendar-plus",l:"Kalender",c:`tmIcsOne(${Number(t.id)})`},
    routeAddr?{i:"ti-navigation",l:"Route",href:mapsUrl(routeAddr)}:null,
    kommt?{i:"ti-user-share",l:"Vertretung",c:`handoverOpen(${Number(t.id)})`}:null,
    {i:"ti-photo",l:"Fotos",c:`galerieOpen(${Number(t.id)},'${(t.titel||m.label).replace(/'/g,"")}')`}
  ];
  const ampel=PLATZ_AMPEL[t.platz_status||""]||null;
  const abgesagt=t.platz_status==="abgesagt";

  return `<div style="background:var(--surface);color:var(--text);border-radius:var(--rl);overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.18)">
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:linear-gradient(90deg,${m.col}1f,transparent);border-left:5px solid ${m.col}">
      <div style="width:46px;height:46px;flex:none;border-radius:14px;background:${m.col};display:flex;align-items:center;justify-content:center;font-size:23px;box-shadow:0 2px 8px ${m.col}55">${m.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:900;line-height:1.2">${esc(t.titel||m.label)}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:3px">${datumStr}${zeitStr?" · "+zeitStr+" Uhr":""}</div>
        ${badges?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">${badges}</div>`:""}
      </div>
    </div>
    ${abgesagt?`<div style="background:#fee2e2;color:#991b1b;font-size:13px;font-weight:800;padding:9px 14px">🔴 Fällt aus${t.platz_status_note?" – "+esc(t.platz_status_note):""}</div>`:""}
    <div style="padding:12px 14px 14px">

      ${(t.ort||t.platz)?`<div style="font-size:12.5px;color:var(--text2);line-height:1.6">
        ${t.ort?`<div><i class="ti ti-map-pin"></i> ${mapsAnchor(t.ort)}</div>`:""}
        ${t.platz?`<div>🏟️ ${esc(t.platz)}</div>`:""}
      </div>`:""}
      <div id="wx-tm-${t.id}"></div>
      ${notizClean?`<div style="font-size:12px;color:var(--text3);margin-top:6px">${esc(notizClean)}</div>`:""}

      ${sec("Was du hier tust")}
      <div style="display:flex;flex-direction:column;gap:6px">${gross.filter(Boolean).map(grossBtn).join("")}</div>

      ${sec("Wer ist dabei")}
      ${kommt?`<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
        <span style="font-size:11px;color:var(--text3);font-weight:800;width:100%">Trainer</span>
        ${trainerstabNamen(t.trainer_status).map(tn=>{const stt=(t.trainer_status||{})[tn];const bg=stt==="ja"?"#16a34a":stt==="unsicher"?"#ca8a04":stt==="nein"?"#dc2626":"var(--surface2)";const col=stt?"#fff":"var(--text2)";const mk=stt==="ja"?" ✓":stt==="unsicher"?" 🤔":stt==="nein"?" ✕":"";
          return `<button onclick="tmTrainerToggle(${Number(t.id)},'${tn.replace(/'/g,"")}')" title="Tippen wechselt: dabei → unsicher → nicht dabei → offen" style="min-height:44px;border:1px solid var(--rand-bedien);border-radius:12px;padding:0 12px;font-size:12.5px;font-weight:700;background:${bg};color:${col};cursor:pointer;font-family:inherit">${esc(tn)}${mk}</button>`;}).join("")}
      </div>`:""}
      ${(t.heim===true&&istSpiel&&kommt)?`<div id="bd-tm-${t.id}" style="font-size:12px;color:var(--text2);margin-top:4px">🍿 Büdchen: lädt …</div>`:""}
      ${kommt?`<div id="helfer-tm-${t.id}" style="font-size:12px;color:var(--text2);margin-top:4px"></div>`:""}
      ${kommt?`<button class="btn btn-sm" onclick="rsvpOverviewOpen(${Number(t.id)})" style="width:100%;min-height:44px;margin-top:8px;justify-content:center"><i class="ti ti-list-check"></i>Antworten der Eltern</button>`:""}

      ${(vorbei||istHeute)&&(istSpiel||t.typ==="training")?`${sec("Nach dem Termin")}
        ${istSpiel?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:12px;color:var(--text2)">Ergebnis</span>
          <input type="text" value="${esc(t.ergebnis||"")}" placeholder="z. B. 3:2" onchange="tmSetResult(${Number(t.id)},this.value)" style="width:100px;min-height:44px;padding:6px 10px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-size:13px;font-family:inherit;background:var(--surface2);color:var(--text)">
        </div>
        <button class="btn btn-sm" onclick="tmJump('blitz','${t.datum}','${t.spielform||""}')" style="width:100%;min-height:44px;justify-content:center"><i class="ti ti-bolt"></i>Auswertung &amp; Blitz-Rating</button>`:""}
        <div id="puls-tm-${t.id}" style="font-size:12px;color:var(--text2);margin-top:6px"></div>`:""}

      ${zu(`📣 Für die Eltern${ampel?" · "+ampel.emo+" "+esc(ampel.lbl):""}`,
        `${kommt?`<div style="margin-bottom:8px">${platzAmpelTrainer(t,true)}</div>`:""}${raster(elternRest)}`, abgesagt)}
      ${zu("⚙️ Mehr",`${raster(rest)}
        <button class="btn btn-sm btn-d" onclick="tmDelete(${Number(t.id)})" style="width:100%;min-height:44px;justify-content:center;margin-top:6px"><i class="ti ti-trash"></i>Termin löschen</button>`)}
    </div>
  </div>`;
}
function _tmdInhalt(t){
  return `<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button onclick="document.getElementById('tmd-modal').remove()" aria-label="Schließen" style="border:none;background:rgba(255,255,255,.92);width:40px;height:40px;border-radius:50%;font-size:22px;color:#334155;cursor:pointer;line-height:1">×</button></div>${_tmdKarte(t)}`;
}
// Nachlader wie in der Terminliste anstoßen (Wetter + Büdchen füllen ihre Slots per id).
function _tmdNachlader(t){
  try{ wetterInto("wx-tm-"+t.id,t.datum,t.ort,t.uhrzeit); }catch(e){}
  if(t.heim===true&&(t.typ==="spiel"||t.typ==="turnier")){ try{ buedchenTrainerFill(t); }catch(e){} }
  if(["training","spiel","turnier"].includes(t.typ)&&t.datum<new Date().toISOString().slice(0,10)){ try{ pulsTrainerFill(t); }catch(e){} } // F4
  if(t.datum>=new Date().toISOString().slice(0,10)){ try{ helferTrainerFill(t); }catch(e){} } // G4
}
/* Das Detailfenster zeichnet sich NICHT ueber tmLoad() mit: das steigt ohne die
   Terminliste im DOM sofort wieder aus (`if(!up||!pa)return`), und vom Startbildschirm
   aus ist die Liste nie da. Bis v466 tippte der Trainer dort auf „Trainer dabei?" oder
   „Faellt aus", der Server nahm es an – und im Fenster aenderte sich nichts.
   Scrollstand bleibt, sonst springt das Fenster bei jedem Tippen nach oben. */
function tmDetailNeu(id){
  const modal=document.getElementById("tmd-modal");
  if(!modal||Number(modal.dataset.tid)!==Number(id))return;
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t)return;
  const box=document.getElementById("tmd-inhalt"); if(!box)return;
  const oben=modal.scrollTop;
  box.innerHTML=_tmdInhalt(t);
  modal.scrollTop=oben;
  _tmdNachlader(t);
}
// G4: Helferliste im Trainer-Termindetail (Lesesicht; Löschen dürfen Eltern selbst / Trainer per RLS).
async function helferTrainerFill(t){
  const box=document.getElementById("helfer-tm-"+t.id); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/event_helfer?termin_id=eq.${t.id}&select=name,aufgabe&order=created_at.asc`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML='🙌 Helfer: noch niemand eingetragen';return;}
  box.innerHTML='🙌 <b>Helfer</b>: '+rows.map(x=>`${esc(x.aufgabe)} (${esc(x.name)})`).join(" · ");
}
// F4: Eltern-Puls-Aggregat fürs Trainer-Detail (anonym via puls_aggregate).
async function pulsTrainerFill(t){
  const box=document.getElementById("puls-tm-"+t.id); if(!box)return;
  let a=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/puls_aggregate`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:Number(t.id)})});if(r.ok)a=await r.json();}catch(e){}
  if(!a||!a.n){box.innerHTML='🌡️ Eltern-Puls: noch keine Rückmeldung';return;}
  const comments=(a.comments||[]);
  window._pulsCmt=window._pulsCmt||{}; window._pulsCmt[t.id]=comments;
  box.innerHTML=`🌡️ <b>Eltern-Puls</b> (${a.n}): 😀 ${a.up} · 😐 ${a.mid} · 😟 ${a.down} · Ø ${a.avg}`+
    (comments.length?` <button onclick="pulsComments(${Number(t.id)})" style="border:none;background:none;color:var(--blue);cursor:pointer;font-size:11px;font-family:inherit;padding:0">💬 ${comments.length}</button>`:"");
}
function pulsComments(id){
  const arr=(window._pulsCmt||{})[id]||[]; if(!arr.length)return;
  document.getElementById("puls-cmt-modal")?.remove();
  const modal=document.createElement("div"); modal.id="puls-cmt-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10060;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("puls-cmt-modal","💬","Eltern-Feedback","anonym gesammelt","#0ea5e9")}
    ${arr.map(x=>`<div style="padding:8px 10px;background:var(--surface2);border-radius:8px;margin-bottom:6px;font-size:13px">${esc(x)}</div>`).join("")}
    <button class="btn btn-sm" style="margin-top:6px" onclick="document.getElementById('puls-cmt-modal').remove()">Schließen</button>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
// Archiv (vergangene Termine) ein-/ausklappen – standardmäßig zu, damit nur Kommendes im Fokus ist.
function tmToggleArchiv(){
  const pa=document.getElementById("tm-past"), btn=document.getElementById("tm-archiv-btn");
  if(!pa)return;
  const show=pa.style.display==="none";
  pa.style.display=show?"block":"none";
  if(btn)btn.innerHTML=`<i class="ti ti-archive"></i>🗄️ Archiv: vergangene Termine ${show?"ausblenden":"anzeigen"}`;
}
// Einzel-Termin als .ics (Kalender-Datei) – nutzt die vorhandenen ics-Helfer.
function tmIcsOne(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t){toast("Termin nicht gefunden","err");return;}
  const m=TM_META[t.typ]||TM_META.training;
  const time=(t.uhrzeit?String(t.uhrzeit).slice(0,5):"")||"17:00";
  const dtStamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SV Adler Dellbrück//U9//DE","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VEVENT","UID:adler-"+t.id+"-"+t.datum+"@adler-u9","DTSTAMP:"+dtStamp,
    "DTSTART:"+icsLocalStart(t.datum,time),"DTEND:"+icsLocalPlus(t.datum,time,90),
    "SUMMARY:"+icsEscape((m.label||"Termin")+": "+(t.titel||m.label||""))];
  if(t.ort)lines.push("LOCATION:"+icsEscape(t.ort));
  lines.push("END:VEVENT","END:VCALENDAR");
  const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adler-termin.ics";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast("Kalenderdatei erstellt ✓");
}
// Offene RSVPs auf einen Blick + WhatsApp-Sammelerinnerung (nur die Nachricht wird vorbefüllt).
async function rsvpOverviewOpen(terminId){
  let t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(terminId));
  if(!t){ try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${terminId}&select=*&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0];}catch(e){} } // von der Startseite: Termin nachladen
  t=t||{};
  const m=TM_META[t.typ]||TM_META.training;
  let rm=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&select=spieler_id,status`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rm=await r.json();}catch(e){}
  const byId={}; rm.forEach(x=>byId[x.spieler_id]=x.status);
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const groups={offen:[],zugesagt:[],abgesagt:[],krank:[]};
  kids.forEach(k=>{const s=byId[k.id]||"offen"; (groups[s]||groups.offen).push(k.name);});
  const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const datumStr=wtag+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const zeitStr=t.uhrzeit?String(t.uhrzeit).slice(0,5):"";
  const deepLink=appRoot()+"?portal&rsvp="+terminId;
  const waText=`🦅 SV Adler U9 – bitte kurz rückmelden fürs nächste ${m.label}:\n${t.titel||m.label} am ${datumStr}${zeitStr?" um "+zeitStr+" Uhr":""}\nNoch offen: ${groups.offen.length} Kind(er)\n👉 Zu-/absagen: ${deepLink}`;
  document.getElementById("rsvp-ov-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="rsvp-ov-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Rückmeldungen");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.style.zIndex=zOben(10000);  // ueber einen evtl. schon offenen Dialog legen
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const sec=(title,arr,col,emo)=>arr.length?`<div style="margin-top:8px"><div style="font-size:11px;font-weight:800;color:${col}">${emo} ${title} (${arr.length})</div><div style="font-size:12px;color:var(--text2);line-height:1.5">${arr.map(esc).join(", ")}</div></div>`:"";
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("rsvp-ov-modal","📋","Rückmeldungen",`${m.icon} ${esc(t.titel||m.label)} · ${datumStr}${zeitStr?" · "+zeitStr:""}`,"#d97706")}
    <div style="font-size:13px;font-weight:800;color:${groups.offen.length?"#b45309":"#16a34a"}">${groups.offen.length?groups.offen.length+" noch offen":"Alle haben geantwortet 🎉"}</div>
    ${sec("Offen",groups.offen,"#b45309","❓")}
    ${sec("Zusagen",groups.zugesagt,"#059669","👍")}
    ${sec("Absagen",groups.abgesagt,"#dc2626","👎")}
    ${sec("Krank",groups.krank,"#d97706","🤒")}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      ${groups.offen.length?`<a class="btn btn-p btn-sm" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>`:""}
      ${groups.offen.length?`<button class="btn btn-sm" onclick="rsvpPushErinnern(${terminId},'${(t.titel||m.label).replace(/'/g,'')}','${datumStr}${zeitStr?' '+zeitStr+' Uhr':''}')"><i class="ti ti-bell"></i>Als Push</button>`:""}
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('rsvp-ov-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
}
// Push-Erinnerung an die (subscribten) Eltern – gleicher Deep-Link wie die WhatsApp-Erinnerung.
async function rsvpPushErinnern(terminId, titel, wann){
  const url=appRoot()+"?portal&rsvp="+terminId;
  await pushSendToParents("🦅 Bitte kurz rückmelden", `${titel} · ${wann} – bitte zu- oder absagen.`, url);
}
/* Platz-Ampel: drei Fat-Finger-Buttons je Termin. Setzt termine.platz_status live;
   die Eltern sehen den Status oben im Dashboard. Optionaler kurzer Zusatz (z. B.
   "Halle 2" beim Ausweichplatz oder der Grund bei Absage). */
const PLATZ_AMPEL={
  normal:  {emo:"🟢", lbl:"Findet statt", col:"#16a34a"},
  ausweich:{emo:"🟡", lbl:"Ausweichplatz", col:"#d97706", hidden:true}, // aktuell ausgeblendet (hidden:false = wieder da)
  abgesagt:{emo:"🔴", lbl:"Fällt aus",     col:"#dc2626"}
};
function platzAmpelTrainer(t,nackt){
  const cur=t.platz_status||null;
  const btns=Object.keys(PLATZ_AMPEL).filter(k=>!PLATZ_AMPEL[k].hidden).map(k=>{
    const a=PLATZ_AMPEL[k], on=cur===k;
    return `<button onclick="platzAmpelSet(${Number(t.id)},'${k}')" style="flex:1;min-width:96px;min-height:46px;border:2px solid ${a.col};border-radius:10px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:800;background:${on?a.col:"var(--surface)"};color:${on?"#fff":a.col}">${a.emo} ${a.lbl}</button>`;
  }).join("");
  const zusatz=cur?`<input id="pa-note-${t.id}" value="${esc(t.platz_status_note||"")}" placeholder="${cur==="ausweich"?"Wohin? z. B. Halle 2":cur==="abgesagt"?"Grund (optional)":"Hinweis (optional)"}" onchange="platzAmpelNote(${Number(t.id)},this.value)" style="width:100%;min-height:40px;margin-top:6px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:12px;background:var(--surface2);color:var(--text);box-sizing:border-box">`:"";
  /* v491: Im Termin-Fenster steht die Überschrift schon am Klappdeckel – dort nur die Knöpfe. */
  if(nackt)return `<div style="display:flex;gap:6px;flex-wrap:wrap">${btns}</div>${zusatz}`;
  return `<div style="margin:8px 0;padding:8px;background:var(--surface2);border-radius:10px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3);margin-bottom:5px">📣 Platz-Status für die Eltern</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${btns}</div>${zusatz}
  </div>`;
}
async function platzAmpelSet(id,status){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),
      body:JSON.stringify({platz_status:status,platz_status_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht setzen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(t){t.platz_status=status;t.platz_status_at=new Date().toISOString();}
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  toast(`Eltern sehen jetzt: ${PLATZ_AMPEL[status].emo} ${PLATZ_AMPEL[status].lbl}`);
  tmDetailNeu(id);   // offenes Detailfenster mitziehen
  tmLoad();  // Liste neu rendern → aktiver Button + Hinweisfeld
}
async function platzAmpelNote(id,val){
  const note=(val||"").trim()||null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({platz_status_note:note})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(t)t.platz_status_note=note;
  toast("Hinweis gespeichert ✓");
}
/* „Mehr" auf-/zuklappen. Die Karte wird woanders per outerHTML ersetzt (Trainer-Chips,
   Ergebnis) – der Zustand ueberlebt das bewusst NICHT: nach einem Neuaufbau ist wieder
   alles zu, und das ist richtig, weil die Karte dann auch wieder von vorn gelesen wird. */
function tmMehrToggle(id){
  const box=document.getElementById("tm-mehr-"+id), btn=document.getElementById("tm-mehr-btn-"+id);
  if(!box)return;
  const offen=box.style.display==="none";
  box.style.display=offen?"grid":"none";
  if(btn)btn.setAttribute("aria-expanded",offen?"true":"false");
}
function tmCard(t){
  const m=TM_META[t.typ]||TM_META.training;
  const routeAddr=t.ort||(t.heim===true?VEREIN_ADRESSE:""); // F3: Route auch bei Heimspiel ohne Extra-Adresse
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const datumStr=wtag+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const istSpiel=t.typ==="spiel"||t.typ==="turnier";
  const zeitStr=t.uhrzeit?String(t.uhrzeit).slice(0,5):((/Uhrzeit:\s*(\d{1,2}:\d{2})/.exec(t.notiz||"")||[])[1]||"");
  const sfBadge=(istSpiel&&t.spielform)?`<span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:${m.col}22;color:${m.col}">${esc(t.spielform)}</span>`:"";
  const hb=heimLabel(t), hBadge=hb?`<span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:${t.heim?"#dcfce7":"#fef3c7"};color:${t.heim?"#15803d":"#b45309"}">${hb}</span>`:"";
  const notizClean=(t.notiz&&!/^Uhrzeit:/.test(t.notiz))?t.notiz:"";
  /* PO: „Die Kacheln sehen ungeordnet aus und sind teils bunt, teils weiss. Sind alle
     noetig?" – Es waren ELF Knoepfe in einer umbrechenden Reihe, dazu ein rot abgesetzter
     Papierkorb ganz rechts. Sie werden alle gebraucht, aber nicht alle gleich oft; was
     ungeordnet aussieht, ist die fehlende Rangfolge, nicht die Zahl.
     Deshalb STAFFELN statt loeschen: die Hauptaktion des Typs und „Rueckmeldungen" bleiben
     sichtbar, alles Weitere liegt hinter „Mehr" in einem geordneten Zweispalter. Loeschen
     wandert mit hinein – es war als einziger farbig abgesetzte Knopf am rechten Rand
     optisch die auffaelligste Aktion der Karte, obwohl es die seltenste ist. */
  const kommt=t.datum>=new Date().toISOString().slice(0,10);
  const mehr=[];                       // {i:icon, l:label, c:onclick} oder {href:…}
  let haupt="";
  if(t.typ==="training"){
    haupt=`<button class="btn btn-p btn-sm" onclick="tmJump('planung','${t.datum}')"><i class="ti ti-clipboard-list"></i>Plan</button>`;
  }else if(istSpiel){
    /* v486: „Aufstellung" sprang in die alte Aufstellungs-Seite („Bitte Datum waehlen",
       Fenster blieb offen). Seit v477 gehoert der Spieltag nach „Teams festlegen". */
    haupt=`<button class="btn btn-p btn-sm" onclick="tmJump('spieltag','${t.datum}','${t.spielform||''}')"><i class="ti ti-users-group"></i>Teams festlegen</button>`;
    mehr.push({i:"ti-bolt",l:"Auswertung",c:`tmJump('blitz','${t.datum}','${t.spielform||''}')`});
  }else{ // Event (Grillfest & Co.) – keine Trainingsplanung/Aufstellung, sondern die Mitbringliste
    haupt=`<button class="btn btn-p btn-sm" onclick="mitbringTrainerOpen()"><i class="ti ti-basket"></i>Mitbringliste</button>`;
  }
  mehr.push({i:"ti-edit",l:"Bearbeiten",c:`tmEdit(${Number(t.id)})`});
  mehr.push({i:"ti-users",l:"Eltern-Info",c:`mdOpen('${t.datum}','${t.typ}')`});
  // J6: Ansage direkt vom Termin – Text vorbefüllt, Rest tippt der Trainer
  if(kommt)mehr.push({i:"ti-speakerphone",l:"Ansage",c:`ansageVomTermin(${Number(t.id)})`});
  // UX 3: Erinnerung per WhatsApp – der Deep-Link (?portal&rsvp=…) fuehrt Eltern direkt zur
  // Rueckmeldung. Fuellt nur die Nachricht vor; Absenden/Empfaenger waehlt der Trainer selbst.
  if(kommt){
    const deepLink=appRoot()+"?portal&rsvp="+t.id;
    const waText=`🦅 SV Adler U9 – bitte kurz rückmelden fürs nächste ${m.label}:\n${t.titel||m.label} am ${datumStr}${zeitStr?" um "+zeitStr+" Uhr":""}${t.ort?" ("+t.ort+")":""}\n👉 Zu-/absagen: ${deepLink}`;
    mehr.push({i:"ti-bell",l:"Erinnerung",href:`https://wa.me/?text=${encodeURIComponent(waText)}`});
  }
  mehr.push({i:"ti-calendar-plus",l:"Kalender",c:`tmIcsOne(${Number(t.id)})`});
  if(routeAddr)mehr.push({i:"ti-navigation",l:"Route",href:mapsUrl(routeAddr)});
  if(kommt)mehr.push({i:"ti-user-share",l:"Vertretung",c:`handoverOpen(${Number(t.id)})`});
  mehr.push({i:"ti-photo",l:"Fotos",c:`galerieOpen(${Number(t.id)},'${(t.titel||m.label).replace(/'/g,"")}')`});
  const mehrBtn=o=>o.href
    ? `<a class="btn btn-sm" href="${o.href}" target="_blank" rel="noopener noreferrer" style="min-height:44px;justify-content:flex-start;text-decoration:none"><i class="ti ${o.i}"></i>${o.l}</a>`
    : `<button class="btn btn-sm" onclick="${o.c}" style="min-height:44px;justify-content:flex-start"><i class="ti ${o.i}"></i>${o.l}</button>`;
  /* Drei Knoepfe in EINER Zeile, aber in ihrer natuerlichen Breite. Zwei Sackgassen davor:
     margin-left:auto schob „Mehr" an den rechten Rand (beim Spiel brach die Reihe um),
     flex:1 machte alle gleich breit und schnitt dafuer „Rueckmeldungen" ab. Deshalb
     stattdessen das WORT gekuerzt – „Antworten" sagt dasselbe und passt neben
     „Aufstellung" und „Mehr" auf 390 px. flex-wrap bleibt als Notnagel. */
  const actions=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${haupt}
      ${kommt?`<button class="btn btn-sm" onclick="rsvpOverviewOpen(${Number(t.id)})" title="Wer hat schon geantwortet?"><i class="ti ti-list-check"></i>Antworten</button>`:""}
      <button class="btn btn-sm" id="tm-mehr-btn-${t.id}" onclick="tmMehrToggle(${Number(t.id)})" aria-expanded="false" aria-controls="tm-mehr-${t.id}"><i class="ti ti-dots"></i>Mehr</button>
    </div>
    <div id="tm-mehr-${t.id}" style="display:none;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
      ${mehr.map(mehrBtn).join("")}
      <button class="btn btn-sm btn-d" onclick="tmDelete(${Number(t.id)})" style="grid-column:1/-1;min-height:44px;justify-content:center"><i class="ti ti-trash"></i>Termin löschen</button>
    </div>`;
  return `<div id="tm-card-${t.id}" style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);overflow:hidden;margin-bottom:10px;box-shadow:0 1px 3px rgba(15,23,42,.05);scroll-margin-top:60px">
    <div style="display:flex;align-items:center;gap:11px;padding:11px 13px;background:linear-gradient(90deg,${m.col}14,transparent);border-left:4px solid ${m.col}">
      <div style="width:40px;height:40px;flex:none;border-radius:12px;background:${m.col};display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 6px ${m.col}55">${m.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14.5px;font-weight:800;display:flex;align-items:center;gap:6px;flex-wrap:wrap;line-height:1.25">${esc(t.titel||m.label)}${hBadge}${sfBadge}${(typeof ferienBadge==="function")?ferienBadge(t.datum):""}</div>
        <div style="font-size:11.5px;color:var(--text2);margin-top:2px">${datumStr}${zeitStr?" · "+zeitStr+" Uhr":""}</div>
      </div>
    </div>
    <div style="padding:10px 13px 12px">
    ${t.ort?`<div style="font-size:11px;color:var(--text2)"><i class="ti ti-map-pin" style="font-size:11px"></i> ${mapsAnchor(t.ort)}</div>`:""}
    ${t.platz?`<div style="font-size:11px;color:var(--text2)">🏟️ Platz: ${esc(t.platz)}</div>`:""}
    ${t.datum>=new Date().toISOString().slice(0,10)?platzAmpelTrainer(t):""}
    <div id="wx-tm-${t.id}"></div>
    ${(t.heim===true&&(t.typ==="spiel"||t.typ==="turnier")&&t.datum>=new Date().toISOString().slice(0,10))?`<div id="bd-tm-${t.id}" style="font-size:11px;color:var(--text2);margin-top:4px">🍿 Büdchen: lädt …</div>`:""}
    ${(["training","spiel","turnier"].includes(t.typ)&&t.datum<new Date().toISOString().slice(0,10))?`<div id="puls-tm-${t.id}" style="font-size:11.5px;color:var(--text2);margin-top:4px"></div>`:""}
    ${t.datum>=new Date().toISOString().slice(0,10)?`<div id="helfer-tm-${t.id}" style="font-size:11.5px;color:var(--text2);margin-top:4px"></div>`:""}
    ${t.datum>=new Date().toISOString().slice(0,10)?`<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:6px">
      <span style="font-size:10px;color:var(--text3);font-weight:700">Trainer dabei?</span>
      ${trainerstabNamen(t.trainer_status).map(tn=>{const stt=(t.trainer_status||{})[tn];const bg=stt==="ja"?"#16a34a":stt==="unsicher"?"#ca8a04":stt==="nein"?"#dc2626":"var(--surface2)";const col=stt?"#fff":"var(--text2)";const mk=stt==="ja"?" ✓":stt==="unsicher"?" 🤔":stt==="nein"?" ✕":"";return `<button onclick="tmTrainerToggle(${Number(t.id)},'${tn.replace(/'/g,"")}')" title="Tippen wechselt: dabei → unsicher → nicht dabei → offen" style="border:1px solid var(--rand-bedien);border-radius:12px;padding:2px 8px;font-size:10.5px;font-weight:700;background:${bg};color:${col};cursor:pointer;font-family:inherit">${esc(tn)}${mk}</button>`;}).join("")}
    </div>`:""}
    ${notizClean?`<div style="font-size:11px;color:var(--text3)">${esc(notizClean)}</div>`:""}
    ${(istSpiel&&t.datum<=new Date().toISOString().slice(0,10))?`<div style="display:flex;align-items:center;gap:6px;margin:6px 0"><span style="font-size:11px;color:var(--text2)">Ergebnis:</span><input type="text" value="${esc(t.ergebnis||"")}" placeholder="z. B. 3:2" onchange="tmSetResult(${Number(t.id)},this.value)" style="width:90px;padding:5px 8px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-size:12px;font-family:inherit"></div>`:""}
    ${actions}
    </div>
  </div>`;
}
async function tmSetResult(id,val){
  // Ergebnis fuettert das Saison-Cockpit – ein stiller Fehlschlag waere dort eine Luecke.
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({ergebnis:val})});
    if(!r.ok)toast("Ergebnis konnte nicht gespeichert werden","err");
  }catch(e){toast("Kein Netz – Ergebnis bitte gleich nochmal eintragen","err");}
}
/* ═══════════════════════════════════
   F6: VERTRETUNGS-/HANDOVER-PAKET – selbst-enthaltener Read-Only-Link.
   Alle Infos (Zusagen, Trainingsplan, Notiz) stecken im URL-Fragment (#h=…);
   nichts landet auf dem Server oder in Server-Logs. Snapshot, nicht live.
═══════════════════════════════════ */
function handoverEncode(pkt){ try{ return btoa(unescape(encodeURIComponent(JSON.stringify(pkt)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }catch(e){ return ""; } }
function handoverDecode(s){ try{ s=s.replace(/-/g,"+").replace(/_/g,"/"); return JSON.parse(decodeURIComponent(escape(atob(s)))); }catch(e){ return null; } }
async function handoverOpen(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t){toast("Termin nicht gefunden","err");return;}
  const m=TM_META[t.typ]||TM_META.training;
  let byId={};
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${t.id}&select=spieler_id,status`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)(await r.json()).forEach(x=>byId[x.spieler_id]=x.status);}catch(e){}
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const grp={zugesagt:[],offen:[],abgesagt:[],krank:[]};
  kids.forEach(k=>{const s=byId[k.id]||"offen";(grp[s]||grp.offen).push(k.name);});
  let plan=[]; if(t.typ==="training"){ try{ plan=await tpPlanLoad(t.datum); }catch(e){} }
  window._handoverData={t,grp,plan};
  document.getElementById("handover-modal")?.remove();
  const modal=document.createElement("div"); modal.id="handover-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:480px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const datumStr=wtag+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"long"});
  c.innerHTML=`
    ${mdlHead("handover-modal","🧑‍🏫","Vertretungs-Paket",`${m.icon} ${esc(t.titel||m.label)} · ${datumStr}`,"#64748b")}
    <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Erzeugt einen <b>Read-Only-Link</b> für eine Ersatz-Betreuung. Zusagen, ${t.typ==="training"?"Trainingsplan":"Spielinfos"} und deine Notiz stecken direkt im Link – kein Login, nichts wird gespeichert.</div>
    <label for="handover-notiz" style="font-size:12px;font-weight:700">Kurz-Notiz für die Vertretung</label>
    <textarea id="handover-notiz" rows="3" placeholder="z. B. Torwart heute Max · Ball-Beutel im Vereinsheim · Abschluss 4+1 …" style="width:100%;margin-top:4px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
    <div style="font-size:11px;color:var(--text3);margin:6px 0 12px">Zusagen: ${grp.zugesagt.length} · offen: ${grp.offen.length} · ab/krank: ${grp.abgesagt.length+grp.krank.length}${plan.length?` · Plan: ${plan.length} Stationen`:""}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="handoverGen('open')"><i class="ti ti-external-link"></i>Vorschau</button>
      <button class="btn btn-sm" onclick="handoverGen('copy')"><i class="ti ti-copy"></i>Link kopieren</button>
      <button class="btn btn-sm" onclick="handoverGen('wa')"><i class="ti ti-brand-whatsapp"></i>WhatsApp</button>
    </div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
function handoverGen(mode){
  const dd=window._handoverData; if(!dd)return;
  const t=dd.t, notiz=(document.getElementById("handover-notiz")?.value||"").slice(0,600);
  const pkt={v:1,typ:t.typ,datum:t.datum,zeit:t.uhrzeit?String(t.uhrzeit).slice(0,5):"",titel:t.titel||"",gegner:t.gegner||"",heim:t.heim,ort:t.ort||"",platz:t.platz||"",spielform:t.spielform||"",
    ja:dd.grp.zugesagt,offen:dd.grp.offen,ab:dd.grp.abgesagt,krank:dd.grp.krank,
    plan:(dd.plan||[]).map(p=>({s:p.slotLabel||"",f:p.formName||"",tr:p.trainer||""})),notiz};
  const link=appRoot()+"?handover#h="+handoverEncode(pkt);
  if(mode==="open"){ window.open(link,"_blank","noopener"); return; }
  if(mode==="wa"){
    const d=new Date(t.datum+"T00:00:00"), ds=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
    const txt=`🦅 SV Adler U9 – Vertretung ${pkt.zeit?pkt.zeit+" Uhr ":""}am ${ds}\nAlle Infos (Zusagen, Plan, Notizen):\n${link}`;
    window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank","noopener"); return;
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(()=>toast("Link kopiert ✓"),()=>toast("Kopieren nicht möglich – Vorschau nutzen","err")); }
  else toast("Kopieren nicht möglich – Vorschau nutzen","err");
}
// Öffentliche Read-Only-Ansicht (?handover, Daten im #-Fragment). Kein Login, kein Server.
function renderHandoverView(){
  const hash=location.hash||"", mm=hash.match(/h=(.+)$/);
  const pkt=mm?handoverDecode(mm[1]):null;
  const root=document.createElement("div");
  root.style.cssText="max-width:520px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9;color:#1a1a2e";
  document.body.appendChild(root);
  if(!pkt){ root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Dieser Vertretungs-Link ist ungültig oder unvollständig.</div>'; return; }
  const META={training:{i:"🏃",l:"Training"},spiel:{i:"⚽",l:"Spiel"},turnier:{i:"🏆",l:"Turnier"},event:{i:"🎉",l:"Event"}};
  const m=META[pkt.typ]||META.training;
  const d=new Date(pkt.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const datumStr=wtag+", "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"});
  const addr=pkt.ort||(pkt.heim===true?"Thurner Kamp 97, 51069 Köln":"");
  const e2=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const list=(title,arr,col)=>arr&&arr.length?`<div style="margin-top:6px;font-size:14px"><b style="color:${col}">${title} (${arr.length}):</b> ${arr.map(e2).join(", ")}</div>`:"";
  const planHtml=(pkt.plan&&pkt.plan.length)?`<div style="background:#fff;border-radius:14px;padding:14px;margin-top:12px">
      <div style="font-weight:800;margin-bottom:6px">📋 Trainingsplan</div>
      ${pkt.plan.map(p=>`<div style="padding:6px 0;border-top:1px solid #f1f5f9;font-size:14px">${p.s?`<span style="color:#64748b">${e2(p.s)}: </span>`:""}<b>${e2(p.f)}</b>${p.tr&&p.tr!=="Alle"?` <span style="font-size:11px;color:#3730a3">(${e2(p.tr)})</span>`:""}</div>`).join("")}
    </div>`:"";
  root.innerHTML=`
    <div style="text-align:center;margin:8px 0 14px">
      <img src="logo.png" style="width:52px;height:52px" alt="">
      <div style="font-size:17px;font-weight:800;color:#1e3a8a;margin-top:6px">🧑‍🏫 Vertretung – ${m.i} ${e2(pkt.titel||m.l)}${pkt.gegner?" · "+e2(pkt.gegner):""}</div>
      <div style="font-size:13px;color:#64748b">${datumStr}${pkt.zeit?" · "+e2(pkt.zeit)+" Uhr":""}</div>
    </div>
    <div style="background:#fff;border-radius:14px;padding:14px">
      <div style="font-weight:800;margin-bottom:4px">📍 Ort</div>
      <div style="font-size:14px">${addr?e2(addr):(pkt.heim===false?"Auswärts – bitte beim Verein erfragen":"—")}${pkt.platz?` · Platz: ${e2(pkt.platz)}`:""}${pkt.spielform?` · ${e2(pkt.spielform)}`:""}</div>
      ${addr?`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;padding:8px 12px;background:#eef2ff;color:#1e3a8a;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">🧭 Route</a>`:""}
    </div>
    <div style="background:#fff;border-radius:14px;padding:14px;margin-top:12px">
      <div style="font-weight:800;margin-bottom:2px">✅ Rückmeldungen</div>
      ${list("Dabei",pkt.ja,"#15803d")||'<div style="color:#94a3b8;font-size:13px">Noch keine Zusagen erfasst.</div>'}
      ${list("Offen",pkt.offen,"#b45309")}
      ${list("Abgesagt",pkt.ab,"#dc2626")}
      ${list("Krank",pkt.krank,"#d97706")}
    </div>
    ${planHtml}
    ${pkt.notiz?`<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:14px;padding:14px;margin-top:12px"><div style="font-weight:800;color:#854d0e;margin-bottom:4px">📝 Notiz vom Trainer</div><div style="font-size:14px;white-space:pre-wrap;color:#713f12">${e2(pkt.notiz)}</div></div>`:""}
    <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">Snapshot – Stand beim Erstellen des Links · SV Adler Dellbrück e.V.</div>`;
}
async function tmDelete(id){
  // HOTFIX 3: Löschen räumt via ON DELETE CASCADE automatisch Anwesenheit, Live-Aktionen,
  // Rückmeldungen und Event-Fotos dieses Termins mit weg (Server-seitig). XP-Ledger bleibt.
  if(!confirm("Termin wirklich löschen?\n\nAlle zugehörigen Anwesenheiten, Live-Aktionen, Rückmeldungen und Event-Fotos werden mitgelöscht. (Gesammelte Adler-"+XP_LABEL+" bleiben erhalten.)"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;terminIdCacheClear();tmLoad();}catch(e){toast("Netzwerkfehler","err");}
}
// Kommenden/vergangenen Termin bearbeiten (Datum, Uhrzeit, Gegner/Titel, Ort, Platz, Spielform).
function tmEdit(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t){toast("Termin nicht gefunden","err");return;}
  const isSpiel=(t.typ==="spiel"||t.typ==="turnier"), isTraining=t.typ==="training";
  document.getElementById("tm-edit-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="tm-edit-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Termin bearbeiten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.style.zIndex=zOben(10001);  // ueber einen evtl. schon offenen Dialog legen
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const PLATZ=isSpiel?PLATZ_SPIEL:PLATZ_TRAINING;
  const platzCur=t.platz||(isSpiel?tmPlatzDefault(t.typ):""); // Spiele ohne Eintrag: sinnvolle Vorbelegung
  const platzOpts=`<option value=""${!platzCur?" selected":""}>– kein Platz –</option>`+PLATZ.map(p=>`<option${p===platzCur?" selected":""}>${p}</option>`).join("");
  const sfOpts=["funino","3+1","4+1","5+1"].map(s=>`<option${s===t.spielform?" selected":""}>${s}</option>`).join("");
  // Spieldauer war im Bearbeiten-Dialog gar nicht vorhanden: einmal angelegt, nie änderbar.
  const hz=Number(t.halbzeiten)||1, dauer=Number(t.spieldauer_min)||10;
  const hzOpts=[[1,"1 Spielzeit"],[2,"2 Halbzeiten"]].map(([v,l])=>`<option value="${v}"${v===hz?" selected":""}>${l}</option>`).join("");
  const dauerOpts=[8,10,12,15,20,25,30].map(v=>`<option value="${v}"${v===dauer?" selected":""}>${v} Min.</option>`).join("");
  const m=TM_META[t.typ]||{icon:"📅",label:t.typ};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:440px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("tm-edit-modal","✏️",`${m.icon} Termin bearbeiten`,"","#475569")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label style="font-size:11px;color:var(--text2)">Datum<input type="date" id="te-datum" value="${t.datum}" style="${fld}" onchange="ferienDatumHint(this,'te-ferien-hint')"></label>
      <label style="font-size:11px;color:var(--text2)">Uhrzeit<input type="time" id="te-zeit" value="${t.uhrzeit?String(t.uhrzeit).slice(0,5):''}" style="${fld}"></label>
      ${!isTraining?`<label style="font-size:11px;color:var(--text2)">Treffen<input type="time" id="te-treff" value="${t.treffzeit?String(t.treffzeit).slice(0,5):''}" style="${fld}"></label>`:''}
    </div>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Ende${isSpiel?" (Pflicht – danach wandert der Termin ins Archiv)":" (optional)"}<input type="time" id="te-ende" value="${t.uhrzeit_ende?String(t.uhrzeit_ende).slice(0,5):''}" style="${fld}"></label>
    <div id="te-ferien-hint"></div>
    ${!isTraining?`<label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Gegner / Titel<input id="te-titel" value="${esc(t.titel||'')}" style="${fld}"></label>`:''}
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Ort / Adresse<input id="te-ort" value="${esc(t.ort||'')}" style="${fld}"></label>
    ${(isTraining||isSpiel)?`<label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">${isSpiel?"Spielfeld-Aufteilung":"Platz"}<select id="te-platz" style="${fld}">${platzOpts}</select></label>`:''}
    ${isSpiel?`<label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Spielform<select id="te-sf" style="${fld}">${sfOpts}</select></label>`:''}
    ${isSpiel?`<div style="margin-top:8px"><div style="font-size:11px;color:var(--text2);margin-bottom:3px">Spieldauer</div>
      <div style="display:flex;gap:6px">
        <select id="te-hz" style="${fld}">${hzOpts}</select>
        <select id="te-dauer" style="${fld}">${dauerOpts}</select>
      </div></div>`:''}
    <div style="border-top:var(--border-s);margin-top:12px;padding-top:10px">
      <div style="font-size:11px;color:var(--text2);font-weight:700;margin-bottom:6px">Wer hilft</div>
      ${isTraining?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label style="font-size:11px;color:var(--text2)">Funino-Tore<input type="number" id="te-funino" min="0" max="40" step="1" inputmode="numeric" placeholder="Anzahl" value="${t.helfer_funino==null?"":Number(t.helfer_funino)}" style="${fld}"></label>
        <label style="font-size:11px;color:var(--text2)">Jugendtore<input type="number" id="te-jugendtore" min="0" max="40" step="1" inputmode="numeric" placeholder="Anzahl" value="${t.helfer_jugendtore==null?"":Number(t.helfer_jugendtore)}" style="${fld}"></label>
      </div>
      <div style="font-size:10.5px;color:var(--text2);margin-top:4px">Leer = Aufgabe ohne Zahl · <b>0</b> = wird nicht gebraucht</div>`:''}
      <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Hinweis für Helfer<input id="te-helfer-hinweis" maxlength="140" placeholder="z. B. was heute anders ist als sonst" value="${esc(t.helfer_hinweis||'')}" style="${fld}"></label>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p btn-sm" onclick="tmEditSave(${Number(t.id)})"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('tm-edit-modal').remove()">Abbrechen</button>
    </div>`;
  modal.appendChild(c);document.body.appendChild(modal);
  // I-B: liegt der Termin schon jetzt in den Ferien? Hinweis direkt beim Öffnen zeigen
  if(typeof ferienDatumHint==="function")ferienDatumHint(document.getElementById("te-datum"),"te-ferien-hint");
}
async function tmEditSave(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id))||{};
  const isSpiel=(t.typ==="spiel"||t.typ==="turnier");
  const g=i=>document.getElementById(i);
  const datum=g("te-datum")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  if(isSpiel&&!(g("te-ende")?.value)){toast("Bitte eine Endzeit eintragen – danach wandert der Termin ins Archiv","err");return;}
  // treffzeit: beim Training gibt es das Feld nicht mehr, dann wird eine alte Treffzeit
  // bewusst geleert – sonst zeigen die Eltern-Karten weiter eine Zeit, die niemand pflegen kann.
  const body={datum, uhrzeit:(g("te-zeit")?.value||"")||null, uhrzeit_ende:(g("te-ende")?.value||"")||null, ort:(g("te-ort")?.value||"").trim()||null, treffzeit:(g("te-treff")?.value||"")||null};
  if(g("te-titel")){const tt=(g("te-titel").value||"").trim()||null; body.titel=tt; body.gegner=isSpiel?tt:null;}
  if(g("te-platz"))body.platz=(g("te-platz").value||"").trim()||null;
  if(g("te-sf"))body.spielform=g("te-sf").value||null;
  if(g("te-dauer"))body.spieldauer_min=parseInt(g("te-dauer").value)||10;
  if(g("te-hz"))body.halbzeiten=parseInt(g("te-hz").value)||2;
  /* Torzahlen: leer bleibt null (Aufgabe ohne Zahl), eine ausdrueckliche 0 bleibt 0
     (Aufgabe entfaellt). `parseInt(v)||null` haette die 0 zu null gemacht. */
  const teZahl=id=>{const v=(g(id)?.value||"").trim(); if(v==="")return null; const n=parseInt(v,10); return isNaN(n)?null:Math.max(0,Math.min(40,n));};
  if(g("te-funino"))body.helfer_funino=teZahl("te-funino");
  if(g("te-jugendtore"))body.helfer_jugendtore=teZahl("te-jugendtore");
  if(g("te-helfer-hinweis"))body.helfer_hinweis=(g("te-helfer-hinweis").value||"").trim()||null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok){
      /* Der Termin ist die Quelle – die Eltern-Abschrift (matchday) sofort nachziehen,
         sonst zeigt der Eltern-Link nach einer Ortsänderung noch den alten Platz. */
      if(typeof tmMatchdaySync==="function")tmMatchdaySync(Object.assign({},t,body));
      toast("Termin aktualisiert ✓");terminIdCacheClear();document.getElementById("tm-edit-modal")?.remove();tmLoad();}
    else toast("Speichern fehlgeschlagen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
// Trainer-Verfügbarkeit am Termin togglen: neutral → dabei (ja) → nicht (nein) → neutral.
async function tmTrainerToggle(id,name){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t)return;
  const st=Object.assign({},t.trainer_status||{});
  // Zyklus: (offen) → ja → unsicher → nein → (offen)
  st[name]= st[name]==="ja"?"unsicher":st[name]==="unsicher"?"nein":st[name]==="nein"?undefined:"ja";
  if(st[name]===undefined)delete st[name];
  t.trainer_status=st;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({trainer_status:st})});if(sbCheck401(r))return;}catch(e){}
  tmDetailNeu(id);   // offenes Detailfenster mitziehen – tmLoad() zeichnet nur die Liste
  tmLoad();
}
// Schnell-Sprung von einem Termin zum passenden Werkzeug, Datum vorbelegt.
// Spielform des Termins wird an Taktikboard + Rotation durchgereicht (Kopplung Schritt 5).
function tmJump(ziel,datum,spielform){
  document.getElementById("tmd-modal")?.remove();   // v486: das Terminfenster schliesst beim Sprung
  if(spielform&&typeof FORMATIONS!=="undefined"&&FORMATIONS[spielform]){
    if(typeof taktikSetFormation==="function")taktikSetFormation(spielform);
    else tbFormation=spielform;
  }
  if(ziel==="planung"){
    switchTrainSub("planung");
    // tp-date ist ein Termin-Dropdown; das Ziel-Datum als Option sicherstellen (nach dem async Fill).
    /* v475: das Datum allein reichte nicht – Trainer-Chips, Quelle, Prognose und der
       gespeicherte Plan blieben vom vorherigen Tag. tpVorplanJump laedt den ganzen Tag. */
    const setD=()=>{ if(typeof tpVorplanJump==="function")tpVorplanJump(datum); else if(typeof terminSelectEnsure==="function")terminSelectEnsure("tp-date",datum); else {const d=document.getElementById("tp-date");if(d)d.value=datum;} };
    setTimeout(setD,120); setTimeout(()=>{setD();toast("Plan für "+datum);},450);
  }else if(ziel==="anwesenheit"){
    /* v473: Die haeufigste Handlung des Trainingstags lag drei Ebenen tief (Home →
       Kachel → Menue → Seite) – der Plan hatte einen Sprungknopf, die Anwesenheit nicht. */
    switchTrainSub("anwesenheit");
    const setD=()=>{ if(typeof terminSelectEnsure==="function")terminSelectEnsure("aw-date",datum); else {const d=document.getElementById("aw-date");if(d)d.value=datum;} if(typeof awLoad==="function")awLoad(); };
    setTimeout(setD,120); setTimeout(setD,450);
  }else if(ziel==="aufstellung"){
    sv("kombi");
    setTimeout(()=>{const d=document.getElementById("lineup-date");if(d)d.value=datum;kombiLoadLineup();},400);
  }else if(ziel==="spieltag"){
    /* v476: nur die Spieltag-Seite mit diesem Datum – ohne aufgeklapptes Blitz-Rating.
       Von der Anwesenheit eines Spiel- oder Turniertags aus. */
    switchTrainSub("spieltag");
    setTimeout(()=>{ spieltagTeam=1; spieltagDatesLoad(datum); toast("Spieltag "+datum); },120);
  }else if(ziel==="blitz"){
    switchTrainSub("spieltag");
    setTimeout(()=>{
      spieltagTeam=1; // Sprung vom Termin: Standard-Team; Multi-Team wird am Spieltag selbst gewählt
      // Das Blitz-Rating liegt IN der Team-Kachel – ohne offene Kachel bliebe es unsichtbar.
      if(typeof TEAM_KARTE_OFFEN!=="undefined")TEAM_KARTE_OFFEN=1;
      spieltagDatesLoad(datum);toast("Spieltag "+datum);
      const ph=document.getElementById("mt-phase-nach"); if(ph)ph.open=true; // Phase „Nach dem Spiel" aufklappen
      setTimeout(()=>document.getElementById("blitz-panel")?.scrollIntoView({behavior:"smooth",block:"start"}),200);
    },120);
  }
}

// Multi-Team-Funino: bei Festivals stellt Adler 2–3 Teams. Da die Spiele NICHT
// zeitgleich laufen, wählt der Trainer das gerade aktive Team. Der Team-Index wird in
// den Supabase-Schlüssel kodiert (Team 1 = reines Datum -> abwärtskompatibel,
// Team 2/3 = "DATE__t2"/"__t3"). So sind Nominierung, Match-Uhr, Rotations-Timer,
// Action-Tracker und Liveticker sauber pro Team getrennt; der Delegate-Link ist über
// das team-eigene matchday-Token automatisch team-spezifisch.
let spieltagTeam=1;
function spieltagRawDate(){ return document.getElementById("spieltag-date")?.value||new Date().toISOString().slice(0,10); }
function spieltagKey(){ const d=spieltagRawDate(); return spieltagTeam>1?`${d}__t${spieltagTeam}`:d; }
// HOTFIX 9: Team aus einem Ticker-/Match-Key ableiten (Datum__t2 -> " · Adler 2"); Team 1 = leer.
function teamLabelFromKey(key){ const m=/__t(\d+)$/.exec(String(key||"")); return m?` · Adler ${m[1]}`:""; }
function spieltagSetTeam(n,btn){
  const t=parseInt(n)||1;
  if(t===spieltagTeam)return;
  spieltagTeam=t;
  if(typeof teamFormAnwenden==="function")teamFormAnwenden(t);   // v479: Rotation, Uhr, Aufstellung lesen die Spielform DIESES Teams
  if(btn){btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}
  // Laufende Uhren stoppen, damit der Team-Wechsel nicht die Uhr des anderen Teams weiterlaufen lässt.
  if(typeof rotStop==="function")rotStop();
  clearInterval(mcTickId);mcTickId=null;
  nomLoad(); // kaskadiert zu Nominierung + mcLoad + Rotation + Action-Tracker + Ticker mit dem neuen Key
}

// Turnier-Modus: mehrere Kurzspiele je Turniertag schnell erfassen (Ergebnis-Log + Bilanz).
// Einsatzzeiten laufen über den Rotations-Timer am selben Datum ohnehin kumulativ weiter.
async function turnierOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("turnier-modal")?.remove();
  const modal=document.createElement("div");modal.id="turnier-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Turnier-Modus");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const p=(spieltagRawDate()||"").split("-"); const ds=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:spieltagRawDate();
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("turnier-modal","🏆","Turnier-Modus",`${esc(ds)}${spieltagTeam>1?" · Adler "+spieltagTeam:""} · Kurzspiele erfassen`,"#d97706")}
    <div id="turnier-tally" style="margin-bottom:10px"></div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:4px 0 6px">📅 Spielplan</div>
    <div id="turnier-plan" style="margin-bottom:14px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:4px 0 6px">⚽ Gespielte Spiele</div>
    <div id="turnier-list" style="margin-bottom:12px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Spontanes Spiel ohne Plan eintragen:</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <input id="turnier-gegner" type="text" placeholder="Gegner" style="flex:1;min-width:110px;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)">
      <input id="turnier-tore" type="number" min="0" value="0" title="eigene Tore" style="width:52px;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);text-align:center">
      <span style="font-weight:800">:</span>
      <input id="turnier-geg" type="number" min="0" value="0" title="Gegentore" style="width:52px;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);text-align:center">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
      <button class="btn btn-p" onclick="turnierAdd()"><i class="ti ti-plus"></i>Spiel eintragen</button>
      <button class="btn btn-sm" onclick="document.getElementById('turnier-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
  await Promise.all([turnierPlanLoad(),turnierTerminLoad()]);
  turnierRender();
}
async function turnierRender(){
  const list=document.getElementById("turnier-list"), tally=document.getElementById("turnier-tally");
  if(!list)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/turnier_spiele?datum=eq.${encodeURIComponent(spieltagKey())}&select=*&order=created_at.asc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  turnierPlanRender(rows);
  if(!rows.length){list.innerHTML='<div style="color:var(--text3);font-size:12.5px;padding:6px 0">Noch kein Spiel gespielt. 🏆</div>';if(tally)tally.innerHTML="";return;}
  let s=0,u=0,n=0,tf=0,ga=0;
  rows.forEach(x=>{tf+=x.tore;ga+=x.gegentore;if(x.tore>x.gegentore)s++;else if(x.tore===x.gegentore)u++;else n++;});
  if(tally)tally.innerHTML=`<div class="card" style="padding:10px 12px;display:flex;gap:8px;justify-content:space-around;text-align:center">
    <div><div style="font-size:18px;font-weight:800;color:#15803d">${s}</div><div style="font-size:9px;color:var(--text2)">Siege</div></div>
    <div><div style="font-size:18px;font-weight:800;color:#a16207">${u}</div><div style="font-size:9px;color:var(--text2)">Unent.</div></div>
    <div><div style="font-size:18px;font-weight:800;color:#dc2626">${n}</div><div style="font-size:9px;color:var(--text2)">Niederl.</div></div>
    <div><div style="font-size:18px;font-weight:800;color:var(--text)">${tf}:${ga}</div><div style="font-size:9px;color:var(--text2)">Tore</div></div>
  </div>`;
  list.innerHTML=rows.map((x,i)=>{const w=x.tore>x.gegentore?"#15803d":x.tore===x.gegentore?"#a16207":"#dc2626";
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--surface2)">
      <span style="font-size:10px;color:var(--text3);width:18px">${i+1}.</span>
      <span style="flex:1;font-size:13px">${x.gegner?esc(x.gegner):"Gegner "+(i+1)}</span>
      <span style="font-weight:800;color:${w}">${x.tore}:${x.gegentore}</span>
      <button onclick="turnierDelete(${x.id})" title="löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;font-size:13px;padding:2px 4px"><i class="ti ti-trash"></i></button>
    </div>`;}).join("");
}
