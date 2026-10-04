/* v739 · Kinderprofil für Trainer und Spielerkarten Stufe 1
   PO 04.10.: „Die Ansicht, in der die Trainer die Kinderprofile bearbeiten, sieht ganz schlimm aus … schlechte
   Usability“ (Entwurf freigegeben: „Passt, so fertig bauen“) und „Dort dürfen schon die Stärken stehen und sowas wie
   starker Fuß“. Die Datenbankseite (Stärken/Fuß/Position in team_gallery_kind, kind_fuss, Wrapped-Minuten aus den
   Spieltagen) prüft tests/sql/v739-karten-stufe1.sql.
   a) Tipp auf ein Kind öffnet sein Profil: Kopf mit Name/Nummer/Jahrgang/Spitzname, Abschnitte Stammdaten, Fußball,
      Foto & Freigaben, Fan-Fakten der Eltern, Gesundheit, Mehr; Dialog, alles ≥ 44 px, 390 px ohne Querscrollen
   b) „Änderungen speichern“ erst nach einer Änderung; Torwart- und Fuß-Wahl als Knöpfe mit aria-pressed
   c) Doppelte Rückennummer wird mit Namen abgelehnt, nichts geschrieben
   d) Speichern schreibt nur dieses Kind (PATCH kader?id=eq.<id>) mit allen Feldern; die Liste zeigt danach den neuen
      Namen
   e) Fan-Fakten und Freigabe-Stufen der Eltern stehen zum Lesen da; Fuß der Eltern als Hinweis, solange der Trainer
      keinen gewählt hat
   f) Schließen mit ungespeicherter Änderung fragt nach
   g) Galerie-Karte: Fuß und Position aus team_gallery_kind; Wrapped-Minuten kommen aus den Spieltagen (SQL) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const kader = h.kaderZeilen().map((k, i) => i === 1 ? { ...k, geb: "2018-10-12", starker_fuss: null, lieblingsposition: "Sturm" } : k);
  const id1 = kader[1].id, nr0 = kader[0].nr;
  const patches = [];
  const s = await h.starten({ warten: 1200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: (u, req) => { if (req.method() === "PATCH") { patches.push({ url: decodeURIComponent(u.search), body: JSON.parse(req.postData() || "{}") }); return { status: 204, body: "" }; } return kader; },
    kind_fanfacts: u => /spieler_id=eq\./.test(u.search) ? [{ spieler_id: id1, spitzname: "Flitzer", lieblingsverein: "Testverein", hobby: "Eishockey", starker_fuss: "rechts" }] : [],
    foto_consent: [{ spieler_id: id1, intern: true, video: false, public_ok: false, updated_at: "2026-09-28T10:00:00Z" }] }) });
  const r = await s.page.evaluate(async ({ id1, nr0 }) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 40 && typeof kinderProfilOpen !== "function"; i++) await w(100);
    if (typeof kinderProfilOpen !== "function") return { fehlt: true };
    await loadKader(); kaderEditOpen(); await w(200);
    document.querySelector(`.kader-edit-row[data-id="${id1}"] .ke-kopf`).click(); await w(700);
    const m = document.getElementById("kp-modal"), txt = () => m.textContent.replace(/\s+/g, " ");
    const sichtbar = [...m.querySelectorAll("button,input,select,textarea,label.btn")].filter(e => e.offsetParent && e.type !== "file" && e.type !== "checkbox");
    out.a = { role: m.getAttribute("role"), titel: [...m.querySelectorAll(".kp-karte h3")].map(h => h.textContent.trim()), kopf: txt().slice(0, 140),
      klein: sichtbar.filter(e => Math.round(e.getBoundingClientRect().height) < 44).map(e => e.textContent.trim() || e.id), quer: m.scrollWidth > m.clientWidth + 1 };
    out.b = { vorher: document.getElementById("kp-speichern").disabled };
    m.querySelector('.kp-seg-btn[data-feld="tw"][data-wert="tw2"]').click(); await w(50);
    m.querySelector('.kp-seg-btn[data-feld="fuss"][data-wert="L"]').click(); await w(50);
    out.b.tw = m.querySelector('.kp-seg-btn[data-feld="tw"][aria-pressed="true"]')?.dataset.wert;
    out.b.fuss = m.querySelector('.kp-seg-btn[data-feld="fuss"][aria-pressed="true"]')?.dataset.wert;
    out.b.nachher = document.getElementById("kp-speichern").disabled;
    // c) doppelte Nummer
    const toasts = []; const t0 = window.toast; window.toast = (x, a) => { toasts.push(String(x)); };
    const nr = document.getElementById("kp-nr"); nr.value = String(nr0); nr.dispatchEvent(new Event("input"));
    await kinderProfilSpeichern(); await w(100);
    out.c = toasts.slice();
    nr.value = "42"; nr.dispatchEvent(new Event("input"));
    const name = document.getElementById("kp-name"); name.value = "Kind B Neu"; name.dispatchEvent(new Event("input"));
    const med = document.getElementById("kp-medical"); med.value = "Brille"; med.dispatchEvent(new Event("input"));
    await kinderProfilSpeichern(); await w(500);
    window.toast = t0;
    out.d = { toasts: toasts.slice(), listeKopf: document.querySelector(`.kader-edit-row[data-id="${id1}"] .ke-kopf-name`)?.textContent.trim() };
    // e)
    const m2 = document.getElementById("kp-modal");
    out.e = { fan: /Flitzer/.test(m2.textContent) && /Eishockey/.test(m2.textContent), frei: /✓ Team intern/.test(m2.textContent) && /✗ Öffentlich/.test(m2.textContent) };
    // f) ungespeichert schließen
    document.getElementById("kp-medical").value = "x"; document.getElementById("kp-medical").dispatchEvent(new Event("input"));
    kinderProfilZu(); await w(200);
    out.f = { frage: !!document.getElementById("frage-modal") };
    document.getElementById("frage-ja")?.click(); await w(200);
    out.f.zu = !document.getElementById("kp-modal");
    // e) Eltern-Fuß als Hinweis bei einem Kind ohne Trainerwert
    KADER.find(k => Number(k._id) === id1).starker_fuss = null;
    await kinderProfilOpen(id1); await w(500);
    out.e.hinweis = document.querySelector("#kp-modal .kp-fuss-eltern")?.textContent || "";
    document.getElementById("kp-modal")?.remove();
    // g)
    if (typeof galleryCardData === "function") { const c = galleryCardData({ name: "Kind C", nr: 3, tw: false, staerken: ["f_pass"], fuss: "B", position: "Abwehr", trainings: 2, spiele: 1 }); out.g = { pos: c.pos, fuss: c.fuss }; }
    return out;
  }, { id1, nr0 });
  const f = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v739 Kinderprofil und Spielerkarten Stufe 1", false, ["kinderProfilOpen fehlt"]);
  const a = r.a;
  if (a.role !== "dialog" || a.titel.join("|") !== "🪪Stammdaten|⚽Fußball|📸Foto & Freigaben|⭐Fan-Fakten der Eltern|⚕️Gesundheit|➕Mehr".replace(/🪪|⚽|📸|⭐|⚕️|➕/g, x => x)) {
    const erw = ["Stammdaten", "Fußball", "Foto & Freigaben", "Fan-Fakten der Eltern", "Gesundheit", "Mehr"];
    if (a.role !== "dialog" || !erw.every((t, i) => (a.titel[i] || "").includes(t))) probleme.push(`a) Aufbau: ${a.role} ${JSON.stringify(a.titel)}`);
  }
  if (!/#2 Kind B/.test(a.kopf) || !/Jahrgang 2018/.test(a.kopf) || !/„Flitzer“/.test(a.kopf)) probleme.push(`a) Kopf: „${a.kopf}“`);
  if (a.klein.length || a.quer) probleme.push(`a) unter 44 px: ${JSON.stringify(a.klein)} · quer ${a.quer}`);
  zeilen.push(`a) Profil mit ${a.titel.length} Abschnitten, Kopf „#2 Kind B · Jahrgang 2018 · „Flitzer““, alles ≥ 44 px`);
  if (!r.b.vorher || r.b.nachher || r.b.tw !== "tw2" || r.b.fuss !== "L") probleme.push(`b) Knöpfe/Speichern: ${JSON.stringify(r.b)}`);
  if (!r.c.some(t => new RegExp(`Nummer ${nr0} trägt schon`).test(t)) || patches.length > 1) probleme.push(`c) doppelte Nummer: ${JSON.stringify(r.c)} · ${patches.length} PATCH`);
  const p = patches[patches.length - 1] || {};
  if (patches.length !== 1 || !new RegExp(`id=eq\\.${id1}`).test(p.url || "") || p.body.name !== "Kind B Neu" || p.body.nr !== 42 || p.body.tw !== true || p.body.tw_prio !== 2 || p.body.starker_fuss !== "L" || p.body.medical !== "Brille" || p.body.aktiv !== true || p.body.lieblingsposition !== "Sturm")
    probleme.push(`d) PATCH: ${JSON.stringify(patches)}`);
  zeilen.push(`b–d) Torwart 2. Wahl + linker Fuß, doppelte Nummer abgelehnt, ein PATCH nur für dieses Kind mit allen Feldern`);
  if (!r.e.fan || !r.e.frei || !/Laut Eltern: rechts/.test(r.e.hinweis)) probleme.push(`e) Eltern-Angaben: ${JSON.stringify(r.e)}`);
  zeilen.push("e) Fan-Fakten und Freigabe-Stufen zum Lesen, „Laut Eltern: rechts“ als Hinweis");
  if (!r.f.frage || !r.f.zu) probleme.push(`f) Schließen ohne Rückfrage: ${JSON.stringify(r.f)}`);
  if (!r.g || r.g.pos !== "Abwehr" || r.g.fuss !== "beidfüßig") probleme.push(`g) Galerie-Karte: ${JSON.stringify(r.g)}`);
  const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261004_v739_karten_stufe1.sql"), "utf8");
  if (!/'einsatz_min', public\.kind_spielminuten_saison/.test(sql) || /einsatzzeiten/.test(sql.split("4. Adler Wrapped")[1] || "x")) probleme.push("g) Wrapped zählt nicht aus den Spieltagen");
  zeilen.push(`f) ungespeichert schließen fragt nach · g) Galerie „${r.g && r.g.pos}“ / „${r.g && r.g.fuss}“, Wrapped aus den Spieltagen`);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v739 Kinderprofil und Spielerkarten Stufe 1", !probleme.length, zeilen.concat(probleme));
};
