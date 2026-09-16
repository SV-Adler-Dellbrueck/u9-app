/* v551 – Die dreizehn fehlenden Einheiten.

   Das Ausbildungskonzept Fassung 3 plant unter §1 zwanzig Einheiten, verteilt auf sechs
   Leitfragen: 4 · 4 · 3 · 4 · 3 · 2. In `uebungen/vorlagen.json` standen sieben. Der Rest
   war nie geschrieben – „Vorlage übernehmen“ zeigte damit gut ein Drittel des Plans.

   Warum das eine Prüfung wert ist: eine Vorlage nennt Übungen beim Namen. Ein Tippfehler
   oder eine Übung in der falschen Kategorie fällt nicht beim Schreiben auf, sondern erst
   am Platz, wenn das Übernehmen mit „die Übung gibt es nicht“ abbricht. Und die
   Netto-Zahl aus §2 ist von Hand gerechnet: liegt sie neben der Summe der Spielform-
   Blöcke, meldet die App beim Import einen Hinweis, den niemand mehr liest.

   Fälle:
   a) Zwanzig Einheiten, je Leitfrage so viele wie das Konzept vorsieht, folge_nr
      lückenlos ab 1.
   b) Die sechs Leitfragen stehen wörtlich im Konzept – nicht sinngemäß.
   c) Die echte Datei läuft ohne Fehler durch `_evPruefung`: jede genannte Übung gibt es,
      und ihre Kategorie passt zur Phase (kein Aufwärm-, Torwart- oder Einzeltraining im
      Hauptteil).
   d) Keine der zwanzig löst einen Netto-Hinweis aus.
   e) Jede trägt die Skalierungszeile für 8 / 12 / 16 (§9) und eine Beobachtungsfrage mit
      Rollenbezug (§10).
   f) Der Abgleich legt die dreizehn neuen an und rührt die sieben bestehenden nicht an. */
const SOLL = {
  "Wie behalte ich den Ball, wenn einer kommt?": 4,
  "Wie komme ich an einem vorbei?": 4,
  "Wie mache ich ein Tor?": 3,
  "Wie kriege ich den Ball zu einem, der frei ist?": 4,
  "Wo stelle ich mich hin, damit ich den Ball kriege?": 3,
  "Wie hole ich mir den Ball zurück?": 2
};
/* Die sieben, die vor v551 schon in der Datenbank standen. Der Abgleich darf sie nicht
   anfassen – er legt nur an, was er dort nicht findet. */
const BESTAND = ["L1-1", "L2-1", "L3-1", "L4-1", "L4-2", "L5-1", "L6-1"];
/* v554: Die Einheit der Lehrgangsabgabe 2.2 (18.09.2026) steht als L4-5 in der Datei.
   Das Konzept plant für Leitfrage 4 vier Einheiten, und die Folgen 1 bis 4 waren schon
   vergeben – das Paket nannte „Folge 2 (von 4)“, die Stelle war aber besetzt. Statt eine
   bestehende Einheit umzunummerieren, hängt sie als Folge 5 an. Die Prüfung der zwanzig
   bleibt, wie sie ist; die Zusatz-Einheit wird hier benannt statt still mitgezählt.
   v568: Dazu die acht Einheiten für 3+1, FUNiño und die Kombination (L4-6, L5-4, L6-3,
   L4-7, L5-5, L6-4, L5-6, L6-5). Die Prüfung der zwanzig bleibt; die Fälle c) und e) gelten
   auch für die Zusatz-Einheiten. */
