/* v646 · PO: „Ein Trainingsziel über die nächsten drei Wochen festlegen und darunter drei bis
   vier fertige Trainingseinheiten mit diesem Fokus … so aufgebaut, dass sie mit acht, zehn,
   zwölf oder vierzehn Spielern funktionieren.“ Kacheln: Leitfrage + eigener Satz; genau drei
   Einheiten A, B, C im Wechsel A-B-C-A-B-C; Aufbauten 10/14 schreibt das claude.ai-Projekt.

   a) Wechsel: sechs Trainings → A B C A B C, fünf → A B C A B; ohne drei Vorlagen nichts.
   b) Aufbau nach Kinderzahl: der größte, der nicht mehr Kinder braucht als da sind; Rest als
      Hinweis (mehr oder weniger), auch bei den alten Aufbauten 8/12/16.
   c) Block anlegen: Leitfrage wählen, eine vierte Einheit wird abgewiesen, gespeichert wird in
      der Reihenfolge der Folge (nicht der Klicks), bis = von + 3 Wochen − 1 Tag.
   d) Banner: ein laufender Block steht oben, der Monats-Schwerpunkt tritt zurück.
   e) Trainingsplan: am vierten Training steht „Einheit A“, dazu der Aufbau zur Kinderzahl
      aus derselben Liste wie die Gruppen (_tgPool); „übernehmen“ schreibt den Plan.
   f) Abgleich: eine bestehende Vorlage mit anderen Aufbauten bekommt genau die Spalte
      skalierung nachgezogen (PATCH), eine gleiche nicht. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const F = "Wie behalte ich den Ball, wenn einer kommt?";
  const SK4 = { "8": "Aufbau acht", "10": "Aufbau zehn", "12": "Aufbau zwölf", "14": "Aufbau vierzehn" };
  const bl = [{ typ: "warmup", label: "Aufwärmen", dauer: 10 }, { typ: "spielform", label: "Spiel", dauer: 20 }];
  const vorlagen = [1, 2, 3, 4].map(i => ({ id: i, name: `L1-${i} Probe ${i}`, leitfrage: F, folge_nr: i, tags: [], skalierung: SK4, bloecke: bl }));
  const von = h.tagePlus(0), bis = h.tagePlus(20);
  const trainings = [1, 4, 8, 11, 15, 18].map((t, i) => ({ id: 70 + i, datum: h.tagePlus(t), typ: "training", uhrzeit: "17:00" }));
  const block = { id: 9, leitfrage: F, ziel: "Jedes Kind schirmt ab", von, bis, vorlagen: vorlagen.slice(0, 3).map(v => v.name) };
  let plan = null;
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: trainings,
    trainingsvorlagen: vorlagen,
    trainingsblock: [block],
    trainingsplan: (u, req) => {
      if (req.method() === "POST") { try { plan = JSON.parse(req.postData() || "null"); } catch (e) {} return { status: 201, body: "[]" }; }
      if (!plan) return [];
      if (/select=slots/.test(u.search)) return [{ slots: plan.slots || [] }];
      if (/select=plan/.test(u.search)) return [{ plan: plan.plan || [] }];
      return [plan];
    }
  }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ block, trainings, SK4 }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    if (typeof blockZuordnung !== "function") return { fehlt: true };
    await loadKader();
    // a)
    out.a6 = blockZuordnung(trainings, block).map(z => z.buchstabe).join("");
    out.a5 = blockZuordnung(trainings.slice(0, 5), block).map(z => z.buchstabe).join("");
    out.a0 = blockZuordnung(trainings, { vorlagen: ["x", "y"] }).length;
    // b)
    const w = (sk, n) => { const a = blockAufbauWahl(sk, n); return a ? `${a.key}${a.rest >= 0 ? "+" : ""}${a.rest}` : "null"; };
    out.b = [w(SK4, 11), w(SK4, 14), w(SK4, 7), w(SK4, 16), w({ "8": "a", "12": "b", "16": "c" }, 10), w({}, 10)].join(" ");
    out.bText = [blockRestText(blockAufbauWahl(SK4, 11)), blockRestText(blockAufbauWahl(SK4, 7))];
    // c) Block anlegen
    await blockEditorOpen(); await warte(150);
    blockLeitfrageSetzen(0);
    blockVorlageUmschalten(2); blockVorlageUmschalten(0); blockVorlageUmschalten(1);
    blockVorlageUmschalten(3);                       // vierte: abgewiesen
    out.cWahl = _tbWahlGeordnet();
    out.cKnopf = !document.getElementById("tb-speichern").disabled;
    out.cVon = _tbEdit.von; out.cBis = _tbBis();
    await warte(100);
    out.cVorschau = (document.getElementById("tb-vorschau") || {}).textContent || "";
    await blockSpeichern(); await warte(100);
    out.cOffen = !!document.getElementById("tb-modal");
    // d) Banner
    const pb = document.getElementById("period-banner");
    await blockBannerRender();
    out.d = (document.getElementById("block-banner") || {}).textContent || "";
    out.dPeriod = pb ? pb.style.display : "fehlt";
    // e) Trainingsplan am vierten Training
    const datum = trainings[3].datum;
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    feld.value = datum;
    await tpTrainerRsvpLaden(datum);
    await blockPlanKarte(datum);
    const karte = document.getElementById("tp-block-karte");
    out.e = karte ? karte.textContent.replace(/\s+/g, " ") : "";
    const pool = _tgPool(); out.eN = pool.namen.length;
    out.eKey = (blockAufbauWahl(SK4, out.eN) || {}).key;
    out.eAufbau = (document.getElementById("tp-block-aufbau") || {}).textContent || "";
    out.eKnopf = (document.getElementById("tp-block-los") || {}).textContent || "";
    window.confirm = () => true;
    await blockEinheitUebernehmen(datum); await warte(300);
    out.eSlots = tpSlots.map(x => x.label);
    // Kein Training an dem Tag → keine Karte
    await blockPlanKarte(trainings[3].datum.replace(/..$/, "00"));
    // f) Aufbauten nachziehen
    VORLAGEN.length = 0;
    VORLAGEN.push({ id: 1, name: "Alt", skalierung: { "8": "a", "12": "b", "16": "c" } }, { id: 2, name: "Gleich", skalierung: { "8": "a" } });
    out.f = await _evSkalierungNachziehen([
      { name: "Alt", neu: false, skalierung: SK4 }, { name: "Gleich", neu: false, skalierung: { "8": "a" } }, { name: "Neu", neu: true, skalierung: SK4 }]);
    return out;
  }, { block, trainings, SK4 });

  const gesendet = s.gesendet.slice();
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) { return h.ergebnis("v646 Trainingsblock", false, ["md-block.js nicht geladen"]); }

  if (r.a6 !== "ABCABC" || r.a5 !== "ABCAB" || r.a0 !== 0) probleme.push(`a) Wechsel: ${r.a6} / ${r.a5} / ${r.a0}`);
  if (r.b !== "10+1 14+0 8-1 14+2 8+2 null") probleme.push(`b) Aufbauwahl: ${r.b}`);
  if (!/\+1 Kind mehr/.test(r.bText[0]) || !/1 Kind weniger/.test(r.bText[1])) probleme.push(`b) Hinweise: ${JSON.stringify(r.bText)}`);
  if (JSON.stringify(r.cWahl) !== JSON.stringify(["L1-1 Probe 1", "L1-2 Probe 2", "L1-3 Probe 3"])) probleme.push(`c) Auswahl/Reihenfolge: ${JSON.stringify(r.cWahl)}`);
  if (!r.cKnopf) probleme.push("c) „Block erfassen“ bleibt aus");
  const post = gesendet.find(x => x.methode === "POST" && /trainingsblock$/.test(x.pfad));
  const body = post ? post.body : null;
  if (!body) probleme.push("c) kein POST an trainingsblock");
  else {
    if (body.leitfrage !== "Wie behalte ich den Ball, wenn einer kommt?" || body.vorlagen.length !== 3 || body.vorlagen[0] !== "L1-1 Probe 1") probleme.push(`c) Inhalt: ${JSON.stringify(body)}`);
    const tage = (new Date(body.bis) - new Date(body.von)) / 864e5;
    if (tage !== 20) probleme.push(`c) Zeitraum ${body.von} – ${body.bis} (${tage} Tage statt 20)`);
  }
  if (r.cOffen) probleme.push("c) Dialog bleibt nach dem Erfassen offen");
  if (!/Wie behalte ich den Ball/.test(r.d) || !/Einheit/.test(r.d)) probleme.push(`d) Banner: ${r.d.slice(0, 160)}`);
  if (r.dPeriod !== "none") probleme.push(`d) Monats-Schwerpunkt bleibt sichtbar (${r.dPeriod})`);
  if (!/Einheit A · L1-1 Probe 1/.test(r.e) || !/4\. von 6 Trainings/.test(r.e)) probleme.push(`e) Karte: ${r.e.slice(0, 200)}`);
  if (!new RegExp(`${r.eN} Kinder`).test(r.e) || !new RegExp(`Aufbau für ${r.eKey}`).test(r.e)) probleme.push(`e) Aufbau passt nicht zu ${r.eN} Kindern: ${r.e.slice(0, 240)}`);
  if (r.eAufbau !== SK4[String(r.eKey)]) probleme.push(`e) Aufbautext „${r.eAufbau}“`);
  if (!/Einheit A in den Plan übernehmen/.test(r.eKnopf)) probleme.push(`e) Knopf „${r.eKnopf}“`);
  if (!plan || !Array.isArray(plan.slots) || plan.slots.length < 2) probleme.push(`e) Übernehmen schrieb keinen Plan (${plan ? JSON.stringify(plan.slots) : "nichts"})`);
  const patches = gesendet.filter(x => x.methode === "PATCH" && /trainingsvorlagen$/.test(x.pfad));
  if (!r.f || r.f.aktualisiert !== 1 || patches.length !== 1 || !/id=eq\.1$/.test(patches[0].suche) || (patches[0].body && patches[0].body.skalierung || {})["10"] !== "Aufbau zehn") probleme.push(`f) Nachziehen: ${JSON.stringify(r.f)} · ${JSON.stringify(patches)}`);
  if (patches.some(p => JSON.stringify(Object.keys(p.body || {})) !== '["skalierung"]')) probleme.push("f) PATCH schreibt mehr als die Spalte skalierung");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Wechsel ${r.a6} · Aufbau ${r.b} · Plan am 4. Training: ${r.eN} Kinder → Aufbau für ${r.eKey}, ${plan && plan.slots ? plan.slots.length : 0} Phasen übernommen · ${patches.length} Aufbau nachgezogen`);
  return h.ergebnis("v646 Trainingsblock: Ziel, drei Einheiten im Wechsel, Aufbau nach Kinderzahl", !probleme.length, probleme.concat(zeilen));
};
