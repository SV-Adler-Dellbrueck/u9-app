/* v629 · PO: „Die Animation in der Eltern-App ruckelt etwas.“

   Ursache (Mitschnitt, compositeFailed 64): Flug und Landen lagen beide als transform auf dem
   Wappen. Zwei transform-Animationen auf einem Element gibt der Browser nicht an die Grafik ab –
   beide liefen im Hauptfaden, der in diesen Sekunden die App lädt. Dazu wanderte der Schimmer per
   background-position (ebenfalls Hauptfaden), und die Überblendung des ersten Seitenwechsels
   fror für ihren Schnappschuss ein Bild ein.

   a) In allen drei Apps animiert je Element höchstens eine Animation transform.
   b) Keine Auftakt-Animation bewegt Eigenschaften, die nicht auf der Grafik laufen
      (nur transform und opacity).
   c) Solange der Auftakt steht, startet go() keine Überblendung; danach wieder. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), warten: 300, intro: true });
  const messen = async pfad => {
    await s.page.emulateMedia({ reducedMotion: "no-preference" });
    await s.page.evaluate(() => { try { sessionStorage.removeItem("adler-intro"); } catch (e) {} });
    await s.page.goto("https://app.test" + pfad, { waitUntil: "commit" });
    await s.page.waitForSelector("#adler-intro", { state: "attached", timeout: 1500 }).catch(() => {});
    return s.page.evaluate(() => {
      const d = document.getElementById("adler-intro"); if (!d) return null;
      const anims = d.getAnimations({ subtree: true });
      const jeZiel = new Map(), fremd = [];
      for (const a of anims) {
        const e = a.effect, ziel = e.target ? (e.pseudoElement ? e.target.className + e.pseudoElement : e.target) : "?";
        const props = new Set(); e.getKeyframes().forEach(k => Object.keys(k).forEach(p => { if (!["offset", "easing", "composite", "computedOffset"].includes(p)) props.add(p); }));
        if (props.has("transform")) jeZiel.set(ziel, (jeZiel.get(ziel) || []).concat(a.animationName));
        [...props].filter(p => p !== "transform" && p !== "opacity").forEach(p => fremd.push(a.animationName + ":" + p));
      }
      return { zahl: anims.length, doppelt: [...jeZiel].filter(([, n]) => n.length > 1).map(([z, n]) => (typeof z === "string" ? z : (z.className || z.tagName)) + " ← " + n.join("+")), fremd };
    });
  };
  for (const pfad of ["/trainer/index.html", "/eltern/index.html", "/kinder/index.html"]) {
    const r = await messen(pfad);
    if (!r) { probleme.push(`${pfad}: kein Auftakt`); continue; }
    if (r.doppelt.length) probleme.push(`a) ${pfad}: mehrere transform-Animationen auf einem Element: ${r.doppelt.join(" · ")}`);
    if (r.fremd.length) probleme.push(`b) ${pfad}: nicht auf der Grafik: ${[...new Set(r.fremd)].join(", ")}`);
    zeilen.push(`${pfad.split("/")[1]}: ${r.zahl} Animationen, doppelt ${r.doppelt.length}, fremd ${r.fremd.length}`);
  }
  // c) Überblendung
  await s.page.evaluate(() => { try { sessionStorage.removeItem("adler-intro"); } catch (e) {} });
  await s.page.goto("https://app.test/trainer/index.html", { waitUntil: "commit" });
  await s.page.waitForSelector("#adler-intro", { state: "attached", timeout: 1500 }).catch(() => {});
  await s.page.waitForFunction(() => typeof go === "function" && typeof SECS !== "undefined", null, { timeout: 8000 }).catch(() => {});
  const c = await s.page.evaluate(() => {
    if (typeof go !== "function") return { fehlt: true };
    let n = 0; const orig = document.startViewTransition && document.startViewTransition.bind(document);
    document.startViewTransition = f => { n++; f && f(); return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() }; };
    const key = Object.keys(SECS)[0];
    const mitIntro = !!document.getElementById("adler-intro");
    try { go(key); } catch (e) {}
    const waehrend = n;
    document.getElementById("adler-intro")?.remove();
    try { go(key); } catch (e) {}
    if (orig) document.startViewTransition = orig;
    return { mitIntro, waehrend, danach: n - waehrend };
  });
  if (c.fehlt) probleme.push("c) go() fehlt");
  else {
    if (!c.mitIntro) probleme.push("c) Auftakt war beim Seitenwechsel schon weg – Prüfung nicht aussagekräftig");
    if (c.waehrend) probleme.push(`c) ${c.waehrend}× Überblendung während des Auftakts`);
    if (c.danach !== 1) probleme.push(`c) nach dem Auftakt ${c.danach}× Überblendung statt 1×`);
    zeilen.push(`Überblendung während Auftakt ${c.waehrend}, danach ${c.danach}`);
  }
  const fe = s.fehler();
  await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v629 Auftakt flüssig: Bewegung auf der Grafik, keine Überblendung mittendrin", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
