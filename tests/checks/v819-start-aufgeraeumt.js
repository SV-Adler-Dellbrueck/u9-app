/* v819 · Trainer-Start aufgeräumt (Durchsicht 09.11.2026).
   Am Handy (390 px) belegten Kopf, Schriftfrage und Push-Hinweis rund 370 px, bevor der erste
   Inhalt kam: vier Knöpfe im Kopf ließen „Trainerstab · U9 I“ auf drei Zeilen umbrechen, zwei
   Hinweise standen übereinander, und sechs Kacheln wiederholten die Leiste unten.

   a) Kopf: sichtbar sind nur Team-Chat und „⋯“ (beide mind. 44 px); die Unterzeile bleibt einzeilig.
   b) „⋯“ öffnet Hilfe, Schrift und Hell/Dunkel (mind. 44 px, aria-expanded stimmt) und schließt wieder.
   c) Keine Bereichs-Kacheln mehr; „Diese Woche“ beginnt im ersten Bildschirm; die Leiste unten
      führt weiter in alle sechs Bereiche.
   d) Nur ein Hinweis gleichzeitig: steht die Push-Karte, wartet die Schriftfrage – und sie gilt
      dadurch nicht als beantwortet.
   e) Der Rundgang zeigt für „Hilfe und Schrift“ auf einen sichtbaren Knopf. */
