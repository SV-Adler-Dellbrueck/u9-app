/* v676 · PO 29.09. (Bildschirmfoto „Schritt 11 von 13 – Wie waren die Kinder heute dabei?“):
   „Ich kann die Kacheln für die Bewertungen nicht anklicken.“
   Ursache: Seit v648 stehen vor dem Start der Einzelbewertung (team_einstellungen.bewertung_ab)
   keine Sterne je Kind im Bogen. Der Ablauf „Frage für Frage“ baute den Schritt trotzdem; seine
   Knöpfe schrieben in Felder, die es nicht gab – nichts passierte.
   a) Vor dem Stichtag: kein Schritt „Die Kinder“, die Zählung „Schritt x von y“ ohne ihn,
      am Ende keine Zeile „Kinder: …“
   b) Ab dem Stichtag: Schritt da, ein Tipp setzt die Sterne (wie v627)
   v677 PO 29.09.: „Die Bewertung, die ich dir im Screenshot geschickt hatte, ist ja die Bewertung des
   Trainingseinsatzes … Die Bewertung, die wir erstmal gesperrt haben, ist die Profilerstellung.“
   Damit gilt a) nicht mehr: Auch vor dem Stichtag ist der Schritt da und jeder Tipp setzt Sterne –
   genau das, was im Bildschirmfoto nicht ging. Die Knöpfe laufen nie mehr ins Leere. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const plan = [{ formIdx: 1, formName: "Adler 1 – Aktivierung", trainer: "Alle", slotLabel: "Warm up" }];
  const lauf = async ab => {
    const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], team_einstellungen: [{ id: 1, bewertung_ab: ab }],
      einheit_bewertung: [], trainings_eval: [], trainingsplan: [{ datum: gestern, plan, kopf: {} }] }) });
    const r = await s.page.evaluate(async ({ gestern, ab }) => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      window.trainerMe = async () => "Charles";
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      if (typeof nbWegStart !== "function") return { fehlt: true };
      await loadKader();
      AW_DATA[gestern] = { "Kind A": { da: true }, "Kind B": { da: true } };
      BEW_AB = ab; if (typeof bewSperreAnwenden === "function") bewSperreAnwenden();
      await einheitBewertenOpen(); await einheitDetailOpen(gestern);
      for (let i = 0; i < 40 && !document.getElementById("nb-weg"); i++) await warte(50);
      nbWegStart("training");
      const out = { schritte: _nbWeg.schritte.map(x => x.typ), zeilen: !!document.getElementById("eb-stars-sp-0") };
      const k = _nbWeg.schritte.findIndex(x => x.typ === "kinder");
      if (k >= 0) {
        _nbWeg.i = k; nbWegZeichnen();
        const kb = [...document.querySelectorAll("#nb-weg button[aria-label]")].find(b => /Kind B: stark/.test(b.getAttribute("aria-label")));
        kb && kb.click(); await warte(50);
        out.sterne = Number((document.getElementById("eb-stars-sp-1") || { dataset: {} }).dataset.val || 0);
      }
      _nbWeg.i = _nbWeg.schritte.length - 1; nbWegZeichnen();
      out.ende = document.querySelector("#nb-weg").textContent.replace(/\s+/g, " ");
      return out;
    }, { gestern, ab });
    const f = s.fehler(); await s.schliessen();
    return { r, f };
  };
  const vor = await lauf(h.tagePlus(60));
  const nach = await lauf("2026-01-01");
  if (vor.r.fehlt) return h.ergebnis("Nachbewertung: Trainingseinsatz je Kind, vor und nach dem Stichtag", false, ["nbWegStart fehlt"]);
  if (!vor.r.zeilen || !vor.r.schritte.includes("kinder") || vor.r.sterne !== 3) probleme.push(`a) v677: Vor dem Stichtag fehlt der Trainingseinsatz: Zeilen ${vor.r.zeilen}, Schritt ${vor.r.schritte.includes("kinder")}, Sterne ${vor.r.sterne}`);
  if (!/Kinder: 1 von 2/.test(vor.r.ende)) probleme.push(`a) Zusammenfassung: ${vor.r.ende.slice(0, 160)}`);
  if (!nach.r.schritte.includes("kinder") || nach.r.sterne !== 3) probleme.push(`b) Ab dem Stichtag: Schritt ${nach.r.schritte.includes("kinder")}, Sterne ${nach.r.sterne}`);
  const f = vor.f.concat(nach.f); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a) v677: vor dem Stichtag ${vor.r.schritte.length} Schritte mit „Die Kinder“, Tipp setzt ${vor.r.sterne} Sterne · b) ab dem Stichtag ${nach.r.schritte.length} Schritte, Tipp setzt ${nach.r.sterne} Sterne`);
  return h.ergebnis("Nachbewertung: Trainingseinsatz je Kind, vor und nach dem Stichtag", !probleme.length, probleme.length ? probleme : zeilen);
};
