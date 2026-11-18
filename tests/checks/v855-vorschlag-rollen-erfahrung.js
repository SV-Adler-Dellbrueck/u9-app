/* v855 · Knopf „Vorschlag“ der Aufstellung (Charles 18.11.2026): nach Rollen-Erfahrung statt nach Bewertung.
   a) Je Rolle wird das Kind gesetzt, das sie in den gespeicherten Aufstellungen am seltensten gespielt hat;
      ins Tor nur ein Kind mit Torwart-Haken.
   b) Die Bewertung ändert den Vorschlag nicht: dieselben Aufstellungen, vertauschte Bewertungen → derselbe Vorschlag.
   c) Ohne gespeicherte Aufstellungen gibt es trotzdem einen Vorschlag ohne Doppelung. */
"use strict";
module.exports = async function (h) {
  const titel = "v855 Aufstellung: „Vorschlag“ nach Rollen-Erfahrung, nicht nach Bewertung";
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const s = await h.starten({ warten: 2200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), spielerprofile: [],
    team_einstellungen: [], profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], termine: [], nominierungen: [], aufstellungen: [] }) });
  const r = await s.page.evaluate(async () => {
    const out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    try { await loadKader(); } catch (e) {}
    if (typeof kombiVorschlagRechnen !== "function") return { alt: true };
    const namen = KADER.filter(k => k.aktiv !== false).map(k => k.name), tw = namen.filter(n => getKader(n).tw), feld = namen.filter(n => !getKader(n).tw);
    out.twDa = tw.length;
    // a) feld[0..3] haben alles schon gespielt, feld[4] nie Aufpasser, feld[5] nie Jäger
    const byKid = {}; namen.forEach(n => { byKid[n] = { tw: 0, auf: 2, fll: 2, flr: 2, jaeg: 2, total: 8 }; });
    byKid[feld[4]].auf = 0; byKid[feld[5]].jaeg = 0; byKid[feld[6]].fll = 1; if (tw[1]) { byKid[tw[0]].tw = 3; }
    const w1 = kombiVorschlagRechnen(namen, byKid);
    out.a = { auf: w1.auf === feld[4], jaeg: w1.jaeg === feld[5], fll: w1.fll === feld[6], tw: tw.length ? (tw.includes(w1.tw) && (tw[1] ? w1.tw !== tw[0] : true)) : w1.tw === "",
      doppelt: new Set(Object.values(w1).filter(Boolean)).size !== Object.values(w1).filter(Boolean).length };
    // b) Bewertungen dürfen nichts ändern
    const bau = (n, wert) => { const k = getKader(n), v = {}; [...DIMS_FELD, ...(k.tw ? DIMS_TW : [])].forEach(d => d.tier.forEach(t => { v[t.n] = wert; }));
      return [bewZeileBauen({ name: n, trainer: "Trainerteam", date: "2026-11-18", foot: "R", age: "8", grp: "flex", eltern: "", att: "2", notes: "", tw: !!k.tw }, v).row]; };
    DB = {}; namen.forEach((n, i) => { DB[n] = bau(n, i < 5 ? 4 : 1); });
    const w2 = JSON.stringify(kombiVorschlagRechnen(namen, byKid));
    DB = {}; namen.forEach((n, i) => { DB[n] = bau(n, i < 5 ? 1 : 4); });
    out.b = w2 === JSON.stringify(kombiVorschlagRechnen(namen, byKid)) && w2 === JSON.stringify(w1);
    // c) Knopf ohne gespeicherte Aufstellungen
    Object.keys(kombiLineup).forEach(k => { kombiLineup[k] = ""; });
    go("kombi"); await new Promise(x => setTimeout(x, 1300));
    const vk = [...document.querySelectorAll("#kombi-content button")].find(b => /Vorschlag/.test(b.textContent));
    if (vk) vk.click(); await new Promise(x => setTimeout(x, 500));
    const nach = [...document.querySelectorAll("#lineup-editor select")].map(x => x.value).filter(Boolean);
    out.c = { n: nach.length, doppelt: new Set(nach).size !== nach.length, knopf: !!vk };
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["kombiVorschlagRechnen fehlt (Stand vor v855)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.a.auf || !r.a.jaeg || !r.a.fll || !r.a.tw || r.a.doppelt) probleme.push("a) " + JSON.stringify(r.a)); else zeilen.push(`a) je Rolle das Kind mit der wenigsten Erfahrung; Tor nur mit Torwart-Haken (${r.twDa} im Kader)`);
  if (!r.b) probleme.push("b) der Vorschlag ändert sich mit den Bewertungen"); else zeilen.push("b) Bewertungen ändern den Vorschlag nicht");
  if (!r.c.knopf || r.c.n < 4 || r.c.doppelt) probleme.push("c) " + JSON.stringify(r.c)); else zeilen.push(`c) ohne gespeicherte Aufstellungen: ${r.c.n} Positionen, keine Doppelung`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
