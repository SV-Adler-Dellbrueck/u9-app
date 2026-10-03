/* ═══════════════════════════════════
   ELTERN-LIVETICKER (Phase 4) – Trainer-Seite.
   Speist sich aus dem Live-Action-Tracker (atTap): NUR positive Aktionen lösen
   einen Ticker-Push aus (Pädagogik-Filter). Torwart-Fehler/Ballverlust werden
   nie gepusht. Zusätzlich: Tor/Gegentor-Buttons + Wolff-Fuss-Toggle + Delegate-Link.
═══════════════════════════════════ */
const TICKER_POSITIVE_KEYS=["pass","dribbling","gewinn","parade","aufbau","heraus"]; // verlust/fehler bewusst NICHT enthalten
const TICKER_PHRASES={
  pass:["{name} mit einem Zuckerpass!","{name} findet den freien Mann – starkes Auge!","Sauberer Pass von {name}!"],
  dribbling:["{name} tanzt durch die Abwehr!","{name} zeigt eine starke Dribbling-Einlage!","Mutiges 1-gegen-1 von {name}!"],
  gewinn:["{name} erobert den Ball zurück!","Ballgewinn durch {name} – stark gemacht!"],
  parade:["Riesenparade von {name}!","{name} hält den Kasten sauber!","Klasse Reflex von {name}!"],
  aufbau:["{name} eröffnet das Spiel von hinten!","Sauberer Aufbau durch {name}!"],
  heraus:["{name} klärt mutig vor dem Tor!","{name} behält die Nerven im Zweikampf!"],
  tor:["TOOOR für die Adler durch {name}!","{name} trifft ins Schwarze!","Was für ein Tor von {name}!"],
  aktion:["{name} war richtig aktiv!","Starke Szene von {name}!","{name} zeigt vollen Einsatz!"],
  gegentor:["Adler kämpfen weiter!","Kopf hoch, Team – weiter geht's!","Nächster Angriff, Adler!"],
  kapitaen:["©️ {name} führt die Adler heute als Kapitän aufs Feld!","©️ Heute trägt {name} die Kapitänsbinde – viel Erfolg!","©️ {name} ist heute unser Kapitän!"]
};
/* Der Ticker ist über ?ticker=<datum> OHNE Login lesbar, solange der Trainer ihn offen
   hat. Deshalb wandert nur „Vorname + Initial" in den gespeicherten Text („Vorname S.") –
   dieselbe Linie wie im Stadionheft. Volle Namen stehen weiter im internen Spielbericht. */
