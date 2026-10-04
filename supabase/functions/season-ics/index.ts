/* Edge Function season-ics — Kalender-Abo der Saison (webcal, ohne Anmeldung, verify_jwt aus).
   Version 1 lag nur deployt vor; v741 legt den Code ins Repo und ändert zweierlei:
   - Abgesagte Termine (platz_status „abgesagt“) stehen als STATUS:CANCELLED mit „Fällt aus“ im Titel und dem
     Grund in der Beschreibung – vorher erschienen sie im abonnierten Kalender wie ein normaler Termin.
   - Trainermeetings fehlen im Abo. Sie sehen nur Trainer (Termin-Fenster: „Diesen Termin sehen nur Trainer“);
     vorher standen sie mit Titel im öffentlich abrufbaren Kalender.
   Dazu die echte Endzeit (uhrzeit_ende) statt pauschal 90 Minuten, wie im Export der Eltern-App (v729). */
import { createClient } from "npm:@supabase/supabase-js@2";
const pad = (n: any) => String(n).padStart(2, "0");
function icsEscape(s: any) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
function dtStart(datum: string, time: string) { const m = (time || "17:00").match(/(\d{1,2}):(\d{2})/) || ["", "17", "00"]; return datum.replace(/-/g, "") + "T" + pad(m[1]) + m[2] + "00"; }
function dtPlus(datum: string, time: string, addMin: number) { const m = (time || "17:00").match(/(\d{1,2}):(\d{2})/) || ["", "17", "00"]; const d = new Date(datum + "T" + pad(m[1]) + ":" + m[2] + ":00"); d.setMinutes(d.getMinutes() + addMin); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`; }

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("termine").select("id,datum,uhrzeit,uhrzeit_ende,typ,titel,gegner,ort,platz,platz_status,platz_status_note")
    .gte("datum", today).neq("typ", "trainermeeting").order("datum", { ascending: true });
  const TM: Record<string, string> = { training: "Training", spiel: "Spiel", turnier: "Turnier", event: "Event" };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SV Adler Dellbrueck//U9//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:SV Adler U9 Termine", "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"];
  for (const t of (data || [])) {
    if (t.typ === "trainermeeting") continue;
    const time = (t.uhrzeit ? String(t.uhrzeit).slice(0, 5) : "") || "17:00";
    const ende = t.uhrzeit && t.uhrzeit_ende && String(t.uhrzeit_ende) > String(t.uhrzeit) ? dtStart(t.datum, String(t.uhrzeit_ende).slice(0, 5)) : dtPlus(t.datum, time, 90);
    const lbl = TM[t.typ] || "Termin";
    const aus = t.platz_status === "abgesagt";
    lines.push("BEGIN:VEVENT", "UID:adler-" + t.id + "-" + t.datum + "@adler-u9", "DTSTAMP:" + stamp, "DTSTART:" + dtStart(t.datum, time), "DTEND:" + ende,
      "SUMMARY:" + icsEscape((aus ? "Fällt aus: " : "") + lbl + ": " + (t.titel || t.gegner || lbl)));
    if (aus) { lines.push("STATUS:CANCELLED"); if (t.platz_status_note) lines.push("DESCRIPTION:" + icsEscape("Fällt aus – " + t.platz_status_note)); }
    if (t.ort) lines.push("LOCATION:" + icsEscape(t.ort + (t.platz ? ", " + t.platz : "")));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } });
});
