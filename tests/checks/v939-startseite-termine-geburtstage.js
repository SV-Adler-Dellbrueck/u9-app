/* v939 · Trainer-Startseite (Charles 22.11.2026, mit Bildschirmfoto): „‚Woher die Zahlen kommen‘ kann weg und dafür dann
   ‚Alle 24 Termine‘. Wenn man darauf klickt, erweitert sich die Liste. Geburtstage ganz unten. Von Eltern, Kindern und Trainern.“

   a) „Diese Woche“ hat keine Zeile „Woher die Zahlen kommen“ mehr.
   b) Unten in der Karte steht „Alle N Termine“ (N = alle Termine ab heute); ein Tipp klappt die Liste in derselben Karte auf
      (mehr Zeilen, Titel „Alle Termine“, Knopf „Weniger anzeigen“, aria-expanded), ein zweiter klappt sie zu.
      Der alte Knopf unter den Geburtstagen ist weg.
   c) Die Geburtstage stehen ganz unten (direkt vor der Versionszeile) – Kinder, Eltern und Trainer („Trainer · in n Tagen“).
   d) Orga · Einstellungen hat die Kachel „Mein Geburtstag“; das Fenster ist ein Dialog und speichert über
      trainer_geburtstag_setzen (nur der eigene, ohne Alter).
   e) Die Migration legt die Spalte an und schreibt nur die eigene Zeile, nur für Trainer, nicht für anon. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const ab = d => h.tagePlus(d);
  const termine = [1, 3, 5, 9, 12, 16, 20, 25].map((d, i) => ({ id: i + 1, datum: ab(d), typ: "training", uhrzeit: "16:45", trainer_status: {} }));
  const jahrTag = d => ab(d).slice(5);
  const s = await h.starten({ hoehe: 2400, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine, blitz_ratings: [], team_einstellungen: [{ id: 1, bewertung_ab: "2026-01-01" }],
    eltern_angaben: [{ vorname: "Elter", nachname: "Eins", geburtstag: "1984-" + jahrTag(2) }],
    profiles: (u) => /geburtstag=not\.is\.null/.test(u.search) ? [{ anzeigename: "Trainer B", geburtstag: "1980-" + jahrTag(4) }] : [{ anzeigename: "Trainer A", geburtstag: null }],
    rpc: { trainer_geburtstag_setzen: () => ({ status: 204, body: "" }) } }) });
  await h.sichtbarMachen(s.page, "#home-content");
  const r = await s.page.evaluate(async () => {
    await loadKader(); window.trainerMe = async () => "Trainer A";
    document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) { m.style.display = ""; if (getComputedStyle(m).display === "none") m.style.display = "block"; }
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const bis = async f => { for (let i = 0; i < 160 && !f(); i++) await warte(50); };
    const txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    go("home"); await bis(() => document.getElementById("woche-alle") && /Geburtstage/.test(txt(document.getElementById("home-geb"))));
    const karte = () => document.getElementById("woche-alle")?.closest(".card");
    const out = { quelle: /Woher die Zahlen/.test(txt(document.getElementById("home-woche"))) || !!document.querySelector(".woche-quelle"),
      knopf: txt(document.getElementById("woche-alle")), inKarte: !!karte(), zeilenVor: karte()?.querySelectorAll(".woche-zeile").length || 0,
      alterKnopf: !!document.getElementById("trainer-alle-termine-slot") };
    document.getElementById("woche-alle").click(); await bis(() => /Weniger/.test(txt(document.getElementById("woche-alle"))));
    out.auf = { knopf: txt(document.getElementById("woche-alle")), aria: document.getElementById("woche-alle").getAttribute("aria-expanded"), titel: txt(karte()?.firstElementChild), zeilen: karte()?.querySelectorAll(".woche-zeile").length || 0 };
    document.getElementById("woche-alle").click(); await bis(() => /Alle \d+ Termine/.test(txt(document.getElementById("woche-alle"))));
    out.zu = { knopf: txt(document.getElementById("woche-alle")), zeilen: karte()?.querySelectorAll(".woche-zeile").length || 0 };
    const box = document.getElementById("home-geb"), nach = box.nextElementSibling;
    out.geb = { text: txt(box), letzte: !!nach && nach.id === "app-version" };
    // d) Einstellungen
    const kachel = typeof kachelOpen === "function" ? (kachelOpen("orga"), await warte(300), [...document.querySelectorAll("button,[role=button],.kk-tile,div")].find(b => /Mein Geburtstag/.test(b.textContent) && b.children.length < 6)) : null;
    out.kachel = !!kachel;
    await trainerGeburtstagOpen(); await warte(100);
    const dlg = document.getElementById("tgeb-modal");
    out.dialog = { rolle: dlg?.getAttribute("role"), modal: dlg?.getAttribute("aria-modal"), feld: dlg?.querySelector("input[type=date]")?.getBoundingClientRect().height || 0 };
    dlg.querySelector("#tgeb-datum").value = "1980-05-17";
    await trainerGeburtstagSpeichern(document.getElementById("tgeb-speichern")); await warte(100);
    out.dialog.zu = !document.getElementById("tgeb-modal");
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const rpc = s.gesendet.filter(x => x.pfad.endsWith("/rpc/trainer_geburtstag_setzen"));
  await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    if (r.quelle) probleme.push("a) „Woher die Zahlen kommen“ steht noch da");
    if (!new RegExp(`^🗓️ Alle ${termine.length} Termine ?›$`).test(r.knopf) || !r.inKarte || r.alterKnopf) probleme.push(`b) Knopf: „${r.knopf}“, in der Karte ${r.inKarte}, alter Knopf ${r.alterKnopf}`);
    if (!/Weniger anzeigen/.test(r.auf.knopf) || r.auf.aria !== "true" || !/Alle Termine/.test(r.auf.titel) || r.auf.zeilen !== termine.length || r.auf.zeilen <= r.zeilenVor) probleme.push(`b) aufgeklappt: ${JSON.stringify(r.auf)} (vorher ${r.zeilenVor})`);
    if (r.zu.zeilen !== r.zeilenVor) probleme.push(`b) zugeklappt: ${JSON.stringify(r.zu)}`);
    if (!r.geb.letzte || !/Elternteil · in 2 Tagen/.test(r.geb.text) || !/Trainer B Trainer · in 4 Tagen/.test(r.geb.text)) probleme.push(`c) Geburtstage: ${JSON.stringify(r.geb)}`);
    if (!r.kachel) probleme.push("d) Kachel „Mein Geburtstag“ fehlt unter Orga");
    if (r.dialog.rolle !== "dialog" || r.dialog.modal !== "true" || r.dialog.feld < 44 || !r.dialog.zu) probleme.push(`d) Dialog: ${JSON.stringify(r.dialog)}`);
    if (rpc.length !== 1 || !rpc[0].body || rpc[0].body.p_geb !== "1980-05-17") probleme.push("d) Speichern: " + JSON.stringify(rpc.map(x => x.body)));
  }
  const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261122_v939_trainer_geburtstag.sql"), "utf8");
  for (const [re, was] of [[/add column if not exists geburtstag date/, "Spalte"], [/security definer/, "security definer"], [/is_trainer\(\)/, "nur Trainer"], [/where id = auth\.uid\(\)/, "nur die eigene Zeile"], [/revoke all on function public\.trainer_geburtstag_setzen\(date\) from public, anon/, "anon gesperrt"]])
    if (!re.test(sql)) probleme.push("e) Migration: " + was);
  zeilen.push(`a) ohne Quellenzeile · b) „${r.knopf || ""}“: ${r.zeilenVor || 0} → ${(r.auf || {}).zeilen || 0} → ${(r.zu || {}).zeilen || 0} Zeilen · c) Geburtstage zuletzt: „${((r.geb || {}).text || "").slice(0, 90)}“ · d) Dialog speichert 1× · e) Migration 5/5`);
  return h.ergebnis("v939 Startseite: Alle Termine aufklappen, Geburtstage ganz unten (auch Trainer)", !probleme.length, zeilen.concat(probleme));
};
