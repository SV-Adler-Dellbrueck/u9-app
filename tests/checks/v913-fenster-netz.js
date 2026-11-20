/* v913 · Bestandsaufnahme 4.5: rund 175 von Hand gebaute Fenster – Sicherheitsnetz und Baustein.
   a) Ein handgebautes Fenster mit niedriger fester Ebene (9999), das über einem offenen Fenster (10040) aufgeht,
      liegt danach darüber (am 20.11. lag die Grillhütte unter dem Termin-Fenster).
   b) Ein handgebautes, mittig ausgerichtetes Fenster ohne overflow mit sehr hohem Inhalt auf 360 × 640:
      es wird scrollbar, und der obere Rand des Inhalts bleibt erreichbar (safe center).
   c) Baustein fensterAuf(): role="dialog" aria-modal="true", über dem obersten offenen Fenster, dieselbe id
      ersetzt das alte Fenster, Tippen auf den Grund schließt nur mit o.aussen, Karte höchstens o.breite breit.
   d) Die Kabine und Fenster außerhalb des Dialogbereichs (Konfetti, Toasts) bleiben unangetastet;
      ein Fenster, das schon oben liegt, behält seine Ebene. */
"use strict";
module.exports = async function (h) {
  const titel = "v913 Fenster: Netz für handgebaute Fenster (Ebene, Scrollen) und Baustein fensterAuf";
  const probleme = [], zeilen = [];
  const t = await h.starten({ warten: 800, breite: 360, hoehe: 640, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await t.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("pin-gate")?.remove();
    if (typeof fensterAuf !== "function" || typeof _fensterRichten !== "function") return { fehlt: true };
    const out = {};
    const roh = (id, css, html) => { const d = document.createElement("div"); d.id = id; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.style.cssText = css; d.innerHTML = html || "<div style='background:#fff;padding:20px'>x</div>"; document.body.appendChild(d); return d; };
    // a) Ebene
    const unten = roh("t-unten", "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10040;display:flex");
    const neu = roh("t-neu", "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex");
    await w(60);
    out.a = { z: Number(getComputedStyle(neu).zIndex), oben: document.elementFromPoint(180, 320)?.closest("[id^='t-']")?.id };
    // d) schon oben liegend: behält die Ebene
    const hoch = roh("t-hoch", "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10060;display:flex");
    await w(60); out.dHoch = Number(getComputedStyle(hoch).zIndex);
    [unten, neu, hoch].forEach(x => x.remove());
    // b) Scrollen und safe center
    const lang = roh("t-lang", "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10002;display:flex;align-items:center;justify-content:center;padding:16px",
      "<div id='t-lang-k' style='background:#fff;width:300px;height:1500px'><b id='t-lang-oben'>Oben</b></div>");
    await w(60);
    const s = getComputedStyle(lang), k = document.getElementById("t-lang-k").getBoundingClientRect();
    out.b = { of: s.overflowY, ai: s.alignItems, oben: Math.round(k.top), scrollbar: lang.scrollHeight > lang.clientHeight };
    lang.scrollTop = 99999; await w(30); out.b.unten = Math.round(document.getElementById("t-lang-k").getBoundingClientRect().bottom) <= 640;
    lang.remove();
    // c) Baustein
    const alt = roh("t-alt", "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10050;display:flex");
    await w(30);
    const f1 = fensterAuf("t-fb", { breite: 420 });
    const f2 = fensterAuf("t-fb", { breite: 420, aussen: false });
    out.c = { anzahl: document.querySelectorAll("#t-fb").length, role: f2.grund.getAttribute("role") + "/" + f2.grund.getAttribute("aria-modal"),
      ueber: Number(getComputedStyle(f2.grund).zIndex) > 10050, breite: Math.round(f2.karte.getBoundingClientRect().width), alt1weg: !f1.grund.isConnected,
      of: getComputedStyle(f2.grund).overflowY };
    f2.grund.click(); await w(30); out.c.ohneAussenBleibt = !!document.getElementById("t-fb");
    f2.grund.remove(); alt.remove();
    const f3 = fensterAuf("t-fb3", { aussen: true, mitte: true });
    f3.karte.click(); await w(20); out.c.karteBleibt = !!document.getElementById("t-fb3");
    f3.grund.click(); await w(20); out.c.grundSchliesst = !document.getElementById("t-fb3");
    // d) Kabine und Konfetti unangetastet
    const kab = roh("kabine", "position:fixed;inset:0;z-index:9500;background:#123");
    const ov = roh("t-ov", "position:fixed;inset:0;z-index:10002;display:flex");
    await w(60);
    out.d = { kabine: Number(getComputedStyle(kab).zIndex), kabOf: getComputedStyle(kab).overflowY };
    kab.remove(); ov.remove();
    const konf = document.createElement("div"); konf.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:10072"; document.body.appendChild(konf);
    await w(40); out.d.konfetti = konf.style.overflowY === "" && konf.style.zIndex === "10072"; konf.remove();
    return out;
  });
  const fehler = t.fehler(); await t.schliessen();
  if (r.fehlt) return h.ergebnis(titel, false, ["fensterAuf/_fensterRichten fehlt"]);
  if (!(r.a.z > 10040) || r.a.oben !== "t-neu") probleme.push(`a) neues Fenster liegt nicht oben: z ${r.a.z}, oben ${r.a.oben}`);
  if (r.b.of !== "auto" || !/safe/.test(r.b.ai) || r.b.oben < 0 || !r.b.scrollbar || !r.b.unten) probleme.push(`b) hoher Inhalt: ${JSON.stringify(r.b)}`);
  if (r.c.anzahl !== 1 || r.c.role !== "dialog/true" || !r.c.ueber || r.c.breite > 420 || !r.c.alt1weg || r.c.of !== "auto" || !r.c.ohneAussenBleibt || !r.c.karteBleibt || !r.c.grundSchliesst) probleme.push(`c) Baustein: ${JSON.stringify(r.c)}`);
  if (r.dHoch !== 10060 || r.d.kabine !== 9500 || r.d.kabOf !== "visible" || !r.d.konfetti) probleme.push(`d) unangetastet: hoch ${r.dHoch}, ${JSON.stringify(r.d)}`);
  zeilen.push(`a) 9999 über 10040 → ${r.a.z} · b) ${r.b.of}, ${r.b.ai}, Inhalt oben bei ${r.b.oben} px · c) ${r.c.breite} px breit, über dem offenen, Grund schließt nur mit „aussen“ · d) Kabine ${r.d.kabine}, oben liegendes ${r.dHoch}`);
  if (fehler.length) probleme.push("Konsole: " + fehler.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
