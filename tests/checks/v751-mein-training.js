/* v751 · „Mein Training“ (Kabine) und „Trainingsideen der Kinder“ (Trainer)
   Charles 04.10.: „Es soll auch ein Training theoretisch gestalten können. Wie für einen Trainer, aber
   kindgerecht.“ Kacheln: „Auch an Trainer schicken“. Die Rechte prüft tests/sql/v751-kind-training.sql.
   a) Kabine: Kachel „Mein Training“ unter „Mehr entdecken“
   b) Drei Teile (Aufwärmen, Übung, Abschlussspiel); ohne Teil sind Schicken und Zeigen aus; alle Knöpfe ≥ 44 px
   c) „Übung aussuchen“ zeigt nur die feste Kinder-Auswahl (höchstens fünf je Teil, PO 04.10.); Minuten als Knöpfe
   d) „Selbst zeichnen“ öffnet das Brett mit eigenem Speicherplatz; ein Mitspieler steht mit Vornamen in der
      Skizze, „✓ Fertig“ übernimmt sie; das Taktikbrett des Kindes bleibt unberührt
   e) „An den Trainer schicken“ schreibt kind_training mit spieler_id und genau art/uebung|brett/minuten;
      „Schon geschickt“ zeigt den Dank des Trainers
   f) Kein Textfeld in der Kabine
   g) Trainer: Karte „Trainingsideen der Kinder · 1 neu“ auf der Startseite; die Liste nennt das Kind mit
      Vornamen und die Teile; Öffnen markiert gesehen, „Danke“ schreibt danke_am */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const posts = [];
  const s = await h.starten({ start: "/eltern/index.html", bibliothek: true, warten: 2500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }],
    kind_training: (u, req) => { if (req.method() === "POST") { posts.push(req.postData()); return { status: 201, body: "" }; }
      return [{ id: 5, created_at: "2026-10-03T10:00:00Z", gesehen_am: "2026-10-03T12:00:00Z", danke_am: "2026-10-03T12:00:00Z", teile: [{ art: "uebung", uebung: "x", minuten: 5 }] }]; } }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 80 && (typeof kabineMeinTraining !== "function" || typeof kabineHome !== "function"); i++) await w(50);
    if (typeof kabineMeinTraining !== "function") return { fehlt: true };
    document.querySelectorAll(".modal-overlay,[role=dialog]").forEach(d => d.remove());
    const k = document.createElement("div"); k.id = "kabine"; k.innerHTML = '<div id="kabine-body" style="display:flex;flex-direction:column;min-height:900px;background:#1e3a8a"></div>';
    document.body.appendChild(k);
    window._elternKids = [{ spieler_id: 1, kader: { id: 1, name: "Testa Beispiel" } }];
    kabineGalleryData = [{ spieler_id: 1, name: "Testa Beispiel" }, { spieler_id: 2, name: "Kind B" }];
    ["adler-mein-training-1", "adler-brett-kind-uebung"].forEach(x => localStorage.removeItem(x));
    localStorage.setItem("adler-brett-kind", JSON.stringify({ form: "4+1", toks: [{ t: "ball", x: 1, y: 1 }], striche: [] }));
    const out = {};
    kabineHome(); await w(50);
    out.a = [...document.querySelectorAll("#kab-mehr button")].some(b => /Mein Training/.test(b.textContent));
    kabineMeinTraining(); await w(600);
    const body = document.getElementById("kabine-body");
    const aus = sel => { const b = body.querySelector(sel); return !!(b && b.disabled); };
    out.b = { teile: [...body.querySelectorAll(".kt-teil .kt-kopf")].map(x => x.textContent.trim()), schickenAus: aus(".kt-haupt"),
      klein: [...body.querySelectorAll("button")].filter(b => b.getBoundingClientRect().height < 44).map(b => b.textContent.trim()) };
    ktWahl(0); await w(50);
    const wahl = document.getElementById("kt-wahl");
    out.c = { role: wahl && wahl.getAttribute("role"), karten: wahl ? wahl.querySelectorAll(".kt-karte").length : 0,
      namen: wahl && wahl._liste ? wahl._liste.map(u => u.name) : [],
      mitBild: wahl ? wahl.querySelectorAll(".kt-karte svg").length : 0 };
    wahl.querySelector(".kt-karte").click(); await w(50);
    ktMinuten(0, 5); await w(30);
    out.c.min = [...body.querySelectorAll(".kt-teil")][0].querySelector('[aria-pressed="true"]').textContent.trim();
    ktZeichnen(1); await w(80);
    out.d = { fertigKnopf: !!body.querySelector(".br-fertig"), titel: (body.querySelector(".br-titel") || {}).textContent };
    brettForm("leer"); brettNeu("wir", 1); brettNeu("ball"); await w(20);
    brettKabineFertig(); await w(80);
    const t2 = [...body.querySelectorAll(".kt-teil")][1];
    out.d.name = (t2.querySelector(".kt-name") || {}).textContent; out.d.svgText = [...t2.querySelectorAll("svg text")].map(x => x.textContent).join(",");
    out.d.taktikbrettUnberuehrt = JSON.parse(localStorage.getItem("adler-brett-kind")).toks.length === 1;
    out.e = { schickenAn: !aus(".kt-haupt") };
    await ktSchicken(); await w(400);
    out.e.geschickt = (document.getElementById("kt-geschickt") || {}).textContent;
    out.f = body.querySelectorAll("input,textarea,[contenteditable]").length;
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v751 Mein Training", false, ["kabineMeinTraining fehlt"]);
  if (!r.a) probleme.push("a) Kachel „Mein Training“ fehlt unter „Mehr entdecken“");
  zeilen.push("a) Kachel „📋 Mein Training“ unter „Mehr entdecken“");
  if (r.b.teile.join("|") !== "🔥 1. Aufwärmen|⚽ 2. Übung|🏆 3. Abschlussspiel" || !r.b.schickenAus || r.b.klein.length) probleme.push(`b) ${JSON.stringify(r.b)}`);
  zeilen.push(`b) ${r.b.teile.join(" · ")} – Schicken aus, solange nichts geplant ist`);
  const soll = ["Warm up Adler", "Adler 1 – Aktivierung", "Adler 2 – Dribbelstaffel", "Hai & Fische", "Zombieball"];
  if (r.c.role !== "dialog" || r.c.karten !== 5 || JSON.stringify(r.c.namen) !== JSON.stringify(soll) || r.c.mitBild < 3 || r.c.min !== "5 Min.") probleme.push(`c) ${JSON.stringify(r.c)}`);
  zeilen.push(`c) Aufwärmen: genau ${r.c.karten} Karten (${r.c.namen.join(", ")}), ${r.c.mitBild} mit Skizze, Minuten als Knöpfe`);
  if (!r.d.fertigKnopf || r.d.name !== "Meine eigene Übung" || !/Testa/.test(r.d.svgText) || !r.d.taktikbrettUnberuehrt) probleme.push(`d) ${JSON.stringify(r.d)}`);
  zeilen.push(`d) Eigene Skizze mit „${r.d.svgText}“, Taktikbrett unberührt`);
  let body = null; try { body = JSON.parse(posts[0] || "null"); } catch (e) {}
  const formOk = body && body.spieler_id === 1 && Array.isArray(body.teile) && body.teile.length === 2
    && JSON.stringify(Object.keys(body.teile[0]).sort()) === '["art","minuten","uebung"]' && body.teile[0].minuten === 5
    && JSON.stringify(Object.keys(body.teile[1]).sort()) === '["art","brett","minuten"]' && body.teile[1].art === "uebung";
  if (!r.e.schickenAn || posts.length !== 1 || !formOk || !/Danke vom Trainer/.test(r.e.geschickt || "")) probleme.push(`e) ${posts[0]} · ${r.e.geschickt}`);
  zeilen.push(`e) gesendet: spieler_id 1, Teile ${body ? body.teile.map(t => t.art + (t.uebung ? ":Übung" : ":Skizze") + "/" + t.minuten).join(", ") : "?"} · „Danke vom Trainer!“ sichtbar`);
  if (r.f) probleme.push(`f) ${r.f} Textfelder`);
  if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | "));

  // g) Trainer
  const patches = [];
  const ideen = [{ id: 9, spieler_id: 1, created_at: "2026-10-04T09:00:00Z", gesehen_am: null, danke_am: null,
    teile: [{ art: "aufwaermen", uebung: "Warm up Adler", minuten: 10 }, { art: "abschluss", brett: { form: "leer", toks: [{ t: "wir", x: 45, y: 100, n: "Kind" }], striche: [] }, minuten: 15 }] }];
  const t = await h.starten({ warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
    kind_training: (u, req) => { if (req.method() === "PATCH") { patches.push(u.search + " " + req.postData()); return { status: 204, body: "" }; } return ideen; } }) });
  const g = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof kindTrainingHomeKarte !== "function"; i++) await w(50);
    if (typeof loadKader === "function") await loadKader();
    let slot = document.getElementById("home-kindideen");   // die Startseite hat ihn schon
    if (!slot) { slot = document.createElement("div"); slot.id = "home-kindideen"; document.body.appendChild(slot); }
    await kindTrainingHomeKarte("home-kindideen");
    const karte = slot.textContent.replace(/\s+/g, " ").trim();
    await kindTrainingListe(); await w(100);
    const m = document.getElementById("kt-liste");
    const out = { karte, role: m && m.getAttribute("role"), text: m ? m.textContent.replace(/\s+/g, " ") : "", bilder: m ? m.querySelectorAll("svg").length : 0 };
    await kindTrainingDanke(9); await w(100);
    return out;
  });
  const ft = t.fehler(); await t.schliessen();
  if (!/Trainingsideen der Kinder/.test(g.karte) || !/1 neu/.test(g.karte) || g.role !== "dialog" || !/Kind · 04\.10\. · 25 Min\./.test(g.text) || !/Warm up Adler/.test(g.text) || g.bilder < 2
      || !patches.some(p => /id=in\.\(9\)/.test(p) && /gesehen_am/.test(p)) || !patches.some(p => /id=eq\.9/.test(p) && /danke_am/.test(p))) probleme.push(`g) ${JSON.stringify(g).slice(0, 400)} · ${patches.join(" | ")}`);
  zeilen.push(`g) Trainer: „${g.karte.slice(0, 60)}“ · Liste mit Vornamen, ${g.bilder} Bilder · gesehen und Danke geschrieben`);
  if (ft.length) probleme.push("Konsole Trainer: " + ft.slice(0, 2).join(" | "));
  return h.ergebnis("v751 Mein Training: Kinder planen ein Training und schicken es dem Trainer", !probleme.length, probleme.length ? probleme : zeilen);
};
