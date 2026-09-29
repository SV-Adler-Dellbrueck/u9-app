/* ═══ md-tagebuch.js · v526, v679 — Trainertagebuch (DFB-Basis-Coach) ═══════════
   v679: Tagebuch als Arbeitsmittel (doku/auftrag-tagebuch-alltag) und Vorschlag sortiert statt
   geschrieben (doku/auftrag-tagebuch-ki-sortieren): Gedanke, Keim, Wiedervorlage, Sicht je Kind,
   getrennte Ausgaben, feste Buchstaben, Prüfkarte, „Wie war's?“. Die Einzelheiten stehen jeweils
   am Abschnitt. Ab hier der ursprüngliche Kopf.
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
  /* v679 (Nachtrag 28.09., Abschnitt 2): Der Buchstabe steht fest in kader.alias – einmal vergeben,
     nie wieder vergeben, auch nicht nach dem Löschen eines Kindes. Die Migration hat jedem Kind genau
     den Buchstaben gegeben, den die Rangfolge bis v678 lieferte; alle alten Exporte bleiben gültig.
     Nur solange die Datenbank die Spalte noch nicht kennt (kein Kind trägt einen Buchstaben), gilt
     die alte Rangfolge weiter. */
  const alle = (typeof KADER!=="undefined" ? (KADER||[]) : []);
  const map = new Map();
  if(alle.some(k=>k&&k.alias)){
    alle.forEach(k=>{ if(k&&k.name) map.set(k.name, k.alias ? "Kind "+k.alias : "Kind ?"); });
    return map;
  }
  /* v628: KADER führt die Kennung als _id (loadKader) – über k.id sortierte die Liste nach
     gar nichts, und der Deckname hing an der Kader-Reihenfolge statt am Kind. */
  const kid = k => Number((typeof kaderId==="function" ? kaderId(k) : (k&&(k._id!=null?k._id:k.id))) || 0);
  alle.slice().sort((a,b)=>kid(a)-kid(b)).forEach((k,i)=>{ if(k&&k.name) map.set(k.name, "Kind "+tbAliasBuchstabe(i)); });
  return map;
}
function tbAlias(name){ return tbAliasMap().get(name) || "Kind ?"; }

/* ── v638 · Klarnamen in der App, Buchstaben nach außen ──────────────────────────
   PO: „… dass für mein eigenes Tagebuch innerhalb der App die Klarnamen, also die Vornamen der
   Spieler, die ich dort nenne, auch erfasst werden und dass es eine Version gibt, die ich zum
   Beispiel dann für die Trainerlehrgänge nutzen kann. Dort soll dann auch der Hinweis gegeben
   werden, dass die tatsächlichen Namen durch Buchstaben ersetzt werden.“
   Das Tagebuch liegt nur beim Trainerteam (RLS is_trainer) und darf Vornamen tragen. Alles, was die
   App verlässt – Kopieren, Teilen, Monatsexport –, geht durch tbPseudonym und trägt TB_HINWEIS.
   Die Decknamen (tbAlias) bleiben stabil an der Kader-Kennung; derselbe Buchstabe meint überall
   dasselbe Kind. */
const TB_HINWEIS = "Hinweis: Aus Datenschutzgründen sind die Namen der Kinder durch Buchstaben ersetzt (z. B. „Kind C“). Derselbe Buchstabe steht im ganzen Tagebuch für dasselbe Kind.";
/* Vorname eines Kindes; teilen sich zwei Kinder den Vornamen, der volle Name. */
function tbVorname(name){
  const n = String(name||"").trim(), v = n.split(/\s+/)[0];
  if(!v || v===n) return n;
  const gleich = (typeof KADER!=="undefined" ? (KADER||[]) : []).filter(k=>String(k&&k.name||"").split(/\s+/)[0]===v).length;
  return gleich>1 ? n : v;
}
/* Ersetzt volle Namen und eindeutige Vornamen aus dem Kader durch den Decknamen. Ein Vorname, den
   zwei Kinder tragen, wird zu „ein Kind“ – lieber unscharf als einem falschen Kind zugeordnet. */
function tbPseudonym(text){
  const t = String(text||""); if(!t) return t;
  const map = tbAliasMap(), ziel = {}, vorn = {};
  map.forEach((alias, name)=>{
    ziel[String(name).toLowerCase()] = alias;
    const v = String(name).split(/\s+/)[0];
    if(v && v.length>=2 && v!==name) (vorn[v.toLowerCase()] = vorn[v.toLowerCase()] || []).push(alias);
  });
  Object.keys(vorn).forEach(v=>{ if(!ziel[v]) ziel[v] = vorn[v].length===1 ? vorn[v][0] : "ein Kind"; });
  const keys = Object.keys(ziel).sort((a,b)=>b.length-a.length);
  if(!keys.length) return t;
  const re = new RegExp("(^|[^\\p{L}])("+keys.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")(?![\\p{L}])","giu");
  return t.replace(re, (all, vor, name)=>vor+(ziel[name.toLowerCase()]||name));
}

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
  /* v679: Liegt zu diesem Tag schon ein Vorschlag aus der Sprachnotiz, wird der geprüft – kein zweiter Eintrag. */
  const vid = tbVorschlagIdFuer("d"+datum); if(vid){ tbPruefenOpen(vid); return; }
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
  tbKiVorschlag("d"+datum);
}

