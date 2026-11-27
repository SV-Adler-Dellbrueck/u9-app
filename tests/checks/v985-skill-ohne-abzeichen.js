/* v985 · Charles 27.11.2026 (Kachel „Skill ohne Abzeichen“; Beschluss 26.11.: „Den Skill des Monats gibt immer ein Trainer frei“):
   Auch ein Skill des Monats OHNE verknüpftes Abzeichen wird beim Training abgenommen – bisher bestätigten ihn die Eltern (50 Federn).
   a) Eltern-Startseite: Karte „⭐ Skill des Monats“ ohne Knöpfe, Hinweis „Abgenommen wird beim Training von einem Trainer – dann gibt es 50 Federn“;
      skillGeschafft gibt es nicht mehr
   b) Kind (Trainingsplatz): „Zeig es deinem Trainer beim Training“; schon abgenommen: „✓ Schon abgenommen“
   c) Trainer, Anwesenheit: „⭐ Skill des Monats abnehmen“ mit Titel und „50 Federn“, anwesende Kinder; abgenommene mit ✓;
      zweimal tippen → genau ein xp_award_event mit Quelle skillwoche und der Skill-Kennung, kein Abzeichen */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const pruef = (bed, ok, nein) => bed ? zeilen.push(ok) : probleme.push(nein);
  const K = h.KINDER;
  const SK = { id: 9, titel: "Ballrollen", beschreibung: "Roll den Ball mit der Sohle.", video_url: null, aktiv: true, abzeichen: null };
  const awards = [];
  const attrappe = () => h.supabaseAttrappe({
    kader: h.kaderZeilen(), skill_woche: () => [SK], abzeichen_meldung: [],
    rpc: { xp_events_for: (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} return b.p_quelle === "skillwoche" && Number(b.p_spieler_id) === 2 ? ["9"] : []; },
      xp_award_event: (u, req) => { let b = {}; try { b = req.postDataJSON() || {}; } catch (e) {} awards.push(b); return 50; } }
  });
  // a) + b) Eltern und Kind
  { const s = await h.starten({ start: "/eltern/index.html", warten: 900, supabase: attrappe() });
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 60 && (typeof elternSkillLoad !== "function" || typeof skillMonatKarteHtml !== "function"); i++) await w(100);
      let slot = document.getElementById("skill-slot"); if (!slot) { slot = document.createElement("div"); slot.id = "skill-slot"; document.body.appendChild(slot); }
      await elternSkillLoad([{ spieler_id: 1, kader: { name: "Kind A" } }]); await w(50);
      const o = { text: slot.textContent.replace(/\s+/g, " "), knoepfe: slot.querySelectorAll("button:not(.skm-player)").length, alt: typeof skillGeschafft };
      const sk = await skillMonatLaden(true);
      await abzeichenStandLaden(1); await abzeichenStandLaden(2);
      const k1 = document.createElement("div"); k1.innerHTML = skillMonatKarteHtml(sk, 1, true);
      const k2 = document.createElement("div"); k2.innerHTML = skillMonatKarteHtml(sk, 2, true);
      o.kind1 = k1.textContent.replace(/\s+/g, " "); o.kind2 = k2.textContent.replace(/\s+/g, " ");
      return o;
    });
    const fe = s.fehler(); await s.schliessen();
    pruef(/Abgenommen wird beim Training von einem Trainer – dann gibt es 50 Federn/.test(r.text) && r.knoepfe === 0 && r.alt === "undefined",
      "a) Eltern: Karte ohne Knopf, „Abgenommen wird beim Training von einem Trainer – dann gibt es 50 Federn“; skillGeschafft entfällt", "a) " + JSON.stringify(r));
    pruef(/Zeig es deinem Trainer beim Training/.test(r.kind1) && /Schon abgenommen/.test(r.kind2),
      "b) Kind: „Zeig es deinem Trainer beim Training“, nach der Abnahme „✓ Schon abgenommen“", "b) " + JSON.stringify({ k1: r.kind1.slice(-90), k2: r.kind2.slice(-60) }));
    if (fe.length) probleme.push("Konsole Eltern: " + fe.slice(0, 2).join(" | ")); }
  // c) Trainer
  { awards.length = 0;
    const s = await h.starten({ supabase: attrappe(), hoehe: 2000 });
    await h.sichtbarMachen(s.page, "#aw-list");
    const r = await s.page.evaluate(async ({ K }) => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 60 && typeof skillAbnahmeRender !== "function"; i++) await w(100);
      await loadKader();
      const heute = isoLokal(), de = document.getElementById("aw-date");
      if (de) { if (![...de.options || []].some(o => o.value === heute)) { const o = document.createElement("option"); o.value = heute; o.textContent = heute; de.appendChild(o); } de.value = heute; }
      AW_DATA[heute] = {}; [K[0], K[1], K[2]].forEach(n => AW_DATA[heute][n] = { da: true, qual: 0 });
      awRenderList(); await w(500);
      const sec = document.getElementById("skab");
      const o = { kopf: sec ? sec.textContent.replace(/\s+/g, " ").slice(0, 120) : "", knoepfe: sec ? sec.querySelectorAll("button.skab-zeile").length : -1, ok: sec ? sec.querySelectorAll(".skab-ok").length : -1 };
      const b = sec && sec.querySelector('button[data-sid="1"]');
      if (b) { b.click(); await w(100); b.click(); await w(500); }
      return o;
    }, { K });
    const fe = s.fehler(); await s.schliessen();
    pruef(/Skill des Monats abnehmen/.test(r.kopf) && /Ballrollen/.test(r.kopf) && /50 Federn/.test(r.kopf) && r.knoepfe === 2 && r.ok === 1
        && awards.length === 1 && awards[0].p_quelle === "skillwoche" && awards[0].p_quelle_id === "9" && Number(awards[0].p_spieler_id) === 1,
      "c) Anwesenheit: „Ballrollen · 50 Federn“, zwei offene Kinder und eins mit ✓; zweimal tippen → skillwoche 9 für Kind 1, kein Abzeichen", "c) " + JSON.stringify({ r, awards }));
    if (fe.length) probleme.push("Konsole Trainer: " + fe.slice(0, 2).join(" | ")); }
  return h.ergebnis("v985 Skill ohne Abzeichen: Abnahme beim Training statt Elternbestätigung", !probleme.length, zeilen.concat(probleme));
};
