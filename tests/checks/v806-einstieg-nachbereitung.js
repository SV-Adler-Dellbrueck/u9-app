/* v806 · Ein Einstieg für die Nachbereitung (Charles 08.11.2026, Bildschirmfoto „Festival nachbereiten“).
   a) Einstieg „Wie möchtest du anfangen?“: großer Knopf „Erzählen“, Leitfaden mit vier Punkten, „Los geht’s – Frage für Frage“
   b) „Wie war’s?“ von der Startseite öffnet denselben Einstieg – nicht mehr direkt die Vollansicht der Sprachnotiz
   c) Kachel-Weg: Schlussfrage „Was nehmen wir mit?“ → beim Speichern ein Tagebuch-Entwurf (Status keim, Wort für Wort, ohne KI-Aufruf);
      ohne Antwort kein Entwurf */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const fest = { id: 77, datum: gestern, typ: "turnier", titel: "Kinderfestival", heim: true, uhrzeit: "10:15", uhrzeit_ende: "12:00", trainer_status: { Charles: "ja" } };
  const eintraege = [];
  let kiAufrufe = 0;
  const s = await h.starten({ hoehe: 1800, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }],
    termine: u => (/id=eq\.77/.test(u.search) || /spiel|turnier/.test(u.searchParams.get("typ") || "")) ? [fest] : [],
    nominierungen: [{ datum: gestern + "__teams", data: { "1": 1, "2": 1, "3": 2, "4": 2, _form: { "1": "4+1", "2": "funino" } } }],
    heimturnier: [{ teams: ["SV Adler Dellbrück 1", "SV Adler Dellbrück 2", "VFB 05", "TuS Beispiel"] }],
    event_bewertung: [],
    tagebuch_eintrag: (u, req) => { if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); eintraege.push(Array.isArray(b) ? b[0] : b); return [{ id: 900 + eintraege.length }]; } return []; }
  }) });
  await s.page.route(/functions\/v1\/ki-nachbereitung/, r => { kiAufrufe++; return r.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof fazitOpen !== "function" || typeof wieWarsStart !== "function") return { fehlt: true };
    const out = {};
    // b) von der Startseite
    await wieWarsStart("t77");
    for (let i = 0; i < 40 && !document.getElementById("nb-weg"); i++) await w(50);
    out.startseiteGross = !!document.getElementById("nb-gross-ov");
    // a) der Einstieg
    const weg = document.getElementById("nb-weg");
    out.start = weg ? weg.textContent.replace(/\s+/g, " ") : "";
    out.erzaehlen = !!weg && [...weg.querySelectorAll("button")].some(b => /Erzählen/.test(b.textContent) && /nbGross/.test(b.getAttribute("onclick") || "") && b.getBoundingClientRect().height >= 56);
    out.leitfaden = weg ? weg.querySelectorAll("#nb-leitfaden-start li").length : 0;
    // c) durch alle Kachel-Schritte bis zur Schlussfrage
    let n = 0;
    while (n++ < 40 && !/Was nehmen wir mit\?/.test(document.getElementById("nb-weg")?.textContent || "")) { nbWegGehe(1); await w(20); }
    const feld = document.querySelector('#nb-weg textarea[data-nb-ziel="@mit"]');
    out.schlussfrage = !!feld;
    if (feld) { feld.value = "Gute Passfolgen, der Torwart war mutig."; }
    nbWegFelderMerken(); nbWegGehe(1); await w(30);
    out.ende = /Fertig/.test(document.getElementById("nb-weg")?.textContent || "");
    nbWegSpeichern(); await w(800);
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("fazitOpen oder wieWarsStart fehlt");
  else {
    if (r.startseiteGross) probleme.push("b) Startseite öffnet noch direkt die Vollansicht der Sprachnotiz");
    if (!/Wie möchtest du anfangen\?/.test(r.start) || !/Frage für Frage/.test(r.start)) probleme.push("a) Einstieg fehlt: " + r.start.slice(0, 120));
    if (!r.erzaehlen) probleme.push("a) großer Knopf „Erzählen“ (≥ 56 px, öffnet nbGross) fehlt");
    if (r.leitfaden !== 4) probleme.push("a) Leitfaden hat " + r.leitfaden + " statt 4 Punkte");
    if (!r.schlussfrage) probleme.push("c) Schlussfrage „Was nehmen wir mit?“ fehlt im Kachel-Weg");
    const e = eintraege[0];
    if (!e || e.status !== "keim" || e.ki_vorschlag !== true || !/Gute Passfolgen/.test(e.beobachtung || "") || e.anlass !== "spieltag" || e.termin_id !== 77) probleme.push("c) Tagebuch-Entwurf: " + JSON.stringify(e || null).slice(0, 220));
    if (eintraege.length !== 1) probleme.push("c) " + eintraege.length + " Tagebuch-Einträge statt 1");
    if (kiAufrufe) probleme.push("c) die Schlussfrage ruft die KI auf (" + kiAufrufe + "×)");
  }
  zeilen.push("Einstieg: großer Knopf „Erzählen“, Leitfaden mit vier Punkten, Frage für Frage; Startseite öffnet denselben Einstieg");
  zeilen.push("Kachel-Weg: Schlussfrage → ein Tagebuch-Entwurf („keim“, Wort für Wort), ohne KI-Aufruf");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v806 Ein Einstieg für die Nachbereitung", !probleme.length, probleme.length ? probleme : zeilen);
};