function tickerKurzName(name){
  const t=String(name||"").trim(); if(!t)return "";
  const teile=t.split(/\s+/);
  return teile.length>1 ? `${teile[0]} ${teile[teile.length-1].charAt(0).toUpperCase()}.` : teile[0];
}
function tickerPhrase(typ,name){
  const arr=TICKER_PHRASES[typ]||["Die Adler waren aktiv!"];
  const p=arr[Math.floor(Math.random()*arr.length)];
  if(!p.includes("{name}"))return p;
  return p.replace("{name}",tickerKurzName(name)||"Die Adler");
}
async function tickerPush(name,typ){
  if(mcTickerOpen!==true)return; // Ticker nicht gestartet – nichts senden
  // Doppel-Tap-Schutz: gleiches Kind + gleicher Typ innerhalb von 2 s = ein Ereignis
  const _k=(name||"")+"|"+typ, _now=Date.now();
  tickerPush._last=tickerPush._last||{};
  if(tickerPush._last[_k]&&_now-tickerPush._last[_k]<2000)return;
  tickerPush._last[_k]=_now;
  const datum=spieltagKey();
  const minute=mcState?mcMinuteLabel(mcState,mcSpieldauer,mcHalbzeiten):"";
  const text=tickerPhrase(typ,name);
  // Offline-fest: matchday-Upsert (FK-Ziel) zuerst, dann ticker_events – bei Netzausfall
  // landen beide in Reihenfolge in der Sync-Queue und werden bei Netz nachgespielt.
  await sbQueuedPost("matchday?on_conflict=datum",{datum},"resolution=merge-duplicates");
  const runde=(typeof teamRundeJetzt==="function")?teamRundeJetzt():null;   // v504: die Runde ist das Spiel
  await sbQueuedPost("ticker_events",{datum,text,typ,minute,source:"trainer",runde});
  if(typ==="gegentor"&&runde&&typeof teamErgebnisNachziehen==="function")teamErgebnisNachziehen(runde);
  tickerRenderFeed();
}
function tickerToggle(){
  mcTickerOpen=mcTickerOpen!==true;
  mcSave({ticker_open:mcTickerOpen});
  /* Ausschalten heisst NUR: es kommt nichts Neues dazu. Der bisherige Verlauf bleibt
     fuer die Eltern sichtbar (PO v468) – frueher nahm ein Tap hier den ganzen Spieltag
     vom Netz, und genau das haette man am Ende eines Turniertags reflexhaft getan. */
  toast(mcTickerOpen?"Liveticker gestartet – Eltern sehen die Kachel ✓":"Liveticker gestoppt – Bisheriges bleibt sichtbar");
  tickerRenderControls();
}
// Read-only-Ticker-Link fuer alle Eltern (nur ansehen) – team-spezifisch ueber spieltagKey().
async function tickerShareViewLink(){
  const key=spieltagKey();
  try{ await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum:key})}); }catch(e){}
  const url=appRoot()+"?ticker="+encodeURIComponent(key);
  const teamTxt=spieltagTeam>1?` (Adler ${spieltagTeam})`:"";
  const text=`📣 Liveticker U9${teamTxt}:\n${url}`;
  if(navigator.share){navigator.share({title:"Liveticker U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Ansehen-Link kopiert ✓"),()=>prompt("Ansehen-Link:",url));}
}
// Konferenz-Link: EIN Link für alle Teams eines Spieltags (?ticker=<datum>__konf).
async function tickerShareKonfLink(){
  const datum=spieltagRawDate();
  try{ await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum})}); }catch(e){}
  const url=appRoot()+"?ticker="+encodeURIComponent(datum+"__konf");
  const text=`📣 Liveticker U9 · Konferenz (alle Teams):\n${url}`;
  if(navigator.share){navigator.share({title:"Liveticker U9 · Konferenz",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Konferenz-Link kopiert ✓"),()=>prompt("Konferenz-Link:",url));}
}
function tickerGoal(){
  if(!atSel){toast("Erst Spieler oben antippen","err");return;}
  tickerPush(atSel,"tor");
  // Torschütze zusätzlich als Aktion sichern → Datenquelle für Spielbericht (8-G) + Live-Quest (8-F).
  if(typeof atCounts==="object"){ if(!atCounts[atSel])atCounts[atSel]={}; atCounts[atSel].tor=(atCounts[atSel].tor||0)+1; }
  {const _d=spieltagKey(),_s=atSel,_r=(typeof teamRundeJetzt==="function")?teamRundeJetzt():null;
    if(typeof atTorMerken==="function")atTorMerken(_r);
    terminIdForDatum(_d).then(tid=>sbQueuedPost("match_actions",{datum:_d,spieler:_s,aktion:"tor",termin_id:tid,runde:_r}))
      .then(()=>{ if(_r&&typeof teamErgebnisNachziehen==="function")teamErgebnisNachziehen(_r); });} // HOTFIX 3-FE · v504 Runde
  if(typeof atRender==="function")atRender();
  if(typeof questCheck==="function")questCheck();
}
function tickerCounterGoal(){ tickerPush(null,"gegentor"); }
async function tickerShareDelegateLink(){
  if(!mcDelegateToken){
    const datum=spieltagKey();
    try{
      await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum})});
      const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=delegate_token`,{headers:sbAuthHeaders()});
      const rows=r.ok?await r.json():[];
      mcDelegateToken=rows[0]&&rows[0].delegate_token;
    }catch(e){}
  }
  if(!mcDelegateToken){toast("Konnte Helfer-Link nicht erzeugen","err");return;}
  const url=appRoot()+"?delegate="+encodeURIComponent(mcDelegateToken);
  const text=`⚽ Liveticker-Helfer U9:\n${url}`;
  if(navigator.share){navigator.share({title:"Ticker-Helfer",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Helfer-Link kopiert ✓"),()=>prompt("Helfer-Link:",url));}
}
function tickerRenderControls(){
  const box=document.getElementById("ticker-panel");
  if(!box)return;
  const open=mcTickerOpen===true;
  box.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn ${open?"btn-p":""}" onclick="tickerToggle()">${open?"🔴 Ticker läuft – stoppen":"▶️ Liveticker starten"}</button>
      <button class="btn btn-sm" onclick="tickerShareViewLink()"><i class="ti ti-eye"></i>Ansehen-Link</button>
      <button class="btn btn-sm" onclick="tickerShareKonfLink()" title="Ein Link für alle Teams (Konferenz)"><i class="ti ti-users-group"></i>Konferenz-Link</button>
      <span style="font-size:var(--s-klein);color:var(--text2)">${open?"Eltern sehen positive Highlights live.":"Ticker aus: Eltern sehen „heute aus“ mit einem Augenzwinkern – eingetragene Ticker-Helfer starten, sobald du einschaltest."}</span>
    </div>
    ${open?`<!-- v469 – PO: „dass der Trainer waehrend des Spiels keine Zeit hat, den Liveticker
         zu bedienen." Den Helfer-Link gab es schon, aber als kleinen Knopf zwischen zwei
         anderen – er wurde nie gefunden. Jetzt gross und genau in dem Moment, in dem die
         Frage aufkommt: direkt nachdem der Ticker gestartet ist. -->
    <button onclick="tickerShareDelegateLink()" style="width:100%;min-height:52px;margin-bottom:10px;border:1.5px dashed var(--rand-bedien);border-radius:12px;background:var(--surface2);color:var(--text);font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">🙋 Jemand anderen tickern lassen</button>
    <div style="font-size:var(--s-klein);color:var(--text3);margin:-6px 0 10px">Schickt einen Link per WhatsApp oder Mail. Wer ihn öffnet, sieht nur die Kinder von heute und die Aktionsknöpfe – keine Bewertungen, keine Kaderdaten. Er gilt nur, solange der Ticker läuft.</div>`:""}
    <!-- v728: Elternteil direkt in der App freischalten – Mitteilung und Zugang ohne WhatsApp -->
    <button onclick="tickerHelferOeffnen()" class="btn" style="width:100%;min-height:48px;margin-bottom:6px"><i class="ti ti-user-plus"></i>👤 Ticker-Helfer einteilen (je Team eine Person)</button>
    <div id="th-liste" style="margin-bottom:10px"></div>
    <div id="ticker-feed" style="font-size:var(--s-klein);color:var(--text2)"></div>`;
  tickerRenderFeed();
  tickerHelferListe();
}
/* ═══ v728 · Ticker-Helfer aus der Trainer-App freischalten ══════════════════════════════
   PO 03.10.: „den Elternteil direkt aus der Trainer-App benennen … bekommt dann eine Nachricht in der
   Eltern-App und den Zugang zum Ticker“. Kachel: ansehen UND selbst tickern. Die Freischaltung gilt für
   diesen Spieltag und das gewählte Team (ticker_helfer); die Eltern-App holt sich darüber den
   Helfer-Code (RPC mein_ticker_helfer) und zeigt „Ticker bedienen“. Die Mitteilung schickt push-send
   (art „ticker_helfer“, fester Text, nur an dieses Konto). */
