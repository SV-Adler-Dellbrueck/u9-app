/* ═══════════════════════════════════
   AUTOMATISCHER SPIELBERICHT (Phase 8-G)
   Baut aus den live erfassten Aktionen (match_actions) + Tor/Gegentor (ticker_events)
   einen warmen, positiven Fließtext für die Eltern-Gruppe. Kernprinzip: JEDES
   nominierte Kind bekommt mindestens einen positiven Satz – niemand fällt raus.
   Zufalls-Bausteine sorgen dafür, dass sich zwei Berichte nie identisch lesen.
   Rein clientseitig, positiv-only (kein Ballverlust/Fehler), Copy/Share.
═══════════════════════════════════ */
const REPORT_INTRO={
  torfest:["Was für ein Nachmittag! Die jungen Adler drehten mächtig auf.","Ein echtes Torfestival – die Adler waren heute nicht zu bremsen."],
  sieg:["Die Adler zeigten heute eine richtig reife Mannschaftsleistung.","Ein starker, souveräner Auftritt der jungen Adler."],
  knapp:["Ein spannendes Spiel, das bis zur letzten Minute auf Messers Schneide stand.","Ein ausgeglichenes, umkämpftes Match der Adler."],
  kampf:["Ein hart umkämpftes Spiel, in dem die Adler nie aufsteckten.","Die Adler kämpften bis zum Schlusspfiff – Kopf hoch, Jungs, das war stark!"],
  neutral:["Wieder ein Nachmittag, an dem die jungen Adler eine Menge dazugelernt haben.","Die Adler sammelten heute wertvolle Spielerfahrung und jede Menge Spaß."]
};
const REPORT_PRAISE={
  tor:["{name} war eiskalt vor dem Tor","{name} zeigte echte Torjäger-Qualitäten","{name} ließ dem gegnerischen Keeper keine Chance"],
  pass:["{name} glänzte als kluger Vorbereiter","{name} verteilte die Bälle mit toller Übersicht","{name} war das Herz im Aufbauspiel"],
  dribbling:["{name} tanzte durch die gegnerische Abwehr","{name} überzeugte im Eins-gegen-Eins","{name} zeigte mutige, freche Dribblings"],
  gewinn:["{name} eroberte einen Ball nach dem anderen","{name} war ein echter Ballräuber","{name} kämpfte um jeden einzelnen Ball"],
  parade:["{name} hielt im Tor den Kasten sauber","{name} zeigte zwischen den Pfosten starke Paraden","{name} war ein sicherer Rückhalt im Tor"],
  aufbau:["{name} eröffnete das Spiel stark von hinten","{name} brachte den ersten Pass immer sauber"],
  heraus:["{name} beherrschte souverän den Strafraum","{name} klärte mutig vor dem eigenen Tor"],
  einsatz:["{name} war mit vollem Einsatz dabei","{name} rackerte unermüdlich für das Team","{name} zeigte einen tollen Teamgeist","{name} gab keinen Ball verloren"]
};
const REPORT_CONN=["Außerdem","Dazu","Ebenso","Auch","Nicht zu vergessen:","Besonders auffällig:"];
const REPORT_CLOSE=["Am Ende zählt: Jedes Kind hat gekämpft und Spaß gehabt – und genau darum geht es. 🦅","Alle Adler haben heute alles gegeben – wir sind mächtig stolz auf euch! 🦅","Weiter so, Adler – auf geht's zum nächsten Spiel! 🦅"];
const REPORT_POS_ORDER=["parade","tor","dribbling","gewinn","pass","heraus","aufbau"]; // bei Gleichstand bevorzugte Highlight-Aktion
function rPick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function matchReportBuild(per,roster,tore,gegentore){
  const d=spieltagRawDate(),p=d.split("-");
  const dateStr=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:d;
  const teamTxt=spieltagTeam>1?` – Adler ${spieltagTeam}`:"";
  const totalActions=Object.values(per).reduce((s,pl)=>s+Object.values(pl).reduce((a,b)=>a+b,0),0);
  let scenario="neutral";
  if(tore>=5)scenario="torfest";
  else if(tore>gegentore&&tore>0)scenario="sieg";
  else if(tore===gegentore&&(tore>0||gegentore>0))scenario="knapp";
  else if(gegentore>tore)scenario="kampf";
  else if(totalActions>0)scenario="sieg"; // Aktionen erfasst, aber keine Tore getippt → positiv
  let intro=rPick(REPORT_INTRO[scenario]);
  if(tore>0)intro+=` Die Adler erzielten ${tore===1?"einen Treffer":tore+" Treffer"}.`;
  // Pro Kind ein positiver Satz – Highlight = die am häufigsten getippte positive Aktion.
  const lines=roster.map((name,i)=>{
    const c=per[name]||{};
    let best=null,bestN=0;
    REPORT_POS_ORDER.forEach(k=>{const n=c[k]||0;if(n>bestN){bestN=n;best=k;}});
    const bank=best?REPORT_PRAISE[best]:REPORT_PRAISE.einsatz;
    let s=rPick(bank).replace("{name}",name);
    // Konnektor nur voranstellen, NICHT klein schreiben (Satz beginnt mit dem Spielernamen).
    if(i>0&&Math.random()<0.5)s=rPick(REPORT_CONN)+" "+s;
    return s+".";
  });
  const paras=[];for(let i=0;i<lines.length;i+=3)paras.push(lines.slice(i,i+3).join(" "));
  return `🦅 Spielbericht${teamTxt} – ${dateStr}\n\n${intro}\n\n${paras.join("\n\n")}\n\n${rPick(REPORT_CLOSE)}`;
}
// HOTFIX 6: Spieldaten sammeln, dann dynamischen KI-Bericht anfordern (lokale Engine = Fallback).
let reportData=null; // {per,roster,tore,gegentore,team,datum}
async function matchReport(){
  const datum=spieltagKey();
  let acts=[],trows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&select=spieler,aktion`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)acts=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=typ`,{headers:sbAuthHeaders()});if(r.ok)trows=await r.json();}catch(e){}
  const per={};
  acts.forEach(a=>{if(!per[a.spieler])per[a.spieler]={};per[a.spieler][a.aktion]=(per[a.spieler][a.aktion]||0)+1;});
  const roster=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():Object.keys(per);
  if(!roster.length){toast("Noch keine Spieldaten für einen Bericht","err");return;}
  const tore=trows.filter(t=>t.typ==="tor").length||Object.values(per).reduce((s,pl)=>s+(pl.tor||0),0);
  const gegentore=trows.filter(t=>t.typ==="gegentor").length;
  reportData={per,roster,tore,gegentore,team:spieltagTeam,datum:spieltagRawDate()};
  reportGenerate(false);
}
// KI-Bericht anfordern; bei Offline/Fehler/Zeitüberschreitung auf die lokale Text-Engine zurückfallen.
async function reportGenerate(isReroll){
  if(!reportData){matchReport();return;}
  const {per,roster,tore,gegentore,team,datum}=reportData;
  reportShowLoading(isReroll);
  const spieler=roster.map(name=>({name,highlights:per[name]||{}}));
  const seed=Math.random().toString(36).slice(2,8);
  const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(),30000);
  try{
    const r=await fetch(`${SB_URL}/functions/v1/ki-spielbericht`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler,tore,gegentore,team,datum,seed}),signal:ctrl.signal});
    clearTimeout(to);
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.bericht){ matchReportShow(matchReportBuild(per,roster,tore,gegentore),{fallback:true,reason:d.error}); return; }
    const p=(datum||"").split("-"); const ds=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:datum;
    const head=`🦅 Spielbericht${team>1?" – Adler "+team:""} – ${ds}\n\n`;
    matchReportShow(head+d.bericht,{ai:true,rest:d.rest});
  }catch(e){
    clearTimeout(to);
    matchReportShow(matchReportBuild(per,roster,tore,gegentore),{fallback:true,reason:e&&e.name==="AbortError"?"timeout":"offline"});
  }
}
function reportShowLoading(isReroll){
  const old=document.getElementById("report-modal");if(old)old.remove();
  const modal=document.createElement("div");
  modal.id="report-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:420px;width:100%;border-radius:16px;padding:28px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-size:15px;font-weight:700;margin-bottom:8px">📰 ${isReroll?"Neue Formulierung …":"Spielbericht wird geschrieben …"}</div>
    <div style="font-size:13px;color:var(--text2)">🦅 Der Adler-Coach fasst das Spiel in Worte.</div></div>`;
  document.body.appendChild(modal);
}
function matchReportShow(text,opts){
  opts=opts||{};
  const old=document.getElementById("report-modal");if(old)old.remove();
  const modal=document.createElement("div");
  modal.id="report-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const badge=opts.ai
    ?`<span style="font-size:10px;background:#dbeafe;color:#1e40af;padding:2px 7px;border-radius:10px;font-weight:700">🤖 KI-Bericht${opts.rest!=null?" · "+opts.rest+" heute übrig":""}</span>`
    :opts.fallback
      ?`<span style="font-size:10px;background:#fef3c7;color:#854d0e;padding:2px 7px;border-radius:10px;font-weight:700">📴 Offline-Vorlage</span>`
      :"";
  card.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="font-weight:700;font-size:15px">📰 Spielbericht</div>${badge}</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px">${opts.fallback?"Kein Netz/KI – hier eine automatische Vorlage. ":""}Zum Kopieren in die Eltern-Gruppe – frei anpassbar. „Neu würfeln" erzeugt eine neue Variante.</div>`;
  const ta=document.createElement("textarea");
  ta.id="report-text";ta.value=text;
  ta.style.cssText="width:100%;min-height:280px;font-family:inherit;font-size:13px;line-height:1.5;border:var(--border-s);border-radius:10px;padding:12px;resize:vertical;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px";
  const radioBtn='speechSynthesis' in window
    ?`<button id="adler-radio-btn" class="btn btn-sm" style="background:#7c3aed;color:#fff;border-color:#7c3aed" onclick="adlerRadioToggle(this)"><i class="ti ti-volume"></i>📻 Adler Radio</button>`:"";
  const diaryBtn=`<button class="btn btn-sm" style="background:#0891b2;color:#fff;border-color:#0891b2" onclick="voiceDiaryOpen(typeof spieltagKey==='function'?spieltagKey():null)" title="Gedanken nach Abpfiff als Sprach-/Textnotiz festhalten"><i class="ti ti-microphone"></i>🎤 Notiz</button>`;
  bar.innerHTML=`${radioBtn}${diaryBtn}<button class="btn btn-sm" onclick="reportGenerate(true)"><i class="ti ti-refresh"></i>Neu würfeln</button>
    <button class="btn btn-p" onclick="matchReportCopy()"><i class="ti ti-copy"></i>Kopieren</button>
    <button class="btn btn-sm" onclick="adlerRadioStop();document.getElementById('report-modal').remove()">Schließen</button>`;
  card.appendChild(ta);card.appendChild(bar);
  modal.appendChild(card);
  document.body.appendChild(modal);
}
/* Adler Radio (Phase 22.4): den Spielbericht vorlesen – für Kinder, die den Text noch
   nicht flüssig lesen. Nutzt die Web Speech API mit einer deutschen Stimme, etwas
   flotter/heller für Kommentator-Energie. Toggle: nochmal tippen = Stopp. */
