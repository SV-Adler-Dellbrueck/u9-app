/* v943 · Charles 22.11.: „Klugscheißer-Info des Tages“ in der Eltern-App – unnützes Fußballwissen, „Heute vor X Jahren“,
   allgemeines unnützes Wissen. Fakten von Charles freigegeben, jeder mit Quelle; Bild der Karte freigegeben.
   a) uebungen/klugscheisser.json: Schema, jeder Eintrag mit https-Quelle und Prüfnotiz, keine geraden Anführungszeichen,
      „tag“ mit MM-TT und „JJJJ: “ am Anfang, jeder Monat mindestens zwei Ereignisse, keine Kindernamen.
   b) Reihenfolge: Am 25.11.2026 kommt das Ereignis dieses Datums zuerst, Kopf „📅 Heute vor 73 Jahren“; an einem Tag
      ohne Ereignis Fußball oder Allgemeines, und zwei Tage hintereinander zeigen verschiedene Fakten.
   c) Eltern-Startseite: Karte unter den Terminen mit „Quelle: …“ (Link) und „Noch eins ›“ (≥ 44 px); „Noch eins“ zeigt
      einen anderen Fakt.
   d) Fehlt die Datei (404), gibt es keine Karte und keinen Fehler. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v943 Klugscheißer-Info des Tages: geprüfte Fakten, Heute vor X Jahren, Karte auf der Eltern-Startseite";
  const probleme = [], zeilen = [];
  const j = JSON.parse(fs.readFileSync(path.join(h.REPO || process.env.REPO || path.join(__dirname, "..", ".."), "uebungen/klugscheisser.json"), "utf8"));
  const F = j.fakten || [];
  if (j.schema !== "adler-klugscheisser/1") probleme.push("a) Schema " + j.schema);
  const schlecht = F.filter(f => !/^https:\/\//.test(f.quelle || "") || !f.geprueft || !f.quelle_name || /"/.test(f.text) || !["fussball", "tag", "allgemein"].includes(f.art)
    || (f.art === "tag" && (!/^\d\d-\d\d$/.test(f.datum || "") || !/^\d{4}: /.test(f.text))) || (f.art !== "tag" && f.text.length > 160));
  if (schlecht.length) probleme.push("a) ungültig: " + schlecht.map(f => f.id).join(", "));
  if (new Set(F.map(f => f.id)).size !== F.length) probleme.push("a) doppelte id");
  const monate = {}; F.filter(f => f.art === "tag").forEach(f => { const m = f.datum.slice(0, 2); monate[m] = (monate[m] || 0) + 1; });
  const duenn = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].filter(m => (monate[m] || 0) < 2);
  if (duenn.length) probleme.push("a) zu wenige Ereignisse im Monat " + duenn.join(", "));
  if (/Kind [A-O]\b/.test(JSON.stringify(j))) probleme.push("a) Kindername in der Datei");
  const anz = a => F.filter(f => f.art === a).length;
  zeilen.push(`a) ${F.length} Fakten (Fußball ${anz("fussball")}, Heute vor X Jahren ${anz("tag")}, Allgemein ${anz("allgemein")}), alle mit Quelle`);

  const T = (id, tp) => ({ id, datum: h.tagePlus(tp), typ: "training", titel: "Training", gegner: "Training", uhrzeit: "16:45:00", uhrzeit_ende: null, heim: true, ort: "Thurner Kamp 97, 51069 Köln", trainer_status: {} });
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const lauf = async (bibliothek) => {
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844, bibliothek,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => [T(1, 2), T(2, 4)],
        rueckmeldungen: [{ termin_id: 1, spieler_id: 1, status: "zugesagt" }], kind_fanfacts: [], kind_foto: [] }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" });
    const r = await e.page.evaluate(async (mitDatei) => {
      const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
      for (let i = 0; i < 60 && !document.getElementById("tk-bahn"); i++) await w(100);
      for (let i = 0; i < 40 && mitDatei && !document.querySelector("#klug-slot .ks-karte"); i++) await w(100);
      await w(mitDatei ? 100 : 1200);
      const out = {}, k = document.querySelector("#klug-slot .ks-karte");
      out.karte = !!k; if (!k) return out;
      out.text = txt(k.querySelector(".ks-text")); out.kopf = txt(k.querySelector(".ks-kopf"));
      const q = k.querySelector("a.ks-quelle"); out.quelle = q ? txt(q) + " " + q.getAttribute("href") + " " + q.getAttribute("rel") : "";
      const b = k.querySelector(".ks-weiter"); out.knopf = b ? Math.round(b.getBoundingClientRect().height) : 0;
      const t = document.getElementById("tk-bahn"), kr = k.getBoundingClientRect();
      out.unterTerminen = t ? kr.top > t.getBoundingClientRect().bottom : false;
      b.click(); await w(300); out.danach = txt(document.querySelector("#klug-slot .ks-text"));
      const d = KS_DATEN, r25 = ksReihe(d, "2026-11-25"), r22 = ksReihe(d, "2026-11-22"), r23 = ksReihe(d, "2026-11-23");
      out.erst25 = r25[0].id; out.kopf25 = (ksKarteHtml(r25[0], "2026-11-25").match(/class="ks-kopf">([^<]*)/) || [])[1];
      out.art22 = r22[0].art; out.verschieden = r22[0].id !== r23[0].id;
      out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
      return out;
    }, bibliothek).catch(x => ({ fehler: String(x) }));
    const f = e.fehler(); await e.schliessen(); return { r, f };
  };
  const mit = await lauf(true), ohne = await lauf(false);
  const r = mit.r;
  if (r.fehler) probleme.push("c) " + r.fehler);
  else if (!r.karte) probleme.push("c) keine Karte trotz Datei");
  else {
    if (r.erst25 !== "tag-040" || r.kopf25 !== "📅 Heute vor 73 Jahren") probleme.push(`b) 25.11.: ${r.erst25}, „${r.kopf25}“`);
    if (r.art22 === "tag" || !r.verschieden) probleme.push(`b) 22.11.: ${r.art22}, verschieden ${r.verschieden}`);
    if (!/^Quelle: /.test(r.quelle) || !/https:\/\//.test(r.quelle) || !/noopener/.test(r.quelle)) probleme.push("c) Quelle „" + r.quelle + "“");
    if (r.knopf < 44) probleme.push("c) „Noch eins“ " + r.knopf + " px");
    if (!r.unterTerminen) probleme.push("c) Karte steht nicht unter den Terminen");
    if (!r.danach || r.danach === r.text) probleme.push("c) „Noch eins“ zeigt denselben Fakt");
    if (r.quer) probleme.push("c) Querscrollen");
  }
  if (ohne.r.fehler || ohne.r.karte) probleme.push("d) ohne Datei: " + JSON.stringify(ohne.r));
  const fehler = mit.f.concat(ohne.f).filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`b) 25.11. → ${r.erst25} „${r.kopf25}“ · 22.11. → ${r.art22}, Folgetag anders: ${r.verschieden}`);
  zeilen.push(`c) „${r.kopf}“ · „${String(r.text || "").slice(0, 60)}…“ · ${String(r.quelle || "").split(" https")[0]} · Knopf ${r.knopf} px · d) ohne Datei keine Karte`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
