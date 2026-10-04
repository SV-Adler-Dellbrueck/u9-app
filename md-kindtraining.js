/* md-kindtraining.js · v751 – „Mein Training“ (Kabine) und „Trainingsideen der Kinder“ (Trainer)

   Charles 04.10.: „Es soll auch ein Training theoretisch gestalten können. Wie für einen Trainer,
   aber kindgerecht.“ Kacheln: „Auch an Trainer schicken“, „Beide Stufen bauen“.

   Kindgerecht heißt hier: drei Teile statt fünf Schritte (🔥 Aufwärmen, ⚽ Übung, 🏆 Abschlussspiel),
   Bildkarten statt Listen, Minuten als Knöpfe, kein Textfeld (also kein Name im Freitext) und keine
   Zahl, die bewertet. Jeder Teil ist entweder eine Übung aus der Bibliothek (eingebaute Übungen und
   uebungen/bibliothek.json – die Tabelle trainingsformen dürfen Kinderkonten nicht lesen) oder eine
   eigene Skizze vom Taktikbrett (md-brett.js, v750: auch mit Mitspielern aus dem Team).

   Der Entwurf liegt auf dem Gerät (localStorage je Kind). „An den Trainer schicken“ schreibt eine
   Zeile in kind_training (RLS: eigenes Kind, Kindergerät nur mit Appzeit übrig). Das Trainerteam sieht
   neue Ideen auf der Startseite, öffnet sie, sagt „👍 Danke“ – das sieht das Kind unter
   „Schon geschickt“. */

/* Charles 04.10.: „Die Kinder sollten nur eine kleine Anzahl an einfachen Übungen zur Auswahl bekommen,
   sonst wird es viel zu viel.“ Kachel: feste Auswahl, höchstens fünf je Teil – Übungen, die die Kinder aus
   dem Training kennen. Fehlt eine (umbenannt, gelöscht), fällt sie still weg. */
const KT_TEILE=[
  {art:"aufwaermen", emo:"🔥", name:"Aufwärmen", min:10,
   wahl:["Warm up Adler","Adler 1 – Aktivierung","Adler 2 – Dribbelstaffel","Hai & Fische","Zombieball"]},
  {art:"uebung",     emo:"⚽", name:"Übung", min:15,
   wahl:["Doppelpass durch die Stangen","Stangentausch","Adler 3 – Passen mit Klatschen","Adler 4 – Passen und Torschuss","Zwei Torarten – Schuss oder Dribbling"]},
  {art:"abschluss",  emo:"🏆", name:"Abschlussspiel", min:15,
   wahl:["FUNiño 1 gegen 1 – vorbei, dann das freie Minitor","Abschlussspiel – 3+1 gegen 3+1 Raute mit Countdown","Eishockey-Reihentausch – 6 gegen 6 in zwei Reihen","Korb-Chaos-Funino (360°-Variante)","Endzone und Fähnchen"]}
];
const KT_MINUTEN=[5,10,15,20];
let _kt=null;   // {sid, name, teile:[…3], geschickt:[…]}
let _ktBib=null;

/* ── Übungen, die ein Kind aussuchen kann ──────────────────────────────────────────── */
async function _ktUebungen(){
  if(_ktBib)return _ktBib;
  const eingebaut=(typeof TRAININGSFORMEN!=="undefined"&&Array.isArray(TRAININGSFORMEN))?TRAININGSFORMEN:[];
  let bib=[];
  try{ const r=await fetch("uebungen/bibliothek.json",{cache:"no-store"}); if(r.ok){ const d=await r.json(); bib=Array.isArray(d.uebungen)?d.uebungen:[]; } }catch(e){}
  // Gleicher Name in beiden Quellen: der Eintrag mit Skizze gewinnt (die Bibliothek hat sie meist)
  const nachName=new Map();
  eingebaut.concat(bib).forEach(u=>{
    if(!u||!u.name)return;
    if(/^Lehrgang /.test(u.name))return;                 // Lehrgangsformen für Erwachsene gehören nicht in die Kabine
    const neu={name:u.name, kat:String(u.kat||""), kurz:String(u.kurz||u.beschreibung||""), skizze:u.skizze||null};
    const alt=nachName.get(u.name);
    if(!alt||(!alt.skizze&&neu.skizze))nachName.set(u.name,neu);
  });
  const alle=[...nachName.values()];
  _ktBib=alle;
  return alle;
}
function _ktSkizze(u){
  if(u&&u.skizze&&typeof _skz==="function"){ try{ return _skz(u.skizze); }catch(e){} }
  return `<div class="kt-ohne" aria-hidden="true">⚽</div>`;
}
function _ktTeilBild(t){
  if(!t)return "";
  if(t.brett&&typeof brettBild==="function")return brettBild(t.brett,{label:"Eigene Übung"});
  const u=(_ktBib||[]).find(x=>x.name===t.uebung);
  return _ktSkizze(u);
}

