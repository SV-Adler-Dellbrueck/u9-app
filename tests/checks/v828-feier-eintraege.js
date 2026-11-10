/* v828 · Beitragsliste für die Weihnachtsfeier (Auftrag Charles 10.11.2026).
   Eltern tragen im Termin „Weihnachtsfeier“ ein, was sie mitbringen: 14 feste Plätze
   (13 Kategorien, Salat doppelt mit Sorte) plus eigene Beiträge im Abschnitt „Zusätzlich“.
   Die Datenbank-Regeln (Unique, RLS, Trigger) prüft die Probe gegen die echte Datenbank – hier
   wird gemessen, was die Oberfläche daraus macht.

   a) Alle 14 Plätze stehen da, 13 Kategorien, Salat 1 und 2; Zustand frei/vergeben mit Name.
   b) Salat-Dialog: genau drei Sorten, genau eine Hauptaktion (56 px), alles andere mind. 48 px,
      Hinweis „keine Vor- und Nachnamen von Kindern“. Eintragen sendet den richtigen Körper
      (ohne erstellt_von), Ändern sendet nur die Sorte, Entfernen gibt den Platz wieder frei.
   c) Fremde Einträge: kein Knopf.
   d) Zwei Familien, ein Platz: die Datenbank antwortet 409 – die App sagt „Dieser Platz ist gerade
      vergeben“ und lädt neu (der Platz steht danach als vergeben da).
   e) Freitext: leer wird nicht gesendet, mehr als 80 Zeichen nicht, nach dem dritten ist der Knopf zu.
   f) 360 px: kein waagerechtes Scrollen, auch mit offenem Dialog.
   g) Trainer: sieht Entfernen an jedem Eintrag und löscht einen fremden.
   h) Andere Termine zeigen keine Liste. */
