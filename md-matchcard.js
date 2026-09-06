/* ═══════════════════════════════════
   ELTERN-MATCHDAY-CARD – öffentlicher Read-Only-Link (?eltern / ?match=datum)
   Bewusst nur Logistik, keine Bewertungsdaten. Läuft ohne Login über den Anon-Key.
═══════════════════════════════════ */
async function renderElternView(datum){
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML=elternLoader("Spieltag wird geladen …");
  try{
    const heute=new Date().toISOString().slice(0,10);
    const url=datum
      ? `${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&published=eq.true&select=*`
      : `${SB_URL}/rest/v1/matchday?datum=gte.${heute}&published=eq.true&select=*&order=datum.asc&limit=1`;
    const r=await fetch(url,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
    const rows=r.ok?await r.json():[];
    if(!rows.length){root.innerHTML=elternEmpty("Aktuell ist kein Spieltag hinterlegt.<br>Schau bald wieder rein!","📅");return;}
    const m=rows[0];
    elternCurrent=m; // für die Interaktions-Funktionen
    const istTraining=m.typ==="training";
    const d=new Date(m.datum+"T00:00:00");
    const wtag=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"][d.getDay()];
    const datumStr=wtag+", "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"long"});
    const row=(icon,label,val)=>val?`<div style="display:flex;gap:10px;padding:11px 0;border-bottom:1px solid #e2e8f0"><span style="font-size:18px">${icon}</span><div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">${label}</div><div style="font-size:14.5px;font-weight:600;color:#1e293b">${esc(val)}</div></div></div>`:"";
    // Route: Google-Maps-Suche nach der Gegner-Adresse (oder dem Gegnernamen)
    const routeQuery=m.gegner_adresse||m.gegner||m.ort||"";
    const routeUrl=routeQuery?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(routeQuery):"";
    // Hub: prominenter Live-Hinweis, wenn die Match-Uhr gerade läuft – der Grund, JETZT reinzuschauen.
    const liveBanner=(!istTraining&&m.clock_status==="running")?`<a href="#ev-ticker" style="display:block;text-decoration:none;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;text-align:center;box-shadow:0 4px 16px rgba(220,38,38,.35)"><div style="font-size:15px;font-weight:800">🔴 Wir spielen gerade LIVE!</div><div style="font-size:12px;opacity:.9;margin-top:2px">Zum Liveticker ↓</div></a>`:"";
    root.innerHTML=`<div class="elt-fade">
      <div style="text-align:center;margin:8px 0 16px">
        <img src="logo.png" style="width:64px;height:64px" alt="SV Adler Dellbrück">
        <div style="font-size:18px;font-weight:800;color:#1e3a8a;margin-top:6px">${istTraining?"Training":"Spieltag"} U9</div>
        <div style="font-size:13px;color:#64748b">${datumStr}</div>
      </div>
      ${liveBanner}
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        ${!istTraining&&m.gegner?`<div style="text-align:center;font-size:19px;font-weight:800;color:#1e293b;margin-bottom:10px">⚽ gegen ${esc(m.gegner)}</div>`:""}
        ${!istTraining&&m.gegner_adresse?row("🏟️","Adresse Gegner",m.gegner_adresse):""}
        ${row("📍","Ort",m.ort)}
        ${row("⏰","Treffpunkt",m.treffpunkt)}
        ${row(istTraining?"🕐":"🔔",istTraining?"Trainingszeit":"Anpfiff",m.anpfiff)}
        ${row("ℹ️","Infos",m.infos)}
        ${routeUrl?`<a href="${routeUrl}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:14px;background:#1e3a8a;color:#fff;padding:13px;border-radius:12px;text-decoration:none;font-weight:600">🗺️ Route ${istTraining?"zum Platz":"zum Gegner"}</a>`:""}
      </div>
      ${istTraining?``:`<div id="ev-ticker" style="margin-top:14px"></div><div id="ev-einsatz" style="margin-top:14px"></div><div id="ev-fahrt" style="margin-top:14px"></div>`}
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin:16px 0 8px;text-align:center">Für Eltern</div>
      <button onclick="elternKalenderIcs()" style="width:100%;margin-bottom:10px;background:#1e3a8a;color:#fff;border:none;padding:14px;border-radius:12px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer">🗓️ Termine in meinen Kalender</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <a href="${appRoot()}?heft" style="text-align:center;background:#fff;border:1.5px solid #1e3a8a;color:#1e3a8a;padding:13px 8px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">📰 Adler Nest</a>
        <a href="${appRoot()}?portal" style="text-align:center;background:#fff;border:1.5px solid #1e3a8a;color:#1e3a8a;padding:13px 8px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">👨‍👩‍👧 Mein Kind</a>
      </div>
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">SV Adler Dellbrück e.V. · Angaben ohne Gewähr</div></div>`;
    /* edLoad/fgLoad lasen aus den Tabellen eltern_dabei bzw. fahrgemeinschaft – die gibt es
       nicht (mehr). Die lebenden Funktionen sind die Betreuung (betreuung/betreuung_board im
       Eltern-Portal) und elternCarpoolOpen (md-carpool.js). Die toten Aufrufe sind raus. */
    if(istTraining){/* Betreuung + Mitfahren laufen ueber das Eltern-Portal */}
    else{
      elTickerLoad(m.datum,m.spieldauer_min||10);
      clearInterval(elTickerTimer);
      elTickerTimer=setInterval(()=>elTickerLoad(m.datum,m.spieldauer_min||10),20000);
      elternEinsatzLoad(m.datum);
    }
  }catch(e){root.innerHTML=elternEmpty("Konnte gerade nicht laden.<br>Bitte später erneut versuchen.","😕");}
}
// Ticker-Ereignis-Icon je Typ – macht den Feed lebendiger & auf einen Blick lesbar.
function elTickerIcon(typ){return {tor:"⚽",gegentor:"🥅",parade:"🧤",aktion:"👏",info:"📣",wechsel:"🔄"}[typ]||"•";}
// Faire Einsatzzeiten für Eltern: transparente Balken je Kind (Vorname + Minuten), aus der
// security-definer-RPC (nur veröffentlichte Spieltage, minimale Daten). U9-Vertrauenssignal.
async function elternEinsatzLoad(datum){
  const box=document.getElementById("ev-einsatz"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/einsatzzeiten_public`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_datum:datum})});if(r.ok)rows=await r.json();}catch(e){}
  if(!Array.isArray(rows)||!rows.length){box.innerHTML="";return;}
  const max=Math.max(...rows.map(x=>x.feld_sek||0),1);
  const bar=(x)=>{const min=Math.round((x.feld_sek||0)/60);const pct=Math.round((x.feld_sek||0)/max*100);
    return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:2px"><span style="font-weight:600;color:#1e293b">${elternEsc(x.spieler)}</span><span style="color:#64748b">${min} Min</span></div><div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#1a56db,#3b82f6)"></div></div></div>`;};
  box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
    <div style="font-weight:700;margin-bottom:3px">⚖️ Faire Einsatzzeiten</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:12px">Jedes Kind soll fair Spielzeit bekommen – hier ganz transparent.</div>
    ${rows.map(bar).join("")}</div>`;
}
// Eltern-Liveticker: pollt alle 20s (kein Realtime-Client nötig, passt zur REST-Architektur).
// Respektiert den Wolff-Fuss-Toggle des Trainers unabhängig vom ticker_events-Inhalt.
let elTickerTimer=null;
async function elTickerLoad(datum,dauer){
  const box=document.getElementById("ev-ticker");
  if(!box)return;
  const wolffFussMsg='<div style="text-align:center;font-size:12.5px;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px">🤫 Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.</div>';
  try{
    const [evRes,mdRes]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=text,typ,minute,created_at&order=created_at.desc&limit=20`,{headers:elternHeaders()}),
      fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=ticker_open`,{headers:elternHeaders()})
    ]);
    const mdRows=mdRes.ok?await mdRes.json():[];
    const rows=evRes.ok?await evRes.json():[];
    // Nichts geschrieben und Ticker nicht gestartet: dann gibt es hier nichts zu zeigen.
    if(!rows.length&&!(mdRows.length&&mdRows[0].ticker_open===true)){
      box.innerHTML=wolffFussMsg;
      clearInterval(elTickerTimer);elTickerTimer=null;
      return;
    }
    box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:8px">📣 Liveticker</div>
      ${rows.length?rows.map(e=>`<div style="display:flex;gap:8px;align-items:baseline;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px"><span style="font-size:15px;flex:0 0 auto">${elTickerIcon(e.typ)}</span><span><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</span></div>`).join(""):'<div style="font-size:12px;color:#94a3b8">Noch keine Ereignisse. Bleib dran!</div>'}
    </div>`;
  }catch(e){}
}

