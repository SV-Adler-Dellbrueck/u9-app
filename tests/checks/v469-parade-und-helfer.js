/* v469 – zwei Befunde vom PO: (1) „Bei Parade kann ich ausschließlich die Torhüter anbieten,
   weil ein Feldspieler keine Parade macht." (2) Der Trainer hat im Spiel keine Zeit zu
   tickern und will es weitergeben. Der Helfer-Link gab es schon – er war nur unbenutzbar:
   der Helfer-Bereich las KADER, das ohne Anmeldung leer bleibt (RLS), also sah er null
   Namen. Geprueft: Parade zeigt nur Torhüter, der grosse Helfer-Knopf erscheint beim
   laufenden Ticker, und der Helfer bekommt seine Kinder ueber die RPC statt aus KADER. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();

  // (1)+(2a) Trainerseite
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    matchday: [{ datum: heute, ticker_open: true, clock_status: "idle", delegate_token: "tok-1" }],
    ticker_events: []
  }), hoehe: 1600 });
  const t = await s.page.evaluate(async K => {
    await loadKader();
    // Zwei Kinder aufs Feld, alle als „dabei"; Torwart ist laut Attrappe das erste Kind.
    if (typeof rotField !== "undefined") { rotField.length = 0; rotField.push(K[0], K[1], K[2]); }
    if (typeof nomStatus === "object" && nomStatus) K.forEach(n => { nomStatus[n] = "dabei"; });
    const tw = K.filter(n => getKader(n) && getKader(n).tw);
    const alleFeld = (typeof atOnFieldPlayers === "function") ? atOnFieldPlayers() : [];
    const nurTW = (typeof atTorhueter === "function") ? atTorhueter(alleFeld) : null;
    // Rueckfall: ohne markierten Torwart lieber alle zeigen als einen leeren Bildschirm
    const rueckfall = (typeof atTorhueter === "function") ? atTorhueter(["Niemand A", "Niemand B"]) : null;
    // Grosser Helfer-Knopf, sobald der Ticker laeuft
    let panel = document.getElementById("ticker-panel");
    if (!panel) { panel = document.createElement("div"); panel.id = "ticker-panel"; document.body.appendChild(panel); }
    if (typeof mcTickerOpen !== "undefined") mcTickerOpen = true;
    if (typeof tickerRenderControls === "function") tickerRenderControls();
    const gross = [...panel.querySelectorAll("button")].find(b => /tickern lassen/.test(b.textContent || ""));
    const hoehe = gross ? parseInt(getComputedStyle(gross).minHeight) : 0;
    if (typeof mcTickerOpen !== "undefined") mcTickerOpen = false;
    if (typeof tickerRenderControls === "function") tickerRenderControls();
    const grossAus = [...panel.querySelectorAll("button")].some(b => /tickern lassen/.test(b.textContent || ""));
    return { tw, alleFeld, nurTW, rueckfall, gross: !!gross, hoehe, grossAus };
  }, K);
  const fehler = s.fehler(); await s.schliessen();

  if (!t.tw.length) probleme.push("Prüfaufbau: kein Kind ist als Torwart markiert");
  if (!t.nurTW || t.nurTW.some(n => !t.tw.includes(n))) probleme.push(`Parade-Liste ${JSON.stringify(t.nurTW)}, erwartet nur Torhüter ${JSON.stringify(t.tw)}`);
  if (t.nurTW && t.nurTW.length >= t.alleFeld.length) probleme.push(`Parade schränkt nicht ein: ${t.nurTW.length} von ${t.alleFeld.length}`);
  if (!t.rueckfall || t.rueckfall.length !== 2) probleme.push(`ohne markierten Torwart bleibt die Liste nicht stehen: ${JSON.stringify(t.rueckfall)}`);
  if (!t.gross) probleme.push("großer Helfer-Knopf fehlt, obwohl der Ticker läuft");
  if (t.hoehe < 44) probleme.push(`Helfer-Knopf nur ${t.hoehe} px hoch (mindestens 44)`);
  if (t.grossAus) probleme.push("großer Helfer-Knopf steht auch da, wenn der Ticker nicht läuft");

  // (2b) Helfer-Bereich: Kinder kommen aus der RPC, nicht aus KADER
  const d = await h.starten({ start: "/eltern/index.html?delegate=tok-1", warten: 1400,
    supabase: h.supabaseAttrappe({
      matchday: [{ datum: heute, ticker_open: true, delegate_token: "tok-1", gegner: "FC Beispiel", spieldauer_min: 10, halbzeiten: 2 }],
      rpc: { ticker_kader: { feld: [K[0], K[1]], weitere: [K[2], K[3], K[4]], tw: [K[0]] } }
    }) });
  const dv = await d.page.evaluate(() => {
    const txt = document.body.textContent.replace(/\s+/g, " ").trim();
    const chips = [...document.querySelectorAll("button")].map(b => (b.textContent || "").trim());
    return { txt, chips };
  });
  const fehler2 = d.fehler(); await d.schliessen();

  const hatKind = n => dv.chips.includes(n);
  if (!hatKind(K[0]) || !hatKind(K[2])) probleme.push(`Helfer sieht keine Kinder-Chips: ${JSON.stringify(dv.chips.slice(0, 8))}`);
  if (!/AUCH HEUTE DABEI/.test(dv.txt)) probleme.push("Helfer-Liste ist nicht zweigeteilt");
  if (!/Tor!/.test(dv.txt)) probleme.push("Helfer kann keine Tore melden");
  if (!/Gegentor/.test(dv.txt)) probleme.push("Helfer kann keine Gegentore melden");
  if (fehler.length) probleme.push(...fehler.slice(0, 2));
  if (fehler2.length) probleme.push(...fehler2.slice(0, 2));
  zeilen.push(`Parade: ${JSON.stringify(t.nurTW)} von ${t.alleFeld.length} auf dem Feld · Rückfall ${(t.rueckfall || []).length}`);
  zeilen.push(`Helfer-Knopf: sichtbar ${t.gross} (${t.hoehe} px) · ohne Ticker ${t.grossAus}`);
  zeilen.push(`Helfer-Bereich: ${dv.chips.filter(c => K.includes(c)).length} Kinder-Chips, zweigeteilt ${/AUCH HEUTE DABEI/.test(dv.txt)}`);
  return h.ergebnis("Parade nur für Torhüter · Helfer-Link sichtbar und mit Kindern gefüllt", !probleme.length, zeilen.concat(probleme));
};
