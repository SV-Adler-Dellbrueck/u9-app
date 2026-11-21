/* ═══════════════════════════════════
   FAN-FAKTEN (Phase 11-Q) – Eltern pflegen Spitzname/Verein/Spieler + Profilbild
   für ihr eigenes Kind (kind_fanfacts, RLS is_parent_of). kader bleibt trainer-only.
   Foto-Upload pfad-basiert: "<spieler_id>/<uuid>.jpg".
═══════════════════════════════════ */
/* v732 (PO 03.10.): Fan-Fakten fürs „Adler im Porträt“ im Adler Nest – zehn kurze, freiwillige Felder.
   Bewusst ohne Schule, Wohnort, Namen von Geschwistern oder Geburtsdatum (seit v733 lesen nur angemeldete Team-Familien das Heft).
   Aus diesen Feldern und den Kabinen-Reporter-Antworten schreibt die KI einen Entwurf (ohne Namen), den
   das Trainerteam liest und freigibt. */
const FF_PORTRAET=[
  ["adler_seit","Bei den Adlern seit","z. B. Saison 2025/26"],
  ["nummer_grund","Warum genau diese Rückennummer?","z. B. Die trägt mein Lieblingsspieler"],
  ["hobby","Hobby neben dem Fußball","z. B. Schwimmen, Lego"],
  ["kann_gut","Was ich außer Fußball richtig gut kann","z. B. Witze erzählen"],
  ["lieblingsessen","Lieblingsessen","z. B. Pfannkuchen"],
  ["lieblingstier","Lieblingstier","z. B. Gepard"],
  ["lieblingsmusik","Lieblingsmusik / Kabinen-Song","z. B. ein Lied, das gute Laune macht"],
  ["lieblingsfilm","Lieblingsfilm oder -serie","z. B. ein Zeichentrickfilm"],
  ["fussball_erlebnis","Größtes Fußball-Erlebnis","z. B. erster Stadionbesuch"],
  ["gross_werden","Wenn ich groß bin, möchte ich …","z. B. Tierärztin werden"]
];
/* v733 (Auftragspaket Adler Nest): für den Steckbrief im Porträt – starker Fuß, Saisonziel und ein
   weiterer Sport mit Lieblingsteam. Das Heft lesen seit v733 nur noch angemeldete Team-Familien. */
const FF_STECKBRIEF=[
  ["saisonziel","Saisonziel – was ich diese Saison lernen will","z. B. Zweikämpfe gewinnen"],
  ["weiterer_sport","Weiterer Sport","z. B. Eishockey, zweimal pro Woche"],
  ["weiterer_sport_team","Lieblingsteam in diesem Sport","z. B. Kölner Haie"]
];
/* ═══ v922 · Steckbrief für alle Kinder (Charles 21.11., Bild und Fragenkatalog freigegeben) ═══════════════
   Ein Bogen statt Fan-Fakten-Fenster und Porträt-Klappe: 12 Kernfragen (zählen im Fortschritt der Karte), dazu
   „Freundebuch“ und „Kreativ und cool“ als freiwillige Zusatzfragen, Fotos in vier Kacheln (Beim Fußball, Beim Sport,
   Aus dem Alltag, Selbst gemalt – Zwecke im Album). Lieblingsposition als Rauten-Position. Gespeichert wird in
   kind_fanfacts wie bisher; die alten Feld-IDs (ff-spitz, ff-verein, ff-spieler, ff-schuh, ff-gallery, ff-<key>)
   bleiben. Bewusst nichts zu Schule, Wohnort, Geschwistern, Geburtsdatum oder Gesundheit. */
const SB_POSITIONEN=[["jaeger","Jäger"],["flitzer_links","linker Flitzer"],["flitzer_rechts","rechter Flitzer"],["aufpasser","Aufpasser"],["torwart","Torwart"],["alle","alle"],["alle_ausser_tw","alle außer Torwart"]];
const SB_PLATZ=[["lieblingsspieler","Lieblingsspieler","z. B. Musiala","ff-spieler"],["lieblingsverein","Lieblingsverein","z. B. 1. FC Köln","ff-verein"],
  ["schoenster_moment","Mein schönster Moment bei den Adlern","z. B. mein erstes Tor"],["torjubel","So jubel ich nach einem Tor","z. B. Flugzeug mit ausgebreiteten Armen"],
  ["saisonziel","Das will ich diese Saison lernen","z. B. Zweikämpfe gewinnen"]];
