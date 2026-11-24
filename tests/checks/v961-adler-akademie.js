/* v961 · Charles 24.11.: „Wir machen aus der Adler-Schule eine Adler-Akademie und integrieren die Technik-Abzeichen dort mit rein.
   Dann haben wir Theorie und Praxis … Dann brauchen wir auch eine nächste Stufe … Aber keine Kopfball mehr.“ Bild freigegeben;
   Silber ab 8 von 9 Bronze; wer die ersten Abzeichen schon hat (auch Kopfball), geht direkt auf Silber.
   a) Daten: Bronze zeigt neun Abzeichen ohne Kopfball (Kennung bleibt, alt:true); Silber zehn eigene Kennungen ab2_…, je mit
      Schritten und Tipp, kein Kopfball.
   b) Freischalten: 7 Bronze → Silber zu („Noch 1 …“); 7 Bronze + schon verdientes Kopfball → 8 → Silber offen.
   c) Eltern: „Geschafft“ bei Silber schreibt die Quelle abzeichen_silber, bei Bronze abzeichen.
   d) Kinder-Akademie: Start „Adler-Akademie“ mit „Theorie · Unterricht“ und „Praxis · Trainingsplatz“; Praxis zeigt die Stufen
      Bronze, Silber, Gold ohne Abhak-Knöpfe; Antippen zeigt „So geht's“ mit Schritten und Tipp.
   e) Kabine: Kachel „Adler-Akademie“, keine eigene Abzeichen-Kachel mehr; Migration: abzeichen_silber 20 Federn. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v961 Adler-Akademie: Theorie und Praxis, Technik-Abzeichen Bronze und Silber, ohne Kopfball";
  const probleme = [], zeilen = [];
  const bronze7 = ["ab_jonglier", "ab_beidfuss", "ab_slalom", "ab_innenseite", "ab_sohle", "ab_torschuss", "ab_ausdauer"];
  let mitKopfball = false;
  const rpc = {
    xp_events_for: (u, req) => { let b = {}; try { b = JSON.parse(req.postData() || "{}"); } catch (e) {} return b.p_quelle === "abzeichen" ? bronze7.concat(mitKopfball ? ["ab_kopfball"] : []) : []; },
    xp_award_event: 20
  };
  const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 390, hoehe: 900, warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), rpc }) });
  await s.page.exposeFunction("__kopfball", v => { mitKopfball = !!v; });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 50 && (typeof TECHNIK_SILBER === "undefined" || typeof akademieStartHtml !== "function"); i++) await w(100);
    if (typeof TECHNIK_SILBER === "undefined" || typeof akademieStartHtml !== "function") return { alt: true };
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    localStorage.setItem("adler_quiz_tutorial_done", "1");
    const out = {};
    out.a = { bronze: ABZ_STUFEN[0].liste().map(a => a.id), silber: TECHNIK_SILBER.map(a => a.id), ohneSchritte: TECHNIK_SILBER.filter(a => !(a.schritte && a.schritte.length >= 2 && a.tipp)).length,
      kopf: TECHNIK_SILBER.concat(ABZ_STUFEN[0].liste()).filter(a => /kopfball|köpf/i.test(a.name + a.desc + (a.schritte || []).join(" "))).map(a => a.id) };
    // b) und d) als Kind
    tqPlayer = "Kind A"; _akBereich = null; tqStart(); await w(300);
    const panel = document.getElementById("tq-panel");
    out.d = { titel: txt(panel).slice(0, 60), theorie: txt(document.getElementById("ak-theorie")), praxis: txt(document.getElementById("ak-praxis")) };
    document.getElementById("ak-praxis")?.click(); await w(600);
    const platz = document.getElementById("abzeichen-list");
    out.b = { zu: txt(platz && platz.querySelectorAll(".abz-stufe")[1]), knoepfe: platz ? platz.querySelectorAll("button.btn").length : -1, stufen: platz ? [...platz.querySelectorAll(".abz-stufe-k")].map(e => txt(e.querySelector("span"))) : [] };
    await window.__kopfball(true);
    await abzeichenRender(_akKindId(), true); await w(200);
    out.b.offen = platz ? [...platz.querySelectorAll(".abz-stufe")[1].querySelectorAll(".abz-zeile")].length : 0;
    platz.querySelectorAll(".abz-stufe")[1].querySelector(".abz-info")?.click(); await w(200);
    const det = document.getElementById("abz-detail");
    out.d.detail = { schritte: det ? det.querySelectorAll(".abz-schritte li").length : 0, tipp: txt(det && det.querySelector(".abz-tipp")), eintragen: !!(det && /Als geschafft eintragen/.test(txt(det))) };
    det?.remove();
    // c) als Eltern (gleiche Funktion, ohne Kindermodus)
    const kid = _akKindId(); panel.innerHTML = "";   // die Eltern-Ansicht steht in einer anderen App – hier nur nacheinander
    abzeichenOpen(kid, "Kind A", false); await w(600);
    const ab = document.querySelector('#abzeichen-modal .abz-stufe:nth-of-type(2) button.btn');
    out.c = { knopf: !!ab };
    window.__rpc = [];
    const echt = window.fetch; window.fetch = (u, o) => { if (/rpc\/xp_award_event/.test(String(u))) { try { window.__rpc.push(JSON.parse(o.body)); } catch (e) {} } return echt(u, o); };
    ab?.click(); await w(500);
    window.fetch = echt;
    out.c.rpc = window.__rpc;
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["Akademie fehlt (Stand vor v961)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (r.a.bronze.length !== 9 || r.a.bronze.includes("ab_kopfball") || r.a.silber.length !== 10 || r.a.silber.some(x => !/^ab2_/.test(x)) || r.a.ohneSchritte || r.a.kopf.length) probleme.push("a) " + JSON.stringify(r.a));
  if (!/Noch 1 Bronze/.test(r.b.zu) || r.b.knoepfe !== 0) probleme.push(`b) 7 Bronze: „${r.b.zu}“, Abhak-Knöpfe im Kindermodus ${r.b.knoepfe}`);
  if (r.b.offen !== 10) probleme.push("b) mit Kopfball (8) ist Silber nicht offen: " + r.b.offen + " Zeilen");
  if (!/Adler-Akademie/.test(r.d.titel) || !/Theorie · Unterricht/.test(r.d.theorie) || !/Praxis · Trainingsplatz/.test(r.d.praxis)) probleme.push("d) Start " + JSON.stringify(r.d).slice(0, 200));
  if (JSON.stringify(r.b.stufen.map(x => x.split(" ")[1])) !== JSON.stringify(["Bronze", "Silber", "Gold"])) probleme.push("d) Stufen " + JSON.stringify(r.b.stufen));
  if (r.d.detail.schritte < 2 || !r.d.detail.tipp || r.d.detail.eintragen) probleme.push("d) Detail " + JSON.stringify(r.d.detail));
  if (!r.c.knopf || !r.c.rpc.length || r.c.rpc[0].p_quelle !== "abzeichen_silber" || !/^ab2_/.test(r.c.rpc[0].p_quelle_id)) probleme.push("c) Eltern-Haken Silber " + JSON.stringify(r.c));
  const kab = fs.readFileSync(path.join(h.REPO, "md-kabine.js"), "utf8");
  if (!/tile\("kabineQuiz\('schule'\)","🎓","Adler-Akademie"/.test(kab) || /tile\("kabineAbzeichen\(\)"/.test(kab)) probleme.push("e) Kabine-Kacheln");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261124_v961_abzeichen_silber.sql"), "utf8");
  if (!/when 'abzeichen_silber' then 20/.test(mig) || !/p\.quelle in \('abzeichen', 'abzeichen_silber'\)/.test(mig)) probleme.push("e) Migration");
  const f2 = fe.filter(x => !/Failed to load resource/.test(x)); if (f2.length) probleme.push("Konsole: " + f2.slice(0, 2).join(" | "));
  zeilen.push(`a) Bronze ${r.a.bronze.length}, Silber ${r.a.silber.length}, ohne Kopfball · b) „${r.b.zu}“ → mit Kopfball ${r.b.offen} Silber-Zeilen · c) ${JSON.stringify(r.c.rpc[0] || {})} · d) ${r.b.stufen.join(" | ")}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
