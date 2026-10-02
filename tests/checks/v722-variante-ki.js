/* v722 · Übung kopieren = Variante, das KI-Feld fragt „Was soll anders sein?“.
   PO 02.10.: „Wenn ich eine Übung kopieren will … öffnet sich die gleiche Übung als Alternative, die
   ich dann nochmal ändern kann und mit einem KI-Feld die Variation oder Änderung einsprechen kann.“
   Dazu (Bildschirmfoto „Wo ist kopieren?“): Kopieren auch aus dem Bearbeiten-Fenster.
   a) Kopieren aus der Übungsansicht: Titel „📋 Variante von …“, alle Felder übernommen, Name
      „(Variante)“, KI-Feld „✨ Was soll anders sein?“, Knopf „Änderung einarbeiten“
   b) Änderung einsprechen → ki-uebung bekommt modus „variante“, die ganze Übung (Name, Ablauf,
      Skizze) und nur die Änderung; die Antwort landet in den Feldern, die Zeile nennt, was sich
      geändert hat, das KI-Feld ist wieder leer
   c) Zu kurze Änderung → Hinweis, keine Anfrage
   d) Neue Übung: KI-Feld wieder „Beschreib die Übung“, Anfrage im modus „text“
   e) „Als Variante kopieren“ im Bearbeiten-Fenster: Speichern legt eine NEUE Übung an (POST),
      das Original bleibt (kein PATCH) */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const anfragen = [], schreiben = [];
  const eigene = [{ id: 601, name: "Testform Farbtore", kat: "technik", spieler: "6 je Station (3 gegen 3)", feld: "20x15 m", dauer: "10",
    ablauf: "Zwei Minitore, Kinder dribbeln auf das Tor in der angesagten Farbe.", coaching: "Kopf hoch!", varianten: "", custom: true, tags: "Eigene Übung",
    skizze: { s: [[100, 90, "g"]], tor: [[40, 80, "v", 20]] } }];
  const s = await h.starten({
    hoehe: 2400, breite: 390,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), termine: [], periodisierung: [], tagebuch_punkt: [], rueckmeldungen: [],
      trainingsformen: (u, req) => { if (req.method() !== "GET") { try { schreiben.push({ m: req.method(), b: JSON.parse(req.postData() || "null") }); } catch (e) {} return { status: 201, body: JSON.stringify([{ id: 888 }]) }; } return eigene; },
      funktionen: {
        "ki-uebung": (u, req) => {
          let b = {}; try { b = JSON.parse(req.postData() || "{}"); } catch (e) {}
          anfragen.push(b);
          return { uebungen: [{ titel: "Farbtore mit Jugendtoren", kat: "technik", spieler: "4 je Station (2 gegen 2)", feld: "20x15 m", dauer: "10",
            beschreibung: "Zwei Jugendtore, Kinder dribbeln auf das Tor in der angesagten Farbe.", variante: "", coaching: "Kopf hoch!", diff: 2,
            skizze: { s: [[100, 90, "g"]], tor: [[40, 80, "v", 40, "j"]] } }] };
        }
      }
    })
  });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: ["tfKiModus", "uebungKopieren", "tfKiAuswerten"].filter(n => typeof window[n] !== "function") };
    if (out.fehlt.length) return out;
    if (typeof loadCustomForms === "function") await loadCustomForms();
    const idx = () => tpAllForms().findIndex(f => f.name === "Testform Farbtore");
    const w = id => (document.getElementById(id) || {}).value;
    const ki = () => ({ titel: (document.getElementById("tf-ki-t") || {}).textContent, los: (document.getElementById("tf-ki-los") || {}).textContent.trim(), titelForm: (document.getElementById("tf-titel") || {}).textContent });
    // a)
    tpShowExercise(idx()); await warte(100);
    const kopier = [...document.querySelectorAll("#uebung-modal button")].find(b => /Übung kopieren/.test(b.textContent));
    out.kopierKnopf = !!kopier; if (kopier) kopier.click(); await warte(150);
    out.a = { ...ki(), name: w("tf-name"), ablauf: w("tf-ablauf"), skizze: !!window.TF_SKIZZE };
    // c) zu kurz
    document.getElementById("tf-ki-text").value = "ab"; await tfKiAuswerten(); await warte(50);
    out.c = (document.getElementById("tf-ki-stand") || {}).textContent;
    // b) Änderung
    document.getElementById("tf-ki-text").value = "Statt Minitore zwei Jugendtore, nur 4 Kinder";
    await tfKiAuswerten(); await warte(150);
    out.b = { name: w("tf-name"), spieler: w("tf-spieler"), ablauf: w("tf-ablauf"), stand: (document.getElementById("tf-ki-stand") || {}).textContent, feld: w("tf-ki-text"),
      tor: JSON.stringify((window.TF_SKIZZE || {}).tor || null) };
    closeAddTraining();
    // d) neue Übung
    openAddTraining(); await warte(50);
    out.d = ki();
    document.getElementById("tf-ki-text").value = "Vier Hütchen in einer Reihe, jedes Kind dribbelt im Slalom durch und schießt aufs Minitor, danach außen zurück.";
    await tfKiAuswerten(); await warte(100);
    closeAddTraining();
    // e) aus dem Bearbeiten
    uebungBearbeiten(idx()); await warte(100);
    const vk = document.getElementById("tf-variante");
    out.e = { sichtbar: vk && !vk.hidden, hoehe: vk ? Math.round(parseFloat(getComputedStyle(vk).minHeight) || vk.getBoundingClientRect().height) : 0 };
    if (vk) vk.click(); await warte(100);
    out.e.titel = ki().titelForm; out.e.editIdx = window.TF_EDIT_IDX; out.e.name = w("tf-name");
    await saveCustomTraining(); await warte(200);
    return out;
  });
  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v722 Übung kopieren als Variante, KI-Feld „Was soll anders sein?“";
  if (r.fehlt && r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));

  if (!r.kopierKnopf || !/Variante von „Testform Farbtore“/.test(r.a.titelForm) || !/Was soll anders sein/.test(r.a.titel) || !/Änderung einarbeiten/.test(r.a.los)) probleme.push("a) " + JSON.stringify(r.a));
  else if (!/\(Variante\)/.test(r.a.name) || !/Minitore/.test(r.a.ablauf) || !r.a.skizze) probleme.push("a) Felder: " + JSON.stringify(r.a));
  else zeilen.push(`a) „${r.a.titelForm}“, Name „${r.a.name}“, Ablauf und Skizze übernommen, KI-Feld „Was soll anders sein?“`);

  const vA = anfragen.filter(a => a.modus === "variante");
  if (!/anders sein/.test(r.c || "") || vA.length !== 1) probleme.push(`c) zu kurz: „${r.c}“, ${vA.length} Variante-Anfragen`);
  else zeilen.push("c) zu kurze Änderung → Hinweis, keine Anfrage");

  const v = vA[0] || {};
  if (!v.basis || !/\(Variante\)/.test(v.basis.titel) || !/Minitore/.test(v.basis.beschreibung) || !v.basis.skizze || !/Jugendtore/.test(v.aenderung || "")) probleme.push("b) Anfrage: " + JSON.stringify(v).slice(0, 220));
  else if (r.b.name !== "Farbtore mit Jugendtoren" || !/Jugendtore/.test(r.b.ablauf) || !/4 je Station/.test(r.b.spieler) || !/"j"/.test(r.b.tor)) probleme.push("b) Felder: " + JSON.stringify(r.b));
  else if (!/Geändert:/.test(r.b.stand) || !/Ablauf/.test(r.b.stand) || !/Skizze/.test(r.b.stand) || r.b.feld) probleme.push("b) Rückmeldung: " + r.b.stand + " / Feld: " + r.b.feld);
  else zeilen.push(`b) modus „variante“ mit ganzer Übung + Änderung · ${r.b.stand.split(".")[0]}`);

  const tA = anfragen.filter(a => a.modus === "text");
  if (!/Beschreib die Übung/.test(r.d.titel) || !/KI-Auswertung/.test(r.d.los) || tA.length !== 1) probleme.push("d) neue Übung: " + JSON.stringify(r.d) + `, ${tA.length} Text-Anfragen`);
  else zeilen.push("d) neue Übung: KI-Feld wieder „Beschreib die Übung“, Anfrage im modus „text“");

  const post = schreiben.filter(x => x.m === "POST"), patch = schreiben.filter(x => x.m === "PATCH");
  if (!r.e.sichtbar || r.e.hoehe < 44) probleme.push("e) Knopf im Bearbeiten: " + JSON.stringify(r.e));
  else if (r.e.editIdx != null || !/Variante von/.test(r.e.titel)) probleme.push("e) nach Kopieren: " + JSON.stringify(r.e));
  else if (post.length !== 1 || patch.length) probleme.push(`e) gespeichert: ${post.length} POST, ${patch.length} PATCH`);
  else zeilen.push(`e) „Als Variante kopieren“ im Bearbeiten → neue Übung „${r.e.name}“ (POST), Original unberührt`);

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
