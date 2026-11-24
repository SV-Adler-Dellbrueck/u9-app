/* ═══ v670 – ADLER-RUFE: der Team-Chat für Eltern und Trainer (Stufe 1) ══════════════════
   Beschluss 29.09. (Kachelrunden): offener Gruppenchat statt nur Ansagen; ein Raum zum Start,
   Moderatoren (Trainer, Elternbeirat) legen weitere an. Antworten mit Zitat, Reaktionen, bis zu
   drei fixierte Rufe mit Ablauf (Signal-Modell), @alle nur für Moderatoren, Bearbeiten, Suche.
   Moderation: melden, stummschalten, archivieren statt löschen – archivierte Rufe sehen nur
   Trainer. Kinder haben keinen Zugang; Name und Rolle setzt die Datenbank, nicht das Gerät.
   Push seit v673: Edge Function rufe-push (alle 5 Minuten), Entscheidung in rufe_push_faellig().
   Stufe 2 seit v674: ein privater Raum je Familie mit dem Trainerteam (🔒, Moderatoren aus der
   Elternschaft lesen dort nicht mit) und Abstimmungen – namentlich oder anonym, eine oder mehrere
   Antworten, auf Wunsch mit Schluss. Anlegen, abstimmen, beenden nur über RPC.

   Datenweg: Tabellen rufe_* mit RLS (Migration 20260929_v670_adler_rufe.sql). Bearbeiten und
   Archivieren nur über RPC. Keine Systemdialoge – alle Rückfragen sind eigene Fenster.

   v748 (Auftrag als v736 gebaut; doku/auftrag-rufe-anhaenge): 5.000 Zeichen je Ruf, lange Rufe gekürzt mit „Weiterlesen“, Anhänge
   (Bilder, PDF, Word, Excel, PowerPoint; 10 MB, vier je Ruf) im privaten Bucket rufe-anhang. Gesendet wird
   mit Anhängen über rufe_senden (Ruf und Anhänge in einem Aufruf); Bilder zeigt die Blase als Miniatur,
   PDF öffnet im neuen Tab, Office wird heruntergeladen – nie in der App gerendert. Trainer können Anhänge
   endgültig löschen (rufe_anhaenge_loeschen). Migration 20261004_v736_rufe_anhaenge.sql. */
const RUFE_EMOJI=["👍","❤️","😂","😮","🙏","⚽"];   // v964: wie bei den großen Messengern, dazu der Ball
/* v964 · Charles 24.11.2026 (Entwurf freigegeben): „Der Chat sieht irgendwie sehr altbacken aus … soll einfach moderner wirken, einfacher
   in der Handhabung.“ Blasen mit Gruppierung und Initialen, schlanker Kopf, Reiter mit Zählern, eine Zeile für fixierte Rufe, runde
   Eingabe mit 📎-Menü und Emoji-Leiste, langes Drücken öffnet Reaktionen und Aktionen, nach rechts wischen antwortet, @Erwähnen mit
   Benachrichtigung, Reiter „Für mich“, Glocke mit drei Stufen, Abstimmung „Ergebnis erst am Schluss“. Kennungen und Funktionsnamen
   bleiben wie vorher – die Prüfungen und andere Module greifen darauf zu. */
