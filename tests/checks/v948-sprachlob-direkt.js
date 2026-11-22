/* v948 · Charles 22.11. (Bildschirmfoto Trainer-Startseite): Das To-do „Du bist dran: Sprachlob für die Kabine“ führte in die
   Spielerverwaltung. Jetzt:
   a) Das To-do öffnet direkt das Sprachlob-Fenster mit dem Termin und hat ein „✕“ zum Ausblenden (bleibt weg je Termin).
   b) Fenster im aktuellen Stil (fensterAuf, Kopf „Sprachlob an die Kinder“), großer runder Aufnahme-Knopf (≥ 72 px).
   c) „Ganzes Team“ (vorgewählt: alle, die laut Nominierung des Termins dabei waren) oder „Einzelne Kinder“ (Auswahl, erst leer).
   d) Ohne Nominierung: das ganze aktive Team, mit Hinweis. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v948 Sprachlob direkt aus dem To-do: Team oder einzelne Kinder, ✕ zum Ausblenden, neuer Stil";
  const probleme = [], zeilen = [], K = h.KINDER;
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const zeile = views.split("\n").find(l => /Du bist dran: Sprachlob/.test(l)) || "";
  if (/kaderEditOpen/.test(zeile) || !/botschaftOpen\(/.test(zeile) || !/wegAct:`lobTodoWeg/.test(zeile)) probleme.push("a) To-do-Zeile: " + zeile.trim().slice(0, 160));
  const gestern = h.tagePlus(-1);
  const nom = {}; K.slice(0, 4).forEach((n, i) => { nom[String(i + 1)] = "dabei"; }); nom["5"] = "nicht";
  let mitNom = true;
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), anwesenheit: [], trainingsplan: [], trainingsgruppen: [],
    nominierungen: () => mitNom ? [{ datum: gestern + "__nom", data: nom }] : [] }) });
  const r = await s.page.evaluate(async (gestern) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    await loadKader(); document.getElementById("pin-gate")?.remove();
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    for (let i = 0; i < 50 && typeof botschaftOpen !== "function"; i++) await w(100);
    const out = {};
    await botschaftOpen({ id: 77, datum: gestern, typ: "spiel", titel: "Kinderfestival" }); await w(200);
    const m = document.getElementById("botschaft-modal");
    out.stil = !!(m && m.classList.contains("fenster") && m.querySelector(".fenster-karte"));
    out.kopf = txt(m && m.querySelector(".fenster-karte > div"));
    const mic = m && m.querySelector(".bot-mic"); out.mic = mic ? Math.round(mic.getBoundingClientRect().width) : 0;
    out.team = txt(document.getElementById("bot-m-team")); out.send1 = _botSend.size; out.kinderSichtbar1 = !document.getElementById("bot-kinder").hidden;
    out.quelle = txt(m.querySelector(".bot-quelle"));
    document.getElementById("bot-m-einzeln").click(); await w(50);
    out.send2 = _botSend.size; out.kinderSichtbar2 = !document.getElementById("bot-kinder").hidden;
    const chip = document.querySelector("#bot-kinder button"); if (chip) chip.click(); await w(50); out.send3 = _botSend.size;
    document.getElementById("bot-m-team").click(); await w(50); out.send4 = _botSend.size;
    botschaftZu();
    window.__ohneNom = true;
    return out;
  }, gestern).catch(x => ({ fehler: String(x) }));
  mitNom = false;
  const r2 = await s.page.evaluate(async (gestern) => {
    await botschaftOpen({ id: 78, datum: gestern, typ: "spiel", titel: "Test" }); await new Promise(x => setTimeout(x, 200));
    const q = document.querySelector("#botschaft-modal .bot-quelle"); const out = { n: _botKinder.length, kader: KADER.filter(k => k.aktiv !== false).length, quelle: q ? q.textContent : "" };
    botschaftZu();
    const div = document.createElement("div"); div.className = "todo-zeile"; div.innerHTML = '<button id="x">✕</button>'; document.body.appendChild(div);
    lobTodoWeg(77, document.getElementById("x")); out.zeileWeg = !document.body.contains(div); out.gemerkt = localStorage.getItem("adler_lobtodo_weg_77");
    return out;
  }, gestern).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.fehler || r2.fehler) probleme.push(r.fehler || r2.fehler);
  else {
    if (!r.stil || !/Sprachlob an die Kinder/.test(r.kopf)) probleme.push(`b) Stil ${r.stil}, Kopf „${r.kopf}“`);
    if (r.mic < 72) probleme.push("b) Aufnahme-Knopf " + r.mic + " px");
    if (r.send1 !== 4 || r.kinderSichtbar1 || !/Ganzes Team · 4/.test(r.team) || !/dabei waren/.test(r.quelle)) probleme.push(`c) Team: ${r.send1}, Auswahl sichtbar ${r.kinderSichtbar1}, „${r.team}“, „${r.quelle}“`);
    if (r.send2 !== 0 || !r.kinderSichtbar2 || r.send3 !== 1 || r.send4 !== 4) probleme.push(`c) Einzeln: ${r.send2}/${r.kinderSichtbar2}, nach Tipp ${r.send3}, zurück Team ${r.send4}`);
    if (r2.n !== r2.kader || !/ganze aktive Team/.test(r2.quelle)) probleme.push(`d) ohne Nominierung ${r2.n} von ${r2.kader}, „${r2.quelle}“`);
    if (!r2.zeileWeg || r2.gemerkt !== "1") probleme.push(`a) ✕: Zeile weg ${r2.zeileWeg}, gemerkt ${r2.gemerkt}`);
  }
  const fehler = fe.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) To-do → botschaftOpen(Termin), ✕ merkt sich den Termin · b) Fenster neu, Mikro ${r.mic} px · c) Team ${r.send1}, einzeln 0 → 1 · d) ohne Nominierung ${r2.n} Kinder`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
