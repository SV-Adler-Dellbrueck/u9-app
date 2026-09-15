/* v561 – Soll und Ist nebeneinander, und der Ort statt eines Kästchens.

   Am Handy brach die Posten-Zeile um: „Soll" rutschte nach rechts oben, „Ist" darunter
   nach links, und man musste erst lesen, welches Feld wozu gehört. Zwei Zahlen, die man
   vergleicht, gehören nebeneinander.

   Das Kennzeichen „gehört dem Verein" ist wieder verschwunden. Charles' Begründung ist die
   bessere: wo etwas liegt, sagt der Ort — „Materialschuppen Verein" trägt dieselbe Auskunft
   und muss von niemandem gesetzt werden. Ein Kästchen, das nur eine Ortsangabe ersetzt, ist
   ein Kästchen zu viel.

   Fälle:
   a) Soll und Ist stehen in einer Zeile, gleich breit, beide Felder mindestens 48 px hoch
      und rechtsbündig — Zahlen vergleicht man an der letzten Stelle, nicht an der ersten.
   b) Jedes Feld trägt seine Beschriftung sichtbar UND als aria-label: wer das Feld allein
      hört, muss wissen, ob er Soll oder Ist tippt.
   c) Der Ort erscheint als Hinweiszeile am Posten, und nur wenn einer eingetragen ist.
   d) Nirgends steht mehr ein Kästchen — weder in der Liste noch im Erfassen-Dialog.
   e) Der Erfassen-Dialog kann den Ort setzen, sonst wäre der Hinweis nicht nachbaubar.
   f) Die Materialzeile unter der Skizze sagt nichts mehr über den Verein. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  const s = await h.starten({ hoehe: 1400, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(async () => {
    if (typeof materialOpen !== "function") return { fehlt: "materialOpen" };
    await materialOpen();
    MAT_POSTEN = [
      { id: 901, name: "Hütchen", kategorie: "Hütchen", variante: "rot", ist: null, soll: null, ort: "Kiste im Kofferraum", aktiv: true, sort: 10 },
      { id: 902, name: "Bälle", kategorie: "Bälle", variante: "Größe 4", ist: 9, soll: 12, ort: null, aktiv: true, sort: 20 }
    ];
    materialRender();

    /* Die Kacheln sind die Kästen mit den Zahlenfeldern – nicht der Kopf und nicht die
       Filterleiste, die im selben Behälter stehen. */
    const karten = [...new Set([...document.querySelectorAll('#mat-body input[type="number"]')]
      .map(f => f.closest('div[style*="border-left-width"]')))].filter(Boolean);
    const karte = karten[0], zweite = karten[1];
    const felder = [...karte.querySelectorAll('input[type="number"]')];
    const kasten = document.querySelectorAll('#mat-body input[type="checkbox"]').length;

    const masse = felder.map(f => {
      const k = f.getBoundingClientRect(), st = getComputedStyle(f);
      return { oben: Math.round(k.top), breit: Math.round(k.width), hoch: Math.round(k.height), rechts: st.textAlign, lbl: f.getAttribute("aria-label") || "" };
    });

    const sichtbar = [...karte.querySelectorAll("label span")].map(e => e.textContent.trim());
    const ortZeile = /Kiste im Kofferraum/.test(karte.textContent);
    const ortNurDort = !/Kofferraum/.test(zweite.textContent);
    const fehlmenge = /3 fehlen/.test(zweite.textContent);

    matPostenNeuOpen();
    const imDialog = !!document.getElementById("mn-ort");
    const dialogKasten = document.querySelectorAll('#mat-neu input[type="checkbox"]').length;
    const geraeteSchublade = [...document.querySelectorAll("#mn-kat option")].some(o => o.textContent === "Geräte");
    document.getElementById("mat-neu")?.remove();
    document.getElementById("mat-modal")?.remove();

    return { masse, sichtbar, ortZeile, ortNurDort, fehlmenge, kasten, imDialog, dialogKasten, geraeteSchublade };
  });

  if (r.fehlt) probleme.push(r.fehlt + " fehlt");
  else {
    const [soll, ist] = r.masse;
    if (r.masse.length !== 2) probleme.push(`${r.masse.length} Zahlenfelder je Posten statt zwei`);
    else {
      if (soll.oben !== ist.oben) probleme.push(`Soll und Ist stehen nicht nebeneinander (${soll.oben} px gegen ${ist.oben} px)`);
      if (Math.abs(soll.breit - ist.breit) > 2) probleme.push(`Die beiden Felder sind verschieden breit (${soll.breit} px gegen ${ist.breit} px)`);
      if (Math.min(soll.hoch, ist.hoch) < 48) probleme.push(`Ein Zahlenfeld ist ${Math.min(soll.hoch, ist.hoch)} px hoch – gefordert 48`);
      if (soll.rechts !== "right" || ist.rechts !== "right") probleme.push("Die Zahlen stehen nicht rechtsbündig");
      if (!/Sollbestand/.test(soll.lbl) || !/Istbestand/.test(ist.lbl)) probleme.push("Ein Zahlenfeld sagt allein nicht, ob es Soll oder Ist ist: " + soll.lbl + " · " + ist.lbl);
    }
    if (!r.sichtbar.includes("Soll") || !r.sichtbar.includes("Ist")) probleme.push("Soll oder Ist steht nicht sichtbar am Feld: " + r.sichtbar.join(", "));
    if (!r.ortZeile) probleme.push("Der Ort des Postens erscheint nicht an der Kachel");
    if (!r.ortNurDort) probleme.push("Ein Posten ohne Ort zeigt trotzdem eine Ortszeile");
    if (!r.fehlmenge) probleme.push("Die Fehlmenge aus Soll und Ist wird nicht mehr genannt");
    if (r.kasten) probleme.push(`${r.kasten} Kästchen in der Liste – das Kennzeichen ist gestrichen, der Ort sagt es`);
    if (r.dialogKasten) probleme.push(`${r.dialogKasten} Kästchen im Erfassen-Dialog – gestrichen`);
    if (!r.imDialog) probleme.push("Beim Erfassen lässt sich kein Ort eintragen – der Hinweis wäre nicht nachbaubar");
    if (!r.geraeteSchublade) probleme.push("Die Schublade „Geräte“ fehlt – Stangen und Hürden sind weder Markierung noch Sonstiges");
    if (!probleme.length) zeilen.push(`Kachel: Soll und Ist nebeneinander, je ${soll.breit} × ${soll.hoch} px, rechtsbündig, Ort als Hinweiszeile`);
  }

  // ── f) Die Materialzeile unter der Skizze schweigt über den Verein ────────
  const bedarf = await s.page.evaluate(() => {
    if (typeof matBedarfZeile !== "function") return { fehlt: "matBedarfZeile" };
    MAT_POSTEN = [
      { name: "Stangen", ist: 6, ort: null, aktiv: true },
      { name: "Bälle", ist: 12, ort: null, aktiv: true }
    ];
    const zeile = matBedarfZeile({ ger: [[10, 10, "stange"]], b: [[40, 40], [50, 40]] });
    return {
      ohneVerein: !/Verein/.test(zeile),
      nenntStange: /1 Stange/.test(zeile),
      ohneWarnung: !/es fehlen/.test(zeile)
    };
  });
  if (bedarf.fehlt) probleme.push(bedarf.fehlt + " fehlt");
  else {
    if (!bedarf.ohneVerein) probleme.push("Die Materialzeile spricht weiterhin vom Verein");
    if (!bedarf.nenntStange) probleme.push("Die einzelne Stange wird nicht gegen den Posten „Stangen“ gefunden");
    if (!bedarf.ohneWarnung) probleme.push("Ein ausreichender Bestand wird als Fehlmenge gemeldet");
    if (!probleme.length) zeilen.push("Materialzeile: ohne Vereins-Zusatz, Ein- und Mehrzahl treffen weiterhin");
  }

  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  return h.ergebnis("Material: Soll und Ist nebeneinander, Ort statt Kästchen", !probleme.length, zeilen.concat(probleme));
};
