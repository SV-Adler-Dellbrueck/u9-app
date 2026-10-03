/* ═══════════════════════════════════
   EVENT-GALERIE (Welle 2, FEAT W) – FOTOS-ONLY (bewusste Kostenentscheidung).
   Teamweite Sicht ueber die security-definer-RPC termin_gallery (Minimaldaten).
   Fotos: privater Bucket 'termin_media' (5 MB, nur Bilder, Limit serverseitig).
   Trainer moderiert (Loeschrecht via authRole). Anzeige per Auth-Download + Blob.
═══════════════════════════════════ */
// F2: Fotofreigabe-Übersicht fürs Team – zeigt VOR dem Posten, wer für welche Stufe freigegeben
// ist. Quelle: foto_consent (3 Stufen: intern/video/public_ok). Stufe „intern“ spiegelt auf
// kader.foto_stadionheft_ok (Fallback). Nur sinnvoll im Trainer-Kontext (KADER geladen).
let FOTO_CONSENT=null;
async function fotoConsentLoad(force){
  if(FOTO_CONSENT&&!force)return FOTO_CONSENT;
  const map={};
  try{const r=await fetch(`${SB_URL}/rest/v1/foto_consent?select=spieler_id,intern,video,public_ok,updated_at,updated_by`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(x=>map[x.spieler_id]=x);}catch(e){}
  FOTO_CONSENT=map; return map;
}
function fotoConsentFor(k){
  // KADER-Einträge tragen die Spieler-ID je nach Kontext als id ODER _id (Boot-Mapper)
  const r=(FOTO_CONSENT&&(FOTO_CONSENT[k.id!=null?k.id:k._id]))||{};
  return {intern:(r.intern!=null?r.intern:!!k.foto_stadionheft_ok), video:!!r.video, public_ok:!!r.public_ok, updated_at:r.updated_at, updated_by:r.updated_by};
}
function fotoConsentBannerHtml(){
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  if(!kids.length)return "";
  const c=kids.map(fotoConsentFor);
  const nIn=c.filter(x=>x.intern).length, nVid=c.filter(x=>x.video).length, nPub=c.filter(x=>x.public_ok).length;
  const noPub=kids.filter((k,i)=>!c[i].public_ok).map(k=>esc(k.name)).join(", ");
  const chip=(emo,lbl,n)=>`<span style="display:inline-block;background:#fff;border:1px solid #cbd5e1;border-radius:999px;padding:2px 8px;font-size:var(--s-klein);font-weight:700;color:#334155;margin:2px 4px 2px 0">${emo} ${lbl}: ${n}/${kids.length}</span>`;
  return `<div style="padding:10px;border-radius:10px;margin-bottom:12px;background:#f8fafc;border:1px solid #cbd5e1">
    <div style="font-size:var(--s-klein);font-weight:800;color:#334155;margin-bottom:4px">📸 Foto-/Video-Freigaben</div>
    <div>${chip("🖼️","intern",nIn)}${chip("🎥","Video",nVid)}${chip("🌍","öffentlich",nPub)}</div>
    ${noPub?`<div style="font-size:var(--s-klein);color:#9a3412;margin-top:4px">🌍 <b>Nicht öffentlich</b> zeigen: ${noPub}</div>`:'<div style="font-size:var(--s-klein);color:#15803d;margin-top:4px">Alle Kinder öffentlich freigegeben. 👍</div>'}
    <button onclick="fotoAmpelOpen()" style="margin-top:8px;width:100%;min-height:40px;padding:8px;border:1.5px solid #7c3aed;border-radius:8px;background:#faf5ff;color:#6d28d9;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">🚦 Ampel je Kind &amp; Einwilligungstext</button>
  </div>`;
}
/* Trainer-Ampel: Kind × 3 Stufen (read-only – Eltern setzen die Freigaben selbst) + editierbarer
   Einwilligungstext, den die Eltern beim Zustimmen sehen. */
async function fotoAmpelOpen(){
  await fotoConsentLoad(true);
  let txt="";
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?select=foto_consent_text&limit=1`,{headers:sbAuthHeaders()});if(r.ok)txt=((await r.json())[0]||{}).foto_consent_text||"";}catch(e){}
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const cell=v=>`<span style="font-size:var(--s-karte)">${v?"✅":"⛔"}</span>`;
  document.getElementById("fa-modal")?.remove();
  const modal=document.createElement("div"); modal.id="fa-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10060;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:520px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    ${mdlHead("fa-modal","🚦","Foto-/Video-Ampel","Eltern setzen die Freigaben selbst · vor dem Posten prüfen","#0d9488")}
    <div style="display:grid;grid-template-columns:1fr 40px 40px 40px;gap:2px;font-size:var(--s-klein);font-weight:700;color:var(--text2);padding:0 4px 4px"><div>Kind</div><div style="text-align:center" title="app-intern">🖼️</div><div style="text-align:center" title="Trainingsvideo">🎥</div><div style="text-align:center" title="öffentlich">🌍</div></div>
    ${kids.map(k=>{const x=fotoConsentFor(k);return `<div style="display:grid;grid-template-columns:1fr 40px 40px 40px;gap:2px;align-items:center;padding:5px 4px;border-top:var(--border);font-size:var(--s-text)"><div>${esc(k.name)}</div><div style="text-align:center">${cell(x.intern)}</div><div style="text-align:center">${cell(x.video)}</div><div style="text-align:center">${cell(x.public_ok)}</div></div>`;}).join("")}
    <div style="font-weight:700;font-size:var(--s-text);margin:16px 0 4px">✏️ Einwilligungstext (sehen die Eltern)</div>
    <textarea id="fa-text" rows="5" placeholder="Leer = Standardtext der App. Hier eure DFB-/LSB-Formulierung einsetzen." style="width:100%;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);box-sizing:border-box;resize:vertical;background:var(--surface);color:var(--text)">${esc(txt)}</textarea>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="fotoConsentTextSave()" style="flex:1;min-height:44px">Text speichern</button>
      <button class="btn btn-sm" onclick="document.getElementById('fa-modal').remove()" style="min-height:44px">Schließen</button>
    </div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
async function fotoConsentTextSave(){
  const txt=(document.getElementById("fa-text")?.value||"").trim();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({foto_consent_text:txt||null})});
    if(!r.ok){toast((typeof sbDeniedMsg==="function")?sbDeniedMsg(r):"Konnte nicht speichern","err");return;}
    toast("Einwilligungstext gespeichert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function galerieOpen(terminId,titel){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  await fotoConsentLoad();
  // Die Freigabe-Übersicht (Zähler + Ampel) ist ein TRAINER-Werkzeug vor dem Posten.
  // Eltern bekommen stattdessen einen kurzen Hinweis in ihrer Sprache (PO-Feedback).
  const istTrainerKtx=(typeof authRole==="function")?((await authRole())==="trainer"):false;
  const consentBlock=istTrainerKtx?fotoConsentBannerHtml()
    :`<div style="padding:10px;border-radius:10px;margin-bottom:12px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:var(--s-klein);color:#166534;line-height:1.5">🔒 <b>Sicherer als die WhatsApp-Gruppe:</b> Diese Fotos sehen nur eingeloggte Team-Eltern, die Freigaben der Familien werden respektiert, das Trainerteam kann moderieren – und Löschen ist hier wirklich Löschen (bei WhatsApp bleibt jedes Bild als Kopie auf allen Handys). Deine eigene Freigabe stellst du unter <b>Datenschutz &amp; Freigaben</b> ein – sie gilt für die ganze App.</div>`;
  document.getElementById("gal-modal")?.remove();
  const m=document.createElement("div");m.id="gal-modal";m.dataset.termin=terminId;
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.style.zIndex=zOben(9999);  // ueber einen evtl. schon offenen Dialog legen
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:520px;width:100%;margin:auto">
    ${mdlHead("gal-modal","📸",`Fotos${titel?" · "+esc(titel):""}`,"Team-Galerie zum Termin – für alle Team-Eltern","#7c3aed")}
    ${consentBlock}
    <div style="padding:10px;border:1.5px dashed var(--text3);border-radius:10px;margin-bottom:12px">
      <div style="font-size:var(--s-text);font-weight:800;color:var(--text);margin-bottom:8px">Foto hinzufügen</div>
      <!-- v721 (PO 02.10.): „direkt Fotos aufnehmen klicken … und es landet direkt in der App“.
           Kachel: „Zwei Knöpfe“. capture öffnet die Kamera des Handys, das Foto geht sofort in den
           Upload – auf dem iPhone landet es nicht in der Fotomediathek, auf Android meist auch
           nicht (das entscheidet die Kamera-App des Herstellers). Die Galerie bleibt für mehrere. -->
      <div class="gal-knoepfe" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label class="gal-knopf" id="gal-kamera-knopf" style="position:relative;display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 10px;border-radius:12px;background:#7c3aed;color:#fff;font-weight:800;font-size:var(--s-text);cursor:pointer;text-align:center">📷 Foto aufnehmen
          <input id="gal-kamera" type="file" accept="image/jpeg, image/png, image/webp" capture="environment" onchange="galerieUpload(this.closest('label'),${terminId},'gal-kamera')" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"></label>
        <label class="gal-knopf" id="gal-foto-knopf" style="position:relative;display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 10px;border-radius:12px;border:1.5px solid #7c3aed;background:var(--surface);color:var(--text);font-weight:800;font-size:var(--s-text);cursor:pointer;text-align:center">🖼️ Aus Galerie
          <input id="gal-foto" type="file" accept="image/jpeg, image/png, image/webp" multiple onchange="galerieUpload(this.closest('label'),${terminId},'gal-foto')" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"></label>
      </div>
      <div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">Nach dem Foto wird es sofort hochgeladen und verkleinert. Aus der Galerie gehen bis zu 20 auf einmal. Für alle Team-Eltern sichtbar.</div>
    </div>
    <div id="gal-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  galerieRender(terminId);
}
async function galerieRender(terminId){
  const body=document.getElementById("gal-body"); if(!body)return;
  let items=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/termin_gallery`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_termin:terminId})});if(r.ok)items=(await r.json())||[];}catch(e){}
  const istTrainer=(await authRole())==="trainer";
  if(!items.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:var(--s-text)">Noch keine Fotos – mach das erste! 📷</div>';return;}
  _galListe[terminId]=items;   // v730: für die Großansicht
  body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
    ${items.map((f,i)=>`<div style="position:relative">
      <img id="gal-img-${f.id}" alt="Foto ${i+1} von ${items.length} – groß ansehen" role="button" tabindex="0" draggable="false" oncontextmenu="return false" onclick="galerieGross(${terminId},${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();galerieGross(${terminId},${i})}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:#f1f5f9;cursor:zoom-in;-webkit-touch-callout:none;user-select:none">
      ${istTrainer?`<button onclick="galerieDelete(${f.id},'${esc(f.foto_path)}',${terminId})" title="Löschen" style="position:absolute;top:4px;right:4px;width:40px;height:40px;border:none;border-radius:8px;background:rgba(0,0,0,.55);color:#fff;cursor:pointer">🗑</button>`:""}
    </div>`).join("")}
  </div>`;
  items.forEach(f=>galerieFoto(f.id,f.foto_path));
}
async function galerieFoto(id,path){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return;
    const img=document.getElementById("gal-img-"+id);
    if(img)img.src=URL.createObjectURL(await r.blob());
  }catch(e){}
}
/* K8: Mehrere Fotos auf einmal – jedes wird clientseitig komprimiert (fotoCompress) und
   nacheinander hochgeladen; der Button zeigt den Fortschritt. So ist der Weg „nach dem
   Spiel alles in die App statt in die WhatsApp-Gruppe" wirklich bequem. */
async function galerieUpload(btn,terminId,inputId){
  const input=document.getElementById(inputId||"gal-foto");   // v721: Kamera oder Galerie
  const files=input&&input.files?[...input.files]:[];
  if(!files.length){toast("Bitte Fotos wählen","err");return;}
  if(files.length>20){toast("Bitte max. 20 Fotos auf einmal","err");return;}
  if(btn)btn.disabled=true;
  /* v721: Der Knopf ist ein <label> mit dem Datei-Feld darin – beim Fortschritt wird nur der
     sichtbare Text getauscht, das Feld bleibt erhalten. */
  const textKnoten=btn?[...btn.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()):null;
  const btnText=textKnoten?textKnoten.textContent:(btn?btn.innerHTML:"");
  const zeige=t=>{ if(!btn)return; if(textKnoten)textKnoten.textContent=t; else btn.innerHTML=t; };
  if(btn&&btn.tagName==="LABEL"){ btn.style.opacity=".6"; btn.style.pointerEvents="none"; }
  let hoch=0, fehler=0;
  for(let i=0;i<files.length;i++){
    const file=files[i];
    zeige(`⬆️ ${i+1}/${files.length} … `);
    if(file.size>15*1024*1024){fehler++;continue;} // absurde Größen überspringen (Kompression schafft den Rest)
    try{
      const blob=await fotoCompress(file,1000); // 1000px: gute Event-Qualität, schont Storage
      const path=terminId+"/"+((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+"-"+i)+".jpg";
      const up=await fetch(`${SB_URL}/storage/v1/object/termin_media/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
      if(!up.ok){fehler++;continue;}
      const r=await fetch(`${SB_URL}/rest/v1/termin_media`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({termin_id:terminId,foto_path:path})});
      if(sbCheck401(r)){if(btn){btn.disabled=false;zeige(btnText);btn.style.opacity="";btn.style.pointerEvents="";}return;}
      if(!r.ok){fehler++;continue;}
      hoch++;
    }catch(e){fehler++;}
  }
  if(btn){btn.disabled=false;zeige(btnText);btn.style.opacity="";btn.style.pointerEvents="";}
  if(input)input.value="";
  if(hoch)toast(`📸 ${hoch} Foto${hoch===1?"":"s"} hochgeladen ✓${fehler?` · ${fehler} fehlgeschlagen`:""}`);
  else toast("Upload fehlgeschlagen","err");
  galerieRender(terminId);
}
/* ═══ v730: Spieltagsgalerie und Großansicht ═══
   PO 03.10.: „Dann brauchen wir eine Spieltagsgalerie. Wenn Eltern Bilder in der App hochladen. Darauf
   sollen die Eltern dann auch Zugriff haben.“ (Das Adler Nest entsteht separat.) Die Fotos liegen schon
   seit v721 je Termin (termin_media); neu ist der Überblick über alle Spieltage der Saison und eine
   Großansicht mit Wischen. Sichtbar nur für eingeloggte Team-Eltern und das Trainerteam –
   dieselbe Abfrage termin_gallery wie am Termin, keine neue Freigabe. */
