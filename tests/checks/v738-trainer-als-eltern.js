/* v738 · Trainer, die selbst Eltern sind, kommen wieder in den Eltern-Bereich
   Markus, 04.10.: „Ich würde gerne das Spieltagsheft checken, komme aber gar nicht mehr in die Elternversion
   rein … sagt, dass ich als Trainer angemeldet bin.“ Ursache: v731 erkennt Trainerkonten richtig – die Weiche
   in renderElternPortal schickte jedes Trainerkonto auf den Hinweis „Dieser Bereich ist für Eltern“.
   a) Trainerkonto mit eigenem Kind (eltern_kinder zur eigenen E-Mail) → Eltern-Dashboard mit genau diesem Kind
   b) Trainerkonto ohne Kind → Hinweis mit dem Weg (Kontakte beim Kind, Nest-Vorschau im Editor) */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "trainer@example.org", sub: "u-trainer", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  async function lauf(mitKind) {
    const ek = [];
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), profiles: [{ role: "trainer" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: u => { ek.push(decodeURIComponent(u.search)); const eigen = /email=eq\.trainer@example\.org/.test(decodeURIComponent(u.search));
        if (!mitKind && eigen) return [];
        return eigen ? [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }]
                     : [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7 } }, { spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9 } }]; },
      termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
    await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
    const r = await s.page.evaluate(() => { const p = document.getElementById("eltern-portal"); return { text: p ? p.textContent.replace(/\s+/g, " ") : "" }; });
    const f = s.fehler(); await s.schliessen();
    return { ...r, ek, f };
  }
  const a = await lauf(true);
  if (/Du bist als Trainer angemeldet/.test(a.text) || !/Kind C/.test(a.text) || /Kind A/.test(a.text)) probleme.push(`a) Trainer mit Kind: „${a.text.slice(0, 160)}“`);
  zeilen.push(`a) Trainerkonto mit eigenem Kind → Eltern-Dashboard mit „Kind C“ (nur das eigene Kind)`);
  const b = await lauf(false);
  if (!/Du bist als Trainer angemeldet/.test(b.text) || !/keinem Kind zugeordnet/.test(b.text) || !/Vorschau/.test(b.text)) probleme.push(`b) Trainer ohne Kind: „${b.text.slice(0, 200)}“`);
  zeilen.push(`b) Trainerkonto ohne Kind → Hinweis mit Weg über „Kontakte“ und Nest-Vorschau`);
  [a, b].forEach((x, i) => { if (x.f.length) probleme.push(`Konsole ${i ? "b" : "a"}: ${x.f.slice(0, 2).join(" | ")}`); });
  return h.ergebnis("v738 Trainer, die selbst Eltern sind, kommen wieder in den Eltern-Bereich", !probleme.length, zeilen.concat(probleme));
};
