/* v619 · PO (Bildschirmfoto aus dem Eltern-Bereich): „Unten im Bild sieht man eine
   Fehlermeldung, die immer wieder kommt." – „⚠️ Nur lokal gespeichert – Team-Sync
   „anwesenheit" gerade nicht möglich (403)".

   Ursache: Trainer- und Eltern-Bereich teilen auf demselben Handy den Speicher. Wer Trainer
   UND Elternteil ist, hat lokale Anwesenheits-Zeitstempel liegen. teamSyncLoad lief auch im
   Eltern-Bereich, hielt die lokale Kopie für neuer und schrieb sie mit dem Eltern-Konto zurück
   – die Datenbank sagt 403, und die Meldung kam bei jedem Öffnen.

   a) Eltern-Bereich mit liegengebliebener Trainer-Anwesenheit: kein Schreibversuch auf
      `anwesenheit` oder `trainings_eval`, keine Abfrage darauf, keine rote Meldung.
   b) Gegenprobe Trainer-Bereich: dieselbe liegengebliebene Anwesenheit wird dort wie bisher
      nachgereicht (ein Schreibvorgang auf `anwesenheit`). */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const datum = h.tagePlus(-1);
  const alt = new Date(Date.now() - 3 * 864e5).toISOString(), neu = new Date().toISOString();
  const tabellen = { kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }], termine: [], rueckmeldungen: [],
    anwesenheit: (u, req) => req.method() === "GET" ? [{ datum, data: {}, updated_at: alt }] : { status: 403, body: "{}" },
    trainings_eval: (u, req) => req.method() === "GET" ? [] : { status: 403, body: "{}" } };
  const liegengeblieben = ({ datum, neu }) => {
    localStorage.setItem("adler_anwesenheit", JSON.stringify({ [datum]: { _trainers: ["Trainer X"], "Kind A": { da: true, qual: 0 } } }));
    localStorage.setItem("adler_anwesenheit_ts", JSON.stringify({ [datum]: neu }));
  };

  // a) Eltern-Bereich
  let a;
  {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, speicherBehalten: true, supabase: h.supabaseAttrappe(tabellen) });
    await s.page.evaluate(({ t, datum, neu, f }) => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); eval(f)({ datum, neu }); },
      { t: TOKEN, datum, neu, f: liegengeblieben.toString() });
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(5000);
    const rot = await s.page.evaluate(() => /Nur lokal gespeichert/.test(document.body.textContent));
    const team = s.abgefragt.filter(x => /\/(anwesenheit|trainings_eval)$/.test(x.pfad));
    a = { rot, schreib: team.filter(x => x.methode !== "GET").length, lese: team.filter(x => x.methode === "GET").length, portal: await s.page.evaluate(() => !!document.getElementById("eltern-root") || /Eltern/.test(document.title)) };
    await s.schliessen();
  }
  // b) Trainer-Bereich
  let b;
  {
    const s = await h.starten({ warten: 1200, speicherBehalten: true, supabase: h.supabaseAttrappe({ ...tabellen, anwesenheit: (u, req) => req.method() === "GET" ? [{ datum, data: {}, updated_at: alt }] : { status: 201, body: "[]" } }) });
    await s.page.evaluate(({ datum, neu, f }) => eval(f)({ datum, neu }), { datum, neu, f: liegengeblieben.toString() });
    await s.page.evaluate(async () => { await teamSyncLoad(); await new Promise(r => setTimeout(r, 400)); });
    b = { schreib: s.gesendet.filter(x => /\/anwesenheit$/.test(x.pfad)).length };
    await s.schliessen();
  }
  if (a.rot) probleme.push("a) im Eltern-Bereich erscheint „Nur lokal gespeichert“");
  if (a.schreib) probleme.push(`a) der Eltern-Bereich schreibt ${a.schreib}× auf Team-Tabellen`);
  if (a.lese) probleme.push(`a) der Eltern-Bereich liest ${a.lese}× Team-Tabellen`);
  if (!b.schreib) probleme.push("b) der Trainer-Bereich reicht liegengebliebene Anwesenheit nicht mehr nach");
  zeilen.push(`a) Eltern-Bereich: Team-Tabellen gelesen ${a.lese}×, geschrieben ${a.schreib}×, rote Meldung ${a.rot ? "ja" : "nein"} · b) Trainer-Bereich: ${b.schreib}× nachgereicht`);
  return h.ergebnis("v619 Eltern-Bereich rührt die Team-Daten des Trainers nicht an – keine 403-Meldung", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