const _galListe={};
/* v731 (PO 03.10.): „Und die alten Termine raus. Wir starten mit dem Festival heute.“ Die Galerie zeigt
   Spieltage ab diesem Tag; die Fotos älterer Termine bleiben am jeweiligen Termin. */
const GALERIE_AB="2026-10-03";
async function _galBlob(path){
  try{const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});return r.ok?await r.blob():null;}catch(e){return null;}
}
async function spieltagGalerieOpen(){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  document.getElementById("stg-modal")?.remove();
  const m=document.createElement("div");m.id="stg-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Spieltagsgalerie");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.style.zIndex=zOben(9998);
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:560px;width:100%;margin:auto">
    ${mdlHead("stg-modal","📸","Spieltagsgalerie","Fotos von unseren Spieltagen – ab dem Kinderfestival am 03.10.","#7c3aed")}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:12px;line-height:1.5">🔒 Nur für eingeloggte Team-Eltern und das Trainerteam. Fotos hinzufügen: Spieltag antippen, dann „Foto aufnehmen“ oder „Aus Galerie“.</div>
    <div id="stg-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  spieltagGalerieRender();
}
async function spieltagGalerieRender(){
  const body=document.getElementById("stg-body"); if(!body)return;
  const heute=isoLokal(), d0=new Date(), saisonStart=`${d0.getMonth()>=6?d0.getFullYear():d0.getFullYear()-1}-07-01`, saisonAb=saisonStart>GALERIE_AB?saisonStart:GALERIE_AB;
  let termine=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,typ,titel,gegner,datum,heim&typ=in.(spiel,turnier)&datum=gte.${saisonAb}&datum=lte.${heute}&order=datum.desc`,{headers:sbAuthHeaders()});if(r.ok)termine=(await r.json())||[];}catch(e){}
  if(!termine.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:var(--s-text)">Noch kein Spieltag mit Galerie – los geht es mit dem nächsten.</div>';return;}
  const fotos=await Promise.all(termine.map(async t=>{
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/termin_gallery`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_termin:t.id})});return r.ok?((await r.json())||[]):[];}catch(e){return [];}
  }));
  const wt=["So","Mo","Di","Mi","Do","Fr","Sa"];
  body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${termine.map((t,i)=>{
    const n=fotos[i].length, d=new Date(t.datum+"T00:00:00"), titel=t.titel||t.gegner||(t.typ==="turnier"?"Festival":"Spiel");
    const tArg=String(titel).replace(/'/g,"").replace(/"/g,"");
    return `<button type="button" class="stg-album" data-termin="${t.id}" onclick="galerieOpen(${Number(t.id)},'${esc(tArg)}')" style="display:flex;flex-direction:column;text-align:left;padding:0;border:1px solid var(--border,#cbd5e1);border-radius:12px;background:var(--surface);color:var(--text);overflow:hidden;cursor:pointer;font-family:inherit">
      <span style="display:block;width:100%;aspect-ratio:4/3;background:#ede9fe;position:relative">${n?`<img id="stg-cover-${t.id}" alt="" draggable="false" oncontextmenu="return false" style="-webkit-touch-callout:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block">`:`<span aria-hidden="true" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:var(--s-seite)">📷</span>`}</span>
      <span style="display:block;padding:8px 10px">
        <span style="display:block;font-weight:800;font-size:var(--s-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(titel)}</span>
        <span style="display:block;font-size:var(--s-klein);color:var(--text2)">${wt[d.getDay()]} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})} · ${n?(n===1?"1 Foto":n+" Fotos"):"Noch keine Fotos"}</span>
      </span></button>`;}).join("")}</div>`;
  termine.forEach(async (t,i)=>{
    if(!fotos[i].length)return;
    const b=await _galBlob(fotos[i][0].foto_path), img=document.getElementById("stg-cover-"+t.id);
    if(b&&img)img.src=URL.createObjectURL(b);
  });
}
/* Großansicht: wischen oder ‹ ›, Pfeiltasten, Escape.
   v731 (PO 03.10.): „Der Download sollte erstmal nicht möglich sein. Wir wollen nicht, dass Bilder aus der
   App rausgehen.“ Kein Speichern-Knopf; langes Drücken, Rechtsklick und Ziehen sind abgefangen. Ein
   Bildschirmfoto kann eine Web-App nicht verhindern. */
