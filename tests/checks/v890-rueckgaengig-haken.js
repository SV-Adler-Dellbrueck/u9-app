/* v890 · Bestandsaufnahme 4.8, Schritt 9 – Fehlerbild 2: Rückgängig nach „Block löschen“.

   Bis v889 kamen die Torwart-Haken eines gelöschten Blocks beim Rückgängig als Vorgabe zurück –
   alle angehakt, auch wer vorher abgewählt war (Golden G10). Seit v890 stehen sie so da wie vor
   dem Löschen (Beschluss Charles 19.11.).

   a) Torwart-Block mit Kind B abgewählt → löschen → Rückgängig: Zustand, Haken auf der Seite und
      verzögert gespeicherter Slot tragen nur Kind A.
   b) Gegenprobe: ein Torwart-Block, an dem nie ein Haken geändert wurde, kommt mit der Vorgabe
      zurück (alle angebotenen Torhüter). Gegen v889 ist a) rot. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");

module.exports = async function (h) {
  const titel = "4.8 Schritt 9 · Fehlerbild 2: Rückgängig nach Block löschen stellt die Torwart-Haken wieder her";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const s = await golden.seite(h, { id: "v890" });
  const p = s.page;
  const loeschenUndZurueck = () => p.evaluate(() => {
    tpRemoveSlot(tpSlots.findIndex(x => x.typ === "tw"));
    const weg = tpSlots.findIndex(x => x.typ === "tw") < 0;
    const k = [...document.querySelectorAll("#undo-toast button")].find(x => /Rückgängig/.test(x.textContent)); if (k) k.click();
    const tw = tpSlots.findIndex(x => x.typ === "tw");
    return { weg, tw, an: tpTwAn(tw), seite: [...document.querySelectorAll(`.tp-tw-player[data-slot="${tw}"]`)].map(c => c.value + ":" + c.checked),
      pruefen: tpZustandPruefen({ fremd: true }), idA: kidListToIds(["Kind A"]), idAB: kidListToIds(["Kind A", "Kind B"]) };
  });
  try {
    await p.evaluate(async () => {
      await tpGenerate();
      tpDoAddSlot("tw"); const tw = tpSlots.findIndex(x => x.typ === "tw");
      const b = document.querySelector(`.tp-tw-player[data-slot="${tw}"][value="Kind B"]`); b.checked = false; b.dispatchEvent(new Event("change"));
      tpSetCoach(`tp-form-${tw}-0`, "Kenneth");
    });
    await golden.ruhe(s);
    const n0 = tpPosts(s).length;
    const a = await loeschenUndZurueck();
    await golden.ruhe(s);
    const posts = tpPosts(s).slice(n0), body = posts.length ? posts[posts.length - 1].body : null;
    const slot = body && body.slots.find(x => x.typ === "tw");
    pruef(a.weg && a.tw >= 0, `a) Torwart-Block gelöscht und per Rückgängig zurück (Stelle ${a.tw})`);
    pruef(JSON.stringify(a.an) === '["Kind A"]' && JSON.stringify(a.seite) === '["Kind A:true","Kind B:false"]' && !a.pruefen.length,
      `a) Haken wie vor dem Löschen: Zustand ${JSON.stringify(a.an)}, Seite ${JSON.stringify(a.seite)}${a.pruefen.length ? " · " + a.pruefen[0] : ""}`);
    pruef(!!slot && JSON.stringify(slot.tw) === JSON.stringify(a.idA), `a) gespeichert (verzögert): tw ${JSON.stringify(slot && slot.tw)} (soll ${JSON.stringify(a.idA)})`);

    /* b) Haken wieder an (per Ereignis) und zurück auf die Vorgabe: kommt als „alle“ zurück */
    await p.evaluate(() => { const tw = tpSlots.findIndex(x => x.typ === "tw"); tpTwSetzen(tw, null); tpGeaendert({ speichern: "nein" }); });
    const b = await loeschenUndZurueck();
    pruef(JSON.stringify(b.an) === '["Kind A","Kind B"]' && JSON.stringify(b.seite) === '["Kind A:true","Kind B:true"]',
      `b) nie geänderte Haken kommen als Vorgabe zurück: ${JSON.stringify(b.an)}`);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