"use strict";
module.exports = async function (h) {
  const titel = "v819 Trainer-Start aufgeräumt: Kopf mit „⋯“, ein Hinweis, Woche ganz oben";
  const probleme = [], zeilen = [];
  const termine = [{ id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const sichtbar = el => { if (!el) return false; const b = el.getBoundingClientRect(); if (b.width <= 0 || b.height <= 0) return false;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return false; } return true; };
    const mass = el => { const b = el.getBoundingClientRect(); return Math.round(Math.min(b.width, b.height)); };
    if (typeof kopfMenueUmschalten !== "function") return { alt: true };
    try { localStorage.removeItem("adler_schrift_hinweis"); localStorage.removeItem("adler_schrift"); localStorage.removeItem("adler_onboarded"); } catch (e) {}
    await loadKader(); go("home"); await w(1200);
    const out = {};
    const bar = document.querySelector("#main-app > .topbar");
    // a)
    out.kopfSichtbar = [...bar.querySelectorAll("button")].filter(sichtbar).map(b => (b.id || b.className) + "@" + mass(b));
    const t2 = document.getElementById("topbar-sub"), cs = getComputedStyle(t2);
    out.t2Zeilen = Math.round(t2.getBoundingClientRect().height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4));
    out.t2Text = t2.textContent.trim();
    // b)
    const knopf = document.getElementById("kopf-menue-knopf");
    knopf.click(); await w(100);
    out.offen = { exp: knopf.getAttribute("aria-expanded"), drin: ["#help-btn", ".schrift-toggle", "#theme-toggle"].map(q => { const e = bar.querySelector(q); return sichtbar(e) ? mass(e) : 0; }) };
    knopf.click(); await w(100);
    out.zu = { exp: knopf.getAttribute("aria-expanded"), drin: ["#help-btn", ".schrift-toggle", "#theme-toggle"].filter(q => sichtbar(bar.querySelector(q))).length };
    // c)
    document.querySelectorAll("#push-hinweis, .schrift-hinweis").forEach(e => e.remove());
    await w(50); window.scrollTo(0, 0);
    const woche = document.getElementById("home-woche");
    out.kacheln = !!document.getElementById("home-bereiche");
    out.wocheOben = woche ? Math.round(woche.getBoundingClientRect().top) : -1;
    out.wocheHoehe = woche ? Math.round(woche.getBoundingClientRect().height) : 0;
    out.leiste = [...document.querySelectorAll("nav button, .tabbar button, .bottom-nav button, [role=tablist] button")].filter(sichtbar).map(b => b.textContent.trim());
    // d)
    window.pushKartenFall = async () => "gesperrt";
    try { localStorage.removeItem(PUSH_KARTE_KEY); } catch (e) {}
    schriftHinweisZeigen("schrift-hinweis-trainer");
    out.schriftAllein = !!document.querySelector(".schrift-hinweis");
    await pushKarteRender("push-hinweis-slot-trainer", "trainer");
    out.beide = { push: !!document.getElementById("push-hinweis"), schrift: !!document.querySelector(".schrift-hinweis") };
    schriftHinweisZeigen("schrift-hinweis-trainer");
    out.schriftNeben = !!document.querySelector(".schrift-hinweis");
    out.gemerkt = localStorage.getItem("adler_schrift_hinweis");
    document.getElementById("push-hinweis").remove();
    schriftHinweisZeigen("schrift-hinweis-trainer");
    out.schriftDanach = !!document.querySelector(".schrift-hinweis");
    // e)
    const schritt = (typeof TOUR !== "undefined" ? TOUR : []).find(x => /Hilfe/.test(x.t));
    out.tour = schritt ? schritt.sel.map(q => sichtbar(document.querySelector(q))) : null;
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["kein Kopf-Menü (Stand vor v819)"]);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));

  const ids = r.kopfSichtbar.map(x => x.split("@")[0]);
  if (ids.join(",") !== "rufe-kopf,kopf-menue-knopf") probleme.push("a) sichtbare Knöpfe im Kopf: " + r.kopfSichtbar.join(", "));
  if (r.kopfSichtbar.some(x => Number(x.split("@")[1]) < 44)) probleme.push("a) Kopf-Knopf unter 44 px: " + r.kopfSichtbar.join(", "));
  if (r.t2Zeilen !== 1) probleme.push(`a) „${r.t2Text}“ läuft über ${r.t2Zeilen} Zeilen`);
  if (r.offen.exp !== "true" || r.offen.drin.some(x => x < 44)) probleme.push(`b) Menü offen: aria-expanded ${r.offen.exp}, Maße ${r.offen.drin.join("/")}`);
  if (r.zu.exp !== "false" || r.zu.drin) probleme.push(`b) Menü schließt nicht: aria-expanded ${r.zu.exp}, ${r.zu.drin} Knöpfe sichtbar`);
  if (r.kacheln) probleme.push("c) die Bereichs-Kacheln stehen wieder auf der Startseite");
  if (r.wocheOben < 0 || r.wocheOben > 320 || r.wocheHoehe < 60) probleme.push(`c) „Diese Woche“ beginnt bei ${r.wocheOben} px (Höhe ${r.wocheHoehe})`);
  for (const n of ["Training", "Spieltag", "Team", "Taktik", "Eltern", "Orga"]) if (!r.leiste.some(t => t.indexOf(n) >= 0)) probleme.push("c) Leiste unten ohne „" + n + "“");
  if (!r.schriftAllein) probleme.push("d) Schriftfrage erscheint nicht, obwohl kein anderer Hinweis steht");
  if (!r.beide.push || r.beide.schrift) probleme.push(`d) Push-Karte ${r.beide.push}, Schriftfrage daneben ${r.beide.schrift}`);
  if (r.schriftNeben) probleme.push("d) Schriftfrage erscheint neben der Push-Karte");
  if (r.gemerkt) probleme.push("d) die verdrängte Schriftfrage gilt als beantwortet");
  if (!r.schriftDanach) probleme.push("d) Schriftfrage kommt nicht wieder, wenn die Push-Karte weg ist");
  if (!r.tour || !r.tour.some(Boolean)) probleme.push("e) Rundgang „Hilfe und Schrift“ zeigt auf kein sichtbares Element");

  zeilen.push(`Kopf: ${r.kopfSichtbar.join(", ")} · Unterzeile ${r.t2Zeilen} Zeile · Menü ${r.offen.drin.join("/")} px · „Diese Woche“ ab ${r.wocheOben} px · Leiste: ${r.leiste.join(", ")}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
