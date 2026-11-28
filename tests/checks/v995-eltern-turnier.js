/* v995 · Charles 28.11.2026 (Bild freigegeben): Kinder-Eltern-Turnier am 07.12. – „nur ein Elternteil angemeldet … Button zu
   versteckt … in der Übersicht der nächsten Termine taucht die Weihnachtsfeier noch gar nicht auf … alle Termine an der Liste,
   gar nicht voneinander abgegrenzt … andere Leute eintragen mit Namen und Verhältnis“.
   a) Eltern: Eintragen mit Verhältnis (11 Möglichkeiten); gesendet werden verhaeltnis und kind_id, bei „Ich spiele mit“ kind_id;
      die Liste zeigt „· Oma“ bzw. „· Elternteil“
   b) „Für euch“: Karte „Spielt ihr mit?“ mit „✓ Ich spiele mit“ (≥ 44 px) und „Weitere Mitspieler eintragen ›“, solange die
      Familie niemanden eingetragen hat; mit eigenem Eintrag oder nach ✕ keine Karte
   c) Karussell „Nächste Termine“: alles aus 14 Tagen (höchstens 8), mindestens 4 – nicht mehr fest 4
   d) „Alle Termine“: Kopf je Monat und je Kalenderwoche
   e) Trainer-Liste: Verhältnis und Familie (Vorname des Kindes)
   f) Chat: Aufgabe „Mitspielen eintragen“ mit Terminwahl (nur Kinder-Eltern-Turniere); Trainer sieht „2 Erwachsene aus 1 Familie ·
      2 Familien noch ohne Eintrag“, Eltern „Von euch sind 2 Personen eingetragen“ und den Knopf zum Termin
   g) Migration: Spalten verhaeltnis/kind_id, Prüfregel, Aufgabe „mitspielen“ mit Termin, Insert nur fürs eigene Kind */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v995 Kinder-Eltern-Turnier: Verhältnis, Karte in „Für euch“, Karussell 14 Tage, Monate/Wochen, Chat-Aufgabe";
  const probleme = [], zeilen = [];
  const tok = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const tag = d => { const x = new Date(Date.now() + d * 864e5); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  const TURNIER = { id: 120, typ: "event", titel: "Kinder-Eltern-Turnier", gegner: null, datum: tag(9), uhrzeit: "10:00:00", treffzeit: null, ort: "Halle", heim: true, eltern_turnier: true };
  const MS = [{ id: 1, termin_id: 120, name: "Erwachsener E", selbst: true, created_by: "u-e", verhaeltnis: null, kind_id: 2, kader: { name: "Kind B" } },
    { id: 2, termin_id: 120, name: "Erwachsener O", selbst: false, created_by: "u-e", verhaeltnis: "Oma", kind_id: 2, kader: { name: "Kind B" } }];
  const ruf = (id, text, m, extra) => Object.assign({ id, raum_id: 5, autor: "u-t", autor_name: "Trainer T", autor_zusatz: "", autor_rolle: "trainer", text, antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(m), erwaehnt: [], termin_id: null, geplant_fuer: null, still: false, aufgabe: null, rufe_anhang: [] }, extra || {});
  const basis = uid => h.supabaseAttrappe({
    kader: [{ id: 1, name: "Kind A", aktiv: true }, { id: 2, name: "Kind B", aktiv: true }, { id: 3, name: "Kind C", aktiv: true }],
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }],
    rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : (/raum_id=eq\.5/.test(u.search) ? [ruf(50, "Mitspielen", 10, { aufgabe: "mitspielen", termin_id: 120 })] : []),
    termine: [TURNIER], rueckmeldungen: [],
    event_mitspieler: (u, req) => req.method() !== "GET" ? { status: 201, body: "[]" } : (/created_by=eq\./.test(u.search) ? (/created_by=eq\.u-x/.test(u.search) ? [{ id: 1 }] : []) : MS),
    rufe_umfrage: [], rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [], rufe_push_erwaehnung: [], rufe_erinnerung: [],
    rpc: { is_rufe_mod: uid === "u-t", rufe_ungelesen: [], rufe_fuer_mich: [], rufe_mitglieder: [], rufe_termin_stand: [], rufe_umfrage_fehlende: [] }
  });
  const ablauf = async (start, uid, fn, arg) => {
    const s = await h.starten({ start, warten: 1000, breite: 390, hoehe: 900, supabase: basis(uid) });
    const r = await s.page.evaluate(fn, [tok(uid), arg]).catch(x => ({ fehler: String(x) }));
    const g = s.gesendet.slice(), fe = s.fehler(); await s.schliessen(); return { r, g, fe };
  };
  // ── Eltern ──
  const el = await ablauf("/eltern/index.html", "u-e", async ([t, x2]) => {
    const T = d => { const x = new Date(Date.now() + d * 864e5); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 60 && typeof mitspielerLoad !== "function"; i++) await w(100);
    if (typeof mitspielenObenLoad !== "function") return { alt: true };
    window.sbToken = () => t; localStorage.setItem("adler_rufe_name_gefragt", "1");
    window._elternKids = [{ spieler_id: 2, kader: { id: 2, name: "Kind B" } }];
    const auf = []; window.terminDetailOpen = async (...a) => auf.push(["termin", ...a]);
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    const o = {};
    // a)
    const box = document.createElement("div"); box.id = "td-mitspieler"; document.body.appendChild(box);
    await mitspielerLoad(120, "td-mitspieler"); await w(200);
    const sel = document.getElementById("ms-verh-td-mitspieler");
    o.optionen = sel ? [...sel.options].map(x => x.value).filter(Boolean) : [];
    o.zeilen = [...box.querySelectorAll("span")].map(txt).filter(x => /^⚽/.test(x));
    document.getElementById("ms-name-td-mitspieler").value = "Erwachsener P";
    if (sel) sel.value = "Opa";
    await mitspielerDazu(120, "td-mitspieler"); await w(200);
    // b)
    box.remove();
    const slot = document.getElementById("mitspielen-slot") || (() => { const s = document.createElement("div"); s.id = "mitspielen-slot"; document.body.appendChild(s); return s; })();
    localStorage.removeItem("adler_ms_weg_120");
    await mitspielenObenLoad(); await w(100);
    o.karte = txt(slot.querySelector(".ms-oben"));
    const ich = slot.querySelector(".ms-oben-ich"); o.ichHoch = ich ? Math.round(ich.getBoundingClientRect().height) : 0;
    slot.querySelector(".ms-oben-mehr")?.click(); await w(100);
    o.auf = auf.slice();
    slot.querySelector(".fe-x")?.click(); await w(100);
    o.nachX = { karte: !!slot.querySelector(".ms-oben"), gemerkt: localStorage.getItem("adler_ms_weg_120") };
    localStorage.removeItem("adler_ms_weg_120");
    window.sbToken = () => t.replace(/^x\.[^.]+/, "x." + btoa(JSON.stringify({ sub: "u-x" }))); await mitspielenObenLoad(); await w(100);
    o.mitEintrag = !!slot.querySelector(".ms-oben");
    window.sbToken = () => t;
    // c)
    const tm = (id, d) => ({ id, typ: "training", titel: "Training " + id, datum: T(d), uhrzeit: "17:00:00" });
    const erste = { id: 1, typ: "training", datum: T(0), uhrzeit: "23:59:00" };
    const viele = [erste, tm(2, 1), tm(3, 2), tm(4, 3), tm(5, 4), tm(6, 6), tm(7, 9), tm(8, 12), tm(9, 13), tm(10, 13), tm(11, 20)];
    const zaehle = rows => { const d = document.createElement("div"); d.innerHTML = elternTerminKarussell("", rows, [], {}, erste); return d.querySelectorAll("#tk-bahn > *").length; };
    o.kViele = zaehle(viele);
    o.kWenige = zaehle([erste, tm(2, 1), tm(3, 20), tm(4, 25), tm(5, 30), tm(6, 40)]);
    // d)
    const liste = document.createElement("div");
    liste.innerHTML = elternTermineListeHtml([tm(20, 1), tm(21, 2), tm(22, 9), tm(23, 40)]);
    o.monate = [...liste.querySelectorAll(".et-monat")].map(txt); o.kws = [...liste.querySelectorAll(".et-kw")].map(txt);
    o.listeZeilen = liste.querySelectorAll(".et-termin").length;
    // f) Chat
    await rufeOpen(); await w(1200);
    const k = document.querySelector('#rufe-liste .rf-msg[data-id="50"] .rf-aufgabe');
    o.chat = txt(k); auf.length = 0;
    k?.querySelector(".rf-t-knoepfe button")?.click(); await w(300);
    o.chatSprung = auf.slice();
    return o;
  }, null);
  // ── Trainer ──
  const tr = await ablauf("/trainer/index.html", "u-t", async ([t]) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    for (let i = 0; i < 60 && typeof elternTurnierRender !== "function"; i++) await w(100);
    if (typeof rufeAufgabeMenue !== "function" || typeof elternTurnierRender !== "function") return { alt: true };
    window.sbToken = () => t; localStorage.setItem("adler_rufe_name_gefragt", "1"); window.frageJaNein = async () => true;
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    const o = {};
    const b = document.createElement("div"); b.id = "et-body"; document.body.appendChild(b);
    await elternTurnierRender(120, "x"); await w(100);
    o.liste = [...b.querySelectorAll(".et-zeile")].map(txt); b.remove();
    await rufeOpen(); await w(1200);
    rufeAufgabeMenue(); await w(100); o.aufgaben = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt);
    [...document.querySelectorAll("#rufe-menue .btn-zeile")].find(x => /Mitspielen/.test(x.textContent))?.click(); await w(400);
    o.terminwahl = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt);
    document.querySelector("#rufe-menue .btn-zeile")?.click(); await w(150);
    o.chip = txt(document.getElementById("rufe-optionen")); await rufeSenden(); await w(300);
    o.karte = txt(document.querySelector('#rufe-liste .rf-msg[data-id="50"] .rf-aufgabe'));
    return o;
  }, null);
  if ((el.r && el.r.alt) || (tr.r && tr.r.alt)) return h.ergebnis(titel, false, ["Funktionen fehlen (Stand vor v995)"]);
  if (el.r.fehler || tr.r.fehler) return h.ergebnis(titel, false, ["Ablauf: " + (el.r.fehler || tr.r.fehler)]);
  const e = el.r, t = tr.r;
  // ohne Anmeldung steht das Dashboard nicht – der Platz in „Für euch“ wird deshalb am Quelltext geprüft
  e.imSlotDerBahn = /id="fe-bahn"[^\n]*<div id="feier-slot"><\/div><div id="mitspielen-slot"><\/div>/.test(fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8"));
  const ms = el.g.filter(x => /event_mitspieler$/.test(x.pfad) && x.methode === "POST").map(x => x.body);
  // a)
  if (e.optionen.length !== 11 || !e.optionen.includes("Oma") || !e.zeilen.some(x => /Erwachsener O · Oma/.test(x)) || !e.zeilen.some(x => /Erwachsener E · Elternteil/.test(x))
      || !ms.some(p => p.name === "Erwachsener P" && p.verhaeltnis === "Opa" && p.kind_id === 2 && p.selbst === false))
    probleme.push("a) " + JSON.stringify({ optionen: e.optionen, zeilen: e.zeilen, ms }));
  else zeilen.push(`a) Verhältnis mit ${e.optionen.length} Möglichkeiten · Liste „${e.zeilen[1]}“ · gesendet verhaeltnis Opa, kind_id 2`);
  // b)
  if (!/Spielt ihr mit\?/.test(e.karte) || !/Ich spiele mit/.test(e.karte) || !/Weitere Mitspieler eintragen/.test(e.karte) || e.ichHoch < 44
      || !e.auf.some(x => x[0] === "termin" && x[1] === 120) || e.nachX.karte || e.nachX.gemerkt !== "1" || e.mitEintrag || !e.imSlotDerBahn)
    probleme.push("b) " + JSON.stringify({ karte: e.karte, ichHoch: e.ichHoch, auf: e.auf, nachX: e.nachX, mitEintrag: e.mitEintrag, imSlotDerBahn: e.imSlotDerBahn }));
  else zeilen.push(`b) „Für euch“: Karte mit „✓ Ich spiele mit“ (${e.ichHoch} px) und Weg zum Termin; ✕ merkt sich, mit eigenem Eintrag keine Karte`);
  // c)
  if (e.kViele !== 8 || e.kWenige !== 4) probleme.push(`c) Karussell: ${e.kViele} Karten bei vielen Terminen (Soll 8), ${e.kWenige} bei wenigen (Soll 4)`);
  else zeilen.push(`c) Karussell: 8 Karten bei 10 Terminen in 14 Tagen, 4 bei nur einem – vorher fest 4`);
  // d)
  if (e.monate.length < 2 || !e.kws.length || e.kws.some(x => !/^KW \d{2}$/.test(x)) || e.listeZeilen !== 4) probleme.push("d) " + JSON.stringify({ monate: e.monate, kws: e.kws, n: e.listeZeilen }));
  else zeilen.push(`d) „Alle Termine“: ${e.monate.join(" / ")} · ${e.kws.join(", ")}`);
  // e)
  if (!t.liste.some(x => /Erwachsener O · Oma · Familie Kind/.test(x)) || !t.liste.some(x => /Erwachsener E · Elternteil · Familie Kind/.test(x))) probleme.push("e) " + JSON.stringify(t.liste));
  else zeilen.push(`e) Trainer: „${t.liste[1]}“`);
  // f)
  const posts = tr.g.filter(x => /rufe_nachricht$/.test(x.pfad) && x.methode === "POST").map(x => x.body);
  if (!t.aufgaben.some(x => /Mitspielen eintragen/.test(x)) || !t.terminwahl.some(x => /Kinder-Eltern-Turnier/.test(x)) || !posts.some(p => p.aufgabe === "mitspielen" && p.termin_id === 120)
      || !/2 Erwachsene aus 1 Familie · 2 Familien noch ohne Eintrag/.test(t.karte) || !/Von euch sind 2 Personen eingetragen/.test(e.chat) || !e.chatSprung.some(x => x[0] === "termin" && x[1] === 120))
    probleme.push("f) " + JSON.stringify({ aufgaben: t.aufgaben, terminwahl: t.terminwahl, posts, karte: t.karte, chat: e.chat, sprung: e.chatSprung }));
  else zeilen.push(`f) Chat: Trainer „${t.karte.replace(/^.*?Turnier[^⚽]*/, "").slice(0, 70)}“ · Eltern „Von euch sind 2 Personen eingetragen“ → Termin`);
  // g)
  const mp = path.join(h.REPO, "supabase/migrations/20261128_v995_eltern_turnier.sql"), m = fs.existsSync(mp) ? fs.readFileSync(mp, "utf8") : "";
  if (!/add column if not exists verhaeltnis text/.test(m) || !/add column if not exists kind_id bigint references public\.kader/.test(m) || !/'Oma','Opa'/.test(m)
      || !/'todo','mitspielen'/.test(m) || !/aufgabe_braucht_termin/.test(m) || !/is_parent_of\(kind_id\)/.test(m)) probleme.push("g) Migration unvollständig");
  else zeilen.push("g) Migration: Verhältnis mit Prüfregel, kind_id, Aufgabe mitspielen braucht Termin, Insert nur fürs eigene Kind");
  const fe = el.fe.concat(tr.fe).filter(x => !/youtube|Failed to load resource/i.test(x));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
