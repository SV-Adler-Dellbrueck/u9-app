/* v876 · Knöpfe in sechs Bauarten (Charles 19.11., Bestandsaufnahme 4.6, Paket 1: Grundlage + Elternbereich).
   Hauptaktion .btn-p · Neben-Aktion .btn/.btn-sm · Gefahr .btn-d · Listenzeile .btn-zeile · Text-Link .btn-link ·
   runder Kopfzeilen-Knopf .btn-kopf. Farbe, Rand, Radius, Polster und Schriftstärke kommen aus styles.css, nicht aus
   dem Inline-Stil. Grün und Dunkelblau sind keine Knopffarben mehr; Grün bleibt Zustand (aria-pressed).
   a) Quelltext: in md-eltern-portal.js, md-adler-rufe.js und core.js trägt kein <button> mehr eine eigene Fläche,
      Farbe, Rand, Polster oder Schriftstärke im style – außer den unten aufgeführten Ausnahmen (je kurz begründet).
      Auch per createElement gebaute Knöpfe malen sich nicht selbst (style.cssText mit background).
   b) Gerendert – Eltern-Startseite (Menü offen), „Mein Konto“, Termin-Detail (mit eigenem Helfer-Eintrag), Adler-Rufe (mit Rufen und Aktionsmenü), PWA-Banner,
      Ja/Nein-Frage (normal und rot), Anmeldung – jeweils HELL und DUNKEL: jeder sichtbare Knopf hat Text ≥ 4,5:1
      gegen seine tatsächliche Fläche (gesperrte ausgenommen, WCAG), ist ≥ 44 px hoch, runde ≥ 44 × 44;
      runde Kopfknöpfe (.btn-kopf) sind Bedienelemente und brauchen 3:1. Das Eltern-Kopfband bleibt Vereinsblau
      (Charles 19.11.): Titel und Untertitel 4,5:1, Kopfknöpfe 3:1, Fokusrand 3:1 gegen das Band;
      .btn-link ist unterstrichen.
   c) Je Ansicht höchstens eine sichtbare .btn-p. */
"use strict";
const fs = require("fs"), path = require("path");

const DATEIEN = ["md-eltern-portal.js", "md-adler-rufe.js", "core.js"];
/* Ausnahmen: Zustand ist kein Knopfstil. Diese Knöpfe zeigen mit Farbe UND Zeichen/Text einen Zustand
   (aria-pressed, gewählt/nicht gewählt) oder sind gar kein Knopf im Sinne der Bauarten. */
