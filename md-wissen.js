/* ═══════════════════════════════════════════════════════════════════════════
   WISSEN – Nachschlagen am Spieltag (v518, Welle 2)

   PO: „Dann sollten wir diese auch irgendwo in der Spieltag integrieren als Abruf, damit
   die Trainer am Spieltag direkt nachsehen können. Ebenso was die Größen der Spielfelder
   angeht." Und auf die Rückfrage: „Eigene Kachel und wir ergänzen dann noch weitere
   wichtige Dokumente. Also eine Art Wissensdatenbank."

   Deshalb ist das hier eine LISTE, keine Seite: ein neues Dokument ist ein weiterer Eintrag
   in WISSEN, mehr nicht. Jeder Eintrag trägt seine Quelle und seinen Stand – am Platz muss
   man erkennen können, ob eine Zahl noch gilt.

   Die Zahlen stammen aus den Durchführungsbestimmungen Kinderfussball des Fussballkreises
   Köln, gültig ab 01.08.2026 für die Saison 2026/2027. Sie sind ABGESCHRIEBEN, nicht
   gerundet oder erinnert. Wo die Bestimmungen „ca." schreiben, steht hier auch „ca.".
═══════════════════════════════════════════════════════════════════════════ */

const WISSEN_QUELLE_KIFU = "Durchführungsbestimmungen Kinderfussball · Fussballkreis Köln";
const WISSEN_STAND_KIFU  = "gültig ab 01.08.2026 · Saison 2026/2027";

/* Spielformen je Altersklasse – Abschnitt 1 der Bestimmungen. */
const WISSEN_SPIELFORMEN = [
  { ak: "G-Junioren U6", mini: "2 gegen 2 oder 3 gegen 3", jugend: "–" },
  { ak: "G-Junioren U7", mini: "2 gegen 2 oder 3 gegen 3", jugend: "–" },
  { ak: "F-Junioren U8", mini: "3 gegen 3", jugend: "3+1 gegen 3+1", uns: true },
  { ak: "F-Junioren U9", mini: "3 gegen 3", jugend: "3+1 gegen 3+1", uns: true },
  { ak: "E-Junioren U10", mini: "4 gegen 4", jugend: "4+1 gegen 4+1" },
  { ak: "E-Junioren U11", mini: "4 gegen 4", jugend: "4+1 gegen 4+1" }
];
/* Feldgrößen – Abschnitt 2 (1). */
const WISSEN_FELDER = [
  { ak: "Bambini U6/U7", mass: "ca. 20 × 16 m" },
  { ak: "F-Jugend U8/U9", mass: "ca. 25 × 20 m", uns: true },
  { ak: "E-Jugend U10/U11", mass: "ca. 30–35 × 25 m" }
];
/* Spieleranzahl – Abschnitt 3. */
const WISSEN_KADER = [
  { ak: "Bambini U6/U7", feld: "2 gegen 2 oder 3 gegen 3", tw: "keine", rot: "1 bis 2", ges: "min. 3 bis 4" },
  { ak: "F-Jugend U8/U9", feld: "3 gegen 3", tw: "3 + 1 TW", rot: "1 bis 2", ges: "min. 4 bis 5", uns: true },
  { ak: "E-Jugend U10/U11", feld: "4 gegen 4", tw: "4 + 1 TW", rot: "1 bis 2", ges: "min. 5 bis 6" }
];

