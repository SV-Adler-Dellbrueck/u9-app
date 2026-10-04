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
const RUFE_EMOJI=["👍","❤️","😂","⚽","👏","🙏"];
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
  return esc(String(t||"")).replace(/(^|\s)(@[\wÄÖÜäöüß-]+)/g,'$1<b class="rf-at" style="color:#1d4ed8">$2</b>').replace(/\n/g,"<br>");
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
  m.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1e3a8a;color:#fff;flex:none">
      <span style="font-size:var(--s-seite);line-height:1" aria-hidden="true">📣</span>
      <div style="flex:1;min-width:0"><div style="font-size:var(--s-karte);font-weight:800">Adler-Rufe</div>
        <div id="rufe-unter" style="font-size:var(--s-klein);opacity:.9">Eltern und Trainerteam</div></div>
      <button type="button" id="rufe-glocke" onclick="rufeGlockeUmschalten()" aria-label="Benachrichtigungen zu Adler-Rufen" aria-pressed="true" style="width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:var(--s-teil);cursor:pointer">🔔</button>
      ${/\/trainer\//.test(location.pathname)?`<button type="button" id="rufe-mod-knopf" onclick="rufeModOpen()" aria-label="Moderieren" title="Moderieren: wer moderiert, gemeldete Rufe" style="width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:var(--s-teil);cursor:pointer">🛡️</button>`:""}
      <button type="button" id="rufe-suche-knopf" onclick="rufeSucheUmschalten()" aria-label="Suchen" style="width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:var(--s-teil);cursor:pointer">🔍</button>
      <button type="button" onclick="rufeClose()" aria-label="Schließen" style="width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:var(--s-teil);cursor:pointer">✕</button>
    </div>
    <div id="rufe-ruhe" style="flex:none;padding:6px 12px;background:var(--surface);border-bottom:1px solid var(--surface2);color:var(--text2);font-size:var(--s-klein)">${rufeRuhezeitText(true,_rf.trainer)}</div>
    <div id="rufe-suche" style="display:none;padding:8px 12px;background:var(--surface);border-bottom:1px solid var(--surface2)">
      <label for="rufe-suche-feld" style="position:absolute;left:-9999px">Rufe durchsuchen</label>
      <input id="rufe-suche-feld" type="search" placeholder="Rufe durchsuchen …" oninput="rufeSucheSetzen(this.value)" style="width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:10px;font:inherit;background:var(--surface2);color:var(--text)">
    </div>
    <div id="rufe-raeume" style="display:flex;gap:6px;overflow-x:auto;padding:8px 12px;flex:none"></div>
    <div id="rufe-fix" style="flex:none"></div>
    <div id="rufe-liste" aria-live="polite" style="flex:1;overflow-y:auto;padding:8px 12px 12px"><div style="color:var(--text2);font-size:var(--s-text);padding:12px 0">Lade Rufe …</div></div>
    <div style="flex:none;background:var(--surface);border-top:1px solid var(--surface2);padding:8px 12px calc(8px + env(safe-area-inset-bottom))">
      <div id="rufe-antwort" style="display:none"></div>
      <div id="rufe-chips" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:6px"></div>
      <div id="rufe-offen-hinweis" style="display:none;font-size:var(--s-klein);color:var(--text2);margin:0 0 6px">Offener Raum – alle Eltern lesen mit. Bitte keine Fotos anderer Kinder.</div>
      <input id="rufe-datei" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onchange="rufeDateiWahl(this)" style="display:none">
      <div style="display:flex;gap:8px;align-items:flex-end">
        <button type="button" id="rufe-anhang-knopf" onclick="document.getElementById('rufe-datei')?.click()" aria-label="Datei anhängen" title="Datei anhängen (Bild, PDF, Office)" style="flex:none;width:48px;min-height:48px;border:1px solid var(--rand-bedien);border-radius:14px;background:var(--surface2);color:var(--text);font-size:var(--s-teil);cursor:pointer">📎</button>
        <button type="button" id="rufe-umfrage-knopf" onclick="rufeUmfrageNeu()" aria-label="Abstimmung starten" title="Abstimmung starten" style="flex:none;width:48px;min-height:48px;border:1px solid var(--rand-bedien);border-radius:14px;background:var(--surface2);color:var(--text);font-size:var(--s-teil);cursor:pointer">📊</button>
        <label for="rufe-text" style="position:absolute;left:-9999px">Ruf schreiben</label>
        <textarea id="rufe-text" rows="1" maxlength="5000" placeholder="Ruf schreiben …" oninput="rufeTextWachsen(this)" style="flex:1;min-height:48px;max-height:140px;resize:none;box-sizing:border-box;padding:12px;border:1px solid var(--rand-bedien);border-radius:14px;font:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)"></textarea>
        <button type="button" id="rufe-senden" onclick="rufeSenden()" style="min-width:56px;min-height:48px;border:none;border-radius:14px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-text);font-weight:800;cursor:pointer">Senden</button>
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
function _rfRaeumeHolen(){ return _rfGet("rufe_raum?archiviert=eq.false&select=id,name,emoji,sort,familie_kind&order=sort.asc,id.asc"); }
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
}
function _rfRaumName(r){
  if(!r)return "";
  if(r.familie_kind)return "🔒 "+(_rf&&_rf.trainer?(_rf.fam[r.familie_kind]||"Familie"):"Trainerteam");
  return (r.emoji||"💬")+" "+r.name;
}
function _rfAktRaum(){ return _rf?_rf.raeume.find(r=>r.id===_rf.raum)||null:null; }
function rufeTextWachsen(t){
  t.style.height="auto"; t.style.height=Math.min(140,t.scrollHeight)+"px";
  // v736: ab 4.500 Zeichen ein Zähler unter dem Feld
  const z=document.getElementById("rufe-zaehler"); if(!z||t.id!=="rufe-text")return;
  const rest=RUFE_MAX_TEXT-t.value.length;
  z.style.display=t.value.length>=4500?"block":"none"; z.textContent=`Noch ${Math.max(0,rest)} Zeichen`;
}

