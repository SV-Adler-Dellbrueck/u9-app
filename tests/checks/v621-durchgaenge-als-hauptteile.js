/* v621 · PO (Bildschirmfoto Trainingsplan): „Wenn ich den Hauptteil 1 durchplane, zum Beispiel
   mit zwei Übungen, dann den zweiten Durchgang im zweiten Hauptteil habe, sodass ich am Ende
   auch in der Bewertung zwei Hauptteile habe, die sich dann zeitlich entsprechend anpassen.
   … So wie es jetzt ist, teilt er die vorhandene Zeit im Hauptteil auf die zwei Runden auf und
   der zweite Hauptteil bleibt weiterhin bestehen." Rückfrage „kein folgender Hauptteil“:
   „Neuen Hauptteil anlegen“.

   a) Sein Plan: Hauptteil 1 (12′, zwei Stationen, Charles/Peter), Hauptteil 2 (12′, leer),
      Abschluss (18′). „2 Durchgänge“ an Hauptteil 1 → Hauptteil 2 ist Durchgang 2: dieselben
      Übungen und Trainer je Station, die Gruppen getauscht, beide 12′, Gesamtzeit gleich; im
      gespeicherten Plan stehen Übungen für BEIDE Hauptteile (→ „Einheit bewerten“).
   b) Übung an Station 1 in Hauptteil 1 geändert → Durchgang 2 zieht mit.
   c) Eigene Übung in Durchgang 2 bleibt, auch wenn Hauptteil 1 sich an dieser Station ändert.
   d) Kein folgender Hauptteil → einer wird mit gleicher Dauer angelegt, die Gesamtzeit wächst,
      die App sagt es.
   e) Zurück auf 1 → der angelegte Durchgang verschwindet wieder, die Zeit stimmt wieder.
   f) Ein Plan alter Art (durchgaenge: 2 an Hauptteil 1) wird beim Öffnen zur Kette – keine
      halbierten Zeiten mehr. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const kuenftig = h.tagePlus(2);
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ kuenftig }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    if (typeof _tpKetteVon !== "function") return { fehlt: true };
    await loadKader();
    const T = TRAINER.slice(0, 2);
    let box = document.getElementById("tp-trainer-checks"); if (!box) { box = document.createElement("div"); box.id = "tp-trainer-checks"; document.body.appendChild(box); }
    TP_RSVP = {}; T.forEach(t => TP_RSVP[t] = "ja"); TP_TRAINER_MANUELL = {}; tpTrainerChipsRender();
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === kuenftig)) feld.add(new Option(kuenftig, kuenftig));
    if (feld) feld.value = kuenftig;
    const aktiv = KADER.filter(k => k.aktiv !== false).map(k => k.name);
    TP_KIND_RSVP = null; TP_KIND_ABSAGE = [];
    _tgCache = { datum: kuenftig, geladen: true, tg: { gruppen: [
      { emo: "🔵", name: "Blaue Haie", farbe: "#2563eb", trainer: T[0], kinder: aktiv.filter((_, i) => i % 2 === 0) },
      { emo: "🔴", name: "Rote Füchse", farbe: "#dc2626", trainer: T[1], kinder: aktiv.filter((_, i) => i % 2 === 1) }], ausAnwesenheit: false, quelle: "kader" } };
    const gesamt = () => Number(document.querySelector("#tp-timeline").textContent.match(/Gesamt: (\d+)/)?.[1]);
    const w = id => document.getElementById(id)?.value || "";
    const waehle = (id, i) => { const x = document.getElementById(id); x.value = x.options[i].value; tpOnSelectChange(x); return x.value; };
    const toasts = []; const _t = window.toast; window.toast = (m, k) => { toasts.push(String(m)); try { _t(m, k); } catch (e) {} };

    // a) sein Plan
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Hauptteil 1 – Stationen", dauer: 12, typ: "main" });
    tpSlots.push({ label: "Hauptteil 2 – Gruppen wechseln", dauer: 12, typ: "main" });
    tpSlots.push({ label: "Abschlussturnier", dauer: 18, typ: "abschluss" });
    tpRenderTimeline();
    const g0 = gesamt();
    const u0 = waehle("tp-form-0-0", 3), u1 = waehle("tp-form-0-1", 4);
    tpSetCoach("tp-form-0-0", T[0]); tpSetCoach("tp-form-0-1", T[1]);
    tpDurchgaengeSetzen(0, 2); await warte(50);
    const snap = _tlSnapshot();
    out.a = { slots: tpSlots.map(x => x.label + " " + x.dauer), g0, g1: gesamt(), h2: [w("tp-form-1-0"), w("tp-form-1-1")], u: [u0, u1],
      trainer: [tpCoaches["tp-form-1-0"], tpCoaches["tp-form-1-1"]], T,
      hinweis: (document.querySelector('.tp-slot[data-si="1"] .tp-durchgang-von') || {}).textContent || "",
      gruppe1: snap.filter(x => /Hauptteil/.test(x.label)).map(x => x.gruppen[0] && x.gruppen[0].gruppe),
      bloecke: [...new Set(tpPlanEntries().map(e => e.block))].sort() };
    // b) Kopf ändert Station 1
    const u0b = waehle("tp-form-0-0", 5);
    out.b = { kopf: u0b, folge: w("tp-form-1-0") };
    // c) eigene Übung im Durchgang, dann Kopf ändern
    const eigen = waehle("tp-form-1-1", 6); waehle("tp-form-0-1", 7);
    out.c = { eigen, folge: w("tp-form-1-1") };
    // d) kein folgender Hauptteil
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Stationen", dauer: 15, typ: "main" });
    tpSlots.push({ label: "Abschlussturnier", dauer: 20, typ: "abschluss" });
    tpRenderTimeline(); waehle("tp-form-0-0", 3);
    const gd0 = gesamt(); toasts.length = 0;
    tpDurchgaengeSetzen(0, 2); await warte(50);
    out.d = { slots: tpSlots.map(x => x.label + " " + x.dauer), g0: gd0, g1: gesamt(), toast: toasts.join(" | "), erbt: w("tp-form-1-0") };
    // e) zurück auf 1
    tpDurchgaengeSetzen(0, 1); await warte(50);
    out.e = { slots: tpSlots.map(x => x.label + " " + x.dauer), g: gesamt() };
    // f) alter Plan
    tpSlots.length = 0; tpCoaches = {};
    tpSlots.push({ label: "Hauptteil 1", dauer: 12, typ: "main", durchgaenge: 2 });
    tpSlots.push({ label: "Hauptteil 2", dauer: 12, typ: "main" });
    tpRenderTimeline(); await warte(80);
    out.f = { slots: tpSlots.map(x => x.label + " " + x.dauer + (x.kette ? " K" : "")), halb: /je 6 Min/.test(document.querySelector("#tp-timeline").textContent) };
    window.toast = _t;
    return out;
  }, { kuenftig });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v621 Durchgänge als eigene Hauptteile", false, ["_tpKetteVon fehlt"]);
  const a = r.a;
  if (a.slots.length !== 3) probleme.push(`a) ${a.slots.length} Blöcke statt 3 – es wurde ein Hauptteil angelegt, obwohl einer folgt: ${a.slots.join(" · ")}`);
  if (!/ 12$/.test(a.slots[0]) || !/ 12$/.test(a.slots[1])) probleme.push(`a) Dauer nicht je 12′: ${a.slots.join(" · ")}`);
  if (a.g1 !== a.g0) probleme.push(`a) Gesamtzeit ${a.g0} → ${a.g1}`);
  if (a.h2[0] !== a.u[0] || a.h2[1] !== a.u[1]) probleme.push(`a) Durchgang 2 hat nicht die Übungen von Hauptteil 1 (${a.h2} statt ${a.u})`);
  if (a.trainer[0] !== a.T[0] || a.trainer[1] !== a.T[1]) probleme.push(`a) Trainer je Station nicht übernommen: ${a.trainer}`);
  if (!/Durchgang 2 von 2/.test(a.hinweis)) probleme.push(`a) Hinweis „Durchgang 2 von 2“ fehlt: „${a.hinweis}“`);
  if (a.gruppe1.length < 2 || a.gruppe1[0] === a.gruppe1[1]) probleme.push(`a) an Station 1 steht in beiden Hauptteilen dieselbe Gruppe: ${a.gruppe1}`);
  if (!(a.bloecke.includes(0) && a.bloecke.includes(1))) probleme.push(`a) im Plan (→ Bewertung) stehen Übungen nur für Block ${a.bloecke}`);
  if (r.b.folge !== r.b.kopf) probleme.push("b) Durchgang 2 zieht die geänderte Übung nicht mit");
  if (r.c.folge !== r.c.eigen) probleme.push("c) die eigene Übung im Durchgang wurde überschrieben");
  if (r.d.slots.length !== 3 || !/Durchgang 2 15$/.test(r.d.slots[1])) probleme.push(`d) kein Durchgang mit 15′ angelegt: ${r.d.slots.join(" · ")}`);
  if (r.d.g1 !== r.d.g0 + 15) probleme.push(`d) Gesamtzeit ${r.d.g0} → ${r.d.g1} statt +15`);
  if (!/dauert jetzt/.test(r.d.toast)) probleme.push(`d) die App sagt nicht, dass die Einheit länger wird („${r.d.toast}“)`);
  if (!r.d.erbt) probleme.push("d) der angelegte Durchgang hat die Übung nicht übernommen");
  if (r.e.slots.length !== 2 || r.e.g !== r.d.g0) probleme.push(`e) zurück auf 1: ${r.e.slots.join(" · ")}, Gesamt ${r.e.g}`);
  if (r.f.halb || !r.f.slots.every(x => / K$/.test(x))) probleme.push(`f) alter Plan nicht umgestellt: ${r.f.slots.join(" · ")}${r.f.halb ? " (noch „je 6 Min.“)" : ""}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) ${a.slots.join(" · ")} · Gesamt ${a.g0}→${a.g1} · Station 1: ${a.gruppe1.join(" → ")} · Bewertung: Blöcke ${a.bloecke.join(",")}`);
  zeilen.push(`d) ${r.d.slots.join(" · ")} · Gesamt ${r.d.g0}→${r.d.g1} · „${r.d.toast}“ · e) ${r.e.slots.join(" · ")} · f) ${r.f.slots.join(" · ")}`);
  return h.ergebnis("v621 Durchgänge als eigene Hauptteile – volle Zeit je Durchgang, zwei Hauptteile in der Bewertung", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