function adlerRadioStop(){ try{ if("speechSynthesis" in window)speechSynthesis.cancel(); }catch(e){}
  const b=document.getElementById("adler-radio-btn"); if(b)b.innerHTML='<i class="ti ti-volume"></i>📻 Adler Radio'; }
function adlerRadioToggle(btn){
  if(!("speechSynthesis" in window))return;
  if(speechSynthesis.speaking||speechSynthesis.pending){ adlerRadioStop(); return; }
  const ta=document.getElementById("report-text");
  const text=(ta?ta.value:"").replace(/🦅|📰/g,"").trim();
  if(!text)return;
  const u=new SpeechSynthesisUtterance(text);
  u.lang="de-DE"; u.rate=1.05; u.pitch=1.15;
  const de=speechSynthesis.getVoices().find(v=>/de[-_]/i.test(v.lang));
  if(de)u.voice=de;
  u.onend=u.onerror=()=>{const b=document.getElementById("adler-radio-btn"); if(b)b.innerHTML='<i class="ti ti-volume"></i>📻 Adler Radio';};
  speechSynthesis.speak(u);
  if(btn)btn.innerHTML='<i class="ti ti-player-stop"></i>⏹ Stopp';
}
function matchReportCopy(){
  const ta=document.getElementById("report-text");if(!ta)return;
  const text=ta.value;
  const done=()=>toast("Spielbericht kopiert ✓");
  if(navigator.share){navigator.share({title:"Spielbericht U9",text}).then(done).catch(()=>{});return;}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,()=>{ta.select();try{document.execCommand("copy");done();}catch(e){}});}
  else{ta.select();try{document.execCommand("copy");done();}catch(e){}}
}
/* v502 PO: „Spielbericht und Ergebnis-Karte gehören eher in Nach dem Spiel." Vorher hingen die
   beiden Knöpfe im Ticker-Block, sichtbar nur bei laufendem Ticker. */
