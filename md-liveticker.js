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
  await sbQueuedPost("ticker_events",{datum,text,typ,minute,source:"trainer"});
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
  {const _d=spieltagKey(),_s=atSel; terminIdForDatum(_d).then(tid=>sbQueuedPost("match_actions",{datum:_d,spieler:_s,aktion:"tor",termin_id:tid}));} // HOTFIX 3-FE
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
      <span style="font-size:10.5px;color:var(--text2)">${open?"Eltern sehen positive Highlights live.":"Eltern sehen: „Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.“"}</span>
    </div>
    ${open?`<!-- v469 – PO: „dass der Trainer waehrend des Spiels keine Zeit hat, den Liveticker
         zu bedienen." Den Helfer-Link gab es schon, aber als kleinen Knopf zwischen zwei
         anderen – er wurde nie gefunden. Jetzt gross und genau in dem Moment, in dem die
         Frage aufkommt: direkt nachdem der Ticker gestartet ist. -->
    <button onclick="tickerShareDelegateLink()" style="width:100%;min-height:52px;margin-bottom:10px;border:1.5px dashed var(--rand-bedien);border-radius:12px;background:var(--surface2);color:var(--text);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">🙋 Jemand anderen tickern lassen</button>
    <div style="font-size:10.5px;color:var(--text3);margin:-6px 0 10px">Schickt einen Link per WhatsApp oder Mail. Wer ihn öffnet, sieht nur die Kinder von heute und die Aktionsknöpfe – keine Bewertungen, keine Kaderdaten. Er gilt nur, solange der Ticker läuft.</div>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
      <button class="btn btn-sm" onclick="matchReport()"><i class="ti ti-news"></i>Spielbericht</button>
      <button class="btn btn-sm" onclick="ergebnisKarte()"><i class="ti ti-photo"></i>Ergebnis-Karte</button>
      <span style="font-size:10px;color:var(--text3)">Tore &amp; Gegentore kommen automatisch aus der Live-Aktion.</span>
    </div>
    <div id="ticker-feed" style="font-size:11.5px;color:var(--text2)"></div>`;
  tickerRenderFeed();
}
async function tickerRenderFeed(){
  const box=document.getElementById("ticker-feed");
  if(!box)return;
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=id,text,typ,minute,source,created_at&order=created_at.desc&limit=8`,{headers:sbAuthHeaders()});
    if(!r.ok){box.innerHTML="";return;}
    const rows=await r.json();
    box.innerHTML=rows.length?rows.map(e=>`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1">${e.minute?`<strong>${esc(e.minute)}</strong> `:""}${esc(e.text)}${e.source==="delegate"?' <span style="opacity:.6">(Eltern-Helfer)</span>':""}</span>
      <button onclick="tickerDelete(${Number(e.id)},'${jsq(e.text||"")}')" title="Ticker-Eintrag löschen" aria-label="Löschen" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-size:13px;line-height:1;padding:2px 4px"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="color:var(--text3)">Noch keine Ticker-Einträge.</div>';
  }catch(e){}
}
// Ticker-Eintrag korrigieren = löschen (auch von Eltern-Helfern gesendete); der Eltern-Feed
// zeigt danach beim nächsten Poll den bereinigten Stand.
async function tickerDelete(id,text){
  if(!confirm(`Ticker-Eintrag löschen?

„${text||""}"

Eltern, die gerade mitlesen, sehen ihn dann nicht mehr.`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_events?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  tickerRenderFeed();
}

