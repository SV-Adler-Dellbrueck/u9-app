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
    // b/c) Tagebuch aus der Einheit
    await tagebuchAusEinheit(gestern); await warte(80);
    const w = _TB && _TB.werte;
    out.b = { ki: _TB && _TB.ki, baustein: w && w.baustein, aha: w && w.aha, konsequenz: w && w.konsequenz, schlagworte: w && w.schlagworte,
      beobachtung: w && w.beobachtung, hinweis: /Vorschlag der KI/.test(document.getElementById("tb-card").textContent),
      feld: !!document.getElementById("tb-schlagworte") };
    // d) erfassen
    _TB.uebergehen = true;
    await tagebuchSpeichern(); await warte(100);
    document.getElementById("tb-modal")?.remove();
    // e) gespeicherte Notiz, kein Vorschlag im Speicher
    _nbTb = null;
    await tagebuchAusEinheit(gestern); await warte(80);
    const knopf = document.getElementById("tb-ki-los");
    out.e = { knopf: !!knopf };
    if (knopf) { knopf.click(); for (let i = 0; i < 30 && !(_TB && _TB.ki); i++) await warte(50); }
    out.e.aha = _TB && _TB.werte.aha; out.e.ki = _TB && _TB.ki;
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
  const b = r.b;
  if (!b.ki || !b.hinweis) probleme.push("b) kein KI-Hinweis im Tagebuch");
  if (b.baustein !== "ich" || !/zu viel von außen/.test(b.aha || "") || !/eine Anweisung/.test(b.konsequenz || "") || !/Coaching, Ansprache, Ruhe/.test(b.schlagworte || "") || !b.feld)
    probleme.push("b) Felder: " + JSON.stringify(b).slice(0, 220));
  if (/Kind \d/.test(b.beobachtung || "")) probleme.push("c) „Kind n“ im Tagebuch: " + b.beobachtung);
  if (!/Kind C zog/.test(b.beobachtung || "")) probleme.push("c) Deckname fehlt: " + b.beobachtung);
  const tp = tbPosts[0] || {};
  if (JSON.stringify(tp.schlagworte) !== JSON.stringify(["Coaching", "Ansprache", "Ruhe"]) || tp.ki_vorschlag !== true) probleme.push("d) erfasst: " + JSON.stringify({ s: tp.schlagworte, k: tp.ki_vorschlag }));
  if (!r.e.knopf || !r.e.ki || !/gespeicherten Notiz/.test(r.e.aha || "")) probleme.push("e) gespeicherte Notiz: " + JSON.stringify(r.e));
  const tg = gesendet.find(g => g.art === "tagebuch");
  if (!tg || /Kind [A-O]\b/.test(tg.text)) probleme.push("e) Aufruf art „tagebuch“ fehlt oder enthält Namen");
  if (!r.f.themen.some(t => /#Coaching · 2/.test(t)) || !r.f.gefiltert) probleme.push("f) Themen/Filter: " + JSON.stringify(r.f));
  if (r.g.vorher !== r.g.nachher) probleme.push(`g) Deckname wechselt mit der Reihenfolge: ${r.g.vorher} → ${r.g.nachher}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Tagebuch: ${b.baustein} · Aha „${b.aha}“ · #${(tp.schlagworte || []).join(" #")} · KI ${tp.ki_vorschlag} · Themen ${r.f.themen.join(" ")}`);
  return h.ergebnis("v628 Sprachnotiz → Tagebuch: Rohtext bleibt, KI-Vorschlag mit Decknamen und Schlagworten", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
