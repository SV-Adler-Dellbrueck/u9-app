/* v830 · Weihnachtsfeier ganz oben, und alle Termine eines Tages in der Kachel (Charles 10.11.2026).
   1) „Die Weihnachtsfeier sollte direkt ganz oben angezeigt werden, solange noch nicht zu- oder abgesagt wurde,
      und bei Zusage, wenn nichts in der Mitbringliste eingetragen wurde.“
      a) keine Antwort → Karte „Antwort fehlt“, ganz oben vor der Terminkarte, Hauptknopf 56 px
      b) zugesagt, nichts eingetragen → Karte „Beitragsliste“
      c) zugesagt und eingetragen → keine Karte
      d) abgesagt → keine Karte; e) Termin fällt aus → keine Karte
      f) Antwortstand nicht ladbar → keine Karte (lieber keine als eine falsche)
   2) „In der Kachel-Anzeige steht nur das Kinder-Eltern-Turnier am 07.12., nicht die Weihnachtsfeier.“
      Zwei Termine am Tag: die Kachel zeigt beide Symbole (🎄 und ⚽) mit je einem Antwortzeichen, trägt sie im
      Namen für Screenreader, und der Tipp öffnet eine Auswahl mit beiden Terminen (Zeilen ≥ 48 px). */
"use strict";
module.exports = async function (h) {
  const titel = "v830 Weihnachtsfeier ganz oben solange Antwort oder Beitragsliste fehlt; Kachel zeigt alle Termine des Tages";
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(9);
  const feier = { id: 112, datum, uhrzeit: "18:15", uhrzeit_ende: "20:00", typ: "event", titel: "Weihnachtsfeier", ort: "Vereinsheim", mitbringen: false, eltern_turnier: false, trainer_status: {}, platz_status: null };
  const turnier = { id: 142, datum, uhrzeit: "17:00", uhrzeit_ende: "18:00", typ: "event", titel: "Kinder-Eltern-Turnier", ort: "Halle", mitbringen: false, eltern_turnier: true, trainer_status: {}, platz_status: null };
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const st = { rsvp: [], eintraege: [], fehler: false, fiele: false };
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
      termine: (u) => /titel=eq\./.test(u.search) ? [{ ...feier, platz_status: st.fiele ? "abgesagt" : null }] : [turnier, feier],
      rueckmeldungen: (u) => (/termin_id=eq\.112/.test(u.search) && st.fehler) ? { status: 500, body: "{}" } : (/termin_id=eq\.112/.test(u.search) ? st.rsvp : []),
      feier_eintraege: () => st.eintraege, eltern_angaben: [{ vorname: "Erwachsener", nachname: "Beispiel" }] }) });
  const ZUSTAND = {
    a: { rsvp: [], eintraege: [], fehler: false, fiele: false },
    b: { rsvp: [{ spieler_id: 1, status: "zugesagt" }], eintraege: [], fehler: false, fiele: false },
    c: { rsvp: [{ spieler_id: 1, status: "zugesagt" }], eintraege: [{ id: 1 }], fehler: false, fiele: false },
    d: { rsvp: [{ spieler_id: 1, status: "abgesagt" }], eintraege: [], fehler: false, fiele: false },
    e: { rsvp: [], eintraege: [], fehler: false, fiele: true },
    f: { rsvp: [], eintraege: [], fehler: true, fiele: false } };
  await e.page.exposeFunction("__setze", name => { Object.assign(st, ZUSTAND[name]); });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" }); await e.page.waitForTimeout(4000);

  const r = await e.page.evaluate(async ([datum, st0, feier, turnier]) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    if (typeof feierObenLoad !== "function") return { alt: true };
    FEIER_KONFIG[0].datum = datum;   // die Konfiguration kennt das feste Datum; der Test legt es in die Zukunft
    const slot = () => document.getElementById("feier-slot");
    const karte = () => slot() && slot().querySelector(".feier-karte");
    const out = {};
    // Reihenfolge im Dashboard
    const root = slot() && slot().parentElement;
    const kinder = root ? [...root.children] : [];
    const posKarte = kinder.findIndex(c => /Nächster Termin/i.test(c.innerText || ""));
    out.vorTerminkarte = kinder.indexOf(slot()) >= 0 && posKarte > kinder.indexOf(slot());
    out.erstesKind = kinder.indexOf(slot()) <= 1;
    const zustand = async (name, kidsStatus) => {
      await window.__setze(name, kidsStatus); await feierObenLoad(window._elternKids); await w(400);
      return karte() ? { text: karte().innerText.replace(/\s+/g, " "), hoeheKnopf: Math.round(karte().querySelector("button").getBoundingClientRect().height) } : null;
    };
    out.a = await zustand("a"); out.b = await zustand("b"); out.c = await zustand("c"); out.d = await zustand("d"); out.e = await zustand("e"); out.f = await zustand("f");
    // Kachel: Zellen für den Tag mit zwei Terminen
    const d = new Date(datum + "T00:00:00");
    const html = _elWocheZelle(d, [feier, turnier], window._elternKids || [], {});
    const box = document.createElement("div"); box.style.cssText = "display:flex;width:60px"; box.innerHTML = html; document.body.appendChild(box);
    out.kachelText = box.innerText.replace(/\s+/g, " ");
    out.kachelAria = (box.querySelector("button") || {}).getAttribute ? box.querySelector("button").getAttribute("aria-label") : "";
    box.querySelector("button").click(); await w(300);
    const dlg = document.getElementById("tag-wahl");
    out.wahl = dlg ? [...dlg.querySelectorAll("button")].map(b => ({ t: b.innerText.replace(/\s+/g, " ").trim().slice(0, 60), h: Math.round(b.getBoundingClientRect().height) })) : null;
    box.remove(); dlg && dlg.remove();
    // ein Termin am Tag: Tipp öffnet direkt
    const eins = document.createElement("div"); eins.innerHTML = _elWocheZelle(d, [feier], window._elternKids || [], {}); out.einzelnOnclick = eins.querySelector("button").getAttribute("onclick");
    return out;
  }, [datum, null, feier, turnier]).catch(err => ({ fehler: String(err) }));
  const f = e.fehler(); await e.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["keine Karte „Weihnachtsfeier“ (Stand vor v830)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Fehler im Ablauf: " + r.fehler]);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (!r.vorTerminkarte) probleme.push("1) die Karte steht nicht vor der Terminkarte");
  if (!r.erstesKind) probleme.push("1) die Karte steht nicht ganz oben");
  if (!r.a || !/Antwort fehlt/i.test(r.a.text) || !/Weihnachtsfeier/.test(r.a.text) || !/Jetzt antworten/i.test(r.a.text)) probleme.push("a) keine Antwort: " + JSON.stringify(r.a));
  if (r.a && r.a.hoeheKnopf !== 56) probleme.push("a) Hauptknopf " + r.a.hoeheKnopf + " px statt 56");
  if (!r.b || !/Beitragsliste/i.test(r.b.text) || !/Beitragsliste öffnen/i.test(r.b.text)) probleme.push("b) zugesagt ohne Eintrag: " + JSON.stringify(r.b));
  if (r.c) probleme.push("c) Karte trotz Eintrag: " + r.c.text);
  if (r.d) probleme.push("d) Karte trotz Absage: " + r.d.text);
  if (r.e) probleme.push("e) Karte, obwohl der Termin ausfällt: " + r.e.text);
  if (r.f) probleme.push("f) Karte ohne Antwortstand: " + r.f.text);
  if (!/🎄/.test(r.kachelText) || !/⚽/.test(r.kachelText)) probleme.push("2) Kachel zeigt nicht beide Symbole: " + r.kachelText);
  if (!/2 Termine/.test(r.kachelAria || "") || !/Weihnachtsfeier/.test(r.kachelAria || "") || !/Kinder-Eltern-Turnier/.test(r.kachelAria || "")) probleme.push("2) Kachel nennt nicht beide Termine im Namen: " + r.kachelAria);
  if (!r.wahl || r.wahl.filter(x => /Weihnachtsfeier|Kinder-Eltern-Turnier/.test(x.t)).length !== 2) probleme.push("2) Auswahl zeigt nicht beide Termine: " + JSON.stringify(r.wahl));
  if (r.wahl && r.wahl.some(x => x.h < 48)) probleme.push("2) Zeilen der Auswahl unter 48 px: " + r.wahl.map(x => x.h).join("/"));
  if (r.wahl && r.wahl.length >= 2 && !(r.wahl[0].t.indexOf("Turnier") >= 0)) probleme.push("2) Reihenfolge nach Uhrzeit: " + r.wahl[0].t);
  if (!/terminDetailOpen\(112\)/.test(r.einzelnOnclick || "")) probleme.push("2) ein Termin am Tag öffnet nicht direkt: " + r.einzelnOnclick);
  zeilen.push("Karte: Antwort fehlt / Beitragsliste / weg bei Eintrag, Absage, Ausfall, fehlendem Stand · Kachel zeigt 🎄 und ⚽, Auswahl mit beiden");
  return h.ergebnis(titel, !probleme.length, probleme.concat(zeilen));
};
