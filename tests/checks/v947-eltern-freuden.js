/* v947 · Charles 22.11.: weitere kleine Freuden, nur Eltern-App (Bild freigegeben).
   a) Moin-Sprechblase: beim ersten Öffnen des Tages statt des Saison-Grußes „Moin! 👋“ mit 🔊 (≥ 44 px), danach wieder der
      Saison-Gruß; der Sprechtext steht zwischen den LEHRER-TEXTE-Marken (Vertonung Lennart findet ihn).
   b) Monats-Lob: Sind alle Termine des Monats, die eine Antwort brauchen, für alle Kinder beantwortet, steht in „📌 Für euch“
      „✓ Alle Termine im … beantwortet“; fehlt eine Antwort, nicht; Training zählt nicht; „✕“ blendet bis Monatsende aus.
   c) Wetter-Spruch: wetterSpruch() – Regen, Kälte, Hitze, schönes Wetter; wetterInto zeigt ihn nur mit {spruch:true}.
   d) Pokal-Vitrine unter „Mein Konto“: 10/25/50/100, bei 31 Antworten zwei geschafft, „noch 19“ und „noch 69“. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v947 Eltern: Moin-Sprechblase, Monats-Lob, Wetter-Spruch, Pokal-Vitrine";
  const probleme = [], zeilen = [];
  const quiz = fs.readFileSync(path.join(h.REPO, "quiz.js"), "utf8");
  const lt = quiz.slice(quiz.indexOf("/*LEHRER-TEXTE-ANFANG*/"), quiz.indexOf("/*LEHRER-TEXTE-ENDE*/"));
  if (!/const ELTERN_MOIN="Moin!/.test(lt)) probleme.push("a) ELTERN_MOIN fehlt zwischen den LEHRER-TEXTE-Marken");
  const heute = h.tagePlus(0), monat = heute.slice(0, 7);
  const imMonat = [1, 2, 3, 4, 5].map(h.tagePlus).filter(d => d.slice(0, 7) === monat);
  const spielTag = imMonat[0] || heute;
  const T = (id, d, typ) => ({ id, datum: d, typ, titel: typ, gegner: typ, uhrzeit: "10:00:00", uhrzeit_ende: null, heim: true, ort: "Thurner Kamp 97, 51069 Köln", trainer_status: {} });
  const z = { rm: [{ termin_id: 1, spieler_id: 1, status: "zugesagt" }] };
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }],
      termine: () => [T(1, spielTag, "spiel"), T(2, spielTag, "training")],
      rueckmeldungen: u => /updated_by/.test(u.search) ? Array.from({ length: 31 }, (_, i) => ({ id: i })) : z.rm,
      kind_fanfacts: [], kind_foto: [] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 60 && !document.querySelector("#saison-slot .saison"); i++) await w(100);
    await w(300);
    const out = {}, s = document.querySelector("#saison-slot .saison");
    out.moin = s ? s.getAttribute("data-saison") : ""; out.moinText = txt(s);
    const ton = s && s.querySelector(".saison-ton"); out.ton = ton ? Math.round(Math.min(ton.offsetWidth, ton.offsetHeight)) : 0;
    out.moinFn = typeof moinVorlesen === "function" && typeof ELTERN_MOIN === "string";
    await saisonGruss([]); await w(100); out.danach = (document.querySelector("#saison-slot .saison") || { getAttribute: () => "" }).getAttribute("data-saison");
    const lob = document.querySelector("#fe-bahn .lob-karte"); out.lob = txt(lob);
    out.lobFalsch = (() => { const k = _elternKids || [{ spieler_id: 1 }]; const tt = [{ id: 9, datum: isoLokal(), typ: "spiel" }]; lobMonatKarte(tt, k, {}); return !!document.querySelector("#lob-slot .lob-karte"); })();
    out.lobTraining = (() => { lobMonatKarte([{ id: 2, datum: isoLokal(), typ: "training" }], [{ spieler_id: 1 }], {}); return !!document.querySelector("#lob-slot .lob-karte"); })();
    lobMonatKarte([{ id: 1, datum: isoLokal(), typ: "spiel" }], [{ spieler_id: 1 }], { 1: { 1: "zugesagt" } });
    const x = document.querySelector("#lob-slot .fe-x"); out.lobX = x ? Math.round(Math.min(x.offsetWidth, x.offsetHeight)) : 0; if (x) x.click();
    lobMonatKarte([{ id: 1, datum: isoLokal(), typ: "spiel" }], [{ spieler_id: 1 }], { 1: { 1: "zugesagt" } }); out.lobWeg = !document.querySelector("#lob-slot .lob-karte");
    out.spruch = [wetterSpruch({ rain: 80, temp: 15, hour: true }), wetterSpruch({ rain: 0, temp: 2, hour: true }), wetterSpruch({ rain: 0, temp: 30, hour: true }), wetterSpruch({ rain: 10, temp: 18, hour: true }), wetterSpruch({ rain: 40, temp: 9, hour: true })];
    const div = document.createElement("div"); div.id = "w-test"; document.body.appendChild(div);
    wetterFetch = async () => ({ emoji: "🌧️", text: "Regen", temp: 8, rain: 80, hour: true });
    await wetterInto("w-test", "x", "y", "10:00"); out.ohne = /Echte Adler/.test(div.textContent);
    await wetterInto("w-test", "x", "y", "10:00", { spruch: true }); out.mit = /Echte Adler/.test(div.textContent);
    window.sbUserId = () => "u1"; elternKontoOpen(); for (let i = 0; i < 30 && !document.querySelector("#vitrine-slot .vitrine"); i++) await w(100);
    out.vitrine = [...document.querySelectorAll("#vitrine-slot .vitrine-pokal")].map(p => (p.classList.contains("da") ? "✓" : "·") + txt(p));
    out.stand = txt(document.querySelector("#vitrine-slot .vitrine-stand"));
    out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = e.fehler(); await e.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (r.moin !== "moin" || !/Moin! 👋/.test(r.moinText) || r.ton < 44 || !r.moinFn) probleme.push(`a) Moin: ${r.moin} „${r.moinText}“ 🔊 ${r.ton} px, Funktion ${r.moinFn}`);
    if (!r.danach || r.danach === "moin") probleme.push("a) nach dem ersten Mal wieder Moin statt Saison-Gruß: " + r.danach);
    if (imMonat.length && !/Alle Termine im .+ beantwortet/.test(r.lob)) probleme.push("b) Monats-Lob fehlt: „" + r.lob + "“");
    if (r.lobFalsch) probleme.push("b) Lob trotz fehlender Antwort");
    if (r.lobTraining) probleme.push("b) Lob nur wegen eines Trainings");
    if (r.lobX < 44 || !r.lobWeg) probleme.push(`b) ✕ ${r.lobX} px, bleibt weg ${r.lobWeg}`);
    const soll = ["☔ Echte Adler fliegen auch bei Regen!", "🥶 Kalt draußen – beim Kicken wird’s schnell warm!", "☀️ Heiß heute – Trinkpausen gibt’s genug.", "🌤️ Bestes Fußballwetter!", ""];
    if (JSON.stringify(r.spruch) !== JSON.stringify(soll)) probleme.push("c) Sprüche " + JSON.stringify(r.spruch));
    if (r.ohne || !r.mit) probleme.push(`c) wetterInto: ohne Schalter ${r.ohne}, mit ${r.mit}`);
    if (JSON.stringify(r.vitrine) !== JSON.stringify(["✓🏆10geschafft", "✓🏆25geschafft", "·🔒50noch 19", "·🔒100noch 69"].map(x => x.replace(/(🏆|🔒)(\d+)/, "$1 $2 ").replace(/(\d+) (geschafft|noch)/, "$1 $2")))) {
      const flach = (r.vitrine || []).map(x => x.replace(/\s+/g, ""));
      if (JSON.stringify(flach) !== JSON.stringify(["✓🏆10geschafft", "✓🏆25geschafft", "·🔒50noch19", "·🔒100noch69"])) probleme.push("d) Vitrine " + JSON.stringify(r.vitrine));
    }
    if (!/31 Antworten/.test(r.stand)) probleme.push("d) Stand „" + r.stand + "“");
    if (r.quer) probleme.push("Querscrollen");
  }
  const fehler = fe.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) „${String(r.moinText || "").slice(0, 40)}“, danach ${r.danach} · b) „${r.lob || "(Monatsende – kein Termin mehr im Monat)"}“`);
  zeilen.push(`c) ${(r.spruch || []).filter(Boolean).length} Sprüche, nur mit {spruch:true} · d) ${(r.vitrine || []).join(" | ")}`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
