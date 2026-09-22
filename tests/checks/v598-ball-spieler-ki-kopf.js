/* v598 · Vier Befunde des PO vom 22.09.2026

   a) „Der Ball sollte grundsätzlich als schwarzer Kreis dargestellt werden."
      Gemessen wird die Zeichnung, nicht die Palette: schwarze Füllung, weißer Rand, in
      der dunklen wie in der hellen Fassung. Der weiße Rand ist kein Schmuck — schwarz
      allein kommt auf dem dunklen Rasen auf 2,71:1 und bliebe unter den 3:1 aus CLAUDE.md.

   b) „Wir brauchen ein festes Icon ‚Spieler mit Ball‘."
      Ein Werkzeug, ein Element: der Spieler trägt den Ball im fünften Feld. Geprüft wird,
      dass der Klick genau einen Eintrag in `s` anlegt (und keinen in `b`), dass die
      Zeichnung zwei Kreise mehr hat als ohne Ball, dass das Drehen ins Hochkant-Feld den
      Ball mitnimmt und dass die Materialzeile ihn zählt.

   c) „Beim Anlegen einer eigenen Übung wäre es super, wenn in der Hauptmaske aus den Daten
      direkt die Skizze von der KI gezeichnet werden kann."
      Ohne Ablauf: eine Abfuhr und KEIN Aufruf. Mit Ablauf: genau ein Aufruf, und was
      in der Maske steht (Name, Ablauf, Kinderzahl, Feld), steht auch in der Anfrage.

   d) „Oben links steht immer die Information Hauptteil 1 etc. … nimmt viel zu viel Platz."
      Der Kopf zeigt nur noch den Blockteil; die Feldtexte stehen seit v571 unten an ihrer
      Station. Das Label selbst bleibt unverändert — sonst verlöre `tpFeldTexte` seine
      Quelle. Der volle Text steht im `title`. */
"use strict";

