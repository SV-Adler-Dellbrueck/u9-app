/* ═══════════════════════════════════
   KI-TRAININGS-ASSISTENT (Welle 3, FEAT AC) – "Adler-Coach".
   Ruft die Edge Function ki-uebung (Auth-Zwang: nur Trainer; Rate-Limit
   20/Tag; LLM-Key nur serverseitig; erzwungenes JSON-Schema). Client:
   AbortController-Timeout (die UI haengt nie), robuste Fehleranzeige,
   Trainer-in-the-Loop – Uebungen werden nur auf Klick in der Taktik-
   Bibliothek gespeichert (taktik_templates mit data.typ="ki").
═══════════════════════════════════ */
let kiLastUebungen=[];
function kiCoachOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("ki-modal")?.remove();
  const m=document.createElement("div");m.id="ki-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m){kiDiktatStop();m.remove();}};   // v596: nicht weiterlauschen
  const chip=t=>`<button onclick="document.getElementById('ki-prompt').value='${t.replace(/'/g,"")}'" style="border:1px solid var(--rand-bedien);background:var(--surface);border-radius:14px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit">${t}</button>`;
  const feld="width:100%;min-height:44px;padding:6px 8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:12.5px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("ki-modal","🤖","Adler-Coach (KI)","Übungen vorschlagen oder fremden Text übernehmen","#7c3aed")}
    <div id="ki-modus" role="tablist" aria-label="Wie der Coach arbeiten soll" style="display:flex;gap:6px;margin-bottom:10px">
      <button data-modus="idee" role="tab" aria-controls="ki-block-idee" onclick="kiSetModus('idee')" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">💡 Idee beschreiben</button>
      <button data-modus="text" role="tab" aria-controls="ki-block-text" onclick="kiSetModus('text')" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">📋 Text übernehmen</button>
    </div>
    <div id="ki-hinweis" style="font-size:11px;color:var(--text2);margin-bottom:10px"></div>
    <div id="ki-kontext"></div>
    <div id="ki-block-idee" role="tabpanel" aria-label="Idee beschreiben">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <label style="font-size:10.5px;color:var(--text2)">Schwerpunkt<select id="ki-kat" style="${feld}">${KI_KATS.map(([k,n])=>`<option value="${k}">${n}</option>`).join("")}</select></label>
        <label style="font-size:10.5px;color:var(--text2)">Dauer<select id="ki-dauer" style="${feld}">${KI_DAUER.map((d,i)=>`<option${i===1?" selected":""}>${d}</option>`).join("")}</select></label>
        <label style="font-size:10.5px;color:var(--text2)">Wo<select id="ki-ort" style="${feld}">${KI_ORTE.map(o=>`<option>${o}</option>`).join("")}</select></label>
        <label style="font-size:10.5px;color:var(--text2)">Material<select id="ki-material" style="${feld}">${KI_MATERIAL.map(m=>`<option>${m}</option>`).join("")}</select></label>
      </div>
      <textarea id="ki-prompt" rows="2" placeholder="Optional: was dir wichtig ist – z. B. „viele Ballkontakte, die Schnellen sollen nicht dominieren“" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px"></textarea>
      ${kiDiktatMoeglich()?`<button type="button" id="ki-mic" onclick="kiDiktat()" style="width:100%;min-height:44px;margin-top:6px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text2);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">🎙️ Diktieren</button>`:""}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${chip("Dribbling & Ballführung")}${chip("Passspiel in der Raute")}${chip("Torschuss mit Spaß")}${chip("Zweikampf & Mut")}</div>
    </div>
    <div id="ki-block-text" role="tabpanel" aria-label="Text übernehmen" style="display:none">
      <textarea id="ki-text" rows="8" placeholder="Übungsbeschreibung hier einfügen – von einer Webseite, aus WhatsApp, aus einem Buch oder aus der Beschreibung unter einem Video." style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:13px"></textarea>
      <div style="font-size:10.5px;color:var(--text3);margin:4px 0 8px">Der Coach ordnet den Text in Aufbau, Ablauf, Varianten und Coaching-Punkte und zeichnet die Skizze dazu. Er erfindet nichts hinzu – was nicht dasteht, bleibt leer.</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button id="ki-gen-btn" class="btn btn-p btn-sm" onclick="kiCoachGenerate()"><i class="ti ti-sparkles"></i><span id="ki-gen-lbl">Übungen vorschlagen</span></button>
      <button id="ki-notiz-btn" class="btn btn-sm" onclick="kiCoachInsertNotes()" title="Deine letzten Trainer-Notizen als Kontext einfügen"><i class="ti ti-notes"></i>📓 Aus meinen Notizen</button>
    </div>
    <div id="ki-result" style="margin-top:12px"></div>
  </div>`;
  document.body.appendChild(m);
  kiSetModus("idee");
  kiKontextLaden();   // füllt die Kontextzeile und belegt Schwerpunkt/Ort vor
}
/* ── Was die App ohnehin weiß, muss niemand tippen (PO v411, Punkt 1) ─────────
   Ein „Prompt-Generator", der aus einem kurzen Satz einen langen macht, müsste Angaben
   ERFINDEN – genau das, was wir im Text-Modus gerade verboten haben. Die meisten
   schlechten Ergebnisse entstehen nicht aus schlechten Formulierungen, sondern aus
   FEHLENDEN Angaben. Also holt die App, was sie hat, statt zu raten:
   Kadergröße, Monats-Schwerpunkt aus der Periodisierung, Platz und Dauer des nächsten
   Trainings. Angezeigt wird das offen über dem Eingabefeld – wer nicht sieht, was
   mitgeschickt wird, kann es auch nicht korrigieren. */
let KI_KONTEXT={};
async function kiKontextLaden(){
  const k={};
  try{ if(typeof KADER!=="undefined"&&Array.isArray(KADER))k.kinder=KADER.filter(x=>x&&x.aktiv!==false).length; }catch(e){}
  const monat=new Date().toISOString().slice(0,7);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${monat}&select=thema,kategorie`,{headers:sbAuthHeaders()});
    if(r.ok){const p=((await r.json())||[])[0]; if(p){k.thema=p.thema||""; k.kategorie=p.kategorie||"";}}
  }catch(e){}
  const heute=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=platz,uhrzeit,uhrzeit_ende&typ=eq.training&datum=gte.${heute}&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const t=((await r.json())||[])[0];
      if(t){
        if(t.platz)k.ort=t.platz;
        const min=(a,b)=>{const p=x=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(x||""));return m?+m[1]*60+ +m[2]:null;};
          const v=p(a),w=p(b);return (v!=null&&w!=null&&w>v)?w-v:null;};
        const d=min(t.uhrzeit,t.uhrzeit_ende); if(d)k.einheit=d;
      }}
  }catch(e){}
  KI_KONTEXT=k;
  const box=document.getElementById("ki-kontext");
  if(box){
    const teile=[];
    if(k.kinder)teile.push(`👥 ${k.kinder} Kinder`);
    if(k.thema)teile.push(`🎯 Schwerpunkt: ${esc(k.thema)}`);
    if(k.ort)teile.push(`🏟️ ${esc(k.ort)}`);
    if(k.einheit)teile.push(`⏱ Einheit ${k.einheit} Min`);
    box.innerHTML=teile.length
      ? `<div style="font-size:10.5px;color:var(--text3);background:var(--surface2);border-radius:8px;padding:7px 9px;margin-bottom:8px;line-height:1.5">Der Coach bekommt das automatisch mit: ${teile.join(" · ")}</div>`
      : "";
  }
  // Schwerpunkt-Auswahl auf das Monatsthema vorbelegen, Ort aus dem nächsten Training
  const sel=document.getElementById("ki-kat");
  if(sel&&k.kategorie&&[...sel.options].some(o=>o.value===k.kategorie))sel.value=k.kategorie;
  const ort=document.getElementById("ki-ort");
  if(ort&&k.ort){
    const p=String(k.ort).toLowerCase();
    ort.value=p.includes("halle")?"Halle":p.includes("käfig")||p.includes("kaefig")?"Käfig":"Platz";
  }
}
/* Punkt 2: fragen statt generieren. Vier Auswahlfelder mit sinnvoller Vorbelegung –
   der Client setzt daraus einen präzisen Satz zusammen. Deterministisch, nichts erfunden. */
