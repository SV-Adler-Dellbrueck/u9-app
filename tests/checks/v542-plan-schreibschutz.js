/* v542 – Wer hat zuletzt gespeichert, und wird er überschrieben?

   Der Plan wird per Upsert auf das DATUM geschrieben, und tpPlanSaveDebounced speichert
   1,2 Sekunden nach jeder Änderung automatisch. Wer am Freitag den Plan öffnete, den Peter
   am Donnerstag gebaut hatte, und eine Übung umstellte, hatte Peters Fassung überschrieben,
   bevor er den Speichern-Knopf auch nur ansah. Genau dieser Ablauf wird hier gefahren.

   Fälle:
   a) Beim Öffnen steht unter der Terminwahl, wer zuletzt gespeichert hat – mit Uhrzeit.
   b) Ein Plan ohne Namen (aus der Zeit vor v542) bekommt keinen erfundenen: nur das Wann.
   c) Speichern trägt den eigenen Namen ein.
   d) Hat inzwischen jemand anderes gespeichert, schreibt die AUTOMATIK nicht.
   e) Der KNOPF schreibt dann auch nicht, sondern fragt – mit Namen und Zeitpunkt.
   f) „Meine Fassung speichern“ schreibt danach wirklich.
   g) Ohne fremde Änderung läuft alles wie bisher: gespeichert wird ohne Rückfrage. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(3);

  /* Eine Attrappe, die sich merkt, was geschrieben wurde, und deren updated_at sich auf
     Zuruf ändern lässt – so wie es passiert, wenn ein anderer Trainer speichert. */
  function attrappe(stand) {
    return h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      profiles: [{ name: "Charles", rolle: "trainer" }],
      trainingsplan: (u, req) => {
        if (req.method() === "POST") {
          stand.updated_at = new Date(Date.now() + 60000).toISOString();
          try { stand.von = (JSON.parse(req.postData() || "{}") || {}).gespeichert_von || null; } catch (e) {}
          stand.schreibvorgaenge++;
          return { status: 201, body: JSON.stringify([{ datum, updated_at: stand.updated_at, gespeichert_von: stand.von }]) };
        }
        if (/select=updated_at/.test(u.search))
          return stand.updated_at ? [{ updated_at: stand.updated_at, gespeichert_von: stand.von }] : [];
        if (/select=slots/.test(u.search)) return [{ slots: stand.slots || [] }];
        if (/select=plan/.test(u.search)) return [{ plan: [] }];
        if (/select=kopf/.test(u.search)) return [{ kopf: {} }];
        if (/select=datum/.test(u.search)) return [{ datum }];
        return [];
      }
    });
  }

  async function lauf(stand) {
    const s = await h.starten({ hoehe: 2400, supabase: attrappe(stand) });
    await h.sichtbarMachen(s.page, "#tp-gespeichert");
    return s;
  }

  // ── a) + c) + g): normaler Ablauf ────────────────────────────────────────────
  const stand = { updated_at: new Date(Date.now() - 864e5).toISOString(), von: "Peter", schreibvorgaenge: 0, slots: [{ label: "Hauptteil", dauer: 20, typ: "main", farbe: "#1a56db" }] };
  const s = await lauf(stand);
  const r = await s.page.evaluate(async ({ datum }) => {
    await loadKader();
    window.trainerMe = async () => "Charles";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpPlanRestore(datum);
    await warte(400);
    const out = {};
    out.zeile = (document.getElementById("tp-gespeichert").textContent || "").replace(/\s+/g, " ").trim();
    out.standGemerkt = !!(TP_STAND[datum] && TP_STAND[datum].updated_at);

    // c) + g) Eigenes Speichern: kein Konflikt, eigener Name
    await tpPlanSave(true);
    await warte(300);
    out.nachSpeichern = (document.getElementById("tp-gespeichert").textContent || "").replace(/\s+/g, " ").trim();
    out.konfliktGezeigt = !!document.getElementById("tp-konflikt");
    return out;
  }, { datum });

  if (!/Peter/.test(r.zeile) || !/Zuletzt gespeichert/.test(r.zeile))
    probleme.push(`Die Zeile nennt nicht, wer gespeichert hat: „${r.zeile}“`);
  else if (!r.standGemerkt) probleme.push("Der Stand wird beim Laden nicht gemerkt – der Abgleich hätte keinen Bezugspunkt");
  else zeilen.push(`Beim Öffnen: „${r.zeile}“`);

  if (r.konfliktGezeigt) probleme.push("Ohne fremde Änderung wird trotzdem gefragt");
  else if (!/Charles/.test(r.nachSpeichern)) probleme.push(`Nach dem Speichern steht nicht der eigene Name: „${r.nachSpeichern}“`);
  else zeilen.push(`Nach dem Speichern: „${r.nachSpeichern}“ · ${stand.schreibvorgaenge} Schreibvorgang`);

  const fehler1 = s.fehler();
  if (fehler1.length) probleme.push("Konsole: " + fehler1[0]);
  await s.schliessen();

  // ── d) + e) + f): jemand anderes war schneller ───────────────────────────────
  const stand2 = { updated_at: new Date(Date.now() - 864e5).toISOString(), von: "Peter", schreibvorgaenge: 0, slots: [{ label: "Hauptteil", dauer: 20, typ: "main", farbe: "#1a56db" }] };
  const s2 = await lauf(stand2);
  const r2 = await s2.page.evaluate(async ({ datum }) => {
    await loadKader();
    window.trainerMe = async () => "Charles";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpPlanRestore(datum);
    await warte(400);
    const out = { vorher: TP_STAND[datum] && TP_STAND[datum].updated_at };

    /* Jetzt speichert „Peter" auf dem Server – nachgebildet, indem der Stand der
       Attrappe von aussen weiterspringt. Genau das sieht die App beim nächsten Blick. */
    window.__fremd = new Date().toISOString();
    return out;
  }, { datum });

  // Der fremde Schreibvorgang: updated_at springt weiter
  stand2.updated_at = new Date(Date.now() + 5000).toISOString();
  stand2.von = "Peter";

  const r3 = await s2.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    // d) Die Automatik darf NICHT schreiben
    await tpPlanSave(false);
    await warte(300);
    out.autoKonflikt = !!document.getElementById("tp-konflikt");   // die Automatik fragt nicht, sie hält an

    // e) Der Knopf fragt
    await tpPlanSave(true);
    await warte(300);
    const k = document.getElementById("tp-konflikt");
    out.frageDa = !!k;
    out.frageText = k ? (k.textContent || "").replace(/\s+/g, " ").trim() : "";
    out.rolle = k ? k.getAttribute("role") : "";
    out.hoehen = k ? [...k.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height)) : [];
    return out;
  }, { datum });

  if (stand2.schreibvorgaenge !== 0) probleme.push(`Die Automatik hat trotz fremder Änderung ${stand2.schreibvorgaenge}× geschrieben`);
  else zeilen.push("Fremde Änderung: die Automatik schreibt nicht");

  if (r3.autoKonflikt) probleme.push("Die Automatik öffnet einen Dialog – sie soll nur anhalten und es sagen");
  if (!r3.frageDa) probleme.push("Der Knopf fragt nicht, sondern überschreibt");
  else {
    if (!/Peter/.test(r3.frageText)) probleme.push(`Die Frage nennt nicht, wer geschrieben hat: „${r3.frageText.slice(0, 110)}“`);
    if (r3.rolle !== "dialog") probleme.push("Der Frage fehlt role=dialog – der Fokus-Trap greift dann nicht");
    const haupt = r3.hoehen.filter(x => x >= 56).length;
    const klein = r3.hoehen.filter(x => x > 0 && x < 48);
    if (!haupt) probleme.push("Keine Hauptaktion mit 56 px in der Frage");
    if (klein.length) probleme.push(`Knöpfe unter 48 px: ${klein.join(", ")}`);
    if (!probleme.length) zeilen.push(`Der Knopf fragt: „${r3.frageText.slice(0, 95)}…“`);
  }

  // f) „Meine Fassung speichern“ schreibt wirklich
  const r4 = await s2.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const k = document.getElementById("tp-konflikt");
    const knopf = k && [...k.querySelectorAll("button")].find(b => /Meine Fassung speichern/.test(b.textContent));
    if (!knopf) return { fehlt: true };
    knopf.click();
    await warte(600);
    return { offen: !!document.getElementById("tp-konflikt"), zeile: (document.getElementById("tp-gespeichert").textContent || "").replace(/\s+/g, " ").trim() };
  }, { datum });

  if (r4.fehlt) probleme.push("Die Frage bietet kein „Meine Fassung speichern“");
  else if (stand2.schreibvorgaenge !== 1) probleme.push(`Nach dem Bestätigen ${stand2.schreibvorgaenge} Schreibvorgänge statt 1`);
  else if (r4.offen) probleme.push("Die Frage bleibt nach dem Bestätigen offen");
  else if (!/Charles/.test(r4.zeile)) probleme.push(`Nach dem Bestätigen steht nicht der eigene Name: „${r4.zeile}“`);
  else zeilen.push(`Nach „Meine Fassung speichern“: ein Schreibvorgang · „${r4.zeile}“`);

  const fehler2 = s2.fehler();
  if (fehler2.length) probleme.push("Konsole: " + fehler2[0]);
  await s2.schliessen();

  // ── b) Plan ohne Namen: kein erfundener ──────────────────────────────────────
  const stand3 = { updated_at: new Date(Date.now() - 864e5).toISOString(), von: null, schreibvorgaenge: 0, slots: [] };
  const s3 = await lauf(stand3);
  const r5 = await s3.page.evaluate(async ({ datum }) => {
    await loadKader();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    await tpPlanRestore(datum);
    await warte(400);
    return { zeile: (document.getElementById("tp-gespeichert").textContent || "").replace(/\s+/g, " ").trim() };
  }, { datum });
  if (!/Zuletzt gespeichert/.test(r5.zeile)) probleme.push(`Ohne Namen fehlt die Zeile ganz: „${r5.zeile}“`);
  else if (/von/.test(r5.zeile)) probleme.push(`Ohne Namen wird trotzdem einer genannt: „${r5.zeile}“`);
  else zeilen.push(`Ohne Namen: „${r5.zeile}“`);
  await s3.schliessen();

  // Die Spalte gehört in die Migration und die Sicherung liest select=* – beides prüfen
  const fs = require("fs"), path = require("path");
  const mig = path.join(h.REPO, "supabase/migrations/20260914_trainingsplan_gespeichert_von.sql");
  if (!fs.existsSync(mig)) probleme.push("Die Migration für gespeichert_von fehlt");
  else if (!/add column if not exists gespeichert_von/.test(fs.readFileSync(mig, "utf8")))
    probleme.push("Die Migration legt die Spalte nicht an");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"trainingsplan","trainingsgruppen"/.test(views)) probleme.push("trainingsplan steht nicht mehr in der Sicherung");

  return h.ergebnis("Trainingsplan: wer zuletzt gespeichert hat, und kein stilles Überschreiben", !probleme.length, zeilen.concat(probleme));
};
