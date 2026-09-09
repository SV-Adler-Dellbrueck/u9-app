/* v488 – PO: „Die Darstellung ist nicht optimal, alles verrückt und zu groß … Wo kann der
   Adler-Trainer das Turnier starten? Starten wir um 10:18, alle Spiele um 3 Minuten nach hinten
   … Wo können optional Ergebnisse eingetragen werden – die externen Trainer über den Link, die
   Adler-Trainer in der App … Regeln als Button in den externen Link, 4+1 und FUNiño."
   Geprueft: eine Zeile je Spiel im Raster (kein Umbruch der Teamtasten), Start verschiebt die
   Anzeige um die Differenz, Ergebnis in der App gespeichert, Gast-Seite mit Regeln-Knopf,
   Ergebnis-Tasten nur mit Code, laufende Runde markiert, Gast-Link mit Schreib-Code. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [], heimturnier: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [] }), hoehe: 1400 });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof fstZeitIst !== "function" || typeof fstRegelnOpen !== "function" || typeof fstErgebnis !== "function") return { fehlt: "fstZeitIst/fstRegelnOpen/fstErgebnis" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const teams = fstTeamsBauen([{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }]);
    const cfg = { art: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: fstFelderKuerzen(FST_STANDARD_FELDER, teams), vereine: [], infos: HT_INFOS_VORLAGE };
    const plan = fstPlanBauen(teams, cfg);
    _HT = { id: 7, name: "Kinderfestival", datum: heute, edit_code: "abc123", config: cfg, teams: teams.map(t => t.name), plan };
    const body = document.createElement("div"); body.id = "ht-body"; body.style.width = "360px"; document.body.appendChild(body);
    fstRender(); await warte(300);
    // 1) Raster: Teamtasten einer Zeile stehen auf gleicher Hoehe wie die Feld-Marke
    const zeile = body.querySelector("button.fst-tausch")?.parentElement;
    const kinder = zeile ? [...zeile.children] : [];
    const tops = kinder.map(k => Math.round(k.getBoundingClientRect().top + k.getBoundingClientRect().height / 2));
    const eineZeile = tops.length >= 5 && Math.max(...tops) - Math.min(...tops) <= 6;
    const zeileHoch = zeile ? zeile.getBoundingClientRect().height : 0;
    const zeitVorher = body.textContent.match(/Runde 1\s*(\d\d:\d\d)/)?.[1];
    // 2) Start um 10:18 → +3 Min.
    await fstStarten("10:18"); await warte(300);
    const zeitNachher = body.textContent.match(/Runde 1\s*(\d\d:\d\d)/)?.[1];
    const runde2 = body.textContent.match(/Runde 2\s*(\d\d:\d\d)/)?.[1];
    const startText = /Beginn 10:18/.test(body.textContent) && /\+3 Min\. verschoben/.test(body.textContent);
    // 3) Ergebnis in der App
    fstErgebnis(0); await warte(100);
    const dlg = document.getElementById("fst-erg");
    await fstErgTor(0, "ta", 1); await fstErgTor(0, "ta", 1); await fstErgTor(0, "tb", 1); await warte(200);
    const erg = _HT.plan[0].ta + ":" + _HT.plan[0].tb;
    dlg?.remove(); fstRender(); await warte(200);
    const ergTaste = [...body.querySelectorAll("button")].some(b => b.textContent.trim() === "2:1");
    const gastKnopf = [...body.querySelectorAll("button")].find(b => /Gast-Trainer/.test(b.textContent));
    const gastMitCode = gastKnopf ? /htShareHelfer/.test(gastKnopf.getAttribute("onclick") || "") : false;
    // 4) Gast-Seite mit Code
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    _htPub = { slug: "x", code: "abc123", wrap, row: _HT }; _fstPublicRender(wrap, _HT);
    const gHtml = wrap.innerHTML;
    const regelnKnopf = [...wrap.querySelectorAll("button")].find(b => /Regeln/.test(b.textContent));
    const ergTasten = [...wrap.querySelectorAll("button")].filter(b => /Ergebnis eintragen/.test(b.getAttribute("aria-label") || "")).length;
    if (regelnKnopf) regelnKnopf.click();
    const regeln = document.getElementById("fst-regeln"); const rHtml = regeln ? regeln.textContent : ""; regeln?.remove();
    // ohne Code: keine Tasten, Ergebnis lesbar
    _htPub = { slug: "x", code: "", wrap, row: _HT }; _fstPublicRender(wrap, _HT);
    const ergTastenOhne = [...wrap.querySelectorAll("button")].filter(b => /Ergebnis eintragen/.test(b.getAttribute("aria-label") || "")).length;
    const ergLesbar = /2 : 1/.test(wrap.textContent);
    // 5) laufende Runde: Start = jetzt → Runde 1 laeuft
    const jetzt = _fstJetztHhmm(); _HT.config.startIst = jetzt;   // geplant 10:15, gestartet jetzt → Runde 1 läuft jetzt
    _fstPublicRender(wrap, _HT);
    const laeuft = /Runde 1[\s\S]{0,120}▶ läuft/.test(wrap.textContent);   // v489: die Marke sitzt an der Runden-Karte
    return { eineZeile, zeileHoch, tops, zeitVorher, zeitNachher, runde2, startText, dlg: !!dlg, erg, ergTaste, gastMitCode, regelnKnopf: !!regelnKnopf, ergTasten, ergTastenOhne, ergLesbar,
      regelnInhalt: /eigenen Hälfte/.test(rHtml) && /3 Toren Vorsprung/.test(rHtml) && !/Wechsel/.test(rHtml) && /Schusszone/.test(rHtml) && /Rückpass in die Hand/.test(rHtml) && /hinter die Mittellinie/.test(rHtml) && /Abklatschen/.test(rHtml) && /Eltern feuern an/.test(rHtml) && /abgehängte Tor/.test(rHtml) && /Kinder zuerst selbst/.test(rHtml),
      gastStart: /um 3 Min\. nach hinten/.test(gHtml), laeuft, spiele: plan.length };
  }, { heute });
  const fehler = s.fehler(); const gesendet = s.gesendet.slice(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival live", false, probleme); }
  if (!r.eineZeile) probleme.push(`Spielzeile bricht um (Mitten ${JSON.stringify(r.tops)})`);
  if (r.zeileHoch > 56) probleme.push(`Spielzeile ${Math.round(r.zeileHoch)}px hoch – zu groß`);
  if (r.zeitVorher !== "10:15" || r.zeitNachher !== "10:18" || r.runde2 !== "10:31") probleme.push(`Start 10:18 verschiebt nicht: Runde 1 ${r.zeitVorher}→${r.zeitNachher}, Runde 2 ${r.runde2} (erwartet 10:31)`);
  if (!r.startText) probleme.push("Zeile „Zeitplan +3 Min. verschoben · Beginn 10:18“ fehlt");
  if (!r.dlg || r.erg !== "2:1") probleme.push(`Ergebnis in der App: Dialog ${r.dlg}, Stand ${r.erg} statt 2:1`);
  if (!r.ergTaste) probleme.push("Ergebnis 2:1 steht nicht im Plan");
  if (!gesendet.some(g => g.methode === "PATCH" && g.body && Array.isArray(g.body.plan) && g.body.plan[0] && g.body.plan[0].ta === 2)) probleme.push("Ergebnis nicht gespeichert");
  if (!r.gastMitCode) probleme.push("Gast-Link ohne Schreib-Code");
  if (!r.regelnKnopf || !r.regelnInhalt) probleme.push(`Regeln: Knopf ${r.regelnKnopf}, Inhalt vollständig ${r.regelnInhalt}`);
  if (r.ergTasten !== r.spiele) probleme.push(`mit Code ${r.ergTasten} Ergebnis-Tasten statt ${r.spiele}`);
  if (r.ergTastenOhne !== 0 || !r.ergLesbar) probleme.push(`ohne Code: ${r.ergTastenOhne} Tasten, Ergebnis lesbar ${r.ergLesbar}`);
  if (!r.gastStart) probleme.push("Gast-Seite nennt die verschobenen Uhrzeiten nicht");
  if (!r.laeuft) probleme.push("laufende Runde nicht markiert");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Zeile: eine Höhe ${r.eineZeile}, ${Math.round(r.zeileHoch)}px · Start 10:18: Runde 1 ${r.zeitVorher}→${r.zeitNachher}, Runde 2 ${r.runde2}`);
  zeilen.push(`Ergebnis App ${r.erg} gespeichert · Gast-Link mit Code ${r.gastMitCode} · Gast: Regeln ${r.regelnKnopf}/${r.regelnInhalt}, Tasten mit Code ${r.ergTasten}, ohne ${r.ergTastenOhne}, läuft ${r.laeuft}`);
  return h.ergebnis("Festival live: kompakter Plan, Start verschiebt Zeiten, Ergebnisse in App und Link, Regeln", !probleme.length, zeilen.concat(probleme));
};
