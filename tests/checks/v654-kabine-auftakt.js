/* v654 · Kinder-App: neues Symbol und neuer Auftakt (Charles: „Icon … wie bei Eltern-App und
   Trainer-App ein Adler-Logo … andere Hintergrundfarbe“; Federn-Idee gut, die Animation „nicht
   wirklich spannend“).
   a) Der Auftakt der Kinder-App hat Scheinwerfer, Lichtblitz, mindestens zwölf gezeichnete
      Federn (SVG, kein Emoji) und die Begrüßung „Willkommen in der Kabine!“.
   b) Die Federn explodieren zuerst (Hülle) und fallen dann (Kind) – zwei Elemente, damit je
      Element nur eine transform-Animation läuft (Regel aus v629, dort allgemein geprüft).
   c) Trainer und Eltern bekommen nichts davon.
   d) Die Symbole der Kinder-App sind 512 × 512 und nicht mehr die alten (Ball-Symbol v592). */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), warten: 300, intro: true });
  const messen = async (pfad) => {
    await s.page.evaluate(() => { try { sessionStorage.removeItem("adler-intro"); } catch (e) {} });
    await s.page.goto("https://app.test" + pfad, { waitUntil: "commit" });
    await s.page.waitForSelector("#adler-intro", { state: "attached", timeout: 1500 }).catch(() => {});
    return s.page.evaluate(() => {
      const d = document.getElementById("adler-intro"); if (!d) return null;
      const f = [...d.querySelectorAll(".ai-feder")];
      return { spots: d.querySelectorAll(".ai-spot").length, blitz: !!d.querySelector(".ai-blitz"),
        federn: f.length, svg: f.filter(x => x.querySelector("svg.ai-fi")).length, emoji: /🪶/.test(d.textContent),
        huelle: f[0] ? getComputedStyle(f[0]).animationName : "", kind: f[0] && f[0].querySelector(".ai-fi") ? getComputedStyle(f[0].querySelector(".ai-fi")).animationName : "",
        text: (d.querySelector(".ai-name") || {}).textContent || "" };
    });
  };
  const k = await messen("/kinder/index.html");
  if (!k) probleme.push("a) kein Auftakt in der Kinder-App");
  else {
    if (k.spots !== 2 || !k.blitz) probleme.push(`a) Scheinwerfer ${k.spots}, Blitz ${k.blitz}`);
    if (k.federn < 12 || k.svg !== k.federn || k.emoji) probleme.push(`a) Federn ${k.federn}, davon SVG ${k.svg}, Emoji ${k.emoji}`);
    if (!/Willkommen in der Kabine!/.test(k.text)) probleme.push(`a) Begrüßung: „${k.text}“`);
    if (!/adlerIntroFederBurst/.test(k.huelle) || !/adlerIntroFederFall/.test(k.kind)) probleme.push(`b) Hülle ${k.huelle}, Feder ${k.kind}`);
    zeilen.push(`Kabine: ${k.federn} Federn (SVG), 2 Scheinwerfer, Blitz, „${k.text.slice(0, 26)}“`);
  }
  for (const pfad of ["/trainer/index.html", "/eltern/index.html"]) {
    const r = await messen(pfad);
    if (r && (r.spots || r.blitz || r.federn)) probleme.push(`c) ${pfad}: ${r.federn} Federn, ${r.spots} Scheinwerfer`);
  }
  const fe = s.fehler(); await s.schliessen();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const alt = new Set(["82c6dee66c9707147aa97e91de9a5eb8", "650509d9b3f99118b005ab513e41b611"]);   // MD5 der Ball-Symbole bis v653
  for (const f of ["icon-kinder.png", "icon-kinder-maskable.png"]) {
    const b = fs.readFileSync(path.join(h.REPO, f));
    const w = b.readUInt32BE(16), hh = b.readUInt32BE(20);
    if (w !== 512 || hh !== 512) probleme.push(`d) ${f}: ${w} × ${hh}`);
    const md5 = crypto.createHash("md5").update(b).digest("hex");
    if (alt.has(md5)) probleme.push(`d) ${f} ist noch das alte Symbol`);
  }
  return h.ergebnis("v654 Kinder-App: Adler-Symbol und Sturzflug mit Federsturm", !probleme.length, probleme.concat(zeilen));
};
