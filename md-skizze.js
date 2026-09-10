/* ── Skizzen für eigene Trainingsformen (PO v409) ────────────────────────────
   „wenn ich selbst eine Trainingsform anlege wäre es hilfreich wenn ich auch etwas
   visuelles dazu erzeugen könnte."

   Gezeichnet wurde schon immer: `_skz(spec)` in data.js baut aus einer kompakten
   Beschreibung das Platz-Bild (Zonen, Tore, Leitern, Hütchen, Spieler, Bälle, Pfeile
   in vier Typen, Text). Auch die Spalte `trainingsformen.skizze` (jsonb) gibt es
   längst. Es fehlte nur die EINGABE – eigene Übungen bekamen die Kategorie-Symbol-
   skizze, in der wörtlich „Symbolskizze" steht.

   Zwei Wege, beide schreiben dieselbe Beschreibung:
   A) VORLAGEN – zehn typische Grundaufbauten, antippen und fertig. Auf dem Handy der
      schnellste Weg, und man muss nicht zeichnen können.
   B) TIPP-EDITOR – Werkzeug wählen, auf den Platz tippen. Verschieben und Entfernen
      sind eigene Werkzeuge; „Zeichnen" und „Anfassen" auf denselben Finger zu legen
      geht auf einem 6-Zoll-Bildschirm regelmäßig schief.

   Bewusst KEIN eigener Zeichner: gerendert wird mit `_skz`, damit die eigene Übung
   exakt so aussieht wie die aus der Bibliothek. Die Bühne rechnet Fingerposition in
   die Koordinaten des Bildes um (fester Zuschnitt 280×180), deshalb passen Bild und
   Trefferpunkt ohne zweite Zeichenebene zusammen. */

const SKZ_VORLAGEN=[
  {n:"Rondo 6:2", spec:{
    s:[[140,28,'g'],[214,58,'g'],[226,122,'g'],[140,156,'g'],[54,122,'g'],[66,58,'g'],[112,84,'r'],[168,98,'r']],
    b:[[148,35]],
    p:[[150,33,208,54,'p'],[218,68,224,112,'p']],
    tx:[[140,172,'außen halten – innen erobern']]}},
  {n:"Passdreieck", spec:{
    s:[[62,120,'g','A'],[140,45,'g','B'],[218,120,'g','C']],
    b:[[70,127]],
    p:[[72,112,132,55,'p'],[150,52,210,112,'p'],[208,124,74,124,'p']],
    tx:[[140,172,'Pass – Nachrücken – Anbieten']]}},
  {n:"Slalom-Dribbling", spec:{
    h:[[95,90,'y'],[130,90,'y'],[165,90,'y'],[200,90,'y']],
    s:[[45,90,'g']],b:[[53,97]],
    p:[[54,84,92,78,'d'],[100,100,128,102,'d'],[136,80,162,78,'d'],[172,100,198,102,'d']],
    tor:[[240,72,'v',36]],
    tx:[[140,172,'eng am Fuß durch die Tore']]}},
  {n:"Torschuss beidseitig", spec:{
    tor:[[132,10,'h',30]],
    s:[[60,140,'g'],[60,120,'g'],[220,140,'g'],[220,120,'g'],[140,60,'b','TW']],
    b:[[68,147],[228,147]],
    p:[[70,134,128,48,'s'],[222,134,152,48,'s']],
    tx:[[140,172,'abwechselnd von links und rechts']]}},
  {n:"Vier-Tore-Spiel", spec:{
    tor:[[10,40,'v',28],[10,112,'v',28],[263,40,'v',28],[263,112,'v',28]],
    s:[[95,60,'g'],[95,120,'g'],[185,60,'r'],[185,120,'r']],
    b:[[140,92]],
    tx:[[140,172,'zwei Tore je Mannschaft – Kopf hoch!']]}},
  {n:"Staffel", spec:{
    h:[[210,55,'r'],[210,125,'r']],
    s:[[50,55,'g'],[28,55,'g'],[50,125,'b'],[28,125,'b']],
    b:[[58,62],[58,132]],
    p:[[62,52,200,50,'d'],[200,62,62,64,'l'],[62,122,200,120,'d'],[200,132,62,134,'l']],
    tx:[[140,172,'hin dribbeln – zurück laufen']]}},
  {n:"Parcours", spec:{
    leiter:[[30,80,60,'h']],
    h:[[120,70,'y'],[150,100,'y'],[180,70,'y']],
    tor:[[248,70,'v',40]],
    s:[[22,90,'g']],b:[[205,92]],
    p:[[100,88,116,78,'l'],[190,84,244,88,'s']],
    tx:[[140,172,'Leiter – Slalom – Abschluss']]}},
  {n:"Zonenspiel", spec:{
    z:[[10,20,84,140],[98,20,84,140],[186,20,84,140]],
    s:[[52,70,'g'],[140,60,'g'],[140,120,'r'],[228,110,'r']],
    b:[[60,77]],
    p:[[62,72,132,62,'p']],
    tx:[[140,172,'aus der eigenen Zone herausspielen']]}},
  {n:"1 gegen 1", spec:{
    tor:[[124,10,'h',34]],
    s:[[140,140,'g'],[140,90,'r'],[140,32,'b','TW']],
    b:[[148,147]],
    p:[[146,132,142,102,'d'],[140,78,140,48,'s']],
    tx:[[140,172,'antreten, Finte, Abschluss']]}},
  {n:"Torwart-Grundform", spec:{
    tor:[[118,158,'h',44]],
    s:[[140,142,'b','TW'],[80,60,'w'],[200,60,'w']],
    b:[[88,67],[208,67]],
    p:[[88,72,132,136,'s'],[206,72,150,136,'s']],
    tx:[[140,25,'Schüsse aus dem Halbfeld']]}}
];

