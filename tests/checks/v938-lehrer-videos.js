/* v938 · Lehrer-Videos der Adler-Schule (Charles 22.11.2026: „Passt, wirkt gut“). Der Comic-Adler spricht Lennarts Ansage zu
   Beginn jeder Stunde (ElevenLabs, MiniMax-Lippensynchronisation, geholt mit der Action „Videos holen“).

   a) uebungen/kinderfragen.json nennt für alle sechs Stunden ein Video unter video/, und jede Datei liegt im Repo
      (eine fehlende Datei wäre eine Kachel, die einen leeren Spieler öffnet).
   b) Die Videos sind fürs Handy verkleinert: höchstens 1,5 MB je Datei.
   c) Der Service Worker reicht video/… durch, statt es zu cachen (Safari spielt ein ganz gecachtes Video bei
      Stück-Anfragen nicht ab), und kein Video steht im PRECACHE.
   d) Am echten DOM: In Stunde 1 erscheint die Kachel „Video ansehen“ vor „Erst anschauen“, der Spieler zeigt
      video/lehrer-stunde1.mp4.
   e) Das Lehrerbild kommt aus Maskottchen/ und lädt wirklich (kein Ersatz-Emoji). */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  let J = {}; try { J = JSON.parse(fs.readFileSync(path.join(h.REPO, "uebungen", "kinderfragen.json"), "utf8")); } catch (e) { probleme.push("a) kinderfragen.json: " + e.message); }
  const v = J.videos || {}, groessen = [];
  for (let k = 1; k <= 6; k++) {
    const p = v[String(k)];
    if (!p || !/^video\/[A-Za-z0-9._-]+\.mp4$/.test(p)) { probleme.push(`a) Stunde ${k}: kein Video eingetragen`); continue; }
    const datei = path.join(h.REPO, p);
    if (!fs.existsSync(datei)) { probleme.push(`a) Stunde ${k}: ${p} fehlt im Repo`); continue; }
    const kb = Math.round(fs.statSync(datei).size / 1024); groessen.push(kb);
    if (kb > 1536) probleme.push(`b) ${p}: ${kb} KB`);
  }
  const sw = fs.readFileSync(path.join(h.REPO, "sw.js"), "utf8");
  const vorPrecache = sw.indexOf('self.addEventListener("fetch"');
  if (!sw.slice(vorPrecache).includes("/\\/video\\/[^/]+\\.(mp4|webm)$/.test(url.split")) probleme.push("c) sw.js reicht video/… nicht durch");
  const pre = (sw.match(/PRECACHE\s*=\s*\[([\s\S]*?)\]/) || [])[1] || "";
  if (/video\//.test(pre)) probleme.push("c) Video im PRECACHE");
  const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 360, hoehe: 740, warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const txt = e => e ? e.textContent.replace(/\s+/g, " ").trim() : "";
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    tqPlayer = "Kind A"; await kfStart(); await w(150); kfBlock(1); await w(120);
    const img = document.querySelector("#tq-panel .sl-bild"); if (img && !img.complete) await new Promise(x => { img.onload = img.onerror = x; setTimeout(x, 1500); });
    const bild = img ? { src: img.getAttribute("src"), breite: img.naturalWidth } : null;
    const wege = [...document.querySelectorAll("#tq-panel .sl-weg")].map(txt);
    document.getElementById("kf-video")?.click(); await w(80);
    return { bild, wege, spieler: document.getElementById("kf-video-spieler")?.getAttribute("src") || "" };
  }).catch(e => ({ fehler: String(e) }));
  await s.schliessen();
  if (r.fehler) probleme.push("d) " + r.fehler);
  else {
    if (r.wege.length !== 3 || !/Video ansehen/.test(r.wege[0]) || !/Erst anschauen/.test(r.wege[1])) probleme.push(`d) Kacheln: ${JSON.stringify(r.wege)}`);
    if (!r.bild || !(r.bild.breite > 0) || !/Maskottchen\/.+\.webp$/.test(r.bild.src)) probleme.push(`e) Lehrerbild lädt nicht: ${JSON.stringify(r.bild)}`);
    if (!/video\/lehrer-stunde1\.mp4(#t=[\d.]+)?$/.test(r.spieler)) probleme.push(`d) Spieler: ${r.spieler}`);
  }
  zeilen.push(`e) Lehrerbild ${(r.bild||{}).breite||0} px breit · a/b) sechs Videos, ${groessen.join("/")} KB · c) am Service Worker vorbei · d) ${(r.wege || []).map(x => x.split(" ").slice(1, 3).join(" ")).join(" | ")}`);
  return h.ergebnis("v938 Lehrer-Videos der Adler-Schule", !probleme.length, zeilen.concat(probleme));
};
