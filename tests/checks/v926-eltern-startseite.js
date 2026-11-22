/* v926 · Charles 21.11. (Bild der Startseite, zwei Rückmeldungen von Eltern „unübersichtlich – wo finde ich was?“):
   Entwurf freigegeben, Terminkarte „Offenes bleibt groß“.
   a) Kopf: „💬 Chats“ als Wort, mit der Zahl der ungelesenen Rufe.
   b) „📌 Für euch“ sammelt, was zu tun ist – auch „Rückmeldung fehlt“; „Noch offen“ gibt es nicht mehr.
   c) „📅 Nächste Termine“: Karte 1 ist die volle Terminkarte, dahinter weitere Termine zum Wischen – je mit Rückmeldung,
      „Hilfe gesucht“ und „Alles zum Termin“; kein Wochenstreifen mehr auf der Startseite.
   d) Erledigtes wird eine Zeile: Betreuung mit Namen → „✓ Betreuung: …“ (aufklappbar), Offenes bleibt groß.
   e) Erst „Für die Kinder“, dann „Fürs Team“, Kacheln zu zweit; Mannschaftskasse unter „Mehr vom Team“,
      Freigaben & Notfallkarte im Bereich „Regeln & Freigaben“ (auch über den alten Weg „datenschutz“).
   f) Seite kürzer als 2.100 px bei 390 px Breite, kein Querscrollen; vor dem Termin kein Fotoknopf in der Terminkarte. */
