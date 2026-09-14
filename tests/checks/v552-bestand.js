/* v552 – Die Startliste sagt, was wir haben, nicht was ein U9-Team üblicherweise hat.

   Befund vom 14.09. (PO, am Schrank durchgesehen): Bälle gibt es nur in Größe 4, grüne
   Hütchen und Spielfeldmarkierungen haben wir nicht, die Ballpumpe stellt der Verein.
   Vier der vierzehn Startzeilen standen also für Dinge, die es bei uns nicht gibt.

   Warum das eine Prüfung wert ist: eine Inventurliste, die vier Posten führt, die nie
   jemand zählen kann, erzieht dazu, die Zahl daneben zu ignorieren. Und wer sie
   ignoriert, ignoriert auch die, auf die es ankommt.

   Zusätzlich fällt die Satznummer weg. Sie war für durchnummerierte Sätze gedacht; die
   Nummer am Kind ist aber die Trikotnummer, und die steht im Kader. Zwei Nummern an
   derselben Stelle sind eine zu viel.

   Fälle:
   a) Die Korrektur-Migration löscht NUR, was nie gezählt wurde – eine Zahl im Feld ist
      eine Beobachtung vom Platz und wird nicht weggeräumt, weil eine Migration läuft.
   b) Sie nennt genau die vier Posten und nichts sonst.
   c) Der Trikotsatz heißt nach seinem Ausrüster, und die Satznummer ist abgeschaltet.
   d) Umbenannt wird der Gegenstand im Katalog, nicht der Posten im Schrank – dort steht
      schon „Spieltagsjacken" neben „Spieltagsjacke FRMD PASN".
   e) Kein Hilfetext verspricht noch eine Satznummer.
   f) Das Nummernfeld selbst bleibt im Programm: ein später angelegter Gegenstand kann
      es wieder brauchen. Abgeschaltet ist es an EINEM Artikel, nicht ausgebaut. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const fs = require("fs"), path = require("path");

  const mig = path.join(h.REPO, "supabase/migrations/20260914_material_bestand.sql");
  if (!fs.existsSync(mig)) return h.ergebnis("Bestand", false, ["Die Korrektur-Migration fehlt"]);
  const sql = fs.readFileSync(mig, "utf8");

  // a) Der Schutz vor dem Löschen gezählter Zeilen
  const del = (sql.match(/delete from public\.material_posten[\s\S]*?;/) || [""])[0];
  if (!del) probleme.push("Die Migration löscht gar nichts");
  else if (!/soll is null and ist is null and zuletzt_gezaehlt is null/.test(del))
    probleme.push("Das Löschen ist nicht auf nie gezählte Zeilen beschränkt – eine eingetragene Zahl wäre weg");
  else zeilen.push("Löschen nur, wo Soll, Ist und Zähldatum leer sind");

  // b) Genau diese vier, und keiner mehr
  const erwartet = ["Größe 3", "Ballpumpe", "grün", "Spielfeldmarkierung"];
  const fehlend = erwartet.filter(x => !del.includes(x));
  if (fehlend.length) probleme.push("Im Löschblock fehlt: " + fehlend.join(", "));
  /* Gegenprobe: was bleiben soll, darf im Löschblock nicht vorkommen. Ohne sie würde ein
     späterer Tippfehler („Größe 4" statt „Größe 3") lautlos den falschen Posten treffen. */
  const bleibt = ["Größe 4", "rot", "gelb", "blau", "Markierungsteller", "Leibchen",
                  "Trikotsätze", "Spieltagsjacken", "Trinkflaschen", "Erste-Hilfe-Set"];
  const zuviel = bleibt.filter(x => del.includes(x));
  if (zuviel.length) probleme.push("Der Löschblock trifft etwas, das bleiben soll: " + zuviel.join(", "));
  else if (!fehlend.length) zeilen.push("Getroffen werden genau vier Posten: " + erwartet.join(" · "));

  // c) Name und Satznummer
  if (!/set name = 'Trikotsatz FRMD PASN'\s+where name = 'Trikotsatz'/.test(sql))
    probleme.push("Der Trikotsatz wird nicht nach seinem Ausrüster benannt");
  else if (!/set mit_nummer = false/.test(sql))
    probleme.push("Die Satznummer wird nicht abgeschaltet");
  else zeilen.push("Trikotsatz FRMD PASN, Satznummer aus");

  // d) Der Posten im Schrank behält seinen Kurznamen
  if (/update public\.material_posten\s+set name/.test(sql))
    probleme.push("Die Migration benennt auch den Material-Posten um – der Schrank führt Kurznamen, der Katalog den vollen");

  // e) Kein Hilfetext verspricht die Satznummer mehr
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const doku = fs.readFileSync(path.join(h.REPO, "doku/Uebersicht_Funktionen-Adler-App_v1.md"), "utf8");
  const verspricht = t => /beim Trikotsatz (auch )?die Satznummer/.test(t);
  if (verspricht(views)) probleme.push("Die Hilfe verspricht weiter eine Satznummer");
  if (verspricht(doku)) probleme.push("Die Funktionsübersicht verspricht weiter eine Satznummer");

  // f) Das Feld bleibt im Programm – abgeschaltet ist es an einem Artikel, nicht ausgebaut
  const modul = fs.readFileSync(path.join(h.REPO, "md-ausruestung.js"), "utf8");
  if (!/art\.mit_nummer\?/.test(modul))
    probleme.push("Das Nummernfeld ist aus dem Modul verschwunden – gemeint war: an EINEM Artikel aus, nicht ausgebaut");
  else if (!probleme.length) zeilen.push("Das Nummernfeld bleibt im Programm, nur dieser eine Artikel führt keins");

  return h.ergebnis("Material und Ausstattung: der Bestand, wie er wirklich ist", !probleme.length, zeilen.concat(probleme));
};
