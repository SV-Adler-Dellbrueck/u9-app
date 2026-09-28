/* md-brett.js · v653 – Freies Brett (Trainer) und Mein Taktikbrett (Kabine)

   Charles (v653): „… mit dem Handy oder mit dem Tablet den Kindern ein paar Bewegungen
   auf dem Platz visualisieren … frei zeichnen“ – und: ob die Kinder „da einfach selber
   rumbasteln können“. Kacheln: „Beides jetzt“, Stift nur hier, nicht im Übungs-Editor.

   Warum ein eigenes Brett und nicht der Skizzen-Editor: Der Editor baut eine Skizze mit
   Bedeutung (Pass, Laufweg, Dribbling, Schuss; Legende, Materialzeile) und endet mit
   Speichern. Am Platz vor den Kindern braucht es das Gegenteil: sofort da, Steine schieben,
   mit dem Finger einen Weg wischen, wieder weg. Der Platz selbst kommt aus demselben
   Renderer (`_skz` in data.js), die Aufstellungen aus FORMATIONS – nichts doppelt.

   Was es NICHT tut: nichts geht an den Server. Der Stand liegt nur im Speicher dieses
   Geräts (localStorage, je Modus ein Schlüssel) und übersteht so ein versehentliches
   Schließen. Im Kinder-Modus gibt es kein Textfeld – also kann dort auch kein Name stehen –
   und nur fünf Werkzeuge; die Zeit zählt wie jede Kabinen-Seite zur Appzeit. */

const BRETT_B=180, BRETT_H=280;                       // hochkant wie die Spielsituationen
const BRETT_FORMEN=[["funino","FUNiño"],["3+1","3+1"],["4+1","4+1"],["5+1","5+1"]];
const BRETT_KURZ={TW:"TW",Aufpasser:"A","Flitzer L":"FL","Flitzer R":"FR","Jäger":"J","Abwehr L":"AL","Abwehr R":"AR"};
/* Stiftfarben: hell auf dem dunklen Rasen (alle über 3:1). Der Name steht am Knopf, damit
   die Farbe nie allein trägt. */
const BRETT_STIFTE=[["w","Weiß","#ffffff"],["y","Gelb","#fbbf24"],["b","Blau","#93c5fd"]];
const BRETT_MODI={
  trainer:{schluessel:"adler-brett-trainer", r:8,  strich:2.5, formen:BRETT_FORMEN,           stifte:BRETT_STIFTE},
  kind:   {schluessel:"adler-brett-kind",    r:11, strich:4,   formen:BRETT_FORMEN.slice(0,3), stifte:BRETT_STIFTE.slice(0,2)}
};
let _br=null;   // {modus,wurzel,stand,werk,stift,verlauf,zieh,strich}

/* ── Stand ─────────────────────────────────────────────────────────────────────────── */
function _brFeld(form){
  const spec={hoch:true, z:[[18,24,144,232]], li:[[18,140,162,140,"m"]],
    h:[[18,24,"y"],[162,24,"y"],[18,256,"y"],[162,256,"y"]]};
  if(form==="funino"){
    spec.tor=[[46,16,"h",28],[106,16,"h",28],[46,256,"h",28],[106,256,"h",28]];
    spec.li.push([18,92,162,92,"sz"],[18,188,162,188,"sz"]);
  }else spec.tor=[[68,14,"h",44,"j"],[68,256,"h",44,"j"]];
  return spec;
}
/* Wir spielen nach oben (unser Tor unten), der Gegner gespiegelt oben – wie im Quiz. */
function _brGrundstellung(form){
  const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[form])||null;
  const toks=[];
  (f?f.slots:[]).forEach(sl=>{
    const x=Math.round(18+sl.x*1.44), y=Math.round(134+(sl.y/100)*116);   // TW frei vor dem Tor, auch mit großen Kinder-Steinen
    toks.push({t:sl.role==="TW"?"tw":"wir", x, y, k:BRETT_KURZ[sl.role]||""});
    toks.push({t:"gegner", x:180-x, y:280-y, k:""});
  });
  toks.push({t:"ball", x:90, y:140, k:""});
  return {form, toks, striche:[]};
}
function _brLaden(modus){
  try{
    const s=JSON.parse(localStorage.getItem(BRETT_MODI[modus].schluessel)||"null");
    if(s&&Array.isArray(s.toks)&&Array.isArray(s.striche)&&s.form)return s;
  }catch(e){}
  return _brGrundstellung("4+1");
}
function _brMerken(){ try{ localStorage.setItem(BRETT_MODI[_br.modus].schluessel, JSON.stringify(_br.stand)); }catch(e){} }
function _brVerlauf(){ _br.verlauf.push(JSON.stringify(_br.stand)); if(_br.verlauf.length>30)_br.verlauf.shift(); }

