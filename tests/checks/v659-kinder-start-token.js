/* v659 · Kinder-App: kein Code-Bildschirm beim Start, wenn nur der Zugangs-Token alt ist
   PO 28.09.: „die Kinderapp lädt beim Start immer noch mal den Code ab. Tippt man nichts ein,
   geht es nach ein paar Sekunden weiter."
   Ursache: Der Zugangs-Token des Kindergeräts lebt eine Stunde. kgStatus() fragte kind_status
   mit dem abgelaufenen Token, bekam 401 und hielt das Gerät für ungekoppelt – der
   Kopplungsbildschirm kam. Die Erneuerung aus core.js lief gleichzeitig im Hintergrund an;
   danach ging es (über einen späteren Anlauf) doch in die Kabine.
   a) Mit abgelaufenem Token und gültigem refresh_token erscheint der Code-Bildschirm nie,
      die Kabine öffnet, kind_status läuft mit dem NEUEN Token.
   b) Wird der refresh_token abgelehnt (Gerät wirklich entkoppelt), kommt der Code-Bildschirm
      weiterhin. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const KIND = { ok: true, spieler_id: 1, name: "Kind A", nr: 1, tw: false, geraet: "Tablet", limit_min: 60, rest_min: 42 };

  async function lauf(refreshOk) {
    let neu = 0, alt401 = 0;
    const s = await h.starten({ start: "/kinder/index.html", warten: 400, angemeldet: false,
      supabase: h.supabaseAttrappe({
        kader: h.kaderZeilen(), team_config: [{ id: 1 }],
        auth: { token: () => { neu++; return new Promise(ok => setTimeout(ok, 700)).then(() => refreshOk
          ? { access_token: "kind.neu.z", refresh_token: "r2", expires_in: 3600 }
          : { status: 400, body: JSON.stringify({ error: "invalid_grant" }) }); } },
        rpc: {
          kind_status: (u, req) => {
            const a = req.headers()["authorization"] || "";
            if (a.includes("kind.neu.z")) return KIND;
            alt401++; return { status: 401, body: JSON.stringify({ message: "JWT expired" }) };
          },
          kader_namen: [], team_gallery_kind: [], team_federn_total: 0, team_meilensteine: [],
          meine_rollen: { games: 0 }, meine_ziele: [], kind_abgesagt: [], wq_done: []
        }
      }) });
    // Jeder Code-Bildschirm, der auch nur kurz auftaucht, wird festgehalten.
    await s.page.context().addInitScript(() => {
      window._kgGesehen = 0;
      new MutationObserver(() => { if (document.getElementById("kg-kopplung") && document.querySelector("#kg-kopplung [onclick^='kgTip']")) window._kgGesehen++; })
        .observe(document, { childList: true, subtree: true });
    });
    await s.page.evaluate(() => localStorage.setItem("adler_sb_auth_kind",
      JSON.stringify({ access_token: "kind.alt.y", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) - 600 })));
    await s.page.reload({ waitUntil: "networkidle" });
    await s.page.waitForTimeout(1800);
    const r = await s.page.evaluate(() => ({ gesehen: window._kgGesehen || 0,
      code: !!document.querySelector("#kg-kopplung [onclick^='kgTip']"),
      kabine: !!document.getElementById("kabine") }));
    const f = s.fehler().filter(x => !/401|youtube/i.test(x));
    await s.schliessen();
    return Object.assign(r, { neu, alt401, f });
  }

  const a = await lauf(true);
  if (a.gesehen) probleme.push(`a) Der Code-Bildschirm tauchte ${a.gesehen}× auf, obwohl nur der Zugangs-Token alt war`);
  if (!a.kabine) probleme.push("a) Die Kabine ist nicht offen");
  if (!a.neu) probleme.push("a) Der Token wurde nicht erneuert");
  if (a.f.length) probleme.push("a) Konsole: " + a.f.slice(0, 2).join(" | "));
  zeilen.push(`a) alter Token: Code-Bildschirm ${a.gesehen}× · Kabine ${a.kabine ? "offen" : "zu"} · Erneuerung ${a.neu}× · kind_status mit altem Token ${a.alt401}×`);

  const b = await lauf(false);
  if (!b.code) probleme.push("b) Entkoppeltes Gerät (refresh abgelehnt) zeigt keinen Code-Bildschirm");
  if (b.kabine) probleme.push("b) Entkoppeltes Gerät öffnet die Kabine");
  zeilen.push(`b) refresh abgelehnt: Code-Bildschirm ${b.code ? "da" : "fehlt"} · Kabine ${b.kabine ? "offen" : "zu"}`);

  return h.ergebnis("v659 Kinder-App: alter Token führt nicht mehr zum Code-Bildschirm", probleme.length === 0, probleme.length ? probleme.concat(zeilen) : zeilen);
};
