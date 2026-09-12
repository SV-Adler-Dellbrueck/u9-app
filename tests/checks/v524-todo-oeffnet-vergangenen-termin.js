/* v524 – PO: „Wie bewerte ich denn das letzte Festival? Wenn ich die to do kachel anklicke
   komme ich nur auf die orga seite. Muss dann händisch auf die vergangenen termine gehen
   und dort dann suchen, das macht doch keinen Sinn so oder?"

   Befund: Der Knopf war seit v521 zwar klickbar, lief aber ins Leere. tmDetailOpen sucht
   den Termin in TM_TERMINE – und das haelt auf der Startseite nur die KOMMENDEN Termine
   (views.js: datum>=heute, davon nur die noch nicht vorbei sind). Das To-Do zeigt aber
   immer auf ein VERGANGENES Spiel oder Festival. Nicht gefunden → go("termine"), also die
   Orga-Seite, auf der die Suche von vorn beginnt.

   Zwei Fehler hintereinander an derselben Stelle: erst tat der Knopf nichts (v521), dann
   fuehrte er an der Sache vorbei. Deshalb prueft diese Datei nicht den Klick, sondern das
   ERGEBNIS des Klicks – dass das Fenster zum richtigen Termin offen steht und die
   Auswertung darin erreichbar ist. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const gestern = h.tagePlus(-1);
  const fest = { id: 77, datum: gestern, typ: "turnier", titel: "Kinderfestival · Heim", heim: true,
                 uhrzeit: "10:15", uhrzeit_ende: "12:00", spielform: "FUNiño", ergebnis: "",
                 ohne_ergebnis: false, trainer_status: {} };

  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    profiles: [{ name: "Charles", rolle: "trainer" }],
    /* Wie die echte Tabelle: nach id gefragt kommt der vergangene Termin, nach kommenden
       Terminen gefragt kommt nichts – genau die Lage auf der Startseite. */
    termine: u => {
      if (/id=eq\.77/.test(u.search)) return [fest];
      const typ = u.searchParams.get("typ") || "";
      const abDatum = u.searchParams.get("datum") || "";
      if (/spiel|turnier/.test(typ) && /gte\./.test(abDatum)) return [fest];
      return [];
    }
  }), hoehe: 1600 });

  const r = await s.page.evaluate(async () => {
    let slot = document.getElementById("trainer-todo-slot");
    if (!slot) { slot = document.createElement("div"); slot.id = "trainer-todo-slot"; document.body.appendChild(slot); }
    window.trainerMe = async () => "Charles";
    if (typeof sbToken !== "function" || !sbToken()) window.sbToken = () => "t";
    /* TM_TERMINE ist auf der Startseite leer bzw. kennt nur Kommendes – hier ausdruecklich
       leer, damit die Pruefung den Nachlade-Weg misst und nicht zufaellig den Glueckstreffer. */
    if (typeof TM_TERMINE !== "undefined") TM_TERMINE.length = 0;
    window.__geroutet = [];
    const echtesGo = window.go;
    window.go = name => { window.__geroutet.push(name); if (typeof echtesGo === "function") echtesGo(name); };
    await trainerTodoLoad();

    const haupt = [...slot.querySelectorAll("button")].find(b => /nachtragen/.test(b.textContent || ""));
    if (!haupt) return { fehlt: true };
    haupt.click();
    for (let i = 0; i < 40 && !document.getElementById("tmd-modal"); i++) await new Promise(r => setTimeout(r, 50));

    const modal = document.getElementById("tmd-modal");
    const txt = modal ? modal.textContent.replace(/\s+/g, " ").trim() : "";
    const ergebnisFeld = modal ? !!modal.querySelector('input[onchange*="tmSetResult"]') : false;
    const blitz = modal ? [...modal.querySelectorAll("button")].some(b => /Blitz-Rating/.test(b.textContent || "")) : false;
    return { fehlt: false, offen: !!modal, tid: modal ? modal.dataset.tid : null,
             geroutet: window.__geroutet.slice(), txt: txt.slice(0, 160), ergebnisFeld, blitz };
  });

  const fehler = s.fehler(); await s.schliessen();

  if (r.fehlt) { probleme.push("Das To-Do „nachtragen“ steht gar nicht in der Kachel"); return h.ergebnis("To-Do öffnet den vergangenen Termin", false, probleme); }

  if (!r.offen) probleme.push("Antippen öffnet kein Termin-Fenster");
  if (r.geroutet.includes("termine")) probleme.push(`Antippen landet auf der Orga-Seite (go(${JSON.stringify(r.geroutet)})) statt im Termin`);
  if (r.offen && String(r.tid) !== "77") probleme.push(`Es öffnet sich Termin ${r.tid} statt 77`);
  /* Der Grund, aus dem der PO hier landet: bewerten und Ergebnis eintragen. Steht das
     Fenster offen, muss beides darin erreichbar sein – sonst ist der Weg nur kürzer, aber
     immer noch eine Sackgasse. */
  if (!r.ergebnisFeld) probleme.push("Im Fenster fehlt das Ergebnis-Feld");
  if (!r.blitz) probleme.push("Im Fenster fehlt „Auswertung & Blitz-Rating“");
  if (fehler.length) probleme.push(...fehler.slice(0, 2));

  zeilen.push(`Fenster offen: ${r.offen} · Termin ${r.tid} · go(): ${JSON.stringify(r.geroutet)}`);
  zeilen.push(`Ergebnis-Feld ${r.ergebnisFeld} · Blitz-Rating ${r.blitz}`);
  zeilen.push(`Fenster: ${r.txt}`);
  return h.ergebnis("To-Do öffnet den vergangenen Termin samt Auswertung", !probleme.length, zeilen.concat(probleme));
};