/* Werkzeuge. Reihenfolge = Reihenfolge in der Palette. `feld` sagt, in welche Liste
   der Beschreibung ein neues Element wandert; `zwei` markiert die Werkzeuge, die zwei
   Tipper brauchen (Anfang und Ende). */
const SKZ_WERK=[
  {id:"move",   emo:"✋", lbl:"Verschieben"},
  {id:"del",    emo:"🗑️", lbl:"Entfernen"},
  {id:"spieler",emo:"🔵", lbl:"Spieler",  feld:"s"},
  {id:"huetchen",emo:"🔺",lbl:"Hütchen",  feld:"h"},
  {id:"ball",   emo:"⚪", lbl:"Ball",     feld:"b"},
  {id:"tor",    emo:"🥅", lbl:"Tor",      feld:"tor"},
  {id:"zone",   emo:"⬛", lbl:"Zone",     feld:"z", zwei:true},
  {id:"leiter", emo:"🪜", lbl:"Leiter",   feld:"leiter"},
  {id:"pass",   emo:"➡️", lbl:"Pass",     feld:"p", zwei:true, typ:"p"},
  {id:"lauf",   emo:"⤳",  lbl:"Laufweg",  feld:"p", zwei:true, typ:"l"},
  {id:"schuss", emo:"💥", lbl:"Schuss",   feld:"p", zwei:true, typ:"s"},
  {id:"dribbel",emo:"〰️", lbl:"Dribbling",feld:"p", zwei:true, typ:"d"},
  {id:"text",   emo:"🔤", lbl:"Text",     feld:"tx"}
];
const SKZ_FARBEN=[["g","Grün","#4ade80"],["r","Rot","#f87171"],["b","Blau","#60a5fa"],["y","Gelb","#fbbf24"],["w","Weiß","#ffffff"]];

let _skzSpec=null, _skzWerk="spieler", _skzFarbe="g", _skzStart=null, _skzVerlauf=[], _skzCb=null, _skzZieh=null;

function _skzLeer(){ return {z:[],tor:[],leiter:[],wand:[],p:[],h:[],s:[],b:[],tx:[]}; }
function _skzKopie(o){ try{return JSON.parse(JSON.stringify(o||{}));}catch(e){return _skzLeer();} }
function _skzMerken(){ _skzVerlauf.push(_skzKopie(_skzSpec)); if(_skzVerlauf.length>40)_skzVerlauf.shift(); }
function _skzListe(f){ if(!Array.isArray(_skzSpec[f]))_skzSpec[f]=[]; return _skzSpec[f]; }
function _skzWerkzeug(id){ return SKZ_WERK.find(w=>w.id===(id||_skzWerk))||SKZ_WERK[0]; }

