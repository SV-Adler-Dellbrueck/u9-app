/* v717 · „Aus der Adlerschmiede“ – die Eltern-Neuerungen der Woche, sonntags 18 Uhr als Push.
   PO 02.10.: „… einmal in der Woche … einen Push an die Eltern-App … Neues aus der Adlerschmiede,
   wo neue Features, die im Laufe der letzten sieben Tage in die App integriert wurden, aufgelistet
   sind … nicht Korrekturen von Fehlern … dass man die Leute nicht zuspammt.“ Entschieden: Name
   „Aus der Adlerschmiede“, Sonntag 18:00, nur wenn es Neues gibt, je Konto abschaltbar.
   Den Push selbst schickt die Edge Function adlerschmiede-push (probe:true zeigt ihn ohne Versand);
   hier wird geprüft, was die Eltern in der App davon sehen.
   a) Adler News: oberster Eintrag „Aus der Adlerschmiede: 3 Neuerungen …“ (drei seit dem letzten Blick)
   b) Antippen öffnet ein Fenster (role=dialog) mit den Einträgen der letzten sieben Tage, ältere nicht;
      Schließen-Knopf ≥ 44 px
   c) Start mit ./eltern/#adlerschmiede (Ziel der Benachrichtigung) öffnet das Fenster von selbst und
      nimmt den Anker danach aus der Adresse – der Loader darf ihn beim Ergänzen von ?portal nicht
      verlieren (tat er bis v716)
   d) Tipp auf die Benachrichtigung bei offener App (Service Worker fragt die App) öffnet es auch
   e) Schalter in den Benachrichtigungen: role=switch, ≥ 44 px, an → aus schreibt adlerschmiede_push_aus
   f) Sicherung enthält die drei neuen Tabellen */
