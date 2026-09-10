/* v515 – PO: „Wer die App installiert hat, landet über die Weiterleitung im Browser statt in
   seiner Kachel und merkt vielleicht nicht, warum." Nach dem Umzug auf
   sv-adler-dellbrueck.github.io/u9-app/ muss jeder EINMAL drei Dinge selbst tun: neu
   anmelden, Benachrichtigungen wieder erlauben, die App neu ablegen.
   Der Hinweis erkennt den Herkommenden an ?umzug=1 (setzt die Weiterleitung) ODER am
   Verweis der alten Adresse – keins allein reicht: den Verweis unterschlagen manche
   Browser, das Merkmal fehlt bei einem Lesezeichen auf die neue Adresse.
   Geprueft wird, was am Bildschirm steht, dass das Merkmal SOFORT aus der Adresszeile
   verschwindet (sonst reicht es jemand weiter), dass der Rest der Adresse dabei
   unangetastet bleibt, dass der Install-Hinweis zurueckttritt – und dass der Hinweis nach
   „Verstanden" nie wieder kommt, einen Neuladen davor aber ueberlebt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({
    start: "/trainer/index.html?umzug=1",
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }),
    warten: 2200
  });

  const r = await s.page.evaluate(async ({ kh }) => {
    eval(kh);                                          // __kontrastVon(el)
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof umzugHinweis !== "function") return { fehlt: "umzugHinweis" };
    if (typeof umzugFaellig !== "function") return { fehlt: "umzugFaellig" };
    const B = () => document.getElementById("umzug-hinweis");

    // ── Er kommt von selbst, ohne dass jemand etwas anstoesst ────────────────
    for (let i = 0; i < 30 && !B(); i++) await warte(100);
    const auto = !!B();
    const text = auto ? B().textContent.replace(/\s+/g, " ").trim() : "";
    const rolle = auto ? B().getAttribute("role") : "";
    const knopf = auto ? B().querySelector("button") : null;
    const knopfHoehe = knopf ? Math.round(knopf.getBoundingClientRect().height) : 0;
    const knopfText = knopf ? knopf.textContent.trim() : "";
    const knopfBreite = knopf ? Math.round(knopf.getBoundingClientRect().width) : 0;
    const kastenBreite = auto ? Math.round(B().getBoundingClientRect().width) : 0;

    // Farbe darf nie der einzige Traeger sein: die drei Punkte stehen als Text da.
    const punkte = auto ? [...B().querySelectorAll("li")].map(x => x.textContent.trim()) : [];

    // Kontrast am echten Element, hell wie dunkel derselbe Kasten (Vereinsblau).
    const kontrast = auto ? {
      liste: __kontrastVon(B().querySelector("ul")),
      kopf: __kontrastVon(B().querySelector("div")),
      knopf: knopf ? __kontrastVon(knopf) : 0
    } : {};

    // ── Das Merkmal ist sofort aus der Adresszeile ──────────────────────────
    const suchNachAuto = location.search;

    // ── Der Install-Hinweis tritt zurueck ───────────────────────────────────
    if (typeof pwaInstallNudge === "function") { try { pwaInstallNudge(); } catch (e) {} }
    await warte(60);
    const pwaDaneben = !!document.getElementById("pwa-nudge");

    // ── Ein Neuladen VOR dem Wegklicken darf ihn nicht verschlucken ─────────
    const standOffen = (() => { try { return localStorage.getItem("adler_umzug_hinweis"); } catch (e) { return null; } })();
    B().remove();
    const nachNeuladen = umzugHinweis() && !!B();     // ohne Merkmal, nur aus dem Stand „offen"

    // ── Streichen des Merkmals fasst den Rest der Adresse nicht an ──────────
    const strich = {};
    [["?umzug=1", ""], ["?turnier=abc&umzug=1", "?turnier=abc"],
     ["?umzug=1&turnier=abc", "?turnier=abc"], ["?portal", "?portal"]].forEach(([vor, soll]) => {
      history.replaceState(null, "", location.pathname + vor);
      umzugMerkmalWeg();
      strich[vor] = location.search + " statt " + soll;
      if (location.search === soll) strich[vor] = "ok";
    });
    history.replaceState(null, "", location.pathname);

    // ── „Verstanden" beendet ihn endgueltig ─────────────────────────────────
    umzugVerstanden();
    await warte(60);
    const nachVerstanden = { weg: !B(), faellig: umzugFaellig(), nochmal: umzugHinweis() || !!B() };

    // ── Gegenprobe: ohne Merkmal und ohne Verweis kommt gar nichts ──────────
    try { localStorage.removeItem("adler_umzug_hinweis"); } catch (e) {}
    const ohneAlles = umzugFaellig();                 // Adresse ist sauber, Verweis leer

    // ── Der zweite Weg: der Verweis der alten Adresse ───────────────────────
    let ueberVerweis = null;
    try {
      Object.defineProperty(document, "referrer", { configurable: true, get: () => "https://charleshuetten-dot.github.io/" });
      ueberVerweis = umzugFaellig();
    } catch (e) { ueberVerweis = "ging nicht: " + e.message; }

    return { auto, text, rolle, punkte, kontrast, knopfText, knopfHoehe, knopfBreite, kastenBreite,
             suchNachAuto, pwaDaneben, standOffen, nachNeuladen, strich, nachVerstanden,
             ohneAlles, ueberVerweis };
  }, { kh: h.kontrastHelfer });

  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Umzugs-Hinweis", false, probleme); }

  // ── Er kommt von selbst ───────────────────────────────────────────────────
  if (!r.auto) probleme.push("Nach ?umzug=1 erscheint kein Hinweis – wer über die Weiterleitung kommt, erfährt nichts");
  if (r.rolle !== "status") probleme.push(`Der Hinweis trägt role="${r.rolle}" statt "status" – Vorlesegeräte kündigen ihn sonst nicht an`);

  // ── Die drei Dinge stehen wirklich da ─────────────────────────────────────
  const soll = [[/neu anmelden/i, "neu anmelden"], [/benachrichtigung/i, "Benachrichtigungen erlauben"], [/startbildschirm/i, "App neu ablegen"]];
  soll.forEach(([re, was]) => { if (!re.test(r.text)) probleme.push(`Im Hinweis fehlt „${was}“`); });
  if (r.punkte.length !== 3) probleme.push(`Die drei Punkte stehen nicht als Liste da (${r.punkte.length} Einträge) – ohne Text trüge allein die Farbe die Bedeutung`);

  // ── Die Hauptaktion ───────────────────────────────────────────────────────
  if (!/verstanden/i.test(r.knopfText)) probleme.push(`Die Hauptaktion heißt „${r.knopfText}“ statt „Verstanden“`);
  if (r.knopfHoehe < 56) probleme.push(`Die Hauptaktion ist ${r.knopfHoehe} px hoch (mindestens 56)`);
  if (r.knopfBreite < r.kastenBreite - 40) probleme.push(`Die Hauptaktion ist ${r.knopfBreite} px breit im ${r.kastenBreite} px breiten Kasten – am Handy gehört sie über die volle Breite`);

  // ── Kontrast: Text 4.5:1, Bedienelement 3:1 ───────────────────────────────
  if ((r.kontrast.kopf || 0) < 4.5) probleme.push(`Überschrift ${r.kontrast.kopf}:1 (mindestens 4.5)`);
  if ((r.kontrast.liste || 0) < 4.5) probleme.push(`Die drei Punkte ${r.kontrast.liste}:1 (mindestens 4.5)`);
  if ((r.kontrast.knopf || 0) < 3) probleme.push(`Die Hauptaktion ${r.kontrast.knopf}:1 (mindestens 3)`);

  // ── Das Merkmal verschwindet, ohne den Rest anzufassen ────────────────────
  if (/umzug/.test(r.suchNachAuto)) probleme.push(`„umzug=1“ steht noch in der Adresszeile (${r.suchNachAuto}) – so reicht es jemand weiter`);
  Object.keys(r.strich).forEach(k => { if (r.strich[k] !== "ok") probleme.push(`Streichen bei ${k}: ${r.strich[k]}`); });

  // ── Der Install-Hinweis tritt zurück ──────────────────────────────────────
  if (r.pwaDaneben) probleme.push("Der Install-Hinweis steht daneben – zwei Banner übereinander, und nur einer nennt den Grund");

  // ── Neuladen davor, „Verstanden“ danach ───────────────────────────────────
  if (r.standOffen !== "offen") probleme.push(`Vor dem Wegklicken steht „${r.standOffen}“ statt „offen“ – ein Neuladen verschluckte den Hinweis`);
  if (!r.nachNeuladen) probleme.push("Nach einem Neuladen vor dem Wegklicken kommt der Hinweis nicht wieder");
  if (!r.nachVerstanden.weg) probleme.push("„Verstanden“ räumt den Hinweis nicht weg");
  if (r.nachVerstanden.faellig) probleme.push("Nach „Verstanden“ gilt der Hinweis weiter als fällig");
  if (r.nachVerstanden.nochmal) probleme.push("Nach „Verstanden“ kommt der Hinweis erneut");

  // ── Beide Wege, und die Gegenprobe ────────────────────────────────────────
  if (r.ohneAlles) probleme.push("Ohne Merkmal und ohne Verweis erscheint der Hinweis trotzdem");
  if (r.ueberVerweis !== true) probleme.push(`Über den Verweis der alten Adresse wird der Hinweis nicht fällig (${r.ueberVerweis})`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Kommt von selbst: ${r.auto} · role="${r.rolle}" · Punkte: ${r.punkte.length}`);
  zeilen.push(`Hauptaktion „${r.knopfText}“ ${r.knopfHoehe} px hoch, ${r.knopfBreite}/${r.kastenBreite} px breit`);
  zeilen.push(`Kontrast: Kopf ${r.kontrast.kopf}:1 · Punkte ${r.kontrast.liste}:1 · Knopf ${r.kontrast.knopf}:1`);
  zeilen.push(`Adresszeile nach dem Streichen: „${r.suchNachAuto}“ · Fälle: ${Object.keys(r.strich).map(k => k + " " + r.strich[k]).join(" · ")}`);
  zeilen.push(`Install-Hinweis daneben: ${r.pwaDaneben} · Stand vor dem Wegklicken: ${r.standOffen} · nach Neuladen wieder da: ${r.nachNeuladen}`);
  zeilen.push(`Nach „Verstanden“ weg: ${r.nachVerstanden.weg}, nicht mehr fällig: ${!r.nachVerstanden.faellig} · ohne alles: ${r.ohneAlles} · über Verweis: ${r.ueberVerweis}`);
  return h.ergebnis("Umzugs-Hinweis kommt einmal und nennt die drei Dinge", !probleme.length, zeilen.concat(probleme));
};
