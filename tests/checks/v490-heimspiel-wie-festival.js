/* v490 – PO: „Anpfiff dürfen nur die Adler-Trainer, kein externer. Das gleiche Vorgehen brauchen
   wir für jedes Heimspiel, auch wenn es kein Festival ist. Bei einem Heimspiel kommt nur ein
   Gegner, der stellt aber evtl. mehrere Teams, so wie wir auch – also die Funktion/Kachel auch
   bei den Heimspielen hinterlegen." Geprueft: Anlegen aus einem Heimspiel-Termin nimmt den
   Gegner mit und merkt sich den Anlass, Wortwahl „Heimspiel", das Banner im Spieltag erscheint
   beim Heimspiel und nicht beim Auswaertsspiel, der Plan entsteht mit vier Teams, und die
   Gast-Seite hat in keiner Phase einen Anpfiff-Knopf. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heim = h.tagePlus(3), auswaerts = h.tagePlus(5);
  const termine = [
    { id: 1, datum: heim, typ: "spiel", heim: true, gegner: "SC Wahn Grengel", uhrzeit: "10:15", titel: "", trainer_status: {} },
    { id: 2, datum: auswaerts, typ: "spiel", heim: false, gegner: "SV Rath-Heumar", uhrzeit: "11:00", titel: "", trainer_status: {} }
  ];
  const angelegt = [];
  const hei = (u, req) => {
    if (req.method() === "POST") { angelegt.push(JSON.parse(req.postData() || "{}")); return [{ id: 9, slug: "x", ...JSON.parse(req.postData() || "{}") }]; }
    if (req.method() === "PATCH") return { status: 204, body: "" };
    return u.searchParams.get("id") ? [{ id: 9, slug: "x", datum: heim, name: "Heimspiel", edit_code: "abc", ...(angelegt[0] || {}) }] : [];
  };
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], gegner: [], heimturnier: hei }), hoehe: 1400 });
  const r = await s.page.evaluate(async ({ heim, auswaerts }) => {
    if (typeof fstWort !== "function") return { fehlt: "fstWort" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    const warte = ms => new Promise(r => setTimeout(r, ms));
    // 1) Banner im Spieltag: Heimspiel ja, Auswärtsspiel nein
    const banner = document.getElementById("spieltag-turnier-banner");
    const sel = document.getElementById("spieltag-date");
    _spieltagTypen = { [heim]: "spiel", [auswaerts]: "spiel" };
    _spieltagHeim = { [heim]: true, [auswaerts]: false };
    _spieltagNamen = { [heim]: "", [auswaerts]: "" };
    if (sel) sel.innerHTML = `<option value="${heim}">heim</option><option value="${auswaerts}">auswärts</option>`;
    if (sel) sel.value = heim; _spieltagTurnierBanner();
    const bHeim = banner ? { hidden: banner.hidden, text: banner.textContent.replace(/\s+/g, " ").trim() } : null;
    if (sel) sel.value = auswaerts; _spieltagTurnierBanner();
    const bAus = banner ? banner.hidden : null;
    // 2) Anlegen aus dem Heimspiel-Termin
    await htOpen(heim, "", "heimspiel"); await warte(400);
    const kopf = document.getElementById("hturnier-modal")?.textContent.replace(/\s+/g, " ").trim() || "";
    const nameVorschlag = document.getElementById("ht-name")?.value || "";
    document.getElementById("ht-datum").value = heim;
    await htNeu(); await warte(600);
    const cfg = (_HT || {}).config || {};
    const body = document.getElementById("ht-body")?.textContent.replace(/\s+/g, " ").trim() || "";
    const vereine = (cfg.vereine || []).map(v => `${v.name}:${v.teams}`);
    const wort = fstWort(_HT);
    // 3) Plan mit vier Teams
    await fstPlanErstellen(); await warte(500);
    const teams = (_HT.teams || []).length, spiele = (_HT.plan || []).length;
    const felder = ((_HT.config || {}).felder || []).length;   // htPatch tauscht das config-Objekt aus
    // 4) Gast-Seite: in keiner Phase ein Anpfiff-Knopf
    document.getElementById("hturnier-modal")?.remove();
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    const knoepfe = [];
    const zustaende = [null, { runde: 1, start: new Date().toISOString(), dauer: 8 }, { runde: 1, start: new Date(Date.now() - 9 * 60000).toISOString(), dauer: 8 }];
    for (const u of zustaende) {
      if (u) _HT.config.uhr = u; else delete _HT.config.uhr;
      _htPub = { slug: "x", code: "abc", wrap, row: _HT }; _fstUhrMarke = "";
      _fstPublicRender(wrap, _HT); await warte(50);
      const uhr = wrap.querySelector("#fst-uhr");
      knoepfe.push({ phase: fstUhrStand(_HT).phase, n: uhr ? uhr.querySelectorAll("button").length : -1, txt: uhr ? uhr.textContent.replace(/\s+/g, " ").trim().slice(0, 34) : "" });
    }
    // 5) Anpfiff von der Gast-Seite aus greift nicht
    const vorher = JSON.stringify(_HT.config.uhr || null);
    await fstAnpfiff(2); await warte(200);
    const nachher = JSON.stringify(_HT.config.uhr || null);
    _htPub = null;
    return { bHeim, bAus, kopf: /Heimspiel bei uns/.test(kopf), nameVorschlag, anlass: cfg.anlass, vereine, wort, body, teams, spiele, felder, knoepfe, gastAnpfiff: vorher === nachher };
  }, { heim, auswaerts });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Heimspiel wie Festival", false, probleme); }
  if (!r.bHeim || r.bHeim.hidden) probleme.push("Beim Heimspiel fehlt die Planen-Kachel im Spieltag");
  else if (!/Heimspiel planen/.test(r.bHeim.text)) probleme.push(`Kachel sagt „${r.bHeim.text.slice(0, 60)}“ statt „Heimspiel planen“`);
  if (r.bAus !== true) probleme.push("Beim Auswärtsspiel darf die Kachel nicht erscheinen");
  if (!r.kopf) probleme.push("Fenster-Überschrift nennt das Heimspiel nicht");
  if (!/^Heimspiel /.test(r.nameVorschlag)) probleme.push(`Namensvorschlag „${r.nameVorschlag}“`);
  if (r.anlass !== "heimspiel") probleme.push(`Anlass ${r.anlass} statt heimspiel`);
  if (r.wort !== "Heimspiel") probleme.push(`fstWort sagt ${r.wort}`);
  if (r.vereine.length !== 2 || !/Wahn Grengel/.test(r.vereine[1] || "")) probleme.push(`Gegner nicht übernommen: ${JSON.stringify(r.vereine)}`);
  const tz = r.vereine.map(v => v.split(":").pop());
  if (tz[0] !== tz[1]) probleme.push(`Gegner startet mit ${tz[1]} Teams, wir mit ${tz[0]} – sollte gespiegelt sein`);
  if (!/Wer spielt mit\?/.test(r.body)) probleme.push("Abschnitt 1 heißt beim Heimspiel nicht „Wer spielt mit?“");
  if (r.teams !== 4 || r.spiele !== r.felder * 3) probleme.push(`Plan: ${r.teams} Teams, ${r.spiele} Spiele auf ${r.felder} Feldern – erwartet 3 Runden`);
  if (r.felder !== 2) probleme.push(`${r.felder} Felder bei vier Teams – erwartet 2`);
  const mitKnopf = r.knoepfe.filter(k => k.n > 0);
  if (mitKnopf.length) probleme.push(`Gast-Seite zeigt Anpfiff-Knöpfe in Phase ${mitKnopf.map(k => k.phase).join(", ")}`);
  if (!r.gastAnpfiff) probleme.push("fstAnpfiff wirkt auf der Gast-Seite");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  if (r.bHeim && !/⚽/.test(r.bHeim.text)) probleme.push("Die Kachel trägt beim Heimspiel noch das Turnier-Zeichen");
  zeilen.push(`Spieltag: Heimspiel „${(r.bHeim && r.bHeim.text || "").slice(0, 46)}“ · auswärts verborgen ${r.bAus}`);
  zeilen.push(`Angelegt: „${r.nameVorschlag}“, Anlass ${r.anlass}, Vereine ${JSON.stringify(r.vereine)} → ${r.teams} Teams, ${r.spiele} Spiele auf ${r.felder} Feldern`);
  zeilen.push(`Gast-Seite: ${r.knoepfe.map(k => k.phase + " " + k.n + " Knöpfe").join(" · ")} · Anpfiff von aussen wirkungslos ${r.gastAnpfiff}`);
  return h.ergebnis("Heimspiel wie Festival: Gegner aus dem Termin, eigene Wortwahl, Anpfiff nur intern", !probleme.length, zeilen.concat(probleme));
};
