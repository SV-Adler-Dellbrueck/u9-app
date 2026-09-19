/* v550 – Zweite Achse an der Vorlage: wie die Mannschaft im Spiel steht.

   Die Leitfrage sagt, WORUM es geht, nicht WIE gespielt wird. „Wie kriege ich den Ball
   zu einem, der frei ist?" läuft als Überzahl 4 gegen 2 oder als Dreieck 3 gegen 3 —
   zwei sehr verschiedene Einheiten unter derselben Frage.

   Der Name ist dabei nicht beliebig. „Schwerpunkt" wäre die Leitfrage in zweiter
   Sprache („Wie mache ich ein Tor?" IST Abschluss), und das Ausbildungskonzept
   Fassung 3 hat sich unter „Leitfragen statt Schwerpunkte" dagegen entschieden.
   „Spielform" ist zweifach vergeben: die Formen des Spieltags (4+1, 3+1, FUNiño) und
   die Einordnung Spielform gegen Übungsform (v533). Deshalb „Ordnung".

   Fälle:
   a) Die Werteliste ist geschlossen: eine erfundene Ordnung wird beim Prüfen abgewiesen,
      eine leere ist erlaubt (nicht jede Einheit hat eine).
   b) Der Import schreibt das Feld mit – ohne das käme es nie in der Datenbank an.
   c) Im Fenster „Vorlage übernehmen" steht eine eigene Kachelreihe, und sie zeigt NUR
      Ordnungen, die wirklich vorkommen – eine leere Kachel verspricht eine Auswahl,
      hinter der nichts steht.
   d) Die drei Reihen filtern gemeinsam (und), und ein zweiter Tipp hebt den Filter auf.
   e) Jede Vorlage in `uebungen/vorlagen.json` ist eingeordnet, und die Migration zieht
      die Zeilen nach, die vor v550 schon in der Datenbank standen – der Abgleich rührt
      bestehende Zeilen nie an. Was die Migration setzt, muss zur Datei passen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const datum = h.tagePlus(3);

  const s = await h.starten({
    hoehe: 2400, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      termine: [{ id: 9, datum, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } }],
      trainingsvorlagen: []
    })
  });

  const r = await s.page.evaluate(async ({ datum }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader();
    const out = {};

    // a) Werteliste
    const bau = (ordnung) => JSON.stringify({
      schema: "adler-vorlagen/1", vorlagen: [{
        name: "Ordnungs-Probe", leitfrage: "Wie behalten wir den Ball?",
        ...(ordnung === undefined ? {} : { ordnung }),
        bloecke: [{ typ: "spielform", label: "Stufe 1", dauer: 11 }]
      }]
    });
    out.liste = EI_ORDNUNGEN.slice();
    out.gut = _evPruefung(bau("Raute (4 gegen 4)")).fehler;
    out.erfunden = _evPruefung(bau("Tannenbaum")).fehler;
    out.ohne = _evPruefung(bau(undefined)).fehler;
    out.leer = _evPruefung(bau("")).fehler;

    // b) Was beim Anlegen rausgeht
    VORLAGEN.length = 0;
    await _evVorlageAnlegen({ name: "Schreib-Probe", leitfrage: "X", ordnung: "Dreieck (3 gegen 3)", bloecke: [] }, "");
    await _evVorlageAnlegen({ name: "Schreib-Probe 2", leitfrage: "X", ordnung: "Tannenbaum", bloecke: [] }, "");

    // c) + d) Die Kachelreihe
    VORLAGEN.push(
      { id: 1, name: "A", leitfrage: "Frage 1", tags: ["halle"], ordnung: "1 gegen 1", bloecke: [{ typ: "main", label: "S", dauer: 11 }] },
      { id: 2, name: "B", leitfrage: "Frage 1", tags: [], ordnung: "Raute (4 gegen 4)", bloecke: [{ typ: "main", label: "S", dauer: 11 }] },
      { id: 3, name: "C", leitfrage: "Frage 2", tags: ["halle"], ordnung: "", bloecke: [{ typ: "main", label: "S", dauer: 11 }] }
    );
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === datum)) feld.add(new Option(datum, datum));
    if (feld) feld.value = datum;
    _vuAuswahl = null; _vuFilter = { leitfrage: "", tag: "", ordnung: "", suche: "" };
    /* v576: Die Filterreihen sind eingeklappt – das Fenster begann sonst mit einem Block,
       der höher war als die Liste dahinter. Zum Prüfen aufklappen. */
    _vuFilterOffen = true;
    _vuPlanDa = false;
    document.getElementById("vu-modal")?.remove();
    const m = document.createElement("div");
    m.id = "vu-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = '<div><div id="vu-inhalt"></div></div>';
    document.body.appendChild(m);
    vorlageUebernehmenRender();
    await warte(80);

    const chips = () => [...document.querySelectorAll("#vu-inhalt button")].map(b => ({ txt: b.textContent.trim(), an: b.getAttribute("aria-pressed") === "true", fn: b.getAttribute("onclick") || "" }));
    const ordChips = () => chips().filter(c => /vuFilterSet\('ordnung'/.test(c.fn));
    out.ordChips = ordChips().map(c => c.txt);
    out.treffer0 = (document.getElementById("vu-inhalt").textContent.match(/(\d+)(?: von (\d+))? Vorlagen/) || [])[1];

    // d) Filtern: Ordnung „1 gegen 1“
    vuFilterSet("ordnung", "1 gegen 1");
    await warte(60);
    out.treffer1 = (document.getElementById("vu-inhalt").textContent.match(/(\d+)(?: von (\d+))? Vorlagen/) || [])[1];
    out.gemerkt = _vuFilter.ordnung;
    // und zusätzlich eine Leitfrage, die nicht dazu passt → 0
    vuFilterSet("leitfrage", "Frage 2");
    await warte(60);
    out.treffer2 = (document.getElementById("vu-inhalt").textContent.match(/(\d+)(?: von (\d+))? Vorlagen/) || [])[1];
    // zweiter Tipp hebt auf
    vuFilterSet("leitfrage", "Frage 2");
    vuFilterSet("ordnung", "1 gegen 1");
    await warte(60);
    out.treffer3 = (document.getElementById("vu-inhalt").textContent.match(/(\d+)(?: von (\d+))? Vorlagen/) || [])[1];
    document.getElementById("vu-modal")?.remove();
    return out;
  }, { datum });

  // a)
  if (r.gut.length) probleme.push("Eine erlaubte Ordnung wird abgewiesen: " + r.gut[0]);
  else if (!r.erfunden.length) probleme.push("Eine erfundene Ordnung kommt durch die Prüfung");
  else if (r.ohne.length || r.leer.length) probleme.push("Eine Vorlage ohne Ordnung wird abgewiesen – nicht jede Einheit hat eine");
  else zeilen.push(`Werteliste: ${r.liste.join(" · ")} · leer erlaubt, Erfundenes abgewiesen`);

  // b)
  const posts = s.gesendet.filter(g => /trainingsvorlagen/.test(g.pfad || "") && g.methode === "POST");
  const mit = posts.find(p => p.body && p.body.name === "Schreib-Probe");
  const falsch = posts.find(p => p.body && p.body.name === "Schreib-Probe 2");
  if (!mit) probleme.push("Beim Anlegen ging nichts an trainingsvorlagen");
  else if (mit.body.ordnung !== "Dreieck (3 gegen 3)") probleme.push(`Das Feld kommt als ${JSON.stringify(mit.body.ordnung)} am Server an`);
  else if (!falsch || falsch.body.ordnung !== null) probleme.push("Ein Wert außerhalb der Liste wird trotzdem geschrieben");
  else zeilen.push("Anlegen: die Ordnung geht mit, ein Wert außerhalb der Liste wird zu null");

  // c) + d)
  const erwartet = ["1 gegen 1", "Raute (4 gegen 4)"];
  if (String(r.ordChips) !== String(erwartet)) probleme.push(`Kachelreihe: ${JSON.stringify(r.ordChips)} statt ${JSON.stringify(erwartet)} – gezeigt wird nur, was vorkommt`);
  else if (r.treffer1 !== "1") probleme.push(`Der Filter „1 gegen 1“ lässt ${r.treffer1} von 3 stehen, erwartet 1`);
  else if (r.treffer2 !== "0") probleme.push(`Ordnung und Leitfrage filtern nicht gemeinsam: ${r.treffer2} Treffer`);
  else if (r.treffer3 !== "3") probleme.push(`Nach dem Aufheben stehen ${r.treffer3} von 3 Vorlagen`);
  else zeilen.push(`Kacheln: ${r.ordChips.join(" · ")} · Filter 3 → 1 → 0 → 3`);

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  // e) Datei und Migration
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const ohneOrdnung = (vor.vorlagen || []).filter(v => !v.ordnung).map(v => v.name);
  if (ohneOrdnung.length) probleme.push("In vorlagen.json ohne Ordnung: " + ohneOrdnung.join(", "));
  const mig = path.join(h.REPO, "supabase/migrations/20260914_vorlagen_ordnung.sql");
  if (!fs.existsSync(mig)) probleme.push("Die Migration für die Ordnung fehlt");
  else {
    const sql = fs.readFileSync(mig, "utf8");
    if (!/add column if not exists ordnung/.test(sql)) probleme.push("Die Migration legt die Spalte nicht an");
    /* Der Abgleich legt nur NEUE Zeilen an und rührt bestehende nie an. Die Migration muss
       deshalb genau die Vorlagen nachziehen, die beim Einspielen SCHON in der Datenbank
       standen – die sieben aus der Zeit vor v550. Später dazugekommene (v551: dreizehn)
       bringen ihre Ordnung über den Abgleich mit und brauchen keine update-Zeile.
       Geprüft wird deshalb nicht die Zahl, sondern die Übereinstimmung: was die Migration
       setzt, muss dasselbe sein wie in der Datei. */
    const updates = [...sql.matchAll(/update public\.trainingsvorlagen set ordnung = '([^']+)'\s+where name like '([^%']+)%'/g)]
      .map(m => ({ ordnung: m[1], praefix: m[2] }));
    if (updates.length < 7) probleme.push(`${updates.length} update-Zeilen – der Bestand vor v550 waren sieben Vorlagen`);
    updates.forEach(u => {
      const v = (vor.vorlagen || []).find(x => String(x.name).startsWith(u.praefix));
      if (!v) probleme.push(`Die Migration setzt „${u.praefix}“, eine solche Vorlage gibt es in der Datei nicht`);
      else if (v.ordnung !== u.ordnung) probleme.push(`„${v.name}“: Migration setzt „${u.ordnung}“, die Datei sagt „${v.ordnung}“`);
    });
  }
  if (!probleme.length) zeilen.push(`Datei: alle ${(vor.vorlagen || []).length} Vorlagen eingeordnet, Migration zieht den Bestand vor v550 nach`);

  return h.ergebnis("Vorlagen: zweite Achse „wie sie stehen“ neben der Leitfrage", !probleme.length, zeilen.concat(probleme));
};
