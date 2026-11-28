/* v993 · Charles 28.11.2026: „Wo kann ich als Trainer relativ schnell … Zu- und Absagen geben? Wäre auch gut, wenn ich das im Termin
   selber noch mal machen könnte.“ Der Block „Welche Trainer sind dabei?“ stand nur in der Ansicht „Fürs Training/Für den Spieltag“,
   nicht unter „Termin verwalten“ (Orga). Bild freigegeben: dort direkt unter „Findet der Termin statt?“.
   a) Orga-Ansicht eines Trainings: „Welche Trainer sind dabei?“ steht zwischen „Findet der Termin statt?“ und „Termin verwalten“,
      je Trainer ein Knopf ≥ 44 px mit dem Stand (✓ / 🤔)
   b) ein Tipp auf einen Namen speichert trainer_status (offen → ja) und zeichnet das Fenster neu
   c) abgesagter Termin: kein Trainer-Block (nichts mehr zu planen) */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const patches = [];
  const s = await h.starten({ breite: 412, hoehe: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    termine: (u, req) => { if (req.method() === "PATCH") { patches.push(JSON.parse(req.postData() || "{}")); return { status: 204, body: "" }; } return []; } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof tmDetailOpen !== "function"; i++) await w(100);
    if (typeof tmDetailOpen !== "function") return { fehlt: true };
    document.getElementById("pin-gate")?.remove();
    try { TRAINER.length = 0; TRAINER.push("Trainer A", "Trainer B", "Trainer C"); } catch (e) { window.TRAINER = ["Trainer A", "Trainer B", "Trainer C"]; }
    const d = new Date(); d.setDate(d.getDate() + 3); const iso = d.toISOString().slice(0, 10);
    TM_TERMINE = [{ id: 61, typ: "training", datum: iso, uhrzeit: "16:45:00", titel: "", trainer_status: { "Trainer A": "ja", "Trainer B": "unsicher" } },
                  { id: 62, typ: "training", datum: iso, uhrzeit: "18:00:00", titel: "", platz_status: "abgesagt", platz_status_note: "Platzsperre" }];
    const lies = () => { const m = document.getElementById("tmd-inhalt"); const txt = m ? m.textContent : "";
      const knoepfe = m ? [...m.querySelectorAll("button[onclick*='tmTrainerToggle']")].map(b => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })) : [];
      return { txt, knoepfe }; };
    await tmDetailOpen(61, "orga"); await w(500);
    const vor = lies();
    const pos = k => vor.txt.indexOf(k);
    const o = { knoepfe: vor.knoepfe, reihenfolge: [pos("Findet der Termin statt?"), pos("Welche Trainer sind dabei?"), pos("Termin verwalten")] };
    const c = [...document.querySelectorAll("#tmd-inhalt button[onclick*='tmTrainerToggle']")].find(b => /Trainer C/.test(b.textContent));
    if (c) { c.click(); await w(600); }
    o.nach = lies().knoepfe;
    document.getElementById("tmd-modal")?.remove();
    await tmDetailOpen(62, "orga"); await w(400);
    o.abgesagt = /Welche Trainer sind dabei\?/.test(lies().txt);
    document.getElementById("tmd-modal")?.remove();
    return o;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v993 Trainer-Block unter Termin verwalten", false, ["tmDetailOpen fehlt"]);
  const [a1, a2, a3] = r.reihenfolge;
  if (!(a1 >= 0 && a2 > a1 && a3 > a2) || r.knoepfe.length !== 3 || r.knoepfe.some(k => k.h < 44) || !/✓/.test(r.knoepfe[0].t) || !/🤔/.test(r.knoepfe[1].t))
    probleme.push("a) " + JSON.stringify({ reihenfolge: r.reihenfolge, knoepfe: r.knoepfe }));
  else zeilen.push(`a) Orga-Ansicht: „Welche Trainer sind dabei?“ zwischen „Findet der Termin statt?“ und „Termin verwalten“, 3 Knöpfe (${r.knoepfe.map(k => k.h).join("/")} px)`);
  const p = patches.find(x => x.trainer_status);
  if (!p || p.trainer_status["Trainer C"] !== "ja" || !(r.nach.find(k => /Trainer C/.test(k.t)) || {}).t.includes("✓")) probleme.push("b) " + JSON.stringify({ patches, nach: r.nach }));
  else zeilen.push("b) Tipp auf „Trainer C“ speichert trainer_status ja, das Fenster zeigt ✓");
  if (r.abgesagt) probleme.push("c) abgesagter Termin zeigt den Trainer-Block");
  else zeilen.push("c) abgesagter Termin ohne Trainer-Block");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v993 „Welche Trainer sind dabei?“ auch unter „Termin verwalten“", !probleme.length, zeilen.concat(probleme));
};
