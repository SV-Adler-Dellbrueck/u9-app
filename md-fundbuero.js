/* ═══════════════════════════════════
   FUNDBÜRO (Welle 1, FEAT Y) – verlorene Trinkflaschen, Jacken & Co.
   Teamweite Sicht NUR über die security-definer-RPC fundbuero_board
   (Minimaldaten, keine Uploader-Identität). "Gehört uns!" läuft über
   fundbuero_claim. Fotos: privater Bucket 'fundbuero' (5 MB, nur Bilder,
   Limit serverseitig erzwungen), Anzeige per Auth-Download + Blob-URL.
═══════════════════════════════════ */
async function fundbueroOpen(){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  document.getElementById("fb-modal")?.remove();
  const m=document.createElement("div");m.id="fb-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("fb-modal","🧦","Fundbüro","Verlorenes & Gefundenes – hier sammelt das Team","#3b82f6")}
    <div style="padding:10px;border:1.5px dashed var(--text3);border-radius:10px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">Etwas gefunden?</div>
      <input id="fb-titel" placeholder="Was? (z. B. blaue Trinkflasche)" maxlength="80" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px;margin-bottom:6px">
      <input id="fb-foto" type="file" accept="image/jpeg, image/png, image/webp" capture="environment" style="width:100%;font-size:12px;margin-bottom:8px">
      <button class="btn btn-p btn-sm" onclick="fundbueroUpload(this)">📸 Einstellen</button>
    </div>
    <div id="fb-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  fundbueroRender();
}
async function fundbueroRender(){
  const body=document.getElementById("fb-body"); if(!body)return;
  let items=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/fundbuero_board`,{method:"POST",headers:sbAuthHeaders(),body:"{}"});if(r.ok)items=(await r.json())||[];}catch(e){}
  const istTrainer=(await authRole())==="trainer";
  if(!items.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Aktuell keine Fundstücke – super! 🎉</div>';return;}
  body.innerHTML=items.map(f=>`
    <div style="padding:12px;border:var(--border-s);border-radius:12px;margin-bottom:10px${f.status==="geklaert"?";opacity:.55":""}">
      ${f.foto_path?`<img id="fb-img-${f.id}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;background:#f1f5f9;margin-bottom:8px">`:""}
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
        <div style="font-weight:700;font-size:14px">${esc(f.titel)}</div>
        <div style="font-size:10.5px;color:var(--text3);white-space:nowrap">${f.gefunden_am?new Date(f.gefunden_am+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}):""}</div>
      </div>
      ${f.beschreibung?`<div style="font-size:12px;color:var(--text2);margin-top:2px">${esc(f.beschreibung)}</div>`:""}
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
        ${f.status==="offen"
          ?`<button onclick="fundbueroClaim(${f.id})" style="flex:1;min-height:44px;border:none;border-radius:10px;background:#059669;color:#fff;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer">🙋 Gehört uns!</button>`
          :`<div style="flex:1;font-size:12.5px;font-weight:700;color:#059669">✅ Geklärt${f.claimed_label?` – ${esc(f.claimed_label)}`:""}</div>`}
        ${istTrainer?`<button onclick="fundbueroDelete(${f.id})" title="Löschen" style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);cursor:pointer">🗑</button>`:""}
      </div>
    </div>`).join("");
  items.forEach(f=>{if(f.foto_path)fundbueroFoto(f.id,f.foto_path);});
}
async function fundbueroFoto(id,path){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/fundbuero/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return;
    const img=document.getElementById("fb-img-"+id);
    if(img)img.src=URL.createObjectURL(await r.blob());
  }catch(e){}
}
async function fundbueroUpload(btn){
  const titel=(document.getElementById("fb-titel")?.value||"").trim();
  const input=document.getElementById("fb-foto");
  const file=input&&input.files&&input.files[0];
  if(!titel){toast("Bitte kurz beschreiben, was gefunden wurde","err");return;}
  if(btn)btn.disabled=true;
  try{
    let path=null;
    if(file){
      const blob=await fotoCompress(file,700); // 700px reicht fürs Wiedererkennen, schont Storage
      path=((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()))+".jpg";
      const up=await fetch(`${SB_URL}/storage/v1/object/fundbuero/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
      if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    }
    const r=await fetch(`${SB_URL}/rest/v1/fundbuero`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({titel,foto_path:path})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    toast("Fundstück eingestellt ✓");
    const t=document.getElementById("fb-titel"); if(t)t.value="";
    if(input)input.value="";
    fundbueroRender();
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{if(btn)btn.disabled=false;}
}
async function fundbueroClaim(id){
  /* v609: eigenes Fenster statt prompt() – im Eltern-Bereich sind Systemdialoge tabu (CLAUDE.md). */
  const antwort=(typeof frageText==="function")?await frageText({emoji:"🙋",titel:"Wem gehört es?",sub:"Kurz den Familiennamen eintragen, dann weiß das Trainerteam Bescheid.",platzhalter:"z. B. Familie Müller",ja:"Als unseres markieren"}):null;
  const label=String(antwort||"").trim();
  if(!label)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/fundbuero_claim`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_id:id,p_label:label})});
    if(!r.ok){toast("Konnte nicht markieren","err");return;}
    toast("Als geklärt markiert ✓");
    fundbueroRender();
  }catch(e){toast("Netzwerkfehler","err");}
}
async function fundbueroDelete(id){
  if(!confirm("Fundstück wirklich löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fundbuero?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Löschen fehlgeschlagen","err");return;}
    fundbueroRender();
  }catch(e){}
}

