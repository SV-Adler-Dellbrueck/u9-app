/* v556 – Besetzung: die Kinder finden sich in der Skizze wieder.

   In der Skizze steht „S" und „O". Ein Achtjähriger erkennt darin nicht sich selbst.
   Im Präsentationsmodus lassen sich die Kreise mit den Kindern des Tages besetzen –
   Kürzel im Kreis, am Tablet zusätzlich das Foto.

   Was hier wirklich geprüft wird, ist nicht die Anzeige, sondern die Grenze: Namen und
   Gesichter von Kindern dürfen weder in der gespeicherten Beschreibung landen (das Repo
   ist öffentlich) noch in einem Bild, das die App verlässt, noch in einer öffentlichen
   Ansicht. Drei Wege, auf denen so etwas still passieren würde.

   Fälle:
   a) Die Kürzel sind eindeutig, höchstens drei Zeichen, und sie hängen nicht davon ab,
      wer sonst noch im Bild steht. Der Prüfkader „Kind A" bis „Kind O" ist dafür der
      harte Fall: fünfzehn Namen, die alle mit „Ki" anfangen.
   b) Besetzen schreibt die Kürzel in die Zeichnung – und NICHT in die Übung: die
      Beschreibung bleibt Zeichen für Zeichen dieselbe, und an die Datenbank geht nichts.
   c) Neutrale Kreise („w" – Trainer, Anspieler, Zielperson) bleiben frei.
   d) Die Chipreihe hat je besetztem Kreis einen Knopf von 44 px; zwei antippen tauscht
      die Kinder.
   e) Das Bild, das geteilt wird, bleibt neutral: im Detailfenster steht kein Kindername,
      auch nachdem im Präsentationsmodus besetzt wurde.
   f) Foto nur mit Einwilligung und nur ab 600 px Breite. Am Handy erscheint keines, am
      Tablet eines – aber nur für das Kind mit Freigabe.
   g) Ohne Anmeldung und ohne Kader gibt es den Knopf gar nicht. */
const GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

