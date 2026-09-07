/* ═══════════════════════════════════
   TEAM-EINTEILUNG – aus den Eltern-Zusagen auf 1–3 Teams verteilen.
   "Adler 1/2/3" waren bisher nur Etiketten: jedes Team uebernahm dieselben Zusagen,
   also waren ueberall alle Kinder dabei. Jetzt wird EINMAL eingeteilt und die
   Einteilung in die einzelnen Team-Nominierungen uebertragen; von dort greifen
   Rotations-Timer, Aktions-Tracker und die Auto-Aufstellung.
   Gespeichert in nominierungen unter dem Schluessel "<datum>__teams", damit die
   Einteilung neben den drei Team-Zeilen liegt und Neuladen uebersteht.
═══════════════════════════════════ */
/* TEAM_TRAINER: {teamnummer: [Trainername, …]} – wer dieses Team am Spieltag betreut.
   PO: „es muss immer ein Trainer zugewiesen werden", mehrere je Team sind erlaubt.
   Wohnt in derselben data-Spalte wie die Kinder-Einteilung (nominierungen/„…__teams"),
   deshalb keine neue Tabelle, keine Änderung an Backup oder Rechten. WICHTIG: beim Laden
   wie _anzahl aus dem Objekt löschen, sonst landet der Schlüssel in TEAMS und die App
   hält „_trainer" für ein Kind.
   TEAM_STAB: wer überhaupt zuteilbar ist – der ganze Trainerstab (nicht nur wer
   mittrainiert), mit seiner Zusage zu diesem Termin. */
let TEAMS={}, TEAM_ANZAHL=1, TEAM_STATS={}, TEAM_GRUND={}, TEAM_TRAINER={}, TEAM_STAB=[];
/* v479 – PO (Kinderfestival): „Wir spielen auf mehreren Feldern parallel gegen verschiedene
   Mannschaften, und das in verschiedenen Formaten – 4+1 oder FUNiño. Wie teilen wir dann
   die Teams am besten ein?" TEAM_FORM: {teamnummer: "4+1"|"funino"|"5+1"} – die Spielform
   je Team. Ohne Eintrag gilt die Spielform des Termins (tbFormation). Wohnt wie _trainer
   in der „…__teams"-Zeile. */
let TEAM_FORM={};
/* v480 – PO: „Die Teams sollen aber nicht fest alle Spiele 4+1 oder nur FUNiño spielen,
   sondern auch durchwechseln." Und: „Feste Teams, und dann die Möglichkeit, dass die
   Teamgröße angepasst wird, wenn notwendig aufgrund der Größe des Spielfeldes." Vor dem
   Festival stehen Felder und Formate fest. TEAM_FELDER: die Felder des Tages mit Spielform,
   z. B. ["4+1","funino"]. Die festen Teams wandern je Runde ein Feld weiter (TEAM_RUNDE).
   Fehlt einem Team auf seinem Feld ein Kind, hilft eines aus dem Team mit der meisten Bank
   aus – nur fuer diese Runde (TEAM_LEIH: Kind → Heimteam). Torwart-Kinder rotieren mit. */
let TEAM_FELDER=[], TEAM_RUNDE=1, TEAM_LEIH={};
function teamFelderAktiv(){ return Array.isArray(TEAM_FELDER)&&TEAM_FELDER.length>0; }
/* Feld-Index des Teams in der aktuellen Runde (0-basiert), -1 = dieses Team pausiert die Runde. */
function teamFeldIndex(t){
  if(!teamFelderAktiv())return -1;
  const n=Math.max(TEAM_ANZAHL,TEAM_FELDER.length);
  const i=((t-1)+(TEAM_RUNDE-1))%n;
  return i<TEAM_FELDER.length?i:-1;
}
function teamFormVon(t){
  if(teamFelderAktiv()){ const i=teamFeldIndex(t); if(i>=0)return TEAM_FELDER[i]; }
  return TEAM_FORM[t]||(typeof tbFormation!=="undefined"&&tbFormation)||"4+1";
}
/* Fuer die Grund-Einteilung zaehlt das groesste Feld des Tages: jedes Team kommt dort hin. */
function teamPlanForm(){
  if(!teamFelderAktiv())return null;
  let best=null,bestAuf=-1;
  TEAM_FELDER.forEach(k=>{ const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[k])||{tw:true,fieldCount:4}; const auf=f.fieldCount+(f.tw?1:0); if(auf>bestAuf){bestAuf=auf;best=k;} });
  return best;
}
function teamKaderFuer(t){ return teamKader(teamFormVon(t)); }
/* Wie viele stehen bei dieser Spielform gleichzeitig auf dem Feld (Torwart mitgezaehlt)? */
function teamAufDemFeld(t,plan){
  const key=(plan&&teamPlanForm())||teamFormVon(t);
  if(!plan&&teamFelderAktiv()&&teamFeldIndex(t)<0)return 0;   // pausiert diese Runde
  const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[key])||{tw:true,fieldCount:4};
  return f.fieldCount+(f.tw?1:0);
}
/* Spielanteil je Kind in diesem Team: Feldplaetze geteilt durch Teamgroesse (1 = keiner sitzt).
   plan=true rechnet mit dem groessten Feld des Tages (Grund-Einteilung, v480). */
function teamSpielanteil(t,plan){
  const groesse=Object.keys(TEAMS).filter(x=>TEAMS[x]===t).length, auf=teamAufDemFeld(t,plan);
  return {groesse,auf,anteil:groesse?Math.min(1,auf/groesse):1};
}
/* Wohin mit einem Kind ueber die Feldbesetzung hinaus? In das Team, dessen Spielanteil
   gerade am hoechsten ist – dort tut ein Wechsler am wenigsten weh. Gleichstand: das
   groessere Feld (laengeres Spiel, ein Wechsler wirkt mehr). PO-Wahl: „gleicher Spielanteil". */
function teamZielFuerWechsler(plan){
  let ziel=1, best=-1, bestAuf=-1;
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const s=teamSpielanteil(t,plan), a=s.auf/(s.groesse+1), auf=s.auf;
    if(a>best||(a===best&&auf>bestAuf)){ best=a; bestAuf=auf; ziel=t; }
  }
  return ziel;
}
/* Welche Team-Kachel ist aufgeklappt (0 = alle zu). Eigener Zustand, NICHT spieltagTeam:
   ein Team ist immer ausgewaehlt, eine Kachel muss sich trotzdem schliessen lassen. */
let TEAM_KARTE_OFFEN=0;
const TEAM_MAX=4; // PO v389: von 3 auf 4 erweitert
function teamsKey(){ return spieltagRawDate()+"__teams"; }
// Feld-IDs nie aus Namen bauen (Umlaute, Leerzeichen) – der Kader-Index ist eindeutig.
function teamKaderIdx(n){ return KADER.findIndex(k=>k.name===n); }
function teamSpielerId(n){ const k=getKader(n); return k&&k._id; }

/* Kadergröße je Spielform (PO-Vorgabe):
     Funino  – ohne Torwart, 4 Feldspieler
     4+1     – 1 Torwart + 6 Feldspieler
     5+1     – 1 Torwart + 7 Feldspieler
   Torwart darf nur werden, wer im Kader den Haken "🥅 TW" hat. */
function teamKader(key){
  key=key||(typeof tbFormation!=="undefined"&&tbFormation)||"4+1";
  if(key==="funino")return {tw:0,feld:4,gesamt:4};
  if(key==="5+1")   return {tw:1,feld:7,gesamt:8};
  return {tw:1,feld:6,gesamt:7};                 // 4+1
}
function istTorwart(n){ const k=getKader(n); return !!(k&&k.tw); }

/* Wer wird auf die Teams verteilt? Die NOMINIERUNG (nomStatus="dabei") – nicht die
   Eltern-Rückmeldung allein.
   Vorher stand hier nur `nomRsvp[n].status==="zugesagt"`. Der Gedanke war richtig
   („wer nicht zusagt, spielt nicht"), das Ziel aber falsch gewählt: die Nominierung ist
   die Entscheidung des TRAINERS, und sie wird aus den Eltern-Rückmeldungen ohnehin
   vorbelegt (nomLoad). Mit 16 nominierten Kindern, aber nur einer Eltern-Zusage
   verteilte „Automatisch einteilen" genau EIN Kind – es sah aus, als täte der Knopf
   nichts (PO-Meldung v392).
   Seit v393 ist nomStatus global (ein Spieltag, eine Liste). Die bereits Eingeteilten
   bleiben als Sicherheitsnetz drin – falls die Nominierung noch nicht geladen ist. */
function teamZusagen(){
  const namen=new Set();
  const aktive=KADER.filter(k=>k.aktiv!==false);   // aus dem Betrieb genommene Kinder nie aufstellen
  if(typeof nomStatus==="object"&&nomStatus)
    aktive.forEach(k=>{ if(nomStatus[k.name]==="dabei")namen.add(k.name); });
  Object.keys(TEAMS||{}).forEach(n=>{ if(TEAMS[n])namen.add(n); });
  if(!namen.size)  // ganz am Anfang: noch keine Nominierung geladen
    aktive.forEach(k=>{ if(nomRsvp[k.name]&&nomRsvp[k.name].status==="zugesagt")namen.add(k.name); });
  return aktive.map(k=>k.name).filter(n=>namen.has(n));   // Kader-Reihenfolge beibehalten
}
/* Kleinste sinnvolle Teamgröße: alle auf dem Feld plus ein Kind zum Wechseln.
   Darunter steht ein Kind 60 Minuten durch – das ist keine Alternative zum Pausieren. */
function teamMindestKader(){
  const key=(typeof tbFormation!=="undefined"&&tbFormation)||"4+1";
  const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[key])||{tw:true,fieldCount:4};
  const aufDemFeld=f.fieldCount+(f.tw?1:0);
  return Math.min(teamKader().gesamt, aufDemFeld+1);
}
/* Die Kadergröße ist ein ZIEL, keine harte Obergrenze: lieber ein Kind mehr im Team als
   ein Kind auf der Tribüne. Ein Team darf deshalb um eins über die Sollgröße gehen.
   Beispiel 5+1 (Soll 8) mit 15 Zusagen: 8 + 7 statt 8 und sieben Zuschauer. */
