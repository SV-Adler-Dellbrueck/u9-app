/* v928 · Adler-Schule: Kinderfragen nach den Leitfragen 1–6 (Auftragspaket doku/auftrag-adler-schule, Charles 21.11.2026).

   Neben dem Steine-Schieben des Taktik-Quiz drei Fragearten – tippen, A oder B, Szene – und je Leitfrage vier
   Merkkarten. Die Fragen liegen in uebungen/kinderfragen.json (frisch beim Öffnen, letzte Fassung im Gerät).
   a) Schema je Typ: 2 Bilder, 3 Optionen, richtig im Bereich, Ziele im Feld, kein Stein im Zielkreis, ziel_spieler
      zeigt auf einen eigenen Stein; keine geraden Anführungszeichen, keine Großfeld-Wörter; id eindeutig; je
      Leitfrage 10 Fragen und 4 Merkkarten; bild_aus verweist auf eine Frage derselben Leitfrage, bild_index = richtig.
   b) Kabine: Kachel „Adler-Schule“ öffnet sechs Blöcke mit der Leitfrage als Überschrift; die Stufe (U8/U9/U10)
      steht nirgends in der Oberfläche.
   c) lf6-01: zwei vergrößerte Bilder; nach dem Tippen ist B mit ✓ und Rahmen markiert.
   d) lf6-03: Tipp links außen = richtig, Tipp in die Mitte = falsch mit Lösungskreis.
   e) lf6-04: die Szene bewegt Ball und Gegner, „Nochmal ansehen“ spielt sie neu, drei Antworten in wechselnder Reihenfolge.
   f) lf4-01: Tipp auf den freien Mitspieler rechts = richtig, auf den gedeckten = falsch.
   g) 360 × 740: jede Frageart ohne Scrollen bedienbar, Antwortflächen ≥ 56 px, Schrift ≥ 11,5 px (Text der Oberfläche; die
      Kürzel in den Steinen sind Teil der Zeichnung und skalieren mit ihr); dunkel lesbar.
   h) Eine richtig beantwortete Frage bringt beim zweiten Mal keine Federn mehr (ein Aufruf je Frage).
   i) Merkkarten: Block zeigt „Anschauen“ mit vier Karten; mk6-1 zeigt das richtige Bild B aus lf6-01 und den
      Merksatz; nach falscher Antwort auf lf6-01 öffnet „Zeig's mir“ genau diese Karte. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  // a) Daten
  const datei = path.join(h.REPO, "uebungen", "kinderfragen.json");
  let J = null;
  try { J = JSON.parse(fs.readFileSync(datei, "utf8")); } catch (e) { return h.ergebnis("v928 Adler-Schule", false, ["uebungen/kinderfragen.json fehlt oder ist kein JSON: " + e.message]); }
  const F = J.fragen || [], M = J.merkkarten || [], byId = {}, a = [];
  F.forEach(f => {
    if (byId[f.id]) a.push(f.id + ": id doppelt"); byId[f.id] = f;
    const tx = JSON.stringify([f.frage, f.erklaerung, f.optionen || []]);
    if (/'/.test(tx) || /[^\\]\\"/.test(tx.replace(/^\[|\]$/g, "").replace(/","/g, ""))) a.push(f.id + ": gerade Anführungszeichen");
    if (/Strafraum|Pfosten|Flanke|Einwurf|Eckstoß|Schiri|Schiedsrichter/i.test(tx)) a.push(f.id + ": Großfeld-Wort");
    if (!["U8", "U9", "U10"].includes(f.stufe)) a.push(f.id + ": stufe " + f.stufe);
    if (!["3+1", "funino", "4+1"].includes(f.feld)) a.push(f.id + ": feld " + f.feld);
    if (f.typ === "ab") { if ((f.bilder || []).length !== 2) a.push(f.id + ": nicht genau 2 Bilder"); if (![0, 1].includes(f.richtig)) a.push(f.id + ": richtig außerhalb"); }
    else if (f.typ === "szene") { if ((f.optionen || []).length !== 3) a.push(f.id + ": nicht genau 3 Optionen"); if (!(f.richtig >= 0 && f.richtig < 3)) a.push(f.id + ": richtig außerhalb"); }
    else if (f.typ === "tippen") {
      if (f.ziele) f.ziele.forEach(z => { if (z.x < 0 || z.x > 100 || z.y < 0 || z.y > 100) a.push(f.id + ": Ziel außerhalb"); (f.spieler || []).forEach(s => { if (Math.hypot(s.x - z.x, s.y - z.y) < z.r) a.push(f.id + ": Stein im Zielkreis"); }); });
      else if (!(f.spieler || [])[f.ziel_spieler] || f.spieler[f.ziel_spieler].seite !== "wir") a.push(f.id + ": ziel_spieler ist kein eigener Stein");
    } else a.push(f.id + ": unbekannter Typ " + f.typ);
  });
  for (let lf = 1; lf <= 6; lf++) {
    const n = F.filter(f => f.leitfrage === lf).length, m = M.filter(k => k.leitfrage === lf).length;
    if (n !== 10) a.push(`Leitfrage ${lf}: ${n} Fragen statt 10`); if (m !== 4) a.push(`Leitfrage ${lf}: ${m} Merkkarten statt 4`);
  }
  M.forEach(k => { const f = byId[k.bild_aus]; if (!f) a.push(k.id + ": bild_aus fehlt"); else { if (f.leitfrage !== k.leitfrage) a.push(k.id + ": andere Leitfrage"); if (f.typ === "ab" && k.bild_index !== f.richtig) a.push(k.id + ": bild_index passt nicht zu richtig"); } if (/'/.test(k.merksatz)) a.push(k.id + ": gerades Anführungszeichen"); });
  probleme.push(...a.map(x => "a) " + x).slice(0, 8));

  let xpAufrufe = 0;
  const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 360, hoehe: 740, warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), rpc: { xp_award_event: (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} if (b.p_quelle_id === "as-lf6-01") xpAufrufe++; return 5; } } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    if (typeof kfStart !== "function") return { fehlt: "kfStart" };
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    localStorage.setItem("adler_quiz_tutorial_done", "1");
    tqPlayer = "Kind A"; tqStart(); await w(50);
    out.kachel = !!document.getElementById("kf-launcher");
    await kfStart(); await w(50);
    const panel = () => document.getElementById("tq-panel");
    out.bloecke = [...document.querySelectorAll("#kf-bloecke [onclick^='kfBlock']")].map(x => x.textContent.replace(/\s+/g, " ").trim());
    const stufeSichtbar = [];
    const pruefStufe = wo => { if (/\bU(8|9|10)\b/.test(panel().textContent)) stufeSichtbar.push(wo); };
    pruefStufe("Übersicht");
    // i) Block mit Anschauen
    kfBlock(6); await w(30);
    out.anschauen = (document.getElementById("kf-anschauen") || {}).textContent || "";
    const zeige = id => { const f = KF_DATEN.fragen.find(x => x.id === id); kfLf = f.leitfrage; kfFragen = [f]; kfIdx = 0; kfScore = 0; kfTotal = 0; kfFrage(); return f; };
    const mass = () => {
      const p = panel().getBoundingClientRect();
      const flaechen = [...panel().querySelectorAll(".kf-wahl,.kf-opt,#kf-pruefen")].map(b => Math.round(b.getBoundingClientRect().height));
      const schrift = [...panel().querySelectorAll(".kf-panel *")].filter(e => !e.closest("svg") && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden")
        .map(e => parseFloat(getComputedStyle(e).fontSize));
      return { unten: Math.round(p.bottom), fenster: innerHeight, flaechen, minSchrift: Math.min(...schrift) };
    };
    // c) A oder B
    const f1 = zeige("lf6-01"); await w(30); pruefStufe("lf6-01");
    out.ab = { mass: mass(), bilder: panel().querySelectorAll(".kf-wahl svg").length, ausschnitt: [...panel().querySelectorAll(".kf-wahl svg")].map(x => x.getAttribute("viewBox")).every(v => !/^0 0 /.test(v)) };
    kfAbWahl(1); await w(30);
    const b = panel().querySelector('.kf-wahl[data-i="1"]');
    out.ab.markiert = { text: b.textContent.replace(/\s+/g, " ").trim(), rand: getComputedStyle(b).borderTopWidth, punkte: kfScore };
    // h) zweites Mal richtig
    zeige("lf6-01"); await w(20); kfAbWahl(1); await w(300);
    // i) falsch → Zeig's mir
    zeige("lf6-01"); await w(20); kfAbWahl(0); await w(30);
    const zeig = document.getElementById("kf-zeig");
    out.zeig = !!zeig; if (zeig) zeig.click(); await w(200);
    const ov = document.getElementById("kf-karten");
    if (ov) {
      const bahn = ov.querySelector("#kf-karten-bahn"), karten = [...ov.querySelectorAll(".kf-karte")];
      const sichtbar = karten.find(k => Math.abs(k.getBoundingClientRect().left - bahn.getBoundingClientRect().left) < 5);
      out.karte = { zahl: karten.length, id: sichtbar && sichtbar.dataset.id, merksatz: sichtbar && sichtbar.querySelector(".kf-merksatz").textContent,
        bild: sichtbar && sichtbar.querySelector("svg").innerHTML, dialog: ov.getAttribute("role") === "dialog" && ov.getAttribute("aria-modal") === "true" };
      // Gegenstück: dasselbe Bild B direkt gezeichnet
      out.karte.soll = (() => { const d = document.createElement("div"); d.innerHTML = kfSvg(f1.feld, f1.bilder[1], { breite: 220, kennung: "mk-mk6-1" }); return d.querySelector("svg").innerHTML; })();
      ov.remove();
    }
    // d) tippen – Koordinaten für die Klicks von außen
    const punkt = (xp, yp) => { const svg = document.querySelector("#kf-feld svg"), m = svg.getScreenCTM(), pt = svg.createSVGPoint(); pt.x = 18 + xp * 1.44; pt.y = 24 + yp * 2.32; const c = pt.matrixTransform(m); return { x: c.x, y: c.y }; };
    const f3 = zeige("lf6-03"); await w(30); pruefStufe("lf6-03");
    out.tip = { mass: mass(), ziel: f3.ziele[0], links: punkt(f3.ziele[0].x, f3.ziele[0].y), mitte: punkt(50, 50) };
    const f4 = zeige("lf4-01"); await w(30);
    out.frei = { rechts: punkt(f4.spieler[3].x, f4.spieler[3].y), gedeckt: punkt(f4.spieler[1].x, f4.spieler[1].y) };
    // e) Szene
    const f5 = zeige("lf6-04"); await w(2200); pruefStufe("lf6-04");
    const tr = () => [...document.querySelectorAll("#kf-feld .kf-stein,#kf-feld .kf-ball")].map(g => g.style.transform).filter(Boolean).length;
    out.szene = { mass: mass(), bewegt: tr(), optionen: document.querySelectorAll(".kf-opt").length, sichtbar: getComputedStyle(document.getElementById("kf-optionen")).visibility };
    kfSzeneSpielen(); out.szene.nachNochmal = tr(); await w(100); out.szene.nachNochmal2 = tr();
    const ordnungen = new Set(); for (let i = 0; i < 12; i++) { zeige("lf6-04"); ordnungen.add(kfOptOrdnung.join("")); }
    out.szene.ordnungen = ordnungen.size;
    out.stufeSichtbar = stufeSichtbar;
    return out;
  });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v928 Adler-Schule", false, probleme.concat([r.fehlt + " fehlt"])); }
  // Klicks mit der Maus: tippen
  const page = s.page;
  const tippe = async (id, p) => { await page.evaluate(id => { const f = KF_DATEN.fragen.find(x => x.id === id); kfLf = f.leitfrage; kfFragen = [f]; kfIdx = 0; kfScore = 0; kfTotal = 0; kfFrage(); }, id); await page.waitForTimeout(30);
    await page.mouse.click(p.x, p.y); await page.click("#kf-pruefen"); await page.waitForTimeout(30);
    return page.evaluate(() => ({ punkte: kfScore, loesung: document.querySelectorAll("#kf-feld .kf-loes").length, text: (document.getElementById("kf-feedback") || {}).textContent || "" })); };
  const tL = await tippe("lf6-03", r.tip.links), tM = await tippe("lf6-03", r.tip.mitte);
  const fR = await tippe("lf4-01", r.frei.rechts), fG = await tippe("lf4-01", r.frei.gedeckt);
  // g) dunkel
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(h.kontrastHelfer);
  const dunkel = await page.evaluate(() => { const f = KF_DATEN.fragen.find(x => x.id === "lf6-04"); kfFragen = [f]; kfIdx = 0; kfFrage();
    return [".kf-frage", ".kf-opt"].map(sel => { const e = document.querySelector(sel); return e ? window.__kontrastVon(e) : 0; }); });
  const fe = s.fehler();
  await s.schliessen();

  if (!r.kachel) probleme.push("b) Kachel „Adler-Schule“ fehlt in der Quiz-Auswahl");
  if (r.bloecke.length !== 6 || !/Wie behalte ich den Ball/.test(r.bloecke[0]) || !/Wie hole ich mir den Ball zurück/.test(r.bloecke[5])) probleme.push(`b) Blöcke: ${JSON.stringify(r.bloecke.map(x => x.slice(0, 40)))}`);
  if (r.stufeSichtbar.length) probleme.push("b) Stufe sichtbar in: " + r.stufeSichtbar.join(", "));
  if (r.ab.bilder !== 2 || !r.ab.ausschnitt) probleme.push(`c) lf6-01: ${r.ab.bilder} Bilder, vergrößert: ${r.ab.ausschnitt}`);
  if (!/✓/.test(r.ab.markiert.text) || parseFloat(r.ab.markiert.rand) < 3 || r.ab.markiert.punkte !== 1) probleme.push(`c) B nach dem Tippen: „${r.ab.markiert.text}“, Rand ${r.ab.markiert.rand}, Punkte ${r.ab.markiert.punkte}`);
  if (!(tL.punkte === 1 && tM.punkte === 0 && tM.loesung >= 1)) probleme.push(`d) lf6-03: links ${tL.punkte} Punkt, Mitte ${tM.punkte} Punkt, Lösungskreis ${tM.loesung}`);
  if (!(r.szene.bewegt >= 2 && r.szene.optionen === 3 && r.szene.sichtbar === "visible")) probleme.push(`e) lf6-04: ${r.szene.bewegt} bewegt, ${r.szene.optionen} Antworten (${r.szene.sichtbar})`);
  if (!(r.szene.nachNochmal === 0 && r.szene.nachNochmal2 >= 2)) probleme.push(`e) „Nochmal ansehen“ spielt nicht neu (${r.szene.nachNochmal} → ${r.szene.nachNochmal2})`);
  if (r.szene.ordnungen < 2) probleme.push("e) Die Antworten stehen immer in derselben Reihenfolge");
  if (!(fR.punkte === 1 && fG.punkte === 0)) probleme.push(`f) lf4-01: frei rechts ${fR.punkte}, gedeckt ${fG.punkte}`);
  for (const [n, m] of [["A oder B", r.ab.mass], ["tippen", r.tip.mass], ["Szene", r.szene.mass]]) {
    if (m.unten > m.fenster) probleme.push(`g) ${n}: Frage endet bei ${m.unten} px, Bildschirm ${m.fenster} px – muss gescrollt werden`);
    if (m.flaechen.some(x => x < 56)) probleme.push(`g) ${n}: Antwortfläche ${Math.min(...m.flaechen)} px hoch`);
    if (m.minSchrift < 11.5) probleme.push(`g) ${n}: Schrift ${m.minSchrift} px`);
  }
  if (dunkel.some(k => k < 4.5)) probleme.push(`g) dunkel: Kontrast ${dunkel.map(k => k.toFixed ? k.toFixed(1) : k).join("/")}`);
  if (xpAufrufe !== 1) probleme.push(`h) ${xpAufrufe} Federn-Aufrufe für zweimal richtig auf lf6-01 – erwartet genau einer`);
  if (!/Erst anschauen\s*4 Bilder/.test(r.anschauen.replace(/\s+/g, " "))) probleme.push(`i) Block zeigt „${r.anschauen}“ statt „Erst anschauen · 4 Bilder“ (v938)`);
  if (!r.zeig || !r.karte) probleme.push("i) Nach falscher Antwort fehlt „Zeig's mir“ oder es öffnet nichts");
  else {
    if (r.karte.id !== "mk6-1") probleme.push(`i) „Zeig's mir“ öffnet ${r.karte.id} statt mk6-1`);
    if (r.karte.bild !== r.karte.soll) probleme.push("i) mk6-1 zeigt nicht das richtige Bild B aus lf6-01");
    if (!r.karte.merksatz || !r.karte.dialog || r.karte.zahl !== 4) probleme.push(`i) Karten: ${r.karte.zahl}, Merksatz „${r.karte.merksatz}“, Dialog ${r.karte.dialog}`);
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!probleme.length) zeilen.push(`${F.length} Fragen, ${M.length} Merkkarten geprüft · 6 Blöcke · A/B ✓ mit Rand · Tippen links ✓, Mitte ✗ mit Lösung · Szene bewegt ${r.szene.bewegt}, ${r.szene.ordnungen} Reihenfolgen · frei ✓, gedeckt ✗ · ohne Scrollen (${r.ab.mass.unten}/${r.tip.mass.unten}/${r.szene.mass.unten} px von ${r.ab.mass.fenster}) · Federn 1× · Zeig's mir → mk6-1`);
  return h.ergebnis("v928 Adler-Schule: drei Fragearten, Merkkarten, Federn je Frage einmal", !probleme.length, zeilen.concat(probleme));
};
