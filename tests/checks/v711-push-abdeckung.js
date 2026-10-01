/* v711 · Wer bekommt Benachrichtigungen? (Trainer, Eltern & Kinder → Eltern verwalten)
   Anlass: Am 01.10.2026 bekamen 6 von 14 Familien Benachrichtigungen.
   a) Die Kachel öffnet ein Fenster mit „N von M Familien“, getrennt nach „Konto da, Push aus“
      und „Noch kein Elternkonto“ – aus der RPC push_abdeckung
   b) Die geteilte Anleitung enthält keine Kindernamen und den Weg zur Eltern-App
   c) Migration: nur Trainer (is_trainer), anon ohne Ausführungsrecht */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const rows = [{ spieler_id: 1, name: "Kind A", konten: 2, mit_push: 1 }, { spieler_id: 2, name: "Kind B", konten: 1, mit_push: 0 }, { spieler_id: 3, name: "Kind C", konten: 0, mit_push: 0 }];
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), rpc: { push_abdeckung: rows } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    await pushAbdeckungOpen(); await w(200);
    const m = document.getElementById("pa-modal");
    let geteilt = "";
    navigator.share = o => { geteilt = o.text; return Promise.resolve(); };
    pushAnleitungTeilen();
    return { text: m ? m.textContent.replace(/\s+/g, " ") : "", dialog: m && m.getAttribute("role"), geteilt,
      kachel: /pushAbdeckungOpen/.test(String(typeof renderElki === "function" ? renderElki : "")) || document.body.innerHTML.includes("pushAbdeckungOpen") };
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!/1 von 3 Familien/.test(r.text)) probleme.push("a) Zählung fehlt: " + r.text.slice(0, 120));
  if (!/Benachrichtigungen aus \(1\)/.test(r.text) || !/kein Elternkonto \(1\)/.test(r.text)) probleme.push("a) Gruppen fehlen: " + r.text.slice(0, 200));
  if (r.dialog !== "dialog") probleme.push("a) Fenster ohne role=dialog");
  if (/Kind [A-O]/.test(r.geteilt) || !/eltern\//.test(r.geteilt)) probleme.push("b) Anleitung: " + r.geteilt.slice(0, 120));
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/fn:"pushAbdeckungOpen"/.test(views)) probleme.push("a) Kachel fehlt unter „Eltern verwalten“");
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261001_v711_push_abdeckung.sql"), "utf8");
  if (!/public\.is_trainer\(\)/.test(mig) || !/revoke all on function public\.push_abdeckung\(\) from public, anon/.test(mig)) probleme.push("c) Rechte der RPC");
  zeilen.push(`a) ${r.text.slice(r.text.indexOf("1 von"), r.text.indexOf("1 von") + 20)} · b) Anleitung ${r.geteilt.length} Zeichen, ohne Namen`);
  return h.ergebnis("v711 Wer bekommt Push? – Übersicht für das Trainerteam, Anleitung ohne Namen", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