async function tagebuchAusEvent(terminId){
  if(!tbAngemeldet()) return;
  const vid = tbVorschlagIdFuer("t"+Number(terminId)); if(vid){ tbPruefenOpen(vid); return; }
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
  tbKiVorschlag("t"+t.id);
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
/* v679: Der Dialog öffnet auch einen vorhandenen Eintrag (vor.id) – einen Keim zum Ausarbeiten oder
   einen Vorschlag zum Korrigieren. Konsequenzen sind eine Liste mit je einem Datum (tagebuch_punkt);
   die erste Zeile behält die alten Kennungen tb-konsequenz / tb-konsequenz_bis. */
function tbOeffnen(vor){
  document.getElementById("tb-modal")?.remove();
  const kons = Array.isArray(vor.kons) && vor.kons.length ? vor.kons.map(k=>({...k}))
             : [{ id:null, text:vor.konsequenz||"", bis:vor.konsequenz_bis||"", erledigt_am:null }];
  _TB = { ...vor, werte:{ baustein:vor.baustein||null, ausloeser:vor.ausloeser||"",
          beobachtung:vor.beobachtung||"", aha:vor.aha||"", konsequenz:kons[0].text||"", konsequenz_bis:kons[0].bis||"",
          beleg:vor.beleg||"", anschluss:vor.anschluss||"", schlagworte:vor.schlagworte||"" },
          kons, kinder:new Set(vor.kinder||[]), namensfund:null, fehlt:[], ki:!!vor.ki, kiGespeichert:null };
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
  ["ausloeser","beobachtung","aha","beleg","anschluss","schlagworte"].forEach(k=>{
    const el = document.getElementById("tb-"+k);
    if(el) _TB.werte[k] = el.value;
  });
  (_TB.kons||[]).forEach((k,i)=>{
    const t = document.getElementById(i ? "tb-konsequenz-"+i : "tb-konsequenz");
    const b = document.getElementById(i ? "tb-konsequenz_bis-"+i : "tb-konsequenz_bis");
    if(t) k.text = t.value; if(b) k.bis = b.value;
  });
  if(_TB.kons && _TB.kons[0]){ _TB.werte.konsequenz = _TB.kons[0].text||""; _TB.werte.konsequenz_bis = _TB.kons[0].bis||""; }
}
function tbBaustein(key){ if(!_TB) return; tbFelderLesen(); _TB.werte.baustein=key; tbRender(); }
function tbKonsDazu(){ if(!_TB) return; tbFelderLesen(); if(_TB.kons.length<5) _TB.kons.push({id:null,text:"",bis:"",erledigt_am:null}); tbRender(); }
/* v679 · Wer kommt vor? Gesetzt beim Ausarbeiten, von Hand – nie aus dem Text geraten. */
function tbKindUmschalten(kid){ if(!_TB) return; tbFelderLesen(); kid = Number(kid); if(_TB.kinder.has(kid)) _TB.kinder.delete(kid); else _TB.kinder.add(kid); tbRender(); }

/* Antippen schreibt den Vornamen an die Cursorposition des zuletzt benutzten Textfeldes
   (v638, vorher den Decknamen – die Buchstaben entstehen jetzt erst beim Teilen und Exportieren). */
let _TB_FOKUS = "aha";
function tbKindEinfuegen(name){
  if(!_TB) return;
  tbFelderLesen();
  const el = document.getElementById("tb-"+_TB_FOKUS) || document.getElementById("tb-aha");
  if(!el) return;
  const alias = tbVorname(name);
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
  const kinder = (typeof KADER!=="undefined" ? (KADER||[]) : []).filter(k=>k.aktiv!==false);
  const fuerFertig = '<span style="font-weight:500;color:var(--text3)"> · für einen fertigen Eintrag</span>';
  const titel = _TB.id ? (_TB.status==="keim" ? "Gedanke ausarbeiten" : "Eintrag bearbeiten")
              : (_TB.quelle==="frei" ? "Freier Eintrag" : "Aus der Nachbereitung vom "+tbDatumDe(_TB.datum));

  c.innerHTML = `${mdlHead("tb-modal","📓","Tagebucheintrag", titel,"#7c3aed")}
    <div id="tb-stempel">${typeof stempelHtml==="function"?stempelHtml(_TB.autor||(typeof _meTrainer!=="undefined"&&_meTrainer)||"Trainer",null,"· schreibt diesen Eintrag"):""}</div>

    ${_TB.ki?`<div role="status" style="background:var(--surface2);border:var(--border-s);border-left:4px solid var(--purple);border-radius:10px;padding:10px 12px;font-size:var(--s-text);line-height:1.5;margin-top:10px">✨ <b>Vorschlag aus deiner Sprachnotiz</b> – deine Worte, sortiert. Was du hier änderst und erfasst, gilt als bestätigt.</div>`:""}
    <div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:14px 0 6px">Baustein</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${TB_BAUSTEINE.map(b=>{const an=w.baustein===b.key;
        return `<button onclick="tbBaustein('${b.key}')" aria-pressed="${an}" style="flex:1 1 46%;min-height:48px;font-size:var(--s-text);border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${an?"var(--blue)":"var(--surface2)"};color:${an?"#fff":"var(--text2)"};font-weight:${an?"800":"600"}">${an?"✓ ":""}${b.label}</button>`;}).join("")}
    </div>

    <label style="${lbl}">Auslöser${_TB.quelle==="frei"&&!_TB.id?fuerFertig:'<span style="font-weight:500;color:var(--text3)"> · vorausgefüllt</span>'}
      <textarea id="tb-ausloeser" class="wachsen" rows="2" onfocus="tbFokus('ausloeser')" style="${fld};resize:vertical;margin-top:3px">${esc(w.ausloeser)}</textarea></label>

    <label style="${lbl}">Beobachtung<span style="font-weight:500;color:var(--text3)"> · ${_TB.status==="keim"?"dein Gedanke":"vorausgefüllt"}</span>
      <textarea id="tb-beobachtung" class="wachsen" rows="3" onfocus="tbFokus('beobachtung')" style="${fld};resize:vertical;margin-top:3px">${esc(w.beobachtung)}</textarea></label>

    ${kinder.length?`<div style="margin-top:10px">
      <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:4px">Kind einfügen – hier steht der Vorname; beim Teilen und Exportieren wird daraus ein Buchstabe</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${kinder.map(k=>`<button onclick="tbKindEinfuegen('${jsq(k.name)}')" title="Fügt ${esc(tbVorname(k.name))} ein – nach außen ${esc(tbAlias(k.name))}" style="min-height:36px;padding:0 10px;font-size:var(--s-text);border:1px solid var(--rand-bedien);border-radius:14px;background:var(--surface2);color:var(--text2);cursor:pointer;font-family:inherit">${esc(k.name)}</button>`).join("")}
      </div>
      <div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">Der Buchstabe gehört fest zu diesem Kind – auch wenn andere den Kader verlassen.</div>
      <details style="margin-top:8px"${_TB.kinder.size?" open":""}><summary style="font-size:var(--s-klein);font-weight:700;cursor:pointer;min-height:32px">Wer kommt in diesem Eintrag vor?${_TB.kinder.size?" · "+_TB.kinder.size:""}</summary>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">
        ${kinder.filter(k=>kaderIdVon(k)).map(k=>{const kid=kaderIdVon(k), an=_TB.kinder.has(kid);
          return `<button type="button" onclick="tbKindUmschalten(${kid})" aria-pressed="${an}" style="min-height:48px;padding:0 12px;font-size:var(--s-text);border:${an?"2px solid var(--purple)":"1px solid var(--rand-bedien)"};border-radius:14px;background:${an?"var(--purple-bg)":"var(--surface2)"};color:var(--text);cursor:pointer;font-family:inherit;font-weight:${an?"800":"600"}">${an?"✓ ":""}${esc(tbVorname(k.name))} <span style="color:var(--text2);font-weight:600">· ${esc(tbAlias(k.name).replace(/^Kind /,""))}</span></button>`;}).join("")}
        </div>
        <div style="font-size:var(--s-klein);color:var(--text3);margin-top:4px">Daraus entsteht die Sicht je Kind. Nichts wird aus dem Text geraten.</div>
      </details>
    </div>`:""}

    <label style="${lbl}">Aha${fuerFertig}
      <textarea id="tb-aha" class="wachsen" rows="3" onfocus="tbFokus('aha')" placeholder="Was hast du verstanden, das du vorher nicht wusstest?" style="${fld};resize:vertical;margin-top:3px">${esc(w.aha)}</textarea></label>

    ${_TB.kons.map((k,i)=>`<label style="${lbl}">${i?"Weitere Konsequenz":"Konsequenz"}${i?"":fuerFertig}${k.erledigt_am?` <span style="font-weight:600;color:var(--green)">· ✓ erledigt am ${tbDatumDe(k.erledigt_am)}</span>`:""}
      <textarea id="${i?"tb-konsequenz-"+i:"tb-konsequenz"}" class="wachsen" rows="2" onfocus="tbFokus('${i?"konsequenz-"+i:"konsequenz"}')" placeholder="Was machst du beim nächsten Mal anders?" style="${fld};resize:vertical;margin-top:3px">${esc(k.text||"")}</textarea></label>
      <label style="font-size:var(--s-klein);color:var(--text2);display:block;margin-top:4px">Bis wann
      <input type="date" id="${i?"tb-konsequenz_bis-"+i:"tb-konsequenz_bis"}" value="${esc(k.bis||"")}" style="${fld};margin-top:3px"></label>`).join("")}
    ${_TB.kons.length<5?`<button type="button" class="btn" onclick="tbKonsDazu()" style="width:100%;min-height:48px;margin-top:6px;justify-content:center"><i class="ti ti-plus"></i>Weitere Konsequenz</button>`:""}

    <label style="${lbl}">Schlagworte<span style="font-weight:500;color:var(--text3)"> · zum Wiederfinden, mit Komma getrennt</span>
      <input type="text" id="tb-schlagworte" value="${esc(w.schlagworte)}" placeholder="z. B. Passspiel, Raumaufteilung, Motivation" list="tb-schlagwort-vorschlag" style="${fld};margin-top:3px"></label>
    <datalist id="tb-schlagwort-vorschlag">${tbSchlagwortVorrat().map(x=>`<option value="${esc(x)}">`).join("")}</datalist>

    <label style="${lbl}">Beleg<span style="font-weight:500;color:var(--text3)"> · optional</span>
      <input type="text" id="tb-beleg" onfocus="tbFokus('beleg')" value="${esc(w.beleg)}" placeholder="Foto-Hinweis, Zitat, Quelle" style="${fld};margin-top:3px"></label>

    <label style="${lbl}">Anschluss<span style="font-weight:500;color:var(--text3)"> · optional</span>
      <input type="text" id="tb-anschluss" onfocus="tbFokus('anschluss')" value="${esc(w.anschluss)}" placeholder="Leitfrage, Übung oder App-Feld" style="${fld};margin-top:3px"></label>

    <div id="tb-meldung" style="margin-top:10px">${_TB.namensfund?tbNamensHinweis(_TB.namensfund):""}</div>

    <button class="btn btn-p" onclick="tagebuchSpeichern()" style="width:100%;min-height:56px;margin-top:12px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-check"></i>Eintrag erfassen</button>
    <button class="btn" onclick="tagebuchSchliessen()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>`;
  if(typeof felderWachsen==="function") felderWachsen(c);
}
/* KADER führt die Kennung als _id (loadKader); die Attrappe der Prüfungen als id. */
function kaderIdVon(k){ return Number((typeof kaderId==="function" ? kaderId(k) : (k&&(k._id!=null?k._id:k.id))) || 0); }
function tbSchlagwortVorrat(){
  const z = {}; _TB_LISTE.forEach(e=>(Array.isArray(e.schlagworte)?e.schlagworte:[]).forEach(x=>{ z[x]=(z[x]||0)+1; }));
  return Object.keys(z).sort((a,b)=>z[b]-z[a]).slice(0,30);
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
  ["ausloeser","beobachtung","aha","beleg","anschluss"].forEach(k=>{
    _TB.werte[k] = String(_TB.werte[k]||"").replace(re,(m,a,b,c)=>a+alias+c);
  });
  _TB.kons.forEach(k=>{ k.text = String(k.text||"").replace(re,(m,a,b,c)=>a+alias+c); });
  _TB.namensfund = null;
  tbRender();
  toast("Name durch "+alias+" ersetzt");
}
function tbTrotzdemSpeichern(){ if(_TB){ _TB.namensfund=null; _TB.uebergehen=true; tagebuchSpeichern(); } }

/* v679 · Keim statt Ablehnung. Bis v678 schickte ein Eintrag ohne Aha oder Konsequenz nichts ab
   („ein Eintrag ohne Erkenntnis ist keiner“). Das stimmt für ausgearbeitete Einträge und ist falsch
   für einen Gedanken auf dem Parkplatz (doku/auftrag-tagebuch-alltag). Jetzt wird erfasst – fehlt
   Baustein, Auslöser, Aha oder Konsequenz, als Keim, ohne rote Meldung. Die Tabelle hält die Regel
   weiter fest: 'fertig' nur mit allen vier Feldern (tagebuch_eintrag_fertig_check). */
function tbFehltFuerFertig(w, kons){
  const f = [];
  if(!w.baustein) f.push("Baustein");
  if(!String(w.ausloeser||"").trim()) f.push("Auslöser");
  if(!String(w.aha||"").trim()) f.push("Aha");
  if(!(kons||[]).some(k=>String(k.text||"").trim())) f.push("Konsequenz");
  return f;
}
async function tagebuchSpeichern(){
  if(!_TB) return;
  tbFelderLesen();
  const w = _TB.werte;
  const kons = _TB.kons.filter(k=>String(k.text||"").trim() || k.id);
  const fehlt = tbFehltFuerFertig(w, kons);
  const text = [w.beobachtung, w.aha, ...kons.map(k=>k.text)].some(t=>String(t||"").trim());
  if(!text){
    const m = document.getElementById("tb-meldung");
    if(m) m.innerHTML = `<div style="background:var(--surface2);border:var(--border-s);border-radius:10px;padding:10px 12px;font-size:var(--s-text)">Schreib wenigstens einen Satz – dann wird der Eintrag erfasst, notfalls als Gedanke.</div>`;
    return;
  }
  /* v638: keine Namensabfrage mehr – Vornamen dürfen im Tagebuch der App stehen (PO: „… können uns
     diese Abfrage, diesen Hinweis hier in der App sparen“). Nach außen ersetzt tbPseudonym. */
  const status = fehlt.length ? "keim" : "fertig";
  const mitText = kons.filter(k=>String(k.text||"").trim());
  const daten = mitText.map(k=>k.bis).filter(Boolean).sort();
  const jetzt = new Date().toISOString();
  const body = { autor: _TB.autor || await tbAutor(), datum:_TB.datum, quelle:_TB.quelle,
                 termin_id:_TB.terminId, baustein:w.baustein||null,
                 ausloeser:String(w.ausloeser||"").trim()||null, beobachtung:String(w.beobachtung||"").trim()||null,
                 aha:String(w.aha||"").trim()||null, konsequenz:mitText.map(k=>k.text.trim()).join("\n")||null,
                 konsequenz_bis:daten[0]||null,
                 beleg:String(w.beleg||"").trim()||null, anschluss:String(w.anschluss||"").trim()||null,
                 schlagworte:tbSchlagworte(w.schlagworte), status,
                 updated_at:jetzt };
  /* ki_vorschlag nur beim Anlegen – beim Bearbeiten bleibt die Herkunft stehen, wie sie ist. */
  if(!_TB.id){ body.ki_vorschlag = !!_TB.ki; body.anlass = _TB.anlass || (_TB.quelle==="einheit" ? "einheit" : _TB.quelle==="event" ? "spieltag" : null); }
  /* Eine Änderung von Hand gilt als Bestätigung (KI-Auftrag, Abschnitt 5). */
  if(_TB.ki || _TB.id) body.bestaetigt_am = jetzt;
  if(!_TB.id && _TB.diktat) body.diktat = _TB.diktat;
  let id = _TB.id || null;
  try{
    const r = id
      ? await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?id=eq.${Number(id)}`,
          {method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(body)})
      : await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag`,
          {method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r)) return;
    if(!r.ok && r.status!==201){ toast(sbDeniedMsg(r,"Konnte nicht erfassen"),"err"); return; }
    if(!id){ const rows = await r.json().catch(()=>null); id = rows && rows[0] && rows[0].id; }
  }catch(e){ toast("Netzwerkfehler – der Eintrag steht noch im Fenster","err"); return; }
  if(id){
    await tbPunkteSichern(id, _TB.kons, { autor:body.autor, termin_id:_TB.terminId, datum:_TB.datum });
    await tbKinderSichern(id, _TB.kinder, _TB.kinderVorher);
  }
  toast(status==="keim" ? `Als Keim erfasst ✓ – für einen fertigen Eintrag fehlt noch: ${fehlt.join(", ")}` : "Eintrag erfasst ✓");
  tagebuchSchliessen();
  if(typeof tagebuchListe==="function" && document.getElementById("tb-liste")) tagebuchListe();
  if(typeof wieWarsKarte==="function") wieWarsKarte();
}
/* Konsequenzen des Eintrags: vorhandene ändern, neue anlegen, geleerte löschen. Erledigte bleiben. */
async function tbPunkteSichern(eintragId, kons, herkunft){
  const H = {...sbAuthHeaders(),'Content-Type':'application/json'};
  for(const k of (kons||[])){
    const t = String(k.text||"").trim();
    try{
      if(k.id && !t && !k.erledigt_am) await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?id=eq.${Number(k.id)}`,{method:"DELETE",headers:H});
      else if(k.id) await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?id=eq.${Number(k.id)}`,{method:"PATCH",headers:H,body:JSON.stringify({text:t,bis:k.bis||null})});
      else if(t) await fetch(`${SB_URL}/rest/v1/tagebuch_punkt`,{method:"POST",headers:H,body:JSON.stringify({eintrag_id:eintragId,art:"konsequenz",text:t,bis:k.bis||null,
        autor:herkunft.autor||"Trainer",termin_id:herkunft.termin_id||null,datum:herkunft.datum||null})});
    }catch(e){}
  }
}
async function tbKinderSichern(eintragId, neu, vorher){
  const alt = new Set(vorher||[]), jetzt = new Set(neu||[]);
  const H = {...sbAuthHeaders(),'Content-Type':'application/json'};
  const weg = [...alt].filter(x=>!jetzt.has(x)), dazu = [...jetzt].filter(x=>!alt.has(x));
  try{
    if(weg.length) await fetch(`${SB_URL}/rest/v1/tagebuch_kind?eintrag_id=eq.${Number(eintragId)}&kader_id=in.(${weg.map(Number).join(",")})`,{method:"DELETE",headers:H});
    if(dazu.length) await fetch(`${SB_URL}/rest/v1/tagebuch_kind`,{method:"POST",headers:H,body:JSON.stringify(dazu.map(k=>({eintrag_id:eintragId,kader_id:Number(k)})))});
  }catch(e){}
}
/* Einen vorhandenen Eintrag (Keim, Vorschlag, fertig) im Dialog öffnen. */
function tagebuchBearbeiten(id){
  const e = _TB_LISTE.find(x=>Number(x.id)===Number(id)); if(!e) return;
  const kons = _TB_PUNKTE.filter(p=>Number(p.eintrag_id)===Number(id) && p.art==="konsequenz")
    .map(p=>({id:p.id,text:p.text,bis:p.bis||"",erledigt_am:p.erledigt_am||null}));
  const kinder = _TB_KINDER.filter(k=>Number(k.eintrag_id)===Number(id)).map(k=>Number(k.kader_id));
  tbOeffnen({ id:e.id, status:e.status||"fertig", quelle:e.quelle, terminId:e.termin_id, datum:e.datum, autor:e.autor,
    baustein:e.baustein, ausloeser:e.ausloeser, beobachtung:e.beobachtung, aha:e.aha,
    konsequenz:kons.length?"":e.konsequenz, konsequenz_bis:kons.length?"":e.konsequenz_bis, kons:kons.length?kons:null,
    beleg:e.beleg, anschluss:e.anschluss, schlagworte:(e.schlagworte||[]).join(", "),
    kinder, kinderVorher:kinder, ki:!!e.ki_vorschlag && !e.bestaetigt_am });
}

