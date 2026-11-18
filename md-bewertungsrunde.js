/* v850 · Bewertungsrunde „Kriterium für Kriterium“ (Charles 17.11.2026).

   Bis hierher ging die Runde nur Kind für Kind: je Kind eine Seite von elf Bildschirmhöhen, bei
   14 Kindern 248 Entscheidungen, Speichern ganz unten – und die Hilfe empfahl das Gegenteil
   („Kriterium für Kriterium über alle Kinder nachdenken, sonst färbt der Gesamteindruck alle
   Einzelwerte“). Jetzt: ein Kriterium mit seinen vier Stufen oben, darunter alle Kinder als Zeilen.
   Das Trainerteam bewertet gemeinsam an einem Gerät („Bewertet von: Trainerteam“).

   · Jeder Tipp wird sofort am Gerät zwischengespeichert (localStorage, nur dieses Gerät) –
     Sperren, Neuladen oder „Später weiter“ kosten nichts. Nach dem Speichern wird der Entwurf gelöscht.
   · Torwart-Kriterien erscheinen nur für Kinder mit Torwart-Haken.
   · Vor dem Abschluss ein Schritt „Fürs Elterngespräch“ (freiwillig, Beobachtung statt Urteil).
   · Gespeichert wird je Kind dieselbe Zeile wie bei „Kind für Kind“ (bewZeileBauen in core.js),
     alle Kinder in einem Aufruf.
   Kinder sehen nie Zahlen; hier stehen auch für Trainer keine Prozentwerte. */
const BKR_KEY="adler_bew_runde_entwurf";
const BKR_STUFEN=[[1,"Ansatz"],[2,"Solide"],[3,"Gut"],[4,"Stark"],[0,"Nicht gesehen"]];
let BKR=null;   // {datum, werte:{name:{kriterium:0..4}}, eltern:{name:{satz,haken}}, idx}

function bkrKriterien(){
  const out=[];
  DIMS_FELD.forEach(d=>d.tier.forEach(t=>out.push({n:t.n,l:t.l,h:t.h,opts:t.opts,tw:false,dim:d.label})));
  if(bkrKinder(true).length)DIMS_TW.forEach(d=>d.tier.forEach(t=>out.push({n:t.n,l:t.l,h:t.h,opts:t.opts,tw:true,dim:d.label})));
  return out;
}
function bkrKinder(nurTw){ return (typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false&&(!nurTw||k.tw)).map(k=>k.name); }
function bkrSchritte(){ return [...bkrKriterien().map(k=>({art:"kriterium",k})),{art:"eltern"},{art:"abschluss"}]; }
function bkrEntwurfLesen(){ try{const o=JSON.parse(localStorage.getItem(BKR_KEY)||"null");return o&&o.werte?o:null;}catch(e){return null;} }
function bkrMerken(){ try{localStorage.setItem(BKR_KEY,JSON.stringify(BKR));}catch(e){} }
function bkrVergessen(){ try{localStorage.removeItem(BKR_KEY);}catch(e){} }
/* Wie viele Kriterien fehlen diesem Kind noch? */
function bkrOffen(name){
  const tw=!!(getKader(name)||{}).tw, w=(BKR&&BKR.werte[name])||{};
  return bkrKriterien().filter(k=>(!k.tw||tw)&&w[k.n]==null).length;
}
/* Für die Startleiste: ein Satz zur angefangenen Runde oder null. */
function bkrEntwurfInfo(){
  const e=bkrEntwurfLesen(); if(!e)return null;
  const n=Object.values(e.werte||{}).reduce((a,w)=>a+Object.keys(w||{}).length,0);
  if(!n)return null;
  return `Angefangene Runde vom ${new Date(e.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}: ${n} Werte auf diesem Gerät gemerkt.`;
}

