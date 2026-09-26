/* Edge Function ki-nachbereitung — Sprachnotiz → Nachbereitung (v627)

   PO (Bildschirmfoto „Einheit bewerten“): „Wenn ich Einheiten nachbewerte, sei es Training,
   Spiele oder Festivals, wäre es gut, dass ich diese auch per Sprachnotiz eingeben kann und
   die KI dann diese Notizen übernimmt und strukturiert.“

   Der Trainer spricht frei („Aufwärmen lief gut, die Kinder hatten Spaß, beim Passspiel
   hat's gehakt …“). Diese Funktion ordnet das Gesagte den Feldern des Bewertungsfensters zu.
   Was nicht gesagt wurde, bleibt null – die KI erfindet keine Bewertung. Gespeichert wird
   hier nichts: der Vorschlag landet im Fenster, der Trainer prüft und speichert selbst.

   Datenschutz: Kindernamen kommen hier nicht an. Der Client ersetzt sie vor dem Senden durch
   „Kind 1“, „Kind 2“ … und übersetzt die Antwort zurück. Geheimnisse (LLM_API_KEY) stehen
   ausschließlich in den Secrets. Tageslimit und Zähler teilt sie mit ki-uebung (ki_usage). */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const LIMIT = 20;          // gemeinsam mit ki-uebung, je Trainer und Tag
const MAX_TEXT = 4000;     // etwa fünf Minuten gesprochener Text

function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const SYS = `Du bist Assistent eines Kinderfußball-Trainers (U9, SV Adler Dellbrück). Er hat nach einer
Einheit frei gesprochen – eine Sprachnotiz, oft umgangssprachlich, mit Versprechern der
Spracherkennung. Du ordnest das Gesagte den Feldern seines Bewertungsbogens zu.

REGELN
- Nur was gesagt oder eindeutig gemeint ist. Kein Wort dazu → null. Erfinde keine Bewertung,
  auch keine „mittlere“. Lieber ein Feld leer als ein geratenes.
- Skalen: Sterne 1–5 (1 sehr schlecht, 3 okay, 5 hervorragend); Kinder-Sterne 1–3; Stufen
  1–3 (1 schwach, 2 ok, 3 stark). „super/top/richtig gut“ = oben, „ging so/okay“ = Mitte,
  „schlecht/hat nicht geklappt/Chaos“ = unten.
- Übungen und Mannschaften ordnest du über ihre Nummer zu. Nennt er eine Übung ungefähr
  („das Dribbeln“, „das Spiel am Ende“), nimm die passendste – bei echtem Zweifel keine.
- Notizen und Sätze: kurz, sachlich, in der Sprache des Trainers, als Stichpunkt-Satz ohne
  Füllwörter, höchstens 200 Zeichen. Nichts hinzudichten, keine Ratschläge ergänzen.
- Kinder heißen im Text „Kind 1“, „Kind 2“ … Übernimm genau diese Bezeichnung.
- Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in der verlangten Form.`;

const FORM_TRAINING = `{
  "einheit": {"spass": 1-5|null, "umsetzung": 1-5|null, "erfolg": 1-5|null, "notiz": "…"|null},
  "uebungen": [{"nr": <Nummer>, "durchfuehrung": 1-5|null, "spass": 1-5|null, "anforderung": 1-5|null,
                "notiz": "…"|null, "uebersprungen": true|false}],
  "kinder": [{"kind": "Kind 3", "sterne": 1-3}]
}
Bedeutung: einheit.spass = Spaß der Kinder insgesamt; umsetzung = wurde der Plan umgesetzt;
erfolg = wurde das Ziel der Einheit erreicht. Je Übung: durchfuehrung = lief die Übung
organisatorisch; spass = Spaßfaktor Kinder; anforderung = wurde die Anforderung umgesetzt;
uebersprungen = die Übung fand nicht statt. Nur Übungen und Kinder aufführen, zu denen etwas
gesagt wurde.`;

