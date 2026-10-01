/* v708 · Auswärtsspiel im Termin + Lesbarkeit (Optik-Prüfung 01.10.2026)
   PO 01.10.: „Bei Auswärtsspielen ist Spielfeldform anders darzustellen … abhängig, was die
   ausrichtende Mannschaft anbietet, z. B. Funino und 3+1 … Mehrfachnennungen möglich. Dann kann
   Spielfeldform ganz weg. Ebenso ‚Wer hilft‘ kann weg. Das Einzige, was wir an dieser Stelle als
   Trainer ankreuzen sollen, ist, wer die Kinder am Turnier mit betreuen kann.“ – „Sucht die
   Adresszeile die Adresse automatisch?“ (im Bearbeiten-Fenster: nein → Knopf „Finden“).
   a) Bearbeiten, auswärts: keine Spielfeld-Aufteilung, Spielform als vier Knöpfe mit Mehrfachwahl,
      unter „Wer betreut die Kinder mit?“ nur die Betreuung, Knopf „Finden“ für die Adresse;
      Speichern schickt spielform „funino,3+1“, platz null, heim false, nur Betreuung
   b) Bearbeiten, heim: Spielfeld-Aufteilung und alle Helfer-Aufgaben bleiben; Umschalten auf
      auswärts blendet beides um
   c) Neuer Termin: Auswärts blendet die Spielfeld-Aufteilung aus und leert sie; Spielform mehrfach
   d) sfListe/sfText; Eltern-Termin nennt beide Formen
   e) Lesbarkeit im Dunkelmodus: Mindset-Kasten, „Drucken / PDF“, Nominierungsknopf „Dabei“,
      Abzeichen-Titel ≥ 4,5:1; Eingabefeld ohne eigene Farbe dunkel; Zusage-Farben ≥ 4,5:1 mit Weiß;
      Kategorie-Fenster der Eltern ist ein Dialog */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const T = (id, heim) => ({ id, datum: h.tagePlus(2), typ: "turnier", heim, uhrzeit: "10:15", uhrzeit_ende: "11:30", treffzeit: "09:45",
    titel: "Kinderfestival · Gegner FC", ort: "Sportplatz Beispiel", platz: "links + Käfig", spielform: "4+1", halbzeiten: 1, spieldauer_min: 8, helfer_aufgaben: null });
  const s = await h.starten({ warten: 1500, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : [] }) });
  const r = await s.page.evaluate(async ({ aus, heim }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const o = {};
    TM_TERMINE = [aus, heim];
    // a) auswärts
    tmEdit(aus.id); await w(200);
    const m = document.getElementById("tm-edit-modal");
    const sicht = el => !!el && el.offsetParent !== null && getComputedStyle(el).display !== "none";
    o.platzSicht = sicht(document.getElementById("te-platz-row"));
    o.sfKnoepfe = [...document.querySelectorAll("#te-sf .te-sf-k")].map(b => b.dataset.val);
    o.titel = (document.getElementById("te-helfer-titel") || {}).textContent;
    o.aufgaben = [...document.querySelectorAll("#te-helfer-frei .te-hf-an")].map(c => c.dataset.t);
    o.eigene = document.querySelectorAll("#te-helfer-frei .te-hf-eigen").length;
    o.finden = !!m && [...m.querySelectorAll("button")].some(b => /Finden/.test(b.textContent));
    o.hinweis = (document.getElementById("te-hinweis-lbl") || {}).textContent;
    // Funino und 3+1 an, 4+1 aus; Betreuung anhaken
    const k = v => document.querySelector(`#te-sf .te-sf-k[data-val="${v}"]`);
    k("funino").click(); k("3+1").click(); k("4+1").click();
    const bc = document.querySelector("#te-helfer-frei .te-hf-an"); if (bc) bc.checked = true;
    const alt = window.fetch; let body = null;
    window.fetch = (url, opt) => { if (/termine\?id=eq/.test(url) && opt && opt.method === "PATCH") body = JSON.parse(opt.body); return Promise.resolve(new Response("", { status: 204 })); };
    await tmEditSave(aus.id); await w(150);
    window.fetch = alt;
    o.body = body;
    // b) heim
    tmEdit(heim.id); await w(200);
    o.hPlatz = sicht(document.getElementById("te-platz-row"));
    o.hAufgaben = document.querySelectorAll("#te-helfer-frei .te-hf-an").length;
    o.hEigene = document.querySelectorAll("#te-helfer-frei .te-hf-eigen").length;
    tmEditHeim(false, heim.id); await w(50);
    o.umPlatz = sicht(document.getElementById("te-platz-row"));
    o.umAufgaben = [...document.querySelectorAll("#te-helfer-frei .te-hf-an")].map(c => c.dataset.t);
    document.getElementById("tm-edit-modal")?.remove();
    // c) Neuer Termin
    if (typeof sichtbarMachenIntern === "undefined") { const f = document.getElementById("tm-platz-row"); for (let e = f; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).display === "none") e.style.display = "block"; }
    tmTyp = "turnier"; if (typeof tmSetTyp === "function") tmSetTyp("turnier");
    tmSetHeim(false);
    o.neuPlatzAn = getComputedStyle(document.getElementById("tm-platz-row")).display !== "none";
    o.neuPlatzWert = document.getElementById("tm-platz").value;
    const seg = document.getElementById("tm-spielform-seg");
    o.neuKnoepfe = [...seg.querySelectorAll(".seg-btn")].map(b => b.dataset.val);
    seg.querySelector('[data-val="funino"]').click(); seg.querySelector('[data-val="3+1"]').click();
    o.neuSf = tmSpielform;
    tmSetHeim(true);
    o.neuPlatzHeim = getComputedStyle(document.getElementById("tm-platz-row")).display !== "none";
    // d)
    o.sfText = sfText("funino,3+1"); o.sfListe = sfListe("4+1");
    return o;
  }, { aus: T(72, false), heim: T(71, true) });
  const f = s.fehler(); await s.schliessen();
  if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  if (r.platzSicht) probleme.push("a) auswärts steht die Spielfeld-Aufteilung");
  if (r.sfKnoepfe.join() !== "funino,3+1,4+1,5+1") probleme.push("a) Spielform-Knöpfe: " + r.sfKnoepfe.join());
  if (!/betreut/.test(r.titel || "")) probleme.push("a) Überschrift: " + r.titel);
  if (r.aufgaben.length !== 1 || !/Betreuung/.test(r.aufgaben[0] || "") || r.eigene) probleme.push(`a) Aufgaben auswärts: ${JSON.stringify(r.aufgaben)}, eigene ${r.eigene}`);
  if (!r.finden) probleme.push("a) kein Knopf „Finden“ für die Adresse");
  const b = r.body || {};
  if (b.spielform !== "funino,3+1" || b.platz !== null || b.heim !== false) probleme.push("a) gespeichert: " + JSON.stringify({ sf: b.spielform, platz: b.platz, heim: b.heim }));
  if (!Array.isArray(b.helfer_aufgaben) || b.helfer_aufgaben.length !== 1 || !/Betreuung/.test(b.helfer_aufgaben[0].t)) probleme.push("a) helfer_aufgaben: " + JSON.stringify(b.helfer_aufgaben));
  if (!r.hPlatz || r.hAufgaben < 4 || r.hEigene !== 2) probleme.push(`b) heim: Platz ${r.hPlatz}, Aufgaben ${r.hAufgaben}, eigene ${r.hEigene}`);
  if (r.umPlatz || r.umAufgaben.length !== 1) probleme.push(`b) Umschalten auf auswärts: Platz ${r.umPlatz}, ${JSON.stringify(r.umAufgaben)}`);
  if (r.neuPlatzAn || r.neuPlatzWert) probleme.push(`c) Neuer Termin auswärts: Platz sichtbar ${r.neuPlatzAn}, Wert „${r.neuPlatzWert}“`);
  if (r.neuKnoepfe.join() !== "funino,3+1,4+1,5+1" || r.neuSf !== "funino,3+1,4+1") probleme.push(`c) Neuer Termin Spielform: ${r.neuKnoepfe.join()} → „${r.neuSf}“`);
  if (!r.neuPlatzHeim) probleme.push("c) zurück auf Heim: Spielfeld-Aufteilung fehlt");
  if (r.sfText !== "FUNiño · 3+1" || r.sfListe.join() !== "4+1") probleme.push(`d) sfText „${r.sfText}“`);
  zeilen.push(`a) auswärts: ${r.sfKnoepfe.length} Spielform-Knöpfe, Aufgaben ${JSON.stringify(r.aufgaben)} → ${JSON.stringify({ sf: b.spielform, platz: b.platz })}`);

  // e) Lesbarkeit im Dunkelmodus (Trainer)
  const d = await h.starten({ warten: 1500, scheme: "dark", supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  await d.page.evaluate(h.kontrastHelfer);
  const k = await d.page.evaluate(async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const w = ms => new Promise(x => setTimeout(x, ms));
    const o = {};
    const neu = html => { const x = document.createElement("div"); x.innerHTML = html; document.body.appendChild(x); return x; };
    const pb = neu('<button class="print-btn">Drucken / PDF</button>').firstChild; o.print = __kontrastVon(pb);
    const inp = neu('<input type="text" id="v708-feld">').firstChild; o.feldBg = getComputedStyle(inp).backgroundColor;
    if (typeof abzeichenOpen === "function") { abzeichenOpen(1, "Kind A", true); await w(200);
      const t = document.querySelector("#abzeichen-modal .mdl-titel, #abzeichen-modal h2, #abzeichen-modal b");
      o.abz = t ? __kontrastVon(t) : null; document.getElementById("abzeichen-modal")?.remove(); }
    // Mindset-Kasten: wie boot.js ihn baut
    const src = String(typeof tpMindsetTip === "function" ? tpMindsetTip : "");
    o.mindsetFest = /#ecfdf5|#065f46/.test(document.body.innerHTML + src);
    const nb = neu('<button style="background:#15803d;color:#fff">Dabei</button>').firstChild; o.dabei = __kontrastVon(nb);
    return o;
  });
  await d.schliessen();
  if (!(k.print >= 4.5)) probleme.push(`e) „Drucken / PDF“ dunkel ${k.print}:1`);
  if (/255, 255, 255/.test(k.feldBg)) probleme.push(`e) Eingabefeld dunkel noch weiß (${k.feldBg})`);
  if (k.abz != null && !(k.abz >= 4.5)) probleme.push(`e) Abzeichen-Titel dunkel ${k.abz}:1`);
  if (!(k.dabei >= 4.5)) probleme.push(`e) „Dabei“ ${k.dabei}:1`);
  zeilen.push(`e) dunkel: Drucken ${k.print}:1 · Feld ${k.feldBg} · Abzeichen ${k.abz}:1 · Dabei ${k.dabei}:1`);

  // Quelltext: feste helle Kästen weg, Zusage-Farben, Dialog
  const fs = require("fs"), path = require("path"), lies = p => fs.readFileSync(path.join(h.REPO, p), "utf8");
  const boot = lies("boot.js"), ep = lies("md-eltern-portal.js"), tp = lies("md-turnierplan.js");
  if (/tp-mindset-tip[\s\S]{0,600}background:#ecfdf5/.test(boot)) probleme.push("e) Mindset-Kasten noch fest hell");
  const rsvp = (ep.match(/const EP_RSVP=\{[^\n]*\};/) || [""])[0];
  const kr = hex => { const v = [0, 2, 4].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); const L = .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; return 1.05 / (L + .05); };
  (rsvp.match(/col:"#([0-9a-f]{6})"/g) || []).forEach(c => { const hx = c.slice(6, 12); if (kr(hx) < 4.5) probleme.push(`e) Zusage-Farbe #${hx} mit Weiß ${kr(hx).toFixed(2)}:1`); });
  if (!/ov\.setAttribute\("role","dialog"\)/.test(ep)) probleme.push("e) Kategorie-Fenster der Eltern ohne role=dialog");
  if (/dabei:\{lbl:"Dabei",col:"var\(--green\)"\}/.test(tp)) probleme.push("e) Nominierungsknopf „Dabei“ noch über var(--green)");
  if (!/3\+1 \(drei Feldspieler/.test(ep) || !/sfListe\(t\.spielform\)/.test(ep)) probleme.push("d) Eltern-Termin nennt nicht alle Spielformen");
  return h.ergebnis("v708 Auswärtsspiel im Termin, Lesbarkeit im Dunkelmodus", !probleme.length, probleme.length ? probleme.concat(zeilen) : zeilen);
};
