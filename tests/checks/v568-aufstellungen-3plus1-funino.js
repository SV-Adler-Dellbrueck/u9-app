/* v568 – Acht Einheiten für 3+1, FUNiño und die Kombination.

   Auftragspaket `doku/auftrag-aufstellungen-3plus1-funino/Auftragspaket.md` (16.09.2026),
   Beschlüsse vom selben Tag im privaten Repo: im 3+1 spielt die U9 I die Raute ohne
   Aufpasser (der Torwart spielt mit), beim FUNiño das Dreieck ohne Jäger (der Aufpasser als
   Mittelmann), die Rollen wandern mit der Rotation. Dazu dreizehn Übungen und acht Vorlagen,
   die nicht abgetippt, sondern per Skript aus den vier Nachträgen im selben Ordner angehängt
   wurden – und drei neue Ordnungen in EI_ORDNUNGEN.

   Warum das eine Prüfung wert ist: Die Vorlagen nennen ihre Übungen beim Namen, und
   Hauptteil 1 und 2 tragen dieselbe Stationsliste – der Tausch der Gruppen kommt aus
   tpVersatz, nicht aus der Vorlage. Läuft das auseinander, steht am Platz eine Gruppe
   zweimal an derselben Station. Und Paket A (Auftrag Stationen) hatte zugesagt, dass sich
   die Stationsliste bei mehr Feldern wiederholt – das tat der Code bis v567 nicht.

   Die acht Abnahmekriterien des Pakets:
   1) Die echten Dateien laufen ohne Fehler durch _euPruefung und _evPruefung.
   2) Der Abgleich legt 13 Übungen und 8 Vorlagen an und rührt den Bestand nicht an.
   3) L4-6 bei ZWEI Feldtrainern: zwei Felder; Hauptteil 1 Feld 1 „3+1 gegen 2 – Adler aus
      dem Tor“, Feld 2 „2 gegen 1 plus Torwart …“; Hauptteil 2 dieselben Übungen, die
      Gruppen getauscht (Versatz 1); Hauptteil 3 beide Felder „3+1 gegen 3+1 – Raute ohne
      Aufpasser“.
   4) Dieselbe Vorlage bei DREI Feldtrainern: drei Felder, die Stationsliste wiederholt sich
      (Feld 3 = Station 1), kein Hinweis „Stationen entfallen“.
   5) Keine der acht löst einen Netto-Hinweis aus; alle tragen Skalierung 8/12/16 und eine
      Beobachtungsfrage mit Aufpasser, Flitzer oder Jäger.
   6) Im Fenster „Vorlage übernehmen“ erscheinen die Kacheln „3+1“, „FUNiño“ und „3+1 gegen
      FUNiño“, sie filtern – und die Reihe trägt am Handy (390 px) alle Werte mit 48 px Höhe
      ohne waagerechten Überlauf.
   7) Die dreizehn Skizzen rendern dunkel und hell; die Sperrklinke aus v549 bleibt bei 37.
   8) L5-6 bei zwei Feldtrainern: Hauptteil 1 und 2 mit „3+1 gegen 2 – Adler aus dem Tor“ und
      „FUNiño 3 gegen 1 – der Mittlere hat den Ball“, Hauptteil 3 „3+1 gegen FUNiño – großes
      Tor gegen zwei kleine“; L6-5 entsprechend mit „Igel gegen drei …“ und „FUNiño 2 gegen 2
      – einer drängt, einer schützt“.
   Dazu die Datei selbst: der Anhang ist byte-genau gleich den Nachträgen, Stand 2026-09-16-1. */
