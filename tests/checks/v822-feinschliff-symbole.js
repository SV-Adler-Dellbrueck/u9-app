/* v822 · Feinschliff aus der Durchsicht vom 09.11.2026.
   a) Die Bereichsseiten (fünf – „Taktik“ öffnet direkt das Brett) tragen oben ein Linien-Symbol (SVG) statt eines Emojis – wie ihre
      Kacheln. Das Kalender-Emoji neben „Orga“ zeigte je nach Gerät fest „17. Juli“.
   b) PIN-Seite der Trainer und Eltern-Anmeldung zeigen das Vereinswappen (geladenes Bild) statt
      Fußball- und Adler-Emoji.
   c) Felder und Knöpfe der Eltern-Anmeldung stehen in der Schrift der App (vorher Systemschrift). */
"use strict";
module.exports = async function (h) {
  const titel = "v822 Feinschliff: Linien-Symbole in den Bereichsköpfen, Wappen und App-Schrift auf den Einstiegsseiten";
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, ohnePinGate: false, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const pin = await s.page.evaluate(async () => {
    const g = document.getElementById("pin-gate"), img = g && g.querySelector("img");
    if (img && !img.complete) await new Promise(x => { img.onload = img.onerror = x; setTimeout(x, 3000); });
    return { bild: !!img, geladen: !!(img && img.naturalWidth > 0), breite: img ? Math.round(img.getBoundingClientRect().width) : 0, emoji: g ? /⚽/.test(g.textContent) : null };
  });
  await s.page.evaluate(() => { document.querySelectorAll("[id]").forEach(e => { if (/pin/i.test(e.id) && /gate|overlay|wrap|screen/i.test(e.id)) e.style.display = "none"; }); });
  await h.sichtbarMachen(s.page, "#main-app");
  const koepfe = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)); await loadKader();
    const out = {};
    for (const k of Object.keys(KACHELN)) { kachelOpen(k); await w(350);
      if (!document.getElementById("view-ue-" + k) || !document.getElementById("view-ue-" + k).children.length) continue;   // „Taktik“ hat keine Bereichsseite, sie öffnet direkt das Brett
      const kopf = document.querySelector("#view-ue-" + k + " > div"), sym = kopf && kopf.querySelector("span[aria-hidden]");
      out[k] = { svg: !!(sym && sym.querySelector("svg")), text: sym ? sym.textContent.trim() : "?", titel: kopf ? kopf.textContent.replace(/\s+/g, " ").trim().slice(0, 30) : "" }; }
    return out;
  });
  const f1 = s.fehler(); await s.schliessen();
  const e = await h.starten({ start: "/eltern/index.html", angemeldet: false, warten: 3000, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const an = await e.page.evaluate(async () => {
    const form = document.getElementById("ep-step-pw"); if (!form) return { fehlt: true };
    const karte = form.parentElement, img = karte.querySelector("img");
    if (img && !img.complete) await new Promise(x => { img.onload = img.onerror = x; setTimeout(x, 3000); });
    const app = getComputedStyle(document.body).fontFamily;
    const teile = [...karte.querySelectorAll("input, button")].filter(x => x.getBoundingClientRect().height > 0);
    return { geladen: !!(img && img.naturalWidth > 0), emoji: /🦅/.test(karte.textContent), app, fremd: teile.filter(x => getComputedStyle(x).fontFamily !== app).map(x => x.id || x.textContent.trim().slice(0, 16)), teile: teile.length };
  });
  const f2 = e.fehler(); await e.schliessen();
  const f = f1.concat(f2); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));

  const ohne = Object.keys(koepfe).filter(k => !koepfe[k].svg || koepfe[k].text);
  if (Object.keys(koepfe).length < 5 || ohne.length) probleme.push("a) Bereichskopf ohne Linien-Symbol: " + ohne.map(k => k + " („" + koepfe[k].text + "“)").join(", "));
  if (!pin.bild || !pin.geladen || pin.breite < 48 || pin.emoji) probleme.push("b) PIN-Seite: " + JSON.stringify(pin));
  if (an.fehlt) probleme.push("b) Eltern-Anmeldung nicht gefunden");
  else {
    if (!an.geladen || an.emoji) probleme.push("b) Eltern-Anmeldung: Wappen geladen " + an.geladen + ", Emoji " + an.emoji);
    if (an.teile < 3 || an.fremd.length) probleme.push("c) nicht in der App-Schrift: " + an.fremd.join(", ") + " (" + an.teile + " Teile)");
  }
  zeilen.push(`${Object.keys(koepfe).length} Bereichsköpfe mit SVG · PIN-Seite Wappen ${pin.breite} px · Anmeldung: Wappen ${an.geladen}, ${an.teile} Felder/Knöpfe in App-Schrift`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
