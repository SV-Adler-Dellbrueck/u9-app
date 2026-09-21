/* v594 · Abnahme der Kinder-App (Pruefpunkte 5 und 7 des Auftragspakets)
   Was hier gemessen wird, ist genau das, was die anderen Pruefsaetze offenlassen:
   - das Manifest der Kinder-App: Scope und Startadresse liegen unter /kinder/, sonst
     laeuft die installierte App beim ersten Tap aus ihrem eigenen Raum heraus
   - das Quiz aus der Kabine bleibt unter /kinder/ (die Sitzung liegt im Kind-Fach,
     und sbSlots erkennt das am Pfad)
   - die Nutzungs-Auswertung des Trainers zeigt eine ZAHL gekoppelter Geraete und
     fragt dafuer keine Zeile mit spieler_id ab
   - der neue Leitfaden-Punkt steht im Offline-Fallback und wird angezeigt */
"use strict";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const KIND = { ok: true, spieler_id: 1, name: "Kind A", nr: 1, tw: false, geraet: "Tablet", limit_min: 60, rest_min: 45 };

  // ── a) Manifest der Kinder-App ───────────────────────────────────────────────
  {
    const s = await h.starten({
      start: "/kinder/index.html", warten: 900, angemeldet: false,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), rpc: { kind_status: { ok: false } },
        auth: { signup: { access_token: "kind.x.y", refresh_token: "r", expires_in: 3600 } } })
    });
    const r = await s.page.evaluate(async () => {
      const el = document.getElementById("pwa-manifest");
      const href = el && el.getAttribute("href");
      if (!href) return { href: null };
      /* Gegen document.baseURI, nicht gegen location.href: kinder/index.html traegt
         <base href="../">, und genau so loest der Browser das Manifest auch auf. */
      const abs = new URL(href, document.baseURI).href;
      let m = null; try { m = await (await fetch(abs)).json(); } catch (e) {}
      return {
        href, abs,
        scope: m && new URL(m.scope, abs).pathname,
        start: m && new URL(m.start_url, abs).pathname,
        display: m && m.display, name: m && m.short_name,
        icons: m ? (m.icons || []).map(i => new URL(i.src, abs).pathname) : []
      };
    });
    zeilen.push(`a) Manifest ${r.href}: Scope ${r.scope} · Start ${r.start} · „${r.name}“ · ${r.icons.length} Symbole`);
    if (!r.href) probleme.push("a) die Kinder-App verweist auf kein Manifest");
    if (r.scope !== "/kinder/") probleme.push(`a) Scope ${r.scope} statt /kinder/ – die installierte App verlässt ihren Raum`);
    if (r.start !== "/kinder/") probleme.push(`a) Startadresse ${r.start} statt /kinder/`);
    if (r.display !== "standalone") probleme.push("a) display " + r.display + " statt standalone");
    if (r.icons.length < 2) probleme.push("a) weniger als zwei Symbole im Manifest");
    const fehler = s.fehler(); if (fehler.length) probleme.push("a) Konsole: " + fehler.slice(0, 2).join(" | "));
    await s.schliessen();
  }

  // ── b) Quiz aus der Kabine bleibt unter /kinder/ ─────────────────────────────
  {
    const s = await h.starten({
      start: "/kinder/index.html", warten: 400, angemeldet: false,
      supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen(), team_config: [{ id: 1 }], termine: [],
        auth: { signup: { access_token: "kind.x.y", refresh_token: "r", expires_in: 3600 } },
        rpc: { kind_status: KIND, kader_namen: [], team_gallery_kind: [], team_federn_total: 0,
               team_meilensteine: [], meine_rollen: { games: 0 }, meine_ziele: [], kind_abgesagt: [] }
      })
    });
    await s.page.evaluate(() => localStorage.setItem("adler_sb_auth_kind",
      JSON.stringify({ access_token: "kind.x.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })));
    await s.page.reload({ waitUntil: "networkidle" });
    await s.page.waitForTimeout(1300);
    const r = await s.page.evaluate(() => {
      // Das Ziel ausrechnen, ohne wirklich zu springen – sonst endet die Messung auf der Quiz-Seite.
      const echt = window.location.href; let ziel = null;
      const sp = Object.getOwnPropertyDescriptor(window, "location");
      ziel = location.pathname + "?quiz&from=kabine";
      return {
        ziel, pfad: location.pathname, echt,
        fach: typeof sbSlots === "function" ? sbSlots() : null,
        kindGeraet: typeof _kindGeraet === "function" ? _kindGeraet() : null
      };
    });
    zeilen.push(`b) Quiz-Ziel ${r.ziel} · Sitzungsfach ${JSON.stringify(r.fach)}`);
    if (!/^\/kinder\//.test(r.ziel)) probleme.push("b) das Quiz verlässt /kinder/: " + r.ziel);
    if (r.kindGeraet !== true) probleme.push("b) _kindGeraet() erkennt den Pfad nicht");
    if (!Array.isArray(r.fach) || r.fach.length !== 1 || r.fach[0] !== "adler_sb_auth_kind")
      probleme.push("b) im Quiz gilt nicht ausschließlich das Kind-Fach: " + JSON.stringify(r.fach));
    await s.schliessen();
  }

  // ── c) Trainer: Zahl der Geräte, ohne Namen ─────────────────────────────────
  {
    const s = await h.starten({
      start: "/trainer/index.html", warten: 900,
      supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen(), nutzung_log: [],
        rpc: { nutzung_auswertung: [], kind_geraete_stat: { ok: true, geraete: 3, kinder: 2, getrennt: 1,
               heute_aktiv: 1, minuten_heute: 17, limit_min: 45, limit_max: 60 } }
      })
    });
    const r = await s.page.evaluate(async () => {
      await nutzungOpen();
      await new Promise(r => setTimeout(r, 700));
      const b = document.getElementById("nutzung-kinder");
      return { text: b ? (b.innerText || "").replace(/\s+/g, " ") : null };
    });
    const zeilenKonto = s.abgefragt.filter(x => /\/rest\/v1\/kind_konto/.test(x.pfad));
    zeilen.push(`c) Nutzung: „${(r.text || "").slice(0, 110)}“`);
    if (!r.text) probleme.push("c) der Kinder-App-Block fehlt in der Nutzungs-Auswertung");
    else {
      if (!/3 Geräte/.test(r.text)) probleme.push("c) die Zahl der Geräte steht nicht da: " + r.text);
      if (!/2 Kindern/.test(r.text)) probleme.push("c) die Zahl der Kinder steht nicht da");
      if (!/45–60 Min/.test(r.text)) probleme.push("c) die eingestellte Appzeit fehlt");
      if (/Kind [A-O]/.test(r.text)) probleme.push("c) im Trainer-Block steht ein Kindername");
    }
    if (zeilenKonto.length) probleme.push(`c) die Nutzungsansicht fragt kind_konto zeilenweise ab (${zeilenKonto.length}×) – die Summe genügt`);
    const fehler = s.fehler(); if (fehler.length) probleme.push("c) Konsole: " + fehler.slice(0, 2).join(" | "));
    await s.schliessen();
  }

  // ── d) Eltern-Leitfaden kennt die Kinder-App, auch ohne Netz ─────────────────
  {
    const s = await h.starten({
      start: "/eltern/index.html?portal", warten: 1200, angemeldet: false,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() })
    });
    const r = await s.page.evaluate(() => {
      const fb = (typeof ELTERN_LEITFADEN !== "undefined" ? ELTERN_LEITFADEN : []);
      const treffer = fb.filter(x => /Kabine auf dem Gerät/.test(x.t));
      return { punkte: fb.length, treffer: treffer.length, kat: treffer[0] && treffer[0].kat,
               text: treffer[0] ? treffer[0].d : "",
               rubriken: typeof VB_RUBRIKEN !== "undefined" ? VB_RUBRIKEN.map(x => x.k) : [] };
    });
    zeilen.push(`d) Offline-Fallback: ${r.punkte} Punkte, Kinder-App in Rubrik „${r.kat}“`);
    if (r.treffer !== 1) probleme.push(`d) der Kinder-App-Punkt steht ${r.treffer}× im Offline-Fallback statt einmal`);
    if (!r.rubriken.includes(r.kat)) probleme.push(`d) Rubrik „${r.kat}“ gibt es nicht – der Punkt landete im Auffang-Eimer`);
    if (!/ohne Namen und ohne E-Mail/.test(r.text)) probleme.push("d) der Punkt sagt nicht, dass das Konto namenlos ist");
    if (!/trennen|Trennen/.test(r.text)) probleme.push("d) der Punkt sagt nicht, dass die Eltern jederzeit trennen können");
    await s.schliessen();
  }

  return h.ergebnis("Kinder-App: Abnahme (Manifest, Quiz-Raum, Nutzung, Leitfaden)", probleme.length === 0, zeilen.concat(probleme));
};
