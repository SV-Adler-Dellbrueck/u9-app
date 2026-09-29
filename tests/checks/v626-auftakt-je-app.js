/* v626 · PO: „Kann sich das Logo beim Start auch drehen und reinfliegen … oder andere Ideen, die es
   einzigartig machen?“ – Kachel: „alle drei Varianten für die jeweiligen drei Apps“.

   a) Trainer = Schuss, Eltern = Münzwurf (mit Lichtschimmer), Kabine = Adlerflug (mit Federn) –
      jede App ihre eigene Flug-Animation, keine teilt sie.
   b) Federn nur in der Kabine, Schimmer nur bei den Eltern.
   c) „Bewegung reduzieren“: kein Flug, keine Federn, kein Schimmer.
   Dauer, Tipp zum Überspringen und Sonderrouten prüft weiter v617. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), warten: 300, intro: true });
  const messen = async (pfad, ruhig) => {
    await s.page.emulateMedia({ reducedMotion: ruhig ? "reduce" : "no-preference" });
    await s.page.evaluate(() => { try { sessionStorage.removeItem("adler-intro"); } catch (e) {} });
    await s.page.goto("https://app.test" + pfad, { waitUntil: "commit" });
    await s.page.waitForSelector("#adler-intro", { state: "attached", timeout: 1500 }).catch(() => {});
    return s.page.evaluate(() => {
      const d = document.getElementById("adler-intro"); if (!d) return null;
      const feder = [...d.querySelectorAll(".ai-feder")];
      return { klasse: d.className, flug: getComputedStyle(d.querySelector("img")).animationName,
        federn: feder.length, federSichtbar: feder.filter(f => getComputedStyle(f).display !== "none").length,
        glanz: !!d.querySelector(".ai-glanz"), glanzAnim: d.querySelector(".ai-glanz") ? getComputedStyle(d.querySelector(".ai-glanz")).animationName : "" };
    });
  };
  const soll = { "/trainer/index.html": ["ai-schuss", "adlerIntroFlugSchuss"], "/eltern/index.html": ["ai-muenze", "adlerIntroFlugMuenze"], "/kinder/index.html": ["ai-adler", "adlerIntroFlugAdler"] };
  const flüge = new Set();
  for (const [pfad, [kl, anim]] of Object.entries(soll)) {
    const r = await messen(pfad, false);
    if (!r) { probleme.push(`a) ${pfad}: kein Auftakt`); continue; }
    if (r.klasse !== kl) probleme.push(`a) ${pfad}: Variante ${r.klasse} statt ${kl}`);
    if (!r.flug.includes(anim)) probleme.push(`a) ${pfad}: Flug ${r.flug} statt ${anim}`);
    flüge.add(r.flug.split(",")[0]);
    const kabine = kl === "ai-adler", eltern = kl === "ai-muenze";
    if (kabine !== (r.federn > 0)) probleme.push(`b) ${pfad}: ${r.federn} Federn`);
    if (eltern !== r.glanz) probleme.push(`b) ${pfad}: Schimmer ${r.glanz ? "da" : "fehlt"}`);
    zeilen.push(`${pfad.split("/")[1]}: ${r.flug.split(",")[0]}${r.federn ? `, ${r.federn} Federn` : ""}${r.glanz ? ", Schimmer" : ""}`);
  }
  if (flüge.size !== 3) probleme.push(`a) nur ${flüge.size} verschiedene Flüge`);
  for (const pfad of ["/kinder/index.html", "/eltern/index.html"]) {
    const r = await messen(pfad, true);
    if (!r) continue;
    if (/adlerIntroFlug/.test(r.flug)) probleme.push(`c) ${pfad}: fliegt trotz „Bewegung reduzieren“`);
    if (r.federSichtbar) probleme.push(`c) ${pfad}: ${r.federSichtbar} Federn trotz „Bewegung reduzieren“`);
    if (r.glanz && r.glanzAnim !== "none") probleme.push(`c) ${pfad}: Schimmer läuft trotz „Bewegung reduzieren“`);
  }
  const fe = s.fehler();
  await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v626 Auftakt je App: Schuss, Münzwurf, Adlerflug", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
