/* v735 · Nachtrag 04.10. zum Kassenpaket: Spenden-Karte im Adler Nest
   (doku/auftrag-kasse-umlage/nachtrag-2026-10-04-nest-spendenlink.md, Abnahmekriterien 1–3; 4 prüft
   v735-kasse-umlage a, 5 ist unverändert – adlerkasseCardHtml bleibt unberührt)
   a) Eltern, Link gesetzt: Karte „Die Mannschaftskasse unterstützen“ direkt vor „Auf geht's, Adler!“, Knopf öffnet den
      Link in neuem Tab (noopener), ≥ 48 px, Kontrast ≥ 4,5:1, kein seitliches Scrollen bei 360 px
   b) Archiv: eine frühere Ausgabe zeigt die Karte ebenfalls
   c) Kinder-Sicht (Kabine, nestOpen(…, {kind:true})): keine Karte, auch nicht beim Blättern im Archiv; die Kabine
      ruft das Nest mit {kind:true} auf
   d) ohne Link und mit „javascript:…“: keine Karte, kein Leerraum
   e) Link mit Betrag bleibt unverändert im Knopf
   f) Druck: die Karte erscheint nicht */
"use strict";
const fs = require("fs"), path = require("path");
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  let link = "https://paypal.me/Adler";
  const liste = [{ id: 12, nummer: 2, datum: h.tagePlus(-1), typ: "spiel", titel: "Spiel", gegner: "Testgegner", heim: true },
                 { id: 11, nummer: 1, datum: h.tagePlus(-8), typ: "spiel", titel: "Spiel", gegner: "Testgegner", heim: true }];
  const lesen = id => ({ ausgabe: { id, nummer: id - 10, schlagzeile: "Testschlagzeile", anpfiff: "Hallo Adler-Familie!", kommentar: "Danke an alle.", status: "veroeffentlicht", foto_ids: [] },
    termin: { id: 80 + id, datum: liste[0].datum, typ: "spiel", titel: "Spiel", gegner: "Testgegner", heim: true, ergebnis: null }, teams: [], ergebnisse: [], portraet: null, naechster: null });
  const arg = req => { try { return JSON.parse(req.postData() || "{}").p_ausgabe; } catch (e) { return null; } };
  const sb = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false,
      heft_ausgaben_liste: liste, heft_ausgabe_lesen: (u, req) => lesen(arg(req)), heft_medien: [], adlerkasse_link: () => link } });
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 360, hoehe: 800, supabase: sb });
  await s.page.evaluate(tk => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: tk, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(2500);
  const lage = (aufruf) => s.page.evaluate(async (aufruf) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof nestOpen !== "function"; i++) await w(100);
    await eval(aufruf); for (let i = 0; i < 30 && !document.querySelector(".nest-ende"); i++) await w(100); await w(700);
    const slot = document.getElementById("nest-kasse-slot"), a = slot && slot.querySelector("a");
    const lum = c => { const v = (c.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    let kontrast = null;
    if (a) { const cs = getComputedStyle(a), l1 = lum(cs.color), l2 = lum(cs.backgroundColor); kontrast = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); }
    const m = document.getElementById("nest-modal");
    return { da: !!a, text: slot ? slot.textContent.replace(/\s+/g, " ").trim() : null, hoehe: slot ? slot.offsetHeight : -1,
      href: a && a.getAttribute("href"), target: a && a.target, rel: a && a.rel, knopfH: a ? Math.round(a.getBoundingClientRect().height) : 0, kontrast,
      vorEnde: !!(slot && slot.nextElementSibling && slot.nextElementSibling.classList.contains("nest-ende")),
      quer: m ? m.scrollWidth > m.clientWidth + 1 : null, kind: !!(window._nestOpts || {}).kind };
  }, aufruf);

  const a = await lage("nestOpen()");
  if (!a.da || !/Die Mannschaftskasse unterstützen/.test(a.text) || !/Freiwillig, ohne Erwartung\./.test(a.text) || !/Die App fasst kein Geld an\./.test(a.text)) probleme.push(`a) Karte fehlt oder Text falsch: ${JSON.stringify(a)}`);
  if (/Jungs/.test(a.text || "")) probleme.push("a) „Jungs“ im Text");
  if (!a.vorEnde) probleme.push("a) Karte steht nicht direkt vor „Auf geht's, Adler!“");
  if (a.href !== link || a.target !== "_blank" || !/noopener/.test(a.rel || "") || !/noreferrer/.test(a.rel || "")) probleme.push(`a) Knopf: ${a.href} ${a.target} ${a.rel}`);
  if (a.knopfH < 48 || !(a.kontrast >= 4.5) || a.quer) probleme.push(`a) Knopf ${a.knopfH} px, Kontrast ${a.kontrast && a.kontrast.toFixed(1)}, quer ${a.quer}`);
  zeilen.push(`a) Eltern: Karte vor „Auf geht's, Adler!“ · Knopf ${a.knopfH} px · Kontrast ${a.kontrast && a.kontrast.toFixed(1)}:1 · neuer Tab · 360 px ohne Querscrollen`);
  const b = await lage("nestOpen(11,window._nestOpts)");
  if (!b.da) probleme.push("b) frühere Ausgabe ohne Karte");
  const c1 = await lage("nestOpen(null,{kind:true})");
  const c2 = await lage("nestOpen(11,window._nestOpts)");
  if (c1.da || c2.da || !c2.kind) probleme.push(`c) Kinder-Sicht zeigt die Karte (Start ${c1.da}, Archiv ${c2.da})`);
  const kab = fs.readFileSync(path.join(h.REPO, "md-kabine.js"), "utf8");
  if (!/nestOpen\(null,\{kind:true\}\)/.test(kab) || /nestOpen\(\)/.test(kab)) probleme.push("c) die Kabine ruft das Nest nicht mit {kind:true} auf");
  zeilen.push(`b) Archiv mit Karte · c) Kabine: keine Karte, auch im Archiv`);
  link = null; const d1 = await lage("nestOpen()");
  link = "javascript:alert(1)"; const d2 = await lage("nestOpen()");
  if (d1.da || d1.hoehe !== 0 || d2.da || d2.hoehe !== 0) probleme.push(`d) ohne/mit falschem Link: ${JSON.stringify([d1.da, d1.hoehe, d2.da, d2.hoehe])}`);
  link = "https://paypal.me/Adler/40"; const e = await lage("nestOpen()");
  if (!e.da || e.href !== "https://paypal.me/Adler/40") probleme.push(`e) Link mit Betrag: ${e.href}`);
  await s.page.emulateMedia({ media: "print" });
  const f = await s.page.evaluate(() => { const x = document.getElementById("nest-kasse-slot"); return x ? getComputedStyle(x).display : "fehlt"; });
  await s.page.emulateMedia({ media: "screen" });
  if (f !== "none") probleme.push(`f) im Druck sichtbar (${f})`);
  zeilen.push(`d) ohne Link und bei „javascript:“ keine Karte, Höhe 0 · e) Betrag bleibt im Link · f) Druck ohne Karte`);
  const fe = s.fehler(); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  await s.schliessen();
  return h.ergebnis("v735 Adler Nest: Spenden-Karte für Eltern, nie in der Kinder-Sicht", !probleme.length, zeilen.concat(probleme));
};
