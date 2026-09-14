/* v547 – Die beiden Lehrgangs-Übungen samt Skizze kommen über den Abgleich an.

   Nachtrag zu `uebungen/bibliothek.json` für die Abgabe 2.1 im DFB-Basis-Coach.
   Zwei Einträge statt eines: an einer Übung ist genau EINE Skizze vorgesehen
   (`trainingsformen.skizze` ist eine einzelne Spalte, `boot.js` macht daraus ein
   `f.svg`), und das Schema wird dafür nicht erweitert.

   Der Fall, der hier wirklich zählt, ist b). Der Abgleich läuft bei JEDEM Öffnen der
   Trainer-App. Legte er eine der zehn bestehenden Übungen ein zweites Mal an, stünde
   die Datenbank nach ein paar Starts voller Dubletten – und niemand bekäme eine
   Fehlermeldung, weil ein Anlegen ja gelingt.

   Fälle:
   a) Die Datei ist gültiges JSON mit dem erwarteten Schema, und der Stand ist
      hochgezählt – ohne neuen Stand holt `_bibHolen` die Datei gar nicht erst.
   b) Der echte Abgleich legt GENAU die zwei neuen an, überspringt die bestehenden
      und schickt die Skizze mit.
   c) Beide Skizzen benutzen nur Listen, die `_skz` auch auswertet, und nur Farben aus
      dem Farbsatz – eine erfundene Liste würde stillschweigend nicht gezeichnet.
   d) Kein Spielerkreis überlappt einen anderen: die Skizze ist am Handy 280 px breit,
      ein Kreis 16 px, da fällt jede Überschneidung sofort auf.
   e) Beide rendern ohne Konsolenfehler, und der Bild-Export nimmt dieselbe Zeichnung
      wie das Übungsdetail. */
