/* ═══ md-tagebuch.js · v526 — Trainertagebuch (DFB-Basis-Coach) ════════════════
   Auftragspaket: doku/auftrag-tagebuch/Auftragspaket_Tagebuch.md

   Die Rohdaten entstehen ohnehin in der App — die Nachbereitung einer Einheit
   (einheit_bewertung) und die eines Spiels oder Festivals (event_bewertung). Abgeschrieben
   wurden sie trotzdem nie, weil zwischen Erleben und Abtippen Tage lagen. Dieses Modul
   macht aus einer vorhandenen Nachbereitung einen vorausgefüllten Eintrag; die beiden
   Felder, die nur der Trainer kennt, tippt er direkt am Platz dazu.

   KEINE Vollautomatik. Ein Eintrag, der sich vollständig selbst schreibt, enthält keine
   Erkenntnis — „Aha" und „Konsequenz" bleiben Handarbeit, und ohne beide wird nicht
   gespeichert. Das ist in der Tabelle als NOT NULL verankert, nicht nur hier.
   v628 (PO-Kachel „Ja, und auch Aha/Konsequenz vorschlagen“): Aus einer Sprachnotiz schlägt
   die KI alle vier Felder vor. Pflicht bleiben sie, und erfasst wird nur, was der Trainer im
   Fenster stehen lässt – der Hinweis „Vorschlag der KI“ steht darüber, ki_vorschlag merkt es.

   Zwei Abweichungen vom Paket, beide bewusst und mit dem PO besprochen:

   1) Der Alias eines Kindes wird über ALLE Kader-Zeilen gebildet, auch die inaktiven.
      „Nach der Reihenfolge der Kader-IDs" über die gefilterte Liste wäre nur stabil,
      solange hinten Kinder dazukommen: scheidet eines aus, rutschen alle dahinter einen
      Buchstaben nach vorn, und ein Eintrag vom März meint im Oktober ein anderes Kind.
      Unbemerkt. Über alle Zeilen bleibt der Alias stabil, solange die Zeile existiert.

   2) Das Paket nennt als Auslöser die „Leitfrage der Einheit". Die gibt es im Tagesplan
      nicht: trainingsplan.kopf kennt schwerpunkt, material, beobachtung und notiz_folge;
      die leitfrage steckt nur in den Import-Vorlagen, und vorlageUebernehmenSetzen()
      schreibt sie ausdrücklich nicht in den Tag. Genommen wird deshalb kopf.schwerpunkt,
      beschriftet auch als „Schwerpunkt" — sonst stünde im Export an den Verband eine
      Leitfrage, die nie jemand gesetzt hat. */

const TB_BAUSTEINE = [
  { key:"ich",             label:"Ich als Trainer",   kurz:"ICH" },
  { key:"spiel_spieler",   label:"Spiel & Spieler",   kurz:"SPIEL & SPIELER" },
  { key:"organisation",    label:"Organisation",      kurz:"ORGANISATION" },
  { key:"system_fussball", label:"System Fußball",    kurz:"SYSTEM FUSSBALL" }
];
/* Die Lücke ist eine Erinnerung, keine Warnung: 21 Tage ohne Eintrag in einem Baustein
   sind eine Beobachtung, kein Versäumnis. Deshalb ohne Farbe und ohne Ausrufezeichen. */
const TB_LUECKE_TAGE = 21;
const TB_STERNE = [["spass","Spaß"],["umsetzung","Umsetzung"],["erfolg","Erfolg"]];

let _TB = null;      // offener Dialog: { quelle, terminId, datum, werte:{…}, namensfund }
let _TB_LISTE = [];  // zuletzt geladene Einträge der Ansicht

/* ── Aliasvergabe ──────────────────────────────────────────────────────────────
   Kind A … Kind O, danach P, Q, … — der Kader kann wachsen, und ein Alias, der bei
   fünfzehn Kindern aufhört, wäre beim sechzehnten still falsch. */
function tbAliasBuchstabe(rang){
  if(rang < 26) return String.fromCharCode(65+rang);
  return String.fromCharCode(65+Math.floor(rang/26)-1) + String.fromCharCode(65+(rang%26));
}
/* Rang über ALLE Kader-Zeilen, nach id sortiert – siehe Kopf der Datei. */
function tbAliasMap(){
  /* v628: KADER führt die Kennung als _id (loadKader) – über k.id sortierte die Liste nach
     gar nichts, und der Deckname hing an der Kader-Reihenfolge statt am Kind. */
  const kid = k => Number((typeof kaderId==="function" ? kaderId(k) : (k&&(k._id!=null?k._id:k.id))) || 0);
  const alle = (typeof KADER!=="undefined" ? (KADER||[]) : []).slice()
    .sort((a,b)=>kid(a)-kid(b));
  const map = new Map();
  alle.forEach((k,i)=>{ if(k&&k.name) map.set(k.name, "Kind "+tbAliasBuchstabe(i)); });
  return map;
}
function tbAlias(name){ return tbAliasMap().get(name) || "Kind ?"; }

