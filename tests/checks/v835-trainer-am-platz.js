/* v835 · Trainer am Platz (Bestandsaufnahme November 2026, Paket 2, und Charles' Entscheidung vom 17.11. zur Gruppenzahl).
   a) Live-Ansicht nach „Trainingsstart“: an jeder Übung, die die App kennt, steht „Skizze und Ablauf“ (≥ 44 px);
      der Tipp öffnet die Übungsansicht ÜBER der Live-Ansicht. Ohne bekannte Übung („(frei)“) kein Knopf.
   b) Vorlage übernehmen: Die Vorschau steht direkt unter der gewählten Karte, der Hauptknopf klebt unten im Bild –
      vorher standen beide unter der ganzen Liste. Der Leertext verweist nicht mehr auf „Vorlagen importieren“.
   c) Startseite „Diese Woche“: Der Knopf am nächsten Spiel heißt „Zum Spieltag“ und ruft spieltagZuTermin –
      vorher „Matchday“ und ein Sprung in „Nach dem Spiel“.
   e) Wochenkarte der Startseite: Knopf „Termin“ (≥ 44 px) öffnet die Termine-Seite mit offenem Formular.
   d) Unter acht Kindern eine Gruppe, auch bei zwei oder drei Trainern; ab acht wie bisher. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v835 Trainer am Platz: Skizze in der Live-Ansicht, Vorlage mit festem Knopf, „Zum Spieltag“, eine Gruppe unter acht Kindern";
  const probleme = [], zeilen = [];
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8")).uebungen.map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const vor = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/vorlagen.json"), "utf8")).vorlagen.map((v, i) => ({ ...v, id: 500 + i }));
  const d1 = h.tagePlus(1), d2 = h.tagePlus(3);
  const termine = [{ id: 1, datum: d1, uhrzeit: "10:00", typ: "spiel", titel: "Spielfest", trainer_status: { Charles: "ja" } },
    { id: 2, datum: d2, uhrzeit: "16:45", typ: "training", trainer_status: { Charles: "ja", Kenneth: "ja" } }];
  const s = await h.starten({ warten: 2000, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, trainingsformen: bib, trainingsvorlagen: vor }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async ({ d2 }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof tlUebungZeigen !== "function") return { alt: true };
    const out = {};
    await loadKader();
    // c) Startseite
    go("home"); await w(1500);
    /* v937: Unter der Kachel stehen keine Knöpfe mehr. Die Kachel des nächsten Spiels ist selbst der Weg zum Spieltag
       (wocheOpen → spieltagZuTermin); „Neuer Termin“ steht unter Orga (#orga-termin-neu). */
    out.matchday = /Matchday/.test(document.getElementById("home-woche").textContent);
    const sk = [...document.querySelectorAll("#home-termine .termin-kachel")].find(k => /wocheOpen\(\d+,'[^']+','(spiel|turnier)'\)/.test(k.getAttribute("onclick") || ""));
    out.zumSpieltag = sk ? { t: "Kachel", oc: (String(wocheOpen).match(/spieltagZuTermin\(datum\)/) || [""])[0] } : null;
    go("ue-orga"); await w(1500);
    out.terminKnopf = (() => { const b = document.getElementById("orga-termin-neu"); return b ? Math.round(b.getBoundingClientRect().height) : 0; })();
    homeTerminNeu(); await w(900);
    out.formularOffen = (document.getElementById("tm-karte") || { style: { display: "none" } }).style.display !== "none" && (document.getElementById("tm-neu-toggle") || {}).getAttribute?.("aria-expanded") === "true";
    // d) Gruppenzahl
    out.gruppen = [[6, 0], [7, 2], [8, 2], [12, 2]].map(([k, st]) => k + "→" + tgBedarf(k, st)).join(" ");
    // b) Vorlage übernehmen
    go("planung"); await w(1200);
    const feld = document.getElementById("tp-date"); if (![...feld.options].some(o => o.value === d2)) feld.add(new Option(d2, d2)); feld.value = d2;
    await vorlageUebernehmenOpen(); await w(800);
    vuFilterSet("leitfrage", VORLAGEN[8].leitfrage); await w(300);
    const karten = [...document.querySelectorAll('#vu-inhalt button[onclick^="vuWaehlen"]')];
    karten[1].scrollIntoView({ block: "start" }); karten[1].click(); await w(300);
    const gew = document.querySelector('#vu-inhalt button[aria-pressed="true"][onclick^="vuWaehlen"]');
    const vs = document.getElementById("vu-vorschau"), haupt = document.getElementById("vu-haupt");
    out.vu = { karten: karten.length, direktDarunter: !!(gew && vs && gew.nextElementSibling === vs),
      hauptUnten: Math.round(haupt.getBoundingClientRect().bottom), hauptOben: Math.round(haupt.getBoundingClientRect().top), fenster: window.innerHeight,
      hauptHoehe: Math.round(haupt.getBoundingClientRect().height), aktiv: !haupt.disabled, vorschauen: document.querySelectorAll("#vu-vorschau").length };
    vorlageUebernehmenClose();
    // a) Live-Ansicht
    const name = "Technik-Parcours – acht Stationen, freie Wahl, Laufzettel";
    const ov = document.createElement("div"); ov.id = "tl-ov"; ov.style.cssText = "position:fixed;inset:0;background:#0b1220;color:#fff;z-index:11000;overflow-y:auto;padding:18px"; document.body.appendChild(ov);
    _tl.row = { status: "laeuft", slot: 0, slot_start: new Date(Date.now() - 20000).toISOString(), fertig: {}, bereit: {},
      plan: { slots: [{ label: "Hauptteil", dauer: 12, gruppen: [{ trainer: "Alle", uebung: name, gruppe: null, kinder: null }, { trainer: "Alle", uebung: "(frei)", gruppe: null, kinder: null }] }] } };
    _tlRender(); await w(100);
    const kn2 = [...ov.querySelectorAll("button")].filter(b => /Skizze und Ablauf/.test(b.textContent));
    out.live = { knoepfe: kn2.length, hoehe: kn2[0] ? Math.round(kn2[0].getBoundingClientRect().height) : 0 };
    if (kn2[0]) { kn2[0].click(); await w(300); }
    const m = document.getElementById("uebung-modal");
    out.live.offen = !!m; out.live.titel = m ? (m.querySelector("#uebung-modal-titel") || {}).textContent : ""; out.live.z = m ? Number(m.style.zIndex) : 0;
    out.live.skizze = !!(m && m.querySelector("svg"));
    if (m) m.remove(); ov.remove(); _tl.row = null;
    return out;
  }, { d2 }).catch(e => ({ fehler: String(e) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["tlUebungZeigen fehlt (Stand vor v835)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (r.live.knoepfe !== 1) probleme.push(`a) ${r.live.knoepfe} Knöpfe „Skizze und Ablauf“ statt 1 (bekannte Übung ja, „(frei)“ nein)`);
  else if (r.live.hoehe < 44) probleme.push(`a) Knopf nur ${r.live.hoehe} px hoch`);
  else if (!r.live.offen || !/^Technik-Parcours/.test(r.live.titel)) probleme.push("a) Übungsansicht öffnet nicht: " + r.live.titel);
  else if (r.live.z <= 11000) probleme.push("a) Übungsansicht liegt unter der Live-Ansicht (z-index " + r.live.z + ")");
  else if (!r.live.skizze) probleme.push("a) Übungsansicht ohne Skizze");
  else zeilen.push(`a) Live-Ansicht: „Skizze und Ablauf“ ${r.live.hoehe} px, öffnet „${r.live.titel.slice(0, 16)}…“ über der Live-Ansicht`);
  if (!r.vu.direktDarunter || r.vu.vorschauen !== 1) probleme.push(`b) Vorschau steht nicht direkt unter der gewählten Karte (${r.vu.vorschauen} Vorschauen)`);
  else if (r.vu.hauptUnten > r.vu.fenster || r.vu.hauptOben < r.vu.fenster - 160) probleme.push(`b) Hauptknopf nicht unten im Bild: ${r.vu.hauptOben}–${r.vu.hauptUnten} von ${r.vu.fenster}`);
  else if (r.vu.hauptHoehe < 56 || !r.vu.aktiv) probleme.push(`b) Hauptknopf ${r.vu.hauptHoehe} px, aktiv ${r.vu.aktiv}`);
  else zeilen.push(`b) Vorlage übernehmen: Vorschau unter der Karte, Hauptknopf ${r.vu.hauptHoehe} px unten im Bild (${r.vu.hauptOben}–${r.vu.hauptUnten} von ${r.vu.fenster})`);
  if (/über „Vorlagen importieren“/.test(fs.readFileSync(path.join(h.REPO, "md-einheit-import.js"), "utf8").split("function vorlageUebernehmenRender")[1].split("\nfunction ")[0])) probleme.push("b) Leertext verweist weiter auf „Vorlagen importieren“");
  if (r.matchday || !r.zumSpieltag || !/^spieltagZuTermin\(/.test(r.zumSpieltag.oc)) probleme.push("c) Knopf am nächsten Spiel: " + JSON.stringify(r.zumSpieltag) + (r.matchday ? " · „Matchday“ steht noch da" : ""));
  else zeilen.push("c) Startseite: „Zum Spieltag“ → spieltagZuTermin");
  if (r.terminKnopf < 44 || !r.formularOffen) probleme.push(`e) „Neuer Termin“ unter Orga: ${r.terminKnopf} px, Formular offen ${r.formularOffen}`);
  else zeilen.push("e) Wochenkarte: „Termin“ öffnet die Termine-Seite mit offenem Formular");
  if (r.gruppen !== "6→1 7→1 8→2 12→2") probleme.push("d) Gruppenzahl (zwei Trainer): " + r.gruppen);
  else zeilen.push("d) Gruppen bei zwei Trainern: " + r.gruppen);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
