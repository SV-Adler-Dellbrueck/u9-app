/* v531 – Paket 1 „Das kann dein Kind jetzt" (doku/auftrag-adler-luecken).
   Der Rückblick sagt, wie ein Spieltag ausging. Diese Karte sagt, was dazugekommen ist:
   erreichte Entwicklungsziele und neue Technik-Abzeichen.

   Geprüft werden die Zusagen des Pakets, nicht die Optik:
   a) Die Karte gibt es (Funktion da, Slot im Eltern-Dashboard angelegt).
   b) Mit Neuem erscheint eine Karte je Kind, mit dem Namen des Kindes.
   c) Ohne Neues erscheint NICHTS – keine Karte, kein Platzhalter „noch nichts erreicht".
   d) Höchstens drei Einträge, Reihenfolge der RPC (neueste zuerst) bleibt erhalten.
   e) Abzeichen werden in Klartext übersetzt – die rohe Kennung (ab_…) darf nirgends stehen.
   f) Keine Zahl, keine Note, kein Stern in der Karte.
   g) Gefragt wird nur nach den eigenen Kindern, mit dem Fenster des Rückblicks.
   h) Am schmalen Handy (390 px) läuft ein langer Zieltext nicht aus der Karte heraus.

   Die RLS-Gegenprobe (Abnahme 4 und 5) steht NICHT hier: Supabase ist in dieser Prüfung
   eine Attrappe, die jede Regel bestätigen würde, die man ihr vorgibt. Sie ist direkt auf
   der Datenbank gefahren (anon sieht null Zeilen) und in der PR belegt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const LANG = "Nimmt den Ball mit dem ersten Kontakt mit und schaut dabei schon, wohin er als Nächstes spielen kann";
  const kids = [{ spieler_id: 41, kader: { name: "Kind A" } }, { spieler_id: 42, kader: { name: "Kind B" } }];

  // Vier Einträge, absichtlich mehr als die drei erlaubten – der Zuschnitt muss greifen.
  const vollRpc = (u, req) => {
    let id = null;
    try { id = JSON.parse(req.postData() || "{}").p_kind_id; } catch (e) {}
    if (id !== 41) return [];                        // Kind B hat nichts Neues
    return [
      { art: "ziel",      text: LANG,          wann: "2026-09-12T10:00:00Z" },
      { art: "abzeichen", text: "ab_jonglier", wann: "2026-09-11T10:00:00Z" },
      { art: "ziel",      text: "Ruft laut, wenn er anspielbar ist", wann: "2026-09-10T10:00:00Z" },
      { art: "abzeichen", text: "ab_slalom",   wann: "2026-09-09T10:00:00Z" }
    ];
  };

  async function lauf(rpc) {
    const s = await h.starten({ start: "/eltern/index.html", warten: 900, breite: 390,
      supabase: h.supabaseAttrappe({ rpc: { kann_jetzt_public: rpc } }) });
    const r = await s.page.evaluate(async kids => {
      const out = { fehlt: typeof elternKannJetztLoad !== "function" };
      if (out.fehlt) return out;
      let slot = document.getElementById("kann-jetzt-slot");
      /* Der Slot entsteht erst im angemeldeten Dashboard – die Prüfung startet aber am
         Anmeldeschirm. Deshalb wird die Quelle gelesen: steht der Slot dort, und steht er
         UNTER dem Rückblick, und wird der Lader auch aufgerufen? */
      try {
        const q = await (await fetch("/md-eltern-portal.js")).text();
        const iRueck = q.indexOf("match-gruss-slot");
        const iNeu   = q.indexOf("kann-jetzt-slot");
        out.slotImDashboard = iNeu > 0;
        out.slotUnterRueckblick = iRueck > 0 && iNeu > iRueck;
        out.laderAufgerufen = /elternKannJetztLoad\s*\(/.test(q);
      } catch (e) { out.slotImDashboard = false; }
      if (!slot) { slot = document.createElement("div"); slot.id = "kann-jetzt-slot"; document.body.appendChild(slot); }
      slot.style.maxWidth = "390px";
      await elternKannJetztLoad(kids);
      out.html = slot.innerHTML;
      out.txt = slot.textContent.replace(/\s+/g, " ").trim();
      out.karten = slot.children.length;
      // Eine „Zeile" ist ein Eintrag: Emoji + Satz.
      const karte = slot.querySelector("div");
      out.eintraege = karte ? [...karte.querySelectorAll("div > span:nth-child(2)")].map(e => e.textContent.trim()) : [];
      // h) Läuft etwas seitlich heraus?
      out.ueberlauf = karte ? Math.max(0, karte.scrollWidth - karte.clientWidth) : 0;
      return out;
    }, kids);
    const fehler = s.fehler();
    const gesendet = s.gesendet.filter(g => /kann_jetzt_public/.test(g.pfad || ""));
    await s.schliessen();
    return { ...r, fehler, gesendet };
  }

  const mit  = await lauf(vollRpc);
  const ohne = await lauf(() => []);

  if (mit.fehlt) {
    probleme.push("elternKannJetztLoad gibt es nicht – die Karte fehlt ganz");
    return h.ergebnis("Das kann dein Kind jetzt", false, probleme);
  }

  // a) Slot
  if (!mit.slotImDashboard) probleme.push("Das Eltern-Dashboard legt den Slot kann-jetzt-slot nicht an – die Karte hätte keinen Platz");
  if (!mit.slotUnterRueckblick) probleme.push("der Slot steht nicht UNTER dem Rückblick – erst wie es ausging, dann was dazugekommen ist");
  if (!mit.laderAufgerufen) probleme.push("das Dashboard ruft elternKannJetztLoad nicht auf – der Slot bliebe leer");

  // b) Karte je Kind mit Neuem, und nur für dieses Kind
  if (mit.karten !== 1) probleme.push(`Karten: ${mit.karten} (erwartet 1 – nur Kind A hat Neues)`);
  if (!/Das kann Kind A jetzt/.test(mit.txt)) probleme.push(`Überschrift ohne Kindnamen: „${mit.txt.slice(0, 90)}“`);
  if (/Kind B/.test(mit.txt)) probleme.push("Kind B steht in der Karte, obwohl es nichts Neues hat");

  // c) ohne Neues: gar nichts
  if (ohne.txt !== "") probleme.push(`ohne Neues erscheint trotzdem etwas: „${ohne.txt.slice(0, 90)}“`);
  if (ohne.karten !== 0) probleme.push(`ohne Neues stehen ${ohne.karten} Karten da (erwartet 0, auch kein Platzhalter)`);

  // d) höchstens drei, Reihenfolge der RPC
  if (mit.eintraege.length !== 3) probleme.push(`Einträge: ${mit.eintraege.length} (erwartet 3 – der vierte muss wegfallen)`);
  if (mit.eintraege[0] !== LANG) probleme.push(`der neueste Eintrag steht nicht oben: „${(mit.eintraege[0] || "").slice(0, 60)}“`);
  if (/Slalom/.test(mit.txt)) probleme.push("der vierte (älteste) Eintrag steht in der Karte – der Zuschnitt auf drei greift nicht");

  // e) Abzeichen im Klartext, nie die rohe Kennung
  if (/ab_jonglier|ab_slalom/.test(mit.html)) probleme.push("die rohe Abzeichen-Kennung (ab_…) steht im Eltern-Bereich");
  if (!/Ball-Jongleur/.test(mit.txt)) probleme.push(`Abzeichen nicht übersetzt: „${mit.txt.slice(0, 120)}“`);

  // f) keine Bewertung: keine Sterne, keine Feder-/Punktzahl
  if (/★|⭐/.test(mit.txt)) probleme.push("Sterne in der Karte – Bewertungen gehören nicht zu den Eltern");
  const zahl = mit.txt.match(/\d+\s*(Punkte?|Federn?|Sterne?|von \d)/i);
  if (zahl) probleme.push(`Zahlenwertung in der Karte: „${zahl[0]}“`);

  // g) nur die eigenen Kinder, Fenster wie beim Rückblick
  const ids = mit.gesendet.map(g => (g.body || {}).p_kind_id);
  if (String(ids) !== "41,42") probleme.push(`gefragt wurde nach ${JSON.stringify(ids)} (erwartet genau die beiden eigenen Kinder 41,42)`);
  const tage = (mit.gesendet[0] || {}).body || {};
  if (tage.p_tage !== 14) probleme.push(`Zeitfenster p_tage=${tage.p_tage} (erwartet 14 – dasselbe wie beim Rückblick)`);

  // h) schmales Handy
  if (mit.ueberlauf > 1) probleme.push(`die Karte läuft bei 390 px um ${mit.ueberlauf} px seitlich heraus`);

  if (mit.fehler.length) probleme.push(...mit.fehler.slice(0, 2));
  if (ohne.fehler.length) probleme.push(...ohne.fehler.slice(0, 2));

  zeilen.push(`mit Neuem: ${mit.karten} Karte, ${mit.eintraege.length} Einträge, Überlauf ${mit.ueberlauf} px`);
  zeilen.push(`Einträge: ${mit.eintraege.map(t => "„" + t.slice(0, 42) + "“").join(" · ")}`);
  zeilen.push(`ohne Neues: ${ohne.karten === 0 && ohne.txt === "" ? "keine Karte, kein Platzhalter ✓" : "etwas steht da"}`);
  zeilen.push(`gefragt: ${JSON.stringify(ids)} · Fenster ${tage.p_tage} Tage`);

  return h.ergebnis("Das kann dein Kind jetzt: nur bei Neuem, höchstens drei, ohne Zahlen", !probleme.length, zeilen.concat(probleme));
};
