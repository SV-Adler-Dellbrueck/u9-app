/* v937 · Packhinweis bei Kälte (Charles 21.11.2026: „bei Temperaturen unter 5 Grad sollte der Pack-Hinweis an die Eltern
   auch sein, Handschuhe, lange Hose, etc.“). Der Hinweis kommt aus wetterKitTip (core.js) und steht überall, wo
   wetterInto das Wetter zeigt: bei den Eltern in der Karte des nächsten Termins und im Termin-Fenster, beim Trainer im
   Termin-Fenster.
   a) 4,9 °C und −3 °C: Handschuhe, Mütze, lange Hose. b) 5 °C: der Hinweis „kühl“, nicht der Kälte-Hinweis.
   c) Beide Eltern-Stellen rufen wetterInto auf. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path"), vm = require("vm");
  const probleme = [];
  const core = fs.readFileSync(path.join(h.REPO, "core.js"), "utf8");
  const i = core.indexOf("function wetterKitTip("), k = core.indexOf("\n}", i);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(core.slice(i, k + 2), ctx);
  const tip = t => vm.runInContext(`wetterKitTip({hour:true,temp:${t},rain:0})`, ctx);
  for (const t of [4.9, 0, -3]) if (!/Handschuhe/.test(tip(t)) || !/lange Hose/.test(tip(t)) || !/Mütze/.test(tip(t))) probleme.push(`a) ${t} °C: „${tip(t)}“`);
  if (/Handschuhe/.test(tip(5)) || !/kühl/.test(tip(5))) probleme.push(`b) 5 °C: „${tip(5)}“`);
  const ep = fs.readFileSync(path.join(h.REPO, "md-eltern-portal.js"), "utf8");
  if (!/wetterInto\("wetter-eltern"/.test(ep) || !/wetterInto\("td-wetter"/.test(ep)) probleme.push("c) Eltern-Ansichten rufen wetterInto nicht mehr auf");
  return h.ergebnis("v937 Packhinweis unter 5 Grad: Handschuhe, Mütze, lange Hose", !probleme.length, [`4,9 °C: „${tip(4.9)}“ · 5 °C: „${tip(5)}“`].concat(probleme));
};
