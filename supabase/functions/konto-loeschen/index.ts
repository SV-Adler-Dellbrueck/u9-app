/* Edge Function konto-loeschen — v644: Eltern löschen ihr eigenes Konto selbst.

   Gelöscht wird, was an der Person hängt: Anmeldung, Geräte für Mitteilungen, Einwilligungen,
   Helferdienste, Stimmungsbilder, Gesprächswünsche, Stimmen in Terminabstimmungen und die
   Verknüpfung zu den Kindern. Die Daten der Kinder bleiben – dafür gibt es den Löschantrag
   (Tabelle loeschantrag); ein offener Antrag bleibt nach dem Löschen des Kontos bestehen.
   Trainerkonten lassen sich hier nicht löschen. */
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(jwt);
    const user = u?.user;
    if (!user?.id) return json({ error: "Bitte anmelden" }, 401);
    const uid = user.id, mail = (user.email || "").toLowerCase();
    const { data: prof } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
    if (prof?.role === "trainer") return json({ error: "Trainerkonten löscht das Trainerteam in den Einstellungen" }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.bestaetigt !== true) return json({ error: "Bitte bestätigen" }, 400);

    const weg = async (tab: string, spalte: string, wert: string) => { await admin.from(tab).delete().eq(spalte, wert); };
    await weg("push_subscriptions", "user_id", uid);
    await weg("ansagen_gelesen", "user_id", uid);
    await weg("event_puls", "user_id", uid);
    await weg("fairplay_commit", "user_id", uid);
    await weg("dsgvo_consent", "user_id", uid);
    await weg("event_helfer", "user_id", uid);
    await weg("eltern_poll_vote", "voter", uid);
    await weg("elterngespraech_wunsch", "created_by", uid);
    await admin.from("event_mitbringen").update({ created_by: null }).eq("created_by", uid);
    await admin.from("loeschantrag").update({ antrag_von: null }).eq("antrag_von", uid);
    // Nicht per ilike löschen: „_“ in einer Adresse wäre dort ein Platzhalter und träfe fremde Zeilen.
    if (mail) {
      const { data: ek } = await admin.from("eltern_kinder").select("id,email");
      const ids = (ek || []).filter((r: any) => String(r.email || "").toLowerCase() === mail).map((r: any) => r.id);
      if (ids.length) await admin.from("eltern_kinder").delete().in("id", ids);
    }
    await weg("profiles", "id", uid);
    const r = await admin.auth.admin.deleteUser(uid);
    if (r.error) return json({ error: "Konto nicht gelöscht: " + r.error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
