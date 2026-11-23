/* v958 · Charles 23.11.: „Das Wort ‚vergeben‘ passt hier nicht … nicht direkt verständlich“ und „Familie <Vorname>“ liest
   sich wie ein Nachname. Entschieden: „<Vorname>s Familie“, keine Marke „vergeben“. (Keine echten Vornamen im Repo.)
   a) familieVon: „Kind A“ → „Kind As Familie“, „Kind S“ → „Kind S’ Familie“, „Kind X“ → „Kind X’ Familie“, „A & B“ → „As & Bs Familie“, leer → „eine Familie“.
   b) Grillhütte & Helfen: andere Familie ohne Marke, eigene „🔥 Ihr seid dran“; Name als „Kind Hs Familie“.
   c) Quelltext: in md-kasse.js kein „Familie “ + Vorname und keine Marke „vergeben“ mehr. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v958 Familien heißen „<Vorname>s Familie“, keine Marke „vergeben“";
  const probleme = [], zeilen = [];
  const tag = h.tagePlus(6);
  const D = { saison_ab: "2026-07-01", heimspiele: [{ termin_id: 60, datum: tag, uhrzeit: "10:15:00", gegner: "Heimspiel", plaetze: 2, dienste: [
      { dienst_id: 1, platz: 1, status: "eingeteilt", familie: "Kind A", eigene: true, kann_uebernehmen: false },
      { dienst_id: 2, platz: 2, status: "eingeteilt", familie: "Kind H", eigene: false, kann_uebernehmen: false }] }],
    familien: [{ familie: "Kind A", eigene: true, grill: 1, tee: 0, aufbau: 0, abbau: 0, betreuung: 0 }] };
  const e = await h.starten({ start: "/eltern/index.html", breite: 360, hoehe: 900, warten: 1500, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [{ id: 60, grill_zeit: "", grill_beide: null }], rpc: { helfer_uebersicht: D, dienste_public: [] } }) });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 40 && typeof elternHelfenOpen !== "function"; i++) await w(100);
    const out = { a: ["Kind A", "Kind S", "Kind X", "Kind A & Kind B", ""].map(familieVon) };
    await elternHelfenOpen(); await w(300);
    const zeilen = [...document.querySelectorAll("#helfen-fenster .hf-heim > div > div")].map(txt).filter(t => /Familie/.test(t));
    out.b = zeilen;
    out.chips = [...document.querySelectorAll("#helfen-fenster .hf-heim .gh-chip")].map(txt);
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = e.fehler(); await e.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (JSON.stringify(r.a) !== JSON.stringify(["Kind As Familie", "Kind S’ Familie", "Kind X’ Familie", "Kind As & Kind Bs Familie", "eine Familie"])) probleme.push("a) " + JSON.stringify(r.a));
    if (!r.b.some(t => /^Kind Hs Familie$/.test(t))) probleme.push("b) andere Familie: " + JSON.stringify(r.b));
    if (JSON.stringify(r.chips) !== JSON.stringify(["🔥 Ihr seid dran"])) probleme.push("b) Marken " + JSON.stringify(r.chips));
  }
  const k = fs.readFileSync(path.join(h.REPO, "md-kasse.js"), "utf8");
  if (/"Familie "\+esc|>Familie \$\{esc/.test(k) || /c\("vergeben"/.test(k) || /\)\}s Familie/.test(k)) probleme.push("c) alte Schreibweise oder „vergeben“ im Quelltext");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) ${(r.a || []).join(" · ")} · b) ${(r.b || []).join(" | ")} · Marken ${JSON.stringify(r.chips)}`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
