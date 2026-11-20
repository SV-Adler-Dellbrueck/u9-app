/* v882 · Vorlagen-Qualität (Bestandsaufnahme 5.4, 5.6, 5.10, 5.1-Rest, Halle) – Beschlüsse von Charles am 19.11.2026.

   a) Jede Stationen-Vorlage endet mit einer offenen Stufe ohne Zusatzregel: der letzte Hauptteil hat keine Stationen,
      heißt „… – offen:“ und sagt „keine Zusatzregel“; weder er noch das Abschlussturnier tragen eine Regel.
      Einzige Ausnahme L5-8 (Beschluss: Struktur bleibt, nur die Abläufe werden kürzer): dort liegt die offene Stufe
      in beiden Stationsübungen („STUFE 3 – OFFEN … Keine Zusatzregel“), das Abschlussturnier ist ohne Regel.
   b) Coaching der 20 Grundübungen aus data.js (die, auf denen die Vorlagen aufbauen): kein „!“, kein Wort in
      Großbuchstaben, keine geraden Anführungszeichen; jede Zeile endet auf „?“ oder ist ein Lob aus LOB.
   c) folge_nr je Leitfrage lückenlos ab 1 und als Progression: Ein-Feld-Formen (nach Gegnerdruck, bei Gleichstand
      nach diff) → Stationen (1 gegen 1 → FUNiño → 3+1) → Kombinationen → Übungsform-Einheiten → Lehrgänge (90 Min.).
   d) Tag „halle“ genau dort, wo die gleichzeitig benötigten Felder der Skalierungszeile der tatsächlichen Kadergröße
      (14; fehlt sie, die nächstkleinere vorhandene; ohne Maß in der Zeile der Standardaufbau aus dem Feld der Übung)
      zusammen in eine Normhalle 27 x 45 m passen (Charles 19.11.). Die Felder stehen
      in HALLE; jedes Maß muss wörtlich in der genannten Quelle stehen, sonst ist die Tabelle veraltet.
   e) „4gg2 Ballbesitz“: fünf Pässe in Folge = ein Punkt wie L4-1, keine Pflicht-Kontaktbegrenzung (nur als
      freiwillige Steigerung), die Skizze sagt dasselbe.
   f) „Lehrgang Erwachsene (Ü32)“ steht nicht in der U9-Auswahl. Archiviert wird über team_config.uebung_archiv
      (v716, derselbe Weg wie 5.9) – eine Zeile in der Datenbank, keine Datei. Geprüft wird deshalb, dass der Name
      genau einmal in der Bibliothek steht (der Archiv-Eintrag trifft ihn) und dass er mit dem Archivstand nach dem
      Update weder in der Übungsliste noch an einer Station noch im Auswahlfenster des Plans erscheint. */
"use strict";
const fs = require("fs"), path = require("path");

const REGEL = /zählt doppelt|zählt dreifach|zählt nur|zählt erst|Punkt nur|nur, wenn|nur mit|nur nach|Bonus|gibt einen Punkt|zwei Punkte/i;
const AUSNAHME_OFFEN = ["L5-8", "L5-9"];   // v901: L5-9 folgt dem Aufbau von L5-8 (Auftrag 20.11.)
const LOB = [/^Lob für /, /^Loben, wenn /, /^Feiern, wenn /, /^Gemeinsam feiern, wenn /];
const ORDNUNG_A = { "Überzahl": 1, "1 gegen 1": 2, "2 gegen 2": 2, "Dreieck (3 gegen 3)": 3, "Raute (4 gegen 4)": 4, "Endzone (4 gegen 4)": 4 };
const ORDNUNG_B = { "1 gegen 1": 1, "FUNiño": 2, "3+1": 3 };
const KOMBI = ["3+1 gegen FUNiño", "3+1 und FUNiño"];
const GRUPPE_TEXT = { A: "Ein-Feld-Form", B: "Stationen", C: "Kombination", D: "Übungsform-Einheit", E: "Lehrgang" };
const U32 = "Lehrgang Erwachsene (Ü32) – 4 gegen 4 + Torhüter: Umschalten nach Ballgewinn";
/* Archivstand nach dem einmaligen Update: die zwei Dubletten aus 5.9 (18.11.) und die Ü32-Form. */
const ARCHIV_NACH_UPDATE = ["Pflichtpass-Funino", "Dreiecksduell 3gg3", U32];

