/* v929 · Trainer-Start „📌 Für dich“ (Charles 21.11.2026: „Ja, so bauen“, Bild freigegeben).
   Wie „Für euch“ bei den Eltern sammelt ein Karussell oben alles, was ein Trainer tun soll; „Diese Woche“ bleibt
   darunter eine Liste im ersten Bildschirm; im Kopf steht „💬 Chats“ mit Zahl.
   a) Kopf: „Chats“ als Wort, mind. 44 px hoch, Kontrast ≥ 4,5:1.
   b) Mit Löschantrag, Elterngespräch und fälligen Bewertungen stehen diese als Karten in „Für dich“ – der Löschantrag
      (Frist) vorn –, „1 von n“ und Punkte zählen mit; Wischen zeigt die nächste Karte.
   c) „Diese Woche“ beginnt im ersten Bildschirm (390 × 844).
   d) Ohne offene Punkte ist „Für dich“ unsichtbar; „Nachbereiten – Training, Spiel, Festival“ steht als Zeile
      darunter, nicht als Karte im Karussell. */
"use strict";
module.exports = async function (h) {
  const titel = "v929 Trainer-Start „Für dich“: Karussell oben, Woche im ersten Bildschirm, Chats im Kopf";
  const probleme = [], zeilen = [];
  const TERMINE = [{ id: 1, datum: h.tagePlus(1), uhrzeit: "17:00", uhrzeit_ende: "18:15", typ: "training", titel: "Training", trainer_status: {} }];
  const lauf = async (mitPunkten) => {
    // ohne offene Punkte hat „Trainer A“ auch „Bist du dabei?“ schon beantwortet
    const termine = mitPunkten ? TERMINE : TERMINE.map(t => ({ ...t, trainer_status: { "Trainer A": "ja" } }));
    const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), termine: u => /spiel|turnier/.test(u.searchParams.get("typ") || "") ? [] : termine, nominierungen: [], anwesenheit: [], periodisierung: [], trainingsbloecke: [],
      loeschantrag: mitPunkten ? [{ id: 1, spieler_id: 2, erstellt_am: new Date(Date.now() - 3 * 864e5).toISOString(), antrag_email: null }] : [],
      elterngespraech_wunsch: mitPunkten ? [{ id: 1, thema: "Kurze Frage", created_at: new Date().toISOString(), spieler_id: 3, kader: { name: "Kind C" } }] : []
    }) });
    await h.sichtbarMachen(s.page, "#main-app");
    await s.page.evaluate(h.kontrastHelfer);
    const r = await s.page.evaluate(async (mitPunkten) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      if (typeof fuerDichSync !== "function") return { fehlt: "fuerDichSync" };
      try { localStorage.setItem("adler_onboarded", "1"); } catch (e) {}
      window.trainerMe = async () => "Trainer A";
      await loadKader(); go("home"); await w(1500);
      document.querySelectorAll("#push-hinweis, .schrift-hinweis").forEach(e => e.remove());
      if (mitPunkten) { const b = document.getElementById("home-team-hinweis"); if (b && !b.innerHTML.trim()) b.innerHTML = '<div class="card">👥 2 Bewertungen fällig</div>'; }
      await w(200); window.scrollTo(0, 0);
      const out = {};
      const kopf = document.getElementById("rufe-kopf");
      out.kopf = { text: kopf.textContent.trim(), hoehe: Math.round(kopf.getBoundingClientRect().height), kontrast: window.__kontrastVon(kopf.querySelector(".ep-chats-wort") || kopf) };
      const sek = document.getElementById("fuer-dich");
      out.sichtbar = !!sek && !sek.hidden && sek.getBoundingClientRect().height > 0;
      const karten = typeof fuerDichKarten === "function" ? fuerDichKarten() : [];
      out.karten = karten.map(k => k.parentElement.id);
      out.zahl = (document.getElementById("fd-zahl") || {}).textContent || "";
      out.punkte = document.querySelectorAll("#fd-punkte i").length;
      const bahn = document.getElementById("fd-bahn");
      if (karten.length > 1) { bahn.scrollLeft = karten[1].offsetLeft - karten[0].offsetLeft; bahn.dispatchEvent(new Event("scroll")); await w(200); out.zahlNach = document.getElementById("fd-zahl").textContent; }
      const woche = document.getElementById("home-woche");
      out.wocheOben = Math.round(woche.getBoundingClientRect().top);
      out.nachbereitenUnten = !!document.querySelector("#home-nachbereiten button") && !document.querySelector("#fd-bahn button[onclick^='einheitBewertenOpen()']");
      return out;
    }, mitPunkten);
    const fe = s.fehler();
    if (mitPunkten && process.env.V929_BILD) await s.page.screenshot({ path: process.env.V929_BILD });
    await s.schliessen();
    return { r, fe };
  };
  const A = await lauf(true), B = await lauf(false);
  if (A.r.fehlt) return h.ergebnis(titel, false, [A.r.fehlt + " fehlt"]);
  const r = A.r;
  if (!/Chats/.test(r.kopf.text) || r.kopf.hoehe < 44 || r.kopf.kontrast < 4.5) probleme.push(`a) Kopf „${r.kopf.text}“, ${r.kopf.hoehe} px, Kontrast ${r.kopf.kontrast.toFixed(1)}`);
  if (!r.sichtbar) probleme.push("b) „Für dich“ ist trotz offener Punkte unsichtbar");
  if (r.karten[0] !== "la-trainer") probleme.push(`b) vorn steht ${r.karten[0]} statt des Löschantrags`);
  for (const id of ["la-trainer", "eg-trainer", "home-team-hinweis"]) if (!r.karten.includes(id)) probleme.push(`b) Karte ${id} fehlt im Karussell (${r.karten.join(", ")})`);
  if (r.zahl !== `1 von ${r.karten.length}` || r.punkte !== r.karten.length) probleme.push(`b) Zähler „${r.zahl}“, ${r.punkte} Punkte bei ${r.karten.length} Karten`);
  if (r.zahlNach !== `2 von ${r.karten.length}`) probleme.push(`b) nach dem Wischen „${r.zahlNach}“`);
  if (r.wocheOben >= 844) probleme.push(`c) „Diese Woche“ beginnt erst bei ${r.wocheOben} px`);
  if (B.r.sichtbar) probleme.push(`d) ohne offene Punkte steht „Für dich“ da (${B.r.karten.join(", ")})`);
  if (!B.r.nachbereitenUnten) probleme.push("d) „Nachbereiten“ steht nicht als Zeile unter dem Karussell");
  if (B.r.wocheOben >= 844) probleme.push(`d) ohne Punkte beginnt „Diese Woche“ erst bei ${B.r.wocheOben} px`);
  [...A.fe, ...B.fe].slice(0, 2).forEach(f => probleme.push("Konsole: " + f));
  if (!probleme.length) zeilen.push(`Kopf „${r.kopf.text}“ ${r.kopf.hoehe} px, Kontrast ${r.kopf.kontrast.toFixed(1)} · Für dich: ${r.karten.join(" → ")} (${r.zahl}, nach Wischen ${r.zahlNach}) · Woche bei ${r.wocheOben} px · ohne Punkte: kein Karussell, Woche bei ${B.r.wocheOben} px, Nachbereiten als Zeile`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
