/* v953 · Charles 23.11.: „Das ist eine Aufwärmübung, also kategorisiere sie bitte entsprechend.“ – „Pylonen-Spiel – Läufer
   gegen Wächter“ (v941) stand unter „spass“.
   a) In uebungen/bibliothek.json trägt die Übung kat „aufwaermen“, der Stand ist neuer als 2026-11-22-1 (sonst zieht der
      Abgleich beim Öffnen nicht nach).
   b) Der Abgleich zieht eine schon angelegte Import-Kopie nach: Er schickt für sie ein PATCH mit kat „aufwaermen“. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v953 Pylonen-Spiel ist eine Aufwärmübung (Bibliothek und Abgleich)";
  const probleme = [], zeilen = [];
  const NAME = "Pylonen-Spiel – Läufer gegen Wächter";
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const u = bib.uebungen.find(x => x.name === NAME);
  if (!u || u.kat !== "aufwaermen") probleme.push("a) kat " + (u && u.kat));
  if (!(String(bib.stand) > "2026-11-22-1")) probleme.push("a) Stand " + bib.stand);
  const alt = Object.assign({}, u, { kat: "spass", id: 92, custom: true, tags: "Import", focus: "" });
  const s = await h.starten({ bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: [alt] }) });
  const r = await s.page.evaluate(async () => {
    for (let i = 0; i < 50 && typeof bibliothekAbgleich !== "function"; i++) await new Promise(x => setTimeout(x, 100));
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    try { Object.keys(localStorage).filter(k => /bib|stand/i.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    if (typeof loadCustomForms === "function") await loadCustomForms();
    /* Der Start stößt den Abgleich selbst an. Läuft er noch, kehrt ein zweiter Aufruf sofort zurück (_bibLaeuft) und das PATCH
       käme erst nach dem Messen – auf dem langsameren GitHub-Rechner (Prüflauf zu #554) genau so geschehen. Also: warten. */
    const laeuft = () => { try { return _bibLaeuft; } catch (e) { return false; } };
    for (let i = 0; i < 100 && laeuft(); i++) await new Promise(x => setTimeout(x, 100));
    const erg = await bibliothekAbgleich();
    for (let i = 0; i < 100 && laeuft(); i++) await new Promise(x => setTimeout(x, 100));
    return erg;
  }).catch(x => ({ fehler: String(x) }));
  const patch = s.gesendet.filter(g => g.methode === "PATCH" && /trainingsformen/.test(g.pfad) && /id=in\.\(92\)/.test(g.suche));
  const fe = s.fehler(); await s.schliessen();
  if (r && r.fehler && typeof r.fehler === "string" && /Error/.test(r.fehler)) probleme.push("b) " + r.fehler);
  if (!patch.length || patch[0].body.kat !== "aufwaermen") probleme.push("b) kein Nachziehen: " + JSON.stringify(patch.map(p => p.body && p.body.kat)));
  zeilen.push(`a) kat ${u && u.kat}, Stand ${bib.stand} · b) Abgleich schickt PATCH kat ${patch[0] && patch[0].body.kat}`);
  if (fe.length) zeilen.push("Konsole (nur Hinweis): " + fe.slice(0, 1).join(" | ").slice(0, 120));
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
