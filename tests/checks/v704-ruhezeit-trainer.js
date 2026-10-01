/* v704 · Ruhezeit der Benachrichtigungen: Eltern 21:30–7 Uhr, Trainerteam bei Adler-Rufen ohne Ruhezeit
   PO 01.10.: „Ich erhalte keine Push-Nachrichten, wenn es eine neue Nachricht in der Eltern-App gibt.“
   Befund: Versand lief; die einzige Eltern-Nachricht seit Anmeldung des Trainergeräts kam um 22:56 Uhr –
   Ruhezeit 21–7 (v673) – und war vor 7 Uhr gelesen. Kacheln: „Trainer ohne Ruhezeit“ und „Ruhezeit
   sichtbar machen“, dazu „stelle um auf 21.30 bis 7 Uhr“.
   a) Eltern: unter dem Chat-Kopf steht, dass Benachrichtigungen 21:30–7 Uhr ruhen; Glocke aus → die Zeile sagt „aus“
   b) Trainer: die Zeile sagt „rund um die Uhr“
   c) Migration: rufe_push_faellig nimmt nachts nur Trainer (keine frühe Rückkehr mehr), Grenze 21:30;
      „Wie war's?“ ruht ebenfalls 21:30–7 Uhr
   d) Hilfe und Funktionsübersicht nennen 21:30
   Seit v705 gilt die Ruhezeit je Konto (push_ruht) – c) nimmt beide Fassungen an. */
"use strict";
const fs = require("fs"), path = require("path");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const tok = "x." + Buffer.from(JSON.stringify({ sub: "u-eigen" })).toString("base64") + ".y";
  const basis = () => h.supabaseAttrappe({
    rufe_raum: [{ id: 5, name: "Allgemein", emoji: "📣", sort: 0 }], rufe_nachricht: [], rufe_reaktion: [], rufe_fixiert: [],
    rufe_push_aus: [], rpc: { is_rufe_mod: false }
  });
  const lauf = async start => {
    const s = await h.starten({ start, warten: 1000, hoehe: 800, supabase: basis() });
    const r = await s.page.evaluate(async tok => {
      const w = ms => new Promise(x => setTimeout(x, ms));
      if (typeof rufeOpen !== "function") return { fehlt: true };
      window.sbToken = () => tok;
      await rufeOpen(); await w(400);
      const z = document.getElementById("rufe-ruhe"), out = { an: z ? z.textContent : null, sichtbar: !!z && z.getBoundingClientRect().height > 0 };
      _rf.glockeAn = true; await rufeGlockeUmschalten(); await w(100);
      out.aus = z ? z.textContent : null;
      return out;
    }, tok).catch(e => ({ fehler: String(e) }));
    const f = s.fehler(); await s.schliessen(); return { r, f };
  };
  const el = await lauf("/eltern/index.html"), tr = await lauf("/trainer/index.html");
  const titel = "v704 Ruhezeit 21:30–7 Uhr nur für Eltern, Trainer rund um die Uhr, Hinweis im Chat";
  if (el.r.fehler || el.r.fehlt || tr.r.fehler || tr.r.fehlt) return h.ergebnis(titel, false, ["Abbruch: " + JSON.stringify({ el: el.r, tr: tr.r })]);
  if (!el.r.sichtbar || !/ruhen 21:30–7 Uhr/.test(el.r.an || "")) probleme.push("a) Eltern-Hinweis fehlt: " + el.r.an);
  if (!/aus/.test(el.r.aus || "") || /ruhen/.test(el.r.aus || "")) probleme.push("a) Glocke aus, Zeile sagt: " + el.r.aus);
  if (!tr.r.sichtbar || !/rund um die Uhr/.test(tr.r.an || "")) probleme.push("b) Trainer-Hinweis fehlt: " + tr.r.an);
  // c) neueste Migration, die rufe_push_faellig bzw. wiewars_push_faellig festlegt
  const migDir = path.join(h.REPO, "supabase/migrations");
  const neueste = name => fs.readdirSync(migDir).sort().filter(d => fs.readFileSync(path.join(migDir, d), "utf8").includes("function public." + name)).pop();
  const ruf = fs.readFileSync(path.join(migDir, neueste("rufe_push_faellig") || ""), "utf8");
  const ruf1 = ruf.slice(ruf.indexOf("function public.rufe_push_faellig"), ruf.indexOf("end $function$"));
  // v705: die Ruhezeit kommt seither je Konto aus push_ruht (Vorgabe Eltern 21:30–7, Trainer keine) – beides erfüllt die Regel
  const v705 = /push_ruht\(s\.user_id, p_jetzt\)/.test(ruf1) && /time '21:30'/.test(ruf) && /role = 'trainer'\) then return false/.test(ruf);
  if (!v705 && (!/time '21:30'/.test(ruf1) || !/not v_ruhe or p\.role='trainer'/.test(ruf1)) || /then return; end if/.test(ruf1)) probleme.push("c) rufe_push_faellig: Ruhezeit nicht 21:30 oder nicht nur für Eltern (" + neueste("rufe_push_faellig") + ")");
  if (!/interval '30 minutes'/.test(ruf1)) probleme.push("c) Bündelung fehlt");
  const ww = fs.readFileSync(path.join(migDir, neueste("wiewars_push_faellig") || ""), "utf8");
  if (!/time '21:30'|push_ruht\(p\.id, p_jetzt\)/.test(ww.slice(ww.indexOf("function public.wiewars_push_faellig")))) probleme.push("c) Wie war's ruht nicht ab 21:30");
  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8"), doku = fs.readFileSync(path.join(h.REPO, "doku/Uebersicht_Funktionen-Adler-App_v1.md"), "utf8");
  if (!/21:30 und 7 Uhr/.test(views) || /zwischen 21 und 7 Uhr keine/.test(views)) probleme.push("d) Hilfe nennt die neue Ruhezeit nicht");
  if (!/21:30–7/.test(doku) || /Ruhezeit 21–7 Uhr/.test(doku)) probleme.push("d) Funktionsübersicht nennt die neue Ruhezeit nicht");
  const fe = el.f.concat(tr.f); if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  zeilen.push(`Eltern: „${el.r.an}“ · aus: „${el.r.aus}“`, `Trainer: „${tr.r.an}“`);
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
