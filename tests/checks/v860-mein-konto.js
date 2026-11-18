/* v860 · Eltern-App: Kontoeinstellungen an einem Ort „Mein Konto“ (Bestandsaufnahme 3.10, Charles 18.11.).
   Vorher: Angaben unter „Mehr vom Team“, Push unter „Trainerteam kontaktieren“, Passwort im Kopfmenü,
   Datenexport/Löschen unter „Datenschutz“. Geprüft am gerenderten Eltern-Dashboard. */
"use strict";
module.exports = async function (h) {
  const titel = "v860 Eltern: „Mein Konto“ bündelt die Kontoeinstellungen";
  const probleme = [], zeilen = [];
  const TOKEN = "x." + Buffer.from(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600, email: "eltern@example.org" })).toString("base64url") + ".y";
  const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1000, breite: 390, hoehe: 844,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7 } }], termine: [], rueckmeldungen: [] }) });
  await s.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(4000);
  try {
    const r = await s.page.evaluate(async () => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      for (let i = 0; i < 40 && !document.getElementById("ep-menue-knopf"); i++) await w(150);
      const menue = document.getElementById("ep-menue")?.innerHTML || "";
      const kontakt = document.getElementById("cat-kontakt")?.innerHTML || "";
      const mehr = document.getElementById("cat-mehr")?.innerHTML || "";
      const ds = document.getElementById("cat-datenschutz")?.innerHTML || "";
      const pushImDash = !!document.querySelector("#ep-dash-body #push-slot-eltern");
      if (typeof elternKontoOpen !== "function") return { fehlt: true, menue };
      elternMenueUmschalten(); await w(50);
      elternKontoOpen(); await w(400);
      const m = document.getElementById("ep-konto-modal");
      const out = { menue, kontakt, mehr, ds, pushImDash,
        dialog: m && m.getAttribute("role") === "dialog" && m.getAttribute("aria-modal") === "true",
        inhalt: m ? m.innerHTML : "", fokus: !!(m && m.contains(document.activeElement)),
        menueZu: document.getElementById("ep-menue")?.style.display === "none",
        hoehen: m ? [...m.querySelectorAll("button")].filter(b => b.offsetParent).map(b => [b.id || b.textContent.trim().slice(0, 20), Math.round(b.getBoundingClientRect().height)]) : [],
        breit: document.documentElement.scrollWidth };
      // Unterfenster liegt darüber, „Mein Konto“ bleibt offen
      document.getElementById("konto-passwort")?.click(); await w(100);
      const pw = document.getElementById("ep-pw-modal");
      out.pwOben = !!pw && +getComputedStyle(pw).zIndex > +getComputedStyle(m).zIndex && !!document.getElementById("ep-konto-modal");
      return out;
    }).catch(err => ({ fehler: String(err) }));
    if (r.fehler) probleme.push("Fehler im Ablauf: " + r.fehler);
    else if (r.fehlt) probleme.push("a) elternKontoOpen fehlt");
    else {
      if (!/elternKontoOpen\(\)/.test(r.menue) || /elternPasswortOpen\(\)/.test(r.menue) || /elternPortalLogout\(\)/.test(r.menue)) probleme.push("a) Kopfmenü: ⚙️ Mein Konto statt Passwort/Abmelden erwartet");
      if (!r.dialog) probleme.push("b) „Mein Konto“ ist kein modaler Dialog");
      for (const [id, f] of [["konto-angaben", "elternAngabenOpen()"], ["konto-passwort", "elternPasswortOpen()"], ["konto-export", "elternDataExport(this)"], ["konto-loeschen", "elternLoeschenOpen()"], ["konto-abmelden", "elternPortalLogout()"]])
        if (!r.inhalt.includes(`id="${id}"`) || !r.inhalt.includes(f)) probleme.push("c) fehlt in Mein Konto: " + id);
      if (!/id="push-slot-eltern"/.test(r.inhalt) || r.pushImDash) probleme.push("d) Benachrichtigungen gehören nach „Mein Konto“, nicht in die Kachel Kontakt");
      if (/elternAngabenOpen\(\)/.test(r.mehr)) probleme.push("e) „Meine Angaben“ steht noch unter „Mehr vom Team“");
      if (/elternDataExport|elternLoeschenOpen/.test(r.ds)) probleme.push("f) Export/Löschen stehen noch unter Freigaben");
      if (!/elternFotoConsentOpen/.test(r.ds) || !/notfallOpen/.test(r.ds)) probleme.push("g) Foto-Freigabe und Notfallkarte müssen unter Freigaben bleiben");
      if (!/elternKontoOpen\(\)/.test(r.kontakt)) probleme.push("h) Kontakt-Kachel ohne Weg zu den Benachrichtigungen");
      if (!r.fokus) probleme.push("i) Fokus nicht im Dialog: " + r.fokus);
      if (!r.menueZu) probleme.push("j) Kopfmenü bleibt offen");
      const klein = r.hoehen.filter(([, hh]) => hh < 44); if (klein.length) probleme.push("k) Knöpfe unter 44 px: " + JSON.stringify(klein));
      if (r.breit > 390) probleme.push("l) Seite breiter als der Bildschirm: " + r.breit);
      if (!r.pwOben) probleme.push("m) Passwort-Fenster liegt nicht über „Mein Konto“");
      if (/eltern@example\.org/.test(r.inhalt)) zeilen.push("Anmelde-E-Mail steht im Kopf"); else probleme.push("n) Anmelde-E-Mail fehlt im Kopf");
      zeilen.push("Knöpfe: " + r.hoehen.map(x => x[0]).join(", "));
    }
    const fe = s.fehler(); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  } finally { await s.schliessen(); }
  return h.ergebnis(titel, probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
