/* v546 – „Spieler verwalten“ als ruhige Liste.

   Vorher standen fünfzehn Kinder mal zwölf Bedienelemente gleichzeitig auf einem
   Bildschirm — rund hundertachtzig Felder, alle gleich laut. Gesucht wird darin
   aber immer genau ein Kind.

   Der wichtigste Fall ist e). Gespeichert wird weiter ALLES auf einmal: die
   zugeklappten Felder stehen im Dokument, nur nicht im Weg. Ginge beim Zuklappen
   eine Zeile verloren, käme sie ohne `aktiv` zurück und wäre danach ausgetragen —
   und zwar lautlos.

   Fälle:
   a) Je Kind eine Zeile mit Nummer, Name und Zustand; die Felder sind zu.
   b) Ein Tipp öffnet genau eine Zeile, ein Tipp auf die nächste schliesst die erste.
   c) Der Kopf zieht beim Umbenennen mit — sonst stünde nach dem Zuklappen der alte Name.
   d) Die Suche blendet aus, was nicht passt.
   e) Genau eine Hauptaktion mit 56 px, und sie schickt weiter alle Zeilen.
   f) Der Zu-/Absage-Link steht nicht mehr in der Stammdatenzeile, sondern dort, wo
      die Familie verwaltet wird: im Kontakte-Fenster.
   g) Der Zustand steht als Text im Chip, nicht nur als Farbe (CLAUDE.md). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const RAUS = h.KINDER[14];

  const kader = h.kaderZeilen({ inaktiv: [RAUS] }).map((k, i) =>
    i === 1 ? { ...k, medical: "Asthma-Spray in der Tasche" } : k);

  const s = await h.starten({ hoehe: 2600, supabase: h.supabaseAttrappe({ kader }) });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader();
    kaderEditOpen();
    await warte(300);
    const modal = document.getElementById("kader-edit-modal");
    if (!modal) return { fensterFehlt: true };
    const out = {};
    const rows = () => [...modal.querySelectorAll(".kader-edit-row")];
    const offen = () => rows().filter(z => z.querySelector(".ke-felder").style.display !== "none").length;

    // a) Zeilen, Köpfe, alles zu
    out.zahl = rows().length;
    out.offenZuBeginn = offen();
    const kopf0 = rows()[0].querySelector(".ke-kopf");
    out.kopfHoehe = Math.round(kopf0.getBoundingClientRect().height);
    out.kopfText = kopf0.textContent.replace(/\s+/g, " ").trim();
    out.ariaZu = rows().every(z => z.querySelector(".ke-kopf").getAttribute("aria-expanded") === "false");

    // g) Chips mit Text
    out.chips = rows().map(z => (z.querySelector(".ke-kopf-chips").textContent || "").trim()).filter(Boolean);

    // b) Öffnen, dann eine andere öffnen
    rows()[0].querySelector(".ke-kopf").click(); await warte(120);
    out.nachErstem = offen();
    out.ariaErste = rows()[0].querySelector(".ke-kopf").getAttribute("aria-expanded");
    rows()[1].querySelector(".ke-kopf").click(); await warte(120);
    out.nachZweitem = offen();
    out.ersteWiederZu = rows()[0].querySelector(".ke-felder").style.display === "none";

    // c) Umbenennen, dann zuklappen
    const feld = rows()[1].querySelector(".ke-name");
    feld.value = "Kind B neu";
    feld.dispatchEvent(new Event("input", { bubbles: true }));
    out.kopfNachUmbenennen = rows()[1].querySelector(".ke-kopf-name").textContent.trim();
    rows()[1].querySelector(".ke-kopf").click(); await warte(120);
    out.kopfNachZuklappen = rows()[1].querySelector(".ke-kopf-name").textContent.trim();

    // d) Suche
    const suche = document.getElementById("ke-filter");
    suche.value = "Kind C";
    suche.dispatchEvent(new Event("input", { bubbles: true }));
    await warte(80);
    out.sichtbarGefiltert = rows().filter(z => z.style.display !== "none").length;
    suche.value = "";
    suche.dispatchEvent(new Event("input", { bubbles: true }));
    await warte(80);
    out.sichtbarWieder = rows().filter(z => z.style.display !== "none").length;

    /* e) Hauptaktion. Die Zeilenköpfe sind ebenfalls 56 px hoch – sie sind aber
       Listenzeilen und keine Aktionen, deshalb zählen sie hier nicht mit. */
    const knoepfe = [...modal.querySelectorAll("button")]
      .filter(b => !b.classList.contains("ke-kopf") && b.getBoundingClientRect().height >= 56);
    out.haupt = knoepfe.map(b => b.textContent.trim());
    const speichern = [...modal.querySelectorAll("button")].find(b => /Speichern/.test(b.textContent));
    await kaderSaveAll(speichern);
    await warte(400);

    // f) Wo der Zu-/Absage-Link jetzt steht
    out.imEditor = !!modal.querySelector('[onclick*="kindLinkShare"]');
    return out;
  });

  if (r.fensterFehlt) {
    probleme.push("kaderEditOpen öffnet kein Fenster");
  } else {
    if (r.zahl !== 15) probleme.push(`${r.zahl} Zeilen statt 15`);
    else if (r.offenZuBeginn !== 0) probleme.push(`${r.offenZuBeginn} Zeilen stehen beim Öffnen schon auf`);
    else if (!r.ariaZu) probleme.push("aria-expanded meldet nicht „zu“");
    else if (r.kopfHoehe < 56) probleme.push(`Die Zeilenköpfe sind ${r.kopfHoehe} px hoch, gefordert sind 56`);
    else zeilen.push(`Liste: ${r.zahl} Zeilen à ${r.kopfHoehe} px, alle zu · erste „${r.kopfText.slice(0, 40)}“`);

    if (r.nachErstem !== 1) probleme.push(`Nach dem ersten Tipp sind ${r.nachErstem} Zeilen offen`);
    else if (r.ariaErste !== "true") probleme.push("Die offene Zeile meldet kein aria-expanded=true");
    else if (r.nachZweitem !== 1 || !r.ersteWiederZu) probleme.push(`Nach dem zweiten Tipp sind ${r.nachZweitem} offen, erste zu: ${r.ersteWiederZu}`);
    else zeilen.push("Aufklappen: immer genau eine Zeile, die vorige schliesst mit");

    if (r.kopfNachUmbenennen !== "Kind B neu" || r.kopfNachZuklappen !== "Kind B neu")
      probleme.push(`Der Kopf zieht nicht mit: „${r.kopfNachUmbenennen}“ / nach dem Zuklappen „${r.kopfNachZuklappen}“`);
    else zeilen.push(`Kopf: zieht beim Umbenennen mit („${r.kopfNachZuklappen}“)`);

    if (r.sichtbarGefiltert !== 1) probleme.push(`Die Suche nach „Kind C“ lässt ${r.sichtbarGefiltert} Zeilen stehen`);
    else if (r.sichtbarWieder !== 15) probleme.push(`Nach dem Leeren stehen ${r.sichtbarWieder} von 15 Zeilen`);
    else zeilen.push("Suche: 15 → 1 → 15");

    if (r.haupt.length !== 1) probleme.push(`${r.haupt.length} Knöpfe mit 56 px (${r.haupt.join(", ")}) – genau einer gehört dahin`);
    else zeilen.push(`Hauptaktion: „${r.haupt[0]}“`);

    const mitText = r.chips.filter(c => /[A-Za-zÄÖÜäöü]/.test(c)).length;
    if (mitText !== r.chips.length) probleme.push("Ein Zustand steht ohne Text im Chip – Farbe allein trägt keine Bedeutung");
    else zeilen.push(`Zustand: ${r.chips.length} Zeilen mit Chip, alle mit Text (z. B. „${r.chips[0]}“)`);

    if (r.imEditor) probleme.push("Der Zu-/Absage-Link steht weiter in der Stammdatenzeile");
  }

  // e) Speichern schickt weiter ALLE Zeilen, mit aktiv
  const post = s.gesendet.find(g => /\/kader$/.test(g.pfad || "") && g.methode === "POST");
  if (!post) probleme.push("Speichern schickt nichts an kader");
  else {
    const body = [].concat(post.body || []);
    if (body.length !== 15) probleme.push(`${body.length} von 15 Zeilen gespeichert – zugeklappte Zeilen dürfen nicht verlorengehen`);
    else if (body.some(x => !("aktiv" in x))) probleme.push("In mindestens einer Zeile fehlt aktiv");
    else if (body.filter(x => x.aktiv === false).length !== 1) probleme.push("Der Zustand „nicht im Kader“ überlebt das Speichern nicht");
    else zeilen.push(`Speichern: ${body.length} Zeilen, aktiv überall gesetzt, 1 ausgetragen`);
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  // f) Der Link im Kontakte-Fenster
  const fs = require("fs"), path = require("path");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const kontakte = views.slice(views.indexOf("function kontakteEditOpen"), views.indexOf("async function kontakteRender"));
  if (!/kindLinkShare/.test(kontakte)) probleme.push("Im Kontakte-Fenster fehlt der Zu-/Absage-Link");
  else if (!/role","dialog"/.test(kontakte)) probleme.push("Dem Kontakte-Fenster fehlt role=dialog – der Fokus-Trap greift dann nicht");
  else zeilen.push("Zu-/Absage-Link: im Kontakte-Fenster, wo die Familie verwaltet wird");

  return h.ergebnis("Spieler verwalten: eine Zeile je Kind, eine offen, ein Speichern", !probleme.length, zeilen.concat(probleme));
};
