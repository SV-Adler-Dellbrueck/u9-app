/* v625 · PO (Bildschirmfoto Einladungskarten): „Hier lässt sich Alle oder Keine nicht anklicken.“
   Darunter stand „Kein Kader geladen.“ – loadKader legt die Kennung als `_id` ab, das Fenster
   fragte `k.id`. Der Prüffall v604 setzte KADER von Hand MIT `id` und sah es deshalb nie.
   Hier lädt der Kader über den echten Weg (loadKader aus der Attrappe).

   a) Einladungskarten: 15 Kinder, „Alle“ hakt alle an, „Keine“ keins.
   b) Rückmeldungs-Übersicht: ein zugesagtes Kind steht unter „zugesagt“, nicht unter „offen“.
   c) Setup-Übersicht: ein Kind mit Notfallkarte zählt nicht als fehlend.
   d) kaderId() versteht beide Schreibweisen. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [{ id: 5, datum: h.tagePlus(2), typ: "training", uhrzeit: "17:00" }],
    rueckmeldungen: [{ spieler_id: 3, status: "zugesagt" }], kind_notfall: [{ spieler_id: 4 }], eltern_kinder: [], eltern_einladung: [] }) });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    await loadKader();
    const out = { kader: KADER.length, id: KADER[0] && ("id" in KADER[0]) };
    await einladungskartenOpen(); await warte(50);
    const m = document.getElementById("einl-modal");
    const boxen = () => [...m.querySelectorAll(".einl-kind")];
    const knopf = t => [...m.querySelectorAll("button")].find(b => b.textContent.trim() === t);
    out.a = { n: boxen().length, leer: /Kein Kader geladen/.test(m.textContent) };
    knopf("Keine").click(); out.a.keine = boxen().filter(c => c.checked).length;
    knopf("Alle").click(); out.a.alle = boxen().filter(c => c.checked).length;
    m.remove();
    TM_TERMINE = [{ id: 5, datum: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), typ: "training", uhrzeit: "17:00" }];
    if (typeof rsvpOverviewOpen === "function") {
      await rsvpOverviewOpen(5); await warte(80);
      const ov = [...document.querySelectorAll('[role="dialog"]')].pop();
      out.b = ov ? ov.textContent.replace(/\s+/g, " ") : "";
      ov && ov.remove();
    }
    out.d = [kaderId({ _id: 7 }), kaderId({ id: 8 }), kaderId({ _id: 0, id: 9 }), kaderId(null)];
    return out;
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.a.leer || r.a.n !== 15) probleme.push(`a) Einladungskarten zeigen ${r.a.n} Kinder${r.a.leer ? " („Kein Kader geladen.“)" : ""}`);
  if (r.a.alle !== r.a.n || r.a.keine !== 0) probleme.push(`a) Alle → ${r.a.alle}, Keine → ${r.a.keine}`);
  const kindC = "Kind C";
  const zug = (r.b || "").match(/Zusagen \(1\)\s*([^❓👍👎🤒]*)/);
  if (!r.b) probleme.push("b) Rückmeldungs-Übersicht ging nicht auf");
  else if (!zug || !zug[1].includes(kindC) || !/Offen \(14\)/.test(r.b)) probleme.push(`b) „${kindC}“ (zugesagt) steht nicht unter zugesagt: ${r.b.slice(-200)}`);
  if (JSON.stringify(r.d) !== "[7,8,0,null]") probleme.push(`d) kaderId: ${JSON.stringify(r.d)}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Kader ${r.kader} (Feld id: ${r.id ? "ja" : "nein"}) · a) ${r.a.n} Kinder, Alle ${r.a.alle}, Keine ${r.a.keine} · b) zugesagt erkannt`);
  return h.ergebnis("v625 Kader-Kennung: Einladungskarten, Rückmeldungen, Notfall finden die Kinder", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
