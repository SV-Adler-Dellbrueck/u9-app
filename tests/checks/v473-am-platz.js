/* v473 – Rundgang, Paket „Am Platz": Anwesenheit lag drei Ebenen tief ohne Sprung; die
   Wertungsknoepfe im Blitz-Rating waren 40 px (Handschuhe, Sonne); der Trainingsplan
   wiederholte Erklaerabsaetze in jeder Phase und trug die Nachbewertung (nach dem
   Training) auf der Planseite (vor dem Training); die Match-Seite liess am Spieltag alle
   Abschnitte zu. Geprueft: Sprungknopf + tmJump('anwesenheit'), 48-px-Knoepfe, Tipps
   zugeklappt, keine Nachbewertung im Plan, Vorauswahl nur am Spieltag. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute(), morgen = h.tagePlus(1);
  const jetzt = new Date(); const hh = n => String(n).padStart(2, "0");
  const vor = `${hh((jetzt.getHours() + 23) % 24)}:00`, nach = `${hh((jetzt.getHours() + 1) % 24)}:59`;
  const termine = [
    { id: 1, datum: morgen, typ: "training", uhrzeit: "16:45", trainer_status: {} },
    { id: 2, datum: heute, typ: "spiel", titel: "Testspiel", uhrzeit: vor, uhrzeit_ende: nach, trainer_status: {} }
  ];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, matchday: [{ datum: heute, clock_status: "idle" }], profiles: [{ name: "Charles", rolle: "trainer" }] }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#home-content");
  const r = await s.page.evaluate(async ({ K, heute, morgen }) => {
    await loadKader(); window.trainerMe = async () => "Charles";
    document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) { m.style.display = ""; if (getComputedStyle(m).display === "none") m.style.display = "block"; }
    const warte = ms => new Promise(r => setTimeout(r, ms));
    // 1) Diese Woche: Sprungknoepfe der ersten Zeile (naechster Termin = Training morgen? nein: heute ist Spiel)
    go("home"); await warte(900);
    const knoepfe = [...document.querySelectorAll("#home-woche .woche-erweitert button")].map(b => b.textContent.trim());
    // 2) Sprung zur Anwesenheit mit Datum
    let awDatum = null;
    if (typeof tmJump === "function") { tmJump("anwesenheit", morgen); await warte(700); awDatum = document.getElementById("aw-date")?.value || null; }
    const awSichtbar = !!document.getElementById("train-sub-anwesenheit")?.classList.contains("active");
    // 3) Trainingsplan: keine Nachbewertung, Tipps zugeklappt, Knoepfe 44
    go("planung"); await warte(900);
    const plan = document.getElementById("train-sub-planung");
    const nachbew = /Nachbewertung/.test(plan?.textContent || "");
    const tipps = [...(plan?.querySelectorAll("details.tp-tipp") || [])];
    const tippOffen = tipps.filter(d => d.open).length;
    const tippSummary = tipps[0] ? parseInt(getComputedStyle(tipps[0].querySelector("summary")).minHeight) : 0;
    const absaetze = (plan?.textContent || "").includes("Nachzügler docken einfach an") && !tipps.length;
    const info = document.querySelector(".tp-info"); const infoH = info ? parseInt(getComputedStyle(info).minHeight) : 0;
    // 4) Blitz-Rating: Wertungsknoepfe
    let blitzH = 0;
    if (typeof blitzRenderCard === "function") {
      let bp = document.getElementById("blitz-card"); if (!bp) { bp = document.createElement("div"); bp.id = "blitz-card"; document.body.appendChild(bp); }
      if (typeof blitzPlayers !== "undefined") { blitzPlayers.length = 0; blitzPlayers.push(K[0]); } if (typeof blitzIdx !== "undefined") blitzIdx = 0;
      blitzRenderCard();
      const b = [...document.querySelectorAll("#blitz-card button")].find(x => /schwach/.test(x.textContent));
      blitzH = b ? parseInt(getComputedStyle(b).minHeight) : 0;
    }
    // 5) Spieltag heute: Live-Abschnitt offen; anderer Tag: alles zu
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${heute}" selected>${heute}</option>`; sd.value = heute;
    go("spieltag"); await warte(900);
    const offenHeute = [...document.querySelectorAll("#train-sub-spieltag details.el-sect")].filter(d => d.open).map(d => d.id);
    sd.innerHTML = `<option value="${morgen}" selected>${morgen}</option>`; sd.value = morgen;
    go("home"); await warte(200); go("spieltag"); await warte(900);
    const offenMorgen = [...document.querySelectorAll("#train-sub-spieltag details.el-sect")].filter(d => d.open).map(d => d.id);
    return { knoepfe, awDatum, awSichtbar, nachbew, tipps: tipps.length, tippOffen, tippSummary, absaetze, infoH, blitzH, offenHeute, offenMorgen };
  }, { K, heute, morgen });
  const fehler = s.fehler(); await s.schliessen();
  // Die erste Zeile ist heute das Spiel → „Matchday"; die Anwesenheit-Pruefung laeuft ueber tmJump
  if (r.awDatum !== morgen || !r.awSichtbar) probleme.push(`tmJump('anwesenheit') landet nicht auf der Anwesenheit mit Datum (Seite ${r.awSichtbar}, Datum ${r.awDatum})`);
  if (r.nachbew) probleme.push("Trainingsplan zeigt weiter die Nachbewertung der Einheit");
  if (r.absaetze) probleme.push("Trainingsplan zeigt die Erklärabsätze weiter offen");
  if (!r.tipps) probleme.push("keine zugeklappten Tipps im Trainingsplan");
  if (r.tippOffen) probleme.push(`${r.tippOffen} Tipps stehen offen`);
  if (r.tippSummary < 44) probleme.push(`Tipp-Klapper nur ${r.tippSummary}px hoch`);
  if (r.infoH < 44) probleme.push(`ℹ️-Knopf im Plan nur ${r.infoH}px`);
  if (r.blitzH < 48) probleme.push(`Blitz-Rating-Wertungsknopf nur ${r.blitzH}px (erwartet 48)`);
  if (!r.offenHeute.includes("mt-phase-live")) probleme.push(`am Spieltag ist „Live“ nicht vorgewählt: ${JSON.stringify(r.offenHeute)}`);
  if (r.offenMorgen.length) probleme.push(`an einem anderen Tag steht etwas offen: ${JSON.stringify(r.offenMorgen)}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Sprung: Anwesenheit ${r.awSichtbar} @ ${r.awDatum} · Wochenknöpfe ${JSON.stringify(r.knoepfe)}`);
  zeilen.push(`Plan: Nachbewertung ${r.nachbew} · Tipps ${r.tipps} (offen ${r.tippOffen}, Klapper ${r.tippSummary}px) · ℹ️ ${r.infoH}px · Blitz ${r.blitzH}px`);
  zeilen.push(`Spieltag heute offen ${JSON.stringify(r.offenHeute)} · morgen ${JSON.stringify(r.offenMorgen)}`);
  return h.ergebnis("Am Platz: Sprung zur Anwesenheit, 48-px-Wertung, Tipps zu, Nachbewertung raus, Spieltag vorgewählt", !probleme.length, zeilen.concat(probleme));
};