function berichtPanelRender(){
  const box=document.getElementById("bericht-panel"); if(!box)return;
  box.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="matchReport()" style="flex:1;min-height:48px;justify-content:center"><i class="ti ti-news"></i>Spielbericht</button>
      <button class="btn" onclick="ergebnisKarte()" style="flex:1;min-height:48px;justify-content:center"><i class="ti ti-photo"></i>Ergebnis-Karte</button>
    </div>
    <div style="font-size:10.5px;color:var(--text3);margin-top:6px">Tore und Gegentore kommen aus den Live-Aktionen; der Bericht fasst den Spieltag dieses Teams zusammen – zum Teilen im Eltern-Chat.</div>`;
}
// Teilbare Ergebnis-Karte (Bild): Ergebnis + Torschützen als Social-Card fürs Familien-/Eltern-Chat.
async function ergebnisKarte(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  toast("🖼️ Ergebnis-Karte wird erstellt…");
  const datum=spieltagKey(), realDate=spieltagRawDate();
  let trows=[],acts=[],gegner="";
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=typ`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)trows=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&select=spieler,aktion`,{headers:sbAuthHeaders()});if(r.ok)acts=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(realDate)}&select=gegner&order=datum.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok){const m=(await r.json())[0];gegner=(m&&m.gegner)||"";}}catch(e){}
  const tore=trows.filter(t=>t.typ==="tor").length||acts.filter(a=>a.aktion==="tor").length;
  const gegentore=trows.filter(t=>t.typ==="gegentor").length;
  const sc={}; acts.filter(a=>a.aktion==="tor").forEach(a=>{ if(a.spieler)sc[a.spieler]=(sc[a.spieler]||0)+1; });
  const scorers=Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n,c])=>c>1?`${n} (${c})`:n);
  const logo=new Image();
  logo.onload=()=>drawErgebnisKarte(logo,{tore,gegentore,gegner,scorers,realDate});
  logo.onerror=()=>drawErgebnisKarte(null,{tore,gegentore,gegner,scorers,realDate});
  logo.src="logo.png";
}
function drawErgebnisKarte(logoImg,d){
  const W=640,H=800,ctx=Object.assign(document.createElement("canvas"),{width:W,height:H}).getContext("2d");
  const c=ctx.canvas;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1e3a8a");g.addColorStop(1,"#1a56db");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";ctx.textBaseline="alphabetic";
  if(logoImg){try{ctx.drawImage(logoImg,W/2-46,46,92,92);}catch(e){}}
  ctx.fillStyle="#fff";ctx.font="bold 26px Arial";ctx.fillText("SV ADLER DELLBRÜCK · U9",W/2,178);
  const p=(d.realDate||"").split("-");const ds=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:d.realDate;
  ctx.fillStyle="rgba(255,255,255,.75)";ctx.font="18px Arial";ctx.fillText(ds,W/2,208);
  const py=252,ph=210;
  ctx.fillStyle="rgba(255,255,255,.12)";tbRoundRect(ctx,60,py,W-120,ph,20);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.85)";ctx.font="bold 18px Arial";ctx.fillText("SPIELERGEBNIS",W/2,py+38);
  ctx.fillStyle="#facc15";ctx.font="bold 92px Arial";ctx.fillText(`${d.tore} : ${d.gegentore}`,W/2,py+140);
  ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.fillText(`Adler${d.gegner?"   –   "+d.gegner:""}`,W/2,py+185);
  let y=py+ph+66;
  if(d.scorers.length){
    ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="20px Arial";ctx.fillText("⚽ Torschützen",W/2,y);y+=36;
    ctx.fillStyle="#fff";ctx.font="bold 22px Arial";
    const words=d.scorers;let line="",yy=y;
    words.forEach(w=>{const t=line?line+"   ·   "+w:w; if(ctx.measureText(t).width>W-100&&line){ctx.fillText(line,W/2,yy);yy+=32;line=w;}else line=t;});
    if(line)ctx.fillText(line,W/2,yy);
  }
  ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 24px Arial";ctx.fillText("🦅 Auf geht's, Adler!",W/2,H-46);
  c.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"ergebnis-u9.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"Ergebnis U9"});}catch(e){}
    }else{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ergebnis-u9.png";
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("Ergebnis-Karte heruntergeladen ✓");
    }
  },"image/png");
}

/* Kalender-Sync (.ics): kommende veröffentlichte Termine als Kalenderdatei –
   landen mit Erinnerung nativ im Handy-Kalender der Eltern. Rein clientseitig. */
function icsEscape(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }
function icsLocalStart(datum,time){ const m=time.match(/^(\d{1,2}):(\d{2})/); return datum.replace(/-/g,"")+"T"+m[1].padStart(2,"0")+m[2]+"00"; }
function icsLocalPlus(datum,time,addMin){ const m=time.match(/^(\d{1,2}):(\d{2})/); const dt=new Date(datum+"T"+m[1].padStart(2,"0")+":"+m[2]+":00"); dt.setMinutes(dt.getMinutes()+addMin); const p=n=>String(n).padStart(2,"0"); return `${dt.getFullYear()}${p(dt.getMonth()+1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`; }
async function elternKalenderIcs(){
  toast("🗓️ Kalender wird erstellt…");
  const heute=new Date().toISOString().slice(0,10);
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=gte.${heute}&published=eq.true&select=datum,gegner,ort,treffpunkt,anpfiff,typ&order=datum.asc`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){toast("Keine kommenden Termine","err");return;}
  const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SV Adler Dellbrück//U9//DE","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Adler U9 Termine"];
  rows.forEach((m,i)=>{
    const istTr=m.typ==="training";
    const titel=istTr?"Training U9":("Spiel U9"+(m.gegner?" gegen "+m.gegner:""));
    const hasTime=m.anpfiff&&/^\d{1,2}:\d{2}/.test(m.anpfiff);
    lines.push("BEGIN:VEVENT","UID:adler-u9-"+m.datum+"-"+i+"@adler-dellbrueck","DTSTAMP:"+stamp);
    /* „16:45–18:00 Uhr" trägt das Ende schon in sich (seit v406 kommt es aus dem Termin).
       Vorher wurde blind auf 75 bzw. 120 Minuten geschätzt – im Kalender der Eltern stand
       dann eine falsche Endzeit. Nur wenn kein Ende dasteht, wird weiter geschätzt. */
    const ende=hasTime?(/^\d{1,2}:\d{2}\s*[–-]\s*(\d{1,2}:\d{2})/.exec(m.anpfiff)||[])[1]:null;
    if(hasTime){ lines.push("DTSTART:"+icsLocalStart(m.datum,m.anpfiff));
      lines.push("DTEND:"+(ende?icsLocalStart(m.datum,ende):icsLocalPlus(m.datum,m.anpfiff,istTr?75:120))); }
    else{ lines.push("DTSTART;VALUE=DATE:"+m.datum.replace(/-/g,"")); }
    lines.push("SUMMARY:"+icsEscape(titel));
    if(m.ort)lines.push("LOCATION:"+icsEscape(m.ort));
    // Jeden Teil einzeln escapen, dann mit iCal-Zeilenumbruch (\n) verbinden – sonst würde der Umbruch doppelt escaped.
    const descParts=[m.treffpunkt?"Treffpunkt: "+m.treffpunkt:"",m.anpfiff?((istTr?"Beginn: ":"Anpfiff: ")+m.anpfiff):""].filter(Boolean).map(icsEscape);
    if(descParts.length)lines.push("DESCRIPTION:"+descParts.join("\\n"));
    lines.push("BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:"+icsEscape(titel+" morgen"),"END:VALARM");
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const ics=lines.join("\r\n");
  const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});
  try{
    const file=new File([blob],"adler-u9-termine.ics",{type:"text/calendar"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:"Adler U9 Termine"}); return; }
  }catch(e){ if(e&&e.name==="AbortError")return; }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="adler-u9-termine.ics";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast("Kalenderdatei erstellt ✓");
}
// Gebrandeter Ladezustand für alle öffentlichen Eltern-Flächen (statt fadem "Lade...").
function elternLoader(msg){ return `<div style="text-align:center;padding:56px 16px"><img src="logo.png" alt="" style="width:52px;height:52px;animation:adlerPulse 1.3s ease-in-out infinite"><div style="margin-top:14px;font-size:13px;color:#64748b">${elternEsc(msg||"Lädt …")}</div></div>`; }
// Freundlicher, gebrandeter Leer-/Fehlerzustand (Logo + optionales Emoji + Text). msg darf <br> enthalten.
function elternEmpty(msg,emoji){ return `<div class="elt-fade" style="text-align:center;padding:52px 20px"><img src="logo.png" alt="" style="width:54px;height:54px;opacity:.92">${emoji?`<div style="font-size:30px;margin-top:6px">${emoji}</div>`:""}<div style="margin-top:12px;font-size:14px;color:#64748b;line-height:1.55">${msg}</div></div>`; }
/* Persönlicher Kind-Link (?kind=<token>): 1-Tap Zu-/Absage ohne Login.
   Liest/schreibt ausschließlich über die security-definer-RPCs kind_termine / rsvp_by_token. */
