/* v853 · Seite „Aufstellung“ (Charles 18.11.2026): keine Bestenliste.
   a) Mit bewerteten Kindern zeigt die Seite weder „Beste Aufstellung“ noch „Weitere gute Kombinationen“
      noch ein Prozentzeichen und nennt im Hinweis kein einzelnes Kind.
   b) Der Editor ist nicht vorbelegt; „Vorschlag“ füllt die fünf Positionen ohne Doppelung.
   c) Der Weg in den Spieltag bleibt; der Hinweis-Kasten und die Knöpfe sind mindestens 44 px hoch. */
"use strict";
module.exports = async function (h) {
  const titel = "v853 Aufstellung: keine „Beste Aufstellung“ in Prozent, Editor leer, „Vorschlag“ bleibt";
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 2200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), spielerprofile: [],
    team_einstellungen: [], profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], termine: [], nominierungen: [] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    try { await loadKader(); } catch (e) {}
    if (typeof bewZeileBauen !== "function") return { alt: true };
    const namen = KADER.filter(k => k.aktiv !== false).map(k => k.name); DB = {};
    namen.forEach((n, i) => { const k = getKader(n), v = {}; [...DIMS_FELD, ...(k.tw ? DIMS_TW : [])].forEach(d => d.tier.forEach((t, j) => { v[t.n] = 1 + ((i + j) % 4); }));
      DB[n] = [bewZeileBauen({ name: n, trainer: "Trainerteam", date: "2026-11-18", foot: i % 3 ? "R" : "L", age: "8", grp: "flex", eltern: "", att: "2", notes: "", tw: !!k.tw }, v).row]; });
    if (typeof kombiLineup !== "undefined") Object.keys(kombiLineup).forEach(k => { kombiLineup[k] = ""; });
    go("kombi"); await w(1300);
    const v = document.getElementById("view-kombi"), c = document.getElementById("kombi-content");
    out.text = v.innerText.replace(/\s+/g, " "); out.hinweis = (document.getElementById("kombi-hinweis") || {}).innerText || "";
    out.kindImHinweis = namen.some(n => out.hinweis.includes(n));
    const sel = [...c.querySelectorAll("#lineup-editor select")];
    out.vorbelegt = sel.map(x => x.value).filter(Boolean).length; out.selN = sel.length;
    const vk = [...c.querySelectorAll("button")].find(b => /Vorschlag/.test(b.textContent)); out.vorschlagH = vk ? Math.round(vk.getBoundingClientRect().height) : 0;
    if (vk) vk.click(); await w(300);
    const nach = [...c.querySelectorAll("#lineup-editor select")].map(x => x.value).filter(Boolean);
    out.nach = nach.length; out.doppelt = new Set(nach).size !== nach.length;
    out.spieltag = [...c.querySelectorAll("button")].some(b => /Spieltag übernehmen/.test(b.textContent));
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["Stand vor v850"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (/Beste Aufstellung|Weitere gute Kombinationen|beste Kombination|\d\s?%/.test(r.text)) probleme.push("a) Bestenliste oder Prozent sichtbar: " + (r.text.match(/.{0,30}(Beste Aufstellung|Weitere gute|beste Kombination|\d\s?%).{0,20}/) || [""])[0]);
  else if (!/keine Rangfolge/.test(r.hinweis) || r.kindImHinweis) probleme.push("a) Hinweis fehlt oder nennt ein Kind: " + r.hinweis.slice(0, 120));
  else zeilen.push("a) keine Bestenliste, kein Prozentzeichen; Hinweis „Startpunkt, keine Rangfolge“");
  if (!r.selN) probleme.push("b) Editor fehlt");
  else if (r.vorbelegt) probleme.push(`b) Editor ist mit ${r.vorbelegt} Kindern vorbelegt`);
  else if (r.nach < 4 || r.doppelt) probleme.push(`b) „Vorschlag“ setzt ${r.nach} Positionen, doppelt: ${r.doppelt}`);
  else zeilen.push(`b) Editor leer, „Vorschlag“ setzt ${r.nach} Positionen ohne Doppelung`);
  if (!r.spieltag || r.vorschlagH < 44) probleme.push(`c) Weg in den Spieltag ${r.spieltag}, Knopf „Vorschlag“ ${r.vorschlagH} px`);
  else zeilen.push("c) „In den Spieltag übernehmen“ bleibt");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
