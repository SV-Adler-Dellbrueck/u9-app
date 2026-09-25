/* ═══════════════════════════════════
   TEAMKASSE (Phase 11-O) – rein informativ. App fasst KEIN Geld an; PayPal nur als Link.
   Trainer verwaltet Buchungen + Umlagen; Eltern sehen nur Saldo + Umlagen (RPC).
═══════════════════════════════════ */
const kEur=n=>Number(n||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
/* Event-Mitbringliste (Phase 21.2, umgebaut): Trainer-Überblick, WAS die Eltern zu
   den kommenden Event-Terminen mitbringen. Kein Geld mehr – die alten Geld-Töpfe
   (kassen_topf) sind abgelöst. Eintragen tun die Eltern in ihrem Bereich; der
   Trainer sieht hier die Liste und kann bei Bedarf einzelne Einträge entfernen. */
async function mitbringTrainerOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("mitbring-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="mitbring-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Event-Mitbringliste");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.style.zIndex=zOben(10001);  // ueber einen evtl. schon offenen Dialog legen
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="mitbring-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3)">Lade …</div>';
  modal.appendChild(c);document.body.appendChild(modal);
  await mitbringTrainerRender();
}
async function mitbringTrainerRender(){
  const c=document.getElementById("mitbring-card"); if(!c)return;
  let events=[]; try{events=await mitbringEventsLaden(true);}catch(e){}
  let itemsMap={}; try{itemsMap=await mitbringItems(events.map(e=>e.id));}catch(e){}
  const fmtD=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
  /* v566: Die Liste gibt es für Eltern nur, wenn der Termin sie einschaltet – das steht hier dran. */
  const elternHinweis=ev=>ev.mitbringen?"":`<div style="font-size:var(--s-klein);color:var(--text2);background:var(--surface2);border-radius:8px;padding:6px 8px;margin-bottom:6px">🔕 Für die Eltern noch aus – beim Termin unter „Bearbeiten“ einschalten, wenn jemand etwas mitbringen soll.</div>`;
  const body=events.length?events.map(ev=>{
    const items=itemsMap[ev.id]||[];
    const liste=items.length
      ? items.map(it=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:5px 0;border-top:1px solid var(--surface2)">
          <span style="flex:1">🍽️ <b>${esc(it.was)}</b>${it.wer?` <span style="color:var(--text3)">· ${esc(it.wer)}</span>`:""}</span>
          <button onclick="mitbringDeleteTrainer(${it.id})" aria-label="Eintrag löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:32px;min-height:32px"><i class="ti ti-trash"></i></button>
        </div>`).join("")
      : `<div style="font-size:var(--s-text);color:var(--text3);padding:4px 0">Noch nichts eingetragen.</div>`;
    return `<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="font-weight:800;font-size:var(--s-karte)">🎉 ${esc(ev.titel||"Event")}</div>
      <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">${fmtD(ev.datum)}${ev.ort?" · "+esc(ev.ort):""} · ${items.length} ${items.length===1?"Eintrag":"Einträge"}</div>
      ${elternHinweis(ev)}
      ${liste}
    </div>`;
  }).join(""):'<div style="font-size:var(--s-text);color:var(--text3);margin-bottom:10px">Kein kommender Event-Termin. Lege im Kalender einen Termin vom Typ „🎉 Event" an – dann tragen die Eltern hier ein, was sie mitbringen.</div>';
  c.innerHTML=`${mdlHead("mitbring-modal","🎉","Event-Mitbringliste","Wer bringt was mit? Die Eltern tragen ein, du siehst den Überblick","#f59e0b")}
    ${body}
    <div style="display:flex;margin-top:8px"><button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('mitbring-modal').remove()">Schließen</button></div>`;
}
async function mitbringDeleteTrainer(id){
  if(!confirm("Diesen Eintrag löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  mitbringTrainerRender();
}

async function kasseOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("kasse-modal")?.remove();
  const m=document.createElement("div");m.id="kasse-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("kasse-modal","💰","Teamkasse","Kassenstand & Umlagen · Zahlungen extern über PayPal","#1e3a8a")}
    <div id="kasse-body"><div style="text-align:center;padding:24px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  kasseRender();
}
async function kasseRender(){
  const body=document.getElementById("kasse-body"); if(!body)return;
  let ledger=[],umlagen=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse?select=*&order=datum.desc,id.desc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)ledger=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?select=*&order=aktiv.desc,faellig.asc`,{headers:sbAuthHeaders()});if(r.ok)umlagen=await r.json();}catch(e){}
  let spendenLink=""; try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=spenden_link`,{headers:sbAuthHeaders()});if(r.ok)spendenLink=(((await r.json())[0])||{}).spenden_link||"";}catch(e){}
  const saldo=ledger.reduce((s,x)=>s+Number(x.betrag),0);
  const inp="padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:var(--s-text)";
  body.innerHTML=`
    <div style="text-align:center;background:var(--surface2);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:var(--s-klein);color:var(--text2)">Kassenstand</div>
      <div style="font-size:26px;font-weight:900;color:${saldo<0?'#dc2626':'#059669'}">${kEur(saldo)}</div>
    </div>
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Buchungen</div>
    <div style="max-height:150px;overflow-y:auto;margin-bottom:8px">
    ${ledger.length?ledger.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:4px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1">${esc(x.zweck||'—')} <span style="color:var(--text3);font-size:var(--s-klein)">${x.datum||''}</span></span>
      <span style="font-weight:700;color:${x.betrag<0?'#dc2626':'#059669'}">${x.betrag<0?'':'+'}${kEur(x.betrag)}</span>
      <button onclick="kasseDelEntry(${x.id},'${jsq(x.zweck||"")}')" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Noch keine Buchungen.</div>'}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      <select id="k-typ" style="${inp}"><option value="1">Einnahme</option><option value="-1">Ausgabe</option></select>
      <input id="k-betrag" type="number" step="0.01" min="0" placeholder="Betrag" style="width:82px;${inp}">
      <input id="k-zweck" placeholder="Zweck" style="flex:1;min-width:100px;${inp}">
      <button class="btn btn-sm" onclick="kasseAddEntry()"><i class="ti ti-plus"></i></button>
    </div>
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Umlagen (für Eltern sichtbar)</div>
    ${umlagen.length?umlagen.map(u=>`<div style="display:flex;align-items:center;gap:6px;font-size:var(--s-text);padding:5px 0;border-bottom:1px solid var(--surface2);${u.aktiv?'':'opacity:.5'}">
      <span style="flex:1">${esc(u.titel)} · <b>${kEur(u.betrag)}</b>${u.faellig?` · bis ${u.faellig}`:''}</span>
      <button onclick="kasseToggleUmlage(${u.id},${!u.aktiv})" title="${u.aktiv?'deaktivieren':'aktivieren'}" style="border:none;background:transparent;cursor:pointer;color:var(--text2)"><i class="ti ti-eye${u.aktiv?'':'-off'}"></i></button>
      <button onclick="kasseDelUmlage(${u.id})" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Keine Umlagen.</div>'}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <input id="u-titel" placeholder="Titel (z. B. Sommerfest)" style="flex:1;min-width:110px;${inp}">
      <input id="u-betrag" type="number" step="0.01" min="0" placeholder="€" style="width:66px;${inp}">
      <input id="u-faellig" type="date" title="fällig bis" style="${inp}">
      <input id="u-paypal" placeholder="PayPal.Me-Link (optional)" style="flex:1;min-width:130px;${inp}">
      <button class="btn btn-sm" onclick="kasseAddUmlage()"><i class="ti ti-plus"></i>Umlage</button>
    </div>
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:16px 0 6px">🦅 Adler-Kasse (Fan-Spenden-Link)</div>
    <div style="display:flex;gap:6px">
      <input id="ak-link" value="${esc(spendenLink)}" placeholder="https://paypal.me/deinLink" style="flex:1;min-width:130px;${inp}">
      <button class="btn btn-sm" onclick="adlerkasseSave()"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">Dauerhafter Spenden-Button für Fans (Liveticker) &amp; Eltern-Portal. Leer lassen = kein Button.</div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:12px">Rein informativ – die App verwaltet kein Geld. Zahlungen laufen extern über PayPal.</div>`;
}
async function adlerkasseSave(){
  const link=(document.getElementById("ak-link")?.value||"").trim()||null;
  if(link&&!/^https?:\/\//i.test(link)){toast("Bitte einen vollständigen Link mit https:// eingeben","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({id:1,spenden_link:link,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast(link?"🦅 Adler-Kasse-Link gespeichert ✓":"Link entfernt");
}
async function kasseAddEntry(){
  const sign=parseInt(document.getElementById("k-typ")?.value)||1;
  const val=Math.abs(parseFloat(document.getElementById("k-betrag")?.value)||0);
  if(!val){toast("Betrag eingeben","err");return;}
  const zweck=(document.getElementById("k-zweck")?.value||"").trim()||null;
  try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({betrag:sign*val,zweck})});if(sbCheck401(r))return;if(!r.ok){toast("Fehler","err");return;}}catch(e){return;}
  kasseRender();
}
async function kasseDelEntry(id,zweck){ if(!confirm(`Kassen-Eintrag wirklich löschen?

${zweck||""}`))return; try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){} kasseRender(); }
async function kasseAddUmlage(){
  const titel=(document.getElementById("u-titel")?.value||"").trim();
  const betrag=parseFloat(document.getElementById("u-betrag")?.value)||0;
  if(!titel||!betrag){toast("Titel und Betrag eingeben","err");return;}
  const faellig=document.getElementById("u-faellig")?.value||null;
  const paypal=(document.getElementById("u-paypal")?.value||"").trim()||null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({titel,betrag,faellig,paypal_link:paypal})});if(sbCheck401(r))return;if(!r.ok){toast("Fehler","err");return;}}catch(e){return;}
  kasseRender();
}
async function kasseToggleUmlage(id,aktiv){ try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({aktiv})});if(sbCheck401(r))return;}catch(e){} kasseRender(); }
async function kasseDelUmlage(id){ if(!confirm("Umlage wirklich löschen?"))return; try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){} kasseRender(); }

