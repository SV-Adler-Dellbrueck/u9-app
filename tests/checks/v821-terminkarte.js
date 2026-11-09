/* v821 · Terminkarte: der nächste Termin als farbiges Band – bei Eltern und Trainern dieselbe Bildsprache.
   Bis v820 war der nächste Termin auf beiden Startseiten eine Textkarte. Jetzt: Datumsblock, Countdown,
   Uhrzeit, Wetter als Symbol und rechts ein Zeichen (Trainer: Ring, Eltern: Stand der Rückmeldung).

   a) Trainer: die erste Zeile von „Diese Woche“ trägt das Band; der Ring nennt dieselbe Zahl wie das
      erste Etikett darunter (eine Quelle, zwei Darstellungen); die zweite Zeile bleibt eine normale Zeile.
   b) Trainer: Countdown „Morgen“, Datum und Uhrzeit stehen als Text da; Schrift im Band mind. 4,5:1.
   c) Eltern: die Karte „Nächster Termin“ trägt das Band; das Zeichen rechts folgt der Rückmeldung
      (offen → „Rückmeldung fehlt“, zugesagt → „Zusage“) und hat einen Namen für Vorleseprogramme.
   d) Die Zusage-Knöpfe und die Zeile mit Datum und Ende stehen weiter in der Karte. */
"use strict";
module.exports = async function (h) {
  const titel = "v821 Terminkarte: nächster Termin als Band mit Ring (Trainer) und Rückmeldung (Eltern)";
  const probleme = [], zeilen = [];
  const termine = [
    { id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", ort: "Sportplatz", trainer_status: {} },
    { id: 2, datum: h.tagePlus(4), uhrzeit: "10:00", typ: "spiel", gegner: "Gegner FC", ort: "Auswärts", trainer_status: {} }];
  // Trainer
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, rueckmeldungen: [{ termin_id: 1, status: "abgesagt" }, { termin_id: 1, status: "krank" }], nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const rt = await s.page.evaluate(async (kontrast) => {
    eval(kontrast);
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof terminKarteBand !== "function") return { alt: true };
    await loadKader(); go("home"); await w(2000);
    const zeilen = [...document.querySelectorAll("#home-woche .woche-zeile")];
    const band = zeilen[0] && zeilen[0].querySelector(".tk-band");
    if (!band) return { ohneBand: true, zeilen: zeilen.length };
    const ring = band.querySelector(".tk-ring");
    const chip = [...zeilen[0].querySelectorAll("span")].map(e => e.textContent.trim()).find(t => /^\d+ dabei$/.test(t)) || "";
    const texte = [...band.querySelectorAll(".tk-countdown, .tk-titel")];
    return { zeilen: zeilen.length, zweiteMitBand: !!(zeilen[1] && zeilen[1].querySelector(".tk-band")),
      ring: ring ? ring.getAttribute("aria-label") : null, ringZahl: ring ? ring.textContent.replace(/\s+/g, " ").trim() : "", chip,
      countdown: band.querySelector(".tk-countdown").textContent.trim(), text: band.innerText.replace(/\s+/g, " "),
      kontrast: (() => {   // weiße Schrift gegen Grundfarbe UND beide Enden des Verlaufs – der Helfer kennt nur die Grundfarbe
        const cs = getComputedStyle(band), farben = [cs.backgroundColor].concat(cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []);
        const lum = t => { const v = t.match(/\d+/g).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
        const schrift = lum(getComputedStyle(texte[0]).color);
        return Math.min(...farben.map(f => (Math.max(schrift, lum(f)) + .05) / (Math.min(schrift, lum(f)) + .05)), ...texte.map(e => window.__kontrastVon(e)));
      })(), farben: getComputedStyle(band).backgroundImage.match(/rgba?\([^)]+\)/g), breite: Math.round(band.getBoundingClientRect().width), ueber: document.documentElement.scrollWidth > innerWidth + 1 };
  }, h.kontrastHelfer);
  const ft = s.fehler(); await s.schliessen();
  if (rt.alt) return h.ergebnis(titel, false, ["keine Terminkarte (Stand vor v821)"]);
  // Eltern
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const eltern = async rueck => {
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }], termine, rueckmeldungen: rueck }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4000);
    const r = await e.page.evaluate(() => {
      const k = document.getElementById("termin-card"), band = k && k.querySelector(".tk-band"); if (!band) return { ohneBand: true };
      const z = band.querySelector(".tk-zeichen");
      return { zeichen: z ? z.getAttribute("aria-label") : null, countdown: band.querySelector(".tk-countdown").textContent.trim(), text: band.innerText.replace(/\s+/g, " "),
        knoepfe: [...k.querySelectorAll("button")].filter(b => /elternRsvp/.test(b.getAttribute("onclick") || "") && b.getBoundingClientRect().height >= 44).length,
        zeitzeile: /17:00–18:15 Uhr/.test(k.innerText), ueber: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const f = e.fehler(); await e.schliessen(); return { r, f };
  };
  const offen = await eltern([]), zu = await eltern([{ termin_id: 1, spieler_id: 1, status: "zugesagt" }]);
  const f = [].concat(ft, offen.f, zu.f); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));

  if (rt.ohneBand) probleme.push("a) erste Zeile von „Diese Woche“ ohne Band");
  else {
    if (rt.zeilen !== 2 || rt.zweiteMitBand) probleme.push(`a) ${rt.zeilen} Zeilen, zweite mit Band: ${rt.zweiteMitBand}`);
    const zahl = (rt.chip.match(/^\d+/) || [""])[0];
    if (!rt.ring || !zahl || rt.ring.indexOf(zahl + " von 15") !== 0) probleme.push(`a) Ring „${rt.ring}“ passt nicht zum Etikett „${rt.chip}“`);
    if (rt.countdown !== "Morgen" || !/17:00 Uhr/.test(rt.text) || !/Training/.test(rt.text)) probleme.push(`b) Band-Text: „${rt.text}“`);
    if (!(rt.kontrast >= 4.5)) probleme.push("b) Kontrast im Band " + (rt.kontrast || 0).toFixed(2) + ":1");
    if (rt.ueber) probleme.push("b) Seite läuft seitlich über");
  }
  for (const [name, x, soll] of [["offen", offen.r, /fehlt/], ["zugesagt", zu.r, /Zusage/]]) {
    if (x.ohneBand) { probleme.push(`c) Eltern (${name}): Karte ohne Band`); continue; }
    if (!x.zeichen || !soll.test(x.zeichen)) probleme.push(`c) Eltern (${name}): Zeichen „${x.zeichen}“`);
    if (x.countdown !== "Morgen" || !/Nächster Termin/.test(x.text)) probleme.push(`c) Eltern (${name}): Band-Text „${x.text}“`);
    if (x.knoepfe < 3 || !x.zeitzeile) probleme.push(`d) Eltern (${name}): ${x.knoepfe} Zusage-Knöpfe, Zeitzeile ${x.zeitzeile}`);
    if (x.ueber) probleme.push(`d) Eltern (${name}): Seite läuft seitlich über`);
  }
  zeilen.push(`Trainer: Ring „${rt.ring}“, Etikett „${rt.chip}“, Kontrast ${(rt.kontrast || 0).toFixed(1)}:1 · Eltern: offen → „${offen.r.zeichen}“, zugesagt → „${zu.r.zeichen}“`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
