/* ═══════════════════════════════════
   TAKTIK-BOARD (Freies Drag & Drop)
═══════════════════════════════════ */
/* FORMATIONS: single source of truth für Spielformen der U9.
   x/y sind RELATIV (Prozent 0–100) -> skaliert automatisch mit der Feldgröße.
   tw:false = ohne Torwart (Funino). rk = Rollen-Schlüssel für Algorithmen/Rating.
   Steuert sowohl das Taktikboard als auch (später) die Matchday-Drop-Zonen. */
let tbFormation='4+1'; // aktuell gewählte Spielform des Boards (später aus termin.spielform)

let tbField=[];
let tbBench=[];
let tbBall={x:50,y:50};

/* v641: Die Bilder (v558), der Pro-Modus, „Teilen“ und die Bibliothek des alten Bretts sind
   entfallen – all das kann die gemeinsame Zeichenfläche (Spielsituationen, md-skizze.js):
   mehrere Bilder mit Abspielen, Großansicht im Vollbild mit „Kinder einsetzen“, Teilen als Bild.
   Das Brett selbst bleibt für das Taktik-Quiz der Kinder (?quiz), das auf #taktik-field in
   Prozent-Koordinaten rechnet. */
function taktikSetup(mode){
  const names=kaderNamen();   // v510: nur Kinder, die noch dabei sind
  if(mode==="leer"){
    tbField=[];tbBench=[...names];tbBall={x:50,y:50};
    taktikRender();
    return;
  }
  const form=FORMATIONS[tbFormation]||FORMATIONS['4+1'];
  const slots=form.slots;
  const twName=form.tw?(kaderAktiv().find(k=>k.twPrio===1)?.name||null):null;
  tbField=[];tbBench=[];
  let assign=[];
  // Nur 4+1 hat den passenden Rollen-Kombinator (aufpasser/flitzer/jäger) – siehe FORMATIONS.
  if(tbFormation==='4+1'){
    const combo=calcBestCombos(verfuegbareSpieler()); // nie abgesagte Spieler aufs Feld stellen
    if(combo&&combo[0]){
      const b=combo[0];
      assign=[b.tw?.name||twName, b.aufpasser.name, b.flitzer_l.name, b.flitzer_r.name, b.jaeger.name];
    }
  }
  if(!assign.length){
    // Generische Befüllung (Funino/5+1 oder 4+1-Fallback): TW zuerst, dann Feldspieler der Reihe nach.
    const rest=names.filter(n=>n!==twName);
    let fi=0;
    assign=slots.map((s,i)=>{
      if(i===0&&form.tw)return twName;
      return rest[fi++]||null;
    });
  }
  slots.forEach((s,i)=>{
    if(assign[i]) tbField.push({name:assign[i],x:s.x,y:s.y,cls:s.cls,role:s.role});
  });
  const used=new Set(tbField.map(f=>f.name));
  tbBench=names.filter(n=>!used.has(n));
  tbBall={x:50,y:50};
  taktikRender();
}
function taktikSetFormation(f,btn){
  if(!FORMATIONS[f])return;
  tbFormation=f;
  document.querySelectorAll('.tb-form-btn').forEach(b=>b.classList.remove('btn-p'));
  if(btn)btn.classList.add('btn-p');
  else document.querySelector('.tb-form-btn[data-form="'+f+'"]')?.classList.add('btn-p');
  taktikSetup('auto');
}
function taktikInit(){ if(document.body.classList.contains("quiz-extern"))taktikSetup("auto"); else sitHubRender(); }
function taktikReset(mode){taktikSetup(mode);}
/* ═══ v640 – SPIELSITUATIONEN AUF DER GEMEINSAMEN ZEICHENFLÄCHE ═══
   PO 27.09.: „Das aktuelle Taktikboard unterscheidet sich von der eigenen Übung unter
   Training. Sollten wir das vereinheitlichen?" – Antwort: eine Zeichenfläche. Genutzt wird
   das Board zum Erklären von Situationen und für das Taktik-Quiz der Kinder, sonst kaum.

   Die Seite zeigt die Spielsituationen, gebaut auf dem Skizzen-Editor – dieselbe Fläche,
   dieselbe KI, dieselbe Großansicht mit Abspielen, Vollbild und „Kinder einsetzen“ und
   dasselbe Teilen wie bei den Übungen. Seit v641 ist das der einzige Weg im Trainerbereich;
   das alte Brett sieht nur noch das Quiz (?quiz), weil es mit #taktik-field in
   Prozent-Koordinaten rechnet.

   Gespeichert wird in taktik_templates (Trainer-RLS, schon in der Sicherung) mit
   formation „Spielsituation“ und data {typ:"skizze", spec}. Kindernamen stehen dort nie:
   Die Vorlagen tragen Rollen (TW, A, FL, FR, J), die KI bekommt „Kind n“. */