const WISSEN = [
  {
    id: "kifu-spielformen", emo: "📐", titel: "Spielformen & Feldmaße",
    kurz: "Welche Form, welches Feld, welche Tore – je Altersklasse",
    quelle: WISSEN_QUELLE_KIFU, stand: WISSEN_STAND_KIFU,
    bau: () => _wsTabellen()
  },
  {
    id: "kifu-regeln", emo: "📋", titel: "Spielregeln am Spieltag",
    kurz: "Spieleröffnung, Aus, Wechsel, Überzahl, Penalty",
    quelle: WISSEN_QUELLE_KIFU, stand: WISSEN_STAND_KIFU,
    punkte: [
      ["Spieleröffnung", "Wettlauf zum Ball in der Mitte. Alle Spieler starten von der eigenen Torauslinie."],
      ["Seitenaus", "Eindribbeln oder einpassen. Wer eindribbelt, darf selbst abschließen – ohne Schwung von außen, der Ball liegt auf der Linie."],
      ["Toraus", "Von der Torauslinie eindribbeln oder einpassen. Kein Angreifer in der Schusszone."],
      ["Statt Eckball", "Vom Markierungshütchen der Schusszone eindribbeln oder einpassen."],
      ["Abstand", "Drei Meter bei Seitenaus, Ecke und einfachen Regelverstößen."],
      ["Wechsel", "Nur an der Mittellinie in der Wechselzone bei den Trainern. Rotationsspieler nach jedem Tor, spätestens nach 1–2 Minuten."],
      ["Nach einem Tor", "Eindribbeln von der Torauslinie, kein Gegenspieler in der Schusszone."],
      ["Drei Tore Vorsprung", "Das unterlegene Team darf einen zusätzlichen Feldspieler bringen (4 gegen 3), bis der Abstand ein Tor beträgt. Hat es keinen, nimmt das führende Team einen vom Feld."],
      ["Penalty", "Bei grobem Verstoß in der eigenen Schusszone: ein Kind startet mit Ball an der Mittellinie und dribbelt aufs Tor, ein Verteidiger steht in der Schusszone, alle anderen hinter dem Angreifer."],
      ["Fair-Play", "Es wird im Fair-Play-Modus gespielt, also ohne Schiedsrichter – die Kinder entscheiden selbst. Eltern halten etwa 15 Meter Abstand. Trainer stehen gemeinsam an der Mittellinie und coachen wenig."],
      ["Ergebnisse", "Keine Sammlung, keine Auswertung, kein Sieger. Das Erlebnis steht im Vordergrund."],
      ["Torwart", "Soll mitspielen. Eröffnung flach über die Mittellinie, ohne Abschlag. Rückpässe ohne Hände – begleiten, nicht bestrafen."]
    ]
  },
  {
    id: "kifu-verstoesse", emo: "⚠️", titel: "Was Ordnungsgeld kostet",
    kurz: "Schwere Verstöße – der Heimverein haftet vor Ort",
    quelle: WISSEN_QUELLE_KIFU + " · Abschnitt 7", stand: WISSEN_STAND_KIFU,
    punkte: [
      ["Nur Jugendtore, 7 gegen 7", "Ausschließlich auf Jugendtoren und im Modus 7 gegen 7 zu spielen."],
      ["Torhöhe", "Fehlende Höhenreduzierung bei Jugendtoren – in der F-Jugend auf 1,65 m."],
      ["Ballgröße", "Verwendung nicht zulässiger Ballgrößen."],
      ["Zuschauer", "Zuschauer auf dem Spielfeld während laufender Spiele."],
      ["Feldgrößen", "Nichteinhaltung der vorgegebenen Spielfeldgrößen."],
      ["Regeln", "Eklatante Nichteinhaltung der vorgegebenen Spielregeln."],
      ["Folge", "Bis 100 € je Fall, bei Wiederholung verdoppelt – bis zum Ausschluss aus dem Spielbetrieb. Vor Ort ist der gastgebende Verein zuständig."]
    ]
  },
  {
    id: "warmup", emo: "🔥", titel: "Warm up Adler",
    kurz: "Vier Stufen ohne Umbau – mit Skizze je Stufe",
    quelle: "Eigenes Einlaufprogramm", stand: "",
    bau: () => _wsWarmup()
  },
  {
    id: "platzbelegung", emo: "🗓️", titel: "Unsere Zeiten",
    kurz: "Training und Spieltag der U9 I",
    quelle: "Platzbelegung SV Adler Dellbrück", stand: "Saison 2026/2027",
    punkte: [
      ["Training", "Montag 16:45–18:15 · Freitag 16:30–18:00"],
      ["Platz im Training", "Hauptplatz vorne links – an beiden Tagen, nicht der Käfig"],
      ["Spieltag", "Ungerade Kalenderwochen, Samstag 10:15–11:15"],
      ["Platz am Spieltag", "Linke Platzhälfte und Käfig"],
      ["Dauer eines Spieltags", "60 Minuten – die Zeitpläne sind einzuhalten, viele Vereine haben enge Belegungen."]
    ]
  }
];

