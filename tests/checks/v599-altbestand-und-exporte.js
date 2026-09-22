/* v599 · Zweite Etappe des Altbestands, und die exportierten Bilder werden alle geprüft

   a) Zehn weitere Übungen aus Specs — Pressing und Abschluss (tf039–tf050). Dieselben drei
      Fehler wie in v549 und v597: Name im Bild, halbdurchsichtiger Text, Pfeile ohne
      Legendenfarbe. Neu ist, dass „Spieler + Ball" (v598) hier trägt: Wo die Übung „der
      Ballführende" meint, sitzt der Ball am Kind statt daneben.

   b) Die Sperrklinke steht auf sechzehn — von 37 über 26 auf 16.

   c) ALLE exportierten Bilder unter `doku/` zeigen die Zeichnung, die die App heute
      erzeugt. Bis v598 prüfte das nur `v554`, und nur für das Paket LF4: Als der Ball von
      Weiß auf Schwarz wechselte, blieb `doku/auftrag-lehrgangsskizzen/` unbemerkt auf dem
      alten Stand, weil dieses Paket keine eigene Prüfung hatte. Gemessen wird deshalb
      jede `.svg` im Ordner gegen die Zeichnungen aller Bibliotheks-Übungen (alle Bilder,
      beide Zuschnitte): passt eine Datei zu keiner, ist sie veraltet — der Export gehört
      dann neu gestartet, nicht die Prüfung angepasst.

      Zu jeder `.svg` muss auch die `.png` daneben liegen; das PNG entsteht aus genau
      dieser SVG, ein fehlendes verrät einen abgebrochenen Lauf. */
"use strict";

const GEZOGEN = ["tf039", "tf041", "tf042", "tf043", "tf044", "tf046", "tf047", "tf048",
                 "tf049", "tf050"];

/* Spieler der handgezeichneten Fassung (Kreise mit r 8 oder 9, ohne Ball und ohne die
   gestrichelten Markierungsringe). Vor dem Zug aus data.js ausgezählt. */