"use strict";
module.exports = async function (h) {
  const titel = "v828 Beitragsliste Weihnachtsfeier: 14 Plätze, Eintragen/Ändern/Entfernen, Doppelbelegung, Freitext, 360 px";
  const probleme = [], zeilen = [];
  const FEIER = { id: 70, datum: "2026-12-07", uhrzeit: "18:15", uhrzeit_ende: "20:00", typ: "event", titel: "Weihnachtsfeier", ort: "Vereinsheim", mitbringen: false, eltern_turnier: false, trainer_status: {} };
  const ANDERES = { ...FEIER, id: 71, titel: "Elternaustausch" };

  /* In-Memory-Datenbank mit den Regeln der Migration: Unique auf dem Platz (409), höchstens drei Freitexte. */
  const bauen = () => {
    const db = { zeilen: [{ id: 1, feier_key: "weihnachten-2026", slot_key: "salat", slot_nr: 1, auswahl: "Nudelsalat", freitext: null, anzeige_name: "Familie X", erstellt_von: "u9" }], naechste: 2, konflikt: null, log: [] };
    db.antwort = (u, req) => {
      const m = req.method(), id = Number((String(u.search).match(/id=eq\.(\d+)/) || [])[1]);
      if (m === "POST") {
        const b = JSON.parse(req.postData() || "{}"); db.log.push({ m, b });
        if (db.konflikt && b.slot_key === db.konflikt) { db.zeilen.push({ id: db.naechste++, feier_key: b.feier_key, slot_key: b.slot_key, slot_nr: b.slot_nr, auswahl: null, freitext: null, anzeige_name: "Familie Y", erstellt_von: "u8" }); return { status: 409, body: JSON.stringify({ code: "23505", message: "duplicate key value violates unique constraint" }) }; }
        if (b.slot_key && db.zeilen.some(x => x.slot_key === b.slot_key && x.slot_nr === b.slot_nr)) return { status: 409, body: JSON.stringify({ code: "23505" }) };
        if (b.freitext && db.zeilen.filter(x => x.freitext && x.erstellt_von === "u1").length >= 3) return { status: 400, body: JSON.stringify({ code: "23514", message: "feier_freitext_limit" }) };
        db.zeilen.push({ id: db.naechste++, feier_key: b.feier_key, slot_key: b.slot_key || null, slot_nr: b.slot_nr || null, auswahl: b.auswahl || null, freitext: b.freitext || null, anzeige_name: b.anzeige_name, erstellt_von: "u1" });
        return { status: 201, body: "" };
      }
      if (m === "PATCH") { const b = JSON.parse(req.postData() || "{}"); db.log.push({ m, b }); const z = db.zeilen.find(x => x.id === id); if (z) z.auswahl = b.auswahl; return { status: 204, body: "" }; }
      if (m === "DELETE") { db.log.push({ m, id }); db.zeilen = db.zeilen.filter(x => x.id !== id); return { status: 204, body: "" }; }
      return db.zeilen;
    };
    return db;
  };

  // ── Eltern ──
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const db = bauen(); db.konflikt = "frikadellen";   // Frikadellen: eine andere Familie war schneller (Teil d)
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 360, hoehe: 800,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: [FEIER, ANDERES], rueckmeldungen: [], feier_eintraege: (u, req) => db.antwort(u, req) }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4000);

  const r = await e.page.evaluate(async ([feier, anderes]) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof feierLoad !== "function") return { alt: true };
    for (const t of [feier, anderes]) if (!(ELTERN_TERMINE || []).some(x => x.id === t.id)) ELTERN_TERMINE.push(t);
    const out = {};
    const box = () => document.getElementById("td-feier");
    const text = () => (document.getElementById("toast") || document.querySelector(".toast") || { textContent: "" }).textContent;
    const zeilen = () => [...document.querySelectorAll("#td-feier .feier-zeile:not(.feier-zusatz)")];
    const warte = async f => { for (let i = 0; i < 40 && !f(); i++) await w(150); };

    // h) anderer Termin: keine Liste
    await terminDetailOpen(anderes.id); await w(600);
    out.andereListe = !!document.getElementById("td-feier");
    document.getElementById("td-modal")?.remove();

    // a) Plätze
    await terminDetailOpen(feier.id); await warte(() => box() && box().querySelector(".feier-block"));
    out.block = !!(box() && box().querySelector(".feier-block"));
    out.plaetze = zeilen().length;
    out.kategorien = new Set(zeilen().map(z => z.dataset.slot.replace(/-\d+$/, ""))).size;
    out.namen = zeilen().map(z => (z.querySelector("b") || {}).textContent);
    out.frei = zeilen().filter(z => z.classList.contains("feier-frei")).length;
    out.salat1 = (zeilen()[0] || {}).innerText || "";
    if (out.plaetze !== 14) { out.abbruch = (box() ? box().innerHTML.slice(0, 200) : "kein #td-feier") + " | Toast: " + document.body.innerText.slice(0, 80); return out; }
    out.fremdKnopf = !!(zeilen()[0] && zeilen()[0].querySelector("button"));
    out.zusatzUeberschrift = /Zusätzlich/.test(box().innerText);
    const hoch = [...box().querySelectorAll("button")].filter(b => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 47.5).map(b => (b.textContent || "").trim().slice(0, 18));
    out.kleineKnoepfe = hoch;

    // b) Salat 2 eintragen
    zeilen()[1].click(); await w(300);
    const dlg = () => document.getElementById("feier-dialog");
    out.dialog = !!dlg() && dlg().getAttribute("role") === "dialog" && dlg().getAttribute("aria-modal") === "true";
    out.sorten = dlg() ? [...dlg().querySelectorAll("#feier-sorte option")].map(o => o.value) : [];
    out.hinweis = dlg() ? /keine Vor- und Nachnamen von Kindern/i.test(dlg().innerText) : false;
    const bd = dlg() ? [...dlg().querySelectorAll("button, input, select")].map(x => ({ h: Math.round(x.getBoundingClientRect().height), t: (x.textContent || x.placeholder || x.id).trim().slice(0, 14) })) : [];
    out.haupt = bd.filter(x => x.h === 56).length;
    out.zuKlein = bd.filter(x => x.h < 48 && x.h !== 56).map(x => x.t + ":" + x.h);
    out.breite360 = document.documentElement.scrollWidth <= 360;
    // leerer Name wird nicht gesendet
    dlg().querySelector("#feier-name").value = ""; dlg().querySelector("#feier-ok").click(); await w(300);
    out.leerBlockiert = !!dlg();
    dlg().querySelector("#feier-name").value = "Familie M."; dlg().querySelector("#feier-sorte").value = "Kartoffelsalat"; dlg().querySelector("#feier-ok").click();
    await warte(() => !dlg()); await w(500);
    out.nachEintragen = zeilen()[1].innerText;
    out.eigeneKnoepfe = [...zeilen()[1].querySelectorAll("button")].map(b => b.textContent.trim());

    if (!zeilen()[1].querySelector("button")) { out.abbruch = "nach Eintragen: " + zeilen()[1].innerText.replace(/\s+/g, " ") + " | uid " + feierEigeneId(); return out; }
    // b2) Ändern
    [...zeilen()[1].querySelectorAll("button")].find(b => /Ändern/.test(b.textContent)).click(); await w(400);
    dlg().querySelector("#feier-sorte").value = "Überraschung"; dlg().querySelector("#feier-ok").click();
    await warte(() => !dlg()); await w(500);
    out.nachAendern = zeilen()[1].innerText;

    // b3) Entfernen → Platz wieder frei und neu wählbar
    [...zeilen()[1].querySelectorAll("button")].find(b => /Entfernen/.test(b.textContent)).click(); await w(300);
    document.getElementById("frage-ja").click(); await w(700);
    out.nachEntfernen = zeilen()[1].classList.contains("feier-frei");
    zeilen()[1].click(); await w(300);
    dlg().querySelector("#feier-name").value = "Familie M."; dlg().querySelector("#feier-ok").click();
    await warte(() => !dlg()); await w(500);
    out.wiederBelegt = zeilen()[1].classList.contains("feier-belegt");

    // d) Doppelbelegung
    zeilen()[2].click(); await w(300);
    dlg().querySelector("#feier-name").value = "Familie M."; dlg().querySelector("#feier-ok").click();
    await warte(() => !dlg()); await w(700);
    out.konfliktToast = (document.body.innerText.match(/Dieser Platz ist gerade vergeben/) || [""])[0];
    out.nachKonflikt = zeilen()[2].classList.contains("feier-belegt") && /Familie Y/.test(zeilen()[2].innerText);

    // e) Freitext
    const frei = () => box().querySelector(".feier-frei-neu");
    frei().click(); await w(300);
    dlg().querySelector("#feier-name").value = "Familie M."; dlg().querySelector("#feier-text").value = "   "; dlg().querySelector("#feier-ok").click(); await w(300);
    out.leerFreitext = !!dlg();
    out.maxlaenge = dlg().querySelector("#feier-text").maxLength;
    dlg().querySelector("#feier-text").value = "x".repeat(81); dlg().querySelector("#feier-ok").click(); await w(300);
    out.zuLang = !!dlg();
    for (const t of ["Pavillon", "Würstchen", "Servietten"]) {
      if (!dlg()) { frei().click(); await w(300); dlg().querySelector("#feier-name").value = "Familie M."; }
      dlg().querySelector("#feier-text").value = t; dlg().querySelector("#feier-ok").click(); await warte(() => !dlg()); await w(500);
    }
    out.zusatz = [...box().querySelectorAll(".feier-zusatz b")].map(b => b.textContent);
    out.vierterZu = frei().disabled;
    out.zeilenEnde = zeilen().length;
    return out;
  }, [FEIER, ANDERES]).catch(err => ({ fehler: String(err) }));
  const gesendet = db.log.slice();
  const f = e.fehler(); await e.schliessen();
  if (f.length) probleme.push("Konsole (Eltern): " + f.slice(0, 2).join(" | "));
  if (r.alt) return h.ergebnis(titel, false, ["keine Beitragsliste (Stand vor v828)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (r.abbruch) probleme.push("Block fehlt: " + r.abbruch);
  if (r.andereListe) probleme.push("h) ein anderer Termin zeigt die Liste");
  if (r.abbruch) return h.ergebnis(titel, false, probleme);
  if (!r.block) probleme.push("a) kein Block im Termin");
  if (r.plaetze !== 14 || r.kategorien !== 13) probleme.push(`a) ${r.plaetze} Plätze, ${r.kategorien} Kategorien (erwartet 14 / 13)`);
  if (!/^Salat 1/.test(r.namen[0]) || r.namen[1] !== "Salat 2") probleme.push("a) Salat heißt " + r.namen.slice(0, 2).join(", "));
  if (r.frei !== 13 || !/vergeben/.test(r.salat1) || !/Familie X/.test(r.salat1) || !/Nudelsalat/.test(r.salat1)) probleme.push("a) Zustand frei/vergeben: " + r.frei + " frei, Salat 1: " + r.salat1.replace(/\s+/g, " "));
  if (!r.zusatzUeberschrift) probleme.push("a) Abschnitt „Zusätzlich“ fehlt");
  if (r.fremdKnopf) probleme.push("c) fremder Eintrag hat einen Knopf");
  if (r.kleineKnoepfe.length) probleme.push("Bedienelemente unter 48 px: " + r.kleineKnoepfe.join(", "));
  if (!r.dialog) probleme.push("b) Dialog ohne role/aria-modal");
  if (r.sorten.join("|") !== "Nudelsalat|Kartoffelsalat|Überraschung") probleme.push("b) Sorten: " + r.sorten.join("|"));
  if (!r.hinweis) probleme.push("b) Hinweis zu Kindernamen fehlt");
  if (r.haupt !== 1) probleme.push("b) " + r.haupt + " Hauptaktionen (56 px) im Dialog statt 1");
  if (r.zuKlein.length) probleme.push("b) im Dialog unter 48 px: " + r.zuKlein.join(", "));
  if (!r.leerBlockiert) probleme.push("b) leerer Name wurde gesendet");
  if (!/vergeben/.test(r.nachEintragen) || !/Kartoffelsalat/.test(r.nachEintragen) || !/das bist du/.test(r.nachEintragen)) probleme.push("b) nach Eintragen: " + r.nachEintragen.replace(/\s+/g, " "));
  if (r.eigeneKnoepfe.join("|") !== "Ändern|Entfernen") probleme.push("b) eigene Knöpfe: " + r.eigeneKnoepfe.join("|"));
  if (!/Überraschung/.test(r.nachAendern)) probleme.push("b) Ändern: " + r.nachAendern.replace(/\s+/g, " "));
  if (!r.nachEntfernen || !r.wiederBelegt) probleme.push(`b) Platz nach Entfernen frei ${r.nachEntfernen}, neu wählbar ${r.wiederBelegt}`);
  if (r.konfliktToast !== "Dieser Platz ist gerade vergeben" || !r.nachKonflikt) probleme.push("d) Doppelbelegung: " + JSON.stringify([r.konfliktToast, r.nachKonflikt]));
  if (!r.leerFreitext || !r.zuLang || r.maxlaenge !== 80) probleme.push(`e) leer ${r.leerFreitext}, zu lang ${r.zuLang}, maxlength ${r.maxlaenge}`);
  if (r.zusatz.join("|") !== "Pavillon|Würstchen|Servietten" || !r.vierterZu) probleme.push("e) Zusätzlich: " + r.zusatz.join("|") + ", vierter zu " + r.vierterZu);
  if (!r.breite360) probleme.push("f) waagerechtes Scrollen bei 360 px");
  const posts = gesendet.filter(x => x.m === "POST").map(x => x.b);
  const sal = posts.find(p => p.slot_key === "salat");
  if (!sal || sal.slot_nr !== 2 || sal.auswahl !== "Kartoffelsalat" || sal.anzeige_name !== "Familie M." || sal.feier_key !== "weihnachten-2026" || posts.some(p => "erstellt_von" in p)) probleme.push("b) gesendet: " + JSON.stringify(sal));
  if (!gesendet.some(x => x.m === "PATCH" && Object.keys(x.b).join() === "auswahl" && x.b.auswahl === "Überraschung")) probleme.push("b) Ändern sendet nicht nur die Sorte");
  if (gesendet.filter(x => x.m === "POST" && (x.b.freitext === "   " || (x.b.freitext || "").length > 80)).length) probleme.push("e) unzulässiger Freitext wurde gesendet");

  // ── Trainer: Entfernen an jedem Eintrag ──
  const db2 = bauen();
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 2000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [FEIER], feier_eintraege: (u, req) => db2.antwort(u, req) }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const t = await s.page.evaluate(async t => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof feierTrainerOeffnen !== "function"; i++) await w(100);
    feierTrainerOeffnen(t); await w(1200);
    const z = () => [...document.querySelectorAll("#feier-trainer-box .feier-belegt")];
    const out = { knopf: z().length && !!z()[0].querySelector("button") };
    [...z()[0].querySelectorAll("button")].find(b => /Entfernen/.test(b.textContent)).click(); await w(300);
    document.getElementById("frage-ja").click(); await w(800);
    out.nachher = z().length;
    return out;
  }, FEIER);
  const ft = s.fehler(); await s.schliessen();
  if (ft.length) probleme.push("Konsole (Trainer): " + ft.slice(0, 2).join(" | "));
  if (!t.knopf || t.nachher !== 0 || !db2.log.some(x => x.m === "DELETE" && x.id === 1)) probleme.push("g) Trainer löscht fremden Eintrag nicht: " + JSON.stringify(t));

  zeilen.push(`${r.plaetze} Plätze in ${r.kategorien} Kategorien · Eintragen/Ändern/Entfernen/Konflikt/Freitext geprüft · Trainer löscht fremden Eintrag`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