/* ── Ansicht ───────────────────────────────────────────────────────────────────── */
/* v679: Drei Sichten über demselben Bestand – die Bausteine bleiben die Ordnung, die Sichten liegen
   darüber (doku/auftrag-tagebuch-alltag): Einträge · Wiedervorlage · Je Kind. Das Tagebuch ist eine
   persönliche Unterlage: die Ansicht zeigt die eigenen Einträge (prozess-nacherfassung: „ein Vorschlag
   je Autor, nur in dessen Tagebuch“); To-dos sehen alle Trainer, sie sind Team-Arbeit. */
let _TB_PUNKTE = [], _TB_KINDER = [], _TB_SICHT = "eintraege", _TB_KIND = null, _TB_ICH = "";
async function tagebuchListe(){
  const box = document.getElementById("tb-liste"); if(!box) return;
  if(typeof sbToken==="function" && !sbToken()){ box.innerHTML = tbLeer("Nicht angemeldet.","Melde dich als Trainer an, dann steht das Tagebuch hier."); return; }
  box.innerHTML = '<div style="font-size:var(--s-text);color:var(--text3);padding:8px">Lade …</div>';
  _TB_ICH = await tbAutor();
  try{
    const wer = _TB_ICH ? `&autor=eq.${encodeURIComponent(_TB_ICH)}` : "";
    const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?select=*${wer}&order=datum.desc,id.desc&limit=300`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)) return;
    if(!r.ok){ box.innerHTML = tbLeer("Keine Verbindung.","Sobald du wieder online bist, stehen die Einträge hier."); return; }
    _TB_LISTE = (await r.json())||[];
  }catch(e){ box.innerHTML = tbLeer("Offline.","Sobald du wieder online bist, stehen die Einträge hier."); return; }
  /* Punkte und Kinder: fehlen sie (etwa vor der Migration), bleibt die Ansicht wie bisher. */
  const holen = async pfad => { try{ const r = await fetch(`${SB_URL}/rest/v1/${pfad}`,{headers:sbAuthHeaders()}); return r.ok ? ((await r.json())||[]) : []; }catch(e){ return []; } };
  [_TB_PUNKTE, _TB_KINDER] = await Promise.all([ holen("tagebuch_punkt?select=*&order=bis.asc.nullslast,id.asc&limit=500"),
                                                 holen("tagebuch_kind?select=eintrag_id,kader_id&limit=2000") ]);
  if(!Array.isArray(_TB_PUNKTE)) _TB_PUNKTE = []; if(!Array.isArray(_TB_KINDER)) _TB_KINDER = [];
  tbListeRender();
}
function tbLeer(satz, zweiter){
  return `<div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:16px;text-align:center">
    <div style="font-size:var(--s-text);font-weight:700">${esc(satz)}</div>
    <div style="font-size:var(--s-text);color:var(--text2);margin-top:4px">${esc(zweiter)}</div></div>`;
}
function tbStatus(e){ return e && e.status==="keim" ? "keim" : "fertig"; }
/* Offen zum Bestätigen: ein KI-Vorschlag, den noch niemand mit „Passt so“ oder einer Änderung angenommen hat. */
function tbUnbestaetigt(e){ return !!(e && e.ki_vorschlag && !e.bestaetigt_am); }
/* In die Lehrgangsausgabe darf: fertig und bestätigt – oder nie ein Vorschlag gewesen. */
function tbFuerLehrgang(e){ return tbStatus(e)==="fertig" && !tbUnbestaetigt(e); }
function tbSicht(s){ _TB_SICHT = s; tbListeRender(); }
function tbSichtKind(kid){ _TB_KIND = (_TB_KIND===Number(kid)) ? null : Number(kid); tbListeRender(); }

function tbListeRender(){
  const box = document.getElementById("tb-liste"); if(!box) return;
  const knopf = (key, label) => `<button type="button" onclick="tbSicht('${key}')" aria-pressed="${_TB_SICHT===key}" style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:${_TB_SICHT===key?"var(--purple-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-text);font-weight:${_TB_SICHT===key?"800":"600"};cursor:pointer">${label}</button>`;
  const faellig = tbWiedervorlagePunkte().filter(p=>p.gruppe==="ueberfaellig").length;
  const reiter = `<div role="group" aria-label="Sicht" style="display:flex;gap:6px;margin-bottom:12px">${knopf("eintraege","Einträge")}${knopf("wiedervorlage","Wiedervorlage"+(faellig?` · ${faellig} überfällig`:""))}${knopf("kind","Je Kind")}</div>`;
  if(!_TB_LISTE.length && _TB_SICHT!=="wiedervorlage"){
    box.innerHTML = reiter + `<div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:16px;text-align:center">
      <div style="font-size:var(--s-text);font-weight:700">Noch kein Eintrag.</div>
      <div style="font-size:var(--s-text);color:var(--text2);margin:4px 0 10px">Der erste entsteht am schnellsten direkt nach einer Nachbereitung – oder als Gedanke zwischendurch.</div>
      <button class="btn" onclick="tagebuchGedanke()" style="min-height:48px;justify-content:center;width:100%"><i class="ti ti-bulb"></i>Gedanke erfassen</button></div>`;
    tbAusgabeZeichnen();
    return;
  }
  box.innerHTML = reiter + (_TB_SICHT==="wiedervorlage" ? tbWiedervorlageHtml() : _TB_SICHT==="kind" ? tbKindSichtHtml() : tbEintraegeHtml());
  tbAusgabeZeichnen();
}
function tbEintraegeHtml(){
  const heute = new Date();
  const offen = _TB_LISTE.filter(tbUnbestaetigt);
  const keime = _TB_LISTE.filter(e=>tbStatus(e)==="keim" && !tbUnbestaetigt(e));
  const fertig = _TB_LISTE.filter(e=>tbStatus(e)==="fertig" && !tbUnbestaetigt(e));
  /* v628: Schlagworte zum Wiederfinden – oben die häufigsten, ein Tipp filtert. */
  const zaehl = {};
  _TB_LISTE.forEach(e=>(Array.isArray(e.schlagworte)?e.schlagworte:[]).forEach(x=>{ zaehl[x]=(zaehl[x]||0)+1; }));
  const top = Object.keys(zaehl).sort((a,b)=>zaehl[b]-zaehl[a]||a.localeCompare(b)).slice(0,12);
  const filt = l => _TB_FILTER ? l.filter(e=>(e.schlagworte||[]).includes(_TB_FILTER)) : l;
  const liste = filt(fertig);
  const themen = top.length ? `<div style="margin-bottom:12px"><div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:5px">Themen</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">${top.map(x=>`<button type="button" onclick="tbFilter('${jsq(x)}')" aria-pressed="${_TB_FILTER===x}" style="min-height:36px;padding:0 11px;border:1px solid var(--rand-bedien);border-radius:18px;background:${_TB_FILTER===x?"var(--purple-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);font-weight:700;cursor:pointer">#${esc(x)} · ${zaehl[x]}</button>`).join("")}</div>
    ${_TB_FILTER?`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:5px">${filt(_TB_LISTE).length} Eintr${filt(_TB_LISTE).length===1?"ag":"äge"} zu „${esc(_TB_FILTER)}“ – noch einmal tippen hebt den Filter auf.</div>`:""}</div>` : "";
  const kopf = t => `<div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:4px">${t}</div>`;
  const offenHtml = filt(offen).length ? `<div style="margin-bottom:16px">${kopf("Noch zu bestätigen · "+filt(offen).length)}
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px">Vorschläge aus deiner Sprachnotiz. Sie fehlen in der Lehrgangsausgabe, bis du sie bestätigst oder änderst.</div>
    ${filt(offen).map(tbZeile).join("")}</div>` : "";
  /* Keime: keine Warnung, kein Lückenhinweis – eine ruhige Zeile mit der Zahl. */
  const keimHtml = filt(keime).length ? `<div style="margin-bottom:16px">${kopf("Gedanken · "+filt(keime).length)}
    <div class="tb-keim-zahl" style="font-size:var(--s-text);color:var(--text2);margin-bottom:6px">${keime.length===1?"1 Gedanke wartet":keime.length+" Gedanken warten"} auf eine Konsequenz.</div>
    ${filt(keime).map(tbZeile).join("")}</div>` : "";
  return offenHtml + keimHtml + themen + TB_BAUSTEINE.map(b=>{
    const eintraege = liste.filter(e=>e.baustein===b.key);
    /* Die Lücke rechnet nur mit fertigen Einträgen – ein Keim ist kein Versäumnis und keine Arbeit. */
    const alle = fertig.filter(e=>e.baustein===b.key);
    const juengst = alle[0] ? alle[0].datum : null;
    const tage = juengst ? Math.floor((heute - new Date(juengst+"T00:00:00"))/864e5) : null;
    const luecke = (tage===null || tage>TB_LUECKE_TAGE);
    return `<div style="margin-bottom:16px">
      ${kopf(esc(b.label)+" · "+eintraege.length)}
      ${luecke?`<div style="font-size:var(--s-klein);color:var(--text3);margin-bottom:6px">${juengst?`Seit dem ${tbDatumDe(juengst)} nichts notiert.`:"Noch nichts notiert."}</div>`:""}
      ${eintraege.map(tbZeile).join("")}
    </div>`;
  }).join("");
}
function tbZeile(e){
  const worte = Array.isArray(e.schlagworte) ? e.schlagworte : [];
  const keim = tbStatus(e)==="keim", offen = tbUnbestaetigt(e);
  const kons = _TB_PUNKTE.filter(p=>Number(p.eintrag_id)===Number(e.id) && p.art==="konsequenz");
  const konsText = kons.length ? kons.map(p=>esc(p.text)+(p.bis?` (bis ${tbDatumDe(p.bis)})`:"")+(p.erledigt_am?" ✓":"")).join("<br>")
                               : (e.konsequenz ? esc(e.konsequenz)+(e.konsequenz_bis?` (bis ${tbDatumDe(e.konsequenz_bis)})`:"") : "");
  const kinder = _TB_KINDER.filter(k=>Number(k.eintrag_id)===Number(e.id)).map(k=>tbKindName(k.kader_id)).filter(Boolean);
  return `<div class="tb-zeile" data-id="${Number(e.id)}" style="background:var(--surface);border:var(--border-s);${offen?"border-left:4px solid var(--purple);":""}border-radius:var(--rl);padding:11px 12px;margin-bottom:6px">
    <div style="font-size:var(--s-klein);color:var(--text3)">${tbDatumDe(e.datum)} · ${esc(stempelText(e.autor, e.updated_at||e.created_at))}${e.ki_vorschlag?(offen?" · ✨ Vorschlag, noch nicht bestätigt":" · ✨ aus Sprachnotiz, bestätigt"):""}${keim?" · 💭 Keim":""}</div>
    ${worte.length?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">${worte.map(x=>`<button type="button" onclick="tbFilter('${jsq(x)}')" aria-pressed="${_TB_FILTER===x}" style="min-height:32px;padding:0 10px;border:1px solid var(--rand-bedien);border-radius:16px;background:${_TB_FILTER===x?"var(--purple-bg)":"var(--surface2)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);font-weight:700;cursor:pointer">#${esc(x)}</button>`).join("")}</div>`:""}
    <div style="font-size:var(--s-text);font-weight:700;margin-top:2px">${esc(e.ausloeser || (keim ? tbErsterSatz(e.beobachtung||e.diktat, 160) : ""))}</div>
    ${e.aha?`<div style="font-size:var(--s-text);color:var(--text2);margin-top:4px;line-height:1.5"><b>Aha:</b> ${esc(e.aha)}</div>`:""}
    ${konsText?`<div style="font-size:var(--s-text);color:var(--text2);margin-top:2px;line-height:1.5"><b>Konsequenz:</b> ${konsText}</div>`:""}
    ${kinder.length?`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">👤 ${kinder.map(esc).join(", ")}</div>`:""}
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      ${offen?`<button class="btn btn-sm" onclick="tbPruefenOpen(${Number(e.id)})" style="min-height:36px"><i class="ti ti-checks"></i>Prüfen</button>`
             :`<button class="btn btn-sm" onclick="tagebuchBearbeiten(${Number(e.id)})" style="min-height:36px"><i class="ti ti-pencil"></i>${keim?"Ausarbeiten":"Bearbeiten"}</button>`}
      <button class="btn btn-sm" onclick="tagebuchKopieren(${Number(e.id)})" style="min-height:36px"><i class="ti ti-copy"></i>Kopieren</button>
      <button class="btn btn-sm" onclick="tagebuchTeilen(${Number(e.id)})" style="min-height:36px"><i class="ti ti-share"></i>Teilen</button>
    </div>
  </div>`;
}
function tbErsterSatz(t, max){
  const s = String(t||"").trim().split(/\n/)[0];
  const m = s.match(/^.*?[.!?](\s|$)/);
  const x = (m ? m[0] : s).trim();
  if(x.length<=(max||140)) return x;
  const w = x.slice(0,(max||140)-1).lastIndexOf(" ");
  return x.slice(0, w>0?w:(max||140)-1)+"…";
}
function tbKindName(kid){
  const k = (typeof KADER!=="undefined" ? (KADER||[]) : []).find(x=>kaderIdVon(x)===Number(kid));
  return k ? tbVorname(k.name) : null;
}

/* ── v679 · Wiedervorlage ──────────────────────────────────────────────────────────
   Alles mit Frist – eigene Konsequenzen und alle offenen To-dos –, nach Datum, in drei Gruppen.
   Erledigt ist nur, was ausdrücklich abgehakt ist: verstrichen und erledigt sind zwei verschiedene
   Dinge, und genau daran ist im September etwas liegen geblieben. */
const TB_ROLLE = { organisation:"Organisation", skill:"Skill Development Coach", feldtrainer:"Feldtrainer" };
function tbWiedervorlagePunkte(){
  const heute = new Date().toISOString().slice(0,10);
  const so = new Date(); so.setDate(so.getDate() + ((7 - so.getDay()) % 7)); const sonntag = so.toISOString().slice(0,10);
  const eigene = new Set(_TB_LISTE.map(e=>Number(e.id)));
  return _TB_PUNKTE.filter(p=>!p.erledigt_am && (p.art==="todo" || eigene.has(Number(p.eintrag_id))))
    .map(p=>({ ...p, gruppe: !p.bis ? "spaeter" : p.bis < heute ? "ueberfaellig" : p.bis <= sonntag ? "woche" : "spaeter" }))
    .sort((a,b)=>String(a.bis||"9999").localeCompare(String(b.bis||"9999")) || a.id-b.id);
}
function tbWiedervorlageHtml(){
  const p = tbWiedervorlagePunkte();
  if(!p.length) return tbLeer("Nichts fällig.","Konsequenzen und To-dos mit Frist stehen hier, bis du sie abhakst.");
  const gruppen = [["ueberfaellig","Überfällig"],["woche","Diese Woche"],["spaeter","Später"]];
  return gruppen.map(([g,label])=>{
    const zeilen = p.filter(x=>x.gruppe===g); if(!zeilen.length) return "";
    return `<div class="tb-wv-gruppe" data-gruppe="${g}" style="margin-bottom:16px">
      <div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:${g==="ueberfaellig"?"var(--red)":"var(--text3)"};margin-bottom:6px">${g==="ueberfaellig"?"⏰ ":""}${label} · ${zeilen.length}</div>
      ${zeilen.map(x=>{
        const e = _TB_LISTE.find(y=>Number(y.id)===Number(x.eintrag_id));
        const b = e && TB_BAUSTEINE.find(y=>y.key===e.baustein);
        const was = x.art==="todo" ? "To-do"+(x.zustaendig?` · Vorschlag: ${TB_ROLLE[x.zustaendig]||x.zustaendig}`:"") : (b ? b.label : "Konsequenz");
        return `<div class="tb-wv-zeile" data-id="${Number(x.id)}" style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:10px 12px;margin-bottom:6px">
          <div style="font-size:var(--s-klein);color:var(--text3)">${x.bis?"bis "+tbDatumDe(x.bis):"ohne Datum"} · ${esc(was)}${x.herkunft?" · "+esc(x.herkunft):""}</div>
          <div style="font-size:var(--s-text);font-weight:700;margin-top:2px">${esc(tbErsterSatz(x.text, 200))}</div>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="btn btn-sm" onclick="tbPunktErledigt(${Number(x.id)})" style="min-height:36px"><i class="ti ti-check"></i>Erledigt</button>
            ${e?`<button class="btn btn-sm" onclick="${tbUnbestaetigt(e)?"tbPruefenOpen":"tagebuchBearbeiten"}(${Number(e.id)})" style="min-height:36px"><i class="ti ti-arrow-right"></i>Zum Eintrag</button>`:""}
          </div></div>`;
      }).join("")}</div>`;
  }).join("");
}
async function tbPunktErledigt(id){
  const p = _TB_PUNKTE.find(x=>Number(x.id)===Number(id)); if(!p) return;
  const heute = new Date().toISOString().slice(0,10), ich = _TB_ICH || await tbAutor();
  try{
    const r = await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?id=eq.${Number(id)}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({erledigt_am:heute,erledigt_von:ich||null})});
    if(sbCheck401(r)) return;
    if(!r.ok && r.status!==204){ toast(sbDeniedMsg(r,"Konnte nicht abhaken"),"err"); return; }
  }catch(e){ toast("Netzwerkfehler – nicht abgehakt","err"); return; }
  p.erledigt_am = heute; p.erledigt_von = ich;
  /* Sind alle Konsequenzen des Eintrags erledigt, trägt der Eintrag das Datum (konsequenz_erledigt_am). */
  if(p.eintrag_id && p.art==="konsequenz"){
    const rest = _TB_PUNKTE.filter(x=>Number(x.eintrag_id)===Number(p.eintrag_id) && x.art==="konsequenz" && !x.erledigt_am);
    if(!rest.length) try{ await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?id=eq.${Number(p.eintrag_id)}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({konsequenz_erledigt_am:heute})}); }catch(e){}
  }
  toast("Abgehakt ✓ – steht weiter im Eintrag");
  tbListeRender();
}

/* ── v679 · Sicht je Kind ──────────────────────────────────────────────────────────
   In der App mit Vornamen; „Kopieren“ gibt nur Buchstaben heraus (tbPseudonym). */
function tbKindSichtHtml(){
  const kader = (typeof KADER!=="undefined" ? (KADER||[]) : []).filter(k=>kaderIdVon(k));
  const zahl = {}; _TB_KINDER.forEach(k=>{ zahl[Number(k.kader_id)] = (zahl[Number(k.kader_id)]||0)+1; });
  const chips = `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">${kader.map(k=>{const kid=kaderIdVon(k), an=_TB_KIND===kid;
    return `<button type="button" onclick="tbSichtKind(${kid})" aria-pressed="${an}" style="min-height:44px;padding:0 12px;border:${an?"2px solid var(--purple)":"1px solid var(--rand-bedien)"};border-radius:14px;background:${an?"var(--purple-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-text);font-weight:${an?"800":"600"};cursor:pointer">${esc(tbVorname(k.name))} <span style="color:var(--text2);font-weight:600">· ${esc(tbAlias(k.name).replace(/^Kind /,""))}</span>${zahl[kid]?` · ${zahl[kid]}`:""}</button>`;}).join("")}</div>`;
  if(_TB_KIND==null) return chips + `<div style="font-size:var(--s-text);color:var(--text2)">Tippe ein Kind an. Es erscheinen alle Einträge, in denen du es unter „Wer kommt vor?“ markiert hast – der Buchstabe daneben ist sein Name in jedem Export.</div>`;
  const ids = new Set(_TB_KINDER.filter(k=>Number(k.kader_id)===_TB_KIND).map(k=>Number(k.eintrag_id)));
  const e = _TB_LISTE.filter(x=>ids.has(Number(x.id))).sort((a,b)=>String(a.datum).localeCompare(String(b.datum)));
  return chips + (e.length ? e.map(tbZeile).join("") + `<button class="btn" onclick="tagebuchKindKopieren()" style="width:100%;min-height:48px;justify-content:center;margin-top:6px"><i class="ti ti-copy"></i>Verlauf kopieren (mit Buchstaben)</button>`
    : tbLeer("Noch kein Eintrag zu diesem Kind.","Im Eintrag unter „Wer kommt vor?“ markieren – dann steht er hier."));
}
function tagebuchKindKopieren(){
  const ids = new Set(_TB_KINDER.filter(k=>Number(k.kader_id)===_TB_KIND).map(k=>Number(k.eintrag_id)));
  const e = _TB_LISTE.filter(x=>ids.has(Number(x.id))).sort((a,b)=>String(a.datum).localeCompare(String(b.datum)));
  if(!e.length) return;
  tbInDieZwischenablage("> "+TB_HINWEIS+"\n\n"+e.map(x=>tbPseudonym(tbMarkdown(x,"arbeit"))).join("\n\n"));
}

/* ── Export ────────────────────────────────────────────────────────────────────── */
/* v679 · Ausgaben trennen. Der Bestand ist das Original, jede Abgabe ein Auszug daraus.
   · lehrgang – die sechs Felder, ohne Status, ohne Schlagworte, ohne Wiedervorlage; nur fertige
                und bestätigte Einträge. Das ist der bisherige Export.
   · arbeit   – alles: Keime, Status, Schlagworte, Fristen, erledigt, Kinder.
   · clizenz  – Platzhalter, das Format steht noch nicht fest.
   Jede Ausgabe läuft durch tbPseudonym: Vornamen werden zu festen Buchstaben. */
let _TB_AUSGABE = "lehrgang";
const TB_AUSGABEN = [["lehrgang","Lehrgang (Basis-Coach)"],["arbeit","Arbeitsfassung"],["clizenz","C-Lizenz"]];
function tbAusgabeWahl(a){
  if(a==="clizenz"){ toast("Das Format für die C-Lizenz steht noch nicht fest – bis dahin Lehrgang oder Arbeitsfassung."); return; }
  _TB_AUSGABE = a; tbAusgabeZeichnen();
}
function tbAusgabeZeichnen(){
  const box = document.getElementById("tb-ausgabe"); if(!box) return;
  box.innerHTML = TB_AUSGABEN.map(([k,l])=>`<button type="button" onclick="tbAusgabeWahl('${k}')" aria-pressed="${_TB_AUSGABE===k}"${k==="clizenz"?' aria-disabled="true"':""} style="min-height:44px;padding:0 12px;border:1px solid var(--rand-bedien);border-radius:10px;background:${_TB_AUSGABE===k?"var(--purple-bg)":"var(--surface)"};color:${k==="clizenz"?"var(--text2)":"var(--text)"};font-family:inherit;font-size:var(--s-text);font-weight:${_TB_AUSGABE===k?"800":"600"};cursor:pointer">${_TB_AUSGABE===k?"✓ ":""}${l}${k==="clizenz"?" · folgt":""}</button>`).join("");
  const hin = document.getElementById("tb-ausgabe-hinweis");
  if(hin){
    const offen = _TB_LISTE.filter(e=>tbUnbestaetigt(e) || tbStatus(e)==="keim").length;
    hin.textContent = _TB_AUSGABE==="lehrgang"
      ? "Die sechs Felder, nach Bausteinen sortiert – nur fertige, bestätigte Einträge."+(offen?` ${offen} Eintr${offen===1?"ag wartet":"äge warten"} noch (Keim oder Vorschlag) und fehlen hier.`:"")
      : "Alles aus dem Monat: auch Gedanken, Status, Schlagworte, Fristen und wer vorkommt – mit Buchstaben statt Namen.";
  }
}
function tagebuchExport(id, ausgabe){
  const e = _TB_LISTE.find(x=>Number(x.id)===Number(id));
  if(!e) return "";
  let a = ausgabe || _TB_AUSGABE;
  /* Ein Keim oder ein unbestätigter Vorschlag erscheint nie als Lehrgangstext. */
  if(a==="lehrgang" && !tbFuerLehrgang(e)) a = "arbeit";
  return "> "+TB_HINWEIS+"\n\n"+tbPseudonym(tbMarkdown(e, a));
}
function tbMarkdown(e, ausgabe){
  const a = ausgabe || "lehrgang";
  const b = TB_BAUSTEINE.find(x=>x.key===e.baustein);
  const z = [], zeile = t => String(t||"").replace(/\n/g," ");
  const kons = (typeof _TB_PUNKTE!=="undefined" ? _TB_PUNKTE : []).filter(p=>Number(p.eintrag_id)===Number(e.id) && p.art==="konsequenz");
  const konsText = kons.length
    ? kons.map(p=>zeile(p.text)+(p.bis?` (bis ${tbDatumDe(p.bis)})`:"")+(a==="arbeit"&&p.erledigt_am?` – erledigt am ${tbDatumDe(p.erledigt_am)}`:"")).join("; ")
    : zeile(e.konsequenz)+(e.konsequenz_bis?` (bis ${tbDatumDe(e.konsequenz_bis)})`:"");
  z.push(`### ${tbDatumDe(e.datum)} — ${b?b.kurz:(tbStatus(e)==="keim"?"GEDANKE":String(e.baustein||"").toUpperCase())}`);
  z.push("");
  if(a==="arbeit") z.push(`- **Status:** ${tbStatus(e)==="keim"?"Keim":"fertig"}${e.ki_vorschlag?(tbUnbestaetigt(e)?" · Vorschlag, noch nicht bestätigt":" · aus Sprachnotiz, bestätigt"):""}`);
  z.push(`- **Auslöser:** ${zeile(e.ausloeser)}`);
  z.push(`- **Beobachtung:** ${zeile(e.beobachtung)}`);
  z.push(`- **Aha:** ${zeile(e.aha)}`);
  z.push(`- **Konsequenz:** ${konsText}`);
  z.push(`- **Beleg:** ${zeile(e.beleg)}`);
  z.push(`- **Anschluss:** ${zeile(e.anschluss)}`);
  if(a==="arbeit"){
    if(Array.isArray(e.schlagworte) && e.schlagworte.length) z.push(`- **Schlagworte:** ${e.schlagworte.join(", ")}`);
    const kinder = (typeof _TB_KINDER!=="undefined" ? _TB_KINDER : []).filter(k=>Number(k.eintrag_id)===Number(e.id)).map(k=>tbKindName(k.kader_id)).filter(Boolean);
    if(kinder.length) z.push(`- **Kinder:** ${kinder.join(", ")}`);
  }
  return z.join("\n");
}
/* Der Monatsexport sortiert nach Bausteinen, nicht nach Datum: so liest die Abgabe sich
   als Entwicklung je Baustein und nicht als Chronik. */