const VORHER_SPIELER = { tf039: 5, tf041: 1, tf042: 2, tf043: 3, tf044: 2, tf046: 6,
                         tf047: 8, tf048: 6, tf049: 6, tf050: 7 };

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  // ── a) + b) Die zehn Übungen und die Sperrklinke ────────────────────────────
  const r = await s.page.evaluate(({ GEZOGEN, VORHER_SPIELER }) => {
    const farben = Object.values(SKZ_PFEIL);
    const nameImBild = (name, texte) => texte.some(t =>
      t && t.length >= 6 && (name.startsWith(t.slice(0, 12)) || t.startsWith(name.slice(0, 12))));

    const aus = GEZOGEN.map(id => {
      const f = TRAININGSFORMEN.find(x => x.id === id);
      const spec = TF_SKIZZEN[id];
      if (!f || !spec) return { id, fehlt: true };
      const svg = _skz(spec);
      const texte = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
      const raus = [];
      (spec.s || []).forEach(p => { if (p[0] - 8 < 0 || p[0] + 8 > SKZ_QUER_B || p[1] - 8 < 0 || p[1] + 8 > SKZ_QUER_H) raus.push("Spieler " + p[0] + "/" + p[1]); });
      (spec.b || []).forEach(p => { if (p[0] - 4 < 0 || p[0] + 4 > SKZ_QUER_B || p[1] - 4 < 0 || p[1] + 4 > SKZ_QUER_H) raus.push("Ball " + p[0] + "/" + p[1]); });
      (spec.tx || []).forEach(t => { if (t[1] < 8 || t[1] > SKZ_QUER_H - 2) raus.push("Text „" + t[2] + "“ auf y=" + t[1]); });
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
        baelle: (skzMaterial(spec).find(m => m.schluessel === "ball") || {}).anzahl || 0,
        texte: texte.length,
        raus
      };
    });

    let rest = 0;
    TRAININGSFORMEN.forEach(f => {
      if (!f.svg || TF_SKIZZEN[f.id]) return;
      const texte = [...f.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
      const linien = (f.svg.match(/<line/g) || []).length;
      const lf = farben.some(c => f.svg.includes(c));
      if (nameImBild(f.name, texte) || (f.svg.match(/<svg/g) || []).length > 1
          || /fill="rgba\(255,255,255,\.[1-5]\)"/.test(f.svg) || (linien && !lf)) rest++;
    });
    return { aus, rest, gesamt: TRAININGSFORMEN.length, breite: SKZ_QUER_B, hoehe: SKZ_QUER_H };
  }, { GEZOGEN, VORHER_SPIELER });

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
  if (duenn.length) probleme.push("a) Zeigt weniger Spieler als die handgezeichnete Fassung: " + duenn.join(", "));
  const ueber = da.filter(x => x.raus.length).map(x => `${x.name}: ${x.raus.join(" · ")}`);
  if (ueber.length) probleme.push("a) Ragt über den Bildrand: " + ueber.join(" | "));

  /* „Fangspiel mit Ball“ heißt so, weil jedes Kind einen hat – sechs Dribbler, sechs Bälle.
     Die Materialzeile muss sie zählen, sonst steht die Übung mit null Bällen im Schrank. */
  const fang = da.find(x => x.id === "tf047");
  if (fang && (fang.mitBall !== 6 || fang.baelle !== 6))
    probleme.push(`a) „Fangspiel mit Ball“: ${fang.mitBall} Spieler mit Ball, Material zählt ${fang.baelle} – erwartet 6 und 6`);

  if (r.rest > 16) probleme.push(`b) Altbestand gewachsen: ${r.rest} handgezeichnete Skizzen mit dem Muster, erlaubt sind 16`);

  // ── c) Jede exportierte Zeichnung im Repo ist die von heute ─────────────────
  const ordner = path.join(h.REPO, "doku");
  const dateien = [];
  (function sammeln(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) sammeln(p);
      else if (e.name.endsWith(".svg")) dateien.push(p);
    }
  })(ordner);

  /* Alle Zeichnungen, die die App heute aus der Bibliothek erzeugt – jedes Bild einzeln,
     denn die Exporte legen je Bild eine Datei an. */
  const bib = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8"));
  const heutige = await s.page.evaluate(specs => {
    const raus = [];
    specs.forEach(spec => {
      const n = (typeof skzBildZahl === "function") ? skzBildZahl(spec) : 1;
      for (let i = 0; i < n; i++) {
        const halter = document.createElement("div");
        halter.innerHTML = _skz(spec, { bild: i });
        raus.push(halter.querySelector("svg").innerHTML);
      }
    });
    return raus;
  }, (bib.uebungen || []).filter(u => u.skizze).map(u => u.skizze));

  const veraltet = [], ohnePng = [];
  dateien.forEach(p => {
    const inhalt = fs.readFileSync(p, "utf8");
    if (!heutige.some(z => inhalt.includes(z))) veraltet.push(path.relative(h.REPO, p));
    if (!fs.existsSync(p.replace(/\.svg$/, ".png"))) ohnePng.push(path.relative(h.REPO, p));
  });
  if (!dateien.length) probleme.push("c) Keine exportierte Zeichnung unter doku/ gefunden – sucht die Prüfung am falschen Ort?");
  if (veraltet.length) probleme.push("c) Zeigt nicht die Zeichnung von heute – Export neu laufen lassen: " + veraltet.join(", "));
  if (ohnePng.length) probleme.push("c) SVG ohne PNG daneben: " + ohnePng.join(", "));

  if (!probleme.length) {
    zeilen.push(`a) ${da.length} Übungen aus Specs: kein Name im Bild, kein halbdurchsichtiger Text, ${da.reduce((n, x) => n + x.pfeile, 0)} Pfeile in den Legendenfarben, nichts über dem Rand (${r.breite} × ${r.hoehe})`);
    zeilen.push(`a) Spieler vollzählig (${da.map(x => x.spieler).join("·")} gegen vorher ${da.map(x => x.soll).join("·")}), ${da.reduce((n, x) => n + x.mitBall, 0)} davon mit Ball am Fuß`);
    zeilen.push(`b) Altbestand: noch ${r.rest} von ${r.gesamt} handgezeichnet mit dem Muster (37 → 26 → ${r.rest})`);
    zeilen.push(`c) ${dateien.length} exportierte Zeichnungen unter doku/, alle auf dem Stand von heute, jede mit PNG`);
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f.join(" | "));
  await s.schliessen();
  return h.ergebnis("Altbestand Etappe 2 und die exportierten Bilder", !probleme.length, probleme.length ? probleme : zeilen);
};