/* ── Zeichnen ──────────────────────────────────────────────────────────────────────── */
function _brPlatz(){
  if(typeof _skz!=="function")return `<rect width="${BRETT_B}" height="${BRETT_H}" fill="#2d6a2d"/>`;
  return _skz(_brFeld(_br.stand.form)).replace(/^<svg[^>]*>/,"").replace(/<\/svg>\s*$/,"");
}
function _brPfad(pts){ return pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" "); }
function _brStricheHtml(){
  const m=BRETT_MODI[_br.modus];
  return _br.stand.striche.map((s,i)=>{
    const farbe=(m.stifte.find(x=>x[0]===s.c)||BRETT_STIFTE[0])[2];
    return `<path data-strich="${i}" d="${_brPfad(s.pts)}" fill="none" stroke="${farbe}" stroke-width="${m.strich}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
}
function _brSteineHtml(){
  const r=BRETT_MODI[_br.modus].r;
  const F={wir:"#4ade80",tw:"#60a5fa",gegner:"#f87171"};
  return _br.stand.toks.map((t,i)=>{
    if(t.t==="ball")return `<g data-stein="${i}"><circle cx="${t.x}" cy="${t.y}" r="${Math.round(r*.6)}" fill="#111827" stroke="#fff" stroke-width="1.5"/></g>`;
    const k=t.k?`<text x="${t.x}" y="${t.y+r*.35}" text-anchor="middle" font-size="${Math.round(r*.9)}" font-weight="700" fill="rgba(0,0,0,.7)" font-family="Inter,system-ui,sans-serif">${t.k}</text>`:"";
    return `<g data-stein="${i}"><circle cx="${t.x}" cy="${t.y}" r="${r}" fill="${F[t.t]||F.wir}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>${k}</g>`;
  }).join("");
}
function _brBuehne(){
  const svg=_br.wurzel.querySelector(".br-svg"); if(!svg)return;
  svg.querySelector(".br-platz").innerHTML=_brPlatz();
  svg.querySelector(".br-striche").innerHTML=_brStricheHtml();
  svg.querySelector(".br-steine").innerHTML=_brSteineHtml();
}
function _brLeiste(){
  const m=BRETT_MODI[_br.modus], kind=_br.modus==="kind";
  const w=(id,icon,txt)=>`<button type="button" class="btn br-werk" data-werk="${id}" aria-pressed="${_br.werk===id}" onclick="brettWerkzeug('${id}')"><i class="ti ${icon}"></i>${txt}</button>`;
  const stifte=m.stifte.map(([c,name,hex])=>`<button type="button" class="btn br-farbe" data-farbe="${c}" aria-pressed="${_br.werk==="stift"&&_br.stift===c}" onclick="brettStift('${c}')" title="Stift ${name}"><span class="br-punkt" style="background:${hex}"></span>${name}</button>`).join("");
  const formen=m.formen.map(([k,l])=>`<button type="button" class="btn br-form" aria-pressed="${_br.stand.form===k}" onclick="brettForm('${k}')">${l}</button>`).join("");
  return `<div class="br-reihe" role="group" aria-label="Werkzeug">${w("ziehen","ti-hand-finger","Schieben")}${stifte}${w("radierer","ti-eraser","Radieren")}</div>
    <div class="br-reihe" role="group" aria-label="Brett">
      <button type="button" class="btn" onclick="brettZurueck()"><i class="ti ti-arrow-back-up"></i>Zurück</button>
      ${kind?"":`<button type="button" class="btn" onclick="brettStricheWeg()"><i class="ti ti-scribble-off"></i>Stift weg</button>`}
      <button type="button" class="btn" onclick="brettGrundstellung()"><i class="ti ti-refresh"></i>${kind?"Neu anfangen":"Grundstellung"}</button>
    </div>
    <div class="br-reihe" role="group" aria-label="Spielform">${formen}</div>`;
}
function _brHinweis(){
  return _br.werk==="stift"?(_br.modus==="kind"?"Mal mit dem Finger, wo du hinläufst.":"Mit dem Finger zeichnen – Laufwege, Pässe, Räume.")
    :_br.werk==="radierer"?"Tipp auf eine Linie, die weg soll."
    :(_br.modus==="kind"?"Zieh die Spieler und den Ball dahin, wo sie hinsollen.":"Spieler und Ball ziehen.");
}
function _brAufbauen(){
  const kind=_br.modus==="kind";
  _br.wurzel.innerHTML=`<div class="br-flaeche">
      <svg class="br-svg" viewBox="0 0 ${BRETT_B} ${BRETT_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${kind?"Mein Taktikbrett":"Freies Brett"}: Spielfeld mit Spielern und Ball">
        <g class="br-platz"></g><g class="br-striche"></g><g class="br-steine"></g>
      </svg>
    </div>
    <div class="br-hinweis" id="br-hinweis" role="status" aria-live="polite">${_brHinweis()}</div>
    <div class="br-leiste" id="br-leiste">${_brLeiste()}</div>`;
  const svg=_br.wurzel.querySelector(".br-svg");
  svg.addEventListener("pointerdown",_brDown);
  svg.addEventListener("pointermove",_brMove);
  svg.addEventListener("pointerup",_brUp);
  svg.addEventListener("pointercancel",_brUp);
  _brBuehne();
}
function _brLeisteNeu(){
  const l=_br&&_br.wurzel.querySelector("#br-leiste"); if(l)l.innerHTML=_brLeiste();
  const h=_br&&_br.wurzel.querySelector("#br-hinweis"); if(h)h.textContent=_brHinweis();
}

