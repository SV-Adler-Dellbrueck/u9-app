/* v758 · Sticker-Album: Bild als Vollbild, eigener Rahmen je Seltenheit, Zoom ohne Überlagerung
   PO 05.10. (Bildschirmfoto): „Tippen zum Schließen liegt über der Karte.“ · „Die Stickerkarten sehen optisch nicht gut aus.
   Das Bild ist klein in der Mitte … vor allem die seltenen und epischen Karten besonders gestalten.“
   a) Das Bildfeld füllt die Kartenbreite (vorher 58 % als Medaillon); Foto ersetzt das Emoji und füllt ebenso
   b) Jede Seltenheit trägt ihr Kennzeichen: SELTEN Pille, MATCHDAY Flammen, EPISCH Strahlenkranz, LEGENDÄR Krone und Doppelrahmen
   c) Zoom: Hinweis „Tippen zum Schließen“ liegt unter der Karte (keine Überlappung), Schließen-Knopf ≥ 44 px, Dialog-Kennzeichnung
   d) Tüte: aufgedeckte Karte zeigt denselben Sticker, „NEU!“ als Marke */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/eltern/index.html", warten: 2000, breite: 390, hoehe: 800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80 && typeof _albumStickerHtml !== "function"; i++) await w(50);
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    document.querySelectorAll(".modal-overlay,[role=dialog]").forEach(d => d.remove());
    const k = document.createElement("div"); k.id = "kabine"; k.style.cssText = "position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#1e3a8a;z-index:99990";
    k.innerHTML = '<div id="kabine-body" style="flex:1;overflow:auto"></div>'; document.body.appendChild(k);
    const P = [{ key: "k1", label: "Kind A", sub: "#9", rar: "kind", num: 1, emo: "🦅" }, { key: "t1", label: "Trainer A", sub: "Trainer", rar: "selten", num: 2, emo: "🧢" },
      { key: "m1", label: "Kind B", sub: "Spieltag 04.10.", rar: "matchday", num: 3, emo: "🔥" }, { key: "e1", label: "Thurner Kamp", sub: "Unser Platz", rar: "episch", num: 4, emo: "🏟️" },
      { key: "l1", label: "Der Pokal", sub: "Für große Träume", rar: "legendaer", num: 5, emo: "🏆" }];
    const box = document.createElement("div"); box.id = "t-grid"; box.style.cssText = "display:grid;grid-template-columns:repeat(3,110px);gap:10px;padding:10px";
    box.innerHTML = P.map(g => _albumStickerHtml(g, 2, true)).join(""); document.getElementById("kabine-body").appendChild(box);
    await w(100);
    const st = [...box.children], out = {};
    out.a = st.map(el => { const av = el.querySelector("[data-st-ava] > div").getBoundingClientRect(), c = el.getBoundingClientRect(); return { rel: +(av.width / c.width).toFixed(2), hoch: +(av.height / c.height).toFixed(2) }; });
    out.b = { pille: st[1].textContent.includes("SELTEN"), flammen: st[2].textContent.includes("🔥🔥🔥"), strahlen: /repeating-conic-gradient/.test(st[3].innerHTML), krone: st[4].textContent.includes("👑"),
      doppel: (st[4].innerHTML.match(/border-radius:(10|8)px/g) || []).length >= 2, kindOhnePille: !/SELTEN|EPISCH|LEGEND/.test(st[0].textContent), aria: st.every(el => /Nr\. \d/.test(el.getAttribute("aria-label") || "")) };
    // Foto ersetzt das Emoji und füllt
    const av = st[0].querySelector("[data-st-ava] > div"); av.innerHTML = ""; const im = document.createElement("img"); im.style.cssText = "width:100%;height:100%;object-fit:cover"; av.appendChild(im);
    out.foto = +(av.getBoundingClientRect().width / st[0].getBoundingClientRect().width).toFixed(2);
    window._albPoolCache = P;
    return out;
  });
  try { if (process.env.STICKER_BILD) await s.page.screenshot({ path: process.env.STICKER_BILD }); } catch (e) {}
  const r2 = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), P = window._albPoolCache, out = {};
    // c) Zoom
    window._albPoolCache = P; _albRow = { sticker: { l1: 3 } };
    kabineStickerZoom("l1"); await w(150);
    const z = document.getElementById("kab-zoom"), card = z.querySelector("[class*=kab-st]"), hint = [...z.querySelectorAll("div")].find(d => d.textContent.trim() === "Tippen zum Schließen" && !d.children.length), x = z.querySelector("button");
    const cr = card.getBoundingClientRect(), hr = hint.getBoundingClientRect(), xr = x.getBoundingClientRect(), zr = z.getBoundingClientRect();
    out.c = { ueber: Math.round(hr.top - cr.bottom), breite: Math.round(cr.width), xh: Math.round(xr.height), xb: Math.round(xr.width), dialog: z.getAttribute("role") === "dialog" && z.getAttribute("aria-modal") === "true",
      innen: cr.top >= zr.top && hr.bottom <= zr.bottom + 1 };
    return out;
  });
  try { if (process.env.STICKER_BILD) await s.page.screenshot({ path: process.env.STICKER_BILD.replace('.png', '-zoom.png') }); } catch (e) {}
  const r3 = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), P = window._albPoolCache, out = {};
    document.getElementById('kab-zoom').click(); out.schliesst = !document.getElementById('kab-zoom');
    // d) Tüte
    window._packCards = [Object.assign({}, P[4], { neu: true, count: 1, open: false }), Object.assign({}, P[0], { neu: false, count: 3, open: false })];
    document.getElementById("kabine-body").innerHTML = '<div id="kab-pack-open"><button id="pk-0"></button><button id="pk-1"></button><button id="pk-done" style="display:none"></button></div>';
    kabineAlbumFlip(0); kabineAlbumFlip(1); await w(100);
    out.d = { neu: /NEU!/.test(document.getElementById("pk-0").textContent), sticker0: !!document.querySelector("#pk-0 [data-st-ava]"), krone: document.getElementById("pk-0").textContent.includes("👑"), dup: !/NEU!/.test(document.getElementById("pk-1").textContent) && /3×/.test(document.getElementById("pk-1").textContent) };
    return out;
  });
  try { if (process.env.STICKER_BILD) await s.page.screenshot({ path: process.env.STICKER_BILD.replace('.png', '-tuete.png') }); } catch (e) {}
  const fe = s.fehler(); await s.schliessen();
  if (r.a.some(x => x.rel < 0.95 || x.hoch < 0.6) || !(r.foto >= 0.95)) probleme.push(`a) Bildfeld füllt nicht: ${JSON.stringify(r.a)}`);
  zeilen.push(`a) Bildfeld ${r.a.map(x => Math.round(x.rel * 100) + "%").join("/")} der Kartenbreite, Foto-Feld ${Math.round(r.foto * 100)} %`);
  const b = r.b; if (!b.pille || !b.flammen || !b.strahlen || !b.krone || !b.doppel || !b.kindOhnePille || !b.aria) probleme.push(`b) Kennzeichen: ${JSON.stringify(b)}`);
  zeilen.push("b) SELTEN Pille · MATCHDAY Flammen · EPISCH Strahlen · LEGENDÄR Krone + Doppelrahmen · Kind schlicht · Beschriftung für Vorlesehilfen");
  const c = r2.c; if (c.ueber < 8 || c.xh < 44 || c.xb < 44 || !c.dialog || !c.innen || !r3.schliesst || c.breite < 200) probleme.push(`c) Zoom: ${JSON.stringify(c)}`);
  zeilen.push(`c) Zoom: Karte ${c.breite} px breit, Hinweis ${c.ueber} px unter der Karte, Schließen-Knopf ${c.xb}×${c.xh}`);
  const d = r3.d; if (!d.neu || !d.sticker0 || !d.krone || !d.dup) probleme.push(`d) Tüte: ${JSON.stringify(d)}`);
  zeilen.push("d) Tüte zeigt den Album-Sticker mit „NEU!“-Marke, Doppelte mit Zähler");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v758 Sticker-Optik: Vollbild je Seltenheit, Zoom ohne Überlagerung", !probleme.length, probleme.length ? probleme : zeilen);
};
