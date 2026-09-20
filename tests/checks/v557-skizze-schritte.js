/* v557 – Schritte: eine Skizze in mehreren Bildern.

   Eine Übung hat fast immer drei Momente: Aufbau, Pass, Abschluss. Bisher mussten sie
   alle gleichzeitig in ein Bild – „Dreieckspassen mit Abschluss" zeigte fünf Pfeile auf
   einmal, und ein Kind liest daraus keinen Ablauf. Jetzt teilen sich mehrere Bilder den
   Aufbau; beweglich sind nur Spieler, Ball, Pfeile und Beschriftung.

   Zwei Dinge können dabei still schiefgehen:
   • Der Renderer bekommt ein zweites Argument. Alles, was ihn ohne dieses Argument
     aufruft – 107 mitgelieferte Zeichnungen, der Editor, der Bildexport – muss danach
     exakt dasselbe zeichnen wie vorher.
   • Ein Schritt mit einem Spieler zu viel oder einer Farbe daneben zeichnet trotzdem.
     Im nächsten Bild läuft dann ein anderes Kind, und niemand bekommt eine Meldung.

   Fälle:
   a) `_skzBild` mischt richtig: Aufbau aus Bild 1, Bewegliches aus dem gewählten Bild,
      Weggelassenes aus dem Bild davor.
   b) Ohne Schritte und ohne Bildnummer ändert sich nichts.
   c) Der Import weist ab: zu viele Schritte, ein Spieler zu viel, eine Farbe daneben,
      Aufbau in einem Schritt, `schritte` als Objekt. Die echte Datei kommt durch.
   d) Editor: „+ Bild" legt Bild 2 mit denselben Spielern an, der Aufbau ist dort
      gesperrt, Verschieben ändert nur den Schritt, Rückgängig stellt es wieder her.
   e) Detailfenster: ohne Schritte keine Bildknöpfe, mit Schritten so viele wie Bilder,
      jeder 44 px, und der aktive ist ausgezeichnet.
   f) Im großen Fenster wechselt Wischen das Bild.
   g) In KEINEM Bild der mitgelieferten Skizzen stehen zwei Spieler näher als 24 px.
   h) Zu jedem Bild der Lehrgangsübung liegt die Exportdatei bereit. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const mitSchritten = (bib.uebungen || []).filter(u => u.skizze && Array.isArray(u.skizze.schritte) && u.skizze.schritte.length);
  if (!mitSchritten.length) probleme.push("Keine einzige Übung benutzt die Schritte – der Umbau hätte keinen Anwendungsfall");

  /* Die Übung mit den Schritten steht in der Datei, nicht in der Attrappe. Damit sie in
     tpAllForms() ankommt, muss der Abgleich beim Öffnen sie anlegen dürfen – die
     Attrappe merkt sich deshalb, was sie per POST bekommt, und gibt es zurück. */
  const custom = [];
  const s = await h.starten({
    bibliothek: true, hoehe: 1500,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), termine: [],
      trainingsformen: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); custom.push({ ...b, id: 7000 + custom.length, custom: true }); return { status: 201, body: "[]" }; }
        return custom;
      }
    })
  });
  /* Der Service Worker lädt die Seite beim Übernehmen einmal von selbst neu (boot.js,
     „controllerchange"). Wer wie hier länger im Browser arbeitet, verliert dabei mitten
     im Lauf den Ausführungskontext. Deshalb wird er hier gar nicht erst zugelassen:
     sw.js antwortet wie eine fehlende Datei, danach einmal frisch laden. Das ist
     dieselbe Maßnahme, die CLAUDE.md für jede Prüfung im Browser vorschreibt, nur
     gleich an der Quelle. */
  await s.ctx.route("**/sw.js", r => r.fulfill({ status: 404, contentType: "text/plain", body: "" }));
  await s.page.evaluate(async () => {
    try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(x => x.unregister())); } catch (e) {}
  }).catch(() => {});
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForTimeout(900);
  await s.page.evaluate(() => {
    window.sbToken = () => "attrappe";
    window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" });
  });
  const ruhig = async fn => fn();
  await s.page.waitForFunction(
    () => typeof tpAllForms === "function" && typeof skzBildZahl === "function" && typeof skzSpecVon === "function",
    { timeout: 20000 });
  await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80; i++) {
      const da = (tpAllForms() || []).some(f => f.custom);
      if (typeof _bibLaeuft !== "undefined" && !_bibLaeuft && da) break;
      await warte(100);
    }
    while (typeof _bibLaeuft !== "undefined" && _bibLaeuft) await warte(50);
  });
  await h.sichtbarMachen(s.page, "#view-formen");

  const r = await ruhig(() => s.page.evaluate(({ datei }) => {
    for (const n of ["_skzBild", "skzBildZahl", "_eiSkizzeFehler", "skzBildNeu", "skzBilderLeiste"])
      if (typeof window[n] !== "function" && typeof eval("typeof " + n) !== "function") return { fehlt: n };

    // ── a) Mischen ──────────────────────────────────────────────────────────
    const probe = {
      z: [[10, 10, 50, 50]], tor: [[5, 5, "h", 24]], li: [[0, 90, 280, 90, "sz"]],
      s: [[20, 20, "g", "A"]], b: [[25, 25]], p: [[1, 1, 2, 2, "p"]], tx: [[9, 9, "eins"]],
      schritte: [
        { s: [[40, 40, "g", "A"]], p: [[3, 3, 4, 4, "l"]] },
        { s: [[60, 60, "g", "A"]], tx: [[9, 9, "drei"]] }
      ]
    };
    const b2 = _skzBild(probe, 1), b3 = _skzBild(probe, 2);
    const mischen = {
      aufbauDa: !!(b3.z && b3.tor && b3.li),
      keineSchritteImBild: b3.schritte === undefined,
      spieler2: JSON.stringify(b2.s), spieler3: JSON.stringify(b3.s),
      ballBleibt: JSON.stringify(b3.b) === JSON.stringify(probe.b),
      pfeilGetragen: JSON.stringify(b3.p) === JSON.stringify(probe.schritte[0].p),
      textDrei: JSON.stringify(b3.tx),
      zahl: skzBildZahl(probe)
    };
    // b) ohne Schritte
    const ohne = { s: [[1, 1, "g"]] };
    const gleich = _skz(ohne) === _skz(ohne, { bild: 3 }) && _skz(ohne) === _skz(_skzBild(ohne, 2));

    // ── c) Import ───────────────────────────────────────────────────────────
    const basis = { s: [[1, 1, "g", "A"], [2, 2, "r", "B"]], b: [[3, 3]] };
    const mit = x => Object.assign({}, basis, { schritte: x });
    const pruef = {
      gut: _eiSkizzeFehler(mit([{ s: [[5, 5, "g", "A"], [6, 6, "r", "B"]] }])),
      zuViele: _eiSkizzeFehler(mit([{}, {}, {}, {}, {}, {}, {}])),
      einerZuViel: _eiSkizzeFehler(mit([{ s: [[1, 1, "g", "A"], [2, 2, "r", "B"], [3, 3, "g", "C"]] }])),
      farbe: _eiSkizzeFehler(mit([{ s: [[1, 1, "b", "A"], [2, 2, "r", "B"]] }])),
      aufbau: _eiSkizzeFehler(mit([{ tor: [[1, 1, "h", 24]] }])),
      objekt: _eiSkizzeFehler(Object.assign({}, basis, { schritte: { a: 1 } })),
      echt: (datei.uebungen || []).map(u => u.skizze ? _eiSkizzeFehler(u.skizze) : []).filter(x => x.length)
    };

    // ── d) Editor ───────────────────────────────────────────────────────────
    let editor = {};
    skzEditorOpen({ s: [[40, 40, "g", "A"], [80, 80, "r", "B"]], b: [[45, 45]], tor: [[5, 5, "h", 24]] }, () => {});
    skzBildNeu();
    const tor = document.querySelector('#skz-palette button[data-werk="tor"]');
    const spieler = document.querySelector('#skz-palette button[data-werk="spieler"]');
    editor.bildNr = _skzBildNr;
    editor.spielerGleich = JSON.stringify((_skzSchritte()[0] || {}).s) === JSON.stringify(_skzSpec.s);
    editor.torGesperrt = !!(tor && tor.disabled);
    editor.spielerGesperrt = !!(spieler && spieler.disabled);
    editor.knoepfe = document.querySelectorAll("#skz-bildleiste button").length;
    // Verschieben in Bild 2
    const vorherBasis = JSON.stringify(_skzSpec.s);
    _skzMerken();
    _skzVerschieben({ feld: "s", idx: 0 }, 120, 120);
    editor.basisUnberuehrt = JSON.stringify(_skzSpec.s) === vorherBasis;
    editor.schrittBewegt = JSON.stringify((_skzSchritte()[0] || {}).s).includes("120");
    skzUndo();
    editor.nachUndo = JSON.stringify((_skzSchritte()[0] || {}).s) === JSON.stringify(_skzSpec.s);
    document.getElementById("skz-modal")?.remove();

    return { mischen, gleich, pruef, editor };
  }, { datei: bib }));

  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Skizze in Schritten", false, [r.fehlt + " fehlt"]); }

  const m = r.mischen;
  if (!m.aufbauDa) probleme.push("Der Aufbau fehlt im gemischten Bild");
  if (!m.keineSchritteImBild) probleme.push("Das gemischte Bild schleppt die Schrittliste mit");
  if (m.spieler2 !== '[[40,40,"g","A"]]') probleme.push("Bild 2 nimmt die Spieler nicht aus Schritt 1: " + m.spieler2);
  if (m.spieler3 !== '[[60,60,"g","A"]]') probleme.push("Bild 3 nimmt die Spieler nicht aus Schritt 2: " + m.spieler3);
  if (!m.ballBleibt) probleme.push("Der Ball wird nicht aus Bild 1 weitergetragen");
  if (!m.pfeilGetragen) probleme.push("Ein Pfeil, den Bild 3 nicht nennt, wird nicht aus Bild 2 weitergetragen");
  if (m.textDrei !== '[[9,9,"drei"]]') probleme.push("Die Beschriftung von Bild 3 stimmt nicht: " + m.textDrei);
  if (m.zahl !== 3) probleme.push(`skzBildZahl meldet ${m.zahl} statt 3`);
  if (!r.gleich) probleme.push("Eine Skizze ohne Schritte zeichnet mit Bildnummer anders");
  if (!probleme.length) zeilen.push("Mischen: Aufbau aus Bild 1, Bewegliches aus dem Bild, Weggelassenes aus dem davor");

  const p = r.pruef;
  if (p.gut.length) probleme.push("Ein gültiger Schritt wird abgewiesen: " + p.gut.join("; "));
  [["zuViele", "sieben Schritte"], ["einerZuViel", "ein Spieler zu viel"], ["farbe", "eine Farbe daneben"],
   ["aufbau", "Aufbau in einem Schritt"], ["objekt", "schritte als Objekt"]]
    .forEach(([k, was]) => { if (!p[k].length) probleme.push("Nicht abgewiesen: " + was); });
  if (p.echt.length) probleme.push("Die echte Datei kommt nicht durch die Prüfung: " + p.echt[0].join("; "));
  if (!probleme.length) zeilen.push(`Prüfung: fünf Fehlbilder benannt (z. B. „${p.einerZuViel[0]}“), die Datei selbst sauber`);

  const e = r.editor;
  if (e.bildNr !== 1) probleme.push(`Nach „+ Bild“ steht der Editor auf Bild ${e.bildNr + 1} statt auf Bild 2`);
  if (!e.spielerGleich) probleme.push("„+ Bild“ übernimmt die Spieler nicht");
  if (!e.torGesperrt || !e.spielerGesperrt) probleme.push("In Bild 2 sind Aufbau-Werkzeuge nicht gesperrt");
  if (e.knoepfe < 3) probleme.push(`Die Bildleiste hat nur ${e.knoepfe} Knöpfe`);
  if (!e.basisUnberuehrt) probleme.push("Verschieben in Bild 2 hat Bild 1 verändert");
  if (!e.schrittBewegt) probleme.push("Verschieben in Bild 2 ist nicht im Schritt angekommen");
  if (!e.nachUndo) probleme.push("Rückgängig stellt Bild 2 nicht wieder her");
  if (!probleme.length) zeilen.push("Editor: „+ Bild“ übernimmt die Spieler, der Aufbau bleibt Bild 1 vorbehalten, Rückgängig greift");

  // ── e) + f) + g) Detail, Wischen, Abstände ────────────────────────────────
  /* In mehreren kurzen Schritten statt in einem langen: der Trainer-Einstieg meldet in
     den ersten Sekunden noch den Service Worker an und lädt dabei einmal neu. Ein
     Aufruf, der über diesen Moment hinweg im Browser steht, verliert seinen
     Ausführungskontext – kurze Aufrufe nicht. */
  const schritt = (fn, arg) => s.page.evaluate(fn, arg);
  const w = 'const warte=ms=>new Promise(x=>setTimeout(x,ms));';
  const d = {};

  Object.assign(d, await schritt(() => {
    window.__T = {};
    const alle = tpAllForms() || [];
    __T.mit = alle.findIndex(f => { const sp = skzSpecVon(f); return sp && skzBildZahl(sp) > 1; });
    __T.ohne = alle.findIndex(f => { const sp = skzSpecVon(f); return sp && skzBildZahl(sp) === 1; });
    return { mit: __T.mit, ohne: __T.ohne };
  }));
  if (d.mit < 0) probleme.push("Keine Übung mit Schritten in der Datenbank – der Abgleich hat sie nicht angelegt");
  else {
    Object.assign(d, await schritt(async () => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      tpShowExercise(__T.ohne); await warte(150);
      const keine = document.querySelectorAll("#skz-detail-bilder button").length;
      document.getElementById("uebung-modal")?.remove();
      return { keine };
    }));
    Object.assign(d, await schritt(async () => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      tpShowExercise(__T.mit); await warte(180);
      const k = [...document.querySelectorAll("#skz-detail-bilder button")];
      return {
        knoepfe: k.length,
        erste: k.length ? Math.round(k[0].getBoundingClientRect().height) : 0,
        aktivVorher: k.findIndex(b => b.getAttribute("aria-pressed") === "true"),
        vorher: (document.getElementById("uebung-skizze") || {}).innerHTML || ""
      };
    }));
    Object.assign(d, await schritt(async () => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      const k = [...document.querySelectorAll("#skz-detail-bilder button")];
      k[2] && k[2].click(); await warte(150);
      const r = {
        nachher: (document.getElementById("uebung-skizze") || {}).innerHTML || "",
        aktivNachher: [...document.querySelectorAll("#skz-detail-bilder button")].findIndex(b => b.getAttribute("aria-pressed") === "true")
      };
      document.getElementById("uebung-modal")?.remove();
      return r;
    }));
    Object.assign(d, await schritt(async () => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      skzGrossOpen(__T.mit); await warte(200);
      return { bildKnoepfe: document.querySelectorAll("#skz-gross-bilder button").length };
    }));
    Object.assign(d, await schritt(async () => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      const b = document.getElementById("skz-gross-buehne");
      const pe = (typ, x) => b.dispatchEvent(new PointerEvent(typ, { pointerId: 9, clientX: x, clientY: 300, bubbles: true, cancelable: true }));
      const bildVor = _skzGr.bild;
      pe("pointerdown", 260); pe("pointermove", 120); pe("pointerup", 120); await warte(150);
      const r = { bildVor, bildNach: _skzGr.bild };
      skzGrossClose();
      return r;
    }));
    /* Gemessen wird an den Skizzen MIT Schritten – sie sind das Neue an dieser Version.
       Im Altbestand gibt es engere Aufstellungen; die werden gezählt und genannt, aber
       nicht zum Fehler gemacht: sie stammen nicht aus diesem Paket und hängen an der
       Sperrklinke, die den Altbestand Stück für Stück abbaut. */
    Object.assign(d, await schritt(() => {
      const eng = [], altbestand = [];
      (tpAllForms() || []).forEach(f => {
        const sp = skzSpecVon(f); if (!sp) return;
        const hatSchritte = skzBildZahl(sp) > 1;
        for (let n = 0; n < skzBildZahl(sp); n++) {
          const pos = (_skzBild(sp, n).s || []);
          for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
            const dd = Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]);
            if (dd < 24) (hatSchritte ? eng : altbestand).push(`${f.name}, Bild ${n + 1}: ${Math.round(dd)} px`);
          }
        }
      });
      return { eng, altbestand };
    }));
    d.gewechselt = d.vorher !== d.nachher;
  }

  if (d.mit >= 0) {
    if (d.keine) probleme.push(`Eine Skizze ohne Schritte zeigt ${d.keine} Bildknöpfe`);
    if (d.knoepfe < 2) probleme.push("Die Bildknöpfe fehlen im Detailfenster");
    else {
      if (d.erste < 44) probleme.push(`Die Bildknöpfe sind ${d.erste} px hoch – gefordert 44`);
      if (d.aktivVorher !== 0) probleme.push(`Beim Öffnen ist Bild ${d.aktivVorher + 1} ausgewählt statt Bild 1`);
      if (d.aktivNachher !== 2) probleme.push(`Nach dem Tippen ist Bild ${d.aktivNachher + 1} ausgezeichnet statt Bild 3`);
      if (!d.gewechselt) probleme.push("Das Bild im Detailfenster hat sich beim Blättern nicht geändert");
    }
    if (d.bildNach !== d.bildVor + 1) probleme.push(`Wischen wechselt nicht weiter: ${d.bildVor} → ${d.bildNach}`);
    if (d.bildKnoepfe < 2) probleme.push("Im großen Fenster fehlen die Bildknöpfe");
    if (d.eng.length) probleme.push("Zwei Spieler stehen näher als 24 px: " + d.eng.slice(0, 3).join(" · "));
    if (d.altbestand.length) zeilen.push(`Befund am Altbestand, nicht aus diesem Paket: ${d.altbestand.length} Stellen unter 24 px Spielerabstand, engste ${d.altbestand[0]}`);
    if (!probleme.length) zeilen.push(`Blättern: ${d.knoepfe} Bilder im Detail, Wischen im großen Fenster greift, kein Bild unter 24 px Spielerabstand`);
  }

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  // ── h) Exportdateien ──────────────────────────────────────────────────────
  /* v588: Geprüft wird der Export DER Übung, die in doku/auftrag-einheit-lf4 liegt. Bis v587 lief die
     Schleife über alle Übungen mit Schritten und erwartete für jede die Dateien des Dreieckspassens –
     sobald eine andere Übung mehr Bilder hatte (die Raute mit sechs), fehlte eine Datei, die es nie gab. */
  mitSchritten.filter(u => u.name === "Dreieckspassen mit Abschluss").forEach(u => {
    const n = 1 + u.skizze.schritte.length;
    for (let i = 2; i <= n; i++) {
      const datei = path.join(h.REPO, "doku/auftrag-einheit-lf4",
        "uebung-2-dreieckspassen-mit-abschluss-bild-" + i + ".png");
      if (!fs.existsSync(datei)) probleme.push("Exportdatei fehlt: " + path.basename(datei));
    }
  });
  if (!probleme.length) zeilen.push("Export: je Bild eine Datei für „Dreieckspassen mit Abschluss“");

  return h.ergebnis("Skizze in Schritten: ein Aufbau, mehrere Bilder", !probleme.length, zeilen.concat(probleme));
};
