/* v453 – Nutzungslog: Bereiche, Kacheln und Aktionen werden gebuendelt an nutzung_log
   geschickt – nur Ereignis, Ziel, Rolle, Version. Geprueft: was ankommt (und was NICHT:
   keine Kindernamen, kein Eintrag ohne Anmeldung), Doppeltipp-Filter, Eltern-Rolle. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await s.page.evaluate(async () => {
    await loadKader();
    go("anwesenheit"); go("anwesenheit");           // Doppeltipp: nur einer zaehlt
    kachelOpen("training");
    kachelRun("go", "planung");                       // aktion + bereich
    nutzungFlush();
  });
  await s.page.waitForTimeout(300);
  const fehler = s.fehler(); await s.schliessen();
  const posts = s.gesendet.filter(g => /\/nutzung_log$/.test(g.pfad) && g.methode === "POST");
  const rows = posts.flatMap(g => [].concat(g.body));
  const kurz = rows.map(r => `${r.ereignis}:${r.ziel}`);
  /* v553: Die Kachel-Ebene ist eine Seite geworden. `kachelOpen` navigiert nur noch und
     schreibt keinen eigenen Eintrag mehr – `go()` protokolliert denselben Tipp gleich
     darauf als Bereich. Zwei Zeilen fuer einen Tipp haetten die Auswertung genau dort
     verzerrt, wo am haeufigsten getippt wird. */
  const soll = ["bereich:anwesenheit", "bereich:ue-training", "aktion:go:planung", "bereich:planung"];
  if (posts.length !== 1) probleme.push(`${posts.length} Schreibvorgaenge statt 1 (gebuendelt)`);
  if (JSON.stringify(kurz) !== JSON.stringify(soll)) probleme.push(`geschickt ${JSON.stringify(kurz)}, erwartet ${JSON.stringify(soll)}`);
  if (rows.some(r => r.rolle !== "trainer")) probleme.push("Rolle ist nicht trainer: " + JSON.stringify(rows.map(r => r.rolle)));
  const erlaubt = ["rolle", "ereignis", "ziel", "version"];
  rows.forEach(r => Object.keys(r).forEach(k => { if (!erlaubt.includes(k)) probleme.push("unerlaubtes Feld im Log: " + k); }));
  if (JSON.stringify(rows).includes("Kind ")) probleme.push("ein Kindername steht im Log");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Trainer: ${rows.length} Eintraege in ${posts.length} Schreibvorgang`);

  // Ohne Anmeldung: nichts schicken
  const o = await h.starten({ angemeldet: false });
  await o.page.evaluate(() => { window.sbToken = () => ""; go("anwesenheit"); nutzungFlush(); });
  await o.page.waitForTimeout(200);
  const ohne = o.gesendet.filter(g => /\/nutzung_log$/.test(g.pfad)).length; await o.schliessen();
  if (ohne) probleme.push(`ohne Anmeldung wurden ${ohne} Eintraege geschickt`);

  // Eltern: Rolle eltern, Ereignis eltern-bereich
  const e = await h.starten({ start: "/eltern/index.html", warten: 1200 });
  await e.page.evaluate(() => { if (typeof elternCatOpen === "function") { let ov = document.getElementById("el-cat-overlay"); if (!ov) { ov = document.createElement("div"); ov.id = "el-cat-overlay"; document.body.appendChild(ov); } elternCatOpen("news"); } nutzungFlush(); });
  await e.page.waitForTimeout(200);
  const er = e.gesendet.filter(g => /\/nutzung_log$/.test(g.pfad)).flatMap(g => [].concat(g.body)); await e.schliessen();
  if (!er.length || er[0].rolle !== "eltern" || er[0].ereignis !== "eltern-bereich" || er[0].ziel !== "news") probleme.push("Eltern-Eintrag: " + JSON.stringify(er));
  zeilen.push(`ohne Anmeldung: ${ohne} · Eltern: ${JSON.stringify(er.map(r => r.rolle + "/" + r.ereignis + ":" + r.ziel))}`);
  return h.ergebnis("Nutzungslog: gebuendelt, nur Ereignisse, Rolle stimmt, nichts ohne Anmeldung", !probleme.length, zeilen.concat(probleme));
};
