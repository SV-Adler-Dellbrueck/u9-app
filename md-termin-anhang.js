/* ═══════════════════════════════════════════════════════════════════════════════
   v789 · Anhänge am Termin (Charles 05.11.: „im Termin für die Eltern einen Anhang hinzufügen, der den Spielplan zeigt, den die Gastgeber
   uns geschickt haben“). Nach dem Muster der Rufe-Anhänge (md-adler-rufe.js, v736), aber nur Bilder und PDF, höchstens drei je Termin.

   · Trainer: im Fenster „Termin bearbeiten“ ein Abschnitt „📎 Anhänge“ – Datei wählen, Titel geben (Vorgabe „Spielplan der Gastgeber“),
     hochladen; löschen je Anhang. Bilder werden verkleinert (längste Kante 1600 px), PDF bleibt unverändert.
   · Eltern: im Termin-Fenster eine Karte mit Vorschau (Bild: antippen = groß mit Zoom; PDF: öffnet im Browser). Auf der Terminkarte und in der
     Liste „Danach“ steht ein kleiner Hinweis „📎 Spielplan“.
   · Speicher: privater Bucket termin-anhang, Tabelle termin_anhang (supabase/migrations/20261105_v789_termin_anhang.sql). Lesen wer den Termin sieht,
     schreiben und löschen nur Trainer. Die Datei wird nur mit dem Token des Angemeldeten geladen (kein öffentlicher Link).

   Ohne die Migration meldet die Abfrage einen Fehler; dann zeigt die App einfach nichts (Eltern) bzw. einen ruhigen Hinweis (Trainer).
   Von Welle 1 darf nichts hierher zeigen, ohne vorher auf typeof ... === "function" zu prüfen. */
const TA_MAX = 3, TA_BYTES = 10485760;
const TA_TYPEN = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", pdf: "application/pdf" };
let _taBlobs = {};          // pfad → Objekt-URL (nur für diese Sitzung)
window._taAnz = window._taAnz || {};   // termin_id → Titel der Anhänge (fürs Dashboard)

