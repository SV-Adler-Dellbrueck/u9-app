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
  if(!await frageJaNein({titel:"Eintrag löschen?",ja:"Löschen",ton:"rot",emoji:"🗑️"}))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  mitbringTrainerRender();
}

async function kasseOpen(){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  document.getElementById("kasse-modal")?.remove();
  const m=document.createElement("div");m.id="kasse-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Kasse führen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("kasse-modal","🧾","Kasse führen","Bewegungen erfassen, Beiträge abhaken · gezahlt wird außerhalb der App","#1e3a8a")}
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
  // v699: Kassenstand = Buchungen + abgehakte Beiträge (Sammelposten aus kasse_summary)
  let summe=null; try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kasse_summary`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)summe=await r.json();}catch(e){}
  const sammel=(summe&&summe.sammel)||[];
  const saldo=summe&&summe.saldo!=null?Number(summe.saldo):ledger.reduce((s,x)=>s+Number(x.betrag),0)+sammel.reduce((s,x)=>s+Number(x.summe),0);
  const inp="min-height:48px;padding:8px 10px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)";
  const lbl=t=>`<span style="display:block;font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-bottom:2px">${t}</span>`;
  const heute=isoLokal();
  body.innerHTML=`
    <div style="text-align:center;background:var(--surface2);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:var(--s-klein);color:var(--text2)">Kassenstand</div>
      <div style="font-size:26px;font-weight:900;color:${saldo<0?'var(--red)':'var(--green)'}">${kEur(saldo)}</div>
      <div style="font-size:var(--s-klein);color:var(--text2)">inkl. abgehakter Beiträge</div>
    </div>
    <form id="k-form" onsubmit="event.preventDefault();kasseBuchungSpeichern()" style="border:1px solid var(--rand-bedien);border-radius:12px;padding:12px;margin-bottom:12px">
      <div id="k-form-titel" style="font-weight:800;font-size:var(--s-karte);margin-bottom:8px">Bewegung erfassen</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${lbl("Art")}<select id="k-typ" style="width:100%;${inp}"><option value="-1">Ausgabe</option><option value="1">Einnahme</option></select></label>
        <label>${lbl("Betrag in €")}<input id="k-betrag" type="number" inputmode="decimal" step="0.01" min="0" style="width:100%;${inp}"></label>
        <label>${lbl("Datum")}<input id="k-datum" type="date" value="${heute}" max="${heute}" style="width:100%;${inp}"></label>
        <label>${lbl("Kategorie")}<select id="k-kat" onchange="kasseKatHinweis()" style="width:100%;${inp}">${KASSE_KAT.map(k=>`<option value="${k.k}"${k.k==="sonstiges"?" selected":""}>${k.e} ${k.t}</option>`).join("")}</select></label>
      </div>
      <div id="k-kat-hinweis" role="note" style="display:none;font-size:var(--s-klein);color:var(--text2);margin-top:4px">Beiträge bitte unter „Wer hat bezahlt“ abhaken. Eine zusätzliche Buchung zählt sie im Kassenstand doppelt.</div>
      <label style="display:block;margin-top:8px">${lbl("Wofür?")}<input id="k-zweck" maxlength="120" placeholder="z. B. Eis nach dem Turnier" style="width:100%;${inp}"></label>
      <div style="font-size:var(--s-klein);color:var(--text2);margin-top:2px">Alle Eltern sehen Datum, Kategorie, Zweck und Betrag – bitte keine Namen von Kindern oder Familien.</div>
      <label style="display:block;margin-top:8px">${lbl("Beleg (Foto oder PDF, optional)")}<input id="k-beleg" type="file" accept="image/*,application/pdf" style="width:100%;font-family:inherit;font-size:var(--s-text)"></label>
      <div id="k-beleg-alt" style="font-size:var(--s-klein);color:var(--text2)"></div>
      <div style="font-size:var(--s-klein);color:var(--text2)">Belege sehen nur die Kasse und das Trainerteam.</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button type="submit" id="k-speichern" class="btn btn-p" style="flex:1;min-height:48px;justify-content:center">Bewegung erfassen</button>
        <button type="button" id="k-abbrechen" class="btn" style="display:none;min-height:48px" onclick="kasseBuchungAbbrechen()">Abbrechen</button>
      </div>
    </form>
    <div style="font-size:var(--s-text);font-weight:700;color:var(--text2);margin-bottom:6px">Bewegungen</div>
    <div style="margin-bottom:16px">${kasseListeHtml(ledger,sammel,true)}</div>
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Umlagen (für Eltern sichtbar)</div>
    ${umlagen.length?umlagen.map(u=>`<div style="display:flex;align-items:center;gap:6px;font-size:var(--s-text);padding:5px 0;border-bottom:1px solid var(--surface2);${u.aktiv?'':'opacity:.5'}">
      <span style="flex:1">${esc(u.titel)} · <b>${kEur(u.betrag)}</b>${u.faellig?` · bis ${u.faellig}`:''}</span>
      <button type="button" onclick="kasseUmlageBearbeiten(${u.id})" aria-label="Umlage ${esc(u.titel)} bearbeiten" title="Bearbeiten" style="min-height:44px;min-width:44px;border:none;background:transparent;cursor:pointer;color:var(--text2);font-size:var(--s-karte)">✏️</button>
      <button onclick="kasseToggleUmlage(${u.id},${!u.aktiv})" title="${u.aktiv?'deaktivieren':'aktivieren'}" style="border:none;background:transparent;cursor:pointer;color:var(--text2)"><i class="ti ti-eye${u.aktiv?'':'-off'}"></i></button>
      <button onclick="kasseDelUmlage(${u.id})" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="font-size:var(--s-text);color:var(--text3)">Keine Umlagen.</div>'}
    <div id="u-form-titel" style="font-weight:700;font-size:var(--s-text);margin-top:10px">Umlage erfassen</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
      <input id="u-titel" placeholder="Titel (z. B. Sommerfest)" style="flex:1;min-width:110px;${inp}">
      <input id="u-betrag" type="number" step="0.01" min="0" placeholder="€" style="width:66px;${inp}">
      <input id="u-faellig" type="date" title="fällig bis" style="${inp}">
      <input id="u-paypal" placeholder="PayPal.Me-Link (optional)" aria-label="PayPal.Me-Link (optional)" style="flex:1;min-width:130px;${inp}">
      <button type="button" id="u-speichern" class="btn btn-sm" style="min-height:44px" onclick="kasseAddUmlage()"><i class="ti ti-plus"></i>Umlage</button>
      <button type="button" id="u-abbrechen" class="btn btn-sm" style="display:none;min-height:44px" onclick="kasseUmlageAbbrechen()">Abbrechen</button>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">PayPal-App → Einstellungen → PayPal.Me. Der Link darf mit oder ohne https:// eingefügt werden.</div>
    <div id="kasse-bezahlt-slot"></div>
    <div id="kasse-rolle-slot"></div>
    <div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:16px 0 6px">🦅 Adler-Kasse (Fan-Spenden-Link)</div>
    <div style="display:flex;gap:6px">
      <input id="ak-link" value="${esc(spendenLink)}" placeholder="https://paypal.me/deinLink" style="flex:1;min-width:130px;${inp}">
      <button class="btn btn-sm" onclick="adlerkasseSave()"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">Dauerhafter Spenden-Button für Fans (Liveticker) &amp; Eltern-Portal. Leer lassen = kein Button.</div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:12px">Rein informativ – die App verwaltet kein Geld. Zahlungen laufen extern über PayPal.</div>`;
  window._kasseDaten={ledger,umlagen,sammel,saldo};
  window._kasseUmlageEdit=null;
  kasseBezahltRender(umlagen);
  kasseRolleRender();
}
async function adlerkasseSave(){
  const link=kassePaypalVoran(document.getElementById("ak-link")?.value)||null;   // v735: paypal.me/… ohne https:// ergänzen
  if(link&&!/^https?:\/\//i.test(link)){toast("Bitte einen vollständigen Link mit https:// eingeben","err");return;}
  try{
    // v698: über kasse_spenden_link_setzen – so darf auch die Kasse (Elternteil) den Link pflegen
    const r=await fetch(`${SB_URL}/rest/v1/rpc/kasse_spenden_link_setzen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_link:link})});
    if(sbCheck401(r))return;
    if(!r.ok){const d=await r.json().catch(()=>({}));toast(d.message||"Link nicht gespeichert","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast(link?"🦅 Adler-Kasse-Link gespeichert ✓":"Link entfernt");
}
/* v735 (Auftragspaket Umlage bearbeiten / PayPal): PayPal zeigt den eigenen Link als „paypal.me/Name“ ohne
   https://. Die Eltern-Kachel zeigt den Knopf aber nur bei https:// – ein so gespeicherter Link verschwand still.
   Deshalb beim Speichern bereinigen und nur echte PayPal.Me-Adressen annehmen (Host muss genau passen). */
function kassePaypalVoran(roh){
  const t=String(roh==null?"":roh).trim();
  if(/^(www\.)?paypal\.me\//i.test(t)||/^www\.paypal\.com\/paypalme\//i.test(t))return "https://"+t;
  if(/^paypal\.com\/paypalme\//i.test(t))return "https://www."+t;   // Host der PayPal-Seite ist www.paypal.com
  return t;
}
function kassePaypalLink(roh){
  /* Nachtrag 04.10.: hinter dem Namen darf höchstens ein Betrag stehen (paypal.me/Name/40, …/40EUR, …/12,50).
     Das Komma wird zum Punkt; Abfragen und Fragmente fallen weg. Alles andere lehnt die App ab. */
  const t=kassePaypalVoran(roh);
  if(!t)return {ok:true,link:null};
  if(!/^https:\/\//i.test(t))return {ok:false};
  let u; try{u=new URL(t);}catch(e){return {ok:false};}
  if(u.protocol!=="https:"||u.username||u.password||u.port)return {ok:false};
  const host=u.hostname.toLowerCase();
  const teile=u.pathname.split("/").filter(Boolean).map(x=>{try{return decodeURIComponent(x);}catch(e){return "\u0000";}});
  let vor;
  if(host==="paypal.me"||host==="www.paypal.me")vor=[];
  else if(host==="www.paypal.com"&&(teile[0]||"").toLowerCase()==="paypalme"){vor=[teile.shift()];}
  else return {ok:false};
  const [name,betrag,...rest]=teile;
  if(!name||!/^[A-Za-z0-9._-]{1,64}$/.test(name)||rest.length)return {ok:false};
  if(betrag!=null&&!/^\d+([.,]\d{1,2})?[A-Za-z]{0,3}$/.test(betrag))return {ok:false};
  return {ok:true,link:"https://"+host+"/"+vor.concat([name],betrag!=null?[betrag.replace(",",".")]:[]).join("/")};
}
async function kasseAddUmlage(){
  const titel=(document.getElementById("u-titel")?.value||"").trim();
  const betrag=Math.round((parseFloat(String(document.getElementById("u-betrag")?.value||"").replace(",","."))||0)*100)/100;
  if(!titel||!betrag){toast("Titel und Betrag eingeben","err");return;}
  const faellig=document.getElementById("u-faellig")?.value||null;
  const pp=kassePaypalLink(document.getElementById("u-paypal")?.value);
  if(!pp.ok){toast("Bitte den PayPal.Me-Link einfügen, zum Beispiel paypal.me/DeinName","err");document.getElementById("u-paypal")?.focus();return;}
  const edit=window._kasseUmlageEdit||null;
  if(edit){
    // Ändert sich der Betrag einer Umlage mit Häkchen, ändert sich der Kassenstand – vorher fragen.
    const alt=Number(edit.betrag);
    if(betrag!==alt){
      let ue=window._kasseUebersicht; if(!ue||!ue.hat){const roh=await kasseUebersichtLaden(); ue={hat:{}}; ((roh&&roh.zahlungen)||[]).forEach(z=>{ue.hat[z.u+"_"+z.s]=z.am;});}
      const n=Object.keys(ue.hat||{}).filter(k=>k.split("_")[0]===String(edit.id)).length;
      if(n){
        const diff=Math.round((betrag-alt)*n*100)/100;
        if(!await frageJaNein({titel:"Betrag ändern?",text:`Der Betrag ändert sich von ${kEur(alt)} auf ${kEur(betrag)}. Bei ${n} abgehakten ${n===1?"Familie":"Familien"} ändert sich der Kassenstand um ${diff>0?"+":""}${kEur(diff)}. Ändern?`,ja:"Ändern",emoji:"💶"}))return;
      }
    }
  }
  const daten={titel,betrag,faellig,paypal_link:pp.link};
  try{
    const r=edit
      ?await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${edit.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify(daten)})
      :await fetch(`${SB_URL}/rest/v1/kasse_umlagen`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(daten)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Nicht gespeichert – bitte noch einmal versuchen","err");return;}
  }catch(e){toast("Keine Verbindung – nicht gespeichert","err");return;}
  toast(edit?"Umlage geändert ✓":"Umlage erfasst ✓");
  kasseRender();
}
function kasseUmlageBearbeiten(id){
  const u=((window._kasseDaten||{}).umlagen||[]).find(x=>Number(x.id)===Number(id)); if(!u)return;
  window._kasseUmlageEdit={id:u.id,betrag:Number(u.betrag)};
  const set=(i,v)=>{const el=document.getElementById(i);if(el)el.value=v;};
  set("u-titel",u.titel||""); set("u-betrag",Number(u.betrag).toFixed(2)); set("u-faellig",u.faellig||""); set("u-paypal",u.paypal_link||"");
  const t=document.getElementById("u-form-titel"); if(t)t.textContent="Umlage ändern";
  const k=document.getElementById("u-speichern"); if(k)k.textContent="Änderung speichern";
  const a=document.getElementById("u-abbrechen"); if(a)a.style.display="";
  document.getElementById("u-form-titel")?.scrollIntoView({behavior:"smooth",block:"center"});
  document.getElementById("u-titel")?.focus();
}
function kasseUmlageAbbrechen(){ window._kasseUmlageEdit=null; kasseRender(); }
/* Doppelzählung: Der Kassenstand ist Buchungen plus abgehakte Beiträge. Wer Beiträge zusätzlich bucht, zählt sie doppelt. */
function kasseKatHinweis(){
  const el=document.getElementById("k-kat-hinweis"); if(!el)return;
  const aktiv=((window._kasseDaten||{}).umlagen||[]).some(u=>u.aktiv);
  el.style.display=(document.getElementById("k-kat")?.value==="beitraege"&&aktiv)?"":"none";
}
async function kasseToggleUmlage(id,aktiv){ try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({aktiv})});if(sbCheck401(r))return;}catch(e){} kasseRender(); }
async function kasseDelUmlage(id){
  // v699: Abgehakte Beiträge stehen im Kassenstand – eine Umlage mit Zahlungen wird nur deaktiviert.
  const ue=window._kasseUebersicht||{hat:{}};
  if(Object.keys(ue.hat||{}).some(k=>k.split("_")[0]===String(id))){toast("Diese Umlage hat schon Zahlungen – bitte mit dem Auge deaktivieren statt löschen, sonst fehlt das Geld im Kassenstand.","err");return;}
  if(!await frageJaNein({titel:"Umlage löschen?",text:"Die Häkchen „bezahlt“ dieser Umlage verschwinden mit.",ja:"Löschen",ton:"rot",emoji:"🗑️"}))return; try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){} kasseRender(); }

/* ═══ v664: Kassenwart-Kasse ═══
   PO 28.09.: „Die Mutter eines Kindes ist neue Kassenwärtin … wie können wir da mit der App
   unterstützen?“ Kachel: Rolle „Kasse“ für ein Elternteil, bezahlt/offen je Familie,
   Erinnerung, Export – ohne Zahlungsabwicklung. Die Kasse (Trainer oder ein Konto aus
   kasse_team) hakt ab, was angekommen ist; jede Familie sieht nur ihre eigenen Kinder. */
async function kasseUebersichtLaden(){
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kasse_uebersicht`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)return await r.json();}catch(e){}
  return null;
}
async function kasseBezahltRender(umlagen){
  const slot=document.getElementById("kasse-bezahlt-slot"); if(!slot)return;
  const aktiv=(umlagen||[]).filter(u=>u.aktiv);
  if(!aktiv.length){slot.innerHTML="";return;}
  const ue=await kasseUebersichtLaden();
  if(!ue){slot.innerHTML=`<div style="font-size:var(--s-text);color:var(--text3);margin-top:12px">„Wer hat bezahlt“ lädt gerade nicht – bitte später noch einmal öffnen.</div>`;return;}
  const kinder=ue.kinder||[], hat={};
  (ue.zahlungen||[]).forEach(z=>{hat[z.u+"_"+z.s]=z.am;});
  window._kasseUebersicht={kinder,hat,umlagen:aktiv};
  slot.innerHTML=`<div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:16px 0 6px">Wer hat bezahlt</div>
    ${aktiv.map(u=>{
      const n=kinder.filter(k=>hat[u.id+"_"+k.id]).length;
      return `<div style="border:1px solid var(--rand-bedien);border-radius:12px;padding:10px;margin-bottom:8px">
        <div style="font-weight:700;font-size:var(--s-text);margin-bottom:6px">${esc(u.titel)} · ${kEur(u.betrag)} <span style="font-weight:600;color:var(--text2)">– ${n} von ${kinder.length} bezahlt</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${kinder.map(k=>{const b=!!hat[u.id+"_"+k.id];
          return `<button type="button" class="kz-kind" data-u="${u.id}" data-s="${k.id}" aria-pressed="${b}" onclick="kasseBezahltToggle(${u.id},${k.id},${!b})"
            style="min-height:44px;padding:6px 12px;border-radius:22px;font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer;border:1.5px solid ${b?'#15803d':'var(--rand-bedien)'};background:${b?'#dcfce7':'var(--surface2)'};color:${b?'#14532d':'var(--text)'}">${b?'✓ ':''}${esc(k.name)}${b?'':' · offen'}</button>`;}).join("")}</div>
      </div>`;}).join("")}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
      <button type="button" class="btn btn-sm" style="flex:1;min-height:44px" onclick="kasseErinnern(this)">🔔 Offene erinnern</button>
      <button type="button" class="btn btn-sm" style="flex:1;min-height:44px" onclick="kasseExport()">⬇️ Export (CSV)</button>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">Die Erinnerung geht als Mitteilung nur an Familien mit offenem Betrag – höchstens einmal am Tag.</div>`;
}
async function kasseBezahltToggle(umlageId,spielerId,bezahlt){
  try{
    const r=bezahlt
      ?await fetch(`${SB_URL}/rest/v1/kasse_zahlung`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({umlage_id:umlageId,spieler_id:spielerId})})
      :await fetch(`${SB_URL}/rest/v1/kasse_zahlung?umlage_id=eq.${umlageId}&spieler_id=eq.${spielerId}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok){toast("Das Häkchen wurde nicht gespeichert","err");return;}
  }catch(e){toast("Keine Verbindung – Häkchen nicht gespeichert","err");return;}
  kasseBezahltRender((window._kasseDaten||{}).umlagen);
}
async function kasseErinnern(btn){
  if(btn)btn.disabled=true;
  let d=null;
  try{const r=await fetch(`${SB_URL}/functions/v1/push-send`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({art:"kasse_erinnerung"})});d=await r.json().catch(()=>null);}catch(e){}
  if(btn)btn.disabled=false;
  if(!d){toast("Keine Verbindung – Erinnerung nicht verschickt","err");return;}
  if(d.error){toast(d.error,"err");return;}
  toast(d.familien?`🔔 Erinnerung an ${d.familien} ${d.familien===1?"Familie":"Familien"} verschickt`:"Niemand hat mehr etwas offen 🎉");
}
function kasseCsvZelle(v){const t=String(v==null?"":v);return /[";\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}
function kasseExport(){
  const d=window._kasseDaten||{}, ue=window._kasseUebersicht||{kinder:[],hat:{},umlagen:[]};
  const z=[["Art","Datum","Kategorie","Zweck / Umlage","Betrag","Kind","Status","Beleg"]];
  const eu=n=>String(Number(n).toFixed(2)).replace(".",",");
  (d.ledger||[]).slice().reverse().forEach(x=>z.push(["Buchung",x.datum||"",kasseKat(x.kategorie).t,x.zweck||"",eu(x.betrag),"","",x.beleg?"ja":""]));
  (d.sammel||[]).forEach(x=>z.push(["Beiträge (Sammelposten)",x.datum||"","Beiträge",`${x.titel} – ${x.anzahl} ${x.anzahl===1?"Familie":"Familien"}`,eu(x.summe),"","",""]));
  (ue.umlagen||[]).forEach(u=>ue.kinder.forEach(k=>{const am=ue.hat[u.id+"_"+k.id];z.push(["Umlage",am||"","Beiträge",u.titel,eu(u.betrag),k.name,am?"bezahlt":"offen",""]);}));
  // Summen je Kategorie und Kassenstand – für die Kassenprüfung
  z.push([]);z.push(["Summe","","Kategorie","","Betrag","","",""]);
  const sum={}; (d.ledger||[]).forEach(x=>{const k=kasseKat(x.kategorie).t;sum[k]=(sum[k]||0)+Number(x.betrag);});
  (d.sammel||[]).forEach(x=>{sum["Beiträge"]=(sum["Beiträge"]||0)+Number(x.summe);});
  Object.keys(sum).sort().forEach(k=>z.push(["Summe","",k,"",eu(sum[k]),"","",""]));
  if(d.saldo!=null)z.push(["Kassenstand",isoLokal(),"","",eu(d.saldo),"","",""]);
  const csv="﻿"+z.map(r=>r.map(kasseCsvZelle).join(";")).join("\r\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download=`Mannschaftskasse_${isoLokal()}.csv`;
  document.body.appendChild(a);a.click();a.remove();
  toast("Export erstellt ✓");
}
/* ═══ v699 · Mannschaftskasse – Kategorien, Liste, Buchen mit Beleg, Übersicht für alle Eltern ═══
   PO 30.09.: „Kachel Mannschaftskasse, in der alle Eltern Leserechte haben … Milja soll eine extra
   Kachel haben, wo sie Kontobewegungen eintragen und Ausgaben festhalten kann. Damit die Eltern immer
   den aktuellen Kontostand sehen und alle Ausgaben, für was und wann.“ Abgehakte Beiträge zählen
   automatisch (Sammelposten ohne Namen). Belege liegen im privaten Bucket „kasse-belege“ – sehen
   dürfen sie nur Kasse und Trainerteam; Eltern sehen „Beleg vorhanden“. Kategorien = Prüfregel in der DB. */
const KASSE_KAT=[
  {k:"uebertrag",e:"↪️",t:"Anfangsbestand / Übertrag"},{k:"beitraege",e:"💶",t:"Beiträge"},{k:"spenden",e:"🎁",t:"Spenden"},
  {k:"ausruestung",e:"👕",t:"Ausrüstung"},{k:"turniere",e:"🏆",t:"Turniere & Startgelder"},{k:"feiern",e:"🎉",t:"Feiern & Ausflüge"},
  {k:"sonstiges",e:"📦",t:"Sonstiges"}];
function kasseKat(k){ return KASSE_KAT.find(x=>x.k===k)||KASSE_KAT[KASSE_KAT.length-1]; }
function kasseDatum(d){ return d?new Date(d+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}):""; }
/* Eine Liste für beide Sichten: Buchungen + Sammelposten, neueste zuerst. bearbeiten=true zeigt
   Beleg öffnen, Bearbeiten und Löschen (nur die Kasse); sonst „🧾 Beleg vorhanden“. */
function kasseListeHtml(ledger,sammel,bearbeiten,filter){
  const zeilen=[...(ledger||[]).map(x=>({...x,art:"b"})),...(sammel||[]).map(x=>({id:"s"+x.id,datum:x.datum,betrag:Number(x.summe),kategorie:"beitraege",zweck:`${x.titel} – ${x.anzahl} ${x.anzahl===1?"Familie":"Familien"}`,art:"s"}))]
    .filter(x=>!filter||filter==="alle"||(filter==="aus"?Number(x.betrag)<0:Number(x.betrag)>=0))
    .sort((a,b)=>String(b.datum||"").localeCompare(String(a.datum||""))||(String(b.id)>String(a.id)?1:-1));
  if(!zeilen.length)return `<div style="font-size:var(--s-text);color:var(--text2);padding:8px 0">${filter==="aus"?"Noch keine Ausgaben.":filter==="ein"?"Noch keine Einnahmen.":"Noch keine Bewegungen."}</div>`;
  const knopf=(t,l,fn,farbe)=>`<button type="button" onclick="${fn}" aria-label="${l}" title="${l}" style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:${farbe||"var(--text)"};cursor:pointer;font-size:var(--s-text)">${t}</button>`;
  return zeilen.map(x=>{const k=kasseKat(x.kategorie), aus=Number(x.betrag)<0;
    return `<div class="kasse-zeile" data-art="${aus?"aus":"ein"}" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--surface2)">
      <span aria-hidden="true" style="font-size:var(--s-karte)">${k.e}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:var(--s-text);overflow-wrap:anywhere">${esc(x.zweck||k.t)}</div>
        <div style="font-size:var(--s-klein);color:var(--text2)">${kasseDatum(x.datum)} · ${esc(k.t)}${x.art==="s"?" · automatisch aus „Wer hat bezahlt“":""}${!bearbeiten&&x.beleg?" · 🧾 Beleg vorhanden":""}</div>
      </div>
      <span style="font-weight:800;white-space:nowrap;color:${aus?"var(--red)":"var(--green)"}">${aus?"−":"+"} ${kEur(Math.abs(Number(x.betrag)))}</span>
      ${bearbeiten&&x.art==="b"?`${x.beleg?knopf("🧾","Beleg ansehen",`kasseBelegZeigen('${jsq(x.beleg)}')`):""}${knopf("✏️","Bearbeiten",`kasseBuchungBearbeiten(${Number(x.id)})`)}${knopf("🗑️","Löschen",`kasseDelEntry(${Number(x.id)})`,"var(--red)")}`:""}
    </div>`;}).join("");
}
async function kasseBelegHochladen(file){
  let blob=file, typ=file.type||"application/octet-stream", endung=(file.name||"").split(".").pop().toLowerCase()||"bin";
  // Fotos verkleinern (Belege bleiben lesbar, Speicher bleibt klein); PDF und HEIC unverändert
  if(/^image\/(jpeg|png|webp)$/.test(typ)&&typeof fotoVerkleinern==="function"){ try{ blob=await fotoVerkleinern(file,1600); typ="image/jpeg"; endung="jpg"; }catch(e){} }
  if(blob.size>10*1024*1024)throw new Error("Der Beleg ist größer als 10 MB");
  const pfad=((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()))+"."+endung;
  const r=await fetch(`${SB_URL}/storage/v1/object/kasse-belege/${pfad}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':typ},body:blob});
  if(!r.ok)throw new Error("Beleg nicht hochgeladen");
  return pfad;
}
async function kasseBelegLoeschen(pfad){ if(!pfad)return; try{await fetch(`${SB_URL}/storage/v1/object/kasse-belege/${pfad}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}});}catch(e){} }
async function kasseBelegZeigen(pfad){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/kasse-belege/${pfad}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok){toast("Beleg nicht verfügbar","err");return;}
    const url=URL.createObjectURL(await r.blob());
    const w=window.open(url,"_blank"); if(!w)location.href=url;
  }catch(e){toast("Keine Verbindung – Beleg nicht geladen","err");}
}
async function kasseBuchungSpeichern(){
  const knopf=document.getElementById("k-speichern");
  const sign=parseInt(document.getElementById("k-typ")?.value)||-1;
  const val=Math.abs(parseFloat(String(document.getElementById("k-betrag")?.value||"").replace(",","."))||0);
  if(!val){toast("Bitte einen Betrag eingeben","err");return;}
  const datum=document.getElementById("k-datum")?.value||isoLokal();
  const kategorie=document.getElementById("k-kat")?.value||"sonstiges";
  const zweck=(document.getElementById("k-zweck")?.value||"").trim()||null;
  const file=document.getElementById("k-beleg")?.files?.[0]||null;
  const edit=window._kasseEdit||null;
  if(knopf)knopf.disabled=true;
  try{
    let beleg=edit?edit.beleg||null:null;
    if(file){ const neu=await kasseBelegHochladen(file); if(beleg)await kasseBelegLoeschen(beleg); beleg=neu; }
    const daten={betrag:sign*val,zweck,datum,kategorie,beleg};
    const r=edit
      ?await fetch(`${SB_URL}/rest/v1/teamkasse?id=eq.${edit.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({...daten,geaendert_am:new Date().toISOString()})})
      :await fetch(`${SB_URL}/rest/v1/teamkasse`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(daten)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Nicht gespeichert – bitte noch einmal versuchen","err");return;}
    toast(edit?"Bewegung geändert ✓":"Bewegung erfasst ✓");
    window._kasseEdit=null;
  }catch(e){ toast((e&&e.message)||"Keine Verbindung – nicht gespeichert","err"); return; }
  finally{ if(knopf)knopf.disabled=false; }
  kasseRender();
}
function kasseBuchungBearbeiten(id){
  const x=((window._kasseDaten||{}).ledger||[]).find(b=>Number(b.id)===Number(id)); if(!x)return;
  window._kasseEdit={id:x.id,beleg:x.beleg||null};
  const set=(i,v)=>{const el=document.getElementById(i);if(el)el.value=v;};
  set("k-typ",Number(x.betrag)<0?"-1":"1"); set("k-betrag",Math.abs(Number(x.betrag)).toFixed(2)); set("k-datum",x.datum||"");
  set("k-kat",x.kategorie||"sonstiges"); set("k-zweck",x.zweck||""); kasseKatHinweis();
  const t=document.getElementById("k-form-titel"); if(t)t.textContent="Bewegung ändern";
  const k=document.getElementById("k-speichern"); if(k)k.textContent="Änderung speichern";
  const a=document.getElementById("k-abbrechen"); if(a)a.style.display="";
  const alt=document.getElementById("k-beleg-alt"); if(alt)alt.textContent=x.beleg?"Ein Beleg ist hinterlegt – ein neuer ersetzt ihn.":"";
  document.getElementById("k-form")?.scrollIntoView({behavior:"smooth",block:"start"});
  document.getElementById("k-betrag")?.focus();
}
function kasseBuchungAbbrechen(){ window._kasseEdit=null; kasseRender(); }
async function kasseDelEntry(id){
  const x=((window._kasseDaten||{}).ledger||[]).find(b=>Number(b.id)===Number(id));
  if(!await frageJaNein({titel:"Bewegung löschen?",text:x?`${kasseDatum(x.datum)} · ${x.zweck||kasseKat(x.kategorie).t} · ${kEur(x.betrag)}${x.beleg?" – der Beleg wird mit gelöscht.":""}`:"",ja:"Löschen",ton:"rot",emoji:"🗑️"}))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse?id=eq.${Number(id)}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;if(!r.ok){toast("Nicht gelöscht","err");return;}}catch(e){toast("Keine Verbindung – nicht gelöscht","err");return;}
  if(x&&x.beleg)await kasseBelegLoeschen(x.beleg);
  if(window._kasseEdit&&Number(window._kasseEdit.id)===Number(id))window._kasseEdit=null;
  kasseRender();
}
/* Übersicht für alle Eltern (lesen): Kassenstand, Einnahmen/Ausgaben, Beiträge mit Stand des
   eigenen Kindes, alle Bewegungen mit Filter, Ausgaben je Kategorie. */
async function mannschaftskasseOpen(){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  document.getElementById("mk-modal")?.remove();
  const m=document.createElement("div"); m.id="mk-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","mk-titel");
  m.style.cssText="position:fixed;inset:0;background:var(--bg);z-index:10002;overflow-y:auto";
  m.innerHTML=`<div style="max-width:560px;margin:0 auto;padding:12px 16px 40px">
    <div style="display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg);padding:8px 0 10px;z-index:1">
      <button type="button" onclick="document.getElementById('mk-modal').remove()" aria-label="Zurück" style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:50%;background:var(--surface);color:var(--text);font-size:var(--s-teil);cursor:pointer">‹</button>
      <h2 id="mk-titel" style="flex:1;margin:0;font-size:var(--s-teil)">💰 Mannschaftskasse</h2>
    </div>
    <div id="mk-body"><div style="text-align:center;padding:24px;color:var(--text2)">Lade …</div></div>
  </div>`;
  document.body.appendChild(m);
  m.querySelector("button")?.focus();
  let summe=null, ledger=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kasse_summary`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(sbCheck401(r))return;if(r.ok)summe=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse?select=id,datum,betrag,zweck,kategorie,beleg&order=datum.desc,id.desc`,{headers:sbAuthHeaders()});if(r.ok)ledger=await r.json();}catch(e){}
  const body=document.getElementById("mk-body"); if(!body)return;
  if(!summe){body.innerHTML=`<div style="color:var(--text2);padding:12px 0">Die Kasse lädt gerade nicht – bitte später noch einmal öffnen.</div>`;return;}
  const sammel=summe.sammel||[], umlagen=summe.umlagen||[];
  const ein=ledger.filter(x=>Number(x.betrag)>=0).reduce((s,x)=>s+Number(x.betrag),0)+sammel.reduce((s,x)=>s+Number(x.summe),0);
  const aus=ledger.filter(x=>Number(x.betrag)<0).reduce((s,x)=>s+Number(x.betrag),0);
  const jeKat={}; ledger.filter(x=>Number(x.betrag)<0).forEach(x=>{jeKat[x.kategorie||"sonstiges"]=(jeKat[x.kategorie||"sonstiges"]||0)+Number(x.betrag);});
  window._mkDaten={ledger,sammel};
  const karte=(inner)=>`<div style="background:var(--surface);border:1px solid var(--rand-bedien);border-radius:14px;padding:14px;margin-bottom:12px">${inner}</div>`;
  const chip=(f,t)=>`<button type="button" class="mk-filter" data-f="${f}" aria-pressed="${f==="alle"}" onclick="mannschaftskasseFilter('${f}')" style="min-height:44px;padding:0 14px;border-radius:22px;border:1.5px solid var(--rand-bedien);background:${f==="alle"?"var(--blue)":"var(--surface)"};color:${f==="alle"?"#fff":"var(--text)"};font-family:inherit;font-size:var(--s-text);font-weight:700;cursor:pointer">${t}</button>`;
  body.innerHTML=
    karte(`<div style="text-align:center">
      <div style="font-size:var(--s-klein);color:var(--text2)">Kassenstand heute</div>
      <div id="mk-saldo" style="font-size:30px;font-weight:900;color:${Number(summe.saldo)<0?"var(--red)":"var(--green)"}">${kEur(summe.saldo)}</div>
      <div style="display:flex;justify-content:center;gap:16px;font-size:var(--s-text);margin-top:4px"><span>Einnahmen <b>+ ${kEur(ein)}</b></span><span>Ausgaben <b>− ${kEur(Math.abs(aus))}</b></span></div>
    </div>`)
   +(umlagen.length?karte(`<div style="font-weight:800;font-size:var(--s-karte);margin-bottom:6px">Beiträge</div>
      ${umlagen.map(u=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--surface2)">
        <div style="flex:1"><div style="font-weight:700;font-size:var(--s-text)">${esc(u.titel)} · ${kEur(u.betrag)}</div>${u.faellig?`<div style="font-size:var(--s-klein);color:var(--text2)">fällig bis ${kasseDatum(u.faellig)}</div>`:""}</div>
        <div class="kz-stand" data-u="${u.id}"></div>
        ${u.paypal_link&&/^https?:\/\//i.test(u.paypal_link)?`<a href="${esc(u.paypal_link)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:10px;background:var(--blue);color:#fff;font-weight:700;text-decoration:none">PayPal</a>`:""}
      </div>`).join("")}`):"")
   +karte(`<div style="font-weight:800;font-size:var(--s-karte);margin-bottom:8px">Alle Bewegungen</div>
      <div role="group" aria-label="Filter" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${chip("alle","Alle")}${chip("aus","Ausgaben")}${chip("ein","Einnahmen")}</div>
      <div id="mk-liste">${kasseListeHtml(ledger,sammel,false)}</div>`)
   +(Object.keys(jeKat).length?karte(`<div style="font-weight:800;font-size:var(--s-karte);margin-bottom:6px">Ausgaben nach Kategorie</div>
      ${Object.keys(jeKat).sort((a,b)=>jeKat[a]-jeKat[b]).map(k=>`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:var(--s-text)"><span>${kasseKat(k).e} ${esc(kasseKat(k).t)}</span><b>− ${kEur(Math.abs(jeKat[k]))}</b></div>`).join("")}`):"")
   +`<div style="font-size:var(--s-klein);color:var(--text2);text-align:center">Die App bewegt kein Geld. Gezahlt wird per PayPal oder bar bei der Kasse – hier steht, was angekommen und ausgegeben ist.</div>`;
  if(typeof elternKasseStandLoad==="function"&&window._elternKids)elternKasseStandLoad(window._elternKids);
}
function mannschaftskasseFilter(f){
  document.querySelectorAll("#mk-modal .mk-filter").forEach(b=>{const an=b.dataset.f===f;b.setAttribute("aria-pressed",String(an));b.style.background=an?"var(--blue)":"var(--surface)";b.style.color=an?"#fff":"var(--text)";});
  const d=window._mkDaten||{}; const el=document.getElementById("mk-liste"); if(el)el.innerHTML=kasseListeHtml(d.ledger,d.sammel,false,f);
}
/* Nur Trainer: wer die Kasse führt. Auswahl aus den verknüpften Elternkonten. */
async function kasseRolleRender(){
  const slot=document.getElementById("kasse-rolle-slot"); if(!slot)return;
  // Übergeben kann nur das Trainerteam (Trainer-App); die Kasse selbst sieht den Abschnitt nicht.
  if(!/\/trainer\//.test(location.pathname)){slot.innerHTML="";return;}
  let team=[],ek=[],kader=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kasse_team?select=email`,{headers:sbAuthHeaders()});if(r.ok)team=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?select=email,spieler_id`,{headers:sbAuthHeaders()});if(r.ok)ek=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kader?select=id,name`,{headers:sbAuthHeaders()});if(r.ok)kader=await r.json();}catch(e){}
  const kname={};kader.forEach(k=>kname[k.id]=k.name);
  const wer=email=>{const ks=ek.filter(x=>(x.email||"").toLowerCase()===email).map(x=>kname[x.spieler_id]).filter(Boolean);return ks.length?"Elternteil von "+ks.join(", "):"";};
  const emails=[...new Set(ek.map(x=>(x.email||"").toLowerCase()).filter(Boolean))].filter(e=>!team.some(t=>t.email===e)).sort((a,b)=>wer(a).localeCompare(wer(b),"de"));
  slot.innerHTML=`<div style="font-size:var(--s-klein);font-weight:700;text-transform:uppercase;color:var(--text2);margin:16px 0 6px">Wer führt die Kasse</div>
    ${team.length?team.map(t=>`<div style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);padding:5px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1">${esc(wer(t.email)||t.email)} <span style="color:var(--text3);font-size:var(--s-klein)">${esc(t.email)}</span></span>
      <button type="button" class="btn btn-sm" onclick="kasseRolleEntfernen('${jsq(t.email)}')">Entfernen</button></div>`).join("")
      :'<div style="font-size:var(--s-text);color:var(--text3)">Nur das Trainerteam. Ein Elternteil kann die Kasse übernehmen – es sieht sie dann im Eltern-Bereich unter „Mehr vom Team“.</div>'}
    ${emails.length?`<div style="display:flex;gap:6px;margin-top:8px">
      <select id="kasse-rolle-neu" aria-label="Elternteil für die Kasse" style="flex:1;min-height:44px;padding:6px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)">
        ${emails.map(e=>`<option value="${esc(e)}">${esc(wer(e))} · ${esc(e)}</option>`).join("")}</select>
      <button type="button" class="btn btn-sm" style="min-height:44px" onclick="kasseRolleSetzen()">Kasse übergeben</button></div>`:""}`;
}
async function kasseRolleSetzen(){
  const email=(document.getElementById("kasse-rolle-neu")?.value||"").toLowerCase(); if(!email)return;
  try{const r=await fetch(`${SB_URL}/rest/v1/kasse_team`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({email})});if(sbCheck401(r))return;if(!r.ok){toast("Nicht gespeichert","err");return;}}catch(e){toast("Keine Verbindung","err");return;}
  toast("Kasse übergeben ✓");kasseRolleRender();
}
async function kasseRolleEntfernen(email){
  if(!await frageJaNein({titel:"Kasse abgeben?",text:email+" kann die Kasse danach nicht mehr pflegen.",ja:"Entfernen",ton:"rot",emoji:"💰"}))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/kasse_team?email=eq.${encodeURIComponent(email)}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  kasseRolleRender();
}
/* Eltern-Bereich: „Kasse verwalten“ nur für die Kasse; Stand je eigenes Kind in der Teamkasse-Karte. */
async function elternKasseRolleLoad(){
  const slot=document.getElementById("kasse-verwalten-slot"); if(!slot)return;
  let ist=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/is_kasse`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)ist=(await r.json())===true;}catch(e){}
  // v699: eigene Kachel „Kasse führen“ direkt unter „Mannschaftskasse“ – nur für die Kasse
  slot.innerHTML=ist?`<button type="button" id="kasse-fuehren-kachel" onclick="kasseOpen()" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:8px;border:none;border-radius:14px;background:linear-gradient(135deg,#1e3a8a,#0f766e);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.12)">
      <span aria-hidden="true" style="font-size:28px">🧾</span><span style="flex:1"><span style="display:block;font-weight:800;font-size:var(--s-karte)">Kasse führen</span><span style="display:block;font-size:var(--s-klein);opacity:.9">Bewegungen erfassen, Belege, Beiträge abhaken</span></span><span aria-hidden="true" style="font-size:var(--s-seite)">›</span></button>`:"";
}
async function elternKasseStandLoad(kids){
  const els=[...document.querySelectorAll(".kz-stand[data-u]")]; if(!els.length||!kids||!kids.length)return;
  let z=[]; try{const r=await fetch(`${SB_URL}/rest/v1/kasse_zahlung?select=umlage_id,spieler_id,bezahlt_am`,{headers:sbAuthHeaders()});if(r.ok)z=await r.json();}catch(e){return;}
  const viele=kids.length>1;
  els.forEach(el=>{const u=Number(el.dataset.u);
    el.innerHTML=kids.map(k=>{const b=z.find(x=>x.umlage_id===u&&x.spieler_id===k.spieler_id);
      return `<div style="font-size:var(--s-klein);font-weight:700;color:${b?'#14532d':'#92400e'}">${viele?esc((k.kader&&k.kader.name)||k.name||"")+": ":""}${b?"✓ bezahlt":"offen"}</div>`;}).join("");});
}
