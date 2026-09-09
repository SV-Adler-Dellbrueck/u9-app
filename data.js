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
  'funino':{label:'Funino',tw:false,fieldCount:3,slots:[
    {role:'Spieler',x:50,y:76,cls:'tb-auf',rk:'feld'},
    {role:'Spieler',x:26,y:42,cls:'tb-fl', rk:'feld'},
    {role:'Spieler',x:74,y:42,cls:'tb-fl', rk:'feld'},
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
  desc:"Anstoß für den Gegner! Stellt eure Raute auf.",
  task:"Bringe alle Feldspieler in die richtige Raute-Grundstellung!",
  hint:"Aufpasser zentral hinten, Flitzer auf den Seiten, Jäger in der Spitze.",
  ball:{from:{x:50,y:50},to:{x:50,y:50}},
  opps:[{x:48,y:48,label:"Gegner"},{x:52,y:52,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:40,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:50,y:65,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:55,y:37,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:30,y:45,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:70,r:12},
    "Flitzer L":{x:25,y:48,r:15},
    "Flitzer R":{x:75,y:48,r:15},
    "Jäger":{x:50,y:30,r:14}
  },
  explain:{
    correct:"⚽ Genau! Aufpasser vor dem TW, Flitzer breit, Jäger vorne – das ist die Raute!",
    wrong:"Tipp: Aufpasser = zentral hinter der Mittellinie. Flitzer L = links, Flitzer R = rechts auf Höhe Mittellinie. Jäger = vorne in der Spitze."
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
  desc:"Ihr führt 1:0! Der Gegner hat den Abstoß. Jetzt wollt ihr pressen!",
  task:"Schiebe die ganze Raute kompakt nach vorne – Pressing!",
  hint:"Die Abstände bleiben eng, aber alles verschiebt sich Richtung gegnerisches Tor. Auch der Aufpasser rückt weit auf.",
  ball:{from:{x:50,y:15},to:{x:50,y:15}},
  opps:[{x:50,y:10,label:"Geg. TW"},{x:40,y:18,label:"Gegner"},{x:60,y:18,label:"Gegner"}],
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
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"⚽ Super! Im freien Raum kann der Pass ankommen – gut freigelaufen!",
    wrong:"💡 Lauf weg vom Gegner in den freien Raum – dort kann der Ball hin!"
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
  desc:"Flitzer L hat den Ball, aber links ist alles zugestellt. Der Aufpasser ruft: 'Verlagern!'",
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
  title:"IGEL – Eckstoß gegen uns",
  desc:"Der Gegner hat einen Eckstoß! Die Flanke kommt von rechts ins Zentrum.",
  task:"Positioniere die Raute zur Eckstoß-Verteidigung!",
  hint:"Alle im und um den Strafraum. Jeder deckt einen Raum, keinen Gegenspieler.",
  ball:{from:{x:95,y:5},to:{x:55,y:78}},
  opps:[{x:45,y:78,label:"Gegner"},{x:55,y:82,label:"Gegner"},{x:40,y:85,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:51,y:66,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:25,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:75,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:47,y:84,r:10},
    "Flitzer L":{x:33,y:79,r:10},
    "Flitzer R":{x:61,y:79,r:10},
    "Jäger":{x:49,y:70,r:10}
  },
  explain:{
    correct:"🛡️ Gut verteidigt! Alle verteilt – kein Gegner steht frei!",
    wrong:"Tipp: Bei Eckstoß ALLE in den Strafraum! Nicht draußen stehen bleiben. Verteilt euch im Strafraum – vorderer Pfosten, Mitte, hinterer Pfosten, Rückraum."
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
  desc:"Der gegnerische Torwart hat den Ball. Euer Jäger startet das Pressing!",
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
  title:"Abstoß vom Torwart",
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
  title:"Standard: Einwurf eigene Hälfte",
  desc:"Einwurf für euch in der eigenen Hälfte, links. Flitzer L wirft ein.",
  task:"Wie bieten sich die Mitspieler zum Einwurf an?",
  hint:"Kurze und lange Option bieten! Aufpasser kurz, Jäger oder Flitzer R als lange Option.",
  ball:{from:{x:0,y:60},to:{x:0,y:60}},
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
  title:"Standard: Einwurf gegnerische Hälfte",
  desc:"Einwurf in der gegnerischen Hälfte, rechts. Flitzer R wirft ein.",
  task:"Offensiver Einwurf! Wie positioniert sich das Team?",
  hint:"Nahe am gegnerischen Tor: Jäger zum nahen Pfosten, Flitzer L rückt ein, Aufpasser sichert!",
  ball:{from:{x:100,y:25},to:{x:100,y:25}},
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
    wrong:"Tipp: Offensiver Einwurf = wie eine Flanke! Jäger geht zum Strafraum. Flitzer L rückt ein für die zweite Welle. Aufpasser sichert ab."
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
  title:"Standard: Eckstoß für uns",
  desc:"Eckstoß für euch! Flitzer L schießt die Ecke von links.",
  task:"Wie positioniert sich das Team im Strafraum?",
  hint:"Jäger und Flitzer R in den Strafraum! Aufpasser an der Strafraumkante für Abpraller.",
  ball:{from:{x:5,y:5},to:{x:45,y:12}},
  opps:[{x:42,y:10,label:"Gegner"},{x:55,y:12,label:"Gegner"},{x:50,y:6,label:"Geg. TW"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:40,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:5,y:5,cls:"tb-fl",role:"Flitzer L",locked:true},
    {name:"Flitzer R",x:70,y:25,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:54,y:24,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:22,r:10},
    "Flitzer R":{x:58,y:10,r:10},
    "Jäger":{x:42,y:8,r:12}
  },
  explain:{
    correct:"⚽ Super aufgestellt! Drei Ziele für die Flanke – nah, fern, Rückraum!",
    wrong:"Tipp: Jäger = naher Pfosten. Flitzer R = ferner Pfosten. Aufpasser = Rückraum/Strafraumkante. So habt ihr drei Optionen für die Ecke!"
  }
},
{
  title:"Standard: Abstoß gegen uns",
  desc:"Gegnerischer Abstoß! Der TW des Gegners schießt lang!",
  task:"Wie stellt sich die Raute auf den langen Abstoß ein?",
  hint:"Aufpasser sichert den Luftraum. Flitzer stehen nicht zu weit vorne – Abpraller sichern!",
  ball:{from:{x:50,y:8},to:{x:50,y:42}},
  opps:[{x:50,y:8,label:"Geg. TW"},{x:45,y:35,label:"Gegner"},{x:55,y:38,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:80,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:13,y:48,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:87,y:48,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:16,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:58,r:14},
    "Flitzer L":{x:35,y:48,r:14},
    "Flitzer R":{x:65,y:48,r:14},
    "Jäger":{x:50,y:38,r:14}
  },
  explain:{
    correct:"Gut! Raute steht kompakt im Mittelfeld. Aufpasser gewinnt den Kopfball oder sichert den zweiten Ball. Flitzer bereit für Abpraller.",
    wrong:"Tipp: Bei langem Abstoß: IGEL in der Mitte! Aufpasser sichert den Luftraum. Nicht zu weit vorne oder hinten – Mittelfeld kontrollieren!"
  }
},
{
  title:"Spiel: Rückstand – offensiver werden!",
  desc:"Ihr liegt 0:1 zurück! Noch 5 Minuten. Der Trainer ruft: 'Alles nach vorne!'",
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
  desc:"Ihr führt 2:1! Noch 3 Minuten. Der Trainer sagt: 'Sicher spielen!'",
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
  desc:"Ein Gegenspieler hat Rot bekommen! Ihr spielt 5 gegen 4! Nutzt die Überzahl!",
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
  desc:"Einer eurer Spieler hat sich verletzt! Ihr spielt 4 gegen 5 (3 Feldspieler + TW).",
  task:"Wie verteidigt ihr mit einem Spieler weniger? Wer fehlt am wenigsten?",
  hint:"In Unterzahl: Igel noch enger! Mitte schließen, Seiten aufgeben wenn nötig.",
  ball:{from:{x:50,y:35},to:{x:50,y:35}},
  opps:[{x:20,y:25,label:"Gegner"},{x:80,y:25,label:"Gegner"},{x:50,y:20,label:"Gegner"},{x:40,y:35,label:"Gegner"},{x:60,y:35,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:50,y:55,cls:"tb-auf",role:"Aufpasser",locked:false},
    {name:"Flitzer L",x:26,y:46,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:74,y:46,cls:"tb-fl",role:"Flitzer R",locked:false},
    {name:"Jäger",x:50,y:30,cls:"tb-jaeg",role:"Jäger",locked:false}
  ],
  targets:{
    "Aufpasser":{x:50,y:75,r:12},
    "Flitzer L":{x:38,y:62,r:12},
    "Flitzer R":{x:62,y:62,r:12},
    "Jäger":{x:50,y:50,r:12}
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
    {name:"TW",x:53,y:95,cls:"tb-tw",role:"TW",locked:false},
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
  hint:"Der TW 'sieht' alles – er ruft dem Aufpasser wo er hinlaufen soll!",
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
    wrong:"Tipp: Der TW ruft 'Auf links!' – Aufpasser muss schräg zur Ballseite laufen und absichern."
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
    {name:"TW",x:69,y:95,cls:"tb-tw",role:"TW",locked:false},
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
    {name:"TW",x:54,y:95,cls:"tb-tw",role:"TW",locked:false},
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
  title:"Ballbesitz nach Einwurf",
  desc:"Einwurf für euch! Wie behaltet ihr den Ball direkt danach?",
  task:"Schiebe Flitzer L in eine gute Position zum Einwurf!",
  hint:"Mindestens zwei Anspielstationen! Einer kurz, einer weiter!",
  ball:{from:{x:2,y:45},to:{x:18,y:45}},
  opps:[{x:22,y:42,label:"Gegner"},{x:18,y:52,label:"Gegner"}],
  start:[
    {name:"TW",x:50,y:92,cls:"tb-tw",role:"TW",locked:true},
    {name:"Aufpasser",x:45,y:65,cls:"tb-auf",role:"Aufpasser",locked:true},
    {name:"Flitzer L",x:40,y:45,cls:"tb-fl",role:"Flitzer L",locked:false},
    {name:"Flitzer R",x:78,y:50,cls:"tb-fl",role:"Flitzer R",locked:true},
    {name:"Jäger",x:50,y:32,cls:"tb-jaeg",role:"Jäger",locked:true}
  ],
  targets:{
    "Flitzer L":{x:18,y:45,r:14}
  },
  explain:{
    correct:"Gut angeboten! Nah genug zum Einwurf, mit Platz dahinter. Annehmen, drehen, weiterverbinden!",
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
  task:"Schiebe Jäger weg – Flitzer R ruft 'Mein Ball!', Jäger weicht aus!",
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
  anim:[{role:"Aufpasser",to:{x:62,y:68}}],
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><line x1="100" y1="20" x2="100" y2="160" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="6,3"/><line x1="180" y1="20" x2="180" y2="160" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="6,3"/><rect x="38" y="22" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="218" y="22" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="38" y="151" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="218" y="151" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="50" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="50" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="140" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="230" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="230" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">C</text><circle cx="50" cy="120" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="50" y="138" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">1</text><circle cx="140" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="78" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">2</text><circle cx="230" cy="120" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="230" y="138" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">3</text><text x="50" y="48" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="8" font-family="sans-serif">Korridor 1</text><text x="140" y="48" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="8" font-family="sans-serif">Korridor 2</text><text x="230" y="48" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="8" font-family="sans-serif">Korridor 3</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Korridor-Funino</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><line x1="140" y1="30" x2="60" y2="90" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><line x1="140" y1="30" x2="220" y2="90" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><line x1="60" y1="90" x2="140" y2="150" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><line x1="220" y1="90" x2="140" y2="150" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><circle cx="20" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="20" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW</text><circle cx="140" cy="30" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="48" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><circle cx="60" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="60" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="220" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="220" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="140" cy="150" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="168" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="260" cy="90" r="8" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="260" y="107" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">TW2</text><circle cx="140" cy="90" r="8" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="107" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">2</text><line x1="140" y1="150" x2="140" y2="30" stroke="rgba(255,200,0,.6)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">4+1 Lebende Raute</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><polygon points="90,13 85,24 95,24" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="190,13 185,24 195,24" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="90,153 85,164 95,164" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="190,153 185,164 195,164" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><circle cx="140" cy="35" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="53" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><circle cx="60" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="60" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="220" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="220" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="140" cy="145" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="163" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="140" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW</text><line x1="100" y1="90" x2="60" y2="90" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="180" y1="90" x2="220" y2="90" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="140" y1="110" x2="140" y2="45" stroke="rgba(255,200,0,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="140" y1="70" x2="140" y2="155" stroke="rgba(255,200,0,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Rauten-Staffel</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="70" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="70" y="78" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="210" cy="120" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="210" y="138" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Schatten</text><line x1="70" y1="60" x2="210" y2="120" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="140" y1="20" x2="140" y2="160" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><line x1="20" y1="90" x2="260" y2="90" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><text x="140" y="88" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="9" font-family="sans-serif">max. Abstand</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Schattenspieler</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="20" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW</text><circle cx="80" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="108" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="140" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="140" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="148" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="220" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="220" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><line x1="30" y1="90" x2="70" y2="90" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="80" x2="130" y2="55" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="80" y1="100" x2="130" y2="125" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="140" y1="50" x2="210" y2="85" stroke="rgba(255,200,0,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="140" y="92" text-anchor="middle" fill="rgba(255,255,255,.3)" font-size="8" font-family="sans-serif">oder</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">TW-Einwurf-Angriff</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="120" y="10" width="40" height="20" rx="3" fill="rgba(255,255,255,.15)"/><text x="140" y="24" text-anchor="middle" fill="#fff" font-size="9" font-family="sans-serif" font-weight="bold">TRAINER</text><polygon points="140,28 135,39 145,39" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="50,83 45,94 55,94" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="230,83 225,94 235,94" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="140,148 135,159 145,159" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><text x="140" y="32" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif">Jäger</text><text x="50" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif">Flitzer L</text><text x="230" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif">Flitzer R</text><text x="140" y="172" text-anchor="middle" fill="#60a5fa" font-size="8" font-family="sans-serif">Aufpasser</text><circle cx="100" cy="80" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="160" cy="100" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="120" cy="130" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="170" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><line x1="100" y1="80" x2="140" y2="45" stroke="rgba(255,200,0,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="160" y1="100" x2="230" y2="90" stroke="rgba(255,200,0,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Positions-Bingo</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="20" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW</text><circle cx="90" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="90" y="108" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="160" cy="40" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="58" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="160" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="158" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="230" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="230" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><line x1="20" y1="85" x2="80" y2="85" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="90" y1="80" x2="150" y2="45" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="160" y1="50" x2="160" y2="130" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="160" y1="135" x2="225" y2="95" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><circle cx="230" cy="90" r="5" fill="rgba(255,255,255,.3)" stroke="#fff" stroke-width="1"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Breiten-Spiel 4gg0</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="18" y="50" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="18" y="123" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="238" y="50" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="238" y="123" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="70" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="70" y="108" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="130" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="130" y="78" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Zen.</text><circle cx="130" cy="120" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="210" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="210" y="108" text-anchor="middle" fill="#f87171" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="150" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="150" y="78" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">Zen.</text><circle cx="150" cy="120" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><line x1="140" y1="20" x2="140" y2="160" stroke="rgba(255,255,255,.3)" stroke-width="1" stroke-dasharray="5,3"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Dreiecksduell 3gg3</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="50" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="50" y="158" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="180" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="180" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><circle cx="50" cy="60" r="8" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="50" y="77" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="50" cy="120" r="8" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="50" y="137" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><line x1="50" y1="130" x2="170" y2="58" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="120" y="85" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="sans-serif" font-style="italic">Steilpass</text><line x1="180" y1="60" x2="250" y2="85" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><circle cx="50" cy="140" r="4" fill="rgba(255,255,255,.6)" stroke="#fff" stroke-width="1"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Aufpasser-Steilpass</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="20" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW</text><circle cx="260" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="260" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW</text><circle cx="90" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="90" y="108" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="150" cy="40" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="150" y="58" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="150" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="150" y="158" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="200" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><circle cx="170" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="170" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="200" y1="90" x2="170" y2="90" stroke="rgba(255,100,100,.8)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="150" y1="50" x2="150" y2="90" stroke="rgba(255,100,100,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="150" y1="130" x2="150" y2="90" stroke="rgba(255,100,100,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><text x="185" y="75" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif">PRESS!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Pressing-Raute</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="30" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="243" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="100" y="50" width="80" height="80" rx="4" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="5,3"/><circle cx="140" cy="55" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="73" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><circle cx="100" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="100" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="180" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="180" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="140" cy="125" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="143" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><line x1="140" y1="120" x2="140" y2="65" stroke="rgba(255,200,0,.5)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="140" y="92" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">3 Sek!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Rauten-Umschalten</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="80" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="108" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="120" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="120" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="120" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="120" y="148" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="200" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="108" text-anchor="middle" fill="#f87171" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><circle cx="160" cy="50" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="68" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="160" cy="130" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="148" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="140" cy="170" r="7" fill="rgba(255,255,255,.4)" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="186" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif" font-weight="600">C1</text><circle cx="155" cy="170" r="7" fill="rgba(255,255,255,.4)" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="155" y="186" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif" font-weight="600">C2</text><circle cx="125" cy="170" r="7" fill="rgba(255,255,255,.4)" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="125" y="186" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif" font-weight="600">C3</text><text x="140" y="168" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">wartet...</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Mini-Turnier Raute</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="18" y="50" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="18" y="123" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="238" y="50" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="238" y="123" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="80" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="78" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="80" cy="120" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="138" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="80" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">C</text><circle cx="200" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="78" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">1</text><circle cx="200" cy="120" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="138" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">2</text><circle cx="200" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">3</text><line x1="80" y1="85" x2="80" y2="65" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="65" x2="195" y2="65" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="80" y="45" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif">Pflicht!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Pflichtpass-Funino</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="50" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="50" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="230" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="230" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="230" y1="90" x2="160" y2="90" stroke="rgba(255,255,255,.5)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="160" y1="90" x2="230" y2="60" stroke="rgba(255,200,0,.8)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="50" y1="90" x2="155" y2="85" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><polygon points="160,83 155,94 165,94" fill="#ef4444" stroke="rgba(0,0,0,.3)" stroke-width="1"/><text x="160" y="110" text-anchor="middle" fill="#ef4444" font-size="8" font-family="sans-serif">Dreh!</text><text x="100" y="80" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="8" font-family="sans-serif">Pass</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Komm-Geh</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="90" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="90" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="190" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="190" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="140" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="158" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">C</text><line x1="100" y1="50" x2="180" y2="50" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="190" y1="60" x2="150" y2="130" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="130" y1="140" x2="95" y2="60" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="90" y1="50" x2="140" y2="140" stroke="rgba(255,255,255,.15)" stroke-width="1" stroke-dasharray="3,3"/><line x1="190" y1="50" x2="140" y2="140" stroke="rgba(255,255,255,.15)" stroke-width="1" stroke-dasharray="3,3"/><line x1="90" y1="50" x2="190" y2="50" stroke="rgba(255,255,255,.15)" stroke-width="1" stroke-dasharray="3,3"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Dreieck-Passspiel</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="70" y="30" width="140" height="120" rx="4" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">4gg2 Ballbesitz</text>\n</svg><svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="70" y="30" width="140" height="120" rx="4" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/><circle cx="70" cy="30" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="70" y="48" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="210" cy="30" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="210" y="48" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="70" cy="150" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="70" y="168" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">C</text><circle cx="210" cy="150" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="210" y="168" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">D</text><circle cx="120" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="120" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">X</text><circle cx="160" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">Y</text><line x1="70" y1="40" x2="70" y2="140" stroke="rgba(255,255,255,.3)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="70" y1="145" x2="200" y2="148" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">4gg2</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="50" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="50" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="160" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="50" y1="85" x2="150" y2="85" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="160" y1="95" x2="80" y2="95" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="95" x2="250" y2="90" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="105" y="78" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="8" font-family="sans-serif">1. Pass</text><text x="120" y="108" text-anchor="middle" fill="rgba(255,200,0,.8)" font-size="8" font-family="sans-serif">2. Wand</text><text x="170" y="80" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif">3. Tiefe!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Wandpass</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="80" cy="80" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="98" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Max</text><circle cx="200" cy="80" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="98" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Leo</text><circle cx="140" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="158" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Tim</text><rect x="115" y="55" width="50" height="16" rx="3" fill="rgba(255,255,255,.15)"/><text x="140" y="67" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="sans-serif" font-weight="bold">Leo!</text><line x1="80" y1="75" x2="195" y2="75" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="75" x2="115" y2="63" stroke="rgba(255,200,0,.5)" stroke-width="1" stroke-dasharray="3,2"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Ansage-Passspiel</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="200" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Tor!</text><circle cx="140" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="78" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Vorl.</text><line x1="140" y1="65" x2="195" y2="88" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><rect x="100" y="35" width="80" height="18" rx="4" fill="rgba(74,222,128,.2)" stroke="rgba(74,222,128,.5)" stroke-width="1"/><text x="140" y="48" text-anchor="middle" fill="#4ade80" font-size="9" font-family="sans-serif" font-weight="bold">Super Pass!</text><line x1="200" y1="87" x2="180" y2="53" stroke="rgba(74,222,128,.5)" stroke-width="1" stroke-dasharray="3,2"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Lobpflicht</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="243" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="195" y="55" width="55" height="70" rx="3" fill="rgba(255,200,0,.1)" stroke="rgba(255,200,0,.4)" stroke-width="1" stroke-dasharray="4,3"/><text x="222" y="48" text-anchor="middle" fill="rgba(255,200,0,.6)" font-size="8" font-family="sans-serif">Quer-Zone</text><circle cx="160" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Fl.</text><circle cx="210" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="210" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><line x1="160" y1="60" x2="200" y2="80" stroke="rgba(255,200,0,.8)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="210" y1="85" x2="248" y2="88" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Quer vor Tor</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="258" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><line x1="30" y1="20" x2="30" y2="160" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/><circle cx="30" cy="70" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="30" y="88" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="30" cy="110" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="30" y="128" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="30" y1="70" x2="80" y2="105" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="105" x2="130" y2="75" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="130" y1="75" x2="180" y2="100" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="180" y1="100" x2="240" y2="88" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="30" y="175" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="8" font-family="sans-serif">Start</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Ball-Staffel</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="80" y="40" width="120" height="100" rx="4" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.2)" stroke-width="1"/><polygon points="80,33 75,44 85,44" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="200,33 195,44 205,44" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="80,133 75,144 85,144" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="200,133 195,144 205,144" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><circle cx="80" cy="40" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="58" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="200" cy="40" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="58" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="200" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="158" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">C</text><circle cx="80" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="158" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">D</text><line x1="90" y1="40" x2="190" y2="40" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="200" y1="50" x2="200" y2="130" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="190" y1="140" x2="90" y2="140" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="130" x2="80" y2="50" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Pass und Nachlaufen</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="18" y="50" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="18" y="123" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="238" y="50" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="238" y="123" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="140" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">?</text><circle cx="140" cy="90" r="22" fill="none" stroke="rgba(255,200,0,.5)" stroke-width="1.5" stroke-dasharray="5,3"/><text x="140" y="70" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif">Schau!</text><text x="100" y="60" text-anchor="middle" fill="rgba(255,255,255,.3)" font-size="7" font-family="sans-serif">360°</text><circle cx="80" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="120" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="80" cy="120" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Scanning-Funino</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><polygon points="60,33 55,44 65,44" fill="#ef4444" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="220,33 215,44 225,44" fill="#3b82f6" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="140,143 135,154 145,154" fill="#22c55e" stroke="rgba(0,0,0,.3)" stroke-width="1"/><text x="60" y="32" text-anchor="middle" fill="#ef4444" font-size="8" font-family="sans-serif">ROT</text><text x="220" y="32" text-anchor="middle" fill="#60a5fa" font-size="8" font-family="sans-serif">BLAU</text><text x="140" y="168" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif">GRÜN</text><circle cx="140" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">?</text><rect x="115" y="65" width="50" height="16" rx="3" fill="rgba(255,100,100,.3)"/><text x="140" y="77" text-anchor="middle" fill="#ef4444" font-size="9" font-family="sans-serif" font-weight="bold">ROT!</text><line x1="140" y1="88" x2="65" y2="50" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Farb-Entscheidung</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="140" y="30" width="110" height="120" rx="4" fill="rgba(74,222,128,.1)" stroke="rgba(74,222,128,.4)" stroke-width="1" stroke-dasharray="5,3"/><text x="195" y="25" text-anchor="middle" fill="rgba(74,222,128,.7)" font-size="8" font-family="sans-serif">Überzahl!</text><circle cx="160" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="170" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="220" cy="75" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="70" cy="80" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="100" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="90" cy="120" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Überzahl-Erkennung</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="140" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="80" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="80" y="68" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="200" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="148" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">C</text><circle cx="140" cy="90" r="35" fill="none" stroke="rgba(255,200,0,.3)" stroke-width="1" stroke-dasharray="5,3"/><text x="140" y="120" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">Augen zu!</text><line x1="140" y1="90" x2="140" y2="55" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="3,2"/><text x="170" y="70" fill="rgba(255,200,0,.6)" font-size="8" font-family="sans-serif">Wo ist B?</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Blinde Pässe</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><line x1="140" y1="20" x2="140" y2="160" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="6,3"/><circle cx="80" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="100" cy="110" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="80" cy="130" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="180" cy="50" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="180" cy="130" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="140" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">?</text><rect x="105" y="63" width="70" height="18" rx="3" fill="rgba(255,200,0,.2)" stroke="rgba(255,200,0,.4)" stroke-width="1"/><text x="140" y="76" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif">Wie viele links?</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Raumaufteilung-Quiz</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="200" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">?</text><rect x="35" y="65" width="50" height="50" rx="4" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.3)" stroke-width="1.5"/><text x="60" y="78" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif" font-weight="bold">Trainer</text><text x="60" y="100" text-anchor="middle" fill="#fbbf24" font-size="22" font-family="sans-serif">✌️</text><rect x="160" y="70" width="30" height="20" rx="3" fill="rgba(255,200,0,.2)"/><text x="175" y="84" text-anchor="middle" fill="#fbbf24" font-size="10" font-family="sans-serif" font-weight="bold">2!</text><line x1="90" y1="90" x2="155" y2="90" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Finger-Signal</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="180" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="180" y="88" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="200" cy="110" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="200" y="128" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="130" cy="70" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="130" y="88" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">V1</text><circle cx="110" cy="90" r="9" fill="rgba(74,222,128,.5)" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="110" y="108" text-anchor="middle" fill="rgba(74,222,128,.5)" font-size="8" font-family="sans-serif" font-weight="600">V2</text><line x1="130" y1="70" x2="175" y2="73" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="120" y="60" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif">Press!</text><text x="105" y="108" text-anchor="middle" fill="rgba(74,222,128,.7)" font-size="8" font-family="sans-serif">Sicherung</text><line x1="130" y1="75" x2="115" y2="88" stroke="rgba(74,222,128,.4)" stroke-width="1" stroke-dasharray="3,2"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Schatten-Pressing</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="140" cy="100" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="100" r="30" fill="none" stroke="rgba(255,200,0,.4)" stroke-width="1.5" stroke-dasharray="5,3"/><line x1="140" y1="70" x2="140" y2="40" stroke="rgba(255,200,0,.7)" stroke-width="2" marker-end="url(#arr)"/><text x="140" y="35" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="sans-serif" font-weight="bold">SCHAUEN!</text><circle cx="80" cy="50" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="130" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="100" r="6" fill="rgba(255,255,255,.5)" stroke="#fff" stroke-width="1.5"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Blick-vor-Ball</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="60" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="30" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="220" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="60" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="150" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="220" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="100" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="180" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="90" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="sans-serif" font-weight="bold">Links!</text><circle cx="60" cy="50" r="4" fill="rgba(255,255,255,.5)"/><circle cx="140" cy="30" r="4" fill="rgba(255,255,255,.5)"/><circle cx="220" cy="50" r="4" fill="rgba(255,255,255,.5)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Autodrom</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="128" y="20" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="110" cy="100" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="110" y="118" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="170" cy="100" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="170" y="118" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="110" y1="95" x2="140" y2="30" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="170" y1="95" x2="140" y2="28" stroke="rgba(248,113,113,.8)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="140" y="168" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">Nur Solo – kein Pass!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">1gg1 Tore-Duell</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="90" y="40" width="100" height="100" rx="4" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.2)" stroke-width="1"/><line x1="140" y1="40" x2="140" y2="140" stroke="rgba(255,255,255,.3)" stroke-width="1" stroke-dasharray="4,3"/><text x="140" y="30" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">Spiegel</text><circle cx="115" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="115" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="165" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="165" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="115" y1="80" x2="115" y2="105" stroke="rgba(255,255,255,.4)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="165" y1="80" x2="165" y2="105" stroke="rgba(248,113,113,.4)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Spiegeldribbling</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="128" y="22" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><polygon points="80,93 75,104 85,104" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="140,93 135,104 145,104" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="200,93 195,104 205,104" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><text x="80" y="92" text-anchor="middle" fill="#f59e0b" font-size="8" font-family="sans-serif">Links</text><text x="140" y="92" text-anchor="middle" fill="#f59e0b" font-size="8" font-family="sans-serif">Mitte</text><text x="200" y="92" text-anchor="middle" fill="#f59e0b" font-size="8" font-family="sans-serif">Rechts</text><circle cx="80" cy="120" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="120" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="120" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><line x1="80" y1="115" x2="120" y2="35" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="140" y1="115" x2="140" y2="35" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="200" y1="115" x2="160" y2="35" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Torschuss-Wettbewerb</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="243" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><polygon points="50,63 45,74 55,74" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="80,103 75,114 85,114" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="110,63 105,74 115,74" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="140,103 135,114 145,114" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="170,63 165,74 175,74" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><polygon points="200,103 195,114 205,114" fill="#f59e0b" stroke="rgba(0,0,0,.3)" stroke-width="1"/><circle cx="30" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><line x1="30" y1="90" x2="50" y2="75" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="50" y1="75" x2="80" y2="105" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="105" x2="110" y2="75" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="110" y1="75" x2="140" y2="105" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="140" y1="105" x2="170" y2="75" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="170" y1="75" x2="200" y2="105" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="200" y1="105" x2="245" y2="90" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Dribbling-Parcours</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><text x="140" y="70" text-anchor="middle" fill="#60a5fa" font-size="28" font-family="sans-serif">👟</text><text x="140" y="100" text-anchor="middle" fill="#60a5fa" font-size="14" font-family="sans-serif" font-weight="bold">LINKS-TAG</text><text x="140" y="120" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="10" font-family="sans-serif">Nur schwacher Fuß!</text><line x1="60" y1="140" x2="220" y2="140" stroke="rgba(96,165,250,.4)" stroke-width="2"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Schwacher-Fuß-Tag</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="100" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="100" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><circle cx="180" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="180" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="100" y1="80" x2="130" y2="70" stroke="rgba(255,255,255,.5)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="130" y1="70" x2="100" y2="80" stroke="rgba(255,200,0,.5)" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arr)"/><line x1="100" y1="80" x2="180" y2="80" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="130" y="65" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif">Täuschung!</text><text x="130" y="120" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">Finte = 2 Pkt.</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Finte-Wettkampf</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="258" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="140" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><text x="140" y="75" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">Rücken zum Tor</text><line x1="50" y1="90" x2="130" y2="90" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><circle cx="50" cy="90" r="4" fill="rgba(255,255,255,.6)" stroke="#fff" stroke-width="1"/><line x1="150" y1="90" x2="260" y2="90" stroke="rgba(255,200,0,.8)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="200" y="80" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif">Mitnahme vorwärts!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Erste Mitnahme</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="100" cy="70" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="100" cy="110" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="60" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="180" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="180" y="88" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="180" cy="110" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="155" cy="90" r="6" fill="rgba(255,255,255,.6)" stroke="#fff" stroke-width="1.5"/><line x1="100" y1="75" x2="148" y2="88" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="100" y1="105" x2="148" y2="92" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="140" y="70" text-anchor="middle" fill="#f87171" font-size="10" font-family="sans-serif" font-weight="bold">PFEIFE!</text><text x="140" y="140" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">3 Schritte sofort!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Gegenpressing-Pfeife</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="80" cy="70" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="80" cy="110" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="110" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="90" r="6" fill="rgba(255,255,255,.6)" stroke="#fff" stroke-width="1.5"/><line x1="80" y1="75" x2="134" y2="88" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="80" y1="105" x2="134" y2="92" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><rect x="110" y="65" width="60" height="18" rx="3" fill="rgba(239,68,68,.2)" stroke="rgba(239,68,68,.5)" stroke-width="1"/><text x="140" y="78" text-anchor="middle" fill="#f87171" font-size="9" font-family="sans-serif" font-weight="bold">5 Sekunden!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Pressing-Welle</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="110" y="60" width="60" height="60" rx="4" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="5,3"/><circle cx="140" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Ball</text><line x1="140" y1="85" x2="140" y2="40" stroke="rgba(74,222,128,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="140" y1="95" x2="140" y2="145" stroke="rgba(248,113,113,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="165" y="50" fill="rgba(74,222,128,.8)" font-size="8" font-family="sans-serif">Angriff!</text><text x="155" y="148" fill="rgba(248,113,113,.8)" font-size="8" font-family="sans-serif">Press!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Umschalt-Sprintpresse</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="160" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="88" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><circle cx="110" cy="75" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="110" y="93" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">A</text><line x1="110" y1="75" x2="155" y2="72" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><circle cx="155" cy="75" r="5" fill="rgba(255,255,255,.5)" stroke="#fff" stroke-width="1"/><rect x="90" y="45" width="70" height="20" rx="3" fill="rgba(74,222,128,.2)" stroke="rgba(74,222,128,.5)" stroke-width="1"/><text x="125" y="59" text-anchor="middle" fill="#4ade80" font-size="9" font-family="sans-serif" font-weight="bold">+1 Pkt. !</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Balleroberung Bonus</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="200" y="20" width="60" height="140" rx="3" fill="rgba(239,68,68,.1)" stroke="rgba(239,68,68,.3)" stroke-width="1" stroke-dasharray="4,3"/><text x="230" y="95" text-anchor="middle" fill="rgba(239,68,68,.6)" font-size="8" font-family="sans-serif" transform="rotate(90,230,95)">Seitenlinie</text><circle cx="160" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="160" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">Ball</text><circle cx="110" cy="80" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="110" y="98" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">V1</text><circle cx="130" cy="110" r="9" fill="rgba(74,222,128,.7)" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="130" y="128" text-anchor="middle" fill="rgba(74,222,128,.7)" font-size="8" font-family="sans-serif" font-weight="600">V2</text><line x1="110" y1="80" x2="155" y2="88" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="160" y1="90" x2="210" y2="90" stroke="rgba(239,68,68,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><text x="185" y="78" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif">Drücken!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Richtungs-Pressing</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="180" y="25" width="80" height="140" rx="3" fill="rgba(255,200,0,.08)" stroke="rgba(255,200,0,.3)" stroke-width="1" stroke-dasharray="4,3"/><text x="220" y="20" text-anchor="middle" fill="rgba(255,200,0,.6)" font-size="8" font-family="sans-serif">Angr.-Drittel</text><circle cx="220" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="220" y="108" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jäger</text><circle cx="240" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="240" y="88" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">B</text><line x1="220" y1="85" x2="235" y2="73" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><rect x="185" y="130" width="70" height="18" rx="3" fill="rgba(255,200,0,.15)"/><text x="220" y="143" text-anchor="middle" fill="#fbbf24" font-size="9" font-family="sans-serif" font-weight="bold">5 Sek. alleine!</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">5-Sek-Hoch-Pressing</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="20" width="75" height="55" rx="3" fill="rgba(255,200,0,.15)" stroke="rgba(255,200,0,.5)" stroke-width="1.5"/><text x="57" y="35" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="bold">KÖNIG</text><rect x="102" y="20" width="75" height="55" rx="3" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.3)" stroke-width="1"/><text x="139" y="35" text-anchor="middle" fill="rgba(255,255,255,.7)" font-size="8" font-family="sans-serif">Feld 2</text><rect x="184" y="20" width="75" height="55" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.2)" stroke-width="1"/><text x="221" y="35" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="8" font-family="sans-serif">Feld 3</text><circle cx="45" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="70" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="127" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="152" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="209" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="234" cy="60" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><line x1="175" y1="47" x2="185" y2="47" stroke="rgba(255,200,0,.6)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="257" y1="47" x2="267" y2="47" stroke="rgba(255,255,255,.4)" stroke-width="1.5"  marker-end="url(#arr)"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Fußball-König</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="128" y="20" width="24" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="140" cy="30" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="47" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW</text><circle cx="140" cy="100" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="118" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">?</text><circle cx="140" cy="100" r="5" fill="rgba(255,255,255,.5)" stroke="#fff" stroke-width="1.5"/><line x1="140" y1="94" x2="140" y2="35" stroke="rgba(255,255,255,.7)" stroke-width="1.5"  marker-end="url(#arr)"/><circle cx="60" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="100" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="180" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="220" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="155" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">warten...</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Elfmeter-Turnier</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="60" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="100" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="180" cy="50" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="70" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="80" cy="100" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="130" cy="110" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="130" y="128" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">F1</text><circle cx="170" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="170" y="108" text-anchor="middle" fill="#f87171" font-size="8" font-family="sans-serif" font-weight="600">F2</text><line x1="130" y1="105" x2="100" y2="125" stroke="rgba(248,113,113,.6)" stroke-width="1.5"  marker-end="url(#arr)"/><line x1="170" y1="85" x2="180" y2="60" stroke="rgba(248,113,113,.6)" stroke-width="1.5"  marker-end="url(#arr)"/><circle cx="100" cy="130" r="13" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1" stroke-dasharray="3,3"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Fangspiel</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="15" y="30" width="75" height="120" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.25)" stroke-width="1"/><rect x="102" y="30" width="75" height="120" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.25)" stroke-width="1"/><rect x="189" y="30" width="75" height="120" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.25)" stroke-width="1"/><circle cx="35" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="65" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="122" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="152" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="209" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="239" cy="90" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Runden-Turnier</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><rect x="20" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="253" y="78" width="7" height="24" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="20" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW1</text><circle cx="260" cy="90" r="8" fill="#fbbf24" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="260" y="107" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="sans-serif" font-weight="600">TW2</text><circle cx="100" cy="70" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="100" cy="110" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="160" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="160" cy="110" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="20" cy="90" r="16" fill="none" stroke="rgba(251,191,36,.5)" stroke-width="1.5" stroke-dasharray="5,3"/><circle cx="260" cy="90" r="16" fill="none" stroke="rgba(251,191,36,.5)" stroke-width="1.5" stroke-dasharray="5,3"/><text x="140" y="148" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">alle rotieren !</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Torhüter-Tag</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">\n  <rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>\n  <rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>\n  <defs>\n  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">\n    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/>\n  </marker>\n</defs><circle cx="60" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="120" cy="40" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="200" cy="50" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="80" cy="120" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="160" cy="130" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="220" cy="110" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="140" cy="80" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="155" text-anchor="middle" fill="#fbbf24" font-size="10" font-family="sans-serif" font-weight="bold">FREIES SPIEL!</text><text x="140" y="168" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">Trainer beobachtet</text>\n  <text x="140" y="174" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Freies Spielen</text>\n</svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg"><rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/><rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/><text x="70" y="20" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="sans-serif" font-weight="bold">ADLER (breit)</text><circle cx="30" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="30" y="78" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer L</text><circle cx="70" cy="40" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="70" y="58" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Jaeger</text><circle cx="110" cy="60" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="110" y="78" text-anchor="middle" fill="#4ade80" font-size="8" font-family="sans-serif" font-weight="600">Flitzer R</text><circle cx="70" cy="90" r="9" fill="#4ade80" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="70" y="108" text-anchor="middle" fill="#4ade80" font-size="7" font-family="sans-serif" font-weight="600">Aufpasser</text><line x1="20" y1="30" x2="20" y2="100" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><line x1="120" y1="30" x2="120" y2="100" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="4,3"/><line x1="140" y1="20" x2="140" y2="160" stroke="rgba(255,255,255,.4)" stroke-width="2"/><text x="210" y="20" text-anchor="middle" fill="#f87171" font-size="11" font-family="sans-serif" font-weight="bold">IGEL (eng)</text><circle cx="195" cy="75" r="8" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="215" cy="65" r="8" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="225" cy="85" r="8" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="205" cy="95" r="8" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="210" cy="80" r="22" fill="none" stroke="rgba(248,113,113,.4)" stroke-width="1.5" stroke-dasharray="4,3"/><text x="210" y="135" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="8" font-family="sans-serif">eng zusammen!</text><text x="70" y="170" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Adler vs. Igel</text></svg>',
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
  svg:'<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg"><rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/><rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/><circle cx="140" cy="90" r="40" fill="rgba(248,113,113,.1)" stroke="rgba(248,113,113,.5)" stroke-width="2" stroke-dasharray="6,4"/><circle cx="140" cy="90" r="6" fill="rgba(255,255,255,.6)" stroke="#fff" stroke-width="1.5"/><circle cx="120" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="160" cy="70" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="120" cy="115" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><circle cx="160" cy="115" r="9" fill="#f87171" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><text x="140" y="40" text-anchor="middle" fill="#f87171" font-size="13" font-family="sans-serif" font-weight="bold">IGEL!</text><text x="140" y="160" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">Eng zusammen, Ball umzingeln</text></svg>',
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
   b=Ball, tx=Text. Farben: g=grün(eigene) r=rot(Gegner/Fänger) b=blau(TW) w=weiß(Trainer). */
function _skz(o){
  const F={g:'#4ade80',r:'#f87171',b:'#60a5fa',y:'#fbbf24',w:'#fff'};
  const E=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); // Specs können aus der DB kommen (KI-Übungen)
  const S=['<rect width="280" height="180" rx="4" fill="#2d6a2d" stroke="#1a4a1a" stroke-width="1.5"/>',
    '<rect x="4" y="4" width="272" height="172" rx="3" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>',
    '<defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,.8)"/></marker></defs>'];
  (o.z||[]).forEach(z=>S.push('<rect x="'+z[0]+'" y="'+z[1]+'" width="'+z[2]+'" height="'+z[3]+'" rx="3" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="6,3"/>'));
  (o.tor||[]).forEach(t=>{const w=t[3]||24;
    S.push(t[2]==='v'?'<rect x="'+t[0]+'" y="'+t[1]+'" width="7" height="'+w+'" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/>'
                     :'<rect x="'+t[0]+'" y="'+t[1]+'" width="'+w+'" height="7" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/>');});
  (o.leiter||[]).forEach(l=>{const n=6,st=l[2]/n;
    S.push('<rect x="'+l[0]+'" y="'+l[1]+'" width="'+(l[3]==='v'?16:l[2])+'" height="'+(l[3]==='v'?l[2]:16)+'" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>');
    for(let i=1;i<n;i++)S.push(l[3]==='v'
      ?'<line x1="'+l[0]+'" y1="'+(l[1]+i*st)+'" x2="'+(l[0]+16)+'" y2="'+(l[1]+i*st)+'" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>'
      :'<line x1="'+(l[0]+i*st)+'" y1="'+l[1]+'" x2="'+(l[0]+i*st)+'" y2="'+(l[1]+16)+'" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>');});
  (o.wand||[]).forEach(w=>S.push('<line x1="'+w[0]+'" y1="'+w[1]+'" x2="'+w[2]+'" y2="'+w[3]+'" stroke="#d1d5db" stroke-width="5" stroke-linecap="round"/>'));
  (o.p||[]).forEach(p=>{const typ=p[4]||'p';
    S.push('<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+p[2]+'" y2="'+p[3]+'" stroke="rgba(255,255,255,.8)" stroke-width="'+(typ==='s'?3:1.5)+'"'+(typ==='l'?' stroke-dasharray="5,3"':typ==='d'?' stroke-dasharray="2,3"':'')+' marker-end="url(#arr)"/>');});
  (o.h||[]).forEach(h=>S.push('<path d="M'+h[0]+' '+(h[1]-6)+' L'+(h[0]+5)+' '+(h[1]+4)+' L'+(h[0]-5)+' '+(h[1]+4)+' Z" fill="'+(F[h[2]]||'#fbbf24')+'" stroke="rgba(0,0,0,.25)" stroke-width="1"/>'));
  (o.s||[]).forEach(sp=>{S.push('<circle cx="'+sp[0]+'" cy="'+sp[1]+'" r="8" fill="'+(F[sp[2]]||'#4ade80')+'" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>');
    if(sp[3])S.push('<text x="'+sp[0]+'" y="'+(sp[1]+3)+'" text-anchor="middle" fill="rgba(0,0,0,.65)" font-size="8" font-family="sans-serif" font-weight="700">'+E(sp[3])+'</text>');});
  (o.b||[]).forEach(b=>S.push('<circle cx="'+b[0]+'" cy="'+b[1]+'" r="4" fill="#fff" stroke="#333" stroke-width="1"/>'));
  (o.tx||[]).forEach(t=>S.push('<text x="'+t[0]+'" y="'+t[1]+'" text-anchor="middle" fill="rgba(255,255,255,.85)" font-size="9" font-family="sans-serif" font-weight="600">'+E(t[2])+'</text>'));
  return '<svg viewBox="0 0 280 180" width="100%" style="max-width:280px;display:block;margin:8px auto;border-radius:6px" xmlns="http://www.w3.org/2000/svg">'+S.join('')+'</svg>';
}
/* Einheitliche Linien-Legende (PO): erscheint unter jeder Skizze im Detail-Fenster.
   Muss zu den Pfeil-Typen in _skz passen: p=Pass (dünn durchgezogen), l=Laufweg
   (gestrichelt), s=Schuss (dick), d=Dribbling (gepunktet). */
function skzLegende(){
  const li=(dash,w)=>'<svg width="30" height="10" viewBox="0 0 30 10" style="flex:none"><line x1="1" y1="5" x2="23" y2="5" stroke="currentColor" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/><path d="M23,1.5 L29,5 L23,8.5 Z" fill="currentColor"/></svg>';
  const it=(svg,lbl)=>'<span style="display:inline-flex;align-items:center;gap:4px">'+svg+lbl+'</span>';
  return '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;font-size:10px;color:var(--text2);margin:2px 0 8px">'
    +it(li('',1.5),'Pass')+it(li('5,3',1.5),'Laufweg')+it(li('',3),'Schuss')+it(li('2,3',1.5),'Dribbling')+'</div>';
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
tf107:{h:[[100,16,'r'],[124,16,'r'],[264,78,'b'],[264,102,'b'],[100,166,'y'],[124,166,'y'],[16,78,'g'],[16,102,'g']],s:[[100,70,'g'],[170,90,'g'],[120,120,'g'],[200,55,'g']],b:[[107,77],[177,97],[127,127],[207,62]],p:[[104,62,110,28,'d'],[164,84,120,40,'d']],tx:[[140,150,'Farbe gerufen → mit Ball durchs passende Hütchentor']]}
};
// Fehlende Skizzen aus den Specs erzeugen – vorhandene, handgezeichnete SVGs bleiben unangetastet.
TRAININGSFORMEN.forEach(f=>{if((!f.svg||f.svg.length<=10)&&f.id&&TF_SKIZZEN[f.id])f.svg=_skz(TF_SKIZZEN[f.id]);});
