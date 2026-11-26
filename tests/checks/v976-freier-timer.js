/* v976 · Freier Timer (Charles 26.11.2026): klassische Stoppuhr im Training-Tab, auf Tipp groß.
   a) Training-Tab: unter den vier Kacheln steht die Stoppuhr (#fu-slot .fu-karte, ≥ 44 px); die vier Kacheln bleiben vier
   b) Tipp öffnet ein Vollbild-Fenster (Dialog), Minuten-, Runden- und Pausen-Wahl mit aria-pressed, alle ≥ 44 px; Wahl bleibt je Gerät
   c) Ablauf 1 Min. × 2 Runden, 0:30 Pause: Runde 1 → Pause → Runde 2 → Schluss; je Übergang ein Signal an die Uhr
   d) Pause hält die Zeit an, Weiter läuft vom selben Rest; Stopp schließt
   e) Restzeit geht über uhrRest an die Uhr („in dieser Runde“) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof fuOpen !== "function" || typeof kachelSeite !== "function"); i++) await w(100);
    if (typeof fuOpen !== "function") return { fehlt: "fuOpen" };
    const o = {};
    if (typeof go === "function") go("ue-training"); else kachelSeite("training"); await w(300);
    const k = document.querySelector("#view-ue-training #fu-slot .fu-karte");
    o.a = { da: !!k, hoehe: k ? Math.max(Math.round(k.getBoundingClientRect().height), parseFloat(getComputedStyle(k).minHeight) || 0) : 0, kacheln: document.querySelectorAll("#view-ue-training #kachel-body > :not(#fu-slot):not(#training-termine) button, #view-ue-training #kachel-body > :not(#fu-slot):not(#training-termine) [onclick]").length };
    const meld = []; window.uhrMeldung = async (t, x) => { meld.push(t); return true; };
    const rest = []; window.uhrRest = async (sek, was) => { rest.push(was); return true; };
    window.rotBeep = () => {};
    localStorage.removeItem("adler_fu_wahl");
    k.click(); await w(50);
    const ov = document.getElementById("fu-timer");
    const chips = [...ov.querySelectorAll(".fu-chip")];
    o.b = { dialog: ov.getAttribute("role") === "dialog" && ov.getAttribute("aria-modal") === "true", chips: chips.length, klein: chips.filter(c => c.getBoundingClientRect().height < 44).length, gedrueckt: chips.filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.textContent).join(",") };
    fuWahl("min", 1); fuWahl("runden", 2); fuWahl("pause", 30);
    o.b.gespeichert = localStorage.getItem("adler_fu_wahl");
    o.b.pauseNach = [...document.querySelectorAll("#fu-timer .fu-chip[aria-pressed=true]")].map(c => c.textContent).join(",");
    document.querySelector("#fu-timer .fu-start").click(); await w(300);
    o.c = [ _fu.phase + ":" + _fu.runde + ":" + Math.round(_fu.gesamt) ];
    o.e = rest.slice(0, 1);
    // d) Pause hält an
    _fu.ende = Date.now() + 40000; _fuTick(); fuPause(); const r1 = _fu.rest; await w(600); _fuTick(); const r2 = _fu.rest; fuPause(); _fuTick();
    o.d = { stand: Math.abs(r1 - r2) < 0.01, weiter: Math.round(_fu.rest) };
    _fu.ende = Date.now() - 1; _fuTick(); o.c.push(_fu.phase + ":" + _fu.runde + ":" + Math.round(_fu.gesamt));
    o.c.push(document.querySelector("#fu-timer .fu-uhr .fu-ring").getAttribute("stroke"));
    _fu.ende = Date.now() - 1; _fuTick(); o.c.push(_fu.phase + ":" + _fu.runde);
    _fu.ende = Date.now() - 1; _fuTick(); o.c.push(_fu.phase);
    o.meld = meld.slice();
    o.fertigText = document.getElementById("fu-timer").textContent.includes("Zeit ist um");
    o.timerWeg = _fu.timer === null;
    fuStop(); o.d.zu = !document.getElementById("fu-timer");
    return o;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push("Funktion fehlt: " + r.fehlt); return h.ergebnis("v976 Freier Timer", false, probleme); }
  if (!r.a.da || r.a.hoehe < 44) probleme.push("a) " + JSON.stringify(r.a)); else zeilen.push(`a) Stoppuhr unter den Training-Kacheln, ${r.a.hoehe} px hoch`);
  if (!r.b.dialog || r.b.klein || r.b.chips < 11 || r.b.gedrueckt !== "3,1" || r.b.gespeichert !== '{"min":1,"runden":2,"pause":30}' || r.b.pauseNach !== "1,2,0:30")
    probleme.push("b) " + JSON.stringify(r.b));
  else zeilen.push(`b) Vollbild-Dialog, ${r.b.chips} Wahlknöpfe ≥ 44 px, Standard 3 Min./1 Runde, Wahl gespeichert, Pause erst ab 2 Runden`);
  const sollC = ["lauf:1:60", "pause:1:30", "#f59e0b", "lauf:2", "fertig"], sollM = ["⏸ Pause", "▶ Runde 2", "⏱️ Abpfiff"];
  if (r.c.join() !== sollC.join() || r.meld.join() !== sollM.join() || !r.fertigText || !r.timerWeg) probleme.push("c) " + JSON.stringify({ c: r.c, meld: r.meld, fertig: r.fertigText, timerWeg: r.timerWeg }));
  else zeilen.push(`c) Ablauf ${r.c.filter(x => x[0] !== "#").join(" → ")}, Pause gelb; an die Uhr: ${r.meld.join(" · ")}`);
  if (!r.d.stand || r.d.weiter < 38 || r.d.weiter > 40 || !r.d.zu) probleme.push("d) " + JSON.stringify(r.d)); else zeilen.push(`d) Pause hält die Zeit, Weiter ab ${r.d.weiter} s, Stopp schließt`);
  if (r.e[0] !== "in dieser Runde") probleme.push("e) " + JSON.stringify(r.e)); else zeilen.push("e) Restzeit an die Uhr: „in dieser Runde“");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v976 Freier Timer (Stoppuhr im Training-Tab)", !probleme.length, zeilen.concat(probleme));
};
