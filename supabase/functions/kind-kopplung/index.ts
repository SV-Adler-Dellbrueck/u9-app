/* Edge Function kind-kopplung — ein Kindergeraet an ein Kind binden
   Auftragspaket: doku/auftrag-kinder-app/Auftragspaket_Kinder-App.md, Schritt 3

   Ablauf in zwei Haenden:
     1. Die Eltern erzeugen in IHRER App einen sechsstelligen Code. Gespeichert wird nur
        dessen SHA-256 in kind_kopplung (RLS: is_parent_of) - der Code selbst steht auf
        dem Bildschirm der Eltern und nirgends sonst.
     2. Das Geraet des Kindes meldet sich anonym an und schickt den Code hierher. Diese
        Funktion loest ihn ein und schreibt kind_konto.

   Warum eine Edge Function und nicht die App: Zum Einloesen muss eine Zeile gelesen
   werden, die dem Kind nicht gehoert (kind_kopplung der Eltern). Mit dem Dienstschluessel
   geht das, ohne die RLS dafuer aufzuweichen - und der Schluessel bleibt hier, wo ihn
   niemand sieht.

   Drei Regeln, die hier und nicht im Client stehen, weil ein Client sie umgehen kann:
     - Nur ANONYME Sitzungen duerfen koppeln. Ein angemeldetes Elternteil, das den Code
       in die eigene App tippt, wuerde sich sonst selbst zum Kindergeraet machen und
       damit Rechte VERLIEREN, ohne es zu merken.
     - Hoechstens fuenf Fehlversuche je Geraet und Stunde. Ein sechsstelliger Code hat
       eine Million Moeglichkeiten; ohne Deckel waere er in Stunden geraten.
     - Ein abgelaufener oder schon eingeloester Code ist verbraucht, auch wenn er stimmt.

   Geheimnisse stehen ausschliesslich in den Secrets (CLAUDE.md): SUPABASE_SERVICE_ROLE_KEY
   und SUPABASE_ANON_KEY setzt die Plattform selbst, hier steht keiner. */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const VERSUCHE_MAX = 5;          // je Geraet und Stunde
const CODE_LAENGE = 6;

/* Derselbe Hash wie hashPin() in boot.js: SHA-256, hex, klein. Die Eltern-App bildet ihn
   im Browser; haetten beide Seiten verschiedene Verfahren, passte nie ein Code. */
async function hashe(code: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j({ ok: false, fehler: "nur POST" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    if (!auth.toLowerCase().startsWith("bearer ")) return j({ ok: false, fehler: "nicht angemeldet" }, 401);

    // Wer ruft? Mit dem Ausweis des Aufrufers pruefen, nicht mit dem Dienstschluessel.
    const alsNutzer = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: uData, error: uErr } = await alsNutzer.auth.getUser();
    const user = uData?.user;
    if (uErr || !user) return j({ ok: false, fehler: "nicht angemeldet" }, 401);
    if (user.is_anonymous !== true) {
      return j({ ok: false, fehler: "Dieses Gerät ist bereits mit einem Konto angemeldet. Die Kabine für Kinder braucht ein eigenes Gerät." }, 403);
    }

    const svc = createClient(url, svcKey);

    // Schon gekoppelt? Dann ist der Aufruf ein Neustart der App, kein zweiter Versuch.
    const { data: vorhanden } = await svc.from("kind_konto")
      .select("spieler_id, tageslimit_min, aktiv").eq("uid", user.id).maybeSingle();
    if (vorhanden?.aktiv) return await status(svc, user.id);

    let body: { code?: string } = {};
    try { body = await req.json(); } catch (_) { /* leerer Rumpf faellt unten durch */ }
    const code = String(body.code || "").replace(/\D+/g, "");
    if (code.length !== CODE_LAENGE) return j({ ok: false, fehler: "Der Code hat sechs Ziffern." }, 400);

    // Deckel gegen Durchprobieren
    const seitEinerStunde = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await svc.from("kind_kopplung_versuch")
      .select("uid", { count: "exact", head: true })
      .eq("uid", user.id).gte("ts", seitEinerStunde);
    if ((count || 0) >= VERSUCHE_MAX) {
      return j({ ok: false, fehler: "Zu viele Versuche. Bitte in einer Stunde noch einmal." }, 429);
    }

    const hash = await hashe(code);
    const { data: zeile } = await svc.from("kind_kopplung")
      .select("id, spieler_id, erstellt_von")
      .eq("code_hash", hash).is("eingeloest_am", null).gt("gueltig_bis", new Date().toISOString())
      .order("id", { ascending: false }).limit(1).maybeSingle();

    if (!zeile) {
      await svc.from("kind_kopplung_versuch").insert({ uid: user.id });
      return j({ ok: false, fehler: "Der Code stimmt nicht oder ist abgelaufen. Die Eltern können einen neuen erzeugen." }, 400);
    }

    const { error: kErr } = await svc.from("kind_konto").upsert({
      uid: user.id, spieler_id: zeile.spieler_id, aktiv: true,
      gekoppelt_von: zeile.erstellt_von, gekoppelt_am: new Date().toISOString(),
    }, { onConflict: "uid" });
    if (kErr) return j({ ok: false, fehler: "Das Koppeln hat nicht geklappt." }, 500);

    await svc.from("kind_kopplung").update({ eingeloest_am: new Date().toISOString() }).eq("id", zeile.id);
    return await status(svc, user.id);
  } catch (e) {
    return j({ ok: false, fehler: String((e as Error)?.message || e) }, 500);
  }
});

/* Antwort nach dem Koppeln - dieselben Felder wie kind_status() in der Datenbank, damit
   die App nur eine Form kennt. Gerechnet wird mit dem Berliner Tag, wie dort auch. */
async function status(svc: ReturnType<typeof createClient>, uid: string) {
  const { data: k } = await svc.from("kind_konto")
    .select("spieler_id, geraet, tageslimit_min").eq("uid", uid).maybeSingle();
  if (!k) return j({ ok: false }, 404);
  const { data: kind } = await svc.from("kader").select("name, nr, tw").eq("id", k.spieler_id).maybeSingle();
  /* Der Berliner Tag, nicht der UTC-Tag und kein Handstand mit festen Stunden: im Winter
     ist der Abstand eine Stunde, im Sommer zwei. "sv-SE" liefert ihn als JJJJ-MM-TT. */
  const tag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
  const { data: s } = await svc.from("kind_sitzung").select("minuten").eq("uid", uid).eq("datum", tag).maybeSingle();
  const verbraucht = s?.minuten || 0;
  return j({
    ok: true, spieler_id: k.spieler_id, name: kind?.name || null, nr: kind?.nr ?? null, tw: !!kind?.tw,
    geraet: k.geraet || null, limit_min: k.tageslimit_min,
    rest_min: Math.max(0, (k.tageslimit_min || 0) - verbraucht),
  });
}
