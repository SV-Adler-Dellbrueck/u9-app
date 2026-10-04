/* ═══════════════════════════════════
   ADLER NEST ALS AUSGABEN (v733) – Auftragspaket 03.10.2026.
   Nach jedem Spieltag eine eigene, nummerierte Ausgabe (heft_ausgabe), nur hinter dem Login:
   die Elternfotos der Spieltagsgalerie haben keine Kind-Zuordnung und zeigen auch Gegnerkinder.
   Texte und Hördatei entstehen im Projekt-Chat; hier: lesen und hören (Eltern, Kinder-Konten,
   Trainer) und der Editor für das Trainerteam (Fotoauswahl, Uploads, Freigabe, Veröffentlichen).

   Lesen läuft nur über die Hüllfunktionen heft_ausgabe_lesen / heft_medien / heft_ausgaben_liste:
   Spieltagskarte, Teams und Kapitäne kommen dort aus den App-Daten, nie aus Freitext; tag_quellen,
   der Grund für die Rückennummer und das Geburtsdatum verlassen die Datenbank nicht.

   Gestaltung: Vereinsblau, Gelb und Dunkelblau nur hier im Heft (bewusste Ausnahme von der
   Statusfarbenregel – das Heft ist ein Lesestück, keine Bedienoberfläche). Barlow und Barlow
   Condensed liegen in vendor/ (SIL OFL) – kein Aufruf an Google beim Lesen.
═══════════════════════════════════ */
const NEST_MAX_FOTOS=6, NEST_MAX_PRIVAT=2;
const NEST_FELDER=["schlagzeile","teaser_spieltag","teaser_portraet","teaser_tag","anpfiff","spieltag_text","zitat","eltern_dank","sonderzeile","portraet_einleitung","portraet_trainersatz","training_leitfrage","training_text","tag_lernen","tag_lustig","tag_quellen","kommentar"];
let _nestUrls=[];   // Blob-URLs der offenen Ausgabe – beim Schließen freigeben