const RUFE_EMOJI_LEISTE=["👍","❤️","😂","🙏","⚽","🏆","👏","🎉","😊","💪","🔥","🦅"];
const RUFE_TAKT=8000;          // Nachladen, solange das Fenster offen ist
const RUFE_ANZAHL=80;          // so viele Rufe je Raum auf einmal
const RUFE_MAX_TEXT=5000;      // v736: CHECK rufe_nachricht_text_check und rufe_bearbeiten
const RUFE_LANG=800;           // ab hier zeigt die Blase gekürzt mit „Weiterlesen“
const RUFE_ANHANG_MAX=4, RUFE_ANHANG_BYTES=10485760;
const RUFE_ANHANG_TYPEN={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",heic:"image/heic",pdf:"application/pdf",
  doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"};
let _rf=null;

function _rfUid(){ try{const t=sbToken();return t?JSON.parse(atob(t.split(".")[1])).sub:null;}catch(e){return null;} }
async function _rfGet(pfad){
  try{const r=await fetch(`${SB_URL}/rest/v1/${pfad}`,{headers:sbAuthHeaders()}); return r.ok?await r.json():[];}catch(e){return [];}
}
async function _rfRpc(name,body){
  const r=await fetch(`${SB_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  return r;
}
function _rfZeit(ts){ const d=new Date(ts); return d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}); }
function _rfTag(ts){
  const d=new Date(ts), h=new Date(); const g=new Date(h); g.setDate(h.getDate()-1);
  const gleich=(a,b)=>a.toDateString()===b.toDateString();
  return gleich(d,h)?"Heute":gleich(d,g)?"Gestern":d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
}
/* Text sicher darstellen: erst maskieren, dann @Namen hervorheben und Zeilen umbrechen. */
function _rfText(t){
  return esc(String(t||"")).replace(/(^|\s)(@[\wÄÖÜäöüß-]+)/g,'$1<b class="rf-at">$2</b>').replace(/\n/g,"<br>");
}
function _rfZ(n){ return (typeof zOben==="function")?zOben(n):n; }

/* ── Öffnen ───────────────────────────────────────────────────────────────────── */
async function rufeOpen(raumId){ try{ return await _rufeOpen(raumId); }catch(e){ console.error(e); toast("Adler-Rufe: "+(e&&e.message||"Fehler beim Öffnen"),"err"); } }
async function _rufeOpen(raumId){
  if(typeof sbToken==="function"&&!sbToken()){ toast("Bitte zuerst anmelden","err"); return; }
  document.getElementById("rufe-modal")?.remove();
  _rf={raeume:[],raum:null,liste:[],reakt:[],fix:[],mod:false,uid:_rfUid(),antwort:null,suche:"",timer:null,letzte:null,
       trainer:/\/trainer\//.test(location.pathname),umf:{},stand:{},unge:{},fam:{},dateien:[],offen:new Set(),blobs:{}};
  const m=document.createElement("div"); m.id="rufe-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Adler-Rufe");
  m.style.cssText="position:fixed;inset:0;background:var(--bg,#f1f5f9);display:flex;flex-direction:column";
  m.style.zIndex=_rfZ(10003);
  m.classList.add("rf-neu");
  m.innerHTML=`<div class="rf-kopf">
      <button type="button" onclick="rufeClose()" aria-label="Schließen" class="rf-kopf-knopf rf-zurueck">←</button>
      <span class="rf-kopf-bild" id="rufe-kopf-bild" aria-hidden="true">📣</span>
      <div style="flex:1;min-width:0"><div class="rf-kopf-titel">Adler-Rufe</div>
        <div id="rufe-unter" class="rf-kopf-unter">Eltern und Trainerteam</div></div>
      <button type="button" id="rufe-suche-knopf" onclick="rufeSucheUmschalten()" aria-label="Suchen" class="rf-kopf-knopf">🔍</button>
      <button type="button" id="rufe-glocke" onclick="rufeGlockeMenue()" aria-label="Benachrichtigungen zu Adler-Rufen" aria-pressed="true" class="rf-kopf-knopf">🔔</button>
      ${/\/trainer\//.test(location.pathname)?`<button type="button" id="rufe-mod-knopf" onclick="rufeModOpen()" aria-label="Moderieren" title="Moderieren: wer moderiert, gemeldete Rufe" class="rf-kopf-knopf">🛡️</button>`:""}
    </div>
    <div id="rufe-raeume" class="rf-reiter"></div>
    <div id="rufe-ruhe" class="rf-ruhe">${rufeRuhezeitText(true,_rf.trainer)}</div>
    <div id="rufe-suche" style="display:none" class="rf-suche">
      <label for="rufe-suche-feld" style="position:absolute;left:-9999px">Rufe durchsuchen</label>
      <input id="rufe-suche-feld" type="search" placeholder="Rufe durchsuchen …" oninput="rufeSucheSetzen(this.value)" class="rf-suche-feld">
    </div>
    <div id="rufe-name" style="flex:none"></div>
    <div id="rufe-fix" style="flex:none"></div>
    <div id="rufe-liste" aria-live="polite" class="rf-liste"><div style="color:var(--text2);font-size:var(--s-text);padding:12px 0">Lade Rufe …</div></div>
    <button type="button" id="rufe-runter" class="rf-runter" onclick="rufeRunter()" aria-label="Zu den neuesten Rufen" hidden>⌄<span id="rufe-runter-zahl" class="rf-runter-zahl" hidden></span></button>
    <div class="rf-eingabe">
      <div id="rufe-antwort" style="display:none"></div>
      <div id="rufe-erw-liste" class="rf-erw-liste" role="listbox" aria-label="Wen erwähnen?" hidden></div>
      <div id="rufe-emoji-leiste" class="rf-emoji-leiste" hidden>${RUFE_EMOJI_LEISTE.map(e=>`<button type="button" onclick="rufeEmojiEinfuegen('${e}')" aria-label="${e} einfügen">${e}</button>`).join("")}</div>
      <div id="rufe-chips" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:6px"></div>
      <div id="rufe-offen-hinweis" style="display:none;font-size:var(--s-klein);color:var(--text2);margin:0 0 6px">Offener Raum – alle Eltern lesen mit. Bitte keine Fotos anderer Kinder.</div>
      <input id="rufe-datei" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onchange="rufeDateiWahl(this)" style="display:none">
      <button type="button" id="rufe-umfrage-knopf" onclick="rufeUmfrageNeu()" hidden>📊</button>
      <div class="rf-zeile">
        <div class="rf-feld">
          <label for="rufe-text" style="position:absolute;left:-9999px">Ruf schreiben</label>
          <textarea id="rufe-text" rows="1" maxlength="5000" placeholder="Ruf schreiben …" oninput="rufeTextWachsen(this)" onkeydown="rufeTasteImFeld(event)" class="rf-textfeld"></textarea>
          <button type="button" id="rufe-emoji-knopf" onclick="rufeEmojiUmschalten()" aria-label="Emoji einfügen" aria-expanded="false" class="rf-feld-knopf">😊</button>
          <button type="button" id="rufe-anhang-knopf" onclick="rufeAnhangMenue()" aria-label="Anhängen: Foto, Datei oder Abstimmung" title="Foto, Datei oder Abstimmung" class="rf-feld-knopf">📎</button>
        </div>
        <button type="button" id="rufe-senden" class="rf-senden" onclick="rufeSenden()" aria-label="Senden">➤</button>
      </div>
      <div id="rufe-zaehler" aria-live="polite" style="display:none;font-size:var(--s-klein);color:var(--text2);margin-top:4px;text-align:right"></div>
    </div>`;
  document.body.appendChild(m);
  const [raeume,modR]=await Promise.all([
    _rfRaeumeHolen(),
    _rfRpc("is_rufe_mod").then(r=>r.ok?r.json():false).catch(()=>false)
  ]);
  if(!_rf)return;
  _rf.raeume=raeume; _rf.mod=modR===true;
  _rf.raum=(raeume.find(r=>String(r.id)===String(raumId))||raeume.find(r=>!r.familie_kind)||raeume[0]||{}).id||null;
  await _rfFamilienLaden();
  if(!_rf.raum){ document.getElementById("rufe-liste").innerHTML=`<div style="color:var(--text2);padding:12px 0">Die Adler-Rufe sind für Eltern mit Zugang und das Trainerteam.</div>`; return; }
  rufeRaeumeRender();
  rufeGlockeLaden();
  _rfUngelesenLaden();
  rufeFuerMichLaden();   // v964
  if(!_rf.trainer){   // v935: Familienraum mit zwei Konten → Raum „nur ich“ anbieten; einmal nach dem Namen fragen
    const fam=_rf.raeume.find(r=>r.familie_kind&&!r.eltern_email); if(fam)_rfMitleserLaden(fam.id);
    _rfNameFragen();
  }
  await rufeLaden(true);
  _rf.timer=setInterval(()=>{ if(!document.getElementById("rufe-modal")){ rufeClose(); return; } if(!document.hidden)rufeLaden(false); },RUFE_TAKT);
}
function rufeClose(){
  if(_rf&&_rf.timer)clearInterval(_rf.timer);
  if(_rf){ try{ Object.values(_rf.blobs||{}).forEach(u=>URL.revokeObjectURL(u)); (_rf.dateien||[]).forEach(d=>d.vorschau&&URL.revokeObjectURL(d.vorschau)); }catch(e){} }
  if(_rfBeob){ try{_rfBeob.disconnect();}catch(e){} _rfBeob=null; }
  document.getElementById("rufe-gross")?.remove();
  document.getElementById("rufe-modal")?.remove();
  document.getElementById("rufe-menue")?.remove();
  _rf=null;
  if(typeof rufeBadgeLoad==="function")rufeBadgeLoad();
}
/* v829: nur_eltern kennzeichnet den Raum ohne Trainerteam. Gibt es die Spalte noch nicht (Migration fehlt),
   antwortet die Datenbank mit 400 – dann gilt die alte Abfrage, damit die Rufe weiter öffnen. */
async function _rfRaeumeHolen(){
  const basis="rufe_raum?archiviert=eq.false&order=sort.asc,id.asc&select=id,name,emoji,sort,familie_kind";
  try{ const r=await fetch(`${SB_URL}/rest/v1/${basis},nur_eltern,eltern_email`,{headers:sbAuthHeaders()}); if(r.ok)return await r.json(); }catch(e){}   // v935
  try{ const r=await fetch(`${SB_URL}/rest/v1/${basis},nur_eltern`,{headers:sbAuthHeaders()}); if(r.ok)return await r.json(); }catch(e){}
  return _rfGet(basis);
}
/* v674: Familien für das Trainerteam – Kinder, die sich ein Elternkonto teilen, sind eine Familie.
   Schlüssel ist die kleinste Kind-Kennung (wie rufe_familie in der Datenbank). */
async function _rfFamilienLaden(){
  if(!_rf||!_rf.trainer)return;
  const [ek,kader]=await Promise.all([_rfGet("eltern_kinder?select=email,spieler_id"),_rfGet("kader?select=id,name")]);
  if(!_rf)return;
  const name={}; kader.forEach(k=>name[k.id]=k.name);
  const kinderJeMail={}; ek.forEach(x=>{ const m=(x.email||"").toLowerCase(); (kinderJeMail[m]=kinderJeMail[m]||new Set()).add(x.spieler_id); });
  const fam={};
  ek.forEach(x=>{
    const geschw=new Set(); ek.filter(y=>y.spieler_id===x.spieler_id).forEach(y=>(kinderJeMail[(y.email||"").toLowerCase()]||[]).forEach(k=>geschw.add(k)));
    const key=Math.min(...geschw); fam[key]=fam[key]||new Set(); geschw.forEach(k=>fam[key].add(k));
  });
  _rf.fam={}; Object.keys(fam).forEach(k=>{ _rf.fam[k]=[...fam[k]].map(id=>name[id]).filter(Boolean).sort((a,b)=>a.localeCompare(b,"de")).join(" & ")||"Familie"; });
  /* v935: Elternkonten je Familie (Name aus „Meine Angaben“, sonst Einladung, sonst „Elternteil n“) – für „Nur …“ */
  _rf.konten={};
  try{ (await _rfGet("rpc/rufe_elternkonten")).forEach(x=>{ (_rf.konten[x.familie_kind]=_rf.konten[x.familie_kind]||[]).push({mail:x.mail,name:x.name}); }); }catch(e){}
}
/* v935: Name des Elternteils eines Einzelraums (Trainer) */
function _rfKontoName(r){
  if(!r||!r.eltern_email||!_rf||!_rf.konten)return "";
  const k=(_rf.konten[r.familie_kind]||[]).find(x=>x.mail===String(r.eltern_email).toLowerCase());
  return k?k.name:"Elternteil";
}
function _rfRaumName(r){
  if(!r)return "";
  if(r.familie_kind&&r.eltern_email)return _rf&&_rf.trainer?"👤 "+_rfKontoName(r)+" · "+(_rf.fam[r.familie_kind]||"Familie"):"🔒 Trainerteam · nur ich";   // v935
  if(r.familie_kind)return "🔒 "+(_rf&&_rf.trainer?(_rf.fam[r.familie_kind]||"Familie"):"Trainerteam"+(_rf&&_rf.zweiKonten?" · Familie":""));
  return (r.emoji||"💬")+" "+r.name;
}
function _rfAktRaum(){ return _rf?_rf.raeume.find(r=>r.id===_rf.raum)||null:null; }
function rufeTextWachsen(t){
  if(t.id==="rufe-text")rufeErwPruefen(t);   // v964
  t.style.height="auto"; t.style.height=Math.min(140,t.scrollHeight)+"px";
  // v736: ab 4.500 Zeichen ein Zähler unter dem Feld
  const z=document.getElementById("rufe-zaehler"); if(!z||t.id!=="rufe-text")return;
  const rest=RUFE_MAX_TEXT-t.value.length;
  z.style.display=t.value.length>=4500?"block":"none"; z.textContent=`Noch ${Math.max(0,rest)} Zeichen`;
}

function rufeRaeumeRender(){
  const box=document.getElementById("rufe-raeume"); if(!box||!_rf)return;
  /* v964: schlanke Reiter auf dem blauen Kopf; Ungelesenes als roter Zähler */
  const chip=(an,txt,on,label)=>`<button type="button" class="rf-tab" onclick="${on}" aria-pressed="${an}" ${label?`aria-label="${label}"`:""}>${txt}</button>`;
  const zahl=id=>_rf.unge[id]?` <span class="rf-tab-zahl" aria-label="${_rf.unge[id]} ungelesen">${_rf.unge[id]>99?"99+":_rf.unge[id]}</span>`:"";
  const offen=_rf.raeume.filter(r=>!r.familie_kind), privat=_rf.raeume.filter(r=>r.familie_kind);
  box.style.display="flex";
  const fm=_rf.fuerMich||[], fmNeu=fm.filter(x=>new Date(x.created_at)>new Date(_rf.fuerMichGesehen||0)).length;
  let html=chip(_rf.ansicht==="fuermich","@ Für mich"+(fmNeu?` <span class="rf-tab-zahl" aria-label="${fmNeu} neu">${fmNeu}</span>`:""),"rufeFuerMich()","Für mich: Erwähnungen und Antworten an mich")
    +offen.map(r=>chip(_rf.ansicht!=="fuermich"&&r.id===_rf.raum,esc(_rfRaumName(r))+zahl(r.id),`rufeRaumWechseln(${Number(r.id)})`)).join("");
  if(_rf.trainer){
    /* v674: Das Trainerteam hat viele Familienräume – ein Knopf öffnet die Liste; der gerade
       offene Familienraum steht zusätzlich als eigener Knopf daneben. */
    const ungeP=privat.reduce((a,r)=>a+(_rf.unge[r.id]||0),0);
    html+=chip(false,"🔒 Familien"+(ungeP?` <span class="rf-tab-zahl">${ungeP}</span>`:""),"rufeFamilienOpen()","Private Nachricht an eine Familie");
    const akt=privat.find(r=>r.id===_rf.raum); if(akt)html+=chip(true,esc(_rfRaumName(akt)),`rufeRaumWechseln(${Number(akt.id)})`);
  }else{
    const eigen=privat.find(r=>!r.eltern_email), ich=privat.find(r=>r.eltern_email);
    html+=eigen?chip(eigen.id===_rf.raum,esc(_rfRaumName(eigen))+zahl(eigen.id),`rufeRaumWechseln(${Number(eigen.id)})`,"Privat an das Trainerteam")
               :chip(false,"🔒 Trainerteam","rufePrivat(null)","Privat an das Trainerteam");
    /* v935: Wo zwei Elternkonten sind, gibt es zusätzlich den eigenen Raum „nur ich“ */
    if(ich)html+=chip(ich.id===_rf.raum,"🔒 Trainerteam · nur ich"+zahl(ich.id),`rufeRaumWechseln(${Number(ich.id)})`,"Privat: nur ich und das Trainerteam");
    else if(_rf.zweiKonten)html+=chip(false,"🔒 Trainerteam · nur ich","rufePrivatIch()","Privat: nur ich und das Trainerteam");
  }
  box.innerHTML=html+(_rf.mod?chip(false,"＋ Raum","rufeRaumNeu()","Neuen Raum anlegen"):"");
  _rfKopfZeigen();
}
function _rfKopfZeigen(){
  rufeChipsRender();
  const r=_rfAktRaum(); const unter=document.getElementById("rufe-unter"), feld=document.getElementById("rufe-text");
  const privat=!!(r&&r.familie_kind), nurEltern=!!(r&&r.nur_eltern);
  if(unter)unter.textContent=nurEltern?"Nur Eltern – das Trainerteam sieht diesen Raum nicht":privat?_rfMitleserText(r):"Eltern und Trainerteam";
  const bild=document.getElementById("rufe-kopf-bild"); if(bild)bild.textContent=privat?"🔒":nurEltern?"👪":"📣";
  if(feld)feld.placeholder=privat?(_rf.trainer?(r.eltern_email?"Nachricht an "+_rfKontoName(r)+" …":"Nachricht an die Familie …"):"Nachricht an das Trainerteam …"):"Ruf schreiben …";
  if(privat&&!(_rf.mitleser||{})[r.id])_rfMitleserLaden(r.id);
}
/* v935: Die Kopfzeile sagt im privaten Raum immer, wer mitliest. */
function _rfMitleserText(r){
  const ml=(_rf.mitleser||{})[r.id];
  if(!ml||!ml.length)return _rf.trainer?"Privat mit der Familie von "+(_rf.fam[r.familie_kind]||""):"Privat: nur ihr und das Trainerteam";
  const namen=ml.map(x=>x.ich?"du":x.name);
  if(_rf.trainer)return r.eltern_email?`Privat – nur ${namen[0]||"dieses Elternteil"} und das Trainerteam`:`Privat – ${namen.join(", ")} und das Trainerteam`;
  if(r.eltern_email||ml.length<2)return "Privat – nur du und das Trainerteam";
  const andere=ml.filter(x=>!x.ich).map(x=>x.name);
  return `Privat – du, ${andere.join(", ")} und das Trainerteam`;
}
async function _rfMitleserLaden(raum){
  if(!_rf)return; _rf.mitleser=_rf.mitleser||{}; _rf.mitleser[raum]=_rf.mitleser[raum]||null;
  let ml=null; try{ const r=await _rfRpc("rufe_mitleser",{p_raum:raum}); if(r.ok)ml=await r.json(); }catch(e){}
  if(!_rf||!Array.isArray(ml))return;
  _rf.mitleser[raum]=ml;
  if(!_rf.trainer){ const fam=_rf.raeume.find(x=>x.id===raum&&x.familie_kind&&!x.eltern_email); if(fam&&ml.length>1&&!_rf.zweiKonten){ _rf.zweiKonten=true; rufeRaeumeRender(); return; } }
  if(_rf.raum===raum)_rfKopfZeigen();
}
async function _rfUngelesenLaden(){
  if(!_rf)return; const u={};
  (await _rfGet("rpc/rufe_ungelesen")).forEach(x=>u[x.raum_id]=Number(x.anzahl)||0);
  if(_rf){ _rf.unge=u; rufeRaeumeRender(); }
}
/* v674: privaten Raum öffnen – Eltern ihren eigenen, das Trainerteam den einer Familie. Die
   Datenbank legt ihn beim ersten Mal an und prüft, wer hinein darf. */
async function rufePrivat(kind,mail,nurIch){
  if(!_rf)return;
  document.getElementById("rufe-menue")?.remove();
  let id=null;
  const arg={p_kind:kind}; if(mail)arg.p_email=mail; if(nurIch)arg.p_nur_ich=true;   // v935
  try{ const r=await _rfRpc("rufe_privat_raum",arg); if(!r.ok){ toast(kind?"Diese Familie hat noch keinen Zugang":"Privater Raum nicht verfügbar","err"); return; } id=await r.json(); }
  catch(e){ toast("Kein Netz","err"); return; }
  if(!_rf)return;
  if(!_rf.raeume.some(r=>r.id===id))_rf.raeume=await _rfRaeumeHolen();
  _rf.raum=null; await rufeRaumWechseln(id);
}
/* v935: Ohne Vornamen unter „Meine Angaben“ weiß das Trainerteam nicht, wem es schreibt – einmal fragen. */
async function _rfNameFragen(){
  try{ if(localStorage.getItem("adler_rufe_name_gefragt"))return; }catch(e){}
  const uid=_rf&&_rf.uid; if(!uid)return;
  let a=null; try{ const r=await fetch(`${SB_URL}/rest/v1/eltern_angaben?user_id=eq.${encodeURIComponent(uid)}&select=vorname`,{headers:sbAuthHeaders()}); if(!r.ok)return; a=((await r.json())||[])[0]||null; }catch(e){ return; }
  if(a&&String(a.vorname||"").trim())return;
  const box=document.getElementById("rufe-name"); if(!box)return;
  box.innerHTML=`<div class="rf-name-karte" style="margin:8px 12px 0;background:var(--surface);border:1px solid var(--rand-bedien);border-radius:12px;padding:10px 12px">
    <div style="font-weight:800;font-size:var(--s-karte);color:var(--text)">Wie sollen wir dich nennen?</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin:2px 0 6px">Damit das Trainerteam weiß, wem es schreibt – zum Beispiel „Anna“ oder „Papa von …“.</div>
    <label for="rf-name-feld" style="position:absolute;left:-9999px">Dein Name</label>
    <input id="rf-name-feld" maxlength="40" autocomplete="given-name" style="width:100%;box-sizing:border-box;min-height:48px;padding:10px 12px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-karte);background:var(--surface);color:var(--text)">
    <div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn" onclick="rufeNameSpeichern()" style="flex:1;justify-content:center">Speichern</button>
      <button type="button" class="btn" onclick="rufeNameSpaeter()" style="justify-content:center">Später</button></div></div>`;
}
function rufeNameSpaeter(){ try{ localStorage.setItem("adler_rufe_name_gefragt","1"); }catch(e){} const b=document.getElementById("rufe-name"); if(b)b.innerHTML=""; }
async function rufeNameSpeichern(){
  const v=(document.getElementById("rf-name-feld")||{}).value||""; const name=v.trim().slice(0,40);
  if(!name){ toast("Bitte einen Namen eintragen","err"); return; }
  const uid=_rf&&_rf.uid; if(!uid)return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/eltern_angaben?on_conflict=user_id`,{method:"POST",headers:{...sbAuthHeaders(),"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({user_id:uid,vorname:name})});
    if(!r.ok){ toast("Konnte den Namen nicht speichern","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Danke, "+name+"!"); rufeNameSpaeter();
}
function rufePrivatIch(){ return rufePrivat(null,null,true); }   // v935: Eltern – eigener Raum „nur ich“
function rufeFamilienOpen(){
  if(!_rf)return;
  /* v935 (Charles 21.11.): je Familie „👪 Familie“ (alle Elternteile lesen) und bei zwei Konten „👤 Nur …“ je Elternteil */
  const raumVon={}, einzel={};
  _rf.raeume.filter(r=>r.familie_kind).forEach(r=>{ if(r.eltern_email)einzel[r.familie_kind+"|"+String(r.eltern_email).toLowerCase()]=r; else raumVon[r.familie_kind]=r; });
  const unge=r=>r?(_rf.unge[r.id]||0):0;
  const liste=Object.keys(_rf.fam).map(k=>{ const konten=(_rf.konten||{})[k]||[]; const ein=konten.map(x=>einzel[k+"|"+x.mail]);
      return {k:Number(k),name:_rf.fam[k],raum:raumVon[k]||null,konten,ein,n:unge(raumVon[k])+ein.reduce((a,r)=>a+unge(r),0)}; })
    .sort((a,b)=>(b.n-a.n)||(((b.raum||b.ein.some(Boolean))?1:0)-((a.raum||a.ein.some(Boolean))?1:0))||a.name.localeCompare(b.name,"de"));
  const zeile=(emo,titel,unter,n,on)=>`<button type="button" class="rf-familie btn btn-zeile" style="margin-top:6px" onclick="${on}"><span aria-hidden="true">${emo}</span><span style="flex:1;min-width:0;text-align:left"><span style="display:block;font-weight:800">${titel}</span><span style="display:block;font-size:var(--s-klein);color:var(--text2);font-weight:400">${unter}</span></span>${n?`<span style="background:#dc2626;color:#fff;border-radius:999px;padding:0 8px;font-weight:800;font-size:var(--s-klein)">${n}</span>`:""}<span aria-hidden="true" style="color:var(--text3)">›</span></button>`;
  _rfBlatt("rufe-menue","Privat an eine Familie",
    `<div style="font-size:var(--s-klein);color:var(--text2)">Lesen können nur die genannten Eltern und das Trainerteam – der Elternbeirat nicht.</div>
    <div style="max-height:60vh;overflow-y:auto">${liste.length?liste.map(f=>`<div class="rf-fam-block" style="margin-top:12px"><div style="font-weight:800;font-size:var(--s-karte)">Familie ${esc(f.name)}</div>
      ${zeile("👪","Familie",f.konten.length>1?"es lesen mit: "+f.konten.map(x=>esc(x.name)).join(", "):"ein Elternteil mit Zugang",unge(f.raum),`rufePrivat(${f.k})`)}
      ${f.konten.length>1?f.konten.map((x,i)=>zeile("👤","Nur "+esc(x.name),"nur dieses Elternteil liest",unge(f.ein[i]),`rufePrivat(${f.k},'${jsq(x.mail)}')`)).join(""):""}</div>`).join("")
      :`<div style="color:var(--text2);margin-top:8px">Noch keine Familie mit Zugang.</div>`}</div>`);
}

async function rufeRaumWechseln(id){
  if(_rf&&_rf.ansicht==="fuermich"){ _rf.ansicht=null; _rf.kennung=null; }
  if(!_rf||_rf.raum===id)return;
  _rf.raum=id; _rf.antwort=null; _rf.letzte=null; rufeAntwortRender();
  if(_rf.unge[id]){ _rf.unge[id]=0; }
  rufeRaeumeRender();
  document.getElementById("rufe-liste").innerHTML=`<div style="color:var(--text2);padding:12px 0">Lade Rufe …</div>`;
  await rufeLaden(true);
}

/* ── Laden und Zeichnen ───────────────────────────────────────────────────────── */
async function rufeLaden(zumEnde){
  if(!_rf||!_rf.raum)return;
  const raum=_rf.raum;
  const liste=(await _rfNachrichtenHolen(raum)).reverse();
  if(!_rf||_rf.raum!==raum)return;
  const ids=liste.map(n=>n.id);
  const [reakt,fix,umf]=await Promise.all([
    ids.length?_rfGet(`rufe_reaktion?nachricht_id=in.(${ids.join(",")})&select=nachricht_id,user_id,emoji`):Promise.resolve([]),
    _rfGet(`rufe_fixiert?raum_id=eq.${raum}&select=nachricht_id,bis`),
    ids.length?_rfGet(`rufe_umfrage?nachricht_id=in.(${ids.join(",")})&select=id,nachricht_id,optionen,anonym,mehrfach,schluss,beendet_am,von,verdeckt`):Promise.resolve([])
  ]);
  // v674: Stand der Abstimmungen – lesend per GET (die Funktion ist stable)
  const stand=umf.length?await _rfGet(`rpc/rufe_umfrage_stand?p_ids=${encodeURIComponent("{"+umf.map(u=>Number(u.id)).join(",")+"}")}`):[];
  // v740: „Gesehen von …“ nur für das Trainerteam – die Funktion antwortet Eltern ohnehin leer
  const ges=_rf.trainer&&ids.length?await _rfGet(`rpc/rufe_gesehen_zahlen?p_ids=${encodeURIComponent("{"+ids.map(Number).join(",")+"}")}`).catch(()=>[]):[];
  if(!_rf||_rf.raum!==raum)return;
  const neu=liste.length&&liste[liste.length-1].id!==_rf.letzte;
  const kennung=JSON.stringify([liste.map(n=>[n.id,n.text,n.archiviert_am,n.anhang_entfernt_am,(n.rufe_anhang||[]).map(a=>a.id)]),reakt.length,fix,umf.map(u=>[u.id,u.beendet_am]),stand,ges]);
  if(!zumEnde&&kennung===_rf.kennung)return;
  _rf.kennung=kennung;
  _rf.liste=liste; _rf.reakt=reakt; _rf.fix=fix.filter(f=>!f.bis||new Date(f.bis)>new Date());
  _rf.umf={}; umf.forEach(u=>_rf.umf[u.nachricht_id]=u);
  _rf.gesehen={}; (Array.isArray(ges)?ges:[]).forEach(x=>_rf.gesehen[x.nachricht_id]={g:Number(x.gesehen)||0,e:Number(x.empfaenger)||0});
  _rf.stand={}; stand.forEach(x=>{ (_rf.stand[x.umfrage_id]=_rf.stand[x.umfrage_id]||{})[x.option]=x; });
  const box=document.getElementById("rufe-liste");
  const unten=box&&(box.scrollHeight-box.scrollTop-box.clientHeight<80);
  if(_rf.ansicht==="fuermich"){ if(neu)_rf.letzte=liste[liste.length-1].id; return; }   // v964: „Für mich“ bleibt stehen
  if(neu&&!unten&&!zumEnde&&_rf.letzte){ _rf.neuUnten=(_rf.neuUnten||0)+1; const z=document.getElementById("rufe-runter-zahl"); if(z){ z.textContent=String(_rf.neuUnten); z.removeAttribute("hidden"); } }
  rufeRender();
  if(box&&(zumEnde||(neu&&unten)))box.scrollTop=box.scrollHeight;
  rufeBilderBeobachten();
  if(neu){ _rf.letzte=liste[liste.length-1].id; rufeGelesen(); }
}
function rufeRender(){
  if(!_rf)return;
  const box=document.getElementById("rufe-liste"); if(!box)return;
  if(_rf.suche){ rufeSucheRender(); return; }
  rufeFixRender();
  if(!_rf.liste.length){
    const r=_rfAktRaum();
    box.innerHTML=`<div style="text-align:center;color:var(--text2);font-size:var(--s-text);padding:28px 8px">${r&&r.familie_kind
      ?(_rf.trainer?"Noch nichts geschrieben.<br>Lesen können nur diese Familie und das Trainerteam.":"Hier schreibst du privat dem Trainerteam.<br>Mitlesen können nur ihr als Familie und das Trainerteam – nicht die anderen Eltern.")
      :(r&&r.nur_eltern)?"Noch keine Rufe in der Elternrunde.<br>Schreib den ersten – hier lesen nur Eltern, das Trainerteam nicht."   // v831
      :"Noch keine Rufe in diesem Raum.<br>Schreib den ersten – alle Eltern und das Trainerteam lesen mit."}</div>`;
    return;
  }
  let tag="", html="", vor=null;
  _rf.liste.forEach(n=>{
    const t=_rfTag(n.created_at);
    if(t!==tag){ tag=t; vor=null; html+=`<div class="rf-tag"><span>${esc(t)}</span></div>`; }
    /* v964: Rufe derselben Person innerhalb von fünf Minuten rücken zusammen – Name und Initialen nur am ersten */
    const erst=!vor||vor.autor!==n.autor||!!vor.archiviert_am!==!!n.archiviert_am||(new Date(n.created_at)-new Date(vor.created_at))>300000;
    html+=rufeNachrichtHtml(n,erst); vor=n;
  });
  box.innerHTML=html;
  rufeGestenAn(box);
}
/* v964: Initialen und eine feste Farbe je Konto (8 Farben; dieselbe Person hat immer dieselbe) */
function _rfInitialen(name){
  const w=String(name||"?").replace(/\(.*\)/,"").trim().split(/\s+/).filter(Boolean);
  return ((w[0]||"?")[0]+(w[1]?w[1][0]:"")).toUpperCase();
}
function _rfFarbe(uid){ let h=0; for(const c of String(uid||""))h=(h*31+c.charCodeAt(0))>>>0; return h%8; }
function rufeNachrichtHtml(n,erst){
  if(erst===undefined)erst=true;
  const eigen=n.autor===_rf.uid;
  const arch=!!n.archiviert_am;
  const zitat=n.antwort_auf?(_rf.liste.find(x=>x.id===n.antwort_auf)||null):null;
  const r={}; _rf.reakt.filter(x=>x.nachricht_id===n.id).forEach(x=>{ (r[x.emoji]=r[x.emoji]||{n:0,ich:false}); r[x.emoji].n++; if(x.user_id===_rf.uid)r[x.emoji].ich=true; });
  const fixiert=_rf.fix.some(f=>f.nachricht_id===n.id);
  const lang=String(n.text||"").length>RUFE_LANG&&!_rf.offen.has(n.id);
  const mich=!eigen&&((n.erwaehnt||[]).includes(_rf.uid)||(zitat&&zitat.autor===_rf.uid));
  const f=_rfFarbe(n.autor);
  const rolle=n.autor_rolle==="trainer"?`<span class="rf-rolle">Trainer</span>`:n.autor_rolle==="moderator"?`<span class="rf-rolle">Moderation</span>`:"";
  const ges=_rf.trainer&&!arch&&_rf.gesehen&&_rf.gesehen[n.id]?(()=>{ const x=_rf.gesehen[n.id]; return `<button type="button" class="rf-gesehen" onclick="rufeGesehenOpen(${Number(n.id)})" aria-label="Gesehen von ${x.g} von ${x.e} – Namen zeigen"><span aria-hidden="true">👁</span> ${x.g}/${x.e}</button>`; })():"";
  return `<div class="rf-msg${eigen?" rf-ich":""}${erst?" rf-erst":""}${mich?" rf-mich":""}" data-id="${Number(n.id)}">
    ${eigen?"":(erst?`<span class="rf-ava rf-f${f}" aria-hidden="true">${esc(_rfInitialen(n.autor_name))}</span>`:`<span class="rf-ava-platz" aria-hidden="true"></span>`)}
    <div class="rf-blase${arch?" rf-arch":""}${n.an_alle?" rf-alle":""}">
      ${eigen?`<span class="rf-sr">Du: </span>`:""}
      ${erst&&!eigen?`<div class="rf-wer"><b class="rf-name rf-t${f}">${esc(n.autor_name||"")}</b>${rolle}${n.autor_zusatz&&n.autor_rolle!=="trainer"?`<span class="rf-zusatz">${esc(n.autor_zusatz)}</span>`:""}</div>`:""}
      ${n.an_alle||fixiert?`<div class="rf-marken">${n.an_alle?`<span class="rf-marke-alle">@alle</span>`:""}${fixiert?`<span class="rf-marke">📌 fixiert</span>`:""}</div>`:""}
      ${n.antwort_auf?`<button type="button" class="rf-zitat" onclick="rufeHinspringen(${Number(n.antwort_auf)})" aria-label="Zum beantworteten Ruf springen">${zitat?`<b>${esc(zitat.autor===_rf.uid?"Du":zitat.autor_name||"")}</b>${esc(String(zitat.text||"").replace(/\s+/g," ").slice(0,120))}`:"Antwort auf einen früheren Ruf"}</button>`:""}
      <div class="rf-text${lang?" rf-lang":""}">${_rf.umf[n.id]?"<b>📊 </b>":""}${_rfText(n.text)}</div>
      ${lang?`<button type="button" class="rf-weiter btn btn-link" onclick="rufeWeiterlesen(${Number(n.id)})" >Weiterlesen</button>`:""}
      ${rufeAnhaengeHtml(n)}
      ${_rf.umf[n.id]?rufeUmfrageHtml(_rf.umf[n.id],arch):""}
      <div class="rf-meta">${ges}<span>${arch?"archiviert · ":""}${n.bearbeitet_am?"bearbeitet · ":""}${_rfZeit(n.created_at)}</span></div>
      ${arch?"":`<button type="button" class="rf-menue-knopf" onclick="rufeMenue(${Number(n.id)})" aria-label="Aktionen zu diesem Ruf: reagieren, antworten …">⌄</button>`}
    </div></div>
    ${Object.keys(r).length?`<div class="rf-reakt-zeile${eigen?" rf-ich":""}">${Object.keys(r).map(e=>`<button type="button" class="rf-reakt" onclick="rufeReagieren(${Number(n.id)},'${e}')" aria-pressed="${r[e].ich}" aria-label="${e} ${r[e].n}, ${r[e].ich?"zurücknehmen":"dazu"}"><span>${e} ${r[e].n}</span></button>`).join("")}</div>`:""}`;
}
/* v964: langes Drücken (0,45 s) oder Rechtsklick öffnet Reaktionen und Aktionen; nach rechts wischen antwortet.
   Ohne Geste geht beides über den kleinen ⌄-Knopf in der Blase (Tastatur, Vorlesehilfe). */
function rufeGestenAn(box){
  if(!box||box._rfGesten)return; box._rfGesten=true;
  let t=null, x0=0, y0=0, el=null, id=null, dx=0;
  const weg=()=>{ clearTimeout(t); t=null; };
  box.addEventListener("pointerdown",e=>{
    const m=e.target.closest(".rf-msg"); if(!m||e.target.closest("button,a,input,video,iframe"))return;
    el=m.querySelector(".rf-blase"); id=Number(m.dataset.id); x0=e.clientX; y0=e.clientY; dx=0;
    weg(); t=setTimeout(()=>{ t=null; try{navigator.vibrate&&navigator.vibrate(15);}catch(_){} rufeMenue(id); el=null; },450);
  });
  box.addEventListener("pointermove",e=>{
    if(!el)return; const ddx=e.clientX-x0, ddy=e.clientY-y0;
    if(Math.abs(ddy)>12&&Math.abs(ddy)>Math.abs(ddx)){ weg(); el.style.transform=""; el=null; return; }
    if(Math.abs(ddx)>8)weg();
    if(ddx>0){ dx=Math.min(ddx,90); el.style.transform=`translateX(${dx}px)`; el.classList.toggle("rf-wisch-bereit",dx>=60); }
  });
  const ende=()=>{ weg(); if(el){ const z=el; z.style.transform=""; z.classList.remove("rf-wisch-bereit"); if(dx>=60&&id)rufeAntworten(id); } el=null; dx=0; };
  box.addEventListener("pointerup",ende); box.addEventListener("pointercancel",ende); box.addEventListener("pointerleave",ende);
  box.addEventListener("contextmenu",e=>{ const m=e.target.closest(".rf-msg"); if(!m||e.target.closest("a,img"))return; e.preventDefault(); weg(); rufeMenue(Number(m.dataset.id)); });
  box.addEventListener("scroll",()=>rufeRunterPruefen(),{passive:true});
}
function rufeFixRender(){
  const box=document.getElementById("rufe-fix"); if(!box||!_rf)return;
  const fix=_rf.fix.map(f=>_rf.liste.find(n=>n.id===f.nachricht_id)).filter(n=>n&&!n.archiviert_am);
  if(!fix.length){ box.innerHTML=""; return; }
  /* v964: eine Zeile wie bei Telegram – „📌 Fixiert · 1 von 2“; antippen springt hin und schaltet zum nächsten */
  const i=(_rf.fixI||0)%fix.length, n=fix[i];
  box.innerHTML=`<button type="button" class="rf-fix" onclick="rufeFixWeiter(${Number(n.id)},${fix.length})" aria-label="Fixierter Ruf ${i+1} von ${fix.length}: zum Ruf springen">
    <span class="rf-fix-strich" aria-hidden="true"></span><span class="rf-fix-txt"><b>📌 Fixiert${fix.length>1?` · ${i+1} von ${fix.length}`:""}</b><span>${esc(n.autor_name||"")}: ${esc(String(n.text||"").replace(/\s+/g," ").slice(0,140))}</span></span></button>`;
}
function rufeFixWeiter(id,anzahl){ rufeHinspringen(id); if(_rf){ _rf.fixI=((_rf.fixI||0)+1)%Math.max(1,anzahl); setTimeout(rufeFixRender,600); } }
function rufeHinspringen(id){
  const el=document.querySelector(`#rufe-liste .rf-msg[data-id="${Number(id)}"]`);
  if(el){ el.scrollIntoView({block:"center",behavior:"smooth"}); try{el.animate([{opacity:.35},{opacity:1}],{duration:500,iterations:2});}catch(e){} }
}

/* ── Schreiben ────────────────────────────────────────────────────────────────── */
function rufeAntwortRender(){
  const box=document.getElementById("rufe-antwort"); if(!box)return;
  const n=_rf&&_rf.antwort?_rf.liste.find(x=>x.id===_rf.antwort):null;
  if(!n){ box.style.display="none"; box.innerHTML=""; return; }
  box.className="rf-antwort"; box.style.display="flex";
  box.innerHTML=`<span class="rf-antwort-strich" aria-hidden="true"></span><div style="flex:1;min-width:0"><b>↩️ Antwort an ${esc(n.autor===_rf.uid?"dich":n.autor_name||"")}</b><span>${esc(String(n.text).replace(/\s+/g," ").slice(0,90))}</span></div>
    <button type="button" onclick="rufeAntwortWeg()" aria-label="Antwort verwerfen" class="rf-kreis">✕</button>`;
}
function rufeAntwortWeg(){ if(_rf){ _rf.antwort=null; rufeAntwortRender(); } }
/* v776 (PO 03.11.): Markus, als Trainer zugleich Vater, schrieb einen Wunsch seines Sohnes in den privaten Raum einer fremden Familie –
   als Trainer hat er keinen eigenen Raum „Trainerteam“, sondern nur die Familienräume, und der zuletzt offene blieb stehen. Darum fragt die
   App das Trainerteam vor jedem Senden in einen Familienraum, wer mitliest. Eltern schreiben nur in ihren eigenen Raum und werden nicht gefragt. */
async function _rfFamilienRueckfrage(){
  const r=_rfAktRaum();
  if(!_rf||!_rf.trainer||!r||!r.familie_kind)return true;
  const fam=(_rf.fam&&_rf.fam[r.familie_kind])||"dieser Familie";
  return frageJaNein({emoji:"🔒",titel:"Nachricht an die Familie von "+fam+"?",
    text:"Diese Nachricht lesen die Familie von "+fam+" und das Trainerteam.\n\nIst sie für alle Eltern oder nur fürs Trainerteam gedacht, brich ab und wähle den passenden Raum.",
    ja:"Senden",nein:"Abbrechen"});
}
async function rufeSenden(){
  if(!_rf||!_rf.raum)return;
  const feld=document.getElementById("rufe-text"); const text=(feld?.value||"").trim();
  if((text||_rf.dateien.length)&&!await _rfFamilienRueckfrage())return;
  if(_rf.dateien.length)return rufeSendenMitAnhang(text);
  if(!text)return;
  const knopf=document.getElementById("rufe-senden"); if(knopf)knopf.disabled=true;
  const zeile={raum_id:_rf.raum,text,antwort_auf:_rf.antwort||null,an_alle:_rf.mod&&/(^|\s)@alle\b/i.test(text)};
  const erw=rufeErwaehntAus(text); if(erw.length)zeile.erwaehnt=erw;   // v964
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rufe_nachricht`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(zeile)});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){ const t=await r.text().catch(()=>""); toast(/stumm/.test(t)?"Du bist gerade stummgeschaltet – später geht es wieder":"Ruf nicht gesendet – bitte gleich noch einmal","err"); return; }
  }catch(e){ toast("Kein Netz – Ruf nicht gesendet","err"); return; }
  finally{ if(knopf)knopf.disabled=false; }
  feld.value=""; rufeTextWachsen(feld); _rf.antwort=null; _rf.erw={}; rufeAntwortRender();
  document.getElementById("rufe-emoji-leiste")?.setAttribute("hidden","");
  await rufeLaden(true);
}
/* ── v964: Eingabe – Emoji-Leiste, 📎-Menü, @Erwähnen ─────────────────────────────── */
function rufeEmojiUmschalten(){
  const l=document.getElementById("rufe-emoji-leiste"), k=document.getElementById("rufe-emoji-knopf"); if(!l)return;
  const an=l.hasAttribute("hidden"); an?l.removeAttribute("hidden"):l.setAttribute("hidden",""); if(k)k.setAttribute("aria-expanded",String(an));
}
function rufeEmojiEinfuegen(e){
  const f=document.getElementById("rufe-text"); if(!f)return;
  const a=f.selectionStart??f.value.length, b=f.selectionEnd??f.value.length;
  f.value=f.value.slice(0,a)+e+f.value.slice(b); f.focus(); const p=a+e.length; try{f.setSelectionRange(p,p);}catch(_){}
  rufeTextWachsen(f);
}
function rufeAnhangMenue(){
  const z=(emo,txt,on,id)=>`<button type="button" class="btn btn-zeile" ${id?`id="${id}"`:""} style="margin-top:6px" onclick="${on}"><span aria-hidden="true">${emo}</span>${txt}</button>`;
  _rfBlatt("rufe-menue","Anhängen",
    z("🖼️","Foto oder Datei","document.getElementById('rufe-menue')?.remove();document.getElementById('rufe-datei')?.click()","rufe-anhang-datei")
    +z("📊","Abstimmung","document.getElementById('rufe-menue')?.remove();rufeUmfrageNeu()","rufe-anhang-umfrage")
    +`<button type="button" onclick="document.getElementById('rufe-menue')?.remove()" class="btn" style="width:100%;justify-content:center;margin-top:6px">Abbrechen</button>`);
}
function rufeTasteImFeld(e){
  const l=document.getElementById("rufe-erw-liste"); if(!l||l.hasAttribute("hidden"))return;
  if(e.key==="Escape"){ l.setAttribute("hidden",""); e.preventDefault(); }
  if(e.key==="Enter"||e.key==="Tab"){ const b=l.querySelector("button"); if(b){ e.preventDefault(); b.click(); } }
}
function _rfKurzname(name){ return String(name||"").replace(/\s*\(.*\)\s*$/,"").trim().split(/\s+/)[0]||"?"; }
async function _rfMitgliederLaden(){
  if(!_rf||!_rf.raum)return [];
  _rf.mitgl=_rf.mitgl||{};
  if(_rf.mitgl[_rf.raum])return _rf.mitgl[_rf.raum];
  let l=[]; try{ const r=await _rfRpc("rufe_mitglieder",{p_raum:_rf.raum}); if(r.ok)l=await r.json(); }catch(e){}
  if(_rf)_rf.mitgl[_rf.raum]=Array.isArray(l)?l:[];
  return _rf?_rf.mitgl[_rf.raum]:[];
}
async function rufeErwPruefen(f){
  const l=document.getElementById("rufe-erw-liste"); if(!l||!_rf)return;
  const vor=f.value.slice(0,f.selectionStart??f.value.length), m=vor.match(/(^|\s)@([\wÄÖÜäöüß-]*)$/);
  if(!m){ l.setAttribute("hidden",""); return; }
  const q=m[2].toLowerCase(), alle=await _rfMitgliederLaden();
  const treffer=alle.filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,8);
  const r=_rfAktRaum(), alleOk=_rf.mod&&!(r&&r.familie_kind)&&(!q||"alle".startsWith(q));
  if(!treffer.length&&!alleOk){ l.setAttribute("hidden",""); return; }
  l.innerHTML=(alleOk?`<button type="button" role="option" onclick="rufeErwWahl('alle',null)"><span class="rf-ava rf-f0" aria-hidden="true">@</span><span><b>@alle</b><small>Alle im Raum, auch wer stumm geschaltet hat</small></span></button>`:"")
    +treffer.map(x=>`<button type="button" role="option" onclick="rufeErwWahl('${jsq(_rfKurzname(x.name))}','${esc(x.user_id)}')"><span class="rf-ava rf-f${_rfFarbe(x.user_id)}" aria-hidden="true">${esc(_rfInitialen(x.name))}</span><span><b>${esc(x.name)}</b>${x.trainer?`<small>Trainerteam</small>`:""}</span></button>`).join("");
  l.removeAttribute("hidden");
}
function rufeErwWahl(kurz,uid){
  const f=document.getElementById("rufe-text"); if(!f||!_rf)return;
  const pos=f.selectionStart??f.value.length, vor=f.value.slice(0,pos).replace(/@([\wÄÖÜäöüß-]*)$/,"@"+kurz+" ");
  f.value=vor+f.value.slice(pos); f.focus(); try{f.setSelectionRange(vor.length,vor.length);}catch(_){}
  if(uid){ _rf.erw=_rf.erw||{}; _rf.erw[uid]=kurz; }
  document.getElementById("rufe-erw-liste")?.setAttribute("hidden","");
  rufeTextWachsen(f);
}
/* Wer steht noch als „@Name“ im Text? Nur diese Konten gehen als erwähnt mit (die Datenbank prüft noch einmal den Raum). */
function rufeErwaehntAus(text){
  if(!_rf||!_rf.erw)return [];
  return Object.keys(_rf.erw).filter(uid=>new RegExp("(^|\\s)@"+_rf.erw[uid].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?![\\wÄÖÜäöüß-])").test(text));
}
/* ── v964: ⌄-Knopf, wenn man hochgescrollt hat ─────────────────────────────────── */
function rufeRunterPruefen(){
  const box=document.getElementById("rufe-liste"), k=document.getElementById("rufe-runter"); if(!box||!k)return;
  const weit=box.scrollHeight-box.scrollTop-box.clientHeight>240;
  weit?k.removeAttribute("hidden"):k.setAttribute("hidden","");
  if(!weit&&_rf){ _rf.neuUnten=0; const z=document.getElementById("rufe-runter-zahl"); if(z)z.setAttribute("hidden",""); }
}
function rufeRunter(){ const box=document.getElementById("rufe-liste"); if(box)box.scrollTo({top:box.scrollHeight,behavior:"smooth"}); }

async function rufeSendenMitAnhang(text){
  const raum=_rf.raum, feld=document.getElementById("rufe-text");
  const knopf=document.getElementById("rufe-senden"); if(knopf){ knopf.disabled=true; knopf.textContent="…"; }
  const hoch=[];
  const fertig=()=>{ if(knopf){ knopf.disabled=false; knopf.textContent="Senden"; } };
  try{
    for(const d of _rf.dateien){
      const pfad=`${raum}/${_rfUuid()}.${d.endung}`;
      let r;
      try{ r=await fetch(`${SB_URL}/storage/v1/object/rufe-anhang/${pfad}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'apikey':SB_KEY,'Content-Type':d.mime,'x-upsert':'false'},body:d.blob}); }
      catch(e){ r=null; }
      if(!r||!r.ok){ await _rfAufraeumen(hoch); toast(`„${d.name}“ wurde nicht hochgeladen – der Ruf ist nicht gesendet. Text und Anhänge bleiben stehen.`,"err"); fertig(); return; }
      hoch.push({pfad,name:d.name,mime:d.mime,groesse:d.blob.size});
    }
    const r=await _rfRpc("rufe_senden",{p_raum:raum,p_text:text,p_antwort_auf:_rf.antwort||null,p_an_alle:_rf.mod&&/(^|\s)@alle\b/i.test(text),p_anhaenge:hoch,
      ...(rufeErwaehntAus(text).length?{p_erwaehnt:rufeErwaehntAus(text)}:{})});   // v964
    if(typeof sbCheck401==="function"&&sbCheck401(r)){ await _rfAufraeumen(hoch); fertig(); return; }
    if(!r.ok){ const t=await r.text().catch(()=>""); await _rfAufraeumen(hoch);
      toast(/stumm/.test(t)?"Du bist gerade stummgeschaltet – später geht es wieder":"Ruf nicht gesendet – Text und Anhänge bleiben stehen. Bitte gleich noch einmal.","err"); fertig(); return; }
  }catch(e){ await _rfAufraeumen(hoch); toast("Kein Netz – Ruf nicht gesendet. Text und Anhänge bleiben stehen.","err"); fertig(); return; }
  fertig();
  if(!_rf)return;
  _rf.dateien.forEach(d=>d.vorschau&&URL.revokeObjectURL(d.vorschau)); _rf.dateien=[]; rufeChipsRender();
  if(feld){ feld.value=""; rufeTextWachsen(feld); } _rf.antwort=null; rufeAntwortRender();
  await rufeLaden(true);
}
async function rufeReagieren(id,emoji){
  if(!_rf)return;
  const meine=_rf.reakt.some(x=>x.nachricht_id===id&&x.user_id===_rf.uid&&x.emoji===emoji);
  try{
    const r=meine
      ?await fetch(`${SB_URL}/rest/v1/rufe_reaktion?nachricht_id=eq.${Number(id)}&user_id=eq.${_rf.uid}&emoji=eq.${encodeURIComponent(emoji)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=minimal'})})
      :await fetch(`${SB_URL}/rest/v1/rufe_reaktion`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal,resolution=ignore-duplicates'}),body:JSON.stringify({nachricht_id:id,emoji})});
    if(!r.ok){ toast("Reaktion nicht gespeichert","err"); return; }
  }catch(e){ toast("Kein Netz","err"); return; }
  document.getElementById("rufe-menue")?.remove();
  await rufeLaden(false);
}
async function rufeGelesen(){
  if(!_rf||!_rf.raum)return;
  if(_rf.unge[_rf.raum]){ _rf.unge[_rf.raum]=0; rufeRaeumeRender(); }
  try{ await fetch(`${SB_URL}/rest/v1/rufe_gelesen?on_conflict=user_id,raum_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({raum_id:_rf.raum,zuletzt:new Date().toISOString()})}); }catch(e){}
}