/* Wo liegt ein Element? Für den Treffer-Test und fürs Verschieben brauchen alle
   Elemente einen Ankerpunkt – bei Strecken (Pfeil, Zone, Leiter) der Anfang. */
function _skzAnker(feld,e){
  if(feld==="p")return [e[0],e[1]];
  if(feld==="z")return [e[0]+e[2]/2,e[1]+e[3]/2];
  if(feld==="tor")return [e[0]+((e[2]==="v")?3:(e[3]||24)/2),e[1]+((e[2]==="v")?(e[3]||24)/2:3)];
  if(feld==="leiter")return [e[0]+(e[3]==="v"?8:e[2]/2),e[1]+(e[3]==="v"?e[2]/2:8)];
  return [e[0],e[1]];
}
function _skzTreffer(x,y){
  const felder=["s","h","b","tx","tor","leiter","p","z"];  // kleine Dinge zuerst
  let best=null, bd=18;
  felder.forEach(f=>(_skzSpec[f]||[]).forEach((e,i)=>{
    const [ax,ay]=_skzAnker(f,e), d=Math.hypot(ax-x,ay-y);
    if(d<bd){bd=d;best={feld:f,idx:i};}
  }));
  return best;
}
function _skzVerschieben(t,x,y){
  const e=_skzSpec[t.feld][t.idx];
  if(t.feld==="p"){ const dx=x-e[0], dy=y-e[1]; e[0]=x; e[1]=y; e[2]+=dx; e[3]+=dy; }
  else if(t.feld==="z"){ e[0]=Math.round(x-e[2]/2); e[1]=Math.round(y-e[3]/2); }
  else { e[0]=Math.round(x); e[1]=Math.round(y); }
}

function skzSetWerkzeug(id){ _skzWerk=id; _skzStart=null; skzEditorZeichnen(); }
function skzSetFarbe(f){ _skzFarbe=f; skzEditorZeichnen(); }
function skzUndo(){ if(!_skzVerlauf.length){toast("Nichts mehr zurückzunehmen","info");return;} _skzSpec=_skzVerlauf.pop(); _skzStart=null; skzEditorZeichnen(); }
function skzLeeren(){ _skzMerken(); _skzSpec=_skzLeer(); _skzStart=null; skzEditorZeichnen(); }
function skzVorlage(i){
  const v=SKZ_VORLAGEN[i]; if(!v)return;
  _skzMerken(); _skzSpec=Object.assign(_skzLeer(),_skzKopie(v.spec)); _skzStart=null;
  skzEditorZeichnen(); toast("Vorlage „"+v.n+"“ geladen ✓");
}
function skzSpeichern(){
  const leer=["s","h","b","tor","z","p","leiter","tx"].every(f=>!(_skzSpec[f]||[]).length);
  const cb=_skzCb;
  document.getElementById("skz-modal")?.remove();
  if(typeof cb==="function")cb(leer?null:_skzKopie(_skzSpec));
}

/* Fingerposition → Koordinaten der Skizze. Die Bühne hat denselben Zuschnitt wie das
   Bild (280×180), deshalb reicht ein Dreisatz – keine zweite Zeichenebene nötig. */
