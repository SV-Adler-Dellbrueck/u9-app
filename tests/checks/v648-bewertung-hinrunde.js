/* v648 · Einzelbewertung erst ab Ende der Hinrunde (doku/auftrag-bewertung-hinrunde/,
   Trainermeeting 27.09.2026). Das Startdatum liegt in team_einstellungen.bewertung_ab
   (RLS lesen und schreiben nur is_trainer() – am 27.09. in der Datenbank geprobt, im PR belegt).

   Kriterien des Auftragspakets:
   1. Datum leer oder morgen: Team → Bewerten gesperrt, mit Satz und Datum; alte Bewertungen lesbar
      (Hinweis auf Profil und Entwicklung).
   2. Davor erscheinen „Bewertungsrunde starten“ und „Runde fällig“ nirgends (Bewerten, Team-Kacheln).
   3. Davor zeigt „Einheit bewerten“ keine Sterne je Kind; Einheit und Übungen sind bewertbar.
   4. Davor ist das Blitz-Rating nicht erreichbar.
   5. Davor trägt eine KI-Antwort mit Werten je Kind nichts ein; die Edge Function fragt dann gar
      nicht danach (eigenes Antwortformat ohne „kinder“, Server liest das Datum selbst).
   6. Datum gestern: alles erreichbar, keine Runde fällig; 48 Tage nach der letzten nicht fällig,
      49 Tage fällig. Zwei Trainer im Abstand von 10 Tagen sind eine Runde, beide stehen über
      dem Formular.
   9. Datumsfeld und genau ein Hauptknopf, beide mindestens 48 px. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const K = h.KINDER, gestern = h.tagePlus(-1);
  /* v649: Die App rechnet das Startdatum in Europe/Berlin. „Morgen“ und „gestern“ fürs Startdatum
     deshalb ebenso – zwischen 22 und 24 Uhr UTC ist in Berlin schon der nächste Tag, und ein
     UTC-„morgen“ wäre dort heute (am 27.09. um 22:40 UTC genau so rot geworden). */
  const berlin = n => { const [y, m, d] = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const morgen = berlin(1), abGestern = berlin(-1);
  const plan = [{ formIdx: 1, formName: "Dribbel Quadrat", trainer: "Alle", slotLabel: "Hauptteil" }];
  const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), spielerprofile: [], team_einstellungen: [], profiles: [{ name: "Charles", rolle: "trainer" }],
    anwesenheit: [], einheit_bewertung: [], trainingsplan: [{ datum: gestern, plan, kopf: {} }], trainings_eval: [],
    termine: [{ id: 7, datum: gestern, typ: "training" }], nominierungen: []
  }) });
  const r = await s.page.evaluate(async ({ K, gestern, morgen, abGestern }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    window.Chart = class { constructor() { this.data = { datasets: [{}] }; } destroy() {} update() {} };
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    if (typeof bewFreigegeben !== "function" || typeof bewSperreAnwenden !== "function") return { fehlt: true };
    try { await loadKader(); } catch (e) {}
    await bewAbLaden();
    const out = {};
    const text = id => (document.getElementById(id) || {}).textContent || "";
    const zustand = async () => {
      go("bew"); bewSperreAnwenden();
      for (let i = 0; i < 30 && !(document.getElementById("bew-runde-bar") || {}).offsetParent; i++) await w(50);
      await w(50);
      const v = document.getElementById("view-bew"), bar = document.getElementById("bew-runde-bar");
      const dims = document.getElementById("dims-wrap");
      const feld = document.getElementById("bew-ab"), knopf = [...bar.querySelectorAll("button")].find(b => /Datum speichern/.test(b.textContent));
      const kacheln = typeof _kachelInhalt === "function" ? (() => { const d = document.createElement("div"); d.innerHTML = _kachelInhalt("team"); return d.textContent; })() : "";
      return { gesperrt: v.classList.contains("bew-gesperrt"), formSichtbar: !!(dims && dims.offsetParent), bar: bar.textContent.replace(/\s+/g, " "),
        feldH: feld ? Math.round(feld.getBoundingClientRect().height) : 0, knopfH: knopf ? Math.round(knopf.getBoundingClientRect().height) : 0,
        hauptknoepfe: [...bar.querySelectorAll(".btn-p")].filter(b => b.offsetParent).length, kacheln, faellig: bewRundenStand().faellig };
    };
    // 1/2/9) leer
    out.leer = await zustand();
    // 5) KI-Antwort mit Kinderwerten, gesperrt
    const box = document.createElement("div"); box.id = "eb-stars-sp-0"; box.dataset.val = "0"; document.body.appendChild(box);
    EB_SPIELER = [K[0]];
    nbInsTraining({ einheit: {}, uebungen: [], kinder: [{ kind: "Kind 1", sterne: 3 }] }, { zurueck: { "Kind 1": K[0] } });
    out.kiStern = box.dataset.val; box.remove();
    // 4) Blitz
    blitzInit(); out.blitz = (document.getElementById("blitz-abschnitt") || {}).style ? document.getElementById("blitz-abschnitt").style.display : "fehlt";
    // 3) Einheit bewerten
    AW_DATA[gestern] = { [K[0]]: { da: true }, [K[2]]: { da: true } };
    await einheitBewertenOpen(); await einheitDetailOpen(gestern);
    for (let i = 0; i < 40 && !document.getElementById("eb-ue-0"); i++) await w(50);
    out.eb = { kinderSterne: document.querySelectorAll('[id^="eb-stars-sp-"]').length, einheit: !!document.getElementById("eb-stars-spass"),
      uebung: !!document.getElementById("eb-ue-0"), hinweis: text("eb-kinder-hinweis") };
    document.getElementById("eb-modal")?.remove();
    // morgen
    BEW_AB = morgen; out.morgen = await zustand();
    // Datum speichern
    document.getElementById("bew-ab").value = "2026-12-12";
    await bewAbSpeichern(document.querySelector("#bew-runde-bar .btn-p")); await w(50);
    out.gespeichert = BEW_AB;
    // 6) gestern
    BEW_AB = abGestern; out.gestern = await zustand();
    out.gestern.runde = /Bewertungsrunde starten/.test(out.gestern.bar);
    blitzInit(); out.blitzFrei = document.getElementById("blitz-abschnitt").style.display;
    // 48 / 49 Tage
    BEW_AB = "2026-01-01";
    const tag = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
    Object.keys(DB).forEach(n => delete DB[n]);
    DB[K[0]] = [{ name: K[0], datum: tag(48), trainer: "Charles" }];
    out.f48 = bewRundenStand().faellig; out.k48 = bewKindFaellig(K[0]);
    DB[K[0]] = [{ name: K[0], datum: tag(49), trainer: "Charles" }];
    out.f49 = bewRundenStand().faellig; out.k49 = bewKindFaellig(K[0]);
    // zwei Trainer, 10 Tage Abstand
    DB[K[1]] = [{ name: K[1], datum: tag(12), trainer: "Trainer B" }, { name: K[1], datum: tag(2), trainer: "Charles" }];
    out.runden = bewRunden(K[1]).length;
    const sel = document.getElementById("p-name");
    if (![...sel.options].some(o => o.value === K[1])) { const o = document.createElement("option"); o.value = o.textContent = K[1]; sel.appendChild(o); }
    bewSperreAnwenden(); sel.value = K[1]; onPlayerSelect(); await w(50);
    out.trainerZeile = text("bew-runde-trainer");
    return out;
  }, { K, gestern, morgen, abGestern });
  const post = s.gesendet.filter(x => /team_einstellungen/.test(x.pfad) && x.methode === "POST").map(x => x.body);
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v648 Bewertung ab Hinrunde", false, ["Funktionen fehlen"]);

  for (const [n, z] of [["leer", r.leer], ["morgen", r.morgen]]) {
    if (!z.gesperrt || z.formSichtbar) probleme.push(`1) ${n}: Formular nicht gesperrt`);
    if (!/Hinrunde/.test(z.bar) || !/Profil und Entwicklung/.test(z.bar)) probleme.push(`1) ${n}: Satz fehlt: ${z.bar.slice(0, 160)}`);
    if (/Bewertungsrunde starten/.test(z.bar) || /Runde fällig/.test(z.kacheln) || z.faellig) probleme.push(`2) ${n}: Runde sichtbar oder fällig`);
    if (z.feldH < 48 || z.knopfH < 48 || z.hauptknoepfe !== 1) probleme.push(`9) ${n}: Feld ${z.feldH} px, Knopf ${z.knopfH} px, Hauptknöpfe ${z.hauptknoepfe}`);
  }
  const morgenDe = new Date(morgen + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (!r.morgen.bar.includes(morgenDe)) probleme.push(`1) Datum ${morgenDe} fehlt im Satz`);
  if (r.kiStern !== "0") probleme.push(`5) KI-Antwort trägt Sterne je Kind ein (${r.kiStern})`);
  if (r.blitz !== "none") probleme.push(`4) Blitz-Rating erreichbar (${r.blitz})`);
  if (r.eb.kinderSterne || !r.eb.einheit || !r.eb.uebung || !/Notiz/.test(r.eb.hinweis)) probleme.push(`3) Einheit bewerten: ${JSON.stringify(r.eb)}`);
  if (r.gespeichert !== "2026-12-12" || !post.some(b => b.bewertung_ab === "2026-12-12" && b.id === 1)) probleme.push(`Datum speichern: ${JSON.stringify(post)}`);
  if (r.gestern.gesperrt || !r.gestern.formSichtbar || !r.gestern.runde || r.gestern.faellig || !/Runde fällig/.test(r.gestern.kacheln)) probleme.push(`6) gestern: ${JSON.stringify({ g: r.gestern.gesperrt, f: r.gestern.formSichtbar, runde: r.gestern.runde, faellig: r.gestern.faellig })}`);
  if (r.blitzFrei === "none") probleme.push("6) Blitz-Rating nach dem Startdatum weiter versteckt");
  if (r.f48 || r.k48 || !r.f49 || !r.k49) probleme.push(`6) Fälligkeit 48/49 Tage: ${r.f48}/${r.k48} · ${r.f49}/${r.k49}`);
  if (r.runden !== 1 || !/Trainer B/.test(r.trainerZeile) || !/Charles/.test(r.trainerZeile)) probleme.push(`6) Runde des Trainerteams: ${r.runden} Runden, „${r.trainerZeile}“`);

  // 5) Edge Function
  const ef = fs.readFileSync(path.join(h.REPO, "supabase/functions/ki-nachbereitung/index.ts"), "utf8");
  const ohne = (ef.match(/const FORM_TRAINING_OHNE_KINDER = `([\s\S]*?)`;/) || [])[1] || "";
  if (!ohne || /"kinder"/.test(ohne) || !/einheit\.notiz/.test(ohne)) probleme.push("5) Antwortformat ohne Kinderwerte fehlt");
  if (!/from\("team_einstellungen"\)\.select\("bewertung_ab"\)/.test(ef) || !/if \(einzelwerte\) for/.test(ef)) probleme.push("5) Server entscheidet nicht selbst über Werte je Kind");
  // Kein Datum im Code
  const app = fs.readdirSync(h.REPO).filter(f => /\.js$/.test(f) && f !== "sw.js").map(f => fs.readFileSync(path.join(h.REPO, f), "utf8")).join("\n");
  if (/BEW_AB\s*=\s*"\d{4}/.test(app)) probleme.push("Startdatum fest im Code");

  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`gesperrt leer/morgen ✓ · Einheit ohne Kinder-Sterne · Blitz ${r.blitz} · 48 T. ${r.f48} / 49 T. ${r.f49} · ${r.trainerZeile}`);
  return h.ergebnis("v648 Einzelbewertung erst ab Ende der Hinrunde", !probleme.length, probleme.concat(zeilen));
};