/* Halle: je Vorlage die Aufbauten, die gleichzeitig stehen. „Maß@Quelle“: Z = Zeile für 14 Kinder (sonst die nächstkleinere), sonst der Name
   der Übung (ihr Feld) oder „L<i>“ = Label des Blocks i. Ohne Maß in den Daten (L3-1: „Strafraum“) gibt es keinen Tag. */
const H = (...sets) => sets;
const S31 = (a, b) => H([a, b], ["25 x 20@3+1 gegen 3+1 – Raute ohne Aufpasser", "25 x 20@3+1 gegen 3+1 – Raute ohne Aufpasser"]);
const SFU = (a, b) => H([a, b], ["25 x 20@3 gegen 3 auf vier Minitore mit Schusszone", "25 x 20@3 gegen 3 auf vier Minitore mit Schusszone"]);
const HALB = "12 x 20@3+1 gegen 2 – Adler aus dem Tor";
const KOMBI_FELD = "25 x 20@3+1 gegen FUNiño – großes Tor gegen zwei kleine";
const HALLE = {
  "L1-1": H(["25 x 30@Z", "25 x 30@Z"]),
  "L1-2": H(["12 x 10@Z", "12 x 10@Z", "12 x 10@Z", "12 x 10@Z"]),
  "L1-3": H(["15 x 15@Z", "15 x 15@Z"]),
  "L1-4": H(["15 x 10@Erste Mitnahme vorwärts", "15 x 10@Erste Mitnahme vorwärts"]),
  "L2-1": H(["18 x 22@Z", "18 x 22@Z"]),
  "L2-2": H(["25 x 18@Z", "25 x 18@Z"]),
  "L2-3": H(["15 x 8@Dribbling-Parcours", "15 x 8@Dribbling-Parcours", "15 x 8@Dribbling-Parcours"]),
  "L2-4": H(["30 x 20@Z", "30 x 20@Z"]),
  "L3-1": null,
  "L3-2": H(["25 x 20@Z", "25 x 20@Z"]),
  "L3-3": H(["25 x 20@Z", "25 x 20@Z"]),
  "L4-1": H(["24 x 24@Z", "20 x 20@Z"]),
  "L4-2": H(["8 x 8@Drei gegen einen im Quadrat", "8 x 8@Drei gegen einen im Quadrat", "8 x 8@Drei gegen einen im Quadrat"],
    ["25 x 20@3 gegen 3 auf vier Minitore mit Schusszone", "25 x 20@3 gegen 3 auf vier Minitore mit Schusszone"],
    ["12 x 12@Passtor im Quadrat", "12 x 12@Passtor im Quadrat", "12 x 12@Passtor im Quadrat"],
    ["25 x 20@3 gegen 3 auf vier Minitore mit Schusszone", "25 x 20@2+1 gegen 2+1 auf Jugendtore"]),
  "L4-3": H(["25 x 20@Z", "25 x 20@Z"]),
  "L4-4": H(["10 m Abstand@Z", "10 m Abstand@Z", "10 m Abstand@Z", "10 m Abstand@Z"]),
  "L4-5": H(["30 x 22@L4", "30 x 22@L4"]),
  "L5-1": H(["20 x 18@Scanning-Funino", "20 x 18@Scanning-Funino"]),
  "L5-2": H(["35 x 25@Z"]),
  "L5-3": H(["25 x 20@Z", "25 x 20@Z"]),
  "L5-7": H(["28 x 22@Z", "28 x 22@Z"]),
  "L6-1": H(["25 x 30@Z", "25 x 30@Z"]),
  "L6-2": H(["25 x 20@Z", "25 x 20@Z"]),
  "L1-5": S31("20 x 16@3+1 gegen 3 – Ball halten, der Torwart ist die Rettung", HALB),
  "L2-5": S31("20 x 16@Flitzer-Duell – 1 gegen 1 an der Seite, dann aufs Jugendtor", "12 x 20@3 gegen 2 plus Torwart – Jäger und zwei Flitzer"),
  "L3-4": S31("12 x 20@2 gegen 1 plus Torwart – der Flitzer macht es breit", HALB),
  "L4-6": S31(HALB, "12 x 20@2 gegen 1 plus Torwart – der Flitzer macht es breit"),
  "L5-4": S31("12 x 20@3 gegen 2 plus Torwart – Jäger und zwei Flitzer", HALB),
  "L6-3": S31("12 x 20@Igel gegen drei – Torwart und zwei Flitzer verteidigen", "12 x 20@2 gegen 2 plus Torwart – Jäger läuft an, Flitzer stellt zu"),
  "L1-6": SFU("25 x 20@FUNiño 3 gegen 3 – einer bleibt hinter dem Ball", "20 x 16@FUNiño 2 gegen 2 – abschirmen, dann Seite wechseln"),
  "L2-6": SFU("16 x 12@FUNiño 1 gegen 1 – vorbei, dann das freie Minitor", "25 x 20@FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts"),
  "L3-5": SFU("12 x 20@FUNiño 3 gegen 1 – der Mittlere hat den Ball", "25 x 20@FUNiño 3 gegen 3 – Seitenwechsel zählt doppelt"),
  "L4-7": SFU("25 x 20@FUNiño 3 gegen 3 – Seitenwechsel zählt doppelt", "12 x 20@FUNiño 3 gegen 1 – der Mittlere hat den Ball"),
  "L5-5": SFU("25 x 20@FUNiño 3 gegen 3 – einer bleibt hinter dem Ball", "25 x 20@FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts"),
  "L6-4": SFU("25 x 20@FUNiño 3 gegen 3 – Mittellinie verteidigen", "16 x 20@FUNiño 2 gegen 2 – einer drängt, einer schützt"),
  "L5-6": H([HALB, "12 x 20@FUNiño 3 gegen 1 – der Mittlere hat den Ball"], [KOMBI_FELD, KOMBI_FELD]),
  "L6-5": H(["12 x 20@Igel gegen drei – Torwart und zwei Flitzer verteidigen", "16 x 20@FUNiño 2 gegen 2 – einer drängt, einer schützt"], [KOMBI_FELD, KOMBI_FELD]),
  "L4-8": H(["12 x 20@2 gegen 1 plus Torwart – der Flitzer macht es breit", "12 x 20@FUNiño 3 gegen 1 – der Mittlere hat den Ball", "25 x 20@FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts"],
    ["25 x 20@3 gegen 3 auf vier Minitore mit Schusszone", "25 x 20@3 gegen 3 auf vier Minitore mit Schusszone"]),
  "L5-8": H(["20 x 24@Joker-Duell – anbieten und freilaufen", "20 x 24@Joker-Duell – anbieten und freilaufen"]),
  "L5-9": H(["20 x 24@Joker-Duell – anbieten und freilaufen", "20 x 24@Zwei-Seiten-Spiel – Platz suchen, Seite wechseln"]),
  "Sonder": H(["40 x 25@Technik-Parcours – acht Stationen, freie Wahl, Laufzettel"])
};
const HALLE_MASS = [27, 45], KADER = 14;

