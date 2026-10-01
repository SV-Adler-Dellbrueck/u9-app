/* v710 · Ordnung (Optik-Prüfung 01.10.2026, Befunde „niedrig“ zu Anordnung und Benennung)
   a) Kachelraster: bei ungerader Zahl keine volle Breite für die letzte Kachel (wirkte wie die
      Hauptaktion); Kabine: „Kompliment schenken“ steht nicht mehr allein neben einer Lücke
   b) Abschnitts- und Feldüberschriften ohne Versalien (gemessen an „Übung“ im Trainingsplan)
   c) Ein Name je Sache: der Spieltag heißt im Unterreiter nicht mehr „Match“
   d) Texte: „Einladung für die eure Familie“, „So Sonntag“, doppelte Ortssymbole, Weg zur
      Ruhezeit für Eltern, Push-Karte ohne Knopf erklärt sich */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(() => {
    const o = {};
    const d = document.createElement("div");
    d.innerHTML = kTiles([{ fn: "a", emo: "1", label: "A" }, { fn: "b", emo: "2", label: "B" }, { fn: "c", emo: "3", label: "C" }], "#000");
    document.body.appendChild(d);
    o.voll = [...d.querySelectorAll("button")].map(b => b.style.gridColumn || "");
    const w = Math.round(d.querySelectorAll("button")[2].getBoundingClientRect().width), w0 = Math.round(d.querySelectorAll("button")[0].getBoundingClientRect().width);
    o.breite = [w0, w];
    const f = document.createElement("div"); f.className = "tp-feld"; f.innerHTML = "<label>Übung</label>"; document.body.appendChild(f);
    o.tt = getComputedStyle(f.querySelector("label")).textTransform;
    o.match = JSON.stringify(typeof NAV_SECTIONS !== "undefined" ? NAV_SECTIONS : "").includes('"Match"');
    o.pin = mapsAnchor("Sportplatz", null, true).includes("📍");
    o.pinStd = mapsAnchor("Sportplatz").includes("📍");
    o.rufe = typeof rufeRuhezeitText === "function" ? rufeRuhezeitText(true, false, { von: "21:30", bis: "07:00" }) : "";
    return o;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.voll.some(x => /1/.test(x)) || Math.abs(r.breite[0] - r.breite[1]) > 2) probleme.push(`a) letzte Kachel breit: ${JSON.stringify(r)}`);
  if (r.tt !== "none") probleme.push("b) Feldüberschrift „Übung“ noch in Versalien");
  if (r.pin || !r.pinStd) probleme.push("d) mapsAnchor ohnePin wirkt nicht");
  if (/Einstellungen → Benachrichtigungen/.test(r.rufe) && !/Trainerteam kontaktieren/.test(r.rufe)) probleme.push("d) Rufe nennen Eltern einen Weg, den es nicht gibt: " + r.rufe);
  const lies = p => fs.readFileSync(path.join(h.REPO, p), "utf8");
  const views = lies("views.js"), kab = lies("md-kabine.js"), ep = lies("md-eltern-portal.js"), core = lies("core.js");
  if (/label:"Match"/.test(views)) probleme.push("c) Unterreiter heißt noch „Match“");
  if (!/"Kompliment schenken","rgba\(16,185,129,\.52\)","rgba\(5,150,105,\.32\)",true\)/.test(kab)) probleme.push("a) Kabine: „Kompliment schenken“ steht allein");
  if (/Einladung für die \$\{fuer\}/.test(ep)) probleme.push("d) „Einladung für die eure Familie“");
  if (/\$\{wtag\} \$\{d\.toLocaleDateString\("de-DE",\{weekday:"long"/.test(ep)) probleme.push("d) Termin-Fenster: Wochentag doppelt");
  if (!/pushSupported\(\)\)\{ const ios=/.test(core)) probleme.push("d) Push-Karte ohne Erklärung, wenn das Gerät keine Benachrichtigungen kann");
  zeilen.push(`a) Kacheln ${r.breite.join("/")} px · b) ${r.tt} · d) Rufe: ${r.rufe.slice(-60)}`);
  return h.ergebnis("v710 Ordnung: Kachelraster, Versalien, Namen, Texte", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