/* zusagen: Poolgröße, falls der Aufrufer sie schon kennt. teamsAuto MUSS sie übergeben –
   es leert TEAMS, bevor es hier landet, und teamZusagen() zählt die bereits eingeteilten
   Kinder mit. Ohne den Parameter kam dort kap=1 heraus und die Verteilung endete leer. */
function teamPlatzProTeam(n,zusagen){
  const kd=teamKader(), z=(zusagen==null)?teamZusagen().length:zusagen;
  n=n||TEAM_ANZAHL||1;
  return Math.max(1,Math.min(kd.gesamt+1,Math.ceil(z/n)));
}
function teamAnzahlVorschlag(){
  const kd=teamKader(), z=teamZusagen().length;
  if(!z)return 1;
  let n=Math.min(TEAM_MAX,Math.ceil(z/(kd.gesamt+1)));   // so wenige Teams wie möglich, ohne jemanden auszuschließen
  while(n>1&&Math.floor(z/n)<teamMindestKader())n--; // aber nie unter die spielfähige Größe
  return Math.max(1,n);
}
function teamUeberzaehlig(){
  const z=teamZusagen().length;
  return Math.max(0,z-TEAM_ANZAHL*teamPlatzProTeam());
}

/* Zwei Kennzahlen, damit die Auswahl "wer pausiert" begründbar ist:
   – Trainingsbeteiligung der letzten 6 Wochen (aus AW_DATA, lokal + gesyncte anwesenheit)
   – Spiele und Turniere in dieser Saison (ab 1. Juli), aus den Nominierungen. */
/* ── Zählstichtage (PO, 04.09.2026) ────────────────────────────────────────────
   „Wir müssen die Trainingseinsätze und Einsätze neu berechnen. Es gelten nur die beiden
   Trainings dieser Woche, und Spiele fangen wir neu an zu zählen ab morgen."
   Vorher zählte die Trainingsquote ein rollendes 42-Tage-Fenster und die Einsätze alles
   ab Saisonstart (1. Juli) – darin steckten noch Testtermine aus dem Sommer.
   Nachtrag (PO, gleicher Tag): „Saisonübersicht zählt auch mit den gleichen Angaben. Die
   Saison hat diese Woche erst angefangen." Die Testtermine sind aus der Datenbank
   gelöscht, und saisonStart() liefert jetzt denselben Stichtag – damit rechnet die
   Saison-Übersicht (Quoten, Torschützen, Rollen) auf derselben Grundlage wie die Zahlen
   neben der Nominierung. Neue Saison = die beiden Daten hier hochsetzen, sonst nichts. */
const STATS_AB_TRAINING="2026-08-31";   // Montag dieser Woche
const STATS_AB_SPIEL="2026-09-05";      // erstes gezähltes Spiel: Turnier am 05.09.
let TEAM_TRAININGSTAGE=null;            // Termine vom Typ „training" ab dem Stichtag (null = noch nicht geladen)
function teamTrainingsQuote(name){
  if(typeof AW_DATA==="undefined")return null;
  let da=0,gesamt=0;
  Object.keys(AW_DATA).forEach(d=>{
    if(d<STATS_AB_TRAINING)return;
    /* Nur echte Trainings: am Spiel- oder Turniertag wird auch eine Anwesenheit
       geführt, und die zählte bisher in die Trainingsquote hinein. Solange die
       Terminliste nicht geladen ist, zählen wie bisher alle Tage ab dem Stichtag. */
    if(TEAM_TRAININGSTAGE&&!TEAM_TRAININGSTAGE.has(d))return;
    const tag=AW_DATA[d]; if(!tag||!tag[name])return;
    gesamt++; if(tag[name].da)da++;
  });
  return gesamt?{da,gesamt}:null;
}
/* Saisonstart = Trainings-Stichtag. Frueher rechnete das den 1. Juli aus; seit die
   Saison real diese Woche beginnt, waere jeder fruehere Tag nur noch leerer Zeitraum. */
function saisonStart(){ return STATS_AB_TRAINING; }
function spieleAb(){ return STATS_AB_SPIEL; }
/* Trainingstage ab dem Stichtag – eine Quelle fuer die Quote neben der Nominierung
   UND fuer die Saison-Uebersicht in views.js (Welle 1, ruft nur ueber typeof-Wache).
   Einmal geladen, dann gemerkt; offline bleibt sie null und es zaehlen wie bisher
   alle Tage ab dem Stichtag. */
