/* ═══ md-fazit.js · v525 — Spiel und Festival nachbereiten ══════════════════════
   PO: „Gibt es eine Bewertungsmöglichkeit? Spieler und auch Gesamteindruck? Es sollte
   möglich sein, nicht nur die Spieler zu bewerten sondern auch andere Kriterien rund um
   das Festival." Und auf die Frage, was wohin gehört: „Wichtig sind sportlich die
   Positionen im Spiel eingehalten, Passspiel, teamverhalten, Zweikampf. Müssen überlegen
   was eher auf spieler Ebene passt und was auf Mannschaft oder auf beiden. Darf auch nicht
   zu umfangreich werden."

   Die Aufteilung, und warum sie so ist:

   SPIELER — bleibt vollständig beim Blitz-Rating (Einsatz & Zweikampf, Technik am Ball,
   Spielverständnis, Teamverhalten, Tagesform). Hier kommt nichts dazu. „Passspiel" je Kind
   wäre eine sechste Reihe, die sich mit Technik und Spielverständnis überschneidet: mehr
   Tippen, kein zusätzliches Wissen.

   MANNSCHAFT — hier steht, was man am einzelnen Kind gar nicht sehen KANN. „Positionen
   eingehalten" ist das deutlichste Beispiel: ein Achtjähriger, der brav stehen bleibt,
   während die anderen um den Ball trauben, ist nicht der gute Spieler. Die Traube ist ein
   Mannschaftsbild und meist eine Folge von Spielform und Feldgröße — also der Entscheidung
   des Trainers, nicht der des Kindes. Auf Spielerebene bewertet wäre es unfair gegenüber
   dem Kind und nutzlos für den Trainer.

   AUF BEIDEN, mit verschiedener Bedeutung — Passspiel und Zweikampf. Beim Kind sind es
   Gewohnheiten („sucht den Pass", „geht rein"), bei der Mannschaft Ergebnisse („Pässe kamen
   an", „wir haben die Zweikämpfe angenommen statt zurückzuweichen"). Gegen einen deutlich
   stärkeren Gast ist das Zweite die eigentliche Beobachtung des Tages.

   Je Team bewertet, nicht einmal fürs ganze Festival (PO-Entscheidung): Adler 1 und Adler 2
   spielen oft in verschiedenen Formen und gegen verschiedene Gäste — ein gemeinsamer Wert
   mittelt genau das weg, was man wissen will.

   Die Skala ist dieselbe wie beim Blitz-Rating (schwach / ok / stark), damit die Sprache in
   der App eine bleibt und niemand zwei Systeme im Kopf halten muss.

   Gespeichert in event_bewertung, je Trainer eine Zeile pro Termin (upsert auf
   termin_id,autor). Mehrere Meinungen zum selben Tag sind hier der Wert, nicht das Problem
   — anders als beim Blitz-Rating, wo derselbe Trainer dasselbe Kind zweimal bewertete und
   die Auswertung doppelt zählte (v471).

   Den Eltern-Puls holt dieses Fenster NICHT noch einmal ab: er steht im Termin-Fenster
   direkt über dem Knopf, der hierher führt. Zweimal nach derselben Stimmung zu fragen wäre
   der sicherste Weg, dass keiner der beiden Wege gepflegt wird. */

const FZ_REIHEN = [
  { key:"ordnung",   emo:"🧭", label:"Ordnung im Raum", hint:"verteilt geblieben oder Traube um den Ball" },
  { key:"pass",      emo:"🔗", label:"Passspiel",       hint:"kamen Pässe an, gab es Ketten" },
  { key:"zweikampf", emo:"⚔️", label:"Zweikämpfe",      hint:"angenommen oder zurückgewichen" },
  { key:"spass",     emo:"😄", label:"Spaß",            hint:"wie es den Kindern ging" }
];
const FZ_STUFEN = [
  { v:1, l:"schwach", c:"#dc2626" },
  { v:2, l:"ok",      c:"#64748b" },
  { v:3, l:"stark",   c:"#15803d" }
];
/* Der Gast wird sportlich eingeschätzt, nicht benotet. Die Frage dahinter ist die einzige,
   die im nächsten Sommer wirklich schwer ist: wen lädst du ein, damit die Kinder Spiele
   bekommen und keine Vorführungen. */