function bkrOeffnen(){
  if(typeof bewFreigegeben==="function"&&!bewFreigegeben()){toast("Bewerten ist noch gesperrt – erst das Startdatum setzen","err");return;}
  if(!bkrKinder().length){toast("Kein Kader geladen","err");return;}
  const e=bkrEntwurfLesen();
  BKR=e||{datum:(typeof bewHeute==="function"?bewHeute():isoLokal()),werte:{},eltern:{},idx:0};
  BKR.werte=BKR.werte||{}; BKR.eltern=BKR.eltern||{}; BKR.idx=Math.max(0,Math.min(bkrSchritte().length-1,Number(BKR.idx)||0));
  document.getElementById("bkr-modal")?.remove();
  const m=document.createElement("div"); m.id="bkr-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Bewertungsrunde Kriterium für Kriterium");
  m.style.cssText="position:fixed;inset:0;z-index:10040;background:var(--bg,#eef3fb);display:flex;flex-direction:column";
  m.innerHTML=`<div id="bkr-kopf" style="flex:none;display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border-bottom:1px solid var(--rand-bedien)"></div>
    <div id="bkr-inhalt" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 14px 20px"></div>
    <div id="bkr-fuss" style="flex:none;display:flex;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:var(--surface);border-top:1px solid var(--rand-bedien)"></div>`;
  document.body.appendChild(m);
  bkrRender();
}
function bkrSchliessen(){
  bkrMerken(); document.getElementById("bkr-modal")?.remove();
  if(typeof bewRundeBarRender==="function")bewRundeBarRender();
}
function bkrGeh(delta){
  const n=bkrSchritte().length;
  BKR.idx=Math.max(0,Math.min(n-1,BKR.idx+delta)); bkrMerken(); bkrRender();
  const box=document.getElementById("bkr-inhalt"); if(box)box.scrollTop=0;
}
async function bkrNeu(){
  if(typeof frageJaNein==="function"&&!await frageJaNein({emoji:"🗑️",ton:"rot",titel:"Runde verwerfen?",text:"Alle Werte, die auf diesem Gerät gemerkt sind, werden gelöscht. Schon gespeicherte Bewertungen bleiben.",ja:"Verwerfen",nein:"Behalten"}))return;
  bkrVergessen(); BKR={datum:(typeof bewHeute==="function"?bewHeute():isoLokal()),werte:{},eltern:{},idx:0}; bkrRender();
}

function bkrRender(){
  const kopf=document.getElementById("bkr-kopf"), box=document.getElementById("bkr-inhalt"), fuss=document.getElementById("bkr-fuss");
  if(!kopf||!box||!fuss||!BKR)return;
  const schritte=bkrSchritte(), s=schritte[BKR.idx], nk=schritte.length-2;
  const wo=s.art==="kriterium"?`Kriterium ${BKR.idx+1} von ${nk}`:s.art==="eltern"?"Fürs Elterngespräch":"Abschluss";
  kopf.innerHTML=`<div style="flex:1;min-width:0"><div style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">Bewertungsrunde · ${wo}</div>
      <div role="progressbar" aria-valuemin="0" aria-valuemax="${schritte.length}" aria-valuenow="${BKR.idx+1}" aria-label="Fortschritt der Runde" style="height:6px;border-radius:3px;background:var(--surface2);margin-top:5px;overflow:hidden"><div style="height:100%;width:${Math.round((BKR.idx+1)/schritte.length*100)}%;background:#1e3a8a"></div></div></div>
    <button class="btn" id="bkr-spaeter" onclick="bkrSchliessen()" style="min-height:44px;flex:none">Später weiter</button>`;
  if(s.art==="kriterium")box.innerHTML=bkrKriteriumHtml(s.k);
  else if(s.art==="eltern")box.innerHTML=bkrElternHtml();
  else box.innerHTML=bkrAbschlussHtml();
  const letzter=BKR.idx===schritte.length-1;
  fuss.innerHTML=`<button class="btn" onclick="bkrGeh(-1)" ${BKR.idx===0?"disabled":""} style="min-height:56px;flex:none;min-width:96px">Zurück</button>`+
    (letzter?`<button id="bkr-speichern" onclick="bkrSpeichern(this)" style="flex:1;min-height:56px;border:none;border-radius:12px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">${bkrSpeicherText()}</button>`
      :`<button id="bkr-weiter" onclick="bkrGeh(1)" style="flex:1;min-height:56px;border:none;border-radius:12px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:var(--s-karte);font-weight:800;cursor:pointer">${bkrWeiterText(s)}</button>`);
}
function bkrWeiterText(s){
  if(s.art!=="kriterium")return "Weiter";
  const kinder=bkrKinder(s.k.tw), offen=kinder.filter(n=>((BKR.werte[n]||{})[s.k.n])==null).length;
  return offen?`Weiter · ${offen} offen`:"Weiter";
}
/* v851: vollständig UND mindestens die Hälfte der Feld-Kriterien gesehen (bewGesehen in views.js). */
function bkrZuWenig(name){ const g=(typeof bewGesehen==="function")?bewGesehen(BKR.werte[name]||{}):{genug:true}; return g.genug?null:g; }
function bkrSpeicherbar(name){ return bkrOffen(name)===0&&!bkrZuWenig(name); }
function bkrSpeicherText(){
  const fertig=bkrKinder().filter(bkrSpeicherbar).length;
  return fertig?`Bewertungen speichern · ${fertig} ${fertig===1?"Kind":"Kinder"}`:"Noch kein Kind vollständig";
}