function rufeRaeumeRender(){
  const box=document.getElementById("rufe-raeume"); if(!box||!_rf)return;
  const chip=(an,txt,on,label)=>`<button type="button" onclick="${on}" aria-pressed="${an}" ${label?`aria-label="${label}"`:""} style="flex:none;min-height:44px;padding:6px 14px;border-radius:999px;border:1.5px solid ${an?"#1e3a8a":"var(--rand-bedien)"};background:${an?"#1e3a8a":"var(--surface)"};color:${an?"#fff":"var(--text)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer;white-space:nowrap">${txt}</button>`;
  const zahl=id=>_rf.unge[id]?` · ${_rf.unge[id]}`:"";
  const offen=_rf.raeume.filter(r=>!r.familie_kind), privat=_rf.raeume.filter(r=>r.familie_kind);
  box.style.display="flex";
  let html=offen.map(r=>chip(r.id===_rf.raum,esc(_rfRaumName(r))+zahl(r.id),`rufeRaumWechseln(${Number(r.id)})`)).join("");
  if(_rf.trainer){
    /* v674: Das Trainerteam hat viele Familienräume – ein Knopf öffnet die Liste; der gerade
       offene Familienraum steht zusätzlich als eigener Knopf daneben. */
    const ungeP=privat.reduce((a,r)=>a+(_rf.unge[r.id]||0),0);
    html+=chip(false,"🔒 Familien"+(ungeP?` · ${ungeP}`:""),"rufeFamilienOpen()","Private Nachricht an eine Familie");
    const akt=privat.find(r=>r.id===_rf.raum); if(akt)html+=chip(true,esc(_rfRaumName(akt)),`rufeRaumWechseln(${Number(akt.id)})`);
  }else{
    const eigen=privat[0];
    html+=eigen?chip(eigen.id===_rf.raum,"🔒 Trainerteam"+zahl(eigen.id),`rufeRaumWechseln(${Number(eigen.id)})`,"Privat an das Trainerteam")
               :chip(false,"🔒 Trainerteam","rufePrivat(null)","Privat an das Trainerteam");
  }
  box.innerHTML=html+(_rf.mod?chip(false,"＋ Raum","rufeRaumNeu()","Neuen Raum anlegen"):"");
  _rfKopfZeigen();
}
function _rfKopfZeigen(){
  rufeChipsRender();
  const r=_rfAktRaum(); const unter=document.getElementById("rufe-unter"), feld=document.getElementById("rufe-text");
  const privat=!!(r&&r.familie_kind);
  if(unter)unter.textContent=privat?(_rf.trainer?"Privat mit Familie "+(_rf.fam[r.familie_kind]||""):"Privat: nur ihr und das Trainerteam"):"Eltern und Trainerteam";
  if(feld)feld.placeholder=privat?(_rf.trainer?"Nachricht an die Familie …":"Nachricht an das Trainerteam …"):"Ruf schreiben …";
}
async function _rfUngelesenLaden(){
  if(!_rf)return; const u={};
  (await _rfGet("rpc/rufe_ungelesen")).forEach(x=>u[x.raum_id]=Number(x.anzahl)||0);
  if(_rf){ _rf.unge=u; rufeRaeumeRender(); }
}
/* v674: privaten Raum öffnen – Eltern ihren eigenen, das Trainerteam den einer Familie. Die
   Datenbank legt ihn beim ersten Mal an und prüft, wer hinein darf. */
