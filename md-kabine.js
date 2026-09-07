/* ═══════════════════════════════════
   KIDS-MODE "DIE KABINE" (Phase 11-P) – kindersicheres Vollbild (read-only), Exit nur
   ueber Mathe-Aufgabe. Inhalt: Team-Galerie (opt-in Fotos), Quiz, Missionen.
   isKidsMode ist ein UX-Schloss (versteckt Editierbares) – die echte Sicherheit bleibt
   die RLS: die Eltern-Session kann ohnehin nur das eigene Kind schreiben.
═══════════════════════════════════ */
let isKidsMode=false, kabineGalleryData=[], kabineIdx=0;
const KABINE_AKTIV_KEY="adler_kabine_aktiv";
/* Der Kids-Modus ueberlebt jetzt Reload UND App-Neustart: ein Kind, das die Seite neu
   laedt, landete vorher wieder im Eltern-Hub (PO-Befund). Raus geht es nur ueber den
   Code - genau das ist der Sinn des Schlosses. */
function kabineAktiv(){ try{return localStorage.getItem(KABINE_AKTIV_KEY)==="1";}catch(e){return false;} }
function kabineAktivSet(an){ try{ an?localStorage.setItem(KABINE_AKTIV_KEY,"1"):localStorage.removeItem(KABINE_AKTIV_KEY); }catch(e){} }
const KABINE_MAX_MIN=60;               // PO: nach einer Stunde ist Kabinen-Zeit vorbei
const KABINE_START_KEY="adler_kabine_start";
/* Die Uhr laeuft ueber einen gespeicherten Startzeitpunkt, nicht ueber einen Timer im
   Speicher: so wirkt das Limit auch nach einem Reload (der Kids-Modus ueberlebt den ja). */
