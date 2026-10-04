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
async function elternFanfactsOpen(spielerId,kindName){
  document.getElementById("fanfacts-modal")?.remove();
  let f={};
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)f=(await r.json())[0]||{};}catch(e){}
  const ausgabe=await elternAusstattungLesen(spielerId);
  const half="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text)";
  const inp="width:100%;padding:9px;margin:4px 0 10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:var(--s-text)";
  const m=document.createElement("div");m.id="fanfacts-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;max-width:400px;width:100%;margin:auto">
    ${mdlHead("fanfacts-modal","✏️",`${esc(kindName||"Kind")} – Fan-Fakten`,"","#475569")}
    <div style="font-size:var(--s-klein);color:#64748b;margin-bottom:12px">Diese Fan-Fakten pflegst du selbst – die sportliche Bewertung bleibt beim Trainer.</div>
    ${ausgabe}
    <label style="font-size:var(--s-text);color:#475569">Profilbild</label>
    <div style="display:flex;align-items:center;gap:8px;margin:4px 0 12px">
      <input type="file" accept="image/jpeg,image/png,image/webp" onchange="elternFotoUpload(${spielerId},this)" style="font-size:var(--s-klein);flex:1">
      ${f.foto_path?'<span style="font-size:var(--s-klein);color:#059669">✓ vorhanden</span>':''}
    </div>
    <div style="font-size:var(--s-text);color:#475569">Fotoalbum <span style="font-size:var(--s-klein);color:#64748b">· bis 6 Fotos für die Spielerkarten</span></div>
    <div id="ka-box-${spielerId}" class="ka-box" style="margin:4px 0 12px"><span style="font-size:var(--s-klein);color:#64748b">Lädt …</span></div>
    <label for="ff-spitz" style="font-size:var(--s-text);color:#475569">Spitzname</label>
    <input id="ff-spitz" value="${esc(f.spitzname||'')}" placeholder="z. B. Mimi" style="${inp}">
    <label for="ff-verein" style="font-size:var(--s-text);color:#475569">Lieblingsverein</label>
    <input id="ff-verein" value="${esc(f.lieblingsverein||'')}" placeholder="z. B. 1. FC Köln" style="${inp}">
    <label for="ff-spieler" style="font-size:var(--s-text);color:#475569">Lieblingsspieler</label>
    <input id="ff-spieler" value="${esc(f.lieblingsspieler||'')}" placeholder="z. B. Musiala" style="${inp}">
    <!-- v544: Die Trikot-Größe ist hier verschwunden. Sie stand zugleich im Kader und
         in den Fan-Fakten, also zweimal – und was ausgegeben wurde, weiß der Verein,
         nicht die Familie. Sie wird jetzt beim Anprobieren erfasst („Ausstattung" beim
         Trainer). Die Schuh-Größe bleibt: die steht nirgends sonst. -->
    <details style="margin:4px 0 12px;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px" ${FF_PORTRAET.concat(FF_STECKBRIEF).some(([k])=>f[k])||f.starker_fuss?"open":""}>
      <summary style="cursor:pointer;font-size:var(--s-text);font-weight:800;color:#1e3a8a;min-height:32px;display:flex;align-items:center">🦅 Fürs „Adler im Porträt“ (freiwillig)</summary>
      <div style="font-size:var(--s-klein);color:#64748b;margin:6px 0 8px;line-height:1.5">Reihum stellt das Adler Nest jede Woche ein Kind vor. Aus diesen Angaben und den Antworten im Kabinen-Reporter entsteht ein kurzer Text, den das Trainerteam vor dem Druck liest. Das Heft lesen nur angemeldete Team-Familien in der App; trotzdem steht dort nur der Vorname und nichts, woran man euch findet. Der Grund für die Rückennummer bleibt beim Trainerteam und kommt nicht ins Heft. Leer lassen ist völlig in Ordnung.</div>
      <label for="ff-starker_fuss" style="font-size:var(--s-text);color:#475569">Starker Fuß</label>
      <select id="ff-starker_fuss" style="${inp};min-height:44px;background:#fff">
        ${[["","– bitte wählen –"],["rechts","rechts"],["links","links"],["beide","beide"]].map(([v,l])=>`<option value="${v}"${(f.starker_fuss||"")===v?" selected":""}>${l}</option>`).join("")}
      </select>
      ${FF_STECKBRIEF.map(([k,l,ph])=>`<label for="ff-${k}" style="font-size:var(--s-text);color:#475569">${l}</label>
      <input id="ff-${k}" maxlength="80" value="${esc(f[k]||'')}" placeholder="${esc(ph)}" style="${inp}">`).join("")}
      ${FF_PORTRAET.map(([k,l,ph])=>`<label for="ff-${k}" style="font-size:var(--s-text);color:#475569">${l}</label>
      <input id="ff-${k}" maxlength="80" value="${esc(f[k]||'')}" placeholder="${esc(ph)}" style="${inp}">`).join("")}
    </details>
    <div style="font-size:var(--s-klein);font-weight:700;color:#475569;margin:6px 0 4px">👟 Schuh-Größe <span style="font-weight:400;color:var(--text3)">(hilft dem Trainer bei Sammelbestellungen)</span></div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1"><input id="ff-schuh" value="${esc(f.schuh_groesse||'')}" placeholder="z. B. 31" aria-label="Schuh-Größe" style="${half}"></div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:var(--s-text);color:#475569;margin:6px 0 14px">
      <input id="ff-gallery" type="checkbox" ${f.gallery_optin?"checked":""}> Foto in der Team-Galerie zeigen (Opt-in)
    </label>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="document.getElementById('fanfacts-modal').remove()" style="border:none;background:none;color:#64748b;font-size:var(--s-text);cursor:pointer">Schließen</button>
      <button onclick="elternFanfactsSave(${spielerId})" style="border:none;border-radius:8px;background:#1e3a8a;color:#fff;padding:9px 16px;font-weight:700;font-size:var(--s-text);cursor:pointer">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  kindAlbumRender(spielerId,"ka-box-"+spielerId,"eltern");
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
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:12px">
    <div style="font-size:var(--s-klein);font-weight:700;color:#475569;margin-bottom:5px">👕 Vom Verein erhalten</div>
    ${zeilen.map(z=>`<div style="font-size:var(--s-text);color:#334155;line-height:1.6">${esc((z.ausstattung_artikel&&z.ausstattung_artikel.name)||"Ausstattung")}${z.groesse?` · Größe ${esc(z.groesse)}`:""}${z.nummer?` · Nr. ${esc(z.nummer)}`:""}${z.ausgegeben_am?` <span style="color:var(--text3)">seit ${datum(z.ausgegeben_am)}</span>`:""}</div>`).join("")}
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
  FF_PORTRAET.concat(FF_STECKBRIEF).forEach(([k])=>{ const el=document.getElementById("ff-"+k); if(el)portraet[k]=(el.value||"").trim().slice(0,80)||null; });
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
  toast("Fan-Fakten gespeichert ✓");
  document.getElementById("fanfacts-modal")?.remove();
}
/* ── v743 (PO 04.10., Kachel „So bauen“): Fotoalbum je Kind ─────────────────────────────────────────────
   Bis zu 6 Fotos mit Zweck; eines davon ist das Kartenfoto. Eltern (Fan-Fakten) und Trainer (Kinderprofil) pflegen
   es mit denselben Funktionen. Dateien: spielerfotos/<id>/album/<name>.jpg, nicht quadratisch, längste Seite 1600 px.
   Wer was sieht, regelt die Datenbank (kind_foto): andere Familien nur das Kartenfoto und nur mit Freigabe. */