const SB_NEBEN=[["hobby","Hobby","z. B. Schwimmen, Lego"],["kann_gut","Was ich außer Fußball richtig gut kann","z. B. Witze erzählen"],["lieblingsessen","Lieblingsessen","z. B. Pfannkuchen"],
  ["lieblingstier","Lieblingstier","z. B. Gepard"],["gross_werden","Wenn ich groß bin, möchte ich …","z. B. Tierärztin werden"],["stolz_auf","Darauf bin ich stolz","z. B. dass ich jetzt Rad fahren kann"]];
const SB_FREUNDE=[["spitzname","Spitzname","z. B. Mimi","ff-spitz"],["lieblingsfarbe","Lieblingsfarbe","z. B. Blau"],["lieblingsbuch","Lieblingsbuch","z. B. ein Comic"],
  ["lieblingsfilm","Lieblingsfilm oder -serie","z. B. ein Zeichentrickfilm"],["lieblingsmusik","Lieblingslied oder Kabinen-Song","z. B. ein Lied, das gute Laune macht"],
  ["lieblingsspiel","Lieblingsspiel drinnen und draußen","z. B. Uno und Verstecken"],["lieblingsfach","Lieblingsfach","z. B. Sport"],["mag_nicht","Das mag ich gar nicht","z. B. Rosenkohl"],
  ["groesster_wunsch","Mein größter Wunsch","z. B. einmal ins Stadion"]];
const SB_KREATIV=[["superkraft","Meine Superkraft wäre …","z. B. fliegen"],["zaubern","Wenn ich zaubern könnte, würde ich …","z. B. Schnee im Sommer machen"],
  ["lieblingswitz","Mein Lieblingswitz","Kurz reicht"],["geheimes_talent","Das kann ich, und kaum einer weiß es","z. B. auf den Händen laufen"],
  ["star_spielen","Mit diesem Star würde ich gern einmal spielen","z. B. Neuer"],["traumstadion","Mein Traumstadion","z. B. Camp Nou"],
  ["fussball_erlebnis","Mein größtes Fußball-Erlebnis","z. B. erster Stadionbesuch"],["satz_an_team","Ein Satz an mein Team","z. B. Wir halten zusammen!"]];
