/* v865 · Torwart-Rotation nach „zuletzt im Tor“ (Bestandsaufnahme 1.11, Charles 18.11.).
   a) rollenExpFetch merkt sich je Kind das Datum der letzten Spieltag-Aufstellung, in der es beim Anpfiff im Tor stand.
   b) Der Torwart-Hinweis an der Station nennt zuerst das Haken-Kind, das noch nie bzw. am längsten nicht im Tor war, mit Datum.
   c) Ohne Aufstellungsdaten gilt die Rangfolge aus dem Kader wie bisher.
   d) Kinder ohne Torwart-Haken werden nie vorgeschlagen. */
"use strict";
module.exports = async function (h) {
  const titel = "v865 Torwart-Rotation: zuerst wer am längsten nicht im Tor war";
  const probleme = [], zeilen = [];
  const auf = [
    { schluessel: "2026-10-04", daten: { start: { tw: "Kind A", rollen: {} } } },
    { schluessel: "2026-10-18", daten: { start: { tw: "Kind B", rollen: {} } } },
    { schluessel: "2026-11-08", daten: { start: { tw: "Kind A", rollen: {} } } }];
  const s = await h.starten({ start: "/trainer/index.html", angemeldet: true, warten: 2500,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), spieltag_aufstellung: auf }) });
  const r = await s.page.evaluate(async () => {
    if (typeof tpTwZuletzt !== "function") return { alt: true };
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 30 && typeof rollenExpFetch !== "function"; i++) await w(100);
    rollenExpClear(); const d = await rollenExpFetch();
    out.a = { A: (d.byKid["Kind A"] || {}).twZuletzt, B: (d.byKid["Kind B"] || {}).twZuletzt };
    const alt = KADER;
    KADER = [{ name: "Kind A", tw: true, twPrio: 1 }, { name: "Kind B", tw: true, twPrio: 2 }, { name: "Kind C", tw: true, twPrio: 3 }, { name: "Kind D" }];
    const ix = tpAllForms().findIndex((f, i) => tpUebungSpanne(i).tw);
    const info = { kinder: ["Kind D", "Kind A", "Kind B", "Kind C"] };
    out.ix = ix;
    out.b = tpTorwartHinweis(ix, info).replace(/<[^>]+>/g, "").trim();
    const merk = _rollenExp; _rollenExp = { data: null, at: 0 };
    out.c = tpTorwartHinweis(ix, info).replace(/<[^>]+>/g, "").trim();
    _rollenExp = merk; KADER = alt;
    return out;
  }).catch(err => ({ fehler: String(err) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["tpTwZuletzt fehlt (Stand vor v865)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.a.A !== "2026-11-08" || r.a.B !== "2026-10-18") probleme.push("a) " + JSON.stringify(r.a)); else zeilen.push("a) zuletzt im Tor: Kind A 08.11., Kind B 18.10.");
  if (r.ix < 0) probleme.push("b) keine Torwart-Übung gefunden");
  else if (!/^🧤 Torwart: Kind C \(noch nie im Tor\) oder Kind B \(zuletzt im Tor 18\.10\.\) oder Kind A \(zuletzt im Tor 8\.11\.\)$/.test(r.b)) probleme.push("b) " + r.b);
  else zeilen.push("b) " + r.b);
  if (!/^🧤 Torwart: Kind A oder Kind B oder Kind C$/.test(r.c)) probleme.push("c) ohne Daten: " + r.c); else zeilen.push("c) ohne Aufstellungen: Rangfolge aus dem Kader");
  if (/Kind D/.test(r.b) || /Kind D/.test(r.c)) probleme.push("d) Kind ohne Haken vorgeschlagen"); else zeilen.push("d) Kind ohne Haken nie vorgeschlagen");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
