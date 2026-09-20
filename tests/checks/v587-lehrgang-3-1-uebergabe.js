/* v587 – Übergabe 3.1 vom 20.09.: Texte, vier Bilder, Legende.

   Der Projekt-Chat hat die Lehrgangsübung „Raute mit Torwart – Angriff über den anderen
   Flügel" am 19./20.09. inhaltlich weiterentwickelt (Übergabe im privaten Repo, Abschnitte
   1–3). Was davon in der App landen muss, steht hier fest – nicht die Wörter, sondern die
   Beschlüsse, an denen man erkennt, ob die Fassung im Repo die beschlossene ist:

   a) TEXTE. Leitfrage 4 ist das Hauptziel und steht vorn in `kurz` und `ablauf`. Es heißt
      „Provokation", nicht „Steigerung". Das Wort „Flanke" fällt überall weg – der Ball kommt
      flach. Die Torwart-Variante spricht vom ABGEHÄNGTEN Jugendtor (1,65 m, Vorgabe des
      Verbands), nicht vom „gesicherten". Option L „Sturzflug" steht im Ablauf und im
      Coaching. Die Rotation schließt den Torwart ein.
   b) AUFBAU. Die Teller stehen von y 86 bis y 194 – die letzten 8 m vor dem Zieltor sind
      frei. Der Jäger steht in der freien Zone (oberhalb von y 86).
   c) VERHALTEN OHNE BALL, sichtbar in der Abfolge: In Bild 1 steht FR an der Innenkante
      seines Korridors, in Bild 3 FL. „Innenkante" heißt: der Kreis berührt die Tellerlinie
      fast (Abstand des Kreisrands zur Linie höchstens 2 Punkte). In Bild 4 steht FR am
      Korridorende (nicht tiefer als y 92) und spielt flach in die Mitte; der Lauf von FL
      kreuzt die Tellerlinie erst oberhalb von y 86.
   d) BILDTEXT 4 ohne „Flanke", höchstens 30 Zeichen.
   e) LEGENDE. Sie führt nur auf, was gezeichnet ist: unter der Lehrgangsskizze keine
      „Schusszone" und keine „Mittellinie" (Beschluss vom 14.09.: „Eine Legende, die eine
      andere Zeichnung beschreibt, ist schlimmer als keine"). Eine Skizze MIT Mittellinie
      zeigt sie, eine Skizze nur mit Pässen zeigt keinen Schuss – und OHNE Beschreibung
      (Altbestand) bleibt die volle Legende, denn dort weiß niemand, was drin ist.
   f) Die Übergabe verlangt „jeder Schritt mit s" – sonst hat das Abspielen nichts zu zeigen. */
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const NAME = "Raute mit Torwart – Angriff über den anderen Flügel";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u) return h.ergebnis("Lehrgang 3.1 – Übergabe 20.09.", false, ["Die Übung steht nicht in der Bibliothek"]);

  // a) Texte
  const alles = ["kurz", "spieler", "feld", "dauer", "ablauf", "varianten", "coaching"].map(k => String(u[k] || "")).join("\n");
  if (!/^Leitfrage 4:/.test(u.kurz)) probleme.push(`kurz beginnt nicht mit „Leitfrage 4:“ – „${String(u.kurz).slice(0, 40)}…“`);
  if (!/^HAUPTZIEL \(Leitfrage 4\)/.test(u.ablauf)) probleme.push("ablauf beginnt nicht mit „HAUPTZIEL (Leitfrage 4)“ – der Fokus darf nicht zum Abschluss kippen");
  if (/Steigerung/i.test(alles)) probleme.push("„Steigerung“ steht noch im Text – beschlossen ist „Provokation“");
  if (!/PROVOKATIONEN: 1 –/.test(u.ablauf)) probleme.push("Die drei festen Provokationen fehlen im Ablauf");
  if (/Flanke/i.test(alles)) probleme.push("„Flanke“ steht noch im Text – der Ball kommt flach");
  if (!/abgehängt/.test(u.varianten) || /gesichert/.test(alles)) probleme.push("Torwart-Variante: „abgehängt“ fehlt oder „gesichert“ steht noch da");
  if (!/1,65 m/.test(u.varianten)) probleme.push("Die Torhöhe 1,65 m (Verbandsvorgabe) fehlt in den Varianten");
  if (!/L – Sturzflug/.test(u.ablauf) || !/Sturzflug/.test(u.coaching)) probleme.push("Option L „Sturzflug“ fehlt im Ablauf oder im Coaching");
  if (!/ROTATION: .*auch Torwart/.test(u.ablauf)) probleme.push("Die Rotation nennt den Torwart nicht");
  if (!/bis 8 m vor dem Zieltor/.test(u.feld)) probleme.push("feld nennt das Korridorende 8 m vor dem Zieltor nicht");
  if (u.kat !== "raute" || u.diff !== 2 || u.dauer !== "30") probleme.push(`kat/diff/dauer verändert: ${u.kat}/${u.diff}/${u.dauer}`);

  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(({ spec }) => {
    const out = { fehlt: ["skzBildZahl", "_skzBild", "skzLegende", "skzLegendeArten", "_eiSkizzeFehler"].filter(n => typeof window[n] !== "function") };
    if (out.fehlt.length) return out;
    out.skz = _eiSkizzeFehler(spec);
    const teller = (spec.ger || []).filter(g => g[2] === "teller");
    out.tellerY = [Math.min(...teller.map(t => t[1])), Math.max(...teller.map(t => t[1]))];
    out.tellerX = [...new Set(teller.map(t => t[0]))].sort((a, b) => a - b);
    const n = skzBildZahl(spec), bilder = [];
    for (let i = 0; i < n; i++) {
      const b = _skzBild(spec, i), by = k => (b.s || []).find(x => x[3] === k) || [0, 0];
      bilder.push({ A: by("A").slice(0, 2), FL: by("FL").slice(0, 2), FR: by("FR").slice(0, 2), J: by("J").slice(0, 2), ball: (b.b || [[0, 0]])[0], p: b.p || [], tx: ((b.tx || [])[0] || [])[2] || "" });
    }
    out.bilder = bilder;
    out.schritteMitS = (spec.schritte || []).map(x => Array.isArray(x.s) && x.s.length === (spec.s || []).length);
    const txt = html => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; };
    out.legRaute = txt(skzLegende(false, spec));
    out.legMitte = txt(skzLegende(false, { s: [[10, 10, "g"]], li: [[10, 90, 270, 90, "m"]], p: [[10, 10, 50, 50, "p"]] }));
    out.legNurPass = txt(skzLegende(false, { s: [[10, 10, "g"]], p: [[10, 10, 50, 50, "p"]] }));
    out.legOhne = txt(skzLegende(false));
    return out;
  }, { spec: u.skizze });
  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Lehrgang 3.1 – Übergabe 20.09.", false, [r.fehlt.join(", ") + " fehlt"]);
  if (r.skz.length) probleme.push("_eiSkizzeFehler: " + r.skz.join(" · "));

  // b) Aufbau
  if (r.tellerY[0] !== 86 || r.tellerY[1] !== 194) probleme.push(`Teller von y ${r.tellerY[0]} bis ${r.tellerY[1]} statt 86 bis 194`);
  if (String(r.tellerX) !== "47,133") probleme.push(`Tellerlinien bei x ${r.tellerX} statt 47 und 133`);
  const b = r.bilder;
  if (b.length < 4) probleme.push(`${b.length} Bilder – die Übergabe beschreibt vier, seit v588 folgen Abschluss und Tor als Bild 5 und 6`);
  b.forEach((x, i) => { if (x.J[1] >= 86) probleme.push(`Bild ${i + 1}: Jäger bei y ${x.J[1]} – er gehört in die freie Zone oberhalb von 86`); });

  // c) Verhalten ohne Ball
  const innen = (sp, linie) => Math.abs(Math.abs(sp[0] - linie) - 8) <= 2;   // Kreisrand höchstens 2 Punkte von der Linie
  if (b[0] && !innen(b[0].FR, 133)) probleme.push(`Bild 1: FR bei x ${b[0].FR[0]} – er gehört an die Innenkante (Kreisrand an x 133)`);
  if (b[2] && !innen(b[2].FL, 47)) probleme.push(`Bild 3: FL bei x ${b[2].FL[0]} – er gehört an die Innenkante (Kreisrand an x 47)`);
  if (b[1] && innen(b[1].FL, 47)) probleme.push("Bild 2: FL steht schon an der Innenkante, obwohl er den Ball hat");
  if (b[3]) {
    if (b[3].FR[1] > 92) probleme.push(`Bild 4: FR bei y ${b[3].FR[1]} – er gehört ans Korridorende (nicht tiefer als 92)`);
    const pass = b[3].p.find(p => p[4] === "p");
    if (!pass) probleme.push("Bild 4: kein Pass");
    else {
      const dJ = Math.hypot(pass[2] - b[3].J[0], pass[3] - b[3].J[1]);
      if (dJ > 20) probleme.push(`Bild 4: der Pass endet ${Math.round(dJ)} Punkte vom Jäger entfernt`);
      if (Math.abs(pass[3] - pass[1]) > 10) probleme.push(`Bild 4: der Pass fällt um ${Math.abs(pass[3] - pass[1])} Punkte – er soll flach in die Mitte kommen, nicht steil`);
    }
    /* Der Lauf von FL: jeder Laufweg links, der die Tellerlinie x 47 kreuzt, tut das oberhalb von y 86. */
    b[3].p.filter(p => p[4] === "l" && Math.min(p[0], p[2]) < 47 && Math.max(p[0], p[2]) > 47).forEach(p => {
      const t = (47 - p[0]) / (p[2] - p[0]), y = p[1] + t * (p[3] - p[1]);
      if (y >= 86) probleme.push(`Bild 4: ein Laufweg kreuzt die Tellerlinie bei y ${Math.round(y)} – erlaubt ist das erst oberhalb von 86`);
    });
    const schuss = b[3].p.find(p => p[4] === "s");
    if (!schuss) probleme.push("Bild 4: der Jäger schließt nicht ab (kein Schuss)");
  }
  // d) Bildtext 4
  const t4 = b[3] ? b[3].tx : "";
  if (/Flanke/i.test(t4)) probleme.push(`Bildtext 4 nennt die Flanke: „${t4}“`);
  if (t4.length > 30 || !t4) probleme.push(`Bildtext 4 hat ${t4.length} Zeichen (höchstens 30): „${t4}“`);
  // e) Legende
  if (/Schusszone|Mittellinie/.test(r.legRaute)) probleme.push("Die Legende der Lehrgangsskizze zeigt Schusszone oder Mittellinie – gezeichnet ist keines von beiden");
  ["Pass", "Laufweg", "Schuss", "Dribbling", "Markierungsteller", "Freistoß-Dummy", "Trainer"].forEach(n => { if (!r.legRaute.includes(n)) probleme.push(`In der Legende der Lehrgangsskizze fehlt „${n}“`); });
  if (!/Mittellinie/.test(r.legMitte) || /Schusszone/.test(r.legMitte)) probleme.push("Eine Skizze mit Mittellinie zeigt sie nicht (oder dazu eine Schusszone)");
  if (/Schuss(?!zone)/.test(r.legNurPass.replace(/Schusszone/g, "")) || /Laufweg|Dribbling/.test(r.legNurPass)) probleme.push(`Eine Skizze nur mit Pässen zeigt andere Wegarten: ${r.legNurPass}`);
  if (!/Pass/.test(r.legNurPass)) probleme.push("Eine Skizze nur mit Pässen zeigt den Pass nicht");
  ["Pass", "Laufweg", "Schuss", "Dribbling", "Schusszone", "Mittellinie"].forEach(n => { if (!r.legOhne.includes(n)) probleme.push(`Ohne Beschreibung fehlt „${n}“ in der Legende – der Altbestand braucht die volle`); });
  // f) Schritte mit s
  if (!r.schritteMitS.every(Boolean)) probleme.push(`Nicht jeder Schritt nennt alle Spieler: ${JSON.stringify(r.schritteMitS)}`);
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push("Texte: Leitfrage 4 vorn, Provokationen statt Steigerungen, keine Flanke, abgehängtes Tor 1,65 m, Sturzflug, Rotation mit Torwart");
    zeilen.push(`Aufbau: Teller y ${r.tellerY.join("–")} an x ${r.tellerX.join("/")}, Jäger bei y ${b[0].J[1]}`);
    zeilen.push(`Innenkante: Bild 1 FR x ${b[0].FR[0]} · Bild 3 FL x ${b[2].FL[0]} · Bild 4 FR am Korridorende y ${b[3].FR[1]}, Pass flach zum Jäger, FL kreuzt oberhalb 86`);
    zeilen.push(`Bildtext 4: „${t4}“ (${t4.length} Zeichen)`);
    zeilen.push(`Legende: ${r.legRaute.replace(/([a-zß])([A-ZÄÖÜ])/g, "$1 · $2")}`);
  }
  return h.ergebnis("Lehrgang 3.1 – Übergabe 20.09.: Texte, Bilder, Legende", !probleme.length, zeilen.concat(probleme));
};
