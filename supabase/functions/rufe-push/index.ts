/* Edge Function rufe-push — v673: Benachrichtigungen zu neuen Adler-Rufen.
   Läuft alle 5 Minuten über pg_cron („adler-rufe-push“). WER WANN eine Nachricht bekommt,
   entscheidet rufe_push_faellig() in der Datenbank (Ruhezeit 21–7 Uhr, Trainerteam und @alle
   sofort, sonst höchstens alle 30 Minuten gebündelt, Gelesenes nie) und merkt es sich dort –
   diese Funktion verschickt nur. Ein zweiter Aufruf in derselben Minute bleibt deshalb stumm.

   NIE von Hand mit dem echten Cron-Schlüssel aufrufen (CLAUDE.md): Die Datenbank merkt sich
   jeden Aufruf als versendet. Schlüssel kommen aus dem Vault (RPC adler_geheimnis, v643). */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function geheimnis(admin: any, name: string): Promise<string> {
  const { data, error } = await admin.rpc("adler_geheimnis", { p_name: name });
  if (error || !data) throw new Error("Schlüssel " + name + " fehlt im Vault");
  return data as string;
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let cron = "";
  try { cron = await geheimnis(admin, "adler_cron_secret"); } catch (_e) { return json({ error: "forbidden" }, 403); }
  if (req.headers.get("x-cron-secret") !== cron) return json({ error: "forbidden" }, 403);
  try {
    const { data: faellig, error } = await admin.rpc("rufe_push_faellig");
    if (error) return json({ error: error.message }, 500);
    if (!faellig || !faellig.length) return json({ ok: true, sent: 0 });
    webpush.setVapidDetails("mailto:trainer@adler-dellbrueck.de",
      await geheimnis(admin, "adler_vapid_public"), await geheimnis(admin, "adler_vapid_private"));
    const ids = [...new Set(faellig.map((f: any) => f.user_id))];
    const { data: subs } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth,user_id").in("user_id", ids);
    const gone: string[] = [];
    let sent = 0;
    for (const f of faellig as any[]) {
      const payload = JSON.stringify({ title: f.titel, body: f.text, url: f.url, tag: "rufe" });
      for (const s of (subs || []).filter((x: any) => x.user_id === f.user_id)) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload); sent++; }
        catch (e: any) { const c = e?.statusCode; if (c === 404 || c === 410 || c === 403) gone.push(s.endpoint); }
      }
    }
    if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
    return json({ ok: true, empfaenger: faellig.length, sent, removed: gone.length });
  } catch (e) { return json({ error: String(e) }, 500); }
});
