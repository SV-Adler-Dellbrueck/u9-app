/* v518 – PO: „Beim Warm up Adler ist nur eine der vier Übungen zu sehen. Alle vier wären
   sinnvoll. Dann sollten wir diese auch irgendwo in der Spieltag integrieren als Abruf,
   damit die Trainer am Spieltag direkt nachsehen können. Ebenso was die Größen der
   Spielfelder angeht." Auf die Rückfrage: „Eigene Kachel und wir ergänzen dann noch weitere
   wichtige Dokumente. Also eine Art Wissensdatenbank." Und zur Spielform: „Standard 4+1
   bleibt. Umstellung kann jeder Trainer in der App. Danach dann die Logik Berechnungen für
   die Teams."

   Die Zahlen im Wissensteil stammen aus den Durchführungsbestimmungen Kinderfussball des
   Fussballkreises Köln (gültig ab 01.08.2026). Sie werden hier gegen den Wortlaut geprüft –
   eine falsche Zahl am Spieltag ist schlimmer als gar keine, denn auf sie verlässt sich dann
   jemand. Geprüft wird ausserdem, dass die App ihre eigene Abweichung benennt: der Käfig
   läuft als 4+1, vorgesehen ist für U8/U9 3+1. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], heimturnier: (u, req) => req.method() === "GET" ? [] : { status: 204, body: "" } }),
    hoehe: 2000
  });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    for (const n of ["wissenKachel", "wissenOpen", "wissenAuf", "wissenClose", "tpReiheHtml", "fstTeamsNachziehen"])
      if (typeof window[n] !== "function") return { fehlt: n };

    // ── Die Kachel steht im Spieltag ────────────────────────────────────────
    if (typeof SECS === "object" && SECS.spieltag && SECS.spieltag.init) { try { SECS.spieltag.init(); } catch (e) {} }
    await warte(120);
    const slot = document.getElementById("wissen-slot");
    const kachel = document.getElementById("wissen-kachel");
    const kachelHoehe = kachel ? kachel.offsetHeight : 0;
    const kachelText = kachel ? kachel.textContent.replace(/\s+/g, " ").trim() : "";

    // ── Sie öffnet einen Dialog ─────────────────────────────────────────────
    wissenOpen(); await warte(150);
    const modal = document.getElementById("wissen-modal");
    const dialog = modal ? (modal.getAttribute("role") + "/" + modal.getAttribute("aria-modal")) : "";
    /* Nur die aufklappbaren Einträge – der Kopfbereich (mdlHead) bringt einen eigenen
       Knopf mit, und „Schließen“ steht ebenfalls als Knopf darin. */
    const koepfe = [...document.querySelectorAll("#wissen-body button[aria-expanded]")];
    const eintraege = koepfe.map(b => (b.querySelector("span span") || b).textContent.trim());
    const knopfHoehen = koepfe.map(b => b.offsetHeight);
    /* Alles zugeklappt beim Öffnen – am Platz will niemand scrollen. */
    const offenAmAnfang = koepfe.filter(b => b.getAttribute("aria-expanded") === "true").length;

    // ── Nur eines offen ─────────────────────────────────────────────────────
    wissenAuf("kifu-spielformen"); await warte(80);
    const nach1 = [...document.querySelectorAll("#wissen-body [aria-expanded='true']")].length;
    const masse = document.getElementById("wissen-body").textContent.replace(/\s+/g, " ");
    wissenAuf("kifu-regeln"); await warte(80);
    const nach2 = [...document.querySelectorAll("#wissen-body [aria-expanded='true']")].length;
    const regeln = document.getElementById("wissen-body").textContent.replace(/\s+/g, " ");
    const nochMasse = /25 × 20/.test(regeln);
    wissenAuf("kifu-regeln"); await warte(80);
    const zuKlappbar = [...document.querySelectorAll("#wissen-body [aria-expanded='true']")].length;
    wissenClose(); await warte(60);
    const zu = !document.getElementById("wissen-modal");

    // ── Die vier Stufen des Einlaufprogramms ────────────────────────────────
    const echt = window.tpAllForms;
    window.tpAllForms = () => ([
      { name: "Warm up Adler", dauer: "15", feld: "20 x 20 m", svg: "<svg viewBox=\"0 0 280 180\"></svg>", ablauf: "Dach" },
      { name: "Adler 1 – Aktivierung", dauer: "2", feld: "20 x 20 m", svg: "<svg viewBox=\"0 0 280 180\"><!--1--></svg>", ablauf: "Stufe 1" },
      { name: "Adler 2 – Dribbelstaffel", dauer: "2", feld: "20 x 20 m", svg: "<svg viewBox=\"0 0 280 180\"><!--2--></svg>", ablauf: "Stufe 2" },
      { name: "Adler 3 – Passen mit Klatschen", dauer: "3", feld: "20 x 20 m", svg: "<svg viewBox=\"0 0 280 180\"><!--3--></svg>", ablauf: "Stufe 3" },
      { name: "Adler 4 – Passen und Torschuss", dauer: "4", feld: "Halbes Funino-Feld", svg: "<svg viewBox=\"0 0 280 180\"><!--4--></svg>", ablauf: "Stufe 4" }
    ]);
    const reihe = tpReiheHtml("Warm up Adler");
    const box = document.createElement("div"); box.innerHTML = reihe; document.body.appendChild(box);
    const stufen = box.querySelectorAll("svg").length;
    const stufenNamen = [...box.querySelectorAll("div > div:first-child")].map(x => x.textContent.trim()).filter(x => /^\d ·/.test(x));
    const zugeklappt = !!box.querySelector("details") && !box.querySelector("details").open;
    box.remove();
    const fremd = tpReiheHtml("Irgendeine andere Übung");
    /* Fehlt eine Stufe, bleibt der Rest stehen statt alles wegzulassen. */
    window.tpAllForms = () => ([{ name: "Adler 1 – Aktivierung", dauer: "2", feld: "x", svg: "<svg viewBox=\"0 0 280 180\"></svg>", ablauf: "" }]);
    const teilweise = (tpReiheHtml("Warm up Adler").match(/<svg/g) || []).length;
    window.tpAllForms = echt;

    // ── Die Teamrechnung folgt der Spielform ────────────────────────────────
    /* Lauter 4+1-Felder: (5+1) je Team → 12 Kinder = 2 Teams. Lauter FUNiño: (3+1) → 3 Teams.
       Nur so unterscheiden sich die Vorschläge überhaupt – mit gemischten Feldern ergibt der
       Durchschnitt hier wie dort 3, und die Prüfung hätte nichts gemessen. */
    const cfgA = { felder: [{ form: "f4" }, { form: "f4" }, { form: "f4" }],
                   vereine: [{ name: "A", kinder: 12, teams: 2 }, { name: "B", kinder: 12, teams: 2, teamsManuell: true }] };
    const vorher = cfgA.vereine.map(v => v.name + ":" + v.teams).join(" ");
    cfgA.felder = [{ form: "funino" }, { form: "funino" }, { form: "funino" }];   // Trainer stellt um
    const gemeldet = fstTeamsNachziehen(cfgA);
    const nachher = cfgA.vereine.map(v => v.name + ":" + v.teams).join(" ");
    /* Ohne Änderung darf nichts gemeldet werden. */
    const nochmal = fstTeamsNachziehen(cfgA).length;

    return { slot: !!slot, kachelHoehe, kachelText, dialog, eintraege, knopfHoehen, offenAmAnfang,
             nach1, nach2, zuKlappbar, zu, masse, nochMasse, regeln,
             stufen, stufenNamen, zugeklappt, fremd, teilweise, vorher, nachher, gemeldet, nochmal };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Wissen am Spieltag", false, probleme); }

  // ── Kachel und Dialog ─────────────────────────────────────────────────────
  if (!r.slot) probleme.push("Im Spieltag gibt es keinen Platz für die Wissens-Kachel");
  if (!r.kachelHoehe) probleme.push("Die Wissens-Kachel erscheint nicht im Spieltag");
  else if (r.kachelHoehe < 56) probleme.push(`Die Wissens-Kachel ist ${r.kachelHoehe} px hoch (Hauptaktion: mindestens 56)`);
  if (!/Feldmaße/.test(r.kachelText)) probleme.push(`Die Kachel sagt nicht, was drinsteht: „${r.kachelText}“`);
  if (r.dialog !== "dialog/true") probleme.push(`Das Fenster trägt „${r.dialog}“ statt role=dialog und aria-modal=true`);
  if (r.eintraege.length < 5) probleme.push(`Die Wissensdatenbank hat ${r.eintraege.length} Einträge – erwartet mindestens 5`);
  if (Math.min(...r.knopfHoehen) < 44) probleme.push(`Ein Eintrag ist ${Math.min(...r.knopfHoehen)} px hoch (mindestens 44)`);
  if (r.offenAmAnfang !== 0) probleme.push("Beim Öffnen ist schon etwas aufgeklappt");
  if (r.nach1 !== 1 || r.nach2 !== 1) probleme.push(`Es sind ${r.nach1}/${r.nach2} Einträge offen – es darf immer nur einer sein`);
  if (r.nochMasse) probleme.push("Beim Wechsel bleibt der vorige Eintrag stehen");
  if (r.zuKlappbar !== 0) probleme.push("Ein offener Eintrag lässt sich nicht wieder zuklappen");
  if (!r.zu) probleme.push("„Schließen“ schließt das Fenster nicht");

  // ── Die Zahlen, wortgenau aus den Durchführungsbestimmungen ───────────────
  const soll = [
    [/F-Junioren U9/, "die Altersklasse U9"],
    [/3\+1 gegen 3\+1/, "3+1 gegen 3+1 für U8/U9 auf Jugendtoren"],
    [/4\+1 gegen 4\+1/, "4+1 gegen 4+1 als E-Jugend-Form"],
    [/3 gegen 3/, "3 gegen 3 auf Minitore"],
    [/ca\. 25 × 20 m/, "Feldgröße F-Jugend ca. 25 × 20 m"],
    [/ca\. 20 × 16 m/, "Feldgröße Bambini"],
    [/ca\. 30–35 × 25 m/, "Feldgröße E-Jugend"],
    [/1,65 m/, "Torhöhenreduzierung 1,65 m"],
    [/2,0 × 1,2 m/, "Minitor höchstens 2,0 × 1,2 m"],
    [/6 m vor den Toren/, "Schusszone etwa 6 m"],
    [/min\. 4 bis 5/, "Kader min. 4 bis 5"],
    [/6 Spiele mit 7 Minuten/, "Spielzeit U8/U9"],
    [/60 Minuten/, "Spieltag in 60 Minuten"]
  ];
  soll.forEach(([re, was]) => { if (!re.test(r.masse)) probleme.push(`Im Nachschlagen fehlt: ${was}`); });
  if (!/Bei uns weicht der Käfig ab/.test(r.masse)) probleme.push("Die eigene Abweichung (Käfig als 4+1) wird nicht benannt – wer die Tabelle liest, wundert sich sonst am Platz");
  ["Wettlauf zum Ball", "drei Meter", "Wechselzone", "ohne Schiedsrichter"].forEach(t => {
    if (!new RegExp(t, "i").test(r.regeln)) probleme.push(`In den Spielregeln fehlt „${t}“`); });

  // ── Warm up Adler ─────────────────────────────────────────────────────────
  if (r.stufen !== 4) probleme.push(`Die Dach-Übung zeigt ${r.stufen} Stufen-Skizzen statt 4 – der PO sieht nur eine von vier`);
  if (r.stufenNamen.length !== 4) probleme.push(`Die Stufen sind nicht durchnummeriert benannt (${r.stufenNamen.join(" · ")})`);
  if (!r.zugeklappt) probleme.push("Die Stufen stehen offen – vier Skizzen erschlagen die Ansicht der Dach-Übung");
  if (r.fremd !== "") probleme.push("Eine Übung ohne Reihe bekommt trotzdem einen Stufen-Block");
  if (r.teilweise !== 1) probleme.push(`Fehlen drei Stufen, zeigt die App ${r.teilweise} statt der einen vorhandenen`);

  // ── Teamrechnung folgt der Spielform ──────────────────────────────────────
  if (r.nachher === r.vorher) probleme.push(`Nach dem Umstellen auf lauter FUNiño-Felder stehen die Teams unverändert auf „${r.nachher}“`);
  if (!/A:2 /.test(r.vorher + " ")) probleme.push(`Ausgangslage falsch: ${r.vorher}`);
  if (!/A:3/.test(r.nachher)) probleme.push(`A müsste auf FUNiño-Feldern 3 Teams stellen, steht aber auf: ${r.nachher}`);
  if (!/B:2/.test(r.nachher)) probleme.push(`Die von Hand gesetzte Teamzahl wurde überschrieben: ${r.nachher}`);
  if (!r.gemeldet.some(x => /^A:/.test(x))) probleme.push(`Die Änderung wird nicht benannt: ${JSON.stringify(r.gemeldet)}`);
  if (r.nochmal !== 0) probleme.push("Ein zweiter Lauf meldet erneut eine Änderung, obwohl sich nichts geändert hat");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Kachel im Spieltag: ${r.kachelHoehe} px · Fenster ${r.dialog} · ${r.eintraege.length} Einträge: ${r.eintraege.join(" · ")}`);
  zeilen.push(`Immer nur einer offen: ${r.nach1 === 1 && r.nach2 === 1} · zuklappbar ${r.zuKlappbar === 0} · schließt ${r.zu}`);
  zeilen.push(`Zahlen geprüft: ${soll.length} Angaben aus den Durchführungsbestimmungen · eigene Abweichung benannt`);
  zeilen.push(`Warm up Adler: ${r.stufen} Stufen-Skizzen, zugeklappt ${r.zugeklappt} · fremde Übung ohne Block ${r.fremd === ""} · unvollständig ${r.teilweise}`);
  zeilen.push(`Teamrechnung: ${r.vorher} → ${r.nachher} · gemeldet ${JSON.stringify(r.gemeldet)} · zweiter Lauf still ${r.nochmal === 0}`);
  return h.ergebnis("Wissen am Spieltag – Feldmaße, Regeln, Warm up, Teamrechnung", !probleme.length, zeilen.concat(probleme));
};
