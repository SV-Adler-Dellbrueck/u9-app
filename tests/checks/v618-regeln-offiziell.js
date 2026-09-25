/* v618 · PO: „Passe noch die Regeln im Spielplan-Link und in der App an, so dass sie den
   offiziellen Bestimmungen entsprechen. Es geht vor allem um das Eindribbeln und direkt Tor
   erzielen dürfen etc."

   Quelle: Durchführungsbestimmungen Kinderfußball, Fußballkreis Köln, gültig ab 01.08.2026 –
   dieselbe, aus der die Wissenskachel „Spielregeln am Spieltag“ (md-wissen.js) stammt.

   a) Regelkarten im Spielplan-Link (FUNiño, 4+1, 3+1, für alle): Wer eindribbelt, darf selbst
      direkt aufs Tor schießen; nach einem Tor und im Toraus wird eingedribbelt; Wettlauf zur
      Spieleröffnung; 3 m Abstand; Überzahl bei 3 Toren bis ein Tor Abstand; Penalty; Torwart
      ohne Abschlag, Rückpass ohne Hände; die Quelle steht darunter.
   b) Was den Bestimmungen widersprach, ist weg: „mindestens ein Ballkontakt eines Mitspielers“,
      „Anstoß in der Mitte“, „Rückpass in die Hand“.
   c) Die Regelvorlagen der Turnierverwaltung (FUNiño, 4+1) sagen dasselbe zum Eindribbeln.
   d) Wissenskachel und Regelkarte widersprechen sich nicht: beide erlauben den Abschluss nach
      dem Eindribbeln.
   e) PO: „ja, umschreiben“ – das Taktik-Quiz der Kinder (TQ_SCENARIOS) erklärt keine Regel mehr,
      die es im Kinderfußball nicht gibt: kein Anstoß, kein Abstoß mit langem Ball, kein „ein
      Mitspieler muss den Ball vor dem Tor berühren“. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ warten: 2500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(() => {
    if (typeof fstRegelnHtml !== "function" || typeof HT_REGELN === "undefined") return { fehlt: true };
    const d = document.createElement("div");
    d.innerHTML = fstRegelnHtml(true, { wechsel: 5, felder: [{ form: "f4" }, { form: "funino" }, { form: "f3" }] });
    const t = d.textContent.replace(/\s+/g, " ");
    const wissen = (typeof WISSEN !== "undefined" ? WISSEN : []).find(w => w.id === "kifu-regeln");
    const seitenaus = wissen ? (wissen.punkte.find(p => p[0] === "Seitenaus") || [])[1] || "" : null;
    const tq = (typeof TQ_SCENARIOS !== "undefined" ? TQ_SCENARIOS : []).map(x => [x.title, x.desc, x.task, x.hint, x.explain && x.explain.correct, x.explain && x.explain.wrong].join(" ")).join(" | ");
    return { t, f4: HT_REGELN.f4, fu: HT_REGELN.funino, seitenaus, tq, tqZahl: (typeof TQ_SCENARIOS !== "undefined" ? TQ_SCENARIOS.length : 0) };
  });
  const f = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v618 Regeln nach den Kreis-Bestimmungen", false, ["fstRegelnHtml oder HT_REGELN fehlt"]);

  const muss = [
    [/Wer eindribbelt, darf selbst direkt aufs Tor schießen/, "a) Abschluss nach dem Eindribbeln erlaubt"],
    [/Nach einem Tor: das Team, das es bekommen hat, dribbelt von der eigenen Torauslinie ein/, "a) nach einem Tor eindribbeln"],
    [/Toraus: von der Torauslinie eindribbeln oder einpassen/, "a) Toraus eindribbeln"],
    [/Wettlauf zum Ball/, "a) Spieleröffnung mit Wettlauf"],
    [/3 m Abstand/, "a) 3 m Abstand"],
    [/3 Toren Vorsprung.*nur noch ein Tor/, "a) Überzahl bis ein Tor Abstand"],
    [/Penalty/, "a) Penalty"],
    [/ohne Abschlag/, "a) Torwart ohne Abschlag"],
    [/Rückpass zum Torwart: ohne Hände/, "a) Rückpass ohne Hände"],
    [/Fußballkreises Köln/, "a) Quelle unter den Regeln"]
  ];
  for (const [re, was] of muss) if (!re.test(r.t)) probleme.push(`${was} fehlt in der Regelkarte`);
  for (const [re, was] of [[/Ballkontakt eines Mitspielers/, "Kontakt eines Mitspielers vor dem Tor"], [/Anstoß in der Mitte/, "Anstoß in der Mitte"], [/Rückpass in die Hand/, "Rückpass in die Hand"]])
    if (re.test(r.t)) probleme.push(`b) steht noch in der Regelkarte: „${was}“`);
  if (!/darf selbst direkt aufs Tor schießen/.test(r.f4) || /Rückpass aufnehmen/.test(r.f4)) probleme.push("c) Vorlage 4+1 folgt den Bestimmungen nicht");
  if (!/darf selbst direkt aufs Tor schießen/.test(r.fu)) probleme.push("c) Vorlage FUNiño erlaubt den Abschluss nach dem Eindribbeln nicht");
  if (r.seitenaus === null) probleme.push("d) Wissenskachel „Spielregeln am Spieltag“ nicht gefunden");
  else if (!/darf selbst abschließen/.test(r.seitenaus)) probleme.push(`d) Wissenskachel sagt zum Seitenaus: „${r.seitenaus}“`);
  if (!r.tqZahl) probleme.push("e) Taktik-Quiz nicht gefunden");
  for (const [re, was] of [[/Anstoß für den Gegner|Anstoß des Gegners/, "Anstoß des Gegners"], [/Abstoß gegen uns|Abstoß des Gegners|schießt lang/, "langer Abstoß"],
                           [/muss den Ball vor dem Tor berühren/, "ein Mitspieler muss vor dem Tor berühren"]])
    if (re.test(r.tq)) probleme.push(`e) Taktik-Quiz erklärt noch „${was}“`);
  if (!/wer eindribbelt, darf auch selbst aufs Tor schießen/.test(r.tq)) probleme.push("e) Taktik-Quiz: Ecke ohne Hinweis auf den eigenen Abschluss");
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  zeilen.push(`a/b) Regelkarte: ${muss.filter(([re]) => re.test(r.t)).length} von ${muss.length} Punkten, nichts Widersprüchliches übrig`);
  zeilen.push(`c/d) Vorlagen 4+1 und FUNiño: Eindribbeln mit Abschluss · Wissen: „${(r.seitenaus || "").slice(0, 60)}…“`);
  zeilen.push(`e) Taktik-Quiz: ${r.tqZahl} Szenen, keine Regel außerhalb der Bestimmungen`);
  return h.ergebnis("v618 Regeln nach den Kreis-Bestimmungen: eindribbeln und selbst abschließen", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
