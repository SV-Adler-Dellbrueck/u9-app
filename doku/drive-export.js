#!/usr/bin/env node
/* Wandelt eine Markdown-Datei aus doku/ in HTML für den Google-Drive-Konnektor.

   Warum überhaupt: Der Drive-Konnektor kann Inhalte nicht überschreiben, und
   Markdown direkt übergeben zerfällt — Tabellen werden zu Fließtext, „**fett**“
   bleibt als Sternchen stehen, und eine „---“-Trennlinie landet als „-----“ in
   der nächsten Überschrift. Genau so sieht die Drive-Fassung von v553 aus.
   HTML importiert Google dagegen sauber: Tabellen bleiben Tabellen.

   Aufruf:  node doku/drive-export.js doku/Uebersicht_Funktionen-Adler-App_v1.md
   Ausgabe: dieselbe Datei mit .html, daneben.

   Beherrscht nur, was in unseren Doku-Dateien wirklich vorkommt: Überschriften
   bis Ebene 3, Tabellen mit Kopfzeile, Absätze, Listen, **fett**, `code`,
   waagerechte Linien. Kein Anspruch auf vollständiges Markdown. */

const fs = require("fs");

function esc(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* Erst escapen, dann Auszeichnung — sonst wird das <strong> selbst escaped. */
function inline(s){
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")   /* nach **fett**, sonst frisst es dessen Sternchen */
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    /* Einziges HTML, das aus der Quelle durchdarf: der Zeilenumbruch in einer
       Tabellenzelle. Markdown kennt dort keinen Absatz, und ohne ihn wird eine
       lange Zelle zur Textwueste. Alles andere bleibt escaped. */
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}

function wandeln(md){
  const zeilen = md.split("\n");
  const aus = [];
  let i = 0, liste = false;

  const listeZu = () => { if(liste){ aus.push("</ul>"); liste = false; } };

  while(i < zeilen.length){
    const z = zeilen[i];

    /* Tabelle: Kopfzeile, dann |---|---|, dann Datenzeilen */
    if(/^\|/.test(z) && /^\|[\s:|-]+\|$/.test(zeilen[i+1] || "")){
      listeZu();
      const zellen = r => r.replace(/^\||\|$/g,"").split("|").map(c => inline(c.trim()));
      aus.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">');
      aus.push("<tr>" + zellen(z).map(c => "<th>"+c+"</th>").join("") + "</tr>");
      i += 2;
      while(i < zeilen.length && /^\|/.test(zeilen[i])){
        aus.push("<tr>" + zellen(zeilen[i]).map(c => "<td>"+c+"</td>").join("") + "</tr>");
        i++;
      }
      aus.push("</table>");
      continue;
    }

    /* Waagerechte Linie wird zum Seitenumbruch, nicht zu Text. */
    if(/^-{3,}$/.test(z.trim())){
      listeZu();
      aus.push('<p style="page-break-before:always"></p>');
      i++; continue;
    }

    const h = z.match(/^(#{1,3})\s+(.*)$/);
    if(h){
      listeZu();
      const n = h[1].length;
      aus.push("<h"+n+">" + inline(h[2]) + "</h"+n+">");
      i++; continue;
    }

    const li = z.match(/^[-*]\s+(.*)$/);
    if(li){
      if(!liste){ aus.push("<ul>"); liste = true; }
      aus.push("<li>" + inline(li[1]) + "</li>");
      i++; continue;
    }

    if(z.trim() === ""){ listeZu(); i++; continue; }

    listeZu();
    aus.push("<p>" + inline(z) + "</p>");
    i++;
  }
  listeZu();
  return aus.join("\n");
}

const quelle = process.argv[2];
if(!quelle){ console.error("Aufruf: node doku/drive-export.js <datei.md>"); process.exit(1); }

const md = fs.readFileSync(quelle, "utf8");
const titel = (md.match(/^#\s+(.*)$/m) || [,"Dokument"])[1].replace(/\*\*/g,"");
const html = '<html><head><meta charset="utf-8"><title>' + esc(titel) + "</title></head><body>\n"
  + wandeln(md) + "\n</body></html>";

const ziel = quelle.replace(/\.md$/, "") + ".html";
fs.writeFileSync(ziel, html);
console.log(ziel + " — " + html.length + " Bytes, "
  + (html.match(/<table/g) || []).length + " Tabellen, "
  + (html.match(/<h[123]>/g) || []).length + " Überschriften");
