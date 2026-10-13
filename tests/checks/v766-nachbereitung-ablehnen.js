/* v766 · PO 13.10.: „Bewertungen von Trainingseinheiten und Spielen sollen vom Trainer abgelehnt werden können, mit
   optionalen Hinweisen wie ‚war nicht dabei‘, ‚keine Zeit‘, ‚nichts Besonderes festgestellt‘ oder Freitext. Im
   Trainertagebuch soll das hinterlegt werden. Wir wollen keinen Trainer zwingen, etwas einzutragen.“
   Dazu: „auch alle vergangenen Bewertungen, Stand 08.10.2026, als erledigt ablegen“; Orte: Karte „Wie war's?“ und
   die Dialoge „Einheit bewerten“ und „Spiel nachbereiten“; je Trainer.

   a) Karte „Wie war's?“: neben „Erzählen“ ein Knopf „Nichts eintragen“ (≥ 44 px); er öffnet einen Dialog mit vier
      Gründen (nichts vorgewählt) und freiwilliger Anmerkung
   b) „Ablegen“ geht auch ganz ohne Grund und Anmerkung; geschrieben wird eine Zeile je Trainer und Termin
      (Schlüssel d<Datum> / t<Nr.>); die Karte fragt danach nicht mehr nach diesem Termin
   c) Mit Grund und Anmerkung wird beides gespeichert; ein zweiter Tipp auf den Grund nimmt die Wahl zurück
   d) Abbrechen schreibt nichts; ein Serverfehler lässt den Dialog offen und sagt, dass nichts verändert wurde
   e) Tagebuch: Abschnitt „Nicht nachbereitet · N“ mit Grund und Anmerkung; „Ändern“ öffnet den Dialog mit der alten
      Wahl, „Doch eintragen“ löscht die Zeile – die Karte fragt wieder
   f) In den Fenstern „Einheit bewerten“ und „Spiel nachbereiten“ steht „Nichts eintragen“ – im Einstieg der geführten
      Nachbereitung und im Bogen; Ablegen schließt das Fenster
   g) Altbestand: bis einschließlich 08.10.2026 gilt als erledigt, danach nicht
   h) Die Tabelle steht in der Sicherung; die Migration trägt Tabelle, Zeilenschutz nur für Trainer und die
      Benachrichtigung „Wie war's?“ kennt abgelegte Termine */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const K = h.KINDER || [];
  const verz = [], posts = [];
  let fehlerAn = false, naechste = 500;
  const verzicht = (u, req) => {
    const q = u.searchParams, m = req.method();
    const eq = k => (q.get(k) || "").startsWith("eq.") ? decodeURIComponent(q.get(k).slice(3)) : null;
    const passt = z => (eq("autor") === null || z.autor === eq("autor")) && (eq("schluessel") === null || z.schluessel === eq("schluessel"));
    if (m === "GET") return verz.filter(passt);
    if (m === "POST") {
      const body = JSON.parse(req.postData() || "{}"); posts.push({ ...body, ok: !fehlerAn });
      if (fehlerAn) return { status: 500, body: JSON.stringify({ message: "kaputt" }) };
      const i = verz.findIndex(z => z.autor === body.autor && z.schluessel === body.schluessel);
      if (i >= 0) Object.assign(verz[i], body); else verz.push({ id: naechste++, created_at: new Date().toISOString(), ...body });
      return { status: 201, body: "" };
    }
    if (m === "DELETE") { for (let i = verz.length - 1; i >= 0; i--) if (passt(verz[i])) verz.splice(i, 1); return { status: 204, body: "" }; }
    return [];
  };
  const termine = [
    { id: 41, datum: gestern, uhrzeit: "10:00", uhrzeit_ende: "11:00", typ: "spiel", titel: "Testspiel", gegner: "Gegner A", trainer_status: { Charles: "ja" } },
    { id: 42, datum: gestern, uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", trainer_status: { Charles: "ja" } }];
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen().map((z, i) => ({ ...z, alias: String.fromCharCode(65 + i) })),
    profiles: [{ name: "Charles", rolle: "trainer" }], termine, einheit_bewertung: [], event_bewertung: [], tagebuch_eintrag: [], tagebuch_punkt: [], tagebuch_kind: [],
    trainingsplan: [{ datum: gestern, plan: [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Warm up" }], kopf: {} }],
    nachbereitung_verzicht: verzicht }) });
  await s.page.exposeFunction("__fehlerAn", v => { fehlerAn = !!v; });
  const r = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const bis = async (f, n) => { for (let i = 0; i < (n || 60) && !f(); i++) await warte(50); return f(); };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof nbVerzichtOpen !== "function" || typeof wieWarsKarte !== "function") return { fehlt: true };
    await loadKader();
    const hoehe = e => e ? Math.round(e.getBoundingClientRect().height) : 0;
    const out = {};
    document.getElementById("home-wiewars")?.remove();
    const slot = document.createElement("div"); slot.id = "home-wiewars"; document.body.prepend(slot);
    const knopf = txt => [...document.querySelectorAll("#nb-verzicht button, #home-wiewars button")].find(b => b.textContent.trim().indexOf(txt) === 0);
    const dlg = () => document.getElementById("nb-verzicht");

    // a) Karte
    await wieWarsKarte(); await warte(60);
    const nichts = [...slot.querySelectorAll("button")].find(b => /Nichts eintragen/.test(b.textContent));
    out.a = { karte: slot.textContent.replace(/\s+/g, " ").trim().slice(0, 140), knopf: hoehe(nichts) };
    nichts && nichts.click(); await bis(dlg);
    out.a.dialog = !!dlg() && dlg().getAttribute("role") === "dialog" && dlg().getAttribute("aria-modal") === "true";
    out.a.gruende = [...dlg().querySelectorAll("#nb-verzicht-gruende button")].map(b => [b.textContent.trim(), b.getAttribute("aria-pressed"), hoehe(b)]);
    out.a.ablegen = hoehe(document.getElementById("nb-verzicht-ok"));
    out.a.notiz = !!document.getElementById("nb-verzicht-notiz") && /freiwillig/.test(dlg().textContent);
    // b) ganz ohne Grund ablegen
    document.getElementById("nb-verzicht-ok").click(); await bis(() => !dlg()); await warte(150);
    out.b = { karte: slot.textContent.replace(/\s+/g, " ").trim().slice(0, 140), tagebuch: null };
    // c) mit Grund und Anmerkung (das zweite Termin = Spiel oder Training, je nach Karte)
    const nichts2 = [...slot.querySelectorAll("button")].find(b => /Nichts eintragen/.test(b.textContent));
    nichts2 && nichts2.click(); await bis(dlg);
    const g = () => [...dlg().querySelectorAll("#nb-verzicht-gruende button")];
    g()[0].click(); await warte(20); out.c = { an: g().map(b => b.getAttribute("aria-pressed")).join(",") };
    g()[0].click(); await warte(20); out.c.zurueck = g().map(b => b.getAttribute("aria-pressed")).join(",");
    g()[0].click(); await warte(20);
    document.getElementById("nb-verzicht-notiz").value = "Urlaub bis Sonntag";
    // d) Abbrechen schreibt nichts
    window.__vorAbbruch = true;
    const abbr = knopf("Abbrechen"); abbr.click(); await warte(30);
    out.d = { zu: !dlg() };
    const nichts3 = [...slot.querySelectorAll("button")].find(b => /Nichts eintragen/.test(b.textContent));
    nichts3.click(); await bis(dlg); g()[0].click(); await warte(10);
    document.getElementById("nb-verzicht-notiz").value = "Urlaub bis Sonntag";
    window.__fehlerAn(true);
    document.getElementById("nb-verzicht-ok").click(); await warte(200);
    out.d.fehlerOffen = !!dlg(); out.d.fehlerText = (document.getElementById("nb-verzicht-status") || {}).textContent || "";
    out.d.knopfFrei = !!document.getElementById("nb-verzicht-ok") && !document.getElementById("nb-verzicht-ok").disabled;
    window.__fehlerAn(false);
    document.getElementById("nb-verzicht-ok").click(); await bis(() => !dlg()); await warte(150);
    out.c.karteDanach = slot.textContent.replace(/\s+/g, " ").trim().slice(0, 100);
    // e) Tagebuch
    document.getElementById("tb-liste")?.remove();
    const box = document.createElement("div"); box.id = "tb-liste"; document.body.appendChild(box);
    await tagebuchListe(); await warte(80);
    const det = box.querySelector("details.tb-verzicht");
    out.e = { abschnitt: det ? det.querySelector("summary").textContent.trim() : null, zeilen: [...box.querySelectorAll(".tb-verzicht-zeile")].map(z => z.textContent.replace(/\s+/g, " ").trim()) };
    const aendern = [...box.querySelectorAll(".tb-verzicht-zeile")].find(z => /War nicht dabei/.test(z.textContent)).querySelector("button");
    out.e.aendernHoehe = hoehe(aendern);
    aendern.click(); await bis(dlg);
    out.e.vorbelegt = { grund: dlg().dataset.grund, notiz: document.getElementById("nb-verzicht-notiz").value, zurueck: !!knopf("Doch eintragen") };
    knopf("Doch eintragen").click(); await bis(() => !dlg()); await warte(150);
    out.e.nachZurueck = { karte: slot.textContent.replace(/\s+/g, " ").trim().slice(0, 100), zeilen: document.querySelectorAll(".tb-verzicht-zeile").length };
    // g) Altbestand
    out.g = { acht: nbAltbestand("2026-10-08"), neun: nbAltbestand("2026-10-09"), fruehe: nbAltbestand("2026-09-30"), leer: nbAltbestand("") };
    return out;
  }, { gestern });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v766 Nachbereitung ablehnen", false, ["nbVerzichtOpen oder wieWarsKarte fehlt"]); }

  const postsR = posts.slice();
  // f) die beiden Bewertungsfenster
  const f = await s.page.evaluate(async ({ gestern }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const bis = async (f, n) => { for (let i = 0; i < (n || 60) && !f(); i++) await warte(50); return f(); };
    const out = {};
    const sichtbar = e => e ? Math.round(e.getBoundingClientRect().height) : 0;
    const weiter = async (fn) => { fn.click(); await bis(() => document.getElementById("nb-verzicht")); document.getElementById("nb-verzicht-ok").click(); await bis(() => !document.getElementById("nb-verzicht")); await warte(150); };
    await einheitBewertenOpen(); await einheitDetailOpen(gestern); await bis(() => document.querySelector("#nb-weg .nb-nichts"));
    const w1 = document.querySelector("#nb-weg .nb-nichts");
    out.einheit = { weg: sichtbar(w1) };
    // auch im Bogen („Alles auf einen Blick“) steht der Knopf
    nbWegAus(); await warte(50);
    const eb = [...document.querySelectorAll("#eb-card > button")].find(b => /Nichts eintragen/.test(b.textContent));
    out.einheit.bogen = sichtbar(eb);
    await weiter(w1 && document.body.contains(w1) ? w1 : eb);
    out.einheit.fensterZu = !document.getElementById("eb-modal");
    await fazitOpen(41); await bis(() => document.querySelector("#fz-modal #nb-weg .nb-nichts"));
    const w2 = document.querySelector("#fz-modal #nb-weg .nb-nichts");
    out.spiel = { weg: sichtbar(w2) };
    nbWegAus(); await warte(50);
    const fz = [...document.querySelectorAll("#fz-modal button")].find(b => /Nichts eintragen/.test(b.textContent));
    out.spiel.bogen = sichtbar(fz);
    await weiter(fz);
    out.spiel.fensterZu = !document.getElementById("fz-modal");
    return out;
  }, { gestern });
  const fe = s.fehler();
  await s.schliessen();

  // a)
  const a = r.a, gr = a.gruende || [];
  if (!/Wie war's\?/.test(a.karte) || a.knopf < 44 || !a.dialog || gr.length !== 4 || gr.some(x => x[1] !== "false" || x[2] < 44) || a.ablegen < 56 || !a.notiz
      || gr.map(x => x[0]).join("|") !== "War nicht dabei|Keine Zeit|Nichts Besonderes festgestellt|Anderer Grund") probleme.push("a) " + JSON.stringify(a));
  zeilen.push(`a) Karte mit „Nichts eintragen“ (${a.knopf} px), Dialog mit vier Gründen, nichts vorgewählt, Anmerkung freiwillig`);
  // b) erste Zeile ohne Grund
  const z1 = postsR[0] || {};
  if (z1.autor !== "Charles" || !/^(d\d{4}-\d{2}-\d{2}|t\d+)$/.test(z1.schluessel || "") || z1.grund !== null || z1.notiz !== null || !["training", "spiel"].includes(z1.art) || !z1.datum)
    probleme.push("b) Zeile ohne Grund: " + JSON.stringify(z1));
  if (r.b.karte === a.karte) probleme.push("b) die Karte fragt nach dem Ablegen noch nach demselben Termin: " + r.b.karte);
  zeilen.push(`b) „Ablegen“ ohne Grund und Anmerkung: ${z1.schluessel} · Karte danach „${r.b.karte.slice(0, 50)}…“`);
  // c) / d)
  const gespeichert = postsR.filter(p => p.ok && p.grund === "nicht_dabei" && p.notiz === "Urlaub bis Sonntag");
  if (r.c.an !== "true,false,false,false" || r.c.zurueck !== "false,false,false,false" || gespeichert.length !== 1) probleme.push("c) " + JSON.stringify({ c: r.c, gespeichert: gespeichert.length, posts: postsR }));
  zeilen.push("c) Grund und Anmerkung gespeichert; zweiter Tipp nimmt den Grund zurück");
  if (!r.d.zu || !r.d.fehlerOffen || !/nichts (abgelegt|verändert)/i.test(r.d.fehlerText) || !r.d.knopfFrei || postsR.length !== 3 || postsR.filter(p => !p.ok).length !== 1) probleme.push("d) " + JSON.stringify({ d: r.d, posts: postsR }));
  zeilen.push("d) Abbrechen schreibt nichts; bei einem Serverfehler bleibt der Dialog offen („" + r.d.fehlerText.trim().slice(0, 60) + "“)");
  // e)
  const e = r.e;
  if (!/^Nicht nachbereitet · 2$/.test(e.abschnitt || "") || e.zeilen.length !== 2 || !e.zeilen.some(t => /War nicht dabei – Urlaub bis Sonntag/.test(t)) || !e.zeilen.some(t => /Nichts eingetragen/.test(t))
      || e.aendernHoehe < 44 || e.vorbelegt.grund !== "nicht_dabei" || e.vorbelegt.notiz !== "Urlaub bis Sonntag" || !e.vorbelegt.zurueck || e.nachZurueck.zeilen !== 1 || e.nachZurueck.karte === r.c.karteDanach)
    probleme.push("e) " + JSON.stringify(e));
  zeilen.push(`e) Tagebuch „${e.abschnitt}“, Ändern vorbelegt, „Doch eintragen“ löscht die Zeile, Karte fragt wieder`);
  // f)
  if (f.einheit.weg < 44 || f.einheit.bogen < 44 || !f.einheit.fensterZu || f.spiel.weg < 44 || f.spiel.bogen < 44 || !f.spiel.fensterZu) probleme.push("f) " + JSON.stringify(f));
  zeilen.push("f) „Einheit bewerten“ und „Spiel nachbereiten“: Knopf im Einstieg und im Bogen, Ablegen schließt das Fenster");
  // g)
  if (!r.g.acht || r.g.neun || !r.g.fruehe || r.g.leer) probleme.push("g) " + JSON.stringify(r.g));
  zeilen.push("g) Altbestand: 08.10.2026 und früher erledigt, 09.10. nicht");
  // h) Dateien
  const migDir = path.join(h.REPO, "supabase/migrations");
  const mig = fs.readdirSync(migDir).filter(n => /v766_nachbereitung_verzicht/.test(n)).map(n => fs.readFileSync(path.join(migDir, n), "utf8")).join("\n");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const mH = /create table if not exists public\.nachbereitung_verzicht/.test(mig) && /enable row level security/.test(mig) && /using \(public\.is_trainer\(\)\)/.test(mig)
    && /revoke all on public\.nachbereitung_verzicht from anon/.test(mig) && /unique \(autor, schluessel\)/.test(mig) && /from nachbereitung_verzicht v/.test(mig);
  if (!mH || !/"nachbereitung_verzicht"/.test(views)) probleme.push("h) " + JSON.stringify({ migration: mH, sicherung: /"nachbereitung_verzicht"/.test(views) }));
  zeilen.push("h) Migration (Tabelle, Zeilenschutz nur Trainer, kein Zugriff für anon, Push kennt abgelegte Termine), Sicherung kennt die Tabelle");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v766 Nachbereitung ablehnen: Nichts eintragen, je Trainer, im Tagebuch", !probleme.length, probleme.length ? probleme : zeilen);
};
