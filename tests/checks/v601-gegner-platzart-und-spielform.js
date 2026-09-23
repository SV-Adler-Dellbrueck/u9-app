/* v601 · Platzart beim Gegner, und die Spielform mit zwei Torarten

   a) „Platzart in die Datenbank mit aufnehmen." (PO 23.09.2026)
      Das Formular zeigt sie mit Vorschlagsliste — und, das ist der Punkt, es SCHREIBT
      sie zurück. Beim Muster „on_conflict + merge-duplicates" gewinnt das gesendete
      Objekt: eine Spalte, die das Formular nicht mitsendet, wäre nach dem Speichern für
      diese Zeile leer. Genau davor warnt CLAUDE.md. Gemessen wird deshalb der echte
      Rumpf der Anfrage, nicht das Aussehen des Formulars.

   b) Die Platzart trägt bis an den Termin. `gegnerContactInto` schrieb bisher nur,
      wenn ein Ansprechpartner oder eine Telefonnummer da war; ein Gegner mit Platzart
      und ohne Kontakt blieb stumm. Jetzt reicht eines von dreien.

   c) `gegner` steht in der Backup-Funktion. Sie fehlte dort seit der Anlage der
      Tabelle — eine Sicherung hätte die ganze Kontaktliste nicht enthalten. Das ist
      Pflicht 3 aus CLAUDE.md und hier zum ersten Mal geprüft.

   d) Die Spielform „Zwei Torarten – Schuss oder Dribbling" aus der Vorlage des PO liegt
      in der Bibliothek, kommt durch die Eingangsprüfung und zeichnet zwei Bilder. Der
      erste Anlauf fiel durch: Im zweiten Bild stand ein Kind weniger, weil die
      Provokation es vom Feld nimmt — die App verlangt aber in jedem Bild dieselben
      Kinder, sonst hat die Abspiel-Animation nichts zu bewegen. Das Kind steht jetzt
      neben dem Feld. Gemessen wird beides: dass die Prüfung sauber durchläuft UND dass
      in beiden Bildern sechs Kinder stehen. */
"use strict";

