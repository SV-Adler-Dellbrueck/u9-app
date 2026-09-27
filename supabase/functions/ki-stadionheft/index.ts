import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const LIMIT = 20;
function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function dOnly(s: string) { return String(s || "").slice(0, 10); }

const SYS = `Du bist der gute-Laune-Redakteur des Vereinshefts "Adler Horst" einer U9-Kinderfussballmannschaft (SV Adler Dellbrueck). Schreibe einen kurzen, warmherzigen, LUSTIGEN und kindgerechten Entwurf aus den gelieferten Fakten der letzten Wochen.
REGELN: Positiv, humorvoll, kindgerecht (keine Leistungsvergleiche, keine Kritik, kein Leistungsdruck; U9 = Spass & Miteinander). Emojis sparsam. Erwaehne Geburtstage nur allgemein und herzlich, OHNE Namen (die Namen setzt das Trainerteam selbst ein). Nenne keine Kinder beim Namen. Ergebnisse nur beilaeufig, Fokus auf Einsatz, Spass, Zusammenhalt. Wenn wenig Daten da sind, schreibe trotzdem eine nette, allgemeine Begruessung.
Antworte AUSSCHLIESSLICH mit gueltigem JSON, ohne Text davor/danach:
{"einleitung":"2-4 Saetze Grusswort/Rueckblick, mit \\n fuer Absaetze","kommentar":"2-4 Saetze 'Wort vom Trainerteam' inkl. allgemeiner Geburtstagsgruesse ohne Namen, mit \\n fuer Absaetze"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j({ error: "POST erwartet" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return j({ error: "auth required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: udata } = await userClient.auth.getUser();
    const uid = udata?.user?.id;
    if (!uid) return j({ error: "not authenticated" }, 401);
    const { data: isTrainer, error: rpcErr } = await userClient.rpc("is_trainer");
    if (rpcErr || isTrainer !== true) return j({ error: "Nur Trainer koennen den KI-Heft-Entwurf nutzen." }, 403);

    const svc = createClient(url, svcKey);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const { data: usage } = await svc.from("ki_usage").select("count").eq("uid", uid).eq("tag", todayStr).maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= LIMIT) return j({ error: `Tageslimit erreicht (${LIMIT} KI-Anfragen/Tag).` }, 429);

    // Zeitraum: seit letzter Heft-Aktualisierung, sonst 35 Tage.
    const { data: heftRow } = await svc.from("stadionheft").select("updated_at").eq("team", "adler1").maybeSingle();
    let since = new Date(today.getTime() - 35 * 864e5).toISOString().slice(0, 10);
    if (heftRow?.updated_at) { const u = dOnly(heftRow.updated_at); if (u > since) since = u; }

    const [{ data: trainings }, { data: spiele }, { data: tk }, { data: ma }, { data: kader }] = await Promise.all([
      svc.from("termine").select("datum").eq("typ", "training").gte("datum", since).lte("datum", todayStr),
      svc.from("termine").select("datum,gegner,typ").in("typ", ["spiel", "turnier"]).gte("datum", since).lte("datum", todayStr).order("datum"),
      svc.from("ticker_events").select("datum,typ").gte("datum", since),
      svc.from("match_actions").select("datum,spieler,aktion").gte("datum", since),
      svc.from("kader").select("name,geb").not("geb", "is", null),
    ]);

    const pref = (d: string) => String(d || "").slice(0, 10);
    const resByDay: Record<string, { tor: number; geg: number }> = {};
    (tk || []).forEach((e: any) => { const d = pref(e.datum); (resByDay[d] ||= { tor: 0, geg: 0 }); if (e.typ === "tor") resByDay[d].tor++; else if (e.typ === "gegentor") resByDay[d].geg++; });
    const spielLines = (spiele || []).map((s: any) => { const r = resByDay[pref(s.datum)]; const erg = r ? `${r.tor}:${r.geg}` : "gespielt"; return `- ${pref(s.datum)}${s.gegner ? " vs " + s.gegner : ""} (${s.typ === "turnier" ? "Turnier" : "Spiel"}): ${erg}`; });

    const tore: Record<string, number> = {}; let aktTotal = 0;
    (ma || []).forEach((a: any) => { aktTotal++; if (a.aktion === "tor" && a.spieler) tore[a.spieler] = (tore[a.spieler] || 0) + 1; });
    // v636: keine Kindernamen an den KI-Anbieter und keine Torschützen-Rangliste ins (öffentliche) Heft.
    const toreGesamt = Object.values(tore).reduce((a, b) => a + b, 0);

    const bdays: string[] = [];
    (kader || []).forEach((k: any) => {
      if (!k.geb) return; const g = new Date(k.geb + "T00:00:00"); if (isNaN(+g)) return;
      const thisYear = new Date(today.getFullYear(), g.getMonth(), g.getDate());
      const diff = (thisYear.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5;
      if (diff >= 0 && diff <= 21) { const alter = today.getFullYear() - g.getFullYear(); bdays.push("x"); void alter; }   // v636: nur zählen – kein Name, kein Datum an den KI-Anbieter
    });

    const briefing = [
      `Zeitraum: seit ${since}.`,
      `Trainingseinheiten: ${(trainings || []).length}.`,
      `Spiele/Turniere:`, (spielLines.length ? spielLines.join("\n") : "- keine"),
      `Erfasste Ballaktionen gesamt: ${aktTotal}.`,
      `Tore gesamt (vom ganzen Team): ${toreGesamt}.`,
      `Geburtstage in den naechsten drei Wochen: ${bdays.length ? bdays.length + " Kinder" : "keine"}.`,
    ].join("\n");

    const provider = (Deno.env.get("LLM_PROVIDER") || "anthropic").toLowerCase();
    const key = Deno.env.get("LLM_API_KEY");
    if (!key) return j({ error: "KI ist noch nicht eingerichtet (LLM_API_KEY fehlt)." }, 503);

    let content = "";
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: Deno.env.get("LLM_MODEL") || "gpt-4o-mini", max_tokens: 800, temperature: 0.9, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYS }, { role: "user", content: briefing }] }) });
      if (!r.ok) return j({ error: "KI-Dienst nicht erreichbar (" + r.status + ")" }, 502);
      content = (await r.json())?.choices?.[0]?.message?.content || "";
    } else {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: Deno.env.get("LLM_MODEL") || "claude-haiku-4-5-20251001", max_tokens: 800, temperature: 1, system: SYS, messages: [{ role: "user", content: briefing }] }) });
      if (!r.ok) return j({ error: "KI-Dienst nicht erreichbar (" + r.status + ")" }, 502);
      content = (await r.json())?.content?.[0]?.text || "";
    }
    let parsed: any = null;
    try { parsed = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch { /*ignore*/ } } }
    const einleitung = String(parsed?.einleitung || "").slice(0, 1200);
    const kommentar = String(parsed?.kommentar || "").slice(0, 1200);
    if (!einleitung && !kommentar) return j({ error: "Die KI-Antwort war unlesbar. Bitte nochmal versuchen." }, 502);

    await svc.from("ki_usage").upsert({ uid, tag: todayStr, count: used + 1 }, { onConflict: "uid,tag" });
    return j({ einleitung, kommentar, meta: { trainings: (trainings || []).length, spiele: (spiele || []).length, geburtstage: bdays.length, seit: since } });
  } catch (_e) {
    return j({ error: "Serverfehler beim KI-Heft-Entwurf." }, 500);
  }
});
