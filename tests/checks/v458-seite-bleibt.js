/* v458 – „wenn ich die Seite durch Nach-unten-Streifen aktualisiere, komme ich immer
   wieder auf die Startseite". Zwei Dinge: der Browser-eigene Pull-to-Refresh ist aus
   (die App hat ihren eigenen, der die Seite haelt), und nach einem echten Neuladen landet
   man wieder dort, wo man war. Dazu: ein Neuladen zaehlt im Nutzungslog nicht als Besuch. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const vor = await s.page.evaluate(() => {
    go("anwesenheit");
    return { overscroll: getComputedStyle(document.body).overscrollBehaviorY, gemerkt: sessionStorage.getItem("adler_letzte_seite"), sektion: curSection };
  });
  /* Erst den Puffer der ALTEN Seite leeren: beim Entladen schickt die App ihn per
     `keepalive` noch los (visibilitychange) – dieser Eintrag stammt vom echten Besuch
     oben, nicht vom Wiederherstellen, und machte die Pruefung sonst zufaellig rot. */
  /* v890: statt fester 200 ms auf genau den Schreibvorgang warten, den der Puffer auslöst (Obergrenze 5 s) */
  const log = () => s.gesendet.filter(g => /\/nutzung_log$/.test(g.pfad)).length;
  const bis = async (f, n) => { for (let i = 0; i < (n || 100) && !f(); i++) await new Promise(x => setTimeout(x, 50)); return f(); };
  let l0 = log();
  const imPuffer = await s.page.evaluate(() => { const n = _nutzungPuffer.length; nutzungFlush(); return n; });
  if (imPuffer) await bis(() => log() > l0);
  s.gesendet.length = 0;
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForFunction(() => typeof curSection !== "undefined" && curSection === "anwesenheit" && typeof nutzungFlush === "function", null, { timeout: 8000 }).catch(() => {});
  l0 = log();
  const imPuffer2 = await s.page.evaluate(() => { window.sbToken = () => "attrappe"; window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" }); const n = _nutzungPuffer.length; nutzungFlush(); return n; });
  if (imPuffer2) await bis(() => log() > l0);
  const nach = await s.page.evaluate(() => ({ sektion: curSection, aktivNav: (document.querySelector("#main-nav .nb.active") || {}).id || "", sichtbar: [...document.querySelectorAll('[id^="train-sub-"]')].filter(e => getComputedStyle(e).display !== "none").map(e => e.id) }));
  const logs = s.gesendet.filter(g => /\/nutzung_log$/.test(g.pfad)).flatMap(g => [].concat(g.body)).map(r => r.ereignis + ":" + r.ziel);
  const fehler = s.fehler(); await s.schliessen();
  if (vor.overscroll !== "contain") probleme.push(`overscroll-behavior-y ist „${vor.overscroll}“, erwartet contain (Browser-Refresh bleibt sonst an)`);
  if (vor.gemerkt !== "anwesenheit") probleme.push("Seite wird nicht gemerkt: " + vor.gemerkt);
  if (nach.sektion !== "anwesenheit") probleme.push(`nach dem Neuladen auf „${nach.sektion}“ statt anwesenheit`);
  if (nach.aktivNav !== "nb-training") probleme.push("Navigation zeigt nicht den Trainings-Reiter: " + nach.aktivNav);
  if (logs.includes("bereich:anwesenheit")) probleme.push("das Neuladen wurde als Besuch geloggt: " + JSON.stringify(logs));
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`overscroll ${vor.overscroll} · gemerkt ${vor.gemerkt} · nach Neuladen ${nach.sektion} (${nach.aktivNav}) · Log ${JSON.stringify(logs)}`);
  return h.ergebnis("Neuladen: Seite bleibt, Browser-Pull-to-Refresh aus, kein Besuch im Log", !probleme.length, zeilen.concat(probleme));
};
