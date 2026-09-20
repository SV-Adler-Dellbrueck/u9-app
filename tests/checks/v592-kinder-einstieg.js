/* v592 · Der dritte Einstieg: die Kabine auf dem Geraet des Kindes (kinder/)
   Gemessen an der ECHTEN kinder/index.html:
   - ohne Kopplung genau ein Bildschirm, der Code will - kein Eltern-Dashboard dahinter
   - das Geraet meldet sich EINMAL anonym an und benutzt dieselbe Sitzung weiter; ein
     neues Konto je Fehlversuch wuerde die Benutzertabelle fuellen und den
     Fehlversuchszaehler der Edge Function aushebeln, der an diesem Konto haengt
   - mit Kopplung oeffnet die Kabine sofort, ohne den Ausgang fuer Erwachsene
   - und in keinem Fall fragt dieses Geraet Tabellen ab, die den Eltern gehoeren */
"use strict";

const VERBOTEN = ["eltern_kinder", "rueckmeldungen", "spielerprofile", "nominierungen", "kind_notfall", "kabine_config"];

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const KIND = { ok: true, spieler_id: 1, name: "Kind A", nr: 1, tw: false, geraet: "Tablet", limit_min: 60, rest_min: 60 };

  function attrappe(extra) {
    return h.supabaseAttrappe(Object.assign({
      kader: h.kaderZeilen(), termine: [], team_config: [{ id: 1 }],
      auth: { signup: { access_token: "kind.eyJzdWIiOiJraW5kLXVpZCJ9.x", refresh_token: "r", expires_in: 3600 } },
      rpc: { kader_namen: [], team_gallery_kind: [], team_federn_total: 0, team_meilensteine: [], meine_rollen: { games: 0 }, meine_ziele: [] }
    }, extra || {}));
  }
  async function start(extra, vorbereiten) {
    const s = await h.starten({ start: "/kinder/index.html", warten: 1100, angemeldet: false, supabase: attrappe(extra) });
    return s;
  }

  // ── a) ohne Kopplung: der Kopplungsbildschirm, sonst nichts ───────────────────
  {
    const s = await start({ rpc: { kind_status: { ok: false } } });
    const r = await s.page.evaluate(() => {
      const d = document.getElementById("kg-kopplung");
      const txt = (document.body.innerText || "").replace(/\s+/g, " ");
      return {
        da: !!d,
        dialog: d ? (d.getAttribute("role") === "dialog" && d.getAttribute("aria-modal") === "true") : false,
        punkte: d ? d.querySelectorAll("#kg-dots span").length : 0,
        ziffern: d ? [...d.querySelectorAll("button")].filter(b => /^[0-9]$/.test(b.textContent.trim())).length : 0,
        hoehe: d ? Math.min(...[...d.querySelectorAll("button")].map(b => Math.round(b.getBoundingClientRect().height))) : 0,
        text: txt.slice(0, 120),
        ausgang: /Kabine verlassen/.test(txt),
        dashboard: !!document.getElementById("eltern-root") || /Termine|Zu- & Absagen/.test(txt),
        manifest: (document.getElementById("pwa-manifest") || {}).getAttribute ? document.getElementById("pwa-manifest").getAttribute("href") : null,
        farbe: (document.querySelector('meta[name="theme-color"]') || {}).content || ""
      };
    });
    zeilen.push(`a) ohne Kopplung: Dialog ${r.da ? "da" : "fehlt"} · ${r.punkte} Punkte · ${r.ziffern} Zifferntasten ab ${r.hoehe} px · Manifest ${r.manifest}`);
    if (!r.da) probleme.push("a) kein Kopplungsbildschirm");
    if (!r.dialog) probleme.push("a) der Kopplungsbildschirm ist kein role=dialog aria-modal");
    if (r.punkte !== 6) probleme.push(`a) ${r.punkte} Punkte statt sechs – der Code hat sechs Ziffern`);
    if (r.ziffern !== 10) probleme.push(`a) ${r.ziffern} Zifferntasten statt zehn`);
    if (r.hoehe < 44) probleme.push(`a) kleinste Taste ${r.hoehe} px (mindestens 44)`);
    if (r.ausgang) probleme.push("a) der Erwachsenen-Ausgang der Kabine steht auf dem Kindergerät");
    if (r.dashboard) probleme.push("a) hinter dem Kopplungsbildschirm liegt der Eltern-Bereich");
    if (r.manifest !== "manifest-kinder.json") probleme.push("a) falsches Manifest: " + r.manifest);
    if (r.farbe !== "#0f172a") probleme.push("a) Theme-Farbe " + r.farbe + " statt #0f172a");
    const fehler = s.fehler(); if (fehler.length) probleme.push("a) Konsole: " + fehler.slice(0, 2).join(" | "));
    await s.schliessen();
  }

  // ── b) falscher Code: eine Anmeldung, eine Abweisung, kein zweites Konto ──────
  {
    const s = await start({
      rpc: { kind_status: { ok: false } },
      funktionen: { "kind-kopplung": { ok: false, fehler: "Der Code stimmt nicht oder ist abgelaufen." } }
    });
    const r = await s.page.evaluate(async () => {
      const tip = async t => { await kgTip(String(t)); await new Promise(r => setTimeout(r, 60)); };
      for (const z of [1, 2, 3, 4, 5, 6]) await tip(z);
      await new Promise(r => setTimeout(r, 500));
      const err1 = document.getElementById("kg-err").textContent.trim();
      for (const z of [9, 9, 9, 9, 9, 9]) await tip(z);
      await new Promise(r => setTimeout(r, 500));
      let fach = null; try { fach = JSON.parse(localStorage.getItem("adler_sb_auth_kind") || "null"); } catch (e) {}
      return { err1, err2: document.getElementById("kg-err").textContent.trim(), fach: !!(fach && fach.access_token),
               punkte: [...document.querySelectorAll("#kg-dots span")].filter(x => /rgb\(255, 255, 255\)/.test(getComputedStyle(x).backgroundColor)).length };
    });
    const signups = s.gesendet.filter(x => /\/auth\/v1\/signup/.test(x.pfad));
    const rufe = s.gesendet.filter(x => /functions\/v1\/kind-kopplung/.test(x.pfad));
    zeilen.push(`b) falscher Code: „${r.err1}" · Anmeldungen ${signups.length} · Kopplungsversuche ${rufe.length}`);
    if (!/stimmt nicht/.test(r.err1)) probleme.push("b) die Abweisung der Funktion wird nicht angezeigt: " + r.err1);
    if (signups.length !== 1) probleme.push(`b) ${signups.length} anonyme Anmeldungen statt einer – jeder Fehlversuch legt ein Konto an`);
    if (rufe.length !== 2) probleme.push(`b) ${rufe.length} Aufrufe der Kopplung statt zweier`);
    if (!r.fach) probleme.push("b) der Ausweis liegt nicht im eigenen Fach adler_sb_auth_kind");
    if (r.punkte !== 0) probleme.push("b) nach der Abweisung stehen noch Ziffern im Feld");
    if (rufe[0] && String(rufe[0].body && rufe[0].body.code) !== "123456") probleme.push("b) der getippte Code kommt nicht bei der Funktion an");
    await s.schliessen();
  }

  // ── c) gekoppelt: die Kabine, ohne Ausgang, ohne fremde Tabellen ──────────────
  {
    const s = await h.starten({
      start: "/kinder/index.html", warten: 600, angemeldet: false,
      supabase: attrappe({ rpc: { kind_status: KIND } })
    });
    // Ausweis ins Kind-Fach legen und die Route neu fahren
    await s.page.evaluate(() => { localStorage.setItem("adler_sb_auth_kind", JSON.stringify({ access_token: "kind.x.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); });
    await s.page.reload({ waitUntil: "networkidle" });
    await s.page.waitForTimeout(1400);
    const r = await s.page.evaluate(() => {
      const txt = (document.body.innerText || "").replace(/\s+/g, " ");
      return {
        kabine: !!document.getElementById("kabine"),
        ausgang: /Kabine verlassen/.test(txt),
        kopplung: !!document.getElementById("kg-kopplung"),
        kind: (window._elternKids || []).length,
        name: ((window._elternKids || [])[0] || {}).kader ? window._elternKids[0].kader.name : null,
        text: txt.slice(0, 90)
      };
    });
    /* Was dieses Geraet WIRKLICH abgefragt hat - die Attrappe hat jeden Aufruf gesehen. */
    const angefasst = VERBOTEN.filter(t => s.gesendet.some(x => x.pfad.includes("/" + t)));
    if (angefasst.length) probleme.push("c) das Kindergerät fragt fremde Tabellen ab: " + angefasst.join(", "));
    zeilen.push(`c) gekoppelt: Kabine ${r.kabine ? "offen" : "zu"} · Kind ${r.name} · Ausgang ${r.ausgang ? "sichtbar" : "aus"}`);
    if (!r.kabine) probleme.push("c) die Kabine öffnet nicht: " + r.text);
    if (r.kopplung) probleme.push("c) der Kopplungsbildschirm liegt noch davor");
    if (r.ausgang) probleme.push("c) der Erwachsenen-Ausgang steht auf dem Kindergerät");
    if (r.kind !== 1 || r.name !== "Kind A") probleme.push("c) die Kindliste kommt nicht aus kind_status");
    const fehler = s.fehler(); if (fehler.length) probleme.push("c) Konsole: " + fehler.slice(0, 2).join(" | "));
    await s.schliessen();
  }

  return h.ergebnis("Kinder-App: der Einstieg kinder/", probleme.length === 0, zeilen.concat(probleme));
};
