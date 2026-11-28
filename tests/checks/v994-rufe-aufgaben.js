/* v994 · Charles 28.11.2026 (Bild freigegeben): „hilfreich, wenn nicht nur Termine dort zu verlinken wären, sondern auch die To-Dos,
   damit ich im Chat daran erinnern kann, wie zum Beispiel die weiteren Informationen eintragen zu den Kindern für den Steckbrief.“
   Trainer hängen über 📎 eine Aufgabe an (Steckbrief, Porträtfragen Adler Nest, Mitbringliste mit Termin, alle offenen To-dos).
   Eltern bekommen einen Sprungknopf zur richtigen Stelle, Trainer sehen den Stand. Spalte rufe_nachricht.aufgabe (Migration v994).
   a) Trainer: 📎 → „Aufgabe für die Eltern …“ → Steckbrief: Chip und Vorschlagstext; gesendet wird aufgabe "steckbrief";
      Mitbringliste fragt nach dem Termin und sendet aufgabe "mitbringen" mit termin_id
   b) Trainer sieht den Stand: Steckbrief „✓ 1 vollständig · 2 offen“, Porträt „✓ 1 beantwortet · 1 offen“
   c) Eltern: Steckbrief-Karte je Kind mit offenen Angaben und „Jetzt ausfüllen ›“ → elternFanfactsOpen(Kind); Porträt-Karte
      „Zum Porträt-Bogen ›“ → nestBogenOpen(Einreichung); To-dos „Zu erledigen ›“ → elternCatOpen("todo"); Mitbringliste → Termin;
      Knöpfe ≥ 44 px
   d) Migration: Spalte, Prüfregel und „aufgabe_nur_trainer“/„mitbringen_braucht_termin“ im Trigger */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v994 Aufgaben im Chat: Steckbrief, Porträtfragen, Mitbringliste, To-dos – Sprungknopf und Stand";
  const probleme = [], zeilen = [];
  const tok = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const tag = d => { const x = new Date(Date.now() + d * 864e5); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  const ruf = (id, text, m, extra) => Object.assign({ id, raum_id: 5, autor: "u-t", autor_name: "Trainer T", autor_zusatz: "", autor_rolle: "trainer", text, antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(m), erwaehnt: [], termin_id: null, geplant_fuer: null, still: false, aufgabe: null, rufe_anhang: [] }, extra || {});
  const TERMIN = { id: 112, typ: "event", titel: "Weihnachtsfeier", gegner: null, datum: tag(9), uhrzeit: "17:00:00", treffzeit: null, ort: "Halle", heim: true };
  let KEYS = [];
  const voll = sid => Object.assign({ spieler_id: sid }, Object.fromEntries(KEYS.map(k => [k, "x"])));
  const basis = uid => h.supabaseAttrappe({
    kader: [{ id: 1, name: "Kind A", aktiv: true }, { id: 2, name: "Kind B", aktiv: true }, { id: 3, name: "Kind C", aktiv: true }],
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }],
    rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : (/raum_id=eq\.5/.test(u.search) ? [
      ruf(40, "Bitte Steckbrief ergänzen", 40, { aufgabe: "steckbrief" }), ruf(41, "Porträtfragen", 30, { aufgabe: "portraet" }),
      ruf(42, "Mitbringen", 20, { aufgabe: "mitbringen", termin_id: 112 }), ruf(43, "To-dos", 10, { aufgabe: "todo" })].reverse() : []),
    termine: [TERMIN], rueckmeldungen: [],
    kind_fanfacts: () => [voll(1), { spieler_id: 2, lieblingsposition: "Sturm" }],
    kind_foto: [{ spieler_id: 1, zweck: "aktion" }, { spieler_id: 1, zweck: "sport" }, { spieler_id: 1, zweck: "alltag" }],
    portraet_einreichung: [{ id: 7, spieler_id: 2, status: "angefragt", frist_eltern: tag(5), privatfotos: [], einverstanden_am: null }, { id: 8, spieler_id: 3, status: "eingereicht", frist_eltern: tag(5), privatfotos: [], einverstanden_am: null }],
    rufe_umfrage: [], rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [], rufe_push_erwaehnung: [], rufe_erinnerung: [],
    rpc: { is_rufe_mod: uid === "u-t", rufe_ungelesen: [], rufe_fuer_mich: [], rufe_mitglieder: [], rufe_termin_stand: [], rufe_umfrage_fehlende: [] }
  });
  const ablauf = async (start, uid, fn) => {
    const s = await h.starten({ start, warten: 1000, breite: 390, hoehe: 900, supabase: basis(uid) });
    KEYS = await s.page.evaluate(async () => { for (let i = 0; i < 60 && typeof SB_KERN_KEYS === "undefined"; i++) await new Promise(x => setTimeout(x, 100)); return typeof SB_KERN_KEYS !== "undefined" ? SB_KERN_KEYS : []; });
    const r = await s.page.evaluate(fn, tok(uid)).catch(x => ({ fehler: String(x) }));
    const g = s.gesendet.slice(), fe = s.fehler(); await s.schliessen(); return { r, g, fe };
  };
  // ── Trainer ──
  const tr = await ablauf("/trainer/index.html", "u-t", async t => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof rufeAufgabeMenue !== "function") return { alt: true };
    window.sbToken = () => t; localStorage.setItem("adler_rufe_name_gefragt", "1"); window.frageJaNein = async () => true;
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    await rufeOpen(); await w(1200);
    const o = {};
    rufeAnhangMenue(); await w(100); o.menue = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt); document.getElementById("rufe-menue")?.remove();
    rufeAufgabeMenue(); await w(100); o.aufgaben = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt);
    [...document.querySelectorAll("#rufe-menue .btn-zeile")].find(b => /Steckbrief/.test(b.textContent))?.click(); await w(150);
    o.chip = txt(document.getElementById("rufe-optionen")); o.text = document.getElementById("rufe-text").value;
    await rufeSenden(); await w(300);
    rufeAufgabeMenue(); await w(100); [...document.querySelectorAll("#rufe-menue .btn-zeile")].find(b => /Mitbringliste/.test(b.textContent))?.click(); await w(400);
    o.terminwahl = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt);
    document.querySelector("#rufe-menue .btn-zeile")?.click(); await w(150);
    o.chip2 = txt(document.getElementById("rufe-optionen")); await rufeSenden(); await w(300);
    const k = id => txt(document.querySelector(`#rufe-liste .rf-msg[data-id="${id}"] .rf-aufgabe`));
    o.karten = { 40: k(40), 41: k(41), 42: k(42), 43: k(43) };
    return o;
  });
  // ── Eltern ──
  const el = await ablauf("/eltern/index.html", "u-e", async t => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof rufeAufgabeKarteHtml !== "function") return { alt: true };
    window.sbToken = () => t; localStorage.setItem("adler_rufe_name_gefragt", "1");
    window._elternKids = [{ spieler_id: 2, kader: { id: 2, name: "Kind B" } }];
    const auf = []; window.elternFanfactsOpen = (...a) => auf.push(["steckbrief", ...a]); window.nestBogenOpen = (...a) => auf.push(["portraet", ...a]);
    window.elternCatOpen = (...a) => auf.push(["todo", ...a]); window.terminDetailOpen = async (...a) => auf.push(["termin", ...a]);
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    await rufeOpen(); await w(1200);
    const karte = id => document.querySelector(`#rufe-liste .rf-msg[data-id="${id}"] .rf-aufgabe`);
    const o = { karten: {}, knoepfe: [] };
    for (const id of [40, 41, 42, 43]) { const k = karte(id); o.karten[id] = txt(k); const b = k && k.querySelector(".rf-t-knoepfe button");
      if (b) { o.knoepfe.push(Math.round(b.getBoundingClientRect().height)); b.click(); await w(300); } }
    o.auf = auf; o.menue = (() => { rufeAnhangMenue(); const l = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt); document.getElementById("rufe-menue")?.remove(); return l; })();
    return o;
  });
  if (tr.r.alt || el.r.alt) return h.ergebnis(titel, false, ["Aufgaben fehlen (Stand vor v994)"]);
  if (tr.r.fehler || el.r.fehler) return h.ergebnis(titel, false, ["Ablauf: " + (tr.r.fehler || el.r.fehler)]);
  const posts = tr.g.filter(x => /rufe_nachricht$/.test(x.pfad) && x.methode === "POST").map(x => x.body);
  const t = tr.r;
  if (!t.menue.some(x => /Aufgabe für die Eltern/.test(x)) || t.aufgaben.length < 4 || !/Steckbrief ausfüllen/.test(t.chip) || !/Steckbrief/.test(t.text)
      || !posts.some(p => p.aufgabe === "steckbrief" && !p.termin_id) || !t.terminwahl.some(x => /Weihnachtsfeier/.test(x)) || !posts.some(p => p.aufgabe === "mitbringen" && p.termin_id === 112))
    probleme.push("a) " + JSON.stringify({ menue: t.menue, aufgaben: t.aufgaben, chip: t.chip, terminwahl: t.terminwahl, posts }));
  else zeilen.push(`a) Trainer: 📎 „Aufgabe für die Eltern …“ mit 4 Aufgaben; gesendet aufgabe steckbrief und mitbringen (Termin 112)`);
  if (!/✓ 1 vollständig · 2 offen/.test(t.karten[40]) || !/✓ 1 beantwortet · 1 offen/.test(t.karten[41]) || !/Zur Mitbringliste/.test(t.karten[42])) probleme.push("b) " + JSON.stringify(t.karten));
  else zeilen.push("b) Trainer-Stand: Steckbrief ✓ 1 vollständig · 2 offen, Porträt ✓ 1 beantwortet · 1 offen");
  const e = el.r, f = e.auf;
  const ok = f.some(x => x[0] === "steckbrief" && x[1] === 2) && f.some(x => x[0] === "portraet" && x[1] === 7) && f.some(x => x[0] === "termin" && x[1] === 112) && f.some(x => x[0] === "todo" && x[1] === "todo");
  if (!/ · noch \d+ Angaben offen/.test(e.karten[40]) || !/Zum Porträt-Bogen/.test(e.karten[41]) || !ok || e.knoepfe.some(x => x < 44) || e.menue.some(x => /Aufgabe/.test(x)))
    probleme.push("c) " + JSON.stringify({ karten: e.karten, auf: f, knoepfe: e.knoepfe, menue: e.menue }));
  else zeilen.push(`c) Eltern: „${e.karten[40].slice(0, 70)}…“ · Knöpfe ${e.knoepfe.join("/")} px führen zu Steckbrief, Porträt-Bogen, Termin, Zu erledigen; kein Aufgaben-Menü für Eltern`);
  const mp = path.join(h.REPO, "supabase/migrations/20261128_v994_rufe_aufgaben.sql"), m = fs.existsSync(mp) ? fs.readFileSync(mp, "utf8") : "";
  if (!/add column if not exists aufgabe text/.test(m) || !/'steckbrief','portraet','mitbringen','todo'/.test(m) || !/aufgabe_nur_trainer/.test(m) || !/mitbringen_braucht_termin/.test(m)) probleme.push("d) Migration unvollständig");
  else zeilen.push("d) Migration: Spalte, Prüfregel, nur Trainer, Mitbringliste braucht Termin");
  const fe = tr.fe.concat(el.fe).filter(x => !/youtube|Failed to load resource/i.test(x));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
