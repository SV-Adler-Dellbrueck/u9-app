/* v878 · Knöpfe in sechs Bauarten – Paket 3, Abschluss (Charles 19.11., Bestandsaufnahme 4.6).
   Wie v876 (Eltern) und v877 (Trainer-Kern): Hauptaktion .btn-p · Neben-Aktion .btn/.btn-sm · Gefahr .btn-d ·
   Listenzeile .btn-zeile · Text-Link .btn-link · runder Knopf .btn-kopf. Farbe, Rand, Radius, Polster und
   Schriftstärke kommen aus styles.css.
   a) Quelltext: shell.html und die übrigen Module tragen an keinem <button> eine eigene Fläche, Farbe, Rand, Radius,
      Polster oder Schriftstärke im style – außer den unten aufgeführten Ausnahmen (je kurz begründet). Konstanten im
      style werden eingesetzt; per createElement gebaute Knöpfe malen sich nicht selbst.
      md-kabine.js und quiz.js behalten ihr spielerisches Aussehen (bewusste Entscheidung) – dort keine Stilprüfung.
   b) Gerendert, HELL und DUNKEL: Kopfzeile, Trainingsplan, Termine, Anwesenheit, KI-Coach, Mannschaftskasse,
      Feier-Dialog, Galerie, Mitfahrt, Kabine-Start und Quiz. Jeder sichtbare Knopf hat Text ≥ 4,5:1 (gesperrte
      ausgenommen, WCAG; .btn-kopf und reine Symbol-Knöpfe als Bedienelement 3:1), ist ≥ 44 px hoch, runde ≥ 44 × 44;
      .btn-link ist unterstrichen; je Ansicht höchstens eine sichtbare .btn-p (Kinderbereich ausgenommen).
      Anders als v877 wird auf Farbverläufen gemessen: gegen jede Farbstufe des Verlaufs, die schlechteste zählt –
      die Kabine liegt ganz auf einem Verlauf.
   c) Auswahl-Chips, die „gewählt“ früher nur über Farbe zeigten, tragen aria-pressed, das beim Tippen wechselt,
      und ein Zeichen außer Farbe (✓): Übungsfilter, Gruppengröße, Rollen-Anzahl, Übungswahl im Plan,
      Trainingsturnier-Einstellungen, öffentliche Turnierseite, Live-Melder, Kader-Filter, Kassen-Filter,
      Platz-Ampel, Termin-Umfrage, Bewertungs-Stufen, KI-Coach-Reiter. */
"use strict";
const fs = require("fs"), path = require("path");

const DATEIEN = ["shell.html", "md-kasse.js", "md-teamkasse.js", "md-fazit.js", "md-gegner.js", "md-galerie.js", "md-feier.js", "md-carpool.js",
  "md-einheit-import.js", "md-termin-anhang.js", "md-liveticker.js", "md-ki-coach.js", "md-fanfakten.js", "md-quests.js", "md-bewertungsrunde.js",
  "md-voice.js", "md-fundbuero.js", "md-spielbericht.js", "md-live-vollbild.js",
  "md-abzeichen.js", "md-analyse.js", "md-ausruestung.js", "md-block.js", "md-kalender.js", "md-kindtraining.js", "md-matchuhr.js", "md-teams.js", "md-wissen.js"];
