/* v895 · Bestandsaufnahme 4.8, Schritt 9 – Fehlerbild 7: automatisch speichern.

   Bis v894 speicherten Dauer ändern (tpSetDauer), Block hinzufügen (tpDoAddSlot), „läuft parallel zu“,
   Torwart-Haken, Einzelkind und Ziel-Dauer nicht von selbst – ging danach nichts mehr, war die Änderung
   weg (Golden G2/G6/G8). Seit v895 speichern sie verzögert wie die übrigen Änderungen (Beschluss
   Charles 19.11.).

   a) Jede der sechs Stellen, wie ein Trainer bedient (Ereignis bzw. Knopf-Funktion), führt ohne
      „Plan speichern“ zu genau einem verzögerten POST, der die Änderung trägt.
   b) Schutzregel: ein leerer Plan ohne Zuordnung wird nie automatisch über einen vollen geschrieben –
      die Ziel-Dauer bei leerem Plan schreibt nichts.
   Gegen v894 rot. */
"use strict";
const golden = require("./v877-trainingsplan-golden.js").intern;
const tpPosts = s => s.gesendet.filter(g => /\/rest\/v1\/trainingsplan$/.test(g.pfad) && g.methode === "POST");

module.exports = async function (h) {
  const titel = "4.8 Schritt 9 · Fehlerbild 7: Dauer, neuer Block, parallel, Torwart-Haken, Einzelkind und Ziel-Dauer speichern automatisch";
  const zeilen = []; let ok = true;
  const pruef = (bed, text) => { zeilen.push((bed ? "✓ " : "✗ ") + text); if (!bed) ok = false; };
  const s = await golden.seite(h, { id: "v895" });
  const p = s.page;
  /* Ein Schritt: tun, dann auf den verzögerten POST warten (höchstens 4 s) und Ruhe abwarten. */
  const schritt = async (name, tun, pruefKoerper, arg) => {
    const n0 = tpPosts(s).length;
    await p.evaluate(tun, arg);
    const t = Date.now(); while (tpPosts(s).length === n0 && Date.now() - t < 4000) await new Promise(r => setTimeout(r, 50));
    await golden.ruhe(s);
    const neu = tpPosts(s).slice(n0), b = neu.length ? neu[neu.length - 1].body : null;
    let bed = false; try { bed = !!b && await pruefKoerper(b); } catch (e) {}
    pruef(neu.length === 1 && bed, `a) ${name}: ${neu.length} ${neu.length === 1 ? "Schreibvorgang" : "Schreibvorgänge"} von selbst${b && !bed ? " · Inhalt passt nicht" : ""}`);
  };
  try {
    /* b) zuerst, bei leerem Plan: die Ziel-Dauer schreibt nichts */
    const leer = await p.evaluate(() => ({ plan: tpPlanEntries().length, zuordnung: tpSlotsMitZuordnung().some(x => x.trainer || x.coaches || x.tw || x.kind != null || x.versatz != null) }));
    const n0 = tpPosts(s).length;
    await p.evaluate(() => { const d = document.getElementById("tp-dauer"); d.value = d.options[d.options.length - 1].value; d.dispatchEvent(new Event("change")); });
    await golden.ruhe(s);
    /* Trägt das Grundgerüst schon Trainer-Vorschläge (Zuordnung), darf es wie bisher gespeichert werden –
       geprüft wird die Regel selbst über einen Plan ohne jede Zuordnung. */
    const regel = await p.evaluate(async () => {
      const merk = tpCoaches; tpCoaches = {};
      const zu = tpSlotsMitZuordnung().some(x => x.trainer || x.coaches || x.tw || x.kind != null || x.versatz != null);
      const vor = window.__posts = 0; const echt = window.fetch;
      window.fetch = (u, o) => { if (/trainingsplan/.test(String(u)) && o && o.method === "POST") window.__posts++; return echt(u, o); };
      await tpPlanSave(false);
      window.fetch = echt; tpCoaches = merk;
      return { zu, posts: window.__posts, plan: tpPlanEntries().length };
    });
    pruef(regel.plan === 0 && !regel.zu && regel.posts === 0,
      `b) Schutzregel: leerer Plan ohne Zuordnung wird automatisch nicht geschrieben (${regel.posts} Schreibvorgänge; Ziel-Dauer bei leerem Plan: ${tpPosts(s).length - n0}, Zuordnung durch Trainer-Vorschläge ${leer.zuordnung})`);

    await p.evaluate(async () => { await tpGenerate(); });
    await golden.ruhe(s);
    const si = await p.evaluate(() => tpSlots.findIndex(x => /^Hauptteil 1$/.test(x.label || "")));
    await schritt("Dauer ändern", si => tpSetDauer(si, 17), b => b.slots[si].dauer === 17, si);
    await schritt("Torwart-Block hinzufügen", () => tpDoAddSlot("tw"), b => b.slots.some(x => x.typ === "tw"));
    const h2 = await p.evaluate(() => tpSlots.findIndex(x => /^Hauptteil 2$/.test(x.label || "")));
    await schritt("„läuft parallel zu“", () => {
      const tw = tpSlots.findIndex(x => x.typ === "tw"), ziel = tpSlots.findIndex(x => /^Hauptteil 2$/.test(x.label || ""));
      const ps = document.querySelector(`.tp-slot[data-si="${tw}"] select[onchange*="parallelZu"]`); ps.value = String(ziel); ps.dispatchEvent(new Event("change"));
    }, b => b.slots.find(x => x.typ === "tw").parallelZu === h2);
    await schritt("Torwart-Haken ab", () => {
      const tw = tpSlots.findIndex(x => x.typ === "tw");
      const c = document.querySelector(`.tp-tw-player[data-slot="${tw}"][value="Kind B"]`); c.checked = false; c.dispatchEvent(new Event("change"));
    }, b => JSON.stringify(b.slots.find(x => x.typ === "tw").tw) === "[1]");
    await schritt("Einzelblock hinzufügen", () => tpDoAddSlot("individual"), b => b.slots.some(x => x.typ === "individual"));
    await schritt("Einzelkind wählen", () => {
      const ind = tpSlots.findIndex(x => x.typ === "individual"), sel = document.getElementById(`tp-ind-player-${ind}`);
      sel.value = "Kind E"; sel.dispatchEvent(new Event("change"));
    }, b => b.slots.find(x => x.typ === "individual").kind != null);
    await schritt("Ziel-Dauer", () => { const d = document.getElementById("tp-dauer"); d.value = d.options[0].value; d.dispatchEvent(new Event("change")); }, () => true);
    const fe = s.fehler(); pruef(!fe.length, `keine Fehler in der Konsole${fe.length ? " · " + fe[0] : ""}`);
  } catch (e) {
    pruef(false, "Abbruch – " + String(e.message || e).split("\n")[0]);
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, ok, zeilen);
};
