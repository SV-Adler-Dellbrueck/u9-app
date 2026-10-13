/* v765 · „Daniela, Mutter von Mika, kommt nicht mehr in die Eltern-App“: Beim Code-Anfordern stand nur
   „Code konnte nicht gesendet werden“. Ursache: Die Datenbank lehnt Adressen ab, die nicht hinterlegt sind
   („Diese E-Mail ist nicht freigeschaltet …“), und die App übersetzte diese Antwort nicht. Der frühere Vorab-Check
   per RPC is_email_whitelisted lief seit dem 27.09. ins Leere (für anonyme Aufrufe gesperrt).
   a) Die Ablehnung der Datenbank wird zu einem Satz, der sagt, was zu tun ist (Adresse vom Trainerteam oder Einladungskarte).
   b) Auch wenn die Meldung nur im Feld „message“ oder „error_code“ steht, kommt derselbe Satz an.
   c) Es geht keine Anfrage mehr an is_email_whitelisted.
   d) Andere Fehler bleiben, wie sie waren (Zeitsperre) und der Knopf ist wieder bedienbar. */
"use strict";
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const r = await s.page.evaluate(async () => {
    const warte = ms => new Promise(x => setTimeout(x, ms));
    if (typeof elternPortalSend !== "function" || typeof authFehlerDeutsch !== "function") return { fehlt: true };
    const aufrufe = [];
    let antwort = null;
    const echt = window.fetch;
    window.fetch = async (u, o) => { u = String(u); if (/is_email_whitelisted|\/auth\/v1\/otp/.test(u)) { aufrufe.push(u.split("/").pop()); }
      if (/\/auth\/v1\/otp/.test(u)) return new Response(JSON.stringify(antwort), { status: antwort.code || 400, headers: { "Content-Type": "application/json" } });
      return echt(u, o); };
    document.getElementById("ep-probe")?.remove();
    const box = document.createElement("div"); box.id = "ep-probe";
    box.innerHTML = '<input id="ep-email2" value="Jemand@example.invalid"><div id="ep-err"></div><button id="ep-send">Code anfordern</button><div id="ep-step-email"></div><div id="ep-step-code" style="display:none"></div><span id="ep-email-show"></span>';
    document.body.appendChild(box);
    const lauf = async a => { antwort = a; aufrufe.length = 0; document.getElementById("ep-err").textContent = ""; await elternPortalSend(); await warte(50);
      const b = document.getElementById("ep-send"); return { text: document.getElementById("ep-err").textContent, knopf: b.textContent, aus: b.disabled, aufrufe: aufrufe.slice() }; };
    const out = {};
    out.a = await lauf({ code: 403, error_code: "unexpected_failure", msg: "Diese E-Mail ist nicht freigeschaltet. Bitte gib deinem Trainer deine Adresse." });
    out.b1 = await lauf({ code: 403, message: "Diese E-Mail ist nicht freigeschaltet." });
    out.b2 = await lauf({ code: 403, error: "hook_error", error_description: "Diese E-Mail ist nicht freigeschaltet." });
    out.d = await lauf({ code: 429, error_code: "over_email_send_rate_limit", msg: "For security purposes, you can only request this after 52 seconds." });
    window.fetch = echt; box.remove();
    return out;
  });
  const fe = s.fehler();
  await s.schliessen();
  if (r.fehlt) return h.ergebnis("v765 Code anfordern", false, ["elternPortalSend oder authFehlerDeutsch fehlt"]);
  const ok = /nicht hinterlegt/.test(r.a.text) && /Einladungskarte/.test(r.a.text) && !/konnte nicht gesendet/.test(r.a.text);
  if (!ok) probleme.push("a) " + JSON.stringify(r.a));
  zeilen.push(`a) „${r.a.text}“`);
  if (!/nicht hinterlegt/.test(r.b1.text) || !/nicht hinterlegt/.test(r.b2.text)) probleme.push("b) " + JSON.stringify({ b1: r.b1, b2: r.b2 }));
  zeilen.push("b) gleicher Satz, wenn die Meldung in „message“ oder „error_description“ steht");
  const alle = [r.a, r.b1, r.b2, r.d].flatMap(x => x.aufrufe);
  if (alle.some(x => /whitelisted/.test(x))) probleme.push("c) RPC is_email_whitelisted wird noch aufgerufen: " + JSON.stringify(alle));
  zeilen.push(`c) je Versuch genau eine Anfrage (${alle.join(", ")}), keine an is_email_whitelisted`);
  if (!/Minute warten/.test(r.d.text) || r.d.knopf !== "Code anfordern" || r.d.aus || r.a.knopf !== "Code anfordern" || r.a.aus) probleme.push("d) " + JSON.stringify({ a: r.a, d: r.d }));
  zeilen.push("d) Zeitsperre unverändert, Knopf nach dem Fehler wieder bedienbar");
  if (fe.length) probleme.push("Konsole: " + fe.slice(0, 2).join(" | "));
  return h.ergebnis("v765 Code anfordern: nicht hinterlegte Adresse wird erklärt", !probleme.length, probleme.length ? probleme : zeilen);
};