/* ── v740: Wer hat den Ruf gesehen? (nur Trainerteam) ────────────────────────────
   „Gesehen“ heißt: das Konto hat den Raum geöffnet, nachdem der Ruf kam (rufe_gelesen). Eine Benachrichtigung
   allein zählt nicht. Eltern bekommen diese Anzeige nie – die Datenbank antwortet ihnen leer. */
async function rufeGesehenOpen(id){
  if(!_rf||!_rf.trainer)return;
  document.getElementById("rufe-menue")?.remove();
  const m=_rfBlatt("rufe-gesehen","Wer hat den Ruf gesehen?",`<div style="color:var(--text2);font-size:var(--s-text)">Lädt …</div>`);
  let liste=[];
  try{ const r=await fetch(`${SB_URL}/rest/v1/rpc/rufe_gesehen?p_nachricht=${Number(id)}`,{headers:sbAuthHeaders()}); liste=r.ok?await r.json():null; }catch(e){ liste=null; }
  if(!document.body.contains(m))return;
  const box=m.firstElementChild;
  if(!Array.isArray(liste)){ box.lastElementChild.textContent="Konnte nicht geladen werden – bitte gleich noch einmal."; return; }
  const sort=(a,b)=>String(a.name).localeCompare(String(b.name),"de");
  const ja=liste.filter(x=>x.gesehen).sort(sort), nein=liste.filter(x=>!x.gesehen&&!x.ohne_zugang).sort(sort), ohne=liste.filter(x=>x.ohne_zugang).sort(sort);
  const wann=ts=>{ if(!ts)return ""; const d=new Date(ts); return d.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})+" "+_rfZeit(ts); };
  const zeile=(x,zeit)=>`<li style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--surface2)"><span>${x.trainer?"🦅 ":""}${esc(x.name||"")}</span>${zeit?`<span style="color:var(--text2);font-size:var(--s-klein);white-space:nowrap">${esc(zeit)}</span>`:""}</li>`;
  const block=(titel,arr,fn)=>arr.length?`<div style="font-weight:800;margin-top:12px">${titel} (${arr.length})</div><ul style="list-style:none;margin:4px 0 0;padding:0">${arr.map(fn).join("")}</ul>`:"";
  box.lastElementChild.remove();
  box.insertAdjacentHTML("beforeend",
    block("✓ Gesehen",ja,x=>zeile(x,"zuletzt im Raum "+wann(x.zuletzt)))
    +block("✗ Noch nicht gesehen",nein,x=>zeile(x,""))
    +block("Ohne Elternzugang",ohne,x=>zeile(x,"keine App"))
    +(liste.length?"":`<div style="color:var(--text2)">Noch niemand außer dir kann diesen Raum lesen.</div>`)
    +`<div style="margin-top:12px;color:var(--text2);font-size:var(--s-klein)">Gesehen heißt: hat den Raum geöffnet, nachdem der Ruf kam – eine Benachrichtigung allein zählt nicht. Diese Anzeige sieht nur das Trainerteam.</div>`
    +`<button type="button" onclick="document.getElementById('rufe-gesehen')?.remove()" class="btn" style="width:100%;justify-content:center;margin-top:6px">Schließen</button>`);
}

