/* v873 · Ein Wort je Sache (Bestandsaufnahme 4.2 Rest und 4.4, Charles 18.11.).
   a) Kein sichtbares „Provokationsregel“ mehr in boot.js und views.js (Kommentare ausgenommen) –
      die Sache heißt „Zusatzregel“.
   b) Der gerenderte Trainingsplan (Training füllen mit zwei Trainern) nennt den Zeitabschnitt
      nicht „Phase“ und den Platz einer Gruppe nicht „Station“.
   c) Die drei ⓘ stehen da: Leitfrage (Trainingsblock anlegen), Nominierung (Pausen-Fenster),
      Zusatzregel (Zeile im Hauptteil). Jedes ⓘ ist mindestens 44 × 44 px groß, per Tastatur
      erreichbar und öffnet seinen Satz. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v873 Wortliste: Block/Feld im Plan, Zusatzregel, ⓘ für Leitfrage, Nominierung und Zusatzregel";
  const probleme = [], zeilen = [];

  // a) Dateien ohne Kommentare durchsuchen
  const ohneKommentare = t => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").split("\n").map(z => z.replace(/(^|\s)\/\/.*$/, "")).join("\n");
  const treffer = [];
  for (const f of ["boot.js", "views.js", "shell.html"]) {
    const t = ohneKommentare(fs.readFileSync(path.join(h.REPO, f), "utf8"));
    const m = (t.match(/.{0,40}Provokationsregel.{0,20}/g) || []).filter(z => !/statt „Provokationsregel“/.test(z));   // die Neuigkeit v873 nennt das alte Wort
    if (!m.length) continue;
    treffer.push(f + ": " + m.join(" | "));
  }
  if (treffer.length) probleme.push("a) „Provokationsregel“ steht noch sichtbar da: " + treffer.join(" · "));
  else zeilen.push("a) „Provokationsregel“ in boot.js, views.js und shell.html nur noch in Kommentaren");

  const inaktiv = h.KINDER.slice(12);
  const d1 = h.tagePlus(3);
  const termine = [{ id: 91, datum: d1, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }];
  const plaene = {};
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const vorlagen = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
  const s = await h.starten({
    hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen({ inaktiv }), nominierungen: [], anwesenheit: [], periodisierung: [], trainingsvorlagen: vorlagen,
      termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        return plaene[d] ? [plaene[d]] : [];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ d1 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    await loadKader();
    const feld = document.getElementById("tp-date");
    if (![...feld.options].some(o => o.value === d1)) feld.add(new Option(d1, d1));
    feld.value = d1; await tpTrainerRsvpLaden(d1); await tpPlanRestore(d1); await warte(200);
    tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await warte(100);
    await tpGenerate(); await warte(500);
    // b) sichtbarer Text des Plans, ohne Auswahllisten (dort stehen Übungsnamen aus den Daten)
    const texte = [];
    const geh = document.createTreeWalker(document.getElementById("tp-timeline"), NodeFilter.SHOW_TEXT);
    let n; while ((n = geh.nextNode())) { if (n.parentElement.closest("select,option,script,style")) continue; texte.push(n.textContent); }
    const attr = [...document.querySelectorAll("#tp-timeline [aria-label], #tp-timeline [title]")].map(e => (e.getAttribute("aria-label") || "") + " " + (e.getAttribute("title") || ""));
    const alles = (texte.join(" ") + " " + attr.join(" ")).replace(/\s+/g, " ");
    out.planLaenge = alles.length;
    out.phase = (alles.match(/.{0,30}\bPhasen?\b.{0,20}/g) || []);
    out.station = (alles.match(/.{0,30}\bStation(en)?\b.{0,20}/g) || []);
    out.felder = [...document.querySelectorAll("#tp-timeline .tp-station")].length;

    const messen = sel => {
      const d = document.querySelector(sel);
      if (!d) return null;
      const sum = d.querySelector("summary");
      const b = sum.getBoundingClientRect();
      sum.focus(); const fokus = document.activeElement === sum;
      sum.click();
      const text = d.querySelector(".info-tipp-text");
      return { b: Math.round(b.width), h: Math.round(b.height), fokus, offen: d.open, label: sum.getAttribute("aria-label"), sichtbar: !!text && text.getBoundingClientRect().height > 0, satz: text ? text.textContent : "" };
    };
    // c) Zusatzregel: Zeile im Hauptteil
    const regel = tpAllForms().find(f => typeof tpIstZusatzregel === "function" && tpIstZusatzregel(f));
    if (regel) {
      const box = document.createElement("div"); box.id = "v873-regel";
      box.innerHTML = tpRegelZeile(0, { regel: regel.name });
      document.getElementById("tp-timeline").appendChild(box);
      out.regelText = box.textContent.replace(/\s+/g, " ").slice(0, 120);
      out.zusatz = messen('#v873-regel .info-tipp[data-begriff="Zusatzregel"]');
    }
    // c) Leitfrage: Trainingsblock anlegen
    if (typeof blockEditorOpen === "function") { await blockEditorOpen(); await warte(200); }
    out.leit = messen('#tb-modal .info-tipp[data-begriff="Leitfrage"]');
    document.getElementById("tb-modal")?.remove();
    // c) Nominierung: Pausen-Fenster
    if (typeof pausenOpen === "function") { await pausenOpen(); await warte(200); }
    out.nom = messen('#pause-modal .info-tipp[data-begriff="Nominierung"]');
    document.getElementById("pause-modal")?.remove();
    return out;
  }, { d1 }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) return h.ergebnis(titel, false, probleme.concat(["Fehler im Ablauf: " + r.fehler]));

  if (!r.planLaenge || r.felder < 2) probleme.push(`b) Plan nicht gerendert (${r.planLaenge} Zeichen, ${r.felder} Felder)`);
  else if (r.phase.length) probleme.push("b) „Phase“ im Plan: " + r.phase.join(" | "));
  else if (r.station.length) probleme.push("b) „Station“ im Plan: " + r.station.join(" | "));
  else zeilen.push(`b) Plan mit ${r.felder} Feldern: kein „Phase“, kein „Station“ (${r.planLaenge} Zeichen geprüft)`);

  const soll = { leit: "Leitfrage", nom: "Nominierung", zusatz: "Zusatzregel" };
  for (const k of Object.keys(soll)) {
    const m = r[k];
    if (!m) { probleme.push(`c) ⓘ für „${soll[k]}“ fehlt`); continue; }
    if (m.b < 44 || m.h < 44) probleme.push(`c) ⓘ „${soll[k]}“ misst ${m.b}×${m.h} px`);
    else if (!m.fokus) probleme.push(`c) ⓘ „${soll[k]}“ ist per Tastatur nicht erreichbar`);
    else if (!m.offen || !m.sichtbar || m.satz.length < 20) probleme.push(`c) ⓘ „${soll[k]}“ öffnet keinen Satz`);
    else zeilen.push(`c) ⓘ „${soll[k]}“ ${m.b}×${m.h} px, fokussierbar, „${m.satz.slice(0, 48)}…“`);
  }
  if (r.regelText && !/Zusatzregel/.test(r.regelText)) probleme.push("c) Die Regel-Zeile im Hauptteil sagt nicht „Zusatzregel“: " + r.regelText);
  if (fe.length) probleme.push("Konsolenfehler: " + fe.slice(0, 3).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
