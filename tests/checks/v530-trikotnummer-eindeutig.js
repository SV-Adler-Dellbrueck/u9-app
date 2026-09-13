/* v530 – Fund beim Eintragen zweier neuer Trikotnummern: Auf `kader.nr` lag KEINE Regel.
   Zwei Kinder mit derselben Nummer hätte die Datenbank klaglos angenommen, und der
   Kader-Editor prüfte es auch nicht — aufgefallen wäre es erst auf dem Platz.

   Geprüft wird hier die Hälfte, die im Browser lebt:
   a) Zwei aktive Kinder mit derselben Nummer → gar keine Anfrage an Supabase, und die
      Meldung nennt die Nummer und BEIDE Kinder. „Geht nicht“ allein hieße, in fünfzehn
      Zeilen zu suchen.
   b) Ein INAKTIVES Kind mit derselben Nummer ist erlaubt — Nummern werden in einer
      Jugendmannschaft wiederverwendet, ein ausgeschiedenes Kind darf seine behalten.
   c) Ein TAUSCH zweier Nummern in einem Speichervorgang geht durch. Das ist der Fall, an
      dem eine naive Prüfung scheitert: mitten im Upsert ist die Nummer kurz doppelt.
   d) Kommt die Ablehnung doch von der Datenbank (409), unterscheidet die Meldung zwischen
      doppeltem NAMEN und doppelter NUMMER — sonst sucht man am falschen Ende.

   Die Datenbankseite (partieller, aufschiebbarer Ausschluss) lässt sich hier nicht messen:
   Supabase ist eine Attrappe. Sie wurde vor dem Anwenden direkt auf der Datenbank
   nachgewiesen und ist in der PR belegt. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];

  async function speichern(zeilenDaten, antwort) {
    const s = await h.starten({ supabase: h.supabaseAttrappe({
      kader: (u, req) => (req.method() === "POST" && antwort) ? antwort : h.kaderZeilen(),
      profiles: [{ anzeigename: "Charles" }]
    }), hoehe: 1600 });
    const r = await s.page.evaluate(async (daten) => {
      if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
      window.__toast = [];
      const echt = window.toast;
      window.toast = (t, art) => { window.__toast.push({ t, art }); if (typeof echt === "function") echt(t, art); };
      /* Der Editor liest aus dem DOM. Statt ihn zu öffnen und fünfzehn Felder zu füllen,
         bauen wir genau die Zeilen, die er erwartet – gemessen wird kaderSaveAll, nicht
         das Formular. */
      document.querySelectorAll(".kader-edit-row").forEach(el => el.remove());
      const host = document.createElement("div"); document.body.appendChild(host);
      daten.forEach(k => {
        const row = document.createElement("div");
        row.className = "kader-edit-row"; row.dataset.id = String(k.id);
        row.innerHTML = `<input class="ke-name" value="${k.name}"><input class="ke-nr" value="${k.nr == null ? "" : k.nr}">
          <input class="ke-geb"><input class="ke-medical"><select class="ke-fuss"><option value=""></option></select>
          <input class="ke-pos"><input type="checkbox" class="ke-tw"><input class="ke-prio" value="0">
          <input type="checkbox" class="ke-aktiv"${k.aktiv === false ? "" : " checked"}><input type="checkbox" class="ke-fotook">`;
        host.appendChild(row);
      });
      await kaderSaveAll(null);
      await new Promise(r => setTimeout(r, 300));
      return { toasts: window.__toast.slice() };
    }, zeilenDaten);
    await s.page.waitForTimeout(150);
    const posts = s.gesendet.filter(g => /kader/.test(g.pfad || "") && g.methode === "POST");
    await s.schliessen();
    return { ...r, posts };
  }

  // a) Dublette unter aktiven Kindern
  const a = await speichern([{ id: 1, name: "Kind A", nr: 7 }, { id: 2, name: "Kind B", nr: 7 }]);
  const meldungA = (a.toasts.find(t => t.art === "err") || {}).t || "";
  if (a.posts.length) probleme.push("Bei doppelter Nummer wird trotzdem gespeichert");
  if (!/7/.test(meldungA)) probleme.push(`Die Meldung nennt die Nummer nicht: ${JSON.stringify(meldungA)}`);
  if (!/Kind A/.test(meldungA) || !/Kind B/.test(meldungA)) probleme.push(`Die Meldung nennt nicht beide Kinder: ${JSON.stringify(meldungA)}`);

  // b) Inaktives Kind mit derselben Nummer ist erlaubt
  const b = await speichern([{ id: 1, name: "Kind A", nr: 7 }, { id: 2, name: "Kind B", nr: 7, aktiv: false }]);
  if (!b.posts.length) probleme.push(`Ein ausgeschiedenes Kind blockiert die Nummer: ${JSON.stringify((b.toasts[0] || {}).t)}`);

  // c) Tausch in einem Speichervorgang
  const c = await speichern([{ id: 1, name: "Kind A", nr: 9 }, { id: 2, name: "Kind B", nr: 4 }]);
  if (!c.posts.length) probleme.push(`Ein Nummerntausch wird abgelehnt: ${JSON.stringify((c.toasts[0] || {}).t)}`);
  else {
    const body = [].concat(c.posts[0].body || []);
    const nrs = body.map(x => x.nr).sort();
    if (String(nrs) !== "4,9") probleme.push(`Der Tausch schickt ${JSON.stringify(nrs)}`);
  }

  // d) 409 der Datenbank: Nummer oder Name?
  const dNr = await speichern([{ id: 1, name: "Kind A", nr: 7 }],
    { status: 409, body: JSON.stringify({ code: "23P01", message: 'conflicting key value violates exclusion constraint "kader_nr_aktiv_uniq"' }) });
  const mNr = (dNr.toasts.find(t => t.art === "err") || {}).t || "";
  if (!/nummer/i.test(mNr)) probleme.push(`409 wegen Nummer meldet: ${JSON.stringify(mNr)}`);
  const dName = await speichern([{ id: 1, name: "Kind A", nr: 7 }],
    { status: 409, body: JSON.stringify({ code: "23505", message: 'duplicate key value violates unique constraint "kader_name_key"' }) });
  const mName = (dName.toasts.find(t => t.art === "err") || {}).t || "";
  if (!/name/i.test(mName)) probleme.push(`409 wegen Name meldet: ${JSON.stringify(mName)}`);
  if (/nummer/i.test(mName)) probleme.push(`409 wegen Name meldet fälschlich die Nummer: ${JSON.stringify(mName)}`);

  zeilen.push(`Dublette: nicht gespeichert ${!a.posts.length} · „${meldungA}“`);
  zeilen.push(`Inaktiv mit gleicher Nummer erlaubt: ${!!b.posts.length} · Tausch erlaubt: ${!!c.posts.length}`);
  zeilen.push(`409 Nummer: „${mNr}“ · 409 Name: „${mName}“`);
  return h.ergebnis("Trikotnummer gehört genau einem aktiven Kind", !probleme.length, zeilen.concat(probleme));
};
