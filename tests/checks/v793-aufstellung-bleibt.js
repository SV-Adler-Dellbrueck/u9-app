/* v793 · Charles 06.11.: „Wenn ich die Aufstellung änder, soll das direkt gespeichert werden, wenn ich die Seite schließe.“
   Torwart, Feld und Bank am Spieltag lagen nur im Speicher. Jetzt gehen sie je Spieltag und Team in die Tabelle
   spieltag_aufstellung (und lokal).
   a) Änderung → nach 0,7 s lokal gesichert und eine Zeile mit Schlüssel (Datum) in der Tabelle: Torwart, Feld, Bank, Spielform
   b) Neu aufbauen (wie nach dem Neuladen): dieselbe Aufstellung steht wieder da – auch wenn nur der Server sie noch hat
   c) Nominierung ändert sich: wer nicht mehr nominiert ist, fliegt raus; wer neu dazukommt, steht auf der Bank
   d) Team 2 hat seine eigene Aufstellung (Schlüssel __t2) und übernimmt die von Team 1 nie
   e) Seite schließen (pagehide) schreibt sofort, ohne die 0,7 s abzuwarten
   f) andere Spielform als gespeichert → die gespeicherte Aufstellung wird nicht übergestülpt */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const db = {}, posts = [], hist = {};
  const s = await h.starten({ hoehe: 1800, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [], nominierungen: [], matchday: [],
    spieltag_aufstellung: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); db[b.schluessel] = b; (hist[b.schluessel] = hist[b.schluessel] || []).push(b.daten); posts.push({ schluessel: b.schluessel, t: Date.now() }); return { status: 201, body: "" }; }
      const k = (u.searchParams.get("schluessel") || "").replace(/^eq\./, "");
      return db[k] ? [{ daten: db[k].daten }] : [];
    }
  }) });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async ({ K }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    if (typeof aufAnwenden !== "function") return { fehlt: true };
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    TEAM_ANZAHL = 2; spieltagTeamKartenRender();
    let nom = K.slice(1, 7);                       // B..G
    window.nominierteSpieler = () => nom.slice();
    try { localStorage.removeItem("adler_spieltag_auf"); } catch (e) {}
    const lokal = () => { try { return JSON.parse(localStorage.getItem("adler_spieltag_auf") || "{}"); } catch (e) { return {}; } };
    const stand = () => ({ tw: rotTW, feld: rotField.slice(), bank: rotBench.slice() });
    const out = {};
    // Team 1, 4+1
    spieltagTeam = 1; tbFormation = "4+1"; const key1 = spieltagKey(); out.key1 = key1;
    nomApplyToTools(); await w(120);
    out.start = stand();
    // a) Änderungen: Torwart setzen, zwei Feldspieler tauschen
    rotSetTW(K[5]); rotTap(K[1]); rotTap(K[3]); await w(900);
    out.geaendert = stand(); out.lokalA = lokal()[key1] || null;
    // b) wie nach dem Neuladen
    rotTW = null; rotField = []; rotBench = []; nomApplyToTools(); await w(300);
    out.neu = stand();
    // nur der Server hat sie noch
    try { localStorage.removeItem("adler_spieltag_auf"); } catch (e) {}
    rotTW = null; rotField = []; rotBench = []; nomApplyToTools(); await w(400);
    out.nurServer = stand();
    // c) Nominierung ändert sich: K[2] raus, K[8] dazu
    nom = [K[1], K[3], K[4], K[5], K[6], K[8]];
    nomApplyToTools(); await w(400);
    out.nomNeu = stand();
    // d) Team 2
    spieltagTeam = 2; const key2 = spieltagKey(); out.key2 = key2;
    nom = K.slice(1, 7); nomApplyToTools(); await w(400);
    out.team2 = stand();
    rotSetTW(K[6]); await w(900);
    spieltagTeam = 1; nom = K.slice(1, 7); nomApplyToTools(); await w(400);
    out.zurueck1 = stand();
    // e) schließen
    const vor = window.__postsAnzahl || 0;
    rotSetTW(K[2]); window.dispatchEvent(new Event("pagehide")); await w(150);
    out.pagehide = stand();
    // f) andere Spielform
    tbFormation = "funino"; rotTW = null; rotField = []; rotBench = []; nomApplyToTools(); await w(300);
    out.funino = stand();
    return out;
  }, { K });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v793 Aufstellung bleibt", false, ["aufAnwenden fehlt"]);
  const J = JSON.stringify;
  if (J(r.start.feld) !== J([K[1], K[2], K[3], K[4]]) || J(r.start.bank) !== J([K[5], K[6]])) probleme.push("Ausgang: " + J(r.start));
  if (r.geaendert.tw !== K[5] || J(r.geaendert.feld) !== J([K[3], K[2], K[1], K[4]])) probleme.push("a) geändert: " + J(r.geaendert));
  const db1 = (hist[r.key1] || []).find(x => x.tw === K[5] && J(x.feld) === J(r.geaendert.feld));
  if (!r.lokalA || r.lokalA.tw !== K[5] || J(r.lokalA.feld) !== J(r.geaendert.feld) || !db1 || db1.tw !== K[5] || J(db1.feld) !== J(r.geaendert.feld) || db1.form !== "4+1") probleme.push("a) gesichert: " + J({ lokal: r.lokalA, server: db1 }));
  zeilen.push(`a) Änderung gesichert: lokal und in der Tabelle (Schlüssel ${r.key1}), Torwart, Feld in der neuen Reihenfolge, Spielform`);
  if (J(r.neu) !== J(r.geaendert)) probleme.push("b) nach dem Neuaufbau: " + J(r.neu));
  if (J(r.nurServer) !== J(r.geaendert)) probleme.push("b) nur Server: " + J(r.nurServer));
  zeilen.push("b) Neu aufgebaut: dieselbe Aufstellung – aus dem lokalen Speicher und, wenn der leer ist, vom Server");
  if (r.nomNeu.tw !== K[5] || r.nomNeu.feld.includes(K[2]) || r.nomNeu.bank.includes(K[2]) || !r.nomNeu.bank.includes(K[8]) || r.nomNeu.feld.length + r.nomNeu.bank.length + 1 !== 6) probleme.push("c) Nominierung: " + J(r.nomNeu));
  zeilen.push("c) Ein Kind nicht mehr nominiert → raus, ein neues → auf der Bank, Torwart bleibt");
  if (!/__t2$/.test(r.key2) || r.team2.tw !== null || J(r.zurueck1.feld) !== J(r.geaendert.feld) || r.zurueck1.tw !== K[5]) probleme.push("d) Teams: " + J({ team2: r.team2, zurueck: r.zurueck1 }));
  if (!(hist[r.key2] || []).some(x => x.tw === K[6])) probleme.push("d) Team 2 nicht gesichert: " + J(hist[r.key2]));
  zeilen.push(`d) Team 2 (${r.key2}) hat seine eigene Aufstellung; Team 1 kommt unverändert zurück`);
  if (!db[r.key1] || db[r.key1].daten.tw !== K[2]) probleme.push("e) pagehide schrieb nicht: " + J(db[r.key1] && db[r.key1].daten));
  zeilen.push("e) Seite schließen (pagehide) schreibt sofort");
  if (r.funino.tw !== null || J(r.funino.feld) !== J([K[1], K[2], K[3]])) probleme.push("f) andere Spielform: " + J(r.funino));
  zeilen.push("f) Andere Spielform als gespeichert → frisch aus der Nominierung, nichts übergestülpt");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v793 Aufstellung am Spieltag bleibt gespeichert", !probleme.length, probleme.length ? probleme : zeilen);
};
