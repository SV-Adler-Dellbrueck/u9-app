/* v467 – „Wenn der Liveticker aktiviert wird, sollten Eltern sofort oben eine Kachel sehen …
   und da sollte es einen Link zum Teilen geben." Bisher stand der Ticker-Einstieg unten IN
   der Terminkarte und erschien an JEDEM Spieltag – auch wenn nie jemand getickert hat.
   Geprueft: Kachel nur wenn wirklich getickert wird, Teilen-Knopf, Wegklicken haelt fuer
   den Spieltag, kein hartes Blinken (Bedeutung haengt nicht an der Bewegung). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  const termin = { id: 900, datum: heute, typ: "turnier", titel: "Turnier", heim: true };

  async function lauf(mitTicker) {
    const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: h.supabaseAttrappe({
      /* Seit v468 ist das Startsignal der ausdrueckliche Schalter des Trainers, nicht mehr
         die Krücke „Uhr laeuft ODER erster Eintrag". Die laufende Uhr darf die Kachel
         NICHT mehr allein ausloesen – deshalb steht sie im Aus-Fall bewusst auf running. */
      matchday: mitTicker ? [{ datum: heute, clock_status: "idle", ticker_open: true }]
                          : [{ datum: heute, clock_status: "running", ticker_open: false }],
      ticker_events: []
    }) });
    const r = await s.page.evaluate(async t => {
      let slot = document.getElementById("eltern-live-slot");
      if (!slot) { slot = document.createElement("div"); slot.id = "eltern-live-slot"; document.body.appendChild(slot); }
      try { localStorage.removeItem("adler_live_weg"); } catch (e) {}
      // Defensiv, damit die Gegenprobe gegen eine aeltere Fassung berichtet statt abzubrechen.
      if (typeof elternLiveKachelLoad !== "function") return { fehlt: true, txt: "", punkt: false, teilen: false, nachWeg: "", anim: null };
      await elternLiveKachelLoad(t, 0);
      const txt = slot.textContent.replace(/\s+/g, " ").trim();
      const punkt = slot.querySelector(".el-live-dot");
      const teilen = [...slot.querySelectorAll("button")].some(b => /Teilen/.test(b.textContent || ""));
      /* Animation JETZT lesen: elternLiveWeg leert den Slot, und an einem aus dem Dokument
         geloesten Element liefert getComputedStyle leere Werte. */
      const anim = punkt ? getComputedStyle(punkt).animationName : null;
      // Wegklicken: verschwindet und bleibt nach erneutem Laden weg
      let nachWeg = null;
      if (txt && typeof elternLiveWeg === "function") { elternLiveWeg(t.datum); await elternLiveKachelLoad(t, 0); nachWeg = slot.textContent.trim(); }
      return { txt, punkt: !!punkt, teilen, nachWeg, anim };
    }, termin);
    const fehler = s.fehler(); await s.schliessen();
    return { ...r, fehler };
  }

  const mit = await lauf(true);
  const ohne = await lauf(false);

  if (mit.fehlt) probleme.push("elternLiveKachelLoad gibt es nicht – die Kachel fehlt ganz");
  if (!/LIVE/.test(mit.txt)) probleme.push(`Kachel bei laufendem Ticker: „${mit.txt.slice(0, 90)}“ – LIVE fehlt`);
  if (!mit.punkt) probleme.push("Live-Punkt fehlt");
  if (mit.anim !== "elLivePuls") probleme.push(`Puls-Animation: ${mit.anim} (erwartet elLivePuls, kein hartes Blinken)`);
  if (!mit.teilen) probleme.push("Teilen-Knopf fehlt");
  if (mit.nachWeg !== "") probleme.push(`nach dem Wegklicken bleibt: „${mit.nachWeg}“`);
  if (ohne.txt !== "") probleme.push(`ohne gestarteten Ticker erscheint trotzdem eine Kachel (Uhr allein darf nicht reichen): „${ohne.txt.slice(0, 90)}“`);
  if (mit.fehler.length) probleme.push(...mit.fehler.slice(0, 2));
  if (ohne.fehler.length) probleme.push(...ohne.fehler.slice(0, 2));
  zeilen.push(`gestartet: „${mit.txt.slice(0, 80)}“ · Puls ${mit.anim} · Teilen ${mit.teilen}`);
  zeilen.push(`nicht gestartet: ${ohne.txt === "" ? "keine Kachel ✓" : "„" + ohne.txt.slice(0, 60) + "“"} · weggeklickt bleibt weg ${mit.nachWeg === ""}`);
  return h.ergebnis("Live-Kachel: nur wenn getickert wird, mit Teilen-Link, ohne hartes Blinken", !probleme.length, zeilen.concat(probleme));
};