const KIND_ALBUM_MAX=6;
const KIND_ALBUM_ZWECK=[["portraet","Porträt"],["aktion","Aktion"],["jubel","Jubel"],["team","Mit dem Team"],["frei","Frei"]];
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
          <button type="button" class="ka-karte" aria-pressed="${!!f.karte}" onclick="kindAlbumKarte(${Number(sid)},${f.karte?"null":Number(f.id)})" style="${knopf};flex:1;${f.karte?"background:#1e3a8a;color:#fff;border-color:#1e3a8a;font-weight:800":""}">${f.karte?"⭐ Kartenfoto":"☆ Als Kartenfoto"}</button>
          <button type="button" class="ka-weg" aria-label="Foto löschen" onclick="kindAlbumLoeschen(${Number(sid)},${Number(f.id)})" style="${knopf}">🗑️</button>
        </div>
      </div></div>`).join("")}
    ${liste.length<KIND_ALBUM_MAX?`<label class="ka-neu" style="${knopf};aspect-ratio:4/5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-style:dashed;text-align:center"><span style="font-size:28px" aria-hidden="true">＋</span>Foto hinzufügen<span style="font-size:11px;color:var(--text3,#64748b)">${liste.length} von ${KIND_ALBUM_MAX}</span><input type="file" accept="image/jpeg,image/png,image/webp" onchange="kindAlbumHochladen(${Number(sid)},this)" style="display:none"></label>`:""}
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
async function kindAlbumHochladen(sid,input){
  const file=input.files&&input.files[0]; if(!file)return;
  const a=_kindAlbum[sid]; if(a&&a.liste&&a.liste.length>=KIND_ALBUM_MAX){ toast("Es sind schon 6 Fotos im Album – erst eines löschen.","err"); return; }
  input.disabled=true;
  const pfad=Number(sid)+"/album/"+String((crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()).replace(/[^A-Za-z0-9_-]/g,"")+".jpg";
  try{
    const blob=await kindAlbumVerkleinern(file,1600);
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${pfad}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){ toast("Das Foto ließ sich nicht hochladen – bitte noch einmal.","err"); return; }
    const zweck=(a&&a.liste&&a.liste.length)?"frei":"portraet";
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
