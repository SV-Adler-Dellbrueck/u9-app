/* Edge Function schluessel-erzeugen — v643, am 27.09.2026 einmal gelaufen, seitdem stillgelegt.

   Erzeugte ein neues VAPID-Schlüsselpaar und legte es im Supabase Vault ab
   (adler_vapid_public / adler_vapid_private). Der private Schlüssel hat die Funktion nie
   verlassen; zurück kam nur der öffentliche, der in core.js (VAPID_PUBLIC) steht.

   Für einen künftigen Wechsel: im Vault beide VAPID-Einträge löschen, diese Funktion mit dem
   Rumpf unten ausrollen, per pg_net mit dem Cron-Schlüssel aus dem Vault aufrufen, danach
   wieder stilllegen und VAPID_PUBLIC in core.js ersetzen. Die Abos der Geräte erneuern sich
   beim nächsten Öffnen der App (pushSchluesselAbgleich in core.js).

     const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
     const { data: cron } = await admin.rpc("adler_geheimnis", { p_name: "adler_cron_secret" });
     if (!cron || req.headers.get("x-cron-secret") !== cron) return 403;
     const k = webpush.generateVAPIDKeys();            // npm:web-push@3.6.7
     await admin.rpc("adler_geheimnis_anlegen", { p_name: "adler_vapid_private", p_wert: k.privateKey });
     await admin.rpc("adler_geheimnis_anlegen", { p_name: "adler_vapid_public",  p_wert: k.publicKey });
     return { ok: true, public: k.publicKey };          // nur der öffentliche Schlüssel */
Deno.serve(() => new Response(JSON.stringify({ error: "stillgelegt" }), { status: 410, headers: { "Content-Type": "application/json" } }));