/* ── Finger ────────────────────────────────────────────────────────────────────────── */
function _brPunkt(ev){
  const svg=_br.wurzel.querySelector(".br-svg");
  const pt=svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY;
  const m=svg.getScreenCTM(); if(!m)return [0,0];
  const p=pt.matrixTransform(m.inverse());
  return [Math.max(0,Math.min(BRETT_B,p.x)), Math.max(0,Math.min(BRETT_H,p.y))];
}
function _brSteinBei(x,y){
  const r=BRETT_MODI[_br.modus].r+6; let best=-1, bd=1e9;
  _br.stand.toks.forEach((t,i)=>{ const d=Math.hypot(t.x-x,t.y-y); if(d<=r&&d<bd){bd=d;best=i;} });
  return best;
}
function _brRadieren(x,y){
  const nah=8; const vorher=_br.stand.striche.length;
  const i=_br.stand.striche.findIndex(s=>s.pts.some(p=>Math.hypot(p[0]-x,p[1]-y)<=nah));
  if(i<0)return false;
  _brVerlauf(); _br.stand.striche.splice(i,1); _brBuehne(); return _br.stand.striche.length<vorher;
}
function _brDown(ev){
  if(!_br)return; ev.preventDefault();
  try{ ev.currentTarget.setPointerCapture(ev.pointerId); }catch(e){}
  const [x,y]=_brPunkt(ev);
  if(_br.werk==="ziehen"){
    const i=_brSteinBei(x,y); if(i<0)return;
    _brVerlauf(); _br.zieh={i, dx:_br.stand.toks[i].x-x, dy:_br.stand.toks[i].y-y};
  }else if(_br.werk==="stift"){
    _brVerlauf(); _br.stand.striche.push({c:_br.stift, pts:[[x,y]]});
    _br.strich=_br.stand.striche.length-1; _brBuehne();
  }else if(_br.werk==="radierer"){ _br.radiert=true; _brRadieren(x,y); }
}
function _brMove(ev){
  if(!_br)return;
  if(_br.zieh){
    const [x,y]=_brPunkt(ev), t=_br.stand.toks[_br.zieh.i];
    t.x=Math.round(x+_br.zieh.dx); t.y=Math.round(y+_br.zieh.dy);
    const g=_br.wurzel.querySelector(`[data-stein="${_br.zieh.i}"]`);
    if(g){ const tmp=document.createElementNS("http://www.w3.org/2000/svg","g"); tmp.innerHTML=_brSteineHtml(); const neu=tmp.querySelector(`[data-stein="${_br.zieh.i}"]`); if(neu)g.replaceWith(neu); }
  }else if(_br.strich!=null){
    const [x,y]=_brPunkt(ev), s=_br.stand.striche[_br.strich], l=s.pts[s.pts.length-1];
    if(Math.hypot(l[0]-x,l[1]-y)<1.2)return;          // nicht jeden Pixel speichern
    s.pts.push([x,y]);
    const p=_br.wurzel.querySelector(`[data-strich="${_br.strich}"]`); if(p)p.setAttribute("d",_brPfad(s.pts));
  }else if(_br.radiert&&ev.buttons){ const [x,y]=_brPunkt(ev); _brRadieren(x,y); }
}
function _brUp(){
  if(!_br)return;
  if(_br.strich!=null){ const s=_br.stand.striche[_br.strich]; if(s&&s.pts.length<2)s.pts.push([s.pts[0][0]+.5,s.pts[0][1]+.5]); }
  const geaendert=!!(_br.zieh||_br.strich!=null||_br.radiert);
  _br.zieh=null; _br.strich=null; _br.radiert=false;
  if(geaendert)_brMerken();
}

