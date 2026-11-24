/* v964 · Charles 24.11.: „Schau dir bitte nochmal aus Designersicht … den Chat an. Der sieht irgendwie sehr altbacken aus … es soll einfach
   moderner wirken, einfacher in der Handhabung.“ Entwurf freigegeben, dazu: „andere im Chat markieren bzw. über ein @-Zeichen direkt
   ansprechen, sodass die dann auch eine gesonderte Information bekommen … antworten ohne über drei Punkte zu gehen (langes Drücken)“,
   Filter „Für mich“, Glocke „nur bei Erwähnung“, Abstimmung „Ergebnis erst am Schluss“.
   a) Kopf: Zurück, Suche, Glocke (je ≥ 44 px); Reiter mit „@ Für mich“ und rotem Zähler; fixierte Rufe als EINE Zeile.
   b) Blasen: eigene rechts (rf-ich, für Vorlesehilfen „Du:“), Folgerufe derselben Person ohne zweite Initialen/Namen.
   c) Lang drücken (0,45 s) öffnet das Blatt mit sechs Reaktionen, „Antworten“ und „Text kopieren“; nach rechts wischen antwortet.
   d) @Erwähnen: „@Be“ zeigt Ben, Auswahl setzt „@Ben “; Senden schickt erwaehnt = [Bens Konto]; erwähnt sein hebt die Blase hervor.
   e) „@ Für mich“ listet Erwähnungen, Antippen springt in den Raum.
   f) Glocke: drei Stufen; „Nur für mich“ schreibt rufe_push_erwaehnung und löscht rufe_push_aus.
   g) Abstimmung verdeckt: ohne Zahlen, Hinweis „Ergebnis kommt am Schluss“; Anlegen mit Haken schickt p_verdeckt.
   h) Migration: Trigger begrenzt Erwähnungen auf den Raum, Push sofort bei Erwähnung/Antwort, „nur für mich“ filtert, rufe_senden kennt p_erwaehnt. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v964 Adler-Rufe neu: Blasen, lang drücken, wischen, @Erwähnen, „Für mich“, Glocke in drei Stufen, Ergebnis am Schluss";
  const probleme = [], zeilen = [];
  const tok = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const ruf = (id, autor, name, rolle, text, m, extra) => Object.assign({ id, raum_id: 5, autor, autor_name: name, autor_zusatz: rolle === "trainer" ? "Trainerteam" : "Eltern von Kind A", autor_rolle: rolle, text, antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(m), erwaehnt: [] }, extra || {});
  const liste = [ruf(30, "u-t", "Trainer T", "trainer", "Hallo zusammen!", 9), ruf(31, "u-t", "Trainer T", "trainer", "Wohin fahren wir?", 8),
    ruf(32, "u-a", "Anna", "eltern", "Wesseling passt", 6, { antwort_auf: 30 }), ruf(33, "u-eigen", "Paul", "eltern", "Bei uns auch", 4),
    ruf(35, "u-b", "Ben", "eltern", "@Paul zwei Plätze frei", 1, { erwaehnt: ["u-eigen"], antwort_auf: 33 })].reverse();
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }, { id: 6, name: "Ideen", emoji: "💡", sort: 1, familie_kind: null }],
    rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : (/raum_id=eq\.5/.test(u.search) ? liste : []),
    rufe_umfrage: [{ id: 6, nachricht_id: 31, optionen: ["Wesseling", "Frechen"], anonym: false, mehrfach: false, schluss: iso(-600), beendet_am: null, von: "u-t", verdeckt: true }],
    rufe_reaktion: [{ nachricht_id: 31, user_id: "u-a", emoji: "👍" }], rufe_fixiert: [{ nachricht_id: 30, bis: null }, { nachricht_id: 31, bis: null }],
    rufe_gelesen: [], rufe_push_aus: [], rufe_push_erwaehnung: [],
    rpc: { is_rufe_mod: false, rufe_ungelesen: [{ raum_id: 6, anzahl: 2, an_alle: false }], rufe_abstimmen: true, rufe_umfrage_erstellen: 40,
      rufe_fuer_mich: [{ id: 35, raum_id: 5, autor: "u-b", autor_name: "Ben", autor_rolle: "eltern", text: "@Paul zwei Plätze frei", created_at: iso(1), grund: "erwaehnt" }],
      rufe_umfrage_stand: [{ umfrage_id: 6, option: 0, anzahl: null, namen: null, ich: true, teilnehmer: 3 }],
      rufe_mitglieder: [{ user_id: "u-a", name: "Anna (Kind A)", trainer: false }, { user_id: "u-b", name: "Ben (Kind C)", trainer: false }, { user_id: "u-t", name: "Trainer T", trainer: true }] }
  }) });
  const r = await s.page.evaluate(async t => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof rufeFuerMich !== "function" || typeof rufeErwaehntAus !== "function") return { alt: true };
    window.sbToken = () => t; localStorage.setItem("adler_rufe_name_gefragt", "1");
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    await rufeOpen(); await w(700);
    const out = {}, hoch = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : 0; };
    out.a = { kopf: [hoch("rufe-suche-knopf"), hoch("rufe-glocke")], reiter: [...document.querySelectorAll("#rufe-raeume .rf-tab")].map(txt),
      fix: document.querySelectorAll("#rufe-fix .rf-fix").length, fixTxt: txt(document.querySelector("#rufe-fix .rf-fix")) };
    const msg = id => document.querySelector(`#rufe-liste .rf-msg[data-id="${id}"]`);
    out.b = { ich: msg(33)?.classList.contains("rf-ich"), du: txt(msg(33)?.querySelector(".rf-sr")), erst30: !!msg(30)?.querySelector(".rf-ava"), folge31: !!msg(31)?.querySelector(".rf-ava"), name31: !!msg(31)?.querySelector(".rf-wer"),
      mich35: msg(35)?.classList.contains("rf-mich"), at: txt(msg(35)?.querySelector(".rf-at")) };
    // c) lang drücken
    const blase = msg(32).querySelector(".rf-blase"), b = blase.getBoundingClientRect();
    const pe = (typ, x) => blase.dispatchEvent(new PointerEvent(typ, { bubbles: true, clientX: x, clientY: b.top + 10, pointerId: 1 }));
    pe("pointerdown", b.left + 20); await w(600);
    const menue = document.getElementById("rufe-menue");
    out.c = { blatt: !!menue, emo: menue ? menue.querySelectorAll(".rf-emo").length : 0, zeilen: menue ? [...menue.querySelectorAll(".btn-zeile")].map(txt) : [] };
    pe("pointerup", b.left + 20); menue?.remove();
    // wischen
    pe("pointerdown", b.left + 20); pe("pointermove", b.left + 60); pe("pointermove", b.left + 110); pe("pointerup", b.left + 110); await w(100);
    out.c.antwort = txt(document.getElementById("rufe-antwort"));
    rufeAntwortWeg();
    // d) @Erwähnen
    const f = document.getElementById("rufe-text"); f.value = "Danke @Be"; f.setSelectionRange(9, 9); rufeTextWachsen(f); await w(300);
    const liste = document.getElementById("rufe-erw-liste");
    out.d = { sichtbar: liste && !liste.hidden, treffer: liste ? [...liste.querySelectorAll("button")].map(txt) : [] };
    liste?.querySelector("button")?.click(); await w(50);
    out.d.text = f.value;
    window.__post = [];
    const echt = window.fetch; window.fetch = (u, o) => { if (/rest\/v1\/rufe_nachricht/.test(String(u)) && o && o.method === "POST") { try { window.__post.push(JSON.parse(o.body)); } catch (e) {} } return echt(u, o); };
    await rufeSenden(); await w(200); window.fetch = echt;
    out.d.post = window.__post;
    // e) Für mich
    rufeFuerMich(); await w(100);
    out.e = { eintraege: [...document.querySelectorAll("#rufe-liste .rf-fm")].map(txt), aktiv: txt(document.querySelector('#rufe-raeume .rf-tab[aria-pressed="true"]')) };
    document.querySelector("#rufe-liste .rf-fm")?.click(); await w(500);
    out.e.zurueck = !!msg(35);
    // f) Glocke
    rufeGlockeMenue(); await w(50);
    const gl = document.getElementById("rufe-menue");
    out.f = { stufen: gl ? [...gl.querySelectorAll(".rf-glocke-wahl b")].map(txt) : [] };
    window.__glocke = [];
    window.fetch = (u, o) => { if (/rufe_push_(aus|erwaehnung)/.test(String(u)) && o && o.method) window.__glocke.push(o.method + " " + String(u).split("/rest/v1/")[1].split("?")[0]); return echt(u, o); };
    await rufeGlockeSetzen("erwaehnung"); window.fetch = echt;
    out.f.aufrufe = window.__glocke; out.f.knopf = txt(document.getElementById("rufe-glocke"));
    // g) verdeckte Abstimmung
    const u = msg(31)?.querySelector(".rf-umfrage");
    out.g = { pct: u ? u.querySelectorAll(".rf-u-pct").length : -1, hinweis: txt(u?.querySelector(".rf-u-fuss")), ich: u?.querySelector(".rf-option")?.getAttribute("aria-pressed") };
    rufeUmfrageNeu(); await w(50);
    document.getElementById("rf-frage").value = "Grillen?"; document.getElementById("rf-opt-0").value = "Ja"; document.getElementById("rf-opt-1").value = "Nein";
    document.getElementById("rf-verdeckt").checked = true;
    window.__rpc = [];
    window.fetch = (u, o) => { if (/rpc\/rufe_umfrage_erstellen/.test(String(u))) { try { window.__rpc.push(JSON.parse(o.body)); } catch (e) {} } return echt(u, o); };
    await rufeUmfrageAnlegen(); window.fetch = echt;
    out.g.anlegen = window.__rpc[0] || null;
    return out;
  }, tok("u-eigen")).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["Neuer Chat fehlt (Stand vor v964)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (r.a.kopf.some(x => x < 44) || !/^@ Für mich/.test(r.a.reiter[0] || "") || !r.a.reiter.some(x => /Ideen\s*2/.test(x)) || r.a.fix !== 1 || !/1 von 2/.test(r.a.fixTxt)) probleme.push("a) " + JSON.stringify(r.a));
  if (!r.b.ich || !/Du/.test(r.b.du) || !r.b.erst30 || r.b.folge31 || r.b.name31 || !r.b.mich35 || r.b.at !== "@Paul") probleme.push("b) " + JSON.stringify(r.b));
  if (!r.c.blatt || r.c.emo !== 6 || !r.c.zeilen.some(z => /Antworten/.test(z)) || !r.c.zeilen.some(z => /Text kopieren/.test(z))) probleme.push("c) Blatt " + JSON.stringify(r.c));
  if (!/Antwort an Anna/.test(r.c.antwort)) probleme.push("c) Wischen antwortet nicht: " + r.c.antwort);
  if (!r.d.sichtbar || !r.d.treffer.some(t => /Ben/.test(t)) || r.d.text !== "Danke @Ben " || !r.d.post.length || JSON.stringify(r.d.post[0].erwaehnt) !== '["u-b"]') probleme.push("d) " + JSON.stringify(r.d));
  if (r.e.eintraege.length !== 1 || !/Ben hat dich erwähnt/.test(r.e.eintraege[0]) || !/Für mich/.test(r.e.aktiv) || !r.e.zurueck) probleme.push("e) " + JSON.stringify(r.e));
  if (r.f.stufen.join("|") !== "Alle Rufe|Nur für mich|Aus" || !r.f.aufrufe.includes("DELETE rufe_push_aus") || !r.f.aufrufe.includes("POST rufe_push_erwaehnung") || !/@/.test(r.f.knopf)) probleme.push("f) " + JSON.stringify(r.f));
  if (r.g.pct !== 0 || !/Ergebnis kommt am Schluss/.test(r.g.hinweis) || r.g.ich !== "true" || !r.g.anlegen || r.g.anlegen.p_verdeckt !== true) probleme.push("g) " + JSON.stringify(r.g));
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20261124_v964_rufe_erwaehnen.sql"), "utf8");
  for (const [m, re] of [["Trigger Raum", /x in \(select k\.user_id from public\._rufe_raum_konten\(new\.raum_id\)/], ["Push sofort", /bool_or\(nu\.autor_rolle='trainer' or nu\.an_alle or nu\.fuer_mich\) sofort/],
    ["nur für mich", /where not e\.nur_erw or nu\.fuer_mich or nu\.an_alle/], ["rufe_senden", /p_erwaehnt uuid\[\]/], ["verdeckt", /zu_frueh then null/]])
    if (!re.test(mig)) probleme.push("h) Migration: " + m);
  const f2 = fe.filter(x => !/Failed to load resource/.test(x)); if (f2.length) probleme.push("Konsole: " + f2.slice(0, 2).join(" | "));
  zeilen.push(`a) Reiter ${r.a.reiter.join(" | ")} · fixiert „${r.a.fixTxt.slice(0, 30)}“ · b) Folgeruf ohne Initialen, „Du:“ für Vorlesehilfen, Erwähnung hervorgehoben`);
  zeilen.push(`c) lang drücken → ${r.c.emo} Reaktionen, ${r.c.zeilen.length} Aktionen · wischen → „${r.c.antwort.slice(0, 25)}“ · d) „${r.d.text}“ → erwaehnt ${JSON.stringify(r.d.post[0] && r.d.post[0].erwaehnt)}`);
  zeilen.push(`e) Für mich: ${r.e.eintraege.length} · f) ${r.f.aufrufe.join(", ")} · g) verdeckt ohne Zahlen, p_verdeckt ${r.g.anlegen && r.g.anlegen.p_verdeckt}`);
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
