/* ═══════════════════════════════════
   SMART CARPOOL (Phase 11-N) – Mitfahr-Börse im Eltern-Dashboard.
   Baum: Fahrer-Zeile (carpool_status='driver' + seats/area/note), Mitfahrer verweisen
   via carpool_driver_spieler_id. Teamweite Sicht NUR über carpool_board-RPC (Minimaldaten).
═══════════════════════════════════ */
function elternCarpoolOpen(spielerId,terminId){
  document.getElementById("carpool-modal")?.remove();
  const m=document.createElement("div");
  m.id="carpool-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("carpool-modal","🚗","Fahrgemeinschaft","Mitfahren oder Plätze anbieten","#2563eb")}
    <div id="carpool-body"><div style="text-align:center;padding:24px;color:#64748b">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  elternCarpoolRender(spielerId,terminId);
}
async function elternCarpoolRender(spielerId,terminId){
  const body=document.getElementById("carpool-body"); if(!body)return;
  let mine=null, board=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}&select=carpool_status,carpool_seats,carpool_area,carpool_note,carpool_driver_spieler_id`,{headers:sbAuthHeaders()});if(r.ok)mine=(await r.json())[0]||null;}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/carpool_board`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:terminId})});if(r.ok)board=await r.json();}catch(e){}
  const st=mine?mine.carpool_status:"none";
  const card=(inner)=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px">${inner}</div>`;
  let html="";
  if(st==="driver"){
    const me=board.find(d=>d.driver_spieler_id===spielerId);
    const total=(mine.carpool_seats||0), belegt=me?me.belegt:0, frei=Math.max(0,total-belegt);
    html+=card(`<div style="font-weight:700;margin-bottom:4px">🚗 Ihr fahrt selbst</div>
      <div style="font-size:12.5px;color:#475569">${frei} von ${total} Plätzen frei${mine.carpool_area?` · ${esc(mine.carpool_area)}`:""}</div>
      ${mine.carpool_note?`<div style="font-size:12px;color:#475569;margin-top:2px">📍 ${esc(mine.carpool_note)}</div>`:""}
      ${me&&me.mitfahrer&&me.mitfahrer.length?`<div style="font-size:12px;color:#475569;margin-top:4px">Mitfahrer: <b>${me.mitfahrer.map(esc).join(", ")}</b></div>`:'<div style="font-size:12px;color:var(--text3);margin-top:4px">Noch keine Mitfahrer.</div>'}
      <button onclick="elternCarpoolReset(${spielerId},${terminId})" style="margin-top:8px;border:none;background:none;color:#dc2626;font-size:12px;cursor:pointer">Fahrangebot zurücknehmen</button>`);
  }else if(st==="passenger"){
    const drv=board.find(d=>d.driver_spieler_id===mine.carpool_driver_spieler_id);
    html+=card(`<div style="font-weight:700;margin-bottom:4px">🙋 Ihr fahrt mit</div>
      <div style="font-size:12.5px;color:#475569">bei <b>${drv?esc(drv.fahrer):"—"}</b>${drv&&drv.area?` · ${esc(drv.area)}`:""}</div>
      ${drv&&drv.note?`<div style="font-size:12px;color:#475569;margin-top:2px">📍 ${esc(drv.note)}</div>`:""}
      <button onclick="elternCarpoolReset(${spielerId},${terminId})" style="margin-top:8px;border:none;background:none;color:#dc2626;font-size:12px;cursor:pointer">Abmelden</button>`);
  }else{
    html+=card(`<div style="font-weight:700;margin-bottom:8px">Wie kommt ihr hin?</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="elternCarpoolDriverForm(${spielerId},${terminId})" style="flex:1;min-width:130px;padding:11px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-weight:700;font-size:13px;cursor:pointer">🚗 Wir fahren selbst</button>
        <button onclick="document.getElementById('carpool-search').style.display='block';this.parentNode.parentNode.style.display='none'" style="flex:1;min-width:130px;padding:11px;border:none;border-radius:10px;background:#059669;color:#fff;font-weight:700;font-size:13px;cursor:pointer">🙋 Mitfahrt suchen</button>
      </div>`);
  }
  const freeDrivers=board.filter(d=>d.driver_spieler_id!==spielerId && (d.seats-d.belegt)>0);
  html+=`<div id="carpool-search" style="${st==="none"?"display:none":""}">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:6px 0">Freie Plätze im Team</div>
    ${freeDrivers.length?freeDrivers.map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:6px">
      <div style="flex:1"><div style="font-weight:700;font-size:13px">Bei ${esc(d.fahrer)}</div><div style="font-size:11.5px;color:#64748b">${d.seats-d.belegt} frei${d.area?` · ${esc(d.area)}`:""}${d.note?` · 📍 ${esc(d.note)}`:""}</div></div>
      <button onclick="elternCarpoolPassenger(${spielerId},${terminId},${d.driver_spieler_id})" style="border:none;border-radius:8px;background:#059669;color:#fff;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer">Mitfahren</button>
    </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Aktuell bietet niemand freie Plätze an.</div>'}
  </div>`;
  body.innerHTML=html;
}
function elternCarpoolDriverForm(spielerId,terminId){
  const body=document.getElementById("carpool-body"); if(!body)return;
  const inp="width:100%;padding:9px;margin:4px 0 10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px";
  body.innerHTML=`<div style="font-weight:700;margin-bottom:8px">🚗 Wir fahren selbst</div>
    <label for="cp-seats" style="font-size:12px;color:#475569">Freie Plätze</label>
    <input id="cp-seats" type="number" min="1" max="8" value="2" style="${inp}">
    <label for="cp-area" style="font-size:12px;color:#475569">Bereich / Startpunkt (optional)</label>
    <input id="cp-area" placeholder="z. B. Dellbrück Nord" style="${inp}">
    <label for="cp-note" style="font-size:12px;color:#475569">Notiz: Treffpunkt / Zeit (optional)</label>
    <input id="cp-note" placeholder="z. B. Treff Netto-Parkplatz 16:15" style="${inp}">
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="elternCarpoolRender(${spielerId},${terminId})" style="border:none;background:none;color:#64748b;font-size:13px;cursor:pointer">Abbrechen</button>
      <button onclick="elternCarpoolDriverSave(${spielerId},${terminId})" style="border:none;border-radius:8px;background:#1e3a8a;color:#fff;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer">Angebot einstellen</button>
    </div>`;
}
async function elternCarpoolDriverSave(spielerId,terminId){
  const seats=Math.max(1,parseInt(document.getElementById("cp-seats")?.value)||1);
  const area=(document.getElementById("cp-area")?.value||"").trim()||null;
  const note=(document.getElementById("cp-note")?.value||"").trim()||null;
  await elternCarpoolPatch(spielerId,terminId,{carpool_status:"driver",carpool_seats:seats,carpool_area:area,carpool_note:note,carpool_driver_spieler_id:null});
}
async function elternCarpoolPassenger(spielerId,terminId,driverId){
  await elternCarpoolPatch(spielerId,terminId,{carpool_status:"passenger",carpool_driver_spieler_id:driverId,carpool_seats:null,carpool_area:null,carpool_note:null});
}
async function elternCarpoolReset(spielerId,terminId){
  await elternCarpoolPatch(spielerId,terminId,{carpool_status:"none",carpool_seats:null,carpool_area:null,carpool_note:null,carpool_driver_spieler_id:null});
}
async function elternCarpoolPatch(spielerId,terminId,fields){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({...fields,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Konnte nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Fahrgemeinschaft aktualisiert ✓");
  elternCarpoolRender(spielerId,terminId);
}