function _skzPunkt(ev){
  const b=document.getElementById("skz-buehne"); if(!b)return null;
  const r=b.getBoundingClientRect();
  const cx=(ev.touches&&ev.touches[0]?ev.touches[0].clientX:ev.clientX);
  const cy=(ev.touches&&ev.touches[0]?ev.touches[0].clientY:ev.clientY);
  return [Math.max(4,Math.min(276,Math.round((cx-r.left)/r.width*280))),
          Math.max(4,Math.min(176,Math.round((cy-r.top)/r.height*180)))];
}
function skzBuehneDown(ev){
  const pkt=_skzPunkt(ev); if(!pkt)return; ev.preventDefault();
  const [x,y]=pkt, w=_skzWerkzeug();
  if(w.id==="move"){ const t=_skzTreffer(x,y); if(t){_skzMerken(); _skzZieh=t;} return; }
  if(w.id==="del"){
    const t=_skzTreffer(x,y);
    if(!t){toast("Nichts zum Entfernen getroffen","info");return;}
    _skzMerken(); _skzSpec[t.feld].splice(t.idx,1); skzEditorZeichnen(); return;
  }
  if(w.zwei){
    if(!_skzStart){ _skzStart=[x,y]; skzEditorZeichnen(); return; }
    _skzMerken();
    const [sx,sy]=_skzStart; _skzStart=null;
    if(w.feld==="z"){
      const x1=Math.min(sx,x),y1=Math.min(sy,y),bw=Math.abs(x-sx),bh=Math.abs(y-sy);
      if(bw<12||bh<12){toast("Zone zu klein – zweiten Punkt weiter weg tippen","info");skzEditorZeichnen();return;}
      _skzListe("z").push([x1,y1,bw,bh]);
    }else{
      if(Math.hypot(x-sx,y-sy)<12){toast("Zu kurz – zweiten Punkt weiter weg tippen","info");skzEditorZeichnen();return;}
      _skzListe("p").push([sx,sy,x,y,w.typ]);
    }
    skzEditorZeichnen(); return;
  }
  _skzMerken();
  if(w.feld==="s"){
    const nr=(document.getElementById("skz-text")?.value||"").trim().slice(0,3);
    _skzListe("s").push(nr?[x,y,_skzFarbe,nr]:[x,y,_skzFarbe]);
  }
  else if(w.feld==="h")_skzListe("h").push([x,y,_skzFarbe]);
  else if(w.feld==="b")_skzListe("b").push([x,y]);
  else if(w.feld==="tor")_skzListe("tor").push([x,y,"h",30]);
  else if(w.feld==="leiter")_skzListe("leiter").push([x,y,60,"h"]);
  else if(w.feld==="tx"){
    const t=(document.getElementById("skz-text")?.value||"").trim();
    if(!t){toast("Erst Text eintippen, dann auf den Platz tippen","err");return;}
    _skzListe("tx").push([x,y,t.slice(0,40)]);
  }
  skzEditorZeichnen();
}
function skzBuehneMove(ev){
  if(!_skzZieh)return; const pkt=_skzPunkt(ev); if(!pkt)return; ev.preventDefault();
  _skzVerschieben(_skzZieh,pkt[0],pkt[1]); skzEditorZeichnen();
}
function skzBuehneUp(){ _skzZieh=null; }

function skzEditorZeichnen(){
  const b=document.getElementById("skz-buehne"); if(!b)return;
  const leg=document.getElementById("skz-legende");
  if(leg&&!leg.innerHTML&&typeof skzLegende==="function")leg.innerHTML=skzLegende();
  b.innerHTML=(typeof _skz==="function")?_skz(_skzSpec):"";
  const svg=b.querySelector("svg");
  if(svg){ svg.style.margin="0"; svg.style.maxWidth="100%"; svg.style.width="100%"; svg.style.height="100%"; svg.style.pointerEvents="none"; }
  // Anfangspunkt eines Pfeils sichtbar machen – sonst tippt man ins Blaue
  if(_skzStart&&svg){
    const m=document.createElementNS("http://www.w3.org/2000/svg","circle");
    m.setAttribute("cx",_skzStart[0]);m.setAttribute("cy",_skzStart[1]);m.setAttribute("r","5");
    m.setAttribute("fill","none");m.setAttribute("stroke","#fff");m.setAttribute("stroke-width","2");
    m.setAttribute("stroke-dasharray","3,2");
    svg.appendChild(m);
  }
  const w=_skzWerkzeug();
  const pal=document.getElementById("skz-palette");
  if(pal)pal.querySelectorAll("button").forEach(x=>{
    const an=x.dataset.werk===_skzWerk;
    x.style.background=an?"var(--blue)":"var(--surface)";
    x.style.color=an?"#fff":"var(--text2)";
    x.style.borderColor=an?"var(--blue)":"";
    x.setAttribute("aria-pressed",an?"true":"false");
  });
  const fz=document.getElementById("skz-farbzeile");
  if(fz){
    fz.style.display=(w.feld==="s"||w.feld==="h")?"flex":"none";
    fz.querySelectorAll("button").forEach(x=>{
      const an=x.dataset.farbe===_skzFarbe;
      x.style.outline=an?"3px solid var(--blue)":"none"; x.setAttribute("aria-pressed",an?"true":"false");
    });
  }
  const tf=document.getElementById("skz-textzeile");
  if(tf)tf.style.display=(w.feld==="tx"||w.feld==="s")?"block":"none";
  const tl=document.getElementById("skz-textlabel");
  if(tl)tl.textContent=(w.feld==="s")?"Nummer oder Kürzel für den nächsten Spieler (optional)":"Text, der auf den Platz geschrieben wird";
  const hw=document.getElementById("skz-hinweis");
  if(hw)hw.textContent=w.id==="move"?"Element antippen und ziehen."
    :w.id==="del"?"Element antippen, das weg soll."
    :w.zwei?(_skzStart?"Jetzt den Endpunkt tippen.":"Startpunkt tippen, dann Endpunkt.")
    :"Auf den Platz tippen, um „"+w.lbl+"“ zu setzen.";
}

