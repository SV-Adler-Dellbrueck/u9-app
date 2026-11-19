/* v880 · Fenster ohne feste weiße Fläche im dunklen Modus (Charles 19.11.: „Daten löschen“,
   „Kinder-App koppeln“ und der Terminanhang standen auf festem Weiß; die Knöpfe darin sind seit
   v876–v878 dunkel – lesbar, aber ein Bruch).
   Die Fensterflächen und ihre Texte kommen jetzt aus den Farb-Variablen (--surface, --text,
   --text2, --text3, --border), wie bei den übrigen Dialogen der App. Im Elternbereich färbte bis
   v879 ein Nachlauf (elternThemeSweep) helle Flächen um – auf einen eigenen Ton (41,47,61), nicht
   auf --surface, und nur, wenn sein Beobachter lief. Im Trainerbereich gibt es den Nachlauf nicht.
   a) Quelltext: In den umgestellten Fenstern (Funktionen unten) keine feste helle Fläche
      (#fff, #ffffff, white, #f8fafc, #f1f5f9) und keine feste neutrale Schriftfarbe mehr.
   b) Gerendert, Elternbereich – Daten löschen, Mein Konto, Passwort, Termin-Details mit Anhang,
      Kinder-App (Karten), Gerät trennen, Notfallkarte, Elterngespräch, Fan-Fakten – und Trainer-
      bereich – Quiz-Ergebnisse zurücksetzen, Rundgang-Blase –, je HELL, DUNKEL (System) und DUNKEL
      (data-theme bei hellem System):
      dunkel: Fensterfläche = --surface und deutlich unter Weiß (Leuchtdichte < 0,1);
      hell: Fensterfläche weiß wie bisher;
      jeder sichtbare Text ≥ 4,5:1 gegen seine Fläche; jeder Knopf wie v876 (≥ 4,5:1, gesperrte
      ausgenommen; ≥ 44 px hoch). */
"use strict";
const fs = require("fs"), path = require("path");

