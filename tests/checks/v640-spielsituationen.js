/* v640 · PO: „Das aktuelle Taktikboard unterscheidet sich von der eigenen Übung unter Training.
   Sollten wir das vereinheitlichen?“ – Entscheidung: eine Zeichenfläche. Genutzt wird das Board
   zum Erklären von Situationen und fürs Taktik-Quiz der Kinder, sonst kaum.

   a) Die Taktik-Seite zeigt oben die Spielsituationen (KI, Spielformen, Liste); das alte Brett
      ist zu und öffnet über „Freies Brett“, der Knopf schließt es wieder.
   b) Vorlagen: ganzes Feld hochkant, Tore oben und unten, Rollen statt Namen, alles im Feld.
   c) „Neue Situation“ öffnet den Skizzen-Editor als „Spielsituation“; Übernehmen erfasst in
      taktik_templates mit formation „Spielsituation“ und data {typ:"skizze", spec} – ohne Namen.
   d) Liste: Vorschaubild, „Abspielen“ bei mehreren Bildern, Großansicht, Teilen, Bearbeiten (PATCH).
   e) KI: der Dienst bekommt den Vorsatz „SPIELSITUATION“ und „Kind n“ statt Namen; eine quer
      gelieferte Zeichnung wird hochkant in den Editor gelegt.
   f) Kinder-Quiz (?quiz): kein Hub, das alte Brett mit #taktik-field bleibt.
   g) 390 px: nichts ragt über den Rand, Knöpfe mindestens 44 px. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  let kiBody = null;
  const gespeichert = { id: 41, name: "Konter über links", created_at: "2026-09-20T10:00:00Z",
    data: { typ: "skizze", spec: { hoch: true, z: [[18, 24, 144, 232]], s: [[90, 200, "g", "A"], [60, 100, "r"]], b: [[90, 190]],
      schritte: [{ s: [[90, 150, "g", "A"], [60, 110, "r"]], b: [[90, 140]] }] } } };
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    taktik_templates: (u, req) => (req.method() === "GET" ? [gespeichert] : { status: 201, body: "[]" }),
    funktionen: { "ki-uebung": (u, req) => { try { kiBody = JSON.parse(req.postData() || "null"); } catch (e) {}
      return { uebungen: [{ titel: "x", skizze: { s: [[40, 90, "g", "A"], [200, 90, "r"]], b: [[50, 90]], p: [[50, 90, 190, 90, "p"]] } }] }; } } }) });
  const r = await s.page.evaluate(async K => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    try { await loadKader(); } catch (e) {}
    window.prompt = (t, v) => v; window.confirm = () => true;
    go("taktik"); await warte(900);
    for (let i = 0; i < 40 && !document.getElementById("sit-liste")?.querySelector(".sit-eintrag"); i++) await warte(50);
    const zu = el => !el || getComputedStyle(el).display === "none" || !el.getBoundingClientRect().height;
    const wrap = document.querySelector("#view-taktik>.tb-wrap");
    // a) Hub oben, altes Brett zu
    out.a = { hub: !zu(document.getElementById("sit-ki-text")), altZu: zu(wrap), kopfZu: zu(document.querySelector("#view-taktik>.tb-kopf")),
      formen: [...document.querySelectorAll(".sit-form")].map(b => b.textContent.trim()) };
    sitAltUmschalten(); await warte(80);
    out.a.altAuf = !zu(wrap) && !zu(document.getElementById("taktik-field")); out.a.kiWeg = zu(document.getElementById("sit-ki-text"));
    out.a.knopf = document.getElementById("sit-alt-knopf").textContent.trim();
    sitAltUmschalten(); await warte(80);
    out.a.wiederZu = zu(wrap) && !zu(document.getElementById("sit-ki-text"));
    // b) Vorlagen
    const drin = sp => (sp.s || []).every(p => p[0] >= 0 && p[0] <= 180 && p[1] >= 0 && p[1] <= 280);
    const v4 = sitVorlage("4+1"), vf = sitVorlage("funino"), v5 = sitVorlage("5+1");
    out.b = { v4: { hoch: v4.hoch, s: v4.s.length, tw: v4.s.find(p => p[3] === "TW")?.[2], tore: v4.tor.length, jugend: v4.tor.every(t => t[4] === "j"), mitte: v4.li.some(l => l[4] === "m"), drin: drin(v4), labels: v4.s.map(p => p[3]) },
      funino: { s: vf.s.length, tore: vf.tor.length, sz: vf.li.filter(l => l[4] === "sz").length, drin: drin(vf) }, v5: { s: v5.s.length, drin: drin(v5) } };
    // c) Neue Situation → Editor → erfassen
    sitNeu("4+1"); await warte(80);
    const mod = document.getElementById("skz-modal");
    out.c = { editor: !!mod, titel: mod?.getAttribute("aria-label"), kopf: mod?.querySelector(".mdl-titel")?.textContent };
    skzSpeichern(); await warte(300);
    // d) Liste
    const e = document.querySelector("#sit-liste .sit-eintrag");
    out.d = { eintrag: !!e, svg: !!e?.querySelector(".sit-bild svg"), knoepfe: e ? [...e.querySelectorAll("button")].map(b => b.textContent.trim()) : [],
      teilen: !!e?.querySelector(".skz-teilen") };
    sitGross(41); await warte(120);
    out.d.gross = !!document.getElementById("skz-gross-modal"); out.d.grossName = document.querySelector("#skz-gross-modal")?.getAttribute("aria-label");
    if (typeof skzGrossClose === "function") skzGrossClose();
    sitBearbeiten(41); await warte(80);
    out.d.bearbeiten = !!document.getElementById("skz-modal");
    skzSpeichern(); await warte(300);
    // e) KI
    document.getElementById("sit-ki-text").value = K[0] + " dribbelt links, der Gegner kommt von vorn, wir spielen quer.";
    await sitKiAuswerten(); await warte(150);
    out.e = { editor: !!document.getElementById("skz-modal"), hoch: !!(_skzSpec && _skzSpec.hoch), stand: document.getElementById("sit-ki-stand").textContent };
    document.getElementById("skz-modal")?.remove();
    // g) Breite und Knopfhöhen am Handy
    const view = document.getElementById("view-taktik");
    out.g = { breiter: [...view.querySelectorAll("*")].filter(x => !zu(x) && x.getBoundingClientRect().right > innerWidth + 1).map(x => x.id || x.className).slice(0, 3),
      klein: [...document.querySelectorAll("#sit-hub button")].filter(b => !zu(b) && b.getBoundingClientRect().height < 44).map(b => b.textContent.trim()).slice(0, 3) };
    return out;
  }, K);
  const gesendet = s.gesendet.filter(x => /taktik_templates/.test(x.pfad));
  const fe = s.fehler(); await s.schliessen();

  // f) Kinder-Quiz
  const q = await h.starten({ start: "/trainer/index.html?quiz", supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const rq = await q.page.evaluate(async () => {
    await new Promise(x => setTimeout(x, 600));
    const hub = document.getElementById("sit-hub");
    return { hubZu: !hub || getComputedStyle(hub).display === "none", feld: !!document.getElementById("taktik-field"),
      quiz: typeof tqStart === "function", panel: getComputedStyle(document.getElementById("tq-panel")).display };
  });
  const qfe = q.fehler(); await q.schliessen();

  const a = r.a;
  if (!a.hub || !a.altZu || !a.kopfZu) probleme.push("a) Seite öffnet nicht mit den Spielsituationen: " + JSON.stringify(a));
  if (a.formen.length !== 4) probleme.push("a) Spielformen: " + a.formen.join(" / "));
  if (!a.altAuf || !a.kiWeg || !/schließen/.test(a.knopf) || !a.wiederZu) probleme.push("a) Freies Brett öffnet/schließt nicht: " + JSON.stringify(a));
  const b = r.b;
  if (!b.v4.hoch || b.v4.s !== 5 || b.v4.tw !== "b" || b.v4.tore !== 2 || !b.v4.jugend || !b.v4.mitte || !b.v4.drin) probleme.push("b) 4+1-Vorlage: " + JSON.stringify(b.v4));
  if (b.v4.labels.some(l => K.some(k => k.startsWith(l) && l.length > 2))) probleme.push("b) Vorlage trägt Namen: " + b.v4.labels.join(","));
  if (b.funino.s !== 3 || b.funino.tore !== 4 || b.funino.sz !== 2 || !b.funino.drin) probleme.push("b) FUNiño-Vorlage: " + JSON.stringify(b.funino));
  if (b.v5.s !== 6 || !b.v5.drin) probleme.push("b) 5+1-Vorlage: " + JSON.stringify(b.v5));
  if (!r.c.editor || r.c.titel !== "Spielsituation" || r.c.kopf !== "Spielsituation") probleme.push("c) Editor: " + JSON.stringify(r.c));
  const post = gesendet.find(x => x.methode === "POST");
  if (!post || post.body.formation !== "Spielsituation" || post.body.data?.typ !== "skizze" || !post.body.data?.spec?.hoch || (post.body.data.spec.s || []).length !== 5)
    probleme.push("c) erfasst nicht als Spielsituation: " + JSON.stringify(post && post.body).slice(0, 200));
  if (gesendet.some(x => K.some(k => JSON.stringify(x.body || "").includes(k)))) probleme.push("c) Kindername geht an taktik_templates");
  const d = r.d;
  if (!d.eintrag || !d.svg || !d.teilen) probleme.push("d) Eintrag ohne Bild/Teilen: " + JSON.stringify(d));
  ["Abspielen", "Bearbeiten", "Umbenennen", "Löschen"].forEach(t => { if (!d.knoepfe.some(x => x.includes(t))) probleme.push(`d) „${t}“ fehlt`); });
  if (!d.gross || !/Konter über links/.test(d.grossName || "")) probleme.push("d) Großansicht: " + JSON.stringify([d.gross, d.grossName]));
  const patch = gesendet.find(x => x.methode === "PATCH");
  if (!d.bearbeiten || !patch || !/id=eq\.41/.test(patch.suche) || patch.body.data?.typ !== "skizze") probleme.push("d) Bearbeiten speichert nicht: " + JSON.stringify(patch && patch.suche));
  const kt = String(kiBody && kiBody.text || "");
  if (!/^SPIELSITUATION/.test(kt) || kt.includes(K[0]) || !/Kind \d/.test(kt) || kiBody.modus !== "text") probleme.push("e) KI-Anfrage: " + kt.slice(0, 160));
  if (!r.e.editor || !r.e.hoch) probleme.push("e) KI-Zeichnung nicht hochkant im Editor: " + JSON.stringify(r.e));
  if (!rq.hubZu || !rq.feld || !rq.quiz) probleme.push("f) Kinder-Quiz: " + JSON.stringify(rq));
  if (r.g.breiter.length) probleme.push("g) ragt über den Rand: " + r.g.breiter.join(", "));
  if (r.g.klein.length) probleme.push("g) Knöpfe unter 44 px: " + r.g.klein.join(", "));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (qfe.length) probleme.push("Konsole Quiz: " + qfe.slice(0, 2).join(" | "));
  zeilen.push(`Spielformen ${a.formen.join(" · ")} · 4+1 ${b.v4.labels.join(",")}`, `Liste: ${d.knoepfe.join(" · ")}`, `KI bekommt: ${kt.slice(0, 90)}…`);
  return h.ergebnis("v640 Spielsituationen auf der gemeinsamen Zeichenfläche", !probleme.length, probleme.concat(zeilen));
};
