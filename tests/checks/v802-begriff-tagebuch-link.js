/* v802 · drei Beschlüsse von Charles (07.11.):
   a) „Ein Begriff, 10-Minuten-Durchgänge“: Die Oberfläche sagt „Gruppen wechseln“ (nicht mehr „weiterrücken“ und „Durchgänge:
      1 (kein Wechsel)“), und „Training füllen“ legt bei zwei Stationen vier Blöcke à 10 Minuten an statt zwei à 20; bei drei Trainern bleibt es bei drei.
   b) „Spieltag-Tagebuch wie beim Training“: tbKontextSpiel liefert Spielform/Teams und die Kinder der Einteilung („dabei“) – ohne Namen im Eintrag,
      und der Vorschlag zu einem Spiel speichert sie mit.
   c) „Absage-Push direkt zur Liste“: ?absagen öffnet nach Login „Rückmelde-Verhalten“ im Reiter „Absagen“ bei „Jede Absage“. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [], K = h.KINDER;
  const d2 = h.tagePlus(3), d3 = h.tagePlus(4), spiel = h.tagePlus(5), posts = [];
  const termine = [
    { id: 91, datum: d2, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } },
    { id: 92, datum: d3, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } },
    { id: 93, datum: spiel, typ: "spiel", titel: "Pokalspiel", spielform: "f4", trainer_status: {} }];
  const nom = {}; K.slice(0, 5).forEach(n => { nom[n] = "dabei"; }); nom[K[5]] = "nicht";
  const s = await h.starten({ hoehe: 2600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen().map((z, i) => ({ ...z, alias: String.fromCharCode(65 + i) })), anwesenheit: [], periodisierung: [], trainingsvorlagen: [], trainingsformen: [],
    termine: u => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); const id = (u.searchParams.get("id") || "").replace(/^eq\./, ""); return termine.filter(t => (!d || t.datum === d) && (!id || String(t.id) === id)); },
    nominierungen: u => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
      if (d === spiel + "__nom") return [{ datum: d, data: nom }];
      if (d === spiel + "__teams") return [{ datum: d, data: { _anzahl: 2, _form: { 1: "f4", 2: "funino" } } }];
      return []; },
    trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
    trainingsplan: () => [],
    tagebuch_punkt: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : [],
    tagebuch_eintrag: (u, req) => { if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); posts.push(b); return { status: 201, body: JSON.stringify([{ id: 800, ...b }]) }; } return []; },
    rpc: { rueckmelde_statistik: [], rueckmelde_absagen: [{ spieler_id: 1, name: "Kind A", termin_id: 91, art: "training", datum: d2, titel: "Training", beginn: d2 + "T17:00:00Z", abgesagt_am: d2 + "T10:00:00Z", vorlauf_std: 7, genau: true, grund: "Fieber" }] }
  }) });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ d2, d3, spiel }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    await loadKader(); document.getElementById("pin-gate")?.remove();
    window.trainerMe = async () => "Charles"; if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    const feld = document.getElementById("tp-date");
    const datumSetzen = async d => { if (![...feld.options].some(o => o.value === d)) feld.add(new Option(d, d)); feld.value = d; await tpTrainerRsvpLaden(d); await tpPlanRestore(d); await w(200); };
    // a)
    tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await w(100);
    await datumSetzen(d2); await tpGenerate(); await w(300);
    out.zwei = tpSlots.filter(x => tpIstHauptteil(x.typ)).map(x => x.dauer);
    await datumSetzen(d3); tpSlots = [...TP_PHASEN]; tpRenderTimeline(); await w(100); await tpGenerate(); await w(300);
    out.drei = tpSlots.filter(x => tpIstHauptteil(x.typ)).map(x => x.dauer);
    const ui = document.getElementById("tp-timeline").textContent.replace(/\s+/g, " ");
    out.ui = { wechseln: /Gruppen wechseln/.test(ui), alt: /weiterrücken|weitergerückt|kein Wechsel/.test(ui) };
    // b)
    const t = { id: 93, datum: spiel, typ: "spiel", titel: "Pokalspiel", spielform: "f4" };
    out.kx = await tbKontextSpiel(t);
    const v = { baustein: "organisation", beobachtung: "Kind B war ruhig.", aha: null, konsequenzen: [], schlagworte: [], rueckfragen: [], todos: [] };
    out.id = await tbVorschlagSichern({ fuer: "t93", art: "spiel", v, diktat: "x", termin: t });
    // c)
    document.getElementById("rs-modal")?.remove();
    try { sessionStorage.setItem("adler_absagen_intent", "1"); } catch (e) {}
    absagenAbsichtJetzt(); await w(1800);
    const m = document.getElementById("rs-modal");
    out.link = { modal: !!m, absagenAktiv: !!(m && [...m.querySelectorAll("#rs-art button")].find(b => /Absagen/.test(b.textContent) && b.getAttribute("aria-pressed") === "true")), liste: !!document.getElementById("rs-einzeln"), grund: !!(m && /Fieber/.test(m.textContent)), weg: (() => { try { return sessionStorage.getItem("adler_absagen_intent") === null; } catch (e) { return true; } })() };
    return out;
  }, { d2, d3, spiel });
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.zwei.length !== 4 || r.zwei.some(x => x !== 10)) probleme.push("a) zwei Trainer: " + JSON.stringify(r.zwei) + " (erwartet 4 × 10)");
  if (r.drei.length !== 3) probleme.push("a) drei Trainer: " + JSON.stringify(r.drei) + " (erwartet 3 Blöcke)");
  if (!r.ui.wechseln || r.ui.alt) probleme.push("a) Begriff: " + JSON.stringify(r.ui));
  const kx = r.kx || {};
  if (!(kx.durchgefuehrt || []).some(x => /^Team 1 · /.test(x.name)) || !(kx.durchgefuehrt || []).some(x => /^Team 2 · /.test(x.name)) || (kx.anwesend || []).length !== 5) probleme.push("b) Kontext: " + JSON.stringify(kx));
  const e = posts.find(p => p.anlass === "spieltag") || {};
  if (!Array.isArray(e.durchgefuehrt) || !e.durchgefuehrt.length || !Array.isArray(e.anwesend) || e.anwesend.length !== 5 || /Kind [A-O]\b/.test(JSON.stringify(e.durchgefuehrt))) probleme.push("b) Eintrag: " + JSON.stringify(e).slice(0, 200));
  if (!r.link.modal || !r.link.absagenAktiv || !r.link.liste || !r.link.grund || !r.link.weg) probleme.push("c) Absagen-Link: " + JSON.stringify(r.link));
  zeilen.push(`Füllen: 2 Trainer → ${r.zwei.join("+")} Min., 3 Trainer → ${r.drei.length} Blöcke; Begriff „Gruppen wechseln“; Spiel-Kontext: ${(kx.durchgefuehrt || []).map(x => x.name).join(" / ")} · ${(kx.anwesend || []).length} Kinder; ?absagen öffnet die Liste mit Grund`);
  return h.ergebnis("v802 Begriff, Spieltag-Tagebuch, Absage-Link", !probleme.length, probleme.length ? probleme : zeilen);
};
