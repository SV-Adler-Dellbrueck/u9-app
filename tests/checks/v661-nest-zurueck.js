/* v661 · Adler Nest: Weg zurück in die Eltern-App
   PO 28.09. (Bildschirmfoto der installierten Eltern-App): „wie komme ich aus der Ansicht vom
   Adler Nest wieder zurück in der Eltern-App?" Im App-Fenster gibt es keine Browser-Knöpfe.
   a) Aus der App geöffnet (&von=app): oben „← Zurück zur App“, mindestens 44 px – auch wenn kein
      Heft veröffentlicht ist
   b) Der Knopf führt in den Eltern-Bereich (?portal)
   c) Über einen geteilten Link (ohne von=app) steht kein Knopf da
   d) Die Eltern-App öffnet das Nest mit von=app
      (v733: das Nest liest man seit den Ausgaben IN der App – nestOpen statt ?heft-Link. a–c gelten weiter
      für alte Links, die jetzt den Hinweis „Das Adler Nest lesen Eltern in der App“ zeigen.) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const attrappe = () => h.supabaseAttrappe({ funktionen: { "stadionheft-view": { published: false } } });

  const s = await h.starten({ start: "/eltern/index.html?heft&von=app", angemeldet: false, warten: 1500, supabase: attrappe() });
  const a = await s.page.evaluate(() => {
    const b = document.getElementById("heft-zurueck");
    return { da: !!b, hoehe: b ? Math.round(b.getBoundingClientRect().height) : 0, text: b ? b.textContent.trim() : "",
      leer: /kein\s+Adler Nest/.test(document.body.textContent) };
  });
  if (a.da) { await s.page.click("#heft-zurueck"); await s.page.waitForTimeout(800); }
  const ziel = s.page.url();
  const f = s.fehler();
  await s.schliessen();
  if (!a.da) probleme.push("a) Kein Knopf „Zurück zur App“ (Seite ohne veröffentlichtes Heft)");
  if (a.da && a.hoehe < 44) probleme.push(`a) Knopf nur ${a.hoehe} px hoch`);
  if (!/\?portal/.test(ziel)) probleme.push("b) Knopf führt nicht in den Eltern-Bereich: " + ziel);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a/b) Leerzustand ${a.leer ? "ja" : "nein"} · Knopf „${a.text}“ ${a.hoehe} px · führt zu ${ziel.replace(/^https:\/\/app\.test/, "")}`);

  const s2 = await h.starten({ start: "/eltern/index.html?heft", angemeldet: false, warten: 1500, supabase: attrappe() });
  const c = await s2.page.evaluate(() => !!document.getElementById("heft-zurueck"));
  await s2.schliessen();
  if (c) probleme.push("c) Geteilter Link ohne von=app zeigt den Knopf");
  zeilen.push(`c) geteilter Link: Knopf ${c ? "da" : "nicht da"}`);

  const portal = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  const alt = (portal.match(/\?heft/g) || []).length, neu = (portal.match(/nestOpen\(\)/g) || []).length;
  if (alt || neu < 2) probleme.push(`d) Eltern-App: ${alt} alte ?heft-Links, ${neu} Einstiege über nestOpen()`);
  zeilen.push(`d) Eltern-App öffnet das Nest ${neu}× in der App (nestOpen), ${alt} alte ?heft-Links`);
  return h.ergebnis("v661 Adler Nest: Zurück zur App", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
