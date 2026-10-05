/* v759 · Sticker: Lichtreflex beim Kippen (Großansicht) und Aufdeck-Effekt in der Tüte
   PO 05.10.: Schimmer beim Kippen und Aufdeck-Effekt für die seltenen Karten.
   a) Glanzschicht gibt es ab SELTEN, nicht beim einfachen Kind-Sticker; im Grid unsichtbar (--ho nicht gesetzt)
   b) Großansicht: Zeigerbewegung kippt die Karte (--rx/--ry) und schaltet den Reflex ein (--ho 1, --mx/--my folgen dem Zeiger);
      Loslassen schaltet ihn wieder aus; Ziehen schließt die Ansicht nicht
   c) Tüte: aufgedeckte Karte dreht sich (kab-flip); neue Karte ab Selten bekommt einen Lichtblitz, Kind und Doppelte nicht */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/eltern/index.html", warten: 2000, breite: 390, hoehe: 800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80 && typeof _albumStickerHtml !== "function"; i++) await w(50);
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    const k = document.createElement("div"); k.id = "kabine"; k.style.cssText = "position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#1e3a8a;z-index:99990";
    k.innerHTML = '<div id="kabine-body" style="flex:1;overflow:auto"></div>'; document.body.appendChild(k);
    const P = [{ key: "k1", label: "Kind A", rar: "kind", num: 1, emo: "🦅" }, { key: "t1", label: "Trainer A", rar: "selten", num: 2, emo: "🧢" }, { key: "e1", label: "Thurner Kamp", rar: "episch", num: 3, emo: "🏟️" }, { key: "l1", label: "Der Pokal", rar: "legendaer", num: 4, emo: "🏆" }];
    const out = {}, tmp = document.createElement("div"); tmp.innerHTML = P.map(g => _albumStickerHtml(g, 1)).join("");
    out.a = { kind: tmp.children[0].querySelectorAll(".kab-holo-glanz").length, selten: tmp.children[1].querySelectorAll(".kab-holo-glanz").length, episch: tmp.children[2].querySelectorAll(".kab-holo-glanz").length, leg: tmp.children[3].querySelectorAll(".kab-holo-glanz").length };
    window._albPoolCache = P; _albRow = { sticker: { l1: 1 } };
    kabineStickerZoom("l1"); await w(2100); // Selbstschwenk (1,8 s) ist vorbei
    const box = document.getElementById("kab-zoom-card"), r0 = box.getBoundingClientRect();
    const ev = (t, fx, fy) => box.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: "mouse", clientX: r0.left + r0.width * fx, clientY: r0.top + r0.height * fy }));
    ev("pointermove", .9, .1); await w(300);
    out.b = { ry: box.style.getPropertyValue("--ry"), rx: box.style.getPropertyValue("--rx"), mx: box.style.getPropertyValue("--mx"), my: box.style.getPropertyValue("--my"), ho: box.style.getPropertyValue("--ho"),
      glanz: +getComputedStyle(box.querySelector(".kab-holo-glanz")).opacity };
    ev("pointerleave", .9, .1); await w(250);
    out.b.aus = box.style.getPropertyValue("--ho") === "0" && +getComputedStyle(box.querySelector(".kab-holo-glanz")).opacity < .1;
    ev("pointermove", .2, .8); box.click(); await w(50);
    out.b.bleibt = !!document.getElementById("kab-zoom");
    document.getElementById("kab-zoom").remove();
    // c) Tüte
    window._packCards = [Object.assign({}, P[3], { neu: true, count: 1, open: false }), Object.assign({}, P[0], { neu: true, count: 1, open: false }), Object.assign({}, P[2], { neu: false, count: 2, open: false })];
    document.getElementById("kabine-body").innerHTML = '<div id="kab-pack-open"><button id="pk-0"></button><button id="pk-1"></button><button id="pk-2"></button><button id="pk-done" style="display:none"></button></div>';
    kabineAlbumFlip(0); kabineAlbumFlip(1); kabineAlbumFlip(2); await w(50);
    out.c = [0, 1, 2].map(i => ({ flip: document.getElementById("pk-" + i).classList.contains("kab-flip"), blitz: !!document.querySelector("#pk-" + i + " .kab-burst") }));
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  const a = r.a; if (a.kind !== 0 || a.selten !== 1 || a.episch !== 1 || a.leg !== 1) probleme.push(`a) Glanzschicht: ${JSON.stringify(a)}`);
  zeilen.push("a) Glanzschicht ab SELTEN, beim Kind-Sticker keine");
  const b = r.b; if (!(parseFloat(b.ry) > 5) || !(parseFloat(b.rx) > 5) || b.ho !== "1" || b.mx !== "90%" || b.my !== "10%" || !(b.glanz > .9) || !b.aus || !b.bleibt) probleme.push(`b) Kippen: ${JSON.stringify(b)}`);
  zeilen.push(`b) Zeiger rechts oben → kippt ${b.ry}/${b.rx}, Reflex bei ${b.mx}/${b.my}; Loslassen schaltet aus; Ziehen schließt nicht`);
  const c = r.c; if (!c.every(x => x.flip) || !c[0].blitz || c[1].blitz || c[2].blitz) probleme.push(`c) Tüte: ${JSON.stringify(c)}`);
  zeilen.push("c) Tüte: alle drehen sich; Lichtblitz nur bei neuer Karte ab Selten");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v759 Sticker: Glanz beim Kippen und Aufdeck-Effekt", !probleme.length, probleme.length ? probleme : zeilen);
};
