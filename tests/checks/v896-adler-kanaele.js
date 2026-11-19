/* v896 · Die sechs „Adler“-Kanäle (Beschluss Charles 19.11., Bestandsaufnahme 4.2).
   Alle Namen bleiben; wo Eltern (und Trainer) einen davon als Eintrag, Kachel oder Knopf sehen,
   steht darunter in Elternsprache, was er ist – überall derselbe Satz. Die Neuerungen der
   Adlerschmiede laufen in den Adler News mit, nicht mehr als eigener Sammel-Eintrag.
   Gemessen im angemeldeten Elternbereich (Attrappe mit einer adlerschmiede-Zeile), hell und dunkel:
   a) Adler News (Knopf Startseite): „Neues seit deinem letzten Besuch“
   b) Adler-Rufe (Hinweiszeile „Neu“): „Nachrichten im Team“
   c) Adler News enthält „🛠️ Neu in der App: <Kurztitel>“; kein Eintrag „Aus der Adlerschmiede: … Neuerungen“;
      Adler Nest und Adler-Post tragen dort ihre Unterzeile; ein Tipp auf die Schmiede-Zeile öffnet die Liste
      („Aus der Adlerschmiede“, Unterzeile „Neue Funktionen in der App …“, der Eintrag steht darin)
   d) „Mehr vom Team“ → Adler Nest: „Unser Vereinsheft …“
   e) Adler Radio (Knopf im Spielbericht) „Spielbericht vorlesen lassen“, Adlerschmiede-Schalter
      „Neue Funktionen in der App …“, Trainer-Kacheln Adler-Rufe/Adler Nest tragen die Unterzeile
   f) jede sichtbare Unterzeile hell und dunkel ≥ 4,5:1
   g) Start mit ./eltern/#adlerschmiede (Ziel des Sonntags-Push) öffnet die Neuerungen */
"use strict";
const fs = require("fs"), path = require("path");
const SOLL = { rufe: "Nachrichten im Team", nest: "Unser Vereinsheft", post: "Grüße und Komplimente für dein Kind",
  news: "Neues seit deinem letzten Besuch", schmiede: "Neue Funktionen in der App", radio: "Spielbericht vorlesen lassen" };
