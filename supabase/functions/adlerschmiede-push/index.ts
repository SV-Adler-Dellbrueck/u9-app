/* Edge Function adlerschmiede-push — v717 (PO 02.10.): sonntags 18:00 (Köln) ein Push an die
   Eltern „Aus der Adlerschmiede“ mit den Eltern-Neuerungen der letzten sieben Tage.
   - Der Cron-Job „adler-adlerschmiede-sonntag“ ruft sonntags um 16 und 17 Uhr UTC; gesendet wird
     nur, wenn es in Europe/Berlin 18 Uhr ist – so stimmt die Zeit in Sommer- und Winterzeit.
   - Höchstens einmal je Woche (adlerschmiede_push_log, Schlüssel: Montag der Woche).
   - Ohne Einträge der letzten sieben Tage kein Push (kein Spam).
   - Nur Eltern-Abos; wer „Adlerschmiede“ abgeschaltet hat (adlerschmiede_push_aus), bekommt nichts;
     Ruhezeit wie push-cron (Warteschlange).

   NIE von Hand mit dem echten Cron-Schlüssel aufrufen (CLAUDE.md). Zum Prüfen: {"probe":true}
   schickt nichts und gibt nur zurück, was gesendet würde. */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function geheimnis(admin: any, name: string): Promise<string> {
  const { data, error } = await admin.rpc("adler_geheimnis", { p_name: name });
  if (error || !data) throw new Error("Schlüssel " + name + " fehlt im Vault");
  return data as string;
}

function berlin(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short", hour12: false });
  const t: Record<string, string> = {};
  for (const p of f.formatToParts(d)) t[p.type] = p.value;
  return { datum: `${t.year}-${t.month}-${t.day}`, stunde: Number(t.hour), tag: t.weekday };
}
function plusTage(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let cron = "";
  try { cron = await geheimnis(admin, "adler_cron_secret"); } catch (_e) { return json({ error: "forbidden" }, 403); }
  if (req.headers.get("x-cron-secret") !== cron) return json({ error: "forbidden" }, 403);
  let body: any = {}; try { body = await req.json(); } catch (_e) { /* leer */ }
  const probe = body && body.probe === true;
  try {
    const jetzt = berlin();
    if (!probe && (jetzt.tag !== "Sun" || jetzt.stunde !== 18)) return json({ ok: true, uebersprungen: "nicht Sonntag 18 Uhr in Köln", jetzt });
    const montag = plusTage(jetzt.datum, -6);   // Sonntag → Montag derselben Woche
    if (!probe) {
      const { data: log } = await admin.from("adlerschmiede_push_log").select("woche").eq("woche", montag);
      if (log && log.length) return json({ ok: true, uebersprungen: "diese Woche schon gesendet" });
    }
    const { data: neu } = await admin.from("adlerschmiede").select("datum,emoji,text").gte("datum", montag).lte("datum", jetzt.datum).order("datum", { ascending: false }).order("id", { ascending: false });
    const eintraege = (neu || []) as any[];
    if (!eintraege.length) {
      if (!probe) await admin.from("adlerschmiede_push_log").upsert({ woche: montag, eintraege: 0, empfaenger: 0 }, { onConflict: "woche" });
      return json({ ok: true, uebersprungen: "keine Neuerungen", woche: montag });
    }
    // Einträge haben die Form „Kurztitel: Erklärung“; der Push zeigt nur den Kurztitel.
    const kurz = (t: string) => { const s = String(t || "").split(":")[0].trim(); return s.length > 40 ? s.slice(0, 38) + "…" : s; };
    const payload = {
      title: "🛠️ Aus der Adlerschmiede",
      body: `${eintraege.length === 1 ? "Neu" : eintraege.length + " Neuerungen"} diese Woche: ${eintraege.slice(0, 2).map((e) => (e.emoji || "") + " " + kurz(e.text)).join(" · ")}${eintraege.length > 2 ? " + " + (eintraege.length - 2) + " weitere" : ""}`,
      url: "./eltern/#adlerschmiede",
      tag: "adlerschmiede",
    };
    const { data: subs } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth,user_id,rolle").eq("rolle", "parent");
    const { data: aus } = await admin.from("adlerschmiede_push_aus").select("user_id");
    const ohne = new Set(((aus || []) as any[]).map((x) => x.user_id));
    const ziel = ((subs || []) as any[]).filter((s) => !ohne.has(s.user_id));
    if (probe) return json({ ok: true, probe: true, woche: montag, eintraege: eintraege.length, empfaenger: ziel.length, payload });

    webpush.setVapidDetails("mailto:trainer@adler-dellbrueck.de", await geheimnis(admin, "adler_vapid_public"), await geheimnis(admin, "adler_vapid_private"));
    const ids = [...new Set(ziel.map((s) => s.user_id).filter(Boolean))];
    const { data: rh } = ids.length ? await admin.rpc("push_ruhende", { p_users: ids }) : { data: [] };
    const ruht = new Set(((rh || []) as any[]).map((x) => x.user_id));
    const gone: string[] = [], schon = new Set<string>();
    let gesendet = 0, wartet = 0;
    for (const s of ziel) {
      if (schon.has(s.endpoint)) continue; schon.add(s.endpoint);   // ein Handy, mehrere Konten: einmal
      if (ruht.has(s.user_id)) {
        await admin.from("push_warteschlange").upsert({ user_id: s.user_id, tag: "adlerschmiede", payload, erstellt_am: new Date().toISOString() }, { onConflict: "user_id,tag" });
        wartet++; continue;
      }
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, JSON.stringify(payload)); gesendet++; }
      catch (e: any) { const c = e?.statusCode; if (c === 404 || c === 410 || c === 403) gone.push(s.endpoint); }
    }
    if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
    await admin.from("adlerschmiede_push_log").upsert({ woche: montag, eintraege: eintraege.length, empfaenger: gesendet + wartet }, { onConflict: "woche" });
    return json({ ok: true, woche: montag, eintraege: eintraege.length, gesendet, wartet, entfernt: gone.length });
  } catch (e) { return json({ error: String(e) }, 500); }
});
