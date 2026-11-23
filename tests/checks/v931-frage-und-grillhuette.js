/* v931 · Zwei Rückfragen von Eltern (Charles 21.11.2026: „Ja, beides so bauen“).
   1. Eine Frage zur App kam als „Elterngespräch-Wunsch“: Die Kachel „Trainerteam – Frage oder Elterngespräch“ bot nur
      „Elterngespräch anfragen“, das Formular schlug sogar „eine Frage …“ vor.
      a) In der Kachel steht zuerst „💬 Frage ans Trainerteam“ (öffnet den privaten Chat-Raum), dann das Gespräch.
      b) Das Gesprächsformular verweist kurze Fragen in den Chat und schlägt keine Frage mehr vor.
      c) rufePrivatEinstieg öffnet die Adler-Rufe und wechselt in den privaten Raum (Eltern: ohne Kind, Trainer: Kind).
      d) Trainer: „💬 Im Chat antworten“ am Gesprächswunsch hakt ihn ab und öffnet den Raum dieser Familie.
   2. „eingeteilt“ bei der Grillhütte las sich bei allen Familien wie „ihr seid dran“.
      e) Eigene Familie: „🔥 Ihr seid dran“ und „Eure Familie ist … eingeteilt“; andere Familie: grau „vergeben“ (seit v958 keine Marke) und
         „ihr müsst nichts tun“ – nirgends mehr „Eine Familie ist eingeteilt“ und kein grünes Etikett für Fremde. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  // a) Quelltext: Reihenfolge in der Kachel
  const ep = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  const k0 = ep.indexOf('id="cat-kontakt"'), k1 = ep.indexOf("/cat-kontakt", k0), kontakt = ep.slice(k0, k1);
  const iFrage = kontakt.indexOf("Frage ans Trainerteam"), iGespr = kontakt.indexOf("Persönliches Gespräch vereinbaren");
  if (iFrage < 0 || !/rufePrivatEinstieg\(\)/.test(kontakt)) probleme.push("a) In der Kachel „Trainerteam“ fehlt „Frage ans Trainerteam“ mit dem Weg in den Chat");
  else if (iGespr < 0 || iGespr < iFrage) probleme.push("a) „Frage ans Trainerteam“ steht nicht vor dem Gespräch");

  const T = h.tagePlus(7);
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    elterngespraech_wunsch: [{ id: 5, thema: "Kurze Frage zur App", created_at: new Date().toISOString(), spieler_id: 3, kader: { name: "Kind C" } }] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async (T) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof elternGespraechOpen !== "function"; i++) await w(100);
    const out = {};
    // b)
    window._elternKids = [{ spieler_id: 3, kader: { name: "Kind C" } }];
    elternGespraechOpen(); await w(50);
    const m = document.getElementById("eg-modal");
    out.form = { link: !!(m && m.querySelector("#eg-zur-frage")), platzhalter: (m && m.querySelector("#eg-thema") || {}).placeholder || "" };
    m && m.remove();
    // c) Adler-Rufe-Attrappe
    const aufrufe = [];
    window.rufeEinstieg = () => { aufrufe.push("einstieg"); setTimeout(() => { _rf = { raeume: [{ id: 1 }] }; }, 50); };
    window.rufePrivat = k => aufrufe.push("privat:" + k);
    rufePrivatEinstieg(); await w(500);
    out.eltern = aufrufe.slice();
    aufrufe.length = 0; _rf = null;
    // d) Trainer-Karte
    await elterngespraecheTrainerLoad(); await w(50);
    const b = [...document.querySelectorAll("#eg-trainer button")].find(x => /Im Chat antworten/.test(x.textContent));
    out.knopf = !!b;
    if (b) { b.click(); await w(600); }
    out.trainer = aufrufe.slice();
    // e) Grillhütte
    const D = s => ({ dienst_id: 1, datum: T, status: s.status, eigene: s.eigene, kann_uebernehmen: s.kann || false, name: "" });
    const bild = d => (typeof ghElternChip === "function" ? ghElternChip(d) : "") + " " + ghDienstHtml(d);
    const txt = x => { const e = document.createElement("div"); e.innerHTML = x; return { text: e.textContent.replace(/\s+/g, " ").trim(), farbe: (e.querySelector(".gh-chip") || {}).getAttribute ? e.querySelector(".gh-chip").getAttribute("style") : "" }; };
    out.eigen = txt(bild(D({ status: "eingeteilt", eigene: true })));
    out.fremd = txt(bild(D({ status: "eingeteilt", eigene: false })));
    out.fremdUeb = txt(bild(D({ status: "uebernommen", eigene: false })));
    return out;
  }, T);
  const gesendet = s.gesendet.slice();
  const fe = s.fehler();
  await s.schliessen();
  if (!r.form.link) probleme.push("b) Im Gesprächsformular fehlt „Nur eine kurze Frage? Im Chat stellen“");
  if (/Frage/i.test(r.form.platzhalter)) probleme.push(`b) Das Formular schlägt weiter eine Frage vor: „${r.form.platzhalter}“`);
  if (String(r.eltern) !== "einstieg,privat:null") probleme.push(`c) Eltern: ${JSON.stringify(r.eltern)} statt Einstieg und privater Raum ohne Kind`);
  if (!r.knopf) probleme.push("d) Am Gesprächswunsch fehlt „💬 Im Chat antworten“");
  else {
    if (String(r.trainer) !== "einstieg,privat:3") probleme.push(`d) Trainer: ${JSON.stringify(r.trainer)} statt privater Raum der Familie (Kind 3)`);
    const p = gesendet.find(g => g.methode === "PATCH" && /elterngespraech_wunsch/.test(g.pfad));
    if (!p || p.body.status !== "erledigt" || !/5/.test(p.suche)) probleme.push("d) „Im Chat antworten“ hakt den Wunsch nicht ab");
  }
  if (!/Ihr seid dran/.test(r.eigen.text) || !/Eure Familie ist für die Grillhütte eingeteilt/.test(r.eigen.text)) probleme.push(`e) eigene Familie sieht „${r.eigen.text.slice(0, 90)}“`);
  if (/vergeben/.test(r.fremd.text) || !/ihr müsst nichts tun/.test(r.fremd.text) || /Ihr seid dran|Eine Familie ist eingeteilt/.test(r.fremd.text)) probleme.push(`e) andere Familie sieht „${r.fremd.text.slice(0, 90)}“`);
  if (/green/.test(r.fremd.farbe)) probleme.push("e) andere Familie bekommt ein grünes Etikett");
  if (!/ihr müsst nichts tun/.test(r.fremdUeb.text)) probleme.push(`e) übernommen (fremd): „${r.fremdUeb.text.slice(0, 90)}“`);
  const kasse = fs.readFileSync(path.join(h.REPO, "md-kasse.js"), "utf8");
  if (/Eine Familie ist eingeteilt/.test(kasse)) probleme.push("e) „Eine Familie ist eingeteilt“ steht noch im Code");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!probleme.length) zeilen.push(`Kachel: Frage vor Gespräch · Formular verweist in den Chat („${r.form.platzhalter}“) · Eltern → privater Raum · Trainer „Im Chat antworten“ → Wunsch erledigt, Raum Kind 3 · Grillhütte: eigen „${r.eigen.text.slice(0, 30)}…“, fremd „${r.fremd.text.slice(0, 40)}…“`);
  return h.ergebnis("v931 Frage ans Trainerteam im Chat, Grillhütte aus Sicht der Familie", !probleme.length, zeilen.concat(probleme));
};