async function trainingstageLaden(){
  if(TEAM_TRAININGSTAGE)return TEAM_TRAININGSTAGE;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?typ=eq.training&datum=gte.${STATS_AB_TRAINING}&select=datum`,{headers:sbAuthHeaders()});
    if(r.ok)TEAM_TRAININGSTAGE=new Set(((await r.json())||[]).map(x=>x.datum));
  }catch(e){}
  return TEAM_TRAININGSTAGE;
}
/* Synchroner Blick auf dasselbe Set – fuer die Tabellen in boot.js, die ohne await
   zeichnen. null heisst „noch nicht geladen", nicht „keine Trainingstage". */
function trainingstageSet(){ return TEAM_TRAININGSTAGE; }
async function teamStatsLoad(){
  TEAM_STATS={};
  await trainingstageLaden();   // Trainingstage ab dem Stichtag – fuer die Quote neben der Nominierung
  const ab=STATS_AB_SPIEL, bis=spieltagRawDate();
  let termine=[], noms=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&datum=gte.${ab}&datum=lt.${bis}&select=datum`,{headers:sbAuthHeaders()});
    if(r.ok)termine=await r.json();
  }catch(e){}
  /* Kein gezaehlter Spieltag (Saisonanfang / frisch gesetzter Stichtag): dann ist die
     Zahl 0 und nicht „unbekannt" – „– Einsätze" haette wie fehlende Daten ausgesehen. */
  if(!termine.length){ KADER.forEach(k=>{TEAM_STATS[k.name]={einsaetze:0};}); return; }
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=gte.${ab}&select=datum,data`,{headers:sbAuthHeaders()});
    if(r.ok)noms=await r.json();
  }catch(e){}
  const spieltage=new Set(termine.map(t=>t.datum));
  const gezaehlt={};   // name -> Set(basisdatum), damit Adler 1 und 2 nicht doppelt zaehlen
  noms.forEach(row=>{
    const basis=String(row.datum).replace(/__t\d+$/,"").replace(/__teams$/,"");
    if(!spieltage.has(basis)||/__teams$/.test(row.datum))return;
    Object.entries(kidMapFromIds(row.data||{})).forEach(([name,status])=>{
      if(name==="_ovr"||status!=="dabei")return;
      (gezaehlt[name]=gezaehlt[name]||new Set()).add(basis);
    });
  });
  KADER.forEach(k=>{ TEAM_STATS[k.name]={einsaetze:(gezaehlt[k.name]||new Set()).size}; });
}
function teamStaerke(n){
  const s=(typeof DB!=="undefined"&&DB[n]&&DB[n][DB[n].length-1])||null;
  return (s&&s.total_score!=null)?s.total_score:-1;  // unbewertet ans Ende, wird zuletzt verteilt
}
/* Wer pausiert, wenn mehr zugesagt haben als in volle Teams passen?
   Vorschlag nach Fairness: wer die meisten Saison-Einsätze hat, danach wer seltener im
   Training war. Der Trainer entscheidet – die Zahlen stehen daneben. Torwarte werden nur
   dann herausgenommen, wenn danach noch genug für alle Teams übrig sind. */
function teamPausenReihenfolge(pool){
  const q=n=>{const t=teamTrainingsQuote(n);return t&&t.gesamt?t.da/t.gesamt:1;};   // ohne Daten: als "immer da" behandeln
  const e=n=>(TEAM_STATS[n]&&TEAM_STATS[n].einsaetze)||0;
  return pool.slice().sort((a,b)=> e(b)-e(a) || q(a)-q(b) || teamStaerke(a)-teamStaerke(b));
}
/* Genau ein Torwart je Team (nur Kinder mit TW-Haken), dann die Feldplätze auffüllen:
   stärkstes Kind zuerst in das aktuell schwächste Team. */
function teamsAuto(){
  const n=TEAM_ANZAHL;
  let pool=teamZusagen();
  TEAMS={};
  if(!pool.length){ teamsRender(); return; }
  /* v479: jedes Team hat seine Spielform. Reihenfolge (PO-Wahl):
     1) Torwart-Kinder zuerst auf die Teams mit Torwart-Spielform, je eines, staerkster zuerst;
     2) Feldplaetze fuellen: staerkstes Kind ins momentan schwaechste Team mit freiem Platz;
     3) alle weiteren als Wechsler dorthin, wo der Spielanteil am hoechsten bleibt
        (teamZielFuerWechsler) – 9 Kinder auf 4+1 und FUNiño ergibt 6 + 3 (83 % / 100 %),
        10 Kinder 6 + 4. Es bleibt niemand uebrig (v461: wer dabei ist, spielt mit). */
  const wert=x=>Math.max(0,teamStaerke(x));           // unbewertet zählt als 0
  const summe=new Array(n+1).fill(0);
  const twPlatz=new Array(n+1).fill(0), feldPlatz=new Array(n+1).fill(0);
  const planKey=teamPlanForm();   // v480: mit Feldern zaehlt fuer jedes Team das groesste Feld – alle kommen dort hin
  for(let t=1;t<=n;t++){ const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[planKey||teamFormVon(t)])||{tw:true,fieldCount:4}; twPlatz[t]=f.tw?1:0; feldPlatz[t]=f.fieldCount; }
  const einsetzen=(name,t,alsTw)=>{TEAMS[name]=t;summe[t]+=wert(name);if(alsTw)twPlatz[t]--;else feldPlatz[t]--;};

  // 1) Torwarte: je Team mit Torwart-Spielform einer, stärkster zuerst
  const tw=pool.filter(istTorwart).sort((a,b)=>teamStaerke(b)-teamStaerke(a));
  for(let t=1;t<=n&&tw.length;t++){ if(twPlatz[t]>0)einsetzen(tw.shift(),t,true); }
  /* Unbesetzte Torwart-Plätze werden zu Feldplätzen. Sonst blieb ein Platz je Team
     reserviert, obwohl gar kein Kind mit TW-Haken zugesagt hat – und ein Kind stand
     grundlos daneben. */
  for(let t=1;t<=n;t++){ if(twPlatz[t]>0){ feldPlatz[t]+=twPlatz[t]; twPlatz[t]=0; } }
  // 2) Feldspieler: stärkstes Kind ins momentan schwächste Team mit freiem Feldplatz
  const rest=pool.filter(x=>!TEAMS[x]).sort((a,b)=>teamStaerke(b)-teamStaerke(a));
  const groesse=t=>Object.keys(TEAMS).filter(x=>TEAMS[x]===t).length;
  rest.forEach(name=>{
    let ziel=0;
    for(let t=1;t<=n;t++){
      if(feldPlatz[t]<=0)continue;
      /* v480: mit Feldern (feste Teams wandern ueber alle Felder) zaehlt zuerst die gleiche
         Teamgroesse, dann die Staerke – sonst fuellte die Reihenfolge Team 1 zuerst (5 + 3).
         Ohne Felder wie bisher: staerkstes Kind ins schwaechste Team. */
      if(!ziel)ziel=t;
      else if(planKey?(groesse(t)<groesse(ziel)||(groesse(t)===groesse(ziel)&&summe[t]<summe[ziel])):(summe[t]<summe[ziel]))ziel=t;
    }
    // 3) Feld voll: als Wechsler dorthin, wo der Spielanteil am höchsten bleibt
    if(!ziel){ ziel=teamZielFuerWechsler(!!planKey); TEAMS[name]=ziel; summe[ziel]+=wert(name); return; }
    einsetzen(name,ziel,false);
  });
  if(teamFelderAktiv()){ TEAM_LEIH={}; teamAushilfeBerechnen(); }   // v480: Runde 1 sofort spielfaehig
  teamsRender();
}
/* ── v480: Felder und Runden ─────────────────────────────────────────────────── */
function teamAushilfeRueckgabe(){
  Object.keys(TEAM_LEIH).forEach(n=>{ if(TEAM_LEIH[n])TEAMS[n]=TEAM_LEIH[n]; });
  TEAM_LEIH={};
}
function teamHatTorwart(t){ return Object.keys(TEAMS).some(n=>TEAMS[n]===t&&istTorwart(n)); }
/* Wer hilft aus? Aus dem Team mit der meisten Bank (oder dem, das diese Runde pausiert).
   Braucht das Zielfeld einen Torwart und das Zielteam hat keinen, kommt ein Torwart-Kind –
   so wechseln sich die Torwart-Kinder ab (PO-Wahl). Sonst das Kind mit den wenigsten
   Saison-Einsaetzen; der einzige Torwart eines Teams, das selbst einen braucht, bleibt. */
function teamLeihKandidat(ziel,twGewuenscht){
  let geber=0,best=-1;
  for(let t=1;t<=TEAM_ANZAHL;t++){
    if(t===ziel)continue;
    const s=teamSpielanteil(t), pausiert=teamFeldIndex(t)<0;
    const bank=pausiert?s.groesse:s.groesse-s.auf;
    if(bank<=0)continue;
    const a=pausiert?2:s.anteil;
    if(a>best){best=a;geber=t;}
  }
  if(!geber)return null;
  const m=Object.keys(TEAMS).filter(n=>TEAMS[n]===geber&&!TEAM_LEIH[n]);
  if(!m.length)return null;
  const tw=m.filter(istTorwart);
  if(twGewuenscht&&tw.length)return tw[0];
  const gi=teamFeldIndex(geber);
  const geberBrauchtTw=gi>=0&&!!((typeof FORMATIONS!=="undefined"&&FORMATIONS[TEAM_FELDER[gi]])||{tw:true}).tw;
  const kand=m.filter(n=>!(istTorwart(n)&&geberBrauchtTw&&tw.length===1));
  const pool=kand.length?kand:m;
  return teamPausenReihenfolge(pool).slice().reverse()[0];   // wenigste Einsaetze zuerst
}
/* Fehlende Kinder je Feld dieser Runde auffuellen. Gibt die Wechsel als Text zurueck. */
function teamAushilfeBerechnen(){
  const meldungen=[];
  if(!teamFelderAktiv())return meldungen;
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const i=teamFeldIndex(t); if(i<0)continue;
    const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[TEAM_FELDER[i]])||{tw:true,fieldCount:4};
    let fehlt=teamAufDemFeld(t)-Object.keys(TEAMS).filter(n=>TEAMS[n]===t).length;
    let schutz=8;
    while(fehlt>0&&schutz-->0){
      const kid=teamLeihKandidat(t,f.tw&&!teamHatTorwart(t));
      if(!kid)break;
      TEAM_LEIH[kid]=TEAMS[kid]; TEAMS[kid]=t; fehlt--;
      meldungen.push(`${kid}: Adler ${TEAM_LEIH[kid]} → Adler ${t}`);
    }
  }
  return meldungen;
}
function teamRundeSetzen(r){
  teamAushilfeRueckgabe();
  TEAM_RUNDE=Math.max(1,parseInt(r)||1);
  const m=teamAushilfeBerechnen();
  teamsSpeichern(); teamsRender(); spieltagTeamKartenRender();
  if(typeof spieltagTeam!=="undefined")teamFormAnwenden(spieltagTeam);
  teamsSyncBald(); if(typeof nomApplyToTools==="function")nomApplyToTools();
  toast(m.length?`Runde ${TEAM_RUNDE} · Aushilfe: ${m.join(" · ")}`:`Runde ${TEAM_RUNDE}`);
}
function teamFelderAendern(felder){
  TEAM_FELDER=(felder||[]).filter(k=>typeof FORMATIONS==="undefined"||FORMATIONS[k]).slice(0,4);
  teamAushilfeRueckgabe(); TEAM_RUNDE=1;
  teamsAuto(); teamsSpeichern(); spieltagTeamKartenRender();
  if(typeof spieltagTeam!=="undefined")teamFormAnwenden(spieltagTeam);
}
function teamFeldSetzen(i,key){ const f=TEAM_FELDER.slice(); f[i]=key; teamFelderAendern(f); }
function teamFeldPlus(){ if(TEAM_FELDER.length>=4)return; teamFelderAendern(TEAM_FELDER.concat([TEAM_FELDER.length?"funino":"4+1"])); }
function teamFeldWeg(i){ const f=TEAM_FELDER.slice(); f.splice(i,1); teamFelderAendern(f); }
/* v479: Spielform eines Teams setzen – verteilt neu, wie ein Wechsel der Teamzahl. */
function teamFormSet(t,key){
  if(typeof FORMATIONS!=="undefined"&&!FORMATIONS[key])return;
  TEAM_FORM[t]=key;
  teamsAuto(); teamsSpeichern(); teamsRender(); spieltagTeamKartenRender();
  if(typeof spieltagTeam!=="undefined"&&spieltagTeam===t)teamFormAnwenden(t);
}
/* Die Werkzeuge in der Team-Kachel (Rotation, Match-Uhr, Aufstellung) lesen tbFormation –
   beim Wechsel auf ein Team gilt dessen Spielform. */
function teamFormAnwenden(t){
  const key=teamFormVon(t);
  if(typeof taktikSetFormation==="function")taktikSetFormation(key); else if(typeof tbFormation!=="undefined")tbFormation=key;
}
/* v479 – PO: „Bei den Anwesenheiten der Kinder beim Spieltag immer ‚Spielt' aktivieren, wenn
   Dabei der Status ist." Auch nach dem Laden: wer dabei ist und in keinem Team steht (z. B.
   nachtraeglich uebernommene Nominierungen), kommt in ein Team. */
function teamsNachziehen(){
  if(typeof nomStatus!=="object"||!nomStatus)return 0;
  let n=0;
  KADER.filter(k=>k.aktiv!==false&&nomStatus[k.name]==="dabei"&&!TEAMS[k.name]).forEach(k=>{ if(teamPlatzEinsortieren(k.name))n++; });
  return n;
}
function teamSetAnzahl(n){
  TEAM_ANZAHL=Math.max(1,Math.min(TEAM_MAX,parseInt(n)||1));
  TEAMS={};
  // Zuteilungen zu weggefallenen Teams aufräumen, sonst hängen Trainer an einem Team,
  // das es nicht mehr gibt – und tauchen später wieder auf, wenn man wieder hochstellt.
  Object.keys(TEAM_TRAINER).forEach(t=>{ if(Number(t)>TEAM_ANZAHL)delete TEAM_TRAINER[t]; });
  Object.keys(TEAM_FORM).forEach(t=>{ if(Number(t)>TEAM_ANZAHL)delete TEAM_FORM[t]; });
  TEAM_RUNDE=1; TEAM_LEIH={};   // v480: neue Teamzahl, neue Runde 1 (teamsAuto rechnet die Aushilfe neu)
  const wechselNoetig=(typeof spieltagTeam!=="undefined"&&spieltagTeam>TEAM_ANZAHL);
  teamsAuto();          // PO v392: neue Teamzahl -> sofort neu verteilen, nicht leer stehen lassen
  teamsSpeichern();
  teamsRender(); spieltagTeamKartenRender();
  // Quest-Ziele wachsen mit der Teamzahl mit – die Sektion muss die neuen Zahlen zeigen.
  if(typeof questSeedDone==="function")questSeedDone();
  if(typeof questPanelRender==="function")questPanelRender();
  if(typeof atRender==="function"&&document.getElementById("action-panel"))atRender();
  // Sah man gerade „Adler 3" und stellt auf 2 Teams, muss die Ansicht darunter mit
  // umschalten – sonst zeigt sie weiter Daten eines Teams, das nicht mehr existiert.
  if(wechselNoetig&&typeof spieltagSetTeam==="function")spieltagSetTeam(1);
}
/* Ein Trainer gehört zu genau EINEM Team: er kann nicht an zwei Feldern gleichzeitig
   stehen, und in der Eltern-Info stünde er sonst doppelt. Zuteilen zu Team B nimmt ihn
   deshalb aus Team A heraus. Erneutes Antippen im eigenen Team entfernt ihn. */
function teamTrainerToggle(t,name){
  const drin=((TEAM_TRAINER[t]||[]).indexOf(name)>=0);
  Object.keys(TEAM_TRAINER).forEach(k=>{ TEAM_TRAINER[k]=(TEAM_TRAINER[k]||[]).filter(x=>x!==name); });
  if(!drin)TEAM_TRAINER[t]=(TEAM_TRAINER[t]||[]).concat(name);
  Object.keys(TEAM_TRAINER).forEach(k=>{ if(!TEAM_TRAINER[k].length)delete TEAM_TRAINER[k]; });
  teamsSpeichern(); teamsRender(); spieltagTeamKartenRender();
  const box=document.getElementById("teamtr-liste"); if(box)teamTrainerModalFill(t);
}
/* Wer ist zuteilbar? Der ganze Trainerstab – auch wer nicht mittrainiert (siehe
   trainerstabNamen in core.js). Wer für diesen Termin zugesagt hat, wird hervorgehoben:
   eingeteilt wird, wer da ist. */
async function teamStabLoad(){
  let status={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(spieltagRawDate())}&select=trainer_status&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){ const rows=await r.json(); status=(rows[0]||{}).trainer_status||{}; }
  }catch(e){}
  const alle=(typeof trainerstabNamen==="function")?trainerstabNamen(status)
            :(((typeof TRAINER!=="undefined"&&TRAINER)||[]).slice());
  TEAM_STAB=alle.map(n=>({name:n,zusage:status[n]||""}));
}
function teamTrainerOpen(t){
  document.getElementById("teamtr-modal")?.remove();
  const m=document.createElement("div"); m.id="teamtr-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Trainer für Adler "+t);
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("teamtr-modal","🧢","Trainer für Adler "+t,"Antippen teilt zu · ein Trainer gehört zu einem Team","var(--fam-spieltag)")}
    <div id="teamtr-liste"></div>
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="document.getElementById('teamtr-modal').remove()">Fertig</button>
  </div>`;
  document.body.appendChild(m);
  teamTrainerModalFill(t);
}
function teamTrainerModalFill(t){
  const el=document.getElementById("teamtr-liste"); if(!el)return;
  if(!TEAM_STAB.length){ el.innerHTML='<div style="font-size:12px;color:var(--text3)">Kein Trainerstab geladen.</div>'; return; }
  el.innerHTML=TEAM_STAB.map(s=>{
    const meins=((TEAM_TRAINER[t]||[]).indexOf(s.name)>=0);
    let anderes=""; Object.keys(TEAM_TRAINER).forEach(k=>{ if(Number(k)!==t&&(TEAM_TRAINER[k]||[]).indexOf(s.name)>=0)anderes="Adler "+k; });
    const zus=s.zusage==="ja"?"✅ dabei":s.zusage==="unsicher"?"🤔 unsicher":s.zusage==="nein"?"❌ nicht dabei":"– keine Rückmeldung";
    return `<button onclick="teamTrainerToggle(${t},'${jsq(s.name)}')" aria-pressed="${meins?"true":"false"}"
      style="width:100%;min-height:52px;display:flex;align-items:center;gap:10px;text-align:left;margin-bottom:6px;padding:8px 12px;border:1px solid var(--rand-bedien);${meins?"border-color:transparent;background:var(--fam-spieltag);color:#fff;":"background:var(--surface2);color:var(--text);"}border-radius:12px;font-family:inherit;cursor:pointer">
      <span style="font-size:17px">${meins?"✓":"🧢"}</span>
      <span style="flex:1;min-width:0">
        <span style="display:block;font-size:13.5px;font-weight:800">${esc(s.name)}</span>
        <span style="display:block;font-size:11px;${meins?"opacity:.9":"color:var(--text3)"}">${zus}${anderes?" · steht bei "+anderes:""}</span>
      </span></button>`;
  }).join("");
}
/* Je Team eine Kachel – sie ERSETZT den Umschalter aus v389 (PO: „jedes Team braucht
   eine eigene Kachel mit dem Kader und allen weiteren Infos").
   Kniff: die Panels darunter (Nominierung, Uhr, Rotation, Ticker …) gibt es im
   Grundgeruest je EINMAL. Statt sie zu vervielfaeltigen – was jede Element-ID
   vervierfacht haette – wird der gemeinsame Block #spieltag-teaminhalt per appendChild
   in die aufgeklappte Kachel geschoben. IDs bleiben einmalig, Handler und laufende
   Uhren ueberleben den Umzug.
   Bei EINEM Team gibt es keine Kacheln: der Inhalt steht direkt da. */
