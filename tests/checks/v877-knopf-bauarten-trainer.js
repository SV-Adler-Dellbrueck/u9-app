/* v877 · Knöpfe in sechs Bauarten – Paket 2: Trainer-Kernbereich (Charles 19.11., Bestandsaufnahme 4.6).
   Wie v876 für den Elternbereich: Hauptaktion .btn-p · Neben-Aktion .btn/.btn-sm · Gefahr .btn-d · Listenzeile .btn-zeile ·
   Text-Link .btn-link · runder Knopf .btn-kopf. Farbe, Rand, Radius, Polster und Schriftstärke kommen aus styles.css.
   a) Quelltext: in boot.js, md-turnierplan.js, views.js, md-tagebuch.js, md-matchcard.js, md-skizze.js und md-nest.js trägt
      kein <button> eine eigene Fläche, Farbe, Rand, Radius, Polster oder Schriftstärke im style – außer den unten
      aufgeführten Ausnahmen (je kurz begründet). Konstanten im style (auch über mehrere Zeilen mit + zusammengesetzt)
      werden eingesetzt; per createElement gebaute Knöpfe malen sich nicht selbst (style.cssText mit Farbe).
   b) Gerendert, HELL und DUNKEL, an Trainer-Ansichten: Trainingsplan (gefüllt), Übungen (Gruppe gewählt), Trainingsturnier,
      Kader, Kinderprofil, Kontakte, Tagebuch (Liste und neuer Eintrag), Trainer-Meeting, Adler-Nest-Redaktion:
      jeder sichtbare Knopf hat Text ≥ 4,5:1 (gesperrte ausgenommen, WCAG; .btn-kopf als Bedienelement 3:1),
      ist ≥ 44 px hoch, runde ≥ 44 × 44; .btn-link ist unterstrichen.
   c) Je Ansicht höchstens eine sichtbare .btn-p. */
"use strict";
const fs = require("fs"), path = require("path");

