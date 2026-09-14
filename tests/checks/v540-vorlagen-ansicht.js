/* v540 – Vorlagen nachschlagen, ohne sie zu übernehmen.

   Bis v539 konnte man eine Vorlage nur SEHEN, indem man den Dialog „Vorlage übernehmen"
   öffnete – und der hängt an einem Termin. Wer nur wissen wollte, welche Einheiten es gibt,
   musste so tun, als wolle er planen.

   Der wichtigste Fall ist f): Die Ansicht darf NICHTS schreiben. Sie liest die Sammlung,
   sonst nichts; eingesetzt wird im Trainingsplan, wo der Termin steht.

   Fälle:
   a) Die Ansicht öffnet und nennt die Zahl der Vorlagen.
   b) Gruppiert nach Leitfrage, innerhalb der Gruppe nach Folge-Nr.
   c) Aufklappen zeigt die Blöcke mit Dauer und Übung – auch Stationen und die
      tw-Station, in derselben Darstellung wie die Vorschau (_evBlockText).
   d) Skalierung und Beobachtungsfrage stehen im Steckbrief.
   e) Der Filter auf eine Leitfrage blendet die andere Gruppe aus.
   f) Kein Schreibzugriff auf Supabase, und kein Übernehmen-Knopf.
   g) Leerer Zustand nennt den Weg (uebungen/vorlagen.json).
   h) Knopfhöhen mindestens 48 px (cockpit-ui). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const vorlagen = [
    {
      id: 1, name: "L4-1 Ball behaupten", leitfrage: "Wie behalte ich den Ball?", folge_nr: 1,
      tags: ["wenig-platz"], dauer_min: 60, netto_spielform_min: 24,
      skalierung: { "8": "zwei Felder", "12": "drei Felder", "16": "vier Felder" },
      beobachtung: "Schaut das Kind vor dem ersten Kontakt auf?",
      bloecke: [
        { typ: "warmup", label: "Ankommen", dauer: 10, uebung_name: "Fang-Stern" },
        { typ: "spielform", label: "Stufe 1", dauer: 12, stationen: [
          { uebung_name: "Korridor-Funino" }, { uebung_name: "Passtor im Quadrat" },
          { uebung_name: "Adler TW", rolle: "tw" }
        ] },
        { typ: "abschluss", label: "Abschlussspiel", dauer: 14 }
      ]
    },
    {
      id: 2, name: "L4-2 Ball behaupten, enger", leitfrage: "Wie behalte ich den Ball?", folge_nr: 2,
      tags: [], dauer_min: 60, netto_spielform_min: 26, skalierung: {}, beobachtung: null,
      bloecke: [{ typ: "spielform", label: "Stufe 1", dauer: 12, uebung_name: "Korridor-Funino" }]
    },
    {
      id: 3, name: "T1 Torschuss", leitfrage: "Wie komme ich zum Abschluss?", folge_nr: 1,
      tags: ["vor-spieltag"], dauer_min: 55, netto_spielform_min: 20, skalierung: {}, beobachtung: null,
      bloecke: [{ typ: "main", label: "Hauptteil", dauer: 15, uebung_name: "Rauten-Staffel" }]
    }
  ];

  async function lauf(mitVorlagen) {
    const s = await h.starten({
      hoehe: 2600, supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen(),
        trainingsvorlagen: mitVorlagen ? vorlagen : []
      })
    });
    return s;
  }

  // ── Durchgang 1: mit Vorlagen ────────────────────────────────────────────────
  const s = await lauf(true);
  const r = await s.page.evaluate(async () => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await vorlagenAnsichtOpen();
    for (let i = 0; i < 40 && !document.getElementById("va-inhalt"); i++) await warte(50);
    const box = document.getElementById("va-inhalt");
    if (!box) return { fensterFehlt: true };
    await warte(200);
    const out = {};
    const txt = () => (document.getElementById("va-inhalt").textContent || "").replace(/\s+/g, " ");

    out.kopf = txt().slice(0, 60);
    // b) Reihenfolge der Gruppen-Überschriften und der Karten darin
    out.gruppen = [...box.children].filter(e => /text-transform:uppercase/.test(e.getAttribute("style") || ""))
      .map(e => e.textContent.trim()).filter(x => x !== "Leitfrage");
    out.karten = [...box.querySelectorAll('button[aria-expanded]')].map(b => b.textContent.replace(/\s+/g, " ").trim());
    out.hoehen = [...box.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height));

    // c) + d) Aufklappen
    const erste = box.querySelector('button[aria-expanded]');
    erste.click(); await warte(150);
    out.aufgeklappt = txt();
    out.expanded = document.querySelector('button[aria-expanded="true"]') !== null;

    // e) Filter auf die zweite Leitfrage
    const chips = [...document.querySelectorAll('#va-inhalt button[aria-pressed]')];
    out.chipZahl = chips.length;
    const zweiter = chips.find(c => /Abschluss/.test(c.textContent));
    if (zweiter) { zweiter.click(); await warte(150); }
    out.nachFilter = txt();

    // f) kein Übernehmen-Knopf
    out.uebernehmen = [...document.querySelectorAll("#va-modal button")]
      .some(b => /übernehmen|einsetzen|speichern/i.test(b.textContent));
    return out;
  });

  if (r.fensterFehlt) {
    probleme.push("vorlagenAnsichtOpen öffnet kein Fenster");
  } else {
    if (!/3 Vorlagen/.test(r.kopf)) probleme.push(`Kopf nennt die Zahl nicht: „${r.kopf}“`);
    else zeilen.push(`Kopf: „${r.kopf.trim()}“`);

    const erwartet = ["Wie behalte ich den Ball?", "Wie komme ich zum Abschluss?"];
    if (String(r.gruppen) !== String(erwartet))
      probleme.push(`Gruppen: ${JSON.stringify(r.gruppen)} statt ${JSON.stringify(erwartet)}`);
    else if (!/^1\. L4-1/.test(r.karten[0]) || !/^2\. L4-2/.test(r.karten[1]))
      probleme.push(`Folge-Nr nicht sortiert: ${JSON.stringify(r.karten.slice(0, 2))}`);
    else zeilen.push(`Gruppen: ${r.gruppen.join(" · ")} · ${r.karten.length} Karten, nach Folge sortiert`);

    // c) Stationen und tw-Station in der Blockzeile
    if (!/Korridor-Funino/.test(r.aufgeklappt) || !/Passtor im Quadrat/.test(r.aufgeklappt))
      probleme.push("Die Stationen des Blocks fehlen im Steckbrief");
    else if (!/\(Torwart, parallel\)/.test(r.aufgeklappt))
      probleme.push("Die tw-Station ist nicht als parallel gekennzeichnet");
    else if (!r.expanded) probleme.push("aria-expanded bleibt false nach dem Aufklappen");
    else zeilen.push("Steckbrief: Stationen mit Nummern, Torwart-Station als parallel benannt");

    // d)
    if (!/zwei Felder/.test(r.aufgeklappt)) probleme.push("Die Skalierung fehlt im Steckbrief");
    if (!/vor dem ersten Kontakt/.test(r.aufgeklappt)) probleme.push("Die Beobachtungsfrage fehlt im Steckbrief");
    if (!/Vorlage übernehmen/.test(r.aufgeklappt)) probleme.push("Der Verweis auf den Trainingsplan fehlt");

    // e)
    if (r.chipZahl !== 2) probleme.push(`${r.chipZahl} Leitfragen-Filter statt 2`);
    else if (/L4-1/.test(r.nachFilter)) probleme.push("Der Filter blendet die andere Leitfrage nicht aus");
    else if (!/T1 Torschuss/.test(r.nachFilter)) probleme.push("Der Filter blendet die gewählte Leitfrage mit aus");
    else zeilen.push("Filter: eine Leitfrage bleibt, die andere ist weg");

    // f) + h)
    if (r.uebernehmen) probleme.push("Die Ansicht bietet einen Übernehmen-Knopf – sie soll nur lesen");
    const zuKlein = r.hoehen.filter(x => x > 0 && x < 48);
    if (zuKlein.length) probleme.push(`Knöpfe unter 48 px: ${zuKlein.join(", ")}`);
  }

  /* f) Der eigentliche Nachweis: kein einziger Schreibzugriff. Der Bibliotheks-Abgleich
     ist in dieser Prüfung stillgelegt (die uebungen/*.json antworten wie fehlend), also
     kann hier nur die Ansicht selbst etwas geschrieben haben. */
  const geschrieben = s.gesendet.filter(g => /rest\/v1\//.test(g.pfad || ""));
  if (geschrieben.length) probleme.push(`${geschrieben.length} Schreibzugriffe: ${geschrieben.map(g => g.pfad).join(", ")}`);
  else zeilen.push("Kein Schreibzugriff – die Ansicht liest nur");

  const f1 = s.fehler();
  if (f1.length) probleme.push("Konsole: " + f1[0]);
  await s.schliessen();

  // ── Durchgang 2: leere Sammlung ──────────────────────────────────────────────
  const s2 = await lauf(false);
  const r2 = await s2.page.evaluate(async () => {
    await loadKader();
    await vorlagenAnsichtOpen();
    for (let i = 0; i < 40 && !document.getElementById("va-inhalt"); i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 200));
    const el = document.getElementById("va-inhalt");
    return { text: (el.textContent || "").replace(/\s+/g, " ").trim(), karten: el.querySelectorAll("button[aria-expanded]").length };
  });
  if (r2.karten) probleme.push("Ohne Vorlagen stehen trotzdem Karten da");
  else if (!/vorlagen\.json/.test(r2.text)) probleme.push(`Leerer Zustand nennt den Weg nicht: „${r2.text}“`);
  else zeilen.push(`Ohne Vorlagen: „${r2.text.slice(0, 70)}“`);
  await s2.schliessen();

  // Ladearchitektur: die Funktion darf die MODUL_WACHE nicht verdrängen
  const fs = require("fs"), path = require("path");
  const modul = fs.readFileSync(path.join(h.REPO, "md-einheit-import.js"), "utf8");
  if (modul.lastIndexOf("function vorlagenAnsichtOpen") > modul.lastIndexOf("function bibliothekAbgleich"))
    probleme.push("vorlagenAnsichtOpen steht NACH bibliothekAbgleich – die MODUL_WACHE prüft den letzten Namen der Datei");
  const shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  const formen = shell.slice(shell.indexOf('id="train-sub-formen"'), shell.indexOf('id="training-content"'));
  if (!/<button[^>]*vorlagenAnsichtOpen/.test(formen)) probleme.push("Der Knopf „Vorlagen ansehen“ fehlt im Übungen-Bereich");

  return h.ergebnis("Vorlagen ansehen: nachschlagen ohne übernehmen", !probleme.length, zeilen.concat(probleme));
};