function kaderMitFotos(h) {
  /* Zwei Kinder mit Foto: eines mit Freigabe, eines ohne. Der Rest wie gehabt. */
  return h.kaderZeilen().map((k, i) => i === 1 ? { ...k, foto_path: "a.jpg", foto_stadionheft_ok: true }
    : i === 2 ? { ...k, foto_path: "b.jpg", foto_stadionheft_ok: false } : k);
}

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const geschrieben = [];

  const attrappe = h.supabaseAttrappe({
    kader: kaderMitFotos(h), termine: [], anwesenheit: [],
    trainingsformen: (u, req) => { if (req.method() !== "GET") geschrieben.push(req.method()); return []; }
  });

  // ── Am Handy: a) bis e) und f) „kein Foto" ────────────────────────────────
  const s = await h.starten({ breite: 390, hoehe: 844, supabase: attrappe });
  await h.sichtbarMachen(s.page, "#view-formen");

  const r = await s.page.evaluate(async ({ GIF }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    for (const n of ["skzKuerzelMap", "skzBesetzungAn", "skzBesetzungTausch", "skzBesetzungMoeglich"])
      if (typeof window[n] !== "function") return { fehlt: n };
    window.fotoLoadImage = async () => ({ src: GIF });

    // a) Kürzel
    const kader = kaderAktiv();
    const map = skzKuerzelMap(kader);
    const werte = kader.map(k => map[k.name]);
    const echt = skzKuerzelMap([{ name: "Mika", nr: 7 }, { name: "Mia", nr: 8 }, { name: "Tom", nr: 9 }]);
    const stabil = skzKuerzelMap(kader.concat([{ name: "Tom", nr: 99 }]));

    // b) Besetzen – eine Übung mit mindestens vier Spielern und einem neutralen Kreis
    const alle = tpAllForms() || [];
    const idx = alle.findIndex(f => {
      const sp = skzSpecVon(f);
      return sp && Array.isArray(sp.s) && sp.s.length >= 4 && sp.s.some(x => x[2] === "w");
    });
    const idx2 = idx >= 0 ? idx : alle.findIndex(f => { const sp = skzSpecVon(f); return sp && (sp.s || []).length >= 4; });
    const vorher = JSON.stringify(skzSpecVon(alle[idx2]));

    skzGrossOpen(idx2); await warte(120);
    const knopf = document.getElementById("skz-gross-kinder");
    const knopfDa = !!knopf;
    knopf && knopf.click(); await warte(200);

    const halter = document.getElementById("skz-gross-halter");
    const texte = [...halter.querySelectorAll("text")].map(t => t.textContent);
    const nachher = JSON.stringify(skzSpecVon(alle[idx2]));

    // c) neutrale Kreise
    const spec = skzSpecVon(alle[idx2]);
    const neutral = (spec.s || []).map((x, i) => [i, x[2]]).filter(x => x[1] === "w").map(x => x[0]);
    const besetzt = Object.keys(_skzGr.besetzung || {}).map(Number);

    // d) Chips
    const chips = [...document.querySelectorAll("#skz-gross-chips button")];
    const chipHoehe = chips.length ? Math.round(chips[0].getBoundingClientRect().height) : 0;
    const vorTausch = chips.slice(0, 2).map(c => c.textContent.trim());
    if (chips.length >= 2) { chips[0].click(); await warte(60); chips[1].click(); await warte(150); }
    const nachTausch = [...document.querySelectorAll("#skz-gross-chips button")].slice(0, 2).map(c => c.textContent.trim());

    // f) am Handy kein Foto
    const bilderHandy = halter.querySelectorAll("image").length;
    skzGrossClose();

    // e) Das Bild zum Teilen: Detailfenster nach dem Besetzen
    tpShowExercise(idx2); await warte(150);
    const detail = document.getElementById("uebung-modal");
    const detailText = detail ? detail.textContent : "";
    const detailSvg = detail ? (detail.querySelector("svg[viewBox='0 0 280 180']") || {}).outerHTML || "" : "";
    const namenImBild = kader.map(k => k.name).filter(n => detailSvg.includes(n));
    const kuerzelImBild = werte.filter(w => new RegExp(">" + w + "<").test(detailSvg));
    document.getElementById("uebung-modal")?.remove();

    return {
      werte, echt, stabil, map, idx: idx2, vorher, nachher, texte, neutral, besetzt,
      chipZahl: chips.length, chipHoehe, vorTausch, nachTausch, bilderHandy, knopfDa,
      namenImBild, kuerzelImBild, detailHatBild: !!detailSvg
    };
  }, { GIF });

  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Skizze besetzen", false, [r.fehlt + " fehlt"]); }

  // a)
  const doppelt = r.werte.filter((w, i) => r.werte.indexOf(w) !== i);
  if (doppelt.length) probleme.push("Kürzel doppelt vergeben: " + [...new Set(doppelt)].join(", "));
  const zuLang = r.werte.filter(w => !w || w.length > 3);
  if (zuLang.length) probleme.push("Kürzel mit mehr als drei Zeichen: " + zuLang.join(", "));
  if (r.echt["Mika"] === r.echt["Mia"]) probleme.push(`Mika und Mia bekommen beide „${r.echt["Mika"]}“`);
  if (r.echt["Tom"] !== "To") probleme.push(`Tom bekommt „${r.echt["Tom"]}“ statt „To“`);
  const gewandert = Object.keys(r.map).filter(n => r.stabil[n] !== r.map[n]);
  if (gewandert.length) probleme.push("Ein Kürzel ändert sich, wenn ein Kind ohne Namensgleichheit dazukommt: " + gewandert.join(", "));
  if (!probleme.length) zeilen.push(`Kürzel: ${r.werte.slice(0, 4).join(" · ")} … eindeutig über ${r.werte.length} Kinder, Mika/Mia → ${r.echt["Mika"]}/${r.echt["Mia"]}`);

  // b)
  if (!r.knopfDa) probleme.push("Der Knopf „Kinder einsetzen“ fehlt im Präsentationsmodus");
  if (r.vorher !== r.nachher) probleme.push("Die Beschreibung der Übung hat sich beim Besetzen verändert");
  if (geschrieben.length) probleme.push("Beim Besetzen ging etwas an die Datenbank: " + geschrieben.join(", "));
  const getroffen = r.werte.filter(w => r.texte.includes(w));
  if (!getroffen.length) probleme.push("Nach dem Besetzen steht kein Kürzel in der Zeichnung");

  // c)
  const falsch = r.neutral.filter(i => r.besetzt.includes(i));
  if (falsch.length) probleme.push("Ein neutraler Kreis wurde besetzt: " + falsch.join(", "));

  // d)
  if (r.chipZahl < 2) probleme.push(`Nur ${r.chipZahl} Chips – zum Tauschen braucht es mindestens zwei`);
  else {
    if (r.chipHoehe < 44) probleme.push(`Die Chips sind ${r.chipHoehe} px hoch – gefordert 44`);
    if (String(r.vorTausch) === String(r.nachTausch)) probleme.push("Zwei Chips antippen hat nichts getauscht");
  }

  // e)
  if (!r.detailHatBild) probleme.push("Das Detailfenster zeigt keine Skizze – der Fall lässt sich nicht prüfen");
  if (r.namenImBild.length) probleme.push("Ein Kindername steht im Bild des Detailfensters: " + r.namenImBild.join(", "));
  if (r.kuerzelImBild.length) probleme.push("Ein Kürzel steht im Bild des Detailfensters: " + r.kuerzelImBild.join(", "));

  // f)
  if (r.bilderHandy) probleme.push(`Am Handy (390 px) wurden ${r.bilderHandy} Fotos eingesetzt – erst ab 600 px`);
  else zeilen.push("Am Handy: Kürzel statt Foto, wie vorgesehen");

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  // ── Am Tablet: f) Foto nur mit Freigabe ───────────────────────────────────
  const t = await h.starten({ breite: 1024, hoehe: 768, supabase: attrappe });
  await h.sichtbarMachen(t.page, "#view-formen");
  const tab = await t.page.evaluate(async ({ GIF, idx }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    window.fotoLoadImage = async () => ({ src: GIF });
    skzGrossOpen(idx); await warte(120);
    document.getElementById("skz-gross-kinder")?.click(); await warte(400);
    const halter = document.getElementById("skz-gross-halter");
    const mitFoto = Object.keys(_skzGr.besetzung || {}).filter(i => _skzGr.besetzung[i].fotoOk && _skzGr.besetzung[i].fotoPath).length;
    const ohneFreigabe = Object.keys(_skzGr.besetzung || {}).filter(i => !_skzGr.besetzung[i].fotoOk && _skzGr.besetzung[i].fotoPath).length;
    const bilder = halter.querySelectorAll("image").length;
    const clips = halter.querySelectorAll("clipPath").length;
    const breite = Math.round(halter.getBoundingClientRect().width);
    skzGrossClose();
    return { mitFoto, ohneFreigabe, bilder, clips, breite };
  }, { GIF, idx: r.idx });

  if (tab.breite < 600) probleme.push(`Die Bühne ist am Tablet nur ${tab.breite} px breit – der Fall lässt sich nicht prüfen`);
  else if (tab.mitFoto && tab.bilder !== tab.mitFoto)
    probleme.push(`${tab.bilder} Fotos eingesetzt, aber ${tab.mitFoto} Kinder haben Freigabe und Bild`);
  else if (tab.bilder !== tab.clips) probleme.push("Zu jedem Foto fehlt der runde Beschnitt");
  else zeilen.push(`Am Tablet (${tab.breite} px): ${tab.bilder} Foto mit Freigabe eingesetzt, ${tab.ohneFreigabe} ohne Freigabe bleibt beim Kürzel`);

  const tf = t.fehler();
  if (tf.length) probleme.push("Konsole (Tablet): " + tf[0]);
  await t.schliessen();

  // ── g) Öffentliche Ansicht: kein Kader, keine Anmeldung ───────────────────
  const oe = await h.starten({ start: "/eltern/index.html?heft", angemeldet: false, breite: 390, hoehe: 900,
    supabase: h.supabaseAttrappe({ kader: kaderMitFotos(h) }) });
  const frei = await oe.page.evaluate(() =>
    (typeof skzBesetzungMoeglich === "function") ? skzBesetzungMoeglich() : "Funktion fehlt");
  if (frei === true) probleme.push("In der öffentlichen Ansicht ließen sich Kinder einsetzen");
  else zeilen.push("Öffentliche Ansicht: Besetzung nicht möglich" + (frei === "Funktion fehlt" ? " (Modul dort nicht geladen)" : ""));
  await oe.schliessen();

  return h.ergebnis("Skizze besetzen: Kürzel und Fotos der Kinder, nur im Präsentationsmodus", !probleme.length, zeilen.concat(probleme));
};
