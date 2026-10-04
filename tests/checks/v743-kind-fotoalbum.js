/* v743 · Spielerkarten Stufe 2: Fotoalbum je Kind
   PO 04.10. (Kachel „So bauen“): bis zu 6 Fotos mit Zweck, Eltern und Trainer laden hoch, eines ist das Kartenfoto;
   andere Familien sehen nur das Kartenfoto und nur mit Freigabe „Team intern“; kein Quadrat-Zuschnitt. Die Rechte
   prüft tests/sql/v743-kind-fotoalbum.sql.
   a) Kinderprofil (Trainer): Abschnitt „Foto & Freigaben“ zeigt das Album – je Foto Zweck-Auswahl, „Kartenfoto“ mit
      aria-pressed und Löschen; „Foto hinzufügen · 2 von 6“; alles ≥ 44 px
   b) Hochladen: Datei unter <id>/album/…jpg im Bucket spielerfotos, dann kind_foto mit Zweck; nicht quadratisch
      (Seitenverhältnis bleibt), längste Seite höchstens 1600
   c) Kartenfoto setzen ruft kind_foto_als_karte(p_spieler, p_id); Zweck ändern schreibt nur den Zweck
   d) Löschen fragt nach und entfernt Zeile und Datei
   e) Mit 6 Fotos kein „Foto hinzufügen“
   f) Eltern: dasselbe Album in den Fan-Fakten des eigenen Kindes */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const kader = h.kaderZeilen(), id = kader[0].id;
  let album = [{ id: 11, pfad: `${id}/album/a.jpg`, zweck: "portraet", karte: true, created_at: "2026-10-01T10:00:00Z" },
               { id: 12, pfad: `${id}/album/b.jpg`, zweck: "aktion", karte: false, created_at: "2026-10-02T10:00:00Z" }];
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  const attrappe = () => h.supabaseAttrappe({
    kader: (u, req) => req.method() === "PATCH" ? { status: 204, body: "" } : kader,
    kind_fanfacts: [], foto_consent: [{ spieler_id: id, intern: true, video: false, public_ok: false }],
    kind_foto: (u, req) => req.method() === "GET" ? album : (req.method() === "DELETE" ? { status: 204, body: "" } : { status: 201, body: "" }),
    rpc: { kind_foto_als_karte: true }
  });
  const speicher = [];
  const mitStorage = async s => s.page.route(/\/storage\/v1\/object\//, r => {
    const q = r.request(); speicher.push(q.method() + " " + decodeURIComponent(q.url()).replace(/^.*\/object\//, ""));
    if (/authenticated\//.test(q.url())) return r.fulfill({ status: 200, contentType: "image/png", body: PNG });
    return r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  const s = await h.starten({ warten: 1200, breite: 390, hoehe: 844, supabase: attrappe() });
  await mitStorage(s);
  const r = await s.page.evaluate(async ({ id }) => {
    const w = ms => new Promise(x => setTimeout(x, ms)), out = {};
    for (let i = 0; i < 40 && typeof kindAlbumRender !== "function"; i++) await w(100);
    if (typeof kindAlbumRender !== "function" || typeof kinderProfilOpen !== "function") return { fehlt: true };
    await loadKader(); await kinderProfilOpen(id); await w(900);
    const box = document.getElementById("ka-box-" + id);
    const sicht = box ? [...box.querySelectorAll("button,select,label.ka-neu")].filter(e => e.offsetParent) : [];
    out.a = box ? { fotos: box.querySelectorAll(".ka-foto").length, karte: [...box.querySelectorAll(".ka-karte")].map(b => b.getAttribute("aria-pressed") + ":" + b.textContent.trim()),
      neu: (box.querySelector(".ka-neu") || {}).textContent, zweck: [...box.querySelectorAll("select")].map(x => x.value),
      klein: sicht.filter(e => Math.round(e.getBoundingClientRect().height) < 44).map(e => e.className || e.tagName), text: box.textContent.replace(/\s+/g, " ") } : null;
    // b) Hochladen: 1200×600-Bild, darf nicht quadratisch werden
    const cv = document.createElement("canvas"); cv.width = 2400; cv.height = 1200; cv.getContext("2d").fillRect(0, 0, 10, 10);
    const blob = await new Promise(r => cv.toBlob(r, "image/png"));
    out.groesse = await (async () => { const b = await kindAlbumVerkleinern(new File([blob], "x.png", { type: "image/png" }), 1600); const im = await createImageBitmap(b); return [im.width, im.height]; })();
    const inp = box.querySelector(".ka-neu input");
    const dt = new DataTransfer(); dt.items.add(new File([blob], "x.png", { type: "image/png" })); inp.files = dt.files;
    await kindAlbumHochladen(id, inp); await w(500);
    // c) Kartenfoto und Zweck
    await kindAlbumKarte(id, 12); await w(300);
    await kindAlbumZweck(id, 12, "jubel"); await w(200);
    // d) Löschen
    const p = kindAlbumLoeschen(id, 12); await w(300);
    out.frage = !!document.getElementById("frage-modal"); document.getElementById("frage-ja")?.click(); await p; await w(300);
    return out;
  }, { id });
  const gesendet = s.gesendet.filter(x => /kind_foto/.test(x.pfad)).map(x => x.methode + " " + x.pfad.replace(/^.*\/rest\/v1\//, "") + " " + JSON.stringify(x.body || ""));
  const f1 = s.fehler(); await s.schliessen();
  if (r.fehlt) return h.ergebnis("v743 Fotoalbum je Kind", false, ["kindAlbumRender oder kinderProfilOpen fehlt"]);
  const a = r.a || {};
  if (a.fotos !== 2 || a.karte.join("|") !== "true:⭐ Kartenfoto|false:☆ Als Kartenfoto" || !/Foto hinzufügen\s*2 von 6/.test(a.neu || "") || a.zweck.join() !== "portraet,aktion" || a.klein.length || !/nur das Kartenfoto/.test(a.text || ""))
    probleme.push(`a) Album im Profil: ${JSON.stringify(a)}`);
  zeilen.push(`a) Profil: 2 Fotos, „⭐ Kartenfoto“ (aria-pressed), Zweck-Auswahl, „Foto hinzufügen · 2 von 6“, alles ≥ 44 px`);
  const hoch = speicher.find(x => /^POST spielerfotos\//.test(x)) || "";
  const ins = gesendet.find(x => /^POST kind_foto /.test(x)) || "";
  if (!new RegExp(`^POST spielerfotos/${id}/album/[A-Za-z0-9_-]+\\.jpg$`).test(hoch) || !/"zweck":"frei"/.test(ins) || !new RegExp(`"spieler_id":${id}`).test(ins) || r.groesse.join("x") !== "1600x800")
    probleme.push(`b) Hochladen: ${hoch} · ${ins} · ${r.groesse}`);
  zeilen.push(`b) ${hoch} → kind_foto (Zweck „frei“), 2400×1200 wird ${r.groesse.join("×")} – kein Quadrat`);
  const karte = gesendet.find(x => /rpc\/kind_foto_als_karte/.test(x)) || "", zweck = gesendet.find(x => /^PATCH kind_foto /.test(x)) || "";
  if (!new RegExp(`"p_spieler":${id},"p_id":12`).test(karte) || zweck !== 'PATCH kind_foto {"zweck":"jubel"}') probleme.push(`c) ${karte} · ${zweck}`);
  zeilen.push("c) Kartenfoto über kind_foto_als_karte, Zweck-Änderung schreibt nur den Zweck");
  if (!r.frage || !gesendet.some(x => /^DELETE kind_foto /.test(x)) || !speicher.some(x => x === `DELETE spielerfotos/${id}/album/b.jpg`)) probleme.push(`d) Löschen: ${r.frage} ${JSON.stringify(gesendet)} ${JSON.stringify(speicher)}`);
  zeilen.push("d) Löschen fragt nach, entfernt Zeile und Datei");
  // e/f) Eltern mit 6 Fotos
  album = [1, 2, 3, 4, 5, 6].map(n => ({ id: 20 + n, pfad: `${id}/album/f${n}.jpg`, zweck: "frei", karte: false, created_at: "2026-10-0" + n + "T10:00:00Z" }));
  const e = await h.starten({ start: "/eltern/index.html", warten: 1000, breite: 390, hoehe: 844, supabase: attrappe() });
  await mitStorage(e);
  const re = await e.page.evaluate(async ({ id }) => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    for (let i = 0; i < 40 && typeof elternFanfactsOpen !== "function"; i++) await w(100);
    await elternFanfactsOpen(id, "Kind A"); await w(700);
    const box = document.getElementById("ka-box-" + id);
    return box ? { fotos: box.querySelectorAll(".ka-foto").length, neu: !!box.querySelector(".ka-neu") } : null;
  }, { id });
  const f2 = e.fehler(); await e.schliessen();
  if (!re || re.fotos !== 6 || re.neu) probleme.push(`e/f) Eltern-Album: ${JSON.stringify(re)}`);
  zeilen.push("e/f) Eltern: Album in den Fan-Fakten, bei 6 Fotos kein „Foto hinzufügen“");
  const f = f1.concat(f2); if (f.length) probleme.push("Konsole: " + f.slice(0, 2).join(" | "));
  return h.ergebnis("v743 Fotoalbum je Kind", !probleme.length, zeilen.concat(probleme));
};