/* Passen die Rechtecke (je Ausrichtung frei) in W x Hh? Guillotine-Schnitte, für bis zu vier Felder vollständig. */
function passt(rects, W, Hh) {
  if (!rects.length) return true;
  const [r, ...rest] = rects;
  for (const [a, b] of [[r[0], r[1]], [r[1], r[0]]]) {
    if (a > W || b > Hh) continue;
    const n = rest.length;
    for (let m = 0; m < (1 << n); m++) {
      const eins = rest.filter((_, i) => m & (1 << i)), zwei = rest.filter((_, i) => !(m & (1 << i)));
      // Schnitt senkrecht: rechts (W-a) x Hh, unten a x (Hh-b) · Schnitt waagerecht: rechts (W-a) x b, unten W x (Hh-b)
      if (passt(eins, W - a, Hh) && passt(zwei, a, Hh - b)) return true;
      if (passt(eins, W - a, b) && passt(zwei, W, Hh - b)) return true;
    }
  }
  return false;
}

module.exports = async function (h) {
  const titel = "v882 Vorlagen-Qualität: offen ohne Regel, Coaching als Frage, Folge, Halle, 4gg2, Ü32";
  const probleme = [], zeilen = [];
  const lies = f => JSON.parse(fs.readFileSync(path.join(h.REPO, f), "utf8"));
  const vor = lies("uebungen/vorlagen.json"), bib = lies("uebungen/bibliothek.json");
  const V = vor.vorlagen, B = bib.uebungen;
  const kurz = v => String(v.name).split(" ")[0];
  const haupt = v => v.bloecke.filter(b => !["warmup", "abschluss", "tw"].includes(b.typ));

  // ── Browser: TRAININGSFORMEN, Skizze, Archiv ────────────────────────────────
  const custom = B.map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const s = await h.starten({
    hoehe: 1600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), trainingsformen: custom, trainingsplan: [],
      team_config: [{ id: 1, uebung_meta: {}, uebung_art: {}, uebung_betreuung: {}, uebung_archiv: ARCHIV_NACH_UPDATE }]
    })
  });
  const r = await s.page.evaluate(async ({ U32 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (let i = 0; i < 60 && (typeof TRAININGSFORMEN === "undefined" || typeof uebungMetaLoad !== "function"); i++) await warte(100);
    for (const n of ["uebungMetaLoad", "tpIstArchiviert", "tpStationTauglich", "renderTraining", "tpAllForms"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (typeof TRAININGSFORMEN === "undefined") out.fehlt.push("TRAININGSFORMEN");
    if (out.fehlt.length) return out;
    out.tf = TRAININGSFORMEN.map(f => ({ name: f.name, id: f.id, coaching: f.coaching, ablauf: f.ablauf, diff: f.diff, feld: f.feld }));
    out.skizze4gg2 = JSON.stringify((typeof TF_SKIZZEN !== "undefined" && TF_SKIZZEN.tf016) || null);
    if (typeof loadCustomForms === "function") await loadCustomForms();
    await uebungMetaLoad(); await warte(200);
    const i = tpAllForms().findIndex(f => f.name === U32);
    out.u32Geladen = i >= 0;
    if (i < 0) return out;
    out.archiviert = tpIstArchiviert(tpAllForms()[i]);
    out.station = tpStationTauglich(tpAllForms()[i]);
    if (typeof go === "function") go("formen"); await warte(300);
    const suche = document.getElementById("training-search");
    if (suche) suche.value = "Ü32";
    renderTraining(); await warte(150);
    out.inListe = (document.getElementById("training-content") || {}).textContent.includes("Ü32");
    if (suche) suche.value = "";
    renderTraining(); await warte(50);
    return out;
  }, { U32 });
  const konsole = s.fehler();
  await s.schliessen();
  if (r.fehlt && r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  if (konsole.length) probleme.push("Konsole: " + konsole.slice(0, 2).join(" | "));
  const tfName = n => r.tf.find(f => f.name === n);
  const ex = n => tfName(n) || B.find(u => u.name === n);

  // a) Stationen-Vorlagen enden offen ohne Zusatzregel
  const mitSt = V.filter(v => v.bloecke.some(b => b.stationen));
  const aFehler = [];
  mitSt.forEach(v => {
    const k = kurz(v), hp = haupt(v), letzt = hp[hp.length - 1], ab = v.bloecke.find(b => b.typ === "abschluss");
    if (ab && REGEL.test(ab.label)) aFehler.push(`${k} Abschlussturnier mit Regel: „${ab.label}“`);
    if (AUSNAHME_OFFEN.includes(k)) {
      const st = (letzt.stationen || []).map(x => x.uebung_name);
      const ohne = st.filter(n => !/STUFE 3 – OFFEN[^\n]*Keine Zusatzregel/.test(String((ex(n) || {}).ablauf || "")));
      if (!st.length || ohne.length) aFehler.push(`${k}: offene Stufe ohne Zusatzregel fehlt im Ablauf von ${ohne.join(", ") || "–"}`);
      return;
    }
    if (letzt.stationen) aFehler.push(`${k}: der letzte Hauptteil ist ein Stationsdurchgang („${letzt.label.slice(0, 70)}“)`);
    else if (!/^Hauptteil \d – offen:/.test(letzt.label) || !/keine Zusatzregel/.test(letzt.label)) aFehler.push(`${k}: letzter Hauptteil nicht „offen … keine Zusatzregel“: „${letzt.label}“`);
    else if (REGEL.test(letzt.label)) aFehler.push(`${k}: offene Stufe mit Regel: „${letzt.label}“`);
  });
  const ausnahmenDa = AUSNAHME_OFFEN.filter(k => mitSt.some(v => kurz(v) === k));
  if (ausnahmenDa.length !== AUSNAHME_OFFEN.length) aFehler.push("Ausnahme ohne Vorlage: " + AUSNAHME_OFFEN.join(", "));
  if (aFehler.length) probleme.push("a) " + aFehler.join(" | "));
  else zeilen.push(`a) ${mitSt.length} Stationen-Vorlagen enden offen ohne Zusatzregel (L5-8: offene Stufe in beiden Stationen, Beschluss 19.11.)`);

  // b) Coaching der 20 Grundübungen
  const grund = [...new Set(V.flatMap(v => v.bloecke.map(b => b.uebung_name).filter(Boolean)))].filter(n => tfName(n));
  const bFehler = [];
  if (grund.length !== 20) bFehler.push(`${grund.length} Grundübungen aus data.js in den Vorlagen statt 20`);
  grund.forEach(n => {
    const zl = String(tfName(n).coaching || "").split("\n").map(x => x.trim()).filter(Boolean);
    if (!zl.length) bFehler.push(`${n}: kein Coaching`);
    zl.forEach(z => {
      if (/!/.test(z)) bFehler.push(`${n}: „!“ in „${z}“`);
      else if (/\b[A-ZÄÖÜ]{2,}\b/.test(z)) bFehler.push(`${n}: Großbuchstaben in „${z}“`);
      else if (/"/.test(z)) bFehler.push(`${n}: gerade Anführungszeichen in „${z}“`);
      else if (!/\?$/.test(z) && !(LOB.some(re => re.test(z)) && /\.$/.test(z))) bFehler.push(`${n}: weder Frage noch Lob: „${z}“`);
    });
  });
  if (bFehler.length) probleme.push(`b) ${bFehler.length} Befunde: ` + bFehler.slice(0, 6).join(" | "));
  else zeilen.push(`b) ${grund.length} Grundübungen: jede Coaching-Zeile eine Frage oder ein Lob, kein „!“, keine Großbuchstaben`);

  // c) folge_nr als Progression
  const gruppe = v => (Number(v.dauer_min) > 75 || /Lehrgang/.test(v.name)) ? "E" : v.bloecke.some(b => b.typ === "uebungsform") ? "D" : KOMBI.includes(v.ordnung) ? "C" : v.bloecke.some(b => b.stationen) ? "B" : "A";
  const diffVon = v => { const b = haupt(v)[0] || {}; const e = b.uebung_name ? ex(b.uebung_name) : null; return e && Number(e.diff) ? Number(e.diff) : null; };
  const je = {};
  V.filter(v => Number(v.folge_nr) > 0).forEach(v => (je[v.leitfrage] = je[v.leitfrage] || []).push(v));
  const cFehler = [];
  Object.entries(je).forEach(([lf, g]) => {
    g.sort((x, y) => x.folge_nr - y.folge_nr);
    const nrn = g.map(v => Number(v.folge_nr));
    if (String(nrn) !== String(g.map((_, i) => i + 1))) cFehler.push(`„${lf}“: folge_nr ${nrn.join(",")}`);
    for (let i = 1; i < g.length; i++) {
      const a = g[i - 1], b = g[i], ga = gruppe(a), gb = gruppe(b);
      if (ga > gb) { cFehler.push(`${kurz(a)} (${GRUPPE_TEXT[ga]}) vor ${kurz(b)} (${GRUPPE_TEXT[gb]})`); continue; }
      if (ga !== gb) continue;
      const rang = ga === "A" ? ORDNUNG_A : ga === "B" ? ORDNUNG_B : null;
      if (!rang) continue;
      if (rang[a.ordnung] == null || rang[b.ordnung] == null) { cFehler.push(`Ordnung ohne Rang: ${kurz(a)} „${a.ordnung}“ / ${kurz(b)} „${b.ordnung}“`); continue; }
      if (rang[a.ordnung] > rang[b.ordnung]) cFehler.push(`${kurz(a)} (${a.ordnung}) vor ${kurz(b)} (${b.ordnung})`);
      else if (ga === "A" && rang[a.ordnung] === rang[b.ordnung] && diffVon(a) && diffVon(b) && diffVon(a) > diffVon(b)) cFehler.push(`${kurz(a)} (diff ${diffVon(a)}) vor ${kurz(b)} (diff ${diffVon(b)})`);
    }
  });
  if (cFehler.length) probleme.push("c) " + cFehler.slice(0, 8).join(" | "));
  else zeilen.push("c) folge_nr: " + Object.values(je).map(g => g.map(kurz).join("→")).join(" · "));

  // d) Halle
  const norm = t => String(t || "").replace(/\s*[x×]\s*(?=\d)/g, " x ");
  const dFehler = [], mitHalle = [];
  V.forEach(v => {
    const k = kurz(v);
    if (!(k in HALLE)) { dFehler.push(`${k}: fehlt in der Halle-Tabelle`); return; }
    const keys = Object.keys(v.skalierung || {}).map(Number).filter(n => n <= KADER).sort((a, b) => a - b);
    const Z = (v.skalierung || {})[String(keys[keys.length - 1])] || "";
    const sets = HALLE[k];
    let ok = !!sets;
    (sets || []).forEach(set => {
      const rects = set.map(f => {
        const [mass, q] = f.split("@");
        const text = q === "Z" ? Z : /^L\d$/.test(q) ? (v.bloecke[+q.slice(1)] || {}).label : (ex(q) || {}).feld;
        if (q !== "Z" && !/^L\d$/.test(q) && !v.bloecke.some(b => b.uebung_name === q || (b.stationen || []).some(x => x.uebung_name === q))) dFehler.push(`${k}: Übung „${q}“ gehört nicht zur Vorlage`);
        if (!norm(text).includes(mass)) dFehler.push(`${k}: „${mass}“ steht nicht in ${q === "Z" ? "der Zeile für " + keys[keys.length - 1] : q}`);
        const ab = mass.match(/^(\d+) m Abstand$/);
        if (ab) return [+ab[1], +ab[1]];
        const m = mass.match(/^(\d+) x (\d+)$/); return m ? [+m[1], +m[2]] : [999, 999];
      });
      if (!passt(rects, HALLE_MASS[0], HALLE_MASS[1])) ok = false;
    });
    const hat = (v.tags || []).includes("halle");
    if (ok) mitHalle.push(k);
    if (ok !== hat) dFehler.push(`${k}: ${ok ? "passt in 27 x 45 m, Tag fehlt" : "passt nicht in 27 x 45 m, trägt aber „halle“"}`);
  });
  if (dFehler.length) probleme.push("d) " + dFehler.slice(0, 8).join(" | "));
  else zeilen.push(`d) „halle“ an ${mitHalle.length} Vorlagen, deren Felder zusammen in 27 x 45 m passen: ${mitHalle.join(", ")}`);

  // e) 4gg2 Ballbesitz
  const f4 = tfName("4gg2 Ballbesitz") || {};
  const eFehler = [];
  if (!/Fünf Pässe in Folge = ein Punkt/.test(f4.ablauf || "")) eFehler.push("Ablauf ohne „Fünf Pässe in Folge = ein Punkt“");
  if (/10 Pässe|zehn Pässe/i.test(f4.ablauf || "")) eFehler.push("Ablauf nennt noch zehn Pässe");
  String(f4.ablauf || "").split(/(?<=[.!])\s+/).filter(x => /Kontakt/.test(x)).forEach(x => { if (!/[Ff]reiwillig/.test(x)) eFehler.push(`Kontaktbegrenzung als Pflicht: „${x}“`); });
  if (!/fünf Pässe in Folge/.test(r.skizze4gg2) || /Kontakt|10 Pässe/.test(r.skizze4gg2)) eFehler.push("Skizze: " + r.skizze4gg2.slice(-90));
  const l41 = (V.find(v => kurz(v) === "L4-1") || { bloecke: [] }).bloecke.map(b => b.label).join(" ");
  if (!/fünf Pässe in Folge = ein Punkt/.test(l41)) eFehler.push("L4-1 nennt die Regel nicht mehr – Abgleich hinfällig");
  if (eFehler.length) probleme.push("e) 4gg2 Ballbesitz: " + eFehler.join(" | "));
  else zeilen.push("e) 4gg2 Ballbesitz: fünf Pässe in Folge = ein Punkt wie L4-1, Kontakte nur als freiwillige Steigerung, Skizze gleich");

  // f) Ü32 nicht in der Auswahl
  const nU = B.filter(u => u.name === U32).length;
  if (nU !== 1) probleme.push(`f) „${U32}“ ${nU}× in der Bibliothek – der Archiv-Eintrag braucht genau diesen Namen`);
  else if (!r.u32Geladen) probleme.push("f) Ü32-Form nicht geladen");
  else if (!r.archiviert || r.station || r.inListe) probleme.push(`f) mit Archivstand nach dem Update: archiviert ${r.archiviert}, an einer Station ${r.station}, in der Übungsliste ${r.inListe}`);
  else zeilen.push("f) Ü32-Form: Name genau einmal in der Bibliothek; mit team_config.uebung_archiv nach dem Update nicht in der Liste und an keiner Station");

  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
