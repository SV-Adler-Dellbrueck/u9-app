/* v499 – PO: „Können wir die URL für den externen Link umbenennen, so dass nicht mein Name dort
   steht, sondern ein Bezug zum Turnier?" Der Name im Host gehört zur GitHub-Adresse und wird beim
   Umzug in die Vereins-Organisation gelöst; die Kennung dahinter macht diese Fassung sprechend:
   aus „q7x2ma9k" wird „kinderfestival-12-09". Geprueft: Umlaute und Sonderzeichen, Datum am Ende,
   Ausweichname ohne Titel, und dass eine belegte Kennung eine Zahl bekommt statt zu kollidieren. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const heute = h.heute();
  let belegt = [];
  const angelegt = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(), nominierungen: [], termine: [],
    heimturnier: (u, req) => {
      if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); angelegt.push(b); return [{ id: 9, ...b }]; }
      const like = u.searchParams.get("slug") || "";
      if (like.startsWith("like.")) { const basis = decodeURIComponent(like.slice(5)).replace(/\*$/, ""); return belegt.filter(x => x.startsWith(basis)).map(slug => ({ slug })); }
      return [];
    }
  }), hoehe: 1200 });
  const r = await s.page.evaluate(async ({ heute }) => {
    if (typeof _htSlugFrei !== "function") return { fehlt: "_htSlugFrei" };
    await loadKader(); document.getElementById("pin-gate")?.remove();
    const bauen = [
      _htSlug("Kinderfestival September", "2026-09-12"),
      _htSlug("Heimspiel gegen Wahn Grengel", "2026-10-03"),
      _htSlug("Käfig-Cup für Große & Kleine", "2026-11-01"),
      _htSlug("", "2026-09-12"),
      _htSlug("Turnier", "")
    ];
    const frei1 = await _htSlugFrei("kinderfestival-12-09");
    return { bauen, frei1, url: _htUrl("kinderfestival-12-09") };
  }, { heute });
  if (r.fehlt) { await s.schliessen(); return h.ergebnis("Sprechende Kennung", false, [`${r.fehlt} fehlt`]); }
  belegt = ["kinderfestival-12-09", "kinderfestival-12-09-2"];
  const r2 = await s.page.evaluate(async () => ({ frei: await _htSlugFrei("kinderfestival-12-09") }));
  const fehler = s.fehler(); await s.schliessen();
  const soll = ["kinderfestival-september-12-09", "heimspiel-gegen-wahn-grengel-03-10", "kaefig-cup-fuer-grosse-kleine-01-11", "turnier-12-09", "turnier"];
  r.bauen.forEach((x, i) => { if (x !== soll[i]) probleme.push(`Kennung „${x}“ statt „${soll[i]}“`); });
  if (r.bauen.some(x => /[^a-z0-9-]/.test(x))) probleme.push(`Nicht adresstaugliche Zeichen: ${r.bauen.filter(x => /[^a-z0-9-]/.test(x)).join(", ")}`);
  if (r.frei1 !== "kinderfestival-12-09") probleme.push(`Freie Kennung wurde zu „${r.frei1}“ geändert`);
  if (r2.frei !== "kinderfestival-12-09-3") probleme.push(`Bei zwei belegten Kennungen kommt „${r2.frei}“ statt „…-3“`);
  if (!/\?turnier=kinderfestival-12-09$/.test(r.url)) probleme.push(`Link „${r.url}“`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Aus Namen: ${r.bauen.join(" · ")}`);
  zeilen.push(`Frei bleibt frei (${r.frei1}) · zweimal belegt → ${r2.frei}`);
  return h.ergebnis("Sprechende Kennung für den Gast-Link statt Zufallsfolge", !probleme.length, zeilen.concat(probleme));
};