/* ── Ein Kriterium, alle Kinder ── */
function bkrKnopfStil(an){
  return `flex:1;min-width:0;min-height:48px;padding:4px 2px;border-radius:10px;font-family:inherit;font-size:var(--s-klein);font-weight:${an?800:600};line-height:1.15;cursor:pointer;`+
    (an?"border:2px solid #1e3a8a;background:#1e3a8a;color:#fff":"border:1px solid var(--rand-bedien);background:var(--surface);color:var(--text)");
}
function bkrZeileHtml(name,krit){
  const w=(BKR.werte[name]||{})[krit];
  return `<div class="bkr-zeile" data-kind="${esc(name)}" style="padding:10px 0;border-top:1px solid var(--rand-bedien)">
    <div style="font-size:var(--s-karte);font-weight:800;margin-bottom:6px">${esc(name)}${w==null?"":` <span style="font-size:var(--s-klein);font-weight:600;color:var(--text2)">· ${BKR_STUFEN.find(x=>x[0]===w)[1]}</span>`}</div>
    <div role="group" aria-label="${esc(name)}" style="display:flex;gap:5px">${BKR_STUFEN.map(([v,l])=>
      `<button type="button" data-wert="${v}" aria-pressed="${w===v}" onclick="bkrSetze(this,'${krit}',${v})" style="${bkrKnopfStil(w===v)}">${w===v?"✓ ":""}${l}</button>`).join("")}</div>
  </div>`;
}
function bkrKriteriumHtml(k){
  const kinder=bkrKinder(k.tw);
  return `<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">${k.tw?"🥅 Nur die Torhüter · ":""}${esc(k.dim)}</div>
    <h2 id="bkr-titel" style="font-size:var(--s-teil);font-weight:800;margin:2px 0 2px;line-height:1.2">${esc(k.l)}</h2>
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:10px">${esc(k.h)}</div>
    <details open style="border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface);padding:0 12px;margin-bottom:6px">
      <summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;font-size:var(--s-text);font-weight:800">Woran erkennt man die Stufen?</summary>
      <div style="padding-bottom:10px">${k.opts.map(o=>`<div style="font-size:var(--s-text);line-height:1.35;margin-bottom:5px"><b>${BKR_STUFEN.find(x=>x[0]===o.v)[1]}:</b> ${esc(o.t)} – ${esc(o.d)}</div>`).join("")}
        <div style="font-size:var(--s-klein);color:var(--text2)">Solide heißt altersgerecht. „Nicht gesehen“ zählt nicht mit – lieber das als raten.</div></div>
    </details>
    <div id="bkr-zeilen">${kinder.map(n=>bkrZeileHtml(n,k.n)).join("")}</div>`;
}
function bkrSetze(btn,krit,wert){
  const zeile=btn.closest(".bkr-zeile"), name=zeile&&zeile.dataset.kind; if(!name||!BKR)return;
  const w=BKR.werte[name]=BKR.werte[name]||{};
  if(w[krit]===wert)delete w[krit]; else w[krit]=wert;   // noch einmal tippen nimmt den Wert zurück
  bkrMerken();
  /* Nur diese Zeile neu zeichnen – die Liste darf beim Tippen nicht springen. */
  const neu=document.createElement("div"); neu.innerHTML=bkrZeileHtml(name,krit);
  zeile.replaceWith(neu.firstElementChild);
  const s=bkrSchritte()[BKR.idx], knopf=document.getElementById("bkr-weiter"); if(knopf)knopf.textContent=bkrWeiterText(s);
  const neuBtn=document.querySelector(`.bkr-zeile[data-kind="${(window.CSS&&CSS.escape)?CSS.escape(name):name}"] button[data-wert="${wert}"]`); if(neuBtn)neuBtn.focus({preventScroll:true});
}

