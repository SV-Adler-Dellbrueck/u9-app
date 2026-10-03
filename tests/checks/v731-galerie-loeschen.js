/* v731 · Trainer löschen Fotos auch aus der Großansicht – egal, wer sie hochgeladen hat.
   PO 03.10.: „Ich sollte auch die Möglichkeit haben, hochgeladene Bilder egal von wem aus der Galerie zu löschen.“
   a) Trainerkonto: Großansicht zeigt „🗑️ Löschen“; nach Rückfrage geht DELETE termin_media?id=eq.<id> raus,
      die Ansicht springt auf das nächste Foto („Foto 1 von 2“)
   b) Elternkonto: kein Löschknopf in der Großansicht */
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
  const geloescht = [];
  const fotos = [1, 2, 3].map(i => ({ id: 900 + i, foto_path: `81/foto-${i}.jpg`, created_at: new Date().toISOString() }));
  const lauf = async (rolle) => {
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: rolle }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine, rueckmeldungen: [],
      termin_media: (u, req) => { const m = String(u).match(/id=eq\.(\d+)/); if (req.method() === "DELETE" && m) geloescht.push(Number(m[1])); return []; }, team_config: [{ spenden_link: "" }],
      rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false,
        termin_gallery: (u, req) => { let p = {}; try { p = JSON.parse(req.postData() || "{}"); } catch (e) {} return Number(p.p_termin) === 81 ? fotos.filter(f => !geloescht.includes(f.id)) : []; } } });
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
      const gi = document.getElementById("gal-gross-img");
      out.loeschKnopf = (() => { const b = document.getElementById("gal-gross-loeschen"); return !!(b && b.style.display !== "none"); })();
      if (out.loeschKnopf) {
        document.getElementById("gal-gross-loeschen").click(); await w(300);
        const ja = [...document.querySelectorAll("#frage-modal button")].find(b => /Löschen/.test(b.textContent)); if (ja) ja.click();
        await w(1500); out.nachLoeschen = (document.getElementById("gal-gross-zahl") || {}).textContent || "";
      }
      out.gross = { zahl: zahl(), bild: !!(gi && /^blob:/.test(gi.src)), dialog: (document.getElementById("gal-gross") || {}).getAttribute?.("role") };
      return out;
    }).catch(e => ({ fehler: String(e) }));
    const f = s.fehler(); await s.schliessen();
    return { r, f };
  };
  const t = await lauf("trainer"), e = await lauf("parent");
  const titel = "v731 Fotos löschen in der Großansicht (Trainer)";
  [...t.f, ...e.f].slice(0, 2).forEach(x => probleme.push("Konsole: " + x));
  if (t.r.fehler || !t.r.loeschKnopf || !geloescht.includes(901) || t.r.nachLoeschen !== "Foto 1 von 2") probleme.push("a) " + JSON.stringify({ r: t.r, geloescht }));
  else zeilen.push("a) Trainer: „🗑️ Löschen“ → Rückfrage → DELETE id 901 → „Foto 1 von 2“");
  if (e.r.fehler || e.r.loeschKnopf) probleme.push("b) Eltern sehen Löschknopf: " + JSON.stringify(e.r));
  else zeilen.push("b) Eltern: kein Löschknopf");
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