function spieltagTeamKartenRender(){
  const box=document.getElementById("spieltag-teamkarten");
  const inhalt=document.getElementById("spieltag-teaminhalt");
  if(!box||!inhalt)return;
  // Zuerst in Sicherheit bringen: box.innerHTML wuerde den Inhalt sonst mitreissen,
  // wenn er in einer der Kacheln haengt.
  const heimat=box.parentElement;
  if(heimat&&inhalt.parentElement!==heimat)heimat.insertBefore(inhalt,box.nextSibling);
  teamKaderRender();
  if(TEAM_ANZAHL<=1){ box.innerHTML=""; inhalt.hidden=false; teamPhasenLabel(0); return; }

  /* Welche Kachel ist offen? TEAM_KARTE_OFFEN=0 heisst: alle zu. Das ist bewusst NICHT
     dasselbe wie spieltagTeam – das Team bleibt ausgewaehlt (Uhr, Ticker, Aktionen haengen
     daran), nur die Kachel ist zugeklappt. Vorher war „offen" an spieltagTeam gekoppelt,
     und weil immer ein Team ausgewaehlt ist, liess sich keine Kachel schliessen. */
  const aktiv=TEAM_KARTE_OFFEN&&TEAM_KARTE_OFFEN<=TEAM_ANZAHL?TEAM_KARTE_OFFEN:0;
  inhalt.hidden=!aktiv;
  teamPhasenLabel(aktiv);
  box.innerHTML=Array.from({length:TEAM_ANZAHL},(_,i)=>{
    const n=i+1, tr=(TEAM_TRAINER[n]||[]);
    const kinder=Object.keys(TEAMS).filter(k=>TEAMS[k]===n).length;
    const auf=(n===aktiv);
    /* Marke nur, wenn dieses Team gerade WIRKLICH spielt. „Uhr & Ticker" stand vorher
       dauerhaft an Adler 1 und las sich wie ein Eigenname statt wie ein Zustand
       (PO v399: „Warum steht uhr & ticker nur bei team Adler 1?"). Solange keine Uhr
       läuft, ist die Auswahl auch belanglos: das Antippen einer Kachel wechselt sie. */
    const laeuft=(typeof mcState!=="undefined"&&mcState&&
                  ["running","paused","halftime"].indexOf(mcState.clock_status)>=0);
    const gewaehlt=(typeof spieltagTeam!=="undefined"&&n===spieltagTeam&&laeuft);
    return `<div class="abschnitt" style="padding:0;overflow:hidden;${auf?"border-color:var(--fam-spieltag);":""}">
      <button onclick="spieltagKarteOeffnen(${n})" aria-expanded="${auf?"true":"false"}"
        style="width:100%;min-height:56px;display:flex;align-items:center;gap:10px;text-align:left;padding:12px 14px;border:none;border-left:4px solid var(--fam-spieltag);background:${auf?"var(--surface2)":"var(--surface)"};color:var(--text);font-family:inherit;cursor:pointer">
        <span style="font-size:20px">⚽</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:14px;font-weight:900">Adler ${n}${gewaehlt&&!auf?` <span style="font-size:10px;font-weight:700;color:var(--green);background:var(--green-bg);border-radius:8px;padding:1px 7px;vertical-align:1px">Spiel läuft</span>`:""}</span>
          <span style="display:block;font-size:11.5px;color:var(--text2)">${kinder} Kind${kinder===1?"":"er"} · ${
            tr.length?esc(tr.join(", ")):'<span style="color:var(--amber);font-weight:700">kein Trainer</span>'}</span>
        </span>
        <span style="font-size:15px;color:var(--text3)">${auf?"▴":"▾"}</span>
      </button>
      <div id="spieltag-karte-inhalt-${n}" style="padding:0 12px 12px"></div>
    </div>`;
  }).join("");
  const ziel=document.getElementById("spieltag-karte-inhalt-"+aktiv);
  if(ziel)ziel.appendChild(inhalt);
}
/* Antippen einer Kachel: offene Kachel zu, geschlossene auf. Beim Wechsel auf ein anderes
   Team laedt spieltagSetTeam die Daten neu und rendert ueber teamsLoad die Kacheln mit –
   deshalb dort nur den Merker setzen und zurueck.
   PO v393: „teams lässt sich nicht mehr einklappen. Geht nur zu wenn man das andere Team
   aufklappt." Ursache war, dass „offen" an spieltagTeam hing – und ein Team ist immer
   ausgewaehlt. Jetzt ist das Aufklappen ein eigener Zustand. */
function spieltagKarteOeffnen(n){
  if(TEAM_KARTE_OFFEN===n){ TEAM_KARTE_OFFEN=0; spieltagTeamKartenRender(); return; }
  TEAM_KARTE_OFFEN=n;
  if(typeof spieltagTeam!=="undefined"&&n!==spieltagTeam&&typeof spieltagSetTeam==="function"){ spieltagSetTeam(n); return; }
  spieltagTeamKartenRender();
  teamInhaltFuellen();   // erst jetzt sind die Panels sichtbar – und müssen gefüllt werden
}
// „· Adler 2" hinter die Phasen-Titel schreiben; 0 oder ein einziges Team = kein Zusatz.
function teamPhasenLabel(n){
  const txt=(n&&TEAM_ANZAHL>1)?"· Adler "+n:"";
  document.querySelectorAll(".mt-team-tag").forEach(el=>{el.textContent=txt;});
}
/* Der Kader DIESES Teams – nur zum Nachsehen. Geändert wird eine Ebene höher unter
   „Teams festlegen"; hier stünde derselbe Editor sonst mehrfach nebeneinander. */