/* ── Namensprüfung ─────────────────────────────────────────────────────────────
   Gesucht wird jeder Namensteil ab drei Zeichen, Vorname wie Nachname: ein Nachname im
   Tagebuch wäre schlimmer als ein Vorname, und das Paket meint erkennbar beides.
   Gefunden wird mit Wortgrenzen, sonst schlägt „Ben" in „Benutzer" an.
   KEINE stille Ersetzung: ein Vorname kann auch der eines Trainers oder eines Gegners
   sein, und fremden Text ungefragt umzuschreiben richtet mehr Schaden an als es
   verhindert. Deshalb nur ein Hinweis mit dem gefundenen Wort. */
function tbNamensfund(text){
  const t = String(text||""); if(!t.trim()) return null;
  const teile = new Set();
  (typeof KADER!=="undefined" ? (KADER||[]) : []).forEach(k=>{
    String(k&&k.name||"").split(/\s+/).forEach(w=>{ if(w.length>=3) teile.add(w); });
  });
  for(const w of teile){
    const re = new RegExp("(^|[^\\p{L}])"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"([^\\p{L}]|$)","iu");
    if(re.test(t)) return w;
  }
  return null;
}

/* ── Vorbefüllung ──────────────────────────────────────────────────────────────── */
function tbDatumDe(d){
  if(!d) return "";
  const x = new Date(String(d).slice(0,10)+"T00:00:00");
  return isNaN(x) ? String(d) : x.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});
}

async function tagebuchAusEinheit(datum){
  if(!tbAngemeldet()) return;
  let bew = null, kopf = null;
  try{
    const r = await fetch(`${SB_URL}/rest/v1/einheit_bewertung?datum=eq.${encodeURIComponent(datum)}&select=*`,{headers:sbAuthHeaders()});
    /* v630: je Trainer eine Bewertung – die eigene zählt, sonst die erste vorhandene. */
    if(r.ok){ const rows = (await r.json())||[]; const ich = await tbAutor(); bew = rows.find(x=>x.autor===ich) || rows[0] || null; }
  }catch(e){}
  try{
    const r = await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=eq.${encodeURIComponent(datum)}&select=kopf`,{headers:sbAuthHeaders()});
    if(r.ok) kopf = (((await r.json())||[])[0]||{}).kopf || null;
  }catch(e){}

  const schwerpunkt = String(kopf&&kopf.schwerpunkt||"").trim();
  const ausloeser = `Training U9 vom ${tbDatumDe(datum)}`
    + (schwerpunkt ? `, Schwerpunkt „${schwerpunkt}“` : "");
  const sterne = TB_STERNE.filter(([k])=>bew&&bew[k]).map(([k,l])=>`${l} ${bew[k]}/5`).join(" · ");
  const beobachtung = [String(bew&&bew.notiz||"").trim(), sterne,
                       String(kopf&&kopf.beobachtung||"").trim()].filter(Boolean).join("\n");

  tbOeffnen({ quelle:"einheit", terminId:null, datum, baustein:"spiel_spieler",
              ausloeser, beobachtung });
  tbKiVorschlag("d"+datum, bew&&bew.sprachnotiz, ausloeser);
}

async function tagebuchAusEvent(terminId){
  if(!tbAngemeldet()) return;
  let t = null, bew = null;
  try{
    const r = await fetch(`${SB_URL}/rest/v1/termine?id=eq.${Number(terminId)}&select=*&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok) t = ((await r.json())||[])[0]||null;
  }catch(e){}
  if(!t){ toast("Termin nicht gefunden","err"); return; }
  const autor = await tbAutor();
  try{
    const r = await fetch(`${SB_URL}/rest/v1/event_bewertung?termin_id=eq.${Number(terminId)}&select=*`,{headers:sbAuthHeaders()});
    if(r.ok) bew = ((await r.json())||[]).find(x=>x.autor===autor) || null;
  }catch(e){}

  const art = t.typ==="turnier" ? "Festival" : "Spiel";
  const ausloeser = `${art} „${String(t.titel||t.gegner||art)}“ vom ${tbDatumDe(t.datum)}`;
  const beobachtung = [
    String(bew&&bew.getragen||"").trim() ? "Das hat getragen: "+bew.getragen.trim() : "",
    String(bew&&bew.arbeiten||"").trim() ? "Daran arbeiten wir: "+bew.arbeiten.trim() : ""
  ].filter(Boolean).join("\n");

  tbOeffnen({ quelle:"event", terminId:Number(terminId), datum:t.datum,
              baustein:"organisation", ausloeser, beobachtung });
  tbKiVorschlag("t"+t.id, bew&&bew.sprachnotiz, ausloeser);
}

