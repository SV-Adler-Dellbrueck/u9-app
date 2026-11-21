/* v935 · Privater Raum je Elternteil in den Adler-Rufen (Charles 21.11.2026: „Zusätzlich Raum je Elternteil“, Bild frei).
   a) Trainer: „🔒 Familien“ zeigt je Familie „👪 Familie (es lesen mit: …)“ und bei zwei Konten „👤 Nur …“ je Elternteil;
      „Nur Anna“ öffnet den Raum über rufe_privat_raum mit p_email; die Kopfzeile sagt „Privat – nur Anna und das Trainerteam“.
   b) Eltern: Mit zwei Konten in der Familie gibt es neben „🔒 Trainerteam · Familie“ den Raum „🔒 Trainerteam · nur ich“
      (p_nur_ich); im Familienraum nennt die Kopfzeile die anderen Mitleser.
   c) Eltern ohne Vornamen werden einmal gefragt „Wie sollen wir dich nennen?“; Speichern schreibt eltern_angaben.vorname.
   d) Migration: Sichtbarkeit, Lese-Regel, Empfänger und Push kennen den Einzelraum (eltern_email). */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const tok = "x." + Buffer.from(JSON.stringify({ sub: "u-eltern-a", email: "a@example.org" })).toString("base64") + ".y";
  const RAEUME = [
    { id: 1, name: "Team", emoji: "📣", sort: 1, familie_kind: null, nur_eltern: false, eltern_email: null },
    { id: 4, name: "Trainerteam", emoji: "🔒", sort: 1000, familie_kind: 3, nur_eltern: false, eltern_email: null }];
  const rpcAufrufe = [];
  const merk = name => (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} rpcAufrufe.push({ name, b }); return null; };
  const rpc = {
    is_rufe_mod: false, rufe_ungelesen: [],
    rufe_elternkonten: [{ familie_kind: 3, mail: "a@example.org", name: "Anna" }, { familie_kind: 3, mail: "b@example.org", name: "Papa" }],
    rufe_mitleser: (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} return b.p_raum === 20 ? [{ name: "Anna", ich: false }] : [{ name: "Anna", ich: true }, { name: "Papa", ich: false }]; },
    rufe_privat_raum: (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} rpcAufrufe.push({ name: "rufe_privat_raum", b }); return (b.p_email || b.p_nur_ich) ? 20 : 4; }
  };
  const raeume = () => { const neu = rpcAufrufe.some(x => x.name === "rufe_privat_raum" && (x.b.p_email || x.b.p_nur_ich)); return neu ? RAEUME.concat([{ id: 20, name: "Trainerteam", emoji: "🔒", sort: 1001, familie_kind: 3, nur_eltern: false, eltern_email: "a@example.org" }]) : RAEUME; };

  // a) Trainer
  const t = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), rufe_raum: raeume, eltern_kinder: [{ email: "a@example.org", spieler_id: 3 }, { email: "b@example.org", spieler_id: 3 }], rufe_nachricht: [], rpc }) });
  await h.sichtbarMachen(t.page, "#main-app");
  const rt = await t.page.evaluate(async (tok) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => tok;
    for (let i = 0; i < 40 && typeof rufeOpen !== "function"; i++) await w(100);
    await rufeOpen(); await w(400);
    if (typeof rufeFamilienOpen !== "function") return { fehlt: "rufeFamilienOpen" };
    rufeFamilienOpen(); await w(100);
    const m = document.getElementById("rufe-menue");
    const out = { zeilen: m ? [...m.querySelectorAll(".rf-familie")].map(b => b.textContent.replace(/\s+/g, " ").trim()) : [] };
    const nur = m && [...m.querySelectorAll(".rf-familie")].find(b => /Nur Anna/.test(b.textContent));
    if (nur) { nur.click(); await w(700); }
    out.unter = (document.getElementById("rufe-unter") || {}).textContent || "";
    out.platzhalter = (document.getElementById("rufe-text") || {}).placeholder || "";
    if (typeof rufeClose === "function") rufeClose();
    return out;
  }, tok);
  const feT = t.fehler(); await t.schliessen();
  if (rt.fehlt) probleme.push("a) " + rt.fehlt + " fehlt");
  else {
    if (!rt.zeilen.some(z => /Familie\s*es lesen mit: Anna, Papa/.test(z)) || !rt.zeilen.some(z => /Nur Anna/.test(z)) || !rt.zeilen.some(z => /Nur Papa/.test(z))) probleme.push(`a) Familienliste: ${JSON.stringify(rt.zeilen)}`);
    const auf = rpcAufrufe.find(x => x.name === "rufe_privat_raum" && x.b.p_email);
    if (!auf || auf.b.p_email !== "a@example.org" || auf.b.p_kind !== 3) probleme.push(`a) „Nur Anna“ ruft rufe_privat_raum mit ${JSON.stringify(auf && auf.b)}`);
    if (!/Privat – nur Anna und das Trainerteam/.test(rt.unter)) probleme.push(`a) Kopfzeile: „${rt.unter}“`);
    if (!/Nachricht an Anna/.test(rt.platzhalter)) probleme.push(`a) Eingabefeld: „${rt.platzhalter}“`);
  }
  // b) + c) Eltern
  rpcAufrufe.length = 0;
  const e = await h.starten({ start: "/eltern/index.html", warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), rufe_raum: raeume, eltern_angaben: [], rufe_nachricht: [], rpc }) });
  const re = await e.page.evaluate(async (tok) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.sbToken = () => tok;
    try { localStorage.removeItem("adler_rufe_name_gefragt"); } catch (x) {}
    for (let i = 0; i < 40 && typeof rufeOpen !== "function"; i++) await w(100);
    await rufeOpen(4); await w(600);
    const chips = () => [...document.querySelectorAll("#rufe-raeume button")].map(b => b.textContent.replace(/\s+/g, " ").trim());
    const out = { chips: chips(), unter: (document.getElementById("rufe-unter") || {}).textContent || "" };
    out.nameKarte = !!document.querySelector("#rufe-name .rf-name-karte");
    const f = document.getElementById("rf-name-feld"); if (f) { f.value = "Anna"; await rufeNameSpeichern(); await w(100); }
    out.nameWeg = !document.querySelector("#rufe-name .rf-name-karte");
    const ich = [...document.querySelectorAll("#rufe-raeume button")].find(b => /nur ich/.test(b.textContent));
    if (ich) { ich.click(); await w(700); }
    out.unterIch = (document.getElementById("rufe-unter") || {}).textContent || "";
    if (typeof rufeClose === "function") rufeClose();
    return out;
  }, tok);
  const gesendet = e.gesendet.slice(); const feE = e.fehler(); await e.schliessen();
  if (!re.chips.some(c => /Trainerteam · Familie/.test(c)) || !re.chips.some(c => /Trainerteam · nur ich/.test(c))) probleme.push(`b) Eltern-Räume: ${JSON.stringify(re.chips)}`);
  if (!/Privat – du, Papa und das Trainerteam/.test(re.unter)) probleme.push(`b) Kopfzeile im Familienraum: „${re.unter}“`);
  const ichAuf = rpcAufrufe.find(x => x.name === "rufe_privat_raum" && x.b.p_nur_ich === true);
  if (!ichAuf) probleme.push("b) „nur ich“ ruft rufe_privat_raum nicht mit p_nur_ich");
  if (!/Privat – nur du und das Trainerteam/.test(re.unterIch)) probleme.push(`b) Kopfzeile im Raum „nur ich“: „${re.unterIch}“`);
  if (!re.nameKarte) probleme.push("c) Die Frage „Wie sollen wir dich nennen?“ fehlt");
  const post = gesendet.find(g => g.methode === "POST" && /eltern_angaben/.test(g.pfad));
  if (!post || post.body.vorname !== "Anna" || !re.nameWeg) probleme.push(`c) Speichern: ${JSON.stringify(post && post.body)}, Karte weg ${re.nameWeg}`);
  [...feT, ...feE].slice(0, 2).forEach(x => probleme.push("Konsole: " + x));
  // d) Migration
  const sql = fs.readFileSync(path.join(h.REPO, "supabase", "migrations", "20261121_v935_raum_je_elternteil.sql"), "utf8");
  for (const [was, re2] of [["Spalte", /add column if not exists eltern_email/], ["Sichtbarkeit", /function public\.rufe_raum_sichtbar[\s\S]*eltern_email/], ["Lese-Regel", /create policy rr_lesen[\s\S]*eltern_email/],
    ["Empfänger", /function public\._rufe_empfaenger[\s\S]*n\.eltern_email/], ["Push", /rufe_push_faellig[\s\S]*r\.eltern_email is null or e\.mail=r\.eltern_email/], ["Konten nur für Trainer", /rufe_elternkonten[\s\S]*where public\.is_trainer\(\)/]])
    if (!re2.test(sql)) probleme.push("d) Migration ohne " + was);
  if (!probleme.length) zeilen.push(`Trainer: ${rt.zeilen.length} Zeilen (Familie + Nur Anna + Nur Papa) · „Nur Anna“ → p_email, Kopfzeile „${rt.unter}“ · Eltern: ${re.chips.filter(c => /Trainerteam/.test(c)).join(" / ")} · Kopfzeilen „${re.unter}“ / „${re.unterIch}“ · Namensfrage gespeichert`);
  return h.ergebnis("v935 Raum je Elternteil: Familie oder einzelnes Elternteil, Kopfzeile nennt die Mitleser", !probleme.length, zeilen.concat(probleme));
};
