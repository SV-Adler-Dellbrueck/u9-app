/* v773 – Blocktyp „Turnier“: ein oder zwei Aufwärm-Blöcke, danach nur noch Turnier.
   Der Turnier-Block braucht keine Übung und keine Gruppen (wie das Abschlussspiel), zählt aber
   – anders als dieses – als Spielform: Nettospielzeit und Spielform-Anteil. Er ist im Dialog
   „Block hinzufügen“ wählbar und trägt das Wort „Turnier · Spielform“ (nicht nur Farbe). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 900, supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    team_config: [{ id: 1, uebung_meta: {}, uebung_art: {}, netto_richtwert: 48 }]
  }) });

  const r = await s.page.evaluate(async () => {
    const out = {};
    await uebungMetaLoad();
    out.netto = tpNettoMinuten([{ typ: "warmup", dauer: 10 }, { typ: "warmup", dauer: 5 }, { typ: "turnier", dauer: 35 }]);
    out.nettoAbschluss = tpNettoMinuten([{ typ: "abschluss", dauer: 20 }]);
    out.optTurnier = TP_ADD_OPTS.some(o => o.typ === "turnier");
    tpSlots.length = 0;
    tpSlots.push({ label: "Aufwärmen", dauer: 10, farbe: "#059669", typ: "warmup" });
    tpSlots.push({ label: "Aufwärmen 2", dauer: 5, farbe: "#059669", typ: "warmup" });
    tpDoAddSlot("turnier");
    out.slots = tpSlots.map(x => x.typ);
    const sl = [...document.querySelectorAll(".tp-slot")];
    const t = sl[sl.length - 1];
    out.kopf = t ? t.querySelector(".tp-slot-label").textContent.replace(/\s+/g, " ").trim() : "";
    out.ohneAuswahl = t ? t.querySelectorAll("select.tp-form-sel").length : -1;
    out.blitzKnopf = t ? !!t.querySelector('button[onclick*="blitzOpen"]') : false;
    out.dauer = tpSlots[tpSlots.length - 1].dauer;
    out.zuordnung = tpSlotsMitZuordnung().map(x => x.typ);
    return out;
  });
  const fehler = s.fehler();

  if (r.netto !== 35) probleme.push(`Netto ${r.netto} – erwartet 35 (Turnier zählt, Aufwärmen nicht)`);
  if (r.nettoAbschluss !== 0) probleme.push(`Abschlussspiel zählt jetzt zur Nettozeit (${r.nettoAbschluss}) – darf sich nicht ändern`);
  if (!r.optTurnier) probleme.push("„Turnier“ fehlt im Dialog „Block hinzufügen“");
  if (r.slots.join() !== "warmup,warmup,turnier") probleme.push(`Blöcke ${r.slots}`);
  if (!/Turnier · Spielform/.test(r.kopf)) probleme.push(`Kennzeichnung fehlt: „${r.kopf}“`);
  if (r.ohneAuswahl !== 0) probleme.push(`Turnier-Block hat ${r.ohneAuswahl} Auswahlfelder (erwartet 0)`);
  if (!r.blitzKnopf) probleme.push("Knopf „Als Trainingsturnier spielen“ fehlt");
  if (r.zuordnung.join() !== "warmup,warmup,turnier") probleme.push(`Speicherung ${r.zuordnung}`);
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Netto ${r.netto} · Abschluss ${r.nettoAbschluss} · Blöcke ${r.slots} · Kopf „${r.kopf}“ · Dauer ${r.dauer}`);
  return h.ergebnis("Turnier-Block: Aufwärmen davor, dann Turnier – zählt als Spielform", !probleme.length, zeilen.concat(probleme));
};
