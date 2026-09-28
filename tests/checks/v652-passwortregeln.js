/* v652 · Passwortregel: mindestens 10 Zeichen, Buchstaben und Ziffern (Beschluss 28.09.2026).
   Der Schutz vor geleakten Passwörtern gibt es bei Supabase erst ab Pro; im Free-Plan
   wird stattdessen die Regel verschärft – in den Auth-Einstellungen, in der Edge Function
   eltern-einladung und im Browser, der es nur früher sagt.
   a) Trainer „Passwort ändern“ und Eltern „Passwort festlegen“ weisen zu kurz, nur Buchstaben
      und nur Ziffern ab, bevor etwas an den Server geht; ein gültiges geht hinaus.
   b) Kein Formular nennt mehr „8 Zeichen“; die Felder tragen minlength 10.
   c) Die Edge Function prüft dieselbe Regel für neue Konten. */
"use strict";
const fs = require("fs"), path = require("path");
const PROBEN = ["kurz12", "nurbuchstabenhier", "1234567890", "adlerhorst7"];

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  // Je Passwort ein eigener evaluate-Aufruf: ein langer Aufruf überlebt das Umschalten der Ansicht nicht.
  const probe = async (s, oeffnen, feld1, feld2, speichern, fehlerId) => {
    const out = { faelle: [] };
    for (const pw of PROBEN) {
      const r = await s.page.evaluate(async ({ pw, oeffnen, feld1, feld2, speichern, fehlerId }) => {
        const w = ms => new Promise(x => setTimeout(x, ms));
        for (let i = 0; i < 60 && (typeof window[oeffnen] !== "function" || typeof pwRegelFehler !== "function"); i++) await w(50);
        if (typeof window[oeffnen] !== "function") return { fehlt: oeffnen };
        document.getElementById("pin-gate")?.remove();
        let puts = 0; const f0 = window.fetch;
        window.fetch = (u, o) => { if (/\/auth\/v1\/user/.test(String(u)) && o && o.method === "PUT") { puts++; return Promise.resolve(new Response("{}", { status: 200 })); } return f0(u, o); };
        window[oeffnen](); await w(80);
        const a = document.getElementById(feld1), b = document.getElementById(feld2);
        const erg = { minlength: a && a.getAttribute("minlength"), text: (document.getElementById("pw-modal") || document.getElementById("ep-pw-modal") || document.body).textContent };
        a.value = pw; b.value = pw;
        await window[speichern](null); await w(80);
        window.fetch = f0;
        erg.fall = { pw, fehler: (document.getElementById(fehlerId) || {}).textContent || "", gesendet: puts };
        document.querySelectorAll("#pw-modal,#ep-pw-modal").forEach(m => m.remove());
        return erg;
      }, { pw, oeffnen, feld1, feld2, speichern, fehlerId });
      if (r.fehlt) return r;
      out.faelle.push(r.fall);
      if (r.minlength) { out.minlength = r.minlength; out.text = r.text; }
    }
    return out;
  };

  const pruefe = (name, r) => {
    if (r.fehlt) { probleme.push(`a) ${name}: ${r.fehlt} fehlt`); return; }
    for (const f of r.faelle) {
      const gut = f.pw === "adlerhorst7";
      if (gut && (f.gesendet !== 1)) probleme.push(`a) ${name}: gültiges Passwort nicht gesendet (${f.fehler})`);
      if (!gut && (f.gesendet || !f.fehler)) probleme.push(`a) ${name}: „${f.pw}“ durchgelassen`);
    }
    if (r.minlength !== "10") probleme.push(`b) ${name}: minlength ${r.minlength}`);
    if (/8 Zeichen/.test(r.text)) probleme.push(`b) ${name}: nennt noch 8 Zeichen`);
    zeilen.push(`${name}: ` + r.faelle.map(f => `${f.pw.length} Z. → ${f.gesendet ? "gesendet" : f.fehler.replace(/^Das Passwort braucht /, "")}`).join(" · "));
  };

  {
    const s = await h.starten({ warten: 3000, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await probe(s, "pwChangeOpen", "pw-new", "pw-new2", "pwChangeSave", "pw-err");
    const fe = s.fehler(); await s.schliessen();
    pruefe("Trainer", r);
    if (fe.length) probleme.push("Konsole Trainer: " + fe.slice(0, 2).join(" | "));
  }
  {
    const s = await h.starten({ start: "/eltern/index.html", warten: 3000,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
    const r = await probe(s, "elternPasswortOpen", "ep-neu1", "ep-neu2", "elternPasswortSpeichern", "ep-neu-err");
    const fe = s.fehler(); await s.schliessen();
    pruefe("Eltern", r);
    if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | "));
  }

  // b) Quelltext: keine 8 mehr
  for (const f of ["md-eltern-portal.js", "views.js"]) {
    const t = fs.readFileSync(path.join(h.REPO, f), "utf8");
    if (/8 Zeichen|length<8|minlength="8"/.test(t)) probleme.push(`b) ${f} nennt noch 8 Zeichen`);
  }
  // c) Edge Function
  const ef = fs.readFileSync(path.join(h.REPO, "supabase/functions/eltern-einladung/index.ts"), "utf8");
  if (!/const PASSWORT_MIN = 10;/.test(ef) || !/!PASSWORT_ZEICHEN\(passwort\)/.test(ef)) probleme.push("c) eltern-einladung prüft die Regel nicht");

  return h.ergebnis("v652 Passwortregel: 10 Zeichen, Buchstaben und Ziffern", !probleme.length, probleme.concat(zeilen));
};
