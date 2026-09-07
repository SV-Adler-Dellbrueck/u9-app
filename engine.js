/* ═══════════════════════════════════════════════════════════
   ADLER ENGINE LAYER (Modularisierung 4/8)
   Sportwissenschaftliche Berechnungen: Helper, Scores,
   Rauten-Rollen-Algorithmus, Fazit-Generatoren (Feld+TW),
   Kombinations-Algorithmus (beste 4+1-Aufstellung).
   Laedt nach core.js, vor dem Haupt-Skript. Keine Top-Level-Ausfuehrung.
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════
   HELPER
═══════════════════════════════════ */
/* Abgerundetes Rechteck auf Canvas. Lag frueher in md-taktikboard.js (Welle 2),
   wurde aber von views.js (Welle 1) an 13 Stellen fuer Karten und Diagramme
   gebraucht – ein fehlendes Modul haette dort mitten im Zeichnen geworfen.
   Jetzt EIN Ort in Welle 1; md-taktikboard.js benutzt dieselbe Funktion. */
function tbRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

const esc=s=>(s+'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeParse=(s,fb)=>{try{return s?JSON.parse(s):fb}catch(e){return fb}}; // C1: kaputte scores/radios-Zeilen dürfen keine View crashen
function segSet(id,val,btn){document.getElementById(id).value=val;btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}
const gv=n=>{const e=document.querySelector(`input[name="${n}"]:checked`);return e?parseInt(e.value):null;};
const safe=n=>gv(n)||0;
const getKader=name=>KADER.find(k=>k.name===name);
const isTWPlayer=()=>{const k=getKader(document.getElementById("p-name").value);return k?k.tw:false;};
const currentDims=()=>isTWPlayer()?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
const getAllT=dims=>dims.flatMap(d=>d.tier.map(t=>t.n));
const getAllM=dims=>dims.flatMap(d=>d.mx.map(m=>m.n));
const countFilled=()=>{const dims=currentDims();let n=0;getAllT(dims).forEach(t=>{if(gv(t)!=null)n++;});getAllM(dims).forEach(m=>{if(gv(m)!=null)n++;});return n;};
const totalCrit=()=>{const dims=currentDims();return getAllT(dims).length+getAllM(dims).length;};
const getV=()=>{const dims=currentDims(),v={};getAllT(dims).forEach(t=>v[t]=gv(t));getAllM(dims).forEach(m=>v[m]=gv(m));return v;};
const getMeta=()=>({
  name:document.getElementById("p-name").value,
  trainer:document.getElementById("p-trainer").value,
  date:document.getElementById("p-date").value,
  foot:document.getElementById("p-foot").value,
  age:document.getElementById("p-age").value,
  grp:(document.getElementById("p-grp")?.value)||"flex", // A/B-Label aus der UI entfernt (Evidenz: Streaming schadet 8-Jaehrigen)
  eltern:document.getElementById("p-eltern").value,
  att:document.getElementById("p-att")?.value||"2",
  notes:document.getElementById("p-notes").value,
  tw:isTWPlayer()
});

/* ═══════════════════════════════════
   SCORES
═══════════════════════════════════ */
function calcScores(v,dims){
  // Bewertungsmodell v2: einheitliche 1–4-Skala (1=Ansatz … 4=Stark) -> 0–100.
  // Alle Kriterien liegen in d.tier; d.mx ist leer (Altstruktur, defensiv mitgenommen).
  const sc=val=>val?((val-1)/3)*100:null;
  const ds={};
  dims.forEach(d=>{
    const vals=[...d.tier.map(t=>sc(v[t.n])),...d.mx.map(m=>sc(v[m.n]))].filter(x=>x!==null);
    ds[d.id]=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
  });
  /* Gesamtscore nur aus Feldspieler-Dimensionen (fair fuer TW-Spieler) und bewusst OHNE
     "Persoenlichkeit & Charakter": Charakter-Ratings ueber 8-Jaehrige durch Laientrainer
     sind die unzuverlaessigste Kriteriengruppe (Coach-Eye-Forschung) und messen eher
     Temperament/Reife als Fussball. Die Dimension bleibt im Radar und in den Beobachtungen
     sichtbar, zaehlt aber nicht in die Zahl. Gewichte renormieren sich ueber wsum. */
  const feldDims=dims.filter(d=>!d.id.startsWith("tw_")&&d.id!=="mental");
  const wsum=feldDims.reduce((a,b)=>a+b.w,0);
  const total=wsum?Math.round(feldDims.reduce((s,d)=>s+(ds[d.id]||0)*d.w/wsum,0)):0;
  return{dims:ds,total};
}

function calcPotenzial(v,total,att,isTw){
  /* v3 – heisst in der App ueberall "Entwicklungstempo", nicht mehr "Potenzial":
     Zukunftsprognosen fuer 8-Jaehrige sind wissenschaftlich nicht haltbar (Frontiers 2021:
     nur mittlere Prognosevaliditaet auf Gruppenebene; Guellich 2014: 25-41% jaehrliche
     Fluktuation in Foerdersystemen). Der Wert beschreibt das Lernverhalten JETZT:
     Coachability als Multiplikator, Spielfreude als Bonus. Der fruehere Anwesenheits-
     faktor ist raus - Anwesenheit misst Eltern-Logistik, nicht das Kind (ICOACHKIDS). */
  const lm={1:1.00,2:1.05,3:1.10,4:1.15}[v["f_coach"]||2]||1.05;
  const fb={1:0,2:3,3:6,4:9}[v["f_freude"]||1]||0;
  return Math.min(100,Math.max(total,Math.round(total*lm+fb)));
}
/* Relative-Age-Effekt-Hinweis: bis zu 12 Monate Unterschied im selben Jahrgang sind bei
   8-Jaehrigen >10% Lebenszeit. Das Badge korrigiert die Trainer-Wahrnehmung beim Bewerten,
   ohne die Werte selbst zu verrechnen (Romann/Cobley, Science for Sport). */
function raeInfo(geb){
  if(!geb)return "";
  const m=parseInt(String(geb).slice(5,7),10); if(!m)return "";
  const q=Math.ceil(m/3);
  if(q===4)return "🗓️ Geb. Okt–Dez: eines der jüngsten Kinder des Jahrgangs – Relative-Age-Effekt beim Vergleichen mitdenken";
  if(q===3)return "🗓️ Geb. Jul–Sep: jüngere Jahrgangshälfte";
  if(q===1)return "🗓️ Geb. Jan–Mär: gehört zu den Ältesten des Jahrgangs";
  return "";
}

/* ═══════════════════════════════════
   RAUTEN-ROLLEN-ALGORITHMUS
═══════════════════════════════════ */
function calcRolle(v,foot,neutralMissing=false){
  // v2: einheitliche 1–4-Skala. neutralMissing=true (Live-Vorschau) wertet fehlende
  // Kriterien als 50 statt 0 – die Vorschau springt dann nicht.
  const S=n=>{const val=v[n];return val?((val-1)/3)*100:(neutralMissing?50:0);};
  // ── AUFPASSER ── Pass, Raum, Zweikampf, Umschalten (Gewichte summieren auf 1.0)
  const aufRaw=S("f_pass")*.30+S("f_raum")*.24+S("f_defense")*.28+S("f_umschalt")*.18;
  const passQuality=S("f_pass");
  const aufMalus=neutralMissing?1.0:(passQuality<33?0.68:passQuality<55?0.86:1.0);
  const auf=aufRaw*aufMalus;

  // ── JÄGER ── Abschluss, Laufweg, Selbstvertrauen, Ballkontrolle
  const jaegRaw=S("f_abschluss")*.34+S("f_laufweg")*.24+S("f_selbst")*.16+S("f_ballkontrolle")*.26;
  const torInstinkt=S("f_abschluss");
  const jaegMalus=neutralMissing?1.0:(torInstinkt<33?0.70:torInstinkt<55?0.86:1.0);
  const jaeg=jaegRaw*jaegMalus;

  // ── FLITZER ── Tempo, Koordination, Ballkontrolle, Einsatz
  const fbRaw=S("f_tempo")*.34+S("f_koord")*.22+S("f_ballkontrolle")*.24+S("f_einsatz")*.20;
  const tempoMalus=neutralMissing?1.0:(S("f_tempo")<33?0.76:S("f_tempo")<55?0.90:1.0);
  const fb=fbRaw*tempoMalus;

  const fl_l=foot==="L"?fb*1.03:foot==="B"?fb:fb*.94;
  const fl_r=foot==="R"?fb*1.03:foot==="B"?fb:fb*.94;
  const sc={aufpasser:auf,jaeger:jaeg,flitzer_l:fl_l,flitzer_r:fl_r};
  const sorted=Object.entries(sc).sort((a,b)=>b[1]-a[1]);
  // Klarheit der Rollenfindung: wie deutlich ist der Vorsprung der Top-Rolle?
  const spread=sorted[0][1]-sorted[1][1];
  const clarity=spread<8?"unklar":spread<20?"Tendenz":"klar";
  const labels={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer L",flitzer_r:"Flitzer R"};
  const hlCls={aufpasser:"hl-auf",jaeger:"hl-jaeg",flitzer_l:"hl-links",flitzer_r:"hl-rechts"};
  const posId={aufpasser:"rp-auf",jaeger:"rp-jaeg",flitzer_l:"rp-links",flitzer_r:"rp-rechts"};
  const badgeCls={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts"};
  return{prim:sorted[0][0],sek:sorted[1][0],primLabel:labels[sorted[0][0]],sekLabel:labels[sorted[1][0]],labels,hlCls,posId,badgeCls,clarity,topScore:sorted[0][1],scores:sc};
}

/* ═══════════════════════════════════════════════════════
   FAZIT-GENERATOR FELDSPIELER
   Individuelle Texte durch: Name-Referenz, Spielertyp,
   stärkstes/schwächstes Profil, soziale Dimension,
   Zusammenfassung am Anfang getrennt von Maßnahmen
═══════════════════════════════════════════════════════ */
function tn3(val,mx=3){return val?((val-1)/(mx-1))*100:0;}
function mn5(val,mx=5){return val?((val-1)/(mx-1))*100:0;}
function generateFazitFeld(v,meta){
  const dims=DIMS_FELD;
  const{dims:ds,total}=calcScores(v,dims);
  const rolle=calcRolle(v,meta.foot);
  const pot=calcPotenzial(v,total,meta.att,false);
  const name=meta.name;
  const age=parseInt(meta.age);
  const bench=age<=7?36:44;
  const sc=n=>{const val=v[n];return val?((val-1)/3)*100:0;};

  // Spielertyp aus stärkster Feld-Dimension
  const dsF=Object.entries(ds).filter(([k])=>!k.startsWith("tw_"));
  const stMax=[...dsF].sort((a,b)=>b[1]-a[1])[0]||["tech",0];
  const typMap={tech:"technischer Spieler",raute:"spielintelligenter Spieler",phys:"dynamischer Spieler",mental:"charakterstarker Spieler",entw:"lernbegieriger Spieler"};
  const typ=typMap[stMax[0]]||"Allrounder";

  const sozRaw=v["f_sozial"]||2, sozKrit=sozRaw===1;
  const coachRaw=v["f_coach"]||2, fokusStark=coachRaw===4, fokusSchwach=coachRaw===1;

  // ── ZUSAMMENFASSUNG ──
  let summary="";
  if(ds.tech>=bench+20)summary+=`${name} zeigt technisch bereits ein Niveau klar über dem Altersschnitt der U9 I. `;
  else if(ds.tech>=bench)summary+=`${name} befindet sich technisch auf altersgerechtem Niveau mit solidem Fundament. `;
  else summary+=`${name} ist technisch noch im Aufbau – Grundlagen mit Geduld und vielen Ballkontakten festigen. `;
  if((v["f_raum"]||0)>=3)summary+=`Das Raumgefühl in der Raute ist ausgeprägt – ${name} öffnet das Feld selbstständig. `;
  else if((v["f_raum"]||0)===1)summary+=`Die Tendenz zur Klumpenbildung ist aktuell das größte taktische Entwicklungsfeld. `;
  if(fokusStark)summary+=`Besonders auffällig ist die Konzentration und Lernbereitschaft. `;
  else if(fokusSchwach)summary+=`Fokus und die Umsetzung von Hinweisen sind ausbaufähig. `;
  if(sozKrit)summary+=`Im sozialen Miteinander zeigt ${name} Verhalten, das die Teamdynamik erschwert – ein wichtiges Thema. `;
  else if(sozRaw>=3)summary+=`${name} ist ein echter Teamplayer, der Zusammenhalt aktiv fördert. `;
  summary+=`Als ${typ} aktuell am stärksten in der Rolle ${rolle.primLabel} – in der U9 bewusst weiter alle Rollen durchspielen. Entwicklungsstand: ${total}% · Entwicklungstempo: ~${pot}%.`;

  // ── VOLLTEXT ──
  let r="";
  r+="┌─ ROLLE 4+1 RAUTE ─────────────────────────────┐\n";
  r+=`  Primär:    ${rolle.primLabel}\n`;
  r+=`  Sekundär:  ${rolle.sekLabel}\n`;
  r+=`  Gruppe:    ${meta.grp==="A"?"A-Gruppe":meta.grp==="B"?"B-Gruppe":"Noch offen"}\n`;
  r+=`  Bewertet:  ${meta.trainer} · ${meta.date||"–"}\n`;
  r+="└──────────────────────────────────────────────┘\n";

  // Stärken/Felder datengetrieben aus den 16 Kriterien (4=stark, 1–2=Entwicklungsfeld)
  const allCrit=DIMS_FELD.flatMap(d=>d.tier.map(t=>({n:t.n,l:t.l})));
  const st=allCrit.filter(c=>(v[c.n]||0)>=4).map(c=>c.l);
  if(st.length===0) st.push("Verlässliche, konstante Präsenz – solider Mannschaftsspieler");
  r+="\n━━ STÄRKEN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  st.slice(0,8).forEach(s=>r+=`  + ${s}\n`);

  const ef=allCrit.filter(c=>{const x=v[c.n]||0;return x>0&&x<=2;}).map(c=>c.l);
  r+="\n━━ ENTWICKLUNGSFELDER ━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  if(ef.length===0) r+="  → Auf gutem Niveau – Handlungsschnelligkeit unter Druck weiter schärfen\n";
  else ef.slice(0,8).forEach(e=>r+=`  → ${e}\n`);

  // ── RAUTEN-ANALYSE ──
  r+="\n━━ RAUTEN-ANALYSE (4+1) ━━━━━━━━━━━━━━━━━━━━━━━\n";
  const passQ=sc("f_pass");
  const aufDescStark=`${name} hat die Qualitäten für die Basis der Raute: verteidigen, absichern, ersten Ball verteilen. Schlüsselfigur für defensive Stabilität.`;
  const aufDescMittel=`${name} bringt die Basis für den Aufpasser mit – Zweikampf, Absicherung, altersgerechtes Passspiel. Der saubere erste Pass darf weiter wachsen.`;
  const aufDescSchwach=`${name} bringt Zweikampf und Robustheit für den Aufpasser mit, aber Passspiel und Spieleröffnung sind noch der limitierende Faktor – der nächste Entwicklungsschritt.`;
  const rDesc={
    aufpasser:passQ<40?aufDescSchwach:passQ<60?aufDescMittel:aufDescStark,
    jaeger:`${name}s Torhunger und Entschlossenheit machen ihn zur natürlichen Spitze. Direkten Weg zum Tor suchen, nach Ballverlust sofort pressen.`,
    flitzer_l:`${name}s Tempo und Wendigkeit prädestinieren ihn für die linke Außenbahn. Breite halten, Räume für den Jäger öffnen.`,
    flitzer_r:`${name}s Tempo und Wendigkeit machen ihn rechts gefährlich. Breite halten, Tiefenläufe für den Jäger einleiten.`
  };
  r+=rDesc[rolle.prim]+"\n";
  if(rolle.clarity==="unklar") r+=`Die Rollenfindung ist noch nicht eindeutig – ${name} liegt zwischen ${rolle.primLabel} und ${rolle.sekLabel} fast gleichauf. Beide Positionen im Training ausprobieren.\n`;
  else r+=`Sekundär einsetzbar als: ${rolle.sekLabel}.\n`;
  if(rolle.topScore<35) r+="⚠ Insgesamt noch sehr früh in der Entwicklung – Rollenangaben sind Tendenzen, keine Festlegung.\n";
  if((v["f_raum"]||0)===1||ds.raute<40) r+="⚠ Raumverständnis noch schwach – klare Korridore vor fester Rollenvergabe.\n";
  if(rolle.prim==="aufpasser"&&passQ<40) r+="⚠ Passspiel/Spielaufbau ist Entwicklungspriorität Nr. 1 für diese Rolle.\n";

  // ── TRAININGS-SCHWERPUNKT (aus schwächster Dimension) ──
  r+="\n━━ TRAININGS-SCHWERPUNKT (2–3 WOCHEN) ━━━━━━━━━\n";
  const sortedDims=[...dsF].sort((a,b)=>a[1]-b[1]);
  const wn={tech:"Technik & Ball",raute:"Spielintelligenz",phys:"Dynamik",mental:"Persönlichkeit",entw:"Lernen & Entwicklung"};
  const uebBank={
    tech:"ÜBUNG 1 – 'Pflichtpass-Funino':\nTor gilt nur, wenn alle Spieler mindestens 1x den Ball hatten.\n\nÜBUNG 2 – '1gg1-Turnier':\nViele kurze Duelle, jeder gegen jeden – Ballführung & Abschluss.",
    raute:"ÜBUNG 1 – 'Korridor-Funino':\n3 Längskorridore, jeder hält seinen. Kommando 'Feld groß machen!'.\n\nÜBUNG 2 – 'Gegenpressing-Pfeife':\nNach Ballverlust sofort 3 Schritte Richtung Ball.",
    phys:"ÜBUNG 1 – 'Reaktions-Sprints':\nAuf Signal starten, kurze Antritte mit Richtungswechsel.\n\nÜBUNG 2 – 'Koordinationsleiter + Ball':\nFußarbeit, Gleichgewicht, Wendigkeit.",
    mental:"ÜBUNG 1 – 'Lobpflicht':\nNach jedem Tor lobt der Schütze einen Helfer.\n\nÜBUNG 2 – 'Fokus-Pause':\nVor jeder Erklärung 3 Sekunden Stille, Augenkontakt.",
    entw:"ÜBUNG 1 – 'Freies Spiel mit Aufgabe':\nEine selbst gewählte Finte pro Angriff ausprobieren.\n\nÜBUNG 2 – 'Frag-den-Trainer':\nKind erklärt die Übung mit eigenen Worten."
  };
  const wd=sortedDims[0][0];
  r+=`Schwächster Messwert: ${wn[wd]} (${sortedDims[0][1]}%)\n\n`;
  r+=uebBank[wd]||uebBank.tech;

  if(parseInt(meta.eltern)===1){
    r+="\n\n━━ ELTERN-HINWEIS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    r+="⚠ Externes Coaching belastet die intrinsische Motivation.\nEmpfehlung: Fehler sind Lernmomente, Spielfreude vor Leistung, kein Coaching von der Seitenlinie.";
  }

  r+="\n\n━━ ENTWICKLUNGSPROGNOSE ━━━━━━━━━━━━━━━━━━━━━━━\n";
  r+=`Aktuell: ${total}% · Entwicklungstempo: ~${pot}%\n`;
  if(total>=70) r+=`${name} ist überdurchschnittlich für U9 I. Mit erhöhtem Anforderungsgrad fördern – Unterforderung vermeiden.`;
  else if(total>=48) r+=`${name} entwickelt sich altersgerecht auf gutem Kurs. Struktur und positive Wiederholung bringen den nächsten Sprung.`;
  else r+=`${name} ist im Aufbau. Spaßbetonte Grundlagen, Erfolge feiern – keine Leistungsorientierung in diesem Stand.`;

  return{text:r,summary,rolle,dims:ds,total,pot,tw:false,sozKrit,fokusSchwach,fokusStark};
}

/* ═══════════════════════════════════
   FAZIT TW
═══════════════════════════════════ */
function generateFazitTW(v,meta){
  // Primär: vollständiges Feldspieler-Profil (exakt wie bei reinen Feldspielern)
  const feldResult=generateFazitFeld(v,meta);
  const name=meta.name;
  const k=getKader(name);
  const twPrioText=k&&k.twPrio===1?"primärer Torwart":k&&k.twPrio===2?"zweite TW-Option":"TW-Option";

  // TW-Zusatzwerte berechnen (nur für den TW-Zusatzabschnitt, NICHT für den Hauptscore)
  const{dims:tdims}=calcScores(v,DIMS_TW);
  const twTotal=Math.round(((tdims.tw_tech||0)*0.55)+((tdims.tw_spiel||0)*0.45));

  // Summary: Feldspieler-Text bleibt primär, TW wird als Zusatzqualität angehängt
  let summary=feldResult.summary;
  summary+=` ${name} bringt zusätzlich die TW-Option mit (${twPrioText}).`;

  // Volltext: Feldspieler-Profil komplett übernehmen, TW-Block am Ende anhängen
  let r=feldResult.text;

  r+="\n\n━━ ZUSATZ: TORWART-OPTION ━━━━━━━━━━━━━━━━━━━━━\n";
  r+=`TW-Status: ${twPrioText}\n`;
  r+=`TW-Niveau (separat, nicht Teil des Gesamtscores): ${twTotal}%\n\n`;
  const twSt=[];
  if((v["tw_fangen"]||0)>=4)   twSt.push("Fangsicher – klebt am Ball, auch schwierige Bälle festgehalten");
  if((v["tw_reaktion"]||0)>=4) twSt.push("Reflexstark – außergewöhnliche Reaktion für das Alter");
  if((v["tw_komm"]||0)>=4)     twSt.push("Torhüter-Leader – organisiert die Abwehr aktiv");
  if((v["tw_heraus"]||0)>=4)   twSt.push("Herr des Raums – mutiges, sicheres Herausgehen");
  if((v["tw_aufbau"]||0)>=4)   twSt.push("Spielmacher von hinten – initiiert Konter mit erstem Pass");
  if((v["tw_stellung"]||0)>=4) twSt.push("Winkel-clever – stellt sich stark, macht das Tor klein");
  if(twSt.length===0) twSt.push("Verlässliche Grundleistung im Tor");
  twSt.forEach(s=>r+=`  + ${s}\n`);

  const twEf=[];
  if((v["tw_fangen"]||0)<=2)   twEf.push("Fangen & Sichern: Bälle mit beiden Händen festhalten");
  if((v["tw_heraus"]||0)<=2)   twEf.push("Herausgehen: klare Situationen erkennen und handeln");
  if((v["tw_komm"]||0)<=2)     twEf.push("Kommunikation: 'Mein Ball!', 'Komm!' als Pflicht-Ansagen");
  if((v["tw_stellung"]||0)<=2) twEf.push("Stellungsspiel: dem Schützen entgegengehen, Winkel verkürzen");
  if((v["tw_aufbau"]||0)<=2)   twEf.push("Spielaufbau: ersten Pass gezielt zum Aufpasser");
  if(twEf.length===0) twEf.push("Entscheidungsschnelligkeit beim Herausgehen weiter schärfen");
  r+="\n";
  twEf.forEach(e=>r+=`  → ${e}\n`);

  r+="\nWICHTIG: Das TW-Spiel ist eine Zusatzqualität – Trainingsschwerpunkt und Rollenfindung richten sich primär nach dem Feldspieler-Profil oben.";

  return{text:r,summary,rolle:feldResult.rolle,dims:feldResult.dims,total:feldResult.total,pot:feldResult.pot,tw:true,twTotal,sozKrit:feldResult.sozKrit};
}


/* ═══════════════════════════════════════════════════════
   KOMBINATIONS-ALGORITHMUS
   Bewertet jede mögliche 4+1 Aufstellung aus dem Kader
   Score = Rollenfit + Komplementarität + Soziale Verträglichkeit
═══════════════════════════════════════════════════════ */
function getPlayerData(name){
  const snaps=DB[name];
  if(!snaps||!snaps.length)return null;
  const lat=snaps[snaps.length-1];
  const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
  const tw=getKader(name)?.tw||false;
  const dims=tw?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
  const{dims:ds,total}=calcScores(v,dims);
  const rolle=calcRolle(v,lat.strong_foot||"R");
  return{name,v,ds,total,rolle,tw,lat};
}

// Mini-Sparkline (Inline-SVG) aus einer Zahlenreihe – z. B. total_score-Verlauf eines Kindes.
function sparklineSVG(vals,w,h,col){
  w=w||58;h=h||16;col=col||"var(--teal)";
  if(!vals||vals.length<2)return "";
  const min=Math.min(...vals),max=Math.max(...vals),range=(max-min)||1;
  const pts=vals.map((v,i)=>{const x=(i/(vals.length-1))*(w-2)+1;const y=h-1-((v-min)/range)*(h-2);return x.toFixed(1)+","+y.toFixed(1);}).join(" ");
  const lx=((w-2)+1).toFixed(1), ly=(h-1-((vals[vals.length-1]-min)/range)*(h-2)).toFixed(1);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin-top:2px" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="1.8" fill="${col}"/></svg>`;
}
// Bewertungs-Trend: Vergleich der letzten beiden Snapshots (total_score). conf = Anzahl Bewertungen.
function playerTrend(name){
  const snaps=DB[name]; if(!snaps||snaps.length<2)return {delta:0,conf:snaps?snaps.length:0};
  const cur=snaps[snaps.length-1].total_score||0, prev=snaps[snaps.length-2].total_score||0;
  return {delta:Math.round(cur-prev), conf:snaps.length};
}
function roleScore(player,role){
  // player.rolle wurde in getPlayerData() bereits mit demselben foot berechnet – nicht doppelt tun
  return player.rolle.scores[role]||0;
}
function lat_foot(player){return player.lat.strong_foot||"R";}

function socialScore(players){
  // v2-Keys: f_sozial (Soziale Einstellung), f_selbst (Selbstvertrauen), Skala 1–4
  let score=100;
  const sozProblems=players.filter(p=>(p.v.f_sozial||2)===1).length;
  const selfConfHigh=players.filter(p=>(p.v.f_selbst||2)>=3).length;
  const selfConfLow=players.filter(p=>(p.v.f_selbst||2)===1).length;
  score -= sozProblems * 18; // each social problem player costs points
  if(sozProblems>=2) score -= 15; // extra penalty for two problematic players together
  score -= selfConfLow * 8; // too many shy players
  if(selfConfHigh>=3) score += 8; // bonus for confident group
  return Math.max(0, Math.min(100, score));
}

function complementScore(aufpasser, jaeger, fl_l, fl_r){
  // v2-Keys: f_pass, f_laufweg (Tiefenläufe), f_tempo, f_sozial, f_selbst – Skala 1–4
  let score=70;
  const passAuf=(aufpasser.v.f_pass||1);
  const jaegRun=(jaeger.v.f_laufweg||1);
  // else if: Top-Duo bekommt NUR den höheren Bonus, nicht beide gestapelt
  if(passAuf>=3&&jaegRun>=3) score+=15; // guter Passgeber + tiefer Läufer = perfekt
  else if(passAuf>=2&&jaegRun>=2) score+=8;
  // Balanced flitzers
  const speedDiff=Math.abs((fl_l.v.f_tempo||2)-(fl_r.v.f_tempo||2));
  if(speedDiff===0) score+=10; // same speed = balanced wings
  else if(speedDiff>=2) score-=10;
  // Soziale Eignung wird bereits in socialScore() abgebildet – hier nicht doppelt bestrafen.

  // Buddy-System (Psycho-Synergie): ein selbstbewusstes "Anker"-Kind direkt neben
  // einem stillen/unsicheren Kind stützt es – Bonus für solche Nachbarschaften.
  const shy   =p=>((p.v.f_sozial||2)===1)||((p.v.f_selbst||2)===1);
  const anchor=p=>((p.v.f_sozial||2)>=3)||((p.v.f_selbst||2)>=3);
  const nachbarn=[[aufpasser,fl_l],[aufpasser,fl_r],[fl_l,jaeger],[fl_r,jaeger]];
  let buddy=0;
  nachbarn.forEach(([a,b])=>{ if((shy(a)&&anchor(b))||(shy(b)&&anchor(a))) buddy+=6; });
  score+=Math.min(12,buddy); // gedeckelt, damit Buddy-Effekt den Rollenfit nicht überstimmt

  // Einsatz-Fairness (leichte Rotations-Steuerung über die Trainingsbeteiligung):
  // regelmäßige Trainingsgänger bekommen eher einen Startplatz; ein selten anwesendes
  // Kind allein in der exponierten Spitze wird leicht abgewertet.
  const att=p=>+(p.lat?.attendance||2);
  const attAvg=(att(aufpasser)+att(fl_l)+att(fl_r)+att(jaeger))/4;
  score+=Math.round((attAvg-2)*6); // -6 .. +6
  if(att(jaeger)===1) score-=4;

  return Math.max(0,Math.min(100,score));
}

function scoreAufstellung(tw, aufpasser, fl_l, fl_r, jaeger){
  const rFit = (
    roleScore(aufpasser,"aufpasser") * 0.28 +
    roleScore(jaeger,"jaeger")       * 0.28 +
    roleScore(fl_l,"flitzer_l")      * 0.22 +
    roleScore(fl_r,"flitzer_r")      * 0.22
  ) * 0.4;

  const social = socialScore([aufpasser,fl_l,fl_r,jaeger]) * 0.3;
  const complement = complementScore(aufpasser,jaeger,fl_l,fl_r) * 0.3;

  return Math.round(rFit + social + complement);
}

function generateInsights(tw, aufpasser, fl_l, fl_r, jaeger, score){
  const insights=[];
  const v_auf=aufpasser.v, v_jaeg=jaeger.v, v_fl_l=fl_l.v, v_fl_r=fl_r.v;

  // Positive synergies (v2-Keys, Skala 1–4)
  if((v_auf.f_pass||1)>=3&&(v_jaeg.f_laufweg||1)>=3)
    insights.push({type:"pos",text:`${aufpasser.name} (Passspiel) + ${jaeger.name} (Tiefenläufe) = starke Verbindung im Kader`});
  if((v_fl_l.f_tempo||1)>=3&&(v_fl_r.f_tempo||1)>=3)
    insights.push({type:"pos",text:`${fl_l.name} + ${fl_r.name} bilden die schnellsten Außenbahnen – maximale Breite`});
  if((v_auf.f_umschalt||1)>=3&&(v_jaeg.f_abschluss||1)>=3)
    insights.push({type:"pos",text:`${aufpasser.name} gewinnt den Ball, ${jaeger.name} schließt ab – idealer Konter-Rhythmus`});
  if((v_jaeg.f_selbst||2)>=3)
    insights.push({type:"pos",text:`${jaeger.name} sucht Druck aktiv – perfekte Mentalität für die Spitze`});
  // Buddy-System: ein Anker-Kind neben einem stillen/unsicheren Kind
  {
    const shyF=p=>((p.v.f_sozial||2)===1)||((p.v.f_selbst||2)===1);
    const ancF=p=>((p.v.f_sozial||2)>=3)||((p.v.f_selbst||2)>=3);
    const pairs=[[aufpasser,fl_l],[aufpasser,fl_r],[fl_l,jaeger],[fl_r,jaeger]];
    for(const [a,b] of pairs){
      let anc,sh;
      if(ancF(a)&&shyF(b)){anc=a;sh=b;} else if(ancF(b)&&shyF(a)){anc=b;sh=a;}
      if(anc){insights.push({type:"pos",text:`${anc.name} gibt ${sh.name} auf der Nachbarposition Rückhalt – ideales Buddy-Paar für ein unsicheres Kind`});break;}
    }
  }
  if((v_auf.f_sozial||2)>=3||(v_jaeg.f_sozial||2)>=3){
    const leader=[aufpasser,jaeger].find(p=>(p.v.f_sozial||2)>=3);
    if(leader) insights.push({type:"pos",text:`${leader.name} geht aktiv auf Mitspieler zu – natürlicher Kommunikator auf dem Feld`});
  }

  // Warnings
  const sozProbs=[aufpasser,fl_l,fl_r,jaeger].filter(p=>(p.v.f_sozial||2)===1);
  if(sozProbs.length>=2)
    insights.push({type:"warn",text:`Achtung: ${sozProbs.map(p=>p.name).join(" + ")} haben beide Tendenzen zur Distanzierung – Gruppenklima beobachten`});
  else if(sozProbs.length===1)
    insights.push({type:"warn",text:`${sozProbs[0].name} braucht bewusste Integration ins Team – aktiv ansprechen`});

  const speedDiff=Math.abs((v_fl_l.f_tempo||2)-(v_fl_r.f_tempo||2));
  if(speedDiff>=2)
    insights.push({type:"warn",text:`Geschwindigkeitsunterschied zwischen ${fl_l.name} und ${fl_r.name} – eine Seite wird stärker bespielt`});

  if((v_auf.f_raum||1)===1)
    insights.push({type:"warn",text:`${aufpasser.name} neigt zur Klumpenbildung – klare Korridor-Ansagen nötig`});

  // Einsatz-Fairness: seltener Trainingsgänger allein in der Spitze
  if(+(jaeger.lat?.attendance||2)===1)
    insights.push({type:"info",text:`${jaeger.name} ist selten im Training – in der Spitze fehlen dann oft die Abläufe. Ggf. rotieren.`});

  const lowConf=[aufpasser,fl_l,fl_r,jaeger].filter(p=>(p.v.f_selbst||2)===1);
  if(lowConf.length>=2)
    insights.push({type:"info",text:`${lowConf.map(p=>p.name).join(", ")} zögern unter Druck – Erfolgserlebnisse gezielt einbauen`});

  if(tw)
    insights.push({type:"info",text:`Torwart: ${tw.name}${(tw.lat&&tw.lat.tw_komm>=3)?" – kommuniziert und dirigiert die Abwehr aktiv":""}`});

  return insights;
}

/* Wer steht heute zur Verfuegung? Die Aufstellung darf niemanden vorschlagen, der
   abgesagt hat. Ist keine Nominierung geladen (Team-Reiter, reine Planung), bleibt es
   beim ganzen Kader. calcBestCombos konnte das schon immer – es wurde nur nie genutzt. */
function verfuegbareSpieler(){
  if(typeof nominierteSpieler==="function"){
    const s=nominierteSpieler();
    if(s.length)return s;
  }
  return null; // null = keine Einschraenkung
}
function calcBestCombos(restrictNames){
  // restrictNames (optional): nur diese Spieler betrachten (z. B. die nominierten am Spieltag).
  const names=(restrictNames&&restrictNames.length)?restrictNames:Object.keys(DB);
  if(names.length<4)return null;

  const players=names.map(n=>getPlayerData(n)).filter(Boolean);
  /* Nicht die Zahl der NAMEN zählt, sondern die der BEWERTETEN. Vorher wurde nur oben
     geprüft: 14 nominierte, aber unbewertete Kinder kamen durch, players blieb leer, die
     Funktion gab ein leeres Array zurück – und renderKombi las combos[0].tw davon.
     Ergebnis: Ausnahme im setTimeout, der Ladekringel drehte sich für immer (PO v399). */
  if(players.length<4)return null;
  const twPlayers=players.filter(p=>getKader(p.name)?.tw);

  // Pre-compute role scores and sort candidates per role
  const ranked={};
  ["aufpasser","jaeger","flitzer_l","flitzer_r"].forEach(role=>{
    ranked[role]=players.map(p=>({p,s:roleScore(p,role)})).sort((a,b)=>b.s-a.s);
  });

  // Use top-N candidates per role to limit combinations (max 6 per role → ~1296 combos vs 28k+)
  const N=Math.min(6,players.length);
  const topAuf=ranked.aufpasser.slice(0,N);
  const topJaeg=ranked.jaeger.slice(0,N);
  const topFlL=ranked.flitzer_l.slice(0,N);
  const topFlR=ranked.flitzer_r.slice(0,N);

  const combos=[];
  for(const a of topAuf){
    for(const j of topJaeg){
      if(j.p.name===a.p.name)continue;
      for(const l of topFlL){
        if(l.p.name===a.p.name||l.p.name===j.p.name)continue;
        for(const r of topFlR){
          if(r.p.name===a.p.name||r.p.name===j.p.name||r.p.name===l.p.name)continue;
          const fieldNames=new Set([a.p.name,l.p.name,r.p.name,j.p.name]);
          const availTW=twPlayers.find(p=>!fieldNames.has(p.name))||null;
          const score=scoreAufstellung(availTW,a.p,l.p,r.p,j.p);
          combos.push({tw:availTW,aufpasser:a.p,flitzer_l:l.p,flitzer_r:r.p,jaeger:j.p,score});
        }
      }
    }
  }

  combos.sort((a,b)=>b.score-a.score);
  // Deduplicate by same 4 field players (keep best permutation)
  const seen=new Set();
  const unique=[];
  for(const c of combos){
    const key=[c.aufpasser.name,c.jaeger.name,c.flitzer_l.name,c.flitzer_r.name].sort().join(",");
    if(!seen.has(key)){seen.add(key);unique.push(c);}
    if(unique.length>=8)break;
  }
  return unique;
}

function renderKombi(){
  const wrap=document.getElementById("kombi-content");
  if(!window._dbLoaded&&!Object.keys(DB).length){wrap.innerHTML=skeletonRows(3);return;} // L2
  wrap.innerHTML='<div style="text-align:center;padding:2rem;color:var(--text2)"><i class="ti ti-loader" style="font-size:24px;animation:spin 1s linear infinite;display:inline-block"></i><div style="margin-top:8px;font-size:12px">Berechne beste Aufstellung...</div></div>';
  /* Der Kringel steht so lange, bis jemand ihn ersetzt – eine Ausnahme hier drin bleibt
     also als „rechnet ewig" sichtbar. Deshalb abfangen und ehrlich hinschreiben. */
  setTimeout(()=>{
    try{ _renderKombiInner(wrap); }
    catch(e){ wrap.innerHTML='<div class="empty"><i class="ti ti-alert-triangle"></i>Die Aufstellung konnte nicht berechnet werden.<br><span style="font-size:11px">'+esc(String(e&&e.message||e))+'</span></div>'; }
  },30);
}
function _renderKombiInner(wrap){
  const nominiert=verfuegbareSpieler();
  const combos=calcBestCombos(nominiert);
  /* v474: Leerzustand = ein Satz + eine Aktion. Die Erklaerkaesten (Algorithmus, Adler/Igel)
     erscheinen erst, wenn es eine Aufstellung gibt, die sie erklaeren. */
  const erklaer=document.getElementById("kombi-erklaer");
  if(erklaer)erklaer.style.display=(combos&&combos.length)?"":"none";
  if(!combos||!combos.length){
    const bewertet=(nominiert||Object.keys(DB)).filter(n=>getPlayerData(n)).length;
    wrap.innerHTML=`<div class="empty"><i class="ti ti-users-group"></i>Für die Aufstellung braucht es mindestens 4 <b>bewertete</b> Kinder – bisher sind es ${bewertet}.
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;align-items:center">
        <button class="btn btn-sm" onclick="go('spieltag')">🪄 Feld &amp; Bank fair besetzen (Spieltag)</button>
        <a href="#" onclick="go('bew');return false" style="font-size:12px;color:var(--blue-text);font-weight:700">oder Kinder bewerten ›</a>
      </div></div>`;
    return;
  }

  const best=combos[0];
  const insights=generateInsights(best.tw,best.aufpasser,best.flitzer_l,best.flitzer_r,best.jaeger,best.score);
  const icMap={pos:"✓",warn:"⚠",info:"ℹ"};
  const clsMap={pos:"ci-pos",warn:"ci-warn",info:"ci-info"};

  let html=`<div class="kombi-aufstellung">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div class="kombi-title">⚽ Beste Aufstellung</div>
      <div class="kombi-score">${best.score}%</div>
    </div>
    <div class="kombi-sub">Optimiert nach Rollenfit, Komplementarität &amp; Teamdynamik</div>
    <div class="kombi-sub" style="margin-top:2px">${nominiert
      ? `Nur aus den <b>${nominiert.length} nominierten</b> Spielern des Spieltags.`
      : `Aus <b>allen bewerteten</b> Spielern – am Spieltag nominieren, dann zählt nur, wer dabei ist.`}</div>
    <div class="kombi-raute">
      <div></div>
      <div class="kpos kpos-jaeg"><div class="kpos-lbl">Jäger</div><div class="kpos-name">${esc(best.jaeger.name)}</div><div class="kpos-score">${best.jaeger.total}%</div></div>
      <div></div>
      <div class="kpos kpos-fl-l"><div class="kpos-lbl">Flitzer L</div><div class="kpos-name">${esc(best.flitzer_l.name)}</div><div class="kpos-score">${best.flitzer_l.total}%</div></div>
      <div></div>
      <div class="kpos kpos-fl-r"><div class="kpos-lbl">Flitzer R</div><div class="kpos-name">${esc(best.flitzer_r.name)}</div><div class="kpos-score">${best.flitzer_r.total}%</div></div>
      <div></div>
      <div class="kpos kpos-auf"><div class="kpos-lbl">Aufpasser</div><div class="kpos-name">${esc(best.aufpasser.name)}</div><div class="kpos-score">${best.aufpasser.total}%</div></div>
      <div></div>
    </div>
    ${best.tw?`<div style="text-align:center;padding:6px;background:#fef9c3;border-radius:var(--r);font-size:12.5px;font-weight:600;color:#854d0e;margin-bottom:12px">🥅 +1 Torwart: ${esc(best.tw.name)}</div>`:'<div style="text-align:center;padding:6px;background:var(--surface2);border-radius:var(--r);font-size:12px;color:var(--text2);margin-bottom:12px">🥅 Torwart: kein TW-Spieler bewertet</div>'}
    <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:8px">Analyse & Synergien</div>
    <div class="kombi-insights">${insights.map(i=>`
      <div class="kombi-insight-row">
        <div class="ci-icon ${clsMap[i.type]}">${icMap[i.type]}</div>
        <div>${esc(i.text)}</div>
      </div>`).join("")}
    </div>
  </div>`;

  // Alternative combos
  if(combos.length>1){
    html+=`<div class="alt-combos">
      <div class="alt-title">Weitere gute Kombinationen</div>
      ${combos.slice(1,6).map((c,i)=>`
        <div class="alt-item">
          <div class="alt-score">${c.score}%</div>
          <div class="alt-names">
            <span style="color:#1a56db;font-weight:500">${esc(c.aufpasser.name)}</span> ·
            <span style="color:#b45309">${esc(c.flitzer_l.name)}</span> ·
            <span style="color:#15803d">${esc(c.flitzer_r.name)}</span> ·
            <span style="color:#c2410c">${esc(c.jaeger.name)}</span>
            ${c.tw?`<span style="color:#854d0e"> · 🥅${esc(c.tw.name)}</span>`:''}
          </div>
        </div>`).join("")}
    </div>`;
  }

  html+=`<div id="lineup-editor" style="margin-top:16px"></div>`;
  wrap.innerHTML=html;
  // md-aufstellung.js ist Welle 2 – ohne Schutz reisst ein fehlendes Modul das
  // ganze Rendern der Aufstellung mit.
  if(typeof initLineupEditor==="function")initLineupEditor(best);
}

