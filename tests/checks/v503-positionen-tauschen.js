/* v503 – PO: „Beim Wechseltimer wäre es gut, wenn man die Positionen auch verschieben kann. Welche
   Aufstellung macht bei FUNiño am meisten Sinn und welche bei 3+1? Bei 4+1 Raute mit den
   entsprechenden Rollennamen … damit ich weiß, wer wo spielt und wen ich gegen wen wechsel."
   Kacheln: Dreieck 1-2 mit den Raute-Namen; zwei Tipps tauschen – und Ziehen geht auch.
   Geprueft: FUNiño-Rollen; Rollenname an jeder Position; erster Tipp waehlt, zweiter tauscht die
   Positionen; Bankspieler gezielt gegen Feldspieler; nochmal antippen = Bank; Ziehen mit dem
   Finger (echte Pointer-Ereignisse) tauscht ebenso; freie Position als Ziel. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const heute = h.heute();
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], nominierungen: [], matchday: [] }), hoehe: 1800 });
  await h.sichtbarMachen(s.page, "#train-sub-spieltag");
  const r = await s.page.evaluate(async ({ K }) => {
    await loadKader();
    if (typeof rotTap !== "function" || typeof rotDropAuf !== "function") return { fehlt: "rotTap/rotDropAuf" };
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const f = FORMATIONS.funino, d = FORMATIONS["3+1"];
    const rollen = { funino: f.slots.map(x => x.role), dreiEins: d.slots.map(x => x.role) };
    TEAM_ANZAHL = 1; spieltagTeamKartenRender();
    document.getElementById("mt-phase-nom").open = true;
    tbFormation = "4+1"; rotSeedFromSquad(K.slice(1, 7)); rotRenderControls(); rotRenderLive(); aufRender(); await warte(50);
    const auf = document.getElementById("auf-panel");
    const feldNamen = () => rotField.slice();
    const rollenAmFeld = [...auf.querySelectorAll("span[aria-hidden]")].map(x => x.textContent.trim());
    const start = feldNamen();                       // [B,C,D,E], Bank [F,G]
    // 1) Tipp – Tipp: Positionen tauschen
    rotTap(K[1]); const gewaehlt = rotSel; const markiert = auf.querySelectorAll('[data-rot-name][aria-pressed="true"]').length;
    rotTap(K[3]); const nachTausch = feldNamen();
    // 2) Bankspieler gezielt gegen Feldspieler (Feld ist voll)
    rotTap(K[5]); const bankGewaehlt = rotSel; rotTap(K[2]); const nachWechsel = { feld: feldNamen(), bank: rotBench.slice() };
    // 3) nochmal antippen = Bank
    rotTap(K[4]); rotTap(K[4]); const nachBank = { feld: feldNamen(), bank: rotBench.slice(), sel: rotSel };
    // 4) freie Position: Bankspieler rein
    rotTap(K[6]); const nachFrei = feldNamen();
    return { rollen, rollenAmFeld, start, gewaehlt, markiert, nachTausch, bankGewaehlt, nachWechsel, nachBank, nachFrei,
      bankZiel: !!auf.querySelector("[data-rot-bank]"), chips: auf.querySelectorAll("[data-rot-name]").length };
  }, { K });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Positionen tauschen", false, [`${r.fehlt} fehlt`]); }
  // 5) Ziehen mit dem Finger: Chip A auf Chip B
  const boxen = await s.page.evaluate(() => {
    const auf = document.getElementById("auf-panel");
    const feld = [...auf.querySelectorAll(".rot-feld, [data-rot-name]")].filter(x => x.closest("[data-rot-bank]") === null);
    const b = n => { const el = auf.querySelector(`[data-rot-name="${n}"]`); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    return { vorher: rotField.slice(), a: b(rotField[0]), b: b(rotField[1]), bank: (() => { const r = auf.querySelector("[data-rot-bank]").getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; })(), feldSpieler: rotField.slice() };
  });
  await s.page.mouse.move(boxen.a.x, boxen.a.y); await s.page.mouse.down();
  await s.page.mouse.move(boxen.a.x + 20, boxen.a.y + 10, { steps: 4 });
  await s.page.mouse.move(boxen.b.x, boxen.b.y, { steps: 6 }); await s.page.mouse.up();
  await s.page.waitForTimeout(150);
  const zug = await s.page.evaluate(() => ({ feld: rotField.slice(), sel: rotSel, geist: document.querySelectorAll("body > button[data-rot-name]").length }));
  // 6) Ziehen auf die Bank
  const b2 = await s.page.evaluate(() => { const auf = document.getElementById("auf-panel"); const el = auf.querySelector(`[data-rot-name="${rotField[0]}"]`); const r = el.getBoundingClientRect(); const bk = auf.querySelector("[data-rot-bank]").getBoundingClientRect(); return { n: rotField[0], x: r.left + r.width / 2, y: r.top + r.height / 2, bx: bk.right - 14, by: bk.top + bk.height / 2, feld: rotField.length }; });
  await s.page.mouse.move(b2.x, b2.y); await s.page.mouse.down(); await s.page.mouse.move(b2.x + 15, b2.y + 15, { steps: 3 }); await s.page.mouse.move(b2.bx, b2.by, { steps: 8 }); await s.page.mouse.up();
  await s.page.waitForTimeout(150);
  const zugBank = await s.page.evaluate(({ n }) => ({ aufBank: rotBench.includes(n), feld: rotField.length, sel: rotSel }), { n: b2.n });
  const fehler = s.fehler(); await s.schliessen();
  if (r.rollen.funino.join("|") !== "Aufpasser|Flitzer L|Flitzer R") probleme.push(`FUNiño-Rollen: ${r.rollen.funino.join(", ")}`);
  if (r.rollen.dreiEins.join("|") !== "TW|Aufpasser|Flitzer L|Flitzer R") probleme.push(`3+1-Rollen: ${r.rollen.dreiEins.join(", ")}`);
  if (!/Aufpasser/.test(r.rollenAmFeld.join(",")) || !/Jäger/.test(r.rollenAmFeld.join(","))) probleme.push(`Rollennamen fehlen am Mini-Feld: ${r.rollenAmFeld.join(", ")}`);
  if (r.gewaehlt !== K[1] || r.markiert !== 1) probleme.push(`Erster Tipp wählt nicht (${r.gewaehlt}, markiert ${r.markiert})`);
  if (r.nachTausch[0] !== K[3] || r.nachTausch[2] !== K[1]) probleme.push(`Zwei Tipps tauschen die Positionen nicht: ${r.nachTausch.join(", ")}`);
  if (r.bankGewaehlt !== K[5]) probleme.push("Ein Bankspieler lässt sich bei vollem Feld nicht wählen");
  if (r.nachWechsel.feld[1] !== K[5] || !r.nachWechsel.bank.includes(K[2])) probleme.push(`Gezielter Wechsel klappt nicht: Feld ${r.nachWechsel.feld.join(", ")} · Bank ${r.nachWechsel.bank.join(", ")}`);
  if (r.nachBank.feld.includes(K[4]) || !r.nachBank.bank.includes(K[4]) || r.nachBank.sel) probleme.push("Nochmal antippen schickt nicht auf die Bank");
  if (!r.nachFrei.includes(K[6]) || r.nachFrei.length !== 4) probleme.push(`Freie Position nimmt den Bankspieler nicht: ${r.nachFrei.join(", ")}`);
  if (!r.bankZiel) probleme.push("Die Bank ist kein Ablageziel (data-rot-bank fehlt)");
  if (zug.feld[0] !== boxen.vorher[1] || zug.feld[1] !== boxen.vorher[0]) probleme.push(`Ziehen tauscht nicht: vorher ${boxen.vorher.slice(0, 2).join("/")}, nachher ${zug.feld.slice(0, 2).join("/")}`);
  if (zug.sel) probleme.push("Nach dem Ziehen bleibt ein Spieler gewählt (der nachlaufende Klick wurde nicht geschluckt)");
  if (zug.geist) probleme.push("Der Zieh-Geist bleibt im Dokument");
  if (!zugBank.aufBank || zugBank.feld !== b2.feld - 1) probleme.push(`Ziehen auf die Bank wirkt nicht (${b2.n} auf Bank ${zugBank.aufBank}, Feld ${b2.feld}→${zugBank.feld})`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Rollen: FUNiño ${r.rollen.funino.join("/")} · 3+1 ${r.rollen.dreiEins.join("/")} · am Feld ${r.rollenAmFeld.join(", ")}`);
  zeilen.push(`Tipp-Tipp: ${r.start.slice(0, 4).join(",")} → ${r.nachTausch.join(",")} · Wechsel ${K[5]} für ${K[2]} · nochmal = Bank ${!r.nachBank.feld.includes(K[4])} · frei ${r.nachFrei.includes(K[6])}`);
  zeilen.push(`Ziehen: ${boxen.vorher.slice(0, 2).join("/")} → ${zug.feld.slice(0, 2).join("/")} · auf die Bank ${zugBank.aufBank}`);
  return h.ergebnis("Positionen tauschen – zwei Tipps oder ziehen, Rollen am Mini-Feld", !probleme.length, zeilen.concat(probleme));
};
