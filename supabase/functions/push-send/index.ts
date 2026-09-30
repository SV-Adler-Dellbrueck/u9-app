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
    const body = await req.json().catch(() => ({}));

    /* v695: Test-Meldung an das EIGENE Gerät. Darf jede angemeldete Person (Trainer und Eltern),
       geht aber nur an Abos dieses Kontos – mit Endpunkt nur an genau dieses Gerät – und hat
       einen festen Text. Damit kann niemand anderen etwas schicken. */
    if (body.art === "test") {
      let q = admin.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", uid);
      if (body.endpoint) q = q.eq("endpoint", String(body.endpoint));
      const { data: subs } = await q;
      if (!subs || !subs.length) return json({ error: "Auf diesem Gerät sind keine Benachrichtigungen angemeldet." }, 404);
      await vapid(admin);
      // v696: Ziel ist die App, aus der der Test kam – nur die drei Einstiege sind erlaubt
      const ziel = /^\.\/(eltern|trainer|kinder)\/$/.test(String(body.url || "")) ? String(body.url) : "./";
      const payload = { title: "🔔 Test-Benachrichtigung", body: "Es klappt – so kommen Meldungen vom Team auf dieses Handy.", url: ziel, tag: "adler-test" };
      let sent = 0; const gone: string[] = [];
      for (const s of subs) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, JSON.stringify(payload)); sent++; }
        catch (err: any) { const c = err?.statusCode; if (c === 404 || c === 410 || c === 403) gone.push(s.endpoint); }
      }
      if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
      if (!sent) return json({ error: "Das Gerät ist nicht mehr erreichbar – bitte Benachrichtigungen aus- und wieder einschalten.", removed: gone.length }, 410);
      return json({ ok: true, sent });
    }

    /* v664: Erinnerung der Kasse. Darf das Trainerteam und wer in kasse_team steht. Der Text
       ist fest, die Empfaenger ergeben sich aus der Datenbank (Familien mit offener Umlage) –
       die Kasse kann damit keine beliebige Mitteilung an alle schicken. Hoechstens einmal
       in 20 Stunden (team_config.kasse_erinnert_am). */
    if (body.art === "kasse_erinnerung") {
      const email = (userData?.user?.email || "").toLowerCase();
      let darf = prof?.role === "trainer";
      if (!darf && email) {
        const { data: kt } = await admin.from("kasse_team").select("email").eq("email", email).maybeSingle();
        darf = !!kt;
      }
      if (!darf) return json({ error: "Nur die Kasse darf erinnern." }, 403);
      const { data: tc } = await admin.from("team_config").select("kasse_erinnert_am").eq("id", 1).maybeSingle();
      const zuletzt = tc?.kasse_erinnert_am ? new Date(tc.kasse_erinnert_am).getTime() : 0;
      if (Date.now() - zuletzt < 20 * 3600 * 1000) return json({ error: "Heute wurde schon erinnert – morgen wieder." }, 429);

      const { data: umlagen } = await admin.from("kasse_umlagen").select("id").eq("aktiv", true);
      const { data: kinder } = await admin.from("kader").select("id").or("aktiv.is.null,aktiv.eq.true");
      const { data: zahl } = await admin.from("kasse_zahlung").select("umlage_id,spieler_id");
      const bezahlt = new Set((zahl || []).map((z: any) => z.umlage_id + "_" + z.spieler_id));
      const offen = (kinder || []).filter((k: any) => (umlagen || []).some((u: any) => !bezahlt.has(u.id + "_" + k.id))).map((k: any) => k.id);
      if (!offen.length) return json({ ok: true, familien: 0, sent: 0 });
      const { data: ek } = await admin.from("eltern_kinder").select("email,spieler_id").in("spieler_id", offen);
      const mails = [...new Set((ek || []).map((x: any) => String(x.email || "").toLowerCase()).filter(Boolean))];
      const familien = new Set((ek || []).map((x: any) => x.spieler_id)).size;
      const { data: profs } = mails.length ? await admin.from("profiles").select("id").in("email", mails) : { data: [] };
      const ids = (profs || []).map((p: any) => p.id);
      await admin.from("team_config").upsert({ id: 1, kasse_erinnert_am: new Date().toISOString() }, { onConflict: "id" });
      if (!ids.length) return json({ ok: true, familien, sent: 0 });
      await vapid(admin);
      const payload = { title: "💰 Mannschaftskasse", body: "Bei euch ist noch ein Beitrag offen. Details im Eltern-Bereich unter „Mehr vom Team“.", url: "./?portal", tag: "adler-kasse" };
      const { data: subs } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth").in("user_id", ids);
      let sent = 0; const gone: string[] = [];
      for (const s of subs || []) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, JSON.stringify(payload)); sent++; }
        catch (err: any) { const c = err?.statusCode; if (c === 404 || c === 410 || c === 403) gone.push(s.endpoint); }
      }
      if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
      return json({ ok: true, familien, sent });
    }

    /* v702 (Version 6): Erinnerung an die Familien, deren Kind für DIESEN Termin noch keine
       Rückmeldung hat. Vorher schickte der Knopf „Als Push“ über den allgemeinen Weg an alle
       Eltern – auch an die, die längst geantwortet hatten. Empfänger ergeben sich aus der
       Datenbank, der Text ist fest; senden darf nur das Trainerteam. */
    if (body.art === "rsvp_offen") {
      if (!prof || prof.role !== "trainer") return json({ error: "nur Trainer duerfen erinnern" }, 403);
      const tid = Number(body.termin_id);
      if (!Number.isFinite(tid) || tid <= 0) return json({ error: "Termin fehlt" }, 400);
      const { data: t } = await admin.from("termine").select("id,typ,titel,gegner,datum,uhrzeit").eq("id", tid).maybeSingle();
      if (!t) return json({ error: "Termin nicht gefunden" }, 404);
      const { data: kinder } = await admin.from("kader").select("id").or("aktiv.is.null,aktiv.eq.true");
      const { data: rm } = await admin.from("rueckmeldungen").select("spieler_id").eq("termin_id", tid);
      const geantwortet = new Set((rm || []).map((x: any) => x.spieler_id));
      const offen = (kinder || []).map((k: any) => k.id).filter((id: number) => !geantwortet.has(id));
      if (!offen.length) return json({ ok: true, familien: 0, sent: 0 });
      const { data: ek } = await admin.from("eltern_kinder").select("email,spieler_id").in("spieler_id", offen);
      const mails = [...new Set((ek || []).map((x: any) => String(x.email || "").toLowerCase()).filter(Boolean))];
      const familien = new Set((ek || []).map((x: any) => x.spieler_id)).size;
      const { data: profs } = mails.length ? await admin.from("profiles").select("id").in("email", mails) : { data: [] };
      const ids = (profs || []).map((p: any) => p.id);
      if (!ids.length) return json({ ok: true, familien, sent: 0 });
      await vapid(admin);
      const art: Record<string, string> = { training: "Training", spiel: "Spiel", turnier: "Festival" };
      const was = t.titel || t.gegner || art[t.typ] || "Termin";
      const dat = new Date(t.datum + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
      const zeit = t.uhrzeit ? " um " + String(t.uhrzeit).slice(0, 5) + " Uhr" : "";
      const payload = { title: "📬 Bitte kurz rückmelden", body: `${was} am ${dat}${zeit} – eine kurze Zu- oder Absage hilft bei der Planung.`, url: "./eltern/?rsvp=" + tid, tag: "reminder" };
      const { data: subs } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth").in("user_id", ids);
      let sent = 0; const gone: string[] = [];
      for (const s of subs || []) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, JSON.stringify(payload)); sent++; }
        catch (err: any) { const c = err?.statusCode; if (c === 404 || c === 410 || c === 403) gone.push(s.endpoint); }
      }
      if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
      return json({ ok: true, familien, offen: offen.length, sent });
    }

    if (!prof || prof.role !== "trainer") return json({ error: "nur Trainer duerfen senden" }, 403);

    await vapid(admin);
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
