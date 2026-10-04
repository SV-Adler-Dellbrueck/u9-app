/* v752 · Kabine: Hype läuft weiter, Karten ohne Tore/Aktionen, Gold ab 8, Album fürs Tablet, Sonder-Rahmen
   PO 04.10.: „Geht es, dass der Kabinen-Hype weiterläuft, wenn man ihn verlässt?“ · „Tore und Aktionen sollten
   wir erstmal rausnehmen, solange wir das nicht tracken.“ · Gold war weg (seit v734 nur Saison-Trainings) –
   Kachel: Gold ab 8, HERO ab 16 · „Auf dem Tablet sind die Bilder ganz klein in der Mitte der Karte. Und die
   Spieltagskarte unterscheidet sich nicht richtig.“
   a) Hype: der Player liegt in #kab-hype-host; verlässt man die Seite, bleibt DASSELBE iframe (kein Neuladen)
      und wird zur Leiste unten (80 px) mit „⏹ Stopp“ ≥ 44 px; zurück auf der Seite wieder groß; Stopp entfernt ihn
   b) Adler-Karte: nur noch SPIELE und TRAININGS; Gold ab 8, HERO ab 16, darunter nichts
   c) Adler Wrapped (Team und Kind): keine Tore- und Ballaktionen-Zeilen
   d) Album: das Foto wächst mit dem Sticker (Tablet-Breite deutlich größer als 46 px, Handy bleibt bei 46 px plus Rand);
      Sonder-Sticker tragen je Art einen eigenen Rahmen (SPIELTAG auf Rasen, KAPITÄN mit „C“, MOMENT) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/eltern/index.html", warten: 2500, breite: 820, hoehe: 1180, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }],
    team_config: [{ spotify_playlist: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd" }] }) });
  await s.page.route(/open\.spotify\.com/, r => r.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Player</body></html>" }));
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80 && (typeof kabineHype !== "function" || typeof _albumStickerHtml !== "function"); i++) await w(50);
    if (typeof kabineHypeStart !== "function") return { fehlt: true };
    document.querySelectorAll(".modal-overlay,[role=dialog]").forEach(d => d.remove());
    const k = document.createElement("div"); k.id = "kabine"; k.style.cssText = "position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#1e3a8a";
    k.innerHTML = '<div id="kabine-body" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>'; document.body.appendChild(k);
    const out = {};
    await kabineHype(); await w(100);
    const start = [...document.querySelectorAll("#kh-seite button")].find(b => /Playlist laden/.test(b.textContent));
    start && start.click(); await w(200);
    const host = document.getElementById("kab-hype-host"), f1 = host && host.querySelector("iframe");
    out.a = { gross: host && host.className, h1: f1 && f1.style.height };
    kabineHome(); await w(200);
    const f2 = document.querySelector("#kab-hype-host iframe");
    const stopp = document.querySelector("#kab-hype-host .kh-stopp");
    out.a.mini = document.getElementById("kab-hype-host")?.className; out.a.h2 = f2 && f2.style.height;
    out.a.gleich = !!(f1 && f2 && f1 === f2 && f2.isConnected);
    out.a.stopp = stopp ? Math.round(stopp.getBoundingClientRect().height) : 0;
    out.a.unten = (() => { const hh = document.getElementById("kab-hype-host"), b = document.getElementById("kabine-body"); return !!(hh && b && hh.getBoundingClientRect().top >= b.getBoundingClientRect().bottom - 1); })();
    await kabineHype(); await w(150);
    out.a.wieder = document.getElementById("kab-hype-host")?.className;
    out.a.gleich2 = document.querySelector("#kab-hype-host iframe") === f1;
    kabineHypeStopp(); await w(100);
    out.a.weg = !document.getElementById("kab-hype-host");
    // b) Gold-Stufen
    out.b = [7, 8, 15, 16].map(n => { const m = cardMilestoneTheme(n); return m ? m.name : "–"; });
    // c) Wrapped
    const team = adlerWrappedSlides({ saison: "2026/27", spiele: 5, trainings: 9, tore: 7, aktionen: 30, paesse: 4, paraden: 2, quests_geschafft: 1, spieler_anzahl: 14, top_aktiv: { name: "Kind A", wert: 9 }, fleissigste: { name: "Kind B", wert: 9 } }, []);
    out.c = { team: team.map(x => x.html).join(" ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") };
    // d) Album
    const P = [{ key: "kid1", label: "Kind A", rar: "kind", num: 1, emo: "⚽" }, { key: "sk_st_1_2026-09-26", label: "Kind A", sub: "Spieltag 26.09.", rar: "sonder", num: 2, emo: "⚽" },
      { key: "sk_ka_1_2026-10-03_1", label: "Kind A", sub: "Kapitän 03.10.", rar: "sonder", num: 3, emo: "🎗️" }, { key: "sk_mo_5", label: "Kind A", sub: "Moment", rar: "sonder", num: 4, emo: "⭐" }];
    const box = document.createElement("div"); box.style.cssText = "display:grid;grid-template-columns:repeat(4,200px);gap:8px;position:relative;z-index:99999";
    box.innerHTML = P.map(g => _albumStickerHtml(g, 1)).join(""); document.body.appendChild(box);
    const klein = document.createElement("div"); klein.style.cssText = "width:90px;position:relative;z-index:99999"; klein.innerHTML = _albumStickerHtml(P[0], 1); document.body.appendChild(klein);
    await w(50);
    const ava = el => Math.round(el.querySelector("[data-st-ava] > div").getBoundingClientRect().width);
    const st = [...box.children];
    out.d = { gross: ava(st[0]), klein: ava(klein.firstElementChild), texte: st.map(x => x.textContent.replace(/\s+/g, " ").trim()),
      rasen: /repeating-linear-gradient/.test(st[1].getAttribute("style")), kapC: [...st[2].querySelectorAll("div")].some(d => d.textContent.trim() === "C") };
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v752 Kabine-Feinschliff", false, ["kabineHypeStart fehlt"]);
  const a = r.a;
  if (a.gross !== "kh-gross" || a.h1 !== "420px" || a.mini !== "kh-mini" || a.h2 !== "80px" || !a.gleich || a.stopp < 44 || !a.unten || a.wieder !== "kh-gross" || !a.gleich2 || !a.weg) probleme.push(`a) Hype: ${JSON.stringify(a)}`);
  zeilen.push(`a) Hype: groß → Leiste unten (dasselbe iframe, 80 px, Stopp ${a.stopp} px) → wieder groß → Stopp entfernt`);
  if (r.b.join(",") !== "–,GOLD,GOLD,HERO") probleme.push(`b) Stufen 7/8/15/16: ${r.b.join(",")}`);
  const quelle = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const quad = (quelle.match(/const quad=\[[^\n]*\];/) || [""])[0];
  if (!/SPIELE/.test(quad) || !/TRAININGS/.test(quad) || /TORE|AKTIONEN|PARADEN/.test(quad)) probleme.push(`b) Kartenfelder: ${quad}`);
  zeilen.push(`b) Karte: nur SPIELE und TRAININGS · Stufen 7/8/15/16 = ${r.b.join("/")}`);
  if (/Tore ⚽|Ballaktionen|Aktivposten/.test(r.c.team) || !/Spiele & Turniere/.test(r.c.team)) probleme.push(`c) Team-Wrapped: ${r.c.team.slice(0, 300)}`);
  const kind = (quelle.match(/const rows=\[\["📅"[^\n]*\];/) || [""])[0];
  if (!kind || /Tore|Ballaktionen/.test(kind)) probleme.push(`c) Kinder-Wrapped: ${kind}`);
  zeilen.push("c) Wrapped ohne Tore, Ballaktionen und Aktivposten");
  const d = r.d;
  if (d.gross < 100 || d.klein > 50 || !/SPIELTAG/.test(d.texte[1]) || !d.rasen || !/KAPITÄN/.test(d.texte[2]) || !d.kapC || !/MOMENT/.test(d.texte[3])) probleme.push(`d) Album: ${JSON.stringify(d)}`);
  zeilen.push(`d) Album: Foto ${d.gross} px auf 200-px-Sticker (Handy ${d.klein} px), Rahmen SPIELTAG/KAPITÄN mit C/MOMENT`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v752 Kabine: Hype läuft weiter, Karte ohne Tore, Gold ab 8, Album fürs Tablet", !probleme.length, probleme.length ? probleme : zeilen);
};