const FZ_GAST = [
  { v:"zu_schwach", l:"zu schwach", c:"#ca8a04" },
  { v:"passend",    l:"passend",    c:"#15803d" },
  { v:"zu_stark",   l:"zu stark",   c:"#dc2626" }
];
const FZ_ORGA = [
  { key:"zeitplan", emo:"⏱️", label:"Zeitplan", stufen:["zu eng","passte","zu viel Luft"] },
  { key:"felder",   emo:"📐", label:"Felder",   stufen:["zu klein","passten","zu groß"] },
  { key:"helfer",   emo:"🙌", label:"Helfer",   stufen:["zu wenige","knapp","genug"] }
];
/* Im Festival-Plan stehen unsere Mannschaften und die Gäste in EINER Liste. Alles mit
   „Adler" darin ist unseres – der Verein heißt so, und ein Gast mit demselben Namen wäre
   im Spielplan ohnehin nicht auseinanderzuhalten. */
const FZ_EIGEN = /adler/i;

let _FZ = null;   // { termin, autor, teams:[…], gaeste:[…], wert:{teams,gaeste,orga,getragen,arbeiten}, fremde }

function fzLabel(t){ return (t && t.typ === "turnier") ? "Festival" : "Spiel"; }

/* Wie viele Mannschaften hatten wir an dem Tag? Quelle ist die gespeicherte Einteilung
   („<datum>__teams", md-teams.js) – dieselbe, aus der auch der Spielplan gebaut wurde.
   Ohne Einteilung bleibt es bei einer Mannschaft; das Fenster soll nie leer dastehen. */
async function fzTeamsLesen(datum){
  try{
    const r = await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(datum+"__teams")}&select=data`,{headers:sbAuthHeaders()});
    if(!r.ok) return [{ nr:1, name:"Mannschaft", form:"" }];
    const d = (((await r.json())||[])[0]||{}).data || {};
    const form = d._form || {};
    const nrs = new Set();
    Object.keys(d).forEach(k=>{ if(k.charAt(0)!=="_" && d[k]) nrs.add(String(d[k])); });
    Object.keys(form).forEach(k=>nrs.add(String(k)));
    const liste = [...nrs].map(Number).filter(n=>n>0).sort((a,b)=>a-b);
    if(!liste.length) return [{ nr:1, name:"Mannschaft", form:"" }];
    return liste.map(n=>({ nr:n, name:"Adler "+n, form:form[String(n)]||"" }));
  }catch(e){ return [{ nr:1, name:"Mannschaft", form:"" }]; }
}

/* Die Gäste stehen im Festival-Datensatz (heimturnier). Bei einem Auswärtsspiel oder ohne
   Planer bleibt die Liste leer – dann fällt der Block einfach weg, statt drei leere
   Knöpfe anzubieten. */
async function fzGaesteLesen(t){
  const aus = [];
  try{
    const r = await fetch(`${SB_URL}/rest/v1/heimturnier?datum=eq.${encodeURIComponent(t.datum)}&select=teams&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){
      const row = ((await r.json())||[])[0];
      ((row&&row.teams)||[]).forEach(n=>{ if(n && !FZ_EIGEN.test(n)) aus.push(n); });
    }
  }catch(e){}
  /* Ein normales Spiel hat genau einen Gegner, und der steht am Termin. */
  if(!aus.length && (t.gegner||"").trim()) aus.push(t.gegner.trim());
  return aus;
}

