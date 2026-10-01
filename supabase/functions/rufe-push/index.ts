/* Edge Function rufe-push — v673: Benachrichtigungen zu neuen Adler-Rufen.
   Läuft alle 5 Minuten über pg_cron („adler-rufe-push“). WER WANN eine Nachricht bekommt,
   entscheidet rufe_push_faellig() in der Datenbank (Ruhezeit 21–7 Uhr, Trainerteam und @alle
   sofort, sonst höchstens alle 30 Minuten gebündelt, Gelesenes nie) und merkt es sich dort –
   diese Funktion verschickt nur. Ein zweiter Aufruf in derselben Minute bleibt deshalb stumm.

   v701 (Version 2): Derselbe Lauf verschickt auch „Wie war's?“ an Trainer nach einem Termin
   (wiewars_push_faellig(): je Termin und Trainer höchstens einmal danach und einmal am Folgetag,
   Ruhezeit 21–7 Uhr; doku/auftrag-tagebuch-ki-sortieren/prozess-nacherfassung.md). Kein eigener
   Cron-Job – ein Aufruf alle fünf Minuten reicht für beides.

   v705 (Version 3): Ruhezeit je Konto (push_ruhezeit) – entscheiden rufe_push_faellig und
   wiewars_push_faellig in der Datenbank. Dazu holt derselbe Lauf nach, was push-send und push-cron
   während einer Ruhezeit in push_warteschlange gelegt haben (push_warteschlange_faellig).

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
    const { data: rufe, error } = await admin.rpc("rufe_push_faellig");
    if (error) return json({ error: error.message }, 500);
    /* Fehlt die Funktion (Migration v701 noch nicht eingespielt), bleiben die Adler-Rufe unberührt. */
    const { data: ww } = await admin.rpc("wiewars_push_faellig");
    /* v705: Was in eine Ruhezeit fiel (push-send, push-cron), geht jetzt raus – sobald sie vorbei ist. */
    const { data: ws } = await admin.rpc("push_warteschlange_faellig");
    const faellig = [...((rufe || []) as any[]).map((f) => ({ ...f, tag: "rufe" })),
                     ...((ww || []) as any[]).map((f) => ({ ...f, tag: "wiewars-" + f.termin_id })),
                     ...((ws || []) as any[]).map((w) => ({ user_id: w.user_id, titel: w.payload?.title, text: w.payload?.body, url: w.payload?.url, tag: w.payload?.tag || "adler" }))];
    if (!faellig.length) return json({ ok: true, sent: 0 });
    webpush.setVapidDetails("mailto:trainer@adler-dellbrueck.de",
      await geheimnis(admin, "adler_vapid_public"), await geheimnis(admin, "adler_vapid_private"));
    const ids = [...new Set(faellig.map((f: any) => f.user_id))];
    const { data: subs } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth,user_id").in("user_id", ids);
    const gone: string[] = [];
    let sent = 0;
    for (const f of faellig as any[]) {
      const payload = JSON.stringify({ title: f.titel, body: f.text, url: f.url, tag: f.tag });
      for (const s of (subs || []).filter((x: any) => x.user_id === f.user_id)) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload); sent++; }
        catch (e: any) { const c = e?.statusCode; if (c === 404 || c === 410 || c === 403) gone.push(s.endpoint); }
      }
    }
    if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
    return json({ ok: true, empfaenger: faellig.length, wiewars: (ww || []).length, nachgeholt: (ws || []).length, sent, removed: gone.length });
  } catch (e) { return json({ error: String(e) }, 500); }
});
