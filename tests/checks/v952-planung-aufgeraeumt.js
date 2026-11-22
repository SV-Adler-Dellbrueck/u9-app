/* v952 · Charles 22.11.: „Die Schrift ist teilweise über den Kacheln hinaus“ · „Wenn ich noch Änderungen vornehme und dann ganz
   unten Plan speichern klicke, müsste ja oben der fertige Plan verschwinden … vielleicht nochmal aufrufbar“ · „Brauchen wir die
   Buttons noch?“ („Ja, so aufräumen“) · „Die Anordnung der Buttons und deren Design ist nicht gut … maximale Usability“.
   Entwurf A–D freigegeben („Ja, so bauen“).
   a) Ablauf-Kacheln (Aufwärmen 5 · Hauptteil 60 · Abschluss 10) bei 360 px: kein Wort ragt aus seiner Kachel.
   b) Nach „Plan speichern“ zeigt die Seite nur die Übersicht (Charles: „Eigentlich kann da die ganze Planungsübersicht als fertig
      angezeigt werden … Planung doch nochmal ändern kann dann eine Option sein“): „Training steht · gespeichert …“, „▶ Training
      starten“ (≥ 56 px), je Block eine Zeile; Blockkarten, „Plan im Detail“ und Speichern sind ausgeblendet. „Plan ändern“ zeigt
      sie wieder, „Fertig – zur Übersicht“ blendet sie aus.
   e) Trainingsansicht: „Training starten“ öffnet einen Dialog mit Block 1 von n, Countdown (Start, +1 Min, Weiter ≥ 48 px);
      bei mehreren Feldern nur die eigene Gruppe, „Andere Gruppen anzeigen“ zeigt alle; Weiter springt zum nächsten Block,
      nach dem letzten „Training geschafft“; ✕ schließt.
   c) „Plan im Detail“: kein „Plan anpassen“; „Training füllen“ nur bei leerem Plan; Link „Andere Vorlage wählen“ (≥ 44 px).
   d) Blockkopf: ⋯ (≥ 44 px) öffnet ein Menü mit Nach oben / Nach unten / Block löschen, Escape schließt es; − / + ändern die
      Minuten in Schritten (10 → 15 → 10); bei 360 px ragt im Kopf nichts hinaus. */