const ORDNER = "doku/auftrag-aufstellungen-3plus1-funino";
const NEUE_ORDNUNGEN = ["3+1", "FUNiño", "3+1 gegen FUNiño"];
const EINHEITEN = ["L4-6", "L5-4", "L6-3", "L4-7", "L5-5", "L6-4", "L5-6", "L6-5"];
const STAND = "2026-09-16-1";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");
  const lies = f => JSON.parse(fs.readFileSync(path.join(h.REPO, f), "utf8"));

  // ── Die Dateien: Anhang byte-genau gleich den Nachträgen ───────────────────
  const bib = lies("uebungen/bibliothek.json"), vor = lies("uebungen/vorlagen.json");
  const nachU = [lies(ORDNER + "/uebungen-nachtrag.json"), lies(ORDNER + "/uebungen-nachtrag-kombi.json")];
  const nachV = [lies(ORDNER + "/vorlagen-nachtrag.json"), lies(ORDNER + "/vorlagen-nachtrag-kombi.json")];
  const neueU = nachU.flatMap(d => d.uebungen || []), neueV = nachV.flatMap(d => d.vorlagen || []);
  if (neueU.length !== 13) probleme.push(`${neueU.length} Übungen in den Nachträgen, erwartet 13`);
  if (neueV.length !== 8) probleme.push(`${neueV.length} Vorlagen in den Nachträgen, erwartet 8`);
  const roh = o => JSON.stringify(o);
  const anhangU = (bib.uebungen || []).slice(-neueU.length), anhangV = (vor.vorlagen || []).slice(-neueV.length);
  const abwU = neueU.filter((u, i) => roh(u) !== roh(anhangU[i])).map(u => u.name);
  const abwV = neueV.filter((v, i) => roh(v) !== roh(anhangV[i])).map(v => v.name);
  if (abwU.length) probleme.push("Übung in bibliothek.json weicht vom Nachtrag ab: " + abwU.join(", "));
  if (abwV.length) probleme.push("Vorlage in vorlagen.json weicht vom Nachtrag ab: " + abwV.join(", "));
  if (bib.stand !== STAND) probleme.push(`bibliothek.json: Stand „${bib.stand}“ statt „${STAND}“`);
  if (vor.stand !== STAND) probleme.push(`vorlagen.json: Stand „${vor.stand}“ statt „${STAND}“`);
  const bestandU = (bib.uebungen || []).length - neueU.length, bestandV = (vor.vorlagen || []).length - neueV.length;
  if (bestandU !== 14) probleme.push(`${bestandU} Übungen vor dem Anhang, erwartet 14`);
  if (bestandV !== 21) probleme.push(`${bestandV} Vorlagen vor dem Anhang, erwartet 21`);
  const ohneEinheit = EINHEITEN.filter(p => !neueV.some(v => String(v.name).startsWith(p + " ")));
  if (ohneEinheit.length) probleme.push("Einheit fehlt im Nachtrag: " + ohneEinheit.join(", "));
  const fremdeOrdnung = neueV.filter(v => !NEUE_ORDNUNGEN.includes(v.ordnung)).map(v => v.name);
  if (fremdeOrdnung.length) probleme.push("Vorlage ohne eine der drei neuen Ordnungen: " + fremdeOrdnung.join(", "));

  // 5) Skalierung und Beobachtung – aus der Datei
  const ohneSkal = neueV.filter(v => !["8", "12", "16"].every(k => String((v.skalierung || {})[k] || "").trim())).map(v => v.name);
  if (ohneSkal.length) probleme.push("Ohne vollständige Skalierung 8/12/16: " + ohneSkal.join(", "));
  const ohneRolle = neueV.filter(v => !/Aufpasser|Flitzer|Jäger/.test(String(v.beobachtung || ""))).map(v => v.name);
  if (ohneRolle.length) probleme.push("Beobachtungsfrage ohne Rollenbezug: " + ohneRolle.join(", "));

  // 7) Sperrklinke aus v549 – der Wert steht in der Prüfdatei selbst
  const v549 = fs.readFileSync(path.join(__dirname, "v549-vorlagen-skizzen.js"), "utf8");
  const klinke = (v549.match(/const REST_HOECHSTENS = (\d+);/) || [])[1];
  if (klinke !== "37") probleme.push(`Die Sperrklinke aus v549 steht auf ${klinke} statt 37`);

  // ── Der Browser: Abgleich gegen den Bestand, Prüfung, Kacheln, Skizzen, Übernehmen ──
  const zwei = h.tagePlus(2), drei = h.tagePlus(4);
  const gruppen = [
    { name: "Blau", emo: "🔵", kinder: [h.KINDER[0], h.KINDER[1], h.KINDER[2]] },
    { name: "Grün", emo: "🟢", kinder: [h.KINDER[3], h.KINDER[4], h.KINDER[5]] }
  ];
  /* Die Attrappe kennt den Bestand VOR diesem Paket: die 14 Übungen und 21 Vorlagen der
     Datei. Alles, was per POST hereinkommt, ist neu angelegt. */
  const custom = (bib.uebungen || []).slice(0, bestandU).map((u, i) => ({ ...u, id: 6000 + i, custom: true }));
  const vorhanden = (vor.vorlagen || []).slice(0, bestandV).map((v, i) => ({ ...v, id: 900 + i }));
  const uebPosts = [], vorPosts = [], plaene = {};
  const s = await h.starten({
    bibliothek: true, hoehe: 2600,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(), nominierungen: [], anwesenheit: [],
      /* Die Attrappe filtert nicht von selbst – tpTrainerRsvpLaden fragt „datum=eq.…&limit=1“
         und nähme sonst immer den ersten Termin, also die zwei Trainer auch am Dreier-Tag. */
      termine: (u) => {
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        return [
          { id: 81, datum: zwei, typ: "training", trainer_status: { Charles: "ja", Finn: "ja" } },
          { id: 82, datum: drei, typ: "training", trainer_status: { Charles: "ja", Finn: "ja", Kenneth: "ja" } }
        ].filter(t => !d || t.datum === d);
      },
      trainingsgruppen: [{ datum: zwei, gruppen, aus_anwesenheit: false }],
      trainingsformen: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); uebPosts.push(b); custom.push({ ...b, id: 7000 + uebPosts.length, custom: true }); return { status: 201, body: "[]" }; }
        return custom;
      },
      trainingsvorlagen: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); vorPosts.push(b); return { status: 201, body: "[]" }; }
        return vorhanden.concat(vorPosts.map((z, i) => ({ ...z, id: 1000 + i })));
      },
      trainingsplan: (u, req) => {
        if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); plaene[b.datum] = b; return { status: 201, body: "[]" }; }
        const d = (u.searchParams.get("datum") || "").replace(/^eq\./, "");
        const p = plaene[d]; if (!p) return [];
        if (/select=slots/.test(u.search) && !/plan/.test(u.search)) return [{ datum: d, slots: p.slots || [] }];
        if (/select=plan/.test(u.search) && !/slots/.test(u.search)) return [{ datum: d, plan: p.plan || [] }];
        return [p];
      }
    })
  });
  await h.sichtbarMachen(s.page, "#train-sub-planung");
  await h.sichtbarMachen(s.page, "#tp-timeline");

  const r = await s.page.evaluate(async ({ nachU, nachV, neueV, neueU, zwei, drei, NEUE_ORDNUNGEN }) => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: [] };
    for (const n of ["_euPruefung", "_evPruefung", "_evNettoHinweis", "_evStationenHinweis", "vorlageUebernehmenOpen", "vorlageUebernehmenSetzen", "tpVersatz", "tpTrainerRsvpLaden", "tgSync", "_skz"])
      if (typeof window[n] !== "function") out.fehlt.push(n);
    if (typeof EI_ORDNUNGEN === "undefined") out.fehlt.push("EI_ORDNUNGEN");
    if (out.fehlt.length) return out;
    for (let i = 0; i < 100; i++) { if (!_bibLaeuft && VORLAGEN.length >= 29) break; await warte(100); }
    while (_bibLaeuft) await warte(50);
    out.geladen = VORLAGEN.length;
    out.ordnungen = EI_ORDNUNGEN.slice();

    // 1) Die echten Dateien durch die Prüfung – nach dem Abgleich kennt tpAllForms() die Übungen
    out.fehlerU = nachU.flatMap(d => _euPruefung(JSON.stringify(d)).fehler);
    out.fehlerV = nachV.flatMap(d => _evPruefung(JSON.stringify(d)).fehler);
    out.netto = neueV.map(v => ({ name: v.name, text: _evNettoHinweis(v) })).filter(x => x.text);
    out.stationenZwei = neueV.map(v => ({ name: v.name, text: _evStationenHinweis(v, 2) })).filter(x => x.text);
    out.stationenDrei = neueV.map(v => ({ name: v.name, text: _evStationenHinweis(v, 3) })).filter(x => x.text);

    // 7) Skizzen dunkel und hell
    out.skizzen = neueU.map(u => {
      try {
        const d = _skz(u.skizze), l = _skz(u.skizze, { hell: true });
        return { name: u.name, dunkel: /<svg/.test(d), hell: /<svg/.test(l), verschieden: d !== l };
      } catch (e) { return { name: u.name, fehler: String(e && e.message || e) }; }
    });

    // 6) Das Fenster „Vorlage übernehmen“ – das echte, am Handy
    const feld = document.getElementById("tp-date");
    if (feld && ![...feld.options].some(o => o.value === zwei)) feld.add(new Option(zwei, zwei));
    if (feld && ![...feld.options].some(o => o.value === drei)) feld.add(new Option(drei, drei));
    if (feld) feld.value = zwei;
    await vorlageUebernehmenOpen();
    await warte(120);
    const chips = () => [...document.querySelectorAll("#vu-inhalt button")].filter(b => /vuFilterSet\('ordnung'/.test(b.getAttribute("onclick") || ""));
    out.ordChips = chips().map(b => b.textContent.trim());
    out.chipHoehen = chips().map(b => Math.round(b.getBoundingClientRect().height));
    const reihe = chips()[0] && chips()[0].parentElement;
    out.reiheUeberlauf = reihe ? (reihe.scrollWidth - reihe.clientWidth) : null;
    out.reiheBreite = reihe ? reihe.clientWidth : null;
    out.chipsAbgeschnitten = chips().filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim());
    const treffer = () => (document.getElementById("vu-inhalt").textContent.match(/(\d+) von (\d+) Vorlagen/) || [])[1];
    out.trefferAlle = treffer();
    out.filter = {};
    for (const o of NEUE_ORDNUNGEN) {
      vuFilterSet("ordnung", o); await warte(60);
      out.filter[o] = { treffer: treffer(), namen: [...document.querySelectorAll("#vu-inhalt button")].filter(b => /vuWaehlen/.test(b.getAttribute("onclick") || "")).map(b => b.querySelector("div") ? b.querySelector("div").textContent.trim() : "") };
      vuFilterSet("ordnung", o); await warte(30);
    }
    out.trefferDanach = treffer();
    vorlageUebernehmenClose();

    // 3) + 8) Übernehmen bei zwei Feldtrainern
    const idVon = pfx => String((VORLAGEN.find(v => String(v.name).startsWith(pfx + " ")) || {}).id);
    const werte = si => [...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)].map(x => x.value ? (tpAllForms()[+x.value] || {}).name || "?" : "");
    const lesen = () => tpSlots.map((sl, si) => ({
      label: sl.label, typ: sl.typ, felder: werte(si), versatz: tpIstHauptteil(sl.typ) ? tpVersatz(si) : null,
      wer: (document.querySelectorAll(".tp-slot")[si] && (document.querySelectorAll(".tp-slot")[si].querySelector(".tp-ringtausch span") || {}).textContent) || ""
    }));
    const uebernehmen = async (datum, pfx) => {
      if (feld) feld.value = datum;
      await tpTrainerRsvpLaden(datum);
      _tgCache = { datum: null, tg: null, geladen: false };
      await tgSync(); await warte(150);
      _vuAuswahl = idVon(pfx);
      await vorlageUebernehmenSetzen();
      await warte(500);
      return { trainer: tpGetCheckedTrainers().slice(), gruppen: (((tgFor() || {}).gruppen) || []).map(g => g.name), slots: lesen() };
    };
    out.l46zwei = await uebernehmen(zwei, "L4-6");
    out.l56zwei = await uebernehmen(zwei, "L5-6");
    out.l65zwei = await uebernehmen(zwei, "L6-5");
    // 4) Dieselbe Vorlage bei drei Feldtrainern
    out.l46drei = await uebernehmen(drei, "L4-6");
    out.hinweisSpur = [...document.querySelectorAll("#tp-timeline")].map(e => e.textContent).join(" ");
    return out;
  }, { nachU, nachV, neueV, neueU, zwei, drei, NEUE_ORDNUNGEN });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt.length) { probleme.push(r.fehlt.join(", ") + " fehlt"); return h.ergebnis("Aufstellungen 3+1 und FUNiño: acht Einheiten, drei Ordnungen", false, zeilen.concat(probleme)); }

  // 1)
  if (r.fehlerU.length) probleme.push("Übungen kommen nicht durch _euPruefung: " + r.fehlerU.slice(0, 3).join(" | "));
  if (r.fehlerV.length) probleme.push("Vorlagen kommen nicht durch _evPruefung: " + r.fehlerV.slice(0, 3).join(" | "));
  const soll = ["1 gegen 1", "2 gegen 2", "Dreieck (3 gegen 3)", "Raute (4 gegen 4)", "3+1", "FUNiño", "3+1 gegen FUNiño", "Überzahl", "ohne Gegner"];
  if (String(r.ordnungen) !== String(soll)) probleme.push(`EI_ORDNUNGEN: ${r.ordnungen.join(" · ")} – erwartet ${soll.join(" · ")}`);
  if (!probleme.length) zeilen.push(`Prüfung: 13 Übungen und 8 Vorlagen ohne Fehler durch _euPruefung und _evPruefung · Ordnungen ${r.ordnungen.length}`);

  // 2)
  const neuU = uebPosts.map(p => p.name), neuV = vorPosts.map(p => p.name);
  if (neuU.length !== 13) probleme.push(`Der Abgleich hat ${neuU.length} Übungen angelegt statt 13: ${neuU.join(", ")}`);
  if (neuV.length !== 8) probleme.push(`Der Abgleich hat ${neuV.length} Vorlagen angelegt statt 8: ${neuV.join(", ")}`);
  const altU = neuU.filter(n => (bib.uebungen || []).slice(0, bestandU).some(u => u.name === n));
  const altV = neuV.filter(n => (vor.vorlagen || []).slice(0, bestandV).some(v => v.name === n));
  if (altU.length || altV.length) probleme.push("Der Abgleich hat Bestehendes noch einmal angelegt: " + altU.concat(altV).join(", "));
  const ohneOrdnung = vorPosts.filter(p => !NEUE_ORDNUNGEN.includes(p.ordnung)).map(p => p.name);
  if (ohneOrdnung.length) probleme.push("Beim Anlegen ging die Ordnung verloren: " + ohneOrdnung.join(", "));
  const ohneSkizze = uebPosts.filter(p => !p.skizze || typeof p.skizze !== "object").map(p => p.name);
  if (ohneSkizze.length) probleme.push("Beim Anlegen ging die Skizze verloren: " + ohneSkizze.join(", "));
  if (neuU.length === 13 && neuV.length === 8 && !altU.length && !altV.length) zeilen.push(`Abgleich: 13 Übungen und 8 Vorlagen neu, die ${bestandU} und ${bestandV} bestehenden unberührt`);

  // 5)
  if (r.netto.length) probleme.push("Netto-Hinweis: " + r.netto.map(x => `${x.name} – ${x.text}`).join(" | "));
  if (r.stationenZwei.length) probleme.push("Stationen-Hinweis bei zwei Feldern: " + r.stationenZwei.map(x => x.name).join(", "));
  if (r.stationenDrei.length) probleme.push("Stationen-Hinweis bei drei Feldern: " + r.stationenDrei.map(x => x.name).join(", "));
  if (!r.netto.length && !ohneSkal.length && !ohneRolle.length) zeilen.push("Keine der acht mit Netto-Hinweis · Skalierung 8/12/16 und Beobachtungsfrage mit Rollenbezug überall");

  // 6)
  const fehlendeChips = NEUE_ORDNUNGEN.filter(o => !r.ordChips.includes(o));
  if (fehlendeChips.length) probleme.push(`Kacheln fehlen im Fenster „Vorlage übernehmen“: ${fehlendeChips.join(", ")} (da: ${r.ordChips.join(" · ")})`);
  const erwartet = { "3+1": 3, "FUNiño": 3, "3+1 gegen FUNiño": 2 };
  Object.keys(erwartet).forEach(o => {
    const f = (r.filter || {})[o] || {};
    if (String(f.treffer) !== String(erwartet[o])) probleme.push(`Filter „${o}“ lässt ${f.treffer} Vorlagen stehen, erwartet ${erwartet[o]}`);
  });
  if (String(r.trefferDanach) !== String(r.trefferAlle)) probleme.push(`Nach dem Aufheben ${r.trefferDanach} statt ${r.trefferAlle} Vorlagen`);
  const zuNiedrig = r.chipHoehen.filter(x => x < 48);
  if (zuNiedrig.length) probleme.push(`Kacheln unter 48 px: ${zuNiedrig.join(", ")}`);
  if (r.reiheUeberlauf > 0) probleme.push(`Die Kachelreihe läuft am Handy ${r.reiheUeberlauf} px über den Rand`);
  if (r.chipsAbgeschnitten.length) probleme.push("Kacheltext abgeschnitten: " + r.chipsAbgeschnitten.join(", "));
  if (!fehlendeChips.length && !zuNiedrig.length && !(r.reiheUeberlauf > 0)) zeilen.push(`Kacheln: ${r.ordChips.join(" · ")} · Filter 3+1 → ${r.filter["3+1"].treffer}, FUNiño → ${r.filter["FUNiño"].treffer}, Kombi → ${r.filter["3+1 gegen FUNiño"].treffer} · ${r.ordChips.length} Kacheln zu ${Math.min(...r.chipHoehen)} px auf ${r.reiheBreite} px Breite`);

  // 7)
  const skzFehler = r.skizzen.filter(x => x.fehler || !x.dunkel || !x.hell).map(x => `${x.name}${x.fehler ? " (" + x.fehler + ")" : ""}`);
  if (skzFehler.length) probleme.push("Skizze rendert nicht in beiden Fassungen: " + skzFehler.join(", "));
  const gleich = r.skizzen.filter(x => !x.fehler && !x.verschieden).map(x => x.name);
  if (gleich.length) probleme.push("Helle Fassung ist mit der dunklen identisch: " + gleich.join(", "));
  if (!skzFehler.length && !gleich.length) zeilen.push(`Skizzen: alle ${r.skizzen.length} rendern dunkel und hell · Sperrklinke v549 bei ${klinke}`);

  // 3) + 8) + 4)
  const A = "3+1 gegen 2 – Adler aus dem Tor", B = "2 gegen 1 plus Torwart – der Flitzer macht es breit", C = "3+1 gegen 3+1 – Raute ohne Aufpasser";
  const F1 = "FUNiño 3 gegen 1 – der Mittlere hat den Ball", K = "3+1 gegen FUNiño – großes Tor gegen zwei kleine";
  const I = "Igel gegen drei – Torwart und zwei Flitzer verteidigen", F2 = "FUNiño 2 gegen 2 – einer drängt, einer schützt";
  const haupt = e => (e.slots || []).filter(x => x.typ === "spielform" || x.typ === "main");
  const pruefeZwei = (e, name, s1, s2, s3) => {
    const hp = haupt(e);
    if ((e.trainer || []).length !== 2) { probleme.push(`${name}: ${(e.trainer || []).length} Feldtrainer angehakt statt 2`); return; }
    if (hp.length !== 3) { probleme.push(`${name}: ${hp.length} Hauptteile statt 3 (${(e.slots || []).map(x => x.typ).join(",")})`); return; }
    if (String(hp[0].felder) !== String([s1, s2])) probleme.push(`${name} Hauptteil 1: [${hp[0].felder.join(" | ")}]`);
    if (String(hp[1].felder) !== String([s1, s2])) probleme.push(`${name} Hauptteil 2: [${hp[1].felder.join(" | ")}]`);
    if (String(hp[2].felder) !== String([s3, s3])) probleme.push(`${name} Hauptteil 3: [${hp[2].felder.join(" | ")}]`);
    if (hp[0].versatz !== 0 || hp[1].versatz !== 1) probleme.push(`${name}: Versatz ${hp[0].versatz} / ${hp[1].versatz} statt 0 / 1`);
    if (!/Blau → Feld 1.*Grün → Feld 2/.test(hp[0].wer)) probleme.push(`${name} Hauptteil 1 zeigt „${hp[0].wer}“`);
    if (!/Grün → Feld 1.*Blau → Feld 2/.test(hp[1].wer)) probleme.push(`${name} Hauptteil 2: die Gruppen sind nicht getauscht – „${hp[1].wer}“`);
  };
  pruefeZwei(r.l46zwei, "L4-6", A, B, C);
  pruefeZwei(r.l56zwei, "L5-6", A, F1, K);
  pruefeZwei(r.l65zwei, "L6-5", I, F2, K);
  const d = r.l46drei, hd = haupt(d);
  if ((d.trainer || []).length !== 3) probleme.push(`L4-6 bei drei: ${(d.trainer || []).length} Feldtrainer angehakt statt 3`);
  else if (hd.length !== 3) probleme.push(`L4-6 bei drei: ${hd.length} Hauptteile`);
  else {
    if (String(hd[0].felder) !== String([A, B, A])) probleme.push(`L4-6 bei drei, Hauptteil 1: [${hd[0].felder.join(" | ")}] – die Stationsliste wiederholt sich nicht (Feld 3 = Station 1)`);
    if (String(hd[1].felder) !== String([A, B, A])) probleme.push(`L4-6 bei drei, Hauptteil 2: [${hd[1].felder.join(" | ")}]`);
    if (String(hd[2].felder) !== String([C, C, C])) probleme.push(`L4-6 bei drei, Hauptteil 3: [${hd[2].felder.join(" | ")}]`);
  }
  if (/Stationen? (geplant|entf)/.test(r.hinweisSpur || "")) probleme.push("Bei drei Feldern erscheint ein Hinweis „Stationen entfallen“");
  if (!probleme.some(p => /L4-6|L5-6|L6-5/.test(p))) {
    zeilen.push("L4-6 bei zwei Feldtrainern: Hauptteil 1 [Adler aus dem Tor | Flitzer macht es breit], Hauptteil 2 dieselben Übungen mit getauschten Gruppen (Versatz 1), Hauptteil 3 beide Felder Raute ohne Aufpasser");
    zeilen.push("L5-6 und L6-5 bei zwei: Stationen wie im Paket, Hauptteil 3 beide Felder „großes Tor gegen zwei kleine“");
    zeilen.push("L4-6 bei drei Feldtrainern: drei Felder, Feld 3 = Station 1 (Wiederholung aus Paket A, seit v568 auch im Code), kein Hinweis");
  }

  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  return h.ergebnis("Aufstellungen 3+1 und FUNiño: acht Einheiten, drei Ordnungen", !probleme.length, zeilen.concat(probleme));
};