async function fazitOpen(terminId){
  if(!sbToken()){ toast("Bitte als Trainer anmelden","err"); return; }
  document.getElementById("tmd-modal")?.remove();
  document.getElementById("fz-modal")?.remove();

  /* Der Termin kann auf der Startseite unbekannt sein: TM_TERMINE haelt dort nur die
     kommenden, und nachbereitet wird immer ein vergangener. Deshalb holt das Fenster ihn
     notfalls selbst – ohne sich auf eine Funktion aus einem anderen Modul zu verlassen. */
  let t = (typeof TM_TERMINE!=="undefined" ? (TM_TERMINE||[]) : []).find(x=>Number(x.id)===Number(terminId));
  if(!t && typeof tmTerminNachladen==="function") t = await tmTerminNachladen(terminId);
  if(!t){
    try{
      const r = await fetch(`${SB_URL}/rest/v1/termine?select=*&id=eq.${Number(terminId)}&limit=1`,{headers:sbAuthHeaders()});
      if(r.ok) t = ((await r.json())||[])[0]||null;
    }catch(e){}
  }
  if(!t){ toast("Termin nicht gefunden","err"); return; }

  const modal = document.createElement("div");
  modal.id = "fz-modal";
  modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-label", fzLabel(t)+" nachbereiten");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick = e => { if(e.target===modal) fazitSchliessen(); };
  const c = document.createElement("div");
  c.id = "fz-card";
  c.style.cssText = "background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:12.5px">Lade …</div>';
  modal.appendChild(c); document.body.appendChild(modal);

  const autor = (typeof trainerMe==="function" ? (await trainerMe()) : "") || "";
  const [teams, gaeste] = await Promise.all([fzTeamsLesen(t.datum), fzGaesteLesen(t)]);
  let meine = null, fremde = 0;
  try{
    const r = await fetch(`${SB_URL}/rest/v1/event_bewertung?termin_id=eq.${Number(t.id)}&select=*`,{headers:sbAuthHeaders()});
    if(r.ok){
      const rows = (await r.json())||[];
      meine = rows.find(x=>x.autor===autor) || null;
      fremde = rows.filter(x=>x.autor!==autor).length;
    }
  }catch(e){}

  _FZ = { termin:t, autor, teams, gaeste, fremde,
          wert:{ teams:(meine&&meine.teams)||{}, gaeste:(meine&&meine.gaeste)||{},
                 orga:(meine&&meine.orga)||{}, getragen:(meine&&meine.getragen)||"",
                 arbeiten:(meine&&meine.arbeiten)||"" },
          schon: !!meine };
  fazitRender();
}

function fazitSchliessen(){ document.getElementById("fz-modal")?.remove(); _FZ=null; }