"use strict";
module.exports = async function (h) {
  const titel = "v952 Planung: fertiger Plan als Übersicht, Trainingsansicht mit eigener Übung und Countdown, ⋯ und − / + am Block";
  const probleme = [], zeilen = [];
  const F5 = "Wo stehe ich, wenn wir den Ball haben – und wo, wenn nicht?";
  const bl = [{ typ: "warmup", label: "Aufwärmen", dauer: 5 }, { typ: "main", label: "Hauptteil", dauer: 60, uebung_name: "Korridor-Funino" }, { typ: "abschluss", label: "Abschlussspiel", dauer: 10 }];
  const datum = h.tagePlus(2); let plan = null;
  const s = await h.starten({ breite: 360, hoehe: 1600, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [{ id: 70, datum, typ: "training", uhrzeit: "16:45" }],
    trainingsvorlagen: [{ id: 12, name: "L5-2 Freilaufen", leitfrage: F5, folge_nr: 2, ordnung: "4+1", tags: [], bloecke: bl }], trainingsblock: [],
    trainingsplan: (u, req) => { if (req.method() === "POST") { plan = JSON.parse(req.postData() || "null"); return { status: 201, body: "[]" }; }
      if (/datum=gte/.test(u.search)) return [];
      if (!plan || !decodeURIComponent(u.search).includes(plan.datum)) return [];
      if (/select=slots/.test(u.search)) return [{ slots: plan.slots || [] }]; if (/select=plan/.test(u.search)) return [{ plan: plan.plan || [] }]; return [plan]; },
    periodisierung: () => [{ monat: datum.slice(0, 7), leitfrage: F5 }] }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ datum }) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    const sichtbar = e => !!e && e.offsetParent !== null && getComputedStyle(e).display !== "none";
    try { localStorage.removeItem("adler_tps_zu_" + datum); } catch (e) {}
    await loadKader();
    const f = document.getElementById("tp-date"); if (![...f.options].some(o => o.value === datum)) f.add(new Option(datum, datum)); f.value = datum;
    await tpTrainerRsvpLaden(datum); await tpPlanRestore(datum); for (let i = 0; i < 30 && !document.getElementById("tps-haupt"); i++) await w(100);
    window.frageJaNein = async () => true;
    const out = {};
    out.c0 = { anpassen: !!document.getElementById("tp-anpassen-knopf"), fuellenLeer: sichtbar(document.getElementById("tp-fuellen")),
      link: Math.round(document.getElementById("tp-andere-vorlage")?.getBoundingClientRect().height || 0) };
    await tpStartRender(datum); await w(200);
    await tpaBauen(datum); await w(600);
    tpStartZeigen(datum); await w(300);   // gebaut = gespeichert → Übersicht; Kacheln und Blockköpfe unter „Plan ändern“
    // a) Kacheln
    const kach = [...document.querySelectorAll(".tps-ablauf>div")];
    out.a = { n: kach.length, raus: kach.filter(k => k.scrollWidth > k.clientWidth + 1).map(txt) };
    out.c1 = { fuellenVoll: sichtbar(document.getElementById("tp-fuellen")) };
    // d) Blockkopf
    const si = tpSlots.findIndex(x => x.typ === "main"), kopf = document.querySelector(`.tp-slot[data-si="${si}"] .tp-slot-head`);
    const mehr = kopf && kopf.querySelector(".tp-mehr");
    out.d = { mehr: mehr ? Math.round(Math.min(mehr.offsetWidth, mehr.offsetHeight)) : 0,
      raus: [...document.querySelectorAll(".tp-slot-head")].some(k => { const b = k.getBoundingClientRect(); return [...k.querySelectorAll("*")].some(c => c.offsetParent && c.getBoundingClientRect().right > b.right + 1); }) };
    mehr.click(); await w(100);
    out.d.menu = [...document.querySelectorAll("#tp-block-menu button")].map(txt);
    out.d.fokus = document.activeElement && document.activeElement.closest("#tp-block-menu") ? true : false;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await w(100);
    out.d.zu = !document.getElementById("tp-block-menu");
    const wi = tpSlots.findIndex(x => x.typ === "warmup"); tpSetDauer(wi, 10); await w(100);
    tpDauerSchritt(wi, 1); await w(100); const d1 = tpSlots[wi].dauer; tpDauerSchritt(wi, -1); await w(100);
    out.d.schritt = [d1, tpSlots[wi].dauer];
    const k = document.querySelector(`.tp-slot[data-si="${wi}"] .tp-dauer-k`); out.d.k = k ? Math.round(k.getBoundingClientRect().height) : 0;
    // b) Speichern → zugeklappt
    out.b0 = !!document.getElementById("tps-haupt");
    await tpPlanSave(true); await w(400);
    const zu = document.getElementById("tps-fertig"), tl = document.getElementById("tp-timeline");
    out.b = { zu: txt(zu && zu.querySelector(".tpu-ok")), haupt: !!document.getElementById("tps-haupt"), bloecke: zu ? zu.querySelectorAll(".tpu-b").length : 0,
      start: Math.round(document.getElementById("tpu-start")?.getBoundingClientRect().height || 0), editorWeg: !sichtbar(tl) && !sichtbar(document.getElementById("tp-add-slot")) };
    document.getElementById("tps-zeigen")?.click(); await w(300);
    out.b.offen = !!document.getElementById("tps-haupt") && !!document.getElementById("tps-einklappen") && sichtbar(document.getElementById("tp-timeline"));
    document.getElementById("tps-einklappen")?.click(); await w(300);
    out.b.wiederZu = !!document.getElementById("tps-fertig") && !document.getElementById("tps-haupt") && !sichtbar(document.getElementById("tp-timeline"));
    // e) Trainingsansicht – mit zwei Trainern an den Feldern, ich bin der erste
    const st = _tlSnapshot(), haupt = st.findIndex(x => x.gruppen.length > 1);
    out.e = { haupt };
    if (haupt >= 0) {
      const ids = tpWahlFelder(tpSlots.findIndex(x => x.typ === "main")); ids.forEach((id, i) => { tpCoaches[id] = i === 0 ? "Trainer Eins" : "Trainer Zwei"; });
      _meTrainer = "Trainer Eins";
      document.getElementById("tpu-start").click(); await w(400);
      const ov = document.getElementById("ta-ov");
      out.e.dialog = ov && ov.getAttribute("role") === "dialog" && ov.getAttribute("aria-modal") === "true";
      out.e.kopf = txt(ov && ov.querySelector(".ta-top"));
      out.e.knoepfe = [...ov.querySelectorAll(".ta-knoepfe button")].map(b => Math.round(b.getBoundingClientRect().height));
      for (let i = 0; i < haupt; i++) { taWeiter(1); await w(50); }
      out.e.karten = document.querySelectorAll("#ta-ov .ta-karte").length;
      out.e.eigen = txt(document.querySelector("#ta-ov .ta-karte .ta-kl"));
      document.getElementById("ta-alle")?.click(); await w(100);
      out.e.alle = document.querySelectorAll("#ta-ov .ta-karte").length;
      taStartPause(); await w(1200); out.e.uhr = txt(document.getElementById("ta-uhr"));
      for (let i = 0; i < 10; i++) taWeiter(1); await w(100);
      out.e.ende = /Training geschafft/.test(txt(document.getElementById("ta-ov")));
      document.querySelector("#ta-ov .ta-x").click(); await w(100);
      out.e.zu = !document.getElementById("ta-ov");
    }
    out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
    return out;
  }, { datum }).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (r.a.n !== 3 || r.a.raus.length) probleme.push(`a) Kacheln ${r.a.n}, ragen hinaus: ${r.a.raus.join(" | ")}`);
    if (!r.b0 || !/Training steht/.test(r.b.zu) || !/gespeichert \d\d:\d\d/.test(r.b.zu) || r.b.haupt || r.b.bloecke !== 3 || r.b.start < 56 || !r.b.editorWeg) probleme.push("b) Übersicht " + JSON.stringify(r.b));
    if (!r.b.offen || !r.b.wiederZu) probleme.push(`b) Plan ändern ${r.b.offen}, zurück zur Übersicht ${r.b.wiederZu}`);
    const e = r.e || {};
    if (e.haupt < 0) probleme.push("e) kein Block mit mehreren Feldern");
    else {
      if (!e.dialog || !/Block 1 von 3/.test(e.kopf) || (e.knoepfe || []).length !== 3 || e.knoepfe.some(x => x < 48)) probleme.push("e) Ansicht " + JSON.stringify({ dialog: e.dialog, kopf: e.kopf, knoepfe: e.knoepfe }));
      if (e.karten !== 1 || !/Deine Übung/.test(e.eigen) || e.alle < 2) probleme.push(`e) nur eigene Gruppe: ${e.karten} Karte(n) „${e.eigen}“, alle ${e.alle}`);
      if (!/^\d+:\d\d$/.test(e.uhr || "") || !e.ende || !e.zu) probleme.push(`e) Uhr „${e.uhr}“, Ende ${e.ende}, ✕ ${e.zu}`);
    }
    if (r.c0.anpassen) probleme.push("c) „Plan anpassen“ noch da");
    if (!r.c0.fuellenLeer || r.c1.fuellenVoll) probleme.push(`c) „Training füllen“ leer ${r.c0.fuellenLeer}, mit Plan ${r.c1.fuellenVoll}`);
    if (r.c0.link < 44) probleme.push("c) „Andere Vorlage wählen“ " + r.c0.link + " px");
    if (r.d.mehr < 44 || r.d.k < 44) probleme.push(`d) ⋯ ${r.d.mehr} px, − / + ${r.d.k} px`);
    if (JSON.stringify(r.d.menu.map(x => x.replace(/^[^A-Za-zÄÖÜ]+/, ""))) !== JSON.stringify(["Nach oben", "Nach unten", "Block löschen"]) || !r.d.fokus || !r.d.zu) probleme.push(`d) Menü ${JSON.stringify(r.d.menu)}, Fokus ${r.d.fokus}, Escape ${r.d.zu}`);
    if (JSON.stringify(r.d.schritt) !== "[15,10]") probleme.push("d) − / + " + JSON.stringify(r.d.schritt));
    if (r.d.raus || r.quer) probleme.push(`d) ragt hinaus: Kopf ${r.d.raus}, Seite ${r.quer}`);
  }
  const fehler = fe.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) 3 Kacheln ohne Überstand · b) „${String((r.b || {}).zu || "").slice(0, 50)}“, ${(r.b || {}).bloecke} Blöcke, Editor aus, „Plan ändern“ zeigt ihn`);
  zeilen.push(`e) Trainingsansicht „${String((r.e || {}).kopf || "").slice(0, 40)}“, eigene Gruppe ${(r.e || {}).karten}/${(r.e || {}).alle}, Uhr ${(r.e || {}).uhr}, Ende und ✕`);
  zeilen.push(`c) kein „Plan anpassen“, „Training füllen“ nur leer, Link ${(r.c0 || {}).link} px · d) ⋯ ${(r.d || {}).mehr} px, Menü ${((r.d || {}).menu || []).length} Einträge, − / + ${JSON.stringify((r.d || {}).schritt)}`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
