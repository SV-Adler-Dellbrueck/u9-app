/* Edge Function push-cron — täglicher Lauf (pg_cron „push-reminders-daily“, 15:00 UTC):
   Zusage-Erinnerung für morgen samt Wetterwarnung, Helfer-Vorabend-Push und die
   48-Stunden-Erinnerungen.
   v705: beachtet die Ruhezeit je Empfänger (push_ruhende, Warteschlange).

   NIE von Hand mit dem echten Cron-Schlüssel aufrufen – das verdoppelt die Mitteilungen an
   die Eltern (CLAUDE.md).

   v643: Cron-Schlüssel und VAPID-Schlüssel kommen aus dem Supabase Vault (RPC adler_geheimnis,
   nur service_role). Der Cron-Job liest den Cron-Schlüssel selbst aus dem Vault. */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function geheimnis(admin: any, name: string): Promise<string> {
  const { data, error } = await admin.rpc("adler_geheimnis", { p_name: name });
  if (error || !data) throw new Error("Schlüssel " + name + " fehlt im Vault");
  return data as string;
}

// L4: Wetter-Check fuer morgen am Vereinsgelaende (Koeln-Dellbrueck) via Open-Meteo.
// Liefert einen Warn-Zusatz bei Gewitter oder hoher Regenwahrscheinlichkeit.
async function wetterWarnung(datum: string): Promise<string> {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=50.985&longitude=7.065&daily=precipitation_probability_max,weathercode&timezone=Europe%2FBerlin&start_date=${datum}&end_date=${datum}`;
    const r = await fetch(u); if (!r.ok) return "";
    const d = await r.json();
    const prob = d?.daily?.precipitation_probability_max?.[0];
    const code = d?.daily?.weathercode?.[0];
    if (code >= 95) return " ⛈️ Gewitter angesagt – bitte morgen die Platz-Ampel in der App beachten.";
    if (typeof prob === "number" && prob >= 70) return " 🌧️ Regenwahrscheinlichkeit " + prob + "% – bitte morgen die Platz-Ampel in der App beachten.";
  } catch (_e) { /* Wetter ist Komfort, kein Muss */ }
  return "";
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let cron = "";
  try { cron = await geheimnis(admin, "adler_cron_secret"); } catch (_e) { return json({ error: "forbidden" }, 403); }
  if (req.headers.get("x-cron-secret") !== cron) return json({ error: "forbidden" }, 403);
  try {
    webpush.setVapidDetails("mailto:trainer@adler-dellbrueck.de",
      await geheimnis(admin, "adler_vapid_public"), await geheimnis(admin, "adler_vapid_private"));
    const t = new Date(); t.setDate(t.getDate() + 1);
    const morgen = t.toISOString().slice(0, 10);
    const { data: termine } = await admin.from("termine").select("id,typ,titel,gegner,uhrzeit").in("typ", ["training", "spiel", "turnier"]).eq("datum", morgen).order("uhrzeit", { ascending: true });
    const { data: subs } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth,user_id,rolle");
    const gone: string[] = [];
    /* v705: Wer gerade Ruhezeit hat (push_ruhezeit; Eltern ohne eigene Wahl 21:30–7), bekommt die
       Meldung später – sie wartet in push_warteschlange, rufe-push schickt sie danach. */
    const subIds = [...new Set((subs || []).map((x: any) => x.user_id).filter(Boolean))];
    const { data: rh } = subIds.length ? await admin.rpc("push_ruhende", { p_users: subIds }) : { data: [] };
    const ruht = new Set(((rh || []) as any[]).map((x: any) => x.user_id));
    let wartet = 0;
    const send = async (sub: any, payload: any) => {
      if (ruht.has(sub.user_id)) {
        await admin.from("push_warteschlange").upsert({ user_id: sub.user_id, tag: String(payload.tag || "adler"), payload, erstellt_am: new Date().toISOString() }, { onConflict: "user_id,tag" });
        wartet++; return false;
      }
      try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any, JSON.stringify(payload)); return true; }
      catch (e: any) { const c = e?.statusCode; if (c === 404 || c === 410 || c === 403) gone.push(sub.endpoint); return false; }
    };

    // Familien-Zuordnung einmal laden (Teil 1 und Teil 3 brauchen sie)
    const { data: ek } = await admin.from("eltern_kinder").select("email,spieler_id");
    const emailKids: Record<string, number[]> = {};
    for (const row of ek || []) { const e = (row.email || "").toLowerCase(); (emailKids[e] = emailKids[e] || []).push(row.spieler_id); }
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const uidEmail: Record<string, string> = {};
    for (const u of userList?.users || []) uidEmail[u.id] = (u.email || "").toLowerCase();

    // Nicht-Antworter-Push fuer EINEN Termin (nur Eltern mit offenem Kind)
    const pushOffene = async (terminId: number, payload: any) => {
      const { data: rm } = await admin.from("rueckmeldungen").select("spieler_id").eq("termin_id", terminId);
      const responded = new Set((rm || []).map((r: any) => r.spieler_id));
      let n = 0;
      for (const s of subs || []) {
        if ((s as any).rolle !== "parent") continue;
        const email = uidEmail[(s as any).user_id];
        const kids = email ? emailKids[email] : null;
        if (!kids || !kids.length) continue;
        if (!kids.some((id) => !responded.has(id))) continue;
        if (await send(s, payload)) n++;
      }
      return n;
    };

    let sent = 0, skipped = 0, helferSent = 0;
    if (termine && termine.length) {
      // ── Teil 1: RSVP-Erinnerung fuer den ersten Termin morgen (+ Wetter-Warnung, L4) ──
      const t0: any = termine[0];
      const meta: Record<string, string> = { training: "🏃 Training", spiel: "⚽ Spiel", turnier: "🏆 Turnier" };
      const label = meta[t0.typ] || "Termin";
      const zeit = t0.uhrzeit ? " um " + String(t0.uhrzeit).slice(0, 5) + " Uhr" : "";
      const wetter = await wetterWarnung(morgen);
      sent = await pushOffene(t0.id, {
        title: "🦅 Morgen: " + label,
        body: `${t0.titel || t0.gegner || label}${zeit} – bitte noch kurz zu- oder absagen.${wetter}`,
        url: "./eltern/?rsvp=" + t0.id,
        tag: "reminder",
      });

      // ── Teil 2 (K3): Helfer-Vorabend-Push ──
      const tids = termine.map((x: any) => x.id);
      const { data: helfer } = await admin.from("event_helfer").select("user_id,aufgabe,termin_id").in("termin_id", tids);
      if (helfer && helfer.length) {
        const byUser: Record<string, any[]> = {};
        for (const h of helfer) { if (h.user_id) (byUser[h.user_id] = byUser[h.user_id] || []).push(h); }
        const terminById: Record<number, any> = {}; for (const x of termine) terminById[(x as any).id] = x;
        for (const s of subs || []) {
          const rows = byUser[(s as any).user_id];
          if (!rows || !rows.length) continue;
          const h0 = rows[0]; const tx = terminById[h0.termin_id] || {};
          const aufgaben = [...new Set(rows.map((r: any) => r.aufgabe))].join(" & ");
          const hp = {
            title: "🙌 Morgen bist du dran",
            body: `${aufgaben} bei ${tx.titel || tx.gegner || "unserem Termin"} – danke, dass du hilfst!`,
            url: "./eltern/",
            tag: "helfer",
          };
          if (await send(s, hp)) helferSent++;
        }
      }
    }

    // ── Teil 3 (Spond-Muster): Auto-Reminder-Zeitschiene, je Termin genau EINMAL pro Art ──
    // vor48: Termin ist in 2 Tagen und Familien haben noch nicht geantwortet.
    // nach48: Termin wurde vor >=48 h angelegt (liegt noch in der Zukunft) und es fehlen Antworten.
    // Dedup ueber rsvp_reminder_log (PK termin_id+art) – der Cron darf beliebig oft laufen.
    let auto48 = 0;
    const heute = new Date().toISOString().slice(0, 10);
    const in2 = new Date(); in2.setDate(in2.getDate() + 2);
    const uebermorgen = in2.toISOString().slice(0, 10);
    const cut48 = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: kandV } = await admin.from("termine").select("id,typ,titel,gegner,uhrzeit,datum").in("typ", ["training", "spiel", "turnier"]).eq("datum", uebermorgen);
    const { data: kandN } = await admin.from("termine").select("id,typ,titel,gegner,uhrzeit,datum,created_at").in("typ", ["spiel", "turnier"]).gt("datum", heute).lte("created_at", cut48).order("datum").limit(10);
    const { data: logRows } = await admin.from("rsvp_reminder_log").select("termin_id,art");
    const logged = new Set((logRows || []).map((r: any) => r.termin_id + "|" + r.art));
    const metaT: Record<string, string> = { training: "🏃 Training", spiel: "⚽ Spiel", turnier: "🏆 Turnier" };
    const arbeit: Array<{ t: any; art: string; titel: string }> = [];
    for (const x of kandV || []) if (!logged.has((x as any).id + "|vor48")) arbeit.push({ t: x, art: "vor48", titel: "⏳ Übermorgen: " });
    for (const x of kandN || []) if (!logged.has((x as any).id + "|nach48")) arbeit.push({ t: x, art: "nach48", titel: "📬 Bitte rückmelden: " });
    for (const a of arbeit.slice(0, 4)) { // Deckel pro Lauf gegen Push-Fluten
      const tx: any = a.t;
      const lbl = metaT[tx.typ] || "Termin";
      const zeit = tx.uhrzeit ? " um " + String(tx.uhrzeit).slice(0, 5) + " Uhr" : "";
      const dat = new Date(tx.datum + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
      const n = await pushOffene(tx.id, {
        title: a.titel + lbl,
        body: `${tx.titel || tx.gegner || lbl} am ${dat}${zeit} – eine kurze Zu- oder Absage hilft bei der Planung.`,
        url: "./eltern/?rsvp=" + tx.id,
        tag: "reminder",
      });
      auto48 += n;
      // Auch bei 0 Empfaengern loggen: alle haben geantwortet -> Reminder ist erledigt.
      await admin.from("rsvp_reminder_log").upsert({ termin_id: tx.id, art: a.art }, { onConflict: "termin_id,art" });
    }

    if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
    return json({ ok: true, sent, skipped_answered: skipped, helfer: helferSent, auto48, wartet, removed: gone.length });
  } catch (e) { return json({ error: String(e) }, 500); }
});
