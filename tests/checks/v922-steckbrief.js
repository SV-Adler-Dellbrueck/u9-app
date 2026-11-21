/* v922 · Charles 21.11.: Steckbrief für alle Kinder statt nur fürs Porträt – „Fotos vom Fußball, vom Sport, aus dem
   Privatleben … Lieblingsposition, Hobbys, Lieblingsspieler … Fragen wie in einem Freundebuch … etwas Kreatives“;
   Fragenkatalog freigegeben, Lieblingsposition als Rauten-Position.
   a) Eltern-Startseite: Karte „📸 Erzählt uns von …“ mit „2 von 12 · 1 von 4 Fotos“; „Später“ blendet sie aus.
   b) Bogen: Datenschutz-Satz, 7 Positions-Chips, vier Foto-Kacheln (eine belegt), Klappen Freundebuch und Kreativ;
      Speichern schickt lieblingsposition und die neuen Felder nach kind_fanfacts.
   c) Trainer: Überblick „📖 Steckbriefe“ je Kind, Erinnerung geht über rufe_privat_raum + rufe_nachricht nur an Familien
      mit Raum; der Text trägt den Datenschutz-Satz.
   d) Trainer-Startseite nach einem Heimspiel: „Heimspiel vorbei – wer kommt ins nächste Adler Nest?“, Bestätigen ruft
      portraet_anfragen mit dem nächsten Heimspiel; läuft schon ein Porträt, bleibt die Karte weg. */
