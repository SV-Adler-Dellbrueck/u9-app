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
      <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">Foto hinzufügen</div>
      <input id="gal-foto" type="file" accept="image/jpeg, image/png, image/webp" multiple style="width:100%;font-size:var(--s-text);margin-bottom:8px">
      <button class="btn btn-p btn-sm" onclick="galerieUpload(this,${terminId})">📸 Hochladen</button>
      <div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">Mehrere Fotos auf einmal möglich – sie werden automatisch verkleinert. Für alle Team-Eltern sichtbar.</div>
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
  body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
    ${items.map(f=>`<div style="position:relative">
      <img id="gal-img-${f.id}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:#f1f5f9">
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
async function galerieUpload(btn,terminId){
  const input=document.getElementById("gal-foto");
  const files=input&&input.files?[...input.files]:[];
  if(!files.length){toast("Bitte Fotos wählen","err");return;}
  if(files.length>20){toast("Bitte max. 20 Fotos auf einmal","err");return;}
  if(btn)btn.disabled=true;
  const btnText=btn?btn.innerHTML:"";
  let hoch=0, fehler=0;
  for(let i=0;i<files.length;i++){
    const file=files[i];
    if(btn)btn.innerHTML=`⬆️ ${i+1}/${files.length} …`;
    if(file.size>15*1024*1024){fehler++;continue;} // absurde Größen überspringen (Kompression schafft den Rest)
    try{
      const blob=await fotoCompress(file,1000); // 1000px: gute Event-Qualität, schont Storage
      const path=terminId+"/"+((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+"-"+i)+".jpg";
      const up=await fetch(`${SB_URL}/storage/v1/object/termin_media/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
      if(!up.ok){fehler++;continue;}
      const r=await fetch(`${SB_URL}/rest/v1/termin_media`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({termin_id:terminId,foto_path:path})});
      if(sbCheck401(r)){if(btn){btn.disabled=false;btn.innerHTML=btnText;}return;}
      if(!r.ok){fehler++;continue;}
      hoch++;
    }catch(e){fehler++;}
  }
  if(btn){btn.disabled=false;btn.innerHTML=btnText;}
  if(input)input.value="";
  if(hoch)toast(`📸 ${hoch} Foto${hoch===1?"":"s"} hochgeladen ✓${fehler?` · ${fehler} fehlgeschlagen`:""}`);
  else toast("Upload fehlgeschlagen","err");
  galerieRender(terminId);
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

