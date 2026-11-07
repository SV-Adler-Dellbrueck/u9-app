/* v794 · Charles 07.11.: „Wichtig ist, dass ihr zukünftig die Übungs- und Trainingsformen in den Tagebucheintrag übernehmen,
   genauso wie welche Spieler anwesend waren.“
   a) tbKontext: Übungen aus dem Trainingsplan des Tages (Name, Block), dazu die Spielform des Abschlussspiels (nicht „frei“),
      und die Kinder, die laut Anwesenheit da waren (kader.id, aufsteigend) – wer fehlte, steht nicht drin
   b) Der KI-Vorschlag einer Einheit trägt beides in den Eintrag (Spalten durchgefuehrt, anwesend); ein Gedanke nicht
   c) Prüfkarte und Export zeigen „Durchgeführt“ und „Dabei (n)“; der Export läuft durch tbPseudonym
   d) Fehlt die Migration (die Datenbank lehnt die Spalten mit 400 ab), wird ohne sie gespeichert – der Eintrag geht nicht verloren */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const datum = h.tagePlus(-1);
  const posts = []; let ohneSpalten = false;
  const kader = h.kaderZeilen().map((z, i) => ({ ...z, alias: String.fromCharCode(65 + i) }));
  const s = await h.starten({ hoehe: 1800, supabase: h.supabaseAttrappe({
    kader, profiles: [{ name: "Charles", rolle: "trainer" }], termine: [],
    trainingsplan: [{ datum, kopf: { schwerpunkt: "Anbieten und Freilaufen" }, plan: [
      { formIdx: 1, formName: "Joker-Duell – anbieten und freilaufen", trainer: "Peter", slotLabel: "Hauptteil 1 – zwei Stationen" },
      { formIdx: 2, formName: "Schau-Tore – vor dem Ball schauen, dann ins gezeigte Tor", trainer: "Charles", slotLabel: "Hauptteil 1 – zwei Stationen" },
      { formIdx: 2, formName: "Schau-Tore – vor dem Ball schauen, dann ins gezeigte Tor", trainer: "Charles", slotLabel: "Hauptteil 2 – Wechsel" }] }],
    trainingsturnier: [{ datum, data: { spielform: "f4", phase: "setup" } }],
    tagebuch_punkt: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : [],
    tagebuch_eintrag: (u, req) => {
      if (req.method() === "POST") {
        const b = JSON.parse(req.postData() || "{}");
        if (ohneSpalten && ("durchgefuehrt" in b || "anwesend" in b)) { posts.push({ abgelehnt: true }); return { status: 400, body: JSON.stringify({ message: "column does not exist" }) }; }
        const z = { id: 900 + posts.length, ...b }; posts.push(z); return { status: 201, body: JSON.stringify([z]) };
      }
      if (req.method() === "GET") { const id = (u.searchParams.get("id") || "").replace("eq.", ""); return id ? posts.filter(z => String(z.id) === id) : []; }
      return { status: 204, body: "" };
    }
  }) });
  const r = await s.page.evaluate(async ({ K, datum }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    if (typeof tbKontext !== "function") return { fehlt: true };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    AW_DATA[datum] = {}; K.slice(0, 8).forEach((n, i) => { AW_DATA[datum][n] = { da: i !== 3 }; });   // Kind D fehlt
    const out = {};
    out.kx = await tbKontext(datum);
    const v = { baustein: "spiel_spieler", beobachtung: "Kind B war ruhig.", aha: null, konsequenzen: [], schlagworte: [], rueckfragen: [], todos: [] };
    out.idEinheit = await tbVorschlagSichern({ fuer: "d" + datum, art: "training", v, diktat: "x" });
    out.idGedanke = await tbVorschlagSichern({ fuer: "g" + Date.now(), art: "gedanke", v, diktat: "y" });
    // Prüfkarte
    await tbPruefenOpen(out.idEinheit); await w(200);
    out.karte = (document.getElementById("tbp-karte") || document.getElementById("tb-pruefen") || {}).textContent || "";
    // Export
    await tagebuchListe?.(); 
    out.md = tbMarkdown({ id: out.idEinheit, datum, baustein: "spiel_spieler", ausloeser: "Training U9", beobachtung: "b", aha: "", konsequenz: "", durchgefuehrt: out.kx.durchgefuehrt, anwesend: out.kx.anwesend, schlagworte: [] }, "lehrgang");
    out.mdAussen = tbPseudonym(out.md);
    return out;
  }, { K, datum });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v794 Tagebuch: Übungen und Kinder", false, ["tbKontext fehlt"]); }
  const J = JSON.stringify;
  const idsDa = [0, 1, 2, 4, 5, 6, 7].map(i => i + 1);   // kader.id = Index + 1; Kind D (4) fehlte
  const namen = r.kx.durchgefuehrt.map(x => x.name);
  if (J(namen) !== J(["Joker-Duell – anbieten und freilaufen", "Schau-Tore – vor dem Ball schauen, dann ins gezeigte Tor", "Abschlussspiel · 4+1"])) probleme.push("a) Übungen: " + J(r.kx.durchgefuehrt));
  if (!/Hauptteil 1/.test(r.kx.durchgefuehrt[1].block) || !/Hauptteil 2/.test(r.kx.durchgefuehrt[1].block)) probleme.push("a) Blöcke: " + J(r.kx.durchgefuehrt[1]));
  if (J(r.kx.anwesend) !== J(idsDa)) probleme.push("a) Anwesend: " + J(r.kx.anwesend) + " statt " + J(idsDa));
  zeilen.push(`a) ${r.kx.durchgefuehrt.length} Einträge (zwei Übungen, Schau-Tore einmal trotz zwei Blöcken, Abschlussspiel 4+1), ${r.kx.anwesend.length} Kinder da, Kind D fehlt`);
  const e1 = posts.find(z => z.id === r.idEinheit), e2 = posts.find(z => z.id === r.idGedanke);
  if (!e1 || J(e1.durchgefuehrt) !== J(r.kx.durchgefuehrt) || J(e1.anwesend) !== J(idsDa)) probleme.push("b) Vorschlag Einheit: " + J(e1 && { d: e1.durchgefuehrt, a: e1.anwesend }));
  if (!e2 || "durchgefuehrt" in e2 || "anwesend" in e2) probleme.push("b) Gedanke trägt Spalten: " + J(e2));
  zeilen.push("b) Der Einheiten-Vorschlag trägt beides; ein Gedanke nicht");
  if (!/Durchgeführt/.test(r.karte) || !/Joker-Duell/.test(r.karte) || !/Dabei \(7\)/.test(r.karte) || /Kind D/.test((/Dabei[^]*$/.exec(r.karte) || [""])[0].split("Tagebuch")[0])) probleme.push("c) Prüfkarte: " + r.karte.slice(0, 400));
  if (!/\*\*Durchgeführt:\*\* Joker-Duell/.test(r.md) || !/\*\*Dabei \(7\):\*\*/.test(r.md)) probleme.push("c) Export: " + r.md);
  zeilen.push("c) Prüfkarte und Export zeigen „Durchgeführt“ und „Dabei (7)“");
  s.page && 0;
  // d) ohne Migration
  ohneSpalten = true;
  const r2 = await s.page.evaluate(async ({ datum }) => {
    const v = { baustein: "spiel_spieler", beobachtung: "Zweiter Vorschlag ohne Spalten.", aha: null, konsequenzen: [], schlagworte: [], rueckfragen: [], todos: [] };
    return { id: await tbVorschlagSichern({ fuer: "d" + datum.replace(/-\d\d$/, "-01"), art: "training", v, diktat: "z" }) };
  }, { datum });
  const e3 = posts.find(z => z.id === r2.id);
  if (!r2.id || !e3 || "durchgefuehrt" in e3 || !posts.some(z => z.abgelehnt)) probleme.push("d) ohne Migration: " + J({ id: r2.id, e3, abgelehnt: posts.filter(z => z.abgelehnt).length }));
  zeilen.push("d) Lehnt die Datenbank die Spalten ab, wird ohne sie gespeichert – der Vorschlag geht nicht verloren");
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v794 Tagebuch: Übungen und anwesende Kinder im Eintrag", !probleme.length, probleme.length ? probleme : zeilen);
};