/* Reine Regeln (im Prüfstand ohne Netz testbar) */
function taName(roh) {
  let n = String(roh == null ? "" : roh).split(/[\\/]/).pop();
  n = n.replace(/[\u0000-\u001f\u007f]/g, "").replace(/[:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  if (!n) n = "Datei";
  if (n.length > 120) { const m = n.match(/(\.[A-Za-z0-9]{1,5})$/); const e = m ? m[1] : ""; n = n.slice(0, 120 - e.length) + e; }
  return n;
}
function taPruefen(name, groesse) {
  const m = String(name || "").toLowerCase().match(/\.([a-z0-9]{1,5})$/), e = m ? m[1] : "";
  const mime = TA_TYPEN[e];
  if (!mime) return { ok: false, grund: `„${taName(name)}“ geht nicht: erlaubt sind Bilder (JPEG, PNG, WebP, HEIC) und PDF. Eine Tabelle bitte als Screenshot oder PDF anhängen.` };
  if (!(Number(groesse) > 0)) return { ok: false, grund: `„${taName(name)}“ ist leer.` };
  if (Number(groesse) > TA_BYTES) return { ok: false, grund: `„${taName(name)}“ ist größer als 10 MB und lässt sich deshalb nicht anhängen.` };
  return { ok: true, endung: e === "jpeg" ? "jpg" : e, mime, art: /^image\//.test(mime) ? "bild" : "pdf" };
}
function taGroesse(b) { b = Number(b) || 0; return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB"; }
function taUuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const h = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/* ── Laden ───────────────────────────────────────────────────────────────────── */
async function taListe(terminId) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/termin_anhang?termin_id=eq.${Number(terminId)}&select=id,pfad,titel,name,mime,groesse&order=id.asc`, { headers: sbAuthHeaders() });
    if (!r.ok) return null;     // null = nicht lesbar (z. B. Migration fehlt); [] = lesbar, nichts da
    return (await r.json()) || [];
  } catch (e) { return null; }
}
/* Fürs Dashboard: je Termin die Titel der Anhänge, in einer Abfrage */
async function taAnzahlLaden(ids) {
  const l = (ids || []).map(Number).filter(Boolean);
  if (!l.length) return {};
  try {
    const r = await fetch(`${SB_URL}/rest/v1/termin_anhang?termin_id=in.(${l.join(",")})&select=termin_id,titel&order=id.asc`, { headers: sbAuthHeaders() });
    if (!r.ok) return {};
    const o = {};
    ((await r.json()) || []).forEach(x => { (o[x.termin_id] = o[x.termin_id] || []).push(x.titel); });
    window._taAnz = Object.assign(window._taAnz || {}, o);
    return o;
  } catch (e) { return {}; }
}
function taChip(terminId) {
  const t = (window._taAnz || {})[terminId]; if (!t || !t.length) return "";
  return `<span class="ta-chip" style="display:block;font-size:var(--s-klein);font-weight:700;color:#475569;margin-top:3px">📎 ${esc(t[0])}${t.length > 1 ? ` · +${t.length - 1}` : ""}</span>`;
}
async function taBlob(pfad) {
  if (_taBlobs[pfad]) return _taBlobs[pfad];
  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/authenticated/termin-anhang/${pfad}`, { headers: { 'Authorization': 'Bearer ' + sbToken(), 'apikey': SB_KEY } });
    if (!r.ok) return null;
    const u = URL.createObjectURL(await r.blob());
    _taBlobs[pfad] = u; return u;
  } catch (e) { return null; }
}
async function taOeffnen(pfad, mime, name) {
  const u = await taBlob(pfad);
  if (!u) { toast("Der Anhang lässt sich gerade nicht laden – bitte gleich noch einmal", "err"); return; }
  if (/^image\//.test(mime)) {
    if (typeof rufeBildGross === "function") return rufeBildGross(u, name);
    window.open(u, "_blank"); return;
  }
  const w = window.open(u, "_blank"); if (w) return;
  const l = document.createElement("a"); l.href = u; l.download = name; l.rel = "noopener"; document.body.appendChild(l); l.click(); l.remove();
}

/* ── Eltern: Karte im Termin-Fenster ────────────────────────────────────────────────────── */
async function taEltern(terminId) {
  const box = document.getElementById("td-anhang"); if (!box) return;
  const liste = await taListe(terminId);
  if (!document.getElementById("td-anhang")) return;     // Fenster schon zu
  if (!liste || !liste.length) { box.innerHTML = ""; return; }
  window._taAnz = window._taAnz || {}; window._taAnz[terminId] = liste.map(a => a.titel);
  box.innerHTML = `<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:var(--s-text);margin-bottom:6px">📎 ${liste.length === 1 ? esc(liste[0].titel) : "Anhänge zum Termin"}</div>
    ${liste.map(a => /^image\//.test(a.mime)
      ? `<div style="margin-bottom:8px">${liste.length > 1 ? `<div style="font-size:var(--s-klein);color:#475569;margin-bottom:2px">${esc(a.titel)}</div>` : ""}
          <button type="button" onclick="taOeffnen('${esc(a.pfad)}','${esc(a.mime)}','${esc(a.titel).replace(/'/g, "")}')" aria-label="${esc(a.titel)} groß ansehen" style="display:block;width:100%;padding:0;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;cursor:pointer;overflow:hidden">
            <img data-ta-pfad="${esc(a.pfad)}" alt="${esc(a.titel)}" style="display:block;width:100%;max-height:260px;min-height:120px;object-fit:contain"></button>
          <div style="font-size:var(--s-klein);color:#475569;margin-top:2px">Antippen zum Vergrößern</div></div>`
      : `<button type="button" onclick="taOeffnen('${esc(a.pfad)}','${esc(a.mime)}','${esc(a.name).replace(/'/g, "")}')" aria-label="PDF öffnen: ${esc(a.titel)}" style="display:flex;align-items:center;gap:10px;width:100%;min-height:56px;margin-bottom:8px;padding:8px 12px;text-align:left;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a;font-family:inherit;cursor:pointer">
          <span aria-hidden="true" style="font-size:var(--s-teil)">📄</span>
          <span style="flex:1;min-width:0"><span style="display:block;font-size:var(--s-text);font-weight:800">${esc(a.titel)}</span><span style="display:block;font-size:var(--s-klein);color:#475569">PDF · ${taGroesse(a.groesse)} · antippen zum Öffnen</span></span></button>`).join("")}
  </div>`;
  box.querySelectorAll("img[data-ta-pfad]").forEach(async img => { const u = await taBlob(img.dataset.taPfad); if (u && img.isConnected) img.src = u; });
}

/* ── Trainer: Abschnitt im Fenster „Termin bearbeiten“ ────────────────────────────────────── */
let _taAuswahl = null;      // { file, name, mime, endung, art } – die gerade gewählte, noch nicht hochgeladene Datei
async function taTrainer(terminId) {
  const box = document.getElementById("ta-slot"); if (!box) return;
  const liste = await taListe(terminId);
  if (!document.getElementById("ta-slot")) return;
  _taAuswahl = null;
  if (liste === null) { box.innerHTML = `<div style="font-size:var(--s-klein);color:var(--text2)">📎 Anhänge sind noch nicht freigeschaltet (Datenbank-Update fehlt).</div>`; return; }
  const voll = liste.length >= TA_MAX;
  box.innerHTML = `<div style="font-size:var(--s-text);font-weight:800;margin-bottom:4px">📎 Anhänge für die Eltern</div>
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:6px;line-height:1.45">Zum Beispiel der Spielplan der Gastgeber als Bild oder PDF. Die Eltern sehen ihn im Termin. Bitte keine Namen von Kindern.</div>
    ${liste.map(a => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span aria-hidden="true">${/^image\//.test(a.mime) ? "🖼️" : "📄"}</span>
        <span style="flex:1;min-width:0;font-size:var(--s-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.titel)} <span style="color:var(--text2);font-size:var(--s-klein)">· ${taGroesse(a.groesse)}</span></span>
        <button type="button" onclick="taLoeschen(${Number(terminId)},${Number(a.id)})" aria-label="Anhang ${esc(a.titel)} entfernen" style="min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:10px;background:var(--surface);color:var(--text);cursor:pointer;font-family:inherit">✕</button></div>`).join("")}
    <div id="ta-neu"></div>
    ${voll ? `<div style="font-size:var(--s-klein);color:var(--text2)">Höchstens ${TA_MAX} Anhänge je Termin. Zum Ersetzen erst einen entfernen.</div>`
      : `<label class="btn btn-sm" id="ta-knopf" style="min-height:48px;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><i class="ti ti-paperclip"></i>Anhang hinzufügen
          <input type="file" accept="image/*,application/pdf,.pdf" style="position:absolute;width:1px;height:1px;opacity:0" onchange="taDateiWahl(this,${Number(terminId)})"></label>`}`;
}
async function taDateiWahl(input, terminId) {
  const f = (input.files || [])[0]; input.value = ""; if (!f) return;
  const pr = taPruefen(f.name, f.size);
  if (!pr.ok) { toast(pr.grund, "err"); return; }
  _taAuswahl = { file: f, name: taName(f.name), mime: pr.mime, endung: pr.endung, art: pr.art };
  const neu = document.getElementById("ta-neu"); if (!neu) return;
  const vorgabe = "Spielplan der Gastgeber";
  neu.innerHTML = `<div style="border:1px solid var(--rand-bedien);border-radius:10px;padding:10px;margin:6px 0;background:var(--surface2)">
    <div style="font-size:var(--s-klein);color:var(--text2);margin-bottom:4px">${pr.art === "bild" ? "🖼️" : "📄"} ${esc(_taAuswahl.name)} · ${taGroesse(f.size)}</div>
    <label style="display:block;font-size:var(--s-klein);color:var(--text2)">Titel für die Eltern
      <input id="ta-titel" type="text" maxlength="80" value="${vorgabe}" style="width:100%;box-sizing:border-box;min-height:48px;margin-top:2px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:var(--s-text);background:var(--surface);color:var(--text)"></label>
    <div style="display:flex;gap:8px;margin-top:8px"><button type="button" id="ta-hoch" class="btn btn-p btn-sm" style="min-height:48px" onclick="taHochladen(${Number(terminId)})"><i class="ti ti-upload"></i>Hochladen</button>
      <button type="button" class="btn btn-sm" style="min-height:48px" onclick="_taAuswahl=null;document.getElementById('ta-neu').innerHTML=''">Abbrechen</button></div></div>`;
}
async function taHochladen(terminId) {
  const a = _taAuswahl; if (!a) return;
  const titel = (document.getElementById("ta-titel")?.value || "").trim();
  if (!titel) { toast("Bitte einen Titel eingeben, z. B. „Spielplan der Gastgeber“", "err"); return; }
  const knopf = document.getElementById("ta-hoch"); if (knopf) { knopf.disabled = true; knopf.textContent = "…"; }
  const zurueck = () => { if (knopf) { knopf.disabled = false; knopf.innerHTML = '<i class="ti ti-upload"></i>Hochladen'; } };
  let blob = a.file, mime = a.mime, endung = a.endung;
  if (a.art === "bild" && typeof rufeBildKleiner === "function") {
    const k = await rufeBildKleiner(a.file, a.mime);       // längste Kante 1600 px; kann der Browser das Bild nicht lesen (HEIC), geht es unverändert
    if (k) { blob = k.blob; mime = k.mime; endung = k.endung; }
  }
  if (blob.size > TA_BYTES) { toast("Die Datei ist auch verkleinert größer als 10 MB.", "err"); zurueck(); return; }
  const pfad = `${Number(terminId)}/${taUuid()}.${endung}`;
  let r;
  try { r = await fetch(`${SB_URL}/storage/v1/object/termin-anhang/${pfad}`, { method: "POST", headers: { 'Authorization': 'Bearer ' + sbToken(), 'apikey': SB_KEY, 'Content-Type': mime, 'x-upsert': 'false' }, body: blob }); } catch (e) { r = null; }
  if (!r || !r.ok) { toast("Hochladen hat nicht geklappt – bitte gleich noch einmal. Der Termin ist unverändert.", "err"); zurueck(); return; }
  try {
    const z = await fetch(`${SB_URL}/rest/v1/termin_anhang`, { method: "POST", headers: sbAuthHeaders({ 'Prefer': 'return=minimal' }), body: JSON.stringify({ termin_id: Number(terminId), pfad, titel: titel.slice(0, 80), name: a.name, mime, groesse: blob.size }) });
    if (!z.ok) { await taDateiWeg(pfad); toast("Der Anhang ließ sich nicht speichern (höchstens drei je Termin).", "err"); zurueck(); return; }
  } catch (e) { await taDateiWeg(pfad); toast("Kein Netz – Anhang nicht gespeichert.", "err"); zurueck(); return; }
  toast("Anhang gespeichert ✓");
  window._taAnz = window._taAnz || {}; delete window._taAnz[terminId];
  await taTrainer(terminId);
}
async function taDateiWeg(pfad) {
  try { await fetch(`${SB_URL}/storage/v1/object/termin-anhang/${pfad}`, { method: "DELETE", headers: { 'Authorization': 'Bearer ' + sbToken(), 'apikey': SB_KEY } }); } catch (e) { }
}
async function taLoeschen(terminId, id) {
  const liste = await taListe(terminId); const a = (liste || []).find(x => Number(x.id) === Number(id)); if (!a) return;
  const ok = await frageJaNein({ emoji: "🗑️", titel: "Anhang entfernen?", text: `„${a.titel}“ sehen die Eltern danach nicht mehr.`, ja: "Entfernen", nein: "Behalten", ton: "rot" });
  if (!ok) return;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/termin_anhang?id=eq.${Number(id)}`, { method: "DELETE", headers: sbAuthHeaders({ 'Prefer': 'return=minimal' }) });
    if (!r.ok) { toast("Entfernen hat nicht geklappt – bitte gleich noch einmal", "err"); return; }
  } catch (e) { toast("Kein Netz", "err"); return; }
  await taDateiWeg(a.pfad);
  if (_taBlobs[a.pfad]) { try { URL.revokeObjectURL(_taBlobs[a.pfad]); } catch (e) { } delete _taBlobs[a.pfad]; }
  window._taAnz = window._taAnz || {}; delete window._taAnz[terminId];
  toast("Anhang entfernt");
  await taTrainer(terminId);
}
/* ganz unten: Modulwache (Loader prüft, dass die Datei bis hierher gelaufen ist) */
function terminAnhangFertig() { return true; }