function tagebuchNeu(){
  if(!tbAngemeldet()) return;
  tbOeffnen({ quelle:"frei", terminId:null, datum:new Date().toISOString().slice(0,10),
              baustein:"ich", ausloeser:"", beobachtung:"" });
}

function tbAngemeldet(){
  if(typeof sbToken==="function" && sbToken()) return true;
  toast("Bitte zuerst als Trainer anmelden","err");
  return false;
}
async function tbAutor(){
  try{ return (typeof trainerMe==="function" ? (await trainerMe()) : "") || ""; }catch(e){ return ""; }
}

/* ── Dialog ────────────────────────────────────────────────────────────────────── */
function tbOeffnen(vor){
  document.getElementById("tb-modal")?.remove();
  _TB = { ...vor, werte:{ baustein:vor.baustein, ausloeser:vor.ausloeser||"",
          beobachtung:vor.beobachtung||"", aha:"", konsequenz:"", konsequenz_bis:"",
          beleg:"", anschluss:"", schlagworte:"" }, namensfund:null, fehlt:[], ki:false, kiGespeichert:null };
  const modal = document.createElement("div");
  modal.id = "tb-modal";
  modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true");
  modal.setAttribute("aria-label","Tagebucheintrag");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10060;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick = e => { if(e.target===modal) tagebuchSchliessen(); };
  const c = document.createElement("div");
  c.id = "tb-card";
  c.style.cssText = "background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c); document.body.appendChild(modal);
  tbRender();
  /* v630: Stempel – wer schreibt. Der Name kommt asynchron; nur der Stempel wird nachgezogen,
     damit schon Getipptes nicht durch ein Neuzeichnen verloren geht. */
  if(!_TB.autor) tbAutor().then(a => { if(!_TB || !a) return; _TB.autor = a;
    const st = document.getElementById("tb-stempel"); if(st && typeof stempelHtml==="function") st.innerHTML = stempelHtml(a, null, "· schreibt diesen Eintrag"); });
}
function tagebuchSchliessen(){ document.getElementById("tb-modal")?.remove(); _TB=null; }

/* Der Dialog wird bei jeder Änderung neu gezeichnet. Was getippt ist, lebt im DOM –
   ohne dieses Einsammeln wäre es beim nächsten Antippen eines Bausteins weg. */
function tbFelderLesen(){
  if(!_TB) return;
  ["ausloeser","beobachtung","aha","konsequenz","konsequenz_bis","beleg","anschluss","schlagworte"].forEach(k=>{
    const el = document.getElementById("tb-"+k);
    if(el) _TB.werte[k] = el.value;
  });
}
function tbBaustein(key){ if(!_TB) return; tbFelderLesen(); _TB.werte.baustein=key; tbRender(); }

/* Antippen schreibt den Alias an die Cursorposition des zuletzt benutzten Textfeldes –
   nie den Namen. Das ist der ganze Zweck der Leiste. */
let _TB_FOKUS = "aha";
function tbKindEinfuegen(name){
  if(!_TB) return;
  tbFelderLesen();
  const el = document.getElementById("tb-"+_TB_FOKUS) || document.getElementById("tb-aha");
  if(!el) return;
  const alias = tbAlias(name);
  const a = el.selectionStart==null ? el.value.length : el.selectionStart;
  const b = el.selectionEnd==null ? el.value.length : el.selectionEnd;
  const davor = el.value.slice(0,a), danach = el.value.slice(b);
  const luecke = davor && !/\s$/.test(davor) ? " " : "";
  el.value = davor + luecke + alias + danach;
  _TB.werte[_TB_FOKUS.replace(/^tb-/,"")] = el.value;
  el.focus();
  const pos = (davor+luecke+alias).length;
  try{ el.setSelectionRange(pos,pos); }catch(e){}
}
function tbFokus(feld){ _TB_FOKUS = feld; }

