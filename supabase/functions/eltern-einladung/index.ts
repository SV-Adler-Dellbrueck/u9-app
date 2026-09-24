/* Edge Function eltern-einladung — Zugang per Einladungskarte (v604)

   Der Trainer druckt je Kind eine Karte mit QR-Code. Die Eltern scannen sie, geben
   E-Mail und Passwort ein und sind angemeldet. In der Datenbank steht nur der SHA-256
   des Codes (eltern_einladung); der Code selbst steht auf dem Papier.

   Warum eine Edge Function: Das Konto wird mit dem Dienstschluessel angelegt und dabei
   gleich als bestaetigt markiert. So geht am Elternabend keine einzige E-Mail hinaus -
   der eingebaute Mailversand von Supabase ist fuer so etwas nicht gedacht. Und die
   Zuordnung zum Kind (eltern_kinder) darf sonst nur ein Trainer schreiben.

   Zwei Aktionen:
     pruefen   { code }                     -> { ok, vorname, frei }      verbraucht nichts
     einloesen { code, email, passwort }    -> { ok, neu | bestehend }

   Regeln, die hier stehen und nicht im Browser, weil ein Browser sie umgehen kann:
     - Eine Karte hat hoechstens max_nutzungen Einloesungen (zwei: beide Elternteile)
       und ein Ablaufdatum. Gezaehlt wird in EINER Anweisung in der Datenbank
       (eltern_einladung_nutzen), damit zwei gleichzeitige Scans nicht beide die letzte
       bekommen.
     - Ein bestehendes Konto bekommt NIE ein neues Passwort. Gibt es die Adresse schon,
       wird nur das Kind zugeordnet; anmelden muss man sich dann wie bisher. Sonst koennte
       jeder mit einer Karte das Passwort eines fremden Kontos setzen.
     - Wer schon angemeldet ist (Eltern-Sitzung), loest fuer das eigene Konto ein -
       E-Mail und Passwort aus dem Formular werden dann nicht gebraucht.

   Der Code hat 20 Zeichen aus 32 (100 Bit). Raten ist aussichtslos; ein Versuchsdeckel
   wie bei kind-kopplung (sechs Ziffern) ist hier nicht noetig.

   Geheimnisse stehen ausschliesslich in den Secrets (CLAUDE.md): SUPABASE_SERVICE_ROLE_KEY
   und SUPABASE_ANON_KEY setzt die Plattform selbst, hier steht keiner.
   Bereitstellen mit verify_jwt = false: Wer eine Karte einloest, hat noch kein Konto. */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const PASSWORT_MIN = 8;
const CODE_ZEICHEN = /^[A-Z2-9]{20}$/;   // dieselbe Form wie einladungCode() in views.js

/* Derselbe Hash wie im Browser des Trainers: SHA-256, hex, klein. */
async function hashe(code: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
/* Grossbuchstaben, ohne Leerzeichen und Striche - so darf man den Code auch abtippen. */
function normiere(code: unknown): string {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j({ ok: false, fehler: "nur POST" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: { aktion?: string; code?: string; email?: string; passwort?: string } = {};
    try { body = await req.json(); } catch (_) { /* leerer Rumpf faellt unten durch */ }

    const code = normiere(body.code);
    if (!CODE_ZEICHEN.test(code)) return j({ ok: false, fehler: "Diese Karte kennen wir nicht. Bitte den QR-Code noch einmal scannen." }, 400);
    const hash = await hashe(code);

    const { data: karte } = await svc.from("eltern_einladung")
      .select("spieler_id, nutzungen, max_nutzungen, gueltig_bis")
      .eq("code_hash", hash).maybeSingle();
    if (!karte) return j({ ok: false, fehler: "Diese Karte kennen wir nicht. Vielleicht wurde sie neu gedruckt – bitte beim Trainerteam nachfragen." }, 404);
    if (new Date(karte.gueltig_bis).getTime() <= Date.now()) {
      return j({ ok: false, fehler: "Diese Karte ist abgelaufen. Das Trainerteam druckt gern eine neue." }, 410);
    }
    const frei = Math.max(0, karte.max_nutzungen - karte.nutzungen);
    const { data: kind } = await svc.from("kader").select("name").eq("id", karte.spieler_id).maybeSingle();
    const vorname = String(kind?.name || "").trim() || null;   // wie im Kader, auch auf der Karte

    if (body.aktion === "pruefen") return j({ ok: true, vorname, frei });
    if (body.aktion !== "einloesen") return j({ ok: false, fehler: "unbekannte Aktion" }, 400);
    if (frei <= 0) return j({ ok: false, fehler: "Mit dieser Karte haben sich schon beide Elternteile angemeldet. Für weitere Konten bitte beim Trainerteam melden." }, 409);

    /* Schon angemeldet? Dann gilt das Konto der Sitzung. Der Ausweis wird mit dem
       Anon-Schluessel geprueft, nicht mit dem Dienstschluessel; ein anonymes Konto
       (Kinder-App) zaehlt nicht als angemeldet. */
    let email = "";
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^bearer\s+/i, "");
    if (token.split(".").length === 3) {
      const alsNutzer = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
      const { data: u } = await alsNutzer.auth.getUser();
      if (u?.user && u.user.is_anonymous !== true && u.user.email) email = u.user.email.toLowerCase();
    }
    const angemeldet = !!email;
    if (!angemeldet) {
      email = String(body.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return j({ ok: false, fehler: "Bitte eine gültige E-Mail-Adresse eingeben." }, 400);
    }

    const { data: vorhanden } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
    const passwort = String(body.passwort || "");
    if (!angemeldet && !vorhanden && passwort.length < PASSWORT_MIN) {
      return j({ ok: false, fehler: `Das Passwort braucht mindestens ${PASSWORT_MIN} Zeichen.` }, 400);
    }

    // Nutzung belegen - atomar, erst danach anlegen. Scheitert das Anlegen, gibt es sie zurueck.
    const { data: spielerId, error: nErr } = await svc.rpc("eltern_einladung_nutzen", { p_hash: hash });
    if (nErr || !spielerId) return j({ ok: false, fehler: "Mit dieser Karte haben sich schon beide Elternteile angemeldet." }, 409);

    let neu = false;
    if (!angemeldet && !vorhanden) {
      const { error: cErr } = await svc.auth.admin.createUser({ email, password: passwort, email_confirm: true });
      if (cErr) {
        const schonDa = /already|registered|exists/i.test(cErr.message || "");
        if (!schonDa) {
          await svc.rpc("eltern_einladung_zurueck", { p_hash: hash });
          const schwach = /password/i.test(cErr.message || "");
          return j({ ok: false, fehler: schwach ? "Dieses Passwort wird nicht angenommen. Bitte ein längeres wählen." : "Das Konto konnte nicht angelegt werden. Bitte gleich noch einmal versuchen." }, 400);
        }
      } else {
        neu = true;
      }
    }

    const { error: lErr } = await svc.from("eltern_kinder")
      .upsert({ spieler_id: spielerId, email, label: "Einladungskarte" }, { onConflict: "spieler_id,email", ignoreDuplicates: true });
    if (lErr) {
      await svc.rpc("eltern_einladung_zurueck", { p_hash: hash });
      return j({ ok: false, fehler: "Die Zuordnung zum Kind hat nicht geklappt. Bitte gleich noch einmal versuchen." }, 500);
    }

    return j({ ok: true, neu, bestehend: !neu && !angemeldet, angemeldet, vorname });
  } catch (e) {
    return j({ ok: false, fehler: String((e as Error)?.message || e) }, 500);
  }
});
