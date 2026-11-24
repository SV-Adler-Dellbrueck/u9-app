/* v967 · Charles 24.11.: „Bei den Fächern, die ausfallen oder gähn, ein kleines Easter Egg verstecken, wenn man trotzdem draufklickt :)“
   a) Mathe, Deutsch und Chemie im Stundenplan sind Knöpfe (≥ 44 px, mit Namen für Vorlesehilfen).
   b) Erster Tipp: ein Spruch erscheint unter dem Fach, die Zeile wackelt; zweiter Tipp: der andere Spruch und Konfetti.
   c) Es gibt dafür keine Federn – kein Schreibzugriff. */
"use strict";
module.exports = async function (h) {
  const titel = "v967 Easter Egg: ausfallende Fächer im Stundenplan antippen";
  const probleme = [];
  const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 390, hoehe: 900, warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const vor = () => s.gesendet.length; let schreibVor = 0;
  await s.page.waitForTimeout(300); schreibVor = vor();
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof schuleAusfallTipp !== "function") return { alt: true };
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove()); localStorage.setItem("adler_quiz_tutorial_done", "1");
    tqPlayer = "Kind A"; if (typeof _akBereich !== "undefined") _akBereich = "theorie"; tqStart(); await w(200);
    const z = [...document.querySelectorAll("#schule-ausfall .sp-aus")];
    const out = { a: z.map(b => b.tagName + ":" + Math.round(b.getBoundingClientRect().height) + ":" + (b.getAttribute("aria-label") || "")) };
    const ei = () => txt(z[0].querySelector(".sp-aus-ei"));
    out.vorher = { sichtbar: !z[0].querySelector(".sp-aus-ei")?.hidden };
    z[0].click(); await w(100); out.b1 = { text: ei(), wackel: z[0].classList.contains("sp-wackel"), konfetti: !!document.querySelector(".fr-konfetti") };
    z[0].click(); await w(100); out.b2 = { text: ei(), konfetti: !!document.querySelector(".fr-konfetti") };
    z[2].click(); await w(100); out.chemie = txt(z[2].querySelector(".sp-aus-ei"));
    return out;
  }).catch(x => ({ fehler: String(x) }));
  await s.page.waitForTimeout(300); const schreib = s.gesendet.slice(schreibVor).filter(x => /xp_|federn|abzeichen/i.test(x.pfad)).length; await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["kein Easter Egg (Stand vor v967)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Ablauf: " + r.fehler]);
  if (r.a.length !== 3 || r.a.some(x => !/^BUTTON:/.test(x) || Number(x.split(":")[1]) < 44 || !/^(Mathe|Deutsch|Chemie): /.test(x.split(":").slice(2).join(":")))) probleme.push("a) " + JSON.stringify(r.a));
  if (r.vorher.sichtbar || !/Mathe/.test(r.b1.text) || !r.b1.wackel || r.b1.konfetti) probleme.push("b) erster Tipp " + JSON.stringify([r.vorher, r.b1]));
  if (!r.b2.text || r.b2.text === r.b1.text || !r.b2.konfetti || !/Labor|Rezept/.test(r.chemie)) probleme.push("b) zweiter Tipp " + JSON.stringify([r.b2, r.chemie]));
  if (schreib) probleme.push(`c) ${schreib} Federn-Aufrufe – es soll keine Federn geben`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : [`a) 3 Knöpfe · b) „${r.b1.text}“ → „${r.b2.text}“ + Konfetti · Chemie „${r.chemie}“ · c) keine Federn`]);
};
