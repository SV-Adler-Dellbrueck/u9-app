/* v926 · 21.11.: Ein versehentlich eingecheckter Symlink „node_modules“ (Ziel nur auf einem Arbeitsrechner) brach ab v922
   jede GitHub-Pages-Veröffentlichung ab – vier Versionen gingen nicht live, ohne dass ein Prüffall rot wurde.
   Im Repo darf keine Verknüpfung (Git-Modus 120000) stehen. */
"use strict";
const { execFileSync } = require("child_process");
module.exports = async function (h) {
  const titel = "v926 Keine Verknüpfungen (Symlinks) im Repo – sonst scheitert die Pages-Veröffentlichung";
  let liste = "";
  try { liste = execFileSync("git", ["ls-files", "-s"], { cwd: h.REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return h.ergebnis(titel, true, ["kein Git-Arbeitsverzeichnis – übersprungen"]); }
  const links = liste.split("\n").filter(z => /^120000 /.test(z)).map(z => z.split("\t")[1]);
  return h.ergebnis(titel, !links.length, links.length ? ["Symlinks im Repo: " + links.join(", ")] : ["keine Symlinks unter " + liste.split("\n").filter(Boolean).length + " Dateien"]);
};
