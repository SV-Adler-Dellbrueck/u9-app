/* v459 – Spieltag: alle Phasen stehen beim Betreten zu (auch wenn beim letzten Besuch
   eine offen war), und der Turnier-Modus sitzt ganz unten statt zwischen Terminwahl und
   „Teams festlegen". Gezielte Spruenge duerfen weiterhin oeffnen. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }), hoehe: 2000 });
  const r = await s.page.evaluate(async () => {
    await loadKader();
    go("spieltag"); await new Promise(r => setTimeout(r, 700));
    const wrap = document.getElementById("train-sub-spieltag");
    const det = () => [...wrap.querySelectorAll("details.el-sect")];
    const kinder = [...wrap.children].map(e => e.id).filter(Boolean);
    const out = { start: det().map(d => d.open), reihenfolge: kinder };
    // zwei Phasen aufklappen, weggehen, zurueckkommen
    det()[1].open = true; det()[3].open = true;
    go("home"); await new Promise(r => setTimeout(r, 200));
    go("spieltag"); await new Promise(r => setTimeout(r, 700));
    out.zurueck = det().map(d => d.open);
    // gezielter Sprung darf danach oeffnen (wie tmJump/Spieluhr)
    const nach = document.getElementById("mt-phase-nach"); if (nach) nach.open = true;
    out.sprung = !!(nach && nach.open);
    return out;
  });
  const fehler = s.fehler(); await s.schliessen();
  if (r.start.some(Boolean)) probleme.push("beim ersten Betreten offen: " + JSON.stringify(r.start));
  if (r.zurueck.some(Boolean)) probleme.push("nach dem Zurueckkommen noch offen: " + JSON.stringify(r.zurueck));
  if (!r.sprung) probleme.push("gezielter Sprung kann nicht mehr aufklappen");
  const idxBanner = r.reihenfolge.indexOf("spieltag-turnier-banner");
  const idxQuests = r.reihenfolge.indexOf("mt-phase-quests");
  if (idxBanner < 0 || idxQuests < 0) probleme.push("Banner oder Quests nicht gefunden: " + JSON.stringify(r.reihenfolge));
  else if (idxBanner < idxQuests) probleme.push("Turnier-Modus steht nicht unten: " + JSON.stringify(r.reihenfolge));
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`${r.start.length} Phasen, alle zu · nach Rueckkehr zu: ${!r.zurueck.some(Boolean)} · Reihenfolge ${JSON.stringify(r.reihenfolge)}`);
  return h.ergebnis("Spieltag: Phasen beim Betreten zu, Turnier-Modus ganz unten", !probleme.length, zeilen.concat(probleme));
};
