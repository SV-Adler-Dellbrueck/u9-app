/* v845 · Anwesenheit zeigt dauerhaft, ob gespeichert ist (Bestandsaufnahme November 2026, 2.5).
   Der Trainingsplan sagt das seit v797; die Anwesenheit meldete es nur in einer Meldung, die verschwand.
   a) Nach einem Haken steht über dem Knopf „Noch nicht gespeichert“ (role=status).
   b) Nach „Anwesenheit speichern“ steht „✓ Gespeichert um HH:MM Uhr“.
   c) Beide Zustände unterscheiden sich im Zeichen und im Satz, nicht nur in der Farbe; Kontrast mindestens 4,5:1. */
"use strict";
module.exports = async function (h) {
  const titel = "v845 Anwesenheit: dauerhafter Stand „Noch nicht gespeichert“ / „Gespeichert um …“";
  const probleme = [], zeilen = [];
  const d1 = h.heute ? h.heute() : h.tagePlus(0);
  const s = await h.starten({ warten: 1800, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [{ id: 1, datum: d1, uhrzeit: "16:45", typ: "training", trainer_status: {} }], anwesenheit: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async (d1) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof awStandRender !== "function") return { alt: true };
    await loadKader(); go("anwesenheit"); await w(1000);
    const aw = document.getElementById("aw-date"); if (![...aw.options].some(o => o.value === d1)) aw.add(new Option(d1, d1)); aw.value = d1; awLoad(); await w(400);
    const el = document.getElementById("aw-stand");
    const lies = () => { const sp = el.querySelector("span"); return { text: el.textContent.trim(), farbe: sp ? getComputedStyle(sp).color : "", grund: getComputedStyle(document.body).backgroundColor }; };
    const out = { rolle: el.getAttribute("role"), vorher: lies() };
    const kachel = document.querySelector(".aw-tile"); if (!kachel) return { fehler: "keine Kachel in der Anwesenheit" };
    kachel.click(); await w(150); out.offen = lies(); out.dirty = !!window._awDirty;
    awSave(); await w(200); out.fertig = lies(); out.dirtyDanach = !!window._awDirty;
    out.knopfUnter = el.compareDocumentPosition(document.getElementById("aw-save-btn")) & Node.DOCUMENT_POSITION_FOLLOWING ? true : false;
    return out;
  }, d1).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["awStandRender fehlt (Stand vor v845)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const lum = f => { const m = (f.match(/\d+(\.\d+)?/g) || [0, 0, 0]).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
  const kontrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  if (r.rolle !== "status" || !r.knopfUnter) probleme.push("Stand-Zeile ohne role=status oder nicht über dem Knopf");
  if (!r.dirty || !/^● Noch nicht gespeichert/.test(r.offen.text)) probleme.push("a) nach dem Haken: „" + r.offen.text + "“");
  if (r.dirtyDanach || !/^✓ Gespeichert um \d{2}:\d{2} Uhr$/.test(r.fertig.text)) probleme.push("b) nach dem Speichern: „" + r.fertig.text + "“");
  for (const [n, x] of [["offen", r.offen], ["gespeichert", r.fertig]]) { const k = kontrast(x.farbe, x.grund); if (k < 4.5) probleme.push(`c) Kontrast „${n}“ nur ${k.toFixed(1)}:1`); }
  if (!probleme.length) zeilen.push(`„${r.offen.text.slice(0, 26)}…“ → „${r.fertig.text}“ · role=status, über dem Knopf, Kontrast ≥ 4,5:1`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
