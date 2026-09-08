/* v482 – PO (morgens, 16:24): „Die Anwesenheit der Kinder ist wieder weg." Die Kachel
   zeigte „Alle da" und Speichern, aber kein Kind – und die Kopfzeile den Rueckfall
   „Trainerstab · U9 I". Ursache: nach einer Nacht ist der Zugangs-Token abgelaufen;
   sbToken() stoesst die Erneuerung an und gibt null zurueck, loadKader lief mit dem
   anonymen Schluessel, die RLS gab null Zeilen ohne Fehler, und nichts lud den Kader nach.
   Geprueft: Start mit abgelaufenem Token + refresh_token → der Kader ist trotzdem da, die
   Anwesenheit zeigt die Kinder, die Kopfzeile den naechsten Termin; und die Erneuerung
   mitten in der Arbeit (Kader schon da) zeichnet nichts neu. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const t2 = h.tagePlus(3);
  const NEU = "token-neu-" + Date.now();
  const rows = h.kaderZeilen();
  const attrappe = h.supabaseAttrappe({
    kader: (u, req) => (((req.headers() || {}).authorization || "").includes(NEU) ? rows : []),
    termine: [{ id: 1, datum: t2, typ: "training", uhrzeit: "16:45", uhrzeit_ende: "18:00", trainer_status: {} }],
    anwesenheit: []
  });
  const supabase = (u, req) => {
    if (u.pathname.startsWith("/auth/v1/token")) return { status: 200, body: JSON.stringify({ access_token: NEU, refresh_token: "r2", expires_in: 3600 }) };
    return attrappe(u, req);
  };
  const s = await h.starten({ supabase, angemeldet: false, hoehe: 1600 });
  // Abgelaufene Sitzung hinterlegen und neu laden – so sieht die App einen Trainer nach einer Nacht
  await s.page.evaluate(() => { localStorage.setItem("adler_sb_auth", JSON.stringify({ access_token: "token-alt", refresh_token: "r1", expires_at: Math.floor(Date.now() / 1000) - 10 })); });
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForTimeout(1500);
  const r = await s.page.evaluate(async ({ K }) => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const tok = (() => { try { return JSON.parse(localStorage.getItem("adler_sb_auth") || "{}").access_token; } catch (e) { return null; } })();
    document.getElementById("pin-gate")?.remove();
    const m = document.getElementById("main-app"); if (m) { m.style.display = ""; if (getComputedStyle(m).display === "none") m.style.display = "block"; }
    const kader = KADER.length;
    go("anwesenheit"); await warte(1500);
    const tiles = document.querySelectorAll("#aw-list .aw-tile").length;
    const topbar = document.getElementById("topbar-sub")?.textContent || "";
    // Erneuerung mitten in der Arbeit: nichts neu zeichnen
    const list = document.getElementById("aw-list"); const marke = "MARKE-" + Date.now(); if (list) list.setAttribute("data-marke", marke);
    if (typeof nachSitzungErneuert === "function") await nachSitzungErneuert();
    await warte(300);
    const unveraendert = document.getElementById("aw-list")?.getAttribute("data-marke") === marke;
    return { tok, kader, tiles, topbar, unveraendert, hatFn: typeof nachSitzungErneuert === "function" };
  }, { K });
  const fehler = s.fehler(); await s.schliessen();
  if (r.tok !== NEU) probleme.push(`Token wurde nicht erneuert (${r.tok})`);
  if (r.kader !== K.length) probleme.push(`Kader nach dem Start: ${r.kader} statt ${K.length} Kinder`);
  if (r.tiles !== K.length) probleme.push(`Anwesenheit zeigt ${r.tiles} Kinder statt ${K.length}`);
  if (!/Nächstes/.test(r.topbar)) probleme.push(`Kopfzeile bleibt im Rückfall: „${r.topbar}“`);
  if (!r.hatFn) probleme.push("nachSitzungErneuert fehlt");
  if (r.hatFn && !r.unveraendert) probleme.push("Erneuerung mitten in der Arbeit zeichnet die Anwesenheit neu");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Token ${r.tok === NEU ? "erneuert" : r.tok} · Kader ${r.kader} · Anwesenheit ${r.tiles} Kinder · Kopfzeile „${r.topbar.slice(0, 40)}“`);
  zeilen.push(`Erneuerung bei vollem Kader: unverändert ${r.unveraendert}`);
  return h.ergebnis("Kader nach Token-Erneuerung: Start mit abgelaufenem Token zeigt Kinder und Kopfzeile", !probleme.length, zeilen.concat(probleme));
};