function kabineZeitRestMin(){
  try{
    const t0=parseInt(localStorage.getItem(KABINE_START_KEY)||"0",10);
    if(!t0)return KABINE_MAX_MIN;
    return KABINE_MAX_MIN-Math.floor((Date.now()-t0)/60000);
  }catch(e){return KABINE_MAX_MIN;}
}
function kabineZeitEnde(){
  clearInterval(window._kabZeitTimer); window._kabZeitTimer=null;
  isKidsMode=false; kabineAktivSet(false);
  try{localStorage.removeItem(KABINE_START_KEY);}catch(e){}
  document.getElementById("kabexit")?.remove();
  document.getElementById("kabine")?.remove();
  if(typeof toast==="function")toast("⏰ Kabinen-Zeit vorbei – bis zum nächsten Mal!");
  if(typeof elternDashLoad==="function")elternDashLoad(); // zurück in den Eltern-Bereich
}
function kabineZeitTick(){
  const rest=kabineZeitRestMin();
  if(rest<=0){ kabineZeitEnde(); return; }
  const el=document.getElementById("kab-zeit");
  if(el)el.innerHTML=rest<=10
    ? `<div style="background:rgba(251,191,36,.22);border:1px solid rgba(251,191,36,.5);border-radius:12px;padding:9px 12px;margin:0 16px 10px;font-size:12.5px;font-weight:700">⏰ Noch ${rest} Min. Kabinen-Zeit</div>`
    : "";
}
async function kabineOpen(){
  window._nutzungRolle="kind";   // Nutzungslog: die Kabine ist der Kinderbereich
  isKidsMode=true;
  kabineAktivSet(true);
  try{ if(!localStorage.getItem(KABINE_START_KEY))localStorage.setItem(KABINE_START_KEY,String(Date.now())); }catch(e){}
  if(kabineZeitRestMin()<=0){ kabineZeitEnde(); return; }   // abgelaufen: gar nicht erst oeffnen
  clearInterval(window._kabZeitTimer);
  window._kabZeitTimer=setInterval(kabineZeitTick,30000);
  document.getElementById("kabine-splash")?.remove(); // Vorhang gegen Dashboard-Aufblitzen
  document.getElementById("kabine")?.remove();
  const m=document.createElement("div");m.id="kabine";
  m.style.cssText="position:fixed;inset:0;z-index:10050;background:linear-gradient(160deg,#0f172a,#1e3a8a);color:#fff;display:flex;flex-direction:column;overflow:hidden";
  m.innerHTML='<div id="kabine-body" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>';
  document.body.appendChild(m);
  // Tages-Tüte je Kind (tuete_tag in der DB verhindert Doppelvergabe – auch geräteübergreifend)
  try{const heute=new Date().toISOString().slice(0,10);
    (window._elternKids||[]).forEach(async k=>{
      const row=await _albumRow(k.spieler_id);
      if(row.tuete_tag!==heute){row.tuete_tag=heute;row.tueten=Math.min(9,(row.tueten||0)+1);_albumSave(row);}
    });}catch(e){}
  // 🎂 K6: Geburtstags-Post von Horst – hat ein Kind heute Geburtstag, legt die Kabine
  // einmalig eine goldene Post vom Maskottchen in den Briefkasten (+ Konfetti).
  (async()=>{try{
    const kids=window._elternKids||[]; if(!kids.length)return;
    const heute=new Date().toISOString().slice(0,10), md=heute.slice(5);
    const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kader?id=in.(${ids})&select=id,geb`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    let neu=false;
    for(const k of ((await r.json())||[])){
      if(!k.geb||String(k.geb).slice(5)!==md)continue;
      const chk=await fetch(`${SB_URL}/rest/v1/kabine_post?an_spieler=eq.${k.id}&typ=eq.horst&datum=eq.${heute}&select=id&limit=1`,{headers:sbAuthHeaders()});
      if(chk.ok&&((await chk.json())||[]).length)continue;
      await fetch(`${SB_URL}/rest/v1/kabine_post`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({typ:"horst",an_spieler:k.id,text_key:0,datum:heute})});
      neu=true;
    }
    if(neu){
      const b2=document.getElementById("kabine-body");
      if(b2&&typeof confetti==="function")confetti(b2);
      kabinePostLoad(); // Briefkasten zeigt die Geburtstags-Post sofort
    }
  }catch(e){}})();
  kabineHome();
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/team_gallery`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)kabineGalleryData=await r.json();}catch(e){}
  if(typeof loadTeamConfig==="function"){try{await loadTeamConfig();}catch(e){}}
}
/* C1 – Kollektives Adler-Level: die ganze Mannschaft steigt gemeinsam (Summe aller Federn,
   RPC team_federn_total). Ein Wir-Ziel statt Einzel-Ranking. */
const TEAM_LEVEL_STEP=500;
const TEAM_LEVEL_TITLES=["Küken-Schwarm","Junge Adler","Adler-Flug","Adler-Elite","Adler-Legenden","Adler-Dynastie"];
function teamLevelInfo(total){
  total=Math.max(0,total|0);
  const level=Math.floor(total/TEAM_LEVEL_STEP)+1, into=total%TEAM_LEVEL_STEP;
  return {level,into,need:TEAM_LEVEL_STEP-into,pct:Math.round(into/TEAM_LEVEL_STEP*100),total,
    title:TEAM_LEVEL_TITLES[Math.min(level-1,TEAM_LEVEL_TITLES.length-1)]};
}
let _teamFedern={val:0,at:0};
async function teamLevelLoad(elId){
  const el=document.getElementById(elId); if(!el)return;
  let total=_teamFedern.val;
  if(Date.now()-_teamFedern.at>60000){ // R4: 60s-Cache – wird von mehreren Slots gleichzeitig gerendert
    try{const h=sbToken()?sbAuthHeaders():{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
      const r=await fetch(`${SB_URL}/rest/v1/rpc/team_federn_total`,{method:"POST",headers:{...h,'Content-Type':'application/json'},body:"{}"});
      if(r.ok){total=await r.json();_teamFedern={val:total||0,at:Date.now()};}}catch(e){}
  }
  const L=teamLevelInfo(total||0);
  el.innerHTML=`<div style="background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border-radius:16px;padding:14px 16px">
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:26px">🦅</span>
      <div style="flex:1;min-width:0"><div style="font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:.5px">Team-Level ${L.level}</div>
      <div style="font-size:16px;font-weight:900">${esc(L.title)}</div></div>
      <div style="font-size:12px;opacity:.9;white-space:nowrap">${XP_ICON} ${L.total}</div>
    </div>
    <div style="height:10px;background:rgba(255,255,255,.25);border-radius:6px;overflow:hidden;margin-top:10px"><div style="height:100%;width:${L.pct}%;background:#fbbf24;border-radius:6px;transition:width .6s"></div></div>
    <div style="font-size:11px;opacity:.92;margin-top:6px">Noch ${L.need} ${XP_LABEL} bis Level ${L.level+1} – jede Feder zählt fürs ganze Team!</div>
  </div>`;
}
/* C2 → v322: Panini-Album PRO KIND in der DB (album_kind) – geräteübergreifend und
   Grundlage der TAUSCHBÖRSE. Tüten & Sticker hängen jetzt am Kind, nicht mehr am Handy.
   Tüten verdient man weiter durch Aktionen (täglich, Stimmung, Packliste, Kompliment –
   je +1, max. 9 Vorrat). Ein alter localStorage-Stand wird einmalig allen Familien-
   Kindern gutgeschrieben (sie haben ohnehin gemeinsam am Gerät gesammelt). */
async function _albumRow(sid){
  try{const r=await fetch(`${SB_URL}/rest/v1/album_kind?spieler_id=eq.${sid}&select=*`,{headers:sbAuthHeaders()});
    if(r.ok){const row=((await r.json())||[])[0];if(row){row.sticker=row.sticker||{};return row;}}}catch(e){}
  return {spieler_id:sid,sticker:{},tueten:0,tuete_tag:null};
}
async function _albumSave(row){
  try{await fetch(`${SB_URL}/rest/v1/album_kind?on_conflict=spieler_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({spieler_id:row.spieler_id,sticker:row.sticker||{},tueten:row.tueten||0,tuete_tag:row.tuete_tag||null,updated_at:new Date().toISOString()})});}catch(e){}
}
async function albumTuete(sid){ if(!sid)return; const row=await _albumRow(sid); row.tueten=Math.min(9,(row.tueten||0)+1); await _albumSave(row); }
// Einmalige Migration: alte Geräte-Sammlung (localStorage) allen Familien-Kindern gutschreiben
async function _albumMigrate(kids){
  try{
    if(localStorage.getItem("adler_album_mig"))return;
    let local=null; try{local=JSON.parse(localStorage.getItem("adler_album")||"null");}catch(e){}
    const lt=Math.max(0,parseInt(localStorage.getItem("adler_tueten")||"0",10)||0);
    if(local&&Object.keys(local).length){
      for(const k of (kids||[])){
        const row=await _albumRow(k.spieler_id);
        Object.keys(local).forEach(key=>{row.sticker[key]=Math.max(row.sticker[key]||0,local[key]||0);});
        row.tueten=Math.min(9,(row.tueten||0)+lt);
        await _albumSave(row);
      }
    }
    localStorage.setItem("adler_album_mig","1");
    localStorage.removeItem("adler_album"); localStorage.removeItem("adler_tueten");
  }catch(e){}
}
// Voller Kader als Sticker-Grundlage (RPC, da Eltern-RLS auf kader nur eigene Kinder zeigt)
async function _albumRoster(){
  if(window._kabRoster&&window._kabRoster.length)return window._kabRoster;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kader_namen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)rows=(await r.json())||[];}catch(e){}
  if(rows.length)window._kabRoster=rows;
  return rows;
}
/* Raritäten (PO-Wunsch): neben den Kindern gibt es Trainer- (SELTEN), Vereins- (EPISCH,
   mit Foil-Schimmer) und LEGENDÄR-Sticker (Gold + Regenbogen-Holo, sehr selten).
   w = Ziehungs-Gewicht pro Sticker – Legendär fällt im Schnitt 1× in ~25 Ziehungen. */
const KAB_RAR={
  kind:     {lbl:"",         gem:"",   own:"linear-gradient(135deg,#f59e0b,#ec4899)", shadow:"0 4px 14px rgba(236,72,153,.4)",  dash:"", w:100},
  selten:   {lbl:"SELTEN",   gem:"⭐", own:"linear-gradient(135deg,#60a5fa,#1d4ed8)", shadow:"0 4px 14px rgba(59,130,246,.45)", dash:"rgba(96,165,250,.5)", w:30},
  matchday: {lbl:"MATCHDAY", gem:"🔥", own:"linear-gradient(135deg,#fb923c,#dc2626)", shadow:"0 4px 16px rgba(249,115,22,.5)",  dash:"rgba(251,146,60,.55)", w:8, foil:true},
  episch:   {lbl:"EPISCH",   gem:"💎", own:"linear-gradient(135deg,#c084fc,#7c3aed)", shadow:"0 4px 16px rgba(168,85,247,.5)",  dash:"rgba(192,132,252,.5)", w:12, foil:true},
  legendaer:{lbl:"LEGENDÄR", gem:"👑", own:"linear-gradient(135deg,#fde047,#f59e0b)", shadow:"0 4px 18px rgba(250,204,21,.55)", dash:"rgba(253,224,71,.55)", w:4,  foil:true, leg:true}
};
// Spieltage der Saison (für die rollierenden MATCHDAY-Karten), 5-Min-Cache
async function _spieltageSaison(){
  if(window._kabSpieltage&&Date.now()-window._kabSpieltage.at<300000)return window._kabSpieltage.rows;
  const d=new Date(), y=d.getFullYear();
  const saisonAb=`${d.getMonth()>=6?y:y-1}-07-01`;
  const heute=new Date().toISOString().slice(0,10);
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,datum&typ=in.(spiel,turnier)&datum=gte.${saisonAb}&datum=lte.${heute}&order=datum.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok)rows=(await r.json())||[];}catch(e){}
  window._kabSpieltage={at:Date.now(),rows};
  return rows;
}
async function _albumPool(){
  const kids=await _albumRoster();
  const pool=kids.map(k=>({key:k.name,label:k.name,sub:k.nr!=null?"#"+k.nr:"",emo:"🦅",rar:"kind"}));
  ((typeof TRAINER!=="undefined"&&TRAINER)||[]).forEach(t=>pool.push({key:"tr_"+t,label:t,sub:"Trainer",emo:"🧢",rar:"selten"}));
  // Verein & Kultur (SELTEN)
  pool.push({key:"sp_ball",label:"Der Spielball",sub:"Immer mittendrin",emo:"⚽",rar:"selten"});
  pool.push({key:"sp_kaefig",label:"Der Käfig",sub:"Wo alles anfängt",emo:"🥅",rar:"selten"});
  pool.push({key:"sp_buedchen",label:"Das Büdchen",sub:"Halbzeit-Held",emo:"🍿",rar:"selten"});
  // Verein (EPISCH)
  pool.push({key:"sp_wappen",label:"Vereins-Wappen",sub:"SV Adler Dellbrück",img:"logo.png",rar:"episch"});
  pool.push({key:"sp_platz",label:"Thurner Kamp",sub:"Unser Platz",emo:"🏟️",rar:"episch"});
  pool.push({key:"sp_trikot",label:"Adler-Trikot",sub:"Unsere Farben",emo:"👕",rar:"episch"});
  pool.push({key:"sp_adler",label:"Der Adler",sub:"Unser Wappentier",emo:"🦅",rar:"episch"});
  pool.push({key:"sp_kurve",label:"Die Eltern-Kurve",sub:"Unsere Fans",emo:"📣",rar:"episch"});
  pool.push({key:"sp_nest",label:"Das Adler Nest",sub:"Unser Vereinsheft",emo:"🪺",rar:"episch"});
  // LEGENDÄR
  pool.push({key:"sp_pokal",label:"Der Pokal",sub:"Für große Träume",emo:"🏆",rar:"legendaer"});
  pool.push({key:"sp_horst",label:"Horst der Adler",sub:"Unser Maskottchen",emo:"🦅",rar:"legendaer"});
  pool.push({key:"sp_feder",label:"Die Goldene Feder",sub:"1000× verdient",emo:"🪶",rar:"legendaer"});
  // 🔥 MATCHDAY: nach jedem Spieltag der Saison eine Team-Karte EINES Kindes –
  // rollierend durch den Kader (Spieltag-Index % Kadergröße, Reihenfolge nach Kader-ID,
  // damit die Rotation stabil bleibt, auch wenn Namen sich alphabetisch verschieben).
  try{
    const st=await _spieltageSaison();
    const rr=kids.slice().sort((a,b)=>a.id-b.id);
    if(rr.length)st.forEach((t,i)=>{
      const kid=rr[i%rr.length];
      const d=new Date(t.datum+"T00:00:00");
      pool.push({key:"md_"+t.id,label:kid.name,sub:"Spieltag "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}),emo:"🔥",rar:"matchday",kidName:kid.name});
    });
  }catch(e){}
  // Vom Trainer hinterlegte Karten-Fotos (album_fotos, Adler-Welt) anheften – 5-Min-Cache
  try{
    if(!window._albFotos||Date.now()-window._albFotos.at>300000){
      const r=await fetch(`${SB_URL}/rest/v1/album_fotos?select=key,path`,{headers:sbAuthHeaders()});
      const map={}; if(r.ok)((await r.json())||[]).forEach(x=>map[x.key]=x.path);
      window._albFotos={at:Date.now(),map};
    }
    const fm=(window._albFotos&&window._albFotos.map)||{};
    pool.forEach(p=>{ if(fm[p.key])p.alPath=fm[p.key]; });
  }catch(e){}
  pool.forEach((p,i)=>p.num=i+1); // Album-Nummern wie im echten Panini-Heft
  return pool;
}
function _poolByKey(pool){ const m={}; pool.forEach(p=>m[p.key]=p); return m; }
// n verschiedene Sticker gewichtet ziehen (seltene Raritäten fallen entsprechend seltener)
function _albumDraw(pool,n){
  const bag=pool.slice(), out=[];
  while(out.length<Math.min(n,bag.length)){
    const total=bag.reduce((s,x)=>s+KAB_RAR[x.rar].w,0);
    let r=Math.random()*total, idx=bag.length-1;
    for(let i=0;i<bag.length;i++){ r-=KAB_RAR[bag[i].rar].w; if(r<=0){idx=i;break;} }
    out.push(bag.splice(idx,1)[0]);
  }
  return out;
}
/* Sticker-Design v2: echte Sammelkarten-Anmutung – Kopfzeile mit Album-Nummer und
   Duplikat-Zähler, Raritäts-Schriftzug, Avatar-Medaillon (Foto bei Freigabe, sonst
   Emoji) mit weißem Ring auf Glanz-Verlauf, dunkles Namensband unten. Grid und
   Tüten-Aufdeckung teilen sich die Optik. */
function _albumStickerHtml(g,n,tap){
  const R=KAB_RAR[g.rar]||KAB_RAR.kind;
  const dunkel=g.rar==="legendaer";
  if(!n)return `<div style="border-radius:14px;aspect-ratio:3/4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.45);${R.dash?`border:1.5px dashed ${R.dash}`:"border:1.5px dashed rgba(255,255,255,.18)"}">
      <span style="font-size:9px;font-weight:800;opacity:.65">Nr. ${g.num||"?"}</span>
      <span style="font-size:26px;opacity:.7">❓</span>
      ${R.lbl?`<span style="font-size:8.5px;font-weight:900;letter-spacing:.5px;opacity:.8">${R.gem?R.gem+" ":""}${R.lbl}</span>`:""}
    </div>`;
  return `<div class="${(R.foil?"kab-st":"")+(R.leg?" kab-leg kab-pulse":"")}" ${tap?`onclick="kabineStickerZoom('${jsq(g.key)}')"`:""} style="border-radius:14px;aspect-ratio:3/4;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;background:radial-gradient(130% 80% at 50% -10%,rgba(255,255,255,.35),transparent 55%),${R.own};border:2px solid rgba(255,255,255,.6);box-shadow:${R.shadow};color:${dunkel?"#78350f":"#fff"};${tap?"cursor:pointer":""}">
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:5px 7px 0;font-size:8.5px;font-weight:900;letter-spacing:.4px;box-sizing:border-box">
        <span>Nr. ${g.num||"?"}</span>${n>1?`<span style="background:rgba(0,0,0,.3);color:#fff;border-radius:8px;padding:0 6px">${n}×</span>`:"<span></span>"}
      </div>
      ${R.lbl?`<div style="font-size:7.5px;font-weight:900;letter-spacing:1.2px;margin-top:1px">${R.gem?R.gem+" ":""}${R.lbl}</div>`:""}
      <div data-st-ava="${esc(g.key)}" style="flex:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:0">
        <div style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.25);border:2px solid rgba(255,255,255,.75);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.25)">${g.img?`<img src="${g.img}" alt="" style="width:72%;height:72%;object-fit:contain">`:`<span style="font-size:24px">${g.emo}</span>`}</div>
      </div>
      <div style="width:100%;background:rgba(0,0,0,.28);padding:4px 4px 5px;text-align:center;box-sizing:border-box">
        <div style="font-size:10.5px;font-weight:900;line-height:1.1;color:#fff">${esc(g.label)}</div>
        ${g.sub?`<div style="font-size:8.5px;color:rgba(255,255,255,.85)">${esc(g.sub)}</div>`:""}
      </div>
      ${R.foil?'<div class="stfoil"></div>':""}
    </div>`;
}
// Sticker groß ansehen (Tipp aufs Grid) – Overlay innerhalb der Kabine, Tipp schließt
function kabineStickerZoom(key){
  const pool=window._albPoolCache||[]; const g=pool.find(x=>x.key===key); if(!g)return;
  const n=((_albRow&&_albRow.sticker)||{})[key]||0; if(!n)return;
  document.getElementById("kab-zoom")?.remove();
  const z=document.createElement("div"); z.id="kab-zoom";
  z.style.cssText="position:absolute;inset:0;z-index:5;background:rgba(0,0,0,.65);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px";
  z.onclick=()=>z.remove();
  z.innerHTML=`<div style="width:160px;transform:scale(1.55);transform-origin:center">${_albumStickerHtml(g,n)}</div>
    <div style="font-size:11.5px;color:#fff;opacity:.85;margin-top:34px">Tippen zum Schließen</div>`;
  const host=document.getElementById("kabine"); if(host)host.appendChild(z);
  try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
  // Foto auch in der Zoom-Ansicht nachladen
  _albumFotosLaden([g],(_albRow&&_albRow.sticker)||{});
}
// Fotos progressiv nachladen (nur Kinder MIT Freigabe – team_gallery liefert foto_path
// bereits consent-gefiltert). Emoji bleibt Platzhalter, das Foto ersetzt es sanft.
function _albumFotosLaden(pool,col){
  if(typeof fotoLoadImage!=="function")return;
  const gal=(typeof kabineGalleryData!=="undefined"&&kabineGalleryData)||[];
  const setAva=(key,src)=>document.querySelectorAll(`[data-st-ava="${CSS.escape(key)}"]>div`).forEach(av=>{
    av.innerHTML=""; const im=document.createElement("img"); im.src=src; im.alt="";
    im.style.cssText="width:100%;height:100%;object-fit:cover"; av.appendChild(im);
  });
  pool.filter(g=>col[g.key]).forEach(g=>{
    // Kinder & Matchday: Profilfoto mit Freigabe; Trainer/Verein: vom Trainer gepflegtes Karten-Foto
    let path=null;
    if(g.rar==="kind"||g.rar==="matchday"){
      const gd=gal.find(x=>x.name===(g.kidName||g.key)); path=gd&&gd.foto_path;
    }else if(g.alPath)path=g.alPath;
    if(!path)return;
    fotoLoadImage(path).then(img=>{ if(img)setAva(g.key,img.src); }).catch(()=>{});
  });
}
let _albKid=null,_albName="",_albRow=null;
function kabineAlbum(){
  const kids=window._elternKids||[];
  if(!kids.length)return;
  if(kids.length===1){ kabineAlbumFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("📖 Wessen Album?","kabineAlbumFor");
}
async function kabineAlbumFor(sid,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  await _albumMigrate(window._elternKids||[]);
  const pool=await _albumPool();
  const row=await _albumRow(sid);
  _albKid=sid;_albName=name||"";_albRow=row;
  window._albPoolCache=pool;
  const col=row.sticker||{};
  // 🔥 Eigene MATCHDAY-Karten werden geschenkt: der Star des Spieltags bekommt seine Karte direkt
  const meineMd=pool.filter(g=>g.rar==="matchday"&&g.kidName===name&&!(col[g.key]||0));
  if(meineMd.length){
    meineMd.forEach(g=>col[g.key]=1); row.sticker=col; await _albumSave(row);
    toast(meineMd.length>1?`🔥 ${meineMd.length} Spieltags-Karten von DIR – geschenkt ins Album!`:"🔥 Die Spieltags-Karte von DIR – geschenkt ins Album!");
  }
  const got=pool.filter(g=>col[g.key]).length;
  const voll=pool.length>0&&got===pool.length;
  const t=row.tueten||0;
  // Fortschritts-Federn: 50 % und 100 % geben einmalig +25 (idempotent über quelle_id)
  if(pool.length){
    const pct=got/pool.length;
    const marke=voll?"album100":(pct>=0.5?"album50":null);
    if(marke){
      try{const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:sid,p_quelle:"album",p_quelle_id:marke})});
        if(r.ok){const d=await r.json();if(d>0)toast(`📖 ${voll?"Album voll":"Halbes Album geschafft"} – ${XP_ICON} +${d} ${XP_LABEL}!`);}}catch(e){}
    }
  }
  const albSec=t=>`<div style="grid-column:1/-1;font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.8px;opacity:.65;margin:6px 2px -2px">${t}</div>`;
  const albTeil=f=>pool.filter(f).map(g=>_albumStickerHtml(g,col[g.key]||0,!!col[g.key])).join("");
  const cards=albSec("⚽ Unsere Adler")+albTeil(g=>g.rar==="kind")
    +albSec("🧢 Trainer, Verein & Legenden")+albTeil(g=>g.rar==="selten"||g.rar==="episch"||g.rar==="legendaer")
    +(pool.some(g=>g.rar==="matchday")?albSec("🔥 Spieltags-Karten – nach jedem Spiel eine neue")+albTeil(g=>g.rar==="matchday"):"");
  b.innerHTML=`<div id="kab-album-view" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;position:relative">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800">📖 ${esc(name?name+"s":"Mein")} Album</div>
      <div style="font-size:13px;font-weight:800;opacity:.9">${got}/${pool.length}</div>
    </div>
    <div style="margin:0 16px 10px;background:rgba(255,255,255,.12);border-radius:16px;padding:12px 14px;text-align:center">
      <div style="font-size:14px;font-weight:900">🎁 Sticker-Tüten: ${t}</div>
      <button onclick="kabineAlbumPack()" ${t<1||!pool.length?"disabled":""} style="width:100%;margin-top:8px;border:none;border-radius:14px;padding:14px;font-family:inherit;font-size:16px;font-weight:900;cursor:${t<1?"default":"pointer"};${t<1?"background:rgba(255,255,255,.10);color:rgba(255,255,255,.5)":"background:linear-gradient(135deg,#f59e0b,#ec4899);color:#fff;box-shadow:0 4px 14px rgba(236,72,153,.4)"}">${t<1?"Keine Tüte übrig":"Tüte aufreißen! ✂️"}</button>
      <div style="font-size:10.5px;opacity:.8;margin-top:6px">Neue Tüten gibt's für: jeden Kabinen-Tag · Tasche packen · Kompliment schenken</div>
    </div>
    <button onclick="kabineTausch()" style="display:flex;align-items:center;gap:10px;margin:0 16px 10px;border:1px solid rgba(255,255,255,.18);border-radius:16px;background:linear-gradient(135deg,rgba(56,189,248,.45),rgba(2,132,199,.3));color:#fff;font-family:inherit;cursor:pointer;padding:12px 14px;text-align:left">
      <span style="font-size:24px">🔁</span>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:900">Tauschbörse</span>
      <span style="display:block;font-size:11px;opacity:.85">Doppelte gegen fehlende tauschen – mit dem ganzen Team!</span></span>
      <span style="font-size:16px;opacity:.85">›</span>
    </button>
    ${voll?'<div style="text-align:center;font-size:14px;font-weight:900;padding:0 16px 8px">🎉 ALBUM VOLL – alles gesammelt, Wahnsinn!</div>':""}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px 16px">${cards||'<div style="opacity:.7;grid-column:1/-1;text-align:center;padding:20px">Noch keine Karten im Team.</div>'}</div>
  </div>`;
  _albumFotosLaden(pool,col);
  if(voll){const cont=document.getElementById("kab-album-view");if(cont&&typeof confetti==="function")confetti(cont);}
}
async function kabineAlbumPack(){
  const row=_albRow; if(!row||!_albKid||(row.tueten||0)<1)return;
  const pool=await _albumPool(); if(!pool.length)return;
  row.tueten=(row.tueten||0)-1;
  let picks=_albumDraw(pool,3);
  // ✨ Spieltags-Glückstüte: die erste Tüte am Spieltag enthält garantiert eine Rarität
  let glueck=false;
  try{
    const heute=new Date().toISOString().slice(0,10), gk=`adler_glueck_${_albKid}_${heute}`;
    if(window._kabSpieltag&&!localStorage.getItem(gk)){
      localStorage.setItem(gk,"1");
      if(!picks.some(p=>p.rar!=="kind")){
        const rare=pool.filter(p=>p.rar!=="kind");
        if(rare.length){picks[0]=_albumDraw(rare,1)[0];glueck=true;}
      }else glueck=true;
    }
  }catch(e){}
  const col=row.sticker||{};
  window._packCards=picks.map(p=>{const had=col[p.key]||0;col[p.key]=had+1;return Object.assign({},p,{neu:!had,count:had+1,open:false});});
  row.sticker=col;
  await _albumSave(row);
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div id="kab-pack-open" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#fff;position:relative;overflow:hidden">
    <div style="font-size:20px;font-weight:900">✂️ Tüte ist offen!</div>
    ${glueck?'<div style="font-size:12px;font-weight:800;background:rgba(253,224,71,.25);border:1px solid rgba(253,224,71,.5);border-radius:12px;padding:6px 12px">✨ Spieltags-Glückstüte – heute ist eine Rarität drin!</div>':""}
    <div style="font-size:12.5px;opacity:.85">Tippe die Sticker an, um sie umzudrehen 👀</div>
    <div style="display:flex;gap:10px;width:100%;max-width:380px;justify-content:center">
      ${window._packCards.map((c,i)=>`<button id="pk-${i}" onclick="kabineAlbumFlip(${i})" style="flex:1;max-width:110px;border:none;border-radius:14px;aspect-ratio:3/4;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,#334155,#1e293b);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 4px 14px rgba(0,0,0,.35)"><span style="font-size:34px">🎴</span></button>`).join("")}
    </div>
    <button id="pk-done" onclick="kabineAlbumFor(_albKid,_albName)" style="display:none;margin-top:10px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Ins Album kleben 📖</button>
  </div>`;
}
function kabineAlbumFlip(i){
  const c=(window._packCards||[])[i]; if(!c||c.open)return;
  c.open=true;
  const el=document.getElementById("pk-"+i); if(!el)return;
  const R=KAB_RAR[c.rar]||KAB_RAR.kind;
  const dunkel=c.rar==="legendaer";
  try{navigator.vibrate&&navigator.vibrate(R.leg?[60,80,60,80,160]:c.neu?[40,60,90]:30);}catch(e){}
  el.style.background=c.neu?R.own:"linear-gradient(135deg,#64748b,#475569)";
  if(c.neu&&R.foil){el.classList.add("kab-st");if(R.leg)el.classList.add("kab-leg");}
  el.style.boxShadow=c.neu?R.shadow:el.style.boxShadow;
  el.innerHTML=`<span style="font-size:9px;font-weight:900;letter-spacing:.4px;${c.neu?(dunkel?"color:#78350f":"color:#fff"):"opacity:.8"}">${c.neu?(R.lbl?"✨ "+(R.gem?R.gem+" ":"")+R.lbl+"!":"✨ NEU!"):"schon "+c.count+"×"}</span>
    ${c.img?`<img src="${c.img}" alt="" style="width:30px;height:30px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.3))">`:`<span style="font-size:26px">${c.emo}</span>`}
    <span style="font-size:11px;font-weight:800;line-height:1.1;${c.neu&&dunkel?"color:#78350f":""}">${esc(c.label)}</span>
    ${c.sub?`<span style="font-size:9px;${c.neu&&dunkel?"color:#78350f":"opacity:.9"}">${esc(c.sub)}</span>`:""}
    ${c.neu&&R.foil?'<div class="stfoil"></div>':""}`;
  // Legendär aufgedeckt = sofort feiern, egal ob Duplikat
  if(R.leg){const cont=document.getElementById("kab-pack-open");if(cont&&typeof confetti==="function")confetti(cont);}
  if(window._packCards.every(x=>x.open)){
    const done=document.getElementById("pk-done"); if(done)done.style.display="inline-block";
    if(window._packCards.some(x=>x.neu)){const cont=document.getElementById("kab-pack-open");if(cont&&typeof confetti==="function")confetti(cont);}
  }
}
/* ── Tauschbörse: „Ich gebe X (doppelt) und suche Y." Angebote sind team-öffentlich;
   angenommen wird atomar über die RPC album_tausch_annehmen. Kinder-Schutzregel:
   getauscht wird nur, was BEIDE doppelt haben – niemand verliert seinen letzten Sticker. ── */
let _twGebe=null,_twWill=null;
async function kabineTausch(){
  const b=document.getElementById("kabine-body"); if(!b||!_albKid)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  const pool=await _albumPool(); const byKey=_poolByKey(pool);
  const row=await _albumRow(_albKid); _albRow=row;
  const col=row.sticker||{};
  const doppelte=pool.filter(g=>(col[g.key]||0)>=2);
  const fehlende=pool.filter(g=>!(col[g.key]||0));
  let offers=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/album_tausch?status=eq.offen&select=*&order=created_at.desc&limit=25`,{headers:sbAuthHeaders()});if(r.ok)offers=(await r.json())||[];}catch(e){}
  const roster=await _albumRoster(); const nameById={}; roster.forEach(k=>nameById[k.id]=k.name);
  _twGebe=null;_twWill=null;
  const chip=(g,typ)=>`<button data-tw="${typ}" data-key="${esc(g.key)}" onclick="kabineTwPick(this)" style="border:1.5px solid rgba(255,255,255,.3);border-radius:12px;background:rgba(255,255,255,.10);color:#fff;font-family:inherit;font-size:12px;font-weight:800;padding:8px 10px;cursor:pointer">${g.img?"🦅":g.emo} ${esc(g.label)}${(KAB_RAR[g.rar]||{}).lbl?` <span style="font-size:8px;opacity:.8">${KAB_RAR[g.rar].lbl}</span>`:""}</button>`;
  const meine=offers.filter(o=>o.von_spieler===_albKid);
  const andere=offers.filter(o=>o.von_spieler!==_albKid);
  const stLbl=k=>{const g=byKey[k];return g?`${g.img?"🦅":g.emo} ${esc(g.label)}`:esc(k);};
  b.innerHTML=`<div style="flex:1;overflow-y:auto">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineAlbumFor(_albKid,_albName)" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">🔁 Tauschbörse</div>
    </div>
    <div style="margin:0 16px 12px;background:rgba(255,255,255,.12);border-radius:16px;padding:12px 14px;color:#fff">
      <div style="font-size:13.5px;font-weight:900">Neues Angebot von ${esc(_albName)}</div>
      ${doppelte.length?`
        <div style="font-size:11px;opacity:.85;margin:8px 0 5px">1️⃣ Was gibst du her? (nur Doppelte)</div>
        <div id="tw-gebe" style="display:flex;flex-wrap:wrap;gap:6px">${doppelte.map(g=>chip(g,"gebe")).join("")}</div>
        <div style="font-size:11px;opacity:.85;margin:10px 0 5px">2️⃣ Was suchst du dafür?</div>
        <div id="tw-will" style="display:flex;flex-wrap:wrap;gap:6px">${(fehlende.length?fehlende:pool.filter(g=>g.key!==(_twGebe||""))).map(g=>chip(g,"will")).join("")}</div>
        <button id="tw-btn" onclick="kabineTwAnbieten(this)" disabled style="width:100%;margin-top:12px;border:none;border-radius:14px;padding:13px;font-family:inherit;font-size:15px;font-weight:900;cursor:pointer;background:rgba(255,255,255,.10);color:rgba(255,255,255,.5)">Erst Sticker auswählen</button>`
      :'<div style="font-size:12px;opacity:.8;margin-top:6px">Du hast noch keine doppelten Sticker – öffne erst ein paar Tüten! 🎁</div>'}
    </div>
    ${meine.length?`<div style="margin:0 16px 12px;color:#fff">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.7;margin-bottom:6px">Deine Angebote</div>
      ${meine.map(o=>`<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.10);border-radius:14px;padding:10px 12px;margin-bottom:6px;font-size:12.5px">
        <span style="flex:1">Gebe ${stLbl(o.gebe_key)} · suche ${stLbl(o.will_key)}</span>
        <button onclick="kabineTwZurueck(${o.id})" style="border:none;background:rgba(0,0,0,.25);color:#fff;border-radius:10px;padding:6px 10px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer">Zurückziehen</button>
      </div>`).join("")}</div>`:""}
    <div style="margin:0 16px 16px;color:#fff">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.7;margin-bottom:6px">Angebote der anderen Adler</div>
      ${andere.length?andere.map(o=>{
        const kannGeben=(col[o.will_key]||0)>=2;
        return `<div style="background:rgba(255,255,255,.10);border-radius:14px;padding:10px 12px;margin-bottom:6px;font-size:12.5px">
          <div><b>${esc(nameById[o.von_spieler]||"Ein Adler")}</b> gibt ${stLbl(o.gebe_key)} · sucht ${stLbl(o.will_key)}</div>
          ${kannGeben?`<button onclick="kabineTwAnnehmen(${o.id},this)" style="width:100%;margin-top:7px;border:none;border-radius:12px;padding:11px;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#38bdf8,#0284c7);color:#fff">🔁 Tauschen!</button>`
                     :`<div style="font-size:10.5px;opacity:.75;margin-top:5px">Dafür bräuchtest du ${stLbl(o.will_key)} doppelt.</div>`}
        </div>`;}).join(""):'<div style="font-size:12px;opacity:.75">Gerade hängt kein Angebot aus – häng du das erste auf! 📌</div>'}
    </div>
  </div>`;
}
function kabineTwPick(btn){
  const typ=btn.dataset.tw,key=btn.dataset.key;
  if(typ==="gebe")_twGebe=key; else _twWill=key;
  const wrap=document.getElementById("tw-"+typ);
  if(wrap)wrap.querySelectorAll("button").forEach(x=>{const on=x===btn;x.style.background=on?"linear-gradient(135deg,#38bdf8,#0284c7)":"rgba(255,255,255,.10)";x.style.borderColor=on?"#7dd3fc":"rgba(255,255,255,.3)";});
  const go=document.getElementById("tw-btn");
  if(go){const ok=_twGebe&&_twWill&&_twGebe!==_twWill;go.disabled=!ok;
    go.style.background=ok?"linear-gradient(135deg,#f59e0b,#ec4899)":"rgba(255,255,255,.10)";
    go.style.color=ok?"#fff":"rgba(255,255,255,.5)";
    go.textContent=ok?"Angebot aufhängen 📌":"Erst Sticker auswählen";}
  try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
}
async function kabineTwAnbieten(btn){
  if(!_twGebe||!_twWill||!_albKid)return;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/album_tausch`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({von_spieler:_albKid,gebe_key:_twGebe,will_key:_twWill})});
    if(!r.ok&&r.status!==201){toast("Konnte das Angebot nicht aufhängen","err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;return;}
  try{navigator.vibrate&&navigator.vibrate([30,50,30]);}catch(e){}
  toast("📌 Angebot hängt an der Tauschbörse!");
  kabineTausch();
}
async function kabineTwZurueck(id){
  try{const r=await fetch(`${SB_URL}/rest/v1/album_tausch?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok&&r.status!==204){toast("Konnte nicht zurückziehen","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  kabineTausch();
}
async function kabineTwAnnehmen(id,btn){
  if(btn)btn.disabled=true;
  let d=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/album_tausch_annehmen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_tausch:id,p_spieler:_albKid})});
    if(r.ok)d=await r.json();
  }catch(e){}
  if(!d||!d.ok){toast((d&&d.error)||"Tausch hat nicht geklappt","err");kabineTausch();return;}
  try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){}
  toast("🔁 Getauscht – schau in dein Album!");
  kabineTausch();
}
/* C5 – Trainer-Sprachlob: der Trainer nimmt ein kurzes Lob auf (MediaRecorder → Storage),
   das Kind hört es im Eltern-Bereich/der Kabine. Bucket kabine-lob (privat, signierte URLs). */
