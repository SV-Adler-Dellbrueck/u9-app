/* ═══════════════════════════════════════════════════════════
   ADLER DATA LAYER (Modularisierung 2/8)
   Reine Daten-Konstanten – klassisches Skript, geteilter Global-Scope.
   Wird VOR dem Haupt-Skript geladen; keine Ausfuehrung, keine DOM-Zugriffe.
   ═══════════════════════════════════════════════════════════ */

/* ═══ TRAINER ═══
   DIESE LISTE IST „WER TRAINIERT MIT" – NICHT „wer gehört zum Trainerstab".

   Der Unterschied ist keine Wortklauberei, er hat schon einmal Schaden angerichtet
   (v384): Zum Stab kann jemand gehören, der vollen Zugriff hat, aber keinen
   Trainingsdienst leistet – ein Betreuer. Wer hier steht, taucht auf in
     · den Trainer-Chips im Trainingsplan (wer ist heute da)
     · der Anwesenheitserfassung der Trainer
     · der rollierenden Sprachlob-Zuteilung nach Spielen
     · „Trainer spielen mit" beim Blitzturnier
     · den Sammelkarten der Kinder in der Kabine (je Trainer eine Karte!)
     · Ausdruck-Kopf, Urkunden-Unterschrift und Stadionheft-Fuß
   Ein Betreuer ohne Trainingsdienst gehört in NICHTS davon.

   ZUGRIFF hängt NICHT an dieser Liste, sondern an profiles.role='trainer' plus
   profiles.anzeigename in Supabase. Wer dazukommen soll, braucht dort einen
   Eintrag – und NUR wenn er auch mittrainiert, zusätzlich hier einen Namen.

   Wer „alle, die dazugehören" braucht (z. B. Verfügbarkeit am Termin), nimmt
   trainerstabNamen() aus core.js – nicht diese Liste.

   Wohnt in data.js (Welle 1), damit Stadionheft, Urkunden und Kinder-Album nicht
   davon abhängen, dass md-kabine.js aus Welle 2 schon geladen ist. Frueher lag sie
   dort, und drei Stellen trugen deshalb eine hartkodierte Notfall-Kopie mit sich
   herum – vier Namenslisten, die auseinanderlaufen konnten. */
const TRAINER=["Charles","Finn","Kenneth","Peter","Markus"];

/* ═══ ROLLEN IM TRAINERSTAB (Paket C) ═══
   Wer bekommt am Termin ein FELD, und wer nicht? Aus dieser Frage folgt alles Weitere:
   die Zahl der Felder, die Zahl der Gruppen, die Gruppengröße.

   · feldtrainer – steht an einer Station, bekommt ein Feld.
   · skill       – Skill Development Coach. Zählt als Feldtrainer, weil er die Torwart-
                   und Einzelstationen übernimmt; die laufen parallel zum Hauptteil.
   · organisation– Orga und Elternkommunikation. Ist da, bekommt aber kein Feld.

   Steht ein Name hier nicht, gilt „feldtrainer" – das ist das bisherige Verhalten, und
   ein unbekannter Name soll nicht still aus der Planung fallen.

   Die Rolle ist eine Eigenschaft der PERSON, nicht des Termins. Dass Markus an einem
   einzelnen Termin doch ein Feld übernimmt, ist eine Ausnahme und wird im Trainingsplan
   per Tipp auf seinen Chip gesetzt – nur für diesen Termin (siehe tpTrainerChipsRender). */
const TRAINER_ROLLE={Charles:"feldtrainer",Finn:"skill",Kenneth:"feldtrainer",Peter:"feldtrainer",Markus:"organisation"};
function trainerRolle(name){ return (typeof TRAINER_ROLLE==="object"&&TRAINER_ROLLE[name])||"feldtrainer"; }
function trainerIstFeldtrainer(name){ return trainerRolle(name)!=="organisation"; }

/* ═══ KRITERIEN FELDSPIELER (DIMS_FELD) ═══ */
const DIMS_FELD=[
{id:"tech",label:"Technik & Ball",icon:"ti-ball-football",col:"#1a56db",w:0.24,
 tier:[
  {n:"f_ballkontrolle",l:"Ballkontrolle & Dribbling",h:"Enge Ballführung & 1gg1 unter Gegnerdruck",opts:[
    {v:1,t:"Verspringt",d:"Annahme/Mitnahme unsicher, verliert Ball schnell"},
    {v:2,t:"Kontrolliert",d:"Sichere Ballführung im freien Raum"},
    {v:3,t:"Dribbelstark",d:"Übersteht 1gg1, Tempo- und Richtungswechsel"},
    {v:4,t:"Klebefuß",d:"Löst enge Situationen kreativ – Ball wie angebunden"}
  ]},
  {n:"f_pass",l:"Passspiel & Mitspielersicht",h:"Bewusstes, präzises Abspiel",opts:[
    {v:1,t:"Wegschlagen",d:"Kein Mitspielerblick, befreit unkontrolliert"},
    {v:2,t:"Gezielt",d:"Flache bewusste Pässe zum freien Mann"},
    {v:3,t:"Vorausschauend",d:"Erkennt Anspiel früh, gutes Timing"},
    {v:4,t:"Spielmacher",d:"Öffnet mit dem Pass Räume – präzise unter Druck"}
  ]},
  {n:"f_abschluss",l:"Torabschluss & Mut vorm Tor",h:"Entschlossenheit im Abschluss",opts:[
    {v:1,t:"Zögert",d:"Sucht den Abschluss nicht, spielt lieber ab"},
    {v:2,t:"Sucht Tor",d:"Schließt in klaren Situationen ab"},
    {v:3,t:"Torgefährlich",d:"Geht entschlossen zum Abschluss"},
    {v:4,t:"Vollstrecker",d:"Eiskalt & mutig, sucht den Abschluss aktiv"}
  ]}
 ],
 mx:[]
},
{id:"raute",label:"Spielintelligenz & Taktik",icon:"ti-chess",col:"#7c3aed",w:0.24,
 tier:[
  {n:"f_raum",l:"Raum & Position (Adler/Igel)",h:"Feld groß/eng machen statt Klumpen – Kernthema U9",opts:[
    {v:1,t:"Balljäger",d:"Klumpen – orientiert sich nur am Ball"},
    {v:2,t:"Auf Zuruf",d:"Reagiert auf 'Adler!'/'Igel!' des Trainers"},
    {v:3,t:"Positionsbewusst",d:"Hält Korridor/Position eigenständig"},
    {v:4,t:"Feldleser",d:"Wechselt selbst zwischen breit & eng, liest Situation"}
  ]},
  {n:"f_umschalt",l:"Umschalten & Pressing",h:"Offensiv ↔ Defensiv nach Ballverlust/-gewinn",opts:[
    {v:1,t:"Träge",d:"Bleibt beim Umschaltmoment stehen"},
    {v:2,t:"Reaktiv",d:"Schaltet auf Kommando um"},
    {v:3,t:"Aktiv",d:"Läuft nach Ballverlust selbst an"},
    {v:4,t:"Instinktiv",d:"Antizipiert Umschalten – sofortiges Gegenpressing"}
  ]},
  {n:"f_laufweg",l:"Offensiv-Laufwege & Entscheidung",h:"Freilaufen, Tiefe, Solo vs. Abspiel",opts:[
    {v:1,t:"Steht",d:"Bietet sich nicht an, keine Tiefe"},
    {v:2,t:"Bewegt sich",d:"Löst sich, einfache Freiläufe"},
    {v:3,t:"Timing",d:"Läuft in Schnittstellen, gute Entscheidung"},
    {v:4,t:"Cleverness",d:"Antizipiert, wählt konstant die beste Lösung"}
  ]},
  {n:"f_defense",l:"Zweikampf & Verteidigen",h:"Absichern, Zweikampf, Timing, Fairness",opts:[
    {v:1,t:"Weicht aus",d:"Meidet Zweikämpfe, lässt Gegner ziehen"},
    {v:2,t:"Stellt",d:"Geht in Zweikämpfe, solides Timing"},
    {v:3,t:"Ballgewinner",d:"Erobert Bälle, gutes Stellungsspiel hinten"},
    {v:4,t:"Abwehrchef",d:"Sichert ab, gewinnt Zweikämpfe fair & robust"}
  ]}
 ],
 mx:[]
},
{id:"phys",label:"Dynamik & Motorik",icon:"ti-run",col:"#d97706",w:0.16,
 tier:[
  {n:"f_tempo",l:"Tempo & Antritt",h:"Sprint & Reaktionsschnelligkeit",opts:[
    {v:1,t:"Gemächlich",d:"Langsamer als der Altersschnitt"},
    {v:2,t:"Altersgerecht",d:"Durchschnittlicher Antritt für U9"},
    {v:3,t:"Schnell",d:"Überdurchschnittlich – Waffe im 1gg1"},
    {v:4,t:"Blitzschnell",d:"Klar schnellster Bereich, entscheidet Duelle"}
  ]},
  {n:"f_koord",l:"Koordination & Wendigkeit",h:"Bewegungsqualität, Gleichgewicht, Richtungswechsel",opts:[
    {v:1,t:"Unsicher",d:"Stolpert, Richtungswechsel schwierig"},
    {v:2,t:"Solide",d:"Altersgerechte Grundkoordination"},
    {v:3,t:"Wendig",d:"Saubere Richtungswechsel, gutes Gleichgewicht"},
    {v:4,t:"Athletisch",d:"Elegant & wendig, auch bei Körperkontakt stabil"}
  ]},
  {n:"f_einsatz",l:"Laufbereitschaft & Energie",h:"Aktivität über die gesamte Einheit – auch ohne Ball",opts:[
    {v:1,t:"Passiv",d:"Wartet auf den Ball, zieht sich raus"},
    {v:2,t:"Stabil",d:"Verlässliche Laufarbeit"},
    {v:3,t:"Aktiv",d:"Immer anspielbar und anlaufend"},
    {v:4,t:"Ausdauermotor",d:"Höchste Aktivität bis zum Schluss"}
  ]}
 ],
 mx:[]
},
{id:"mental",label:"Persönlichkeit & Charakter",icon:"ti-brain",col:"#059669",w:0.24,
 tier:[
  {n:"f_selbst",l:"Selbstvertrauen & Mut unter Druck",h:"Traut sich Aktionen ohne Bestätigung zu",opts:[
    {v:1,t:"Zögert",d:"Weicht Druck aus, gibt Ball schnell ab"},
    {v:2,t:"Stabil",d:"Sicher in Normalsituationen"},
    {v:3,t:"Mutig",d:"Sucht Verantwortung auch unter Druck"},
    {v:4,t:"Sucht die Situation",d:"Will den Ball in engen Momenten, traut sich alles"}
  ]},
  {n:"f_team",l:"Teamgeist & Kommunikation",h:"Ansagen, anfeuern, Mitspieler fördern",opts:[
    {v:1,t:"Einzelkämpfer",d:"Kaum Interaktion, fordert Ball nur für sich"},
    {v:2,t:"Teamplayer",d:"Spielt ab, kommuniziert, unterstützt"},
    {v:3,t:"Motivator",d:"Feuert an, coacht Mitspieler"},
    {v:4,t:"Anführer",d:"Reißt Team mit, auch nach Rückschlägen"}
  ]},
  {n:"f_sozial",l:"Soziale Einstellung & Fairness",h:"Augenhöhe, Respekt, Miteinander",opts:[
    {v:1,t:"Schwierig",d:"Isoliert sich oder zeigt Überlegenheit"},
    {v:2,t:"Integriert",d:"Fair, akzeptiert alle Mitspieler"},
    {v:3,t:"Verbindend",d:"Bindet ein, achtet auf Schwächere"},
    {v:4,t:"Herz des Teams",d:"Fördert Zusammenhalt aktiv – niemand außen vor"}
  ]},
  {n:"f_resil",l:"Resilienz & Frustrationstoleranz",h:"Umgang mit Fehlern & Rückschlägen",opts:[
    {v:1,t:"Bricht ein",d:"Kopf hängt sofort nach Fehler"},
    {v:2,t:"Erholt sich",d:"Braucht kurz, findet zurück"},
    {v:3,t:"Stabil",d:"Steckt Fehler weg, bleibt im Spiel"},
    {v:4,t:"Unerschütterlich",d:"Nutzt Fehler als Antrieb"}
  ]}
 ],
 mx:[]
},
{id:"entw",label:"Lernen & Entwicklung",icon:"ti-trending-up",col:"#0e7490",w:0.12,
 tier:[
  {n:"f_coach",l:"Coachability & Fokus",h:"Impulse aufnehmen & konzentriert umsetzen",opts:[
    {v:1,t:"Braucht Zeit",d:"Fehler wiederholt sich, oft abgelenkt"},
    {v:2,t:"Regelmäßig",d:"Setzt mit Wiederholung um, solider Fokus"},
    {v:3,t:"Aufmerksam",d:"Nimmt Hinweise gut auf, konzentriert"},
    {v:4,t:"Blitzlernend",d:"Ein Hinweis genügt, volle Aufmerksamkeit"}
  ]},
  {n:"f_freude",l:"Spielfreude & Eigeninitiative",h:"Energie, Neugier, Engagement über das Training hinaus",opts:[
    {v:1,t:"Passiv",d:"Wenig sichtbare Eigenmotivation"},
    {v:2,t:"Interessiert",d:"Kommt gern, macht mit"},
    {v:3,t:"Begeistert",d:"Fragt nach mehr, probiert selbst"},
    {v:4,t:"Fußball-Junkie",d:"Brennt, kickt privat, bringt eigene Ideen"}
  ]}
 ],
 mx:[]
}
];

/* ═══ KRITERIEN TORWART (DIMS_TW) ═══ */
/* TW-Kriterien (Erweiterung für Kinder mit Torwart-Option) */
const DIMS_TW=[
{id:'tw_tech',label:'TW-Technik & Aktion',icon:'ti-hand-stop',col:'#854d0e',w:0.55,
 tier:[
  {n:'tw_fangen',l:'Fangen & Ball sichern',h:'Bälle sicher fangen und festhalten',opts:[
    {v:1,t:'Unsicher',d:'Lässt viele Bälle abprallen, kein sicherer Griff'},
    {v:2,t:'Solide',d:'Fängt erreichbare Bälle altersgerecht'},
    {v:3,t:'Sicher',d:'Sichert Bälle zuverlässig mit beiden Händen'},
    {v:4,t:'Fangsicher',d:'Klebt am Ball – auch schwierige Bälle festgehalten'}
  ]},
  {n:'tw_heraus',l:'Herausgehen: Mut & Entscheidung',h:'Wann kommt er raus – mutig und richtig?',opts:[
    {v:1,t:'Bleibt',d:'Bleibt auf der Linie, auch bei klaren Situationen'},
    {v:2,t:'Auf Ansage',d:'Geht heraus wenn Trainer/Mitspieler es ansagt'},
    {v:3,t:'Entscheidet',d:'Entscheidet meist selbst und richtig'},
    {v:4,t:'Herr des Raums',d:'Mutig & sicher, beherrscht den Strafraum'}
  ]},
  {n:'tw_reaktion',l:'Reaktion auf Schüsse',h:'Reaktionsschnelligkeit auf direkte Schüsse',opts:[
    {v:1,t:'Zu spät',d:'Reagiert oft zu spät – Ball ist schon drin'},
    {v:2,t:'Altersgerecht',d:'Hält für U9 erreichbare Bälle'},
    {v:3,t:'Schnell',d:'Gute Reaktion, hält auch platzierte Bälle'},
    {v:4,t:'Reflexstark',d:'Außergewöhnliche Reflexe für das Alter'}
  ]},
  {n:'tw_stellung',l:'Stellungsspiel & Winkel',h:'Position im Tor – verkürzt Winkel',opts:[
    {v:1,t:'Steht mittig',d:'Bleibt immer in der Tormitte stehen'},
    {v:2,t:'Grundstellung',d:'Hält altersgerechte Grundposition'},
    {v:3,t:'Verkürzt',d:'Geht dem Schützen entgegen, verkürzt Winkel'},
    {v:4,t:'Winkel-clever',d:'Stellt sich stark, macht das Tor klein'}
  ]}
 ],
 mx:[]
},
{id:'tw_spiel',label:'TW-Spiel & Führung',icon:'ti-chess',col:'#6d28d9',w:0.45,
 tier:[
  {n:'tw_aufbau',l:'Abwurf & Spielaufbau',h:'Qualität des ersten Passes nach Ballbesitz',opts:[
    {v:1,t:'Wegschlagen',d:'Unkontrolliert ohne Mitspielersicht'},
    {v:2,t:'Gezielt',d:'Spielt bewusst zum Aufpasser/freien Mann'},
    {v:3,t:'Eröffnet',d:'Leitet Angriffe gezielt ein'},
    {v:4,t:'Spielmacher',d:'Initiiert Konter mit präzisem erstem Pass'}
  ]},
  {n:'tw_komm',l:'Kommunikation & Organisieren',h:'Ansagen an Mitspieler – dirigiert die Abwehr',opts:[
    {v:1,t:'Still',d:'Keine Ansagen, gibt keine Orientierung'},
    {v:2,t:'Reagiert',d:'Ruft bei klaren Situationen: Mein Ball! / Komm!'},
    {v:3,t:'Dirigiert',d:'Organisiert die Abwehr aktiv'},
    {v:4,t:'Leader',d:'Echter Torhüter-Leader für sein Alter'}
  ]}
 ],
 mx:[]
}];

/* ═══ SPIELFORMEN / FORMATIONS ═══ */
const FORMATIONS={
  /* v503 (Kachel): FUNiño und 3+1 spielen dasselbe Dreieck 1-2 – Aufpasser hinten, zwei
     Flitzer vorn – mit denselben Wörtern wie in der Raute, damit die Kinder sie kennen. */
  'funino':{label:'Funino',tw:false,fieldCount:3,slots:[
    {role:'Aufpasser',x:50,y:74,cls:'tb-auf',rk:'aufpasser'},
    {role:'Flitzer L',x:26,y:40,cls:'tb-fl', rk:'flitzer_l'},
    {role:'Flitzer R',x:74,y:40,cls:'tb-fl', rk:'flitzer_r'},
  ]},
  '3+1':{label:'3+1',tw:true,fieldCount:3,slots:[
    {role:'TW',       x:50,y:92,cls:'tb-tw', rk:'tw'},
    {role:'Aufpasser',x:50,y:68,cls:'tb-auf',rk:'aufpasser'},
    {role:'Flitzer L',x:24,y:36,cls:'tb-fl', rk:'flitzer_l'},
    {role:'Flitzer R',x:76,y:36,cls:'tb-fl', rk:'flitzer_r'},
  ]},
  '4+1':{label:'4+1 Raute',tw:true,fieldCount:4,slots:[
    {role:'TW',       x:50,y:92,cls:'tb-tw', rk:'tw'},
    {role:'Aufpasser',x:50,y:72,cls:'tb-auf',rk:'aufpasser'},
    {role:'Flitzer L',x:18,y:48,cls:'tb-fl', rk:'flitzer_l'},
    {role:'Flitzer R',x:82,y:48,cls:'tb-fl', rk:'flitzer_r'},
    {role:'Jäger',    x:50,y:25,cls:'tb-jaeg',rk:'jaeger'},
  ]},
  '5+1':{label:'5+1',tw:true,fieldCount:5,slots:[
    {role:'TW',       x:50,y:92,cls:'tb-tw', rk:'tw'},
    {role:'Abwehr L', x:30,y:74,cls:'tb-auf',rk:'aufpasser'},
    {role:'Abwehr R', x:70,y:74,cls:'tb-auf',rk:'aufpasser'},
    {role:'Flitzer L',x:16,y:46,cls:'tb-fl', rk:'flitzer_l'},
    {role:'Flitzer R',x:84,y:46,cls:'tb-fl', rk:'flitzer_r'},
    {role:'Jäger',    x:50,y:26,cls:'tb-jaeg',rk:'jaeger'},
  ]},
};

/* ═══ TAKTIK-QUIZ SZENARIEN (TQ_SCENARIOS) ═══ */
const TQ_SCENARIOS=[
// ══════ Block 1: Grundlagen der Raute (Szenarien 1–10) ══════
{
  title:"Grundstellung der Raute",
  desc:"Toraus – der Gegner dribbelt von seiner Torauslinie ein. Stellt eure Raute auf: bei uns geht ihr dafür hinter die Mittellinie.",
  task:"Bringe alle Feldspieler in die richtige Raute-Grundstellung!",
  hint:"Aufpasser zentral hinten, Flitzer auf den Seiten, Jäger vorne an der Mittellinie – aber keiner drüben!",
  ball:{from:{x:50,y:8},to:{x:50,y:8}},
  opps:[{x:50,y:8,label:"Gegner"},{x:35,y:22,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:40,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:50,y:65,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:60,y:58,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:30,y:60,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:76,r:12},
    "Flitzer L":{x:25,y:62,r:12},
    "Flitzer R":{x:75,y:62,r:12},
    "Jäger":{x:50,y:56,r:10}
  },
  explain:{
    correct:"⚽ Genau! Aufpasser vor dem TW, Flitzer breit, Jäger vorne an der Mittellinie – die Raute steht, und keiner ist drüben!",
    wrong:"Tipp: Dribbelt der Gegner von seiner Torauslinie ein, steht die ganze Raute in der eigenen Hälfte – auch der Jäger! Aufpasser zentral vor dem TW, Flitzer L links und Flitzer R rechts, Jäger vorne kurz vor der Mittellinie."
  }
},
{
  title:"Raute nach links verschieben",
  desc:"Der Gegner hat den Ball und spielt auf seine rechte Seite (eure linke). Der Ball wandert nach links!",
  task:"Verschiebe die komplette Raute nach links – aber halte die Form!",
  hint:"Die Raute bewegt sich wie ein Block. Alle verschieben sich gleichmäßig zur Ballseite.",
  ball:{from:{x:50,y:40},to:{x:20,y:35}},
  opps:[{x:25,y:30,label:"Gegner",to:{x:20,y:35}},{x:50,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:57,y:71,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:38,y:54,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:79,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:54,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:68,r:14},
    "Flitzer L":{x:18,y:45,r:14},
    "Flitzer R":{x:55,y:50,r:16},
    "Jäger":{x:32,y:32,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Die Raute verschiebt als Block nach links – Abstände bleiben gleich!",
    wrong:"Tipp: ALLE verschieben sich nach links, nicht nur einer. Flitzer R muss zur Mitte kommen. Die Raute-Form bleibt erhalten, nur der Ort ändert sich."
  }
},
{
  title:"Raute nach rechts verschieben",
  desc:"Der Ball wandert jetzt auf die rechte Seite! Ein Gegner dribbelt dort nach vorne.",
  task:"Verschiebe die Raute nach rechts!",
  hint:"Spiegelverkehrt zum Linksverschieben. Flitzer L rückt zur Mitte, Flitzer R geht raus.",
  ball:{from:{x:50,y:40},to:{x:80,y:35}},
  opps:[{x:75,y:35,label:"Gegner",to:{x:80,y:35}},{x:60,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:43,y:71,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:21,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:62,y:54,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:46,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:65,y:68,r:14},
    "Flitzer L":{x:45,y:50,r:16},
    "Flitzer R":{x:82,y:45,r:14},
    "Jäger":{x:68,y:32,r:14}
  },
  explain:{
    correct:"💪 Stark! Raute verschiebt nach rechts – Flitzer L kommt zur Mitte!",
    wrong:"Tipp: Alles spiegelverkehrt. Flitzer L muss zur Mitte kommen, Flitzer R presst, Aufpasser und Jäger verschieben nach rechts."
  }
},
{
  title:"Ball zum rechten Flitzer",
  desc:"Euer Team hat den Ball. Der Aufpasser spielt einen Pass zum rechten Flitzer.",
  task:"Wohin bewegen sich die anderen Spieler? Verschiebe Flitzer L, Aufpasser und Jäger!",
  hint:"Denk an ADLER – Feld groß machen! Der Jäger orientiert sich Richtung Tor.",
  ball:{from:{x:50,y:72},to:{x:80,y:48}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:83,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:59,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:48,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:46,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:55,y:62,r:15},
    "Flitzer L":{x:25,y:38,r:15},
    "Jäger":{x:60,y:22,r:15}
  },
  explain:{
    correct:"⚽ Perfekt! Flitzer L hält die Breite, Aufpasser sichert ab, Jäger geht zum Tor!",
    wrong:"💡 Flitzer L bleibt breit, Aufpasser schiebt nach, Jäger geht Richtung Tor!"
  }
},
{
  title:"Gegner spielt nach rechts",
  desc:"Der Gegner hat den Ball und spielt ihn auf seine rechte Seite (eure linke!).",
  task:"Schaltet auf IGEL um! Wohin muss die Raute verschieben? Bewege alle Feldspieler!",
  hint:"IGEL = eng zusammenziehen, Richtung Ball verschieben. Nicht klumpen – Abstände halten!",
  ball:{from:{x:50,y:50},to:{x:20,y:35}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:75,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:10,y:54,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:38,y:68,r:14},
    "Flitzer L":{x:25,y:45,r:10},
    "Flitzer R":{x:55,y:50,r:16},
    "Jäger":{x:35,y:35,r:10}
  },
  explain:{
    correct:"💪 Stark! Alle verschieben zur Ballseite – so geht IGEL!",
    wrong:"💡 Bei IGEL verschiebt sich die GANZE Raute Richtung Ball!"
  }
},
{
  title:"Raute kompakt nach vorne",
  desc:"Ihr führt 1:0! Der Gegner spielt den Ball hinten hin und her. Jetzt wollt ihr pressen!",
  task:"Schiebe die ganze Raute kompakt nach vorne – Pressing!",
  hint:"Die Abstände bleiben eng, aber alles verschiebt sich Richtung gegnerisches Tor. Auch der Aufpasser rückt weit auf.",
  ball:{from:{x:50,y:15},to:{x:50,y:15}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:40,y:15,label:"Gegner",to:{x:36,y:17}},{x:60,y:15,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:48,r:14},
    "Flitzer L":{x:28,y:28,r:14},
    "Flitzer R":{x:72,y:28,r:14},
    "Jäger":{x:50,y:15,r:12}
  },
  explain:{
    correct:"🔥 Super Pressing! Raute in der gegnerischen Hälfte – eng und mit Druck!",
    wrong:"Tipp: ALLE rücken weit auf. Jäger geht bis fast an den gegnerischen TW. Flitzer auf Höhe der gegnerischen Abwehr. Aufpasser mindestens bis Mittellinie."
  }
},
{
  title:"Raute kompakt nach hinten",
  desc:"Der Gegner hat starke Stürmer! Ihr zieht euch zurück und verteidigt kompakt.",
  task:"Ziehe die Raute tief in die eigene Hälfte – aber halte die Form!",
  hint:"Tief stehen heißt nicht klumpen! Die Raute bleibt, nur alles ist näher am eigenen Tor.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:30,y:30,label:"Gegner"},{x:70,y:30,label:"Gegner"},{x:50,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:58,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:23,y:40,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:77,y:40,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:78,r:12},
    "Flitzer L":{x:28,y:62,r:15},
    "Flitzer R":{x:72,y:62,r:15},
    "Jäger":{x:50,y:50,r:14}
  },
  explain:{
    correct:"🛡️ Gut! Raute steht tief – Jäger auf Mittellinie, Aufpasser sichert nah am TW!",
    wrong:"Tipp: Alle zurückziehen, aber die Raute-Form bewahren. Jäger geht auf Mittellinie zurück, Flitzer in eigene Hälfte, Aufpasser nah am Strafraum."
  }
},
{
  title:"Dreieck bilden",
  desc:"Beim Ballbesitz brauchen wir immer zwei Anspielstationen! Das nennt man ein Dreieck.",
  task:"Schiebe Flitzer L und Jäger so, dass sie mit dem Aufpasser ein Dreieck bilden!",
  hint:"Dreieck = nicht alle auf einer Linie stehen!",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:50,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:47,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:25,y:50,r:15},
    "Jäger":{x:65,y:42,r:15}
  },
  explain:{
    correct:"Perfektes Dreieck! Der Aufpasser hat immer zwei Optionen. So behält ihr den Ball!",
    wrong:"Tipp: Nicht alle auf einer Linie! Flitzer L links, Jäger rechts versetzt – dann bilden alle drei ein Dreieck."
  }
},
{
  title:"Freilaufen für den Pass",
  desc:"Aufpasser hat den Ball. Jäger steht direkt beim Gegner – so kommt kein Pass an!",
  task:"Schiebe Jäger weg vom Gegner in den freien Raum! 🏃",
  hint:"Lauf dahin wo KEIN Gegner steht – dann kann der Pass ankommen!",
  ball:{from:{x:48,y:55},to:{x:48,y:55}},
  opps:[{x:40,y:28,label:"Gegner"},{x:55,y:32,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:55,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:48,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:47,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:72,y:28,r:13}
  },
  explain:{
    correct:"⚽ Super! Im freien Raum kann der Pass ankommen – gut freigelaufen!",
    wrong:"💡 Lauf weg vom Gegner in den freien Raum – rechts vorne ist Platz, dort kann der Ball hin!"
  }
},
{
  title:"Positionswechsel",
  desc:"Aufpasser rückt nach vorne! Wer übernimmt seinen Platz?",
  task:"Schiebe Flitzer L zur Aufpasser-Position – keine Lücke lassen!",
  hint:"Wenn einer rausläuft, muss ein anderer nachrücken!",
  ball:{from:{x:50,y:55},to:{x:50,y:55}},
  anim:[{role:"Aufpasser",to:{x:50,y:40}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:58,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:38,y:62,r:14}
  },
  explain:{
    correct:"Klug! Flitzer L füllt die Lücke – die Raute bleibt kompakt!",
    wrong:"Tipp: Wenn Aufpasser nach vorne läuft, muss Flitzer L in die Mitte einrücken!"
  }
},
// ══════ Block 2: ADLER & IGEL (Szenarien 11–20) ══════
{
  title:"ADLER aktivieren – Feld groß machen",
  desc:"Euer Aufpasser hat den Ball gewonnen! Sofort ADLER – das Feld groß machen!",
  task:"Bringe alle in die ADLER-Formation. Breit und tief!",
  hint:"ADLER = offensiv. Flitzer maximal breit, Jäger ganz vorne, Aufpasser zentral als Absicherung.",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  anim:[{role:"Aufpasser",to:{x:50,y:65}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:62,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:35,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:60,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:48,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:40,r:16},
    "Flitzer R":{x:88,y:40,r:16},
    "Jäger":{x:50,y:18,r:14}
  },
  explain:{
    correct:"🦅 ADLER perfekt! Feld maximal groß – Flitzer breit, Jäger vorne!",
    wrong:"Tipp: ADLER = Maximum breit! Flitzer L ganz links an die Linie, Flitzer R ganz rechts. Jäger ganz vorne Richtung gegnerisches Tor."
  }
},
{
  title:"ADLER – Aufpasser spielt auf Flitzer L",
  desc:"Der Aufpasser passt nach links auf Flitzer L. Der Ball fliegt!",
  task:"Flitzer L hat den Ball – wie reagieren die anderen? Verschiebe Jäger und Flitzer R!",
  hint:"Jäger bietet sich für die Flanke an. Flitzer R rückt etwas ein – Absicherung dahinter!",
  ball:{from:{x:50,y:65},to:{x:15,y:38}},
  opps:[{x:25,y:35,label:"Gegner"},{x:50,y:30,label:"Gegner"},{x:75,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:71,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:85,y:40,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:59,y:31,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:40,y:55,r:14},
    "Flitzer R":{x:65,y:30,r:16},
    "Jäger":{x:45,y:14,r:14}
  },
  explain:{
    correct:"⚽ Super! Jäger zum Tor, Flitzer R zum zweiten Pfosten, Aufpasser sichert ab!",
    wrong:"Tipp: Jäger muss Richtung Tor laufen – da kommt die Flanke hin! Flitzer R geht leicht nach innen. Aufpasser bleibt dahinter als Absicherung."
  }
},
{
  title:"ADLER – Flitzer L dribbelt nach vorne",
  desc:"Flitzer L hat seinen Gegenspieler ausgespielt und dribbelt in Richtung Tor!",
  task:"Flitzer L dribbelt – wo positionieren sich die anderen für den Abschluss?",
  hint:"Jäger zum nahen Pfosten, Flitzer R zum fernen Pfosten. Aufpasser sichert!",
  ball:{from:{x:15,y:38},to:{x:18,y:22}},
  opps:[{x:35,y:20,label:"Gegner"},{x:55,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Flitzer L",to:{x:18,y:22}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:43,y:63,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:65,y:36,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:54,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:42,r:14},
    "Flitzer R":{x:65,y:12,r:16},
    "Jäger":{x:40,y:8,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Jäger nah, Flitzer R fern, Aufpasser sichert dahinter!",
    wrong:"Tipp: Jäger = naher Pfosten (dort kommt die Flanke zuerst an). Flitzer R = ferner Pfosten. Aufpasser hält Abstand und sichert gegen Konter."
  }
},
{
  title:"ADLER – Spielverlagerung",
  desc:"Flitzer L hat den Ball, aber links ist alles zugestellt. Der Aufpasser ruft: „Verlagern!“",
  task:"Flitzer L passt zurück auf den Aufpasser. Wohin bewegt sich Flitzer R?",
  hint:"Spielverlagerung = Ball schnell auf die andere Seite! Flitzer R muss anspielbar sein.",
  ball:{from:{x:15,y:38},to:{x:50,y:60}},
  opps:[{x:20,y:30,label:"Gegner"},{x:18,y:42,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:12,y:30,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:61,y:35,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:33,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:20,y:50,r:14},
    "Flitzer R":{x:85,y:35,r:16},
    "Jäger":{x:55,y:20,r:14}
  },
  explain:{
    correct:"👍 Toll! Flitzer R geht breit – Verlagerung! Jäger verschiebt zur Ballseite.",
    wrong:"Tipp: Flitzer R muss BREIT gehen um die Verlagerung zu empfangen – raus an die rechte Seite! Flitzer L lässt sich auf seiner Seite fallen."
  }
},
{
  title:"ADLER – Konter über rechts",
  desc:"Der Aufpasser hat verlagert! Flitzer R hat jetzt den Ball auf der rechten Seite – viel Platz!",
  task:"Flitzer R dribbelt – wie unterstützt das Team den Angriff über rechts?",
  hint:"Jäger geht zum Tor, Flitzer L rückt zur Mitte als zweite Welle.",
  ball:{from:{x:50,y:60},to:{x:85,y:35}},
  opps:[{x:70,y:30,label:"Gegner",to:{x:78,y:32}},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:46,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:35,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:60,y:48,r:14},
    "Flitzer L":{x:40,y:25,r:16},
    "Jäger":{x:60,y:10,r:14}
  },
  explain:{
    correct:"⚡ Klasse! Jäger zum Tor, Flitzer L rückt ein – 3 Anspielstationen!",
    wrong:"Tipp: Jäger Richtung Tor! Flitzer L nicht links stehen bleiben – einrücken zur Mitte für die zweite Welle. Aufpasser zur Ballseite verschieben und absichern."
  }
},
{
  title:"IGEL aktivieren – eng zusammen!",
  desc:"Der Gegner hat den Ball im Mittelfeld. Zeit für den IGEL – eng zusammenziehen!",
  task:"Bringe alle in die IGEL-Formation. Kompakt, enge Abstände!",
  hint:"IGEL = defensiv. Alle nah zusammen, Zwischenräume zu. Nicht breit stehen!",
  ball:{from:{x:50,y:40},to:{x:50,y:40}},
  opps:[{x:30,y:32,label:"Gegner"},{x:70,y:32,label:"Gegner"},{x:50,y:20,label:"Gegner"},{x:50,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:88,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:22,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:68,r:12},
    "Flitzer L":{x:35,y:52,r:14},
    "Flitzer R":{x:65,y:52,r:14},
    "Jäger":{x:50,y:40,r:12}
  },
  explain:{
    correct:"🦔 Igel perfekt! Alle eng zusammen – der Gegner findet keinen Raum!",
    wrong:"Tipp: IGEL = eng! Flitzer L und Flitzer R müssen zur Mitte kommen. Jäger lässt sich zurückfallen. Die Zwischenräume müssen geschlossen werden."
  }
},
{
  title:"IGEL – Gegner greift links an",
  desc:"Ein Gegenspieler dribbelt auf eurer linken Seite nach vorne!",
  task:"Verschiebe den IGEL zur Ballseite – links!",
  hint:"Flitzer L presst, Rest verschiebt. Aber: Nicht alle zum Ball! Absicherung dahinter!",
  ball:{from:{x:50,y:40},to:{x:20,y:35}},
  opps:[{x:50,y:40,label:"Gegner",to:{x:20,y:35}},{x:60,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:35,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:72,y:52,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:38,y:65,r:14},
    "Flitzer L":{x:20,y:40,r:10},
    "Flitzer R":{x:50,y:52,r:14},
    "Jäger":{x:34,y:38,r:10}
  },
  explain:{
    correct:"✅ Richtig! Flitzer L presst, Aufpasser sichert dahinter – kein Loch in der Mitte!",
    wrong:"Tipp: Flitzer L geht DIREKT auf den Ball. Aufpasser dahinter als Absicherung. Flitzer R kommt zur Mitte, Jäger nach links. Keiner bleibt auf der ballfernen Seite!"
  }
},
{
  title:"IGEL – Gegner wechselt die Seite",
  desc:"Der Gegner hat schnell auf rechts verlagert! Sein Spieler dribbelt rechts nach vorne.",
  task:"Schnell! Verschiebe den IGEL jetzt nach rechts!",
  hint:"Die Raute muss als Block zur neuen Ballseite. Flitzer R presst jetzt!",
  ball:{from:{x:20,y:35},to:{x:80,y:32}},
  opps:[{x:20,y:35,label:"Gegner",to:{x:80,y:32}},{x:55,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:38,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:40,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:50,y:52,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:32,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:62,y:65,r:14},
    "Flitzer L":{x:50,y:50,r:14},
    "Flitzer R":{x:78,y:38,r:10},
    "Jäger":{x:65,y:35,r:10}
  },
  explain:{
    correct:"⚡ Blitzschnell verschoben! Raute rechts – Flitzer R presst den Ball!",
    wrong:"Tipp: Wenn der Ball die Seite wechselt, ALLE sofort nachschieben! Flitzer R übernimmt das Pressing, Flitzer L kommt zur Mitte. Der Block verschiebt sich komplett."
  }
},
{
  title:"IGEL – Durchbruch verhindern",
  desc:"Ein Gegenspieler hat sich durchgespielt und ist auf dem Weg zum Tor! Notfall!",
  task:"Sichere den Strafraum! Alle zurück – aber nicht klumpen!",
  hint:"Aufpasser deckt den Durchbruchspieler. Flitzer sichern die Seiten. Jäger fällt zurück.",
  ball:{from:{x:50,y:40},to:{x:45,y:55}},
  opps:[{x:50,y:40,label:"Gegner",to:{x:45,y:55}},{x:25,y:45,label:"Gegner"},{x:70,y:42,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:56,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:36,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:64,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:48,y:72,r:10},
    "Flitzer L":{x:32,y:68,r:12},
    "Flitzer R":{x:68,y:68,r:14},
    "Jäger":{x:48,y:58,r:10}
  },
  explain:{
    correct:"🛡️ Gut gesichert! Jäger verzögert, die anderen bilden eine Kette!",
    wrong:"Tipp: Im Notfall alle zurück, aber NICHT auf einem Haufen! Jäger verzögert, Aufpasser sichert Mitte, Flitzer decken die Seiten vor dem Strafraum ab."
  }
},
{
  title:"IGEL – Ecke gegen uns",
  desc:"Ecke für den Gegner an eurem Tor! Er dribbelt von rechts ein oder passt kurz zu einem Mitspieler.",
  task:"Positioniere die Raute zur Ecken-Verteidigung!",
  hint:"Alle zurück vors Tor. Flitzer R stellt den Eindribbler, jeder andere deckt einen Raum.",
  ball:{from:{x:97,y:96},to:{x:82,y:84}},
  opps:[{x:96,y:94,label:"Gegner",to:{x:82,y:84}},{x:62,y:80,label:"Gegner"},{x:42,y:82,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:51,y:66,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:84,r:10},
    "Flitzer L":{x:34,y:80,r:10},
    "Flitzer R":{x:72,y:80,r:10},
    "Jäger":{x:52,y:70,r:10}
  },
  explain:{
    correct:"🛡️ Gut verteidigt! Alle zurück, jeder Raum besetzt – der Gegner findet keine Lücke!",
    wrong:"Tipp: Bei einer Ecke gegen euch ALLE zurück vors Tor! Flitzer R geht zum Eindribbler, Aufpasser sichert die Mitte, Flitzer L den fernen Pfosten, Jäger den Rückraum."
  }
},
// ══════ Block 3: Umschalten & Pressing (Szenarien 21–30) ══════
{
  title:"Ballgewinn! Umschalten",
  desc:"Euer Aufpasser gewinnt den Ball im Mittelfeld! Schnelles Umschalten von IGEL auf ADLER!",
  task:"Schalte sofort auf ADLER um – wohin sprinten die Spieler?",
  hint:"Umschalten = sofort breit machen! Flitzer auf die Außenbahnen, Jäger ab in die Spitze!",
  ball:{from:{x:45,y:65},to:{x:50,y:60}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:35,y:55,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:45,y:42,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:15,y:38,r:16},
    "Flitzer R":{x:85,y:38,r:16},
    "Jäger":{x:50,y:20,r:15}
  },
  explain:{
    correct:"⚡ Blitzschnell umgeschaltet! Breit machen – ADLER-Moment!",
    wrong:"💡 Nach Ballgewinn sofort ADLER! Flitzer breit raus, Jäger in die Spitze!"
  }
},
{
  title:"Umschalten: Ballgewinn links!",
  desc:"Flitzer L gewinnt das 1gg1 und erobert den Ball auf der linken Seite!",
  task:"Sofort umschalten auf ADLER! Wohin sprinten die Mitspieler?",
  hint:"Nach Ballgewinn: Feld sofort groß machen. Flitzer R raus, Jäger tief, Aufpasser nachrücken.",
  ball:{from:{x:22,y:45},to:{x:22,y:45}},
  opps:[{x:25,y:48,label:"Gegner"},{x:50,y:30,label:"Gegner"},{x:60,y:40,label:"Gegner"}],
  anim:[{role:"Flitzer L",to:{x:22,y:45}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:34,y:79,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:45,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:55,y:52,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:35,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:40,y:58,r:14},
    "Flitzer R":{x:85,y:38,r:16},
    "Jäger":{x:45,y:18,r:14}
  },
  explain:{
    correct:"⚡ Schnell umgeschaltet! Flitzer R breit rechts, Jäger in die Spitze!",
    wrong:"Tipp: Bei Ballgewinn SOFORT breit machen! Flitzer R muss raus an die Seitenlinie. Jäger sprintet in die Spitze. Nicht warten – SCHNELLIGKEIT zählt!"
  }
},
{
  title:"Umschalten: Ballgewinn Mitte",
  desc:"Der Aufpasser fängt einen Pass im Zentrum ab! Jetzt schnell nach vorne!",
  task:"Aufpasser hat den Ball in der Mitte. Zeige die Laufwege beim Umschalten!",
  hint:"Alle Optionen schaffen: Links breit, rechts breit, vorne tief!",
  ball:{from:{x:50,y:60},to:{x:50,y:60}},
  opps:[{x:55,y:55,label:"Gegner",to:{x:55,y:50}},{x:40,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:35,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:60,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:42,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:38,r:16},
    "Flitzer R":{x:88,y:38,r:16},
    "Jäger":{x:50,y:18,r:14}
  },
  explain:{
    correct:"⚡ Blitz-Umschalten! Flitzer breit, Jäger tief – 3 Optionen!",
    wrong:"Tipp: Nach Ballgewinn in der Mitte habt ihr ALLE Optionen. Flitzer müssen sofort BREIT gehen. Jäger sofort in die TIEFE. Nicht stehen bleiben!"
  }
},
{
  title:"Umschalten: Ballverlust vorne!",
  desc:"Euer Jäger verliert den Ball im Angriff! Der Gegner kontert sofort!",
  task:"Sofort zurückschalten auf IGEL! Alle zurückfallen und kompakt werden!",
  hint:"Jäger = erster Verteidiger! Flitzer zurück zur Mitte, Aufpasser absichern!",
  ball:{from:{x:50,y:18},to:{x:50,y:30}},
  opps:[{x:45,y:22,label:"Gegner",to:{x:50,y:30}},{x:30,y:35,label:"Gegner"},{x:70,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:46,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:38,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:68,r:14},
    "Flitzer L":{x:35,y:52,r:16},
    "Flitzer R":{x:65,y:52,r:16},
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"🦔 Schnell reagiert! Jäger verzögert, Flitzer zur Mitte – IGEL!",
    wrong:"Tipp: Jäger NICHT stehen bleiben – er ist jetzt der ERSTE VERTEIDIGER! Flitzer von den Seiten zur Mitte. Aufpasser sofort tief zurück. IGEL formen!"
  }
},
{
  title:"Umschalten: Ballverlust Mitte",
  desc:"Der Aufpasser verliert den Ball bei einem Fehlpass! Der Gegner schaltet um!",
  task:"Aufpasser hat den Ball verloren – wie reagiert die Mannschaft?",
  hint:"Aufpasser: Sofort Gegenpressing! Rest: Zurückfallen und Räume schließen!",
  ball:{from:{x:50,y:60},to:{x:55,y:50}},
  opps:[{x:55,y:55,label:"Gegner",to:{x:55,y:50}},{x:30,y:35,label:"Gegner"},{x:75,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:72,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:42,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:52,y:55,r:10},
    "Flitzer L":{x:35,y:55,r:14},
    "Flitzer R":{x:65,y:55,r:10},
    "Jäger":{x:50,y:42,r:10}
  },
  explain:{
    correct:"💪 Gut! Aufpasser macht Gegenpressing – Flitzer schließen Passwege!",
    wrong:"Tipp: Der Aufpasser muss SOFORT den Ballführer attackieren (Gegenpressing). Rest: Passwege schließen und kompakt werden."
  }
},
{
  title:"Umschalten: Doppel-Wechsel",
  desc:"Ballgewinn – schnell Adler – aber sofort wieder Ballverlust! Zurück zum IGEL!",
  task:"Ihr hattet gerade erst umgeschaltet, jetzt wieder zurück! Schnelles Denken!",
  hint:"Konzentration! Aus der ADLER-Position sofort zurück in den IGEL!",
  ball:{from:{x:40,y:30},to:{x:45,y:38}},
  opps:[{x:40,y:35,label:"Gegner",to:{x:45,y:38}},{x:65,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:46,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:12,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:88,y:38,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:18,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:68,r:14},
    "Flitzer L":{x:35,y:52,r:12},
    "Flitzer R":{x:65,y:52,r:16},
    "Jäger":{x:48,y:42,r:12}
  },
  explain:{
    correct:"🦅➡️🦔 Super! Von ADLER sofort zurück in IGEL – top Umschalten!",
    wrong:"Tipp: Die Flitzer müssen REIN zur Mitte – aus der breiten ADLER-Position eng zusammen. Jäger lässt sich zurückfallen. Aufpasser tief zurück."
  }
},
{
  title:"Pressing-Falle",
  desc:"Der Gegner baut hinten auf. Euer Jäger startet das Pressing!",
  task:"Wie läuft das Team-Pressing? Verschiebe alle nach vorne!",
  hint:"Jäger presst den Ballführenden. Flitzer schneiden Passwege ab. Aufpasser rückt nach.",
  ball:{from:{x:50,y:20},to:{x:50,y:20}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:50,y:22,label:"Gegner"},{x:28,y:22,label:"Gegner"},{x:72,y:22,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:24,y:51,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:76,y:51,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:48,r:14},
    "Flitzer L":{x:30,y:30,r:14},
    "Flitzer R":{x:70,y:30,r:14},
    "Jäger":{x:50,y:18,r:12}
  },
  explain:{
    correct:"💪 Starkes Pressing! Jäger presst, alle schieben kompakt nach!",
    wrong:"💡 IGEL nach vorne schieben! Jäger presst, Rest rückt mit hoch!"
  }
},
{
  title:"Pressing: Jäger leitet ein",
  desc:"Der gegnerische Torwart hat den Ball am Fuß und will hinten aufbauen. Euer Jäger startet das Pressing!",
  task:"Wie unterstützen die Mitspieler den Jäger? Alle nachrücken!",
  hint:"Der Jäger lenkt den Gegner auf eine Seite. Flitzer und Aufpasser rücken nach.",
  ball:{from:{x:50,y:8},to:{x:50,y:8}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:30,y:15,label:"Gegner"},{x:70,y:15,label:"Gegner"},{x:50,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:24,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:76,y:50,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:45,r:14},
    "Flitzer L":{x:28,y:28,r:14},
    "Flitzer R":{x:72,y:28,r:14},
    "Jäger":{x:50,y:12,r:12}
  },
  explain:{
    correct:"🔥 Starkes Pressing! Jäger presst TW, Flitzer rücken auf die Verteidiger!",
    wrong:"Tipp: Pressing ist TEAMARBEIT! Jäger allein reicht nicht. Flitzer müssen auf die Verteidiger gehen, Aufpasser nachrücken."
  }
},
{
  title:"Pressing: Jäger lenkt nach links",
  desc:"Der Jäger hat den gegnerischen TW nach links gelenkt! Der TW passt zu seinem rechten Verteidiger.",
  task:"Pressing-Falle zuschnappen! Flitzer L muss pressen!",
  hint:"Flitzer L attackiert den Ballführer. Jäger schneidet den Rückpass ab. Flitzer R und Aufpasser rücken nach.",
  ball:{from:{x:50,y:8},to:{x:28,y:15}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:28,y:15,label:"Gegner"},{x:70,y:15,label:"Gegner"},{x:50,y:25,label:"Gegner"}],
  anim:[{role:"Jäger",to:{x:42,y:12}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:51,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:31,y:39,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:72,y:28,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:12,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:45,y:35,r:10},
    "Flitzer L":{x:25,y:18,r:14},
    "Flitzer R":{x:55,y:25,r:10}
  },
  explain:{
    correct:"🪤 Die Falle schnappt zu! Flitzer L presst, Jäger schneidet den Pass ab!",
    wrong:"Tipp: Flitzer L muss AGGRESSIV auf den Ballführer. Flitzer R verschiebt zur Mitte und deckt den Passweg. Aufpasser rückt als Absicherung nach."
  }
},
{
  title:"Pressing: Gegner spielt sich raus",
  desc:"Mist! Der Gegner hat euer Pressing überspielt und ist im Mittelfeld am Ball!",
  task:"Das Pressing ist gescheitert – schnell zurück! Formiert den IGEL!",
  hint:"Wenn Pressing scheitert: Sofort zurück und kompakt werden. Nicht weiterjagen!",
  ball:{from:{x:28,y:15},to:{x:50,y:38}},
  opps:[{x:28,y:15,label:"Gegner",to:{x:50,y:38}},{x:30,y:30,label:"Gegner"},{x:70,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:35,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:18,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:25,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:42,y:12,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:62,r:14},
    "Flitzer L":{x:35,y:50,r:14},
    "Flitzer R":{x:65,y:50,r:14},
    "Jäger":{x:50,y:42,r:14}
  },
  explain:{
    correct:"🦔 Richtig! Pressing überspielt? Sofort zurück und IGEL bilden!",
    wrong:"Tipp: NICHT dem Ball nachjagen! Alle zurück in die eigene Hälfte und IGEL formieren. Jäger verzögert, Rest baut die Raute wieder auf."
  }
},
// ══════ Block 4: Spielaufbau (Szenarien 31–40) ══════
{
  title:"Spieleröffnung vom Torwart",
  desc:"Euer Torwart hat den Ball nach einer Parade. Er will schnell das Spiel eröffnen!",
  task:"Biete Anspielstationen! Wohin bewegen sich alle Feldspieler?",
  hint:"ADLER-Form! Aufpasser bietet sich kurz an – rechts oder links vom TW. Flitzer breit, Jäger tief!",
  ball:{from:{x:50,y:90},to:{x:50,y:90}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:47,y:58,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:38,y:56,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:62,y:56,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:48,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":[{x:35,y:78,r:14},{x:65,y:78,r:14},{x:50,y:78,r:12}],
    "Flitzer L":{x:15,y:50,r:16},
    "Flitzer R":{x:85,y:50,r:16},
    "Jäger":{x:50,y:25,r:15}
  },
  explain:{
    correct:"⚽ Super! Aufpasser kurz anspielbar, Flitzer breit, Jäger tief – perfekte Anspieloptionen!",
    wrong:"💡 Aufpasser KURZ rechts oder links vom TW, Flitzer BREIT, Jäger in die TIEFE!"
  }
},
{
  title:"Spielaufbau: TW kurz auf Aufpasser",
  desc:"Euer Torwart hat den Ball nach einer Parade. Er will kurz auf den Aufpasser spielen.",
  task:"Aufpasser bietet sich an. Wo stehen die anderen, um Optionen zu geben?",
  hint:"Kurzer Aufbau: Aufpasser kommt nah zum TW. Flitzer gehen breit, Jäger macht Tiefe.",
  ball:{from:{x:50,y:90},to:{x:48,y:78}},
  opps:[{x:50,y:30,label:"Gegner"},{x:35,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:54,y:59,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:35,y:55,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:65,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:47,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":[{x:48,y:78,r:12},{x:35,y:78,r:14},{x:65,y:78,r:14}],
    "Flitzer L":{x:15,y:48,r:16},
    "Flitzer R":{x:85,y:48,r:16},
    "Jäger":{x:50,y:25,r:14}
  },
  explain:{
    correct:"⚽ Perfekt! TW hat 4 Anspielstationen – Aufpasser kurz anspielbar, Flitzer breit, Jäger tief!",
    wrong:"Tipp: Aufpasser kommt NAH zum TW (rechts oder links). Flitzer BREIT. Jäger TIEF."
  }
},
{
  title:"Spielaufbau: Aufpasser dreht auf",
  desc:"Der Aufpasser hat den Ball vom TW bekommen und dreht sich auf. Er schaut nach vorne.",
  task:"Der Aufpasser hat Platz! Wohin bewegen sich die Mitspieler?",
  hint:"Aufpasser schaut nach vorne – jetzt Räume öffnen! Flitzer breit, Jäger zwischen den Gegnern.",
  ball:{from:{x:48,y:78},to:{x:50,y:68}},
  opps:[{x:50,y:30,label:"Gegner"},{x:35,y:40,label:"Gegner",to:{x:40,y:45}}],
  anim:[{role:"Aufpasser",to:{x:50,y:68}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:78,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:19,y:61,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:81,y:61,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:38,r:16},
    "Flitzer R":{x:88,y:38,r:16},
    "Jäger":{x:50,y:18,r:14}
  },
  explain:{
    correct:"🦅 Exzellent! Aufpasser dreht sich – Flitzer breit, Jäger tief!",
    wrong:"Tipp: Wenn der Aufpasser Platz hat: Flitzer NOCH breiter nach vorne. Jäger geht TIEF in den Raum. Optionen schaffen!"
  }
},
{
  title:"Spielaufbau: Aufpasser spielt lang",
  desc:"Der Aufpasser sieht den Jäger frei und spielt einen langen Ball nach vorne!",
  task:"Der Ball fliegt zum Jäger – wie reagieren die Flitzer?",
  hint:"Wenn der Ball lang geht, müssen die Flitzer sprinten, um den Jäger zu unterstützen!",
  ball:{from:{x:50,y:68},to:{x:50,y:22}},
  opps:[{x:45,y:20,label:"Gegner"},{x:55,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:72,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:12,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:88,y:38,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:22,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:50,r:14},
    "Flitzer L":{x:20,y:18,r:16},
    "Flitzer R":{x:80,y:18,r:16}
  },
  explain:{
    correct:"⚡ Klasse! Flitzer sprinten hoch – zu viert im Angriff!",
    wrong:"Tipp: Langer Ball = Flitzer SPRINTEN! Sie müssen schnell zum Jäger, um Überzahl zu schaffen. Aufpasser rückt in den Mittelkreis."
  }
},
{
  title:"Spielaufbau: Aufpasser unter Druck",
  desc:"Der Aufpasser bekommt den Ball, aber ein Gegner presst ihn sofort! Kein Platz nach vorne!",
  task:"Aufpasser ist unter Druck – welche Optionen hat er?",
  hint:"Unter Druck: Zurück zum TW ist immer eine Option! Oder Flitzer L/Flitzer R kommen kurz.",
  ball:{from:{x:50,y:90},to:{x:48,y:75}},
  opps:[{x:50,y:35,label:"Gegner",to:{x:49,y:68}},{x:35,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:75,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:13,y:44,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:87,y:44,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:25,y:65,r:16},
    "Flitzer R":{x:75,y:65,r:16},
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"👍 Gut gelöst! Flitzer kommen kurz als Hilfe – oder Rückpass zum TW!",
    wrong:"Tipp: Wenn der Aufpasser unter Druck steht, müssen die Flitzer kurz kommen und helfen! Nicht breit stehen bleiben – KURZ anbieten!"
  }
},
{
  title:"Spielaufbau: Verlagerung über den TW",
  desc:"Flitzer L hat den Ball, aber links ist alles dicht. Er spielt zurück zum TW, der soll verlagern!",
  task:"Der TW bekommt den Rückpass. Wie positioniert sich das Team für die Verlagerung nach rechts?",
  hint:"Bei Verlagerung über TW: Flitzer R breit rechts, Aufpasser kommt kurz, Jäger bleibt vorne.",
  ball:{from:{x:15,y:38},to:{x:50,y:88}},
  opps:[{x:18,y:35,label:"Gegner"},{x:20,y:45,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:38,y:54,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:64,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:33,y:22,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":[{x:55,y:75,r:14},{x:45,y:75,r:14}],
    "Flitzer L":{x:30,y:52,r:14},
    "Flitzer R":{x:88,y:42,r:16},
    "Jäger":{x:55,y:22,r:14}
  },
  explain:{
    correct:"🦅 Super Verlagerung! Flitzer R breit rechts – dort ist der Raum!",
    wrong:"Tipp: Bei Verlagerung über TW muss Flitzer R breit rechts gehen. Aufpasser bietet sich als kurze Option. Flitzer L fällt zurück, Jäger bleibt vorne."
  }
},
{
  title:"Spielaufbau lesen",
  desc:"TW hat den Ball. Aufpasser und Flitzer L bieten sich an – wer ist besser?",
  task:"Schiebe Aufpasser in die bessere, sicherere Position!",
  hint:"Der sicherste Pass gewinnt!",
  ball:{from:{x:50,y:92},to:{x:50,y:80}},
  opps:[{x:22,y:68,label:"Gegner"},{x:20,y:55,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:33,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:62,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":[{x:50,y:80,r:13},{x:62,y:80,r:14},{x:65,y:78,r:14}]
  },
  explain:{
    correct:"Aufpasser kurz und anspielbar – weg von den Gegnern, super Position!",
    wrong:"Tipp: Aufpasser weg von den Gegnern links – kurz rechts oder zentral anbieten!"
  }
},
{
  title:"Rückpass zum TW",
  desc:"Alle Wege nach vorne sind versperrt. Was tun?",
  task:"Spiele sicher zurück! Schiebe Aufpasser in die Rückpass-Position!",
  hint:"Rückpass ist keine Niederlage – es ist klug!",
  ball:{from:{x:45,y:65},to:{x:50,y:88}},
  opps:[{x:55,y:60,label:"Gegner"},{x:40,y:55,label:"Gegner"},{x:48,y:72,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:43,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:80,r:13}
  },
  explain:{
    correct:"Klug! Sicherer Rückpass statt Risiko – Ballerhalt ist wichtiger!",
    wrong:"Tipp: Wenn kein Weg nach vorne frei ist, gehe zurück zum TW. Neustart ist besser als Ballverlust!"
  }
},
{
  title:"Ball halten – sicherer Pass",
  desc:"Ihr habt den Ball! Kein Stress – spielt sicher!",
  task:"Bewege Flitzer L in eine sichere Position zum Anspielen!",
  hint:"Freier Raum suchen und sichtbar sein – kein Gegner in der Passlinie!",
  ball:{from:{x:50,y:72},to:{x:18,y:52}},
  opps:[{x:25,y:55,label:"Gegner"},{x:40,y:60,label:"Gegner"},{x:60,y:58,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:72,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:38,y:61,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:18,y:52,r:14}
  },
  explain:{
    correct:"Gut! Flitzer L hat sich in den freien Raum bewegt – jetzt kann der Aufpasser sicher anspielen!",
    wrong:"Tipp: Flitzer L muss weg von den Gegnern! In den freien Raum, wo der Pass sicher ankommt."
  }
},
{
  title:"Kurzpass-Kombinationen",
  desc:"Der Gegner presst! Mit schnellen kurzen Pässen kommt ihr raus!",
  task:"Schiebe Aufpasser und Flitzer L in kurze Dreiecks-Positionen!",
  hint:"Kurze Pässe, schnelle Bewegung, Dreieck bilden!",
  ball:{from:{x:50,y:72},to:{x:50,y:72}},
  opps:[{x:48,y:68,label:"Gegner"},{x:58,y:65,label:"Gegner"},{x:38,y:70,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:42,y:78,r:13},
    "Flitzer L":{x:30,y:65,r:14}
  },
  explain:{
    correct:"Wunderbares Dreieck! Mit Kurzpassspiel kommt ihr aus dem Pressing raus!",
    wrong:"Tipp: Aufpasser zurück und seitlich, Flitzer L kurz anbieten – zusammen ein Dreieck bilden."
  }
},
// ══════ Block 5: Flügel & Konter (Szenarien 41–50) ══════
{
  title:"Flügelspiel: Flitzer L am Ball – Breite halten",
  desc:"Flitzer L hat den Ball auf der linken Seite. Er schaut nach vorne.",
  task:"Flitzer L hat den Ball – wie positionieren sich die anderen?",
  hint:"Aufpasser sichert schräg dahinter. Flitzer R hält die Breite auf der anderen Seite!",
  ball:{from:{x:50,y:65},to:{x:15,y:40}},
  opps:[{x:22,y:38,label:"Gegner"},{x:50,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:67,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:40,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:66,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:59,y:29,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:55,r:14},
    "Flitzer R":{x:80,y:35,r:16},
    "Jäger":{x:42,y:15,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Aufpasser sichert dahinter, Flitzer R breit – Jäger zum Tor!",
    wrong:"Tipp: Flitzer R NICHT nach links kommen – er hält die Breite rechts! Aufpasser schräg hinter Flitzer L als Absicherung. Jäger Richtung Tor."
  }
},
{
  title:"Flügelspiel: Flitzer L gewinnt das 1gg1",
  desc:"Flitzer L hat seinen Gegenspieler geschlagen und hat jetzt freie Bahn Richtung Grundlinie!",
  task:"Flitzer L ist durch – wo müssen die anderen stehen für die Flanke?",
  hint:"Bei Flanke: Jäger naher Pfosten, Flitzer R ferner Pfosten, Aufpasser Strafraumkante!",
  ball:{from:{x:15,y:40},to:{x:12,y:18}},
  opps:[{x:40,y:15,label:"Gegner"},{x:60,y:15,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Flitzer L",to:{x:12,y:18}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:35,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:40,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:35,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:45,y:27,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:40,y:28,r:14},
    "Flitzer R":{x:68,y:10,r:16},
    "Jäger":{x:40,y:8,r:12}
  },
  explain:{
    correct:"⚽ Top! Jäger nah, Flitzer R fern – bereit für die Flanke!",
    wrong:"Tipp: Flankenregel: Jäger = naher Pfosten. Flitzer R = ferner Pfosten (er läuft rein!). Aufpasser = Rückraum/Strafraumkante für zweite Bälle."
  }
},
{
  title:"Flügelspiel: Flanke kommt!",
  desc:"Flitzer L flankt von der Grundlinie! Der Ball fliegt in den Strafraum!",
  task:"Die Flanke ist in der Luft! Zeige, wo sich Jäger und Flitzer R zum Ball bewegen!",
  hint:"Timing und Laufweg entscheidend. Jäger geht vor den Verteidiger, Flitzer R kommt von hinten.",
  ball:{from:{x:12,y:18},to:{x:45,y:10}},
  opps:[{x:42,y:12,label:"Gegner"},{x:55,y:12,label:"Gegner"},{x:50,y:6,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:40,y:28,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:12,y:18,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:73,y:11,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:26,y:15,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer R":{x:55,y:8,r:10},
    "Jäger":{x:42,y:7,r:10}
  },
  explain:{
    correct:"⏱️ Perfektes Timing! Jäger vor den Verteidiger, Flitzer R zum fernen Pfosten!",
    wrong:"Tipp: Jäger muss VOR seinen Gegenspieler laufen. Flitzer R startet seinen Lauf vom fernen Pfosten – er hat den Vorteil, weil er den Ball kommen sieht."
  }
},
{
  title:"Flügelspiel: Flitzer R zieht nach innen",
  desc:"Flitzer R hat den Ball rechts, aber der Weg nach außen ist zu. Er dribbelt nach innen!",
  task:"Flitzer R zieht nach innen – wie schaffen die anderen Platz?",
  hint:"Wenn einer einrückt, muss ein anderer den Raum auf der Seite besetzen!",
  ball:{from:{x:85,y:40},to:{x:60,y:35}},
  opps:[{x:55,y:30,label:"Gegner"},{x:40,y:25,label:"Gegner"}],
  anim:[{role:"Flitzer R",to:{x:60,y:35}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:66,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:16,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:85,y:40,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:59,y:29,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:65,y:52,r:14},
    "Flitzer L":{x:20,y:28,r:14},
    "Jäger":{x:45,y:12,r:14}
  },
  explain:{
    correct:"👍 Gut! Flitzer L hält die Breite, Jäger zum Tor – Aufpasser sichert!",
    wrong:"Tipp: Wenn Flitzer R nach innen dribbelt: Flitzer L bleibt breit! Jäger macht Platz Richtung Tor. Aufpasser sichert die verlassene rechte Seite."
  }
},
{
  title:"Flügelspiel: Seitenüberladung",
  desc:"Euer Plan: Alle auf eine Seite! Flitzer L, Aufpasser und Jäger attackieren links!",
  task:"Schaffe eine Überzahl auf der linken Seite!",
  hint:"Aufpasser rückt zur Seite mit, Jäger kommt kurz. Flitzer R hält die Restbreite!",
  ball:{from:{x:15,y:40},to:{x:15,y:40}},
  opps:[{x:25,y:35,label:"Gegner"},{x:55,y:30,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:15,y:40,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:91,y:50,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:20,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:28,y:50,r:14},
    "Flitzer R":{x:70,y:35,r:18},
    "Jäger":{x:30,y:22,r:14}
  },
  explain:{
    correct:"💪 Überzahl links! 3 gegen 1 – Flitzer R hält die Breite für die Verlagerung!",
    wrong:"Tipp: Aufpasser muss zur Ballseite kommen. Jäger lässt sich zur linken Seite fallen. Flitzer R bleibt rechts als Verlagerungsoption – nicht alle nach links!"
  }
},
{
  title:"Konter: Schneller Gegenstoß!",
  desc:"Ballgewinn! Der Gegner steht hoch – viel Platz zum Kontern! 4 gegen 3!",
  task:"Konter einleiten! Aufpasser hat den Ball – wohin laufen die anderen?",
  hint:"Konter = Tempo! Gerade Linie zum Tor. Flitzer sprinten in den Raum hinter der Abwehr!",
  ball:{from:{x:50,y:60},to:{x:50,y:60}},
  opps:[{x:35,y:25,label:"Gegner"},{x:55,y:22,label:"Gegner"},{x:70,y:28,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:52,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:65,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:15,y:22,r:16},
    "Flitzer R":{x:82,y:22,r:16},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"⚡ Traumkonter! Flitzer sprinten breit in die Tiefe – 4 gegen 3!",
    wrong:"Tipp: Bei Konter = TEMPO! Flitzer sofort breit in die Tiefe, Jäger zentral Richtung Tor. Nicht warten – der Raum ist jetzt da, gleich schließt er sich!"
  }
},
{
  title:"Konter: 2 gegen 1",
  desc:"Jäger hat den Ball und dribbelt aufs Tor! Nur noch ein Verteidiger! Flitzer R sprintet mit!",
  task:"2 gegen 1! Wo muss Flitzer R laufen, um anspielbar zu sein?",
  hint:"Beim 2gg1: Der freie Spieler läuft auf die andere Seite des Verteidigers!",
  ball:{from:{x:50,y:30},to:{x:48,y:22}},
  opps:[{x:50,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Jäger",to:{x:48,y:22}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:50,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:25,y:38,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:72,y:34,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:48,y:22,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:62,y:15,r:14}
  },
  explain:{
    correct:"👏 Perfekt! Flitzer R kreuzt – der Verteidiger muss sich entscheiden!",
    wrong:"Tipp: Beim 2gg1 NICHT hinter dem Verteidiger laufen! Flitzer R muss auf die ANDERE Seite – dann kann der Verteidiger nicht beide gleichzeitig decken."
  }
},
{
  title:"Konter: 3 gegen 2",
  desc:"Schneller Konter! Jäger, Flitzer L und Flitzer R gegen 2 Verteidiger! Aufpasser hat den Ball und spielt lang.",
  task:"Wie positionieren sich die drei Angreifer optimal gegen 2 Verteidiger?",
  hint:"Dreieck bilden! Einer zentral, zwei breit – maximale Breite macht es für 2 Verteidiger unmöglich.",
  ball:{from:{x:50,y:55},to:{x:50,y:30}},
  opps:[{x:40,y:20,label:"Gegner"},{x:60,y:20,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:55,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:42,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:34,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:18,y:18,r:16},
    "Flitzer R":{x:82,y:18,r:16},
    "Jäger":{x:50,y:14,r:12}
  },
  explain:{
    correct:"🦅 Überragend! Dreieck nach vorne – 3 Angreifer mit Breite gegen 2!",
    wrong:"Tipp: Breite ist der Schlüssel! Die 2 Verteidiger stehen zentral – also Flitzer GANZ BREIT raus. Jäger zentral dazwischen. So entsteht immer Überzahl."
  }
},
{
  title:"Konter: Konter absichern",
  desc:"Euer Konter läuft! Jäger und Flitzer sind vorne. Aber was macht der Aufpasser?",
  task:"Die drei Angreifer sind vorne. Wo muss der Aufpasser stehen?",
  hint:"Nie alle nach vorne! Aufpasser sichert ab – falls der Konter scheitert.",
  ball:{from:{x:50,y:55},to:{x:50,y:18}},
  opps:[{x:40,y:15,label:"Gegner"},{x:60,y:15,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:64,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:18,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:82,y:18,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:14,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:42,r:14}
  },
  explain:{
    correct:"🛡️ Genau! Aufpasser rückt nach, bleibt aber HINTER dem Ball – Absicherung!",
    wrong:"Tipp: Aufpasser rückt nach bis circa Mittellinie, aber nie bis in den Angriff! Er ist die VERSICHERUNG gegen den Gegenkonter."
  }
},
{
  title:"Konter: Konter gescheitert – zurück!",
  desc:"Der Konter ist gescheitert! Der Gegner hat den Ball erobert und kontert selbst!",
  task:"Zurück! Baut sofort den IGEL auf!",
  hint:"Sofort kompakt werden. Jäger = erster Verteidiger. Flitzer sprinten zurück zur Mitte!",
  ball:{from:{x:50,y:14},to:{x:50,y:35}},
  opps:[{x:45,y:18,label:"Gegner",to:{x:50,y:35}},{x:30,y:30,label:"Gegner"},{x:70,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:42,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:18,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:82,y:18,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:14,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:65,r:14},
    "Flitzer L":{x:35,y:52,r:16},
    "Flitzer R":{x:65,y:52,r:16},
    "Jäger":{x:50,y:40,r:14}
  },
  explain:{
    correct:"🦔 Schnell reagiert! Jäger verzögert, Flitzer zurück – IGEL!",
    wrong:"Tipp: Nicht vorne stehen bleiben! Jäger verzögert, alle anderen SPRINTEN zurück. IGEL formieren – das ist jetzt wichtiger als Angriff!"
  }
},
// ══════ Block 6: Standards & Spielsituationen (Szenarien 51–60) ══════
{
  title:"Standard: Seitenaus eigene Hälfte",
  desc:"Seitenaus für euch in der eigenen Hälfte, links. Flitzer L dribbelt ein oder passt kurz.",
  task:"Wie bieten sich die Mitspieler beim Seitenaus an?",
  hint:"Kurze und lange Option bieten! Aufpasser kurz, Jäger oder Flitzer R als lange Option.",
  ball:{from:{x:2,y:60},to:{x:2,y:60}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:2,y:60,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:84,y:51,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:55,y:33,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:22,y:62,r:14},
    "Flitzer R":{x:60,y:48,r:16},
    "Jäger":{x:35,y:42,r:14}
  },
  explain:{
    correct:"👍 Gut! Aufpasser kurz, Jäger als zweite Option – Flitzer R hält die Breite!",
    wrong:"Tipp: Aufpasser kurz zum Ball (sichere Option). Jäger als lange Option in den Raum. Flitzer R breit rechts bleiben. Nicht alle zum Ball!"
  }
},
{
  title:"Standard: Seitenaus gegnerische Hälfte",
  desc:"Seitenaus in der gegnerischen Hälfte, rechts. Flitzer R dribbelt ein oder passt kurz.",
  task:"Offensives Seitenaus! Wie positioniert sich das Team?",
  hint:"Nahe am gegnerischen Tor: Jäger zum nahen Pfosten, Flitzer L rückt ein, Aufpasser sichert!",
  ball:{from:{x:98,y:25},to:{x:98,y:25}},
  opps:[{x:40,y:15,label:"Gegner"},{x:60,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:41,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:98,y:25,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:46,y:23,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:60,y:40,r:14},
    "Flitzer L":{x:35,y:22,r:16},
    "Jäger":{x:65,y:12,r:14}
  },
  explain:{
    correct:"⚽ Offensiv! Jäger zum nahen Pfosten, Flitzer L rückt ein – Aufpasser sichert!",
    wrong:"Tipp: Offensives Seitenaus = wie eine Flanke! Jäger geht zum Strafraum. Flitzer L rückt ein für die zweite Welle. Aufpasser sichert ab."
  }
},
{
  title:"Standard: Freistoß Mittelfeld",
  desc:"Freistoß für euch im Mittelfeld! Aufpasser führt aus.",
  task:"Freistoß aus dem Mittelfeld – wie positioniert sich das Team?",
  hint:"Wie ein normaler Angriff – ADLER! Flitzer breit, Jäger macht Tiefe.",
  ball:{from:{x:50,y:50},to:{x:50,y:50}},
  opps:[{x:50,y:42,label:"Gegner"},{x:35,y:20,label:"Gegner"},{x:65,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:50,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:45,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:12,y:30,r:16},
    "Flitzer R":{x:88,y:30,r:16},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"🦅 Genau! ADLER-Positionen – Flitzer breit, Jäger tief!",
    wrong:"Tipp: Bei Freistoß = ADLER aufbauen! Flitzer breit raus, Jäger tief. Nutzt die Pause um euch optimal zu positionieren."
  }
},
{
  title:"Standard: Ecke für uns",
  desc:"Ecke für euch! Flitzer L dribbelt von links ein oder passt kurz.",
  task:"Wie positioniert sich das Team im Strafraum?",
  hint:"Jäger und Flitzer R in den Strafraum! Aufpasser an der Strafraumkante für Abpraller.",
  ball:{from:{x:5,y:5},to:{x:45,y:12}},
  opps:[{x:46,y:17,label:"Gegner"},{x:56,y:17,label:"Gegner"},{x:50,y:5,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:40,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:5,y:5,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:70,y:25,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:54,y:24,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:22,r:10},
    "Flitzer R":{x:62,y:10,r:10},
    "Jäger":{x:40,y:9,r:10}
  },
  explain:{
    correct:"⚽ Super aufgestellt! Drei Ziele für den Pass – nah, fern, Rückraum!",
    wrong:"Tipp: Jäger = naher Pfosten. Flitzer R = ferner Pfosten. Aufpasser = Rückraum/Strafraumkante. So habt ihr drei Optionen für die Ecke – und wer eindribbelt, darf auch selbst aufs Tor schießen!"
  }
},
{
  title:"Standard: Toraus gegen uns",
  desc:"Toraus beim Gegner! Sein Torwart eröffnet flach – ein Abschlag ist nicht erlaubt. Ihr geht hinter die Mittellinie.",
  task:"Wie stellt sich die Raute auf die Eröffnung des Gegners ein?",
  hint:"Alle in der eigenen Hälfte – so ist es bei uns beim Toraus. Jäger und Flitzer an der Mittellinie, um den Pass abzufangen, Aufpasser sichert dahinter.",
  ball:{from:{x:50,y:8},to:{x:46,y:50}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:44,y:36,label:"Gegner",to:{x:46,y:50}},{x:58,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:86,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:12,y:62,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:88,y:62,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:53,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:72,r:12},
    "Flitzer L":{x:34,y:58,r:12},
    "Flitzer R":{x:66,y:58,r:12},
    "Jäger":{x:50,y:54,r:9}
  },
  explain:{
    correct:"Gut! Alle in der eigenen Hälfte, die Raute steht kompakt an der Mittellinie – bereit, den Pass abzufangen!",
    wrong:"Tipp: Beim Toraus des Gegners steht keiner in seiner Hälfte! Jäger und Flitzer an die Mittellinie, Aufpasser dahinter – kompakt, um den Pass abzufangen."
  }
},
{
  title:"Spiel: Rückstand – offensiver werden!",
  desc:"Ihr liegt 0:1 zurück! Noch 5 Minuten. Der Trainer ruft: „Alles nach vorne!“",
  task:"Maximaler Angriff! Wie stellt sich die Raute offensiv auf?",
  hint:"Auch der Aufpasser rückt weit auf. Risiko eingehen! TW steht höher.",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:40,y:20,label:"Gegner"},{x:60,y:20,label:"Gegner"},{x:50,y:35,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:34,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:42,r:14},
    "Flitzer L":{x:12,y:25,r:16},
    "Flitzer R":{x:88,y:25,r:16},
    "Jäger":{x:50,y:12,r:14}
  },
  explain:{
    correct:"Voller Angriff! Aufpasser rückt bis Mittellinie auf. Flitzer ganz tief und breit. Jäger nah am Tor. Riskant – aber bei Rückstand nötig!",
    wrong:"Tipp: Bei Rückstand: Aufpasser muss HOCH stehen (Mittellinie). Flitzer extrem breit UND tief. Jäger fast auf Höhe des TW. Maximum Druck!"
  }
},
{
  title:"Spiel: Führung verteidigen",
  desc:"Ihr führt 2:1! Noch 3 Minuten. Der Trainer sagt: „Sicher spielen!“",
  task:"Sichert die Führung! Kompakt und tief stehen!",
  hint:"IGEL-Modus! Tief stehen, Räume eng machen, nichts riskieren.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:30,y:25,label:"Gegner"},{x:70,y:25,label:"Gegner"},{x:50,y:15,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:45,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:78,r:12},
    "Flitzer L":{x:32,y:65,r:14},
    "Flitzer R":{x:68,y:65,r:14},
    "Jäger":{x:50,y:52,r:14}
  },
  explain:{
    correct:"Sicher! Tief und kompakt. Die Raute steht in der eigenen Hälfte. Jäger fällt bis Mittellinie zurück. Kein Risiko – sicher ins Ziel!",
    wrong:"Tipp: Führung verteidigen = TIEF stehen! Jäger auf Mittellinie, Flitzer in eigener Hälfte, Aufpasser nah am Strafraum. Kompakt und geduldig!"
  }
},
{
  title:"Spiel: Gegner mit schnellem Stürmer",
  desc:"Der Gegner hat einen superschnellen Stürmer! Er steht links und wartet auf lange Bälle.",
  task:"Wie stellt sich die Raute auf diesen schnellen Gegner ein?",
  hint:"Nicht zu hoch stehen! Aufpasser muss auf der Seite des schnellen Stürmers absichern.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:20,y:25,label:"Gegner"},{x:50,y:35,label:"Gegner"},{x:65,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:59,y:63,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:28,y:59,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:87,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:61,y:23,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:38,y:68,r:14},
    "Flitzer L":{x:22,y:38,r:14},
    "Flitzer R":{x:65,y:50,r:14},
    "Jäger":{x:42,y:35,r:14}
  },
  explain:{
    correct:"Clever! Aufpasser steht etwas links versetzt, um den schnellen Stürmer abzusichern. Flitzer L steht tiefer und enger. Die Raute ist auf den Schnellen ausgerichtet.",
    wrong:"Tipp: Gegen einen schnellen Stürmer: Aufpasser zur Seite des Schnellen! Flitzer L tiefer als normal. Nie dem Schnellen zu viel Raum hinter euch geben!"
  }
},
{
  title:"Spiel: Überzahl nutzen – 5 gegen 4",
  desc:"Beim Gegner ist einer verletzt raus und der Wechsel dauert! Kurz spielt ihr 5 gegen 4 – nutzt die Überzahl!",
  task:"Wie nutzt ihr den Vorteil? Positioniert euch!",
  hint:"Überzahl = immer einen mehr! Spielt über die breite Seite, wo der Gegner fehlt.",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:35,y:25,label:"Gegner"},{x:65,y:25,label:"Gegner"},{x:50,y:15,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:37,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:10,y:30,r:16},
    "Flitzer R":{x:90,y:30,r:16},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"Perfekt! Maximal breit spielen! Der Gegner hat einen weniger und kann die Breite nicht abdecken. Flitzer ganz raus, Jäger tief – irgendwo ist immer einer frei!",
    wrong:"Tipp: Bei Überzahl = BREITE! Flitzer ganz an die Seitenlinien. Der Gegner kann mit 4 Spielern nicht die ganze Breite verteidigen. Nutzt den Raum!"
  }
},
{
  title:"Spiel: Unterzahl – 4 gegen 5",
  desc:"Euer Jäger ist verletzt raus und der Wechsel dauert! Kurz spielt ihr 4 gegen 5 – drei Feldspieler und TW.",
  task:"Wie verteidigt ihr mit einem Spieler weniger? Wer fehlt am wenigsten?",
  hint:"In Unterzahl: Igel noch enger! Mitte schließen, Seiten aufgeben wenn nötig.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:22,y:28,label:"Gegner"},{x:78,y:28,label:"Gegner"},{x:50,y:22,label:"Gegner"},{x:50,y:36,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:26,y:46,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:74,y:46,cls:"tb-fl",role:"Flitzer R",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:75,r:12},
    "Flitzer L":{x:38,y:62,r:12},
    "Flitzer R":{x:62,y:62,r:12}
  },
  explain:{
    correct:"Clever! In Unterzahl super eng stehen. Die Mitte zuziehen – das ist der gefährlichste Bereich. Lieber die Seiten frei lassen als die Mitte öffnen.",
    wrong:"Tipp: Unterzahl = MITTE SCHLIESSEN! Alle eng zusammen. Der Gegner soll über außen spielen müssen – da sind die Winkel schlechter."
  }
},
// ══════ Block 7: Torwartspiel (Szenarien 61–70) ══════
{
  title:"TW kurz anbieten",
  desc:"Dein Torwart hat den Ball! Der Aufpasser bietet sich kurz an.",
  task:"Schiebe den Aufpasser in die richtige Position für den kurzen Pass!",
  hint:"Der Aufpasser muss sich seitlich herausbewegen – nicht direkt vor dem TW stehen!",
  ball:{from:{x:50,y:92},to:{x:50,y:92}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:73,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:75,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:80,r:14}
  },
  explain:{
    correct:"Super! Der Aufpasser bietet sich seitlich an – so hat der TW eine klare Passlinie!",
    wrong:"Tipp: Der Aufpasser darf nicht direkt vor dem TW stehen. Seitlich anbieten!"
  }
},
{
  title:"TW – Ball flach rausspielen",
  desc:"Euer TW hat den Ball und will flach zum Aufpasser spielen. Kein weiter Schlag!",
  task:"Wo muss der Aufpasser stehen, damit der TW sicher anspielt?",
  hint:"Nicht zu weit weg! Keine Gegner dazwischen.",
  ball:{from:{x:50,y:92},to:{x:38,y:80}},
  opps:[{x:42,y:78,label:"Gegner"},{x:58,y:75,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:65,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:52,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:38,y:80,r:13}
  },
  explain:{
    correct:"Genau! Nah und seitlich, keine Gegner in der Passlinie. So kann der TW sicher rausspielen!",
    wrong:"Tipp: Aufpasser muss sich in die freie Seite bewegen, wo kein Gegner den Pass abfangen kann."
  }
},
{
  title:"TW kommt heraus!",
  desc:"Ein hoher Ball fliegt in den Strafraum! Darf dein TW herauskommen?",
  task:"Schiebe den TW dahin, wo er den Ball sicher fangen kann!",
  hint:"Mutig rauslaufen – aber nicht zu weit raus!",
  ball:{from:{x:30,y:40},to:{x:40,y:75}},
  opps:[{x:35,y:72,label:"Gegner"},{x:55,y:70,label:"Gegner"}],
  start:[
    {name:"TW",x:53,y:92,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:48,y:78,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:58,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:58,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:40,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:42,y:80,r:12}
  },
  explain:{
    correct:"Mutig und richtig! Der TW läuft den Ball an und fängt ihn – bevor der Gegner rankommt!",
    wrong:"Tipp: Der TW soll mutig rauslaufen, aber nur bis dorthin, wo er den Ball sicher nehmen kann."
  }
},
{
  title:"TW bleibt in der Mitte",
  desc:"Euer TW steht zu weit rechts. Wo gehört er hin?",
  task:"Stelle den TW in die beste Position im Tor!",
  hint:"Der TW steht immer in der Mitte des Tores!",
  ball:{from:{x:50,y:92},to:{x:50,y:92}},
  opps:[{x:40,y:30,label:"Gegner"},{x:65,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:68,y:92,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:50,y:75,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:50,y:92,r:10}
  },
  explain:{
    correct:"Perfekt! In der Tormitte kann der TW nach beiden Seiten gleich gut reagieren!",
    wrong:"Tipp: Immer in die Tormitte! Sonst kann der Gegner leicht in die freie Ecke schießen."
  }
},
{
  title:"TW – Anweisungen geben",
  desc:"Der Gegner greift an! Dein TW sieht alles und muss den Aufpasser dirigieren!",
  task:"Schiebe Aufpasser in die beste Absicherungsposition!",
  hint:"Der TW sieht alles – er ruft dem Aufpasser wo er hinlaufen soll!",
  ball:{from:{x:30,y:30},to:{x:30,y:30}},
  opps:[{x:28,y:28,label:"Gegner"},{x:45,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:55,y:74,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:75,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:65,r:14}
  },
  explain:{
    correct:"Toll! Der TW hat gerufen und der Aufpasser ist rechtzeitig zur Ballseite gelaufen!",
    wrong:"Tipp: Der TW ruft „Auf links!“ – Aufpasser muss schräg zur Ballseite laufen und absichern."
  }
},
{
  title:"TW – Sicheres Fangen",
  desc:"Der Gegner schießt! Dein TW muss den Ball sicher fangen.",
  task:"Schiebe den TW genau in die Schusslinie – Körper hinter den Ball!",
  hint:"Körper hinter den Ball, Hände vorne!",
  ball:{from:{x:35,y:30},to:{x:50,y:88}},
  opps:[{x:35,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:69,y:92,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:50,y:75,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:50,y:90,r:11}
  },
  explain:{
    correct:"Sehr gut! Genau in die Schusslinie gestellt – Körper hinter den Ball!",
    wrong:"Tipp: Der TW muss sich genau in die Schusslinie stellen. So fängt er den Ball sicher."
  }
},
{
  title:"TW – Abwurf zum Aufpasser",
  desc:"Dein TW hat den Ball gefangen! Jetzt schnell zum Aufpasser abwerfen.",
  task:"Wo bietet sich der Aufpasser am besten für den Abwurf an?",
  hint:"Abwurf = kurzer, sicherer Pass mit der Hand. Aufpasser soll frei und nah sein!",
  ball:{from:{x:50,y:90},to:{x:35,y:78}},
  opps:[{x:52,y:78,label:"Gegner"},{x:40,y:72,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:57,y:74,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:78,r:14}
  },
  explain:{
    correct:"Klasse! In die freie Zone angeboten – kein Gegner in der Nähe. Perfekter Abwurf!",
    wrong:"Tipp: Der Aufpasser muss weg von den Gegnern! In die freie Seite anbieten."
  }
},
{
  title:"TW – Flanke klären",
  desc:"Von links kommt eine hohe Flanke! Kommt der TW raus oder bleibt er?",
  task:"Schiebe den TW richtig – raus zur Flanke!",
  hint:"Wenn kein Gegner direkt am Ball ist, kommt der TW mutig raus!",
  ball:{from:{x:10,y:45},to:{x:35,y:78}},
  opps:[{x:55,y:75,label:"Gegner"},{x:45,y:80,label:"Gegner"}],
  start:[
    {name:"TW",x:54,y:92,cls:"tb-tw",role:"TW",locked:false},
    {name:"Aufpasser",x:50,y:78,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "TW":{x:38,y:82,r:13}
  },
  explain:{
    correct:"Mutig! Raus zur Flanke und den Ball fangen, bevor der Gegner köpfen kann!",
    wrong:"Tipp: Bei hohen Flanken mutig rauslaufen! Nicht auf der Linie warten."
  }
},
{
  title:"TW – Nach Parade aufbauen",
  desc:"Super Parade! Jetzt schnell und klug aufbauen.",
  task:"Schiebe Aufpasser und Flitzer R frei – der TW braucht Optionen!",
  hint:"Nach einer Parade: tief Luft holen, besten Mitspieler anlaufen, kurz anbieten!",
  ball:{from:{x:50,y:92},to:{x:50,y:92}},
  opps:[{x:55,y:78,label:"Gegner"},{x:50,y:72,label:"Gegner"},{x:60,y:65,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:56,y:73,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:77,y:45,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:35,y:80,r:14},
    "Flitzer R":{x:80,y:68,r:15}
  },
  explain:{
    correct:"Toll! Aufpasser links frei, Flitzer R rechts außen – zwei gute Optionen weg von den Gegnern!",
    wrong:"Tipp: Aufpasser und Flitzer R weg von den Gegnern anbieten! Links und rechts in die freien Räume."
  }
},
{
  title:"TW – Kurz oder weit spielen?",
  desc:"Dein TW hat den Ball. Vorne steht der Jäger frei – aber es ist weit!",
  task:"Biete Aufpasser kurz an – kurz und sicher ist fast immer besser!",
  hint:"Kurz und sicher schlägt weit und unsicher!",
  ball:{from:{x:50,y:92},to:{x:50,y:78}},
  opps:[{x:50,y:45,label:"Gegner"},{x:40,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:58,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:78,r:12}
  },
  explain:{
    correct:"Richtig! Kurzes Aufbauspiel ist sicherer – der Ball bleibt im Team!",
    wrong:"Tipp: Der weite Ball ist riskant. Aufpasser kurz anbieten und ruhig aufbauen!"
  }
},
// ══════ Block 8: Ballbesitz & Geduld (Szenarien 71–80) ══════
{
  title:"Geduld – nicht hetzen!",
  desc:"Drei Gegner sind in der Nähe. Trotzdem: kein Stress, geduldig bleiben!",
  task:"Schiebe alle Mitspieler in freie Räume – dann findet ihr die Lücke!",
  hint:"Erst schauen, dann spielen. Nicht einfach weghauen!",
  ball:{from:{x:50,y:68},to:{x:50,y:68}},
  opps:[{x:48,y:60,label:"Gegner"},{x:60,y:58,label:"Gegner"},{x:38,y:55,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:38,y:58,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:62,y:57,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:51,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:15,y:50,r:16},
    "Flitzer R":{x:85,y:50,r:16},
    "Jäger":{x:50,y:28,r:15}
  },
  explain:{
    correct:"Alle in freie Räume – der Aufpasser hat drei gute Optionen. Kein Stress!",
    wrong:"Tipp: Flitzer maximal breit, Jäger in die Tiefe. Dann hat der Aufpasser Optionen."
  }
},
{
  title:"Tempo rausnehmen",
  desc:"Ihr führt 2:0 und habt noch 5 Minuten! Jetzt Ball halten!",
  task:"Schiebe alle in sichere, tiefe Positionen!",
  hint:"Führung halten = Ball behalten. Tief stehen, kurze Pässe!",
  ball:{from:{x:50,y:72},to:{x:50,y:72}},
  opps:[{x:50,y:45,label:"Gegner"},{x:35,y:55,label:"Gegner"},{x:65,y:55,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:52,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:40,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:80,y:40,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:72,r:12},
    "Flitzer L":{x:25,y:62,r:14},
    "Flitzer R":{x:75,y:62,r:14},
    "Jäger":{x:50,y:52,r:14}
  },
  explain:{
    correct:"Kluge Entscheidung! Alle tief, enge Abstände, kurze Pässe – die Führung wird gehalten!",
    wrong:"Tipp: Bei Führung tief stehen! Alle zurückkommen, kurze sichere Pässe."
  }
},
{
  title:"Tempo des Spiels lesen",
  desc:"Alle sind müde. Was ist jetzt klug?",
  task:"Schiebe alle in eine ruhige, kompakte Ballhalte-Formation!",
  hint:"Müde = Tempo rausnehmen, Ball halten, Kräfte sparen!",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:48,y:45,label:"Gegner"},{x:35,y:52,label:"Gegner"},{x:62,y:50,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:10,y:42,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:90,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:22,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Flitzer L":{x:28,y:55,r:15},
    "Flitzer R":{x:72,y:55,r:15},
    "Jäger":{x:50,y:48,r:14}
  },
  explain:{
    correct:"Gut gedacht! Enger zusammen, kurze Pässe – Spielintelligenz!",
    wrong:"Tipp: Nicht sprinten! Alle näherkommen, Feld kleiner, Ball zirkulieren."
  }
},
{
  title:"Überzahl schaffen",
  desc:"Rechts stehen Flitzer R und ein Gegner. Bring den Jäger dazu – 2 gegen 1!",
  task:"Schiebe Jäger auf rechts für die Überzahl!",
  hint:"Überzahl = mehr Spieler als Gegner auf einer Seite!",
  ball:{from:{x:78,y:48},to:{x:78,y:48}},
  opps:[{x:72,y:42,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:48,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:46,y:29,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:68,y:35,r:15}
  },
  explain:{
    correct:"Überzahl! 2 gegen 1 – einer kommt immer durch!",
    wrong:"Tipp: Jäger muss auf die Ballseite kommen. 2 gegen 1 = Überlegenheit!"
  }
},
{
  title:"Spiel verlagern",
  desc:"Links ist alles eng! Die rechte Seite ist frei.",
  task:"Verlagere das Spiel – schiebe Flitzer R maximal breit auf rechts!",
  hint:"Wenn links eng ist, spiele nach rechts! Verlagerung bringt Raum!",
  ball:{from:{x:22,y:45},to:{x:80,y:45}},
  opps:[{x:18,y:40,label:"Gegner"},{x:30,y:48,label:"Gegner"},{x:25,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:40,y:62,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:45,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:60,y:49,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:82,y:45,r:14}
  },
  explain:{
    correct:"Klasse Verlagerung! Flitzer R breit rechts, viel Platz!",
    wrong:"Tipp: Flitzer R muss so weit rechts wie möglich – maximal breit, weg von den Gegnern."
  }
},
{
  title:"Ball in die Tiefe",
  desc:"Der Gegner steht hoch – dahinter ist viel Platz!",
  task:"Schiebe Jäger in den freien Raum hinter die Gegner!",
  hint:"Jäger läuft in die Tiefe – der Pass kommt in den Raum vor ihm!",
  ball:{from:{x:45,y:65},to:{x:52,y:25}},
  opps:[{x:40,y:35,label:"Gegner"},{x:55,y:38,label:"Gegner"},{x:30,y:40,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:44,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:52,y:22,r:14}
  },
  explain:{
    correct:"Super Tiefenläufer! Jäger sprintet hinter die Gegner-Abwehr!",
    wrong:"Tipp: Jäger muss tief laufen – hinter alle Gegner in den freien Raum!"
  }
},
{
  title:"Ballbesitz nach Seitenaus",
  desc:"Seitenaus für euch – der Aufpasser passt von der Linie ein. Wie behaltet ihr den Ball direkt danach?",
  task:"Schiebe Flitzer L in eine gute Position zum Einpassen!",
  hint:"Mindestens zwei Anspielstationen! Einer kurz, einer weiter!",
  ball:{from:{x:3,y:45},to:{x:16,y:46}},
  opps:[{x:30,y:38,label:"Gegner"},{x:28,y:56,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:3,y:45,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:40,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:16,y:46,r:12}
  },
  explain:{
    correct:"Gut angeboten! Nah genug zum Einpassen, mit Platz dahinter. Annehmen, drehen, weiterverbinden!",
    wrong:"Tipp: Flitzer L nah genug anbieten, aber nicht direkt beim Gegner."
  }
},
{
  title:"Wann dribbeln, wann passen?",
  desc:"Zwei Gegner kommen auf dich zu. Flitzer R steht frei!",
  task:"Schiebe Jäger ins Dreieck – Passen ist hier besser als Dribbeln!",
  hint:"Wenn ein Mitspieler frei ist – spiele ihn an! Kein Risiko!",
  ball:{from:{x:45,y:55},to:{x:80,y:50}},
  opps:[{x:40,y:48,label:"Gegner"},{x:52,y:50,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:55,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:20,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:42,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:62,y:38,r:14}
  },
  explain:{
    correct:"Klug! Flitzer R ist frei – der Pass ist sicherer als Dribbeln gegen zwei!",
    wrong:"Tipp: Gegen zwei Gegner zu dribbeln ist zu riskant. Passen und Jäger ins Dreieck!"
  }
},
{
  title:"Ball sichern – Körper einsetzen",
  desc:"Der Pass kommt! Wie nimmst du ihn an, damit der Gegner nicht klaut?",
  task:"Schiebe Flitzer L in die beste Annahme-Position – Körper zwischen Ball und Gegner!",
  hint:"Erster Kontakt: Ball zum sicheren Fuß, Körper abschirmen!",
  ball:{from:{x:50,y:72},to:{x:22,y:50}},
  opps:[{x:25,y:48,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:72,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:70,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:22,y:50,r:12}
  },
  explain:{
    correct:"Super! Körper zwischen Ball und Gegner – so kann keiner klauen!",
    wrong:"Tipp: So drehen, dass der Körper den Gegner abschirmt. Ball nach innen annehmen."
  }
},
{
  title:"Vorausdenken – nach dem Pass",
  desc:"Aufpasser spielt zu Flitzer R. Aber wo läuft er danach hin?",
  task:"Schiebe Aufpasser nach dem Pass in eine neue Position – nie stehen bleiben!",
  hint:"Nach dem Pass immer weiterlaufen – in den freien Raum!",
  ball:{from:{x:50,y:68},to:{x:80,y:50}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:47,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:65,y:58,r:14}
  },
  explain:{
    correct:"Super! Nach dem Pass in den freien Raum für den Rückpass!",
    wrong:"Tipp: Nach dem Pass immer in den freien Raum laufen und sich wieder anbieten!"
  }
},
// ══════ Block 9: Verteidigen als Team (Szenarien 81–90) ══════
{
  title:"Helfen im Zweikampf",
  desc:"Der Gegner hat den Ball am Rand! Flitzer L ist alleine – hilf ihm!",
  task:"Schiebe Jäger dazu – zusammen seid ihr stärker! 💪",
  hint:"Wenn ein Mitspieler alleine gegen den Gegner kämpft, lauf hin und hilf!",
  ball:{from:{x:15,y:38},to:{x:15,y:38}},
  opps:[{x:15,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:48,y:70,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:15,y:42,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:48,y:28,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:22,y:32,r:14}
  },
  explain:{
    correct:"💪 Stark! Zu zweit den Ball erobern – echtes Teamwork!",
    wrong:"💡 Lauf zum Mitspieler und hilf ihm – zusammen seid ihr stärker!"
  }
},
{
  title:"1gg1 auf links",
  desc:"Der Gegner dribbelt auf eurer linken Seite! Flitzer L ist im 1gg1.",
  task:"Wie sichert die Raute ab? Verschiebe Aufpasser, Flitzer R und Jäger!",
  hint:"Einer presst, die anderen sichern ab. Nicht alle zum Ball laufen – einer bleibt immer dahinter!",
  ball:{from:{x:20,y:45},to:{x:20,y:45}},
  opps:[{x:18,y:41,label:"Gegner"},{x:55,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:53,y:74,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:20,y:45,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:80,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:25,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:35,y:62,r:14},
    "Flitzer R":{x:55,y:52,r:16},
    "Jäger":{x:35,y:38,r:14}
  },
  explain:{
    correct:"👏 Klasse! Aufpasser sichert dahinter, Flitzer R zur Mitte – Überzahl!",
    wrong:"💡 Aufpasser SCHRÄG DAHINTER absichern, Flitzer R zur Mitte verschieben!"
  }
},
{
  title:"Absichern hinter dem Zweikampf",
  desc:"Flitzer R kämpft! Wer sichert hinter ihm ab?",
  task:"Schiebe Aufpasser in die Absicherungs-Position!",
  hint:"Einer kämpft, einer steht dahinter bereit!",
  ball:{from:{x:78,y:42},to:{x:78,y:42}},
  opps:[{x:80,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:46,y:72,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:42,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:65,y:62,r:14}
  },
  explain:{
    correct:"Perfekte Absicherung! Schräg hinter Flitzer R – bereit bei Ballverlust!",
    wrong:"Tipp: SCHRÄG DAHINTER stehen, nicht neben Flitzer R. So kann er sofort eingreifen."
  }
},
{
  title:"Passweg zustellen",
  desc:"Der Gegner will den Ball nach links spielen. Stell dich in den Weg!",
  task:"Schiebe Flitzer L zwischen die zwei Gegner – blockiere den Pass! 🚧",
  hint:"Stell dich so hin, dass der Ball nicht zum anderen Gegner kommen kann!",
  ball:{from:{x:55,y:30},to:{x:55,y:30}},
  opps:[{x:55,y:28,label:"Gegner"},{x:22,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:20,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:72,y:38,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:35,y:32,r:14}
  },
  explain:{
    correct:"🚧 Super! Der Pass kommt nicht durch – du stehst genau richtig!",
    wrong:"💡 Stell dich zwischen die beiden Gegner, dann kann der Ball nicht durchkommen!"
  }
},
{
  title:"Flügel abschneiden",
  desc:"Der Gegner dribbelt links und will nach innen ziehen!",
  task:"Schiebe Flitzer L so, dass der Gegner nur nach außen kann!",
  hint:"Innen ist gefährlicher als außen – Weg nach innen sperren!",
  ball:{from:{x:18,y:32},to:{x:18,y:32}},
  opps:[{x:18,y:28,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:30,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:25,y:28,r:13}
  },
  explain:{
    correct:"Perfekt! Gegner kann nur nach außen – weg vom Tor!",
    wrong:"Tipp: Flitzer L muss den inneren Weg versperren! Gegner zur Linie drängen."
  }
},
{
  title:"Innenraum schützen",
  desc:"Der Gegner versucht durch die Mitte zu kommen! Mitte zumachen!",
  task:"Schiebe Aufpasser in die Mitte – den zentralen Raum versperren!",
  hint:"Die Mitte ist am gefährlichsten. Die Mitte schützen!",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:50,y:30,label:"Gegner"},{x:40,y:25,label:"Gegner"},{x:60,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:35,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:52,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:52,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:60,r:13}
  },
  explain:{
    correct:"Gut! Zentral den Weg zum Tor versperren!",
    wrong:"Tipp: Aufpasser muss in die Mitte und den direkten Weg zum Tor versperren."
  }
},
{
  title:"Kompakt verteidigen",
  desc:"Drei Gegner greifen an! Bleibt kompakt – keine Lücken!",
  task:"Schiebe alle eng zusammen!",
  hint:"Kompakt = enge Abstände, keine großen Lücken!",
  ball:{from:{x:50,y:28},to:{x:50,y:28}},
  opps:[{x:30,y:25,label:"Gegner"},{x:50,y:22,label:"Gegner"},{x:70,y:25,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:85,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:10,y:50,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:92,y:50,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:21,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:65,r:12},
    "Flitzer L":{x:30,y:52,r:14},
    "Flitzer R":{x:70,y:52,r:14},
    "Jäger":{x:50,y:42,r:13}
  },
  explain:{
    correct:"Kompakte Abwehr! Keine Lücken – der Gegner muss durch eine Wand!",
    wrong:"Tipp: Alle einrücken, eng beieinander – kompakt!"
  }
},
{
  title:"Rückzugslauf",
  desc:"Ball verloren! Schnell zurücklaufen und die Formation herstellen!",
  task:"Schalte um auf IGEL – alle Feldspieler zurück!",
  hint:"Nach Ballverlust sofort zurück! Nie vorne stehen bleiben!",
  ball:{from:{x:50,y:60},to:{x:50,y:40}},
  opps:[{x:50,y:38,label:"Gegner"},{x:35,y:45,label:"Gegner"},{x:65,y:45,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:51,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:16,y:34,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:84,y:34,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:17,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:72,r:13},
    "Flitzer L":{x:25,y:55,r:15},
    "Flitzer R":{x:75,y:55,r:15},
    "Jäger":{x:50,y:40,r:15}
  },
  explain:{
    correct:"Blitzschnell zurück! Die Raute steht zwischen Ball und Tor!",
    wrong:"Tipp: Nach Ballverlust sofort alle zurück – die Raute muss hinter den Ball kommen."
  }
},
{
  title:"Herausschieben aus der Defensive",
  desc:"Der Gegner steht in eurem Strafraum! Aktiv herausschieben!",
  task:"Schiebe Aufpasser mutig auf den Gegner zu – Raum zumachen!",
  hint:"Nicht ängstlich warten – aktiv zum Gegner gehen!",
  ball:{from:{x:50,y:72},to:{x:50,y:72}},
  opps:[{x:50,y:70,label:"Gegner"},{x:38,y:65,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:86,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:62,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:62,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:52,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:66,r:12}
  },
  explain:{
    correct:"Mutig! Kein Raum mehr für den Schuss – aktives Verteidigen!",
    wrong:"Tipp: Nicht stehenbleiben – aktiv auf den Gegner zugehen, Raum zumachen!"
  }
},
{
  title:"Konter verhindern",
  desc:"Ihr habt den Ball – aber passt auf bei Ballverlust! Wer sichert ab?",
  task:"Schiebe Aufpasser zurück zum Absichern!",
  hint:"Einer muss immer absichern wenn andere vorne sind!",
  ball:{from:{x:50,y:42},to:{x:50,y:42}},
  opps:[{x:45,y:38,label:"Gegner"},{x:60,y:30,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:34,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:32,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:82,y:32,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:18,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:55,r:13}
  },
  explain:{
    correct:"Gut gedacht! Aufpasser bleibt zurück – bei Ballverlust ist er da!",
    wrong:"Tipp: Aufpasser darf nicht mit nach vorne stürmen! Absichern ist seine Hauptaufgabe."
  }
},
// ══════ Block 10: Spielverständnis (Szenarien 91–100) ══════
{
  title:"Kommunizieren – laut rufen!",
  desc:"Flitzer R und Jäger wollen beide den Ball! Wer bekommt ihn?",
  task:"Schiebe Jäger weg – Flitzer R ruft „Mein Ball!“, Jäger weicht aus!",
  hint:"Wer ruft hat Vorrang. Der andere bietet sich woanders an!",
  ball:{from:{x:70,y:40},to:{x:70,y:40}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:68,y:42,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:78,y:44,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:62,y:28,r:15}
  },
  explain:{
    correct:"Kein Durcheinander! Flitzer R nimmt den Ball, Jäger bietet sich im freien Raum an!",
    wrong:"Tipp: Einer muss ausweichen! Jäger bewegt sich weg in den freien Raum."
  }
},
{
  title:"Freien Mitspieler sehen",
  desc:"Um dich stehen Gegner – aber jemand steht FREI!",
  task:"Schiebe Jäger dahin, wo er frei und anspielbar ist!",
  hint:"Immer umschauen – wo ist der Freie?",
  ball:{from:{x:50,y:65},to:{x:50,y:65}},
  opps:[{x:48,y:58,label:"Gegner"},{x:60,y:60,label:"Gegner"},{x:38,y:60,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:41,y:47,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:62,y:38,r:15}
  },
  explain:{
    correct:"Genau! Jäger im freien Raum – jetzt einfach anspielen!",
    wrong:"Tipp: In den Raum laufen wo KEINE Gegner sind – das ist die Lücke!"
  }
},
{
  title:"Räume erkennen",
  desc:"Wo haben die Gegner eine Lücke gelassen?",
  task:"Erkenne den freien Raum und schiebe Flitzer R dorthin!",
  hint:"Freier Raum ist Gold wert! Wo keine Gegner sind, hast du Platz!",
  ball:{from:{x:50,y:60},to:{x:50,y:60}},
  opps:[{x:20,y:35,label:"Gegner"},{x:35,y:30,label:"Gegner"},{x:40,y:45,label:"Gegner"},{x:25,y:50,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:48,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:60,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:35,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:82,y:38,r:16}
  },
  explain:{
    correct:"Gut erkannt! Rechts ist alles frei – Flitzer R hat viel Platz!",
    wrong:"Tipp: Schau wo KEINE Gegner sind – rechts ist viel Raum!"
  }
},
{
  title:"Gegner-Wechsel lesen",
  desc:"Der Ball wechselt plötzlich von links nach rechts!",
  task:"Reagiere schnell – verschiebe die ganze Raute nach rechts!",
  hint:"Ballbewegung beobachten und die Raute sofort mitnehmen!",
  ball:{from:{x:22,y:35},to:{x:78,y:35}},
  opps:[{x:80,y:30,label:"Gegner"},{x:70,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:38,y:68,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:18,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:32,y:32,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:62,y:68,r:14},
    "Flitzer L":{x:45,y:50,r:16},
    "Flitzer R":{x:82,y:45,r:14},
    "Jäger":{x:68,y:32,r:14}
  },
  explain:{
    correct:"Blitzschnelle Reaktion! Raute sofort nach rechts verschoben!",
    wrong:"Tipp: Wenn der Ball die Seite wechselt, muss die GANZE Raute mit!"
  }
},
{
  title:"Pressing: Pressing-Auslöser erkennen",
  desc:"Der gegnerische Verteidiger bekommt einen schlechten Pass und muss sich drehen. Jetzt pressen!",
  task:"Erkennt den Pressing-Auslöser! Attackiert den unsicheren Gegner!",
  hint:"Schlechte Ballannahme = Signal zum Pressen! Der nächste Spieler attackiert sofort.",
  ball:{from:{x:60,y:20},to:{x:62,y:22}},
  opps:[{x:62,y:22,label:"Gegner"},{x:40,y:18,label:"Gegner"},{x:50,y:8,label:"Geg. TW"}],
  anim:[{role:"Jäger",to:{x:55,y:25}}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:38,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:70,y:42,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:18,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Aufpasser":{x:50,y:38,r:14},
    "Flitzer L":{x:38,y:22,r:14},
    "Flitzer R":{x:70,y:22,r:12}
  },
  explain:{
    correct:"🔥 Super gelesen! Schlechte Annahme = sofort drauf – Balleroberung!",
    wrong:"Tipp: Bei schlechter Ballannahme SOFORT pressen! Flitzer R geht zum Ball, Flitzer L deckt den anderen Verteidiger. Aufpasser kommt hoch als Absicherung."
  }
},
{
  title:"Pressing: Seitliches Pressing",
  desc:"Der Gegner spielt den Ball an der Seitenlinie entlang. Flitzer R soll pressen!",
  task:"Flitzer R setzt Pressing an der Seitenlinie. Wie unterstützt das Team?",
  hint:"Die Seitenlinie ist der zusätzliche Verteidiger! Den Gegner dort festnageln!",
  ball:{from:{x:75,y:35},to:{x:82,y:32}},
  opps:[{x:82,y:32,label:"Gegner"},{x:70,y:20,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:46,y:69,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:68,y:49,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:47,y:33,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:60,y:55,r:12},
    "Flitzer L":{x:45,y:48,r:12},
    "Flitzer R":{x:82,y:35,r:12},
    "Jäger":{x:68,y:25,r:14}
  },
  explain:{
    correct:"👏 Klasse! Flitzer R presst an der Linie – Jäger schneidet den Pass ab!",
    wrong:"Tipp: Die Seitenlinie ist euer VERBÜNDETER! Flitzer R drückt den Gegner raus. Jäger deckt den Pass nach vorne ab. Flitzer L und Aufpasser verschieben."
  }
},
{
  title:"Zweikampf gewinnen",
  desc:"Flitzer R läuft auf den Gegner zu! Wie stellt er sich richtig hin?",
  task:"Schiebe Flitzer R halbseitig – den Gegner nach außen drängen!",
  hint:"Halbseitig stellen = leicht versetzt, nicht direkt frontal!",
  ball:{from:{x:72,y:35},to:{x:72,y:35}},
  opps:[{x:72,y:32,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:68,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:50,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:55,y:51,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer R":{x:68,y:36,r:12}
  },
  explain:{
    correct:"Klasse! Halbseitig – der Gegner muss nach außen, weg vom Tor!",
    wrong:"Tipp: Nicht frontal, sondern leicht zur Innenseite versetzt aufstellen."
  }
},
{
  title:"Tor vor Augen – Abschluss!",
  desc:"Jäger hat den Ball nahe am Tor – frei!",
  task:"Schiebe Jäger in die beste Schussposition!",
  hint:"Nah am Tor und frei – schieß! Nicht zu lange warten!",
  ball:{from:{x:52,y:25},to:{x:50,y:12}},
  opps:[{x:50,y:5,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:60,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:22,y:42,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:78,y:42,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:54,y:34,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:50,y:14,r:12}
  },
  explain:{
    correct:"Ja! Nah ran und schießen – keine Angst!",
    wrong:"Tipp: Näher ran und abschließen! Frei und nah = Torchance!"
  }
},
{
  title:"Anführer auf dem Platz",
  desc:"Flitzer L steht am falschen Platz – in der Mitte statt auf links!",
  task:"Schiebe Flitzer L auf die richtige Raute-Position!",
  hint:"Jeder hat seinen Platz in der Raute – Mitspieler auch mal hinweisen!",
  ball:{from:{x:50,y:58},to:{x:50,y:58}},
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:50,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:28,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:20,y:50,r:14}
  },
  explain:{
    correct:"Genau! Flitzer L gehört links auf die Außenbahn!",
    wrong:"Tipp: Flitzer L steht in der Mitte – das ist der falsche Platz! Ab auf die linke Seite!"
  }
},
{
  title:"Endspurt – alles geben!",
  desc:"Ihr verliert 0:1, nur noch 2 Minuten! Vollangriff!",
  task:"Alle nach vorne! Voller Angriff – auch der Aufpasser!",
  hint:"Wenn ihr unbedingt ein Tor braucht: alle nach vorne!",
  ball:{from:{x:50,y:70},to:{x:50,y:70}},
  opps:[{x:50,y:25,label:"Gegner"},{x:35,y:35,label:"Gegner"},{x:65,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:70,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:22,y:55,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:55,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:38,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:45,r:14},
    "Flitzer L":{x:20,y:30,r:15},
    "Flitzer R":{x:80,y:30,r:15},
    "Jäger":{x:50,y:15,r:14}
  },
  explain:{
    correct:"Alles nach vorne! Risiko erlaubt – wir brauchen das Tor!",
    wrong:"Tipp: Letzte Minute = alle nach vorne! Aufpasser rückt auf, Flitzer ganz hoch, Jäger vorne!"
  }
}
];

/* ═══ TRAININGSFORMEN-BIBLIOTHEK ═══ */
const TRAININGSFORMEN = [
{
  id:'tf001',kat:'raute',focus:true,
  name:'Korridor-Funino',
  kurz:'3 Längskorridore – jeder Spieler hält seinen. Tor nur wenn alle Korridore besetzt.',
  spieler:'6–10',feld:'25×20m',dauer:'10–15',
  spass:5,diff:1,
  ablauf:'Feld in 3 gleich breite Längskorridore aufteilen. Jeder Spieler bekommt EINEN Korridor. 3gg3 auf 4 Minitore. Der Korridor darf zum Zweikampf kurz verlassen werden – Tor zählt aber nur, wenn beim Abschluss alle 3 Korridore besetzt sind.\n\nKommando: "Feld groß machen!" wenn Spieler ihren Korridor verlassen.',
  varianten:'- Bonuspunkt wenn alle 3 Korridore beim Torschuss besetzt\n- Trainer ruft Farbe = welcher Korridor zuerst angespielt werden muss',
  coaching:'Schau wo dein Korridor ist!\nMach das Feld groß!\nBleib in deiner Seite – dein Mitspieler braucht den Raum!',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf002',kat:'raute',focus:true,
  name:'4+1 Lebende Raute',
  kurz:'Erste echte 4+1 Spielform. Tor zählt nur bei korrekter Rautenbesetzung.',
  spieler:'10',feld:'30×25m',dauer:'12–15',
  spass:5,diff:2,
  ablauf:'Zwei Teams à 5 (TW + 4 Feld). Jeder Feldspieler hat eine Farbe = Rautenposition (Aufpasser, Flitzer L, Flitzer R, Jäger). Gespielt wird normal. Tor zählt nur, wenn beim Abschluss alle 4 Feldspieler ihre Rautenposition besetzen (Aufpasser hinten, Flitzer außen, Jäger vorne).\n\nTrainer zählt laut "Position?" – Team antwortet "Ja!" wenn alle stehen.',
  varianten:'- Erst ohne Positionspflicht spielen – beobachten, dann Regel einführen\n- Bonuspunkt wenn Tor nach Steilpass von Aufpasser zu Jäger fällt\n- TW darf einwerfen und löst damit Angriff aus',
  coaching:'Aufpasser – bleib hinten! Jäger – geh nach vorne!\nNach Ballverlust: sofort zurück in Position!\nGemeinsam feiern wenn Raute steht und Tor fällt – Erfolgserlebnis!',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf003',kat:'raute',focus:true,
  name:'Rauten-Staffel',
  kurz:'Spieler lernen Rautenposition durch Wiederholung – Aufstellung vor jedem Spielzug.',
  spieler:'5',feld:'20×15m',dauer:'8–12',
  spass:4,diff:1,
  ablauf:'5 Spieler (TW + 4 Feld) stehen gemischt in der Feldmitte. Trainer ruft "Los!" – jeder sprintet auf seine Rauten-Position. Wer zuerst korrekt steht bekommt Punkt. Dann 2 Minuten freies Spiel mit denselben Positionen.\n\nZiel: Die 4 Rauten-Positionen durch Wiederholung im Körpergedächtnis verankern.',
  varianten:'- Trainer zeigt Farbkarte (Farbe = Position) – Spieler rennt zu seinem Korridor\n- Ohne Ball: nur Positionieren – dann Ball einwerfen\n- Mit verbundenen Augen starten – auf Zuruf positionieren',
  coaching:'Wo ist deine Position in der Raute?\nPositionsnamen konsequent nutzen: Aufpasser, Flitzer L/R, Jäger\nPositive Verstärkung wenn Spieler automatisch richtig steht',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf004',kat:'raute',focus:true,
  name:'Schattenspieler',
  kurz:'Spieler ohne Ball spiegelt Mitspieler auf maximalem Abstand. Raumgefühl durch Körper.',
  spieler:'6–8',feld:'20×20m',dauer:'8–10',
  spass:3,diff:1,
  ablauf:'Immer 2 Spieler bilden ein Paar. Einer hat Ball und dribbelt frei im Feld. Der andere (Schattenspieler) folgt ihm – aber IMMER auf der gegenüberliegenden Seite des Feldes (maximaler Abstand). Kein direkter Kontakt erlaubt.\n\nNach 2 Minuten: Rollen tauschen. Dann alle Paare gleichzeitig frei im Feld mit Schattenprinzip.',
  varianten:'- Schattenspieler muss immer hinter dem Mitspieler sein (defensives Verhalten)\n- Schattenspieler gibt Passsignal wenn er frei ist\n- 3 Spieler: einer mit Ball, zwei Schatten in verschiedenen Richtungen',
  coaching:'Kannst du deinen Mitspieler sehen UND das Tor sehen?\nMaximaler Abstand – das ist das Ziel!\nImplizit: Raumbesetzung durch Körpergefühl lernen',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf005',kat:'raute',focus:true,
  name:'TW-Einwurf-Angriff',
  kurz:'TW wirft ein – Angriff über die Raute. Spielaufbau von hinten als Prinzip etablieren.',
  spieler:'6–8 (TW + 4 Angreifer + 1–3 Verteidiger)',feld:'30×20m',dauer:'8–10',
  spass:4,diff:2,
  ablauf:'TW hat Ball und wirft kurz zum Aufpasser. Aufpasser verteilt: entweder zu Flitzer L, Flitzer R oder direkt steil zu Jäger. Ziel: Tor nach höchstens 4 Pässen. Gegner startet passiv (geht erst nach 2. Pass aktiv).\n\nJeder erfolgreiche Angriff über alle Positionen = 2 Punkte. Direktschuss = 1 Punkt.',
  varianten:'- Aufpasser muss mindestens 1 Mal angespielt werden vor Torabschluss\n- Flitzer darf nicht schießen – muss zu Jäger querpassen\n- Zeitdruck: Angriff muss in 8 Sekunden abgeschlossen sein',
  coaching:'TW: Schau wo der Aufpasser steht bevor du wirfst!\nAufpasser: Nimm den Ball und schau sofort nach vorne!\nJäger: Lauf in den freien Raum BEVOR der Ball kommt!',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf006',kat:'raute',focus:false,
  name:'Positions-Bingo',
  kurz:'Trainer ruft Position – Spieler rennt dorthin. Wer zuerst steht gewinnt Punkt.',
  spieler:'4–8',feld:'20×15m',dauer:'6–8',
  spass:5,diff:1,
  ablauf:'Trainer ruft laut eine Rauten-Position: "Aufpasser!", "Jäger!", "Flitzer Links!" oder "Flitzer Rechts!". Alle Spieler müssen sofort in diese Richtung laufen und die korrekte Position einnehmen. Wer zuerst korrekt steht und "Bereit!" ruft bekommt einen Punkt. Nach 10 Runden: wer hat die meisten Punkte?',
  varianten:'- Trainer zeigt statt zu rufen (kognitive Last durch visuelle Erkennung)\n- Zwei Positionen gleichzeitig rufen: Spieler entscheiden sich für eine\n- Blind-Bingo: Augen zu, auf Klatschen reagieren und dann zur Position',
  coaching:'Positionsnamen lernen – das ist das einzige Ziel dieser Übung\nLoben wenn Spieler ohne Zögern läuft\nNach der Übung: zeig mir wo der Jäger steht / wo der Aufpasser steht',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf007',kat:'raute',focus:true,
  name:'Breiten-Spiel 4gg0',
  kurz:'Ohne Gegner: Team übt Rautenbesetzung und Ballzirkulation ohne Druck.',
  spieler:'5',feld:'25×20m',dauer:'6–8',
  spass:3,diff:1,
  ablauf:'5 Spieler (TW + 4) spielen ohne Gegner. Aufgabe: Ball muss alle 4 Positionen mindestens 1 Mal berühren bevor Torabschluss erlaubt ist. Abschluss auf ein leeres Minitor an der gegenüberliegenden Grundlinie. Trainer zählt Pässe laut mit. Pause nach jedem Abschluss – kurze Besprechung: wer war wo?',
  varianten:'- Maximale Berührungen: 2 pro Spieler\n- Pflicht-Außenball: Ball muss mindestens 1x über Außenbahn (Flitzer) laufen\n- Zeitdruck: unter 10 Sekunden durch alle Positionen',
  coaching:'Kein Druck – das ist eine Lernform, kein Wettkampf\nBall soll zirkulieren: Aufpasser → Flitzer → Jäger\nRaum halten während des Passspiels – nicht zusammenlaufen!',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf008',kat:'raute',focus:false,
  name:'Dreiecksduell 3gg3',
  kurz:'Beide Teams in Dreiecksform (Vorstufe der Raute) – direktes Spiegelbild der Spielsysteme.',
  spieler:'6–8',feld:'25×20m',dauer:'10–12',
  spass:5,diff:2,
  ablauf:'3gg3 (ohne TW) auf 4 Minitore. Jedes Team spielt in Dreiecksform (Vorstufe der Raute): ein Aufpasser hinten, ein Spieler zentral, ein Jäger vorne. Tor zählt nur wenn das Team beim Abschluss in Dreiecksform steht – kein Klumpen!',
  varianten:'- 4gg4 mit TW und vollständiger Raute\n- Zeitbegrenzung: 5-Minuten-Spiele, dann Rollentausch\n- Bonuspunkt für Tor aus der Flitzer-Position',
  coaching:'Beide Teams sollen spiegelbildlich spielen – direkte Vergleichbarkeit\nWer hält seine Raute? Wer läuft raus?\nKurze Besprechung nach jedem Tor: was hat gut funktioniert?',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf009',kat:'raute',focus:false,
  name:'Aufpasser-Steilpass',
  kurz:'Aufpasser übt gezielten Steilpass zum Jäger – die wichtigste Verbindung der Raute.',
  spieler:'4–6',feld:'20×15m',dauer:'8–10',
  spass:4,diff:2,
  ablauf:'Aufpasser steht hinten mit Ball. Jäger läuft aus der Mittellinie in die Tiefe. Aufpasser spielt Steilpass in den Lauf. Jäger schließt ab. Flitzer L/R stehen auf den Außenbahnen als Anspielstation falls Steilpass nicht möglich.\n\nWechsel nach 5 Wiederholungen.',
  varianten:'- Defensiv-Spieler stört den Jäger (halbaktiv)\n- Aufpasser hat nur 3 Sekunden Zeit\n- Jäger darf auch schräg ablegen zu Flitzer',
  coaching:'Jäger: Freilauf BEVOR Ball beim Aufpasser ist!\nAufpasser: schau zuerst zum Jäger – dann zur Seite\nTiming: Pass wenn Jäger Fahrt aufgenommen hat',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf010',kat:'raute',focus:false,
  name:'Pressing-Raute 5gg5',
  kurz:'Raute verteidigt gemeinsam – Pressing als System, nicht als Einzelaktion.',
  spieler:'10',feld:'30×25m',dauer:'12–15',
  spass:5,diff:3,
  ablauf:'5gg5 (TW + 4) auf 2 Kleinfeldtore – oder 4gg4 ohne TW auf 4 Minitore. Team A greift an, Team B verteidigt in Rautenformation. Solange Team A den Ball hat, presst Team B gemeinsam: Jäger läuft an, Flitzer sichern die Seiten, Aufpasser sichert hinten ab.\n\nBonuspunkt für Team B: Ballgewinn und Tor innerhalb von 5 Sekunden.',
  varianten:'- Nur eine Seite pressen (Richtungs-Pressing)\n- TW koordiniert das Pressing mit Ansagen\n- Team wechselt nach jedem Ballgewinn',
  coaching:'Jäger presst ZUERST – Flitzer folgen sofort\nAufpasser: Absicherung – nicht mit nach vorne!\nPressing ist ein System, kein Einzelkampf',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf011',kat:'raute',focus:false,
  name:'Rauten-Umschalten',
  kurz:'Nach Ballgewinn sofort in Rautenformation – Umschalten als Automatismus trainieren.',
  spieler:'6–8',feld:'25×20m',dauer:'8–10',
  spass:4,diff:2,
  ablauf:'4gg4 Funino (bei nur 6 Kindern: 3gg3 mit Dreieck hinten–Mitte–vorne). Regel: Nach JEDEM Ballgewinn müssen alle Feldspieler in 3 Sekunden ihre Rautenposition einnehmen bevor der erste Pass gespielt werden darf. Trainer pfeift wenn Position nicht stimmt.\n\nZiel: Raute als Sofort-Reaktion nach Ballgewinn automatisieren.',
  varianten:'- 5 Sekunden Zeit statt 3 (einfacher für Einstieg)\n- TW gibt Signal nach Ballgewinn: "Position!" als Startsignal\n- Ohne Zeitlimit: erst wenn alle stehen wird weitergespielt',
  coaching:'Ballgewinn = sofort in Position!\nNicht auf den Ball schauen – auf deine Position!\nWer steht schnell? Wer braucht am längsten?',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf012',kat:'raute',focus:false,
  name:'Mini-Turnier Raute',
  kurz:'3 Teams rotieren – jedes Team spielt 5 Minuten. Positionen bleiben fest.',
  spieler:'9–12',feld:'25×20m',dauer:'20–25',
  spass:5,diff:2,
  ablauf:'3 Teams à 3–4 Spieler. Team A spielt gegen Team B, Team C wartet. Nach 5 Minuten: Verlierer raus, Gewinner bleibt, nächstes Team rein. Jeder Spieler hat eine feste Rautenposition die er im ganzen Turnier behält (bei 3er-Teams entfällt ein Flitzer: Aufpasser – Flitzer – Jäger).\n\nZiel: Rautenposition unter echtem Wettkampfdruck halten.',
  varianten:'- Tor nach Steilpass Aufpasser→Jäger = 2 Punkte\n- Teams geben vor dem Spiel einen "Mannschaftsruf" aus\n- Jeder Trainer beobachtet ein Team gezielt und gibt Feedback',
  coaching:'Positionstreue im Wettkampf ist schwieriger als im Training\nWer verlässt die Position wenn es eng wird?\nKurze Besprechung zwischen den Spielen',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["raute"]
},
{
  id:'tf013',kat:'passspiel',focus:true,
  name:'Pflichtpass-Funino',
  kurz:'Tor gilt nur wenn jeder Spieler des Teams mindestens 1 Pass gespielt hat.',
  spieler:'6–8',feld:'20×18m',dauer:'10–12',
  spass:5,diff:1,
  ablauf:'3gg3 auf 4 Minitore. Tor zählt NICHT wenn ein Spieler des Teams noch keinen Pass gespielt hat. Trainer zählt Pässe mit – Teams sehen wie viele noch fehlen.\n\nKlammerle-Variante: Wer noch keinen Pass hatte trägt Klammerle am Trikot. Tor nur wenn keine Klammerle mehr sichtbar.',
  varianten:'- Alle 3 Spieler müssen Ball haben UND einer muss schießen\n- Tor mit schwachem Fuß zählt doppelt\n- Jeder Pass muss angesagt werden: Spieler ruft Namen des Empfängers',
  coaching:'Zeig dich an! Dein Mitspieler kann dir nicht passen wenn er dich nicht sieht!\nRuf seinen Namen – sag wo du bist!\nKinder lösen die Aufgabe selbst durch die Spielregel',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf014',kat:'passspiel',focus:false,
  name:'Komm-Geh-Passspiel',
  kurz:'Grundprinzip des Freilaufens: Spieler täuscht Richtung an und fordert Ball in Lauf.',
  spieler:'4–8',feld:'Paare, 15m Abstand',dauer:'8–10',
  spass:3,diff:1,
  ablauf:'Spieler A und B stehen 15m gegenüber. A hat Ball. B läuft auf A zu (Komm-Phase), dreht bei 5m Abstand scharf ab (Geh-Phase) und fordert Ball mit Hand in die Tiefe. A spielt flachen Pass in den Lauf.\n\nWechsel nach 5 Wiederholungen. Dann sofort in Spielform: gleiches Prinzip in 2gg2.',
  varianten:'- Geh-Kommen: B steht still, macht Schritt nach hinten, kommt dann explosiv\n- Mit 2 Pässen: A zu B, B zur Wand C, Rückgabe, dann Tiefenball\n- Im Laufen: beide Spieler bewegen sich, Pass-Timing erspüren',
  coaching:'Erst täusche ich Richtung – dann komme ich!\nPass NACH der Drehbewegung – nicht davor!\nTiming ist alles – lieber einmal zu früh als zu spät',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf015',kat:'passspiel',focus:false,
  name:'Dreieck-Passspiel',
  kurz:'3 Spieler bilden Dreieck – immer 2 Anspielstationen vorhanden. Dreiecke sind die Basis.',
  spieler:'6–9',feld:'15×15m pro Gruppe',dauer:'8–10',
  spass:4,diff:1,
  ablauf:'3 Spieler stehen im Dreieck (ca. 8–10m Abstand). Spieler A passt zu B, A läuft sofort zur Position von B. B passt zu C, B läuft zu C-Position. Dauerhaftes Rotieren – Ball und Spieler bewegen sich gleichzeitig.\n\nNach 3 Minuten: direkt in 3gg3 Spielform mit gleichem Prinzip.',
  varianten:'- Max. 2 Berührungen pro Spieler\n- Spieler muss sich ansagen: "links!" oder "rechts!" bevor er läuft\n- 4 Spieler: Rauten-Form statt Dreieck',
  coaching:'Pass spielen UND sofort loslaufen – nicht warten!\nDreieck bedeutet: immer 2 Anspielstationen für jeden Spieler\nDas ist die Grundlage für das Zusammenspiel in der Raute',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf016',kat:'passspiel',focus:false,
  name:'4gg2 Ballbesitz',
  kurz:'Überzahl hält Ballbesitz – Dreiecke bilden, Freilaufen erzwingen.',
  spieler:'6',feld:'12×12m',dauer:'6–8',
  spass:4,diff:2,
  ablauf:'4 Außenspieler gegen 2 Innen. Außenspieler halten Ballbesitz, Innenspieler versuchen zu stehlen. Bei Ballgewinn: sofort Rollentausch. 10 Pässe ohne Verlust = 1 Punkt.\n\nMax. 2 Ballkontakte erlaubt (zwingt zu schnellerem Spiel).',
  varianten:'- Innenspieler dürfen nicht pressen – nur intercept\n- Spielfeld kleiner machen für höheren Schwierigkeitsgrad',
  coaching:'Dreieck bilden – immer 2 Anspielstationen anbieten!\nWenn einer unter Druck ist: der andere muss sofort frei sein!\nAbstand: nicht zu nah (Klumpen!) nicht zu weit (kein Pass möglich)',
  svg:'',   // v549: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf017',kat:'passspiel',focus:false,
  name:'Wandpass-Serie',
  kurz:'Spieler A passt zu B (Wand), bekommt zurück, läuft in Tiefe. Wandpass automatisieren.',
  spieler:'4–6',feld:'20×10m',dauer:'6–8',
  spass:3,diff:1,
  ablauf:'Spieler A läuft auf B zu. A spielt Pass zu B (Wand), läuft weiter in Tiefe. B gibt direkt zurück. A nimmt mit und schließt ab. Wichtig: A muss NACH dem Pass weiter laufen – nicht stehen bleiben!\n\nWechsel nach 5 Wiederholungen.',
  varianten:'- Wand spielt direkt (1 Kontakt) oder mit Mitnahme (2 Kontakte)\n- A kommt von links und rechts abwechselnd\n- Mit Gegenspieler der B unter leichten Druck setzt',
  coaching:'Pass spielen und SOFORT weiterlaufen – das ist der Wandpass!\nB: schau zuerst wo A hinläuft DANN passe zurück\nTiming: nicht zu früh, nicht zu spät',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf018',kat:'passspiel',focus:false,
  name:'Ansage-Passspiel',
  kurz:'Spieler MUSS Name des Empfängers rufen bevor er passt. Kommunikation als Pflicht.',
  spieler:'6–10',feld:'beliebig',dauer:'als Regel',
  spass:4,diff:1,
  ablauf:'Regel in jede Spielform einbaubar: Bevor ein Pass gespielt wird, MUSS der Spieler laut den Namen des Empfängers rufen. Tut er das nicht, zählt der Pass nicht und Ball geht zum Gegner.\n\nZiel: Blickkontakt und Kommunikation als automatische Gewohnheit aufbauen.',
  varianten:'- Spieler muss "Hier!" rufen wenn er sich anbietet\n- Flüstervariante: nur leise ansagen (Konzentration fördern)\n- Doppel-Ansage: auch der Empfänger bestätigt mit "Ja!"\n',
  coaching:'Erst schauen, dann rufen, dann passen – nicht gleichzeitig!\nWer ruft von selbst? Wer muss jedes Mal erinnert werden?\nKommunikation ist Teamarbeit – jeder ist verantwortlich',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf019',kat:'passspiel',focus:false,
  name:'Lobpflicht nach Tor',
  kurz:'Nach Tor: Torschütze MUSS sofort Mitspieler loben. Wertschätzung als Spielregel.',
  spieler:'beliebig',feld:'beliebig',dauer:'Regel in Spielform',
  spass:5,diff:1,
  ablauf:'Regel die in jede andere Spielform eingebaut wird. Nach jedem Tor: Torschütze hält inne und sagt laut: "[Name], super Pass!" oder "[Name], gutes Freilaufen!"\n\nTor wird erst gewertet wenn das Lob ausgesprochen wurde. Trainer kann eingreifen wenn Lob nicht kommt.',
  varianten:'- Team muss gemeinsam jubeln – alle Spieler klatschen ab\n- Wer gelobt wurde darf den nächsten Anstoß ausführen\n- "High Five Pflicht" – Torschütze klatscht zuerst den Vorlagengeber ab',
  coaching:'Fördert: Wertschätzung, Teamgeist, Wahrnehmung von Mitspielerbeiträgen\nIdeal für Spieler mit Einzelkämpfer-Tendenz\nNiemals erzwingen – spielerisch einfordern',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf020',kat:'passspiel',focus:false,
  name:'Quer vor Tor',
  kurz:'Tor gilt nur nach Querpass kurz vor dem Abschluss. Kombinationsspiel erzwingen.',
  spieler:'6–10',feld:'20×18m',dauer:'10–12',
  spass:5,diff:2,
  ablauf:'Normales 3gg3 Funino. ABER: Tor zählt nur wenn der Torschuss nach einem Querpass in der letzten Zone (5m vor Tor) gespielt wird. Kein Direktschuss von weit außen erlaubt.\n\nZiel: Spieler lernen dass ein Querpass vor dem Tor oft gefährlicher ist als direkter Schuss.',
  varianten:'- Querpass muss von Flitzer zu Jäger sein (Rautenprinzip!)\n- Querpass-Zone größer/kleiner je nach Niveau\n- Tor zählt doppelt wenn Querpass UND beide Flitzer beteiligt',
  coaching:'Warte auf den Querpass – er öffnet das Tor!\nFlitzer: laufe nicht direkt aufs Tor – bleib außen für den Querpass!\nJäger: sei bereit für die Hereingabe',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf021',kat:'passspiel',focus:false,
  name:'Ball-Staffel Paare',
  kurz:'Zwei Spieler passen sich beim Vorwärtslaufen – höchstens 5 Schritte ohne Pass.',
  spieler:'beliebig',feld:'30m Länge',dauer:'6–8',
  spass:4,diff:1,
  ablauf:'Zwei Spieler laufen nebeneinander von Linie A zu Linie B (30m). Dabei passen sie sich ständig den Ball zu – kein Spieler darf mehr als 5 Schritte ohne Pass machen. Am Ende: Torabschluss.\n\nWettbewerb: Welches Paar erreicht das Tor zuerst und trifft?',
  varianten:'- Nur schwacher Fuß für Pässe\n- Max. 3 Schritte zwischen Pässen (fordernder)\n- Mit Zeitnahme: Paare treten gegeneinander an',
  coaching:'Timing: Pass spielen wenn Mitspieler läuft – nicht wenn er steht\nBlick immer auf Mitspieler UND Tor\nPassrichtig: flach, scharf, in den Lauf',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf022',kat:'passspiel',focus:false,
  name:'Pass und Nachlaufen',
  kurz:'Nach Pass IMMER zur Position des Empfängers laufen. Rotation als Automatismus.',
  spieler:'4–8',feld:'Dreieck/Quadrat',dauer:'8–10',
  spass:3,diff:1,
  ablauf:'4 Spieler stehen an 4 Hütchen im Quadrat (10m). Spieler A passt zu B und läuft sofort zu B\'s Position. B passt zu C und läuft zu C\'s Position. Immer: Pass spielen, dann zur Position des Empfängers laufen. Bei mehr als 4 Kindern stellen sich am Start-Hütchen 2 Spieler an.\n\nKontinuierliche Bewegung – nach 3 Minuten: gleiche Übung mit Gegenspieler.',
  varianten:'- Gegen die Uhrzeiger-Richtung\n- Ball und Spieler laufen in entgegengesetzte Richtung\n- Mit Finten: vor dem Passen einmal täuschen',
  coaching:'Pass spielen = sofort loslaufen – keine Pause!\nDiese Bewegung ist die Grundlage von Passspiel in Bewegung\nBeobachte: wer läuft automatisch? Wer wartet noch?',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["passspiel"]
},
{
  id:'tf023',kat:'wahrnehmung',focus:true,
  name:'Scanning-Funino',
  kurz:'Vor JEDER Ballannahme: Spieler muss sich umschauen. Wahrnehmung Phase 1 direkt trainieren.',
  spieler:'6–8',feld:'20×18m',dauer:'10–12',
  spass:4,diff:2,
  ablauf:'Normales 3gg3 Funino. Trainer ruft laut "Schau!" bevor er Ball ins Spiel gibt oder bei jedem Einwurf. Spieler muss sich ERST umschauen, dann Ball annehmen. Tut er das nicht: Ball geht zum Gegner.\n\nNach 4–5 Einheiten: Regel ohne Ansage – Spieler soll automatisch scannen.',
  varianten:'- Trainer hält Finger hoch – Spieler muss Anzahl nennen bevor er Ball annimmt\n- Farbkarte hochhalten – Spieler ruft Farbe: zwingt zum Hochschauen\n- Geister-Scanning: Trainer steht hinter Spieler – er soll raten wo Trainer steht',
  coaching:'Ziel: Scanning wird automatisch, unbewusst, vor jedem Ballkontakt\nKeine Korrekturen während des Spielzugs – nur bei Unterbrechung\nLoben wenn Spieler von selbst scannt ohne Aufforderung',
  svg:'',   // v549: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf024',kat:'wahrnehmung',focus:false,
  name:'Farb-Entscheidung',
  kurz:'Hütchenfarbe = Passziel. Trainer ruft Farbe NACH Ballerhalt. Entscheidungsgeschwindigkeit trainieren.',
  spieler:'6–10',feld:'20×20m',dauer:'8–10',
  spass:4,diff:2,
  ablauf:'Freies Dribbling und Passspiel im Feld. In 3 Ecken steht je ein andersfarbiges Hütchentor. Trainer ruft eine Farbe – der Spieler mit Ball muss sofort durch das gerufene Hütchentor dribbeln oder passen. Trainer ruft erst WENN Spieler den Ball hat.\n\nVariante: Trainer ruft Farbe beim Vorpass – Empfänger weiß schon wohin.',
  varianten:'- Zahlen statt Farben (kognitive Last erhöhen)\n- Trainer zeigt Karte – kein Ruf, nur visuell\n- Zwei Farben gleichzeitig rufen: Spieler entscheidet welche',
  coaching:'Misst Phase 3: wie schnell wird nach Stimulus entschieden?\nKein Kommentar bei falscher Wahl – einfach nächste Situation starten\nTempo steigern sobald Spieler sicherer wird',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf025',kat:'wahrnehmung',focus:false,
  name:'Überzahl-Erkennung',
  kurz:'Spieler ruft laut wenn sein Team lokal in Überzahl ist. Spielverständnis Phase 2.',
  spieler:'8–10',feld:'25×20m',dauer:'10–12',
  spass:4,diff:2,
  ablauf:'4gg4 normales Spiel. Wenn ein Spieler erkennt dass sein Team lokal in Überzahl ist, ruft er laut "ÜBERZAHL!". Trainer stoppt Spiel, prüft ob es stimmt. Richtig: Team bekommt Punkt. Falsch: Gegner bekommt Ball.',
  varianten:'- Trainer zählt Spieler in einer Zone laut – Kinder lernen Prinzip zuerst\n- Ohne Punkte: einfach beobachten und in der Pause besprechen\n- Joker-Spieler: ein Spieler ohne Farbe gehört immer zum ballbesitzenden Team',
  coaching:'Nach dem Spiel: Wann hattet ihr Überzahl? – gemeinsam besprechen\nPhase 2 (Verstehen): Kinder sollen Situationen einordnen lernen\nFehler sind Lernmomente – keine Bestrafung',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf026',kat:'wahrnehmung',focus:false,
  name:'Blinde Pässe',
  kurz:'Spieler passt mit dem Rücken zum Mitspieler – muss vorher gemerkt haben wo er ist.',
  spieler:'4–6',feld:'15×15m',dauer:'6–8',
  spass:4,diff:3,
  ablauf:'Spieler A steht mit Ball. B und C sind Mitspieler. A schaut 3 Sekunden, dreht sich dann um (Rücken zu Mitspielern) und muss sagen wo B und C stehen (links/rechts/vorne). Dann dreht sich A wieder um und passt sofort – ohne erneut zu schauen – an die angesagte Stelle.\n\nZiel: Spielbild im Kopf behalten – Grundlage für blitzschnelle Entscheidungen.',
  varianten:'- Alle 3 Sekunden wechseln die Mitspieler die Position\n- Mit Ball: kurze Dribbling-Phase, dann blind passen\n- Teamversion: ganzes Team muss Positionen aller Spieler nennen',
  coaching:'Nicht auf den Ball schauen – auf die Mitspieler!\nDas Bild im Kopf: wo steht wer – BEVOR du den Ball bekommst\nProfi-Spieler schalten einen Gang früher: sie entscheiden bevor der Ball ankommt',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf027',kat:'wahrnehmung',focus:false,
  name:'Raumaufteilung-Quiz',
  kurz:'Trainer stoppt Spiel – Spieler muss sofort sagen wie viele Spieler in welcher Zone.',
  spieler:'6–10',feld:'25×20m',dauer:'8–10',
  spass:3,diff:2,
  ablauf:'Normales Spiel. Trainer pfeift und ruft einen Spieler mit Namen. Dieser Spieler muss sofort sagen: "Wie viele Spieler stehen gerade in der linken/rechten Hälfte?" oder "Wie viele Gegner sind hinter dir?"\n\nRichtige Antwort: Punkt für das Team. Falsch: Ball ans Gegnerteam.',
  varianten:'- Einfacher: nur "Überzahl oder Unterzahl?" fragen\n- Schwerer: genaue Positionierung beschreiben\n- Blind-Quiz: Spieler macht Augen zu, Trainer fragt',
  coaching:'Spieler sollen merken dass sie das Spielfeld kaum wahrnehmen\nKein Druck – es ist ein Quiz, kein Test\nZiel: Bewusstsein für das Feld entwickeln',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf028',kat:'wahrnehmung',focus:false,
  name:'Kopf-hoch-Signale',
  kurz:'Trainer zeigt Finger – Spieler muss Zahl nennen bevor er Ball annimmt.',
  spieler:'4–8',feld:'beliebig',dauer:'Aufwärmen 5–8',
  spass:5,diff:1,
  ablauf:'Trainer steht neben dem Spielfeld und hält Finger hoch. Bevor ein Spieler den Ball von Trainer empfängt, muss er die Anzahl der Finger korrekt nennen. Falsch: kein Ball. Richtig: Ball und weiterspielen.\n\nEinfache Form des kognitiven Spielens – Konzentration + Körper gleichzeitig.',
  varianten:'- Trainer zeigt zwei Hände: Summe nennen\n- Trainer wechselt Finger schnell: Reaktionstest\n- Andere Symbole: Farbe, Tier, Zahl – je nach Phantasie',
  coaching:'Hochschauen ist nicht nur für Pässe wichtig – auch generell!\nSpieler die automatisch hochschauen entwickeln bessere Spielintelligenz\nEinfache Übung mit großer Wirkung auf Wahrnehmung',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf029',kat:'wahrnehmung',focus:false,
  name:'Schatten-Pressing',
  kurz:'Zwei Spieler folgen dem Ball – immer einer presst, einer sichert. Pressingordnung lernen.',
  spieler:'4–5',feld:'15×12m',dauer:'6–8',
  spass:4,diff:2,
  ablauf:'2 Verteidiger, 2–3 Angreifer. Die Angreifer greifen auf 1 Minitor an, die Verteidiger versuchen den Ballgewinn. Verteidiger 1 presst den Ballführenden. Verteidiger 2 steht immer halb hinter V1 (Schatten) – bereit für Rückpass oder Ausweichbewegung. Wechsel nach Ballgewinn oder 30 Sekunden.',
  varianten:'- Angreifer müssen 5 Pässe spielen bevor Tor erlaubt\n- Verteidiger können auf Signal die Rollen tauschen\n- 3 Verteidiger: wer presst, wer sichert, wer steht tief?',
  coaching:'Verteidiger 1: press, aber lass V2 nachrücken!\nV2: steh nicht neben V1 – steh hinter ihm als Absicherung\nPressing ist ein System: einer presst, einer sichert immer',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf030',kat:'wahrnehmung',focus:false,
  name:'Blick-vor-Ball',
  kurz:'Spieler macht vor jeder Ballannahme eine Blickbewegung – zuerst schauen, dann handeln.',
  spieler:'beliebig',feld:'beliebig',dauer:'als Regel',
  spass:3,diff:1,
  ablauf:'Permanente Regel in allen Spielformen: Bevor ein Spieler den Ball annimmt, muss er einmal den Kopf drehen (Scan). Trainer lobt aktiv wenn er es sieht. Wer es vergisst bekommt freundliche Erinnerung: "Schau zuerst!"\n\nNach 4–6 Wochen soll dies zum Automatismus werden.',
  varianten:'- Anfangs: nur einfordern wenn Ball direkt zugespielt wird\n- Später: auch beim Dribbling regelmäßig hochschauen\n- Elite-Variante: Spieler scannt bevor der Pass zu ihm gespielt wird',
  coaching:'Das ist keine Übung – das ist eine Trainingsphilosophie\nKonsistenz: jeden Tag einfordern bis es automatisch ist\nDie besten Spieler der Welt tun das – und das lernt man mit 7 Jahren',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["wahrnehmung"]
},
{
  id:'tf031',kat:'technik',focus:false,
  name:'Autodrom Beidfüßig',
  kurz:'Freies Dribbling im Feld – auf Kommando: rechts, links, schnell, einfrieren.',
  spieler:'6–13',feld:'20×15m',dauer:'6–8',
  spass:5,diff:1,
  ablauf:'Jeder Spieler hat Ball und dribbelt frei ohne Zusammenstoß. Auf Kommando: "Rechts!" – nur rechter Fuß. "Links!" – nur linker Fuß. "Schnell!" – maximales Tempo. "Einfrieren!" – Ball stoppen, 360° umschauen.\n\nMax. 2 Kontakte mit starkem Fuß erlaubt – danach schwacher Fuß Pflicht.',
  varianten:'- König: wer 3x Ball verliert gibt Krone ab\n- Schwacher-Fuß-Duell: wer mehr Minuten nur schwachen Fuß schafft\n- Polizei & Räuber: 2 ohne Ball versuchen anderen Ball wegzuschlagen',
  coaching:'Keine Korrekturen beim Dribbeln – nur Kommandos rufen\nLoben wenn Spieler schwachen Fuß nutzt ohne Aufforderung\nBeobachte: Wer hat Angst vor dem schwachen Fuß?',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf032',kat:'technik',focus:false,
  name:'1gg1 Tore-Duell',
  kurz:'Zwei Spieler, 1gg1 auf 2 Minitore – kein Abspiel. Abschlussmut direkt provozieren.',
  spieler:'2 (in Wellen)',feld:'10×8m',dauer:'6–10',
  spass:5,diff:1,
  ablauf:'Immer 2 Spieler gegeneinander, 1gg1 auf 2 Minitore – jeder verteidigt eines. Kein Abspiel – jeder muss alleine abschließen. Tor direkt nach eigener Balleroberung zählt doppelt. Wechsel alle 2 Minuten.\n\nEigene Punkte zählen – kleiner Wettbewerb über die gesamte Einheit.',
  varianten:'- Tor zählt nur nach Finte (Dribbling mit Richtungswechsel)\n- Schwacher Fuß: Tor = 3 Punkte\n- 2gg1: Angreifer hat Überzahl für Anfänger',
  coaching:'Schieß! Lieber einmal zu früh als gar nicht!\nNach Torschuss sofort loben – egal ob Tor oder nicht\nIdeal für Spieler mit niedrigem Abschlussmut',
  svg:'',   // v549: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf033',kat:'technik',focus:false,
  name:'Spiegeldribbling',
  kurz:'Zwei Spieler face-to-face – einer spiegelt Dribbling-Bewegungen. Variante: nur schwacher Fuß.',
  spieler:'Paare',feld:'5×5m',dauer:'5–7',
  spass:4,diff:1,
  ablauf:'Beide Spieler haben je einen Ball. Spieler A dribbelt frei im 5×5m Feld. Spieler B spiegelt jede Bewegung mit seinem Ball (wie ein Spiegel). Nach 60 Sekunden: Rollentausch. Variante: beide nur schwacher Fuß – gegenseitiges Kopieren erzwingt langsames bewusstes Führen.',
  varianten:'- A macht Finte – B muss dieselbe Finte nachahmen\n- Zählen: wer mehr Kontakte mit schwachem Fuß schafft\n- Wettbewerb: wer kann den anderen 30 Sekunden lang perfekt spiegeln?',
  coaching:'Spielerisch und entspannt – kein Leistungsdruck\nBeobachte: welcher Spieler dominiert das Spiegeln? Zeigt Führungsqualität\nIdeal als ruhige Übung zwischen intensiven Spielformen',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf034',kat:'technik',focus:false,
  name:'Torschuss-Wettbewerb',
  kurz:'5 Schüsse von 3 Positionen – schwacher Fuß zählt doppelt. Motivierender Abschluss.',
  spieler:'4–8',feld:'Strafraum',dauer:'15–20',
  spass:5,diff:1,
  ablauf:'3 Abschusspositionen markieren (links, zentral, rechts, je 8–12m). Jeder Spieler schießt 5 Mal von jeder Position = 15 Schüsse. Punkte: Tor zentral = 1, links/rechts = 2, schwacher Fuß = Bonus +1.\n\nSieger bekommt Mini-Pokal (Trainer klatscht ausgiebig).',
  varianten:'- TW im Tor: Parade = TW bekommt Punkt\n- Vor dem Schuss: Pflicht-Dribbling um ein Hütchen\n- Zwei Schüsse ohne Ball-Stop – direkt aus Zuspiel',
  coaching:'Immer: Bewegung vor dem Schuss (kein stehender Schuss!)\nSchusshand/Standbein beobachten\nIdeal als Abschluss einer Trainingseinheit',
  svg:'',   // v549: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf035',kat:'technik',focus:false,
  name:'Dribbling-Parcours',
  kurz:'Hindernisparcours mit Hütchen – Richtungswechsel, Tempo, Finten schulen.',
  spieler:'4–13',feld:'15×8m',dauer:'8–10',
  spass:4,diff:1,
  ablauf:'Hütchengasse aufbauen: 6 Hütchen im Slalom, 2 Tore zum Durchdribbeln, 1 Abschluss am Ende. Jeder Spieler dribbelt durch den Parcours so schnell wie möglich. Zeitnahme optional.\n\nVariante: Spieler baut eigenen Parcours – Eigenverantwortung stärken.',
  varianten:'- Nur schwacher Fuß durch den Parcours\n- Mit Geräusch oder Farb-Kommando während des Dribblings (kognitive Last)\n- Blindes Dribbling im letzten Abschnitt (Augen halbzu)',
  coaching:'Enger Kontakt mit dem Ball – nicht zu weit wegstoßen!\nTempo steigern wenn Technik sitzt – nie vorher\nBeobachte: Wer bremst vor den Hütchen? Wer nimmt sie mit Fahrt?',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf036',kat:'technik',focus:false,
  name:'Schwacher-Fuß-Tag',
  kurz:'Gesamtes Training nur mit schwachem Fuß. Radikale aber effektive Methode.',
  spieler:'beliebig',feld:'beliebig',dauer:'ganze Einheit',
  spass:3,diff:2,
  ablauf:'Für eine komplette Trainingseinheit oder einzelne Spielformen gilt: Alle Pässe, Dribblings und Schüsse nur mit dem schwachen Fuß. Starker Fuß nur für Standbein erlaubt.\n\nWird erstaunlich schnell normal – und hat enormen Lerneffekt.',
  varianten:'- Nur bei Spielformen, nicht bei Übungen\n- Starker Fuß für direkte Pässe erlaubt (Doppelanforderung)\n- Wechsel-Tag: jede Spielform alterniert zwischen links und rechts',
  coaching:'Die ersten 10 Minuten sind frustrierend – danach wird es besser\nLoben für jeden Versuch – egal ob gut oder schlecht\nNach dem Training fragen: war das so schlimm? Meistens: nein!',
  svg:'',   // v600: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf037',kat:'technik',focus:false,
  name:'Finte-Wettkampf',
  kurz:'Spieler lernen 3 Grundfinten – dann Duell: wer kann Gegenspieler täuschen?',
  spieler:'4–8',feld:'10×10m',dauer:'8–10',
  spass:5,diff:2,
  ablauf:'Trainer zeigt 3 Finten: 1) Übersteiger, 2) Innenseite-Außenseite, 3) Körpertäuschung. Spieler üben 3 Minuten frei. Dann: 1gg1 Duell – nur wer Finte einsetzt darf Punkt zählen. Direktes Durchlaufen ohne Finte = kein Punkt auch wenn Tor fällt.',
  varianten:'- Spieler erfindet eigene Finte – wird dann zur Gruppenübung\n- Finte muss laut angesagt werden: "Übersteiger!" vor der Ausführung\n- Finte gegen Wand üben: kein Gegenspieler nötig',
  coaching:'Finten funktionieren nur wenn der Körper täuscht – Kopf und Schulter mit!\nErst langsam lernen – dann mit Tempo\nKreativität loben auch wenn Finte nicht klappt',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf038',kat:'technik',focus:false,
  name:'Erste Mitnahme vorwärts',
  kurz:'Ball kommt von hinten – erste Mitnahme muss vorwärts und kontrolliert sein.',
  spieler:'4–6',feld:'15×10m',dauer:'6–8',
  spass:3,diff:2,
  ablauf:'Spieler A steht mit Rücken zur Laufrichtung. Trainer spielt Ball von hinten zu A. A muss Ball mit ERSTER Berührung nach vorne mitnehmen – nicht seitlich, nicht stehen bleiben. Dann Dribbling zum Tor und Abschluss.\n\nHäufigster Fehler: Ball wird nach hinten oder seitwärts angenommen.',
  varianten:'- Ball kommt flach, dann als Aufsetzer\n- Mit leichtem Gegnerdruck von hinten\n- Zuspiel von der Seite: Mitnahme in Laufrichtung',
  coaching:'Erste Mitnahme ist eine eigene Technik – üben wie eine Finte!\nKörper muss sich BEVOR der Ball kommt zur Laufrichtung öffnen\nBlick: kurz auf Ball, sofort wieder in Laufrichtung',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["technik"]
},
{
  id:'tf039',kat:'pressing',focus:true,
  name:'Gegenpressing-Pfeife',
  kurz:'Pfeife nach Ballverlust = sofort 3 Schritte Richtung Ball. Automatismus trainieren.',
  spieler:'6–10',feld:'beliebig',dauer:'als Regel',
  spass:4,diff:1,
  ablauf:'In jede Spielform einbaubar. Sobald Team A den Ball verliert pfeift Trainer. Alle Spieler von Team A machen sofort 3 schnelle Schritte Richtung Ball. Erst dann: Normal weiter spielen.\n\nZiel: Umschalt-Reaktion durch Konditionierung auf akustischen Reiz automatisieren.',
  varianten:'- Klatsche statt Pfeife (lauter)\n- Spieler rufen selbst "PRESS!" wenn Ballverlust\n- Bonuspunkt wenn Ball in 3 Sekunden nach Pfeife zurückgewonnen',
  coaching:'Konsequent einsetzen – jeder Ballverlust = Pfeife\nNach 3–4 Einheiten: Pfeife weglassen – automatische Reaktion beobachten\nLoben wenn Spieler ohne Signal presst',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["pressing"]
},
{
  id:'tf040',kat:'pressing',focus:false,
  name:'Pressing-Welle 2gg2',
  kurz:'Nach Ballverlust: 5 Sekunden intensives Pressing. Zurückerobert = 2 Bonuspunkte.',
  spieler:'4–8',feld:'15×12m',dauer:'8–10',
  spass:5,diff:2,
  ablauf:'2gg2 auf 2 Minitore. Nach Ballverlust startet Trainer eine 5-Sekunden-Uhr (laut zählen). Wenn das verlierende Team den Ball in 5 Sekunden zurückerobert: 2 Bonuspunkte.\n\nJoker-Pressing: einmal pro Halbzeit alle 4 gemeinsam pressen. Ab 8 Kindern zwei Felder parallel aufbauen.',
  varianten:'- 3gg3 mit 8 Sekunden Pressing-Phase\n- Bonuspunkt wenn Ballrückeroberung direkt zu Tor führt\n- Pressing-Pflicht: erste 5 Sekunden nach Ballverlust immer pressen',
  coaching:'Sofort! Keine Pause nach Ballverlust!\nEnergie und Laufbereitschaft beobachten\nWer gibt nach Ballverlust auf? Wichtiger Indikator',
  svg:'',   // v549: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["pressing"]
},
{
  id:'tf041',kat:'pressing',focus:false,
  name:'Umschalt-Sprintpresse',
  kurz:'Nach Ballgewinn: sofort Sprint in Angriffsposition. Umschalten in beide Richtungen.',
  spieler:'6–10',feld:'25×20m',dauer:'10–12',
  spass:5,diff:2,
  ablauf:'3gg3 Funino. Neue Regel: Nach JEDEM Ballgewinn müssen alle Angreifer in 3 Sekunden ihre Offensivpositionen einnehmen. Nach JEDEM Ballverlust: sofort Pressing wie in Übung Gegenpressing-Pfeife.\n\nDoppeltes Umschalten in einer Übung.',
  varianten:'- Nur Umschalten nach Ballgewinn (einfacher)\n- Nur Pressing nach Ballverlust (einfacher)\n- TW koordiniert: ruft "Angriff!" oder "Verteidigung!"  nach Ballwechsel',
  coaching:'Beide Umschalt-Richtungen sind gleich wichtig\nWer schaltet schneller um: von Verteidigung zu Angriff oder andersherum?\nBeobachte jeden Spieler individuell – das ist charakteristisch',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["pressing"]
},
{
  id:'tf042',kat:'pressing',focus:false,
  name:'Balleroberung Bonus',
  kurz:'Balleroberung durch aktives Pressing = 1 Bonuspunkt zusätzlich zum Tor.',
  spieler:'6–10',feld:'25×20m',dauer:'10–12',
  spass:5,diff:1,
  ablauf:'Normales Funino-Spiel mit einer Regel: Wenn ein Team durch aktives Anlaufen und Pressing den Ball gewinnt (nicht durch Fehler des Gegners), bekommt es sofort 1 Bonuspunkt – auch ohne Tor.\n\nZiel: Pressing als lohnenswerte Handlung verankern.',
  varianten:'- Bonuspunkt nur wenn Ball DIREKT nach Pressing ins Tor geht (2 Pkt.)\n- Ohne Bonus aber mit Anfeuerung durch Trainer wenn Pressing klappt\n- Pressing-Zähler: Team das mehr Pressingaktionen hat gewinnt bei Gleichstand',
  coaching:'Pressing wird belohnt – das ist die wichtigste Botschaft\nAuch missglücktes Pressing loben wenn der Einsatz stimmt\nLangfristig: Pressing soll intrinsisch motiviert sein, nicht durch Punkte',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["pressing"]
},
{
  id:'tf043',kat:'pressing',focus:false,
  name:'Richtungs-Pressing',
  kurz:'Gegner wird in eine Seite gedrückt – koordiniertes Pressing mit klarer Richtung.',
  spieler:'6–8',feld:'20×15m',dauer:'8–10',
  spass:4,diff:3,
  ablauf:'2 Verteidiger gegen 2 Angreifer, wartende Paare rotieren nach jedem Durchgang. Die Verteidiger sollen den Ballführenden gezielt in eine Richtung drängen (z.B. immer zur Seitenlinie). Einer presst den Ball, einer schließt den Rückpassweg. Die Angreifer versuchen, über die gegenüberliegende Grundlinie zu dribbeln.\n\nRichtungs-Pressing ist eine der wichtigsten defensiven Prinzipien ab U9.',
  varianten:'- Nur zur linken Seite pressen (klare Aufgabe)\n- Verteidiger tauschen Rolle nach Ballwechsel\n- 3gg2: Angreifer in Überzahl – macht Pressing schwieriger',
  coaching:'V1 presst, V2 schließt den Rückpassweg!\nImmer zur Außenlinie drücken – nie zur Mitte hin öffnen\nKommunikation: V2 sagt V1 wohin er drücken soll',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["pressing"]
},
{
  id:'tf044',kat:'pressing',focus:false,
  name:'5-Sekunden-Hoch',
  kurz:'Nach Ballverlust im hohen Drittel: Jäger presst sofort 5 Sekunden. Gegenpressing in Angriffszone.',
  spieler:'6–10',feld:'25×20m',dauer:'10–12',
  spass:4,diff:2,
  ablauf:'Normales 4gg4. Neue Regel: Wenn Team A den Ball im gegnerischen Drittel verliert, hat der Jäger 5 Sekunden Zeit den Ball zurückzugewinnen – ohne dass andere Spieler helfen. Erst nach 5 Sekunden kommen die Flitzer zu Hilfe.\n\nJäger-spezifisches Gegenpressing trainieren.',
  varianten:'- 3 Sekunden statt 5 (intensiver)\n- Alle Feldspieler pressen gemeinsam\n- Bonuspunkt für Rückeroberung innerhalb 5 Sekunden durch Jäger',
  coaching:'Jäger: nach Ballverlust NICHT zurücklaufen – sofort anlaufen!\nDas ist die gefährlichste Moment für den Gegner: direkt nach Ballgewinn\nJäger-Mentalität: jeder Ballverlust ist eine Chance',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["pressing"]
},
{
  id:'tf045',kat:'spass',focus:false,
  name:'Fußball-König',
  kurz:'Aufsteiger-Absteiger auf mehreren Feldern. Faire Duelle, maximale Motivation.',
  spieler:'8–13',feld:'2–3 Felder parallel',dauer:'15–20',
  spass:5,diff:1,
  ablauf:'2–3 Spielfelder aufbauen. Immer 1gg1 oder 2gg2. Wer gewinnt steigt auf – wer verliert steigt ab. Oberstes Feld = Königsfeld. Niveau pendelt sich automatisch ein für faire Duelle.\n\nJede Runde 3 Minuten, dann Wechsel.',
  varianten:'- Tor nur durch Dribbling über Torlinie (kein Schuss)\n- Tor nur nach Pass von Mitspieler\n- Schwacher-Fuß-König: nur schwacher Fuß = automatisch aufsteigen',
  coaching:'Minimales Coaching – Kinder regeln sich selbst\nSpaß und Eigeninitiative beobachten\nWer bleibt freiwillig länger? Zeigt Neugier und Spielfreude',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:["spass"]
},
{
  id:'tf046',kat:'spass',focus:false,
  name:'Elfmeter-Turnier',
  kurz:'Elfmeter-Schießen als Trainingsabschluss. Entspannend und motivierend zugleich.',
  spieler:'4–13',feld:'Torbereich',dauer:'10–15',
  spass:5,diff:1,
  ablauf:'Jeder Spieler schießt 3 Elfmeter. Abwechselnd TW (Rotation). Wer trifft: Punkt. Gesamt-Sieger bekommt symbolischen Preis (High Five, Kapitänsbinde etc.).\n\nEinzeln oder Teams möglich. Ideal als entspannter Abschluss.',
  varianten:'- Elfmeter mit schwachem Fuß Pflicht\n- TW darf nicht Richtung wählen vor Schuss (Blindes Parieren)\n- Chip-Shot-Pflicht: Ball muss hochfliegen',
  coaching:'Kein technisches Coaching während Elfmeter\nBeobachte: Wer schießt mit Überzeugung? Wer zögert?\nSelbstvertrauen (t_selbstv) direkt beobachtbar',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["spass"]
},
{
  id:'tf047',kat:'spass',focus:false,
  name:'Fangspiel mit Ball',
  kurz:'Fänger OHNE Ball, Spieler MIT Ball. Dribbling-Training verkleidet als Fangspiel.',
  spieler:'8–13',feld:'20×20m',dauer:'5–8',
  spass:5,diff:1,
  ablauf:'2 Fänger ohne Ball versuchen Spieler mit Ball zu berühren. Wer berührt wird: steht als Eisblock still, bis ein Mitspieler durch seine Beine dribbelt.\n\nSchnelle Richtungswechsel mit Ball werden automatisch trainiert.',
  varianten:'- Fänger haben auch Ball – dürfen aber nur langsam gehen\n- Befreiung nur durch Pass zwischen den Beinen\n- Kettenfangen: wer gefangen wird wird Fänger',
  coaching:'Kein Coaching nötig – reine Spielform\nBeobachte: Wer hilft Mitspielern zu befreien? Zeigt Teamgeist\nIdeal als Aufwärmen oder Abschluss',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["spass"]
},
{
  id:'tf048',kat:'spass',focus:false,
  name:'Runden-Turnier Funino',
  kurz:'Jedes Team spielt gegen alle anderen. Trainer beobachten gezielt einzelne Spieler.',
  spieler:'9–13',feld:'3 Felder',dauer:'20–25',
  spass:5,diff:1,
  ablauf:'3 Teams à 3–4 Spieler. Jedes Team spielt 5-minütige Spiele gegen alle anderen. Am Ende: gemeinsames Abklatschen. Trainer rotieren über Felder – jedes Feld bekommt Beobachtungszeit.\n\nIdeal für gezielte Spielerbeobachtung unter Wettkampfdruck.',
  varianten:'- Tor mit vorherigem Pass = 2 Punkte\n- Jedes Team gibt vor dem Spiel einen Mannschaftsruf aus\n- Wechselnde Regeln je Feld',
  coaching:'Minimales Eingreifen – Wettkampf-Simulation\n3 Trainer können auf 3 Feldern je 1 Spieler beobachten\nNotizen zu Spielern die im Wettkampf anders reagieren als im Training',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["spass"]
},
{
  id:'tf049',kat:'spass',focus:false,
  name:'Torhüter-Tag',
  kurz:'Alle Spieler rotieren durchs Tor. TW-Rolle für jeden – Respekt und Verständnis stärken.',
  spieler:'6–13',feld:'normal',dauer:'gesamtes Training',
  spass:4,diff:1,
  ablauf:'Alle Spieler spielen abwechselnd im Tor – nicht nur die TW-Spieler. Jede Spielform: nach 5 Minuten rotiert TW. Ziel: alle verstehen was TW-Spieler leisten – und TW-Spieler können auch Feld genießen.',
  varianten:'- Nur für Spielformen, nicht für technische Übungen\n- TW muss nach dem Spiel sagen was er auf dem Feld gelernt hat\n- Beliebtester TW am Ende des Trainings durch Team gewählt',
  coaching:'Fördert Respekt gegenüber der TW-Rolle\nTW-Spieler können mal durchatmen vom Tor-Druck\nBeobachte: Wer ist ein überraschend guter TW?',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["spass"]
},
{
  id:'tf050',kat:'spass',focus:false,
  name:'Freies Spielen',
  kurz:'Kein Trainer-Input. Kinder entscheiden Regeln selbst. Freude und Eigeninitiative.',
  spieler:'beliebig',feld:'beliebig',dauer:'10–15',
  spass:5,diff:1,
  ablauf:'Kinder bekommen Ball und Feld – keine Vorgaben. Sie entscheiden selbst: wie viele gegen wie viele, welche Regeln, welche Tore. Trainer beobachtet aus der Distanz ohne einzugreifen.\n\nDiese Form ist oft die wertvollste des gesamten Trainings.',
  varianten:'- Mit kleiner Startaufgabe: "Erfindet eine Regel die niemand kennt"\n- Thema vorgeben: "Spielt so als wäre ihr Weltmeister"\n- Dokumentation: was erfinden die Kinder? Notizen als Bewertungsgrundlage',
  coaching:'NICHT eingreifen – das ist die Übung!\nBeobachte: Wer übernimmt Führung? Wer löst Konflikte?\nEigeninitiative, Kreativität und Sozialverhalten pur beobachtbar',
  svg:'',   // v599: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN,
  tags:["spass"]
},
{
  id:'tf051',kat:'raute',focus:true,
  name:'Adler vs. Igel - Formwechsel',
  kurz:'Auf Zuruf wechselt das Team zwischen breiter Offensiv- und enger Defensiv-Raute.',
  spieler:'8-10',feld:'25x20m',dauer:'10-12',spass:5,diff:2,
  ablauf:'4gg4 auf 4 Minitore (oder 5gg5 mit TW auf 2 Kleinfeldtore). Trainer ruft waehrend des Spiels abwechselnd ADLER! oder IGEL!.\n\nADLER = Team das in Ballbesitz ist macht sich breit: Flitzer L/R ziehen auf die Aussenbahnen, Jaeger besetzt die Spitze, Aufpasser bleibt hinten als Anspielstation. Feld wird gross.\n\nIGEL = Team ohne Ball zieht eng zusammen: alle 4 Feldspieler ruecken in die Zone um den Ball, Abstaende verkuerzen sich, gemeinsames Pressing.\n\nBeide Begriffe sollen zu Automatismen werden - die Kinder reagieren auf den Zuruf mit der passenden Formation.',
  varianten:'- Nur ein Team bekommt den Zuruf, das andere muss selbst erkennen was zu tun ist\n- Belohnung: korrekte Adler-Formation bei Torschuss = Tor zaehlt doppelt\n- Belohnung: korrekte Igel-Formation bei Balleroberung = Bonuspunkt',
  coaching:'ADLER! - Feld gross machen, Breite und Tiefe nutzen!\nIGEL! - Zusammenziehen, eng werden, gemeinsam pressen!\nDie Begriffe sind unsere Teamsprache - immer konsequent verwenden.',
  svg:'',   // v597: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:['Adler','Igel','Grundordnung','Formwechsel','Raute']
},
{
  id:'tf052',kat:'raute',focus:true,
  name:'Igel-Pressing-Kreis',
  kurz:'Nach Ballverlust sofort Igel-Formation: eng zusammenziehen und gemeinsam pressen.',
  spieler:'6-8',feld:'20x18m',dauer:'8-10',spass:4,diff:2,
  ablauf:'3gg3 oder 4gg4 Funino. Sobald ein Team den Ball verliert, ruft der Trainer IGEL!. Alle Feldspieler des Teams muessen sich sofort in einem engen Kreis um den Ball sammeln (max. 8m Durchmesser) und gemeinsam pressen.\n\nGelingt die Balleroberung innerhalb der Igel-Formation: 2 Bonuspunkte.\n\nNach Balleroberung: Trainer ruft ADLER! - Team macht sich sofort wieder breit fuer den Spielaufbau.',
  varianten:'- Ohne Zuruf: Spieler rufen sich gegenseitig IGEL! oder ADLER! zu\n- Mit Huetchen-Markierung der Igel-Zone\n- Zeitdruck: Igel-Formation muss in 3 Sekunden stehen',
  coaching:'IGEL! - alle zusammen, eng, gemeinsam pressen!\nNach Ballgewinn sofort ADLER! - Feld wieder gross machen!\nDas ist unser Umschalt-Vokabular - beide Richtungen gleich wichtig.',
   svg:'',   // v551: handgezeichnet, ersetzt durch die Spec in TF_SKIZZEN
  tags:['Igel','Pressing','Umschalten','Gegenpressing']
},

// ═══════════ AUFWÄRMEN ═══════════
{id:'aw01',kat:'aufwaermen',focus:true,name:'Hai & Fische',kurz:'Fangspiel – 1-2 Haie schießen die Bälle der Fische aus dem Feld. Wer seinen Ball verliert, wird auch Hai.',spieler:'8-13',feld:'15×15m',dauer:'5-8',spass:5,diff:1,
ablauf:'Feld 15×15m abstecken. 1-2 Spieler sind Haie (Leibchen). Alle anderen sind Fische und dribbeln mit Ball durch das Feld. Haie versuchen, den Ball aus dem Feld zu schießen. Wer seinen Ball verliert, wird auch Hai.\n\nLetzte 2-3 Fische gewinnen!',
varianten:'- Haie auch mit Ball (Dribbling-Duell)\n- Fische müssen ständig dribbeln (kein Stehen)\n- Rettungsinseln: 2 kleine Zonen wo Fische 3 Sek. sicher sind',
coaching:'Kopf hoch beim Dribbeln!\nSchau wo die Haie sind – Ausweichen!\nEng am Ball bleiben wenn ein Hai kommt',svg:'',tags:['Aufwärmen','Dribbling']},

{id:'aw02',kat:'aufwaermen',focus:false,name:'Feuer-Wasser-Sturm mit Ball',kurz:'Bewegungsspiel mit Kommandos – Reaktion und Ballkontrolle.',spieler:'6-13',feld:'20×15m',dauer:'5-8',spass:5,diff:1,
ablauf:'Alle dribbeln frei im Feld. Trainer ruft Kommandos:\n- FEUER = Ball stoppen, flach auf den Boden legen\n- WASSER = Ball hochnehmen und über den Kopf halten (falls vorhanden: auf eine Bank steigen)\n- STURM = Ball festhalten, hinsetzen\n- ADLER = breit machen, an den Rand dribbeln\n- IGEL = alle zusammen in die Mitte dribbeln\n\nLetzter Spieler macht 3 Hampelmänner.',
varianten:'- Neue Kommandos: BLITZ = Seitenwechsel, DONNER = Partner suchen und Doppelpass\n- Ohne Ball: nur Laufen, dann mit Ball steigern',
coaching:'Schnelle Reaktion auf Kommando!\nBall immer unter Kontrolle halten\nAdler/Igel-Begriffe lernen – die brauchen wir im Spiel!',svg:'',tags:['Aufwärmen','Reaktion','Adler','Igel']},

{id:'aw03',kat:'aufwaermen',focus:false,name:'Tierbewegungen-Parcours',kurz:'Koordinations-Parcours mit Tierbewegungen – Motorik und Spaß.',spieler:'6-13',feld:'20×10m',dauer:'5-8',spass:5,diff:1,
ablauf:'Parcours mit 5 Stationen aufbauen:\n1. Bärengang (Hände und Füße, Po hoch)\n2. Froschsprünge über Hütchen\n3. Krebsgang rückwärts\n4. Spinne (Rücken zum Boden, Hände und Füße)\n5. Känguru-Sprünge mit Ball in der Hand\n\nJeder durchläuft den Parcours 2-3x.',
varianten:'- Auf Zeit: Wer schafft den Parcours am schnellsten?\n- Mit Ball am Fuß bei jeder Station\n- Staffelwettbewerb in 2 Gruppen',
coaching:'Saubere Ausführung vor Tempo!\nKörperspannung halten\nSpaß haben – wer macht den besten Frosch?',svg:'',tags:['Aufwärmen','Koordination','Motorik']},

{id:'aw04',kat:'aufwaermen',focus:false,name:'Nummernlauf',kurz:'Lauf- und Reaktionsspiel mit Nummern – kognitive Aktivierung.',spieler:'6-13',feld:'20×20m',dauer:'5',spass:4,diff:1,
ablauf:'Alle joggen locker im Feld mit Ball. Jeder bekommt eine Nummer (1-13). Trainer ruft:\n- Eine Nummer: Spieler sprintet zum Trainer und macht Doppelpass\n- Zwei Nummern: Beide finden sich und passen 5x\n- ALLE: Alle dribbeln zum Mittelpunkt\n\nWer am schnellsten reagiert, darf nächstes Kommando geben.',
varianten:'- Farben statt Nummern (Leibchen)\n- Rechenaufgaben: "3+4" → Nummer 7 reagiert\n- Rückwärts dribbeln zum Trainer',
coaching:'Nummer merken und aufmerksam bleiben!\nReagiere sofort – keine Verzögerung\nPass sauber spielen, auch unter Zeitdruck',svg:'',tags:['Aufwärmen','Reaktion','Kognition']},

{id:'aw05',kat:'aufwaermen',focus:false,name:'Ball-Dieb',kurz:'Dribbeln und gleichzeitig gegnerische Bälle wegschießen.',spieler:'8-13',feld:'15×15m',dauer:'5-8',spass:5,diff:2,
ablauf:'Jeder Spieler dribbelt mit eigenem Ball im Feld. Gleichzeitig versucht jeder, den Ball von anderen Spielern aus dem Feld zu schießen – den eigenen aber zu schützen.\n\nWer seinen Ball verliert, holt ihn, macht außerhalb 5× Ball hochwerfen und fangen und merkt sich einen Minuspunkt. Wer nach 2 Minuten die wenigsten Minuspunkte hat, gewinnt.',
varianten:'- Teams: 2 Mannschaften, nur gegnerische Bälle angreifen\n- Zeitlimit: 2 Minuten – wer hat am Ende noch seinen Ball?\n- Nur mit dem schwachen Fuß dribbeln',
coaching:'Kopf hoch – gleichzeitig schützen UND angreifen!\nKörper zwischen Ball und Gegner\nEng am Ball dribbeln unter Druck',svg:'',tags:['Aufwärmen','Dribbling','1gg1']},

{id:'aw06',kat:'aufwaermen',focus:false,name:'Schattenläufer',kurz:'Paarweise – einer führt, einer kopiert. Koordination und Wahrnehmung.',spieler:'6-12',feld:'15×15m',dauer:'5',spass:4,diff:1,
ablauf:'Paare bilden, beide mit Ball. Spieler A dribbelt frei durchs Feld – Spieler B folgt als Schatten mit eigenem Ball und kopiert alle Bewegungen (Tempo, Richtungswechsel, Stopps).\n\nNach 1 Min. wechseln. Dann: Schatten muss das GEGENTEIL machen (A geht links, Schatten geht rechts).',
varianten:'- Ohne Ball: nur Laufbewegungen kopieren\n- 3er-Gruppen: einer führt, zwei Schatten\n- Wettbewerb: Schatten versucht den Führenden zu überholen',
coaching:'Eng dranbleiben am Partner!\nPeripheres Sehen nutzen – nicht nur auf den Ball gucken\nKreativ führen – Tempowechsel einbauen!',svg:'',tags:['Aufwärmen','Wahrnehmung','Koordination']},

{id:'aw07',kat:'aufwaermen',focus:false,name:'Atomspiel',kurz:'Laufspiel mit Gruppenbildung – Reaktion und Teamfinding.',spieler:'8-13',feld:'20×15m',dauer:'5',spass:5,diff:1,
ablauf:'Alle dribbeln im Feld. Trainer ruft eine Zahl (z.B. "3!"). Spieler müssen sofort Gruppen dieser Größe bilden und sich mit den Bällen zusammensetzen.\n\nWer keine Gruppe findet, macht eine Sonderaufgabe (5 Liegestütze, Ballhochhalter etc.). Dann weiter dribbeln.',
varianten:'- Mathe: "6 geteilt durch 2!" → 3er Gruppen\n- Zusatzregel: Gruppe muss alle Bälle übereinander stapeln\n- "Adler!" = Gruppen an den Rand, "Igel!" = alle in die Mitte',
coaching:'Schnell orientieren – wer braucht noch jemanden?\nKommunizieren: "Hier! Zu mir!"\nBall beim Laufen immer am Fuß',svg:'',tags:['Aufwärmen','Kognition','Sozial']},

{id:'aw08',kat:'aufwaermen',focus:false,name:'Zombieball',kurz:'Abwurfspiel – Werfen, Fangen, Ausweichen mit hohem Spaßfaktor.',spieler:'8-13',feld:'15×15m',dauer:'5-8',spass:5,diff:1,
ablauf:'3 Softbälle im Spiel. Alle gegen alle: Wer gerade einen Softball hat, darf jeden anderen abwerfen (nur unterhalb der Hüfte). Wer getroffen wird, wird zum Zombie: stehen bleiben, Arme ausstrecken. Zombies können befreit werden, wenn ein freier Spieler ihnen einen Ball zurollt.\n\nSpiel endet wenn alle Zombies sind oder nach 3 Minuten.',
varianten:'- Zombies dürfen sich langsam bewegen (Schlurfen)\n- Nur mit der schwachen Hand werfen\n- Kombination: danach gleiches Prinzip mit Fußball – Bälle schießen statt werfen',
coaching:'Ausweichen und Reaktion trainieren\nNach Treffer sofort stehen bleiben – fair spielen\nBefreie deine Mitspieler – Teamgeist!',svg:'',tags:['Aufwärmen','Reaktion','Spass']},

{id:'aw09',kat:'aufwaermen',focus:false,name:'Lauf-ABC mit Ball',kurz:'Koordinative Laufschule mit Ball am Fuß – Basis für jede Einheit.',spieler:'6-13',feld:'20×10m',dauer:'8',spass:3,diff:1,
ablauf:'Auf einer 20m-Strecke hin und zurück:\n1. Locker dribbeln, auf Pfiff Ball stoppen\n2. Kniehebelauf + Ball mit Sohle rollen\n3. Anfersen + Ball pendeln links-rechts\n4. Seitgalopp + Ball mit Außenrist führen\n5. Rückwärtslaufen + Ball mit Sohle ziehen\n6. Skippings + Ball hochhalten\n\nJede Übung 1 Durchgang.',
varianten:'- Ohne Ball zuerst, dann mit Ball steigern\n- Partnerweise: einer macht vor, anderer nach\n- Wettbewerb: sauberste Ausführung gewinnt',
coaching:'Qualität vor Tempo!\nAufrecht laufen, Körperspannung\nBall immer im Blick und unter Kontrolle',svg:'',tags:['Aufwärmen','Koordination','Technik']},

{id:'aw10',kat:'aufwaermen',focus:false,name:'Farben-Dribbeln',kurz:'Kognitive Aufwärmung – auf Farb-Hütchen reagieren.',spieler:'6-13',feld:'20×15m',dauer:'5-8',spass:4,diff:2,
ablauf:'4 verschiedenfarbige Hütchen in den Ecken. Alle dribbeln im Feld. Trainer ruft eine Farbe → alle dribbeln schnell zum entsprechenden Hütchen.\n\nSteigerung: Trainer zeigt Farbe (Leibchen hochhalten) statt zu rufen → visuelle Wahrnehmung.',
varianten:'- Farbe = Aktion: Rot = 5 schnelle Ballkontakte am Hütchen, Blau = Doppelpass mit Partner, Grün = 3x Ballhochhalten (mit Minitor im Aufbau: Rot = Torschuss)\n- Trainer ruft NICHT die Farbe sondern zeigt in eine Richtung\n- Letzte 2 Spieler am Hütchen → Sonderaufgabe',
coaching:'Kopf hoch beim Dribbeln!\nReagiere auf das Signal, nicht auf andere Spieler\nSchneller Antritt zum Hütchen',svg:'',tags:['Aufwärmen','Kognition','Dribbling']},

// ═══════════ TORWART-TRAINING ═══════════
{id:'tw01',kat:'torwart',focus:true,name:'Fang-Stern',kurz:'Grundtechnik: Bälle aus 5 Richtungen fangen – Beinarbeit und Grifftechnik.',spieler:'1-3',feld:'Tor + 5m',dauer:'8-10',spass:4,diff:1,
ablauf:'TW steht im Tor. 5 Hütchen im Halbkreis (5m Abstand). Trainer schießt von jedem Hütchen nacheinander:\n1. Flach links\n2. Flach rechts\n3. Halbhoch links\n4. Halbhoch rechts\n5. Zentral auf Brusthöhe\n\nTW fängt, wirft zurück, macht Sidesteps zur Mitte. 3 Runden.',
varianten:'- Reihenfolge zufällig (Trainer ruft Nummer)\n- Rückwärtslaufen zwischen den Fängen\n- Ball wird gerollt statt geschossen (Anfänger)',
coaching:'Immer auf den Fußballen stehen – bereit sein!\nHände vor dem Körper – Ball kommt zu dir\nNach jedem Fang zurück in die Mitte',svg:'',tags:['Torwart','Fangtechnik','Beinarbeit']},

{id:'tw02',kat:'torwart',focus:true,name:'Fallschule Rechts-Links',kurz:'Seitliches Fallen lernen – weiche Landung, Ball sichern.',spieler:'1-3',feld:'Weichboden/Rasen',dauer:'8',spass:3,diff:2,
ablauf:'TW kniet seitlich. Trainer rollt Ball flach nach rechts → TW lässt sich kontrolliert zur Seite fallen, sichert Ball am Boden mit beiden Händen. Obere Hand drückt Ball nach unten, untere Hand dahinter.\n\n10x rechts, 10x links. Dann aus dem Stand.\n\nSteigerung: Trainer wirft halbhoch → TW springt seitlich ab und fängt im Flug.',
varianten:'- Auf Weichbodenmatte starten (Angst nehmen)\n- Nur rollen lassen (Anfänger) → dann werfen → dann schießen\n- Wettbewerb: Wer hält die meisten von 10?',
coaching:'Nicht auf die Knie fallen – seitlich abrollen!\nBall IMMER mit beiden Händen sichern\nKein Hohlkreuz – Körperspannung',svg:'',tags:['Torwart','Fallen','Grundtechnik']},

{id:'tw03',kat:'torwart',focus:false,name:'Reaktions-Kasten',kurz:'Trainer schießt aus 3m durch Hütchentor – TW reagiert blitzschnell.',spieler:'1-2',feld:'Tor + 3m',dauer:'8',spass:5,diff:2,
ablauf:'Hütchentor (2m breit) 3m vor dem großen Tor. TW im großen Tor. Trainer schießt flach durch das Hütchentor → Ball kommt schnell, TW muss blitzschnell reagieren.\n\nVariation: Trainer steht seitlich versetzt → Ball kommt aus verschiedenen Winkeln.\n\n15-20 Schüsse, dann Pause.',
varianten:'- Trainer schießt abwechselnd links/rechts am Hütchentor vorbei\n- TW startet mit Rücken zum Tor, dreht sich auf Pfiff um\n- 2 Bälle schnell hintereinander',
coaching:'Auf Fußballen wippen – NICHT flach stehen!\nReaktion kommt aus den Beinen, nicht den Armen\nAuch wenn du den Ball nicht hältst – versuch es immer!',svg:'',tags:['Torwart','Reaktion']},

{id:'tw04',kat:'torwart',focus:false,name:'1gg1 Torwart vs Stürmer',kurz:'Spielnahe Situation – TW macht sich groß, Timing beim Rauslaufen.',spieler:'2-4',feld:'Tor + 10m',dauer:'10',spass:5,diff:2,
ablauf:'Stürmer startet 10m vor dem Tor mit Ball. TW im Tor. Stürmer dribbelt an → TW muss entscheiden: Rauslaufen und den Winkel verkürzen oder abwarten.\n\nRegelrunde: 10 Angriffe pro TW, wie viele kann er halten?\n\nWichtiger Coaching-Punkt: TW soll sich GROSS machen (Arme seitlich, Beine breit) und den Moment abpassen.',
varianten:'- Stürmer darf nur schießen (kein Dribbling am TW vorbei)\n- 2 Stürmer nacheinander (Ermüdung simulieren)\n- TW darf bis zu einer mit Hütchen markierten Linie 5m vor dem Tor rauslaufen',
coaching:'Mach dich GROSS – Arme raus, Beine breit!\nTiming: nicht zu früh, nicht zu spät rauslaufen\nMutig sein! Du bist der Boss im Strafraum',svg:'',tags:['Torwart','1gg1','Spielnah']},

{id:'tw05',kat:'torwart',focus:false,name:'Abschlag & Abwurf',kurz:'Spieleröffnung vom TW – 4 Techniken: rollen, werfen, Abschlag, Abstoß.',spieler:'1-3',feld:'30×20m',dauer:'8',spass:3,diff:2,
ablauf:'3 Zielzonen mit Hütchen markieren (10m, 15m, 20m Entfernung).\n\nTW übt nacheinander:\n1. Abrollen (flach, 10m Zielzone)\n2. Seitlicher Abwurf (15m Zielzone)\n3. Abschlag aus der Hand (20m Zielzone)\n4. Abstoß vom Boden (20m-Zielzone)\n\nJe 5 Versuche pro Technik. Punkte für Treffer in die Zielzone.',
varianten:'- Mitspieler als Anspielstationen → muss den richtigen anspielen\n- Unter Zeitdruck: Ball kommt, TW hat 4 Sekunden\n- Wettbewerb: Welcher TW trifft öfter die Zone?',
coaching:'Abrollen = sicherste Option → immer zuerst prüfen!\nBeim Abwurf: Gegenarm zeigt zum Ziel\nSchnelle Spieleröffnung = Konter-Chance für uns!',svg:'',tags:['Torwart','Spieleröffnung']},

{id:'tw06',kat:'torwart',focus:false,name:'Torwart-Koordinations-Leiter',kurz:'Fußarbeit in der Koordinationsleiter + anschließend Ball halten.',spieler:'1-3',feld:'Leiter + Tor',dauer:'8',spass:4,diff:2,
ablauf:'Koordinationsleiter vor dem Tor aufbauen. TW durchläuft die Leiter mit verschiedenen Schrittmustern – danach schießt der Trainer sofort aus 6-8m flach aufs Tor und der TW hält den Schuss:\n\n1. Vorwärts durchlaufen → Schuss halten\n2. Seitwärts durchlaufen → Schuss halten\n3. Zwei rein, eins raus → Schuss halten\n4. Hopser-Lauf → Schuss halten\n\n3 Durchgänge pro Muster.',
varianten:'- Ohne Leiter: zwischen Hütchen Sidesteps\n- Rückwärts durch die Leiter\n- 2 Schüsse nacheinander nach der Leiter',
coaching:'Saubere Fußarbeit – nicht schludern!\nNach der Leiter sofort bereit sein (Grundstellung)\nSchnelle Füße = schnelle Reaktion im Tor',svg:'',tags:['Torwart','Koordination','Beinarbeit']},

{id:'tw07',kat:'torwart',focus:false,name:'Torwart-Tennis',kurz:'Spielform – 2 TWs werfen sich Bälle über ein Netz zu.',spieler:'2-4',feld:'6×3m mit Netz/Schnur',dauer:'10',spass:5,diff:2,
ablauf:'Schnur auf 1m Höhe zwischen zwei Stangen spannen (Notlösung: Hütchenlinie am Boden – Ball muss dann im hohen Bogen geworfen werden). Je 1 TW pro Seite, bei 4 Spielern je 2 (3×3m Feld pro Seite).\n\nRegeln:\n- Ball muss über die Schnur geworfen werden\n- Gegner muss fangen bevor der Ball den Boden berührt\n- 1 Bodenkontakt erlaubt (Steigerung: kein Bodenkontakt)\n\nPunkte wie beim Tennis. Spiel bis 11.',
varianten:'- Nur mit einer Hand werfen\n- Ball muss mit beiden Händen über dem Kopf gefangen werden\n- Größeres Feld (4×4m) für mehr Laufarbeit',
coaching:'Beinarbeit! Immer in Bewegung bleiben\nFangen = Ball zum Körper ziehen, sichern\nFaire Würfe – nicht nur in die Ecke ballern',svg:'',tags:['Torwart','Fangen','Spass']},

{id:'tw08',kat:'torwart',focus:false,name:'Flugball-Fangen',kurz:'Hohe Bälle sicher pflücken – Absprung-Timing und Griffsicherheit.',spieler:'1-3',feld:'Tor + 8m',dauer:'8',spass:4,diff:2,
ablauf:'Trainer wirft hohe Bälle aus 6-8m Entfernung ins Tor:\n1. Zentral über Kopfhöhe (10x)\n2. Leicht versetzt links/rechts (je 5x)\n3. Bogenlampen (5x)\n\nTW springt hoch, fängt den Ball am höchsten Punkt mit beiden Händen. Ball sofort zum Körper ziehen.',
varianten:'- Mit Störspieler: Angreifer stört beim Fangen (leichter Körperkontakt)\n- TW muss vor dem Fang eine Drehung machen\n- Flanken statt Würfe (realistischer)',
coaching:'Ball am HÖCHSTEN Punkt fangen – nicht warten!\nKnie hochziehen beim Sprung (Schutz + Höhe)\nLaut "MEINER!" rufen',svg:'',tags:['Torwart','Hohe Bälle','Fangtechnik']},

{id:'tw09',kat:'torwart',focus:false,name:'Schuss-Abwehr Stationen',kurz:'3 Stationen, 3 Schussarten – Rotationstraining mit hoher Wiederholungszahl.',spieler:'3-6',feld:'3 Stangentore',dauer:'12',spass:4,diff:2,
ablauf:'3 Stationen aufbauen (je ein Stangentor 2m breit, oben offen – so sind auch halbhohe Bälle haltbar):\n\nStation 1: Flachschüsse aus 5m (Grundtechnik)\nStation 2: Halbhohe Schüsse aus 7m (Reaktion)\nStation 3: Volleys aus 4m (Mut & Reflexe)\n\nJe 2 Min. pro Station, dann rotieren. TW hält, Schütze schießt, Ballholer sammelt.',
varianten:'- 4. Station: Elfmeter (Positionierung lernen)\n- Punkte sammeln: gehaltener Ball = 1 Punkt, gefangener Ball = 2 Punkte\n- Zeitdruck: 10 Schüsse in 60 Sekunden',
coaching:'Grundstellung vor JEDEM Schuss einnehmen\nNicht wegdrehen – dem Ball entgegen gehen!\nAuch parierte Bälle nachfassen',svg:'',tags:['Torwart','Schussabwehr','Stationen']},

{id:'tw10',kat:'torwart',focus:false,name:'Rückpass-Mitspielen',kurz:'TW als Feldspieler – Rückpässe verarbeiten und weiterleiten.',spieler:'3-5',feld:'20×15m',dauer:'8',spass:3,diff:2,
ablauf:'TW steht am Strafraum-Rand. 2-4 Feldspieler passen untereinander und spielen regelmäßig Rückpässe zum TW. TW muss:\n\n1. Ball annehmen (1. Kontakt!)\n2. Druckpass flach zum nächsten Spieler\n3. Unter Zeitdruck: Angreifer läuft auf TW zu → muss vorher passen\n\n5 Min. Passfolgen, dann Steigerung mit Gegenspieler.',
varianten:'- TW darf nur mit dem schwachen Fuß spielen\n- Rückpass von der Seite → TW muss sich drehen und öffnen\n- Wettbewerb: Passquote zählen (Ziel: 80%)',
coaching:'Erster Kontakt VOR die Füße – nicht unter den Körper!\nImmer anspielbar sein – Körper aufdrehen\nBei unsauberem Rückpass: lieber wegschießen als Risiko',svg:'',tags:['Torwart','Mitspielen','Passspiel']},

{id:'tw11',kat:'torwart',focus:false,name:'Torwart-Entscheidungsspiel',kurz:'Rauslaufen oder bleiben? TW übt Entscheidungen in Spielsituationen.',spieler:'3-5',feld:'Tor + 16m',dauer:'10',spass:4,diff:3,
ablauf:'2 Angreifer starten 16m vor dem Tor. Trainer gibt Signal:\n\nSituation A: Ein Angreifer dribbelt allein → TW RAUS (1gg1)\nSituation B: Zwei Angreifer kommen → TW im Tor bleiben, Winkel verkürzen\nSituation C: Pass in die Tiefe → TW raus und vor dem Stürmer klären\n\nTrainer zeigt vorher mit Handzeichen welche Situation. TW muss richtig reagieren.',
varianten:'- Ohne Vorankündigung → TW entscheidet selbst\n- Dritten Angreifer hinzufügen\n- TW dirigiert Mitspieler: "Rechts halten!" "Links zumachen!"',
coaching:'Kommunikation! Rede mit deiner Abwehr!\nBei 1gg1: IMMER rauslaufen und groß machen\nBei Überzahl: Tor schützen, Winkel verkürzen',svg:'',tags:['Torwart','Entscheidung','Spielnah']},

{id:'tw12',kat:'torwart',focus:false,name:'Elfmeter-Positionierung',kurz:'Wo stehe ich? Winkel verkürzen – Grundstellung beim Elfmeter.',spieler:'2-5',feld:'Tor + 9m',dauer:'8',spass:5,diff:2,
ablauf:'TW lernt seine Grundposition beim Elfmeter:\n\n1. Mittig im Tor stehen, auf der Linie\n2. Auf der Linie bleiben – beim Schuss muss mindestens ein Fuß die Linie berühren (so will es die Regel); seitliches Bewegen auf der Linie ist erlaubt\n3. Auf den Fußballen wippen\n4. Schütze beobachten (Anlauf, Fuß, Blickrichtung)\n\n10 Elfmeter: TW soll nicht raten sondern REAGIEREN. Punkte für gehaltene.',
varianten:'- Schütze muss vorher ansagen (links/rechts) → TW übt Technik\n- Wettbewerb: Welcher TW hält die meisten von 10?',
coaching:'Nicht zu früh in eine Ecke fliegen!\nAuf den Ball schauen, nicht auf den Schützen\nBereit sein auf den Fußballen – nicht flach stehen',svg:'',tags:['Torwart','Elfmeter']},

{id:'tw13',kat:'torwart',focus:false,name:'Torwart-Staffel',kurz:'Wettbewerb-Format – Schnelligkeit, Fangen und Werfen im Staffellauf.',spieler:'4-8',feld:'20m Strecke + Tor',dauer:'10',spass:5,diff:1,
ablauf:'2 Teams. Parcours: Start → 10m Sprint → Hütchen umrunden → Trainer wirft Ball → fangen → Ball ins Mini-Tor werfen (5m) → zurück zum Start → Nächster.\n\nTeam das zuerst alle Spieler durch hat, gewinnt. Jeder muss den Ball fangen UND treffen.',
varianten:'- Rückwärts laufen statt Sprint\n- Fangen + Abrollen + Abwurf in Zielzone\n- Hindernisparcours vorher (über Hürden, durch Reifen)',
coaching:'Sauber fangen – kein Hektik-Drop!\nGenau werfen – lieber 1 Sekunde mehr nehmen\nTeamgeist: Anfeuern = Pflicht!',svg:'',tags:['Torwart','Wettbewerb','Spass']},

{id:'tw14',kat:'torwart',focus:false,name:'Wegkicken & Abrollen',kurz:'Verteilungstechnik: Situationsgerecht Ball verteilen nach Fang.',spieler:'1-4',feld:'Tor + 25m',dauer:'8',spass:3,diff:2,
ablauf:'Trainer schießt oder wirft dem TW den Ball zu – TW hält und muss sofort verteilen:\n\n1. Abrollen zum nahen Mitspieler (10m, flach)\n2. Seitlicher Abwurf zum Mitspieler am Flügel (15m)\n3. Abschlag zum Mitspieler in der Spitze (20-25m)\n\nStufe 1: Trainer ruft die Zielzone (10/15/20m-Hütchen), TW nutzt die passende Technik. Stufe 2: TW wählt Zone und Technik selbst.\n\n5 Runden à 3 Verteilungen.',
varianten:'- Mitspieler bewegen sich → TW muss richtigen anspielen\n- Gegenspieler jagt → schnelle Verteilung nötig\n- Punkte: Abrollen = 1P, Abwurf = 2P, Abschlag genau = 3P',
coaching:'Schnell verteilen → Konter starten!\nAbrollen = sicherste Option, immer zuerst prüfen\nAbschlag nur wenn wirklich jemand frei ist',svg:'',tags:['Torwart','Spieleröffnung','Verteilung']},

{id:'tw15',kat:'torwart',focus:false,name:'Chaos im Strafraum',kurz:'Spielnahes TW-Training – mehrere Schüsse, Flanken und 1gg1 im Wechsel.',spieler:'4-8',feld:'Tor + Strafraum',dauer:'10',spass:5,diff:3,
ablauf:'3 Stationen gleichzeitig aktiv:\n\nStation A: Schütze schießt aus 10m\nStation B: Flanke von der Seite → TW muss hochspringen\nStation C: 1gg1 Angreifer dribbelt rein\n\nTrainer gibt Zeichen welche Station schießt/flankt/angreift. TW weiß NICHT vorher welche. Nach 5 Aktionen wechselt der TW.\n\nHöchste Belastung – maximal 5 Min. am Stück!',
varianten:'- Stationen in schneller Folge (nur 2-3 Sek. Abstand – Chaos!)\n- TW muss nach jeder Aktion sofort Position finden\n- 2 TWs wechseln sich nach jeder Aktion ab',
coaching:'KOMMUNIZIEREN – ruf was du siehst!\nNach jeder Aktion: zurück auf Position\nMut und Entschlossenheit – du bist der Chef!',svg:'',tags:['Torwart','Spielnah','Belastung']},

// ═══════════ INDIVIDUAL-TRAINING ═══════════
{id:'ind01',kat:'individual',focus:true,name:'Dribbling-Meister (1gg0)',kurz:'Individuelles Dribbling-Training – enge Ballführung, Finte, Tempowechsel.',spieler:'1',feld:'10×10m',dauer:'10',spass:4,diff:2,
ablauf:'Spieler allein mit Ball im 10×10m Feld mit 6 Hütchen:\n\n1. Enge Ballführung um alle 6 Hütchen (2 Min.)\n2. Schere + Übersteiger an jedem Hütchen (2 Min.)\n3. Tempodribbling: langsam → Hütchen → Sprint → nächstes (2 Min.)\n4. Matthews-Trick an jedem Hütchen (2 Min.)\n5. Freestyle: Eigene Finten ausprobieren (2 Min.)',
varianten:'- Auf Zeit: Parcours so schnell wie möglich\n- Nur schwacher Fuß\n- Trainer als passiver Gegner (steht im Weg, greift nicht ein)',
coaching:'Enger Kontakt zum Ball – nicht wegschieben!\nKopf hoch zwischen den Hütchen\nFinten müssen Richtungswechsel einleiten – nicht nur Show',svg:'',tags:['Individual','Dribbling','Technik']},

{id:'ind02',kat:'individual',focus:false,name:'Passwand-Solo',kurz:'Alleine gegen die Wand – Passtechnik, Annahme, Rhythmus.',spieler:'1',feld:'Wand + 5m',dauer:'10',spass:3,diff:2,
ablauf:'Spieler steht 3-5m vor einer Wand:\n\n1. Innenseite-Pass → Annahme mit Sohle (20x rechts, 20x links)\n2. Direktes Spiel: Ball kommt zurück → sofort wieder spielen (30 Sek. Serien)\n3. Flugball: Spannstoß gegen Wand → Annahme aus der Luft (10x)\n4. Rechts passen → links annehmen, links passen → rechts annehmen (20x)\n5. Entfernung steigern: 3m → 4m → 5m',
varianten:'- Markierung an der Wand als Ziel (Trefferquote)\n- Auf Zeit: Wie viele saubere Pässe in 30 Sekunden?\n- Drehung nach Annahme einbauen',
coaching:'Standbein neben den Ball!\nBall flach und scharf spielen\nErste Berührung nach vorne – nicht stoppen',svg:'',tags:['Individual','Passspiel','Technik']},

{id:'ind03',kat:'individual',focus:false,name:'Torschuss-Intensiv',kurz:'Individuelles Schusstraining – verschiedene Techniken und Distanzen.',spieler:'1-2',feld:'Tor + 16m',dauer:'10',spass:5,diff:2,
ablauf:'10 Bälle bereit legen. Spieler schießt Serien:\n\n1. Innenseite flach ins Eck (5x links, 5x rechts)\n2. Spannstoß aus 10m (10x, Ziel: oberes Eck)\n3. Direktschuss: Trainer passt vor → sofort schießen (10x)\n4. Dribbling + Abschluss: 5m Anlauf, Hütchen umdribbeln, Schuss (10x)\n5. Schwacher Fuß: je 5x Innenseite flach und Spannstoß mit dem anderen Fuß',
varianten:'- Torwart im Tor (spielnah)\n- Schuss nach Drehung (Ball kommt von hinten)\n- Punkte: Tor = 1P, Ecke getroffen = 2P',
coaching:'Standbein fest, Oberkörper über dem Ball!\nMut zum Abschluss – nicht zögern!\nAuch schwacher Fuß muss trainiert werden',svg:'',tags:['Individual','Torschuss']},

{id:'ind04',kat:'individual',focus:false,name:'Ballgefühl-Zirkel',kurz:'Solo-Training für Ballkontrolle – Jonglieren, Rollen, Heben.',spieler:'1',feld:'3×3m',dauer:'10',spass:4,diff:2,
ablauf:'Kleiner Bereich, Spieler allein mit Ball:\n\n1. Ballhochhalten: Rechts → Links → Knie → Kopf (2 Min.)\n2. Sohlenrollen: Vorwärts/Rückwärts, Ball auf Sohle balancieren (2 Min.)\n3. V-Ziehen: Ball mit Sohle zurückziehen, Innenseite mitnehmen (2 Min.)\n4. Cruyff-Turn üben: 20x rechts, 20x links (2 Min.)\n5. Ball hochheben: Rainbow Flick oder Sohle-Roll-Lift üben (2 Min.)',
varianten:'- Rekorde aufstellen: Wie oft hochhalten ohne Bodenkontakt?\n- Musik an – zum Beat jonglieren\n- Challenge-Format: Jede Übung muss 10x sauber klappen',
coaching:'Geduld – Jonglieren braucht Übung!\nWeiche Berührungen – Ball nicht wegschlagen\nJeden Tag 5 Minuten üben = riesiger Fortschritt',svg:'',tags:['Individual','Ballgefühl','Technik']},

{id:'ind05',kat:'individual',focus:false,name:'Sprint & Wendigkeit',kurz:'Athletik-Fokus: Antritt, Richtungswechsel, Schnelligkeit.',spieler:'1',feld:'20×10m',dauer:'10',spass:4,diff:2,
ablauf:'5 Übungen mit Ball:\n\n1. 5m-Sprint mit Ball, Stopp, Richtungswechsel (6x)\n2. T-Lauf: vorwärts, seitwärts links, seitwärts rechts, rückwärts (4x)\n3. Slalom um 6 Hütchen (enge Abstände 1.5m) auf Zeit (4x)\n4. Reaktions-Sprint: Trainer klatscht → Spieler spurtet mit Ball zum nächsten Hütchen (8x)\n5. 20m Shuttle: Hin und zurück mit Ball, schnellste Zeit zählt (3x)',
varianten:'- Ohne Ball zuerst, dann mit Ball\n- Rückwärts oder seitwärts statt vorwärts\n- Wettbewerb gegen eigene Bestzeit',
coaching:'Explosiver Antritt – erste 3 Schritte entscheiden!\nTiefer Schwerpunkt beim Richtungswechsel\nBall eng am Fuß halten auch beim Sprint',svg:'',tags:['Individual','Athletik','Wendigkeit']},
{id:'ind06',kat:'individual',focus:false,name:'Schwacher-Fuß-Intensiv',kurz:'Gezieltes Training des schwachen Fußes – Pass, Schuss, Dribbling nur mit dem schwachen Fuß.',spieler:'1',feld:'10×10m + Tor + Wand',dauer:'10',spass:3,diff:3,
ablauf:'Alles NUR mit dem schwachen Fuß:\n\n1. 20× Ball gegen Wand passen und annehmen\n2. Slalom durch 6 Hütchen (4×)\n3. 10× Torschuss aus 8m – nur schwacher Fuß\n4. Dribbel-Parcours: 3 Hütchen umdribbeln, Schuss (5×)\n5. Jonglieren: Ziel 5× hintereinander mit schwachem Fuß',
varianten:'- Merkhilfe: buntes Band/Tape um den Schuh des schwachen Fußes – nur dieser darf den Ball berühren\n- Wettbewerb: Wie viele Treffer mit schwachem Fuß in 2 Min?\n- Partner-Variante: nur schwacher Fuß erlaubt',
coaching:'Geduld! Der schwache Fuß braucht 3× so viele Wiederholungen\nQualität vor Tempo – sauber vor schnell\nJeden kleinen Fortschritt loben',svg:'',tags:['Individual','Schwacher Fuß','Technik'],deficit:'f_ballkontrolle'},
{id:'ind07',kat:'individual',focus:false,name:'Kopf-hoch-Training',kurz:'Orientierung beim Dribbeln – Kopf oben halten, Umfeld scannen.',spieler:'1-2',feld:'15×15m',dauer:'10',spass:4,diff:2,
ablauf:'1. Dribbeln im Quadrat – Trainer zeigt Finger (1-5), Spieler ruft Zahl (20×)\n2. Dribbeln mit Blick auf Farbkarten – Trainer hebt Karte, Spieler ruft Farbe (15×)\n3. Dribbeln und gleichzeitig Hütchen zählen die Trainer aufstellt (5×)\n4. Partner-Variante: A dribbelt, B bewegt sich frei – A muss immer wissen wo B ist\n5. Spiel: Dribbeln + auf Kommando nächstes freies Hütchen finden (8×)',
varianten:'- Schwieriger: 2 Farben gleichzeitig merken\n- Mit Gegnerdruck: Trainer versucht Ball zu klauen\n- Rechenaufgaben während dem Dribbeln',
coaching:'Nicht auf den Ball schauen – den Ball FÜHLEN!\nKurze Blicke nach oben reichen – Scannen wie ein Radar\nBall muss eng am Fuß sein wenn der Kopf oben ist',svg:'',tags:['Individual','Wahrnehmung','Dribbling'],deficit:'f_raum'},
{id:'ind08',kat:'individual',focus:false,name:'Entscheidungstraining Solo/Pass',kurz:'Wann dribbeln, wann passen? Spielintelligenz durch Entscheidungssituationen.',spieler:'1-2',feld:'15×10m + Tore',dauer:'10',spass:4,diff:3,
ablauf:'Trainer steht als "Verteidiger" passiv im Feld:\n\n1. Trainer macht Weg FREI → Spieler muss dribbeln und schießen (5×)\n2. Trainer macht Weg ZU → Spieler muss abspielen auf Hütchen-Tor (5×)\n3. Gemischt: Trainer entscheidet spontan ob frei oder zu → Spieler muss lesen und richtig reagieren (10×)\n4. Steigerung: 2 Optionen gleichzeitig (Pass links oder rechts ODER Solo)\n5. Finale: echtes 1gg1 wo Spieler entscheidet ob Solo oder Rückpass',
varianten:'- Hütchen statt Trainer als passive Hindernisse\n- Zeitdruck: 3 Sekunden für Entscheidung\n- Belohnungssystem: richtige Entscheidung = 2 Punkte',
coaching:'LESEN vor dem Ball! Schau VOR der Annahme\nEs gibt keine falsche Entscheidung wenn du schnell entscheidest\nLieber eine klare falsche als gar keine Entscheidung',svg:'',tags:['Individual','Spielintelligenz','Entscheidung'],deficit:'f_laufweg'},
{id:'ind09',kat:'individual',focus:false,name:'Pressing-Schule 1gg1',kurz:'Richtiges Anlaufen und Pressing im 1gg1 – Winkel, Tempo, Timing.',spieler:'1-2',feld:'10×10m',dauer:'10',spass:4,diff:2,
ablauf:'1. Trockenübung: Trainer zeigt Anlaufwinkel – Spieler läuft Bogen zum "Gegner" (8×)\n2. Trainer dribbelt langsam – Spieler presst mit richtigem Winkel (6×)\n3. Pressing-Timing: Trainer hat Ball – bei schlechter Annahme sofort attackieren (6×)\n4. Pressing + Absperren: Spieler lenkt Trainer zur Seitenlinie (5×)\n5. Echtes 1gg1: Spieler muss Ball innerhalb 5 Sek. erobern (5×)',
varianten:'- Zu zweit: einer presst, einer sichert schräg dahinter\n- Pressing-Auslöser üben: nur pressen bei Rückpass/schlechter Annahme\n- Mit Wettbewerb: Wie oft erobert in 2 Min?',
coaching:'Nie frontal anlaufen – BOGEN laufen!\nLetzte 3 Meter LANGSAM – nicht vorbeirauschen\nKörper seitlich – eine Seite absperren',svg:'',tags:['Individual','Pressing','Verteidigung'],deficit:'f_umschalt'},
{id:'ind10',kat:'individual',focus:false,name:'Resilienz-Booster',kurz:'Mentales Training – Umgang mit Fehlern und Drucksituationen.',spieler:'1',feld:'beliebig',dauer:'10',spass:3,diff:2,
ablauf:'1. Absichtlich Fehler einbauen: Spieler macht Übung, Trainer sagt "Fehler!" → Spieler muss SOFORT weitermachen ohne zu stoppen (5×)\n2. Druck-Schuss: 1 Versuch, Trainer schaut demonstrativ zu und zählt laut runter (3-2-1). Egal ob Treffer: Körpersprache muss positiv bleiben (5×)\n3. Rückstands-Simulation: "Du liegst 0:2 zurück" → trotzdem volle Energie im Dribbling (3 Min)\n4. Fehler-Applaus: Nach jedem Fehler kurz klatschen ("Nächstes Mal!") → positive Routine aufbauen\n5. Abschluss: 3 Sachen nennen die heute gut waren (Selbstreflexion)',
varianten:'- Partner gibt "Druck" (klatscht, ruft)\n- Zeitdruck-Situationen\n- Video-Analyse nach dem Training',
coaching:'Fehler sind TEIL des Spiels – nicht das Ende!\nKörpersprache nach Fehler = Schlüssel\nImmer: Was mache ich NÄCHSTES MAL anders?',svg:'',tags:['Individual','Mentalität','Resilienz'],deficit:'f_resil'},
{id:'ind11',kat:'individual',focus:false,name:'Erste-Berührung-Training',kurz:'Ballmitnahme vorwärts – der wichtigste technische Aspekt für U9.',spieler:'1',feld:'15×10m',dauer:'10',spass:3,diff:2,
ablauf:'Trainer spielt Bälle aus verschiedenen Richtungen zu:\n\n1. Ball von vorne → Mitnahme nach rechts/links mit Innenseite (10×)\n2. Ball von der Seite → offene Mitnahme nach vorne (10×)\n3. Ball von hinten → Drehung + Mitnahme vorwärts (8×)\n4. Flacher Ball → Mitnahme mit Sohle und sofort Dribbling (8×)\n5. Halbhoher Ball → Oberschenkel/Brust + erster Kontakt vorwärts (6×)',
varianten:'- Mit passivem Verteidiger → Mitnahme weg vom Gegner\n- Verschiedene Ballgeschwindigkeiten\n- Ziel-Hütchen nach Mitnahme anlaufen',
coaching:'Erster Kontakt in den freien Raum – schräg nach vorne, nie zurück!\nFuß dem Ball entgegenstrecken, nicht warten\nWeiche Annahme – Ball nicht wegspringen lassen',svg:'',tags:['Individual','Technik','Ballkontrolle'],deficit:'f_ballkontrolle'},
{id:'ind12',kat:'individual',focus:false,name:'Freilauf-Training',kurz:'Sich vom Gegner lösen – Antäuschen, Richtungswechsel, Timing.',spieler:'1-2',feld:'10×10m',dauer:'10',spass:4,diff:2,
ablauf:'1. V-Lauf: Zum Trainer hin, kurz stoppen, scharf weg – Ball fordern (8×)\n2. L-Lauf: Nach links andeuten, scharf nach rechts starten (8×)\n3. Hinterlaufen: Am Partner vorbeilaufen und Ball fordern (6×)\n4. Doppel-Check: 2× Richtung andeuten, 3. Mal wirklich starten (6×)\n5. Spiel: Trainer wirft Ball nur wenn Spieler sich WIRKLICH freigelaufen hat (5×)',
varianten:'- Mit passivem Gegner der den Laufweg "bewacht"\n- Kombination aus Freilaufen + erste Berührung\n- Im echten Spielfeld mit Tor am Ende',
coaching:'Timing ist alles – NICHT zu früh starten!\nTempo-Wechsel: langsam-langsam-SCHNELL\nKommunikation: Hand zeigen, rufen, Blickkontakt',svg:'',tags:['Individual','Laufwege','Freilaufen'],deficit:'f_laufweg'},
{id:'ind13',kat:'individual',focus:false,name:'Umschalt-Blitz',kurz:'Sofortiges Reagieren auf Ballgewinn und Ballverlust.',spieler:'1-2',feld:'15×15m',dauer:'10',spass:4,diff:2,
ablauf:'1. Signal-Reaktion: Trainer ruft "ADLER!" → Spieler sprintet breit. "IGEL!" → Spieler sprintet eng zur Mitte (10×)\n2. Ball-Reaktion: Trainer verliert Ball absichtlich → Spieler muss in 3 Sek. reagieren (8×)\n3. Umschalt-Parcours: Dribbeln (offensiv) → Ball verlieren → 3 Schritte Pressing → Ball zurückgewinnen → sofort breit (5×)\n4. Gedankenübung: Spieler beschreibt laut was er tut: "Ball weg – ich presse! Ball da – ich gehe breit!" (5×)\n5. 1gg1 mit Umschalt-Pflicht: nach jedem Ballwechsel 2 Sek. richtig reagieren bevor weiter gespielt wird',
varianten:'- Ohne Ball – nur Laufwege\n- Visuelles Signal statt akustisches\n- Im Spielfeld mit echten Positionen',
coaching:'Umschalten beginnt IM KOPF – nicht in den Beinen!\nErste 2 Sekunden nach Ballwechsel sind entscheidend\nLaut denken hilft: "Ball weg – IGEL!"',svg:'',tags:['Individual','Umschalten','Taktik'],deficit:'f_umschalt'},
{id:'ind14',kat:'individual',focus:false,name:'Kommunikations-Training',kurz:'Ansagen auf dem Platz – Rufen, Zeigen, Fordern, Loben.',spieler:'1-3',feld:'15×15m',dauer:'10',spass:3,diff:1,
ablauf:'1. Rufrunde: Spieler dribbelt und ruft bei jedem Hütchen laut "HIER!", "LINKS!", "DREH!" (10×)\n2. Partner-Blind: Spieler A hat Augen zu, B dirigiert ihn nur mit der Stimme zu einem Ziel-Hütchen (3×)\n3. Anführer-Übung: Spieler positioniert Mitspieler bzw. Trainer und 2 Hütchen-„Mitspieler" laut per Zuruf, bevor er den Ball bekommt (5×)\n4. Lob-Pflicht: Nach jedem Pass dem Passgeber laut "Gut!" oder "Super!" zurufen (5 Min)\n5. Spiel-Simulation: 2gg1 – Spieler am Ball MUSS vor jeder Aktion laut sagen was er vorhat (5×)',
varianten:'- Nur Flüstern erlaubt (Nähe erzwingen)\n- Fremde Sprache: Nur mit Handzeichen kommunizieren\n- Wettbewerb: Wer ruft am meisten in 3 Min?',
coaching:'Kommunikation ist eine WAFFE – wer redet gewinnt!\nVOR dem Pass rufen, nicht danach\nAuch loben ist Kommunikation – dein Team braucht das',svg:'',tags:['Individual','Kommunikation','Teamgeist'],deficit:'f_team'},
{id:'ind15',kat:'individual',focus:false,name:'Konzentrations-Parcours',kurz:'Fokus und Aufmerksamkeit unter Ablenkung trainieren.',spieler:'1',feld:'15×10m',dauer:'10',spass:4,diff:2,
ablauf:'1. Dribbel-Rechnen: Spieler dribbelt, Trainer stellt Rechenaufgaben (10×)\n2. Farb-Hütchen: 4 Farben im Feld – Trainer ruft Farbe, Spieler muss mit Ball dahin (10×)\n3. Ablenkung: Trainer versucht Spieler mit Gespräch/Witzen abzulenken während er dribbelt (3 Min)\n4. Gedächtnis-Parcours: 5 nummerierte Hütchen aufstellen – Trainer nennt eine Reihenfolge (z.B. 3-1-4-2-5), Spieler dribbelt sie aus dem Kopf ab (3×)\n5. Doppelaufgabe: Dribbeln + Bälle zählen die Trainer rollt (5×)',
varianten:'- Musik an/aus als Signal\n- Zuschauer simulieren (Eltern klatschen/rufen)\n- Progressiv: jede Runde eine Aufgabe mehr',
coaching:'Konzentration ist ein Muskel – man kann sie trainieren!\nWenn du abgelenkt bist: Ball stoppen, kurz durchatmen, weiter\nIm Spiel: Erst orientieren, DANN handeln',svg:'',tags:['Individual','Konzentration','Kognition'],deficit:'f_coach'}

,
/* ═══════════════════════════════════════════════════════════════
   NEUE TRAININGSFORMEN — Kategorie "mindset" (8) + TW-Basics (4)
   Methodische Grundlagen: Growth Mindset (Carol Dweck), positives
   Selbstgespräch & Routinen (sportpsychologisches Fertigkeitstraining),
   Positive Psychologie (Seligman, "Three Good Things"), Plan-Do-Review
   (engl. FA Foundation Phase), Challenge-Point/gestufte Anforderung,
   Fehlerkultur & implizites Lernen (Horst Wein / Spielintelligenz),
   DFB-Trainingsphilosophie (Spielen lassen, Erfolgserlebnisse für alle,
   TW-Rotation im Kinderfußball).
   Einfügen: ans ENDE des TRAININGSFORMEN-Arrays (vor dem "];").
   svg:'' ist zulässig — 40 Bestandsformen haben ebenfalls kein SVG.
═══════════════════════════════════════════════════════════════ */

{
  id:'tf093',kat:'mindset',focus:true,
  name:'Die Kraft des NOCH',
  kurz:'Growth-Mindset-Ritual nach Dweck: "Kann ich nicht" wird zu "Kann ich NOCH nicht". Fehler = Lernschritt.',
  spieler:'beliebig',feld:'als Regel in jeder Übung',dauer:'als Regel',
  spass:4,diff:1,
  ablauf:'Teamregel einführen: Wer "kann ich nicht" sagt, hängt ein lautes "NOCH" dran – das ganze Team ruft mit. Der Trainer macht es konsequent vor ("Das klappt NOCH nicht – gleich probieren wir es anders").\n\nIn jeder Übung gibt es ein bewusst schwieriges Element (z. B. schwacher Fuß, neue Finte). Gelobt wird der VERSUCH und der Fortschritt, nie nur das Ergebnis.\n\nWissenschaftlicher Hintergrund für Trainer: Growth Mindset (Carol Dweck) – Kinder, die Fähigkeiten als entwickelbar erleben, trauen sich mehr zu und geben seltener auf.',
  varianten:'- "NOCH-Zähler": Team sammelt gemeinsam 10 laute NOCHs pro Training\n- Trainer erzählt eigene "Konnte-ich-früher-nicht"-Geschichte\n- Nach dem Training: Jedes Kind nennt eine Sache, die es heute zum ersten Mal geschafft oder probiert hat',
  coaching:'Lobe Anstrengung und Mut, nicht Talent ("Stark, wie oft du es probiert hast!")\nNie zwei Kinder vergleichen – nur mit dem eigenen Gestern\nFehler laut normalisieren: "Super Fehler – daran sieht man, dass du dich traust!"',
  svg:'',tags:['mindset']
},
{
  id:'tf094',kat:'mindset',focus:true,
  name:'Mut-Leiter 1gg1',
  kurz:'Kinder wählen ihr Schwierigkeits-Level selbst (1–3). Erfolg = eine Stufe hoch. Selbstwirksamkeit erleben.',
  spieler:'4–10',feld:'3 Felder (Level 1+2: 12×10m, Level 3 enger: 10×8m)',dauer:'10–12',
  spass:5,diff:1,
  ablauf:'Drei nebeneinanderliegende 1gg1-Felder mit Minitoren: Level 1 (Verteidiger geht nur halbes Tempo), Level 2 (normal), Level 3 (Verteidiger darf sofort attackieren, engeres Feld). Jedes Kind wählt VOR jedem Durchgang selbst sein Level.\n\nRegel: Wer auf seinem Level ein Tor macht, DARF (muss nicht) eine Stufe hochgehen. Wer verliert, darf bleiben oder runtergehen – ohne Kommentar.\n\nHintergrund: Gestufte Anforderung (Challenge Point) – Selbstvertrauen wächst durch selbstgewählte, knapp machbare Herausforderungen, nicht durch Überforderung.',
  varianten:'- Level über Hütchenfarben markieren (grün/gelb/rot)\n- Level 4 als "Boss-Level": 1gg1 gegen den Trainer\n- Gleiche Logik mit Torschuss-Distanzen statt Gegnerdruck',
  coaching:'Kein Kind auf ein Level schieben – die Wahl gehört dem Kind\n"Welches Level fühlt sich heute richtig an?"\nHochgehen feiern, Runtergehen neutral behandeln',
  svg:'',tags:['mindset']
},
{
  id:'tf095',kat:'mindset',focus:true,
  name:'Reset-Knopf',
  kurz:'Feste Mini-Routine nach jedem Fehler: Atmen – Klatschen – "Weiter!". Emotionsregulation als Teamregel.',
  spieler:'beliebig',feld:'als Regel in Spielformen',dauer:'als Regel',
  spass:4,diff:1,
  ablauf:'Gemeinsam eine 2-Sekunden-Routine einüben: Nach einem Fehler (Fehlpass, Gegentor, verlorenes 1gg1) macht das Kind EINEN tiefen Atemzug, klatscht einmal in die Hände und ruft "Weiter!". Danach ist der Fehler "gelöscht".\n\nErst trocken üben (Trainer ruft "Fehler!", alle machen den Reset), dann in jeder Spielform als Regel. Der Trainer zählt gelungene Resets laut mit und feiert sie wie Tore.\n\nHintergrund: Routinen zur Emotionsregulation aus dem sportpsychologischen Fertigkeitstraining – kindgerecht verkürzt. Ziel: hängende Köpfe verhindern, Umschalten auf die nächste Aktion.',
  varianten:'- Team-Reset: Nach Gegentor macht das GANZE Team den Reset gemeinsam\n- Mitspieler dürfen einen hängenden Kopf mit "Reset!" erinnern\n- Reset-Champion des Tages: Wer schaltet am schnellsten wieder um?',
  coaching:'Selbst vorleben – auch der Trainer macht nach eigenem Fehler den Reset\nNie den Fehler kommentieren, nur den gelungenen Reset loben\nVerknüpfung zum Quiz-Thema Umschalten: "Im Kopf umschalten wie auf dem Feld"',
  svg:'',tags:['mindset']
},
{
  id:'tf096',kat:'mindset',focus:true,
  name:'Gute-Dinge-Kreis',
  kurz:'Abschlussritual: Jedes Kind nennt eine Sache, die einem MITSPIELER heute gut gelungen ist.',
  spieler:'alle',feld:'Abschlusskreis',dauer:'5',
  spass:4,diff:1,
  ablauf:'Zum Trainingsende Kreis bilden. Reihum nennt jedes Kind EINE Sache, die einem Mitspieler (nicht sich selbst!) heute gut gelungen ist – konkret ("Du hast mir zweimal super aufgelegt"), nicht allgemein ("alle waren gut").\n\nDer Trainer beginnt und macht die Konkretheit vor. Wer nicht mag, darf passen – meist mag nach zwei Wochen niemand mehr passen.\n\nHintergrund: "Three Good Things" aus der Positiven Psychologie (Seligman), auf Team-Ebene gedreht: schult Wahrnehmung der Mitspieler, baut Sozialklima und Selbstvertrauen der Genannten auf.',
  varianten:'- Trainer notiert die Nennungen in der App (Team-Pinnwand) – über die Saison entsteht ein Stärken-Archiv\n- Themen-Kreis: heute nur Dinge OHNE Ball (Laufen, Anfeuern, Helfen)\n- Eltern-Version beim Saisonabschluss',
  coaching:'Konkret einfordern: Was genau? Wann genau?\nDarauf achten, dass über Wochen JEDES Kind mehrfach genannt wird – stille Kinder ggf. selbst nennen\nKurz halten – 5 Minuten, kein Stuhlkreis-Marathon',
  svg:'',tags:['mindset']
},
{
  id:'tf097',kat:'mindset',focus:false,
  name:'Kapitän des Tages',
  kurz:'Rotierendes Kapitänsamt: führt Aufwärmen an, gibt eine Team-Ansage, sagt den Schlusskreis an.',
  spieler:'alle',feld:'gesamtes Training',dauer:'als Rolle',
  spass:4,diff:1,
  ablauf:'Jedes Training ist ein anderes Kind "Kapitän des Tages" (feste Rotationsliste – JEDES Kind kommt dran, nicht nur die Lauten). Aufgaben: Aufwärmspiel mit ansagen, beim Teamkreis eine Ansage machen ("Heute machen wir das Feld groß!"), Schlusskreis eröffnen, Material mit einsammeln.\n\nDer Trainer bespricht die Ansage vorher kurz mit dem Kapitän (2 Sätze reichen).\n\nHintergrund: Verantwortungsrotation aus der Plan-Do-Review-Praxis des englischen Verbands – Führungserfahrung und Sprechen vor der Gruppe für ALLE, gerade für zurückhaltende Kinder in geschütztem Rahmen.',
  varianten:'- Kapitänsbinde als sichtbares Symbol\n- Kapitän wählt das Abschlussspiel aus zwei Optionen\n- Doppel-Kapitäne: ein lautes + ein leises Kind gemeinsam',
  coaching:'Zurückhaltende Kinder besonders vorbereiten, nie vorführen\nAnsage des Kapitäns immer aufgreifen und verstärken\nAm Ende: "Was hat dir als Kapitän Spaß gemacht?"',
  svg:'',tags:['mindset']
},
{
  id:'tf098',kat:'mindset',focus:false,
  name:'Druck-Elfer mit Jubelpflicht',
  kurz:'Elfmeter mit Publikum und Countdown – danach jubelt IMMER das ganze Team. Druck spielerisch erleben.',
  spieler:'6–13',feld:'Strafraum',dauer:'10',
  spass:5,diff:2,
  ablauf:'Elfmeterschießen mit inszeniertem Druck: Ein Kind steht als TW im Tor (rotiert nach jeder Runde), alle übrigen Kinder stehen als "Publikum" hinter dem Tor, zählen laut von 5 runter, dann erst darf geschossen werden. Nach JEDEM Schuss – Tor oder nicht – jubelt das komplette Team für den Schützen (Jubelpflicht!).\n\nJedes Kind schießt mehrfach. Wer mag, darf sich vorher ein "Jubel-Ritual" für sein Tor überlegen.\n\nHintergrund: Spielerische Druckgewöhnung (pressure inoculation) – Kinder erleben Anspannung in sicherem Rahmen und lernen: Auch Fehlschuss ist okay, das Team steht hinter mir.',
  varianten:'- TW rotiert – jeder hält mal (passt zur TW-Rotation)\n- Steigerung: Publikum darf leise Geräusche machen (kein Auslachen – Regel!)\n- "Finale": letzter Schütze entscheidet ein fiktives Pokalfinale',
  coaching:'Jubelpflicht konsequent durchsetzen – gerade nach Fehlschüssen\nVorher thematisieren: "Kribbeln im Bauch ist normal – das haben Profis auch"\nKein Kind zum Schießen zwingen, aber jedes ermutigen',
  svg:'',tags:['mindset']
},
{
  id:'tf099',kat:'mindset',focus:false,
  name:'Fehler-Festival',
  kurz:'Mutige VERSUCHE zählen doppelt so viel wie Tore: Finten und schwacher Fuß bringen 2 Punkte – egal ob sie klappen.',
  spieler:'6–12',feld:'20×15m',dauer:'10–12',
  spass:5,diff:1,
  ablauf:'Normale Spielform 3gg3 auf Minitore – aber die Punktwertung wird umgedreht: 1 Punkt für jedes Tor, 2 Punkte für jeden VERSUCH einer Finte im 1gg1 (egal ob sie klappt), 2 Punkte für jeden Abschluss mit dem schwachen Fuß (egal ob Tor). Bei mehr als 6 Kindern ein zweites Feld aufbauen oder 4gg4 mit gleicher Wertung spielen.\n\nDer Trainer ruft die Bonus-Punkte laut aus ("Zwei Punkte – mutige Finte!").\n\nHintergrund: Fehlerkultur & implizites Lernen (Horst Wein) – kreative Lösungen entstehen nur, wenn Fehler nichts kosten. Die Wertung macht Mut messbar und sichtbar.',
  varianten:'- Bonus-Aktion der Woche wechseln (Übersteiger, Ausguck vor Ballannahme, Steilpass)\n- Kinder schlagen selbst vor, was heute Bonuspunkte gibt\n- "Straßenkicker-Modus": nur Tore nach Finte zählen',
  coaching:'Versuche wirklich lauter feiern als Tore\nNie eine misslungene Finte korrigieren – nur den Mut loben, Technik separat üben\nVerbindung zum Profil: zahlt direkt auf Dribbling & Selbstvertrauen ein',
  svg:'',tags:['mindset']
},
{
  id:'tf100',kat:'mindset',focus:false,
  name:'Ich-schaff-das-Kommentator',
  kurz:'Kinder kommentieren die eigene Aktion laut und positiv. Positives Selbstgespräch spielerisch verankern.',
  spieler:'4–13',feld:'Dribbelparcours',dauer:'6–8',
  spass:4,diff:1,
  ablauf:'Dribbelparcours (Slalom, Wende, Torschuss). Regel: Jedes Kind kommentiert seinen eigenen Lauf laut wie ein TV-Kommentator – aber nur POSITIV ("Und er zieht am ersten Hütchen vorbei... was für ein Tempo... er schießt... KNAPP daneben, aber was für ein Versuch!").\n\nDer Trainer macht einen übertriebenen Beispiel-Lauf vor. Lachen ist ausdrücklich erwünscht.\n\nHintergrund: Positives Selbstgespräch (Self-Talk) aus dem sportpsychologischen Fertigkeitstraining – über die Kommentator-Rolle kindgerecht und ohne Peinlichkeit eingeführt.',
  varianten:'- Partner-Kommentator: Kinder kommentieren sich gegenseitig (nur positiv!)\n- Flüster-Modus: Selbstgespräch nur noch leise für sich – Transfer Richtung Spiel\n- "Ich schaff das"-Satz vor schwierigen Stationen fest einbauen',
  coaching:'Negative Selbstkommentare sofort spielerisch umdrehen lassen\nZiel benennen: "Was du dir selbst sagst, hören deine Beine mit"\nTransfer ansprechen: den Satz auch im Spiel vor einem Elfer nutzen',
  svg:'',tags:['mindset']
},

/* ── TW-Basics (Ergänzung Kategorie torwart – spielerisch & rotierend gem. DFB-Kinderfußball) ── */
{
  id:'tf101',kat:'torwart',focus:true,
  name:'W-Haltung & Korbfangen',
  kurz:'Die zwei Grund-Fangtechniken: W-Griff für hohe, Korb für flache Bälle. Fundament vor allem anderen.',
  spieler:'1–4',feld:'8×8m',dauer:'8',
  spass:3,diff:1,
  ablauf:'Basics ohne Tor: Trainer/Partner wirft aus 3–4m zu. Hohe Bälle: beide Hände hinter den Ball, Daumen und Zeigefinger bilden ein "W", Ellbogen leicht gebeugt, Ball vor dem Gesicht fangen. Flache/halbhohe Bälle: "Korb" – Handflächen nach oben, Ball in Bauch/Brust einrollen, Oberkörper drüber.\n\nErst aus dem Stand, dann nach einem Sidestep, dann nach Ansage ("hoch!"/"tief!") ohne Vorwarnung.\n\nJede Fangserie mit klarem Erfolgsziel (z. B. 5 saubere W-Fänge in Folge).',
  varianten:'- Softball/leichterer Ball für den Einstieg (Angstabbau)\n- Partner wirft abwechselnd hoch/tief – TW ruft die Technik laut an ("W!" / "Korb!")\n- Wettbewerb: Wer schafft die längste fehlerfreie Serie?',
  coaching:'Daumen zusammen beim W – sonst rutscht der Ball durch\nBall immer VOR dem Körper fangen, nicht neben sich\nLaut mitrufen lassen – Technik-Name verankert die Bewegung',
  svg:'',tags:['torwart']
},
{
  id:'tf102',kat:'torwart',focus:true,
  name:'TW-Fußarbeit-Sterne',
  kurz:'Sidesteps und kurze Antritte in Sternform – die Beinarbeit, die vor jeder Parade kommt.',
  spieler:'1–4',feld:'6×6m',dauer:'6–8',
  spass:4,diff:1,
  ablauf:'Vier Hütchen als Stern um ein Mittelhütchen (je 2–3m). TW startet in Grundposition am Mittelhütchen. Trainer zeigt auf ein Hütchen: TW bewegt sich mit SIDESTEPS (nicht überkreuzen!) dorthin, tippt es an, zurück zur Mitte, sofort wieder Grundposition.\n\nSteigerung: Nach dem Rückweg wirft der Trainer sofort einen Ball – Fußarbeit und Fangen verbinden.\n\nKurze Serien (20–30 Sekunden), dafür mehrere Durchgänge – Qualität vor Ermüdung.',
  varianten:'- Farben statt Zeigen: Trainer ruft Hütchenfarbe\n- Zwei TW im Duell: Wer tippt zuerst an und steht zuerst wieder bereit?\n- Mit Ball in den Händen laufen (Ballgewöhnung nebenbei)',
  coaching:'Füße nie überkreuzen – kleine, schnelle Sidesteps\nNach JEDER Bewegung sofort Grundposition (Knie gebeugt, Hände vor)\nBlick bleibt vorne beim Trainer, nicht auf den Füßen',
  svg:'',tags:['torwart']
},
{
  id:'tf103',kat:'torwart',focus:false,
  name:'Purzelbaum-Parade',
  kurz:'Fallen ohne Angst: vom Purzelbaum über seitliches Abrollen zum ersten Hechten. Vorstufe zur Fallschule.',
  spieler:'1–4',feld:'weicher Rasen / Matte',dauer:'8',
  spass:5,diff:1,
  ablauf:'Angstfreies Heranführen ans Fallen, bevor die eigentliche Fallschule (siehe "Fallschule Rechts-Links") beginnt: 1) Purzelbäume und seitliches Rollen frei auf weichem Boden. 2) Aus dem Kniestand seitlich auf die "Fallseite" (Oberschenkel–Hüfte–Schulter) abkippen und einen ruhig gehaltenen Ball dabei festhalten. 3) Aus der Hocke, dann aus dem Stand. 4) Erst dann: Trainer rollt Bälle seitlich an.\n\nJede Stufe erst verlassen, wenn sie sich für das Kind gut anfühlt – Level-Wahl wie bei der Mut-Leiter.',
  varianten:'- "Kartoffelsack-Rollen" als Aufwärmspiel für alle Feldspieler (Fallen ist Grundmotorik!)\n- Ball wird erst spät dazugenommen – zuerst nur die Bewegung\n- Auf Weichbodenmatte in der Halle beginnen, dann Rasen',
  coaching:'Nie über den Arm/Ellbogen abstützen – seitlich über Oberschenkel und Hüfte abrollen\nAngst ernst nehmen, Stufen individuell – kein Gruppendruck\nFallen als Spiel verkaufen, nicht als Pflicht',
  svg:'',tags:['torwart']
},
{
  id:'tf104',kat:'torwart',focus:false,
  name:'Jeder-ist-mal-TW-Runde',
  kurz:'Torschussspiel mit rotierendem Torwart – alle Kinder sammeln TW-Erfahrung (DFB-Empfehlung F-Jugend).',
  spieler:'6–13',feld:'Strafraum + 1 Jugendtor',dauer:'10–12',
  spass:5,diff:1,
  ablauf:'Torschusswettbewerb, bei dem JEDES Kind reihum 4–5 Schüsse lang im Tor steht (Handschuhe/Leibchen wandern mit). Schützen dribbeln vom Mittelhütchen an und schließen ab; der TW sammelt Punkte für jede Parade, die Schützen für Tore.\n\nDer DFB empfiehlt für die F-Jugend ausdrücklich, dass alle Kinder Feld- UND Torwarterfahrung sammeln – die Rotation gehört fest ins Training, nicht nur die üblichen zwei, drei Kinder ins Tor.',
  varianten:'- TW darf nach Parade sofort per Abwurf einen Konter auf ein Minitor einleiten (Aufbau-Basics nebenbei)\n- Zwei Tore, zwei rotierende TW, zwei Gruppen – doppelte Schussfrequenz\n- "TW-Punkte zählen doppelt"-Runde: macht die TW-Rolle attraktiv',
  coaching:'W-Haltung und Korb aus den Basics einfordern – kurze Erinnerung pro Kind\nParaden genauso laut feiern wie Tore\nBeobachten: Wem macht das Tor Spaß? (Kandidaten für die TW-Rotation)',
  svg:'',tags:['torwart']
},
{
  id:'tf105',kat:'raute',focus:true,
  name:'Diamanten-Jagd',
  kurz:'4gg1/4gg2 im Viereck – die vier Rauten-Positionen halten, nach dem Pass sofort rotieren.',
  spieler:'5–6',feld:'12×12m',dauer:'10–12',
  spass:4,diff:2,
  ablauf:'Vier Spieler bilden im Viereck die Raute (Zentrum/Aufpasser, Flitzer L, Flitzer R, Spitze/Jäger), 1–2 Balljäger in der Mitte versuchen den Ball zu erobern. Die vier halten ihre Positionen und lassen den Ball durch die Reihen laufen.\n\nKernregel: Wer den Ball spielt, muss sofort einen ANDEREN Rauten-Punkt besetzen (Rotation) – so lernen die Kinder, dass Positionen Aufgaben sind, keine festen Plätze.\n\nKommando: "Raute halten!" wenn die Form zusammenfällt.',
  varianten:'- Nur Direktpass erlaubt (höheres Tempo)\n- Bei Balleroberung tauschen Balljäger und Fehlpassgeber\n- 4gg2 für mehr Druck, sobald 4gg1 sitzt',
  coaching:'Nach dem Pass NICHT stehen bleiben – sofort neuen Punkt besetzen!\nAbstände halten: die Raute soll immer erkennbar sein\nKopf hoch vor dem Pass – wo ist der freie Punkt?',
  svg:'',tags:['raute','passspiel']
},
{
  id:'tf106',kat:'passspiel',focus:true,
  name:'Zwei-Tore-Umschalten',
  kurz:'4 gegen 4 auf je zwei weit außen stehende Minitore pro Grundlinie (ohne Torwart) – das Spiel über die Flitzer breit machen.',
  spieler:'8–10',feld:'30×20m',dauer:'12–15',
  spass:5,diff:2,
  ablauf:'4 gegen 4 auf Minitore (ohne Torwart; je Team die Rauten-Rollen: Aufpasser, Flitzer links/rechts, Jäger), aber statt eines zentralen Tores stehen auf jeder Grundlinie ZWEI kleine Minitore ganz weit außen an den Linien. Zentral durch die Mitte gibt es kein Tor – das Team muss das Spiel bewusst über die Flitzer auf die Außenbahnen verlagern.\n\nSo wird das "Feld groß machen" direkt belohnt: nur wer breit spielt, kommt zum Abschluss.',
  varianten:'- Tor zählt doppelt nach Seitenverlagerung (Ball war auf beiden Außen)\n- Ein Minitor je Seite sperren = Fokus auf eine starke Außenbahn\n- Aufpasser darf nicht über die Mittellinie = klare Absicherung\n- Bei 9–10 Kindern: Wechsler rotieren nach jedem Tor ein',
  coaching:'Flitzer BREIT an die Linie – nicht in die Mitte ziehen!\nSchau nach dem Ballgewinn sofort zur schwächer besetzten Seite\nDer Aufpasser sichert zentral ab, während außen angegriffen wird',
  svg:'',tags:['passspiel','raute']
},
{
  id:'tf107',kat:'aufwaermen',focus:false,
  name:'Chaos-Dribbling mit Kommando',
  kurz:'Alle dribbeln kreuz und quer – auf Farbkommando schnell durch das passende Hütchentor.',
  spieler:'6–13',feld:'20×20m',dauer:'6–8',
  spass:5,diff:1,
  ablauf:'Alle Kinder dribbeln mit Ball frei durch das Feld (Chaos, aber Köpfe hoch, keine Zusammenstöße). Am Rand stehen mehrere farbige Hütchentore. Der Trainer ruft eine Farbe – alle müssen so schnell wie möglich mit Ball durch ein Tor dieser Farbe dribbeln und dann weiter im Chaos.\n\nSchult Orientierung, Reaktion und Ballkontrolle unter Zeitdruck – ideale Aktivierung für den kognitiven Aufpasser/Umschalt-Teil.',
  varianten:'- Zwei Farben gleichzeitig rufen (Priorisieren)\n- Nummern statt Farben\n- Letzter durchs Tor macht eine kleine Zusatzaufgabe (spielerisch)',
  coaching:'Kopf hoch beim Dribbeln – wo ist das nächste freie Tor?\nErst orientieren, DANN losdribbeln\nBall eng am Fuß im Gewühl',
  svg:'',tags:['aufwaermen','wahrnehmung']
}
];

/* ── Skizzen-Generator ────────────────────────────────────────────────
   55 Übungen kamen ohne Feld-Skizze. Statt 55 handgeschriebener SVGs erzeugt
   _skz() sie aus kompakten Specs – im exakt gleichen Stil wie die 52 bestehenden
   Inline-SVGs (viewBox 280×180, Feld #2d6a2d, Spieler grün/rot, Hütchen gelb).
   Legende: z=Zonen, tor=[x,y,'h'|'v',breite], h=Hütchen[x,y,farbe], leiter, wand,
   p=Pfeil[x1,y1,x2,y2,typ p(ass)|l(auf)|s(chuss)|d(ribbling)], s=Spieler[x,y,farbe,label],
   b=Ball, tx=Text. Farben: g=grün(eigene) r=rot(Gegner/Fänger) b=blau(TW) w=weiß(Trainer).
   v512: Die vier Pfeil-Typen waren alle weiß und nur am Strichmuster zu unterscheiden – auf
   280 Pixel Breite am Handy sind gestrichelt und gepunktet kaum zu trennen. Jeder Typ hat
   jetzt zusätzlich seine Farbe; das Muster bleibt, Farbe ist also nie der einzige
   Bedeutungsträger. Jede Farbe steht mindestens 3:1 gegen den Rasen #2d6a2d (Prüfung v512).
   Der Pfeilkopf braucht je Typ einen eigenen Marker – ein gemeinsamer trüge sonst überall
   dieselbe Farbe. */
/* v518 – Übungs-Reihen: eine Dach-Übung und die Stufen, aus denen sie besteht.
   „Warm up Adler“ ist ein Einlaufprogramm in vier Stufen ohne Umbau; die Stufen liegen als
   eigene Übungen mit eigener Skizze in der Datenbank. Die Zuordnung steht hier im Code und
   nicht in der Datenbank, weil der Abgleich bestehende Einträge nie überschreibt – ein
   nachträgliches Feld in bibliothek.json käme bei niemandem an, der die Übung schon hat.
   Verknüpft wird über den NAMEN; fehlt eine Stufe, wird sie einfach weggelassen. */
const UEB_REIHEN={
  "Warm up Adler":["Adler 1 – Aktivierung","Adler 2 – Dribbelstaffel","Adler 3 – Passen mit Klatschen","Adler 4 – Passen und Torschuss"]
};
const SKZ_PFEIL={p:'#ffffff',l:'#fde047',s:'#fca5a5',d:'#7dd3fc'};
const SKZ_PFEIL_NAME={p:'Pass',l:'Laufweg',s:'Schuss',d:'Dribbling'};
/* v555 – Zwei Rasenvarianten. Dunkel ist die geprüfte Fassung aus v512/v517 und bleibt
   der Standard; hell kam für die Sonne am Platz und die Besprechung am Tablet dazu.
   Der EINZIGE Unterschied ist die Palette: gezeichnet wird Zug für Zug dasselbe, und
   ohne zweites Argument entsteht Zeichen für Zeichen dieselbe Ausgabe wie vorher —
   `tests/checks/v555-skizze-praesentation.js` vergleicht alle 95 Skizzen dagegen.

   Gemessene Kontraste gegen den hellen Rasen #cfe8cf (Grafik mindestens 3:1):
   Spieler grün 3,84 · rot 6,37 · blau 5,14 · gelb 6,65 · neutral 5,81; das weiße
   Kürzel darauf 5,02 bis 8,67 (Text mindestens 4,5:1). Pass 13,60 · Laufweg 3,77 ·
   Schuss 3,70 · Dribbling 4,55 · Schusszone 3,85 · Mittellinie 5,79 · Tor 11,25 ·
   Beschriftung 13,60 · Rasenrand 3,68.

   Laufweg und gelber Spieler liegen im hellen Satz farblich nah beieinander (1,76).
   Unterschieden werden sie über die Form — gestrichelte Linie gegen gefüllten Kreis,
   genau wie die Legende es zeigt. Farbe ist auch hier nicht der einzige Träger. */
const SKZ_DUNKEL={
  rasen:'#2d6a2d',rasenRand:'#1a4a1a',innen:'rgba(255,255,255,.25)',
  zoneF:'rgba(255,255,255,.07)',zoneS:'rgba(255,255,255,.35)',
  mittel:'rgba(255,255,255,.7)',sz:'#fbbf24',
  tor:'#fff',torFuell:'rgba(255,255,255,.25)',leiter:'rgba(255,255,255,.6)',wand:'#d1d5db',
  F:{g:'#4ade80',r:'#f87171',b:'#60a5fa',y:'#fbbf24',w:'#fff'},
  spielerRand:'rgba(0,0,0,.3)',kuerzel:'rgba(0,0,0,.65)',huetchenRand:'rgba(0,0,0,.25)',
  /* v598 (PO 22.09.): „Der Ball sollte … grundsätzlich als schwarzer Kreis dargestellt
     werden." Schwarz allein trägt auf dem dunklen Rasen nicht — #111827 kommt dort auf
     2,71:1, unter den 3:1 aus CLAUDE.md. Die Erkennbarkeit trägt deshalb der weiße Rand
     (6,54:1 gegen den Rasen, 17,74:1 gegen die Füllung), so wie der Spielerkreis seinen
     Rand hat. Nebenbei behebt das einen echten Fehler: der bisher weiße Ball kam auf dem
     HELLEN Rasen auf 1,30:1 und war dort nur an seiner Kontur zu erahnen. */
  ball:'#111827',ballRand:'#ffffff',text:'rgba(255,255,255,.85)',pfeil:SKZ_PFEIL,marke:'arr-',
  nrFuell:'rgba(0,0,0,.6)'
};
const SKZ_HELL={
  rasen:'#cfe8cf',rasenRand:'#4f7d4f',innen:'rgba(17,24,39,.3)',
  zoneF:'rgba(17,24,39,.05)',zoneS:'rgba(17,24,39,.4)',
  mittel:'#4b5563',sz:'#b45309',
  tor:'#1f2937',torFuell:'rgba(31,41,55,.2)',leiter:'rgba(31,41,55,.55)',wand:'#4b5563',
  F:{g:'#15803d',r:'#991b1b',b:'#1d4ed8',y:'#713f12',w:'#475569'},
  spielerRand:'rgba(255,255,255,.8)',kuerzel:'rgba(255,255,255,.95)',huetchenRand:'rgba(17,24,39,.35)',
  ball:'#111827',ballRand:'#ffffff',nrFuell:'rgba(255,255,255,.9)',text:'rgba(17,24,39,.9)',
  pfeil:{p:'#111827',l:'#a16207',s:'#dc2626',d:'#0369a1'},marke:'arrh-'
};
/* Eigene Marker-Kennungen je Variante: Marker sind im Dokument global. Lägen beide
   Varianten unter derselben id, färbte die zuletzt gezeichnete die Pfeilspitzen der
   anderen um – und im Präsentationsmodus liegen sie gleichzeitig auf der Seite. */
function skzPalette(hell){ return hell?SKZ_HELL:SKZ_DUNKEL; }
/* v557 – Schritte: eine Skizze kann mehrere Bilder haben. Eine Übung hat fast immer
   drei Momente – Aufbau, Pass, Abschluss –, und bisher mussten sie alle gleichzeitig in
   ein Bild. „Dreieckspassen mit Abschluss" zeigte fünf Pfeile auf einmal; ein Kind liest
   daraus keinen Ablauf.

   Der AUFBAU (Zonen, Tore, Linien, Hütchen, Leitern, Wände) steht nur in der
   Grundbeschreibung und gilt für alle Bilder – er wird ja auch am Platz nicht umgebaut.
   Beweglich sind Spieler, Ball, Pfeile und Beschriftung. Was ein Schritt nicht nennt,
   gilt aus dem Bild davor weiter; so wiederholt niemand Pfeile, die sich nicht ändern.

   Ohne `schritte` und ohne `opt.bild` ändert sich an der Ausgabe nichts. */
const SKZ_BEWEGLICH=["s","b","p","tx"];
const SKZ_SCHRITTE_MAX=6;                 // 7 Bilder – mehr ist keine Übung mehr, sondern ein Film
function skzBildZahl(spec){
  const st=(spec&&Array.isArray(spec.schritte))?spec.schritte.length:0;
  return 1+Math.min(SKZ_SCHRITTE_MAX,st);
}
function _skzBild(spec,n){
  const bis=Number(n)||0;
  if(!spec||!Array.isArray(spec.schritte)||!spec.schritte.length||bis<=0)return spec;
  const aus={};
  Object.keys(spec).forEach(k=>{ if(k!=="schritte")aus[k]=spec[k]; });
  const max=Math.min(spec.schritte.length,SKZ_SCHRITTE_MAX,bis);
  for(let i=0;i<max;i++){
    const st=spec.schritte[i]||{};
    SKZ_BEWEGLICH.forEach(k=>{ if(Array.isArray(st[k]))aus[k]=st[k]; });
  }
  return aus;
}
/* v558 – Zwischenbild für das Abspielen. Aus zwei fertigen Bildern entsteht der Stand
   dazwischen: Spieler und Ball wandern, alles andere kommt aus dem ersten der beiden.
   Die Pfeile bleiben also stehen, solange die Bewegung läuft, und wechseln erst mit dem
   Ankommen – so sieht man, WAS gerade passiert, während es passiert.
   Bei t = 0 entsteht Zeichen für Zeichen dasselbe wie ohne Überblendung. */
function _skzZwischen(a,b,t){
  if(!a)return b; if(!b)return a;
  const f=Math.max(0,Math.min(1,Number(t)||0));
  const rund=v=>Math.round(v*10)/10;
  const misch=(x,y)=>(x||[]).map((e,i)=>{
    const z=(y||[])[i];
    if(!z||!Array.isArray(e))return e;
    const k=e.slice();
    k[0]=rund(e[0]+(z[0]-e[0])*f);
    k[1]=rund(e[1]+(z[1]-e[1])*f);
    return k;
  });
  return Object.assign({},a,{s:misch(a.s,b.s),b:misch(a.b,b.b)});
}
/* v581 – DIE GRENZE ZWISCHEN EINER FREMDEN BESCHREIBUNG UND DEM BILD

   Eine Skizzen-Beschreibung kann von außen kommen: aus der Edge Function `ki-uebung`, aus
   einer Übung der Bibliothek, künftig aus einem Diktat. `_skz` setzt ihre Zahlen ohne
   Rückfrage in ein SVG – hier ist deshalb die Stelle, an der alles Unbekannte hängenbleibt.

   Geprüft wird streng und still: bekannte Listen, Zahlen auf das Feld geklemmt, Texte
   gekürzt und von spitzen Klammern befreit, Farben nur aus dem Farbsatz. Was nicht passt,
   fällt weg – eine halbe Skizze ist besser als eine, die aus dem Bild ragt oder fremdes
   Markup mitbringt.

   Die Edge Function prüft dasselbe noch einmal auf ihrer Seite. Zwei Prüfungen sind hier
   kein Aufwand, sondern der Sinn der Sache: die App darf sich nicht darauf verlassen, dass
   die Antwort von dort kommt, die sie erwartet. */
function skzSpecSaeubern(spec){
  if(!spec||typeof spec!=="object"||Array.isArray(spec))return null;
  const hoch=spec.hoch===true, B=hoch?SKZ_HOCH_B:SKZ_QUER_B, H=hoch?SKZ_HOCH_H:SKZ_QUER_H;
  const zahl=(v,min,max)=>{ const n=Number(v); return isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):null; };
  const x=v=>zahl(v,2,B-2), y=v=>zahl(v,2,H-2);
  const farbe=(v,erlaubt,vorgabe)=>(typeof v==="string"&&erlaubt.includes(v))?v:vorgabe;
  const text=(v,n)=>String(v==null?"":v).replace(/[<>&"']/g,"").slice(0,n);
  const liste=(v,fn,max)=>Array.isArray(v)?v.slice(0,max).map(fn).filter(e=>e!==null):[];
  const punkt=(e,rest)=>{ const a=x(e&&e[0]), b=y(e&&e[1]); return (a===null||b===null)?null:[a,b].concat(rest?rest(e):[]); };
  const strecke=(e,rest)=>{ const a=x(e&&e[0]), b=y(e&&e[1]), c=x(e&&e[2]), d=y(e&&e[3]);
                            return (a===null||b===null||c===null||d===null)?null:[a,b,c,d].concat(rest?rest(e):[]); };
  const F="grbyw", GER=["stange","teller","huerde","depot","ring","dummy","trainer"];
  const aus={};
  if(hoch)aus.hoch=true;
  aus.h=liste(spec.h,e=>punkt(e,e=>[farbe(e[2],F,"y")]),24);
  aus.s=liste(spec.s,e=>punkt(e,e=>{ const k=text(e[3],3).replace(/[^0-9A-Za-zÄÖÜäöüß]/g,"");
                                     return k?[farbe(e[2],F,"g"),k]:[farbe(e[2],F,"g")]; }),16);
  aus.b=liste(spec.b,e=>punkt(e),12);
  aus.tx=liste(spec.tx,e=>{ const t=text(e&&e[2],45); return t?punkt(e,()=>[t]):null; },4);
  aus.ger=liste(spec.ger,e=>{ const a=String((e&&e[2])||"stange");
                              return GER.includes(a)?punkt(e,e=>[a,farbe(e[3],F,"y")]):null; },12);
  aus.kr=liste(spec.kr,e=>{ const r=zahl(e&&e[2],6,Math.min(B,H)/2); return r===null?null:punkt(e,()=>[r]); },3);
  aus.z=liste(spec.z,e=>{ const a=x(e&&e[0]), b=y(e&&e[1]);
                          if(a===null||b===null)return null;
                          const w=zahl(e&&e[2],8,B-a), hh=zahl(e&&e[3],8,H-b);
                          return (w===null||hh===null)?null:[a,b,w,hh]; },6);
  /* Pfeile: die Art bestimmt die Form, die Nummer (v579) ist erlaubt, aber keine Pflicht. */
  aus.p=liste(spec.p,e=>{ const nr=zahl(e&&e[5],1,20);
                          return strecke(e,e=>{ const t=farbe(e[4],"plsd","p"); return nr?[t,nr]:[t]; }); },16);
  aus.li=liste(spec.li,e=>strecke(e,e=>[(e[4]==="sz")?"sz":"m"]),4);
  aus.wand=liste(spec.wand,e=>strecke(e),4);
  aus.tor=liste(spec.tor,e=>{ const a=x(e&&e[0]), b=y(e&&e[1]);
                              if(a===null||b===null)return null;
                              const breit=zahl(e&&e[3],8,60)||24, senk=(e&&e[2])==="v";
                              return (e&&e[4]==="j")?[a,b,senk?"v":"h",breit,"j"]:[a,b,senk?"v":"h",breit]; },6);
  aus.dtor=liste(spec.dtor,e=>{ const a=x(e&&e[0]), b=y(e&&e[1]);
                                if(a===null||b===null)return null;
                                const w=zahl(e&&e[2],10,80)||20;
                                return [a,b,w,(e&&e[3]==="v")?"v":"h",(e&&e[4]==="h")?"h":"s",farbe(e&&e[5],F,"y")]; },6);
  aus.leiter=liste(spec.leiter,e=>{ const a=x(e&&e[0]), b=y(e&&e[1]), l=zahl(e&&e[2],20,Math.max(B,H));
                                    return (a===null||b===null||l===null)?null:[a,b,l,(e&&e[3]==="v")?"v":"h"]; },3);
  /* Weitere Bilder: beweglich ist nur, was sich am Platz bewegt – der Aufbau steht in
     Bild 1. Ein Schritt, der etwas anderes mitbringt, verliert es hier (v557). */
  if(Array.isArray(spec.schritte)&&spec.schritte.length){
    const bewegl=(typeof SKZ_BEWEGLICH!=="undefined")?SKZ_BEWEGLICH:["s","b","p","tx"];
    const st=spec.schritte.slice(0,(typeof SKZ_SCHRITTE_MAX!=="undefined")?SKZ_SCHRITTE_MAX:6)
      .map(b=>{ if(!b||typeof b!=="object"||Array.isArray(b))return null;
                const teil={}; bewegl.forEach(k=>{ const g=skzSpecSaeubern(Object.assign({},hoch?{hoch:true}:{},{[k]:b[k]}));
                                                   if(g&&g[k]&&g[k].length)teil[k]=g[k]; });
                return Object.keys(teil).length?teil:null; })
      .filter(Boolean);
    if(st.length)aus.schritte=st;
  }
  Object.keys(aus).forEach(k=>{ if(Array.isArray(aus[k])&&!aus[k].length)delete aus[k]; });
  const inhalt=Object.keys(aus).filter(k=>k!=="hoch");
  return inhalt.length?aus:null;
}
/* Der Zuschnitt der Zeichenfläche. Quer ist der Bestand, hochkant seit v578 die zweite
   Möglichkeit – gespiegelt, damit eine gedrehte Skizze denselben Platz hat wie vorher. */
const SKZ_QUER_B=280, SKZ_QUER_H=180, SKZ_HOCH_B=180, SKZ_HOCH_H=280;

/* v578 – FORMAT WECHSELN, OHNE ETWAS ZU VERLIEREN (PO 19.09.: „Mitdrehen")

   Beim Umschalten dreht sich die ganze Zeichnung um eine Vierteldrehung mit: Hütchen,
   Spieler, Pfeile, Tore, Leitern, Zonen. Nichts rutscht aus dem Bild, nichts wird
   gestaucht. Quer → hochkant dreht im Uhrzeigersinn, hochkant → quer dagegen: zweimal
   umschalten führt deshalb genau zum Ausgangsbild zurück.

   Was eine Richtung trägt – Tor, Leiter, Dribbeltor – kippt dabei seine Ausrichtung mit;
   ein Tor, das quer an der Seitenlinie stand, steht hochkant oben.

   Elemente mit Ausdehnung (Zone, Tor, Leiter) werden über ihre Ecken gedreht und danach
   neu vermessen; sonst läge der Ankerpunkt nach der Drehung außerhalb des Kastens. */
function _skzDrehPunkt(x,y,imUhrzeiger){
  return imUhrzeiger ? [SKZ_QUER_H-y, x] : [y, SKZ_QUER_H-x];
}
function _skzDrehKasten(x,y,w,h,imUhrzeiger){
  const ecken=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(e=>_skzDrehPunkt(e[0],e[1],imUhrzeiger));
  const xs=ecken.map(e=>e[0]), ys=ecken.map(e=>e[1]);
  return [Math.round(Math.min(...xs)),Math.round(Math.min(...ys)),
          Math.round(Math.max(...xs)-Math.min(...xs)),Math.round(Math.max(...ys)-Math.min(...ys))];
}
function _skzDrehListen(o,imUhrzeiger){
  if(!o||typeof o!=="object")return o;
  const P=(x,y)=>_skzDrehPunkt(x,y,imUhrzeiger).map(Math.round);
  const punkt=e=>{ const k=e.slice(), [x,y]=P(e[0],e[1]); k[0]=x; k[1]=y; return k; };
  const strecke=e=>{ const k=e.slice(), a=P(e[0],e[1]), b=P(e[2],e[3]);
                     k[0]=a[0]; k[1]=a[1]; k[2]=b[0]; k[3]=b[1]; return k; };
  const kipp=v=>(v==="v"?"h":"v");
  const auf=(f,fn)=>{ if(Array.isArray(o[f]))o[f]=o[f].map(fn); };
  ["s","b","h","ger","tx"].forEach(f=>auf(f,punkt));
  ["p","li","wand"].forEach(f=>auf(f,strecke));
  auf("kr",punkt);
  auf("z",e=>{ const k=e.slice(), r=_skzDrehKasten(e[0],e[1],e[2],e[3],imUhrzeiger);
               k[0]=r[0]; k[1]=r[1]; k[2]=r[2]; k[3]=r[3]; return k; });
  /* Tor: [x, y, "v"?, breite, "j"?]. Quer liegt es waagerecht (Breite × 7), hochkant
     senkrecht – die Ausrichtung kippt, die Breite bleibt die Breite des Tores. */
  auf("tor",e=>{ const k=e.slice(), senk=e[2]==="v", w=e[3]||24, d=(e[4]==="j")?10:7;
                 const r=_skzDrehKasten(e[0],e[1],senk?d:w,senk?w:d,imUhrzeiger);
                 k[0]=r[0]; k[1]=r[1]; k[2]=senk?"h":"v"; return k; });
  /* Leiter: [x, y, länge, "v"?] – 16 breit, Länge in Laufrichtung. */
  auf("leiter",e=>{ const k=e.slice(), senk=e[3]==="v", l=e[2]||40;
                    const r=_skzDrehKasten(e[0],e[1],senk?16:l,senk?l:16,imUhrzeiger);
                    k[0]=r[0]; k[1]=r[1];
                    /* Waagerecht ist der Normalfall und braucht kein Kennzeichen – so steht
                       eine zweimal gedrehte Leiter wieder Zeichen für Zeichen wie vorher da. */
                    if(senk){ if(k.length>3)k.length=3; } else k[3]="v";
                    return k; });
  /* Dribbeltor: [x, y, breite, "h"|"v", ...] – zwei Pfosten im Abstand der Breite. */
  auf("dtor",e=>{ const k=e.slice(), senk=e[3]==="v", w=e[2]||20;
                  const a=P(e[0],e[1]), b=P(senk?e[0]:e[0]+w,senk?e[1]+w:e[1]);
                  k[0]=Math.min(a[0],b[0]); k[1]=Math.min(a[1],b[1]);
                  k[3]=kipp(senk?"v":"h"); return k; });
  return o;
}
/* Dreht eine ganze Beschreibung samt ihrer Schritte. Gibt eine neue zurück; das Original
   bleibt unberührt, damit „Zurück" im Editor weiter den alten Stand hat. */
function skzDrehen(spec){
  const kopie=JSON.parse(JSON.stringify(spec||{}));
  const imUhrzeiger=!kopie.hoch;              // quer → hochkant dreht im Uhrzeigersinn
  _skzDrehListen(kopie,imUhrzeiger);
  if(Array.isArray(kopie.schritte))kopie.schritte.forEach(st=>_skzDrehListen(st,imUhrzeiger));
  if(imUhrzeiger)kopie.hoch=true; else delete kopie.hoch;
  return kopie;
}
/* v578 – DRIBBLING ALS SCHLANGENLINIE (PO 19.09.)

   „Dribbling zum Beispiel sollte keine gestrichelte Linie sein, sondern eine durchgezogene
   Linie, aber geschwungen."

   So steht es auch in der Zeichenlehre des Verbands: der Ball am Fuß ist eine durchgezogene
   Wellenlinie, der Laufweg ohne Ball gestrichelt. Gepunktet war es nur, weil eine gerade
   Linie sich leichter zeichnen ließ.

   Die Form trägt die Bedeutung weiter allein: Pass dünn gerade, Laufweg gestrichelt, Schuss
   dick, Dribbling geschwungen – auch für Augen, die die vier Farben nicht unterscheiden.

   Das letzte Stück bleibt gerade, sonst säße die Pfeilspitze schief auf dem Bogen. */
function _skzWelle(x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy), r=v=>Math.round(v*10)/10;
  if(len<2)return 'M'+r(x1)+' '+r(y1)+' L'+r(x2)+' '+r(y2);
  const ux=dx/len, uy=dy/len, nx=-uy, ny=ux;        // Richtung und Senkrechte dazu
  const kopf=Math.min(5,len/4), bahn=len-kopf;      // gerades Stück für die Spitze
  const boegen=Math.max(2,Math.round(bahn/9));      // etwa alle neun Punkte ein Bogen
  const schritt=bahn/boegen, amp=Math.min(3.2,schritt/2);
  let d='M'+r(x1)+' '+r(y1);
  for(let i=0;i<boegen;i++){
    const seite=(i%2)?-1:1, mitte=schritt*i+schritt/2, ende=schritt*(i+1);
    d+=' Q'+r(x1+ux*mitte+nx*amp*seite)+' '+r(y1+uy*mitte+ny*amp*seite)
      +' '+r(x1+ux*ende)+' '+r(y1+uy*ende);
  }
  return d+' L'+r(x2)+' '+r(y2);
}
function _skz(o,opt){
  if(opt&&opt.bild)o=_skzBild(o,opt.bild);
  /* v578 – HOCHKANT ODER QUER (PO 19.09.): „Es wäre super, wenn ich wählen könnte, dass das
     Feld hochkant oder im Querformat als Grundlage ist."

     Eine Slalomstrecke oder ein Torschuss aufs Tor am oberen Rand steht hochkant besser da
     als quer gequetscht. Das Format gehört zur einzelnen Skizze, nicht ans Gerät: `hoch:true`
     dreht den Zuschnitt auf 180 × 280. Fehlt das Feld, entsteht Zeichen für Zeichen dieselbe
     Ausgabe wie vorher – alle bestehenden Skizzen bleiben, wie sie sind. */
  const hoch=!!(o&&o.hoch), SB=hoch?SKZ_HOCH_B:SKZ_QUER_B, SH=hoch?SKZ_HOCH_H:SKZ_QUER_H;
  const P=skzPalette(opt&&opt.hell), F=P.F, M=P.marke;
  const E=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); // Specs können aus der DB kommen (KI-Übungen)
  const S=['<rect width="'+SB+'" height="'+SH+'" rx="4" fill="'+P.rasen+'" stroke="'+P.rasenRand+'" stroke-width="1.5"/>',
    '<rect x="4" y="4" width="'+(SB-8)+'" height="'+(SH-8)+'" rx="3" fill="none" stroke="'+P.innen+'" stroke-width="1"/>',
    '<defs>'+Object.keys(P.pfeil).map(t=>'<marker id="'+M+t+'" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="'+P.pfeil[t]+'"/></marker>').join('')+'</defs>'];
  (o.z||[]).forEach(z=>S.push('<rect x="'+z[0]+'" y="'+z[1]+'" width="'+z[2]+'" height="'+z[3]+'" rx="3" fill="'+P.zoneF+'" stroke="'+P.zoneS+'" stroke-width="1.5" stroke-dasharray="6,3"/>'));
  /* v559: Kreis-Zone. „Den Mittelkreis als Feld nutzen" steht so in den Vorlagen des
     Verbands; mit Rechtecken allein ließ sich das nicht zeichnen. */
  (o.kr||[]).forEach(k=>S.push('<circle cx="'+k[0]+'" cy="'+k[1]+'" r="'+k[2]+'" fill="'+P.zoneF+'" stroke="'+P.zoneS+'" stroke-width="1.5" stroke-dasharray="6,3"/>'));
  /* v517: Linien – nach den Zonen, vor den Toren. „m“ Mittellinie durchgezogen weiß,
     „sz“ Schusszone gestrichelt gelb: Muster UND Farbe unterscheiden sie, wie bei den
     Pfeilen seit v512. Wer nur eins von beidem sieht, erkennt sie trotzdem. */
  (o.li||[]).forEach(l=>{const sz=l[4]==='sz';
    S.push('<line x1="'+l[0]+'" y1="'+l[1]+'" x2="'+l[2]+'" y2="'+l[3]+'" stroke="'+(sz?P.sz:P.mittel)+'" stroke-width="2"'+(sz?' stroke-dasharray="5,4"':'')+'/>');});
  /* v517: Jugendtor über ein fünftes Feld „j“ – tiefer (10 statt 7), dickerer Strich,
     hinterlegt und mit drei Netzlinien quer, damit es sich nicht allein über die Größe
     vom Minitor unterscheidet. OHNE fünftes Feld entsteht Zeichen für Zeichen dieselbe
     Ausgabe wie vorher; alle 61 bestehenden Skizzen sind dagegen geprüft. */
  (o.tor||[]).forEach(t=>{const w=t[3]||24, j=t[4]==='j', d=j?10:7, sw=j?3:2.5, v=t[2]==='v';
    S.push('<rect x="'+t[0]+'" y="'+t[1]+'" width="'+(v?d:w)+'" height="'+(v?w:d)+'" rx="2" fill="'+(j?P.torFuell:'none')+'" stroke="'+P.tor+'" stroke-width="'+sw+'"/>');
    if(j){ const n=4, st=w/n;
      for(let i=1;i<n;i++)S.push(v?'<line x1="'+t[0]+'" y1="'+(t[1]+i*st)+'" x2="'+(t[0]+d)+'" y2="'+(t[1]+i*st)+'" stroke="'+P.tor+'" stroke-width="1"/>'
                                 :'<line x1="'+(t[0]+i*st)+'" y1="'+t[1]+'" x2="'+(t[0]+i*st)+'" y2="'+(t[1]+d)+'" stroke="'+P.tor+'" stroke-width="1"/>');
    }});
  (o.leiter||[]).forEach(l=>{const n=6,st=l[2]/n;
    S.push('<rect x="'+l[0]+'" y="'+l[1]+'" width="'+(l[3]==='v'?16:l[2])+'" height="'+(l[3]==='v'?l[2]:16)+'" fill="none" stroke="'+P.leiter+'" stroke-width="1.5"/>');
    for(let i=1;i<n;i++)S.push(l[3]==='v'
      ?'<line x1="'+l[0]+'" y1="'+(l[1]+i*st)+'" x2="'+(l[0]+16)+'" y2="'+(l[1]+i*st)+'" stroke="'+P.leiter+'" stroke-width="1.5"/>'
      :'<line x1="'+(l[0]+i*st)+'" y1="'+l[1]+'" x2="'+(l[0]+i*st)+'" y2="'+(l[1]+16)+'" stroke="'+P.leiter+'" stroke-width="1.5"/>');});
  /* v559 – DRIBBELTORE. In den vierzig Beispielen des Verbands ist das Tor zum
     Durchdribbeln der häufigste Aufbau nach dem Minitor: „4 Stangentore markieren",
     „ein 5 Meter breites Hütchentor errichten", „8 Stangentore". Zwei einzeln gesetzte
     Hütchen sahen bisher aus wie zwei Hütchen – die gestrichelte Verbindung macht daraus
     ein Ziel. `[x, y, breite, "h"|"v", "s"|"h", farbe]`: „s" steht auf Stangen, „h" auf
     Hütchen. */
  (o.dtor||[]).forEach(d=>{
    const x=d[0], y=d[1], w=d[2]||20, v=d[3]==='v', stangen=d[4]!=='h', c=F[d[5]]||F.y;
    const bx=v?x:x+w, by=v?y+w:y;
    S.push('<line x1="'+x+'" y1="'+y+'" x2="'+bx+'" y2="'+by+'" stroke="'+P.zoneS+'" stroke-width="1.2" stroke-dasharray="3,3"/>');
    [[x,y],[bx,by]].forEach(q=>{
      if(stangen)S.push('<circle cx="'+q[0]+'" cy="'+q[1]+'" r="4" fill="none" stroke="'+c+'" stroke-width="2.5"/>');
      else S.push('<path d="M'+q[0]+' '+(q[1]-6)+' L'+(q[0]+5)+' '+(q[1]+4)+' L'+(q[0]-5)+' '+(q[1]+4)+' Z" fill="'+c+'" stroke="'+P.huetchenRand+'" stroke-width="1"/>');
    });
  });
  /* v559 – GERÄTE. Eine Liste statt vier, damit ein weiteres Gerät später eine neue Art
     ist und kein neues Feld: `[x, y, art, farbe]`. Von oben gesehen ist eine Stange ein
     Ring, ein Markierungsteller eine flache Scheibe, eine Minihürde ein Balken mit zwei
     Füßen, ein Balldepot ein Häufchen Bälle. Eine unbekannte Art wird übergangen – so
     zeichnet eine ältere Fassung der App eine neuere Beschreibung ohne Bruch. */
  (o.ger||[]).forEach(g=>{
    const x=g[0], y=g[1], art=String(g[2]||'stange'), c=F[g[3]]||F.y;
    if(art==='stange'){
      S.push('<circle cx="'+x+'" cy="'+y+'" r="4" fill="none" stroke="'+c+'" stroke-width="2.5"/>');
      S.push('<circle cx="'+x+'" cy="'+y+'" r="1.2" fill="'+c+'"/>');
    }else if(art==='teller'){
      S.push('<ellipse cx="'+x+'" cy="'+y+'" rx="5.5" ry="3" fill="'+c+'" stroke="'+P.huetchenRand+'" stroke-width="1"/>');
    }else if(art==='huerde'){
      S.push('<rect x="'+(x-7)+'" y="'+(y-3.5)+'" width="14" height="3.5" rx="1" fill="'+c+'" stroke="'+P.huetchenRand+'" stroke-width="0.8"/>');
      S.push('<line x1="'+(x-6)+'" y1="'+y+'" x2="'+(x-6)+'" y2="'+(y+4)+'" stroke="'+c+'" stroke-width="1.5"/>');
      S.push('<line x1="'+(x+6)+'" y1="'+y+'" x2="'+(x+6)+'" y2="'+(y+4)+'" stroke="'+c+'" stroke-width="1.5"/>');
    }else if(art==='ring'){
      /* v560: Der Koordinationsring liegt flach wie der Teller – deshalb dieselbe Ellipse,
         aber hohl. Gefüllt wäre er von oben nicht vom Teller zu unterscheiden. */
      S.push('<ellipse cx="'+x+'" cy="'+y+'" rx="6" ry="3.4" fill="none" stroke="'+c+'" stroke-width="2"/>');
    }else if(art==='trainer'){
      /* v579 (PO 19.09.): „Dann brauchen wir noch ein Icon für die Position des Trainers."
         Er steht am Platz, ist aber kein Gerät – deshalb zählt ihn die Materialliste nicht
         mit. Vom Dummy unterscheiden ihn die Schultern und die Pfeife am Hals; das trägt
         auch dann, wenn jemand die Farben nicht unterscheidet. */
      S.push('<line x1="'+(x-6)+'" y1="'+(y+7.5)+'" x2="'+(x+6)+'" y2="'+(y+7.5)+'" stroke="'+c+'" stroke-width="1.5" stroke-linecap="round"/>');
      S.push('<path d="M'+(x-5)+' '+(y+7)+' L'+(x-4)+' '+(y-3)+' L'+(x+4)+' '+(y-3)+' L'+(x+5)+' '+(y+7)+' Z" fill="'+c+'" stroke="'+P.huetchenRand+'" stroke-width="0.8"/>');
      S.push('<circle cx="'+x+'" cy="'+(y-6)+'" r="2.7" fill="'+c+'" stroke="'+P.huetchenRand+'" stroke-width="0.8"/>');
      S.push('<circle cx="'+(x+5.6)+'" cy="'+(y-1)+'" r="1.7" fill="'+P.sz+'" stroke="'+P.huetchenRand+'" stroke-width="0.6"/>');
    }else if(art==='dummy'){
      /* Der Freistoß-Dummy ist mannhoch und steht – als Figur gezeichnet, nicht als Punkt.
         Vom Spielerkreis (r 8) unterscheidet ihn, dass er hoch statt rund ist. */
      S.push('<line x1="'+(x-5)+'" y1="'+(y+6.5)+'" x2="'+(x+5)+'" y2="'+(y+6.5)+'" stroke="'+c+'" stroke-width="1.5" stroke-linecap="round"/>');
      S.push('<rect x="'+(x-3)+'" y="'+(y-4.5)+'" width="6" height="11" rx="3" fill="'+c+'" stroke="'+P.huetchenRand+'" stroke-width="0.8"/>');
      S.push('<circle cx="'+x+'" cy="'+(y-7.5)+'" r="2.4" fill="'+c+'" stroke="'+P.huetchenRand+'" stroke-width="0.8"/>');
    }else if(art==='depot'){
      [[0,-3],[-3.5,2],[3.5,2]].forEach(t=>S.push('<circle cx="'+(x+t[0])+'" cy="'+(y+t[1])+'" r="2.6" fill="'+P.ball+'" stroke="'+P.ballRand+'" stroke-width="0.8"/>'));
      S.push('<path d="M'+(x-8)+','+(y+5.5)+' Q'+x+','+(y+10)+' '+(x+8)+','+(y+5.5)+'" fill="none" stroke="'+P.text+'" stroke-width="1.2"/>');
    }
  });
  (o.wand||[]).forEach(w=>S.push('<line x1="'+w[0]+'" y1="'+w[1]+'" x2="'+w[2]+'" y2="'+w[3]+'" stroke="'+P.wand+'" stroke-width="5" stroke-linecap="round"/>'));
  /* v579 – ABFOLGEN AUF EINER SKIZZE (PO 19.09.): „zuerst in die linke Richtung … dann
     von da aus wieder zurück … dass man das auch irgendwie darstellen kann."

     Zwei Wege, und beide haben ihren Platz: weitere BILDER zeigen den Ablauf in Bewegung
     (seit v557/v558), eine NUMMER am Pfeil zeigt ihn auf einen Blick – auf Papier, im
     Stadionheft und überall dort, wo niemand tippt. Die Nummer ist das sechste Feld eines
     Pfeils; fehlt sie, ändert sich nichts. Sie sitzt am Anfang des Pfeils, leicht dahinter,
     damit sie die Linie nicht verdeckt.

     v600: „Leicht dahinter" reicht nicht, wenn der Pfeil am Fuß eines Kindes beginnt — und
     das tut er fast immer, denn ein Pass geht vom Spieler aus. Die sieben Pixel landen dann
     INNERHALB des Kreises (Radius 8) und legen die Nummer über das Kürzel; in „Dreieck mit
     Torwart" und „Doppelpass zum Abschluss" (beide v597) war von V1, A und TW nichts mehr zu
     lesen. Liegt die Nummer in einem Spieler, weicht sie deshalb SENKRECHT zur Pfeilrichtung
     aus, bis sie frei steht — sie bleibt damit am Pfeilanfang, nur eben neben dem Kind statt
     auf ihm. Findet sie in keiner Richtung Platz, bleibt sie, wo sie war: ein verdecktes
     Kürzel ist besser als eine Nummer, die irgendwo im Bild schwebt. */
  const nrKreis=(p,typ)=>{
    const nr=Number(p[5]);
    if(!isFinite(nr)||nr<1)return;
    const dx=p[2]-p[0], dy=p[3]-p[1], len=Math.hypot(dx,dy)||1, r=v=>Math.round(v*10)/10;
    let ax=p[0]-dx/len*7, ay=p[1]-dy/len*7;
    /* Belegt ist der Kreis (8) plus der Nummernkreis (5.5) – und beim Kind mit Ball am Fuß
       auch dessen Ball (4), sonst steht die Nummer auf dem Ball statt auf dem Kind. */
    const frei=(x,y)=>!(o.s||[]).some(sp=>Math.hypot(x-sp[0],y-sp[1])<15
      ||(sp[4]==='b'&&Math.hypot(x-(sp[0]+7),y-(sp[1]+7))<11.5));
    if(!frei(ax,ay)){
      const nx=-dy/len, ny=dx/len;
      suche: for(let d=10;d<=26;d+=4)for(const v of [1,-1]){
        const x=ax+nx*d*v, y=ay+ny*d*v;
        if(frei(x,y)&&x>7&&x<SB-7&&y>7&&y<SH-7){ ax=x; ay=y; break suche; }
      }
    }
    const bx=r(ax), by=r(ay);
    S.push('<circle cx="'+bx+'" cy="'+by+'" r="5.5" fill="'+P.nrFuell+'" stroke="'+P.pfeil[typ]+'" stroke-width="1.2"/>');
    S.push('<text x="'+bx+'" y="'+(by+2.7)+'" text-anchor="middle" fill="'+P.pfeil[typ]+'" font-size="7.5" font-family="sans-serif" font-weight="700">'+Math.round(nr)+'</text>');
  };
  (o.p||[]).forEach(p=>{const typ=P.pfeil[p[4]]?p[4]:'p';
    /* v578: Das Dribbling ist eine durchgezogene Schlangenlinie statt einer gepunkteten
       Geraden – der Ball bleibt am Fuß, der Weg schlängelt. */
    if(typ==='d'){ S.push('<path d="'+_skzWelle(p[0],p[1],p[2],p[3])+'" fill="none" stroke="'+P.pfeil.d+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#'+M+'d)"/>'); nrKreis(p,typ); return; }
    S.push('<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+p[2]+'" y2="'+p[3]+'" stroke="'+P.pfeil[typ]+'" stroke-width="'+(typ==='s'?3:1.5)+'"'+(typ==='l'?' stroke-dasharray="5,3"':'')+' marker-end="url(#'+M+typ+')"/>');
    nrKreis(p,typ);});
  (o.h||[]).forEach(h=>S.push('<path d="M'+h[0]+' '+(h[1]-6)+' L'+(h[0]+5)+' '+(h[1]+4)+' L'+(h[0]-5)+' '+(h[1]+4)+' Z" fill="'+(F[h[2]]||F.y)+'" stroke="'+P.huetchenRand+'" stroke-width="1"/>'));
  /* v598 – SPIELER MIT BALL (PO 22.09.): „Wir brauchen ein festes Icon ‚Spieler mit Ball‘."

     Bisher setzte man zwei Elemente nebeneinander und schob den Ball von Hand an den Fuß.
     Das sah richtig aus, war aber zweierlei: Beim Verschieben blieb der Ball liegen, und
     ob er zu diesem Kind gehört, wusste nur, wer es gezeichnet hatte. Ein fünftes Feld am
     Spieler macht daraus EIN Element — `[x, y, farbe, kürzel, 'b']`. Der Ball sitzt am
     unteren rechten Rand des Kreises, dort, wo der Fuß ist. Ohne fünftes Feld entsteht
     Zeichen für Zeichen dieselbe Ausgabe wie vorher. */
  (o.s||[]).forEach(sp=>{S.push('<circle cx="'+sp[0]+'" cy="'+sp[1]+'" r="8" fill="'+(F[sp[2]]||F.g)+'" stroke="'+P.spielerRand+'" stroke-width="1.5"/>');
    if(sp[3])S.push('<text x="'+sp[0]+'" y="'+(sp[1]+3)+'" text-anchor="middle" fill="'+P.kuerzel+'" font-size="8" font-family="sans-serif" font-weight="700">'+E(sp[3])+'</text>');
    if(sp[4]==='b')S.push('<circle cx="'+(sp[0]+7)+'" cy="'+(sp[1]+7)+'" r="4" fill="'+P.ball+'" stroke="'+P.ballRand+'" stroke-width="1"/>');});
  (o.b||[]).forEach(b=>S.push('<circle cx="'+b[0]+'" cy="'+b[1]+'" r="4" fill="'+P.ball+'" stroke="'+P.ballRand+'" stroke-width="1"/>'));
  (o.tx||[]).forEach(t=>S.push('<text x="'+t[0]+'" y="'+t[1]+'" text-anchor="middle" fill="'+P.text+'" font-size="9" font-family="sans-serif" font-weight="600">'+E(t[2])+'</text>'));
  return '<svg viewBox="0 0 '+SB+' '+SH+'" width="100%" style="max-width:'+SB+'px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">'+S.join('')+'</svg>';
}
/* Einheitliche Linien-Legende (PO): erscheint unter jeder Skizze im Detail-Fenster.
   Muss zu den Pfeil-Typen in _skz passen: p=Pass (dünn durchgezogen), l=Laufweg
   (gestrichelt), s=Schuss (dick), d=Dribbling (durchgezogen geschwungen, seit v578). */
/* v559: Was für Geräte in einer Zeichnung steckt, steht in der Legende – aber nur, was
   wirklich vorkommt. Eine Legende, die immer alles zeigt, erklärt am Ende nichts mehr. */
const SKZ_GER_NAME={stange:"Stange",teller:"Markierungsteller",huerde:"Minihürde",depot:"Balldepot",ring:"Koordinationsring",dummy:"Freistoß-Dummy",trainer:"Trainer"};
function _skzGerProbe(art){ return {ger:[[16,9,art,"y"]]}; }
/* v587 – DIE LEGENDE ZEIGT NUR, WAS VORKOMMT.

   Übergabe 3.1 (20.09.): Unter der Lehrgangsskizze standen „Schusszone" und „Mittellinie",
   obwohl keines von beiden gezeichnet ist. Die Geräte-Einträge richteten sich schon seit
   v559 nach der Zeichnung, die sechs Strich-Einträge standen fest – Beschluss vom 14.09.:
   „Eine Legende, die eine andere Zeichnung beschreibt, ist schlimmer als keine."

   Mit Beschreibung (spec) werden nur die Wegarten und Linien gezeigt, die in irgendeinem
   Bild vorkommen. OHNE Beschreibung – die 37 Altskizzen aus handgeschriebenem SVG, die
   Import-Vorschau, das Wissen – bleibt alles stehen, denn dort weiß niemand, was drin ist.
   Der Export für die Abgabe (doku/auftrag-lehrgangsskizzen) liest dieselbe Auswahl. */
function skzLegendeArten(spec){
  if(!spec||typeof spec!=="object")return null;
  const arten=new Set();
  const n=(typeof skzBildZahl==="function")?skzBildZahl(spec):1;
  for(let i=0;i<n;i++){
    const b=(typeof _skzBild==="function")?_skzBild(spec,i):spec;
    (b.p||[]).forEach(p=>{ const a=String((p&&p[4])||"p"); if("plsd".includes(a))arten.add(a); });
  }
  (spec.li||[]).forEach(l=>arten.add((l&&l[4])==="m"?"m":"sz"));
  return arten;
}
function skzLegende(hell,spec){
  const A=skzLegendeArten(spec), hat=k=>!A||A.has(k);   // v587
  /* v512: Die Strichprobe steht auf einem Stück Rasen – sonst wäre der weiße Pass-Pfeil
     auf hellem Grund unsichtbar, und die Farben stimmten nicht mit der Zeichnung überein.
     v555: Der Rasen der Legende folgt der Variante, sonst zeigte sie im hellen Bild
     Farben, die dort gar nicht vorkommen. */
  const P=skzPalette(hell), R=P.rasen;
  const li=(dash,w,c)=>'<svg width="32" height="12" viewBox="0 0 32 12" style="flex:none;background:'+R+';border-radius:3px"><line x1="2" y1="6" x2="24" y2="6" stroke="'+c+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/><path d="M24,2.5 L30,6 L24,9.5 Z" fill="'+c+'"/></svg>';
  const it=(svg,lbl)=>'<span style="display:inline-flex;align-items:center;gap:4px">'+svg+lbl+'</span>';
  /* v517: Linien ohne Pfeilspitze – Mittellinie und Schusszone sind Markierungen, keine
     Richtungen; eine Spitze würde sie zu Wegen machen. Kontrast auf dem Rasen (#2d6a2d)
     gemessen: Schusszone #fbbf24 3,92:1 · Mittellinie rgba(255,255,255,.7) 4,13:1 –
     beide über den geforderten 3:1 für Bedienelemente und Grafik. */
  const st=(dash,c)=>'<svg width="32" height="12" viewBox="0 0 32 12" style="flex:none;background:'+R+';border-radius:3px"><line x1="2" y1="6" x2="30" y2="6" stroke="'+c+'" stroke-width="2"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/></svg>';
  /* v578: Die Dribbling-Probe wird mit demselben Code gezeichnet wie auf dem Platz –
     eine abgetippte Welle liefe früher oder später auseinander. */
  const wl=c=>'<svg width="32" height="12" viewBox="0 0 32 12" style="flex:none;background:'+R+';border-radius:3px"><path d="'+_skzWelle(2,6,24,6)+'" fill="none" stroke="'+c+'" stroke-width="1.5" stroke-linecap="round"/><path d="M24,2.5 L30,6 L24,9.5 Z" fill="'+c+'"/></svg>';
  const P2=P.pfeil;
  return '<div class="skz-legende" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;font-size:10px;color:var(--text2);margin:2px 0 8px">'
    +(hat("p")?it(li('',1.5,P2.p),SKZ_PFEIL_NAME.p):"")+(hat("l")?it(li('5,3',1.5,P2.l),SKZ_PFEIL_NAME.l):"")
    +(hat("s")?it(li('',3,P2.s),SKZ_PFEIL_NAME.s):"")+(hat("d")?it(wl(P2.d),SKZ_PFEIL_NAME.d):"")
    +(hat("sz")?it(st('5,4',P.sz),'Schusszone'):"")+(hat("m")?it(st('',P.mittel),'Mittellinie'):"")
    +_skzGerLegende(spec,hell)+'</div>';
}
/* Die Geräte-Einträge der Legende. Gezeichnet wird jedes Symbol mit demselben Code wie
   auf dem Platz – ein abgetipptes Legendensymbol liefe früher oder später auseinander. */
function _skzGerLegende(spec,hell){
  if(!spec||typeof spec!=="object")return "";
  const arten=[];
  (spec.ger||[]).forEach(g=>{ const a=String(g[2]||"stange"); if(SKZ_GER_NAME[a]&&!arten.includes(a))arten.push(a); });
  const tore=[];
  (spec.dtor||[]).forEach(d=>{ const n=(d[4]==="h")?"Hütchentor":"Stangentor"; if(!tore.includes(n))tore.push(n); });
  if(!arten.length&&!tore.length)return "";
  const kasten=inhalt=>'<svg width="32" height="18" viewBox="0 0 32 18" style="flex:none;background:'+skzPalette(hell).rasen+';border-radius:3px">'+inhalt+'</svg>';
  const teil=a=>{
    const roh=_skz(_skzGerProbe(a),{hell});
    const inhalt=roh.slice(roh.indexOf("</defs>")+7,roh.lastIndexOf("</svg>"));
    return '<span style="display:inline-flex;align-items:center;gap:4px">'+kasten(inhalt)+SKZ_GER_NAME[a]+'</span>';
  };
  let aus=arten.map(teil).join("");
  tore.forEach(n=>{
    const roh=_skz({dtor:[[6,9,20,"h",n==="Hütchentor"?"h":"s","y"]]},{hell});
    const inhalt=roh.slice(roh.indexOf("</defs>")+7,roh.lastIndexOf("</svg>"));
    aus+='<span style="display:inline-flex;align-items:center;gap:4px">'+kasten(inhalt)+n+'</span>';
  });
  return aus;
}
/* ═══ v559 – WAS DIE ÜBUNG BRAUCHT ═══
   Die vierzig Vorlagen des Verbands beginnen alle mit einem Materialsatz: „Ein 25 x 18
   Meter großes Feld mit 4 Minitoren und zwei 5 Meter tiefen Schusszonen markieren."
   Diesen Satz muss bei uns niemand schreiben – er steht schon in der Zeichnung. Gezählt
   wird, was gezeichnet ist; geraten wird nichts.

   Der Rückweg ist das eigentlich Neue: die App kennt den Schrank (Material-Inventur seit
   v545). Damit lässt sich sagen, ob das, was man zeichnet, überhaupt da ist. Kein
   fremdes Werkzeug kann das, weil keines den Schrank kennt.

   Die Namen sind bewusst die des Bestands, nicht die der Zeichnung – nur so treffen sie
   sich beim Abgleich. */
const SKZ_MAT_NAME={
  minitor:"Minitore", jugendtor:"Jugendtore", huetchen:"Hütchen", stange:"Stangen",
  teller:"Markierungsteller", huerde:"Minihürden", leiter:"Koordinationsleiter",
  wand:"Banden", ball:"Bälle", depot:"Balldepot", ring:"Koordinationsringe",
  dummy:"Freistoß-Dummys"
};
/* „1 Bälle" liest niemand zweimal, ohne zu stolpern. */
const SKZ_MAT_EINS={
  minitor:"Minitor", jugendtor:"Jugendtor", huetchen:"Hütchen", stange:"Stange",
  teller:"Markierungsteller", huerde:"Minihürde", leiter:"Koordinationsleiter",
  wand:"Bande", ball:"Ball", depot:"Balldepot", ring:"Koordinationsring",
  dummy:"Freistoß-Dummy"
};
function skzMatWort(schluessel,anzahl){
  return (anzahl===1?SKZ_MAT_EINS:SKZ_MAT_NAME)[schluessel]||schluessel;
}
function skzMaterial(spec){
  const z={};
  const dazu=(k,n)=>{ if(n>0)z[k]=(z[k]||0)+n; };
  if(!spec||typeof spec!=="object")return [];
  /* Eine Skizze mit Bildern braucht das Material aus Bild 1 – der Aufbau bleibt stehen. */
  const o=spec;
  (o.tor||[]).forEach(t=>dazu(t[4]==="j"?"jugendtor":"minitor",1));
  dazu("huetchen",(o.h||[]).length);
  /* v598: Ein Ball am Spieler ist ein Ball im Netz – gezählt wird er wie ein einzeln
     gesetzter, sonst fehlte er in der Materialzeile, sobald jemand das neue Werkzeug
     „Spieler + Ball" nimmt statt zweier Elemente. */
  dazu("ball",(o.b||[]).length+(o.s||[]).filter(sp=>sp&&sp[4]==="b").length);
  dazu("leiter",(o.leiter||[]).length);
  dazu("wand",(o.wand||[]).length);
  (o.ger||[]).forEach(g=>{
    const a=String(g[2]||"stange");
    if(a==="stange")dazu("stange",1);
    else if(a==="teller")dazu("teller",1);
    else if(a==="huerde")dazu("huerde",1);
    else if(a==="depot")dazu("depot",1);
    else if(a==="ring")dazu("ring",1);
    else if(a==="dummy")dazu("dummy",1);
  });
  /* Ein Dribbeltor steht auf zwei Pfosten – gezählt werden die Pfosten, denn die holt
     man aus dem Schrank, nicht das Tor. */
  (o.dtor||[]).forEach(d=>dazu(d[4]==="h"?"huetchen":"stange",2));
  const reihe=["minitor","jugendtor","huetchen","stange","teller","ring","huerde","leiter","dummy","wand","ball","depot"];
  return reihe.filter(k=>z[k]).map(k=>({schluessel:k,was:skzMatWort(k,z[k]),anzahl:z[k]}));
}
function skzMaterialText(spec){
  return skzMaterial(spec).map(m=>m.anzahl+" "+m.was).join(" · ");
}
/* Mehrere Übungen auf EINEM Aufbau: gebraucht wird das MAXIMUM je Gegenstand, nicht die
   Summe. Wer nacheinander zwei Übungen mit je vier Minitoren spielt, baut sie einmal auf –
   das ist der ganze Sinn von „ein Aufbau, drei Stufen" im Ausbildungskonzept. */
function skzMaterialSumme(specs){
  const max={};
  (specs||[]).forEach(sp=>skzMaterial(sp).forEach(m=>{ max[m.schluessel]=Math.max(max[m.schluessel]||0,m.anzahl); }));
  const reihe=["minitor","jugendtor","huetchen","stange","teller","ring","huerde","leiter","dummy","wand","ball","depot"];
  return reihe.filter(k=>max[k]).map(k=>({schluessel:k,was:skzMatWort(k,max[k]),anzahl:max[k]}));
}
/* Symbolskizzen je Kategorie: Fallback für eigene und ältere KI-Übungen ohne eigene
   Skizze – besser eine ehrlich beschriftete Grundaufstellung als gar kein Bild. */
const SKZ_KAT={
aufwaermen:{s:[[80,60,'g'],[170,55,'g'],[120,100,'g'],[200,110,'g']],b:[[87,67],[177,62],[127,107],[207,117]],p:[[85,55,120,40,'d']],tx:[[140,25,'freies Dribbeln im Feld'],[140,165,'Symbolskizze']]},
raute:{s:[[140,50,'g'],[80,95,'g'],[200,95,'g'],[140,138,'g']],b:[[148,132]],p:[[135,132,86,102,'p'],[86,88,133,55,'p'],[148,55,196,88,'p']],tx:[[140,25,'Raute: Jäger · Flitzer · Aufpasser'],[140,165,'Symbolskizze']]},
passspiel:{s:[[70,90,'g','A'],[170,50,'g','B'],[210,125,'g','C']],b:[[80,95]],p:[[80,86,162,55,'p'],[176,58,205,116,'p']],tx:[[140,165,'Symbolskizze']]},
wahrnehmung:{h:[[40,30,'r'],[240,30,'b'],[40,150,'y'],[240,150,'g']],s:[[140,90,'g']],b:[[147,97]],tx:[[140,25,'sehen – entscheiden – handeln'],[140,165,'Symbolskizze']]},
technik:{h:[[80,110],[120,90],[160,110],[200,90]],s:[[45,120,'g']],b:[[53,127]],p:[[52,114,77,104,'d'],[86,102,118,96,'d'],[126,96,158,104,'d']],tx:[[140,165,'Symbolskizze']]},
pressing:{s:[[180,70,'r'],[90,120,'g']],b:[[190,78]],p:[[96,113,140,92,'l'],[144,88,172,76,'l']],tx:[[140,30,'anlaufen und Ball erobern'],[140,165,'Symbolskizze']]},
spass:{tor:[[40,20,'h',18],[222,20,'h',18]],s:[[80,90,'g'],[150,110,'g'],[200,80,'r'],[120,60,'r']],b:[[157,117]],tx:[[140,165,'Symbolskizze']]},
torwart:{tor:[[120,163,'h',40]],s:[[140,148,'b','TW'],[140,50,'w','T']],b:[[148,60]],p:[[142,62,138,138,'s']],tx:[[140,165,'Symbolskizze']]},
individual:{h:[[100,70],[160,110]],s:[[60,110,'g'],[220,50,'w','T']],b:[[68,117]],p:[[67,104,96,78,'d'],[106,76,155,102,'d']],tx:[[140,165,'Symbolskizze']]},
mindset:{s:[[140,55,'g'],[180,75,'g'],[180,115,'g'],[140,135,'g'],[100,115,'g'],[100,75,'g']],tx:[[140,97,'Team-Kreis'],[140,165,'Symbolskizze']]}
};
const TF_SKIZZEN={
aw01:{s:[[60,60,'g'],[110,50,'g'],[175,70,'g'],[220,55,'g'],[80,120,'g'],[200,125,'g'],[150,140,'g'],[140,92,'r','H']],b:[[67,67],[117,57],[182,77],[87,127],[207,132],[157,147],[227,62]],p:[[147,86,170,74,'l']],tx:[[140,25,'Haie fangen – Fische schützen den Ball']]},
aw02:{s:[[70,60,'g'],[150,55,'g'],[210,75,'g'],[90,115,'g'],[180,125,'g'],[30,30,'w','T']],b:[[77,67],[157,62],[217,82],[97,122],[187,132]],tx:[[140,165,'FEUER stoppen · WASSER hoch · STURM sitzen']]},
aw03:{h:[[40,70],[40,110],[90,70],[90,110],[140,70],[140,110],[190,70],[190,110],[240,70],[240,110]],p:[[20,90,258,90,'l']],tx:[[40,52,'1'],[90,52,'2'],[140,52,'3'],[190,52,'4'],[240,52,'5'],[140,150,'Bär · Frosch · Krebs · Spinne · Känguru']]},
aw04:{s:[[60,55,'g','1'],[200,50,'g','2'],[70,130,'g','3'],[210,125,'g','4'],[140,40,'g','5'],[140,90,'w','T']],b:[[67,62],[207,57],[77,137],[217,132],[147,47]],p:[[78,125,130,97,'l'],[133,85,85,122,'p']],tx:[[140,165,'Trainer ruft eine Nummer → Sprint + Doppelpass']]},
aw05:{s:[[70,60,'g'],[160,50,'g'],[220,90,'g'],[90,125,'g'],[170,130,'g']],b:[[77,67],[167,57],[227,97],[97,132],[177,137]],p:[[100,128,40,150,'s'],[164,58,120,30,'s']],tx:[[140,165,'Eigenen Ball schützen – fremde Bälle rausschießen']]},
aw06:{s:[[80,90,'g','A'],[55,112,'g','B']],b:[[88,97]],p:[[85,84,128,62,'d'],[132,64,178,98,'d'],[62,106,105,84,'l'],[109,86,155,120,'l']],tx:[[140,30,'B ist der Schatten – kopiert jede Bewegung'],[140,160,'nach 1 Min. wechseln']]},
aw07:{s:[[62,58,'g'],[80,52,'g'],[72,72,'g'],[180,60,'g'],[220,100,'g'],[120,130,'g'],[190,140,'g']],z:[[46,38,52,48]],p:[[172,66,105,68,'l'],[128,124,90,85,'l']],tx:[[140,165,'Trainer ruft: 3! – sofort Dreiergruppen bilden']]},
aw08:{s:[[80,60,'g'],[200,55,'g'],[150,100,'g'],[70,125,'r','Z']],b:[[110,80],[230,90],[150,140]],p:[[158,96,195,63,'p'],[145,135,85,127,'p']],tx:[[70,145,'Zombie'],[140,25,'Treffer unter der Hüfte = Zombie'],[140,165,'Ball zurollen befreit']]},
aw09:{h:[[30,70],[74,70],[118,70],[162,70],[206,70],[250,70],[30,110],[74,110],[118,110],[162,110],[206,110],[250,110]],p:[[35,85,245,85,'l'],[245,97,35,97,'l']],b:[[30,90]],tx:[[140,40,'20-m-Gasse: hin und zurück'],[140,150,'Kniehub · Anfersen · Seitgalopp – Ball am Fuß']]},
aw10:{h:[[22,22,'r'],[258,22,'b'],[22,158,'y'],[258,158,'g']],s:[[120,80,'g'],[165,95,'g'],[135,120,'g']],b:[[127,87],[172,102],[142,127]],p:[[113,74,35,32,'l'],[158,88,40,35,'l']],tx:[[140,165,'Trainer ruft: ROT! – alle dribbeln zum roten Hütchen']]},
tw01:{tor:[[120,163,'h',40]],s:[[140,148,'b','TW']],h:[[60,105],[95,65],[140,48],[185,65],[220,105]],b:[[60,115],[95,75],[140,58],[185,75],[220,115]],p:[[66,112,130,143,'p'],[140,62,140,136,'p'],[214,112,150,143,'p']],tx:[[140,30,'5 Richtungen: flach · halbhoch · zentral']]},
tw02:{z:[[85,65,110,65]],s:[[140,100,'b','TW'],[140,35,'w','T']],b:[[75,122],[205,122]],p:[[132,42,82,115,'p'],[148,42,198,115,'p']],tx:[[140,165,'seitlich fallen – Ball mit beiden Händen sichern']]},
tw03:{tor:[[120,163,'h',40]],s:[[140,150,'b','TW'],[140,48,'w','T']],h:[[118,115],[162,115]],b:[[140,60]],p:[[140,64,140,140,'s']],tx:[[140,30,'Schuss durch das Hütchentor – blitzschnell reagieren']]},
tw04:{tor:[[120,163,'h',40]],s:[[140,148,'b','TW'],[140,40,'r','S']],b:[[147,49]],p:[[140,52,140,92,'d'],[140,140,140,112,'l']],tx:[[70,105,'rauslaufen?'],[215,105,'oder warten?'],[140,25,'Winkel verkürzen – groß machen']]},
tw05:{s:[[140,152,'b','TW']],b:[[148,160]],z:[[35,88,62,30],[109,58,62,30],[183,28,62,30]],p:[[132,146,60,122,'p'],[140,144,138,92,'l'],[150,146,210,62,'s']],tx:[[66,105,'10 m'],[140,75,'15 m'],[214,45,'20 m'],[140,172,'Abrollen · Abwurf · Abschlag']]},
tw06:{tor:[[120,163,'h',40]],leiter:[[132,55,60,'v']],s:[[140,40,'b','TW'],[70,120,'w','T']],b:[[80,128]],p:[[140,50,140,128,'l'],[78,125,128,150,'s']],tx:[[140,25,'durch die Leiter – sofort Schuss halten']]},
tw07:{wand:[[140,45,140,135]],z:[[55,60,70,60],[155,60,70,60]],s:[[75,90,'b','A'],[205,90,'b','B']],b:[[88,78]],p:[[92,74,195,74,'p']],tx:[[140,30,'über die Schnur werfen'],[140,160,'fangen, bevor der Ball den Boden berührt']]},
tw08:{tor:[[120,163,'h',40]],s:[[140,138,'b','TW'],[140,38,'w','T']],b:[[150,47]],p:[[145,50,152,115,'p']],tx:[[200,80,'hoher Ball'],[140,25,'am höchsten Punkt mit beiden Händen fangen']]},
tw09:{tor:[[30,22,'h',18],[131,14,'h',18],[232,22,'h',18]],s:[[39,45,'b'],[140,38,'b'],[241,45,'b'],[39,120,'g'],[140,130,'g'],[241,120,'g']],b:[[39,110],[140,120],[241,110]],p:[[39,112,39,55,'s'],[140,122,140,48,'s'],[241,112,241,55,'s']],tx:[[39,80,'flach'],[140,85,'halbhoch'],[241,80,'Volley'],[140,165,'alle 2 Min. rotieren']]},
tw10:{s:[[140,150,'b','TW'],[60,60,'g'],[140,38,'g'],[220,60,'g']],b:[[68,68]],p:[[68,62,130,42,'p'],[148,42,212,56,'p'],[214,68,150,144,'p'],[132,146,70,70,'p']],tx:[[140,170,'Rückpass annehmen – flach weiterspielen']]},
tw11:{tor:[[120,163,'h',40]],s:[[140,150,'b','TW'],[100,40,'r','A'],[180,40,'r','B']],b:[[107,49]],p:[[104,50,130,105,'d'],[186,48,212,105,'p'],[140,142,132,118,'l']],tx:[[140,25,'Situation lesen: rauslaufen oder im Tor bleiben?']]},
tw12:{tor:[[120,163,'h',40]],s:[[140,157,'b','TW'],[140,72,'r','S']],b:[[140,96]],p:[[140,100,125,158,'s']],tx:[[140,30,'mittig · Fuß auf der Linie · auf den Ballen wippen']]},
tw13:{h:[[30,90],[110,90]],s:[[140,48,'w','T'],[170,90,'b']],tor:[[228,78,'v',24]],p:[[38,90,100,90,'l'],[144,58,164,82,'p'],[178,88,222,88,'p']],tx:[[30,110,'Start'],[140,30,'werfen'],[140,165,'Sprint → fangen → ins Minitor treffen → zurück']]},
tw14:{s:[[140,152,'b','TW'],[70,108,'g'],[180,75,'g'],[230,38,'g']],b:[[148,160]],p:[[131,148,78,115,'p'],[138,143,174,84,'l'],[149,145,224,47,'s']],tx:[[52,125,'abrollen'],[210,90,'Abwurf'],[255,55,'Abschlag'],[140,172,'Trainer ruft vorher die Zielzone']]},
tw15:{tor:[[120,163,'h',40]],z:[[65,105,150,58]],s:[[140,150,'b','TW'],[140,58,'g','A'],[32,118,'g','B'],[225,75,'r','C']],b:[[147,67],[40,126],[232,84]],p:[[140,70,138,140,'s'],[42,122,118,142,'p'],[220,84,165,135,'d']],tx:[[140,25,'Trainer zeigt an: Schuss, Flanke oder 1 gegen 1']]},
ind01:{h:[[60,50],[140,40],[220,55],[70,120],[150,130],[225,115]],s:[[35,90,'g']],b:[[43,97]],p:[[42,84,55,58,'d'],[66,54,133,44,'d'],[147,46,213,58,'d']],tx:[[140,165,'enge Ballführung – an jedem Hütchen eine Finte']]},
ind02:{wand:[[45,22,235,22]],s:[[140,120,'g']],b:[[140,106]],p:[[137,103,133,30,'p'],[145,30,149,103,'p']],tx:[[140,45,'Wand'],[140,160,'Innenseite-Pass · Annahme mit der Sohle · beide Füße']]},
ind03:{tor:[[120,163,'h',40]],b:[[80,80],[96,80],[112,80]],s:[[128,88,'g']],p:[[133,97,126,160,'s'],[136,96,152,160,'s']],tx:[[140,30,'Serien: flach ins Eck · Spannstoß · Direktschuss']]},
ind04:{z:[[100,55,80,75]],s:[[140,92,'g']],b:[[140,105]],p:[[120,75,160,75,'d'],[160,112,120,112,'d']],tx:[[140,40,'kleiner Raum'],[140,160,'Jonglieren · Sohlenrollen · V-Ziehen']]},
ind05:{h:[[140,135],[140,60],[80,60],[200,60]],s:[[140,155,'g']],b:[[148,162]],p:[[140,148,140,70,'l'],[132,60,88,60,'l'],[90,68,194,68,'l']],tx:[[140,30,'T-Lauf: vor – seitwärts – seitwärts – rückwärts'],[140,172,'dazu Slalom + Reaktions-Sprints mit Ball']]},
ind06:{tor:[[216,163,'h',40]],h:[[55,105],[95,85],[135,105],[175,85]],s:[[25,120,'g']],b:[[33,127]],p:[[32,114,52,98,'d'],[60,100,92,90,'d'],[100,92,132,100,'d'],[142,100,172,90,'d'],[182,92,228,158,'s']],tx:[[140,35,'ALLES nur mit dem schwachen Fuß']]},
ind07:{s:[[90,110,'g'],[220,48,'w','T']],b:[[98,117]],p:[[97,104,150,80,'d']],tx:[[220,25,'zeigt 3 Finger'],[140,165,'Kopf hoch: Zahl laut rufen und weiterdribbeln']]},
ind08:{tor:[[122,14,'h',20]],h:[[228,58],[228,92]],s:[[140,90,'w','T'],[140,140,'g']],b:[[147,148]],p:[[132,132,114,40,'d'],[150,134,222,80,'p']],tx:[[62,80,'Weg frei = dribbeln'],[140,170,'Weg zu = abspielen aufs Hütchentor']]},
ind09:{s:[[180,58,'w','T'],[80,130,'g']],b:[[190,66]],p:[[86,122,118,96,'l'],[122,92,166,70,'l']],tx:[[140,165,'im Bogen anlaufen – vor dem Gegner Tempo drosseln'],[80,40,'nicht gerade drauf!']]},
ind10:{tor:[[120,163,'h',40]],s:[[140,88,'g'],[54,70,'w','T']],b:[[140,100]],p:[[140,104,135,158,'s']],tx:[[54,48,'zählt laut: 3-2-1'],[140,25,'1 Versuch – Körpersprache bleibt positiv']]},
ind11:{s:[[140,95,'g']],b:[[140,36],[42,95],[222,148]],p:[[140,42,140,84,'p'],[50,95,128,95,'p'],[216,142,152,104,'p'],[147,88,178,60,'d']],tx:[[210,45,'Mitnahme nach VORN'],[140,170,'Bälle von vorn, von der Seite, von hinten']]},
ind12:{s:[[200,58,'w','T'],[80,122,'g']],b:[[192,66]],p:[[86,116,128,88,'l'],[128,84,100,52,'l'],[192,62,108,52,'p']],tx:[[75,145,'hin – stoppen – scharf weg'],[140,25,'V-Lauf: lösen und Ball fordern']]},
ind13:{s:[[140,92,'g']],b:[[147,100]],p:[[148,86,235,50,'l'],[132,88,62,118,'l']],tx:[[228,35,'ADLER = breit'],[62,138,'IGEL = eng'],[140,168,'auf das Kommando sofort umschalten']]},
ind14:{tor:[[128,163,'h',24]],s:[[90,85,'g','A'],[180,60,'g','B']],b:[[98,93]],p:[[94,94,132,150,'l']],tx:[[90,65,'Augen zu'],[180,40,'ruft: LINKS! HIER!'],[140,30,'B dirigiert A nur mit der Stimme zum Tor']]},
ind15:{h:[[22,22,'r'],[258,22,'b'],[22,158,'y'],[110,90],[140,108],[170,90]],s:[[70,120,'g'],[42,42,'w','T']],b:[[78,127]],p:[[78,114,106,98,'d'],[116,98,138,102,'d'],[148,100,166,96,'d']],tx:[[42,25,'7+3=?'],[140,168,'dribbeln + rechnen – Fokus trotz Ablenkung']]},
tf093:{s:[[140,52,'g'],[183,72,'g'],[183,112,'g'],[140,132,'g'],[97,112,'g'],[97,72,'g']],tx:[[140,95,'NOCH!'],[140,25,'Kann ich nicht → Kann ich NOCH nicht'],[140,163,'alle rufen mit – Fehler sind Lernschritte']]},
tf094:{z:[[20,42,72,92],[104,42,72,92],[188,42,72,92]],tor:[[48,46,'h',16],[132,46,'h',16],[216,46,'h',16]],s:[[56,115,'g'],[56,75,'r'],[140,115,'g'],[140,75,'r'],[224,115,'g'],[224,75,'r']],tx:[[56,30,'Level 1'],[140,30,'Level 2'],[224,30,'Level 3'],[140,158,'Kind wählt selbst – Erfolg = eine Stufe hoch']]},
tf095:{s:[[45,130,'g']],b:[[53,137]],p:[[85,88,108,88,'l'],[172,88,196,88,'l']],tx:[[58,90,'1 Atemzug'],[140,90,'1× klatschen'],[228,90,'WEITER!'],[140,35,'feste 2-Sekunden-Routine nach jedem Fehler'],[140,160,'danach ist der Fehler gelöscht']]},
tf096:{s:[[140,50,'g'],[175,62,'g'],[190,92,'g'],[175,122,'g'],[140,134,'g'],[105,122,'g'],[90,92,'g'],[105,62,'g']],tx:[[140,95,'3 gute Dinge'],[140,25,'Abschlusskreis'],[140,163,'jeder nennt, was einem MITSPIELER gut gelang']]},
tf097:{s:[[140,58,'g','C'],[80,120,'g'],[110,132,'g'],[140,138,'g'],[170,132,'g'],[200,120,'g']],tx:[[140,35,'Kapitän des Tages'],[140,165,'sagt das Aufwärmen an – JEDES Kind kommt dran']]},
tf098:{tor:[[120,163,'h',40]],s:[[140,152,'b','TW'],[140,80,'g','S'],[62,166,'g'],[84,171,'g'],[196,171,'g'],[218,166,'g']],b:[[140,105]],p:[[140,110,132,158,'s']],tx:[[140,30,'Publikum zählt: 5 – 4 – 3 – 2 – 1'],[140,60,'danach jubeln IMMER alle']]},
tf099:{tor:[[14,78,'v',24],[259,78,'v',24]],s:[[80,60,'g'],[110,110,'g'],[85,140,'g'],[200,60,'r'],[170,110,'r'],[195,140,'r']],b:[[118,102]],p:[[118,104,155,95,'d']],tx:[[140,30,'Finte versucht = 2 Punkte · schwacher Fuß = 2 Punkte'],[140,165,'Mut zählt – egal ob es klappt']]},
tf100:{tor:[[216,163,'h',40]],h:[[60,90],[100,110],[140,90]],s:[[28,105,'g','J']],b:[[36,112]],p:[[36,100,57,94,'d'],[66,96,97,104,'d'],[106,104,137,96,'d'],[147,96,228,158,'s']],tx:[[140,30,'Und er zieht vorbei … was für ein Tempo!'],[140,172,'den eigenen Lauf laut und POSITIV kommentieren']]},
tf101:{s:[[140,45,'w','T'],[140,120,'b','TW']],b:[[150,54]],p:[[133,52,128,88,'p'],[147,54,158,105,'p']],tx:[[85,75,'hoch = W-Griff'],[205,95,'flach = Korb'],[140,165,'aus 3–4 m zuwerfen – Ball vor dem Gesicht fangen']]},
tf102:{h:[[140,92],[140,42],[192,92],[140,142],[88,92]],s:[[122,108,'b','TW']],p:[[140,84,140,52,'l'],[148,92,184,92,'l'],[140,100,140,134,'l'],[132,92,96,92,'l']],tx:[[140,25,'Sidesteps zum gezeigten Hütchen – nicht überkreuzen'],[140,168,'antippen, zurück zur Mitte, Grundstellung']]},
tf103:{z:[[85,55,110,75]],s:[[140,85,'b','TW'],[48,130,'w','T']],b:[[58,137]],p:[[125,95,160,115,'d'],[56,128,105,112,'p']],tx:[[140,40,'weicher Boden / Matte'],[140,165,'Purzelbaum · rollen · erstes Hechten']]},
tf104:{tor:[[120,163,'h',40]],s:[[140,150,'g','TW'],[100,30,'g'],[140,30,'g'],[180,30,'g']],h:[[140,62]],b:[[100,40],[140,40],[180,40]],p:[[140,68,140,108,'d'],[140,110,132,158,'s'],[152,146,186,40,'l']],tx:[[230,95,'Wechsel'],[140,20,'4–5 Schüsse, dann wechselt der Torwart']]},
tf105:{z:[[70,38,140,104]],s:[[140,46,'g'],[78,90,'g'],[202,90,'g'],[140,134,'g'],[125,90,'r'],[157,90,'r']],b:[[130,52]],p:[[132,52,86,84,'p'],[82,98,132,130,'p'],[148,130,196,97,'p'],[196,84,148,50,'p']],tx:[[140,25,'Raute halten: Zentrum · Flitzer · Spitze'],[140,160,'nach dem Pass sofort rotieren']]},
tf106:{tor:[[20,163,'h',16],[244,163,'h',16],[20,10,'h',16],[244,10,'h',16]],s:[[80,60,'r'],[140,50,'r'],[200,60,'r'],[140,80,'r'],[80,120,'g'],[140,130,'g'],[200,120,'g'],[140,105,'g']],b:[[148,112]],p:[[148,116,196,126,'p'],[208,124,240,152,'p']],tx:[[140,25,'kein Tor durch die Mitte'],[140,165,'nur breit über die Flitzer kommt man zum Abschluss']]},
/* v549 – Fünf Skizzen aus den Anfangstagen neu gezogen.

   Sie waren von Hand als SVG geschrieben, lange vor der Pfeil-Legende (v512) und vor
   den Linien (v517). Drei Dinge gingen dabei schief, und zwar bei allen fünf gleich:

   1. Der ÜBUNGSNAME stand als halbdurchsichtiger Text IM Feld – auf dem Rasen #2d6a2d
      kommt rgba(255,255,255,.5) auf 2,9:1 und liegt damit unter den 4,5:1 aus
      CLAUDE.md. Er stand ausserdem doppelt: die Überschrift steht direkt darüber.
   2. Die Pfeile trugen keine der vier Legendenfarben. Unter jeder Skizze steht aber
      die Legende – sie beschrieb eine Zeichnung, die es so nicht gab.
   3. „4gg2 Ballbesitz" enthielt ZWEI <svg>-Elemente; das erste war ein leeres Feld.
      Genau das ist die Skizze, die im Übungsdetail leer aussah.

   Als Spec gezeichnet stimmen Legende, Kontrast, Bildexport und Handy-Maßstab von
   selbst – sie entstehen alle aus _skz. Der Name steht nicht mehr im Bild. */
tf032:{z:[[30,30,220,120]],tor:[[20,72,'v',36],[252,72,'v',36]],
  s:[[100,90,'g','A'],[180,90,'r','B']],b:[[110,98]],
  p:[[108,84,138,70,'d'],[150,70,244,84,'s'],[174,84,154,76,'l']],
  tx:[[140,20,'10 x 8 m – jeder verteidigt ein Minitor'],[140,168,'kein Abspiel: allein abschließen']]},
tf016:{z:[[60,26,160,128]],
  s:[[140,26,'g','A'],[220,90,'g','B'],[140,154,'g','C'],[60,90,'g','D'],[116,74,'r','X'],[164,106,'r','Y']],
  b:[[148,34]],p:[[148,32,212,82,'p'],[216,98,148,146,'p']],
  tx:[[140,16,'12 x 12 m – vier außen, zwei innen'],[140,172,'höchstens zwei Kontakte · 10 Pässe = 1 Punkt']]},
tf040:{z:[[30,32,220,116]],tor:[[20,74,'v',32],[252,74,'v',32]],
  s:[[110,70,'g'],[126,116,'g'],[176,66,'r'],[190,112,'r']],b:[[184,74]],
  p:[[118,76,166,72,'l'],[132,110,180,84,'l']],
  tx:[[140,22,'15 x 12 m – nach dem Ballverlust 5 Sekunden pressen'],[140,168,'in 5 Sekunden zurückerobert = 2 Bonuspunkte']]},
tf023:{z:[[26,28,228,124]],
  tor:[[18,44,'v',24],[18,110,'v',24],[254,44,'v',24],[254,110,'v',24]],
  s:[[92,60,'g'],[88,120,'g'],[132,92,'g'],[196,62,'r'],[192,122,'r'],[164,100,'r']],
  b:[[142,104]],p:[[96,66,126,86,'p']],
  tx:[[140,18,'20 x 18 m – 3 gegen 3 auf vier Minitore'],[140,170,'vor der Annahme umschauen – sonst Ball zum Gegner']]},
tf034:{tor:[[110,6,'h',60,'j']],
  h:[[70,110,'y'],[140,118,'y'],[210,110,'y']],
  s:[[70,128,'g'],[140,136,'g'],[210,128,'g']],
  b:[[78,136],[148,144],[218,136]],
  p:[[74,118,128,24,'s'],[140,126,140,24,'s'],[206,118,152,24,'s']],
  tx:[[140,158,'links und rechts 2 Punkte · Mitte 1 · schwacher Fuß +1'],[140,174,'je 5 Schüsse von jeder Position, 8–12 m']]},
/* v551 – Dieselben drei Fehler, zehn weitere Übungen. Sie kamen mit den dreizehn
   Einheiten aus dem Ausbildungskonzept in die Vorlagen und damit in den Prüfbereich
   von v549: Name im Bild, halbdurchsichtiger Text auf dem Rasen (2,9:1), Pfeile in
   Farben, die die Legende darunter nicht kennt. Als Spec neu gezeichnet. */
tf045:{z:[[10,40,80,100],[100,40,80,100],[190,40,80,100]],
  s:[[34,70,'g'],[66,110,'r'],[124,70,'g'],[156,110,'r'],[214,70,'g'],[246,110,'r']],
  b:[[42,78],[132,78],[222,78]],
  p:[[62,32,118,32,'l'],[218,152,162,152,'l']],
  tx:[[140,16,'drei Felder – rechts das Königsfeld'],[140,172,'gewonnen: ein Feld nach rechts · verloren: nach links']]},
tf038:{tor:[[250,60,'v',60,'j']],
  s:[[40,90,'b','T'],[110,90,'g','A']],b:[[50,96]],
  p:[[52,90,100,90,'p'],[120,88,180,80,'d'],[190,78,244,74,'s']],
  tx:[[140,20,'Zuspiel von hinten – erste Berührung nach vorn'],[140,166,'nicht stoppen, nicht seitlich: sofort Richtung Tor']]},
tf037:{z:[[30,34,220,112]],tor:[[20,74,'v',32],[252,74,'v',32]],
  s:[[100,90,'g','A'],[165,90,'r','V']],b:[[108,98]],
  p:[[108,100,138,128,'d'],[144,126,210,96,'d'],[216,92,244,86,'s']],
  tx:[[140,24,'1 gegen 1 auf zwei Minitore'],[140,158,'Punkt nur nach einer Finte'],[140,172,'Übersteiger · Innen-Außen · Körpertäuschung']]},
tf035:{tor:[[250,66,'v',48,'j']],
  h:[[40,62,'y'],[62,104,'y'],[84,62,'y'],[106,104,'y'],[128,62,'y'],[150,104,'y'],[178,70,'b'],[178,102,'b'],[208,70,'b'],[208,102,'b']],
  s:[[22,84,'g']],b:[[30,90]],
  p:[[30,88,48,66,'d'],[52,70,72,104,'d'],[76,100,96,66,'d'],[100,70,120,104,'d'],[124,100,168,86,'d'],[188,86,202,86,'d'],[216,86,244,88,'s']],
  tx:[[140,20,'Slalom · zwei Dribbeltore · Abschluss'],[140,166,'so schnell wie möglich – Zeit messen ist freiwillig']]},
tf020:{z:[[26,28,228,124]],
  tor:[[18,44,'v',24],[18,110,'v',24],[254,44,'v',24],[254,110,'v',24]],
  li:[[80,32,80,148,'sz'],[200,32,200,148,'sz']],
  s:[[120,90,'g'],[224,64,'g'],[226,118,'g'],[166,72,'r'],[170,116,'r'],[214,92,'r']],
  b:[[128,98]],p:[[128,88,214,68,'p'],[224,74,224,108,'p'],[236,122,250,122,'s']],
  tx:[[140,18,'3 gegen 3 auf vier Minitore'],[140,166,'Tor zählt nur nach Querpass in der gelben Zone']]},
tf013:{z:[[26,28,228,124]],
  tor:[[18,44,'v',24],[18,110,'v',24],[254,44,'v',24],[254,110,'v',24]],
  s:[[90,62,'g','1'],[96,122,'g','2'],[140,92,'g','3'],[190,62,'r'],[196,122,'r'],[166,92,'r']],
  b:[[98,70]],p:[[98,68,132,86,'p'],[140,100,102,116,'p']],
  tx:[[140,18,'3 gegen 3 auf vier Minitore'],[140,166,'Tor zählt erst, wenn jeder einmal gepasst hat']]},
tf015:{s:[[90,58,'g','A'],[190,58,'g','B'],[140,132,'g','C']],b:[[98,66]],
  p:[[98,62,182,60,'p'],[190,68,148,124,'p'],[132,128,96,68,'p'],[94,44,184,44,'l']],
  tx:[[140,20,'Dreieck, 8–10 m Abstand'],[140,166,'passen und sofort zur Position des Empfängers laufen']]},
tf002:{tor:[[8,60,'v',60,'j'],[262,60,'v',60,'j']],
  s:[[26,90,'g','TW'],[64,90,'g','A'],[102,50,'g','F'],[102,130,'g','F'],[138,74,'g','J'],
     [170,106,'r','J'],[196,50,'r','F'],[196,130,'r','F'],[216,90,'r','A'],[254,90,'r','TW']],
  b:[[146,82]],
  tx:[[140,16,'4+1 gegen 4+1 · A Aufpasser · F Flitzer · J Jäger'],[140,172,'Tor zählt nur, wenn alle vier ihre Position halten']]},
tf001:{z:[[26,26,228,128]],
  tor:[[18,42,'v',24],[18,112,'v',24],[254,42,'v',24],[254,112,'v',24]],
  h:[[50,69,'y'],[90,69,'y'],[130,69,'y'],[170,69,'y'],[210,69,'y'],[50,111,'y'],[90,111,'y'],[130,111,'y'],[170,111,'y'],[210,111,'y']],
  s:[[70,46,'g'],[110,90,'g'],[80,134,'g'],[200,46,'r'],[170,90,'r'],[196,134,'r']],
  b:[[78,54]],p:[[78,52,102,84,'p']],
  tx:[[140,16,'drei Korridore – jeder hält seinen'],[140,170,'Tor nur, wenn alle drei Korridore besetzt sind']]},
tf052:{z:[[26,26,228,112]],
  s:[[150,84,'r'],[200,60,'r'],[206,120,'r'],[120,74,'g'],[126,110,'g'],[158,116,'g']],
  b:[[158,92]],
  p:[[92,56,112,68,'l'],[98,134,118,116,'l'],[184,140,166,124,'l']],
  tx:[[140,20,'nach dem Ballverlust: alle eng um den Ball'],[140,158,'Eroberung im Igel = 2 Bonuspunkte'],[140,172,'danach „Adler!“ – sofort wieder breit machen']]},
tf107:{h:[[100,16,'r'],[124,16,'r'],[264,78,'b'],[264,102,'b'],[100,166,'y'],[124,166,'y'],[16,78,'g'],[16,102,'g']],s:[[100,70,'g'],[170,90,'g'],[120,120,'g'],[200,55,'g']],b:[[107,77],[177,97],[127,127],[207,62]],p:[[104,62,110,28,'d'],[164,84,120,40,'d']],tx:[[140,150,'Farbe gerufen → mit Ball durchs passende Hütchentor']]},
/* v597 – Elf Rauten-Übungen aus dem Altbestand als Spec.

   Sie waren aus den Anfangstagen von Hand als SVG geschrieben und trugen dieselben drei
   Fehler wie die fünf aus v549: der Übungsname stand halbdurchsichtig IM Bild (2,9:1 auf
   dem Rasen, und er steht ohnehin als Überschrift darüber), die Pfeile trugen keine der
   vier Legendenfarben, und die Legende darunter beschrieb damit eine Zeichnung, die es so
   nicht gab. Aus der Spec gezeichnet stimmen Legende, Kontrast, Bildexport und
   Handy-Maßstab von selbst.

   Übertragen, nicht neu erfunden: Positionen, Tore, Zonen und Texte stehen dort, wo sie
   vorher standen. Wo zwei Beschriftungen einander überlagerten oder eine unter dem
   Bildrand lag („Mini-Turnier Raute“ schrieb C1–C3 auf y=186 bei 180 Höhe), ist sie
   gerückt. Die Pfeilart kommt aus dem Ablauf der Übung — was dort Pass heißt, ist ein
   Pass, was Sprint heißt, ein Laufweg. */
tf003:{h:[[90,19,'y'],[190,19,'y'],[90,159,'y'],[190,159,'y']],
  s:[[140,35,'g'],[60,90,'g'],[220,90,'g'],[140,145,'g'],[140,90,'y','TW']],
  p:[[100,90,60,90,'l'],[180,90,220,90,'l'],[140,110,140,48,'l'],[140,70,140,134,'l']],
  tx:[[140,53,'Jäger'],[60,108,'Flitzer L'],[220,108,'Flitzer R'],[140,166,'Aufpasser']]},
tf004:{li:[[140,20,140,160,'m'],[20,90,260,90,'m']],
  s:[[70,60,'g','A'],[210,120,'g','S']],
  b:[[79,67]],
  p:[[78,68,200,112,'l']],
  tx:[[200,38,'größter Abstand'],[196,150,'Schatten bleibt gegenüber']]},
tf005:{tor:[[20,78,'v',24],[253,78,'v',24]],
  s:[[36,90,'y','TW'],[80,90,'g'],[140,50,'g'],[140,130,'g'],[220,90,'g']],
  b:[[44,98]],
  p:[[46,90,70,90,'p',1],[86,80,130,56,'p',2],[86,100,130,124,'p',2],[148,54,210,84,'p',3]],
  tx:[[80,110,'Aufpasser'],[140,68,'Flitzer L'],[140,148,'Flitzer R'],[220,110,'Jäger'],[140,92,'oder']]},
tf006:{ger:[[250,24,'trainer','w']],
  h:[[140,34,'y'],[50,89,'y'],[230,89,'y'],[140,154,'y']],
  s:[[100,80,'g'],[160,100,'g'],[120,130,'r'],[170,60,'r']],
  p:[[100,72,138,46,'l'],[168,98,222,92,'l']],
  tx:[[140,20,'Jäger'],[50,108,'Flitzer L'],[230,108,'Flitzer R'],[140,172,'Aufpasser']]},
tf007:{tor:[[253,78,'v',24]],
  s:[[20,90,'y','TW'],[90,90,'g'],[160,40,'g'],[160,140,'g'],[230,90,'g']],
  b:[[28,98]],
  p:[[30,86,80,86,'p',1],[98,80,150,46,'p',2],[160,50,160,130,'p',3],[168,134,222,96,'p',4]],
  tx:[[90,110,'Aufpasser'],[160,58,'Flitzer L'],[160,158,'Flitzer R'],[230,110,'Jäger']]},
tf008:{tor:[[18,50,'h',24],[18,123,'h',24],[238,50,'h',24],[238,123,'h',24]],
  li:[[140,20,140,160,'m']],
  s:[[70,90,'g','A'],[126,58,'g','Z'],[126,122,'g'],[210,90,'r','B'],[154,58,'r','Z'],[154,122,'r']],
  tx:[[70,110,'Aufpasser'],[210,110,'Aufpasser'],[140,172,'Tor zählt nur im Dreieck']]},
tf009:{tor:[[253,78,'v',24]],
  s:[[60,148,'g','A'],[180,50,'g'],[40,50,'g'],[40,100,'g']],
  b:[[68,156]],
  p:[[68,140,170,58,'p'],[188,58,248,84,'s']],
  tx:[[60,168,'hinten: Aufpasser'],[180,68,'Jäger'],[40,32,'Flitzer L'],[40,118,'Flitzer R'],[168,140,'Steilpass in den Lauf']]},
tf010:{tor:[[20,78,'v',24],[253,78,'v',24]],
  s:[[36,90,'y','TW'],[244,90,'y','TW'],[90,90,'g'],[150,40,'g'],[150,140,'g'],[200,90,'g'],[170,90,'r','B']],
  b:[[178,97]],
  p:[[192,90,180,90,'l'],[150,50,150,80,'l'],[150,130,150,100,'l']],
  tx:[[90,110,'Aufpasser'],[150,58,'Flitzer L'],[150,158,'Flitzer R'],[200,110,'Jäger'],[185,72,'PRESS!']]},
tf011:{tor:[[30,78,'v',24],[243,78,'v',24]],
  z:[[100,50,80,80]],
  s:[[140,55,'g'],[100,90,'g'],[180,90,'g'],[140,125,'g']],
  p:[[140,116,140,66,'l']],
  tx:[[140,38,'Jäger'],[100,110,'Flitzer L'],[180,110,'Flitzer R'],[140,145,'Aufpasser'],[204,66,'3 Sek!']]},
tf012:{tor:[[20,78,'v',24],[253,78,'v',24]],
  s:[[80,90,'g'],[120,50,'g'],[120,130,'g'],[200,90,'r'],[160,50,'r'],[160,130,'r'],[120,166,'w','C1'],[140,166,'w','C2'],[160,166,'w','C3']],
  tx:[[80,110,'Aufpasser'],[120,68,'Flitzer L'],[120,148,'Flitzer R'],[200,110,'Aufpasser'],[215,168,'Team C wartet']]},
tf051:{li:[[140,20,140,160,'m']],
  kr:[[210,80,22]],
  s:[[30,60,'g'],[70,40,'g'],[110,60,'g'],[70,90,'g'],[195,75,'r'],[215,65,'r'],[225,85,'r'],[205,95,'r']],
  tx:[[70,15,'ADLER – breit'],[210,15,'IGEL – eng'],[30,80,'Flitzer L'],[70,29,'Jäger'],[110,80,'Flitzer R'],[70,110,'Aufpasser'],[210,130,'eng zusammen']]},
/* v599 – Zweite Etappe des Altbestands: Pressing und Abschluss.

   Dieselbe Arbeit wie in v597, dieselben drei Fehler. Neu ist, dass „Spieler + Ball"
   (v598) hier zum ersten Mal trägt: Wo eine Übung „der Ballführende" meint, steht der Ball
   jetzt AM Kind statt daneben — beim „Fangspiel mit Ball" bekommen alle sechs Dribbler
   einen, und die Materialzeile zählt sie richtig, statt bei null zu bleiben. */
tf039:{tor:[[253,78,'v',24]],
  s:[[100,70,'g'],[100,110,'g'],[60,90,'g'],[180,70,'r','B'],[180,110,'r']],
  b:[[155,90]],
  p:[[100,75,148,88,'l'],[100,105,148,92,'l']],
  tx:[[140,52,'PFEIFE!'],[140,145,'drei Schritte sofort zum Ball']]},
tf041:{tor:[[20,78,'v',24],[253,78,'v',24]],
  z:[[110,60,60,60]],
  s:[[140,90,'g','','b']],
  p:[[140,82,140,44,'l'],[140,98,140,142,'l']],
  tx:[[190,46,'Angriff!'],[180,152,'Press!']]},
tf042:{tor:[[20,78,'v',24],[253,78,'v',24]],
  s:[[160,70,'r','B','b'],[110,75,'g','A']],
  p:[[118,76,150,74,'l']],
  tx:[[125,44,'+1 Punkt für die Eroberung']]},
tf043:{z:[[200,20,60,140]],
  s:[[160,90,'r','','b'],[110,80,'g','V1'],[130,110,'g','V2']],
  p:[[118,82,150,88,'l'],[170,92,206,92,'d']],
  tx:[[230,14,'Seitenlinie'],[186,70,'drücken!'],[120,140,'V2 schließt den Rückpassweg']]},
tf044:{tor:[[253,78,'v',24]],
  z:[[180,25,80,140]],
  s:[[220,90,'g'],[240,70,'r','B','b']],
  p:[[220,84,234,74,'l']],
  tx:[[220,18,'Angriffsdrittel'],[220,110,'Jäger'],[220,145,'5 Sek. allein']]},
tf046:{tor:[[128,20,'h',24]],
  s:[[140,36,'y','TW'],[140,100,'g','','b'],[60,130,'g'],[100,130,'g'],[180,130,'g'],[220,130,'g']],
  p:[[140,92,140,44,'s']],
  tx:[[140,155,'die anderen warten und zählen mit']]},
tf047:{s:[[60,60,'g','','b'],[100,130,'g','','b'],[180,50,'g','','b'],[200,130,'g','','b'],[140,70,'g','','b'],[80,100,'g','','b'],[130,110,'r','F1'],[170,90,'r','F2']],
  kr:[[100,130,14]],
  p:[[130,105,104,124,'l'],[170,85,178,62,'l']],
  tx:[[140,164,'berührt = Eisblock, bis jemand durchdribbelt']]},
tf048:{z:[[15,30,75,120],[102,30,75,120],[189,30,75,120]],
  s:[[35,90,'g'],[65,90,'r'],[122,90,'g'],[152,90,'r'],[209,90,'g'],[239,90,'r']],
  tx:[[52,22,'Feld 1'],[139,22,'Feld 2'],[226,22,'Feld 3'],[140,166,'jedes Team gegen jedes, 5 Minuten']]},
tf049:{tor:[[20,78,'v',24],[253,78,'v',24]],
  kr:[[36,90,16],[244,90,16]],
  s:[[36,90,'y','TW'],[244,90,'y','TW'],[100,70,'g'],[100,110,'g'],[160,70,'r'],[160,110,'r']],
  tx:[[140,150,'alle rotieren ins Tor']]},
tf050:{s:[[60,60,'g','','b'],[120,40,'g'],[200,50,'r'],[80,120,'r'],[160,130,'g'],[220,110,'r'],[140,80,'g']],
  tx:[[140,158,'ohne Vorgaben – Trainer beobachtet nur']]},
/* v600 – Dritte und letzte Etappe des Altbestands: Passspiel, Wahrnehmung, Technik.

   Damit ist keine handgezeichnete Skizze mehr übrig, die den Übungsnamen ins Bild
   schreibt, halbdurchsichtigen Text auf den Rasen setzt oder Pfeile führt, die zu keiner
   Legende passen. Beim „Ansage-Passspiel“ stand zusätzlich etwas im Bild, was dort nie
   hingehört hat: drei Vornamen als Beispiel. An ihrer Stelle stehen jetzt A, B und C —
   dieselben Kürzel wie überall sonst.

   Sieben dieser sechzehn sind Regeln, keine Aufbauten („gilt in jeder Spielform“). Sie
   zeigen deshalb die Situation, in der die Regel greift, und sagen im Text, was zu tun
   ist — statt ein Feld zu zeichnen, das es nicht gibt. */
tf014:{s:[[50,90,'g','A','b'],[230,90,'g','B']],
  p:[[222,90,165,90,'l',1],[160,86,220,58,'l',2],[58,86,210,56,'p',3]],
  tx:[[160,112,'hier dreht B ab'],[140,166,'der Pass kommt erst nach der Drehung']]},
tf017:{tor:[[253,78,'v',24]],
  s:[[50,90,'g','A','b'],[160,90,'g','B']],
  p:[[58,84,150,84,'p',1],[152,98,90,98,'p',2],[96,106,200,96,'l',3],[210,92,248,90,'s',4]],
  tx:[[105,70,'B ist die Wand'],[140,166,'nach dem Pass sofort weiterlaufen']]},
tf018:{s:[[80,80,'g','A','b'],[200,80,'g','B'],[140,140,'g','C']],
  p:[[88,76,192,76,'p']],
  tx:[[140,48,'erst rufen: „B!“ – dann passen'],[140,166,'ohne Ansage zählt der Pass nicht']]},
tf019:{tor:[[253,78,'v',24]],
  s:[[200,90,'g','T'],[140,60,'g','V']],
  p:[[148,66,192,84,'p',1],[209,88,248,88,'s',2]],
  tx:[[140,34,'V legt auf, T trifft'],[140,140,'das Tor zählt erst, wenn T den Vorlagengeber lobt']]},
tf021:{li:[[30,20,30,160,'m']],
  tor:[[253,78,'v',24]],
  s:[[40,70,'g','A','b'],[40,110,'g','B']],
  p:[[60,84,95,104,'p',1],[102,100,150,74,'p',2],[157,78,200,104,'p',3],[208,100,248,92,'s',4]],
  tx:[[34,170,'Start'],[140,30,'höchstens fünf Schritte ohne Pass']]},
tf022:{z:[[80,40,120,100]],
  h:[[80,40,'y'],[200,40,'y'],[200,140,'y'],[80,140,'y']],
  s:[[96,52,'g','A','b'],[184,52,'g','B'],[184,128,'g','C'],[96,128,'g','D']],
  p:[[104,52,176,52,'p',1],[184,60,184,120,'l',2],[176,128,104,128,'p',3],[96,120,96,60,'l',4]],
  tx:[[140,26,'Pass spielen – dann zur Position des Empfängers'],[140,166,'A → B → C → D, immer hinterherlaufen']]},
tf024:{dtor:[[40,30,26,'h','h','r'],[214,30,26,'h','h','b'],[127,152,26,'h','h','g']],
  ger:[[250,20,'trainer','w']],
  s:[[140,90,'g','','b']],
  p:[[132,84,62,42,'d',1]],
  tx:[[53,22,'rot'],[227,22,'blau'],[140,144,'grün'],[140,172,'Trainer ruft die Farbe – sofort durch dieses Tor']]},
tf025:{z:[[140,30,110,120]],
  s:[[160,60,'g'],[200,90,'g'],[170,130,'g'],[220,75,'r'],[100,50,'g'],[70,80,'r'],[90,120,'r']],
  tx:[[195,22,'hier drei gegen einen'],[140,166,'wer die Überzahl erkennt, ruft sie laut aus']]},
tf026:{kr:[[140,90,34]],
  s:[[140,90,'g','A','b'],[80,50,'g','B'],[200,130,'g','C']],
  p:[[140,82,88,58,'p']],
  tx:[[140,26,'A schaut drei Sekunden und dreht sich weg'],[140,166,'dann blind passen – wo stand B?']]},
tf027:{li:[[140,20,140,160,'m']],
  s:[[80,60,'g'],[100,110,'g'],[80,130,'r'],[180,50,'r'],[200,90,'g','?'],[180,130,'r'],[215,140,'g'],[60,90,'g']],
  tx:[[70,32,'linke Hälfte'],[210,32,'rechte Hälfte'],[140,172,'„Wie viele stehen links?“ – sofort antworten']]},
tf028:{ger:[[50,90,'trainer','w']],
  s:[[200,90,'g','?']],
  b:[[64,98]],
  p:[[72,92,188,90,'p']],
  tx:[[60,122,'Trainer zeigt Finger'],[140,166,'erst die Zahl nennen, dann kommt der Ball']]},
tf029:{tor:[[20,78,'v',24]],
  s:[[180,70,'r','A','b'],[200,110,'r','B'],[130,70,'g','V1'],[108,92,'g','V2']],
  p:[[138,70,172,72,'l',1],[96,104,118,80,'l',2]],
  tx:[[140,34,'V1 presst den Ballführenden'],[140,150,'V2 steht halb hinter V1 und sichert ab']]},
tf030:{kr:[[140,100,32]],
  s:[[140,100,'g','','b'],[80,50,'r'],[200,60,'g'],[200,140,'r']],
  tx:[[140,34,'einmal den Kopf drehen, bevor der Ball kommt'],[140,168,'wer geschaut hat, weiß schon, wohin er spielt']]},
tf031:{s:[[55,50,'g','','b'],[140,34,'g','','b'],[225,50,'g','','b'],[55,130,'g','','b'],[140,150,'g','','b'],[225,130,'g','','b'],[100,105,'g','','b'],[180,105,'g','','b']],
  tx:[[140,18,'jedes Kind dribbelt mit eigenem Ball'],[140,88,'„Links!“ · „Rechts!“ · „Schnell!“'],[140,172,'auf „Einfrieren!“ den Ball stoppen und umschauen']]},
tf033:{z:[[90,40,100,100]],
  li:[[140,40,140,140,'m']],
  s:[[112,90,'g','A','b'],[168,90,'r','B','b']],
  p:[[112,82,112,54,'d'],[168,82,168,54,'d']],
  tx:[[140,30,'die Linie in der Mitte ist der Spiegel'],[140,166,'B macht jede Bewegung von A nach']]},
tf036:{s:[[80,90,'g','A','b'],[200,90,'g','B']],
  p:[[88,86,192,86,'p']],
  tx:[[140,40,'für die ganze Einheit: nur der schwache Fuß'],[140,150,'der starke Fuß ist nur noch Standbein']]}
};
// Fehlende Skizzen aus den Specs erzeugen – vorhandene, handgezeichnete SVGs bleiben unangetastet.
TRAININGSFORMEN.forEach(f=>{if((!f.svg||f.svg.length<=10)&&f.id&&TF_SKIZZEN[f.id])f.svg=_skz(TF_SKIZZEN[f.id]);});

/* ═══════════════════════════════════════════════════════════════════════════
   v541 – VORSCHLAG: Spielform, Übungsform oder keines von beidem

   Die Einordnung selbst lebt in `team_config.uebung_art` und gehört dem Trainer
   (seit v533). Bis hierher war sie für fast alle Übungen leer, und leer heißt
   für die Nettospielzeit: „zählt mit, könnte aber falsch sein".

   Diese Liste ist ein VORSCHLAG, keine Einordnung. Sie wird nirgends stillschweigend
   angewendet: die Durchsicht im Übungen-Reiter zeigt sie an, und erst ein Tipp auf
   „Einordnung übernehmen" schreibt sie in team_config. Bis dahin gilt eine Übung
   weiter als nicht eingeordnet.

   Angelegt wurde sie nach der Unterscheidung, die auch in der Hilfe steht:
   - `spiel`  – das Kind entscheidet selbst: es gibt einen echten Gegner und einen
                Ausgang (Tor, Ballbesitz, Duell gewonnen).
   - `uebung` – der Ablauf ist vorgegeben: Parcours, Passfolge, Technikwiederholung.
   - `weder`  – keines von beidem: Koordination, Laufschule, Athletik, Fallschule,
                Rituale. Diese Übungen dürfen nicht in den Spielform-Anteil einfließen,
                weder als Spielform noch als Übungsform gegengerechnet – ein Zwang zur
                Wahl hätte die Prozentzahl verzerrt.

   Der Schlüssel ist der NAME, wie überall bei uebung_art. Wird eine Übung umbenannt,
   fällt sie hier heraus und steht wieder in der Durchsicht.
   ═══════════════════════════════════════════════════════════════════════════ */
const UEBUNG_ART_VORSCHLAG={
  /* Aufwärmen */
  "Hai & Fische":"spiel",
  "Feuer-Wasser-Sturm mit Ball":"weder",
  "Tierbewegungen-Parcours":"weder",
  "Nummernlauf":"weder",
  "Ball-Dieb":"spiel",
  "Schattenläufer":"weder",
  "Atomspiel":"weder",
  "Zombieball":"spiel",
  "Lauf-ABC mit Ball":"weder",
  "Farben-Dribbeln":"uebung",
  "Chaos-Dribbling mit Kommando":"uebung",
  /* Technik */
  "Autodrom Beidfüßig":"uebung",
  "1gg1 Tore-Duell":"spiel",
  "Spiegeldribbling":"uebung",
  "Torschuss-Wettbewerb":"uebung",
  "Dribbling-Parcours":"uebung",
  "Schwacher-Fuß-Tag":"weder",
  "Finte-Wettkampf":"spiel",
  "Erste Mitnahme vorwärts":"uebung",
  /* Wahrnehmung */
  "Scanning-Funino":"spiel",
  "Farb-Entscheidung":"uebung",
  "Überzahl-Erkennung":"spiel",
  "Blinde Pässe":"uebung",
  "Raumaufteilung-Quiz":"spiel",
  "Kopf-hoch-Signale":"uebung",
  "Schatten-Pressing":"uebung",
  "Blick-vor-Ball":"uebung",
  /* Passspiel */
  "Pflichtpass-Funino":"spiel",
  "Komm-Geh-Passspiel":"uebung",
  "Dreieck-Passspiel":"uebung",
  "4gg2 Ballbesitz":"spiel",
  "Wandpass-Serie":"uebung",
  "Ansage-Passspiel":"uebung",
  "Lobpflicht nach Tor":"spiel",
  "Quer vor Tor":"spiel",
  "Ball-Staffel Paare":"uebung",
  "Pass und Nachlaufen":"uebung",
  "Zwei-Tore-Umschalten":"spiel",
  /* Raute */
  "Korridor-Funino":"spiel",
  "4+1 Lebende Raute":"spiel",
  "Rauten-Staffel":"uebung",
  "Schattenspieler":"uebung",
  "TW-Einwurf-Angriff":"uebung",
  "Positions-Bingo":"uebung",
  "Breiten-Spiel 4gg0":"uebung",
  "Dreiecksduell 3gg3":"spiel",
  "Aufpasser-Steilpass":"uebung",
  "Pressing-Raute 5gg5":"spiel",
  "Rauten-Umschalten":"uebung",
  "Mini-Turnier Raute":"spiel",
  "Adler vs. Igel - Formwechsel":"uebung",
  "Igel-Pressing-Kreis":"uebung",
  "Diamanten-Jagd":"spiel",
  /* Pressing */
  "Gegenpressing-Pfeife":"uebung",
  "Pressing-Welle 2gg2":"spiel",
  "Umschalt-Sprintpresse":"uebung",
  "Balleroberung Bonus":"spiel",
  "Richtungs-Pressing":"spiel",
  "5-Sekunden-Hoch":"spiel",
  /* Spaß */
  "Fußball-König":"spiel",
  "Elfmeter-Turnier":"uebung",
  "Fangspiel mit Ball":"spiel",
  "Runden-Turnier Funino":"spiel",
  "Torhüter-Tag":"weder",
  "Freies Spielen":"spiel",
  /* Mindset */
  "Die Kraft des NOCH":"weder",
  "Mut-Leiter 1gg1":"spiel",
  "Reset-Knopf":"weder",
  "Gute-Dinge-Kreis":"weder",
  "Kapitän des Tages":"weder",
  "Druck-Elfer mit Jubelpflicht":"uebung",
  "Fehler-Festival":"spiel",
  "Ich-schaff-das-Kommentator":"weder",
  /* Torwart */
  "Fang-Stern":"uebung",
  "Fallschule Rechts-Links":"uebung",
  "Reaktions-Kasten":"uebung",
  "1gg1 Torwart vs Stürmer":"spiel",
  "Abschlag & Abwurf":"uebung",
  "Torwart-Koordinations-Leiter":"weder",
  "Torwart-Tennis":"spiel",
  "Flugball-Fangen":"uebung",
  "Schuss-Abwehr Stationen":"uebung",
  "Rückpass-Mitspielen":"uebung",
  "Torwart-Entscheidungsspiel":"spiel",
  "Elfmeter-Positionierung":"uebung",
  "Torwart-Staffel":"uebung",
  "Wegkicken & Abrollen":"uebung",
  "Chaos im Strafraum":"spiel",
  "W-Haltung & Korbfangen":"uebung",
  "TW-Fußarbeit-Sterne":"weder",
  "Purzelbaum-Parade":"weder",
  "Jeder-ist-mal-TW-Runde":"spiel",
  /* Individual */
  "Dribbling-Meister (1gg0)":"uebung",
  "Passwand-Solo":"uebung",
  "Torschuss-Intensiv":"uebung",
  "Ballgefühl-Zirkel":"uebung",
  "Sprint & Wendigkeit":"weder",
  "Schwacher-Fuß-Intensiv":"uebung",
  "Kopf-hoch-Training":"uebung",
  "Entscheidungstraining Solo/Pass":"uebung",
  "Pressing-Schule 1gg1":"spiel",
  "Resilienz-Booster":"weder",
  "Erste-Berührung-Training":"uebung",
  "Freilauf-Training":"uebung",
  "Umschalt-Blitz":"uebung",
  "Kommunikations-Training":"weder",
  "Konzentrations-Parcours":"weder",
  /* v568 – die dreizehn Übungen der Einheiten für 3+1, FUNiño und die Kombination
     (uebungen/bibliothek.json, Stand 2026-09-16-1): alle Spielformen mit Gegner und
     laufendem Spielfluss. Der Vorschlag wird wie bisher erst auf Tipp geschrieben. */
  "3+1 gegen 2 – Adler aus dem Tor":"spiel",
  "2 gegen 1 plus Torwart – der Flitzer macht es breit":"spiel",
  "3 gegen 2 plus Torwart – Jäger und zwei Flitzer":"spiel",
  "3+1 gegen 3+1 – Raute ohne Aufpasser":"spiel",
  "Igel gegen drei – Torwart und zwei Flitzer verteidigen":"spiel",
  "2 gegen 2 plus Torwart – Jäger läuft an, Flitzer stellt zu":"spiel",
  "FUNiño 3 gegen 3 – Seitenwechsel zählt doppelt":"spiel",
  "FUNiño 3 gegen 1 – der Mittlere hat den Ball":"spiel",
  "FUNiño 3 gegen 3 – einer bleibt hinter dem Ball":"spiel",
  "FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts":"spiel",
  "FUNiño 3 gegen 3 – Mittellinie verteidigen":"spiel",
  "FUNiño 2 gegen 2 – einer drängt, einer schützt":"spiel",
  "3+1 gegen FUNiño – großes Tor gegen zwei kleine":"spiel",
  /* v583 – Lehrgangsabgabe 3.1. Charles ordnet die Form als SPIELFORM ein, wie sie auch in
     der Abgabe heißt (Entscheidung 19.09.2026), obwohl sie ohne Gegenspieler auskommt und
     der Trainer erst in Steigerung 3 verteidigt. Der Schlüssel heißt hier „spiel“ – das ist
     die Kennung, die `UEBUNG_ART` als „Spielform“ auflöst. */
  "Raute mit Torwart – Angriff über den anderen Flügel":"spiel",
  /* v601 – aus einer Vorlage übernommen (PO 23.09.2026). Spielform: echter Gegner, echter
     Ausgang, und das Kind entscheidet selbst, welches der beiden Ziele es ansteuert. */
  "Zwei Torarten – Schuss oder Dribbling":"spiel"
};

/* ═══════════════════════════════════════════════════════════════════════════
   v631 – VORSCHLAG: Läuft die Übung ohne Trainer?
   PO: „Überlege mal, welche Trainingsformen wir noch in die App einbauen können, die auch mit
   einem einzigen Trainer durchführbar sind, ohne eine hohe Komplexität zu haben.“ Kachel:
   „Schritt 1 + 2 bauen“. Befund: An Übungen fehlt es kaum – die App wusste nur nicht, welche
   ohne Trainer laufen. Bei 13 Kindern und einem Trainer plant sie drei Felder, zwei davon ohne
   Trainer; steht dort eine Übung, bei der er einspielt oder Kommandos ruft, steht die Gruppe.

   - `allein` – läuft allein: feste Regeln, die Kinder spielen, zählen und wechseln selbst.
   - `fuehrt` – Trainer führt: er ruft Kommandos, zählt, pfeift oder korrigiert – einer reicht
                für alle Kinder dieser Übung, aber er muss dabei sein.
   - `feld`   – Trainer am Feld: er ist Teil der Übung (wirft, schießt, spielt ein, ist Gegner).

   Angelegt aus dem Ablauf jeder Übung. Wie UEBUNG_ART_VORSCHLAG ist das KEINE Einordnung:
   gilt erst, wenn der Trainer sie in der Durchsicht übernimmt (team_config.uebung_betreuung).
   Schlüssel ist der Name. */
const UEBUNG_BETREUUNG_VORSCHLAG={
  /* allein */
  "Korridor-Funino":"allein",
  "Schattenspieler":"allein",
  "TW-Einwurf-Angriff":"allein",
  "Dreiecksduell 3gg3":"allein",
  "Aufpasser-Steilpass":"allein",
  "Pressing-Raute 5gg5":"allein",
  "Mini-Turnier Raute":"allein",
  "Komm-Geh-Passspiel":"allein",
  "Dreieck-Passspiel":"allein",
  "4gg2 Ballbesitz":"allein",
  "Wandpass-Serie":"allein",
  "Ansage-Passspiel":"allein",
  "Lobpflicht nach Tor":"allein",
  "Quer vor Tor":"allein",
  "Ball-Staffel Paare":"allein",
  "Pass und Nachlaufen":"allein",
  "Blinde Pässe":"allein",
  "Schatten-Pressing":"allein",
  "Blick-vor-Ball":"allein",
  "1gg1 Tore-Duell":"allein",
  "Spiegeldribbling":"allein",
  "Torschuss-Wettbewerb":"allein",
  "Dribbling-Parcours":"allein",
  "Schwacher-Fuß-Tag":"allein",
  "Umschalt-Sprintpresse":"allein",
  "Balleroberung Bonus":"allein",
  "Richtungs-Pressing":"allein",
  "5-Sekunden-Hoch":"allein",
  "Fußball-König":"allein",
  "Elfmeter-Turnier":"allein",
  "Fangspiel mit Ball":"allein",
  "Runden-Turnier Funino":"allein",
  "Torhüter-Tag":"allein",
  "Freies Spielen":"allein",
  "Hai & Fische":"allein",
  "Tierbewegungen-Parcours":"allein",
  "Ball-Dieb":"allein",
  "Schattenläufer":"allein",
  "Zombieball":"allein",
  "1gg1 Torwart vs Stürmer":"allein",
  "Abschlag & Abwurf":"allein",
  "Torwart-Tennis":"allein",
  "Schuss-Abwehr Stationen":"allein",
  "Rückpass-Mitspielen":"allein",
  "Elfmeter-Positionierung":"allein",
  "Dribbling-Meister (1gg0)":"allein",
  "Passwand-Solo":"allein",
  "Ballgefühl-Zirkel":"allein",
  "Schwacher-Fuß-Intensiv":"allein",
  "Die Kraft des NOCH":"allein",
  "Mut-Leiter 1gg1":"allein",
  "Reset-Knopf":"allein",
  "Druck-Elfer mit Jubelpflicht":"allein",
  "Ich-schaff-das-Kommentator":"allein",
  "Jeder-ist-mal-TW-Runde":"allein",
  "Diamanten-Jagd":"allein",
  "Zwei-Tore-Umschalten":"allein",
  "Drei gegen einen im Quadrat":"allein",
  "3 gegen 3 auf vier Minitore mit Schusszone":"allein",
  "Passtor im Quadrat":"allein",
  "2+1 gegen 2+1 auf Jugendtore":"allein",
  "3 gegen 3 auf vier Minitore – Pass zählt doppelt":"allein",
  "2 gegen 1 plus Torwart – der Flitzer macht es breit":"allein",
  "FUNiño 3 gegen 1 – der Mittlere hat den Ball":"allein",
  "3 gegen 3 – Dreieck (Grundform)":"allein",
  "4+1 gegen 4+1 – Raute (Steigerung)":"allein",
  "3+1 gegen 2 – Adler aus dem Tor":"allein",
  "3 gegen 2 plus Torwart – Jäger und zwei Flitzer":"allein",
  "3+1 gegen 3+1 – Raute ohne Aufpasser":"allein",
  "FUNiño 3 gegen 3 – Seitenwechsel zählt doppelt":"allein",
  "FUNiño 3 gegen 3 – einer bleibt hinter dem Ball":"allein",
  "FUNiño 3 gegen 2 mit Wandspieler – links, Mitte, rechts":"allein",
  "3+1 gegen FUNiño – großes Tor gegen zwei kleine":"allein",
  "Igel gegen drei – Torwart und zwei Flitzer verteidigen":"allein",
  "2 gegen 2 plus Torwart – Jäger läuft an, Flitzer stellt zu":"allein",
  "FUNiño 3 gegen 3 – Mittellinie verteidigen":"allein",
  "FUNiño 2 gegen 2 – einer drängt, einer schützt":"allein",
  "Zwei Torarten – Schuss oder Dribbling":"allein",
  /* fuehrt */
  "4+1 Lebende Raute":"fuehrt",
  "Rauten-Staffel":"fuehrt",
  "Positions-Bingo":"fuehrt",
  "Breiten-Spiel 4gg0":"fuehrt",
  "Rauten-Umschalten":"fuehrt",
  "Pflichtpass-Funino":"fuehrt",
  "Scanning-Funino":"fuehrt",
  "Farb-Entscheidung":"fuehrt",
  "Überzahl-Erkennung":"fuehrt",
  "Raumaufteilung-Quiz":"fuehrt",
  "Autodrom Beidfüßig":"fuehrt",
  "Finte-Wettkampf":"fuehrt",
  "Gegenpressing-Pfeife":"fuehrt",
  "Pressing-Welle 2gg2":"fuehrt",
  "Adler vs. Igel - Formwechsel":"fuehrt",
  "Igel-Pressing-Kreis":"fuehrt",
  "Feuer-Wasser-Sturm mit Ball":"fuehrt",
  "Nummernlauf":"fuehrt",
  "Atomspiel":"fuehrt",
  "Lauf-ABC mit Ball":"fuehrt",
  "Farben-Dribbeln":"fuehrt",
  "Torwart-Staffel":"fuehrt",
  "Chaos im Strafraum":"fuehrt",
  "Sprint & Wendigkeit":"fuehrt",
  "Gute-Dinge-Kreis":"fuehrt",
  "Kapitän des Tages":"fuehrt",
  "Fehler-Festival":"fuehrt",
  "Chaos-Dribbling mit Kommando":"fuehrt",
  "Warm up Adler":"fuehrt",
  "Adler 1 – Aktivierung":"fuehrt",
  "Adler 2 – Dribbelstaffel":"fuehrt",
  "Adler 3 – Passen mit Klatschen":"fuehrt",
  "Adler 4 – Passen und Torschuss":"fuehrt",
  "Dreieckspassen mit Abschluss":"fuehrt",
  /* feld */
  "Erste Mitnahme vorwärts":"feld",
  "Kopf-hoch-Signale":"feld",
  "Fang-Stern":"feld",
  "Fallschule Rechts-Links":"feld",
  "Reaktions-Kasten":"feld",
  "Torwart-Koordinations-Leiter":"feld",
  "Flugball-Fangen":"feld",
  "Torwart-Entscheidungsspiel":"feld",
  "Wegkicken & Abrollen":"feld",
  "Torschuss-Intensiv":"feld",
  "Kopf-hoch-Training":"feld",
  "Entscheidungstraining Solo/Pass":"feld",
  "Pressing-Schule 1gg1":"feld",
  "Resilienz-Booster":"feld",
  "Erste-Berührung-Training":"feld",
  "Freilauf-Training":"feld",
  "Umschalt-Blitz":"feld",
  "Kommunikations-Training":"feld",
  "Konzentrations-Parcours":"feld",
  "W-Haltung & Korbfangen":"feld",
  "TW-Fußarbeit-Sterne":"feld",
  "Purzelbaum-Parade":"feld",
  "Adler TW – Einlaufen":"feld",
  "Raute mit Torwart – Angriff über den anderen Flügel":"feld"
};
