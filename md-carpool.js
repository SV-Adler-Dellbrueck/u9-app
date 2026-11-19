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
  m.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:18px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("carpool-modal","🚗","Fahrgemeinschaft","Mitfahren oder Plätze anbieten","#2563eb")}
    <div id="carpool-body"><div style="text-align:center;padding:24px;color:var(--text3)">Lade…</div></div>
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
  const card=(inner)=>`<div style="background:var(--surface2);border:var(--border);border-radius:12px;padding:12px;margin-bottom:10px">${inner}</div>`;
  let html="";
  if(st==="driver"){
    const me=board.find(d=>d.driver_spieler_id===spielerId);
    const total=(mine.carpool_seats||0), belegt=me?me.belegt:0, frei=Math.max(0,total-belegt);
    html+=card(`<div style="font-weight:700;margin-bottom:4px">🚗 Ihr fahrt selbst</div>
      <div style="font-size:var(--s-text);color:var(--text2)">${frei} von ${total} Plätzen frei${mine.carpool_area?` · ${esc(mine.carpool_area)}`:""}</div>
      ${mine.carpool_note?`<div style="font-size:var(--s-text);color:var(--text2);margin-top:2px">📍 ${esc(mine.carpool_note)}</div>`:""}
      ${me&&me.mitfahrer&&me.mitfahrer.length?`<div style="font-size:var(--s-text);color:var(--text2);margin-top:4px">Mitfahrer: <b>${me.mitfahrer.map(esc).join(", ")}</b></div>`:'<div style="font-size:var(--s-text);color:var(--text3);margin-top:4px">Noch keine Mitfahrer.</div>'}
      <button class="btn btn-sm btn-d" onclick="elternCarpoolReset(${spielerId},${terminId})" style="margin-top:8px;font-size:var(--s-text);justify-content:center">Fahrangebot zurücknehmen</button>`);
  }else if(st==="passenger"){
    const drv=board.find(d=>d.driver_spieler_id===mine.carpool_driver_spieler_id);
    html+=card(`<div style="font-weight:700;margin-bottom:4px">🙋 Ihr fahrt mit</div>
      <div style="font-size:var(--s-text);color:var(--text2)">bei <b>${drv?esc(drv.fahrer):"—"}</b>${drv&&drv.area?` · ${esc(drv.area)}`:""}</div>
      ${drv&&drv.note?`<div style="font-size:var(--s-text);color:var(--text2);margin-top:2px">📍 ${esc(drv.note)}</div>`:""}
      <button class="btn btn-sm btn-d" onclick="elternCarpoolReset(${spielerId},${terminId})" style="margin-top:8px;font-size:var(--s-text);justify-content:center">Abmelden</button>`);
  }else{
    html+=card(`<div style="font-weight:700;margin-bottom:8px">Wie kommt ihr hin?</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p" onclick="elternCarpoolDriverForm(${spielerId},${terminId})" style="flex:1;min-width:130px;font-size:var(--s-text);justify-content:center">🚗 Wir fahren selbst</button>
        <button class="btn" onclick="document.getElementById('carpool-search').style.display='block';this.parentNode.parentNode.style.display='none'" style="flex:1;min-width:130px;font-size:var(--s-text);justify-content:center">🙋 Mitfahrt suchen</button>
      </div>`);
  }
  const freeDrivers=board.filter(d=>d.driver_spieler_id!==spielerId && (d.seats-d.belegt)>0);
  html+=`<div id="carpool-search" style="${st==="none"?"display:none":""}">
    <div style="font-size:var(--s-klein);text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:6px 0">Freie Plätze im Team</div>
    ${freeDrivers.length?freeDrivers.map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface2);border:var(--border);border-radius:10px;margin-bottom:6px">
      <div style="flex:1"><div style="font-weight:700;font-size:var(--s-text)">Bei ${esc(d.fahrer)}</div><div style="font-size:var(--s-klein);color:var(--text3)">${d.seats-d.belegt} frei${d.area?` · ${esc(d.area)}`:""}${d.note?` · 📍 ${esc(d.note)}`:""}</div></div>
      <button class="btn btn-sm" onclick="elternCarpoolPassenger(${spielerId},${terminId},${d.driver_spieler_id})" style="font-size:var(--s-text);justify-content:center">Mitfahren</button>
    </div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Aktuell bietet niemand freie Plätze an.</div>'}
  </div>`;
  body.innerHTML=html;
}
function elternCarpoolDriverForm(spielerId,terminId){
  const body=document.getElementById("carpool-body"); if(!body)return;
  const inp="width:100%;padding:9px;margin:4px 0 10px;border:var(--border-s);border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text)";
  body.innerHTML=`<div style="font-weight:700;margin-bottom:8px">🚗 Wir fahren selbst</div>
    <label for="cp-seats" style="font-size:var(--s-text);color:var(--text2)">Freie Plätze</label>
    <input id="cp-seats" type="number" min="1" max="8" value="2" style="${inp}">
    <label for="cp-area" style="font-size:var(--s-text);color:var(--text2)">Bereich / Startpunkt (optional)</label>
    <input id="cp-area" placeholder="z. B. Dellbrück Nord" style="${inp}">
    <label for="cp-note" style="font-size:var(--s-text);color:var(--text2)">Notiz: Treffpunkt / Zeit (optional)</label>
    <input id="cp-note" placeholder="z. B. Treff Netto-Parkplatz 16:15" style="${inp}">
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" onclick="elternCarpoolRender(${spielerId},${terminId})" style="font-size:var(--s-text);justify-content:center">Abbrechen</button>
      <button class="btn btn-p" onclick="elternCarpoolDriverSave(${spielerId},${terminId})" style="font-size:var(--s-text);justify-content:center">Angebot einstellen</button>
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
