/* v555 – Präsentationsmodus: groß zeigen, Fingerzoom, heller Rasen.

   Die Skizze ist 280 px breit gezeichnet. Am Platz reicht das, in einer Besprechung mit
   acht Kindern um ein Tablet herum nicht, und in der Sonne ist der dunkle Rasen schwer
   zu lesen. „Groß zeigen“ füllt den Bildschirm, zwei Finger zoomen, ein Umschalter legt
   eine helle Rasenfassung darüber.

   Der Umbau am Renderer ist der eigentliche Prüfgrund. `_skz` zeichnete bisher mit
   fest eingetragenen Farben; jetzt kommen sie aus einer Palette, damit es eine zweite
   geben kann. Ein solcher Umbau ist genau die Sorte Änderung, die versehentlich 107
   bestehende Zeichnungen verändert, ohne dass jemand hinsieht — eine Farbe um einen
   Buchstaben daneben fällt an keiner Stelle auf.

   Fälle:
   a) Die dunkle Fassung ist zeichengleich: eine Probe-Beschreibung, die JEDEN
      Elementtyp benutzt, ergibt exakt die Prüfsumme von vor dem Umbau.
   b) Keine der mitgelieferten Skizzen benutzt eine Farbe außerhalb des dunklen Satzes.
   c) Die helle Fassung ist wirklich anders, benutzt nur den hellen Satz und eigene
      Marker-Kennungen — zwei Varianten auf einer Seite dürfen sich die Pfeilspitzen
      nicht gegenseitig umfärben.
   d) Die gemessenen Kontraste des hellen Satzes halten 3:1 für Grafik und 4,5:1 für das
      Kürzel im Kreis.
   e) Das Fenster öffnet aus dem Übungsdetail, trägt role="dialog" und aria-modal, die
      Skizze ist am Handy mindestens 358 px breit, und der Schließen-Knopf misst 56 px.
   f) Zwei Finger zoomen, ein Doppeltipp setzt zurück.
   g) Der Umschalter merkt sich die Wahl im Gerät.
   h) Bei einer der 37 von Hand geschriebenen Altskizzen gibt es keinen Umschalter,
      sondern den Satz, dass es die helle Fassung dort noch nicht gibt. */
/* Die Prüfsumme der dunklen Fassung. Sie soll sich NICHT von selbst ändern — wird sie
   rot, hat ein Umbau die dunkle Zeichnung angefasst, und das ist zu begründen, bevor die
   Zahl nachgezogen wird.

   Nachgezogen am 22.09.2026 (v598): Der Ball ist von Weiß (#fff mit Rand #333) auf Schwarz
   (#111827 mit weißem Rand) gewechselt — auf Wunsch des PO und weil der weiße Ball auf dem
   HELLEN Rasen nur 1,30:1 erreichte. Die Probe-Beschreibung enthält einen Ball, also ändert
   sich ihre Zeichnung genau an dieser einen Stelle. Vorher 5d355fef430e. */
const GOLD = "6e9177798bfcc916c44f677f923b0afcef47fe2333e3de4eab1a5f1e3930ac2c";
/* Eine Beschreibung, die jeden Elementtyp anfasst – Zone, Jugendtor, Leiter, Wand,
   Pfeil, Linie, Hütchen, Spieler mit Kürzel, Ball, Text. */
const PROBE = {
  z: [[1, 1, 2, 2]], tor: [[5, 5, "h", 24, "j"]], leiter: [[2, 2, 60, "h"]], wand: [[1, 1, 2, 2]],
  p: [[1, 2, 3, 4, "l"]], li: [[0, 0, 1, 1, "sz"]], h: [[3, 3, "r"]], s: [[10, 20, "g", "A"]],
  b: [[7, 8]], tx: [[9, 9, "x"]]
};
const DUNKEL = ["#2d6a2d", "#1a4a1a", "#fbbf24", "#fff", "#d1d5db", "#4ade80", "#f87171", "#60a5fa",
  "#ffffff", "#fde047", "#fca5a5", "#7dd3fc", "#333", "#111827", "none"];  // #111827: Ball seit v598