function nestStil(){
  if(!document.getElementById("nest-schrift")){
    const l=document.createElement("link"); l.id="nest-schrift"; l.rel="stylesheet"; l.href="vendor/barlow.css"; document.head.appendChild(l);
  }
  if(document.getElementById("nest-stil"))return;
  const s=document.createElement("style"); s.id="nest-stil";
  s.textContent=`
  .nest-heft{--heft-blau:#0044AA;--heft-gelb:#F5B700;--heft-dunkel:#0A1A3A;--heft-papier:#ffffff;--heft-text:#0A1A3A;--heft-grau:#45506a;
    font-family:'Barlow',system-ui,sans-serif;color:var(--heft-text);max-width:430px;margin:0 auto;background:var(--heft-papier);line-height:1.5}
  .nest-heft *{box-sizing:border-box}
  .nest-heft .nc{font-family:'Barlow Condensed','Barlow',system-ui,sans-serif}
  .nest-kopf{display:flex;justify-content:space-between;align-items:center;background:var(--heft-blau);color:#fff;padding:10px 16px;font-family:'Barlow Condensed','Barlow',sans-serif;font-weight:600;font-size:17px;letter-spacing:.4px}
  .nest-titelbild{display:block;width:100%;aspect-ratio:390/560;object-fit:cover;background:var(--heft-dunkel)}
  .nest-titel-leer{width:100%;aspect-ratio:390/560;background:var(--heft-dunkel);color:var(--heft-gelb);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800}
  .nest-marke{background:var(--heft-blau);color:#fff;padding:14px 16px 0;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:76px;line-height:.86;letter-spacing:1px}
  .nest-band{display:inline-block;background:var(--heft-gelb);color:var(--heft-dunkel);font-family:'Barlow Condensed',sans-serif;font-weight:800;padding:4px 10px;font-size:17px;letter-spacing:.3px;text-transform:uppercase}
  .nest-unten{background:var(--heft-dunkel);color:#fff;padding:16px}
  .nest-schlagzeile{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:44px;line-height:.98;text-transform:uppercase;margin:10px 0 6px;overflow-wrap:anywhere}
  .nest-hoeren{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;margin:14px 0;padding:10px 14px;border:2px solid var(--heft-gelb);border-radius:12px;background:transparent;color:#fff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;text-align:left}
  .nest-hoeren:focus-visible,.nest-heft button:focus-visible,.nest-heft a:focus-visible{outline:3px solid var(--heft-gelb);outline-offset:2px}
  .nest-hoeren .nest-play{flex:none;width:40px;height:40px;border-radius:50%;background:var(--heft-gelb);color:var(--heft-dunkel);display:flex;align-items:center;justify-content:center;font-size:18px}
  .nest-imheft{border-top:1px solid rgba(255,255,255,.25);padding-top:10px}
  .nest-imheft div{padding:5px 0;font-size:16px}
  .nest-imheft b{color:var(--heft-gelb);font-family:'Barlow Condensed',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.4px;margin-right:6px}
  .nest-abschnitt{padding:22px 16px;border-top:6px solid var(--heft-blau)}
  .nest-h2{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:32px;line-height:1;text-transform:uppercase;color:var(--heft-blau);margin:0 0 12px}
  .nest-h3{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:22px;text-transform:uppercase;color:var(--heft-blau);margin:18px 0 8px}
  .nest-p{font-size:17px;margin:0 0 10px;white-space:pre-line}
  .nest-karte{background:#eef3fb;border-left:5px solid var(--heft-blau);border-radius:8px;padding:10px 12px;margin:12px 0;font-size:15px}
  .nest-karte div{padding:2px 0}
  .nest-karte b{display:inline-block;min-width:92px;color:var(--heft-grau);font-weight:600}
  .nest-zitat{border-left:6px solid var(--heft-gelb);background:var(--heft-dunkel);color:#fff;border-radius:8px;padding:12px 14px;margin:12px 0;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:22px;line-height:1.2}
  .nest-team{border:1px solid #d6deeb;border-radius:10px;padding:10px 12px;margin:8px 0}
  .nest-team .nc{font-weight:800;font-size:20px;color:var(--heft-blau)}
  .nest-fotos{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 0}
  .nest-fotos button{padding:0;border:none;background:#dfe6f2;aspect-ratio:1;cursor:pointer;border-radius:6px;overflow:hidden}
  .nest-fotos img{width:100%;height:100%;object-fit:cover;display:block;-webkit-touch-callout:none;user-select:none}
  .nest-gelb{background:var(--heft-gelb);color:var(--heft-dunkel);border-radius:10px;padding:12px 14px;margin:12px 0;font-size:16px}
  .nest-gelb .nc{font-weight:800;font-size:20px;text-transform:uppercase;display:block;margin-bottom:4px}
  .nest-portraet-kopf{position:relative;background:var(--heft-blau);color:#fff;padding:18px 16px;overflow:hidden;min-height:150px;display:flex;gap:14px;align-items:center}
  .nest-portraet-kopf .nest-nr-bg{position:absolute;right:-6px;top:-24px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:190px;line-height:1;color:rgba(255,255,255,.14);pointer-events:none}
  .nest-portraet-kopf img{position:relative;width:104px;height:104px;border-radius:50%;object-fit:cover;border:4px solid var(--heft-gelb);background:var(--heft-dunkel)}
  .nest-portraet-kopf .nest-name{position:relative;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:48px;line-height:.95;text-transform:uppercase}
  .nest-steckbrief{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
  .nest-steckbrief div{background:#eef3fb;border-radius:8px;padding:8px 10px;font-size:15px}
  .nest-steckbrief small{display:block;color:var(--heft-grau);font-size:13px;font-weight:600}
  .nest-qa{border-bottom:1px solid #e1e7f0;padding:7px 0;font-size:16px}
  .nest-qa b{display:block;color:var(--heft-blau)}
  .nest-privat{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
  .nest-privat figure{margin:0}
  .nest-privat img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;display:block;background:#dfe6f2;-webkit-touch-callout:none}
  .nest-privat figcaption{font-size:14px;color:var(--heft-grau);margin-top:4px}
  .nest-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
  .nest-chips span{border:1px solid #c9d4e6;border-radius:999px;padding:4px 10px;font-size:15px}
  .nest-chips small{color:var(--heft-grau);margin-right:4px}
  .nest-tag{background:var(--heft-dunkel);color:#fff;border-radius:10px;padding:14px;margin:12px 0}
  .nest-tag .nest-jahr{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:40px;line-height:1}
  .nest-tag .lern{color:var(--heft-gelb)}
  .nest-tag .nc{font-weight:800;text-transform:uppercase;font-size:18px;letter-spacing:.4px}
  .nest-ende{background:var(--heft-blau);color:#fff;text-align:center;padding:20px 16px 26px;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:34px;text-transform:uppercase}
  .nest-zurueck{display:block;width:100%;min-height:52px;margin-top:14px;border:none;border-radius:12px;background:var(--heft-gelb);color:var(--heft-dunkel);font-family:'Barlow',sans-serif;font-size:17px;font-weight:700;cursor:pointer}
  .nest-archiv{padding:16px;background:#f3f6fb}
  .nest-archiv button{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;min-height:48px;margin:6px 0;padding:8px 12px;border:1px solid #c9d4e6;border-radius:10px;background:#fff;color:var(--heft-text);font-family:inherit;font-size:16px;cursor:pointer;text-align:left}
  .nest-archiv button[aria-current="true"]{border:2px solid var(--heft-blau);font-weight:700}
  `;
  document.head.appendChild(s);
}
function _nestAufraeumen(){ _nestUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}}); _nestUrls=[]; }
async function nestBlobUrl(bucket,pfad){
  if(!pfad)return null;
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/${bucket}/${pfad}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return null;
    const u=URL.createObjectURL(await r.blob()); _nestUrls.push(u); return u;
  }catch(e){return null;}
}
async function _nestRpc(name,body){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body||{})});
    if(typeof sbCheck401==="function"&&sbCheck401(r))return null;
    return r.ok?await r.json():null;
  }catch(e){return null;}
}
function _nestDatum(iso,lang){
  if(!iso)return "";
  try{ return new Date(String(iso).slice(0,10)+"T12:00:00").toLocaleDateString("de-DE",lang?{weekday:"long",day:"numeric",month:"long",year:"numeric"}:{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"}); }catch(e){ return iso; }
}
function _nestZeit(t){ return t?String(t).slice(0,5):""; }
function _nestDauer(s){ s=Number(s)||0; if(!s)return ""; return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")+" Min."; }
function _nestNr(n){ return String(n||0).padStart(2,"0"); }
// „Kinderfestival · FC Chorweiler U9“ → Format und Gegner; sonst aus typ/gegner
function nestFormatGegner(t){
  if(!t)return {format:"",gegner:""};
  const teile=String(t.titel||"").split("·").map(x=>x.trim()).filter(Boolean);
  const format=(t.typ==="turnier"?(teile[0]||"Turnier"):(t.typ==="spiel"?"Spiel":(teile[0]||"")));
  const gegner=t.gegner||(teile.length>1?teile.slice(1).join(" · "):"");
  return {format,gegner};
}
function nestSpielform(s){
  const m={funino:"FUNiño","3plus1":"3+1","3+1":"3+1","4plus1":"4+1","5plus1":"5+1","7er":"7 gegen 7"};
  return String(s||"").split(/[,;]/).map(x=>x.trim()).filter(Boolean).map(x=>m[x.toLowerCase()]||x).join(" und ");
}
// „1990: …“ oder „(1990) …“ → Jahreszahl und Text getrennt
function nestJahr(txt){
  const m=/^\s*\(?(\d{3,4})\)?\s*[:–—-]?\s+/.exec(String(txt||""));
  return m?{jahr:m[1],text:String(txt).slice(m[0].length)}:{jahr:"",text:String(txt||"")};
}

/* ── Leseansicht ─────────────────────────────────────────── */
async function nestOpen(ausgabeId){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  nestStil();
  let m=document.getElementById("nest-modal");
  if(!m){
    m=document.createElement("div"); m.id="nest-modal";
    m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Adler Nest");
    m.style.cssText="position:fixed;inset:0;background:#0A1A3A;overflow-y:auto;-webkit-overflow-scrolling:touch";
    m.style.zIndex=zOben(9998);
    m.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!document.getElementById("nest-gross"))nestClose(); });
    document.body.appendChild(m);
  }
  _nestAufraeumen();
  m.innerHTML=`<div class="nest-heft" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 16px;color:#fff;background:#0A1A3A">Das Adler Nest wird aufgeschlagen …</div>`;
  const liste=(await _nestRpc("heft_ausgaben_liste"))||[];
  const id=ausgabeId||(liste[0]&&liste[0].id);
  if(!id){
    m.innerHTML=`<div class="nest-heft" style="min-height:100vh">
      <div class="nest-kopf"><span>SV Adler Dellbrück · U9</span><span>Adler Nest</span></div>
      <div style="padding:28px 16px"><p class="nest-p" id="nest-leer">Noch ist keine Ausgabe erschienen – nach dem nächsten Spieltag geht es los. 🦅</p>
      <button type="button" class="nest-zurueck" onclick="nestClose()">Zurück zur App</button></div></div>`;
    m.querySelector(".nest-zurueck")?.focus();
    return;
  }
  const [d,medien]=await Promise.all([_nestRpc("heft_ausgabe_lesen",{p_ausgabe:id}),_nestRpc("heft_medien",{p_ausgabe:id})]);
  if(!d||!d.ausgabe){
    m.innerHTML=`<div class="nest-heft" style="min-height:100vh;padding:28px 16px"><p class="nest-p">Diese Ausgabe lässt sich gerade nicht öffnen. Prüfe die Verbindung und versuche es noch einmal.</p><button type="button" class="nest-zurueck" onclick="nestClose()">Zurück zur App</button></div>`;
    return;
  }
  m.innerHTML=nestHtml(d,medien||[],liste,id);
  m.scrollTop=0;
  nestMedienLaden(d,medien||[]);
  try{ if(typeof elternNewsSeen==="function")elternNewsSeen("nest"); }catch(e){}
}
function nestClose(){
  const a=document.getElementById("nest-audio"); try{a&&a.pause();}catch(e){}
  document.getElementById("nest-modal")?.remove(); document.getElementById("nest-gross")?.remove();
  _nestAufraeumen();
}
function nestHtml(d,medien,liste,aktivId){
  const a=d.ausgabe||{}, t=d.termin, p=d.portraet;
  const fg=nestFormatGegner(t);
  const hatTitel=medien.some(x=>x.art==="titelbild"), audio=medien.find(x=>x.art==="audio");
  const fotos=medien.filter(x=>x.art==="galerie"), privat=medien.filter(x=>x.art==="privat");
  const band=[fg.format,fg.gegner,t?(t.heim?"heim":"auswärts"):""].filter(Boolean).join(" · ");
  const imHeft=[["Spieltag",a.teaser_spieltag],["Porträt",a.teaser_portraet],["An diesem Tag",a.teaser_tag]].filter(x=>x[1]);
  // a) Deckblatt
  let h=`<div class="nest-heft" id="nest-heft">
  <section class="nest-deckblatt" data-abschnitt="deckblatt" aria-label="Deckblatt">
    <div class="nest-kopf"><span>SV Adler Dellbrück · U9</span><span>Ausgabe ${_nestNr(a.nummer)}</span></div>
    ${hatTitel?`<img id="nest-titelbild" class="nest-titelbild" alt="Titelbild: das Adler-Maskottchen" draggable="false">`
      :`<div class="nest-titel-leer" aria-hidden="true"><span style="font-size:22px;letter-spacing:2px">AUSGABE</span><span style="font-size:200px;line-height:.9">${_nestNr(a.nummer)}</span></div>`}
    <div class="nest-marke" aria-label="Adler Nest">ADLER<br>NEST</div>
    <div style="background:var(--heft-blau);padding:8px 16px 14px"><span class="nest-band">Das Vereinsheft der jungen Adler</span></div>
    <div class="nest-unten">
      ${band?`<span class="nest-band">${esc(band)}</span>`:""}
      ${a.schlagzeile?`<h1 class="nest-schlagzeile">${esc(a.schlagzeile)}</h1>`:""}
      <div style="font-size:16px;opacity:.9">${esc(_nestDatum(t?t.datum:(a.veroeffentlicht_am||""),true))}</div>
      ${audio?`<button type="button" class="nest-hoeren" id="nest-hoeren" onclick="nestHoeren()" aria-label="Adler Nest zum Hören abspielen${a.audio_sekunden?", "+_nestDauer(a.audio_sekunden):""}">
          <span class="nest-play" aria-hidden="true" id="nest-play">▶</span><span style="flex:1">Adler Nest zum Hören${a.audio_sekunden?`<br><span style="font-weight:400;opacity:.85" id="nest-dauer">${_nestDauer(a.audio_sekunden)}</span>`:""}</span></button>
        <audio id="nest-audio" preload="none" onended="nestHoerenEnde()"></audio>`:""}
      ${imHeft.length?`<div class="nest-imheft"><div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.8">Im Heft</div>${imHeft.map(([r,x])=>`<div><b>${r}</b>${esc(x)}</div>`).join("")}</div>`:""}
    </div>
  </section>`;
  // b) Spieltag
  const teams=(d.teams||[]).filter(tm=>(tm.kinder||[]).length);
  const erg=(d.ergebnisse||[]);
  const ergZeile=t&&t.ergebnis?esc(t.ergebnis):erg.length?erg.map(e=>`${teams.length>1||erg.some(x=>x.team>1)?"Adler "+e.team+": ":""}${e.tore}:${e.gegentore}${e.gegner?" gegen "+esc(e.gegner):""}`).join("<br>"):"";
  const spieltag=[a.anpfiff,t,a.spieltag_text,teams.length,fotos.length,a.eltern_dank,a.sonderzeile].some(Boolean);
  if(spieltag){
    const absaetze=String(a.spieltag_text||"").split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean);
    const bericht=absaetze.map((x,i)=>`<p class="nest-p">${esc(x)}</p>${i===0&&a.zitat?`<blockquote class="nest-zitat">„${esc(a.zitat)}“</blockquote>`:""}`).join("")||(a.zitat?`<blockquote class="nest-zitat">„${esc(a.zitat)}“</blockquote>`:"");
    h+=`<section class="nest-abschnitt" data-abschnitt="spieltag" aria-label="Spieltag">
      <h2 class="nest-h2">Spieltag</h2>
      ${a.anpfiff?`<p class="nest-p" style="font-weight:600">${esc(a.anpfiff)}</p>`:""}
      ${t?`<div class="nest-karte" id="nest-spieltagskarte">
        ${fg.format?`<div><b>Format</b>${esc(fg.format)}</div>`:""}
        <div><b>Gastgeber</b>${t.heim?"SV Adler Dellbrück":esc(fg.gegner||"auswärts")}</div>
        ${t.ort?`<div><b>Ort</b>${esc(t.ort)}</div>`:""}
        ${t.uhrzeit?`<div><b>Zeit</b>${_nestZeit(t.uhrzeit)}${t.uhrzeit_ende?"–"+_nestZeit(t.uhrzeit_ende):""} Uhr</div>`:""}
        ${t.spielform?`<div><b>Spielform</b>${esc(nestSpielform(t.spielform))}</div>`:""}
        ${teams.length?`<div><b>Teams</b>${teams.length===1?"ein Adler-Team":teams.length+" Adler-Teams"}</div>`:""}
        ${ergZeile?`<div id="nest-ergebnis"><b>Ergebnis</b>${ergZeile}</div>`:""}
      </div>`:""}
      ${bericht?`<h3 class="nest-h3">Vom Platz</h3>${bericht}`:""}
      ${teams.length?`<h3 class="nest-h3">Unsere Teams</h3>${teams.map(tm=>`<div class="nest-team" data-team="${Number(tm.nr)}">
          <div class="nc">Adler ${Number(tm.nr)}</div>
          <div>${(tm.kinder||[]).map(k=>esc(k.name)+(k.kapitaen?" (C)":"")).join(", ")}</div>
          ${(tm.trainer||[]).length?`<div style="color:var(--heft-grau);font-size:15px">Trainer: ${tm.trainer.map(esc).join(", ")}</div>`:""}
        </div>`).join("")}`:""}
      ${fotos.length?`<h3 class="nest-h3">Bilderstrecke</h3><div class="nest-fotos" id="nest-fotos">${fotos.map((f,i)=>`<button type="button" onclick="nestGross(${i})" aria-label="Foto ${i+1} von ${fotos.length} groß ansehen"><img id="nest-foto-${i}" alt="Foto ${i+1} vom Spieltag" draggable="false" oncontextmenu="return false"></button>`).join("")}</div>`:""}
      ${a.eltern_dank?`<div class="nest-gelb"><span class="nc">Danke, Eltern-Kurve!</span>${esc(a.eltern_dank)}</div>`:""}
      ${a.sonderzeile?`<p class="nest-p" style="font-weight:700;color:var(--heft-blau)">${esc(a.sonderzeile)}</p>`:""}
    </section>`;
  }
  // c) Adler im Porträt
  if(p){
    const pos=p.position?(typeof cardPosLabel==="function"?cardPosLabel(p.position):p.position):(p.tw?"Torwart":"");
    // Fan-Fakten speichern „rechts/links/beide“, der Kader (Trainer) „R/L/B“
    const fuss={links:"links",rechts:"rechts",beide:"beidfüßig",r:"rechts",l:"links",b:"beidfüßig"};
    const steck=[["Position",pos],["Adler seit",p.adler_seit],["Starker Fuß",fuss[String(p.starker_fuss||"").toLowerCase()]||p.starker_fuss],["Jahrgang",p.jahrgang],
      ["Lieblingsverein",p.lieblingsverein],["Vorbild",p.vorbild],["Weiterer Sport",p.weiterer_sport],
      [p.weiterer_sport?`Lieblingsteam ${String(p.weiterer_sport).split(/[,(·–-]/)[0].trim()}`:"Lieblingsteam",p.weiterer_sport_team]].filter(x=>x[1]!=null&&String(x[1]).trim()!=="");
    const abseits=[["Hobby",p.hobby],["Kann richtig gut",p.kann_gut],["Lieblingsessen",p.lieblingsessen],["Lieblingstier",p.lieblingstier],
      ["Musik",p.lieblingsmusik],["Film oder Serie",p.lieblingsfilm],["Größtes Fußball-Erlebnis",p.fussball_erlebnis],["Wenn ich groß bin",p.gross_werden]].filter(x=>x[1]);
    const rep=(p.reporter||[]).filter(x=>x&&x.antwort);
    h+=`<section class="nest-abschnitt" data-abschnitt="portraet" aria-label="Adler im Porträt" style="padding:0">
      <div class="nest-portraet-kopf">
        ${p.nr!=null?`<span class="nest-nr-bg" aria-hidden="true">${esc(p.nr)}</span>`:""}
        ${p.foto_pfad?`<img id="nest-portraet-foto" alt="" draggable="false">`:""}
        <div style="position:relative">
          <div class="nc" style="color:var(--heft-gelb);font-weight:800;text-transform:uppercase;letter-spacing:.5px">Adler im Porträt</div>
          <div class="nest-name" id="nest-portraet-name">${esc(p.name)}</div>
          ${p.spitzname?`<div style="font-style:italic">„${esc(p.spitzname)}“</div>`:""}
          <div style="font-weight:600">${[p.nr!=null?"Nr. "+esc(p.nr):"",esc(pos||"")].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <div style="padding:16px">
        ${a.portraet_einleitung?`<p class="nest-p" style="font-weight:600">${esc(a.portraet_einleitung)}</p>`:""}
        ${steck.length?`<div class="nest-steckbrief" id="nest-steckbrief">${steck.map(([l,v])=>`<div><small>${esc(l)}</small>${esc(v)}</div>`).join("")}</div>`:""}
        ${rep.length?`<h3 class="nest-h3">Kabinen-Reporter: Fragen an ${esc(String(p.name).split(" ")[0])}</h3><div id="nest-reporter">${rep.map(x=>`<div class="nest-qa"><b>${esc(x.frage)}</b>„${esc(x.antwort)}“</div>`).join("")}</div>`:""}
        ${privat.length?`<h3 class="nest-h3">Privat</h3><div class="nest-privat">${privat.map((f,i)=>`<figure><img id="nest-privat-${i}" alt="${esc(f.unterschrift||"Privatfoto")}" draggable="false" oncontextmenu="return false">${f.unterschrift?`<figcaption>${esc(f.unterschrift)}</figcaption>`:""}</figure>`).join("")}</div>`:""}
        ${abseits.length?`<h3 class="nest-h3">Abseits vom Platz</h3><div class="nest-chips">${abseits.map(([l,v])=>`<span><small>${esc(l)}</small>${esc(v)}</span>`).join("")}</div>`:""}
        ${a.portraet_trainersatz?`<h3 class="nest-h3">Das sagt das Trainerteam</h3><p class="nest-p">„${esc(a.portraet_trainersatz)}“</p>`:""}
        ${p.saisonziel?`<div class="nest-gelb"><span class="nc">Mein Saisonziel</span>${esc(p.saisonziel)}</div>`:""}
      </div>
    </section>`;
  }
  // d) Rubriken
  const lern=nestJahr(a.tag_lernen), lustig=nestJahr(a.tag_lustig), n=d.naechster;
  const tagTitel=t?new Date(t.datum+"T12:00:00").toLocaleDateString("de-DE",{day:"numeric",month:"long"}):"";
  if([a.training_leitfrage,a.training_text,a.tag_lernen,a.tag_lustig,a.kommentar,n].some(Boolean)){
    h+=`<section class="nest-abschnitt" data-abschnitt="rubriken" aria-label="Rubriken">
      ${(a.training_leitfrage||a.training_text)?`<h2 class="nest-h2">Aus dem Training</h2>${a.training_leitfrage?`<p class="nest-p" style="font-weight:700;font-size:19px">${esc(a.training_leitfrage)}</p>`:""}${a.training_text?`<p class="nest-p">${esc(a.training_text)}</p>`:""}`:""}
      ${(a.tag_lernen||a.tag_lustig)?`<div class="nest-tag" id="nest-tag"><div class="nc" style="font-size:24px">An diesem Tag${tagTitel?" – "+esc(tagTitel):""}</div>
        ${a.tag_lernen?`<div class="lern" style="margin-top:10px"><div class="nc">Zum Lernen</div>${lern.jahr?`<div class="nest-jahr">${esc(lern.jahr)}</div>`:""}<div style="font-size:16px">${esc(lern.text)}</div></div>`:""}
        ${a.tag_lustig?`<div style="margin-top:14px"><div class="nc">Zum Schmunzeln</div>${lustig.jahr?`<div class="nest-jahr">${esc(lustig.jahr)}</div>`:""}<div style="font-size:16px">${esc(lustig.text)}</div></div>`:""}
      </div>`:""}
      ${a.kommentar?`<h2 class="nest-h2">Ein Wort vom Trainerteam</h2><p class="nest-p">${esc(a.kommentar)}</p>`:""}
      ${n?`<h2 class="nest-h2">Nächster Spieltag</h2><div class="nest-karte" id="nest-naechster">
        <div><b>Wann</b>${esc(_nestDatum(n.datum))}${n.uhrzeit?", "+_nestZeit(n.uhrzeit)+" Uhr":""}</div>
        <div><b>Was</b>${esc(n.titel||n.gegner||(n.typ==="turnier"?"Turnier":"Spiel"))}</div>
        ${n.treffzeit?`<div><b>Treffpunkt</b>${esc(String(n.treffzeit).slice(0,5))} Uhr</div>`:""}
        <div><b>Wo</b>${n.heim?"zu Hause":"auswärts"}${n.ort?" · "+esc(n.ort):""}</div></div>`:""}
    </section>`;
  }
  h+=`<div class="nest-ende">Auf geht's, Adler!<button type="button" class="nest-zurueck" onclick="nestClose()">Zurück zur App</button></div>`;
  if((liste||[]).length>1){
    h+=`<nav class="nest-archiv" aria-label="Frühere Ausgaben"><div class="nest-h3" style="margin-top:0">Alle Ausgaben</div>${liste.map(x=>{
      const f=nestFormatGegner(x);
      return `<button type="button" onclick="nestOpen(${Number(x.id)})"${Number(x.id)===Number(aktivId)?' aria-current="true"':""}><span>Ausgabe ${_nestNr(x.nummer)} · ${esc(x.datum?_nestDatum(x.datum):"")}</span><span style="color:var(--heft-grau);font-size:14px;text-align:right">${esc(f.gegner||f.format||"")}</span></button>`;}).join("")}</nav>`;
  }
  return h+`</div>`;
}
async function nestMedienLaden(d,medien){
  window._nestFotos=medien.filter(x=>x.art==="galerie");
  const setze=async(id,bucket,pfad)=>{ const el=document.getElementById(id); if(!el)return; const u=await nestBlobUrl(bucket,pfad); if(u&&document.getElementById(id))el.src=u; };
  const tb=medien.find(x=>x.art==="titelbild"); if(tb)setze("nest-titelbild",tb.bucket,tb.pfad);
  if(d.portraet&&d.portraet.foto_pfad)setze("nest-portraet-foto","spielerfotos",d.portraet.foto_pfad);
  medien.filter(x=>x.art==="privat").forEach((f,i)=>setze("nest-privat-"+i,f.bucket,f.pfad));
  for(let i=0;i<window._nestFotos.length;i++){ const f=window._nestFotos[i]; await setze("nest-foto-"+i,f.bucket,f.pfad); }
  window._nestAudio=medien.find(x=>x.art==="audio")||null;
}
async function nestHoeren(){
  const a=document.getElementById("nest-audio"), play=document.getElementById("nest-play"); if(!a)return;
  if(!a.src){
    if(!window._nestAudio){toast("Die Hördatei fehlt noch","err");return;}
    if(play)play.textContent="…";
    const u=await nestBlobUrl(window._nestAudio.bucket,window._nestAudio.pfad);
    if(!u){ if(play)play.textContent="▶"; toast("Die Hördatei lässt sich gerade nicht laden","err"); return; }
    a.src=u;
  }
  if(a.paused){ try{ await a.play(); if(play)play.textContent="❚❚"; }catch(e){ if(play)play.textContent="▶"; } }
  else { a.pause(); if(play)play.textContent="▶"; }
}
function nestHoerenEnde(){ const p=document.getElementById("nest-play"); if(p)p.textContent="▶"; }
/* Großansicht der Bilderstrecke – wie die Spieltagsgalerie: wischen, ‹ ›, Pfeiltasten, Escape; kein Speichern. */
async function nestGross(i){
  const liste=window._nestFotos||[]; if(!liste.length)return;
  i=(i+liste.length)%liste.length;
  let lb=document.getElementById("nest-gross");
  if(!lb){
    lb=document.createElement("div"); lb.id="nest-gross";
    lb.setAttribute("role","dialog"); lb.setAttribute("aria-modal","true"); lb.setAttribute("aria-label","Foto groß");
    lb.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px";
    lb.style.zIndex=zOben(10050);
    const k="min-width:48px;min-height:48px;border:none;border-radius:12px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:22px;font-weight:800;cursor:pointer";
    lb.innerHTML=`<div style="display:flex;align-items:center;gap:8px;width:100%;max-width:900px;margin-bottom:8px">
        <span id="nest-gross-zahl" style="flex:1;color:#fff;font-size:16px;font-weight:700"></span>
        <button type="button" onclick="document.getElementById('nest-gross')?.remove()" aria-label="Schließen" style="${k}">✕</button></div>
      <div style="position:relative;flex:1;width:100%;max-width:900px;display:flex;align-items:center;justify-content:center;min-height:0">
        <button type="button" id="nest-gross-zurueck" aria-label="Vorheriges Foto" style="${k};position:absolute;left:0;z-index:1">‹</button>
        <img id="nest-gross-img" alt="" draggable="false" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;-webkit-touch-callout:none;user-select:none">
        <button type="button" id="nest-gross-weiter" aria-label="Nächstes Foto" style="${k};position:absolute;right:0;z-index:1">›</button></div>`;
    document.body.appendChild(lb);
    lb.addEventListener("contextmenu",e=>e.preventDefault()); lb.addEventListener("dragstart",e=>e.preventDefault());
    let x0=null;
    lb.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;},{passive:true});
    lb.addEventListener("touchend",e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)nestGross(Number(lb.dataset.idx)+(dx<0?1:-1));});
    lb.addEventListener("keydown",e=>{if(e.key==="ArrowRight")nestGross(Number(lb.dataset.idx)+1);else if(e.key==="ArrowLeft")nestGross(Number(lb.dataset.idx)-1);else if(e.key==="Escape")lb.remove();});
  }
  lb.dataset.idx=i;
  document.getElementById("nest-gross-zahl").textContent=`Foto ${i+1} von ${liste.length}`;
  ["nest-gross-zurueck","nest-gross-weiter"].forEach(id=>{const b=document.getElementById(id);if(b)b.style.display=liste.length>1?"":"none";});
  document.getElementById("nest-gross-zurueck").onclick=()=>nestGross(i-1);
  document.getElementById("nest-gross-weiter").onclick=()=>nestGross(i+1);
  const img=document.getElementById("nest-gross-img"), klein=document.getElementById("nest-foto-"+i);
  img.alt=`Foto ${i+1} von ${liste.length}`;
  img.src=(klein&&klein.src)||(await nestBlobUrl(liste[i].bucket,liste[i].pfad))||"";
}

