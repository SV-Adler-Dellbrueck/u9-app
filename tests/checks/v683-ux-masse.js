/* v683 · Messprüfung für alle Trainer-Seiten am Handy (390 × 844)
   PO 29.09. (Kollegen): „Die Unterseiten sind immer noch teilweise zu klein … Usability ist für die
   meisten meiner Kollegen nicht gut genug.“ v681–v683 haben die Seiten umgebaut; damit es nicht
   still wieder schlechter wird, misst diese Prüfung jede Seite am gerenderten DOM:
   a) jede sichtbare Bedienfläche mindestens 44 px hoch (unsichtbare Kästchen hinter Chips zählen nicht)
   b) keine sichtbare Schrift unter 12 px
   c) nichts ragt über den rechten Rand
   d) Kader ohne Bewertungen: keine leeren Wertungsspalten, keine Rauten-Besetzung, kein Rollen-Filter,
      keine Knopfreihe über der Liste; Pinnwand beginnt mit den Notizen und trägt keine Datensicherung;
      die Sicherung steht unter Orga · Einstellungen; Termine: „Neuer Termin“ ist der erste Knopf */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const termine = [
    { id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} },
    { id: 2, datum: h.tagePlus(2), uhrzeit: "10:00", uhrzeit_ende: "12:00", typ: "spiel", titel: "Spiel", gegner: "Gegner A", trainer_status: {} }];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [], anwesenheit: [], matchday: [], periodisierung: [], trainingsbloecke: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const SEITEN = ["home", "ue-team", "kader", "profil", "bew", "verlauf", "ue-training", "anwesenheit", "planung", "formen",
    "ue-spieltag", "spieltag", "kombi", "analyse", "taktik", "ue-orga", "termine", "team", "tagebuch", "ue-elki"];
  const r = await s.page.evaluate(async (SEITEN) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    await loadKader();
    const W = innerWidth, out = {};
    const sichtbar = el => { const b = el.getBoundingClientRect(); if (b.width <= 0 || b.height <= 0) return false;
      for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false; }
      return true; };
    for (const k of SEITEN) {
      go(k); await warte(700);
      const aktiv = [...document.querySelectorAll(".view.active, .train-sub.active")].pop() || document.body;
      const bereich = [document.getElementById("tab-subbar"), aktiv].filter(Boolean);
      const alle = sel => bereich.flatMap(b => [...b.querySelectorAll(sel)]);
      const bedien = alle("button, a[href], select, input:not([type=hidden]), textarea, [role=button]").filter(sichtbar)
        .filter(e => !(e.tagName === "INPUT" && (e.type === "checkbox" || e.type === "radio") && e.closest("label") && sichtbar(e.closest("label"))));
      const klein = bedien.filter(e => e.getBoundingClientRect().height < 43.5)
        .map(e => ((e.textContent || e.getAttribute("aria-label") || e.tagName).replace(/\s+/g, " ").trim().slice(0, 24)) + "@" + Math.round(e.getBoundingClientRect().height));
      const texte = alle("*").filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && sichtbar(e));
      const winzig = texte.filter(e => parseFloat(getComputedStyle(e).fontSize) < 11.5)
        .map(e => e.textContent.replace(/\s+/g, " ").trim().slice(0, 24) + "@" + getComputedStyle(e).fontSize);
      const breit = alle("*").filter(e => sichtbar(e) && getComputedStyle(e).position !== "fixed" && e.getBoundingClientRect().right > W + 1)
        .filter(e => !e.closest("[style*='overflow-x:auto'],[style*='overflow-x: auto'],.kader-wrap,.frow"))
        .map(e => (e.id || e.className || e.tagName).toString().slice(0, 24));
      out[k] = { klein, winzig, breit: [...new Set(breit)].slice(0, 4) };
    }
    // d)
    go("kader"); await warte(500);
    const kv = document.getElementById("view-kader");
    out.dKader = { spalten: kv.querySelectorAll(".kader-t th").length, raute: !!kv.querySelector(".kader-raute:not([hidden])"),
      filter: sichtbar(kv.querySelector(".frow")), knopfreihe: [...kv.querySelectorAll("button")].filter(sichtbar).some(b => /Pausen|Eltern-Setup|Notfallkarten|Backup/.test(b.textContent)) };
    go("team"); await warte(500);
    const tv = document.getElementById("train-sub-team");
    out.pinnwand = { erste: ([...tv.querySelectorAll(".sl")].find(sichtbar) || {}).textContent || "", sicherung: /backupExport/.test(tv.innerHTML) };
    go("ue-orga"); await warte(500);
    out.orgaSicherung = /backupExport/.test(document.getElementById("view-ue-orga").innerHTML);
    go("termine"); await warte(500);
    out.termineErster = (([...document.querySelectorAll("#train-sub-termine button")].find(sichtbar)) || {}).id || "";
    return out;
  }, SEITEN);
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  let n44 = 0, n12 = 0;
  for (const k of SEITEN) {
    const x = r[k]; if (!x) { probleme.push(`${k}: nicht gemessen`); continue; }
    if (x.klein.length) { n44 += x.klein.length; probleme.push(`a) ${k}: ${x.klein.length} Bedienflächen unter 44 px – ${x.klein.slice(0, 4).join(" | ")}`); }
    if (x.winzig.length) { n12 += x.winzig.length; probleme.push(`b) ${k}: ${x.winzig.length} Schriften unter 12 px – ${x.winzig.slice(0, 4).join(" | ")}`); }
    if (x.breit.length) probleme.push(`c) ${k}: ragt über den Rand – ${x.breit.join(", ")}`);
  }
  if (r.dKader.spalten > 1) probleme.push(`d) Kader ohne Bewertung zeigt ${r.dKader.spalten} Spalten`);
  if (r.dKader.raute) probleme.push("d) Kader zeigt eine leere Rauten-Besetzung");
  if (r.dKader.filter) probleme.push("d) Kader zeigt Rollen-Filter, obwohl niemand eine Rolle hat");
  if (r.dKader.knopfreihe) probleme.push("d) Kader trägt wieder eine Knopfreihe (Pausen/Eltern-Setup/Notfallkarten/Backup)");
  if (!/Team-Notizen/.test(r.pinnwand.erste)) probleme.push(`d) Pinnwand beginnt mit „${r.pinnwand.erste.trim()}“`);
  if (r.pinnwand.sicherung) probleme.push("d) Pinnwand trägt noch die Datensicherung");
  if (!r.orgaSicherung) probleme.push("d) Datensicherung fehlt unter Orga");
  if (r.termineErster !== "tm-neu-toggle") probleme.push(`d) Erster Knopf unter Termine ist „${r.termineErster}“`);
  zeilen.push(`${SEITEN.length} Seiten gemessen · unter 44 px: ${n44} · Schrift unter 12 px: ${n12}`);
  return h.ergebnis("Alle Trainer-Seiten am Handy: 44 px, 12 px, nichts über dem Rand", !probleme.length, zeilen.concat(probleme));
};
