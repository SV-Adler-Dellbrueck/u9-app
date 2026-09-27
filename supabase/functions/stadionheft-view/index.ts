import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// DSGVO: Nachname zu Initiale ("Max Mustermann" -> "Max M."). Einzelnamen bleiben.
function maskName(name: string): string {
  const p = String(name || "").trim().split(/\s+/);
  if (p.length < 2) return p[0] || "";
  return p[0] + " " + (p[p.length - 1].charAt(0).toUpperCase()) + ".";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svc = createClient(url, svcKey);

    let team = "adler1";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.team) team = String(body.team).slice(0, 40);
    }

    // 1) Nur ein VERÖFFENTLICHTES Heft ausliefern.
    const { data: heftRow } = await svc.from("stadionheft").select("*").eq("team", team).eq("published", true).maybeSingle();
    if (!heftRow) return j({ published: false });

    // 2) Aktiver Kader (service_role, RLS-bypass) – nur Minimaldaten.
    const { data: kader } = await svc.from("kader")
      .select("id,name,nr,geb,lieblingsposition,tw,foto_path,foto_stadionheft_ok,aktiv")
      .order("nr", { ascending: true, nullsFirst: false });
    const active = (kader || []).filter((k: any) => k.aktiv !== false);

    // 3) Spitznamen (opt-in Fanfacts).
    const { data: ff } = await svc.from("kind_fanfacts").select("spieler_id,spitzname");
    const spitz: Record<string, string> = {};
    (ff || []).forEach((f: any) => { if (f.spitzname) spitz[String(f.spieler_id)] = f.spitzname; });

    // 4) Signierte Foto-URL NUR bei ausdrücklicher Einwilligung fürs digitale Heft.
    async function signed(k: any): Promise<string | null> {
      if (!k.foto_stadionheft_ok || !k.foto_path) return null;
      try {
        const { data } = await svc.storage.from("spielerfotos").createSignedUrl(k.foto_path, 3600);
        const s = data?.signedUrl || "";
        if (!s) return null;
        return s.startsWith("http") ? s : url + s;
      } catch { return null; }
    }

    // v636: Jahrgang (nie das Geburtsdatum) nur mit derselben Freigabe „öffentlich“ wie das Foto.
    function jahrgang(k: any): string | null {
      if (!k.foto_stadionheft_ok) return null;
      const j = String(k.geb || "").slice(0, 4);
      return /^\d{4}$/.test(j) ? j : null;
    }

    const spieler = await Promise.all(active.map(async (k: any) => ({
      name: maskName(k.name),
      nr: k.nr ?? null,
      lieblingsposition: k.lieblingsposition || "",
      tw: !!k.tw,
      spitzname: spitz[String(k.id)] || "",
      foto_url: await signed(k),
      jahrgang: jahrgang(k),
    })));

    // 5) Fokus-Spieler auflösen (ebenfalls maskiert + consent-gated Foto).
    let fokus: any = null;
    if (heftRow.fokus_spieler_id != null) {
      const fk = active.find((k: any) => String(k.id) === String(heftRow.fokus_spieler_id));
      if (fk) fokus = { name: maskName(fk.name), nr: fk.nr ?? null, foto_url: await signed(fk), jahrgang: jahrgang(fk), text: heftRow.fokus_text || "" };
    }

    return j({
      published: true,
      heft: {
        titel: heftRow.titel || "Stadionheft U9",
        einleitung: heftRow.einleitung || "",
        kommentar: heftRow.kommentar || "",
        fokus,
        updated_at: heftRow.updated_at,
      },
      spieler,
    });
  } catch (_e) {
    return j({ error: "Serverfehler beim Stadionheft." }, 500);
  }
});