function tbRender(){
  const c = document.getElementById("tb-card"); if(!c||!_TB) return;
  const w = _TB.werte;
  const fld = "width:100%;box-sizing:border-box;min-height:48px;padding:10px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text)";
  const lbl = "font-size:var(--s-klein);font-weight:700;display:block;margin-top:10px";
  const fehlt = k => _TB.fehlt.includes(k) ? ";border-color:var(--red)" : "";
  const kinder = (typeof KADER!=="undefined" ? (KADER||[]) : []).filter(k=>k.aktiv!==false);

  c.innerHTML = `${mdlHead("tb-modal","📓","Tagebucheintrag",
      _TB.quelle==="frei" ? "Freier Eintrag" : "Aus der Nachbereitung vom "+tbDatumDe(_TB.datum),"#7c3aed")}
    <div id="tb-stempel">${typeof stempelHtml==="function"?stempelHtml(_TB.autor||(typeof _meTrainer!=="undefined"&&_meTrainer)||"Trainer",null,"· schreibt diesen Eintrag"):""}</div>

    ${_TB.ki?`<div role="status" style="background:var(--surface2);border:var(--border-s);border-left:4px solid var(--purple);border-radius:10px;padding:10px 12px;font-size:var(--s-text);line-height:1.5;margin-top:10px">✨ <b>Vorschlag der KI aus deiner Sprachnotiz.</b> Baustein, Beobachtung, Aha, Konsequenz und Schlagworte sind vorausgefüllt – prüfe sie und schreib sie in deinen Worten, bevor du erfasst.</div>`:""}
    ${(!_TB.ki && _TB.kiGespeichert)?`<button class="btn" id="tb-ki-los" onclick="tbKiAusGespeichert()" style="width:100%;min-height:48px;margin-top:10px;justify-content:center"><i class="ti ti-sparkles"></i>Vorschlag aus der Sprachnotiz</button>`:""}
    <div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:14px 0 6px">Baustein</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${TB_BAUSTEINE.map(b=>{const an=w.baustein===b.key;
        return `<button onclick="tbBaustein('${b.key}')" aria-pressed="${an}" style="flex:1 1 46%;min-height:48px;font-size:var(--s-text);border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${an?"var(--blue)":"var(--surface2)"};color:${an?"#fff":"var(--text2)"};font-weight:${an?"800":"600"}">${an?"✓ ":""}${b.label}</button>`;}).join("")}
    </div>

    <label style="${lbl}">Auslöser<span style="font-weight:500;color:var(--text3)"> · vorausgefüllt</span>
      <textarea id="tb-ausloeser" class="wachsen" rows="2" onfocus="tbFokus('ausloeser')" style="${fld}${fehlt("ausloeser")};resize:vertical;margin-top:3px">${esc(w.ausloeser)}</textarea></label>

    <label style="${lbl}">Beobachtung<span style="font-weight:500;color:var(--text3)"> · vorausgefüllt</span>
      <textarea id="tb-beobachtung" class="wachsen" rows="3" onfocus="tbFokus('beobachtung')" style="${fld};resize:vertical;margin-top:3px">${esc(w.beobachtung)}</textarea></label>

    ${kinder.length?`<div style="margin-top:10px">
      <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:4px">Kind einfügen – schreibt den Decknamen, nicht den Namen</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${kinder.map(k=>`<button onclick="tbKindEinfuegen('${jsq(k.name)}')" title="Fügt ${esc(tbAlias(k.name))} ein" style="min-height:36px;padding:0 10px;font-size:var(--s-text);border:1px solid var(--rand-bedien);border-radius:14px;background:var(--surface2);color:var(--text2);cursor:pointer;font-family:inherit">${esc(k.name)}</button>`).join("")}
      </div>
      <div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">Der Deckname bleibt an dasselbe Kind gebunden, solange es im Kader steht.</div>
    </div>`:""}

    <label style="${lbl}">Aha<span style="color:var(--red)"> · Pflicht</span>
      <textarea id="tb-aha" class="wachsen" rows="3" onfocus="tbFokus('aha')" placeholder="Was hast du verstanden, das du vorher nicht wusstest?" style="${fld}${fehlt("aha")};resize:vertical;margin-top:3px">${esc(w.aha)}</textarea></label>

    <label style="${lbl}">Konsequenz<span style="color:var(--red)"> · Pflicht</span>
      <textarea id="tb-konsequenz" class="wachsen" rows="2" onfocus="tbFokus('konsequenz')" placeholder="Was machst du beim nächsten Mal anders?" style="${fld}${fehlt("konsequenz")};resize:vertical;margin-top:3px">${esc(w.konsequenz)}</textarea></label>

    <label style="${lbl}">Schlagworte<span style="font-weight:500;color:var(--text3)"> · zum Wiederfinden, mit Komma getrennt</span>
      <input type="text" id="tb-schlagworte" value="${esc(w.schlagworte)}" placeholder="z. B. Passspiel, Raumaufteilung, Motivation" style="${fld};margin-top:3px"></label>

    <label style="${lbl}">Bis wann<span style="font-weight:500;color:var(--text3)"> · optional</span>
      <input type="date" id="tb-konsequenz_bis" value="${esc(w.konsequenz_bis)}" style="${fld};margin-top:3px"></label>

    <label style="${lbl}">Beleg<span style="font-weight:500;color:var(--text3)"> · optional</span>
      <input type="text" id="tb-beleg" onfocus="tbFokus('beleg')" value="${esc(w.beleg)}" placeholder="Foto-Hinweis, Zitat, Quelle" style="${fld};margin-top:3px"></label>

    <label style="${lbl}">Anschluss<span style="font-weight:500;color:var(--text3)"> · optional</span>
      <input type="text" id="tb-anschluss" onfocus="tbFokus('anschluss')" value="${esc(w.anschluss)}" placeholder="Leitfrage, Übung oder App-Feld" style="${fld};margin-top:3px"></label>

    <div id="tb-meldung" style="margin-top:10px">${_TB.namensfund?tbNamensHinweis(_TB.namensfund):""}</div>

    <button class="btn btn-p" onclick="tagebuchSpeichern()" style="width:100%;min-height:56px;margin-top:12px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-check"></i>Eintrag erfassen</button>
    <button class="btn" onclick="tagebuchSchliessen()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>`;
  if(typeof felderWachsen==="function") felderWachsen(c);
}

