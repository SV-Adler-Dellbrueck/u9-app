/* v645 · Datenschutz-Nachzug aus dem Entwurf der Datenschutzerklärung.

   Skill-Video (YouTube) und Kabinen-Playlist (Spotify) wurden beim bloßen Öffnen der Ansicht
   als iframe geladen – die IP-Adresse des Geräts, oft das eines Kindes, ging an den Anbieter,
   ohne dass jemand etwas angetippt hatte. Jetzt steht dort ein Knopf, der die Herkunft nennt.

   a) Skill der Woche: vor dem Tipp kein iframe, kein Aufruf an youtube; danach genau ein
      iframe mit youtube-nocookie.
   b) Kabinen-Hype: dasselbe für Spotify.
   c) Knöpfe mindestens 44 px hoch.
   d) Die Eltern-Karte „So schützen wir …“ nennt keine Schriftdienste mehr (seit v642 falsch).
   e) Die Migration hängt die Löschfrist für nutzung_log an die Datenhygiene. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ start: "/eltern/index.html", warten: 900, breite: 390,
    supabase: h.supabaseAttrappe({
      kader: h.kaderZeilen(),
      skill_woche: [{ id: 1, aktiv: true, titel: "Übersteiger", beschreibung: "Zehnmal links, zehnmal rechts",
        video_url: "https://www.youtube.com/watch?v=abcdefghijk", created_at: "2026-09-20T10:00:00Z" }],
      team_config: [{ id: 1, spotify_playlist: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd" }],
    }) });
  const fremd = [];
  s.page.on("request", q => { const u = q.url(); if (/youtube|spotify/.test(u)) fremd.push(u); });

  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    if (typeof kabineOpen === "function") kabineOpen();
    for (let i = 0; i < 40 && !document.getElementById("kabine-body"); i++) await warte(50);
    async function lauf(fn, id) {
      if (typeof window[fn] !== "function") return { fehlt: fn };
      await window[fn]();
      const b = document.getElementById("kabine-body");
      const vor = { iframes: b ? b.querySelectorAll("iframe").length : -1 };
      const halter = document.getElementById(id);
      const knopf = halter && halter.querySelector("button");
      vor.knopf = knopf ? knopf.textContent.trim() : "";
      vor.hoehe = knopf ? Math.round(knopf.getBoundingClientRect().height) : 0;
      vor.herkunft = halter ? halter.textContent.replace(/\s+/g, " ").trim() : "";
      if (knopf) knopf.click();
      await warte(100);
      const f = b ? [...b.querySelectorAll("iframe")] : [];
      return { vor, nach: f.length, src: f[0] ? f[0].src : "" };
    }
    out.video = await lauf("kabineSkillWoche", "ks-video");
    out.musik = await lauf("kabineHype", "kh-playlist");
    return out;
  });
  const pruef = (name, x, muster, herkunft) => {
    if (!x || x.fehlt) { probleme.push(`${name}: Funktion fehlt`); return; }
    if (x.vor.iframes !== 0) probleme.push(`${name}: iframe schon vor dem Tipp`);
    if (!x.vor.knopf) probleme.push(`${name}: kein Knopf zum Laden`);
    if (!new RegExp(herkunft).test(x.vor.herkunft)) probleme.push(`${name}: Herkunft nicht genannt („${x.vor.herkunft}“)`);
    if (x.vor.hoehe < 44) probleme.push(`${name}: Knopf nur ${x.vor.hoehe} px hoch`);
    if (x.nach !== 1 || !muster.test(x.src)) probleme.push(`${name}: nach dem Tipp ${x.nach} iframe(s), src ${x.src}`);
    zeilen.push(`${name}: vorher 0 iframes, Knopf „${x.vor.knopf}“ ${x.vor.hoehe} px → nachher ${x.nach}`);
  };
  pruef("a) Video", r.video, /^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk/, "YouTube");
  pruef("b) Playlist", r.musik, /^https:\/\/open\.spotify\.com\/embed\/playlist\//, "Spotify");
  // Vor dem ersten Tipp darf keine Anfrage rausgegangen sein; nach beiden Tipps sind welche erlaubt.
  // Der Browser in der Prüfung hat kein Netz nach draußen – gezählt wird der Versuch.
  zeilen.push(`Anfragen an YouTube/Spotify insgesamt (erst nach Tipp): ${fremd.length}`);

  const R = h.REPO;
  const ep = fs.readFileSync(path.join(R, "md-eltern-portal.js"), "utf8");
  if (/Google Fonts und jsDelivr/.test(ep)) probleme.push("d) Eltern-Karte nennt noch Google Fonts und jsDelivr");
  const mig = fs.readFileSync(path.join(R, "supabase/migrations/20260927_v645_nutzung_loeschfrist.sql"), "utf8");
  if (!/adler-datenhygiene/.test(mig) || !/delete from public\.nutzung_log\s+where ts < now\(\)-interval ''12 months''/.test(mig))
    probleme.push("e) Löschfrist für nutzung_log fehlt in der Migration");

  const fe = s.fehler();
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v645 Fremde Inhalte in der Kabine erst nach Tipp", !probleme.length, probleme.concat(zeilen));
};