function teamKaderRender(){
  const box=document.getElementById("team-kader-panel"); if(!box)return;
  const t=(typeof spieltagTeam!=="undefined")?spieltagTeam:1;
  const namen=(typeof nominierteSpieler==="function")?nominierteSpieler():[];
  const tr=(TEAM_TRAINER[t]||[]);
  const kopf=`<div style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${namen.length} Kind${namen.length===1?"":"er"}${TEAM_ANZAHL>1?" in Adler "+t:""} · ${
    tr.length?"🧢 "+esc(tr.join(", ")):'<span style="color:var(--amber);font-weight:700">noch kein Trainer zugeteilt</span>'}</div>`;
  if(!namen.length){
    box.innerHTML=kopf+`<div style="font-size:11.5px;color:var(--text3)">Noch niemand eingeteilt – das passiert oben unter „Teams festlegen".</div>`;
    return;
  }
  box.innerHTML=kopf+`<div style="display:flex;flex-wrap:wrap;gap:6px">${namen.map(n=>
    `<span style="font-size:12px;background:var(--surface2);border-radius:12px;padding:4px 10px">${getKader(n)&&getKader(n).nr?getKader(n).nr+" ":""}${esc(n)}${istTorwart(n)?" 🥅":""}</span>`).join("")}</div>
    <button class="btn btn-sm" style="margin-top:10px" onclick="document.getElementById('mt-phase-vor').open=true;document.getElementById('mt-phase-vor').scrollIntoView({behavior:'smooth',block:'start'})"><i class="ti ti-pencil"></i>Einteilung ändern</button>`;
}
/* Ein Kind, das gerade auf „dabei" gesetzt wurde, gehört sofort in ein Team.
   PO-Meldung v395: „alle Kinder werden wenn ich sie dabei anklicke unten drunter auf
   pausiert gesetzt. Das macht keinen sinn." Genau so war es: nomSet setzte nur den
   Status, TEAMS blieb leer – und „kein Team" zeichnet die Zeile als ⏸ pausiert. Wer
   zusagt, spielt erst mal mit; pausieren ist eine Entscheidung, kein Ausgangszustand.
   Gefüllt wird das momentan kleinste Team mit freiem Platz. Sind alle voll, bleibt das
   Kind ohne Team – dann stimmt „pausiert" auch, und der Hinweis oben erklärt es. */
/* „Wenn ein Kind auf DABEI gesetzt ist, dann automatisch SPIELT MIT. Der Trainer kann
   das dann haendisch aendern." (PO v461) Bis dahin sortierte diese Funktion nur ein,
   solange die Sollstaerke Platz liess – bei 14 Zusagen und einem Team standen acht
   Kinder als „Pausiert" da, ohne dass es jemand entschieden haette. Jetzt landet jedes
   zugesagte Kind im kleinsten Team; dass die Mannschaft dann ueber der Sollstaerke ist,
   sagt der Hinweis darueber (teamsRender) – Pause ist eine Entscheidung, kein Restposten. */
function teamPlatzEinsortieren(name){
  if(TEAMS[name])return false;
  /* v479: erst ein Team mit freiem Feldplatz (Torwart-Kind bevorzugt auf ein Team mit
     Torwart-Spielform ohne Torwart), sonst dorthin, wo der Spielanteil am hoechsten bleibt. */
  let ziel=0;
  if(istTorwart(name)){
    for(let t=1;t<=TEAM_ANZAHL&&!ziel;t++){ const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[teamFormVon(t)])||{tw:true}; if(f.tw&&!Object.keys(TEAMS).some(x=>TEAMS[x]===t&&istTorwart(x)))ziel=t; }
  }
  const plan=teamFelderAktiv();
  if(!ziel){ for(let t=1;t<=TEAM_ANZAHL&&!ziel;t++){ const s=teamSpielanteil(t,plan); if(s.groesse<s.auf)ziel=t; } }
  if(!ziel)ziel=teamZielFuerWechsler(plan);
  TEAMS[name]=ziel;
  return true;
}
function teamSet(name,nr){
  if(nr)TEAMS[name]=nr; else delete TEAMS[name];
  teamsRender(); spieltagTeamKartenRender();
  teamsSpeichern();     // Handkorrektur ist eine Entscheidung, kein Vorschlag
  teamsSyncBald();      // … und die Eltern-Ansicht zieht nach
  if(typeof nomApplyToTools==="function")nomApplyToTools();
}

async function teamsLoad(){
  TEAMS={}; TEAM_ANZAHL=teamAnzahlVorschlag(); TEAM_TRAINER={}; TEAM_FORM={}; TEAM_FELDER=[]; TEAM_RUNDE=1; TEAM_LEIH={};
  await teamStabLoad();
  await Promise.all([teamStatsLoad(),teamGruendeLaden(spieltagRawDate())]);   // Kennzahlen für die Pausen-Entscheidung
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(teamsKey())}&select=data`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      if(rows.length&&rows[0].data){
        const d=kidMapFromIds(rows[0].data);
        if(d._anzahl)TEAM_ANZAHL=d._anzahl;
        if(d._trainer&&typeof d._trainer==="object")TEAM_TRAINER=d._trainer;
        if(d._form&&typeof d._form==="object")TEAM_FORM=d._form;   // v479: Spielform je Team
        if(Array.isArray(d._felder))TEAM_FELDER=d._felder.slice(0,4);   // v480: Felder des Festivals
        if(d._runde)TEAM_RUNDE=Math.max(1,parseInt(d._runde)||1);
        if(d._leih&&typeof d._leih==="object"){ TEAM_LEIH={}; Object.keys(d._leih).forEach(id=>{ const n=(typeof kidName==="function"&&/^\d+$/.test(String(id)))?kidName(id):id; if(n)TEAM_LEIH[n]=d._leih[id]; }); }
        // ALLE Sonderschluessel raus, sonst haelt die App "_trainer" fuer ein Kind
        delete d._anzahl; delete d._trainer; delete d._form; delete d._felder; delete d._runde; delete d._leih;
        TEAMS=d;
      }
    }
  }catch(e){}
  /* PO v392: „Die Einteilung der Kinder auf die Teams muss auch automatisch erfolgen und
     dann noch händisch geändert werden können."
     Gibt es noch keine gespeicherte Einteilung, wird sie hier direkt vorgeschlagen – der
     Trainer findet die Teams also bereits gefüllt vor und korrigiert nur noch.
     Bewusst NICHT gespeichert: der Vorschlag wird erst mit „In die Nominierungen
     übertragen" verbindlich, sonst überschriebe ein blosses Öffnen des Spieltags eine
     Einteilung, die gerade jemand anders von Hand gemacht hat.
     teamsAuto() rendert selbst – deshalb hier nur der Fallback-Pfad. */
  if(typeof spieltagTeam!=="undefined")teamFormAnwenden(spieltagTeam);   // v479: Werkzeuge lesen die Spielform dieses Teams
  if(!Object.keys(TEAMS).length&&teamZusagen().length){ teamsAuto(); spieltagTeamKartenRender(); return; }
  teamsNachziehen();   // v479: Dabei heisst spielt mit – auch fuer Kinder, die nach der Einteilung dazukamen
  teamsRender(); spieltagTeamKartenRender();
}
/* Aushilfen nach kader.id, wie die Kinder selbst – Namen gehoeren nicht in die Datenbank. */
function _teamLeihIds(){
  const o={}; Object.keys(TEAM_LEIH).forEach(n=>{ const id=(typeof kidId==="function")?kidId(n):null; o[id!=null?id:n]=TEAM_LEIH[n]; }); return o;
}
async function teamsSpeichern(){
  try{
    await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum:teamsKey(),data:kidMapToIds({_anzahl:TEAM_ANZAHL,_trainer:TEAM_TRAINER,_form:TEAM_FORM,_felder:TEAM_FELDER,_runde:TEAM_RUNDE,_leih:_teamLeihIds(),...TEAMS})})});
  }catch(e){}
}
/* Die Team-Zeilen ("<datum>", "<datum>__t2", …) sind ABGELEITET aus der globalen
   Nominierung und der Einteilung. Eltern-Ansicht und Liveticker lesen sie über die RPCs,
   deshalb dürfen sie nicht hinterherhinken.
   Bis v392 schrieb jeder Tipp in der Nominierung direkt die Team-Zeile, die Eltern sahen
   die Änderung also sofort. Seit die Nominierung global ist (v393), wird sie hier
   nachgezogen – gebündelt, damit nicht jeder einzelne Tipp vier Anfragen auslöst.
   „offen" für dabei-aber-noch-nicht-eingeteilt ist Absicht: die Eltern lesen dann
   „Aufstellung wählt Trainer noch" statt fälschlich „pausiert".
   _ovr enthält alle Namen – Altbestand, der die Eltern-Zusagen nicht wieder über die
   Einteilung legen soll. */
let _teamSyncId=null;
function teamsSyncBald(){ clearTimeout(_teamSyncId); _teamSyncId=setTimeout(()=>{ teamsZeilenSchreiben(); },900); }
async function teamsZeilenSchreiben(){
  if(!sbToken())return false;
  const d=spieltagRawDate(), alle=KADER.map(k=>k.name);
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const key=t>1?`${d}__t${t}`:d;
    const data={_ovr:kidListToIds(alle)};
    alle.forEach(n=>{
      data[n]=(TEAMS[n]===t)?"dabei"
             :(nomStatus[n]==="dabei"&&!TEAMS[n])?"offen":"nicht";
    });
    try{
      const r=await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",
        headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
        body:JSON.stringify({datum:key,data:kidMapToIds(data)})});
      if(!r.ok)return false;
    }catch(e){ return false; }
  }
  return true;
}
async function teamsAnwenden(){
  if(!Object.keys(TEAMS).length){toast("Erst einteilen","err");return;}
  if(!confirm(`Einteilung auf ${TEAM_ANZAHL} Team${TEAM_ANZAHL>1?"s":""} übertragen?\n\nDie Nominierung der betroffenen Teams wird überschrieben.`))return;
  clearTimeout(_teamSyncId);   // die gebündelte Sicherung ist hier gegenstandslos
  await teamsSpeichern();
  if(!await teamsZeilenSchreiben()){ toast("Übertragen fehlgeschlagen","err"); return; }
  await teamGruendeSpeichern(spieltagRawDate());
  toast(`Einteilung übertragen ✓`);
  await nomLoad();   // alles neu laden -> Rotation, Aktionen, Aufstellung ziehen nach
}

/* Begründungen der pausierenden Kinder sichern. Wer wieder nominiert ist, verliert seinen
   alten Hinweis – sonst sähen die Eltern nächste Woche noch die Begründung von heute. */
async function teamGruendeSpeichern(datum){
  const pool=teamZusagen();
  const pausiert=pool.filter(n=>!TEAMS[n]);
  TEAM_GRUND={};
  const rows=[];
  pausiert.forEach(n=>{
    const el=document.getElementById("nh-"+teamKaderIdx(n));
    const grund=(el?.value||"").trim();
    TEAM_GRUND[n]=grund;
    const sid=teamSpielerId(n);
    if(sid)rows.push({datum,spieler_id:sid,grund:grund||null,updated_at:new Date().toISOString()});
  });
  const wiederDabei=KADER.map(k=>k._id).filter(id=>id&&!rows.some(r=>r.spieler_id===id));
  try{
    if(rows.length)await fetch(`${SB_URL}/rest/v1/nominierung_hinweis?on_conflict=datum,spieler_id`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
    if(wiederDabei.length)await fetch(`${SB_URL}/rest/v1/nominierung_hinweis?datum=eq.${encodeURIComponent(datum)}&spieler_id=in.(${wiederDabei.join(",")})`,
      {method:"DELETE",headers:sbAuthHeaders()});
  }catch(e){/* Hinweis ist Beiwerk – die Einteilung steht schon */}
}
async function teamGruendeLaden(datum){
  TEAM_GRUND={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierung_hinweis?datum=eq.${encodeURIComponent(datum)}&select=spieler_id,grund`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(x=>{
      const k=KADER.find(k=>k._id===x.spieler_id);
      if(k)TEAM_GRUND[k.name]=x.grund||"";
    });
  }catch(e){}
}

