/* v763 · Adler Nest: PDF im A4-Format statt schmalem Handystreifen (Beschluss 20, Charles 05.10.2026)
   Das PDF ist DIN A4 hoch und füllt die Seite; das Heft wird in feste Blätter gesetzt (eigene Seitenaufteilung, damit es in jedem Browser gleich aussieht).
   a) Format: @page size A4 portrait; als PDF gedruckt A4-Blätter (595 × 842 pt), höchstens 5 Seiten, unter 5 MB; die Leseansicht bleibt bei 390 px
   b) Deckblatt füllt Blatt 1 randlos (Titelbild, Titel, Hör-Block mit QR ≥ 28 mm, drei Zeilen „Im Heft“); Fußzeile erst ab Blatt 2: „… · Seite X von Y“
   c) Teams nebeneinander (drei Spalten), Bilderstrecke 3 × 2 bei sechs Fotos und 2 × 2 bei vier, Porträt auf eigener Seite
   d) Nichts wird zerschnitten: jeder Block liegt ganz im Satzspiegel, keine Überschrift am Seitenende, keine Karte über zwei Seiten
   e) Spieltagsband nennt das Format nur einmal; die Sonderzeile ist sichtbar (liegt im Blatt)
   Die Kinder heißen „Kind A“ bis „Kind F“; Fotos sind Platzhalterbilder. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bis = new Date(Date.now() + 30 * 864e5).toISOString(), TOKEN = "cd".repeat(32);
  const wort = n => ("Wort " ).repeat(n).trim();
  const text = (n, satz) => (satz + " ").repeat(Math.ceil(n / (satz.length + 1))).slice(0, n).trim();
  const ausgabe = { id: 1, nummer: 1, termin_id: 81, status: "veroeffentlicht", schlagzeile: "Test-Schlagzeile zum Festival", audio_pfad: "1/hoeren.mp3", audio_sekunden: 75,
    anpfiff: text(181, "Anpfiff-Text für den Spieltag."), spieltag_text: text(420, "Ein Bericht über den Spieltag.") + "\n\n" + text(420, "Noch ein Absatz vom Platz."), zitat: text(97, "Ein Zitat vom Platz."),
    eltern_dank: text(119, "Danke an die Eltern-Kurve."), sonderzeile: "Gute Besserung, Kind F!", portraet_spieler_id: 5, portraet_einleitung: text(261, "Einleitung zum Porträt."),
    portraet_trainersatz: text(252, "Das sagt das Trainerteam."), training_leitfrage: text(59, "Leitfrage zum Training?"), training_text: text(38, "Trainingstext."),
    tag_lernen: "1990: " + text(320, "Zum Lernen an diesem Tag."), tag_lustig: "1987: " + text(225, "Zum Schmunzeln an diesem Tag."), kommentar: text(196, "Ein Wort vom Trainerteam."),
    teaser_spieltag: "Das Festival", teaser_portraet: "Kind E im Porträt", teaser_tag: "Ein Tag mit Geschichte", foto_ids: [1, 2, 3, 4, 5, 6] };
  const kinder = n => "ABCDEFGHIJKL".slice(0, n).split("").map((b, i) => ({ name: "Kind " + b, kapitaen: i === 0 }));
  const lesen = () => ({ ausgabe, termin: { id: 81, datum: "2026-10-03", typ: "turnier", titel: "Kinderfestival · FC Chorweiler U9", gegner: "Kinderfestival · FC Chorweiler U9", heim: false, ort: "Testplatz", uhrzeit: "10:00:00", uhrzeit_ende: "13:00:00", spielform: "funino", ergebnis: null },
    teams: [{ nr: 1, kinder: kinder(5), trainer: ["Trainer A"] }, { nr: 2, kinder: kinder(5), trainer: ["Trainer B"] }, { nr: 3, kinder: kinder(4), trainer: [] }], ergebnisse: [],
    naechster: { datum: "2026-10-10", typ: "spiel", titel: "Testspiel", heim: true, ort: "Testplatz", uhrzeit: "10:00:00", treffzeit: "09:30:00" },
    portraet: { name: "Kind E", nr: 8, position: null, adler_seit: "2024", lieblingsverein: "Testverein", vorbild: "Spieler A", weiterer_sport: "Tennis", weiterer_sport_team: "Testclub", starker_fuss: "rechts", hobby: "Lesen", kann_gut: "Dribbeln",
      saisonziel: "Zweikämpfe gewinnen", reporter: [1, 2, 3, 4].map(i => ({ frage: "Frage " + i + "?", antwort: text(110, "Eine Antwort.") })) } });
  const medien = [{ art: "audio", bucket: "heft_media", pfad: "1/hoeren.mp3" }, { art: "titelbild", bucket: "heft_media", pfad: "1/titel.svg" },
    ...[1, 2, 3, 4, 5, 6].map(i => ({ art: "galerie", bucket: "heft_media", pfad: `1/f${i}.svg` }))];
  const svg = (b, h2, farbe, t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${h2}"><rect width="100%" height="100%" fill="${farbe}"/><text x="50%" y="50%" fill="#fff" font-size="${Math.round(b / 8)}" text-anchor="middle">${t}</text></svg>`;
  const t = await h.starten({ warten: 1500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], heft_ausgabe: [ausgabe], kabine_reporter: [], portraet_verlauf: [], portraet_einreichung: [],
    heft_audio_link: [{ token: TOKEN, gueltig_bis: bis }], rpc: { heft_ausgabe_lesen: () => lesen(), heft_medien: () => medien, heft_ausgaben_liste: () => [{ id: 1, nummer: 1 }],
      heft_audio_link_neu: () => [{ token: TOKEN, gueltig_bis: bis }] } }) });
  await t.page.route(/\/storage\/v1\/object\/authenticated\//, r => { const u = r.request().url(), n = (u.match(/f(\d)\.svg/) || [])[1];
    return r.fulfill({ status: 200, contentType: "image/svg+xml", body: u.includes("titel") ? svg(1560, 2240, "#1d4ed8", "Titelbild") : svg(2400, 1800, ["#0369a1", "#15803d", "#b45309", "#7c3aed", "#be123c", "#0f766e"][(n || 1) - 1], "Foto " + n) }); });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof nestDruckVorbereiten !== "function"; i++) await w(100);
    if (typeof nestDruckVorbereiten !== "function") return { fehlt: true };
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    const out = {}, mm = v => v * 96 / 25.4;
    out.vorb = await nestDruckVorbereiten(1);
    const c = document.getElementById("nest-druck"), seiten = [...c.querySelectorAll(".nest-seite")];
    out.stil = (document.getElementById("nest-druck-stil") || {}).textContent || "";
    out.lese = (document.getElementById("nest-stil") || {}).textContent || "";
    out.seiten = seiten.map((s, i) => ({ nr: i + 1, abschnitt: s.dataset.abschnitt, breite: Math.round(s.getBoundingClientRect().width), hoch: Math.round(s.getBoundingClientRect().height), fuss: (s.querySelector(".nest-fuss") || {}).textContent || null,
      kinder: [...s.querySelector(".nest-seite-inhalt").children].map(k => k.className.split(" ")[0] || k.tagName) }));
    // d) Blöcke liegen im Satzspiegel; Überschrift nie letztes Kind
    const grenze = mm(296.6 - 18);
    out.zerschnitten = []; out.kopfAmEnde = [];
    seiten.forEach((s, i) => { if (s.classList.contains("deck") || s.querySelector(".nest-deckblatt")) return; const inh = s.querySelector(".nest-seite-inhalt"), top = inh.getBoundingClientRect().top;
      [...inh.children].forEach(k => { const b = k.getBoundingClientRect().bottom - top; if (b > grenze + 1) out.zerschnitten.push({ seite: i + 1, k: k.className, b: Math.round(b), grenze: Math.round(grenze) }); });
      const l = inh.lastElementChild; if (l && /^H[23]$/.test(l.tagName)) out.kopfAmEnde.push(i + 1); });
    // b) Deckblatt
    const deck = seiten[0], tb = deck.querySelector(".nest-titelbild"), qr = deck.querySelector(".nest-qr"), unten = deck.querySelector(".nest-unten"), db = deck.getBoundingClientRect();
    out.deck = { titelH: tb ? Math.round(tb.getBoundingClientRect().height / db.height * 100) : 0, qrMm: qr ? +(qr.getBoundingClientRect().width * 25.4 / 96).toFixed(1) : 0, imHeft: deck.querySelectorAll(".nest-imheft > div").length - 1,
      untenBis: unten ? Math.round(unten.getBoundingClientRect().bottom - db.top) : 0, deckH: Math.round(db.height), band: (deck.querySelector(".nest-deckblatt .nest-unten .nest-band") || {}).textContent || "" };
    // c) Teams, Fotos
    const tops = sel => [...c.querySelectorAll(sel)].map(e => Math.round(e.getBoundingClientRect().top));
    out.teams = tops(".nest-team"); out.fotos = tops("#nest-fotos button");
    const por = seiten.find(s => s.querySelector(".nest-portraet-kopf")); out.porSeite = por ? seiten.indexOf(por) + 1 : 0;
    out.porErste = por ? por.querySelector(".nest-seite-inhalt").firstElementChild.className : "";
    // e) Sonderzeile liegt im Blatt
    const so = [...c.querySelectorAll(".nest-p")].find(p => /Gute Besserung/.test(p.textContent));
    if (so) { const sd = so.closest(".nest-seite"), sr = sd.getBoundingClientRect(), r2 = so.getBoundingClientRect(); out.sonder = { sichtbar: r2.bottom <= sr.top + mm(296.6 - 18) + 1 && r2.top >= sr.top, seite: [...c.querySelectorAll(".nest-seite")].indexOf(sd) + 1 }; }
    out.kopf = (deck.textContent.match(/KINDERFESTIVAL/gi) || deck.textContent.match(/Kinderfestival/gi) || []).length;
    return out;
  });
  if (r.fehlt) { await t.schliessen(); return h.ergebnis("v763 Nest-PDF A4", false, ["nestDruckVorbereiten fehlt"]); }
  // a) als PDF drucken
  await t.page.emulateMedia({ media: "print" });
  const pdf = await t.page.pdf({ preferCSSPageSize: true, printBackground: true });
  if (process.env.NEST_BILD) { const fs = require("fs"); fs.writeFileSync(process.env.NEST_BILD + ".pdf", pdf);
    const els = await t.page.$$("#nest-druck .nest-seite"); for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `${process.env.NEST_BILD}-seite-${i + 1}.png` }); }
  await t.page.emulateMedia({ media: "screen" });
  const txt = pdf.toString("latin1"), seitenPdf = (txt.match(/\/Type\s*\/Page[^s]/g) || []).length, mb = (txt.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/) || []);
  const breitePt = Number(mb[1]), hochPt = Number(mb[2]);
  const fe = t.fehler(); await t.schliessen();
  if (!/@page\{size:A4 portrait;margin:0\}/.test(r.stil) || /size:\s*390px/.test(r.stil) || Math.abs(breitePt - 595.3) > 1.5 || Math.abs(hochPt - 841.9) > 1.5 || seitenPdf < 4 || seitenPdf > 5 || pdf.length > 5e6 || /@page/.test(r.lese))
    probleme.push("a) " + JSON.stringify({ page: /@page\{size:A4 portrait;margin:0\}/.test(r.stil), breitePt, hochPt, seitenPdf, mb: Math.round(pdf.length / 1024) + " KB", leseOhnePage: !/@page/.test(r.lese) }));
  zeilen.push(`a) @page A4 hoch · PDF ${breitePt.toFixed(0)} × ${hochPt.toFixed(0)} pt, ${seitenPdf} Seiten, ${(pdf.length / 1024).toFixed(0)} KB · Leseansicht ohne @page`);
  const d = r.deck, fuesse = r.seiten.map(s => s.fuss);
  if (r.seiten.some(s => s.breite !== 794 || s.hoch < 1120 || s.hoch > 1124) || d.titelH < 35 || d.qrMm < 28 || d.imHeft !== 3 || d.untenBis < d.deckH - 2 || fuesse[0] !== null
      || fuesse.slice(1).some((f, i) => f !== `Adler Nest · Ausgabe 01 · Seite ${i + 2} von ${r.seiten.length}`))
    probleme.push("b) " + JSON.stringify({ d, fuesse, seiten: r.seiten.map(s => [s.breite, s.hoch]) }));
  zeilen.push(`b) Deckblatt randlos (Titelbild ${d.titelH} % der Höhe, QR ${d.qrMm} mm, ${d.imHeft} Zeilen „Im Heft“, Hintergrund bis zum Rand), Fußzeile ab Blatt 2: „${fuesse[1]}“`);
  const gleich = a => a.length > 2 && a[0] === a[1] && a[1] === a[2];
  if (!gleich(r.teams) || !gleich(r.fotos) || r.fotos[3] === r.fotos[0] || r.porSeite < 2 || r.porErste.indexOf("nest-portraet-kopf") < 0)
    probleme.push("c) " + JSON.stringify({ teams: r.teams, fotos: r.fotos, porSeite: r.porSeite, porErste: r.porErste }));
  zeilen.push(`c) Teams in drei Spalten, sechs Fotos 3 × 2, Porträt beginnt auf Blatt ${r.porSeite} mit dem Kopf`);
  if (r.zerschnitten.length || r.kopfAmEnde.length) probleme.push("d) " + JSON.stringify({ zerschnitten: r.zerschnitten, kopfAmEnde: r.kopfAmEnde }));
  zeilen.push(`d) Blätter: ${r.seiten.map(s => s.abschnitt).join(" · ")} – kein Block über der Satzgrenze, keine Überschrift am Seitenende`);
  if (!r.sonder || !r.sonder.sichtbar || r.kopf !== 1 || /KINDERFESTIVAL.*KINDERFESTIVAL/i.test(d.band.replace(/\s+/g, " ")))
    probleme.push("e) " + JSON.stringify({ sonder: r.sonder, kopf: r.kopf, band: d.band }));
  zeilen.push(`e) Band „${d.band}“ (Format einmal), Sonderzeile sichtbar auf Blatt ${r.sonder && r.sonder.seite}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v763 Nest-PDF im A4-Format mit eigener Seitenaufteilung", !probleme.length, probleme.length ? probleme : zeilen);
};
