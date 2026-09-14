/* ═══════════════════════════════════
   FAN-FAKTEN (Phase 11-Q) – Eltern pflegen Spitzname/Verein/Spieler + Profilbild
   für ihr eigenes Kind (kind_fanfacts, RLS is_parent_of). kader bleibt trainer-only.
   Foto-Upload pfad-basiert: "<spieler_id>/<uuid>.jpg".
═══════════════════════════════════ */
async function elternFanfactsOpen(spielerId,kindName){
  document.getElementById("fanfacts-modal")?.remove();
  let f={};
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)f=(await r.json())[0]||{};}catch(e){}
  const ausgabe=await elternAusstattungLesen(spielerId);
  const half="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px";
  const inp="width:100%;padding:9px;margin:4px 0 10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px";
  const m=document.createElement("div");m.id="fanfacts-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;max-width:400px;width:100%;margin:auto">
    ${mdlHead("fanfacts-modal","✏️",`${esc(kindName||"Kind")} – Fan-Fakten`,"","#475569")}
    <div style="font-size:11px;color:#64748b;margin-bottom:12px">Diese Fan-Fakten pflegst du selbst – die sportliche Bewertung bleibt beim Trainer.</div>
    ${ausgabe}
    <label style="font-size:12px;color:#475569">Profilbild</label>
    <div style="display:flex;align-items:center;gap:8px;margin:4px 0 12px">
      <input type="file" accept="image/jpeg,image/png,image/webp" onchange="elternFotoUpload(${spielerId},this)" style="font-size:11px;flex:1">
      ${f.foto_path?'<span style="font-size:10px;color:#059669">✓ vorhanden</span>':''}
    </div>
    <label for="ff-spitz" style="font-size:12px;color:#475569">Spitzname</label>
    <input id="ff-spitz" value="${esc(f.spitzname||'')}" placeholder="z. B. Mimi" style="${inp}">
    <label for="ff-verein" style="font-size:12px;color:#475569">Lieblingsverein</label>
    <input id="ff-verein" value="${esc(f.lieblingsverein||'')}" placeholder="z. B. 1. FC Köln" style="${inp}">
    <label for="ff-spieler" style="font-size:12px;color:#475569">Lieblingsspieler</label>
    <input id="ff-spieler" value="${esc(f.lieblingsspieler||'')}" placeholder="z. B. Musiala" style="${inp}">
    <!-- v544: Die Trikot-Größe ist hier verschwunden. Sie stand zugleich im Kader und
         in den Fan-Fakten, also zweimal – und was ausgegeben wurde, weiß der Verein,
         nicht die Familie. Sie wird jetzt beim Anprobieren erfasst („Ausstattung" beim
         Trainer). Die Schuh-Größe bleibt: die steht nirgends sonst. -->
    <div style="font-size:11px;font-weight:700;color:#475569;margin:6px 0 4px">👟 Schuh-Größe <span style="font-weight:400;color:#94a3b8">(hilft dem Trainer bei Sammelbestellungen)</span></div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1"><input id="ff-schuh" value="${esc(f.schuh_groesse||'')}" placeholder="z. B. 31" aria-label="Schuh-Größe" style="${half}"></div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:#475569;margin:6px 0 14px">
      <input id="ff-gallery" type="checkbox" ${f.gallery_optin?"checked":""}> Foto in der Team-Galerie zeigen (Opt-in)
    </label>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="document.getElementById('fanfacts-modal').remove()" style="border:none;background:none;color:#64748b;font-size:13px;cursor:pointer">Schließen</button>
      <button onclick="elternFanfactsSave(${spielerId})" style="border:none;border-radius:8px;background:#1e3a8a;color:#fff;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(m);
}
/* v544 – Was das Kind vom Verein hat, zum Nachlesen.

   Kein Eingabefeld: Was ausgegeben wurde, entscheidet der Verein, und die Größe
   entsteht beim Anprobieren am Platz. Die Leseregel der Datenbank lässt genau die
   Zeilen des eigenen Kindes durch, sonst nichts.

   Bewusst NICHT auf der Sammelkarte und nicht im Adler Nest: die Kleidergröße eines
   Kindes ist nichts, was andere Familien oder Gäste sehen müssen. Hier, bei den
   eigenen Eltern, ist sie eine Auskunft — dort wäre sie eine Preisgabe. */
async function elternAusstattungLesen(spielerId){
  let zeilen=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ausstattung_ausgabe?spieler_id=eq.${spielerId}&ausgegeben_am=not.is.null&zurueck_am=is.null&select=groesse,nummer,ausgegeben_am,ausstattung_artikel(name)`,{headers:sbAuthHeaders()});
    if(r.ok)zeilen=(await r.json())||[];
  }catch(e){}
  if(!zeilen.length)return "";
  const datum=d=>{try{return new Date(d+"T00:00:00").toLocaleDateString("de-DE");}catch(e){return d;}};
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:12px">
    <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">👕 Vom Verein erhalten</div>
    ${zeilen.map(z=>`<div style="font-size:12.5px;color:#334155;line-height:1.6">${esc((z.ausstattung_artikel&&z.ausstattung_artikel.name)||"Ausstattung")}${z.groesse?` · Größe ${esc(z.groesse)}`:""}${z.nummer?` · Nr. ${esc(z.nummer)}`:""}${z.ausgegeben_am?` <span style="color:#94a3b8">seit ${datum(z.ausgegeben_am)}</span>`:""}</div>`).join("")}
    <div style="font-size:10.5px;color:#94a3b8;margin-top:5px">Stimmt etwas nicht? Sag dem Trainerteam Bescheid – geändert wird es dort.</div>
  </div>`;
}
async function elternFanfactsSave(spielerId){
  const body={spieler_id:spielerId,
    spitzname:(document.getElementById("ff-spitz")?.value||"").trim()||null,
    lieblingsverein:(document.getElementById("ff-verein")?.value||"").trim()||null,
    lieblingsspieler:(document.getElementById("ff-spieler")?.value||"").trim()||null,
    schuh_groesse:(document.getElementById("ff-schuh")?.value||"").trim()||null,
    gallery_optin:!!(document.getElementById("ff-gallery")&&document.getElementById("ff-gallery").checked),
    updated_at:new Date().toISOString()};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Fan-Fakten gespeichert ✓");
  document.getElementById("fanfacts-modal")?.remove();
}
async function elternFotoUpload(spielerId,input){
  const file=input.files&&input.files[0]; if(!file)return;
  input.disabled=true;
  try{
    const blob=await fotoCompress(file);
    const path=spielerId+"/"+((crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now())+".jpg";
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:spielerId,foto_path:path,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Foto gespeichert, Verknüpfung fehlgeschlagen","err");return;}
    toast("Profilbild aktualisiert ✓");
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{input.disabled=false;}
}
