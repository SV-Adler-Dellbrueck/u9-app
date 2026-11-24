/* v965 · Charles 24.11.: „Wenn ich ein Bild hochlade, wird nur ein Teil angezeigt. Ich kann auch nicht drauf klicken, um es
   nochmal anzusehen oder zu ändern.“
   a) Die Foto-Kachel im Steckbrief zeigt das ganze Bild (object-fit: contain) und ist ein Knopf.
   b) Ein Tipp öffnet das Bild groß in einem eigenen Fenster (role=dialog) mit „Anderes Foto wählen“ und „Löschen“, ≥ 44 px.
   c) Ersetzen löscht das alte Foto erst, wenn das neue da ist; schlägt das Hochladen fehl, bleibt das alte. */
"use strict";
module.exports = async function (h) {
  const titel = "v965 Steckbrief-Foto: ganzes Bild, antippen zum Ansehen, Ersetzen und Löschen";
  const probleme = [];
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const TOKEN = b64({ alg: "none" }) + "." + b64({ email: "eltern@example.org", sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }) + ".x";
  const e = await h.starten({ start: "/eltern/index.html?portal", angemeldet: false, warten: 1200, breite: 390, hoehe: 1600,
    supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), profiles: [{ role: "parent" }], dsgvo_consent: [{ version: "x" }],
      eltern_kinder: [{ spieler_id: 1, label: "", kader: { id: 1, name: "Kind A", nr: 7 } }],
      kind_fanfacts: [{ spieler_id: 1, hobby: "Lego" }],
      kind_foto: (u, req) => req.method() === "GET" ? [{ id: 3, spieler_id: 1, zweck: "aktion", pfad: "1/album/a.jpg", karte: false, created_at: "2026-11-01" }] : { status: 204, body: "" } }) });
  await e.page.evaluate(t => { localStorage.setItem("adler_sb_auth_eltern", JSON.stringify({ access_token: t, refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600 })); }, TOKEN);
  await e.page.reload({ waitUntil: "networkidle" });
  const r = await e.page.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    if (typeof sbFotoZeigen !== "function") return { alt: true };
    window.fotoLoadImage = async () => { const c = document.createElement("canvas"); c.width = 300; c.height = 600; const i = new Image(); i.src = c.toDataURL(); await new Promise(x => i.onload = x); return i; };
    for (let i = 0; i < 50 && !document.querySelector("#steckbrief-slot .sb-karte-los"); i++) await w(150);
    document.querySelector("#steckbrief-slot .sb-karte-los").click();
    for (let i = 0; i < 40 && !document.querySelector("#fanfacts-modal .sb-foto.voll img"); i++) await w(100);
    const k = document.querySelector("#fanfacts-modal .sb-foto.voll"), img = k && k.querySelector("img");
    out.a = { tag: k ? k.tagName : "", fit: img ? getComputedStyle(img).objectFit : "", hoch: k ? Math.round(k.getBoundingClientRect().height) : 0 };
    k && k.click(); await w(300);
    const d = document.getElementById("sb-foto-gross");
    out.b = { dialog: d ? d.getAttribute("role") + "/" + d.getAttribute("aria-modal") : "", bild: !!(d && d.querySelector("#sb-foto-gross-bild img")),
      knoepfe: d ? [...d.querySelectorAll("button,label")].map(b => b.textContent.trim() + ":" + Math.round(b.getBoundingClientRect().height)) : [] };
    // c) Ersetzen – einmal klappt das Hochladen nicht, einmal schon
    const lade0 = window.kindAlbumHochladen, laden0 = window.kindAlbumLaden;
    window.kindAlbumHochladen = async () => {};
    window.kindAlbumLaden = async () => [{ id: 3, spieler_id: 1, zweck: "aktion", pfad: "1/album/a.jpg" }];
    await sbFotoErsetzen(1, 3, {}); out.c = { ohneNeu: window.__del || 0 };
    window.kindAlbumLaden = async () => [{ id: 3, spieler_id: 1, zweck: "aktion", pfad: "1/album/a.jpg" }, { id: 4, spieler_id: 1, zweck: "aktion", pfad: "1/album/b.jpg" }];
    await sbFotoErsetzen(1, 3, {});
    window.kindAlbumHochladen = lade0; window.kindAlbumLaden = laden0;
    out.c.dialogZu = !document.getElementById("sb-foto-gross");
    return out;
  }).catch(x => ({ fehler: String(x) }));
  const del = e.gesendet.filter(g => g.methode === "DELETE" && /kind_foto$/.test(g.pfad) && /id=eq\.3/.test(g.suche || "")).length;
  const fe = e.fehler().filter(f => !/Failed to load resource|net::ERR/.test(f)); await e.schliessen();
  if (r.alt) return h.ergebnis(titel, false, ["kein Ansehen/Ändern (Stand vor v965)"]);
  if (r.fehler) return h.ergebnis(titel, false, ["Ablauf: " + r.fehler]);
  if (r.a.tag !== "BUTTON" || r.a.fit !== "contain" || r.a.hoch < 44) probleme.push("a) " + JSON.stringify(r.a));
  const kn = r.b.knoepfe.join(" | ");
  if (r.b.dialog !== "dialog/true" || !r.b.bild || !/Anderes Foto wählen:(4[4-9]|[5-9]\d)/.test(kn) || !/Löschen:(4[4-9]|[5-9]\d)/.test(kn) || r.b.knoepfe.some(x => Number(x.split(":").pop()) < 44)) probleme.push("b) " + JSON.stringify(r.b));
  if (del !== 1 || !r.c.dialogZu) probleme.push(`c) altes Foto ${del}× gelöscht (erwartet 1, nur nach erfolgreichem Hochladen) · Fenster zu ${r.c.dialogZu}`);
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis(titel, !probleme.length, probleme.length ? probleme : [`a) Kachel als Knopf, Bild „${r.a.fit}“ · b) Fenster mit ${kn} · c) altes Foto nur nach erfolgreichem Hochladen gelöscht (${del}×)`]);
};
