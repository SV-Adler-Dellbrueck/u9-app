/* v538 – Der Trainingsplan-Kopf: Kacheln statt Dropdown.

   Das Auswahlfeld über den Kacheln zeigte exakt dieselbe Liste ein zweites Mal
   (terminSelectFill mit {types:["training"],future:true}). Es ist deshalb unsichtbar
   geworden – aber NICHT verschwunden: fünfundzwanzig Stellen im Code lesen das Datum
   aus #tp-date. Genau das ist hier die Gefahr, und genau die wird geprüft.

   Fälle:
   a) #tp-date existiert, ist unsichtbar und trägt trotzdem einen Wert.
   b) Sechs Kacheln, nicht fünf – auch wenn mehr Trainings anstehen.
   c) Der gewählte Termin ist als Text markiert („gewählt“), nicht nur über Farbe
      (CLAUDE.md: Farbe nie als einziger Bedeutungsträger).
   d) Ein Tipp auf eine andere Kachel schaltet #tp-date um und die Marke wandert mit.
   e) Ohne kommendes Training bleibt die Fläche nicht leer, sondern nennt den Weg
      (Orga → Termine). Ohne Dropdown wäre die Seite sonst unbedienbar.
   f) Die Kacheln sind mindestens 48 px hoch – sie sind jetzt die einzige Terminwahl
      der Seite und kein Listen-Beiwerk mehr (cockpit-ui).
   g) „Einheit importieren“ wird nicht mehr angeboten, „Vorlage übernehmen“ steht
      über die volle Breite. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  /* Sieben kommende Trainings: nur so lässt sich belegen, dass bei SECHS geschnitten
     wird und nicht bei fünf wie vorher. */
  const tage = [1, 4, 8, 11, 15, 18, 22].map(d => h.tagePlus(d));
  const termine = tage.map(d => ({ datum: d, typ: "training", titel: null, gegner: null, uhrzeit: "16:45", uhrzeit_ende: "18:00" }));

  async function lauf(mitTerminen) {
    const s = await h.starten({
      hoehe: 2400, supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen(),
        termine: mitTerminen ? termine : [],
        // Für den zweiten und vierten Termin steht schon ein Plan (✅ gegen 📝).
        trainingsplan: (u) => /select=datum/.test(u.search) ? [{ datum: tage[1] }, { datum: tage[3] }] : []
      })
    });
    await h.sichtbarMachen(s.page, "#tp-vorplan");
    return s;
  }

  // ── Durchgang 1: mit Terminen ────────────────────────────────────────────────
  const s = await lauf(true);
  const r = await s.page.evaluate(async () => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await terminSelectFill("tp-date", { types: ["training"], future: true, vorbeiUeberspringen: true });
    await tpVorplanLoad();
    const out = {};
    const feld = document.getElementById("tp-date");
    out.feldDa = !!feld;
    out.feldUnsichtbar = feld ? getComputedStyle(feld).display === "none" : null;
    out.feldWert = feld ? feld.value : "";

    const kacheln = () => [...document.querySelectorAll("#tp-vorplan button")];
    out.zahl = kacheln().length;
    out.texte = kacheln().map(b => b.textContent.trim());
    out.hoehen = kacheln().map(b => Math.round(b.getBoundingClientRect().height));
    out.gewaehltText = kacheln().filter(b => /gewählt/.test(b.textContent)).length;
    out.gewaehltPasst = kacheln().some(b => /gewählt/.test(b.textContent) && b.getAttribute("aria-pressed") === "true");

    /* d) Auf eine andere Kachel tippen. tpVorplanJump ruft tpPlanRestore, das gegen die
       Attrappe läuft – entscheidend ist hier nur, dass Datum und Marke umschalten. */
    const andere = kacheln().find(b => !/gewählt/.test(b.textContent));
    const vorher = feld.value;
    if (andere) { andere.click(); await warte(400); }
    out.datumGewechselt = feld.value !== vorher;
    out.markeGewandert = kacheln().some(b => /gewählt/.test(b.textContent) && b.textContent.includes(
      new Date(feld.value + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })));
    out.markeEinmal = kacheln().filter(b => /gewählt/.test(b.textContent)).length;
    return out;
  });

  if (!r.feldDa) probleme.push("#tp-date fehlt ganz – 25 Stellen lesen das Datum daraus");
  else if (!r.feldUnsichtbar) probleme.push("#tp-date ist noch sichtbar – das Dropdown sollte entfallen");
  else if (!r.feldWert) probleme.push("#tp-date trägt keinen Wert – ohne Datum plant die Seite ins Leere");
  else zeilen.push(`Auswahlfeld: vorhanden, unsichtbar, Wert ${r.feldWert}`);

  if (r.zahl !== 6) probleme.push(`Es stehen ${r.zahl} Kacheln statt 6 (sieben Termine angeboten)`);
  else zeilen.push(`Kacheln: ${r.zahl} von 7 Terminen · ${r.texte.slice(0, 3).join(" · ")} …`);

  if (r.gewaehltText !== 1) probleme.push(`Der gewählte Termin ist ${r.gewaehltText}× als Text markiert, erwartet genau 1×`);
  if (!r.gewaehltPasst) probleme.push("Die Marke „gewählt“ und aria-pressed stimmen nicht überein");
  if (r.gewaehltText === 1 && r.gewaehltPasst) zeilen.push("Marke: genau ein Termin trägt Text und aria-pressed");

  if (!r.datumGewechselt) probleme.push("Ein Tipp auf eine andere Kachel ändert #tp-date nicht");
  else if (!r.markeGewandert || r.markeEinmal !== 1) probleme.push("Nach dem Tipp steht die Marke „gewählt“ nicht (nur) beim neuen Termin");
  else zeilen.push("Tipp: Datum und Marke wandern gemeinsam");

  const zuKlein = r.hoehen.filter(x => x < 48);
  if (zuKlein.length) probleme.push(`Kacheln unter 48 px: ${zuKlein.join(", ")} – sie sind die einzige Terminwahl der Seite`);
  else zeilen.push(`Kachelhöhe: ${Math.min(...r.hoehen)}–${Math.max(...r.hoehen)} px`);

  const f1 = s.fehler();
  if (f1.length) probleme.push("Konsole: " + f1[0]);
  await s.schliessen();

  // ── Durchgang 2: ohne kommendes Training ─────────────────────────────────────
  const s2 = await lauf(false);
  const r2 = await s2.page.evaluate(async () => {
    await loadKader();
    await terminSelectFill("tp-date", { types: ["training"], future: true, vorbeiUeberspringen: true });
    await tpVorplanLoad();
    const el = document.getElementById("tp-vorplan");
    return { text: (el.textContent || "").replace(/\s+/g, " ").trim(), knoepfe: el.querySelectorAll("button").length };
  });
  if (r2.knoepfe) probleme.push("Ohne Termin stehen trotzdem Kacheln da");
  else if (!/Orga/.test(r2.text)) probleme.push(`Leerer Zustand nennt den Weg nicht: „${r2.text}“`);
  else zeilen.push(`Ohne Termin: „${r2.text.slice(0, 80)}“`);
  await s2.schliessen();

  // ── g) Die Knöpfe im Grundgerüst ─────────────────────────────────────────────
  const fs = require("fs"), path = require("path");
  const shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  const planung = shell.slice(shell.indexOf('id="train-sub-planung"'), shell.indexOf('id="tp-timeline"'));
  if (/<button[^>]*einheitImportOpen/.test(planung)) probleme.push("„Einheit importieren“ wird noch angeboten");
  const vu = planung.match(/<button[^>]*vorlageUebernehmenOpen[^>]*>/);
  if (!vu) probleme.push("„Vorlage übernehmen“ fehlt");
  else if (!/width:100%/.test(vu[0])) probleme.push("„Vorlage übernehmen“ steht nicht über die volle Breite");
  else zeilen.push("Knöpfe: „Vorlage übernehmen“ allein und vollbreit, „Einheit importieren“ entfallen");

  return h.ergebnis("Trainingsplan-Kopf: sechs Kacheln statt Dropdown", !probleme.length, zeilen.concat(probleme));
};
