// Adler-Archiv (L1): woechentlicher JSON-Dump aller Nutzdaten-Tabellen in den privaten
// backups-Bucket. Behaelt die letzten 10 Staende; aeltere werden geloescht.
// v5: Die Tabellenliste kommt aus der DB (RPC backup_tabellen) statt aus einer
// handgepflegten Konstante - die war auf 44 von 89 Tabellen veraltet und sicherte
// u. a. eigene Uebungen, DSGVO-Einwilligungen und den Kinder-Quizfortschritt NICHT.
// v643: Der Cron-Schluessel kommt aus dem Supabase Vault (RPC adler_geheimnis, nur
// service_role) statt aus einer Konstante im Code.
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

// Notfall-Liste, falls die RPC einmal nicht antwortet (Stand der frueheren Konstante).
const TABLES_FALLBACK = [
  "kader", "termine", "spielerprofile", "anwesenheit", "trainingsplan", "einheit_bewertung",
  "nominierungen", "aufstellungen", "match_actions", "rueckmeldungen", "punkte_log",
  "eltern_kinder", "kind_fanfacts", "foto_consent", "kind_notfall", "kind_pause",
  "entwicklungsziele", "album_kind", "album_fotos", "kabine_post", "kind_selbstbild",
  "kabine_reporter", "kind_stimmung", "ansagen", "kabinen_wahl", "kabinen_wahl_stimmen",
  "team_meilensteine", "eltern_leitfaden", "fairplay_regeln", "team_config", "gegner",
  "event_helfer", "event_mitbringen", "probekinder", "stadionheft", "trainer_poll",
  "trainer_poll_slot", "trainer_poll_vote", "eltern_poll", "eltern_poll_slot", "eltern_poll_vote",
  "abhol_info", "heimturnier", "trainingsgruppen", "trainingsformen", "dsgvo_consent",
  "quiz_progress", "kind_kontakte", "matchday", "einsatzzeiten", "taktik_templates"
];

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cron } = await admin.rpc("adler_geheimnis", { p_name: "adler_cron_secret" });
  if (!cron || req.headers.get("x-cron-secret") !== cron) return json({ error: "forbidden" }, 403);
  try {
    let tables: string[] = [];
    try {
      const { data, error } = await admin.rpc("backup_tabellen");
      if (!error && Array.isArray(data)) tables = data.map((x: any) => (typeof x === "string" ? x : x?.backup_tabellen)).filter(Boolean);
    } catch (_e) { /* Fallback unten */ }
    if (!tables.length) tables = TABLES_FALLBACK;

    const dump: Record<string, unknown> = { erstellt: new Date().toISOString(), quelle: tables.length === TABLES_FALLBACK.length ? "fallback" : "rpc", tabellen: {} as Record<string, unknown> };
    let zeilen = 0, fehler = 0;
    for (const t of tables) {
      try {
        // Grosse Tabellen seitenweise holen, damit nichts still abgeschnitten wird
        let von = 0; const alle: unknown[] = [];
        for (;;) {
          const { data, error } = await admin.from(t).select("*").range(von, von + 999);
          if (error) { (dump.tabellen as any)[t] = { fehler: error.message }; fehler++; break; }
          const teil = data || [];
          alle.push(...teil);
          if (teil.length < 1000) { (dump.tabellen as any)[t] = alle; zeilen += alle.length; break; }
          von += 1000;
          if (von > 50000) { (dump.tabellen as any)[t] = alle; zeilen += alle.length; break; } // harte Grenze
        }
      } catch (e) { (dump.tabellen as any)[t] = { fehler: String(e) }; fehler++; }
    }

    const name = `adler-${new Date().toISOString().slice(0, 10)}.json`;
    const body = new Blob([JSON.stringify(dump)], { type: "application/json" });
    const up = await admin.storage.from("backups").upload(name, body, { upsert: true, contentType: "application/json" });
    if (up.error) return json({ error: up.error.message }, 500);
    // Aufbewahrung: nur die 10 neuesten Staende behalten
    const { data: files } = await admin.storage.from("backups").list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
    const alte = (files || []).map((f) => f.name).filter((n) => n.startsWith("adler-")).slice(10);
    if (alte.length) await admin.storage.from("backups").remove(alte);
    return json({ ok: true, datei: name, tabellen: tables.length, zeilen, tabellen_mit_fehler: fehler, geloescht: alte.length });
  } catch (e) { return json({ error: String(e) }, 500); }
});
