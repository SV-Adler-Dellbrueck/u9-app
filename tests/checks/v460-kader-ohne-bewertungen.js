/* v460 – „der Kader ist leer, alle Kinder sind weg". Die Kaderliste stand auf
   Object.keys(DB) – den Namen aus `spielerprofile`. Nach dem Saisonstart-Reset (v446) ist
   die Tabelle leer, also war die ganze Ansicht leer, obwohl der Kader vollstaendig ist.
   Geprueft: ohne jede Bewertung stehen alle aktiven Kinder da, ausgetragene nicht,
   der TW-Filter greift ueber den Kader, Rollenfilter bleiben leer, und mit Bewertung
   erscheinen die Werte. */
module.exports = async function (h) {
  const K = h.KINDER, RAUS = K[6], probleme = [], zeilen = [];
  const rows = h.kaderZeilen({ inaktiv: [RAUS] }); rows[0].tw = true; rows[1].tw = true;
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: rows, spielerprofile: [] }), hoehe: 2000 });
  const r = await s.page.evaluate(async ({ K, RAUS }) => {
    await loadKader();
    DB = {}; window._dbLoaded = true;
    const zeilen = () => [...document.querySelectorAll("#kader-content tbody tr")].map(t => t.textContent.replace(/\s+/g, " ").trim());
    const out = {};
    go("kader"); await new Promise(r => setTimeout(r, 400));
    activeFilter = "all"; renderKader();
    out.leer = zeilen();
    out.text = document.getElementById("kader-content").textContent.replace(/\s+/g, " ").trim().slice(0, 200);
    // v937: Solange Bewerten gesperrt ist, führt der Knopf ins Profil statt auf die gesperrte Seite.
    out.bewertenKnopf = !!document.querySelector(typeof bewFreigegeben === "function" && !bewFreigegeben() ? '#kader-content button.kader-profil' : '#kader-content button[onclick^="kaderBewerten"]');
    activeFilter = "tw"; renderKader(); out.tw = zeilen().length;
    activeFilter = "aufpasser"; renderKader(); out.rolle = document.getElementById("kader-content").textContent.includes("Kein Spieler für diesen Filter");
    // jetzt eine echte Bewertung fuer ein Kind
    DB[K[0]] = [{ name: K[0], datum: "2026-09-01", scores: "[60,50,40,0,0]", total_score: 55, pot_score: 70, position: "aufpasser", trainer: "T" }];
    activeFilter = "all"; renderKader();
    out.mitBewertung = zeilen().length;
    out.werte = zeilen().find(z => z.startsWith("1 " + K[0]) || z.includes(K[0])) || "";
    out.hinweis = document.getElementById("kader-content").textContent.includes("noch nicht bewertet");
    activeFilter = "aufpasser"; renderKader(); out.rolleJetzt = zeilen().length;
    activeFilter = "all";
    return out;
  }, { K, RAUS });
  const fehler = s.fehler(); await s.schliessen();
  if (r.leer.length !== 14) probleme.push(`ohne Bewertungen ${r.leer.length} Zeilen statt 14`);
  if (r.leer.some(z => z.includes(RAUS))) probleme.push("ausgetragenes Kind steht in der Liste");
  if (/Kein Spieler für diesen Filter/.test(r.text)) probleme.push("Liste meldet weiter „Kein Spieler für diesen Filter“");
  if (!r.bewertenKnopf) probleme.push("kein Weg zur ersten Bewertung (gesperrt: kein Weg ins Profil)");
  if (r.tw !== 2) probleme.push(`TW-Filter zeigt ${r.tw} statt 2 (aus dem Kader, nicht aus Bewertungen)`);
  if (!r.rolle) probleme.push("Rollenfilter ohne Bewertungen muesste leer melden");
  if (r.mitBewertung !== 14) probleme.push(`mit einer Bewertung ${r.mitBewertung} Zeilen statt 14`);
  /* v851: Die Liste nennt die Stärke in Worten statt Gesamt- und Tempo-Prozent. */
  if (!/Technik|Spielintelligenz|Dynamik|Lernen|ausgeglichen/.test(r.werte) || /%/.test(r.werte)) probleme.push("Stärke des bewerteten Kindes fehlt oder steht in Prozent: " + r.werte);
  if (!r.hinweis) probleme.push("Hinweis „noch nicht bewertet“ fehlt");
  if (r.rolleJetzt !== 1) probleme.push(`Rollenfilter zeigt ${r.rolleJetzt} statt 1`);
  // v871: Der Aufstellungs-Editor (md-aufstellung.js) ist entfernt – sein Teil entfällt.
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`ohne Bewertungen ${r.leer.length} Zeilen · TW ${r.tw} · mit Bewertung ${r.mitBewertung}, Rollenfilter ${r.rolleJetzt}`);
  return h.ergebnis("Kader zeigt die Mannschaft, auch ohne eine einzige Bewertung", !probleme.length, zeilen.concat(probleme));
};