function fzStufenHtml(gruppe, id, stufen, aktuell){
  return `<div style="display:flex;gap:5px">${stufen.map(st=>{
    const an = String(aktuell)===String(st.v);
    return `<button onclick="fazitSet('${gruppe}','${id}','${st.v}')" aria-pressed="${an}" style="flex:1;min-height:44px;font-size:12px;border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${an?st.c:"var(--surface2)"};color:${an?"#fff":"var(--text2)"};font-weight:${an?"800":"600"}">${an?"✓ ":""}${st.l}</button>`;
  }).join("")}</div>`;
}

function fazitRender(){
  const c = document.getElementById("fz-card"); if(!c||!_FZ) return;
  const t = _FZ.termin, w = _FZ.wert;
  const d = new Date(t.datum+"T00:00:00");
  const datumStr = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
  const sec = x => `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:16px 0 6px">${x}</div>`;
  const fld = "width:100%;box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)";

  const teamsHtml = _FZ.teams.map(tm=>{
    const v = w.teams[String(tm.nr)] || {};
    return `<div style="border:var(--border-s);border-radius:12px;padding:10px 11px;margin-bottom:8px;background:var(--surface2)">
      <div style="font-size:13px;font-weight:800;margin-bottom:8px">${esc(tm.name)}${tm.form?`<span style="font-size:11px;font-weight:600;color:var(--text3)"> · ${esc(tm.form)}</span>`:""}</div>
      ${FZ_REIHEN.map(re=>`<div style="margin-bottom:7px">
        <div style="font-size:11.5px;font-weight:700;margin-bottom:3px">${re.emo} ${re.label}<span style="font-weight:500;color:var(--text3)"> · ${re.hint}</span></div>
        ${fzStufenHtml("teams", tm.nr+":"+re.key, FZ_STUFEN, v[re.key])}
      </div>`).join("")}
    </div>`;
  }).join("");

  const gaesteHtml = _FZ.gaeste.length ? _FZ.gaeste.map(g=>`<div style="margin-bottom:7px">
      <div style="font-size:11.5px;font-weight:700;margin-bottom:3px">${esc(g)}</div>
      ${fzStufenHtml("gaeste", g, FZ_GAST, w.gaeste[g])}
    </div>`).join("")
    + `<div style="font-size:10.5px;color:var(--text3);margin-top:2px">Landet beim Gegner in der Gegner-Datenbank – für die Einladungsliste des nächsten Festivals.</div>`
    : "";

  const orgaHtml = FZ_ORGA.map(o=>`<div style="margin-bottom:7px">
      <div style="font-size:11.5px;font-weight:700;margin-bottom:3px">${o.emo} ${o.label}</div>
      ${fzStufenHtml("orga", o.key, o.stufen.map((l,i)=>({v:i+1,l,c:i===1?"#15803d":"#64748b"})), w.orga[o.key])}
    </div>`).join("");

  c.innerHTML = `${mdlHead("fz-modal","📋",fzLabel(t)+" nachbereiten",esc(t.titel||fzLabel(t))+" · "+datumStr,"#0891b2")}

    <div style="font-size:11.5px;color:var(--text2);background:var(--surface2);border-radius:10px;padding:9px 11px;line-height:1.5">
      Hier geht es um die <b>Mannschaft</b>. Die einzelnen Kinder stehen im Blitz-Rating – was hier gefragt ist, sieht man am einzelnen Kind gar nicht.
    </div>
    ${_FZ.fremde?`<div style="font-size:11.5px;color:var(--text2);margin-top:6px">👥 ${_FZ.fremde} weitere Einschätzung${_FZ.fremde>1?"en":""} aus dem Trainerteam liegt bereits vor – deine kommt daneben, sie ersetzt nichts.</div>`:""}

    ${sec("Wie hat die Mannschaft gespielt")}
    ${teamsHtml}

    ${_FZ.gaeste.length?sec("Wie stark waren die Gäste")+gaesteHtml:""}

    ${sec("Zwei Sätze")}
    <label style="font-size:11.5px;font-weight:700">Das hat getragen
      <textarea id="fz-getragen" rows="2" maxlength="300" style="${fld};margin-top:3px;resize:vertical" placeholder="Was heute gut lief – auch fürs Lob in der Kabine">${esc(w.getragen)}</textarea></label>
    <label style="font-size:11.5px;font-weight:700;display:block;margin-top:8px">Daran arbeiten wir
      <textarea id="fz-arbeiten" rows="2" maxlength="300" style="${fld};margin-top:3px;resize:vertical" placeholder="Steht beim nächsten Trainingsplan wieder da">${esc(w.arbeiten)}</textarea></label>

    <details style="margin-top:12px;border:var(--border-s);border-radius:12px;background:var(--surface2)">
      <summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;padding:0 12px;font-size:12.5px;font-weight:800;color:var(--text2)">⚙️ Organisation – wenn etwas hakte</summary>
      <div style="padding:2px 12px 12px">${orgaHtml}</div>
    </details>

    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p" style="flex:1;min-height:48px;justify-content:center;font-size:14px;font-weight:800" onclick="fazitSpeichern()"><i class="ti ti-check"></i>Speichern</button>
      <button class="btn btn-sm" style="min-height:48px" onclick="fazitSchliessen()">Schließen</button>
    </div>
    <div style="font-size:10.5px;color:var(--text3);margin-top:6px;text-align:center">Alles freiwillig – auch halb ausgefüllt ist besser als gar nicht.</div>`;
}

/* Derselbe Knopf nochmal = Antwort zurücknehmen. Ohne das bleibt ein Fehlgriff für immer
   stehen, und der Trainer hat keinen Weg zurück auf „nicht beantwortet". */
