/* v611 · Paket C, erster Schritt: das leise Grau ist lesbar.

   Befund der App-Prüfung vom 24.09.: `color:#94a3b8` stand 96-mal als Schriftfarbe im Code –
   auf Weiß 2,6:1, gefordert sind 4,5:1 (CLAUDE.md). Es war vor allem der Eltern-Bereich:
   Hinweise, Leerzustände, Fußzeilen.

   Jetzt steht dort `var(--text3)`: hell #64748b (4,8:1 auf Weiß), dunkel #8b98ac. Der
   Dunkel-„Sweep" des Eltern-Bereichs lässt var(…) in Ruhe, der Token schaltet selbst.
   Bewusst ausgenommen: Flächen, die immer dunkel sind (Stationstimer, Live-Vollbild,
   Video-Taktik, PIN-Tor) – dort ist das helle Grau auf Dunkel richtig.

   a) Kein `color:#94a3b8` außerhalb dieser Ausnahmen.
   b) Eltern-Bereich, hell und dunkel: jede sichtbare Schrift in var(--text3) (und im alten Grau, falls noch da) hat ≥ 4,5:1. */
"use strict";
const fs = require("fs"), path = require("path");
const AUSNAHMEN = ["boot.js", "md-live-vollbild.js", "md-taktik-video.js", "shell.html"];
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  // ── a) statisch ─────────────────────────────────────────────────────────────
  {
    const dateien = fs.readdirSync(h.REPO).filter(d => /\.(js|css|html)$/.test(d) && !AUSNAHMEN.includes(d));
    const rot = [];
    for (const d of dateien) {
      const n = (fs.readFileSync(path.join(h.REPO, d), "utf8").match(/color:#94a3b8(?=[;"'`}\s])/gi) || []).length;
      if (n) rot.push(`${d}: ${n}×`);
    }
    if (rot.length) probleme.push("a) blasses Grau als Schrift: " + rot.join(", "));
    zeilen.push(`a) color:#94a3b8 außerhalb der dunklen Flächen: ${rot.length ? rot.join(", ") : "keins"}`);
  }

  // ── b) gemessen ─────────────────────────────────────────────────────────────
  for (const scheme of ["light", "dark"]) {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, scheme,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
    await s.page.evaluate(() => { try { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: "e.x.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); } catch (e) {} });
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(2200);
    const { offen, werte: r } = await s.page.evaluate(async (helfer) => {
      eval(helfer);
      /* Dazu ein Leerzustand in einer weißen Karte, wie ihn der Eltern-Bereich baut (Fahrgemeinschaft). */
      const karte = document.createElement("div");
      karte.style.cssText = "background:#fff;padding:12px";
      karte.innerHTML = '<div style="font-size:12px;color:var(--text3)">Aktuell bietet niemand freie Plätze an.</div>';
      (document.getElementById("eltern-root") || document.body).appendChild(karte);
      // Echte Fenster des Eltern-Bereichs, die das leise Grau tragen (leere Attrappe → Leerzustände)
      const warte = ms => new Promise(r => setTimeout(r, ms));
      const offen = [];
      for (const [n, f] of [["Fahrgemeinschaft", () => elternCarpoolOpen(1, 1)], ["Fan-Fakten", () => elternFanfactsOpen(1, "Kind A")],
                             ["Abzeichen", () => abzeichenOpen(1, "Kind A", false)], ["Chronik", () => chronikOpen()]]) {
        try { await f(); offen.push(n); } catch (e) { offen.push(n + " (Fehler: " + e.message + ")"); }
      }
      await warte(900);   // Nachladen und der Dunkel-Sweep (MutationObserver)
      const alle = [...document.querySelectorAll("[style*='var(--text3)'], [style*='#94a3b8']")].filter(el => {
        const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && el.textContent.trim();
      });
      return { offen, werte: alle.map(el => ({ t: el.textContent.replace(/\s+/g, " ").trim().slice(0, 40), k: window.__kontrastVon(el) })) };
    }, h.kontrastHelfer);
    const f = s.fehler();
    await s.schliessen();
    const schwach = r.filter(x => x.k < 4.5);
    if (!r.length) probleme.push(`b) ${scheme}: keine Schrift in var(--text3) gefunden – die Messung misst nichts`);
    if (schwach.length) probleme.push(`b) ${scheme}: ${schwach.length} Stellen unter 4,5:1 – ` + schwach.slice(0, 4).map(x => `„${x.t}“ ${x.k}`).join(" · "));
    if (f.length) probleme.push(`Konsole (${scheme}): ` + f.slice(0, 2).join(" | "));
    const min = r.length ? Math.min(...r.map(x => x.k)) : 0;
    zeilen.push(`b) ${scheme === "light" ? "hell" : "dunkel"}: ${r.length} Stellen gemessen (${offen.join(", ")}), schwächste ${min}:1`);
  }
  return h.ergebnis("v611 Leises Grau lesbar: kein #94a3b8 als Schrift auf hellem Grund, ≥ 4,5:1 hell und dunkel", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
