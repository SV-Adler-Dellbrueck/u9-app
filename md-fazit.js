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
  c.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:var(--s-text)">Lade …</div>';
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
  nbWegStart("spiel");   // v627: geführte Nachbereitung als Standard
}

function fazitSchliessen(){ nbDiktatStop(); _nbWeg=null; document.getElementById("fz-modal")?.remove(); _FZ=null; }   // v628: Notiz und Tagebuch-Vorschlag bleiben bis zum nächsten Termin (nbSprachHtml)

function fzStufenHtml(gruppe, id, stufen, aktuell){
  return `<div style="display:flex;gap:5px">${stufen.map(st=>{
    const an = String(aktuell)===String(st.v);
    return `<button onclick="fazitSet('${gruppe}','${id}','${st.v}')" aria-pressed="${an}" style="flex:1;min-height:44px;font-size:var(--s-text);border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${an?st.c:"var(--surface2)"};color:${an?"#fff":"var(--text2)"};font-weight:${an?"800":"600"}">${an?"✓ ":""}${st.l}</button>`;
  }).join("")}</div>`;
}

function fazitRender(){
  const c = document.getElementById("fz-card"); if(!c||!_FZ) return;
  const t = _FZ.termin, w = _FZ.wert;
  const d = new Date(t.datum+"T00:00:00");
  const datumStr = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
  const sec = x => `<div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:16px 0 6px">${x}</div>`;
  const fld = "width:100%;box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)";

  const teamsHtml = _FZ.teams.map(tm=>{
    const v = w.teams[String(tm.nr)] || {};
    return `<div style="border:var(--border-s);border-radius:12px;padding:10px 11px;margin-bottom:8px;background:var(--surface2)">
      <div style="font-size:var(--s-text);font-weight:800;margin-bottom:8px">${esc(tm.name)}${tm.form?`<span style="font-size:var(--s-klein);font-weight:600;color:var(--text3)"> · ${esc(tm.form)}</span>`:""}</div>
      ${FZ_REIHEN.map(re=>`<div style="margin-bottom:7px">
        <div style="font-size:var(--s-klein);font-weight:700;margin-bottom:3px">${re.emo} ${re.label}<span style="font-weight:500;color:var(--text3)"> · ${re.hint}</span></div>
        ${fzStufenHtml("teams", tm.nr+":"+re.key, FZ_STUFEN, v[re.key])}
      </div>`).join("")}
    </div>`;
  }).join("");

  const gaesteHtml = _FZ.gaeste.length ? _FZ.gaeste.map(g=>`<div style="margin-bottom:7px">
      <div style="font-size:var(--s-klein);font-weight:700;margin-bottom:3px">${esc(g)}</div>
      ${fzStufenHtml("gaeste", g, FZ_GAST, w.gaeste[g])}
    </div>`).join("")
    + `<div style="font-size:var(--s-klein);color:var(--text3);margin-top:2px">Landet beim Gegner in der Gegner-Datenbank – für die Einladungsliste des nächsten Festivals.</div>`
    : "";

  const orgaHtml = FZ_ORGA.map(o=>`<div style="margin-bottom:7px">
      <div style="font-size:var(--s-klein);font-weight:700;margin-bottom:3px">${o.emo} ${o.label}</div>
      ${fzStufenHtml("orga", o.key, o.stufen.map((l,i)=>({v:i+1,l,c:i===1?"#15803d":"#64748b"})), w.orga[o.key])}
    </div>`).join("");

  c.innerHTML = `${mdlHead("fz-modal","📋",fzLabel(t)+" nachbereiten",esc(t.titel||fzLabel(t))+" · "+datumStr,"#0891b2")}

    <div style="font-size:var(--s-klein);color:var(--text2);background:var(--surface2);border-radius:10px;padding:9px 11px;line-height:1.5">
      Hier geht es um die <b>Mannschaft</b>. Die einzelnen Kinder stehen im Blitz-Rating – was hier gefragt ist, sieht man am einzelnen Kind gar nicht.
    </div>
    ${nbSprachHtml("spiel", "t"+t.id)}
    ${_FZ.fremde?`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">👥 ${_FZ.fremde} weitere Einschätzung${_FZ.fremde>1?"en":""} aus dem Trainerteam liegt bereits vor – deine kommt daneben, sie ersetzt nichts.</div>`:""}

    ${sec("Wie hat die Mannschaft gespielt")}
    ${teamsHtml}

    ${_FZ.gaeste.length?sec("Wie stark waren die Gäste")+gaesteHtml:""}

    ${sec("Zwei Sätze")}
    <label style="font-size:var(--s-klein);font-weight:700">Das hat getragen
      <textarea id="fz-getragen" rows="2" maxlength="300" style="${fld};margin-top:3px;resize:vertical" placeholder="Was heute gut lief – auch fürs Lob in der Kabine">${esc(w.getragen)}</textarea></label>
    <label style="font-size:var(--s-klein);font-weight:700;display:block;margin-top:8px">Daran arbeiten wir
      <textarea id="fz-arbeiten" rows="2" maxlength="300" style="${fld};margin-top:3px;resize:vertical" placeholder="Steht beim nächsten Trainingsplan wieder da">${esc(w.arbeiten)}</textarea></label>

    <details style="margin-top:12px;border:var(--border-s);border-radius:12px;background:var(--surface2)">
      <summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;padding:0 12px;font-size:var(--s-text);font-weight:800;color:var(--text2)">⚙️ Organisation – wenn etwas hakte</summary>
      <div style="padding:2px 12px 12px">${orgaHtml}</div>
    </details>

    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p" style="flex:1;min-height:48px;justify-content:center;font-size:var(--s-karte);font-weight:800" onclick="fazitSpeichern()"><i class="ti ti-check"></i>Speichern</button>
      <button class="btn btn-sm" style="min-height:48px" onclick="fazitSchliessen()">Schließen</button>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px;text-align:center">Alles freiwillig – auch halb ausgefüllt ist besser als gar nicht.</div>`;
  if(_nbWeg && _nbWeg.art==="spiel") nbWegZeichnen();   // v627: der Ablauf überlebt das Neuzeichnen des Bogens
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
  const notiz = nbSprachnotizFuer("t"+_FZ.termin.id); if(notiz) body.sprachnotiz = notiz;   // v628
  try{
    const r = await fetch(`${SB_URL}/rest/v1/event_bewertung?on_conflict=termin_id,autor`,
      { method:"POST", headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'}, body:JSON.stringify(body) });
    if(sbCheck401(r)) return;
    if(!r.ok && r.status!==201 && r.status!==204){ toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err"); return; }
  }catch(e){ toast("Netzwerkfehler","err"); return; }
  /* v526: Statt eines weiteren Toasts der Weg ins Tagebuch. Genau hier ist der Moment,
     in dem die Beobachtung noch frisch ist – eine Stunde spaeter wird sie abgeschrieben
     oder gar nicht. Der Eintrag zieht sich Ausloeser und Beobachtung aus dem, was gerade
     gespeichert wurde. */
  const terminId = Number(_FZ.termin.id);
  fazitSchliessen();
  if(typeof trainerTodoLoad==="function") trainerTodoLoad();
  if(typeof tagebuchAusEvent==="function") fzWeiterInsTagebuch(terminId);
  else toast("Gespeichert ✓");
}
/* Kein stiller Sprung: gespeichert ist gespeichert, das Tagebuch ist ein Angebot.
   Ein Fenster, das sich von selbst oeffnet, waere am Spielfeldrand ein Uebergriff. */
function fzWeiterInsTagebuch(terminId){
  document.getElementById("fz-weiter")?.remove();
  const box = document.createElement("div");
  box.id = "fz-weiter";
  box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true");
  box.setAttribute("aria-label","Gespeichert");
  box.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10055;display:flex;align-items:center;justify-content:center;padding:18px";
  box.onclick = e => { if(e.target===box) box.remove(); };
  box.innerHTML = `<div style="background:var(--surface);color:var(--text);max-width:380px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-size:var(--s-karte);font-weight:800">Gespeichert ✓</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin:6px 0 14px;line-height:1.5">Willst du daraus einen Tagebucheintrag machen? Auslöser und Beobachtung stehen schon da – es fehlen nur dein Aha und die Konsequenz.</div>
    <button class="btn btn-p" onclick="document.getElementById('fz-weiter').remove();tagebuchAusEvent(${Number(terminId)})" style="width:100%;min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-book"></i>Ins Tagebuch</button>
    <button class="btn" onclick="document.getElementById('fz-weiter').remove()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Später</button>
  </div>`;
  document.body.appendChild(box);
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

/* ═══ v627 · Sprachnotiz → Nachbereitung ═══════════════════════════════════════
   PO (Bildschirmfoto „Einheit bewerten“): „Wenn ich Einheiten nachbewerte, sei es Training,
   Spiele oder Festivals, wäre es gut, dass ich diese auch per Sprachnotiz eingeben kann und die
   KI dann diese Notizen übernimmt und strukturiert.“

   Oben im Fenster ein Kasten: frei erzählen (Mikrofon-Knopf oder das Mikrofon der Tastatur),
   dann „In den Bogen übernehmen“. Die Edge Function ki-nachbereitung ordnet das Gesagte den
   Feldern zu; hier wird es eingetragen – sichtbar, änderbar, NICHT gespeichert. Gespeichert
   wird wie immer mit dem Knopf unten. Was nicht gesagt wurde, bleibt, wie es war.

   Datenschutz: Vor dem Senden werden alle Kindernamen aus dem Kader durch „Kind 1“, „Kind 2“ …
   ersetzt; die Antwort wird zurückübersetzt. Beim Sprachmodell kommt kein Name an. */
let _nbText = "", _nbFuer = "", _nbTb = null;
/* v628: Der gesprochene Text wird mit der Nachbereitung gespeichert (Spalte sprachnotiz) –
   vorher ging er beim Schließen verloren. Nur für den Termin, zu dem er gehört. */
function nbSprachnotizFuer(fuer){ const t = String(_nbText||"").trim(); return (fuer===_nbFuer && t) ? t.slice(0,4000) : undefined; }
function nbTagebuchVorschlag(fuer){ return (_nbTb && _nbTb.fuer===fuer) ? _nbTb.v : null; }
/* „Kind n“ aus der KI-Antwort → Deckname des Tagebuchs („Kind C“). Nie der echte Name: das
   Tagebuch geht an den Verband. Ohne Tagebuch-Modul bleibt es neutral „ein Kind“. */
function nbTbDecknamen(tb, m){
  if(!tb) return null;
  const um = t => String(t||"").replace(/Kind (\d+)/g, (x,n)=>{
    const name = m && m.zurueck ? m.zurueck["Kind "+n] : null;
    return name && typeof tbAlias==="function" ? tbAlias(name) : "ein Kind";
  });
  return { baustein:tb.baustein, beobachtung:um(tb.beobachtung), aha:um(tb.aha), konsequenz:um(tb.konsequenz),
           schlagworte:(tb.schlagworte||[]).map(um) };
}
function nbSprachHtml(art, fuer){
  /* Der Text gehört zu genau einem Termin – wer zum nächsten Tag wechselt, fängt leer an. */
  if(String(fuer||"") !== _nbFuer){ _nbFuer = String(fuer||""); _nbText = ""; _nbTb = null; nbDiktatStop(); }
  const kannHoeren = typeof diktatMoeglich==="function" && diktatMoeglich();
  const fld = "width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text);resize:vertical";
  return `<div id="nb-box" style="border:1px solid var(--rand-bedien);border-radius:12px;background:var(--surface2);padding:10px 11px;margin:10px 0 4px">
    <div style="font-size:var(--s-text);font-weight:800">🎙️ Per Sprachnotiz ausfüllen</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin:2px 0 8px;line-height:1.45">Erzähl frei, wie es lief – ${art==="training"?"Einheit, einzelne Übungen, einzelne Kinder":"Mannschaften, Gäste, was getragen hat, woran ihr arbeitet"}. Die KI trägt ein, was du sagst; gespeichert wird erst mit dem Knopf unten.</div>
    <textarea id="nb-text" rows="3" maxlength="4000" style="${fld};max-height:50vh" placeholder="${kannHoeren?"Mikrofon antippen und sprechen – oder hier tippen bzw. das Mikrofon der Tastatur nutzen":"Hier tippen oder das Mikrofon der Tastatur nutzen"}" oninput="_nbText=this.value;nbFeldHoehe(this)">${esc(_nbText)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px">
      ${kannHoeren?`<button id="nb-mic" class="btn" style="flex:0 0 auto;min-height:48px" onclick="nbDiktat('${art}')"><i class="ti ti-microphone"></i>${_nbText?"Weiter einsprechen":"Einsprechen"}</button>`:""}
      <button id="nb-gross" class="btn" style="flex:0 0 auto;min-height:48px;min-width:48px;justify-content:center" onclick="nbGross('${art}',false)" aria-label="Text groß anzeigen und bearbeiten"><i class="ti ti-arrows-maximize"></i></button>
      <button id="nb-los" class="btn btn-p" style="flex:1;min-height:48px;justify-content:center" onclick="nbAuswerten('${art}')"><i class="ti ti-sparkles"></i>KI auswerten</button>
    </div>
    <div id="nb-status" role="status" aria-live="polite" style="font-size:var(--s-klein);color:var(--text2);margin-top:6px;line-height:1.45"></div>
  </div>`;
}
/* v630: Das Einsprechen läuft über den gemeinsamen Diktat-Weg in core.js (diktatStart) –
   Bildschirm bleibt an, keine doppelten Wörter, Anzeige was ankommt, Pause und Weiter. */
function nbDiktatStop(){ if(typeof _dk!=="undefined" && _dk && /^nb-/.test(_dk.feldId)) diktatStop(); }
function nbDiktat(art){ nbGross(art, true); }
function nbFeldHoehe(el){ if(!el) return; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight + 2, Math.round(window.innerHeight*0.5)) + "px"; }

/* v630 · Vollansicht der Sprachnotiz. PO: „Wenn ich eine längere Sprachnachricht eingebe, wird es
   schwer, diese im Textfeld überhaupt lesen zu können … vielleicht erscheint ein größeres
   Textfenster. Und dann nochmal einen Button KI-Zusammenfassung.“ Kachel: „So bauen, mit in v630“.

   Einsprechen öffnet sie bildschirmfüllend: oben „Hört zu“ mit dem gerade Verstandenen, darunter
   der Text groß und bearbeitbar, unten am Daumen Pause/Weiter, daneben „KI auswerten“. Die KI
   trägt dann NICHT sofort ein, sondern zeigt zuerst, was sie eintragen würde – erst „In den Bogen
   übernehmen“ setzt die Felder. Es gibt kein zweites Textfeld im Speicher: die Vollansicht
   schreibt in dasselbe wie das kleine Feld, und der KI-Weg ist derselbe (nbKiHolen, nbKiAnwenden). */
let _nbGrossErg = null;
function nbGross(art, mikro){
  document.getElementById("nb-gross-ov")?.remove();
  _nbGrossErg = null;
  const kann = typeof diktatMoeglich==="function" && diktatMoeglich();
  const ov = document.createElement("div");
  ov.id = "nb-gross-ov"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Sprachnotiz");
  ov.dataset.art = art;
  ov.style.cssText = "position:fixed;inset:0;z-index:10068;background:var(--surface);color:var(--text);display:flex;flex-direction:column;gap:8px;padding:12px 14px calc(12px + env(safe-area-inset-bottom))";
  ov.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;font-size:var(--s-teil);font-weight:800">🎙️ Sprachnotiz</div>
      <button class="btn" style="min-height:44px" onclick="nbGrossZu()" aria-label="Fertig – zurück zum Bogen, der Text bleibt stehen">Fertig</button>
    </div>
    <div id="nb-gross-hoer" class="dk-anzeige" style="margin-top:0" hidden></div>
    <textarea id="nb-gross-text" maxlength="4000" aria-label="Text der Sprachnotiz" oninput="nbGrossTipp(this)"
      style="flex:1;min-height:0;width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--rand-bedien);border-radius:12px;font-family:inherit;font-size:var(--s-karte);line-height:1.6;background:var(--surface2);color:var(--text);resize:none"
      placeholder="${kann?"Tippe unten auf „Einsprechen“ und erzähl, wie es lief – oder tippe hier.":"Hier tippen oder das Mikrofon der Tastatur nutzen."}">${esc(_nbText)}</textarea>
    <div id="nb-gross-vorschau" hidden style="max-height:45vh;overflow-y:auto;border:1px solid var(--rand-bedien);border-radius:12px;padding:10px 12px;background:var(--surface2)"></div>
    <div id="nb-gross-status" role="status" aria-live="polite" style="font-size:var(--s-klein);color:var(--text2);line-height:1.45"></div>
    <div id="nb-gross-fuss" style="display:flex;flex-direction:column;gap:8px"></div>`;
  document.body.appendChild(ov);
  nbGrossFuss();
  const ta = document.getElementById("nb-gross-text");
  ta.scrollTop = ta.scrollHeight;
  if(mikro && kann) nbGrossMikro();
  else { try{ ta.focus({preventScroll:true}); ta.setSelectionRange(ta.value.length, ta.value.length); }catch(e){} }
}
function nbGrossFuss(){
  const f = document.getElementById("nb-gross-fuss"), ov = document.getElementById("nb-gross-ov"); if(!f || !ov) return;
  const art = ov.dataset.art;
  const kann = typeof diktatMoeglich==="function" && diktatMoeglich();
  if(_nbGrossErg){
    f.innerHTML = `<div style="display:flex;gap:8px">
      <button class="btn" style="flex:0 0 auto;min-height:56px" onclick="nbGrossVorschauWeg()"><i class="ti ti-pencil"></i>Text ändern</button>
      <button id="nb-gross-ueber" class="btn btn-p" style="flex:1;min-height:56px;justify-content:center" onclick="nbGrossUebernehmen()" ${_nbGrossErg.zeilen.length?"":"disabled"}><i class="ti ti-check"></i>In den Bogen übernehmen</button></div>`;
    return;
  }
  const an = typeof diktatAktiv==="function" && diktatAktiv("nb-gross-text");
  f.innerHTML = `${kann?`<button id="nb-gross-mic" class="btn" style="min-height:56px;justify-content:center;font-size:var(--s-karte)" onclick="nbGrossMikro()" aria-pressed="${an?"true":"false"}"><i class="ti ti-${an?"player-pause":"microphone"}"></i>${an?"Pause":(_nbText?"Weiter einsprechen":"Einsprechen")}</button>`:""}
    <button id="nb-gross-los" class="btn btn-p" style="min-height:56px;justify-content:center" onclick="nbGrossAuswerten('${art}')"><i class="ti ti-sparkles"></i>KI auswerten</button>`;
}
function nbGrossSync(v){
  _nbText = v;
  const t = document.getElementById("nb-text"); if(t){ t.value = v; nbFeldHoehe(t); }
  const b = document.getElementById("nb-mic"); if(b) b.innerHTML = '<i class="ti ti-microphone"></i>'+(v?"Weiter einsprechen":"Einsprechen");
}
function nbGrossTipp(el){ nbGrossSync(el.value); if(_nbGrossErg) nbGrossVorschauWeg(); }
function nbGrossMikro(){
  if(typeof diktatUmschalten!=="function") return;
  diktatUmschalten({ feldId:"nb-gross-text", knopfId:"nb-gross-mic", anzeigeId:"nb-gross-hoer", max:4000, onText:nbGrossSync });
}
function nbGrossZu(){
  if(typeof _dk!=="undefined" && _dk && _dk.feldId==="nb-gross-text") diktatStop();
  const ta = document.getElementById("nb-gross-text"); if(ta) nbGrossSync(ta.value);
  _nbGrossErg = null;
  document.getElementById("nb-gross-ov")?.remove();
}
function nbGrossVorschauWeg(){
  _nbGrossErg = null;
  const v = document.getElementById("nb-gross-vorschau"); if(v){ v.hidden = true; v.innerHTML = ""; }
  const st = document.getElementById("nb-gross-status"); if(st) st.textContent = "";
  nbGrossFuss();
}
async function nbGrossAuswerten(art){
  const ta = document.getElementById("nb-gross-text"), st = document.getElementById("nb-gross-status");
  const text = (ta&&ta.value||"").trim();
  nbGrossSync(ta ? ta.value : _nbText);
  if(text.length<15){ if(st) st.textContent = "Erzähl ein paar Sätze – dann kann die KI etwas eintragen."; return; }
  if(typeof diktatAktiv==="function" && diktatAktiv("nb-gross-text")) diktatPause();
  const los = document.getElementById("nb-gross-los");
  if(los){ los.disabled = true; los.innerHTML = '<i class="ti ti-loader-2"></i>KI ordnet zu …'; }
  if(st) st.textContent = "";
  let x = null;
  try{ x = await nbKiHolen(art, text); }
  catch(e){
    if(st) st.textContent = "Nicht ausgewertet: "+(e&&e.message||"keine Verbindung")+". Der Text bleibt stehen.";
    nbGrossFuss(); return;
  }
  if(!x || !document.getElementById("nb-gross-ov")){ nbGrossFuss(); return; }
  const zeilen = nbVorschau(art, x.d.ergebnis, x.m);
  _nbGrossErg = { art, d:x.d, m:x.m, zeilen };
  const v = document.getElementById("nb-gross-vorschau");
  if(v){
    v.hidden = false;
    v.innerHTML = zeilen.length
      ? `<div style="font-size:var(--s-text);font-weight:800;margin-bottom:4px">Das trägt die KI ein</div><ul style="margin:0;padding-left:18px;font-size:var(--s-text);line-height:1.5">${zeilen.map(z=>"<li>"+esc(z)+"</li>").join("")}</ul>
         <div style="font-size:var(--s-klein);color:var(--text2);margin-top:6px">Gespeichert wird erst im Bogen mit dem Knopf unten.</div>`
      : `<div style="font-size:var(--s-text)">Die KI hat in der Notiz nichts gefunden, das zu einem Feld passt – ergänze ein paar Worte zu Übungen oder Kindern.</div>`;
  }
  nbGrossFuss();
}
function nbGrossUebernehmen(){
  const e = _nbGrossErg; if(!e) return;
  nbKiAnwenden(e.art, e.d, e.m);
  nbGrossZu();
}
/* Lesbare Zusammenfassung dessen, was nbKiAnwenden setzen würde – ohne etwas zu setzen. Im
   Trainer-Bereich stehen die echten Namen (wie im Bogen). */
function nbVorschau(art, e, m){
  e = e || {};
  const S = n => "★".repeat(n), z = [];
  const zur = t => String(t||"").replace(/Kind (\d+)/g,(x,n)=>(m&&m.zurueck&&m.zurueck["Kind "+n])||x);
  if(art==="training"){
    const ei = e.einheit || {}, t = [];
    if(ei.spass) t.push("Spaß "+S(ei.spass)); if(ei.umsetzung) t.push("Umsetzung "+S(ei.umsetzung)); if(ei.erfolg) t.push("Ziel erreicht "+S(ei.erfolg));
    if(t.length) z.push("Einheit: "+t.join(", "));
    if(ei.notiz) z.push("Notiz zur Einheit: "+zur(ei.notiz));
    const plan = (typeof EB_PLAN!=="undefined"?EB_PLAN:[]);
    for(const u of e.uebungen||[]){
      const n = (plan[u.nr-1]||{}).formName || ("Übung "+u.nr);
      if(u.uebersprungen){ z.push("„"+n+"“: fand nicht statt"); continue; }
      const w = []; if(u.durchfuehrung) w.push("Ablauf "+S(u.durchfuehrung)); if(u.spass) w.push("Spaß "+S(u.spass)); if(u.anforderung) w.push("Anforderung "+S(u.anforderung));
      if(w.length || u.notiz) z.push("„"+n+"“: "+[w.join(", "), u.notiz?zur(u.notiz):""].filter(Boolean).join(" – "));
    }
    if((e.kinder||[]).length) z.push("Kinder: "+e.kinder.map(k=>zur(k.kind)+" "+S(k.sterne)).join(", "));
  }else{
    const W = ["","schwach","ok","stark"], teams = (typeof _FZ!=="undefined"&&_FZ&&_FZ.teams)||[];
    for(const t of e.teams||[]){
      const n = (teams.find(x=>x.nr===t.nr)||{}).name || ("Mannschaft "+t.nr), w = [];
      if(t.ordnung) w.push("Ordnung "+W[t.ordnung]); if(t.pass) w.push("Passspiel "+W[t.pass]); if(t.zweikampf) w.push("Zweikämpfe "+W[t.zweikampf]); if(t.spass) w.push("Spaß "+W[t.spass]);
      if(w.length) z.push(n+": "+w.join(", "));
    }
    const G = { zu_schwach:"zu schwach", passend:"passend", zu_stark:"zu stark" };
    for(const g of e.gaeste||[]) z.push(g.name+": "+(G[g.einschaetzung]||g.einschaetzung));
    if(e.getragen) z.push("Das hat getragen: "+e.getragen);
    if(e.arbeiten) z.push("Daran arbeiten wir: "+e.arbeiten);
    const o = e.orga || {}, OZ = {1:"zu eng",2:"passte",3:"zu viel Luft"}, OF = {1:"zu klein",2:"passten",3:"zu groß"}, OH = {1:"zu wenige",2:"knapp",3:"genug"}, ow = [];
    if(o.zeitplan) ow.push("Zeitplan "+OZ[o.zeitplan]); if(o.felder) ow.push("Felder "+OF[o.felder]); if(o.helfer) ow.push("Helfer "+OH[o.helfer]);
    if(ow.length) z.push("Organisation: "+ow.join(", "));
  }
  if(e.tagebuch) z.push("Tagebuch-Vorschlag"+((e.tagebuch.schlagworte||[]).length?": #"+e.tagebuch.schlagworte.join(" #"):""));
  return z;
}
/* Kindernamen → „Kind n“. Die anwesenden Kinder bekommen ihre Nummer in der Reihenfolge des
   Fensters, alle übrigen Kinder des Kaders danach – auch ein Name, der gar nicht bewertet wird,
   soll nicht beim Sprachmodell landen. Längere Namen zuerst, damit „Ben“ nicht „Benedikt“ zerlegt. */
function nbMaske(anwesend){
  const alle = (typeof KADER!=="undefined"?KADER:[]).map(k=>k.name).filter(Boolean);
  const reihe = [...(anwesend||[]), ...alle.filter(n=>!(anwesend||[]).includes(n))];
  const hin = {}, zurueck = {};
  reihe.forEach((n,i)=>{ hin[n] = "Kind "+(i+1); zurueck["Kind "+(i+1)] = n; });
  /* Ein Durchlauf mit EINEM Muster: nacheinander ersetzt, fasste ein späterer Name die schon
     gesetzten Platzhalter wieder an. Vornamen allein nur, wenn genau ein Kind so heißt. */
  const ziel = {};
  reihe.forEach(n=>{ ziel[String(n).toLowerCase()] = hin[n]; });
  const vorn = {};
  reihe.forEach(n=>{ const v = String(n).split(/\s+/)[0]; if(v && v!==n && v.length>2) (vorn[v.toLowerCase()] = vorn[v.toLowerCase()]||[]).push(hin[n]); });
  Object.keys(vorn).forEach(v=>{ if(vorn[v].length===1 && !ziel[v]) ziel[v] = vorn[v][0]; });
  const schluessel = Object.keys(ziel).sort((a,b)=>b.length-a.length);
  const re = schluessel.length ? new RegExp("(^|[^\\p{L}])("+schluessel.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")(?![\\p{L}])","giu") : null;
  const weg = t => re ? String(t).replace(re, (all, vor, name)=>vor+(ziel[name.toLowerCase()]||name)) : String(t);
  return { weg, zurueck, kinder: (anwesend||[]).map(n=>hin[n]) };
}
/* Holt die KI-Antwort, ohne etwas einzutragen. Wirft bei Fehlern; null, wenn kein Fenster offen ist. */
async function nbKiHolen(art, text){
  let body;
  if(art==="training"){
    const plan = (typeof EB_PLAN!=="undefined"?EB_PLAN:[]), kids = (typeof EB_SPIELER!=="undefined"?EB_SPIELER:[]);
    const m = nbMaske(kids);
    body = { art, text:m.weg(text), kinder:m.kinder,
      uebungen: plan.map((p,i)=>({ nr:i+1, name:p.formName, bloecke:(typeof einheitBlockNamen==="function"?einheitBlockNamen(p).join(", "):"") })) };
    body._m = m;
  }else{
    if(!_FZ) return null;
    fazitTexteMerken();
    const m = nbMaske([]);
    body = { art:"spiel", festival:_FZ.termin&&_FZ.termin.typ==="turnier", text:m.weg(text),
      teams:_FZ.teams.map(t=>({nr:t.nr,name:t.name})), gaeste:_FZ.gaeste };
    body._m = m;
  }
  const m = body._m; delete body._m;
  const r = await fetch(`${SB_URL}/functions/v1/ki-nachbereitung`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d = await r.json().catch(()=>null);
  if(!r.ok || !d || !d.ergebnis) throw new Error((d&&d.error)||("Fehler "+r.status));
  return { d, m };
}
/* Trägt die KI-Antwort in den Bogen ein und meldet es unter dem kleinen Feld. */
function nbKiAnwenden(art, d, m){
  _nbTb = d.ergebnis.tagebuch ? { fuer:_nbFuer, v:nbTbDecknamen(d.ergebnis.tagebuch, m) } : null;
  _nbMaskeAktiv = m;
  const bericht = art==="training" ? nbInsTraining(d.ergebnis, m) : nbInsSpiel(d.ergebnis);
  if(_nbTb) bericht.push("Tagebuch-Vorschlag");
  const st2 = document.getElementById("nb-status");
  if(st2) st2.innerHTML = bericht.length
    ? "✨ Eingetragen: "+esc(bericht.join(" · "))+". <b>Bitte prüfen und speichern.</b>"
    : "Die KI hat in der Notiz nichts gefunden, das zu einem Feld passt – ergänze ein paar Worte zu Übungen oder Kindern.";
  return bericht;
}
async function nbAuswerten(art){
  const ta = document.getElementById("nb-text"), st = document.getElementById("nb-status"), los = document.getElementById("nb-los");
  const text = (ta&&ta.value||"").trim();
  if(text.length<15){ if(st) st.textContent = "Erzähl ein paar Sätze – dann kann die KI etwas eintragen."; return; }
  nbDiktatStop();
  if(los){ los.disabled = true; los.innerHTML = '<i class="ti ti-loader-2"></i>KI ordnet zu …'; }
  if(st) st.textContent = "";
  const fertig = () => { const l = document.getElementById("nb-los"); if(l){ l.disabled = false; l.innerHTML = '<i class="ti ti-sparkles"></i>KI auswerten'; } };
  let x = null;
  try{ x = await nbKiHolen(art, text); }
  catch(e){
    fertig();
    if(st) st.textContent = "Nicht übernommen: "+(e&&e.message||"keine Verbindung")+". Die Notiz bleibt stehen.";
    return;
  }
  fertig();
  if(x) nbKiAnwenden(art, x.d, x.m);
}
/* Sterne setzen wie ein Tipp – über einheitSetStar, damit Anzeige und Wert übereinstimmen. */
function _nbStern(key, wert, max, groesse){
  const box = document.getElementById("eb-stars-"+key); if(!box || !wert) return false;
  box.dataset.val = "0";
  if(typeof einheitSetStar==="function") einheitSetStar(key, wert, max, groesse);
  return true;
}
/* Im Bogen (nur Trainer) stehen die echten Namen – „Kind 2“ aus der KI-Antwort wird zurückübersetzt. */
let _nbMaskeAktiv = null;
function nbZurueck(t){ const m=_nbMaskeAktiv; return String(t||"").replace(/Kind (\d+)/g,(x,n)=>(m&&m.zurueck&&m.zurueck["Kind "+n])||x); }
function _nbTextDazu(el, satz){
  satz = nbZurueck(satz);
  if(!el || !satz) return false;
  const alt = (el.value||"").trim();
  if(alt.includes(satz)) return false;
  el.value = (alt ? alt+" · "+satz : satz).slice(0, Number(el.getAttribute("maxlength"))||300);
  return true;
}
function nbInsTraining(e, m){
  const b = [];
  const ei = e.einheit || {};
  const n = ["spass","umsetzung","erfolg"].filter(k=>_nbStern(k, ei[k], 5, 24)).length;
  if(n) b.push(`Einheit ${n}×★`);
  if(_nbTextDazu(document.getElementById("eb-notiz"), ei.notiz)) b.push("Notiz");
  const DIM = { durchfuehrung:"Durchführung", spass:"Spaßfaktor Kinder", anforderung:"Anforderung umgesetzt" };
  let ue = 0;
  (e.uebungen||[]).forEach(u=>{
    const i = Number(u.nr)-1; if(!document.getElementById("eb-ue-"+i)) return;
    let hier = false;
    if(u.uebersprungen){ const cb=document.getElementById("eb-skip-"+i); if(cb&&!cb.checked){ cb.checked=true; if(typeof einheitSkipToggle==="function")einheitSkipToggle(i); } hier = true; }
    else Object.keys(DIM).forEach(k=>{ if(_nbStern(`ue-${i}-${DIM[k]}`, u[k], 5, 19)) hier = true; });
    if(_nbTextDazu(document.getElementById("eb-ue-notiz-"+i), u.notiz)) hier = true;
    if(hier) ue++;
  });
  if(ue) b.push(`${ue} Übung${ue>1?"en":""}`);
  const kids = (typeof EB_SPIELER!=="undefined"?EB_SPIELER:[]);
  let ki = 0;
  (e.kinder||[]).forEach(k=>{ const name = m && m.zurueck[k.kind]; const i = kids.indexOf(name); if(i>=0 && _nbStern(`sp-${i}`, k.sterne, 3, 21)) ki++; });
  if(ki) b.push(`${ki} Kind${ki>1?"er":""}`);
  return b;
}
function nbInsSpiel(e){
  if(!_FZ) return [];
  fazitTexteMerken();
  const w = _FZ.wert, b = [];
  let tm = 0;
  (e.teams||[]).forEach(t=>{
    const nr = String(t.nr); if(!_FZ.teams.some(x=>String(x.nr)===nr)) return;
    const v = w.teams[nr] = w.teams[nr] || {}; let hier = false;
    ["ordnung","pass","zweikampf","spass"].forEach(k=>{ if(t[k]){ v[k] = t[k]; hier = true; } });
    if(hier) tm++;
  });
  if(tm) b.push(`${tm} Mannschaft${tm>1?"en":""}`);
  let g = 0; (e.gaeste||[]).forEach(x=>{ if(_FZ.gaeste.includes(x.name)){ w.gaeste[x.name] = x.einschaetzung; g++; } });
  if(g) b.push(`${g} Gast${g>1?"einschätzungen":"einschätzung"}`);
  const dazu = (alt, neu) => { if(!neu) return alt; neu = nbZurueck(neu); alt=(alt||"").trim(); return alt.includes(neu) ? alt : (alt ? alt+" · "+neu : neu).slice(0,300); };
  if(e.getragen){ w.getragen = dazu(w.getragen, e.getragen); b.push("Das hat getragen"); }
  if(e.arbeiten){ w.arbeiten = dazu(w.arbeiten, e.arbeiten); b.push("Daran arbeiten wir"); }
  const o = e.orga||{}; let og = 0; ["zeitplan","felder","helfer"].forEach(k=>{ if(o[k]){ w.orga[k] = o[k]; og++; } });
  if(og) b.push("Organisation");
  fazitRender();
  return b;
}

/* ═══ v627 · Geführte Nachbereitung – Frage für Frage, Antwort-Kacheln ════════════
   PO: „Zusätzlich wäre es super, wenn ich auf Nachbewertung gehe, ich durch einen
   Bewertungsprozess durchlaufe. So wie die Multiple-Choice-Kacheln.“ Kacheln: als Standard,
   Bogen bleibt („Alles auf einen Blick“); Training, Spiel und Festival; Worte mit Sternen.

   Der Ablauf ist eine SCHICHT über dem Bogen, kein zweiter Bogen: jede Kachel setzt genau das
   Feld, das man sonst von Hand setzen würde (Sterne im DOM beim Training, _FZ.wert bei Spiel
   und Festival). Gespeichert wird am Ende über einheitSave()/fazitSpeichern() – derselbe Weg,
   dieselben Tabellen. Schritt 1 bietet die Sprachnotiz an; wer erzählt, findet die Kacheln
   danach schon vorausgewählt. Ein Tipp auf eine Kachel geht weiter; „überspringen“ lässt das
   Feld, wie es war. */
let _nbWeg = null;   // { art, schritte:[…], i }
const NB_STERNE = n => "★".repeat(n);
const NB_W = {
  spass:["kaum","wenig","okay","viel","riesig"],
  umsetzung:["gar nicht","holprig","okay","gut","genau wie geplant"],
  erfolg:["nein","kaum","teilweise","größtenteils","voll"],
  durch:["lief nicht","holprig","okay","gut","top"],
  anf:["gar nicht","selten","teilweise","meistens","durchgehend"]
};
const NB_TEAM = {
  ordnung:["Traube um den Ball","mal so, mal so","gut verteilt"],
  pass:["kaum Pässe","einige kamen an","Ketten gespielt"],
  zweikampf:["zurückgewichen","mal so, mal so","angenommen"],
  spass:["gedrückt","okay","riesig"]
};
function nbWegStart(art){
  const card = document.getElementById(art==="training" ? "eb-card" : "fz-card"); if(!card) return;
  const s = [];
  s.push({ typ:"start", titel:"Nachbewerten" });
  if(art==="training"){
    const plan = (typeof EB_PLAN!=="undefined"?EB_PLAN:[]), kids = (typeof EB_SPIELER!=="undefined"?EB_SPIELER:[]);
    const stern = (key, titel, frage, worte, max, groesse) => ({ typ:"kacheln", titel, frage,
      kacheln: worte.map((w,i)=>({ wert:i+1, label:(max===3?NB_STERNE(i+1)+" ":NB_STERNE(i+1)+" ")+w })),
      lesen:()=>(typeof einheitGetStar==="function"?einheitGetStar(key):0), setzen:v=>_nbStern(key, v, max, groesse) });
    s.push(stern("spass","Die Einheit","Wie viel Spaß hatten die Kinder?",NB_W.spass,5,24));
    s.push(stern("umsetzung","Die Einheit","Wie gut ließ sich der Plan umsetzen?",NB_W.umsetzung,5,24));
    s.push(stern("erfolg","Die Einheit","Wurde das Ziel der Einheit erreicht?",NB_W.erfolg,5,24));
    plan.forEach((p,i)=>{
      const t = `Übung ${i+1} von ${plan.length}: ${p.formName}`;
      const skip = () => !!document.getElementById("eb-skip-"+i)?.checked;
      const d = stern(`ue-${i}-Durchführung`, t, "Wie lief die Durchführung?", NB_W.durch, 5, 19);
      d.extra = { label:"⏭ fand nicht statt", an:skip, tun:()=>{ const cb=document.getElementById("eb-skip-"+i); if(cb&&!cb.checked){ cb.checked=true; if(typeof einheitSkipToggle==="function")einheitSkipToggle(i); } } };
      const setzD = d.setzen; d.setzen = v => { const cb=document.getElementById("eb-skip-"+i); if(cb&&cb.checked){ cb.checked=false; if(typeof einheitSkipToggle==="function")einheitSkipToggle(i); } setzD(v); };
      s.push(d);
      const sp = stern(`ue-${i}-Spaßfaktor Kinder`, t, "Wie viel Spaß hatten die Kinder dabei?", NB_W.spass, 5, 19); sp.weg = skip; s.push(sp);
      const an = stern(`ue-${i}-Anforderung umgesetzt`, t, "Wurde die Anforderung umgesetzt?", NB_W.anf, 5, 19); an.weg = skip;
      an.feld = { id:"eb-ue-notiz-"+i, label:"Kommentar zur Übung (optional) – steht beim nächsten Mal im Plan" };
      s.push(an);
    });
    if(kids.length) s.push({ typ:"kinder", titel:"Die Kinder", frage:"Wie waren die Kinder heute dabei?", kinder:kids });
    s.push({ typ:"text", titel:"Zum Schluss", frage:"Noch eine Notiz zur Einheit?", felder:[{ id:"eb-notiz", label:"Notiz zur Einheit (optional)" }] });
  }else{
    if(!_FZ) return;
    _FZ.teams.forEach(tm=>{
      FZ_REIHEN.forEach(re=>{
        const nr = String(tm.nr);
        s.push({ typ:"kacheln", titel:tm.name+(tm.form?" · "+tm.form:""), frage:`${re.emo} ${re.label} – ${re.hint}?`,
          kacheln: NB_TEAM[re.key].map((w,i)=>({ wert:i+1, label:w })),
          lesen:()=>((_FZ.wert.teams[nr]||{})[re.key]||0),
          setzen:v=>{ const o=_FZ.wert.teams[nr]=_FZ.wert.teams[nr]||{}; o[re.key]=v; return true; } });
      });
    });
    _FZ.gaeste.forEach(g=>s.push({ typ:"kacheln", titel:"Die Gäste", frage:`Wie stark war ${g}?`,
      kacheln: FZ_GAST.map(x=>({ wert:x.v, label:x.l })), lesen:()=>_FZ.wert.gaeste[g]||0, setzen:v=>{ _FZ.wert.gaeste[g]=v; return true; } }));
    s.push({ typ:"text", titel:"Zwei Sätze", frage:"Was hat getragen – und woran arbeitet ihr?", spiel:true,
      felder:[{ key:"getragen", label:"Das hat getragen" }, { key:"arbeiten", label:"Daran arbeiten wir" }] });
    s.push({ typ:"orga", titel:"Organisation", frage:"Hat bei der Organisation etwas gehakt? (freiwillig)" });
  }
  s.push({ typ:"ende", titel:"Fertig" });
  _nbWeg = { art, schritte:s, i:0 };
  nbWegZeichnen();
}
function nbWegAus(){
  const box = document.getElementById("nb-weg");
  const card = box && box.parentElement;
  const nb = document.getElementById("nb-box");
  const platz = card && card.querySelector("[data-nb-platz]");
  if(platz){ if(nb) platz.replaceWith(nb); else platz.remove(); }
  if(card) card.classList.remove("nb-weg-an");
  box && box.remove();
  _nbWeg = null;
  if(card) card.scrollIntoView({block:"start"});
}
function nbWegGehe(d){
  if(!_nbWeg) return;
  let i = _nbWeg.i + d;
  while(i>0 && i<_nbWeg.schritte.length-1 && _nbWeg.schritte[i].weg && _nbWeg.schritte[i].weg()) i += d>0?1:-1;
  _nbWeg.i = Math.max(0, Math.min(_nbWeg.schritte.length-1, i));
  nbWegZeichnen();
}
function nbWegWahl(wert){
  const st = _nbWeg && _nbWeg.schritte[_nbWeg.i]; if(!st) return;
  if(wert==="extra"){ st.extra && st.extra.tun(); }
  else if(st.lesen() !== wert) st.setzen(wert);
  nbWegFelderMerken();
  nbWegZeichnen();
  setTimeout(()=>nbWegGehe(1), 180);   // die Wahl kurz sehen, dann weiter
}
function nbWegKind(i, wert){
  const key = "sp-"+i;
  if((typeof einheitGetStar==="function"?einheitGetStar(key):0) !== wert) _nbStern(key, wert, 3, 21);
  nbWegZeichnen();
}
function nbWegOrga(key, wert){ if(!_FZ) return; _FZ.wert.orga[key] = (_FZ.wert.orga[key]===wert) ? undefined : wert; if(_FZ.wert.orga[key]===undefined) delete _FZ.wert.orga[key]; nbWegZeichnen(); }
/* Textfelder des Ablaufs schreiben in die Felder des Bogens bzw. in _FZ – beim Weiterblättern. */
function nbWegFelderMerken(){
  document.querySelectorAll("#nb-weg [data-nb-ziel]").forEach(el=>{
    const z = el.dataset.nbZiel;
    if(z.startsWith("#")){ const f = document.getElementById(z.slice(1)); if(f) f.value = el.value; }
    else if(_FZ) _FZ.wert[z] = el.value.slice(0,300);
  });
}
function nbWegSpeichern(){
  nbWegFelderMerken();
  const art = _nbWeg && _nbWeg.art;
  nbWegAus();
  if(art==="training"){ if(typeof einheitSave==="function") einheitSave(); }
  else fazitSpeichern();
}
function nbWegZeichnen(){
  if(!_nbWeg) return;
  const card = document.getElementById(_nbWeg.art==="training" ? "eb-card" : "fz-card"); if(!card) return;
  let box = document.getElementById("nb-weg");
  if(!box || box.parentElement!==card){
    box && box.remove();
    box = document.createElement("div"); box.id = "nb-weg";
    card.insertBefore(box, card.children[1]||null);
  }
  card.classList.add("nb-weg-an");
  const st = _nbWeg.schritte[_nbWeg.i], n = _nbWeg.schritte.length, i = _nbWeg.i;
  const kachel = (an, label, onclick, extra) => `<button type="button" class="nb-kachel" aria-pressed="${an}" onclick="${onclick}" style="display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:10px 14px;margin-bottom:8px;border:${an?"2px solid var(--blue)":"1px solid var(--rand-bedien)"};border-radius:12px;background:${an?"var(--blue-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-karte);font-weight:${an?800:600};text-align:left;cursor:pointer;${extra||""}"><span style="flex:1;min-width:0">${label}</span>${an?'<span aria-hidden="true" style="color:var(--blue-text);font-weight:900">✓</span>':""}</button>`;
  const fortschritt = `<div style="display:flex;align-items:center;gap:8px;margin:2px 0 10px"><div style="flex:1;height:6px;border-radius:3px;background:var(--surface2);overflow:hidden"><div style="height:100%;width:${Math.round(i/(n-1)*100)}%;background:var(--blue);transition:width .2s"></div></div><span style="font-size:var(--s-klein);color:var(--text2);white-space:nowrap">Schritt ${i+1} von ${n}</span></div>`;
  const fuss = (weiter) => `<div style="display:flex;gap:8px;margin-top:6px">
      ${i>0?`<button type="button" class="btn" style="min-height:48px" onclick="nbWegFelderMerken();nbWegGehe(-1)"><i class="ti ti-arrow-left"></i>Zurück</button>`:""}
      <button type="button" class="btn${weiter?" btn-p":""}" style="flex:1;min-height:48px;justify-content:center" onclick="nbWegFelderMerken();nbWegGehe(1)">${weiter||"überspringen"}</button>
    </div>
    <button type="button" onclick="nbWegFelderMerken();nbWegAus()" style="display:block;margin:10px auto 0;min-height:44px;background:none;border:none;color:var(--text2);font-family:inherit;font-size:var(--s-text);text-decoration:underline;cursor:pointer">Alles auf einen Blick</button>`;
  const kopf = `${fortschritt}<div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">${esc(st.titel)}</div>${st.frage?`<div style="font-size:var(--s-teil);font-weight:800;margin:4px 0 12px;line-height:1.3">${esc(st.frage)}</div>`:""}`;
  const fld = "width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text);resize:vertical";
  let html = "";
  if(st.typ==="start"){
    html = `${fortschritt}<div style="font-size:var(--s-teil);font-weight:800;margin:4px 0 6px">Wie möchtest du anfangen?</div>
      <div style="font-size:var(--s-text);color:var(--text2);margin-bottom:12px;line-height:1.45">Frage für Frage mit Antwort-Kacheln – oder erst frei erzählen, dann sind die Kacheln schon vorausgewählt.</div>
      <div data-nb-start></div>
      ${kachel(false,"➡️ Los geht’s – Frage für Frage","nbWegGehe(1)")}
      <button type="button" onclick="nbWegAus()" style="display:block;margin:6px auto 0;min-height:44px;background:none;border:none;color:var(--text2);font-family:inherit;font-size:var(--s-text);text-decoration:underline;cursor:pointer">Alles auf einen Blick</button>`;
  }else if(st.typ==="kacheln"){
    const akt = st.lesen();
    html = kopf + st.kacheln.map(k=>kachel(String(akt)===String(k.wert), esc(k.label), `nbWegWahl(${typeof k.wert==="number"?k.wert:"'"+k.wert+"'"})`)).join("")
      + (st.extra?kachel(st.extra.an(), esc(st.extra.label), "nbWegWahl('extra')", "border-style:dashed"):"")
      + (st.feld?`<label style="display:block;font-size:var(--s-klein);font-weight:700;color:var(--text2);margin:4px 0 8px">${esc(st.feld.label)}<input data-nb-ziel="#${st.feld.id}" value="${esc(document.getElementById(st.feld.id)?.value||"")}" maxlength="200" style="${fld};min-height:44px;margin-top:3px"></label>`:"")
      + fuss(akt?"Weiter":"");
  }else if(st.typ==="kinder"){
    html = kopf + st.kinder.map((name,k)=>{
      const v = (typeof einheitGetStar==="function"?einheitGetStar("sp-"+k):0);
      return `<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:var(--border)"><span style="flex:1;min-width:0;font-size:var(--s-text);font-weight:700">${esc(name)}</span>
        ${[["★","ruhig"],["★★","gut"],["★★★","stark"]].map(([s,l],j)=>`<button type="button" aria-pressed="${v===j+1}" aria-label="${esc(name)}: ${l}" onclick="nbWegKind(${k},${j+1})" style="min-width:58px;min-height:44px;border:${v===j+1?"2px solid var(--blue)":"1px solid var(--rand-bedien)"};border-radius:10px;background:${v===j+1?"var(--blue-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);font-weight:700;line-height:1.1;cursor:pointer">${s}<br>${l}</button>`).join("")}</div>`;
    }).join("") + fuss("Weiter");
  }else if(st.typ==="text"){
    html = kopf + st.felder.map(f=>{
      const wert = st.spiel ? (_FZ&&_FZ.wert[f.key]||"") : (document.getElementById(f.id)?.value||"");
      return `<label style="display:block;font-size:var(--s-klein);font-weight:700;color:var(--text2);margin-bottom:8px">${esc(f.label)}<textarea data-nb-ziel="${st.spiel?f.key:"#"+f.id}" rows="3" maxlength="300" style="${fld};margin-top:3px">${esc(wert)}</textarea></label>`;
    }).join("") + fuss("Weiter");
  }else if(st.typ==="orga"){
    html = kopf + FZ_ORGA.map(o=>`<div style="margin-bottom:10px"><div style="font-size:var(--s-text);font-weight:700;margin-bottom:4px">${o.emo} ${o.label}</div>
      <div style="display:flex;gap:6px">${o.stufen.map((l,j)=>{ const an=_FZ&&_FZ.wert.orga[o.key]===j+1; return `<button type="button" aria-pressed="${an}" onclick="nbWegOrga('${o.key}',${j+1})" style="flex:1;min-height:48px;border:${an?"2px solid var(--blue)":"1px solid var(--rand-bedien)"};border-radius:10px;background:${an?"var(--blue-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);font-weight:700;cursor:pointer">${esc(l)}</button>`; }).join("")}</div></div>`).join("") + fuss("Weiter");
  }else if(st.typ==="ende"){
    const zusammen = [];
    if(_nbWeg.art==="training"){
      const ist = ["spass","umsetzung","erfolg"].filter(k=>einheitGetStar(k)).length;
      zusammen.push(`Einheit: ${ist} von 3 Fragen beantwortet`);
      const plan = (typeof EB_PLAN!=="undefined"?EB_PLAN:[]);
      const ue = plan.filter((p,k)=>document.getElementById("eb-skip-"+k)?.checked || EB_DIMS.some(d=>einheitGetStar(`ue-${k}-${d.key}`))).length;
      if(plan.length) zusammen.push(`Übungen: ${ue} von ${plan.length}`);
      const kids = (typeof EB_SPIELER!=="undefined"?EB_SPIELER:[]);
      if(kids.length) zusammen.push(`Kinder: ${kids.filter((x,k)=>einheitGetStar("sp-"+k)).length} von ${kids.length}`);
    }else if(_FZ){
      _FZ.teams.forEach(t=>zusammen.push(`${t.name}: ${Object.keys(_FZ.wert.teams[String(t.nr)]||{}).length} von 4`));
      if(_FZ.gaeste.length) zusammen.push(`Gäste: ${Object.keys(_FZ.wert.gaeste).length} von ${_FZ.gaeste.length}`);
    }
    html = `${fortschritt}<div style="font-size:var(--s-teil);font-weight:800;margin:4px 0 8px">Fertig – so steht es</div>
      <div style="font-size:var(--s-text);color:var(--text2);line-height:1.6;margin-bottom:12px">${zusammen.map(esc).join("<br>")}<br>Offene Fragen bleiben leer – auch halb ausgefüllt ist besser als gar nicht.</div>
      <button type="button" class="btn btn-p" onclick="nbWegSpeichern()" style="width:100%;min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-check"></i>Speichern</button>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="btn" style="min-height:48px" onclick="nbWegGehe(-1)"><i class="ti ti-arrow-left"></i>Zurück</button>
        <button type="button" class="btn" style="flex:1;min-height:48px;justify-content:center" onclick="nbWegAus()">Alles auf einen Blick</button>
      </div>`;
  }
  /* Der Sprachnotiz-Kasten gibt es nur einmal (Kennungen nb-text, nb-mic …). In Schritt 1 steht
     er im Ablauf, sonst an seinem Platz im Bogen. Vor dem Neuzeichnen wird er herausgelöst,
     damit innerHTML ihn nicht mitnimmt. */
  let nb = document.getElementById("nb-box");
  if(nb && box.contains(nb)) nb.remove();
  if(nb && !card.querySelector("[data-nb-platz]") && card.contains(nb)){ const platz=document.createElement("div"); platz.setAttribute("data-nb-platz",""); platz.hidden=true; nb.replaceWith(platz); }
  box.innerHTML = html;
  if(nb){
    if(st.typ==="start"){ const ziel = box.querySelector("[data-nb-start]"); if(ziel) ziel.replaceWith(nb); }
    else{ const platz = card.querySelector("[data-nb-platz]"); if(platz){ platz.after(nb); } }
  }
  try{ box.scrollIntoView({block:"nearest"}); }catch(e){}
}

/* MODUL_WACHE: letzter Name der Datei. Stirbt sie vorher, fehlt genau dieser. */
function fazitModulDa(){ return true; }
