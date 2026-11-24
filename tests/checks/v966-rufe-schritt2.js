/* v966 · Charles 24.11. (Adler-Rufe, Schritt 2 – Bild freigegeben): Termin-Karte mit Zusage und Mitfahrt (eine Karte, Trainer hängt
   sie an), „Erinnere mich“, später und still senden (für alle), Fehlende einer Abstimmung einmal erinnern (Ersteller und Trainerteam).
   a) Eltern: Karte zeigt Termin, Zahlen und je Kind „✓ Dabei“/„✗ Absagen“ (≥ 44 px) → elternRsvp; Mitfahrt mit Autos/Plätzen,
      „🙋 Mitfahren“ öffnet die Mitfahrbörse.
   b) Eigener geplanter Ruf: gestrichelt, „geplant … nur du siehst ihn“; Menü „Jetzt senden“ und „Geplanten Ruf löschen“.
   c) „Erinnere mich“ schreibt rufe_erinnerung (nachricht_id, faellig in der Zukunft).
   d) 📎 für Eltern ohne „Termin“, mit „Später senden“ und „Still senden“; gesendet wird mit geplant_fuer und still, die Chips sind sichtbar.
   e) Trainer: 📎 „Termin …“ → Liste → Chip → POST mit termin_id; Abstimmung zeigt „4 fehlen“ und „Die 4 Familien erinnern“ → RPC.
   f) Migration: Lesen nur bis jetzt (außer eigene), stille Rufe ohne Push, Erinnerungen über die Warteschlange, einmal erinnern. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const titel = "v966 Adler-Rufe Schritt 2: Termin-Karte mit Zusage und Mitfahrt, später/still senden, Erinnere mich, Fehlende erinnern";
  const probleme = [], zeilen = [];
  const tok = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const tag = d => { const x = new Date(Date.now() + d * 864e5); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  const ruf = (id, autor, name, rolle, text, m, extra) => Object.assign({ id, raum_id: 5, autor, autor_name: name, autor_zusatz: "", autor_rolle: rolle, text, antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: null, created_at: iso(m), erwaehnt: [], termin_id: null, geplant_fuer: null, still: false, rufe_anhang: [] }, extra || {});
  const TERMIN = { id: 76, typ: "turnier", titel: "Hallenturnier", gegner: "Gegner G", datum: tag(4), uhrzeit: "10:00:00", treffzeit: "09:15", ort: "Halle", heim: false };
  const basis = (uid, extra) => h.supabaseAttrappe(Object.assign({
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }],
    rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : (/raum_id=eq\.5/.test(u.search) ? [
      ruf(30, "u-t", "Trainer T", "trainer", "Samstag geht's los", 30, { termin_id: 76 }),
      ruf(31, "u-t", "Trainer T", "trainer", "Wer kommt mit?", 20),
      ruf(32, "u-a", "Anna", "eltern", "Leise Info", 10, { still: true }),
      ruf(33, uid, "Ich", uid === "u-t" ? "trainer" : "eltern", "Training fällt aus", -600, { geplant_fuer: iso(-600) })].reverse() : []),
    termine: [TERMIN], rueckmeldungen: [{ termin_id: 76, spieler_id: 1, status: null, carpool_status: "none" }],
    rufe_umfrage: [{ id: 6, nachricht_id: 31, optionen: ["Dabei", "Leider nicht"], anonym: false, mehrfach: false, schluss: null, beendet_am: null, von: "u-t", verdeckt: false }],
    rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [], rufe_push_erwaehnung: [], rufe_erinnerung: (u, req) => req.method() === "POST" ? { status: 201, body: "" } : [],
    rpc: { is_rufe_mod: uid === "u-t", rufe_ungelesen: [], rufe_fuer_mich: [], rufe_mitglieder: [], rufe_umfrage_erinnern: 4,
      rufe_umfrage_stand: [{ umfrage_id: 6, option: 0, anzahl: 9, namen: ["A"], ich: false, teilnehmer: 11 }],
      rufe_termin_stand: [{ termin_id: 76, dabei: 9, abgesagt: 2, offen: 4, autos: 2, frei: 5 }],
      rufe_umfrage_fehlende: uid === "u-t" ? [{ fehlen: 4, kinder: 15, erinnert_am: null }] : [] }
  }, extra || {}));
  const ablauf = async (start, uid, fn) => {
    const s = await h.starten({ start, warten: 1000, breite: 390, hoehe: 844, supabase: basis(uid) });
    const r = await s.page.evaluate(fn, tok(uid)).catch(x => ({ fehler: String(x) }));
    const g = s.gesendet.slice(), fe = s.fehler(); await s.schliessen(); return { r, g, fe };
  };
  // ── Eltern ──
  const el = await ablauf("/eltern/index.html", "u-eigen", async t => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof rufeTerminKarteHtml !== "function") return { alt: true };
    window.sbToken = () => t; localStorage.setItem("adler_rufe_name_gefragt", "1");
    window._elternKids = [{ spieler_id: 1, kader: { id: 1, name: "Kind A" } }];
    const rsvp = [], cp = []; window.elternRsvp = async (...a) => { rsvp.push(a); }; window.elternCarpoolOpen = (...a) => { cp.push(a); };
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    await rufeOpen(); await w(900);
    const msg = id => document.querySelector(`#rufe-liste .rf-msg[data-id="${id}"]`), out = {};
    const k = msg(30)?.querySelector(".rf-termin");
    out.a = { karte: txt(k), knoepfe: k ? [...k.querySelectorAll("button")].map(b => txt(b) + ":" + Math.round(b.getBoundingClientRect().height)) : [] };
    k && [...k.querySelectorAll("button")].find(b => /Dabei/.test(b.textContent))?.click(); await w(300);
    k && [...k.querySelectorAll("button")].find(b => /Mitfahren/.test(b.textContent))?.click(); await w(200);
    out.a.rsvp = rsvp; out.a.cp = cp;
    const g = msg(33);
    out.b = { geplant: !!g?.querySelector(".rf-geplant"), meta: txt(g?.querySelector(".rf-meta")), still32: /🔕/.test(txt(msg(32)?.querySelector(".rf-meta"))) };
    rufeMenue(33); await w(100); out.b.menue = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt); document.getElementById("rufe-menue")?.remove();
    rufeMenue(30); await w(100); out.c = { menue: [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt) }; document.getElementById("rufe-menue")?.remove();
    rufeErinnernMenue(30); await w(100); out.c.optionen = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt);
    document.querySelector("#rufe-menue .btn-zeile")?.click(); await w(300);
    rufeAnhangMenue(); await w(100); out.d = { menue: [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt) }; document.getElementById("rufe-menue")?.remove();
    rufePlanenMenue(); await w(100); document.querySelector("#rufe-menue .btn-zeile")?.click(); rufeStillUmschalten(); await w(100);
    out.d.chips = [...document.querySelectorAll("#rufe-optionen .rf-option-chip")].map(txt);
    out.d.chipKnopf = Math.min(...[...document.querySelectorAll("#rufe-optionen button")].map(b => b.getBoundingClientRect().width));
    const f = document.getElementById("rufe-text"); f.value = "Bitte Kuchen mitbringen"; await rufeSenden(); await w(300);
    out.d.danach = document.getElementById("rufe-optionen")?.hasAttribute("hidden");
    return out;
  });
  // ── Trainer ──
  const tr = await ablauf("/trainer/index.html", "u-t", async t => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    if (typeof rufeTerminWahl !== "function") return { alt: true };
    window.sbToken = () => t; localStorage.setItem("adler_rufe_name_gefragt", "1"); window.frageJaNein = async () => true;
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    await rufeOpen(); await w(900);
    const out = {};
    rufeAnhangMenue(); await w(100); out.menue = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt); document.getElementById("rufe-menue")?.remove();
    await rufeTerminWahl(); await w(200); out.liste = [...document.querySelectorAll("#rufe-menue .btn-zeile")].map(txt);
    document.querySelector("#rufe-menue .btn-zeile")?.click(); await w(100);
    out.chip = txt(document.getElementById("rufe-optionen")); out.text = document.getElementById("rufe-text").value;
    await rufeSenden(); await w(300);
    const u = document.querySelector('#rufe-liste .rf-msg[data-id="31"] .rf-u-fehlt');
    out.fehlt = txt(u); const b = u && u.querySelector(".rf-u-erinnern"); out.knopf = b ? Math.round(b.getBoundingClientRect().height) : 0;
    b && b.click(); await w(400);
    return out;
  });
  if (el.r.alt || tr.r.alt) return h.ergebnis(titel, false, ["Schritt 2 fehlt (Stand vor v966)"]);
  if (el.r.fehler || tr.r.fehler) return h.ergebnis(titel, false, ["Ablauf: " + (el.r.fehler || tr.r.fehler)]);
  const a = el.r.a, b = el.r.b, c = el.r.c, d = el.r.d;
  if (!/Turnier Gegner G/.test(a.karte) || !/✓ 9 dabei · ✗ 2 abgesagt · 4 offen/.test(a.karte) || !/2 Autos · 5 Plätze frei/.test(a.karte) || !/Kind A · noch offen/.test(a.karte)) probleme.push("a) Karte „" + a.karte + "“");
  if (a.knoepfe.length < 4 || a.knoepfe.some(x => Number(x.split(":").pop()) < 44)) probleme.push("a) Knöpfe " + a.knoepfe.join(" | "));
  if (JSON.stringify(a.rsvp) !== '[[76,1,"zugesagt"]]' || JSON.stringify(a.cp) !== "[[1,76]]") probleme.push("a) Zusage/Mitfahrt " + JSON.stringify([a.rsvp, a.cp]));
  if (!b.geplant || !/geplant: .* nur du siehst ihn/.test(b.meta) || !b.still32 || !b.menue.some(x => /Jetzt senden/.test(x)) || !b.menue.some(x => /Geplanten Ruf löschen/.test(x)) || b.menue.some(x => /Erinnere/.test(x))) probleme.push("b) " + JSON.stringify(b));
  const erin = el.g.find(x => /rufe_erinnerung$/.test(x.pfad) && x.methode === "POST");
  if (!c.menue.some(x => /Erinnere mich/.test(x)) || !c.optionen.some(x => /Abend vor dem Termin/.test(x)) || !erin || erin.body.nachricht_id !== 30 || !(new Date(erin.body.faellig) > new Date())) probleme.push("c) " + JSON.stringify([c, erin && erin.body]));
  const post = el.g.filter(x => /rufe_nachricht$/.test(x.pfad) && x.methode === "POST").pop();
  if (d.menue.some(x => /Termin/.test(x)) || !d.menue.some(x => /Später senden/.test(x)) || !d.menue.some(x => /Still senden/.test(x)) || d.chips.length !== 2 || d.chipKnopf < 44
      || !post || !post.body.geplant_fuer || post.body.still !== true || post.body.termin_id || !d.danach) probleme.push("d) " + JSON.stringify([d, post && post.body]));
  const t = tr.r, tpost = tr.g.filter(x => /rufe_nachricht$/.test(x.pfad) && x.methode === "POST").pop(), erinRpc = tr.g.find(x => /rpc\/rufe_umfrage_erinnern$/.test(x.pfad));
  if (!t.menue.some(x => /Termin mit Zusage und Mitfahrt/.test(x)) || !t.liste.some(x => /Gegner G/.test(x)) || !/Gegner G/.test(t.chip) || !tpost || tpost.body.termin_id !== 76) probleme.push("e) Termin " + JSON.stringify([t.menue, t.liste, t.chip, tpost && tpost.body]));
  if (!/11 von 15 Kindern · 4 fehlen noch/.test(t.fehlt) || !/Die 4 Familien erinnern/.test(t.fehlt) || t.knopf < 44 || !erinRpc || erinRpc.body.p_umfrage !== 6) probleme.push("e) Fehlende " + JSON.stringify([t.fehlt, t.knopf, erinRpc && erinRpc.body]));
  // f) Migration
  const mp = path.join(h.REPO, "supabase/migrations/20261124_v966_rufe_karten_erinnern.sql");
  const m = fs.existsSync(mp) ? fs.readFileSync(mp, "utf8") : "";
  if (!/created_at <= now\(\) or autor = auth\.uid\(\)/.test(m) || !/and not n\.still/.test(m) || !/'tag', 'erin-'/.test(m) || !/schon_erinnert/.test(m) || !/termin_nur_trainer/.test(m) || !/p_still boolean/.test(m)) probleme.push("f) Migration unvollständig");
  const fe = el.fe.concat(tr.fe).filter(x => !/youtube|Failed to load resource/i.test(x));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) „${a.karte.slice(0, 90)}…“ · Dabei → elternRsvp${JSON.stringify(a.rsvp[0] || [])} · Mitfahren → Mitfahrbörse`);
  zeilen.push(`b) geplant „${b.meta}“ · c) Erinnern: ${c.optionen.length} Zeitpunkte · d) Eltern-📎: ${d.menue.length} Einträge, Chips ${d.chips.join(" + ")} · e) Trainer: Termin-Karte gesendet, „${t.fehlt.slice(0, 60)}“`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