let kindRoot=null, kindToken=null;
async function renderKindView(token){
  kindToken=token;
  kindRoot=document.createElement("div");
  kindRoot.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(kindRoot);
  kindRoot.innerHTML=elternLoader("Lädt …");
  await kindLoad();
}
async function kindLoad(){
  let d=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_termine`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:kindToken})});if(r.ok)d=await r.json();}catch(e){}
  if(!d||!d.ok){ kindRoot.innerHTML='<div style="text-align:center;padding:48px;color:#64748b"><img src="logo.png" style="width:56px;height:56px" alt=""><div style="margin-top:12px">Dieser Link ist ungültig oder abgelaufen.<br>Frag den Trainer nach einem neuen. 🦅</div></div>'; return; }
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"];
  const evCard=(t)=>{
    const dt=new Date(t.datum+"T00:00:00");
    const ds=wtag[dt.getDay()]+", "+dt.toLocaleDateString("de-DE",{day:"2-digit",month:"long"});
    const istTr=t.typ==="training";
    const titel=istTr?"Training":("Spiel"+(t.gegner?" gegen "+elternEsc(t.gegner):""));
    const st=t.status;
    const btn=(status,emo,lbl,onCol)=>`<button onclick="kindRsvp(${t.id},'${status}')" style="flex:1;min-height:52px;border:2px solid ${st===status?onCol:'#cbd5e1'};border-radius:12px;background:${st===status?onCol:'#fff'};color:${st===status?'#fff':'#334155'};font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">${emo} ${lbl}</button>`;
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
      <div style="font-size:15px;font-weight:800;color:#1e293b">${istTr?"🏃 ":"⚽ "}${titel}</div>
      <div style="font-size:12.5px;color:#64748b;margin:2px 0 10px">${ds}${t.uhrzeit?" · "+t.uhrzeit+" Uhr":""}${t.ort?" · "+elternEsc(t.ort):""}</div>
      <div style="display:flex;gap:8px">${btn('zugesagt','👍','Dabei','#16a34a')}${btn('abgesagt','👎','Kann nicht','#dc2626')}</div>
    </div>`;
  };
  kindRoot.innerHTML=`<div class="elt-fade">
    <div style="text-align:center;margin:8px 0 16px">
      <img src="logo.png" style="width:60px;height:60px" alt="">
      <div style="font-size:18px;font-weight:800;color:#1e3a8a;margin-top:6px">Hallo! 👋</div>
      <div style="font-size:14px;color:#334155">Sag <b>${elternEsc(d.name)}</b> mit einem Tipp zu oder ab.</div>
    </div>
    ${d.termine&&d.termine.length?d.termine.map(evCard).join(""):'<div style="text-align:center;color:#64748b;background:#fff;border-radius:16px;padding:24px">Aktuell keine anstehenden Termine. 🎉</div>'}
    <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:8px">SV Adler Dellbrück e.V. · persönlicher Link für ${elternEsc(d.name)}</div></div>`;
}
async function kindRsvp(terminId,status){
  if(!kindToken)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/rsvp_by_token`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:kindToken,p_termin_id:terminId,p_status:status})});
    const d=r.ok?await r.json():null;
    if(d&&d.ok){ toast(status==="zugesagt"?"👍 Zugesagt – danke!":"👎 Abgesagt – schade!"); try{navigator.vibrate&&navigator.vibrate(40);}catch(e){} await kindLoad(); }
    else toast("Konnte nicht speichern","err");
  }catch(e){ toast("Netzwerkfehler – bist du online?","err"); }
}
