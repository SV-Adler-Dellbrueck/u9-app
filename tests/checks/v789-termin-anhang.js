/* v789 · Anhänge am Termin (Charles 05.11.: „den Spielplan der Gastgeber im Termin für die Eltern anhängen“)
   a) Eltern: Termin-Fenster zeigt die Karte mit Bild (Vorschau, Antippen = groß) und PDF (≥ 56 px); Terminkarte und Liste tragen „📎 Spielplan …“
   b) Trainer: im Fenster „Termin bearbeiten“ steht „Anhang hinzufügen“ (≥ 48 px); Datei wählen → Titel mit Vorgabe → Hochladen schickt erst die Datei an den
      Speicher (termin-anhang/<Termin>/<uuid>.png), dann die Zeile an termin_anhang
   c) Regeln: Word und Excel sind nicht erlaubt, über 10 MB nicht, Dateiname wird bereinigt
   d) Ohne die Tabelle (Migration fehlt) bleibt die Eltern-Ansicht still und die Trainer-Ansicht sagt es ruhig */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [{ id: 100, datum: h.tagePlus(3), typ: "spiel", titel: "", gegner: "SpVg Wahn Grengel", heim: false, uhrzeit: "10:15", uhrzeit_ende: "11:30", ort: "KuRa Nachtigallenstrasse", trainer_status: {} },
                   { id: 101, datum: h.tagePlus(6), typ: "training", titel: "", uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }];
  const zeilenAnhang = [{ id: 1, pfad: "100/11111111-1111-4111-8111-111111111111.png", titel: "Spielplan der Gastgeber", name: "spielplan.png", mime: "image/png", groesse: 123456 },
                        { id: 2, pfad: "100/22222222-2222-4222-8222-222222222222.pdf", titel: "Anfahrt", name: "anfahrt.pdf", mime: "application/pdf", groesse: 34567 }];
  const anhangTabelle = (u, req) => req.method() !== "GET" ? { status: 201, body: "[]" }
    : /termin_id=in\./.test(u.search) ? [{ termin_id: 100, titel: zeilenAnhang[0].titel }, { termin_id: 100, titel: zeilenAnhang[1].titel }]
    : /termin_id=eq\.100/.test(u.search) ? zeilenAnhang : [];

  // a) Eltern
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }], termin_anhang: anhangTabelle,
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const a = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    out.chipKarte = (document.getElementById("termin-card") || {}).textContent || "";
    await terminDetailOpen(100); await w(1200);
    const box = document.getElementById("td-anhang");
    out.titel = box ? box.textContent.replace(/\s+/g, " ").trim() : null;
    out.bild = !!(box && box.querySelector("img[data-ta-pfad]"));
    const pdf = box && [...box.querySelectorAll("button")].find(b => /PDF öffnen/.test(b.getAttribute("aria-label") || ""));
    out.pdfH = pdf ? Math.round(pdf.getBoundingClientRect().height) : 0;
    const bildKnopf = box && box.querySelector("button[aria-label$='groß ansehen']");
    if (bildKnopf) { bildKnopf.click(); await w(800); }
    out.gross = !!document.getElementById("rufe-gross");
    document.getElementById("rufe-gross")?.remove();
    out.quer = document.documentElement.scrollWidth <= innerWidth + 1;
    return out;
  });
  const fe1 = s.fehler(); await s.schliessen();
  if (fe1.length) probleme.push("Konsole (Eltern): " + fe1.slice(0, 2).join(" | "));
  if (!/📎 Spielplan der Gastgeber/.test(a.chipKarte)) probleme.push("a) Terminkarte ohne Hinweis: „" + a.chipKarte.slice(0, 80) + "“");
  if (!a.titel || !/Anhänge zum Termin/.test(a.titel) || !/Spielplan der Gastgeber/.test(a.titel) || !/Anfahrt/.test(a.titel)) probleme.push("a) Karte im Termin-Fenster: " + a.titel);
  if (!a.bild || a.pdfH < 56 || !a.gross || !a.quer) probleme.push("a) Bild/PDF/groß/quer: " + JSON.stringify({ bild: a.bild, pdfH: a.pdfH, gross: a.gross, quer: a.quer }));
  zeilen.push(`Eltern: Hinweis auf der Terminkarte, Karte mit Bild + PDF (${a.pdfH} px), Bild groß ${a.gross ? "geht" : "geht nicht"}`);

  // b) + c) Trainer
  const t = await h.starten({ breite: 390, hoehe: 844, warten: 1500, angemeldet: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [], termin_anhang: (u, req) => req.method() !== "GET" ? { status: 201, body: "[]" } : [] }) });
  await h.sichtbarMachen(t.page, "#main-app");
  await t.page.evaluate(async () => { TM_TERMINE = [{ id: 100, typ: "spiel", datum: "2099-01-01", titel: "", gegner: "SpVg Wahn Grengel", heim: false, uhrzeit: "10:15", trainer_status: {} }]; tmEdit(100); await new Promise(x => setTimeout(x, 1200)); });
  const b0 = await t.page.evaluate(() => { const k = document.getElementById("ta-knopf"); return { text: (document.getElementById("ta-slot") || {}).textContent || "", h: k ? Math.round(k.getBoundingClientRect().height) : 0 }; });
  await t.page.setInputFiles("#ta-knopf input", { name: "Spielplan Wahn.png", mimeType: "image/png", buffer: PNG });
  await t.page.waitForTimeout(500);
  const b1 = await t.page.evaluate(() => ({ titel: (document.getElementById("ta-titel") || {}).value, hoch: !!document.getElementById("ta-hoch") }));
  await t.page.click("#ta-hoch"); await t.page.waitForTimeout(1500);
  const speicher = t.gesendet.find(g => g.methode === "POST" && /\/storage\/v1\/object\/termin-anhang\/100\/[0-9a-f-]{36}\.(png|jpg)$/.test(g.pfad));
  const zeile = t.gesendet.find(g => g.methode === "POST" && /\/rest\/v1\/termin_anhang$/.test(g.pfad));
  const c = await t.page.evaluate(() => ({
    docx: taPruefen("plan.docx", 100), xlsx: taPruefen("plan.xlsx", 100), gross: taPruefen("plan.pdf", 11 * 1048576), leer: taPruefen("plan.pdf", 0), gut: taPruefen("Plan.PDF", 5000), jpeg: taPruefen("a.jpeg", 5),
    name: taName("C:\\fakepath\\Spiel:plan?.png"), lang: taName("x".repeat(200) + ".pdf").length }));
  const fe2 = t.fehler(); await t.schliessen();
  if (fe2.length) probleme.push("Konsole (Trainer): " + fe2.slice(0, 2).join(" | "));
  if (!/Anhänge für die Eltern/.test(b0.text) || b0.h < 48) probleme.push("b) Abschnitt/Knopf: " + JSON.stringify(b0));
  if (b1.titel !== "Spielplan der Gastgeber" || !b1.hoch) probleme.push("b) Titel/Hochladen: " + JSON.stringify(b1));
  if (!speicher) probleme.push("b) Datei ging nicht an den Speicher: " + t.gesendet.map(g => g.pfad).join(" "));
  if (!zeile || !zeile.body || zeile.body.termin_id !== 100 || zeile.body.titel !== "Spielplan der Gastgeber" || !/^100\//.test(zeile.body.pfad) || !/^image\//.test(zeile.body.mime)) probleme.push("b) Zeile: " + JSON.stringify(zeile && zeile.body));
  if (c.docx.ok || c.xlsx.ok || c.gross.ok || c.leer.ok || !c.gut.ok || c.gut.mime !== "application/pdf" || c.jpeg.endung !== "jpg") probleme.push("c) Regeln: " + JSON.stringify(c));
  if (c.name !== "Spiel_plan_.png" || c.lang > 120) probleme.push("c) Name: " + JSON.stringify({ n: c.name, l: c.lang }));
  zeilen.push(`Trainer: Knopf ${b0.h} px, Datei → Speicher${speicher ? " ✓" : " ✗"} → Zeile${zeile ? " ✓" : " ✗"} · Word/Excel/zu groß abgelehnt`);

  // d) Tabelle fehlt (Migration nicht eingespielt): 404 → nichts anzeigen
  const s2 = await h.starten({ breite: 390, hoehe: 844, warten: 1500, angemeldet: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, anwesenheit: [], termin_anhang: () => ({ status: 404, body: "{}" }) }) });
  await h.sichtbarMachen(s2.page, "#main-app");
  const d = await s2.page.evaluate(async () => {
    TM_TERMINE = [{ id: 100, typ: "spiel", datum: "2099-01-01", titel: "", gegner: "X", heim: false, uhrzeit: "10:15", trainer_status: {} }]; tmEdit(100); await new Promise(x => setTimeout(x, 1000));
    const slot = (document.getElementById("ta-slot") || {}).textContent || "";
    const eltern = document.createElement("div"); eltern.id = "td-anhang"; document.body.appendChild(eltern);
    await taEltern(100);
    return { slot, eltern: eltern.innerHTML, chip: taChip(555) };
  });
  const fe3 = s2.fehler(); await s2.schliessen();
  if (fe3.length) probleme.push("Konsole (ohne Tabelle): " + fe3.slice(0, 2).join(" | "));
  if (!/noch nicht freigeschaltet/.test(d.slot) || d.eltern !== "" || d.chip !== "") probleme.push("d) ohne Tabelle: " + JSON.stringify(d));
  zeilen.push("Ohne Tabelle: Eltern sehen nichts, Trainer liest „noch nicht freigeschaltet“");
  return h.ergebnis("Termin-Anhänge: Eltern sehen Spielplan, Trainer hängt Bild oder PDF an", !probleme.length, zeilen.concat(probleme));
};
