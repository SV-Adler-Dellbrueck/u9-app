/* ═══════════════════════════════════
   KALENDER / TERMINE – das Rückgrat, das Training, Spiele und Turniere verbindet
═══════════════════════════════════ */
let tmTyp="training", tmSpielform="4+1", tmHeim=true;
// Heimadresse des SV Adler Dellbrück – wird bei Training & Heimspielen vorbelegt.
const VEREIN_ADRESSE="Thurner Kamp 97, 51069 Köln";
// Nächstes Trainingsdatum: wir trainieren Mo & Fr – das jeweils nächste dieser Tage.
function tmNextTrainingDate(){
  const d=new Date(); d.setHours(0,0,0,0);
  for(let i=0;i<8;i++){ const t=new Date(d.getTime()+i*86400000); const wd=t.getDay(); if(wd===1||wd===5)return t.toISOString().slice(0,10); }
  return d.toISOString().slice(0,10);
}
/* v527: Das Trainermeeting ist eine eigene Terminart – und die einzige, die Eltern und
   Oeffentlichkeit NICHT sehen. Das erzwingt die Leseregel auf `termine`
   (`typ <> 'trainermeeting' or is_trainer()`), nicht ein Filter hier; ein Filter im
   JavaScript waere bei einer Tabelle, die jeder ohne Anmeldung lesen darf, keine Zusage,
   sondern eine Bitte. Graphit als Farbe, weil es kein Ereignis fuer die Mannschaft ist. */
const TM_META={training:{icon:"🏃",label:"Training",col:"#1a56db"},spiel:{icon:"⚽",label:"Spiel",col:"#059669"},turnier:{icon:"🏆",label:"Turnier",col:"#c2410c"},event:{icon:"🎉",label:"Event",col:"#7c3aed"},trainermeeting:{icon:"🗓️",label:"Trainermeeting",col:"#334155"}}; // UX 7: Event mit Freitext-Titel (Saisonabschluss etc.)
// Saison-Zuordnung aus einem Datum (Saison läuft Jul–Jun)
function saisonForDate(datum){
  const d=new Date((datum||new Date().toISOString().slice(0,10))+"T00:00:00");
  const y=d.getFullYear(), start=d.getMonth()>=6?y:y-1;
  return start+"/"+String(start+1).slice(2);
}
// Platz-/Spielfeld-Auswahl: beim Training das ganze Vereinsgelände granular; bei Spiel/Turnier
// ist der Platz mit anderen Teams geteilt -> nur die zwei realen Aufteilungen.
const PLATZ_TRAINING=["Käfig","vorne links","vorne rechts","hinten links","hinten rechts","Halle"];
const PLATZ_SPIEL=["links + Käfig","vorne rechts"];
function tmPlatzDefault(typ){ return (typ==="spiel"||typ==="turnier")?"links + Käfig":"vorne links"; }
function tmPlatzFill(typ){
  const sel=document.getElementById("tm-platz"); if(!sel)return;
  const istSpiel=(typ==="spiel"||typ==="turnier");
  const opts=istSpiel?PLATZ_SPIEL:PLATZ_TRAINING, def=tmPlatzDefault(typ);
  sel.innerHTML=`<option value="">– kein Platz –</option>`+opts.map(p=>`<option${p===def?" selected":""}>${esc(p)}</option>`).join("");
  const lbl=document.getElementById("tm-platz-lbl"); if(lbl)lbl.textContent=istSpiel?"Spielfeld-Aufteilung":"Platz (Training)";
}
/* Kopf und Akzentfarbe der Terminanlage je Typ. Feste Hexwerte statt --fam-*: die
   Flaechen tragen weisse Schrift und malen ihren Grund selbst – var(--green) ist im
   Dunkelmodus hell und kaeme damit auf 2:1. */
