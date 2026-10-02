/* v716 – Übungen umbenennen (mit Mitnahme) und archivieren.

   PO am 02.10. (Bildschirmfoto 07:18): „Ich kann, wenn ich die Übung bearbeite, den Namen nicht
   mehr ändern. Das wäre aber gut. Zusätzlich sollte es auch möglich sein, Übungen zu archivieren
   und aus der aktiven Liste zu entfernen.“

   Fälle:
   a) Bearbeiten einer eigenen, schon verwendeten Übung: Name nicht gesperrt, Hinweis nennt die
      Mitnahme. Speichern mit neuem Namen ruft erst uebung_umbenennen (alt, neu), dann das PATCH;
      der alte Name im Plan findet die Übung weiter (tfIndexVon).
   b) Archivieren: PATCH team_config mit uebung_archiv; die Übung fehlt in der Liste und ist nicht
      mehr stationstauglich; „📦 Archiv (1)“ zeigt sie, „Zurückholen“ nimmt sie wieder auf.
   c) Regeln im Code hängen am ursprünglichen Namen: eine umbenannte Zusatzregel bleibt eine, eine
      umbenannte Übung zeigt ihre Provokationsregeln weiter. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const D = h.tagePlus(-3);
  const eigene = [{ id: 901, name: "Probeform Alt", kat: "passspiel", kurz: "Probe", ablauf: "Ablauf", varianten: "", coaching: "", spieler: "4–6", feld: "20x20", dauer: "10", spass: 3, diff: 2, custom: true, focus: false, tags: "Eigene Übung", skizze: null }];
  const plaene = [{ datum: D, plan: [{ formIdx: 999, formName: "Probeform Alt", trainer: "Alle", slotLabel: "Hauptteil 1", key: "x" }], slots: [{ label: "Hauptteil 1", typ: "main", dauer: 20 }] }];
  const rpcAufrufe = [], patches = [];
  const s = await h.starten({
    hoehe: 2400,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), trainingsformen: (u, req) => { if (req.method() === "PATCH") { patches.push({ t: "trainingsformen", body: JSON.parse(req.postData() || "{}") }); return { status: 204, body: "" }; } return eigene; },
      trainingsplan: plaene,
      team_config: (u, req) => { if (req.method() === "PATCH") { patches.push({ t: "team_config", body: JSON.parse(req.postData() || "{}") }); return { status: 204, body: "" }; } return [{ id: 1, uebung_meta: {}, uebung_art: {}, uebung_betreuung: {}, uebung_archiv: [] }]; },
      uebung_umbenannt: [],
      rpc: { uebung_umbenennen: (u, req) => { rpcAufrufe.push(JSON.parse(req.postData() || "{}")); return { uebung: 1, plaene: 1, bewertungen: 0, vorlagen: 0, stationen: 0, live: 0 }; } }
    })
  });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["uebungArchivieren", "tpIstArchiviert", "tpNameAktuell", "tpNameUrsprung"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader(); await loadCustomForms?.(); await warte(400);
    await uebungMetaLoad(); if (typeof tpEinsatzLaden === "function") await tpEinsatzLaden(); await warte(200);
    let idx = tpAllForms().findIndex(f => f.name === "Probeform Alt");
    out.idx = idx;
    if (idx < 0) return out;
    // a)
    uebungBearbeiten(idx); await warte(200);
    const nf = document.getElementById("tf-name");
    out.readOnly = nf.readOnly;
    out.hinweis = document.getElementById("tf-name-hinweis").hidden ? "" : document.getElementById("tf-name-hinweis").textContent;
    nf.value = "Probeform Neu";
    await saveCustomTraining(); await warte(300);
    out.neuerName = tpAllForms()[idx].name;
    out.alterFindet = tfIndexVon({ formName: "Probeform Alt" }) === idx;
    // b)
    go("formen"); await warte(300);
    const suche = document.getElementById("training-search"); if (suche) { suche.value = "Probeform"; }
    renderTraining(); await warte(100);
    out.vorher = document.getElementById("training-content").textContent.includes("Probeform Neu");
    await uebungArchivieren(idx, true); await warte(200);
    out.archiv = (window._uebungArchiv || []).slice();
    renderTraining(); await warte(100);
    out.nachher = document.getElementById("training-content").textContent.includes("Probeform Neu");
    out.tauglich = tpStationTauglich(tpAllForms()[idx]);
    const ak = [...document.querySelectorAll("#tf-kacheln button")].find(b => /Archiv \(1\)/.test(b.textContent));
    out.archivKnopf = !!ak;
    if (suche) suche.value = "";
    if (ak) { ak.click(); await warte(150); }
    out.imArchiv = document.getElementById("training-content").textContent.includes("Probeform Neu");
    tpShowExercise(idx); await warte(200);
    out.zurueckKnopf = /Zurückholen/.test(document.getElementById("uebung-modal")?.textContent || "");
    await uebungArchivieren(idx, false); await warte(150);
    out.wieder = !tpIstArchiviert(tpAllForms()[idx]);
    // c)
    window._uebungAlias = Object.assign({}, window._uebungAlias, { "Lobpflicht nach Tor": "Lob-Regel", "Korridor-Funino": "Korridor neu" });
    out.zusatz = tpIstZusatzregel({ name: "Lob-Regel" });
    const ki = tpAllForms().findIndex(f => f.name === "Korridor-Funino");
    const kf = tpAllForms()[ki]; kf.name = "Korridor neu";
    tpShowExercise(ki); await warte(200);
    out.prov = !!document.querySelector("#uebung-modal .ue-provokation");
    kf.name = "Korridor-Funino";
    return out;
  });
  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v716 Übungen umbenennen und archivieren";
  if (r.fehlt && r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  if (r.idx < 0) return h.ergebnis(titel, false, ["Probeübung nicht geladen"]);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  // a)
  const rpc = rpcAufrufe[0] || {};
  const pTf = patches.find(p => p.t === "trainingsformen");
  if (r.readOnly) probleme.push("a) Name weiter gesperrt");
  else if (!/mitgenommen/.test(r.hinweis)) probleme.push("a) Hinweis fehlt: " + r.hinweis);
  else if (rpc.p_alt !== "Probeform Alt" || rpc.p_neu !== "Probeform Neu") probleme.push("a) RPC: " + JSON.stringify(rpcAufrufe));
  else if (!pTf || pTf.body.name !== "Probeform Neu") probleme.push("a) PATCH ohne neuen Namen");
  else if (r.neuerName !== "Probeform Neu" || !r.alterFindet) probleme.push(`a) lokal „${r.neuerName}“, alter Name findet: ${r.alterFindet}`);
  else zeilen.push(`a) Name frei („${r.hinweis}“), RPC alt → neu, dann PATCH; alter Planname findet die Übung`);
  // b)
  const pTc = patches.filter(p => p.t === "team_config").map(p => p.body.uebung_archiv);
  if (!r.vorher) probleme.push("b) Übung vor dem Archivieren nicht in der Liste");
  else if (!pTc.length || !(pTc[0] || []).includes("Probeform Neu")) probleme.push("b) PATCH uebung_archiv: " + JSON.stringify(pTc));
  else if (r.nachher || r.tauglich) probleme.push(`b) nach dem Archivieren: in Liste ${r.nachher}, stationstauglich ${r.tauglich}`);
  else if (!r.archivKnopf || !r.imArchiv || !r.zurueckKnopf) probleme.push(`b) Archiv-Knopf ${r.archivKnopf}, im Archiv ${r.imArchiv}, Zurückholen ${r.zurueckKnopf}`);
  else if (!r.wieder) probleme.push("b) Zurückholen wirkt nicht");
  else zeilen.push("b) archiviert → aus Liste und Stationen raus, „📦 Archiv (1)“ zeigt sie, Zurückholen wirkt");
  // c)
  if (!r.zusatz || !r.prov) probleme.push(`c) umbenannt: Zusatzregel ${r.zusatz}, Provokationsregeln ${r.prov}`);
  else zeilen.push("c) umbenannte Zusatzregel bleibt eine, Provokationsregeln bleiben sichtbar");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
