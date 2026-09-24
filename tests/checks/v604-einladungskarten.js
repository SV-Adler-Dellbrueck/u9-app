/* v604 · Einladungskarten für den Elternabend
   Je Kind eine gedruckte Karte mit QR-Code; wer sie scannt, legt mit E-Mail und Passwort
   ein Konto an und ist sofort dem Kind zugeordnet – ohne dass eine E-Mail verschickt wird.
   Gemessen wird:
   a) der Weg der Eltern: Karte scannen → Formular → Konto → angemeldet, und zwar ohne
      /auth/v1/otp; der Code verschwindet sofort aus der Adresse
   b) ungleiche Passwörter werden abgefangen, bevor irgendetwas an den Server geht
   c) die Anmeldeseite bietet zuerst E-Mail und Passwort an; der Code per Mail bleibt erreichbar
   d) der Kartendruck des Trainers: alte Karten zurückziehen, nur Prüfwerte speichern, und
      jeder gedruckte QR-Code trägt genau den Code, dessen SHA-256 gespeichert wurde
   e) kein QR-Code geht mehr an einen fremden Dienst (Karten und Aushang)
   f) Server-Seite: Tabelle für anon gesperrt, Zähler nur mit Dienstschlüssel, und ein
      bestehendes Konto bekommt nie ein fremdes Passwort */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CODE = "ABCDEFGHJKLMNPQRSTUV";

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const funktion = (antwort) => h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ role: "parent" }],          // sonst verwirft renderElternPortal die frische Sitzung (Rolle unbekannt)
    funktionen: { "eltern-einladung": (u, req) => {
      let b = {}; try { b = JSON.parse(req.postData() || "{}"); } catch (e) {}
      return antwort(b);
    } },
    auth: { token: { access_token: "e.x.y", refresh_token: "r", expires_in: 3600 } }
  });

  // ── a) der Weg der Eltern ───────────────────────────────────────────────────
  {
    const s = await h.starten({
      start: "/eltern/index.html?portal&einladung=" + CODE, angemeldet: false, warten: 1500,
      supabase: funktion(b => b.aktion === "pruefen" ? { ok: true, vorname: "Kind A", frei: 2 } : { ok: true, neu: true, vorname: "Kind A" })
    });
    const vorher = await s.page.evaluate(() => ({
      suche: location.search,
      text: (document.getElementById("eltern-portal") || document.body).innerText,
      form: !!document.getElementById("einl-email") && !!document.getElementById("einl-pw2")
    }));
    if (vorher.suche.includes("einladung")) probleme.push("a) der Code bleibt in der Adresse stehen: " + vorher.suche);
    if (!vorher.form) probleme.push("a) kein Formular mit E-Mail und zwei Passwortfeldern");
    if (!/Familie von\s+Kind A/.test(vorher.text)) probleme.push("a) die Seite nennt das Kind nicht („Familie von Kind A“ fehlt)");
    if (vorher.form) {
      await s.page.fill("#einl-email", "eltern@example.org");
      await s.page.fill("#einl-pw", "adler-2026");
      await s.page.fill("#einl-pw2", "adler-2026");
      await s.page.click("#einl-ok");
      await s.page.waitForTimeout(1200);
    }
    const fn = s.gesendet.filter(x => x.pfad.endsWith("/functions/v1/eltern-einladung"));
    const einl = fn.find(x => x.body && x.body.aktion === "einloesen");
    const token = s.gesendet.find(x => x.pfad.endsWith("/auth/v1/token"));
    const otp = s.abgefragt.filter(x => /\/auth\/v1\/otp$/.test(x.pfad));
    const nachher = await s.page.evaluate(() => ({
      sitzung: !!localStorage.getItem("adler_sb_auth_eltern"),
      puffer: (() => { try { return sessionStorage.getItem("adler_einladung"); } catch (e) { return "?"; } })()
    }));
    if (!einl) probleme.push("a) die Karte wurde nicht eingelöst");
    else {
      if (einl.body.code !== CODE) probleme.push("a) eingelöst wurde ein anderer Code: " + einl.body.code);
      if (einl.body.email !== "eltern@example.org") probleme.push("a) die E-Mail kam nicht an: " + einl.body.email);
    }
    if (!token || !/grant_type=password/.test(token.suche)) probleme.push("a) nach dem Anlegen keine Anmeldung mit Passwort");
    if (otp.length) probleme.push(`a) ${otp.length}× /auth/v1/otp – es wurde eine Mail angestoßen`);
    if (!nachher.sitzung) probleme.push("a) nach dem Anlegen liegt keine Eltern-Sitzung vor");
    if (nachher.puffer) probleme.push("a) der Code bleibt nach dem Einlösen im Puffer");
    const f = s.fehler(); if (f.length) probleme.push("a) Konsole: " + f.slice(0, 2).join(" | "));
    zeilen.push(`a) Karte → Formular („Familie von Kind A“) → ${einl ? "eingelöst" : "—"} → ${token ? "Passwort-Anmeldung" : "—"} → Sitzung ${nachher.sitzung ? "da" : "fehlt"} · Mails: ${otp.length}`);
    await s.schliessen();
  }

  // ── b) ungleiche Passwörter ─────────────────────────────────────────────────
  {
    const s = await h.starten({
      start: "/eltern/index.html?portal&einladung=" + CODE, angemeldet: false, warten: 1500,
      supabase: funktion(b => b.aktion === "pruefen" ? { ok: true, vorname: "Kind B", frei: 2 } : { ok: true, neu: true })
    });
    let meldung = "";
    if (await s.page.$("#einl-email")) {
      await s.page.fill("#einl-email", "eltern@example.org");
      await s.page.fill("#einl-pw", "adler-2026");
      await s.page.fill("#einl-pw2", "adler-2027");
      await s.page.click("#einl-ok");
      await s.page.waitForTimeout(400);
      meldung = await s.page.evaluate(() => document.getElementById("einl-err")?.textContent || "");
    }
    const einl = s.gesendet.filter(x => x.body && x.body.aktion === "einloesen");
    if (einl.length) probleme.push("b) trotz ungleicher Passwörter an den Server geschickt");
    if (!/nicht gleich/.test(meldung)) probleme.push("b) keine verständliche Meldung bei ungleichen Passwörtern: " + JSON.stringify(meldung));
    zeilen.push(`b) ungleiche Passwörter: „${meldung}“ · Anfragen: ${einl.length}`);
    await s.schliessen();
  }

  // ── c) Anmeldeseite: Passwort zuerst, Code bleibt erreichbar ─────────────────
  {
    const s = await h.starten({
      start: "/eltern/index.html?portal", angemeldet: false, warten: 1500,
      supabase: funktion(() => ({ ok: false }))
    });
    const r = await s.page.evaluate(() => {
      const sichtbar = el => !!el && el.offsetParent !== null;
      return { pw: sichtbar(document.getElementById("ep-pw")), codeKnopf: sichtbar(document.getElementById("ep-send")),
        umschalter: [...document.querySelectorAll("#eltern-portal button")].some(b => /Code per E-Mail/.test(b.textContent)) };
    });
    if (r.pw) {
      await s.page.fill("#ep-email", "eltern@example.org");
      await s.page.fill("#ep-pw", "adler-2026");
      await s.page.click("#ep-login");
      await s.page.waitForTimeout(800);
    }
    const token = s.gesendet.find(x => x.pfad.endsWith("/auth/v1/token"));
    if (!r.pw) probleme.push("c) die Anmeldeseite zeigt kein Passwortfeld");
    if (r.codeKnopf) probleme.push("c) „Code anfordern“ steht vorn – der Weg ohne Mail soll der erste sein");
    if (!r.umschalter) probleme.push("c) der Weg „Code per E-Mail“ ist nicht mehr erreichbar");
    if (!token || !/grant_type=password/.test(token.suche) || !token.body || token.body.password !== "adler-2026") probleme.push("c) die Anmeldung geht nicht als grant_type=password an /auth/v1/token");
    zeilen.push(`c) Anmeldeseite: Passwortfeld ${r.pw ? "vorn" : "fehlt"} · Code per Mail ${r.umschalter ? "erreichbar" : "fehlt"} · Anmeldung ${token ? token.suche : "—"}`);
    await s.schliessen();
  }

  // ── d) Kartendruck des Trainers ─────────────────────────────────────────────
  {
    const s = await h.starten({ start: "/trainer/index.html", supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
    const r = await s.page.evaluate(async () => {
      if (typeof qrBibliothek !== "function" || typeof einladungskartenOpen !== "function") return { fehlt: true, kaestchen: [], texte: [], svg: 0, karten: 0, html: "", basis: "" };
      KADER = [{ id: 1, name: "Kind A", aktiv: true }, { id: 2, name: "Kind B", aktiv: true }, { id: 3, name: "Kind C", aktiv: false }];
      window.print = () => {};
      await qrBibliothek();
      const orig = window.qrcode, texte = [];
      window.qrcode = function (t, e) { const q = orig(t, e); const add = q.addData; q.addData = function (d) { texte.push(d); return add.apply(q, arguments); }; return q; };
      await einladungskartenOpen();
      const kaestchen = [...document.querySelectorAll(".einl-kind")].map(c => c.value);
      await einladungskartenDrucken(document.getElementById("einl-druck"));
      const druck = document.getElementById("zert-print");
      return { kaestchen, texte, svg: druck ? druck.querySelectorAll("svg").length : 0,
        karten: druck ? druck.querySelectorAll(".einl-karte").length : 0, html: druck ? druck.innerHTML : "",
        basis: appRoot() + "eltern/?portal&einladung=" };
    });
    if (r.fehlt) probleme.push("d) im Trainer-Bereich gibt es keinen Kartendruck (einladungskartenOpen fehlt)");
    const del = s.gesendet.find(x => x.methode === "DELETE" && x.pfad.endsWith("/eltern_einladung"));
    const post = s.gesendet.find(x => x.methode === "POST" && x.pfad.endsWith("/eltern_einladung"));
    const zeilenPost = (post && Array.isArray(post.body)) ? post.body : [];
    if (r.kaestchen.join() !== "1,2") probleme.push("d) Auswahl zeigt nicht genau die aktiven Kinder: " + r.kaestchen.join());
    if (!del || !/spieler_id=in\.\(1,2\)/.test(decodeURIComponent(del.suche))) probleme.push("d) alte Karten der Kinder werden nicht zurückgezogen");
    if (zeilenPost.length !== 2) probleme.push(`d) ${zeilenPost.length} Karten gespeichert statt 2`);
    const hashes = new Set(zeilenPost.map(z => z.code_hash));
    if (zeilenPost.some(z => !/^[0-9a-f]{64}$/.test(z.code_hash || ""))) probleme.push("d) gespeichert wird kein SHA-256");
    if (zeilenPost.some(z => Object.keys(z).some(k => /^code$|klar/.test(k)))) probleme.push("d) der Klartext-Code landet in der Datenbank");
    if (zeilenPost.some(z => z.max_nutzungen !== 2)) probleme.push("d) eine Karte gilt nicht für genau zwei Elternteile");
    const karten = r.texte.filter(t => t.startsWith(r.basis));
    if (karten.length !== 2) probleme.push(`d) ${karten.length} QR-Codes mit Einladungsadresse statt 2`);
    for (const t of karten) {
      const code = t.slice(r.basis.length);
      if (!/^[A-Z2-9]{20}$/.test(code)) probleme.push("d) Code hat nicht die Form, die die Edge Function annimmt: " + code);
      if (!hashes.has(crypto.createHash("sha256").update(code).digest("hex"))) probleme.push("d) ein gedruckter Code passt zu keinem gespeicherten Prüfwert");
      if (r.html.includes(code)) probleme.push("d) der Code steht im Klartext auf der Druckseite");
    }
    if (r.karten !== 2 || r.svg !== 2) probleme.push(`d) Druckseite: ${r.karten} Karten, ${r.svg} QR-Grafiken`);
    zeilen.push(`d) Trainer: ${r.kaestchen.length} aktive Kinder zur Wahl · DELETE ${del ? "ja" : "nein"} · ${zeilenPost.length} Prüfwerte gespeichert · ${karten.length} QR-Codes, jeder passt zu seinem Prüfwert`);
    const f = s.fehler(); if (f.length) probleme.push("d) Konsole: " + f.slice(0, 2).join(" | "));

    // ── e) kein fremder QR-Dienst ─────────────────────────────────────────────
    const aushang = await s.page.evaluate(async () => { window.print = () => {}; await qrAushangOpen(); const d = document.getElementById("zert-print"); return { html: d ? d.innerHTML : "", svg: d ? d.querySelectorAll("svg").length : 0 }; });
    const fremd = /api\.qrserver\.com|chart\.googleapis|quickchart/i;
    if (fremd.test(r.html)) probleme.push("e) die Einladungskarten holen den QR-Code bei einem fremden Dienst");
    if (fremd.test(aushang.html) || aushang.svg !== 1) probleme.push("e) der QR-Aushang erzeugt den Code nicht selbst");
    zeilen.push(`e) Karten und Aushang: QR-Code im Browser erzeugt, kein fremder Dienst (${aushang.svg} SVG im Aushang)`);
    await s.schliessen();
  }

  // ── f) Server-Seite ────────────────────────────────────────────────────────
  {
    const lies = f => { try { return fs.readFileSync(path.join(h.REPO, f), "utf8"); } catch (e) { probleme.push("f) fehlt: " + f); return ""; } };
    const mig = lies("supabase/migrations/20260925_eltern_einladung.sql");
    const fn = lies("supabase/functions/eltern-einladung/index.ts");
    const pruef = [
      [/enable row level security/i.test(mig), "RLS eingeschaltet"],
      [/revoke all on public\.eltern_einladung from anon/i.test(mig), "Tabelle für anon gesperrt"],
      [/revoke execute on function public\.eltern_einladung_nutzen\(text\)\s+from public, anon, authenticated/i.test(mig), "Zähler nicht für Nutzer aufrufbar"],
      [/nutzungen < max_nutzungen/.test(mig) && /gueltig_bis > now\(\)/.test(mig), "Zähler prüft Rest und Ablauf in einer Anweisung"],
      [/email_confirm:\s*true/.test(fn), "Konto wird bestätigt angelegt (keine Mail)"],
      [!/updateUserById|updateUser\(/.test(fn), "kein Passwort-Überschreiben bestehender Konten"],
      [/!angemeldet && !vorhanden/.test(fn), "neues Konto nur, wenn die Adresse noch keins hat"],
      [!/(sb_secret_|service_role_key\s*=\s*["'])/i.test(fn), "kein Schlüssel im Quelltext"]
    ];
    pruef.filter(p => !p[0]).forEach(p => probleme.push("f) fehlt: " + p[1]));
    zeilen.push("f) " + pruef.filter(p => p[0]).map(p => p[1]).join(" · "));
  }

  return h.ergebnis("v604 Einladungskarten: Zugang per QR, E-Mail und Passwort, ohne Mailversand", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