/* Delegate-Modus (?delegate=<token>): Eltern-Helfer am Spielfeldrand uebernimmt den
   Ticker – reduziertes UI (nur Kaderchips + Aktions-Buttons), keine Trainer-Rechte.
   Schreibt ausschliesslich ueber die security-definer-RPC ticker_post() mit dem
   Capability-Token; die Text-Engine (tickerPhrase) laeuft identisch zur Trainer-Seite. */
async function renderDelegateView(token){
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade...</div>';
  let m=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/matchday?delegate_token=eq.${encodeURIComponent(token)}&select=*`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
    const rows=r.ok?await r.json():[];
    m=rows[0]||null;
  }catch(e){}
  // v468: Der Helfer kann nur tickern, wenn der Trainer den Ticker gestartet hat.
  if(!m||m.ticker_open!==true){
    root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Der Liveticker ist gerade nicht aktiv.<br>Frag den Trainer, ob der Link noch gilt.</div>';
    return;
  }
  let selected=null;
  /* v469: Bis hierher stand `KADER.map(...)` – und KADER bleibt im Helfer-Modus LEER,
     weil loadKader() ohne Trainer-Token an der RLS scheitert (steht so im Kommentar dort).
     Der Helfer sah also gar keine Namen; der Link war unbenutzbar. Die Kinder kommen
     jetzt ueber den Schluessel aus der RPC ticker_kader – zwei Bloecke wie beim Trainer,
     dazu die Torhueter, damit „Parade" nur bei ihnen erscheint. */
  let feld=[], weitere=[], twListe=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/ticker_kader`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token})});
    if(r.ok){ const j=await r.json(); if(j){ feld=j.feld||[]; weitere=j.weitere||[]; twListe=j.tw||[]; } }
  }catch(e){}
  const istTW=n=>twListe.includes(n);
  function draw(){
    const dauer=m.spieldauer_min||10;
    const minuteNow=mcMinuteLabel({half:m.half,clock_status:m.clock_status,started_at:m.started_at,paused_ms:m.paused_ms},dauer,m.halbzeiten||2);
    root.innerHTML=`
      <div style="text-align:center;margin:8px 0 16px">
        <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
        <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">Ticker-Helfer${teamLabelFromKey(m.datum)}${m.gegner?` · gegen ${elternEsc(m.gegner)}`:""}</div>
        <div style="font-size:12px;color:#64748b">Spielminute: ${elternEsc(minuteNow)} · Erst Kind, dann Aktion antippen.</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-bottom:12px">
        ${(()=>{ const chip=n=>`<button onclick="dgPick('${n.replace(/'/g,"")}')" style="font-size:12px;padding:7px 10px;border-radius:16px;border:1px solid var(--rand-bedien);background:${selected===n?"#1e3a8a":"#f1f5f9"};color:${selected===n?"#fff":"#1e293b"};cursor:pointer;font-family:inherit">${elternEsc(n)}</button>`;
          if(!feld.length&&!weitere.length)return '<div style="font-size:12.5px;color:#94a3b8;margin-bottom:12px">Für heute ist noch niemand eingetragen – frag kurz beim Trainer nach.</div>';
          return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${weitere.length?"8":"12"}px">${feld.map(chip).join("")}</div>
          ${weitere.length?`${feld.length?'<div style="display:flex;align-items:center;gap:8px;margin:2px 0 8px"><span style="flex:1;border-top:2px dashed #cbd5e1"></span><span style="font-size:10px;font-weight:800;letter-spacing:.5px;color:#94a3b8">AUCH HEUTE DABEI</span><span style="flex:1;border-top:2px dashed #cbd5e1"></span></div>':""}
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${weitere.map(chip).join("")}</div>`:""}`; })()}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button onclick="dgSend('tor')" ${selected?"":"disabled"} style="min-height:52px;border:none;border-radius:12px;background:#15803d;color:#fff;font-weight:700;font-size:13px;cursor:pointer">⚽ Tor!</button>
          <button onclick="dgSend('aktion')" ${selected?"":"disabled"} style="min-height:52px;border:none;border-radius:12px;background:#1a56db;color:#fff;font-weight:700;font-size:13px;cursor:pointer">👏 Starke Aktion</button>
          ${(selected&&istTW(selected))?`<button onclick="dgSend('parade')" style="min-height:52px;border:none;border-radius:12px;background:#854d0e;color:#fff;font-weight:700;font-size:13px;cursor:pointer;grid-column:span 2">🧤 Parade</button>`:""}
        </div>
        <button onclick="dgSend('gegentor')" style="width:100%;margin-top:8px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:12px;background:#f1f5f9;color:#334155;font-size:12.5px;cursor:pointer">Gegentor melden</button>
      </div>
      <div id="dg-status" style="text-align:center;font-size:12px;color:#94a3b8;min-height:16px"></div>
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">Danke fürs Mithelfen! · SV Adler Dellbrück e.V.</div>`;
  }
  window.dgPick=(n)=>{selected=(selected===n)?null:n;draw();};
  window.dgSend=async(typ)=>{
    const name=typ==="gegentor"?null:selected;
    const text=tickerPhrase(typ,name);
    const dauer=m.spieldauer_min||10;
    const minute=mcMinuteLabel({half:m.half,clock_status:m.clock_status,started_at:m.started_at,paused_ms:m.paused_ms},dauer,m.halbzeiten||2);
    const status=document.getElementById("dg-status");
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/ticker_post`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token,p_text:text,p_typ:typ,p_minute:minute})});
      const ok=r.ok?await r.json():false;
      if(status)status.textContent=ok?"✓ Gesendet: "+text:"Konnte nicht gesendet werden (zu schnell hintereinander?)";
    }catch(e){ if(status)status.textContent="Netzwerkfehler."; }
  };
  draw();
}

/* Read-only-Liveticker (?ticker=<key>): fokussierte Nur-Ansehen-Seite fuer alle Eltern,
   pro Team (key = Datum bzw. Datum__t2/__t3). Keine Eingabe, kein Login. Pollt die
   Ereignisse + berechnet die Spielminute live aus dem Uhr-Anker. Respektiert den
   Wolff-Fuss-Toggle (ticker_open=false -> RLS liefert 0 Zeilen + Hinweistext). */
let tickerViewTimer=null, tickerViewMinuteTimer=null, tickerViewClock=null;
async function renderTickerView(key){
  const konf=/__konf$/.test(key);                     // Konferenz: alle Teams eines Spieltags
  const baseDatum=konf?key.replace(/__konf$/,""):key;
  const keys=konf?[baseDatum,baseDatum+"__t2",baseDatum+"__t3"]:[key];
  const anon={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML=elternLoader("Liveticker wird geladen …");
  let adlerkasseHtml=""; // FEAT Z: Spenden-Button, einmal geladen (draw() laeuft alle 15s)
  let clocks={};         // key -> matchday-Zeile
  const teamName=k=>{ const m=/__t(\d+)$/.exec(k); return m?`Adler ${m[1]}`:"Adler 1"; };
  // Sichtbar am Spieltag und die drei Tage danach; ab dem vierten Tag nur noch der Endstand.
  const TICKER_SICHTBAR_TAGE=3;
  function tickerArchiviert(){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(baseDatum))return false;   // unerwarteter Schluessel: lieber zeigen
    const grenze=new Date(Date.now()-TICKER_SICHTBAR_TAGE*864e5).toISOString().slice(0,10);
    return baseDatum<grenze;
  }
  async function loadClocks(){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=in.(${keys.map(encodeURIComponent).join(",")})&select=datum,gegner,half,clock_status,started_at,paused_ms,ticker_open,spieldauer_min,halbzeiten`,{headers:anon});
      const rows=r.ok?await r.json():[];
      clocks={}; rows.forEach(x=>clocks[x.datum]=x);
    }catch(e){}
  }
  function minuteFor(k){
    const c=clocks[k]; if(!c)return "";
    return mcMinuteLabel({half:c.half,clock_status:c.clock_status,started_at:c.started_at,paused_ms:c.paused_ms},c.spieldauer_min||10,c.halbzeiten||1);
  }
  async function draw(){
    let events=[];
    try{
      const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=in.(${keys.map(encodeURIComponent).join(",")})&select=datum,text,typ,minute,created_at&order=created_at.desc&limit=${konf?60:40}`,{headers:anon});
      events=r.ok?await r.json():[];
    }catch(e){}
    /* Bis v467 wurden hier ALLE Zeilen eines Teams ausgeblendet, sobald der Schalter
       gerade aus stand – nicht nur die neuen. Ein Tap auf „Ticker AUS" am Ende eines
       Turniertags nahm damit den ganzen Tag vom Netz und machte die Drei-Tage-Regel
       wirkungslos. Geschrieben wird ohnehin nur, solange der Ticker laeuft; was da ist,
       war also erlaubt und bleibt sichtbar (PO v468). */
    /* 3-Tage-Grenze (PO v467): „für den live ticker nach 3 tagen aber nicht mehr historisch
       sichtbar sein." Geloescht wird nichts – die Zeilen bleiben in der Datenbank und
       fuettern das Adler Nest. Nur der oeffentliche Link macht die Tuer zu: Aufbewahrung
       und Sichtbarkeit sind zwei verschiedene Dinge. Ein weitergeleiteter Link laeuft
       damit nicht ins Leere, sondern auf den Endstand. */
    if(tickerArchiviert()){
      clearInterval(tickerViewTimer); clearInterval(tickerViewMinuteTimer);
      let t=0,g=0; events.forEach(e=>{ if(e.typ==="tor")t++; else if(e.typ==="gegentor")g++; });
      const nix=!events.length;   // an diesem Tag wurde nie getickert – dann kein „0:0" erfinden
      const c0=clocks[key]||clocks[baseDatum]||{};
      const geg=c0.gegner?elternEsc(c0.gegner):"Gegner";
      const dStr=(()=>{ const d=new Date(baseDatum+"T12:00:00");
        return isNaN(d)?baseDatum:d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}); })();
      root.innerHTML=`
        <div style="text-align:center;margin:8px 0 14px">
          <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
          <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">📣 Liveticker U9${konf?" · Konferenz":teamLabelFromKey(key)}</div>
          <div style="font-size:12px;color:#64748b">${dStr}</div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;text-align:center">
          ${nix?'<div style="font-size:12.5px;color:#334155;line-height:1.5">Für diesen Spieltag gab es keinen Liveticker.</div>'
               :`<div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8">Endstand</div>
          <div style="font-size:34px;font-weight:900;color:#1e3a8a;margin:4px 0">${t}:${g}</div>
          <div style="font-size:12.5px;color:#64748b">Adler U9 gegen ${geg}</div>
          <div style="font-size:12.5px;color:#334155;margin-top:14px;line-height:1.5">Der Liveticker dieses Spieltags ist beendet.<br>Die Höhepunkte stehen im Adler Nest.</div>`}
          <a href="${appRoot()}?heft" style="display:inline-block;margin-top:14px;min-height:46px;line-height:46px;padding:0 20px;border-radius:10px;background:#1e3a8a;color:#fff;text-decoration:none;font-weight:800;font-size:14px">📰 Zum Adler Nest</a>
        </div>
        <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">SV Adler Dellbrück e.V.</div>`;
      return;
    }
    // B1: Applaus-Zähler des Spieltags (aggregiert über alle Teams via baseDatum)
    let claps=0; try{const cr=await fetch(`${SB_URL}/rest/v1/ticker_claps?datum=eq.${encodeURIComponent(baseDatum)}&select=count`,{headers:anon});if(cr.ok){const cj=await cr.json();claps=(cj[0]&&cj[0].count)||0;}}catch(e){}
    const clapBar=`<div style="text-align:center;margin-top:16px">
      <button onclick="tvClap()" style="border:none;background:linear-gradient(135deg,#f59e0b,#ec4899);color:#fff;border-radius:16px;padding:14px 22px;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(236,72,153,.35)">👏 Applaus fürs Team</button>
      <div style="font-size:12px;color:#64748b;margin-top:8px"><span id="tv-claps" style="font-weight:800;color:#db2777">${claps}</span> mal geklatscht</div>
    </div>`;
    const foot=`${clapBar}${adlerkasseHtml}<div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">Nur-Ansehen · aktualisiert automatisch · SV Adler Dellbrück e.V.</div>`;

    if(konf){
      const aktive=keys.filter(k=>clocks[k]||events.some(e=>e.datum===k));
      const score=k=>{let t=0,g=0;events.forEach(e=>{if(e.datum!==k)return;if(e.typ==="tor")t++;else if(e.typ==="gegentor")g++;});return t+":"+g;};
      const board=aktive.length?aktive.map(k=>{
        const c=clocks[k], geg=c&&c.gegner?`gegen ${elternEsc(c.gegner)}`:"";
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9">
          <span style="font-weight:800;color:#dc2626;min-width:62px">${teamName(k)}</span>
          <span style="font-size:18px;font-weight:900;color:#1e3a8a">${score(k)}</span>
          <span style="flex:1;font-size:11.5px;color:#64748b;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${geg}</span>
          <span style="font-size:11px;color:#94a3b8">${elternEsc(minuteFor(k))}</span>
        </div>`;}).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Teams aktiv.</div>';
      const feed=events.length?events.map(e=>`<div style="display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px">
          <span style="font-size:16px;flex:0 0 auto">${elTickerIcon(e.typ)}</span>
          <span><span style="font-size:10px;font-weight:800;color:#dc2626;background:#fee2e2;border-radius:8px;padding:1px 6px;margin-right:4px">${teamName(e.datum)}</span><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</span>
        </div>`).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Ereignisse. Die Konferenz startet mit dem Anpfiff!</div>';
      root.innerHTML=`
        <div style="text-align:center;margin:8px 0 14px">
          <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
          <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">📣 Liveticker U9 · Konferenz</div>
          <div style="font-size:12px;color:#64748b">alle Teams in einem Ticker</div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:6px 14px;margin-bottom:10px">${board}</div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">${feed}</div>
        ${foot}`;
      return;
    }
    // Einzelteam (unverändertes Verhalten)
    /* „Kein Ticker heute" gilt nur, solange nichts geschrieben wurde. Steht schon etwas
       da, bleibt der Verlauf – mit einem Hinweis, dass gerade nichts Neues kommt. */
    const c=clocks[key], aus=!(c&&c.ticker_open===true), wolffFuss=aus&&!events.length;
    const gegner=c&&c.gegner?` · gegen ${elternEsc(c.gegner)}`:"";
    root.innerHTML=`
      <div style="text-align:center;margin:8px 0 14px">
        <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
        <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">📣 Liveticker U9${teamLabelFromKey(key)}${gegner}</div>
        <div style="font-size:13px;color:#64748b"><span id="tv-minute">${elternEsc(minuteFor(key))}</span></div>
      </div>
      ${wolffFuss
        ? '<div style="text-align:center;font-size:12.5px;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">🤫 Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.</div>'
        : `${aus?'<div style="text-align:center;font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:9px;margin-bottom:8px">⏸️ Gerade läuft kein Spiel – der Ticker meldet sich wieder.</div>':""}
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
            ${events.length?events.map(e=>`<div style="display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px"><span style="font-size:16px;flex:0 0 auto">${elTickerIcon(e.typ)}</span><span><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</span></div>`).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Ereignisse. Der Ticker startet mit dem Anpfiff – bleib dran!</div>'}
          </div>`}
      ${foot}`;
  }
  // B1: Applaus senden – optimistisch hochzählen + serverseitig via RPC (anon erlaubt).
  window.tvClap=async()=>{
    const el=document.getElementById("tv-claps"); if(el)el.textContent=(parseInt(el.textContent)||0)+1;
    try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/ticker_clap`,{method:"POST",headers:{...anon,'Content-Type':'application/json'},body:JSON.stringify({p_datum:baseDatum})});if(r.ok){const n=await r.json();if(el&&typeof n==="number")el.textContent=n;}}catch(e){}
  };
  await loadClocks();
  adlerkasseHtml=adlerkasseCardHtml(await adlerkasseLinkGet()); // FEAT Z
  await draw();
  // Minute jede Sekunde lokal (nur Einzelteam-Header); Ereignisse+Uhr alle 15s frisch ziehen.
  clearInterval(tickerViewMinuteTimer);
  if(!konf)tickerViewMinuteTimer=setInterval(()=>{const el=document.getElementById("tv-minute");if(el)el.textContent=minuteFor(key);},1000);
  clearInterval(tickerViewTimer);
  tickerViewTimer=setInterval(async()=>{if(document.hidden)return;await loadClocks();await draw();},15000); // Hintergrund-Tab pollt nicht weiter
}

