/* v945 · Charles 22.11.: „Wenn etwas in die Fundbörse eingestellt wird, sollte auch da oben bei den Eltern eine Nachricht
   kommen, was eingestellt wurde und der Hinweis darauf. Und dann wird es auch wieder gelöscht. Beziehungsweise es kann
   wegge-X'd werden.“ – Fundbüro und Adler-Börse.
   a) Neues offenes Fundstück → Karte in „📌 Für euch“ mit Name („und 1 weiteres“), „Ansehen ›“ öffnet das Fundbüro.
   b) Neues freies Börse-Angebot einer anderen Familie → eigene Karte; eigenes, reserviertes Angebot zählt nicht.
   c) Geklärtes oder älter als 21 Tage → keine Karte.
   d) „✕“ (≥ 44 px) blendet aus und bleibt weg; kommt danach etwas Neueres, ist die Karte wieder da.
   e) Ist das Stück gelöscht (nicht mehr im Board), verschwindet die Karte. */
"use strict";
module.exports = async function (h) {
  const titel = "v945 Fundbüro und Börse: Neues als Karte in „Für euch“, mit ✕ und von selbst weg, wenn erledigt";
  const probleme = [], zeilen = [];
  const T = (id, tp) => ({ id, datum: h.tagePlus(tp), typ: "training", titel: "Training", gegner: "Training", uhrzeit: "16:45:00", uhrzeit_ende: null, heim: true, ort: "Thurner Kamp 97, 51069 Köln", trainer_status: {} });
  const heute = h.tagePlus(0), alt = h.tagePlus(-30);
  const zustand = {
    fund: [{ id: 7, titel: "Blaue Trinkflasche", status: "offen", gefunden_am: heute }, { id: 6, titel: "Schienbeinschoner links", status: "offen", gefunden_am: h.tagePlus(-2) },
      { id: 5, titel: "Rote Jacke", status: "geklaert", gefunden_am: heute }, { id: 4, titel: "Mütze", status: "offen", gefunden_am: alt }],
    boerse: [{ id: 12, titel: "Fußballschuhe Gr. 31", groesse: "31", preis: "Zu verschenken", created_by: "anders", reserviert_von: null, created_at: new Date().toISOString() },
      { id: 11, titel: "Eigenes Trikot", created_by: "u1", reserviert_von: null, created_at: new Date().toISOString() },
      { id: 10, titel: "Reserviert", created_by: "anders", reserviert_von: "x", created_at: new Date().toISOString() }]
  };
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 6 } }], termine: () => [T(1, 2)],
      rueckmeldungen: [], kind_fanfacts: [], kind_foto: [],
      boerse_listings: () => zustand.boerse.filter(x => !x.reserviert_von),   // die Attrappe kennt keine Filter: reserviert_von=is.null hier nachgebildet
      rpc: { fundbuero_board: () => zustand.fund } }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const lauf = async (fn) => e.page.evaluate(fn).catch(x => ({ fehler: String(x) }));
  const r = await lauf(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), txt = el => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    window.sbUserId = () => "u1"; await fundHinweisKarten(); await w(200);
    const out = {}, f = document.querySelector("#fe-bahn .fh-fund"), b = document.querySelector("#fe-bahn .fh-boerse");
    out.fund = txt(f); out.boerse = txt(b); out.zahl = txt(document.getElementById("fe-zahl"));
    const x = f && f.querySelector(".fe-x"); out.x = x ? Math.round(Math.min(x.offsetWidth, x.offsetHeight)) : 0;
    const los = f && f.querySelector(".fh-los"); if (los) { los.click(); await w(400); }
    out.fundbuero = !!document.getElementById("fb-modal"); document.getElementById("fb-modal")?.remove();
    x.click(); await w(100); out.wegSofort = !document.querySelector("#fe-bahn .fh-fund");
    await fundHinweisKarten(); await w(100); out.wegNachLaden = !document.querySelector("#fe-bahn .fh-fund");
    out.boerseNoch = !!document.querySelector("#fe-bahn .fh-boerse");
    return out;
  });
  zustand.fund.unshift({ id: 8, titel: "Torwarthandschuhe", status: "offen", gefunden_am: heute });
  const r2 = await lauf(async () => { await fundHinweisKarten(); await new Promise(x => setTimeout(x, 100)); const f = document.querySelector("#fe-bahn .fh-fund"); return { neu: f ? f.textContent.replace(/\s+/g, " ").trim() : "" }; });
  zustand.boerse = zustand.boerse.filter(x => x.id !== 12);
  const r3 = await lauf(async () => { await fundHinweisKarten(); await new Promise(x => setTimeout(x, 100)); return { boerseWeg: !document.querySelector("#fe-bahn .fh-boerse") }; });
  const fe = e.fehler(); await e.schliessen();
  if (r.fehler || r2.fehler || r3.fehler) probleme.push(r.fehler || r2.fehler || r3.fehler);
  else {
    if (!/Neu im Fundbüro/.test(r.fund) || !/Blaue Trinkflasche/.test(r.fund) || !/und 1 weiteres/.test(r.fund) || !/Ansehen/.test(r.fund)) probleme.push("a) Fundbüro-Karte „" + r.fund + "“");
    if (/Rote Jacke|Mütze/.test(r.fund)) probleme.push("c) Geklärtes oder Altes in der Karte");
    if (!r.fundbuero) probleme.push("a) „Ansehen“ öffnet das Fundbüro nicht");
    if (!/Neu in der Adler-Börse/.test(r.boerse) || !/Fußballschuhe Gr\. 31/.test(r.boerse) || /Eigenes Trikot|Reserviert|weitere/.test(r.boerse)) probleme.push("b) Börse-Karte „" + r.boerse + "“");
    if (r.x < 44) probleme.push("d) ✕ " + r.x + " px");
    if (!r.wegSofort || !r.wegNachLaden || !r.boerseNoch) probleme.push(`d) ✕: sofort ${r.wegSofort}, nach Laden ${r.wegNachLaden}, Börse bleibt ${r.boerseNoch}`);
    if (!/Torwarthandschuhe/.test(r2.neu) || /weitere/.test(r2.neu)) probleme.push("d) Neues nach ✕: „" + r2.neu + "“");
    if (!r3.boerseWeg) probleme.push("e) gelöschtes Angebot: Karte bleibt");
  }
  const fehler = fe.filter(x => !/Failed to load resource/.test(x)); if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  zeilen.push(`a) „${String(r.fund || "").slice(0, 70)}“ · b) „${String(r.boerse || "").slice(0, 60)}“ · ${r.zahl}`);
  zeilen.push(`d) ✕ ${r.x} px, bleibt weg, Neues („Torwarthandschuhe“) kommt wieder · e) gelöscht → Karte weg`);
  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
