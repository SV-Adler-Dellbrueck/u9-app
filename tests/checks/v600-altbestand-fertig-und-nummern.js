/* v600 · Der Altbestand ist abgearbeitet – und die Abfolgenummer steht nicht mehr im Kind

   a) Die letzten SECHZEHN handgezeichneten Skizzen sind Specs: Passspiel, Wahrnehmung,
      Technik. Dieselben drei Fehler wie in v549, v597 und v599 — Name im Bild,
      halbdurchsichtiger Text, Pfeile ohne Legendenfarbe — und dazu einer, den es nur
      hier gab: Das „Ansage-Passspiel" trug drei Vornamen als Beispiel im Bild. Das Repo
      ist öffentlich; an ihrer Stelle stehen jetzt A, B und C.

   b) Die Sperrklinke steht auf NULL: 37 → 26 → 16 → 0. Keine mitgelieferte Übung trägt
      das Muster mehr. Diese Klinke ist die letzte der Reihe — sie darf nie wieder steigen.

   c) Ein Befund aus der Arbeit an a), der älter ist als dieses Paket: Die Abfolgenummer
      am Pfeil (v579) sitzt sieben Pixel VOR dessen Anfang. Ein Pass beginnt aber fast
      immer am Fuß eines Kindes, und der Spielerkreis hat Radius acht — die Nummer landete
      also IM Kind und legte sich über dessen Kürzel. In „Dreieck mit Torwart" und
      „Doppelpass zum Abschluss" (beide seit v597 im Bestand) waren TW, A und V1 nicht mehr
      zu lesen; niemand hat es gemerkt, weil keine Prüfung danach sah.

      Gemessen wird deshalb für JEDE Spec mit Nummern, dass kein Nummernkreis einen
      Spielerkreis berührt — und zur Gegenprobe, dass die naive Position (ohne das
      Ausweichen aus v600) das sehr wohl täte. Sonst bewiese die Prüfung nur, dass es
      gerade keine Nummern gibt.

   d) Nichts überlagert sich: gemessen am gerenderten DOM, nicht an den Koordinaten —
      Text gegen Bildrand, Text gegen Kind (samt Ball am Fuß), Text gegen Text. Die
      Rechnung auf dem Papier hatte bei „Ball-Staffel Paare" und „Raumaufteilung-Quiz"
      zwei Beschriftungen als drinnen gezählt, deren Unterlänge über den Rand ragte. */
"use strict";

const GEZOGEN = ["tf014", "tf017", "tf018", "tf019", "tf021", "tf022", "tf024", "tf025",
                 "tf026", "tf027", "tf028", "tf029", "tf030", "tf031", "tf033", "tf036"];

/* Spieler der handgezeichneten Fassung (Kreise mit r 8 oder 9). Vor dem Zug ausgezählt;
   „Schwacher-Fuß-Tag" zeigte gar kein Kind, nur einen Schuh und eine Linie. */
const VORHER_SPIELER = { tf014: 2, tf017: 2, tf018: 3, tf019: 2, tf021: 2, tf022: 4,
                         tf024: 1, tf025: 7, tf026: 3, tf027: 8, tf028: 1, tf029: 4,
                         tf030: 4, tf031: 8, tf033: 2, tf036: 0 };

/* Die drei Vornamen, die im „Ansage-Passspiel" standen. Sie dürfen in KEINER Zeichnung
   mehr vorkommen — auch nicht in einer anderen. */
