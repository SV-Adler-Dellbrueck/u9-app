/* v730 · Spieltagsgalerie für Eltern: alle Spieltage der Saison mit ihren Fotos, Großansicht, Speichern.
   PO 03.10.: „Dann brauchen wir eine Spieltagsgalerie. Wenn Eltern Bilder in der App hochladen. Darauf
   sollen die Eltern dann auch Zugriff haben.“ Kachel: Galerie jetzt, Adler Nest entsteht separat.
   a) „Mehr vom Team“ führt die Zeile „Spieltagsgalerie“
   b) Die Galerie zeigt je vergangenem Spieltag ein Album mit Zahl („3 Fotos“ / „Noch keine Fotos“) und Titelbild
   c) Album öffnen → Vorschaubild antippen → Großansicht „Foto 1 von 3“ mit Bild und „Speichern“
   d) Weiter und Pfeiltasten blättern ringsum („2 von 3“, dann zurück über 1 auf „3 von 3“) */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
// 1×1-Pixel-JPEG
const JPG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [
    { id: 81, datum: h.tagePlus(-1), typ: "turnier", titel: "Testfestival", uhrzeit: "10:00:00", heim: false },
    { id: 82, datum: h.tagePlus(-8), typ: "spiel", gegner: "Testgegner", uhrzeit: "10:00:00", heim: true }
  ];
  const fotos = [1, 2, 3].map(i => ({ id: 900 + i, foto_path: `81/foto-${i}.jpg`, created_at: new Date().toISOString() }));
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false,
      termin_gallery: (u, req) => { let p = {}; try { p = JSON.parse(req.postData() || "{}"); } catch (e) {} return Number(p.p_termin) === 81 ? fotos : []; } } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
  await s.page.route(/\/storage\/v1\/object\/authenticated\/termin_media\//, r => r.fulfill({ status: 200, contentType: "image/jpeg", body: JPG }));
  await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = { zeile: /Spieltagsgalerie/.test((document.getElementById("cat-mehr") || {}).textContent || "") };
    for (let i = 0; i < 40 && typeof spieltagGalerieOpen !== "function"; i++) await w(100);
    await spieltagGalerieOpen(); await w(800);
    const alben = [...document.querySelectorAll("#stg-modal .stg-album")];
    out.alben = alben.map(a => a.textContent.replace(/\s+/g, " ").trim());
    const cover = document.getElementById("stg-cover-81"); out.cover = !!(cover && /^blob:/.test(cover.src));
    if (alben[0]) alben[0].click(); await w(800);
    const vorschau = document.querySelector("#gal-modal #gal-img-901"); out.vorschau = !!vorschau;
    if (vorschau) vorschau.click(); await w(500);
    const zahl = () => (document.getElementById("gal-gross-zahl") || {}).textContent || "";
    const gi = document.getElementById("gal-gross-img"), sp = document.getElementById("gal-gross-speichern");
    out.gross = { zahl: zahl(), bild: !!(gi && /^blob:/.test(gi.src)), speichern: !!(sp && !sp.disabled), dialog: (document.getElementById("gal-gross") || {}).getAttribute?.("role") };
    document.getElementById("gal-gross-weiter")?.click(); await w(300); out.weiter = zahl();
    const lb = document.getElementById("gal-gross");
    lb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); await w(300);
    lb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); await w(300); out.rund = zahl();
    lb.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await w(200); out.zu = !document.getElementById("gal-gross");
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  const titel = "v730 Spieltagsgalerie: Alben je Spieltag, Großansicht, Speichern";
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.fehler) { probleme.push(r.fehler); return h.ergebnis(titel, false, probleme); }
  if (!r.zeile) probleme.push("a) keine Zeile „Spieltagsgalerie“ unter „Mehr vom Team“"); else zeilen.push("a) Zeile unter „Mehr vom Team“");
  const [a1, a2] = r.alben || [];
  if ((r.alben || []).length !== 2 || !/Testfestival/.test(a1) || !/3 Fotos/.test(a1) || !/Testgegner/.test(a2) || !/Noch keine Fotos/.test(a2) || !r.cover) probleme.push("b) " + JSON.stringify({ alben: r.alben, cover: r.cover }));
  else zeilen.push("b) zwei Alben, neuestes zuerst: „3 Fotos“ mit Titelbild, „Noch keine Fotos“");
  if (!r.vorschau || r.gross.zahl !== "Foto 1 von 3" || !r.gross.bild || !r.gross.speichern || r.gross.dialog !== "dialog") probleme.push("c) " + JSON.stringify({ vorschau: r.vorschau, gross: r.gross }));
  else zeilen.push("c) Großansicht „Foto 1 von 3“ mit Bild und „Speichern“");
  if (r.weiter !== "Foto 2 von 3" || r.rund !== "Foto 3 von 3" || !r.zu) probleme.push("d) " + JSON.stringify({ weiter: r.weiter, rund: r.rund, zu: r.zu }));
  else zeilen.push("d) blättern ringsum, Escape schließt");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