const FORM_SPIEL = `{
  "teams": [{"nr": <Nummer>, "ordnung": 1-3|null, "pass": 1-3|null, "zweikampf": 1-3|null, "spass": 1-3|null}],
  "gaeste": [{"name": "<genau wie vorgegeben>", "einschaetzung": "zu_schwach"|"passend"|"zu_stark"}],
  "getragen": "…"|null,
  "arbeiten": "…"|null,
  "orga": {"zeitplan": 1-3|null, "felder": 1-3|null, "helfer": 1-3|null}
}
Bedeutung: ordnung = verteilt geblieben (3) oder Traube um den Ball (1); pass = kamen Pässe an;
zweikampf = angenommen (3) oder zurückgewichen (1); spass = wie es den Kindern ging.
getragen = was gut lief (1–2 Sätze); arbeiten = woran wir arbeiten (1–2 Sätze).
orga.zeitplan: 1 zu eng, 2 passte, 3 zu viel Luft; orga.felder: 1 zu klein, 2 passten,
3 zu groß; orga.helfer: 1 zu wenige, 2 knapp, 3 genug. Sagt er „nur eine Mannschaft“ oder
nennt keine, gilt das Gesagte für Mannschaft 1.`;

async function llmRuf(provider: string, key: string, model: string, sys: string, user: string) {
  if (provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 2000, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
    });
    if (!r.ok) return { ok: false, status: r.status, text: "" };
    const d = await r.json();
    return { ok: true, status: 200, text: d?.choices?.[0]?.message?.content || "" };
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2000, temperature: 0.1, system: sys,
      messages: [{ role: "user", content: user }, { role: "assistant", content: "{" }] }),
  });
  if (!r.ok) return { ok: false, status: r.status, text: "" };
  const d = await r.json();
  return { ok: true, status: 200, text: "{" + (d?.content?.[0]?.text || "") };
}

const zahl = (v: unknown, max: number) => { const n = Math.round(Number(v)); return (isFinite(n) && n >= 1 && n <= max) ? n : null; };
const satz = (v: unknown, max = 200) => { const s = String(v ?? "").trim(); return (s && s.toLowerCase() !== "null") ? s.slice(0, max) : null; };