"use strict";
module.exports = async function (h) {
  const titel = "v926 Eltern-Startseite: Für euch, Termin-Karussell, Chats oben, Kacheln zu zweit";
  const probleme = [], zeilen = [];
  const T = (id, tp, typ, titel, uhr) => ({ id, datum: h.tagePlus(tp), typ, titel, gegner: titel, uhrzeit: uhr, uhrzeit_ende: null, heim: true, ort: "Thurner Kamp 97, 51069 Köln", trainer_status: {} });
  const termine = [T(1, 2, "training", "Training", "16:45:00"), T(2, 4, "training", "Training", "16:45:00"), T(3, 7, "turnier", "Kinderfestival · Heim", "10:15:00"), T(4, 9, "training", "Training", "16:45:00")];
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => termine,
      rueckmeldungen: [{ termin_id: 1, spieler_id: 1, status: "zugesagt" }],
      rpc: { betreuung_board: [{ name: "Erwachsener B" }], rufe_ungelesen: [{ raum_id: 5, anzahl: 3, an_alle: false }] },
      kind_fanfacts: [{ spieler_id: 1, hobby: "Lego" }], kind_foto: [] }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 50 && !document.getElementById("tk-bahn"); i++) await w(100);
    for (let i = 0; i < 30 && !document.querySelector("#betreuung-card details, #betreuung-card div"); i++) await w(100);
    await w(1200);
    const txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    const out = {};
    const chats = document.getElementById("rufe-kopf");
    out.chats = txt(chats); out.chatsHoch = chats ? Math.round(chats.getBoundingClientRect().height) : 0;
    out.feOffen = !!document.querySelector("#fe-bahn #eltern-offen-slot .el-offen-card, #fe-bahn #eltern-offen-card, #fe-bahn #eltern-offen-slot > *");
    out.nochOffen = [...document.querySelectorAll(".el-zone")].some(z => /Noch offen/.test(z.textContent));
    const karten = [...document.querySelectorAll("#tk-bahn > *")];
    out.tkAnzahl = karten.length; out.tkErste = karten[0] ? karten[0].id : "";
    const zweite = karten[1];
    out.zweite = zweite ? { rsvp: zweite.querySelectorAll("button[aria-pressed]").length, alles: /Alle Details/.test(zweite.textContent), hilfe: /Hilfe gesucht/.test(zweite.textContent) } : null;
    out.tkZahl = txt(document.getElementById("tk-zahl"));
    out.woche = !!document.getElementById("eltern-termine");
    const betr = document.querySelector("#betreuung-card details.tk-erledigt summary");
    out.betreuung = txt(betr); out.betrHoch = betr ? Math.round(betr.getBoundingClientRect().height) : 0;
    const helfer = document.querySelector("#helfer-card");
    out.helferOffen = helfer ? /Wer hilft mit\?/.test(helfer.textContent) && !helfer.querySelector("details") : null;
    const sek = [...document.querySelectorAll("#ep-dash-body div")].filter(d => /^(🎮 Für die Kinder|👥 Fürs Team)$/.test(d.textContent.trim()) && d.children.length === 0).map(d => d.textContent.trim());
    out.reihenfolge = sek.join(" → ");
    const gitter = document.querySelector(".el-gitter"), g2 = gitter && [...gitter.children].filter(x => !x.classList.contains("el-breit"));
    out.spalten = g2 && g2.length >= 2 ? Math.abs(g2[0].getBoundingClientRect().top - g2[1].getBoundingClientRect().top) < 2 : false;
    out.kasseStart = !!document.querySelector("#ep-dash-body > #mannschaftskasse-kachel, .el-gitter #mannschaftskasse-kachel");
    out.kasseMehr = !!document.querySelector("#cat-mehr #mannschaftskasse-kachel");
    elternCatOpen("datenschutz"); await w(200);
    out.regeln = { titel: txt(document.getElementById("el-cat-title")), notfall: /Notfallkarte/.test(txt(document.getElementById("cat-regeln"))) && getComputedStyle(document.getElementById("cat-regeln")).display !== "none" };
    elternCatClose(); await w(200);
    out.foto = /Fotos der letzten Spieltage/.test(txt(document.getElementById("termin-card")));
    out.hoehe = document.documentElement.scrollHeight; out.quer = document.documentElement.scrollWidth > window.innerWidth + 1;
    const b = document.getElementById("tk-bahn"); b.scrollLeft = b.children[1].offsetLeft - b.children[0].offsetLeft; await w(400);
    out.nachWischen = txt(document.getElementById("tk-zahl"));
    return out;
  });
  const fe = e.fehler().filter(f => !/Failed to load resource|net::ERR/.test(f));
  await e.schliessen();
  if (!/Chats/.test(r.chats) || !/3/.test(r.chats) || r.chatsHoch < 44) probleme.push(`a) Kopf „${r.chats}“ (${r.chatsHoch} px)`);
  if (!r.feOffen || r.nochOffen) probleme.push(`b) Rückmeldung fehlt in „Für euch“: ${r.feOffen}, Zone „Noch offen“: ${r.nochOffen}`);
  if (r.tkAnzahl !== 4 || r.tkErste !== "termin-card" || !r.zweite || r.zweite.rsvp < 4 || !r.zweite.alles || !r.zweite.hilfe || r.tkZahl !== "1 von 4" || r.nachWischen !== "2 von 4") probleme.push(`c) Karussell: ${JSON.stringify({ n: r.tkAnzahl, erste: r.tkErste, zweite: r.zweite, zahl: r.tkZahl, wisch: r.nachWischen })}`);
  if (r.woche) probleme.push("c) Wochenstreifen steht noch auf der Startseite");
  if (!/✓ Betreuung: Erwachsener B/.test(r.betreuung) || r.betrHoch < 44) probleme.push(`d) Betreuung „${r.betreuung}“ (${r.betrHoch} px)`);
  if (r.helferOffen === false) probleme.push("d) offene Helferaufgabe ist zugeklappt");
  if (r.reihenfolge !== "🎮 Für die Kinder → 👥 Fürs Team" || !r.spalten) probleme.push(`e) Reihenfolge „${r.reihenfolge}“, zwei Spalten ${r.spalten}`);
  if (r.kasseStart || !r.kasseMehr) probleme.push(`e) Mannschaftskasse Startseite ${r.kasseStart}, in Mehr vom Team ${r.kasseMehr}`);
  if (!/Regeln & Freigaben/.test(r.regeln.titel) || !r.regeln.notfall) probleme.push(`e) „datenschutz“ öffnet „${r.regeln.titel}“, Notfallkarte ${r.regeln.notfall}`);
  if (r.hoehe > 2100 || r.quer || r.foto) probleme.push(`f) Höhe ${r.hoehe} px, quer ${r.quer}, Fotoknopf vor dem Termin ${r.foto}`);
  zeilen.push(`a) „${r.chats}“ · b) Rückmeldung fehlt in „Für euch“ · c) ${r.tkAnzahl} Termine, „${r.tkZahl}“ → „${r.nachWischen}“ · d) „${r.betreuung}“ · e) ${r.reihenfolge}, zu zweit · f) ${r.hoehe} px`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
