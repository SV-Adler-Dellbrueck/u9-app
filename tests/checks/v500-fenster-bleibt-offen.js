/* v500 – PO: „Wenn ich in dieser Kachel etwas ändere, z. B. ein Feld hinzufüge, schließt sich das
   Fenster sofort und die Maske darunter wird sichtbar und startet in der Mitte. Dann muss ich hoch
   scrollen und wieder auf die ursprüngliche Kachel klicken." Das Fenster blieb – der Klappblock der
   Vorbereitung (v497) baute sich nach jedem Speichern zugeklappt neu, und die Ansicht sprang auf
   den Plan. Geprueft: nach „+ Feld" ist der Block noch offen, eine aufgeklappte Runde bleibt offen,
   die Scrollposition steht, das Fenster ist da – und auf der Gast-Seite bleibt eine aufgeklappte
   Runde ueber den Neuaufbau hinweg offen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), nominierungen: [], termine: [], matchday: [], heimturnier: (u, req) => req.method() === "GET" ? [] : { status: 204, body: "" } }), hoehe: 1200 });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof _fstOffenMerken !== "function") return { fehlt: "_fstOffenMerken" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const vereine = [{ name: "SV Adler Dellbrück", kinder: 14, teams: 2 }, { name: "SC Wahn Grengel", kinder: 10, teams: 2 }, { name: "SV Rath-Heumar", kinder: 10, teams: 2 }];
    const teams = fstTeamsBauen(vereine);
    const cfg = { art: "festival", format: "festival", start: "10:15", dauer: 60, spieldauer: 8, wechsel: 5, felder: FST_STANDARD_FELDER.slice(), vereine, infos: "" };
    const plan = fstPlanBauen(teams, cfg);
    // Das Fenster wie in htOpen: ein fester Rahmen, der selbst scrollt, darin ht-body
    const m = document.createElement("div"); m.id = "hturnier-modal";
    m.style.cssText = "position:fixed;inset:0;overflow-y:auto;padding:16px"; 
    m.innerHTML = '<div style="max-width:460px;margin:auto"><div id="ht-body"></div></div>';
    document.body.appendChild(m);
    _HT = { id: 9, name: "Kinderfestival", datum: heute, edit_code: "abc", config: cfg, teams: teams.map(t => t.name), plan };
    fstRender(); await warte(120);
    const vor = document.getElementById("fst-vorbereitung");
    if (!vor) return { fehlt: "fst-vorbereitung" };
    vor.open = true;
    const runde2 = document.getElementById("fst-runde-2"); if (runde2) runde2.open = true;
    await warte(30);
    m.scrollTop = 220; await warte(30);
    const scrollVorher = m.scrollTop;
    const felderVorher = document.querySelectorAll('[id^="fst-feld-name-"]').length;
    await fstFeldPlus(); await warte(150);
    const vorNachher = document.getElementById("fst-vorbereitung");
    const r2Nachher = document.getElementById("fst-runde-2");
    const felderNachher = document.querySelectorAll('[id^="fst-feld-name-"]').length;
    const a = { fenster: !!document.getElementById("hturnier-modal"), offen: !!(vorNachher && vorNachher.open),
      rundeOffen: r2Nachher ? r2Nachher.open : null, scrollVorher, scrollNachher: m.scrollTop, felderVorher, felderNachher };
    // Ohne Aufklappen bleibt es zu – der Neuaufbau erfindet keinen Zustand
    vorNachher.open = false; await fstFeldWeg(felderNachher - 1); await warte(150);
    a.bleibtZu = !document.getElementById("fst-vorbereitung").open;
    m.remove();
    // Gast-Seite: aufgeklappte Runde ueberlebt den Neuaufbau
    const wrap = document.createElement("div"); document.body.appendChild(wrap);
    const row = { id: 9, slug: "x", name: "Kinderfestival", datum: heute, config: cfg, teams: _HT.teams, plan };
    _htPub = { slug: "x", code: "", wrap, row }; _fstUhrMarke = "";
    _fstPublicRender(wrap, row); await warte(60);
    const g2 = wrap.querySelector("#fst-runde-2"); const gastVorhanden = !!g2;
    if (g2) g2.open = true;
    _fstPublicRender(wrap, row); await warte(60);
    const g2b = wrap.querySelector("#fst-runde-2");
    a.gastVorhanden = gastVorhanden; a.gastOffen = !!(g2b && g2b.open);
    _htPub = null; wrap.remove();
    return a;
  }, { heute });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Fenster bleibt offen", false, probleme); }
  if (!r.fenster) probleme.push("Das Planer-Fenster ist nach „+ Feld“ weg");
  if (r.felderNachher !== r.felderVorher + 1) probleme.push(`„+ Feld“ ergab ${r.felderNachher} statt ${r.felderVorher + 1} Felder`);
  if (!r.offen) probleme.push("Die Vorbereitung klappt nach „+ Feld“ wieder zu");
  if (r.rundeOffen === false) probleme.push("Eine aufgeklappte Runde klappt beim Neuaufbau wieder zu");
  if (r.scrollVorher < 100) probleme.push(`Prüfaufbau: Fenster scrollt nicht (${r.scrollVorher}px)`);
  else if (Math.abs(r.scrollNachher - r.scrollVorher) > 40) probleme.push(`Scrollposition springt von ${r.scrollVorher}px auf ${r.scrollNachher}px`);
  if (!r.bleibtZu) probleme.push("Eine zugeklappte Vorbereitung geht beim Neuaufbau von selbst auf");
  if (!r.gastVorhanden) probleme.push("Gast-Seite: Runden-Klappblöcke tragen keine Kennung (fst-runde-N)");
  else if (!r.gastOffen) probleme.push("Gast-Seite: eine aufgeklappte Runde klappt beim Neuaufbau wieder zu");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Nach „+ Feld“: Fenster da ${r.fenster}, Vorbereitung offen ${r.offen}, Runde 2 offen ${r.rundeOffen}, Felder ${r.felderVorher}→${r.felderNachher}, Scroll ${r.scrollVorher}→${r.scrollNachher}px`);
  zeilen.push(`Zugeklappt bleibt zu: ${r.bleibtZu} · Gast-Seite Runde 2 bleibt offen: ${r.gastOffen}`);
  return h.ergebnis("Das Planer-Fenster behält Klappzustand und Scrollposition", !probleme.length, zeilen.concat(probleme));
};
