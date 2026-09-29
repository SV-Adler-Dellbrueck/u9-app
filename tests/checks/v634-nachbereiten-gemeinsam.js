/* v634 · PO: „Für Spieltage und Festivals gibt es momentan, glaube ich, nur das Blitzrating …
   Aber es fehlt hier die Möglichkeit, genau wie bei Trainingseinheiten per Diktat für das
   Tagebuch Erfahrungen, Erkenntnisse und Inhalte zusammenzufassen. Vielleicht sollten wir
   dieses Thema irgendwie vereinheitlichen.“ Dann: „Ergebnisse zählen bei uns in der U9 noch
   nicht.“ Kachel: „Ja, so bauen“.

   Die Nachbereitung für Spiel und Festival gab es seit v525/v627 – sie war nur versteckt: das
   Ergebnis-To-Do verdrängte sie, sonst lag sie im Termin-Fenster.

   a) Ein Einstieg „📝 Nachbereiten“ steht auf der Startseite, auch wenn kein To-Do offen ist.
   b) Er zeigt Training, Spiel und Festival in einer Liste, je mit Art, Stand und Stempel.
   c) Ein Tipp auf Spiel oder Festival schließt die Liste und öffnet dessen Nachbereitung.
   (Das gestrichene Ergebnis-To-Do prüfen v471/v521/v524.) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const d1 = h.tagePlus(-1), d2 = h.tagePlus(-2), d5 = h.tagePlus(-5);
  const termine = [
    { id: 87, typ: "training", datum: d1, uhrzeit: "17:00", uhrzeit_ende: "18:30", platz: "Platz A" },
    { id: 88, typ: "turnier", datum: d2, titel: "Kinderfestival · Heim", uhrzeit: "10:00", uhrzeit_ende: "12:00", trainer_status: {} },
    { id: 89, typ: "spiel", datum: d5, gegner: "Gastverein", uhrzeit: "10:00", uhrzeit_ende: "11:00", trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: u => { const id = (u.search.match(/id=eq\.(\d+)/) || [])[1]; if (id) return termine.filter(t => String(t.id) === id);
      const typ = u.searchParams.get("typ") || ""; return termine.filter(t => typ.includes(t.typ)); },
    event_bewertung: [{ termin_id: 88, autor: "Peter", updated_at: new Date().toISOString() }],
    einheit_bewertung: [], trainingsplan: []
  }), hoehe: 1600 });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    let slot = document.getElementById("trainer-todo-slot");
    if (!slot) { slot = document.createElement("div"); slot.id = "trainer-todo-slot"; document.body.appendChild(slot); }
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    // a) erst der Fall ohne offene To-Dos (fazitOffene leer), dann mit
    const echt = window.fazitOffene; window.fazitOffene = async () => [];
    await trainerTodoLoad();
    const leer = [...slot.querySelectorAll("button")].map(b => (b.textContent || "").trim());
    window.fazitOffene = echt;
    await trainerTodoLoad();
    const voll = [...slot.querySelectorAll("button")].map(b => (b.textContent || "").trim());
    const einstieg = [...slot.querySelectorAll("button")].find(b => /Nachbereiten – Training, Spiel, Festival/.test(b.textContent || ""));
    einstieg?.click();
    for (let i = 0; i < 40 && !document.querySelector("#eb-card [role=button]"); i++) await warte(50);
    const zeilen = [...document.querySelectorAll("#eb-card [role=button]")].map(z => z.textContent.replace(/\s+/g, " ").trim());
    const titel = (document.querySelector("#eb-card")?.textContent || "").slice(0, 60);
    const fest = [...document.querySelectorAll("#eb-card [role=button]")].find(z => /Festival/.test(z.textContent));
    fest?.click();
    for (let i = 0; i < 40 && !document.getElementById("fz-modal"); i++) await warte(50);
    return { leer, voll, zeilen, titel, listeZu: !document.getElementById("eb-modal"), fz: document.getElementById("fz-modal")?.getAttribute("aria-label") || null };
  });
  const fe = s.fehler(); await s.schliessen();

  if (!r.leer.some(t => /Nachbereiten – Training, Spiel, Festival/.test(t))) probleme.push("a) Ohne offene To-Dos fehlt der Einstieg: " + JSON.stringify(r.leer));
  if (!r.voll.some(t => /Nachbereiten – Training, Spiel, Festival/.test(t))) probleme.push("a) Unter den To-Dos fehlt der Einstieg");
  const z = t => r.zeilen.find(x => x.includes(t)) || "";
  if (r.zeilen.length !== 3) probleme.push(`b) ${r.zeilen.length} Zeilen statt 3: ${r.zeilen.join(" | ")}`);
  if (!/Training/.test(z("Training"))) probleme.push("b) Das Training fehlt in der Liste");
  if (!/von dir noch offen/.test(z("Festival")) || !/nachbereitet von Peter/.test(z("Festival"))) probleme.push("b) Festival ohne Stand oder Stempel: " + z("Festival"));
  if (!/Gastverein/.test(z("Spiel"))) probleme.push("b) Spiel fehlt oder ohne Gegner: " + z("Spiel"));
  if (!r.listeZu || !/Festival/.test(r.fz || "")) probleme.push(`c) Tipp aufs Festival: Liste zu ${r.listeZu}, geöffnet „${r.fz}“`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Titel: ${r.titel}`, ...r.zeilen.map(x => "· " + x.slice(0, 110)), `Tipp aufs Festival öffnet „${r.fz}“`);
  return h.ergebnis("v634 Ein Einstieg „Nachbereiten“ für Training, Spiel und Festival", !probleme.length, probleme.concat(zeilen));
};
