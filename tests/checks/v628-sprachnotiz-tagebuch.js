/* v628 · PO: „Wird der Text, den ich einspreche, eins zu eins übernommen oder wird er von der KI
   nochmal überarbeitet, strukturiert und auch analysiert, um nachher die Einträge ins Tagebuch
   auch gut aufgearbeitet wiederzufinden und auswerten zu können?“ Kachel: „Ja, und auch
   Aha/Konsequenz vorschlagen“.

   a) Der gesprochene Rohtext wird mit der Einheit gespeichert (einheit_bewertung.sprachnotiz).
   b) Der Tagebuch-Eintrag danach ist vorausgefüllt: Baustein, Beobachtung, Aha, Konsequenz,
      Schlagworte; ein Hinweis sagt, dass es ein KI-Vorschlag ist.
   c) Im Tagebuch steht kein „Kind n“ und kein echter Name, sondern der Deckname.
   d) Erfasst werden schlagworte (Liste) und ki_vorschlag=true.
   e) Ohne Vorschlag im Speicher, aber mit gespeicherter Notiz: Knopf „Vorschlag aus der
      Sprachnotiz“ ruft die KI (art „tagebuch“) und füllt aus.
      v679: umgekehrt – diesen zweiten Weg gibt es nicht mehr (kein Knopf, kein Aufruf).
   f) Liste: Themen-Kacheln mit Anzahl; ein Tipp filtert.
   g) Decknamen hängen an der Kennung (_id), nicht an der Kader-Reihenfolge. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const plan = [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }];
  const gesendet = [], einheitPosts = [], tbPosts = [];
  const tb = { baustein: "ich", beobachtung: "Kind 2 zog sich zurück, als das Spiel hektisch wurde.",
    aha: "Ich habe zu viel von außen gerufen.", konsequenz: "Nächstes Mal nur eine Anweisung je Pause.",
    schlagworte: ["Coaching", "Ansprache", "Ruhe"] };
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], trainings_eval: [],
    trainingsplan: [{ datum: gestern, plan, kopf: { schwerpunkt: "Passspiel" } }],
    einheit_bewertung: (u, req) => { if (req.method() !== "GET") { einheitPosts.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[]" }; }
      return einheitPosts.length ? [einheitPosts[einheitPosts.length - 1]] : []; },
    tagebuch_eintrag: (u, req) => { if (req.method() !== "GET") { tbPosts.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "[{}]" }; }
      return [{ id: 1, datum: gestern, autor: "Charles", baustein: "ich", ausloeser: "Training", aha: "a", konsequenz: "k", schlagworte: ["Coaching", "Ruhe"], ki_vorschlag: true },
              { id: 2, datum: gestern, autor: "Charles", baustein: "organisation", ausloeser: "Festival", aha: "a", konsequenz: "k", schlagworte: ["Zeitplan"] },
              { id: 3, datum: gestern, autor: "Charles", baustein: "spiel_spieler", ausloeser: "Spiel", aha: "a", konsequenz: "k", schlagworte: ["Coaching"] }]; },
    funktionen: { "ki-nachbereitung": (u, req) => { const b = JSON.parse(req.postData() || "{}"); gesendet.push(b);
      return b.art === "tagebuch" ? { art: "tagebuch", ergebnis: { tagebuch: { ...tb, aha: "Aus der gespeicherten Notiz." } } }
        : { art: "training", ergebnis: { einheit: { spass: 4 }, uebungen: [], kinder: [], tagebuch: tb } }; } }
  }) });
  const r = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof tbKiVorschlag !== "function" || typeof nbTagebuchVorschlag !== "function") return { fehlt: true };
    await loadKader();
    AW_DATA[gestern] = { "Kind A": { da: true }, "Kind C": { da: true } };
    await einheitBewertenOpen(); await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("nb-text"); i++) await warte(50);
    const out = {};
    document.getElementById("nb-text").value = "Heute war es hektisch, Kind C hat sich zurückgezogen. Ich habe zu viel reingerufen.";
    _nbText = document.getElementById("nb-text").value;
    await nbAuswerten("training"); await warte(50);
    out.status = document.getElementById("nb-status").textContent;
    await einheitSave(); await warte(200);
    document.getElementById("eb-weiter")?.remove(); document.getElementById("eb-modal")?.remove();
    document.getElementById("nb-weiter")?.remove();
    /* b/c) v679: Der Vorschlag ist mit der Auswertung schon gespeichert; „Ins Tagebuch“ öffnet die
       Prüfkarte statt eines zweiten Eintrags. Geprüft wird, was gespeichert wurde. */
    await tagebuchAusEinheit(gestern); await warte(120);
    out.b = { pruefkarte: !!document.getElementById("tb-pruefen"), zweitesFenster: !!document.getElementById("tb-card") };
    if (typeof tbPruefenZu === "function") tbPruefenZu();
    // e) gespeicherte Notiz, kein Vorschlag im Speicher
    _nbTb = null;
    await tagebuchAusEinheit(gestern); await warte(80);
    const knopf = document.getElementById("tb-ki-los");
    out.e = { knopf: !!knopf, zweiterWeg: typeof tbKiAusGespeichert === "function" };
    tagebuchSchliessen();
    // f) Liste mit Themen
    let box = document.getElementById("tb-liste"); if (!box) { box = document.createElement("div"); box.id = "tb-liste"; document.body.appendChild(box); }
    await tagebuchListe(); await warte(50);
    const themen = [...box.querySelectorAll("button")].filter(b => b.textContent.startsWith("#")).map(b => b.textContent.trim());
    out.f = { themen };
    tbFilter("Coaching"); await warte(20);
    out.f.gefiltert = box.textContent.includes("2 Einträge zu „Coaching“") && !box.textContent.includes("Festival");
    tbFilter("Coaching");
    // g) Decknamen an der Kennung
    const vorher = tbAlias("Kind A");
    KADER.reverse();
    out.g = { vorher, nachher: tbAlias("Kind A") };
    KADER.reverse();
    return out;
  }, { gestern });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v628 Sprachnotiz → Tagebuch", false, ["tbKiVorschlag/nbTagebuchVorschlag fehlt"]);
  const ep = einheitPosts[0] || {};
  if (!/zurückgezogen/.test(ep.sprachnotiz || "")) probleme.push("a) sprachnotiz nicht mit der Einheit gespeichert: " + JSON.stringify(ep).slice(0, 120));
  if (!/Tagebuch-Vorschlag/.test(r.status)) probleme.push("b) Rückmeldung nennt den Tagebuch-Vorschlag nicht: " + r.status);
  const b = tbPosts.find(x => x.ki_vorschlag === true) || {};
  if (!r.b.pruefkarte || r.b.zweitesFenster) probleme.push("b) „Ins Tagebuch“ führt nicht zur Prüfkarte: " + JSON.stringify(r.b));
  if (b.baustein !== "ich" || !/zu viel von außen/.test(b.aha || "") || !/eine Anweisung/.test(b.konsequenz || "") || JSON.stringify(b.schlagworte) !== JSON.stringify(["Coaching", "Ansprache", "Ruhe"]))
    probleme.push("b) Felder: " + JSON.stringify(b).slice(0, 220));
  if (/Kind \d/.test(b.beobachtung || "")) probleme.push("c) „Kind n“ im Tagebuch: " + b.beobachtung);
  if (!/Kind C zog/.test(b.beobachtung || "")) probleme.push("c) Deckname fehlt: " + b.beobachtung);
  const tp = b;
  if (JSON.stringify(tp.schlagworte) !== JSON.stringify(["Coaching", "Ansprache", "Ruhe"]) || tp.ki_vorschlag !== true) probleme.push("d) erfasst: " + JSON.stringify({ s: tp.schlagworte, k: tp.ki_vorschlag }));
  /* v679 (prozess-nacherfassung.md): „Vorschlag aus der Sprachnotiz“ war ein zweiter KI-Aufruf für
     denselben Termin – genau die Doppelung, die weg soll. Der Vorschlag entsteht in derselben
     Auswertung und wird sofort gespeichert; den Knopf und art „tagebuch“ gibt es nicht mehr. */
  if (r.e.knopf || r.e.zweiterWeg) probleme.push("e) Der zweite Weg ist noch da: " + JSON.stringify(r.e));
  if (gesendet.some(g => g.art === "tagebuch")) probleme.push("e) Es gab einen zweiten KI-Aufruf art „tagebuch“");
  if (!r.f.themen.some(t => /#Coaching · 2/.test(t)) || !r.f.gefiltert) probleme.push("f) Themen/Filter: " + JSON.stringify(r.f));
  if (r.g.vorher !== r.g.nachher) probleme.push(`g) Deckname wechselt mit der Reihenfolge: ${r.g.vorher} → ${r.g.nachher}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Tagebuch (v679 sofort gespeichert): ${b.baustein} · Aha „${b.aha}“ · #${(tp.schlagworte || []).join(" #")} · KI ${tp.ki_vorschlag} · Themen ${r.f.themen.join(" ")}`);
  return h.ergebnis("v628 Sprachnotiz → Tagebuch: Rohtext bleibt, KI-Vorschlag mit Decknamen und Schlagworten", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
