/* Edge Function ki-portraet — v732 (PO 03.10.): „Adler im Porträt“ im Adler Nest.
   Schreibt aus Fan-Fakten und Kabinen-Reporter-Antworten einen kurzen, kindgerechten Porträt-Entwurf.
   Datenschutz: Die App schickt KEINE Namen – das Kind heißt „Kind A“, andere Kinder „ein Mitspieler“.
   Den Vornamen setzt erst die App ein; ins Heft kommt der Text erst nach Freigabe durch das Trainerteam.
   Nur Trainer; dasselbe Tageslimit (ki_usage) wie der Heft-Entwurf. */
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
const FELD: Record<string, string> = {
  lieblingsverein: "Lieblingsverein", lieblingsspieler: "Lieblingsspieler/-in", adler_seit: "Bei den Adlern seit",
  nummer_grund: "Warum diese Rückennummer", hobby: "Hobby neben dem Fußball", kann_gut: "Kann außer Fußball richtig gut",
  lieblingsessen: "Lieblingsessen", lieblingstier: "Lieblingstier", lieblingsmusik: "Lieblingsmusik / Kabinen-Song",
  lieblingsfilm: "Lieblingsfilm oder -serie", fussball_erlebnis: "Größtes Fußball-Erlebnis", gross_werden: "Wenn ich groß bin, möchte ich",
};
const SYS = `Du schreibst für das Vereinsheft „Adler Nest“ einer U9-Kinderfußballmannschaft (SV Adler Dellbrück) die Rubrik „Adler im Porträt“: Jede Woche wird ein Kind vorgestellt – reihum, es ist KEINE Auszeichnung.
Schreibe 4 bis 6 kurze Sätze, warmherzig, fröhlich und kindgerecht, so dass Kinder und Eltern es gern lesen. Sprich über das Kind in der dritten Person und nenne es IMMER genau „Kind A“ (kein anderer Name, kein Spitzname).
REGELN: Verwende NUR die gelieferten Angaben – nichts erfinden, nichts ausschmücken, was nicht dasteht. Keine Leistungsvergleiche, keine Wertung („der Beste“, „besser als“), keine Kritik, kein Druck. Keine Namen anderer Kinder („ein Mitspieler“ darf bleiben). Keine Angaben zu Schule, Wohnort oder Familie über das Gelieferte hinaus. Emojis höchstens zwei. Ende mit einem kurzen, freundlichen Satz an Kind A oder das Team.
Antworte AUSSCHLIESSLICH mit gültigem JSON: {"text":"…"}`;

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
    if (rpcErr || isTrainer !== true) return j({ error: "Nur Trainer können Porträt-Entwürfe schreiben lassen." }, 403);

    const body = await req.json().catch(() => ({}));
    const fakten = (body && typeof body.fakten === "object" && body.fakten) || {};
    const antworten = Array.isArray(body?.antworten) ? body.antworten.slice(0, 20) : [];
    const zeilen: string[] = [];
    for (const [k, label] of Object.entries(FELD)) {
      const v = String((fakten as any)[k] || "").trim().slice(0, 120);
      if (v) zeilen.push(`- ${label}: ${v}`);
    }
    const rep = antworten.map((a: any) => `- ${String(a?.frage || "").slice(0, 120)} → ${String(a?.antwort || "").slice(0, 160)}`).filter((x: string) => x.length > 4);
    if (!zeilen.length && !rep.length) return j({ error: "Keine Angaben für ein Porträt." }, 400);

    const svc = createClient(url, svcKey);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: usage } = await svc.from("ki_usage").select("count").eq("uid", uid).eq("tag", todayStr).maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= LIMIT) return j({ error: `Tageslimit erreicht (${LIMIT} KI-Anfragen/Tag).` }, 429);

    const prompt = [
      `Kind A${body?.torwart ? " (steht gern im Tor)" : ""}.`,
      zeilen.length ? "Fan-Fakten (von den Eltern):\n" + zeilen.join("\n") : "",
      rep.length ? "Antworten im Kabinen-Reporter (vom Kind selbst):\n" + rep.join("\n") : "",
    ].filter(Boolean).join("\n\n");

    const provider = (Deno.env.get("LLM_PROVIDER") || "anthropic").toLowerCase();
    const key = Deno.env.get("LLM_API_KEY");
    if (!key) return j({ error: "KI ist noch nicht eingerichtet (LLM_API_KEY fehlt)." }, 503);
    let content = "";
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: Deno.env.get("LLM_MODEL") || "gpt-4o-mini", max_tokens: 600, temperature: 0.8, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }] }) });
      if (!r.ok) return j({ error: "KI-Dienst nicht erreichbar (" + r.status + ")" }, 502);
      content = (await r.json())?.choices?.[0]?.message?.content || "";
    } else {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: Deno.env.get("LLM_MODEL") || "claude-haiku-4-5-20251001", max_tokens: 600, temperature: 0.8, system: SYS, messages: [{ role: "user", content: prompt }] }) });
      if (!r.ok) return j({ error: "KI-Dienst nicht erreichbar (" + r.status + ")" }, 502);
      content = (await r.json())?.content?.[0]?.text || "";
    }
    let parsed: any = null;
    try { parsed = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch { /* unlesbar */ } } }
    const text = String(parsed?.text || "").trim().slice(0, 1200);
    if (!text) return j({ error: "Die KI-Antwort war unlesbar. Bitte nochmal versuchen." }, 502);

    await svc.from("ki_usage").upsert({ uid, tag: todayStr, count: used + 1 }, { onConflict: "uid,tag" });
    return j({ text });
  } catch (_e) {
    return j({ error: "Serverfehler beim Porträt-Entwurf." }, 500);
  }
});
