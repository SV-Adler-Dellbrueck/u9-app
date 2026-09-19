/* Edge Function ki-uebung — Adler-Coach (KI)
   Ab v410 liegt der Quelltext im Repo (vorher nur im Deployment), damit Änderungen
   im Pull Request lesbar sind. Geheimnisse stehen weiterhin ausschliesslich in den
   Secrets, nie hier.

   Zwei Betriebsarten:
     modus="idee"  – wie bisher: aus einer Beschreibung 1-3 Uebungen erfinden
     modus="text"  – PO v410, Stufe 1: einen eingefuegten Text (Webseite, WhatsApp,
                     Videobeschreibung) in GENAU EINE strukturierte Uebung ueberfuehren.
                     Hier wird nichts dazuerfunden - fehlt eine Angabe, bleibt sie leer.

   Warum die Ergebnisse vorher schlecht waren (PO: „liefert nur sehr schlechte
   Ergebnisse") - fuenf Ursachen, alle hier behoben:
     1. Modell claude-haiku-4-5 fuer eine Aufgabe mit Raumdenken (Skizzen-Koordinaten).
        Jetzt claude-sonnet-5, mit automatischem Rueckfall auf Haiku, falls das Modell
        beim Anbieter nicht verfuegbar ist.
     2. max_tokens 3000 fuer bis zu 3 Uebungen MIT Skizze - die Antwort brach mitten im
        JSON ab und landete im „unlesbar"-Zweig. Jetzt 8000.
     3. JSON wurde nur bei OpenAI erzwungen; bei Anthropic stand die Bitte nur im Text.
        Jetzt Prefill (Assistant beginnt mit `{`), das erzwingt die Form.
     4. Keine Temperatur gesetzt (Vorgabe 1.0) - maximale Streuung bei einer Aufgabe,
        die Genauigkeit braucht. Jetzt 0.3.
     5. Kein einziges Beispiel. Gerade Koordinaten lernt ein Modell am Muster, nicht an
        der Beschreibung. Jetzt eine vollstaendig ausgearbeitete Beispiel-Uebung.
   Dazu neu: der Client darf Kontext mitgeben (Kadergroesse), damit „6-12 Spieler"
   nicht an einer Mannschaft mit 15 Kindern vorbeigeht. */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const LIMIT = 20;          // Anfragen pro Trainer und Tag (Kosten-/Missbrauchs-Deckel)
const MAX_PROMPT = 500;    // freie Beschreibung
const MAX_TEXT = 6000;     // eingefuegter Fremdtext (Stufe 1)

function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const KATS = ["aufwaermen","raute","passspiel","wahrnehmung","technik","pressing","spass","torwart","individual","mindset"];

/* Ein vollstaendiges Beispiel sagt ueber Koordinaten mehr als jede Regel. Bewusst eine
   einfache Form, damit das Muster (Reihe von Huetchen, Dribbelpfeile dazwischen, Tor am
   Ende, eine Beschriftung unten) uebertragbar bleibt. */
const BEISPIEL = `{"uebungen":[{"titel":"Slalom der Schatzsucher","kat":"technik","dauer":"10-12 Min","spieler":"6-12","feld":"20x12 m","material":"8 Huetchen, 1 Ball pro Kind, 1 Minitor","beschreibung":"AUFBAU: Vier Huetchen im Abstand von 2 m in einer Reihe, dahinter ein Minitor. Jedes Kind hat einen Ball, zwei Kinder starten gleichzeitig nebeneinander. ABLAUF: Die Kinder dribbeln im Slalom durch die Huetchen und schiessen aufs Minitor. Wer trifft, holt einen Schatz (Huetchen) und legt ihn an den Start. ABLAUF: Nach dem Schuss aussen zurueck laufen, damit nie mehr als drei Kinder warten. Nach 4 Minuten Seiten tauschen.","variante":"Leichter: Abstand auf 3 m vergroessern. Schwerer: nur mit dem schwaecheren Fuss.","coaching":"Ball eng am Fuss! Kopf hoch vor dem Schuss! Super Tempo!","diff":1,"skizze":{"h":[[95,90,"y"],[130,90,"y"],[165,90,"y"],[200,90,"y"]],"s":[[45,90,"g"],[45,115,"g"]],"b":[[53,97],[53,122]],"p":[[54,84,92,78,"d"],[100,100,128,102,"d"],[136,80,162,78,"d"],[172,100,198,102,"d"],[210,90,238,90,"s"]],"tor":[[240,72,"v",36]],"tx":[[140,172,"eng am Fuss durch die Tore"]]}}]}`;

