/* v718 · Startseiten entschlackt.
   PO 02.10.: „entschlack direkt“ (offener Punkt „Startseiten entschlacken“ aus der Optik-Prüfung).
   Gemessen 390 px: Trainer-Start 1473 → 1204 px, Eltern-Start 2277 → 1924 px.
   a) Trainer: sechs Bereichs-Kacheln bleiben (Beschluss N1/v682), stehen aber zu dritt je Reihe,
      jede 44–90 px hoch, kein Name läuft über
   b) Schrift-Hinweis: nur noch die Frage und die zwei Knöpfe, kein Erklärsatz
   c) Eltern: keine eigene Karte „Termine“ mit nur einem Knopf – „Alle Termine & Kalender-Abo“ steht
      als Kachel unter „Mehr“ (≥ 44 px) und öffnet die Terminliste; ohne weitere Termine keine
      Überschrift „📅 Termine“
   d) Eltern: kein Team-Level auf der Startseite (es steht in der Kabine), kein Satz „Aktiven Status
      nochmal tippen“ unter den Zusage-Knöpfen (steht jetzt in der Tour) */
"use strict";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const alle = [{ id: 91, datum: h.tagePlus(1), typ: "training", titel: "Training", uhrzeit: "17:00" }];
  const termine = u => { const d = u.searchParams.get("datum") || ""; const m = d.match(/^gte\.(.*)$/); return alle.filter(t => !m || t.datum >= m[1]); };

  // a) b) Trainer
  const t = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine }) });
  await h.sichtbarMachen(t.page, "#main-app");
  const rt = await t.page.evaluate(async () => {
    localStorage.removeItem("adler_schrift_hinweis"); localStorage.removeItem("adler_schrift");
    go("home"); await new Promise(r => setTimeout(r, 1200));
    const g = document.getElementById("home-bereiche");
    if (!g) return { fehlt: true };
    const k = [...g.children];
    const spalten = getComputedStyle(g).gridTemplateColumns.split(" ").length;
    const hoehen = k.map(e => Math.round(e.getBoundingClientRect().height));
    const ueber = k.filter(e => [...e.querySelectorAll("span")].some(s => s.scrollWidth > s.clientWidth + 1)).map(e => e.textContent.trim());
    schriftHinweisZeigen("schrift-hinweis-trainer");
    const sh = document.querySelector("#schrift-hinweis-trainer .schrift-hinweis");
    return { anzahl: k.length, spalten, hoehen, ueber, schrift: sh ? sh.textContent.replace(/\s+/g, " ").trim() : null };
  });
  const ft = t.fehler(); await t.schliessen();

  // c) d) Eltern
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
  await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
  const re = await s.page.evaluate(async () => {
    const text = document.body.innerText;
    const k = document.getElementById("alle-termine-kachel");
    let mehrDavor = false;
    if (k) { let e = k.previousElementSibling; while (e) { if (/^Mehr$/.test((e.textContent || "").trim())) { mehrDavor = true; break; } e = e.previousElementSibling; } }
    const out = { kachel: k ? Math.round(k.getBoundingClientRect().height) : 0, mehrDavor,
      ueberschrift: /📅 Termine\n/.test(text + "\n") && [...document.querySelectorAll("div")].some(d => d.textContent.trim() === "📅 Termine"),
      karteMitKnopf: [...document.querySelectorAll("button")].filter(b => /Alle Termine/.test(b.textContent)).length,
      level: !!document.getElementById("eltern-level-slot"), status: /Aktiven Status nochmal tippen/.test(text),
      tour: typeof ELTERN_TOUR !== "undefined" && ELTERN_TOUR.some(x => /nochmal auf die gewählte Antwort tippen/i.test(x.d)) };
    let auf = false; window.elternTermineOpen = () => { auf = true; };
    if (k) k.click(); await new Promise(r => setTimeout(r, 100));
    out.oeffnet = auf;
    return out;
  });
  const fe = s.fehler(); await s.schliessen();

  const titel = "v718 Startseiten entschlackt: Kacheln zu dritt, Hinweise knapp, Termine unter „Mehr“";
  if (rt.fehlt) return h.ergebnis(titel, false, ["#home-bereiche fehlt"]);
  const f = [].concat(ft, fe); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));

  if (rt.anzahl !== 6 || rt.spalten !== 3) probleme.push(`a) ${rt.anzahl} Kacheln in ${rt.spalten} Spalten`);
  else if (rt.hoehen.some(x => x < 44 || x > 90)) probleme.push("a) Kachelhöhen " + rt.hoehen.join("/"));
  else if (rt.ueber.length) probleme.push("a) Name läuft über: " + rt.ueber.join(", "));
  else zeilen.push(`a) sechs Kacheln zu dritt, ${Math.min(...rt.hoehen)}–${Math.max(...rt.hoehen)} px hoch`);

  if (!rt.schrift || /Oben auf/.test(rt.schrift) || !/Größer stellen/.test(rt.schrift) || !/Nein danke/.test(rt.schrift)) probleme.push(`b) Schrift-Hinweis: „${rt.schrift}“`);
  else zeilen.push(`b) Schrift-Hinweis: „${rt.schrift}“`);

  if (re.kachel < 44 || !re.mehrDavor) probleme.push(`c) Kachel „Alle Termine“: ${re.kachel} px, unter „Mehr“: ${re.mehrDavor}`);
  else if (re.karteMitKnopf !== 1) probleme.push(`c) ${re.karteMitKnopf} Knöpfe „Alle Termine“`);
  else if (re.ueberschrift) probleme.push("c) Überschrift „📅 Termine“ ohne weitere Termine");
  else if (!re.oeffnet) probleme.push("c) Kachel öffnet die Terminliste nicht");
  else zeilen.push(`c) „Alle Termine & Kalender-Abo“ unter „Mehr“ (${re.kachel} px), keine leere Termin-Karte`);

  if (re.level) probleme.push("d) Team-Level noch auf der Eltern-Startseite");
  else if (re.status) probleme.push("d) Satz „Aktiven Status nochmal tippen“ steht noch da");
  else if (!re.tour) probleme.push("d) Tour erklärt das Zurücknehmen nicht");
  else zeilen.push("d) kein Team-Level, kein Erklärsatz unter den Knöpfen – das Zurücknehmen erklärt die Tour");

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
