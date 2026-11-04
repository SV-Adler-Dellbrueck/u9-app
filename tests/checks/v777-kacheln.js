/* v777 · Kacheln einheitlich: Schatten an allen Karten, antippbare Karten, Knöpfe und Anwesenheits-Kacheln sinken beim Drücken ein
   (scale .98), bei „Bewegung reduzieren“ nicht; die Größe der Karte ändert sich dabei nicht im Layout (nur transform). */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ hoehe: 900, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const bau = () => s.page.evaluate(() => {
    document.getElementById("v777")?.remove();
    const w = document.createElement("div"); w.id = "v777"; w.style.cssText = "position:fixed;top:80px;left:20px;z-index:99999;display:flex;flex-wrap:wrap;gap:12px;width:340px;background:#fff;padding:12px";
    w.innerHTML = '<div class="card" id="v777-k" onclick="void 0" style="width:160px;height:80px">Karte</div><button class="btn" id="v777-b" style="width:140px">Knopf</button><button class="aw-tile" id="v777-a" style="width:120px">Kachel</button><div class="card" id="v777-s" style="width:100px;height:60px">still</div>';
    document.body.appendChild(w);
  });
  const druecken = async id => {
    const b = await s.page.locator("#" + id).boundingBox();
    await s.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await s.page.mouse.down(); await s.page.waitForTimeout(300);
    const t = await s.page.evaluate(i => getComputedStyle(document.getElementById(i)).transform, id);
    const dbg = await s.page.evaluate(([x,y]) => { const e = document.elementFromPoint(x,y); return e ? e.id || e.className : null; }, [b.x + b.width / 2, b.y + b.height / 2]);
    const lay = await s.page.evaluate(i => { const r = document.getElementById(i).offsetWidth; return r; }, id);
    await s.page.mouse.up(); await s.page.mouse.move(0, 0); await s.page.waitForTimeout(250);
    return { t, lay, dbg };
  };
  await bau();
  const schatten = await s.page.evaluate(() => ({ karte: getComputedStyle(document.getElementById("v777-k")).boxShadow, still: getComputedStyle(document.getElementById("v777-s")).boxShadow }));
  const res = {};
  for (const id of ["v777-k", "v777-b", "v777-a"]) res[id] = await druecken(id);
  await s.page.emulateMedia({ reducedMotion: "reduce" });
  await bau();
  res.reduziert = await druecken("v777-k");
  await s.page.emulateMedia({ reducedMotion: "no-preference" });
  const glas = await s.page.evaluate(() => {
    const n = document.getElementById("main-nav"); if (!n) return { keineLeiste: true };
    const cs = getComputedStyle(n), m = cs.backgroundColor.match(/[\d.]+/g) || [];
    const t = document.createElement("table"); t.innerHTML = "<tr><td id='v777-td'>1</td></tr>"; document.body.appendChild(t);
    const tab = getComputedStyle(document.getElementById("v777-td")).fontVariantNumeric; t.remove();
    return { filter: cs.backdropFilter || cs.webkitBackdropFilter || "", alpha: m.length > 3 ? Number(m[3]) : 1, tab };
  });
  const fe = s.fehler(); await s.schliessen();
  const skaliert = t => /matrix\(0\.9[0-9]*,\s*0,\s*0,\s*0\.9[0-9]*/.test(t || "");
  if (!schatten.karte || schatten.karte === "none" || !schatten.still || schatten.still === "none") probleme.push("Schatten fehlt: " + JSON.stringify(schatten));
  for (const id of ["v777-k", "v777-b", "v777-a"]) if (!skaliert(res[id].t)) probleme.push(`${id}: beim Drücken kein Einsinken (${res[id].t}) unter dem Zeiger: ${res[id].dbg}`);
  if (res.reduziert.t && res.reduziert.t !== "none") probleme.push("Bewegung reduziert, aber die Karte bewegt sich: " + res.reduziert.t);
  zeilen.push(`Schatten Karte ${schatten.karte.slice(0, 40)} · Drücken: Karte ${res["v777-k"].t}, Knopf ${res["v777-b"].t}, Kachel ${res["v777-a"].t} · reduziert: ${res.reduziert.t}`);
  if (!glas.keineLeiste && (!/blur/.test(glas.filter) || !(glas.alpha >= 0.8 && glas.alpha < 1))) probleme.push("Glas-Leiste: " + JSON.stringify(glas));
  if (!/tabular-nums/.test(glas.tab || "")) probleme.push("Ziffern nicht gleich breit: " + glas.tab);
  zeilen.push(`Leiste: ${glas.keineLeiste ? "nicht im DOM" : glas.filter + " bei Deckung " + glas.alpha} · Ziffern ${glas.tab}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v777 Kacheln: Schatten und Einsinken beim Antippen, ohne Bewegung bei „reduzieren“", !probleme.length, probleme.length ? probleme : zeilen);
};
