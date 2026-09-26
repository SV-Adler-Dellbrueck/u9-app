/* v633 · PO mit Bildschirmfoto der Startseite: „Wieso bekomme ich To-dos von den alten Einheiten
   und nicht mehr die von gestern?“

   Befund (Datenbank 26.09.): 14.09. und 18.09. waren bewertet – vor v630, also mit dem Autor
   „Trainerteam“. Seit v630 zählte das To-do nur Bewertungen mit dem eigenen Namen als erledigt.
   Und von den offenen Einheiten zeigte es die ersten zwei in Datenbank-Reihenfolge, also die
   ältesten; die von gestern (25.09.) fiel hinten herunter.

   a) Eine Bewertung von „Trainerteam“ (vor v630) gilt für alle als erledigt.
   b) Die neueste offene Einheit steht vorn; gestern verdrängt keine alte.
   c) Antippen öffnet genau diese Einheit, nicht nur die Liste. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const t12 = h.tagePlus(-12), t8 = h.tagePlus(-8), t5 = h.tagePlus(-5), t1 = h.tagePlus(-1);
  const plan = d => ({ datum: d, plan: { stationen: [{ trainer: "Charles" }] } });
  const planZeilen = [plan(t12), plan(t8), plan(t5), plan(t1)];            // so liefert die Datenbank ohne order: aufsteigend
  const bewertungen = [{ datum: t12, autor: "Trainerteam" }, { datum: t5, autor: "Peter" }];
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    trainingsplan: u => (/datum\.desc/.test(u.searchParams.get("order") || "") ? planZeilen.slice().reverse() : planZeilen),
    // PostgREST nachgebildet: autor=eq.X oder autor=in.("X",Y)
    einheit_bewertung: u => { const f = u.searchParams.get("autor") || ""; const namen = f.startsWith("eq.") ? [f.slice(3)] : f.startsWith("in.(") ? f.slice(4, -1).split(",").map(x => x.replace(/^"|"$/g, "")) : null; return bewertungen.filter(b => !namen || namen.includes(b.autor)); },
    termine: []
  }), hoehe: 1600 });

  const r = await s.page.evaluate(async () => {
    let slot = document.getElementById("trainer-todo-slot");
    if (!slot) { slot = document.createElement("div"); slot.id = "trainer-todo-slot"; document.body.appendChild(slot); }
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    await trainerTodoLoad();
    const knoepfe = [...slot.querySelectorAll("button")].filter(b => /nachbereiten/.test(b.textContent || ""));
    const texte = knoepfe.map(b => (b.textContent || "").replace(/\s+/g, " ").trim());
    window.__geoeffnet = [];
    window.einheitBewertenOpen = d => window.__geoeffnet.push(d);
    knoepfe[0]?.click();
    return { texte, geoeffnet: window.__geoeffnet.slice() };
  });
  const fe = s.fehler(); await s.schliessen();

  const kurz = d => d.slice(8, 10) + "." + d.slice(5, 7) + ".";
  const hat = d => r.texte.some(t => t.includes(kurz(d)));
  if (hat(t12)) probleme.push(`a) Die vor v630 bewertete Einheit ${kurz(t12)} steht wieder als To-do da`);
  if (!hat(t1)) probleme.push(`b) Die Einheit von gestern (${kurz(t1)}) fehlt: ${r.texte.join(" | ")}`);
  else if (!r.texte[0].includes(kurz(t1))) probleme.push(`b) Gestern steht nicht vorn: ${r.texte.join(" | ")}`);
  if (!hat(t5)) probleme.push(`Die nur von einem Kollegen bewertete Einheit ${kurz(t5)} fehlt – jeder bewertet selbst`);
  if (r.texte.length > 2) probleme.push(`${r.texte.length} To-dos statt höchstens zwei`);
  if (r.geoeffnet[0] !== t1) probleme.push(`c) Antippen öffnet ${JSON.stringify(r.geoeffnet)} statt ${t1}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`To-dos: ${r.texte.join(" | ")}`, `Antippen öffnet ${r.geoeffnet.join(",")}`);
  return h.ergebnis("v633 To-do „Einheit nachbereiten“: neueste zuerst, alte Bewertungen zählen, öffnet die Einheit", !probleme.length, probleme.concat(zeilen));
};