/* ─────────────────────────────────────────────────────────────────────────
   Bausteine
   ───────────────────────────────────────────────────────────────────────── */
function _wsEsc(s){ return (typeof esc==="function")?esc(s):String(s==null?"":s); }

/* Eine Tabelle, die am Handy nicht ausbricht: eigene Rolle, eigener Roller. */
function _wsTab(kopf,zeilen){
  return '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:6px 0 10px">'
    +'<table style="border-collapse:collapse;width:100%;font-size:12px;min-width:280px">'
    +'<thead><tr>'+kopf.map(k=>'<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--rand-bedien);color:var(--text2);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap">'+_wsEsc(k)+'</th>').join("")+'</tr></thead>'
    +'<tbody>'+zeilen.map(z=>{
      /* „Uns betrifft es" wird nicht nur farbig markiert – die Zeile trägt ein Zeichen und
         den Text „uns", sonst ginge die Bedeutung ohne Farbwahrnehmung verloren. */
      const uns=z.uns;
      return '<tr style="'+(uns?'background:var(--blue-bg)':'')+'">'
        +z.z.map((w,i)=>'<td style="padding:6px 8px;border-bottom:var(--border);'+(i===0?'font-weight:700;white-space:nowrap':'')+'">'
            +(i===0&&uns?'<span aria-hidden="true">▸ </span>':'')+_wsEsc(w)
            +(i===0&&uns?' <span style="font-size:9.5px;font-weight:800;color:var(--blue-text);border:1px solid var(--blue-text);border-radius:4px;padding:0 4px;vertical-align:middle">uns</span>':'')
          +'</td>').join("")+'</tr>';
    }).join("")+'</tbody></table></div>';
}

function _wsTabellen(){
  const s=_wsTab(["Altersklasse","auf Minitore","auf Jugendtoren (+TW)"],
    WISSEN_SPIELFORMEN.map(x=>({uns:x.uns,z:[x.ak,x.mini,x.jugend]})));
  const f=_wsTab(["Altersklasse","Feldgröße"],
    WISSEN_FELDER.map(x=>({uns:x.uns,z:[x.ak,x.mass]})));
  const k=_wsTab(["Altersklasse","Feld","mit Torwart","Rotation","gesamt"],
    WISSEN_KADER.map(x=>({uns:x.uns,z:[x.ak,x.feld,x.tw,x.rot,x.ges]})));
  const zeile=(t,d)=>'<div style="display:flex;gap:8px;padding:5px 0;border-bottom:var(--border);font-size:12px"><div style="flex:0 0 38%;font-weight:700;color:var(--text2)">'+_wsEsc(t)+'</div><div style="flex:1">'+_wsEsc(d)+'</div></div>';
  return '<div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.4px;margin-top:4px">Spielform</div>'+s
    +'<div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.4px">Feldgröße</div>'+f
    +'<div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.4px">Kader je Team</div>'+k
    +'<div style="font-size:11px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Tore, Zonen, Zeit</div>'
    +zeile("Minitore","höchstens 2,0 × 1,2 m")
    +zeile("Jugendtore","in der F-Jugend auf 1,65 m höhenreduziert")
    +zeile("Schusszone","F- und E-Jugend auf Minitor-Feldern: etwa 6 m vor den Toren. Treffer zählen nur innerhalb.")
    +zeile("Mittellinie","Auf Jugendtor-Feldern nur die Mittellinie – Treffer nur aus der gegnerischen Hälfte. Bei den Bambini ebenso, dort ohne Schusszone.")
    +zeile("Feldzahl","4 bis 8 kleine Felder auf mindestens einer Platzhälfte.")
    +zeile("Spielzeit U8/U9","empfohlen 6 Spiele mit 7 Minuten")
    +zeile("Spieltag","60 Minuten insgesamt")
    +_wsAbweichung();
}

