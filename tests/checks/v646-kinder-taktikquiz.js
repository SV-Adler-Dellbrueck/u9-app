/* v646 · PO: „Beim Taktik-Quiz Spielaufbau sind die Fragen, ohne dass die Skizze befüllt ist.
   Man kann also nichts überprüfen. Bitte überprüfe nochmal alle Quizfragen.“

   Ursache: Die Kinder-App (/kinder/) lud md-taktikboard.js und md-taktik-video.js nicht. Jede
   Taktik-Frage brach bei taktikRender ab – Aufgabe da, Feld leer, in allen zehn Blöcken. Die
   Messung des Minimal-Loaders (v592) lief über die Kabinen-Kacheln, nicht über das Quiz.

   a) In /kinder/?quiz stehen bei jeder der Taktik-Fragen alle Spieler auf dem Feld.
   b) Jede Frage ist lösbar: jede Rolle mit Ziel gibt es genau einmal, sie ist beweglich, das
      Ziel liegt im Feld, und mit den Zielpositionen wertet „Prüfen“ die Frage als richtig.
   c) Keine Frage ist schon in der Startaufstellung gelöst.
   d) Wissensquiz: eindeutige IDs, die richtige Antwort zeigt auf eine vorhandene, keine zwei
      gleichen Antworten. */
"use strict";
module.exports = async function (h) {
  const probleme = [];
  const s = await h.starten({ start: "/kinder/index.html?quiz", warten: 2500 });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof taktikRender !== "function") return { fehlt: "taktikRender" };
    tqPlayer = "Kind A";
    const b = [], stat = { n: 0, gezeichnet: 0, geloest: 0 };
    for (let bl = 0; bl < TQ_BLOCKS.length; bl++) {
      tqStartBlock(bl); await w(30);
      for (let i = 0; i < tqScenarios.length; i++) {
        const sc = tqScenarios[i], tag = `#${bl * 10 + i + 1} „${sc.title}“`;
        stat.n++;
        const rollen = sc.start.map(p => p.role);
        if (new Set(rollen).size !== rollen.length) b.push(`${tag}: Rolle doppelt`);
        const ziele = Object.entries(sc.targets || {});
        if (!ziele.length) b.push(`${tag}: keine Ziele`);
        for (const [role, tgt] of ziele) {
          const p = sc.start.find(x => x.role === role);
          if (!p) b.push(`${tag}: kein Spieler „${role}“`); else if (p.locked) b.push(`${tag}: „${role}“ gesperrt`);
          (Array.isArray(tgt) ? tgt : [tgt]).forEach(t => { if (!(t.r > 0) || t.x < 0 || t.x > 100 || t.y < 0 || t.y > 100) b.push(`${tag}: Ziel von „${role}“ ungültig`); });
        }
        const schon = ziele.every(([role, tgt]) => { const p = sc.start.find(x => x.role === role); return p && (Array.isArray(tgt) ? tgt : [tgt]).some(t => Math.hypot(p.x - t.x, p.y - t.y) <= t.r); });
        if (ziele.length && schon) b.push(`${tag}: ohne Zug gelöst`);
        tqIdx = i; tqChecked = false; tqLoadScenario(i); await w(10);
        if (document.querySelectorAll("#taktik-tokens .tb-token:not(.tb-opp)").length === sc.start.length) stat.gezeichnet++;
        else b.push(`${tag}: Spieler fehlen auf dem Feld`);
        for (const [role, tgt] of ziele) { const p = tbField.find(x => x.role === role); const t = Array.isArray(tgt) ? tgt[0] : tgt; if (p && !p.locked) { p.x = t.x; p.y = t.y; } }
        const vor = tqScore; tqCheck();
        if (tqScore === vor + 1) stat.geloest++; else b.push(`${tag}: Zielpositionen nicht als richtig gewertet`);
      }
      tqStop(); await w(20);
    }
    const ids = new Set();
    WQ_QUESTIONS.forEach(q => {
      if (ids.has(q.id)) b.push(`Wissen ${q.id}: id doppelt`); ids.add(q.id);
      if (!(q.correct >= 0 && q.correct < (q.opts || []).length)) b.push(`Wissen ${q.id}: richtige Antwort fehlt`);
      const n = (q.opts || []).map(x => String(x).replace(/[^\p{L}\p{N}]/gu, "").toLowerCase());
      if (new Set(n).size !== n.length) b.push(`Wissen ${q.id}: zwei gleiche Antworten`);
    });
    stat.wissen = WQ_QUESTIONS.length;
    return { stat, b };
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v646 Taktik-Quiz in der Kinder-App", false, [`${r.fehlt} fehlt in /kinder/ – das Feld bleibt leer`]);
  probleme.push(...r.b.slice(0, 12));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v646 Taktik-Quiz in der Kinder-App: jede Frage gezeichnet und lösbar", !probleme.length,
    probleme.concat([`${r.stat.n} Taktik-Fragen: ${r.stat.gezeichnet} gezeichnet, ${r.stat.geloest} lösbar · ${r.stat.wissen} Wissensfragen geprüft`]));
};
