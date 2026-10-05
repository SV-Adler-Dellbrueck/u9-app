/* v757 · Stärken als feste Kategorien, Torwart-Thema nur bei „Torwart 1. Wahl“
   Charles 04.10.: „… oder Kategorien vorab festlegen, aus denen die Trainer wählen können.“ – „Unsere Torhüter sind auch
   Feldspieler. Wir haben keinen festen Torwart.“
   a) Kinderprofil: Karte „Stärken auf der Karte“ mit allen Abzeichen als Knöpfe (≥ 44 px); bis zu drei wählbar, der vierte
      wird abgelehnt (Hinweis), Abwählen geht; Speichern schreibt staerken_manuell (nur Schlüssel, höchstens drei);
      „Auswahl löschen“ schreibt null
   b) Die Karte des Trainers zeigt die gewählten Stärken in der gewählten Reihenfolge, auch ohne Einschätzung
   c) kartenTorwart: nur tw mit Rang 1 (oder ohne Rangangabe wie vor v757) ist Torwart
   d) Kabinen-Karte (Kind) und Eltern-Karte: „2. Wahl“ und „kann ins Tor“ tragen das Feldspieler-Thema, „1. Wahl“ das Torwart-Thema */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const patches = []; let gespeichert = null;
  const kader = h.kaderZeilen().map((k, i) => i === 0 ? { ...k, tw: true, tw_prio: 2 } : k);
  const t = await h.starten({ warten: 1200, breite: 390, hoehe: 900, supabase: h.supabaseAttrappe({
    kader: (u, req) => { if (req.method() === "PATCH") { const b = JSON.parse(req.postData() || "{}"); patches.push(b); if ("staerken_manuell" in b) gespeichert = b.staerken_manuell; return { status: 204, body: "" }; }
      return kader.map((k, i) => i === 1 ? { ...k, staerken_manuell: gespeichert } : k); },
    kind_fanfacts: [], foto_consent: [], kind_foto: [] }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof kinderProfilOpen !== "function"; i++) await w(50);
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    await loadKader();
    const id = KADER[1]._id, out = {};
    await kinderProfilOpen(id); await w(300);
    const m = () => document.getElementById("kp-modal");
    const knoepfe = () => [...m().querySelectorAll(".kp-st-btn")];
    const an = () => knoepfe().filter(b => b.getAttribute("aria-pressed") === "true").map(b => b.dataset.key).sort();   // Reihenfolge der Knöpfe, nicht der Wahl
    const toasts = []; const t0 = window.toast; window.toast = (x, k) => { toasts.push(String(x)); };
    out.a = { anzahl: knoepfe().length, soll: Object.keys(CARD_BADGES).length, klein: knoepfe().filter(b => b.getBoundingClientRect().height < 44).length };
    const klick = k => { m().querySelector(`.kp-st-btn[data-key="${k}"]`).click(); };
    klick("f_pass"); klick("f_tempo"); klick("f_sozial"); out.a.drei = an();
    klick("f_raum"); out.a.vier = an(); out.a.hinweis = toasts.find(x => /Höchstens drei/.test(x)) || null;
    klick("f_tempo"); out.a.nachAbwahl = an();
    klick("f_koord"); out.a.zahl = (document.getElementById("kp-st-zahl") || {}).textContent;
    await kinderProfilSpeichern(); await w(500);
    out.b = { karte: (() => { const d = adlerCardData(KADER.find(x => x._id === id).name); return d ? { keys: d.badges.map(b => b.label), theme: d.theme && d.theme.name } : null; })() };
    await kinderProfilOpen(id); await w(300);
    out.a.wieder = an();
    const leer = [...m().querySelectorAll("button")].find(b => /Auswahl löschen/.test(b.textContent)); leer && leer.click(); await w(50);
    out.a.leerAn = an(); await kinderProfilSpeichern(); await w(500);
    window.toast = t0;
    // c) kartenTorwart
    out.c = [{ tw: true, tw_prio: 1 }, { tw: true, tw_prio: 2 }, { tw: true, tw_prio: 0 }, { tw: true }, { tw: false, tw_prio: 1 }, { tw: true, twPrio: 1 }, { tw: true, twPrio: 0 }].map(x => kartenTorwart(x));
    // d) Kabinen- und Eltern-Karte
    const roh = (tw, prio) => ({ name: "Kind X", nr: 5, tw, tw_prio: prio, staerken: [], foto_path: null });
    const kab = x => { const c = galleryCardData(x); return { tw: c.tw, keeper: c.theme === CARD_THEMES.keeper, pos: c.pos }; };
    const elt = x => { const c = adlerCardDataFromChild(x); return { tw: c.tw, keeper: c.theme === CARD_THEMES.keeper, pos: c.pos }; };
    out.d = { kab1: kab(roh(true, 1)), kab2: kab(roh(true, 2)), kab0: kab(roh(true, 0)), kabAlt: kab({ ...roh(true), tw_prio: undefined }),
      elt1: elt(roh(true, 1)), elt2: elt(roh(true, 2)), elt0: elt(roh(true, 0)) };
    return out;
  });
  const fe = t.fehler(); await t.schliessen();
  const a = r.a;
  const p1 = patches.find(p => p.staerken_manuell && p.staerken_manuell.length), p2 = patches[patches.length - 1];
  if (a.anzahl !== a.soll || a.klein || JSON.stringify(a.drei) !== '["f_pass","f_sozial","f_tempo"]' || a.vier.length !== 3 || !a.hinweis || JSON.stringify(a.nachAbwahl) !== '["f_pass","f_sozial"]'
      || !/3 von 3/.test(a.zahl) || !p1 || JSON.stringify(p1.staerken_manuell) !== '["f_pass","f_sozial","f_koord"]' || JSON.stringify(a.wieder) !== '["f_koord","f_pass","f_sozial"]'
      || a.leerAn.length || !p2 || p2.staerken_manuell !== null)
    probleme.push("a) " + JSON.stringify({ a, p1: p1 && p1.staerken_manuell, p2: p2 && p2.staerken_manuell }));
  zeilen.push(`a) ${a.anzahl} Kategorien als Knöpfe, höchstens drei, gespeichert ${p1 ? JSON.stringify(p1.staerken_manuell) : "–"}, „Auswahl löschen“ → null`);
  const b = r.b.karte;
  if (!b || JSON.stringify(b.keys) !== JSON.stringify(["Pass-Meister", "Herz des Teams", "Wirbelwind"])) probleme.push("b) " + JSON.stringify(b));
  zeilen.push(`b) Karte des Trainers: ${b ? b.keys.join(", ") : "–"}`);
  if (JSON.stringify(r.c) !== "[true,false,false,true,false,true,false]") probleme.push("c) " + JSON.stringify(r.c));
  zeilen.push("c) nur Rang 1 (oder ohne Rangangabe) ist Torwart");
  const d = r.d;
  if (!d.kab1.keeper || !d.kab1.tw || d.kab2.keeper || d.kab2.tw || d.kab0.keeper || !d.kabAlt.keeper || !d.elt1.keeper || d.elt2.keeper || d.elt0.keeper || d.kab2.pos === "Torwart" || d.elt0.pos === "Torwart")
    probleme.push("d) " + JSON.stringify(d));
  zeilen.push("d) Kabinen- und Eltern-Karte: 1. Wahl gelb, 2. Wahl und „kann ins Tor“ Feldspieler");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v757 Stärken-Auswahl und Torwart-Regel", !probleme.length, probleme.length ? probleme : zeilen);
};
