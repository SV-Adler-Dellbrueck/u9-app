/* v780 · Design-Durchsicht der Eltern-App (PO 04.11.: „Wirklich optische Unterschiede sehe ich nicht“). Paket „Ruhe im Dashboard“:
   a) Hinweiskarten oben flach: ohne Farbstreifen, der Termin beginnt etwas höher (Oberkante der Terminkarte höchstens 352 px, vorher 356, bei 390 × 844; die Karte „Keine Nachricht verpassen“ bleibt nach v698 ganz oben)
   b) Terminkarte: 1 px Rand und ein 4-px-Streifen für den Status statt 2 px Farbrand; Titel größer als Kindname
   c) Antwortknöpfe einzeilig (≤ 48 px hoch), „Unsicher“ bricht nicht um; beim Antippen der gewählten Antwort bleibt der Text
   d) Untere Kacheln: kein Farbverlauf, helle Karte mit dunkler Schrift, Symbol in runder Scheibe, ≥ 44 px
   (Kontrast hell und dunkel prüft v614.) */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [1, 3, 5, 8].map((tage, i) => ({ id: 100 + i, datum: h.tagePlus(tage), typ: i === 2 ? "spiel" : "training", titel: "", gegner: i === 2 ? "SV Beispiel" : "", heim: true, uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }));
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 3500, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } }) });
  await s.page.waitForLoadState("networkidle"); await s.page.waitForTimeout(1500);
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(3500);
  const r = await s.page.evaluate(() => {
    const out = {}, px = v => parseFloat(v) || 0;
    const sh = document.querySelector(".schrift-hinweis"), pk = document.getElementById("push-hinweis"), tk = document.getElementById("termin-card");
    out.hinweise = { schrift: sh ? getComputedStyle(sh).borderLeftWidth : null, push: pk ? getComputedStyle(pk).borderLeftWidth : null };
    out.tkTop = tk ? Math.round(tk.getBoundingClientRect().top + window.scrollY) : null;
    if (tk) { const cs = getComputedStyle(tk); out.rand = { oben: cs.borderTopWidth, links: cs.borderLeftWidth }; }
    const titel = tk && [...tk.querySelectorAll("div")].find(d => /Training/.test(d.textContent) && d.children.length === 0 || /^\s*🏃/.test(d.textContent));
    const kind = tk && [...tk.querySelectorAll("span")].find(x => /^Kind C$/.test(x.textContent.trim()));
    out.schrift = { titel: titel ? px(getComputedStyle(titel).fontSize) : 0, kind: kind ? px(getComputedStyle(kind).fontSize) : 0 };
    const bt = tk ? [...tk.querySelectorAll("button")].filter(b => /^(Zusage|Unsicher|Absage|Krank)$/.test(b.textContent.trim())) : [];
    out.knoepfe = bt.map(b => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) }));
    const k = document.getElementById("alle-termine-kachel");
    if (k) { const cs = getComputedStyle(k); out.kachel = { bild: cs.backgroundImage, farbe: cs.color, hoehe: Math.round(k.getBoundingClientRect().height), scheibe: !![...k.querySelectorAll("span")].find(x => getComputedStyle(x).borderRadius === "50%" || px(getComputedStyle(x).borderTopLeftRadius) >= 20) }; }
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.hinweise.schrift && r.hinweise.schrift !== "1px") probleme.push("a) Schrift-Hinweis hat noch einen Farbstreifen: " + r.hinweise.schrift);
  if (r.hinweise.push && r.hinweise.push !== "1px") probleme.push("a) Push-Hinweis hat noch einen Farbstreifen: " + r.hinweise.push);
  if (r.tkTop == null || r.tkTop > 352) probleme.push("a) Terminkarte beginnt bei " + r.tkTop + " px (vorher 356, erwartet höchstens 352)");
  zeilen.push(`a) Hinweise ohne Streifen (${r.hinweise.schrift}/${r.hinweise.push}) · Terminkarte beginnt bei ${r.tkTop} px`);
  if (!r.rand || r.rand.oben !== "1px" || r.rand.links !== "4px") probleme.push("b) Rand: " + JSON.stringify(r.rand));
  if (!(r.schrift.titel > r.schrift.kind)) probleme.push("b) Titel nicht größer als Kindname: " + JSON.stringify(r.schrift));
  zeilen.push(`b) Rand ${r.rand && r.rand.oben} + Streifen ${r.rand && r.rand.links} · Titel ${r.schrift.titel} px, Kind ${r.schrift.kind} px`);
  if (r.knoepfe.length !== 4 || r.knoepfe.some(b => b.h > 48 || b.h < 44)) probleme.push("c) Antwortknöpfe: " + JSON.stringify(r.knoepfe));
  zeilen.push("c) Antwortknöpfe " + r.knoepfe.map(b => b.t + " " + b.h).join(" · "));
  if (!r.kachel || r.kachel.bild !== "none" || /rgb\(255, 255, 255\)/.test(r.kachel.farbe) || r.kachel.hoehe < 44 || !r.kachel.scheibe) probleme.push("d) Kachel: " + JSON.stringify(r.kachel));
  zeilen.push(`d) Kachel: kein Verlauf, Schrift ${r.kachel && r.kachel.farbe}, ${r.kachel && r.kachel.hoehe} px, Symbol in Scheibe`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v780 Eltern-Dashboard: ruhigere Karten, einzeilige Antwortknöpfe, helle Kacheln", !probleme.length, probleme.length ? probleme : zeilen);
};