const KI_DAUER=["10 Min","15 Min","20 Min","25 Min"];
const KI_ORTE=["Platz","Käfig","Halle"];
const KI_MATERIAL=["nur Hütchen","Hütchen + Minitore","großes Tor mit Torwart"];
function kiWunschSatz(){
  const g=id=>document.getElementById(id)?.value||"";
  const kat=g("ki-kat"), dauer=g("ki-dauer"), ort=g("ki-ort"), mat=g("ki-material");
  const kn=(KI_KATS.find(x=>x[0]===kat)||[])[1]||"";
  const t=[];
  if(kn)t.push("Schwerpunkt: "+kn);
  if(dauer)t.push("Dauer: "+dauer);
  if(ort)t.push("Ort: "+ort);
  if(mat)t.push("Material: "+mat);
  return t.join(" · ");
}
/* ── Diktieren (v596) ────────────────────────────────────────────────────────
   Am Platz tippt niemand gern auf dem Handy, und „beschreibe, was du trainieren
   willst" ist genau die Art Satz, die man schneller spricht (PO am 22.09.).

   Gebaut nach dem Vorbild aus md-skizze.js, und aus denselben drei Gründen:
   · Der Knopf erscheint NUR, wo das Gerät zuhören kann. `SpeechRecognition` gibt es
     nicht überall und ist auf iOS wackelig; ein toter Knopf wäre schlechter als keiner.
   · Verstandenes wird ANGEHÄNGT statt ersetzt – wer nachträgt, verlöre sonst den
     ersten Satz.
   · Ein Fehlschlag sagt es und lässt das Textfeld unberührt.
   Das Textfeld bleibt der Weg, das Mikrofon ist die Zugabe. */
