/* v635 · PO vor der ersten Spielerbewertung im Trainermeeting: „Überprüfe nochmal den Prozess,
   die Kriterien, die Algorithmen, die Logik und die resultierenden Ergebnisse …“ – Kachel
   „Fehler + Zahlen raus“. Befunde aus dem Code, hier am echten DOM nachgemessen:

   a) „Leeren“ (clearForm) und „Laden / Profil bearbeiten“ (loadPlayerToForm) brachen an
      #p-grp ab, das es seit dem Ende der A/B-Labels nicht mehr gibt.
   b) „Erste Bewertung anlegen“ aus der Kaderliste nahm die angehakten Werte des zuvor
      bewerteten Kindes mit.
   c) Durchgehend Stufe 2 („Solide/Altersgerecht“) ergab im Förderplan „im Aufbau … keine
      Leistungsorientierung“, dazu die Zeile „Gruppe:“ aus der A/B-Zeit.
   d) Die Urkunde (an das Kind adressiert) druckte Entwicklungsstand und Tempo in Prozent.
   e) Der Entwicklungsbericht fürs Elterngespräch druckte Prozente, „Schwächster Messwert“,
      den ELTERN-HINWEIS und „Gruppe:“.
   f) PO: „Wir bewerten gemeinsam als Trainer, nicht jeder einzeln“ – „Bewertet von“ bietet
      „Trainerteam“ an erster Stelle und hat es vorgewählt. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), spielerprofile: [], entwicklungsziele: [], nominierungen: [] }) });
  const r = await s.page.evaluate(async K => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    window.Chart = class { constructor() { this.data = { datasets: [{}] }; } destroy() {} update() {} };   // Chart.js steht kopflos still (siehe v474)
    go("bew"); await warte(300);
    const sel = document.getElementById("p-name");
    const opt = n => { if (![...sel.options].some(o => o.value === n)) { const o = document.createElement("option"); o.value = o.textContent = n; sel.appendChild(o); } };
    opt(K[0]); opt(K[1]);
    const alleStufe = st => { document.querySelectorAll('#dims-wrap input[type="radio"]').forEach(x => { if (x.value === String(st)) x.checked = true; }); };
    const angehakt = () => document.querySelectorAll('#dims-wrap input[type="radio"]:checked').length;
    // f) gemeinsame Bewertung: „Trainerteam“ vorn und vorgewählt
    if (typeof renderTrainerUI === "function") renderTrainerUI();
    const pt = document.getElementById("p-trainer");
    out.team = { erste: pt?.options[0]?.value, wert: pt?.value };
    // a) Leeren
    sel.value = K[0]; onPlayerSelect(); await warte(100); alleStufe(3);
    try { clearForm(); out.leeren = angehakt() === 0 ? "ok" : "noch " + angehakt() + " angehakt"; } catch (e) { out.leeren = "Fehler: " + e.message; }
    // a) Laden
    const radios = {}; DIMS_FELD.forEach(d => d.tier.forEach(t => { radios[t.n] = 4; }));
    try { loadPlayerToForm({ name: K[1], datum: "2026-09-20", radios, trainer: "Charles", age: "8" }); await warte(100);
      out.laden = document.getElementById("p-name").value === K[1] && angehakt() > 0 ? "ok" : `Name ${document.getElementById("p-name").value}, ${angehakt()} angehakt`;
    } catch (e) { out.laden = "Fehler: " + e.message; }
    // b) Kaderliste: Werte des vorigen Kindes dürfen nicht mitkommen
    sel.value = K[0]; onPlayerSelect(); await warte(100); alleStufe(4);
    kaderBewerten(K[1]); await warte(500);
    out.kader = { name: document.getElementById("p-name").value, angehakt: angehakt() };
    // c) Förderplan-Text bei durchgehend Stufe 2
    const v2 = {}; DIMS_FELD.forEach(d => d.tier.forEach(t => { v2[t.n] = 2; }));
    const f2 = generateFazitFeld(v2, { name: "Kind X", age: "8", foot: "R", att: "2", eltern: "1", trainer: "Charles", date: "2026-09-27" });
    out.fazit = { text: f2.text, summary: f2.summary, total: f2.total };
    // d) Urkunde + e) Bericht mit einer gespeicherten Bewertung (Stufe 2, Eltern-Druck gesetzt)
    DB[K[0]] = [{ name: K[0], datum: "2026-09-27", total_score: f2.total, pot_score: f2.pot, fazit: f2.text, radios: v2, prim_rolle: "Aufpasser", trainer: "Charles", eltern: "1" }];
    out.urkunde = _zertCardHtml(K[0]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    window.print = () => {};
    const ps = document.getElementById("psel-profil"); if (ps && ![...ps.options].some(o => o.value === K[0])) { const o = document.createElement("option"); o.value = o.textContent = K[0]; ps.appendChild(o); }
    if (ps) ps.value = K[0];
    try { await entwicklungsReport(); } catch (e) { out.berichtFehler = e.message; }
    out.bericht = (document.getElementById("zert-print")?.textContent || "").replace(/\s+/g, " ");
    return out;
  }, K);
  const fe = s.fehler(); await s.schliessen();

  if (r.leeren !== "ok") probleme.push("a) Leeren: " + r.leeren);
  if (r.laden !== "ok") probleme.push("a) Laden: " + r.laden);
  if (r.kader.name !== K[1] || r.kader.angehakt !== 0) probleme.push(`b) Kaderliste: ${r.kader.name}, ${r.kader.angehakt} Werte des vorigen Kindes angehakt`);
  if (/im Aufbau/.test(r.fazit.text + r.fazit.summary)) probleme.push("c) Stufe 2 überall ergibt „im Aufbau“");
  if (!/altersgerecht/.test(r.fazit.text)) probleme.push("c) Stufe 2 überall ergibt kein „altersgerecht“");
  if (/Gruppe:/.test(r.fazit.text)) probleme.push("c) Förderplan trägt noch „Gruppe:“");
  if (/\d+\s*%/.test(r.urkunde)) probleme.push("d) Urkunde zeigt Prozente: " + (r.urkunde.match(/[^ ]+ ?\d+\s*%/) || [""])[0]);
  const berichtOhneAnwesenheit = r.bericht.replace(/Training: [^⚽]*|Spiele: \S+( \(\d+\/\d+\))?/g, "");
  if (r.berichtFehler) probleme.push("e) Bericht bricht ab: " + r.berichtFehler);
  if (/\d+\s*%/.test(berichtOhneAnwesenheit)) probleme.push("e) Bericht zeigt Bewertungsprozente: " + (berichtOhneAnwesenheit.match(/.{0,30}\d+\s*%/) || [""])[0]);
  if (/ELTERN-HINWEIS|Externes Coaching|Gruppe:|Messwert|Entwicklungstempo/.test(r.bericht)) probleme.push("e) Bericht enthält Trainer-Interna: " + (r.bericht.match(/ELTERN-HINWEIS|Externes Coaching|Gruppe:|Messwert|Entwicklungstempo/) || [""])[0]);
  if (!/STÄRKEN/.test(r.bericht) || !/Solide/.test(r.bericht)) probleme.push("e) Bericht ohne Stärken oder ohne Stufenwort");
  if (r.team.erste !== "Trainerteam" || r.team.wert !== "Trainerteam") probleme.push(`f) „Bewertet von“ steht nicht auf Trainerteam: ${JSON.stringify(r.team)}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Leeren ${r.leeren} · Laden ${r.laden} · Kaderliste: ${r.kader.angehakt} alte Werte`,
    `Stufe 2 überall: ${r.fazit.total} % → „${(r.fazit.text.match(/entwickelt sich[^.]*|ist im Aufbau[^.]*/) || [""])[0]}“`,
    `Bericht: ${r.bericht.slice(0, 160)}`);
  return h.ergebnis("v635 Spielerbewertung: Laden/Leeren, Kaderliste, Förderplan-Stufen, keine Zahlen auf Urkunde und im Elternbericht", !probleme.length, probleme.concat(zeilen));
};