/* Was bei uns anders läuft. Ohne diesen Hinweis liest ein Trainer die Tabelle und wundert
   sich, warum am Platz etwas anderes steht – oder merkt es gar nicht. */
function _wsAbweichung(){
  return '<div style="margin-top:10px;font-size:11.5px;color:var(--amber);background:var(--amber-bg);border:1px solid var(--amber);border-radius:10px;padding:9px 11px;line-height:1.5">'
    +'<b>Bei uns weicht der Käfig ab.</b> Er läuft zurzeit als <b>4+1</b>; die Bestimmungen sehen für U8/U9 auf Jugendtoren <b>3+1</b> vor – 4+1 ist die Form der E-Jugend. '
    +'Umstellen kann das jeder Trainer je Feld unter „Heimspiel &amp; Festival planen“; Teamgröße, Regelkarte und Skizze ziehen dann mit.</div>';
}

/* Die vier Stufen des Einlaufprogramms mit ihren eigenen Skizzen. Sie liegen als eigene
   Übungen in der Datenbank – hier werden sie nur zusammengeholt, nicht kopiert. */
function _wsWarmup(){
  const reihe=(typeof UEB_REIHEN==="object"&&UEB_REIHEN)?UEB_REIHEN["Warm up Adler"]:null;
  if(!reihe||typeof tpAllForms!=="function")
    return '<div style="font-size:12px;color:var(--text3)">Die Übungen des Einlaufprogramms sind noch nicht angelegt.</div>';
  const alle=tpAllForms()||[];
  const treffer=reihe.map(n=>alle.find(f=>String(f.name||"").trim()===n)).filter(Boolean);
  if(!treffer.length)
    return '<div style="font-size:12px;color:var(--text3)">Die vier Stufen stehen noch nicht in der Übungs-Datenbank. Sie kommen beim nächsten Öffnen von selbst dazu.</div>';
  return treffer.map((f,i)=>'<div style="margin-bottom:10px;padding-bottom:8px;'+(i<treffer.length-1?'border-bottom:var(--border)':'')+'">'
      +'<div style="font-size:12.5px;font-weight:800">'+(i+1)+' · '+_wsEsc(f.name)+'</div>'
      +'<div style="font-size:11px;color:var(--text2);margin:2px 0 4px">⏱ '+_wsEsc(f.dauer||"?")+' Min · 📐 '+_wsEsc(f.feld||"?")+'</div>'
      +((f.svg&&typeof f.svg==="string")?f.svg:"")
      +'<div style="font-size:11.5px;line-height:1.5;white-space:pre-wrap">'+_wsEsc(f.ablauf||f.kurz||"")+'</div>'
    +'</div>').join("")
    +((typeof skzLegende==="function")?skzLegende():"");
}

/* ─────────────────────────────────────────────────────────────────────────
   Ansicht
   ───────────────────────────────────────────────────────────────────────── */
let _wsOffen=null;