/* ── Fürs Elterngespräch ── */
function bkrElternHtml(){
  return `<h2 style="font-size:var(--s-teil);font-weight:800;margin:0 0 4px">Fürs Elterngespräch</h2>
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:10px">Freiwillig. Was am Platz zu sehen war – Beobachtung statt Urteil. Es fließt in keine Zahl ein und steht in keinem Bericht für Eltern; nur das Trainerteam sieht es. Bitte keine Namen anderer Kinder.</div>
    ${bkrKinder().map((n,i)=>{
      const e=BKR.eltern[n]||{satz:"",haken:[]}, da=!!(e.satz||(e.haken||[]).length);
      return `<details class="bkr-eltern" data-kind="${esc(n)}"${da?" open":""} style="border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface);padding:0 12px;margin-bottom:8px">
        <summary style="min-height:48px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--s-karte);font-weight:800"><span style="flex:1">${esc(n)}</span><span class="bkr-eltern-marke" style="font-size:var(--s-klein);font-weight:700;color:var(--text2)">${da?"notiert":""}</span></summary>
        <div style="padding-bottom:10px">${bewElternHakenHtml("bkre"+i,e.haken,"bkrElternSync(this)")}
          <textarea rows="2" maxlength="240" aria-label="Was wollen wir mit der Familie von ${esc(n)} besprechen?" placeholder="Was wollen wir mit der Familie besprechen?" oninput="bkrElternSync(this)" style="width:100%;margin-top:4px;resize:none;padding:10px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text);min-height:48px">${esc(e.satz||"")}</textarea></div>
      </details>`;}).join("")}`;
}
function bkrElternSync(el){
  const d=el.closest(".bkr-eltern"), name=d&&d.dataset.kind; if(!name||!BKR)return;
  const e={satz:(d.querySelector("textarea")||{}).value||"",haken:[...d.querySelectorAll("input:checked")].map(c=>c.dataset.haken)};
  if(e.satz.trim()||e.haken.length)BKR.eltern[name]=e; else delete BKR.eltern[name];
  const m=d.querySelector(".bkr-eltern-marke"); if(m)m.textContent=BKR.eltern[name]?"notiert":"";
  bkrMerken();
}

