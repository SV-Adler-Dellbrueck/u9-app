/* Edge Function ki-plan-pruefen — prüft einen Trainingsplan im selben Thema (v657)

   PO am 28.09.: „… am Tag des Trainings noch mal über einen Button (,Aktualisieren nach
   Anwesenheit‘), sodass die KI dann im gleichen Tenor, also im gleichen Schwerpunkt, die
   Übungen noch mal anpasst und prüft, ob der Plan auch so aufgeht oder nicht.“

   Die App hat vorher schon nach festen Regeln angepasst (Gruppen nach Trainern, Übungen nach
   Gruppengröße). Diese Funktion urteilt nur und schlägt Tausche vor. Getauscht werden darf
   ausschließlich gegen eine Übung aus der mitgeschickten Kandidatenliste – alles andere wirft
   die Prüfung unten weg. Geschrieben wird hier nichts; der Trainer übernimmt per Tipp.

   Datenschutz: Es kommen keine Kindernamen an, nur Zahlen. Geheimnisse (LLM_API_KEY) stehen
   ausschließlich in den Secrets. Tageslimit gemeinsam mit ki-uebung (ki_usage). */

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

const SYS = `Du bist erfahrener Kinderfußball-Trainer (U9, 7–9 Jahre) und prüfst den Trainingsplan eines
Kollegen für heute. Die Saison wird nur FUNiño 3 gegen 3 (Flitzer links, Flitzer rechts, Aufpasser
in der Mitte) und 3+1 (Raute: Jäger vorn, zwei Flitzer außen, Torwart spielt mit) gespielt.

Du bekommst: das Thema des Blocks (eine Leitfrage), das Ziel für die Kinder, wie viele Kinder
und Trainer da sind, die Hauptteile mit ihren Stationen (Übung, Kinderzahl laut Übung, Kinder
an der Station) und eine Liste von Übungen, aus der allein getauscht werden darf.

PRÜFE
- Passt jede Station zur Zahl der Kinder dort? Ein Kind mehr als die Übung trägt ist in Ordnung
  (es wechselt ein). Mehr oder deutlich weniger: tauschen.
- Dient jede Übung dem Thema und dem Ziel? Eine Übung, die am Thema vorbeigeht, tauschen.
- Kommt FUNiño bzw. 3+1 im Plan vor? Wenn nicht, eine Station tauschen, wenn es eine passende gibt.
- Wartereihen vermeiden; lieber alle spielen.

REGELN
- Tausche nur, wenn es wirklich besser wird. Höchstens drei Tausche. Ein guter Plan bleibt.
- „zu“ muss wörtlich ein Name aus der Kandidatenliste sein.
- Kurz und in der Sprache eines Trainers, keine Fachbegriffe ohne Not.
- Antworte AUSSCHLIESSLICH mit JSON:
{"passt": true|false, "urteil": "ein bis zwei Sätze",
 "tausch": [{"block": <Zahl>, "station": <Zahl>, "zu": "<Name aus der Liste>", "grund": "ein Satz"}],
 "hinweise": ["höchstens drei kurze Coaching-Hinweise zum Thema"]}`;

async function llmRuf(provider: string, key: string, model: string, sys: string, user: string) {
  if (provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8000, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
    });
    if (!r.ok) return { ok: false, status: r.status, text: "" };
    const d = await r.json();
    return { ok: true, status: 200, text: d?.choices?.[0]?.message?.content || "" };
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 8000, temperature: 0.1, system: sys,
      messages: [{ role: "user", content: user }, { role: "assistant", content: "{" }] }),
  });
  if (!r.ok) return { ok: false, status: r.status, text: "" };
  const d = await r.json();
  return { ok: true, status: 200, text: "{" + (d?.content?.[0]?.text || "") };
}


