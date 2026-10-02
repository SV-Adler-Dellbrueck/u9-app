/* v715 – Aufpasser-Steilpass als Spielform, Provokationsregeln für die Hauptteil-Übungen.

   PO am 02.10. (Bildschirmfoto 07:13): „Die Skizze ist nicht stimmig mit dem Aufbau. Erweitere
   es zu einer Spielform … nach drei Sekunden immer ein Verteidiger mehr, bis der Ball geklärt
   ist oder ein Tor gefallen ist. Dann rotieren wir durch. … bei allen Übungen schauen, ob wir
   Provokationsregeln optional einbauen können.“ Entschieden: umbauen, gleicher Name; Regeln
   direkt einbauen.

   Fälle:
   a) Jeder Schlüssel in PROVOKATIONEN ist der Name einer Übung der App (data.js oder Bibliothek)
      – ein Tippfehler hieße: die Regeln erscheinen nie. Je Übung ein bis drei Regeln, keine
      Zusatzregel und keine Erwachsenen-Übung als Schlüssel.
   b) Aufpasser-Steilpass: Spielform-Vorschlag, 5–8 Kinder, Ablauf nennt die nachrückenden
      Verteidiger und die Rotation; die Skizze hat ein Jugendtor, zwei Verteidiger, Aufpasser,
      Jäger und zwei Flitzer; Material sagt „Jugendtor“, nicht „Minitor“.
   c) Die Übungsansicht zeigt „Provokationsregeln“ mit allen Regeln der Übung. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const s = await h.starten({ breite: 390, hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: custom }) });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof PROVOKATIONEN === "undefined") return { fehlt: true };
    await loadKader(); await warte(300);
    const alle = tpAllForms(), out = {};
    const keys = Object.keys(PROVOKATIONEN);
    out.zahl = keys.length;
    out.unbekannt = keys.filter(k => !alle.some(f => f && f.name === k));
    out.anzahlFalsch = keys.filter(k => !Array.isArray(PROVOKATIONEN[k]) || PROVOKATIONEN[k].length < 1 || PROVOKATIONEN[k].length > 3);
    out.untauglich = keys.filter(k => { const f = alle.find(x => x && x.name === k); return f && typeof tpStationTauglich === "function" && !tpStationTauglich(f); });
    const i = alle.findIndex(f => f.name === "Aufpasser-Steilpass"), f = alle[i];
    out.art = (typeof _tpArtVorschlag === "function") ? _tpArtVorschlag(f) : "";
    out.spieler = f.spieler;
    out.ablauf = f.ablauf;
    const spec = TF_SKIZZEN[f.id] || {};
    out.tor = (spec.tor || []).map(t => t[4] || "");
    out.rot = (spec.s || []).filter(x => x[2] === "r").length;
    out.gruen = (spec.s || []).filter(x => x[2] === "g").length;
    tpShowExercise(i); await warte(300);
    const m = document.getElementById("uebung-modal");
    out.material = (m.textContent.match(/Dafür brauchst du:[^\n]*?(?=Nicht im|Groß zeigen|$)/) || [""])[0];
    const box = m.querySelector(".ue-provokation");
    out.regelnAngezeigt = box ? box.querySelectorAll("li").length : 0;
    out.regelnSoll = PROVOKATIONEN[f.name].length;
    return out;
  });
  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v715 Aufpasser-Steilpass als Spielform, Provokationsregeln";
  if (r.fehlt) return h.ergebnis(titel, false, ["PROVOKATIONEN fehlt"]);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  if (r.unbekannt.length) probleme.push("a) Schlüssel ohne Übung: " + r.unbekannt.join(", "));
  else if (r.anzahlFalsch.length) probleme.push("a) nicht 1–3 Regeln: " + r.anzahlFalsch.join(", "));
  else if (r.untauglich.length) probleme.push("a) Zusatzregel/Erwachsene als Schlüssel: " + r.untauglich.join(", "));
  else zeilen.push(`a) ${r.zahl} Übungen mit Provokationsregeln, alle Namen gefunden`);
  if (r.art !== "spiel" || r.spieler !== "5–8") probleme.push(`b) Art „${r.art}“, Spieler „${r.spieler}“`);
  else if (!/alle 3 Sekunden/i.test(r.ablauf) || !/Rotation/.test(r.ablauf)) probleme.push("b) Ablauf ohne Nachrücken/Rotation");
  else if (r.tor.join() !== "j" || r.rot !== 2 || r.gruen !== 4) probleme.push(`b) Skizze: Tore ${JSON.stringify(r.tor)}, rot ${r.rot}, grün ${r.gruen}`);
  else if (!/Jugendtor/.test(r.material) || /Minitor/.test(r.material)) probleme.push("b) Material: " + r.material);
  else zeilen.push("b) Spielform 5–8, Jugendtor, 4 Angreifer gegen 2 wartende Verteidiger, Material „Jugendtor“");
  if (r.regelnAngezeigt !== r.regelnSoll) probleme.push(`c) ${r.regelnAngezeigt} von ${r.regelnSoll} Regeln in der Übungsansicht`);
  else zeilen.push(`c) Übungsansicht zeigt ${r.regelnAngezeigt} Provokationsregeln`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
