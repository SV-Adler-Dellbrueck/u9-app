/* v709 · PO 01.10. (Bildschirmfotos „Termin bearbeiten“, 18:23/18:24):
   „Warum findet er nicht die Hausnummer? Ist es möglich, dass die Adresse des Vereins direkt
   gesucht wird …? Bei Spielform sollte immer Funino und 3+1 voreingestellt sein. Und beim
   Speichern kommt eine Fehlermeldung.“
   a) Speichern: termine.spielform darf mehrere Formen tragen – die Migration ersetzt die alte
      Regel (nur EINE Form), an der „funino,3+1“ scheiterte. Die Attrappe kennt keine Regeln;
      geprüft wird deshalb, dass die Migration sie ersetzt und der Ausdruck die Fälle trägt.
   b) Voreinstellung: Neuer Termin und ein Termin ohne Spielform stehen auf FUNiño + 3+1.
   c) Adresssuche: sucht das Getippte UND den Verein aus dem Titel; fehlt die Hausnummer im
      Treffer, wird die getippte eingesetzt; Anschrift kurz statt OSM-Kette. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  // a)
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261001_v709_spielform_mehrfach.sql"), "utf8");
  const m = /spielform ~ '([^']+)'/.exec(mig);
  if (!m || !/drop constraint termine_spielform_chk/.test(mig)) probleme.push("a) Migration ersetzt die alte Spielform-Regel nicht");
  else {
    const re = new RegExp(m[1].replace(/\\\\/g, "\\"));
    const ja = ["funino", "funino,3+1", "3+1,4+1,5+1", "4+1"], nein = ["funino, 3+1", "6+1", "funino,", ""];
    ja.forEach(x => { if (!re.test(x)) probleme.push(`a) „${x}“ wird abgelehnt`); });
    nein.forEach(x => { if (re.test(x)) probleme.push(`a) „${x}“ wird angenommen`); });
  }
  // b) + c)
  const osm = [
    { display_name: "Merianstraße, Fühlingen, Chorweiler, Köln, Nordrhein-Westfalen, 50769, Deutschland", name: "Merianstraße", lat: "51", lon: "6.9",
      address: { road: "Merianstraße", postcode: "50769", city: "Köln" } },
    { display_name: "Bezirkssportanlage Chorweiler, 17a, Merianstraße, …", name: "Bezirkssportanlage Chorweiler", lat: "51", lon: "6.9",
      address: { road: "Merianstraße", house_number: "17a", postcode: "50769", city: "Köln" } }];
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const anfragen = [];
  await s.ctx.route("https://nominatim.openstreetmap.org/**", r => { anfragen.push(new URL(r.request().url()).searchParams.get("q")); return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(anfragen.length === 1 ? [osm[0]] : [osm[1]]) }); });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const o = {};
    if (typeof tmSetTyp === "function") tmSetTyp("turnier");
    o.neu = tmSpielform;
    o.neuAktiv = [...document.querySelectorAll("#tm-spielform-seg .seg-btn.active")].map(b => b.dataset.val).join(",");
    TM_TERMINE = [{ id: 9, datum: "2026-10-03", typ: "turnier", heim: false, uhrzeit: "10:15", uhrzeit_ende: "11:30", titel: "Kinderfestival · FC Beispiel U9", ort: "Merianstraße 17a, Köln", spielform: null }];
    tmEdit(9); await w(150);
    o.edit = [...document.querySelectorAll("#te-sf .te-sf-k.active")].map(b => b.dataset.val).join(",");
    await gegnerAddrSearch("te-ort", "te-titel", "te-addr-results");
    o.treffer = [...document.querySelectorAll("#te-addr-results button")].map(b => b.dataset.addr);
    document.getElementById("tm-edit-modal")?.remove();
    return o;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.neu !== "funino,3+1" || r.neuAktiv !== "funino,3+1") probleme.push(`b) Neuer Termin: ${r.neu} / Knöpfe ${r.neuAktiv}`);
  if (r.edit !== "funino,3+1") probleme.push(`b) Termin ohne Spielform: ${r.edit}`);
  if (anfragen.length !== 2 || !anfragen.includes("FC Beispiel")) probleme.push(`c) Anfragen: ${JSON.stringify(anfragen)} – erwartet Getipptes und „FC Beispiel“`);
  if (!r.treffer.includes("Merianstraße 17a, 50769 Köln")) probleme.push(`c) Hausnummer nicht übernommen: ${JSON.stringify(r.treffer)}`);
  if (!r.treffer.some(t => /^Bezirkssportanlage Chorweiler, Merianstraße 17a, 50769 Köln$/.test(t))) probleme.push(`c) Anlage nicht kurz benannt: ${JSON.stringify(r.treffer)}`);
  zeilen.push(`b) ${r.neu} · c) ${anfragen.join(" + ")} → ${r.treffer.join(" | ")}`);
  return h.ergebnis("v709 Spielform speicherbar und voreingestellt, Adresse mit Hausnummer und Verein", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
