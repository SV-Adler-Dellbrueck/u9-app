/* v595 · Zwei Befunde des PO vom 21.09.2026
   a) „Einige Übungen geben keinen Hinweis, wie viele aktiv sind und wie viele
      Auswechselspieler." Gemessen: bis v594 verlangte die Regel das Wort „je Station",
      und das schreiben nur die 19 Bibliotheks-Übungen. Die 107 mitgelieferten schreiben
      eine Spanne („6–10"), also schwieg der Hinweis bei 107 von 140.
      Jetzt gilt eine Spanne als Stationsbedarf – aber NUR sie: Gesamtangaben wie
      „12 (3 Felder à 4)" bleiben stumm, weil ihre führende Zahl alle Kinder meint.
   b) „Das Warmup Straßenfußball-Fenster braucht keine Auswahl an Übungen."
   Gemessen wird gegen die echten Daten aus data.js, nicht gegen erfundene Beispiele. */
"use strict";

module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({
    start: "/trainer/index.html", warten: 1200,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), trainingsformen: [], termine: [] })
  });

  // ── a) Die Spannen-Regel gegen den echten Bestand ───────────────────────────
  {
    const r = await s.page.evaluate(() => {
      const idx = name => TRAININGSFORMEN.findIndex(u => u.name === name);
      const sp = name => { const i = idx(name); return i < 0 ? null : tpUebungSpanne(i); };
      let stumm = 0, mitZahl = 0, alle = 0;
      TRAININGSFORMEN.forEach((u, i) => {
        const x = tpUebungSpanne(i);
        if (x.alle) alle++; else if (x.min) mitZahl++; else stumm++;
      });
      return {
        gesamt: TRAININGSFORMEN.length, stumm, mitZahl, alle,
        quer: sp("Quer vor Tor"),            // „6–10“ – die Übung aus dem Befund
        hai: sp("Hai & Fische"),             // „8-13“ mit einfachem Bindestrich
        noch: sp("Die Kraft des NOCH"),      // „beliebig“
        paare: sp("Spiegeldribbling"),       // „Paare“
        raute: sp("4+1 Lebende Raute"),      // feste Zahl „10“
        // Gegenprobe: die Bibliotheksform muss unverändert bleiben
        bibForm: (() => { const i = TRAININGSFORMEN.findIndex(u => /je (Station|Feld)/i.test(String(u.spieler || ""))); return i < 0 ? null : tpUebungSpanne(i); })()
      };
    });
    zeilen.push(`a) ${r.gesamt} mitgelieferte Übungen: ${r.mitZahl} mit Zahl · ${r.alle} „alle spielen mit“ · ${r.stumm} weiterhin stumm`);
    if (r.stumm !== 0) probleme.push(`a) ${r.stumm} Übungen liefern weiterhin keine Angabe`);
    if (!r.quer || r.quer.min !== 6 || r.quer.max !== 10) probleme.push("a) „Quer vor Tor“ (6–10) ergibt " + JSON.stringify(r.quer));
    if (!r.hai || r.hai.min !== 8 || r.hai.max !== 13) probleme.push("a) „Hai & Fische“ (8-13, einfacher Bindestrich) ergibt " + JSON.stringify(r.hai));
    if (!r.noch || r.noch.alle !== true) probleme.push("a) „beliebig“ ergibt keine Alle-Angabe: " + JSON.stringify(r.noch));
    if (!r.paare || r.paare.alle !== true) probleme.push("a) „Paare“ ergibt keine Alle-Angabe: " + JSON.stringify(r.paare));
    if (!r.raute || r.raute.min !== 10 || r.raute.max !== 10) probleme.push("a) feste Zahl „10“ ergibt " + JSON.stringify(r.raute));
  }

  // ── b) Gesamtangaben bleiben stumm, „je Feld“ schlägt sie ───────────────────
  {
    const r = await s.page.evaluate(() => {
      // Zwei erfundene Einträge ans Ende hängen und wieder entfernen – so misst der
      // Fall genau die Muster, um die es geht, ohne den Bestand zu verändern.
      const vorher = TRAININGSFORMEN.length;
      TRAININGSFORMEN.push({ id: "zz1", name: "ZZ Gesamtangabe", spieler: "12 (3 Felder à 4)" });
      TRAININGSFORMEN.push({ id: "zz2", name: "ZZ je Feld mit Gesamt", spieler: "6 je Feld (12 = 2 Felder)" });
      TRAININGSFORMEN.push({ id: "zz3", name: "ZZ mit Wartenden", spieler: "6 je Station (4 spielen, 2 warten)" });
      const a = tpUebungSpanne(vorher), b = tpUebungSpanne(vorher + 1), c = tpUebungSpanne(vorher + 2);
      TRAININGSFORMEN.length = vorher;
      return { a, b, c, wiederhergestellt: TRAININGSFORMEN.length === vorher };
    });
    zeilen.push(`b) „12 (3 Felder à 4)“ → ${r.a.min ? r.a.min : "stumm"} · „6 je Feld (12 = 2 Felder)“ → ${r.b.min} · Wartende abgezogen → ${r.c.min}`);
    if (r.a.min !== 0) probleme.push(`b) Gesamtangabe „12 (3 Felder à 4)“ wird als ${r.a.min} je Station gelesen`);
    if (r.b.min !== 6) probleme.push(`b) „6 je Feld (12 = 2 Felder)“ ergibt ${r.b.min} statt 6 – „je Feld“ muss vor der Gesamtangabe greifen`);
    if (r.c.min !== 4) probleme.push(`b) Wartende werden nicht abgezogen: ${r.c.min} statt 4`);
    if (!r.wiederhergestellt) probleme.push("b) der Prüffall hat den Bestand verändert");
  }

  // ── c) Das Straßenfußball-Fenster hat keine Übungsauswahl ───────────────────
  {
    const r = await s.page.evaluate(() => ({
      frei: typeof tpFreiesFenster === "function" ? tpFreiesFenster({ label: "Straßenfußball-Fenster" }) : null,
      freiSS: typeof tpFreiesFenster === "function" ? tpFreiesFenster({ label: "Strassenfussball-Fenster" }) : null,
      warm: typeof tpFreiesFenster === "function" ? tpFreiesFenster({ label: "Warm up Adler, kurz" }) : null,
      haupt: typeof tpFreiesFenster === "function" ? tpFreiesFenster({ label: "Hauptteil 1 – Spielform" }) : null,
      leer: typeof tpFreiesFenster === "function" ? tpFreiesFenster({}) : null
    }));
    zeilen.push(`c) freies Fenster erkannt: Straßenfußball ${r.frei} · ohne Umlaut ${r.freiSS} · Warm up ${r.warm} · Hauptteil ${r.haupt}`);
    if (r.frei !== true) probleme.push("c) „Straßenfußball-Fenster“ wird nicht als freies Fenster erkannt");
    if (r.freiSS !== true) probleme.push("c) die Schreibweise ohne ß wird nicht erkannt");
    if (r.warm !== false) probleme.push("c) „Warm up Adler“ gilt fälschlich als freies Fenster – dort gehört eine Übung hin");
    if (r.haupt !== false) probleme.push("c) ein Hauptteil gilt fälschlich als freies Fenster");
    if (r.leer !== false) probleme.push("c) ein Block ohne Namen gilt als freies Fenster");
  }

  // ── d) Am gerenderten Plan: kein Auswahlknopf im freien Fenster ──────────────
  {
    const r = await s.page.evaluate(async () => {
      tpSlots = [
        { typ: "warmup", label: "Straßenfußball-Fenster", dauer: 10 },
        { typ: "warmup", label: "Warm up Adler, kurz", dauer: 8 },
        { typ: "main", label: "Hauptteil 1", dauer: 20 }
      ];
      tpRenderTimeline();
      await new Promise(r => setTimeout(r, 250));
      const bloecke = [...document.querySelectorAll(".tp-slot, .tp-block")];
      const text = (document.getElementById("tp-timeline") || document.body).innerText || "";
      // Der erste Block ist das freie Fenster – dort darf kein Übungs-Wähler stehen.
      const ersterLabel = document.querySelector(".tp-slot-label");
      const sel0 = document.getElementById("tp-form-0-0");
      const pick0 = document.getElementById("tp-form-0-0-pick");
      const sel1 = document.getElementById("tp-form-1-0");
      return {
        ersterLabel: ersterLabel ? ersterLabel.textContent.trim().slice(0, 40) : null,
        freiSelect: !!sel0, freiPick: !!pick0, warmSelect: !!sel1,
        satz: /Kinder entscheiden selbst/.test(text),
        turnierKnopf: /Als Trainingsturnier spielen/.test(text)
      };
    });
    zeilen.push(`d) Plan gezeichnet: freies Fenster Auswahl ${r.freiSelect ? "da" : "aus"} · Warm-up-Auswahl ${r.warmSelect ? "da" : "fehlt"} · Erklärsatz ${r.satz}`);
    if (r.freiSelect || r.freiPick) probleme.push("d) das Straßenfußball-Fenster hat weiterhin eine Übungsauswahl");
    if (!r.warmSelect) probleme.push("d) dem Warm-up-Block fehlt jetzt die Übungsauswahl – der braucht sie");
    if (!r.satz) probleme.push("d) der Erklärsatz zum freien Spiel fehlt");
    if (r.turnierKnopf) probleme.push("d) im Straßenfußball-Fenster steht der Turnier-Knopf des Abschlussspiels");
  }

  const fehler = s.fehler(); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  await s.schliessen();
  return h.ergebnis("Kinderzahl je Station und das freie Fenster", probleme.length === 0, zeilen.concat(probleme));
};