function tagebuchMonatMarkdown(monat, ausgabe){
  const a = ausgabe || _TB_AUSGABE;
  const m = monat || new Date().toISOString().slice(0,7);
  const imMonat = _TB_LISTE.filter(e=>String(e.datum||"").slice(0,7)===m);
  const drin = a==="lehrgang" ? imMonat.filter(tbFuerLehrgang) : imMonat;
  if(!drin.length) return "";
  const kopf = new Date(m+"-01T00:00:00").toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  const teile = [`## Trainertagebuch — ${kopf}${a==="arbeit"?" (Arbeitsfassung)":""}`,"","> "+TB_HINWEIS,""];
  const sortiert = l => l.slice().sort((x,c)=>String(x.datum).localeCompare(String(c.datum)));
  TB_BAUSTEINE.forEach(b=>{
    const e = sortiert(drin.filter(x=>x.baustein===b.key && (a!=="arbeit" || tbStatus(x)==="fertig")));
    if(!e.length) return;
    teile.push(...e.map(x=>tbPseudonym(tbMarkdown(x, a))), "");
  });
  if(a==="arbeit"){
    const keime = sortiert(drin.filter(x=>tbStatus(x)==="keim" || !TB_BAUSTEINE.some(b=>b.key===x.baustein)));
    if(keime.length) teile.push("### Gedanken (Keime)", "", ...keime.map(x=>tbPseudonym(`- ${tbDatumDe(x.datum)}: ${String(x.beobachtung||x.aha||x.konsequenz||"").replace(/\n/g," ")}`)), "");
    const ids = new Set(drin.map(x=>Number(x.id)));
    const todos = (typeof _TB_PUNKTE!=="undefined" ? _TB_PUNKTE : []).filter(p=>p.art==="todo" && ids.has(Number(p.eintrag_id)));
    if(todos.length) teile.push("### To-dos", "", ...todos.map(p=>tbPseudonym(`- ${String(p.text).replace(/\n/g," ")}${p.bis?` (bis ${tbDatumDe(p.bis)})`:""}${p.erledigt_am?` – erledigt am ${tbDatumDe(p.erledigt_am)}`:""}`)), "");
  }
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
  if(!t){ toast(_TB_AUSGABE==="lehrgang"?"In diesem Monat steht noch kein fertiger, bestätigter Eintrag":"In diesem Monat steht noch kein Eintrag","err"); return; }
  tbTeilen(t, "tagebuch-"+m+(_TB_AUSGABE==="arbeit"?"-arbeitsfassung":"")+".md");
}
function tagebuchMonatKopieren(){
  const m = document.getElementById("tb-monat")?.value || new Date().toISOString().slice(0,7);
  const t = tagebuchMonatMarkdown(m);
  if(!t){ toast(_TB_AUSGABE==="lehrgang"?"In diesem Monat steht noch kein fertiger, bestätigter Eintrag":"In diesem Monat steht noch kein Eintrag","err"); return; }
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
   Konsequenz bleiben Handarbeit“ bewusst auf. Gespeichert wird nur, was im Fenster steht.
   v679: Die KI sortiert nur noch (Aha wörtlich oder leer, höchstens zwei Konsequenzen), und es gibt
   keinen zweiten Weg mehr – „Vorschlag aus der Sprachnotiz“ (art „tagebuch“) ist entfallen. Der
   Vorschlag entsteht in derselben Auswertung wie die Bewertung und wird sofort gespeichert. */
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
  /* v638: eine zweite Auswertung ersetzt den KI-Teil der Beobachtung, statt ihn davorzusetzen. */
  if(v.beobachtung){
    let rest = String(w.beobachtung||"");
    if(_TB.kiBeob && rest.includes(_TB.kiBeob)) rest = rest.replace(_TB.kiBeob,"").replace(/^\n+/,"");
    w.beobachtung = rest ? v.beobachtung+"\n"+rest : v.beobachtung;
    _TB.kiBeob = v.beobachtung;
  }
  if(v.aha && !String(w.aha||"").trim()) w.aha = v.aha;
  const kons = Array.isArray(v.konsequenzen) ? v.konsequenzen : (v.konsequenz ? [v.konsequenz] : []);
  if(kons.length && !_TB.kons.some(k=>String(k.text||"").trim())) _TB.kons = kons.slice(0,2).map(t=>({id:null,text:t,bis:"",erledigt_am:null}));
  if(Array.isArray(v.schlagworte) && v.schlagworte.length) w.schlagworte = v.schlagworte.join(", ");
  _TB.ki = true;
  tbRender();
  return true;
}
function tbKiVorschlag(fuer){
  if(!_TB) return;
  const v = (typeof nbTagebuchVorschlag==="function") ? nbTagebuchVorschlag(fuer) : null;
  if(v) tbKiAnwenden(v);
}

