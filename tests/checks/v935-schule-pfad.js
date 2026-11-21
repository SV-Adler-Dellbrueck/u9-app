/* v935 – Adler-Schule: „Die Fragen brauchen einmal Internet“ auf dem Handy.

   Ursache: eltern/ und trainer/ setzen <base href="../">. kfBasis() hängte trotzdem noch „../“
   davor. Auf GitHub Pages (App unter /u9-app/) zeigte der Abruf damit auf /uebungen/… statt
   /u9-app/uebungen/… → 404. Im Prüfwerkzeug lief die App im Wurzelverzeichnis, dort schluckt die
   URL-Auflösung das überzählige „../“ – deshalb war es unsichtbar.

   Fälle (ohne Browser, mit der echten Auflösung gegen <base href="../">):
   a) Fragen-Datei und b) Vorlese-Datei landen unter /u9-app/, aus eltern/ und aus trainer/. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const probleme = [], zeilen = [];
  const core = fs.readFileSync(path.join(h.REPO, "core.js"), "utf8");
  const quiz = fs.readFileSync(path.join(h.REPO, "quiz.js"), "utf8");
  const ausschnitt = (src, von) => { const i = src.indexOf(von); const k = src.indexOf("\n}", i); return src.slice(i, k + 2); };
  for (const seite of ["/u9-app/eltern/", "/u9-app/trainer/index.html", "/u9-app/eltern/?kabine=1", "/u9-app/kinder/index.html", "/u9-app/kinder/", "/kinder/index.html"]) {
    const u = new URL("https://beispiel.test" + seite);
    const ctx = { location: { origin: u.origin, pathname: u.pathname } };
    vm.createContext(ctx);
    vm.runInContext(quiz.split("\n").find(z => z.startsWith("function kfBasis(")), ctx);
    const basis = new URL("../", u);   // <base href="../">
    const datei = new URL(vm.runInContext("kfBasis()", ctx) + "uebungen/kinderfragen.json", basis).pathname;
    const ton = new URL(vm.runInContext("kfBasis()", ctx) + "audio/schule/x.mp3", basis).pathname;
    const wurzel = seite.startsWith("/u9-app/") ? "/u9-app/" : "/";
    if (datei !== wurzel + "uebungen/kinderfragen.json") probleme.push(`a) ${seite}: Fragen unter ${datei}`);
    if (ton !== wurzel + "audio/schule/x.mp3") probleme.push(`b) ${seite}: Aufnahme unter ${ton}`);
  }
  zeilen.push("a/b) aus eltern/, trainer/ und kinder/ (auch im Wurzelverzeichnis): /u9-app/uebungen/kinderfragen.json und /u9-app/audio/schule/…");
  return h.ergebnis("v935 Adler-Schule findet ihre Fragen auch unter /u9-app/", !probleme.length, zeilen.concat(probleme));
};
