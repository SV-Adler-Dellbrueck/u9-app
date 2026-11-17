/* v838 · Eltern-Dashboard in drei Zonen, Trainings ohne Mahnung (Charles 17.11.2026, Bestandsaufnahme 3.4 und 3.5).
   a) Reihenfolge: Ansage des Trainerteams ÜBER der Terminkarte; darunter „Noch offen“ (fehlende Antworten, Benachrichtigungen),
      dann „Neu“ (Adler-Rufe). Überschriften mit mindestens 4,5:1 Kontrast.
   b) Nächster Termin ist ein Training ohne Antwort: ruhiger Hinweis „Gilt als zugesagt“, kein „überfällig“, kein Mahnstreifen,
      Antwortknöpfe weiter da (≥ 44 px). Trainings stehen nicht unter „Rückmeldung fehlt“, Spiel und Event schon.
   c) Nächster Termin ist ein Spiel ohne Antwort: weiter „Rückmeldung fehlt“ und der Farbstreifen links (4 px).
   d) Eine Zone ohne Inhalt zeigt keine Überschrift (geprüft an „Neu“ ohne Rufe und News). */
"use strict";
module.exports = async function (h) {
  const titel = "v838 Eltern: drei Zonen (Jetzt, Noch offen, Neu), Trainings ohne Mahnung, Spiele weiter mit";
  const probleme = [], zeilen = [];
  const T = (id, tage, typ, titelT) => ({ id, datum: h.tagePlus(tage), uhrzeit: "16:45", uhrzeit_ende: "18:00", typ, titel: titelT || "", ort: "Sportplatz", trainer_status: {}, platz_status: null });
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const fall = async (termine, mitNeuem) => {
    const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844,
      supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine, profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
        eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
        rueckmeldungen: [], feier_eintraege: [], eltern_angaben: [{ vorname: "Erwachsener", nachname: "Beispiel" }],
        ansagen: mitNeuem ? [{ id: 9, text: "Bitte 20 Minuten früher da sein.", created_at: new Date().toISOString(), autor: "Trainerteam" }] : [], ansagen_gelesen: [],
        rpc: { rufe_ungelesen: mitNeuem ? [{ raum_id: 7, anzahl: 2, an_alle: false }] : [] }, rufe_nachricht: mitNeuem ? [{ autor_name: "Trainerteam", text: "Trikots mitbringen", autor: "andere" }] : [] }) });
    await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
    await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4500);
    const r = await e.page.evaluate(() => {
      if (typeof elternZonenPruefen !== "function") return { alt: true };
      const body = document.getElementById("ep-dash-body");
      const sicht = [...body.children].filter(c => c.offsetHeight > 0);
      const pos = f => sicht.findIndex(f);
      const tk = document.getElementById("termin-card"), cs = tk ? getComputedStyle(tk) : null;
      const zonen = [...body.querySelectorAll(".el-zone")].map(z => ({ id: z.dataset.zone, sichtbar: z.offsetHeight > 0, text: z.textContent.trim(), farbe: getComputedStyle(z).color }));
      const offenKarte = document.getElementById("eltern-offen-card");
      return { ansage: pos(c => c.id === "ansage-slot"), termin: pos(c => c.id === "termin-card" || c.contains(tk)), offenZone: pos(c => c.classList.contains("el-zone") && c.dataset.zone === "offen"),
        offenKarte: pos(c => c === offenKarte || c.contains(offenKarte)), neuZone: pos(c => c.classList.contains("el-zone") && c.dataset.zone === "neu"), rufe: pos(c => c.id === "rufe-hinweis"), termineListe: pos(c => c.id === "eltern-termine"),
        zonen, tkText: tk ? tk.innerText.replace(/\s+/g, " ") : "", streifen: cs ? cs.borderLeftWidth : "", knoepfe: tk ? [...tk.querySelectorAll('button[onclick^="elternRsvp("]')].map(b => Math.round(b.getBoundingClientRect().height)) : [],
        offenText: offenKarte ? offenKarte.innerText.replace(/\s+/g, " ") : "" };
    }).catch(x => ({ fehler: String(x) }));
    const fe = e.fehler(); await e.schliessen();
    return { r, fe };
  };
  const A = await fall([T(1, 1, "training"), T(2, 4, "spiel", "Spielfest"), T(4, 6, "training"), T(3, 9, "event", "Elternabend")], true);
  if (A.r.alt) return h.ergebnis(titel, false, ["elternZonenPruefen fehlt (Stand vor v838)"]);
  const C = await fall([T(2, 1, "spiel", "Spielfest"), T(1, 3, "training")], false);
  for (const x of [A, C]) { if (x.r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + x.r.fehler]); if (x.fe.length) probleme.push("Konsole: " + x.fe.slice(0, 2).join(" | ")); }
  const a = A.r, c = C.r;
  const lum = f => { const m = f.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
  // a)
  const folge = [a.ansage, a.termin, a.offenZone, a.offenKarte, a.neuZone, a.rufe, a.termineListe];
  if (folge.some(x => x < 0) || folge.some((x, i) => i && x <= folge[i - 1])) probleme.push("a) Reihenfolge Ansage › Termin › „Noch offen“ › offene Antworten › „Neu“ › Rufe › Termine: " + JSON.stringify(folge));
  else zeilen.push("a) Reihenfolge: Ansage › nächster Termin › „Noch offen“ › „Neu“ › Termine");
  a.zonen.forEach(z => { const k = (1.05) / (lum(z.farbe) + .05); if (z.sichtbar && k < 4.5) probleme.push(`a) Überschrift „${z.text}“ nur ${k.toFixed(1)}:1 auf Weiß`); });
  // b)
  if (!/Gilt als zugesagt/.test(a.tkText) || /überfällig|Rückmeldung fehlt/.test(a.tkText)) probleme.push("b) Training ohne Antwort: " + a.tkText.slice(0, 160));
  else if (a.streifen !== "1px") probleme.push("b) Training trägt einen Mahnstreifen: " + a.streifen);
  else if (a.knoepfe.length < 4 || a.knoepfe.some(x => x < 44)) probleme.push("b) Antwortknöpfe: " + a.knoepfe.join("/"));
  else if (/Training/.test(a.offenText) || !/Spielfest/.test(a.offenText) || !/Elternabend/.test(a.offenText)) probleme.push("b) „Rückmeldung fehlt“ listet: " + a.offenText.slice(0, 200));
  else zeilen.push("b) Training: „Gilt als zugesagt“, kein Streifen, vier Antwortknöpfe; offen stehen nur Spielfest und Elternabend");
  // c)
  if (!/Rückmeldung fehlt|überfällig/.test(c.tkText) || /Gilt als zugesagt/.test(c.tkText) || c.streifen !== "4px") probleme.push(`c) Spiel ohne Antwort: Streifen ${c.streifen}, Text „${c.tkText.slice(0, 120)}“`);
  else zeilen.push("c) Spiel ohne Antwort: Mahnung und Farbstreifen 4 px bleiben");
  // d)
  const cz = Object.fromEntries(c.zonen.map(z => [z.id, z.sichtbar]));
  if (cz.neu !== false) probleme.push("d) „Neu“ ohne Inhalt sichtbar: " + JSON.stringify(cz));
  else zeilen.push("d) ohne neue Rufe und News: keine Überschrift „Neu“");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