const FENSTER = {
  "md-eltern-portal.js": ["elternPasswortOpen", "elternKontoOpen", "chronikOpen", "whatsNewOpen", "datenschutzInfoOpen", "rsvpGrundFragen", "terminDetailOpen",
    "tdWasMussMit", "notfallOpen", "elternFotoConsentOpen", "elternTermineOpen", "elternAngabenOpen"],
  "md-kasse.js": ["elternGespraechOpen", "elternLoeschenOpen"],
  "md-kabine.js": ["kinderAppOpen", "kinderAppLaden", "kaKarte", "kaKindBlock", "kaGeraetZeile", "kinderAppCode", "kinderAppTrennenFragen", "kaLinkBlock"],
  "md-termin-anhang.js": ["taEltern", "taChip"],
  "md-carpool.js": ["elternCarpoolOpen", "elternCarpoolRender", "elternCarpoolDriverForm"],
  "md-fanfakten.js": ["elternFanfactsOpen", "elternAusstattungLesen"],
  "md-nest.js": ["nestBogenRender"],
  "quiz.js": ["tqResetProgress"],
  "core.js": ["_fgZeigen"]
};
const HELL = /background(-color)?:\s*(#fff|#ffffff|white|#f8fafc|#f1f5f9)(?![0-9a-fA-F])/i;
const TINTE = /(^|[;"'`\s])color:\s*(#1a1a2e|#0f172a|#1e293b|#334155|#475569|#64748b|#0A1A3A|#45506a)(?![0-9a-fA-F])/i;

function koerper(src, name) {
  const z = src.split("\n");
  const s = z.findIndex(l => new RegExp(`^(async )?function ${name.replace(/\$/g, "\\$")}\\(`).test(l));
  if (s < 0) return null;
  if (z[s].trim().endsWith("}")) return [{ nr: s + 1, l: z[s] }];
  const out = [{ nr: s + 1, l: z[s] }];
  for (let i = s + 1; i < z.length && !/^}/.test(z[i]) && !/^(async )?function /.test(z[i]); i++) out.push({ nr: i + 1, l: z[i] });
  return out;
}

const MESSUNG = `
  window.__fensterMessung = (fl, wurzel) => {
    const L = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const rgb = s => (String(s).match(/[\\d.]+/g) || []).map(Number);
    const probe = document.createElement("div"); probe.style.background = "var(--surface)"; document.body.appendChild(probe);
    const surface = getComputedStyle(probe).backgroundColor; probe.remove();
    const bg = getComputedStyle(fl).backgroundColor;
    const sichtbar = el => { const q = el.getBoundingClientRect(), cs = getComputedStyle(el); return q.width > 0 && q.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity !== 0; };
    const texte = [];
    for (const el of (wurzel || fl).querySelectorAll("*")) {
      if (el.closest("button,select,option,svg,input,textarea") || !sichtbar(el)) continue;
      const eigen = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim();
      if (!eigen || !/[A-Za-zÄÖÜäöüß0-9]/.test(eigen)) continue;
      texte.push({ t: eigen.slice(0, 24), k: window.__kontrastVon(el) });
    }
    const knoepfe = [...(wurzel || fl).querySelectorAll("button")].filter(sichtbar).map(b => {
      const q = b.getBoundingClientRect(), gesperrt = b.disabled || b.getAttribute("aria-disabled") === "true";
      return { t: (b.getAttribute("aria-label") || b.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 24), k: gesperrt ? null : window.__kontrastVon(b), h: Math.round(q.height) };
    });
    return { bg, surface, lum: +L(rgb(bg)).toFixed(3), texte, knoepfe };
  };`;

module.exports = async function (h) {
  const titel = "v880 Fenster im dunklen Modus aus den Farb-Variablen (Eltern und Trainer)";
  const probleme = [], zeilen = [];

  // a) Quelltext
  const funde = []; let zahl = 0;
  for (const [datei, namen] of Object.entries(FENSTER)) {
    const src = fs.readFileSync(path.join(h.REPO, datei), "utf8");
    for (const n of namen) {
      const k = koerper(src, n);
      if (!k) { funde.push(`${datei}: ${n} fehlt`); continue; }
      zahl++;
      for (const { nr, l } of k) {
        if (HELL.test(l)) funde.push(`${datei}:${nr} ${n} (feste helle Fläche ${l.match(HELL)[2]})`);
        else if (TINTE.test(l)) funde.push(`${datei}:${nr} ${n} (feste Schrift ${l.match(TINTE)[2]})`);
      }
    }
  }
  if (funde.length) probleme.push(`a) ${funde.length} Stellen: ` + funde.slice(0, 8).join(" · ") + (funde.length > 8 ? " …" : ""));
  else zeilen.push(`a) Quelltext: ${zahl} Fenster-Funktionen ohne feste helle Fläche und feste neutrale Schrift`);

  // b) gerendert
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u-eltern", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const termine = [{ id: 100, datum: h.tagePlus(2), typ: "spiel", titel: "", gegner: "FC Beispiel", heim: false, uhrzeit: "16:45", uhrzeit_ende: "18:00", ort: "Sportplatz", trainer_status: {} }];
  const eltern = () => h.supabaseAttrappe({
    kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 3, label: "", kader: { id: 3, name: "Kind C", nr: 9 } }], termine, rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    kind_konto: [{ uid: "k1", spieler_id: 3, geraet: "Tablet", tageslimit_min: 60, aktiv: true, gekoppelt_am: "2026-11-01T10:00:00Z" }], kind_sitzung: [], loeschantrag: [],
    kind_notfall: [], kind_fanfacts: [], ausstattung_ausgabe: [], elterngespraech_wunsch: [],
    termin_anhang: [{ id: 1, termin_id: 100, pfad: "100/a.pdf", name: "plan.pdf", titel: "Spielplan", mime: "application/pdf", groesse: 120000 }],
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false }
  });
  const ELTERN_FENSTER = [
    ["Daten löschen", () => elternLoeschenOpen(), "#el-loeschen-modal > div"],
    ["Mein Konto", () => elternKontoOpen(), "#ep-konto-modal > div"],
    ["Passwort", () => elternPasswortOpen(), "#ep-pw-modal > form"],
    ["Termin mit Anhang", () => terminDetailOpen(100), "#td-modal > div", "#td-anhang a, #td-anhang button, #td-anhang div"],
    ["Kinder-App", () => kinderAppOpen(), "#ka-body > div"],
    ["Gerät trennen", () => kinderAppTrennenFragen("k1"), "#ka-frage > div"],
    ["Notfallkarte", () => notfallOpen(3, "Kind C"), "#nf-modal > div"],
    ["Elterngespräch", () => elternGespraechOpen(), "#eg-modal > div"],
    ["Fan-Fakten", () => elternFanfactsOpen(3, "Kind C"), "#fanfacts-modal > div"]
  ];
  const TRAINER_FENSTER = [
    ["Quiz zurücksetzen", () => { localStorage.setItem(TQ_PROGRESS_KEY, JSON.stringify({ "Kind A": {} })); tqResetProgress();
      const m = [...document.body.children].reverse().find(e => /Quiz-Ergebnisse/.test(e.textContent)); if (m) m.setAttribute("data-probe", "quiz"); },
      '[data-probe="quiz"] > div'],
    ["Rundgang", () => fuehrungStart([{ emo: "👉", t: "Probe", d: "Ein Schritt des Rundgangs." }], {}), "#fg-ov .fg-blase"]
  ];
  const VARIANTEN = [["hell", "light", null], ["dunkel", "dark", null], ["dunkel/data-theme", "light", "dark"]];
  const befunde = [], uebersicht = [];
  const bewerten = (variante, name, m) => {
    if (!m) { befunde.push(`${variante}/${name}: Fenster nicht gefunden`); return; }
    const dunkel = variante !== "hell";
    if (dunkel) {
      if (m.bg !== m.surface) befunde.push(`${variante}/${name}: Fläche ${m.bg} statt --surface ${m.surface}`);
      if (!(m.lum < 0.1)) befunde.push(`${variante}/${name}: Fläche hell (Leuchtdichte ${m.lum})`);
    } else if (m.bg !== "rgb(255, 255, 255)") befunde.push(`hell/${name}: Fläche ${m.bg} statt Weiß`);
    for (const t of m.texte) if (t.k < 4.5) befunde.push(`${variante}/${name}: Text „${t.t}“ ${t.k}:1`);
    for (const k of m.knoepfe) {
      if (k.k !== null && k.k < 4.5) befunde.push(`${variante}/${name}: Knopf „${k.t}“ ${k.k}:1`);
      if (k.h < 44) befunde.push(`${variante}/${name}: Knopf „${k.t}“ ${k.h} px hoch`);
    }
    if (!m.texte.length) befunde.push(`${variante}/${name}: kein Text gemessen`);
    if (variante === "dunkel") uebersicht.push(`${name} ${m.lum}`);
  };
  /* Wartet auf genau das Fenster (es lädt teils Daten nach) – höchstens 5 s. */
  const oeffnen = async (page, fn, sel) => {
    await page.evaluate(() => document.querySelectorAll('#el-loeschen-modal,#ep-konto-modal,#ep-pw-modal,#td-modal,#ka-modal,#ka-frage,#nf-modal,#eg-modal,#fanfacts-modal,#fg-ov').forEach(x => x.remove()));
    await page.evaluate(fn).catch(e => befunde.push(String(e).slice(0, 100)));
    return page.waitForFunction(s => { const e = document.querySelector(s); return e && e.getBoundingClientRect().height > 0 && e.textContent.trim().length > 0; }, sel, { timeout: 5000 }).then(() => true).catch(() => false);
  };

  for (const [variante, scheme, thema] of VARIANTEN) {
    // Elternbereich
    const a = await h.starten({ scheme, start: "/eltern/index.html?portal", angemeldet: false, warten: 1500, breite: 390, hoehe: 844, supabase: eltern() });
    await a.page.evaluate(({ T, thema }) => {
      localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: T, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 }));
      if (thema) localStorage.setItem("adler_theme", thema);
    }, { T: TOKEN, thema });
    await a.page.reload({ waitUntil: "networkidle" });
    await a.page.waitForFunction(() => document.getElementById("ep-dash-body") && typeof elternLoeschenOpen === "function" && typeof kinderAppOpen === "function" && typeof taEltern === "function",
      null, { timeout: 15000 }).catch(() => befunde.push(variante + ": Eltern-Startseite nicht geladen"));
    await a.page.evaluate(h.kontrastHelfer); await a.page.evaluate(MESSUNG);
    for (const [name, fn, sel, innen] of ELTERN_FENSTER) {
      if (!await oeffnen(a.page, fn, sel)) { bewerten(variante, name, null); continue; }
      if (innen) await a.page.waitForFunction(s => document.querySelector(s), innen, { timeout: 5000 }).catch(() => befunde.push(`${variante}/${name}: Anhang nicht geladen`));
      const alle = await a.page.evaluate(s => [...document.querySelectorAll(s)].map((el, i) => i), sel);
      for (const i of alle) bewerten(variante, alle.length > 1 ? `${name} ${i + 1}` : name, await a.page.evaluate(([s, i]) => window.__fensterMessung(document.querySelectorAll(s)[i]), [sel, i]));
    }
    const fe = a.fehler(); await a.schliessen();
    if (fe.length) befunde.push(`${variante} Eltern-Konsole: ` + fe.slice(0, 2).join(" | "));

    // Trainerbereich
    const t = await h.starten({ scheme, warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [] }) });
    if (thema) { await t.page.evaluate(th => localStorage.setItem("adler_theme", th), thema); await t.page.reload({ waitUntil: "networkidle" }); }
    await t.page.waitForFunction(() => typeof tqResetProgress === "function" && typeof fuehrungStart === "function", null, { timeout: 15000 }).catch(() => befunde.push(variante + ": Trainer nicht geladen"));
    await t.page.evaluate(() => document.getElementById("pin-gate")?.remove());
    await t.page.evaluate(h.kontrastHelfer); await t.page.evaluate(MESSUNG);
    for (const [name, fn, sel] of TRAINER_FENSTER) {
      await t.page.evaluate(() => { document.getElementById("fg-ov")?.remove(); document.querySelectorAll('[data-probe="quiz"]').forEach(e => e.remove()); });
      await t.page.evaluate(fn).catch(e => befunde.push(String(e).slice(0, 100)));
      const da = await t.page.waitForFunction(s => { const e = document.querySelector(s); return e && e.getBoundingClientRect().height > 0; }, sel, { timeout: 5000 }).then(() => true).catch(() => false);
      bewerten(variante, name, da ? await t.page.evaluate(s => window.__fensterMessung(document.querySelector(s)), sel) : null);
    }
    const ft = t.fehler(); await t.schliessen();
    if (ft.length) befunde.push(`${variante} Trainer-Konsole: ` + ft.slice(0, 2).join(" | "));
  }
  if (befunde.length) probleme.push(`b) ${befunde.length} Befunde: ` + befunde.slice(0, 12).join(" · ") + (befunde.length > 12 ? " …" : ""));
  else zeilen.push("b) hell weiß, dunkel = --surface, Text und Knöpfe ≥ 4,5:1, Knöpfe ≥ 44 px · Leuchtdichte dunkel: " + uebersicht.join(" · "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