const DATEIEN = ["boot.js", "md-turnierplan.js", "views.js", "md-tagebuch.js", "md-matchcard.js", "md-skizze.js", "md-nest.js"];
/* Ausnahmen: Zustand ist kein Knopfstil, und nicht alles, was ein <button> ist, ist ein Knopf im Sinne der Bauarten. */
const AUSNAHMEN = [
  // Zustand mit aria-pressed (gewählt/nicht gewählt) – Farbe UND Zeichen/Rand/✓
  [/tbKindUmschalten\(|tbBaustein\(|tbSicht\(|tbChip\(|tbSichtKind\(|tbAusgabeWahl\(|tbpDatum\(|tbpDauerhaft\(|tbpBaustein\(|tbWirkungSetzen\(/, "Tagebuch: Auswahl-Chips und Umschalter (aria-pressed)"],
  [/class="kp-seg-btn"|class="kp-st-btn"/, "Kinderprofil: Stufen und Stärken (aria-pressed, ✓)"],
  [/class="rs-kind"|rueckmeldeStatistikRender\(|nutzungLaden\(|onclick="\$\{fn\}" aria-pressed/, "Filter- und Auswahl-Chips (aria-pressed)"],
  [/trainerRsvpSet\(/, "Trainer-Rückmeldung ja/nein/vielleicht (aria-pressed, Emoji + Text)"],
  [/tpVorplanJump\(/, "Terminwahl im Trainingsplan (aria-pressed, ✅/📝 + „gewählt“)"],
  [/tpSternSetzen\(|tpFokusToggle\(|tgAnzahlSetzen\(\$\{n\}\)/, "Planung: Sterne, Fokus, Gruppenzahl (aria-pressed, ✓)"],
  [/nomSet\(|abschlussSpielform\(|abschlussTrainer\(|class="fst-tausch"/, "Turnier: Status-, Spielform- und Tausch-Wahl (aria-pressed, ✓)"],
  [/skzBildWahl\(|skzBildSetzen\(|id="skz-zaehlen"|id="skz-wurf"/, "Skizze: Bild-Wahl und Schalter (aria-pressed, Zustand per Farbe aus dem Code)"],
  [/class="nest-ed-foto"|class="nest-ed-privat"/, "Nest-Redaktion: Fotoauswahl (aria-pressed, Rahmen + Nummer)"],
  // Auswahl-Chips ohne aria-pressed (Altlast, gewählt = Zustandsfarbe)
  [/_tfDb\.stern=|_tfDb\.lange=|_tpPick\.stern=|_tpPick\.gruppe=|kgGroesse\(|_rolleAnzahl=/, "Übungsfilter und Gruppengröße (gewählt grün = Zustand)"],
  [/onclick="\$\{onclick\}"|blzTrainerToggle\(/, "Trainingsturnier-Einstellungen (gewählt orange = Zustand)"],
  [/htPubFilter\(/, "Öffentliche Turnierseite: Team-Filter (gewählt = Zustand)"],
  [/dgPick\(/, "Live-Melder: Spielerwahl (gewählt = Zustand)"],
  // Kacheln und Zeilen, deren Rahmen die Karte trägt
  [/_tfDb\.gruppe=|awUebersichtZeig\(|onclick="tgOpen\(\)"|kachelRun\(|skzVorlage\(/, "Kacheln (Bereichsfarbe oben, Symbol + Text)"],
  [/class="phase-zeile"|class="zurueck-kopf"/, "Leitfarbe des Bereichs/der Phase am Rand (Klasse aus styles.css, Text nennt Bereich/Phase)"],
  [/class="ke-kopf"|tpShowExercise\(\$\{x\.i\}\)|tpPickerSet\(|tpArtTipp\(/, "Kopf/Text einer Listenzeile ohne eigene Fläche (die Karte ist der Rahmen)"],
  [/zieleToggle\(|tpollThemaToggle\(|saisonStartToggle\(/, "Abhak-Kästchen (✅/⬜ ist das Zeichen, keine Fläche)"],
  [/tpollVote\(|tpZelleTippen\(/, "Abstimmungs- und Planungszellen (Zustand mit Emoji/Zeichen)"],
  [/tgRename\(/, "Gruppenname in der Gruppenfarbe (Emoji + Name)"],
  // Spielfeld, Skizze, Live-Vollbild
  [/data-rot-name=|data-rot-leer=/, "Spielerpunkte auf dem Feld und Bank der Rotation"],
  [/dgSend\('(tor|aktion|parade)'\)/, "Live-Melder: Ereignisknöpfe mit Bedeutungsfarbe (Tor/Aktion/Parade, Emoji + Text)"],
  [/data-werk=|data-farbe=/, "Skizze: Werkzeuge und Farbwähler"],
  [/skzGross|skz-gross-|skzBesetzungTausch\(/, "Skizze groß: Vollbild auf dunklem Grund"],
  [/stTimer|tlSchliessen\(\)|tlBereit\(|tlAbbrechen\(|tlUebungZeigen\(|tlUhr|tlAbgeschlossen\(/, "Stationen-Timer und Trainingsstart: Live-Vollbild auf dunklem Grund"],
  [/blzTorOv\(|blzTimerStop\(|_blzT\.paused|blzAbpfiff\(/, "Trainingsturnier live: Vollbild auf dunklem Grund"],
  [/kabineReporter\(/, "Kabine (Kinderbereich): eigener dunkler Raum"]
];
const VERBOTEN = /(^|;)\s*(background(-color)?|color|border(-[a-z]+)*|padding(-[a-z]+)*|font-weight)\s*:/;

function knoepfe(src) {
  const out = []; let i = 0;
  while ((i = src.indexOf("<button", i)) >= 0) {
    let j = i + 7, tiefe = 0, q = null;
    for (; j < src.length; j++) {
      const c = src[j];
      if (tiefe > 0) { if (c === "{") tiefe++; else if (c === "}") tiefe--; continue; }
      if (c === "$" && src[j + 1] === "{") { tiefe = 1; j++; continue; }
      if (q) { if (c === q) q = null; continue; }
      if ((c === '"' || c === "'") && src[j - 1] === "=") { q = c; continue; }
      if (c === ">") break;
    }
    out.push({ zeile: src.slice(0, i).split("\n").length, tag: src.slice(i, j + 1) }); i = j;
  }
  return out;
}
function stilVon(tag, konst) {
  const k = tag.indexOf('style="'); if (k < 0) return "";
  let j = k + 7, tiefe = 0;
  for (; j < tag.length; j++) {
    const c = tag[j];
    if (tiefe > 0) { if (c === "{") tiefe++; else if (c === "}") tiefe--; continue; }
    if (c === "$" && tag[j + 1] === "{") { tiefe = 1; j++; continue; }
    if (c === '"') break;
  }
  return tag.slice(k + 7, j).replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (m, n) => (n in konst ? konst[n] : m));
}
const verbotenIn = stil => stil.split(/[;"`]/).map(x => x.trim()).filter(x => VERBOTEN.test(";" + x) || /^border-radius\s*:/.test(x)).map(x => x.split(":")[0]);

const MESSUNG = `
  window.__knopfMessung = (wurzel, ohne) => {
    const r = [];
    const alle = [...(wurzel || document).querySelectorAll("button")].filter(b => {
      if (ohne && b.closest(ohne)) return false;
      const q = b.getBoundingClientRect(), cs = getComputedStyle(b);
      return q.width > 0 && q.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    });
    for (const b of alle) {
      const q = b.getBoundingClientRect(), cs = getComputedStyle(b);
      const name = (b.id ? "#" + b.id + " " : "") + ((b.getAttribute("aria-label") || b.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 28));
      const rund = parseFloat(cs.borderTopLeftRadius) >= Math.min(q.width, q.height) / 2 - 1 && Math.abs(q.width - q.height) < 2;
      const gesperrt = b.disabled || b.getAttribute("aria-disabled") === "true";
      let verlauf = false; for (let e = b; e; e = e.parentElement) if (getComputedStyle(e).backgroundImage !== "none") { verlauf = true; break; }
      r.push({ name, verlauf, k: gesperrt || verlauf ? null : window.__kontrastVon(b), h: Math.round(q.height), w: Math.round(q.width), rund,
        link: b.classList.contains("btn-link"), kopf: b.classList.contains("btn-kopf"), unter: /underline/.test(cs.textDecorationLine), p: b.classList.contains("btn-p") });
    }
    return r;
  };`;

module.exports = async function (h) {
  const titel = "v877 Knöpfe in sechs Bauarten (Trainer-Kernbereich)";
  const probleme = [], zeilen = [];

  // a) Quelltext
  const funde = [], ausnahmen = {};
  let gesamt = 0;
  for (const datei of DATEIEN) {
    const src = fs.readFileSync(path.join(h.REPO, datei), "utf8");
    const konst = {};
    for (const m of src.matchAll(/const ([A-Za-z_$][\w$]*)\s*=\s*((?:"[^"\n]*"\s*\+?\s*)+)[;,\n]/g)) konst[m[1]] = [...m[2].matchAll(/"([^"\n]*)"/g)].map(x => x[1]).join("");
    for (const m of src.matchAll(/const ([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*\?[^;\n]*)/g)) if (!(m[1] in konst)) konst[m[1]] = m[2];
    for (const k of knoepfe(src)) {
      gesamt++;
      const stil = stilVon(k.tag, konst); if (!stil) continue;
      const v = verbotenIn(stil); if (!v.length) continue;
      const a = AUSNAHMEN.find(([re]) => re.test(k.tag));
      if (a) { ausnahmen[a[1]] = (ausnahmen[a[1]] || 0) + 1; continue; }
      funde.push(`${datei}:${k.zeile} (${[...new Set(v)].join(", ")})`);
    }
    for (const m of src.matchAll(/createElement\("button"\)[^\n]*(\n[^\n]*){0,2}/g))
      if (/cssText\s*=\s*["'`][^"'`]*(background|color|border|padding)/.test(m[0])) funde.push(`${datei}:${src.slice(0, m.index).split("\n").length} (createElement mit eigener Fläche)`);
  }
  if (funde.length) probleme.push(`a) ${funde.length} Knöpfe mit eigener Fläche/Farbe im style: ` + funde.slice(0, 8).join(" · ") + (funde.length > 8 ? " …" : ""));
  else zeilen.push(`a) Quelltext: ${gesamt} Knöpfe, keine eigenen Knopffarben mehr · Ausnahmen: ${Object.values(ausnahmen).reduce((x, y) => x + y, 0)} Stellen in ${Object.keys(ausnahmen).length} Bauarten`);

  // b) + c) gerendert, hell und dunkel
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const d2 = h.tagePlus(3);
  const befunde = [], uebersicht = [], verlaeufe = new Set();
  const pruefen = (scheme, ansicht, liste) => {
    if (!liste) { befunde.push(`${scheme}/${ansicht}: nicht erreichbar`); return; }
    if (!liste.length) { befunde.push(`${scheme}/${ansicht}: kein Knopf sichtbar`); return; }
    for (const k of liste) {
      if (k.verlauf) verlaeufe.add(`${ansicht}: „${k.name}“`);
      if (k.k !== null && k.k < (k.kopf ? 3 : 4.5)) befunde.push(`${scheme}/${ansicht}: „${k.name}“ Kontrast ${k.k}:1${k.kopf ? " (Kopfknopf, Soll 3:1)" : ""}`);
      if (k.h < 44) befunde.push(`${scheme}/${ansicht}: „${k.name}“ ${k.h} px hoch`);
      if (k.rund && k.w < 44) befunde.push(`${scheme}/${ansicht}: „${k.name}“ rund ${k.w}×${k.h}`);
      if (k.link && !k.unter) befunde.push(`${scheme}/${ansicht}: „${k.name}“ Text-Link ohne Unterstrich`);
    }
    const p = liste.filter(k => k.p).length;
    if (p > 1) befunde.push(`${scheme}/${ansicht}: ${p} Hauptaktionen (${liste.filter(k => k.p).map(k => k.name).join(" / ")})`);
    if (scheme === "light") uebersicht.push(`${ansicht} ${liste.length}`);
  };

  for (const scheme of ["light", "dark"]) {
    const plaene = {};
    const termine = [{ id: 92, datum: d2, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }];
    const s = await h.starten({ scheme, breite: 390, hoehe: 844, warten: 2500, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), nominierungen: [], anwesenheit: [], profiles: [{ name: "Charles", rolle: "trainer" }],
      termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
      trainingsformen: (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true })), trainingsvorlagen: (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i })), periodisierung: [],
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => { if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: JSON.stringify([b]) }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return plaene[d] ? [plaene[d]] : []; },
      tagebuch_punkt: [{ id: 5, datum: h.tagePlus(-2), status: "fertig", baustein: "ich", ausloeser: "Training", aha: "Pausen sind Lernzeit.", schlagworte: ["Ruhe"], kons: [] },
        { id: 6, datum: h.tagePlus(-1), status: "keim", baustein: "ich", ausloeser: "Gedanke", aha: "", schlagworte: [], kons: [] }], tagebuch_kind: [],
      heft_ausgabe: [{ id: 3, nummer: 3, status: "entwurf", schlagzeile: "Test-Schlagzeile", veroeffentlicht_am: null, termin_id: null, termine: null }],
      eltern_kinder: [{ id: 1, email: "eltern@example.org", label: "" }], kind_kontakte: [{ id: 1, name: "", rolle: "Elternteil", telefon: "0170 0000000", geburtstag: null }],
      trainer_poll: [], trainer_poll_slot: [], trainer_poll_vote: [], trainer_meeting_thema: []
    }) });
    const ev = fn => s.page.evaluate(fn).catch(e => { befunde.push(scheme + ": " + String(e).slice(0, 140)); return null; });
    await ev(() => { document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block"; window.sbToken = () => "t"; });
    await ev(h.kontrastHelfer); await ev(MESSUNG);
    const nehmen = async (ansicht, code, wurzel, ohne, warte) => {
      const r = await s.page.evaluate(async ({ code, wurzel, ohne, warte }) => {
        const w = ms => new Promise(x => setTimeout(x, ms));
        try { await eval("(async()=>{" + code + "})()"); } catch (e) { return { fehler: String(e).slice(0, 120) }; }
        await w(warte || 600);
        const el = document.querySelector(wurzel); if (!el) return null;
        return window.__knopfMessung(el, ohne);
      }, { code, wurzel, ohne, warte }).catch(e => ({ fehler: String(e).slice(0, 120) }));
      if (r && r.fehler) { befunde.push(`${scheme}/${ansicht}: ${r.fehler}`); return; }
      pruefen(scheme, ansicht, r);
    };
    await ev(async () => { if (typeof loadKader === "function") await loadKader(); });
    // Trainingsplan, gefüllt
    await nehmen("Trainingsplan", `go("planung"); await new Promise(x=>setTimeout(x,800));
      const feld=document.getElementById("tp-date"); if(![...feld.options].some(o=>o.value==="${d2}"))feld.add(new Option("${d2}","${d2}")); feld.value="${d2}";
      await tpTrainerRsvpLaden("${d2}"); await tpPlanRestore("${d2}"); await new Promise(x=>setTimeout(x,300)); tpGenerate();`, "#train-sub-planung", null, 1200);
    // Übungen: eine Gruppe gewählt (Liste mit Bearbeiten/In-den-Plan)
    await nehmen("Übungen", `go("formen"); await new Promise(x=>setTimeout(x,500)); const b=document.querySelector('#train-sub-formen button[onclick^="_tfDb.gruppe"]'); if(b)b.click();`, "#train-sub-formen", null, 800);
    // Trainingsturnier
    await nehmen("Trainingsturnier", `go("home"); blitzOpen();`, "#blitz-modal", null, 600);
    await ev(() => document.getElementById("blitz-modal")?.remove());
    // Kader und Kinderprofil (das Kopfband des Profils ist ein Farbverlauf – dort nicht messbar, Knöpfe hell auf Blau)
    await nehmen("Kader", `go("kader");`, "#view-kader", null, 800);
    await nehmen("Kinderprofil", `kinderProfilOpen(1);`, "#kp-modal", "[data-kopf]", 800);
    await ev(() => { if (typeof kinderProfilZu === "function") kinderProfilZu(); document.getElementById("kp-modal")?.remove(); });
    await nehmen("Kontakte", `kontakteEditOpen(1);`, "#kontakte-modal", null, 900);
    await ev(() => document.getElementById("kontakte-modal")?.remove());
    // Tagebuch: Liste und neuer Eintrag
    await nehmen("Tagebuch", `go("tagebuch");`, "#train-sub-tagebuch", null, 1000);
    await nehmen("Tagebuch-Eintrag", `tagebuchNeu();`, "#tb-modal", null, 400);
    await ev(() => { if (typeof tagebuchSchliessen === "function") tagebuchSchliessen(); document.getElementById("tb-modal")?.remove(); });
    // Trainer-Meeting, Adler-Nest-Redaktion
    await nehmen("Trainer-Meeting", `go("home"); await trainerMeetingOpen();`, "#tm-meet-modal", null, 900);
    await ev(() => document.getElementById("tm-meet-modal")?.remove());
    await nehmen("Nest-Redaktion", `nestEditorOpen();`, "#nest-ed", null, 900);
    await ev(() => document.getElementById("nest-ed")?.remove());
    const fe = s.fehler(); await s.schliessen();
    if (fe.length) befunde.push(scheme + " Konsole: " + fe.slice(0, 2).join(" | "));
  }
  if (befunde.length) probleme.push(`b/c) ${befunde.length} Befunde: ` + befunde.slice(0, 12).join(" · ") + (befunde.length > 12 ? " …" : ""));
  else zeilen.push(`b/c) hell und dunkel: Text ≥ 4,5:1 (Kopfknöpfe 3:1), ≥ 44 px, Links unterstrichen, je Ansicht ≤ 1 Hauptaktion · Knöpfe je Ansicht: ${uebersicht.join(" · ")}`);
  /* Auf einem Farbverlauf rechnet der Kontrasthelfer gegen Weiß – dort nicht messbar (wie v619). Es sind die Knöpfe aus
     shell.html (nicht in diesem Paket) und das Kopfband des Kinderprofils (hell auf Vereinsblau). */
  if (verlaeufe.size) zeilen.push("auf Farbverlauf, nicht gemessen: " + [...verlaeufe].join(" · "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
