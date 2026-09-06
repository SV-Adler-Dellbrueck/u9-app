/* v468 – PO: „dass der Liveticker separat vom Trainer an- und ausgeschaltet werden kann und
   dass dieser nicht abhängig ist vom Spieltimer", und die Spielerliste soll auch ohne
   gepflegte Aufstellung bedienbar sein. Geprueft: (a) der Ticker ist AUS, bis er gestartet
   wird, (b) Ausschalten nimmt den bisherigen Verlauf NICHT vom Netz, (c) die Live-Aktion
   zeigt Feldspieler und darunter abgetrennt alle weiteren Kinder des Tages. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();

  // (a)+(c) Trainerseite
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    matchday: [{ datum: heute, ticker_open: false, clock_status: "idle" }],
    ticker_events: []
  }), hoehe: 1600 });
  const t = await s.page.evaluate(async K => {
    await loadKader();
    const kon = k => { try { return eval("typeof " + k + '!=="undefined"?' + k + ":null"); } catch (e) { return null; } };
    const start = kon("mcTickerOpen");
    // Ohne Start darf nichts gesendet werden
    if (typeof tickerPush === "function") { try { await tickerPush(K[0], "tor"); } catch (e) {} }
    // Zwei Kinder aufs Feld, alle 15 als „dabei" – dann muss es beide Bloecke geben
    if (typeof rotField !== "undefined") { rotField.length = 0; rotField.push(K[0], K[1]); }
    if (typeof nomStatus === "object" && nomStatus) K.forEach(n => { nomStatus[n] = "dabei"; });
    const oben = (typeof atOnFieldPlayers === "function") ? atOnFieldPlayers() : null;
    const unten = (typeof atWeitereSpieler === "function") ? atWeitereSpieler() : null;
    return { start, oben, unten };
  }, K);
  const gesendet = s.gesendet || [];
  const fehler = s.fehler(); await s.schliessen();

  if (t.start !== false) probleme.push(`mcTickerOpen startet als ${t.start}, erwartet false (Ticker ist aus, bis er gestartet wird)`);
  const tickerPosts = gesendet.filter(g => /ticker_events/.test(g.pfad || ""));
  if (tickerPosts.length) probleme.push(`ohne Start wurden ${tickerPosts.length} Ticker-Zeilen gesendet`);
  if (!t.oben || t.oben.length !== 2) probleme.push(`oberer Block ${JSON.stringify(t.oben)}, erwartet die 2 Feldspieler`);
  if (!t.unten || t.unten.length !== K.length - 2) probleme.push(`unterer Block ${(t.unten || []).length}, erwartet ${K.length - 2} weitere Kinder`);
  if (t.unten && t.oben && t.unten.some(n => t.oben.includes(n))) probleme.push("ein Kind steht in beiden Blöcken");

  // (b) Oeffentliche Seite: Ticker aus, aber es gibt schon Zeilen -> Verlauf bleibt
  const e = await h.starten({ start: "/eltern/index.html?ticker=" + heute, warten: 1400,
    supabase: h.supabaseAttrappe({
      matchday: [{ datum: heute, gegner: "FC Beispiel", ticker_open: false, clock_status: "stopped", half: 2, spieldauer_min: 10, halbzeiten: 1 }],
      ticker_events: [{ datum: heute, text: "Kind A trifft!", typ: "tor", minute: "5'", created_at: heute + "T10:05:00Z" }],
      ticker_claps: [{ datum: heute, count: 0 }]
    }) });
  const oeff = await e.page.evaluate(() => document.body.textContent.replace(/\s+/g, " ").trim());
  const fehler2 = e.fehler(); await e.schliessen();

  if (!/Kind A trifft/.test(oeff)) probleme.push("nach dem Ausschalten ist der bisherige Verlauf weg: " + oeff.slice(0, 140));
  if (!/kein Spiel|meldet sich wieder/.test(oeff)) probleme.push("kein Hinweis, dass gerade nichts Neues kommt");
  if (fehler.length) probleme.push(...fehler.slice(0, 2));
  if (fehler2.length) probleme.push(...fehler2.slice(0, 2));
  zeilen.push(`Start: mcTickerOpen=${t.start} · ohne Start gesendet: ${tickerPosts.length}`);
  zeilen.push(`Blöcke: oben ${(t.oben || []).length} · unten ${(t.unten || []).length} · überschneidungsfrei ${!(t.unten || []).some(n => (t.oben || []).includes(n))}`);
  zeilen.push(`aus + Verlauf da: sichtbar ${/Kind A trifft/.test(oeff)}`);
  return h.ergebnis("Liveticker: eigener Start-Schalter, Verlauf bleibt, Spielerliste zweigeteilt", !probleme.length, zeilen.concat(probleme));
};
