/* v731 · Fotos bleiben in der App: kein Speichern in der Galerie.
   PO 03.10. (zur Adlerschmiede-Meldung von v730): „Der Download sollte erstmal nicht möglich sein. Wir wollen
   nicht, dass Bilder aus der App rausgehen.“
   a) Großansicht ohne Speichern-/Download-Knopf, kein Teilen
   b) Langes Drücken/Rechtsklick (contextmenu) und Ziehen (dragstart) werden in der Großansicht abgefangen
   c) Vorschau- und Titelbilder: draggable=false, kein Kontextmenü, -webkit-touch-callout:none
   d) Die Texte in der Eltern-App versprechen kein Speichern mehr
   e) PO 03.10.: „Und die alten Termine raus. Wir starten mit dem Festival heute.“ – die Galerie fragt
      Spieltage erst ab dem 03.10.2026 ab (datum=gte.2026-10-03) */
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
  const galUrls = [];
  const fotos = [1, 2, 3].map(i => ({ id: 900 + i, foto_path: `81/foto-${i}.jpg`, created_at: new Date().toISOString() }));
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: u => { if (/typ=in\.\(spiel,turnier\)&datum=gte/.test(String(u))) galUrls.push(String(u)); return termine; }, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
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
    const lb = document.getElementById("gal-gross"), gi = document.getElementById("gal-gross-img");
    out.knoepfe = lb ? [...lb.querySelectorAll("button")].map(b => b.textContent.trim()) : null;
    const cm = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); gi && gi.dispatchEvent(cm); out.cmAbgefangen = cm.defaultPrevented;
    const dr = new Event("dragstart", { bubbles: true, cancelable: true }); gi && gi.dispatchEvent(dr); out.dragAbgefangen = dr.defaultPrevented;
    const v = document.getElementById("gal-img-901"), c = document.getElementById("stg-cover-81");
    out.vorschau = v ? { drag: v.getAttribute("draggable"), cm: !!v.getAttribute("oncontextmenu"), callout: /touch-callout:\s*none/.test(v.getAttribute("style") || "") } : null;
    out.cover = c ? { drag: c.getAttribute("draggable"), cm: !!c.getAttribute("oncontextmenu"), callout: /touch-callout:\s*none/.test(c.getAttribute("style") || "") } : null;
    out.texte = [...document.querySelectorAll("#cat-mehr, #stg-modal")].map(x => x.textContent).join(" ");
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const f = s.fehler(); await s.schliessen();
  const titel = "v731 Fotos bleiben in der App: kein Speichern in der Galerie";
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.fehler) { probleme.push(r.fehler); return h.ergebnis(titel, false, probleme); }
  if (!r.knoepfe || r.knoepfe.some(x => /speicher|download|teilen|⬇/i.test(x))) probleme.push("a) Knöpfe: " + JSON.stringify(r.knoepfe));
  else zeilen.push("a) Großansicht nur mit ‹ › ✕ – kein Speichern");
  if (!r.cmAbgefangen || !r.dragAbgefangen) probleme.push("b) " + JSON.stringify({ contextmenu: r.cmAbgefangen, dragstart: r.dragAbgefangen }));
  else zeilen.push("b) langes Drücken/Rechtsklick und Ziehen abgefangen");
  const ok = x => x && x.drag === "false" && x.cm && x.callout;
  if (!ok(r.vorschau) || !ok(r.cover)) probleme.push("c) " + JSON.stringify({ vorschau: r.vorschau, cover: r.cover }));
  else zeilen.push("c) Vorschau- und Titelbilder ohne Ziehen und Kontextmenü");
  if (/speicher/i.test(r.texte || "")) probleme.push("d) Text verspricht Speichern");
  else zeilen.push("d) kein „speichern“ in Galerie-Texten");
  if (!galUrls.length || !galUrls.every(u => /datum=gte\.2026-10-03/.test(u))) probleme.push("e) Abfrage: " + JSON.stringify(galUrls));
  else zeilen.push("e) Galerie fragt Spieltage ab 03.10.2026 ab");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