const SB_FOTOS=[["aktion","⚽","Beim Fußball"],["sport","🏅","Beim Sport"],["alltag","🏠","Aus dem Alltag"],["gemalt","🎨","Selbst gemalt"]];
const SB_KERN_KEYS=["lieblingsposition"].concat(SB_PLATZ.map(x=>x[0]),SB_NEBEN.map(x=>x[0]));   // 12
const SB_DATENSCHUTZ="Die Fotos und Angaben sehen nur ihr und das Trainerteam. Nichts kommt auf Social Media oder ins Internet. Ins Adler Nest kommt ein Foto nur mit eurem Häkchen. Alles ist freiwillig.";
function sbKernZahl(f){ return SB_KERN_KEYS.filter(k=>String((f||{})[k]||"").trim()).length; }
function sbFotoZahl(fotos){ return SB_FOTOS.filter(([z])=>(fotos||[]).some(x=>x.zweck===z)).length; }
function sbFeldId(e){ return e[3]||("ff-"+e[0]); }
async function elternFanfactsOpen(spielerId,kindName){
  document.getElementById("fanfacts-modal")?.remove();
  let f={};
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)f=(await r.json())[0]||{};}catch(e){}
  const ausgabe=await elternAusstattungLesen(spielerId);
  window._sbBogen={sid:Number(spielerId),pos:f.lieblingsposition||""};
  const inp="width:100%;min-height:48px;padding:9px;margin:4px 0 10px;border:var(--border-s);border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)";
  const lab="display:block;font-size:var(--s-text);color:var(--text2)";
  const feld=e=>`<label for="${sbFeldId(e)}" style="${lab}">${e[1]}</label><input id="${sbFeldId(e)}" maxlength="120" value="${esc(f[e[0]]||'')}" placeholder="${esc(e[2])}" style="${inp}">`;
  const sek=t=>`<div class="sb-sek">${t}</div>`;
  const klappe=(titel,unter,liste)=>{ const n=liste.filter(e=>String(f[e[0]]||"").trim()).length;
    return `<details class="sb-klappe"${n?" open":""}><summary>${titel} <span class="sb-zahl">${n} von ${liste.length}</span></summary><div class="sb-unter">${unter}</div>${liste.map(feld).join("")}</details>`; };
  const name=esc(kindName||"Euer Kind");
  const { grund:m, karte }=fensterAuf("fanfacts-modal",{breite:480,aussen:true});
  karte.innerHTML=`${mdlHead("fanfacts-modal","📸",`${name} – Steckbrief`,"Erzählt uns von eurem Kind","#6d28d9")}
    <div class="sb-schutz">🔒 ${esc(SB_DATENSCHUTZ)}</div>
    <div id="sb-fortschritt" class="sb-fort">Kernfragen ${sbKernZahl(f)} von 12</div>
    ${sek("⚽ Auf dem Platz")}
    <div style="${lab}">Lieblingsposition</div>
    <div id="sb-pos" class="sb-chips" role="group" aria-label="Lieblingsposition">${SB_POSITIONEN.map(([v,l])=>`<button type="button" class="sb-chip" data-pos="${v}" aria-pressed="${f.lieblingsposition===v}" onclick="sbPosition('${v}')">${l}${f.lieblingsposition===v?" ✓":""}</button>`).join("")}</div>
    ${SB_PLATZ.map(feld).join("")}
    ${sek("🏠 Neben dem Platz")}
    ${SB_NEBEN.map(feld).join("")}
    ${sek("📸 Fotos")}
    <div id="sb-fotos-${Number(spielerId)}" class="sb-fotos"><span style="font-size:var(--s-klein);color:var(--text3)">Lädt …</span></div>
    ${klappe("📖 Freundebuch","Freiwillig – wer Lust hat, macht weiter.",SB_FREUNDE)}
    ${klappe("🌟 Kreativ und cool","Darüber freuen sich auch die anderen Kinder.",SB_KREATIV)}
    <details class="sb-klappe"><summary>🦅 Fürs Adler Nest und den Verein</summary>
      <div class="sb-unter">Reihum stellt das Adler Nest ein Kind vor. Aus diesen Angaben und den Antworten im Kabinen-Reporter entsteht ein kurzer Text, den das Trainerteam vor dem Druck liest. Der Grund für die Rückennummer bleibt beim Trainerteam.</div>
      ${ausgabe}
      ${FF_PORTRAET.filter(([k])=>k==="adler_seit"||k==="nummer_grund").map(feld).join("")}
      <label for="ff-starker_fuss" style="${lab}">Starker Fuß</label>
      <select id="ff-starker_fuss" style="${inp}">${[["","– bitte wählen –"],["rechts","rechts"],["links","links"],["beide","beide"]].map(([v,l])=>`<option value="${v}"${(f.starker_fuss||"")===v?" selected":""}>${l}</option>`).join("")}</select>
      ${FF_STECKBRIEF.filter(([k])=>k!=="saisonziel").map(feld).join("")}
      <label for="ff-schuh" style="${lab}">👟 Schuh-Größe <span style="color:var(--text3)">(hilft bei Sammelbestellungen)</span></label>
      <input id="ff-schuh" value="${esc(f.schuh_groesse||'')}" placeholder="z. B. 31" style="${inp}">
      <div style="${lab}">Profilbild</div>
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0 10px"><input type="file" accept="image/jpeg,image/png,image/webp" onchange="elternFotoUpload(${spielerId},this)" style="font-size:var(--s-klein);flex:1">${f.foto_path?'<span style="font-size:var(--s-klein);color:var(--green)">✓ vorhanden</span>':''}</div>
      <label style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);color:var(--text2);margin:6px 0 10px;min-height:44px"><input id="ff-gallery" type="checkbox" ${f.gallery_optin?"checked":""}> Kartenfoto für die Team-Familien zeigen (Opt-in)</label>
      <div style="${lab}">Alle Fotos <span style="color:var(--text3)">· bis 6, eines davon fürs Kartenfoto</span></div>
      <div id="ka-box-${spielerId}" class="ka-box" style="margin:4px 0 6px"><span style="font-size:var(--s-klein);color:var(--text3)">Lädt …</span></div>
    </details>
    <button class="btn btn-p" onclick="elternFanfactsSave(${spielerId})" style="width:100%;min-height:56px;margin-top:14px;justify-content:center;font-size:var(--s-karte)">Speichern</button>
    <button class="btn" onclick="document.getElementById('fanfacts-modal').remove()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Später</button>`;
  karte.addEventListener("input",sbFortschritt);
  kindAlbumRender(spielerId,"ka-box-"+spielerId,"eltern");
  sbFotosRender(spielerId);
}
function sbPosition(v){
  if(!window._sbBogen)return;
  window._sbBogen.pos=window._sbBogen.pos===v?"":v;
  document.querySelectorAll("#sb-pos .sb-chip").forEach(b=>{ const an=b.dataset.pos===window._sbBogen.pos; b.setAttribute("aria-pressed",an); b.textContent=(SB_POSITIONEN.find(x=>x[0]===b.dataset.pos)||[,""])[1]+(an?" ✓":""); });
  sbFortschritt();
}
function sbFortschritt(){
  const el=document.getElementById("sb-fortschritt"); if(!el)return;
  const n=(window._sbBogen&&window._sbBogen.pos?1:0)+SB_PLATZ.concat(SB_NEBEN).filter(e=>String(document.getElementById(sbFeldId(e))?.value||"").trim()).length;
  el.textContent=`Kernfragen ${n} von 12`+(n===12?" ✓":"");
}
async function sbFotosRender(sid){
  const box=document.getElementById("sb-fotos-"+Number(sid)); if(!box)return;
  const liste=(await kindAlbumLaden(sid))||[];
  if(!document.getElementById("sb-fotos-"+Number(sid)))return;
  box.innerHTML=SB_FOTOS.map(([z,emo,l])=>{ const f=liste.find(x=>x.zweck===z);
    return f?`<div class="sb-foto voll"><div class="sb-bild" data-pfad="${esc(f.pfad)}"></div><span>${emo} ${l} ✓</span></div>`
      :`<label class="sb-foto"><input type="file" accept="image/*" onchange="sbFotoHochladen(${Number(sid)},'${z}',this)" style="position:absolute;opacity:0;width:1px;height:1px"><span style="font-size:var(--s-teil)">${emo}</span><span>${l}</span><span class="sb-plus">+ Foto</span></label>`; }).join("");
  box.querySelectorAll(".sb-bild").forEach(el=>{ if(typeof fotoLoadImage!=="function")return;
    fotoLoadImage(el.dataset.pfad).then(img=>{ if(!img)return; img.alt=""; img.style.cssText="width:100%;height:100%;object-fit:cover"; el.appendChild(img); }).catch(()=>{}); });
}
async function sbFotoHochladen(sid,zweck,input){
  await kindAlbumHochladen(sid,input,zweck);
  sbFotosRender(sid);
}
/* Karte oben auf der Eltern-Startseite: bleibt, bis Kern und drei Foto-Kacheln da sind; „Später“ eine Woche. */
async function steckbriefKarte(kids){
  const slot=document.getElementById("steckbrief-slot"); if(!slot)return;
  const ids=(kids||[]).map(k=>Number(k.spieler_id)).filter(Boolean); if(!ids.length){slot.innerHTML="";return;}
  let ff=[], fotos=[];
  try{ const [a,b]=await Promise.all([fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=in.(${ids.join(",")})&select=*`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/kind_foto?spieler_id=in.(${ids.join(",")})&select=spieler_id,zweck`,{headers:sbAuthHeaders()})]);
    if(a.ok)ff=await a.json(); if(b.ok)fotos=await b.json(); }catch(e){ slot.innerHTML=""; return; }
  const jetzt=Date.now();
  slot.innerHTML=ids.map(sid=>{
    let spaeter=0; try{ spaeter=Number(localStorage.getItem("adler_steckbrief_spaeter_"+sid))||0; }catch(e){}
    const f=(ff||[]).find(x=>Number(x.spieler_id)===sid)||{}, fo=(fotos||[]).filter(x=>Number(x.spieler_id)===sid);
    const n=sbKernZahl(f), nf=sbFotoZahl(fo);
    if((n>=12&&nf>=3)||spaeter>jetzt)return "";
    const k=(kids||[]).find(x=>Number(x.spieler_id)===sid), vn=((k&&k.kader&&k.kader.name)||"eurem Kind").split(" ")[0];
    const anteil=Math.round(((n/12)*0.7+(Math.min(nf,3)/3)*0.3)*100);
    return `<div class="sb-karte" role="region" aria-label="Steckbrief">
      <div class="sb-karte-titel">📸 Erzählt uns von ${esc(vn)}</div>
      <div class="sb-karte-text">Ein paar Fotos und Antworten – damit wir euer Kind noch besser kennenlernen. Alles bleibt in der Adler-App.</div>
      <div class="sb-karte-fort"><div class="sb-balken" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${anteil}" aria-label="Steckbrief ${anteil} Prozent"><i style="width:${anteil}%"></i></div><span>${n} von 12 · ${nf} von 4 Fotos</span></div>
      <button type="button" class="btn sb-karte-los" onclick="elternFanfactsOpen(${sid},'${esc(vn).replace(/'/g,"")}')">${n?"Weiter ergänzen":"Jetzt ausfüllen"} (2 Minuten)</button>
      <button type="button" class="btn btn-link sb-karte-spaeter" onclick="steckbriefSpaeter(${sid})">Später</button></div>`;
  }).join("");
}
function steckbriefSpaeter(sid){
  try{ localStorage.setItem("adler_steckbrief_spaeter_"+Number(sid),String(Date.now()+7*864e5)); }catch(e){}
  if(typeof steckbriefKarte==="function")steckbriefKarte(window._elternKids||[]);
}
/* Trainer: wer wie weit ist, und eine Erinnerung an die offenen Familien (Adler-Rufe, privater Raum). */
async function steckbriefUebersichtOpen(){
  let kader=[], ff=[], fotos=[];
  try{ const [a,b,c]=await Promise.all([fetch(`${SB_URL}/rest/v1/kader?select=id,name,nr,aktiv&order=name`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/kind_fanfacts?select=*`,{headers:sbAuthHeaders()}),fetch(`${SB_URL}/rest/v1/kind_foto?select=spieler_id,zweck`,{headers:sbAuthHeaders()})]);
    if(a.ok)kader=await a.json(); if(b.ok)ff=await b.json(); if(c.ok)fotos=await c.json(); }catch(e){}
  const zeilen=(kader||[]).filter(k=>k.aktiv!==false).map(k=>{ const f=(ff||[]).find(x=>Number(x.spieler_id)===Number(k.id))||{};
    return { id:k.id, name:k.name, n:sbKernZahl(f), nf:sbFotoZahl((fotos||[]).filter(x=>Number(x.spieler_id)===Number(k.id))),
      extra:SB_FREUNDE.concat(SB_KREATIV).filter(e=>String(f[e[0]]||"").trim()).length }; })
    .sort((a,b)=>(a.n+a.nf)-(b.n+b.nf)||a.name.localeCompare(b.name,"de"));
  window._sbOffen=zeilen.filter(z=>z.n<12||z.nf<3).map(z=>z.id);
  const { karte }=fensterAuf("sb-uebersicht",{breite:520,aussen:true});
  karte.innerHTML=`${mdlHead("sb-uebersicht","📖","Steckbriefe",`${zeilen.filter(z=>z.n>0||z.nf>0).length} von ${zeilen.length} Kindern mit Angaben`,"#6d28d9")}
    <table class="sb-tab"><thead><tr><th>Kind</th><th>Kern</th><th>Fotos</th><th>Extra</th></tr></thead><tbody>
    ${zeilen.map(z=>`<tr><td>${esc(z.name)}</td><td class="${z.n>=12?"sb-ok":"sb-of"}">${z.n}/12</td><td class="${z.nf>=3?"sb-ok":"sb-of"}">${z.nf}/4</td><td>${z.extra}</td></tr>`).join("")}</tbody></table>
    <button type="button" class="btn btn-p" onclick="steckbriefErinnern()" style="width:100%;min-height:56px;margin-top:12px;justify-content:center"${window._sbOffen.length?"":" disabled"}>🔔 Erinnerung an ${window._sbOffen.length} offene Familie${window._sbOffen.length===1?"":"n"}</button>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">Geht als Nachricht in den privaten Raum der Familie in den Adler-Rufen.</div>`;
}
async function steckbriefErinnern(){
  const ids=window._sbOffen||[]; if(!ids.length)return;
  if(typeof frageJaNein==="function"&&!await frageJaNein({emoji:"🔔",titel:"Erinnerung senden?",text:`${ids.length} Familie${ids.length===1?"":"n"} bekommen eine kurze Nachricht in den Adler-Rufen.`,ja:"Senden",nein:"Abbrechen"}))return;
  const text="📸 Erzählt uns von eurem Kind! Im Steckbrief in der Adler-App fehlen noch ein paar Antworten oder Fotos – zwei Minuten reichen. "+SB_DATENSCHUTZ;
  let ok=0, ohne=0;
  for(const sid of ids){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/rufe_privat_raum`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_kind:Number(sid)})});
      if(!r.ok){ ohne++; continue; }
      const raum=await r.json();
      const w=await fetch(`${SB_URL}/rest/v1/rufe_nachricht`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify({raum_id:raum,text})});
      if(w.ok)ok++; else ohne++;
    }catch(e){ ohne++; }
  }
  toast(ok?`✉️ An ${ok} Familie${ok===1?"":"n"} geschickt${ohne?` · ${ohne} ohne Eltern-Zugang`:""}`:"Nicht gesendet – keine Familie mit Eltern-Zugang",ok?undefined:"err");
}
/* v544 – Was das Kind vom Verein hat, zum Nachlesen.

   Kein Eingabefeld: Was ausgegeben wurde, entscheidet der Verein, und die Größe
   entsteht beim Anprobieren am Platz. Die Leseregel der Datenbank lässt genau die
   Zeilen des eigenen Kindes durch, sonst nichts.

   Bewusst NICHT auf der Sammelkarte und nicht im Adler Nest: die Kleidergröße eines
   Kindes ist nichts, was andere Familien oder Gäste sehen müssen. Hier, bei den
   eigenen Eltern, ist sie eine Auskunft — dort wäre sie eine Preisgabe. */
async function elternAusstattungLesen(spielerId){
  let zeilen=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ausstattung_ausgabe?spieler_id=eq.${spielerId}&ausgegeben_am=not.is.null&zurueck_am=is.null&select=groesse,nummer,ausgegeben_am,ausstattung_artikel(name)`,{headers:sbAuthHeaders()});
    if(r.ok)zeilen=(await r.json())||[];
  }catch(e){}
  if(!zeilen.length)return "";
  const datum=d=>{try{return new Date(d+"T00:00:00").toLocaleDateString("de-DE");}catch(e){return d;}};
  return `<div style="background:var(--surface2);border:var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px">
    <div style="font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-bottom:5px">👕 Vom Verein erhalten</div>
    ${zeilen.map(z=>`<div style="font-size:var(--s-text);color:var(--text);line-height:1.6">${esc((z.ausstattung_artikel&&z.ausstattung_artikel.name)||"Ausstattung")}${z.groesse?` · Größe ${esc(z.groesse)}`:""}${z.nummer?` · Nr. ${esc(z.nummer)}`:""}${z.ausgegeben_am?` <span style="color:var(--text3)">seit ${datum(z.ausgegeben_am)}</span>`:""}</div>`).join("")}
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:5px">Stimmt etwas nicht? Sag dem Trainerteam Bescheid – geändert wird es dort.</div>
  </div>`;
}
async function elternFanfactsSave(spielerId){
  const body={spieler_id:spielerId,
    spitzname:(document.getElementById("ff-spitz")?.value||"").trim()||null,
    lieblingsverein:(document.getElementById("ff-verein")?.value||"").trim()||null,
    lieblingsspieler:(document.getElementById("ff-spieler")?.value||"").trim()||null,
    schuh_groesse:(document.getElementById("ff-schuh")?.value||"").trim()||null,
    gallery_optin:!!(document.getElementById("ff-gallery")&&document.getElementById("ff-gallery").checked),
    updated_at:new Date().toISOString()};
  const portraet={};
  FF_PORTRAET.concat(FF_STECKBRIEF).forEach(([k])=>{ const el=document.getElementById("ff-"+k); if(el)portraet[k]=(el.value||"").trim().slice(0,120)||null; });
  /* v922: Steckbrief – Kern, Freundebuch, Kreativ; Lieblingsposition aus den Chips */
  SB_PLATZ.concat(SB_NEBEN,SB_FREUNDE,SB_KREATIV).forEach(e=>{ if(e[3])return; const el=document.getElementById("ff-"+e[0]); if(el)portraet[e[0]]=(el.value||"").trim().slice(0,120)||null; });
  if(window._sbBogen&&Number(window._sbBogen.sid)===Number(spielerId))portraet.lieblingsposition=window._sbBogen.pos||null;
  const fuss=document.getElementById("ff-starker_fuss"); if(fuss)portraet.starker_fuss=fuss.value||null;   // v733
  const senden=b=>fetch(`${SB_URL}/rest/v1/kind_fanfacts?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(b)});
  try{
    let r=await senden({...body,...portraet});
    /* v732: Solange die neuen Spalten in der Datenbank fehlen (Migration noch nicht eingespielt), lehnt
       PostgREST den ganzen Datensatz ab. Dann wenigstens die bisherigen Felder speichern. */
    let teil=false;
    if(!r.ok&&r.status===400&&Object.keys(portraet).length){ r=await senden(body); teil=r.ok; }
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    if(teil){toast("Gespeichert – die Porträt-Felder lassen sich in Kürze ausfüllen");document.getElementById("fanfacts-modal")?.remove();return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Steckbrief gespeichert ✓");
  document.getElementById("fanfacts-modal")?.remove();
  if(typeof steckbriefKarte==="function"&&document.getElementById("steckbrief-slot"))steckbriefKarte(window._elternKids||[]);
}
/* ── v743 (PO 04.10., Kachel „So bauen“): Fotoalbum je Kind ─────────────────────────────────────────────
   Bis zu 6 Fotos mit Zweck; eines davon ist das Kartenfoto. Eltern (Fan-Fakten) und Trainer (Kinderprofil) pflegen
   es mit denselben Funktionen. Dateien: spielerfotos/<id>/album/<name>.jpg, nicht quadratisch, längste Seite 1600 px.
   Wer was sieht, regelt die Datenbank (kind_foto): andere Familien nur das Kartenfoto und nur mit Freigabe. */
const KIND_ALBUM_MAX=6;
const KIND_ALBUM_ZWECK=[["portraet","Porträt"],["aktion","Beim Fußball"],["sport","Beim Sport"],["alltag","Aus dem Alltag"],["gemalt","Selbst gemalt"],["jubel","Jubel"],["team","Mit dem Team"],["frei","Frei"]];   // v922: Steckbrief-Kacheln
const _kindAlbum={};
async function kindAlbumLaden(sid){
  try{ const r=await fetch(`${SB_URL}/rest/v1/kind_foto?spieler_id=eq.${Number(sid)}&select=id,pfad,zweck,karte,created_at&order=created_at.asc`,{headers:sbAuthHeaders()});
    return r.ok?await r.json():null; }catch(e){ return null; }
}
async function kindAlbumRender(sid,boxId,wer){
  const box=document.getElementById(boxId); if(!box)return;
  _kindAlbum[sid]={box:boxId,wer:wer||"eltern"};
  const liste=await kindAlbumLaden(sid);
  if(!document.getElementById(boxId))return;
  if(!Array.isArray(liste)){ box.innerHTML=`<span style="font-size:var(--s-klein);color:var(--text2)">Das Fotoalbum lässt sich gerade nicht laden.</span>`; return; }
  _kindAlbum[sid].liste=liste;
  const knopf="min-height:44px;min-width:44px;border:1px solid var(--rand-bedien,#94a3b8);border-radius:10px;background:var(--surface,#fff);color:var(--text,#0f172a);font-family:inherit;font-size:var(--s-klein);cursor:pointer;padding:4px 8px";
  box.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
    ${liste.map(f=>`<div class="ka-foto" data-id="${Number(f.id)}" style="border:${f.karte?"3px solid #1e3a8a":"1px solid var(--surface2,#e2e8f0)"};border-radius:12px;overflow:hidden;background:var(--surface2,#f1f5f9)">
      <div class="ka-bild" data-pfad="${esc(f.pfad)}" style="aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;color:var(--text3,#64748b);font-size:var(--s-klein)">Lädt …</div>
      <div style="padding:6px;display:flex;flex-direction:column;gap:6px">
        <select aria-label="Zweck des Fotos" onchange="kindAlbumZweck(${Number(sid)},${Number(f.id)},this.value)" style="${knopf};width:100%">${KIND_ALBUM_ZWECK.map(([v,l])=>`<option value="${v}"${f.zweck===v?" selected":""}>${l}</option>`).join("")}</select>
        <div style="display:flex;gap:6px">
          <button type="button" class="ka-karte btn btn-sm" aria-pressed="${!!f.karte}" onclick="kindAlbumKarte(${Number(sid)},${f.karte?"null":Number(f.id)})" style="min-height:44px;justify-content:center;font-size:var(--s-klein);flex:1${f.karte?";background:var(--blue-bg);border:2px solid var(--blue);font-weight:800":""}">${f.karte?"⭐ Kartenfoto":"☆ Als Kartenfoto"}</button>
          <button type="button" class="ka-weg btn btn-sm btn-d" aria-label="Foto löschen" onclick="kindAlbumLoeschen(${Number(sid)},${Number(f.id)})" style="min-height:44px;min-width:44px;justify-content:center">🗑️</button>
        </div>
      </div></div>`).join("")}
    ${liste.length<KIND_ALBUM_MAX?`<label class="ka-neu" style="${knopf};aspect-ratio:4/5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-style:dashed;text-align:center"><span style="font-size:var(--s-seite)" aria-hidden="true">＋</span>Foto hinzufügen<span style="font-size:var(--s-klein);color:var(--text3,#64748b)">${liste.length} von ${KIND_ALBUM_MAX}</span><input type="file" accept="image/jpeg,image/png,image/webp" onchange="kindAlbumHochladen(${Number(sid)},this)" style="display:none"></label>`:""}
  </div>
  <div style="font-size:var(--s-klein);color:var(--text2,#475569);margin-top:6px;line-height:1.45">${liste.some(f=>f.karte)?"Das Kartenfoto steht auf der Spielerkarte":"Ohne Kartenfoto steht das bisherige Profilfoto auf der Karte"}. Andere Familien sehen nur das Kartenfoto – und nur mit der Freigabe „Team intern“. Nie öffentlich, nie im Adler Nest.</div>`;
  box.querySelectorAll(".ka-bild").forEach(el=>{
    if(typeof fotoLoadImage!=="function")return;
    fotoLoadImage(el.dataset.pfad).then(img=>{ if(!img){ el.textContent="Kein Bild"; return; } img.alt="Foto"; img.style.cssText="width:100%;height:100%;object-fit:cover"; el.textContent=""; el.appendChild(img); }).catch(()=>{ el.textContent="Kein Bild"; });
  });
}
function kindAlbumNeu(sid){ const a=_kindAlbum[sid]; if(a)kindAlbumRender(sid,a.box,a.wer); }
/* Längste Seite höchstens 1600 px, kein Zuschnitt */
async function kindAlbumVerkleinern(file,max){
  const img=await fotoLoadFromFile(file);
  const w=img.width||img.naturalWidth, h=img.height||img.naturalHeight, f=Math.min(1,(max||1600)/Math.max(w,h));
  const cv=document.createElement("canvas"); cv.width=Math.round(w*f); cv.height=Math.round(h*f);
  cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
  return await new Promise(r=>cv.toBlob(r,"image/jpeg",0.85));
}
async function kindAlbumHochladen(sid,input,zweckVorgabe){   // v922: Zweck aus der Steckbrief-Kachel
  const file=input.files&&input.files[0]; if(!file)return;
  const a=_kindAlbum[sid]; if(a&&a.liste&&a.liste.length>=KIND_ALBUM_MAX){ toast("Es sind schon 6 Fotos im Album – erst eines löschen.","err"); return; }
  input.disabled=true;
  const pfad=Number(sid)+"/album/"+String((crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()).replace(/[^A-Za-z0-9_-]/g,"")+".jpg";
  try{
    const blob=await kindAlbumVerkleinern(file,1600);
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${pfad}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){ toast("Das Foto ließ sich nicht hochladen – bitte noch einmal.","err"); return; }
    const zweck=zweckVorgabe||((a&&a.liste&&a.liste.length)?"frei":"portraet");
    const r=await fetch(`${SB_URL}/rest/v1/kind_foto`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({spieler_id:Number(sid),pfad,zweck})});
    if(!r.ok){
      try{ await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${pfad}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}}); }catch(e){}
      toast(/6/.test(await r.text().catch(()=>""))?"Es sind schon 6 Fotos im Album.":"Das Foto ließ sich nicht ins Album legen.","err"); return;
    }
    toast("Foto im Album ✓");
  }catch(e){ toast("Das Foto ließ sich nicht verarbeiten – ein anderes Format probieren.","err"); }
  finally{ input.disabled=false; }
  kindAlbumNeu(sid);
}
async function kindAlbumZweck(sid,id,zweck){
  try{ const r=await fetch(`${SB_URL}/rest/v1/kind_foto?id=eq.${Number(id)}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({zweck})});
    if(!r.ok){ toast("Zweck nicht gespeichert","err"); kindAlbumNeu(sid); } }catch(e){ toast("Kein Netz","err"); }
}
async function kindAlbumKarte(sid,id){
  try{ const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_foto_als_karte`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:Number(sid),p_id:id==null?null:Number(id)})});
    toast(r.ok?(id==null?"Kein Kartenfoto mehr – die Karte zeigt das Profilfoto":"Kartenfoto gesetzt ⭐"):"Kartenfoto nicht gespeichert",r.ok?undefined:"err");
  }catch(e){ toast("Kein Netz","err"); }
  kindAlbumNeu(sid);
}
async function kindAlbumLoeschen(sid,id){
  const a=_kindAlbum[sid]; const f=a&&a.liste&&a.liste.find(x=>Number(x.id)===Number(id)); if(!f)return;
  if(typeof frageJaNein==="function"&&!await frageJaNein({emoji:"🗑️",ton:"rot",titel:"Foto löschen?",text:f.karte?"Das ist das Kartenfoto. Danach zeigt die Karte wieder das Profilfoto.":"Das Foto verschwindet aus dem Album.",ja:"Löschen",nein:"Behalten"}))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_foto?id=eq.${Number(id)}`,{method:"DELETE",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'}});
    if(!r.ok){ toast("Foto nicht gelöscht","err"); return; }
    await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${f.pfad}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}}).catch(()=>{});
    toast("Foto gelöscht");
  }catch(e){ toast("Kein Netz","err"); }
  kindAlbumNeu(sid);
}
async function elternFotoUpload(spielerId,input){
  const file=input.files&&input.files[0]; if(!file)return;
  input.disabled=true;
  try{
    const blob=await fotoCompress(file);
    const path=spielerId+"/"+((crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now())+".jpg";
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:spielerId,foto_path:path,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Foto gespeichert, Verknüpfung fehlgeschlagen","err");return;}
    toast("Profilbild aktualisiert ✓");
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{input.disabled=false;}
}
