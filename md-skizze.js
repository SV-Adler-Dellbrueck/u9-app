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
    tx:[[140,25,'Schüsse aus dem Halbfeld']]}},
  /* v517: die Spieltagsformen der F-Jugend nach den Durchführungsbestimmungen des Kreises
     Köln 2026/27 – wer sie am Platz aufbaut, soll sie nicht jedes Mal neu zeichnen müssen.
     Specs deckungsgleich mit den Übungen in uebungen/bibliothek.json. */
  {n:"Spieltag F: 3 gegen 3, vier Minitore", spec:{
    z:[[30,20,220,140]],
    tor:[[22,45,'v',28],[22,107,'v',28],[251,45,'v',28],[251,107,'v',28]],
    li:[[83,20,83,160,'sz'],[197,20,197,160,'sz']],
    h:[[30,20,'y'],[250,20,'y'],[30,160,'y'],[250,160,'y'],[83,20,'r'],[83,160,'r'],[197,20,'r'],[197,160,'r']],
    s:[[100,60,'g'],[120,112,'g'],[150,86,'g'],[172,60,'r'],[186,120,'r'],[212,90,'r']],
    b:[[157,90]],
    tx:[[140,172,'Tor nur aus der Schusszone – Wechsel an der Mittellinie']]}},
  {n:"Spieltag F: 2+1, Jugendtore", spec:{
    z:[[30,20,220,140]],
    tor:[[20,68,'v',44,'j'],[250,68,'v',44,'j']],
    li:[[140,20,140,160,'m']],
    h:[[30,20,'y'],[250,20,'y'],[30,160,'y'],[250,160,'y'],[140,20,'r'],[140,160,'r']],
    s:[[42,90,'b','TW'],[238,90,'b','TW'],[95,60,'g'],[115,118,'g'],[178,66,'r'],[198,122,'r']],
    b:[[122,112]],
    tx:[[140,172,'Tor nur aus der gegnerischen Hälfte – TW spielt flach']]}},
  {n:"Drei gegen einen", spec:{
    z:[[16,40,72,100],[104,40,72,100],[192,40,72,100]],
    h:[[16,40,'y'],[88,40,'y'],[16,140,'y'],[88,140,'y'],[104,40,'y'],[176,40,'y'],[104,140,'y'],[176,140,'y'],[192,40,'y'],[264,40,'y'],[192,140,'y'],[264,140,'y']],
    s:[[52,54,'g'],[26,128,'g'],[78,128,'g'],[52,92,'r'],[140,54,'g'],[114,128,'g'],[166,128,'g'],[140,92,'r'],[228,54,'g'],[202,128,'g'],[254,128,'g'],[228,92,'r']],
    b:[[34,132],[122,132],[210,132]],
    p:[[38,128,68,128,'p'],[126,128,156,128,'p'],[214,128,244,128,'p']],
    tx:[[140,26,'3 Felder 8 x 8 m – Ballverlust: ab in die Mitte'],[140,168,'Ball bleibt am Boden, kein Rückpass']]}}
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
  {id:"jugendtor",emo:"🥅",lbl:"Jugendtor",feld:"tor", j:true},
  {id:"mittellinie",emo:"┃",lbl:"Mittellinie",feld:"li", zwei:true, typ:"m"},
  {id:"schusszone",emo:"┊",lbl:"Schusszone",feld:"li", zwei:true, typ:"sz"},
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
/* v557: Welches Bild gerade bearbeitet wird. 0 ist die Grundbeschreibung (Bild 1), in
   der auch der AUFBAU steht; 1 und höher sind die Schritte, in denen sich nur noch
   Spieler, Ball, Pfeile und Beschriftung bewegen. */
let _skzBildNr=0;
function _skzSchritte(){ if(!Array.isArray(_skzSpec.schritte))_skzSpec.schritte=[]; return _skzSpec.schritte; }
function _skzAktuell(){ return _skzBildNr>0?(_skzSchritte()[_skzBildNr-1]||{}):_skzSpec; }
/* Was auf der Bühne zu sehen ist: Aufbau aus Bild 1, Bewegliches aus dem aktuellen Bild. */
function _skzSicht(){ return _skzBildNr>0?_skzBild(_skzSpec,_skzBildNr):_skzSpec; }
function _skzBeweglich(f){ return (typeof SKZ_BEWEGLICH!=="undefined"?SKZ_BEWEGLICH:["s","b","p","tx"]).includes(f); }

function _skzLeer(){ return {z:[],tor:[],leiter:[],wand:[],p:[],li:[],h:[],s:[],b:[],tx:[]}; }
function _skzKopie(o){ try{return JSON.parse(JSON.stringify(o||{}));}catch(e){return _skzLeer();} }
function _skzMerken(){ _skzVerlauf.push(_skzKopie(_skzSpec)); if(_skzVerlauf.length>40)_skzVerlauf.shift(); }
/* Die Liste, in die geschrieben wird. In einem Schritt wird sie beim ersten Zugriff aus
   dem sichtbaren Bild materialisiert – wer einen mitgeschleppten Pfeil anfasst, ändert
   damit dieses Bild und die folgenden, nicht die davor. */
function _skzListe(f){
  if(_skzBildNr>0&&_skzBeweglich(f)){
    const st=_skzAktuell();
    if(!Array.isArray(st[f]))st[f]=JSON.parse(JSON.stringify(_skzSicht()[f]||[]));
    return st[f];
  }
  if(!Array.isArray(_skzSpec[f]))_skzSpec[f]=[];
  return _skzSpec[f];
}
function _skzWerkzeug(id){ return SKZ_WERK.find(w=>w.id===(id||_skzWerk))||SKZ_WERK[0]; }

/* Wo liegt ein Element? Für den Treffer-Test und fürs Verschieben brauchen alle
   Elemente einen Ankerpunkt – bei Strecken (Pfeil, Zone, Leiter) der Anfang. */
