/* v965 · Charles 24.11.: „Können wir die Kabine neu sortieren und aufräumen? … am Ende zu viel.“ Freigegeben (Bild):
   a) Startseite: Team-Level als schmale Zeile, Akademie, darunter drei Türen „Ich“, „Unser Team“, „Selber machen“;
      kein „Mehr entdecken“ mehr; Türen ≥ 44 px, nichts ragt über den Rand (390 px).
   b) Hinter den Türen alle Funktionen, je Tür höchstens sechs; der Schlachtruf steht bei „Unser Team“.
   c) Zurück: aus einer Funktion in ihre Tür, aus der Tür auf die Startseite; frisch geöffnet immer die Startseite.
   d) Hinweise für heute: höchstens zwei offen, der Rest hinter „+ n weitere…“, ein Tipp zeigt alle. */
"use strict";
module.exports = async function (h) {
  const titel = "v965 Kabine aufgeräumt: drei Türen, Funktionen dahinter, höchstens zwei Hinweise";
  const probleme = [], zeilen = [];
  const KIND = { ok: true, spieler_id: 1, name: "Kind A", nr: 1, tw: false, geraet: "Tablet", limit_min: 60, rest_min: 60 };
  const s = await h.starten({ start: "/kinder/index.html", warten: 500, angemeldet: false, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], team_config: [{ id: 1, schlachtruf: "Adler flieg!" }], abzeichen_meldung: [],
      rpc: { kind_status: KIND, kader_namen: [], team_gallery_kind: [], team_federn_total: 1240, team_meilensteine: [], meine_rollen: { games: 0 }, meine_ziele: [], xp_events_for: [] } }) });
  await s.page.evaluate(() => { localStorage.setItem("adler_sb_auth_kind", JSON.stringify({ access_token: "kind.x.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); localStorage.setItem("adler_kinder_tour", "1"); });
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(1800);
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    if (typeof kabineTuer !== "function") return { alt: true };
    const tueren = ["ich", "team", "machen"].map(t => document.getElementById("kab-tuer-" + t));
    out.a = { tueren: tueren.filter(Boolean).length, mehr: !!document.getElementById("kab-mehr"),
      hoehen: tueren.map(t => t ? Math.round(t.getBoundingClientRect().height) : 0), level: Math.round(document.getElementById("kab-level").getBoundingClientRect().height),
      ueber: document.documentElement.scrollWidth - window.innerWidth,
      akVor: !!(document.getElementById("kab-akademie").compareDocumentPosition(document.getElementById("kab-tueren")) & Node.DOCUMENT_POSITION_FOLLOWING) };
    out.b = {}; const alle = [];
    for (const t of ["ich", "team", "machen"]) {
      kabineTuer(t); await w(300);
      const k = [...document.querySelectorAll("#kab-tuer-seite button[onclick]")].map(b => b.getAttribute("onclick")).filter(x => !/kabineHome/.test(x));
      out.b[t] = k.length; alle.push(...k);
      if (t === "team") out.b.ruf = /Adler flieg/.test((document.getElementById("kab-arena") || {}).textContent || "");
    }
    out.b.alle = alle;
    // c) Rückweg
    kabineTuer("ich"); await w(100); kabineStaerken(); await w(300);
    out.c = { inFunktion: !document.getElementById("kab-tuer-seite") };
    kabineHome(); await w(200);
    out.c.zurTuer = (document.querySelector("#kab-tuer-seite h2") || {}).textContent || "";
    document.querySelector('#kab-tuer-seite button[onclick="kabineHome(true)"]').click(); await w(200);
    out.c.start = !!document.getElementById("kab-tueren");
    kabineTuer("team"); await w(100); window._kabTuer = "team"; kabineHome(true); await w(100);
    out.c.frisch = !!document.getElementById("kab-tueren");
    // d) Hinweise
    ["kab-countdown", "kab-post", "kab-wahl"].forEach((id, i) => { document.getElementById(id).innerHTML = `<div style="height:60px">Hinweis ${i + 1}</div>`; });
    await w(300);
    const sichtbar = () => ["kab-lob", "kab-countdown", "kab-nest-hinweis", "kab-reveal", "kab-pack", "kab-post", "kab-wahl", "kab-milestone"].filter(id => { const e = document.getElementById(id); return e && e.innerHTML.trim() && !e.hidden; }).length;
    const m = document.getElementById("kab-heute-mehr");
    out.d = { offen: sichtbar(), knopf: m ? m.textContent : "", knopfH: m ? Math.round(m.getBoundingClientRect().height) : 0 };
    m && m.click(); await w(200);
    out.d.nachTipp = sichtbar(); out.d.knopfWeg = !document.getElementById("kab-heute-mehr");
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const fe = s.fehler(); await s.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["keine Türen (Stand vor v965)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Ablauf: " + r.fehler]);
  const a = r.a, b = r.b, c = r.c, d = r.d;
  if (a.tueren !== 3 || a.mehr || a.hoehen.some(x => x < 44) || a.level > 60 || a.ueber > 0 || !a.akVor) probleme.push("a) " + JSON.stringify(a));
  if (b.ich > 6 || b.team > 6 || b.machen > 6 || !b.ruf) probleme.push("b) " + JSON.stringify(b));
  for (const fn of ["kabineMyCard()", "kabineLobWahl()", "kabineStaerken()", "kabineRollen()", "kabineMission()", "kabineAlbum()", "kabineCodex()", "kabineShowQuests()", "kabineKudos()", "kabineShowGallery()", "kabineHype()", "kabineBrett()", "kabineReporter()"])
    if (!b.alle.includes(fn)) probleme.push("b) fehlt hinter den Türen: " + fn);
  if (!b.alle.some(x => /nestOpen/.test(x)) || !b.alle.some(x => /kabineMeinTraining/.test(x))) probleme.push("b) Adler Nest oder Mein Training fehlt");
  if (!c.inFunktion || !/Ich/.test(c.zurTuer) || !c.start || !c.frisch) probleme.push("c) Rückweg " + JSON.stringify(c));
  if (d.offen !== 2 || !/\+ 1 weiterer Hinweis/.test(d.knopf) || d.knopfH < 44 || d.nachTipp !== 3 || !d.knopfWeg) probleme.push("d) " + JSON.stringify(d));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`a) 3 Türen (${a.hoehen.join("/")} px), Level ${a.level} px, Akademie davor, kein „Mehr entdecken“ · b) Kacheln ${b.ich}/${b.team}/${b.machen}, Schlachtruf bei „Unser Team“`);
  zeilen.push(`c) Funktion → Tür „${c.zurTuer.trim()}“ → Startseite · d) ${d.offen} Hinweise offen, „${d.knopf}“ → ${d.nachTipp}`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