/* ── Aktionen zu einem Ruf ────────────────────────────────────────────────────── */
function _rfBlatt(id,titel,inhalt){
  document.getElementById(id)?.remove();
  const m=document.createElement("div"); m.id=id;
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label",titel);
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center";
  m.style.zIndex=_rfZ(10005);
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);width:100%;max-width:520px;border-radius:18px 18px 0 0;max-height:92vh;overflow-y:auto;box-sizing:border-box;padding:14px 14px calc(14px + env(safe-area-inset-bottom))">
    <div style="font-size:var(--s-karte);font-weight:800;margin-bottom:10px">${titel}</div>${inhalt}</div>`;
  document.body.appendChild(m);
  return m;
}
const _RF_ZEILE="display:flex;align-items:center;gap:10px;width:100%;min-height:48px;margin-top:6px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:var(--s-text);text-align:left;cursor:pointer";
function rufeMenue(id){
  if(!_rf)return;
  const n=_rf.liste.find(x=>x.id===id); if(!n)return;
  const eigen=n.autor===_rf.uid, fixiert=_rf.fix.some(f=>f.nachricht_id===id);
  const raum=_rfAktRaum(), privat=!!(raum&&raum.familie_kind);
  const u=_rf.umf[id], uOffen=u&&!_rfUmfrageZu(u);
  const darfModerieren=_rf.mod&&(!privat||_rf.trainer);
  const zeile=(emo,txt,on)=>`<button type="button" class="btn btn-zeile" style="margin-top:6px" onclick="${on}"><span aria-hidden="true">${emo}</span>${txt}</button>`;
  _rfBlatt("rufe-menue","Ruf von "+esc(eigen?"dir":n.autor_name||""),
    `<div class="rf-emo-leiste">${RUFE_EMOJI.map(e=>`<button type="button" class="rf-emo" onclick="rufeReagieren(${id},'${e}')" aria-label="Mit ${e} reagieren">${e}</button>`).join("")}</div>`
    +zeile("↩️","Antworten <small class=\"rf-tipp\">oder nach rechts wischen</small>",`rufeAntworten(${id})`)
    +zeile("📋","Text kopieren",`rufeKopieren(${id})`)
    +(_rf.trainer&&!n.archiviert_am?zeile("👁","Wer hat ihn gesehen?",`rufeGesehenOpen(${id})`):"")
    +(darfModerieren?(fixiert?zeile("📌","Nicht mehr fixieren",`rufeFixieren(${id},null,true)`):zeile("📌","Oben fixieren …",`rufeFixMenue(${id})`)):"")
    +(uOffen&&(u.von===_rf.uid||darfModerieren)?zeile("🏁","Abstimmung beenden",`rufeUmfrageBeenden(${Number(u.id)})`):"")
    +(eigen&&!u?zeile("✏️","Bearbeiten",`rufeBearbeitenOpen(${id})`):"")
    +(eigen?zeile("🗄️","Zurückziehen",`rufeArchivieren(${id},true)`):(darfModerieren?zeile("🗄️","Archivieren (nur Trainer sehen ihn noch)",`rufeArchivieren(${id},false)`):""))
    +(_rf.trainer&&(n.rufe_anhang||[]).length?zeile("🗑️","Anhänge endgültig löschen",`rufeAnhaengeLoeschen(${id})`):"")
    +(!eigen&&!privat?zeile("🚩","Melden",`rufeMelden(${id})`):"")
    +(darfModerieren&&!privat&&!eigen&&n.autor_rolle!=="trainer"?zeile("🔇","Stummschalten …",`rufeStummMenue('${esc(n.autor)}','${esc(n.autor_name||"")}')`):"")
    +`<button type="button" onclick="document.getElementById('rufe-menue')?.remove()" class="btn" style="width:100%;justify-content:center;margin-top:6px">Abbrechen</button>`);
}
function rufeKopieren(id){
  document.getElementById("rufe-menue")?.remove();
  const n=_rf&&_rf.liste.find(x=>x.id===id); if(!n)return;
  try{ navigator.clipboard.writeText(String(n.text||"")).then(()=>toast("Text kopiert"),()=>toast("Kopieren ging nicht","err")); }catch(e){ toast("Kopieren ging nicht","err"); }
}
function rufeAntworten(id){
  document.getElementById("rufe-menue")?.remove();
  if(!_rf)return; _rf.antwort=id; rufeAntwortRender();
  document.getElementById("rufe-text")?.focus();
}
function rufeFixMenue(id){
  const z=(txt,h)=>`<button type="button" class="btn btn-zeile" style="margin-top:6px" onclick="rufeFixieren(${id},${h===null?"null":h})">${txt}</button>`;
  _rfBlatt("rufe-menue","Wie lange fixieren?",z("24 Stunden",24)+z("7 Tage",168)+z("30 Tage",720)+z("Immer",null)
    +`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:8px">Höchstens drei Rufe stehen gleichzeitig oben.</div>`);
}
async function rufeFixieren(id,stunden,loesen){
  document.getElementById("rufe-menue")?.remove();
  if(!_rf)return;
  try{
    const r=loesen
      ?await fetch(`${SB_URL}/rest/v1/rufe_fixiert?nachricht_id=eq.${Number(id)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=minimal'})})
      :await fetch(`${SB_URL}/rest/v1/rufe_fixiert?on_conflict=nachricht_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({nachricht_id:id,raum_id:_rf.raum,bis:stunden?new Date(Date.now()+stunden*3600e3).toISOString():null})});
    if(!r.ok){ const t=await r.text().catch(()=>""); toast(/drei/.test(t)?"Schon drei Rufe fixiert – erst einen lösen":"Nicht fixiert","err"); return; }
  }catch(e){ toast("Kein Netz","err"); return; }
  toast(loesen?"Nicht mehr fixiert":"Oben fixiert");
  await rufeLaden(false);
}
function rufeBearbeitenOpen(id){
  const n=_rf&&_rf.liste.find(x=>x.id===id); if(!n)return;
  _rfBlatt("rufe-menue","Ruf bearbeiten",`<label for="rufe-edit" style="position:absolute;left:-9999px">Text</label>
    <textarea id="rufe-edit" rows="4" maxlength="5000" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">${esc(n.text)}</textarea>
    <button type="button" class="btn btn-p" style="width:100%;justify-content:center;margin-top:6px" onclick="rufeBearbeiten(${id})">Speichern</button>`);
  setTimeout(()=>document.getElementById("rufe-edit")?.focus(),50);
}
async function rufeBearbeiten(id){
  const text=(document.getElementById("rufe-edit")?.value||"").trim(); if(!text)return;
  try{ const r=await _rfRpc("rufe_bearbeiten",{p_id:id,p_text:text}); if(!r.ok){ toast("Nicht gespeichert","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  document.getElementById("rufe-menue")?.remove(); toast("Bearbeitet");
  await rufeLaden(false);
}
async function rufeArchivieren(id,eigen){
  document.getElementById("rufe-menue")?.remove();
  if(!await frageJaNein({emoji:"🗄️",titel:eigen?"Ruf zurückziehen?":"Ruf archivieren?",
    text:eigen?"Der Ruf verschwindet für alle. Gelöscht wird er nicht – das Trainerteam kann ihn im Archiv noch sehen.":"Der Ruf verschwindet für die Eltern. Gelöscht wird er nicht – das Trainerteam sieht ihn im Archiv.",
    ja:eigen?"Zurückziehen":"Archivieren",nein:"Abbrechen"}))return;
  try{ const r=await _rfRpc("rufe_archivieren",{p_id:id}); if(!r.ok){ toast("Das ging nicht","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast(eigen?"Zurückgezogen":"Archiviert");
  await rufeLaden(false);
}
async function rufeMelden(id){
  document.getElementById("rufe-menue")?.remove();
  if(!await frageJaNein({emoji:"🚩",titel:"Ruf melden?",text:"Trainerteam und Elternbeirat sehen die Meldung und kümmern sich. Wer den Ruf geschrieben hat, erfährt nicht, dass du gemeldet hast.",ja:"Melden",nein:"Abbrechen"}))return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_meldung`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify({nachricht_id:id})}); if(!r.ok){ toast("Nicht gemeldet","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Gemeldet – danke");
}
function rufeStummMenue(uid,name){
  const z=(txt,h)=>`<button type="button" class="btn btn-zeile" style="margin-top:6px" onclick="rufeStumm('${uid}',${h})">${txt}</button>`;
  _rfBlatt("rufe-menue",`${name} stummschalten?`,`<div style="font-size:var(--s-text);color:var(--text2)">Lesen geht weiter, schreiben nicht.</div>`+z("24 Stunden",24)+z("7 Tage",168));
}
async function rufeStumm(uid,stunden){
  document.getElementById("rufe-menue")?.remove();
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_stumm?on_conflict=user_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({user_id:uid,bis:new Date(Date.now()+stunden*3600e3).toISOString()})}); if(!r.ok){ toast("Nicht stummgeschaltet","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Stummgeschaltet");
}
function rufeRaumNeu(){
  _rfBlatt("rufe-menue","Neuer Raum",`<label for="rufe-raum-name" style="display:block;font-size:var(--s-klein);color:var(--text2)">Name (z. B. Fahrgemeinschaft)</label>
    <input id="rufe-raum-name" type="text" maxlength="40" style="width:100%;box-sizing:border-box;min-height:48px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">
    <button type="button" class="btn btn-p" style="width:100%;justify-content:center;margin-top:6px" onclick="rufeRaumAnlegen()">Raum anlegen</button>`);
  setTimeout(()=>document.getElementById("rufe-raum-name")?.focus(),50);
}
async function rufeRaumAnlegen(){
  const name=(document.getElementById("rufe-raum-name")?.value||"").trim(); if(!name||!_rf)return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_raum`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify({name,emoji:"💬",sort:_rf.raeume.length})}); if(!r.ok){ toast("Raum nicht angelegt","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  document.getElementById("rufe-menue")?.remove(); toast("Raum angelegt");
  _rf.raeume=await _rfRaeumeHolen();
  rufeRaeumeRender();
}

/* ── v674: Abstimmungen ───────────────────────────────────────────────────────── */
function _rfUmfrageZu(u){ return !!u.beendet_am||(u.schluss&&new Date(u.schluss)<=new Date()); }
/* v964: wie bei den großen Messengern – Ankreuzkreis (mehrere: Kästchen), Balken mit Prozent, Initialen der Abstimmenden.
   „Ergebnis erst am Schluss“ (verdeckt): bis dahin nur die eigene Wahl und die Zahl der Abstimmenden – die Datenbank liefert nicht mehr. */
function rufeUmfrageHtml(u,arch){
  const st=_rf.stand[u.id]||{}; const zu=_rfUmfrageZu(u)||arch;
  const tn=Object.values(st)[0]?Number(Object.values(st)[0].teilnehmer)||0:0;
  const verdeckt=!!u.verdeckt&&!zu;
  const summe=Object.values(st).reduce((a,x)=>a+(Number(x.anzahl)||0),0);
  const art=[u.anonym?"anonym":"namentlich",u.mehrfach?"mehrere Antworten":"eine Antwort"].concat(u.verdeckt?["Ergebnis am Schluss"]:[]);
  const ende=u.beendet_am?"beendet":u.schluss?(zu?"beendet":"bis "+_rfTag(u.schluss)+" "+_rfZeit(u.schluss)):"";
  const namen=[...new Set(Object.values(st).flatMap(x=>x.namen||[]))];
  return `<div class="rf-umfrage${verdeckt?" rf-verdeckt":""}" role="group" aria-label="Abstimmung: ${esc(art.join(", "))}">
    <div class="rf-u-art">${esc(art.join(" · "))}${ende?" · "+esc(ende):""}</div>
    ${u.optionen.map((o,i)=>{ const x=st[i]||{anzahl:0,ich:false,namen:null}; const n=Number(x.anzahl)||0; const pct=summe?Math.round(100*n/summe):0;
      return `<button type="button" class="rf-option" ${zu?"disabled":""} onclick="rufeStimmen(${Number(u.id)},${i})" aria-pressed="${!!x.ich}"
        aria-label="${esc(o)}${verdeckt?"":`: ${n} ${n===1?"Stimme":"Stimmen"}`}${x.ich?", deine Wahl":""}">
        <span class="rf-u-kreis${u.mehrfach?" rf-u-eckig":""}${x.ich?" rf-u-an":""}" aria-hidden="true">${x.ich?"✓":""}</span>
        <span class="rf-u-text">${esc(o)}</span>${verdeckt?"":`<b class="rf-u-pct">${pct} %</b><span class="rf-u-balken" aria-hidden="true"><i style="width:${pct}%"></i></span>`}</button>
        ${!u.anonym&&!verdeckt&&x.namen&&x.namen.length?`<div class="rf-namen">${esc(x.namen.join(", "))}</div>`:""}`; }).join("")}
    <div class="rf-u-fuss">${!u.anonym&&namen.length?`<span class="rf-u-wer" aria-hidden="true">${namen.slice(0,4).map((nm,k)=>`<span class="rf-ava rf-mini rf-f${k%8}">${esc(_rfInitialen(nm))}</span>`).join("")}</span>`:""}
      <span>${tn===1?"1 hat abgestimmt":tn+" haben abgestimmt"}${verdeckt?" · 🙈 Ergebnis kommt am Schluss":""}${zu?"":u.mehrfach?" · antippen wählt an und ab":" · nochmal antippen nimmt die Stimme zurück"}</span></div>
  </div>`;
}
async function rufeStimmen(umfId,i){
  if(!_rf)return;
  const u=Object.values(_rf.umf).find(x=>x.id===umfId); if(!u||_rfUmfrageZu(u))return;
  const st=_rf.stand[umfId]||{};
  const meine=Object.keys(st).filter(k=>st[k].ich).map(Number);
  const neu=u.mehrfach?(meine.includes(i)?meine.filter(k=>k!==i):[...meine,i]):(meine.length===1&&meine[0]===i?[]:[i]);
  try{ const r=await _rfRpc("rufe_abstimmen",{p_umfrage:umfId,p_optionen:neu}); if(!r.ok){ const t=await r.text().catch(()=>""); toast(/beendet/.test(t)?"Die Abstimmung ist schon beendet":"Stimme nicht gespeichert","err"); return; } }
  catch(e){ toast("Kein Netz – Stimme nicht gespeichert","err"); return; }
  await rufeLaden(false);
}
async function rufeUmfrageBeenden(umfId){
  document.getElementById("rufe-menue")?.remove();
  if(!await frageJaNein({emoji:"🏁",titel:"Abstimmung beenden?",text:"Danach kann niemand mehr abstimmen. Das Ergebnis bleibt stehen.",ja:"Beenden",nein:"Abbrechen"}))return;
  try{ const r=await _rfRpc("rufe_umfrage_beenden",{p_umfrage:umfId}); if(!r.ok){ toast("Das ging nicht","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Abstimmung beendet"); await rufeLaden(false);
}
function rufeUmfrageNeu(){
  if(!_rf||!_rf.raum)return;
  _rf.uNeu={anonym:false};
  const feld=(i)=>`<label for="rf-opt-${i}" style="position:absolute;left:-9999px">Antwort ${i+1}</label><input id="rf-opt-${i}" class="rf-opt" type="text" maxlength="80" placeholder="Antwort ${i+1}" style="width:100%;box-sizing:border-box;min-height:48px;margin-top:6px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">`;
  const wahl=(an,txt,on)=>`<button type="button" class="rf-art" onclick="${on}" aria-pressed="${an}" style="flex:1;min-height:48px;border:1.5px solid ${an?"#1e3a8a":"var(--rand-bedien)"};border-radius:12px;background:${an?"#1e3a8a":"var(--surface)"};color:${an?"#fff":"var(--text)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${txt}</button>`;
  _rfBlatt("rufe-menue","📊 Abstimmung starten",`<label for="rf-frage" style="display:block;font-size:var(--s-klein);color:var(--text2)">Frage</label>
    <input id="rf-frage" type="text" maxlength="300" placeholder="z. B. Grillen nach dem Heimspiel?" style="width:100%;box-sizing:border-box;min-height:48px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">
    <div id="rf-opts">${feld(0)}${feld(1)}</div>
    <button type="button" id="rf-opt-mehr" onclick="rufeUmfrageOption()" class="btn" style="width:100%;justify-content:center;margin-top:6px">＋ Antwort</button>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:10px">Wer sieht, wer was gewählt hat?</div>
    <div id="rf-arten" style="display:flex;gap:8px;margin-top:4px">${wahl(true,"Namentlich","rufeUmfrageArt(false)")}${wahl(false,"Anonym","rufeUmfrageArt(true)")}</div>
    <div id="rf-art-hinweis" style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Namentlich: alle sehen, wer was gewählt hat.</div>
    <label style="${_RF_ZEILE}"><input id="rf-mehrfach" type="checkbox" style="width:22px;height:22px"> Mehrere Antworten erlaubt</label>
    <label style="${_RF_ZEILE}"><input id="rf-verdeckt" type="checkbox" style="width:22px;height:22px"> Ergebnis erst am Schluss zeigen</label>
    <label for="rf-schluss" style="display:block;font-size:var(--s-klein);color:var(--text2);margin-top:10px">Schluss</label>
    <select id="rf-schluss" style="width:100%;min-height:48px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">
      <option value="">Offen, bis jemand beendet</option><option value="24">In 24 Stunden</option><option value="72">In 3 Tagen</option><option value="168">In 7 Tagen</option></select>
    <button type="button" id="rf-umfrage-los" class="btn btn-p" style="width:100%;justify-content:center;margin-top:6px" onclick="rufeUmfrageAnlegen()">Abstimmung starten</button>`);
  setTimeout(()=>document.getElementById("rf-frage")?.focus(),50);
}
function rufeUmfrageOption(){
  const box=document.getElementById("rf-opts"); if(!box)return;
  const n=box.querySelectorAll(".rf-opt").length; if(n>=6)return;
  box.insertAdjacentHTML("beforeend",`<label for="rf-opt-${n}" style="position:absolute;left:-9999px">Antwort ${n+1}</label><input id="rf-opt-${n}" class="rf-opt" type="text" maxlength="80" placeholder="Antwort ${n+1}" style="width:100%;box-sizing:border-box;min-height:48px;margin-top:6px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">`);
  document.getElementById("rf-opt-"+n)?.focus();
  if(n+1>=6){ const b=document.getElementById("rf-opt-mehr"); if(b)b.style.display="none"; }
}
function rufeUmfrageArt(anonym){
  if(!_rf)return; _rf.uNeu={...(_rf.uNeu||{}),anonym};
  document.querySelectorAll("#rf-arten .rf-art").forEach((b,i)=>{ const an=(i===1)===anonym;
    b.setAttribute("aria-pressed",String(an)); b.style.background=an?"#1e3a8a":"var(--surface)"; b.style.color=an?"#fff":"var(--text)"; b.style.borderColor=an?"#1e3a8a":"var(--rand-bedien)"; });
  const h=document.getElementById("rf-art-hinweis");
  if(h)h.textContent=anonym?"Anonym: niemand sieht, wer was gewählt hat – auch das Trainerteam nicht. Nur die Zahlen sind sichtbar.":"Namentlich: alle sehen, wer was gewählt hat.";
}
async function rufeUmfrageAnlegen(){
  if(!_rf||!_rf.raum)return;
  const frage=(document.getElementById("rf-frage")?.value||"").trim();
  const opts=[...document.querySelectorAll("#rf-opts .rf-opt")].map(x=>x.value.trim()).filter(Boolean);
  const eind=[...new Set(opts.map(o=>o.toLowerCase()))];
  if(!frage){ toast("Bitte eine Frage eintragen","err"); document.getElementById("rf-frage")?.focus(); return; }
  if(eind.length<2){ toast("Bitte mindestens zwei verschiedene Antworten eintragen","err"); return; }
  const std=document.getElementById("rf-schluss")?.value;
  const knopf=document.getElementById("rf-umfrage-los"); if(knopf)knopf.disabled=true;
  try{
    const r=await _rfRpc("rufe_umfrage_erstellen",{p_raum:_rf.raum,p_frage:frage,p_optionen:opts,p_anonym:!!(_rf.uNeu&&_rf.uNeu.anonym),
      p_mehrfach:!!document.getElementById("rf-mehrfach")?.checked,p_stunden:std?Number(std):null,
      ...(document.getElementById("rf-verdeckt")?.checked?{p_verdeckt:true}:{})});   // v964
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){ toast("Abstimmung nicht gestartet – bitte gleich noch einmal","err"); return; }
  }catch(e){ toast("Kein Netz – Abstimmung nicht gestartet","err"); return; }
  finally{ if(knopf)knopf.disabled=false; }
  document.getElementById("rufe-menue")?.remove(); toast("Abstimmung gestartet");
  await rufeLaden(true);
}

/* ── Suche ────────────────────────────────────────────────────────────────────── */
function rufeSucheUmschalten(){
  const s=document.getElementById("rufe-suche"); if(!s||!_rf)return;
  const an=s.style.display==="none"; s.style.display=an?"block":"none";
  if(an)setTimeout(()=>document.getElementById("rufe-suche-feld")?.focus(),30);
  else{ _rf.suche=""; const f=document.getElementById("rufe-suche-feld"); if(f)f.value=""; rufeRender(); }
}
let _rfSucheT=null;
function rufeSucheSetzen(q){
  if(!_rf)return; _rf.suche=String(q||"").trim();
  clearTimeout(_rfSucheT); _rfSucheT=setTimeout(rufeSucheRender,250);
  if(!_rf.suche)rufeRender();
}
async function rufeSucheRender(){
  if(!_rf||!_rf.suche)return;
  const box=document.getElementById("rufe-liste"); if(!box)return;
  const q=_rf.suche.replace(/[%*,()]/g," ").trim(); if(!q)return;
  const treffer=await _rfGet(`rufe_nachricht?text=ilike.*${encodeURIComponent(q)}*&archiviert_am=is.null&select=id,raum_id,autor_name,text,created_at&order=created_at.desc&limit=40`);
  if(!_rf||!_rf.suche)return;
  const raum=id=>_rfRaumName(_rf.raeume.find(r=>r.id===id));
  box.innerHTML=`<div style="font-size:var(--s-klein);color:var(--text2);margin:4px 0 8px">${treffer.length} Treffer für „${esc(_rf.suche)}“</div>`
    +(treffer.length?treffer.map(n=>`<button type="button" onclick="rufeSucheSprung(${Number(n.raum_id)},${Number(n.id)})" class="btn btn-zeile" style="display:block;margin-top:6px">
      <div style="font-size:var(--s-klein);color:var(--text2)">${esc(n.autor_name||"")} · ${esc(_rfTag(n.created_at))} ${_rfZeit(n.created_at)}${_rf.raeume.length>1?" · "+esc(raum(n.raum_id)):""}</div>
      <div style="font-size:var(--s-text)">${_rfText(String(n.text).slice(0,200))}</div></button>`).join(""):`<div style="color:var(--text2);font-size:var(--s-text)">Nichts gefunden.</div>`);
}
async function rufeSucheSprung(raumId,id){
  if(!_rf)return;
  _rf.suche=""; const s=document.getElementById("rufe-suche"); if(s)s.style.display="none";
  const f=document.getElementById("rufe-suche-feld"); if(f)f.value="";
  if(_rf.raum!==raumId){ _rf.raum=raumId; rufeRaeumeRender(); }
  await rufeLaden(true);
  rufeHinspringen(id);
}

/* ── Zahl der ungelesenen Rufe (Startseite, Kachel) ───────────────────────────── */
async function rufeBadgeLoad(){
  const els=[...document.querySelectorAll(".rufe-badge")];
  const hinweis=document.getElementById("rufe-hinweis");
  if(!els.length&&!hinweis)return;
  if(typeof sbToken==="function"&&!sbToken())return;
  let n=0, alle=false;
  // lesend per GET (die Funktion ist stable) – ein POST sähe aus wie ein Schreibzugriff
  /* v837: Der Hinweis öffnete immer den ersten offenen Raum – ein neuer Ruf im privaten Raum
     oder in der Elternrunde blieb einen Tipp entfernt, und die Vorschau zeigte den jüngsten Ruf
     irgendeines Raums. Jetzt merkt sich die App den Raum mit dem meisten Ungelesenen. */
  let neuRaum=null, neuMax=0;
  (await _rfGet("rpc/rufe_ungelesen")).forEach(x=>{ const a=Number(x.anzahl)||0; n+=a; if(x.an_alle)alle=true; if(a>neuMax&&x.raum_id!=null){ neuMax=a; neuRaum=x.raum_id; } });
  window._rufeNeuRaum=n?neuRaum:null;
  /* v673: Gibt es Neues, steht auf der Eltern-Startseite ganz oben eine schmale Zeile mit dem
     letzten Ruf – ein Tipp öffnet den Chat. Ohne Neues bleibt der Platz leer. */
  if(hinweis){
    let letzter=null;
    if(n){ const l=await _rfGet(`rufe_nachricht?archiviert_am=is.null${neuRaum!=null?"&raum_id=eq."+encodeURIComponent(neuRaum):""}&select=autor_name,text,autor&order=created_at.desc&limit=5`); letzter=l.find(x=>x.autor!==_rfUid())||null; }
    hinweis.innerHTML=n?`<button type="button" class="btn btn-zeile" onclick="rufeEinstieg()" style="margin-bottom:10px">
      <span aria-hidden="true" style="font-size:var(--s-teil)">💬</span>
      <span style="flex:1;min-width:0"><b style="display:block;font-size:var(--s-text)">${n===1?"1 neuer Adler-Ruf":n+" neue Adler-Rufe"}${alle?" · an alle":""}</b>${typeof kanalUnter==="function"?kanalUnter("rufe"):""}
        ${letzter?`<span style="display:block;font-size:var(--s-klein);color:var(--text2);font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(letzter.autor_name||"")}: ${esc(letzter.text||"")}</span>`:""}</span>
      <span aria-hidden="true">›</span></button>`:"";
  }
  els.forEach(el=>{ el.textContent=n?(n>99?"99+":String(n)):""; el.style.display=n?"inline-flex":"none";
    el.setAttribute("aria-label",n?`${n} neue Adler-Rufe${alle?", davon an alle":""}`:""); el.style.background=alle?"#b45309":"#dc2626"; });
}

/* ── Trainerbereich: Moderation (wer moderiert, offene Meldungen) ─────────────── */
async function rufeModOpen(){
  document.getElementById("rufe-mod-modal")?.remove();
  const m=document.createElement("div"); m.id="rufe-mod-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Adler-Rufe moderieren");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.style.zIndex=_rfZ(10002);
  m.onclick=e=>{ if(e.target===m)m.remove(); };
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:560px;width:100%;margin:auto">
    ${mdlHead("rufe-mod-modal","🛡️","Adler-Rufe moderieren","Wer moderiert · gemeldete Rufe","#1e3a8a")}
    <div id="rufe-mod-inhalt" style="font-size:var(--s-text);color:var(--text2)">Lädt …</div></div>`;
  document.body.appendChild(m);
  await rufeModRender();
}
async function rufeModRender(){
  const box=document.getElementById("rufe-mod-inhalt"); if(!box)return;
  const [mods,ek,kader,meld]=await Promise.all([
    _rfGet("rufe_moderator?select=email"), _rfGet("eltern_kinder?select=email,spieler_id"), _rfGet("kader?select=id,name"),
    _rfGet("rufe_meldung?erledigt=eq.false&select=id,nachricht_id,created_at,rufe_nachricht(id,autor_name,text,archiviert_am)&order=created_at.desc")
  ]);
  const kname={}; kader.forEach(k=>kname[k.id]=k.name);
  const wer=email=>{ const ks=ek.filter(x=>(x.email||"").toLowerCase()===email).map(x=>kname[x.spieler_id]).filter(Boolean); return ks.length?"Elternteil von "+ks.join(", "):email; };
  const frei=[...new Set(ek.map(x=>(x.email||"").toLowerCase()).filter(Boolean))].filter(e=>!mods.some(t=>t.email===e)).sort((a,b)=>wer(a).localeCompare(wer(b),"de"));
  box.innerHTML=`<div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:4px 0 6px">Moderieren (außer dem Trainerteam)</div>
    ${mods.length?mods.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--surface2);color:var(--text)"><span style="flex:1">🛡️ ${esc(wer(t.email))}</span>
      <button class="btn btn-sm" onclick="rufeModEntfernen('${esc(t.email)}')" aria-label="Moderation für ${esc(wer(t.email))} beenden">Entfernen</button></div>`).join(""):`<div style="color:var(--text2)">Noch niemand – z. B. den Elternbeirat hinzufügen.</div>`}
    <label for="rufe-mod-neu" style="display:block;font-size:var(--s-klein);color:var(--text2);margin-top:10px">Elternteil hinzufügen</label>
    <div style="display:flex;gap:8px;margin-top:4px"><select id="rufe-mod-neu" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:8px;font:inherit;background:var(--surface2);color:var(--text)">
      <option value="">– Elternteil wählen –</option>${frei.map(e=>`<option value="${esc(e)}">${esc(wer(e))}</option>`).join("")}</select>
      <button class="btn" onclick="rufeModSetzen()">Hinzufügen</button></div>
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:18px 0 6px">Gemeldete Rufe</div>
    ${meld.length?meld.map(x=>{ const n=x.rufe_nachricht||{}; return `<div style="border-top:1px solid var(--surface2);padding:8px 0;color:var(--text)">
      <div style="font-size:var(--s-klein);color:var(--text2)">${esc(n.autor_name||"")} · gemeldet ${esc(_rfTag(x.created_at))} ${_rfZeit(x.created_at)}${n.archiviert_am?" · schon archiviert":""}</div>
      <div style="margin:2px 0 6px">${_rfText(n.text||"")}</div>
      <div style="display:flex;gap:8px">${n.archiviert_am?"":`<button class="btn btn-sm" onclick="rufeModArchivieren(${Number(x.id)},${Number(x.nachricht_id)})">Archivieren</button>`}
        <button class="btn btn-sm" onclick="rufeModErledigt(${Number(x.id)})">Erledigt, bleibt stehen</button></div></div>`; }).join(""):`<div style="color:var(--text2)">Keine offenen Meldungen.</div>`}`;
}
async function rufeModSetzen(){
  const email=(document.getElementById("rufe-mod-neu")?.value||"").toLowerCase(); if(!email)return;
  try{ const r=await fetch(`${SB_URL}/rest/v1/rufe_moderator`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=ignore-duplicates,return=minimal'}),body:JSON.stringify({email})}); if(!r.ok){ toast("Nicht gespeichert","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  toast("Moderation übergeben"); rufeModRender();
}
async function rufeModEntfernen(email){
  if(!await frageJaNein({emoji:"🛡️",titel:"Moderation beenden?",text:"Das Elternteil kann danach nicht mehr fixieren, archivieren oder stummschalten.",ja:"Beenden",nein:"Abbrechen",ton:"rot"}))return;
  try{ await fetch(`${SB_URL}/rest/v1/rufe_moderator?email=eq.${encodeURIComponent(email)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=minimal'})}); }catch(e){}
  rufeModRender();
}
async function rufeModErledigt(id){
  try{ await fetch(`${SB_URL}/rest/v1/rufe_meldung?id=eq.${Number(id)}`,{method:"PATCH",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify({erledigt:true})}); }catch(e){}
  rufeModRender();
}
async function rufeModArchivieren(meldId,nachrichtId){
  try{ const r=await _rfRpc("rufe_archivieren",{p_id:nachrichtId}); if(!r.ok){ toast("Nicht archiviert","err"); return; } }catch(e){ toast("Kein Netz","err"); return; }
  await rufeModErledigt(meldId); toast("Archiviert");
}
/* ── v673: Benachrichtigungen je Konto ab- und anschalten (Glocke im Kopf) ─────── */
/* v704: Die Ruhezeit steht sichtbar im Chat (PO 01.10.: keine Meldung bekommen – der Ruf kam um 22:56 Uhr).
   v705: Jede und jeder stellt die eigene Ruhezeit bei den Benachrichtigungen in den Einstellungen ein
   (core.js, ruhezeitRender); ohne eigene Wahl Eltern 21:30–7 Uhr, Trainer keine. Hier steht nur, was gilt. */
const RUFE_RUHE="21:30–7 Uhr";
function rufeRuhezeitText(an,trainer,r){
  if(!an)return "🔕 Benachrichtigungen zu Adler-Rufen sind für dich aus – die 🔔 oben schaltet sie wieder ein.";
  if(!r)r=trainer?{von:null,bis:null}:{von:"21:30",bis:"07:00"};
  /* v710: eine Kachel „Einstellungen“ gibt es nur bei Trainern – Eltern finden die Ruhezeit unter
     „Trainerteam kontaktieren“ bei den Benachrichtigungen (seit v860: „Mein Konto“). */
  const wo=trainer?" Ändern: Orga → Einstellungen → Benachrichtigungen.":" Ändern: oben ⋯ → „Mein Konto“ → Benachrichtigungen.";
  if(!r.von||!r.bis)return "🔔 Benachrichtigungen kommen rund um die Uhr."+wo;
  const z=typeof ruhezeitText==="function"?ruhezeitText(r):RUFE_RUHE;
  return "🔔 Benachrichtigungen ruhen "+z+" – was bis dahin ungelesen ist, kommt danach gesammelt."+wo;
}
/* v964: Glocke mit drei Stufen – alle Rufe · nur Erwähnungen und Antworten an mich (rufe_push_erwaehnung) · aus (rufe_push_aus).
   „Aus“ bleibt aus, auch für Erwähnungen. Der Hinweis zur Ruhezeit steht jetzt im Glocken-Blatt statt als feste Zeile im Chat. */
async function rufeGlockeLaden(){
  if(!_rf||!_rf.uid)return;
  const [aus,erw]=await Promise.all([_rfGet(`rufe_push_aus?user_id=eq.${_rf.uid}&select=user_id`),_rfGet(`rufe_push_erwaehnung?user_id=eq.${_rf.uid}&select=user_id`).catch(()=>[])]);
  if(_rf){ _rf.glockeAn=!aus.length; _rf.glockeStufe=aus.length?"aus":(erw&&erw.length?"erwaehnung":"alle"); _rfGlockeZeigen(_rf.glockeAn); }
}
function _rfGlockeZeigen(an){
  const b=document.getElementById("rufe-glocke"); if(!b)return;
  const st=(_rf&&_rf.glockeStufe)||(an?"alle":"aus");
  b.textContent=st==="aus"?"🔕":st==="erwaehnung"?"🔔@":"🔔"; b.setAttribute("aria-pressed",String(an));
  b.setAttribute("aria-label",st==="aus"?"Benachrichtigungen zu Adler-Rufen sind aus":st==="erwaehnung"?"Benachrichtigungen nur bei Erwähnung und Antwort":"Benachrichtigungen zu Adler-Rufen sind an");
  const z=document.getElementById("rufe-ruhe"); if(!z)return;
  const tr=!!(_rf&&_rf.trainer);
  z.textContent=rufeRuhezeitText(an,tr);
  if(an&&typeof ruhezeitLaden==="function")ruhezeitLaden(tr?"trainer":"parent").then(r=>{ if(document.getElementById("rufe-ruhe")===z&&_rf&&_rf.glockeAn!==false)z.textContent=rufeRuhezeitText(true,tr,r); }).catch(()=>{});
}
function rufeGlockeMenue(){
  if(!_rf)return;
  const st=_rf.glockeStufe||(_rf.glockeAn===false?"aus":"alle");
  const z=(wert,emo,titel,text)=>`<button type="button" class="btn btn-zeile rf-glocke-wahl" style="margin-top:6px" aria-pressed="${st===wert}" onclick="rufeGlockeSetzen('${wert}')"><span aria-hidden="true">${emo}</span><span style="flex:1;min-width:0"><b style="display:block">${titel}</b><small style="color:var(--text2)">${text}</small></span>${st===wert?`<span aria-hidden="true">✓</span>`:""}</button>`;
  _rfBlatt("rufe-menue","Benachrichtigungen zu Adler-Rufen",
    z("alle","🔔","Alle Rufe","Neue Rufe kommen gebündelt, Trainerteam und Erwähnungen sofort")
    +z("erwaehnung","@","Nur für mich","Wenn mich jemand mit @ erwähnt, mir antwortet oder @alle schreibt")
    +z("aus","🔕","Aus","Keine Benachrichtigungen – die Zahl am Knopf bleibt")
    +`<div class="rf-ruhe-text">${esc(document.getElementById("rufe-ruhe")?.textContent||"")}</div>`);
}
async function rufeGlockeSetzen(wert){
  if(!_rf||!_rf.uid)return;
  document.getElementById("rufe-menue")?.remove();
  const h=x=>sbAuthHeaders({'Prefer':'return=minimal'+(x?',resolution=ignore-duplicates':'')});
  try{
    const auf=[];
    auf.push(wert==="aus"?fetch(`${SB_URL}/rest/v1/rufe_push_aus`,{method:"POST",headers:h(1),body:JSON.stringify({user_id:_rf.uid})})
                          :fetch(`${SB_URL}/rest/v1/rufe_push_aus?user_id=eq.${_rf.uid}`,{method:"DELETE",headers:h()}));
    auf.push(wert==="erwaehnung"?fetch(`${SB_URL}/rest/v1/rufe_push_erwaehnung`,{method:"POST",headers:h(1),body:JSON.stringify({user_id:_rf.uid})})
                                :fetch(`${SB_URL}/rest/v1/rufe_push_erwaehnung?user_id=eq.${_rf.uid}`,{method:"DELETE",headers:h()}));
    const r=await Promise.all(auf); if(r.some(x=>!x.ok)){ toast("Nicht gespeichert","err"); return; }
  }catch(e){ toast("Kein Netz","err"); return; }
  _rf.glockeStufe=wert; _rf.glockeAn=wert!=="aus"; _rfGlockeZeigen(_rf.glockeAn);
  toast(wert==="aus"?"Keine Benachrichtigungen mehr zu Adler-Rufen":wert==="erwaehnung"?"Benachrichtigung nur noch, wenn es dich betrifft":"Benachrichtigungen zu allen Rufen an");
}
/* Bisheriger Schalter (an/aus) – bleibt für alte Aufrufe */
async function rufeGlockeUmschalten(){ return rufeGlockeSetzen(_rf&&_rf.glockeAn!==false?"aus":"alle"); }
/* ── v964: „Für mich“ – Erwähnungen, Antworten auf meine Rufe und @alle der letzten 30 Tage, über alle Räume ── */
async function rufeFuerMichLaden(){
  if(!_rf)return;
  let l=[]; try{ const r=await _rfRpc("rufe_fuer_mich",{}); if(r.ok)l=await r.json(); }catch(e){}
  if(!_rf)return;
  _rf.fuerMich=Array.isArray(l)?l:[];
  try{ _rf.fuerMichGesehen=localStorage.getItem("adler_rufe_fuermich_"+_rf.uid)||""; }catch(e){}
  rufeRaeumeRender();
}
function rufeFuerMich(){
  if(!_rf)return;
  _rf.ansicht="fuermich"; rufeRaeumeRender();
  const box=document.getElementById("rufe-liste"); if(!box)return;
  document.getElementById("rufe-fix").innerHTML="";
  const l=_rf.fuerMich||[], grund={erwaehnt:"hat dich erwähnt",antwort:"hat dir geantwortet",alle:"an alle"};
  const raum=id=>{ const r=_rf.raeume.find(x=>x.id===id); return r?_rfRaumName(r):""; };
  box.innerHTML=`<div class="rf-fm-kopf">@ Für mich – die letzten 30 Tage</div>`+(l.length?l.map(n=>`<button type="button" class="rf-fm" onclick="rufeFuerMichSprung(${Number(n.raum_id)},${Number(n.id)})">
      <span class="rf-ava rf-f${_rfFarbe(n.autor||n.autor_name)}" aria-hidden="true">${esc(_rfInitialen(n.autor_name))}</span>
      <span class="rf-fm-txt"><small>${esc(n.autor_name||"")} ${grund[n.grund]||""} · ${esc(raum(n.raum_id))} · ${esc(_rfTag(n.created_at))} ${_rfZeit(n.created_at)}</small><span>${esc(String(n.text||"").replace(/\s+/g," ").slice(0,160))}</span></span></button>`).join("")
    :`<div class="rf-leer">Noch nichts für dich.<br>Hier landen Rufe, in denen dich jemand mit @ erwähnt oder dir antwortet.</div>`);
  const neu=l[0]?l[0].created_at:""; if(neu){ _rf.fuerMichGesehen=neu; try{ localStorage.setItem("adler_rufe_fuermich_"+_rf.uid,neu); }catch(e){} rufeRaeumeRender(); }
}
async function rufeFuerMichSprung(raumId,id){
  if(!_rf)return;
  _rf.ansicht=null;
  if(_rf.raum!==raumId){ _rf.raum=raumId; _rf.kennung=null; }
  rufeRaeumeRender();
  await rufeLaden(true);
  rufeHinspringen(id);
}
/* v673: Kam man über eine Benachrichtigung (?rufe), öffnet sich der Chat, sobald angemeldet ist –
   im Trainerbereich erst, wenn die PIN-Sperre offen ist. Höchstens zwei Minuten lang. */
function _rfAbsicht(){
  let n=0;
  const t=setInterval(()=>{
    let offen=null; try{offen=sessionStorage.getItem("adler_rufe_intent");}catch(e){}
    if(!offen||++n>300){ clearInterval(t); return; }   // v837: alle 0,4 s statt alle 2 s – weiter höchstens zwei Minuten
    const gate=document.getElementById("pin-gate");
    const gesperrt=gate&&!gate.classList.contains("hidden")&&getComputedStyle(gate).display!=="none";
    if(gesperrt||typeof sbToken!=="function"||!sbToken())return;
    try{sessionStorage.removeItem("adler_rufe_intent");}catch(e){}
    clearInterval(t);
    rufeOpen(/^\d+$/.test(offen)?Number(offen):undefined);   // v674: ?rufe=<Raum> aus der Benachrichtigung
  },400);
}
_rfAbsicht();
/* v697: Tipp auf eine Meldung, während die App offen ist – sofort prüfen statt erst in 2 s.
   Ist das Gespräch schon offen, nur den Raum wechseln. */
function rufeAbsichtJetzt(){
  let offen=null; try{offen=sessionStorage.getItem("adler_rufe_intent");}catch(e){}
  if(!offen)return;
  const gate=document.getElementById("pin-gate");
  const gesperrt=gate&&!gate.classList.contains("hidden")&&getComputedStyle(gate).display!=="none";
  if(gesperrt||typeof sbToken!=="function"||!sbToken()){ _rfAbsicht(); return; }
  try{sessionStorage.removeItem("adler_rufe_intent");}catch(e){}
  const raum=/^\d+$/.test(offen)?Number(offen):undefined;
  if(document.getElementById("rufe-modal")&&raum!==undefined&&typeof rufeRaumWechseln==="function"){ rufeRaumWechseln(raum); return; }
  rufeOpen(raum);
}
/* v673: Zahl der neuen Rufe regelmäßig nachziehen (alle 2 Minuten, nur wenn die App sichtbar ist). */
setTimeout(rufeBadgeLoad,1500);
setInterval(()=>{ if(!document.hidden&&!document.getElementById("rufe-modal"))rufeBadgeLoad(); },120000);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden)rufeBadgeLoad(); });
/* ── v736: Anhänge ────────────────────────────────────────────────────────────── */
/* Reine Regeln (im Prüfstand ohne Netz testbar): Name bereinigen, Typ und Größe prüfen, Größe lesbar. */
function rufeAnhangName(roh){
  let n=String(roh==null?"":roh).split(/[\\/]/).pop();
  n=n.replace(/[\u0000-\u001f\u007f]/g,"").replace(/[:*?"<>|]/g,"_").replace(/\s+/g," ").trim().replace(/^\.+/,"");
  if(!n)n="Datei";
  if(n.length>120){ const m=n.match(/(\.[A-Za-z0-9]{1,5})$/); const e=m?m[1]:""; n=n.slice(0,120-e.length)+e; }
  return n;
}
function rufeAnhangPruefen(name,groesse){
  const m=String(name||"").toLowerCase().match(/\.([a-z0-9]{1,5})$/), e=m?m[1]:"";
  const mime=RUFE_ANHANG_TYPEN[e];
  if(!mime)return {ok:false,grund:`„${rufeAnhangName(name)}“ geht nicht: erlaubt sind Bilder, PDF, Word, Excel und PowerPoint.`};
  if(!(Number(groesse)>0))return {ok:false,grund:`„${rufeAnhangName(name)}“ ist leer.`};
  if(Number(groesse)>RUFE_ANHANG_BYTES)return {ok:false,grund:`„${rufeAnhangName(name)}“ ist größer als 10 MB und lässt sich deshalb nicht anhängen.`};
  return {ok:true,endung:e==="jpeg"?"jpg":e,mime,art:/^image\//.test(mime)?"bild":e==="pdf"?"pdf":"office"};
}
function rufeGroesseText(b){
  b=Number(b)||0;
  return b<1048576?Math.max(1,Math.round(b/1024))+" KB":(b/1048576).toFixed(1).replace(".",",")+" MB";
}
function _rfAnhangSymbol(mime){
  return /^image\//.test(mime)?"🖼️":mime==="application/pdf"?"📄":/word/.test(mime)?"📝":/excel|sheet/.test(mime)?"📊":/powerpoint|presentation/.test(mime)?"📽️":"📎";
}
function _rfUuid(){
  if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();
  const h=[...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,"0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
/* Bilder: längste Kante 1600 px. Screenshots (PNG) bleiben PNG, solange sie höchstens 2 MB groß sind.
   Kann der Browser das Bild nicht lesen (oft HEIC), geht es unverändert. */
async function rufeBildKleiner(file,mime){
  let bild;
  try{ bild=await createImageBitmap(file); }catch(e){ return null; }
  const f=Math.min(1,1600/Math.max(bild.width,bild.height));
  const cv=document.createElement("canvas"); cv.width=Math.round(bild.width*f); cv.height=Math.round(bild.height*f);
  cv.getContext("2d").drawImage(bild,0,0,cv.width,cv.height);
  const blob=(typ,q)=>new Promise(res=>cv.toBlob(res,typ,q));
  if(mime==="image/png"){ const p=await blob("image/png"); if(p&&p.size<=2*1048576)return {blob:p,mime:"image/png",endung:"png"}; }
  const j=await blob("image/jpeg",0.85);
  return j?{blob:j,mime:"image/jpeg",endung:"jpg"}:null;
}
async function rufeDateiWahl(input){
  if(!_rf)return;
  const liste=[...(input.files||[])]; input.value="";
  for(const f of liste){
    if(_rf.dateien.length>=RUFE_ANHANG_MAX){ toast("Höchstens vier Anhänge je Ruf – die übrigen sind nicht dabei."); break; }
    const pr=rufeAnhangPruefen(f.name,f.size);
    if(!pr.ok){ toast(pr.grund,"err"); continue; }
    let d={name:rufeAnhangName(f.name),mime:pr.mime,endung:pr.endung,art:pr.art,blob:f};
    if(pr.art==="bild"){
      const k=await rufeBildKleiner(f,pr.mime);
      if(k){ d.blob=k.blob; d.mime=k.mime; d.endung=k.endung; if(k.endung!==pr.endung)d.name=rufeAnhangName(d.name.replace(/\.[^.]+$/,"")+"."+k.endung); }
      if(d.blob.size>RUFE_ANHANG_BYTES){ toast(`„${d.name}“ ist größer als 10 MB und lässt sich deshalb nicht anhängen.`,"err"); continue; }
      try{ if(d.mime!=="image/heic")d.vorschau=URL.createObjectURL(d.blob); }catch(e){}
    }
    if(!_rf)return;
    _rf.dateien.push(d);
  }
  rufeChipsRender();
}
function rufeAnhangWeg(i){
  if(!_rf)return;
  const d=_rf.dateien[i]; if(d&&d.vorschau)URL.revokeObjectURL(d.vorschau);
  _rf.dateien.splice(i,1); rufeChipsRender();
}
function rufeChipsRender(){
  const box=document.getElementById("rufe-chips"), hin=document.getElementById("rufe-offen-hinweis"); if(!box||!_rf)return;
  const r=_rfAktRaum();
  box.style.display=_rf.dateien.length?"flex":"none";
  if(hin)hin.style.display=(_rf.dateien.length&&r&&!r.familie_kind)?"block":"none";
  box.innerHTML=_rf.dateien.map((d,i)=>`<div class="rf-chip" style="display:flex;align-items:center;gap:6px;max-width:100%;min-height:44px;padding:2px 2px 2px 6px;border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface2);color:var(--text)">
      ${d.vorschau?`<img src="${d.vorschau}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:8px;flex:none">`:`<span aria-hidden="true" style="font-size:var(--s-teil);flex:none">${_rfAnhangSymbol(d.mime)}</span>`}
      <span style="min-width:0;display:flex;flex-direction:column"><span style="font-size:var(--s-klein);font-weight:700;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.name)}</span><span style="font-size:var(--s-klein);color:var(--text2)">${rufeGroesseText(d.blob.size)}</span></span>
      <button type="button" class="rf-chip-weg btn btn-sm" onclick="rufeAnhangWeg(${i})" aria-label="Anhang ${esc(d.name)} entfernen" style="flex:none;min-width:44px;justify-content:center">✕</button></div>`).join("");
}
async function _rfAufraeumen(liste){
  for(const a of liste||[]){ try{ await fetch(`${SB_URL}/storage/v1/object/rufe-anhang/${a.pfad}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken(),'apikey':SB_KEY}}); }catch(e){} }
}
/* Nachrichten mit eingebetteten Anhängen in EINER Abfrage. Kennt die Datenbank rufe_anhang noch nicht
   (Migration v736 nicht eingespielt), lädt die App wie bisher ohne – die Rufe bleiben sichtbar. */
let _rfOhneAnhang=false;
async function _rfNachrichtenHolen(raum){
  const basis="id,autor,autor_name,autor_zusatz,autor_rolle,text,antwort_auf,an_alle,bearbeitet_am,archiviert_am,created_at,erwaehnt";
  const q=sel=>`rufe_nachricht?raum_id=eq.${raum}&select=${sel}&order=created_at.desc&limit=${RUFE_ANZAHL}`;
  if(!_rfOhneAnhang){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/${q(basis+",anhang_entfernt_am,rufe_anhang(id,pfad,name,mime,groesse)")}`,{headers:sbAuthHeaders()});
      if(r.ok)return await r.json();
      if(r.status===400)_rfOhneAnhang=true; else return [];
    }catch(e){ return []; }
  }
  return _rfGet(q(basis));
}
function rufeAnhaengeHtml(n){
  if(n.anhang_entfernt_am&&!(n.rufe_anhang||[]).length)return `<div class="rf-anhang-weg" style="margin-top:4px;font-size:var(--s-klein);color:var(--text2);font-style:italic">📎 Anhang entfernt</div>`;
  const l=n.rufe_anhang||[]; if(!l.length)return "";
  return `<div class="rf-anhaenge" style="display:flex;flex-direction:column;gap:6px;margin-top:6px">${l.map(a=>/^image\//.test(a.mime)
    ?`<button type="button" class="rf-bild" onclick="rufeAnhangOeffnen(${Number(n.id)},${Number(a.id)})" aria-label="Bild ${esc(a.name)} groß ansehen" style="display:block;padding:0;border:none;background:transparent;cursor:pointer;min-height:44px;text-align:left">
        <img data-pfad="${esc(a.pfad)}" alt="Bild: ${esc(a.name)}" style="display:block;max-width:100%;max-height:220px;min-width:120px;min-height:80px;border-radius:10px;background:var(--surface2);object-fit:cover"></button>`
    :`<button type="button" class="rf-datei btn btn-zeile" onclick="rufeAnhangOeffnen(${Number(n.id)},${Number(a.id)})" aria-label="${a.mime==="application/pdf"?"PDF öffnen":"Herunterladen"}: ${esc(a.name)}" style="min-height:44px">
        <span aria-hidden="true" style="font-size:var(--s-teil)">${_rfAnhangSymbol(a.mime)}</span>
        <span style="flex:1;min-width:0;font-size:var(--s-klein);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</span>
        <span style="font-size:var(--s-klein);color:var(--text2);flex:none">${rufeGroesseText(a.groesse)}</span></button>`).join("")}</div>`;
}
async function _rfBlob(pfad){
  if(!_rf)return null;
  if(_rf.blobs[pfad])return _rf.blobs[pfad];
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/rufe-anhang/${pfad}`,{headers:{'Authorization':'Bearer '+sbToken(),'apikey':SB_KEY}});
    if(!r.ok)return null;
    const u=URL.createObjectURL(await r.blob());
    if(!_rf){ URL.revokeObjectURL(u); return null; }
    _rf.blobs[pfad]=u; return u;
  }catch(e){ return null; }
}
/* Miniaturen erst laden, wenn sie ins Bild kommen */
let _rfBeob=null;
function rufeBilderBeobachten(){
  const imgs=[...document.querySelectorAll("#rufe-liste img[data-pfad]:not([src])")]; if(!imgs.length)return;
  const lade=async img=>{ const u=await _rfBlob(img.dataset.pfad); if(u&&img.isConnected)img.src=u; };
  if(!("IntersectionObserver" in window)){ imgs.forEach(lade); return; }
  if(!_rfBeob)_rfBeob=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ _rfBeob.unobserve(e.target); lade(e.target); } }),{root:document.getElementById("rufe-liste"),rootMargin:"200px"});
  imgs.forEach(i=>_rfBeob.observe(i));
}
function rufeWeiterlesen(id){
  if(!_rf)return; _rf.offen.add(id);
  const m=document.querySelector(`#rufe-liste .rf-msg[data-id="${Number(id)}"]`); if(!m)return;
  const t=m.querySelector(".rf-text"); if(t){ t.classList.remove("rf-lang"); ["display","-webkit-line-clamp","line-clamp","-webkit-box-orient","overflow"].forEach(p=>t.style.removeProperty(p)); }
  m.querySelector(".rf-weiter")?.remove();
}
async function rufeAnhangOeffnen(nid,aid){
  const n=_rf&&_rf.liste.find(x=>x.id===nid); const a=n&&(n.rufe_anhang||[]).find(x=>x.id===aid); if(!a)return;
  const u=await _rfBlob(a.pfad);
  if(!u){ toast("Der Anhang lässt sich gerade nicht laden – bitte gleich noch einmal","err"); return; }
  if(/^image\//.test(a.mime))return rufeBildGross(u,a.name);
  if(a.mime==="application/pdf"){ const w=window.open(u,"_blank"); if(w)return; }
  // Office (und PDF ohne neuen Tab): herunterladen, mit Originalnamen – nie in der App anzeigen
  const l=document.createElement("a"); l.href=u; l.download=a.name; l.rel="noopener"; document.body.appendChild(l); l.click(); l.remove();
}
function rufeBildGross(url,name){
  document.getElementById("rufe-gross")?.remove();
  const m=document.createElement("div"); m.id="rufe-gross";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Bild groß: "+name);
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;flex-direction:column;padding:12px";
  m.style.zIndex=_rfZ(10060);
  m.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="flex:1;min-width:0;color:#fff;font-size:var(--s-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name)}</span>
      <button type="button" id="rufe-gross-zoom" class="btn btn-sm" aria-pressed="false">🔍 Zoom</button>
      <button type="button" onclick="document.getElementById('rufe-gross')?.remove()" aria-label="Schließen" class="btn btn-kopf">✕</button></div>
    <div id="rufe-gross-box" style="flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;touch-action:pinch-zoom pan-x pan-y">
      <img src="${url}" alt="${esc(name)}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px"></div>`;
  document.body.appendChild(m);
  const img=m.querySelector("img"), z=m.querySelector("#rufe-gross-zoom"), box=m.querySelector("#rufe-gross-box");
  const zoom=()=>{ const an=z.getAttribute("aria-pressed")!=="true"; z.setAttribute("aria-pressed",String(an));
    img.style.maxWidth=an?"none":"100%"; img.style.maxHeight=an?"none":"100%"; img.style.width=an?"200%":""; box.style.alignItems=an?"flex-start":"center"; box.style.justifyContent=an?"flex-start":"center"; };
  z.onclick=zoom; img.onclick=zoom;
  m.addEventListener("keydown",e=>{ if(e.key==="Escape")m.remove(); });
  setTimeout(()=>z.focus(),30);
}
async function rufeAnhaengeLoeschen(id){
  document.getElementById("rufe-menue")?.remove();
  const n=_rf&&_rf.liste.find(x=>x.id===id); const l=(n&&n.rufe_anhang)||[]; if(!l.length)return;
  if(!await frageJaNein({emoji:"🗑️",ton:"rot",titel:"Anhänge endgültig löschen?",
    text:`${l.length===1?"Der Anhang wird":"Die "+l.length+" Anhänge werden"} für alle gelöscht – auch für das Trainerteam, und nicht wiederherstellbar. Der Ruf bleibt mit dem Hinweis „Anhang entfernt“ stehen.`,
    ja:"Endgültig löschen",nein:"Abbrechen"}))return;
  // erst die Dateien, dann die Zeilen – scheitert der Speicher, bleibt alles, wie es war
  for(const a of l){
    try{ const r=await fetch(`${SB_URL}/storage/v1/object/rufe-anhang/${a.pfad}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken(),'apikey':SB_KEY}});
      if(!r.ok&&r.status!==404){ toast("Der Anhang ließ sich nicht löschen – bitte gleich noch einmal","err"); return; } }
    catch(e){ toast("Kein Netz – nichts gelöscht","err"); return; }
  }
  try{ const r=await _rfRpc("rufe_anhaenge_loeschen",{p_nachricht:id}); if(!r.ok){ toast("Die Dateien sind weg, der Eintrag noch nicht – bitte gleich noch einmal","err"); return; } }
  catch(e){ toast("Kein Netz","err"); return; }
  l.forEach(a=>{ const u=_rf&&_rf.blobs[a.pfad]; if(u){ URL.revokeObjectURL(u); delete _rf.blobs[a.pfad]; } });
  toast("Anhänge gelöscht");
  await rufeLaden(false);
}
function rufeModulDa(){ return true; }