function _skzAnker(feld,e){
  if(feld==="p"||feld==="li")return [e[0],e[1]];   // v517: Linien wie Pfeile am Anfangspunkt fassen
  if(feld==="z")return [e[0]+e[2]/2,e[1]+e[3]/2];
  if(feld==="tor")return [e[0]+((e[2]==="v")?3:(e[3]||24)/2),e[1]+((e[2]==="v")?(e[3]||24)/2:3)];
  if(feld==="leiter")return [e[0]+(e[3]==="v"?8:e[2]/2),e[1]+(e[3]==="v"?e[2]/2:8)];
  return [e[0],e[1]];
}
function _skzTreffer(x,y){
  const felder=["s","h","b","tx","tor","leiter","p","li","z"];  // kleine Dinge zuerst
  let best=null, bd=18;
  const sicht=_skzSicht();
  felder.forEach(f=>(sicht[f]||[]).forEach((e,i)=>{
    const [ax,ay]=_skzAnker(f,e), d=Math.hypot(ax-x,ay-y);
    if(d<bd){bd=d;best={feld:f,idx:i};}
  }));
  return best;
}
function _skzVerschieben(t,x,y){
  const e=_skzListe(t.feld)[t.idx];
  if(!e)return;
  if(t.feld==="p"||t.feld==="li"){ const dx=x-e[0], dy=y-e[1]; e[0]=x; e[1]=y; e[2]+=dx; e[3]+=dy; }
  else if(t.feld==="z"){ e[0]=Math.round(x-e[2]/2); e[1]=Math.round(y-e[3]/2); }
  else { e[0]=Math.round(x); e[1]=Math.round(y); }
}

function skzSetWerkzeug(id){ _skzWerk=id; _skzStart=null; skzEditorZeichnen(); }
function skzSetFarbe(f){ _skzFarbe=f; skzEditorZeichnen(); }
function skzUndo(){ if(!_skzVerlauf.length){toast("Nichts mehr zurückzunehmen","info");return;} _skzSpec=_skzVerlauf.pop(); _skzStart=null; skzEditorZeichnen(); }
function skzLeeren(){ _skzMerken(); _skzSpec=_skzLeer(); _skzBildNr=0; _skzStart=null; skzEditorZeichnen(); }
function skzVorlage(i){
  const v=SKZ_VORLAGEN[i]; if(!v)return;
  _skzMerken(); _skzSpec=Object.assign(_skzLeer(),_skzKopie(v.spec)); _skzBildNr=0; _skzStart=null;
  skzEditorZeichnen(); toast("Vorlage „"+v.n+"“ geladen ✓");
}
function skzSpeichern(){
  /* v517: „li“ gehört in diese Liste. Ohne sie hätte eine Skizze, die NUR aus Mittellinie
     und Schusszone besteht, als leer gegolten und wäre beim Speichern verworfen worden –
     dieselbe Falle wie der Versatz in v514: wer ein Feld hinzufügt, muss auch die Stelle
     nachziehen, die entscheidet, ob überhaupt etwas da ist. */
  const leer=["s","h","b","tor","z","p","li","leiter","tx"].every(f=>!(_skzSpec[f]||[]).length);
  /* Eine leere Schrittliste ist kein Schritt – sie würde nur als Feld mitreisen. */
  if(Array.isArray(_skzSpec.schritte)&&!_skzSpec.schritte.length)delete _skzSpec.schritte;
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
    /* In einem Schritt bleibt die Mannschaft, wie sie ist: gleich viele Spieler und
       Bälle in jedem Bild – sonst liefe im nächsten Bild ein anderes Kind. */
    if(_skzBildNr>0&&(t.feld==="s"||t.feld==="b")){ toast("Spieler und Bälle werden in Bild 1 gesetzt","info"); return; }
    if(_skzBildNr>0&&!_skzBeweglich(t.feld)){ toast("Der Aufbau wird in Bild 1 geändert","info"); return; }
    _skzMerken(); _skzListe(t.feld).splice(t.idx,1); skzEditorZeichnen(); return;
  }
  if(_skzBildNr>0&&w.feld&&!_skzBeweglich(w.feld)){ toast("Der Aufbau wird in Bild 1 gesetzt","info"); return; }
  if(_skzBildNr>0&&(w.feld==="s"||w.feld==="b")){ toast("Spieler und Bälle werden in Bild 1 gesetzt – hier nur verschoben","info"); return; }
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
      _skzListe(w.feld).push([sx,sy,x,y,w.typ]);   // v517: „p“ und „li“ haben dieselbe Form
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
  else if(w.feld==="tor"){
    /* v517: Ein Tor gehört an eine Linie. Bisher entstand JEDES Tor waagerecht – wer eins
       an die Seitenlinie setzen wollte, konnte es am Handy nicht nachträglich drehen.
       Jetzt entscheidet die Tipp-Position: nah am linken oder rechten Rand hochkant und
       bündig an der Linie, sonst quer. Die zweite Koordinate bleibt, wo getippt wurde –
       nur so weit hereingezogen, dass das Tor nicht über den Rasen hinausragt. */
    const j=!!w.j, tief=j?10:7, breit=j?44:30;
    if(x<50)        _skzListe("tor").push([4,        Math.min(y,176-breit),"v",breit].concat(j?["j"]:[]));
    else if(x>230)  _skzListe("tor").push([276-tief, Math.min(y,176-breit),"v",breit].concat(j?["j"]:[]));
    else            _skzListe("tor").push([Math.min(x,276-breit), y,        "h",breit].concat(j?["j"]:[]));
  }
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
  const bl=document.getElementById("skz-bildleiste");
  if(bl)bl.innerHTML=skzBildLeiste();
  const leg=document.getElementById("skz-legende");
  if(leg&&!leg.innerHTML&&typeof skzLegende==="function")leg.innerHTML=skzLegende();
  b.innerHTML=(typeof _skz==="function")?_skz(_skzSicht()):"";
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
    const wz=SKZ_WERK.find(y=>y.id===x.dataset.werk)||{};
    const gesperrt=_skzBildNr>0&&(wz.feld==="s"||wz.feld==="b"||(wz.feld&&!_skzBeweglich(wz.feld)));
    x.disabled=!!gesperrt;
    x.style.opacity=gesperrt?".45":"1";
    x.style.cursor=gesperrt?"not-allowed":"pointer";
    x.title=gesperrt?wz.lbl+" – wird in Bild 1 gesetzt":wz.lbl;
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
  if(hw&&_skzBildNr>0&&(w.feld==="s"||w.feld==="b"||(w.feld&&!_skzBeweglich(w.feld)))){
    hw.textContent="In Bild "+(_skzBildNr+1)+" bewegen sich nur Spieler, Ball, Pfeile und Text. Der Aufbau steht in Bild 1.";
  }
  else if(hw)hw.textContent=w.id==="move"?"Element antippen und ziehen."
    :w.id==="del"?"Element antippen, das weg soll."
    :w.feld==="tor"?"Am linken oder rechten Rand tippen: das Tor steht hochkant und bündig. Sonst quer."
    :w.feld==="li"?(_skzStart?"Jetzt den Endpunkt tippen.":"Startpunkt tippen, dann Endpunkt – die Linie läuft quer über den Platz.")
    :w.zwei?(_skzStart?"Jetzt den Endpunkt tippen.":"Startpunkt tippen, dann Endpunkt.")
    :"Auf den Platz tippen, um „"+w.lbl+"“ zu setzen.";
}

