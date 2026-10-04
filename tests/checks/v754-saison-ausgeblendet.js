/* v754 · Saison-Rückblick ausgeblendet
   PO 04.10.: „Die Saison aktuell ausblenden. Die meisten Werte tracken wir aktuell nicht.“
   Ein Schalter (WRAPPED_SICHTBAR, standardmäßig aus) blendet alle Einstiege aus: Saison-Karte im Kinderprofil und in
   der Kader-Zeile, Kachel „Adler Wrapped“ auf der Trainer-Startseite, Zeile „Saison-Statistik“ im Eltern-Bereich.
   Die Funktionen selbst bleiben (childWrappedOpen u. a.); mit dem Schalter an erscheinen alle Einstiege wieder.
   a) Kinderprofil ohne „Saison-Karte“, mit Schalter an wieder mit
   b) Schalter ist aus; die Eltern-Zeile hängt am Schalter (Quelltext); Funktionen vorhanden */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const t = await h.starten({ warten: 1200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), kind_fanfacts: [], foto_consent: [], kind_foto: [] }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof kinderProfilOpen !== "function"; i++) await w(50);
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    await loadKader();
    const id = KADER[0]._id, out = { schalter: typeof WRAPPED_SICHTBAR === "undefined" ? "fehlt" : WRAPPED_SICHTBAR };
    const text = () => (document.getElementById("kp-modal") || { textContent: "" }).textContent;
    await kinderProfilOpen(id); await w(300);
    out.aus = /Saison-Karte/.test(text());
    WRAPPED_SICHTBAR = true; kinderProfilRender(); await w(100);
    out.an = /Saison-Karte/.test(text());
    WRAPPED_SICHTBAR = false;
    out.funktionen = typeof childWrappedOpen === "function" && typeof adlerWrappedTeaser === "function";
    return out;
  });
  const fe = t.fehler(); await t.schliessen();
  if (r.schalter !== false || r.aus || !r.an) probleme.push("a) " + JSON.stringify(r));
  zeilen.push(`a) Schalter ${r.schalter} · Saison-Karte im Profil: aus ${!r.aus}, mit Schalter an ${r.an}`);
  const ep = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  if (!/WRAPPED_SICHTBAR\)\?elRow\("📊","Saison-Statistik"/.test(ep) || !r.funktionen) probleme.push("b) Eltern-Zeile hängt nicht am Schalter oder Funktionen fehlen");
  zeilen.push("b) Eltern-Zeile „Saison-Statistik“ hängt am Schalter, Funktionen bleiben");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v754 Saison-Rückblick ausgeblendet", !probleme.length, probleme.length ? probleme : zeilen);
};