module.exports = async function (h) {
  const titel = "v896 Adler-Kanäle: Unterzeilen, Adlerschmiede in den Adler News, Anker #adlerschmiede";
  const probleme = [], zeilen = [];
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const jetzt = new Date().toISOString();
  const attrappe = () => h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    adlerschmiede: [{ id: 7, datum: h.tagePlus(-1), emoji: "🎟️", text: "Einladung teilen: So gebt ihr die Karte weiter" }],
    adlerschmiede_push_aus: [],
    kabine_post: [{ created_at: jetzt }],
    rufe_nachricht: [{ autor_name: "Erwachsener", text: "Wer fährt Samstag?", autor: "u2" }],
    rpc: { eltern_news: {}, training_rueckblick: [], heft_ausgaben_liste: [{ veroeffentlicht_am: jetzt }], is_rufe_mod: false,
      rufe_ungelesen: [{ raum_id: 5, anzahl: 2, an_alle: false }], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });

  async function oeffnen(scheme, anker) {
    const s = await h.starten({ scheme, start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844, supabase: attrappe() });
    await s.page.evaluate(t => {
      localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 }));
      localStorage.setItem("adler_news_seen", JSON.stringify({ wn: "2000-01-01", nest: "2000-01-01", kpost: "2000-01-01" }));
    }, TOKEN);
    if (anker) await s.page.goto(new URL("/eltern/index.html#adlerschmiede", s.page.url()).href, { waitUntil: "networkidle" });
    else await s.page.reload({ waitUntil: "networkidle" });
    await s.page.waitForTimeout(4500);
    return s;
  }

  for (const scheme of ["light", "dark"]) {
    const s = await oeffnen(scheme, false);
    await s.page.evaluate(h.kontrastHelfer);
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms)), out = { k: [] };
      if (typeof ADLER_KANAELE === "undefined" || typeof kanalUnter !== "function") return { alt: true };
      const sichtbar = el => { const q = el.getBoundingClientRect(); return q.width > 0 && q.height > 0; };
      const messe = (wo, root) => [...root.querySelectorAll(".kanal-unter")].filter(sichtbar)
        .forEach(u => out.k.push({ wo, kanal: u.dataset.kanal, t: u.textContent.trim(), k: window.__kontrastVon(u) }));
      const unter = (root, kanal) => { const u = root && root.querySelector(`.kanal-unter[data-kanal="${kanal}"]`); return u ? u.textContent.trim() : null; };
      // a) b) Startseite
      if (typeof rufeBadgeLoad === "function" && !(document.getElementById("rufe-hinweis") || {}).textContent) { await rufeBadgeLoad(); await w(300); }
      const nb = document.getElementById("eltern-news-btn");
      out.a = nb ? { sichtbar: sichtbar(nb), unter: unter(nb, "news") } : null;
      out.b = unter(document.getElementById("rufe-hinweis"), "rufe");
      out.kopfTitel = (document.getElementById("rufe-kopf") || {}).title || "";
      messe("Startseite", document.getElementById("ep-dash-body") || document);
      // c) Adler News
      elternCatOpen("news"); await w(300);
      const panel = document.getElementById("cat-news");
      const reihen = [...panel.querySelectorAll("button, .news-mitteilung")];
      out.c = { zeilen: reihen.map(x => x.textContent.replace(/\s+/g, " ").replace(/\s*›\s*$/, "").trim()),
        nest: unter(reihen.find(x => /Adler Nest/.test(x.textContent)), "nest"),
        post: unter(reihen.find(x => /Adler-Post/.test(x.textContent)), "post") };
      messe("Adler News", panel);
      const sz = reihen.find(x => /Neu in der App:/.test(x.textContent));
      if (sz) { sz.click(); await w(300); }
      const m = document.getElementById("wn-modal");
      out.c.modal = m ? { titel: (m.querySelector(".mdl-titel") || {}).textContent, text: m.textContent.replace(/\s+/g, " "), rolle: m.getAttribute("role") } : null;
      m && m.remove();
      elternCatClose(); await w(200);
      // d) Mehr vom Team
      elternCatOpen("mehr"); await w(300);
      const mehr = document.getElementById("cat-mehr");
      out.d = unter([...mehr.querySelectorAll("button")].find(x => /Adler Nest/.test(x.textContent)), "nest");
      messe("Mehr vom Team", mehr);
      elternCatClose(); await w(200);
      // e) Adler Radio, Adlerschmiede-Schalter, Trainer-Kachel – in einem Prüfstreifen gerendert
      const streifen = document.createElement("div"); streifen.id = "t-kanaele";
      streifen.style.cssText = "position:fixed;inset:0;z-index:99999;background:var(--surface);color:var(--text);padding:12px;overflow:auto";
      document.body.appendChild(streifen);
      streifen.innerHTML = `<button id="t-radio" class="btn btn-sm">${typeof adlerRadioLabel === "function" ? adlerRadioLabel() : "📻 Adler Radio"}</button><div id="t-schmiede"></div>
        <div id="t-kachel">${typeof kTiles === "function" ? kTiles([{ emo: "💬", label: "Adler-Rufe", kanal: "rufe", fn: "x" }, { emo: "📰", label: "Adler Nest", kanal: "nest", zusatz: "Porträt-Vorschlag", fn: "x" }], "var(--blue)") : ""}</div>`;
      if (typeof schmiedePushRender === "function") { await schmiedePushRender("t-schmiede"); await w(200); }
      out.e = { radio: unter(streifen.querySelector("#t-radio"), "radio"), schmiede: unter(streifen.querySelector("#t-schmiede"), "schmiede"),
        kRufe: unter(streifen.querySelector("#t-kachel"), "rufe"), kNest: unter(streifen.querySelector("#t-kachel"), "nest") };
      if (typeof elternDarkActive === "function" && elternDarkActive() && typeof elternThemeSweep === "function") elternThemeSweep(streifen);
      messe("Knöpfe", streifen);
      streifen.remove();
      return out;
    }).catch(err => ({ fehler: String(err) }));
    const fe = s.fehler(); await s.schliessen();
    if (r.alt) return h.ergebnis(titel, false, ["ADLER_KANAELE/kanalUnter fehlt (Stand vor v896)"]);
    if (r.fehler) return h.ergebnis(titel, false, [scheme + ": Fehler im Ablauf: " + r.fehler]);
    if (fe.length) probleme.push(scheme + ": Konsole: " + fe.slice(0, 2).join(" | "));
    const S = scheme === "light" ? "hell" : "dunkel";

    if (!r.a || !r.a.sichtbar || r.a.unter !== SOLL.news) probleme.push(`${S} a) Adler News-Knopf: ${JSON.stringify(r.a)}`);
    else if (scheme === "light") zeilen.push(`a) Adler News – „${r.a.unter}“`);
    if (r.b !== SOLL.rufe || !r.kopfTitel.includes(SOLL.rufe)) probleme.push(`${S} b) Adler-Rufe: Hinweis „${r.b}“, Kopfknopf „${r.kopfTitel}“`);
    else if (scheme === "light") zeilen.push(`b) Adler-Rufe – „${r.b}“ (Hinweiszeile, Titel des 💬)`);

    const schmiedeZeilen = r.c.zeilen.filter(z => /^🛠️ ?Neu in der App: /.test(z));
    if (schmiedeZeilen.length !== 1 || !/Neu in der App: Einladung teilen$/.test(schmiedeZeilen[0])) probleme.push(`${S} c) Schmiede-Zeile in den Adler News: ${JSON.stringify(r.c.zeilen)}`);
    else if (r.c.zeilen.some(z => /Aus der Adlerschmiede|Neuerungen? in eurer App/.test(z))) probleme.push(`${S} c) eigener Adlerschmiede-Eintrag steht noch da: ${JSON.stringify(r.c.zeilen)}`);
    else if (r.c.zeilen[0] !== schmiedeZeilen[0]) probleme.push(`${S} c) Schmiede-Zeile nicht oben: ${JSON.stringify(r.c.zeilen)}`);
    else if (scheme === "light") zeilen.push(`c) Adler News oben: „${schmiedeZeilen[0]}“, kein eigener Schmiede-Eintrag`);
    if (r.c.nest !== SOLL.nest || r.c.post !== SOLL.post) probleme.push(`${S} c) News-Zeilen Nest „${r.c.nest}“, Post „${r.c.post}“`);
    else if (scheme === "light") zeilen.push(`c) News-Zeilen: Adler Nest – „${r.c.nest}“, Adler-Post – „${r.c.post}“`);
    const md = r.c.modal;
    if (!md || md.rolle !== "dialog" || !/Aus der Adlerschmiede/.test(md.titel || "") || !md.text.includes(SOLL.schmiede) || !/So gebt ihr die Karte weiter/.test(md.text)) probleme.push(`${S} c) Tipp auf die Schmiede-Zeile: ${JSON.stringify(md && { titel: md.titel, rolle: md.rolle, text: md.text.slice(0, 160) })}`);
    else if (scheme === "light") zeilen.push("c) Tipp → „Aus der Adlerschmiede“ mit „" + SOLL.schmiede + " …“ und dem Eintrag");

    if (!r.d || !r.d.startsWith(SOLL.nest)) probleme.push(`${S} d) Mehr vom Team → Adler Nest: „${r.d}“`);
    else if (scheme === "light") zeilen.push(`d) Mehr vom Team → Adler Nest – „${r.d}“`);

    const e = r.e;
    if (e.radio !== SOLL.radio || !e.schmiede || !e.schmiede.startsWith(SOLL.schmiede) || e.kRufe !== SOLL.rufe || !e.kNest || !e.kNest.startsWith(SOLL.nest)) probleme.push(`${S} e) ${JSON.stringify(e)}`);
    else if (scheme === "light") zeilen.push(`e) Adler Radio – „${e.radio}“ · Schalter – „${e.schmiede}“ · Kacheln – „${e.kRufe}“ / „${e.kNest}“`);

    // f) Kontrast und Einheitlichkeit
    const falsch = r.k.filter(x => !SOLL[x.kanal] || !x.t.startsWith(SOLL[x.kanal]));
    if (falsch.length) probleme.push(`${S} f) Unterzeile weicht vom Satz ab: ${JSON.stringify(falsch.slice(0, 3))}`);
    const schwach = r.k.filter(x => x.k < 4.5);
    if (r.k.length < 7) probleme.push(`${S} f) nur ${r.k.length} Unterzeilen sichtbar gemessen`);
    if (schwach.length) probleme.push(`${S} f) Kontrast: ${schwach.map(x => `${x.wo}/${x.kanal} ${x.k}:1`).join(", ")}`);
    else zeilen.push(`f) ${S}: ${r.k.length} Unterzeilen, Kontrast min ${Math.min(...r.k.map(x => x.k))}:1`);
  }

  // g) Anker
  const s2 = await oeffnen("light", true);
  const g = await s2.page.evaluate(() => { const m = document.getElementById("wn-modal");
    return { m: m ? m.textContent.replace(/\s+/g, " ") : null, eintraege: m ? m.querySelectorAll(".schmiede-eintrag").length : 0, hash: location.hash }; });
  const f2 = s2.fehler(); await s2.schliessen();
  if (f2.length) probleme.push("g) Konsole: " + f2.slice(0, 2).join(" | "));
  if (!g.m || g.eintraege !== 1 || !/Einladung teilen/.test(g.m)) probleme.push(`g) Start mit #adlerschmiede: ${JSON.stringify(g)}`);
  else if (g.hash) probleme.push(`g) Anker bleibt in der Adresse: ${g.hash}`);
  else zeilen.push("g) Start mit #adlerschmiede öffnet die Neuerungen, Anker entfernt");

  // Quelltext: Trainer-Kacheln tragen die Kanäle, Adler-Rufe-Kopfknopf im Trainerbereich
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8"), shell = fs.readFileSync(path.join(h.REPO, "shell.html"), "utf8");
  if (!/label:"Adler-Rufe",kanal:"rufe"/.test(views) || !/label:"Adler Nest",kanal:"nest"/.test(views)) probleme.push("Trainer-Kacheln Adler-Rufe/Adler Nest ohne kanal");
  if (!shell.includes("Adler-Rufe – " + SOLL.rufe)) probleme.push("shell.html: 💬 ohne „" + SOLL.rufe + "“");

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