module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const crypto = require("crypto");

  const s = await h.starten({ hoehe: 844, breite: 390, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });

  // ── a) bis d) Renderer und Palette ────────────────────────────────────────
  const r = await s.page.evaluate(({ PROBE }) => {
    const farbenAus = svg => (svg.match(/(?:fill|stroke)="([^"]+)"/g) || [])
      .map(x => x.slice(x.indexOf('"') + 1, -1));
    const dunkel = _skz(PROBE), hell = _skz(PROBE, { hell: true });
    /* Alle mitgelieferten Beschreibungen – Übungen und Kategorie-Symbole. */
    const alle = Object.keys(TF_SKIZZEN).map(k => TF_SKIZZEN[k]).concat(Object.keys(SKZ_KAT).map(k => SKZ_KAT[k]));
    const fremd = [];
    alle.forEach(spec => farbenAus(_skz(spec)).forEach(f => { if (!fremd.includes(f)) fremd.push(f); }));
    /* d) Kontraste aus den Konstanten nachrechnen, nicht aus dem Kommentar glauben. */
    const lum = hx => { const v = hx.replace("#", "").match(/../g).map(x => { const c = parseInt(x, 16) / 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const k = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +(((x + .05) / (y + .05)).toFixed(2)); };
    const P = SKZ_HELL, R = P.rasen;
    const grafik = {}, text = {};
    Object.keys(P.F).forEach(x => { grafik["Spieler " + x] = k(P.F[x], R); text["Kürzel auf " + x] = k(P.F[x], "#ffffff"); });
    Object.keys(P.pfeil).forEach(x => grafik["Pfeil " + x] = k(P.pfeil[x], R));
    grafik["Schusszone"] = k(P.sz, R); grafik["Mittellinie"] = k(P.mittel, R);
    grafik["Tor"] = k(P.tor, R); grafik["Rasenrand"] = k(P.rasenRand, R);
    return {
      dunkel, hell,
      hellFarben: farbenAus(hell),
      fremd,
      markeDunkel: /id="arr-p"/.test(dunkel), markeHell: /id="arrh-p"/.test(hell),
      legendeDunkel: skzLegende().includes(SKZ_DUNKEL.rasen),
      legendeHell: skzLegende(true).includes(SKZ_HELL.rasen),
      grafik, text
    };
  }, { PROBE });

  const summe = crypto.createHash("sha256").update(r.dunkel).digest("hex");
  if (summe !== GOLD) probleme.push(`Die dunkle Fassung hat sich geändert: Prüfsumme ${summe.slice(0, 12)} statt ${GOLD.slice(0, 12)}`);
  else zeilen.push("Dunkel: Probe-Beschreibung über alle zehn Elementtypen zeichengleich zu vor dem Umbau");

  const fremd = r.fremd.filter(f => !DUNKEL.includes(f) && !/^rgba\(/.test(f));
  if (fremd.length) probleme.push("Farbe außerhalb des dunklen Satzes in den mitgelieferten Skizzen: " + fremd.join(", "));

  if (r.dunkel === r.hell) probleme.push("Die helle Fassung ist mit der dunklen identisch");
  if (!r.markeDunkel || !r.markeHell) probleme.push("Die Marker-Kennungen der beiden Varianten sind nicht getrennt");
  if (r.hellFarben.includes("#2d6a2d")) probleme.push("Die helle Fassung trägt noch den dunklen Rasen");
  if (!r.legendeDunkel || !r.legendeHell) probleme.push("Die Legende folgt der Variante nicht");

  Object.keys(r.grafik).forEach(n => { if (r.grafik[n] < 3) probleme.push(`Kontrast hell, ${n}: ${r.grafik[n]}:1 – gefordert 3:1`); });
  Object.keys(r.text).forEach(n => { if (r.text[n] < 4.5) probleme.push(`Kontrast hell, ${n}: ${r.text[n]}:1 – gefordert 4,5:1`); });
  if (!probleme.length) {
    const g = Object.keys(r.grafik).map(n => r.grafik[n]);
    zeilen.push(`Hell: Grafik ${Math.min(...g)}:1 bis ${Math.max(...g)}:1, Kürzel ab ${Math.min(...Object.keys(r.text).map(n => r.text[n]))}:1`);
  }

  // ── e) bis h) Das Fenster ─────────────────────────────────────────────────
  await h.sichtbarMachen(s.page, "#view-formen");
  const f = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof skzGrossOpen !== "function") return { fehlt: "skzGrossOpen" };
    const alle = tpAllForms() || [];
    const mit = alle.findIndex(x => typeof skzSpecVon === "function" && skzSpecVon(x));
    const ohne = alle.findIndex(x => typeof skzSpecVon === "function" && !skzSpecVon(x) && x.svg && x.svg.length > 10);
    if (mit < 0) return { fehlt: "Übung mit Beschreibung" };

    try { localStorage.removeItem("adler-skizze-hell"); } catch (e) {}
    skzGrossOpen(mit); await warte(150);
    const m = document.getElementById("skz-gross-modal");
    if (!m) return { fehlt: "skz-gross-modal" };
    const svg = m.querySelector("svg[viewBox='0 0 280 180']");
    const halter = document.getElementById("skz-gross-halter");
    const zu = [...m.querySelectorAll("button")].find(b => /Schließen/.test(b.textContent));
    const um = document.getElementById("skz-gross-hell");
    const aus = {
      rolle: m.getAttribute("role"), modal: m.getAttribute("aria-modal"),
      breite: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
      zuHoehe: zu ? Math.round(zu.getBoundingClientRect().height) : 0,
      umHoehe: um ? Math.round(um.getBoundingClientRect().height) : 0,
      hatUmschalter: !!um
    };
    // g) Umschalten und merken
    um && um.click(); await warte(80);
    aus.nachUmschalten = (halter.innerHTML.includes(SKZ_HELL.rasen));
    try { aus.gemerkt = localStorage.getItem("adler-skizze-hell"); } catch (e) {}

    // f) Zwei Finger zoomen, dann Doppeltipp
    const b = document.getElementById("skz-gross-buehne");
    const pe = (typ, id, x, y) => b.dispatchEvent(new PointerEvent(typ, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    pe("pointerdown", 1, 100, 300); pe("pointerdown", 2, 140, 300);
    pe("pointermove", 1, 60, 300); pe("pointermove", 2, 220, 300);
    await warte(60);
    aus.nachZoom = halter.style.transform;
    pe("pointerup", 1, 60, 300); pe("pointerup", 2, 220, 300);
    pe("pointerdown", 3, 120, 300); pe("pointerup", 3, 120, 300);
    pe("pointerdown", 4, 120, 300); pe("pointerup", 4, 120, 300);
    await warte(60);
    aus.nachDoppeltipp = halter.style.transform;
    skzGrossClose();
    aus.zuNachher = !document.getElementById("skz-gross-modal");

    // h) Altskizze ohne Beschreibung
    if (ohne >= 0) {
      skzGrossOpen(ohne); await warte(120);
      const m2 = document.getElementById("skz-gross-modal");
      aus.altUmschalter = !!document.getElementById("skz-gross-hell");
      aus.altHinweis = /helle Fassung noch nicht/.test(m2 ? m2.textContent : "");
      aus.altName = (alle[ohne] || {}).name;
      skzGrossClose();
    }
    return aus;
  });

  if (f.fehlt) probleme.push(f.fehlt + " fehlt");
  else {
    if (f.rolle !== "dialog" || f.modal !== "true") probleme.push(`Das Fenster trägt role="${f.rolle}" aria-modal="${f.modal}" – der Fokus-Trap greift so nicht`);
    if (f.breite < 358) probleme.push(`Die Skizze ist am Handy (390 px) nur ${f.breite} px breit`);
    if (f.zuHoehe < 56) probleme.push(`Der Schließen-Knopf ist ${f.zuHoehe} px hoch – die Hauptaktion misst 56`);
    if (!f.hatUmschalter) probleme.push("Der Umschalter hell/dunkel fehlt");
    else if (f.umHoehe < 44) probleme.push(`Der Umschalter ist ${f.umHoehe} px hoch – gefordert 44`);
    if (!f.nachUmschalten) probleme.push("Nach dem Umschalten steht der helle Rasen nicht im Bild");
    if (f.gemerkt !== "1") probleme.push(`Die Wahl wurde als „${f.gemerkt}“ gemerkt statt als „1“`);
    /* Der Browser schreibt die Transformation normalisiert zurück („scale(1)" statt
       „scale(1.000)"), deshalb wird die Zahl gelesen statt der Text verglichen. */
    const faktor = x => { const m = /scale\(([\d.]+)\)/.exec(String(x || "")); return m ? +m[1] : 1; };
    if (faktor(f.nachZoom) < 1.5) probleme.push(`Zwei Finger haben nicht gezoomt: ${f.nachZoom || "keine Transformation"}`);
    if (faktor(f.nachDoppeltipp) > 1.02) probleme.push(`Der Doppeltipp setzt nicht zurück: ${f.nachDoppeltipp}`);
    if (!f.zuNachher) probleme.push("Schließen entfernt das Fenster nicht");
    if (f.altName) {
      if (f.altUmschalter) probleme.push(`„${f.altName}“ hat keine Beschreibung, bietet aber den Umschalter an`);
      if (!f.altHinweis) probleme.push(`„${f.altName}“ sagt nicht, dass es die helle Fassung dort noch nicht gibt`);
    }
    if (!probleme.length) zeilen.push(`Fenster: ${f.breite} px breit am Handy, Schließen ${f.zuHoehe} px, Umschalter ${f.umHoehe} px, Zoom und Doppeltipp greifen`);
  }
  const fehler = s.fehler();
  if (fehler.length) probleme.push("Konsole: " + fehler[0]);
  await s.schliessen();

  // ── e) Am Tablet quer ─────────────────────────────────────────────────────
  const t = await h.starten({ breite: 1024, hoehe: 768, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await h.sichtbarMachen(t.page, "#view-formen");
  const gross = await t.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    const alle = tpAllForms() || [];
    const mit = alle.findIndex(x => typeof skzSpecVon === "function" && skzSpecVon(x));
    skzGrossOpen(mit); await warte(150);
    const svg = document.querySelector("#skz-gross-modal svg[viewBox='0 0 280 180']");
    return svg ? Math.round(svg.getBoundingClientRect().width) : 0;
  });
  if (gross < 900) probleme.push(`Am Tablet quer (1024 px) ist die Skizze nur ${gross} px breit`);
  else zeilen.push(`Am Tablet quer: ${gross} px breit`);
  const tf = t.fehler();
  if (tf.length) probleme.push("Konsole (Tablet): " + tf[0]);
  await t.schliessen();

  return h.ergebnis("Skizze groß zeigen: Fingerzoom, heller Rasen, dunkle Fassung unverändert", !probleme.length, zeilen.concat(probleme));
};
