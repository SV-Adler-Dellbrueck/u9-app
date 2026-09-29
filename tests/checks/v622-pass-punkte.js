/* v622 · PO (Bildschirmfoto Übung „3 gegen 3 auf vier Minitore – Pass zählt doppelt“): „Alle
   angreifenden Spieler müssen den Ball berührt haben durch einen Pass. Für jedes Tor, das nach
   einem direkten Passspiel erfolgt, gibt es zwei Punkte. Für jedes Tor nach einem Doppelpass
   drei Punkte.“ Rückfrage: 1 Punkt für ein gültiges Tor; für 2 Punkte muss unmittelbar vor dem
   Tor ein Pass gespielt worden sein – keine Direktabnahme nötig.

   a) Die Übung in uebungen/bibliothek.json trägt die Regel in Kurztext und Ablauf; der Name
      bleibt (Pläne und Bewertungen hängen am Namen, v586).
   b) Der Stand ist hochgesetzt – sonst holt der Abgleich die Datei nicht (v512).
   c) Die Datei besteht die Prüfung, die jede Eingabe eines Trainers besteht (_euPruefung).
   d) Die Skizze bleibt unverändert – sie gehört zur Lehrgangsabgabe LF4 (v554). */
"use strict";
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen", "bibliothek.json"), "utf8"));
  const u = (bib.uebungen || []).find(x => x.name === "3 gegen 3 auf vier Minitore – Pass zählt doppelt");
  if (!u) return h.ergebnis("v622 Pass-Punkte", false, ["a) Übung nicht gefunden – Name geändert?"]);
  if (!/alle drei Angreifer/.test(u.kurz) || !/2/.test(u.kurz) || !/Doppelpass 3/.test(u.kurz)) probleme.push(`a) Kurztext ohne die Regel: „${u.kurz}“`);
  for (const [re, was] of [[/alle drei Angreifer den Ball durch einen Pass/, "alle drei am Ball"], [/1 Punkt/, "1 Punkt"], [/2 Punkte, wenn unmittelbar vor dem Tor ein Pass/, "2 Punkte nach Pass"],
    [/keine Direktabnahme/, "keine Direktabnahme nötig"], [/3 Punkte, wenn das Tor nach einem Doppelpass/, "3 Punkte nach Doppelpass"]])
    if (!re.test(u.ablauf)) probleme.push(`a) Ablauf ohne „${was}“`);
  if (/zählt doppelt, wenn davor ein Pass/.test(u.ablauf)) probleme.push("a) die alte Regel steht noch im Ablauf");
  if (String(bib.stand) <= "2026-09-24-1") probleme.push(`b) Stand „${bib.stand}“ nicht hochgesetzt`);
  if (!u.skizze || !(u.skizze.tx || []).some(t => /Tor nach Pass zählt doppelt/.test(t[2]))) probleme.push("d) die Skizze wurde verändert");
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const c = await s.page.evaluate(txt => typeof _euPruefung === "function" ? _euPruefung(txt).fehler : ["_euPruefung fehlt"], JSON.stringify(bib));
  await s.schliessen();
  if (c.length) probleme.push("c) die Datei besteht die Prüfung nicht: " + c.slice(0, 3).join(" · "));
  zeilen.push(`Stand ${bib.stand} · „${u.kurz}“ · Prüfung ${c.length ? "rot" : "grün"}`);
  return h.ergebnis("v622 Pass-Punkte: alle am Ball, Pass 2, Doppelpass 3", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
