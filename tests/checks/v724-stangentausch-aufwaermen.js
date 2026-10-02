/* v724 · „Stangentausch“ auch beim Aufwärmen wählbar.
   PO 02.10.: „Ich brauche die Stangenübung auch als Aufwärmübung in der Auswahl.“
   a) tpFilteredOpts("warmup") enthält „Stangentausch“ – und weiterhin nur Aufwärm-Übungen sonst
   b) Im Hauptteil bleibt „Stangentausch“ wählbar, die Kategorie bleibt „wahrnehmung“
   c) Die Aufwärm-Auswahl im Trainingsplan bietet die Übung als Option an */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const custom = bib.uebungen.map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: custom,
    termine: [], periodisierung: [], tagebuch_punkt: [], rueckmeldungen: [] }) });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof loadCustomForms === "function") await loadCustomForms();
    await w(200);
    const warm = tpFilteredOpts("warmup"), main = tpFilteredOpts("main");
    const st = tpAllForms().find(f => f && f.name === "Stangentausch");
    const out = { warm: warm.some(x => x.f.name === "Stangentausch"), main: main.some(x => x.f.name === "Stangentausch"),
      fremd: warm.filter(x => x.f.kat !== "aufwaermen").map(x => x.f.name), kat: st && st.kat };
    tpRenderTimeline(); await w(200);
    const wi = tpSlots.findIndex(sl => sl.typ === "warmup");
    const sel = wi >= 0 ? document.getElementById(`tp-form-${wi}-0`) : null;
    out.option = sel ? [...sel.options].some(o => /Stangentausch/.test(o.textContent)) : null;
    return out;
  });
  const fehler = s.fehler(); await s.schliessen();
  const titel = "v724 „Stangentausch“ auch beim Aufwärmen wählbar";
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  if (!r.warm || r.fremd.join() !== "Stangentausch") probleme.push("a) Aufwärmen: " + JSON.stringify({ drin: r.warm, fremd: r.fremd }));
  else zeilen.push("a) Aufwärmen bietet „Stangentausch“ an, sonst nur Aufwärm-Übungen");
  if (!r.main || r.kat !== "wahrnehmung") probleme.push(`b) Hauptteil: ${r.main}, Kategorie ${r.kat}`);
  else zeilen.push("b) im Hauptteil weiter wählbar, Kategorie wahrnehmung");
  if (r.option !== true) probleme.push("c) Aufwärm-Feld im Plan ohne „Stangentausch“: " + r.option);
  else zeilen.push("c) Aufwärm-Feld im Trainingsplan zeigt „Stangentausch“");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
