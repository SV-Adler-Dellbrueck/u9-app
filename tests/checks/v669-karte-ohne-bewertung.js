/* v669 · Spielerkarte ohne Bewertung, „Eltern einladen“ und QR-Aushang entfernt
   PO 29.09. (zwei Bildschirmfotos, Adler-Welt im Trainerbereich): „Beim Klick auf die Karte
   kommt unten die Meldung ‚keine Bewertung vorhanden‘. Geht es nicht um die Spielerkarte des
   Kindes?“ – „Den unteren Bereich ist ja gedoppelt, weil die Kacheln ja im Trainerzugang unter
   Einladungskarten dargestellt. Eltern einladen kann meiner Einschätzung ganz weg ebenso wie
   QR-Aushang.“
   a) Adler-Welt: 🃏 öffnet die Karte auch ohne Bewertung – kein „Keine Bewertung vorhanden“,
      keine Stärken-Abzeichen, Name steht drauf
   b) Mit Bewertung trägt die Karte weiter drei Stärken
   c) Adler-Welt ohne Abschnitt „Eltern einladen“, ohne QR-Aushang und ohne doppelte Karten-Taste
   d) Kommunikation: keine Kacheln „Eltern einladen“ und „QR-Aushang“, „Einladungskarten“ bleibt;
      der Saisonstart führt zu den Einladungskarten */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const s = await h.starten({ warten: 1200, hoehe: 2400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async ({ K }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    const out = { fehlt: [] };
    for (const n of ["adlerCardOpen", "adlerCardData", "adlerWeltOpen", "_kachelInhalt"]) if (typeof window[n] !== "function") out.fehlt.push(n);
    if (out.fehlt.length) return out;
    await loadKader();
    window._toasts = []; const alt = window.toast; window.toast = (m, a) => { window._toasts.push(m); try { alt && alt(m, a); } catch (e) {} };
    DB[K[0]] = [];
    const d = adlerCardData(K[0]);
    out.a = { daten: !!d, name: d && d.name, badges: d ? d.badges.length : -1 };
    await adlerCardOpen(K[0]); await w(200);
    out.a.toasts = window._toasts.slice();
    out.a.canvas = !!document.querySelector("canvas");
    document.querySelectorAll("canvas").forEach(c => c.closest("[role=dialog],div[id$='-modal']")?.remove());
    // b) mit Bewertung
    const v = {}; ["f_tempo", "f_ballkontrolle", "f_pass", "f_abschluss", "f_raum", "f_umschalt"].forEach((k, i) => v[k] = 3 + (i % 3));
    DB[K[1]] = [{ radios: v, datum: "2026-09-01" }];
    const d2 = adlerCardData(K[1]);
    out.b = d2 ? d2.badges.length : -1;
    // c) Adler-Welt
    await adlerWeltOpen(); await w(200);
    const m = document.getElementById("aw-modal");
    out.c = { text: m ? m.textContent : "", karten: m ? [...m.querySelectorAll("button")].filter(b => /einladungskartenOpen/.test(b.getAttribute("onclick") || "")).length : -1 };
    m?.remove();
    // d) Kommunikation und Saisonstart
    const html = _kachelInhalt("elki");
    out.d = { einladen: /elternInvitePaket|Eltern einladen/.test(html), aushang: /qrAushangOpen|QR-Aushang/.test(html), karten: /einladungskartenOpen/.test(html),
      saison: (SAISONSTART_STEPS.find(x => x.k === "einladung") || {}).run || "", fn: typeof window.elternInvitePaket + "/" + typeof window.qrAushangOpen };
    return out;
  }, { K });
  const f = s.fehler(); await s.schliessen();
  if (r.fehlt.length) return h.ergebnis("Spielerkarte ohne Bewertung, Einladen aufgeräumt", false, [r.fehlt.join(", ") + " fehlt"]);
  if (!r.a.daten || r.a.name !== K[0] || r.a.badges !== 0) probleme.push(`a) Kartendaten ohne Bewertung: ${JSON.stringify(r.a)}`);
  if (r.a.toasts.some(x => /Keine Bewertung/.test(x))) probleme.push("a) „Keine Bewertung vorhanden“ erscheint noch");
  if (!r.a.canvas) probleme.push("a) Die Karte öffnet sich nicht");
  if (r.b < 1) probleme.push(`b) Mit Bewertung ${r.b} Stärken`);
  if (/Eltern einladen|QR-Aushang|Einladung erstellen/.test(r.c.text)) probleme.push("c) Adler-Welt zeigt noch „Eltern einladen“/QR-Aushang");
  if (r.c.karten) probleme.push("c) Einladungskarten stehen doppelt in der Adler-Welt");
  if (r.d.einladen || r.d.aushang) probleme.push("d) Kachel „Eltern einladen“ oder „QR-Aushang“ steht noch da");
  if (!r.d.karten) probleme.push("d) Kachel „Einladungskarten“ fehlt");
  if (!/einladungskartenOpen/.test(r.d.saison)) probleme.push(`d) Saisonstart führt zu „${r.d.saison}“`);
  if (r.d.fn !== "undefined/undefined") probleme.push(`d) Alte Funktionen noch da: ${r.d.fn}`);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) ohne Bewertung: Karte öffnet, ${r.a.badges} Stärken, keine Meldung · b) mit Bewertung ${r.b} Stärken`);
  zeilen.push(`c) Adler-Welt ohne Einladen/Aushang · d) Kommunikation: Einladungskarten ja, Einladen/Aushang nein · Saisonstart → ${r.d.saison}`);
  return h.ergebnis("Spielerkarte ohne Bewertung, Einladen aufgeräumt", !probleme.length, probleme.length ? probleme : zeilen);
};