function skzVorlagenLeiste(){
  return SKZ_VORLAGEN.map((v,i)=>`<button onclick="skzVorlage(${i})" style="flex:none;width:132px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);padding:5px;cursor:pointer;font-family:inherit;scroll-snap-align:start">
    <div style="pointer-events:none">${(typeof _skz==="function")?_skz(v.spec):""}</div>
    <div style="font-size:11px;font-weight:700;color:var(--text2);margin-top:2px">${esc(v.n)}</div>
  </button>`).join("");
}

/* Öffnet den Editor. `start` ist eine vorhandene Beschreibung (oder null),
   `cb(spec|null)` bekommt das Ergebnis – null heißt „keine Skizze". */
function skzEditorOpen(start,cb){
  _skzSpec=Object.assign(_skzLeer(),_skzKopie(start||{}));
  _skzCb=cb; _skzWerk="spieler"; _skzFarbe="g"; _skzStart=null; _skzVerlauf=[]; _skzZieh=null;
  document.getElementById("skz-modal")?.remove();
  const m=document.createElement("div"); m.id="skz-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Skizze zur Übung");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;padding:12px;overflow-y:auto";
  m.style.zIndex=(typeof zOben==="function")?zOben(10005):10005;
  m.onclick=e=>{if(e.target===m)m.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`${mdlHead("skz-modal","🎨","Skizze zur Übung","Vorlage wählen oder selbst tippen","#0284c7")}
    <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:2px 0 6px">Vorlagen</div>
    <div style="display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;margin-bottom:10px">${skzVorlagenLeiste()}</div>
    <div id="skz-buehne" style="position:relative;width:100%;max-width:340px;margin:0 auto 8px;aspect-ratio:280/180;border-radius:8px;overflow:hidden;touch-action:none;cursor:crosshair"></div>
  <!-- v512: Beim Zeichnen will man sehen, was der gewählte Stift bedeutet. -->
  <div id="skz-legende"></div>
    <div id="skz-hinweis" style="font-size:11.5px;color:var(--text2);text-align:center;margin-bottom:8px;min-height:16px"></div>
    <div id="skz-palette" style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:8px">
      ${SKZ_WERK.map(w=>`<button data-werk="${w.id}" onclick="skzSetWerkzeug('${w.id}')" title="${w.lbl}" aria-label="${w.lbl}" style="min-height:46px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text2);font-family:inherit;font-size:10px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:3px"><span style="font-size:16px;line-height:1">${w.emo}</span>${esc(w.lbl)}</button>`).join("")}
    </div>
    <div id="skz-farbzeile" style="display:none;gap:8px;justify-content:center;margin-bottom:8px">
      ${SKZ_FARBEN.map(([k,n,c2])=>`<button data-farbe="${k}" onclick="skzSetFarbe('${k}')" title="${n}" aria-label="Farbe ${n}" style="width:44px;height:44px;border-radius:50%;border:2px solid rgba(0,0,0,.25);background:${c2};cursor:pointer"></button>`).join("")}
    </div>
    <div id="skz-textzeile" style="display:none;margin-bottom:10px">
      <label id="skz-textlabel" for="skz-text" style="display:block;font-size:11px;color:var(--text2);margin-bottom:3px"></label>
      <input type="text" id="skz-text" maxlength="40" placeholder="z. B. „Startpunkt“ oder 7" style="width:100%;min-height:44px;padding:8px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box">
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button onclick="skzUndo()" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text2);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">↩︎ Zurück</button>
      <button onclick="skzLeeren()" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text2);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">🧹 Leeren</button>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-p" style="flex:1" onclick="skzSpeichern()"><i class="ti ti-device-floppy"></i>Übernehmen</button>
      <button class="btn" onclick="document.getElementById('skz-modal').remove()">Abbrechen</button>
    </div>`;
  m.appendChild(c); document.body.appendChild(m);
  const b=document.getElementById("skz-buehne");
  b.addEventListener("pointerdown",skzBuehneDown);
  b.addEventListener("pointermove",skzBuehneMove);
  b.addEventListener("pointerup",skzBuehneUp);
  b.addEventListener("pointercancel",skzBuehneUp);
  b.addEventListener("pointerleave",skzBuehneUp);
  skzEditorZeichnen();
}

