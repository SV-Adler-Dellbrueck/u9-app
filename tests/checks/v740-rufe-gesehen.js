/* v740 · Adler-Rufe: „Gesehen von …“ nur für das Trainerteam
   PO 04.10.: „Ist es technisch möglich einzustellen, dass ich sehen kann, wer im Adler-Ruf die Nachrichten gelesen
   hat?“ – Kachel „Nur Trainer“. Grundlage ist rufe_gelesen (seit v670); die Rechte prüft
   tests/sql/v740-rufe-gesehen.sql (Eltern bekommen leer, Hilfsfunktion und Anonym gesperrt).
   a) Trainer: unter jedem Ruf „👁 g/e“ als Knopf ≥ 44 px mit sprechender Beschriftung; archivierte ohne
   b) Tipp öffnet einen Dialog: Gesehen (mit Zeit), Noch nicht gesehen, Ohne Elternzugang, Hinweis, was „gesehen“ heißt
   c) Auch über ⋯ → „Wer hat ihn gesehen?“
   d) Eltern: keine Anzeige, kein Menüeintrag und kein Aufruf der Funktionen */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const token = sub => "x." + Buffer.from(JSON.stringify({ sub })).toString("base64") + ".y";
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const ruf = (id, autor, text, m, arch) => ({ id, raum_id: 5, autor, autor_name: autor === "u-trainer" ? "Testa" : "Anna", autor_zusatz: "", autor_rolle: autor === "u-trainer" ? "trainer" : "eltern", text, antwort_auf: null, an_alle: false, bearbeitet_am: null, archiviert_am: arch ? iso(1) : null, created_at: iso(m) });
  const liste = [ruf(3, "u-trainer", "Training fällt aus", 5), ruf(2, "u-eltern", "Danke!", 10), ruf(1, "u-eltern", "alt", 20, true)];
  const attrappe = () => h.supabaseAttrappe({
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0, familie_kind: null }],
    rufe_nachricht: (u, req) => req.method() === "POST" ? { status: 201, body: "[]" } : liste,
    rufe_reaktion: [], rufe_fixiert: [], rufe_gelesen: [], rufe_push_aus: [], rufe_umfrage: [], eltern_kinder: [], kader: h.kaderZeilen(),
    rpc: { is_rufe_mod: true, rufe_ungelesen: [], rufe_umfrage_stand: [],
      rufe_gesehen_zahlen: [{ nachricht_id: 3, gesehen: 2, empfaenger: 4 }, { nachricht_id: 2, gesehen: 4, empfaenger: 4 }, { nachricht_id: 1, gesehen: 1, empfaenger: 4 }],
      rufe_gesehen: [{ name: "Mama A (Kind A)", trainer: false, gesehen: true, zuletzt: iso(2), ohne_zugang: false },
        { name: "Testb", trainer: true, gesehen: true, zuletzt: iso(1), ohne_zugang: false },
        { name: "Elternteil (Kind B)", trainer: false, gesehen: false, zuletzt: null, ohne_zugang: false },
        { name: "Elternteil (Kind C)", trainer: false, gesehen: false, zuletzt: null, ohne_zugang: false },
        { name: "Kind D", trainer: false, gesehen: false, zuletzt: null, ohne_zugang: true }] }
  });
  // ── Trainer ──
  const t = await h.starten({ warten: 1200, hoehe: 900, supabase: attrappe() });
  const r = await t.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof rufeGesehenOpen !== "function") return { fehlt: true };
    document.getElementById("pin-gate")?.remove();
    window.sbToken = () => tok;
    await rufeOpen(); await w(500);
    const knopf = id => document.querySelector(`.rf-msg[data-id="${id}"] .rf-gesehen`);
    const out = { a: [3, 2, 1].map(id => { const b = knopf(id); return b ? { t: b.textContent.replace(/\s+/g, " ").trim(), aria: b.getAttribute("aria-label"), h: Math.round(b.getBoundingClientRect().height) } : null; }) };
    knopf(3).click(); await w(400);
    const d = document.getElementById("rufe-gesehen");
    out.b = d ? { role: d.getAttribute("role"), modal: d.getAttribute("aria-modal"), text: d.textContent.replace(/\s+/g, " ") } : null;
    d?.remove();
    rufeMenue(2); await w(100);
    const eintrag = [...document.querySelectorAll("#rufe-menue button")].find(b => /Wer hat ihn gesehen/.test(b.textContent));
    out.c = !!eintrag; eintrag?.click(); await w(400);
    out.c2 = !!document.getElementById("rufe-gesehen") && !document.getElementById("rufe-menue");
    document.getElementById("rufe-gesehen")?.remove(); rufeClose();
    return out;
  }, token("u-trainer")).catch(e => ({ fehler: String(e) }));
  const f1 = t.fehler(); await t.schliessen();
  if (r.fehlt || r.fehler) return h.ergebnis("v740 Adler-Rufe: Gesehen von … (nur Trainer)", false, [r.fehler || "rufeGesehenOpen fehlt"]);
  const [k3, k2, k1] = r.a;
  if (!k3 || k3.t !== "👁 2/4" || k3.aria !== "Gesehen von 2 von 4 – Namen zeigen" || k3.h < 44 || !k2 || k2.t !== "👁 4/4" || k1) probleme.push(`a) Knöpfe: ${JSON.stringify(r.a)}`);
  zeilen.push(`a) „${k3 && k3.t}“ und „${k2 && k2.t}“ unter den Rufen, ≥ 44 px, archivierter Ruf ohne`);
  const b = r.b || {}, tx = b.text || "";
  const ord = ["✓ Gesehen (2)", "Mama A (Kind A)", "✗ Noch nicht gesehen (2)", "Elternteil (Kind B)", "Ohne Elternzugang (1)", "Kind D", "eine Benachrichtigung allein zählt nicht", "nur das Trainerteam"];
  const pos = ord.map(x => tx.indexOf(x));
  if (b.role !== "dialog" || b.modal !== "true" || pos.some(p => p < 0) || pos.some((p, i) => i && p < pos[i - 1]) || !/🦅 Testb/.test(tx) || !/zuletzt im Raum/.test(tx))
    probleme.push(`b) Dialog: ${JSON.stringify({ role: b.role, pos, tx: tx.slice(0, 400) })}`);
  zeilen.push("b) Dialog: ✓ Gesehen (2) mit Zeit · ✗ Noch nicht gesehen (2) · Ohne Elternzugang (1) · Hinweis");
  if (!r.c || !r.c2) probleme.push(`c) Menü: ${JSON.stringify({ c: r.c, c2: r.c2 })}`);
  zeilen.push("c) ⋯ → „Wer hat ihn gesehen?“ öffnet denselben Dialog");
  // ── Eltern ──
  const s = await h.starten({ start: "/eltern/index.html", warten: 1000, hoehe: 900, supabase: attrappe() });
  const e = await s.page.evaluate(async tok => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => tok;
    await rufeOpen(); await w(500);
    const out = { knoepfe: document.querySelectorAll(".rf-gesehen").length };
    rufeMenue(3); await w(100);
    out.menue = [...document.querySelectorAll("#rufe-menue button")].some(b => /gesehen/i.test(b.textContent));
    await rufeGesehenOpen(3); await w(200);
    out.dialog = !!document.getElementById("rufe-gesehen");
    return out;
  }, token("u-eltern")).catch(err => ({ fehler: String(err) }));
  const aufrufe = s.gesendet.filter(x => /rufe_gesehen/.test(x.pfad)).length;
  const f2 = s.fehler(); await s.schliessen();
  if (e.fehler || e.knoepfe || e.menue || e.dialog || aufrufe) probleme.push(`d) Eltern sehen etwas: ${JSON.stringify({ e, aufrufe })}`);
  zeilen.push("d) Eltern: keine Anzeige, kein Menüeintrag, kein Aufruf");
  const f = f1.concat(f2);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v740 Adler-Rufe: Gesehen von … (nur Trainer)", !probleme.length, zeilen.concat(probleme));
};
