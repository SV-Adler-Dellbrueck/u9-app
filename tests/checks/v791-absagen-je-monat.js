/* v791 · Absagen je Monat (Charles 06.11.: „alles bauen“). Im Reiter „Absagen“ steht unter der Einzelliste eine Tabelle
   „Je Monat“: Absagen, unter 24 Std., unter 3 Std., Ø Vorlauf – nach dem Monat des Termins. Wählt man ein Kind,
   zählt sie nur dessen Absagen. Die Reihenfolge Summe je Kind → Einzelliste bleibt (v767/v768 hängen daran). */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [], K = h.KINDER;
  const a = [
    { spieler_id: 1, name: K[0], termin_id: 1, art: "training", datum: "2026-09-12", titel: null, abgesagt_am: "2026-09-11T10:00:00Z", vorlauf_std: 30, genau: true },
    { spieler_id: 2, name: K[1], termin_id: 2, art: "spiel", datum: "2026-09-20", titel: "Test", abgesagt_am: "2026-09-20T07:00:00Z", vorlauf_std: 2, genau: true },
    { spieler_id: 1, name: K[0], termin_id: 3, art: "training", datum: "2026-10-05", titel: null, abgesagt_am: "2026-10-05T09:00:00Z", vorlauf_std: 8, genau: true },
    { spieler_id: 1, name: K[0], termin_id: 4, art: "training", datum: "2026-10-07", titel: null, abgesagt_am: "2026-10-02T09:00:00Z", vorlauf_std: 100, genau: true }
  ];
  const s = await h.starten({ warten: 1200, hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], profiles: [], rpc: { rueckmelde_statistik: [], rueckmelde_absagen: a } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof rueckmeldeStatistikOpen !== "function") return { fehlt: true };
    const m = () => document.getElementById("rs-modal");
    const mon = () => { const t = m().querySelector("#rs-monate"); return t ? [...t.querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.textContent.replace(/\s+/g, " ").trim())) : null; };
    const out = {};
    await rueckmeldeStatistikOpen(); await w(150);
    [...m().querySelectorAll("#rs-art button")].find(b => /Absagen/.test(b.textContent)).click(); await w(250);
    out.alle = mon(); out.kopf = [...m().querySelectorAll("#rs-monate thead th")].map(x => x.textContent.trim());
    out.reihenfolge = [...m().querySelectorAll("table")].map(t => t.id || (t.querySelector("thead th")?.textContent.trim()));
    m().querySelector("button.rs-kind").click(); await w(80);       // erstes Kind (nach Name sortiert)
    out.eins = mon(); out.ueber = (m().querySelector("#rs-monate")?.parentElement?.previousElementSibling?.textContent || "");
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v791 Absagen je Monat", false, ["rueckmeldeStatistikOpen fehlt"]);
  // September: 2 Absagen (30 Std., 2 Std.) → unter 24: 1, unter 3: 1, Ø 16 Std.; Oktober: 2 (8, 100) → unter 24: 1, unter 3: 0, Ø 54 Std.
  const z = r.alle || [];
  if (r.kopf.join("|") !== "Monat|Absagen|unter 24 Std.|unter 3 Std.|Ø Vorlauf" || z.length !== 2 || z[0][0] !== "September 2026" || z[1][0] !== "Oktober 2026"
      || z[0].slice(1, 4).join("/") !== "2/1/1" || z[1].slice(1, 4).join("/") !== "2/1/0") probleme.push("Je Monat (alle): " + JSON.stringify({ kopf: r.kopf, z }));
  zeilen.push("Je Monat: " + z.map(x => x[0] + " " + x.slice(1, 4).join("/")).join(" · "));
  // Kind 1 (K[0]): September 1, Oktober 2
  const e = r.eins || [];
  if (e.length !== 2 || e[0][1] !== "1" || e[1][1] !== "2" || !/ · /.test(r.ueber)) probleme.push("Je Monat (ein Kind): " + JSON.stringify({ e, ueber: r.ueber }));
  zeilen.push("Filter auf ein Kind: " + e.map(x => x[0] + " " + x[1]).join(" · "));
  if (r.reihenfolge.length !== 3 || r.reihenfolge[2] !== "rs-monate" || r.reihenfolge[0] === "rs-monate") probleme.push("Reihenfolge: " + JSON.stringify(r.reihenfolge));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v791 Absagen je Monat", !probleme.length, probleme.length ? probleme : zeilen);
};
