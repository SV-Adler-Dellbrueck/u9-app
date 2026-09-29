/* v658 · Einladungskarten: Link je Karte zum Verschicken
   PO 28.09.: Eltern, die beim Elternaustausch fehlen, bekommen keine gedruckte Karte in die
   Hand. Nach dem Erzeugen stehen die Karten deshalb in einem Fenster: „Karten drucken“ als
   Hauptknopf, darunter je Kind „Link kopieren“.
   a) nach dem Erzeugen öffnet sich kein Druckdialog von selbst, das Fenster bleibt stehen
      (auch der Verlaufs-Manager schließt es nicht, wenn das Auswahlfenster verschwindet)
   b) „Link kopieren“ legt genau die Adresse in die Zwischenablage, die im QR-Code steht –
      und deren Code passt zum gespeicherten Prüfwert
   c) „Karten drucken“ druckt die Karten; im Druck steht der Code weiter nicht im Klartext
   d) Knöpfe mindestens 44 px, der Hauptknopf 56 px */
"use strict";
const crypto = require("crypto");

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/trainer/index.html", supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    if (typeof einladungskartenOpen !== "function") return { fehlt: true };
    KADER = [{ id: 1, name: "Kind A", aktiv: true }, { id: 2, name: "Kind B", aktiv: true }];
    let drucke = 0; window.print = () => { drucke++; };
    const kopiert = [];
    try { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async t => { kopiert.push(t); } } }); } catch (e) {}
    await qrBibliothek();
    const orig = window.qrcode, qr = [];
    window.qrcode = function (t, e) { const q = orig(t, e); const add = q.addData; q.addData = function (d) { qr.push(d); return add.apply(q, arguments); }; return q; };
    await einladungskartenOpen();
    await einladungskartenDrucken(document.getElementById("einl-druck"));
    await warte(900);
    const f = document.getElementById("einl-fertig");
    const out = { fenster: !!f, drucke0: drucke, qr };
    if (!f) return out;
    const knoepfe = [...f.querySelectorAll(".einl-link")];
    out.knoepfe = knoepfe.length;
    out.hoehen = knoepfe.map(b => b.getBoundingClientRect().height);
    out.haupt = document.getElementById("einl-drucken")?.getBoundingClientRect().height || 0;
    out.imFenster = f.innerHTML;
    for (const b of knoepfe) { b.click(); await warte(80); }
    out.kopiert = kopiert;
    out.nachKopieren = !!document.getElementById("einl-fertig");
    document.getElementById("einl-drucken").click(); await warte(80);
    out.drucke1 = drucke;
    const d = document.getElementById("zert-print");
    out.druck = d ? d.innerHTML : "";
    out.basis = appRoot() + "eltern/?portal&einladung=";
    return out;
  });
  const post = s.gesendet.find(x => x.methode === "POST" && x.pfad.endsWith("/eltern_einladung"));
  const hashes = new Set(((post && Array.isArray(post.body)) ? post.body : []).map(z => z.code_hash));
  const f = s.fehler();
  await s.schliessen();

  if (r.fehlt) probleme.push("einladungskartenOpen fehlt");
  else if (!r.fenster) probleme.push("a) nach dem Erzeugen steht kein Fenster mit den Karten");
  else {
    if (r.drucke0) probleme.push("a) der Druckdialog öffnet sich von selbst");
    if (!r.nachKopieren) probleme.push("a) das Fenster ist nach dem Kopieren verschwunden");
    if (r.knoepfe !== 2) probleme.push(`b) ${r.knoepfe} Knöpfe „Link kopieren“ statt 2`);
    const qrLinks = r.qr.filter(t => t.startsWith(r.basis));
    if (r.kopiert.length !== 2) probleme.push(`b) ${r.kopiert.length} Links kopiert statt 2`);
    for (const l of r.kopiert) {
      if (!qrLinks.includes(l)) probleme.push("b) kopierter Link steht in keinem QR-Code");
      const code = l.slice(r.basis.length);
      if (!hashes.has(crypto.createHash("sha256").update(code).digest("hex"))) probleme.push("b) kopierter Code passt zu keinem Prüfwert");
      if (r.imFenster.includes(code)) probleme.push("b) der Code steht sichtbar im Fenster");
      if (r.druck.includes(code)) probleme.push("c) der Code steht im Klartext auf der Druckseite");
    }
    if (r.drucke1 !== 1) probleme.push(`c) „Karten drucken“ löst ${r.drucke1} Druck(e) aus statt 1`);
    if ((r.druck.match(/einl-karte"/g) || []).length !== 2) probleme.push("c) Druckseite trägt nicht zwei Karten");
    if (r.hoehen.some(x => x < 44)) probleme.push("d) „Link kopieren“ unter 44 px: " + r.hoehen.join("/"));
    if (r.haupt < 56) probleme.push(`d) „Karten drucken“ nur ${r.haupt} px`);
  }
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`Fenster ${r.fenster ? "da" : "fehlt"} · Druck von selbst ${r.drucke0 || 0}× · ${r.kopiert ? r.kopiert.length : 0} Links kopiert, jeder = QR-Adresse · auf Knopf ${r.drucke1 || 0}× gedruckt · Knöpfe ${(r.hoehen || []).join("/")} px, Haupt ${r.haupt || 0} px`);
  return h.ergebnis("v658 Einladungskarten: Link je Karte zum Verschicken", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
