/* v982 · 🌈 Buntes Feld (Charles 27.11.2026, Bild freigegeben): ein FUNiño-Feld oben links für Kinder in der Pause und Auswechselspieler
   – kicken, warm bleiben, spontan ein Spiel, Kinder aller Vereine gemischt, ohne Ergebnis. „Sonst kein Buntes Feld“.
   a) fstBunt: nur mit Schalter und nur, wenn oben links frei ist (oben leer oder ein einzelnes FUNiño-Feld); zwei Felder oben oder
      ein Jugendtor-Feld oben → nein
   b) Festival-Fenster: „🌈 Buntes Feld“ mit „Ja, wir bauen eins auf“/„Nein“ (aria-pressed, ≥ 44 px); Klick speichert config.bunt;
      ohne Platz ist „Ja“ gesperrt und der Grund steht da
   c) Turnierseite (7 Teams): Karte „🌈 Buntes Feld · oben links“ und in jeder Runde „Pause: … → 🌈 Buntes Feld“; ohne Schalter nichts davon
   d) Feldplan („Wo welches Feld liegt“): das Feld oben links, beschriftet „🌈 Buntes Feld“, mit Zone „nur Spieler & Trainer“; ohne Schalter nicht
   e) Festival-Planer: in der Pausenspalte „→ 🌈 Buntes Feld“, Material des bunten Feldes unter den Kennzahlen
   f) Der Spielplan bleibt gleich (dieselben Spiele mit und ohne Schalter) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const pruef = (bed, ok, nein) => bed ? zeilen.push(ok) : probleme.push(nein);
  const heute = h.heute(), patches = [];
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [],
    heimturnier: (u, req) => { if (req.method() === "PATCH") { patches.push(JSON.parse(req.postData() || "{}")); return { status: 204, body: "" }; } return []; } }) });
  const r = await s.page.evaluate(async ({ heute }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof fstBuntWahlHtml !== "function" || typeof fstBunt !== "function"); i++) await w(100);
    if (typeof fstBuntWahlHtml !== "function" || typeof fstBunt !== "function") return { fehlt: true };
    const o = {};
    const F = (...x) => x.map(form => ({ form }));
    o.a = { ein: fstBunt({ bunt: true }, F("f3", "funino", "funino", "funino")), leer: fstBunt({ bunt: true }, F("f3", "funino", "funino")),
      zwei: fstBunt({ bunt: true }, F("f3", "funino", "funino", "funino", "funino")), jugend: fstBunt({ bunt: true }, F("f4", "funino", "funino", "f4")),
      aus: fstBunt({}, F("f3", "funino", "funino", "funino")) };
    // sieben Teams, Käfig 3+1 und drei FUNiño-Felder wie am Platz
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Gast Eins", kinder: 10, teams: 2 }, { name: "SV Gast Zwei", kinder: 10, teams: 2 }, { name: "FC Gast Drei", kinder: 6, teams: 1 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: F("f3", "funino", "funino", "funino"), vereine };
    const plan = fstPlanBauen(teams, cfg);
    const row = bunt => ({ id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: Object.assign({}, cfg, bunt ? { bunt: true } : {}), teams: teams.map(t => t.name), plan });
    const sieh = async rw => {
      const wrap = document.createElement("div"); document.body.appendChild(wrap);
      _htPub = { slug: "x", code: "", wrap, row: rw }; _fstUhrMarke = "";
      _fstPublicRender(wrap, rw); await w(60);
      const karte = wrap.querySelector("#fst-bunt"), pausen = [...wrap.querySelectorAll(".fst-pause")].map(x => x.textContent.replace(/\s+/g, " ").trim());
      const runden = new Set(rw.plan.map(p => p.runde)).size;
      const g = { karte: karte ? karte.textContent.replace(/\s+/g, " ") : "", pausen, runden };
      wrap.remove();
      fstInfoOpen(); const b = document.getElementById("fst-info"); const svg = b ? b.querySelector('svg[aria-label^="Skizze der Spielfelder"]') : null;
      g.plan = svg ? svg.textContent.replace(/\s+/g, " ") : ""; g.feld = svg ? !!svg.querySelector('rect[x="72"][y="48"][width="53"]') : false; b?.remove(); _htPub = null;
      return g;
    };
    o.mit = await sieh(row(true)); o.ohne = await sieh(row(false));
    o.teams = teams.length;
    // b) Festival-Fenster
    let body = document.getElementById("ht-body"); if (!body) { body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body); }
    _HT = JSON.parse(JSON.stringify(row(false))); fstRender(); await w(60);
    const kn = () => [...body.querySelectorAll("#fst-bunt-wahl .seg-btn")].map(b => ({ t: b.textContent.trim(), an: b.getAttribute("aria-pressed"), h: b.getBoundingClientRect().height, aus: b.disabled }));
    o.b = { vor: kn(), text: body.textContent.includes("🌈 Buntes Feld") };
    const ja = [...body.querySelectorAll("#fst-bunt-wahl .seg-btn")].find(b => /Ja/.test(b.textContent)); if (ja) ja.click(); await w(400);
    o.b.cfg = _HT.config.bunt; o.b.nach = kn();
    _HT = JSON.parse(JSON.stringify(row(false))); _HT.config.felder = F("f4", "funino", "funino", "f4"); fstRender(); await w(60);
    o.b.ohnePlatz = { kn: kn(), grund: /kein Platz frei/.test(body.textContent) };
    // e) Planer: Pausenspalte und Material
    _HT = JSON.parse(JSON.stringify(row(true)));
    _HT.config.vereine = vereine.map(v => ({ name: v.name, kinder: v.kinder }));
    fpOpen(); await w(100); fpErzeugen(); await w(300);
    const fp = document.getElementById("fp-modal");
    o.e = { pause: fp ? /→ 🌈 Buntes Feld/.test(fp.textContent) : null, mat: fp ? /Dazu 🌈 Buntes Feld: 4 Minitore, 6 Hütchen/.test(fp.textContent) : null, da: !!fp };
    return o;
  }, { heute });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v982 Buntes Feld", false, ["fstBunt/fstBuntWahlHtml fehlen"]);
  pruef(r.a.ein && r.a.leer && !r.a.zwei && !r.a.jugend && !r.a.aus, "a) nur mit Schalter und freiem Platz oben links (ein FUNiño oben oder leer); zwei Felder oder Jugendtor oben → nein", "a) " + JSON.stringify(r.a));
  const kn = r.b.vor;
  pruef(r.b.text && kn.length === 2 && kn.every(k => k.h >= 44) && kn[1].an === "true" && r.b.cfg === true && r.b.nach[0].an === "true" && patches.some(p => p.config && p.config.bunt === true)
      && r.b.ohnePlatz.kn[0] && r.b.ohnePlatz.kn[0].aus && r.b.ohnePlatz.grund,
    "b) Festival-Fenster: „Ja, wir bauen eins auf“/„Nein“ (≥ 44 px), Klick speichert config.bunt; ohne Platz gesperrt mit Grund", "b) " + JSON.stringify({ b: r.b, patches: patches.length }));
  pruef(r.teams === 7 && /🌈 Buntes Feld · oben links/.test(r.mit.karte) && /ohne Ergebnis/.test(r.mit.karte) && r.mit.pausen.length === r.mit.runden && r.mit.pausen.every(x => /^Pause: .+ → 🌈 Buntes Feld$/.test(x))
      && !r.ohne.karte && !r.ohne.pausen.length,
    `c) Turnierseite (7 Teams): Karte und in allen ${r.mit.runden} Runden „Pause: … → 🌈 Buntes Feld“; ohne Schalter nichts`, "c) " + JSON.stringify({ teams: r.teams, mit: { karte: r.mit.karte, pausen: r.mit.pausen.slice(0, 3), runden: r.mit.runden }, ohne: { karte: r.ohne.karte, pausen: r.ohne.pausen.length } }));
  pruef(r.mit.feld && /🌈 Buntes\s*Feld/.test(r.mit.plan) && /nur Spieler & Trainer/.test(r.mit.plan) && !r.ohne.feld && !/Buntes/.test(r.ohne.plan),
    "d) Feldplan: Feld oben links „🌈 Buntes Feld“ in der Zone „nur Spieler & Trainer“; ohne Schalter nicht", "d) " + JSON.stringify({ mit: r.mit.plan.slice(0, 160), feld: r.mit.feld, ohne: r.ohne.feld }));
  if (r.e.da) pruef(r.e.pause && r.e.mat, "e) Festival-Planer: „→ 🌈 Buntes Feld“ in der Pausenspalte, Material darunter", "e) " + JSON.stringify(r.e));
  else probleme.push("e) Festival-Planer ließ sich nicht öffnen");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v982 🌈 Buntes Feld: Schalter, Turnierseite, Feldplan, Planer", !probleme.length, zeilen.concat(probleme));
};