"use strict";
const fs = require("fs"), path = require("path");
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const titel = "v922 Steckbrief: Eltern-Karte, Bogen mit Rauten-Position und Foto-Kacheln, Trainer-Überblick, Heimspiel-Karte";
  const probleme = [], zeilen = [];
  /* ── a) + b) Eltern ── */
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 1600,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7 } }],
      kind_fanfacts: (u, req) => req.method() === "GET" ? [{ spieler_id: 1, lieblingsspieler: "Ein Star", hobby: "Lego" }] : { status: 201, body: "[]" },
      kind_foto: [{ id: 3, spieler_id: 1, zweck: "aktion", pfad: "1/album/a.jpg", karte: false, created_at: "2026-11-01" }] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 50 && !document.querySelector("#steckbrief-slot .sb-karte"); i++) await w(150);
    const k = document.querySelector("#steckbrief-slot .sb-karte");
    const out = { karte: k ? k.textContent.replace(/\s+/g, " ").trim() : "" };
    const los = k && k.querySelector(".sb-karte-los"); out.losHoch = los ? Math.round(los.getBoundingClientRect().height) : 0;
    if (los) los.click();
    for (let i = 0; i < 40 && !document.querySelector("#fanfacts-modal .sb-foto"); i++) await w(100);
    const m = document.getElementById("fanfacts-modal");
    out.bogen = !!m; out.schutz = m ? (m.querySelector(".sb-schutz") || {}).textContent || "" : "";
    out.chips = m ? [...m.querySelectorAll("#sb-pos .sb-chip")].map(b => b.textContent.trim()) : [];
    out.fotos = m ? [...m.querySelectorAll(".sb-foto")].map(f => f.className + ":" + f.textContent.replace(/\s+/g, " ").trim()) : [];
    out.klappen = m ? [...m.querySelectorAll(".sb-klappe summary")].map(s => s.textContent.replace(/\s+/g, " ").trim()) : [];
    out.fortVor = (document.getElementById("sb-fortschritt") || {}).textContent;
    const tw = m && [...m.querySelectorAll("#sb-pos .sb-chip")].find(b => b.dataset.pos === "torwart"); if (tw) tw.click();
    const jubel = document.getElementById("ff-torjubel"); if (jubel) { jubel.value = "Flugzeug"; jubel.dispatchEvent(new Event("input", { bubbles: true })); }
    const kraft = document.getElementById("ff-superkraft"); if (kraft) kraft.value = "fliegen";
    out.fortNach = (document.getElementById("sb-fortschritt") || {}).textContent;
    out.twGedrueckt = tw ? tw.getAttribute("aria-pressed") : "";
    const sp = m && [...m.querySelectorAll("button")].find(b => b.textContent.trim() === "Speichern"); if (sp) sp.click();
    await w(800);
    const k2 = document.querySelector("#steckbrief-slot .sb-karte-spaeter"); if (k2) k2.click();
    await w(300);
    out.nachSpaeter = !!document.querySelector("#steckbrief-slot .sb-karte");
    out.spaeterGemerkt = Number(localStorage.getItem("adler_steckbrief_spaeter_1") || 0) > Date.now();
    return out;
  });
  const post = e.gesendet.filter(g => /kind_fanfacts$/.test(g.pfad) && g.methode === "POST").pop();
  const feB = e.fehler().filter(f => !/Failed to load resource|net::ERR/.test(f)); await e.schliessen();
  if (!/Erzählt uns von Kind/.test(r.karte) || !/2 von 12 · 1 von 4 Fotos/.test(r.karte) || r.losHoch < 44) probleme.push(`a) Karte: „${r.karte.slice(0, 140)}“ (${r.losHoch} px)`);
  if (r.nachSpaeter || !r.spaeterGemerkt) probleme.push(`a) „Später“ blendet nicht aus (${r.nachSpaeter}, gemerkt ${r.spaeterGemerkt})`);
  if (!r.bogen || !/Nichts kommt auf Social Media/.test(r.schutz)) probleme.push(`b) Bogen ${r.bogen}, Datenschutz „${r.schutz.slice(0, 80)}“`);
  const sollChips = ["Jäger", "linker Flitzer", "rechter Flitzer", "Aufpasser", "Torwart", "alle", "alle außer Torwart"];
  if (r.chips.map(c => c.replace(/ ✓$/, "")).join("|") !== sollChips.join("|")) probleme.push(`b) Positionen: ${r.chips.join(", ")}`);
  if (r.fotos.length !== 4 || r.fotos.filter(f => /voll/.test(f)).length !== 1 || !/Beim Fußball ✓/.test(r.fotos[0]) || !/Selbst gemalt/.test(r.fotos[3])) probleme.push(`b) Foto-Kacheln: ${r.fotos.join(" | ")}`);
  if (!r.klappen.some(x => /Freundebuch.*0 von 9/.test(x)) || !r.klappen.some(x => /Kreativ und cool.*0 von 8/.test(x))) probleme.push(`b) Klappen: ${r.klappen.join(" | ")}`);
  if (!/Kernfragen 2 von 12/.test(r.fortVor || "") || !/Kernfragen 4 von 12/.test(r.fortNach || "") || r.twGedrueckt !== "true") probleme.push(`b) Fortschritt ${r.fortVor} → ${r.fortNach}, Torwart ${r.twGedrueckt}`);
  const body = post && post.body;
  if (!body || body.lieblingsposition !== "torwart" || body.torjubel !== "Flugzeug" || body.superkraft !== "fliegen" || body.lieblingsspieler !== "Ein Star") probleme.push(`b) Speichern: ${JSON.stringify(body || null).slice(0, 200)}`);
  zeilen.push(`a) „${r.karte.slice(0, 60)}…“, Später gemerkt · b) 7 Positionen, 4 Foto-Kacheln, Klappen 9 + 8, Fortschritt ${r.fortVor} → ${r.fortNach}, gespeichert mit lieblingsposition „torwart“`);

  /* ── c) + d) Trainer ── */
  const lauf = async (laufend) => {
    const raeume = [];
    const s = await h.starten({ hoehe: 1600, supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), profiles: [{ name: "Charles", rolle: "trainer" }],
      termine: u => /heim=eq\.true/.test(u.search) ? (/datum=lt\./.test(u.search) ? [{ id: 40, datum: h.tagePlus(-1), titel: "Heimspiel", gegner: "SC X", heim: true }] : [{ id: 41, datum: h.tagePlus(13), titel: "Heimspiel 2", gegner: "SC Y", heim: true }]) : [],
      portraet_einreichung: laufend ? [{ id: 9, created_at: "2026-11-01T10:00:00Z", status: "angefragt" }] : [],
      kind_fanfacts: [{ spieler_id: 1, lieblingsposition: "jaeger", lieblingsspieler: "a", lieblingsverein: "b", schoenster_moment: "c", torjubel: "d", saisonziel: "e", hobby: "f", kann_gut: "g", lieblingsessen: "h", lieblingstier: "i", gross_werden: "j", stolz_auf: "k", superkraft: "x" }],
      kind_foto: [{ spieler_id: 1, zweck: "aktion" }, { spieler_id: 1, zweck: "sport" }, { spieler_id: 1, zweck: "gemalt" }],
      rufe_nachricht: (u, req) => { if (req.method() === "POST") raeume.push(JSON.parse(req.postData() || "{}")); return { status: 201, body: "" }; },
      rpc: { portraet_anfragen: 5, rufe_privat_raum: (u, req) => { const b = JSON.parse(req.postData() || "{}"); return b.p_kind === 2 ? "raum-2" : { status: 400, body: "{}" }; } } }) });
    const t = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      document.getElementById("pin-gate")?.remove();
      window.frageJaNein = async () => true;
      for (let i = 0; i < 40 && typeof nestHeimspielKarte !== "function"; i++) await w(100);
      let box = document.getElementById("home-nest-heimspiel");
      if (!box) { box = document.createElement("div"); box.id = "home-nest-heimspiel"; document.body.prepend(box); }
      await nestHeimspielKarte();
      const out = { karte: box.textContent.replace(/\s+/g, " ").trim() };
      const b = document.getElementById("nest-heim-bestaetigen"); out.bHoch = b ? parseFloat(getComputedStyle(b).minHeight) || 0 : 0;   // Startseite steht im Test hinter dem PIN-Gate, deshalb die Mindesthöhe
      if (b) { b.click(); await w(500); }
      out.nachher = box.textContent.trim();
      await steckbriefUebersichtOpen();
      const u = document.getElementById("sb-uebersicht");
      out.zeilen = u ? u.querySelectorAll(".sb-tab tbody tr").length : 0;
      out.kindA = u ? ([...u.querySelectorAll(".sb-tab tbody tr")].find(tr => /Kind A/.test(tr.textContent)) || {}).textContent : "";
      const erin = u && [...u.querySelectorAll("button")].find(x => /Erinnerung an/.test(x.textContent));
      out.erinnern = erin ? erin.textContent.trim() : "";
      if (erin) { erin.click(); for (let i = 0; i < 30; i++) await w(100); }
      return out;
    });
    const rpc = s.gesendet.filter(g => /portraet_anfragen$/.test(g.pfad)).map(g => g.body);
    const fe = s.fehler(); await s.schliessen();
    return { t, rpc, raeume, fe };
  };
  const frei = await lauf(false), belegt = await lauf(true);
  const n = h.kaderZeilen().filter(k => k.aktiv !== false).length;
  if (!/Heimspiel vorbei – wer kommt ins nächste Adler Nest\?/.test(frei.t.karte) || !/Vorschlag reihum/.test(frei.t.karte) || frei.t.bHoch < 44) probleme.push(`d) Karte: „${frei.t.karte.slice(0, 120)}“ (${frei.t.bHoch} px)`);
  if (frei.rpc.length !== 1 || frei.rpc[0].p_termin !== 41 || !frei.rpc[0].p_spieler || frei.t.nachher) probleme.push(`d) Bestätigen: ${JSON.stringify(frei.rpc)}, danach „${frei.t.nachher.slice(0, 60)}“`);
  if (belegt.t.karte) probleme.push(`d) läuft schon ein Porträt, trotzdem Karte: „${belegt.t.karte.slice(0, 60)}“`);
  if (frei.t.zeilen !== n || !/12\/12/.test(frei.t.kindA || "") || !/3\/4/.test(frei.t.kindA || "") || frei.t.erinnern !== `🔔 Erinnerung an ${n - 1} offene Familien`) probleme.push(`c) Überblick: ${frei.t.zeilen}/${n} Zeilen, Kind A „${frei.t.kindA}“, Knopf „${frei.t.erinnern}“`);
  if (frei.raeume.length !== 1 || frei.raeume[0].raum_id !== "raum-2" || !/Social Media/.test(frei.raeume[0].text || "")) probleme.push(`c) Erinnerung: ${JSON.stringify(frei.raeume).slice(0, 160)}`);
  zeilen.push(`c) ${frei.t.zeilen} Kinder, Kind A „${(frei.t.kindA || "").trim()}“, „${frei.t.erinnern}“ → 1 Nachricht (nur Familie mit Raum) · d) Heimspiel-Karte, portraet_anfragen mit Termin 41; bei laufendem Porträt keine Karte`);
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8"), portal = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  if (!/id="home-nest-heimspiel"/.test(views) || !/typeof nestHeimspielKarte==="function"/.test(views)) probleme.push("d) Slot oder geschützter Aufruf auf der Trainer-Startseite fehlt");
  if (!/id="steckbrief-slot"/.test(portal) || !/typeof steckbriefKarte==="function"/.test(portal) || !/Steckbrief &amp; Fotos/.test(portal)) probleme.push("a) Slot, geschützter Aufruf oder Zeile „Steckbrief & Fotos“ fehlt");
  const fe = feB.concat(frei.fe, belegt.fe); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
