/* v857 · Trainingsplan kürzen (Bestandsaufnahme 2.4, Charles 18.11.2026).
   a) Ein gefüllter Plan zeigt jeden Block als Kopf plus eine Zeile mit seinen Übungen; die Zeitleiste ist
      höchstens halb so lang wie aufgeklappt. Die Auswahlfelder bleiben im DOM und behalten ihre Werte.
   b) Tipp auf den Pfeil klappt einen Block auf (aria-expanded), „Alle aufklappen“ alle; die Knöpfe sind ≥ 44 px.
   c) Ein Block, in dem eine Übung fehlt, bleibt offen; ein Plan ganz ohne Übung ist nirgends eingeklappt.
   d) Der gespeicherte Plan ist derselbe, ob eingeklappt oder nicht. */
"use strict";
module.exports = async function (h) {
  const titel = "v857 Trainingsplan: gefüllte Blöcke als eine Zeile, aufklappbar – Werte und Speichern unverändert";
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const d2 = h.tagePlus(3), plaene = {};
  const termine = [{ id: 92, datum: d2, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 2000, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), nominierungen: [], anwesenheit: [],
    termine: (u) => { const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return termine.filter(t => !d || t.datum === d); },
    trainingsformen: (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true })), trainingsvorlagen: (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i })), periodisierung: [],
    trainingsgruppen: (u, req) => (req.method() === "POST" ? { status: 201, body: "[]" } : []),
    trainingsplan: (u, req) => { if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: JSON.stringify([b]) }; }   // wie Supabase mit return=representation: die gespeicherte Zeile zurück
      const d = (u.searchParams.get("datum") || "").replace(/^eq\./, ""); return plaene[d] ? [plaene[d]] : []; } }) });
  await h.sichtbarMachen(s.page, "#train-sub-planung"); await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async ({ d2 }) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    if (typeof tpKlappenAnwenden !== "function") return { alt: true };
    await loadKader();
    const feld = document.getElementById("tp-date"); if (![...feld.options].some(o => o.value === d2)) feld.add(new Option(d2, d2)); feld.value = d2;
    await tpTrainerRsvpLaden(d2); await tpPlanRestore(d2); await w(300);
    const tl = document.getElementById("tp-timeline");
    const stand = () => ({ zu: tl.querySelectorAll(".tp-slot.tp-zu").length, alle: tl.querySelectorAll(".tp-slot").length, h: Math.round(tl.getBoundingClientRect().height),
      werte: [...tl.querySelectorAll(".tp-form-sel")].map(x => x.value).join(","), schalter: (document.getElementById("tp-klapp-alle") || {}).textContent || "" });
    out.leer = stand();
    tpGenerate(); await w(900);
    out.voll = stand();
    out.kurz = [...tl.querySelectorAll(".tp-kurz")].map(k => k.textContent);
    const kn = tl.querySelector(".tp-slot.tp-zu .tp-klapp"), kz = tl.querySelector(".tp-kurz"), sch = document.getElementById("tp-klapp-alle");
    out.masse = { pfeil: kn ? Math.round(kn.getBoundingClientRect().height) + "x" + Math.round(kn.getBoundingClientRect().width) : "", zeile: kz ? Math.round(kz.getBoundingClientRect().height) : 0, schalter: sch ? Math.round(sch.getBoundingClientRect().height) : 0,
      versteckt: [...tl.querySelectorAll(".tp-slot.tp-zu .tp-form-sel")].every(x => !x.offsetParent), breit: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    tpPlanSave && await tpPlanSave(); await w(300); out.gespeichertZu = true;
    // b) ein Block auf
    const si = tl.querySelector(".tp-slot.tp-zu[data-si]").dataset.si; kn.click(); await w(80);
    const b1 = tl.querySelector(`.tp-slot[data-si="${si}"]`);
    out.einer = { zu: b1.classList.contains("tp-zu"), aria: b1.querySelector(".tp-klapp").getAttribute("aria-expanded"), stand: stand().zu };
    document.getElementById("tp-klapp-alle").click(); await w(80); out.alleAuf = stand();
    tpPlanSave && await tpPlanSave(); await w(300);
    document.getElementById("tp-klapp-alle").click(); await w(80); out.alleZu = stand();
    // c) eine Übung im Hauptteil leeren
    const hs = [...tl.querySelectorAll(".tp-slot")].find(el => (tpSlots[+el.dataset.si].typ || "main") !== "warmup" && (tpSlots[+el.dataset.si].typ || "main") !== "abschluss" && el.querySelector(".tp-form-sel"));
    const sel = hs.querySelector(".tp-form-sel"); sel.value = ""; tpKlappenAnwenden(); await w(50);
    out.unvollstaendig = { zu: hs.classList.contains("tp-zu"), pfeil: !!hs.querySelector(".tp-klapp") };
    return out;
  }, { d2 }).catch(e => ({ fehler: String(e) }));
  const gesp = s.gesendet.filter(g => /trainingsplan/.test(g.pfad || "") && g.methode === "POST").map(g => JSON.stringify((g.body || {}).plan || g.body));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["tpKlappenAnwenden fehlt (Stand vor v857)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.leer.zu || r.leer.schalter) probleme.push("c) leerer Plan eingeklappt: " + JSON.stringify(r.leer));
  if (!r.voll.alle || r.voll.zu !== r.voll.alle || r.kurz.some(k => !k) || r.voll.schalter !== "Alle aufklappen") probleme.push("a) gefüllter Plan: " + JSON.stringify(r.voll) + " " + JSON.stringify(r.kurz));
  else if (!(r.voll.h * 2 <= r.alleAuf.h) || r.voll.werte !== r.alleAuf.werte || !r.masse.versteckt || r.masse.breit) probleme.push(`a) Länge ${r.voll.h} px eingeklappt gegen ${r.alleAuf.h} px offen; Werte gleich ${r.voll.werte === r.alleAuf.werte}; ${JSON.stringify(r.masse)}`);
  else zeilen.push(`a) ${r.voll.alle} Blöcke: ${r.voll.h} px statt ${r.alleAuf.h} px, Werte unverändert`);
  if (r.einer.zu || r.einer.aria !== "true" || r.einer.stand !== r.voll.alle - 1 || r.alleAuf.zu !== 0 || r.alleAuf.schalter !== "Alle einklappen" || r.alleZu.zu !== r.voll.alle) probleme.push("b) " + JSON.stringify([r.einer, r.alleAuf, r.alleZu]));
  else if (parseInt(r.masse.pfeil) < 44 || r.masse.zeile < 44 || r.masse.schalter < 44) probleme.push("b) Knöpfe zu klein: " + JSON.stringify(r.masse));
  else zeilen.push(`b) Pfeil ${r.masse.pfeil} px, Zeile ${r.masse.zeile} px, „Alle aufklappen“ ${r.masse.schalter} px`);
  if (r.unvollstaendig.zu || r.unvollstaendig.pfeil) probleme.push("c) Block mit fehlender Übung: " + JSON.stringify(r.unvollstaendig)); else zeilen.push("c) leerer Plan offen; Block mit fehlender Übung bleibt offen");
  if (gesp.length < 2) probleme.push(`d) erwartet zwei Speichervorgänge, gesehen ${gesp.length}`);
  else if (gesp[gesp.length - 1] !== gesp[gesp.length - 2]) probleme.push("d) eingeklappt und offen wird Verschiedenes gespeichert");
  else zeilen.push("d) gespeicherter Plan eingeklappt und offen gleich");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