function tbNamensHinweis(wort){
  return `<div style="background:var(--surface2);border:var(--border-s);border-left:4px solid var(--amber);border-radius:10px;padding:10px 12px;font-size:var(--s-text);line-height:1.5">
    Im Text steht „<b>${esc(wort)}</b>“ – das ist ein Name aus dem Kader. Das Tagebuch geht später an den Verband; dort sollen Kinder nicht mit Namen stehen.
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="tbNamenErsetzen('${jsq(wort)}')" style="min-height:48px">Durch den Decknamen ersetzen</button>
      <button class="btn btn-sm" onclick="tbTrotzdemSpeichern()" style="min-height:48px">So lassen und erfassen</button>
    </div>
    <div style="font-size:var(--s-klein);color:var(--text3);margin-top:6px">Nichts wird von selbst umgeschrieben – der Name kann auch der eines Trainers oder eines Gegners sein.</div>
  </div>`;
}
/* Ersetzt NUR auf ausdrückliches Antippen, und nur das eine gefundene Wort. */
function tbNamenErsetzen(wort){
  if(!_TB) return;
  tbFelderLesen();
  const treffer = (typeof KADER!=="undefined" ? (KADER||[]) : [])
    .find(k=>String(k.name||"").split(/\s+/).some(w=>w.toLowerCase()===String(wort).toLowerCase()));
  const alias = treffer ? tbAlias(treffer.name) : "Kind ?";
  const re = new RegExp("(^|[^\\p{L}])("+String(wort).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")([^\\p{L}]|$)","giu");
  ["ausloeser","beobachtung","aha","konsequenz","beleg","anschluss"].forEach(k=>{
    _TB.werte[k] = String(_TB.werte[k]||"").replace(re,(m,a,b,c)=>a+alias+c);
  });
  _TB.namensfund = null;
  tbRender();
  toast("Name durch "+alias+" ersetzt");
}
function tbTrotzdemSpeichern(){ if(_TB){ _TB.namensfund=null; _TB.uebergehen=true; tagebuchSpeichern(); } }

