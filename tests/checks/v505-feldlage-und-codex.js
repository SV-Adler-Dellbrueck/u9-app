/* v505 – PO: „Wenn wir mit 3 Feldern planen und 2 davon FUNiño, dann das Feld unten rechts nach
   oben rechts schieben." Und: „Wir brauchen eine Erweiterung in den Regeln – Verhalten auf dem und
   neben dem Platz, eine Art Codex … Aufgrund von Vereinsbestimmungen sind die Felder, die oben am
   Platz liegen, nur für Spieler und Trainer erlaubt … Der externe Link soll auch an die Eltern der
   Gäste und unsere weitergeleitet werden können."
   Geprueft: fstFeldLage in fuenf Aufbauten; die Skizze zeichnet das verlegte Feld oben und die
   Zonen-Marken; der Zonen-Satz nennt die Feldnamen von heute; der Codex hat zwoelf Punkte mit der
   Platz-Regel zuerst und holt die Haltungs-Punkte aus dem Fairplay-Codex (statt sie abzuschreiben);
   Gast-Seite mit drittem Knopf und Karte; Fairplay-Codex und Eltern-Leitfaden tragen die Regel;
   die Texte im Planer sprechen Trainer UND Eltern an, der Helfer-Link bleibt abgegrenzt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const fs = require("fs"), path = require("path");
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [], termine: [], matchday: [], heimturnier: (u, req) => req.method() === "GET" ? [] : { status: 204, body: "" } }), hoehe: 1400 });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof fstFeldLage !== "function") return { fehlt: "fstFeldLage" };
    if (typeof fstCodexPunkte !== "function") return { fehlt: "fstCodexPunkte" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const F = (...a) => a.map(x => ({ form: x }));
    const lage = o => { const l = fstFeldLage(o); return `${l.kaefig}|${l.oben.join(",")}|${l.vorne.join(",")}`; };
    const lagen = {
      vier: lage(F("f4", "funino", "funino", "f4")),
      drei: lage(F("f4", "funino", "funino")),
      zwei: lage(F("f4", "funino")),
      dreiMitOben: lage(F("f4", "funino", "f4")),
      dreiPlusEins: lage(F("f4", "f3", "funino", "funino"))
    };
    // Skizze: wo steht welcher Name? (obere Reihe y≈91, vordere y≈182)
    const yVon = (svg, name) => { const d = document.createElement("div"); d.innerHTML = svg;
      const t = [...d.querySelectorAll("text")].find(x => x.textContent.trim() === name); return t ? Number(t.getAttribute("y")) : null; };
    const skDrei = fstSkizzeFelder(F("f4", "funino", "funino"));
    const skVier = fstSkizzeFelder(F("f4", "funino", "funino", "f4"));
    const skizze = {
      dreiFunino2: yVon(skDrei, "Funino 2"), dreiFunino1: yVon(skDrei, "Funino 1"), dreiKaefig: yVon(skDrei, "Käfig"),
      vierOben: yVon(skVier, "4+1 oben"), vierFunino2: yVon(skVier, "Funino 2"),
      marke: /nur Spieler & Trainer|nur Spieler &amp; Trainer/.test(skDrei), anfeuern: /anfeuern/.test(skDrei)
    };
    const satz = { drei: fstZonenSatz(F("f4", "funino", "funino")), vier: fstZonenSatz(F("f4", "funino", "funino", "f4")), zwei: fstZonenSatz(F("f4", "funino")) };
    // Codex
    const punkte = fstCodexPunkte(F("f4", "funino", "funino"));
    const titel = punkte.map(p => p.t);
    // Beweis „ausgewählt, nicht abgeschrieben": eine Änderung im Fairplay-Codex schlägt durch
    const alt = FAIRPLAY_REGELN.find(x => x.t === "Anfeuern statt anweisen");
    const merk = alt ? alt.d : null; if (alt) alt.d = "PROBE-TEXT-505";
    const durch = fstCodexPunkte(F("f4", "funino", "funino")).some(p => p.d === "PROBE-TEXT-505");
    if (alt) alt.d = merk;
    const fairNeu = FAIRPLAY_REGELN.some(x => /Obere Felder/.test(x.t));
    const leitNeu = (typeof ELTERN_LEITFADEN !== "undefined") && ELTERN_LEITFADEN.some(x => /Felder für Zuschauer/.test(x.t));
    // Gast-Seite
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 10, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: F("f4", "funino", "funino"), vereine, infos: "" };
    const row = { id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: cfg, teams: teams.map(t => t.name), plan: fstPlanBauen(teams, cfg) };
    _htPub = { slug: "x", code: "", wrap, row }; _fstUhrMarke = "";
    _fstPublicRender(wrap, row); await warte(60);
    const gast = { knopf: [...wrap.querySelectorAll("button")].some(b => /Am Rand/.test(b.textContent)),
      karte: /Am Spielfeldrand/.test(wrap.textContent), satz: /nur Spieler und Trainer/.test(wrap.textContent),
      fan: /Bürgermeister Besserwisser/.test(wrap.textContent), und: /Bürgermeister und Besserwisser/.test(wrap.textContent) };
    fstCodexOpen(); await warte(60);
    const cx = document.getElementById("fst-codex");
    const codex = { offen: !!cx, dialog: cx ? cx.getAttribute("aria-modal") : null, weiter: cx ? /weiterleiten/.test(cx.textContent) : false };
    cx?.remove(); _htPub = null; wrap.remove();
    return { lagen, skizze, satz, titel, durch, fairNeu, leitNeu, gast, codex };
  }, { heute });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Feldlage und Codex", false, probleme); }
  const soll = { vier: "0|3|1,2", drei: "0|2|1", zwei: "0||1", dreiMitOben: "0|2|1", dreiPlusEins: "0|1|2,3" };
  Object.keys(soll).forEach(k => { if (r.lagen[k] !== soll[k]) probleme.push(`Lage ${k}: ${r.lagen[k]} statt ${soll[k]} (Käfig|oben|vorne)`); });
  if (!r.skizze.dreiFunino2 || r.skizze.dreiFunino2 > 130) probleme.push(`Bei drei Feldern steht „Funino 2“ auf y=${r.skizze.dreiFunino2} – oben wäre unter 130`);
  if (!r.skizze.dreiFunino1 || r.skizze.dreiFunino1 < 130) probleme.push(`„Funino 1“ steht nicht mehr vorn (y=${r.skizze.dreiFunino1})`);
  if (!r.skizze.dreiKaefig) probleme.push("Der Käfig fehlt in der Skizze");
  if (!r.skizze.vierOben || r.skizze.vierOben > 130) probleme.push(`Bei vier Feldern gehört „4+1 oben“ nach oben (y=${r.skizze.vierOben})`);
  if (!r.skizze.vierFunino2 || r.skizze.vierFunino2 < 130) probleme.push(`Bei vier Feldern bleibt „Funino 2“ vorn (y=${r.skizze.vierFunino2})`);
  if (!r.skizze.marke || !r.skizze.anfeuern) probleme.push("Die Skizze trägt keine Zonen-Marken");
  if (!/Funino 2/.test(r.satz.drei) || !/Käfig und Funino 1/.test(r.satz.drei)) probleme.push(`Zonen-Satz (drei Felder): „${r.satz.drei}“`);
  if (!/4\+1 oben/.test(r.satz.vier)) probleme.push(`Zonen-Satz (vier Felder) nennt das obere Feld nicht: „${r.satz.vier}“`);
  if (r.satz.zwei) probleme.push("Ohne oberes Feld darf es keine Platzseiten-Regel geben");
  if (r.titel.length !== 12) probleme.push(`Der Codex hat ${r.titel.length} Punkte statt 12: ${r.titel.join(" · ")}`);
  if (!/^Oben spielen die Kinder unter sich$/.test(r.titel[0] || "")) probleme.push(`Erster Punkt ist „${r.titel[0]}“ statt der Platz-Regel`);
  if (!r.durch) probleme.push("Der Codex schreibt die Fairplay-Punkte ab, statt sie auszuwählen");
  if (!r.fairNeu) probleme.push("Der Fairplay-Codex der Eltern-App kennt die Platzseiten-Regel nicht");
  if (!r.leitNeu) probleme.push("Der Eltern-Leitfaden (Offline-Fallback) kennt die Platzseiten-Regel nicht");
  if (!r.gast.knopf) probleme.push("Auf der Gast-Seite fehlt der Knopf „Am Rand“");
  if (!r.gast.karte || !r.gast.satz) probleme.push("Auf der Gast-Startseite fehlt die Karte mit der Platzseiten-Regel");
  if (!r.gast.fan) probleme.push("Der Fan-Satz fehlt auf der Gast-Seite");
  if (r.gast.und) probleme.push("„Bürgermeister und Besserwisser“ – das „und“ gehört weg (ein Name)");
  if (!r.codex.offen || r.codex.dialog !== "true") probleme.push("Das Codex-Blatt öffnet nicht als Dialog");
  if (!r.codex.weiter) probleme.push("Im Codex fehlt der Hinweis, dass die Seite an die Eltern weitergeht");
  const tp = fs.readFileSync(path.join(h.REPO, "md-turnierplan.js"), "utf8");
  if (/An die Gast-Trainer<|Plan an die Gast-Trainer schicken</.test(tp)) probleme.push("Im Planer steht noch „an die Gast-Trainer“ – der Link geht auch an Eltern");
  if (!/nicht in die Eltern-Gruppe/.test(tp)) probleme.push("Der Helfer-Link warnt nicht davor, ihn an die Eltern zu geben");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Lage (Käfig|oben|vorne): vier ${r.lagen.vier} · drei ${r.lagen.drei} · zwei ${r.lagen.zwei} · 3+1 dabei ${r.lagen.dreiPlusEins}`);
  zeilen.push(`Skizze: Funino 2 bei drei Feldern auf y=${r.skizze.dreiFunino2} (oben), bei vier auf y=${r.skizze.vierFunino2} (vorn) · Marken ${r.skizze.marke && r.skizze.anfeuern}`);
  zeilen.push(`Codex: ${r.titel.length} Punkte, zuerst „${r.titel[0]}“ · aus dem Fairplay-Codex gezogen ${r.durch} · Gast-Seite Knopf ${r.gast.knopf}, Karte ${r.gast.karte}`);
  return h.ergebnis("Oben liegt oben – Zonen-Regel und Codex im Gast-Link", !probleme.length, zeilen.concat(probleme));
};
