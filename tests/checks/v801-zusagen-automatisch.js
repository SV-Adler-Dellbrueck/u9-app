/* v801 · „automatische Zusagen“ (Charles 07.11.). Die gespeicherte Einteilung („__nom“) eines kommenden Spiels oder Turniers wird
   beim Laden der Startseite selbst mit den Rückmeldungen abgeglichen – nach den Regeln von nomLoad:
   a) 12 Zusagen, 9 gespeichert → die Einteilung hat danach 12 „dabei“, der Chip „12 dabei“, kein „noch nicht eingeteilt“
   b) eine Absage nach der Einteilung → „nicht“
   c) von Hand gesetzt (_ovr) bleibt, auch gegen die Zusage
   d) ohne gespeicherte Einteilung wird nichts geschrieben
   e) nichts zu ändern → kein Schreibzugriff */
"use strict";
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const spiel = h.tagePlus(2);
  async function lauf(opts) {
    const posts = []; let zeile = opts.nom ? { datum: spiel + "__nom", data: opts.nom } : null;
    const rm = opts.rm.map(([i, st]) => ({ termin_id: 1, status: st, spieler_id: i }));
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      termine: [{ id: 1, datum: spiel, typ: "turnier", heim: true, titel: "Kinderfestival", uhrzeit: "10:15", trainer_status: {} }],
      nominierungen: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); posts.push(b); zeile = b; return { status: 201, body: "[]" }; }
        return zeile && (u.searchParams.get("datum") || "").includes(spiel + "__nom") ? [zeile] : [];
      },
      rueckmeldungen: rm, trainingsplan: [], trainingsgruppen: [], kind_pause: opts.pause || [] }) });
    await h.sichtbarMachen(s.page, "#home-content");
    const z = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      await loadKader(); document.getElementById("pin-gate")?.remove(); go("home"); await w(1200);
      return [...document.querySelectorAll("#home-woche .woche-zeile")].map(x => x.textContent.replace(/\s+/g, " ")).find(x => /Kinderfestival|Turnier/.test(x)) || "";
    });
    const fe = s.fehler(); await s.schliessen();
    return { z, posts, fe, zeile };
  }
  const ids = n => Array.from({ length: n }, (_, i) => i + 1);
  const dabei9 = {}; K.slice(0, 9).forEach(n => { dabei9[n] = "dabei"; });
  // a) 12 Zusagen, 9 eingeteilt
  const a = await lauf({ nom: { ...dabei9 }, rm: ids(12).map(i => [i, "zugesagt"]) });
  const nDabei = x => Object.keys(x || {}).filter(k => k[0] !== "_" && x[k] === "dabei").length;
  if (!a.posts.length || nDabei(a.posts[0].data) !== 12 || !/12 dabei/.test(a.z) || /noch nicht eingeteilt/.test(a.z)) probleme.push(`a) ${a.posts.length} Schreibzugriffe, dabei ${nDabei((a.posts[0] || {}).data)}, Chip „${a.z.slice(0, 120)}“`);
  // b) Absage nach der Einteilung
  const b = await lauf({ nom: { ...dabei9 }, rm: [...ids(9).map(i => [i, "zugesagt"]), [2, "abgesagt"]] });
  const bd = (b.posts[0] || {}).data || {};
  if (!b.posts.length || bd[K[1]] === "dabei" || Object.values(bd).filter(v => v === "dabei").length !== 8) probleme.push("b) Absage: " + JSON.stringify(bd).slice(0, 160));
  // c) Handentscheidung bleibt
  const c = await lauf({ nom: { ...dabei9, [K[10]]: "nicht", _ovr: [K[10]] }, rm: [[11, "zugesagt"], ...ids(9).map(i => [i, "zugesagt"])] });
  const cd = (c.posts[0] || {}).data || (c.zeile && c.zeile.data) || {};
  if (cd[K[10]] !== "nicht") probleme.push("c) Handentscheidung überschrieben: " + JSON.stringify(cd).slice(0, 160));
  // d) ohne gespeicherte Einteilung
  const d = await lauf({ nom: null, rm: ids(12).map(i => [i, "zugesagt"]) });
  if (d.posts.length) probleme.push("d) ohne Einteilung geschrieben: " + d.posts.length);
  // e) nichts zu ändern
  const e = await lauf({ nom: { ...dabei9 }, rm: ids(9).map(i => [i, "zugesagt"]) });
  if (e.posts.length) probleme.push("e) unnötiger Schreibzugriff: " + e.posts.length);
  const fe = [...a.fe, ...b.fe, ...c.fe, ...d.fe, ...e.fe]; if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push("12 Zusagen / 9 gespeichert → 12 dabei, Chip „12 dabei“ ohne Warn-Chip; Absage → nicht; Handentscheidung bleibt; ohne Einteilung oder ohne Änderung kein Schreiben");
  return h.ergebnis("v801 Zusagen gleichen die Einteilung selbst ab", !probleme.length, probleme.length ? probleme : zeilen);
};
