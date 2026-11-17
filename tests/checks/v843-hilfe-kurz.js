/* v843 · Hilfe: zuerst kurz, der ganze Text hinter „Alles dazu“ (Bestandsaufnahme November 2026, 4.3).
   a) Kein Eintrag zeigt beim Öffnen mehr als 320 Zeichen; lange Einträge tragen „Alles dazu“ (≥ 44 px), dahinter steht der ganze Text.
   b) Die meistgenutzten Einträge (Trainingsplan, Diese Woche, Nachbereiten, Adler-Rufe) haben eine eigene Kurzfassung ohne Versionsnummern.
   c) Die Notizen der Überarbeitung stehen gesammelt unter „Neu im November 2026“ – nicht mehr vor „Diese Woche“ und „Trainingsplan“.
   d) Die Suche findet weiter, was nur im langen Text steht, und klappt den Treffer auf. */
"use strict";
module.exports = async function (h) {
  const titel = "v843 Hilfe: Kurzfassung zuerst, ganzer Text hinter „Alles dazu“, Suche findet beides";
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 1800, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof hilfeText !== "function") return { alt: true };
    const oeffnen = [window.hilfeOpen, window.helpOpen, window.hilfeOeffnen].find(f => typeof f === "function");
    if (oeffnen) oeffnen(); else { const b = [...document.querySelectorAll("button")].find(x => /Hilfe/.test(x.getAttribute("aria-label") || x.textContent)); if (b) b.click(); }
    await w(400);
    const box = document.getElementById("hilfe-list"); if (!box) return { fehler: "Hilfe öffnet nicht" };
    const zeilen = () => [...box.querySelectorAll('div[style*="border-top"]')].map(z => {
      const d = z.querySelector("details.hilfe-mehr"), titel = z.querySelector('div[style*="font-weight:700"]').textContent;
      const sicht = [...z.querySelectorAll("div")].filter(x => !x.closest("details") && x.children.length === 0 && x.textContent.trim() && x.textContent !== titel).map(x => x.textContent).join(" ");
      return { titel, sichtbar: sicht.replace(/\s+/g, " ").trim().length, mehr: !!d, mehrH: d ? Math.round(d.querySelector("summary").getBoundingClientRect().height) : 0, offen: d ? d.open : false, voll: d ? d.textContent.length : 0, text: sicht };
    });
    const out = { alle: zeilen() };
    hilfeRender("lehrgangsformen"); await w(100); out.suche = zeilen();
    hilfeRender("zzzzqqq"); await w(50); out.nichts = box.textContent.trim();
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["hilfeText fehlt (Stand vor v843)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const zuLang = r.alle.filter(x => x.sichtbar > 330);
  if (zuLang.length) probleme.push("a) zu lang beim Öffnen: " + zuLang.map(x => `${x.titel} (${x.sichtbar})`).slice(0, 5).join(", "));
  const mehr = r.alle.filter(x => x.mehr);
  if (mehr.length < 20 || mehr.some(x => x.mehrH < 44 || x.offen)) probleme.push(`a) „Alles dazu“: ${mehr.length} Einträge, kleinste Höhe ${Math.min(...mehr.map(x => x.mehrH))} px, offen ${mehr.filter(x => x.offen).length}`);
  else zeilen.push(`a) ${r.alle.length} Einträge, längster sichtbarer Text ${Math.max(...r.alle.map(x => x.sichtbar))} Zeichen, ${mehr.length} mit „Alles dazu“`);
  for (const t of ["Trainingsplan", "Diese Woche", "Spiel & Festival nachbereiten", "Adler-Rufe (Team-Chat)"]) {
    const x = r.alle.find(y => y.titel === t);
    if (!x) probleme.push("b) Eintrag fehlt: " + t); else if (/\bv\d{3}\b|Neu in|Seit v/.test(x.text)) probleme.push(`b) „${t}“ beginnt mit einer Versionsnotiz: ${x.text.slice(0, 70)}`);
  }
  const nov = r.alle.find(y => y.titel === "Neu im November 2026");
  if (!nov || !nov.mehr || nov.voll < 1500 || r.alle[0].titel !== "Neu im November 2026") probleme.push("c) „Neu im November 2026“ fehlt, steht nicht oben oder ist leer");
  else zeilen.push("b) vier Kurzfassungen ohne Versionsnummern · c) Notizen gesammelt unter „Neu im November 2026“");
  if (r.suche.length !== 1 || r.suche[0].titel !== "Neu im November 2026" || !r.suche[0].offen) probleme.push("d) Suche „lehrgangsformen“: " + JSON.stringify(r.suche.map(x => [x.titel, x.offen])));
  else if (!/Nichts gefunden/.test(r.nichts)) probleme.push("d) leere Suche: " + r.nichts.slice(0, 60));
  else zeilen.push("d) Suche findet ein Wort aus dem langen Text und klappt den Treffer auf");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