/* ── Knöpfe ────────────────────────────────────────────────────────────────────────── */
function brettWerkzeug(id){ if(!_br)return; _br.werk=id; _brLeisteNeu(); }
function brettStift(c){ if(!_br)return; _br.werk="stift"; _br.stift=c; _brLeisteNeu(); }
function brettZurueck(){
  if(!_br)return; const v=_br.verlauf.pop();
  if(!v){ if(typeof toast==="function")toast("Nichts mehr zurückzunehmen","info"); return; }
  _br.stand=JSON.parse(v); _brMerken(); _brBuehne(); _brLeisteNeu();
}
function brettStricheWeg(){ if(!_br||!_br.stand.striche.length)return; _brVerlauf(); _br.stand.striche=[]; _brMerken(); _brBuehne(); }
function brettGrundstellung(){ if(!_br)return; _brVerlauf(); _br.stand=_brGrundstellung(_br.stand.form); _brMerken(); _brBuehne(); }
function brettForm(form){
  if(!_br||!BRETT_FORMEN.some(f=>f[0]===form))return;
  _brVerlauf(); const striche=_br.stand.striche;
  _br.stand=_brGrundstellung(form); _br.stand.striche=striche;   // Zeichnung bleibt, Aufstellung wechselt
  _brMerken(); _brBuehne(); _brLeisteNeu();
}
function _brStart(modus,wurzel){
  _br={modus, wurzel, stand:_brLaden(modus), werk:"ziehen", stift:BRETT_MODI[modus].stifte[0][0], verlauf:[], zieh:null, strich:null, radiert:false};
  if(!BRETT_MODI[modus].formen.some(f=>f[0]===_br.stand.form))_br.stand=_brGrundstellung("4+1");
  _brAufbauen();
}

/* Trainer: Vollbild-Fenster aus Taktik. Bewusst ohne Speichern in der Datenbank – wer eine
   Situation behalten will, legt sie als Spielsituation an; das Brett ist die Tafel am Platz. */
function brettOpen(){
  brettClose();
  const m=document.createElement("div");
  m.id="brett-modal"; m.className="br-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","brett-titel");
  m.innerHTML=`<div class="br-kopf"><div id="brett-titel" class="br-titel">✏️ Freies Brett</div>
      <button type="button" class="br-zu" onclick="brettClose()" aria-label="Freies Brett schließen"><i class="ti ti-x"></i></button></div>
    <div class="br-rumpf" id="brett-rumpf"></div>`;
  document.body.appendChild(m);
  _brStart("trainer", m.querySelector("#brett-rumpf"));
  setTimeout(()=>m.querySelector(".br-zu")?.focus(),30);
}
function brettClose(){ document.getElementById("brett-modal")?.remove(); if(_br&&_br.modus==="trainer")_br=null; }

/* Kabine: als Unterseite in #kabine-body – wie alle anderen Kabinen-Seiten, mit ←. */
function brettKabine(ziel){
  if(!ziel)return;
  ziel.innerHTML=`<div class="br-kabkopf">
      <button type="button" class="br-zu" onclick="brettKabineZu()" aria-label="Zurück zur Kabine">←</button>
      <div class="br-titel">✏️ Mein Taktikbrett</div></div>
    <div class="br-rumpf br-kind" id="brett-kind"></div>`;
  _brStart("kind", ziel.querySelector("#brett-kind"));
}
function brettKabineZu(){ _br=null; if(typeof kabineHome==="function")kabineHome(); }

function brettModulDa(){ return true; }
