/* v517 – Auftragspaket „Skizze v2“: Jugendtor als eigener Tortyp, Mittellinie und
   Schusszone als Linien, Spieltags-Vorlagen, Skizze als PNG weitergeben, dazu vier
   Übungen und eine Vorlage aus der DFB-Lehrgangsarbeit.
   Alles additiv – deshalb steht die Rückwärtskompatibilität hier an erster Stelle: ein Tor
   OHNE fünftes Feld muss zeichengleich bleiben, sonst verändern sich still 61 bestehende
   Skizzen. Geprüft werden die Zeichenketten selbst, nicht nur „sieht ähnlich aus“.
   Dazu die Falle, die im Auftragspaket nicht stand: eine Skizze, die NUR aus Linien
   besteht, galt beim Speichern als leer und wäre verworfen worden (dieselbe Art Lücke wie
   der Versatz in v514). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const s = await h.starten({
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], trainingsformen: [] }),
    hoehe: 1800, bibliothek: true
  });

  const r = await s.page.evaluate(async ({ kh }) => {
    eval(kh);
    const warte = ms => new Promise(r => setTimeout(r, ms));
    for (const n of ["_skz", "skzLegende", "skzTeilenKnopf", "skzTeilen", "_eiSkizzeOk", "skzEditorOpen", "skzBuehneDown"])
      if (typeof window[n] !== "function") return { fehlt: n };

    // ── 1 · Jugendtor gegen Minitor ─────────────────────────────────────────
    const jug = _skz({ tor: [[20, 68, "v", 44, "j"]] });
    const mini = _skz({ tor: [[20, 68, "v", 44]] });
    const tor = {
      jugStrich: /<rect[^>]*stroke-width="3"/.test(jug),
      jugNetz: (jug.match(/<line[^>]*stroke="#fff"[^>]*stroke-width="1"/g) || []).length,
      jugFuell: /fill="rgba\(255,255,255,\.25\)"/.test(jug),
      jugTiefe: /<rect x="20" y="68" width="10" height="44"/.test(jug),
      miniStrich: /<rect[^>]*stroke-width="2\.5"/.test(mini),
      miniNetz: (mini.match(/<line[^>]*stroke="#fff"[^>]*stroke-width="1"/g) || []).length,
      /* Zeichengleich zu vor v517 – beide Lagen, exakte Zeichenkette. */
      altV: mini.indexOf('<rect x="20" y="68" width="7" height="44" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/>') >= 0,
      altH: _skz({ tor: [[20, 68, "h", 44]] }).indexOf('<rect x="20" y="68" width="44" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/>') >= 0
    };

    // ── 2 · Linien: Muster UND Farbe ────────────────────────────────────────
    const sz = _skz({ li: [[0, 0, 10, 10, "sz"]] }), mi = _skz({ li: [[0, 0, 10, 10, "m"]] });
    const linie = {
      szGestrichelt: /stroke-dasharray/.test(sz), szFarbe: /stroke="#fbbf24"/.test(sz),
      mGestrichelt: /stroke-dasharray/.test(mi), mFarbe: /stroke="rgba\(255,255,255,\.7\)"/.test(mi),
      /* Reihenfolge: nach den Zonen, vor den Toren. */
      reihenfolge: (() => { const x = _skz({ z: [[0, 0, 5, 5]], li: [[0, 0, 9, 9, "m"]], tor: [[1, 1, "h", 9]] });
        return x.indexOf("<rect x=\"0\" y=\"0\" width=\"5\"") < x.indexOf("<line") && x.indexOf("<line") < x.indexOf("<rect x=\"1\""); })()
    };

    // ── 3 · Editor: Tor richtet sich nach der Tipp-Position ─────────────────
    skzEditorOpen(null, () => {});
    await warte(250);
    const b = document.getElementById("skz-buehne");
    /* Die Maße JE Tipp holen: sobald die erste Zeichnung in der Bühne steht, ändert sich
       ihre Höhe – ein einmal gemerkter Rahmen rechnet danach falsch. */
    const tipp = (sx, sy) => { const rect = b.getBoundingClientRect();
      skzBuehneDown({ clientX: rect.left + sx / 280 * rect.width,
                      clientY: rect.top + sy / 180 * rect.height,
                      preventDefault() {} }); };
    skzSetWerkzeug("tor");      tipp(20, 90);   // links
    skzSetWerkzeug("tor");      tipp(140, 30);  // Mitte
    skzSetWerkzeug("tor");      tipp(260, 90);  // rechts
    skzSetWerkzeug("jugendtor");tipp(20, 60);
    const tore = (_skzSpec.tor || []).map(t => t.join("|"));
    // Zwei Tipps ergeben eine Linie, Undo nimmt sie zurück
    skzSetWerkzeug("mittellinie"); tipp(140, 20); tipp(140, 160);
    const liNach = (_skzSpec.li || []).length;
    const liEintrag = (_skzSpec.li || [])[0] ? _skzSpec.li[0].join("|") : "";
    // Verschieben bewegt beide Punkte
    const tr = _skzTreffer(140, 20);
    if (tr) _skzVerschieben(tr, 150, 30);
    const liVerschoben = (_skzSpec.li || [])[0] ? _skzSpec.li[0].join("|") : "";
    skzUndo();                                   // nimmt die Linie zurück
    const liNachUndo = (_skzSpec.li || []).length;
    // Eine Skizze aus LAUTER Linien darf nicht als leer gelten
    _skzSpec = _skzLeer(); _skzSpec.li.push([10, 10, 20, 20, "m"]);
    let gespeichert = "nichts";
    _skzCb = spec => { gespeichert = spec ? "spec" : "null"; };
    skzSpeichern();
    await warte(120);
    const werkzeuge = SKZ_WERK.map(w => w.id);
    const vorlagen = SKZ_VORLAGEN.map(v => v.n);

    // ── 4 · Import kennt die Liste ──────────────────────────────────────────
    const imp = { objekt: _eiSkizzeOk({ li: {} }), liste: _eiSkizzeOk({ li: [] }),
                  inListe: (typeof EI_SKZ_LISTEN !== "undefined") && EI_SKZ_LISTEN.indexOf("li") >= 0 };

    // ── 5 · „Skizze teilen“ im gerenderten DOM ──────────────────────────────
    const box = document.createElement("div");
    box.innerHTML = _skz({ tor: [[20, 68, "v", 44, "j"]] }) + skzLegende() + skzTeilenKnopf("Test & Übung \"A\"");
    document.body.appendChild(box);
    const knopf = box.querySelector("button.skz-teilen");
    const knopfHoehe = knopf ? knopf.offsetHeight : 0;
    const knopfName = knopf ? knopf.dataset.name : "";
    /* Findet er die Skizze und nicht ein Legenden-Bildchen? */
    const gefunden = (() => {
      const wrap = knopf && knopf.parentElement;
      const t = wrap && [...wrap.querySelectorAll("svg")].find(x => x.getAttribute("viewBox") === "0 0 280 180");
      return !!t && t === box.querySelector("svg");
    })();
    const slug = typeof _skzSlug === "function" ? _skzSlug("Größe: 3 gegen 3!") : "";
    box.remove();

    // ── 6 · Legende: sechs Einträge, jeder lesbar auf dem Rasen ─────────────
    const lbox = document.createElement("div"); lbox.innerHTML = skzLegende(); document.body.appendChild(lbox);
    const eintraege = [...lbox.querySelectorAll("span")].map(x => x.textContent.trim());
    const rasen = [45, 106, 45, 1];
    const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const kontr = f => { const m = String(f).match(/(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      let c = m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : (() => { const x = String(f).replace("#", ""); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), 1]; })();
      c = [0, 1, 2].map(i => c[i] * c[3] + rasen[i] * (1 - c[3]));
      const [a, bb] = [lum(c), lum(rasen)].sort((p, q) => q - p);
      return +(((a + .05) / (bb + .05)).toFixed(2)); };
    const farben = [...new Set([...lbox.querySelectorAll("line")].map(x => x.getAttribute("stroke")))];
    const kontraste = {}; farben.forEach(f => kontraste[f] = kontr(f));
    lbox.remove();

    return { tor, linie, tore, liNach, liEintrag, liVerschoben, liNachUndo, gespeichert,
             werkzeuge, vorlagen, imp, knopfHoehe, knopfName, gefunden, slug, eintraege, kontraste };
  }, { kh: h.kontrastHelfer });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Skizze v2", false, probleme); }

  // ── Jugendtor / Minitor ───────────────────────────────────────────────────
  if (!r.tor.jugStrich) probleme.push("Jugendtor hat nicht stroke-width=3");
  if (r.tor.jugNetz !== 3) probleme.push(`Jugendtor hat ${r.tor.jugNetz} Netzlinien statt 3 – ohne sie wäre die Größe das einzige Unterscheidungsmerkmal`);
  if (!r.tor.jugFuell) probleme.push("Jugendtor ist nicht hinterlegt");
  if (!r.tor.jugTiefe) probleme.push("Jugendtor ist nicht 10 tief");
  if (!r.tor.miniStrich) probleme.push("Minitor hat nicht mehr stroke-width=2.5");
  if (r.tor.miniNetz !== 0) probleme.push(`Minitor hat ${r.tor.miniNetz} Netzlinien – es darf keine haben`);
  if (!r.tor.altV || !r.tor.altH) probleme.push("Ein Tor ohne fünftes Feld wird nicht mehr zeichengleich gezeichnet – bestehende Skizzen verändern sich");

  // ── Linien ────────────────────────────────────────────────────────────────
  if (!r.linie.szGestrichelt || !r.linie.szFarbe) probleme.push("Die Schusszone ist nicht gestrichelt gelb");
  if (r.linie.mGestrichelt) probleme.push("Die Mittellinie ist gestrichelt – sie muss durchgezogen sein");
  if (!r.linie.mFarbe) probleme.push("Die Mittellinie hat nicht die weiße Linienfarbe");
  if (!r.linie.reihenfolge) probleme.push("Linien werden nicht zwischen Zonen und Toren gezeichnet");

  // ── Editor ────────────────────────────────────────────────────────────────
  const sollTore = ["4|90|v|30", "140|30|h|30", "269|90|v|30", "4|60|v|44|j"];
  if (r.tore.join(" · ") !== sollTore.join(" · "))
    probleme.push(`Tore nach vier Tipps: ${r.tore.join(" · ")} – erwartet ${sollTore.join(" · ")} (links/rechts hochkant und bündig, Mitte quer)`);
  if (r.liNach !== 1) probleme.push(`Zwei Tipps ergeben ${r.liNach} Linien statt 1`);
  if (r.liEintrag !== "140|20|140|160|m") probleme.push(`Die Linie steht als „${r.liEintrag}“ statt „140|20|140|160|m“`);
  if (r.liVerschoben !== "150|30|150|170|m") probleme.push(`Verschieben ergibt „${r.liVerschoben}“ – es müssen beide Punkte mitgehen`);
  if (r.liNachUndo !== 0) probleme.push("Undo nimmt die Linie nicht zurück");
  if (r.gespeichert !== "spec") probleme.push("Eine Skizze aus lauter Linien gilt beim Speichern als leer und wird verworfen");
  ["jugendtor", "mittellinie", "schusszone"].forEach(id => { if (!r.werkzeuge.includes(id)) probleme.push(`Werkzeug „${id}“ fehlt`); });
  if (r.werkzeuge.indexOf("jugendtor") !== r.werkzeuge.indexOf("tor") + 1) probleme.push("Das Jugendtor steht nicht direkt hinter dem Tor");
  ["Spieltag F: 3 gegen 3, vier Minitore", "Spieltag F: 2+1, Jugendtore", "Drei gegen einen"].forEach(n => {
    if (!r.vorlagen.includes(n)) probleme.push(`Vorlage „${n}“ fehlt`); });
  if (r.vorlagen.length !== 13) probleme.push(`${r.vorlagen.length} Vorlagen statt 13 – die zehn bestehenden bleiben`);

  // ── Import ────────────────────────────────────────────────────────────────
  if (r.imp.objekt !== false) probleme.push("„li“ als Objekt wird nicht abgewiesen");
  if (r.imp.liste !== true) probleme.push("„li“ als Liste wird nicht angenommen");
  if (!r.imp.inListe) probleme.push("EI_SKZ_LISTEN kennt „li“ nicht – die Fehlermeldung nennt sie dann auch nicht");

  // ── Teilen ────────────────────────────────────────────────────────────────
  if (r.knopfHoehe < 44) probleme.push(`„Skizze teilen“ ist ${r.knopfHoehe} px hoch (mindestens 44)`);
  if (r.knopfName !== 'Test & Übung "A"') probleme.push(`Der Übungsname kommt als „${r.knopfName}“ am Knopf an – Anführungszeichen und & müssen den Knopf heil lassen`);
  if (!r.gefunden) probleme.push("Beim Teilen würde ein Legenden-Bildchen statt der Skizze genommen");
  if (r.slug !== "groesse-3-gegen-3") probleme.push(`Der Dateiname wird „${r.slug}.png“ – erwartet „groesse-3-gegen-3.png“`);

  // ── Legende ───────────────────────────────────────────────────────────────
  if (r.eintraege.length !== 6) probleme.push(`Die Legende zeigt ${r.eintraege.length} Einträge statt 6`);
  ["Schusszone", "Mittellinie"].forEach(n => { if (!r.eintraege.includes(n)) probleme.push(`In der Legende fehlt „${n}“`); });
  Object.keys(r.kontraste).forEach(f => { if (r.kontraste[f] < 3) probleme.push(`Legende: ${f} nur ${r.kontraste[f]}:1 auf dem Rasen (mindestens 3)`); });

  // ── Die Inhalte aus dem Anhang ────────────────────────────────────────────
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const neu = ["Drei gegen einen im Quadrat", "3 gegen 3 auf vier Minitore mit Schusszone", "Passtor im Quadrat", "2+1 gegen 2+1 auf Jugendtore"];
  const namen = bib.uebungen.map(u => u.name);
  neu.forEach(n => { if (!namen.includes(n)) probleme.push(`In bibliothek.json fehlt „${n}“`); });
  if (bib.stand !== "2026-09-12-1") probleme.push(`bibliothek.json steht auf „${bib.stand}“ statt „2026-09-12-1“ – ohne neuen Stand gleicht die App nicht ab`);
  if (vor.stand !== "2026-09-12-1") probleme.push(`vorlagen.json steht auf „${vor.stand}“ statt „2026-09-12-1“`);
  if (new Set(namen).size !== namen.length) probleme.push("In bibliothek.json steht ein Name doppelt – der Abgleich legte eine Dublette an");
  const lehr = vor.vorlagen.find(v => /^L4-2/.test(v.name));
  if (!lehr) probleme.push("Die Vorlage „L4-2 …“ fehlt in vorlagen.json");
  else {
    /* Jede Übung der Vorlage muss es geben – sonst weist der Abgleich sie ab und merkt sich
       den Stand trotzdem: der Fehler wäre dauerhaft und lautlos. */
    const ausData = fs.readFileSync(path.join(h.REPO, "data.js"), "utf8");
    const fehlend = [...new Set(lehr.bloecke.map(b => b.uebung_name).filter(Boolean))]
      .filter(n => !namen.includes(n) && ausData.indexOf("name:'" + n + "'") < 0 && ausData.indexOf('name:"' + n + '"') < 0);
    if (fehlend.length) probleme.push(`Die Vorlage verweist auf Übungen, die es nicht gibt: ${fehlend.join(", ")}`);
    const labels = lehr.bloecke.map(b => b.label);
    if (new Set(labels).size !== labels.length) probleme.push("Zwei Phasen der Vorlage tragen dasselbe Label – tpPlanRestore ordnet dann beliebig zu");
    const spielform = lehr.bloecke.filter(b => ["main", "abschluss"].includes(b.typ)).reduce((a, b) => a + (Number(b.dauer) || 0), 0);
    const anteil = spielform ? lehr.netto_spielform_min / spielform : 0;
    if (anteil < 0.6 || anteil > 1) probleme.push(`Netto ${lehr.netto_spielform_min} zu ${spielform} Minuten Spielform = ${Math.round(anteil * 100)} % – ausserhalb von 60–100 %`);
    zeilen.push(`Vorlage „${lehr.name}“: ${lehr.bloecke.length} Blöcke, ${[...new Set(lehr.bloecke.map(b => b.uebung_name))].length} Übungen, netto ${Math.round(anteil * 100)} %`);
  }
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Jugendtor: Strich 3, ${r.tor.jugNetz} Netzlinien, hinterlegt · Minitor zeichengleich zu vorher: ${r.tor.altV && r.tor.altH}`);
  zeilen.push(`Tore nach Tipp-Position: ${r.tore.join(" · ")}`);
  zeilen.push(`Linie setzen ${r.liEintrag} → verschieben ${r.liVerschoben} → Undo ${r.liNachUndo === 0} · nur Linien wird gespeichert: ${r.gespeichert === "spec"}`);
  zeilen.push(`Werkzeuge ${r.werkzeuge.length} · Vorlagen ${r.vorlagen.length} · Teilen ${r.knopfHoehe} px, Datei „${r.slug}.png“`);
  zeilen.push(`Legende ${r.eintraege.length} Einträge · Kontraste ${Object.keys(r.kontraste).map(f => f + " " + r.kontraste[f]).join(" · ")}`);
  zeilen.push(`bibliothek.json ${bib.uebungen.length} Übungen (Stand ${bib.stand}) · vorlagen.json ${vor.vorlagen.length} (Stand ${vor.stand})`);
  return h.ergebnis("Skizze v2 – Jugendtor, Linien, Vorlagen, Bild teilen", !probleme.length, zeilen.concat(probleme));
};
