/* v983 · Charles 27.11.2026 (Bildschirmfoto Termine): „Das Festival ist auch abgesagt. Wird aber nicht auf der kachel sichtbar wie beim Training.“
   Ursache: Das Schild „🔴 Fällt aus · Grund“ stand im selben gekürzten Feld wie der Titel; ein langer Titel („Kinderfestival · Heim …“)
   schnitt es mit „…“ ab. Jetzt steht es als eigenes Element hinter dem gekürzten Titel.
   a) langer Titel, abgesagt, Handybreite: Schild sichtbar und vollständig innerhalb der Zeile; der Titel wird gekürzt
   b) kurzer Titel (Training) wie bisher mit Schild; nicht abgesagt: kein Schild */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof tmRow !== "function"; i++) await w(100);
    const box = document.createElement("div"); box.style.cssText = "position:fixed;left:0;top:0;width:358px;padding:16px;background:#fff;z-index:99999"; document.body.appendChild(box);
    const sieh = t => {
      box.innerHTML = tmRow(t);
      const zeile = box.querySelector(".tm-zeile"), chip = box.querySelector(".tm-absage"), titel = zeile.querySelector("span[style*='text-overflow']");
      const zr = zeile.getBoundingClientRect(), cr = chip ? chip.getBoundingClientRect() : null;
      return { chip: chip ? chip.textContent.trim() : "", sichtbar: !!cr && cr.width > 40 && cr.left >= zr.left && cr.right <= zr.right - 10, gekuerzt: titel ? titel.scrollWidth > titel.clientWidth : null };
    };
    const lang = sieh({ id: 76, typ: "turnier", datum: "2026-11-28", uhrzeit: "11:30:00", titel: "Kinderfestival · Heim mit langem Titel für die Gastvereine", heim: true, platz_status: "abgesagt", platz_status_note: "Platz gesperrt" });
    const kurz = sieh({ id: 60, typ: "training", datum: "2026-11-27", uhrzeit: "16:45:00", titel: "", platz_status: "abgesagt", platz_status_note: "Platzsperre" });
    const normal = sieh({ id: 61, typ: "training", datum: "2026-11-30", uhrzeit: "16:45:00", titel: "" });
    box.remove();
    return { lang, kurz, normal };
  });
  const fe = s.fehler(); await s.schliessen();
  if (!r.lang.sichtbar || !/Fällt aus · Platz gesperrt/.test(r.lang.chip) || !r.lang.gekuerzt) probleme.push("a) " + JSON.stringify(r.lang));
  else zeilen.push("a) langer Festival-Titel wird gekürzt, „🔴 Fällt aus · Platz gesperrt“ bleibt ganz sichtbar");
  if (!r.kurz.sichtbar || !/Fällt aus · Platzsperre/.test(r.kurz.chip) || r.normal.chip) probleme.push("b) " + JSON.stringify({ kurz: r.kurz, normal: r.normal }));
  else zeilen.push("b) Training mit Absage zeigt das Schild, ohne Absage keins");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v983 Absage-Schild bei langem Titel sichtbar", !probleme.length, zeilen.concat(probleme));
};