async function rufePrivat(kind){
  if(!_rf)return;
  document.getElementById("rufe-menue")?.remove();
  let id=null;
  try{ const r=await _rfRpc("rufe_privat_raum",{p_kind:kind}); if(!r.ok){ toast(kind?"Diese Familie hat noch keinen Zugang":"Privater Raum nicht verfügbar","err"); return; } id=await r.json(); }
  catch(e){ toast("Kein Netz","err"); return; }
  if(!_rf)return;
  if(!_rf.raeume.some(r=>r.id===id))_rf.raeume=await _rfRaeumeHolen();
  _rf.raum=null; await rufeRaumWechseln(id);
}
function rufeFamilienOpen(){
  if(!_rf)return;
  const raumVon={}; _rf.raeume.filter(r=>r.familie_kind).forEach(r=>raumVon[r.familie_kind]=r);
  const liste=Object.keys(_rf.fam).map(k=>({k:Number(k),name:_rf.fam[k],raum:raumVon[k]||null,n:raumVon[k]?(_rf.unge[raumVon[k].id]||0):0}))
    .sort((a,b)=>(b.n-a.n)||((b.raum?1:0)-(a.raum?1:0))||a.name.localeCompare(b.name,"de"));
  _rfBlatt("rufe-menue","Privat an eine Familie",
    `<div style="font-size:var(--s-klein);color:var(--text2)">Lesen können nur diese Familie und das Trainerteam – der Elternbeirat nicht.</div>
    <div style="max-height:55vh;overflow-y:auto">${liste.length?liste.map(f=>`<button type="button" class="rf-familie" style="${_RF_ZEILE}" onclick="rufePrivat(${f.k})"><span aria-hidden="true">🔒</span><span style="flex:1">${esc(f.name)}</span>${f.n?`<b>${f.n} neu</b>`:f.raum?`<span style="font-size:var(--s-klein);color:var(--text2)">Verlauf</span>`:""}</button>`).join("")
      :`<div style="color:var(--text2);margin-top:8px">Noch keine Familie mit Zugang.</div>`}</div>`);
}
async function rufeRaumWechseln(id){
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
    ids.length?_rfGet(`rufe_umfrage?nachricht_id=in.(${ids.join(",")})&select=id,nachricht_id,optionen,anonym,mehrfach,schluss,beendet_am,von`):Promise.resolve([])
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
      :"Noch keine Rufe in diesem Raum.<br>Schreib den ersten – alle Eltern und das Trainerteam lesen mit."}</div>`;
    return;
  }
  let tag="", html="";
  _rf.liste.forEach(n=>{
    const t=_rfTag(n.created_at);
    if(t!==tag){ tag=t; html+=`<div style="text-align:center;margin:10px 0 6px"><span style="font-size:var(--s-klein);color:var(--text2);background:var(--surface2);border-radius:999px;padding:2px 10px">${esc(t)}</span></div>`; }
    html+=rufeNachrichtHtml(n);
  });
  box.innerHTML=html;
}
function rufeNachrichtHtml(n){
  const eigen=n.autor===_rf.uid;
  const arch=!!n.archiviert_am;
  const zitat=n.antwort_auf?(_rf.liste.find(x=>x.id===n.antwort_auf)||null):null;
  const r={}; _rf.reakt.filter(x=>x.nachricht_id===n.id).forEach(x=>{ (r[x.emoji]=r[x.emoji]||{n:0,ich:false}); r[x.emoji].n++; if(x.user_id===_rf.uid)r[x.emoji].ich=true; });
  const rolle=n.autor_rolle==="trainer"?"🦅 ":n.autor_rolle==="moderator"?"🛡️ ":"";
  const fixiert=_rf.fix.some(f=>f.nachricht_id===n.id);
  const lang=String(n.text||"").length>RUFE_LANG&&!_rf.offen.has(n.id);
  return `<div class="rf-msg" data-id="${Number(n.id)}" style="display:flex;justify-content:${eigen?"flex-end":"flex-start"};margin:6px 0">
    <div style="max-width:86%;min-width:0;background:${arch?"var(--surface2)":eigen?"#dbeafe":"var(--surface)"};color:var(--text);border:1px solid ${n.an_alle?"#b45309":"var(--surface2)"};border-radius:14px;padding:8px 10px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
        <b style="font-size:var(--s-klein)">${rolle}${esc(eigen?"Du":n.autor_name||"")}</b>
        ${n.autor_zusatz&&!eigen?`<span style="font-size:var(--s-klein);color:var(--text2)">${esc(n.autor_zusatz)}</span>`:""}
        ${n.an_alle?`<span style="font-size:var(--s-klein);font-weight:700;color:#92400e">@alle</span>`:""}
        ${fixiert?`<span style="font-size:var(--s-klein);color:var(--text2)">📌 fixiert</span>`:""}
      </div>
      ${n.antwort_auf?`<div class="rf-zitat" style="margin:4px 0;padding:4px 8px;border-left:3px solid #1e3a8a;background:var(--surface2);border-radius:6px;font-size:var(--s-klein);color:var(--text2)">${zitat?`<b>${esc(zitat.autor_name||"")}</b>: ${esc(String(zitat.text||"").slice(0,120))}`:"Antwort auf einen früheren Ruf"}</div>`:""}
      <div class="rf-text" style="font-size:var(--s-text);line-height:1.45;margin-top:2px;word-wrap:break-word;${arch?"color:var(--text2);font-style:italic;":""}${lang?"display:-webkit-box;-webkit-line-clamp:8;line-clamp:8;-webkit-box-orient:vertical;overflow:hidden;":""}">${_rf.umf[n.id]?"<b>📊 </b>":""}${_rfText(n.text)}</div>
      ${lang?`<button type="button" class="rf-weiter" onclick="rufeWeiterlesen(${Number(n.id)})" style="min-height:44px;padding:0 4px;border:none;background:transparent;color:var(--blue-text,#1d4ed8);font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer;text-decoration:underline">Weiterlesen</button>`:""}
      ${rufeAnhaengeHtml(n)}
      ${_rf.umf[n.id]?rufeUmfrageHtml(_rf.umf[n.id],arch):""}
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px">
        ${Object.keys(r).map(e=>`<button type="button" class="rf-reakt" onclick="rufeReagieren(${Number(n.id)},'${e}')" aria-pressed="${r[e].ich}" aria-label="${e} ${r[e].n}, ${r[e].ich?"zurücknehmen":"dazu"}" style="min-height:44px;padding:2px 8px;border-radius:999px;border:1.5px solid ${r[e].ich?"#1e3a8a":"var(--rand-bedien)"};background:${r[e].ich?"#dbeafe":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);cursor:pointer">${e} ${r[e].n}</button>`).join("")}
        <span style="flex:1"></span>
        ${_rf.trainer&&!arch&&_rf.gesehen&&_rf.gesehen[n.id]?(()=>{ const x=_rf.gesehen[n.id]; return `<button type="button" class="rf-gesehen" onclick="rufeGesehenOpen(${Number(n.id)})" aria-label="Gesehen von ${x.g} von ${x.e} – Namen zeigen" style="min-height:44px;padding:2px 8px;border:none;border-radius:999px;background:transparent;color:var(--text2);font-family:inherit;font-size:var(--s-klein);cursor:pointer"><span aria-hidden="true">👁</span> ${x.g}/${x.e}</button>`; })():""}
        <span style="font-size:var(--s-klein);color:var(--text2)">${arch?"archiviert · ":""}${n.bearbeitet_am?"bearbeitet · ":""}${_rfZeit(n.created_at)}</span>
        ${arch?"":`<button type="button" class="rf-menue-knopf" onclick="rufeMenue(${Number(n.id)})" aria-label="Aktionen zu diesem Ruf" style="width:44px;height:44px;border:none;border-radius:50%;background:transparent;color:var(--text2);font-size:var(--s-teil);cursor:pointer">⋯</button>`}
      </div>
    </div></div>`;
}
function rufeFixRender(){
  const box=document.getElementById("rufe-fix"); if(!box||!_rf)return;
  const fix=_rf.fix.map(f=>_rf.liste.find(n=>n.id===f.nachricht_id)).filter(n=>n&&!n.archiviert_am);
  box.innerHTML=fix.length?fix.map(n=>`<button type="button" onclick="rufeHinspringen(${Number(n.id)})" style="display:flex;gap:8px;align-items:center;width:100%;text-align:left;min-height:44px;padding:6px 12px;border:none;border-bottom:1px solid var(--surface2);background:#fef3c7;color:#78350f;font-family:inherit;font-size:var(--s-klein);cursor:pointer">📌 <b style="flex:none">${esc(n.autor_name||"")}:</b><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n.text)}</span></button>`).join(""):"";
}
function rufeHinspringen(id){
  const el=document.querySelector(`#rufe-liste .rf-msg[data-id="${Number(id)}"]`);
  if(el){ el.scrollIntoView({block:"center",behavior:"smooth"}); try{el.animate([{opacity:.35},{opacity:1}],{duration:500,iterations:2});}catch(e){} }
}

