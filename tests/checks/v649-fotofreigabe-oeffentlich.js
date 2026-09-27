/* v649 · Charles, 27.09.2026: „Das Häkchen öffentlich. Dort sollten wir das Vereinsheft aufführen,
   die Vereinswebsite etc. Social Media bitte rauslassen.“
   Geprüft am echten Eltern-Einstieg: Die Stufe „Öffentlich“ nennt Vereinsheft, Vereins-Website und
   Aushänge – und weder Social Media noch Instagram. Keine andere App-Datei verspricht Social Media. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [];
  const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(() => {
    if (typeof FOTO_STUFEN === "undefined") return { fehlt: true };
    const p = FOTO_STUFEN.find(x => x.k === "public_ok");
    return { d: p ? p.d : "" };
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v649 Fotofreigabe „Öffentlich“", false, ["FOTO_STUFEN fehlt im Eltern-Einstieg"]);
  if (!/Vereinsheft/.test(r.d) || !/Vereins-Website/.test(r.d) || !/Aushänge/.test(r.d)) probleme.push("Text nennt nicht Vereinsheft, Vereins-Website und Aushänge: " + r.d.slice(0, 120));
  if (/Social Media|Instagram|Facebook|TikTok/i.test(r.d)) probleme.push("Text nennt noch Social Media: " + r.d.slice(0, 120));
  const app = fs.readdirSync(h.REPO).filter(f => /\.(js|html)$/.test(f)).filter(f => /Social Media|Instagram/i.test(fs.readFileSync(path.join(h.REPO, f), "utf8")));
  if (app.length) probleme.push("Social Media steht noch in: " + app.join(", "));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v649 Fotofreigabe „Öffentlich“ ohne Social Media", !probleme.length, probleme.concat([r.d.slice(0, 110) + " …"]));
};
