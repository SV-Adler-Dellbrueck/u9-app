/* v539 – Der Übungen-Reiter: drei Überschriften, „neu" mit Ablaufdatum, keine Import-Knöpfe.

   Der wichtigste Fall ist c). „🆕 neu" hing bisher an tpLastUsedDays()===null, hieß also
   „noch nie eingesetzt" und verschwand nie von allein. Jetzt heißt es „neu angelegt" und
   zählt trainingsformen.created_at; nach vier Wochen ist es weg. Die Übungen aus data.js
   tragen kein Anlagedatum – sie dürfen deshalb NIE das Abzeichen tragen, sonst stünde es
   an über hundert Übungen gleichzeitig.

   Fälle:
   a) Die acht Gruppen-Kacheln stehen unter drei Überschriften, in der Reihenfolge
      Einstieg · Hauptteil · Speziell.
   b) Jede Gruppe mit Übungen kommt genau einmal vor – keine geht beim Gruppieren verloren.
   c) „🆕 neu" nur bei created_at jünger als 28 Tage; älter und ohne Datum nicht.
   d) „noch nicht eingesetzt" steht weiter da, aber ohne Abzeichen.
   e) Die Kacheln sind mindestens 48 px hoch (cockpit-ui) und tragen aria-pressed.
   f) „Übungen importieren" und „Vorlagen importieren" werden nicht mehr angeboten;
      die Dialoge bleiben im Modul erreichbar, weil der automatische Abgleich ihre
      Prüfung benutzt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  /* Drei eigene Übungen: eine frisch, eine über vier Wochen alt, eine ohne Datum.
     Die Kategorie „custom" landet in der Gruppe „Eigene & KI". */
  const tageAlt = d => new Date(Date.now() - d * 864e5).toISOString();
  const eigene = [
    { id: 9001, name: "Frische Eigene", kat: "technik", kurz: "x", dauer: "10", custom: true, created_at: tageAlt(3) },
    { id: 9002, name: "Alte Eigene", kat: "technik", kurz: "x", dauer: "10", custom: true, created_at: tageAlt(40) },
    { id: 9003, name: "Eigene ohne Datum", kat: "technik", kurz: "x", dauer: "10", custom: true, created_at: null }
  ];

  const s = await h.starten({
    hoehe: 3000, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      trainingsformen: eigene,
      team_config: [{ id: 1, uebung_meta: {}, uebung_art: {} }]
    })
  });
  await h.sichtbarMachen(s.page, "#tf-kacheln");

  const r = await s.page.evaluate(async () => {
    await loadKader();
    await loadCustomForms();          // zieht renderTraining mit
    const out = {};

    // a) + b) Überschriften und Kacheln
    const box = document.getElementById("tf-kacheln");
    out.ueberschriften = [...box.children].filter(e => e.tagName === "DIV" && !e.querySelector("button"))
      .map(e => e.textContent.trim());
    const kacheln = [...box.querySelectorAll("button")];
    out.kachelTexte = kacheln.map(b => b.textContent.replace(/\s+/g, " ").trim());
    out.kachelZahl = kacheln.length;
    out.hoehen = kacheln.map(b => Math.round(b.getBoundingClientRect().height));
    out.ariaDa = kacheln.every(b => b.hasAttribute("aria-pressed"));
    /* Jede Gruppe, die Übungen hat, muss genau einmal auftauchen. Gezählt wird über
       TF_GRUPPEN, nicht über die Texte – die Beschriftung darf sich ändern. */
    const zahl = {};
    TF_GRUPPEN.forEach(g => { zahl[g.key] = out.kachelTexte.filter(x => x.startsWith(g.label)).length; });
    out.mehrfach = Object.entries(zahl).filter(([, n]) => n > 1).map(([k]) => k);
    out.gruppenMitInhalt = Object.entries(zahl).filter(([, n]) => n === 1).length;

    // c) + d) Frische je Übung
    const idx = n => tpAllForms().findIndex(f => f.name === n);
    out.frisch = _tfFrische(tpAllForms()[idx("Frische Eigene")], idx("Frische Eigene"));
    out.alt = _tfFrische(tpAllForms()[idx("Alte Eigene")], idx("Alte Eigene"));
    out.ohne = _tfFrische(tpAllForms()[idx("Eigene ohne Datum")], idx("Eigene ohne Datum"));
    /* Die mitgelieferte Datenbank: KEINE davon darf „neu" sein. */
    out.mitgeliefertNeu = TRAININGSFORMEN.filter(f => _tfIstNeu(f)).length;
    out.mitgeliefertGesamt = TRAININGSFORMEN.length;
    return out;
  });

  const erwartet = ["Einstieg", "Hauptteil", "Speziell"];
  if (String(r.ueberschriften) !== String(erwartet))
    probleme.push(`Überschriften: ${JSON.stringify(r.ueberschriften)} statt ${JSON.stringify(erwartet)}`);
  else zeilen.push(`Überschriften: ${r.ueberschriften.join(" · ")}`);

  if (r.mehrfach.length) probleme.push("Gruppen mehrfach einsortiert: " + r.mehrfach.join(", "));
  else if (r.gruppenMitInhalt !== r.kachelZahl)
    probleme.push(`${r.kachelZahl} Kacheln, aber ${r.gruppenMitInhalt} zugeordnete Gruppen – eine ist verlorengegangen`);
  else zeilen.push(`Kacheln: ${r.kachelZahl}, jede Gruppe genau einmal`);

  if (!/🆕 neu/.test(r.frisch)) probleme.push(`Vor 3 Tagen angelegt trägt kein „neu": „${r.frisch}“`);
  if (/🆕 neu/.test(r.alt)) probleme.push(`Vor 40 Tagen angelegt trägt noch „neu": „${r.alt}“`);
  if (/🆕 neu/.test(r.ohne)) probleme.push(`Ohne Anlagedatum trägt „neu": „${r.ohne}“`);
  if (!/noch nicht eingesetzt/.test(r.alt)) probleme.push(`„noch nicht eingesetzt" fehlt: „${r.alt}“`);
  if (r.mitgeliefertNeu) probleme.push(`${r.mitgeliefertNeu} von ${r.mitgeliefertGesamt} mitgelieferten Übungen gelten als „neu"`);
  if (!probleme.length) zeilen.push(`Frische: 3 Tage „${r.frisch.replace(/<[^>]+>/g, "")}“ · 40 Tage „${r.alt.replace(/<[^>]+>/g, "")}“ · ohne Datum „${r.ohne.replace(/<[^>]+>/g, "")}“ · mitgeliefert 0 von ${r.mitgeliefertGesamt}`);

  const zuKlein = r.hoehen.filter(x => x < 48);
  if (zuKlein.length) probleme.push(`Kacheln unter 48 px: ${zuKlein.join(", ")}`);
  if (!r.ariaDa) probleme.push("Den Kacheln fehlt aria-pressed");

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  // f) Knöpfe im Grundgerüst, Dialoge im Modul
  const fs = require("fs"), path = require("path");
  const shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  const formen = shell.slice(shell.indexOf('id="train-sub-formen"'), shell.indexOf('id="training-content"'));
  if (/<button[^>]*uebungImportOpen/.test(formen)) probleme.push("„Übungen importieren“ wird noch angeboten");
  if (/<button[^>]*vorlagenImportOpen/.test(formen)) probleme.push("„Vorlagen importieren“ wird noch angeboten");
  const modul = fs.readFileSync(path.join(h.REPO, "md-einheit-import.js"), "utf8");
  ["uebungImportOpen", "vorlagenImportOpen", "bibliothekAbgleich"].forEach(n => {
    if (!new RegExp(`function ${n}\\b`).test(modul)) probleme.push(`${n} fehlt im Modul – der Abgleich braucht dieselbe Prüfung`);
  });
  if (!probleme.length) zeilen.push("Knöpfe entfallen, Dialoge und Abgleich im Modul unverändert");

  return h.ergebnis("Übungen-Reiter: drei Überschriften, „neu“ läuft ab, keine Import-Knöpfe", !probleme.length, zeilen.concat(probleme));
};