const SIT_FORMATION="Spielsituation";
const SIT_KURZ={TW:"TW",Aufpasser:"A","Flitzer L":"FL","Flitzer R":"FR","Jäger":"J","Abwehr L":"AL","Abwehr R":"AR"};
let _sitListe=[];

/* Ganzes Feld hochkant (180 × 280): wir spielen nach oben, unser Tor steht unten – wie im
   alten Brett und im Quiz. Maße wie die halben Felder der Skizzen-Vorlagen (v579). */
function sitFeld(form){
  const funino=form==="funino";
  const spec={hoch:true, z:[[18,24,144,232]], li:[[18,140,162,140,"m"]],
    h:[[18,24,"y"],[162,24,"y"],[18,256,"y"],[162,256,"y"]]};
  if(funino){
    spec.tor=[[46,16,"h",28],[106,16,"h",28],[46,256,"h",28],[106,256,"h",28]];
    spec.li.push([18,92,162,92,"sz"],[18,188,162,188,"sz"]);
  }else{
    spec.tor=[[68,14,"h",44,"j"],[68,256,"h",44,"j"]];
  }
  return spec;
}
function sitVorlage(form){
  const spec=sitFeld(form);
  const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[form])||null;
  spec.s=f?f.slots.map(sl=>[Math.round(18+sl.x*1.44),Math.round(24+sl.y*2.32),sl.role==="TW"?"b":"g",SIT_KURZ[sl.role]||""]):[];
  spec.b=[[90,146]];
  return spec;
}
function sitNeu(form){
  if(typeof skzEditorOpen!=="function"){ toast("Die Zeichenfläche lädt noch – gleich nochmal","info"); return; }
  const label=(form&&typeof FORMATIONS!=="undefined"&&FORMATIONS[form])?FORMATIONS[form].label:"Freie Situation";
  skzEditorOpen(form?sitVorlage(form):sitFeld("4+1"), spec=>sitErfassen(spec,label), {titel:"Spielsituation"});
}
function _sitName(vorschlag){
  const n=(typeof prompt==="function")?prompt("Name der Spielsituation:",vorschlag):vorschlag;
  if(n===null)return vorschlag;
  return String(n).trim().slice(0,80)||vorschlag;
}
async function sitErfassen(spec,label){
  if(!spec){ toast("Die Zeichnung ist leer – nichts erfasst","info"); return; }
  const heute=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const name=_sitName((label||"Situation")+" · "+heute);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates`,{method:"POST",
      headers:Object.assign({},sbAuthHeaders(),{Prefer:"return=representation"}),
      body:JSON.stringify({name,formation:SIT_FORMATION,data:{typ:"skizze",spec}})});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok)throw new Error("HTTP "+r.status);
    toast("Spielsituation erfasst ✓");
  }catch(e){
    /* Die Zeichnung darf am Netz nicht verloren gehen: der Editor öffnet sich wieder mit ihr,
       „Übernehmen“ versucht es erneut. */
    toast("Nicht erfasst – ohne Netz geht das Speichern nicht. Die Zeichnung bleibt offen.","err");
    if(typeof skzEditorOpen==="function")skzEditorOpen(spec, s=>sitErfassen(s,label), {titel:"Spielsituation"});
    return;
  }
  sitListeLaden();
}
async function sitListeLaden(){
  const box=document.getElementById("sit-liste"); if(!box)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?formation=eq.${encodeURIComponent(SIT_FORMATION)}&select=id,name,data,created_at&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    _sitListe=r.ok?((await r.json())||[]).filter(t=>t&&t.data&&t.data.spec):[];
  }catch(e){ _sitListe=null; }
  sitListeZeichnen();
}
function sitListeZeichnen(){
  const box=document.getElementById("sit-liste"); if(!box)return;
  if(_sitListe===null){ box.innerHTML='<div class="sit-leer">Ohne Netz sind die gespeicherten Situationen nicht erreichbar.</div>'; return; }
  if(!_sitListe.length){ box.innerHTML='<div class="sit-leer">Noch keine Situation erfasst. Beschreib eine oben oder wähle eine Spielform.</div>'; return; }
  box.innerHTML=_sitListe.map(t=>{
    let bild=""; try{ bild=(typeof _skz==="function")?_skz(t.data.spec):""; }catch(e){}
    const bilder=1+((t.data.spec.schritte||[]).length);
    return `<div class="sit-eintrag" data-id="${Number(t.id)}">
      <button type="button" class="sit-bild" onclick="sitGross(${Number(t.id)})" aria-label="${esc(t.name)} groß zeigen">${bild}</button>
      <div class="sit-name">${esc(t.name)}</div>
      <div class="sit-meta">${bilder>1?bilder+" Bilder · ":""}${new Date(t.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>
      <div class="sit-knoepfe">
        <button type="button" class="btn btn-sm" onclick="sitGross(${Number(t.id)})"><i class="ti ti-maximize"></i>${bilder>1?"Abspielen":"Groß zeigen"}</button>
        <button type="button" class="btn btn-sm" onclick="sitBearbeiten(${Number(t.id)})"><i class="ti ti-pencil"></i>Bearbeiten</button>
        <button type="button" class="btn btn-sm" onclick="sitUmbenennen(${Number(t.id)})"><i class="ti ti-cursor-text"></i>Umbenennen</button>
        <button type="button" class="btn btn-sm" onclick="sitLoeschen(${Number(t.id)})" aria-label="${esc(t.name)} löschen"><i class="ti ti-trash"></i>Löschen</button>
      </div>
      ${typeof skzTeilenKnopf==="function"?skzTeilenKnopf(t.name):""}
    </div>`;
  }).join("");
}
function _sitEintrag(id){ return (_sitListe||[]).find(t=>Number(t.id)===Number(id))||null; }
function sitGross(id){
  const t=_sitEintrag(id); if(!t||typeof skzGrossZeigen!=="function")return;
  let svg=""; try{ svg=_skz(t.data.spec); }catch(e){}
  skzGrossZeigen(t.data.spec,svg,t.name);
}
async function _sitPatch(id,patch,ok){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${Number(id)}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify(patch)});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok)throw new Error("HTTP "+r.status);
    toast(ok);
  }catch(e){ toast("Nicht gespeichert – bitte mit Netz nochmal","err"); }
  sitListeLaden();
}
function sitBearbeiten(id){
  const t=_sitEintrag(id); if(!t||typeof skzEditorOpen!=="function")return;
  skzEditorOpen(t.data.spec, spec=>{
    if(!spec){ toast("Die Zeichnung ist leer – zum Entfernen „Löschen“ nehmen","info"); return; }
    _sitPatch(id,{data:Object.assign({},t.data,{typ:"skizze",spec})},"Spielsituation geändert ✓");
  }, {titel:"Spielsituation"});
}
function sitUmbenennen(id){
  const t=_sitEintrag(id); if(!t)return;
  const n=prompt("Neuer Name:",t.name); if(n===null)return;
  const name=String(n).trim().slice(0,80); if(!name||name===t.name)return;
  _sitPatch(id,{name},"Umbenannt ✓");
}
async function sitLoeschen(id){
  const t=_sitEintrag(id); if(!t)return;
  if(!confirm("„"+t.name+"“ löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${Number(id)}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    if(!r.ok)throw new Error("HTTP "+r.status);
    toast("Gelöscht");
  }catch(e){ toast("Nicht gelöscht – bitte mit Netz nochmal","err"); }
  sitListeLaden();
}
function sitKiDiktat(){
  if(typeof diktatUmschalten!=="function"){ toast("Einsprechen geht hier nicht – das Mikrofon der Tastatur funktioniert immer","info"); return; }
  if(typeof diktatMoeglich==="function"&&!diktatMoeglich()){ toast("Dieses Gerät kann nicht zuhören – nutze das Mikrofon der Tastatur","info"); return; }
  diktatUmschalten({feldId:"sit-ki-text",knopfId:"sit-ki-mic",anzeigeId:"sit-ki-hoer",max:2000,
    onText:()=>{ const f=document.getElementById("sit-ki-text"); if(f&&typeof feldWachsen==="function")feldWachsen(f); }});
}
function sitKiStopp(){ if(typeof _dk!=="undefined"&&_dk&&_dk.feldId==="sit-ki-text"&&typeof diktatStop==="function")diktatStop(); }
/* Die KI zeichnet mit demselben Dienst wie die Übungen (ki-uebung, modus „text“). Der
   Vorsatz sagt ihr, dass es um eine Spielsituation auf dem ganzen Feld geht und welche
   Farbe wer trägt – sonst baut sie einen Übungsaufbau mit Hütchen. Namen gehen als „Kind n“. */
async function sitKiAuswerten(){
  const feld=document.getElementById("sit-ki-text"), st=document.getElementById("sit-ki-stand"), los=document.getElementById("sit-ki-los");
  const roh=String((feld&&feld.value)||"").trim();
  if(roh.length<15){ if(st)st.textContent="Beschreib die Situation in ein, zwei Sätzen: wer steht wo, wohin läuft der Ball."; return; }
  if(typeof skzKiSpec!=="function"||typeof skzEditorOpen!=="function"){ if(st)st.textContent="Die Zeichenfläche lädt noch – gleich nochmal."; return; }
  sitKiStopp();
  const m=(typeof nbMaske==="function")?nbMaske([]):null;
  const text=m?m.weg(roh):roh;
  if(los){ los.disabled=true; los.innerHTML='<i class="ti ti-loader-2"></i>Zeichnet …'; }
  if(st)st.textContent="🧠 Die KI zeichnet die Situation …";
  try{
    let spec=await skzKiSpec("SPIELSITUATION im Spiel (kein Übungsaufbau, keine Hütchen), ganzes Feld hochkant, "
      +"unser Tor unten, wir spielen nach oben. Eigene Kinder grün, Gegner rot, Torwart blau. "
      +"Zeige den Ablauf mit Pfeilen oder in mehreren Bildern. Situation: "+text);
    if(!spec.hoch&&typeof skzDrehen==="function")spec=skzDrehen(spec);
    if(st)st.textContent="✨ Gezeichnet – prüfen, verschieben, dann „Übernehmen“.";
    skzEditorOpen(spec, s=>sitErfassen(s,"KI-Situation"), {titel:"Spielsituation"});
  }catch(e){
    if(st)st.textContent="Nicht gezeichnet: "+String((e&&e.message)||"Es hat nicht geklappt.")+" Dein Text bleibt stehen.";
  }finally{
    if(los){ los.disabled=false; los.innerHTML='<i class="ti ti-sparkles"></i>Zeichnen lassen'; }
  }
}
function sitHubRender(){
  const hub=document.getElementById("sit-hub"); if(!hub)return;
  if(!hub.dataset.fertig){
    const formen=[["funino","FUNiño","ti-triangle"],["3+1","3+1","ti-triangle-inverted"],["4+1","4+1 Raute","ti-diamond"],["5+1","5+1","ti-pentagon"]];
    /* v653: Das freie Brett steht zuerst – am Platz vor den Kindern wird gezeigt, nicht gebaut. */
    /* v689: Ein Abschnitt „Neue Situation“ trägt beides – das freie Brett (bleibt die erste Aktion,
       v653) und die vier Spielformen darunter. Vorher stand das Brett allein oben, der KI-Kasten
       dazwischen und die Spielformen erst danach, obwohl alle fünf dasselbe tun: ein Brett öffnen. */
    hub.innerHTML=`<div class="tf-abschnitt">Neue Situation</div>
      <button type="button" class="btn sit-brett" onclick="typeof brettOpen==='function'?brettOpen():toast('Das Brett lädt noch – gleich nochmal','info')"><i class="ti ti-pencil"></i>Freies Brett – schieben und mit dem Finger zeichnen</button>
      <div class="sit-formen">${formen.map(([k,l,i])=>`<button type="button" class="btn sit-form" onclick="sitNeu('${k}')"><i class="ti ${i}"></i>${l}</button>`).join("")}</div>
      <div class="tf-abschnitt">Oder beschreiben</div>
      <section class="tf-ki" aria-labelledby="sit-ki-t">
        <div id="sit-ki-t" class="tf-ki-t">✨ Beschreib die Situation – die KI zeichnet sie</div>
        <div class="tf-ki-s">Wer steht wo, wohin geht der Ball, was soll passieren. Danach verschiebst du, was nicht passt.</div>
        <textarea id="sit-ki-text" class="wachsen" rows="3" maxlength="2000" placeholder="Zum Beispiel: Der Gegner dribbelt links an der Seite. Unser Flitzer links läuft zurück und stellt ihn, der Aufpasser rückt nach, der Jäger bietet sich in der Mitte an."></textarea>
        <div id="sit-ki-hoer" class="dk-anzeige" hidden></div>
        <div class="tf-ki-knoepfe">
          <button type="button" class="btn" id="sit-ki-mic" onclick="sitKiDiktat()"><i class="ti ti-microphone"></i>Einsprechen</button>
          <button type="button" class="btn tf-ki-los" id="sit-ki-los" onclick="sitKiAuswerten()"><i class="ti ti-sparkles"></i>Zeichnen lassen</button>
        </div>
        <div id="sit-ki-stand" role="status" aria-live="polite" class="tf-ki-stand"></div>
      </section>
      <div class="tf-abschnitt">Gespeicherte Situationen</div>
      <div id="sit-liste"><div class="sit-leer">Lädt …</div></div>
      <div class="tf-abschnitt">Weitere Werkzeuge</div>
      <div class="sit-weitere">
        <button type="button" class="btn" onclick="typeof vtbOpen==='function'&&vtbOpen()"><i class="ti ti-video"></i>Video</button>
        <button type="button" class="btn" onclick="typeof kiCoachOpen==='function'&&kiCoachOpen()"><i class="ti ti-sparkles"></i>KI-Coach</button>
      </div>`;
    hub.dataset.fertig="1";
  }
  sitListeLaden();
}

function taktikRender(){
  const fieldEl=document.getElementById("taktik-field");
  const benchEl=document.getElementById("taktik-bench");
  if(!fieldEl||!benchEl)return;
  const tokensEl=document.getElementById("taktik-tokens");
  tokensEl.innerHTML="";
  benchEl.innerHTML="";

  tbField.forEach((p,i)=>{
    const tok=tbCreateToken(p.name,p.cls||"tb-auf",p.role||"");
    tok.style.left=p.x+"%";tok.style.top=p.y+"%";
    tok.dataset.idx=i;tok.dataset.loc="field";
    if(tqActive&&p.locked){ // K5: gesperrte Spieler klar kennzeichnen
      tok.style.opacity=".5";
      tok.classList.add("tq-locked");
      tok.insertAdjacentHTML("beforeend",'<span class="tb-lock-badge">🔒</span>');
    }
    tbAddDrag(tok,fieldEl);
    tokensEl.appendChild(tok);
  });

  const ballEl=document.createElement("div");
  ballEl.className="tb-ball";
  ballEl.style.cssText=`position:absolute;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#e2e8f0);border:2px solid rgba(0,0,0,.3);transform:translate(-50%,-50%);cursor:grab;z-index:15;box-shadow:0 2px 6px rgba(0,0,0,.3);left:${tbBall.x}%;top:${tbBall.y}%`;
  ballEl.dataset.loc="ball";
  tbAddDrag(ballEl,fieldEl);
  tokensEl.appendChild(ballEl);

  tbBench.forEach(name=>{
    const tok=tbCreateToken(name,"tb-bench","");
    tok.dataset.loc="bench";
    tbAddDrag(tok,fieldEl);
    benchEl.appendChild(tok);
  });

  if(tqActive&&tqCurrentOpps.length){
    tqCurrentOpps.forEach(o=>{
      const el=document.createElement("div");
      el.className="tb-token tb-opp";
      el.innerHTML=`<span class="tb-name">${o.label||"Gegner"}</span>`;
      const ox=o.to?o.to.x:o.x, oy=o.to?o.to.y:o.y;
      el.style.cssText=`position:absolute;z-index:8;left:${ox}%;top:${oy}%;transform:translate(-50%,-50%)`;
      tokensEl.appendChild(el);
    });
  }
}

