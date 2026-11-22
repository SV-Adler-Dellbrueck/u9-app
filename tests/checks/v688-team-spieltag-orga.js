/* v688 · Team, Spieltag und Orga: Ebene unter den Kacheln
   PO 30.09.: „Dann weiter mit der Trainer-App optimieren.“ Befund am gerenderten DOM:
   a) Profil und Entwicklung öffneten leer mit einer Auswahlliste; ohne Bewertung war die Liste
      leer, ohne Satz dazu. Jetzt: Namenskacheln (ein Tipp öffnet das Kind), ohne Bewertung ein
      Satz mit dem Startdatum und keine leere Liste
   b) (v871 entfallen: die alte Seite „Aufstellung“ ist entfernt; fair besetzt wird im Mini-Feld
      am Spieltag, geprüft in v858)
   c) Team-Kacheln: vor dem Startdatum kein „0/15 bewertet“, sondern „Bewerten ab …“
   d) Orga: Meetings unter „Termine“; Gedanke, Tagebuch und Pinnwand unter „Notizen“.
      v910 (Charles 20.11.): Meetings stehen jetzt unter „Team-Orga“ neben der Grillhütte – Orga bleibt ein Bildschirm. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], anwesenheit: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    const out = {};
    const sichtbar = el => !!el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== "none";
    // Gesperrt, niemand bewertet
    BEW_AB = null; Object.keys(DB).forEach(k => delete DB[k]); window._dbLoaded = true; refreshSelects();
    go("profil"); await w(500);
    const pc = document.getElementById("profil-content");
    out.leer = { text: pc.textContent.replace(/\s+/g, " ").trim(), liste: sichtbar(document.getElementById("psel-profil")) };
    go("ue-team"); await w(500);
    out.team = document.getElementById("view-ue-team").textContent.replace(/\s+/g, " ");
    // Zwei Kinder bewertet
    const namen = kaderNamen().slice(0, 2);
    namen.forEach(n => { DB[n] = [{ datum: "2026-09-01", scores: "[3,3,3,3,3]", staerken: "[]" }]; });
    refreshSelects();
    go("verlauf"); await w(500);
    const vk = [...document.querySelectorAll("#verlauf-content .spieler-wahl-btn")];
    out.wahl = { n: vk.length, h: vk[0] ? Math.round(vk[0].getBoundingClientRect().height) : 0, liste: sichtbar(document.getElementById("psel-verlauf")) };
    if (vk[0]) { vk[0].click(); await w(300); }
    out.wahl.gewaehlt = document.getElementById("psel-verlauf").value === namen[0];
    // Orga
    go("ue-orga"); await w(500);
    const org = document.getElementById("view-ue-orga");
    const istKopf = e => e.tagName === "DIV" && !e.children.length && e.textContent.trim() && getComputedStyle(e).fontWeight >= 700;
    const gruppe = t => { const k = [...org.querySelectorAll("div")].find(e => istKopf(e) && e.textContent.trim() === t); if (!k) return []; const g = []; let e = k.nextElementSibling; while (e && !istKopf(e)) { g.push(...[...e.querySelectorAll("button")].map(b => b.textContent.trim())); e = e.nextElementSibling; } return g; };
    out.orga = { termine: gruppe("Termine"), notizen: gruppe("Notizen"), teamorga: gruppe("Team-Orga") };
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!/Noch kein Kind bewertet/.test(r.leer.text) || !/Ende der Hinrunde/.test(r.leer.text)) probleme.push(`a) Profil ohne Bewertung: „${r.leer.text}“`);
  if (r.leer.liste) probleme.push("a) Die leere Auswahlliste steht noch da");
  if (r.wahl.n !== 2 || r.wahl.h < 44 || !r.wahl.liste) probleme.push(`a) Namenskacheln: ${JSON.stringify(r.wahl)}`);
  if (!r.wahl.gewaehlt) probleme.push("a) Ein Tipp auf den Namen wählt das Kind nicht");
  if (/0\/15 bewertet/.test(r.team) || !/Bewerten\s*ab /.test(r.team)) probleme.push("c) Team-Kacheln zeigen während der Sperre „0/15 bewertet“");
  if (!(r.orga.termine.length === 2 && ["Termine", "Trainerplan"].every(t => r.orga.termine.some(x => x.includes(t))))) probleme.push(`d) Termine: ${JSON.stringify(r.orga.termine)}`);
  if (!["Meetings", "Grillhütte"].every(t => (r.orga.teamorga || []).some(x => x.includes(t)))) probleme.push(`d) Team-Orga ohne Meetings/Grillhütte: ${JSON.stringify(r.orga.teamorga)}`);
  if (!(r.orga.notizen.length === 3 && ["Gedanke", "Tagebuch", "Pinnwand"].every(t => r.orga.notizen.some(x => x.includes(t))))) probleme.push(`d) Notizen: ${JSON.stringify(r.orga.notizen)}`);
  zeilen.push(`Profil leer: „${r.leer.text}“ · Namenskacheln ${r.wahl.n} × ${r.wahl.h} px`);
  zeilen.push(`Orga: Termine ${r.orga.termine.length} · Notizen ${r.orga.notizen.length}`);
  return h.ergebnis("Team, Spieltag, Orga: Namenskacheln, Team-Kacheln in der Sperre, Notizen", !probleme.length, zeilen.concat(probleme));
};
