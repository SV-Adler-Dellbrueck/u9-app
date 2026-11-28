/* v993 · Charles 28.11.2026 (Bildschirmfoto Adler-Rufe, Termin-Karte „Kinder Eltern Weihnachtsturnier“): „Geht nicht immer nur um
   Mitfahren oder Abholen … im Zweifel die Autos rausnehmen. Dann wäre es super, wenn ich aus dem Chat heraus auf die Kachel klicke
   und dann automatisch in den Termin … und von da aus auch wieder zurückkomme in den Chat.“
   a) Heimtermin ohne angebotenes Auto: keine Zeile „🚗 … Autos“; Auswärtstermin: die Zeile steht da
   b) Trainer: Tipp auf den Kartenkopf öffnet „Termin verwalten“ ÜBER dem Chat; × schließt nur den Termin, der Chat bleibt offen
   c) Eltern: Tipp auf den Kartenkopf öffnet die Terminansicht über dem Chat, auch wenn der Termin nicht in der geladenen Liste stand */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const tag = d => { const x = new Date(Date.now() + d * 864e5); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  const HEIM = { id: 142, typ: "event", titel: "Kinder Eltern Weihnachtsturnier", datum: tag(9), uhrzeit: "17:00:00", treffzeit: "16:45", ort: "Platz", heim: true };
  const AUS = { id: 77, typ: "turnier", titel: "Kinderfestival", gegner: "Gastverein", datum: tag(7), uhrzeit: "09:00:00", ort: "Auswärtsplatz", heim: false };
  const lauf = async (start, istTrainer) => {
    const s = await h.starten({ start, warten: 800, breite: 390, hoehe: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(async ({ HEIM, AUS, istTrainer }) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 60 && typeof rufeTerminKarteHtml !== "function"; i++) await w(100);
      if (typeof rufeTerminKarteHtml !== "function") return { fehlt: true };
      document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
      _rf = { trainer: istTrainer, termine: { 142: HEIM, 77: AUS }, tstand: { 142: { dabei: 10, abgesagt: 0, offen: 3, autos: 0, frei: 0 }, 77: { dabei: 5, abgesagt: 1, offen: 2, autos: 0, frei: 0 } }, tmein: [] };
      if (istTrainer) { TM_TERMINE = [Object.assign({}, HEIM)]; } else { if (typeof ELTERN_TERMINE !== "undefined") ELTERN_TERMINE = []; window._elternKids = []; }
      const o = { heimAuto: /Autos?\s·/.test(rufeTerminKarteHtml(142)), ausAuto: /Autos?\s·/.test(rufeTerminKarteHtml(77)) };
      const chat = document.createElement("div"); chat.id = "rufe-modal"; chat.setAttribute("role", "dialog"); chat.style.cssText = "position:fixed;inset:0;z-index:10003;background:#fff";
      chat.innerHTML = rufeTerminKarteHtml(142); document.body.appendChild(chat);
      const kopf = chat.querySelector(".rf-t-kopf"); o.kopfKnopf = !!kopf && kopf.tagName === "BUTTON" && kopf.getBoundingClientRect().height >= 44;
      kopf && kopf.click(); await w(900);
      const id = istTrainer ? "tmd-modal" : "td-modal", m = document.getElementById(id);
      o.offen = !!m; o.drueber = !!m && Number(getComputedStyle(m).zIndex) > Number(getComputedStyle(chat).zIndex);
      o.titel = m ? /Weihnachtsturnier/.test(m.textContent) : false;
      const zu = m && [...m.querySelectorAll("button")].find(b => b.textContent.trim() === "×" || /schließen/i.test(b.getAttribute("aria-label") || ""));
      if (zu) zu.click(); else if (m) m.remove();
      await w(200);
      o.zu = !document.getElementById(id); o.chatDa = !!document.getElementById("rufe-modal");
      return o;
    }, { HEIM, AUS, istTrainer });
    const fe = s.fehler(); await s.schliessen(); return { r, fe };
  };
  const tr = await lauf("/trainer/index.html", true), el = await lauf("/eltern/index.html", false);
  if (tr.r.fehlt || el.r.fehlt) return h.ergebnis("v993 Termin-Karte im Chat", false, ["rufeTerminKarteHtml fehlt"]);
  if (tr.r.heimAuto || !tr.r.ausAuto) probleme.push("a) " + JSON.stringify({ heim: tr.r.heimAuto, aus: tr.r.ausAuto }));
  else zeilen.push("a) Heimtermin ohne Autos-Zeile, Auswärtstermin mit");
  const pr = (x, wer, b) => { if (!x.kopfKnopf || !x.offen || !x.drueber || !x.titel || !x.zu || !x.chatDa) probleme.push(`${b}) ${wer}: ` + JSON.stringify(x)); else zeilen.push(`${b}) ${wer}: Kopf öffnet den Termin über dem Chat, × führt zurück in den Chat`); };
  pr(tr.r, "Trainer", "b"); pr(el.r, "Eltern", "c");
  [...tr.fe, ...el.fe].slice(0, 2).forEach(f => probleme.push("Konsole: " + f));
  return h.ergebnis("v993 Termin-Karte im Chat: Autos nur auswärts, Tipp öffnet den Termin", !probleme.length, zeilen.concat(probleme));
};
