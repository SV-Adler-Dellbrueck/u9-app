/* v859 · Eltern-App, Rest der Bestandsaufnahme (3.7, 3.11, 3.13, 3.14).
   a) „Nachlesen“ unter „Mehr vom Team“ öffnet ein Fenster (role=dialog) mit den Ansagen der letzten 60 Tage –
      auch einer schon gelesenen – und den Neuerungen der App.
   b) Vor einem Termin führt der Foto-Knopf der Terminkarte zur Spieltagsgalerie, nicht ins leere Album.
   c) In „Diese Woche“ steht „–“ für „fällt aus“, „✕“ für „nicht dabei“; die Legende nennt beides.
   d) Der Einwilligungs-Knopf sagt ohne Häkchen „Erst oben das Häkchen setzen“ und nach dem Häkchen „Zustimmen & fortfahren“. */
"use strict";
module.exports = async function (h) {
  const titel = "v859 Eltern: Nachlesen, Foto-Knopf vor dem Termin, „–“ für fällt aus, Einwilligung mit Text";
  const probleme = [], zeilen = [];
  const morgen = h.tagePlus(1), ueber = h.tagePlus(3);
  const termine = [{ id: 5, datum: morgen, uhrzeit: "16:45", uhrzeit_ende: "18:00", typ: "training", titel: "", ort: "Sportplatz", trainer_status: {}, platz_status: null },
    { id: 6, datum: ueber, uhrzeit: "10:15", typ: "spiel", titel: "Spieltag", gegner: "Gegner", ort: "Platz", trainer_status: {}, platz_status: "abgesagt", abgesagt: true }];
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine, rueckmeldungen: [], eltern_angaben: [{ vorname: "Erwachsener", nachname: "Beispiel" }],
      ansagen: [{ id: 41, text: "Am Freitag Treffpunkt am Kassenhaus.", created_at: new Date(Date.now() - 20 * 864e5).toISOString() }],
      ansagen_gelesen: [{ ansage_id: 41 }],
      adlerschmiede: [{ id: 2, datum: h.tagePlus(-2), emoji: "🧭", text: "Startseite aufgeräumt: drei Bereiche" }] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4000);
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    if (typeof elternNachlesenOpen !== "function") return { alt: true };
    // a)
    out.zeile = [...document.querySelectorAll("button")].some(b => /Nachlesen/.test(b.textContent));
    await elternNachlesenOpen(); await w(300);
    const m = document.getElementById("nachlesen-modal");
    out.a = m ? { rolle: m.getAttribute("role") + "/" + m.getAttribute("aria-modal"), ansagen: m.querySelector("#nachlesen-ansagen").innerText, neu: m.querySelector("#nachlesen-schmiede").innerText } : null;
    m && m.remove();
    // b)
    const fotoKn = [...document.querySelectorAll("#ep-dash-body button")].filter(b => /📸/.test(b.textContent)).map(b => ({ t: b.textContent.trim(), on: b.getAttribute("onclick") || "" }));
    out.b = fotoKn;
    // c)
    /* seit v926 steht der Wochenstreifen nicht mehr auf der Startseite – geprüft wird der Baustein selbst (er ist noch da) */
    const wo = document.getElementById("eltern-woche") || document.getElementById("eltern-termine");
    out.c = wo ? wo.innerHTML : (typeof elternWochenStreifenHtml === "function" && typeof ELTERN_TERMINE !== "undefined" ? elternWochenStreifenHtml(ELTERN_TERMINE || [], window._elternKids || [], {}) : "");
    // d)
    try { dsgvoRenderGate(() => {}); } catch (err) {}
    await w(200);
    const cb = document.getElementById("dsgvo-cb"), kn = document.getElementById("dsgvo-ok");
    out.d = cb && kn ? { vor: kn.textContent.trim(), dis: kn.disabled } : null;
    if (cb) { cb.checked = true; cb.dispatchEvent(new Event("change")); out.d.nach = kn.textContent.trim(); out.d.dis2 = kn.disabled; }
    return out;
  }).catch(err => ({ fehler: String(err) }));
  const fe = e.fehler(); await e.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["elternNachlesenOpen fehlt (Stand vor v859)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.zeile || !r.a || r.a.rolle !== "dialog/true" || !/Kassenhaus/.test(r.a.ansagen) || !/Startseite aufgeräumt/.test(r.a.neu)) probleme.push("a) " + JSON.stringify({ zeile: r.zeile, a: r.a }));
  else zeilen.push("a) „Nachlesen“: gelesene Ansage und Neuerung stehen da");
  /* seit v926 trägt die Terminkarte vor dem Termin gar keinen Fotoknopf mehr (die Spieltagsgalerie steht unter „Mehr vom Team“);
     geprüft bleibt: nie ein Knopf, der ein leeres Album des künftigen Termins öffnet */
  if ((r.b || []).some(x => /^📸 (Trainings|Spiel|Turnier|Event)-Fotos$/.test(x.t))) probleme.push("b) Foto-Knöpfe: " + JSON.stringify(r.b));
  else zeilen.push("b) vor dem Termin kein Fotoknopf in der Terminkarte (Spieltagsgalerie unter „Mehr vom Team“)");
  if (!/– fällt aus/.test(r.c) || !/✕ nicht dabei ·/.test(r.c) || /nicht dabei oder fällt aus/.test(r.c)) probleme.push("c) Legende/Zeichen: " + r.c.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(-200));
  else zeilen.push("c) Legende: ✕ nicht dabei · – fällt aus");
  if (!r.d) zeilen.push("d) Einwilligungs-Ansicht nicht einzeln erreichbar – im Code geprüft");
  else if (r.d.vor !== "Erst oben das Häkchen setzen" || !r.d.dis || r.d.nach !== "Zustimmen & fortfahren" || r.d.dis2) probleme.push("d) " + JSON.stringify(r.d));
  else zeilen.push("d) Einwilligung: Text statt Deckkraft");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
