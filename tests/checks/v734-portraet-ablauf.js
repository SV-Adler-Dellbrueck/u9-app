/* v734 · Porträt-Ablauf fürs Adler Nest (Auftragspaket Abschnitt 8)
   Rechte, Fristen und „genau einmal“ der Benachrichtigungen prüft tests/sql/v734-portraet-ablauf.sql gegen ein
   echtes Postgres; hier geht es um das, was Eltern, Kinder und Trainer sehen und was die App abschickt.
   a) Eltern: Karte „Kind A ist im nächsten Adler Nest“ mit Frist – nur für das eigene Kind abgefragt
   b) Bogen: ohne Häkchen kein Foto und kein Einreichen; mit Häkchen Foto hochladen (Pfad einreichung/<id>/…),
      Einreichen schickt das Einverständnis mit genau diesem Foto
   c) Zwei Fotos: kein weiteres Hochladen
   d) Einverständnis zurückziehen: Rückfrage, Aufruf mit „nicht einverstanden“, die Fotos werden im Speicher gelöscht
   e) Trainer: Karte „Nächstes Porträt“ mit Ampel (Bogen, Kind, Trainer), eigene Stimme erfassen
   f) Beteiligung: Satz nur, wenn die Datenbank ihn liefert (Schwelle erreicht) – sonst kein Wort dazu
   g) Ohne laufendes Porträt: Kind und Spieltag bestätigen legt die Einreichung an
   h) Kinder: Hinweis „Du bist im nächsten Adler Nest!“ auf die Porträtfragen */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const JPG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const frist = new Date(Date.now() + 3 * 864e5).toISOString();
  const urls = [];
  const einreichung = (extra) => Object.assign({ id: 7, spieler_id: 1, status: "angefragt", frist_eltern: frist, privatfotos: [], einverstanden_am: null }, extra || {});
  let aktuell = einreichung();
  const rpcAufrufe = [];
  const eltern = () => h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    portraet_einreichung: u => { urls.push(String(u)); return /spieler_id=in\.\(1\)/.test(String(u)) ? [aktuell] : [einreichung({ spieler_id: 2 })]; },
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false,
      portraet_einreichen: (u, req) => { let p = {}; try { p = JSON.parse(req.postData() || "{}"); } catch (e) {} rpcAufrufe.push(p);
        return p.p_einverstanden ? [] : (aktuell.privatfotos || []).map(f => ({ pfad: f.pfad })); } } });
  const start = async () => {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: eltern() });
    s.speicher = [];
    await s.page.route(/\/storage\/v1\/object\//, r => { s.speicher.push(r.request().method() + " " + r.request().url().replace(/^.*\/object\//, "")); return r.fulfill({ status: 200, contentType: /authenticated/.test(r.request().url()) ? "image/jpeg" : "application/json", body: /authenticated/.test(r.request().url()) ? JPG : "{}" }); });
    await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3000);
    return s;
  };

  // a–c) Karte, Bogen, Einreichen
  const s = await start();
  const ra = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestBogenKarte !== "function"; i++) await w(100);
    await nestBogenKarte(window._elternKids || []); await w(200);
    const k = document.querySelector("#nest-bogen-slot .nest-bogen-karte");
    const out = { karte: k ? k.textContent.replace(/\s+/g, " ").trim() : null };
    if (k) { k.click(); await w(400); }
    const wahl = document.getElementById("nest-bogen-wahl"), ein = document.getElementById("nest-bogen-einreichen");
    out.vorher = { foto: !!(wahl && wahl.disabled), einreichen: !!(ein && ein.disabled), dialog: document.getElementById("nest-bogen")?.getAttribute("role") };
    document.getElementById("nest-bogen-ok")?.click(); await w(200);
    out.nachher = { foto: !!(document.getElementById("nest-bogen-wahl") && !document.getElementById("nest-bogen-wahl").disabled), einreichen: !document.getElementById("nest-bogen-einreichen")?.disabled };
    const t = document.getElementById("nest-bogen-text"); if (t) t.value = "Beim Schwimmen";
    return out;
  }).catch(e => ({ fehler: String(e) }));
  let rb = {};
  if (!ra.fehler) {
    await s.page.setInputFiles("#nest-bogen-wahl", { name: "a.jpg", mimeType: "image/jpeg", buffer: JPG }); await s.page.waitForTimeout(900);
    await s.page.setInputFiles("#nest-bogen-wahl", { name: "b.jpg", mimeType: "image/jpeg", buffer: JPG }); await s.page.waitForTimeout(900);
    rb = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      const out = { fotos: _nestBogen ? _nestBogen.fotos.map(f => f.pfad) : [], drittes: !!document.getElementById("nest-bogen-wahl"),
        hinweis: /Mehr als zwei Fotos/.test(document.getElementById("nest-bogen")?.textContent || "") };
      document.getElementById("nest-bogen-einreichen")?.click(); await w(800);
      out.zu = !document.getElementById("nest-bogen");
      return out;
    }).catch(e => ({ fehler: String(e) }));
  }
  const fa = s.fehler(); const speicherA = s.speicher.slice(); await s.schliessen();
  const fremd = urls.filter(u => /portraet_einreichung/.test(u) && !/spieler_id=in\.\(1\)/.test(u));
  if (ra.fehler || !/Kind ist im nächsten Adler Nest|Kind A ist im nächsten Adler Nest/.test(ra.karte || "") || !/Porträt-Bogen ausfüllen bis/.test(ra.karte || "") || fremd.length)
    probleme.push("a) " + JSON.stringify({ ...ra, fremd: fremd.length }));
  else zeilen.push(`a) Karte „${ra.karte}“, nur das eigene Kind abgefragt`);
  const auf = rpcAufrufe.find(x => x.p_einverstanden === true);
  if (ra.fehler || !ra.vorher || !ra.vorher.foto || !ra.vorher.einreichen || ra.vorher.dialog !== "dialog" || !ra.nachher.foto || !ra.nachher.einreichen
      || !auf || (auf.p_privatfotos || []).length !== 2 || !(auf.p_privatfotos || []).every(f => /^einreichung\/7\/[^/]+\.jpg$/.test(f.pfad)) || (auf.p_privatfotos[0] || {}).unterschrift !== "Beim Schwimmen"
      || speicherA.filter(x => /^POST heft_media\/einreichung\/7\//.test(x)).length !== 2 || !rb.zu)
    probleme.push("b) " + JSON.stringify({ vorher: ra.vorher, nachher: ra.nachher, auf, speicher: speicherA, zu: rb.zu }));
  else zeilen.push("b) ohne Häkchen gesperrt; mit Häkchen 2 Fotos nach einreichung/7/ hochgeladen und mit Einverständnis eingereicht");
  if (rb.fehler || rb.drittes || !rb.hinweis) probleme.push("c) " + JSON.stringify(rb));
  else zeilen.push("c) nach zwei Fotos kein weiteres Hochladen („Mehr als zwei Fotos gehen nicht“)");
  if (fa.length) probleme.push("Konsole Eltern: " + fa.slice(0, 2).join(" | "));

  // d) Einverständnis zurückziehen
  aktuell = einreichung({ status: "eingereicht", einverstanden_am: new Date().toISOString(), privatfotos: [{ pfad: "einreichung/7/x.jpg", unterschrift: "X" }, { pfad: "einreichung/7/y.jpg", unterschrift: "Y" }] });
  rpcAufrufe.length = 0;
  const s2 = await start();
  const rd = await s2.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestBogenKarte !== "function"; i++) await w(100);
    await nestBogenKarte(window._elternKids || []); await w(200);
    const karte = document.querySelector("#nest-bogen-slot .nest-bogen-karte")?.textContent || "";
    await nestBogenOpen(7); await w(300);
    document.getElementById("nest-bogen-ok")?.click(); await w(300);
    const frage = !!document.getElementById("frage-modal");
    document.getElementById("frage-ja")?.click(); await w(800);
    return { karte, frage, haken: document.getElementById("nest-bogen-ok")?.checked, fotos: document.querySelectorAll("#nest-bogen-fotos img").length };
  }).catch(e => ({ fehler: String(e) }));
  const sp2 = s2.speicher.slice(); await s2.schliessen();
  const nein = rpcAufrufe.find(x => x.p_einverstanden === false);
  const geloescht = sp2.filter(x => /^DELETE heft_media\/einreichung\/7\/[xy]\.jpg/.test(x)).length;
  if (rd.fehler || !/Bogen eingereicht/.test(rd.karte) || !rd.frage || !nein || geloescht !== 2 || rd.haken || rd.fotos !== 0)
    probleme.push("d) " + JSON.stringify({ ...rd, nein: !!nein, geloescht, speicher: sp2 }));
  else zeilen.push("d) Rückfrage, Rückzug an die Datenbank, beide Fotos im Speicher gelöscht, Bogen ohne Fotos");

  // e–g) Trainer
  const trainer = (opt) => h.supabaseAttrappe({ kader: h.kaderZeilen(),
    termine: [{ id: 90, datum: h.tagePlus(6), typ: "turnier", titel: "Testturnier" }],
    portraet_einreichung: opt.einreichung ? [{ id: 7, spieler_id: 2, status: "eingereicht", privatfotos: [{ pfad: "einreichung/7/a.jpg" }], frist_eltern: frist, frist_trainer: frist,
      kader: { id: 2, name: "Kind B", nr: 8 }, termine: { id: 90, datum: h.tagePlus(6), titel: "Testturnier" } }] : [],
    portraet_trainerstimme: opt.stimmen || [], kabine_reporter: [], profiles: [{ id: "t1", anzeigename: "Trainer X" }, { id: "t2", anzeigename: "Trainer Y" }],
    team_config: [{ portraet_schwelle: 90 }], heft_ausgabe: [], portraet_verlauf: [],
    rpc: { portraet_beteiligung: opt.satz, portraet_anfragen: [{ id: 8, status: "angefragt" }] } });
  const lauf = async (opt, fn) => {
    const t = await h.starten({ warten: 1500, supabase: trainer(opt) });
    const r = await t.page.evaluate(fn).catch(e => ({ fehler: String(e) }));
    const g = t.gesendet.slice(), f = t.fehler(); await t.schliessen(); return { r, g, f };
  };
  const ablauf = async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestEditorOpen !== "function"; i++) await w(100);
    await nestEditorOpen(); await w(1200);
    const box = document.getElementById("nest-ablauf"), txt = box ? box.textContent.replace(/\s+/g, " ") : "";
    const out = { txt, ampel: [...document.querySelectorAll("#nest-ampel .nest-ampel")].map(a => a.dataset.ok).join(""), satz: document.getElementById("nest-beteiligung")?.textContent || null,
      stimmeKnopf: Math.round(document.getElementById("nest-stimme-erfassen")?.getBoundingClientRect().height || 0) };
    const ta = document.getElementById("nest-stimme"); if (ta) { ta.value = "Übersicht, Passspiel"; document.getElementById("nest-stimme-erfassen").click(); await w(500); }
    return out;
  };
  const e1 = await lauf({ einreichung: true, satz: "bei jedem Training dabei", stimmen: [{ id: 1, trainer_id: "t2", stichpunkte: "Mutig im Zweikampf" }] }, ablauf);
  const post = e1.g.find(x => /portraet_trainerstimme/.test(x.pfad) && x.methode === "POST");
  if (e1.r.fehler || e1.r.ampel !== "101" || !/Kind B/.test(e1.r.txt) || !/Trainer Y: Mutig im Zweikampf/.test(e1.r.txt) || !post || !/Übersicht, Passspiel/.test(JSON.stringify(post.body || "")) || !/on_conflict=einreichung_id,trainer_id/.test(post.suche || "") || e1.r.stimmeKnopf < 44)
    probleme.push("e) " + JSON.stringify({ ...e1.r, post: post && post.body }));
  else zeilen.push(`e) Ampel Bogen ✓ · Kind ! · Trainer ✓ (${e1.r.ampel}), Stimme von Trainer Y sichtbar, eigene Stimme erfasst`);
  const e2 = await lauf({ einreichung: true, satz: null }, ablauf);
  if (!/bei jedem Training dabei/.test(e1.r.satz || "") || e2.r.satz || /Training dabei\b(?! “)/.test((e2.r.txt || "").replace(/Satz „bei \(fast\) jedem Training dabei“ ab/, "")))
    probleme.push("f) " + JSON.stringify({ mit: e1.r.satz, ohne: e2.r.satz, txt: (e2.r.txt || "").slice(0, 200) }));
  else zeilen.push(`f) über der Schwelle „${e1.r.satz.trim()}“, darunter kein Wort zur Beteiligung`);
  const e3 = await lauf({ einreichung: false }, async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestEditorOpen !== "function"; i++) await w(100);
    await nestEditorOpen(); await w(1200);
    const k = document.getElementById("nest-ablauf-kind"), t = document.getElementById("nest-ablauf-termin");
    if (k) k.value = "3";
    document.getElementById("nest-ablauf-bestaetigen")?.click(); await w(500);
    return { kinder: k ? k.options.length : 0, termin: t ? t.value : null };
  });
  const anf = e3.g.find(x => /rpc\/portraet_anfragen/.test(x.pfad));
  if (e3.r.fehler || !anf || !/"p_spieler":3/.test(JSON.stringify(anf.body || "")) || !/"p_termin":90/.test(JSON.stringify(anf.body || "")))
    probleme.push("g) " + JSON.stringify({ ...e3.r, anf: anf && anf.body }));
  else zeilen.push(`g) Kind und Spieltag bestätigt → portraet_anfragen ${JSON.stringify(anf.body)}`);
  const fe = [].concat(e1.f, e2.f, e3.f); if (fe.length) probleme.push("Konsole Trainer: " + fe.slice(0, 2).join(" | "));

  // h) Kinder-Hinweis
  aktuell = einreichung();
  const s3 = await start();
  const rh = await s3.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof kabineNestHinweisLoad !== "function"; i++) await w(100);
    const d = document.createElement("div"); d.id = "kab-nest-hinweis"; document.body.appendChild(d);
    await kabineNestHinweisLoad(); await w(200);
    return d.textContent.replace(/\s+/g, " ").trim();
  }).catch(e => String(e));
  await s3.schliessen();
  if (!/Du bist im nächsten Adler Nest!/.test(rh) || !/Porträtfragen/.test(rh)) probleme.push("h) " + rh);
  else zeilen.push(`h) Kabine: „${rh}“`);

  return h.ergebnis("v734 Porträt-Ablauf: Elternbogen, Einverständnis, Trainerstimmen, Beteiligung, Kinder-Hinweis", !probleme.length, zeilen.concat(probleme));
};
