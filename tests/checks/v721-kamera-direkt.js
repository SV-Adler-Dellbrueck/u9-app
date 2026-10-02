/* v721 · Trainings-Fotos: „📷 Foto aufnehmen“ öffnet direkt die Kamera.
   PO 02.10.: „… dass die App Zugriff bekommt, direkt die Kamera anzusteuern, also direkt Fotos
   aufnehmen klicken können, um dann das Foto zu machen, und es landet direkt in der Datenbank der
   App ohne Umweg des Handys.“ Kachel: „Zwei Knöpfe“.
   a) Galerie zum Termin hat zwei Knöpfe ≥ 44 px: „📷 Foto aufnehmen“ (capture=environment, ein Bild)
      und „🖼️ Aus Galerie“ (mehrere, ohne capture)
   b) Ein Foto aus der Kamera geht ohne weiteren Tipp hoch: Datei im Speicher termin_media, Zeile
      termin_media mit dem Termin, der Knopf steht danach wieder bereit
   c) Aus der Galerie ebenso, mehrere auf einmal */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
// 2×2-PNG, damit fotoCompress ein echtes Bild bekommt
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwHwyBNAMAOdgH+bvhG5EAAAAASUVORK5CYII=", "base64");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const zeilenNeu = [];
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    termin_media: (u, req) => { if (req.method() === "POST") { try { zeilenNeu.push(JSON.parse(req.postData())); } catch (e) {} return { status: 201, body: "" }; } return []; },
    rpc: { eltern_news: {}, training_rueckblick: [], termin_gallery: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
  const speicher = [];
  await s.page.route("**/storage/v1/object/termin_media/**", r => { if (r.request().method() === "POST") speicher.push(r.request().url()); return r.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3000);
  const a = await s.page.evaluate(async () => {
    if (typeof galerieOpen !== "function") return { fehlt: true };
    await galerieOpen(91, "Training"); await new Promise(r => setTimeout(r, 300));
    const k = document.getElementById("gal-kamera"), g = document.getElementById("gal-foto");
    const kk = document.getElementById("gal-kamera-knopf"), gk = document.getElementById("gal-foto-knopf");
    return { k: k && { capture: k.getAttribute("capture"), accept: k.accept, multiple: k.multiple }, g: g && { capture: g.getAttribute("capture"), multiple: g.multiple },
      texte: [kk && kk.textContent.trim(), gk && gk.textContent.trim()], hoehen: [kk, gk].map(e => e ? Math.round(e.getBoundingClientRect().height) : 0) };
  });
  if (a.fehlt) { await s.schliessen(); return h.ergebnis("v721 Foto direkt aus der Kamera", false, ["galerieOpen fehlt"]); }
  // b) Kamera
  await s.page.setInputFiles("#gal-kamera", { name: "kamera.png", mimeType: "image/png", buffer: PNG });
  await s.page.waitForTimeout(1500);
  const b = { speicher: speicher.length, zeilen: zeilenNeu.slice(), knopf: await s.page.evaluate(() => { const e = document.getElementById("gal-kamera-knopf"); return e ? e.textContent.trim() + "|" + e.style.pointerEvents : null; }) };
  // c) Galerie, zwei Bilder
  await s.page.setInputFiles("#gal-foto", [{ name: "a.png", mimeType: "image/png", buffer: PNG }, { name: "b.png", mimeType: "image/png", buffer: PNG }]);
  await s.page.waitForTimeout(2000);
  const c = { speicher: speicher.length, zeilen: zeilenNeu.length };
  const fehler = s.fehler();
  await s.schliessen();
  const titel = "v721 Foto direkt aus der Kamera: zwei Knöpfe, sofortiger Upload";
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));

  if (!a.k || a.k.capture !== "environment" || a.k.multiple || !/image/.test(a.k.accept)) probleme.push("a) Kamera-Feld: " + JSON.stringify(a.k));
  else if (!a.g || a.g.capture || !a.g.multiple) probleme.push("a) Galerie-Feld: " + JSON.stringify(a.g));
  else if (!/Foto aufnehmen/.test(a.texte[0]) || !/Aus Galerie/.test(a.texte[1])) probleme.push("a) Knöpfe: " + JSON.stringify(a.texte));
  else if (a.hoehen.some(x => x < 44)) probleme.push("a) Knopfhöhen " + a.hoehen.join("/"));
  else zeilen.push(`a) „📷 Foto aufnehmen“ (Kamera) und „🖼️ Aus Galerie“ (mehrere), ${a.hoehen.join("/")} px`);

  if (b.speicher !== 1 || b.zeilen.length !== 1 || b.zeilen[0].termin_id !== 91 || !/\.jpg$/.test(b.zeilen[0].foto_path || "")) probleme.push("b) Kamera-Upload: " + JSON.stringify(b));
  else if (!/Foto aufnehmen/.test(b.knopf) || /none/.test(b.knopf)) probleme.push("b) Knopf danach: " + b.knopf);
  else zeilen.push("b) Foto aus der Kamera ohne weiteren Tipp hochgeladen (Speicher + termin_media, Termin 91), Knopf wieder bereit");

  if (c.speicher !== 3 || c.zeilen !== 3) probleme.push(`c) Galerie: ${c.speicher - 1} Dateien, ${c.zeilen - 1} Zeilen statt 2`);
  else zeilen.push("c) zwei Bilder aus der Galerie auf einmal hochgeladen");

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