/* ── Kabine ────────────────────────────────────────────────────────────────────────── */
function kabineMeinTraining(){
  const kids=window._elternKids||[];
  if(kids.length===1){ ktOpen(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  if(typeof kabinePickKid==="function")kabinePickKid("📋 Wessen Training?","ktOpen");
}
function _ktSchluessel(sid){ return "adler-mein-training-"+Number(sid); }
function _ktLaden(sid){
  try{ const t=JSON.parse(localStorage.getItem(_ktSchluessel(sid))||"null"); if(Array.isArray(t)&&t.length===3)return t; }catch(e){}
  return [null,null,null];
}
function _ktMerken(){ if(!_kt)return; try{ localStorage.setItem(_ktSchluessel(_kt.sid), JSON.stringify(_kt.teile)); }catch(e){} }
async function ktOpen(sid,name){
  _kt={sid:Number(sid), name:String(name||""), teile:_ktLaden(sid), geschickt:[]};
  if(typeof kabSubMark==="function")kabSubMark();
  await _ktUebungen();
  ktRender();
  _ktGeschicktLaden();
}
function ktRender(){
  const b=document.getElementById("kabine-body"); if(!b||!_kt)return;
  const summe=_kt.teile.reduce((a,t)=>a+(t?Number(t.minuten)||0:0),0);
  const voll=_kt.teile.some(Boolean);
  const karten=KT_TEILE.map((d,i)=>{
    const t=_kt.teile[i];
    if(!t)return `<section class="kt-teil" aria-label="${d.name}">
        <div class="kt-kopf"><span aria-hidden="true">${d.emo}</span> ${i+1}. ${d.name}</div>
        <div class="kt-knoepfe">
          <button type="button" class="btn kt-btn" onclick="ktWahl(${i})">📚 Übung aussuchen</button>
          <button type="button" class="btn kt-btn" onclick="ktZeichnen(${i})">✏️ Selbst zeichnen</button>
        </div></section>`;
    const titel=t.brett?"Meine eigene Übung":t.uebung;
    return `<section class="kt-teil kt-voll" aria-label="${d.name}">
        <div class="kt-kopf"><span aria-hidden="true">${d.emo}</span> ${i+1}. ${d.name}</div>
        <div class="kt-zeile"><div class="kt-bild">${_ktTeilBild(t)}</div>
          <div class="kt-info"><div class="kt-name">${esc(titel)}</div>
            <div class="kt-min" role="group" aria-label="Wie lange?">${KT_MINUTEN.map(m=>`<button type="button" class="btn kt-mbtn" aria-pressed="${Number(t.minuten)===m}" onclick="ktMinuten(${i},${m})">${m} Min.</button>`).join("")}</div>
          </div></div>
        <div class="kt-knoepfe">
          <button type="button" class="btn kt-btn" onclick="${t.brett?`ktZeichnen(${i})`:`ktWahl(${i})`}">🔄 Ändern</button>
          <button type="button" class="btn kt-btn" onclick="ktWeg(${i})">🗑️ Weg</button>
        </div></section>`;
  }).join("");
  b.innerHTML=`<div class="kt-seite">
    <div class="br-kabkopf"><button type="button" class="br-zu" onclick="ktZu()" aria-label="Zurück zur Kabine">←</button>
      <div class="br-titel">📋 Mein Training</div></div>
    <div class="kt-rumpf">
      <p class="kt-intro">Plane dein eigenes Training – wie ein Trainer! Such für jeden Teil eine Übung aus oder zeichne selbst eine.</p>
      ${karten}
      <div class="kt-summe" role="status">⏱️ ${summe} Minuten${summe?" · 💧 Denk an Trinkpausen!":""}</div>
      <div class="kt-aktionen">
        <button type="button" class="btn kt-haupt" onclick="ktSchicken()" ${voll?"":"disabled"}>📨 An den Trainer schicken</button>
        <button type="button" class="btn kt-btn" onclick="ktZeigen()" ${voll?"":"disabled"}>👀 Groß zeigen</button>
      </div>
      <div id="kt-geschickt"></div>
    </div></div>`;
  _ktGeschicktRender();
}
function ktZu(){ _kt=null; if(typeof kabineHome==="function")kabineHome(); }
function ktMinuten(i,m){ if(!_kt||!_kt.teile[i]||!KT_MINUTEN.includes(m))return; _kt.teile[i].minuten=m; _ktMerken(); ktRender(); }
function ktWeg(i){ if(!_kt)return; _kt.teile[i]=null; _ktMerken(); ktRender(); }

function ktWahl(i){
  if(!_kt)return; ktWahlZu();
  const d=KT_TEILE[i];
  const liste=d.wahl.map(n=>(_ktBib||[]).find(u=>u.name===n)).filter(Boolean);
  const w=document.createElement("div");
  w.id="kt-wahl"; w.className="kt-wahl"; w.setAttribute("role","dialog"); w.setAttribute("aria-modal","true"); w.setAttribute("aria-labelledby","kt-wahl-t");
  w.innerHTML=`<div class="kt-wahl-box">
      <div class="kt-wahl-kopf"><div id="kt-wahl-t" class="br-titel">${d.emo} ${d.name}: Was spielen wir?</div>
        <button type="button" class="br-zu" onclick="ktWahlZu()" aria-label="Schließen">✕</button></div>
      <div class="kt-karten">${liste.length?liste.map((u,k)=>`<button type="button" class="kt-karte" onclick="ktNimm(${i},${k})">
          <span class="kt-kbild">${_ktSkizze(u)}</span><span class="kt-kname">${esc(u.name)}</span>
          <span class="kt-kkurz">${esc(u.kurz.length>90?u.kurz.slice(0,88)+" …":u.kurz)}</span></button>`).join("")
        :`<div class="kt-leer">Gerade keine Übungen da – zeichne doch selbst eine!</div>`}</div>
    </div>`;
  w._liste=liste;
  document.getElementById("kabine-body").appendChild(w);
  setTimeout(()=>w.querySelector(".kt-karte,.br-zu")?.focus(),30);
}
function ktWahlZu(){ document.getElementById("kt-wahl")?.remove(); }
function ktNimm(i,k){
  const w=document.getElementById("kt-wahl"); if(!_kt||!w||!w._liste||!w._liste[k])return;
  const alt=_kt.teile[i];
  _kt.teile[i]={art:KT_TEILE[i].art, uebung:w._liste[k].name, minuten:(alt&&alt.minuten)||KT_TEILE[i].min};
  _ktMerken(); ktWahlZu(); ktRender();
}
function ktZeichnen(i){
  if(!_kt||typeof brettKabine!=="function")return;
  const b=document.getElementById("kabine-body"); if(!b)return;
  const alt=_kt.teile[i], d=KT_TEILE[i];
  brettKabine(b,{titel:`${d.emo} ${d.name}: meine Übung`, stand:alt&&alt.brett?alt.brett:null,
    fertig:stand=>{ if(!_kt)return; _kt.teile[i]={art:d.art, brett:stand, minuten:(alt&&alt.minuten)||d.min}; _ktMerken(); ktRender(); },
    zurueck:()=>ktRender()});
}

function ktZeigen(){
  if(!_kt)return; ktZeigenZu();
  const summe=_kt.teile.reduce((a,t)=>a+(t?Number(t.minuten)||0:0),0);
  const v=document.createElement("div");
  v.id="kt-zeigen"; v.className="kt-zeigen"; v.setAttribute("role","dialog"); v.setAttribute("aria-modal","true"); v.setAttribute("aria-labelledby","kt-zeigen-t");
  v.innerHTML=`<div class="kt-wahl-kopf"><div id="kt-zeigen-t" class="br-titel">📋 Training von ${esc((_kt.name||"").split(/\s+/)[0]||"mir")}</div>
      <button type="button" class="br-zu" onclick="ktZeigenZu()" aria-label="Schließen">✕</button></div>
    <div class="kt-zeigen-teile">${KT_TEILE.map((d,i)=>{ const t=_kt.teile[i]; if(!t)return "";
      return `<div class="kt-zteil"><div class="kt-kopf">${d.emo} ${d.name} · ${Number(t.minuten)} Min.</div>
        <div class="kt-zbild">${_ktTeilBild(t)}</div><div class="kt-name">${esc(t.brett?"Meine eigene Übung":t.uebung)}</div></div>`; }).join("")}</div>
    <div class="kt-summe">⏱️ ${summe} Minuten</div>`;
  document.getElementById("kabine-body").appendChild(v);
  setTimeout(()=>v.querySelector(".br-zu")?.focus(),30);
}
function ktZeigenZu(){ document.getElementById("kt-zeigen")?.remove(); }

async function ktSchicken(){
  if(!_kt)return;
  const teile=_kt.teile.filter(Boolean).map(t=>t.brett?{art:t.art,brett:t.brett,minuten:Number(t.minuten)}:{art:t.art,uebung:t.uebung,minuten:Number(t.minuten)});
  if(!teile.length)return;
  const knopf=document.querySelector(".kt-haupt"); if(knopf)knopf.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_training`,{method:"POST",headers:sbAuthHeaders({Prefer:"return=minimal"}),body:JSON.stringify({spieler_id:_kt.sid,teile})});
    if(!r.ok){
      const txt=await r.text().catch(()=>"");
      toast(/zu viele/.test(txt)?"Dein Trainer hat noch viele Trainings von dir zu lesen – warte, bis er sie angeschaut hat.":/row-level|policy/.test(txt)?"Für heute ist deine App-Zeit vorbei – schick es morgen!":"Das hat nicht geklappt – versuch es gleich nochmal.","err");
      if(knopf)knopf.disabled=false; return;
    }
    toast("📨 Geschickt! Dein Trainer bekommt dein Training.","ok");
    if(typeof confetti==="function"&&knopf)confetti(knopf);
    _ktGeschicktLaden();
  }catch(e){ toast("Keine Verbindung – versuch es gleich nochmal.","err"); }
  if(knopf)knopf.disabled=false;
}
async function _ktGeschicktLaden(){
  if(!_kt)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_training?spieler_id=eq.${_kt.sid}&select=id,created_at,gesehen_am,danke_am,teile&order=created_at.desc&limit=10`,{headers:sbAuthHeaders()});
    if(r.ok&&_kt){ _kt.geschickt=await r.json(); _ktGeschicktRender(); }
  }catch(e){}
}
function _ktGeschicktRender(){
  const box=document.getElementById("kt-geschickt"); if(!box||!_kt)return;
  const g=_kt.geschickt||[];
  if(!g.length){ box.innerHTML=""; return; }
  box.innerHTML=`<div class="kt-ab">Schon geschickt</div>`+g.map(x=>{
    const dat=new Date(x.created_at), wann=dat.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
    const status=x.danke_am?"👍 Danke vom Trainer!":x.gesehen_am?"👀 Dein Trainer hat es angeschaut":"📨 Unterwegs zum Trainer";
    return `<div class="kt-gzeile"><span>${wann} · ${(x.teile||[]).length} Teil${(x.teile||[]).length===1?"":"e"}</span><span class="kt-status">${status}</span></div>`;
  }).join("");
}

