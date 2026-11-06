/* v791 · Prüffall (Charles 06.11.): Der Buchstabe bleibt richtig, wenn zwischen Diktat und Speichern jemand zum Kader
   dazukommt oder ein Kind gelöscht wird. Ablauf wie in der App: nbMaske („Kind 1“ für die KI) → Antwort der KI →
   nbTbDecknamen (zurück auf Namen, in der App) → tbPseudonym (nach außen: fester Buchstabe aus kader.alias) →
   tbKlarnamen (zurück). Die Buchstaben sind hier absichtlich NICHT die Reihenfolge der Namen (Kind A trägt „C“),
   damit ein Rückfall auf die Rangfolge auffällt. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], profiles: [] }) });
  const r = await s.page.evaluate(() => {
    document.getElementById("pin-gate")?.remove();
    if (typeof nbMaske !== "function" || typeof tbPseudonym !== "function" || typeof tbKlarnamen !== "function") return { fehlt: true };
    const orig = KADER.slice();
    const k = (name, alias, id) => ({ name, alias, id, _id: id, aktiv: true });
    const out = {};
    try {
      KADER.length = 0; KADER.push(k("Kind A", "C", 1), k("Kind B", "A", 2));   // Kind mit „B“ wurde früher gelöscht und nicht neu vergeben
      const m = nbMaske(["Kind B", "Kind A"]);
      const roh = "Kind B hat Kind A heute geärgert.";
      out.maskiert = m.weg(roh);
      const tb = { baustein: "spiel_spieler", beobachtung: "Kind 1 hat Kind 2 geschubst.", aha: null, konsequenzen: ["Ich spreche mit Kind 1."], schlagworte: [], rueckfragen: [], todos: [] };
      // zwischen Antwort und Speichern: ein neues Kind kommt dazu (bekommt „D“), ein anderes wird entfernt
      KADER.push(k("Kind C", "D", 3));
      const v = nbTbDecknamen(tb, m);
      out.inApp = v.beobachtung; out.konsApp = v.konsequenzen[0];
      out.nachAussen = tbPseudonym(v.beobachtung + " " + v.konsequenzen[0]);
      out.neu = tbPseudonym("Kind C war dabei.");
      out.zurueck = tbKlarnamen(out.nachAussen);
      KADER.splice(0, 1);                                    // Kind A verlässt den Kader – Buchstaben der anderen bleiben
      out.nachLoeschen = tbPseudonym("Kind B und Kind C");
    } finally { KADER.length = 0; KADER.push(...orig); }
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v791 Alias-Rückübersetzung", false, ["nbMaske / tbPseudonym / tbKlarnamen fehlen"]);
  if (r.maskiert !== "Kind 1 hat Kind 2 heute geärgert.") probleme.push("Maske: " + r.maskiert);
  if (r.inApp !== "Kind B hat Kind A geschubst." || r.konsApp !== "Ich spreche mit Kind B.") probleme.push("zurück auf Namen: " + r.inApp + " / " + r.konsApp);
  if (r.nachAussen !== "Kind A hat Kind C geschubst. Ich spreche mit Kind A.") probleme.push("nach außen: " + r.nachAussen);
  if (r.neu !== "Kind D war dabei.") probleme.push("neues Kind: " + r.neu);
  if (r.zurueck !== "Kind B hat Kind A geschubst. Ich spreche mit Kind B.") probleme.push("Rückübersetzung der Buchstaben: " + r.zurueck);
  if (r.nachLoeschen !== "Kind A und Kind D") probleme.push("nach Löschen: " + r.nachLoeschen);
  zeilen.push("„Kind 1/2“ → Namen → feste Buchstaben (A/C) → zurück; ein neues Kind bekommt „D“, nach dem Löschen eines Kindes ändert sich kein Buchstabe");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v791 Alias-Rückübersetzung bleibt stabil", !probleme.length, probleme.length ? probleme : zeilen);
};