function wissenKachel(){
  return '<button type="button" id="wissen-kachel" onclick="wissenOpen()" '
    +'style="width:100%;min-height:56px;display:flex;align-items:center;gap:10px;padding:10px 14px;'
    +'border:var(--border-s);border-left:4px solid var(--fam-spieltag);border-radius:var(--rl);'
    +'background:var(--surface);color:var(--text);font-family:inherit;cursor:pointer;text-align:left;margin-bottom:10px">'
    +'<span style="font-size:20px" aria-hidden="true">📚</span>'
    +'<span style="flex:1;min-width:0">'
      +'<span style="display:block;font-size:13.5px;font-weight:800">Wissen &amp; Nachschlagen</span>'
      +'<span style="display:block;font-size:11px;color:var(--text2)">Spielformen, Feldmaße, Regeln, Warm up</span>'
    +'</span><span style="color:var(--text3)" aria-hidden="true">›</span></button>';
}

function wissenOpen(id){
  document.getElementById("wissen-modal")?.remove();
  _wsOffen=id||null;
  const m=document.createElement("div");
  m.id="wissen-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Wissen und Nachschlagen");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:"+((typeof zOben==="function")?zOben(10040):10040)
    +";display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  m.onclick=e=>{ if(e.target===m)wissenClose(); };
  const c=document.createElement("div");
  c.id="wissen-body";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:520px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  m.appendChild(c); document.body.appendChild(m);
  wissenRender();
  if(typeof nutzungLog==="function")nutzungLog("wissen","open");
}
function wissenClose(){ document.getElementById("wissen-modal")?.remove(); _wsOffen=null; }

function wissenRender(){
  const c=document.getElementById("wissen-body"); if(!c)return;
  const kopf=(typeof mdlHead==="function")
    ? mdlHead("wissen-modal","📚","Wissen &amp; Nachschlagen","Was am Spieltag gilt – mit Quelle und Stand","#475569")
    : '<div style="font-size:15px;font-weight:800;margin-bottom:8px">📚 Wissen &amp; Nachschlagen</div>';
  c.innerHTML=kopf+WISSEN.map(d=>{
    const auf=_wsOffen===d.id;
    const inhalt=auf?('<div style="padding:2px 2px 10px">'
        +(d.bau?d.bau():(d.punkte||[]).map(p=>'<div style="display:flex;gap:8px;padding:5px 0;border-bottom:var(--border);font-size:12px">'
            +'<div style="flex:0 0 38%;font-weight:700;color:var(--text2)">'+_wsEsc(p[0])+'</div><div style="flex:1;line-height:1.5">'+_wsEsc(p[1])+'</div></div>').join(""))
        +'<div style="font-size:10.5px;color:var(--text3);margin-top:8px">Quelle: '+_wsEsc(d.quelle)+(d.stand?' · '+_wsEsc(d.stand):"")+'</div>'
      +'</div>'):"";
    return '<div style="border:var(--border-s);border-radius:12px;margin-bottom:8px;overflow:hidden">'
      +'<button type="button" onclick="wissenAuf(\''+d.id+'\')" aria-expanded="'+(auf?"true":"false")+'" '
      +'style="width:100%;min-height:52px;display:flex;align-items:center;gap:10px;padding:10px 12px;border:none;'
      +'background:'+(auf?"var(--surface2)":"var(--surface)")+';color:var(--text);font-family:inherit;cursor:pointer;text-align:left">'
        +'<span style="font-size:18px" aria-hidden="true">'+d.emo+'</span>'
        +'<span style="flex:1;min-width:0"><span style="display:block;font-size:13px;font-weight:800">'+_wsEsc(d.titel)+'</span>'
        +'<span style="display:block;font-size:11px;color:var(--text2)">'+_wsEsc(d.kurz)+'</span></span>'
        +'<span style="color:var(--text3)" aria-hidden="true">'+(auf?"▾":"▸")+'</span></button>'
      +inhalt+'</div>';
  }).join("")
  +'<button class="btn btn-sm" style="margin-top:6px;width:100%;min-height:44px" onclick="wissenClose()">Schließen</button>';
}

/* Immer nur eines offen: am Platz sucht niemand in einer langen Seite. */
function wissenAuf(id){ _wsOffen=(_wsOffen===id)?null:id; wissenRender(); }