const AUSNAHMEN = [
  // Zustand mit aria-pressed – Farbe UND ✓/Zeichen/kräftiger Rand
  [/epollVote\(|platzAmpelSet\(|kindRsvp\(|blitzSetCrit\(/, "Abstimmung, Platz-Ampel, Kinder-Rückmeldung, Bewertungs-Stufe (aria-pressed + ✓)"],
  [/class="kz-kind"|class="mk-filter"|class="tm-ab-ferien|class="ka-karte/, "Bezahlt-Haken, Kassen-Filter, Ferien-Wahl, Kartenfoto (aria-pressed + ✓/⭐)"],
  [/fazitSet\(|nbVerzichtGrund\(|class="nb-kachel"|nbWegKind\(|nbWegOrga\(/, "Spieltag-Fazit: Stufen und Kacheln (aria-pressed, ✓/Symbol/kräftiger Rand)"],
  [/class="vu-thema"|vuWaehlen\(|aria-pressed="\$\{an\?"true":"false"\}" style="min-height:48px;padding:6px 14px|onclick="\$\{fn\}" aria-pressed="\$\{an\}"/, "Vorlagen: Leitfragen, Einheiten und Filter (aria-pressed + ✓ + kräftiger Rand)"],
  [/class="fv-art"|mcSetHalbzeiten\(|teamTrainerToggle\(|blockVorlageUmschalten\(|aria-pressed="\$\{an\}" onclick="\$\{onclick\}"/, "Federn-Art, Halbzeiten, Team-Trainer, Block-Wahl (aria-pressed + ✓)"],
  [/id="nb-gross-mic"|id="nb-gross-stopp"/, "Aufnahme-Tasten grün „Jetzt aufnehmen“ / rot „Stopp / Pause“ (PO-Entscheidung v764, Prüffall v630)"],
  [/tmTrainerToggle\(/, "Trainer-Status dabei/unsicher/nicht dabei (✓/🤔/✕ im Text, Tippen wechselt)"],
  [/class="team-chip"/, "Kind im Team (Team steht im Text und im Namen)"],
  [/teamTrainerOpen\(\$\{t\}\)/, "Team ohne Trainer: Warnfarbe am Rand, der Text sagt „Trainer wählen“"],
  // Kacheln und Klappköpfe, deren Karte der Rahmen ist
  [/vorlagenAnsichtOpen\(\)|onclick="openAddTraining\(\)"|onclick="kiCoachOpen\(\)"|onclick="periodOpen\(\)"|dfb-regal|onclick="trainerPlanOpen\(\)"|grillTrainerOpen\(\)/, "Kacheln in shell.html (Bereichsfarbe oben, Symbol + Text)"],
  [/class="stg-album"|taOeffnen\('\$\{esc\(a\.pfad\)\}','\$\{esc\(a\.mime\)\}','\$\{esc\(a\.titel\)/, "Vorschaubild als Knopf – das Bild ist der Inhalt"],
  [/vaToggle\(|spieltagKarteOeffnen\(|wissenAuf\(|id="wissen-kachel"|kt-homekarte/, "Klappkopf/Kachel einer Karte (Leitfarbe am Rand, keine eigene Fläche)"],
  // Vollbild auf dunklem Grund
  [/gal-gross/, "Foto-Großansicht: Vollbild auf dunklem Grund"],
  [/fairplayQuizAnswer\(/, "Fairplay-Quiz: Antwortkarten auf dunklem Vollbild (richtig/falsch per Rand und Text)"],
  [/atLivePick\(|atLiveRecord\(|atLiveAction=null/, "Live-Erfassung: Steuerungen auf großem Spielfeld (Vollbild, dunkel)"]
];
const VERBOTEN = /(^|;)\s*(background(-color)?|color|border(-[a-z]+)*|padding(-[a-z]+)*|font-weight)\s*:/;
/* Auswahl-Chips aus Teil c) – Quelltext: aria-pressed im Knopf und ✓ im Text */
const CHIPS = [
  ["boot.js", /_tfDb\.stern=\$\{s\}/, "Übungsfilter Sterne"], ["boot.js", /_tfDb\.lange=!/, "Übungsfilter „lange her“"],
  ["boot.js", /kgGroesse\(\$\{n\}\)/, "Gruppengröße"], ["boot.js", /_rolleAnzahl=\$\{n\}/, "Rollen-Anzahl"],
  ["boot.js", /_tpPick\.gruppe=/, "Übungswahl im Plan: Gruppe"], ["boot.js", /_tpPick\.stern=/, "Übungswahl im Plan: Sterne"],
  ["md-turnierplan.js", /onclick="\$\{onclick\}" aria-pressed="\$\{!!aktiv\}"/, "Trainingsturnier-Einstellungen"], ["md-turnierplan.js", /blzTrainerToggle\('/, "Trainingsturnier: Trainer"],
  ["md-turnierplan.js", /htPubFilter\(null\)/, "Turnierseite: Filter Alle"], ["md-turnierplan.js", /htPubFilter\(\$\{i\}\)/, "Turnierseite: Team-Filter"],
  ["md-matchcard.js", /dgPick\('/, "Live-Melder: Spielerwahl"], ["md-gegner.js", /platzAmpelSet\(/, "Platz-Ampel"],
  ["md-kasse.js", /epollVote\(/, "Eltern-Terminumfrage"], ["views.js", /tpollVote\(/, "Trainer-Terminumfrage"],
  ["md-live-vollbild.js", /blitzSetCrit\(/, "Bewertungs-Stufen"], ["md-spielbericht.js", /kindRsvp\(/, "Kinder-Rückmeldung"]
];

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
    out.push({ zeile: src.slice(0, i).split("\n").length, tag: src.slice(i, j + 1), rest: src.slice(j + 1, j + 400) }); i = j;
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

/* Kontrast gegen die tatsächliche Fläche – auf einem Verlauf gegen jede Farbstufe (schlechteste zählt). */
const MESSUNG = `
  (() => {
    const lum=c=>{const v=c.slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
    const parse=s=>{const m=String(s).match(/(\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?),\\s*(\\d+(?:\\.\\d+)?)(?:,\\s*([\\d.]+))?/);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null;};
    const drauf=(v,h)=>{const a=v[3];return [0,1,2].map(i=>v[i]*a+h[i]*(1-a)).concat(1);};
    const kontrast=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
    const flaechen=el=>{
      const kette=[];for(let e=el;e;e=e.parentElement)kette.push(e);
      let kand=[[255,255,255,1]];
      for(let i=kette.length-1;i>=0;i--){const cs=getComputedStyle(kette[i]);
        const bc=parse(cs.backgroundColor); if(bc&&bc[3]>0)kand=kand.map(k=>drauf(bc,k));
        const bi=cs.backgroundImage;
        if(bi&&bi!=="none"&&/gradient/.test(bi)){const st=[...bi.matchAll(/rgba?\\([^)]*\\)/g)].map(m=>parse(m[0])).filter(Boolean);
          if(st.length){const neu=[];for(const k of kand)for(const f of st)neu.push(drauf(f,k));
            const s=new Set();kand=neu.filter(c=>{const key=c.slice(0,3).map(Math.round).join();if(s.has(key))return false;s.add(key);return true;}).slice(0,60);}}
      }
      return kand;
    };
    window.__k878=el=>{const fg=parse(getComputedStyle(el).color)||[0,0,0,1];let min=99;for(const k of flaechen(el))min=Math.min(min,kontrast(drauf(fg,k),k));return +min.toFixed(2);};
    window.__knopf878=(wurzel,ohne)=>{
      const r=[];
      const alle=[...(wurzel||document).querySelectorAll("button")].filter(b=>{
        if(ohne&&b.closest(ohne))return false;
        const q=b.getBoundingClientRect(),cs=getComputedStyle(b);
        return q.width>0&&q.height>0&&cs.visibility!=="hidden"&&cs.display!=="none";
      });
      for(const b of alle){const q=b.getBoundingClientRect(),cs=getComputedStyle(b);
        const txt=(b.textContent||"").trim();
        const name=(b.id?"#"+b.id+" ":"")+((b.getAttribute("aria-label")||txt).replace(/\\s+/g," ").slice(0,28));
        const rund=parseFloat(cs.borderTopLeftRadius)>=Math.min(q.width,q.height)/2-1&&Math.abs(q.width-q.height)<2;
        const gesperrt=b.disabled||b.getAttribute("aria-disabled")==="true";
        const symbol=!/[A-Za-zÄÖÜäöüß0-9]/.test(txt);
        r.push({name,k:gesperrt?null:window.__k878(b),h:Math.round(q.height),w:Math.round(q.width),rund,symbol,
          link:b.classList.contains("btn-link"),kopf:b.classList.contains("btn-kopf"),unter:/underline/.test(cs.textDecorationLine),p:b.classList.contains("btn-p")});
      }
      return r;
    };
  })();`;

module.exports = async function (h) {
  const titel = "v878 Knöpfe in sechs Bauarten (shell.html, übrige Module, Kinderbereich dunkel, Auswahl-Chips)";
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
    // Grün, Pink, Lila und Dunkelblau als feste Knopffläche
    for (const k of knoepfe(src)) if (/background:\s*(#15803d|#16a34a|#059669|#047857|#7c3aed|#1e3a8a|#db2777)\s*;/i.test(stilVon(k.tag, konst)) && !AUSNAHMEN.some(([re]) => re.test(k.tag)))
      funde.push(`${datei}:${k.zeile} (feste Fläche Grün/Lila/Dunkelblau)`);
  }
  if (funde.length) probleme.push(`a) ${funde.length} Knöpfe mit eigener Fläche/Farbe im style: ` + funde.slice(0, 8).join(" · ") + (funde.length > 8 ? " …" : ""));
  else zeilen.push(`a) Quelltext: ${gesamt} Knöpfe in ${DATEIEN.length} Dateien, keine eigenen Knopffarben mehr · Ausnahmen: ${Object.values(ausnahmen).reduce((x, y) => x + y, 0)} Stellen in ${Object.keys(ausnahmen).length} Bauarten`);
  // shell.html: die Verlaufsknöpfe tragen jetzt Bauarten
  const shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  const ids = { "tp-start-echt": "btn btn-p", "aw-save-btn": "btn btn-p", "rufe-kopf": "btn btn-kopf", "kopf-menue-knopf": "btn btn-kopf", "help-btn": "btn btn-kopf", "theme-toggle": "btn btn-kopf" };
  for (const [id, kl] of Object.entries(ids)) { const t = (shell.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`)) || [""])[0]; if (!t.includes(`class="${kl}"`)) probleme.push(`a) shell.html #${id}: Klasse „${kl}“ fehlt`); }
  if (!/class="btn btn-p" onclick="kaderEditOpen\(\)"/.test(shell)) probleme.push("a) shell.html „Spieler verwalten“ ist keine .btn-p");
  if (/linear-gradient/.test((shell.match(/<button[^>]*>/g) || []).join(""))) probleme.push("a) shell.html: noch ein Knopf mit Farbverlauf");
  if (/\.tp-start-leiste button\{[^}]*#166534/.test(fs.readFileSync(path.join(h.REPO, "styles.css"), "utf8"))) probleme.push("a) styles.css: Startleiste noch grün");

  // c) Quelltext der Auswahl-Chips
  const chipFehlt = [];
  for (const [datei, re, name] of CHIPS) {
    const src = fs.readFileSync(path.join(h.REPO, datei), "utf8");
    const k = knoepfe(src).find(x => re.test(x.tag));
    if (!k) { chipFehlt.push(`${name}: nicht gefunden`); continue; }
    if (!/aria-pressed=/.test(k.tag)) chipFehlt.push(`${name}: ohne aria-pressed`);
    /* Die Terminumfrage beschriftet ihre Knöpfe selbst mit ✓/?/✗ – dort zeigt ein 3-px-Rand die Wahl */
    if (!/✓/.test(k.rest.split("</button>")[0]) && !/3px solid/.test(k.tag)) chipFehlt.push(`${name}: ohne ✓`);
  }
  if (chipFehlt.length) probleme.push(`c) Auswahl-Chips: ` + chipFehlt.join(" · "));
  else zeilen.push(`c) Quelltext: ${CHIPS.length} Auswahl-Chips mit aria-pressed und ✓`);

  // b) gerendert, hell und dunkel
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const d2 = h.tagePlus(3);
  const befunde = [], uebersicht = [], chipBefunde = [], chipOk = new Set();
  const pruefen = (scheme, ansicht, liste, kind) => {
    if (!liste) { befunde.push(`${scheme}/${ansicht}: nicht erreichbar`); return; }
    if (!liste.length) { befunde.push(`${scheme}/${ansicht}: kein Knopf sichtbar`); return; }
    for (const k of liste) {
      const soll = (k.kopf || k.symbol) ? 3 : 4.5;
      if (k.k !== null && k.k < soll) befunde.push(`${scheme}/${ansicht}: „${k.name}“ Kontrast ${k.k}:1 (Soll ${soll})`);
      if (k.h < 44) befunde.push(`${scheme}/${ansicht}: „${k.name}“ ${k.h} px hoch`);
      if (k.rund && k.w < 44) befunde.push(`${scheme}/${ansicht}: „${k.name}“ rund ${k.w}×${k.h}`);
      if (k.link && !k.unter) befunde.push(`${scheme}/${ansicht}: „${k.name}“ Text-Link ohne Unterstrich`);
    }
    const p = liste.filter(k => k.p).length;
    if (!kind && p > 1) befunde.push(`${scheme}/${ansicht}: ${p} Hauptaktionen (${liste.filter(k => k.p).map(k => k.name).join(" / ")})`);
    if (scheme === "light") uebersicht.push(`${ansicht} ${liste.length}`);
  };
  const helfer = async (s, scheme) => {
    const ev = fn => s.page.evaluate(fn).catch(e => { befunde.push(scheme + ": " + String(e).slice(0, 140)); return null; });
    await ev(MESSUNG);
    const nehmen = async (ansicht, code, wurzel, opt = {}) => {
      const r = await s.page.evaluate(async ({ code, wurzel, ohne, warte }) => {
        const w = ms => new Promise(x => setTimeout(x, ms));
        try { await eval("(async()=>{" + code + "})()"); } catch (e) { return { fehler: String(e).slice(0, 120) }; }
        await w(warte || 600);
        const el = document.querySelector(wurzel); if (!el) return null;
        return window.__knopf878(el, ohne);
      }, { code, wurzel, ohne: opt.ohne || null, warte: opt.warte }).catch(e => ({ fehler: String(e).slice(0, 120) }));
      if (r && r.fehler) { befunde.push(`${scheme}/${ansicht}: ${r.fehler}`); return; }
      pruefen(scheme, ansicht, r, opt.kind);
    };
    /* c) gerendert: Chip antippen – aria-pressed wechselt, der gewählte trägt ✓ */
    const chip = async (name, code, sel, attr = "aria-pressed") => {
      const r = await s.page.evaluate(async ({ code, sel, attr }) => {
        const w = ms => new Promise(x => setTimeout(x, ms));
        try { await eval("(async()=>{" + code + "})()"); } catch (e) { return { fehler: String(e).slice(0, 120) }; }
        await w(400);
        const alle = [...document.querySelectorAll(sel)]; if (alle.length < 2) return { fehler: "keine Chips (" + alle.length + ")" };
        const vorher = alle.map(b => b.getAttribute(attr));
        const ziel = alle.findIndex(b => b.getAttribute(attr) === "false"); if (ziel < 0) return { fehler: "kein ungewählter Chip: " + vorher.join(",") };
        alle[ziel].click(); await w(700);
        const neu = [...document.querySelectorAll(sel)];
        const b = neu[ziel]; if (!b) return { fehler: "nach dem Tippen weg" };
        const gew = neu.filter(x => x.getAttribute(attr) === "true");
        return { an: b.getAttribute(attr), haken: /✓/.test(b.textContent) || /✓/.test(getComputedStyle(b, "::before").content),
          andereHaken: neu.filter(x => x !== b && x.getAttribute(attr) === "false" && /^✓/.test(x.textContent.trim())).length, gew: gew.length };
      }, { code, sel, attr }).catch(e => ({ fehler: String(e).slice(0, 120) }));
      if (r.fehler) { chipBefunde.push(`${scheme}/${name}: ${r.fehler}`); return; }
      if (r.an !== "true" || !r.haken || r.andereHaken) chipBefunde.push(`${scheme}/${name}: ${JSON.stringify(r)}`);
      else chipOk.add(name);
    };
    return { ev, nehmen, chip };
  };

  for (const scheme of ["light", "dark"]) {
    // ── Trainer ──
    const plaene = {};
    const termine = [{ id: 92, datum: d2, typ: "training", uhrzeit: "17:00", trainer_status: { Charles: "ja", Finn: "ja" } }];
    const s = await h.starten({ scheme, breite: 390, hoehe: 844, warten: 2500, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), nominierungen: [], anwesenheit: [], profiles: [{ name: "Charles", rolle: "trainer" }],
      termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
      trainingsformen: (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true })), trainingsvorlagen: (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i })), periodisierung: [],
      trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
      trainingsplan: (u, req) => { if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: JSON.stringify([b]) }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return plaene[d] ? [plaene[d]] : []; }
    }) });
    {
      const { ev, nehmen, chip } = await helfer(s, scheme);
      await ev(() => { document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block"; window.sbToken = () => "t"; });
      await ev(async () => { if (typeof loadKader === "function") await loadKader(); });
      await nehmen("Kopfzeile", `go("home"); if(document.getElementById("kopf-menue").style.display==="none")kopfMenueUmschalten();`, "#main-app>.topbar");
      await ev(() => { if (document.getElementById("kopf-menue")?.style.display !== "none") kopfMenueUmschalten(); });
      await nehmen("Trainingsplan", `go("planung"); await new Promise(x=>setTimeout(x,800));
        const feld=document.getElementById("tp-date"); if(![...feld.options].some(o=>o.value==="${d2}"))feld.add(new Option("${d2}","${d2}")); feld.value="${d2}";
        await tpTrainerRsvpLaden("${d2}"); await tpPlanRestore("${d2}"); await new Promise(x=>setTimeout(x,300)); tpGenerate();
        const a=document.getElementById("tp-anpassen-knopf"); if(a)a.style.display="";`, "#train-sub-planung", { warte: 1200 });
      await nehmen("Termine", `go("termine");`, "#train-sub-termine", { warte: 900 });
      await nehmen("Anwesenheit", `go("anwesenheit");`, "#train-sub-anwesenheit", { warte: 900 });
      await nehmen("KI-Coach", `kiCoachOpen();`, "#ki-modal", { warte: 500 });
      await chip("KI-Coach-Reiter", ``, "#ki-modus button", "aria-selected");
      await ev(() => document.getElementById("ki-modal")?.remove());
      await chip("Kader-Filter", `go("kader");`, "#view-kader .ftag[aria-pressed]");
      await chip("Übungsfilter", `go("formen"); await new Promise(x=>setTimeout(x,500));`, "#tf-filter button");
      await chip("Gruppengröße", `kleingruppenOpen();`, "#kg-chips button");
      await ev(() => document.getElementById("kg-modal")?.remove());
      await chip("Trainingsturnier-Einstellungen", `go("home"); blitzOpen();`, "#blitz-modal button[onclick^='blzFelder(']");
      await ev(() => document.getElementById("blitz-modal")?.remove());
      const fe = s.fehler(); await s.schliessen();
      if (fe.length) befunde.push(scheme + " Trainer-Konsole: " + fe.slice(0, 2).join(" | "));
    }

    // ── Eltern ──
    const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
    const FEIER = { id: 70, datum: h.tagePlus(10), uhrzeit: "18:15", typ: "event", titel: "Weihnachtsfeier", ort: "Vereinsheim", trainer_status: {} };
    const e = await h.starten({ scheme, start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
        termine: [FEIER], rueckmeldungen: [], feier_eintraege: [], carpool: [], team_gallery: [], foto_consent: [],
        kasse_umlagen: [{ id: 7, titel: "Saisonbeitrag", betrag: 40, faellig: "2026-10-31", paypal_link: null, aktiv: true }],
        teamkasse: [{ id: 1, datum: "2026-09-01", betrag: 100, zweck: "Übertrag Vorsaison", kategorie: "uebertrag", beleg: null }],
        rpc: { kasse_summary: { saldo: 100, umlagen: [], sammel: [] }, is_kasse: false, termin_gallery: [] } }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(3500);
    {
      const { ev, nehmen, chip } = await helfer(e, scheme);
      await ev(() => document.querySelectorAll(".modal-overlay,[role=dialog]").forEach(d => d.remove()));
      await nehmen("Mannschaftskasse", `await mannschaftskasseOpen();`, "#mk-modal", { warte: 900 });
      await chip("Kassen-Filter", ``, "#mk-modal .mk-filter");
      await ev(() => document.getElementById("mk-modal")?.remove());
      await nehmen("Feier-Dialog", `feierDialog({modus:"frei",key:"weihnachten-2026",emoji:"🎁",titel:"Etwas anderes mitbringen"});`, "#feier-dialog", { warte: 400 });
      await ev(() => document.getElementById("feier-dialog")?.remove());
      await nehmen("Galerie", `await galerieOpen(70,"Spiel");`, "#gal-modal", { warte: 900 });
      await ev(() => document.getElementById("gal-modal")?.remove());
      await nehmen("Mitfahrt", `elternCarpoolOpen(1,70);`, "[id^=carpool]", { warte: 900 });
      await ev(() => document.querySelectorAll("[id^=carpool]").forEach(d => d.remove()));
      await nehmen("Kabine-Start", `await kabineOpen(); await new Promise(x=>setTimeout(x,600)); const m=document.getElementById("kab-mehr"); if(m)m.open=true;`, "#kabine", { warte: 600, kind: true });
      const fe = e.fehler(); await e.schliessen();
      if (fe.length) befunde.push(scheme + " Eltern-Konsole: " + fe.slice(0, 2).join(" | "));
    }

    // ── Quiz (Kinderbereich) ──
    const q = await h.starten({ scheme, start: "/trainer/index.html?quiz&from=kabine", breite: 390, hoehe: 844, warten: 2000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    {
      const { nehmen } = await helfer(q, scheme);
      await nehmen("Quiz-Start", ``, "body", { warte: 300, kind: true, ohne: "#main-app>.topbar,.nav,#pin-gate" });
      await nehmen("Quiz-Aufgabe", `tqPlayer="Kind A"; tqStartBlock(0);`, "#tq-panel", { warte: 600, kind: true });
      const fe = q.fehler(); await q.schliessen();
      if (fe.length) befunde.push(scheme + " Quiz-Konsole: " + fe.slice(0, 2).join(" | "));
    }
  }
  if (befunde.length) probleme.push(`b) ${befunde.length} Befunde: ` + befunde.slice(0, 14).join(" · ") + (befunde.length > 14 ? " …" : ""));
  else zeilen.push(`b) hell und dunkel: Text ≥ 4,5:1 (Kopf-/Symbolknöpfe 3:1, auf Verläufen gegen jede Stufe), ≥ 44 px, Links unterstrichen, je Ansicht ≤ 1 Hauptaktion · Knöpfe je Ansicht: ${uebersicht.join(" · ")}`);
  if (chipBefunde.length) probleme.push(`c) gerendert: ` + chipBefunde.slice(0, 8).join(" · "));
  else zeilen.push(`c) gerendert hell und dunkel: aria-pressed wechselt beim Tippen, der gewählte trägt ✓ – ${[...chipOk].join(", ")}`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