let _kiLauscht=null;
function kiDiktatMoeglich(){ return !!(window.SpeechRecognition||window.webkitSpeechRecognition); }
function kiDiktatStop(){ try{ _kiLauscht&&_kiLauscht.stop(); }catch(e){} _kiLauscht=null; }
function kiDiktat(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const knopf=document.getElementById("ki-mic"), feld=document.getElementById("ki-prompt");
  if(!SR||!feld)return;
  if(_kiLauscht){ kiDiktatStop(); if(knopf)knopf.innerHTML="🎙️ Diktieren"; return; }
  const r=new SR(); r.lang="de-DE"; r.interimResults=false; r.continuous=false;
  r.onresult=e=>{ const t=[...e.results].map(x=>x[0]&&x[0].transcript).filter(Boolean).join(" ").trim();
                  if(t)feld.value=(feld.value?feld.value.trim()+" ":"")+t; };
  r.onerror=()=>{ if(typeof toast==="function")toast("Nichts verstanden – bitte tippen","err"); };
  r.onend=()=>{ _kiLauscht=null; if(knopf)knopf.innerHTML="🎙️ Diktieren"; };
  try{ r.start(); _kiLauscht=r; if(knopf)knopf.innerHTML="⏹️ Aufnahme stoppen"; }
  catch(e){ if(typeof toast==="function")toast("Mikrofon nicht erreichbar","err"); }
}
/* Zwei Eingänge, ein Ergebnisweg (PO v410, Stufe 1): „Idee" erfindet, „Text" ordnet nur.
   Der Unterschied steht auch im System-Prompt der Edge Function – hier nur die Oberfläche. */
