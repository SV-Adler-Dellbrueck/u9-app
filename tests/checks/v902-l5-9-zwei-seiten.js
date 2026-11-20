/* v902 · Auftrag L5-9 (doku/auftrag-l5-9, 20.11.2026): Vorlage „L5-9 Anbieten und Verlagern“ und die
   U9-Übung „Zwei-Seiten-Spiel – Platz suchen, Seite wechseln“.

   a) Bibliothek: die Übung steht genau einmal da, ohne „Lehrgang“ im Namen, Kategorie passspiel, 6-8 Kinder;
      die Lehrgangsfassung steht unverändert daneben. _euPruefung der ganzen Datei und _eiSkizzeFehler der
      Skizze ohne Befund. Skizze quer, engster Spielerabstand mindestens 25, vier Minitore, sechs Hütchen, ein
      Trainer, ein Ball, Material genau „4 Minitore · 6 Hütchen · 1 Ball“; die Großansicht öffnet.
   b) Vorlage: Name einmalig, Leitfrage 5 mit folge_nr 6 (Progression nach Beschluss 19.11., L5-5/L5-4/L5-6
      rücken auf 7/8/9), Tag „halle“, Skalierung für 6, 8, 10, 12, 14, 16, Blöcke 10 + 8 + 17 + 17 + 18 = 70 bei
      dauer_min 75, Hauptteil 1 und 2 als Stationen mit „Joker-Duell – anbieten und freilaufen“ und der neuen
      Übung, Abschluss ohne Übung. _evPruefung der ganzen Datei ohne Befund.
   c) Abgleich beim Öffnen legt Übung und Vorlage an; ein zweiter Lauf (Stand vergessen) schreibt nichts.
   d) Vorlagen-Ansicht: L5-9 steht unter Leitfrage 5 und zeigt jede Skalierungszeile.
   e) Plan aus L5-9: 70 Min. Blöcke, Gesamt „70 von 75“ mit 5 Min. Puffer, die Hauptteile tragen auf zwei Feldern
      beide Stationsübungen. */
"use strict";
const fs = require("fs"), path = require("path");
const UE = "Zwei-Seiten-Spiel – Platz suchen, Seite wechseln", JOKER = "Joker-Duell – anbieten und freilaufen";
const LEHRGANG = "Lehrgang – Zwei-Seiten-Spiel";