/* ── Editor (Trainerbereich) ────────────────────────────── */
let _nestEd=null;   // {a: Ausgabe, fotos:[termin_media], reporter:[...], kader:[...], termine:[...]}
async function nestEditorOpen(){
  document.getElementById("nest-ed")?.remove();
  const m=document.createElement("div"); m.id="nest-ed";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Adler Nest – Ausgaben");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.style.zIndex=zOben(9990);
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:var(--rl);padding:16px;max-width:640px;width:100%;margin:auto">
    ${mdlHead("nest-ed","🪺","Adler Nest – Ausgaben","Eine Ausgabe je Spieltag, nur in der App lesbar","#1e3a8a")}
    <div id="nest-ed-body"><div style="padding:20px;text-align:center;color:var(--text3)">Lade …</div></div></div>`;
  document.body.appendChild(m);
  nestEdListe();
}
async function nestEdListe(){
  const body=document.getElementById("nest-ed-body"); if(!body)return;
  let rows=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/heft_ausgabe?select=id,nummer,status,schlagzeile,veroeffentlicht_am,termin_id,termine(datum,titel,gegner)&team=eq.adler1&order=nummer.desc`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  if(rows===null){ body.innerHTML=`<div style="font-size:var(--s-text);color:var(--text2);line-height:1.5">Die Ausgaben-Tabelle fehlt noch – die Migration <code>20261003_v733_adler_nest_ausgaben.sql</code> ist nicht eingespielt.</div>`; return; }
  body.innerHTML=`<div id="nest-ablauf" style="margin-bottom:14px"></div><button type="button" class="btn btn-p" style="width:100%;min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800" onclick="nestEdNeu()">＋ Neue Ausgabe erfassen</button>
    ${rows.length?rows.map(x=>`<button type="button" class="nest-ed-zeile" onclick="nestEdOeffnen(${Number(x.id)})" style="display:flex;align-items:center;gap:10px;width:100%;min-height:56px;margin-top:8px;padding:8px 12px;border:1px solid var(--rand-bedien);border-radius:var(--r);background:var(--surface2);color:var(--text);font-family:inherit;font-size:var(--s-text);text-align:left;cursor:pointer">
        <span style="font-weight:800;min-width:44px">Nr. ${_nestNr(x.nummer)}</span>
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.schlagzeile||(x.termine&&(x.termine.titel||x.termine.gegner))||"ohne Schlagzeile")}${x.termine&&x.termine.datum?` · ${esc(_nestDatum(x.termine.datum))}`:""}</span>
        ${_nestStatus(x.status)}</button>`).join("")
      :`<div style="margin-top:12px;font-size:var(--s-text);color:var(--text2)">Noch keine Ausgabe. Entwürfe aus dem Projekt-Chat erscheinen hier zum Gegenlesen.</div>`}`;
  nestAblaufLaden();
}
async function _nestEdStammdaten(){
  const d0=new Date(), saison=`${d0.getMonth()>=6?d0.getFullYear():d0.getFullYear()-1}-07-01`;
  const [termine,kader]=await Promise.all([
    fetch(`${SB_URL}/rest/v1/termine?select=id,datum,typ,titel,gegner,heim&typ=in.(spiel,turnier)&datum=gte.${saison}&order=datum.desc`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
    fetch(`${SB_URL}/rest/v1/kader?select=id,name,nr,aktiv&order=name`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[])
  ]);
  return {termine:termine||[],kader:(kader||[]).filter(k=>k.aktiv!==false)};
}
async function nestEdNeu(){
  const st=await _nestEdStammdaten();
  let max=0; try{const r=await fetch(`${SB_URL}/rest/v1/heft_ausgabe?select=nummer&team=eq.adler1&order=nummer.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok){const x=await r.json();max=(x[0]&&x[0].nummer)||0;}}catch(e){}
  const heute=isoLokal(), letzter=st.termine.find(t=>t.datum<=heute);
  _nestEd={a:{id:null,nummer:max+1,termin_id:letzter?letzter.id:null,status:"entwurf",foto_ids:[],portraet_privatfotos:[]},...st};
  nestEdRender();
}
async function nestEdOeffnen(id){
  const st=await _nestEdStammdaten();
  let a=null; try{const r=await fetch(`${SB_URL}/rest/v1/heft_ausgabe?id=eq.${Number(id)}&select=*`,{headers:sbAuthHeaders()});if(r.ok)a=(await r.json())[0];}catch(e){}
  if(!a){toast("Ausgabe nicht gefunden","err");return;}
  a.foto_ids=a.foto_ids||[]; a.portraet_privatfotos=a.portraet_privatfotos||[];
  _nestEd={a,...st};
  nestEdRender();
}
// Status als Text mit Rahmen – Farbe nie allein (grün = veröffentlicht, orange = Entwurf)
function _nestStatus(st){ const pub=st==="veroeffentlicht";
  return `<span class="nest-status" style="flex:none;font-size:var(--s-klein);font-weight:700;padding:3px 9px;border-radius:999px;border:1.5px solid ${pub?"var(--green)":"var(--orange)"};background:${pub?"var(--green-bg)":"var(--orange-bg)"};color:var(--text)">${pub?"✓ veröffentlicht":"✎ Entwurf"}</span>`; }
function _nestFeld(k,label,opt){
  opt=opt||{}; const a=_nestEd.a, v=a[k]||"";
  const max=opt.max?` maxlength="${opt.max}"`:"";
  const zaehler=opt.max?`<span id="nest-z-${k}" style="font-weight:400;color:var(--text3)">${String(v).length}/${opt.max}</span>`:"";
  const st="width:100%;padding:10px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);box-sizing:border-box";
  const ein=opt.lang?`<textarea id="nest-f-${k}" rows="${opt.lang}"${max} oninput="nestEdTipp('${k}',this)" style="${st}">${esc(v)}</textarea>`
    :`<input id="nest-f-${k}"${max} value="${esc(v)}" oninput="nestEdTipp('${k}',this)" style="${st};min-height:48px">`;
  return `<label for="nest-f-${k}" style="display:flex;justify-content:space-between;gap:8px;font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:10px 0 4px"><span>${label}${opt.tip?` <span style="font-weight:400;color:var(--text3)">– ${esc(opt.tip)}</span>`:""}</span>${zaehler}</label>${ein}`;
}
function nestEdTipp(k,el){ if(!_nestEd)return; _nestEd.a[k]=el.value; const z=document.getElementById("nest-z-"+k); if(z)z.textContent=el.value.length+"/"+el.maxLength; }
function nestEdRender(){
  const body=document.getElementById("nest-ed-body"); if(!body||!_nestEd)return;
  const a=_nestEd.a, kopf=t=>`<div style="font-size:var(--s-karte);font-weight:800;margin:18px 0 4px;color:var(--text)">${t}</div>`;
  const sel="width:100%;min-height:48px;padding:8px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)";
  body.innerHTML=`<button type="button" class="btn btn-sm" onclick="nestEdListe()" style="min-height:44px">← Alle Ausgaben</button>
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">
      <span style="font-size:var(--s-teil);font-weight:900">Ausgabe ${_nestNr(a.nummer)}</span>
      ${_nestStatus(a.status)}
    </div>
    ${kopf("Spieltag")}
    <select id="nest-f-termin" onchange="nestEdTermin(this.value)" aria-label="Spieltag der Ausgabe" style="${sel}">
      <option value="">– Sonderausgabe ohne Spieltag –</option>
      ${_nestEd.termine.map(t=>`<option value="${Number(t.id)}"${Number(a.termin_id)===Number(t.id)?" selected":""}>${esc(_nestDatum(t.datum))} · ${esc(t.titel||t.gegner||t.typ)}</option>`).join("")}
    </select>
    ${kopf("Deckblatt")}
    ${_nestFeld("schlagzeile","Schlagzeile",{max:40})}
    ${_nestFeld("teaser_spieltag","Im Heft: Spieltag",{max:45})}
    ${_nestFeld("teaser_portraet","Im Heft: Porträt",{max:45})}
    ${_nestFeld("teaser_tag","Im Heft: An diesem Tag",{max:45})}
    <div id="nest-ed-uploads"></div>
    ${kopf("Spieltag-Bericht")}
    ${_nestFeld("anpfiff","Anpfiff (2–3 Sätze Begrüßung)",{lang:3})}
    ${_nestFeld("spieltag_text","Vom Platz (Absätze mit Zeilenumbruch)",{lang:7})}
    ${_nestFeld("zitat","Zitat aus dem Bericht",{lang:2})}
    ${_nestFeld("eltern_dank","Danke, Eltern-Kurve!",{lang:2})}
    ${_nestFeld("sonderzeile","Sonderzeile (z. B. Gute Besserung – ohne Angaben zur Verletzung)")}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:8px">Spieltagskarte, Teams, Kapitäne und Ergebnis kommen aus der App – dafür gibt es kein Textfeld.</div>
    ${kopf(`Bilderstrecke <span id="nest-foto-zahl" style="font-weight:600;color:var(--text2)">${a.foto_ids.length} von ${NEST_MAX_FOTOS}</span>`)}
    <div id="nest-ed-fotos" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px"></div>
    ${kopf("Adler im Porträt")}
    <div id="nest-ed-vorschlag" style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px"></div>
    <select id="nest-f-portraet" onchange="nestEdPortraet(this.value)" aria-label="Kind im Porträt" style="${sel}">
      <option value="">– kein Porträt –</option>
      ${_nestEd.kader.map(k=>`<option value="${Number(k.id)}"${Number(a.portraet_spieler_id)===Number(k.id)?" selected":""}>${k.nr!=null?esc(k.nr)+" · ":""}${esc(k.name)}</option>`).join("")}
    </select>
    <label style="display:flex;align-items:center;gap:8px;min-height:44px;font-size:var(--s-text)"><input type="checkbox" id="nest-f-spitz" ${a.portraet_spitzname?"checked":""} onchange="_nestEd.a.portraet_spitzname=this.checked"> Spitzname im Heft zeigen</label>
    ${_nestFeld("portraet_einleitung","Einleitung (1–2 Sätze)",{lang:3})}
    ${_nestFeld("portraet_trainersatz","Das sagt das Trainerteam (ohne Vergleich mit anderen)",{lang:3})}
    <div id="nest-ed-reporter"></div>
    <div id="nest-ed-privat"></div>
    ${kopf("Rubriken")}
    ${_nestFeld("training_leitfrage","Aus dem Training: Leitfrage der Woche")}
    ${_nestFeld("training_text","Aus dem Training: ein Satz für Eltern",{lang:2})}
    ${_nestFeld("tag_lernen","An diesem Tag – zum Lernen (mit Jahreszahl vorn, z. B. „1990: …“)",{lang:3})}
    ${_nestFeld("tag_lustig","An diesem Tag – zum Schmunzeln",{lang:3})}
    ${_nestFeld("tag_quellen","Quellen zu „An diesem Tag“ (nur Trainerteam)",{lang:2,tip:"Eltern und Kinder sehen dieses Feld nie."})}
    ${_nestFeld("kommentar","Ein Wort vom Trainerteam",{lang:3})}
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:18px">
      <button type="button" class="btn btn-p" id="nest-ed-veroeffentlichen" onclick="${a.status==="veroeffentlicht"?"nestEdSpeichern()":"nestEdVeroeffentlichen()"}" style="min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800">${a.status==="veroeffentlicht"?"Änderungen speichern":"Veröffentlichen"}</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button type="button" class="btn" onclick="nestEdVorschau()" style="min-height:48px;justify-content:center">👁 Vorschau</button>
        ${a.status==="veroeffentlicht"?`<button type="button" class="btn" onclick="nestEdZurueckziehen()" style="min-height:48px;justify-content:center">Zurück zum Entwurf</button>`
          :`<button type="button" class="btn" id="nest-ed-entwurf" onclick="nestEdSpeichern()" style="min-height:48px;justify-content:center">Entwurf speichern</button>`}
      </div>
    </div>`;
  nestEdUploads(); nestEdFotos(); nestEdReporter(); nestEdPrivat(); nestEdVorschlag();
}
async function nestEdVorschlag(){
  const el=document.getElementById("nest-ed-vorschlag"); if(!el||typeof heftPortraetNaechster!=="function")return;
  const verlauf=(typeof heftPortraetVerlauf==="function")?await heftPortraetVerlauf():[];
  const v=heftPortraetNaechster(_nestEd.kader,verlauf);
  if(v&&v.kind)el.innerHTML=`Dran ist reihum: <b>${esc(v.kind.name)}</b> ${v.zuletzt?`(zuletzt in der Woche ab ${esc(_nestDatum(v.zuletzt))})`:"(noch nie im Porträt)"}${Number(_nestEd.a.portraet_spieler_id)!==Number(v.kind.id)?` <button type="button" class="btn btn-sm" style="min-height:44px;margin-left:6px" onclick="nestEdPortraet(${Number(v.kind.id)});document.getElementById('nest-f-portraet').value='${Number(v.kind.id)}'">Übernehmen</button>`:" ✓"}`;
}
function nestEdTermin(v){ _nestEd.a.termin_id=v?Number(v):null; _nestEd.a.foto_ids=[]; nestEdFotos(); }
function nestEdPortraet(v){ _nestEd.a.portraet_spieler_id=v?Number(v):null; _nestEd.a.portraet_privatfotos=[]; nestEdReporter(); nestEdVorschlag(); nestEdPrivat(); }
async function nestEdFotos(){
  const box=document.getElementById("nest-ed-fotos"); if(!box)return;
  const a=_nestEd.a; let fotos=[];
  if(a.termin_id){ fotos=(await _nestRpc("termin_gallery",{p_termin:a.termin_id}))||[]; }
  _nestEd.fotos=fotos.slice().reverse();   // älteste zuerst – so wie die Fotos am Tag entstanden sind
  const zahl=document.getElementById("nest-foto-zahl"); if(zahl)zahl.textContent=`${a.foto_ids.length} von ${NEST_MAX_FOTOS}`;
  if(!fotos.length){ box.innerHTML=`<div style="grid-column:1/-1;font-size:var(--s-text);color:var(--text2)">${a.termin_id?"Zu diesem Spieltag gibt es noch keine Fotos in der Galerie.":"Erst einen Spieltag wählen."}</div>`; return; }
  box.innerHTML=_nestEd.fotos.map(f=>{ const pos=a.foto_ids.indexOf(Number(f.id));
    return `<button type="button" class="nest-ed-foto" data-id="${Number(f.id)}" aria-pressed="${pos>=0}" aria-label="Foto ${pos>=0?"(Nr. "+(pos+1)+" in der Strecke) abwählen":"auswählen"}" onclick="nestEdFotoKlick(${Number(f.id)})" style="position:relative;padding:0;aspect-ratio:1;border:${pos>=0?"4px solid var(--blue)":"1px solid var(--rand-bedien)"};border-radius:8px;overflow:hidden;background:var(--surface2);cursor:pointer">
      <img id="nest-ed-img-${Number(f.id)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">
      ${pos>=0?`<span style="position:absolute;top:4px;left:4px;min-width:26px;height:26px;border-radius:13px;background:var(--blue);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center">${pos+1}</span>`:""}</button>`;}).join("");
  for(const f of _nestEd.fotos){ const el=document.getElementById("nest-ed-img-"+Number(f.id)); if(!el||el.src)continue; const u=await nestBlobUrl("termin_media",f.foto_path); if(u&&el.isConnected)el.src=u; }
}
function nestEdFotoKlick(id){
  const a=_nestEd.a, i=a.foto_ids.indexOf(id);
  if(i>=0)a.foto_ids.splice(i,1);
  else { if(a.foto_ids.length>=NEST_MAX_FOTOS){ toast(`Höchstens ${NEST_MAX_FOTOS} Fotos je Ausgabe – erst eines abwählen`,"err"); return; } a.foto_ids.push(id); }
  // nur die Markierungen neu zeichnen, die Bilder bleiben
  document.querySelectorAll("#nest-ed-fotos .nest-ed-foto").forEach(b=>{
    const fid=Number(b.dataset.id), pos=a.foto_ids.indexOf(fid);
    b.setAttribute("aria-pressed",String(pos>=0)); b.style.border=pos>=0?"4px solid var(--blue)":"1px solid var(--rand-bedien)";
    b.querySelector("span")?.remove();
    if(pos>=0){ const s=document.createElement("span"); s.style.cssText="position:absolute;top:4px;left:4px;min-width:26px;height:26px;border-radius:13px;background:var(--blue);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center"; s.textContent=pos+1; b.appendChild(s); }
  });
  const zahl=document.getElementById("nest-foto-zahl"); if(zahl)zahl.textContent=`${a.foto_ids.length} von ${NEST_MAX_FOTOS}`;
}
async function nestEdReporter(){
  const box=document.getElementById("nest-ed-reporter"); if(!box)return;
  const sid=_nestEd.a.portraet_spieler_id;
  if(!sid){ box.innerHTML=""; return; }
  let rows=[]; try{const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?spieler_id=eq.${Number(sid)}&select=id,frage,antwort,freigegeben,created_at&order=created_at.desc&limit=20`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  box.innerHTML=`<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:12px 0 4px">Kabinen-Reporter – ins Heft kommt nur Freigegebenes</div>`
    +(rows.length?rows.map(x=>`<label style="display:flex;gap:10px;align-items:flex-start;min-height:44px;padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:var(--s-text)">
        <input type="checkbox" ${x.freigegeben?"checked":""} onchange="nestEdFreigabe(${Number(x.id)},this)" style="margin-top:4px;width:20px;height:20px">
        <span><b>${esc(x.frage)}</b><br>„${esc(x.antwort)}“</span></label>`).join("")
      :`<div style="font-size:var(--s-text);color:var(--text2)">Dieses Kind hat im Kabinen-Reporter noch nichts beantwortet.</div>`);
}
async function nestEdFreigabe(id,el){
  el.disabled=true;
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?id=eq.${id}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({freigegeben:el.checked})});
    if(!r.ok){el.checked=!el.checked;toast("Freigabe nicht gespeichert","err");} else toast(el.checked?"Antwort freigegeben":"Freigabe zurückgenommen");
  }catch(e){el.checked=!el.checked;toast("Netzwerkfehler","err");}
  el.disabled=false;
}
function nestEdUploads(){
  const box=document.getElementById("nest-ed-uploads"); if(!box)return; const a=_nestEd.a;
  box.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
    <label class="btn" style="min-height:48px;justify-content:center;cursor:pointer;text-align:center">🖼️ Titelbild ${a.titelbild_pfad?"ersetzen":"hochladen"}<input type="file" accept="image/jpeg,image/png,image/webp" onchange="nestEdHochladen('titelbild',this)" style="position:absolute;opacity:0;width:1px;height:1px"></label>
    <label class="btn" style="min-height:48px;justify-content:center;cursor:pointer;text-align:center">🎧 Hördatei (MP3) ${a.audio_pfad?"ersetzen":"hochladen"}<input type="file" accept="audio/mpeg,.mp3" onchange="nestEdHochladen('audio',this)" style="position:absolute;opacity:0;width:1px;height:1px"></label></div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">${a.titelbild_pfad?"✓ Titelbild da":"Ohne Titelbild zeigt das Deckblatt die große Ausgabenummer."} · ${a.audio_pfad?`✓ Hördatei da${a.audio_sekunden?" ("+_nestDauer(a.audio_sekunden)+")":""}`:"noch keine Hördatei"}</div>`;
}
function _nestPfad(name){ const ext=(String(name).match(/\.([a-z0-9]{2,4})$/i)||[,"bin"])[1].toLowerCase(); return `${_nestEd.a.id}/${(crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()}.${ext}`; }
async function _nestUpload(file){
  if(!_nestEd.a.id){ const ok=await nestEdSpeichern(true); if(!ok)return null; }
  const pfad=_nestPfad(file.name);
  const typ=file.type||(/\.mp3$/i.test(file.name)?"audio/mpeg":"application/octet-stream");
  const r=await fetch(`${SB_URL}/storage/v1/object/heft_media/${pfad}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':typ},body:file});
  if(!r.ok){ toast("Hochladen fehlgeschlagen","err"); return null; }
  return pfad;
}
function _nestAudioSekunden(file){
  return new Promise(ok=>{ try{ const u=URL.createObjectURL(file), au=new Audio(); au.preload="metadata";
    au.onloadedmetadata=()=>{ const s=Math.round(au.duration||0); URL.revokeObjectURL(u); ok(isFinite(s)?s:null); }; au.onerror=()=>{URL.revokeObjectURL(u);ok(null);}; au.src=u; }catch(e){ok(null);} });
}
async function nestEdHochladen(art,input){
  const file=input.files&&input.files[0]; if(!file)return;
  input.disabled=true;
  try{
    const pfad=await _nestUpload(file); if(!pfad)return;
    if(art==="titelbild")_nestEd.a.titelbild_pfad=pfad;
    else { _nestEd.a.audio_pfad=pfad; _nestEd.a.audio_sekunden=await _nestAudioSekunden(file); }
    await nestEdSpeichern(true);
    toast(art==="titelbild"?"Titelbild hochgeladen":"Hördatei hochgeladen");
    nestEdUploads();
  }finally{ input.disabled=false; }
}
/* v734 (Abschnitt 8): Privatfotos kommen aus dem Porträt-Bogen der Eltern – nur mit deren Einverständnis.
   Der Trainer übernimmt sie oder lässt sie weg; hochladen kann er sie nicht mehr selbst. */
async function nestEdPrivat(){
  const box=document.getElementById("nest-ed-privat"); if(!box||!_nestEd)return;
  const a=_nestEd.a, sid=a.portraet_spieler_id;
  if(!sid){ box.innerHTML=""; return; }
  let e=null; try{const r=await fetch(`${SB_URL}/rest/v1/portraet_einreichung?spieler_id=eq.${Number(sid)}&einverstanden_am=not.is.null&select=id,privatfotos,einverstanden_am&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)e=(await r.json())[0]||null;}catch(x){}
  const fotos=(e&&e.privatfotos)||[]; _nestEd.privatAngebot=fotos;
  const gewaehlt=p=>(a.portraet_privatfotos||[]).some(x=>x.pfad===p);
  box.innerHTML=`<div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:14px 0 4px">Privatfotos aus dem Porträt-Bogen (${(a.portraet_privatfotos||[]).length} von ${NEST_MAX_PRIVAT} übernommen)</div>`
    +(fotos.length?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${fotos.map((f,i)=>`<button type="button" class="nest-ed-privat" aria-pressed="${gewaehlt(f.pfad)}" onclick="nestEdPrivatKlick(${i})" style="padding:6px;border:${gewaehlt(f.pfad)?"3px solid var(--blue)":"1px solid var(--rand-bedien)"};border-radius:var(--r);background:var(--surface2);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;min-height:44px">
        <img id="nest-ed-privat-img-${i}" alt="" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:6px;display:block;background:var(--surface)">
        <span style="display:block;font-size:var(--s-klein);margin-top:4px">${gewaehlt(f.pfad)?"✓ übernommen":"weglassen"} · ${esc(f.unterschrift||"ohne Unterschrift")}</span></button>`).join("")}</div>`
      :`<div style="font-size:var(--s-text);color:var(--text2)">Keine Fotos mit Einverständnis der Familie.</div>`);
  fotos.forEach(async(f,i)=>{ const u=await nestBlobUrl("heft_media",f.pfad); const el=document.getElementById("nest-ed-privat-img-"+i); if(u&&el)el.src=u; });
}
function nestEdPrivatKlick(i){
  const f=(_nestEd.privatAngebot||[])[i]; if(!f)return;
  const liste=(_nestEd.a.portraet_privatfotos||[]).slice(), k=liste.findIndex(x=>x.pfad===f.pfad);
  if(k>=0)liste.splice(k,1);
  else { if(liste.length>=NEST_MAX_PRIVAT){ toast(`Höchstens ${NEST_MAX_PRIVAT} Privatfotos`,"err"); return; } liste.push({pfad:f.pfad,unterschrift:f.unterschrift||""}); }
  _nestEd.a.portraet_privatfotos=liste; nestEdPrivat();
}
function _nestEdDaten(){
  const a=_nestEd.a, b={team:"adler1",nummer:a.nummer,termin_id:a.termin_id||null,foto_ids:(a.foto_ids||[]).slice(0,NEST_MAX_FOTOS),
    portraet_spieler_id:a.portraet_spieler_id||null,portraet_spitzname:!!a.portraet_spitzname,
    portraet_privatfotos:(a.portraet_privatfotos||[]).slice(0,NEST_MAX_PRIVAT),titelbild_pfad:a.titelbild_pfad||null,
    audio_pfad:a.audio_pfad||null,audio_sekunden:a.audio_sekunden||null};
  NEST_FELDER.forEach(k=>{ const el=document.getElementById("nest-f-"+k); const v=el?el.value:(a[k]||""); b[k]=String(v||"").trim()||null; });
  return b;
}
async function nestEdSpeichern(still,status){
  if(!_nestEd)return false;
  const a=_nestEd.a, b=_nestEdDaten();
  if(b.foto_ids.length>NEST_MAX_FOTOS){toast(`Höchstens ${NEST_MAX_FOTOS} Fotos`,"err");return false;}
  if(status)b.status=status;
  try{
    const r=a.id?await fetch(`${SB_URL}/rest/v1/heft_ausgabe?id=eq.${Number(a.id)}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(b)})
               :await fetch(`${SB_URL}/rest/v1/heft_ausgabe`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify({...b,status:b.status||"entwurf"})});
    if(!r.ok){
      let t=""; try{t=(await r.json()).message||"";}catch(e){}
      toast(/team_nummer|duplicate/.test(t)?"Diese Ausgabennummer gibt es schon":/Einverständnis/.test(t)?"Privatfoto ohne Einverständnis der Familie – nicht gespeichert":/foto_ids/.test(t)?`Höchstens ${NEST_MAX_FOTOS} Fotos`:/privatfotos/.test(t)?`Höchstens ${NEST_MAX_PRIVAT} Privatfotos`:/schlagzeile|teaser/.test(t)?"Schlagzeile oder Teaser zu lang":"Speichern fehlgeschlagen","err");
      return false;
    }
    const neu=(await r.json())[0]; if(neu){ _nestEd.a={...a,...neu}; }
    if(!still)toast(status==="veroeffentlicht"?"Ausgabe veröffentlicht":status==="entwurf"?"Zurück im Entwurf":"Entwurf gespeichert");
    return true;
  }catch(e){ toast("Netzwerkfehler – nicht gespeichert","err"); return false; }
}
async function nestEdVeroeffentlichen(){
  const a=_nestEd.a;
  if(!await frageJaNein({emoji:"🪺",titel:`Ausgabe ${_nestNr(a.nummer)} veröffentlichen?`,text:"Eltern und Kinder sehen sie dann in der App; die Eltern-Startseite meldet „Das Adler Nest ist frisch erschienen“.",ja:"Veröffentlichen"}))return;
  if(!await nestEdSpeichern(false,"veroeffentlicht"))return;
  // Porträt-Verlauf fortschreiben (Woche = Montag der Spieltagswoche) – für den Reihum-Vorschlag
  const sid=_nestEd.a.portraet_spieler_id;
  if(sid){
    const t=_nestEd.termine.find(x=>Number(x.id)===Number(_nestEd.a.termin_id));
    const d=new Date((t?t.datum:isoLokal())+"T12:00:00"); d.setDate(d.getDate()-((d.getDay()+6)%7));
    try{await fetch(`${SB_URL}/rest/v1/portraet_verlauf?on_conflict=spieler_id,woche`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({spieler_id:sid,woche:isoLokal(d)})});}catch(e){}
  }
  nestEdRender();
}
async function nestEdZurueckziehen(){
  if(!await frageJaNein({emoji:"↩️",titel:"Zurück zum Entwurf?",text:"Eltern und Kinder sehen die Ausgabe dann nicht mehr, bis du sie wieder veröffentlichst.",ja:"Zurück zum Entwurf"}))return;
  if(await nestEdSpeichern(false,"entwurf"))nestEdRender();
}
async function nestEdVorschau(){
  if(!await nestEdSpeichern(true))return;
  nestOpen(_nestEd.a.id);
}

