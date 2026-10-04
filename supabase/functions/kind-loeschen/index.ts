/* Edge Function kind-loeschen — v644: Trainer löscht alle Daten eines Kindes mit einem Klick,
   meist auf Antrag der Eltern (Tabelle loeschantrag).

   Die Datenbank erledigt kind_daten_loeschen (nur service_role): Einschätzungen und Quiz weg,
   Spielgeschehen und Pläne mit „Ehemaliges Kind“ statt Namen, dann der Kader-Eintrag – alles
   mit Fremdschlüssel auf ihn fällt per CASCADE mit. Hier dazu, was die Datenbank nicht kann:
   das Spielerfoto und die Sprach-Lobe im Speicher und die anonymen Konten der Kindergeräte. */
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
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Bitte anmelden" }, 401);
    const { data: prof } = await admin.from("profiles").select("role").eq("id", uid).single();
    if (!prof || prof.role !== "trainer") return json({ error: "Nur das Trainerteam darf Kinder löschen" }, 403);

    const body = await req.json().catch(() => ({}));
    const id = Number(body.spieler_id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "Kind fehlt" }, 400);

    // Vor dem Löschen einsammeln, was außerhalb der Tabellen liegt
    const { data: kd } = await admin.from("kader").select("id,foto_path").eq("id", id).maybeSingle();
    if (!kd) return json({ error: "Kind nicht gefunden – vielleicht schon gelöscht" }, 404);
    const { data: lobe } = await admin.from("kabine_lob").select("path").eq("spieler_id", id);
    const { data: konten } = await admin.from("kind_konto").select("uid").eq("spieler_id", id);
    // v743: Fotoalbum – die Zeilen gehen mit dem Kind, die Dateien nicht von selbst
    const { data: album } = await admin.from("kind_foto").select("pfad").eq("spieler_id", id);

    const { data: erg, error } = await admin.rpc("kind_daten_loeschen", { p_spieler_id: id, p_trainer: uid });
    if (error || erg?.fehler) return json({ error: error?.message || erg?.fehler }, 500);

    let dateien = 0, geraete = 0;
    if (kd.foto_path) { const r = await admin.storage.from("spielerfotos").remove([kd.foto_path]); if (!r.error) dateien += r.data?.length || 0; }
    const albumPfade = (album || []).map((a: any) => a.pfad).filter(Boolean);
    if (albumPfade.length) { const r = await admin.storage.from("spielerfotos").remove(albumPfade); if (!r.error) dateien += r.data?.length || 0; }
    const pfade = (lobe || []).map((l: any) => l.path).filter(Boolean);
    if (pfade.length) { const r = await admin.storage.from("kabine-lob").remove(pfade); if (!r.error) dateien += r.data?.length || 0; }
    for (const k of konten || []) { const r = await admin.auth.admin.deleteUser((k as any).uid); if (!r.error) geraete++; }

    return json({ ok: true, ...erg, dateien, kindergeraete: geraete });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