/* ═══ v679 · Gedanke – ein Feld, ein Knopf ═════════════════════════════════════════
   Gedanken entstehen zwischen den Terminen und gingen verloren, weil das Erfassen eine
   Nachbereitung voraussetzte. Keine Bausteinwahl, keine Pflichtfelder, keine eigene
   Spracherkennung – das Mikrofon der Tastatur reicht. Unter zehn Sekunden: Knopf, diktieren, erfassen. */
function tagebuchGedanke(){
  if(!tbAngemeldet()) return;
  document.getElementById("tb-gedanke")?.remove();
  const ov = document.createElement("div");
  ov.id = "tb-gedanke"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Gedanke");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10061;display:flex;padding:14px";
  ov.onclick = e => { if(e.target===ov) ov.remove(); };
  ov.innerHTML = `<div style="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    ${mdlHead("tb-gedanke","💭","Gedanke","Kommt ins Tagebuch – ausarbeiten kannst du ihn später","#7c3aed")}
    <textarea id="tb-gedanke-text" rows="6" aria-label="Dein Gedanke" placeholder="Was geht dir durch den Kopf? Tippen oder das Mikrofon der Tastatur nutzen." style="width:100%;box-sizing:border-box;min-height:140px;padding:12px;border:var(--border-s);border-radius:10px;font-family:inherit;font-size:var(--s-karte);line-height:1.5;background:var(--surface2);color:var(--text);resize:vertical;margin-top:8px"></textarea>
    <div id="tb-gedanke-meldung" role="status" style="font-size:var(--s-klein);color:var(--text2);min-height:18px;margin-top:4px"></div>
    <button id="tb-gedanke-los" class="btn btn-p" onclick="tagebuchGedankeSpeichern()" style="width:100%;min-height:56px;margin-top:6px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-check"></i>Gedanke erfassen</button>
    <button class="btn" onclick="document.getElementById('tb-gedanke').remove()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Abbrechen</button>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(()=>{ try{ document.getElementById("tb-gedanke-text").focus(); }catch(e){} }, 30);
}
async function tagebuchGedankeSpeichern(){
  const t = (document.getElementById("tb-gedanke-text")?.value||"").trim();
  const m = document.getElementById("tb-gedanke-meldung");
  if(!t){ if(m) m.textContent = "Schreib ein paar Worte – dann wird erfasst."; return; }
  const b = document.getElementById("tb-gedanke-los"); if(b) b.disabled = true;
  const body = { autor: await tbAutor(), datum:new Date().toISOString().slice(0,10), quelle:"frei", anlass:"gedanke",
                 status:"keim", baustein:null, ausloeser:null, beobachtung:t, aha:null, konsequenz:null,
                 schlagworte:[], ki_vorschlag:false, updated_at:new Date().toISOString() };
  try{
    const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(body)});
    if(sbCheck401(r)) return;
    if(!r.ok && r.status!==201){ if(b) b.disabled = false; if(m) m.textContent = sbDeniedMsg(r,"Nicht erfasst – der Text bleibt stehen"); return; }
  }catch(e){ if(b) b.disabled = false; if(m) m.textContent = "Keine Verbindung – der Text bleibt stehen. Noch einmal versuchen, sobald du online bist."; return; }
  document.getElementById("tb-gedanke")?.remove();
  toast("Gedanke erfasst ✓");
  if(document.getElementById("tb-liste")) tagebuchListe();
}

/* ═══ v679 · Vorschlag sichern – aus derselben Notiz, sofort ══════════════════════
   Wird aus md-fazit.js (nbKiAnwenden) nach jeder Auswertung aufgerufen. Je Autor und Termin gibt es
   genau einen offenen Vorschlag: eine Korrektur ersetzt ihn, statt einen zweiten anzulegen. Er ist
   ein Keim, bis „Passt so“ ihn bestätigt und Aha und eine Konsequenz mit Datum dastehen.
   To-dos werden gegen die offenen To-dos abgeglichen: steht dasselbe schon da, wird es ergänzt. */
let _TB_VORSCHLAG = {};
function tbVorschlagIdFuer(fuer){ return _TB_VORSCHLAG[String(fuer||"")] || null; }
function tbNorm(t){ return String(t||"").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(w=>w.length>2); }
function tbAehnlich(a, b){
  const x = new Set(tbNorm(a)), y = new Set(tbNorm(b));
  if(!x.size || !y.size) return false;
  let gleich = 0; x.forEach(w=>{ if(y.has(w)) gleich++; });
  return gleich / Math.min(x.size, y.size) >= 0.6;
}
async function tbVorschlagSichern(o){
  const v = o && o.v; if(!v || !o.fuer) return null;
  const ich = await tbAutor(); if(!ich) return null;
  const H = {...sbAuthHeaders(),'Content-Type':'application/json'};
  const fuer = String(o.fuer);
  let datum, terminId = null, quelle, anlass, ausloeser;
  if(fuer[0]==="d"){
    datum = fuer.slice(1); quelle = "einheit"; anlass = "einheit";
    try{ terminId = (typeof terminIdForDatum==="function") ? ((await terminIdForDatum(datum)) || null) : null; }catch(e){}
    let sp = "";
    try{ const r = await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=eq.${encodeURIComponent(datum)}&select=kopf`,{headers:sbAuthHeaders()});
         if(r.ok) sp = String(((((await r.json())||[])[0]||{}).kopf||{}).schwerpunkt||"").trim(); }catch(e){}
    ausloeser = `Training U9 vom ${tbDatumDe(datum)}` + (sp ? `, Schwerpunkt „${sp}“` : "");
  }else{
    terminId = Number(fuer.slice(1)); quelle = "event"; anlass = "spieltag";
    let t = o.termin;
    if(!t){ try{ const r = await fetch(`${SB_URL}/rest/v1/termine?id=eq.${terminId}&select=*&limit=1`,{headers:sbAuthHeaders()}); if(r.ok) t = ((await r.json())||[])[0]; }catch(e){} }
    if(!t) return null;
    datum = t.datum;
    const art = t.typ==="turnier" ? "Festival" : "Spiel";
    ausloeser = `${art} „${String(t.titel||t.gegner||art)}“ vom ${tbDatumDe(t.datum)}`;
  }
  const kons = (v.konsequenzen || (v.konsequenz ? [v.konsequenz] : [])).filter(Boolean).slice(0,2);
  const body = { autor:ich, datum, quelle, termin_id:terminId, anlass, status:"keim",
    baustein:v.baustein||null, ausloeser, beobachtung:v.beobachtung||null, aha:v.aha||null,
    konsequenz:kons.join("\n")||null, konsequenz_bis:null, schlagworte:(v.schlagworte||[]).slice(0,8),
    ki_vorschlag:true, bestaetigt_am:null, diktat:String(o.diktat||"").trim()||null,
    rueckfragen:(v.rueckfragen||[]).slice(0,2), updated_at:new Date().toISOString() };
  let id = tbVorschlagIdFuer(fuer);
  if(!id){
    try{
      const wo = quelle==="einheit" ? `datum=eq.${encodeURIComponent(datum)}&quelle=eq.einheit` : `termin_id=eq.${terminId}`;
      const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?select=id&autor=eq.${encodeURIComponent(ich)}&ki_vorschlag=is.true&bestaetigt_am=is.null&${wo}&order=id.desc&limit=1`,{headers:sbAuthHeaders()});
      if(r.ok){ const rows = (await r.json())||[]; if(rows[0]) id = rows[0].id; }
    }catch(e){}
  }
  try{
    if(id){
      const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?id=eq.${Number(id)}`,{method:"PATCH",headers:H,body:JSON.stringify(body)});
      if(!r.ok && r.status!==204) return null;
      await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?eintrag_id=eq.${Number(id)}&erledigt_am=is.null`,{method:"DELETE",headers:H});
    }else{
      const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag`,{method:"POST",headers:{...H,'Prefer':'return=representation'},body:JSON.stringify(body)});
      if(!r.ok && r.status!==201) return null;
      const rows = await r.json().catch(()=>null); id = rows && rows[0] && rows[0].id;
      if(!id) return null;
    }
    const punkte = kons.map(t=>({ eintrag_id:id, termin_id:terminId, datum, art:"konsequenz", text:t, autor:ich }));
    /* To-dos: gegen offene abgleichen. Dasselbe schon offen → Herkunft ergänzen, kein zweites. */
    let offen = [];
    try{ const r = await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?select=id,text,herkunft,eintrag_id&art=eq.todo&erledigt_am=is.null&limit=300`,{headers:sbAuthHeaders()}); if(r.ok) offen = (await r.json())||[]; }catch(e){}
    for(const t of (v.todos||[])){
      const da = offen.find(x=>Number(x.eintrag_id)!==Number(id) && tbAehnlich(x.text, t.text));
      if(da){
        if(!String(da.herkunft||"").includes(ausloeser))
          await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?id=eq.${Number(da.id)}`,{method:"PATCH",headers:H,body:JSON.stringify({herkunft:(da.herkunft?da.herkunft+" · ":"")+ausloeser})});
        continue;
      }
      punkte.push({ eintrag_id:id, termin_id:terminId, datum, art:"todo", text:t.text, zustaendig:t.zustaendig||null, autor:ich, herkunft:ausloeser });
    }
    if(punkte.length) await fetch(`${SB_URL}/rest/v1/tagebuch_punkt`,{method:"POST",headers:H,body:JSON.stringify(punkte)});
  }catch(e){ return id || null; }
  _TB_VORSCHLAG[fuer] = id;
  return id;
}