async function galerieGross(terminId,idx){
  const liste=_galListe[terminId]||[]; if(!liste.length)return;
  idx=(idx+liste.length)%liste.length;
  let lb=document.getElementById("gal-gross");
  if(!lb){
    lb=document.createElement("div");lb.id="gal-gross";
    lb.setAttribute("role","dialog");lb.setAttribute("aria-modal","true");lb.setAttribute("aria-label","Foto groß");
    lb.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px";
    lb.style.zIndex=zOben(10050);
    const knopf="min-width:48px;min-height:48px;border:none;border-radius:12px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer";
    lb.innerHTML=`<div style="display:flex;align-items:center;gap:8px;width:100%;max-width:900px;margin-bottom:8px">
        <span id="gal-gross-zahl" style="flex:1;color:#fff;font-size:var(--s-text);font-weight:700"></span>
        <button type="button" onclick="document.getElementById('gal-gross')?.remove()" aria-label="Schließen" style="${knopf}">✕</button></div>
      <div style="position:relative;flex:1;width:100%;max-width:900px;display:flex;align-items:center;justify-content:center;min-height:0">
        <button type="button" id="gal-gross-zurueck" aria-label="Vorheriges Foto" style="${knopf};position:absolute;left:0;z-index:1">‹</button>
        <img id="gal-gross-img" alt="" draggable="false" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none">
        <button type="button" id="gal-gross-weiter" aria-label="Nächstes Foto" style="${knopf};position:absolute;right:0;z-index:1">›</button></div>`;
    document.body.appendChild(lb);
    lb.addEventListener("contextmenu",e=>e.preventDefault());   // v731: kein „Bild speichern“ per Rechtsklick/langem Druck
    lb.addEventListener("dragstart",e=>e.preventDefault());
    let x0=null;
    lb.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;},{passive:true});
    lb.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)galerieGross(Number(lb.dataset.termin),Number(lb.dataset.idx)+(dx<0?1:-1));});
    lb.addEventListener("keydown",e=>{if(e.key==="ArrowRight")galerieGross(Number(lb.dataset.termin),Number(lb.dataset.idx)+1);else if(e.key==="ArrowLeft")galerieGross(Number(lb.dataset.termin),Number(lb.dataset.idx)-1);else if(e.key==="Escape")lb.remove();});
  }
  lb.dataset.termin=terminId; lb.dataset.idx=idx;
  const f=liste[idx];
  document.getElementById("gal-gross-zahl").textContent=`Foto ${idx+1} von ${liste.length}`;
  ["gal-gross-zurueck","gal-gross-weiter"].forEach(id=>{const b=document.getElementById(id);if(b)b.style.display=liste.length>1?"":"none";});
  document.getElementById("gal-gross-zurueck").onclick=()=>galerieGross(terminId,idx-1);
  document.getElementById("gal-gross-weiter").onclick=()=>galerieGross(terminId,idx+1);
  const img=document.getElementById("gal-gross-img"); img.alt=`Foto ${idx+1} von ${liste.length}`; img.removeAttribute("src");
  const blob=await _galBlob(f.foto_path);
  if(String(lb.dataset.idx)!==String(idx)||String(lb.dataset.termin)!==String(terminId))return;   // inzwischen weitergewischt
  if(!blob){toast("Foto konnte nicht geladen werden","err");return;}
  img.src=URL.createObjectURL(blob);
}
async function galerieDelete(id,path,terminId){
  if(!await frageJaNein({emoji:"🖼️",titel:"Foto löschen?",
    text:"Das Foto verschwindet für alle aus der Galerie.",
    ja:"Löschen",ton:"rot"}))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termin_media?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Löschen fehlgeschlagen","err");return;}
    try{await fetch(`${SB_URL}/storage/v1/object/termin_media/${path}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}});}catch(e){}
    galerieRender(terminId);
  }catch(e){}
}

