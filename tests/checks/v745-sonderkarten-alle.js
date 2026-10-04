/* v745 · Sonderkarten für alle Kinder sichtbar
   PO 04.10.: „Die Sonderkarten sollen für alle Kinder sichtbar sein“ (Kachel „So bauen“). Die Datenbank liefert die
   Karten jedem Team-Konto, Fotos fremder Kinder nur mit Freigabe (tests/sql/v745-sonderkarten-alle.sql).
   a) Team-Galerie (Kabine): unter der Karte eines fremden Kindes ein Streifen mit dessen Sonderkarten
   b) Groß ansehen ja, „Als Bild speichern“ nein – auch außerhalb des Kindermodus (Eltern in der Galerie)
   c) Eigenes Kind in der Galerie: Speichern bleibt (außerhalb des Kindermodus)
   d) Blättern lädt den Streifen des nächsten Kindes, keine doppelten Streifen */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const karte = (id, name, art) => ({ art, datum: "2026-09-26", titel: "Kinderfestival", ort: "Thurner Kamp", team: 1, spielform: "4+1", mal: 1, foto_path: null, nr: id, name });
  const sb = h.supabaseAttrappe({
    rpc: { sonderkarten_kind: (u, req) => { const b = JSON.parse(req.postData() || "{}"); return b.p_spieler === 2 ? [karte(2, "Kind B", "spieltag"), karte(2, "Kind B", "kapitaen")] : [karte(1, "Kind A", "spieltag")]; } }
  });
  const e = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 390, hoehe: 844, supabase: sb });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 40 && typeof kabineRenderGallery !== "function"; i++) await w(100);
    if (typeof sonderkartenStreifen !== "function" || typeof kabineRenderGallery !== "function") return { fehlt: true };
    window._elternKids = [{ spieler_id: 1, kader: { id: 1, name: "Kind A" } }];
    const body = document.createElement("div"); body.id = "kabine-body"; body.style.cssText = "display:flex;flex-direction:column;min-height:600px;background:#0f172a;color:#fff"; document.body.appendChild(body);
    kabineGalleryData = [{ spieler_id: 2, name: "Kind B", nr: 7, staerken: [], trainings: 3, spiele: 1 }, { spieler_id: 1, name: "Kind A", nr: 6, staerken: [], trainings: 4, spiele: 2 }];
    kabineIdx = 0; isKidsMode = false; kabineRenderGallery(); await w(500);
    const st = () => document.querySelectorAll("#kabine-body #sk-streifen");
    out.a = { streifen: st().length, karten: [...document.querySelectorAll("#kabine-body .sk-karte canvas")].map(c => c.getAttribute("aria-label")) };
    document.querySelector("#kabine-body .sk-karte").click(); await w(200);
    out.b = { gross: !!document.getElementById("sk-gross"), speichern: !!document.getElementById("sk-teilen") };
    document.getElementById("sk-gross")?.remove();
    kabineGalleryNav(1); await w(500);
    out.d = { streifen: st().length, karten: document.querySelectorAll("#kabine-body .sk-karte").length };
    document.querySelector("#kabine-body .sk-karte")?.click(); await w(200);
    out.c = { gross: !!document.getElementById("sk-gross"), speichern: !!document.getElementById("sk-teilen") };
    return out;
  }).catch(err => ({ fehler: String(err) }));
  const f = e.fehler(); await e.schliessen();
  if (r.fehlt || r.fehler) return h.ergebnis("v745 Sonderkarten für alle", false, [r.fehler || "Funktion fehlt"]);
  if (r.a.streifen !== 1 || r.a.karten.join("|") !== "Spieltagskarte vom 26.09.|Kapitänskarte vom 26.09.") probleme.push(`a) fremdes Kind: ${JSON.stringify(r.a)}`);
  zeilen.push(`a) Galerie, fremdes Kind: ${r.a.karten.join(", ")}`);
  if (!r.b.gross || r.b.speichern) probleme.push(`b) fremd groß: ${JSON.stringify(r.b)}`);
  zeilen.push("b) fremde Karte groß ansehen, ohne „Als Bild speichern“");
  if (!r.c.gross || !r.c.speichern) probleme.push(`c) eigenes Kind: ${JSON.stringify(r.c)}`);
  zeilen.push("c) eigenes Kind: Speichern bleibt");
  if (r.d.streifen !== 1 || r.d.karten !== 1) probleme.push(`d) Blättern: ${JSON.stringify(r.d)}`);
  zeilen.push("d) Blättern lädt den Streifen des nächsten Kindes, kein doppelter Streifen");
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v745 Sonderkarten für alle", !probleme.length, zeilen.concat(probleme));
};