/* ── Porträt-Ablauf (v734, Abschnitt 8) ─────────────────────
   Nach einem Spieltag bestätigt ein Trainer das nächste Porträtkind → portraet_einreichung mit Fristen
   (Mittwoch 20 Uhr Eltern, Freitag 20 Uhr Trainer, gerechnet in der Datenbank). Eltern füllen den Bogen,
   das Kind sieht in der Kabine den Hinweis auf die Porträtfragen, jeder Trainer hinterlegt 2–3 Stichpunkte.
   Benachrichtigungen schickt der 5-Minuten-Lauf rufe-push (portraet_push_faellig) – jede genau einmal. */
function _nestFrist(ts){ try{ return new Date(ts).toLocaleString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+" Uhr"; }catch(e){ return ""; } }
function _nestAmpel(ok,text){ return `<div class="nest-ampel" data-ok="${ok?1:0}" style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;font-size:var(--s-text)"><span aria-hidden="true" style="flex:none;width:22px;height:22px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:800;background:${ok?"var(--green-bg)":"var(--orange-bg)"};border:1.5px solid ${ok?"var(--green)":"var(--orange)"};color:var(--text)">${ok?"✓":"!"}</span><span>${ok?"":"<b>fehlt:</b> "}${text}</span></div>`; }
async function nestAblaufLaden(){
  const box=document.getElementById("nest-ablauf"); if(!box)return;
  let e=null, fehlt=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/portraet_einreichung?status=neq.uebernommen&select=*,kader(id,name,nr),termine(id,datum,titel,gegner)&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)e=(await r.json())[0]||null; else fehlt=true;}catch(x){fehlt=true;}
  const rahmen=inhalt=>`<div style="border:1px solid var(--rand-bedien);border-left:4px solid #0044AA;border-radius:var(--r);padding:12px;background:var(--surface2)"><div style="font-size:var(--s-karte);font-weight:800;margin-bottom:6px">🪺 Nächstes Porträt</div>${inhalt}</div>`;
  if(fehlt){ box.innerHTML=rahmen(`<div style="font-size:var(--s-text);color:var(--text2)">Der Porträt-Ablauf braucht die Migration <code>20261004_v734_portraet_ablauf.sql</code>.</div>`); return; }
  if(!e){
    const heute=isoLokal();
    const [kader,termine,verlauf]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/kader?select=id,name,nr,aktiv&order=name`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${SB_URL}/rest/v1/termine?select=id,datum,typ,titel,gegner&typ=in.(spiel,turnier)&datum=gt.${heute}&order=datum.asc&limit=6`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
      (typeof heftPortraetVerlauf==="function")?heftPortraetVerlauf():Promise.resolve([])]);
    const aktiv=(kader||[]).filter(k=>k.aktiv!==false), v=(typeof heftPortraetNaechster==="function")?heftPortraetNaechster(aktiv,verlauf):null;
    const sel="width:100%;min-height:48px;padding:8px;margin-top:6px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)";
    box.innerHTML=rahmen(`<div style="font-size:var(--s-text);color:var(--text2);line-height:1.5">Nach dem Spieltag festlegen, wer im nächsten Heft steht. Dann bekommen die Eltern den Bogen (bis Mittwoch 20 Uhr) und das Trainerteam den Hinweis auf die Stichpunkte (bis Freitag 20 Uhr).</div>
      <select id="nest-ablauf-kind" aria-label="Porträtkind" style="${sel}">${aktiv.map(k=>`<option value="${Number(k.id)}"${v&&v.kind&&v.kind.id===k.id?" selected":""}>${k.nr!=null?esc(k.nr)+" · ":""}${esc(k.name)}${v&&v.kind&&v.kind.id===k.id?" – dran ist reihum":""}</option>`).join("")}</select>
      <select id="nest-ablauf-termin" aria-label="Spieltag, nach dem die Ausgabe erscheint" style="${sel}">${(termine||[]).map(t=>`<option value="${Number(t.id)}">${esc(_nestDatum(t.datum))} · ${esc(t.titel||t.gegner||t.typ)}</option>`).join("")||'<option value="">kein kommender Spieltag</option>'}</select>
      <button type="button" class="btn" id="nest-ablauf-bestaetigen" onclick="nestAblaufBestaetigen()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Porträtkind bestätigen</button>`);
    return;
  }
  const [stimmen,reporter,profil,satz,cfg]=await Promise.all([
    fetch(`${SB_URL}/rest/v1/portraet_trainerstimme?einreichung_id=eq.${Number(e.id)}&select=id,trainer_id,stichpunkte`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
    fetch(`${SB_URL}/rest/v1/kabine_reporter?spieler_id=eq.${Number(e.spieler_id)}&select=id,freigegeben`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
    fetch(`${SB_URL}/rest/v1/profiles?role=eq.trainer&select=id,anzeigename`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[]),
    _nestRpc("portraet_beteiligung",{p_spieler:e.spieler_id}),
    fetch(`${SB_URL}/rest/v1/team_config?select=portraet_schwelle&limit=1`,{headers:sbAuthHeaders()}).then(r=>r.ok?r.json():[]).catch(()=>[])]);
  const ich=(typeof sbUid==="function")?sbUid():null, meine=(stimmen||[]).find(x=>x.trainer_id===ich);
  const name=id=>((profil||[]).find(p=>p.id===id)||{}).anzeigename||"Trainer";
  const nRep=(reporter||[]).length, nFrei=(reporter||[]).filter(x=>x.freigegeben).length, nTr=(profil||[]).length||1;
  const k=e.kader||{}, t=e.termine||{}, fotos=(e.privatfotos||[]).length, schwelle=((cfg||[])[0]||{}).portraet_schwelle||90;
  window._nestAblauf=e;
  box.innerHTML=rahmen(`<div style="font-size:var(--s-teil);font-weight:900">${esc(k.name||"")}${k.nr!=null?" · Nr. "+esc(k.nr):""}</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">Ausgabe nach ${esc(t.titel||t.gegner||"dem Spieltag")}${t.datum?" am "+esc(_nestDatum(t.datum)):""} · Eltern bis ${esc(_nestFrist(e.frist_eltern))} · Trainer bis ${esc(_nestFrist(e.frist_trainer))}</div>
    <div id="nest-ampel">
      ${_nestAmpel(e.status!=="angefragt",e.status!=="angefragt"?`Bogen der Eltern eingereicht${fotos?` (${fotos} ${fotos===1?"Foto":"Fotos"})`:""}`:"Bogen der Eltern")}
      ${_nestAmpel(nRep>0,nRep?`Antworten des Kindes: ${nRep}, davon ${nFrei} freigegeben (Freigabe in der Ausgabe)`:"Antworten des Kindes im Kabinen-Reporter")}
      ${_nestAmpel((stimmen||[]).length>0,(stimmen||[]).length?`Trainerstimmen: ${(stimmen||[]).length} von ${nTr}`:"Trainerstimmen")}
    </div>
    ${(typeof satz==="string"&&satz)?`<div id="nest-beteiligung" style="font-size:var(--s-text);margin:6px 0">✓ ${esc(satz)} <span style="color:var(--text2)">(aus der Anwesenheitsliste)</span></div>`:""}
    <label for="nest-stimme" style="display:block;font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:10px 0 4px">Deine Stichpunkte: was das Kind auszeichnet, woran es arbeitet</label>
    <textarea id="nest-stimme" rows="3" maxlength="600" style="width:100%;padding:10px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text);box-sizing:border-box">${esc((meine&&meine.stichpunkte)||"")}</textarea>
    <button type="button" class="btn" id="nest-stimme-erfassen" onclick="nestStimmeErfassen()" style="width:100%;min-height:48px;margin-top:6px;justify-content:center">Stimme erfassen</button>
    ${(stimmen||[]).filter(x=>x.trainer_id!==ich).map(x=>`<div style="font-size:var(--s-text);padding:6px 0;border-top:1px solid var(--rand-bedien);margin-top:6px"><b>${esc(name(x.trainer_id))}:</b> ${esc(x.stichpunkte)}</div>`).join("")}
    <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <label for="nest-schwelle" style="font-size:var(--s-klein);color:var(--text2);flex:1;min-width:160px">Satz „bei (fast) jedem Training dabei“ ab</label>
      <input id="nest-schwelle" type="number" min="50" max="100" step="5" value="${Number(schwelle)}" style="width:80px;min-height:44px;padding:6px;border:1px solid var(--rand-bedien);border-radius:var(--r);font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)"> <span>%</span>
      <button type="button" class="btn btn-sm" onclick="nestSchwelleErfassen()" style="min-height:44px">Übernehmen</button>
    </div>
    <button type="button" class="btn btn-sm" onclick="nestAblaufVerwerfen()" style="min-height:44px;margin-top:8px">Anderes Kind wählen</button>`);
}
async function nestAblaufBestaetigen(){
  const sid=Number(document.getElementById("nest-ablauf-kind")?.value||0), tid=Number(document.getElementById("nest-ablauf-termin")?.value||0);
  if(!sid||!tid){ toast("Kind und Spieltag wählen","err"); return; }
  const r=await _nestRpc("portraet_anfragen",{p_spieler:sid,p_termin:tid});
  if(!r){ toast("Nicht angelegt – für diesen Spieltag oder dieses Kind läuft schon ein Porträt","err"); return; }
  toast("Porträtkind bestätigt – Eltern und Trainer werden benachrichtigt"); nestAblaufLaden();
}
async function nestAblaufVerwerfen(){
  const e=window._nestAblauf; if(!e)return;
  if(!await frageJaNein({emoji:"🪺",titel:"Anderes Kind wählen?",text:"Bogen, Fotos der Eltern und Trainerstimmen zu diesem Porträt werden gelöscht.",ja:"Verwerfen",ton:"rot"}))return;
  for(const f of (e.privatfotos||[])){ try{await fetch(`${SB_URL}/storage/v1/object/heft_media/${f.pfad}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}});}catch(x){} }
  try{const r=await fetch(`${SB_URL}/rest/v1/portraet_einreichung?id=eq.${Number(e.id)}`,{method:"DELETE",headers:sbAuthHeaders()}); if(!r.ok){toast("Nicht verworfen","err");return;}}catch(x){toast("Netzwerkfehler","err");return;}
  nestAblaufLaden();
}
async function nestStimmeErfassen(){
  const e=window._nestAblauf, t=(document.getElementById("nest-stimme")?.value||"").trim(); if(!e)return;
  if(!t){ toast("Erst zwei, drei Stichpunkte eintragen","err"); return; }
  try{const r=await fetch(`${SB_URL}/rest/v1/portraet_trainerstimme?on_conflict=einreichung_id,trainer_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({einreichung_id:e.id,trainer_id:(typeof sbUid==="function"?sbUid():undefined),stichpunkte:t.slice(0,600)})});
    if(!r.ok){toast("Stimme nicht erfasst","err");return;}}catch(x){toast("Netzwerkfehler","err");return;}
  toast("Stimme erfasst"); nestAblaufLaden();
}
async function nestSchwelleErfassen(){
  const v=Math.round(Number(document.getElementById("nest-schwelle")?.value||0));
  if(!(v>=50&&v<=100)){ toast("Schwelle zwischen 50 und 100 %","err"); return; }
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=not.is.null`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({portraet_schwelle:v})}); if(!r.ok){toast("Schwelle nicht gespeichert","err");return;}}catch(x){toast("Netzwerkfehler","err");return;}
  toast(`Schwelle ${v} % übernommen`); nestAblaufLaden();
}

/* Eltern: Karte „Euer Kind ist im nächsten Adler Nest“ und der Porträt-Bogen */
let _nestBogen=null;   // {e, name, fotos:[{pfad,unterschrift}], neu:[pfad], ok:boolean}
async function nestBogenKarte(kids){
  const slot=document.getElementById("nest-bogen-slot"); if(!slot)return;
  const ids=(kids||[]).map(k=>Number(k.spieler_id)).filter(Boolean); if(!ids.length){slot.innerHTML="";return;}
  let rows=[]; try{const r=await fetch(`${SB_URL}/rest/v1/portraet_einreichung?spieler_id=in.(${ids.join(",")})&status=neq.uebernommen&select=id,spieler_id,status,frist_eltern,privatfotos,einverstanden_am`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  window._nestEinreichungen=rows||[];
  const nameVon=sid=>{const k=(kids||[]).find(x=>Number(x.spieler_id)===Number(sid));return ((k&&k.kader&&k.kader.name)||"Euer Kind").split(" ")[0];};
  slot.innerHTML=(rows||[]).map(e=>{ const zu=new Date(e.frist_eltern)<new Date(), fertig=e.status==="eingereicht";
    return `<button type="button" class="nest-bogen-karte" onclick="nestBogenOpen(${Number(e.id)})" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:2px solid #0044AA;border-radius:14px;padding:12px 14px;margin-bottom:12px;font-family:inherit;cursor:pointer;min-height:56px">
      <span style="font-size:var(--s-seite)" aria-hidden="true">🪺</span>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-karte);font-weight:800;color:#0A1A3A">${esc(nameVon(e.spieler_id))} ist im nächsten Adler Nest</span>
      <span style="display:block;font-size:var(--s-klein);color:#45506a">${fertig?"✓ Bogen eingereicht – ändern bis "+esc(_nestFrist(e.frist_eltern)):zu?"Der Bogen ist noch offen – ein paar Angaben reichen schon.":"Bitte den Porträt-Bogen ausfüllen bis "+esc(_nestFrist(e.frist_eltern))}</span></span>
      <span style="font-size:var(--s-karte);color:#45506a" aria-hidden="true">›</span></button>`; }).join("");
  if(rows.length&&new URLSearchParams(location.search).get("nest")==="bogen"&&!window._nestBogenAuto){ window._nestBogenAuto=true; nestBogenOpen(rows[0].id); }
}
async function nestBogenOpen(id){
  const e=(window._nestEinreichungen||[]).find(x=>Number(x.id)===Number(id)); if(!e)return;
  const k=(window._elternKids||[]).find(x=>Number(x.spieler_id)===Number(e.spieler_id));
  _nestBogen={e, name:((k&&k.kader&&k.kader.name)||"Euer Kind").split(" ")[0], fotos:(e.privatfotos||[]).map(f=>({pfad:f.pfad,unterschrift:f.unterschrift||""})), neu:[], ok:!!e.einverstanden_am};
  document.getElementById("nest-bogen")?.remove();
  const m=document.createElement("div"); m.id="nest-bogen";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Porträt-Bogen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.style.zIndex=zOben(10001);
  document.body.appendChild(m);
  nestBogenRender();
}
function nestBogenRender(){
  const m=document.getElementById("nest-bogen"); if(!m||!_nestBogen)return; const b=_nestBogen;
  const inp="width:100%;min-height:48px;padding:9px;margin:4px 0 8px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text)";
  m.innerHTML=`<div style="background:#fff;color:#0A1A3A;border-radius:16px;padding:18px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("nest-bogen","🪺",`${esc(b.name)} im Adler Nest`,"Euer Kind wird im nächsten Heft vorgestellt","#0044AA")}
    <div style="font-size:var(--s-text);line-height:1.5;margin-bottom:12px">Bis ${esc(_nestFrist(b.e.frist_eltern))} sammeln wir ein paar Angaben. Das Trainerteam schreibt daraus das Porträt und liest es vor dem Erscheinen. Im Heft steht nur der Vorname. Das Heft lesen nur angemeldete Team-Familien.</div>
    <div style="font-weight:800;margin:8px 0 4px">1 · Fan-Fakten</div>
    <div style="font-size:var(--s-klein);color:#45506a;margin-bottom:6px">Hobby, Lieblingsverein, starker Fuß, weiterer Sport, Saisonziel – was ihr eintragt, kann ins Porträt.</div>
    <button type="button" class="btn" onclick="if(typeof elternFanfactsOpen==='function')elternFanfactsOpen(${Number(b.e.spieler_id)},'${jsq(b.name)}')" style="width:100%;min-height:48px;justify-content:center">✏️ Fan-Fakten ausfüllen</button>
    <div style="font-weight:800;margin:16px 0 4px">2 · Bis zu zwei Fotos (freiwillig)</div>
    <div id="nest-bogen-fotos">${b.fotos.map((f,i)=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0"><img id="nest-bogen-img-${i}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;background:#eef3fb"><span style="flex:1;font-size:var(--s-text)">${esc(f.unterschrift||"ohne Unterschrift")}</span><button type="button" class="btn btn-sm" style="min-height:44px" onclick="nestBogenFotoWeg(${i})">Entfernen</button></div>`).join("")}</div>
    ${b.fotos.length<NEST_MAX_PRIVAT?`<label for="nest-bogen-text" style="font-size:var(--s-klein);color:#45506a">Bildunterschrift</label>
      <input id="nest-bogen-text" maxlength="80" placeholder="z. B. Beim Schwimmen" style="${inp}">
      <label class="btn" style="width:100%;min-height:48px;justify-content:center;cursor:pointer;position:relative;${b.ok?"":"opacity:.55"}">📷 Foto auswählen<input type="file" id="nest-bogen-wahl" accept="image/jpeg,image/png,image/webp" ${b.ok?"":"disabled"} onchange="nestBogenFotoHoch(this)" style="position:absolute;opacity:0;width:1px;height:1px"></label>
      ${b.ok?"":`<div style="font-size:var(--s-klein);color:#45506a;margin-top:4px">Fotos erst nach dem Häkchen unten.</div>`}`
      :`<div style="font-size:var(--s-klein);color:#45506a">Mehr als zwei Fotos gehen nicht.</div>`}
    <label style="display:flex;gap:10px;align-items:flex-start;margin:16px 0 8px;font-size:var(--s-text);line-height:1.4;min-height:44px">
      <input type="checkbox" id="nest-bogen-ok" ${b.ok?"checked":""} onchange="nestBogenOk(this)" style="width:22px;height:22px;flex:none;margin-top:2px">
      <span>Wir sind einverstanden, dass diese Angaben und Fotos im Adler Nest erscheinen.</span></label>
    <button type="button" class="btn btn-p" id="nest-bogen-einreichen" ${b.ok?"":"disabled"} onclick="nestBogenEinreichen()" style="width:100%;min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800">${b.e.status==="eingereicht"?"Änderungen einreichen":"Bogen einreichen"}</button>
    <button type="button" onclick="nestBogenClose()" style="display:block;margin:10px auto 0;min-height:44px;border:none;background:none;color:#45506a;font-family:inherit;font-size:var(--s-text);cursor:pointer">Schließen</button>
  </div>`;
  b.fotos.forEach(async(f,i)=>{ const u=await nestBlobUrl("heft_media",f.pfad); const el=document.getElementById("nest-bogen-img-"+i); if(u&&el)el.src=u; });
}
async function nestBogenOk(el){
  const b=_nestBogen; if(!b)return;
  if(el.checked){ b.ok=true; nestBogenRender(); return; }
  if(!b.e.einverstanden_am&&!b.neu.length){ b.ok=false; nestBogenRender(); return; }
  if(!await frageJaNein({emoji:"🪺",titel:"Einverständnis zurückziehen?",text:"Eure Fotos werden aus dem Bogen und aus dem Heft entfernt.",ja:"Zurückziehen",ton:"rot"})){ el.checked=true; return; }
  const weg=(await _nestRpc("portraet_einreichen",{p_einreichung:b.e.id,p_einverstanden:false,p_privatfotos:[]}))||[];
  const pfade=new Set(weg.map(x=>x.pfad).concat(b.neu));
  for(const p of pfade){ try{await fetch(`${SB_URL}/storage/v1/object/heft_media/${p}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}});}catch(x){} }
  b.ok=false; b.fotos=[]; b.neu=[]; b.e.einverstanden_am=null; b.e.status="angefragt"; b.e.privatfotos=[];
  toast("Einverständnis zurückgezogen – Fotos entfernt"); nestBogenRender();
  if(typeof nestBogenKarte==="function")nestBogenKarte(window._elternKids||[]);
}
async function nestBogenFotoHoch(input){
  const b=_nestBogen, file=input.files&&input.files[0]; if(!b||!file)return;
  if(!b.ok){ toast("Erst das Einverständnis bestätigen","err"); input.value=""; return; }
  if(b.fotos.length>=NEST_MAX_PRIVAT){ toast(`Höchstens ${NEST_MAX_PRIVAT} Fotos`,"err"); return; }
  input.disabled=true;
  try{
    const blob=await _nestBildKleiner(file);
    const pfad=`einreichung/${Number(b.e.id)}/${(crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()}.jpg`;
    const r=await fetch(`${SB_URL}/storage/v1/object/heft_media/${pfad}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!r.ok){ toast("Foto nicht hochgeladen","err"); return; }
    b.fotos.push({pfad,unterschrift:(document.getElementById("nest-bogen-text")?.value||"").trim().slice(0,80)}); b.neu.push(pfad);
    nestBogenRender();
  }finally{ input.disabled=false; }
}
// Auf höchstens 1600 px Kante verkleinern, Seitenverhältnis bleibt (fotoCompress schneidet quadratisch zu)
function _nestBildKleiner(file){
  return new Promise(ok=>{ try{ const u=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{ const f=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)), c=document.createElement("canvas");
      c.width=Math.round(img.naturalWidth*f); c.height=Math.round(img.naturalHeight*f); c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(u); c.toBlob(b=>ok(b||file),"image/jpeg",0.85); };
    img.onerror=()=>{ URL.revokeObjectURL(u); ok(file); }; img.src=u; }catch(e){ ok(file); } });
}
function nestBogenFotoWeg(i){ const b=_nestBogen; if(!b)return; b.fotos.splice(i,1); nestBogenRender(); }
async function nestBogenEinreichen(){
  const b=_nestBogen; if(!b)return;
  if(!b.ok){ toast("Bitte das Einverständnis bestätigen","err"); return; }
  const weg=await _nestRpc("portraet_einreichen",{p_einreichung:b.e.id,p_einverstanden:true,p_privatfotos:b.fotos});
  if(weg===null){ toast("Nicht eingereicht – bitte noch einmal versuchen","err"); return; }
  const behalten=new Set(b.fotos.map(f=>f.pfad));
  const loeschen=new Set((weg||[]).map(x=>x.pfad).concat(b.neu.filter(p=>!behalten.has(p))));
  for(const p of loeschen){ try{await fetch(`${SB_URL}/storage/v1/object/heft_media/${p}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}});}catch(x){} }
  b.neu=[]; toast("Bogen eingereicht – danke! 🦅");
  document.getElementById("nest-bogen")?.remove(); _nestBogen=null;
  if(typeof nestBogenKarte==="function")nestBogenKarte(window._elternKids||[]);
}
async function nestBogenClose(){
  const b=_nestBogen;
  // hochgeladen, aber nicht eingereicht: wieder entfernen
  if(b&&b.neu.length){ for(const p of b.neu){ try{await fetch(`${SB_URL}/storage/v1/object/heft_media/${p}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}});}catch(x){} } }
  document.getElementById("nest-bogen")?.remove(); _nestBogen=null;
}

/* Kinder: Hinweis in der Kabine auf die Porträtfragen im Kabinen-Reporter (bis zur Frist der Eltern) */
async function kabineNestHinweisLoad(){
  const el=document.getElementById("kab-nest-hinweis"); if(!el)return;
  const ids=(window._elternKids||[]).map(k=>Number(k.spieler_id)).filter(Boolean); if(!ids.length){el.innerHTML="";return;}
  let rows=[]; try{const r=await fetch(`${SB_URL}/rest/v1/portraet_einreichung?spieler_id=in.(${ids.join(",")})&status=neq.uebernommen&frist_eltern=gt.${encodeURIComponent(new Date().toISOString())}&select=spieler_id`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  if(!(rows||[]).length){el.innerHTML="";return;}
  el.innerHTML=`<button type="button" onclick="if(typeof kabineReporter==='function')kabineReporter()" style="display:flex;align-items:center;gap:10px;margin:2px 16px 8px;width:calc(100% - 32px);min-height:56px;border:1px solid rgba(255,255,255,.3);border-radius:16px;background:linear-gradient(135deg,rgba(0,68,170,.75),rgba(10,26,58,.6));color:#fff;font-family:inherit;text-align:left;padding:10px 14px;cursor:pointer">
    <span style="font-size:26px" aria-hidden="true">🪺</span>
    <span style="flex:1"><span style="display:block;font-size:15px;font-weight:900">Du bist im nächsten Adler Nest!</span>
    <span style="display:block;font-size:12.5px;opacity:.92">Beantworte im Kabinen-Reporter deine Porträtfragen.</span></span></button>`;
}
/* Direktlinks aus den Benachrichtigungen: ./trainer/?nest=ablauf öffnet den Editor, sobald angemeldet. */
if(typeof location!=="undefined"&&new URLSearchParams(location.search).get("nest")==="ablauf"&&/\/trainer\//.test(location.pathname)){
  let _nestVersuche=0; const _nestT=setInterval(()=>{ _nestVersuche++;
    const app=document.getElementById("main-app");
    if(typeof sbToken==="function"&&sbToken()&&app&&app.style.display!=="none"){ clearInterval(_nestT); nestEditorOpen(); }
    else if(_nestVersuche>240)clearInterval(_nestT); },500);
}
/* Wache für die MODUL_WACHE – muss die letzte Definition der Datei bleiben. */
function nestModulDa(){ return true; }
