/* v850 · Spielerbewertung vor der ersten Runde (Charles 17.11.2026).
   a) „Bewertungsrunde starten“ öffnet die Runde Kriterium für Kriterium: ein Kriterium, alle Kinder,
      je Kind fünf Knöpfe (Ansatz, Solide, Gut, Stark, Nicht gesehen) mit mindestens 44 px, nichts läuft über.
   b) Jeder Tipp ist am Gerät gemerkt: „Später weiter“ und erneutes Öffnen zeigen denselben Stand.
   c) Torwart-Kriterien zeigen nur die Torhüter.
   d) „Fürs Elterngespräch“: Haken und Satz landen als JSON in `eltern`; nichts davon steht im Fazit.
   e) Speichern: ein Aufruf mit allen vollständigen Kindern, „Trainerteam“, Werte 0–4; ein unvollständiges
      Kind wird nicht gespeichert und bleibt gemerkt.
   f) Kind für Kind: kein „Umfeld / Eltern“, keine „Trainingsbeteiligung“, keine „% Gewichtung“;
      Alter und starker Fuß kommen aus dem Kader. */
"use strict";
module.exports = async function (h) {
  const titel = "v850 Bewertungsrunde: Kriterium für Kriterium, gemerkt am Gerät, „Fürs Elterngespräch“ statt Umfeld-Etikett";
  const probleme = [], zeilen = [];
  const berlin = n => { const [y, m, d] = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const kader = h.kaderZeilen(); kader[0].starker_fuss = "L"; kader[0].geb = (new Date().getFullYear() - 9) + "-01-02";
  const s = await h.starten({ warten: 2200, breite: 390, hoehe: 844, supabase: h.supabaseAttrappe({ kader, spielerprofile: [],
    team_einstellungen: [{ id: 1, bewertung_ab: berlin(-1) }], profiles: [{ name: "Charles", rolle: "trainer" }], anwesenheit: [], termine: [] }) });
  const p = s.page;
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    document.getElementById("pin-gate")?.remove(); const m = document.getElementById("main-app"); if (m) m.style.display = "block";
    window.trainerMe = async () => "Charles";
    if (typeof bkrOeffnen !== "function") return { alt: true };
    try { await loadKader(); } catch (e) {}
    await bewAbLaden(); go("bew"); bewSperreAnwenden(); await w(300);
    try { localStorage.removeItem("adler_bew_runde_entwurf"); } catch (e) {}
    const start = document.getElementById("bew-runde-kk"); if (!start) return { fehler: "Startknopf fehlt" };
    out.startH = Math.round(start.getBoundingClientRect().height); start.click(); await w(200);
    const modal = document.getElementById("bkr-modal"); if (!modal) return { fehler: "Runde öffnet nicht" };
    out.dialog = modal.getAttribute("role") === "dialog" && modal.getAttribute("aria-modal") === "true";
    const zl = () => [...document.querySelectorAll(".bkr-zeile")];
    out.kinder = zl().length; out.kaderN = bkrKinder().length; out.twN = bkrKinder(true).length;
    const kn = [...zl()[0].querySelectorAll("button")];
    out.knoepfe = kn.map(b => b.textContent.trim()); out.knopfH = Math.min(...kn.map(b => Math.round(b.getBoundingClientRect().height)));
    out.ueber = [...document.querySelectorAll(".bkr-zeile button")].filter(b => b.scrollWidth > b.clientWidth + 1).length;
    zl()[0].querySelector('button[data-wert="3"]').click(); zl()[1].querySelector('button[data-wert="0"]').click(); await w(50);
    out.gedrueckt = zl()[0].querySelector('button[data-wert="3"]').getAttribute("aria-pressed") + "/" + zl()[0].querySelector('button[data-wert="3"]').textContent.trim();
    out.weiter = document.getElementById("bkr-weiter").textContent;
    // b) später weiter
    document.getElementById("bkr-spaeter").click(); await w(100);
    out.zu = !document.getElementById("bkr-modal"); out.startText = document.getElementById("bew-runde-kk").textContent.trim();
    document.getElementById("bew-runde-kk").click(); await w(150);
    out.wieder = zl()[0].querySelector('button[data-wert="3"]').getAttribute("aria-pressed") + "/" + zl()[1].querySelector('button[data-wert="0"]').getAttribute("aria-pressed");
    // c) Torwart-Kriterium
    const sch = bkrSchritte(); BKR.idx = sch.findIndex(x => x.art === "kriterium" && x.k.tw); bkrRender(); await w(50);
    out.twZeilen = zl().length; out.twHinweis = /Nur die Torhüter/.test(document.getElementById("bkr-inhalt").textContent);
    // alles füllen bis auf ein Kind
    const kr = bkrKriterien(), namen = bkrKinder();
    namen.forEach((n, i) => { const tw = getKader(n).tw; BKR.werte[n] = {}; kr.forEach((k, j) => { if (!k.tw || tw) BKR.werte[n][k.n] = (i + j) % 5; }); });
    delete BKR.werte[namen[3]].f_pass;
    // d) Eltern
    BKR.idx = sch.length - 2; bkrRender(); await w(50);
    const e1 = document.querySelectorAll(".bkr-eltern")[1]; e1.open = true;
    const cb = e1.querySelector('input[data-haken="seitenlinie"]'); cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true }));
    const ta = e1.querySelector("textarea"); ta.value = "Ruhiger am Rand – besprechen."; ta.dispatchEvent(new Event("input", { bubbles: true }));
    out.hakenH = Math.round(cb.closest("label").getBoundingClientRect().height); out.marke = e1.querySelector(".bkr-eltern-marke").textContent;
    document.getElementById("bkr-weiter").click(); await w(80);
    out.speicherText = document.getElementById("bkr-speichern").textContent; out.stand = document.getElementById("bkr-stand").textContent.replace(/\s+/g, " ");
    out.name3 = namen[3]; out.name1 = namen[1];
    document.getElementById("bkr-speichern").click(); await w(900);
    out.nachModal = !!document.getElementById("bkr-modal");
    out.rest = Object.keys((JSON.parse(localStorage.getItem("adler_bew_runde_entwurf") || "{}").werte) || {});
    // f) Kind für Kind
    document.getElementById("bkr-modal")?.remove();
    const sel = document.getElementById("p-name"); sel.value = namen[0]; onPlayerSelect(); await w(400);
    const v = document.getElementById("view-bew");
    out.form = { umfeld: /Umfeld \/ Eltern|Erhöhter Druck|Top-Partner/.test(v.textContent), beteiligung: /Trainingsbeteiligung/.test(v.textContent), gewichtung: /Gewichtung/.test(v.textContent),
      alter: document.getElementById("p-age").value, fuss: document.getElementById("p-foot").value, trainer: document.getElementById("p-trainer").value,
      elternFeld: !!document.getElementById("be-satz") && document.querySelectorAll("#be-haken input").length };
    return out;
  }).catch(e => ({ fehler: String(e) }));
  const post = s.gesendet.filter(g => /spielerprofile/.test(g.pfad || ""));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["bkrOeffnen fehlt (Stand vor v850)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  if (!r.dialog || r.kinder !== r.kaderN || r.knoepfe.join("|") !== "Ansatz|Solide|Gut|Stark|Nicht gesehen" || r.knopfH < 44 || r.ueber || r.startH < 48)
    probleme.push("a) " + JSON.stringify({ dialog: r.dialog, kinder: r.kinder, kader: r.kaderN, knoepfe: r.knoepfe, h: r.knopfH, ueber: r.ueber, start: r.startH }));
  else if (!/^true\/✓ Gut$/.test(r.gedrueckt) || !/offen/.test(r.weiter)) probleme.push(`a) Auswahl: ${r.gedrueckt} · ${r.weiter}`);
  else zeilen.push(`a) ${r.kinder} Kinder je Kriterium, Knöpfe ${r.knopfH} px, „${r.weiter}“`);
  if (!r.zu || !/fortsetzen/.test(r.startText) || r.wieder !== "true/true") probleme.push(`b) Zwischenstand: zu=${r.zu}, Knopf „${r.startText}“, wieder ${r.wieder}`);
  else zeilen.push("b) „Später weiter“ → „Runde fortsetzen“, Werte stehen wieder da");
  if (r.twZeilen !== r.twN || !r.twHinweis || !r.twN) probleme.push(`c) Torwart-Kriterium: ${r.twZeilen} Zeilen bei ${r.twN} Torhütern`);
  else zeilen.push(`c) Torwart-Kriterien nur für ${r.twN} Torhüter`);
  const body = (() => { try { return post[post.length - 1].body; } catch (e) { return null; } })();
  if (post.length !== 1 || !Array.isArray(body)) probleme.push(`e) erwartet genau einen Schreibvorgang mit einer Liste, gesehen ${post.length} (${post[0] ? Object.keys(post[0]).join(",") : "–"})`);
  else {
    const z1 = body.find(z => z.name === r.name1), namen = body.map(z => z.name);
    if (body.length !== r.kaderN - 1 || namen.includes(r.name3)) probleme.push(`e) gespeichert ${body.length} von ${r.kaderN}, unvollständiges Kind dabei: ${namen.includes(r.name3)}`);
    else if (body.some(z => z.trainer !== "Trainerteam" || !z.datum || !z.fazit || !z.radios)) probleme.push("e) Zeile ohne Trainerteam, Datum, Fazit oder Werte");
    else if (!r.nachModal || r.rest.join() !== r.name3) probleme.push(`e) nach dem Speichern: Fenster ${r.nachModal}, gemerkt ${JSON.stringify(r.rest)}`);
    else zeilen.push(`e) ein Aufruf mit ${body.length} Kindern als „Trainerteam“; das unvollständige Kind bleibt gemerkt`);
    let el = null; try { el = JSON.parse(z1.eltern); } catch (e) {}
    if (!el || el.satz !== "Ruhiger am Rand – besprechen." || el.haken.join() !== "seitenlinie" || r.marke !== "notiert" || r.hakenH < 44) probleme.push("d) Eltern-Feld: " + JSON.stringify(z1 && z1.eltern) + ` · Haken ${r.hakenH} px`);
    else if (/Ruhiger am Rand|Seitenlinie|ELTERN-HINWEIS/.test(z1.fazit) || body.some(z => z.name !== r.name1 && z.eltern)) probleme.push("d) Eltern-Beobachtung steht im Fazit oder bei einem anderen Kind");
    else zeilen.push("d) Haken und Satz als JSON in `eltern`, nichts davon im Fazit");
  }
  const f = r.form;
  if (f.umfeld || f.beteiligung || f.gewichtung || f.alter !== "9" || f.fuss !== "L" || f.trainer !== "Trainerteam" || f.elternFeld !== 3) probleme.push("f) Kind für Kind: " + JSON.stringify(f));
  else zeilen.push("f) Kind für Kind: ohne Umfeld-Etikett, Beteiligung und Gewichtung; Alter 9 und Linksfuß aus dem Kader");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
