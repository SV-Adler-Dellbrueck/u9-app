/* v629 · PO: „Feldgröße 25x20m. Was ist Länge und was ist Breite?“ – Kachel „25 m Tor zu Tor“.

   Befund: Die Übung „3 gegen 3 – Dreieck (Grundform)“ stellte das Feld „quer, breiter als tief“
   auf, ihre Skizze hatte die Minitore oben und unten auf der langen Seite – also 25 m entlang der
   Torlinie. Üblich und gemeint ist Länge × Breite: 25 m von Tor zu Tor.

   a) Die Übung sagt „25 m von Tor zu Tor“ und nicht mehr „quer“; der Bibliotheks-Stand ist hoch.
   b) In ihrer Skizze stehen die vier Minitore hochkant an den Schmalseiten (links und rechts).
   c) Die Feldgrößen-Tabelle am Spieltag sagt, welche Zahl Länge und welche Breite ist. */
"use strict";
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const u = bib.uebungen.find(x => x.name === "3 gegen 3 – Dreieck (Grundform)");
  if (!u) probleme.push("a) Übung fehlt");
  else {
    if (/quer|breiter als tief/.test(u.ablauf)) probleme.push("a) Ablauf stellt das Feld noch quer");
    if (!/25 m von Tor zu Tor/.test(u.ablauf)) probleme.push("a) Ablauf nennt die Länge nicht");
    const tore = (u.skizze && u.skizze.tor) || [];
    const schmal = tore.filter(t => t[2] === "v" && (t[0] < 30 || t[0] > 250));
    if (tore.length !== 4 || schmal.length !== 4) probleme.push("b) Tore nicht an den Schmalseiten: " + JSON.stringify(tore));
    zeilen.push(`Tore ${tore.map(t => t[0] + "/" + t[1] + t[2]).join(" ")}`);
  }
  if (String(bib.stand) <= "2026-09-25-2") probleme.push(`a) Bibliotheks-Stand „${bib.stand}“ nicht hochgesetzt`);

  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    for (let i = 0; i < 60 && typeof wissenAuf !== "function"; i++) await new Promise(x => setTimeout(x, 50));
    if (typeof _wsTabellen !== "function") return { fehlt: true };
    const d = document.createElement("div"); d.innerHTML = _wsTabellen();
    return { text: d.textContent.replace(/\s+/g, " ") };
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) probleme.push("c) _wsTabellen fehlt");
  else {
    if (!/Feldgröße \(Länge × Breite\)/.test(r.text)) probleme.push("c) Spaltenkopf ohne „Länge × Breite“");
    if (!/Länge von Tor zu Tor, die zweite die Breite entlang der Torlinie/.test(r.text)) probleme.push("c) Erklärsatz fehlt");
    if (!/ca\. 25 × 20 m/.test(r.text)) probleme.push("c) Maß 25 × 20 m verschwunden");
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v629 Feld 25 × 20 m: 25 m von Tor zu Tor, überall gleich", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
