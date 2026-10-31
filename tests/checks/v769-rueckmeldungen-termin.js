/* v769 · PO 31.10.: „Ich möchte konkret an einem Termin sehen, wer wann abgesagt oder zugesagt hat.“ (Wahl: „Ja, im Termin-Fenster“)
   a) Im Termin-Fenster (Training, Spiel, Festival) steht „Rückmeldungen“ bei „Für die Eltern“; Trainermeeting hat den Knopf nicht
   b) Der Dialog gruppiert: Zusagen, Absagen, Krank, Keine Antwort – mit Zahlen oben; je Kind Status (Emoji und Wort), Zeitpunkt der
      letzten Antwort und Vorlauf („2 Tage vorher“, „3 Std. vorher“), mit „≈“ ohne Protokoll
   c) Der Verlauf aus dem Protokoll steht als Kette („zusage … → absage …“); vom Trainerteam Eingetragenes ist gekennzeichnet
   d) Fehler (RPC fehlt) nennt die Migration; die Migration: nur Trainer, kein anon; der Eltern-Bereich ruft sie nie auf */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER;
  const morgen = h.tagePlus(1);
  const beginn = new Date(morgen + "T16:45:00").getTime();
  const vor = std => new Date(beginn - std * 3600e3).toISOString();
  const rpcZeilen = [
    { spieler_id: 1, name: K[0], status: "zugesagt", erste_antwort: vor(50), letzte_aenderung: vor(50), durch_trainer: false, verlauf: [{ status: "zugesagt", am: vor(50), trainer: false }], beginn: new Date(beginn).toISOString(), genau: true },
    { spieler_id: 2, name: K[1], status: "abgesagt", erste_antwort: vor(70), letzte_aenderung: vor(3), durch_trainer: false, verlauf: [{ status: "zugesagt", am: vor(70), trainer: false }, { status: "abgesagt", am: vor(3), trainer: false }], beginn: new Date(beginn).toISOString(), genau: true },
    { spieler_id: 3, name: K[2], status: "krank", erste_antwort: vor(20), letzte_aenderung: vor(20), durch_trainer: true, verlauf: [{ status: "krank", am: vor(20), trainer: true }], beginn: new Date(beginn).toISOString(), genau: true },
    { spieler_id: 4, name: K[3], status: "zugesagt", erste_antwort: vor(96), letzte_aenderung: vor(96), durch_trainer: false, verlauf: [], beginn: new Date(beginn).toISOString(), genau: false },
    { spieler_id: 5, name: K[4], status: null, erste_antwort: null, letzte_aenderung: null, durch_trainer: false, verlauf: [], beginn: new Date(beginn).toISOString(), genau: false }
  ];
  const termine = [
    { id: 4, datum: morgen, typ: "training", titel: "", uhrzeit: "16:45", trainer_status: {} },
    { id: 3, datum: morgen, typ: "spiel", titel: "", heim: false, gegner: "SV Test", uhrzeit: "11:00", trainer_status: {} },
    { id: 8, datum: morgen, typ: "trainermeeting", titel: "Meeting", uhrzeit: "19:00", trainer_status: {} }
  ];
  let aus = false;
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, nominierungen: [],
    rpc: { rueckmelde_termin: () => aus ? { status: 404, body: JSON.stringify({ message: "nicht da" }) } : rpcZeilen } }) });
  await s.page.exposeFunction("__aus", v => { aus = !!v; });
  const r = await s.page.evaluate(async (termine) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof rmdOpen !== "function" || typeof tmDetailOpen !== "function") return { fehlt: true };
    await loadKader();
    document.getElementById("pin-gate")?.remove();
    document.getElementById("tm-upcoming")?.remove(); document.getElementById("tm-past")?.remove();
    TM_TERMINE = termine;
    const knopf = id => { document.getElementById("tmd-modal")?.remove(); tmDetailOpen(id); const mo = document.getElementById("tmd-modal");
      mo.querySelectorAll("details").forEach(d => d.open = true);
      const b = [...mo.querySelectorAll("button")].find(x => /Rückmeldungen/.test(x.textContent)); return b ? Math.round(b.getBoundingClientRect().height) : 0; };
    const out = { a: { training: knopf(4), spiel: knopf(3), meeting: knopf(8) } };
    document.getElementById("tmd-modal")?.remove();
    await rmdOpen(4); await w(250);
    const m = document.getElementById("rmd-modal");
    out.b = { dialog: m.getAttribute("role"), kopf: (m.querySelector("#rmd-inhalt > div") || {}).textContent, gruppen: [...m.querySelectorAll("#rmd-inhalt > div > div:first-child")].map(x => x.textContent.trim()),
      zeilen: [...m.querySelectorAll(".rmd-zeile")].map(z => z.textContent.replace(/\s+/g, " ").trim()) };
    window.__aus(true);
    await rmdOpen(4); await w(250);
    out.d = document.getElementById("rmd-inhalt").textContent.trim();
    return out;
  }, termine);
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("v769 Rückmeldungen je Termin", false, ["rmdOpen oder tmDetailOpen fehlt"]); }
  const fe = s.fehler(); await s.schliessen();
  if (r.a.training < 44 || r.a.spiel < 44 || r.a.meeting !== 0) probleme.push("a) " + JSON.stringify(r.a));
  zeilen.push(`a) Knopf „Rückmeldungen“ bei Training und Spiel (${r.a.training} px), nicht beim Trainermeeting`);
  const z = r.b.zeilen;
  const ok = r.b.dialog === "dialog" && /2 Zusagen · 2 Absagen · 1 ohne Antwort/.test(r.b.kopf || "")
    && ["Zusagen · 2", "Absagen · 1", "Krank · 1", "Keine Antwort · 1"].every(g => r.b.gruppen.includes(g))
    && z.some(t => t.startsWith(K[0]) && /✅ Zusage/.test(t) && /2,1 Tage vorher/.test(t) && !/≈/.test(t))
    && z.some(t => t.startsWith(K[1]) && /❌ Absage/.test(t) && /3 Std\. vorher/.test(t))
    && z.some(t => t.startsWith(K[3]) && /≈/.test(t) && /4,0 Tage vorher/.test(t))
    && z.some(t => t.startsWith(K[4]) && !/vorher/.test(t));
  if (!ok) probleme.push("b) " + JSON.stringify(r.b));
  zeilen.push(`b) ${r.b.kopf} · ${r.b.gruppen.join(" · ")}`);
  const kette = z.find(t => t.startsWith(K[1])) || "", krank = z.find(t => t.startsWith(K[2])) || "";
  if (!/Verlauf: zusage .* → absage /.test(kette) || !/🤒 Krank/.test(krank) || !/vom Trainerteam eingetragen/.test(krank)) probleme.push("c) " + JSON.stringify({ kette, krank }));
  zeilen.push("c) Verlauf als Kette „zusage … → absage …“; vom Trainerteam Eingetragenes gekennzeichnet");
  const migDir = path.join(h.REPO, "supabase/migrations");
  const mig = fs.readdirSync(migDir).filter(n => /v769_rueckmelde_termin/.test(n)).map(n => fs.readFileSync(path.join(migDir, n), "utf8")).join("\n");
  const eltern = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  const md = /create or replace function public\.rueckmelde_termin/.test(mig) && /where public\.is_trainer\(\)/.test(mig) && /revoke all on function public\.rueckmelde_termin\(bigint\) from public, anon/.test(mig);
  if (!/Migration v769/.test(r.d) || !md || /rueckmelde_termin/.test(eltern)) probleme.push("d) " + JSON.stringify({ fehler: r.d, migration: md }));
  zeilen.push("d) Fehler nennt die Migration; Migration nur für Trainer; Eltern-Bereich ohne Zugriff");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v769 Rückmeldungen je Termin: wer wann zu- oder abgesagt hat", !probleme.length, probleme.length ? probleme : zeilen);
};
