/* v852 · Profil des einzelnen Kindes (Charles 18.11.2026): Stufen in Worten statt Prozent.
   a) Das Profil zeigt je Bereich Ansatz/Solide/Gut/Stark bzw. „nicht gesehen“ – kein Prozentzeichen,
      kein „Entwicklungsstand“, kein „Entwicklungstempo“.
   b) Der erzeugte Profiltext und die Zusammenfassung tragen keine Prozentzahl.
   c) Ein Bereich, in dem alles „Ansatz“ ist, heißt „Ansatz“ und hat einen sichtbaren Balken.
   d) Die Verlaufsliste nennt je Bereich die Stufe, keine Prozentwerte. */
"use strict";
module.exports = async function (h) {
  const titel = "v852 Profil: Stufen in Worten statt Prozent – auch Profiltext und Verlauf";
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 2200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), spielerprofile: [],
    team_einstellungen: [], profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], termine: [] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    if (typeof bewStufeWort !== "function") return { alt: true };
    try { await loadKader(); } catch (e) {}
    out.wort = [null, 0, 16, 33, 67, 100].map(bewStufeWort).join("|");
    const n = KADER.filter(k => k.aktiv !== false && !k.tw)[0].name, v = {};
    DIMS_FELD.forEach(d => d.tier.forEach(t => { v[t.n] = d.id === "entw" ? 1 : d.id === "phys" ? 0 : d.id === "tech" ? 4 : 2; }));
    const bau = dat => bewZeileBauen({ name: n, trainer: "Trainerteam", date: dat, foot: "R", age: "8", grp: "flex", eltern: "", att: "2", notes: "", tw: false }, v).row;
    const z1 = bau("2026-09-01"); v.f_coach = 3; v.f_freude = 3; const z2 = bau("2026-11-18");
    DB = {}; DB[n] = [z1, z2]; out.fazit = z2.fazit; out.summary = z2.summary;
    if (typeof refreshSelects === "function") refreshSelects();
    go("profil"); await w(200);
    const sel = document.getElementById("psel-profil"); sel.value = n; sel.dispatchEvent(new Event("change", { bubbles: true })); await w(900);
    const pc = document.getElementById("profil-content");
    out.profil = pc.innerText.replace(/\s+/g, " ");
    out.zeilen = [...pc.querySelectorAll(".rl-item")].map(z => z.querySelector(".rl-nm").textContent.trim() + "=" + z.querySelector(".rl-vl").textContent.trim() + "/" + Math.round(z.querySelector(".rl-bf").getBoundingClientRect().width));
    out.breit = pc.scrollWidth > document.documentElement.clientWidth;
    DB[n] = [z1]; renderProfil(); await w(500);
    out.ansatz = [...pc.querySelectorAll(".rl-item")].map(z => z.querySelector(".rl-vl").textContent.trim() + "/" + Math.round(z.querySelector(".rl-bf").getBoundingClientRect().width))[4];
    DB[n] = [z1, z2]; go("verlauf"); await w(200);
    const vs = document.querySelector("#view-verlauf select"); if (vs) { vs.value = n; vs.dispatchEvent(new Event("change", { bubbles: true })); } await w(900);
    out.verlauf = (document.getElementById("verlauf-content") || {}).innerText || "";
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["bewStufeWort fehlt (Stand vor v852)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.wort !== "nicht gesehen|Ansatz|Ansatz|Solide|Gut|Stark") probleme.push("Stufenworte: " + r.wort);
  if (/%|Entwicklungsstand|Entwicklungstempo/.test(r.profil)) probleme.push("a) Profil zeigt Prozent oder die alten Kennzahlen: " + (r.profil.match(/.{0,30}(%|Entwicklungs(stand|tempo)).{0,20}/) || [""])[0]);
  else if (!/^Technik=Stark\/\d+$/.test(r.zeilen[0]) || !/^Dynamik=nicht gesehen\/0$/.test(r.zeilen[2]) || r.breit) probleme.push("a) Bereiche: " + JSON.stringify(r.zeilen) + (r.breit ? " · breiter als der Bildschirm" : ""));
  else zeilen.push("a) " + r.zeilen.map(z => z.split("/")[0]).join(" · "));
  if (/%/.test(r.fazit) || /%/.test(r.summary) || /Messwert/.test(r.fazit)) probleme.push("b) Profiltext mit Prozent: " + ((r.fazit + " " + r.summary).match(/.{0,40}%.{0,10}/) || [""])[0]);
  else zeilen.push("b) Profiltext und Zusammenfassung ohne Prozent");
  const [aw, ab] = String(r.ansatz || "").split("/");
  if (aw !== "Ansatz" || !(Number(ab) >= 8)) probleme.push(`c) Bereich mit nur „Ansatz“: ${r.ansatz}`); else zeilen.push(`c) „Ansatz“ mit ${ab} px Balken statt 0 %`);
  if (!r.verlauf || /%/.test(r.verlauf) || !/Lernen: (Ansatz → Gut|Gut)/.test(r.verlauf)) probleme.push("d) Verlauf: " + String(r.verlauf).replace(/\s+/g, " ").slice(0, 220));
  else zeilen.push("d) Verlauf nennt Stufen, kein Prozentzeichen");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