/* ═══ v679 · Prüfkarte – ein Bildschirm, ein Knopf ═════════════════════════════════
   Bewertung, Tagebuch und To-dos zusammen. Rückfragen der KI darunter, je mit Feld und Mikrofon –
   die Antwort geht WÖRTLICH in das Feld, zu dem die Frage gehört, nicht noch einmal durch die KI.
   Daten per Tipp: die nächsten drei Termine, an denen du selbst zugesagt hast, dazu „anderes Datum“.
   „Passt so“ bestätigt alles auf einmal; wer nichts ändert, braucht keinen weiteren Tipp. */
let _TBP = null;
async function tbEigeneTermine(){
  const ich = await tbAutor(), heute = new Date().toISOString().slice(0,10);
  try{
    const r = await fetch(`${SB_URL}/rest/v1/termine?select=id,datum,uhrzeit,typ,titel,gegner,trainer_status,platz_status&datum=gte.${heute}&order=datum.asc&limit=60`,{headers:sbAuthHeaders()});
    if(!r.ok) return [];
    return ((await r.json())||[]).filter(t=>(t.trainer_status||{})[ich]==="ja" && !(typeof terminFaelltAus==="function" && terminFaelltAus(t))).slice(0,3);
  }catch(e){ return []; }
}
async function tbPruefenOpen(id, opt){
  opt = opt || {};
  let e = null, punkte = [];
  try{
    const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?id=eq.${Number(id)}&select=*&limit=1`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)) return;
    if(r.ok) e = ((await r.json())||[])[0] || null;
    const p = await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?eintrag_id=eq.${Number(id)}&select=*&order=id.asc`,{headers:sbAuthHeaders()});
    if(p.ok) punkte = (await p.json())||[];
  }catch(x){}
  if(!e){ toast("Vorschlag nicht gefunden","err"); return; }
  const kons = punkte.filter(p=>p.art==="konsequenz");
  _TBP = { e, bewertung:opt.bewertung||[], termine: await tbEigeneTermine(),
    kons: kons.length ? kons.map(p=>({id:p.id,text:p.text,bis:p.bis||""})) : (e.konsequenz ? String(e.konsequenz).split("\n").filter(Boolean).map(t=>({id:null,text:t,bis:e.konsequenz_bis||""})) : []),
    todos: punkte.filter(p=>p.art==="todo").map(p=>({id:p.id,text:p.text,bis:p.bis||"",zustaendig:p.zustaendig,weg:false})),
    fragen: (Array.isArray(e.rueckfragen)?e.rueckfragen:[]).map(f=>({frage:f.frage||String(f),feld:f.feld||"beobachtung",antwort:""})),
    baustein: e.baustein };
  document.getElementById("tb-pruefen")?.remove();
  const ov = document.createElement("div");
  ov.id = "tb-pruefen"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Vorschlag prüfen");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10062;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  ov.innerHTML = `<div id="tb-pruefen-karte" style="background:var(--surface);color:var(--text);max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)"></div>`;
  document.body.appendChild(ov);
  tbPruefenZeichnen();
}
function tbPruefenLesen(){
  if(!_TBP) return;
  const v = id => { const el = document.getElementById(id); return el ? el.value : null; };
  ["beobachtung","aha"].forEach(k=>{ const x = v("tbp-"+k); if(x!==null) _TBP.e[k] = x; });
  _TBP.kons.forEach((k,i)=>{ const x = v("tbp-kons-"+i); if(x!==null) k.text = x; const d = v("tbp-kons-bis-"+i); if(d!==null && d) k.bis = d; });
  _TBP.todos.forEach((k,i)=>{ const x = v("tbp-todo-"+i); if(x!==null) k.text = x; const d = v("tbp-todo-bis-"+i); if(d!==null && d) k.bis = d; });
  _TBP.fragen.forEach((f,i)=>{ const x = v("tbp-frage-"+i); if(x!==null) f.antwort = x; });
}
function tbpBaustein(k){ tbPruefenLesen(); _TBP.baustein = k; tbPruefenZeichnen(); }
function tbpDatum(liste, i, datum){ tbPruefenLesen(); const x = _TBP[liste][i]; if(x) x.bis = (x.bis===datum) ? "" : datum; tbPruefenZeichnen(); }
function tbpAnders(liste, i){ tbPruefenLesen(); const x = _TBP[liste][i]; if(x) x.anders = true; tbPruefenZeichnen(); }
function tbpTodoWeg(i){ tbPruefenLesen(); const x = _TBP.todos[i]; if(x) x.weg = !x.weg; tbPruefenZeichnen(); }
function tbpMikro(i){
  if(typeof diktatUmschalten!=="function") return;
  diktatUmschalten({ feldId:"tbp-frage-"+i, knopfId:"tbp-mic-"+i, anzeigeId:"tbp-hoer-"+i, max:2000, onText:t=>{ if(_TBP&&_TBP.fragen[i]) _TBP.fragen[i].antwort = t; } });
}
function tbpDatumChips(liste, i, x){
  const T = _TBP.termine;
  const chip = (datum, label) => `<button type="button" onclick="tbpDatum('${liste}',${i},'${datum}')" aria-pressed="${x.bis===datum}" style="min-height:44px;padding:0 10px;border:${x.bis===datum?"2px solid var(--blue)":"1px solid var(--rand-bedien)"};border-radius:10px;background:${x.bis===datum?"var(--blue-bg)":"var(--surface)"};color:var(--text);font-family:inherit;font-size:var(--s-klein);font-weight:${x.bis===datum?"800":"600"};cursor:pointer">${x.bis===datum?"✓ ":""}${label}</button>`;
  const ausT = T.map(t=>chip(t.datum, `${t.typ==="training"?"🏃":t.typ==="turnier"?"🏆":"⚽"} ${new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}`));
  const eigen = x.bis && !T.some(t=>t.datum===x.bis);
  return `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">${ausT.join("")}
    ${(x.anders||eigen)?`<input type="date" id="tbp-${liste==="kons"?"kons":"todo"}-bis-${i}" value="${esc(x.bis||"")}" aria-label="anderes Datum" style="min-height:44px;padding:0 8px;border:1px solid var(--rand-bedien);border-radius:10px;font-family:inherit;background:var(--surface2);color:var(--text)">`
      :`<button type="button" onclick="tbpAnders('${liste}',${i})" style="min-height:44px;padding:0 10px;border:1px dashed var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text2);font-family:inherit;font-size:var(--s-klein);cursor:pointer">anderes Datum</button>`}
  </div>${T.length?"":`<div style="font-size:var(--s-klein);color:var(--text3);margin-top:3px">Keine kommenden Termine mit deiner Zusage – nimm „anderes Datum“.</div>`}`;
}
function tbPruefenZeichnen(){
  const c = document.getElementById("tb-pruefen-karte"); if(!c || !_TBP) return;
  const e = _TBP.e;
  const fld = "width:100%;box-sizing:border-box;min-height:48px;padding:10px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface2);color:var(--text);resize:vertical";
  const kopf = t => `<div style="font-size:var(--s-klein);font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin:14px 0 6px">${t}</div>`;
  const kannHoeren = typeof diktatMoeglich==="function" && diktatMoeglich();
  c.innerHTML = `${mdlHead("tb-pruefen","✨","Vorschlag prüfen", esc(e.ausloeser||tbDatumDe(e.datum)),"#7c3aed")}
    <div style="font-size:var(--s-text);color:var(--text2);line-height:1.5">Deine Worte, sortiert – nichts dazu erfunden. Was nicht passt, änderst du direkt hier.</div>
    ${_TBP.bewertung.length?`${kopf("Bewertung · gespeichert")}<div style="font-size:var(--s-text);line-height:1.6;background:var(--surface2);border-radius:10px;padding:8px 10px">${_TBP.bewertung.map(z=>`<div>${esc(z)}</div>`).join("")}</div>`:""}
    ${kopf("Tagebuch")}
    <div style="display:flex;gap:6px;flex-wrap:wrap">${TB_BAUSTEINE.map(b=>{const an=_TBP.baustein===b.key;
      return `<button type="button" onclick="tbpBaustein('${b.key}')" aria-pressed="${an}" style="flex:1 1 46%;min-height:44px;font-size:var(--s-klein);border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${an?"var(--blue)":"var(--surface2)"};color:${an?"#fff":"var(--text2)"};font-weight:${an?"800":"600"}">${an?"✓ ":""}${b.label}</button>`;}).join("")}</div>
    <label style="display:block;font-size:var(--s-klein);font-weight:700;margin-top:10px">Beobachtung
      <textarea id="tbp-beobachtung" class="wachsen" rows="4" style="${fld};margin-top:3px">${esc(e.beobachtung||"")}</textarea></label>
    <label style="display:block;font-size:var(--s-klein);font-weight:700;margin-top:10px">Aha${e.aha?"":' <span style="font-weight:500;color:var(--text3)">· nichts gefunden, das du selbst so gesagt hast</span>'}
      <textarea id="tbp-aha" class="wachsen" rows="2" style="${fld};margin-top:3px">${esc(e.aha||"")}</textarea></label>
    ${_TBP.kons.map((k,i)=>`<label style="display:block;font-size:var(--s-klein);font-weight:700;margin-top:10px">Konsequenz ${_TBP.kons.length>1?i+1:""}
      <textarea id="tbp-kons-${i}" class="wachsen" rows="2" style="${fld};margin-top:3px">${esc(k.text)}</textarea></label>
      <div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Bis wann – ein Termin, an dem du da bist</div>${tbpDatumChips("kons",i,k)}`).join("")}
    ${_TBP.fragen.length?`${kopf("Rückfragen")}${_TBP.fragen.map((f,i)=>`<div style="margin-bottom:10px">
      <label style="display:block;font-size:var(--s-text);font-weight:700">${esc(f.frage)} <span style="font-weight:500;color:var(--text3);font-size:var(--s-klein)">· Antwort geht wörtlich ins Feld ${f.feld==="aha"?"Aha":f.feld==="konsequenz"?"Konsequenz":"Beobachtung"}</span>
        <textarea id="tbp-frage-${i}" rows="2" style="${fld};margin-top:3px" placeholder="Leer lassen = überspringen">${esc(f.antwort||"")}</textarea></label>
      ${kannHoeren?`<button type="button" id="tbp-mic-${i}" class="btn" onclick="tbpMikro(${i})" style="min-height:48px;margin-top:4px"><i class="ti ti-microphone"></i>Einsprechen</button><div id="tbp-hoer-${i}" class="dk-anzeige" hidden></div>`:""}
    </div>`).join("")}`:""}
    ${_TBP.todos.length?`${kopf("To-dos · landen in der Wiedervorlage")}${_TBP.todos.map((t,i)=>`<div style="border:var(--border-s);border-radius:10px;padding:8px 10px;margin-bottom:8px${t.weg?";opacity:.5":""}">
      <div style="display:flex;gap:6px;align-items:flex-start"><textarea id="tbp-todo-${i}" rows="1" style="${fld};flex:1"${t.weg?" disabled":""}>${esc(t.text)}</textarea>
        <button type="button" onclick="tbpTodoWeg(${i})" aria-pressed="${t.weg}" aria-label="${t.weg?"Doch übernehmen":"Nicht übernehmen"}" style="min-width:48px;min-height:48px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit">${t.weg?"↺":"✕"}</button></div>
      ${t.zustaendig?`<div style="font-size:var(--s-klein);color:var(--text2);margin-top:4px">Vorschlag: ${esc(TB_ROLLE[t.zustaendig]||t.zustaendig)} – nicht zugewiesen</div>`:""}
      ${t.weg?"":tbpDatumChips("todos",i,t)}</div>`).join("")}`:""}
    <div id="tbp-meldung" role="status" style="font-size:var(--s-klein);color:var(--text2);margin-top:8px"></div>
    <button id="tbp-passt" class="btn btn-p" onclick="tbPasstSo()" style="width:100%;min-height:56px;margin-top:10px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-check"></i>Passt so</button>
    <button class="btn" onclick="tbPruefenZu()" style="width:100%;min-height:48px;margin-top:8px;justify-content:center">Später</button>`;
  if(typeof felderWachsen==="function") felderWachsen(c);
}
function tbPruefenZu(){
  if(typeof _dk!=="undefined" && _dk && /^tbp-/.test(_dk.feldId||"") && typeof diktatStop==="function") diktatStop();
  document.getElementById("tb-pruefen")?.remove(); _TBP = null;
  if(typeof wieWarsKarte==="function") wieWarsKarte();
}
async function tbPasstSo(){
  if(!_TBP) return;
  if(typeof _dk!=="undefined" && _dk && /^tbp-/.test(_dk.feldId||"") && typeof diktatStop==="function") diktatStop();
  tbPruefenLesen();
  const e = _TBP.e;
  /* Antworten wörtlich übernehmen. Aha: ins leere Feld, sonst dahinter. Konsequenz: vorn als eigene
     Zeile – die Antwort auf „Welche zuerst?“ ist die erste. Beobachtung: dahinter. */
  _TBP.fragen.forEach(f=>{
    const a = String(f.antwort||"").trim(); if(!a) return;
    if(f.feld==="aha") e.aha = String(e.aha||"").trim() ? e.aha.trim()+"\n"+a : a;
    else if(f.feld==="konsequenz") _TBP.kons.unshift({id:null,text:a,bis:""});
    else e.beobachtung = String(e.beobachtung||"").trim() ? e.beobachtung.trim()+"\n"+a : a;
  });
  const kons = _TBP.kons.filter(k=>String(k.text||"").trim());
  const w = { baustein:_TBP.baustein, ausloeser:e.ausloeser, aha:e.aha };
  const fehlt = tbFehltFuerFertig(w, kons);
  if(kons.length && kons.some(k=>!k.bis)) fehlt.push("ein Datum je Konsequenz");
  const jetzt = new Date().toISOString();
  const daten = kons.map(k=>k.bis).filter(Boolean).sort();
  const body = { baustein:_TBP.baustein||null, beobachtung:String(e.beobachtung||"").trim()||null, aha:String(e.aha||"").trim()||null,
    konsequenz:kons.map(k=>k.text.trim()).join("\n")||null, konsequenz_bis:daten[0]||null,
    status: fehlt.length ? "keim" : "fertig", bestaetigt_am:jetzt, rueckfragen:[], updated_at:jetzt };
  const b = document.getElementById("tbp-passt"); if(b) b.disabled = true;
  const H = {...sbAuthHeaders(),'Content-Type':'application/json'};
  try{
    const r = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?id=eq.${Number(e.id)}`,{method:"PATCH",headers:H,body:JSON.stringify(body)});
    if(sbCheck401(r)) return;
    if(!r.ok && r.status!==204){ if(b) b.disabled = false; const m = document.getElementById("tbp-meldung"); if(m) m.textContent = sbDeniedMsg(r,"Nicht bestätigt – alles bleibt stehen"); return; }
    await tbPunkteSichern(e.id, _TBP.kons, { autor:e.autor, termin_id:e.termin_id, datum:e.datum });
    for(const t of _TBP.todos){
      if(!t.id) continue;
      if(t.weg || !String(t.text||"").trim()) await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?id=eq.${Number(t.id)}`,{method:"DELETE",headers:H});
      else await fetch(`${SB_URL}/rest/v1/tagebuch_punkt?id=eq.${Number(t.id)}`,{method:"PATCH",headers:H,body:JSON.stringify({text:t.text.trim(),bis:t.bis||null})});
    }
  }catch(x){ if(b) b.disabled = false; const m = document.getElementById("tbp-meldung"); if(m) m.textContent = "Keine Verbindung – alles bleibt stehen. Noch einmal „Passt so“, sobald du online bist."; return; }
  toast(fehlt.length ? `Bestätigt ✓ – als Keim, es fehlt noch: ${fehlt.join(", ")}` : "Bestätigt ✓ – steht im Tagebuch");
  tbPruefenZu();
  if(document.getElementById("tb-liste")) tagebuchListe();
}

/* ═══ v679 · „Wie war's?“ auf der Startseite ════════════════════════════════════════
   Nach einem Termin, für den du zugesagt hattest und den du noch nicht nachbereitet hast: eine Karte
   mit einem großen Mikrofon-Knopf (einzige Hauptaktion). Sonst, wenn Vorschläge warten: „Noch zu
   bestätigen“. Keine Benachrichtigung – die Karte steht, bis es erledigt ist (höchstens drei Tage). */
async function wieWarsKarte(){
  const slot = document.getElementById("home-wiewars"); if(!slot) return;
  if(typeof sbToken!=="function" || !sbToken()){ slot.innerHTML = ""; return; }
  const ich = await tbAutor(); if(!ich){ slot.innerHTML = ""; return; }
  const heute = new Date().toISOString().slice(0,10), ab = new Date(Date.now()-3*864e5).toISOString().slice(0,10);
  let termin = null, offen = [];
  try{
    const r = await fetch(`${SB_URL}/rest/v1/termine?select=id,datum,uhrzeit,uhrzeit_ende,typ,titel,gegner,trainer_status,platz_status&typ=in.(training,spiel,turnier)&datum=gte.${ab}&datum=lte.${heute}&order=datum.desc,uhrzeit.desc.nullslast&limit=10`,{headers:sbAuthHeaders()});
    const rows = r.ok ? ((await r.json())||[]) : [];
    const kand = rows.filter(t=>(t.trainer_status||{})[ich]==="ja"
      && tbTerminGelaufen(t)
      && !(typeof terminFaelltAus==="function" && terminFaelltAus(t)));
    if(kand.length){
      const tage = kand.filter(t=>t.typ==="training").map(t=>t.datum), ids = kand.filter(t=>t.typ!=="training").map(t=>t.id);
      const fertigT = new Set(), fertigE = new Set();
      if(tage.length){ const b = await fetch(`${SB_URL}/rest/v1/einheit_bewertung?select=datum&autor=eq.${encodeURIComponent(ich)}&datum=in.(${tage.join(",")})`,{headers:sbAuthHeaders()}); if(b.ok) ((await b.json())||[]).forEach(x=>fertigT.add(x.datum)); }
      if(ids.length){ const b = await fetch(`${SB_URL}/rest/v1/event_bewertung?select=termin_id&autor=eq.${encodeURIComponent(ich)}&termin_id=in.(${ids.join(",")})`,{headers:sbAuthHeaders()}); if(b.ok) ((await b.json())||[]).forEach(x=>fertigE.add(Number(x.termin_id))); }
      termin = kand.find(t=>t.typ==="training" ? !fertigT.has(t.datum) : !fertigE.has(Number(t.id))) || null;
    }
    const o = await fetch(`${SB_URL}/rest/v1/tagebuch_eintrag?select=id,datum,ausloeser&autor=eq.${encodeURIComponent(ich)}&ki_vorschlag=is.true&bestaetigt_am=is.null&order=datum.desc&limit=20`,{headers:sbAuthHeaders()});
    if(o.ok) offen = (await o.json())||[];
  }catch(e){}
  if(!document.getElementById("home-wiewars")) return;
  const karte = "background:var(--surface);border:var(--border-s);border-left:4px solid var(--purple);border-radius:var(--rl);padding:14px;margin-bottom:10px";
  const warten = offen.length ? `${offen.length} Vorschl${offen.length===1?"ag wartet":"äge warten"} auf „Passt so“` : "";
  if(termin){
    const art = termin.typ==="training" ? "Training" : termin.typ==="turnier" ? "Festival" : "Spiel";
    const wann = new Date(termin.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit"});
    slot.innerHTML = `<div class="wiewars" style="${karte}">
      <div style="font-size:var(--s-teil);font-weight:800">Wie war's?</div>
      <div style="font-size:var(--s-text);color:var(--text2);margin:2px 0 10px">${esc(art)}${termin.typ!=="training"&&(termin.titel||termin.gegner)?" „"+esc(termin.titel||termin.gegner)+"“":""} · ${esc(wann)}. Einmal erzählen – Bewertung, Tagebuch und To-dos entstehen daraus.</div>
      <button class="btn btn-p" onclick="wieWarsStart('${termin.typ==="training"?"d"+esc(termin.datum):"t"+Number(termin.id)}')" style="width:100%;min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-microphone"></i>Erzählen</button>
      ${warten?`<button type="button" onclick="tbPruefenOpen(${Number(offen[0].id)})" style="display:block;margin:8px auto 0;min-height:44px;background:none;border:none;color:var(--text2);font-family:inherit;font-size:var(--s-text);text-decoration:underline;cursor:pointer">${esc(warten)}</button>`:""}
    </div>`;
  }else if(offen.length){
    slot.innerHTML = `<div class="wiewars" style="${karte}">
      <div style="font-size:var(--s-teil);font-weight:800">Noch zu bestätigen</div>
      <div style="font-size:var(--s-text);color:var(--text2);margin:2px 0 10px">${esc(warten)} – zuletzt: ${esc(offen[0].ausloeser||tbDatumDe(offen[0].datum))}.</div>
      <button class="btn btn-p" onclick="tbPruefenOpen(${Number(offen[0].id)})" style="width:100%;min-height:56px;justify-content:center;font-size:var(--s-karte);font-weight:800"><i class="ti ti-checks"></i>Prüfen</button>
    </div>`;
  }else slot.innerHTML = "";
}
/* terminVorbei kennt nur die Endzeit; ein Training ohne Endzeit gilt 75 Minuten nach Beginn als gelaufen. */
function tbTerminGelaufen(t){
  if(typeof terminVorbei==="function" && terminVorbei(t)) return true;
  const heute = new Date().toISOString().slice(0,10);
  if(t.datum!==heute || t.uhrzeit_ende || !t.uhrzeit) return false;
  const [h,m] = String(t.uhrzeit).split(":").map(Number), jetzt = new Date();
  return jetzt.getHours()*60+jetzt.getMinutes() >= h*60+(m||0)+75;
}
/* Tipp 1: öffnet die Nachbereitung des Termins und sofort die Vollansicht mit laufendem Mikrofon. */
async function wieWarsStart(fuer){
  fuer = String(fuer||"");
  if(typeof _nbSchnell==="undefined") return;
  _nbSchnell = { fuer, art: fuer[0]==="d" ? "training" : "spiel" };
  if(fuer[0]==="d"){
    if(typeof einheitBewertenOpen!=="function" || typeof einheitDetailOpen!=="function") return;
    await einheitBewertenOpen(); await einheitDetailOpen(fuer.slice(1));
  }else{
    if(typeof fazitOpen!=="function") return;
    await fazitOpen(Number(fuer.slice(1)));
  }
  for(let i=0; i<40 && !document.getElementById("nb-box"); i++) await new Promise(r=>setTimeout(r,50));
  if(typeof nbWegAus==="function" && typeof _nbWeg!=="undefined" && _nbWeg) nbWegAus();
  if(typeof nbGross==="function") nbGross(_nbSchnell.art, true);
}

/* Die Startseite ist schon gezeichnet, wenn dieses Modul (Welle 2) ankommt – die Karte jetzt nachziehen. */
try{ if(document.getElementById("home-wiewars")) wieWarsKarte(); }catch(e){}

/* MODUL_WACHE: letzte Funktion der Datei. Stirbt sie vorher, fehlt genau dieser Name. */
function tagebuchModulDa(){ return true; }
