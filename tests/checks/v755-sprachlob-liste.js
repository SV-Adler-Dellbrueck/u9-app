/* v755 · Sprachlob als Liste in Kabine und Eltern-Bereich
   PO 04.10.: „Das Sprachlob soll auch in der Kabine sein und dort sollen die gesammelt werden mit Datumsansicht zum
   Abhören. Die Eltern und das Kind sollen darüber eine Info erhalten.“ Kachel: „In der App, Push später“.
   a) Kabine: Kachel „Lob vom Trainer“ oben (nicht unter „Mehr entdecken“) mit „1 neu“, solange ein Lob ungehört ist
   b) Liste: Dialog, alle Lobe mit Wochentag und Datum (neueste oben), „1 neu · 2 insgesamt“, Knöpfe ≥ 44 px
   c) Antippen spielt ab, markiert einmal als gehört (PATCH kabine_lob nur mit gehoert_am=is.null und nur dieser Spalte),
      „Neu“ verschwindet; zweiter Tipp pausiert; gehörte Lobe schreiben nichts
   d) Eltern-Bereich öffnet dieselbe Liste (Zeile „Sprachlob anhören“) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const patches = [];
  const lobe = [{ id: 12, path: "1/b.webm", created_at: "2026-10-03T16:20:00Z", gehoert_am: null }, { id: 11, path: "1/a.webm", created_at: "2026-09-26T09:05:00Z", gehoert_am: "2026-09-26T12:00:00Z" }];
  const s = await h.starten({ start: "/eltern/index.html", warten: 2500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }],
    kabine_lob: (u, req) => { if (req.method() === "PATCH") { patches.push(decodeURIComponent(u.search) + " " + req.postData()); return { status: 204, body: "" }; }
      return /gehoert_am=is\.null/.test(decodeURIComponent(u.search)) ? [{ id: 12 }] : lobe; } }) });
  await s.page.route(/\/storage\/v1\/object\/sign\/kabine-lob\//, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: "/object/sign/kabine-lob/x?token=t" }) }));
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80 && (typeof kabineHome !== "function" || typeof lobListeOpen !== "function"); i++) await w(50);
    if (typeof lobListeOpen !== "function") return { fehlt: true };
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    document.querySelectorAll(".modal-overlay,[role=dialog]").forEach(d => d.remove());
    const k = document.createElement("div"); k.id = "kabine"; k.style.cssText = "position:fixed;inset:0;z-index:10050;background:#1e3a8a;display:flex;flex-direction:column";
    k.innerHTML = '<div id="kabine-body" style="flex:1;display:flex;flex-direction:column;overflow:auto"></div>'; document.body.appendChild(k);
    window._elternKids = [{ spieler_id: 1, kader: { id: 1, name: "Testa Beispiel" } }];
    const spielt = []; HTMLMediaElement.prototype.play = function () { spielt.push(this.src); return Promise.resolve(); }; HTMLMediaElement.prototype.pause = function () { spielt.push("pause"); };
    const out = {};
    kabineHome(); await w(600);
    const tile = [...document.querySelectorAll("#kabine-body button")].find(b => /Lob vom Trainer/.test(b.textContent));
    out.a = { tile: !!tile, imMehr: !!(tile && tile.closest("#kab-mehr")), badge: tile ? (tile.querySelector(".kab-lob-neu") || {}).textContent : null };
    kabineLobWahl(); await w(500);
    const d = document.getElementById("lob-liste");
    out.b = { role: d && d.getAttribute("role"), text: d ? d.textContent.replace(/\\s+/g, " ") : "", zeilen: d ? d.querySelectorAll(".lob-zeile").length : 0,
      klein: d ? [...d.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height < 44).length : -1 };
    const zl = [...d.querySelectorAll(".lob-zeile")];
    zl[0].click(); await w(300);
    out.c = { spielt: spielt.slice(), neuWeg: !zl[0].querySelector(".lob-neu"), pressed: zl[0].getAttribute("aria-pressed") };
    zl[0].click(); await w(100);
    out.c.pause = spielt[spielt.length - 1] === "pause";
    zl[1].click(); await w(300);
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v755 Sprachlob-Liste", false, ["lobListeOpen fehlt"]);
  const a = r.a, b = r.b, c = r.c;
  if (!a.tile || a.imMehr || a.badge !== "1 neu") probleme.push("a) " + JSON.stringify(a));
  zeilen.push(`a) Kachel „Lob vom Trainer“ oben, Punkt „${a.badge}“`);
  if (b.role !== "dialog" || b.zeilen !== 2 || !/1 neu · 2 insgesamt/.test(b.text) || !/Samstag, 3\. Oktober/.test(b.text) || !/Samstag, 26\. September/.test(b.text) || b.text.indexOf("3. Oktober") > b.text.indexOf("26. September") || b.klein) probleme.push("b) " + b.text.slice(0, 260) + " · klein " + b.klein);
  zeilen.push(`b) ${b.zeilen} Lobe, neueste oben, „1 neu · 2 insgesamt“`);
  const p0 = patches[0] || "";
  if (patches.length !== 1 || !/id=eq\.12&gehoert_am=is\.null/.test(p0) || !/^\S+ \{"gehoert_am":"20/.test(p0) || !c.spielt[0] || !/token=t/.test(c.spielt[0]) || !c.neuWeg || c.pressed !== "true" || !c.pause) probleme.push("c) " + JSON.stringify(c) + " · " + patches.join(" | "));
  zeilen.push(`c) Tipp spielt ab, ein PATCH (nur gehoert_am, nur wenn leer), „Neu“ weg, zweiter Tipp pausiert; gehörtes Lob schreibt nichts`);
  const ep = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  if (!/elRow\("🎧","Sprachlob anhören"[^\n]*lobListeOpen\(/.test(ep)) probleme.push("d) Eltern-Zeile öffnet nicht die Liste");
  zeilen.push("d) Eltern: „Sprachlob anhören“ öffnet dieselbe Liste");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v755 Sprachlob als Liste (Kabine, Eltern)", !probleme.length, probleme.length ? probleme : zeilen);
};
