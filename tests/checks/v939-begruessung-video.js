/* v939 · Begrüßungsvideo im Stundenplan (Charles 22.11.2026, Entwurf im Bild freigegeben: „Ja, so bauen“).
   a) Die Begrüßung hat neben „Vorlesen“ einen Knopf „Ansehen“ (≥ 44 px, aria-expanded). Seit v967: Video direkt sichtbar,
      ohne „Vorlesen“ und „Ansehen“, Startbild, lädt erst beim Tippen (preload none, kein Autoplay).
   b) Ein Tipp öffnet das Video direkt unter dem Lehrer: video/lehrer-begruessung.mp4 mit Startbild .webp; ein zweiter Tipp
      schließt es wieder.
   c) Der Stundenbeginn behält seinen eigenen Weg (Kachel „Video ansehen“), dort gibt es keinen „Ansehen“-Knopf.
   d) Jedes Lehrer-Video hat ein Startbild mit gleichem Namen (.webp, höchstens 40 KB); der Spieler der Stunde nennt es. */
module.exports = async function (h) {
  const fs = require("fs"), path = require("path");
  const probleme = [], zeilen = [];
  const namen = ["lehrer-begruessung", ...[1, 2, 3, 4, 5, 6].map(k => "lehrer-stunde" + k)];
  for (const n of namen) {
    const f = path.join(h.REPO, "video", n + ".webp");
    if (!fs.existsSync(f)) probleme.push(`d) video/${n}.webp fehlt`); else if (fs.statSync(f).size > 40960) probleme.push(`d) video/${n}.webp zu groß`);
  }
  const s = await h.starten({ start: "/kinder/index.html?quiz", breite: 360, hoehe: 740, warten: 2500, bibliothek: true, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.querySelectorAll("[role=dialog]").forEach(d => d.remove());
    tqPlayer = "Kind A"; if (typeof _akBereich !== "undefined") _akBereich = "theorie"; tqStart(); await w(150);   // v961: der Stundenplan ist die Theorie der Akademie
    /* v967 · Charles 24.11.: „Direkt das Video anzeigen mit einem Player-Button“ – kein „Ansehen“, kein „Vorlesen“ mehr */
    const box = document.querySelector("#tq-panel .sl-video"), v = box && box.querySelector("video"), out = {};
    out.offen = { sichtbar: !!box && !box.hidden && !!v && v.getBoundingClientRect().height > 100, nachLehrer: box?.previousElementSibling?.classList.contains("sl-lehrer"),
      src: v?.getAttribute("src") || "", poster: v?.getAttribute("poster") || "", controls: !!v?.controls, autoplay: !!v?.autoplay, preload: v?.getAttribute("preload") || "",
      knoepfe: !!document.querySelector("#tq-panel .sl-lehrer.sl-mit-video .sl-ansehen, #tq-panel .sl-lehrer.sl-mit-video .sl-vorlesen") };
    await kfStart(); await w(150); kfBlock(1); await w(120);
    out.stunde = { ansehen: !!document.querySelector("#tq-panel .sl-ansehen"), kachel: !!document.getElementById("kf-video") };
    document.getElementById("kf-video")?.click(); await w(80);
    out.stunde.poster = document.getElementById("kf-video-spieler")?.getAttribute("poster") || "";
    return out;
  }).catch(e => ({ fehler: String(e) }));
  await s.schliessen();
  if (r.fehler) probleme.push(r.fehler);
  else {
    const o = r.offen;
    if (!o.sichtbar || !o.nachLehrer || !/video\/lehrer-begruessung\.mp4$/.test(o.src) || !/video\/lehrer-begruessung\.webp$/.test(o.poster) || !o.controls || o.autoplay || o.preload !== "none" || o.knoepfe) probleme.push(`a/b) Video: ${JSON.stringify(o)}`);
    if (r.stunde.ansehen || !r.stunde.kachel || !/video\/lehrer-stunde1\.webp$/.test(r.stunde.poster)) probleme.push(`c/d) Stunde: ${JSON.stringify(r.stunde)}`);
  }
  zeilen.push(`a/b) Video direkt unter der Sprechblase, mit Startbild, ohne Knöpfe (v967) · c) Stunde behält die Kachel · d) ${namen.length} Startbilder`);
  return h.ergebnis("v939 Begrüßungsvideo im Stundenplan", !probleme.length, zeilen.concat(probleme));
};
