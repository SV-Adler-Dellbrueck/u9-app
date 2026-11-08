/* v816 · Tagebuch Paket 2: Eintrag schreiben (Charles 08.11.2026: „Bau und merge 2“).
   a) Vier Fragen in dieser Reihenfolge: Worum ging es? · Was hast du beobachtet? · Was ist dir klar geworden? · Was änderst du? – danach „Wohin gehört es?“
   b) „Kind einfügen“ und „Wer kommt vor?“ sind zugeklappt; „Mehr“ (Schlagworte, Beleg, Anschluss) ist zu, solange dort nichts steht, sonst offen
   c) Unten steht, was für einen fertigen Eintrag fehlt – und es folgt beim Tippen mit
   d) Kind einfügen schreibt den Vornamen ins zuletzt benutzte Feld (wie bisher); Bedienelemente ≥ 48 px außer den Kind-Knöpfen (44) */
"use strict";
module.exports = async function (h) {
  const probleme = [];
  const s = await h.starten({ warten: 3500, hoehe: 1600, supabase: h.supabaseAttrappe({ kader: h.kaderZeilen(), termine: [], profiles: [{ name: "Charles", rolle: "trainer" }], tagebuch_punkt: [], tagebuch_kind: [] }) });
  const ev = fn => s.page.evaluate(fn);
  await ev(() => { document.getElementById("pin-gate")?.remove(); window.sbToken = () => "t"; });
  await ev(async () => { if (typeof loadKader === "function") await loadKader(); });
  const r = await ev(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    tagebuchNeu(); await w(80);
    const m = document.getElementById("tb-modal"), t = m.textContent;
    const pos = ["Worum ging es?", "Was hast du beobachtet?", "Was ist dir klar geworden?", "Was änderst du?", "Wohin gehört es?"].map(x => t.indexOf(x));
    const out = { pos, kindZu: !document.getElementById("tb-kind-einfuegen").open, vorZu: !document.getElementById("tb-kinder-vor").open, mehrZu: !document.getElementById("tb-mehr").open,
      fehlt1: document.getElementById("tb-fehlt").textContent };
    const aus = document.getElementById("tb-ausloeser"); aus.value = "Training"; aus.dispatchEvent(new Event("input"));
    const aha = document.getElementById("tb-aha"); aha.value = "Pausen sind Lernzeit."; aha.dispatchEvent(new Event("input"));
    const k = document.getElementById("tb-konsequenz"); k.value = "Ich frage in der Pause nach."; k.dispatchEvent(new Event("input"));
    out.fehlt2 = document.getElementById("tb-fehlt").textContent;
    tbBaustein("ich"); await w(50);
    out.fehlt3 = document.getElementById("tb-fehlt").textContent;
    // d) Kind einfügen
    const beob = document.getElementById("tb-beobachtung"); beob.focus(); beob.value = "Heute war "; beob.setSelectionRange(10, 10); tbFokus("beobachtung");
    document.getElementById("tb-kind-einfuegen").open = true; await w(30);
    const kb = document.querySelector("#tb-kind-einfuegen button"); kb.click(); await w(30);
    out.beob = document.getElementById("tb-beobachtung").value;
    const klein = [...document.querySelectorAll("#tb-modal button, #tb-modal summary, #tb-modal input[type=date]")].filter(el => el.getBoundingClientRect().height > 0 && !el.closest("#tb-kind-einfuegen > div") && !/Schließen/.test(el.getAttribute("aria-label") || "")).map(el => Math.round(el.getBoundingClientRect().height)).filter(x => x < 48);
    out.klein = klein;
    tagebuchSchliessen();
    tbOeffnen({ id: 5, datum: "2026-11-06", status: "fertig", baustein: "ich", ausloeser: "a", aha: "b", schlagworte: ["Ruhe"], kons: [{ id: 1, text: "k", bis: "2026-11-30", dauerhaft: false }] }); await w(60);
    out.mehrOffen = document.getElementById("tb-mehr").open;
    tagebuchSchliessen();
    return out;
  });
  const fe = s.fehler(); await s.schliessen();
  if (r.pos.some(p => p < 0) || r.pos.some((p, i) => i && p < r.pos[i - 1])) probleme.push("a) Reihenfolge der Fragen: " + JSON.stringify(r.pos));
  if (!r.kindZu || !r.vorZu || !r.mehrZu || !r.mehrOffen) probleme.push("b) Klappbereiche: " + JSON.stringify({ kindZu: r.kindZu, vorZu: r.vorZu, mehrZu: r.mehrZu, mehrOffen: r.mehrOffen }));
  /* ein neuer Eintrag hat „Ich als Trainer“ vorgewählt */
  if (!/fehlt noch: Auslöser, Aha, Konsequenz/.test(r.fehlt1) || !/fertiger Eintrag/.test(r.fehlt2) || !/fertiger Eintrag/.test(r.fehlt3)) probleme.push("c) Was fehlt: " + JSON.stringify([r.fehlt1, r.fehlt2, r.fehlt3]));
  /* Die Testumgebung kennt nur „Kind A“ … „Kind O“ als Namen – eingefügt wird der Name aus dem Kader an der Schreibmarke. */
  if (!/^Heute war Kind A/.test(r.beob)) probleme.push("d) Kind einfügen: " + r.beob);
  if (r.klein.length) probleme.push("d) unter 48 px: " + r.klein.join(","));
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v816 Eintrag schreiben: vier Fragen, Klappbereiche, was fehlt", !probleme.length, probleme.length ? probleme : ["Fragen in Reihenfolge · Kind/Wer/Mehr zugeklappt, Mehr offen mit Inhalt · „fehlt noch“ folgt beim Tippen · Vorname eingefügt · alles ≥ 48 px"]);
};