// "4/5" Trainings der letzten 6 Wochen; "–" wenn keine Anwesenheit erfasst ist.
function teamQuoteText(n){
  const q=teamTrainingsQuote(n);
  if(!q)return `<span style="color:var(--text3)">Training –</span>`;
  const p=q.da/q.gesamt;
  const farbe=p>=0.8?"var(--green)":p>=0.5?"var(--amber)":"var(--red)";
  return `<span style="color:${farbe}">Training ${q.da}/${q.gesamt}</span>`;
}
function teamEinsatzText(n){
  const e=(TEAM_STATS[n]&&TEAM_STATS[n].einsaetze);
  return `<span style="color:var(--text2)">${e==null?"–":e} Einsätze</span>`;
}

/* A-lite: Rollen-Erfahrung. Aggregiert die gespeicherten Start-Aufstellungen
   (aufstellungen.lineup = {tw,auf,fll,flr,jaeg}) zu einer Kind×Rolle-Matrix + TW-Einsätzen.
   Nur vorhandene Daten (4+1, benannte Rollen); zeigt vor allem „wer war noch nie im Tor" –
   wichtig für den Übergang zur E-Jugend mit festem Torwart. Keine minutengenaue Abrechnung. */
const ROLLEN_EXP=[{k:"tw",l:"🥅 TW"},{k:"auf",l:"Aufp."},{k:"fll",l:"Fl.L"},{k:"flr",l:"Fl.R"},{k:"jaeg",l:"Jäger"}];
let _rollenExp={data:null,at:0};
async function rollenExpFetch(){
  if(_rollenExp.data&&Date.now()-_rollenExp.at<60000)return _rollenExp.data;
  const ab=(typeof saisonStart==="function")?saisonStart():"2000-01-01";
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/aufstellungen?select=datum,lineup&datum=gte.${ab}&order=datum.asc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  const byKid={}, ens=n=>byKid[n]||(byKid[n]={tw:0,auf:0,fll:0,flr:0,jaeg:0,total:0});
  rows.forEach(row=>{const lu=row.lineup||{}; ["tw","auf","fll","flr","jaeg"].forEach(rk=>{const nm=lu[rk]; if(nm){ens(nm)[rk]++; byKid[nm].total++;}});});
  _rollenExp={data:{byKid,games:rows.length},at:Date.now()};
  return _rollenExp.data;
}
function rollenExpClear(){ _rollenExp.at=0; }
// Kinder (aktiv), die in keiner gespeicherten Aufstellung im Tor standen.
function _neverTW(byKid){ return (typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false&&!(byKid[k.name]&&byKid[k.name].tw>0)).map(k=>k.name); }
async function rollenHintFill(){
  const el=document.getElementById("team-rollen-hint"); if(!el)return;
  const {byKid,games}=await rollenExpFetch();
  if(!games){el.innerHTML="";return;} // noch keine gespeicherten Aufstellungen
  const nie=_neverTW(byKid);
  if(!nie.length){el.innerHTML="";return;}
  el.innerHTML=`<div style="font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:6px 10px;margin-bottom:8px">🥅 Noch nie im Tor: <b>${nie.map(esc).join(", ")}</b> · <span onclick="rollenMatrixOpen()" style="color:var(--blue);cursor:pointer;font-weight:700">Rollen-Matrix ›</span></div>`;
}
async function rollenMatrixOpen(){
  const {byKid,games}=await rollenExpFetch();
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const cell=v=>`<div style="text-align:center;background:${v===0?"#fef2f2":v<=1?"#fffbeb":"#f0fdf4"};color:${v===0?"#b91c1c":"var(--text)"};border-radius:6px;padding:5px 0;font-weight:${v===0?"800":"700"};font-size:12px">${v}</div>`;
  const head=`<div style="display:grid;grid-template-columns:1fr repeat(5,42px);gap:3px;font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;padding:0 0 4px"><div>Kind</div>${ROLLEN_EXP.map(r=>`<div style="text-align:center">${r.l}</div>`).join("")}</div>`;
  const rows=kids.map(k=>{const b=byKid[k.name]||{}; return `<div style="display:grid;grid-template-columns:1fr repeat(5,42px);gap:3px;align-items:center;padding:2px 0;border-top:var(--border)"><div style="font-size:12.5px;font-weight:600">${esc(k.name)}</div>${ROLLEN_EXP.map(r=>cell(b[r.k]||0)).join("")}</div>`;}).join("");
  const nie=_neverTW(byKid);
  document.getElementById("rollen-modal")?.remove();
  const modal=document.createElement("div"); modal.id="rollen-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    ${mdlHead("rollen-modal","🎽","Rollen-Erfahrung",`aus ${games} gespeicherten Aufstellungen (4+1) · Rot = noch nie`,"#2563eb")}
    ${games?head+rows:'<div style="font-size:13px;color:var(--text3);padding:16px;text-align:center">Noch keine Aufstellungen gespeichert.<br>Speichere im Spieltag unter „Aufstellung" eine Startelf – dann füllt sich die Matrix.</div>'}
    ${games&&nie.length?`<div style="font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;margin-top:12px">🥅 <b>Noch nie im Tor:</b> ${nie.map(esc).join(", ")} – vor dem E-Jugend-Wechsel (fester TW) mal ranlassen.</div>`:""}
    <button class="btn btn-sm" style="width:100%;margin-top:12px" onclick="document.getElementById('rollen-modal').remove()">Schließen</button>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
/* Freitexte („Grund für die Eltern") aus dem DOM retten, bevor innerHTML sie wegwirft.
   Seit die Liste bei jedem Tipp neu gezeichnet wird (Anwesenheit UND Team stehen darin),
   wäre ein gerade getippter Grund sonst weg, sobald der Trainer irgendeinen Knopf drückt. */
function teamGruendeAusDom(){
  if(typeof KADER==="undefined")return;
  KADER.forEach(k=>{
    const el=document.getElementById("nh-"+teamKaderIdx(k.name));
    if(el)TEAM_GRUND[k.name]=el.value;
  });
}
function teamsRender(){
  const box=document.getElementById("team-panel");
  if(!box)return;
  teamGruendeAusDom();
  const kd=teamKader();
  const pool=teamZusagen();
  const vorschlag=teamAnzahlVorschlag();
  const form=((typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{label:"4+1 Raute"}).label;
  const segBtn=(n)=>`<button class="seg-btn${TEAM_ANZAHL===n?" active":""}" onclick="teamSetAnzahl(${n})">${n}</button>`;

  /* Der Container hiess frueher class="seg" – die Klasse gibt es im CSS nicht (ueberall
     sonst heisst sie seg-ctrl). Dadurch griff weder das Flex-Layout noch die Breite:
     die drei Knoepfe schrumpften auf Textbreite und waren kaum zu treffen. Jetzt volle
     Breite in eigener Zeile, die 44px aus .seg-btn kommen damit auch zur Geltung. */
  let html=`<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px">
      <span style="font-size:12px;font-weight:600">Anzahl Teams</span>
      <span style="font-size:11px;color:var(--text3);margin-left:auto">Vorschlag: ${vorschlag}</span>
    </div>
    <div class="seg-ctrl" style="margin-bottom:8px">${Array.from({length:TEAM_MAX},(_,i)=>segBtn(i+1)).join("")}</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">${pool.length} Kind${pool.length===1?"":"er"} dabei · Spielform des Termins: ${esc(form)}</div>`;

  /* Trainer je Team – steht bewusst VOR der Kinder-Einteilung und auch dann schon da,
     wenn noch niemand zugesagt hat: erst legen wir fest, wie viele Teams wir stellen und
     wer sie betreut, dann verteilen wir die Kinder. Ein Team ohne Trainer wird angemahnt
     (PO: „es muss immer ein Trainer zugewiesen werden"). */
  const formen=[["funino","FUNiño"],["4+1","4+1"],["5+1","5+1"]];
  const flabel=k=>((typeof FORMATIONS!=="undefined"&&FORMATIONS[k])||{label:k}).label;
  /* v480: Felder des Festivals. Stehen Felder, wandern die festen Teams je Runde ein Feld
     weiter; die Spielform je Team folgt daraus und ist nicht mehr einzeln waehlbar. */
  const felder=teamFelderAktiv();
  html+=`<div id="team-felder" style="margin:12px 0 6px">
    <div style="font-size:12px;font-weight:600;margin-bottom:4px">Felder beim Festival <span style="font-weight:400;color:var(--text3)">– die Teams wechseln jede Runde das Feld</span></div>
    ${TEAM_FELDER.map((k,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="font-size:12px;font-weight:700;width:52px">Feld ${i+1}</span>
      <div class="seg-ctrl" role="group" aria-label="Spielform Feld ${i+1}" style="flex:1">${formen.map(([key,l])=>`<button class="seg-btn${k===key?" active":""}" onclick="teamFeldSetzen(${i},'${key}')" aria-pressed="${k===key?"true":"false"}">${l}</button>`).join("")}</div>
      <button class="btn btn-sm" onclick="teamFeldWeg(${i})" aria-label="Feld ${i+1} entfernen" title="Feld entfernen" style="min-width:44px;justify-content:center">✕</button>
    </div>`).join("")}
    ${TEAM_FELDER.length<4?`<button class="btn btn-sm" onclick="teamFeldPlus()"><i class="ti ti-plus"></i>${felder?"Weiteres Feld":"Felder anlegen (Festival)"}</button>`:""}
  </div>`;
  if(felder){
    const zuordnung=Array.from({length:TEAM_ANZAHL},(_,i)=>i+1).map(t=>{ const i=teamFeldIndex(t); return `Adler ${t} → ${i<0?"Pause":`Feld ${i+1} (${esc(flabel(TEAM_FELDER[i]))})`}`; });
    const leih=Object.keys(TEAM_LEIH).map(n=>`${esc(n)} (Adler ${TEAM_LEIH[n]} → Adler ${TEAMS[n]})`);
    html+=`<div id="team-runde" style="background:var(--surface2);border-radius:var(--r);padding:10px 12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:800;flex:1">Runde ${TEAM_RUNDE}</span>
        <button class="btn btn-sm" onclick="teamRundeSetzen(${TEAM_RUNDE-1})"${TEAM_RUNDE<=1?" disabled":""} aria-label="Runde zurück">‹</button>
        <button class="btn btn-p btn-sm" onclick="teamRundeSetzen(${TEAM_RUNDE+1})"><i class="ti ti-player-track-next"></i>Nächste Runde</button>
      </div>
      <div style="font-size:12px;color:var(--text2);line-height:1.5">${zuordnung.join("<br>")}</div>
      ${leih.length?`<div style="font-size:11.5px;margin-top:6px"><b>Aushilfe diese Runde:</b> ${leih.join(" · ")} – wandert mit der nächsten Runde zurück.</div>`:""}
    </div>`;
  }
  html+=`<div style="font-size:12px;font-weight:600;margin:12px 0 6px">${felder?"Trainer je Team":"Trainer und Spielform je Team"}</div>`;
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const tr=TEAM_TRAINER[t]||[];
    /* v479: Spielform je Team – beim Kinderfestival spielt Adler 1 auf dem 4+1-Feld und
       Adler 2 FUNiño. Die Automatik und der Spielanteil rechnen damit. Mit Feldern (v480)
       ergibt sie sich aus der Runde. */
    const fk=teamFormVon(t);
    if(!felder)html+=`<div class="seg-ctrl" role="group" aria-label="Spielform Adler ${t}" style="margin-bottom:6px">${formen.map(([k,l])=>`<button class="seg-btn${fk===k?" active":""}" onclick="teamFormSet(${t},'${k}')" aria-pressed="${fk===k?"true":"false"}">${l}</button>`).join("")}</div>`;
    html+=`<button onclick="teamTrainerOpen(${t})" style="width:100%;min-height:48px;display:flex;align-items:center;gap:10px;text-align:left;margin-bottom:6px;padding:8px 12px;border:1px solid var(--rand-bedien);border-left:3px solid var(--fam-spieltag);border-radius:12px;background:var(--surface2);color:var(--text);font-family:inherit;cursor:pointer">
      <span style="font-size:16px">🧢</span>
      <span style="flex:1;min-width:0">
        <span style="display:block;font-size:12.5px;font-weight:800">Adler ${t}</span>
        <span style="display:block;font-size:11.5px;${tr.length?"color:var(--text2)":"color:var(--amber);font-weight:700"}">${tr.length?esc(tr.join(", ")):"noch kein Trainer zugeteilt"}</span>
      </span>
      <span style="font-size:15px;color:var(--text3)">✏️</span>
    </button>`;
  }

  /* Kein frueher Ausstieg mehr, wenn noch niemand dabei ist: die Kinderliste IST seit v394
     der Ort, an dem „dabei" gesetzt wird. Wer hier aussteigt, nimmt dem Trainer den Weg,
     ueberhaupt jemanden zu nominieren. Nur der Hinweis unterscheidet sich. */
  const leer=!pool.length;

  /* Drei gleichrangige Knoepfe nebeneinander – der Bildschirm war falsch geschnitten
     (Hausregel: genau EINE Hauptaktion). Jetzt in der Reihenfolge des Arbeitsschritts:
     erst einteilen (Vorbereitung), dann uebertragen (die eine Hauptaktion, volle Breite).
     „Rollen-Erfahrung" ist gar keine Aktion am Spieltag, sondern eine Auswertung – die
     wohnt in der Team-Kachel unter „Ueberblick" und ist dort ueber rollenMatrixOpen
     erreichbar. Hier war sie doppelt und hat die Hauptaktion verdeckt. */
  html+=`<div style="font-size:11.5px;color:var(--text2);margin:12px 0 6px">${leer
      ? "Noch niemand dabei – unten in der Liste auf „Dabei“ tippen. Die Eltern-Rückmeldungen werden automatisch übernommen, sobald sie da sind."
      : `Wer auf „Dabei“ steht, wird direkt einem Team zugeordnet. Unten in der Liste änderst du Anwesenheit und Team von Hand. Erst „In die Nominierungen übertragen“ macht es verbindlich.`}</div>
    <div style="margin-bottom:10px">
      <button class="btn btn-sm" onclick="teamsAuto()" style="width:100%;margin-bottom:8px"${leer?" disabled":""}><i class="ti ti-wand"></i>Alle Kinder gleichmäßig auf ${TEAM_ANZAHL} Team${TEAM_ANZAHL>1?"s":""} verteilen</button>
      <button class="btn btn-p" onclick="teamsAnwenden()" style="width:100%"${leer?" disabled":""}><i class="ti ti-arrow-right"></i>In die Nominierungen übertragen</button>
    </div>
    <div id="team-rollen-hint"></div>`;
  setTimeout(()=>{try{rollenHintFill();}catch(e){}},0); // A-lite: „noch nie im Tor"-Hinweis nachladen

  // Zu wenige Torwarte? Das merkt man sonst erst beim Anpfiff.
  const twTeams=Array.from({length:TEAM_ANZAHL},(_,i)=>i+1).filter(t=>teamKaderFuer(t).tw).length;   // v479: nur Teams mit Torwart-Spielform
  if(twTeams&&!leer){
    const twDa=pool.filter(istTorwart).length;
    if(twDa<twTeams)
      html+=`<div style="font-size:11.5px;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;margin-bottom:10px">🥅 Nur ${twDa} Kind${twDa===1?"":"er"} mit Torwart-Haken dabei, gebraucht werden ${twTeams}. Ein Team bleibt ohne Torwart.</div>`;
  }

  // Team-Übersicht: Größe, Torwart, Ø-Stärke
  const zeilen=[];
  const mindest=teamMindestKader();
  for(let t=1;t<=TEAM_ANZAHL&&!leer;t++){
    const m=pool.filter(n=>TEAMS[n]===t);
    const bew=m.map(teamStaerke).filter(v=>v>=0);
    const schnitt=bew.length?Math.round(bew.reduce((a,b)=>a+b,0)/bew.length):null;
    const tw=m.filter(istTorwart).length;
    const kdt=teamKaderFuer(t), sp=teamSpielanteil(t);
    const pausiert=felder&&teamFeldIndex(t)<0;
    const spielfaehig=pausiert||m.length>=sp.auf;   // v479: spielfaehig = das Feld dieser Spielform ist voll
    const fl=pausiert?"Pause":((typeof FORMATIONS!=="undefined"&&FORMATIONS[teamFormVon(t)])||{label:teamFormVon(t)}).label;
    zeilen.push(`<div class="team-anteil" data-team="${t}" style="flex:1;min-width:98px;background:var(--surface2);border-radius:var(--r);padding:8px">
      <div style="font-size:11.5px;font-weight:700">Adler ${t} <span style="font-weight:500;color:var(--text2)">${felder&&!pausiert?"Feld "+(teamFeldIndex(t)+1)+" · ":""}${esc(fl)}</span></div>
      <div style="font-size:10.5px;color:${spielfaehig?"var(--text2)":"var(--red)"}" title="${sp.auf} auf dem Feld, Sollgröße ${kdt.gesamt}">${m.length} Kinder${pausiert?" · setzt diese Runde aus":` · ${sp.auf} auf dem Feld${spielfaehig?"":" – zu wenige"}`}</div>
      <div style="font-size:10.5px;font-weight:700" title="Spielanteil je Kind: Feldplätze geteilt durch Teamgröße">${pausiert?"&nbsp;":`je ≈ ${Math.round(sp.anteil*100)} % Spielzeit`}</div>
      <div style="font-size:10.5px">${kdt.tw?(tw?"🥅 ok":"<span style='color:var(--red)'>kein TW</span>"):"<span style='color:var(--text3)'>ohne TW</span>"}${schnitt!=null?" · Ø "+schnitt+"%":""}</div>
    </div>`);
  }
  html+=`<div style="display:flex;gap:6px;margin-bottom:10px">${zeilen.join("")}</div>`;

  /* EINE Zeile je Kind: Anwesenheit und Team-Zuordnung beieinander (PO v394: „Wäre es
     nicht besser wenn ich die Anwesenheit direkt in Teams festlegen sehen und ändern
     kann?"). Vorher waren das zwei getrennte 16-Zeilen-Listen übereinander.
     Die Team-Knöpfe erscheinen nur bei „dabei" – wer nicht da ist, braucht kein Team.
     Bei EINEM Team gibt es statt der Zahlen einen Pausiert-Schalter: die Zahl „1" wäre
     keine Wahl, aber „passt nicht mehr rein" gibt es auch mit einem Team. */
  const stCfg={dabei:{lbl:"Dabei",col:"var(--green)"},nicht:{lbl:"Nicht",col:"var(--text3)"},verletzt:{lbl:"Verletzt",col:"var(--red)"}};
  const rvEmo={zugesagt:"✅",abgesagt:"❌",krank:"🤒"};
  const btn=(inhalt,onclick,an,titel)=>`<button onclick="${onclick}" aria-pressed="${an?"true":"false"}"${titel?` title="${titel}"`:""}
      style="flex:1;min-width:44px;min-height:44px;border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:${an?"700":"500"};background:${an?"var(--blue)":"var(--surface)"};color:${an?"#fff":"var(--text2)"}">${inhalt}</button>`;

  const zeile=(n)=>{
    const st=(typeof nomStatus==="object"&&nomStatus[n])||"offen";
    const dabei=(st==="dabei");
    const cur=TEAMS[n]||0;
    const rv=(typeof nomRsvp==="object"&&nomRsvp[n])||null;
    const badge=rv
      ? `<span title="Eltern-Rückmeldung: ${esc(rv.status)}${rv.kommentar?" – "+esc(rv.kommentar):""}" style="width:16px;text-align:center;font-size:13px">${rvEmo[rv.status]||""}</span>`
      : `<span style="width:16px"></span>`;
    const pause=(typeof istPaused==="function"&&istPaused(n))
      ? ` <span title="Pausiert – zählt nicht mit" style="font-size:10px;font-weight:700;color:var(--amber)">⏸ bis ${pauseBisLabel(n)}</span>` : "";
    const leihBadge=TEAM_LEIH[n]?` <span title="Hilft diese Runde aus – kehrt mit der nächsten Runde zu Adler ${TEAM_LEIH[n]} zurück" style="font-size:10px;font-weight:700;color:var(--blue-text)">🔁 Aushilfe aus Adler ${TEAM_LEIH[n]}</span>`:"";

    const stKnoepfe=["dabei","nicht","verletzt"].map(s=>
      `<button onclick="nomSet('${jsq(n)}','${s}')" aria-pressed="${st===s?"true":"false"}"
        style="flex:1;min-height:44px;border:1px solid var(--rand-bedien);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:${st===s?"700":"500"};background:${st===s?stCfg[s].col:"var(--surface)"};color:${st===s?"#fff":"var(--text2)"}">${stCfg[s].lbl}</button>`).join("");

    let teamZeile="";
    if(dabei){
      let k="";
      if(TEAM_ANZAHL>1){
        // Beschriftung als Wort, nicht als Zeichen: das Pause-Symbol fehlt in manchen
        // Systemschriften und wird dann als leeres Kästchen gezeichnet.
        for(let t=1;t<=TEAM_ANZAHL;t++)k+=btn(String(t),`teamSet('${jsq(n)}',${t})`,cur===t);
        k+=btn("Pause",`teamSet('${jsq(n)}',0)`,!cur,"Pausiert – spielt heute nicht mit");
      }else{
        k =btn("Spielt mit",`teamSet('${jsq(n)}',1)`,cur===1);
        k+=btn("Pausiert",`teamSet('${jsq(n)}',0)`,!cur,"Pausiert – spielt heute nicht mit");
      }
      teamZeile=`<div style="display:flex;gap:5px;margin-top:5px">${k}</div>`;
      if(!cur)teamZeile+=`<input id="nh-${teamKaderIdx(n)}" value="${esc(TEAM_GRUND[n]||"")}" placeholder="Grund für die Eltern (optional)"
        style="width:100%;min-height:44px;margin-top:5px;padding:8px;border:1px solid var(--rand-bedien);border-radius:8px;font-family:inherit;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box">`;
    }
    return `<div style="padding:8px 0;border-top:var(--border)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        ${badge}
        <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600">${getKader(n)&&getKader(n).nr?getKader(n).nr+" ":""}${esc(n)}${istTorwart(n)?" 🥅":""}${pause}${leihBadge}</span>
        ${dabei?`<span style="font-size:10px">${teamQuoteText(n)} · ${teamEinsatzText(n)}</span>`:""}
      </div>
      <div style="display:flex;gap:5px">${stKnoepfe}</div>
      ${teamZeile}
    </div>`;
  };

  /* Zwei verschiedene Dinge, getrennt gehalten: wen der Trainer pausieren laesst (eine
     Entscheidung) und ob die Teams ueber der Sollstaerke liegen (eine Information). */
  const grosse=[];
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const anz=Object.keys(TEAMS).filter(x=>TEAMS[x]===t).length;
    if(anz>teamKaderFuer(t).gesamt+1)grosse.push({t,anz});
  }
  if(grosse.length){
    const vor=teamAnzahlVorschlag();
    html+=`<div style="background:var(--amber-bg);border:1px solid var(--amber);border-radius:10px;padding:8px 10px;margin-bottom:6px">
      <div style="font-size:12px;font-weight:700;color:var(--amber)">👥 ${grosse.length===1&&TEAM_ANZAHL===1?`${grosse[0].anz} Kinder in einem Team`:grosse.map(g=>`Team ${g.t}: ${g.anz} Kinder`).join(" · ")}</div>
      <div style="font-size:11px;color:var(--amber);margin-top:2px">Sollstärke sind ${grosse.map(g=>teamKaderFuer(g.t).gesamt).join("/")} pro Team${vor>TEAM_ANZAHL?` – mit ${vor} Teams passt es`:""}. Alle spielen mit; wen du pausieren lassen willst, stellst du unten auf „Pausiert“.</div>
    </div>`;
  }
  const ohneTeam=pool.filter(n=>!TEAMS[n]);
  if(ohneTeam.length){
    html+=`<div style="background:var(--surface2);border:var(--border);border-radius:10px;padding:8px 10px;margin-bottom:6px">
      <div style="font-size:12px;font-weight:700;color:var(--text2)">⏸ ${ohneTeam.length} Kind${ohneTeam.length===1?"":"er"} pausiert: ${ohneTeam.map(esc).join(", ")}</div>
      <div style="font-size:11px;color:var(--text2);margin-top:2px">Von dir auf Pause gestellt – tippe auf „Spielt mit“, um das zurückzunehmen.</div>
    </div>`;
  }
  // Ausgetragene Kinder gehoeren nicht in die Nominierung (sie tauchten hier noch auf)
  html+=KADER.filter(k=>k.aktiv!==false).map(k=>zeile(k.name)).join("");
  box.innerHTML=html;
}