function _thTeam(){ return (typeof spieltagTeam!=="undefined"&&spieltagTeam)||1; }
async function tickerHelferListe(){
  const box=document.getElementById("th-liste");   // fehlt er (Panel zu), wird trotzdem die Elternliste geladen
  const datum=spieltagRawDate(), team=_thTeam();
  try{
    const [rh,re]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/ticker_helfer?datum=eq.${datum}&team=eq.${team}&select=email`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/eltern_kinder?select=email,spieler_id,label`,{headers:sbAuthHeaders()})]);
    const helfer=rh.ok?await rh.json():[], ek=re.ok?await re.json():[];
    window._thEltern=ek;
    if(!box)return;
    box.innerHTML=helfer.map(h=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--surface2);font-size:var(--s-text)">
        <span style="flex:1">✅ ${esc(_thName(h.email,ek))} tickert ${team>1?"Adler "+team:"heute"}</span>
        <button onclick="tickerHelferWeg('${jsq(h.email)}')" aria-label="Freischaltung zurücknehmen" title="Freischaltung zurücknehmen" style="border:none;background:transparent;color:#b91c1c;font-size:var(--s-teil);cursor:pointer;min-width:44px;min-height:44px">✕</button></div>`).join("");
  }catch(e){}
}
function _thName(email,ek){
  const e=String(email||"").toLowerCase();
  const z=(ek||[]).filter(x=>String(x.email||"").toLowerCase()===e);
  const kinder=z.map(x=>{ const k=(typeof KADER!=="undefined"?KADER:[]).find(p=>Number(p._id!=null?p._id:p.id)===Number(x.spieler_id)); return k?k.name:null; }).filter(Boolean);
  const label=(z.find(x=>x.label)||{}).label;
  return (label?label+" von ":"Eltern von ")+(kinder.length?kinder.join(" & "):e.replace(/(.).*@/,"$1…@"));
}
/* v728 (PO 03.10.): „Im Laufe der Woche vor dem Spiel kann sich jeder eintragen … und in der Trainer-App kann
   ich dann zuweisen vor dem Spiel.“ Wer sich unter „Wer hilft mit?“ für „📻 Live-Ticker“ gemeldet hat, steht
   oben (früheste Meldung zuerst), darunter alle übrigen Eltern. Das Datum ist das des Spieltags oben – es
   lässt sich also schon vor dem Spiel einteilen. */
async function _thGemeldet(datum){
  try{
    const rt=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${datum}&typ=in.(spiel,turnier)&select=id`,{headers:sbAuthHeaders()});
    const ids=(rt.ok?await rt.json():[]).map(t=>Number(t.id)).filter(Boolean);
    if(!ids.length)return [];
    const re=await fetch(`${SB_URL}/rest/v1/event_helfer?termin_id=in.(${ids.join(",")})&aufgabe=eq.${encodeURIComponent("📻 Live-Ticker")}&select=user_id,created_at&order=created_at.asc`,{headers:sbAuthHeaders()});
    const rows=re.ok?await re.json():[];
    const uids=[...new Set(rows.map(x=>x.user_id).filter(Boolean))];
    if(!uids.length)return [];
    const rp=await fetch(`${SB_URL}/rest/v1/profiles?id=in.(${uids.join(",")})&select=id,email`,{headers:sbAuthHeaders()});
    const pr=rp.ok?await rp.json():[];
    return uids.map(u=>String((pr.find(p=>p.id===u)||{}).email||"").toLowerCase()).filter(Boolean);
  }catch(e){return [];}
}
async function tickerHelferOeffnen(){
  document.getElementById("th-modal")?.remove();
  await tickerHelferListe();
  const ek=window._thEltern||[];
  const gemeldet=await _thGemeldet(spieltagRawDate());
  const mails=[...new Set(ek.map(x=>String(x.email||"").toLowerCase()).filter(Boolean))].filter(m=>!gemeldet.includes(m));
  const zeilen=mails.map(m=>({m,n:_thName(m,ek)})).sort((a,b)=>a.n.localeCompare(b.n,"de"));
  const knopf=z=>`<button onclick="tickerHelferSetzen('${jsq(z.m)}')" class="btn" style="width:100%;min-height:48px;justify-content:flex-start;margin-bottom:6px">${esc(z.n)}</button>`;
  const team=_thTeam();
  const modal=document.createElement("div");
  modal.id="th-modal"; modal.className="modal"; modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-label","Ticker-Helfer einteilen");
  modal.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center";
  modal.innerHTML=`<div style="background:var(--surface);width:100%;max-width:520px;max-height:85vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:var(--s-karte);flex:1">👤 Ticker-Helfer · ${team>1?"Adler "+team:"heute"}</b>
      <button onclick="document.getElementById('th-modal').remove()" aria-label="Schließen" style="border:none;background:transparent;font-size:var(--s-teil);cursor:pointer;min-width:44px;min-height:44px">✕</button></div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:8px">Je Team tickert genau eine Person – wer hier schon steht, wird ersetzt. Das Elternteil bekommt eine Mitteilung und sieht in der Eltern-App „Ticker bedienen“, nur für heute.</div>
    <div id="th-gemeldet" style="font-size:var(--s-text);font-weight:800;margin:4px 0 6px">🙋 Gemeldet für den Ticker</div>
    ${gemeldet.length?gemeldet.map(m=>knopf({m,n:_thName(m,ek)})).join("")
      :'<div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:8px">Noch niemand – Eltern melden sich unter „Wer hilft mit?“, wenn du beim Termin „📻 Live-Ticker“ anhakst.</div>'}
    <div style="font-size:var(--s-text);font-weight:800;margin:10px 0 6px">Weitere Eltern</div>
    ${zeilen.length?zeilen.map(knopf).join(""):'<div style="color:var(--text3)">Keine weiteren Elternkonten.</div>'}
  </div>`;
  modal.addEventListener("click",e=>{ if(e.target===modal)modal.remove(); });
  document.body.appendChild(modal);
}
async function tickerHelferSetzen(email){
  const datum=spieltagRawDate(), team=_thTeam();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ticker_helfer?on_conflict=datum,team`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum,team,email})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Freischalten hat nicht geklappt","err");return;}
    let hinweis="";
    try{ const p=await fetch(`${SB_URL}/functions/v1/push-send`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({art:"ticker_helfer",datum,team,email})});
      const d=await p.json().catch(()=>({})); hinweis=(d&&d.sent)?" · Mitteilung geschickt":" · ohne Push (in der Eltern-App sichtbar)"; }catch(e){}
    toast(`✅ ${_thName(email,window._thEltern)} freigeschaltet${hinweis}`);
  }catch(e){toast("Offline – bitte später nochmal","err");return;}
  document.getElementById("th-modal")?.remove();
  tickerHelferListe();
}
async function tickerHelferWeg(email){
  const datum=spieltagRawDate(), team=_thTeam();
  try{ await fetch(`${SB_URL}/rest/v1/ticker_helfer?datum=eq.${datum}&team=eq.${team}&email=eq.${encodeURIComponent(email)}`,{method:"DELETE",headers:sbAuthHeaders()}); }catch(e){}
  tickerHelferListe();
}
async function tickerRenderFeed(){
  const box=document.getElementById("ticker-feed");
  if(!box)return;
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=id,text,typ,minute,source,runde,created_at&order=created_at.desc&limit=12`,{headers:sbAuthHeaders()});
    if(!r.ok){box.innerHTML="";return;}
    const rows=await r.json();
    const zeile=e=>`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1">${e.minute?`<strong>${esc(e.minute)}</strong> `:""}${esc(e.text)}${e.source==="delegate"?' <span style="opacity:.6">(Eltern-Helfer)</span>':""}</span>
      <button onclick="tickerDelete(${Number(e.id)},'${jsq(e.text||"")}')" title="Ticker-Eintrag löschen" aria-label="Löschen" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-size:var(--s-text);line-height:1;min-width:44px;min-height:44px;margin:-8px 0">✕</button>
    </div>`;
    /* v504: am Festivaltag ein Absatz je Spiel – Runde, Gegner, Feld und Stand als Kopfzeile. */
    const t=(typeof spieltagTeam!=="undefined")?spieltagTeam:1;
    const spiele=(typeof TEAM_PLAN!=="undefined"&&TEAM_PLAN&&TEAM_PLAN.spiele&&TEAM_PLAN.spiele[t])||[];
    const mitRunde=rows.some(e=>e.runde!=null)&&typeof tickerAbsaetze==="function";
    box.innerHTML=!rows.length?'<div style="color:var(--text3)">Noch keine Ticker-Einträge.</div>'
      :!mitRunde?rows.map(zeile).join("")
      :tickerAbsaetze(rows,spiele).map(g=>`<div style="margin-bottom:8px">
          <div style="font-size:var(--s-text);font-weight:800;color:var(--text);padding:4px 0">${g.runde?`Runde ${g.runde}${g.spiel?` · gegen ${esc(g.spiel.gegner)} · ${esc(g.spiel.feldName)}${g.spiel.tore!=null?` · ${g.spiel.tore}:${g.spiel.gegentore}`:""}`:""}`:"Ohne Runde"}</div>
          ${g.events.map(zeile).join("")}</div>`).join("");
  }catch(e){}
}
// Ticker-Eintrag korrigieren = löschen (auch von Eltern-Helfern gesendete); der Eltern-Feed
// zeigt danach beim nächsten Poll den bereinigten Stand.
async function tickerDelete(id,text){
  if(!confirm(`Ticker-Eintrag löschen?

„${text||""}"

Eltern, die gerade mitlesen, sehen ihn dann nicht mehr.`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_events?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  if(typeof teamErgebnisNachziehen==="function")teamErgebnisNachziehen();   // v504: ein gelöschtes Gegentor ändert den Stand
  tickerRenderFeed();
}

