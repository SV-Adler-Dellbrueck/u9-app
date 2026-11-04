/* v787 · Trainer-App: Linien-Symbole statt Emoji (Charles 04.11.: „Alles bauen“) und „Erinnern“ direkt in der Startseiten-Karte
   a) Die sechs Startkacheln tragen ein SVG-Symbol (weiß), kein Emoji mehr
   b) Auf einer Kachelseite (Orga) tragen die Kacheln SVG-Symbole in der Familienfarbe, Kontrast ≥ 3:1 gegen die Kachel; eine Strichstärke
   c) Unbekanntes Zeichen fällt aufs Emoji zurück
   d) „N ohne Rückmeldung“-Karte hat einen Knopf „Erinnern“ (≥ 44 px, auf der Orga-Seite), der das Antippen der Karte nicht auslöst (stopPropagation) – nicht angetippt: Push geht an echte Familien */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [{ id: 1, datum: h.tagePlus(2), uhrzeit: "16:45", uhrzeit_ende: "18:00", typ: "training", titel: "Training", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, angemeldet: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [], rueckmeldungen: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const kr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    await loadKader(); go("home"); await w(2000);
    const out = {};
    const start = ["training", "spieltag", "team", "taktik", "elki", "orga"].map(k => document.querySelector(`#home-content button[onclick="kachelOpen('${k}')"]`));
    out.start = { da: start.filter(Boolean).length, svg: start.filter(b => b && b.querySelector("svg")).length, farbe: start[0] ? getComputedStyle(start[0].querySelector("svg")).color : null };
    kachelOpen("orga"); await w(1200); await homeRsvpNudge(); await w(600);
    const knopf = document.getElementById("home-rsvp-push");
    out.nudge = knopf ? { h: Math.round(knopf.getBoundingClientRect().height), stop: /stopPropagation/.test(knopf.getAttribute("onclick")), label: knopf.getAttribute("aria-label") } : null;
    const kn = [...document.querySelectorAll("button[onclick^=\"kachelRun\"]")].filter(b => b.getBoundingClientRect().height > 0);
    const mit = kn.filter(b => b.querySelector("svg"));
    out.orga = { gesamt: kn.length, svg: mit.length, emoji: kn.filter(b => !b.querySelector("svg")).map(b => b.textContent.trim().slice(0, 12)), kmin: mit.length ? Math.min(...mit.map(b => kr(getComputedStyle(b.querySelector("svg")).color, getComputedStyle(b).backgroundColor))) : 0, sw: [...new Set(mit.map(b => b.querySelector("svg").getAttribute("stroke-width")))] };
    out.ohne = [];
    for (const k of ["training", "spieltag", "team", "taktik", "elki", "orga"]) {
      kachelOpen(k); await w(700);
      document.querySelectorAll("button[onclick^=\"kachelRun\"]:not(.phase-zeile)").forEach(b => { if (b.getBoundingClientRect().height > 0 && !b.querySelector("svg") && !/^(\d|🔒)/.test(b.textContent.trim())) out.ohne.push(k + ":" + b.textContent.trim().slice(0, 14)); });
    }
    out.fallback = trSymbol("🦄") === "🦄" && /<svg/.test(trSymbol("🏃"));
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.start.da !== 6 || r.start.svg !== 6) probleme.push("a) Startkacheln: " + JSON.stringify(r.start));
  if (r.orga.emoji.length || r.orga.svg < 3 || r.orga.kmin < 3 || r.orga.sw.length > 1) probleme.push("b) Orga-Kacheln: " + JSON.stringify(r.orga));
  if (r.ohne.length) probleme.push("e) Kacheln ohne Symbol: " + r.ohne.join(" | "));
  if (!r.fallback) probleme.push("c) Rückfall");
  if (!r.nudge || r.nudge.h < 44 || !r.nudge.stop) probleme.push("d) Erinnern-Knopf: " + JSON.stringify(r.nudge));
  zeilen.push(`Start ${r.start.svg}/6 mit Symbol · Orga ${r.orga.svg} von ${r.orga.gesamt} (ohne: ${r.orga.emoji.join(", ") || "–"}), Kontrast ab ${r.orga.kmin.toFixed(1)}:1 · Erinnern ${r.nudge ? r.nudge.h + " px" : "fehlt"}`);
  return h.ergebnis("Trainer: Linien-Symbole in Kacheln, „Erinnern“ in der Rückmelde-Karte", !probleme.length, zeilen.concat(probleme));
};