// Eltern-Zusagen werden automatisch übernommen (in nomLoad). Dieser Button verwirft die
// Trainer-Overrides und koppelt die Nominierung wieder komplett an den aktuellen RSVP-Stand.
/* „Meine Änderungen verwerfen" stellt den Zustand her, den nomLoad ohne jeden Trainer-
   Eingriff erzeugt hätte.
   PO-Meldung v394: „wenn ich die Nominierung händisch änder und dann wieder auf Eltern
   folgen klicke, ändert er die Buttons nicht mehr." Ursache: die Schleife lief nur über
   nomRsvp – also über die Kinder, deren Eltern geantwortet haben. Bei 15 offenen
   Rückmeldungen blieben 15 von Hand gesetzte Knöpfe stehen, und der Knopf sah kaputt aus.
   Jetzt wird der ganze Kader zurückgesetzt: mit Rückmeldung nach der Rückmeldung, ohne
   auf „offen" – und pausierte Kinder anschließend wieder heraus, genau wie in nomLoad. */
function nomApplyRsvp(){
  nomOvr.clear();
  KADER.forEach(k=>{
    const rv=nomRsvp[k.name];
    nomStatus[k.name]=rv?(rv.status==="zugesagt"?"dabei":"nicht"):"offen";
  });
  if(typeof PAUSE_MAP==="object"&&PAUSE_MAP)
    Object.keys(PAUSE_MAP).forEach(name=>{ if(nomStatus[name]!=null)nomStatus[name]="nicht"; });
  nomRender();
  teamsAuto();                 // die Aufteilung folgt der neuen Nominierung
  spieltagTeamKartenRender();
  nomApplyToTools();nomSave();
  toast("Änderungen verworfen – die Nominierung folgt wieder den Eltern ✓");
}
/* Sind alle Team-Kacheln zugeklappt, ist der ganze Block unsichtbar (hidden). Die Panels
   darin brauchen dann nicht nachgeladen zu werden – und genau das ist der Normalfall,
   während der Trainer oben in der Liste die Anwesenheit durchtippt. Ohne diese Bremse
   löste jeder einzelne Tipp Nachladungen für Rollen, Match-Uhr und Blitz-Rating aus. */
