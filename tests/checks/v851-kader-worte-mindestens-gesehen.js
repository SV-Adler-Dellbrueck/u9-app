/* v851 · Nach der ersten Bewertungsrunde (Charles 18.11.2026).
   a) Die Kaderliste zeigt je bewertetem Kind die Stärke in Worten – kein Prozentzeichen, keine
      Spalten „Ges.“/„Pot.“; am Handy bleiben Rolle, Stärke und die Knöpfe sichtbar.
   b) Ein Kind, bei dem alles auf „Nicht gesehen“ steht, wird in der Runde nicht gespeichert, im
      Abschluss benannt und bleibt gemerkt; die anderen werden gespeichert.
   c) Kind für Kind: dieselbe Regel, mit Meldung, ohne Schreibvorgang. */
"use strict";
module.exports = async function (h) {
  const titel = "v851 Kaderliste in Worten statt Prozent · zu wenig Gesehenes wird nicht gespeichert";
  const probleme = [], zeilen = [];
  const berlin = n => { const [y, m, d] = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const s = await h.starten({ warten: 2200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), spielerprofile: [],
    team_einstellungen: [{ id: 1, bewertung_ab: berlin(-1) }], profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], termine: [] }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    window.trainerMe = async () => "Charles";
    if (typeof bewGesehen !== "function" || typeof bewStaerkeWort !== "function") return { alt: true };
    try { await loadKader(); } catch (e) {}
    await bewAbLaden();
    // b) Runde: Kind 0 nichts gesehen, Kind 1 nur sieben gesehen, Rest gemischt
    go("bew"); bewSperreAnwenden(); await w(200);
    try { localStorage.removeItem("adler_bew_runde_entwurf"); } catch (e) {}
    bkrOeffnen(); await w(100);
    const kr = bkrKriterien(), namen = bkrKinder();
    namen.forEach((n, i) => { const tw = getKader(n).tw; BKR.werte[n] = {}; kr.forEach((k, j) => { if (!k.tw || tw) BKR.werte[n][k.n] = i === 0 ? 0 : i === 1 ? (j < 7 ? 3 : 0) : 1 + ((i + j) % 4); }); });
    BKR.idx = bkrSchritte().length - 1; bkrRender(); await w(60);
    out.stand = document.getElementById("bkr-stand").innerText.replace(/\s+/g, " "); out.hinweis = !!document.getElementById("bkr-zuwenig");
    out.knopf = document.getElementById("bkr-speichern").textContent; out.n = namen.length; out.n0 = namen[0]; out.n1 = namen[1];
    document.getElementById("bkr-speichern").click(); await w(900);
    out.rest = Object.keys((JSON.parse(localStorage.getItem("adler_bew_runde_entwurf") || "{}").werte) || {});
    document.getElementById("bkr-modal")?.remove();
    // a) Kaderliste mit den Zeilen, die die App selbst baut
    DB = {}; namen.slice(2, 6).forEach((n, i) => { const k = getKader(n), v = {}; kr.forEach((c, j) => { if (!c.tw || k.tw) v[c.n] = i === 0 ? (c.n.startsWith("f_ball") || c.n === "f_pass" || c.n === "f_abschluss" ? 4 : 2) : 1 + ((i + j) % 4); });
      DB[n] = [bewZeileBauen({ name: n, trainer: "Trainerteam", date: bewHeute(), foot: "R", age: "8", grp: "flex", eltern: "", att: "2", notes: "", tw: !!k.tw }, v).row]; });
    go("kader"); await w(500);
    const t = document.querySelector("#view-kader .kader-t");
    out.kader = t ? { kopf: [...t.querySelectorAll("th")].map(x => x.textContent.trim()), prozent: /%/.test(t.innerText), text: t.innerText.replace(/\s+/g, " ").slice(0, 200),
      staerke: [...t.querySelectorAll(".kader-staerke")].map(x => x.textContent.trim()), sichtbar: [...t.querySelectorAll("tbody tr")][0] ? [...[...t.querySelectorAll("tbody tr")].find(z => z.querySelector(".kader-staerke")).children].map(td => td.offsetParent ? 1 : 0).join("") : "",
      breit: t.scrollWidth > document.documentElement.clientWidth } : null;
    // c) Kind für Kind
    go("bew"); await w(150);
    const sel = document.getElementById("p-name"); sel.value = namen[7]; onPlayerSelect(); await w(400);
    document.querySelectorAll('#dims-wrap input[type="radio"][value="0"]').forEach(x => { x.checked = true; }); onChange();
    window._v851vor = true; await savePlayer(); await w(300);
    out.einzel = (document.getElementById("save-status") || {}).textContent || "";
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const post = s.gesendet.filter(g => /spielerprofile/.test(g.pfad || ""));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["bewGesehen/bewStaerkeWort fehlen (Stand vor v851)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  const k = r.kader;
  if (!k) probleme.push("a) Kaderliste fehlt");
  else if (k.prozent || k.kopf.some(x => /Ges\.|Pot\./.test(x)) || !k.kopf.includes("Stärke")) probleme.push(`a) Kaderliste zeigt Prozent oder alte Spalten: ${k.kopf.join("|")} · ${k.text}`);
  else if (k.staerke[0] !== "Technik" || k.staerke.some(x => !x || /\d/.test(x))) probleme.push("a) Stärke in Worten: " + JSON.stringify(k.staerke));
  else if (k.sichtbar !== "11101" || k.breit) probleme.push(`a) am Handy sichtbar ${k.sichtbar} (erwartet Spieler, Rolle, Stärke, Knöpfe), breiter als der Bildschirm: ${k.breit}`);
  else zeilen.push(`a) Kaderliste: ${k.kopf.filter(Boolean).join(" · ")} – Stärken ${k.staerke.join(", ")}, kein Prozentzeichen`);
  const body = post[0] && Array.isArray(post[0].body) ? post[0].body : null;
  if (!body) probleme.push("b) kein Schreibvorgang der Runde gesehen");
  else {
    const namen = body.map(z => z.name);
    if (namen.includes(r.n0) || namen.includes(r.n1) || body.length !== r.n - 2) probleme.push(`b) gespeichert ${body.length} von ${r.n}; Kind ohne Beobachtung dabei: ${namen.includes(r.n0)}, Kind mit 7 von 16: ${namen.includes(r.n1)}`);
    else if (!/nur 0 von 16 gesehen/.test(r.stand) || !/nur 7 von 16 gesehen/.test(r.stand) || !r.hinweis || r.rest.slice().sort().join() !== [r.n0, r.n1].sort().join()) probleme.push(`b) Abschluss/Merken: ${r.stand.slice(0, 160)} · Hinweis ${r.hinweis} · gemerkt ${JSON.stringify(r.rest)}`);
    else zeilen.push(`b) ${body.length} von ${r.n} gespeichert; 0 und 7 von 16 gesehen bleiben gemerkt und stehen im Abschluss`);
  }
  if (post.length !== 1 || !/Nur 0 von 16 Kriterien gesehen/.test(r.einzel)) probleme.push(`c) Kind für Kind: ${post.length} Schreibvorgänge, Meldung „${r.einzel}“`);
  else zeilen.push("c) Kind für Kind: Meldung statt Speichern");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
