/* v639 · PO: „Bei eigene Übung anlegen sollte schon auf der ersten Kachel ein KI-Modus zur
   Beschreibung der Übung geben. Aktuell liegt der KI-Modus nur auf der Skizzen-Ebene. Zusätzlich
   finde ich die Struktur und Optik nicht optimal.“

   a) Der KI-Kasten steht oben in der Maske, vor dem Namensfeld; Einsprechen und KI-Auswertung da.
   b) KI-Auswertung schickt modus „text“ an ki-uebung und füllt Name, Kategorie, Kinder, Feld,
      Minuten, Ablauf (mit Material), Varianten, Coaching, Schwierigkeit und die Skizze.
   c) Kindernamen gehen nicht an die KI.
   d) Genau eine Hauptaktion („Übung erfassen“, 56 px), Eingabefelder mindestens 48 px, Dialog
      gekennzeichnet; Schließen leert auch den KI-Kasten.
   e) Zu kurzer Text: kein Aufruf, ein Hinweis. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const gesendet = [];
  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    funktionen: { "ki-uebung": () => { return { uebungen: [{ titel: "Slalom der Schatzsucher", kat: "technik", dauer: "10-12 Min",
      spieler: "6-12", feld: "20x12 m", material: "8 Hütchen", beschreibung: "AUFBAU: Vier Hütchen in einer Reihe. ABLAUF: Slalom und Schuss aufs Minitor.",
      variante: "Schwerer: schwächerer Fuß.", coaching: "Ball eng am Fuß!", diff: 1,
      skizze: { h: [[95, 90, "y"], [130, 90, "y"]], s: [[45, 90, "g"]], b: [[53, 97]], tor: [[240, 72, "v", 36]] } }] }; } } }) });
  const r = await s.page.evaluate(async (K) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    try { await loadKader(); } catch (e) {}
    for (let i = 0; i < 40 && typeof tfKiAuswerten !== "function"; i++) await warte(50);
    const out = {};
    const echt = window.fetch; window._kiBodies = [];
    window.fetch = (u, o) => { if (/ki-uebung/.test(String(u))) { try { window._kiBodies.push(JSON.parse(o.body)); } catch (e) {} } return echt(u, o); };
    try { go("formen"); } catch (e) {} await warte(100);
    openAddTraining(); await warte(50);
    const modal = document.getElementById("training-modal");
    const ki = document.getElementById("tf-ki-text"), name = document.getElementById("tf-name");
    out.a = { ki: !!ki, vorName: !!(ki && name && (ki.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING)),
      mic: !!document.getElementById("tf-ki-mic"), los: (document.getElementById("tf-ki-los") || {}).textContent.trim(),
      dialog: modal.getAttribute("role") === "dialog" && modal.getAttribute("aria-modal") === "true" };
    // e) zu kurz
    ki.value = "Slalom"; await tfKiAuswerten(); await warte(30);
    out.e = { hinweis: document.getElementById("tf-ki-stand").textContent };
    // b/c) auswerten
    ki.value = "Vier Hütchen in einer Reihe, " + K[2] + " zeigt es vor, dann dribbeln alle im Slalom und schießen aufs Minitor.";
    await tfKiAuswerten(); await warte(80);
    const v = id => (document.getElementById(id) || {}).value;
    out.b = { name: v("tf-name"), kat: v("tf-kat"), spieler: v("tf-spieler"), feld: v("tf-feld"), dauer: v("tf-dauer"), ablauf: v("tf-ablauf"),
      varianten: v("tf-varianten"), coaching: v("tf-coaching"), diff: v("tf-diff"), skizze: !!(window.TF_SKIZZE && window.TF_SKIZZE.h),
      vorschau: !!document.querySelector("#tf-skizze-vorschau svg"), stand: document.getElementById("tf-ki-stand").textContent };
    // d) Optik
    const hoehe = el => Math.round(el.getBoundingClientRect().height);
    const haupt = [...modal.querySelectorAll(".btn-p")];
    out.d = { haupt: haupt.map(b => b.textContent.trim()), hauptHoch: haupt.map(hoehe),
      felder: [...modal.querySelectorAll(".mg input, .mg select")].map(hoehe) };
    out.bodies = window._kiBodies; window.fetch = echt;
    closeAddTraining(); await warte(20);
    out.d.leer = (document.getElementById("tf-ki-text") || {}).value === "" && v("tf-name") === "";
    return out;
  }, K);
  const fe = s.fehler(); await s.schliessen();
  gesendet.push(...(r.bodies || []));
  if (!r.a.ki || !r.a.vorName || !r.a.mic || r.a.los !== "KI-Auswertung" || !r.a.dialog) probleme.push("a) KI-Kasten oben: " + JSON.stringify(r.a));
  if (gesendet.length !== 1) probleme.push(`e/b) ${gesendet.length} Aufrufe statt genau einem`);
  if (!/mehr/.test(r.e.hinweis)) probleme.push("e) kein Hinweis bei zu kurzem Text: " + r.e.hinweis);
  const b = r.b, g = gesendet[0] || {};
  if (g.modus !== "text") probleme.push("b) modus nicht „text“: " + JSON.stringify(g).slice(0, 100));
  if (b.name !== "Slalom der Schatzsucher" || b.kat !== "technik" || b.spieler !== "6-12" || b.feld !== "20x12 m" || b.dauer !== "10-12" || b.diff !== "1")
    probleme.push("b) Grunddaten: " + JSON.stringify(b).slice(0, 200));
  if (!/Slalom/.test(b.ablauf) || !/Material: 8 Hütchen/.test(b.ablauf) || !/schwächerer Fuß/.test(b.varianten) || !/eng am Fuß/.test(b.coaching)) probleme.push("b) Texte: " + JSON.stringify(b).slice(0, 240));
  if (!b.skizze || !b.vorschau) probleme.push("b) Skizze nicht übernommen oder nicht angezeigt");
  if (!/Eingetragen/.test(b.stand)) probleme.push("b) Rückmeldung fehlt: " + b.stand);
  if (String(g.text || "").includes(K[2])) probleme.push("c) Kindername geht an die KI: " + String(g.text).slice(0, 80));
  if (r.d.haupt.length !== 1 || !/Übung erfassen/.test(r.d.haupt[0]) || r.d.hauptHoch[0] < 56) probleme.push("d) Hauptaktion: " + JSON.stringify(r.d));
  if (r.d.felder.some(x => x < 48)) probleme.push("d) Eingabefelder unter 48 px: " + JSON.stringify(r.d.felder));
  if (!r.d.leer) probleme.push("d) Schließen leert die Maske nicht");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Eingetragen: ${b.name} · ${b.kat} · ${b.spieler} · ${b.feld} · ${b.dauer} Min · Skizze ${b.skizze}`, `an die KI: „${String(g.text || "").slice(0, 70)}“`);
  return h.ergebnis("v639 Eigene Übung: KI-Beschreibung oben füllt alle Felder samt Skizze", !probleme.length, probleme.concat(zeilen));
};