function sanTraining(p: any, nrs: Set<number>, kinder: Set<string>) {
  const e = p?.einheit || {};
  const out: any = {
    einheit: { spass: zahl(e.spass, 5), umsetzung: zahl(e.umsetzung, 5), erfolg: zahl(e.erfolg, 5), notiz: satz(e.notiz, 300) },
    uebungen: [], kinder: [],
  };
  for (const u of Array.isArray(p?.uebungen) ? p.uebungen : []) {
    const nr = Number(u?.nr); if (!nrs.has(nr)) continue;
    out.uebungen.push({ nr, durchfuehrung: zahl(u.durchfuehrung, 5), spass: zahl(u.spass, 5), anforderung: zahl(u.anforderung, 5),
      notiz: satz(u.notiz, 200), uebersprungen: u.uebersprungen === true });
  }
  for (const k of Array.isArray(p?.kinder) ? p.kinder : []) {
    const name = String(k?.kind || ""); const s = zahl(k?.sterne, 3);
    if (kinder.has(name) && s) out.kinder.push({ kind: name, sterne: s });
  }
  return out;
}
function sanSpiel(p: any, nrs: Set<number>, gaeste: Set<string>) {
  const GAST = ["zu_schwach", "passend", "zu_stark"];
  const o = p?.orga || {};
  const out: any = { teams: [], gaeste: [], getragen: satz(p?.getragen, 300), arbeiten: satz(p?.arbeiten, 300),
    orga: { zeitplan: zahl(o.zeitplan, 3), felder: zahl(o.felder, 3), helfer: zahl(o.helfer, 3) } };
  for (const t of Array.isArray(p?.teams) ? p.teams : []) {
    const nr = Number(t?.nr); if (!nrs.has(nr)) continue;
    out.teams.push({ nr, ordnung: zahl(t.ordnung, 3), pass: zahl(t.pass, 3), zweikampf: zahl(t.zweikampf, 3), spass: zahl(t.spass, 3) });
  }
  for (const g of Array.isArray(p?.gaeste) ? p.gaeste : []) {
    const name = String(g?.name || ""); const e = String(g?.einschaetzung || "");
    if (gaeste.has(name) && GAST.includes(e)) out.gaeste.push({ name, einschaetzung: e });
  }
  return out;
}

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
    if (rpcErr || isTrainer !== true) return j({ error: "Nur Trainer können die Sprachnotiz auswerten lassen." }, 403);

    const svc = createClient(url, svcKey);
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await svc.from("ki_usage").select("count").eq("uid", uid).eq("tag", today).maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= LIMIT) return j({ error: `Tageslimit erreicht (${LIMIT} KI-Anfragen/Tag). Morgen wieder!` }, 429);

    const body = await req.json().catch(() => ({}));
    const art = body?.art === "spiel" ? "spiel" : "training";
    const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
    if (text.length < 15) return j({ error: "Die Notiz ist zu kurz – sprich ein paar Sätze zur Einheit." }, 400);

    let user = "", nrs = new Set<number>(), namen = new Set<string>();
    if (art === "training") {
      const ue = (Array.isArray(body?.uebungen) ? body.uebungen : []).slice(0, 30)
        .map((u: any) => ({ nr: Number(u?.nr), name: String(u?.name || "").slice(0, 120), bloecke: String(u?.bloecke || "").slice(0, 160) }))
        .filter((u: any) => isFinite(u.nr));
      const kinder = (Array.isArray(body?.kinder) ? body.kinder : []).slice(0, 30).map((k: unknown) => String(k)).filter((k: string) => /^Kind \d+$/.test(k));
      nrs = new Set(ue.map((u: any) => u.nr)); namen = new Set(kinder);
      user = `ÜBUNGEN DIESER EINHEIT:\n${ue.map((u: any) => `${u.nr}. ${u.name}${u.bloecke ? " (" + u.bloecke + ")" : ""}`).join("\n") || "(keine geplant)"}\n\n`
        + `ANWESENDE KINDER: ${kinder.join(", ") || "(keine erfasst)"}\n\nANTWORTFORM:\n${FORM_TRAINING}\n\nSPRACHNOTIZ:\n"""\n${text}\n"""`;
    } else {
      const teams = (Array.isArray(body?.teams) ? body.teams : []).slice(0, 8)
        .map((t: any) => ({ nr: Number(t?.nr), name: String(t?.name || "").slice(0, 60) })).filter((t: any) => isFinite(t.nr));
      const gaeste = (Array.isArray(body?.gaeste) ? body.gaeste : []).slice(0, 12).map((g: unknown) => String(g).slice(0, 80));
      nrs = new Set(teams.map((t: any) => t.nr)); namen = new Set(gaeste);
      user = `ART: ${body?.festival ? "Festival" : "Spiel"}\nUNSERE MANNSCHAFTEN:\n${teams.map((t: any) => `${t.nr}. ${t.name}`).join("\n")}\n`
        + `GÄSTE / GEGNER: ${gaeste.join(" · ") || "(keine)"}\n\nANTWORTFORM:\n${FORM_SPIEL}\n\nSPRACHNOTIZ:\n"""\n${text}\n"""`;
    }

    const provider = (Deno.env.get("LLM_PROVIDER") || "anthropic").toLowerCase();
    const key = Deno.env.get("LLM_API_KEY");
    if (!key) return j({ error: "KI ist noch nicht eingerichtet (LLM_API_KEY fehlt)." }, 503);
    const wunsch = Deno.env.get("LLM_MODEL") || (provider === "openai" ? "gpt-4o" : "claude-sonnet-5");
    const rueckfall = provider === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5-20251001";
    let modell = wunsch;
    let res = await llmRuf(provider, key, wunsch, SYS, user);
    if (!res.ok && wunsch !== rueckfall) { modell = rueckfall; res = await llmRuf(provider, key, rueckfall, SYS, user); }
    if (!res.ok) return j({ error: "KI-Dienst nicht erreichbar (" + res.status + ")" }, 502);

    let parsed: any = null;
    try { parsed = JSON.parse(res.text); } catch {
      const m = res.text.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch { /* unlesbar */ } }
    }
    if (!parsed || typeof parsed !== "object") return j({ error: "Die KI-Antwort war unlesbar. Bitte noch einmal versuchen." }, 502);
    const ergebnis = art === "training" ? sanTraining(parsed, nrs, namen) : sanSpiel(parsed, nrs, namen);

    await svc.from("ki_usage").upsert({ uid, tag: today, count: used + 1 }, { onConflict: "uid,tag" });
    return j({ art, ergebnis, rest: LIMIT - (used + 1), modell }, 200);
  } catch (_e) {
    return j({ error: "Serverfehler bei der Sprachnotiz." }, 500);
  }
});
