/* v660 · Meine Angaben: Eltern tragen Name, Handy und Geburtstag ein, dazu den Geburtstag ihres Kindes
   PO 28.09.: „… dass alle Eltern als To-do angezeigt bekommen, die Daten ihres Kindes und ihre
   eigenen einzutragen … Name, Handy, E-Mail, Geburtsdatum, damit wir auch den Eltern als Teil der
   Mannschaft gratulieren können. Vom Kind brauchen wir das auch.“
   a) „Erste Schritte“ führt die drei neuen Punkte (Angaben, Geburtstag des Kindes, Fan-Fakten),
      solange sie offen sind
   b) Speichern schreibt eltern_angaben (Upsert) und den Geburtstag des Kindes über die geprüfte
      Funktion – nie direkt in den Kader; danach sind die Punkte erledigt
   c) eine unbrauchbare Handynummer geht nicht an den Server
   d) Felder 48 px, Speichern 56 px, Dialog gekennzeichnet
   e) Trainer-Startseite: Eltern mit Geburtstag in den nächsten 14 Tagen stehen in der Karte, ohne Alter
   f) Datenbank: RLS an, nur selbst und Trainer, anon gesperrt, Kind nur über is_parent_of,
      Datenauszug enthält die Angaben */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heuteIn = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const kind = { spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, geb: null } };

  // ── a–d: Eltern ─────────────────────────────────────────────────────────────
  {
    let angaben = [];
    const s = await h.starten({ start: "/eltern/index.html", warten: 900, breite: 390,
      supabase: h.supabaseAttrappe({
        eltern_angaben: (u, req) => {
          if (req.method() === "POST") { try { angaben = [JSON.parse(req.postData())]; } catch (e) {} return { status: 201, body: "[]" }; }
          return angaben;
        },
        kind_fanfacts: [], kind_notfall: [], foto_consent: [], fairplay_commit: [],
        rpc: { eltern_kind_geburtstag: () => ({ status: 204, body: "" }) }
      }) });
    const r = await s.page.evaluate(async kind => {
      const warte = ms => new Promise(r => setTimeout(r, ms));
      const out = {};
      window._elternKids = [kind];
      let slot = document.getElementById("eltern-checklist-slot");
      if (!slot) { slot = document.createElement("div"); slot.id = "eltern-checklist-slot"; document.body.appendChild(slot); }
      try { localStorage.removeItem("adler_setup_hide"); } catch (e) {}
      await elternChecklistLoad([kind]);
      out.vorher = slot.textContent.replace(/\s+/g, " ");
      await elternAngabenOpen(); await warte(100);
      const m = document.getElementById("angaben-modal");
      out.dialog = !!(m && m.getAttribute("role") === "dialog" && m.getAttribute("aria-modal") === "true");
      out.feldHoehen = [...m.querySelectorAll("input")].map(i => Math.round(i.getBoundingClientRect().height));
      out.knopf = Math.round(document.getElementById("ang-save").getBoundingClientRect().height);
      // c) falsche Nummer
      document.getElementById("ang-vor").value = "Vorname";
      document.getElementById("ang-nach").value = "Nachname";
      document.getElementById("ang-handy").value = "ruf mich an";
      document.getElementById("ang-geb").value = "1985-05-17";
      document.getElementById("ang-kgeb-1").value = "2018-03-02";
      await elternAngabenSave(document.getElementById("ang-save")); await warte(100);
      out.fehler = document.getElementById("ang-fehler")?.textContent || "";
      // b) richtig
      document.getElementById("ang-handy").value = "0171 1234567";
      await elternAngabenSave(document.getElementById("ang-save")); await warte(300);
      out.zu = !document.getElementById("angaben-modal");
      out.nachher = slot.textContent.replace(/\s+/g, " ");
      return out;
    }, kind);
    const posts = s.gesendet.filter(x => x.pfad.endsWith("/eltern_angaben"));
    const rpc = s.gesendet.filter(x => x.pfad.endsWith("/rpc/eltern_kind_geburtstag"));
    const kaderSchreib = s.gesendet.filter(x => /\/rest\/v1\/kader$/.test(x.pfad));
    const f = s.fehler();
    await s.schliessen();
    for (const t of ["Deine Angaben eintragen", "Geburtstag von Kind A", "Fan-Fakten von Kind A"])
      if (!r.vorher.includes(t)) probleme.push(`a) „Erste Schritte“ nennt „${t}“ nicht`);
    if (!r.dialog) probleme.push("d) Dialog nicht als role=dialog/aria-modal gekennzeichnet");
    if (r.feldHoehen.some(x => x < 48)) probleme.push("d) Eingabefelder unter 48 px: " + r.feldHoehen.join("/"));
    if (r.knopf < 56) probleme.push(`d) „Angaben speichern“ nur ${r.knopf} px`);
    if (!/Handynummer/.test(r.fehler)) probleme.push("c) keine Meldung bei unbrauchbarer Handynummer");
    if (posts.length !== 1) probleme.push(`b/c) ${posts.length} Schreibvorgänge auf eltern_angaben statt 1 (die falsche Nummer darf nicht hinausgehen)`);
    const b = posts[0] && posts[0].body || {};
    if (b.vorname !== "Vorname" || b.nachname !== "Nachname" || b.handy !== "0171 1234567" || b.geburtstag !== "1985-05-17")
      probleme.push("b) gespeicherte Angaben stimmen nicht: " + JSON.stringify(b));
    if (posts[0] && !/on_conflict=user_id/.test(posts[0].suche)) probleme.push("b) kein Upsert (on_conflict=user_id)");
    if (rpc.length !== 1 || !rpc[0].body || rpc[0].body.p_geb !== "2018-03-02" || rpc[0].body.p_spieler_id !== 1)
      probleme.push("b) Geburtstag des Kindes nicht über eltern_kind_geburtstag: " + JSON.stringify(rpc.map(x => x.body)));
    if (kaderSchreib.length) probleme.push("b) Eltern-Bereich schreibt direkt in den Kader");
    if (!r.zu) probleme.push("b) Dialog bleibt nach dem Speichern offen");
    if (/Deine Angaben eintragen|Geburtstag von Kind A/.test(r.nachher) && !/erledigt/.test(r.nachher))
      probleme.push("b) Punkte bleiben nach dem Speichern offen");
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`a–d) Erste Schritte mit 3 neuen Punkten · falsche Nummer abgefangen · 1 Upsert, 1× eltern_kind_geburtstag, 0× Kader · Felder ${Math.min(...r.feldHoehen)} px, Knopf ${r.knopf} px`);
  }

  // ── e: Trainer-Startseite ───────────────────────────────────────────────────
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(),
      eltern_angaben: [{ vorname: "Elter", nachname: "Eins", geburtstag: "1984-" + heuteIn(3).slice(5) },
                       { vorname: "Elter", nachname: "Zwei", geburtstag: "1984-" + heuteIn(40).slice(5) }] }) });
    await s.page.waitForTimeout(3500);
    const r = await s.page.evaluate(async () => {
      let slot = document.getElementById("home-geb");
      if (!slot) { slot = document.createElement("div"); slot.id = "home-geb"; document.body.appendChild(slot); }
      await homeGeburtstage();
      return (document.getElementById("home-geb") || {}).textContent || "";
    });
    const f = s.fehler();
    await s.schliessen();
    const t = r.replace(/\s+/g, " ");
    if (!/Elter Eins/.test(t)) probleme.push("e) Elternteil mit Geburtstag in 3 Tagen fehlt: " + t.slice(0, 120));
    if (/Elter Zwei/.test(t)) probleme.push("e) Elternteil mit Geburtstag in 40 Tagen steht in der 14-Tage-Karte");
    if (/Elter Eins[^·]*·[^E]*wird \d/.test(t)) probleme.push("e) Beim Elternteil steht ein Alter");
    if (f.length) probleme.push("e) Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`e) Trainer: „${t.slice(0, 110)}“`);
  }

  // ── f: Migration ────────────────────────────────────────────────────────────
  {
    const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260928_v660_eltern_angaben.sql"), "utf8");
    const pruef = [
      [/enable row level security/, "RLS nicht eingeschaltet"],
      [/user_id = \(select auth\.uid\(\)\)/, "Regel „nur die eigene Zeile“ fehlt"],
      [/for select to authenticated\s+using \(public\.is_trainer\(\)\)/, "Leserecht der Trainer fehlt"],
      [/revoke all on public\.eltern_angaben from anon/, "anon nicht gesperrt"],
      [/is_parent_of\(p_spieler_id\)/, "Kind-Geburtstag prüft die Elternschaft nicht"],
      [/revoke all on function public\.eltern_kind_geburtstag\(bigint, date\) from public, anon/, "Funktion für anon offen"],
      [/'angaben', \(select to_jsonb\(ea\)/, "Datenauszug enthält die Angaben nicht"],
      [/on delete cascade/, "Angaben bleiben beim Konto-Löschen stehen"]
    ];
    pruef.forEach(([re, t]) => { if (!re.test(sql)) probleme.push("f) " + t); });
    zeilen.push(`f) Migration: ${pruef.length - probleme.filter(p => p.startsWith("f)")).length}/${pruef.length} Zusicherungen`);
  }
  return h.ergebnis("v660 Meine Angaben: Eltern und Geburtstage", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