function teamInhaltSichtbar(){
  const el=document.getElementById("spieltag-teaminhalt");
  return !!el&&!el.hidden;
}
/* Die Panels IN der Team-Kachel füllen. Wird von zwei Seiten gebraucht:
   – wenn sich Nominierung oder Einteilung ändern (nomApplyToTools)
   – wenn eine Kachel aufgeklappt wird (spieltagKarteOeffnen)
   Der zweite Weg fehlte und war der Fehler aus v396: beim Laden sind alle Kacheln zu,
   die Bremse übersprang die Panels – und beim Aufklappen holte sie niemand nach. Match-Uhr
   und faire Rollen blieben leer, ohne dass irgendwo etwas Rotes erschien. */
function teamInhaltFuellen(){
  if(!teamInhaltSichtbar())return;
  // Kapitän und Anstoß dürfen nur Kinder DIESES Teams zur Wahl stellen – die Auswahl
  // muss also jeder Änderung an Nominierung und Einteilung folgen, nicht nur dem Laden.
  if(typeof rollenPanelRender==="function"&&document.getElementById("rollen-panel"))rollenPanelRender();
  if(typeof blitzInit==="function"&&document.getElementById("blitz-panel"))blitzInit();
  if(typeof atRender==="function"&&document.getElementById("action-panel"))atRender(); // Aktions-Chips folgen der Nominierung
  if(typeof mcLoad==="function"&&document.getElementById("mc-panel"))mcLoad();
}
function nomApplyToTools(){
  const squad=nominierteSpieler();
  teamKaderRender();   // reines Zeichnen, kein Netz – läuft immer mit
  if(!rotTimerId){ // laufendes Spiel nicht zerstören – nur setzen, wenn Timer nicht läuft
    rotSeedFromSquad(squad); // Torwart separat, Feldgröße aus Spielform
    rotRenderControls();rotRenderLive();
  }
  teamInhaltFuellen();
}

