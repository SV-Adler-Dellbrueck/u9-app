/* v591 · Die Karte „Kinder-App" im Eltern-Bereich
   Sie erzeugt den Kopplungscode, zeigt gekoppelte Geraete und stellt die Appzeit ein.
   Gemessen wird am DOM und an dem, was die App WIRKLICH an Supabase schickt:
   - Der Code darf die App nie verlassen. In die Datenbank geht ausschliesslich sein
     SHA-256 - steht die Ziffernfolge im Rumpf, waere der Schutz wertlos.
   - Die Appzeit ist ein Tagesbudget am Geraet; der Schieber schreibt tageslimit_min.
   - Trennen setzt aktiv=false und fragt in einem EIGENEN Fenster (Systemdialoge sind im
     Eltern- und Kinderbereich ausgeschlossen, CLAUDE.md). */
"use strict";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const KIND = { spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 1 } };

  async function karte(konten, sitzungen) {
    const s = await h.starten({
      start: "/eltern/index.html", warten: 900,
      supabase: h.supabaseAttrappe({ kind_konto: konten || [], kind_sitzung: sitzungen || [], kader: h.kaderZeilen() })
    });
    await s.page.evaluate(k => {
      window.sbToken = () => "a.eyJzdWIiOiJlbHRlcm4tdWlkIiwiZW1haWwiOiJlQGUuZGUifQ.b";
      window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" });
      window._elternKids = [k];
    }, KIND);
    const da = await s.page.evaluate(async () => {
      if (typeof kinderAppOpen !== "function") return "kinderAppOpen fehlt";
      kinderAppOpen();
      for (let i = 0; i < 60 && !document.getElementById("ka-body"); i++) await new Promise(r => setTimeout(r, 50));
      for (let i = 0; i < 40 && /Lädt/.test(document.getElementById("ka-body")?.textContent || ""); i++) await new Promise(r => setTimeout(r, 50));
      return document.getElementById("ka-body") ? "ok" : "kein ka-body";
    });
    return { s, da };
  }

  // ── a) ohne Geraet: Hinweis und Kopplung, der Code geht nur als Hash raus ──────
  {
    const { s, da } = await karte([], []);
    if (da !== "ok") probleme.push("Kinder-App-Karte öffnet nicht: " + da);
    else {
      const r = await s.page.evaluate(async () => {
        const out = {};
        const b = document.getElementById("ka-body");
        out.text = (b.textContent || "").replace(/\s+/g, " ");
        const knopf = [...b.querySelectorAll("button")].find(x => /koppeln/i.test(x.textContent));
        out.knopfHoehe = knopf ? Math.round(knopf.getBoundingClientRect().height) : 0;
        if (knopf) knopf.click();
        for (let i = 0; i < 40 && !/gültig noch/.test(document.getElementById("ka-body").textContent); i++) await new Promise(r => setTimeout(r, 50));
        const gross = [...b.querySelectorAll("div")].map(d => d.textContent.trim()).find(t => /^\d{6}$/.test(t));
        out.code = gross || "";
        out.uhr = /gültig noch \d+:\d\d Minuten/.test(b.textContent);
        return out;
      });
      const post = s.gesendet.filter(x => /kind_kopplung/.test(x.pfad) && x.methode === "POST");
      zeilen.push(`a) ohne Gerät: „${(r.text || "").slice(0, 46)}…" · Knopf ${r.knopfHoehe} px · Code ${r.code ? "6-stellig" : "fehlt"}`);
      if (!/Noch kein Gerät gekoppelt/.test(r.text)) probleme.push("a) der leere Zustand nennt nicht, dass noch kein Gerät gekoppelt ist");
      if (r.knopfHoehe < 44) probleme.push(`a) Koppeln-Knopf nur ${r.knopfHoehe} px (mindestens 44)`);
      if (!/^\d{6}$/.test(r.code)) probleme.push("a) es steht kein sechsstelliger Code auf dem Bildschirm");
      if (!r.uhr) probleme.push("a) die Gültigkeitsuhr läuft nicht");
      if (post.length !== 1) probleme.push(`a) ${post.length} Schreibzugriffe auf kind_kopplung statt einem`);
      else {
        const body = post[0].body || {};
        const hash = String(body.code_hash || "");
        if (!/^[0-9a-f]{64}$/.test(hash)) probleme.push("a) code_hash ist kein SHA-256 in hex: " + hash.slice(0, 20));
        const roh = JSON.stringify(body);
        if (r.code && roh.includes(r.code)) probleme.push("a) der Klartext-Code steht im Rumpf – er darf die App nie verlassen");
        if (Number(body.spieler_id) !== 1) probleme.push("a) der Code hängt nicht am eigenen Kind");
        const min = (new Date(body.gueltig_bis) - Date.now()) / 60000;
        if (!(min > 13 && min < 16)) probleme.push(`a) Gültigkeit ${Math.round(min)} Minuten statt 15`);
        zeilen.push(`   geschrieben: Hash 64 hex, Klartext nicht im Rumpf, gültig ${Math.round(min)} Min.`);
      }
      const fehler = s.fehler(); if (fehler.length) probleme.push("a) Konsole: " + fehler.slice(0, 2).join(" | "));
    }
    await s.schliessen();
  }

  // ── b) mit Geraet: Schieber schreibt die Appzeit, Trennen fragt im eigenen Fenster ─
  {
    const konto = { uid: "kind-uid-1", spieler_id: 1, geraet: "Tablet", tageslimit_min: 60, aktiv: true, gekoppelt_am: new Date().toISOString() };
    const { s, da } = await karte([konto], [{ uid: "kind-uid-1", minuten: 25 }]);
    if (da !== "ok") probleme.push("b) Kinder-App-Karte öffnet nicht: " + da);
    else {
      const r = await s.page.evaluate(async () => {
        const out = {}, b = document.getElementById("ka-body");
        out.text = (b.textContent || "").replace(/\s+/g, " ");
        const schieber = b.querySelector('input[type="range"]');
        out.schieber = !!schieber;
        if (schieber) {
          out.wert = schieber.value; out.max = schieber.max; out.schritt = schieber.step;
          out.hoehe = Math.round(schieber.getBoundingClientRect().height);
          schieber.value = "90";
          schieber.dispatchEvent(new Event("change", { bubbles: true }));
          await new Promise(r => setTimeout(r, 400));
        }
        const trennen = [...b.querySelectorAll("button")].find(x => /trennen/i.test(x.textContent));
        out.trennenHoehe = trennen ? Math.round(trennen.getBoundingClientRect().height) : 0;
        if (trennen) trennen.click();
        await new Promise(r => setTimeout(r, 200));
        const frage = document.getElementById("ka-frage");
        out.eigenesFenster = !!frage && frage.getAttribute("role") === "dialog" && frage.getAttribute("aria-modal") === "true";
        const ja = frage ? [...frage.querySelectorAll("button")].find(x => /^Trennen$/.test(x.textContent.trim())) : null;
        if (ja) { ja.click(); await new Promise(r => setTimeout(r, 400)); }
        return out;
      });
      const patches = s.gesendet.filter(x => /kind_konto/.test(x.pfad) && x.methode === "PATCH");
      zeilen.push(`b) mit Gerät: „${(r.text || "").slice(0, 60)}…" · Schieber ${r.wert}/${r.max} Schritt ${r.schritt}, ${r.hoehe} px`);
      if (!/heute 25 von 60 Min/.test(r.text)) probleme.push("b) die heute genutzte Zeit steht nicht an der Zeile");
      if (!/noch 35 Min\. heute/.test(r.text)) probleme.push("b) die Restzeit wird nicht als Wort gezeigt (Farbe allein trägt nicht)");
      if (!r.schieber) probleme.push("b) kein Schieber für die Appzeit");
      if (r.max !== "180" || r.schritt !== "15") probleme.push(`b) Schieber ${r.max}/${r.schritt} statt 180/15`);
      if (r.hoehe < 44) probleme.push(`b) Schieber nur ${r.hoehe} px (mindestens 44)`);
      if (r.trennenHoehe < 44) probleme.push(`b) Trennen-Knopf nur ${r.trennenHoehe} px (mindestens 44)`);
      if (!r.eigenesFenster) probleme.push("b) Trennen fragt nicht in einem eigenen role=dialog-Fenster");
      const limit = patches.find(p => p.body && p.body.tageslimit_min !== undefined);
      const aus = patches.find(p => p.body && p.body.aktiv === false);
      if (!limit || Number(limit.body.tageslimit_min) !== 90) probleme.push("b) der Schieber schreibt kein tageslimit_min 90");
      if (!limit || !/uid=eq\.kind-uid-1/.test(limit.suche || "")) probleme.push("b) die Appzeit trifft nicht genau dieses Gerät");
      if (!aus) probleme.push("b) Trennen setzt nicht aktiv=false");
      zeilen.push(`   geschrieben: tageslimit_min ${limit ? limit.body.tageslimit_min : "–"} · aktiv ${aus ? "false" : "–"}`);
      const fehler = s.fehler(); if (fehler.length) probleme.push("b) Konsole: " + fehler.slice(0, 2).join(" | "));
    }
    await s.schliessen();
  }

  return h.ergebnis("Kinder-App: Karte der Eltern (Code, Appzeit, Trennen)", probleme.length === 0, zeilen.concat(probleme));
};
