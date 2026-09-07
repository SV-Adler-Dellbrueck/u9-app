/* v471 – PO: „das To-Do von der Startseite wird nicht gelöscht … und die Bewertungen werden
   einfach nacheinander aufgelistet."
   Zwei Fehler. (1) Das To-Do „Ergebnis & Bericht nachtragen" verschwindet erst mit einem
   eingetragenen Ergebnis – der Knopf fuehrte aber ins Blitz-Rating, wo es gar kein
   Ergebnisfeld gibt. Es liess sich durch Antippen nie erledigen, und verzichten ging auch
   nicht. (2) Jede Blitz-Bewertung legte eine NEUE Zeile an: ein zweiter Durchgang ergab
   22 Zeilen fuer 11 Kinder, die in der Auswertung doppelt zaehlten. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const spiel = { id: 77, datum: gestern, typ: "spiel", titel: "Sommer Cup", gegner: "VFB05",
                  uhrzeit_ende: "12:00", ergebnis: "", ohne_ergebnis: false };

  async function todos(ohneErgebnis) {
    const s = await h.starten({ supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      profiles: [{ name: "Charles", rolle: "trainer" }],
      termine: u => {
        const typ = (u.searchParams.get("typ") || "");
        if (!/spiel|turnier/.test(typ)) return [];
        return [{ ...spiel, ohne_ergebnis: ohneErgebnis }];
      }
    }), hoehe: 1600 });
    const r = await s.page.evaluate(async () => {
      let slot = document.getElementById("trainer-todo-slot");
      if (!slot) { slot = document.createElement("div"); slot.id = "trainer-todo-slot"; document.body.appendChild(slot); }
      window.trainerMe = async () => "Charles";
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      await trainerTodoLoad();
      const knoepfe = [...slot.querySelectorAll("button")];
      const haupt = knoepfe.find(b => /nachtragen/.test(b.textContent || ""));
      const haken = knoepfe.find(b => (b.textContent || "").trim() === "✓");
      return { text: slot.textContent.replace(/\s+/g, " ").trim(),
        ziel: haupt ? haupt.getAttribute("onclick") : null,
        haken: haken ? haken.getAttribute("onclick") : null,
        hakenHoehe: haken ? parseInt(getComputedStyle(haken).minHeight) : 0,
        abhaken: typeof todoOhneErgebnis === "function" };
    });
    let gesendet = [];
    if (!ohneErgebnis && r.haken) {
      await s.page.evaluate(() => { todoOhneErgebnis(77); });
      await s.page.waitForTimeout(400);
      gesendet = s.gesendet.filter(g => /termine/.test(g.pfad || "") && g.methode === "PATCH");
    }
    const fehler = s.fehler(); await s.schliessen();
    return { ...r, gesendet, fehler };
  }

  const offen = await todos(false);
  const abgehakt = await todos(true);

  if (!/nachtragen/.test(offen.text)) probleme.push("To-Do fehlt, obwohl das Spiel kein Ergebnis hat: " + offen.text.slice(0, 100));
  if (/blitz/.test(offen.ziel || "")) probleme.push(`Antippen führt weiter ins Blitz-Rating (${offen.ziel}) – dort gibt es kein Ergebnisfeld`);
  if (!/tmDetailOpen/.test(offen.ziel || "")) probleme.push(`Antippen führt nicht zum Termin-Detail: ${offen.ziel}`);
  if (!offen.abhaken) probleme.push("todoOhneErgebnis gibt es nicht – abhaken unmöglich");
  if (!offen.haken) probleme.push("kein Haken-Knopf am To-Do");
  if (offen.hakenHoehe < 44) probleme.push(`Haken-Knopf nur ${offen.hakenHoehe} px hoch (mindestens 44)`);
  const patch = (offen.gesendet[0] || {}).body || {};
  if (patch.ohne_ergebnis !== true) probleme.push(`Abhaken schickt ${JSON.stringify(patch)}, erwartet {ohne_ergebnis:true}`);
  if (/nachtragen/.test(abgehakt.text)) probleme.push("abgehaktes To-Do steht weiter da: " + abgehakt.text.slice(0, 100));

  // (2) Blitz-Bewertung: ersetzen statt anfügen
  const b = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), blitz_ratings: [] }), hoehe: 1400 });
  await b.page.evaluate(async K => {
    await loadKader();
    if (typeof blitzPlayers !== "undefined") { blitzPlayers.length = 0; blitzPlayers.push(K[0]); }
    if (typeof blitzIdx !== "undefined") blitzIdx = 0;
    if (typeof blitzRate === "function") await blitzRate();
  }, K);
  await b.page.waitForTimeout(400);
  const bp = b.gesendet.filter(g => /blitz_ratings/.test(g.pfad || ""));
  const fehlerB = b.fehler(); await b.schliessen();
  if (!bp.length) probleme.push("keine Blitz-Bewertung gesendet");
  else if (!/on_conflict=datum,spieler,autor/.test((bp[0].pfad || "") + (bp[0].suche || ""))) probleme.push(`Blitz-Bewertung fügt an statt zu ersetzen: ${bp[0].pfad}${bp[0].suche || ""}`);
  if (offen.fehler.length) probleme.push(...offen.fehler.slice(0, 2));
  if (fehlerB.length) probleme.push(...fehlerB.slice(0, 2));

  zeilen.push(`To-Do offen: Ziel ${offen.ziel} · Haken ${offen.haken} (${offen.hakenHoehe} px)`);
  zeilen.push(`Abhaken schickt ${JSON.stringify(patch)} · danach sichtbar: ${/nachtragen/.test(abgehakt.text)}`);
  zeilen.push(`Blitz-Bewertung an ${(bp[0] || {}).pfad}${(bp[0] || {}).suche || ""}`);
  return h.ergebnis("To-Do lässt sich abhaken und führt zum Ergebnis · Blitz-Bewertung ersetzt", !probleme.length, zeilen.concat(probleme));
};
