/* v974 · Timer an die Uhr, Stufe 1 (Charles 26.11.2026): Jedes Timer-Signal kommt zusätzlich als Benachrichtigung mit Vibration –
   Android spiegelt sie auf die gekoppelte Uhr.
   a) Aus (Standard): stTimerWhistle meldet nichts; ohne Erlaubnis auch eingeschaltet nichts
   b) An + Erlaubnis: Abpfiff (stTimerWhistle), Wechsel und Vorwarnung melden je eine Benachrichtigung mit tag „adler-uhr“,
      renotify, Vibrationsmuster und Ziel ./trainer/; zwei Signale im selben Moment ergeben eine Meldung
   c) Fenster „Timer an die Uhr“: Dialog, Schalter Aus/An (aria-pressed, ≥ 44 px), „Test an die Uhr“ nur eingeschaltet aktiv;
      „An“ fragt die Erlaubnis und speichert je Gerät; der Test meldet auch ohne Zeitsperre
   d) Kachel „⌚ Timer an die Uhr“ unter Orga → Einstellungen */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && (typeof uhrMeldung !== "function" || typeof stTimerWhistle !== "function" || typeof rotVorwarnung !== "function"); i++) await w(100);
    if (typeof uhrMeldung !== "function") return { fehlt: true };
    const calls = []; let perm = "default", gefragt = 0;
    Object.defineProperty(window, "Notification", { configurable: true, value: { get permission() { return perm; }, requestPermission: async () => { gefragt++; perm = "granted"; return perm; } } });
    try { navigator.serviceWorker.getRegistration = async () => ({ scope: location.origin + "/", showNotification: async (t, o) => { calls.push({ t, o }); } }); } catch (e) { return { fehlt: "sw" }; }
    window.rotBeep = () => {};
    const o = {};
    localStorage.removeItem("adler_uhr_meldung");
    stTimerWhistle(); await w(100); o.aus = calls.length;
    localStorage.setItem("adler_uhr_meldung", "1"); perm = "denied";
    uhrMeldung._z = 0; stTimerWhistle(); await w(100); o.ohneErlaubnis = calls.length;
    perm = "granted";
    uhrMeldung._z = 0; stTimerWhistle(); await w(100);
    uhrMeldung._z = 0; rotVorwarnung(); await w(100);
    uhrMeldung._z = 0; await uhrMeldung("🔁 Wechsel", "Jetzt durchwechseln."); await w(50);
    o.drei = calls.map(c => ({ t: c.t, tag: c.o.tag, re: c.o.renotify, vib: (c.o.vibrate || []).length, url: c.o.data && c.o.data.url }));
    uhrMeldung._z = 0; const n = calls.length; stTimerWhistle(); stTimerWhistle(); await w(100); o.doppelt = calls.length - n;
    // c) Fenster
    localStorage.removeItem("adler_uhr_meldung"); perm = "default";
    uhrMeldungOpen(); await w(50);
    const m = document.getElementById("uhr-modal"), kn = () => [...m.querySelectorAll("#uhr-schalter .seg-btn")];
    o.c = { dialog: m && m.getAttribute("role") === "dialog" && m.getAttribute("aria-modal") === "true", knopfe: kn().map(b => b.textContent.trim() + ":" + b.getAttribute("aria-pressed") + ":" + Math.round(b.getBoundingClientRect().height)), testAus: document.getElementById("uhr-test").disabled };
    kn().find(b => b.textContent.trim() === "An").click(); await w(200);
    o.c.nach = { gespeichert: localStorage.getItem("adler_uhr_meldung"), gefragt, knopfe: kn().map(b => b.textContent.trim() + ":" + b.getAttribute("aria-pressed")), testAn: !document.getElementById("uhr-test").disabled };
    const vor = calls.length; await uhrMeldungTest(); await w(50); o.c.test = calls.length - vor === 1 ? calls[calls.length - 1].t : null;
    m.remove();
    return o;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) probleme.push("Funktionen fehlen: " + r.fehlt);
  else {
    if (r.aus || r.ohneErlaubnis) probleme.push(`a) aus ${r.aus}, ohne Erlaubnis ${r.ohneErlaubnis}`); else zeilen.push("a) aus und ohne Erlaubnis: keine Meldung");
    const t = r.drei.map(x => x.t).join(" | ");
    if (r.drei.length !== 3 || t !== "⏱️ Abpfiff | ⏳ Gleich Wechsel | 🔁 Wechsel" || r.drei.some(x => x.tag !== "adler-uhr" || !x.re || x.vib < 3 || x.url !== "./trainer/") || r.doppelt !== 1)
      probleme.push("b) " + JSON.stringify({ drei: r.drei, doppelt: r.doppelt }));
    else zeilen.push(`b) an: „${t}“ mit tag adler-uhr, Vibration, Ziel ./trainer/; zwei Pfiffe im selben Moment = 1 Meldung`);
    const c = r.c;
    if (!c.dialog || c.knopfe.join() !== "Aus:true:" + c.knopfe[0].split(":")[2] + ",An:false:" + c.knopfe[1].split(":")[2] || c.knopfe.some(k => Number(k.split(":")[2]) < 44) || !c.testAus || c.nach.gespeichert !== "1" || c.nach.gefragt !== 1 || c.nach.knopfe.join() !== "Aus:false,An:true" || !c.nach.testAn || c.test !== "⌚ Test an die Uhr")
      probleme.push("c) " + JSON.stringify(c));
    else zeilen.push(`c) Fenster: ${c.knopfe.join(" · ")}, Test erst eingeschaltet; „An“ fragt einmal und speichert; Test kommt an`);
  }
  const v = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/\{emo:"⌚",label:"Timer an die Uhr",fn:"uhrMeldungOpen"\}/.test(v)) probleme.push("d) Kachel fehlt in den Einstellungen"); else zeilen.push("d) Kachel „⌚ Timer an die Uhr“ unter Einstellungen");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v974 Timer an die Uhr (Benachrichtigung mit Vibration)", !probleme.length, zeilen.concat(probleme));
};