// Eltern-Interaktion (anonym, nur Training): Anwesenheit + Fahrgemeinschaften
let elternCurrent=null;
function elternHeaders(){return {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};}
function elternEsc(s){return (s+'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function edLoad(datum){
  const box=document.getElementById("ev-dabei");if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_dabei?datum=eq.${encodeURIComponent(datum)}&select=*&order=created_at.asc`,{headers:elternHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  const liste=rows.length?rows.map(x=>`<div style="display:flex;align-items:center;gap:6px;font-size:13px;padding:5px 0;border-bottom:1px solid #f1f5f9"><span style="flex:1">${elternEsc(x.kind)}</span>${x.betreuung?'<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:8px">Betreuung bleibt</span>':''}</div>`).join(""):'<div style="font-size:12px;color:#94a3b8">Noch niemand eingetragen.</div>';
  box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
    <div style="font-weight:700;margin-bottom:8px">🙋 Wer ist beim Training dabei? (${rows.length})</div>
    ${liste}
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
      <input type="text" id="ed-kind" placeholder="Name des Kindes" style="padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-size:14px;font-family:inherit">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#334155"><input type="checkbox" id="ed-betreuung"> Ein Elternteil bleibt während des Trainings vor Ort</label>
      <button onclick="edSignup('${datum}')" style="background:#1e3a8a;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit">Eintragen</button>
    </div>
  </div>`;
}
async function edSignup(datum){
  const kind=(document.getElementById("ed-kind")?.value||"").trim();
  if(!kind){alert("Bitte den Namen des Kindes eintragen.");return;}
  const betreuung=!!document.getElementById("ed-betreuung")?.checked;
  try{
    await fetch(`${SB_URL}/rest/v1/eltern_dabei`,{method:"POST",headers:elternHeaders(),body:JSON.stringify({datum,kind,betreuung})});
    edLoad(datum);
  }catch(e){alert("Konnte nicht speichern. Bitte später erneut.");}
}
async function fgLoad(datum){
  const box=document.getElementById("ev-fahrt");if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft?datum=eq.${encodeURIComponent(datum)}&select=*&order=created_at.asc`,{headers:elternHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  const liste=rows.length?rows.map(x=>{
    const mit=Array.isArray(x.mitfahrer)?x.mitfahrer:[];
    const frei=Math.max(0,(x.plaetze||0)-mit.length);
    return `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <div style="font-size:13.5px;font-weight:600">🚗 ${elternEsc(x.fahrer)}${x.abfahrt?` <span style="font-weight:400;color:#64748b">· ab ${elternEsc(x.abfahrt)}</span>`:''}</div>
        <span style="font-size:11px;color:${frei>0?'#15803d':'#dc2626'}">${frei} frei</span>
      </div>
      ${mit.length?`<div style="font-size:11.5px;color:#64748b;margin-top:2px">Mit: ${mit.map(elternEsc).join(", ")}</div>`:''}
      ${frei>0?`<button onclick="fgJoin(${Number(x.id)},'${datum}')" style="margin-top:6px;background:#f1f5f9;border:1px solid var(--rand-bedien);padding:7px 12px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">Mitfahren</button>`:''}
    </div>`;
  }).join(""):'<div style="font-size:12px;color:#94a3b8">Noch keine Fahrgemeinschaft angeboten.</div>';
  box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
    <div style="font-weight:700;margin-bottom:8px">🚗 Fahrgemeinschaften</div>
    ${liste}
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
      <div style="font-size:12px;color:#64748b">Ich biete eine Mitfahrgelegenheit an:</div>
      <input type="text" id="fg-fahrer" placeholder="Dein Name" style="padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-size:14px;font-family:inherit">
      <div style="display:flex;gap:6px">
        <input type="number" id="fg-plaetze" min="1" max="6" placeholder="freie Plätze" style="width:110px;padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-size:14px;font-family:inherit">
        <input type="text" id="fg-abfahrt" placeholder="Abfahrt (z. B. 9:00 Netto)" style="flex:1;padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-size:14px;font-family:inherit">
      </div>
      <button onclick="fgOffer('${datum}')" style="background:#15803d;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit">Fahrt anbieten</button>
    </div>
  </div>`;
}
async function fgOffer(datum){
  const fahrer=(document.getElementById("fg-fahrer")?.value||"").trim();
  const plaetze=parseInt(document.getElementById("fg-plaetze")?.value)||0;
  const abfahrt=(document.getElementById("fg-abfahrt")?.value||"").trim();
  if(!fahrer||plaetze<1){alert("Bitte Name und freie Plätze angeben.");return;}
  try{
    await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft`,{method:"POST",headers:elternHeaders(),body:JSON.stringify({datum,fahrer,plaetze,abfahrt,mitfahrer:[]})});
    fgLoad(datum);
  }catch(e){alert("Konnte nicht speichern.");}
}
async function fgJoin(id,datum){
  const name=prompt("Name des Kindes, das mitfährt:");
  if(!name||!name.trim())return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft?id=eq.${id}&select=mitfahrer,plaetze`,{headers:elternHeaders()});
    const rows=r.ok?await r.json():[];
    if(!rows.length)return;
    const mit=Array.isArray(rows[0].mitfahrer)?rows[0].mitfahrer:[];
    if(mit.length>=(rows[0].plaetze||0)){alert("Leider schon voll.");fgLoad(datum);return;}
    mit.push(name.trim());
    await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft?id=eq.${id}`,{method:"PATCH",headers:elternHeaders(),body:JSON.stringify({mitfahrer:mit})});
    fgLoad(datum);
  }catch(e){alert("Konnte nicht speichern.");}
}

/* ── Der Termin ist die Quelle, matchday seine öffentliche Abschrift ─────────
   PO v406: „Die meisten Infos stehen doch schon im Termin selbst oder? also Ort,
   Trainingszeit, etc." und „Gegner Adresse ist doch auch im Termin bereits
   aufgeführt oder?" – beides stimmt: von sechs Feldern der Eltern-Info doppelten
   fünf den Termin.

   Warum die Tabelle trotzdem bleibt: `termine` ist NUR für Angemeldete lesbar
   (RLS `termine_read` gilt für authenticated), `matchday` hat eine eigene
   anon-Regel. Die Eltern-Seite ?match=<datum> und der Kalender-Export laufen
   ohne Anmeldung – sie können `termine` gar nicht lesen. matchday ist deshalb
   nicht die zweite Pflegestelle, sondern die veröffentlichte Teilmenge:
   Logistik, keine Namen, keine Bewertungen, kein trainer_status.

   Vorher war das eine echte Doppelpflege – und niemand pflegte doppelt. Ergebnis
   am 12.08.: 33 künftige Termine, 0 matchday-Zeilen; der Eltern-Link zeigte eine
   fast leere Karte, der Kalender-Export meldete „Keine kommenden Termine". */
function tmMatchdayProjektion(t){
  if(!t||!t.datum)return null;
  const istSpiel=(t.typ==="spiel"||t.typ==="turnier");
  const hhmm=v=>v?String(v).slice(0,5):"";
  const von=hhmm(t.uhrzeit), bis=hhmm(t.uhrzeit_ende);
  // Treffpunkt = wann UND wo man sich trifft; der Platz („vorne links") ist für
  // Eltern die eigentliche Auskunft, wenn die Anlage mehrere Felder hat.
  const treff=[hhmm(t.treffzeit)?hhmm(t.treffzeit)+" Uhr":"",(t.platz||"").trim()?"Platz "+String(t.platz).trim():""]
    .filter(Boolean).join(" · ");
  return {
    datum:t.datum, typ:t.typ||"spiel",
    gegner: istSpiel?((t.gegner||t.titel||"").trim()||null):null,
    ort:(t.ort||"").trim()||null,
    treffpunkt:treff||null,
    // führendes HH:MM bleibt erhalten – elternKalenderIcs liest genau das
    anpfiff: von?(bis?`${von}–${bis} Uhr`:`${von} Uhr`):null,
    published:true
  };
}
/* Schreibt die Abschrift. Nur die aufgeführten Spalten werden angefasst –
   `infos` und `gegner_adresse` (die einzigen Felder ohne Gegenstück im Termin)
   überleben jedes Speichern. */
async function tmMatchdaySync(t){
  const p=tmMatchdayProjektion(t); if(!p)return false;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(p)});
    return r.ok||r.status===201;
  }catch(e){return false;}
}
// Trainer-Editor für die Eltern-Info: nur noch das, was im Termin NICHT steht.
async function mdOpen(datum,typ){
  typ=typ||"spiel";
  let cur={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=*`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){const rows=await r.json();if(rows.length)cur=rows[0];}
  }catch(e){}
  // Der Termin selbst – erst aus der geladenen Liste, sonst nachschlagen.
  let t=(typeof TM_TERMINE!=="undefined"&&(TM_TERMINE||[]).find(x=>x.datum===datum&&(!typ||x.typ===typ)))||null;
  if(!t){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&select=*&order=uhrzeit.asc.nullslast&limit=1`,{headers:sbAuthHeaders()});
      if(!sbCheck401(r)&&r.ok)t=(await r.json())[0]||null;
    }catch(e){}
  }
  const p=tmMatchdayProjektion(t)||{};
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto";
  modal.style.zIndex=zOben(9999);  // ueber einen evtl. schon offenen Dialog legen
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const istSpiel=(typ==="spiel"||typ==="turnier");
  // Aus dem Termin übernommen – hier bewusst NUR zum Lesen. Zwei Eingabefelder für
  // dieselbe Angabe laufen sonst auseinander, und dann gilt die falsche.
  const zeile=(ico,lbl,val)=>`<div style="display:flex;gap:8px;padding:6px 0;border-bottom:var(--border)">
    <span style="width:18px">${ico}</span>
    <div style="min-width:0"><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3)">${lbl}</div>
    <div style="font-size:13px;font-weight:600${val?"":";color:var(--text3);font-weight:400"}">${val?esc(val):"– nicht im Termin hinterlegt –"}</div></div></div>`;
  const ausDemTermin=`<div style="background:var(--surface2);border-radius:10px;padding:10px 12px;margin-bottom:12px">
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:4px">Aus dem Termin</div>
    ${istSpiel?zeile("⚽","Gegner",p.gegner):""}
    ${zeile("📍","Ort / Adresse",p.ort)}
    ${zeile("⏰","Treffpunkt",p.treffpunkt)}
    ${zeile(typ==="training"?"🕐":"🔔",typ==="training"?"Trainingszeit":"Anpfiff",p.anpfiff)}
    <div style="font-size:10.5px;color:var(--text3);margin-top:8px;line-height:1.45">Diese Angaben pflegst du am Termin selbst („✏️ Bearbeiten"). Beim Speichern hier werden sie für die Eltern veröffentlicht.</div>
  </div>`;
  const gegnerAdresse=`<div class="mg" style="margin-bottom:8px"><label for="md-gegner_adresse">Adresse des Gegners <span style="font-weight:400;color:var(--text3)">– nur falls abweichend vom Ort oben</span></label>
      <div style="display:flex;gap:6px">
        <input type="text" id="md-gegner_adresse" value="${esc(cur.gegner_adresse||"")}" placeholder="Straße, Ort..." style="flex:1;min-width:0">
        <button class="btn btn-sm" onclick="mdMapsSearch()" title="Auf Karte suchen"><i class="ti ti-map-search"></i></button>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px">Leer lassen ist der Normalfall – die Route führt dann zum Ort aus dem Termin.</div>
    </div>`;
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto">
    <div style="font-weight:700;margin-bottom:4px">Eltern-Info · ${typ==="training"?"🏃 Training":"⚽ Spiel"} · ${datum}</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Nur Logistik – für die Eltern sichtbar. Keine Bewertungen.</div>
    ${ausDemTermin}
    ${istSpiel?gegnerAdresse:""}
    <div class="mg" style="margin-bottom:10px"><label for="md-infos">Infos (frei)</label><textarea id="md-infos" rows="2" style="resize:none" placeholder="z. B. Trikot mitbringen, Kuchen für den Kiosk">${esc(cur.infos||"")}</textarea></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p" onclick="mdSave('${datum}','${typ}',this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn" onclick="mdShareLink('${datum}')"><i class="ti ti-share"></i>Eltern-Link</button>
      <button class="btn" onclick="this.closest('div[style*=fixed]').remove()">Schließen</button>
    </div>
  </div>`;
  modal._termin=t;   // mdSave schreibt die Termin-Angaben gleich mit
  document.body.appendChild(modal);
}
function mdMapsSearch(){
  const q=(document.getElementById("md-gegner_adresse")?.value||document.getElementById("md-gegner")?.value||"").trim();
  if(!q){toast("Erst Gegner oder Adresse eintippen","err");return;}
  window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q),"_blank","noopener");
}
async function mdSave(datum,typ,btn){
  const g=id=>document.getElementById("md-"+id)?.value.trim()||"";
  /* Speichern heißt: die Termin-Angaben veröffentlichen UND die zwei eigenen Felder
     sichern – in EINEM Upsert. Sonst hinge die Eltern-Seite an einem zweiten Klick. */
  const t=btn&&btn.closest("div[style*=fixed]")?btn.closest("div[style*=fixed]")._termin:null;
  const body=Object.assign({datum,typ:typ||"spiel",published:true},tmMatchdayProjektion(t)||{},
    {gegner_adresse:g("gegner_adresse")||null, infos:g("infos")||null});
  try{
    const r=await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201)toast("Eltern-Info gespeichert ✓");else toast("Fehler beim Speichern","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
function mdShareLink(datum){
  const url=appRoot()+"?match="+encodeURIComponent(datum);
  const text=`⚽ Spieltag-Infos U9 (${datum}):\n${url}`;
  if(navigator.share){navigator.share({title:"Spieltag U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Eltern-Link kopiert ✓"),()=>prompt("Eltern-Link:",url));}
}

// Rotations-Timer: faire Einsatzzeiten am Spieltag. Feld/Bank, Timer mit Piepton,
// Wechselvorschlag nach längster Bankzeit.
let rotField=[], rotBench=[], rotBenchSec={}, rotFieldSec={}, rotTimerId=null, rotElapsed=0, rotIntervalMin=5, rotTW=null; // HOTFIX 12: rotFieldSec = Spielzeit
// Feldgröße folgt der aktuellen Spielform (FORMATIONS): Funino 3, 4+1 = 4, 5+1 = 5.
function rotFieldSize(){ return ((typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{fieldCount:5}).fieldCount; }
// HOTFIX 11: Torwart (Fest) bewusst setzen/entfernen – aus Feld & Bank raus, rotiert getrennt.
function rotSetTW(name){ if(!name)return; rotField=rotField.filter(n=>n!==name); rotBench=rotBench.filter(n=>n!==name); rotTW=name; rotRenderLive(); }
function rotClearTW(){ if(rotTW&&!rotBench.includes(rotTW)&&!rotField.includes(rotTW))rotBench.push(rotTW); rotTW=null; rotRenderLive(); }
// HOTFIX 13: räumliches Mini-Feld – Feldspieler an den echten Formations-Positionen,
// TW im Tor, Spielzeit (grün) auf jedem Chip. Antippen = auf die Bank (rotMove).
function rotFieldSpatialHtml(){
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{slots:[]};
  const slots=form.slots||[];
  const fieldSlots=slots.filter(s=>s.rk!=="tw");
  const twSlot=slots.find(s=>s.rk==="tw");
  const chipF=(n,x,y,tw)=>{const reco=!tw&&istRecovery(n);return `<button onclick="${tw?'rotClearTW()':`rotMove('${n.replace(/'/g,"")}')`}" title="${tw?'Torwart entfernen':(reco?'Kürzlich krank – heute Belastung dosieren':'Auf die Bank')}" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;border:${reco?'3px solid #f97316':'2px solid #fff'};background:${tw?'#f59e0b':'#1e3a8a'};color:#fff;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;padding:0;font-family:inherit">
    <span style="font-size:11px">${reco?"🩹":(getKader(n)?.nr!=null?getKader(n).nr:(tw?"🥅":""))}</span>
    <span style="max-width:42px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px">${esc((n||"").split(" ").slice(-1)[0])}</span>
    <span data-rot-sec="${esc(n)}" data-rot-on="f" style="font-size:7px;color:#bbf7d0">${fmtSec(rotFieldSec[n]||0)}</span></button>`;};
  let h='<div style="position:relative;width:100%;max-width:300px;margin:0 auto 4px;aspect-ratio:3/4;background:linear-gradient(#2d7d2d,#256b25);border-radius:12px;border:2px solid rgba(255,255,255,.35);overflow:hidden">';
  h+='<div style="position:absolute;left:6%;right:6%;top:50%;height:1px;background:rgba(255,255,255,.3)"></div>';
  h+='<div style="position:absolute;left:50%;top:50%;width:46px;height:46px;border:1px solid rgba(255,255,255,.25);border-radius:50%;transform:translate(-50%,-50%)"></div>';
  rotField.forEach((n,i)=>{const s=fieldSlots[i]||{x:50,y:40+i*8};h+=chipF(n,s.x,s.y,false);});
  if(rotTW&&twSlot)h+=chipF(rotTW,twSlot.x,twSlot.y,true);
  h+='</div>';
  return h;
}
// Korrektur 3: Der Torwart wird separat gehalten – er steht im Tor und rotiert NICHT
// mit den Feldspielern. Nur die Feldspieler wechseln zwischen Feld und Bank.
function rotSeedFromSquad(squad){
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true,fieldCount:5};
  rotTW=null; // HOTFIX 11: Torwart-Slot startet LEER – der Trainer setzt ihn bewusst (rotSetTW)
  const outfield=squad.filter(n=>n!==rotTW);
  rotField=outfield.slice(0,form.fieldCount);
  rotBench=outfield.slice(form.fieldCount);
  rotBenchSec={};rotFieldSec={};squad.forEach(n=>{rotBenchSec[n]=0;rotFieldSec[n]=0;}); // HOTFIX 12
  rotElapsed=0;
}
function rotInit(){
  if(!rotField.length&&!rotBench.length&&!rotTW){
    rotSeedFromSquad(KADER.map(k=>k.name));
  }
  rotRenderControls();
  rotRenderLive();
}
function rotRenderControls(){
  const box=document.getElementById("rot-panel");
  if(!box)return;
  const running=!!rotTimerId;
  box.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <span style="font-size:11px;color:var(--text2)">Wechsel alle</span>
      <select id="rot-interval" onchange="rotIntervalMin=parseInt(this.value)" style="min-height:40px;padding:6px 10px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit">
        ${[3,4,5,6,7].map(m=>`<option value="${m}"${m===rotIntervalMin?" selected":""}>${m} Min.</option>`).join("")}
      </select>
      <button class="btn btn-p" id="rot-startbtn" onclick="rotToggle()" style="min-height:44px">${running?'<i class="ti ti-player-pause"></i>Pause':'<i class="ti ti-player-play"></i>Start'}</button>
      <button class="btn" onclick="rotReset()" style="min-height:44px"><i class="ti ti-refresh"></i>Reset</button>
      <button class="btn" onclick="magicLineup()" title="Verteilt den Kader dieses Teams auf Feld und Bank – wenig gespielte Kinder starten" style="min-height:44px">🪄 Feld &amp; Bank fair besetzen</button>
    </div>
    <div id="rot-live"></div>`;
}
/* Phase 7-A: Magic Button – nominierte Spieler optimal aufs Feld der aktuellen
   Spielform verteilen. 4+1 nutzt den echten Kombinator (calcBestCombos, gedeckelt),
   Funino/5+1 nutzen eine Greedy-Verteilung nach Gesamtscore (kein Brute-Force ->
   kein Einfrieren). Torwart separat. Ergebnis ist frei nachjustierbar. */
async function magicLineup(){
  const squad=(typeof nominierteSpieler==="function"?nominierteSpieler():[]);
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true,fieldCount:5};
  const need=form.fieldCount+(form.tw?1:0);
  if(squad.length<need){toast(`Zu wenige nominierte Spieler (${squad.length}/${need}) für ${tbFormation}`,"err");return;}
  const keeper=form.tw?(squad.find(n=>getKader(n)?.tw)||null):null;
  const outfieldPool=squad.filter(n=>n!==keeper);
  // Saison-Fairness: kumulierte Einsatzzeiten laden (best-effort). Wenig gespielt -> Startvorteil.
  const minutes={}; let fair=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/einsatzzeiten?select=spieler,feld_sek`,{headers:sbAuthHeaders()});if(r.ok){const rows=await r.json();rows.forEach(x=>{if(x.spieler)minutes[x.spieler]=(minutes[x.spieler]||0)+(x.feld_sek||0);});fair=rows.length>0;}}catch(e){}
  // Basis: Skill-Reihenfolge (Gesamtscore)
  const skillOrder=outfieldPool.map(n=>{const pd=getPlayerData(n);return {n,s:pd?pd.total:0};}).sort((a,b)=>b.s-a.s).map(x=>x.n);
  // Blend mit Fairness (55% Fairness / 45% Skill), nur wenn Saisondaten da sind
  let ranked=skillOrder;
  if(fair){
    const maxM=Math.max(1,...outfieldPool.map(n=>minutes[n]||0));
    const skIdx={}; skillOrder.forEach((n,i)=>skIdx[n]=i); const L=Math.max(1,skillOrder.length-1);
    const val=n=>0.55*(1-(minutes[n]||0)/maxM)+0.45*(1-(skIdx[n]/L)); // hoch = soll starten (wenig gespielt / stark)
    ranked=[...outfieldPool].sort((a,b)=>val(b)-val(a));
  }
  // Startelf-Positionierung: für 4+1 die gewählten 4 Starter in die beste Raute stellen
  let ordered=ranked;
  if(tbFormation==='4+1'&&ranked.length>=4){
    const starters=ranked.slice(0,4);
    const combo=calcBestCombos(starters);
    if(combo&&combo[0]){
      const b=combo[0];
      const used=[b.aufpasser.name,b.flitzer_l.name,b.flitzer_r.name,b.jaeger.name];
      const rest=ranked.filter(n=>!used.includes(n));
      ordered=[...used,...rest];
    }
  }
  rotTW=keeper;
  rotField=ordered.slice(0,form.fieldCount);
  rotBench=ordered.slice(form.fieldCount);
  // Neue Startaufstellung = neuer Anfang: Bank- UND Feldzeiten auf 0. Vorher blieben die
  // Feldzeiten stehen und der Wechselvorschlag rechnete mit Zahlen von vorhin.
  rotBenchSec={};rotFieldSec={};squad.forEach(n=>{rotBenchSec[n]=0;rotFieldSec[n]=0;});rotElapsed=0;
  rotRenderControls();rotRenderLive();
  toast(fair?"⚖️ Feld & Bank fair besetzt ✓ – wenig-gespielte Kinder starten, frei anpassbar":"Feld & Bank besetzt ✓ – frei anpassbar");
}
function fmtSec(s){const m=Math.floor(s/60),ss=s%60;return m+":"+(ss<10?"0":"")+ss;}
// Wechselvorschlag als eigener Helper: längste Bankzeit rein für kürzeste Bankzeit
// (= längste Feldzeit). Ändert sich sekündlich, daher separat updatebar (rotTickLite).
function rotSuggHtml(){
  if(!(rotBench.length&&rotField.length))return "";
  const benchTop=[...rotBench].sort((a,b)=>rotBenchSec[b]-rotBenchSec[a])[0];
  const fieldTired=[...rotField].sort((a,b)=>rotBenchSec[a]-rotBenchSec[b])[0];
  return `<div style="padding:8px 10px;background:#fef9c3;border:1px solid #fde047;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🔁 Vorschlag: <strong>${esc(benchTop)}</strong> (Bank ${fmtSec(rotBenchSec[benchTop])}) rein für <strong>${esc(fieldTired)}</strong></div>`;
}
function rotRenderLive(){
  const live=document.getElementById("rot-live");
  if(!live)return;
  const rest=rotIntervalMin*60-rotElapsed;
  // HOTFIX 12: jeder Chip zeigt seine Zeit – grün = Spielzeit (Feld), rot = Bankzeit.
  // data-rot-sec/-on markieren den Zeit-Span, damit rotTickLite ihn pro Sekunde
  // punktgenau aktualisieren kann, ohne das ganze Panel neu zu bauen.
  const chip=(n,onField)=>{
    const sek=onField?(rotFieldSec[n]||0):(rotBenchSec[n]||0);
    const tcol=onField?"#15803d":"#dc2626";
    const reco=istRecovery(n);
    const rand=reco?"2px solid #f97316":"var(--border-s)"; // orangener Rand: kürzlich krank
    return `<button onclick="rotMove('${n.replace(/'/g,"")}')" title="${reco?'Kürzlich krank – heute Belastung dosieren':''}" style="font-size:12.5px;padding:8px 10px;min-height:44px;border:${rand};border-radius:16px;background:${onField?"var(--blue-bg)":"var(--surface2)"};cursor:pointer;font-family:inherit">${reco?"🩹 ":""}${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)} <span data-rot-sec="${esc(n)}" data-rot-on="${onField?"f":"b"}" style="color:${tcol};font-size:10px;font-weight:700">${fmtSec(sek)}</span></button>`;
  };
  // HOTFIX 11: "Torwart (Fest)" – nur bei Spielformen mit TW; leer = Auswahl, gesetzt = Anzeige + Entfernen.
  const rotForm=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true};
  let twRow="";
  if(rotForm.tw){
    if(rotTW){
      twRow=`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fef3c7;border:1px solid #fcd34d;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🥅 <strong>Torwart (Fest): ${esc(rotTW)}</strong><button onclick="rotClearTW()" title="Torwart entfernen" style="border:none;background:transparent;color:#a16207;cursor:pointer;font-size:16px;line-height:1;padding:0 2px">×</button><span style="font-size:10px;color:#a16207;margin-left:auto">rotiert nicht mit</span></div>`;
    }else{
      const opts=[...rotField,...rotBench].map(n=>`<option value="${esc(n)}">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)}</option>`).join("");
      twRow=`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fffbeb;border:1px dashed #fcd34d;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🥅 <strong>Torwart (Fest):</strong><select onchange="rotSetTW(this.value)" style="flex:1;padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:12px;background:var(--surface)"><option value="">— Torwart wählen —</option>${opts}</select></div>`;
    }
  }
  const recoNamen=[...rotField,...rotBench].filter(istRecovery);
  const recoHinweis=recoNamen.length?`<div style="padding:8px 10px;background:#fff7ed;border:1px solid #fdba74;border-radius:var(--r);font-size:12px;color:#9a3412;margin-bottom:10px">🩹 <strong>${recoNamen.map(esc).join(", ")}</strong> ${recoNamen.length===1?"war":"waren"} kürzlich krank – heute Einsatzzeit bewusst dosieren.</div>`:"";
  live.innerHTML=`
    <div id="rot-cd" style="text-align:center;font-size:30px;font-weight:800;color:${rest<=10?"#dc2626":"var(--text)"};margin-bottom:8px">${fmtSec(Math.max(0,rest))}</div>
    ${twRow}
    ${kapitaenRow()}
    ${recoHinweis}
    <div id="rot-sugg">${rotSuggHtml()}</div>
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:4px">Feld (${rotField.length}/${rotFieldSize()})</div>
    ${rotFieldSpatialHtml()}
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text2);margin:10px 0 6px">Bank (${rotBench.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${rotBench.map(n=>chip(n,false)).join("")||'<span style="font-size:11px;color:var(--text3)">Bank leer</span>'}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:8px">Feld-Spieler antippen = auf die Bank · Bank-Spieler antippen = aufs Feld · 🟢 Spielzeit / 🔴 Bankzeit.</div>`;
}
function rotMove(name){
  let richtung=null;
  if(rotField.includes(name)){rotField=rotField.filter(n=>n!==name);rotBench.push(name);richtung="aus";}
  else if(rotBench.includes(name)){
    if(rotField.length>=rotFieldSize()){toast("Feld ist voll ("+rotFieldSize()+") – erst jemanden rausnehmen","err");return;}
    rotBench=rotBench.filter(n=>n!==name);rotField.push(name);richtung="ein";
  }
  if(richtung&&rotTimerId)rotLogSub(name,richtung); // HOTFIX 12: nur echte Wechsel im laufenden Spiel loggen
  rotRenderLive();
}
// HOTFIX 12: Ein-/Auswechslung in match_substitutions loggen (Fairness-Beweis). Best-effort.
async function rotLogSub(spieler,richtung){
  const datum=spieltagKey();
  const minute=(typeof mcState!=="undefined"&&mcState)?mcMinuteLabel(mcState,typeof mcSpieldauer!=="undefined"?mcSpieldauer:10,typeof mcHalbzeiten!=="undefined"?mcHalbzeiten:1):"";
  let tid=null; try{tid=await terminIdForDatum(datum);}catch(e){}
  sbQueuedPost("match_substitutions",{datum,termin_id:tid,spieler,richtung,minute,feld_sek:rotFieldSec[spieler]||0,bank_sek:rotBenchSec[spieler]||0});
}
function rotBeep(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    const ctx=new AC();const o=ctx.createOscillator();const g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);o.type="sine";o.frequency.value=880;
    g.gain.setValueAtTime(.25,ctx.currentTime);o.start();
    o.stop(ctx.currentTime+.45);setTimeout(()=>ctx.close(),700);
  }catch(e){}
}
// Perf: pro Sekunde nur die Textknoten (Countdown, Chip-Zeiten, Wechselvorschlag)
// aktualisieren statt das ganze Panel via innerHTML neu zu bauen. Fehlt die erwartete
// Struktur (z.B. direkt nach Tab-Wechsel), meldet der Rückgabewert false -> voller Render.
function rotTickLite(){
  const cd=document.getElementById("rot-cd");
  const live=document.getElementById("rot-live");
  if(!cd||!live)return false;
  const restRaw=rotIntervalMin*60-rotElapsed;
  cd.textContent=fmtSec(Math.max(0,restRaw));
  cd.style.color=restRaw<=10?"#dc2626":"var(--text)";
  live.querySelectorAll("[data-rot-sec]").forEach(el=>{
    const n=el.getAttribute("data-rot-sec");
    const onField=el.getAttribute("data-rot-on")==="f";
    el.textContent=fmtSec((onField?rotFieldSec[n]:rotBenchSec[n])||0);
  });
  const sg=document.getElementById("rot-sugg");
  if(sg)sg.innerHTML=rotSuggHtml();
  return true;
}
function rotTick(){
  rotElapsed++;
  rotBench.forEach(n=>{rotBenchSec[n]=(rotBenchSec[n]||0)+1;});
  rotField.forEach(n=>{rotFieldSec[n]=(rotFieldSec[n]||0)+1;}); // HOTFIX 12: Spielzeit der Feldspieler
  if(rotTW)rotFieldSec[rotTW]=(rotFieldSec[rotTW]||0)+1; // Torwart spielt auch (feste Position)
  if(rotElapsed>=rotIntervalMin*60){
    rotElapsed=0;rotBeep();try{navigator.vibrate&&navigator.vibrate([100,60,100]);}catch(e){}
  }
  if((++rotPersistCtr%30)===0)rotPersistTimes(); // Faire Einsatzzeiten: alle 30s sichern
  if(!rotTickLite())rotRenderLive(); // punktgenaues Text-Update; sonst voller Render
}
// Idempotente Start/Stop-Funktionen (statt reinem Toggle), damit die Match-Uhr den
// Rotations-Timer sicher mitsteuern kann, ohne einen bereits korrekten Zustand zu kippen.
function rotStart(){ if(!rotTimerId){rotTimerId=setInterval(rotTick,1000);requestWakeLock();} rotRenderControls();rotRenderLive(); }
function rotStop(){ if(rotTimerId){clearInterval(rotTimerId);rotTimerId=null;} rotPersistTimes(); rotRenderControls();rotRenderLive(); }
function rotToggle(){ if(rotTimerId)rotStop(); else rotStart(); }
// Faire Einsatzzeiten: aktuelle Feldzeit je Spieler in Supabase sichern (best-effort, Trainer-Auth).
let rotPersistCtr=0;
async function rotPersistTimes(){
  if(typeof sbToken==="function"&&!sbToken())return;
  const datum=spieltagKey();
  const all=new Set([...rotField,...rotBench,...(rotTW?[rotTW]:[])]);
  const payload=[...all].map(n=>({datum,spieler:n,feld_sek:rotFieldSec[n]||0}));
  if(!payload.length)return;
  // Offline-hart: über die Sync-Queue -> am Platz ohne Netz wird es zuverlässig nachgetragen.
  try{ await sbQueuedPost("einsatzzeiten?on_conflict=datum,spieler",payload,"resolution=merge-duplicates"); }catch(e){}
}
/* PO v399: „wenn ich den Wechsel timer resete dann sollten auch die Spielzeiten der
   Spieler reseten oder?" – ja. Vorher wurden nur der Zähler und die BANK-Zeiten
   genullt, die Feldzeiten liefen weiter: nach dem Reset stand 4:00 auf der Uhr und
   2:54 neben einem Kind. Ein halber Reset ist schlimmer als keiner, weil man ihm nicht
   ansieht, was er stehen gelassen hat.
   Weil das die erfassten Einsatzzeiten dieses Spiels verwirft, wird gefragt – und die
   Nullen werden auch gespeichert, sonst käme die alte Zahl beim nächsten Laden zurück. */
function rotReset(){
  const gespielt=Object.values(rotFieldSec||{}).some(v=>v>0);
  if(gespielt&&!confirm("Wechsel-Timer zurücksetzen?\n\nDie erfassten Spielzeiten dieses Spiels werden dabei auf 0:00 gesetzt."))return;
  if(rotTimerId){clearInterval(rotTimerId);rotTimerId=null;}
  rotElapsed=0;
  Object.keys(rotBenchSec).forEach(n=>rotBenchSec[n]=0);
  Object.keys(rotFieldSec).forEach(n=>rotFieldSec[n]=0);
  if(gespielt)rotPersistTimes();
  rotRenderControls();rotRenderLive();
}