const VORNAMEN = ["Max", "Leo", "Tim"];

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(({ GEZOGEN, VORHER_SPIELER, VORNAMEN }) => {
    const farben = Object.values(SKZ_PFEIL);
    const nameImBild = (name, texte) => texte.some(t =>
      t && t.length >= 6 && (name.startsWith(t.slice(0, 12)) || t.startsWith(name.slice(0, 12))));

    /* d) am gerenderten DOM messen: ein Halter in der Seite, Maße auf 280 zurückgerechnet. */
    const halter = document.createElement("div");
    halter.style.cssText = "position:absolute;left:0;top:0;width:280px;visibility:hidden";
    document.body.appendChild(halter);
    const textKaesten = svgText => {
      halter.innerHTML = svgText;
      const svg = halter.querySelector("svg"), basis = svg.getBoundingClientRect();
      const skal = (svg.viewBox.baseVal.width || 280) / (basis.width || 1);
      return [...svg.querySelectorAll("text")].map(t => {
        const b = t.getBoundingClientRect();
        return { t: t.textContent,
          x1: (b.left - basis.left) * skal, y1: (b.top - basis.top) * skal,
          x2: (b.right - basis.left) * skal, y2: (b.bottom - basis.top) * skal };
      });
    };

    const aus = GEZOGEN.map(id => {
      const f = TRAININGSFORMEN.find(x => x.id === id);
      const spec = TF_SKIZZEN[id];
      if (!f || !spec) return { id, fehlt: true, ohneSpec: !spec, ohneUebung: !f };
      const svg = _skz(spec);
      const texte = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);

      const kaesten = textKaesten(svg);
      const ueber = [];
      kaesten.forEach(t => { if (t.x1 < 3 || t.x2 > SKZ_QUER_B - 3 || t.y1 < 3 || t.y2 > SKZ_QUER_H - 3)
        ueber.push("„" + t.t + "“ am Rand"); });
      (spec.s || []).forEach(p => {
        const mitBall = p[4] === "b";
        const kx1 = p[0] - 9, kx2 = p[0] + (mitBall ? 12 : 9);
        const ky1 = p[1] - 9, ky2 = p[1] + (mitBall ? 12 : 9);
        kaesten.forEach(t => {
          if (t.t === p[3]) return;                       // das eigene Kürzel gehört dorthin
          if (t.x1 < kx2 && t.x2 > kx1 && t.y1 < ky2 && t.y2 > ky1)
            ueber.push("„" + t.t + "“ auf dem Kind " + p[0] + "/" + p[1]);
        });
      });
      for (let i = 0; i < kaesten.length; i++) for (let j = i + 1; j < kaesten.length; j++) {
        const a = kaesten[i], b = kaesten[j];
        if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1)
          ueber.push("„" + a.t + "“ und „" + b.t + "“");
      }

      return {
        id, name: f.name,
        ausSpec: (f.svg || "") === svg,
        nameImBild: nameImBild(f.name, texte),
        halb: /fill="rgba\(255,255,255,\.[1-5]\)"/.test(svg),
        svgs: (svg.match(/<svg/g) || []).length,
        pfeile: (spec.p || []).length,
        legendenfarbe: farben.some(c => svg.includes(c)),
        spieler: (spec.s || []).length,
        soll: VORHER_SPIELER[id],
        mitBall: (spec.s || []).filter(p => p[4] === "b").length,
        texte: texte.length,
        ueber
      };
    });

    // a) Vornamen – in JEDER mitgelieferten Zeichnung, nicht nur in den sechzehn
    const mitVorname = [];
    TRAININGSFORMEN.forEach(f => {
      if (!f.svg) return;
      const texte = [...f.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].trim());
      const treffer = VORNAMEN.filter(v => texte.includes(v));
      if (treffer.length) mitVorname.push(f.name + ": " + treffer.join(", "));
    });

    // b) Sperrklinke
    let rest = 0;
    TRAININGSFORMEN.forEach(f => {
      if (!f.svg || TF_SKIZZEN[f.id]) return;
      const texte = [...f.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
      const linien = (f.svg.match(/<line/g) || []).length;
      const lf = farben.some(c => f.svg.includes(c));
      if (nameImBild(f.name, texte) || (f.svg.match(/<svg/g) || []).length > 1
          || /fill="rgba\(255,255,255,\.[1-5]\)"/.test(f.svg) || (linien && !lf)) rest++;
    });

    /* c) Abfolgenummern über ALLE Specs: wo sitzen sie wirklich, und wo säßen sie ohne
       das Ausweichen? Die gezeichnete Lage wird aus dem SVG gelesen (Kreis r 5.5), die
       naive aus derselben Formel wie vor v600. */
    const nrJetzt = [], nrNaiv = [];
    let nummern = 0;
    Object.keys(TF_SKIZZEN).forEach(id => {
      const spec = TF_SKIZZEN[id];
      const mitNr = (spec.p || []).filter(p => isFinite(Number(p[5])) && Number(p[5]) >= 1);
      if (!mitNr.length) return;
      nummern += mitNr.length;
      mitNr.forEach(p => {
        const dx = p[2] - p[0], dy = p[3] - p[1], len = Math.hypot(dx, dy) || 1;
        const nx = p[0] - dx / len * 7, ny = p[1] - dy / len * 7;
        (spec.s || []).forEach(sp => {
          if (Math.hypot(nx - sp[0], ny - sp[1]) < 13.5) nrNaiv.push(id + " Nr. " + p[5]);
        });
      });
      const svg = _skz(spec);
      const halter2 = document.createElement("div");
      halter2.innerHTML = svg;
      [...halter2.querySelectorAll('circle[r="5.5"]')].forEach(c => {
        const x = +c.getAttribute("cx"), y = +c.getAttribute("cy");
        (spec.s || []).forEach(sp => {
          if (Math.hypot(x - sp[0], y - sp[1]) < 13.5) nrJetzt.push(id + " bei " + x + "/" + y);
        });
      });
    });

    halter.remove();
    return { aus, mitVorname, rest, gesamt: TRAININGSFORMEN.length, nummern, nrJetzt, nrNaiv,
             specs: Object.keys(TF_SKIZZEN).length, breite: SKZ_QUER_B, hoehe: SKZ_QUER_H };
  }, { GEZOGEN, VORHER_SPIELER, VORNAMEN });

  const fehlt = r.aus.filter(x => x.fehlt);
  if (fehlt.length) probleme.push("a) Ohne Spec oder ohne Übung: " + fehlt.map(x => x.id).join(", "));
  const da = r.aus.filter(x => !x.fehlt);

  const alt = da.filter(x => !x.ausSpec).map(x => x.id);
  if (alt.length) probleme.push("a) Die Zeichnung stammt nicht aus der Spec: " + alt.join(", "));
  const mitName = da.filter(x => x.nameImBild).map(x => x.name);
  if (mitName.length) probleme.push("a) Der Übungsname steht im Bild: " + mitName.join(", "));
  const halb = da.filter(x => x.halb).map(x => x.name);
  if (halb.length) probleme.push("a) Halbdurchsichtiger Text auf dem Rasen: " + halb.join(", "));
  const doppelt = da.filter(x => x.svgs !== 1).map(x => `${x.name} (${x.svgs})`);
  if (doppelt.length) probleme.push("a) Nicht genau ein <svg>: " + doppelt.join(", "));
  const stumm = da.filter(x => x.pfeile && !x.legendenfarbe).map(x => x.name);
  if (stumm.length) probleme.push("a) Pfeile ohne Legendenfarbe: " + stumm.join(", "));
  const duenn = da.filter(x => x.spieler < x.soll).map(x => `${x.name} (${x.spieler} statt ${x.soll})`);
  if (duenn.length) probleme.push("a) Zeigt weniger Kinder als die handgezeichnete Fassung: " + duenn.join(", "));
  const ohneText = da.filter(x => !x.texte).map(x => x.name);
  if (ohneText.length) probleme.push("a) Ohne jede Beschriftung: " + ohneText.join(", "));
  if (r.mitVorname.length) probleme.push("a) Vornamen im Bild – das Repo ist öffentlich: " + r.mitVorname.join(" | "));

  if (r.rest > 0) probleme.push(`b) Altbestand nicht leer: ${r.rest} handgezeichnete Skizzen tragen das Muster noch`);

  if (!r.nummern) probleme.push("c) Keine Spec mit Abfolgenummer gefunden – prüft der Fall noch, was er soll?");
  if (r.nrJetzt.length) probleme.push("c) Abfolgenummer sitzt im Spielerkreis und verdeckt sein Kürzel: " + r.nrJetzt.join(", "));
  if (!r.nrNaiv.length) probleme.push("c) Gegenprobe leer: ohne das Ausweichen gäbe es keine Kollision – die Prüfung belegt nichts");

  const kollision = da.filter(x => x.ueber.length).map(x => `${x.name}: ${x.ueber.join(" · ")}`);
  if (kollision.length) probleme.push("d) Überlagert oder ragt raus: " + kollision.join(" | "));

  if (!probleme.length) {
    zeilen.push(`a) ${da.length} Übungen aus Specs · kein Name und kein Vorname im Bild · ${da.reduce((n, x) => n + x.pfeile, 0)} Pfeile in den Legendenfarben`);
    zeilen.push(`a) Kinder vollzählig (${da.map(x => x.spieler).join("·")} gegen vorher ${da.map(x => x.soll).join("·")}), ${da.reduce((n, x) => n + x.mitBall, 0)} davon mit Ball am Fuß`);
    zeilen.push(`b) Altbestand leer: ${r.rest} von ${r.gesamt} handgezeichnet mit dem Muster (37 → 26 → 16 → 0), ${r.specs} Specs`);
    zeilen.push(`c) ${r.nummern} Abfolgenummern, keine im Kind – ohne das Ausweichen wären es ${r.nrNaiv.length}`);
    zeilen.push(`d) Am gerenderten DOM: nichts überlagert sich, nichts ragt über ${r.breite} × ${r.hoehe}`);
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f.join(" | "));
  await s.schliessen();
  return h.ergebnis("Altbestand Etappe 3 und die Abfolgenummern", !probleme.length, probleme.length ? probleme : zeilen);
};
