/* v664 · Kassenwart-Kasse
   PO 28.09.: „Die Mutter von Samu ist neue Kassenwärtin … wie können wir da mit der App
   unterstützen und helfen? Also wie eine digitale Mannschaftskassen-App.“ Kachel „Ja, so bauen“:
   Rolle „Kasse“ für ein Elternteil, bezahlt/offen je Familie, Erinnerung, Export – ohne
   Zahlungsabwicklung. Dazu PO-Bildschirmfoto „Wo kann ich die Benachrichtigungen aktivieren?“.
   a) Teamkasse: je aktive Umlage „Wer hat bezahlt“ mit Knopf je Kind (44 px, aria-pressed,
      „offen“ als Text); Antippen schreibt kasse_zahlung {umlage_id, spieler_id}
   b) Trainer übergibt die Kasse an ein verknüpftes Elternkonto (kasse_team)
   c) Eltern-Bereich: „Kasse verwalten“ (seit v699 Kachel „Kasse führen“) nur, wenn is_kasse wahr ist
   d) Eltern sehen je Umlage den Stand ihres Kindes (✓ bezahlt / offen)
   e) „Offene erinnern“ ruft push-send mit art kasse_erinnerung und meldet die Zahl der Familien
   f) Blockierte Benachrichtigungen: Anleitung statt „nicht erlaubt“
   g) Datenbank: Eltern lesen nur eigene Häkchen; Sicherung enthält die neuen Tabellen;
      keine Systemdialoge in der Kasse (die Kasse arbeitet im Eltern-Bereich) */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const umlagen = [{ id: 7, titel: "Saisonbeitrag", betrag: 40, faellig: null, paypal_link: null, aktiv: true }];
  const uebersicht = { kinder: [{ id: 1, name: "Kind A" }, { id: 2, name: "Kind B" }], zahlungen: [{ u: 7, s: 2, am: "2026-09-28" }] };

  // ── a, b, e: Trainer-App ───────────────────────────────────────────────────
  {
    const s = await h.starten({ start: "/trainer/index.html", warten: 1500,
      supabase: h.supabaseAttrappe({ kasse_umlagen: umlagen, teamkasse: [], kasse_team: [],
        eltern_kinder: [{ email: "elternteil-a@example.test", spieler_id: 1 }], kader: [{ id: 1, name: "Kind A" }, { id: 2, name: "Kind B" }],
        rpc: { kasse_uebersicht: uebersicht },
        funktionen: { "push-send": { ok: true, familien: 1, sent: 1 } } }) });
    const r = await s.page.evaluate(async () => {
      const warte = ms => new Promise(r => setTimeout(r, ms));
      let meldung = ""; window.toast = t => { meldung = t; };
      await kasseOpen(); await warte(600);
      const kn = [...document.querySelectorAll(".kz-kind")];
      const a = kn.map(b => ({ t: b.textContent.trim(), p: b.getAttribute("aria-pressed"), h: Math.round(b.getBoundingClientRect().height) }));
      const kopf = (document.getElementById("kasse-bezahlt-slot") || {}).textContent || "";
      const knA = document.querySelector('.kz-kind[data-s="1"]'); if (knA) knA.click(); await warte(300);
      const rolle = (document.getElementById("kasse-rolle-slot") || {}).textContent || "";
      const opt = document.querySelector("#kasse-rolle-neu option");
      if (opt) { await kasseRolleSetzen(); await warte(200); }
      meldung = ""; await kasseErinnern(); const erinnert = meldung;
      return { a, kopf: kopf.replace(/\s+/g, " "), rolle: rolle.replace(/\s+/g, " "), opt: opt ? opt.textContent : "", erinnert };
    });
    const ges = s.gesendet; const f = s.fehler(); await s.schliessen();
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    if (r.a.length !== 2) probleme.push(`a) ${r.a.length} statt 2 Knöpfe je Kind`);
    if (r.a.some(x => x.h < 44)) probleme.push("a) Knopf unter 44 px");
    const ka = r.a.find(x => /Kind A/.test(x.t)), kb = r.a.find(x => /Kind B/.test(x.t));
    if (!ka || ka.p !== "false" || !/offen/.test(ka.t)) probleme.push("a) Offenes Kind nicht als „offen“ erkennbar: " + JSON.stringify(ka));
    if (!kb || kb.p !== "true" || !/✓/.test(kb.t)) probleme.push("a) Bezahltes Kind nicht als bezahlt erkennbar: " + JSON.stringify(kb));
    if (!/1 von 2 bezahlt/.test(r.kopf)) probleme.push("a) Zählung „1 von 2 bezahlt“ fehlt");
    const z = ges.find(x => /kasse_zahlung/.test(x.pfad) && x.methode === "POST");
    const zb = z && (Array.isArray(z.body) ? z.body[0] : z.body);
    if (!zb || zb.umlage_id !== 7 || zb.spieler_id !== 1) probleme.push("a) Antippen schreibt kein Häkchen: " + JSON.stringify(zb));
    if (!/Wer führt die Kasse/.test(r.rolle) || !/Elternteil von Kind A/.test(r.opt)) probleme.push("b) Auswahl „Wer führt die Kasse“ fehlt: " + r.rolle.slice(0, 120));
    const kt = ges.find(x => /kasse_team/.test(x.pfad) && x.methode === "POST");
    const ktb = kt && (Array.isArray(kt.body) ? kt.body[0] : kt.body);
    if (!ktb || ktb.email !== "elternteil-a@example.test") probleme.push("b) Kasse wird nicht übergeben");
    const pe = ges.find(x => /functions\/v1\/push-send/.test(x.pfad));
    if (!pe || !pe.body || pe.body.art !== "kasse_erinnerung") probleme.push("e) Erinnerung ruft push-send nicht mit art kasse_erinnerung");
    if (!/1 Familie/.test(r.erinnert)) probleme.push("e) Rückmeldung nennt die Familien nicht: " + r.erinnert);
    zeilen.push(`a) ${r.a.map(x => x.t + " [" + x.p + ", " + x.h + " px]").join(" · ")} · ${r.kopf.match(/\d+ von \d+ bezahlt/) || "–"}`);
    zeilen.push(`b) ${r.opt} → kasse_team ${ktb ? "geschrieben" : "fehlt"} · e) „${r.erinnert}“`);
  }

  // ── c, d, f: Eltern-Bereich ────────────────────────────────────────────────
  for (const ist of [true, false]) {
    const s = await h.starten({ start: "/eltern/index.html", warten: 1200,
      supabase: h.supabaseAttrappe({ kasse_zahlung: [{ umlage_id: 7, spieler_id: 1, bezahlt_am: "2026-09-28" }], rpc: { is_kasse: ist } }) });
    const r = await s.page.evaluate(async () => {
      const box = id => { let b = document.getElementById(id); if (!b) { b = document.createElement("div"); b.id = id; document.body.appendChild(b); } return b; };
      const slot = box("kasse-verwalten-slot"); await elternKasseRolleLoad();
      const k = document.createElement("div"); k.innerHTML = '<div class="kz-stand" data-u="7"></div><div class="kz-stand" data-u="8"></div>'; document.body.appendChild(k);
      await elternKasseStandLoad([{ spieler_id: 1, kader: { name: "Kind A" } }]);
      const st = [...k.querySelectorAll(".kz-stand")].map(e => e.textContent.trim());
      pushGesperrtHilfe("denied"); await new Promise(r => setTimeout(r, 100));
      const hilfe = (document.getElementById("frage-modal") || {}).textContent || "";
      return { knopf: slot.textContent.trim(), st, hilfe: hilfe.replace(/\s+/g, " ") };
    });
    await s.schliessen();
    if (ist && !/Kasse führen|Kasse verwalten/.test(r.knopf)) probleme.push("c) Kasse sieht „Kasse verwalten“ nicht");
    if (!ist && r.knopf) probleme.push("c) Normales Elternteil sieht „Kasse verwalten“");
    if (ist) {
      if (!/✓ bezahlt/.test(r.st[0]) || !/offen/.test(r.st[1])) probleme.push("d) Stand je Umlage falsch: " + r.st.join(" | "));
      if (!/blockiert/.test(r.hilfe) || !/Benachrichtigungen/.test(r.hilfe)) probleme.push("f) Keine Anleitung bei blockierten Benachrichtigungen");
      zeilen.push(`c) Kasse: „${r.knopf}“ · d) ${r.st.join(" / ")} · f) ${r.hilfe.slice(0, 70)}…`);
    } else zeilen.push(`c) normales Elternteil: ${r.knopf ? "Knopf da" : "kein Knopf"}`);
  }

  // ── g: Datenbank, Sicherung, Systemdialoge ─────────────────────────────────
  const mig = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260928_v664_kassenwart.sql"), "utf8");
  if (!/create policy kz_eltern on public\.kasse_zahlung for select[\s\S]*is_parent_of\(spieler_id\)/.test(mig)) probleme.push("g) Eltern lesen nicht nur eigene Häkchen");
  if (!/if not public\.is_kasse\(\) then raise/.test(mig)) probleme.push("g) kasse_uebersicht ohne Rollenprüfung");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  if (!/"kasse_zahlung","kasse_team"/.test(views)) probleme.push("g) Neue Tabellen fehlen in der Sicherung");
  const tk = fs.readFileSync(path.join(h.REPO, "md-teamkasse.js"), "utf8");
  if (/[^.\w]confirm\(|[^.\w]prompt\(/.test(tk)) probleme.push("g) Systemdialog in der Teamkasse");
  const ps = fs.readFileSync(path.join(h.REPO, "supabase/functions/push-send/index.ts"), "utf8");
  if (!/kasse_erinnert_am/.test(ps) || !/Nur die Kasse darf erinnern/.test(ps)) probleme.push("g) push-send ohne Sperre oder Rollenprüfung");
  zeilen.push("g) RLS eigene Häkchen, Rollenprüfung, Sicherung, keine Systemdialoge, Erinnerung gedrosselt");
  return h.ergebnis("v664 Kassenwart-Kasse", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
