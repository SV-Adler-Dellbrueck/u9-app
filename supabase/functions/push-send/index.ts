/* Edge Function push-send — Trainer schickt eine Mitteilung an Eltern oder Trainer.

   v643: Die VAPID-Schlüssel standen bis dahin als Konstante im Code dieser Funktion. Jetzt
   liegen sie im Supabase Vault (adler_vapid_public / adler_vapid_private) und werden über
   die RPC adler_geheimnis gelesen, die nur die service_role ausführen darf. Im Repo steht
   deshalb kein Schlüssel – der öffentliche steht zusätzlich in core.js (VAPID_PUBLIC). */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function geheimnis(admin: any, name: string): Promise<string> {
  const { data, error } = await admin.rpc("adler_geheimnis", { p_name: name });
  if (error || !data) throw new Error("Schlüssel " + name + " fehlt im Vault");
  return data as string;
}
let vapidGesetzt = false;
async function vapid(admin: any) {
  if (vapidGesetzt) return;
  webpush.setVapidDetails("mailto:trainer@adler-dellbrueck.de",
    await geheimnis(admin, "adler_vapid_public"), await geheimnis(admin, "adler_vapid_private"));
  vapidGesetzt = true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "auth erforderlich" }, 401);

    const { data: prof } = await admin.from("profiles").select("role").eq("id", uid).single();
    if (!prof || prof.role !== "trainer") return json({ error: "nur Trainer duerfen senden" }, 403);

    await vapid(admin);
    const body = await req.json().catch(() => ({}));
    const audience = body.audience || "parents"; // parents | trainers | all
    const payload = {
      title: (body.title || "SV Adler Dellbrueck U9").toString().slice(0, 120),
      body: (body.body || "").toString().slice(0, 400),
      url: (body.url || "./").toString(),
      tag: (body.tag || "adler").toString(),
    };

    let q = admin.from("push_subscriptions").select("endpoint,p256dh,auth,rolle");
    if (audience === "parents") q = q.eq("rolle", "parent");
    else if (audience === "trainers") q = q.eq("rolle", "trainer");
    const { data: subs } = await q;

    let sent = 0;
    const gone: string[] = [];
    for (const s of subs || []) {
      const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(sub as any, JSON.stringify(payload));
        sent++;
      } catch (err: any) {
        const code = err?.statusCode;
        // v643: 403 heißt, das Abo gehört zu einem alten Schlüssel – es wird nie wieder zugestellt.
        if (code === 404 || code === 410 || code === 403) gone.push(s.endpoint);
      }
    }
    if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
    return json({ ok: true, sent, removed: gone.length, total: (subs || []).length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
