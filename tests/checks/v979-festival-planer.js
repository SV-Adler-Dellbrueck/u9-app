/* v979 · Festival-Planer (doku/auftrag-kinderfestival-planer/auftrag.md): planFestival als reine Funktion.
   Die neun Testfälle des Auftrags, dazu eine unabhängige Nachrechnung der Kennzahlen aus dem Plan (Abnahme 3) und die
   Umwandlung in den bestehenden Festival-Datensatz. Die Funktion läuft hier in einer leeren Node-Umgebung – ohne Seite,
   ohne Netz (Abnahme 1). Fall 9 prüft am echten DOM, dass der bestehende Festival-Ablauf und der Link unberührt bleiben.
   Abweichungen vom Auftrag (mit Charles am 26.11. geklärt bzw. gemeldet):
   - Gesamtdauer ohne Wechsel nach der letzten Runde (Fall 2: 55 Min.).
   - Fall 5: Konfiguration 7 Runden × 6 Min. + 6 × 4 Min. Wechsel = 66 Min. (im Auftrag nicht angegeben).
   - Fall 7a: 6 Runden mit 6 Teams heißt eine Wiederholung (5 Gegner) – hier über runden: 6 ausdrücklich gesetzt.
   - Fall 7b: „10 Teams à 3“ geht mit Teams je Verein nicht (10 Kinder → höchstens 3 Teams mit mindestens 3 Kindern);
     die Variante „klein“ ergibt 9 Teams (4+3+3 je Verein), 4 Felder belegt, eines frei. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const pruef = (bed, ok, nein) => bed ? zeilen.push(ok) : probleme.push(nein);
  // ── reine Umgebung: nur die Datei, kein window, kein fetch ──
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(h.REPO, "md-festival-planer.js"), "utf8")
    + "\n;this.planFestival=planFestival;this.planFestivalVarianten=planFestivalVarianten;this.fpZuHeimturnier=fpZuHeimturnier;this.FP_REGELN=FP_REGELN;", ctx);
  const { planFestival, planFestivalVarianten, fpZuHeimturnier, FP_REGELN } = ctx;
  const M = n => Array.from({ length: n }, () => ({ tor: "mini" }));
  const H = (p, re) => p.hinweise.some(x => re.test(x.text));
  const alleTexte = p => JSON.stringify(p);

  /* Unabhängige Nachrechnung (Abnahme 3): nur aus teams, felder, runden – ohne fpKennzahlen. */
  const nach = (p) => {
    const n = p.teams.length, sp = Array(n).fill(0), km = Array(n).fill(0);
    const auf = { mini: 3, jugend: 4, jugend41: 5 };
    p.runden.forEach(r => {
      const im = new Set();
      r.spiele.forEach(g => {
        if (im.has(g.a) || im.has(g.b) || g.a === g.b) throw new Error("Team doppelt in Runde " + r.nr);
        im.add(g.a); im.add(g.b);
        const f = p.felder.filter(x => x.nr === g.feld)[0];
        [g.a, g.b].forEach(t => { sp[t]++; km[t] += p.eingabe.spielzeit * Math.min(auf[f.form], p.teams[t].kinder); });
      });
      if (new Set(r.spiele.map(g => g.feld)).size !== r.spiele.length) throw new Error("Feld doppelt in Runde " + r.nr);
      const pause = []; for (let i = 0; i < n; i++) if (!im.has(i)) pause.push(i);
      if (JSON.stringify(pause) !== JSON.stringify(r.pause)) throw new Error("Pausenliste falsch in Runde " + r.nr);
    });
    const R = p.runden.length, k = p.kennzahlen;
    const soll = { netto: sp.map(x => x * p.eingabe.spielzeit), pausen: sp.map(x => R - x),
      kind: km.map((m, t) => Math.round(m / p.teams[t].kinder * 100) / 100), dauer: R ? R * p.eingabe.spielzeit + (R - 1) * p.eingabe.wechsel : 0, betreuer: n };
    const gleich = JSON.stringify(soll.netto) === JSON.stringify(k.nettoJeTeam) && JSON.stringify(soll.pausen) === JSON.stringify(k.pausenJeTeam)
      && JSON.stringify(soll.kind) === JSON.stringify(k.schnittJeKind) && soll.dauer === k.gesamtdauer && soll.betreuer === k.betreuer;
    return gleich ? null : JSON.stringify({ soll, ist: k });
  };
  const nachAlle = [];

  // 1 ─ drei Vereine à 8, 3 Felder Minitore
  { const p = planFestival({ vereine: [{ name: "A", kinder: 8 }, { name: "B", kinder: 8 }, { name: "C", kinder: 8 }], felder: M(3), spielzeit: 7, wechsel: 1 }); nachAlle.push(["1", p]);
    const k = p.kennzahlen;
    pruef(p.teams.length === 6 && p.teams.every(t => t.kinder === 4) && k.runden === 5 && p.runden.every(r => r.spiele.length === 3) && k.nettoJeTeam.every(x => x === 35) && k.schnittJeKind.every(x => x === 26.25),
      "1) 6 Teams à 4, 5 Runden, alle 3 Felder in jeder Runde, 35 Min. je Team, 26,25 Min. je Kind",
      "1) " + JSON.stringify({ teams: p.teams.map(t => t.kinder), k })); }
  // 2 ─ 11 / 9 / 7, 3 Felder
  { const p = planFestival({ vereine: [{ name: "SV Adler Dellbrück U9 I", kinder: 11 }, { name: "Bäng, Boom, Bäng Ballfieber U9", kinder: 9 }, { name: "Schlebusch U9 I", kinder: 7 }], felder: M(3) }); nachAlle.push(["2", p]);
    const k = p.kennzahlen;
    pruef(p.teams.length === 7 && p.runden.every(r => r.pause.length === 1) && k.runden === 7 && k.spieleJeTeam.every(x => x === 6) && k.gesamtdauer === 55
      && H(p, /11 Kinder lassen sich nicht/) && H(p, /7 Kinder lassen sich nicht/) && H(p, /3 Kindern spielen ohne Rotation/),
      "2) 7 Teams, je Runde ein Team frei, 7 Runden, jedes Team 6 Spiele, 55 Min.; Hinweise zu 11 und 7 Kindern und zu Teams mit 3",
      "2) " + JSON.stringify({ n: p.teams.length, k, h: p.hinweise.map(x => x.text) }));
    // Vereinsduelle so spät wie möglich: kein Vereinsduell vor der letzten Runde, in der noch ein anderer Gegner frei war
    const erstes = p.runden.findIndex(r => r.spiele.some(g => p.teams[g.a].verein === p.teams[g.b].verein));
    pruef(erstes < 0 || erstes >= 4, `2) Vereinsduelle frühestens in Runde ${erstes < 0 ? "–" : erstes + 1}`, `2) Vereinsduell schon in Runde ${erstes + 1}`);
    const doppelPause = p.runden.some((r, i) => i && r.pause.some(t => p.runden[i - 1].pause.includes(t)));
    pruef(!doppelPause, "2) kein Team zweimal hintereinander spielfrei", "2) ein Team pausiert zweimal hintereinander"); }
  // 3 ─ Gast meldet 2 Teams mit zusammen 6 Kindern
  { const p = planFestival({ vereine: [{ name: "SV Adler Dellbrück U9 I", kinder: 10 }, { name: "Gast", kinder: 6, teams: 2 }], felder: M(2) }); nachAlle.push(["3", p]);
    pruef(p.runden.length > 0 && p.teams.filter(t => t.verein === "Gast").map(t => t.kinder).join() === "3,3" && H(p, /Gast: Teams mit 3 Kindern spielen ohne Rotation/) && H(p, /gemeldet 2 Teams/),
      "3) Plan erzeugt; Gast 3 + 3 mit Hinweis „ohne Rotation“ und „gemeldet 2 Teams“", "3) " + JSON.stringify(p.hinweise)); }
  // 4 ─ ein Feld, zwei Teams
  { let p = null, fehler = "";
    try { p = planFestival({ vereine: [{ name: "A", kinder: 5 }, { name: "B", kinder: 5 }], felder: M(1) }); } catch (e) { fehler = String(e); }
    if (p) nachAlle.push(["4", p]);
    pruef(!fehler && p.runden.length >= 1 && p.runden.every(r => r.spiele.length === 1) && H(p, /durch das Zeitfenster begrenzt/),
      "4) kein Absturz, eine Begegnung je Runde, Hinweis „Rundenzahl durch das Zeitfenster begrenzt“", "4) " + (fehler || JSON.stringify(p.hinweise))); }
  // 5 ─ 66 Minuten bei 60 Min. Zeitfenster
  { const p = planFestival({ vereine: [{ name: "A", kinder: 8 }, { name: "B", kinder: 8 }, { name: "C", kinder: 8 }], felder: M(3), runden: 7, spielzeit: 6, wechsel: 4, zeitfenster: 60 }); nachAlle.push(["5", p]);
    pruef(p.kennzahlen.gesamtdauer === 66 && p.runden.length === 7 && H(p, /66 Min\. liegt über dem Zeitfenster von 60 Min\. Vorschlag/),
      "5) 66 Min.: Warnung mit Vorschlag, 7 Runden bleiben (nicht gekürzt)", "5) " + JSON.stringify({ d: p.kennzahlen.gesamtdauer, r: p.runden.length, h: p.hinweise })); }
  // 6 ─ gemischte Felder 2 Minitor, 2 Jugendtor
  { const p = planFestival({ vereine: [{ name: "A", kinder: 8 }, { name: "B", kinder: 8 }, { name: "C", kinder: 8 }, { name: "D", kinder: 8 }], felder: [{ tor: "mini" }, { tor: "mini" }, { tor: "jugend" }, { tor: "jugend" }] }); nachAlle.push(["6", p]);
    const jug = p.teams.map((_, t) => p.runden.reduce((a, r) => a + r.spiele.filter(g => (g.a === t || g.b === t) && g.feld >= 3).length, 0));
    const gleichF = p.teams.every((_, t) => { const c = {}; p.runden.forEach(r => r.spiele.forEach(g => { if (g.a === t || g.b === t) c[g.feld] = (c[g.feld] || 0) + 1; })); return Math.max(...Object.values(c)) <= 3; });
    pruef(p.felder.map(f => f.label).join("|") === "3 gegen 3|3 gegen 3|3+1 gegen 3+1|3+1 gegen 3+1" && Math.max(...jug) - Math.min(...jug) <= 1 && gleichF,
      `6) Spielform je Feld korrekt; Jugendtor-Spiele je Team ${Math.min(...jug)}–${Math.max(...jug)}, kein Team dauerhaft auf einem Feld`, "6) " + JSON.stringify({ f: p.felder.map(f => f.label), jug })); }
  // 7 ─ Variantenvergleich: 3 × 10 Kinder, 5 Felder, 6 Runden
  { const v = planFestivalVarianten({ vereine: [{ name: "A", kinder: 10 }, { name: "B", kinder: 10 }, { name: "C", kinder: 10 }], felder: M(5), spielzeit: 7, runden: 6 });
    v.forEach((p, i) => nachAlle.push(["7" + "ab"[i], p]));
    const g = v.filter(p => p.variante === "gross")[0], k = v.filter(p => p.variante === "klein")[0];
    pruef(!!g && g.teams.length === 6 && g.teams.every(t => t.kinder === 5) && g.genutzteFelder.length === 3 && g.kennzahlen.schnittJeKind.every(x => x === 25.2),
      "7a) große Teams: 6 Teams à 5, nur 3 Felder belegt, 25,2 Min. je Kind", "7a) " + JSON.stringify(g && { t: g.teams.map(t => t.kinder), f: g.genutzteFelder, k: g.kennzahlen.schnittJeKind }));
    pruef(!!k && k.teams.length === 9 && k.genutzteFelder.length === 4 && H(k, /unter der Teamgröße-Empfehlung/) && H(k, /Nicht jeder spielt gegen jeden/) && H(k, /ohne Rotation/),
      `7b) kleine Teams (je Verein 4+3+3): 9 Teams, 4 Felder belegt, schwächstes Kind ${k && k.kennzahlen.minKind} Min.; Hinweise Teamgröße, Rotation, nicht jeder gegen jeden`,
      "7b) " + JSON.stringify(k && { t: k.teams.map(t => t.kinder), f: k.genutzteFelder, h: k.hinweise.map(x => x.text) }));
    pruef(v.length === 2 && v[0].kennzahlen.minKind >= v[1].kennzahlen.minKind && v[0].variante === "klein",
      "7) Reihenfolge nach Minuten des am wenigsten bespielten Kindes (klein zuerst), nichts automatisch gewählt", "7) Reihenfolge: " + v.map(p => p.variante + ":" + p.kennzahlen.minKind).join(", ")); }
  // 8 ─ Schalter 4+1
  { const aus = planFestival({ vereine: [{ name: "A", kinder: 10 }, { name: "B", kinder: 10 }], felder: [{ tor: "jugend" }, { tor: "mini" }] });
    const an = planFestival({ vereine: [{ name: "A", kinder: 10 }, { name: "B", kinder: 10 }], felder: [{ tor: "jugend", vierPlusEins: true }, { tor: "mini" }] });
    const minian = planFestival({ vereine: [{ name: "A", kinder: 10 }, { name: "B", kinder: 10 }], felder: [{ tor: "mini", vierPlusEins: true }] });
    nachAlle.push(["8aus", aus], ["8an", an]);
    const linkAus = fpZuHeimturnier(aus, "10:15"), linkAn = fpZuHeimturnier(an, "10:15");
    pruef(!/4\+1|4 gegen 4/.test(alleTexte(aus)) && !/4\+1|4 gegen 4/.test(JSON.stringify(linkAus)) && !/4\+1|4 gegen 4/.test(alleTexte(minian)),
      "8) Schalter aus (und auf Minitoren): kein 4+1, nirgends 4 gegen 4", "8) 4+1 oder 4 gegen 4 ohne Schalter");
    pruef(an.felder[0].label === "4+1 gegen 4+1" && an.hinweise[0].art === "abweichung" && /Abweichung von den Durchführungsbestimmungen, nach Absprache der Trainer/.test(an.hinweise[0].text)
      && H(an, /Annahme für 4\+1/) && linkAn.config.planer.abweichung === "Abweichung von den Durchführungsbestimmungen, nach Absprache der Trainer" && linkAn.config.felder[0].form === "f4" && !/4 gegen 4\b(?!\s*\+)/.test(alleTexte(an).replace(/4\+1 gegen 4\+1/g, "")),
      "8) Schalter an: Feld 4+1, Abweichungshinweis im Plan und im Link (config.planer.abweichung), Teamgröße als Annahme", "8) " + JSON.stringify({ f: an.felder[0], h: an.hinweise, l: linkAn.config.planer })); }
  // Abnahme 3 – jede Kennzahl unabhängig nachgerechnet
  { const falsch = []; nachAlle.forEach(([n, p]) => { try { const e = nach(p); if (e) falsch.push(n + ": " + e.slice(0, 200)); } catch (e) { falsch.push(n + ": " + e.message); } });
    pruef(!falsch.length, `Kennzahlen in ${nachAlle.length} Plänen unabhängig nachgerechnet (Netto, Pausen, je Kind, Dauer, Betreuer; kein Team/Feld doppelt je Runde)`, "Nachrechnung: " + falsch.join(" | ")); }
  // Abnahme 6 – Regeln an einer Stelle mit Quelle
  pruef(/Durchführungsbestimmungen Kinderfußball, Fußballkreis Köln, gültig ab 01\.08\.2026 \(Saison 2026\/27\)/.test(FP_REGELN.quelle) && FP_REGELN.formen.mini.label === "3 gegen 3" && FP_REGELN.formen.jugend.label === "3+1 gegen 3+1"
    && FP_REGELN.teamMin === 4 && FP_REGELN.teamMax === 5 && FP_REGELN.spieleEmpfohlen === 6 && FP_REGELN.spielzeit === 7 && FP_REGELN.zeitfenster === 60,
    "Regelkonstanten an einer Stelle (FP_REGELN) mit Quelle und Saison", "Regelkonstanten weichen ab");
  // Umwandlung in den bestehenden Datensatz: Teamindizes, Felder, Zeiten
  { const p = planFestival({ vereine: [{ name: "A", kinder: 8 }, { name: "B", kinder: 8 }, { name: "C", kinder: 8 }], felder: M(3) }), l = fpZuHeimturnier(p, "10:15");
    pruef(l.teams.length === 6 && l.plan.length === 15 && l.plan[0].zeit === "10:15" && l.plan[l.plan.length - 1].zeit === "10:47" && l.config.felder.every(f => f.form === "funino") && !/Kind [A-O]\b/.test(JSON.stringify(l)),
      "Link: 15 Spiele in Teams/Plan/Felder des Festival-Datensatzes (10:15 bis 10:47), keine Kinder", "Umwandlung: " + JSON.stringify(l).slice(0, 300)); }

  // 9 ─ Planer nicht geöffnet: bestehender Festival-Ablauf und Link unverändert
  { const T = require("../turnier-attrappe.js");
    const row = T.zeile();
    const schreib = [];
    const s = await h.starten({ start: "/eltern/index.html?turnier=herbstcup-21-11", angemeldet: false, warten: 2500, supabase: h.supabaseAttrappe({ heimturnier: (u, req) => { if (req.method() !== "GET") schreib.push(req.method()); return [row]; } }) });
    const r = await s.page.evaluate(() => ({ planer: typeof planFestival, zeilen: document.querySelectorAll("#ht-public table tr").length, text: (document.getElementById("ht-public") || {}).textContent || "" }));
    const fe = s.fehler(); await s.schliessen();
    pruef(r.planer === "undefined" && r.zeilen > 0 && !/Abweichung von den Durchführungsbestimmungen/.test(r.text) && !schreib.length && !fe.length,
      "9) öffentlicher Link eines bestehenden Turniers: Planer nicht geladen, Seite wie bisher, nichts geschrieben",
      "9) " + JSON.stringify({ planer: r.planer, zeilen: r.zeilen, schreib, fe: fe.slice(0, 2) })); }

  // Oberfläche (Trainer): Bedienelemente ≥ 48 px, eine Hauptaktion 56 px je Bildschirm, Übernehmen schreibt in den bestehenden Datensatz
  { const row = { id: 7, slug: "fest-28-11", name: "Kinderfestival", datum: "2026-11-28", aktiv: true, teams: [], plan: [],
      config: { art: "festival", format: "festival", anlass: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: [{ form: "funino" }, { form: "funino" }, { form: "f4" }],
        vereine: [{ name: "SV Adler Dellbrück U9 I", kinder: 11, teams: 3 }, { name: "Gastverein Nord", kinder: 9, teams: 2 }, { name: "Gastverein Süd", kinder: 7, teams: 2 }] } };
    const patches = [];
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), heimturnier: (u, req) => { if (req.method() === "PATCH") patches.push(JSON.parse(req.postData() || "{}")); return [row]; } }), hoehe: 1800 });
    const r = await s.page.evaluate(async (row) => {
      for (let i = 0; i < 50 && typeof fpOpen !== "function"; i++) await new Promise(x => setTimeout(x, 100));
      _HT = JSON.parse(JSON.stringify(row)); window.frageJaNein = async () => true;
      fpOpen();
      const m = document.getElementById("fp-modal"), q = sel => [...m.querySelectorAll(sel)];
      const klein = q("button, select, input.fp-feld").filter(b => b.offsetParent && b.getBoundingClientRect().height < 48 && !b.closest(".mdl-head, [class*='mdl']")).map(b => (b.textContent || b.getAttribute("aria-label") || b.tagName).trim().slice(0, 20));
      const haupt1 = q(".fp-haupt").map(b => b.textContent.trim() + ":" + Math.round(b.getBoundingClientRect().height));
      const dialog = m.getAttribute("role") === "dialog" && m.getAttribute("aria-modal") === "true";
      const vorher = JSON.stringify(_HT.config.felder);
      fpErzeugen(); await new Promise(x => setTimeout(x, 50));
      const haupt2 = q(".fp-haupt").map(b => b.textContent.trim() + ":" + Math.round(b.getBoundingClientRect().height));
      const tab = !!m.querySelector(".fp-tab"), hinw = m.querySelectorAll(".fp-hin").length, unveraendert = JSON.stringify(_HT.config.felder) === vorher;
      await fpUebernehmen(); await new Promise(x => setTimeout(x, 100));
      return { dialog, klein, haupt1, haupt2, tab, hinw, unveraendert, zu: !document.getElementById("fp-modal"), teams: _HT.teams };
    }, row);
    const fe = s.fehler(); await s.schliessen();
    const p = patches[patches.length - 1] || {};
    pruef(r.dialog && !r.klein.length && r.haupt1.length === 1 && /Plan erzeugen:5[6-9]|Plan erzeugen:6\d/.test(r.haupt1[0]) && r.haupt2.length === 1 && /Plan übernehmen:5[6-9]|Plan übernehmen:6\d/.test(r.haupt2[0]),
      `UI) Dialog; alle Bedienelemente ≥ 48 px; je Bildschirm eine Hauptaktion (${r.haupt1[0]} · ${r.haupt2[0]} px)`, "UI) " + JSON.stringify(r));
    pruef(r.tab && r.hinw > 0 && r.unveraendert && r.zu && patches.length === 1 && Array.isArray(p.teams) && p.teams.length === r.teams.length && Array.isArray(p.plan) && p.plan.length > 0 && p.config && p.config.art === "festival" && p.config.planer && p.config.planer.wechselregel && !/Kind [A-O]\b/.test(JSON.stringify(p)) && !fe.length,
      `UI) Erzeugen ändert nichts; „Plan übernehmen“ schreibt einmal Teams (${p.teams && p.teams.length}), Plan (${p.plan && p.plan.length} Spiele) und config.planer in den Festival-Datensatz`, "UI) " + JSON.stringify({ patches: patches.length, p: JSON.stringify(p).slice(0, 300), fe: fe.slice(0, 2) })); }

  return h.ergebnis("v979 Festival-Planer: planFestival rein, neun Testfälle, Kennzahlen nachgerechnet", !probleme.length, zeilen.concat(probleme));
};
