/* v485 – PO: „in die Ansicht für die externen Trainer einen Info-Button hinterlegen mit der
   Adresse vom Thurner Kamp … Parkplätze direkt am Platz, häufig belegt, besser an der Straße
   … Kaffee und Brötchen … Die Felder benannt: das erste 4+1-Feld heißt immer „Käfig", dann
   „Funino 1", „Funino 2" und „4+1 oben" … eine Skizze, wo welche Felder liegen, und eine
   Skizze der Parkmöglichkeiten." Geprueft: Standardnamen aus der Form, eigener Name je Feld,
   Namen im Plan und in der Legende, Info-Knopf auf der Gast-Seite, Info-Blatt mit Adresse,
   Parkhinweis und zwei Skizzen, Dialog-Rolle, Namen in der Trainer-Eingabe. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }), hoehe: 1400 });
  const r = await s.page.evaluate(() => {
    if (typeof fstFeldName !== "function" || typeof fstInfoOpen !== "function") return { fehlt: "fstFeldName/fstInfoOpen" };
    const std = FST_STANDARD_FELDER.map((_, i) => fstFeldName(FST_STANDARD_FELDER, i));
    const vier = [{ form: "f4" }, { form: "funino" }, { form: "funino" }, { form: "f4" }];
    const vierNamen = vier.map((_, i) => fstFeldName(vier, i));
    const eigen = [{ form: "f4", name: "Kunstrasen" }, { form: "funino" }];
    const eigenNamen = eigen.map((_, i) => fstFeldName(eigen, i));
    const vereine = [
      { name: "SV Adler Dellbrück", kinder: 10, teams: 2 },
      { name: "SV Auweiler-Esch", kinder: 10, teams: 2 },
      { name: "VfB 05 Köln", kinder: 10, teams: 2 }
    ];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", start: "10:00", dauer: 60, spieldauer: 8, wechsel: 2, felder: FST_STANDARD_FELDER, infos: HT_INFOS_VORLAGE };
    const plan = fstPlanBauen(teams, cfg);
    const row = { name: "Kinderfestival", datum: "2026-09-12", ort: "Thurner Kamp 97, 51069 Köln", teams: teams.map(t => t.name), plan, config: cfg };
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    _fstPublicRender(wrap, row);
    const seite = wrap.innerHTML;
    const knopf = [...wrap.querySelectorAll("button")].find(b => /Anfahrt/.test(b.textContent));
    const knopfHoch = knopf ? knopf.getBoundingClientRect().height : 0;
    // Info-Blatt oeffnen wie ein Gast-Trainer
    _htPub = { row };
    if (knopf) knopf.click();
    const blatt = document.getElementById("fst-info");
    const bHtml = blatt ? blatt.innerHTML : "";
    const svgs = blatt ? blatt.querySelectorAll("svg").length : 0;
    const zu = blatt ? [...blatt.querySelectorAll("button")].find(b => /Zurück/.test(b.textContent)) : null;
    if (zu) zu.click();
    const zuIst = !document.getElementById("fst-info");
    // Trainer-Eingabe: Name je Feld als Eingabefeld
    _HT = { id: 1, name: "Kinderfestival", datum: "2026-09-12", config: cfg, teams: row.teams, plan };
    const body = document.createElement("div"); body.id = "ht-body"; document.body.appendChild(body);
    fstRender();
    const eingaben = [...body.querySelectorAll("input[id^='fst-feld-name-']")].map(i => i.value);
    return {
      std, vierNamen, eigenNamen,
      knopf: !!knopf, knopfHoch, blatt: !!blatt, svgs, zuIst,
      rolle: blatt ? blatt.getAttribute("role") + "/" + blatt.getAttribute("aria-modal") : "",
      adresse: /Thurner Kamp 97, 51069 Köln/.test(bHtml), karte: /google\.com\/maps/.test(bHtml),
      parken: /oft schon belegt/.test(bHtml) && /an der Straße parken/.test(bHtml),
      kaffee: /Kaffee und Brötchen/.test(bHtml),
      wc: /Ebenerdig unter dem Vereinsheim/.test(bHtml), turnierleitung: /Turnierleitung/.test(HT_INFOS_VORLAGE),
      linkeHaelfte: /linken Hälfte des großen Platzes/.test(bHtml) && /rechte Hälfte/.test(bHtml),
      skizzeFelder: /Skizze der Spielfelder/.test(bHtml) && /Käfig/.test(bHtml) && /Funino 2/.test(bHtml),
      skizzeParken: /Skizze der Parkmöglichkeiten/.test(bHtml) && /Thurner Kamp/.test(bHtml),
      planNamen: />Käfig</.test(seite) && />Funino 1</.test(seite) && !/>F1 ·/.test(seite),
      legende: /Käfig · 4\+1 mit Torwart/.test(seite),
      eingaben
    };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Festival-Infos", false, probleme); }
  if (r.std.join(",") !== "Käfig,Funino 1,Funino 2,4+1 oben") probleme.push(`Standardnamen ${r.std.join(",")} statt Käfig,Funino 1,Funino 2,4+1 oben`);
  if (r.vierNamen.join(",") !== "Käfig,Funino 1,Funino 2,4+1 oben") probleme.push(`vier Felder heißen ${r.vierNamen.join(",")} – das zweite 4+1 muss „4+1 oben“ sein`);
  if (r.eigenNamen.join(",") !== "Kunstrasen,Funino 1") probleme.push(`eigener Name geht verloren: ${r.eigenNamen.join(",")}`);
  if (!r.knopf) probleme.push("kein Info-Knopf auf der Gast-Seite");
  if (r.knopf && r.knopfHoch < 44) probleme.push(`Info-Knopf nur ${r.knopfHoch}px hoch`);
  if (!r.blatt) probleme.push("Info-Blatt öffnet nicht");
  if (r.rolle !== "dialog/true") probleme.push(`Info-Blatt ohne Dialog-Rolle (${r.rolle})`);
  if (!r.adresse || !r.karte) probleme.push(`Adresse ${r.adresse}, Kartenlink ${r.karte}`);
  if (!r.parken) probleme.push("Parkhinweis fehlt (am Platz oft belegt, besser an der Straße)");
  if (!r.wc) probleme.push("WC-Hinweis (ebenerdig unter dem Vereinsheim) fehlt im Blatt");
  if (r.turnierleitung) probleme.push("„Turnierleitung“ steht noch in der Vorlage");
  if (!r.linkeHaelfte) probleme.push("Felder-Skizze ohne linke/rechte Platzhälfte");
  if (!r.kaffee) probleme.push("„Kaffee und Brötchen“ fehlt in der Vorlage");
  if (r.svgs < 2 || !r.skizzeFelder || !r.skizzeParken) probleme.push(`Skizzen: ${r.svgs} SVGs, Felder ${r.skizzeFelder}, Parken ${r.skizzeParken}`);
  if (!r.zuIst) probleme.push("„Zurück zum Spielplan“ schließt das Blatt nicht");
  if (!r.planNamen || !r.legende) probleme.push(`Gast-Seite ohne Feldnamen (Plan ${r.planNamen}, Legende ${r.legende})`);
  if (r.eingaben.join(",") !== "Käfig,Funino 1,Funino 2,4+1 oben") probleme.push(`Trainer-Eingabe zeigt ${JSON.stringify(r.eingaben)} statt der Feldnamen`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Namen: Standard ${r.std.join(", ")} · vier Felder ${r.vierNamen.join(", ")} · eigener Name ${r.eigenNamen[0]}`);
  zeilen.push(`Gast-Seite: Info-Knopf ${r.knopf} (${Math.round(r.knopfHoch)}px) · Blatt mit Adresse ${r.adresse}, Karte ${r.karte}, Parken ${r.parken}, ${r.svgs} Skizzen, Dialog ${r.rolle}`);
  zeilen.push(`Plan mit Feldnamen ${r.planNamen} · Legende ${r.legende} · Trainer-Eingabe ${r.eingaben.join(", ")}`);
  return h.ergebnis("Festival-Infos: Feldnamen wie am Platz, Info-Blatt mit Anfahrt, Parken und Skizzen", !probleme.length, zeilen.concat(probleme));
};