const SKIZZE_REGELN = `SKIZZE: Liefere zu jeder Uebung eine Feld-Skizze als kompaktes JSON. Koordinatensystem: 280 breit, 180 hoch, 10px Rand frei lassen; das gruene Feld ist schon da.
- "h": Huetchen [[x,y]] oder [[x,y,"r"|"b"|"y"|"g"]]
- "s": Spieler [[x,y,"g"|"r"|"b"|"w","AB"]] - g=eigenes Kind, r=Gegner/Faenger, b=Torwart, w=Trainer; Label optional, max 3 Zeichen
- "b": Baelle [[x,y]]
- "tor": Tore [[x,y,"h"|"v",breite]] - h=waagerecht, v=senkrecht; Minitor 16-24 breit, grosses Tor 40
- "z": Zonen [[x,y,breite,hoehe]]
- "leiter": Koordinationsleiter [[x,y,laenge,"h"|"v"]]
- "p": Pfeile [[x1,y1,x2,y2,"p"|"l"|"s"|"d"]] - p=Pass, l=Laufweg, s=Schuss, d=Dribbling
- "tx": maximal 2 kurze Beschriftungen [[x,y,"Text"]] (Text max 45 Zeichen)
- "ger": Geraete [[x,y,art,farbe]] - art: "stange"|"teller"|"huerde"|"depot"|"ring"|"dummy"|"trainer"; "trainer" ist die Position des Trainers
- "dtor": Tore zum Durchdribbeln [[x,y,breite,"h"|"v","s"|"h",farbe]] - "s" steht auf Stangen, "h" auf Huetchen
- "kr": Kreiszonen [[x,y,radius]] - z. B. der Mittelkreis als Spielfeld
- "li": Linien [[x1,y1,x2,y2,"m"|"sz"]] - m=Mittellinie, sz=Schusszone
- "hoch": true fuer ein hochkantes Feld (dann 180 breit und 280 hoch statt 280x180) - nimm es fuer alles, was in die Laenge laeuft: Slalom, Torschuss auf ein Tor am oberen Rand, halbes Spielfeld
- Abfolge: ein Pfeil darf eine Schrittnummer als sechstes Feld tragen, [[x1,y1,x2,y2,"p",1]] - nummeriere NUR, wenn die Reihenfolge fuer das Verstaendnis noetig ist, dann aber luechenlos ab 1
- "schritte": statt einer Nummerierung mehrere Bilder [{"s":[...],"b":[...],"p":[...],"tx":[...]}] - hoechstens 6, der Aufbau (Huetchen, Tore, Zonen, Geraete) steht NUR im Grundbild und gilt fuer alle; in jedem Bild stehen dieselben Spieler und Baelle, nur an anderer Stelle
Die Skizze muss zum Ablauf passen: gleiche Anzahl Spieler, Tore und Huetchen wie im Text.
Elemente duerfen sich nicht ueberlagern, Pfeile beginnen und enden neben einem Objekt, nicht darin.`;

const FORM = `Antworte AUSSCHLIESSLICH mit gueltigem JSON in genau dieser Form, ohne Text davor oder danach:
{"uebungen":[{"titel":"kindgerechter Name","kat":"aufwaermen|raute|passspiel|wahrnehmung|technik|pressing|spass|torwart|individual|mindset","dauer":"10-15 Min","spieler":"z. B. 6-12","feld":"z. B. 20x15 m","material":"z. B. 8 Huetchen, 1 Ball pro Kind","beschreibung":"AUFBAU: ... ABLAUF: ... (4-8 kurze Saetze)","variante":"Steigerung oder leichtere Variante","coaching":"2-3 kurze Trainer-Zurufe","diff":1,"skizze":{...}}]}`;

