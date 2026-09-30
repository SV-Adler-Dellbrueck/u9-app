/* v689 · Eltern & Kinder und Taktik
   PO 30.09.: „Ok, Eltern & Kinder und Taktik angehen.“
   a) Eltern & Kinder: Gruppen Nachrichten · Eltern verwalten · Kinder belohnen · Kabine gestalten ·
      Inhalte, keine Kachel „Adler-Rufe moderieren“ mehr, kein Emoji doppelt
   b) Adler-Rufe: im Trainerbereich steht 🛡️ Moderieren im Kopf des Raums (44 px), es öffnet die
      Moderation über dem Raum
   c) Taktik: Bereichskopf wie auf den Kachelseiten (Titel „Taktik“), „Freies Brett“ bleibt die erste
      Aktion, die vier Spielformen stehen direkt darunter im selben Abschnitt (vor dem KI-Kasten),
      Spielform-Knöpfe ≥ 56 px */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ breite: 390, hoehe: 844, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }) });
  await h.sichtbarMachen(s.page, "#main-app");
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = {};
    go("ue-elki"); await w(500);
    const body = document.getElementById("kachel-body");
    const kopf = e => e.tagName === "DIV" && !e.children.length && e.textContent.trim() && +getComputedStyle(e).fontWeight >= 700;
    out.gruppen = [...body.children].filter(kopf).map(e => e.textContent.trim());
    const knoepfe = [...body.querySelectorAll("button")].map(b => b.textContent.replace(/\s+/g, " ").trim());
    out.mod = knoepfe.some(t => /moderieren/i.test(t));
    const emos = [...body.querySelectorAll("button")].map(b => [...b.textContent.trim()][0]);
    out.doppelt = emos.filter((e, i) => emos.indexOf(e) !== i);
    // b)
    window.sbToken = () => "x.eyJzdWIiOiJ1LXRyYWluZXIifQ.x";
    for (let i = 0; i < 40 && typeof rufeOpen !== "function"; i++) await w(50);
    try { await rufeOpen(); } catch (e) {}
    await w(300);
    const mk = document.getElementById("rufe-mod-knopf");
    out.modKnopf = mk ? Math.round(mk.getBoundingClientRect().height) : 0;
    if (mk) { mk.click(); await w(300); }
    const mm = document.getElementById("rufe-mod-modal"), rm = document.getElementById("rufe-modal");
    out.modOben = !!(mm && rm && +getComputedStyle(mm).zIndex > +getComputedStyle(rm).zIndex);
    mm?.remove(); if (typeof rufeClose === "function") rufeClose();
    // c)
    go("taktik"); await w(800);
    for (let i = 0; i < 40 && !document.querySelector("#sit-hub .sit-brett"); i++) await w(50);
    const v = document.getElementById("view-taktik");
    const bk = v.querySelector(".bereich-kopf");
    out.kopf = bk && getComputedStyle(bk).display !== "none" ? bk.textContent.replace(/\s+/g, " ").trim() : "";
    const hub = document.getElementById("sit-hub");
    const erste = hub.querySelector("button");
    out.erste = erste ? erste.textContent.trim() : "";
    const alle = [...hub.querySelectorAll("*")];
    const pos = el => alle.indexOf(el);
    const formen = [...hub.querySelectorAll(".sit-form")];
    out.formenVorKi = formen.length === 4 && pos(formen[3]) < pos(hub.querySelector(".tf-ki"));
    out.formH = formen.length ? Math.min(...formen.map(b => Math.round(b.getBoundingClientRect().height))) : 0;
    out.abschnitte = [...hub.querySelectorAll(".tf-abschnitt")].map(e => e.textContent.trim());
    return out;
  });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  const soll = ["Nachrichten", "Eltern verwalten", "Kinder belohnen", "Kabine gestalten", "Inhalte"];
  if (JSON.stringify(r.gruppen) !== JSON.stringify(soll)) probleme.push(`a) Gruppen: ${JSON.stringify(r.gruppen)}`);
  if (r.mod) probleme.push("a) Kachel „Adler-Rufe moderieren“ steht noch da");
  if (r.doppelt.length) probleme.push(`a) Emoji doppelt: ${r.doppelt.join(" ")}`);
  if (r.modKnopf < 44) probleme.push(`b) Knopf Moderieren im Raum: ${r.modKnopf} px`);
  if (!r.modOben) probleme.push("b) Die Moderation öffnet nicht über dem Raum");
  if (!/^🎯\s?Taktik/.test(r.kopf)) probleme.push(`c) Bereichskopf: „${r.kopf}“`);
  if (!/Freies Brett/.test(r.erste)) probleme.push(`c) erste Aktion: „${r.erste}“`);
  if (!r.formenVorKi) probleme.push("c) Die Spielformen stehen nicht vor dem KI-Kasten");
  if (r.formH < 56) probleme.push(`c) Spielform-Knöpfe ${r.formH} px`);
  zeilen.push(`Eltern & Kinder: ${r.gruppen.join(" · ")} · Moderieren im Raum ${r.modKnopf} px`);
  zeilen.push(`Taktik: „${r.kopf}“ · ${r.abschnitte.join(" › ")} · Spielformen ${r.formH} px`);
  return h.ergebnis("Eltern & Kinder in fünf Gruppen, Moderieren im Raum, Taktik mit Bereichskopf", !probleme.length, zeilen.concat(probleme));
};
