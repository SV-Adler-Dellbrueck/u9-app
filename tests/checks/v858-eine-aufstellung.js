/* v858 · Eine Aufstellung (Charles 18.11.2026): das Mini-Feld am Spieltag ist der einzige Ort.
   a) Die Spieltag-Seite hat keine Kachel „Aufstellung“ mehr; „Analyse“ bleibt.
   b) „Feld & Bank fair besetzen“: Es starten die Kinder mit der wenigsten Einsatzzeit – auch wenn andere
      höher bewertet sind; die Rollen bekommt, wer sie am seltensten hatte; ins Tor das Torwart-Kind mit
      der wenigsten Tor-Erfahrung.
   c) Beim ersten Anpfiff wird die Startaufstellung mit Rollen gespeichert (daten.start); ein zweiter
      Anpfiff ändert sie nicht; die Rollen-Erfahrung zählt sie.
   d) Unter dem Feld stehen Teilen, Als Bild und Drucken (≥ 44 px); die Positionen folgen der Spielform. */
"use strict";
module.exports = async function (h) {
  const titel = "v858 Eine Aufstellung: Mini-Feld als einziger Ort, fair besetzen ohne Bewertung, Startaufstellung beim Anpfiff";
  const probleme = [], zeilen = [];
  const heute = h.heute(), K = h.KINDER;
  const kader = h.kaderZeilen(); kader.forEach(k => { k.tw = false; }); kader[0].tw = true; kader[1].tw = true;
  const gespeichert = {};
  const s = await h.starten({ warten: 2200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader, nominierungen: [], matchday: [], match_actions: [], spielerprofile: [], team_einstellungen: [], aufstellungen: [],
    // Saison-Einsatzzeiten: Kind C bis Kind F haben viel gespielt, Kind G bis Kind J wenig
    einsatzzeiten: [K[2], K[3], K[4], K[5]].map(n => ({ spieler: n, feld_sek: 3000 })).concat([K[6], K[7], K[8], K[9]].map(n => ({ spieler: n, feld_sek: 300 }))),
    spieltag_aufstellung: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); gespeichert[b.schluessel] = b; return { status: 201, body: "[]" }; }
      // Erfahrung aus einem früheren Spiel: Kind A stand im Tor, Kind G war Aufpasser
      const alt = { schluessel: "2026-09-05", daten: { start: { tw: K[0], rollen: { auf: [K[6]], fll: [K[2]], flr: [K[3]], jaeg: [K[4]] } } } };
      return [alt, ...Object.values(gespeichert)];
    },
    termine: [{ id: 1, datum: heute, typ: "spiel", heim: true, uhrzeit: "10:15", titel: "Spieltag", trainer_status: {} }] }) });
  const r = await s.page.evaluate(async ({ heute, K }) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    document.getElementById("pin-gate")?.remove(); const app = document.getElementById("main-app"); if (app) app.style.display = "block";
    if (typeof aufRollenVerteilen !== "function") return { alt: true };
    await loadKader();
    // a)
    const d = document.createElement("div"); d.innerHTML = _kachelInhalt("spieltag");
    out.kacheln = [...d.querySelectorAll(".k-raster button")].map(b => b.textContent.trim());
    // Bewertungen: Kind C bis Kind F hoch bewertet – dürfen nichts ändern
    DB = {}; [K[2], K[3], K[4], K[5]].forEach(n => { DB[n] = [{ name: n, datum: "2026-11-18", total_score: 95, scores: "[100,100,100,100,100]", radios: {} }]; });
    window.spieltagRawDate = () => heute; window.spieltagKey = () => heute; window.sbToken = () => "t";
    const squad = K.slice(0, 10); window.nominierteSpieler = () => squad.slice();
    tbFormation = "4+1"; if (typeof rollenExpClear === "function") rollenExpClear();
    let box = document.getElementById("auf-panel"); if (!box) { box = document.createElement("div"); box.id = "auf-panel"; document.body.appendChild(box); }
    let live = document.getElementById("rot-live"); if (!live) { live = document.createElement("div"); live.id = "rot-live"; document.body.appendChild(live); }
    await magicLineup(); await w(200);
    out.b = { tw: rotTW, feld: rotField.slice(), bank: rotBench.slice() };
    // d)
    out.knoepfe = [...box.querySelectorAll("button")].filter(b => /Teilen|Als Bild|Drucken/.test(b.textContent)).map(b => b.textContent.trim() + ":" + parseInt(getComputedStyle(b).minHeight || "0"));   // das Feld liegt in einer verborgenen Seite – gemessen wird die Mindesthöhe
    const merk = tbFormation; tbFormation = "funino"; out.funino = aufPositionen().pos.map(p => p.role); tbFormation = merk;
    // c)
    rotElapsed = 0; rotStart(); await w(900); rotStop();
    const feldVorher = rotField.slice();
    rotField = [rotField[1], rotField[0], ...rotField.slice(2)]; rotStart(); await w(900); rotStop(); rotField = feldVorher;
    if (typeof rollenExpClear === "function") rollenExpClear();
    const exp = await rollenExpFetch(); out.exp = { games: exp.games, gAuf: (exp.byKid[K[6]] || {}).auf || 0 };
    return out;
  }, { heute, K }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["aufRollenVerteilen fehlt (Stand vor v858)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.kacheln.some(k => /Aufstellung/.test(k)) || !r.kacheln.some(k => /Analyse/.test(k))) probleme.push("a) Spieltag-Kacheln: " + r.kacheln.join(", ")); else zeilen.push("a) Spieltag-Kacheln: " + r.kacheln.join(", "));
  // Kind A hat keine Einsatzzeit (0) und startet zuerst; danach drei der vier mit wenig Zeit – keins der hoch bewerteten Kinder C bis F.
  const wenig = [K[0], K[6], K[7], K[8], K[9]];
  if (r.b.tw !== K[1]) probleme.push(`b) Tor: ${r.b.tw} (erwartet das Torwart-Kind ohne Tor-Erfahrung)`);
  else if (r.b.feld.length !== 4 || r.b.feld.some(n => !wenig.includes(n)) || !r.b.feld.includes(K[0])) probleme.push("b) Starter: " + r.b.feld.join(", ") + " – erwartet die mit der wenigsten Einsatzzeit");
  else if (r.b.feld[0] === K[6]) probleme.push("b) Aufpasser ist das Kind, das schon Aufpasser war: " + r.b.feld.join(", "));
  else zeilen.push(`b) Tor ${r.b.tw}, Feld ${r.b.feld.join(" · ")} – wenig gespielt, Bewertung ohne Einfluss, Aufpasser nicht wieder ${K[6]}`);
  const start = gespeichert[heute] && gespeichert[heute].daten && gespeichert[heute].daten.start;
  if (!r.exp || r.exp.games !== 2) probleme.push("c) Spiele in der Rollen-Erfahrung: " + JSON.stringify(r.exp));
  else if (!start || start.tw !== r.b.tw || (start.rollen.auf || [])[0] !== r.b.feld[0] || (start.rollen.jaeg || [])[0] !== r.b.feld[3]) probleme.push("c) gespeicherte Startaufstellung passt nicht zur ersten: " + JSON.stringify(start));
  else zeilen.push("c) Startaufstellung beim Anpfiff gespeichert, zweiter Anpfiff ändert sie nicht, Rollen-Erfahrung zählt 2 Spiele");
  if (r.knoepfe.length !== 3 || r.knoepfe.some(k => +k.split(":")[1] < 44) || r.funino.join(",") !== "Aufpasser,Flitzer L,Flitzer R") probleme.push("d) " + JSON.stringify([r.knoepfe, r.funino]));
  else zeilen.push("d) Teilen, Als Bild, Drucken (44 px); FUNiño: " + r.funino.join(" · "));
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
