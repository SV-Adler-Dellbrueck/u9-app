/* v501 – PO: „Zusätzlich muss in die Erstellung des Spielplans für Festivals oder Heimspiele auch
   die Form 3+1 aufgenommen werden, inkl. der kompletten Logik des Aufbaus, Felder, Teams etc."
   Kacheln: zwei Jugendtore mit Torwart, Regeln wie 4+1, Feldname wie die Jugendtor-Felder
   (Käfig / 3+1 oben), Standardaufbau bleibt. Geprueft: Form, Teamgroesse, Feldnamen, Kuerzen,
   Plan, Skizze, Regelkarten, Umschalter im Planer, „Teams festlegen", Taktikboard, Termin. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const fs = require("fs"), path = require("path");
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [], termine: [], matchday: [], heimturnier: (u, req) => req.method() === "GET" ? [] : { status: 204, body: "" } }), hoehe: 1200 });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof FST_FORMEN === "undefined" || !FST_FORMEN.f3) return { fehlt: "FST_FORMEN.f3" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const F = FST_FORMEN.f3;
    const namen = f => f.map((_, i) => fstFeldName(f, i));
    const a = namen([{ form: "f3" }, { form: "funino" }, { form: "f4" }]);
    const b = namen([{ form: "f4" }, { form: "funino" }, { form: "funino" }, { form: "f3" }]);
    const c = namen([{ form: "f3", name: "Wiese" }, { form: "f3" }, { form: "f3" }]);
    const teams6 = fstTeamsBauen([{ name: "SV Adler Dellbrück", kinder: 10, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }]);
    const gek = fstFelderKuerzen([{ form: "f4" }, { form: "funino" }, { form: "funino" }, { form: "f3" }], teams6);
    const vorschlag = fstTeamsVorschlag(10, [{ form: "f3" }, { form: "f3" }]);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: [{ form: "f3" }, { form: "funino" }, { form: "funino" }], vereine: [], infos: "" };
    const plan = fstPlanBauen(teams6, cfg);
    const skizze = fstSkizzeFelder(cfg.felder);
    const regelnMit = fstRegelnHtml(true, cfg), regelnOhne = fstRegelnHtml(true, { felder: FST_STANDARD_FELDER });
    // Planer: drei Umschalter je Feld
    let box = document.getElementById("ht-body"); if (!box) { box = document.createElement("div"); box.id = "ht-body"; document.body.appendChild(box); }
    _HT = { id: 9, name: "Kinderfestival", datum: heute, edit_code: "abc", config: { ...cfg, vereine: [{ name: "SV Adler Dellbrück", kinder: 10, teams: 2 }] }, teams: [], plan: [] };
    fstRender(); await warte(120);
    const seg = box.querySelector('.seg-ctrl[aria-label^="Spielform Feld 1"]');
    const knoepfe = seg ? [...seg.querySelectorAll(".seg-btn")].map(x => x.textContent.trim()) : [];
    const aktiv = seg ? [...seg.querySelectorAll(".seg-btn.active")].map(x => x.textContent.trim()) : [];
    // Teams festlegen und Taktikboard
    const kader = typeof teamKader === "function" ? teamKader("3+1") : null;
    const zu = typeof FST_ZU_FORM !== "undefined" ? FST_ZU_FORM.f3 : null;
    const form = typeof FORMATIONS !== "undefined" ? FORMATIONS["3+1"] : null;
    let tb = null;
    if (typeof taktikSetFormation === "function" && form) { try { taktikSetFormation("3+1"); tb = { form: tbFormation, feld: tbField.length }; } catch (e) { tb = { fehler: String(e) }; } }
    const tbKnopf = !!document.querySelector('.tb-form-btn[data-form="3+1"]');
    return { F, a, b, c, gek: namen(gek), gekN: gek.length, vorschlag, planF3: plan.filter(p => p.form === "f3").length, planN: plan.length,
      skizzeFarbe: skizze.includes('fill="' + F.farbe + '"'), skizzeKaefig: /Käfig/.test(skizze),
      regelnMit: /3\+1 · Käfig/.test(regelnMit) && /3 Feldspieler und Torwart/.test(regelnMit),
      regelnMitFunino: /FUNiño · Funino 1 und Funino 2/.test(regelnMit), regelnMitOhne4: !/4\+1 · /.test(regelnMit),
      regelnOhne: !/3\+1/.test(regelnOhne) && /4\+1 · Käfig und 4\+1 oben/.test(regelnOhne),
      knoepfe, aktiv, kader, zu, form: form ? { tw: form.tw, feld: form.fieldCount, slots: form.slots.length } : null, tb, tbKnopf };
  }, { heute });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Spielform 3+1", false, probleme); }
  if (r.F.auf !== 4 || r.F.tore !== "2 Jugendtore") probleme.push(`3+1 ist ${r.F.auf} auf dem Feld, ${r.F.tore} – erwartet 4 und 2 Jugendtore`);
  if (r.a.join("|") !== "Käfig|Funino 1|4+1 oben") probleme.push(`Feldnamen [3+1, FUNiño, 4+1] = ${r.a.join(", ")}`);
  if (r.b.join("|") !== "Käfig|Funino 1|Funino 2|3+1 oben") probleme.push(`Feldnamen [4+1, FUNiño, FUNiño, 3+1] = ${r.b.join(", ")}`);
  if (r.c.join("|") !== "Wiese|3+1 oben|3+1 3") probleme.push(`Feldnamen mit eigenem Namen = ${r.c.join(", ")}`);
  if (r.gekN !== 3 || r.gek.join("|") !== "Käfig|Funino 1|Funino 2") probleme.push(`Kürzen auf 6 Teams ergab ${r.gek.join(", ")} – „3+1 oben“ muss zuerst gehen`);
  if (r.vorschlag !== 2) probleme.push(`10 Kinder auf zwei 3+1-Feldern = ${r.vorschlag} Teams statt 2`);
  if (!r.planF3 || r.planF3 * 3 !== r.planN) probleme.push(`Plan: ${r.planF3} von ${r.planN} Spielen auf 3+1 – erwartet ein Drittel`);
  if (!r.skizzeFarbe || !r.skizzeKaefig) probleme.push("Skizze zeigt das 3+1-Feld nicht in seiner Farbe im Käfig");
  if (!r.regelnMit) probleme.push("Regelkarte „3+1 · Käfig“ mit drei Feldspielern fehlt, obwohl ein Feld 3+1 spielt");
  if (!r.regelnMitFunino) probleme.push("Regelkarte FUNiño trägt nicht die Feldnamen „Funino 1 und Funino 2“");
  if (!r.regelnMitOhne4) probleme.push("Regelkarte 4+1 erscheint, obwohl kein Feld 4+1 spielt");
  if (!r.regelnOhne) probleme.push("Standardaufbau: 3+1-Karte da oder „4+1 · Käfig und 4+1 oben“ fehlt");
  if (r.knoepfe.join("|") !== "4+1|3+1|FUNiño 3:3") probleme.push(`Umschalter je Feld: ${r.knoepfe.join(" | ")}`);
  if (r.aktiv.join("|") !== "3+1") probleme.push(`Aktiv am Käfig: ${r.aktiv.join(",")} statt 3+1`);
  if (!r.kader || r.kader.tw !== 1 || r.kader.feld !== 5 || r.kader.gesamt !== 6) probleme.push(`teamKader(3+1) = ${JSON.stringify(r.kader)} – erwartet tw 1, feld 5, gesamt 6`);
  if (r.zu !== "3+1") probleme.push(`FST_ZU_FORM.f3 = ${r.zu}`);
  if (!r.form || !r.form.tw || r.form.feld !== 3 || r.form.slots !== 4) probleme.push(`FORMATIONS[3+1] = ${JSON.stringify(r.form)}`);
  if (!r.tb || r.tb.form !== "3+1" || r.tb.feld < 3) probleme.push(`Taktikboard 3+1: ${JSON.stringify(r.tb)}`);
  if (!r.tbKnopf) probleme.push("Taktikboard hat keinen 3+1-Knopf");
  const gegner = fs.readFileSync(path.join(h.REPO, "md-gegner.js"), "utf8");
  if (!/sfOpts=\["funino","3\+1","4\+1","5\+1"\]/.test(gegner)) probleme.push("Termin-Editor bietet 3+1 nicht als Spielform an");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`3+1: ${r.F.auf} auf dem Feld · ${r.F.tore} · Namen ${r.a.join(", ")} / ${r.b.join(", ")} · gekürzt ${r.gek.join(", ")}`);
  zeilen.push(`Plan ${r.planF3}/${r.planN} auf 3+1 · Regelkarten mit 3+1 ${r.regelnMit}, ohne ${r.regelnOhne} · Umschalter ${r.knoepfe.join(" | ")}`);
  zeilen.push(`Teams festlegen: ${JSON.stringify(r.kader)} · Taktikboard ${JSON.stringify(r.tb)} · Termin-Spielform ok`);
  return h.ergebnis("Spielform 3+1 durchgängig – Felder, Teams, Plan, Regeln, Skizze", !probleme.length, zeilen.concat(probleme));
};