async function tagebuchSpeichern(){
  if(!_TB) return;
  tbFelderLesen();
  const w = _TB.werte;
  /* Pflichtfelder: der bereits getippte Text bleibt stehen – nichts wird verworfen,
     nur nicht gesendet. */
  _TB.fehlt = ["ausloeser","aha","konsequenz"].filter(k=>!String(w[k]||"").trim());
  if(_TB.fehlt.length){
    tbRender();
    const m = document.getElementById("tb-meldung");
    const was = _TB.fehlt.map(k=>({ausloeser:"Auslöser",aha:"Aha",konsequenz:"Konsequenz"})[k]).join(" und ");
    if(m) m.innerHTML = `<div style="background:var(--surface2);border:var(--border-s);border-left:4px solid var(--red);border-radius:10px;padding:10px 12px;font-size:var(--s-text)">Ohne <b>${esc(was)}</b> wird nicht erfasst – ein Eintrag ohne Erkenntnis und ohne Vorhaben ist keiner. Der Rest bleibt stehen.</div>`;
    return;
  }
  if(!_TB.uebergehen){
    const fund = tbNamensfund([w.ausloeser,w.beobachtung,w.aha,w.konsequenz,w.beleg,w.anschluss,w.schlagworte].join("\n"));
    if(fund){ _TB.namensfund = fund; tbRender(); return; }
  }

  const body = { autor: await tbAutor(), datum:_TB.datum, quelle:_TB.quelle,
                 termin_id:_TB.terminId, baustein:w.baustein,
                 ausloeser:w.ausloeser.trim(), beobachtung:w.beobachtung.trim()||null,
                 aha:w.aha.trim(), konsequenz:w.konsequenz.trim(),
                 konsequenz_bis:w.konsequenz_bis||null,
                 beleg:w.beleg.trim()||null, anschluss:w.anschluss.trim()||null,
                 schlagworte:tbSchlagworte(w.schlagworte), ki_vorschlag:!!_TB.ki,
                 updated_at:new Date().toISOString() };
  try{
    const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag`,
      {method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r)) return;
    if(!r.ok && r.status!==201){ toast(sbDeniedMsg(r,"Konnte nicht erfassen"),"err"); return; }
  }catch(e){ toast("Netzwerkfehler – der Eintrag steht noch im Fenster","err"); return; }
  toast("Eintrag erfasst ✓");
  tagebuchSchliessen();
  if(typeof tagebuchListe==="function" && document.getElementById("tb-liste")) tagebuchListe();
}

/* ── Ansicht ───────────────────────────────────────────────────────────────────── */
async function tagebuchListe(){
  const box = document.getElementById("tb-liste"); if(!box) return;
  if(typeof sbToken==="function" && !sbToken()){ box.innerHTML = tbLeer("Nicht angemeldet.","Melde dich als Trainer an, dann steht das Tagebuch hier."); return; }
  box.innerHTML = '<div style="font-size:var(--s-text);color:var(--text3);padding:8px">Lade …</div>';
  try{
    const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?select=*&order=datum.desc,id.desc&limit=200`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)) return;
    if(!r.ok){ box.innerHTML = tbLeer("Keine Verbindung.","Sobald du wieder online bist, stehen die Einträge hier."); return; }
    _TB_LISTE = (await r.json())||[];
  }catch(e){ box.innerHTML = tbLeer("Offline.","Sobald du wieder online bist, stehen die Einträge hier."); return; }
  tbListeRender();
}
function tbLeer(satz, zweiter){
  return `<div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:16px;text-align:center">
    <div style="font-size:var(--s-text);font-weight:700">${esc(satz)}</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-top:4px">${esc(zweiter)}</div></div>`;
}
function tbListeRender(){
  const box = document.getElementById("tb-liste"); if(!box) return;
  if(!_TB_LISTE.length){
    box.innerHTML = `<div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:16px;text-align:center">
      <div style="font-size:var(--s-text);font-weight:700">Noch kein Eintrag.</div>
      <div style="font-size:var(--s-text);color:var(--text2);margin:4px 0 10px">Der erste entsteht am schnellsten direkt nach einer Nachbereitung.</div>
      <button class="btn btn-p" onclick="tagebuchNeu()" style="min-height:56px;justify-content:center;width:100%;font-size:var(--s-karte);font-weight:800"><i class="ti ti-plus"></i>Neuer Eintrag</button></div>`;
    return;
  }
  const heute = new Date();
  /* v628: Schlagworte zum Wiederfinden – oben die häufigsten, ein Tipp filtert. */
  const zaehl = {};
  _TB_LISTE.forEach(e=>(Array.isArray(e.schlagworte)?e.schlagworte:[]).forEach(x=>{ zaehl[x]=(zaehl[x]||0)+1; }));
  const top = Object.keys(zaehl).sort((a,b)=>zaehl[b]-zaehl[a]||a.localeCompare(b)).slice(0,12);
  const liste = _TB_FILTER ? _TB_LISTE.filter(e=>(e.schlagworte||[]).includes(_TB_FILTER)) : _TB_LISTE;
  const themen = top.length ? `<div style="margin-bottom:12px"><div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:5px">Themen</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">${top.map(x=>`<button type="button" onclick="tbFilter('${jsq(x)}')" aria-pressed="${_TB_FILTER===x}" style="min-height:36px;padding:0 11px;border:1px solid var(--rand-bedien);border-radius:18px;background:${_TB_FILTER===x?"var(--purple-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);font-weight:700;cursor:pointer">#${esc(x)} · ${zaehl[x]}</button>`).join("")}</div>
    ${_TB_FILTER?`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:5px">${liste.length} Eintr${liste.length===1?"ag":"äge"} zu „${esc(_TB_FILTER)}“ – noch einmal tippen hebt den Filter auf.</div>`:""}</div>` : "";
  box.innerHTML = themen + TB_BAUSTEINE.map(b=>{
    const eintraege = liste.filter(e=>e.baustein===b.key);
    const juengst = eintraege[0] ? eintraege[0].datum : null;
    const tage = juengst ? Math.floor((heute - new Date(juengst+"T00:00:00"))/864e5) : null;
    const luecke = (tage===null || tage>TB_LUECKE_TAGE);
    return `<div style="margin-bottom:16px">
      <div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:4px">${esc(b.label)} · ${eintraege.length}</div>
      ${luecke?`<div style="font-size:var(--s-klein);color:var(--text3);margin-bottom:6px">${juengst?`Seit dem ${tbDatumDe(juengst)} nichts notiert.`:"Noch nichts notiert."}</div>`:""}
      ${eintraege.map(tbZeile).join("")}
    </div>`;
  }).join("");
}
function tbZeile(e){
  const worte = Array.isArray(e.schlagworte) ? e.schlagworte : [];
  return `<div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:11px 12px;margin-bottom:6px">
    <div style="font-size:var(--s-klein);color:var(--text3)">${tbDatumDe(e.datum)} · ${esc(stempelText(e.autor, e.updated_at||e.created_at))}${e.ki_vorschlag?" · ✨ aus Sprachnotiz":""}</div>
    ${worte.length?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">${worte.map(x=>`<button type="button" onclick="tbFilter('${jsq(x)}')" aria-pressed="${_TB_FILTER===x}" style="min-height:32px;padding:0 10px;border:1px solid var(--rand-bedien);border-radius:16px;background:${_TB_FILTER===x?"var(--purple-bg)":"var(--surface2)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);font-weight:700;cursor:pointer">#${esc(x)}</button>`).join("")}</div>`:""}
    <div style="font-size:var(--s-text);font-weight:700;margin-top:2px">${esc(e.ausloeser)}</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-top:4px;line-height:1.5"><b>Aha:</b> ${esc(e.aha)}</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-top:2px;line-height:1.5"><b>Konsequenz:</b> ${esc(e.konsequenz)}${e.konsequenz_bis?` (bis ${tbDatumDe(e.konsequenz_bis)})`:""}</div>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button class="btn btn-sm" onclick="tagebuchKopieren(${Number(e.id)})" style="min-height:36px"><i class="ti ti-copy"></i>Kopieren</button>
      <button class="btn btn-sm" onclick="tagebuchTeilen(${Number(e.id)})" style="min-height:36px"><i class="ti ti-share"></i>Teilen</button>
    </div>
  </div>`;
}

/* ── Export ────────────────────────────────────────────────────────────────────── */
function tagebuchExport(id){
  const e = _TB_LISTE.find(x=>Number(x.id)===Number(id));
  if(!e) return "";
  return tbMarkdown(e);
}
function tbMarkdown(e){
  const b = TB_BAUSTEINE.find(x=>x.key===e.baustein);
  const z = [];
  z.push(`### ${tbDatumDe(e.datum)} — ${b?b.kurz:String(e.baustein).toUpperCase()}`);
  z.push("");
  z.push(`- **Auslöser:** ${String(e.ausloeser||"").replace(/\n/g," ")}`);
  z.push(`- **Beobachtung:** ${String(e.beobachtung||"").replace(/\n/g," ")}`);
  z.push(`- **Aha:** ${String(e.aha||"").replace(/\n/g," ")}`);
  z.push(`- **Konsequenz:** ${String(e.konsequenz||"").replace(/\n/g," ")}${e.konsequenz_bis?` (bis ${tbDatumDe(e.konsequenz_bis)})`:""}`);
  z.push(`- **Beleg:** ${String(e.beleg||"").replace(/\n/g," ")}`);
  z.push(`- **Anschluss:** ${String(e.anschluss||"").replace(/\n/g," ")}`);
  if(Array.isArray(e.schlagworte) && e.schlagworte.length) z.push(`- **Schlagworte:** ${e.schlagworte.join(", ")}`);
  return z.join("\n");
}
/* Der Monatsexport sortiert nach Bausteinen, nicht nach Datum: so liest die Abgabe sich
   als Entwicklung je Baustein und nicht als Chronik. */
function tagebuchMonatMarkdown(monat){
  const m = monat || new Date().toISOString().slice(0,7);
  const drin = _TB_LISTE.filter(e=>String(e.datum||"").slice(0,7)===m);
  if(!drin.length) return "";
  const kopf = new Date(m+"-01T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  const teile = [`## Trainertagebuch — ${kopf}`,""];
  TB_BAUSTEINE.forEach(b=>{
    const e = drin.filter(x=>x.baustein===b.key)
      .sort((a,c)=>String(a.datum).localeCompare(String(c.datum)));
    if(!e.length) return;
    teile.push(...e.map(tbMarkdown), "");
  });
  return teile.join("\n").trim();
}
async function tbInDieZwischenablage(text){
  try{ await navigator.clipboard.writeText(text); toast("In die Zwischenablage kopiert ✓"); return true; }
  catch(e){ toast("Kopieren ging nicht – markiere den Text im Teilen-Fenster","err"); return false; }
}
function tagebuchKopieren(id){ const t=tagebuchExport(id); if(t) tbInDieZwischenablage(t); }
/* Der Weg nach Google Drive laeuft ueber das Teilen-Menue des Geraets, nicht ueber eine
   Schnittstelle: keine Zugangsdaten in der App, kein Serveraufruf. Ohne navigator.share
   faellt es auf einen Download zurueck. */
function tagebuchTeilen(id){
  const t = tagebuchExport(id); if(!t) return;
  const e = _TB_LISTE.find(x=>Number(x.id)===Number(id));
  tbTeilen(t, "tagebuch-"+String(e&&e.datum||"").slice(0,10)+".md");
}
function tagebuchMonatTeilen(){
  const m = document.getElementById("tb-monat")?.value || new Date().toISOString().slice(0,7);
  const t = tagebuchMonatMarkdown(m);
  if(!t){ toast("In diesem Monat steht noch kein Eintrag","err"); return; }
  tbTeilen(t, "tagebuch-"+m+".md");
}
function tagebuchMonatKopieren(){
  const m = document.getElementById("tb-monat")?.value || new Date().toISOString().slice(0,7);
  const t = tagebuchMonatMarkdown(m);
  if(!t){ toast("In diesem Monat steht noch kein Eintrag","err"); return; }
  tbInDieZwischenablage(t);
}
function tbTeilen(text, datei){
  if(navigator.share){ navigator.share({title:"Trainertagebuch",text}).catch(()=>{}); return; }
  try{
    const url = URL.createObjectURL(new Blob([text],{type:"text/markdown;charset=utf-8"}));
    const a = document.createElement("a"); a.href=url; a.download=datei; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){ tbInDieZwischenablage(text); }
}

/* ═══ v628 · KI-Vorschlag aus der Sprachnotiz ═══════════════════════════════════
   PO-Kachel: „Ja, und auch Aha/Konsequenz vorschlagen“ – das hebt die v526-Regel „Aha und
   Konsequenz bleiben Handarbeit“ bewusst auf. Pflicht bleiben sie trotzdem: gespeichert wird
   nur, was im Fenster steht, und das Fenster sagt deutlich, dass es ein Vorschlag ist.
   Quelle 1: der Vorschlag, den die Nachbereitung eben mitgebracht hat (md-fazit.js, _nbTb).
   Quelle 2: die gespeicherte Sprachnotiz – dann auf Knopfdruck, weil es ein KI-Aufruf ist. */
let _TB_FILTER = null;
function tbFilter(wort){ _TB_FILTER = (_TB_FILTER===wort) ? null : wort; tbListeRender(); }
function tbSchlagworte(t){
  return [...new Set(String(t||"").split(/[,;#\n]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.slice(0,40)))].slice(0,8);
}
function tbKiAnwenden(v){
  if(!_TB || !v) return false;
  tbFelderLesen();
  const w = _TB.werte;
  if(v.baustein) w.baustein = v.baustein;
  if(v.beobachtung) w.beobachtung = w.beobachtung ? v.beobachtung+"\n"+w.beobachtung : v.beobachtung;
  if(v.aha && !String(w.aha||"").trim()) w.aha = v.aha;
  if(v.konsequenz && !String(w.konsequenz||"").trim()) w.konsequenz = v.konsequenz;
  if(Array.isArray(v.schlagworte) && v.schlagworte.length) w.schlagworte = v.schlagworte.join(", ");
  _TB.ki = true;
  tbRender();
  return true;
}
function tbKiVorschlag(fuer, gespeichert, anlass){
  if(!_TB) return;
  const v = (typeof nbTagebuchVorschlag==="function") ? nbTagebuchVorschlag(fuer) : null;
  if(v){ tbKiAnwenden(v); return; }
  if(String(gespeichert||"").trim().length>=15){ _TB.kiGespeichert = { text:String(gespeichert), anlass:anlass||"" }; tbRender(); }
}
async function tbKiAusGespeichert(){
  if(!_TB || !_TB.kiGespeichert) return;
  const b = document.getElementById("tb-ki-los");
  if(b){ b.disabled = true; b.innerHTML = '<i class="ti ti-loader-2"></i>KI liest die Notiz …'; }
  const m = (typeof nbMaske==="function") ? nbMaske([]) : null;
  const text = m ? m.weg(_TB.kiGespeichert.text) : _TB.kiGespeichert.text;
  try{
    const r = await fetch(`${SB_URL}/functions/v1/ki-nachbereitung`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},
      body:JSON.stringify({ art:"tagebuch", text, anlass:_TB.kiGespeichert.anlass })});
    const d = await r.json().catch(()=>null);
    if(!r.ok || !d || !d.ergebnis || !d.ergebnis.tagebuch) throw new Error((d&&d.error)||"kein Vorschlag");
    const v = (typeof nbTbDecknamen==="function") ? nbTbDecknamen(d.ergebnis.tagebuch, m) : d.ergebnis.tagebuch;
    tbKiAnwenden(v);
  }catch(e){
    if(b){ b.disabled = false; b.innerHTML = '<i class="ti ti-sparkles"></i>Vorschlag aus der Sprachnotiz'; }
    toast("Kein Vorschlag: "+(e&&e.message||"keine Verbindung"),"err");
  }
}

/* MODUL_WACHE: letzte Funktion der Datei. Stirbt sie vorher, fehlt genau dieser Name. */
function tagebuchModulDa(){ return true; }
