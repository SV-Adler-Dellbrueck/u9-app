/* v971 · Festival: Aufwärmen wählbar (Charles 26.11.2026): „Wenn vor uns ein anderes Turnier läuft, sind nicht alle Plätze zum
   Warmmachen verfügbar … auswählen können, ob wir jedem Team einen Platz zum Aufwärmen zuweisen oder den Part komplett weglassen.“
   Wortlaut nach Wahl: „Nur Hinweis, kein Ort“.
   a) Planer: Wahl „Jedes Team bekommt ein Feld“ / „Kein Feld – vor uns läuft ein Turnier“ (aria-pressed, ≥ 44 px); Umschalten
      speichert config.aufwaermen „keins“
   b) „felder“ (und ohne Angabe): wie bisher – Liste in Planer, Gast-Seite und Info-Blatt (v495)
   c) „keins“: keine Aufwärm-Liste; Gast-Seite und Info-Blatt zeigen unter „Gut zu wissen“ den Hinweissatz vor den Infos;
      cfg.infos selbst bleibt unverändert; der Planer sagt „kein Feld zugewiesen“ */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute(), patches = [];
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [],
    heimturnier: (u, req) => { if (req.method() === "PATCH") { patches.push(JSON.parse(req.postData() || "{}")); return { status: 204, body: "" }; } return []; } }) });
  const r = await s.page.evaluate(async ({ heute }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof fstAufwWahlHtml !== "function"; i++) await w(100);
    if (typeof fstAufwWahlHtml !== "function") return { fehlt: true };
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Gast Eins", kinder: 10, teams: 2 }, { name: "SV Gast Zwei", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine, infos: "☕ Kaffee steht bereit" };
    const row = aufw => ({ id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: Object.assign({}, cfg, aufw ? { aufwaermen: aufw } : {}), teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) });
    const sieh = async rw => {
      const wrap = document.createElement("div"); document.body.appendChild(wrap);
      _htPub = { slug: "x", code: "", wrap, row: rw }; _fstUhrMarke = "";
      _fstPublicRender(wrap, rw); await w(60);
      const gast = wrap.textContent.replace(/\s+/g, " "); wrap.remove();
      fstInfoOpen(); const b = document.getElementById("fst-info"); const info = b ? b.textContent.replace(/\s+/g, " ") : ""; b?.remove(); _htPub = null;
      let body = document.getElementById("ht-body"); if (!body) { body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body); }
      _HT = JSON.parse(JSON.stringify(rw)); fstRender(); await w(60);
      const planer = body.textContent.replace(/\s+/g, " ");
      const kn = [...body.querySelectorAll("#fst-aufw .seg-btn")].map(b => ({ t: b.textContent.trim(), an: b.getAttribute("aria-pressed"), h: b.getBoundingClientRect().height }));
      return { liste: fstAufwaermen(rw).length, gast, info, planer, kn };
    };
    const o = { ohne: await sieh(row(null)), felder: await sieh(row("felder")), keins: await sieh(row("keins")) };
    // a) Umschalten im Planer
    _HT = JSON.parse(JSON.stringify(row(null))); fstRender(); await w(60);
    const k = [...document.querySelectorAll("#fst-aufw .seg-btn")].find(b => /Kein Feld/.test(b.textContent));
    if (k) k.click(); await w(400);
    o.nachKlick = { cfg: _HT.config.aufwaermen, infos: _HT.config.infos, an: [...document.querySelectorAll("#fst-aufw .seg-btn")].map(b => b.getAttribute("aria-pressed")).join() };
    o.satz = FST_AUFW_KEINS;
    return o;
  }, { heute });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("fstAufwWahlHtml fehlt");
  else {
    const kn = r.ohne.kn;
    if (kn.length !== 2 || kn[0].t !== "Jedes Team bekommt ein Feld" || !/Kein Feld – vor uns läuft ein Turnier/.test(kn[1].t) || kn[0].an !== "true" || kn[1].an !== "false" || kn.some(x => x.h < 44))
      probleme.push("a) Wahl: " + JSON.stringify(kn));
    const p = patches[patches.length - 1] || {};
    if (!p.config || p.config.aufwaermen !== "keins" || r.nachKlick.cfg !== "keins" || r.nachKlick.an !== "false,true" || r.nachKlick.infos !== "☕ Kaffee steht bereit") probleme.push("a) Umschalten: " + JSON.stringify({ p: p.config && p.config.aufwaermen, n: r.nachKlick }));
    if (!probleme.length) zeilen.push(`a) Wahl „${kn[0].t}“ / „${kn[1].t}“ (${Math.round(kn[0].h)} px), Umschalten speichert aufwaermen „keins“, Infos unverändert`);
    for (const k of ["ohne", "felder"]) {
      const x = r[k];
      if (!x.liste || !/Aufwärmen/.test(x.gast) || !/Käfig/.test(x.gast) || !/Aufwärmen vor der ersten Runde: .*Käfig/.test(x.planer) || /anderes Turnier/.test(x.gast + x.info)) probleme.push(`b) ${k}: liste ${x.liste}, Gast ${/Käfig/.test(x.gast)}`);
    }
    if (!probleme.some(p => p.startsWith("b)"))) zeilen.push("b) ohne Angabe und „felder“: Aufwärm-Liste in Planer und Gast-Seite wie bisher");
    const kx = r.keins, satz = r.satz.replace(/\s+/g, " ");
    if (kx.liste || /hat jede Mannschaft ihr eigenes Feld/.test(kx.gast) || !kx.gast.includes(satz) || !kx.info.includes(satz) || kx.gast.indexOf(satz) > kx.gast.indexOf("Kaffee steht bereit") || !/kein Feld zugewiesen/.test(kx.planer) || /Aufwärmen vor der ersten Runde: .*Käfig/.test(kx.planer))
      probleme.push("c) keins: " + JSON.stringify({ liste: kx.liste, gast: kx.gast.includes(satz), info: kx.info.includes(satz), planer: /kein Feld zugewiesen/.test(kx.planer) }));
    else zeilen.push("c) „keins“: keine Liste; Gast-Seite und Info-Blatt: „" + satz + "“ vor den Infos; Planer „kein Feld zugewiesen“");
  }
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v971 Festival: Aufwärmen – jedes Team ein Feld oder keins", !probleme.length, zeilen.concat(probleme));
};
