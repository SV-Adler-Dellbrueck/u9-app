/* v944 · Charles 22.11.: Saison-Optik – Weihnachten + Silvester, Karneval + Halloween, Ostern + Ferien, Vereinstage
   (vorerst nur der Spieltag), Jahreszeiten. Bild freigegeben: Gruß-Streifen unter dem Kopf der Eltern-App mit Saison-Adler.
   a) saisonOstern: 05.04.2026, 28.03.2027, 16.04.2028.
   b) saisonFuer je Datum: Advent, Weihnachten, Silvester, Neujahr, 11.11., Weiberfastnacht bis Veilchendienstag (aus Ostern),
      Aschermittwoch schon Winter, Gründonnerstag bis Ostermontag, Halloween, NRW-Ferien, Jahreszeiten; Spieltag geht vor,
      ein abgesagtes Spiel nicht.
   c) Jeder verwendete Adler liegt als _klein.webp vor und steht im PRECACHE.
   d) Eltern-Startseite: Streifen direkt unter dem Kopf (vor „Für euch“), Bild geladen, „×“ ≥ 44 px blendet ihn aus und
      er bleibt beim nächsten Laden weg. Kein Kindername im Gruß. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v944 Saison-Gruß: Feiertage, Karneval, Ferien, Spieltag und Jahreszeiten mit dem passenden Adler";
  const probleme = [], zeilen = [];
  const REPO = h.REPO, sw = fs.readFileSync(path.join(REPO, "sw.js"), "utf8");
  const T = (id, tp, typ) => ({ id, datum: h.tagePlus(tp), typ: typ || "training", titel: "Training", gegner: "Training", uhrzeit: "16:45:00", uhrzeit_ende: null, heim: true, ort: "Thurner Kamp 97, 51069 Köln", trainer_status: {} });
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => [T(1, 2)],
      rueckmeldungen: [], kind_fanfacts: [], kind_foto: [] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); /* v947: der Moin-Gruß kommt einmal am Tag zuerst – hier gilt er als schon gesehen */ const d = new Date(), z = n => String(n).padStart(2, "0"); localStorage.setItem("adler_moin_tag", d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate())); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 60 && !document.querySelector("#saison-slot .saison"); i++) await w(100);
    const out = {};
    const iso = d => new Date(saisonOstern(d)).toISOString().slice(0, 10);
    out.ostern = [2026, 2027, 2028].map(iso).join(" ");
    const F = [{ von: "2027-07-01", bis: "2027-08-13", name: "Sommerferien" }];
    const fall = (d, th) => { const s = saisonFuer(d, th || [], F); return s.id.replace(/-.*/, "") + "/" + s.adler; };
    out.faelle = {
      "2026-12-10": fall("2026-12-10"), "2026-12-25": fall("2026-12-25"), "2026-12-30": fall("2026-12-30"), "2027-01-02": fall("2027-01-02"),
      "2026-11-11": fall("2026-11-11"), "2027-02-04": fall("2027-02-04"), "2027-02-09": fall("2027-02-09"), "2027-02-10": fall("2027-02-10"),
      "2027-03-25": fall("2027-03-25"), "2027-03-29": fall("2027-03-29"), "2027-03-30": fall("2027-03-30"), "2026-10-31": fall("2026-10-31"),
      "2027-07-15": fall("2027-07-15"), "2027-09-01": fall("2027-09-01"), "2026-11-22": fall("2026-11-22"),
      "spiel": fall("2026-12-10", [{ typ: "spiel", datum: "2026-12-10" }]), "abgesagt": fall("2026-12-10", [{ typ: "spiel", datum: "2026-12-10", platz_status: "abgesagt" }])
    };
    out.ferienText = saisonFuer("2027-07-15", [], F).text;
    out.adler = [...new Set(["2026-12-10", "2026-12-30", "2026-11-11", "2027-03-29", "2026-10-31", "2027-04-10", "2027-07-01", "2026-11-22", "2027-01-20"].map(d => saisonFuer(d, [], []).adler))];
    const s = document.querySelector("#saison-slot .saison"), fe = document.getElementById("fuer-euch"), kopf = document.getElementById("ep-kopf");
    out.da = !!s; if (!s) return out;
    out.text = txt(s); const img = s.querySelector("img.saison-adler");
    out.bild = img ? (img.complete && img.naturalWidth > 0) : false; out.src = img ? img.getAttribute("src") : "";
    out.reihe = !!(kopf && s.getBoundingClientRect().top >= kopf.getBoundingClientRect().bottom - 1 && (!fe || fe.hidden || s.getBoundingClientRect().bottom <= fe.getBoundingClientRect().top + 1));
    const x = s.querySelector(".saison-weg"); out.x = x ? Math.round(Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height)) : 0;
    x.click(); await w(100); out.weg = !document.querySelector("#saison-slot .saison");
    await saisonGruss([]); await w(100); out.wegNochmal = !document.querySelector("#saison-slot .saison");
    out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const f = e.fehler(); await e.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (r.ostern !== "2026-04-05 2027-03-28 2028-04-16") probleme.push("a) Ostern " + r.ostern);
    const soll = { "2026-12-10": "advent/weihnachtsmuetze", "2026-12-25": "weihnachten/weihnachtsmuetze", "2026-12-30": "silvester/partyhut", "2027-01-02": "neujahr/partyhut",
      "2026-11-11": "elfter/narrenkappe", "2027-02-04": "karneval/narrenkappe", "2027-02-09": "karneval/narrenkappe", "2027-02-10": "winter/vereinsmuetze",
      "2027-03-25": "ostern/hasenohren", "2027-03-29": "ostern/hasenohren", "2027-03-30": "fruehling/bluete", "2026-10-31": "halloween/kuerbis",
      "2027-07-15": "ferien/sonnenbrille", "2027-09-01": "sommer/sonnenbrille", "2026-11-22": "herbst/schal", "spiel": "spieltag/schal", "abgesagt": "advent/weihnachtsmuetze" };
    const ab = Object.keys(soll).filter(k => r.faelle[k] !== soll[k]).map(k => `${k}: ${r.faelle[k]} statt ${soll[k]}`);
    if (ab.length) probleme.push("b) " + ab.join(" · "));
    if (r.ferienText !== "🏖️ Schöne Sommerferien!") probleme.push("b) Ferien-Text „" + r.ferienText + "“");
    const fehlt = r.adler.filter(n => { const p = `Maskottchen/varianten/adler_winkt_${n}/adler_winkt_${n}_klein.webp`; return !fs.existsSync(path.join(REPO, p)) || !sw.includes("./" + p); });
    if (fehlt.length) probleme.push("c) Bild fehlt oder nicht im PRECACHE: " + fehlt.join(", "));
    if (!r.da) probleme.push("d) kein Saison-Gruß auf der Startseite");
    else {
      if (!r.bild) probleme.push("d) Bild nicht geladen: " + r.src);
      if (!r.reihe) probleme.push("d) Streifen steht nicht zwischen Kopf und „Für euch“");
      if (r.x < 44) probleme.push("d) „×“ " + r.x + " px");
      if (!r.weg || !r.wegNochmal) probleme.push(`d) ausblenden ${r.weg}, bleibt weg ${r.wegNochmal}`);
      if (/Kind [A-O]/.test(r.text)) probleme.push("d) Kindername im Gruß");
      if (r.quer) probleme.push("d) Querscrollen");
    }
  }
  const fehler = f.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) Ostern ${r.ostern} · b) ${Object.keys(r.faelle || {}).length} Tage richtig zugeordnet, Spieltag vor Advent`);
  zeilen.push(`c) ${(r.adler || []).length} Adler im PRECACHE · d) „${r.text}“ · × ${r.x} px · bleibt ausgeblendet`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