/* Skizze zu einer schon gespeicherten Übung nachtragen (PO v412). Aufgerufen aus der
   Detailansicht, wenn dort keine Skizze steht – statt eines falschen Kategorie-Bildes.
   Nur für eigene Übungen: die 107 Bibliotheks-Übungen bringen ihre Zeichnung selbst mit. */
async function uebungSkizzeNachtragen(idx){
  const alle=(typeof tpAllForms==="function")?tpAllForms():[];
  const f=alle[idx]; if(!f){toast("Übung nicht gefunden","err");return;}
  skzEditorOpen(f.skizze||null, async spec=>{
    if(!spec)return;
    f.skizze=spec;
    try{ f.svg=_skz(spec); }catch(e){}
    if(f.id){
      try{
        const r=await fetch(`${SB_URL}/rest/v1/trainingsformen?id=eq.${f.id}`,{method:"PATCH",
          headers:sbAuthHeaders(),body:JSON.stringify({skizze:spec})});
        if(typeof sbCheck401==="function"&&sbCheck401(r))return;
        toast(r.ok?"Skizze gespeichert ✓":"Skizze nur lokal gespeichert","info");
      }catch(e){ toast("Offline – Skizze nur lokal gespeichert","info"); }
    }else{
      // Übung wurde in dieser Sitzung angelegt und hat noch keine Kennung aus der Cloud
      toast("Skizze übernommen – dauerhaft nach dem nächsten Laden","info");
    }
    // Detailfenster neu aufbauen, damit die Zeichnung sofort dasteht
    document.getElementById("uebung-modal")?.remove();
    if(typeof tpShowExercise==="function")tpShowExercise(idx);
  });
}
/* Anschluss an den „Eigene Übung"-Dialog: Vorschau füllen und den Editor öffnen.
   TF_SKIZZE hält die Beschreibung, bis gespeichert wird (saveCustomTraining liest sie). */
function tfSkizzeVorschau(){
  const box=document.getElementById("tf-skizze-vorschau"); if(!box)return;
  const s=window.TF_SKIZZE;
  box.innerHTML=(s&&typeof _skz==="function")
    ? _skz(s)
    : `<div style="font-size:12px;color:var(--text3);padding:14px;text-align:center;border:1px dashed var(--text3);border-radius:10px">Noch keine Skizze – ohne sie zeigt die Übung nur ein Symbolbild.</div>`;
  const del=document.getElementById("tf-skizze-weg");
  if(del)del.style.display=s?"inline-flex":"none";
}
function tfSkizzeWeg(){ window.TF_SKIZZE=null; tfSkizzeVorschau(); }
function tfSkizzeOpen(){
  if(typeof skzEditorOpen!=="function"){toast("Skizzen-Werkzeug lädt noch – gleich nochmal","info");return;}
  skzEditorOpen(window.TF_SKIZZE||null,spec=>{ window.TF_SKIZZE=spec; tfSkizzeVorschau(); });
}
