/* v543 – Trikotgröße am Kind statt auf Papier.

   Die Größen werden beim Anprobieren notiert und wandern dann in eine Liste, die niemand
   wiederfindet. Sie gehören dorthin, wo das Kind steht: in den Kader.

   Fälle:
   a) Jede Kader-Zeile hat ein Feld für die Größe, vorbelegt mit dem gespeicherten Wert.
   b) Eine Vorschlagsliste hängt daran – aber sie verbietet nichts: eine Größe, die nicht
      darin steht, lässt sich eintragen und wird gespeichert.
   c) Die Liste steht GENAU EINMAL im Fenster, nicht je Zeile.
   d) Über den Zeilen steht, wie viele Größen noch fehlen – gezählt werden nur Kinder,
      die im Kader sind.
   e) Speichern schickt trikotgroesse mit; ein leeres Feld wird zu null, nicht zu "".
   f) Die Migration legt die Spalte an, und die Sicherung erfasst sie (select=* auf kader). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  /* Fünfzehn Kinder, davon zwei mit Größe und eines ausgeschieden – so lässt sich
     nachweisen, dass die Zählung die Ausgeschiedenen auslässt. */
  const zeilenKader = h.kaderZeilen({ inaktiv: [h.KINDER[14]] }).map((k, i) => ({
    ...k, trikotgroesse: i === 0 ? "128" : (i === 1 ? "140" : null)
  }));

  const s = await h.starten({
    hoehe: 3000, supabase: h.supabaseAttrappe({ kader: zeilenKader })
  });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    await loadKader();
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    kaderEditOpen();
    await warte(200);
    const modal = document.getElementById("kader-edit-modal");
    if (!modal) return { fensterFehlt: true };
    const out = {};

    // a) Feld je Zeile, vorbelegt
    const felder = [...modal.querySelectorAll(".ke-trikot")];
    out.zahlFelder = felder.length;
    out.zahlZeilen = modal.querySelectorAll(".kader-edit-row").length;
    out.werte = felder.slice(0, 3).map(f => f.value);

    // b) + c) Vorschlagsliste
    out.listen = modal.querySelectorAll("datalist#ke-trikot-liste").length;
    out.verknuepft = felder.every(f => f.getAttribute("list") === "ke-trikot-liste");
    const dl = modal.querySelector("datalist#ke-trikot-liste");
    out.vorschlaege = dl ? [...dl.querySelectorAll("option")].map(o => o.value) : [];

    // d) Zählzeile
    out.stand = (document.getElementById("kader-trikot-stand").textContent || "").replace(/\s+/g, " ").trim();

    // b) Eine Größe eintragen, die NICHT in der Liste steht
    felder[2].value = "Sondergröße 133";
    // e) und eine leeren
    felder[0].value = "";
    await kaderSaveAll(modal.querySelector(".btn-p"));
    await warte(500);
    return out;
  });

  if (r.fensterFehlt) {
    probleme.push("kaderEditOpen öffnet kein Fenster");
  } else {
    if (r.zahlFelder !== r.zahlZeilen) probleme.push(`${r.zahlFelder} Größenfelder bei ${r.zahlZeilen} Zeilen`);
    else if (String(r.werte.slice(0, 2)) !== "128,140") probleme.push(`Die gespeicherten Größen stehen nicht im Feld: ${JSON.stringify(r.werte)}`);
    else zeilen.push(`Felder: ${r.zahlFelder} Zeilen, vorbelegt mit ${r.werte.slice(0, 2).join(" und ")}`);

    if (r.listen !== 1) probleme.push(`Die Vorschlagsliste steht ${r.listen}× im Fenster, erwartet genau 1`);
    else if (!r.verknuepft) probleme.push("Nicht jedes Feld ist mit der Vorschlagsliste verknüpft");
    else zeilen.push(`Vorschläge: ${r.vorschlaege.length} (${r.vorschlaege.slice(0, 3).join(", ")} …), einmal im Fenster`);

    /* d) 15 Kinder, eines ausgeschieden → 14 im Kader, davon 2 mit Größe → 12 fehlen.
       Stünde hier 13, zählte die Zeile das ausgeschiedene Kind mit. */
    if (!/12.{0,4}von 14/.test(r.stand)) probleme.push(`Die Zählzeile sagt „${r.stand}“ – erwartet 12 von 14`);
    else zeilen.push(`Zählzeile: „${r.stand}“`);
  }

  // e) Was tatsächlich geschickt wurde
  const posts = s.gesendet.filter(g => /\/kader/.test(g.pfad || "") && g.methode === "POST");
  if (!posts.length) probleme.push("Beim Speichern ging nichts an kader");
  else {
    const body = posts[posts.length - 1].body || [];
    const mit = body.filter(x => x && Object.prototype.hasOwnProperty.call(x, "trikotgroesse"));
    const frei = body.find(x => x && x.trikotgroesse === "Sondergröße 133");
    const geleert = body[0];
    if (mit.length !== body.length) probleme.push(`Nur ${mit.length} von ${body.length} Zeilen tragen trikotgroesse`);
    else if (!frei) probleme.push("Eine Größe außerhalb der Vorschlagsliste kommt nicht durch");
    else if (geleert.trikotgroesse !== null) probleme.push(`Ein geleertes Feld wird als ${JSON.stringify(geleert.trikotgroesse)} gespeichert statt als null`);
    else zeilen.push(`Speichern: ${body.length} Zeilen mit Größe, freie Eingabe kommt durch, leer wird null`);
  }

  const f = s.fehler();
  if (f.length) probleme.push("Konsole: " + f[0]);
  await s.schliessen();

  // f) Migration und Sicherung
  const fs = require("fs"), path = require("path");
  const mig = path.join(h.REPO, "supabase/migrations/20260914_kader_trikotgroesse.sql");
  if (!fs.existsSync(mig)) probleme.push("Die Migration für trikotgroesse fehlt");
  else if (!/add column if not exists trikotgroesse/.test(fs.readFileSync(mig, "utf8")))
    probleme.push("Die Migration legt die Spalte nicht an");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  /* Die Sicherung liest kader mit select=* – die neue Spalte ist damit abgedeckt, ohne
     dass die Tabellenliste angefasst werden muss. Geprüft wird, dass das so bleibt. */
  if (!/const tables=\["kader"/.test(views)) probleme.push("kader steht nicht mehr am Anfang der Sicherungsliste");
  if (!/rest\/v1\/\$\{t\}\?select=\*/.test(views)) probleme.push("Die Sicherung liest nicht mehr mit select=*");

  return h.ergebnis("Trikotgröße: Feld am Kind, freie Eingabe, Zählung der offenen", !probleme.length, zeilen.concat(probleme));
};