/* ── Schreiben ────────────────────────────────────────────────────────────────── */
function rufeAntwortRender(){
  const box=document.getElementById("rufe-antwort"); if(!box)return;
  const n=_rf&&_rf.antwort?_rf.liste.find(x=>x.id===_rf.antwort):null;
  box.style.display=n?"flex":"none";
  box.style.cssText+=";align-items:center;gap:8px;margin-bottom:6px;padding:6px 8px;border-left:3px solid #1e3a8a;background:var(--surface2);border-radius:8px";
  if(!n){ box.style.display="none"; box.innerHTML=""; return; }
  box.innerHTML=`<div style="flex:1;min-width:0;font-size:var(--s-klein);color:var(--text2)">Antwort an <b>${esc(n.autor_name||"")}</b>: ${esc(String(n.text).slice(0,80))}</div>
    <button type="button" onclick="rufeAntwortWeg()" aria-label="Antwort verwerfen" style="width:36px;height:36px;border:none;border-radius:50%;background:transparent;color:var(--text2);cursor:pointer">✕</button>`;
}
function rufeAntwortWeg(){ if(_rf){ _rf.antwort=null; rufeAntwortRender(); } }
async function rufeSenden(){
  if(!_rf||!_rf.raum)return;
  const feld=document.getElementById("rufe-text"); const text=(feld?.value||"").trim();
  if(_rf.dateien.length)return rufeSendenMitAnhang(text);
  if(!text)return;
  const knopf=document.getElementById("rufe-senden"); if(knopf)knopf.disabled=true;
  const zeile={raum_id:_rf.raum,text,antwort_auf:_rf.antwort||null,an_alle:_rf.mod&&/(^|\s)@alle\b/i.test(text)};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rufe_nachricht`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(zeile)});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){ const t=await r.text().catch(()=>""); toast(/stumm/.test(t)?"Du bist gerade stummgeschaltet – später geht es wieder":"Ruf nicht gesendet – bitte gleich noch einmal","err"); return; }
  }catch(e){ toast("Kein Netz – Ruf nicht gesendet","err"); return; }
  finally{ if(knopf)knopf.disabled=false; }
  feld.value=""; rufeTextWachsen(feld); _rf.antwort=null; rufeAntwortRender();
  await rufeLaden(true);
}
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
    const r=await _rfRpc("rufe_senden",{p_raum:raum,p_text:text,p_antwort_auf:_rf.antwort||null,p_an_alle:_rf.mod&&/(^|\s)@alle\b/i.test(text),p_anhaenge:hoch});
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
    +`<button type="button" onclick="document.getElementById('rufe-gesehen')?.remove()" style="${_RF_ZEILE};justify-content:center;background:var(--surface2)">Schließen</button>`);
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
  const zeile=(emo,txt,on)=>`<button type="button" style="${_RF_ZEILE}" onclick="${on}"><span aria-hidden="true">${emo}</span>${txt}</button>`;
  _rfBlatt("rufe-menue","Ruf von "+esc(eigen?"dir":n.autor_name||""),
    `<div style="display:flex;gap:6px;justify-content:space-between">${RUFE_EMOJI.map(e=>`<button type="button" class="rf-emo" onclick="rufeReagieren(${id},'${e}')" aria-label="Mit ${e} reagieren" style="flex:1;min-height:48px;border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface2);font-size:var(--s-teil);cursor:pointer">${e}</button>`).join("")}</div>`
    +zeile("↩️","Antworten",`rufeAntworten(${id})`)
    +(_rf.trainer&&!n.archiviert_am?zeile("👁","Wer hat ihn gesehen?",`rufeGesehenOpen(${id})`):"")
    +(darfModerieren?(fixiert?zeile("📌","Nicht mehr fixieren",`rufeFixieren(${id},null,true)`):zeile("📌","Oben fixieren …",`rufeFixMenue(${id})`)):"")
    +(uOffen&&(u.von===_rf.uid||darfModerieren)?zeile("🏁","Abstimmung beenden",`rufeUmfrageBeenden(${Number(u.id)})`):"")
    +(eigen&&!u?zeile("✏️","Bearbeiten",`rufeBearbeitenOpen(${id})`):"")
    +(eigen?zeile("🗄️","Zurückziehen",`rufeArchivieren(${id},true)`):(darfModerieren?zeile("🗄️","Archivieren (nur Trainer sehen ihn noch)",`rufeArchivieren(${id},false)`):""))
    +(_rf.trainer&&(n.rufe_anhang||[]).length?zeile("🗑️","Anhänge endgültig löschen",`rufeAnhaengeLoeschen(${id})`):"")
    +(!eigen&&!privat?zeile("🚩","Melden",`rufeMelden(${id})`):"")
    +(darfModerieren&&!privat&&!eigen&&n.autor_rolle!=="trainer"?zeile("🔇","Stummschalten …",`rufeStummMenue('${esc(n.autor)}','${esc(n.autor_name||"")}')`):"")
    +`<button type="button" onclick="document.getElementById('rufe-menue')?.remove()" style="${_RF_ZEILE};justify-content:center;background:var(--surface2)">Abbrechen</button>`);
}
function rufeAntworten(id){
  document.getElementById("rufe-menue")?.remove();
  if(!_rf)return; _rf.antwort=id; rufeAntwortRender();
  document.getElementById("rufe-text")?.focus();
}
function rufeFixMenue(id){
  const z=(txt,h)=>`<button type="button" style="${_RF_ZEILE}" onclick="rufeFixieren(${id},${h===null?"null":h})">${txt}</button>`;
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
    <button type="button" style="${_RF_ZEILE};justify-content:center;background:#1e3a8a;color:#fff;border:none;font-weight:800" onclick="rufeBearbeiten(${id})">Speichern</button>`);
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
  const z=(txt,h)=>`<button type="button" style="${_RF_ZEILE}" onclick="rufeStumm('${uid}',${h})">${txt}</button>`;
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
    <button type="button" style="${_RF_ZEILE};justify-content:center;background:#1e3a8a;color:#fff;border:none;font-weight:800" onclick="rufeRaumAnlegen()">Raum anlegen</button>`);
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
function rufeUmfrageHtml(u,arch){
  const st=_rf.stand[u.id]||{}; const zu=_rfUmfrageZu(u)||arch;
  const tn=Object.values(st)[0]?Number(Object.values(st)[0].teilnehmer)||0:0;
  const max=Math.max(1,...Object.values(st).map(x=>Number(x.anzahl)||0));
  const art=[u.anonym?"anonym":"namentlich",u.mehrfach?"mehrere Antworten":"eine Antwort"];
  const ende=u.beendet_am?"beendet":u.schluss?(zu?"beendet":"bis "+_rfTag(u.schluss)+" "+_rfZeit(u.schluss)):"";
  return `<div class="rf-umfrage" role="group" aria-label="Abstimmung: ${esc(art.join(", "))}" style="margin-top:6px">
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:4px">${esc(art.join(" · "))}${ende?" · "+esc(ende):""}</div>
    ${u.optionen.map((o,i)=>{ const x=st[i]||{anzahl:0,ich:false,namen:null}; const n=Number(x.anzahl)||0; const pct=Math.round(100*n/max);
      return `<button type="button" class="rf-option" ${zu?"disabled":""} onclick="rufeStimmen(${Number(u.id)},${i})" aria-pressed="${!!x.ich}"
        aria-label="${esc(o)}: ${n} ${n===1?"Stimme":"Stimmen"}${x.ich?", deine Wahl":""}" style="display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin-top:4px;padding:6px 10px;border:1.5px solid ${x.ich?"#1e3a8a":"var(--rand-bedien)"};border-radius:10px;
        background:linear-gradient(90deg,rgba(59,130,246,.28) ${pct}%,var(--surface) ${pct}%);color:var(--text);font-family:inherit;font-size:var(--s-text);text-align:left;cursor:${zu?"default":"pointer"}">
        <span aria-hidden="true" style="flex:none;width:1.2em;font-weight:800">${x.ich?"✓":""}</span><span style="flex:1;min-width:0">${esc(o)}</span><b>${n}</b></button>
        ${!u.anonym&&x.namen&&x.namen.length?`<div class="rf-namen" style="font-size:var(--s-klein);color:var(--text2);margin:2px 0 0 28px">${esc(x.namen.join(", "))}</div>`:""}`; }).join("")}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">${tn===1?"1 hat abgestimmt":tn+" haben abgestimmt"}${zu?"":u.mehrfach?" · antippen wählt an und ab":" · nochmal antippen nimmt die Stimme zurück"}</div>
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
    <button type="button" id="rf-opt-mehr" onclick="rufeUmfrageOption()" style="${_RF_ZEILE};justify-content:center">＋ Antwort</button>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:10px">Wer sieht, wer was gewählt hat?</div>
    <div id="rf-arten" style="display:flex;gap:8px;margin-top:4px">${wahl(true,"Namentlich","rufeUmfrageArt(false)")}${wahl(false,"Anonym","rufeUmfrageArt(true)")}</div>
    <div id="rf-art-hinweis" style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Namentlich: alle sehen, wer was gewählt hat.</div>
    <label style="${_RF_ZEILE}"><input id="rf-mehrfach" type="checkbox" style="width:22px;height:22px"> Mehrere Antworten erlaubt</label>
    <label for="rf-schluss" style="display:block;font-size:var(--s-klein);color:var(--text2);margin-top:10px">Schluss</label>
    <select id="rf-schluss" style="width:100%;min-height:48px;border:1px solid var(--rand-bedien);border-radius:12px;font:inherit;background:var(--surface2);color:var(--text)">
      <option value="">Offen, bis jemand beendet</option><option value="24">In 24 Stunden</option><option value="72">In 3 Tagen</option><option value="168">In 7 Tagen</option></select>
    <button type="button" id="rf-umfrage-los" style="${_RF_ZEILE};justify-content:center;background:#1e3a8a;color:#fff;border:none;font-weight:800" onclick="rufeUmfrageAnlegen()">Abstimmung starten</button>`);
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
      p_mehrfach:!!document.getElementById("rf-mehrfach")?.checked,p_stunden:std?Number(std):null});
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
    +(treffer.length?treffer.map(n=>`<button type="button" onclick="rufeSucheSprung(${Number(n.raum_id)},${Number(n.id)})" style="${_RF_ZEILE};display:block">
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
  (await _rfGet("rpc/rufe_ungelesen")).forEach(x=>{ n+=Number(x.anzahl)||0; if(x.an_alle)alle=true; });
  /* v673: Gibt es Neues, steht auf der Eltern-Startseite ganz oben eine schmale Zeile mit dem
     letzten Ruf – ein Tipp öffnet den Chat. Ohne Neues bleibt der Platz leer. */
  if(hinweis){
    let letzter=null;
    if(n){ const l=await _rfGet("rufe_nachricht?archiviert_am=is.null&select=autor_name,text,autor&order=created_at.desc&limit=5"); letzter=l.find(x=>x.autor!==_rfUid())||null; }
    hinweis.innerHTML=n?`<button type="button" onclick="rufeEinstieg()" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;min-height:48px;margin-bottom:10px;padding:8px 12px;border:1.5px solid ${alle?"#b45309":"#1e3a8a"};border-radius:12px;background:${alle?"#fef3c7":"#eff6ff"};color:#0f172a;font-family:inherit;cursor:pointer">
      <span aria-hidden="true" style="font-size:var(--s-teil)">💬</span>
      <span style="flex:1;min-width:0"><b style="display:block;font-size:var(--s-text)">${n===1?"1 neuer Adler-Ruf":n+" neue Adler-Rufe"}${alle?" · an alle":""}</b>
        ${letzter?`<span style="display:block;font-size:var(--s-klein);color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(letzter.autor_name||"")}: ${esc(letzter.text||"")}</span>`:""}</span>
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
function _rfGlockeZeigen(an){
  const b=document.getElementById("rufe-glocke"); if(!b)return;
  b.textContent=an?"🔔":"🔕"; b.setAttribute("aria-pressed",String(an));
  b.setAttribute("aria-label",an?"Benachrichtigungen zu Adler-Rufen sind an – antippen zum Abschalten":"Benachrichtigungen zu Adler-Rufen sind aus – antippen zum Einschalten");
  const z=document.getElementById("rufe-ruhe"); if(!z)return;
  const tr=!!(_rf&&_rf.trainer);
  z.textContent=rufeRuhezeitText(an,tr);
  /* v705: die eigene Ruhezeit (Einstellungen) statt der Vorgabe */
  if(an&&typeof ruhezeitLaden==="function")ruhezeitLaden(tr?"trainer":"parent").then(r=>{ if(document.getElementById("rufe-ruhe")===z&&_rf&&_rf.glockeAn!==false)z.textContent=rufeRuhezeitText(true,tr,r); }).catch(()=>{});
}
/* v704: Die Ruhezeit steht sichtbar im Chat (PO 01.10.: keine Meldung bekommen – der Ruf kam um 22:56 Uhr).
   v705: Jede und jeder stellt die eigene Ruhezeit bei den Benachrichtigungen in den Einstellungen ein
   (core.js, ruhezeitRender); ohne eigene Wahl Eltern 21:30–7 Uhr, Trainer keine. Hier steht nur, was gilt. */
const RUFE_RUHE="21:30–7 Uhr";
function rufeRuhezeitText(an,trainer,r){
  if(!an)return "🔕 Benachrichtigungen zu Adler-Rufen sind für dich aus – die 🔔 oben schaltet sie wieder ein.";
  if(!r)r=trainer?{von:null,bis:null}:{von:"21:30",bis:"07:00"};
  /* v710: eine Kachel „Einstellungen“ gibt es nur bei Trainern – Eltern finden die Ruhezeit unter
     „Trainerteam kontaktieren“ bei den Benachrichtigungen. */
  const wo=trainer?" Ändern: Orga → Einstellungen → Benachrichtigungen.":" Ändern: „Trainerteam kontaktieren“ → Benachrichtigungen.";
  if(!r.von||!r.bis)return "🔔 Benachrichtigungen kommen rund um die Uhr."+wo;
  const z=typeof ruhezeitText==="function"?ruhezeitText(r):RUFE_RUHE;
  return "🔔 Benachrichtigungen ruhen "+z+" – was bis dahin ungelesen ist, kommt danach gesammelt."+wo;
}
async function rufeGlockeLaden(){
  if(!_rf||!_rf.uid)return;
  const aus=await _rfGet(`rufe_push_aus?user_id=eq.${_rf.uid}&select=user_id`);
  if(_rf){ _rf.glockeAn=!aus.length; _rfGlockeZeigen(_rf.glockeAn); }
}
async function rufeGlockeUmschalten(){
  if(!_rf||!_rf.uid)return;
  const an=_rf.glockeAn!==false;
  try{
    const r=an
      ?await fetch(`${SB_URL}/rest/v1/rufe_push_aus`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal,resolution=ignore-duplicates'}),body:JSON.stringify({user_id:_rf.uid})})
      :await fetch(`${SB_URL}/rest/v1/rufe_push_aus?user_id=eq.${_rf.uid}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=minimal'})});
    if(!r.ok){ toast("Nicht gespeichert","err"); return; }
  }catch(e){ toast("Kein Netz","err"); return; }
  _rf.glockeAn=!an; _rfGlockeZeigen(_rf.glockeAn);
  toast(_rf.glockeAn?"Benachrichtigungen zu Adler-Rufen an":"Keine Benachrichtigungen mehr zu Adler-Rufen – die Zahl am Knopf bleibt");
}
/* v673: Kam man über eine Benachrichtigung (?rufe), öffnet sich der Chat, sobald angemeldet ist –
   im Trainerbereich erst, wenn die PIN-Sperre offen ist. Höchstens zwei Minuten lang. */
function _rfAbsicht(){
  let n=0;
  const t=setInterval(()=>{
    let offen=null; try{offen=sessionStorage.getItem("adler_rufe_intent");}catch(e){}
    if(!offen||++n>60){ clearInterval(t); return; }
    const gate=document.getElementById("pin-gate");
    const gesperrt=gate&&!gate.classList.contains("hidden")&&getComputedStyle(gate).display!=="none";
    if(gesperrt||typeof sbToken!=="function"||!sbToken())return;
    try{sessionStorage.removeItem("adler_rufe_intent");}catch(e){}
    clearInterval(t);
    rufeOpen(/^\d+$/.test(offen)?Number(offen):undefined);   // v674: ?rufe=<Raum> aus der Benachrichtigung
  },2000);
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
      <button type="button" class="rf-chip-weg" onclick="rufeAnhangWeg(${i})" aria-label="Anhang ${esc(d.name)} entfernen" style="flex:none;width:44px;height:44px;border:none;border-radius:50%;background:transparent;color:var(--text2);font-size:var(--s-karte);cursor:pointer">✕</button></div>`).join("");
}
async function _rfAufraeumen(liste){
  for(const a of liste||[]){ try{ await fetch(`${SB_URL}/storage/v1/object/rufe-anhang/${a.pfad}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken(),'apikey':SB_KEY}}); }catch(e){} }
}
/* Nachrichten mit eingebetteten Anhängen in EINER Abfrage. Kennt die Datenbank rufe_anhang noch nicht
   (Migration v736 nicht eingespielt), lädt die App wie bisher ohne – die Rufe bleiben sichtbar. */
let _rfOhneAnhang=false;
async function _rfNachrichtenHolen(raum){
  const basis="id,autor,autor_name,autor_zusatz,autor_rolle,text,antwort_auf,an_alle,bearbeitet_am,archiviert_am,created_at";
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
    :`<button type="button" class="rf-datei" onclick="rufeAnhangOeffnen(${Number(n.id)},${Number(a.id)})" aria-label="${a.mime==="application/pdf"?"PDF öffnen":"Herunterladen"}: ${esc(a.name)}" style="display:flex;align-items:center;gap:8px;min-height:44px;width:100%;padding:6px 10px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface2);color:var(--text);font-family:inherit;text-align:left;cursor:pointer">
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
  const t=m.querySelector(".rf-text"); if(t){ ["display","-webkit-line-clamp","line-clamp","-webkit-box-orient","overflow"].forEach(p=>t.style.removeProperty(p)); }
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
  const knopf="min-width:48px;min-height:48px;border:none;border-radius:12px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer";
  m.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="flex:1;min-width:0;color:#fff;font-size:var(--s-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name)}</span>
      <button type="button" id="rufe-gross-zoom" aria-pressed="false" style="${knopf};padding:0 12px">🔍 Zoom</button>
      <button type="button" onclick="document.getElementById('rufe-gross')?.remove()" aria-label="Schließen" style="${knopf}">✕</button></div>
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
