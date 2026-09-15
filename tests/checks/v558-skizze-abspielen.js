/* v558 – Abspielen: den Ablauf zeigen statt nur die Momente.

   Blättern zeigt, wo jemand danach steht. Abspielen zeigt, WER losläuft – und genau das
   ist der Unterschied, auf den es in einer Besprechung mit Achtjährigen ankommt.

   Bewusst keine Zeitachse und keine Schlüsselbilder: es gibt die Bilder, die der Trainer
   gezeichnet hat, dazwischen wird gleichmäßig überblendet. Wer weniger Bewegung auf dem
   Bildschirm braucht, bekommt über die Systemeinstellung harte Schnitte – dieselbe
   Einstellung, die auch die übrigen Animationen der App abschaltet. Dass dieser Weg
   wirklich greift, ist der wichtigste Fall hier: er lässt sich von Hand kaum prüfen.

   Fälle:
   a) `_skzZwischen` rechnet richtig: bei 0 entsteht Zeichen für Zeichen das erste Bild,
      bei 1 stehen Spieler und Ball auf den Werten des zweiten, bei 0,5 in der Mitte.
      Alles außer Spielern und Ball kommt aus dem ersten Bild – die Pfeile bleiben also
      stehen, solange die Bewegung läuft.
   b) Abspielen läuft bis zum letzten Bild und hört dort auf; der Knopf heißt währenddessen
      „Anhalten“ und danach wieder „Abspielen“.
   c) Mit „weniger Bewegung“ in den Systemeinstellungen wird geschnitten statt geglitten –
      und der Ablauf kommt trotzdem am letzten Bild an.
   d) Ein Fingertipp aufs Bild hält an: wer eingreifen will, muss nicht erst suchen.
   e) Taktikboard: „+ Bild“, Verschieben ändert nur das aktuelle Bild, Speichern und Laden
      stellt beide wieder her, und ein Eintrag ohne Bilder lädt wie bisher. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const vorlagen = [];
  const attrappe = h.supabaseAttrappe({
    kader: h.kaderZeilen(), termine: [],
    taktik_templates: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); vorlagen.push({ ...b, id: vorlagen.length + 1, created_at: new Date().toISOString() }); return { status: 201, body: "[]" }; }
      const id = (u.searchParams.get("id") || "").replace(/^eq\./, "");
      return id ? vorlagen.filter(v => String(v.id) === id) : vorlagen;
    }
  });

  const s = await h.starten({ hoehe: 1500, supabase: attrappe });

  // ── a) Rechnen ────────────────────────────────────────────────────────────
  const a = await s.page.evaluate(() => {
    if (typeof _skzZwischen !== "function") return { fehlt: "_skzZwischen" };
    const A = { z: [[1, 1, 2, 2]], s: [[100, 100, "g", "A"]], b: [[10, 10]], p: [[1, 1, 2, 2, "p"]], tx: [[5, 5, "eins"]] };
    const B = { z: [[1, 1, 2, 2]], s: [[200, 140, "g", "A"]], b: [[30, 50]], p: [[9, 9, 8, 8, "l"]], tx: [[5, 5, "zwei"]] };
    const halb = _skzZwischen(A, B, .5);
    return {
      null: _skz(_skzZwischen(A, B, 0)) === _skz(A),
      eins: JSON.stringify(_skzZwischen(A, B, 1).s) === JSON.stringify(B.s)
         && JSON.stringify(_skzZwischen(A, B, 1).b) === JSON.stringify(B.b),
      mitte: JSON.stringify(halb.s) === JSON.stringify([[150, 120, "g", "A"]])
          && JSON.stringify(halb.b) === JSON.stringify([[20, 30]]),
      pfeilAusA: JSON.stringify(halb.p) === JSON.stringify(A.p),
      textAusA: JSON.stringify(halb.tx) === JSON.stringify(A.tx)
    };
  });
  if (a.fehlt) probleme.push(a.fehlt + " fehlt");
  else {
    if (!a.null) probleme.push("Bei 0 entsteht nicht dasselbe wie ohne Überblendung");
    if (!a.eins) probleme.push("Bei 1 stehen Spieler oder Ball nicht auf den Werten des zweiten Bildes");
    if (!a.mitte) probleme.push("Bei 0,5 liegt der Stand nicht in der Mitte");
    if (!a.pfeilAusA || !a.textAusA) probleme.push("Pfeile oder Beschriftung kommen nicht aus dem ersten Bild");
    if (!probleme.length) zeilen.push("Überblenden: bei 0 unverändert, bei 0,5 in der Mitte, Pfeile bleiben stehen");
  }

  // ── b) + d) Abspielen ─────────────────────────────────────────────────────
  await h.sichtbarMachen(s.page, "#view-formen");
  const start = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    /* Eine Übung mit Schritten unterschieben – unabhängig davon, was in der
       Bibliothek steht. */
    window.__probe = {
      s: [[60, 60, "g", "A"], [200, 60, "r", "B"]], b: [[68, 68]],
      schritte: [{ s: [[60, 120, "g", "A"], [200, 60, "r", "B"]] }, { s: [[140, 120, "g", "A"], [200, 60, "r", "B"]] }]
    };
    const alle = tpAllForms() || [];
    const idx = alle.findIndex(f => skzSpecVon(f));
    alle[idx].skizze = window.__probe;
    skzGrossOpen(idx); await warte(150);
    const knopf = [...document.querySelectorAll("#skz-gross-bilder button")].find(b => /Abspielen/.test(b.textContent));
    if (!knopf) return { fehlt: "Abspiel-Knopf" };
    const hoehe = Math.round(knopf.getBoundingClientRect().height);
    knopf.click(); await warte(200);
    const beschriftung = ([...document.querySelectorAll("#skz-gross-bilder button")].find(b => /Anhalten|Abspielen/.test(b.textContent)) || {}).textContent || "";
    return { idx, hoehe, laeuft: !!_skzGr.lauft, beschriftung: beschriftung.trim() };
  });
  if (start.fehlt) probleme.push(start.fehlt + " fehlt");
  else {
    if (start.hoehe < 44) probleme.push(`Der Abspiel-Knopf ist ${start.hoehe} px hoch – gefordert 44`);
    if (!start.laeuft) probleme.push("Abspielen startet nicht");
    if (!/Anhalten/.test(start.beschriftung)) probleme.push(`Der Knopf heißt während des Laufs „${start.beschriftung}“`);
    await s.page.waitForFunction(() => !_skzGr || !_skzGr.lauft, { timeout: 12000 }).catch(() => {});
    const ende = await s.page.evaluate(() => ({
      bild: _skzGr ? _skzGr.bild : -1, laeuft: _skzGr ? !!_skzGr.lauft : false,
      beschriftung: ([...document.querySelectorAll("#skz-gross-bilder button")].find(b => /Anhalten|Abspielen/.test(b.textContent)) || {}).textContent.trim()
    }));
    if (ende.laeuft) probleme.push("Das Abspielen hört nicht von selbst auf");
    if (ende.bild !== 2) probleme.push(`Am Ende steht Bild ${ende.bild + 1} statt Bild 3`);
    if (!/Abspielen/.test(ende.beschriftung)) probleme.push(`Nach dem Lauf heißt der Knopf „${ende.beschriftung}“`);

    // d) Antippen hält an
    const stopp = await s.page.evaluate(async () => {
      const warte = ms => new Promise(x => setTimeout(x, ms));
      skzGrossBild(0);
      [...document.querySelectorAll("#skz-gross-bilder button")].find(b => /Abspielen/.test(b.textContent)).click();
      await warte(150);
      const lief = !!_skzGr.lauft;
      const b = document.getElementById("skz-gross-buehne");
      b.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 5, clientX: 200, clientY: 300, bubbles: true, cancelable: true }));
      await warte(80);
      const jetzt = !!_skzGr.lauft;
      skzGrossClose();
      return { lief, jetzt };
    });
    if (!stopp.lief) probleme.push("Der zweite Lauf startet nicht");
    if (stopp.jetzt) probleme.push("Ein Tipp aufs Bild hält das Abspielen nicht an");
    if (!probleme.length) zeilen.push("Abspielen: läuft bis zum letzten Bild, hört dort auf, ein Tipp hält an");
  }
  const f1 = s.fehler();
  if (f1.length) probleme.push("Konsole: " + f1[0]);

  // ── e) Taktikboard ────────────────────────────────────────────────────────
  await h.sichtbarMachen(s.page, "#view-taktik");
  const tb = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof taktikBildNeu !== "function") return { fehlt: "taktikBildNeu" };
    taktikSetup("auto"); await warte(120);
    if (!tbField.length) return { fehlt: "Aufstellung auf dem Feld" };
    const vorher = tbField[0].x;
    taktikBildNeu(); await warte(80);
    const nachNeu = { nr: tbBildNr, zahl: tbBilder.length };
    tbField[0].x = vorher + 20; taktikRender(); await warte(60);
    const knoepfe = document.querySelectorAll("#taktik-bilder button").length;
    // Speichern und wieder laden
    const schnapp = ttSnapshot();
    const hatSchritte = Array.isArray(schnapp.schritte) && schnapp.schritte.length === 1;
    const bild1 = schnapp.field[0].x, bild2 = hatSchritte ? schnapp.schritte[0].field[0].x : null;
    // Ein Eintrag ohne Bilder lädt wie bisher
    tbBilder = []; tbBildNr = 0; taktikRender(); await warte(60);
    const ohneBilder = document.querySelectorAll("#taktik-bilder button").length;
    return { nachNeu, knoepfe, hatSchritte, bild1, bild2, vorher, ohneBilder };
  });
  if (tb.fehlt) probleme.push(tb.fehlt + " fehlt");
  else {
    if (tb.nachNeu.zahl !== 2 || tb.nachNeu.nr !== 1) probleme.push(`Nach „+ Bild“ gibt es ${tb.nachNeu.zahl} Bilder, gewählt ist Bild ${tb.nachNeu.nr + 1}`);
    if (tb.knoepfe < 4) probleme.push(`Die Bilderzeile hat nur ${tb.knoepfe} Knöpfe`);
    if (!tb.hatSchritte) probleme.push("Der gespeicherte Stand trägt die Bilder nicht mit");
    else if (!(tb.bild1 === tb.vorher && tb.bild2 === tb.vorher + 20))
      probleme.push(`Bild 1 steht auf ${tb.bild1}, Bild 2 auf ${tb.bild2} – erwartet ${tb.vorher} und ${tb.vorher + 20}`);
    if (tb.ohneBilder !== 1) probleme.push(`Ohne Bilder zeigt die Zeile ${tb.ohneBilder} Knöpfe statt nur „+ Bild“`);
    if (!probleme.length) zeilen.push("Taktikboard: „+ Bild“ trennt die Stände, Speichern nimmt sie mit, ohne Bilder bleibt alles wie bisher");
  }
  const f2 = s.fehler();
  if (f2.length && !probleme.some(p => /Konsole/.test(p))) probleme.push("Konsole: " + f2[0]);
  await s.schliessen();

  // ── c) Weniger Bewegung ───────────────────────────────────────────────────
  const rm = await h.starten({ hoehe: 1500, supabase: attrappe });
  await rm.page.emulateMedia({ reducedMotion: "reduce" });
  await h.sichtbarMachen(rm.page, "#view-formen");
  const geschnitten = await rm.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const alle = tpAllForms() || [];
    const idx = alle.findIndex(f => skzSpecVon(f));
    alle[idx].skizze = { s: [[60, 60, "g", "A"]], b: [[68, 68]], schritte: [{ s: [[60, 120, "g", "A"]] }] };
    skzGrossOpen(idx); await warte(150);
    const sanft = _skzSanft();
    /* Beim Schneiden steht zwischen den Bildern nie ein Zwischenwert im Bild. */
    const gesehen = new Set();
    const beobachter = setInterval(() => {
      const t = (document.querySelector("#skz-gross-halter svg text") || {}).textContent;
      const c = document.querySelector('#skz-gross-halter circle[r="8"]');
      if (c) gesehen.add(c.getAttribute("cy"));
    }, 40);
    [...document.querySelectorAll("#skz-gross-bilder button")].find(b => /Abspielen/.test(b.textContent)).click();
    await warte(3200);
    clearInterval(beobachter);
    const r = { sanft, werte: [...gesehen], bild: _skzGr ? _skzGr.bild : -1 };
    skzGrossClose();
    return r;
  });
  if (geschnitten.sanft) probleme.push("Die Einstellung „weniger Bewegung“ wird nicht erkannt");
  else {
    const zwischen = geschnitten.werte.filter(v => v !== "60" && v !== "120");
    if (zwischen.length) probleme.push("Trotz „weniger Bewegung“ standen Zwischenwerte im Bild: " + zwischen.slice(0, 3).join(", "));
    if (geschnitten.bild !== 1) probleme.push(`Mit „weniger Bewegung“ endet der Lauf auf Bild ${geschnitten.bild + 1} statt Bild 2`);
    if (!probleme.length) zeilen.push(`Weniger Bewegung: geschnitten statt geglitten, nur die Stände ${geschnitten.werte.join(" und ")}`);
  }
  const f3 = rm.fehler();
  if (f3.length && !probleme.some(p => /Konsole/.test(p))) probleme.push("Konsole (weniger Bewegung): " + f3[0]);
  await rm.schliessen();

  return h.ergebnis("Skizze abspielen: Überblenden, Anhalten, Taktikboard mit Bildern", !probleme.length, zeilen.concat(probleme));
};
