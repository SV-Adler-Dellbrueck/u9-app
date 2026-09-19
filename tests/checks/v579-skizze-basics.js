/* v579 – Die Basics nach oben, der Trainer aufs Feld, die Abfolge in Zahlen.

   PO am 19.09., nach der ersten Runde mit dem hochkanten Feld:

   „Dann sollten diese Basics auch weiter oben angeordnet sein in der Kacheldarstellung, da
   sie immer eingesetzt werden. Wir brauchen hier Pass, Schuss, Dribbling, also alles, was
   direkt mit dem Ball zu tun hat, und dann Laufwege. Das Icon für den Ball sollte immer
   schwarz sein. Dann brauchen wir noch ein Icon für die Position des Trainers. … zwei, drei
   Basic-Vorlagen … Spielfeld Jugendtore … FUNiño … halbes Feld … Wir brauchen die
   Möglichkeit, Abfolgen darzustellen … im klassischen Sinne alles auf eine Skizze mit einer
   Durchnummerierung. Oder man legt dafür weitere Bilder an."

   Weitere Bilder gibt es seit v557, abspielen seit v558 – gefehlt hat die Nummer am Weg.

   Fälle:
   a) Die vier Wege stehen vor allem anderen außer Verschieben und Entfernen, und der
      Laufweg steht hinter den dreien mit Ball. Die Kacheln tragen Überschriften.
   b) Das Ball-Icon ist nicht mehr der weiße Kreis, der auf hellem Grund verschwand.
   c) Der Trainer steht auf dem Platz, ist vom Dummy zu unterscheiden und wird NICHT als
      Material gezählt – er kommt nicht aus dem Schrank.
   d) Die vier Feld-Vorlagen stehen vorne, bringen keine Spieler mit, und die halben Felder
      stehen hochkant. Eine Vorlage mit eigenem Zuschnitt stellt das Feld, eine ohne folgt
      ihm.
   e) Schritte zählen: aus ist aus, an vergibt 1, 2, 3 in der Reihenfolge des Tippens. Die
      Nummer erscheint im Bild, überlebt die Drehung und gilt nur für Wege.
   f) Ohne Nummer ändert sich an der Zeichnung nichts. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 420, hoehe: 1800, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  const r = await s.page.evaluate(() => {
    const fehlt = ["skzPaletteHtml", "skzZaehlenUm", "skzVorlage", "skzMaterial"].filter(n => typeof window[n] !== "function");
    if (fehlt.length) return { fehlt };
    const out = {};
    const holen = (svg, sel) => { const d = document.createElement("div"); d.innerHTML = svg; return [...d.querySelectorAll(sel)]; };

    // a) + b) Reihenfolge und Icons
    out.reihe = SKZ_WERK.map(w => w.id);
    out.gruppen = SKZ_GRUPPEN.slice();
    out.wege = SKZ_WERK.filter(w => w.feld === "p").map(w => w.id);
    out.ballEmo = (SKZ_WERK.find(w => w.id === "ball") || {}).emo;
    out.ohneGruppe = SKZ_WERK.filter(w => !w.gruppe).map(w => w.id);

    // c) Trainer
    const mitTrainer = { ger: [[60, 90, "trainer", "w"], [120, 90, "dummy", "w"]] };
    const svgT = _skz(mitTrainer);
    const d = document.createElement("div"); d.innerHTML = svgT;
    out.trainerTeile = [...d.querySelectorAll("circle,path,line,rect")].length;
    out.trainerAnders = _skz({ ger: [[60, 90, "trainer", "w"]] }) !== _skz({ ger: [[60, 90, "dummy", "w"]] });
    out.trainerMaterial = skzMaterial(mitTrainer).map(x => x.schluessel);
    out.trainerLegende = /Trainer/.test(skzLegende(false, { ger: [[60, 90, "trainer", "w"]] }));
    out.trainerWerkzeug = !!SKZ_WERK.find(w => w.id === "trainer" && w.feld === "ger" && w.typ === "trainer");

    // d) Feld-Vorlagen
    out.vorlagen = SKZ_VORLAGEN.slice(0, 4).map(v => v.n);
    out.vorlagenLeer = SKZ_VORLAGEN.slice(0, 4).every(v => !(v.spec.s || []).length && !(v.spec.b || []).length);
    out.vorlagenHoch = SKZ_VORLAGEN.slice(0, 4).map(v => !!v.spec.hoch);
    const felder = SKZ_VORLAGEN.slice(0, 4).map(v => ({
      tore: (v.spec.tor || []).length,
      jugend: (v.spec.tor || []).filter(t => t[4] === "j").length,
      mittel: (v.spec.li || []).filter(l => l[4] === "m").length,
      schuss: (v.spec.li || []).filter(l => l[4] === "sz").length
    }));
    out.felder = felder;
    /* Nichts darf außerhalb liegen – ein Tor am Rand ist schnell zu weit draußen. */
    out.vorlagenDrin = SKZ_VORLAGEN.slice(0, 4).every(v => {
      const B = v.spec.hoch ? 180 : 280, H = v.spec.hoch ? 280 : 180;
      return (v.spec.tor || []).every(t => t[0] >= 0 && t[1] >= 0 && t[0] <= B && t[1] <= H)
        && (v.spec.z || []).every(z => z[0] + z[2] <= B && z[1] + z[3] <= H)
        && (v.spec.li || []).every(l => l[0] <= B && l[2] <= B && l[1] <= H && l[3] <= H);
    });

    // e) Editor: Zählen und Vorlagen-Zuschnitt
    skzEditorOpen(null, () => {});
    const ed = {};
    const zb = document.getElementById("skz-zaehlen");
    ed.knopfAus = zb ? zb.textContent.trim() : "";
    ed.hoehe = zb ? Math.round(zb.getBoundingClientRect().height) : 0;
    ed.gruppenKoepfe = [...document.querySelectorAll("#skz-palette div")].map(x => x.textContent.trim()).filter(t => SKZ_GRUPPEN.includes(t));
    ed.kacheln = document.querySelectorAll("#skz-palette button").length;
    /* Getippt wird wirklich: Zeigerereignisse auf die Bühne, an der Stelle, an der der
       Finger läge. Die Rechnung des Editors nachzubauen hieße, die eigene Rechnung zu
       prüfen statt seiner. */
    const buehne = document.getElementById("skz-buehne");
    const tipp = (x, y) => {
      const b = buehne.getBoundingClientRect();
      buehne.dispatchEvent(new PointerEvent("pointerdown", {
        pointerId: 3, bubbles: true, cancelable: true,
        clientX: b.left + b.width * x / _skzB(), clientY: b.top + b.height * y / _skzH()
      }));
    };
    const setzen = (werk, a, b2, c, d2) => { skzSetWerkzeug(werk); tipp(a, b2); tipp(c, d2); };
    setzen("pass", 20, 20, 80, 20);
    ed.ohneNummer = (_skzSpec.p[0] || []).length;
    skzZaehlenUm();
    ed.knopfAn = zb ? zb.textContent.trim() : "";
    setzen("dribbel", 80, 20, 80, 80);
    setzen("lauf", 80, 80, 20, 80);
    ed.nummern = (_skzSpec.p || []).map(e => e[5]);
    ed.imBild = (document.getElementById("skz-buehne").innerHTML.match(/font-weight="700">[12]</g) || []).length;
    // Drehung erhält die Nummern
    skzFormat();
    ed.nachDrehung = (_skzSpec.p || []).map(e => e[5]);
    skzFormat();
    // Vorlage mit eigenem Zuschnitt stellt das Feld
    skzVorlage(2);                       // Halbes Feld: Jugendtor (hochkant)
    ed.vorlageStellt = !!_skzSpec.hoch;
    skzVorlage(0);                       // Feld: Jugendtore (quer)
    ed.vorlageQuer = !_skzSpec.hoch;
    document.getElementById("skz-modal")?.remove();
    out.ed = ed;

    // f) ohne Nummer unverändert
    out.ohneNrGleich = _skz({ p: [[20, 20, 80, 20, "p"]] }) === _skz({ p: [[20, 20, 80, 20, "p", 0]] });
    out.mitNrAnders = _skz({ p: [[20, 20, 80, 20, "p"]] }) !== _skz({ p: [[20, 20, 80, 20, "p", 1]] });
    return out;
  });

  const fehler = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("Skizze: Basics, Trainer, Abfolge", false, [r.fehlt.join(", ") + " fehlt"]);
  const ed = r.ed || {};

  // a) + b)
  if (String(r.ohneGruppe) !== "move,del") probleme.push(`Ohne Überschrift stehen ${r.ohneGruppe.join(", ")} statt Verschieben und Entfernen`);
  if (String(r.wege) !== "pass,dribbel,schuss,lauf") probleme.push(`Die Wege stehen als ${r.wege.join(", ")} – erst der Ball, dann der Laufweg`);
  const ersteWege = r.reihe.slice(2, 6).join(",");
  if (ersteWege !== "pass,dribbel,schuss,lauf") probleme.push(`Nach Verschieben und Entfernen kommen ${ersteWege} statt der vier Wege`);
  if (r.gruppen[0] !== "Ball und Wege") probleme.push(`Die erste Überschrift heißt „${r.gruppen[0]}“`);
  if (r.ballEmo === "⚪") probleme.push("Das Ball-Icon ist weiterhin der weiße Kreis, der auf hellem Grund verschwindet");
  // c)
  if (!r.trainerWerkzeug) probleme.push("Es gibt kein Werkzeug für die Position des Trainers");
  if (!r.trainerAnders) probleme.push("Der Trainer sieht aus wie der Dummy");
  if (r.trainerMaterial.includes("dummy") && r.trainerMaterial.length !== 1) probleme.push(`Die Materialliste zählt ${r.trainerMaterial.join(", ")} – der Trainer kommt nicht aus dem Schrank`);
  if (!r.trainerMaterial.includes("dummy")) probleme.push("Der Dummy wird nicht mehr als Material gezählt");
  if (!r.trainerLegende) probleme.push("In der Legende fehlt der Trainer");
  // d)
  const soll = ["Feld: Jugendtore", "Feld: FUNiño", "Halbes Feld: Jugendtor", "Halbes Feld: FUNiño"];
  if (String(r.vorlagen) !== String(soll)) probleme.push(`Vorne stehen ${r.vorlagen.join(" · ")} statt der vier Felder`);
  if (!r.vorlagenLeer) probleme.push("Eine Feld-Vorlage bringt Spieler oder Bälle mit – auf einem Feld beginnt man ohne");
  if (String(r.vorlagenHoch) !== "false,false,true,true") probleme.push(`Zuschnitte ${r.vorlagenHoch.join(",")} – die halben Felder gehören hochkant`);
  if (!r.vorlagenDrin) probleme.push("Eine Feld-Vorlage liegt teilweise außerhalb des Feldes");
  const f = r.felder || [];
  if (!(f[0] && f[0].jugend === 2 && f[0].mittel === 1)) probleme.push(`Feld Jugendtore: ${f[0] && f[0].jugend} Jugendtore, ${f[0] && f[0].mittel} Mittellinie`);
  if (!(f[1] && f[1].tore === 4 && f[1].mittel === 1 && f[1].schuss === 2)) probleme.push(`Feld FUNiño: ${f[1] && f[1].tore} Tore, ${f[1] && f[1].mittel} Mittellinie, ${f[1] && f[1].schuss} Schusszonen`);
  if (!(f[2] && f[2].jugend === 1 && f[2].mittel === 1)) probleme.push(`Halbes Feld Jugendtor: ${f[2] && f[2].jugend} Tor, ${f[2] && f[2].mittel} Mittellinie`);
  if (!(f[3] && f[3].tore === 2 && f[3].schuss === 1)) probleme.push(`Halbes Feld FUNiño: ${f[3] && f[3].tore} Tore, ${f[3] && f[3].schuss} Schusszone`);
  // e)
  if (!/Schritte zählen/.test(ed.knopfAus || "")) probleme.push(`Der Zähl-Knopf sagt aus „${ed.knopfAus}“`);
  if (!/Zählt mit/.test(ed.knopfAn || "")) probleme.push(`Der Zähl-Knopf sagt an „${ed.knopfAn}“`);
  if ((ed.hoehe || 0) < 44) probleme.push(`Der Zähl-Knopf ist ${ed.hoehe} px hoch`);
  if (ed.ohneNummer !== 5) probleme.push(`Ohne Zählen hat ein Weg ${ed.ohneNummer} Felder statt fünf – die Nummer darf nicht von selbst kommen`);
  if (String(ed.nummern) !== ",1,2") probleme.push(`Nummern ${JSON.stringify(ed.nummern)} statt [ohne], 1, 2`);
  if (!ed.imBild) probleme.push("Die Nummer steht nicht im Bild");
  if (String(ed.nachDrehung) !== String(ed.nummern)) probleme.push("Die Drehung verliert die Nummern");
  if (!ed.vorlageStellt) probleme.push("Eine hochkante Feld-Vorlage stellt das Feld nicht hochkant");
  if (!ed.vorlageQuer) probleme.push("Eine quere Feld-Vorlage legt das Feld nicht quer");
  if (!(ed.gruppenKoepfe || []).length) probleme.push("Die Kacheln stehen ohne Überschriften");
  if (ed.kacheln !== r.reihe.length) probleme.push(`${ed.kacheln} Kacheln statt ${r.reihe.length} – eine Gruppe fehlt am Bildschirm`);
  // f)
  if (!r.ohneNrGleich) probleme.push("Eine Null als Nummer zeichnet trotzdem einen Kreis");
  if (!r.mitNrAnders) probleme.push("Mit Nummer entsteht dasselbe Bild wie ohne");
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);

  if (!probleme.length) {
    zeilen.push(`Kacheln: ${r.ohneGruppe.join(", ")} · ${r.gruppen.join(" · ")} · Wege ${r.wege.join(", ")} · Ball ${r.ballEmo}`);
    zeilen.push(`Trainer: eigenes Werkzeug, vom Dummy unterscheidbar, in der Legende benannt, nicht im Material (${r.trainerMaterial.join(", ") || "nichts"} gezählt)`);
    zeilen.push(`Felder vorne: ${r.vorlagen.join(" · ")} – ohne Spieler, die halben hochkant, nichts außerhalb`);
    zeilen.push(`Abfolge: „${ed.knopfAus}“ ⇄ „${ed.knopfAn}“ · gesetzt ${JSON.stringify(ed.nummern)} · im Bild sichtbar · Drehung erhält sie`);
    zeilen.push("Ohne Nummer entsteht dasselbe Bild wie vorher");
  }
  return h.ergebnis("Skizze: Basics, Trainer, Abfolge", !probleme.length, zeilen.concat(probleme));
};