let KI_MODUS="idee";
function kiSetModus(m){
  KI_MODUS=(m==="text")?"text":"idee";
  const an=KI_MODUS;
  document.querySelectorAll("#ki-modus button").forEach(b=>{
    const aktiv=b.dataset.modus===an;
    b.style.background=aktiv?"#7c3aed":"var(--surface)";
    b.style.color=aktiv?"#fff":"var(--text2)";
    b.style.borderColor=aktiv?"#7c3aed":"";
    /* v596: Die beiden sind ein Reiterpaar, keine zwei Aktionsknöpfe — „Idee
       beschreiben" ist beim Öffnen schon gewählt, ein Klick darauf ändert deshalb
       nichts, und genau das wirkte wie ein toter Knopf (PO am 22.09.). Mit
       role=tab/aria-selected sagen Hilfstechnik UND Färbung dasselbe. */
    b.setAttribute("aria-selected",aktiv?"true":"false");
  });
  const zeig=(id,ja)=>{const e=document.getElementById(id); if(e)e.style.display=ja?"block":"none";};
  zeig("ki-block-idee",an==="idee");
  zeig("ki-block-text",an==="text");
  const h=document.getElementById("ki-hinweis");
  if(h)h.textContent=an==="text"
    ? "Text einfügen – der Coach macht daraus eine Übung im Format der App, mit Skizze."
    : "Beschreibe, was du trainieren willst – der Coach schlägt altersgerechte U8/U9-Übungen vor, jede mit Skizze. Du entscheidest, was in die Bibliothek kommt. Die vier Felder genügen; der Text darunter ist die Nuance.";
  const l=document.getElementById("ki-gen-lbl"); if(l)l.textContent=an==="text"?"Text übernehmen":"Übungen vorschlagen";
  const nb=document.getElementById("ki-notiz-btn"); if(nb)nb.style.display=an==="text"?"none":"";
  if(an==="text")kiDiktatStop();   // v596: im Text-Modus gibt es das Feld nicht, auf das diktiert würde
}
/* KI-Loop (18.1): der Trainer holt seine letzten Voice-Diary-Notizen als Kontext in den
   Prompt – bewusst per Klick (Trainer-in-the-Loop), nicht serverseitig-automatisch, damit
   der LLM-Key serverseitig bleibt und der Trainer sieht/steuert, was an die KI geht. */