let _lobRec=null,_lobChunks=[],_lobBlob=null,_lobSpieler=null,_lobName="";
function lobRecordOpen(spielerId,name){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  if(!(navigator.mediaDevices&&window.MediaRecorder)){toast("Aufnahme wird hier nicht unterstützt","err");return;}
  _lobBlob=null;_lobChunks=[];_lobSpieler=spielerId;_lobName=name||"";
  document.getElementById("lob-modal")?.remove();
  const m=document.createElement("div");m.id="lob-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10003;display:flex;align-items:center;justify-content:center;padding:16px";
  m.onclick=e=>{if(e.target===m){lobRecStop();m.remove();}};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:18px;max-width:400px;width:100%">
    ${mdlHead("lob-modal","🎤",`Sprachlob für ${esc(_lobName)}`,"","#db2777")}
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Kurzes Lob aufnehmen – ${esc(_lobName)} hört es im Eltern-Bereich unter „Für dein Kind".</div>
    <div id="lob-ui" style="text-align:center"></div>
    <button class="btn btn-sm" style="width:100%;margin-top:14px" onclick="lobRecStop();document.getElementById('lob-modal').remove()">Schließen</button>
  </div>`;
  document.body.appendChild(m);
  lobUI("idle");
}
function lobUI(state){
  const el=document.getElementById("lob-ui"); if(!el)return;
  if(state==="recording") el.innerHTML=`<div style="font-size:40px">🔴</div><div style="font-size:13px;color:#dc2626;font-weight:700;margin:6px 0">Aufnahme läuft…</div><button class="btn btn-p" onclick="lobRecStop()"><i class="ti ti-player-stop"></i>Stopp</button>`;
  else if(state==="ready") el.innerHTML=`<audio controls src="${_lobBlob?URL.createObjectURL(_lobBlob):""}" style="width:100%"></audio><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-sm" onclick="lobRecStart()"><i class="ti ti-refresh"></i>Neu</button><button class="btn btn-p btn-sm" style="margin-left:auto" onclick="lobUpload(this)"><i class="ti ti-cloud-upload"></i>An das Kind senden</button></div>`;
  else el.innerHTML=`<button class="btn btn-p" onclick="lobRecStart()"><i class="ti ti-microphone"></i>Aufnahme starten</button>`;
}
async function lobRecStart(){
  _lobBlob=null;_lobChunks=[];
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    _lobRec=new MediaRecorder(stream);
    _lobRec.ondataavailable=e=>{if(e.data&&e.data.size)_lobChunks.push(e.data);};
    _lobRec.onstop=()=>{ _lobBlob=new Blob(_lobChunks,{type:(_lobRec&&_lobRec.mimeType)||"audio/webm"}); try{stream.getTracks().forEach(t=>t.stop());}catch(_){} lobUI("ready"); };
    _lobRec.start(); lobUI("recording");
  }catch(e){ toast("Mikrofon nicht verfügbar – bitte erlauben.","err"); }
}
function lobRecStop(){ try{ if(_lobRec&&_lobRec.state==="recording")_lobRec.stop(); }catch(e){} }
async function lobUpload(btn){
  if(!_lobBlob||!_lobSpieler){toast("Erst aufnehmen","err");return;}
  if(btn)btn.disabled=true;
  const ext=(_lobBlob.type||"").includes("mp4")?"mp4":"webm";
  const path=`${_lobSpieler}/${Date.now()}.${ext}`;
  try{
    const up=await fetch(`${SB_URL}/storage/v1/object/kabine-lob/${path}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':_lobBlob.type||"audio/webm"},body:_lobBlob});
    if(!up.ok){toast("Upload fehlgeschlagen","err");if(btn)btn.disabled=false;return;}
    const r=await fetch(`${SB_URL}/rest/v1/kabine_lob`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler_id:_lobSpieler,path})});
    if(sbCheck401(r)){if(btn)btn.disabled=false;return;}
    if(!r.ok){toast(sbDeniedMsg(r,"Speichern fehlgeschlagen"),"err");if(btn)btn.disabled=false;return;}
    toast("🎤 Sprachlob gesendet ✓");
    document.getElementById("lob-modal")?.remove();
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;}
}
// Kind/Eltern: jüngstes Sprachlob abspielen (signierte URL aus dem privaten Bucket).
async function lobPlay(spielerId){
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_lob?spieler_id=eq.${spielerId}&select=path&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)row=(await r.json())[0];}catch(e){}
  if(!row){toast("Noch kein Sprachlob da 🙂","err");return;}
  try{
    const sr=await fetch(`${SB_URL}/storage/v1/object/sign/kabine-lob/${row.path}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});
    const sj=await sr.json();
    if(sj&&sj.signedURL){ new Audio(`${SB_URL}/storage/v1${sj.signedURL}`).play().catch(()=>toast("Tippe nochmal zum Abspielen","err")); }
    else toast("Konnte nicht abspielen","err");
  }catch(e){toast("Konnte nicht abspielen","err");}
}
/* C3 – Team-Arena: Einlauf-Song + Schlachtruf (team_config). Identität wie bei den Großen. */
async function arenaKabineLoad(elId){
  const el=document.getElementById(elId); if(!el)return;
  let cfg={};
  try{const h=sbToken()?sbAuthHeaders():{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=einlauf_song,schlachtruf`,{headers:h});if(r.ok)cfg=((await r.json())[0])||{};}catch(e){}
  if(!cfg.einlauf_song&&!cfg.schlachtruf){ el.innerHTML=""; return; }
  el.innerHTML=`<div style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:12px 14px;text-align:center">
    ${cfg.schlachtruf?`<div style="font-size:15px;font-weight:900">📣 „${esc(cfg.schlachtruf)}"</div>`:""}
    ${cfg.einlauf_song?`<div style="font-size:12px;opacity:.9;margin-top:${cfg.schlachtruf?4:0}px">🎵 Einlauf-Song: ${esc(cfg.einlauf_song)}</div>`:""}
  </div>`;
}
async function arenaEditOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  let cfg={};
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=einlauf_song,schlachtruf`,{headers:sbAuthHeaders()});if(r.ok)cfg=((await r.json())[0])||{};}catch(e){}
  document.getElementById("arena-modal")?.remove();
  const m=document.createElement("div");m.id="arena-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const fld="width:100%;box-sizing:border-box;padding:10px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);margin-top:4px";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("arena-modal","🏟️","Team-Arena","","#8b5cf6")}
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Schlachtruf & Einlauf-Song – die Kinder sehen sie in der Kabine.</div>
    <label style="font-size:11px;color:var(--text2)">📣 Schlachtruf<input id="ar-ruf" value="${esc(cfg.schlachtruf||"")}" placeholder="Adler Dellbrück, Adler Dellbrück!" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:10px">🎵 Einlauf-Song<input id="ar-song" value="${esc(cfg.einlauf_song||"")}" placeholder="z. B. We Are The Champions – Queen" style="${fld}"></label>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p btn-sm" onclick="arenaSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('arena-modal').remove()">Schließen</button>
    </div>`;
  document.body.appendChild(m);
}
async function arenaSave(btn){
  const schlachtruf=(document.getElementById("ar-ruf")?.value||"").trim()||null;
  const einlauf_song=(document.getElementById("ar-song")?.value||"").trim()||null;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,schlachtruf,einlauf_song,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Arena gespeichert ✓");
  document.getElementById("arena-modal")?.remove();
}
/* ── Zurück-Taste in der Kabine (PO-Feedback): #kabine selbst bleibt bewusst vom globalen
   Back-Handler ausgenommen (Zurück darf den Kabinen-Code nicht umgehen). Aber UNTERSEITEN
   (Album, Post, Komplimente, Stärken …) bekommen einen History-Eintrag: die Smartphone-
   Zurück-Taste führt dann zur Kabinen-Startseite statt aus der App. Der ←-Button verbraucht
   den Eintrag still (gleiches Muster wie elternCatClose). ── */
window._kabSubOn=false;
function kabSubMark(){
  if(document.getElementById("kabine")&&!window._kabSubOn){
    window._kabSubOn=true;
    try{history.pushState({kabSub:1},"");}catch(e){}
  }
}
function kabSubConsume(){
  if(!window._kabSubOn)return;
  window._kabSubOn=false;
  window._mdlSuppress=(window._mdlSuppress||0)+1;
  try{history.back();}catch(e){window._mdlSuppress--;}
}
// (Der popstate-Teil sitzt im zentralen Back-Handler in core.js – eine Stelle, korrekte Reihenfolge.)
function kabineHome(){
  kabSubConsume(); // Rückkehr per ←-Button: den Unterseiten-History-Eintrag still verbrauchen
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`
    <div style="flex:1;overflow-y:auto">
    <div style="text-align:center;padding:18px 16px 6px">
      <div style="font-size:22px;font-weight:900">🦅 Die Kabine</div>
      <div style="font-size:12px;opacity:.8">Adler U9 · Kinder-Modus</div>
    </div>
    <div id="kab-level" style="padding:2px 16px 6px"></div>
    <div id="kab-countdown"></div>
    <div id="kab-reveal"></div>
    <div id="kab-pack"></div>
    <div id="kab-post"></div>
    <div id="kab-wahl"></div>
    <div id="kab-zeit"></div>
    <!-- Stimmungs-Check („Wie war das Training?") vorerst ausgeblendet (PO) -->
    <div id="kab-milestone"></div>
    <div id="kab-arena" style="padding:0 16px 4px"></div>
    ${(function(){
      // Kacheln in 4 Farbfamilien (wie im Eltern-Bereich: Farbtöne je Kategorie). Getönte,
      // halbtransparente Gradients bleiben „frosted", leuchten aber je Familie anders.
      const tile=(fn,emo,label,c1,c2,full)=>`<button onclick="${fn}" style="${full?"grid-column:1/-1;":""}border:1px solid rgba(255,255,255,.16);border-radius:22px;background:linear-gradient(135deg,${c1},${c2});color:#fff;font-family:inherit;cursor:pointer;display:flex;${full?"align-items:center;justify-content:center;gap:10px;min-height:76px":"flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:120px"};font-size:17px;font-weight:800"><span style="font-size:${full?34:44}px">${emo}</span>${label}</button>`;
      const lbl=t=>`<div style="grid-column:1/-1;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;opacity:.65;margin:6px 4px -4px">${t}</div>`;
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:10px 16px 16px;align-content:center">
      ${lbl("Spielen & Lernen")}
      ${tile("kabineQuiz('taktik')","🎯","Taktik-Quiz","rgba(56,189,248,.50)","rgba(2,132,199,.30)")}
      ${tile("kabineQuiz('wissen')","🧠","Fußball-Wissen","rgba(14,165,233,.44)","rgba(3,105,161,.30)")}
      ${lbl("Meine Sachen")}
      ${tile("kabineMyCard()","🃏","Meine Karte","rgba(168,85,247,.50)","rgba(124,58,237,.32)")}
      ${tile("kabineAbzeichen()","🎖️","Abzeichen","rgba(147,51,234,.46)","rgba(109,40,217,.30)")}
      ${tile("kabineMission()","🎯","Meine Mission","rgba(139,92,246,.46)","rgba(91,33,182,.32)")}
      ${tile("kabineRollen()","🎽","Wo spiele ich?","rgba(124,58,237,.46)","rgba(76,29,149,.32)")}
      ${tile("kabineStaerken()","💪","Meine Stärken","rgba(147,51,234,.5)","rgba(88,28,135,.32)",true)}
      ${lbl("Challenges")}
      ${tile("kabineShowQuests()","🏆","Missionen","rgba(245,158,11,.52)","rgba(217,119,6,.32)")}
      ${tile("kabineSkillWoche()","🎬","Skill der Woche","rgba(251,146,60,.48)","rgba(234,88,12,.30)")}
      ${lbl("Team & Spaß")}
      ${tile("kabineKudos()","👏","Kompliment schenken","rgba(16,185,129,.52)","rgba(5,150,105,.32)")}
      ${tile("kabineShowGallery()","🖼️","Team-Galerie","rgba(16,185,129,.48)","rgba(5,150,105,.30)")}
      ${tile("kabineHype()","🎵","Kabinen-Hype","rgba(45,212,191,.44)","rgba(13,148,136,.30)")}
      ${tile("kabineAlbum()","📖","Sammelalbum","rgba(52,211,153,.46)","rgba(4,120,87,.30)")}
      ${tile("kabineReporter()","🎙️","Kabinen-Reporter","rgba(20,184,166,.5)","rgba(15,118,110,.32)",true)}
    </div>`;})()}
    </div>
    <button onclick="kabineExit()" style="margin:0 16px 18px;padding:12px;border:none;border-radius:14px;background:rgba(0,0,0,.25);color:#fff;font-family:inherit;font-size:14px;cursor:pointer">🔒 Für Erwachsene: Kabine verlassen</button>`;
  teamLevelLoad("kab-level");                                  // C1: Team-Level
  if(typeof arenaKabineLoad==="function")arenaKabineLoad("kab-arena"); // C3: Einlauf-Song/Schlachtruf
  kabineCountdownLoad();                                        // G6: Countdown bis zum nächsten Spiel
  kabineRevealLoad();                                           // H4: Rollen-Reveal am Spieltag
  kabinePackLoad();                                             // H3: Spieltag-Packliste
  kabinePostLoad();                                             // I-A: 📬 Adler-Post (Kudos + Genesungsgrüße)
  kabineWahlLoad();                                             // I-A: 🗳️ Kabinen-Wahl
  kabineZeitTick();                                             // Restzeit-Hinweis
  // kabineStimmungLoad();  // H2 – vom PO vorerst ausgeblendet                                         // H2: Kinder-Stimmungs-Check
  kabineMilestoneLoad();                                        // H7: frische Team-Meilensteine feiern
}
// G6: „Noch X× schlafen bis zum nächsten Spiel!" – Motivation im Kinder-Modus.
async function kabineCountdownLoad(){
  const el=document.getElementById("kab-countdown"); if(!el)return;
  const heute=new Date().toISOString().slice(0,10);
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=datum,typ,gegner,titel&typ=in.(spiel,turnier)&datum=gte.${heute}&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0]||null;}catch(e){}
  if(!t){el.innerHTML="";window._kabSpieltag=false;return;}
  const d=new Date(t.datum+"T00:00:00"), today=new Date(heute+"T00:00:00");
  const days=Math.round((d-today)/864e5);
  window._kabSpieltag=days<=0; // ✨ fürs Album: Spieltags-Glückstüte
  const label=days<=0?"Heute ist Spieltag! 🔥":days===1?"Morgen ist Spieltag! 🔥":`Noch ${days}× schlafen bis zum Spiel!`;
  el.innerHTML=`<div style="margin:2px 16px 8px;background:rgba(255,255,255,.14);border-radius:16px;padding:12px;text-align:center;color:#fff">
    <div style="font-size:15px;font-weight:900">⚽ ${label}</div>
    <div style="font-size:12px;opacity:.85;margin-top:2px">${t.typ==="turnier"?"🏆 Turnier":"gegen "+esc(t.gegner||t.titel||"?")} · ${["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]}, ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</div>
  </div>`;
}
/* H4 – Rollen-Reveal: hat der Trainer für HEUTE eine Aufstellung gespeichert, darf das Kind
   seine Rolle in der Kabine „aufdecken" (RPC kind_rolle_heute, weil aufstellungen trainer-only ist). */
const KAB_ROLLEN={tw:["🥅","TORWART"],auf:["🛡️","AUFPASSER"],fll:["⚡","FLITZER LINKS"],flr:["⚡","FLITZER RECHTS"],jaeg:["🎯","JÄGER"]};
async function kabineRevealLoad(){
  const el=document.getElementById("kab-reveal"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  const heute=new Date().toISOString().slice(0,10);
  let hatSpiel=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id&typ=in.(spiel,turnier)&datum=eq.${heute}&limit=1`,{headers:sbAuthHeaders()});if(r.ok)hatSpiel=!!(await r.json()).length;}catch(e){}
  if(!hatSpiel){el.innerHTML="";return;}
  const rollen=[];
  await Promise.all(kids.map(async k=>{
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_rolle_heute`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:k.spieler_id})});
      if(r.ok){const d=await r.json();if(d&&d.ok&&d.rolle&&KAB_ROLLEN[d.rolle])rollen.push({sid:k.spieler_id,name:(k.kader&&k.kader.name)||"",rolle:d.rolle});}}catch(e){}
  }));
  if(!rollen.length){el.innerHTML="";return;}
  el.innerHTML=rollen.map(x=>{
    let seen=null; try{seen=localStorage.getItem(`adler_reveal_${x.sid}_${heute}`);}catch(e){}
    if(seen){const R=KAB_ROLLEN[x.rolle];
      return `<div style="margin:2px 16px 8px;background:linear-gradient(135deg,rgba(168,85,247,.5),rgba(124,58,237,.32));border-radius:16px;padding:12px;text-align:center;color:#fff">
        <div style="font-size:12px;opacity:.85">${esc(x.name)} – deine Rolle heute:</div>
        <div style="font-size:20px;font-weight:900;margin-top:2px">${R[0]} ${R[1]}</div></div>`;}
    return `<button onclick="kabineRevealShow(${x.sid},'${x.rolle}','${jsq(x.name)}')" style="display:flex;align-items:center;gap:10px;margin:2px 16px 8px;width:calc(100% - 32px);border:1px solid rgba(255,255,255,.2);border-radius:16px;background:linear-gradient(135deg,rgba(168,85,247,.6),rgba(124,58,237,.4));color:#fff;font-family:inherit;cursor:pointer;padding:14px;text-align:left">
      <span style="font-size:26px">🎁</span>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:900">${esc(x.name)} – deine Rolle für heute ist da!</span>
      <span style="display:block;font-size:11.5px;opacity:.9">Tippe zum Aufdecken 🤫</span></span>
    </button>`;
  }).join("");
}
function kabineRevealShow(sid,rolle,name){
  const heute=new Date().toISOString().slice(0,10);
  try{localStorage.setItem(`adler_reveal_${sid}_${heute}`,"1");}catch(e){}
  const R=KAB_ROLLEN[rolle]||["⚽","ADLER"];
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div id="kab-reveal-view" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;position:relative;overflow:hidden;padding:24px;text-align:center;color:#fff">
    <div style="font-size:14px;opacity:.85">${esc(name)}, heute bist du…</div>
    <div style="font-size:78px;line-height:1">${R[0]}</div>
    <div style="font-size:30px;font-weight:900;letter-spacing:1px">${R[1]}</div>
    <div style="font-size:13px;opacity:.9;max-width:320px">Gib alles für dein Team – und hab Spaß dabei! 🦅</div>
    <button onclick="kabineHome()" style="margin-top:14px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
  </div>`;
  try{navigator.vibrate&&navigator.vibrate([60,80,60,80,160]);}catch(e){}
  const cont=document.getElementById("kab-reveal-view");
  if(cont&&typeof confetti==="function")confetti(cont);
}
/* H3 – Spieltag-Packliste: ab dem Vorabend packt das Kind seine Tasche virtuell. Haken lokal
   (localStorage je Kind+Datum); alles gepackt → Konfetti + 5 Federn (xp_award_event 'packliste',
   idempotent über quelle_id – die Federn gibt es je Spieltag genau einmal). */
const KAB_PACK_ITEMS=["👟 Fußballschuhe","🦵 Schienbeinschoner","🧦 Stutzen","👕 Adler-Trikot","🥤 Trinkflasche","🧥 Jacke für danach","😄 Gute Laune"];
let _kabPackTermin=null;
function _kabPackGet(sid,datum){ try{return JSON.parse(localStorage.getItem(`adler_pack_${sid}_${datum}`)||"{}");}catch(e){return {};} }
async function kabinePackLoad(){
  const el=document.getElementById("kab-pack"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  const heute=new Date().toISOString().slice(0,10);
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=datum,typ,gegner,titel&typ=in.(spiel,turnier)&datum=gte.${heute}&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0]||null;}catch(e){}
  _kabPackTermin=t;
  if(!t){el.innerHTML="";return;}
  const days=Math.round((new Date(t.datum+"T00:00:00")-new Date(heute+"T00:00:00"))/864e5);
  if(days>1){el.innerHTML="";return;} // erst ab dem Vorabend
  const fertig=kids.every(k=>{const st=_kabPackGet(k.spieler_id,t.datum);return KAB_PACK_ITEMS.every((_,i)=>st[i]);});
  el.innerHTML=`<button onclick="kabinePack()" style="display:flex;align-items:center;gap:10px;margin:2px 16px 8px;width:calc(100% - 32px);border:1px solid rgba(255,255,255,.18);border-radius:16px;background:${fertig?"rgba(34,197,94,.28)":"linear-gradient(135deg,rgba(245,158,11,.55),rgba(217,119,6,.35))"};color:#fff;font-family:inherit;cursor:pointer;padding:12px 14px;text-align:left">
    <span style="font-size:26px">🎒</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:900">${fertig?"Tasche gepackt – stark! ✅":"Tasche packen fürs "+(t.typ==="turnier"?"Turnier":"Spiel")}</span>
    <span style="display:block;font-size:11.5px;opacity:.85">${days<=0?"Heute":"Morgen"} ist ${t.typ==="turnier"?"Turnier":"Spieltag"} – hast du alles dabei?</span></span>
    <span style="font-size:18px;opacity:.85">›</span>
  </button>`;
}
function kabinePack(){
  const kids=window._elternKids||[];
  if(!_kabPackTermin||!kids.length)return;
  if(kids.length===1){ kabinePackFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎒 Wessen Tasche?","kabinePackFor");
}
function kabinePackFor(sid,name){
  const b=document.getElementById("kabine-body"); if(!b||!_kabPackTermin)return;
  const t=_kabPackTermin, st=_kabPackGet(sid,t.datum);
  const alle=KAB_PACK_ITEMS.every((_,i)=>st[i]);
  b.innerHTML=`<div id="kab-pack-view" style="flex:1;overflow-y:auto;position:relative">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800">🎒 ${esc(name||"Meine")} Tasche</div>
    </div>
    <div style="font-size:12px;opacity:.85;padding:0 16px 10px;text-align:center;color:#fff">Pack deine Tasche fürs ${t.typ==="turnier"?"Turnier":"Spiel"} – Haken für alles, was drin ist!</div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 16px 16px">
      ${KAB_PACK_ITEMS.map((it,i)=>`<button onclick="kabinePackTap(${sid},${i},'${jsq(name)}')" style="display:flex;align-items:center;gap:12px;border:none;border-radius:16px;padding:14px;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;text-align:left;${st[i]?"background:linear-gradient(135deg,rgba(34,197,94,.55),rgba(5,150,105,.35));color:#fff":"background:rgba(255,255,255,.10);color:rgba(255,255,255,.92)"}">
        <span style="font-size:22px">${st[i]?"✅":"⬜"}</span><span style="flex:1">${it}</span>
      </button>`).join("")}
    </div>
    ${alle?`<div style="text-align:center;padding:0 16px 20px;font-size:15px;font-weight:900;color:#fff">Alles drin – du bist startklar! 🦅</div>`:""}
  </div>`;
}
async function kabinePackTap(sid,idx,name){
  if(!_kabPackTermin)return;
  const t=_kabPackTermin, st=_kabPackGet(sid,t.datum);
  st[idx]=st[idx]?0:1;
  try{localStorage.setItem(`adler_pack_${sid}_${t.datum}`,JSON.stringify(st));}catch(e){}
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  const alle=KAB_PACK_ITEMS.every((_,i)=>st[i]);
  kabinePackFor(sid,name);
  if(alle){
    const cont=document.getElementById("kab-pack-view");
    if(cont&&typeof confetti==="function")confetti(cont);
    try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){}
    // Sticker-Tüte fürs komplette Packen – 1× je Kind & Spieltag (Farming-Schutz per Flag)
    try{const pk=`adler_tuete_pack_${sid}_${t.datum}`;
      if(!localStorage.getItem(pk)){localStorage.setItem(pk,"1");albumTuete(sid);}}catch(e){}
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:sid,p_quelle:"packliste",p_quelle_id:"pack"+t.datum})});
      if(r.ok){const d=await r.json();if(d>0)toast(`🎒 Tasche gepackt – ${XP_ICON} +${d} ${XP_LABEL} und 🎁 +1 Sticker-Tüte!`);}
    }catch(e){}
  }
}
/* H2 – Kinder-Stimmungs-Check: am Tag eines Termins fragt die Kabine das Kind selbst
   („Wie war's heute?", 3 Smileys). Ein Eintrag pro Kind & Tag (kind_stimmung); die
   Eltern-Session darf per RLS nur die eigenen Kinder schreiben. Der Trainer sieht die
   Stimmungslage gebündelt im Saison-Cockpit. */
const KAB_MOODS=[[1,"😞","war nicht so gut"],[2,"😐","war okay"],[3,"😄","war super"]];
async function kabineStimmungLoad(){
  const el=document.getElementById("kab-stimmung"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  const heute=new Date().toISOString().slice(0,10);
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=typ&datum=eq.${heute}&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0]||null;}catch(e){}
  if(!t){el.innerHTML="";return;}
  let done=[];
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kind_stimmung?spieler_id=in.(${ids})&datum=eq.${heute}&select=spieler_id`,{headers:sbAuthHeaders()});
    if(r.ok)done=(await r.json()).map(x=>x.spieler_id);}catch(e){}
  const offen=kids.filter(k=>!done.includes(k.spieler_id));
  if(!offen.length){el.innerHTML="";return;}
  const was=t.typ==="training"?"Training":"Spieltag";
  el.innerHTML=`<div style="margin:2px 16px 8px;background:rgba(255,255,255,.14);border-radius:16px;padding:12px 14px;color:#fff">
    <div style="font-size:14px;font-weight:900;text-align:center">Wie war dein ${was} heute?</div>
    ${offen.map(k=>`<div style="display:flex;align-items:center;gap:8px;margin-top:8px;justify-content:center">
      ${kids.length>1?`<span style="flex:1;font-size:13px;font-weight:700">${esc((k.kader&&k.kader.name)||"")}</span>`:""}
      ${KAB_MOODS.map(m=>`<button onclick="kabineStimmungSet(${k.spieler_id},${m[0]})" aria-label="${m[2]}" style="border:none;background:rgba(255,255,255,.12);border-radius:14px;width:60px;height:54px;font-size:28px;cursor:pointer">${m[1]}</button>`).join("")}
    </div>`).join("")}
  </div>`;
}
async function kabineStimmungSet(sid,mood){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_stimmung?on_conflict=spieler_id,datum`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({spieler_id:sid,datum:new Date().toISOString().slice(0,10),mood})});
    if(!r.ok&&r.status!==201){toast("Konnte nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate([30,40,60]);}catch(e){}
  albumTuete(sid); // Sticker-Tüte fürs Mitmachen (max. 1/Tag/Kind über die DB-Unique)
  toast((mood===3?"Super! 😄":mood===2?"Danke dir! 🙂":"Danke, dass du ehrlich bist – dein Trainer ist für dich da! 💙")+" · 🎁 +1 Sticker-Tüte");
  kabineStimmungLoad();
}
/* H7 – Team-Meilensteine: die RPC berechnet & persistiert Team-Marken (Tore/Spiele/Federn/
   „jeder hat getroffen"); frisch Erreichtes (14 Tage) wird in der Kabine gefeiert. */
async function kabineMilestoneLoad(){
  const el=document.getElementById("kab-milestone"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/team_meilensteine`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)rows=(await r.json())||[];}catch(e){}
  const grenze=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  const frisch=(rows||[]).filter(m=>m.erreicht_am>=grenze).slice(0,2);
  if(!frisch.length){el.innerHTML="";return;}
  el.innerHTML=frisch.map(m=>`<div style="margin:2px 16px 8px;background:linear-gradient(135deg,rgba(251,191,36,.5),rgba(245,158,11,.3));border-radius:16px;padding:12px;text-align:center;color:#fff">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.85">🎉 Team-Meilenstein</div>
    <div style="font-size:15px;font-weight:900;margin-top:2px">${esc(m.label)}</div>
  </div>`).join("");
}
/* I-A – Adler-Post: Kind→Kind-Komplimente (Kudos) & Genesungsgrüße in EINER Tabelle
   (kabine_post). Vordefinierte Texte (text_key) statt Freitext → keine Moderationslast.
   Anti-Spam: 1 Post je Absender→Empfänger & Tag (DB-Unique). Der Empfangs-Slot bündelt
   alles Persönliche in EINEM Briefkasten, damit die Kabine oben nicht zustaut. */
