/* v507 – PO (mit Bildschirmfoto): „Die Hinweise zum Jubeln und zur Nur-Kinder-und-Trainer-Zone
   sind schwer zu lesen. Die Kinder-und-Trainer-Zone am besten auch über das Funino-2-Feld
   schreiben."
   Zwei Befunde steckten darin. Erstens standen beide Hinweise als nackter Text zwischen den
   Feldern, halb auf dem gruenen Rand – jetzt sind es Schilder mit eigener Flaeche, und das
   obere haengt am oberen Feld selbst. Zweitens – und das sah man erst beim Nachzeichnen –
   lief die Fusszeile ueber den rechten Rand der Zeichnung hinaus und wurde abgeschnitten:
   „…nur Spieler & Trainer – bitte nicht am Feldrand ste". Deshalb misst diese Pruefung jeden
   Text der Skizze am echten SVG und verlangt, dass er INNERHALB der Zeichenflaeche liegt.
   Das faengt jede kuenftige Zeile ab, die zu lang wird – ohne dass jemand hinsehen muss. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), hoehe: 1200 });
  const r = await s.page.evaluate(async () => {
    if (typeof fstSkizzeFelder !== "function") return { fehlt: "fstSkizzeFelder" };
    const F = (...a) => a.map(x => ({ form: x }));
    const wrap = document.createElement("div");
    wrap.style.cssText = "width:420px;position:absolute;left:0;top:0";
    document.body.appendChild(wrap);
    const messen = felder => {
      wrap.innerHTML = fstSkizzeFelder(felder);
      const svg = wrap.querySelector("svg");
      const vb = svg.getAttribute("viewBox").split(/\s+/).map(Number);   // [x y b h]
      /* In Bildschirmpunkten messen, nicht in getBBox: „Parkplatz" steht gedreht, und
         getBBox liefert den Kasten VOR der Drehung – der ragt rechnerisch heraus, in
         Wirklichkeit steht er sauber im Bild. */
      const flaeche = svg.getBoundingClientRect();
      const skala = vb[2] / flaeche.width;
      const box = el => { const b = el.getBoundingClientRect();
        return { x: (b.left - flaeche.left) * skala, y: (b.top - flaeche.top) * skala, b: b.width * skala, h: b.height * skala }; };
      const raus = [], texte = [];
      svg.querySelectorAll("text").forEach(t => {
        const b = box(t);
        texte.push({ txt: t.textContent.trim(), x: Math.round(b.x), y: Math.round(b.y), b: Math.round(b.b) });
        if (b.x < -0.5 || b.x + b.b > vb[2] + 0.5 || b.y + b.h > vb[3] + 0.5)
          raus.push(`„${t.textContent.trim()}“ (x ${Math.round(b.x)}…${Math.round(b.x + b.b)}, unten ${Math.round(b.y + b.h)})`);
      });
      // Der kleinste gefuellte Kasten, der einen Text umschliesst – sein Schild bzw. sein Feld
      const traeger = (t, minH) => {
        const tb = box(t);
        let best = null;
        svg.querySelectorAll("rect").forEach(rc => {
          const rb = box(rc);
          const f = rc.getAttribute("fill");
          if (!f || f === "none") return;
          if (minH && rb.h < minH) return;
          if (rb.x > tb.x + 1 || rb.x + rb.b < tb.x + tb.b - 1 || rb.y > tb.y + 1 || rb.y + rb.h < tb.y + tb.h - 1) return;
          if (!best || rb.b * rb.h < best.b * best.h) best = rb;
        });
        return best;
      };
      const schild = wort => {
        const t = [...svg.querySelectorAll("text")].find(x => new RegExp(wort).test(x.textContent));
        if (!t) return null;
        const tb = box(t), tr = traeger(t, 0);
        return { text: t.textContent.trim(), y: Math.round(tb.y + tb.h / 2), flaeche: !!(tr && tr.b < 200), farbe: t.getAttribute("fill") };
      };
      const feldKasten = name => {
        const t = [...svg.querySelectorAll("text")].find(x => x.textContent.trim() === name);
        if (!t) return null;
        const tr = traeger(t, 40);
        return tr ? { oben: Math.round(tr.y), unten: Math.round(tr.y + tr.h) } : null;
      };
      return { vb, raus, texte, oben: schild("nur Spieler"), vorne: schild("anfeuern"), funino2: feldKasten("Funino 2") };
    };
    const drei = messen(F("f4", "funino", "funino"));
    const vier = messen(F("f4", "funino", "funino", "f4"));
    const zwei = messen(F("f4", "funino"));
    wrap.remove();
    return { drei, vier, zwei };
  });
  const fehler = s.fehler(); await s.schliessen();
  if (r.fehlt) { probleme.push(`${r.fehlt} fehlt`); return h.ergebnis("Schilder in der Feld-Skizze", false, probleme); }

  ["drei", "vier", "zwei"].forEach(k => {
    if (r[k].raus.length) probleme.push(`${k} Felder – Text ragt aus der Zeichnung: ${r[k].raus.join(" · ")}`);
  });
  const d = r.drei;
  if (!d.oben) probleme.push("Das Schild „nur Spieler & Trainer“ fehlt");
  else {
    if (!d.oben.flaeche) probleme.push("„nur Spieler & Trainer“ steht ohne eigene Fläche – auf dem Feld schwer zu lesen");
    if (!d.funino2) probleme.push("Das obere Feld (Funino 2) wurde in der Skizze nicht gefunden");
    else if (d.oben.y < d.funino2.oben || d.oben.y > d.funino2.unten)
      probleme.push(`Das Schild steht auf y=${d.oben.y}, das obere Feld reicht von ${d.funino2.oben} bis ${d.funino2.unten} – es soll auf dem Feld stehen`);
  }
  if (!d.vorne) probleme.push("Das Schild „anfeuern“ fehlt");
  else if (!d.vorne.flaeche) probleme.push("„anfeuern & jubeln“ steht ohne eigene Fläche");
  if (r.zwei.oben) probleme.push("Ohne oberes Feld darf es kein „nur Spieler & Trainer“-Schild geben");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));

  zeilen.push(`Zeichenfläche ${r.drei.vb.join(" ")} · ${r.drei.texte.length} Texte, keiner ragt heraus: ${!r.drei.raus.length}`);
  if (d.oben && d.funino2) zeilen.push(`Oberes Schild „${d.oben.text}“ auf y=${d.oben.y}, Funino 2 von ${d.funino2.oben} bis ${d.funino2.unten} · Fläche ${d.oben.flaeche}`);
  if (d.vorne) zeilen.push(`Vorderes Schild „${d.vorne.text}“ auf y=${d.vorne.y} · Fläche ${d.vorne.flaeche}`);
  return h.ergebnis("Schilder in der Feld-Skizze – lesbar und auf dem Feld", !probleme.length, zeilen.concat(probleme));
};