function fazitSet(gruppe, id, wert){
  if(!_FZ) return;
  fazitTexteMerken();
  if(gruppe==="teams"){
    const [nr,key] = id.split(":");
    const v = _FZ.wert.teams[nr] = _FZ.wert.teams[nr] || {};
    v[key] = (String(v[key])===String(wert)) ? undefined : Number(wert);
    if(v[key]===undefined) delete v[key];
  }else{
    const ziel = _FZ.wert[gruppe];
    const neu = (gruppe==="orga") ? Number(wert) : wert;
    if(String(ziel[id])===String(wert)) delete ziel[id]; else ziel[id]=neu;
  }
  fazitRender();
}

/* Die Textfelder leben im DOM, die Antippfelder in _FZ. Jedes Neuzeichnen wirft das DOM
   weg – ohne dieses Merken wäre ein angefangener Satz beim nächsten Tippen verschwunden. */
function fazitTexteMerken(){
  if(!_FZ) return;
  const g = document.getElementById("fz-getragen"), a = document.getElementById("fz-arbeiten");
  if(g) _FZ.wert.getragen = g.value.slice(0,300);
  if(a) _FZ.wert.arbeiten = a.value.slice(0,300);
}

async function fazitSpeichern(){
  if(!_FZ) return;
  fazitTexteMerken();
  const w = _FZ.wert;
  const body = { termin_id:Number(_FZ.termin.id), autor:_FZ.autor, teams:w.teams, gaeste:w.gaeste,
                 orga:w.orga, getragen:w.getragen||null, arbeiten:w.arbeiten||null,
                 updated_at:new Date().toISOString() };
  try{
    const r = await fetch(`${SB_URL}/rest/v1/event_bewertung?on_conflict=termin_id,autor`,
      { method:"POST", headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'}, body:JSON.stringify(body) });
    if(sbCheck401(r)) return;
    if(!r.ok && r.status!==201 && r.status!==204){ toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err"); return; }
  }catch(e){ toast("Netzwerkfehler","err"); return; }
  /* Der Satz „daran arbeiten wir" ist der Grund, aus dem sich das Ausfüllen lohnt – er
     gehört an den Gegner-Datensatz nicht, aber ins nächste Training. Bis der Trainingsplan
     ihn selbst liest, steht er wenigstens hier als Bestätigung. */
  toast(w.arbeiten ? "Gespeichert ✓ – „daran arbeiten wir“ steht fürs nächste Training bereit" : "Gespeichert ✓");
  fazitSchliessen();
  if(typeof trainerTodoLoad==="function") trainerTodoLoad();
}

/* Welche vergangenen Spiele und Festivals hat DIESER Trainer noch nicht nachbereitet?
   Liefert die Termine, nicht das HTML – das To-Do baut views.js, die Auswertung könnte
   später dieselbe Liste brauchen. */
async function fazitOffene(tage){
  const heute = new Date().toISOString().slice(0,10);
  const ab = new Date(Date.now()-(tage||14)*864e5).toISOString().slice(0,10);
  try{
    const r = await fetch(`${SB_URL}/rest/v1/termine?select=id,datum,titel,gegner,typ,uhrzeit_ende&typ=in.(spiel,turnier)&datum=gte.${ab}&datum=lte.${heute}&order=datum.desc&limit=5`,{headers:sbAuthHeaders()});
    if(!r.ok) return [];
    const rows = ((await r.json())||[]).filter(t=>typeof terminVorbei!=="function"||terminVorbei(t));
    if(!rows.length) return [];
    const autor = (typeof trainerMe==="function" ? (await trainerMe()) : "") || "";
    const ids = rows.map(t=>t.id).join(",");
    const b = await fetch(`${SB_URL}/rest/v1/event_bewertung?termin_id=in.(${ids})&select=termin_id,autor`,{headers:sbAuthHeaders()});
    const fertig = new Set(b.ok ? ((await b.json())||[]).filter(x=>x.autor===autor).map(x=>Number(x.termin_id)) : []);
    return rows.filter(t=>!fertig.has(Number(t.id)));
  }catch(e){ return []; }
}

/* MODUL_WACHE: letzter Name der Datei. Stirbt sie vorher, fehlt genau dieser. */
function fazitModulDa(){ return true; }