const SYS_IDEE = `Du bist ein erfahrener Kinderfussball-Trainer (DFB-Ausbildung, U6 bis U9) und erstellst 1 bis 3 hochwertige Trainingsuebungen fuer 6- bis 9-jaehrige Kinder auf Basis der Anfrage.

QUALITAETSREGELN (streng einhalten):
- Jede Uebung hat einen klaren AUFBAU (Feldgroesse in Metern, Anzahl Huetchen/Tore, wo steht was) und einen klaren ABLAUF (wer macht was, wann wird gewechselt, wie wird gezaehlt).
- Viele Ballkontakte fuer JEDES Kind, keine Warteschlangen mit mehr als 3 Kindern, moeglichst 1 Ball pro Kind.
- Spiel- oder Wettkampfform mit kindgerechter Story (Tiere, Piraten, Schatzsuche ...) und Punkten/Erfolgserlebnissen.
- Kein Krafttraining, keine Ausdauerlaeufe ohne Ball, keine komplizierten Taktik-Ansagen.
- Begriffe korrekt verwenden: FUNino = 3 gegen 3 auf 4 Minitore OHNE Torwart. "4+1" / "5+1" = 4 bzw. 5 Feldspieler MIT Torwart auf ein Tor mit Torwart. Auf Minitore gibt es NIE einen Torwart.
- Konkrete Zahlen nennen: Feldmasse, Distanzen, Wiederholungen, Dauer.

${SKIZZE_REGELN}

SO SIEHT EINE GUTE ANTWORT AUS (Beispiel, Aufbau und Skizzenstil uebernehmen, Inhalt NICHT kopieren):
${BEISPIEL}

${FORM}`;

const SYS_TEXT = `Du bist ein erfahrener Kinderfussball-Trainer (DFB-Ausbildung, U6 bis U9). Du bekommst einen fremden Text - aus einer Webseite, einem Chat, einer Videobeschreibung oder einem Buch - und ueberfuehrst ihn in GENAU EINE strukturierte Trainingsuebung im Format der App.

WICHTIGSTE REGEL: Du gibst wieder, was im Text steht. Du erfindest keine Inhalte dazu.
- Steht eine Angabe nicht im Text (z. B. Feldgroesse oder Dauer), lass das Feld LEER statt zu raten.
- Beschreibt der Text mehrere Uebungen, nimm die erste ausfuehrlich beschriebene.
- Ist der Text fuer 6- bis 9-Jaehrige zu schwer, uebernimm ihn trotzdem und schreib in "variante", wie man ihn vereinfacht.
- Formuliere Ablauf und Coaching-Punkte kurz und in eigenen Worten; uebernimm keine langen woertlichen Passagen.
- Ist der Text gar keine Trainingsuebung, gib {"uebungen":[]} zurueck.

${SKIZZE_REGELN}
Die Skizze leitest du aus der Beschreibung ab. Ist der Aufbau im Text nicht erkennbar, lass "skizze" weg.

SO SIEHT DAS ERGEBNISFORMAT AUS (Stil, nicht Inhalt):
${BEISPIEL}

${FORM}`;