const UEBUNG = "Zwei Torarten – Schuss oder Dribbling";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  // ── a) + b) Das Gegner-Fenster ──────────────────────────────────────────────
  {
    const gesendet = [];
    const gegner = [
      { id: 1, name: "SV Beispielstadt", adresse: "Musterweg 1, 50000 Köln", ansprechpartner: "A. Person",
        telefon: "+49 170 0000000", email: null, platzart: "Kunstrasen", website: "https://example.org", notiz: "Notiz",
        wappen_url: "https://example.org/storage/v1/object/public/wappen/beispiel.png" },
      { id: 2, name: "Nur Platzart", adresse: null, ansprechpartner: null, telefon: null,
        email: null, platzart: "Asche", website: null, notiz: null, wappen_url: null }
    ];
    const s = await h.starten({
      supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen(),
        gegner: (u, req) => {
          if (req.method() !== "GET") { try { gesendet.push(JSON.parse(req.postData() || "{}")); } catch (e) { gesendet.push(null); } return { status: 201, body: "[]" }; }
          return gegner;
        }
      })
    });

    const r = await s.page.evaluate(async () => {
      const out = {};
      out.hatListe = typeof GEGNER_PLATZARTEN !== "undefined" && Array.isArray(GEGNER_PLATZARTEN);
      out.liste = out.hatListe ? GEGNER_PLATZARTEN.slice() : [];
      await gegnerLoad(true);

      // Formular für den ersten Gegner öffnen
      const box = document.createElement("div"); box.id = "gegner-form";
      document.body.appendChild(box);
      gegnerEdit(1);
      const feld = document.getElementById("gg-platzart");
      out.feldDa = !!feld;
      out.feldWert = feld ? feld.value : null;
      out.feldListe = feld ? feld.getAttribute("list") : null;
      const dl = document.getElementById("gg-platzarten");
      out.vorschlaege = dl ? [...dl.querySelectorAll("option")].map(o => o.value) : [];
      out.websiteWert = (document.getElementById("gg-website") || {}).value;

      /* e) Das Wappen: in der Liste, am Termin, und still verschwindend, wenn es fehlt. */
      const liste = document.createElement("div"); liste.id = "gegner-list";
      document.body.appendChild(liste);
      gegnerRenderList();
      const bilder = [...liste.querySelectorAll("img")];
      out.wappenInListe = bilder.length;
      out.wappenAlt = bilder.map(b => b.getAttribute("alt"));
      out.wappenAria = bilder.map(b => b.getAttribute("aria-hidden"));
      out.wappenOnerror = bilder.map(b => b.getAttribute("onerror"));
      out.wappenQuelle = bilder.map(b => b.getAttribute("src"));

      // Speichern, ohne ein einziges Feld anzufassen: der Rumpf muss alles tragen
      await gegnerSave();

      // b) Die Zeile am Termin – einmal mit Kontakt, einmal nur mit Platzart
      const ziel1 = document.createElement("div"); ziel1.id = "zeile-1"; document.body.appendChild(ziel1);
      const ziel2 = document.createElement("div"); ziel2.id = "zeile-2"; document.body.appendChild(ziel2);
      await gegnerContactInto("zeile-1", "SV Beispielstadt U9 II");
      await gegnerContactInto("zeile-2", "Nur Platzart U9");
      out.zeile1 = ziel1.textContent.trim();
      out.zeile2 = ziel2.textContent.trim();
      return out;
    });

    if (!r.hatListe) probleme.push("a) GEGNER_PLATZARTEN fehlt");
    else if (!r.liste.includes("Kunstrasen") || !r.liste.includes("Naturrasen"))
      probleme.push("a) Vorschlagsliste ohne Kunstrasen oder Naturrasen: " + r.liste.join(", "));
    if (!r.feldDa) probleme.push("a) Kein Feld „Platzart“ im Gegner-Formular");
    else {
      if (r.feldWert !== "Kunstrasen") probleme.push(`a) Feld zeigt „${r.feldWert}“ statt „Kunstrasen“`);
      if (r.feldListe !== "gg-platzarten") probleme.push("a) Das Feld hängt an keiner Vorschlagsliste");
      if (r.vorschlaege.length !== r.liste.length) probleme.push(`a) ${r.vorschlaege.length} Vorschläge im DOM, ${r.liste.length} in der Liste`);
    }
    if (r.websiteWert !== "https://example.org") probleme.push(`a) Feld „Vereinsseite“ zeigt ${JSON.stringify(r.websiteWert)}`);

    const rumpf = gesendet[gesendet.length - 1];
    if (!rumpf) probleme.push("a) Das Speichern hat nichts gesendet");
    else {
      const fehlt = ["name","adresse","ansprechpartner","telefon","email","platzart","website","notiz"]
        .filter(k => !(k in rumpf));
      if (fehlt.length) probleme.push("a) Der gesendete Rumpf lässt Spalten aus – sie wären nach dem Speichern leer: " + fehlt.join(", "));
      if (rumpf.platzart !== "Kunstrasen") probleme.push(`a) Gesendete Platzart: ${JSON.stringify(rumpf.platzart)}`);
      if (rumpf.website !== "https://example.org") probleme.push(`a) Gesendete Vereinsseite: ${JSON.stringify(rumpf.website)}`);
    }

    /* e) Genau EIN Wappen: der zweite Gegner der Attrappe hat keines, und dann darf auch
       kein leeres Bild in der Liste stehen. */
    if (r.wappenInListe !== 1) probleme.push(`e) ${r.wappenInListe} Wappen in der Liste, erwartet genau eines (der zweite Gegner hat keins)`);
    else {
      if (r.wappenAlt[0] !== "") probleme.push(`e) alt ist ${JSON.stringify(r.wappenAlt[0])} statt leer – der Vereinsname steht daneben und wuerde zweimal vorgelesen`);
      if (r.wappenAria[0] !== "true") probleme.push("e) Das Wappen ist nicht aria-hidden");
      if (!/remove/.test(r.wappenOnerror[0] || "")) probleme.push("e) Ohne onerror bleibt bei einem toten Link ein kaputtes Bildsymbol stehen");
      if (!/^https:\/\//.test(r.wappenQuelle[0] || "")) probleme.push(`e) Wappen-Quelle sieht falsch aus: ${r.wappenQuelle[0]}`);
    }

    if (!/Kunstrasen/.test(r.zeile1)) probleme.push(`b) Zeile am Termin ohne Platzart: „${r.zeile1}“`);
    if (!/A\. Person/.test(r.zeile1)) probleme.push(`b) Zeile am Termin ohne Ansprechpartner: „${r.zeile1}“`);
    if (!/Asche/.test(r.zeile2)) probleme.push(`b) Gegner nur mit Platzart bleibt stumm: „${r.zeile2}“`);

    if (!probleme.length) {
      zeilen.push(`a) Formular zeigt „${r.feldWert}“ mit ${r.vorschlaege.length} Vorschlägen · der Rumpf trägt alle ${Object.keys(rumpf).length} Spalten zurück`);
      zeilen.push(`b) Am Termin: „${r.zeile1}“ · ohne Kontakt: „${r.zeile2}“`);
      zeilen.push(`e) ${r.wappenInListe} Wappen in der Liste (der Gegner ohne Wappen zeigt keines), alt leer, aria-hidden, onerror raeumt auf`);
    }
    const f = s.fehler();
    if (f.length) probleme.push("Konsole (a/b): " + f.join(" | "));
    await s.schliessen();
  }

  // ── c) Die Sicherung kennt die Tabelle ──────────────────────────────────────
  {
    const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
    const m = views.match(/const tables=\[([\s\S]*?)\];/);
    if (!m) probleme.push("c) Die Tabellenliste der Sicherung nicht gefunden");
    else {
      const namen = [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
      if (!namen.includes("gegner")) probleme.push("c) „gegner“ fehlt in der Backup-Funktion – die Kontaktliste wäre nach einer Wiederherstellung leer");
      else zeilen.push(`c) Sicherung umfasst ${namen.length} Tabellen, „gegner“ darunter`);
    }
  }

  // ── d) Die neue Spielform ───────────────────────────────────────────────────
  {
    const roh = fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8");
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(({ roh, UEBUNG }) => {
      const { fehler, daten } = _euPruefung(roh);
      const u = (daten && daten.uebungen || []).find(x => x.name === UEBUNG);
      const out = { fehler, da: !!u };
      if (!u) return out;
      const spec = u.skizze;
      out.bilder = skzBildZahl(spec);
      out.proBild = [];
      for (let i = 0; i < out.bilder; i++) {
        const b = _skzBild(spec, i);
        out.proBild.push({ spieler: (b.s || []).length, pfeile: (b.p || []).length });
      }
      out.tore = (spec.tor || []).length;
      out.dtore = (spec.dtor || []).length;
      out.material = skzMaterial(spec).map(m => m.anzahl + "× " + m.schluessel);
      out.art = (typeof UEBUNG_ART_VORSCHLAG !== "undefined") ? UEBUNG_ART_VORSCHLAG[UEBUNG] : null;
      return out;
    }, { roh, UEBUNG });

    if (r.fehler && r.fehler.length) probleme.push("d) Die Eingangsprüfung weist die Datei ab: " + r.fehler.join(" | "));
    if (!r.da) probleme.push(`d) „${UEBUNG}“ steht nicht in der Bibliothek`);
    else {
      if (r.bilder !== 2) probleme.push(`d) ${r.bilder} Bilder statt 2`);
      const duenn = (r.proBild || []).map((b, i) => b.spieler !== 6 ? `Bild ${i+1}: ${b.spieler}` : null).filter(Boolean);
      if (duenn.length) probleme.push("d) Nicht in jedem Bild stehen sechs Kinder (" + duenn.join(", ") + ") – dann hat die Animation nichts zu bewegen");
      if (r.tore !== 2 || r.dtore !== 2) probleme.push(`d) ${r.tore} Schusstore und ${r.dtore} Dribbeltore statt je zwei`);
      if (r.art !== "spiel") probleme.push(`d) Die Übung ist als „${r.art}“ vorgeschlagen statt als „spiel“`);
      if (!probleme.length) zeilen.push(`d) „${UEBUNG}“: ${r.bilder} Bilder à 6 Kinder, ${r.tore} Schusstore und ${r.dtore} Dribbeltore, Material ${r.material.join(", ")}, vorgeschlagen als Spielform`);
    }
    const f = s.fehler();
    if (f.length) probleme.push("Konsole (d): " + f.join(" | "));
    await s.schliessen();
  }

  return h.ergebnis("Platzart beim Gegner und die Spielform mit zwei Torarten", !probleme.length, probleme.length ? probleme : zeilen);
};