/* ── Trainer: Trainingsideen der Kinder ────────────────────────────────────────────── */
let _ktIdeen=[];
async function kindTrainingHomeKarte(slotId){
  const slot=document.getElementById(slotId); if(!slot)return;
  try{
    const seit=new Date(Date.now()-45*864e5).toISOString();
    const r=await fetch(`${SB_URL}/rest/v1/kind_training?created_at=gte.${seit}&select=id,spieler_id,created_at,gesehen_am,danke_am,teile&order=created_at.desc&limit=60`,{headers:sbAuthHeaders()});
    if(!r.ok){ slot.innerHTML=""; return; }
    _ktIdeen=await r.json();
  }catch(e){ slot.innerHTML=""; return; }
  const neu=_ktIdeen.filter(x=>!x.gesehen_am).length;
  if(!neu){ slot.innerHTML=""; return; }
  slot.innerHTML=`<button type="button" class="abschnitt kt-homekarte" onclick="kindTrainingListe()" style="width:100%;text-align:left;display:flex;align-items:center;gap:10px;min-height:56px;margin-bottom:10px;border-left:4px solid var(--fam-training);cursor:pointer;font-family:inherit">
      <span style="font-size:var(--s-seite)" aria-hidden="true">📋</span>
      <span style="flex:1"><b>Trainingsideen der Kinder</b><br><span style="font-size:var(--s-klein);color:var(--text2)">${neu} neu – ein Kind hat dir ein Training geschickt</span></span>
      <span aria-hidden="true">›</span></button>`;
}
function _ktVorname(sid){
  const k=(typeof KADER!=="undefined"&&Array.isArray(KADER))?KADER.find(x=>Number(x.id)===Number(sid)):null;
  return k?String(k.name||"").trim().split(/\s+/)[0]:"Ein Kind";
}
async function kindTrainingListe(){
  kindTrainingListeZu();
  await _ktUebungen();
  if(!_ktIdeen.length){
    try{ const r=await fetch(`${SB_URL}/rest/v1/kind_training?select=id,spieler_id,created_at,gesehen_am,danke_am,teile&order=created_at.desc&limit=60`,{headers:sbAuthHeaders()}); if(r.ok)_ktIdeen=await r.json(); }catch(e){}
  }
  const m=document.createElement("div");
  m.id="kt-liste"; m.className="modal"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","kt-liste-t");
  m.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);width:100%;max-width:640px;max-height:88vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div id="kt-liste-t" style="flex:1;font-size:var(--s-teil);font-weight:800">📋 Trainingsideen der Kinder</div>
        <button type="button" class="btn" onclick="kindTrainingListeZu()" aria-label="Schließen" style="min-width:44px">✕</button></div>
      <p style="font-size:var(--s-klein);color:var(--text2);margin:0 0 10px">Die Kinder planen in der Kabine ein Training aus drei Teilen. „👍 Danke“ sieht das Kind.</p>
      ${_ktIdeen.length?_ktIdeen.map(x=>{
        const wann=new Date(x.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
        const summe=(x.teile||[]).reduce((a,t)=>a+(Number(t.minuten)||0),0);
        return `<div class="abschnitt" style="margin-bottom:10px" id="kt-idee-${Number(x.id)}">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="flex:1">${esc(_ktVorname(x.spieler_id))} · ${wann} · ${summe} Min.</b>
            ${x.danke_am?`<span class="chip geliefert">👍 bedankt</span>`:x.gesehen_am?`<span class="chip neutral">gesehen</span>`:`<span class="chip offen">neu</span>`}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px">
            ${(x.teile||[]).map(t=>{ const d=KT_TEILE.find(k=>k.art===t.art)||KT_TEILE[1];
              return `<div><div style="font-size:var(--s-klein);font-weight:800">${d.emo} ${d.name} · ${Number(t.minuten)} Min.</div>
                <div style="max-width:150px">${_ktTeilBild(t)}</div><div style="font-size:var(--s-klein)">${esc(t.brett?"Eigene Skizze":t.uebung)}</div></div>`; }).join("")}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            ${x.danke_am?"":`<button type="button" class="btn" onclick="kindTrainingDanke(${Number(x.id)})">👍 Danke sagen</button>`}
            <button type="button" class="btn" onclick="kindTrainingLoeschen(${Number(x.id)})">🗑️ Löschen</button>
          </div></div>`; }).join("")
      :`<div style="color:var(--text2)">Noch keine Trainingsideen. Die Kinder finden „📋 Mein Training“ in der Kabine unter „Mehr entdecken“.</div>`}
    </div>`;
  document.body.appendChild(m);
  m.addEventListener("click",e=>{ if(e.target===m)kindTrainingListeZu(); });
  // Geöffnet = gesehen
  const neu=_ktIdeen.filter(x=>!x.gesehen_am).map(x=>Number(x.id));
  if(neu.length){
    try{ await fetch(`${SB_URL}/rest/v1/kind_training?id=in.(${neu.join(",")})`,{method:"PATCH",headers:sbAuthHeaders({Prefer:"return=minimal"}),body:JSON.stringify({gesehen_am:new Date().toISOString()})}); }catch(e){}
    _ktIdeen.forEach(x=>{ if(!x.gesehen_am)x.gesehen_am=new Date().toISOString(); });
  }
}
function kindTrainingListeZu(){
  const m=document.getElementById("kt-liste"); if(!m)return; m.remove();
  if(typeof kindTrainingHomeKarte==="function"&&document.getElementById("home-kindideen"))kindTrainingHomeKarte("home-kindideen");
}
async function kindTrainingDanke(id){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_training?id=eq.${Number(id)}`,{method:"PATCH",headers:sbAuthHeaders({Prefer:"return=minimal"}),body:JSON.stringify({danke_am:new Date().toISOString(),gesehen_am:new Date().toISOString()})});
    if(!r.ok){ toast("Danke nicht gespeichert","err"); return; }
    const x=_ktIdeen.find(y=>Number(y.id)===Number(id)); if(x)x.danke_am=new Date().toISOString();
    toast("👍 Das Kind sieht dein Danke","ok"); kindTrainingListe();
  }catch(e){ toast("Keine Verbindung","err"); }
}
async function kindTrainingLoeschen(id){
  const ok=(typeof frageJaNein==="function")?await frageJaNein({titel:"Trainingsidee löschen?",text:"Das Kind sieht sie danach auch nicht mehr unter „Schon geschickt“.",ja:"Löschen",ton:"rot",emoji:"🗑️"}):confirm("Trainingsidee löschen?");
  if(!ok)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_training?id=eq.${Number(id)}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok){ toast("Nicht gelöscht","err"); return; }
    _ktIdeen=_ktIdeen.filter(y=>Number(y.id)!==Number(id)); kindTrainingListe();
  }catch(e){ toast("Keine Verbindung","err"); }
}

function ktModulDa(){ return true; }