/* ── Abschluss ── */
function bkrAbschlussHtml(){
  const kinder=bkrKinder(), offen=kinder.map(n=>[n,bkrOffen(n)]), fehlt=offen.filter(x=>x[1]>0);
  return `<h2 style="font-size:var(--s-teil);font-weight:800;margin:0 0 4px">Abschluss</h2>
    <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:10px">Gespeichert wird als „Trainerteam“ mit dem Datum ${new Date(BKR.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}. Die Werte sind eine Momentaufnahme, keine Prognose – Kinder sehen nie Zahlen.</div>
    <div id="bkr-stand" style="border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface);padding:4px 12px;margin-bottom:10px">${offen.map(([n,o])=>
      `<div style="display:flex;gap:8px;align-items:center;min-height:40px;border-top:1px solid var(--surface2);font-size:var(--s-text)"><span style="flex:1;font-weight:700">${esc(n)}</span><span style="color:var(--text2);text-align:right">${o?`${o} offen – wird nicht gespeichert`:bkrZuWenig(n)?`nur ${bkrZuWenig(n).gesehen} von ${bkrZuWenig(n).von} gesehen – wird nicht gespeichert`:"✓ vollständig"}</span></div>`).join("")}</div>
    ${fehlt.length?`<button class="btn" id="bkr-ng" onclick="bkrOffeneNichtGesehen()" style="width:100%;min-height:48px;margin-bottom:8px">Alle offenen als „Nicht gesehen“ eintragen</button>
      <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:10px">Oder mit „Zurück“ zu den Kriterien: auf dem Weiter-Knopf steht, wo noch etwas offen ist. Unvollständige Kinder bleiben auf diesem Gerät gemerkt.</div>`:""}
    ${kinder.some(n=>bkrOffen(n)===0&&bkrZuWenig(n))?`<div id="bkr-zuwenig" style="font-size:var(--s-klein);color:var(--text2);margin-bottom:10px">Für ein Profil muss mindestens die Hälfte der Feld-Kriterien gesehen sein. Diese Kinder bleiben auf dem Gerät gemerkt – in der nächsten Runde oder nach ein paar Trainings nachtragen.</div>`:""}
    <button class="btn" onclick="bkrNeu()" style="width:100%;min-height:44px;color:var(--red)">Runde verwerfen</button>
    <div id="bkr-status" role="status" aria-live="polite" style="font-size:var(--s-text);margin-top:10px"></div>`;
}
function bkrOffeneNichtGesehen(){
  const krit=bkrKriterien();
  bkrKinder().forEach(n=>{const tw=!!(getKader(n)||{}).tw, w=BKR.werte[n]=BKR.werte[n]||{}; krit.forEach(k=>{if((!k.tw||tw)&&w[k.n]==null)w[k.n]=0;});});
  bkrMerken(); bkrRender();
}
async function bkrSpeichern(btn){
  if(typeof bewFreigegeben==="function"&&!bewFreigegeben()){toast("Bewerten ist noch gesperrt","err");return;}
  const status=document.getElementById("bkr-status"), sag=(t,rot)=>{if(status){status.textContent=t;status.style.color=rot?"var(--red)":"var(--text)";}};
  const fertig=bkrKinder().filter(bkrSpeicherbar);
  if(!fertig.length){sag("Noch kein Kind ist vollständig bewertet.",true);return;}
  const krit=bkrKriterien();
  const zeilen=fertig.map(name=>{
    const k=getKader(name)||{}, tw=!!k.tw, v={};
    krit.forEach(c=>{if(!c.tw||tw)v[c.n]=BKR.werte[name][c.n];});
    const letzter=(typeof DB!=="undefined"&&DB[name]&&DB[name].length)?DB[name][DB[name].length-1]:{};
    const meta={name,trainer:"Trainerteam",date:BKR.datum,foot:k.starker_fuss||letzter.strong_foot||"R",age:(typeof bewAlter==="function"&&bewAlter(k,BKR.datum))||letzter.age||"8",
      grp:"flex",eltern:bewElternText(BKR.eltern[name]),att:String(letzter.attendance||"2"),notes:"",tw};
    return bewZeileBauen(meta,v).row;
  });
  if(btn)btn.disabled=true; sag("Speichere …");
  try{
    const res=await fetch(`${SB_URL}/rest/v1/spielerprofile?on_conflict=name,datum`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal,resolution=merge-duplicates'}),body:JSON.stringify(zeilen)});
    if(sbCheck401(res)){sag("Anmeldung abgelaufen – bitte neu anmelden. Die Werte bleiben auf diesem Gerät gemerkt.",true);return;}
    if(!res.ok){sag(`Nicht gespeichert (Fehler ${res.status}). Die Werte bleiben auf diesem Gerät gemerkt – bitte noch einmal versuchen.`,true);return;}
    fertig.forEach(n=>{delete BKR.werte[n];delete BKR.eltern[n];});
    const rest=Object.keys(BKR.werte).filter(n=>Object.keys(BKR.werte[n]||{}).length);
    if(rest.length){ bkrMerken(); } else { bkrVergessen(); }
    try{navigator.vibrate&&navigator.vibrate([40,60,120]);}catch(e){}
    if(typeof loadDB==="function")await loadDB();
    if(rest.length){ toast(`${fertig.length} ${fertig.length===1?"Kind":"Kinder"} gespeichert – ${rest.length} noch offen`); bkrRender(); }
    else{ document.getElementById("bkr-modal")?.remove(); BKR=null; toast(`✅ Bewertungsrunde gespeichert – ${fertig.length} ${fertig.length===1?"Kind":"Kinder"}`); }
    if(typeof bewRundeBarRender==="function")bewRundeBarRender();
  }catch(e){ sag("Kein Netz – nichts gespeichert. Die Werte bleiben auf diesem Gerät gemerkt.",true); }
  finally{ if(btn)btn.disabled=false; }
}
function bewertungsrundeModulDa(){ return true; }
