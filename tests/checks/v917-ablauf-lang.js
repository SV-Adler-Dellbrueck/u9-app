/* v917 · Bestandsaufnahme 5.10, lange Abläufe (Charles 20.11.: „eine kurze Variante … aber auch eine lange, die
   genau beschreibt, was die Übung ist und welche Ziele sie hat. Die lange … optional abrufbar, erstmal nicht direkt
   sichtbar.“ – Kurzfassungen freigegeben).
   a) Bibliothek: die vier Übungen über 2.000 Zeichen haben eine kurze Fassung (≤ 1.000) in ablauf und die alte
      ganze Fassung unverändert in ablauf_lang; keine Übung hat mehr einen Ablauf über 2.000 Zeichen.
   b) Abgleich: _euForm schreibt ablauf_lang, der Vergleich beim Nachziehen kennt es; die Migration legt die Spalte an.
   c) Übungsdetail: kurze Fassung sichtbar, „Ganze Beschreibung“ zugeklappt mit dem langen Text; ohne ablauf_lang
      kein Aufklapper. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v917 Abläufe kurz sichtbar, ganze Beschreibung aufklappbar";
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const mitLang = bib.uebungen.filter(u => u.ablauf_lang);
  const zuLang = bib.uebungen.filter(u => String(u.ablauf || "").length > 2000);
  const kurzOk = mitLang.every(u => u.ablauf.length <= 1000 && u.ablauf_lang.length > u.ablauf.length);
  /* v941: seit dem Grundsatz „ein Schema je Übungsform“ tragen neue Übungen immer eine lange Fassung – geprüft wird, dass es mindestens die vier aus v917 sind */
  if (mitLang.length < 4 || zuLang.length || !kurzOk) probleme.push(`a) ${mitLang.length} mit langer Fassung, ${zuLang.length} Abläufe über 2.000, kurz ≤ 1.000: ${kurzOk}`);
  const raute = bib.uebungen.find(u => /^Raute mit Torwart/.test(u.name));
  if (!raute || !/^HAUPTZIEL \(Leitfrage 4\)/.test(raute.ablauf_lang || "") || !/Sturzflug/.test(raute.ablauf_lang || "")) probleme.push("a) lange Fassung der Raute nicht die ursprüngliche");
  if (String(bib.stand) <= "2026-11-20-2") probleme.push(`a) Stand „${bib.stand}“ nicht hochgesetzt`);
  zeilen.push(`a) ${mitLang.map(u => u.ablauf.length + "/" + u.ablauf_lang.length).join(" · ")} Zeichen (kurz/lang)`);
  const ei = fs.readFileSync(path.join(h.REPO, "md-einheit-import.js"), "utf8");
  if (!/ablauf_lang:u\.ablauf_lang\|\|null/.test(ei) || !/EU_VERGLEICH=\[[^\]]*"ablauf_lang"/.test(ei)) probleme.push("b) Abgleich schreibt oder vergleicht ablauf_lang nicht");
  const mig = fs.readdirSync(path.join(h.REPO, "supabase/migrations")).filter(f => /ablauf_lang/.test(f)).map(f => fs.readFileSync(path.join(h.REPO, "supabase/migrations", f), "utf8")).join("");
  if (!/add column if not exists ablauf_lang text/.test(mig)) probleme.push("b) Migration fehlt");
  const t = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    trainingsformen: [{ id: 9001, name: "Prüfübung lang", kat: "technik", kurz: "k", ablauf: "KURZ sichtbar", ablauf_lang: "LANG mit Zielen", custom: true, spieler: "6–10", feld: "20 × 20 m", dauer: "10" },
                      { id: 9002, name: "Prüfübung kurz", kat: "technik", kurz: "k", ablauf: "NUR KURZ", custom: true, spieler: "6–10", feld: "20 × 20 m", dauer: "10" }] }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    for (let i = 0; i < 40 && typeof tpShowExercise !== "function"; i++) await w(100);
    if (typeof loadCustomForms === "function") await loadCustomForms();
    const alle = tpAllForms(), iL = alle.findIndex(f => f.name === "Prüfübung lang"), iK = alle.findIndex(f => f.name === "Prüfübung kurz");
    const lies = async i => { tpShowExercise(i); await w(300); const d = [...document.querySelectorAll('[role="dialog"]')].pop(); const det = d && d.querySelector("details.ue-lang");
      const o = { text: d ? d.textContent : "", det: !!det, offen: det ? det.open : null, lang: det ? det.textContent : "" }; d && d.remove(); return o; };
    return { iL, iK, l: iL >= 0 ? await lies(iL) : null, k: iK >= 0 ? await lies(iK) : null };
  });
  const fehler = t.fehler(); await t.schliessen();
  if (!r.l || !r.k) probleme.push(`c) Prüfübungen nicht geladen (${r.iL}/${r.iK})`);
  else {
    if (!/KURZ sichtbar/.test(r.l.text) || !r.l.det || r.l.offen !== false || !/Ganze Beschreibung/.test(r.l.lang) || !/LANG mit Zielen/.test(r.l.lang)) probleme.push(`c) mit langer Fassung: ${JSON.stringify({ det: r.l.det, offen: r.l.offen })}`);
    if (r.k.det || !/NUR KURZ/.test(r.k.text)) probleme.push("c) ohne lange Fassung erscheint ein Aufklapper");
    zeilen.push(`c) kurz sichtbar, „Ganze Beschreibung“ zugeklappt · ohne lange Fassung kein Aufklapper`);
  }
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