module.exports = async function (h) {
  const titel = "v902 L5-9 und Zwei-Seiten-Spiel";
  const probleme = [], zeilen = [];
  const lies = f => fs.readFileSync(path.join(h.REPO, f), "utf8");
  const bibTxt = lies("uebungen/bibliothek.json"), vorTxt = lies("uebungen/vorlagen.json");
  const bib = JSON.parse(bibTxt), vor = JSON.parse(vorTxt);

  // ── a) statisch ─────────────────────────────────────────────────────────────
  const ue = bib.uebungen.filter(u => u.name === UE);
  if (ue.length !== 1) return h.ergebnis(titel, false, [`a) „${UE}“ steht ${ue.length}× in der Bibliothek`]);
  const u = ue[0], sk = u.skizze || {};
  if (/Lehrgang/.test(u.name)) probleme.push("a) Name enthält „Lehrgang“");
  if (u.kat !== "passspiel" || u.spieler !== "6-8") probleme.push(`a) Kategorie ${u.kat}, Spieler ${u.spieler}`);
  const lg = bib.uebungen.filter(x => x.name === LEHRGANG);
  if (lg.length !== 1 || lg[0].kat !== "passspiel" || lg[0].spieler !== "8") probleme.push(`a) Lehrgangsfassung verändert oder fehlt (${lg.length}×)`);
  const spieler = sk.s || [];
  let eng = Infinity;
  for (let i = 0; i < spieler.length; i++) for (let j = i + 1; j < spieler.length; j++) eng = Math.min(eng, Math.hypot(spieler[i][0] - spieler[j][0], spieler[i][1] - spieler[j][1]));
  const trainer = (sk.ger || []).filter(g => g[2] === "trainer").length;
  if (sk.hoch) probleme.push("a) Skizze steht hochkant");
  if (eng < 25) probleme.push(`a) engster Spielerabstand ${eng.toFixed(1)} < 25`);
  if ((sk.tor || []).length !== 4 || (sk.h || []).length !== 6 || trainer !== 1 || (sk.b || []).length !== 1)
    probleme.push(`a) Skizze: ${(sk.tor || []).length} Tore, ${(sk.h || []).length} Hütchen, ${trainer} Trainer, ${(sk.b || []).length} Bälle`);

  // ── b) statisch ─────────────────────────────────────────────────────────────
  const vl = vor.vorlagen.filter(v => /^L5-9 /.test(v.name));
  if (vl.length !== 1) return h.ergebnis(titel, false, probleme.concat([`b) ${vl.length} Vorlagen L5-9`]));
  const v = vl[0];
  if (vor.vorlagen.filter(x => x.name === v.name).length !== 1) probleme.push("b) Name der Vorlage doppelt");
  const lf5 = vor.vorlagen.filter(x => x.leitfrage === v.leitfrage && Number(x.folge_nr) > 0).sort((a, b) => a.folge_nr - b.folge_nr);
  const folge = lf5.map(x => x.name.split(" ")[0] + "=" + x.folge_nr).join(" ");
  if (!/^L5-/.test(lf5[0].name) || folge !== "L5-3=1 L5-1=2 L5-2=3 L5-7=4 L5-8=5 L5-9=6 L5-5=7 L5-4=8 L5-6=9") probleme.push(`b) Folge der Leitfrage 5: ${folge}`);
  if (JSON.stringify(v.tags) !== '["halle"]') probleme.push(`b) Tags ${JSON.stringify(v.tags)} statt ["halle"]`);
  if (Object.keys(v.skalierung).join(",") !== "6,8,10,12,14,16") probleme.push(`b) Skalierung für ${Object.keys(v.skalierung).join(",")}`);
  const dauern = v.bloecke.map(b => b.dauer);
  if (dauern.join("+") !== "10+8+17+17+18" || v.dauer_min !== 75 || v.netto_spielform_min !== 34) probleme.push(`b) Blöcke ${dauern.join("+")}, dauer_min ${v.dauer_min}, netto ${v.netto_spielform_min}`);
  const st = v.bloecke.filter(b => b.stationen).map(b => b.stationen.map(x => x.uebung_name).join(" | "));
  if (st.length !== 2 || st.some(x => x !== JOKER + " | " + UE)) probleme.push(`b) Stationen: ${JSON.stringify(st)}`);
  if (v.bloecke[4].typ !== "abschluss" || v.bloecke[4].uebung_name || v.bloecke[4].stationen) probleme.push("b) Abschluss trägt eine Übung");
  if (!bib.uebungen.some(x => x.name === JOKER)) probleme.push("b) Joker-Duell fehlt in der Bibliothek");
  /* Die Stände von Vorlagen und Bibliothek sind unabhängig (eigene Merker im Abgleich) – v905 zählt nur den der Vorlagen hoch. */

  // ── c) + a)/b) im Browser: Abgleich, Prüfungen, Ansicht ───────────────────────
  const formen = [], vorlagen = [], geschrieben = [];
  const s = await h.starten({ bibliothek: true, hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], nominierungen: [], anwesenheit: [], trainingsplan: [],
    trainingsformen: (url, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); formen.push({ ...b, id: 7000 + formen.length }); geschrieben.push("POST trainingsformen " + b.name); return { status: 201, body: "[]" }; }
      if (req.method() !== "GET") { geschrieben.push(req.method() + " trainingsformen"); return { status: 204, body: "" }; }
      return formen;
    },
    trainingsvorlagen: (url, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); vorlagen.push({ ...b, id: 800 + vorlagen.length }); geschrieben.push("POST trainingsvorlagen " + b.name); return { status: 201, body: "[]" }; }
      if (req.method() !== "GET") { geschrieben.push(req.method() + " trainingsvorlagen"); return { status: 204, body: "" }; }
      return vorlagen;
    }
  }) });
  const frei = () => s.page.waitForFunction(() => typeof bibliothekAbgleich === "function" && typeof _bibLaeuft !== "undefined" && !_bibLaeuft, null, { timeout: 30000 }).catch(() => {});
  await frei(); await s.page.waitForTimeout(1500); await frei();
  const ersterLauf = { formen: formen.length, vorlagen: vorlagen.length, neu: formen.some(f => f.name === UE), l59: vorlagen.some(x => x.name === v.name) };
  const vorZweitem = geschrieben.length;
  const r = await s.page.evaluate(async ({ bibTxt, vorTxt, UE, NAME }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    try { localStorage.removeItem("adler-bibliothek-stand"); localStorage.removeItem("adler-vorlagen-stand"); } catch (e) {}
    await bibliothekAbgleich(); await warte(300);
    while (typeof _bibLaeuft !== "undefined" && _bibLaeuft) await warte(50);
    if (typeof loadCustomForms === "function") await loadCustomForms();
    out.eu = _euPruefung(bibTxt).fehler;
    const u = JSON.parse(bibTxt).uebungen.find(x => x.name === UE);
    out.sk = _eiSkizzeFehler(u.skizze);
    out.mat = skzMaterialText(u.skizze);
    out.ev = _evPruefung(vorTxt).fehler;
    // Großansicht
    const idx = tpAllForms().findIndex(f => f.name === UE);
    out.idx = idx;
    if (idx >= 0) { skzGrossOpen(idx); await warte(200); const m = document.getElementById("skz-gross-modal"); out.gross = !!(m && m.querySelector("svg") && /Zwei-Seiten-Spiel/.test(m.getAttribute("aria-label") || "")); skzGrossClose(); }
    // d) Vorlagen-Ansicht
    await vorlagenAnsichtOpen();
    for (let i = 0; i < 40 && !document.getElementById("va-inhalt"); i++) await warte(50);
    await warte(200);
    const box = document.getElementById("va-inhalt");
    if (!box) return out;
    const karten = [...box.querySelectorAll("button[aria-expanded]")];
    const k = karten.find(b => b.textContent.includes(NAME));
    out.karte = k ? k.textContent.replace(/\s+/g, " ").trim() : null;
    out.nachbarn = karten.map(b => b.textContent.replace(/\s+/g, " ").trim()).filter(t => /\bL5-\d/.test(t)).map(t => t.match(/L5-\d/)[0]);
    if (k) { k.click(); await warte(200); }
    out.steckbrief = box.textContent.replace(/\s+/g, " ");
    return out;
  }, { bibTxt, vorTxt, UE, NAME: v.name });
  const konsole = s.fehler();
  const zweiter = geschrieben.slice(vorZweitem);
  await s.schliessen();

  if (!ersterLauf.neu || !ersterLauf.l59) probleme.push(`c) Abgleich: Übung ${ersterLauf.neu}, Vorlage ${ersterLauf.l59}`);
  if (zweiter.length) probleme.push(`c) zweiter Lauf schreibt: ${zweiter.slice(0, 3).join(" | ")}`);
  zeilen.push(`c) erster Lauf: ${ersterLauf.formen} Übungen, ${ersterLauf.vorlagen} Vorlagen angelegt · zweiter Lauf: ${zweiter.length} Schreibvorgänge`);
  if (r.eu.length) probleme.push("a) _euPruefung: " + r.eu.slice(0, 3).join(" | "));
  if (r.sk.length) probleme.push("a) _eiSkizzeFehler: " + r.sk.join(" | "));
  if (r.mat !== "4 Minitore · 6 Hütchen · 1 Ball") probleme.push(`a) Material „${r.mat}“`);
  if (!r.gross) probleme.push(`a) Großansicht der Skizze öffnet nicht (Index ${r.idx})`);
  zeilen.push(`a) Skizze quer, engster Abstand ${eng}, Material „${r.mat}“, Großansicht ${r.gross ? "ja" : "nein"}`);
  if (r.ev.length) probleme.push("b) _evPruefung: " + r.ev.slice(0, 3).join(" | "));
  zeilen.push(`b) Folge ${folge}`);
  if (!r.karte) probleme.push("d) L5-9 fehlt in der Vorlagen-Ansicht");
  else {
    if (!/^L5-9 /.test(r.karte)) probleme.push(`d) Karte „${r.karte.slice(0, 50)}“ beginnt nicht mit dem Kürzel (v904: ohne Folgenummer)`);
    if (r.nachbarn.join(",") !== "L5-3,L5-1,L5-2,L5-7,L5-8,L5-9,L5-5,L5-4,L5-6") probleme.push(`d) Reihenfolge ${r.nachbarn.join(",")}`);
    const fehlt = Object.entries(v.skalierung).filter(([, t]) => !r.steckbrief.includes(t.replace(/\s+/g, " "))).map(([n]) => n);
    if (fehlt.length) probleme.push(`d) Skalierungszeile fehlt im Steckbrief für ${fehlt.join(", ")}`);
    zeilen.push(`d) Ansicht: ${r.nachbarn.join(" → ")} · ${Object.keys(v.skalierung).length - fehlt.length} Skalierungszeilen sichtbar`);
  }
  if (konsole.length) probleme.push("Konsole: " + konsole.slice(0, 2).join(" | "));

  // ── e) Plan aus L5-9 ────────────────────────────────────────────────────────
  const datum = h.tagePlus(5);
  let gespeichert = null;
  const zeileV = vorlagen.find(x => x.name === v.name);
  const p = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: [{ id: 88, datum, typ: "training", trainer_status: { Charles: "ja", Peter: "ja" } }],
    trainingsformen: formen, trainingsvorlagen: zeileV ? [zeileV] : [],
    trainingsplan: (url, req) => {
      if (req.method() === "POST") { try { gespeichert = JSON.parse(req.postData() || "null"); } catch (e) {} return { status: 201, body: "[]" }; }
      if (!gespeichert) return [];
      if (/select=slots/.test(url.search)) return [{ slots: gespeichert.slots || [] }];
      if (/select=plan/.test(url.search)) return [{ plan: gespeichert.plan || [] }];
      return [gespeichert];
    }
  }) });
  await h.sichtbarMachen(p.page, "#tp-timeline");
  const e = await p.page.evaluate(async ({ datum, NAME }) => {
    await loadKader();
    if (typeof loadCustomForms === "function") await loadCustomForms();
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof vorlagenLaden === "function") await vorlagenLaden();
    for (let i = 0; i < 40 && !(typeof VORLAGEN !== "undefined" && VORLAGEN.some(x => x.name === NAME)); i++) await warte(100);
    const vz = (typeof VORLAGEN !== "undefined" ? VORLAGEN : []).find(x => x.name === NAME);
    if (!vz) return { fehlt: "Vorlage L5-9 nicht geladen" };
    _vuAuswahl = vz.id;
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    await vorlageUebernehmenSetzen(); await warte(500);
    const werte = si => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.options[x.selectedIndex] ? x.options[x.selectedIndex].text : x.value);
    const tl = document.getElementById("tp-timeline");
    return {
      dauern: tpSlots.map(x => x.dauer), typen: tpSlots.map(x => x.typ),
      haupt: tpSlots.map((x, i) => x.typ === "spielform" ? werte(i) : null).filter(Boolean),
      gesamt: ((tl && tl.textContent) || "").replace(/\s+/g, " ").match(/Gesamt: \d+ von[^·]*·[^·]{0,60}Puffer[^·]{0,30}/)?.[0] || ""
    };
  }, { datum, NAME: v.name });
  const pk = p.fehler();
  await p.schliessen();
  if (e.fehlt) probleme.push("e) " + e.fehlt);
  else {
    const summe = e.dauern.reduce((a, b) => a + b, 0);
    if (summe !== 70 || e.dauern.join("+") !== "10+8+17+17+18") probleme.push(`e) Blöcke im Plan ${e.dauern.join("+")} = ${summe}`);
    if (!/Gesamt: 70 von/.test(e.gesamt) || !/5 Min\. Puffer/.test(e.gesamt)) probleme.push(`e) Zeitzeile „${e.gesamt}“`);
    const hp = e.haupt.map(x => x.join(" | "));
    if (hp.length !== 2 || hp.some(x => !(x.includes("Joker-Duell") && x.includes("Zwei-Seiten-Spiel")))) probleme.push(`e) Hauptteile: ${JSON.stringify(hp)}`);
    zeilen.push(`e) Plan: ${e.dauern.join("+")} · „${e.gesamt.trim()}“ · Hauptteile je ${e.haupt[0] ? e.haupt[0].length : 0} Felder`);
  }
  if (pk.length) probleme.push("e) Konsole: " + pk.slice(0, 2).join(" | "));

  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
