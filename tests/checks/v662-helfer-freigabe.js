/* v662 · „Wer hilft mit?“ nur mit Freigabe des Trainers
   PO 28.09.: „hier sollte es nur eine Auswahl geben, wenn wir das in der Trainer-App freigeben
   bzw. die Hilfe brauchen. Kann Aufbau und Abbau betreffen. Ebenso bei Spieltagen und Festivals.
   Und auch andere Dinge könnten wir dort als Trainer eintragen.“ Kacheln: „Ja, mit Anzahl“,
   „Etwas anderes eintragen“ nur bei Freigabe.
   a) Termin ohne Freigabe: weder Kachel noch Termin-Fenster zeigen Aufgaben oder ein Freifeld
   b) Mit Freigabe: nur die freigegebenen Aufgaben, je „x von n“; eine volle Aufgabe lässt sich
      nicht mehr antippen; eigene Aufgaben des Trainers erscheinen; Freifeld nur jetzt
   c) Trainer-Editor: Haken und Zahl ergeben termine.helfer_aufgaben, nichts angehakt = null
   d) Migration: Spalte mit Array-Prüfung */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const datum = h.tagePlus(2);
  const helfer = [{ id: 1, name: "Familie A", aufgabe: "🛠️ Aufbau", user_id: "x1" }, { id: 2, name: "Familie B", aufgabe: "🛠️ Aufbau", user_id: "x2" }];
  {
    const s = await h.starten({ start: "/eltern/index.html", warten: 900,
      supabase: h.supabaseAttrappe({ event_helfer: u => /termin_id=eq\.5/.test(u.search) ? helfer : [] }) });
    const r = await s.page.evaluate(async datum => {
      const warte = ms => new Promise(r => setTimeout(r, ms));
      const box = id => { let b = document.getElementById(id); if (!b) { b = document.createElement("div"); b.id = id; document.body.appendChild(b); } return b; };
      const td = box("td-helfer"), k = box("helfer-card");
      const ohne = { id: 5, typ: "training", datum, uhrzeit: "16:45" };
      await tdHelferLoad(Object.assign({}, ohne, { id: 6 })); await elternHelferKachelLoad(ohne); await warte(50);
      const a = { td: td.textContent.trim(), k: k.textContent.trim(), frei: !!document.querySelector("#helfer-eigen-td,#helfer-eigen-btn") };
      const mit = Object.assign({}, ohne, { helfer_aufgaben: [{ t: "🛠️ Aufbau", n: 2 }, { t: "🧹 Abbau", n: 3 }, { t: "📌 Kuchen fürs Fest", n: 1 }] });
      await tdHelferLoad(mit); await elternHelferKachelLoad(mit); await warte(50);
      const kText = k.textContent.replace(/\s+/g, " "), tdText = td.textContent.replace(/\s+/g, " ");
      const knoepfe = [...k.querySelectorAll("button[onclick*='tdHelferAdd(']")].map(b => b.textContent.replace(/\s+/g, " ").trim());
      return { a, kText, tdText, knoepfe, freiTd: !!document.getElementById("helfer-eigen-td"), freiK: !!document.getElementById("helfer-eigen-btn") };
    }, datum);
    const f = s.fehler(); await s.schliessen();
    if (r.a.td || r.a.k || r.a.frei) probleme.push(`a) Ohne Freigabe steht etwas da: „${(r.a.td + r.a.k).slice(0, 80)}“`);
    if (/Funino-Tore|Jugendtore|Betreuung|Live-Ticker/.test(r.kText)) probleme.push("b) Nicht freigegebene Aufgaben erscheinen");
    if (!/2 von 2 · voll/.test(r.kText)) probleme.push("b) Volle Aufgabe nicht als „2 von 2 · voll“ gekennzeichnet: " + r.kText.slice(0, 160));
    if (r.knoepfe.some(t => /Aufbau/.test(t))) probleme.push("b) Volle Aufgabe lässt sich noch antippen");
    if (!r.knoepfe.some(t => /Abbau/.test(t) && /0 von 3/.test(t))) probleme.push("b) Abbau fehlt oder ohne „0 von 3“: " + r.knoepfe.join(" | "));
    if (!r.knoepfe.some(t => /Kuchen fürs Fest/.test(t))) probleme.push("b) Eigene Aufgabe des Trainers fehlt");
    if (!r.freiTd || !r.freiK) probleme.push("b) „Etwas anderes eintragen“ fehlt trotz Freigabe");
    if (!/voll \(2 von 2\)/.test(r.tdText)) probleme.push("b) Termin-Fenster zeigt die volle Aufgabe nicht als voll");
    if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`a/b) ohne Freigabe leer · Kachel: ${r.knoepfe.join(" | ")}`);
  }
  {
    const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    await s.page.waitForTimeout(3500);
    const r = await s.page.evaluate(() => {
      const d = document.createElement("div");
      d.innerHTML = tmHelferFreigabeHtml({ typ: "spiel", helfer_aufgaben: [{ t: "🛠️ Aufbau", n: 3 }, { t: "📌 Kuchen", n: 2 }] });
      document.body.appendChild(d);
      const vorlagen = [...d.querySelectorAll(".te-hf-an")].map(c => c.dataset.t + (c.checked ? "✓" : ""));
      const eigen = d.querySelector(".te-hf-eigen").value;
      d.querySelector('.te-hf-an[data-t="🧹 Abbau"]').checked = true;
      d.querySelector('.te-hf-n[data-t="🧹 Abbau"]').value = "4";
      const gelesen = tmHelferFreigabeLesen();
      d.querySelectorAll(".te-hf-an").forEach(c => c.checked = false); d.querySelectorAll(".te-hf-eigen").forEach(e => e.value = "");
      const leer = tmHelferFreigabeLesen();
      const hoehen = [...d.querySelectorAll("input")].map(i => Math.round(i.getBoundingClientRect().height)).filter(x => x > 0 && x < 44 && x !== 22);
      d.remove();
      return { vorlagen, eigen, gelesen, leer, hoehen };
    });
    const f = s.fehler(); await s.schliessen();
    if (!r.vorlagen.includes("🛠️ Aufbau✓") || !r.vorlagen.some(v => v.startsWith("🧹 Abbau"))) probleme.push("c) Vorlagen fürs Spiel unvollständig: " + r.vorlagen.join(", "));
    if (r.eigen !== "Kuchen") probleme.push("c) Eigene Aufgabe wird nicht vorbelegt");
    const g = JSON.stringify(r.gelesen);
    if (!/"🛠️ Aufbau","n":3/.test(g) || !/"🧹 Abbau","n":4/.test(g) || !/"📌 Kuchen","n":2/.test(g)) probleme.push("c) Freigabe falsch gelesen: " + g);
    if (r.leer !== null) probleme.push("c) Nichts angehakt ergibt nicht null");
    if (r.hoehen.length) probleme.push("c) Eingaben unter 44 px: " + r.hoehen.join("/"));
    if (f.length) probleme.push("c) Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`c) Editor: ${r.vorlagen.length} Vorlagen · gelesen ${g}`);
  }
  const sql = fs.readFileSync(path.join(h.REPO, "supabase/migrations/20260928_v662_helfer_freigabe.sql"), "utf8");
  if (!/add column if not exists helfer_aufgaben jsonb/.test(sql) || !/jsonb_typeof\(helfer_aufgaben\) = 'array'/.test(sql)) probleme.push("d) Migration unvollständig");
  return h.ergebnis("v662 Wer hilft mit? nur mit Freigabe", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