// Skizzen-Spec streng validieren: nur bekannte Formen, Zahlen geklemmt, Texte gesaeubert.
// (Wird clientseitig in SVG interpoliert - hier ist die Sicherheitsgrenze.)
function sanSkizze(s: any) {
  if (!s || typeof s !== "object") return null;
  /* v581: Das Feld kann hochkant stehen (180 x 280). Die Klemmgrenzen folgen dem Zuschnitt,
     sonst laege ein Spieler bei y = 250 im hochkanten Feld ploetzlich am unteren Rand. */
  const hoch = s.hoch === true, B = hoch ? 180 : 280, H = hoch ? 280 : 180;
  const num = (v: any, min: number, max: number) => { const n = Number(v); return isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null; };
  const arr = (v: any, fn: (e: any) => any, cap: number) => Array.isArray(v) ? v.slice(0, cap).map(fn).filter((x) => x !== null) : [];
  const out: any = {};
  out.h = arr(s.h, (e) => { const x = num(e?.[0], 8, B - 8), y = num(e?.[1], 8, H - 6); if (x === null || y === null) return null; return (typeof e?.[2] === "string" && /^[grby]$/.test(e[2])) ? [x, y, e[2]] : [x, y]; }, 24);
  out.s = arr(s.s, (e) => { const x = num(e?.[0], 8, B - 8), y = num(e?.[1], 8, H - 6); if (x === null || y === null) return null; const f = (typeof e?.[2] === "string" && /^[grbw]$/.test(e[2])) ? e[2] : "g"; const lbl = typeof e?.[3] === "string" ? e[3].replace(/[^0-9A-Za-zÄÖÜäöüß]/g, "").slice(0, 3) : ""; return lbl ? [x, y, f, lbl] : [x, y, f]; }, 16);
  out.b = arr(s.b, (e) => { const x = num(e?.[0], 8, B - 8), y = num(e?.[1], 8, H - 6); return (x === null || y === null) ? null : [x, y]; }, 12);
  out.z = arr(s.z, (e) => { const x = num(e?.[0], 4, B - 8), y = num(e?.[1], 4, H - 8), w = num(e?.[2], 8, B), h = num(e?.[3], 8, H); return (x === null || y === null || w === null || h === null) ? null : [x, y, w, h]; }, 6);
  out.tor = arr(s.tor, (e) => { const x = num(e?.[0], 2, B - 6), y = num(e?.[1], 2, H - 6); if (x === null || y === null) return null;
    const t = [x, y, e?.[2] === "v" ? "v" : "h", num(e?.[3], 8, 60) ?? 24]; return e?.[4] === "j" ? t.concat(["j"]) : t; }, 6);
  out.leiter = arr(s.leiter, (e) => { const x = num(e?.[0], 4, B - 8), y = num(e?.[1], 4, H - 8), l = num(e?.[2], 20, Math.max(B, H)); if (x === null || y === null || l === null) return null; return [x, y, l, e?.[3] === "v" ? "v" : "h"]; }, 3);
  out.p = arr(s.p, (e) => { const a = num(e?.[0], 4, B - 4), b2 = num(e?.[1], 4, H - 4), c = num(e?.[2], 4, B - 4), d = num(e?.[3], 4, H - 4); if (a === null || b2 === null || c === null || d === null) return null;
    const typ = (typeof e?.[4] === "string" && /^[plsd]$/.test(e[4])) ? e[4] : "p", nr = num(e?.[5], 1, 20);
    return nr ? [a, b2, c, d, typ, nr] : [a, b2, c, d, typ]; }, 16);
  out.tx = arr(s.tx, (e) => { const x = num(e?.[0], 8, B - 8), y = num(e?.[1], 12, H - 4); const t = typeof e?.[2] === "string" ? e[2].replace(/[<>&"']/g, "").slice(0, 48) : ""; return (x === null || y === null || !t) ? null : [x, y, t]; }, 4);
  /* v581: Alles, was der Zeichner seit v559 kann. Bis hierher fiel es still weg – das Modell
     durfte Geraete, Dribbeltore, Linien und weitere Bilder nennen, die Pruefung warf sie
     weg, und niemand sah warum. */
  const GER = ["stange", "teller", "huerde", "depot", "ring", "dummy", "trainer"];
  out.ger = arr(s.ger, (e) => { const x = num(e?.[0], 6, B - 6), y = num(e?.[1], 6, H - 6); const a = String(e?.[2] || "stange");
    return (x === null || y === null || !GER.includes(a)) ? null : [x, y, a, (typeof e?.[3] === "string" && /^[grbyw]$/.test(e[3])) ? e[3] : "y"]; }, 12);
  out.dtor = arr(s.dtor, (e) => { const x = num(e?.[0], 4, B - 4), y = num(e?.[1], 4, H - 4); if (x === null || y === null) return null;
    return [x, y, num(e?.[2], 10, 80) ?? 20, e?.[3] === "v" ? "v" : "h", e?.[4] === "h" ? "h" : "s", (typeof e?.[5] === "string" && /^[grbyw]$/.test(e[5])) ? e[5] : "y"]; }, 6);
  out.kr = arr(s.kr, (e) => { const x = num(e?.[0], 6, B - 6), y = num(e?.[1], 6, H - 6), r = num(e?.[2], 6, Math.min(B, H) / 2);
    return (x === null || y === null || r === null) ? null : [x, y, r]; }, 3);
  out.li = arr(s.li, (e) => { const a = num(e?.[0], 2, B - 2), b2 = num(e?.[1], 2, H - 2), c = num(e?.[2], 2, B - 2), d = num(e?.[3], 2, H - 2);
    return (a === null || b2 === null || c === null || d === null) ? null : [a, b2, c, d, e?.[4] === "sz" ? "sz" : "m"]; }, 4);
  Object.keys(out).forEach((k) => { if (!out[k].length) delete out[k]; });
  if (hoch) out.hoch = true;
  /* Weitere Bilder: beweglich sind nur Spieler, Ball, Pfeile und Beschriftung – der Aufbau
     steht im Grundbild (v557). Ein Schritt, der etwas anderes mitbringt, verliert es hier. */
  if (Array.isArray(s.schritte) && s.schritte.length) {
    const schritte = s.schritte.slice(0, 6).map((st: any) => {
      const teil = sanSkizze({ s: st?.s, b: st?.b, p: st?.p, tx: st?.tx, hoch: s.hoch });
      if (!teil) return null;
      delete teil.hoch;
      return Object.keys(teil).length ? teil : null;
    }).filter(Boolean);
    if (schritte.length) out.schritte = schritte;
  }
  const inhalt = Object.keys(out).filter((k) => k !== "hoch");
  return inhalt.length ? out : null;
}

/* Ein Aufruf beim Anbieter. Anthropic bekommt einen Prefill: die Antwort MUSS mit "{"
   weitergehen, damit kein Fliesstext davor landet. */
async function llmRuf(provider: string, key: string, model: string, sys: string, user: string) {
  if (provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8000, temperature: 0.3, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }),
    });
    if (!r.ok) return { ok: false, status: r.status, text: "" };
    const d = await r.json();
    return { ok: true, status: 200, text: d?.choices?.[0]?.message?.content || "" };
  }
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model, max_tokens: 8000, temperature: 0.3, system: sys,
      messages: [{ role: "user", content: user }, { role: "assistant", content: "{" }],
    }),
  });
  if (!r.ok) return { ok: false, status: r.status, text: "" };
  const d = await r.json();
  return { ok: true, status: 200, text: "{" + (d?.content?.[0]?.text || "") };  // Prefill wieder anfuegen
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j({ error: "POST erwartet" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return j({ error: "auth required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Nutzer verifizieren + Trainer-Check (nur Trainer duerfen die KI nutzen)
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: udata } = await userClient.auth.getUser();
    const uid = udata?.user?.id;
    if (!uid) return j({ error: "not authenticated" }, 401);
    const { data: isTrainer, error: rpcErr } = await userClient.rpc("is_trainer");
    if (rpcErr || isTrainer !== true) return j({ error: "Nur Trainer koennen den KI-Coach nutzen." }, 403);

    // 2) Rate-Limit (service_role, RLS-bypass)
    const svc = createClient(url, svcKey);
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await svc.from("ki_usage").select("count").eq("uid", uid).eq("tag", today).maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= LIMIT) return j({ error: `Tageslimit erreicht (${LIMIT} Anfragen/Tag). Morgen wieder!` }, 429);

    // 3) Eingabe (begrenzt)
    const body = await req.json().catch(() => ({}));
    const modus = String(body?.modus ?? "idee") === "text" ? "text" : "idee";
    const prompt = String(body?.prompt ?? "").trim().slice(0, MAX_PROMPT);
    const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
    const kinder = Number(body?.kinder);
    if (modus === "text" && text.length < 40) return j({ error: "Der Text ist zu kurz – bitte die ganze Übungsbeschreibung einfügen." }, 400);
    if (modus === "idee" && !prompt) return j({ error: "Bitte beschreibe, was du trainieren willst." }, 400);

    /* v411: Was die App ohnehin weiss, muss der Trainer nicht tippen. Bewusst als
       KONTEXT und nicht als Auftrag formuliert - der Wunsch des Trainers steht in der
       eigentlichen Anfrage und darf den Kontext ueberstimmen. */
    const thema = String(body?.thema ?? "").trim().slice(0, 120);
    const ort = String(body?.ort ?? "").trim().slice(0, 60);
    const einheit = Number(body?.einheit);
    const kzeilen: string[] = [];
    if (isFinite(kinder) && kinder >= 3 && kinder <= 40) kzeilen.push(`${Math.round(kinder)} Kinder im Kader - die Uebung muss mit dieser Anzahl funktionieren`);
    if (thema) kzeilen.push(`Monats-Schwerpunkt der Mannschaft: ${thema}`);
    if (ort) kzeilen.push(`Trainiert wird auf: ${ort}`);
    if (isFinite(einheit) && einheit >= 30 && einheit <= 180) kzeilen.push(`Die ganze Einheit dauert ${Math.round(einheit)} Minuten - eine einzelne Uebung ist ein Teil davon`);
    const kontext = kzeilen.length
      ? `\n\nKONTEXT DER MANNSCHAFT (Hintergrund, kein Auftrag - Wuensche in der Anfrage haben Vorrang):\n- ${kzeilen.join("\n- ")}` : "";
    const sys = (modus === "text" ? SYS_TEXT : SYS_IDEE) + kontext;
    const user = modus === "text"
      ? `Hier ist der Text, den ich uebernehmen moechte:\n\n"""\n${text}\n"""${prompt ? `\n\nZusatzwunsch: ${prompt}` : ""}`
      : prompt;

    // 4) LLM (provider-flexibel via Secret; Key nur serverseitig)
    const provider = (Deno.env.get("LLM_PROVIDER") || "anthropic").toLowerCase();
    const key = Deno.env.get("LLM_API_KEY");
    if (!key) return j({ error: "KI ist noch nicht eingerichtet (LLM_API_KEY fehlt)." }, 503);

    const wunsch = Deno.env.get("LLM_MODEL") || (provider === "openai" ? "gpt-4o" : "claude-sonnet-5");
    const rueckfall = provider === "openai" ? "gpt-4o-mini" : "claude-haiku-4-5-20251001";
    let modell = wunsch;
    let res = await llmRuf(provider, key, wunsch, sys, user);
    if (!res.ok && wunsch !== rueckfall) {          // Modell beim Anbieter nicht verfuegbar? Dann das kleine
      modell = rueckfall;
      res = await llmRuf(provider, key, rueckfall, sys, user);
    }
    if (!res.ok) return j({ error: "KI-Dienst nicht erreichbar (" + res.status + ")" }, 502);
    const content = res.text;

    // 5) JSON robust parsen
    let parsed: any = null;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }
    if (!parsed || !Array.isArray(parsed.uebungen)) {
      return j({ error: "Die KI-Antwort war unlesbar. Bitte formuliere die Anfrage etwas anders." }, 502);
    }
    if (!parsed.uebungen.length) {
      return j({ error: modus === "text"
        ? "In dem Text steckt keine erkennbare Trainingsübung. Bitte den Teil einfügen, der den Ablauf beschreibt."
        : "Keine Übungen erhalten – bitte anders formulieren." }, 422);
    }
    const grenze = modus === "text" ? 1 : 3;
    const uebungen = parsed.uebungen.slice(0, grenze).map((u: any) => ({
      titel: String(u?.titel || "Uebung").slice(0, 120),
      kat: KATS.includes(String(u?.kat)) ? String(u.kat) : "technik",
      dauer: String(u?.dauer || "").slice(0, 40),
      spieler: String(u?.spieler || "").slice(0, 40),
      feld: String(u?.feld || "").slice(0, 60),
      material: String(u?.material || "").slice(0, 200),
      beschreibung: String(u?.beschreibung || "").slice(0, 1600),
      variante: String(u?.variante || "").slice(0, 400),
      coaching: String(u?.coaching || "").slice(0, 300),
      diff: [1, 2, 3].includes(Number(u?.diff)) ? Number(u.diff) : 2,
      skizze: sanSkizze(u?.skizze),
    }));

    // 6) Erst nach Erfolg hochzaehlen
    await svc.from("ki_usage").upsert({ uid, tag: today, count: used + 1 }, { onConflict: "uid,tag" });

    return j({ uebungen, rest: LIMIT - (used + 1), modell, modus }, 200);
  } catch (_e) {
    return j({ error: "Serverfehler beim KI-Coach." }, 500);
  }
});
