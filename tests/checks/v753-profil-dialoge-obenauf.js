/* v753 · Dialoge aus dem Kinderprofil öffnen sich VOR dem Profil, die Kartenansicht schneidet nichts ab
   PO 04.10. (Bildschirmfotos): „Kontakte & Login sowie Ziele: passiert nichts, wenn ich draufklicke.“ – Das Profil liegt
   auf z-index 10002, die beiden Dialoge auf 10000: sie öffneten sich dahinter. · „In der Ansicht ist oben und unten
   was abgeschnitten vom Bild.“ – justify-content:center schneidet einen zu hohen Flex-Container oben und unten ab.
   a) Aus dem Profil: Kontakte-Dialog und Ziele-Dialog liegen über dem Profil und fangen den Klick in der Bildmitte ab
   b) Kartenansicht auf niedrigem Bildschirm: Oberkante der Karte liegt im sichtbaren Bereich, Unterkante per Scrollen erreichbar */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const t = await h.starten({ warten: 1200, breite: 390, hoehe: 520, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), kind_ziele: [], eltern_kinder: [], kind_kontakte: [], entwicklungsziele: [], match_actions: [], quiz_progress: [], anwesenheit: [], rpc: { kind_spiele_saison: 3, kind_trainings_saison: 9 } }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 60 && typeof kinderProfilOpen !== "function"; i++) await w(50);
    if (typeof loadKader === "function") await loadKader();
    /* Der Dienst-Arbeiter übernimmt im Prüfstand in den ersten 60 s und die App lädt dann neu, sobald kein Fenster offen ist.
       Ein unsichtbares Fenster mit aria-modal hält sie davon ab. */
    const halt = document.createElement("div"); halt.setAttribute("aria-modal", "true"); halt.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(halt);
    const id = KADER[0]._id, out = {};
    await kinderProfilOpen(id); await w(200); 
    const profil = document.getElementById("kp-modal");
    const z = el => Number(getComputedStyle(el).zIndex) || 0;
    const oben = el => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!(e && el.contains(e)); };
    kontakteEditOpen(id); await w(100); 
    const k = document.getElementById("kontakte-modal");
    out.a = { profilZ: z(profil), kontakteZ: k ? z(k) : 0, kontakteOben: k ? oben(k) : false };
    k && k.remove();
    zieleOpen(id); await w(300); 
    const zi = document.getElementById("ziele-modal");
    out.a.zieleZ = zi ? z(zi) : 0; out.a.zieleOben = zi ? oben(zi) : false;
    zi && zi.remove();
    return out;
  });
  await t.page.waitForTimeout(1500);
  const rb = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    const name = KADER[0].name;
    window.adlerCardData = () => ({ name, nr: 5, tw: false, spielerId: null, fotoPath: null, badges: [], theme: CARD_THEMES.neu, counts: null });
    window.adlerCardStats = async () => ({ tore: 0, paraden: 0, aktionen: 0, spiele: 3, trainings: 9, quizRichtig: 0, quizBloecke: 0 });
    adlerCardOpen(name); await w(600);
    const m = document.getElementById("adler-card-modal");
    const gal = document.createElement("div"); gal.style.cssText = "width:300px;height:320px;background:#fff"; gal.textContent = "Karten-Designs";
    m.firstElementChild.appendChild(gal); await w(50);
    m.scrollTop = 0; await w(30);
    const karte = m.querySelector("canvas").getBoundingClientRect();
    out.b = { karteOben: Math.round(karte.top), scrollbar: m.scrollHeight > m.clientHeight };
    m.scrollTop = m.scrollHeight; await w(30);
    const bar = [...m.querySelectorAll("button")].find(b => /Schließen/.test(b.textContent)).getBoundingClientRect();
    out.b.schliessenImBild = bar.bottom <= innerHeight && bar.top >= 0;
    out.b.galUnten = Math.round(gal.getBoundingClientRect().bottom) <= innerHeight;
    return out;
  });
  const fe = t.fehler(); await t.schliessen();
  const a = r.a || {}, b = rb.b || {};
  if (!(a.kontakteZ > a.profilZ) || !a.kontakteOben || !(a.zieleZ > a.profilZ) || !a.zieleOben) probleme.push("a) " + JSON.stringify(a));
  zeilen.push(`a) Profil z ${a.profilZ} · Kontakte z ${a.kontakteZ} (oben ${a.kontakteOben}) · Ziele z ${a.zieleZ} (oben ${a.zieleOben})`);
  if (b.karteOben < 0 || !b.scrollbar || !b.schliessenImBild || !b.galUnten) probleme.push("b) " + JSON.stringify(b));
  zeilen.push(`b) Karte beginnt bei ${b.karteOben} px, Scrollen erreicht das Ende (Schließen im Bild: ${b.schliessenImBild})`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v753 Profil-Dialoge obenauf, Kartenansicht schneidet nicht ab", !probleme.length, probleme.length ? probleme : zeilen);
};
