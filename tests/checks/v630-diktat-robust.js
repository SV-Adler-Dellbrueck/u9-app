/* v630 · PO: „Zum einen stoppt irgendwann die Eingabe … weil der Bildschirm des Handys dann
   ausgeht … dann werden manche Worte mehrfach nacheinander geschrieben, obwohl sie nur einmal
   gesagt wurden … eine Anzeige, dass wenn gesprochen wird, da auch was ankommt, dass ich auch
   zwischendurch unterbrechen kann und dann wieder weiter einsprechen kann per Druck.“

   Die Spracherkennung ist eine Attrappe, die sich wie Chrome auf Android verhält: Sitzungen
   enden nach einer Pause, fertige Ergebnisse kommen kumulativ („Heute“, „Heute war“ …).

   a) Einsprechen: kurze Sitzungen (continuous aus), Bildschirmsperre angefordert, Anzeige
      „Hört zu“, Knopf wird „Pause“.
   b) Das gerade Verstandene steht live in der Anzeige; kumulative Ergebnisse stehen EINMAL im Feld.
   c) Nach dem Sitzungsende startet die nächste von selbst – die Eingabe hört nicht auf.
   d) Doppelt gelieferte Wortgruppen stehen einmal da; „sehr sehr gut“ bleibt.
   e) Pause: nichts geht verloren, kein Neustart, Sperre frei, Knopf „Weiter einsprechen“;
      Weiter hängt an.
   f) Bildschirm aus (Seite verborgen): pausiert, beim Zurückkommen geht es weiter.
   g) Mikrofon gesperrt: Hinweis, kein Neustart.
   h) Die Trainer-Notiz nutzt denselben Weg. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], einheit_bewertung: [], trainings_eval: [],
    trainingsplan: [{ datum: gestern, plan: [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }], kopf: {} }] }) });
  const r = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const sr = []; window._sr = sr;
    window.SpeechRecognition = function () { const me = this; me.an = false; sr.push(me);
      me.start = () => { me.an = true; }; me.stop = () => { me.an = false; setTimeout(() => me.onend && me.onend(), 0); }; me.abort = () => { me.an = false; }; };
    window.webkitSpeechRecognition = window.SpeechRecognition;
    const wl = { req: 0, rel: 0 };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { wl.req++; return { release: async () => { wl.rel++; } }; } } });
    let vis = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => vis });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => vis === "hidden" });
    const erg = (fertig, zw) => ({ resultIndex: 0, results: [...fertig.map(t => Object.assign([{ transcript: t }], { isFinal: true })), ...(zw ? [Object.assign([{ transcript: zw }], { isFinal: false })] : [])] });
    const letzte = () => sr[sr.length - 1];
    const ende = async () => { const x = letzte(); x.an = false; x.onend && x.onend(); await warte(250); };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof diktatStart !== "function") return { fehlt: true };
    await loadKader();
    await einheitBewertenOpen(); await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("nb-mic"); i++) await warte(50);
    const feld = () => document.getElementById("nb-text").value;
    const anz = () => (document.getElementById("nb-hoer") || {}).textContent || "";
    const knopf = () => document.getElementById("nb-mic").textContent.trim();
    const out = {};
    document.getElementById("nb-mic").click(); await warte(30);
    out.a = { n: sr.length, cont: sr[0] && sr[0].continuous, an: sr[0] && sr[0].an, wl: wl.req, anz: anz(), knopf: knopf(), sichtbar: !document.getElementById("nb-hoer").hidden };
    // b) live + kumulativ
    letzte().onspeechstart && letzte().onspeechstart();
    letzte().onresult(erg([], "heute war")); await warte(10);
    out.b = { liveAnz: anz(), liveFeld: feld(), puls: !!document.querySelector("#nb-hoer .dk-spricht") };
    letzte().onresult(erg(["Heute", "Heute war", "Heute war es richtig gut"])); await warte(10);
    out.b.kumulativ = feld();
    await ende();
    out.c = { n: sr.length, an: letzte().an, feld: feld() };
    // d) Doppelung innerhalb einer Äußerung
    letzte().onresult(erg(["die Kinder hatten Spaß die Kinder hatten Spaß"])); await ende();
    letzte().onresult(erg(["das Passen war sehr sehr gut"])); await ende();
    out.d = feld();
    // e) Pause
    const vorPause = sr.length;
    document.getElementById("nb-mic").click(); await warte(250);
    out.e = { knopf: knopf(), anz: anz(), n: sr.length - vorPause, rel: wl.rel, feld: feld() };
    document.getElementById("nb-mic").click(); await warte(30);
    letzte().onresult(erg(["Kind C war müde"])); await ende();
    out.e.weiter = feld(); out.e.knopf2 = knopf(); out.e.nbText = _nbText === feld();
    // f) Bildschirm aus
    const vorAus = sr.length;
    vis = "hidden"; document.dispatchEvent(new Event("visibilitychange")); await warte(250);
    out.f = { neuWaehrendAus: sr.length - vorAus, relAus: wl.rel };
    vis = "visible"; document.dispatchEvent(new Event("visibilitychange")); await warte(50);
    out.f.neuDanach = sr.length - vorAus; out.f.an = letzte().an; out.f.knopf = knopf();
    // g) gesperrt
    const vorFehler = sr.length;
    letzte().onerror({ error: "not-allowed" }); letzte().onend && letzte().onend(); await warte(250);
    out.g = { neu: sr.length - vorFehler, anz: anz(), knopf: knopf() };
    document.getElementById("eb-modal")?.remove();
    // h) Trainer-Notiz
    out.h = { weg: typeof vdMicToggle === "function" && /diktatUmschalten/.test(String(vdMicToggle)) };
    return out;
  }, { gestern });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v630 Diktat", false, ["diktatStart fehlt"]);
  const { a, b, c, d, e, f, g } = r;
  if (a.n !== 1 || a.cont !== false || !a.an) probleme.push(`a) Sitzung: ${JSON.stringify(a)}`);
  if (a.wl < 1) probleme.push("a) keine Bildschirmsperre angefordert");
  if (!/Hört zu/.test(a.anz) || !a.sichtbar || a.knopf !== "Pause") probleme.push(`a) Anzeige/Knopf: „${a.anz}“ / „${a.knopf}“`);
  if (!/heute war/.test(b.liveAnz) || !/heute war/.test(b.liveFeld) || !b.puls) probleme.push(`b) live: ${JSON.stringify(b)}`);
  if (b.kumulativ !== "Heute war es richtig gut.") probleme.push(`b) kumulativ: „${b.kumulativ}“`);
  if (c.n !== 2 || !c.an || c.feld !== "Heute war es richtig gut.") probleme.push(`c) Neustart: ${JSON.stringify(c)}`);
  if (d !== "Heute war es richtig gut. Die Kinder hatten Spaß. Das Passen war sehr sehr gut.") probleme.push(`d) „${d}“`);
  if (e.knopf !== "Weiter einsprechen" || !/Pause/.test(e.anz) || e.n !== 0 || e.rel < 1 || e.feld !== d) probleme.push(`e) Pause: ${JSON.stringify(e)}`);
  if (e.weiter !== d + " Kind C war müde." || e.knopf2 !== "Pause" || !e.nbText) probleme.push(`e) Weiter: „${e.weiter}“ ${e.knopf2} ${e.nbText}`);
  if (f.neuWaehrendAus !== 0 || f.neuDanach !== 1 || !f.an || f.knopf !== "Pause") probleme.push(`f) Bildschirm aus: ${JSON.stringify(f)}`);
  if (g.neu !== 0 || !/gesperrt/.test(g.anz) || g.knopf !== "Einsprechen") probleme.push(`g) gesperrt: ${JSON.stringify(g)}`);
  if (!r.h.weg) probleme.push("h) Trainer-Notiz nutzt den gemeinsamen Weg nicht");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Feld: „${e.weiter}“ · Sitzungen neu gestartet, Sperre ${a.wl}× an / ${f.relAus}× frei`);
  return h.ergebnis("v630 Diktat: bleibt an, schreibt nichts doppelt, zeigt was ankommt, Pause und Weiter", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