const ZUSATZ = ["L4-5", "L4-6", "L5-4", "L6-3", "L4-7", "L5-5", "L6-4", "L5-6", "L6-5"];

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8"));
  const alle = (vor.vorlagen || []).filter(v => !ZUSATZ.some(p => String(v.name).startsWith(p)));
  const zusatz = (vor.vorlagen || []).filter(v => ZUSATZ.some(p => String(v.name).startsWith(p)));
  if (zusatz.length !== ZUSATZ.length) probleme.push("Zusatz-Einheit fehlt oder ist mehrfach da: " + ZUSATZ.join(", "));

  // a) Verteilung und Reihenfolge
  const je = {};
  alle.forEach(v => (je[v.leitfrage] = je[v.leitfrage] || []).push(v));
  const summe = Object.values(SOLL).reduce((a, b) => a + b, 0);
  if (alle.length !== summe) probleme.push(`${alle.length} Einheiten in der Datei, das Konzept plant ${summe}`);
  Object.keys(SOLL).forEach(f => {
    const g = je[f] || [];
    if (g.length !== SOLL[f]) { probleme.push(`„${f}“: ${g.length} Einheiten statt ${SOLL[f]}`); return; }
    const nrn = g.map(v => Number(v.folge_nr)).sort((a, b) => a - b);
    const soll = g.map((_, i) => i + 1);
    if (String(nrn) !== String(soll)) probleme.push(`„${f}“: folge_nr ${nrn.join(",")} statt ${soll.join(",")}`);
  });
  const fremd = Object.keys(je).filter(f => !SOLL[f]);
  if (fremd.length) probleme.push("Leitfrage, die das Konzept nicht kennt: " + fremd.join(" · "));

  // b) Wortlaut gegen das Konzept
  const konz = fs.readFileSync(path.join(h.REPO, "doku/ausbildungskonzept-u9-v3.md"), "utf8");
  const nichtImKonzept = Object.keys(SOLL).filter(f => !konz.includes(f));
  if (nichtImKonzept.length) probleme.push("Nicht wörtlich im Konzept: " + nichtImKonzept.join(" · "));

  // e) Skalierung und Beobachtung – aus der Datei, ohne Browser; seit v568 auch für die Zusatz-Einheiten
  const ohneSkal = alle.concat(zusatz).filter(v => !["8", "12", "16"].every(k => String((v.skalierung || {})[k] || "").trim())).map(v => v.name);
  if (ohneSkal.length) probleme.push("Ohne vollständige Skalierung 8/12/16: " + ohneSkal.join(", "));
  const ohneRolle = alle.concat(zusatz).filter(v => !/Aufpasser|Flitzer|Jäger/.test(String(v.beobachtung || ""))).map(v => v.name);
  if (ohneRolle.length) probleme.push("Beobachtungsfrage ohne Rollenbezug: " + ohneRolle.join(", "));

  /* f) Der Abgleich. Die Attrappe kennt die sieben aus dem Bestand; alles, was danach
     per POST hereinkommt, ist neu angelegt. */
  /* Der Abgleich erkennt eine Vorlage am NAMEN. Die Attrappe muss die sieben deshalb mit
     genau dem Namen führen, den die Datei nennt – sonst hält er alle zwanzig für neu. */
  const bestandNamen = BESTAND.map(pfx => (alle.find(v => String(v.name).startsWith(pfx)) || {}).name).filter(Boolean);
  if (bestandNamen.length !== BESTAND.length) probleme.push("Eine Vorlage des Bestands steht nicht mehr in der Datei: " + BESTAND.join(", "));
  const angelegt = [], vorhanden = bestandNamen.map((n, i) => ({ id: 900 + i, name: n, leitfrage: "x", bloecke: [] }));
  const custom = [];
  const s = await h.starten({
    bibliothek: true, hoehe: 1400,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), termine: [],
      trainingsformen: (u, req) => {
        if (req.method() === "POST") { custom.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
        return custom;
      },
      trainingsvorlagen: (u, req) => {
        if (req.method() === "POST") { angelegt.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
        return vorhanden.concat(angelegt.map((z, i) => ({ ...z, id: 1000 + i })));
      }
    })
  });

  const r = await s.page.evaluate(async ({ datei }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80; i++) { if (!_bibLaeuft && VORLAGEN.length) break; await warte(100); }
    while (_bibLaeuft) await warte(50);
    // c) + d) Die echte Datei durch Prüfung und Netto-Rechnung
    const pr = _evPruefung(JSON.stringify(datei));
    const hinweise = (datei.vorlagen || []).map(v => ({ name: v.name, text: _evNettoHinweis(v) })).filter(x => x.text);
    return { fehler: pr.fehler, hinweise, geladen: VORLAGEN.length };
  }, { datei: vor });

  if (r.fehler.length) probleme.push("Die Datei kommt nicht durch die Prüfung: " + r.fehler.slice(0, 3).join(" | "));
  else zeilen.push(`Prüfung: alle ${alle.length + zusatz.length} Einheiten sauber – jede Übung existiert, jede Kategorie passt zur Phase`);

  if (r.hinweise.length) probleme.push("Netto-Hinweis: " + r.hinweise.map(x => `${x.name} – ${x.text}`).join(" | "));

  const neueNamen = angelegt.map(z => z.name);
  const erwartet = alle.concat(zusatz).filter(v => !BESTAND.some(p => String(v.name).startsWith(p))).map(v => v.name);
  if (neueNamen.length !== erwartet.length)
    probleme.push(`Der Abgleich hat ${neueNamen.length} Einheiten angelegt, erwartet ${erwartet.length}`);
  else {
    const fehlt = erwartet.filter(n => !neueNamen.includes(n));
    if (fehlt.length) probleme.push("Nicht angelegt: " + fehlt.join(", "));
    const zuviel = neueNamen.filter(n => BESTAND.some(p => n.startsWith(p)));
    if (zuviel.length) probleme.push("Eine bestehende Vorlage wurde noch einmal angelegt: " + zuviel.join(", "));
  }
  /* Was mitgeht, muss auch ankommen: ohne ordnung und skalierung wäre die Einheit in der
     Datenbank ärmer als in der Datei, ohne dass es auffiele. */
  const ohneFeld = angelegt.filter(z => !z.ordnung || !z.leitfrage || !z.beobachtung).map(z => z.name);
  if (ohneFeld.length) probleme.push("Beim Anlegen unvollständig (ordnung/leitfrage/beobachtung): " + ohneFeld.join(", "));

  if (!probleme.length) {
    zeilen.push(`Verteilung: ${Object.keys(SOLL).map(f => je[f].length).join(" · ")} = ${alle.length} Einheiten über sechs Leitfragen, dazu ${zusatz.length} Zusatz (${ZUSATZ.join(", ")})`);
    zeilen.push(`Abgleich: ${neueNamen.length} neu angelegt, die ${BESTAND.length} bestehenden unberührt`);
    const ordn = {}; alle.forEach(v => ordn[v.ordnung] = (ordn[v.ordnung] || 0) + 1);
    zeilen.push("Ordnungen: " + Object.keys(ordn).map(k => `${k} ${ordn[k]}×`).join(" · "));
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  return h.ergebnis("Trainingsvorlagen: die zwanzig Einheiten des Konzepts vollständig", !probleme.length, zeilen.concat(probleme));
};