/* Bildleiste des Editors. „+ Bild" übernimmt Spieler, Ball und Beschriftung aus dem
   aktuellen Bild – die PFEILE beginnen leer. Sie zeigen in jedem Bild etwas anderes;
   kopiert müsste man sie erst alle wegtippen, und das ist am Handy die längere Arbeit. */
function skzBildLeiste(){
  const n=(typeof skzBildZahl==="function")?skzBildZahl(_skzSpec):1;
  const max=(typeof SKZ_SCHRITTE_MAX!=="undefined")?SKZ_SCHRITTE_MAX:6;
  const knopf=(i)=>{
    const an=_skzBildNr===i;
    return '<button type="button" onclick="skzBildWahl('+i+')" aria-pressed="'+(an?"true":"false")+'" '
      +'style="min-height:44px;min-width:56px;border:1px solid '+(an?"var(--blue)":"var(--rand-bedien)")+';border-radius:10px;'
      +'background:'+(an?"var(--blue)":"var(--surface)")+';color:'+(an?"#fff":"var(--text2)")+';font-family:inherit;'
      +'font-size:12px;font-weight:700;cursor:pointer">Bild '+(i+1)+'</button>';
  };
  let aus='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">';
  for(let i=0;i<n;i++)aus+=knopf(i);
  if(n-1<max)aus+='<button type="button" onclick="skzBildNeu()" style="min-height:44px;padding:0 12px;border:1px dashed var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text2);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">+ Bild</button>';
  if(_skzBildNr>0)aus+='<button type="button" onclick="skzBildWeg()" style="min-height:44px;padding:0 12px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--red);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">Bild entfernen</button>';
  return aus+'</div>';
}
function skzBildWahl(i){ _skzBildNr=Math.max(0,Number(i)||0); _skzStart=null; _skzZieh=null; skzEditorZeichnen(); }
function skzBildNeu(){
  const max=(typeof SKZ_SCHRITTE_MAX!=="undefined")?SKZ_SCHRITTE_MAX:6;
  if(_skzSchritte().length>=max){ toast("Mehr als "+(max+1)+" Bilder werden unübersichtlich","info"); return; }
  if(!( _skzSpec.s||[]).length){ toast("Erst in Bild 1 Spieler setzen","info"); return; }
  _skzMerken();
  const sicht=_skzSicht();
  _skzSchritte().splice(_skzBildNr,0,{
    s:JSON.parse(JSON.stringify(sicht.s||[])),
    b:JSON.parse(JSON.stringify(sicht.b||[])),
    tx:JSON.parse(JSON.stringify(sicht.tx||[])),
    p:[]
  });
  _skzBildNr=_skzBildNr+1; _skzStart=null;
  skzEditorZeichnen();
  toast("Bild "+(_skzBildNr+1)+" angelegt – jetzt verschieben, was sich bewegt");
}
function skzBildWeg(){
  if(_skzBildNr<1)return;
  _skzMerken();
  _skzSchritte().splice(_skzBildNr-1,1);
  _skzBildNr=Math.min(_skzBildNr-1,_skzSchritte().length);
  _skzStart=null; skzEditorZeichnen();
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
  _skzCb=cb; _skzWerk="spieler"; _skzFarbe="g"; _skzStart=null; _skzVerlauf=[]; _skzZieh=null; _skzBildNr=0;
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
    <div id="skz-bildleiste"></div>
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
/* ═══ v517 – Skizze als Bild weitergeben ═══
   Der Co-Trainer am Platz hat die App nicht offen. Bisher ließ sich eine Skizze nur
   abfotografieren. Jetzt: SVG → Canvas → PNG, dann das Teilen-Blatt des Geräts, sonst ein
   Download. Kein Serveraufruf, keine neue Abhängigkeit.

   Zwei Stolpersteine, die das Bild sonst still zerstören:
   1. Das SVG aus _skz trägt width="100%" und ein style-Attribut. So in ein <img> geladen,
      rasten Browser es in unbestimmter Größe oder gar nicht. Die Kopie bekommt deshalb
      feste Maße und kein style.
   2. Unter der Skizze steht die Legende – die besteht selbst aus <svg>. Gesucht wird
      deshalb gezielt das Bild mit der viewBox der Skizze, nicht einfach das erste. */
const SKZ_PNG_B=1120, SKZ_PNG_H=720;              // Vierfaches der viewBox 280×180
function _skzSlug(s){
  return String(s||"Skizze").toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"skizze";
}
function skzTeilenKnopf(name){
  const n=String(name||"Skizze").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  return '<button type="button" class="skz-teilen" data-name="'+n+'" onclick="skzTeilen(this)" '
    +'style="width:100%;min-height:44px;margin:0 0 8px;border:1px solid var(--rand-bedien);border-radius:10px;'
    +'background:var(--surface);color:var(--text);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">'
    +'📤 Skizze teilen</button>';
}
async function skzTeilen(knopf){
  const name=(knopf&&knopf.dataset&&knopf.dataset.name)||"Skizze";
  const wrap=knopf&&knopf.parentElement;
  const quell=wrap&&[...wrap.querySelectorAll("svg")].find(x=>x.getAttribute("viewBox")==="0 0 280 180");
  if(!quell){ if(typeof toast==="function")toast("Keine Skizze zum Teilen gefunden","err"); return; }
  let url=null;
  try{
    const kopie=quell.cloneNode(true);
    kopie.removeAttribute("style");
    kopie.setAttribute("width",SKZ_PNG_B); kopie.setAttribute("height",SKZ_PNG_H);
    const text=new XMLSerializer().serializeToString(kopie);
    url=URL.createObjectURL(new Blob([text],{type:"image/svg+xml;charset=utf-8"}));
    const bild=new Image();
    await new Promise((fertig,schief)=>{ bild.onload=fertig; bild.onerror=()=>schief(new Error("Bild")); bild.src=url; });
    const c=document.createElement("canvas"); c.width=SKZ_PNG_B; c.height=SKZ_PNG_H;
    c.getContext("2d").drawImage(bild,0,0,SKZ_PNG_B,SKZ_PNG_H);
    const png=await new Promise(fertig=>c.toBlob(fertig,"image/png"));
    if(!png)throw new Error("PNG");
    const nr=(typeof _skzDetailBild==="number"&&_skzDetailBild>0)?("-bild-"+(_skzDetailBild+1)):"";
  const datei=new File([png],_skzSlug(name)+nr+".png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[datei]})){
      try{ await navigator.share({files:[datei],title:name}); }
      /* Wegwischen ist keine Panne – nur echte Fehler melden. */
      catch(e){ if(!e||e.name==="AbortError")return; throw e; }
      return;
    }
    const a=document.createElement("a");
    a.href=URL.createObjectURL(png); a.download=_skzSlug(name)+nr+".png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    if(typeof toast==="function")toast("Skizze gespeichert ✓");
  }catch(e){
    if(typeof toast==="function")toast("Die Skizze ließ sich nicht als Bild erzeugen","err");
  }finally{ if(url)URL.revokeObjectURL(url); }
}

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

/* ═══ v555 – PRÄSENTATIONSMODUS ═══
   „Groß zeigen" öffnet die Skizze bildschirmfüllend: für die Besprechung am Tablet, für
   den Blick aufs Handy in der Sonne, und für jeden, der eine Zeichnung mit 280 px Breite
   nicht mehr gut erkennt.

   Drei Dinge, und nur diese drei:
   • So groß wie möglich bei erhaltenem Seitenverhältnis 280:180.
   • Fingerzoom bis vierfach. Die Skizze ist Vektor – sie bleibt dabei scharf, es wird
     nichts neu gezeichnet, nur die Fläche verschoben und skaliert.
   • Umschalter hell/dunkel. Dunkel bleibt der Standard und die geprüfte Fassung; die
     helle Variante ist für die Sonne. Die Wahl merkt sich das Gerät.

   Die helle Fassung braucht die BESCHREIBUNG der Skizze, nicht das fertige Bild – sie
   entsteht durch Neuzeichnen mit der zweiten Palette. 37 der mitgelieferten Übungen
   tragen noch eine von Hand geschriebene SVG ohne Beschreibung; dort zeigt der
   Präsentationsmodus die vorhandene Zeichnung und sagt, dass es die helle Fassung für
   sie noch nicht gibt. Das ist der zweite Grund, sie nachzuziehen. */
const SKZ_HELL_KEY="adler-skizze-hell";
const SKZ_ZOOM_MAX=4;
let _skzGr=null;   // {spec,svg,name,zoom,x,y,zeiger:Map,d0,z0,letzterTipp}

function skzHellAn(){ try{ return localStorage.getItem(SKZ_HELL_KEY)==="1"; }catch(e){ return false; } }
function _skzHellMerken(an){ try{ localStorage.setItem(SKZ_HELL_KEY,an?"1":"0"); }catch(e){} }

/* Die Beschreibung zu einer Übung – aus der eigenen Spalte oder aus der mitgelieferten
   Tabelle. Gibt es keine, ist die Zeichnung von Hand geschrieben (die 37 Altskizzen). */
function skzSpecVon(f){
  if(!f||typeof f!=="object")return null;
  if(f.skizze&&typeof f.skizze==="object"&&!Array.isArray(f.skizze))return f.skizze;
  if(f.id&&typeof TF_SKIZZEN==="object"&&TF_SKIZZEN[f.id])return TF_SKIZZEN[f.id];
  return null;
}
/* v557 – Bildknöpfe im Detailfenster. Bild 1 ist voreingestellt, damit die Ansicht im
   Training genauso aussieht wie vorher. Hat eine Skizze keine Schritte, gibt es die
   Leiste gar nicht. */
let _skzDetailBild=0;
function skzBilderLeiste(idx){
  const alle=(typeof tpAllForms==="function")?(tpAllForms()||[]):[];
  const spec=skzSpecVon(alle[Number(idx)]);
  const n=(spec&&typeof skzBildZahl==="function")?skzBildZahl(spec):1;
  if(n<2)return "";
  let aus='<div id="skz-detail-bilder" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:0 0 8px">';
  for(let i=0;i<n;i++){
    const an=_skzDetailBild===i;
    aus+='<button type="button" onclick="skzBildSetzen('+Number(idx)+','+i+')" aria-pressed="'+(an?"true":"false")+'" '
      +'style="min-height:44px;min-width:48px;border:1px solid '+(an?"var(--blue)":"var(--rand-bedien)")+';border-radius:10px;'
      +'background:'+(an?"var(--blue)":"var(--surface)")+';color:'+(an?"#fff":"var(--text2)")+';font-family:inherit;'
      +'font-size:12.5px;font-weight:700;cursor:pointer">'+(i+1)+'</button>';
  }
  return aus+'</div>';
}
function skzBildSetzen(idx,n){
  const alle=(typeof tpAllForms==="function")?(tpAllForms()||[]):[];
  const spec=skzSpecVon(alle[Number(idx)]); if(!spec)return;
  _skzDetailBild=Math.max(0,Number(n)||0);
  const box=document.getElementById("uebung-skizze");
  if(box)box.innerHTML=_skz(spec,{bild:_skzDetailBild});
  const leiste=document.getElementById("skz-detail-bilder");
  if(leiste)leiste.outerHTML=skzBilderLeiste(idx);
}
function skzGrossKnopf(name,idx){
  const n=String(name||"Skizze").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  return '<button type="button" onclick="skzGrossOpen('+Number(idx)+')" data-name="'+n+'" '
    +'style="width:100%;min-height:44px;margin:0 0 8px;border:1px solid var(--rand-bedien);border-radius:10px;'
    +'background:var(--surface);color:var(--text);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">'
    +'🔍 Groß zeigen</button>';
}
let _skzGrPassenGebunden=null;
function skzGrossClose(){
  if(_skzGrPassenGebunden){ window.removeEventListener("resize",_skzGrPassenGebunden); _skzGrPassenGebunden=null; }
  document.getElementById("skz-gross-modal")?.remove(); _skzGr=null;
}
function skzGrossHell(){
  if(!_skzGr||!_skzGr.spec)return;
  _skzGr.hell=!_skzGr.hell; _skzHellMerken(_skzGr.hell);
  _skzGrZeichnen();
}
function skzGrossReset(){ if(!_skzGr)return; _skzGr.zoom=1; _skzGr.x=0; _skzGr.y=0; _skzGrLegen(); }

/* Zoom und Verschiebung stecken in EINER Transformation auf dem Halter. Die Skizze
   selbst wird dabei nicht angefasst – deshalb bleibt sie scharf und deshalb kann der
   Umschalter sie jederzeit neu zeichnen, ohne dass der Zoom verlorengeht. */
/* Die Skizze soll so groß stehen, wie der Platz hergibt – ohne dass eine Zahl im
   Stylesheet raten muss, wie hoch Titel, Chips, Legende und Knopfzeile gerade sind.
   Deshalb wird gemessen: alles außer der Bühne zusammenzählen, den Rest bekommt das
   Bild, begrenzt durch das Seitenverhältnis 280:180. Eine Zeile mehr oder weniger
   ändert damit nur die Größe, nie das Layout. */
function _skzGrPassen(){
  const m=document.getElementById("skz-gross-modal"), b=document.getElementById("skz-gross-buehne"),
        h=document.getElementById("skz-gross-halter");
  if(!m||!b||!h)return;
  let rest=0;
  [...m.children].forEach(c=>{ if(c!==b)rest+=c.getBoundingClientRect().height+8; });
  const hoch=Math.max(120,m.clientHeight-rest-20);
  const breit=Math.max(120,Math.min(b.clientWidth,hoch*280/180));
  h.style.width=Math.floor(breit)+"px";
  h.style.height=Math.floor(breit*180/280)+"px";
}
function _skzGrLegen(){
  const h=document.getElementById("skz-gross-halter"); if(!h||!_skzGr)return;
  _skzGrPassen();
  const g=Math.max(1,_skzGr.zoom);
  const b=h.getBoundingClientRect();
  const maxX=Math.max(0,(g-1)*b.width/2), maxY=Math.max(0,(g-1)*b.height/2);
  _skzGr.x=Math.max(-maxX,Math.min(maxX,_skzGr.x));
  _skzGr.y=Math.max(-maxY,Math.min(maxY,_skzGr.y));
  h.style.transform="translate("+Math.round(_skzGr.x)+"px,"+Math.round(_skzGr.y)+"px) scale("+g.toFixed(3)+")";
  const z=document.getElementById("skz-gross-zoom");
  if(z)z.textContent=g>1.02?("Zoom "+g.toFixed(1)+"× · Doppeltipp setzt zurück"):"Zwei Finger zoomen, Doppeltipp setzt zurück";
}
function _skzGrZeichnen(){
  const h=document.getElementById("skz-gross-halter"); if(!h||!_skzGr)return;
  h.innerHTML=_skzGr.spec?_skz(_skzBesetzungSpec(),{hell:_skzGr.hell,bild:_skzGr.bild}):(_skzGr.svg||"");
  const svg=h.querySelector("svg");
  if(svg){ svg.removeAttribute("style"); svg.setAttribute("width","100%"); svg.setAttribute("height","100%");
    svg.style.cssText="display:block;width:100%;height:100%;border-radius:8px"; svg.style.pointerEvents="none"; }
  const leg=document.getElementById("skz-gross-legende");
  if(leg&&typeof skzLegende==="function")leg.innerHTML=skzLegende(_skzGr.hell);
  const u=document.getElementById("skz-gross-hell");
  if(u){ u.innerHTML=_skzGr.hell?"🌙 Dunkler Rasen":"☀️ Heller Rasen";
    u.setAttribute("aria-pressed",_skzGr.hell?"true":"false"); }
  const kb=document.getElementById("skz-gross-kinder");
  if(kb){ kb.innerHTML=_skzGr.besetzung?"🙈 Namen aus":"🧒 Kinder einsetzen";
    kb.setAttribute("aria-pressed",_skzGr.besetzung?"true":"false");
    kb.setAttribute("onclick",_skzGr.besetzung?"skzBesetzungAus()":"skzBesetzungAn()"); }
  _skzGrChips(); _skzGrBilder();
  if(svg&&_skzGr.besetzung)_skzFotosEinsetzen(svg);
  _skzGrLegen();
}
/* Bildknöpfe im großen Fenster: als Zahl beschriftet, nie nur farbig markiert. */
function _skzGrBilder(){
  const box=document.getElementById("skz-gross-bilder"); if(!box||!_skzGr)return;
  const n=(_skzGr.spec&&typeof skzBildZahl==="function")?skzBildZahl(_skzGr.spec):1;
  if(n<2){ box.style.display="none"; box.innerHTML=""; return; }
  box.style.display="flex";
  let aus="";
  for(let i=0;i<n;i++){
    const an=_skzGr.bild===i;
    aus+='<button type="button" onclick="skzGrossBild('+i+')" aria-pressed="'+(an?"true":"false")+'" '
      +'style="min-height:44px;min-width:48px;border:1px solid rgba(255,255,255,.45);border-radius:10px;'
      +'background:'+(an?"#fff":"rgba(255,255,255,.1)")+';color:'+(an?"#111827":"#fff")+';font-family:inherit;'
      +'font-size:13px;font-weight:800;cursor:pointer">'+(i+1)+'</button>';
  }
  box.innerHTML=aus+'<span style="color:rgba(255,255,255,.6);font-size:11.5px;align-self:center">wischen geht auch</span>';
}
function skzGrossBild(n){
  if(!_skzGr)return;
  const max=((_skzGr.spec&&typeof skzBildZahl==="function")?skzBildZahl(_skzGr.spec):1)-1;
  _skzGr.bild=Math.max(0,Math.min(max,Number(n)||0));
  _skzGrZeichnen();
}
function skzGrossWeiter(richtung){
  if(!_skzGr)return;
  const max=((_skzGr.spec&&typeof skzBildZahl==="function")?skzBildZahl(_skzGr.spec):1)-1;
  if(max<1)return;
  skzGrossBild(Math.max(0,Math.min(max,_skzGr.bild+richtung)));
}
function _skzGrAbstand(){
  const p=[..._skzGr.zeiger.values()];
  return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
}
function _skzGrDown(ev){
  if(!_skzGr)return;
  _skzGr.zeiger.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(_skzGr.zeiger.size===2){ _skzGr.d0=_skzGrAbstand()||1; _skzGr.z0=_skzGr.zoom; }
  /* Doppeltipp: zwei Berührungen dicht hintereinander setzen zurück. Auf dem Handy
     gibt es kein dblclick, das kommt erst nach 300 ms Verzögerung – oder gar nicht. */
  const jetzt=Date.now();
  if(_skzGr.zeiger.size===1){
    if(jetzt-(_skzGr.letzterTipp||0)<320)skzGrossReset();
    _skzGr.letzterTipp=jetzt;
    _skzGr.wischX=ev.clientX;
  }
}
function _skzGrMove(ev){
  if(!_skzGr||!_skzGr.zeiger.has(ev.pointerId))return;
  const vor=_skzGr.zeiger.get(ev.pointerId);
  _skzGr.zeiger.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(_skzGr.zeiger.size>=2){
    const d=_skzGrAbstand();
    if(d>0&&_skzGr.d0>0)_skzGr.zoom=Math.max(1,Math.min(SKZ_ZOOM_MAX,_skzGr.z0*d/_skzGr.d0));
    ev.preventDefault(); _skzGrLegen(); return;
  }
  if(_skzGr.zoom>1.02){
    _skzGr.x+=ev.clientX-vor.x; _skzGr.y+=ev.clientY-vor.y;
    ev.preventDefault(); _skzGrLegen();
  }
}
function _skzGrUp(ev){
  if(!_skzGr)return;
  /* Wischen wechselt das Bild – aber nur im nicht gezoomten Zustand, sonst wäre jedes
     Verschieben ein Bildwechsel. Die Knöpfe bleiben der zweite Weg und der für die
     Tastatur. */
  if(_skzGr.zeiger.size===1&&_skzGr.zoom<=1.02&&_skzGr.wischX!=null){
    const weg=ev.clientX-_skzGr.wischX;
    if(Math.abs(weg)>50)skzGrossWeiter(weg<0?1:-1);
  }
  _skzGr.wischX=null;
  _skzGr.zeiger.delete(ev.pointerId);
  if(_skzGr.zeiger.size<2){ _skzGr.d0=0; _skzGr.z0=_skzGr.zoom; }
}
function _skzGrRad(ev){
  if(!_skzGr)return;
  ev.preventDefault();
  _skzGr.zoom=Math.max(1,Math.min(SKZ_ZOOM_MAX,_skzGr.zoom*(ev.deltaY<0?1.12:1/1.12)));
  if(_skzGr.zoom<=1.02){ _skzGr.x=0; _skzGr.y=0; }
  _skzGrLegen();
}
/* ═══ v556 – BESETZUNG: die Kinder finden sich wieder ═══
   In der Skizze steht „S" und „O". Ein Achtjähriger erkennt darin nicht sich selbst.
   Steht im Kreis „Mi" für Mika und am Tablet sein Foto, dann ist es SEINE Aufgabe.

   Drei Festlegungen, jede aus einem Grund:

   1) Die Skizze bleibt neutral. Die Zuordnung Kreis → Kind wird NIE gespeichert – nicht
      in `trainingsformen.skizze`, nicht in `uebungen/*.json`. Das Repo ist öffentlich,
      eine Übung überlebt jeden Jahrgang, und in den öffentlichen Ansichten sind
      Kindernamen maskiert. Was gar nicht erst in der Beschreibung steht, kann dort auch
      nicht durchrutschen. Gearbeitet wird mit dem Kader im Speicher, nicht mit Namen in
      der Zeichnung.

   2) Nur im Präsentationsmodus, nicht im Detailfenster. Das Detailfenster ist die
      Quelle für „Skizze teilen"; läge die Besetzung dort, trüge das geteilte Bild
      Namen und Gesichter von Kindern in eine Nachricht hinaus. So ist der Export ohne
      eine einzige zusätzliche Regel neutral – nicht weil wir daran denken, sondern
      weil es dort nichts zu holen gibt. (Technisch käme dasselbe heraus: ein Foto aus
      dem Speicher färbt die Zeichenfläche ein, `toBlob` bräche mit einem
      Sicherheitsfehler ab.)

   3) Das Foto nur mit Einwilligung und nur ab 600 px gemessener Breite. Darunter ist
      ein Gesicht in einem 16-px-Kreis Matsch. Fehlt die Freigabe, steht das Kürzel –
      ohne Lücke und ohne Hinweis darauf, dass etwas fehlt: in einem Bild, das die ganze
      Gruppe sieht, soll kein Kind bemerken, dass bei ihm etwas fehlt. */
const SKZ_FOTO_AB=600;      // Breite, ab der ein Gesicht im Kreis etwas hergibt

/* Kürzel über den GANZEN aktiven Kader, nicht über die eine Skizze – sonst hieße ein
   Kind mal „Mi" und mal „Mik", je nachdem, wer sonst noch im Bild steht. Höchstens drei
   Zeichen: mehr passen bei Schriftgröße 8 nicht in einen Kreis mit Radius 8, und der
   Tipp-Editor schneidet schon immer auf drei. */
function skzKuerzelMap(kinder){
  const teile=k=>String((k&&k.name)||"").trim().split(/\s+/);
  const gross=t=>t.charAt(0).toUpperCase();
  const stufe=(k,n)=>{
    const t=teile(k), v=t[0]||"", zw=t[1]||"";
    const a=gross(v)+(v.charAt(1)||"").toLowerCase();
    if(n===0)return a;
    if(n===1)return a+(v.charAt(2)||"").toLowerCase();
    return a+(gross(zw)||String(k.nr==null?"":k.nr).charAt(0)||"");
  };
  const map={}, vergeben=new Set();
  let offen=(kinder||[]).slice();
  for(let n=0;n<3&&offen.length;n++){
    const zaehl={};
    offen.forEach(k=>{ const c=stufe(k,n); zaehl[c]=(zaehl[c]||0)+1; });
    const rest=[];
    offen.forEach(k=>{
      const c=stufe(k,n);
      if(zaehl[c]===1&&!vergeben.has(c)&&c.trim()){ map[k.name]=c; vergeben.add(c); }
      else rest.push(k);
    });
    /* Kein Abbruch, wenn eine Stufe nichts löst: der Prüfkader „Kind A" bis „Kind O"
       hängt genau daran – nach „Ki" und „Kin" ist erst die dritte Stufe eindeutig. */
    offen=rest;
  }
  /* Was jetzt noch offen ist, wären zwei Kinder mit identischem Namen UND identischer
     Nummer. Dann entscheidet die Reihenfolge – sichtbar, nicht heimlich. */
  offen.forEach((k,i)=>{ map[k.name]=stufe(k,0).charAt(0)+String(i+1).slice(-2); });
  return map;
}
/* Wer heute da ist. Erste Wahl ist die Anwesenheit, die der Trainingsplan für den
   gewählten Termin ohnehin führt; sonst der aktive Kader. */
function skzBesetzungQuelle(){
  const alle=(typeof kaderAktiv==="function")?kaderAktiv():[];
  let da=null;
  try{ if(typeof TP_ANWESEND!=="undefined"&&Array.isArray(TP_ANWESEND)&&TP_ANWESEND.length)da=TP_ANWESEND; }catch(e){}
  if(!da)return alle;
  const namen=da.map(x=>(typeof x==="string")?x:((x&&x.name)||""));
  const treffer=alle.filter(k=>namen.includes(k.name));
  return treffer.length?treffer:alle;
}
/* Nur im Trainer-Zugang und nur mit geladenem Kader. In den öffentlichen Ansichten und
   im Eltern-Bereich gibt es beides nicht – dort bleibt die Skizze neutral. */
function skzBesetzungMoeglich(){
  if(typeof sbToken!=="function"||!sbToken())return false;
  return (typeof kaderAktiv==="function")&&kaderAktiv().length>0;
}
function _skzKreise(spec){ return (spec&&Array.isArray(spec.s))?spec.s:[]; }
/* Besetzt werden alle Kreise außer den neutralen („w") – das sind Trainer, Anspieler
   und Zielpersonen, keine Mitspieler. */
function _skzBesetzbar(spec){
  return _skzKreise(spec).map((sp,i)=>({i,farbe:sp[2]||"g"})).filter(x=>x.farbe!=="w").map(x=>x.i);
}
function skzBesetzungAn(){
  if(!_skzGr||!_skzGr.spec)return;
  if(!skzBesetzungMoeglich()){ if(typeof toast==="function")toast("Dafür muss der Kader geladen sein","info"); return; }
  const kinder=skzBesetzungQuelle();
  const kuerzel=skzKuerzelMap((typeof kaderAktiv==="function")?kaderAktiv():kinder);
  const plaetze=_skzBesetzbar(_skzGr.spec);
  _skzGr.besetzung={};
  plaetze.forEach((kreis,n)=>{
    const k=kinder[n]; if(!k)return;
    _skzGr.besetzung[kreis]={name:k.name,kuerzel:kuerzel[k.name]||"?",
      fotoPath:k.foto_path||null,fotoOk:!!k.foto_stadionheft_ok};
  });
  _skzGr.tausch=null;
  if(!Object.keys(_skzGr.besetzung).length){ _skzGr.besetzung=null; if(typeof toast==="function")toast("Keine Kinder zum Einsetzen gefunden","info"); }
  _skzGrZeichnen();
}
function skzBesetzungAus(){ if(!_skzGr)return; _skzGr.besetzung=null; _skzGr.tausch=null; _skzGrZeichnen(); }
/* Zwei Kinder tauschen: erst das eine antippen, dann das andere – dieselbe Geste wie
   beim Tauschen zweier Teams im Festival-Planer. */
function skzBesetzungTausch(kreis){
  if(!_skzGr||!_skzGr.besetzung)return;
  if(_skzGr.tausch==null){ _skzGr.tausch=kreis; _skzGrChips(); return; }
  if(_skzGr.tausch===kreis){ _skzGr.tausch=null; _skzGrChips(); return; }
  const a=_skzGr.tausch, b=kreis, B=_skzGr.besetzung;
  const hin=B[a]; B[a]=B[b]; B[b]=hin;
  if(!B[a])delete B[a];
  if(!B[b])delete B[b];
  _skzGr.tausch=null;
  _skzGrZeichnen();
}
/* Eine Kopie der Beschreibung, in der nur das Kürzel im Kreis ausgetauscht ist. Die
   Beschreibung der Übung selbst wird dabei nicht angefasst. */
function _skzBesetzungSpec(){
  const spec=_skzGr.spec;
  if(!_skzGr.besetzung)return spec;
  const kopie=JSON.parse(JSON.stringify(spec));
  (kopie.s||[]).forEach((sp,i)=>{ const k=_skzGr.besetzung[i]; if(k)sp[3]=k.kuerzel; });
  return kopie;
}
/* Fotos in die Kreise. Die Kreise stehen im SVG in derselben Reihenfolge wie in der
   Liste „s" – deshalb reicht der Index, es braucht keine Kennzeichnung im Bild.
   Die Mannschaftsfarbe wandert dabei von der Füllung auf den Rand, damit sie neben dem
   Gesicht sichtbar bleibt; das Kürzel rutscht als Schild unter den Kreis. Farbe ist
   also auch hier nicht der einzige Träger. */
async function _skzFotosEinsetzen(svg){
  if(!svg||!_skzGr||!_skzGr.besetzung)return;
  if(typeof fotoLoadImage!=="function")return;
  const breite=Math.round(svg.getBoundingClientRect().width);
  if(breite<SKZ_FOTO_AB)return;
  const kreise=[...svg.querySelectorAll('circle[r="8"]')];
  const texte=[...svg.querySelectorAll('text')];
  const NS="http://www.w3.org/2000/svg";
  const lauf=_skzGr.lauf=(_skzGr.lauf||0)+1;
  for(const idx of Object.keys(_skzGr.besetzung)){
    const k=_skzGr.besetzung[idx], kr=kreise[Number(idx)];
    if(!kr||!k.fotoOk||!k.fotoPath)continue;
    const bild=await fotoLoadImage(k.fotoPath).catch(()=>null);
    if(!bild||!_skzGr||_skzGr.lauf!==lauf||!kr.isConnected)continue;
    const cx=+kr.getAttribute("cx"), cy=+kr.getAttribute("cy"), farbe=kr.getAttribute("fill");
    const id="skzf-"+lauf+"-"+idx;
    const cp=document.createElementNS(NS,"clipPath"); cp.setAttribute("id",id);
    const c2=document.createElementNS(NS,"circle");
    c2.setAttribute("cx",cx); c2.setAttribute("cy",cy); c2.setAttribute("r","8");
    cp.appendChild(c2); svg.appendChild(cp);
    const im=document.createElementNS(NS,"image");
    im.setAttribute("x",cx-8); im.setAttribute("y",cy-8);
    im.setAttribute("width","16"); im.setAttribute("height","16");
    im.setAttribute("preserveAspectRatio","xMidYMid slice");
    im.setAttribute("clip-path","url(#"+id+")");
    im.setAttribute("href",bild.src);
    kr.parentNode.insertBefore(im,kr.nextSibling);
    kr.setAttribute("stroke",farbe); kr.setAttribute("stroke-width","2.5");
    /* Das Kürzel stand mitten im Kreis – dort liegt jetzt das Gesicht. */
    const t=texte.find(x=>Math.abs(+x.getAttribute("x")-cx)<1&&Math.abs(+x.getAttribute("y")-(cy+3))<1);
    if(t){
      t.setAttribute("y",cy+17); t.setAttribute("font-size","7");
      t.setAttribute("fill",_skzGr.hell?"rgba(17,24,39,.95)":"rgba(255,255,255,.95)");
      const schild=document.createElementNS(NS,"rect");
      const w=Math.max(12,String(k.kuerzel).length*5+6);
      schild.setAttribute("x",cx-w/2); schild.setAttribute("y",cy+10.5);
      schild.setAttribute("width",w); schild.setAttribute("height","9");
      schild.setAttribute("rx","3"); schild.setAttribute("fill",farbe);
      t.parentNode.insertBefore(schild,t);
      t.parentNode.appendChild(t);
    }
  }
}
/* Die Chipreihe unter der Skizze: je besetztem Kreis ein Knopf mit Kürzel und Namen.
   Zwei antippen tauscht sie. */
function _skzGrChips(){
  const box=document.getElementById("skz-gross-chips"); if(!box||!_skzGr)return;
  if(!_skzGr.besetzung){ box.innerHTML=""; box.style.display="none"; return; }
  const F=(typeof skzPalette==="function")?skzPalette(_skzGr.hell).F:{};
  const kreise=_skzKreise(_skzGr.spec);
  const teile=Object.keys(_skzGr.besetzung).map(i=>{
    const k=_skzGr.besetzung[i], farbe=F[(kreise[i]||[])[2]]||"#4ade80";
    const an=String(_skzGr.tausch)===String(i);
    return '<button type="button" onclick="skzBesetzungTausch('+Number(i)+')" aria-pressed="'+(an?"true":"false")+'" '
      +'style="min-height:44px;padding:4px 10px;border-radius:10px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;'
      +'border:2px solid '+(an?"#fff":"transparent")+';background:'+farbe+';color:rgba(0,0,0,.75);display:inline-flex;align-items:center;gap:6px">'
      +'<span style="font-weight:800">'+esc(k.kuerzel)+'</span>'+esc(k.name)+'</button>';
  }).join("");
  box.style.display="flex";
  box.innerHTML=teile+(_skzGr.tausch!=null
    ? '<span style="color:rgba(255,255,255,.8);font-size:11.5px;align-self:center">jetzt das zweite Kind antippen</span>'
    : '<span style="color:rgba(255,255,255,.6);font-size:11.5px;align-self:center">zwei antippen tauscht sie</span>');
}
/* Einstieg. `idx` ist die Stelle in tpAllForms() – dieselbe Zahl, mit der das
   Detailfenster geöffnet wurde. */
function skzGrossOpen(idx){
  const alle=(typeof tpAllForms==="function")?(tpAllForms()||[]):[];
  const f=alle[Number(idx)];
  if(!f){ if(typeof toast==="function")toast("Übung nicht gefunden","err"); return; }
  const spec=skzSpecVon(f);
  if(!spec&&!(f.svg&&f.svg.length>10)){ if(typeof toast==="function")toast("Zu dieser Übung gibt es keine Skizze","info"); return; }
  document.getElementById("skz-gross-modal")?.remove();
  _skzGr={spec,svg:f.svg||"",name:f.name||"Skizze",zoom:1,x:0,y:0,hell:spec?skzHellAn():false,
          zeiger:new Map(),d0:0,z0:1,letzterTipp:0,besetzung:null,tausch:null,lauf:0,bild:0,wischX:null};
  const m=document.createElement("div");
  m.id="skz-gross-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true");
  m.setAttribute("aria-label","Skizze groß: "+_skzGr.name);
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;flex-direction:column;"
    +"align-items:center;justify-content:center;padding:10px;gap:8px;overscroll-behavior:contain";
  m.style.zIndex=(typeof zOben==="function")?zOben(10006):10006;
  m.onclick=e=>{ if(e.target===m)skzGrossClose(); };
  m.innerHTML=`<div style="color:#fff;font-size:14px;font-weight:800;text-align:center;max-width:95vw">${esc(_skzGr.name)}</div>
    <div id="skz-gross-buehne" style="flex:1 1 auto;min-height:0;width:100%;max-width:95vw;
         display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none">
      <div id="skz-gross-halter" style="transform-origin:center center;will-change:transform"></div>
    </div>
    <div id="skz-gross-zoom" style="color:rgba(255,255,255,.75);font-size:11px;text-align:center;min-height:14px"></div>
    <div id="skz-gross-bilder" style="display:none;gap:6px;flex-wrap:wrap;justify-content:center;max-width:95vw"></div>
    <div id="skz-gross-chips" style="display:none;gap:6px;flex-wrap:wrap;justify-content:center;max-width:min(95vw,720px)"></div>
    <div id="skz-gross-legende" style="background:rgba(255,255,255,.08);border-radius:10px;padding:2px 8px;max-width:95vw"></div>
    ${spec?"":`<div style="color:rgba(255,255,255,.7);font-size:11.5px;text-align:center;max-width:95vw;line-height:1.5">
          Für diese ältere Zeichnung gibt es die helle Fassung noch nicht.</div>`}
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:min(95vw,520px)">
      ${(spec&&skzBesetzungMoeglich())?`<button id="skz-gross-kinder" type="button" onclick="skzBesetzungAn()" aria-pressed="false"
          style="flex:1 1 130px;min-height:56px;padding:0 12px;border:1px solid rgba(255,255,255,.45);border-radius:10px;
                 background:rgba(255,255,255,.1);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer">🧒 Kinder einsetzen</button>`:""}
      ${spec?`<button id="skz-gross-hell" type="button" onclick="skzGrossHell()" aria-pressed="false"
          style="flex:1 1 130px;min-height:56px;padding:0 12px;border:1px solid rgba(255,255,255,.45);border-radius:10px;
                 background:rgba(255,255,255,.1);color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer"></button>`:""}
      <button type="button" onclick="skzGrossClose()" class="btn btn-p"
        style="flex:1 1 130px;min-height:56px;justify-content:center;font-size:15px">Schließen</button>
    </div>`;
  document.body.appendChild(m);
  const b=document.getElementById("skz-gross-buehne");
  b.addEventListener("pointerdown",_skzGrDown);
  b.addEventListener("pointermove",_skzGrMove);
  b.addEventListener("pointerup",_skzGrUp);
  b.addEventListener("pointercancel",_skzGrUp);
  b.addEventListener("pointerleave",_skzGrUp);
  b.addEventListener("wheel",_skzGrRad,{passive:false});
  _skzGrPassenGebunden=()=>_skzGrLegen();
  window.addEventListener("resize",_skzGrPassenGebunden);
  _skzGrZeichnen();
}