const AUSNAHMEN = [
  [/aria-label="\$\{esc\(o\.name\|\|"Kind"\)\}: \$\{c\.lbl\}"/, "Antwortknöpfe Zusage/Unsicher/Absage/Krank (eigene Bauart seit v840, Zustand mit Haken + aria-pressed)"],
  [/style="\$\{stil\}"/, "Wochenkacheln „Diese Woche“ (v861, Tag + Zeichen je Termin)"],
  [/elternTerminAnsichtSetzen/, "Umschalter Kacheln/Liste/Beides (aria-pressed, Filter)"],
  [/class="ms-ich"/, "Mitspielen: gewählt grün, sonst Blau (aria-pressed, Zustand)"],
  [/tdPulsSave/, "Stimmungswahl „Wie war's“ (Auswahlkacheln, gewählte umrandet)"],
  [/tdHelferDelTask/, "Helfer-Aufgabe gewählt/frei (aria-pressed, Zustand)"],
  [/id="betreuung-knopf"/, "„Ich bleibe vor Ort“: Zustand grün, der Text sagt es"],
  [/aria-pressed="\$\{an\}" \$\{label\?/, "Raum-Chips der Adler-Rufe (aria-pressed, Filter)"],
  [/class="rf-art"/, "Art der Abstimmung (aria-pressed, Auswahl)"],
  [/class="rf-reakt"/, "Emoji-Reaktionen (aria-pressed)"],
  [/class="rf-emo"/, "Emoji-Auswahl im Aktionsmenü"],
  [/class="rf-option"/, "Abstimmungsoption mit Balken (aria-pressed)"],
  [/class="rf-bild"/, "Vorschaubild als Knopf – keine Fläche, das Bild ist der Inhalt"],
  [/class="rf-t-kopf/, "Kopf der Termin-Karte im Chat als Knopf (v993): Fläche aus .rf-t-kopf, im style nur der Rahmen zurückgesetzt"]
];
const VERBOTEN = /(^|;)\s*(background(-color)?|color|border(-[a-z]+)*|padding(-[a-z]+)*|font-weight)\s*:/;

/* Öffnende <button …>-Marken samt ${…}-Einschüben und Attributwerten mit „>“ (Pfeilfunktionen). */
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
/* Inhalt von style="…" – ${…} zählt mit (darin stehen oft die Farben), Konstanten werden eingesetzt. */
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
function verbotenIn(stil) {
  /* Stilangaben einzeln, auch die in ${a?"x":"y"} – darum an ; " ` ? : trennen ist zu grob; die Regex prüft
     jede Stelle, an der eine Angabe beginnen kann (Anfang, ; oder ein Anführungszeichen). */
  return stil.split(/[;"`]/).map(x => x.trim()).filter(x => VERBOTEN.test(";" + x)).map(x => x.split(":")[0]);
}

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
      r.push({ name, k: gesperrt ? null : window.__kontrastVon(b), h: Math.round(q.height), w: Math.round(q.width), rund,
        link: b.classList.contains("btn-link"), kopf: b.classList.contains("btn-kopf"), unter: /underline/.test(cs.textDecorationLine), p: b.classList.contains("btn-p") });
    }
    return r;
  };`;

module.exports = async function (h) {
  const titel = "v876 Knöpfe in sechs Bauarten (Elternbereich, Adler-Rufe, core.js)";
  const probleme = [], zeilen = [];

  // a) Quelltext
  const funde = [], ausnahmen = {};
  for (const datei of DATEIEN) {
    const src = fs.readFileSync(path.join(h.REPO, datei), "utf8");
    const konst = {};
    for (const m of src.matchAll(/const ([A-Za-z_$][\w$]*)\s*=\s*"([^"\n]*)"/g)) konst[m[1]] = m[2];
    for (const m of src.matchAll(/const ([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*\?[^;\n]*)/g)) if (!(m[1] in konst)) konst[m[1]] = m[2];   // const x=a?"…":"…"
    for (const k of knoepfe(src)) {
      const stil = stilVon(k.tag, konst); if (!stil) continue;
      const v = verbotenIn(stil); if (!v.length) continue;
      const a = AUSNAHMEN.find(([re]) => re.test(k.tag));
      if (a) { ausnahmen[a[1]] = (ausnahmen[a[1]] || 0) + 1; continue; }
      funde.push(`${datei}:${k.zeile} (${[...new Set(v)].join(", ")})`);
    }
    for (const m of src.matchAll(/createElement\("button"\)[^\n]*(\n[^\n]*){0,2}/g))
      if (/style\.cssText\s*=\s*"[^"]*background/.test(m[0])) funde.push(`${datei}:${src.slice(0, m.index).split("\n").length} (createElement mit eigener Fläche)`);
  }
  if (funde.length) probleme.push(`a) ${funde.length} Knöpfe mit eigener Fläche/Farbe im style: ` + funde.slice(0, 8).join(" · ") + (funde.length > 8 ? " …" : ""));
  else zeilen.push(`a) Quelltext: keine eigenen Knopffarben mehr · Ausnahmen: ${Object.values(ausnahmen).reduce((x, y) => x + y, 0)} Stellen in ${Object.keys(ausnahmen).length} Bauarten`);

  // b) + c) gerendert, hell und dunkel
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [1, 3, 5].map((t, i) => ({ id: 100 + i, datum: h.tagePlus(t), typ: i === 1 ? "spiel" : "training", titel: "", gegner: i === 1 ? "FC Beispiel" : "", heim: i === 1 ? false : null,
    uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }));
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const ruf = (id, text, extra) => Object.assign({ id, raum_id: 5, autor: "u-andere", autor_name: "Kind A Eltern", autor_zusatz: "", autor_rolle: "eltern", text, antwort_auf: null, an_alle: false,
    bearbeitet_am: null, archiviert_am: null, created_at: iso(id), anhang_entfernt_am: null, rufe_anhang: [] }, extra || {});
  const rufe = [ruf(3, "Lang: " + "Training morgen. ".repeat(30)), ruf(2, "Formular anbei", { rufe_anhang: [{ id: 2, pfad: "5/x.pdf", name: "Anmeldung.pdf", mime: "application/pdf", groesse: 120000 }] }), ruf(1, "Hallo zusammen")];
  const attrappe = () => h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }, { spieler_id: 4, label: "", kader: { id: 4, name: "Kind D", nr: 4 } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rufe_raum: () => [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }],
    rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : (/raum_id=eq\.5/.test(u.search) ? rufe : []),
    event_helfer: [{ id: 7, termin_id: 100, name: "Elternteil", aufgabe: "Kuchen", user_id: "u-eltern" }],
    rufe_reaktion: [{ nachricht_id: 1, emoji: "👍", user_id: "u-x" }], rufe_umfrage: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false, is_rufe_mod: false, rufe_ungelesen: [], rufe_umfrage_stand: [] } });

  const befunde = [], uebersicht = [], kopfband = [];
  const pruefen = (scheme, ansicht, liste) => {
    if (!liste) { befunde.push(`${scheme}/${ansicht}: nicht erreichbar`); return; }
    if (!liste.length) { befunde.push(`${scheme}/${ansicht}: kein Knopf sichtbar`); return; }
    for (const k of liste) {
      if (k.k !== null && k.k < (k.kopf ? 3 : 4.5)) befunde.push(`${scheme}/${ansicht}: „${k.name}“ Kontrast ${k.k}:1${k.kopf ? " (Kopfknopf, Soll 3:1)" : ""}`);
      if (k.h < 44) befunde.push(`${scheme}/${ansicht}: „${k.name}“ ${k.h} px hoch`);
      if (k.rund && k.w < 44) befunde.push(`${scheme}/${ansicht}: „${k.name}“ rund ${k.w}×${k.h}`);
      if (k.link && !k.unter) befunde.push(`${scheme}/${ansicht}: „${k.name}“ Text-Link ohne Unterstrich`);
    }
    const p = liste.filter(k => k.p).length;
    if (p > 1) befunde.push(`${scheme}/${ansicht}: ${p} Hauptaktionen (${liste.filter(k => k.p).map(k => k.name).join(" / ")})`);
    uebersicht.push(`${ansicht} ${liste.length}`);
  };

  for (const scheme of ["light", "dark"]) {
    // Anmeldung (ohne Sitzung)
    const a = await h.starten({ scheme, start: "/eltern/index.html?portal", angemeldet: false, warten: 2500, breite: 390, hoehe: 844, supabase: attrappe() });
    await a.page.evaluate(h.kontrastHelfer); await a.page.evaluate(MESSUNG);
    pruefen(scheme, "Anmeldung", await a.page.evaluate(() => window.__knopfMessung(document.getElementById("eltern-portal"))).catch(() => null));
    await a.page.evaluate(TOKEN => localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: TOKEN, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })), TOKEN);
    await a.page.reload({ waitUntil: "networkidle" }); await a.page.waitForTimeout(3500);
    const ev = fn => a.page.evaluate(fn).catch(e => { befunde.push(scheme + ": " + String(e).slice(0, 120)); return null; });
    await ev(h.kontrastHelfer); await ev(MESSUNG);
    await ev(() => { const k = document.getElementById("ep-menue-knopf"); if (k) k.click(); });
    await a.page.waitForTimeout(300);
    // Kopfband: bleibt Vereinsblau (Charles 19.11.); Titel 4,5:1, Kopfknöpfe (Bedienelemente) 3:1, Fokusrand 3:1 gegen das Band
    const band = await ev(() => {
      const b = document.getElementById("ep-kopf"); if (!b) return null;
      const titel = [...b.querySelectorAll("div")].find(d => d.textContent.trim() === "Eltern-Bereich");
      const k = document.getElementById("ep-menue-knopf"); k.focus({ focusVisible: true });
      const fr = getComputedStyle(k).outlineColor, bg = getComputedStyle(b).backgroundColor;
      const p = x => (x.match(/[\d.]+/g) || []).map(Number);
      const L = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
      const K = (a, c) => { const [x, y] = [L(a), L(c)].sort((m, n) => n - m); return +(((x + .05) / (y + .05)).toFixed(2)); };
      const out = { bg, titel: titel ? window.__kontrastVon(titel) : 0, gruss: window.__kontrastVon(document.getElementById("ep-gruss")),
        knoepfe: [...b.querySelectorAll("button.btn-kopf")].filter(x => x.getBoundingClientRect().height).map(x => window.__kontrastVon(x)),
        fokus: K(p(fr), p(bg)), fokusStil: getComputedStyle(k).outlineStyle };
      k.blur(); return out;
    });
    if (!band) befunde.push(scheme + ": Kopfband fehlt");
    else {
      if (!/26, 86, 219/.test(band.bg)) befunde.push(`${scheme}/Kopfband: nicht Vereinsblau (${band.bg})`);
      if (band.titel < 4.5 || band.gruss < 4.5) befunde.push(`${scheme}/Kopfband: Titel ${band.titel}:1, Untertitel ${band.gruss}:1 (Soll 4,5:1)`);
      if (!band.knoepfe.length || band.knoepfe.some(x => x < 3)) befunde.push(`${scheme}/Kopfband: Kopfknöpfe ${band.knoepfe.join("/")}:1 (Soll 3:1)`);
      if (band.fokus < 3 || band.fokusStil === "none") befunde.push(`${scheme}/Kopfband: Fokusrand ${band.fokusStil} ${band.fokus}:1`);
      kopfband.push(`${scheme}: Titel ${band.titel} · Untertitel ${band.gruss} · Knöpfe ${[...new Set(band.knoepfe)].join("/")} · Fokus ${band.fokus}`);
    }
    pruefen(scheme, "Startseite", await ev(() => document.getElementById("ep-dash-body") ? window.__knopfMessung(document, "#el-cat-overlay,#pwa-nudge") : null));
    await ev(() => { if (typeof pwaBannerShow === "function") pwaBannerShow("android"); });
    pruefen(scheme, "PWA-Banner", await ev(() => document.getElementById("pwa-nudge") ? window.__knopfMessung(document.getElementById("pwa-nudge")) : null));
    await ev(() => { document.getElementById("pwa-nudge")?.remove(); elternKontoOpen(); });
    await a.page.waitForTimeout(800);
    pruefen(scheme, "Mein Konto", await ev(() => document.getElementById("ep-konto-modal") ? window.__knopfMessung(document.getElementById("ep-konto-modal")) : null));
    await ev(() => { document.getElementById("ep-konto-modal")?.remove(); terminDetailOpen(100); });
    await a.page.waitForTimeout(1500);
    pruefen(scheme, "Termin-Detail", await ev(() => document.getElementById("td-modal") ? window.__knopfMessung(document.getElementById("td-modal")) : null));
    await ev(() => { document.getElementById("td-modal")?.remove(); rufeEinstieg(); });
    await a.page.waitForTimeout(2000);
    pruefen(scheme, "Adler-Rufe", await ev(() => document.getElementById("rufe-modal") ? window.__knopfMessung(document.getElementById("rufe-modal")) : null));
    await ev(() => { if (typeof rufeMenue === "function") rufeMenue(1); });
    await a.page.waitForTimeout(500);
    pruefen(scheme, "Rufe-Aktionen", await ev(() => document.getElementById("rufe-menue") ? window.__knopfMessung(document.getElementById("rufe-menue")) : null));
    await ev(() => { document.getElementById("rufe-menue")?.remove(); document.getElementById("rufe-modal")?.remove(); frageJaNein({ titel: "Löschen?", text: "Wirklich?", ja: "Löschen", ton: "rot" }); });
    await a.page.waitForTimeout(300);
    pruefen(scheme, "Frage rot", await ev(() => document.getElementById("frage-modal") ? window.__knopfMessung(document.getElementById("frage-modal")) : null));
    await ev(() => { document.getElementById("frage-modal")?.remove(); frageJaNein({ titel: "Weiter?", text: "Sicher?" }); });
    await a.page.waitForTimeout(300);
    pruefen(scheme, "Frage", await ev(() => document.getElementById("frage-modal") ? window.__knopfMessung(document.getElementById("frage-modal")) : null));
    const fe = a.fehler(); await a.schliessen();
    if (fe.length) befunde.push(scheme + " Konsole: " + fe.slice(0, 2).join(" | "));
  }
  if (befunde.length) probleme.push(`b/c) ${befunde.length} Befunde: ` + befunde.slice(0, 12).join(" · ") + (befunde.length > 12 ? " …" : ""));
  else zeilen.push(`b/c) hell und dunkel: Text ≥ 4,5:1, ≥ 44 px, Links unterstrichen, je Ansicht ≤ 1 Hauptaktion · Knöpfe je Ansicht: ${uebersicht.slice(0, 8).join(" · ")}`);
  zeilen.push("Kopfband (Kontrast :1): " + kopfband.join(" · "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
