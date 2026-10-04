/* Edge Function heft-audio — v756: Hörseite des Adler Nest (?hoeren=<token>), ohne Login.
   Nachtrag PDF-Export (Beschluss 18, 04.10.2026). Öffentlich aufrufbar (verify_jwt = false), liefert aber nur
   eines: bei gültigem Token eine auf 10 Minuten befristete, signierte Adresse der Hördatei dieser EINEN Ausgabe.
   Die Prüfung (Token vorhanden, nicht abgelaufen, nicht zurückgezogen, Ausgabe veröffentlicht) macht die
   Datenbankfunktion heft_audio_abrufen(); sie ist nur für service_role aufrufbar. Jeder Abruf prüft neu –
   Zurückziehen wirkt deshalb nach spätestens 600 Sekunden, auch auf schon ausgegebene Adressen.
   Kein Protokoll des Tokens, keine Cookies, nichts außer Dauer, Nummer und Adresse in der Antwort. */
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const KEIN_LINK = { ok: false };   // bewusst ohne Grund: abgelaufen, zurückgezogen und erfunden sehen gleich aus
function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    let token = "";
    if (req.method === "POST") { const b = await req.json().catch(() => ({})); token = String(b?.token || ""); }
    else token = new URL(req.url).searchParams.get("token") || "";
    if (!/^[0-9a-f]{64}$/.test(token)) return j(KEIN_LINK);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("heft_audio_abrufen", { p_token: token });
    const z = Array.isArray(data) ? data[0] : null;
    if (error || !z || !z.pfad) return j(KEIN_LINK);
    const { data: sig, error: e2 } = await admin.storage.from("heft_media").createSignedUrl(z.pfad, 600);
    if (e2 || !sig?.signedUrl) return j(KEIN_LINK);
    return j({ ok: true, url: sig.signedUrl, nummer: z.nummer, sekunden: z.sekunden });
  } catch (_e) {
    return j(KEIN_LINK);
  }
});