"use strict";
const fs = require("fs"), path = require("path");
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const schmiede = [
    { id: 5, datum: h.tagePlus(0), emoji: "💰", text: "Neu A: heute" },
    { id: 4, datum: h.tagePlus(-2), emoji: "📖", text: "Neu B: vorgestern" },
    { id: 3, datum: h.tagePlus(-5), emoji: "🚗", text: "Neu C: vor fünf Tagen" },
    { id: 2, datum: h.tagePlus(-10), emoji: "🌙", text: "Alt D: vor zehn Tagen" },
    { id: 1, datum: h.tagePlus(-20), emoji: "🔑", text: "Alt E: vor zwanzig Tagen" }];
  let ausZeilen = [], posts = 0;
  const basis = h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
    eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7, foto_stadionheft_ok: true } }],
    termine: [], rueckmeldungen: [], team_config: [{ spenden_link: "" }],
    adlerschmiede: schmiede,
    adlerschmiede_push_aus: (u, req) => {
      if (req.method() === "POST") { posts++; ausZeilen = [{ user_id: "u1" }]; return { status: 201, body: "" }; }
      if (req.method() === "DELETE") { ausZeilen = []; return { status: 204, body: "" }; }
      return ausZeilen;
    },
    rpc: { eltern_news: {}, training_rueckblick: [], kasse_summary: { saldo: 0, umlagen: [], sammel: [] }, is_kasse: false } });

  async function oeffnen(anker) {
    const s = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 844, supabase: basis });
    await s.page.evaluate(({ t, seit }) => {
      localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 }));
      localStorage.setItem("adler_news_seen", JSON.stringify({ wn: seit }));
    }, { t: TOKEN, seit: h.tagePlus(-8) });
    // wie die Benachrichtigung: ./eltern/#adlerschmiede – ohne ?portal, das setzt der Loader selbst
    if (anker) await s.page.goto(new URL("/eltern/index.html#adlerschmiede", s.page.url()).href, { waitUntil: "networkidle" });
    else await s.page.reload({ waitUntil: "networkidle" });
    await s.page.waitForTimeout(4000);
    return s;
  }
  const modal = () => {
    const m = document.getElementById("wn-modal"); if (!m) return null;
    const knopf = [...m.querySelectorAll("button")].find(b => /danke/.test(b.textContent));
    return { rolle: m.getAttribute("role"), modal: m.getAttribute("aria-modal"), eintraege: [...m.querySelectorAll(".schmiede-eintrag")].map(e => e.textContent.replace(/\s+/g, " ").trim()),
      knopf: knopf ? Math.round(knopf.getBoundingClientRect().height) : 0 };
  };

  // a) b) d) e)
  const s = await oeffnen(false);
  const r = await s.page.evaluate(async (modalSrc) => {
    const modal = eval("(" + modalSrc + ")");
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const out = { fehlt: ["schmiedeOpen", "schmiedePushRender", "schmiedePushSetzen", "pushZielEmpfangen"].filter(n => typeof window[n] !== "function") };
    if (out.fehlt.length) return out;
    const erster = document.querySelector("#cat-news button");
    out.news = erster ? erster.textContent.replace(/\s+/g, " ").trim() : null;
    if (erster) erster.click(); await warte(200);
    out.b = modal();
    document.getElementById("wn-modal")?.remove();
    // d) Antwort an den Service Worker
    let antwort = null;
    pushZielEmpfangen({ data: { art: "push-ziel", url: location.origin + location.pathname + "#adlerschmiede" }, ports: [{ postMessage: x => { antwort = x; } }] });
    await warte(200);
    out.d = { antwort, offen: !!document.getElementById("wn-modal") };
    document.getElementById("wn-modal")?.remove();
    // e)
    const slot = document.createElement("div"); slot.id = "t-schmiede"; slot.style.width = "358px"; document.body.prepend(slot);
    await schmiedePushRender("t-schmiede"); await warte(100);
    const k1 = slot.querySelector("button");
    out.e1 = k1 ? { rolle: k1.getAttribute("role"), an: k1.getAttribute("aria-checked"), h: Math.round(k1.getBoundingClientRect().height), t: k1.textContent } : null;
    if (k1) k1.click(); await warte(600);
    const k2 = slot.querySelector("button");
    out.e2 = k2 ? { an: k2.getAttribute("aria-checked"), t: k2.textContent } : null;
    return out;
  }, modal.toString());
  const f1 = s.fehler(); await s.schliessen();

  // c)
  const s2 = await oeffnen(true);
  const c = await s2.page.evaluate((modalSrc) => ({ m: eval("(" + modalSrc + ")")(), hash: location.hash, href: location.href, n: (window._adlerschmiede || []).length }), modal.toString());
  const f2 = s2.fehler(); await s2.schliessen();

  const titel = "v717 Aus der Adlerschmiede: News, Fenster, Push-Ziel, Schalter";
  if (r.fehlt && r.fehlt.length) return h.ergebnis(titel, false, [r.fehlt.join(", ") + " fehlt"]);
  const f = [].concat(f1, f2);
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));

  if (!r.news || !/^🛠️ ?Aus der Adlerschmiede: 3 Neuerungen/.test(r.news)) probleme.push(`a) oberster News-Eintrag: „${r.news}“`);
  else zeilen.push(`a) „${r.news.replace(/ ›$/, "")}“`);

  const erw = ["Neu A", "Neu B", "Neu C"];
  if (!r.b) probleme.push("b) kein Fenster nach dem Antippen");
  else if (r.b.rolle !== "dialog" || r.b.modal !== "true") probleme.push(`b) Fenster ohne role=dialog/aria-modal (${r.b.rolle}/${r.b.modal})`);
  else if (r.b.eintraege.length !== 3 || !erw.every((x, i) => r.b.eintraege[i].includes(x))) probleme.push("b) Einträge: " + JSON.stringify(r.b.eintraege));
  else if (r.b.knopf < 44) probleme.push(`b) Schließen-Knopf ${r.b.knopf} px`);
  else zeilen.push(`b) Fenster mit drei Einträgen der Woche, ältere nicht; Knopf ${r.b.knopf} px`);

  if (!c.m) probleme.push(`c) Start mit #adlerschmiede öffnet kein Fenster (${c.href}, ${c.n} Einträge)`);
  else if (c.m.eintraege.length !== 3) probleme.push("c) Einträge: " + JSON.stringify(c.m.eintraege));
  else if (c.hash) probleme.push(`c) Anker bleibt in der Adresse: ${c.hash}`);
  else zeilen.push("c) Start mit #adlerschmiede öffnet das Fenster, Anker entfernt");

  if (!r.d.antwort || r.d.antwort.ok !== true) probleme.push("d) App antwortet dem Service Worker nicht mit ok: " + JSON.stringify(r.d.antwort));
  else if (!r.d.offen) probleme.push("d) offene App öffnet das Fenster nicht");
  else zeilen.push("d) Tipp auf die Meldung bei offener App öffnet das Fenster ohne Neuladen");

  if (!r.e1) probleme.push("e) kein Schalter");
  else if (r.e1.rolle !== "switch" || r.e1.an !== "true" || r.e1.h < 44) probleme.push("e) Schalter: " + JSON.stringify(r.e1));
  else if (!r.e2 || r.e2.an !== "false" || posts !== 1) probleme.push(`e) nach dem Tipp: ${JSON.stringify(r.e2)}, ${posts} Schreibvorgänge`);
  else zeilen.push(`e) Schalter ${r.e1.h} px, an → aus schreibt einmal adlerschmiede_push_aus`);

  const views = fs.readFileSync(path.join(h.REPO, "views.js"), "utf8");
  const fehlt = ["adlerschmiede", "adlerschmiede_push_aus", "adlerschmiede_push_log"].filter(t => !views.includes(`"${t}"`));
  if (fehlt.length) probleme.push("f) Sicherung ohne " + fehlt.join(", "));
  else zeilen.push("f) Sicherung enthält adlerschmiede, adlerschmiede_push_aus, adlerschmiede_push_log");

  return h.ergebnis(titel, !probleme.length, zeilen.concat(probleme));
};
