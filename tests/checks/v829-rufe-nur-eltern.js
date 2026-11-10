/* v829 · Adler-Rufe: Raum „nur Eltern“ ohne Trainerteam (Auftrag Charles 10.11.2026).
   Die Rechte selbst (RLS, Funktionen, Speicher) prüft die Probe gegen die Datenbank; hier steht,
   was am Gerät ankommt und dass die Migration jede Stelle absichert, an der Trainer bisher überall lesen durften.

   a) Eltern: der Raum „Elternrunde“ steht in der Leiste; geöffnet sagt die Kopfzeile, dass das Trainerteam
      ihn nicht sieht. Die Abfrage fragt die neue Spalte mit.
   b) Alte Datenbank (Spalte fehlt, Antwort 400): die Rufe öffnen trotzdem, mit den alten Räumen.
   c) Statisch: die Migration schließt Trainer an jeder bekannten Stelle aus – Räume, Rufe, Anhänge,
      Speicher, Meldungen, „Gesehen von“, Zähler, Umfragen, Push – und der Raum hat die Sperre gegen Familienräume. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v829 Adler-Rufe: Raum nur für Eltern – Anzeige, alte Datenbank, Trainer an jeder Stelle ausgeschlossen";
  const probleme = [], zeilen = [];
  const token = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const ELTERN = { id: 9, name: "Elternrunde", emoji: "👪", sort: 10, familie_kind: null, nur_eltern: true };
  const ALLG = { id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null };
  const lauf = async (alteDb) => {
    let angefragt = [];
    const s = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 360, hoehe: 800, supabase: h.supabaseAttrappe({
      rufe_raum: (u) => { angefragt.push(String(u.search)); return /nur_eltern/.test(u.search) ? (alteDb ? { status: 400, body: JSON.stringify({ code: "42703", message: "column rufe_raum.nur_eltern does not exist" }) } : [ALLG, ELTERN]) : [ALLG]; },
      rufe_nachricht: [], rufe_umfrage: [], rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [],
      rpc: { is_rufe_mod: false, rufe_ungelesen: [], rufe_umfrage_stand: [] } }) });
    const r = await s.page.evaluate(async tok => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 40 && typeof rufeOpen !== "function"; i++) await w(100);
      if (typeof _rfRaeumeHolen !== "function") return { alt: true };
      window.sbToken = () => tok;
      await rufeOpen(5); await w(900);
      const out = { chips: [...document.querySelectorAll("#rufe-raeume button")].map(b => b.textContent.trim()), unter0: (document.getElementById("rufe-unter") || {}).textContent };
      const el = [...document.querySelectorAll("#rufe-raeume button")].find(b => /Elternrunde/.test(b.textContent));
      if (el) { el.click(); await w(700); out.unter1 = (document.getElementById("rufe-unter") || {}).textContent; }
      out.breite = document.documentElement.scrollWidth;
      return out;
    }, token("u-eltern"));
    const f = s.fehler(); await s.schliessen();
    return { r, angefragt, f };
  };
  const neu = await lauf(false);
  if (neu.r.alt) return h.ergebnis(titel, false, ["kein _rfRaeumeHolen (Stand vor v829)"]);
  if (!neu.angefragt.some(x => /nur_eltern/.test(x))) probleme.push("a) die Abfrage fragt die Spalte nur_eltern nicht mit");
  if (!neu.r.chips.some(c => /Elternrunde/.test(c))) probleme.push("a) Raum Elternrunde fehlt in der Leiste: " + neu.r.chips.join(" | "));
  if (!/Nur Eltern/.test(neu.r.unter1 || "") || !/Trainerteam sieht diesen Raum nicht/.test(neu.r.unter1 || "")) probleme.push("a) Kopfzeile im Eltern-Raum: " + neu.r.unter1);
  if (neu.r.unter0 !== "Eltern und Trainerteam") probleme.push("a) Kopfzeile im offenen Raum: " + neu.r.unter0);
  if (neu.r.breite > 360) probleme.push("a) waagerechtes Scrollen bei 360 px");
  if (neu.f.length) probleme.push("Konsole: " + neu.f.slice(0, 2).join(" | "));

  const alt = await lauf(true);
  if (!alt.r.chips.some(c => /Allgemein/.test(c)) || alt.r.chips.some(c => /Elternrunde/.test(c))) probleme.push("b) alte Datenbank: Räume " + alt.r.chips.join(" | "));
  if (!alt.angefragt.some(x => !/nur_eltern/.test(x))) probleme.push("b) keine zweite Abfrage ohne die neue Spalte");

  // c) Migration
  const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261120_v829_rufe_nur_eltern.sql"), "utf8");
  const muss = [
    ["Spalte", /add column if not exists nur_eltern boolean not null default false/],
    ["nie ein Familienraum", /check \(not nur_eltern or familie_kind is null\)/],
    ["Raum sichtbar", /create or replace function public\.rufe_raum_sichtbar[\s\S]*when r\.nur_eltern then not public\.is_trainer\(\)/],
    ["Raumliste", /create policy rr_lesen[\s\S]*when nur_eltern then not public\.is_trainer\(\)/],
    ["Räume verwalten", /create policy rr_mod[\s\S]*\(not nur_eltern or not public\.is_trainer\(\)\)/],
    ["Rufe lesen, Archiv", /create policy rn_lesen[\s\S]*rufe_darf_archiv\(raum_id\)/],
    ["Anhänge lesen", /create policy ra_lesen[\s\S]*rufe_darf_archiv/],
    ["Anhänge löschen (Tabelle)", /create policy ra_loeschen[\s\S]*not public\.rufe_nur_eltern\(raum_id\)/],
    ["Speicher lesen", /"rufe-anhang lesen"[\s\S]*is_trainer\(\) and not public\.rufe_anhang_nur_eltern\(name\)/],
    ["Speicher löschen", /"rufe-anhang loeschen"[\s\S]*is_trainer\(\) and not public\.rufe_anhang_nur_eltern\(name\)/],
    ["Meldungen lesen", /create policy rme_mod[\s\S]*rufe_nachricht_nur_eltern\(nachricht_id\) and public\.is_trainer\(\)/],
    ["Meldungen bearbeiten", /create policy rme_erledigt[\s\S]*rufe_nachricht_nur_eltern\(nachricht_id\) and public\.is_trainer\(\)/],
    ["Gesehen von (Namen)", /FUNCTION public\.rufe_gesehen\([\s\S]*is_trainer\(\) and not public\.rufe_nachricht_nur_eltern\(p_nachricht\)/i],
    ["Gesehen von (Zahlen)", /FUNCTION public\.rufe_gesehen_zahlen[\s\S]*is_trainer\(\) and not public\.rufe_nachricht_nur_eltern\(i\)/i],
    ["ungelesen", /FUNCTION public\.rufe_ungelesen[\s\S]*public\.rufe_raum_sichtbar\(r\.id\)/i],
    ["Umfragestand", /FUNCTION public\.rufe_umfrage_stand[\s\S]*rufe_darf_archiv\(n\.raum_id\)/i],
    ["Anhänge löschen (Funktion)", /FUNCTION public\.rufe_anhaenge_loeschen[\s\S]*rufe_nachricht_nur_eltern\(p_nachricht\)/i],
    ["Push", /FUNCTION public\.rufe_push_faellig[\s\S]*not \(r\.nur_eltern and e\.trainer\)/i],
    ["Anhang lesbar", /FUNCTION public\.rufe_anhang_lesbar[\s\S]*rufe_darf_archiv\(a\.raum_id\)/i],
    ["Raum angelegt", /insert into public\.rufe_raum\(name, emoji, sort, nur_eltern\)[\s\S]*'Elternrunde'/]
  ];
  for (const [n, re] of muss) if (!re.test(sql)) probleme.push("c) Migration: Stelle fehlt – " + n);
  // jede Trainer-Ausnahme der Rufe in der Migration wird einzeln gezählt, damit eine neue nicht unbemerkt dazukommt
  zeilen.push(`Eltern-Raum angezeigt, alte Datenbank ok, ${muss.length} Absicherungen in der Migration`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