const TM_LOOK={
  training:{emo:"🏃", sub:"Zeit und Platz genügen",                     titel:"",        platz:""},
  spiel:   {emo:"⚽", sub:"Gegner, Anpfiff, Endzeit",                   titel:"Gegner",  platz:"z. B. FC Musterstadt"},
  turnier: {emo:"🏆", sub:"Endzeit nicht vergessen – danach ins Archiv", titel:"Titel",   platz:"z. B. Hallenturnier Dellbrück"},
  event:   {emo:"🎉", sub:"Sommerfest, Weihnachtsfeier, Ausflug",       titel:"Titel",   platz:"z. B. Saisonabschluss"},
  trainermeeting:{emo:"🗓️", sub:"Nur fürs Trainerteam – Eltern sehen ihn nicht", titel:"Thema", platz:"z. B. Saisonplanung"}
};
function tmSetTyp(t,btn){
  tmTyp=t;
  if(btn){btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}
  else{const seg=document.getElementById("tm-typ-seg");
    if(seg){seg.querySelectorAll(".seg-btn").forEach(b=>b.classList.toggle("active",b.dataset.val===t));}}
  const look=TM_LOOK[t]||TM_LOOK.training;
  const karte=document.getElementById("tm-karte");
  if(karte)karte.dataset.typ=t;   // die Farben haengen daran (styles.css), nicht an einem Inlinestil
  const ki=document.getElementById("tm-kopf-icon"); if(ki)ki.textContent=look.emo;
  const ks=document.getElementById("tm-kopf-sub"); if(ks)ks.textContent=look.sub;
  const istSpiel=(t==="spiel"||t==="turnier");
  // display:"" statt "block": .mg ist per CSS ein flex-Container mit 4px Abstand zwischen
  // Label und Feld. Ein hart gesetztes "block" hat den Abstand jedes Mal geschluckt.
  const disp=(id,on)=>{const el=document.getElementById(id);if(el)el.style.display=on?"":"none";};
  disp("tm-titel-row", t!=="training");                 // Training braucht keinen Titel/Gegner
  /* Kurzes Label, Beispiele in den Platzhalter: „Titel (z. B. Saisonabschluss,
     Weihnachtsfeier)" brauchte auf dem Handy zwei Zeilen – dieselbe Falle wie beim
     Ende-Feld in v416. Beispiele stehen ohnehin besser IM Feld als darüber. */
  const lbl=document.getElementById("tm-titel-lbl"); if(lbl)lbl.textContent=look.titel||"Titel";
  const tin=document.getElementById("tm-titel"); if(tin)tin.placeholder=look.platz||"";
  // Platz gibt es bei Training UND Spiel/Turnier (jeweils eigene Optionen) – nur beim Event nicht.
  const platzRow=document.getElementById("tm-platz")?.closest(".mg"); if(platzRow)platzRow.style.display=(t==="training"||istSpiel)?"":"none";
  /* v527: Beim Trainermeeting geht es um Menschen an einem Tisch, nicht um Kinder auf einem
     Platz. Treffzeit, Ende und Ort bleiben (ein Meeting hat eine Adresse), alles Sportliche
     faellt weg – die Zeilen dazu blenden die Regeln unten ohnehin schon aus. */
  const istMeeting=(t==="trainermeeting");
  disp("tm-spielform-row", istSpiel);
  disp("tm-dauer-row", istSpiel);
  disp("tm-heim-row", istSpiel);                          // Heim/Auswärts nur bei Spiel/Turnier
  /* PO: Beim Training kommen alle zur Trainingszeit – eine getrennte Treffzeit gibt es nur,
     wo vorher etwas passiert (Spiel, Turnier, Event). Und wiederholt wird nur ein Event;
     Spiele und Turniere sind jedes Mal andere. Ausgeblendete Felder werden GELEERT, sonst
     wandert ein unsichtbarer Wert in den nächsten Termin. */
  const treffRow=document.getElementById("tm-treff")?.closest(".mg");
  if(treffRow)treffRow.style.display=(t==="training"||istMeeting)?"none":"";
  if(t==="training"||istMeeting){const tz=document.getElementById("tm-treff"); if(tz)tz.value="";}
  disp("tm-serie-row", t==="event");
  if(t!=="event"){
    const s=document.getElementById("tm-serie"); if(s)s.value="";
    const sb=document.getElementById("tm-serie-bis"); if(sb)sb.value="";
    if(typeof tmSerieToggle==="function")tmSerieToggle();
  }
  // Kurze Labels statt Klammer-Erklaerungen: die brachen im zweispaltigen Raster um und
  // schoben das Feld darunter aus der Linie. Was Pflicht ist, sagt jetzt das Label selbst.
  const zLbl=document.getElementById("tm-zeit-lbl");
  if(zLbl)zLbl.textContent=istSpiel?"Anpfiff":"Uhrzeit";
  const eLbl=document.getElementById("tm-ende-lbl");
  if(eLbl)eLbl.textContent=istSpiel?"Ende (Pflicht)":"Ende";
  /* Der „Was"-Block ist beim Training komplett leer – dann bliebe nur die Ueberschrift
     stehen. Eine Ueberschrift ohne Inhalt ist schlimmer als keine. */
  disp("tm-block-was", t!=="training");
  /* Torzahlen nur beim Training: bei Spiel/Turnier heisst die Aufgabe schlicht „Aufbau",
     beim Event wird kein Tor gebraucht. Ausgeblendete Felder werden GELEERT (v416) –
     sonst wandert eine unsichtbare 8 vom Training in den naechsten Spieltag. */
  disp("tm-tore-row", t==="training");
  disp("tm-tore-hint", t==="training");
  /* v528 – PO: „Helfer brauchen wir keine beim Meeting." Stimmt: der ganze Block „Wer
     hilft" ist dort sinnlos, nicht nur die Torzahlen. Das Hinweisfeld wird geleert, sonst
     wandert ein unsichtbarer Satz aus dem letzten Termin ins Meeting (Falle aus v416). */
  disp("tm-block-helfen", !istMeeting);
  if(istMeeting){const hh=document.getElementById("tm-helfer-hinweis"); if(hh)hh.value="";}
  /* Und ein Satz, der sagt, was nach dem Anlegen kommt – die Frage „wo stimme ich ab?"
     entsteht sonst genau hier und wird erst drei Bildschirme später beantwortet. */
  const mh=document.getElementById("tm-meeting-hinweis");
  if(mh)mh.style.display=istMeeting?"":"none";
  /* v529 – PO: „Ich lege jetzt einen Termin fest, um dann eine Abstimmung ueber einen neuen
     Termin zu machen?" Beim Meeting heisst das Datum deshalb, was es ist: Vorschlag 1. Zwei
     weitere Vorschlaege stehen darunter; beim Verlassen des Typs werden sie geleert, sonst
     wandern sie unsichtbar in den naechsten Termin (Falle aus v416). */
  disp("tm-vorschlaege", istMeeting);
  const dLbl=document.getElementById("tm-datum-lbl"); if(dLbl)dLbl.textContent=istMeeting?"Vorschlag 1 · Datum":"Datum";
  if(!istMeeting)["tm-v2-datum","tm-v2-zeit","tm-v3-datum","tm-v3-zeit"].forEach(id=>{const el=document.getElementById(id); if(el)el.value="";});
  if(t!=="training"){const f=document.getElementById("tm-funino"),j=document.getElementById("tm-jugendtore");if(f)f.value="";if(j)j.value="";}
  const gdb=document.getElementById("tm-gegnerdb-btn"); if(gdb)gdb.style.display=istSpiel?"inline-flex":"none"; // Gegner-DB nur bei Spiel/Turnier (nicht bei Training/Event)
  const zeit=document.getElementById("tm-zeit"), datum=document.getElementById("tm-datum"), ort=document.getElementById("tm-ort");
  tmPlatzFill(t);                                         // Optionen + Vorbelegung passend zum Typ
  if(t==="training"){
    if(zeit)zeit.value="16:45";                          // Mo & Fr 16:45–18:00
    if(ort)ort.value=VEREIN_ADRESSE;                     // Training immer auf dem Vereinsgelände
    if(datum&&!datum.value)datum.value=tmNextTrainingDate();
  } else if(istSpiel){
    tmSetHeim(true);                                      // Standard: Heimspiel → Vereinsadresse
  } else if(t==="event"){
    if(ort&&ort.value===VEREIN_ADRESSE)ort.value="";     // Event: übernommene Vereinsadresse nicht erzwingen
  } else if(istMeeting){
    if(ort&&ort.value===VEREIN_ADRESSE)ort.value="";     // Meetings sind oefter im Vereinsheim oder beim Italiener
    if(zeit&&!zeit.value)zeit.value="20:00";             // abends nach dem Training – aenderbar
  }  if(typeof tmEndeVorschlag==="function")tmEndeVorschlag(); // value= feuert kein onchange – Ende-Feld blieb sonst leer
}
// Heim/Auswärts umschalten. Heim → Vereinsadresse vorbelegen; Auswärts → freigeben.
function tmSetHeim(isHeim,btn){
  tmHeim=!!isHeim;
  const seg=document.getElementById("tm-heim-seg");
  if(seg){ seg.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active")); const a=btn||seg.querySelector('.seg-btn[data-val="'+(isHeim?"heim":"ausw")+'"]'); if(a)a.classList.add("active"); }
  const ort=document.getElementById("tm-ort");
  if(ort){ if(isHeim)ort.value=VEREIN_ADRESSE; else if(ort.value===VEREIN_ADRESSE)ort.value=""; }
}
// Heim/Auswärts-Kennzeichnung für Spiele & Turniere (leer bei Training/Event oder unbekannt).
function heimLabel(t){
  if(!t||(t.typ!=="spiel"&&t.typ!=="turnier")||t.heim==null)return "";
  return t.heim?"🏠 Heim":"✈️ Auswärts";
}
function tmSetSpielform(f,btn){
  tmSpielform=f;
  btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
}
/* Formular auf-/zuklappen. Zugeklappt ist der Standard – der Knopf traegt den Zustand
   auch fuer Vorlesesoftware (aria-expanded), nicht nur im gedrehten Pfeil. */
function tmNeuToggle(auf){
  const k=document.getElementById("tm-karte"), b=document.getElementById("tm-neu-toggle"), c=document.getElementById("tm-neu-chev");
  if(!k)return;
  const offen=(auf===undefined)?(k.style.display==="none"):!!auf;
  k.style.display=offen?"":"none";
  if(b)b.setAttribute("aria-expanded",offen?"true":"false");
  if(c)c.style.transform=offen?"rotate(180deg)":"";
  if(offen)k.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function tmInit(){
  tmSetTyp("training"); // Standard-Typ + Vorbelegung (Zeit 16:45, Platz „vorne links", Vereinsadresse, nächstes Mo/Fr)
  tmLoad();
}
/* Endzeit-Vorschlag nach Vereins-Realität (PO): Spiel +90 min, Turnier +4 h,
   Training +75 min (16:45 → 18:00) – frei änderbar. Nach der Endzeit verschwindet
   der Termin aus den aktiven Listen (terminVorbei in core.js). */
function tmEndeVorschlag(){
  const z=document.getElementById("tm-zeit")?.value, e=document.getElementById("tm-ende");
  // Spond-Muster: Treffzeit getrennt vom Anstoß – bei Spiel/Turnier 45 Min. vorher
  // vorschlagen. Läuft VOR den Ende-Guards, damit ein bereits gefülltes Ende-Feld
  // den Vorschlag nicht verschluckt.
  try{
    const tz=document.getElementById("tm-treff");
    if(tz&&!tz.value&&z&&(tmTyp==="spiel"||tmTyp==="turnier")){
      const [h2,m2]=z.split(":").map(Number);
      const d2=new Date(2000,0,1,h2,m2-45);
      tz.value=String(d2.getHours()).padStart(2,"0")+":"+String(d2.getMinutes()).padStart(2,"0");
    }
  }catch(_e){}
  if(!z||!e||e.value)return;
  const addMin={spiel:90,turnier:240,training:75}[typeof tmTyp!=="undefined"?tmTyp:""];
  if(!addMin)return;
  const [h,m]=z.split(":").map(Number);
  const t=Math.min(23*60+59,h*60+m+addMin);
  e.value=String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
}
function tmSerieToggle(){
  const on=(document.getElementById("tm-serie")?.value||"")==="woche";
  const o=document.getElementById("tm-serie-opts"); if(o)o.style.display=on?"block":"none";
  if(on&&typeof ferienLoad==="function")ferienLoad(); // Ferien vorladen fürs Auslassen
}
/* Zahlenfeld lesen: leer bleibt leer, 0 bleibt 0. Der uebliche `parseInt(v)||null` haette
   die 0 verschluckt – und genau die ist hier eine Aussage („kein Tor noetig"). */
function tmZahlFeld(id){
  const v=(document.getElementById(id)?.value||"").trim();
  if(v==="")return null;
  const n=parseInt(v,10);
  return isNaN(n)?null:Math.max(0,Math.min(40,n));
}
async function tmAdd(){
  if(tmAdd._busy)return; tmAdd._busy=true; // Doppel-Tap erzeugte doppelte Termine (bei Serien bis zu 30)
  try{
  const datum=document.getElementById("tm-datum")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  const zeit=document.getElementById("tm-zeit")?.value||"";
  const ende=document.getElementById("tm-ende")?.value||"";
  const titel=(document.getElementById("tm-titel")?.value||"").trim();
  const ort=(document.getElementById("tm-ort")?.value||"").trim();
  const istSpiel=(tmTyp==="spiel"||tmTyp==="turnier");
  if(istSpiel&&!ende){toast("Bitte eine Endzeit eintragen – danach wandert der Termin ins Archiv","err");return;}
  // 🔁 Serien-Termine: wöchentlich bis Enddatum, Ferienwochen optional auslassen (max. 30)
  const serie=(document.getElementById("tm-serie")?.value||"")==="woche";
  const serieBis=document.getElementById("tm-serie-bis")?.value||"";
  const serieFerien=!!document.getElementById("tm-serie-ferien")?.checked;
  let daten=[datum], ausgelassen=0;
  if(serie){
    if(!serieBis||serieBis<datum){toast("Bitte ein „bis“-Datum für die Serie wählen","err");return;}
    if(serieFerien&&typeof ferienLoad==="function")await ferienLoad();
    daten=[];
    // LOKAL formatieren – toISOString würde Berlin-Mitternacht einen Tag zurückschieben
    const fmtLokal=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
    let d=new Date(datum+"T12:00:00");
    const bis=new Date(serieBis+"T12:00:00");
    while(d<=bis&&daten.length<30){
      const ds=fmtLokal(d);
      if(serieFerien&&typeof ferienFuer==="function"&&ferienFuer(ds))ausgelassen++;
      else daten.push(ds);
      d=new Date(d.getTime()+7*864e5);
    }
    if(!daten.length){toast("Alle Termine der Serie liegen in den Ferien 🏖️","err");return;}
  }
  const body={
    typ:tmTyp, datum, titel, ort,
    platz: (document.getElementById("tm-platz")?.value||"").trim()||null,
    uhrzeit: zeit||null,
    treffzeit: (document.getElementById("tm-treff")?.value)||null,
    uhrzeit_ende: ende||null,
    saison: saisonForDate(datum),
    spielform: istSpiel?tmSpielform:null,
    gegner: istSpiel?(titel||null):null,
    heim: istSpiel?tmHeim:null,
    spieldauer_min: istSpiel?parseInt(document.getElementById("tm-dauer")?.value||"10"):20,
    halbzeiten: istSpiel?(parseInt(document.getElementById("tm-halbzeiten")?.value)||1):2,
    // Leeres Feld → null (Aufgabe ohne Zahl), ausdrueckliche 0 → 0 (Aufgabe entfaellt).
    // Deshalb NICHT parseInt(...)||null: das machte aus der 0 wieder ein null.
    helfer_funino:     tmTyp==="training"?tmZahlFeld("tm-funino"):null,
    helfer_jugendtore: tmTyp==="training"?tmZahlFeld("tm-jugendtore"):null,
    helfer_hinweis:    (document.getElementById("tm-helfer-hinweis")?.value||"").trim()||null
  };
  try{
    const payload=daten.length>1?daten.map(ds=>Object.assign({},body,{datum:ds,saison:saisonForDate(ds)})):body;
    const r=await fetch(`${SB_URL}/rest/v1/termine`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(payload)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){
      // Eltern-Abschrift gleich mit anlegen – sonst ist ein frischer Termin über den
      // Eltern-Link unsichtbar, bis jemand die Eltern-Info öffnet (das tat nie jemand).
      if(typeof tmMatchdaySync==="function")
        (Array.isArray(payload)?payload:[payload]).forEach(row=>tmMatchdaySync(row));
      terminIdCacheClear();
      toast(daten.length>1?`🔁 ${daten.length} Termine angelegt${ausgelassen?` · ${ausgelassen} Ferienwoche${ausgelassen===1?"":"n"} ausgelassen 🏖️`:""} ✓`:"Termin angelegt ✓");
      document.getElementById("tm-titel").value="";
      /* Hinweis leeren, Torzahlen NICHT: der Hinweis gilt fuer genau diesen Termin, der
         Aufbau sieht beim naechsten Training genauso aus. */
      const hh=document.getElementById("tm-helfer-hinweis"); if(hh)hh.value="";
      const sSel=document.getElementById("tm-serie"); if(sSel){sSel.value="";tmSerieToggle();}
      const sBis=document.getElementById("tm-serie-bis"); if(sBis)sBis.value="";
      const rb=document.getElementById("tm-addr-results");if(rb)rb.innerHTML="";tmSetTyp(tmTyp);tmLoad();
      /* v528: Beim Trainermeeting ist der Termin allein noch nichts – erst Abstimmung und
         Themen machen ihn zu einem. Anders als beim Fazit (dort ist die Arbeit mit dem
         Speichern FERTIG und ein Fenster, das aufspringt, wäre ein Übergriff) ist sie hier
         gerade erst angefangen. Deshalb geht es direkt weiter, nicht über ein Angebot. */
      if(tmTyp==="trainermeeting"&&daten.length===1&&typeof tmMeetingOeffnen==="function"){
        /* v529: Vorschlag 2 und 3 aus dem Formular wandern in die Abstimmung, bevor das
           Fenster aufgeht – dann steht sie beim ersten Blick schon vollstaendig da. */
        const weitere=[["tm-v2-datum","tm-v2-zeit"],["tm-v3-datum","tm-v3-zeit"]]
          .map(([d,z])=>({datum:document.getElementById(d)?.value||"",uhrzeit:document.getElementById(z)?.value||null}))
          .filter(v=>v.datum);
        ["tm-v2-datum","tm-v2-zeit","tm-v3-datum","tm-v3-zeit"].forEach(id=>{const el=document.getElementById(id); if(el)el.value="";});
        try{
          const neu=await fetch(`${SB_URL}/rest/v1/termine?typ=eq.trainermeeting&datum=eq.${encodeURIComponent(daten[0])}&select=id&order=id.desc&limit=1`,{headers:sbAuthHeaders()});
          if(neu.ok){const z=((await neu.json())||[])[0];
            if(z&&z.id){
              if(typeof tpollSicherstellen==="function")await tpollSicherstellen(z.id,weitere);
              tmMeetingOeffnen(z.id);
            }}
        }catch(e){}
      }
    }
    else toast("Fehler beim Anlegen","err");
  }catch(e){toast("Netzwerkfehler","err");}
  }finally{ tmAdd._busy=false; }
}
// Gegner-Adresse per Name finden (OpenStreetMap). Trainer tippt Verein/Platz -> Vorschläge ->
// Klick übernimmt die Adresse ins Ort-Feld (füttert auch das Termin-Wetter via Geocoding).
async function gegnerAddrSearch(){
  const box=document.getElementById("tm-addr-results"); if(!box)return;
  const gegner=(document.getElementById("tm-titel")?.value||"").trim();
  const ort=(document.getElementById("tm-ort")?.value||"").trim();
  const q=ort||gegner;
  if(!q){toast("Erst Gegner/Ort eintippen","err");return;}
  box.innerHTML=`<div style="font-size:11px;color:var(--text3);padding:6px 2px">🔍 Suche „${esc(q)}"…</div>`;
  const res=await osmSearch(q);
  if(!res.length){ box.innerHTML=`<div style="font-size:11px;color:var(--text3);padding:6px 2px">Keine Adresse gefunden – bitte manuell eintragen.</div>`; return; }
  box.innerHTML=`<div style="font-size:10px;color:var(--text3);margin:6px 2px 2px">Tippe die passende Adresse an:</div>`+
    res.map(r=>`<button type="button" onclick="gegnerAddrPick(this)" data-addr="${esc(r.label).replace(/"/g,"&quot;")}" style="display:block;width:100%;text-align:left;margin-top:4px;padding:8px 10px;border:1px solid var(--rand-bedien);border-radius:8px;background:var(--surface);font-family:inherit;font-size:11.5px;color:var(--text);cursor:pointer;white-space:normal;line-height:1.3">📍 ${esc(r.label)}</button>`).join("");
}
function gegnerAddrPick(btn){
  const addr=btn.getAttribute("data-addr")||"";
  const inp=document.getElementById("tm-ort"); if(inp)inp.value=addr;
  const name=(document.getElementById("tm-titel")?.value||"").trim();
  const box=document.getElementById("tm-addr-results");
  if(box)box.innerHTML=`<div style="font-size:11px;color:#16a34a;padding:4px 2px">✓ Adresse übernommen – Wetter nutzt jetzt diesen Ort.</div>`+
    (name?`<button type="button" class="btn btn-sm" style="margin-top:4px" onclick="gegnerQuickSave()"><i class="ti ti-address-book"></i>„${esc(name)}" als Gegner merken</button>`:"");
}

