/* v627 · PO (Bildschirmfoto „Einheit bewerten“): „Wenn ich Einheiten nachbewerte, sei es
   Training, Spiele oder Festivals, wäre es gut, dass ich diese auch per Sprachnotiz eingeben kann
   und die KI dann diese Notizen übernimmt und strukturiert.“

   Die KI (Edge Function ki-nachbereitung) ist hier eine Attrappe; geprüft wird, was die App
   hinschickt und was sie mit der Antwort macht.

   a) Training: Kasten „Per Sprachnotiz ausfüllen“ steht über „Die Einheit insgesamt“.
   b) Datenschutz: im gesendeten Text steht kein Kindername, nur „Kind n“; die Liste der
      anwesenden Kinder ebenso.
   c) Die Antwort landet in den Feldern: Einheit-Sterne, Notiz, Übungs-Sterne und -Kommentar,
      „übersprungen“, Kinder-Sterne (zurückübersetzt auf das richtige Kind). Nichts gespeichert.
   d) Spiel/Festival: Mannschaft, Gast, „Das hat getragen“, Organisation werden eingetragen,
      auch hier ohne Speichern.
   e) Zu kurzer Text: kein Aufruf, ein Hinweis. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const plan = [
    { formIdx: 1, formName: "Adler 1 – Aktivierung", trainer: "Alle", slotLabel: "Warm up Adler, kurz" },
    { formIdx: 2, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up Adler, kurz" },
    { formIdx: 3, formName: "3 gegen 3 auf vier Minitore – Pass zählt doppelt", trainer: "Alle", slotLabel: "Hauptteil 1 – Stationen" }
  ];
  const gesendet = [];
  let schreibend = 0;
  const antwortTraining = { art: "training", ergebnis: {
    einheit: { spass: 5, umsetzung: 3, erfolg: null, notiz: "Viel Bewegung, Konzentration ließ am Ende nach." },
    uebungen: [{ nr: 3, durchfuehrung: 4, spass: 5, anforderung: 2, notiz: "Doppelpass klappte selten.", uebersprungen: false },
               { nr: 2, durchfuehrung: null, spass: null, anforderung: null, notiz: null, uebersprungen: true }],
    kinder: [{ kind: "Kind 2", sterne: 3 }] } };
  const antwortSpiel = { art: "spiel", ergebnis: {
    teams: [{ nr: 1, ordnung: 1, pass: 3, zweikampf: null, spass: 3 }],
    gaeste: [{ name: "FC Gastverein", einschaetzung: "zu_stark" }],
    getragen: "Die Kinder haben nie aufgegeben.", arbeiten: null, orga: { zeitplan: 1, felder: null, helfer: null } } };
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], einheit_bewertung: [],
    trainingsplan: [{ datum: gestern, plan, kopf: {} }], trainings_eval: [], nominierungen: [], heimturnier: [{ teams: ["Adler 1", "FC Gastverein"] }],
    termine: [{ id: 7, datum: gestern, typ: "training" }, { id: 8, datum: gestern, typ: "turnier", titel: "Festival" }],
    event_bewertung: (u, req) => { if (req.method() !== "GET") schreibend++; return []; },
    funktionen: { "ki-nachbereitung": (u, req) => { const b = JSON.parse(req.postData() || "{}"); gesendet.push(b); return b.art === "spiel" ? antwortSpiel : antwortTraining; } }
  }) });

  const r = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof nbSprachHtml !== "function") return { fehlt: true };
    await loadKader();
    AW_DATA[gestern] = { "Kind A": { da: true }, "Kind C": { da: true }, "Kind E": { da: true } };
    await einheitBewertenOpen(); await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("eb-ue-0"); i++) await warte(50);
    const out = {};
    const box = document.getElementById("nb-box"), kopf = [...document.querySelectorAll("#eb-card div")].find(d => d.textContent.trim() === "Die Einheit insgesamt");
    out.a = { box: !!box, davor: !!(box && kopf && (box.compareDocumentPosition(kopf) & 4)) };
    // e) zu kurz
    document.getElementById("nb-text").value = "gut";
    await nbAuswerten("training");
    out.e = document.getElementById("nb-status").textContent;
    // c) Training
    document.getElementById("nb-text").value = "Heute war richtig Stimmung, Kind-A-Name war super dabei. Kind C … Dribbel Quadrat haben wir ausgelassen. Beim Pass-Spiel hat Kind E den Doppelpass oft gesucht.";
    document.getElementById("nb-text").value = document.getElementById("nb-text").value.replace("Kind-A-Name", "Kind C").replace("Kind C …", "Kind A war müde.");
    await nbAuswerten("training"); await warte(80);
    const st = k => { const e = document.getElementById("eb-stars-" + k); return e ? Number(e.dataset.val) : -1; };
    const kids = EB_SPIELER.slice();
    out.c = { spass: st("spass"), umsetzung: st("umsetzung"), erfolg: st("erfolg"), notiz: document.getElementById("eb-notiz").value,
      status: document.getElementById("nb-status").textContent, kids };
    const idx = EB_PLAN.findIndex(p => /Minitore/.test(p.formName)), idxD = EB_PLAN.findIndex(p => /Dribbel/.test(p.formName));
    out.c.ueSterne = [st(`ue-${idx}-Durchführung`), st(`ue-${idx}-Spaßfaktor Kinder`), st(`ue-${idx}-Anforderung umgesetzt`)];
    out.c.ueNotiz = document.getElementById("eb-ue-notiz-" + idx).value;
    out.c.skip = document.getElementById("eb-skip-" + idxD).checked;
    out.c.kindSterne = kids.map((n, i) => [n, st("sp-" + i)]);
    out.c.planReihe = EB_PLAN.map(p => p.formName);
    document.getElementById("eb-modal")?.remove();
    // d) Festival
    TM_TERMINE = [{ id: 8, datum: gestern, typ: "turnier", titel: "Festival" }];   // die Attrappe filtert nicht nach id
    await fazitOpen(8);
    for (let i = 0; i < 40 && !document.getElementById("nb-text"); i++) await warte(50);
    document.getElementById("nb-text").value = "Adler 1 stand nur als Traube, aber die Pässe kamen an. Der Gastverein war viel zu stark. Zeitplan zu eng.";
    await nbAuswerten("spiel"); await warte(80);
    out.d = { wert: JSON.parse(JSON.stringify(_FZ && _FZ.wert || {})), getragen: document.getElementById("fz-getragen")?.value, status: document.getElementById("nb-status")?.textContent };
    return out;
  }, { gestern });
  const fe = s.fehler();
  await s.schliessen();

  if (r.fehlt) return h.ergebnis("v627 Sprachnotiz", false, ["nbSprachHtml fehlt"]);
  if (!r.a.box || !r.a.davor) probleme.push(`a) Kasten ${r.a.box ? "steht nicht über der Einheit" : "fehlt"}`);
  if (!/ein paar Sätze/.test(r.e) || gesendet.length > 2) probleme.push(`e) zu kurzer Text: „${r.e}“`);
  const t = gesendet.find(g => g.art === "training");
  if (!t) probleme.push("b) Training wurde nicht gesendet");
  else {
    if (/Kind [A-O]\b/.test(t.text)) probleme.push("b) Kindername im gesendeten Text: " + t.text.slice(0, 120));
    if (!/Kind \d+/.test(t.text)) probleme.push("b) keine Platzhalter „Kind n“ im Text");
    if (!Array.isArray(t.kinder) || t.kinder.some(k => !/^Kind \d+$/.test(k)) || t.kinder.length !== 3) probleme.push("b) Kinderliste: " + JSON.stringify(t.kinder));
    if (!Array.isArray(t.uebungen) || t.uebungen.length !== 3) probleme.push("b) Übungsliste: " + JSON.stringify(t.uebungen));
  }
  const c = r.c;
  if (c.spass !== 5 || c.umsetzung !== 3 || c.erfolg !== 0) probleme.push(`c) Einheit-Sterne ${c.spass}/${c.umsetzung}/${c.erfolg} statt 5/3/0`);
  if (!/Konzentration/.test(c.notiz)) probleme.push("c) Notiz zur Einheit fehlt");
  const nr3 = t && t.uebungen.find(u => u.nr === 3);
  // Übung Nr. 3 der gesendeten Liste = EB_PLAN[2]; die App bündelt, prüfe über den Namen
  if (JSON.stringify(c.ueSterne) !== "[4,5,2]") probleme.push(`c) Übungs-Sterne ${JSON.stringify(c.ueSterne)} statt [4,5,2] (Reihe ${c.planReihe.join(" | ")}, Nr.3=${nr3 && nr3.name})`);
  if (!/Doppelpass/.test(c.ueNotiz)) probleme.push("c) Übungs-Kommentar fehlt");
  if (!c.skip) probleme.push("c) „übersprungen“ nicht gesetzt");
  const k2 = c.kindSterne[1];
  if (!k2 || k2[1] !== 3 || c.kindSterne.filter(x => x[1] > 0).length !== 1) probleme.push("c) Kinder-Sterne: " + JSON.stringify(c.kindSterne));
  if (!/Bitte prüfen und speichern/.test(c.status)) probleme.push("c) Rückmeldung: " + c.status);
  const d = r.d, t1 = (d.wert.teams || {})["1"] || {};
  if (t1.ordnung !== 1 || t1.pass !== 3 || t1.spass !== 3 || "zweikampf" in t1) probleme.push("d) Mannschaft: " + JSON.stringify(t1));
  if ((d.wert.gaeste || {})["FC Gastverein"] !== "zu_stark") probleme.push("d) Gast: " + JSON.stringify(d.wert.gaeste));
  if (!/nie aufgegeben/.test(d.getragen || "")) probleme.push("d) „Das hat getragen“ fehlt");
  if ((d.wert.orga || {}).zeitplan !== 1) probleme.push("d) Organisation: " + JSON.stringify(d.wert.orga));
  const sp = gesendet.find(g => g.art === "spiel");
  if (!sp || !sp.festival || !(sp.gaeste || []).includes("FC Gastverein")) probleme.push("d) gesendet: " + JSON.stringify(sp && { festival: sp.festival, gaeste: sp.gaeste }));
  if (schreibend) probleme.push(`c/d) ${schreibend}× in event_bewertung geschrieben – es darf nichts gespeichert werden`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Training: Einheit ${c.spass}/${c.umsetzung}, Übung ${c.ueSterne.join("/")}, übersprungen ${c.skip}, Kinder ${c.kindSterne.map(x => x[1]).join("/")} · gesendet „${t && t.text.slice(0, 70)}…“`);
  zeilen.push(`Festival: Team ${JSON.stringify(t1)}, Gast ${d.wert.gaeste && d.wert.gaeste["FC Gastverein"]}, Zeitplan ${(d.wert.orga || {}).zeitplan}`);
  return h.ergebnis("v627 Sprachnotiz → Nachbereitung: Training und Festival, ohne Kindernamen", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