const L48 = "L4-8";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  // ── a) + b) Zeichnung und Werkzeug ──────────────────────────────────────────
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(() => {
      const out = {};
      const ball = _skz({ b: [[140, 90]] });
      out.dunkelFuell = /<circle cx="140" cy="90" r="4" fill="([^"]+)" stroke="([^"]+)"/.exec(ball);
      const hell = _skz({ b: [[140, 90]] }, { hell: true });
      out.hellFuell = /<circle cx="140" cy="90" r="4" fill="([^"]+)" stroke="([^"]+)"/.exec(hell);

      // b) Werkzeug vorhanden und richtig beschrieben?
      const wz = (typeof SKZ_WERK !== "undefined" ? SKZ_WERK : []).find(w => w.id === "spielerball");
      out.werkzeug = wz ? { lbl: wz.lbl, feld: wz.feld, ball: !!wz.ball, gruppe: wz.gruppe } : null;

      // Zeichnung mit und ohne Ball am Spieler
      const ohne = _skz({ s: [[140, 90, "g"]] });
      const mit = _skz({ s: [[140, 90, "g", "", "b"]] });
      out.kreiseOhne = (ohne.match(/<circle/g) || []).length;
      out.kreiseMit = (mit.match(/<circle/g) || []).length;
      out.ballAmFuss = /<circle cx="147" cy="97" r="4"/.test(mit);
      out.keinLeerText = !/<text[^>]*><\/text>/.test(mit);

      // Drehen nimmt das fünfte Feld mit
      const gedreht = (typeof skzDrehen === "function") ? skzDrehen({ s: [[140, 90, "g", "A", "b"]] }) : null;
      out.nachDrehen = gedreht && gedreht.s && gedreht.s[0] ? gedreht.s[0].slice(2) : null;

      // Material zählt ihn
      out.matNurSpieler = skzMaterial({ s: [[140, 90, "g", "", "b"]] }).find(m => m.schluessel === "ball");
      out.matGemischt = skzMaterial({ s: [[60, 60, "g", "", "b"]], b: [[200, 100]] }).find(m => m.schluessel === "ball");
      return out;
    });

    const SCHWARZ = "#111827", WEISS = "#ffffff";
    if (!r.dunkelFuell || r.dunkelFuell[1] !== SCHWARZ || r.dunkelFuell[2] !== WEISS)
      probleme.push(`a) Ball dunkel: ${r.dunkelFuell ? r.dunkelFuell[1] + " auf " + r.dunkelFuell[2] : "nicht gefunden"} statt ${SCHWARZ} mit ${WEISS}`);
    if (!r.hellFuell || r.hellFuell[1] !== SCHWARZ || r.hellFuell[2] !== WEISS)
      probleme.push(`a) Ball hell: ${r.hellFuell ? r.hellFuell[1] + " auf " + r.hellFuell[2] : "nicht gefunden"} statt ${SCHWARZ} mit ${WEISS}`);

    if (!r.werkzeug) probleme.push("b) Kein Werkzeug „spielerball“ in SKZ_WERK");
    else {
      if (r.werkzeug.feld !== "s" || !r.werkzeug.ball) probleme.push(`b) Werkzeug falsch beschrieben: feld=${r.werkzeug.feld}, ball=${r.werkzeug.ball}`);
      if (r.werkzeug.gruppe !== "Auf dem Platz") probleme.push(`b) Werkzeug steht in Gruppe „${r.werkzeug.gruppe}“ statt „Auf dem Platz“`);
    }
    if (r.kreiseMit !== r.kreiseOhne + 1) probleme.push(`b) Mit Ball ${r.kreiseMit} Kreise, ohne ${r.kreiseOhne} – erwartet genau einer mehr`);
    if (!r.ballAmFuss) probleme.push("b) Der Ball sitzt nicht am unteren rechten Rand des Spielers");
    if (!r.keinLeerText) probleme.push("b) Leeres Kürzel erzeugt ein leeres <text>");
    if (!r.nachDrehen || r.nachDrehen[2] !== "b") probleme.push(`b) Nach dem Drehen fehlt der Ball am Spieler (${JSON.stringify(r.nachDrehen)})`);
    if (!r.matNurSpieler || r.matNurSpieler.anzahl !== 1) probleme.push(`b) Material zählt den Ball am Spieler nicht (${JSON.stringify(r.matNurSpieler)})`);
    if (!r.matGemischt || r.matGemischt.anzahl !== 2) probleme.push(`b) Material: Spielerball + einzelner Ball ergibt ${r.matGemischt ? r.matGemischt.anzahl : "nichts"} statt 2`);

    if (!probleme.length) {
      zeilen.push(`a) Ball ${r.dunkelFuell[1]} mit Rand ${r.dunkelFuell[2]} – dunkel wie hell (schwarz allein wären 2,71:1 auf dem Rasen)`);
      zeilen.push(`b) Werkzeug „${r.werkzeug.lbl}“ · ${r.kreiseOhne} → ${r.kreiseMit} Kreise · Drehen behält ${JSON.stringify(r.nachDrehen)} · Material ${r.matGemischt.anzahl} Bälle`);
    }
    const f = s.fehler();
    if (f.length) probleme.push("Konsole (a/b): " + f.join(" | "));
    await s.schliessen();
  }

  // ── c) Skizze aus der Übungsmaske ───────────────────────────────────────────
  {
    const anfragen = [];
    const s = await h.starten({
      start: "/trainer/index.html", warten: 800,
      supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen(), trainingsformen: [],
        funktionen: {
          "ki-uebung": (u, req) => {
            anfragen.push(JSON.parse(req.postData() || "{}"));
            return { uebungen: [{ skizze: { s: [[140, 90, "g"]], h: [[60, 60]], tx: [[140, 165, "aus der Maske"]] } }] };
          }
        }
      })
    });
    /* Der Dialog liegt im Trainings-Bereich; ohne ihn misst der Knopf 0 px, weil kein
       Vorfahre gerendert ist. */
    await h.sichtbarMachen(s.page, "#training-modal");
    const r = await s.page.evaluate(async () => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      const out = {};
      out.hatFunktion = typeof tfSkizzeKi === "function";
      openAddTraining();
      await warte(200);
      const knopf = document.getElementById("tf-skizze-ki");
      out.knopfDa = !!knopf;
      out.knopfHoch = knopf ? Math.round(knopf.getBoundingClientRect().height) : 0;
      out.knopfText = knopf ? knopf.textContent.trim() : "";

      // ohne Ablauf: Abfuhr, kein Aufruf
      document.getElementById("tf-name").value = "Rondo";
      document.getElementById("tf-ablauf").value = "";
      await tfSkizzeKi();
      await warte(150);
      out.nachLeer = !!window.TF_SKIZZE;

      // mit Ablauf: ein Aufruf, Daten aus der Maske
      document.getElementById("tf-ablauf").value = "Vier Kinder im Quadrat, zwei in der Mitte, Ball rundherum spielen.";
      document.getElementById("tf-spieler").value = "6";
      document.getElementById("tf-feld").value = "15×15m";
      await tfSkizzeKi();
      await warte(300);
      out.spec = window.TF_SKIZZE ? Object.keys(window.TF_SKIZZE).sort().join(",") : null;
      const vor = document.getElementById("tf-skizze-vorschau");
      out.vorschauSvg = !!(vor && vor.querySelector("svg"));
      return out;
    });

    if (!r.hatFunktion) probleme.push("c) tfSkizzeKi fehlt");
    if (!r.knopfDa) probleme.push("c) Kein Knopf „Skizze aus der Beschreibung“ in der Übungsmaske");
    else if (r.knopfHoch < 44) probleme.push(`c) Der Knopf ist ${r.knopfHoch} px hoch, mindestens 44 verlangt`);
    if (anfragen.length !== 1) probleme.push(`c) ${anfragen.length} Aufruf(e) der Edge Function statt genau einem – ohne Ablauf darf keiner laufen`);
    if (r.nachLeer) probleme.push("c) Ohne Ablauf entstand trotzdem eine Skizze");
    if (!r.spec) probleme.push("c) Nach dem Lauf steht keine Skizze in TF_SKIZZE");
    if (!r.vorschauSvg) probleme.push("c) Die Vorschau in der Maske zeigt keine Zeichnung");
    const text = String((anfragen[0] || {}).text || "");
    ["Rondo", "Vier Kinder im Quadrat", "6 Kinder", "15×15m"].forEach(t => {
      if (!text.includes(t)) probleme.push(`c) „${t}“ fehlt in der Anfrage: „${text.slice(0, 120)}“`);
    });

    if (!probleme.length)
      zeilen.push(`c) Knopf „${r.knopfText}“ ${r.knopfHoch} px · ohne Ablauf 0 Aufrufe · mit Ablauf 1 · gesendet „${text.slice(0, 80)}“ · Vorschau zeichnet`);
    const f = s.fehler();
    if (f.length) probleme.push("Konsole (c): " + f.join(" | "));
    await s.schliessen();
  }

  // ── d) Der Blockkopf im Trainingsplan ───────────────────────────────────────
  {
    const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
    const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
    const datum = h.tagePlus(2);
    const gruppen = [
      { name: "Blaue Haie", emo: "🔵", kinder: h.KINDER.slice(0, 6), trainer: "Charles" },
      { name: "Rote Füchse", emo: "🔴", kinder: h.KINDER.slice(6, 12), trainer: "Finn" }
    ];
    const custom = (bib.uebungen || []).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
    const rows = (vor.vorlagen || []).map((v, i) => ({ ...v, id: 500 + i }));
    const plaene = {};
    const s = await h.starten({
      hoehe: 2600,
      supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen({ inaktiv: h.KINDER.slice(12) }), nominierungen: [], anwesenheit: [],
        termine: (u) => {
          const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
          const alle = [{ id: 91, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }];
          return alle.filter(t => !d || t.datum === d);
        },
        trainingsformen: custom,
        trainingsvorlagen: rows,
        trainingsgruppen: (u, req) => {
          if (req.method() === "POST") return { status: 201, body: "[]" };
          return [{ datum, gruppen, aus_anwesenheit: false }];
        },
        trainingsplan: (u, req) => {
          if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
          const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
          const p = plaene[d]; if (!p) return [];
          if (/select=slots/.test(u.search) && !/plan/.test(u.search)) return [{ datum: d, slots: p.slots || [] }];
          if (/select=plan/.test(u.search) && !/slots/.test(u.search)) return [{ datum: d, plan: p.plan || [] }];
          return [p];
        }
      })
    });
    await h.sichtbarMachen(s.page, "#train-sub-planung");
    await h.sichtbarMachen(s.page, "#tp-timeline");

    const r = await s.page.evaluate(async ({ datum, L48 }) => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      const out = {};
      out.hatFunktion = typeof tpSlotKopfText === "function";
      if (!out.hatFunktion) return out;

      // Die Rechnung selbst – vier Formen, wie sie in den Einheiten vorkommen
      out.trocken = [
        tpSlotKopfText("Hauptteil 1 – Stationen, 3 Min frei, dann eng: Adler aus dem Tor (Punkt nur, wenn …) | 2 gegen 1 plus Torwart"),
        tpSlotKopfText("Hauptteil 2 – Regeln wie in Hauptteil 1 | dito"),
        tpSlotKopfText("Warm-up"),
        tpSlotKopfText("Hauptteil 1 – Stationen: eine einzige, ohne Strich")
      ];

      await loadKader();
      const feld = document.getElementById("tp-date");
      if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
      if (feld) feld.value = datum;
      await tpTrainerRsvpLaden(datum);
      await vorlagenLaden();
      await tgSync(); await warte(150);
      _vuAuswahl = String((VORLAGEN.find(v => String(v.name).startsWith(L48 + " ")) || {}).id);
      await vorlageUebernehmenSetzen(); await warte(500);

      /* Der Block mit Stationen: sein Label trägt die Feldtexte hinter „|“. */
      const si = tpSlots.findIndex(sl => String(sl.label || "").includes("|"));
      out.gefunden = si >= 0;
      if (si < 0) return out;
      out.label = String(tpSlots[si].label);
      const kopf = document.querySelectorAll(".tp-slot-label")[[...tpSlots.keys()].filter(i => i <= si).length - 1];
      const alle = [...document.querySelectorAll(".tp-slot-label")];
      const treffer = alle.find(e => e.textContent.includes("Hauptteil") && !e.textContent.includes("|"));
      out.imDom = treffer ? treffer.textContent.trim() : (kopf ? kopf.textContent.trim() : null);
      out.mitStrich = alle.filter(e => e.textContent.includes("|")).length;
      out.title = treffer ? (treffer.getAttribute("title") || "") : "";
      /* Der Feldtext muss weiterhin unten an seiner Station stehen – gekürzt wird nur die
         Anzeige oben, nicht das Label. */
      out.feldTexte = (tpFeldTexte(si) || []).length;
      const unten = [...document.querySelectorAll('[id^="tp-form-' + si + '-"][id$="-grp"]')].map(e => e.textContent.trim()).filter(Boolean);
      out.unten = unten.length;
      return out;
    }, { datum, L48 });

    if (!r.hatFunktion) probleme.push("d) tpSlotKopfText fehlt");
    else {
      const erwartet = ["Hauptteil 1 – Stationen, 3 Min frei, dann eng", "Hauptteil 2 – Regeln wie in Hauptteil 1",
                        "Warm-up", "Hauptteil 1 – Stationen: eine einzige, ohne Strich"];
      r.trocken.forEach((t, i) => { if (t !== erwartet[i]) probleme.push(`d) Kurzfassung ${i + 1}: „${t}“ statt „${erwartet[i]}“`); });
      if (!r.gefunden) probleme.push("d) Kein Block mit Feldtexten im übernommenen Plan");
      else {
        if (r.mitStrich) probleme.push(`d) ${r.mitStrich} Blockkopf/-köpfe zeigen weiterhin die Feldtexte hinter „|“`);
        if (!r.title || !r.title.includes("|")) probleme.push("d) Der volle Text steht nicht im title");
        if (!String(r.label).includes("|")) probleme.push("d) Das Label selbst wurde verändert – tpFeldTexte verlöre seine Quelle");
        if (r.feldTexte < 2) probleme.push(`d) tpFeldTexte liest nur noch ${r.feldTexte} Teile aus dem Label`);
        if (!r.unten) probleme.push("d) Unter den Stationen steht kein Feldtext mehr");
      }
    }
    if (!probleme.length)
      zeilen.push(`d) Kopf „${r.imDom}“ (${String(r.label).length} Zeichen im Label, ${r.title.length} im title) · ${r.feldTexte} Feldtexte weiterhin lesbar · ${r.unten} Zeilen unter den Stationen`);
    const f = s.fehler();
    if (f.length) probleme.push("Konsole (d): " + f.join(" | "));
    await s.schliessen();
  }

  return h.ergebnis("Ball, Spieler mit Ball, KI aus der Maske, Blockkopf", !probleme.length, probleme.length ? probleme : zeilen);
};