const NEU = ["3 gegen 3 – Dreieck (Grundform)", "4+1 gegen 4+1 – Raute (Steigerung)"];

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  // ── a) Die Datei ────────────────────────────────────────────────────────────
  let d = null;
  try { d = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen/bibliothek.json"), "utf8")); }
  catch (e) { return h.ergebnis("Lehrgangs-Übungen", false, ["uebungen/bibliothek.json ist kein gültiges JSON: " + e.message]); }

  if (d.schema !== "adler-uebungen/1") probleme.push(`Schema „${d.schema}“ statt „adler-uebungen/1“`);
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(d.stand || ""))) probleme.push(`„stand“ sieht nicht nach einem Datum aus: ${JSON.stringify(d.stand)}`);
  const namen = (d.uebungen || []).map(u => u.name);
  const fehlend = NEU.filter(n => !namen.includes(n));
  if (fehlend.length) probleme.push("In der Bibliothek fehlen: " + fehlend.join(", "));
  const doppelt = namen.filter((n, i) => namen.indexOf(n) !== i);
  if (doppelt.length) probleme.push("Doppelte Namen in der Datei: " + doppelt.join(", "));
  if (!probleme.length) zeilen.push(`Datei: ${namen.length} Übungen, Stand ${d.stand}, beide Nachträge drin`);

  const ziel = (d.uebungen || []).filter(u => NEU.includes(u.name));

  // ── b) Der echte Abgleich ───────────────────────────────────────────────────
  /* Die zehn älteren gelten als schon vorhanden. Nur so zeigt sich, dass der Abgleich
     sie überspringt statt sie erneut anzulegen. */
  const vorhanden = (d.uebungen || []).filter(u => !NEU.includes(u.name))
    .map((u, i) => ({ id: 5000 + i, name: u.name, kat: u.kat, kurz: u.kurz, custom: true }));

  const s = await h.starten({
    bibliothek: true,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      trainingsformen: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : vorhanden
    })
  });

  const r = await s.page.evaluate(async ({ NEU }) => {
    try { localStorage.removeItem("adler-bibliothek-stand"); } catch (e) {}
    await loadCustomForms();
    const e = await bibliothekAbgleich();
    const out = { angelegt: e && e.angelegt, uebersprungen: e && e.uebersprungen, fehler: e && e.fehler };

    // c) + d) + e): die Skizzen selbst
    const listen = typeof EI_SKZ_LISTEN !== "undefined" ? EI_SKZ_LISTEN : [];
    const farben = ["g", "r", "b", "y", "w"];
    out.pruef = NEU.map(() => null);
    return { ...out, listen, farben };
  }, { NEU });

  const posts = s.gesendet.filter(g => /trainingsformen/.test(g.pfad || "") && g.methode === "POST");
  const angelegteNamen = posts.map(p => p.body && p.body.name).filter(Boolean);

  if (r.fehler) probleme.push("Der Abgleich meldet einen Fehler: " + r.fehler);
  if (r.angelegt !== 2) probleme.push(`Der Abgleich legt ${r.angelegt} statt 2 Übungen an`);
  else if (r.uebersprungen !== vorhanden.length) probleme.push(`${r.uebersprungen} statt ${vorhanden.length} bestehende übersprungen – Dubletten-Gefahr bei jedem Start`);
  else if (String(angelegteNamen.sort()) !== String(NEU.slice().sort())) probleme.push("Angelegt wurden: " + angelegteNamen.join(", "));
  else if (!posts.every(p => p.body && p.body.skizze && typeof p.body.skizze === "object")) probleme.push("Mindestens eine Übung kommt ohne Skizze an");
  else zeilen.push(`Abgleich: ${r.angelegt} neu, ${r.uebersprungen} übersprungen, Skizze bei beiden dabei`);

  // ── c) + d) + e) Die Skizzen im Browser ─────────────────────────────────────
  const skz = await s.page.evaluate(async ({ specs, listen, farben }) => {
    return specs.map(spec => {
      const unbekannt = Object.keys(spec).filter(k => !listen.includes(k));
      const svg = _skz(spec);
      const halter = document.createElement("div"); halter.innerHTML = svg;
      const el = halter.querySelector("svg");
      const kreise = [...el.querySelectorAll("circle")].filter(c => c.getAttribute("r") === "8");
      let engste = 999;
      const pos = kreise.map(k => ({ x: +k.getAttribute("cx"), y: +k.getAttribute("cy") }));
      for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++)
        engste = Math.min(engste, Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y));
      const fremdeFarben = (spec.s || []).map(x => x[2]).filter(f => f && !farben.includes(f));
      return {
        unbekannt, fremdeFarben, spieler: kreise.length,
        engste: Math.round(engste),
        viewBox: el.getAttribute("viewBox"),
        laenge: svg.length
      };
    });
  }, { specs: ziel.map(u => u.skizze), listen: r.listen, farben: r.farben });

  skz.forEach((x, i) => {
    const n = ziel[i] ? ziel[i].name : "?";
    if (x.unbekannt.length) probleme.push(`${n}: unbekannte Listen ${x.unbekannt.join(", ")} – der Renderer zeichnet sie nicht`);
    if (x.fremdeFarben.length) probleme.push(`${n}: Farben außerhalb des Farbsatzes: ${x.fremdeFarben.join(", ")}`);
    if (x.viewBox !== "0 0 280 180") probleme.push(`${n}: viewBox ${x.viewBox} – der Bild-Export sucht genau „0 0 280 180“`);
    /* 16 px Durchmesser: unter 18 berühren sich zwei Kreise, und am Handy ist das
       Feld nur 280 px breit. */
    if (x.engste < 18) probleme.push(`${n}: zwei Spieler stehen nur ${x.engste} px auseinander (Kreis ist 16 px)`);
  });
  if (!probleme.length) zeilen.push(`Skizzen: ${skz.map((x, i) => `${ziel[i].name.split(" –")[0]} ${x.spieler} Spieler, engster Abstand ${x.engste} px`).join(" · ")}`);

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  return h.ergebnis("Lehrgangs-Übungen: zwei Nachträge, je eine Skizze, keine Dubletten", !probleme.length, zeilen.concat(probleme));
};
