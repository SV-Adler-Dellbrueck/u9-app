/* v778 · Trainer, die selbst Eltern sind, haben einen sichtbaren Weg in die Eltern-Ansicht und zurück.
   a) Trainer-App, Orga: mit eigenem Kind steht „Als Elternteil ansehen“ (Kachel ≥ 44 px); ohne Kind fehlt der Abschnitt „Mein Kind“ ganz
   b) Der Weg führt zur Eltern-Adresse (…?portal)
   c) Eltern-App, Trainerkonto mit Kind: oben „Zur Trainer-App“ (≥ 44 px, Link auf …/trainer/); bei einem reinen Elternkonto steht kein solcher Link */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  // ── a) + b) Trainer-App ─────────────────────────────────────────────────
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const out = {};
    if (typeof elternUmschalterZeigen !== "function") return { fehlt: true };
    const orga = () => { go("orga"); };
    document.getElementById("view-ue-orga") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "view-ue-orga", className: "view" }));
    const lauf = async hat => {
      window.elternTrainerHatKind = async () => hat; _tkHatKind = null;
      kachelSeite("orga"); await new Promise(x => setTimeout(x, 400));
      const slot = document.getElementById("eltern-umschalter");
      const k = slot && [...slot.querySelectorAll("button")].find(b => /Als Elternteil ansehen/.test(b.textContent));
      return { slot: !!slot, abschnitt: slot ? /Mein Kind/.test(slot.textContent) : false, kachel: !!k, hoehe: k ? (parseInt(getComputedStyle(k).minHeight, 10) || 0) : 0, text: slot ? slot.textContent.replace(/\s+/g, " ").trim() : "" };
    };
    out.mit = await lauf(true);
    out.ohne = await lauf(false);
    out.url = elternPortalUrl();
    out.fn = typeof elternAnsichtOeffnen;
    return out;
  });
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v778 Umschalter", false, ["elternUmschalterZeigen fehlt"]);
  if (!r.mit.kachel || !r.mit.abschnitt || r.mit.hoehe < 44) probleme.push("a) mit Kind: " + JSON.stringify(r.mit));
  if (r.ohne.kachel || r.ohne.abschnitt || r.ohne.text) probleme.push("a) ohne Kind: " + JSON.stringify(r.ohne));
  zeilen.push(`a) mit Kind: Kachel „Als Elternteil ansehen“ (${r.mit.hoehe} px) unter „Mein Kind“ · ohne Kind: nichts`);
  if (!/\?portal$/.test(r.url) || r.fn !== "function") probleme.push("b) " + JSON.stringify({ url: r.url, fn: r.fn }));
  zeilen.push(`b) Weg: ${r.url.replace(/^https?:\/\/[^/]+/, "")}`);

  // ── c) Eltern-App ───────────────────────────────────────────────────────
  async function eltern(rolle, mail) {
    const TOKEN = b64({ alg: "none" }) + "." + b64({ email: mail, sub: "u-" + rolle, exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 900, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), profiles: [{ role: rolle }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
      termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(3500);
    const x = await e.page.evaluate(() => { const a = document.getElementById("zur-trainer-app"); return { da: !!a, hoehe: a ? Math.round(a.getBoundingClientRect().height) : 0, href: a ? a.getAttribute("href") : "", text: a ? a.textContent.trim() : "", dash: /Kind C/.test((document.getElementById("eltern-portal") || document.body).textContent) }; });
    const f = e.fehler(); await e.schliessen(); return { ...x, f };
  }
  const t = await eltern("trainer", "trainer@example.org");
  const p = await eltern("parent", "eltern@example.org");
  if (!t.da || t.hoehe < 44 || !/\/trainer\/$/.test(t.href) || !/Zur Trainer-App/.test(t.text) || !t.dash) probleme.push("c) Trainerkonto: " + JSON.stringify(t));
  if (p.da || !p.dash) probleme.push("c) Elternkonto: " + JSON.stringify(p));
  zeilen.push(`c) Trainerkonto: „${t.text}“ (${t.hoehe} px) → ${t.href.replace(/^https?:\/\/[^/]+/, "")} · Elternkonto: kein Link`);
  [f1, t.f, p.f].forEach((x, i) => { if (x.length) probleme.push(`Konsole ${i}: ${x.slice(0, 2).join(" | ")}`); });
  return h.ergebnis("v778 Trainer als Eltern: Umschalter in beide Richtungen", !probleme.length, probleme.length ? probleme : zeilen);
};
