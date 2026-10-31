/* v768 · PO 30.10.: „Es soll auch möglich sein, einzelne Absagen einzusehen.“ Wahl: „Je Kind antippen“.
   a) Die Summe je Kind hat je Kind einen Knopf (≥ 44 px, Name und „›“); ohne Wahl steht „Jede Absage“ mit allen Absagen
   b) Ein Tipp auf ein Kind zeigt nur dessen Absagen („Absagen von … · N“), der Knopf ist gedrückt (aria-pressed), „Alle anzeigen“ erscheint
   c) „Alle anzeigen“ und ein zweiter Tipp auf dasselbe Kind heben die Wahl auf; ein anderes Kind ersetzt sie
   d) Beim erneuten Öffnen des Dialogs ist nichts vorgewählt */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const jetzt = Date.now(), vor = std => new Date(jetzt - std * 3600e3).toISOString();
  const absagen = [
    { spieler_id: 2, name: K[1], termin_id: 11, art: "training", datum: h.tagePlus(-2), titel: null, beginn: vor(48), abgesagt_am: vor(48 + 3), vorlauf_std: 3, genau: true },
    { spieler_id: 1, name: K[0], termin_id: 12, art: "spiel", datum: h.tagePlus(-5), titel: "Testspiel", beginn: vor(120), abgesagt_am: vor(120 + 100), vorlauf_std: 100, genau: true },
    { spieler_id: 1, name: K[0], termin_id: 13, art: "training", datum: h.tagePlus(-9), titel: null, beginn: vor(216), abgesagt_am: vor(216 + 0.5), vorlauf_std: 0.5, genau: false },
    { spieler_id: 2, name: K[1], termin_id: 14, art: "spiel", datum: h.tagePlus(-12), titel: "Festival", beginn: vor(288), abgesagt_am: vor(288 - 1), vorlauf_std: -1, genau: true }
  ];
  const s = await h.starten({ warten: 1200, hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], profiles: [], rpc: { rueckmelde_statistik: [], rueckmelde_absagen: absagen } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof rueckmeldeAbsagenKind !== "function") return { fehlt: true };
    const out = {};
    const m = () => document.getElementById("rs-modal");
    const knoepfe = () => [...m().querySelectorAll("button.rs-kind")];
    const stand = () => { const tb = [...m().querySelectorAll("table")]; return { kopf: (m().querySelector("#rs-inhalt > div:nth-of-type(3) > div, #rs-inhalt > div:nth-of-type(3)") || {}).textContent, einzeln: tb[1] ? [...tb[1].querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.textContent.replace(/\s+/g, " ").trim())) : [], gedrueckt: knoepfe().map(b => b.getAttribute("aria-pressed")).join(","), alle: !![...m().querySelectorAll("button")].find(b => /Alle anzeigen/.test(b.textContent)), ueber: (m().textContent.match(/Absagen von [^·]+· \d+|Jede Absage/) || [""])[0].trim() }; };
    await rueckmeldeStatistikOpen(); await w(150);
    [...m().querySelectorAll("#rs-art button")].find(b => /Absagen/.test(b.textContent)).click(); await w(250);
    out.a = { knoepfe: knoepfe().map(b => [b.textContent.trim(), Math.round(b.getBoundingClientRect().height)]), ...stand() };
    knoepfe()[0].click(); await w(60);
    out.b = stand();
    out.b.knopfName = knoepfe()[0].textContent.trim();
    [...m().querySelectorAll("button")].find(b => /Alle anzeigen/.test(b.textContent)).click(); await w(60);
    out.c1 = stand();
    knoepfe()[0].click(); await w(40); knoepfe()[0].click(); await w(40);
    out.c2 = stand();
    knoepfe()[0].click(); await w(40); knoepfe()[1].click(); await w(40);
    out.c3 = stand();
    m().remove();
    await rueckmeldeStatistikOpen(); await w(150);
    [...m().querySelectorAll("#rs-art button")].find(b => /Absagen/.test(b.textContent)).click(); await w(250);
    out.d = stand();
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v768 Absagen je Kind", false, ["rueckmeldeAbsagenKind fehlt"]);
  const namen = [K[0], K[1]].sort((a, b) => a.localeCompare(b, "de"));
  if (r.a.knoepfe.length !== 2 || r.a.knoepfe.some(k => k[1] < 44 || !/ ›$/.test(k[0])) || r.a.knoepfe[0][0].replace(/ ›$/, "") !== namen[0] || r.a.einzeln.length !== 4 || r.a.ueber !== "Jede Absage" || r.a.alle)
    probleme.push("a) " + JSON.stringify(r.a));
  zeilen.push(`a) ${r.a.knoepfe.length} Kinder als Knöpfe (${r.a.knoepfe.map(k => k[1] + " px").join(", ")}), „Jede Absage“ mit ${r.a.einzeln.length} Absagen`);
  const bName = r.b.knopfName.replace(/ ›$/, "");
  if (r.b.einzeln.length !== 2 || r.b.einzeln.some(z => z[1] !== bName) || r.b.ueber !== `Absagen von ${bName} · 2` || r.b.gedrueckt !== "true,false" || !r.b.alle) probleme.push("b) " + JSON.stringify(r.b));
  zeilen.push(`b) Tipp auf ${bName}: „${r.b.ueber}“, nur dessen 2 Absagen, Knopf gedrückt, „Alle anzeigen“ da`);
  if (r.c1.einzeln.length !== 4 || r.c1.ueber !== "Jede Absage" || r.c1.alle || r.c2.einzeln.length !== 4 || r.c2.gedrueckt !== "false,false"
      || r.c3.einzeln.length !== 2 || r.c3.gedrueckt !== "false,true" || r.c3.einzeln.some(z => z[1] === bName)) probleme.push("c) " + JSON.stringify({ c1: r.c1, c2: r.c2, c3: r.c3 }));
  zeilen.push("c) „Alle anzeigen“ und zweiter Tipp heben auf; ein anderes Kind ersetzt die Wahl");
  if (r.d.einzeln.length !== 4 || r.d.gedrueckt !== "false,false") probleme.push("d) " + JSON.stringify(r.d));
  zeilen.push("d) neu geöffnet: nichts vorgewählt");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v768 Absagen je Kind einsehen", !probleme.length, probleme.length ? probleme : zeilen);
};