/* ⚠️ REIHENFOLGE IST DATEN. `kabine_post.text_key` speichert den INDEX in dieser Liste –
   eine verschobene Zeile ändert rückwirkend den Text bereits verschickter Post. Also:
   nur ANHÄNGEN, und einen vorhandenen Text nur umformulieren, wenn die Bedeutung bleibt.

   PO: „ein kind gibt dem anderen kind ja nicht während des Spiels oder Training ein
   Kompliment sondern eher von zu Hause über das Handy. Die inhalte sind dafür aber teilweise
   unpassend." Stimmt: „Starker Pass!" ist ein Zuruf aus dem Moment. Von der Couch aus, zwei
   Tage später, gilt zweierlei – der Rückblick braucht eine Zeitangabe („letztes Mal"), und
   das meiste sollte gar nicht an einer einzelnen Szene hängen, sondern an der PERSON. Deshalb
   sind 0–7 behutsam umformuliert (Bedeutung unverändert) und 8–13 neu: Sätze, die man auch
   dann schicken kann, wenn beim letzten Spiel nichts Besonderes passiert ist. */
const KUDOS_TEXTE=[
  "⚽ Dein Pass letztes Mal war stark!",      // 0
  "🔥 Du hast letztes Mal super gekämpft!",   // 1
  "👏 Danke, dass du mich angefeuert hast!",  // 2
  "🤝 Du bist mega fair!",                    // 3
  "😄 Mit dir macht's am meisten Spaß!",      // 4
  "🛡️ Deine Abwehr letztes Mal war stark!",   // 5
  "🎯 Dein Tor letztes Mal war der Hammer!",  // 6
  "💪 Du gibst nie auf!",                     // 7
  "🦅 Schön, dass du in unserem Team bist!",  // 8  ── ab hier neu (v420)
  "😊 Ich freu mich aufs nächste Training mit dir!",
  "🤗 Du machst mir Mut, wenn mal was schiefgeht.",
  "🏃 Du bist immer voll dabei!",
  "🙌 Danke, dass du mir geholfen hast!",
  "🌟 Du bist ein super Teamkollege!"
];
const GENESUNG_TEXTE=["💌 Gute Besserung!","🦅 Wir vermissen dich!","💪 Komm bald wieder!","⚽ Der Platz wartet auf dich!"];
const HORST_TEXTE=["🎂 Alles Gute zum Geburtstag! Das ganze Nest feiert dich heute – dein Horst 🦅"];
function kabinePostText(typ,key){ const L=typ==="genesung"?GENESUNG_TEXTE:typ==="horst"?HORST_TEXTE:KUDOS_TEXTE; return L[key]||L[0]; }
async function kabinePostLoad(){
  const el=document.getElementById("kab-post"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  let neu=0;
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post?an_spieler=in.(${ids})&gesehen=eq.false&select=id`,{headers:sbAuthHeaders()});
    if(r.ok)neu=((await r.json())||[]).length;}catch(e){}
  if(!neu){el.innerHTML="";return;}
  el.innerHTML=`<button onclick="kabinePostOpen()" style="display:flex;align-items:center;gap:10px;margin:2px 16px 8px;width:calc(100% - 32px);border:1px solid rgba(255,255,255,.2);border-radius:16px;background:linear-gradient(135deg,rgba(236,72,153,.55),rgba(190,24,93,.35));color:#fff;font-family:inherit;cursor:pointer;padding:14px;text-align:left">
    <span style="font-size:26px">📬</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:900">Deine Adler-Post ist da!</span>
    <span style="display:block;font-size:11.5px;opacity:.9">${neu} neue Nachricht${neu===1?"":"en"} – tippe zum Öffnen 💌</span></span>
  </button>`;
}
async function kabinePostOpen(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const kids=window._elternKids||[];
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  const ab=new Date(Date.now()-14*864e5).toISOString();
  let rows=[];
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post?an_spieler=in.(${ids})&created_at=gte.${ab}&select=*&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(r.ok)rows=(await r.json())||[];}catch(e){}
  // Absender-Namen über die RPC (Eltern-RLS auf kader zeigt nur die eigenen Kinder)
  const nameById={};
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kader_namen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});
    if(r.ok)((await r.json())||[]).forEach(k=>nameById[k.id]=k.name);}catch(e){}
  const kidName=sid=>{const k=kids.find(x=>x.spieler_id===sid);return (k&&k.kader&&k.kader.name)||"";};
  const neuIds=rows.filter(x=>!x.gesehen).map(x=>x.id);
  b.innerHTML=`<div id="kab-post-view" style="flex:1;overflow-y:auto;position:relative">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">📬 Adler-Post</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 16px 16px">
      ${rows.length?rows.map(x=>`<div style="border-radius:16px;padding:14px;color:${x.typ==="horst"?"#78350f":"#fff"};background:${x.typ==="horst"?"linear-gradient(135deg,rgba(253,224,71,.85),rgba(245,158,11,.6))":x.typ==="genesung"?"linear-gradient(135deg,rgba(244,63,94,.5),rgba(190,18,60,.32))":"linear-gradient(135deg,rgba(236,72,153,.5),rgba(147,51,234,.32))"};${x.gesehen?"opacity:.75":""}">
        <div style="font-size:11px;opacity:.85">${x.gesehen?"":"🆕 "}von <b>${x.typ==="horst"?"Horst dem Adler 🦅":esc(nameById[x.von_spieler]||"einem Adler")}</b>${kids.length>1?` · für ${esc(kidName(x.an_spieler))}`:""}</div>
        <div style="font-size:17px;font-weight:900;margin-top:4px">${esc(kabinePostText(x.typ,x.text_key))}</div>
      </div>`).join(""):'<div style="text-align:center;color:#fff;opacity:.8;padding:30px 16px">Noch keine Post – schenk doch selbst ein Kompliment! 👏</div>'}
    </div>
  </div>`;
  if(neuIds.length){
    try{await fetch(`${SB_URL}/rest/v1/kabine_post?id=in.(${neuIds.join(",")})`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({gesehen:true})});}catch(e){}
    try{navigator.vibrate&&navigator.vibrate([30,50,30]);}catch(e){}
    const cont=document.getElementById("kab-post-view");
    if(cont&&typeof confetti==="function")confetti(cont);
    const slot=document.getElementById("kab-post"); if(slot)slot.innerHTML="";
  }
}
/* Kompliment schenken: Mitspieler-Grid; pausierte Kinder mit Genesungs-Freigabe erscheinen
   im selben Flow mit 💌-Grüßen statt Komplimenten (ein Flow, zwei Kartentypen). */
function kabineKudos(){
  const kids=window._elternKids||[];
  if(!kids.length)return;
  if(kids.length===1){ kabineKudosFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("👏 Wer verschenkt?","kabineKudosFor");
}
async function kabineKudosFor(vonSid,vonName){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  const heute=new Date().toISOString().slice(0,10);
  let team=[],pausen={};
  // RPC statt Direkt-Select: die Eltern-RLS auf kader zeigt nur die EIGENEN Kinder (Bugfix)
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kader_namen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)team=(await r.json())||[];}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_pause?select=spieler_id,gruesse_ok&bis=gte.${heute}`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(p=>{if(p.gruesse_ok)pausen[p.spieler_id]=1;});}catch(e){}
  const andere=team.filter(k=>k.id!==vonSid);
  b.innerHTML=`<div style="flex:1;overflow-y:auto">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">👏 Wem willst du eine Freude machen?</div>
    </div>
    <div style="font-size:12px;opacity:.85;padding:0 16px 10px;text-align:center;color:#fff">Such dir einen Mitspieler aus – ${esc(vonName)} schenkt ein Kompliment!</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px 16px">
      ${andere.map(k=>`<button onclick="kabineKudosPick(${vonSid},'${jsq(vonName)}',${k.id},'${jsq(k.name)}',${pausen[k.id]?1:0})" style="border:none;border-radius:18px;min-height:92px;background:${pausen[k.id]?"linear-gradient(135deg,rgba(244,63,94,.5),rgba(190,18,60,.3))":"rgba(255,255,255,.12)"};color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:15px;font-weight:800">
        <span style="font-size:30px">${pausen[k.id]?"💌":"⚽"}</span>${esc(k.name)}
        ${pausen[k.id]?'<span style="font-size:10px;font-weight:700;opacity:.9">fehlt gerade – schick einen Gruß!</span>':""}
      </button>`).join("")||'<div style="grid-column:1/-1;text-align:center;color:#fff;opacity:.8;padding:20px">Kein Mitspieler gefunden.</div>'}
    </div>
  </div>`;
}
function kabineKudosPick(vonSid,vonName,anSid,anName,pausiert){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const typ=pausiert?"genesung":"kudos";
  const texte=pausiert?GENESUNG_TEXTE:KUDOS_TEXTE;
  b.innerHTML=`<div style="flex:1;overflow-y:auto">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineKudosFor(${vonSid},'${jsq(vonName)}')" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">${pausiert?"💌 Gruß":"👏 Kompliment"} für ${esc(anName)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 16px 16px">
      ${texte.map((t,i)=>`<button onclick="kabineKudosSend(${vonSid},${anSid},'${typ}',${i},this)" style="border:none;border-radius:16px;padding:16px;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;text-align:left;background:rgba(255,255,255,.12);color:#fff">${esc(t)}</button>`).join("")}
    </div>
  </div>`;
}
async function kabineKudosSend(vonSid,anSid,typ,key,btn){
  if(btn)btn.disabled=true;
  const heute=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({typ,von_spieler:vonSid,an_spieler:anSid,text_key:key,datum:heute})});
    if(r.status===409){toast("Du hast heute schon etwas geschickt 🙂","err");kabineHome();return;}
    if(!r.ok&&r.status!==201){toast("Konnte nicht senden","err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;return;}
  try{navigator.vibrate&&navigator.vibrate([30,50,80]);}catch(e){}
  // Sticker-Tüte fürs Verschenken – 1× pro Tag (nicht je Empfänger, sonst Tüten-Farming)
  let tuete=false;
  try{const tk="adler_tuete_kudos_"+heute;
    if(!localStorage.getItem(tk)){localStorage.setItem(tk,"1");albumTuete(vonSid);tuete=true;}}catch(e){}
  toast((typ==="genesung"?"💌 Gruß ist unterwegs!":"👏 Kompliment verschenkt – stark von dir!")+(tuete?" · 🎁 +1 Sticker-Tüte":""));
  kabineHome();
}
/* I-A – Kabinen-Wahl: die Kinder stimmen ab (Song/Motto/Spielform). Der Trainer legt die
   Wahl in der Adler-Welt an; Ergebnis kommt anonym aggregiert (RPC wahl_ergebnis). */
async function kabineWahlLoad(){
  const el=document.getElementById("kab-wahl"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  let wahl=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)wahl=((await r.json())||[])[0]||null;}catch(e){}
  if(!wahl||!Array.isArray(wahl.optionen)||wahl.optionen.length<2){el.innerHTML="";return;}
  let meine={};
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl_stimmen?wahl_id=eq.${wahl.id}&spieler_id=in.(${ids})&select=spieler_id,wahl`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(s=>meine[s.spieler_id]=s.wahl);}catch(e){}
  const offen=kids.filter(k=>meine[k.spieler_id]==null);
  if(offen.length){
    const k=offen[0];
    el.innerHTML=`<div style="margin:2px 16px 8px;background:linear-gradient(135deg,rgba(56,189,248,.45),rgba(2,132,199,.3));border-radius:16px;padding:12px 14px;color:#fff">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.85">🗳️ Deine Stimme zählt${kids.length>1?" – "+esc((k.kader&&k.kader.name)||""):""}</div>
      <div style="font-size:15px;font-weight:900;margin:4px 0 8px">${esc(wahl.frage)}</div>
      ${wahl.optionen.map((o,i)=>`<button onclick="kabineWahlVote(${wahl.id},${k.spieler_id},${i})" style="display:block;width:100%;border:none;border-radius:12px;padding:12px;margin-top:6px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.16);color:#fff;text-align:left">${esc(String(o))}</button>`).join("")}
    </div>`;
    return;
  }
  // alle Kinder haben gewählt → Live-Balken zeigen (solange die Wahl aktiv ist)
  let erg=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/wahl_ergebnis`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_wahl:wahl.id})});if(r.ok)erg=(await r.json())||[];}catch(e){}
  const counts=wahl.optionen.map((_,i)=>{const e2=erg.find(x=>x.wahl===i);return e2?e2.n:0;});
  const total=counts.reduce((s,n)=>s+n,0)||1;
  el.innerHTML=`<div style="margin:2px 16px 8px;background:rgba(255,255,255,.12);border-radius:16px;padding:12px 14px;color:#fff">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.8">🗳️ ${esc(wahl.frage)}</div>
    ${wahl.optionen.map((o,i)=>{const pct=Math.round(counts[i]/total*100);const mine=kids.some(k=>meine[k.spieler_id]===i);
      return `<div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700"><span>${mine?"✅ ":""}${esc(String(o))}</span><span style="opacity:.85">${counts[i]}</span></div>
        <div style="height:8px;background:rgba(255,255,255,.15);border-radius:5px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${pct}%;background:#38bdf8;border-radius:5px;transition:width .5s"></div></div>
      </div>`;}).join("")}
    <div style="font-size:10.5px;opacity:.75;margin-top:8px">Danke fürs Abstimmen – das Ergebnis wächst, wenn mehr Adler wählen!</div>
  </div>`;
}
async function kabineWahlVote(wahlId,sid,idx){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl_stimmen?on_conflict=wahl_id,spieler_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({wahl_id:wahlId,spieler_id:sid,wahl:idx})});
    if(!r.ok&&r.status!==201){toast("Konnte nicht abstimmen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate([30,40,60]);}catch(e){}
  toast("🗳️ Stimme gezählt!");
  kabineWahlLoad();
}
/* I-C – „Meine Stärken": kindgerechte Selbsteinschätzung (5 Fragen, 3 Stufen – bewusst
   nur positive Rahmung, keine Noten). Rhythmus ~6 Wochen wie die Trainer-Bewertung.
   Der Trainer sieht das Selbstbild im Spieler-Profil als Gesprächsanlass. */
let _ksAntworten={},_ksIdx=0,_ksSid=null,_ksName="";
function kabineStaerken(){
  const kids=window._elternKids||[];
  if(!kids.length)return;
  if(kids.length===1){ kabineStaerkenFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("💪 Wessen Stärken?","kabineStaerkenFor");
}
async function kabineStaerkenFor(sid,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let last=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_selbstbild?spieler_id=eq.${sid}&select=datum,antworten&order=datum.desc&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)last=((await r.json())||[])[0]||null;}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">💪 ${esc(name)}s Stärken</div></div>`;
  if(last){
    const tage=Math.round((Date.now()-new Date(last.datum+"T00:00:00"))/864e5);
    if(tage<42){
      const a=last.antworten||{};
      b.innerHTML=head+`<div style="flex:1;padding:0 16px 16px;color:#fff">
        <div style="background:rgba(255,255,255,.12);border-radius:16px;padding:16px;text-align:center">
          <div style="font-size:14px;font-weight:900">Das hast du vor Kurzem schon gemacht – stark! 💪</div>
          <div style="font-size:11.5px;opacity:.85;margin-top:2px">Nächste Runde in ${42-tage} Tag${42-tage===1?"":"en"}. Das hast du gesagt:</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
          ${KAB_SELBST_FRAGEN.map(f=>{const s=KAB_SELBST_STUFEN[a[f.k]];return s?`<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.10);border-radius:14px;padding:12px 14px;font-size:14px;font-weight:800"><span style="font-size:20px">${f.emo}</span><span style="flex:1">${esc(f.t)}</span><span>${s[0]} ${s[1]}</span></div>`:"";}).join("")}
        </div>
      </div>`;
      return;
    }
  }
  _ksAntworten={};_ksIdx=0;_ksSid=sid;_ksName=name;
  kabineStaerkenFrage();
}
function kabineStaerkenFrage(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  if(_ksIdx>=KAB_SELBST_FRAGEN.length){kabineStaerkenSave();return;}
  const f=KAB_SELBST_FRAGEN[_ksIdx];
  b.innerHTML=`<div style="display:flex;align-items:center;padding:14px 16px 0">
    <button onclick="kabineHome()" aria-label="Zurück" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:0 24px 24px;text-align:center;color:#fff">
    <div style="font-size:12px;opacity:.8">Frage ${_ksIdx+1} von ${KAB_SELBST_FRAGEN.length} · ${esc(_ksName)}</div>
    <div style="font-size:64px;line-height:1">${f.emo}</div>
    <div style="font-size:24px;font-weight:900">${esc(f.t)}</div>
    <div style="font-size:13px;opacity:.85">Wie gut klappt das bei dir?</div>
    <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px">
      ${[3,2,1].map(v=>{const s=KAB_SELBST_STUFEN[v];
        return `<button onclick="kabineStaerkenAnswer(${v})" style="border:none;border-radius:16px;padding:15px;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.14);color:#fff">${s[0]} ${s[1]}</button>`;}).join("")}
    </div>
  </div>`;
}
function kabineStaerkenAnswer(v){
  _ksAntworten[KAB_SELBST_FRAGEN[_ksIdx].k]=v;
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  _ksIdx++; kabineStaerkenFrage();
}
async function kabineStaerkenSave(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const heute=new Date().toISOString().slice(0,10);
  try{
    await fetch(`${SB_URL}/rest/v1/kind_selbstbild?on_conflict=spieler_id,datum`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({spieler_id:_ksSid,datum:heute,antworten:_ksAntworten})});
  }catch(e){}
  const ueben=KAB_SELBST_FRAGEN.filter(f=>_ksAntworten[f.k]===1);
  b.innerHTML=`<div id="ks-done" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#fff;position:relative;overflow:hidden">
    <div style="font-size:64px;line-height:1">🦅</div>
    <div style="font-size:24px;font-weight:900">Stark, ${esc(_ksName)}!</div>
    <div style="font-size:14px;opacity:.92;max-width:340px">${ueben.length?`Du willst <b>${ueben.map(f=>esc(f.t)).join(" und ")}</b> üben – sag das deinem Trainer, dann übt ihr es zusammen! 💪`:"Du fühlst dich überall sicher – weiter so, und hilf deinen Mitspielern! 🤝"}</div>
    <button onclick="kabineHome()" style="margin-top:10px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
  </div>`;
  try{navigator.vibrate&&navigator.vibrate([40,60,40]);}catch(e){}
  const cont=document.getElementById("ks-done");
  if(cont&&typeof confetti==="function")confetti(cont);
}
/* I-C – Kabinen-Reporter: das Kind beantwortet lustige Interview-Fragen per Antwort-Chips
   (8-Jährige tippen ungern). Antworten landen in einer Freigabe-Queue; der Trainer gibt
   im Adler Nest frei, was als Rubrik erscheint. */
/* ⚠️ Die FRAGE ist der Schlüssel: `kabine_reporter.frage` speichert den Fragetext, und
   `kabineReporterFor` filtert damit die schon beantworteten heraus. Fragetexte deshalb NIE
   ändern – sonst taucht eine beantwortete Frage wieder auf. Antwortoptionen dürfen wachsen.

   PO: „schaue ob alle Antworten immer passen. zb was vor dem Frühstück gegessen wird. nur 4
   zur Auswahl passt zb nicht immer." Genau: bei einer Geschmacksfrage sind vier Kacheln nie
   vollständig, und ein Kind, dessen Antwort fehlt, tippt irgendwas – dann steht Erfundenes im
   Adler Nest. Zwei Regeln daraus:
   1. Wo die Welt größer ist als die Liste, hat jede Frage einen ehrlichen Ausweg
      („Mal was anderes", „Kommt drauf an") – der ist eine ECHTE Antwort und lässt sich
      drucken, anders als ein leeres Feld.
   2. Fragen, die eine Wertung über andere Kinder auslösen könnten („Wer ist der Beste?"),
      kommen gar nicht erst rein. */
const REPORTER_FRAGEN=[
  {f:"Dein Traumtor?",o:["Fallrückzieher","Volle Pulle aus der Ferne","Solo durch alle durch","Lupfer über den Torwart","Kopfball","Abstauber aus zwei Metern"]},
  {f:"Was isst du am Spieltag?",o:["Nudeln","Müsli","Brötchen","Obst","Pfannkuchen","Mal dies, mal das","Gar nichts – zu aufgeregt!"]},
  {f:"Dein Lieblings-Trick?",o:["Übersteiger","Schnelle Drehung","Tunnel","Hackentrick","Einfach dran vorbeirennen","Noch am Üben!"]},
  {f:"Was macht unser Team stark?",o:["Wir feuern uns an","Wir passen uns den Ball zu","Wir geben nie auf","Wir lachen ganz viel","Wir helfen uns","Wir haben Spaß zusammen"]},
  {f:"Dein bester Moment bisher?",o:["Mein erstes Tor","Ein richtig guter Pass","Eine Mega-Parade","Der Team-Jubel","Ein Sieg mit dem ganzen Team","Als ich etwas Neues konnte"]},
  {f:"Dein Torjubel?",o:["Auf den Knien rutschen","Arme hoch und schreien","Ein Tänzchen","Alle umarmen","Zum Trainer rennen","Ganz cool bleiben"]},
  {f:"Wo spielst du am liebsten?",o:["Im Tor","Hinten aufpassen","Mittendrin","Vorne Tore jagen","Überall – Hauptsache dabei"]},
  {f:"Vor dem Spiel bin ich …",o:["Mega aufgeregt","Total ruhig","Voller Power","Am Kichern","Ein bisschen nervös","Kommt auf den Tag an"]},
  // ── ab hier neu (v420) ──
  {f:"Was machst du direkt nach dem Training?",o:["Erstmal was essen","Duschen","Draußen weiterspielen","Aufs Sofa fallen","Vom Training erzählen","Ganz unterschiedlich"]},
  {f:"Wie kommst du zum Platz?",o:["Mit dem Rad","Zu Fuß","Mit dem Auto","Mit dem Roller","Mal so, mal so"]},
  {f:"Was übst du gerade zuhause?",o:["Jonglieren","Schießen","Dribbeln","Passen an die Wand","Torwart-Sachen","Gerade nichts"]},
  {f:"Was gefällt dir am Training am meisten?",o:["Das Abschlussspiel","Die Torschuss-Übungen","Die Staffeln","Die Spiele mit Ball","Einfach alles"]},
  {f:"Bei welchem Wetter spielst du am liebsten?",o:["Sonne","Wolken","Regen und Matsch","Schnee","Ist mir völlig egal"]},
  {f:"Was nimmst du immer mit zum Spiel?",o:["Meine Trinkflasche","Mein Lieblings-Shirt","Ein Kuscheltier","Extra Socken","Nur mich selbst"]},
  {f:"Was rufst du beim Aufwärmen am lautesten?",o:["Adler Dellbrück!","Auf geht's!","Los Team!","Ich rufe lieber nichts"]},
  {f:"Was sagst du jemandem, der ein Tor verschossen hat?",o:["Kopf hoch, nächstes Mal!","Guter Versuch!","Weiter geht's!","Ich klopf ihm auf die Schulter"]},
  {f:"Wenn du eine Superkraft im Fußball hättest?",o:["Rennen wie der Blitz","Schießen wie eine Rakete","Immer richtig zielen","Überallhin springen","Nie müde werden"]},
  {f:"Was wünschst du dir für diese Saison?",o:["Viele Tore","Viel Spaß","Dass wir zusammenhalten","Ein neuer Trick","Immer besser werden"]}
];
let _krSid=null,_krName="",_krOffen=[];
function kabineReporter(){
  const kids=window._elternKids||[];
  if(!kids.length)return;
  if(kids.length===1){ kabineReporterFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎙️ Wer wird interviewt?","kabineReporterFor");
}
async function kabineReporterFor(sid,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let beantwortet=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?spieler_id=eq.${sid}&select=frage`,{headers:sbAuthHeaders()});
    if(r.ok)beantwortet=((await r.json())||[]).map(x=>x.frage);}catch(e){}
  _krSid=sid;_krName=name;
  _krOffen=REPORTER_FRAGEN.filter(q=>!beantwortet.includes(q.f)).sort(()=>Math.random()-.5).slice(0,2);
  if(!_krOffen.length){
    b.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;color:#fff">
      <div style="font-size:56px">🎙️</div>
      <div style="font-size:20px;font-weight:900">Alle Fragen beantwortet!</div>
      <div style="font-size:13px;opacity:.9;max-width:320px">Du bist ein echter Kabinen-Reporter, ${esc(name)}. Schau ins Adler Nest, was gedruckt wird!</div>
      <button onclick="kabineHome()" style="margin-top:10px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
    </div>`;
    return;
  }
  kabineReporterFrage();
}
function kabineReporterFrage(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const q=_krOffen[0];
  if(!q){
    b.innerHTML=`<div id="kr-done" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;color:#fff;position:relative;overflow:hidden">
      <div style="font-size:56px">🎙️</div>
      <div style="font-size:22px;font-weight:900">Danke, Reporter ${esc(_krName)}!</div>
      <div style="font-size:13px;opacity:.9;max-width:320px">Der Trainer schaut sich deine Antworten an – vielleicht stehst du bald im Adler Nest! 📰</div>
      <button onclick="kabineHome()" style="margin-top:10px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
    </div>`;
    const cont=document.getElementById("kr-done");
    if(cont&&typeof confetti==="function")confetti(cont);
    return;
  }
  b.innerHTML=`<div style="display:flex;align-items:center;padding:14px 16px 0">
    <button onclick="kabineHome()" aria-label="Zurück" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:0 24px 24px;text-align:center;color:#fff">
    <div style="font-size:12px;opacity:.8">🎙️ Kabinen-Reporter · ${esc(_krName)}</div>
    <div style="font-size:22px;font-weight:900;max-width:340px">${esc(q.f)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px">
      ${q.o.map((o,i)=>`<button onclick="kabineReporterAnswer(${i})" style="border:none;border-radius:16px;padding:14px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.14);color:#fff">${esc(o)}</button>`).join("")}
    </div>
  </div>`;
}
async function kabineReporterAnswer(idx){
  const q=_krOffen.shift(); if(!q)return;
  try{navigator.vibrate&&navigator.vibrate(25);}catch(e){}
  try{
    await fetch(`${SB_URL}/rest/v1/kabine_reporter`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler_id:_krSid,frage:q.f,antwort:q.o[idx],datum:new Date().toISOString().slice(0,10)})});
  }catch(e){}
  kabineReporterFrage();
}
/* Kabinen-DJ (Phase 23.2): die Spotify-Playlist der U9 in der App. Wandelt einen
   Spotify-Link in die Embed-URL um; akzeptiert Playlist/Album/Track. */
function spotifyEmbed(url){
  const m=/open\.spotify\.com\/(playlist|album|track)\/([A-Za-z0-9]+)/.exec(url||"");
  return m?`https://open.spotify.com/embed/${m[1]}/${m[2]}`:null;
}
async function kabineHype(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let url="";
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=spotify_playlist`,{headers:sbAuthHeaders()});if(r.ok)url=(((await r.json())[0])||{}).spotify_playlist||"";}catch(e){}
  const embed=spotifyEmbed(url);
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎵 Kabinen-Hype</div></div>`;
  if(!embed){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:20px;text-align:center">Noch keine Playlist hinterlegt.<br>Der Trainer kann sie in der Adler-Welt setzen. 🎧</div>'; return; }
  b.innerHTML=head+`<div style="flex:1;padding:12px 16px">
    <iframe title="Kabinen-Playlist" style="border-radius:14px;width:100%;height:420px;border:0" src="${esc(embed)}" allow="encrypted-media; clipboard-write" loading="lazy"></iframe>
    <div style="text-align:center;color:#fff;opacity:.8;font-size:12px;margin-top:10px">Vor dem Spiel schön laut – auf geht's, Adler! 🦅</div>
  </div>`;
}
// Skill der Woche im Kinder-Modus: aktive Challenge holen und das Video zeigen.
async function kabineSkillWoche(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let sk=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)sk=(await r.json())[0]||null;}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎬 Skill der Woche</div></div>`;
  if(!sk){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:20px;text-align:center">Diese Woche gibt es keine neue Challenge.<br>Schau bald wieder rein! 💪</div>'; return; }
  b.innerHTML=head+`<div style="flex:1;padding:16px;color:#fff;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px">
    <div style="font-size:22px;font-weight:900;margin-top:10px">${esc(sk.titel)}</div>
    ${sk.beschreibung?`<div style="font-size:14px;opacity:.95;line-height:1.5;max-width:420px">${esc(sk.beschreibung)}</div>`:""}
    ${sk.video_url?`<a href="${esc(sk.video_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 28px;border-radius:16px;background:#fff;color:#0b2f4d;font-weight:800;font-size:16px;text-decoration:none">▶️ Video ansehen</a>`:""}
    <div style="font-size:13px;opacity:.85;max-width:420px;margin-top:6px">Übe zuhause – wenn du es schaffst, geben deine Eltern die Federn frei! 🪶</div>
  </div>`;
}
// mode: "taktik" | "wissen" – springt nach der Namenswahl direkt ins gewählte Quiz.
// from=kabine blendet im Quiz einen „Zurück zur Kabine"-Button ein.
function kabineQuiz(mode){ window.location.href=location.pathname+"?quiz&from=kabine"+(mode?"&mode="+encodeURIComponent(mode):""); }
/* Kids-Modus: eigene FUT-Karte (mit Federn/Holo aus FUT 2.0) + Abzeichen (read-only).
   Bei mehreren Kindern erst eine kindgerechte Auswahl im Kabinen-Body. */
function kabinePickKid(title,fnName){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const kids=window._elternKids||[];
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="font-size:18px;font-weight:800">${title}</div></div>`;
  if(!kids.length){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;opacity:.85;padding:20px;text-align:center">Kein Kind gefunden.</div>'; return; }
  b.innerHTML=head+`<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px;align-content:start">`+
    kids.map(k=>`<button onclick="${fnName}(${k.spieler_id},'${jsq((k.kader&&k.kader.name)||"")}')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:16px;font-weight:800;min-height:110px"><span style="font-size:40px">⚽</span>${esc((k.kader&&k.kader.name)||"Kind")}</button>`).join("")+`</div>`;
}
function kabineMyCard(){
  const kids=window._elternKids||[];
  if(kids.length===1){ elternCardOpen(kids[0].spieler_id); return; }
  kabinePickKid("🃏 Wessen Karte?","kabineMyCardFor");
}
function kabineMyCardFor(id){ elternCardOpen(id); }
function kabineAbzeichen(){
  const kids=window._elternKids||[];
  if(kids.length===1){ abzeichenOpen(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||"",true); return; }
  kabinePickKid("🎖️ Wessen Abzeichen?","kabineAbzeichenFor");
}
function kabineAbzeichenFor(id,name){ abzeichenOpen(id,name,true); }
/* B-Etappe 2: „Meine Mission" – die offenen Entwicklungsziele kindgerecht im Kabinen-Modus.
   Ziele sind trainer-only; die RPC meine_ziele (is_parent_of-gegatet) erlaubt der Eltern-
   Sitzung den Lesezugriff aufs eigene Kind. */
function kabineMission(){
  const kids=window._elternKids||[];
  if(kids.length===1){ kabineMissionFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎯 Wessen Mission?","kabineMissionFor");
}
async function kabineMissionFor(id,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let ziele=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/meine_ziele`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:id})});if(r.ok)ziele=(await r.json())||[];}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎯 ${esc(name||"Meine")} Mission</div></div>`;
  if(!ziele.length){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:24px;text-align:center">Noch keine Mission gesetzt.<br>Frag deinen Trainer, woran du arbeiten kannst! 💪</div>'; return; }
  const cards=ziele.map(z=>{const ex=(typeof _zielUebungen==="function")?_zielUebungen((z.meta&&z.meta.tags)||[],3):[];
    return `<div style="background:rgba(255,255,255,.14);border-radius:18px;padding:16px;margin-bottom:12px;color:#fff">
      <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.5px">🎯 Deine Mission</div>
      <div style="font-size:19px;font-weight:900;margin:2px 0 6px">${esc(z.ziel)}</div>
      ${ex.length?`<div style="font-size:13px;opacity:.92">💪 Übe das: ${ex.map(esc).join(" · ")}</div>`:""}
    </div>`;}).join("");
  b.innerHTML=head+`<div style="flex:1;overflow-y:auto;padding:12px 16px">
    <div style="color:#fff;opacity:.85;font-size:13px;margin-bottom:10px">Das nimmt sich dein Trainer mit dir vor. Bleib dran – du schaffst das! 🦅</div>
    ${cards}</div>`;
}
/* A-Etappe 3: „Wo spiele ich?" – Rollen des eigenen Kindes kindgerecht. Aufstellungen sind
   trainer-only; die RPC meine_rollen (is_parent_of-gegatet) liefert die Rollen-Zählung. */
function kabineRollen(){
  const kids=window._elternKids||[];
  if(kids.length===1){ kabineRollenFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎽 Wessen Rollen?","kabineRollenFor");
}
async function kabineRollenFor(id,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let r={games:0};
  try{const res=await fetch(`${SB_URL}/rest/v1/rpc/meine_rollen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:id})});if(res.ok)r=(await res.json())||{games:0};}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎽 Wo spielt ${esc(name||"du")}?</div></div>`;
  if(!r.games){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:24px;text-align:center">Noch keine Aufstellung gespeichert.<br>Nach dem nächsten Spiel siehst du hier deine Rollen! ⚽</div>'; return; }
  // Torwart bewusst NICHT anzeigen – wir haben feste Torhüter (Feldrollen sind das Thema).
  const R=[{k:"auf",l:"🛡️ Aufpasser",c:"#3b82f6"},{k:"fll",l:"⚡ Flitzer links",c:"#f97316"},{k:"flr",l:"⚡ Flitzer rechts",c:"#22c55e"},{k:"jaeg",l:"🎯 Jäger",c:"#ef4444"}];
  const max=Math.max(1,...R.map(x=>r[x.k]||0));
  const bars=R.map(x=>{const v=r[x.k]||0, w=Math.round((v/max)*100);
    return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:#fff"><span>${x.l}</span><span>${v}×</span></div><div style="height:12px;background:rgba(255,255,255,.15);border-radius:6px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${w}%;background:${x.c};border-radius:6px"></div></div></div>`;}).join("");
  b.innerHTML=head+`<div style="flex:1;overflow-y:auto;padding:14px 16px">
    <div style="color:#fff;opacity:.85;font-size:13px;margin-bottom:12px">In ${r.games} Aufstellungen hast du diese Rollen gespielt:</div>
    ${bars}</div>`;
}
function kabineShowQuests(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="font-size:18px;font-weight:800">🏆 Unsere Missionen</div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:0 16px 16px">
      ${teamQuests.map(q=>`<div style="background:rgba(255,255,255,.1);border-radius:14px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px">
        <span style="font-size:30px">${q.icon}</span>
        <div><div style="font-size:16px;font-weight:800">${esc(q.label)}</div><div style="font-size:13px;opacity:.85">Ziel: ${q.target}</div></div>
      </div>`).join("")}
      ${teamQuestFedern>0?`<div style="background:linear-gradient(135deg,#10b981,#0ea5e9);border-radius:14px;padding:16px;text-align:center;margin-top:6px"><div style="font-size:13px;opacity:.9">Schafft ihr ALLE Missionen, gibt's</div><div style="font-size:22px;font-weight:900;margin-top:4px">${XP_ICON} ${teamQuestFedern} Federn für jeden!</div></div>`:""}
      ${teamBelohnung?`<div style="background:linear-gradient(135deg,#f59e0b,#ec4899);border-radius:14px;padding:16px;text-align:center;margin-top:10px"><div style="font-size:13px;opacity:.9">🎁 Extra-Belohnung</div><div style="font-size:18px;font-weight:900;margin-top:4px">${esc(teamBelohnung)}</div></div>`:""}
    </div>`;
}
function kabineShowGallery(){ kabineIdx=0; kabineRenderGallery(); }
function kabineRenderGallery(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800">🖼️ Team-Galerie</div>
      <div style="font-size:12px;opacity:.8">${kabineGalleryData.length?kabineIdx+1:0} / ${kabineGalleryData.length}</div></div>`;
  if(!kabineGalleryData.length){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;opacity:.8">Noch keine Karten.</div>'; return; }
  const g=kabineGalleryData[kabineIdx], d=galleryCardData(g);
  b.innerHTML=head+`
    <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
      <button onclick="kabineGalleryNav(-1)" style="position:absolute;left:8px;z-index:2;background:rgba(255,255,255,.15);border:none;color:#fff;width:46px;height:46px;border-radius:50%;font-size:24px;cursor:pointer">‹</button>
      <canvas id="kabine-card" style="max-width:100%;width:280px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)"></canvas>
      <button onclick="kabineGalleryNav(1)" style="position:absolute;right:8px;z-index:2;background:rgba(255,255,255,.15);border:none;color:#fff;width:46px;height:46px;border-radius:50%;font-size:24px;cursor:pointer">›</button>
    </div>
    <div style="text-align:center;padding:0 16px 16px;font-size:13px;opacity:.85">${esc(g.name)}${g.spitzname?` „${esc(g.spitzname)}“`:""}${g.lieblingsverein?` · Fan von ${esc(g.lieblingsverein)}`:""}</div>
    ${g.foto_path?"":`<div style="margin:0 16px 16px;background:rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;text-align:center;font-size:11.5px;line-height:1.5">📷 Hier fehlt noch ein Foto von ${esc(g.name)}.<br><span style="opacity:.75">Frag Mama oder Papa, ob sie es freigeben – im Eltern-Bereich unter „Fan-Fakten &amp; Foto“.</span></div>`}`;
  const canvas=document.getElementById("kabine-card");if(!canvas)return;
  canvas.width=500;canvas.height=780;const ctx=canvas.getContext("2d");
  adlerCardDraw(ctx,500,780,d,null);
  cardApplyGlow(canvas,g.trainings);
  if(d.fotoPath){ fotoLoadImage(d.fotoPath).then(img=>{ if(img&&document.getElementById("kabine-card")===canvas){ adlerCardDraw(ctx,500,780,d,img); } }); }
}
function kabineGalleryNav(dir){
  if(!kabineGalleryData.length)return;
  kabineIdx=(kabineIdx+dir+kabineGalleryData.length)%kabineGalleryData.length;
  kabineRenderGallery();
}
function galleryCardData(g){
  const v=typeof g.radios==="string"?safeParse(g.radios,{}):(g.radios||{});
  const strengths=Object.keys(CARD_BADGES).map(key=>({key,val:v[key]||0})).sort((a,b)=>b.val-a.val).slice(0,3);
  const {dims:ds}=calcScores(v,DIMS_FELD);
  const topDim=Object.entries(ds).sort((a,b)=>b[1]-a[1])[0]||["tech",0];
  const theme=g.tw?CARD_THEMES.keeper:(CARD_THEMES[topDim[0]]||CARD_THEMES.tech);
  return {name:g.name,nr:g.nr,tw:!!g.tw,fotoPath:g.foto_path,spitzname:g.spitzname||null,
    pos:g.tw?"Torwart":"",fuss:"",alter:null,
    badges:strengths.map(x=>CARD_BADGES[x.key]),theme,
    counts:{trainings:g.trainings||0,tore:null,paraden:null,aktionen:null,spiele:null,quizRichtig:0,quizBloecke:0}};
}
// Erwachsenen-Gate der Kabine: fester Code statt Rechenaufgabe (die war für U9 zu leicht).
/* Kabinen-Code: der SHA-256 liegt in team_config.kabine_code_hash, nicht im Quelltext
   (das Repo ist oeffentlich) und ist ohne Deploy aenderbar. Gegen ein hartnaeckiges
   Kind ist das trotzdem nur eine Huerde, kein Schutz – ein vierstelliger Code laesst
   sich in Millisekunden durchprobieren. Die echte Zugriffskontrolle macht die RLS.
   Der Hash wird zwischengespeichert, damit die Kabine auch ohne Netz aufgeht. */
const KABINE_HASH_KEY="adler_kabine_hash";
const KABINE_HASH_FALLBACK="2c1f3f5f6523af84fde4af934caa1126ae6bcebacd36e397fbddcb8a620c1d73"; // "1922", nur bis zum ersten Laden
async function kabineCodeHash(){
  if(sbToken()){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/kabine_config?id=eq.1&select=code_hash`,{headers:sbAuthHeaders()});
      if(r.ok){
        const h=((await r.json())[0]||{}).code_hash;
        if(h){ try{localStorage.setItem(KABINE_HASH_KEY,h);}catch(e){} return h; }
      }
    }catch(e){/* offline: gleich der Zwischenspeicher */}
  }
  try{ const c=localStorage.getItem(KABINE_HASH_KEY); if(c)return c; }catch(e){}
  return KABINE_HASH_FALLBACK;
}
/* Code-Eingabe direkt in der App statt per System-Dialog (PO): eigenes grosses Zahlenfeld,
   damit es auf jedem Geraet gleich aussieht und die Tasten kindersicher gross sind - die
   Handy-Tastatur oeffnet sich bei prompt() unzuverlaessig und verdeckt den Dialog. */
let _kabCode="";
function kabineExit(){
  _kabCode="";
  document.getElementById("kabexit")?.remove();
  const m=document.createElement("div"); m.id="kabexit";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Code eingeben");
  m.style.cssText="position:fixed;inset:0;z-index:10065;background:rgba(8,15,35,.92);display:flex;align-items:center;justify-content:center;padding:16px";
  const taste=(t)=>`<button onclick="kabineCodeTip('${t}')" style="min-height:64px;border:none;border-radius:16px;background:rgba(255,255,255,.14);color:#fff;font-family:inherit;font-size:26px;font-weight:800;cursor:pointer">${t}</button>`;
  m.innerHTML=`<div style="width:100%;max-width:320px;text-align:center;color:#fff">
    <div style="font-size:40px">🔒</div>
    <div style="font-size:19px;font-weight:900;margin-top:4px">Nur für Erwachsene</div>
    <div style="font-size:13px;opacity:.75;margin-bottom:14px">Code eingeben, um die Kabine zu verlassen</div>
    <div id="kabexit-dots" style="display:flex;gap:12px;justify-content:center;margin-bottom:6px"></div>
    <div id="kabexit-err" style="min-height:18px;font-size:12.5px;color:#fca5a5;font-weight:700;margin-bottom:10px"></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${[1,2,3,4,5,6,7,8,9].map(taste).join("")}
      <button onclick="kabineCodeTip('del')" aria-label="Löschen" style="min-height:64px;border:none;border-radius:16px;background:rgba(255,255,255,.08);color:#fff;font-size:22px;cursor:pointer">⌫</button>
      ${taste(0)}
      <button onclick="document.getElementById('kabexit').remove()" aria-label="Abbrechen" style="min-height:64px;border:none;border-radius:16px;background:rgba(255,255,255,.08);color:#fff;font-size:22px;cursor:pointer">✕</button>
    </div>
  </div>`;
  m.onclick=e=>{if(e.target===m)m.remove();};
  document.body.appendChild(m);
  kabineCodeDots();
}
function kabineCodeDots(){
  const d=document.getElementById("kabexit-dots"); if(!d)return;
  d.innerHTML=[0,1,2,3].map(i=>`<span style="width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.5);background:${i<_kabCode.length?"#fff":"transparent"}"></span>`).join("");
}
async function kabineCodeTip(t){
  const err=document.getElementById("kabexit-err"); if(err)err.textContent="";
  if(t==="del"){ _kabCode=_kabCode.slice(0,-1); kabineCodeDots(); return; }
  if(_kabCode.length>=4)return;
  _kabCode+=String(t);
  kabineCodeDots();
  try{navigator.vibrate&&navigator.vibrate(12);}catch(e){}
  if(_kabCode.length<4)return;
  // hashPin braucht crypto.subtle. Faellt das aus (kein sicherer Kontext), muss das
  // Kind trotzdem erfahren, warum nichts passiert - sonst haengt es in der Kabine fest.
  let eingabe,soll;
  try{ [eingabe,soll]=await Promise.all([hashPin(_kabCode),kabineCodeHash()]); }
  catch(e){ _kabCode=""; kabineCodeDots(); if(err)err.textContent="Der Code lässt sich gerade nicht prüfen. Bitte die Seite neu laden."; return; }
  if(eingabe===soll){
    isKidsMode=false; kabineAktivSet(false); kabSubConsume();
    clearInterval(window._kabZeitTimer); window._kabZeitTimer=null;
    try{localStorage.removeItem(KABINE_START_KEY);}catch(e){}
    document.getElementById("kabexit")?.remove();
    document.getElementById("kabine")?.remove();
  }else{
    _kabCode=""; kabineCodeDots();
    if(err)err.textContent="Falscher Code - die Kabine bleibt zu.";
    try{navigator.vibrate&&navigator.vibrate([40,60,40]);}catch(e){}
  }
}
/* Alle Kabinen-Unterseiten setzen beim Öffnen einen History-Eintrag (kabSubMark), damit die
   Smartphone-Zurück-Taste zur Kabinen-Startseite führt. Wrapper statt 15 Einzel-Edits –
   function-Declarations sind window-Properties, die Neubelegung greift auch für onclick. */
["kabinePickKid","kabinePostOpen","kabineKudosFor","kabinePackFor","kabineStaerkenFor","kabineReporterFor","kabineRevealShow","kabineAlbum","kabineAlbumFor","kabineTausch","kabineHype","kabineSkillWoche","kabineMissionFor","kabineRollenFor","kabineShowQuests","kabineShowGallery"].forEach(fn=>{
  const orig=window[fn];
  if(typeof orig==="function")window[fn]=function(){ kabSubMark(); return orig.apply(this,arguments); };
});
function elternPortalTrainerNotice(root){
  root.innerHTML=`<div style="max-width:360px;margin:8vh auto;background:#fff;border-radius:16px;padding:24px;text-align:center">
    <div style="font-size:40px">🧑‍🏫</div>
    <div style="font-size:16px;font-weight:800;margin-top:8px">Du bist als Trainer angemeldet</div>
    <div style="font-size:13px;color:#64748b;margin:8px 0 16px">Dieser Bereich ist für Eltern. Öffne die Trainer-App ohne <code>?portal</code> in der Adresse.</div>
    <a href="${appRoot()}trainer/" style="display:inline-block;padding:11px 18px;background:#1e3a8a;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Zur Trainer-App</a>
    <button onclick="elternPortalLogout()" style="display:block;width:100%;margin-top:12px;border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">Abmelden</button>
  </div>`;
}

/* Der Kader kommt ausschliesslich aus der Datenbank (loadKader in views.js, Welle 1).
   Bis v449 stand hier eine feste Liste mit echten Vornamen als Startwert – in einem
   oeffentlichen Repo. Die Liste wurde beim Laden ohnehin komplett ersetzt. */

// D2: Trainerliste speist Select + beide Checkbox-Leisten.
// TRAINER steht seit v386 in data.js (Welle 1) – hier NICHT erneut definieren,
// ein globaler Name darf nicht in beiden Wellen leben.
function renderTrainerUI(){
  const sel=document.getElementById("p-trainer");
  if(typeof trainerMe==="function")trainerMe().then(me=>{if(me&&sel&&[...sel.options].some(o=>o.value===me))sel.value=me;}).catch(()=>{}); // eingeloggter Trainer als Default (war: immer der erste)
  if(sel)sel.innerHTML=TRAINER.map(t=>`<option value="${t}">${t}</option>`).join("");
  const tp=document.getElementById("tp-trainer-checks");
  /* v413: die Chip-Zeile der Planung gehoert jetzt tpTrainerChipsRender (boot.js) –
     angehakt wird, wer ZUGESAGT hat, nicht mehr zwei fest verdrahtete Namen. */
  if(tp&&typeof tpTrainerChipsRender==="function")tpTrainerChipsRender();
  else if(tp)tp.innerHTML=TRAINER.map(t=>`<label class="tp-check"><input type="checkbox" value="${t}" onchange="tpRenderTimeline()"><span>${t}</span></label>`).join("");
  const aw=document.getElementById("aw-trainer-checks");
  if(aw)aw.innerHTML=TRAINER.map(t=>`<label class="tp-check"><input type="checkbox" value="${t}" onchange="if(typeof awTrainerToggle==='function')awTrainerToggle(this)"><span>${t}</span></label>`).join("");
  const tn=document.getElementById("tn-autor");
  if(tn)tn.innerHTML=TRAINER.map(t=>`<option value="${t}">${t}</option>`).join("");
  const tv=document.getElementById("tv-autor");
  if(tv)tv.innerHTML=TRAINER.map(t=>`<option value="${t}">${t}</option>`).join("");
  // Die Kopfzeile listete frueher die Trainernamen ("4+1 Raute · …"). HOTFIX 1
  // hatte das nur dynamisch gemacht, weil Finn fehlte – gebraucht hat es dort niemand.
  // Jetzt steht im Untertitel der naechste Termin (topbarNaechsterTermin in views.js).
}
renderTrainerUI();