async function kiCoachInsertNotes(){
  let notes=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_notes?select=text,datum&order=created_at.desc&limit=3`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)notes=await r.json();}catch(e){}
  if(!notes.length){toast("Noch keine Trainer-Notizen vorhanden","err");return;}
  const ta=document.getElementById("ki-prompt"); if(!ta)return;
  const ctx="Meine Beobachtungen aus dem letzten Spiel/Training: "+notes.map(n=>n.text.trim()).filter(Boolean).join(" • ")+". Leite daraus passende Übungen ab.";
  ta.value=(ta.value.trim()?ta.value.trim()+"\n\n":"")+ctx;
  ta.focus();
  toast("Notizen eingefügt – ergänze bei Bedarf");
}
async function kiCoachGenerate(){
  const prompt=(document.getElementById("ki-prompt")?.value||"").trim();
  const text=(document.getElementById("ki-text")?.value||"").trim();
  if(KI_MODUS==="text"&&text.length<40){toast("Bitte die ganze Übungsbeschreibung einfügen","err");return;}
  /* v596: Hier stand `!prompt` – geprüft wurde also der FREITEXT, der im Feld
     ausdrücklich „Optional" heißt. Wer nur Schwerpunkt, Dauer, Ort und Material
     einstellte (wozu die vier Felder da sind) und auf „Übungen vorschlagen" drückte,
     bekam „Bitte kurz beschreiben" – eine Abfuhr für ein optionales Feld (PO am 22.09.).
     Gesendet wird ohnehin `promptVoll`, und das trägt den Satz aus den Auswahlfeldern.
     Geprüft wird jetzt das, was wirklich hinausgeht; die Edge Function bleibt unberührt. */
  const out=document.getElementById("ki-result"), btn=document.getElementById("ki-gen-btn");
  if(out)out.innerHTML=`<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">🧠 ${KI_MODUS==="text"?"Adler-Coach liest den Text…":"Adler-Coach denkt nach…"}</div>`;
  if(btn)btn.disabled=true;
  // Ein größeres Modell braucht länger als das alte kleine – 30 s waren dafür zu knapp.
  const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(),60000);
  // Kadergröße mitgeben: „6-12 Spieler" geht sonst an einer Mannschaft mit 15 Kindern vorbei.
  const kinder=(typeof KADER!=="undefined"&&Array.isArray(KADER))?KADER.filter(k=>k&&k.aktiv!==false).length:0;
  // Auswahlfelder (nur im Idee-Modus) vor den Freitext setzen – sie sind die Angabe,
  // der Freitext ist die Nuance.
  const wunsch=KI_MODUS==="idee"?kiWunschSatz():"";
  const promptVoll=[wunsch,prompt].filter(Boolean).join(". ");
  if(KI_MODUS==="idee"&&!promptVoll){toast("Bitte einen Schwerpunkt wählen oder kurz beschreiben","err");return;}
  try{
    const r=await fetch(`${SB_URL}/functions/v1/ki-uebung`,{method:"POST",headers:sbAuthHeaders(),
      body:JSON.stringify({modus:KI_MODUS,prompt:promptVoll,text:KI_MODUS==="text"?text:"",
        kinder, thema:KI_KONTEXT.thema||"", ort:KI_KONTEXT.ort||"", einheit:KI_KONTEXT.einheit||0}),
      signal:ctrl.signal});
    clearTimeout(to);
    const d=await r.json().catch(()=>({}));
    if(!r.ok){ if(out)out.innerHTML=`<div style="color:#dc2626;font-size:13px;padding:10px">${esc(d.error||("Fehler "+r.status))}</div>`; return; }
    kiCoachRender(d.uebungen||[], d.rest);
  }catch(e){
    clearTimeout(to);
    if(out)out.innerHTML=`<div style="color:#dc2626;font-size:13px;padding:10px">${e&&e.name==="AbortError"?"Zeitüberschreitung – bitte nochmal versuchen.":"Netzwerkfehler – bist du online?"}</div>`;
  }finally{ if(btn)btn.disabled=false; }
}
// Kategorien für die Bibliothek (gleiche Keys wie renderTraining/PERIOD_CATS).
const KI_KATS=[["aufwaermen","Aufwärmen"],["raute","Raute & Grundordnung"],["passspiel","Passspiel"],["wahrnehmung","Wahrnehmung & IQ"],["technik","Technik & Ball"],["pressing","Pressing & Umschalten"],["spass","Spaß & Wettbewerb"],["torwart","Torwart"],["individual","Individual"],["mindset","Mindset"]];
function kiCoachRender(uebungen,rest){
  kiLastUebungen=uebungen||[];
  const out=document.getElementById("ki-result"); if(!out)return;
  if(!kiLastUebungen.length){out.innerHTML='<div style="padding:10px;color:var(--text3);font-size:13px">Keine Übungen erhalten – bitte anders formulieren.</div>';return;}
  /* Punkt 3: Rückmeldung statt Vorab-Anleitung. Der Text-Modus lässt Felder bewusst leer,
     wenn die Angabe im Text fehlt. Das sichtbar zu machen ist die bessere Anleitung: man
     lernt genau dann, welche Angaben zählen, wenn es einen interessiert. */
  const fehlt=u=>[["dauer","Dauer"],["spieler","Spieleranzahl"],["feld","Feldgröße"],["material","Material"]]
    .filter(([k])=>!String(u[k]||"").trim()).map(([,n])=>n);
  out.innerHTML=kiLastUebungen.map((u,i)=>`<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
    <div style="font-weight:800;font-size:14px">${esc(u.titel||"Übung")}</div>
    ${(KI_MODUS==="text"&&fehlt(u).length)?`<div style="font-size:11px;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:7px 9px;margin:6px 0;line-height:1.5">⚠️ Stand nicht im Text: <b>${fehlt(u).join(", ")}</b> – ergänze es kurz im Text und übernimm nochmal, oder trag es nach dem Speichern in der Übung nach.</div>`:""}
    <div style="font-size:11px;color:var(--text2);margin:2px 0 6px">${u.dauer?"⏱ "+esc(u.dauer):""}${u.spieler?" · 👥 "+esc(u.spieler):""}${u.feld?" · 📐 "+esc(u.feld):""}${u.material?" · 🎒 "+esc(u.material):""}</div>
    ${(function(){ /* v581: Dieselbe Grenze wie im Skizzen-Editor – geprüft wird, bevor
         gezeichnet wird, auch wenn die Antwort aus der eigenen Edge Function kommt. */
      const sp=(typeof skzSpecSaeubern==="function")?skzSpecSaeubern(u.skizze):u.skizze;
      return (sp&&typeof _skz==="function")?_skz(sp)+(typeof skzLegende==="function"?skzLegende(false,sp):""):""; })()}
    <div style="font-size:12.5px;line-height:1.5;white-space:pre-wrap">${esc(u.beschreibung||"")}</div>
    ${u.variante?`<div style="font-size:11.5px;color:var(--text2);margin-top:5px">➕ ${esc(u.variante)}</div>`:""}
    ${u.coaching?`<div style="font-size:11.5px;color:var(--text2);margin-top:5px">📣 ${esc(u.coaching)}</div>`:""}
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px">
      <label style="font-size:11px;color:var(--text2)">Kategorie:
        <select id="ki-kat-${i}" style="padding:6px 8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:12px;background:var(--surface);color:var(--text)">
          ${KI_KATS.map(([k,l])=>`<option value="${k}"${k===(u.kat||"technik")?" selected":""}>${l}</option>`).join("")}
        </select>
      </label>
      <button class="btn btn-sm btn-p" onclick="kiCoachSaveForm(${i})"><i class="ti ti-clipboard-list"></i>In Bibliothek übernehmen</button>
    </div>
  </div>`).join("")+(rest!=null?`<div style="font-size:10px;color:var(--text3);text-align:center;margin-top:2px">Noch ${esc(rest)} KI-Anfragen heute frei</div>`:"");
}
async function kiCoachSave(i){
  const u=kiLastUebungen[i]; if(!u)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({name:(u.titel||"KI-Übung").slice(0,120),formation:"KI-Übung",data:{typ:"ki",titel:u.titel,dauer:u.dauer,material:u.material,beschreibung:u.beschreibung,variante:u.variante}})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    toast("💾 In Bibliothek gespeichert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
// KI-Übung aus der Bibliothek als Text-Modal ansehen (nicht aufs Board laden)
async function ttViewKi(id){
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${id}&select=name,data`,{headers:sbAuthHeaders()});if(r.ok)row=((await r.json())||[])[0];}catch(e){}
  if(!row||!row.data){toast("Übung nicht gefunden","err");return;}
  const u=row.data;
  document.getElementById("tt-modal")?.remove();
  const m=document.createElement("div");m.id="tt-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:440px;width:100%;margin:auto">
    ${mdlHead("tt-modal","🤖",esc(u.titel||row.name||"Übung"),"","#7c3aed")}
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${u.dauer?"⏱ "+esc(u.dauer):""}${u.material?" · 🎒 "+esc(u.material):""}</div>
    <div style="font-size:13.5px;line-height:1.6;white-space:pre-wrap">${esc(u.beschreibung||"")}</div>
    ${u.variante?`<div style="font-size:12.5px;color:var(--text2);margin-top:8px">➕ <b>Variante:</b> ${esc(u.variante)}</div>`:""}
  </div>`;
  document.body.appendChild(m);
}

// FEAT AC-Folge: KI-Übung als echte Trainingsform speichern (Tabelle trainingsformen,
// gleicher Weg wie saveCustomTraining). Danach ist sie via tpAllForms() in ALLEN
// Planungs-Dropdowns waehlbar (jede Phase, jedes Datum) -> Trainer setzt sie an die
// gewuenschte Stelle. Navigiert direkt in die Planung.
async function kiCoachSaveForm(i){
  const u=kiLastUebungen[i]; if(!u)return;
  const kat=document.getElementById("ki-kat-"+i)?.value||u.kat||"technik"; // vom Trainer gewählte Kategorie
  const ablauf=(u.beschreibung||"")+(u.material?"\n\nMaterial: "+u.material:"")+(u.variante?"\n\nVariante: "+u.variante:"");
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  // Spalten exakt wie in trainingsformen (skizze jsonb = Feld-Skizzen-Spec der KI); tags ist text.
  const form={
    name:(u.titel||"KI-Übung").slice(0,120),
    kat:kat,
    ablauf:ablauf,
    varianten:u.variante||"",
    coaching:(u.coaching||"")+(u.coaching?"\n":"")+"(Vom Adler-Coach (KI) vorgeschlagen)",
    spieler:u.spieler||"", feld:u.feld||"", dauer:u.dauer||"",
    spass:5, diff:[1,2,3].includes(u.diff)?u.diff:2,
    custom:true, focus:false, tags:"KI-Coach",
    kurz:(u.beschreibung||"").replace(/^AUFBAU:\s*/i,"").slice(0,80),
    skizze:u.skizze||null
  };
  try{
    // Trainer-Token (RLS: trainingsformen schreibbar nur fuer is_trainer, NICHT anon)
    const r=await fetch(`${SB_URL}/rest/v1/trainingsformen`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(form)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  if(typeof CUSTOM_FORMS!=="undefined")CUSTOM_FORMS.push(form);
  document.getElementById("ki-modal")?.remove();
  toast("🏃 Gespeichert – jetzt im Trainingsplan wählbar ✓");
  if(typeof go==="function")go("planung"); // direkt zur Planung, dort in gewünschte Phase setzen
}