const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

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
    if (rpcErr || isTrainer !== true) return j({ error: "Nur Trainer können den Plan prüfen lassen." }, 403);

    const svc = createClient(url, svcKey);
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await svc.from("ki_usage").select("count").eq("uid", uid).eq("tag", today).maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= LIMIT) return j({ error: `Tageslimit erreicht (${LIMIT} KI-Anfragen/Tag). Morgen wieder!` }, 429);

    const body = await req.json().catch(() => ({}));
    const bloecke = (Array.isArray(body?.bloecke) ? body.bloecke : []).slice(0, 8).map((b: any) => ({
      block: Number(b?.block), label: txt(b?.label, 80), dauer: Number(b?.dauer) || 0,
      stationen: (Array.isArray(b?.stationen) ? b.stationen : []).slice(0, 6).map((s: any) => ({
        station: Number(s?.station), uebung: txt(s?.uebung, 120), spieler: txt(s?.spieler, 80), kinder: Number(s?.kinder) || 0,
      })).filter((s: any) => isFinite(s.station) && s.uebung),
    })).filter((b: any) => isFinite(b.block) && b.stationen.length);
    if (!bloecke.length) return j({ error: "Kein Hauptteil im Plan." }, 400);
    const kandidaten = (Array.isArray(body?.kandidaten) ? body.kandidaten : []).slice(0, 240)
      .map((k: any) => ({ name: txt(k?.name, 120), kat: txt(k?.kat, 30), spieler: txt(k?.spieler, 60) })).filter((k: any) => k.name);
    const namen = new Set(kandidaten.map((k: any) => k.name));
    const plaetze = new Set<string>();
    bloecke.forEach((b: any) => b.stationen.forEach((s: any) => plaetze.add(b.block + "/" + s.station)));

    const user = `THEMA (Leitfrage): ${txt(body?.leitfrage, 160) || "(keins)"}\n`
      + (txt(body?.ziel, 160) ? `EIGENES ZIEL: ${txt(body?.ziel, 160)}\n` : "")
      + `ZIEL FÜR DIE KINDER: ${txt(body?.ziel_kinder, 160) || "(keins)"}\n`
      + `SPIELFORMAT: ${txt(body?.format, 120)}\nKINDER HEUTE: ${Number(body?.kinder) || 0} · TRAINER: ${Number(body?.trainer) || 0}\n\n`
      + `HAUPTTEILE:\n` + bloecke.map((b: any) => `Block ${b.block} – ${b.label} (${b.dauer} Min.)\n`
        + b.stationen.map((s: any) => `  Station ${s.station}: ${s.uebung} · Übung für: ${s.spieler || "?"} · Kinder dort: ${s.kinder}`).join("\n")).join("\n")
      + `\n\nKANDIDATEN (nur daraus tauschen):\n` + kandidaten.map((k: any) => `- ${k.name} [${k.kat}] (${k.spieler})`).join("\n");

    const provider = (Deno.env.get("LLM_PROVIDER") || "anthropic").toLowerCase();
    const key = Deno.env.get("LLM_API_KEY");
    if (!key) return j({ error: "KI ist noch nicht eingerichtet (LLM_API_KEY fehlt)." }, 503);
    const wunsch = Deno.env.get("LLM_MODEL") || (provider === "openai" ? "gpt-4o" : "claude-sonnet-5");
    const rueckfall = provider === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5-20251001";
    let res = await llmRuf(provider, key, wunsch, SYS, user);
    if (!res.ok && wunsch !== rueckfall) res = await llmRuf(provider, key, rueckfall, SYS, user);
    if (!res.ok) return j({ error: "KI-Dienst nicht erreichbar (" + res.status + ")" }, 502);

    let p: any = null;
    try { p = JSON.parse(res.text); } catch {
      const m = res.text.match(/\{[\s\S]*\}/); if (m) { try { p = JSON.parse(m[0]); } catch { /* unlesbar */ } }
    }
    if (!p || typeof p !== "object") return j({ error: "Die KI-Antwort war unlesbar. Bitte noch einmal versuchen." }, 502);
    const tausch = (Array.isArray(p.tausch) ? p.tausch : []).map((t: any) => ({
      block: Number(t?.block), station: Number(t?.station), zu: txt(t?.zu, 120), grund: txt(t?.grund, 200),
    })).filter((t: any) => namen.has(t.zu) && plaetze.has(t.block + "/" + t.station)).slice(0, 3);
    const hinweise = (Array.isArray(p.hinweise) ? p.hinweise : []).map((h: unknown) => txt(h, 200)).filter(Boolean).slice(0, 3);

    await svc.from("ki_usage").upsert({ uid, tag: today, count: used + 1 }, { onConflict: "uid,tag" });
    return j({ passt: p.passt === true && !tausch.length, urteil: txt(p.urteil, 400), tausch, hinweise, rest: LIMIT - (used + 1) }, 200);
  } catch (_e) {
    return j({ error: "Serverfehler bei der Plan-Prüfung." }, 500);
  }
});
